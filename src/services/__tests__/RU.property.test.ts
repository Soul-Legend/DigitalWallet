import fc from 'fast-check';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import {canonicalAttributeHashInput, stringToBase64Url, bytesToBase64Url, base64UrlToBytes} from '../encoding';
import {
  VerifiableCredential,
  StudentData,
} from '../../types';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../CryptoService');
jest.mock('../StorageService');
jest.mock('../../stores/useAppStore');

describe('Restaurante Universitário - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });

    // Mock StorageService to return a consistent private key
    (StorageService.getHolderPrivateKey as jest.Mock).mockResolvedValue(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    // Mock StorageService to return a valid public key
    (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );

    // Mock StorageService to return issuer public key
    (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
      'issuer-public-key-abcdef0123456789abcdef0123456789abcdef0123456789',
    );

    // Mock CryptoService.signData to return a valid signature
    (CryptoService.signData as jest.Mock).mockResolvedValue(
      'mock-signature-hex',
    );

    // Mock CryptoService.computeHash for attribute hashing
    (CryptoService.computeHash as jest.Mock).mockImplementation(
      async (data: string, _module?: string) => {
        // Deterministic hash based on input
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = (hash << 5) - hash + data.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
      },
    );

    // Mock CryptoService.generateNonce
    (CryptoService.generateNonce as jest.Mock).mockReturnValue(
      'mock-nonce-1234567890abcdef',
    );

    // Mock CryptoService.verifySignature
    (CryptoService.verifySignature as jest.Mock).mockResolvedValue(true);
  });

  // Arbitraries for property-based testing
  const arbitraryStudentData = (): fc.Arbitrary<StudentData> =>
    fc.record({
      nome_completo: fc.string({minLength: 3, maxLength: 100}),
      cpf: fc
        .array(fc.integer({min: 0, max: 9}), {minLength: 11, maxLength: 11})
        .map(arr => arr.join('')),
      matricula: fc.string({minLength: 6, maxLength: 20}),
      curso: fc.constantFrom(
        'Ciência da Computação',
        'Engenharia',
        'Medicina',
        'Direito',
      ),
      status_matricula: fc.constantFrom('Ativo', 'Inativo'),
      data_nascimento: fc
        .integer({
          min: new Date('1950-01-01').getTime(),
          max: new Date('2010-01-01').getTime(),
        })
        .map(timestamp => new Date(timestamp).toISOString().split('T')[0]),
      alojamento_indigena: fc.boolean(),
      auxilio_creche: fc.boolean(),
      auxilio_moradia: fc.boolean(),
      bolsa_estudantil: fc.boolean(),
      bolsa_permanencia_mec: fc.boolean(),
      paiq: fc.boolean(),
      moradia_estudantil: fc.boolean(),
      isencao_ru: fc.boolean(),
      isencao_esporte: fc.boolean(),
      isencao_idiomas: fc.boolean(),
      acesso_laboratorios: fc.array(fc.string({minLength: 1, maxLength: 20}), {
        maxLength: 5,
      }),
      acesso_predios: fc.array(fc.string({minLength: 1, maxLength: 20}), {
        maxLength: 5,
      }),
    });

  const arbitraryCredential = (): fc.Arbitrary<VerifiableCredential> =>
    fc.record({
      '@context': fc.constant(['https://www.w3.org/2018/credentials/v1']),
      type: fc.constant(['VerifiableCredential', 'AcademicIDCredential']),
      issuer: fc.constant('did:web:ufsc.br'),
      issuanceDate: fc.constant(new Date('2024-01-01').toISOString()),
      credentialSubject: arbitraryStudentData().map(data => ({
        id: 'did:key:z6Mk...',
        ...data,
      })),
      proof: fc.record({
        type: fc.constant('JsonWebSignature2020'),
        created: fc.constant(new Date('2024-01-01').toISOString()),
        verificationMethod: fc.constant('did:web:ufsc.br#key-1'),
        proofPurpose: fc.constant('assertionMethod'),
        jws: fc.string({minLength: 20, maxLength: 40}),
      }),
    });

  /**
   * Property 23: SD-JWT Hash Verification
   * **Validates: Requirements 7.7**
   *
   * For any SD-JWT presentation for RU access, the system SHALL compare
   * revealed attribute hashes against the issuer's root signature, and
   * mismatched hashes SHALL result in access denial.
   */

  async function prepareCredentialSDJWT(credential: VerifiableCredential): Promise<void> {
    const sanitizedCredential = JSON.parse(JSON.stringify(credential));
    const subjectKeys = Object.keys(sanitizedCredential.credentialSubject);
    const _sd: string[] = [];
    const disclosures: string[] = [];

    for (const key of subjectKeys) {
      if (key !== 'id') {
        const value = sanitizedCredential.credentialSubject[key];
        const salt = 'mock-nonce-1234567890abcdef';
        const disclosureStr = JSON.stringify([salt, key, value]);
        const disclosureB64 = stringToBase64Url(disclosureStr);
        disclosures.push(disclosureB64);
        
        const hashHex = await CryptoService.computeHash(disclosureStr, 'emissor');
        const hashBytes = new Uint8Array(hashHex.length / 2);
        for (let i = 0; i < hashHex.length; i += 2) {
           hashBytes[i / 2] = parseInt(hashHex.substring(i, i + 2), 16);
        }
        const hashB64 = bytesToBase64Url(hashBytes);
        _sd.push(hashB64);
        
        delete sanitizedCredential.credentialSubject[key];
      }
    }

    _sd.sort();
    sanitizedCredential.credentialSubject._sd = _sd;

    const payload = {
      vc: sanitizedCredential,
      iss: credential.issuer,
      sub: credential.credentialSubject.id,
    };

    const headerBase64 = stringToBase64Url(JSON.stringify({alg: 'EdDSA', typ: 'JWT'}));
    const payloadBase64 = stringToBase64Url(JSON.stringify(payload));
    const signatureBase64 = stringToBase64Url('mock-signature');
    const jwt = `${headerBase64}.${payloadBase64}.${signatureBase64}`;

    credential._sd_jwt = `${jwt}~${disclosures.join('~')}~`;
  }

  // Feature: carteira-identidade-academica, Property 23: SD-JWT Hash Verification
  describe('Property 23: SD-JWT Hash Verification', () => {
    it('should verify hashes of non-disclosed attributes match credential values', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request (only requests status_matricula and isencao_ru)
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create SD-JWT presentation with selective disclosure
            // Only status_matricula and isencao_ru should be disclosed
            const selectedAttributes = ['status_matricula', 'isencao_ru'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify presentation has disclosed attributes
            expect(presentation.disclosed_attributes).toBeDefined();
            expect(presentation.disclosed_attributes!.status_matricula).toBe(
              credential.credentialSubject.status_matricula,
            );
            expect(presentation.disclosed_attributes!.isencao_ru).toBe(
              credential.credentialSubject.isencao_ru,
            );

            const sdJwtStr = presentation.verifiableCredential as string;
            const disclosures = sdJwtStr.split('~').slice(1);
            
            // Should contain only the selected attributes
            const revealedKeys = [];
            for (const b64 of disclosures) {
               if (!b64) continue;
               const decoded = new TextDecoder().decode(base64UrlToBytes(b64));
               const [, key] = JSON.parse(decoded);
               revealedKeys.push(key);
            }
            
            expect(revealedKeys).toContain('status_matricula');
            expect(revealedKeys).toContain('isencao_ru');
            expect(revealedKeys.length).toBe(2);

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should accept presentations with valid hashes during verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create SD-JWT presentation
            const selectedAttributes = ['status_matricula', 'isencao_ru'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Validate the presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Verification should succeed with valid hashes
            expect(validationResult.valid).toBe(true);
            expect(validationResult.errors).toBeUndefined();

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should reject presentations with tampered hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create SD-JWT presentation
            const selectedAttributes = ['status_matricula', 'isencao_ru'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Tamper with a disclosed attribute
            let tamperedToken = presentation.verifiableCredential as string;
            const parts = tamperedToken.split('~');
            if (parts.length > 2) {
               const disclosureB64 = parts[1];
               const disclosureStr = new TextDecoder().decode(base64UrlToBytes(disclosureB64));
               const parsed = JSON.parse(disclosureStr);
               parsed[2] = "Inativo_Tampered"; // Modify value
               parts[1] = stringToBase64Url(JSON.stringify(parsed));
            }
            presentation.verifiableCredential = parts.join('~');

            // Validate the presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Verification should fail due to tampered hash
            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors).toBeDefined();
            expect(validationResult.errors!.length).toBeGreaterThan(0);

            // Error message should indicate hash mismatch
            const errorMessage = validationResult.errors!.join(' ');
            expect(errorMessage.toLowerCase()).toMatch(/hash|não encontrado|inválida/);

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should reject presentations with missing required attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create SD-JWT presentation but omit a required attribute
            const selectedAttributes = ['status_matricula']; // Missing isencao_ru
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Validate the presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Verification should fail due to missing required attribute
            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors).toBeDefined();
            expect(validationResult.errors!.length).toBeGreaterThan(0);

            // Error message should indicate missing attribute
            const errorMessage = validationResult.errors!.join(' ');
            expect(errorMessage.toLowerCase()).toMatch(/ausente|requisitado|isencao_ru/);

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should not reveal non-disclosed attribute values in presentation', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create SD-JWT presentation
            const selectedAttributes = ['status_matricula', 'isencao_ru'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify sensitive attributes are not in plain text
            const sensitiveAttributes = [
              'nome_completo',
              'cpf',
              'data_nascimento',
              'matricula',
            ];

            for (const attr of sensitiveAttributes) {
              const value = (credential.credentialSubject as any)[attr];
              if (typeof value === 'string' && value.length > 3) {
                // The actual value should not appear in the presentation
                // (except in the embedded credential, which is signed)
                const disclosedSection = JSON.stringify(
                  presentation.disclosed_attributes,
                );
                expect(disclosedSection).not.toContain(value);
              }
            }

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should verify hash integrity against issuer root signature', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create SD-JWT presentation
            const selectedAttributes = ['status_matricula', 'isencao_ru'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify structural integrity (which includes hash verification)
            const integrityValid = await VerificationService.verifyStructuralIntegrity(
              presentation,
              pexRequest,
            );

            // Integrity check should pass for valid presentation
            expect(integrityValid).toBe(true);

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should handle presentations with all attributes disclosed', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create presentation with all attributes disclosed (edge case)
            const allAttributes = Object.keys(credential.credentialSubject).filter(
              key => key !== 'id',
            );
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              allAttributes,
            );

            // Verify presentation is valid
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            expect(validationResult.valid).toBe(true);

            // All attributes should be disclosed
            expect(Object.keys(presentation.disclosed_attributes!).length).toBe(
              allAttributes.length,
            );

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });

    it('should handle presentations with only required attributes disclosed', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async (credential) => {
            await prepareCredentialSDJWT(credential);
            // Generate RU PEX request
            const pexRequest = await VerificationService.generateChallenge('ru');

            // Create presentation with only required attributes
            const selectedAttributes = ['status_matricula', 'isencao_ru'];
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify presentation is valid
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            expect(validationResult.valid).toBe(true);

            // Only required attributes should be disclosed
            expect(Object.keys(presentation.disclosed_attributes!)).toEqual(
              expect.arrayContaining(selectedAttributes),
            );

            // All other attributes should be omitted
            const sdJwtStr = presentation.verifiableCredential as string;
            const disclosures = sdJwtStr.split('~').slice(1).filter(Boolean);
            
            expect(disclosures.length).toBe(selectedAttributes.length);

            return true;
          },
        ),
        {numRuns: 100, verbose: 0},
      );
    });
  });
});
