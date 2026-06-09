import fc from 'fast-check';
import PresentationService from '../PresentationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import LogService from '../LogService';
import {
  PresentationExchangeRequest,
  VerifiableCredential,
  StudentData,
} from '../../types';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../CryptoService');
jest.mock('../StorageService');
jest.mock('../../stores/useAppStore');

describe('PresentationService - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });

    // Mock StorageService to return a valid private key
    (StorageService.getHolderPrivateKey as jest.Mock).mockResolvedValue(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    // Mock CryptoService.signData to return a valid signature
    (CryptoService.signData as jest.Mock).mockResolvedValue(
      'mock-signature-hex',
    );

    // Mock CryptoService.computeHash to return deterministic hashes
    (CryptoService.computeHash as jest.Mock).mockImplementation(
      async (data: string) => {
        // Simple deterministic hash for testing
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = (hash << 5) - hash + data.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
      },
    );
  });

  const generateSDJWT = (subject: any) => {
    const disclosures = Object.entries(subject).filter(([k]) => k !== 'id').map(([k, v]) => {
        const json = JSON.stringify(['salt', k, v]);
        return Buffer.from(json).toString('base64url');
    });
    return 'fake.jwt.token~' + disclosures.join('~') + '~';
  };

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
        .integer({min: new Date('1950-01-01').getTime(), max: new Date('2010-01-01').getTime()})
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

  const arbitraryPEXRequest = (
    attributes: string[],
  ): fc.Arbitrary<PresentationExchangeRequest> =>
    fc.record({
      type: fc.constant('PresentationExchange' as const),
      version: fc.constant('1.0.0'),
      challenge: fc.string({minLength: 10, maxLength: 50}),
      presentation_definition: fc.record({
        id: fc.string({minLength: 5, maxLength: 20}),
        input_descriptors: fc.constant([
          {
            id: 'desc-1',
            name: 'Student Credential',
            purpose: 'Verify student attributes',
            constraints: {
              fields: attributes.map(attr => ({
                path: [`$.credentialSubject.${attr}`],
                predicate: 'required' as const,
              })),
            },
          },
        ]),
      }),
    });



  describe('Presentation Creation Logging', () => {
    it('should log presentation creation start and completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.array(fc.constantFrom('nome_completo', 'cpf'), {
            minLength: 1,
            maxLength: 2,
          }),
          async (credential, selectedAttributes) => {
            jest.clearAllMocks();

            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            credential._sd_jwt = generateSDJWT(credential.credentialSubject);
            await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;

            // Should have log for presentation creation started
            const startLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action ===
                  'presentation_creation_started',
            );
            expect(startLog).toBeDefined();

            // Should have log for presentation created
            const completionLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action === 'presentation_created',
            );
            expect(completionLog).toBeDefined();

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
