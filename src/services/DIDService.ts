import {KeyType} from '@credo-ts/core';
import {CryptoError} from './ErrorHandler';
import LogService from './LogService';
import StorageService from './StorageService';
import AgentService from './AgentService';

/**
 * DIDService - Manages DID creation and key generation using Credo agent
 *
 * Uses the Credo agent's DID module (agent.dids) to create DIDs via
 * did:key and did:peer methods, and the agent's wallet for key management.
 * did:web is constructed locally since Credo has no did:web registrar.
 */
class DIDService {
  /**
   * Creates a did:key using the Credo agent.
   * The agent generates an Ed25519 key pair and derives the DID from the public key.
   */
  async createDidKey(): Promise<{did: string; verificationMethodId: string}> {
    try {
      const agent = await AgentService.getAgent();

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
      const agent = await AgentService.getAgent();

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
      const {did, verificationMethodId} =
        method === 'key'
          ? await this.createDidKey()
          : await this.createDidPeer();

      // Persist the DID so the app can find it on next launch
      await StorageService.storeHolderDID(did);

      LogService.logKeyGeneration(
        'titular',
        'Ed25519',
        256,
        method === 'key' ? 'did:key' : 'did:peer',
        true,
      );

      // Public key is embedded in the DID itself for did:key
      return {did, publicKey: verificationMethodId};
    } catch (error) {
      LogService.logKeyGeneration(
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
      const {did: signingDid, verificationMethodId} =
        await this.createDidKey();

      // Build the public did:web identifier
      const didWeb = this.createDidWeb(domain, path);

      // Store the mapping: did:web -> signing did:key
      await StorageService.storeIssuerDID(didWeb);
      await StorageService.storeIssuerSigningDid(signingDid);

      LogService.logKeyGeneration(
        'emissor',
        'Ed25519',
        256,
        'did:web',
        true,
      );

      return {did: didWeb, publicKey: verificationMethodId};
    } catch (error) {
      LogService.logKeyGeneration(
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
    const agent = await AgentService.getAgent();
    return agent.dids.resolve(did);
  }
}

// Export singleton instance
export default new DIDService();
