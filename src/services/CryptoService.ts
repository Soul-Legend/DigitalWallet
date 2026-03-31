import {createHash, sign, verify} from 'crypto';
import {CryptoError} from './ErrorHandler';
import LogService from './LogService';

/**
 * CryptoService - Handles cryptographic operations
 *
 * This service provides functions for:
 * - Hash computation (SHA-256)
 * - Digital signatures (EdDSA/Ed25519)
 * - Signature verification
 */
class CryptoService {
  /**
   * Computes SHA-256 hash of input data
   * @param data - Data to hash (string or Buffer)
   * @param module - Module calling this function (for logging)
   * @returns Hex-encoded hash string
   */
  async computeHash(
    data: string | Buffer,
    module: 'emissor' | 'titular' | 'verificador' = 'titular',
  ): Promise<string> {
    try {
      const hash = createHash('sha256');
      hash.update(data);
      const hashOutput = hash.digest('hex');

      // Log the hash computation
      LogService.logHashComputation(module, 'SHA-256', hashOutput, true);

      return hashOutput;
    } catch (error) {
      // Log the error
      LogService.logHashComputation(
        module,
        'SHA-256',
        '',
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError('Failed to compute hash', 'hash', {error});
    }
  }

  /**
   * Signs data using Ed25519 private key
   * @param data - Data to sign
   * @param privateKeyHex - Private key in hex format
   * @param module - Module calling this function (for logging)
   * @returns Signature as hex string
   */
  async signData(
    data: string | Buffer,
    privateKeyHex: string,
    module: 'emissor' | 'titular' | 'verificador' = 'emissor',
  ): Promise<string> {
    try {
      // Convert hex private key to buffer
      const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

      // Create PKCS8 DER format for Ed25519 private key
      // This is the format expected by Node.js crypto.sign
      const pkcs8Header = Buffer.from([
        0x30, 0x2e, // SEQUENCE, length 46
        0x02, 0x01, 0x00, // INTEGER version 0
        0x30, 0x05, // SEQUENCE, length 5
        0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
        0x04, 0x22, // OCTET STRING, length 34
        0x04, 0x20, // OCTET STRING, length 32
      ]);

      const privateKeyDER = Buffer.concat([pkcs8Header, privateKeyBytes]);

      // Create private key object
      const privateKeyObject = {
        key: privateKeyDER,
        format: 'der' as const,
        type: 'pkcs8' as const,
      };

      // Sign the data
      const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
      const signature = sign(null, dataBuffer, privateKeyObject);
      const signatureHex = signature.toString('hex');

      // Log the signature operation (without revealing the signature itself)
      LogService.captureEvent(
        'credential_issuance',
        module,
        {
          algorithm: 'Ed25519',
          parameters: {
            data_length: dataBuffer.length,
            signature_length: signature.length,
          },
        },
        true,
      );

      return signatureHex;
    } catch (error) {
      // Log the error
      LogService.captureEvent(
        'credential_issuance',
        module,
        {
          algorithm: 'Ed25519',
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError('Failed to sign data', 'signature', {error});
    }
  }

  /**
   * Verifies a signature using Ed25519 public key
   * @param data - Original data that was signed
   * @param signatureHex - Signature in hex format
   * @param publicKeyHex - Public key in hex format
   * @param _module - Module calling this function (for logging)
   * @returns True if signature is valid, false otherwise
   */
  async verifySignature(
    data: string | Buffer,
    signatureHex: string,
    publicKeyHex: string,
    _module: 'emissor' | 'titular' | 'verificador' = 'verificador',
  ): Promise<boolean> {
    try {
      // Convert hex strings to buffers
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
      const signatureBytes = Buffer.from(signatureHex, 'hex');

      // Create SPKI DER format for Ed25519 public key
      const spkiHeader = Buffer.from([
        0x30, 0x2a, // SEQUENCE, length 42
        0x30, 0x05, // SEQUENCE, length 5
        0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
        0x03, 0x21, 0x00, // BIT STRING, length 33, no unused bits
      ]);

      const publicKeyDER = Buffer.concat([spkiHeader, publicKeyBytes]);

      // Create public key object
      const publicKeyObject = {
        key: publicKeyDER,
        format: 'der' as const,
        type: 'spki' as const,
      };

      // Verify the signature
      const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
      const isValid = verify(null, dataBuffer, publicKeyObject, signatureBytes);

      // Log the verification
      LogService.logVerification('Ed25519', isValid, true, {
        data_length: dataBuffer.length,
        signature_length: signatureBytes.length,
      });

      return isValid;
    } catch (error) {
      // Log the error
      LogService.logVerification(
        'Ed25519',
        false,
        false,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError('Failed to verify signature', 'verification', {
        error,
      });
    }
  }

  /**
   * Computes SHA-256 hash of multiple values concatenated
   * Useful for computing nullifiers and other composite hashes
   */
  async computeCompositeHash(
    values: (string | Buffer)[],
    module: 'emissor' | 'titular' | 'verificador' = 'titular',
  ): Promise<string> {
    try {
      const hash = createHash('sha256');

      for (const value of values) {
        hash.update(value);
      }

      const hashOutput = hash.digest('hex');

      // Log the hash computation
      LogService.logHashComputation(module, 'SHA-256', hashOutput, true);

      return hashOutput;
    } catch (error) {
      // Log the error
      LogService.logHashComputation(
        module,
        'SHA-256',
        '',
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new CryptoError('Failed to compute composite hash', 'hash', {
        error,
      });
    }
  }

  /**
   * Generates a cryptographic nonce (random challenge)
   * Used for presentation requests
   */
  generateNonce(): string {
    const randomBytes = Buffer.allocUnsafe(32);
    for (let i = 0; i < 32; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return randomBytes.toString('hex');
  }
}

// Export singleton instance
export default new CryptoService();
