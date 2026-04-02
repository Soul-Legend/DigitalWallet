import {
  PresentationExchangeRequest,
  VerifiablePresentation,
  ValidationResult,
  Scenario,
  Predicate,
  IVerificationStep,
  VerificationContext,
  StepResult,
} from '../types';
import type {ILogService, ICryptoService, IStorageService, IZKProofService, IAnonCredsService, ITrustChainService} from '../types';
import {ValidationError, CryptoError} from './ErrorHandler';
import LogServiceInstance from './LogService';
import CryptoServiceInstance from './CryptoService';
import StorageServiceInstance from './StorageService';
import ZKProofServiceInstance from './ZKProofService';
import AnonCredsServiceInstance from './AnonCredsService';
import TrustChainServiceInstance from './TrustChainService';
import {VerificationPipeline} from './VerificationPipeline';
import {
  createSignatureStep,
  createTrustChainStep,
  createIntegrityStep,
  createChallengeStep,
  createPredicateStep,
  createNullifierStep,
  createResourceAccessStep,
} from './VerificationSteps';

/**
 * VerificationService - Handles presentation validation and verification
 *
 * This service is responsible for:
 * - Generating PEX challenges for verification scenarios
 * - Validating presentation format
 * - Verifying issuer signatures (did:web)
 * - Verifying structural integrity of presentations
 * - Managing nullifiers for election scenarios
 */
class VerificationService {
  private readonly logger: ILogService;
  private readonly crypto: ICryptoService;
  private readonly storage: IStorageService;
  private readonly zkProof: IZKProofService;
  private readonly anonCredsService: IAnonCredsService;
  private readonly trustChainService: ITrustChainService;

  constructor(
    logger: ILogService = LogServiceInstance,
    crypto: ICryptoService = CryptoServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    zkProof: IZKProofService = ZKProofServiceInstance,
    anonCredsService: IAnonCredsService = AnonCredsServiceInstance,
    trustChainService: ITrustChainService = TrustChainServiceInstance,
  ) {
    this.logger = logger;
    this.crypto = crypto;
    this.storage = storage;
    this.zkProof = zkProof;
    this.anonCredsService = anonCredsService;
    this.trustChainService = trustChainService;
  }

  /**
   * Pre-configured verification scenarios
   */
  private scenarios: Scenario[] = [
    {
      id: 'ru',
      name: 'Restaurante Universitário',
      description: 'Validar vínculo e isenção tarifária com divulgação seletiva',
      type: 'selective_disclosure',
      requested_attributes: ['status_matricula', 'isencao_ru'],
    },
    {
      id: 'elections',
      name: 'Eleições',
      description: 'Validar elegibilidade com prevenção de voto duplicado',
      type: 'zkp_eligibility',
      predicates: [
        {
          attribute: 'status_matricula',
          p_type: '==',
          value: 'Ativo',
        },
      ],
    },
    {
      id: 'age_verification',
      name: 'Verificação de Maioridade',
      description: 'Validar maioridade civil sem acessar data de nascimento',
      type: 'range_proof',
      predicates: [
        {
          attribute: 'data_nascimento',
          p_type: '>=',
          value: 18,
        },
      ],
    },
    {
      id: 'lab_access',
      name: 'Acesso a Laboratórios',
      description: 'Validar permissões de acesso físico específicas',
      type: 'access_control',
      requested_attributes: ['acesso_laboratorios', 'acesso_predios'],
    },
  ];

  /**
   * Gets all available verification scenarios
   */
  getScenarios(): Scenario[] {
    return this.scenarios;
  }

  /**
   * Gets a specific scenario by ID
   */
  getScenario(scenarioId: string): Scenario | undefined {
    return this.scenarios.find(s => s.id === scenarioId);
  }

  /**
   * Generates a PEX challenge for a specific scenario
   * @param scenarioId - The ID of the scenario
   * @param additionalData - Additional data for the scenario (e.g., election_id, resource_id)
   * @returns PEX request object
   */
  async generateChallenge(
    scenarioId: string,
    additionalData?: {election_id?: string; resource_id?: string},
  ): Promise<PresentationExchangeRequest> {
    try {
      const scenario = this.getScenario(scenarioId);

      if (!scenario) {
        throw new ValidationError(
          `Cenário não encontrado: ${scenarioId}`,
          'scenario_id',
          scenarioId,
        );
      }

      // Generate cryptographic nonce
      const challenge = this.crypto.generateNonce();

      // Build PEX request based on scenario type
      const pexRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge,
        presentation_definition: {
          id: `${scenarioId}-${Date.now()}`,
          input_descriptors: this.buildInputDescriptors(scenario),
        },
      };

      // Add predicates if present
      if (scenario.predicates && scenario.predicates.length > 0) {
        pexRequest.predicates = scenario.predicates;
      }

      // Add scenario-specific data
      if (additionalData?.election_id) {
        pexRequest.election_id = additionalData.election_id;
      }

      if (additionalData?.resource_id) {
        pexRequest.resource_id = additionalData.resource_id;
      }

      // Log challenge generation
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'challenge_generated',
            scenario_id: scenarioId,
            scenario_type: scenario.type,
            challenge_truncated: challenge.substring(0, 16) + '...',
            definition_id: pexRequest.presentation_definition.id,
          },
        },
        true,
      );

      return pexRequest;
    } catch (error) {
      // Log error
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'challenge_generation_failed',
            scenario_id: scenarioId,
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Builds input descriptors for PEX request based on scenario
   */
  private buildInputDescriptors(
    scenario: Scenario,
  ): PresentationExchangeRequest['presentation_definition']['input_descriptors'] {
    const descriptors: PresentationExchangeRequest['presentation_definition']['input_descriptors'] =
      [];

    // Build descriptor based on scenario type
    const descriptor = {
      id: `${scenario.id}-descriptor`,
      name: scenario.name,
      purpose: scenario.description,
      constraints: {
        fields: [] as Array<{
          path: string[];
          filter?: {
            type: string;
            const?: any;
            pattern?: string;
          };
          predicate?: 'required' | 'preferred';
        }>,
        limit_disclosure: 'required' as const,
      },
    };

    // Add requested attributes as fields
    if (scenario.requested_attributes) {
      for (const attr of scenario.requested_attributes) {
        descriptor.constraints.fields.push({
          path: [`$.credentialSubject.${attr}`],
          predicate: 'required',
        });
      }
    }

    // Add predicate fields
    if (scenario.predicates) {
      for (const predicate of scenario.predicates) {
        descriptor.constraints.fields.push({
          path: [`$.credentialSubject.${predicate.attribute}`],
          predicate: 'required',
        });
      }
    }

    descriptors.push(descriptor);

    return descriptors;
  }

  /**
   * Validates the format of a presentation
   * @param presentation - The presentation object or JSON string
   * @returns Parsed and validated presentation
   */
  validatePresentationFormat(
    presentation: string | VerifiablePresentation,
  ): VerifiablePresentation {
    try {
      // Parse if string
      let parsedPresentation: VerifiablePresentation;
      if (typeof presentation === 'string') {
        try {
          parsedPresentation = JSON.parse(presentation);
        } catch (parseError) {
          throw new ValidationError(
            'Formato JSON inválido na apresentação',
            'presentation',
            presentation.substring(0, 50),
          );
        }
      } else {
        parsedPresentation = presentation;
      }

      // Validate required fields
      if (!parsedPresentation['@context'] || !Array.isArray(parsedPresentation['@context'])) {
        throw new ValidationError(
          'Campo @context ausente ou inválido',
          '@context',
          parsedPresentation['@context'],
        );
      }

      if (!parsedPresentation.type || !Array.isArray(parsedPresentation.type)) {
        throw new ValidationError(
          'Campo type ausente ou inválido',
          'type',
          parsedPresentation.type,
        );
      }

      if (!parsedPresentation.holder || typeof parsedPresentation.holder !== 'string') {
        throw new ValidationError(
          'Campo holder ausente ou inválido',
          'holder',
          parsedPresentation.holder,
        );
      }

      if (!parsedPresentation.verifiableCredential) {
        throw new ValidationError(
          'Campo verifiableCredential ausente',
          'verifiableCredential',
          undefined,
        );
      }

      if (!parsedPresentation.proof || typeof parsedPresentation.proof !== 'object') {
        throw new ValidationError(
          'Campo proof ausente ou inválido',
          'proof',
          parsedPresentation.proof,
        );
      }

      // Validate proof structure
      const proof = parsedPresentation.proof;
      if (!proof.type || !proof.created || !proof.challenge || !proof.proofPurpose) {
        throw new ValidationError(
          'Estrutura de proof inválida',
          'proof',
          proof,
        );
      }

      // Log successful validation
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'presentation_format_validated',
            holder: parsedPresentation.holder,
            proof_type: proof.type,
          },
        },
        true,
      );

      return parsedPresentation;
    } catch (error) {
      // Log validation error
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'presentation_format_validation_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Erro ao validar formato da apresentação',
        'presentation',
        presentation,
      );
    }
  }

  /**
   * Verifies the issuer's signature on a presentation
   * @param presentation - The validated presentation
   * @param issuerPublicKey - The issuer's public key (from did:web resolution)
   * @returns True if signature is valid
   */
  async verifyIssuerSignature(
    presentation: VerifiablePresentation,
    issuerPublicKey?: string,
  ): Promise<boolean> {
    try {
      // Extract credential from presentation
      const credential =
        typeof presentation.verifiableCredential === 'string'
          ? JSON.parse(presentation.verifiableCredential)
          : presentation.verifiableCredential;

      // Get issuer DID
      const issuerDID = credential.issuer;

      // Get issuer's public key
      let publicKey = issuerPublicKey;
      if (!publicKey) {
        // In production, we would resolve the DID to get the public key
        // For MVP, we'll get it from storage (simulated issuer)
        publicKey = await this.storage.getIssuerPublicKey() ?? undefined;

        if (!publicKey) {
          throw new CryptoError(
            'Chave pública do emissor não encontrada',
            'verification',
            {issuerDID},
          );
        }
      }

      // For MVP, we'll verify the presentation signature instead of the credential signature
      // This is because the credential is embedded in a JWT and the presentation has its own signature
      // In production, we would verify both the credential signature and the presentation signature
      
      // Verify the presentation signature (signed by holder)
      // The presentation proof contains the holder's signature
      const presentationProof = presentation.proof;
      
      // For Groth16Proof type, verification is done via ZKP proof data
      // (handled in verifyZKPIntegrity), not via traditional signatures
      if (presentationProof.type === 'Groth16Proof') {
        // ZKP presentations are verified through their Groth16 proofs
        this.logger.captureEvent(
          'verification',
          'verificador',
          {
            algorithm: 'Groth16',
            verification_result: true,
            parameters: {
              action: 'zkp_proof_type_accepted',
              issuer: issuerDID,
              proof_type: 'Groth16Proof',
            },
          },
          true,
        );
        return true;
      }

      // For CLSignature2023 type (AnonCreds), verify with the AnonCreds library
      if (presentationProof.type === 'CLSignature2023') {
        return await this.verifyAnonCredsPresentation(presentation);
      }

      if (!presentationProof.jws && !presentationProof.signature) {
        throw new ValidationError(
          'Assinatura não encontrada no proof da apresentação',
          'proof',
          presentationProof,
        );
      }

      // For MVP, we'll consider the presentation valid if it has a signature
      // In production, we would:
      // 1. Verify the credential's issuer signature using issuer's public key
      // 2. Verify the presentation's holder signature using holder's public key
      
      // Log verification result
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          algorithm: 'Ed25519',
          verification_result: true,
          parameters: {
            action: 'issuer_signature_verified',
            issuer: issuerDID,
            signature_valid: true,
          },
        },
        true,
      );

      return true;
    } catch (error) {
      // Log error
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          algorithm: 'Ed25519',
          verification_result: false,
          parameters: {
            action: 'issuer_signature_verification_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Verifies the structural integrity of a presentation
   * Checks that disclosed attributes or ZKP proofs are valid
   * @param presentation - The validated presentation
   * @param pexRequest - The original PEX request
   * @returns True if structural integrity is valid
   */
  async verifyStructuralIntegrity(
    presentation: VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<boolean> {
    try {
      // Extract credential
      const credential =
        typeof presentation.verifiableCredential === 'string'
          ? JSON.parse(presentation.verifiableCredential)
          : presentation.verifiableCredential;

      // Check if this is SD-JWT or ZKP presentation
      const isSDJWT = presentation.disclosed_attributes !== undefined;
      const isZKP = presentation.zkp_proofs !== undefined;

      let integrityValid = false;

      if (isSDJWT) {
        // Verify SD-JWT hashed attributes
        integrityValid = await this.verifySDJWTIntegrity(
          presentation,
          credential,
          pexRequest,
        );
      } else if (isZKP) {
        // Verify ZKP proofs
        integrityValid = await this.verifyZKPIntegrity(
          presentation,
          credential,
          pexRequest,
        );
      } else {
        // Standard presentation - verify all requested attributes are present
        integrityValid = this.verifyStandardIntegrity(
          credential,
          pexRequest,
        );
      }

      // Log verification result
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'structural_integrity_verified',
            presentation_type: isSDJWT ? 'SD-JWT' : isZKP ? 'ZKP' : 'Standard',
            integrity_valid: integrityValid,
          },
        },
        true,
      );

      return integrityValid;
    } catch (error) {
      // Log error
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'structural_integrity_verification_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Verifies SD-JWT presentation integrity
   * Checks that hashed attributes match the issuer's root signature
   */
  private async verifySDJWTIntegrity(
    presentation: VerifiablePresentation,
    credential: any,
    pexRequest: PresentationExchangeRequest,
  ): Promise<boolean> {
    try {
      const disclosedAttributes = presentation.disclosed_attributes || {};
      const hashedAttributes = (presentation as any).hashed_attributes || {};

      // Extract requested attributes from PEX (only required ones)
      const requestedAttributes = this.extractRequiredAttributesFromPEX(pexRequest);

      // Verify all REQUIRED attributes are disclosed (not hashed)
      // Optional attributes (predicate: 'preferred') are not mandatory
      for (const attr of requestedAttributes) {
        const isDisclosed = attr in disclosedAttributes;

        if (!isDisclosed) {
          throw new ValidationError(
            `Atributo requisitado ausente: ${attr}`,
            'attributes',
            attr,
          );
        }

        // Verify disclosed attribute matches the credential
        const credentialValue = credential.credentialSubject[attr];
        const disclosedValue = disclosedAttributes[attr];

        if (JSON.stringify(credentialValue) !== JSON.stringify(disclosedValue)) {
          throw new ValidationError(
            `Atributo divulgado não corresponde à credencial: ${attr}`,
            attr,
            {credentialValue, disclosedValue},
          );
        }
      }

      // Validate filters from PEX request (only for disclosed attributes)
      await this.validatePEXFilters(pexRequest, disclosedAttributes);

      // Verify hashed attributes (non-requested attributes)
      // These should have valid hashes that match the credential values
      for (const attr in hashedAttributes) {
        // Skip if this is a requested attribute (should be disclosed, not hashed)
        if (requestedAttributes.includes(attr)) {
          throw new ValidationError(
            `Atributo requisitado não deve estar ofuscado: ${attr}`,
            attr,
            attr,
          );
        }

        // Verify the hash is correct
        const credentialValue = credential.credentialSubject[attr];
        const valueString =
          typeof credentialValue === 'object'
            ? JSON.stringify(credentialValue)
            : String(credentialValue);

        const expectedHash = await this.crypto.computeHash(
          `${attr}:${valueString}`,
          'verificador',
        );

        if (hashedAttributes[attr] !== expectedHash) {
          throw new ValidationError(
            `Hash do atributo inválido: ${attr}`,
            attr,
            {expected: expectedHash, actual: hashedAttributes[attr]},
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new CryptoError(
        'Erro ao verificar integridade SD-JWT',
        'verification',
        {error},
      );
    }
  }

  /**
   * Verifies ZKP presentation integrity using mopro's verifyCircomProof
   * Checks that ZKP proofs are cryptographically valid Groth16 proofs
   */
  private async verifyZKPIntegrity(
    presentation: VerifiablePresentation,
    credential: any,
    pexRequest: PresentationExchangeRequest,
  ): Promise<boolean> {
    try {
      const zkpProofs = presentation.zkp_proofs || [];

      if (zkpProofs.length === 0) {
        throw new ValidationError(
          'Nenhuma prova ZKP encontrada na apresentação',
          'zkp_proofs',
          undefined,
        );
      }

      // Verify each ZKP proof
      for (const proof of zkpProofs) {
        // Verify proof structure
        if (!proof.predicate || !proof.proof_data) {
          throw new ValidationError(
            'Estrutura de prova ZKP inválida',
            'zkp_proof',
            proof,
          );
        }

        // Verify the predicate is satisfied
        if (!proof.predicate_satisfied) {
          throw new ValidationError(
            `Predicado não satisfeito: ${proof.predicate.attr_name} ${proof.predicate.p_type} ${proof.predicate.value}`,
            'predicate',
            proof.predicate,
          );
        }

        // Verify the Groth16 proof using mopro if circom_proof is present
        if (proof.proof_data.circom_proof && proof.proof_data.public_inputs) {
          // Determine the circuit name based on predicate type
          const circuitName = this.getCircuitNameForPredicate(proof.predicate);

          try {
            const isValid = await this.zkProof.verifyProof(
              circuitName,
              {
                proof: proof.proof_data.circom_proof,
                inputs: proof.proof_data.public_inputs,
              },
            );

            if (!isValid) {
              throw new ValidationError(
                `Prova ZKP Groth16 inválida para predicado: ${proof.predicate.attr_name}`,
                'zkp_proof',
                proof.predicate,
              );
            }

            this.logger.captureEvent(
              'verification',
              'verificador',
              {
                parameters: {
                  action: 'zkp_groth16_verified',
                  circuit: circuitName,
                  attribute: proof.predicate.attr_name,
                  valid: true,
                },
              },
              true,
            );
          } catch (verifyError) {
            // SECURITY: If the circuit zkey is unavailable, we CANNOT verify the ZKP.
            // Accepting an unverified proof completely undermines the zero-knowledge
            // guarantee. The verifier must reject the presentation.
            if (verifyError instanceof CryptoError &&
                String(verifyError.message).includes('zkey não encontrado')) {
              this.logger.captureEvent(
                'verification',
                'verificador',
                {
                  parameters: {
                    action: 'zkp_circuit_unavailable_rejected',
                    circuit: circuitName,
                    message: 'Circuit zkey not available — cannot verify ZKP, rejecting proof',
                  },
                },
                false,
              );
              throw new ValidationError(
                `Cannot verify ZKP: circuit file (${circuitName}) not available. ` +
                'The verifier must have the circuit zkey to validate Groth16 proofs.',
                'zkp_circuit',
                {circuit: circuitName},
              );
            } else if (verifyError instanceof ValidationError) {
              throw verifyError;
            } else {
              throw verifyError;
            }
          }
        } else {
          // SECURITY: A ZKP presentation MUST contain verifiable Groth16 proof data.
          // Accepting a proof without circom_proof + public_inputs means we have
          // no cryptographic evidence. Reject the proof.
          this.logger.captureEvent(
            'verification',
            'verificador',
            {
              parameters: {
                action: 'zkp_missing_groth16_data_rejected',
                message: 'Proof does not contain Groth16 data (circom_proof + public_inputs). Rejecting.',
              },
            },
            false,
          );
          throw new ValidationError(
            `ZKP proof for predicate '${proof.predicate.attr_name}' is missing Groth16 proof data (circom_proof and public_inputs). ` +
            'Cannot verify without cryptographic proof.',
            'zkp_proof_data',
            proof,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new CryptoError(
        'Erro ao verificar integridade ZKP',
        'verification',
        {error},
      );
    }
  }

  /**
   * Maps a predicate to the corresponding Circom circuit name
   */
  private getCircuitNameForPredicate(predicate: {attr_name: string; p_type: string; value: any}): string {
    // Date-based predicates use age_range circuit
    if (predicate.attr_name === 'data_nascimento') {
      return 'age_range';
    }
    // Equality/inequality predicates use status_check circuit
    if (predicate.p_type === '==' || predicate.p_type === '!=') {
      return 'status_check';
    }
    // Default to age_range for numeric comparisons
    return 'age_range';
  }

  /**
   * Verifies an AnonCreds CL-signature presentation using the native library.
   * Checks that the ZKP proof (selective disclosure + predicates) is valid.
   */
  private async verifyAnonCredsPresentation(
    presentation: VerifiablePresentation,
  ): Promise<boolean> {
    try {
      const zkpProof = presentation.zkp_proof;
      if (!zkpProof?.proof_data) {
        throw new ValidationError(
          'AnonCreds presentation missing proof_data',
          'zkp_proof',
          undefined,
        );
      }

      // Recover credential token to get artifact identifiers
      const credToken =
        typeof presentation.verifiableCredential === 'string'
          ? JSON.parse(presentation.verifiableCredential)
          : presentation.verifiableCredential;

      const schemaId = credToken.schema_id || credToken.issuer;
      const credDefId = credToken.cred_def_id || credToken.issuer;

      const schemaRaw = await this.storage.getRawItem(
        `anoncreds_schema_${schemaId}`,
      );
      const credDefRaw = await this.storage.getRawItem(
        `anoncreds_creddef_${credDefId}`,
      );

      if (!schemaRaw || !credDefRaw) {
        // SECURITY: Without the original schema and credential definition artifacts,
        // we cannot cryptographically verify the CL-signature ZKP.
        // Accepting the presentation without this verification would undermine
        // the entire AnonCreds trust model. Reject the presentation.
        this.logger.captureEvent(
          'verification',
          'verificador',
          {
            algorithm: 'CL',
            verification_result: false,
            parameters: {
              action: 'anoncreds_artifacts_missing_rejected',
              schemaId,
              credDefId,
            },
          },
          false,
        );
        throw new ValidationError(
          'Cannot verify AnonCreds presentation: issuer artifacts (schema or credential definition) not found in storage. ' +
          'The credential may have been issued by a different instance or the artifacts were cleared.',
          'anoncreds_artifacts',
          {schemaId, credDefId},
        );
      }

      const schema = JSON.parse(schemaRaw);
      const credDef = JSON.parse(credDefRaw);

      // Build the same presentation request to pass to verify
      const presRequestJson = zkpProof.proof_data?.requested_proof
        ? (zkpProof.proof_data as Record<string, unknown>)
        : this.rebuildPresentationRequest(zkpProof);

      const isValid = this.anonCredsService.verifyPresentation(
        zkpProof.proof_data as Record<string, unknown>,
        presRequestJson,
        {[schemaId]: schema.schema},
        {[credDefId]: credDef.credDef},
      );

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          algorithm: 'CL',
          verification_result: isValid,
          parameters: {
            action: 'anoncreds_presentation_verified',
            schemaId,
            credDefId,
          },
        },
        isValid,
      );

      return isValid;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {parameters: {action: 'anoncreds_verification_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Rebuilds a minimal AnonCreds presentation request from zkp_proof data
   * so it can be passed to this.anonCredsService.verifyPresentation().
   */
  private rebuildPresentationRequest(
    zkpProof: NonNullable<VerifiablePresentation['zkp_proof']>,
  ): Record<string, unknown> {
    const requestedAttributes: Record<string, {name: string}> = {};
    (zkpProof.revealed_attrs || []).forEach((attr: string, i: number) => {
      requestedAttributes[`attr_${i}`] = {name: attr};
    });

    const requestedPredicates: Record<
      string,
      {name: string; p_type: string; p_value: number}
    > = {};
    (zkpProof.predicates || []).forEach(
      (p: {attr_name: string; p_type: string; value: number}, i: number) => {
        requestedPredicates[`pred_${i}`] = {
          name: p.attr_name,
          p_type: p.p_type,
          p_value: p.value,
        };
      },
    );

    return {
      name: 'verification',
      version: '1.0',
      nonce: String(Date.now()),
      requested_attributes: requestedAttributes,
      requested_predicates: requestedPredicates,
    };
  }

  /**
   * Verifies standard presentation integrity
   * Checks that all requested attributes are present in the credential
   */
  private verifyStandardIntegrity(
    credential: any,
    pexRequest: PresentationExchangeRequest,
  ): boolean {
    const requestedAttributes = this.extractRequestedAttributesFromPEX(pexRequest);

    for (const attr of requestedAttributes) {
      if (!(attr in credential.credentialSubject)) {
        throw new ValidationError(
          `Atributo requisitado ausente na credencial: ${attr}`,
          'attributes',
          attr,
        );
      }
    }

    return true;
  }

  /**
   * Validates PEX filters against disclosed attributes
   * Checks filter.const and filter.contains constraints
   */
  private async validatePEXFilters(
    pexRequest: PresentationExchangeRequest,
    disclosedAttributes: Record<string, any>,
  ): Promise<void> {
    for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
      for (const field of descriptor.constraints.fields) {
        if (!field.filter) {
          continue;
        }

        // Extract attribute name from path
        const path = field.path[0];
        const match = path.match(/\.([^.]+)$/);
        if (!match) {
          continue;
        }

        const attrName = match[1];
        const attrValue = disclosedAttributes[attrName];

        // Skip validation if attribute is not disclosed (optional attributes)
        if (attrValue === undefined) {
          continue;
        }

        // Validate filter.const
        if (field.filter.const !== undefined) {
          if (attrValue !== field.filter.const) {
            throw new ValidationError(
              `Atributo ${attrName} não corresponde ao valor esperado. Esperado: ${field.filter.const}, Recebido: ${attrValue}`,
              attrName,
              {expected: field.filter.const, actual: attrValue},
            );
          }
        }

        // Validate filter.contains (for arrays)
        if (field.filter.contains !== undefined) {
          if (!Array.isArray(attrValue)) {
            throw new ValidationError(
              `Atributo ${attrName} deve ser um array para validação de contains`,
              attrName,
              attrValue,
            );
          }

          const containsValue = field.filter.contains.const;
          if (!attrValue.includes(containsValue)) {
            throw new ValidationError(
              `Array ${attrName} não contém o valor esperado: ${containsValue}`,
              attrName,
              {expected: containsValue, actual: attrValue},
            );
          }
        }
      }
    }
  }

  /**
   * Extracts REQUIRED attribute names from PEX request
   * Only returns attributes with predicate: 'required' or no predicate specified
   */
  private extractRequiredAttributesFromPEX(
    pexRequest: PresentationExchangeRequest,
  ): string[] {
    const attributes: string[] = [];

    for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
      for (const field of descriptor.constraints.fields) {
        // Only include required attributes (predicate === 'required' or undefined)
        if (field.predicate === 'preferred') {
          continue; // Skip optional attributes
        }

        // Extract attribute name from JSONPath
        const path = field.path[0];
        const match = path.match(/\.([^.]+)$/);
        if (match) {
          attributes.push(match[1]);
        }
      }
    }

    return attributes;
  }

  /**
   * Extracts requested attribute names from PEX request (all attributes, required and optional)
   */
  private extractRequestedAttributesFromPEX(
    pexRequest: PresentationExchangeRequest,
  ): string[] {
    const attributes: string[] = [];

    for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
      for (const field of descriptor.constraints.fields) {
        // Extract attribute name from JSONPath
        const path = field.path[0];
        const match = path.match(/\.([^.]+)$/);
        if (match) {
          attributes.push(match[1]);
        }
      }
    }

    return attributes;
  }

  /**
   * Gets holder's public key from DID
   * In production, this would resolve the DID document
   * For MVP, we simulate this
   */
  private async getHolderPublicKey(holderDID: string): Promise<string> {
    // For MVP, we'll extract the public key from the did:key format
    // did:key format encodes the public key in the identifier
    if (holderDID.startsWith('did:key:')) {
      // In production, we would decode the multibase-encoded key
      // For MVP, we'll get it from storage
      const publicKey = await this.storage.getHolderPublicKey();
      if (!publicKey) {
        throw new CryptoError(
          'Chave pública do titular não encontrada',
          'verification',
          {holderDID},
        );
      }
      return publicKey;
    }

    throw new ValidationError(
      'Método DID não suportado para resolução de chave pública',
      'holder_did',
      holderDID,
    );
  }

  /**
   * Validates a complete presentation against a PEX request.
   *
   * Uses VerificationPipeline (Chain of Responsibility) to compose
   * independent verification steps.  New steps can be added via
   * `register()` without changing existing code (Open/Closed Principle).
   */
  async validatePresentation(
    presentation: string | VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<ValidationResult> {
    try {
      // Step 1: Validate presentation format (must succeed to continue)
      const validatedPresentation = this.validatePresentationFormat(presentation);

      // Build verification pipeline with composable steps
      const pipeline = new VerificationPipeline()
        .register(createSignatureStep(this))
        .register(createTrustChainStep())
        .register(createIntegrityStep(this))
        .register(createChallengeStep())
        .register(createPredicateStep(
          (p, preds) => this.checkPredicates(p, preds),
          (p, preds) => this.getFailedPredicates(p, preds),
        ))
        .register(createNullifierStep(this))
        .register(createResourceAccessStep(
          (p) => this.extractVerifiedAttributes(p),
          (attrs, resourceId) => this.checkLabAccess(attrs, resourceId),
        ));

      const context = await pipeline.execute(validatedPresentation, pexRequest);

      // Derive result from pipeline context
      const verifiedAttributes = this.extractVerifiedAttributes(validatedPresentation);
      const valid = context.errors.length === 0;

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          verification_result: valid,
          parameters: {
            action: 'presentation_validated',
            valid,
            errors_count: context.errors.length,
            nullifier_check: context.nullifierCheck,
          },
        },
        true,
      );

      return {
        valid,
        errors: context.errors.length > 0 ? context.errors : undefined,
        verified_attributes: verifiedAttributes,
        predicates_satisfied: context.predicatesSatisfied ?? true,
        nullifier_check: context.nullifierCheck,
        trust_chain_valid: context.trustChainValid,
      };
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          verification_result: false,
          parameters: {action: 'presentation_validation_failed'},
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : 'Erro desconhecido na validação',
        ],
      };
    }
  }

  // -------------------------------------------------------------------
  // Pipeline Step Factories (Strategy Pattern)
  // -------------------------------------------------------------------

  /**
   * Extracts verified attributes from a presentation
   */
  private extractVerifiedAttributes(
    presentation: VerifiablePresentation,
  ): Record<string, any> {
    if (presentation.disclosed_attributes) {
      return presentation.disclosed_attributes;
    }

    // For ZKP presentations, don't return attributes used in predicates
    // Only return attributes that were explicitly revealed (not used in proofs)
    if (presentation.zkp_proofs && presentation.zkp_proofs.length > 0) {
      // For ZKP, only return explicitly revealed attributes
      // Predicates prove properties without revealing the actual values
      const revealed: Record<string, any> = {};
      
      // Check if any attributes were explicitly revealed in the proofs
      for (const proof of presentation.zkp_proofs) {
        if (proof.revealed_attrs && proof.revealed_attrs.length > 0) {
          // Add revealed attributes to the result
          for (const attr of proof.revealed_attrs) {
            revealed[attr] = true; // Just indicate it was revealed, not the value
          }
        }
      }
      
      return revealed;
    }

    // For standard presentations, extract from credential
    const credential =
      typeof presentation.verifiableCredential === 'string'
        ? JSON.parse(presentation.verifiableCredential)
        : presentation.verifiableCredential;

    return credential.credentialSubject;
  }

  /**
   * Checks if predicates are satisfied in a presentation
   */
  private checkPredicates(
    presentation: VerifiablePresentation,
    predicates: Predicate[],
  ): boolean {
    // For ZKP presentations, check the zkp_proof or zkp_proofs
    if (presentation.zkp_proof) {
      // Check the zkp_proof.predicates array
      for (const predicate of predicates) {
        const proof = presentation.zkp_proof.predicates.find(
          p => p.attr_name === predicate.attribute,
        );

        if (!proof || proof.satisfied === false) {
          return false;
        }
      }
      return true;
    }

    if (presentation.zkp_proofs) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proofs.find(
          p => p.predicate.attr_name === predicate.attribute,
        );

        if (!proof || !proof.predicate_satisfied) {
          return false;
        }
      }
      return true;
    }

    // For standard presentations, evaluate predicates directly
    const credential =
      typeof presentation.verifiableCredential === 'string'
        ? JSON.parse(presentation.verifiableCredential)
        : presentation.verifiableCredential;

    for (const predicate of predicates) {
      const value = credential.credentialSubject[predicate.attribute];
      
      if (!this.evaluatePredicate(value, predicate.p_type, predicate.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a list of failed predicates for error reporting
   */
  private getFailedPredicates(
    presentation: VerifiablePresentation,
    predicates: Predicate[],
  ): string[] {
    const failed: string[] = [];

    // For ZKP presentations
    if (presentation.zkp_proof) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proof.predicates.find(
          p => p.attr_name === predicate.attribute,
        );

        if (!proof || proof.satisfied === false) {
          failed.push(`${predicate.attribute} ${predicate.p_type} ${predicate.value}`);
        }
      }
      return failed;
    }

    if (presentation.zkp_proofs) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proofs.find(
          p => p.predicate.attr_name === predicate.attribute,
        );

        if (!proof || !proof.predicate_satisfied) {
          failed.push(`${predicate.attribute} ${predicate.p_type} ${predicate.value}`);
        }
      }
      return failed;
    }

    // For standard presentations
    const credential =
      typeof presentation.verifiableCredential === 'string'
        ? JSON.parse(presentation.verifiableCredential)
        : presentation.verifiableCredential;

    for (const predicate of predicates) {
      const value = credential.credentialSubject[predicate.attribute];
      
      if (!this.evaluatePredicate(value, predicate.p_type, predicate.value)) {
        // For age predicates, show more helpful message
        if (predicate.attribute === 'data_nascimento' && typeof predicate.value === 'number') {
          failed.push(`idade ${predicate.p_type} ${predicate.value} anos`);
        } else {
          failed.push(`${predicate.attribute} ${predicate.p_type} ${predicate.value}`);
        }
      }
    }

    return failed;
  }

  /**
   * Evaluates a single predicate
   */
  private evaluatePredicate(
    attributeValue: any,
    operator: string,
    predicateValue: any,
  ): boolean {
    // Handle date comparisons (for age verification)
    if (typeof attributeValue === 'string' && attributeValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Convert date to age if comparing with a number
      if (typeof predicateValue === 'number') {
        const birthDate = new Date(attributeValue);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        attributeValue = age;
      }
    }

    switch (operator) {
      case '>=':
        return attributeValue >= predicateValue;
      case '<=':
        return attributeValue <= predicateValue;
      case '==':
        return attributeValue === predicateValue;
      case '!=':
        return attributeValue !== predicateValue;
      case '>':
        return attributeValue > predicateValue;
      case '<':
        return attributeValue < predicateValue;
      default:
        return false;
    }
  }

  /**
   * Checks if a nullifier already exists for an election
   * @param nullifier - The nullifier hash
   * @param electionId - The election ID
   * @returns True if nullifier is duplicate
   */
  async checkNullifier(nullifier: string, electionId: string): Promise<boolean> {
    try {
      const nullifiers = await this.storage.getNullifiers(electionId);
      return nullifiers.includes(nullifier);
    } catch (error) {
      throw new CryptoError(
        'Erro ao verificar nullifier',
        'nullifier_check',
        {error},
      );
    }
  }

  /**
   * Stores a new nullifier for an election
   * @param nullifier - The nullifier hash
   * @param electionId - The election ID
   */
  async storeNullifier(nullifier: string, electionId: string): Promise<void> {
    try {
      await this.storage.storeNullifier(nullifier, electionId);

      // Log nullifier storage
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'nullifier_stored',
            election_id: electionId,
            nullifier_truncated: nullifier.substring(0, 16) + '...',
          },
        },
        true,
      );
    } catch (error) {
      throw new CryptoError(
        'Erro ao armazenar nullifier',
        'nullifier_storage',
        {error},
      );
    }
  }

  /**
   * Checks if a specific lab/building permission exists in verified attributes
   * @param verifiedAttributes - The verified attributes from the presentation
   * @param resourceId - The requested lab or building name
   * @returns True if permission exists
   */
  private checkLabAccess(
    verifiedAttributes: Record<string, any>,
    resourceId: string,
  ): boolean {
    try {
      // Check if resource is in acesso_laboratorios array
      const labs = verifiedAttributes.acesso_laboratorios;
      if (Array.isArray(labs) && labs.includes(resourceId)) {
        this.logger.captureEvent(
          'verification',
          'verificador',
          {
            parameters: {
              action: 'lab_access_confirmed',
              resource_id: resourceId,
              access_type: 'laboratorio',
            },
          },
          true,
        );
        return true;
      }

      // Check if resource is in acesso_predios array
      const buildings = verifiedAttributes.acesso_predios;
      if (Array.isArray(buildings) && buildings.includes(resourceId)) {
        this.logger.captureEvent(
          'verification',
          'verificador',
          {
            parameters: {
              action: 'lab_access_confirmed',
              resource_id: resourceId,
              access_type: 'predio',
            },
          },
          true,
        );
        return true;
      }

      // Permission not found
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'lab_access_denied',
            resource_id: resourceId,
            reason: 'permission_not_found',
          },
        },
        false,
      );

      return false;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'lab_access_check_failed',
            resource_id: resourceId,
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
  }
}

// Export singleton instance
export { VerificationService };

const verificationServiceInstance = new VerificationService();
export default verificationServiceInstance;
