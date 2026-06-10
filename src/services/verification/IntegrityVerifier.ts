import {PresentationExchangeRequest, VerifiablePresentation} from '../../types';
import type {
  IAnonCredsService,
  ICryptoService,
  ILogService,
  IStorageService,
  IZKProofService,
} from '../../types';
import {ValidationError, CryptoError} from '../ErrorHandler';
import {
  canonicalAttributeHashInput,
  base64UrlToBytes,
  bytesToBase64Url,
} from '../encoding';
import {extractRequiredAttributes, extractRequestedAttributes} from './PexHelpers';

/**
 * Cryptographic + structural integrity verification for presentations.
 *
 * Handles three formats:
 * - SD-JWT (disclosed + hashed attributes)
 * - ZKP (Groth16 over Circom circuits via mopro)
 * - Standard W3C VC (all attributes present in credentialSubject)
 *
 * Also handles AnonCreds CL-signature verification — invoked by
 * SignatureVerifier when the proof type is `CLSignature2023`.
 */
export class IntegrityVerifier {
  constructor(
    private readonly logger: ILogService,
    private readonly crypto: ICryptoService,
    private readonly storage: IStorageService,
    private readonly zkProof: IZKProofService,
    private readonly anonCredsService: IAnonCredsService,
  ) {}

  async verify(
    presentation: VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<boolean> {
    try {
      let credential: any;
      if (typeof presentation.verifiableCredential === 'string') {
        if (presentation.verifiableCredential.includes('~')) {
          credential = presentation.verifiableCredential;
        } else {
          try {
            credential = JSON.parse(presentation.verifiableCredential);
          } catch {
            credential = presentation.verifiableCredential;
          }
        }
      } else {
        credential = presentation.verifiableCredential;
      }

      // Se for AnonCreds, a integridade estrutural e os predicados já são validados
      // na etapa de assinatura (que delega para o motor AnonCreds em Rust).
      if (presentation.proof?.type === 'CLSignature2023') {
        this.logger.captureEvent(
          'verification',
          'verificador',
          {
            parameters: {
              action: 'structural_integrity_verified',
              presentation_type: 'AnonCreds',
              integrity_valid: true,
            },
          },
          true,
        );
        return true;
      }

      const isSDJWT = (typeof credential === 'string' && credential.includes('~')) || 
                      (presentation.disclosed_attributes !== undefined && presentation.zkp_proof === undefined);
      const isZKP = presentation.zkp_proofs !== undefined;

      let valid: boolean;
      if (isSDJWT) {
        valid = await this.verifySDJWT(presentation, credential, pexRequest);
      } else if (isZKP) {
        valid = await this.verifyZKP(presentation);
      } else {
        valid = this.verifyStandard(credential, pexRequest);
      }

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'structural_integrity_verified',
            presentation_type: isSDJWT ? 'SD-JWT' : isZKP ? 'ZKP' : 'Standard',
            integrity_valid: valid,
          },
        },
        true,
      );
      return valid;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {parameters: {action: 'structural_integrity_verification_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  // -------------------------------------------------------------------
  // SD-JWT
  // -------------------------------------------------------------------

  private async verifySDJWT(
    presentation: VerifiablePresentation,
    credential: any,
    pexRequest: PresentationExchangeRequest,
  ): Promise<boolean> {
    try {
      if (typeof credential !== 'string' || !credential.includes('~')) {
        throw new ValidationError('Formato SD-JWT inválido ou ausente', 'credential', credential);
      }
      
      const parts = credential.split('~');
      const token = parts[0];
      const disclosures = parts.slice(1);
      
      const jwtParts = token.split('.');
      if (jwtParts.length !== 3) {
        throw new ValidationError('JWT inválido na credencial SD-JWT', 'jwt', token);
      }
      
      // Extract Payload and Verify Issuer Signature
      const payloadBytes = base64UrlToBytes(jwtParts[1]);
      const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
      const vc = payload.vc;
      
      const issuerPublicKey = await this.storage.getIssuerPublicKey();
      if (!issuerPublicKey) {
        throw new CryptoError('Chave pública do emissor não encontrada', 'verification', {});
      }
      
      const dataToVerify = new TextEncoder().encode(`${jwtParts[0]}.${jwtParts[1]}`);
      
      const sigBytes = base64UrlToBytes(jwtParts[2]);
      const sigHex = Array.from(sigBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
        
      const validSig = await this.crypto.verifySignature(dataToVerify, sigHex, issuerPublicKey, 'verificador');
      if (!validSig) {
        throw new ValidationError('Assinatura do emissor inválida no SD-JWT', 'signature', {});
      }
      
      const _sd = vc?.credentialSubject?._sd || [];
      const disclosed: Record<string, any> = {};
      
      for (const disclosureB64 of disclosures) {
        if (!disclosureB64) continue;
        const disclosureBytes = base64UrlToBytes(disclosureB64);
        const disclosureStr = new TextDecoder().decode(disclosureBytes);
        
        const hashHex = await this.crypto.computeHash(disclosureStr, 'verificador');
        const hashBytes = new Uint8Array(hashHex.length / 2);
        for (let i = 0; i < hashHex.length; i += 2) {
             hashBytes[i / 2] = parseInt(hashHex.substring(i, i + 2), 16);
        }
        const hashB64 = bytesToBase64Url(hashBytes);
        
        if (!_sd.includes(hashB64)) {
          throw new ValidationError(`Hash da disclosure não encontrado no _sd: ${hashB64}`, 'disclosure', disclosureStr);
        }
        
        const [, key, value] = JSON.parse(disclosureStr);
        disclosed[key] = value;
      }
      
      const required = extractRequiredAttributes(pexRequest);
      for (const attr of required) {
        if (!(attr in disclosed) && !(attr in vc.credentialSubject)) {
          throw new ValidationError(
            `Atributo requisitado ausente: ${attr}`,
            'attributes',
            attr,
          );
        }
      }

      await this.validatePEXFilters(pexRequest, disclosed);

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new CryptoError('Erro ao verificar integridade SD-JWT', 'verification', {error});
    }
  }

  private async validatePEXFilters(
    pexRequest: PresentationExchangeRequest,
    disclosed: Record<string, any>,
  ): Promise<void> {
    for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
      for (const field of descriptor.constraints.fields) {
        if (!field.filter) {
          continue;
        }
        const match = field.path[0].match(/\.([^.]+)$/);
        if (!match) {
          continue;
        }
        const attrName = match[1];
        const attrValue = disclosed[attrName];
        if (attrValue === undefined) {
          continue;
        }

        if (field.filter.const !== undefined && attrValue !== field.filter.const) {
          throw new ValidationError(
            `Atributo ${attrName} não corresponde ao valor esperado. Esperado: ${field.filter.const}, Recebido: ${attrValue}`,
            attrName,
            {expected: field.filter.const, actual: attrValue},
          );
        }

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

  // -------------------------------------------------------------------
  // ZKP (Groth16 over Circom)
  // -------------------------------------------------------------------

  private async verifyZKP(presentation: VerifiablePresentation): Promise<boolean> {
    try {
      const proofs = presentation.zkp_proofs || [];
      if (proofs.length === 0) {
        throw new ValidationError(
          'Nenhuma prova ZKP encontrada na apresentação',
          'zkp_proofs',
          undefined,
        );
      }

      for (const proof of proofs) {
        if (!proof.predicate || !proof.proof_data) {
          throw new ValidationError('Estrutura de prova ZKP inválida', 'zkp_proof', proof);
        }
        if (!proof.predicate_satisfied) {
          throw new ValidationError(
            `Predicado não satisfeito: ${proof.predicate.attr_name} ${proof.predicate.p_type} ${proof.predicate.value}`,
            'predicate',
            proof.predicate,
          );
        }

        if (!proof.proof_data.circom_proof || !proof.proof_data.public_inputs) {
          // SECURITY: ZKP without Groth16 data has no cryptographic evidence.
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
            `ZKP proof for predicate '${proof.predicate.attr_name}' is missing Groth16 proof data ` +
              '(circom_proof and public_inputs). Cannot verify without cryptographic proof.',
            'zkp_proof_data',
            proof,
          );
        }

        const circuitName = this.getCircuitName(proof.predicate);
        try {
          const isValid = await this.zkProof.verifyProof(circuitName, {
            proof: proof.proof_data.circom_proof,
            inputs: proof.proof_data.public_inputs,
          });
          if (!isValid) {
            throw new ValidationError(
              `Prova ZKP Groth16 inválida para predicado: ${proof.predicate.attr_name}`,
              'zkp_proof',
              proof.predicate,
            );
          }
          
          // HARD BINDING FIX: Garantir que a prova submetida contém a constante do Verificador
          if (proof.predicate.value !== undefined && circuitName === 'age_range') {
             const expectedValueStr = String(proof.predicate.value);
             if (!proof.proof_data.public_inputs.includes(expectedValueStr)) {
               throw new ValidationError(
                 `O ZKP não corresponde ao limite exigido pelo Verificador. O public input não contém o threshold ${expectedValueStr}.`,
                 'zkp_public_inputs',
                 {expected: expectedValueStr, actual: proof.proof_data.public_inputs}
               );
             }
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
          if (
            verifyError instanceof CryptoError &&
            String(verifyError.message).includes('zkey não encontrado')
          ) {
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
          }
          throw verifyError;
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new CryptoError('Erro ao verificar integridade ZKP', 'verification', {error});
    }
  }

  private getCircuitName(predicate: {attr_name: string; p_type: string; value: any}): string {
    if (predicate.attr_name === 'data_nascimento') {
      return 'age_range';
    }
    if (predicate.p_type === '==' || predicate.p_type === '!=') {
      return 'status_check';
    }
    return 'age_range';
  }

  // -------------------------------------------------------------------
  // Standard W3C VC
  // -------------------------------------------------------------------

  private verifyStandard(
    credential: any,
    pexRequest: PresentationExchangeRequest,
  ): boolean {
    const requested = extractRequestedAttributes(pexRequest);
    for (const attr of requested) {
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

  // -------------------------------------------------------------------
  // AnonCreds CL-signature (delegate target for SignatureVerifier)
  // -------------------------------------------------------------------

  async verifyAnonCredsPresentation(
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

      const credToken =
        typeof presentation.verifiableCredential === 'string'
          ? JSON.parse(presentation.verifiableCredential)
          : presentation.verifiableCredential;

      const schemaId = credToken.schema_id || credToken.issuer;
      const credDefId = credToken.cred_def_id || credToken.issuer;

      const schemaRaw = await this.storage.getRawItem(`anoncreds_schema_${schemaId}`);
      const credDefRaw = await this.storage.getRawItem(`anoncreds_creddef_${credDefId}`);

      if (!schemaRaw || !credDefRaw) {
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

      const presRequestJson = await this.rebuildPresentationRequest(zkpProof, presentation.proof?.challenge || 'default_challenge');

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

  private async rebuildPresentationRequest(
    zkpProof: NonNullable<VerifiablePresentation['zkp_proof']>,
    challenge: string,
  ): Promise<Record<string, unknown>> {
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

    const challengeHash = await this.crypto.computeHash(challenge, 'verificador');
    const nonce = BigInt('0x' + challengeHash.slice(0, 20)).toString(10);

    return {
      name: 'anoncreds_presentation',
      version: '1.0',
      nonce,
      requested_attributes: requestedAttributes,
      requested_predicates: requestedPredicates,
    };
  }
}
