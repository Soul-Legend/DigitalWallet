import {
  PresentationExchangeRequest,
  ConsentData,
  VerifiableCredential,
  VerifiablePresentation,
} from '../types';
import {ValidationError} from './ErrorHandler';
import LogService from './LogService';
import CryptoService from './CryptoService';
import StorageService from './StorageService';
import ZKProofService from './ZKProofService';
import AnonCredsService from './AnonCredsService';
import type {CircomProofResult} from 'mopro-ffi';

/**
 * PresentationService - Handles presentation request processing and generation
 *
 * This service is responsible for:
 * - Parsing and validating PEX (Presentation Exchange) requests
 * - Extracting requested attributes from PEX requests
 * - Identifying required vs optional attributes
 * - Generating consent data for user approval
 * - Creating verifiable presentations (SD-JWT and ZKP)
 */
class PresentationService {
  /**
   * Validates the format of a PEX request
   * @param request - The PEX request object or JSON string
   * @returns Parsed and validated PEX request
   */
  validatePEXFormat(
    request: string | PresentationExchangeRequest,
  ): PresentationExchangeRequest {
    try {
      // Parse if string
      let pexRequest: PresentationExchangeRequest;
      if (typeof request === 'string') {
        try {
          pexRequest = JSON.parse(request);
        } catch (parseError) {
          throw new ValidationError(
            'Formato JSON inválido na requisição PEX',
            'pex_request',
            request.substring(0, 50),
          );
        }
      } else {
        pexRequest = request;
      }

      // Validate required fields
      if (pexRequest.type !== 'PresentationExchange') {
        throw new ValidationError(
          'Tipo de requisição inválido. Esperado: PresentationExchange',
          'type',
          pexRequest.type,
        );
      }

      if (!pexRequest.version) {
        throw new ValidationError(
          'Campo version ausente na requisição PEX',
          'version',
          undefined,
        );
      }

      if (!pexRequest.challenge || typeof pexRequest.challenge !== 'string') {
        throw new ValidationError(
          'Campo challenge ausente ou inválido',
          'challenge',
          pexRequest.challenge,
        );
      }

      if (!pexRequest.presentation_definition) {
        throw new ValidationError(
          'Campo presentation_definition ausente',
          'presentation_definition',
          undefined,
        );
      }

      // Validate presentation_definition structure
      const def = pexRequest.presentation_definition;
      if (!def.id || !def.input_descriptors || !Array.isArray(def.input_descriptors)) {
        throw new ValidationError(
          'Estrutura de presentation_definition inválida',
          'presentation_definition',
          def,
        );
      }

      // Log successful validation
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'pex_validation_success',
            definition_id: def.id,
            descriptors_count: def.input_descriptors.length,
          },
        },
        true,
      );

      return pexRequest;
    } catch (error) {
      // Log validation error
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'pex_validation_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Erro ao validar formato PEX',
        'pex_request',
        request,
      );
    }
  }

  /**
   * Extracts requested attributes from a PEX request
   * @param pexRequest - Validated PEX request
   * @returns Object containing required and optional attributes
   */
  extractRequestedAttributes(pexRequest: PresentationExchangeRequest): {
    required: string[];
    optional: string[];
    all: string[];
  } {
    const required: string[] = [];
    const optional: string[] = [];

    try {
      const descriptors = pexRequest.presentation_definition.input_descriptors;

      for (const descriptor of descriptors) {
        if (!descriptor.constraints || !descriptor.constraints.fields) {
          continue;
        }

        for (const field of descriptor.constraints.fields) {
          // Extract attribute name from JSONPath
          const attributeName = this.extractAttributeFromPath(field.path);

          if (attributeName) {
            // Determine if required or optional
            const isRequired = field.predicate === 'required' || 
                             field.predicate === undefined;

            if (isRequired && !required.includes(attributeName)) {
              required.push(attributeName);
            } else if (!isRequired && !optional.includes(attributeName)) {
              optional.push(attributeName);
            }
          }
        }
      }

      const all = [...required, ...optional];

      // Log extraction
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'attributes_extracted',
            required_count: required.length,
            optional_count: optional.length,
            required_attributes: required,
            optional_attributes: optional,
          },
        },
        true,
      );

      return {required, optional, all};
    } catch (error) {
      // Log error
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'attribute_extraction_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw new ValidationError(
        'Erro ao extrair atributos da requisição PEX',
        'presentation_definition',
        pexRequest.presentation_definition,
      );
    }
  }

  /**
   * Extracts attribute name from JSONPath expression
   * @param paths - Array of JSONPath expressions
   * @returns Attribute name or null
   */
  private extractAttributeFromPath(paths: string[]): string | null {
    if (!paths || paths.length === 0) {
      return null;
    }

    // Take the first path
    const path = paths[0];

    // Common patterns:
    // $.credentialSubject.nome_completo
    // $['credentialSubject']['nome_completo']
    // $.nome_completo

    // Extract the last segment
    const segments = path.split(/[.\[\]'"]/).filter(s => s && s !== '$' && s !== 'credentialSubject');
    
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }

    return null;
  }

  /**
   * Processes a PEX request and generates consent data
   * @param pexRequest - The PEX request (string or object)
   * @param credential - The credential to use for the presentation
   * @returns Consent data for user approval
   */
  async processPEXRequest(
    pexRequest: string | PresentationExchangeRequest,
    credential: VerifiableCredential,
  ): Promise<ConsentData> {
    try {
      // Validate PEX format
      const validatedRequest = this.validatePEXFormat(pexRequest);

      // Extract requested attributes
      const {required, optional, all} = this.extractRequestedAttributes(validatedRequest);

      // Extract predicates if any
      const predicates = validatedRequest.predicates || [];

      // Create consent data
      const consentData: ConsentData = {
        requested_attributes: all,
        optional_attributes: optional,
        required_attributes: required,
        predicates: predicates.length > 0 ? predicates : undefined,
      };

      // Log consent data generation
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'consent_data_generated',
            required_count: required.length,
            optional_count: optional.length,
            predicates_count: predicates.length,
          },
        },
        true,
      );

      return consentData;
    } catch (error) {
      // Log error
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'pex_processing_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Creates a verifiable presentation from a credential with SD-JWT
   * @param credential - The credential to present
   * @param pexRequest - The PEX request
   * @param selectedAttributes - Attributes selected by the user
   * @returns Verifiable presentation with selective disclosure
   */
  async createPresentation(
    credential: VerifiableCredential,
    pexRequest: PresentationExchangeRequest,
    selectedAttributes: string[],
  ): Promise<VerifiablePresentation> {
    try {
      // Get holder's private key
      const holderPrivateKey = await StorageService.getHolderPrivateKey();
      if (!holderPrivateKey) {
        throw new ValidationError(
          'Chave privada do titular não encontrada',
          'holder_private_key',
          undefined,
        );
      }

      // Log start of presentation creation
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_creation_started',
            selected_attributes_count: selectedAttributes.length,
          },
        },
        true,
      );

      // Extract disclosed attributes
      const disclosedAttributes = this.extractDisclosedAttributes(
        credential,
        selectedAttributes,
      );

      // Obfuscate non-disclosed attributes using hash
      const obfuscatedAttributes = await this.obfuscateNonDisclosedAttributes(
        credential,
        selectedAttributes,
      );

      // Create basic presentation structure
      const presentation: VerifiablePresentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/presentation-exchange/submission/v1',
        ],
        type: ['VerifiablePresentation', 'PresentationSubmission'],
        holder: credential.credentialSubject.id,
        verifiableCredential: credential,
        proof: {
          type: 'JsonWebSignature2020',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: `${credential.credentialSubject.id}#key-1`,
        },
        disclosed_attributes: disclosedAttributes,
      };

      // Add obfuscated attributes to presentation (for SD-JWT)
      (presentation as any).hashed_attributes = obfuscatedAttributes;

      // Sign the presentation
      const presentationString = JSON.stringify({
        '@context': presentation['@context'],
        type: presentation.type,
        holder: presentation.holder,
        verifiableCredential: presentation.verifiableCredential,
        disclosed_attributes: presentation.disclosed_attributes,
        hashed_attributes: obfuscatedAttributes,
      });

      const signature = await CryptoService.signData(
        presentationString,
        holderPrivateKey,
        'titular',
      );

      presentation.proof.jws = signature;

      // Log presentation creation success
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_created',
            disclosed_count: selectedAttributes.length,
            obfuscated_count: Object.keys(obfuscatedAttributes).length,
            holder: credential.credentialSubject.id,
          },
        },
        true,
      );

      return presentation;
    } catch (error) {
      // Log error
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_creation_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Extracts disclosed attributes from credential
   */
  private extractDisclosedAttributes(
    credential: VerifiableCredential,
    selectedAttributes: string[],
  ): Record<string, any> {
    const disclosed: Record<string, any> = {};

    for (const attr of selectedAttributes) {
      if (attr in credential.credentialSubject) {
        disclosed[attr] = (credential.credentialSubject as any)[attr];
      }
    }

    return disclosed;
  }

  /**
   * Obfuscates non-disclosed attributes using cryptographic hash
   * Implements SD-JWT selective disclosure by hashing attributes not revealed
   * @param credential - The credential containing all attributes
   * @param selectedAttributes - Attributes that will be disclosed (not hashed)
   * @returns Object mapping attribute names to their hash values
   */
  private async obfuscateNonDisclosedAttributes(
    credential: VerifiableCredential,
    selectedAttributes: string[],
  ): Promise<Record<string, string>> {
    const obfuscated: Record<string, string> = {};

    // Get all attributes from credential subject (excluding 'id')
    const allAttributes = Object.keys(credential.credentialSubject).filter(
      key => key !== 'id',
    );

    // Hash attributes that are NOT in selectedAttributes
    for (const attr of allAttributes) {
      if (!selectedAttributes.includes(attr)) {
        const value = (credential.credentialSubject as any)[attr];
        
        // Convert value to string for hashing
        const valueString = typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value);
        
        // Compute hash of attribute name + value (salt with attribute name for security)
        const hashInput = `${attr}:${valueString}`;
        const hash = await CryptoService.computeHash(hashInput, 'titular');
        
        obfuscated[attr] = hash;

        // Log obfuscation
        LogService.captureEvent(
          'hash_computation',
          'titular',
          {
            parameters: {
              action: 'attribute_obfuscated',
              attribute: attr,
              hash_truncated: hash.substring(0, 16) + '...',
            },
          },
          true,
        );
      }
    }

    return obfuscated;
  }

  /**
   * Creates a verifiable presentation with ZKP (Zero-Knowledge Proofs) using mopro/Circom
   * @param credential - The credential to present
   * @param pexRequest - The PEX request
   * @param predicates - Predicates to prove (e.g., age >= 18, status == 'Ativo')
   * @returns Verifiable presentation with ZKP proofs
   */
  async createZKPPresentation(
    credential: VerifiableCredential,
    pexRequest: PresentationExchangeRequest,
    predicates: Array<{attribute: string; p_type: string; value: any}>,
  ): Promise<VerifiablePresentation> {
    try {
      // Log start of ZKP generation
      LogService.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'zkp_generation_started',
            predicates_count: predicates.length,
            predicates: predicates.map(p => `${p.attribute} ${p.p_type} ${p.value}`),
          },
        },
        true,
      );

      // Generate mopro ZKP proofs for each predicate
      const zkpProofs = await this.generateZKPProofs(
        credential,
        predicates,
      );

      // Generate nullifier if this is an election scenario
      let nullifier: string | undefined;
      if (pexRequest.election_id) {
        const holderPrivateKey = await StorageService.getHolderPrivateKey();
        if (holderPrivateKey) {
          nullifier = await this.generateNullifier(
            holderPrivateKey,
            pexRequest.election_id,
          );

          // Log nullifier generation
          LogService.captureEvent(
            'hash_computation',
            'titular',
            {
              parameters: {
                action: 'nullifier_generated',
                election_id: pexRequest.election_id,
                nullifier_truncated: nullifier.substring(0, 16) + '...',
              },
            },
            true,
          );
        }
      }

      // Create basic presentation structure
      // For ZKP, we don't include the full credential to preserve privacy
      const presentation: VerifiablePresentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/presentation-exchange/submission/v1',
        ],
        type: ['VerifiablePresentation', 'PresentationSubmission'],
        holder: credential.credentialSubject.id,
        verifiableCredential: {
          '@context': credential['@context'],
          type: credential.type,
          issuer: credential.issuer,
          issuanceDate: credential.issuanceDate,
          credentialSubject: {
            id: credential.credentialSubject.id,
          },
          proof: credential.proof,
        } as any,
        proof: {
          type: 'Groth16Proof',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: `${credential.credentialSubject.id}#key-1`,
        },
        zkp_proof: {
          proof_data: {},
          revealed_attrs: [],
          predicates: zkpProofs.map(p => ({
            attr_name: p.predicate.attr_name,
            p_type: p.predicate.p_type,
            value: p.predicate.value,
            satisfied: p.predicate_satisfied,
          })),
        },
        zkp_proofs: zkpProofs,
        nullifier,
      };

      // Log ZKP generation success
      LogService.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'zkp_generated',
            proofs_count: zkpProofs.length,
            holder: credential.credentialSubject.id,
          },
        },
        true,
      );

      return presentation;
    } catch (error) {
      // Log error
      LogService.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'zkp_generation_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Generates ZKP proofs for predicates using mopro/Circom Groth16 proofs
   * 
   * Each predicate is mapped to a corresponding Circom circuit:
   * - Age/date predicates → age_range circuit
   * - Status/equality predicates → status_check circuit
   * 
   * @param credential - The credential containing attributes
   * @param predicates - Predicates to prove
   * @returns Array of ZKP proofs with mopro CircomProofResult data
   */
  private async generateZKPProofs(
    credential: VerifiableCredential,
    predicates: Array<{attribute: string; p_type: string; value: any}>,
  ): Promise<any[]> {
    const proofs: any[] = [];

    for (const predicate of predicates) {
      try {
        // Get the attribute value from credential
        const attributeValue = (credential.credentialSubject as any)[predicate.attribute];

        if (attributeValue === undefined) {
          throw new ValidationError(
            `Atributo ${predicate.attribute} não encontrado na credencial`,
            predicate.attribute,
            undefined,
          );
        }

        // Evaluate the predicate locally (for the satisfied flag)
        const predicateSatisfied = this.evaluatePredicate(
          attributeValue,
          predicate.p_type,
          predicate.value,
        );

        // Generate the actual ZK proof using mopro based on predicate type
        let circomProofResult: CircomProofResult;

        if (this.isDateAttribute(attributeValue) && typeof predicate.value === 'number') {
          // Age range proof - proves age >= threshold without revealing birthdate
          circomProofResult = await ZKProofService.generateAgeRangeProof(
            attributeValue,
            predicate.value,
          );
        } else if (predicate.p_type === '==' || predicate.p_type === '!=') {
          // Status/equality check proof
          circomProofResult = await ZKProofService.generateStatusCheckProof(
            String(attributeValue),
            String(predicate.value),
          );
        } else {
          // For other predicate types, use age_range circuit with numeric values
          circomProofResult = await ZKProofService.generateAgeRangeProof(
            attributeValue,
            predicate.value,
          );
        }

        // Create proof structure with mopro proof data
        const proof = {
          predicate: {
            attr_name: predicate.attribute,
            p_type: predicate.p_type,
            value: predicate.value,
          },
          proof_data: {
            circom_proof: circomProofResult.proof,
            public_inputs: circomProofResult.inputs,
          },
          revealed_attrs: [], // ZKP doesn't reveal actual values
          predicate_satisfied: predicateSatisfied,
        };

        proofs.push(proof);

        // Log proof generation
        LogService.captureEvent(
          'zkp_generation',
          'titular',
          {
            parameters: {
              action: 'predicate_proof_generated',
              attribute: predicate.attribute,
              p_type: predicate.p_type,
              satisfied: predicateSatisfied,
              proof_system: 'groth16',
            },
          },
          true,
        );
      } catch (error) {
        // Log error for this specific predicate
        LogService.captureEvent(
          'zkp_generation',
          'titular',
          {
            parameters: {
              action: 'predicate_proof_failed',
              attribute: predicate.attribute,
            },
          },
          false,
          error instanceof Error ? error : new Error(String(error)),
        );

        throw error;
      }
    }

    return proofs;
  }

  /**
   * Checks if an attribute value is a date string (YYYY-MM-DD format)
   */
  private isDateAttribute(value: any): boolean {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  /**
   * Evaluates a predicate against an attribute value
   * @param attributeValue - The actual value from the credential
   * @param operator - Comparison operator (>=, <=, ==, !=)
   * @param predicateValue - The value to compare against
   * @returns True if predicate is satisfied
   */
  private evaluatePredicate(
    attributeValue: any,
    operator: string,
    predicateValue: any,
  ): boolean {
    // Convert values for comparison
    let attrVal = attributeValue;
    let predVal = predicateValue;

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
        attrVal = age;
      }
    }

    // Perform comparison based on operator
    switch (operator) {
      case '>=':
        return attrVal >= predVal;
      case '<=':
        return attrVal <= predVal;
      case '==':
        return attrVal === predVal;
      case '!=':
        return attrVal !== predVal;
      case '>':
        return attrVal > predVal;
      case '<':
        return attrVal < predVal;
      default:
        throw new ValidationError(
          `Operador inválido: ${operator}`,
          'operator',
          operator,
        );
    }
  }

  /**
   * Generates a deterministic nullifier for election scenarios using mopro ZK proof
   * 
   * Uses a Circom circuit to compute: nullifier = hash(holder_secret, election_id)
   * inside the ZK circuit, ensuring the nullifier is deterministic but unlinkable.
   * 
   * Falls back to SHA-256 hash if the nullifier circuit is not available.
   * 
   * @param holderPrivateKey - The holder's private key (used as secret input)
   * @param electionId - The unique election identifier
   * @returns Deterministic nullifier string
   */
  private async generateNullifier(
    holderPrivateKey: string,
    electionId: string,
  ): Promise<string> {
    try {
      // Try to use mopro ZK nullifier circuit
      const isAvailable = await ZKProofService.isCircuitAvailable('nullifier');

      if (isAvailable) {
        const proofResult = await ZKProofService.generateNullifierProof(
          holderPrivateKey,
          electionId,
        );

        const nullifier = ZKProofService.extractNullifier(proofResult);
        if (nullifier) {
          return nullifier;
        }
      }

      // Fallback: compute deterministic hash if circuit not available
      const nullifier = await CryptoService.computeCompositeHash(
        [holderPrivateKey, electionId],
        'titular',
      );

      return nullifier;
    } catch (error) {
      LogService.captureEvent(
        'hash_computation',
        'titular',
        {
          parameters: {
            action: 'nullifier_generation_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Creates an AnonCreds presentation with CL-signature based ZKP.
   *
   * This provides native AnonCreds selective disclosure and predicate proofs
   * using the @hyperledger/anoncreds-react-native library.  Every presentation
   * created this way is cryptographically unlinkable (desvinculabilidade).
   *
   * @param credentialToken - The raw AnonCreds credential token (JSON envelope)
   * @param pexRequest      - PEX request describing what to reveal / prove
   * @param revealedAttrs   - Attribute names the holder consents to disclose
   * @param predicates      - Predicates to prove (e.g., age >= 18)
   */
  async createAnonCredsPresentation(
    credentialToken: string,
    pexRequest: PresentationExchangeRequest,
    revealedAttrs: string[],
    predicates: Array<{attribute: string; p_type: '>=' | '<=' | '>' | '<'; value: number}>,
  ): Promise<VerifiablePresentation> {
    try {
      const envelope = JSON.parse(credentialToken);
      if (envelope.format !== 'anoncreds' || !envelope.credential) {
        throw new ValidationError(
          'Token is not an AnonCreds envelope',
          'format',
          envelope.format,
        );
      }

      // Recover artifact references from storage
      const schemaArtifact = await StorageService.getRawItem(
        `anoncreds_schema_${envelope.schema_id}`,
      );
      const credDefArtifact = await StorageService.getRawItem(
        `anoncreds_creddef_${envelope.cred_def_id}`,
      );

      if (!schemaArtifact || !credDefArtifact) {
        throw new ValidationError(
          'AnonCreds schema or cred def not found in storage',
          'artifacts',
          undefined,
        );
      }

      const schema = JSON.parse(schemaArtifact);
      const credDef = JSON.parse(credDefArtifact);

      // Holder's link secret
      const {linkSecret} = await AnonCredsService.getOrCreateLinkSecret();

      // Build AnonCreds presentation request
      const nonce = String(Date.now());
      const requestedAttributes: Record<string, {name: string}> = {};
      revealedAttrs.forEach((attr, i) => {
        requestedAttributes[`attr_${i}`] = {name: attr};
      });

      const requestedPredicates: Record<
        string,
        {name: string; p_type: '>=' | '<=' | '>' | '<'; p_value: number}
      > = {};
      predicates.forEach((pred, i) => {
        requestedPredicates[`pred_${i}`] = {
          name: pred.attribute,
          p_type: pred.p_type,
          p_value: pred.value,
        };
      });

      const presRequest = AnonCredsService.buildPredicateRequest(
        pexRequest.presentation_definition?.id || 'presentation',
        nonce,
        requestedAttributes,
        requestedPredicates,
      );

      // Build credentialsProve entries: reveal all requested attributes + predicates
      const credentialsProve: Array<{
        entryIndex: number;
        referent: string;
        isPredicate: boolean;
        reveal: boolean;
      }> = [];

      revealedAttrs.forEach((_attr, i) => {
        credentialsProve.push({
          entryIndex: 0,
          referent: `attr_${i}`,
          isPredicate: false,
          reveal: true,
        });
      });
      predicates.forEach((_pred, i) => {
        credentialsProve.push({
          entryIndex: 0,
          referent: `pred_${i}`,
          isPredicate: true,
          reveal: false,
        });
      });

      // Create the AnonCreds presentation (CL-signature ZKP)
      const anonCredsPresentation = AnonCredsService.createPresentation(
        presRequest,
        [{credential: envelope.credential}],
        credentialsProve,
        linkSecret,
        {[envelope.schema_id]: schema.schema},
        {[envelope.cred_def_id]: credDef.credDef},
      );

      // Wrap in VerifiablePresentation envelope
      const presentation: VerifiablePresentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/presentation-exchange/submission/v1',
        ],
        type: ['VerifiablePresentation', 'AnonCredsPresentationSubmission'],
        holder: envelope.credential?.values?.id?.raw || '',
        verifiableCredential: credentialToken,
        proof: {
          type: 'CLSignature2023',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: envelope.cred_def_id,
        },
        disclosed_attributes: {},
        zkp_proof: {
          proof_data: anonCredsPresentation,
          revealed_attrs: revealedAttrs,
          predicates: predicates.map(p => ({
            attr_name: p.attribute,
            p_type: p.p_type,
            value: p.value,
            satisfied: true,
          })),
        },
      };

      // Extract revealed values from the AnonCreds presentation
      const revealedValues =
        (anonCredsPresentation as any)?.requested_proof?.revealed_attrs || {};
      for (const [_referent, data] of Object.entries(revealedValues)) {
        const attrData = data as {raw: string};
        if (attrData?.raw) {
          presentation.disclosed_attributes =
            presentation.disclosed_attributes || {};
          presentation.disclosed_attributes[_referent] = attrData.raw;
        }
      }

      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          algorithm: 'CL',
          parameters: {
            action: 'anoncreds_presentation_created',
            revealed_count: revealedAttrs.length,
            predicates_count: predicates.length,
          },
        },
        true,
      );

      return presentation;
    } catch (error) {
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'anoncreds_presentation_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Copies presentation to clipboard
   * @param presentation - The presentation to copy
   */
  async copyPresentationToClipboard(
    presentation: VerifiablePresentation,
  ): Promise<void> {
    try {
      const presentationString = JSON.stringify(presentation, null, 2);
      
      // In a real React Native app, we would use Clipboard API
      // For now, we just log the action
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_copied_to_clipboard',
            presentation_size: presentationString.length,
          },
        },
        true,
      );

      // TODO: Implement actual clipboard copy when integrated with React Native
      // await Clipboard.setString(presentationString);
    } catch (error) {
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'clipboard_copy_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }
}

// Export singleton instance
export default new PresentationService();
