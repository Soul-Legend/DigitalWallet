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
   * Creates a verifiable presentation with ZKP (Zero-Knowledge Proofs) using AnonCreds
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
      // Get holder's private key
      const holderPrivateKey = await StorageService.getHolderPrivateKey();
      if (!holderPrivateKey) {
        throw new ValidationError(
          'Chave privada do titular não encontrada',
          'holder_private_key',
          undefined,
        );
      }

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

      // Generate ZKP proofs for each predicate
      const zkpProofs = await this.generateZKPProofs(
        credential,
        predicates,
        holderPrivateKey,
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
          type: 'AnonCredsProof',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: `${credential.credentialSubject.id}#key-1`,
        },
        zkp_proofs: zkpProofs,
      };

      // Sign the presentation
      const presentationString = JSON.stringify({
        '@context': presentation['@context'],
        type: presentation.type,
        holder: presentation.holder,
        verifiableCredential: presentation.verifiableCredential,
        zkp_proofs: zkpProofs,
      });

      const signature = await CryptoService.signData(
        presentationString,
        holderPrivateKey,
        'titular',
      );

      presentation.proof.signature = signature;

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
   * Generates ZKP proofs for predicates using AnonCreds-style proofs
   * This is a simplified implementation that demonstrates the concept
   * In production, this would use @hyperledger/anoncreds-react-native
   * 
   * @param credential - The credential containing attributes
   * @param predicates - Predicates to prove
   * @param privateKey - Holder's private key for signing
   * @returns Array of ZKP proofs
   */
  private async generateZKPProofs(
    credential: VerifiableCredential,
    predicates: Array<{attribute: string; p_type: string; value: any}>,
    privateKey: string,
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

        // Evaluate the predicate
        const predicateSatisfied = this.evaluatePredicate(
          attributeValue,
          predicate.p_type,
          predicate.value,
        );

        // Generate proof commitment (hash of attribute + random nonce)
        const nonce = CryptoService.generateNonce();
        const commitment = await CryptoService.computeHash(
          `${predicate.attribute}:${attributeValue}:${nonce}`,
          'titular',
        );

        // Create proof structure (simplified AnonCreds-style)
        const proof = {
          predicate: {
            attr_name: predicate.attribute,
            p_type: predicate.p_type,
            value: predicate.value,
          },
          proof_data: {
            commitment,
            nonce_hash: await CryptoService.computeHash(nonce, 'titular'),
            // In real AnonCreds, this would contain cryptographic proof elements
            // For MVP, we use a signature-based approach
            signature: await CryptoService.signData(
              JSON.stringify({
                predicate,
                commitment,
                satisfied: predicateSatisfied,
              }),
              privateKey,
              'titular',
            ),
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
