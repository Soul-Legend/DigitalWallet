import {KeyType} from '@credo-ts/core';
import * as ed from '@noble/ed25519';
import {CryptoError} from './ErrorHandler';
import LogServiceInstance from './LogService';
import StorageServiceInstance from './StorageService';
import AgentServiceInstance from './AgentService';
import type {ILogService, IStorageService, IAgentService} from '../types';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * DIDService - Manages DID creation and key generation using Credo agent
 *
 * Uses the Credo agent's DID module (agent.dids) to create DIDs via
 * did:key and did:peer methods, and the agent's wallet for key management.
 * did:web is constructed locally since Credo has no did:web registrar.
 */
class DIDService {
  private readonly logger: ILogService;
  private readonly storage: IStorageService;
  private readonly agentService: IAgentService;

  constructor(
    logger: ILogService = LogServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    agentService: IAgentService = AgentServiceInstance,
  ) {
    this.logger = logger;
    this.storage = storage;
    this.agentService = agentService;
  }

  /**
   * Creates a did:key using the Credo agent.
   * The agent generates an Ed25519 key pair and derives the DID from the public key.
   */
  async createDidKey(): Promise<{did: string; verificationMethodId: string}> {
    try {
      const agent = await this.agentService.getAgent();

      const didResult = await agent.dids.create({
        method: 'key',
        options: {
          keyType: KeyType.Ed25519,
        },
      });

      if (didResult.didState.state !== 'finished' || !didResult.didState.did) {
        throw new CryptoError(
          `DID creation failed: ${didResult.didState.state}`,
          'key_generation',
          {didState: didResult.didState},
        );
      }

      const did = didResult.didState.did;
      const verificationMethodId =
        didResult.didState.didDocument?.verificationMethod?.[0]?.id ?? `${did}#key-1`;

      return {did, verificationMethodId};
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError('Failed to create did:key', 'key_generation', {
        error,
      });
    }
  }

  /**
   * Creates a did:peer using the Credo agent.
   * did:peer is a peerwise DID method that doesn't require a ledger.
   */
  async createDidPeer(): Promise<{did: string; verificationMethodId: string}> {
    try {
      const agent = await this.agentService.getAgent();

      const didResult = await agent.dids.create({
        method: 'peer',
        options: {
          keyType: KeyType.Ed25519,
          numAlgo: 0,
        },
      });

      if (didResult.didState.state !== 'finished' || !didResult.didState.did) {
        throw new CryptoError(
          `DID creation failed: ${didResult.didState.state}`,
          'key_generation',
          {didState: didResult.didState},
        );
      }

      const did = didResult.didState.did;
      const verificationMethodId =
        didResult.didState.didDocument?.verificationMethod?.[0]?.id ?? `${did}#key-1`;

      return {did, verificationMethodId};
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError('Failed to create did:peer', 'key_generation', {
        error,
      });
    }
  }

  /**
   * Creates a did:web for web-based DID resolution.
   * Credo has no did:web registrar, so we construct it locally per spec.
   */
  createDidWeb(domain: string, path?: string): string {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '');

      if (path) {
        const cleanPath = path.replace(/^\//, '');
        return `did:web:${cleanDomain}:${cleanPath.replace(/\//g, ':')}`;
      }

      return `did:web:${cleanDomain}`;
    } catch (error) {
      throw new CryptoError('Failed to create did:web', 'key_generation', {
        error,
      });
    }
  }

  /**
   * Generates a complete holder identity via the Credo agent.
   * Creates a did:key or did:peer and persists the DID string in app storage.
   * The private key is managed inside the Credo wallet (Aries Askar).
   */
  async generateHolderIdentity(
    method: 'key' | 'peer' = 'key',
  ): Promise<{did: string; publicKey: string}> {
    try {
      const {did} =
        method === 'key'
          ? await this.createDidKey()
          : await this.createDidPeer();

      // Generate an Ed25519 key pair for SD-JWT signing via CryptoService
      // (Credo wallet keys are used internally by AnonCreds; SD-JWT needs explicit keys)
      const privateKeyBytes = ed.utils.randomSecretKey();
      const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
      const privateKeyHex = toHex(privateKeyBytes);
      const publicKeyHex = toHex(publicKeyBytes);

      // Persist the DID and keys so the app can find them on next launch
      await this.storage.storeHolderDID(did);
      await this.storage.storeHolderPrivateKey(privateKeyHex, did);
      await this.storage.storeHolderPublicKey(publicKeyHex);

      this.logger.logKeyGeneration(
        'titular',
        'Ed25519',
        256,
        method === 'key' ? 'did:key' : 'did:peer',
        true,
      );

      return {did, publicKey: publicKeyHex};
    } catch (error) {
      this.logger.logKeyGeneration(
        'titular',
        'Ed25519',
        256,
        method === 'key' ? 'did:key' : 'did:peer',
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Generates a complete issuer identity.
   * Creates a did:key for cryptographic operations and also produces a did:web
   * identifier for the institution. The issuer's key pair lives in the Credo wallet.
   */
  async generateIssuerIdentity(
    domain: string = 'ufsc.br',
    path?: string,
  ): Promise<{did: string; publicKey: string}> {
    try {
      // Create a did:key so the issuer has a signing key inside the Credo wallet
      const {did: signingDid} =
        await this.createDidKey();

      // Build the public did:web identifier
      const didWeb = this.createDidWeb(domain, path);

      // Generate an Ed25519 key pair for SD-JWT credential signing
      const privateKeyBytes = ed.utils.randomSecretKey();
      const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
      const privateKeyHex = toHex(privateKeyBytes);
      const publicKeyHex = toHex(publicKeyBytes);

      // Store the mapping: did:web -> signing did:key, and the issuer keys
      await this.storage.storeIssuerDID(didWeb);
      await this.storage.storeIssuerSigningDid(signingDid);
      await this.storage.storeIssuerPrivateKey(privateKeyHex, didWeb);
      await this.storage.storeIssuerPublicKey(publicKeyHex);

      this.logger.logKeyGeneration(
        'emissor',
        'Ed25519',
        256,
        'did:web',
        true,
      );

      return {did: didWeb, publicKey: publicKeyHex};
    } catch (error) {
      this.logger.logKeyGeneration(
        'emissor',
        'Ed25519',
        256,
        'did:web',
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Resolves a DID to its DID Document using the Credo agent.
   */
  async resolveDid(did: string) {
    const agent = await this.agentService.getAgent();
    return agent.dids.resolve(did);
  }
}

// Export singleton instance
export { DIDService };

const didServiceInstance = new DIDService();
export default didServiceInstance;
