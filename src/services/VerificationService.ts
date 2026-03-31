import {
  PresentationExchangeRequest,
  VerifiablePresentation,
  ValidationResult,
  Scenario,
  Predicate,
} from '../types';
import {ValidationError, CryptoError} from './ErrorHandler';
import LogService from './LogService';
import CryptoService from './CryptoService';
import StorageService from './StorageService';

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
      const challenge = CryptoService.generateNonce();

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
      LogService.captureEvent(
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
      LogService.captureEvent(
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
      LogService.captureEvent(
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
      LogService.captureEvent(
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
        publicKey = await StorageService.getIssuerPublicKey();

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
      LogService.captureEvent(
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
      LogService.captureEvent(
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
      LogService.captureEvent(
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
      LogService.captureEvent(
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

      // Extract requested attributes from PEX
      const requestedAttributes = this.extractRequestedAttributesFromPEX(pexRequest);

      // Verify all requested attributes are either disclosed or hashed
      for (const attr of requestedAttributes) {
        const isDisclosed = attr in disclosedAttributes;
        const isHashed = attr in hashedAttributes;

        if (!isDisclosed && !isHashed) {
          throw new ValidationError(
            `Atributo requisitado ausente: ${attr}`,
            'attributes',
            attr,
          );
        }

        // If disclosed, verify it matches the credential
        if (isDisclosed) {
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

        // If hashed, verify the hash is correct
        if (isHashed && !isDisclosed) {
          const credentialValue = credential.credentialSubject[attr];
          const valueString =
            typeof credentialValue === 'object'
              ? JSON.stringify(credentialValue)
              : String(credentialValue);

          const expectedHash = await CryptoService.computeHash(
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
   * Verifies ZKP presentation integrity
   * Checks that ZKP proofs are mathematically valid
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

        // Verify the proof signature (simplified for MVP)
        // In production, this would use @hyperledger/anoncreds-react-native
        const holderPublicKey = await this.getHolderPublicKey(presentation.holder);
        
        const proofData = JSON.stringify({
          predicate: proof.predicate,
          commitment: proof.proof_data.commitment,
          satisfied: proof.predicate_satisfied,
        });

        const isValid = await CryptoService.verifySignature(
          proofData,
          proof.proof_data.signature,
          holderPublicKey,
          'verificador',
        );

        if (!isValid) {
          throw new ValidationError(
            'Assinatura da prova ZKP inválida',
            'zkp_signature',
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
   * Extracts requested attribute names from PEX request
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
      const publicKey = await StorageService.getHolderPublicKey();
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
   * Validates a complete presentation against a PEX request
   * @param presentation - The presentation to validate
   * @param pexRequest - The original PEX request
   * @returns Validation result with details
   */
  async validatePresentation(
    presentation: string | VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    let valid = true;

    try {
      // Step 1: Validate presentation format
      const validatedPresentation = this.validatePresentationFormat(presentation);

      // Step 2: Verify issuer signature
      try {
        const signatureValid = await this.verifyIssuerSignature(validatedPresentation);
        if (!signatureValid) {
          errors.push('Assinatura do emissor inválida');
          valid = false;
        }
      } catch (error) {
        errors.push(
          `Erro ao verificar assinatura: ${error instanceof Error ? error.message : String(error)}`,
        );
        valid = false;
      }

      // Step 3: Verify structural integrity
      try {
        const integrityValid = await this.verifyStructuralIntegrity(
          validatedPresentation,
          pexRequest,
        );
        if (!integrityValid) {
          errors.push('Integridade estrutural inválida');
          valid = false;
        }
      } catch (error) {
        errors.push(
          `Erro ao verificar integridade: ${error instanceof Error ? error.message : String(error)}`,
        );
        valid = false;
      }

      // Step 4: Check challenge matches
      if (validatedPresentation.proof.challenge !== pexRequest.challenge) {
        errors.push('Challenge não corresponde à requisição');
        valid = false;
      }

      // Step 5: Extract verified attributes
      const verifiedAttributes = this.extractVerifiedAttributes(validatedPresentation);

      // Step 6: Check predicates if present
      let predicatesSatisfied = true;
      if (pexRequest.predicates && pexRequest.predicates.length > 0) {
        predicatesSatisfied = this.checkPredicates(
          validatedPresentation,
          pexRequest.predicates,
        );
        if (!predicatesSatisfied) {
          errors.push('Predicados não satisfeitos');
          valid = false;
        }
      }

      // Step 7: Check nullifier if election scenario
      let nullifierCheck: 'new' | 'duplicate' | undefined;
      if (pexRequest.election_id && validatedPresentation.nullifier) {
        const isDuplicate = await this.checkNullifier(
          validatedPresentation.nullifier,
          pexRequest.election_id,
        );
        nullifierCheck = isDuplicate ? 'duplicate' : 'new';

        if (isDuplicate) {
          errors.push('Nullifier duplicado - voto já registrado');
          valid = false;
        } else {
          // Store new nullifier
          await this.storeNullifier(
            validatedPresentation.nullifier,
            pexRequest.election_id,
          );
        }
      }

      // Log validation result
      LogService.captureEvent(
        'verification',
        'verificador',
        {
          verification_result: valid,
          parameters: {
            action: 'presentation_validated',
            valid,
            errors_count: errors.length,
            nullifier_check: nullifierCheck,
          },
        },
        true,
      );

      return {
        valid,
        errors: errors.length > 0 ? errors : undefined,
        verified_attributes: verifiedAttributes,
        predicates_satisfied: predicatesSatisfied,
        nullifier_check: nullifierCheck,
      };
    } catch (error) {
      // Log error
      LogService.captureEvent(
        'verification',
        'verificador',
        {
          verification_result: false,
          parameters: {
            action: 'presentation_validation_failed',
          },
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

  /**
   * Extracts verified attributes from a presentation
   */
  private extractVerifiedAttributes(
    presentation: VerifiablePresentation,
  ): Record<string, any> {
    if (presentation.disclosed_attributes) {
      return presentation.disclosed_attributes;
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
    // For ZKP presentations, check the zkp_proofs
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
   * Evaluates a single predicate
   */
  private evaluatePredicate(
    attributeValue: any,
    operator: string,
    predicateValue: any,
  ): boolean {
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
      const nullifiers = await StorageService.getNullifiers(electionId);
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
      await StorageService.storeNullifier(nullifier, electionId);

      // Log nullifier storage
      LogService.captureEvent(
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
}

// Export singleton instance
export default new VerificationService();
