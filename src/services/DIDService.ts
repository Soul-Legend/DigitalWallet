import {Agent, KeyType, DidKey, DidPeer} from '@credo-ts/core';
import {generateKeyPairSync} from 'crypto';
import {CryptoError} from './ErrorHandler';
import LogService from './LogService';
import StorageService from './StorageService';

/**
 * DIDService - Manages DID creation and key generation
 * 
 * This service handles the generation of decentralized identifiers (DIDs)
 * using different methods: did:key, did:peer, and did:web
 */
class DIDService {
  /**
   * Generates a key pair using Ed25519 algorithm
   * Returns the private key and public key as hex strings
   */
  async generateKeyPair(): Promise<{privateKey: string; publicKey: string}> {
    try {
      // Generate Ed25519 key pair using Node.js crypto
      const {privateKey, publicKey} = generateKeyPairSync('ed25519', {
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'der',
        },
        publicKeyEncoding: {
          type: 'spki',
          format: 'der',
        },
      });
      
      // Extract raw key bytes (last 32 bytes for private, last 32 for public)
      const privateKeyRaw = privateKey.slice(-32);
      const publicKeyRaw = publicKey.slice(-32);
      
      // Convert to hex strings
      const privateKeyHex = privateKeyRaw.toString('hex');
      const publicKeyHex = publicKeyRaw.toString('hex');
      
      return {
        privateKey: privateKeyHex,
        publicKey: publicKeyHex,
      };
    } catch (error) {
      throw new CryptoError(
        'Failed to generate key pair',
        'key_generation',
        {error}
      );
    }
  }
  
  /**
   * Creates a did:key from a public key
   * did:key is a method that derives the DID directly from the public key
   */
  createDidKey(publicKeyHex: string): string {
    try {
      // Convert hex to buffer
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
      
      // Create multibase encoding (base58btc with 'z' prefix)
      // For Ed25519 public keys, we use multicodec prefix 0xed01
      const multicodecPrefix = Buffer.from([0xed, 0x01]);
      const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBytes]);
      
      // Encode to base58btc
      const base58Key = this.encodeBase58(multicodecKey);
      
      return `did:key:z${base58Key}`;
    } catch (error) {
      throw new CryptoError(
        'Failed to create did:key',
        'key_generation',
        {error}
      );
    }
  }
  
  /**
   * Creates a did:peer for peer-to-peer communication
   * did:peer is a method for DIDs that don't require a blockchain
   */
  createDidPeer(publicKeyHex: string): string {
    try {
      // Convert hex to buffer
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
      
      // Create multibase encoding for the key
      const multicodecPrefix = Buffer.from([0xed, 0x01]);
      const multicodecKey = Buffer.concat([multicodecPrefix, publicKeyBytes]);
      const base58Key = this.encodeBase58(multicodecKey);
      
      // did:peer:2 uses multibase encoded keys
      // Format: did:peer:2.Ez<base58-encoded-key>
      return `did:peer:2.Ez${base58Key}`;
    } catch (error) {
      throw new CryptoError(
        'Failed to create did:peer',
        'key_generation',
        {error}
      );
    }
  }
  
  /**
   * Creates a did:web for web-based DID resolution
   * did:web uses domain names for DID resolution
   */
  createDidWeb(domain: string, path?: string): string {
    try {
      // Remove protocol if present
      const cleanDomain = domain.replace(/^https?:\/\//, '');
      
      if (path) {
        // Remove leading slash if present
        const cleanPath = path.replace(/^\//, '');
        return `did:web:${cleanDomain}:${cleanPath.replace(/\//g, ':')}`;
      }
      
      return `did:web:${cleanDomain}`;
    } catch (error) {
      throw new CryptoError(
        'Failed to create did:web',
        'key_generation',
        {error}
      );
    }
  }
  
  /**
   * Generates a complete holder identity (did:key or did:peer)
   * Stores the private key securely and returns the DID
   */
  async generateHolderIdentity(
    method: 'key' | 'peer' = 'key'
  ): Promise<{did: string; publicKey: string}> {
    try {
      // Generate key pair
      const {privateKey, publicKey} = await this.generateKeyPair();
      
      // Create DID based on method
      const did = method === 'key' 
        ? this.createDidKey(publicKey)
        : this.createDidPeer(publicKey);
      
      // Store private key and public key securely
      await StorageService.storeHolderPrivateKey(privateKey, did);
      await StorageService.storeHolderPublicKey(publicKey);
      
      // Log the key generation event
      LogService.logKeyGeneration(
        'titular',
        'Ed25519',
        256,
        method === 'key' ? 'did:key' : 'did:peer',
        true
      );
      
      return {did, publicKey};
    } catch (error) {
      // Log the error
      LogService.logKeyGeneration(
        'titular',
        'Ed25519',
        256,
        method === 'key' ? 'did:key' : 'did:peer',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      
      throw error;
    }
  }
  
  /**
   * Generates a complete issuer identity (did:web)
   * Stores the private key securely and returns the DID
   */
  async generateIssuerIdentity(
    domain: string = 'ufsc.br',
    path?: string
  ): Promise<{did: string; publicKey: string}> {
    try {
      // Generate key pair
      const {privateKey, publicKey} = await this.generateKeyPair();
      
      // Create did:web
      const did = this.createDidWeb(domain, path);
      
      // Store private key and public key securely
      await StorageService.storeIssuerPrivateKey(privateKey, did);
      await StorageService.storeIssuerPublicKey(publicKey);
      
      // Log the key generation event
      LogService.logKeyGeneration(
        'emissor',
        'Ed25519',
        256,
        'did:web',
        true
      );
      
      return {did, publicKey};
    } catch (error) {
      // Log the error
      LogService.logKeyGeneration(
        'emissor',
        'Ed25519',
        256,
        'did:web',
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      
      throw error;
    }
  }
  
  /**
   * Base58 encoding helper
   */
  private encodeBase58(buffer: Buffer): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = BigInt(58);
    
    // Convert buffer to BigInt
    let num = BigInt('0x' + buffer.toString('hex'));
    
    if (num === BigInt(0)) {
      return ALPHABET[0];
    }
    
    let encoded = '';
    while (num > BigInt(0)) {
      const remainder = num % BASE;
      num = num / BASE;
      encoded = ALPHABET[Number(remainder)] + encoded;
    }
    
    // Add leading '1's for leading zero bytes
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      encoded = ALPHABET[0] + encoded;
    }
    
    return encoded;
  }
}

// Export singleton instance
export default new DIDService();
