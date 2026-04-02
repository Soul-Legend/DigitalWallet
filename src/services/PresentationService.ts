import {
  PresentationExchangeRequest,
  ConsentData,
  VerifiableCredential,
  VerifiablePresentation,
} from '../types';
import type {ILogService, ICryptoService, IStorageService, IAnonCredsService} from '../types';
import {ValidationError} from './ErrorHandler';
import LogServiceInstance from './LogService';
import CryptoServiceInstance from './CryptoService';
import StorageServiceInstance from './StorageService';
import AnonCredsServiceInstance from './AnonCredsService';
import {
  evaluatePredicate,
  extractDisclosedAttributes,
  obfuscateNonDisclosedAttributes,
  generateZKPProofs,
  generateNullifier,
} from './PresentationHelpers';

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
  private readonly logger: ILogService;
  private readonly crypto: ICryptoService;
  private readonly storage: IStorageService;
  private readonly anonCredsService: IAnonCredsService;

  constructor(
    logger: ILogService = LogServiceInstance,
    crypto: ICryptoService = CryptoServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    anonCredsService: IAnonCredsService = AnonCredsServiceInstance,
  ) {
    this.logger = logger;
    this.crypto = crypto;
    this.storage = storage;
    this.anonCredsService = anonCredsService;
  }
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      const holderPrivateKey = await this.storage.getHolderPrivateKey();
      if (!holderPrivateKey) {
        throw new ValidationError(
          'Chave privada do titular não encontrada',
          'holder_private_key',
          undefined,
        );
      }

      // Log start of presentation creation
      this.logger.captureEvent(
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
      const disclosedAttributes = extractDisclosedAttributes(
        credential,
        selectedAttributes,
      );

      // Obfuscate non-disclosed attributes using hash
      const obfuscatedAttributes = await obfuscateNonDisclosedAttributes(
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

      const signature = await this.crypto.signData(
        presentationString,
        holderPrivateKey,
        'titular',
      );

      presentation.proof.jws = signature;

      // Log presentation creation success
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      const zkpProofs = await generateZKPProofs(
        credential,
        predicates,
      );

      // Generate nullifier if this is an election scenario
      let nullifier: string | undefined;
      if (pexRequest.election_id) {
        const holderPrivateKey = await this.storage.getHolderPrivateKey();
        if (holderPrivateKey) {
          nullifier = await generateNullifier(
            holderPrivateKey,
            pexRequest.election_id,
          );

          // Log nullifier generation
          this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      const schemaArtifact = await this.storage.getRawItem(
        `anoncreds_schema_${envelope.schema_id}`,
      );
      const credDefArtifact = await this.storage.getRawItem(
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
      const {linkSecret} = await this.anonCredsService.getOrCreateLinkSecret();

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

      const presRequest = this.anonCredsService.buildPredicateRequest(
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
      const anonCredsPresentation = this.anonCredsService.createPresentation(
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

      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
      this.logger.captureEvent(
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
export { PresentationService };

const presentationServiceInstance = new PresentationService();
export default presentationServiceInstance;
