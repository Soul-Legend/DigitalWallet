import {StudentData, VerifiableCredential} from '../types';
import DIDService from './DIDService';
import CryptoService from './CryptoService';
import StorageService from './StorageService';
import LogService from './LogService';
import {CryptoError, ValidationError} from './ErrorHandler';

/**
 * CredentialService - Handles credential issuance and management
 *
 * This service is responsible for:
 * - Generating issuer DIDs (did:web)
 * - Creating Verifiable Credentials from StudentData
 * - Signing credentials digitally
 * - Formatting credentials as SD-JWT or AnonCreds
 * - Copying credentials to clipboard
 */
class CredentialService {
  /**
   * Generates or retrieves the institution's DID (did:web)
   * For the MVP, we simulate UFSC as the issuer
   */
  async getOrCreateIssuerDID(): Promise<{did: string; publicKey: string}> {
    try {
      // Check if issuer DID already exists
      const existingDID = await StorageService.getIssuerDID();

      if (existingDID) {
        // DID exists, we need to get the public key
        // For now, we'll regenerate if needed (in production, store public key separately)
        LogService.captureEvent(
          'key_generation',
          'emissor',
          {
            algorithm: 'Ed25519',
            key_size: 256,
            did_method: 'did:web',
            parameters: {
              action: 'retrieved_existing',
            },
          },
          true,
        );

        // Return existing DID (public key would be retrieved from storage in production)
        return {did: existingDID, publicKey: ''};
      }

      // Generate new issuer identity
      const {did, publicKey} = await DIDService.generateIssuerIdentity(
        'ufsc.br',
        'identidade-academica',
      );

      return {did, publicKey};
    } catch (error) {
      throw new CryptoError(
        'Failed to generate issuer DID',
        'key_generation',
        {error},
      );
    }
  }

  /**
   * Issues a Verifiable Credential from StudentData
   * @param studentData - The student's academic data
   * @param holderDID - The DID of the credential holder (student)
   * @param format - The credential format ('sd-jwt' or 'anoncreds')
   * @returns The issued credential as a string (JWT or AnonCreds format)
   */
  async issueCredential(
    studentData: StudentData,
    holderDID: string,
    format: 'sd-jwt' | 'anoncreds' = 'sd-jwt',
  ): Promise<string> {
    try {
      // Get or create issuer DID
      const {did: issuerDID} = await this.getOrCreateIssuerDID();

      // Create the credential object
      const credential = await this.createVerifiableCredential(
        studentData,
        holderDID,
        issuerDID,
      );

      // Sign and format the credential based on the requested format
      let signedCredential: string;

      if (format === 'sd-jwt') {
        signedCredential = await this.signCredentialAsSDJWT(
          credential,
          issuerDID,
        );
      } else {
        signedCredential = await this.signCredentialAsAnonCreds(
          credential,
          issuerDID,
        );
      }

      // Log the credential issuance
      LogService.logCredentialIssuance(
        format === 'sd-jwt' ? 'SD-JWT' : 'AnonCreds',
        true,
        {
          issuer: issuerDID,
          holder: holderDID,
          format,
        },
      );

      return signedCredential;
    } catch (error) {
      // Log the error
      LogService.logCredentialIssuance(
        format === 'sd-jwt' ? 'SD-JWT' : 'AnonCreds',
        false,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Creates a VerifiableCredential object from StudentData
   */
  private async createVerifiableCredential(
    studentData: StudentData,
    holderDID: string,
    issuerDID: string,
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const issuanceDate = now.toISOString();

    // Create credential subject with holder DID
    const credentialSubject = {
      id: holderDID,
      ...studentData,
    };

    // Create the credential structure
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      type: ['VerifiableCredential', 'AcademicIDCredential'],
      issuer: issuerDID,
      issuanceDate,
      credentialSubject,
      proof: {
        type: 'JsonWebSignature2020',
        created: issuanceDate,
        verificationMethod: `${issuerDID}#key-1`,
        proofPurpose: 'assertionMethod',
      },
    };

    return credential;
  }

  /**
   * Signs a credential and formats it as SD-JWT
   * SD-JWT allows selective disclosure of attributes
   */
  private async signCredentialAsSDJWT(
    credential: VerifiableCredential,
    issuerDID: string,
  ): Promise<string> {
    try {
      // Get issuer's private key
      const privateKey = await StorageService.getIssuerPrivateKey();

      if (!privateKey) {
        throw new CryptoError(
          'Issuer private key not found',
          'signature',
          {},
        );
      }

      // For SD-JWT, we create a JWT with the credential as payload
      // In a full implementation, we would use @sd-jwt/sd-jwt-vc library
      // For the MVP, we'll create a simplified JWT structure

      // Create JWT payload
      const payload = {
        vc: credential,
        iss: issuerDID,
        sub: credential.credentialSubject.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
      };

      // Convert payload to JSON string
      const payloadString = JSON.stringify(payload);

      // Create a simplified SD-JWT structure
      // Format: header.payload.signature
      const header = {
        alg: 'EdDSA',
        typ: 'JWT',
        kid: `${issuerDID}#key-1`,
      };

      const headerBase64 = Buffer.from(JSON.stringify(header)).toString(
        'base64url',
      );
      const payloadBase64 = Buffer.from(payloadString).toString('base64url');

      // Sign the header.payload (not just the payload)
      const dataToSign = `${headerBase64}.${payloadBase64}`;
      const signature = await CryptoService.signData(
        dataToSign,
        privateKey,
        'emissor',
      );

      const signatureBase64 = Buffer.from(signature, 'hex').toString(
        'base64url',
      );

      const jwt = `${headerBase64}.${payloadBase64}.${signatureBase64}`;

      return jwt;
    } catch (error) {
      throw new CryptoError(
        'Failed to sign credential as SD-JWT',
        'signature',
        {error},
      );
    }
  }

  /**
   * Signs a credential and formats it as AnonCreds
   * AnonCreds supports zero-knowledge proofs
   */
  private async signCredentialAsAnonCreds(
    credential: VerifiableCredential,
    _issuerDID: string,
  ): Promise<string> {
    try {
      // Get issuer's private key
      const privateKey = await StorageService.getIssuerPrivateKey();

      if (!privateKey) {
        throw new CryptoError(
          'Issuer private key not found',
          'signature',
          {},
        );
      }

      // For AnonCreds, we would use @hyperledger/anoncreds-react-native
      // For the MVP, we'll create a simplified structure that mimics AnonCreds

      // Create AnonCreds-style credential
      const anonCredsCredential = {
        schema_id: 'did:web:ufsc.br:schemas:academic-id:1.0',
        cred_def_id: 'did:web:ufsc.br:cred-defs:academic-id:1.0',
        values: this.encodeAttributesForAnonCreds(
          credential.credentialSubject,
        ),
        signature: {
          p_credential: {},
          r_credential: {},
        },
        signature_correctness_proof: {},
        rev_reg: null,
        witness: null,
      };

      // Sign the credential structure
      const credentialString = JSON.stringify(anonCredsCredential);
      const signature = await CryptoService.signData(
        credentialString,
        privateKey,
        'emissor',
      );

      // Add signature to the credential
      anonCredsCredential.signature = {
        p_credential: {signature},
        r_credential: {},
      };

      // Return as JSON string
      return JSON.stringify(anonCredsCredential);
    } catch (error) {
      throw new CryptoError(
        'Failed to sign credential as AnonCreds',
        'signature',
        {error},
      );
    }
  }

  /**
   * Encodes attributes for AnonCreds format
   * AnonCreds requires attributes to be encoded as integers
   */
  private encodeAttributesForAnonCreds(
    credentialSubject: StudentData & {id: string},
  ): Record<string, {raw: string; encoded: string}> {
    const encoded: Record<string, {raw: string; encoded: string}> = {};

    // Encode each attribute
    for (const [key, value] of Object.entries(credentialSubject)) {
      const rawValue = String(value);
      // Simple encoding: hash the value to get an integer
      const hash = this.simpleHash(rawValue);
      encoded[key] = {
        raw: rawValue,
        encoded: hash,
      };
    }

    return encoded;
  }

  /**
   * Simple hash function for attribute encoding
   */
  private simpleHash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      hash = (hash << 5) - hash + char;
      // eslint-disable-next-line no-bitwise
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Copies a credential to the clipboard
   * @param credential - The credential string to copy
   */
  async copyToClipboard(credential: string): Promise<void> {
    try {
      // In React Native, we would use @react-native-clipboard/clipboard
      // For now, we'll simulate the clipboard operation
      // Clipboard.setString(credential);

      // Log the clipboard operation
      LogService.captureEvent(
        'credential_issuance',
        'emissor',
        {
          parameters: {
            action: 'copied_to_clipboard',
            credential_length: credential.length,
          },
        },
        true,
      );
    } catch (error) {
      throw new CryptoError(
        'Failed to copy credential to clipboard',
        'clipboard',
        {error},
      );
    }
  }

  /**
   * Validates and parses a credential token (SD-JWT or AnonCreds)
   * @param token - The credential token string
   * @returns Parsed VerifiableCredential object
   */
  async validateAndParseCredential(token: string): Promise<VerifiableCredential> {
    try {
      // Try to parse as JSON first (could be AnonCreds)
      let parsedToken: any;
      try {
        parsedToken = JSON.parse(token);
      } catch {
        // Not JSON, might be JWT
        parsedToken = null;
      }

      // Check if it's AnonCreds format (has schema_id and values)
      if (parsedToken && parsedToken.schema_id && parsedToken.values) {
        return await this.parseAnonCreds(token);
      }

      // Try to parse as SD-JWT (has dots)
      if (token.includes('.')) {
        return await this.parseSDJWT(token);
      }

      // If we got here, format is unknown
      throw new ValidationError(
        'Formato de credencial inválido',
        'token',
        token.substring(0, 50),
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Formato de credencial inválido',
        'token',
        token.substring(0, 50),
      );
    }
  }

  /**
   * Parses an SD-JWT token into a VerifiableCredential
   */
  private async parseSDJWT(jwt: string): Promise<VerifiableCredential> {
    try {
      // Split JWT into parts
      const parts = jwt.split('.');
      
      if (parts.length !== 3) {
        throw new ValidationError(
          'JWT deve conter 3 partes (header.payload.signature)',
          'jwt',
          jwt.substring(0, 50),
        );
      }

      // Decode payload
      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      // Extract credential from payload
      if (!payload.vc) {
        throw new ValidationError(
          'JWT não contém credencial verificável',
          'jwt_payload',
          payloadJson.substring(0, 50),
        );
      }

      const credential = payload.vc as VerifiableCredential;

      // Validate credential structure
      this.validateCredentialStructure(credential);

      return credential;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Erro ao decodificar SD-JWT',
        'jwt',
        jwt.substring(0, 50),
      );
    }
  }

  /**
   * Parses an AnonCreds credential into a VerifiableCredential
   */
  private async parseAnonCreds(anonCredsJson: string): Promise<VerifiableCredential> {
    try {
      const anonCreds = JSON.parse(anonCredsJson);

      // Validate AnonCreds structure
      if (!anonCreds.values || !anonCreds.schema_id) {
        throw new ValidationError(
          'Estrutura AnonCreds inválida',
          'anoncreds',
          anonCredsJson.substring(0, 50),
        );
      }

      // Convert AnonCreds to VerifiableCredential format
      const credentialSubject: any = {id: ''};

      for (const [key, value] of Object.entries(anonCreds.values)) {
        const attrValue = value as {raw: string; encoded: string};
        
        // Convert string booleans back to boolean
        if (attrValue.raw === 'true' || attrValue.raw === 'false') {
          credentialSubject[key] = attrValue.raw === 'true';
        } else if (key === 'acesso_laboratorios' || key === 'acesso_predios') {
          // Parse arrays
          try {
            credentialSubject[key] = JSON.parse(attrValue.raw);
          } catch {
            credentialSubject[key] = [];
          }
        } else {
          credentialSubject[key] = attrValue.raw;
        }
      }

      // Create VerifiableCredential structure
      const credential: VerifiableCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/jws-2020/v1',
        ],
        type: ['VerifiableCredential', 'AcademicIDCredential'],
        issuer: anonCreds.cred_def_id || 'did:web:ufsc.br',
        issuanceDate: new Date().toISOString(),
        credentialSubject,
        proof: {
          type: 'AnonCredsProof',
          created: new Date().toISOString(),
          verificationMethod: anonCreds.cred_def_id || 'did:web:ufsc.br#key-1',
          proofPurpose: 'assertionMethod',
          signature: JSON.stringify(anonCreds.signature),
        },
      };

      return credential;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Erro ao decodificar AnonCreds',
        'anoncreds',
        anonCredsJson.substring(0, 50),
      );
    }
  }

  /**
   * Validates the structure of a VerifiableCredential
   */
  private validateCredentialStructure(credential: VerifiableCredential): void {
    // Check required fields
    if (!credential['@context'] || !Array.isArray(credential['@context'])) {
      throw new ValidationError(
        'Campo @context ausente ou inválido',
        '@context',
        credential['@context'],
      );
    }

    if (!credential.type || !Array.isArray(credential.type)) {
      throw new ValidationError(
        'Campo type ausente ou inválido',
        'type',
        credential.type,
      );
    }

    if (!credential.issuer || typeof credential.issuer !== 'string') {
      throw new ValidationError(
        'Campo issuer ausente ou inválido',
        'issuer',
        credential.issuer,
      );
    }

    if (!credential.issuanceDate || typeof credential.issuanceDate !== 'string') {
      throw new ValidationError(
        'Campo issuanceDate ausente ou inválido',
        'issuanceDate',
        credential.issuanceDate,
      );
    }

    if (!credential.credentialSubject || typeof credential.credentialSubject !== 'object') {
      throw new ValidationError(
        'Campo credentialSubject ausente ou inválido',
        'credentialSubject',
        credential.credentialSubject,
      );
    }

    if (!credential.proof || typeof credential.proof !== 'object') {
      throw new ValidationError(
        'Campo proof ausente ou inválido',
        'proof',
        credential.proof,
      );
    }
  }

  /**
   * Validates StudentData before credential issuance
   * Ensures all required fields are present and valid
   */
  validateStudentData(data: StudentData): void {
    const requiredFields: (keyof StudentData)[] = [
      'nome_completo',
      'cpf',
      'matricula',
      'curso',
      'status_matricula',
      'data_nascimento',
    ];

    for (const field of requiredFields) {
      if (!data[field] || data[field] === '') {
        throw new ValidationError(
          'Campo obrigatório ausente ou vazio',
          field,
          data[field],
        );
      }
    }

    // Validate CPF format (11 digits)
    if (!/^\d{11}$/.test(data.cpf)) {
      throw new ValidationError(
        'CPF deve conter 11 dígitos',
        'cpf',
        data.cpf,
      );
    }

    // Validate date format (ISO 8601)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data_nascimento)) {
      throw new ValidationError(
        'Data de nascimento deve estar no formato YYYY-MM-DD',
        'data_nascimento',
        data.data_nascimento,
      );
    }

    // Validate date is actually valid (not 2024-13-01, etc.)
    const dateObj = new Date(data.data_nascimento);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError(
        'Data de nascimento inválida',
        'data_nascimento',
        data.data_nascimento,
      );
    }

    // Check if the date string matches the parsed date (catches invalid dates like 2024-13-01)
    const [year, month, day] = data.data_nascimento.split('-').map(Number);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() + 1 !== month ||
      dateObj.getDate() !== day
    ) {
      throw new ValidationError(
        'Data de nascimento inválida',
        'data_nascimento',
        data.data_nascimento,
      );
    }

    // Validate status_matricula
    if (!['Ativo', 'Inativo'].includes(data.status_matricula)) {
      throw new ValidationError(
        'Status de matrícula deve ser "Ativo" ou "Inativo"',
        'status_matricula',
        data.status_matricula,
      );
    }
  }
}

// Export singleton instance
export default new CredentialService();
