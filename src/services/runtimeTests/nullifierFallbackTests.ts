import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import StorageService from '../StorageService';
import {generateNullifier} from '../PresentationHelpers';
import ZKProofServiceInstance from '../ZKProofService';
import type {PresentationExchangeRequest} from '../../types';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {minimalStudentData} from './fixtures';
import {assertDefined, assertEqual, assert, assertMatch} from './assertions';

/**
 * P0 — Nullifier fallback path when ZK circuit is unavailable.
 */
const nullifierFallbackTests: RuntimeTestCase[] = [
  {
    id: 'nullifier-circuit-unavailable-fails',
    name: 'Nullifier generation fails hard when circuit is unavailable',
    category: 'zkp',
    run: async () => {
      const originalIsAvailable = ZKProofServiceInstance.isCircuitAvailable;
      try {
        ZKProofServiceInstance.isCircuitAvailable = async () => false;

        await DIDService.generateHolderIdentity('key');
        await DIDService.generateIssuerIdentity('ufsc.br');

        const privateKey = await StorageService.getHolderPrivateKey();
        assertDefined(privateKey, 'privateKey');

        const electionId = `fallback_${Date.now()}`;

        // generateNullifier must throw when circuit is unavailable to protect anonymity
        let threw = false;
        try {
          await generateNullifier(privateKey!, electionId);
        } catch (error: any) {
          threw = true;
          assertMatch(error.message, /indisponível/, 'Should throw indisponibilidade error');
        }
        assert(threw, 'Expected generateNullifier to throw error');
      } finally {
        ZKProofServiceInstance.isCircuitAvailable = originalIsAvailable;
      }
    },
  },
  {
    id: 'nullifier-flow-circuit-unavailable-fails',
    name: 'Full election flow fails if nullifier circuit is unavailable',
    category: 'zkp',
    run: async () => {
      const originalIsAvailable = ZKProofServiceInstance.isCircuitAvailable;
      try {
        ZKProofServiceInstance.isCircuitAvailable = async () => false;

        const {did: holderDID} = await DIDService.generateHolderIdentity('key');
        await DIDService.generateIssuerIdentity('ufsc.br');

        const token = await CredentialService.issueCredential(
          minimalStudentData,
          holderDID,
          'anoncreds',
        );
        const parsed = await CredentialService.validateAndParseCredential(token);

        const electionId = `fallback_flow_${Date.now()}`;
        const req: PresentationExchangeRequest = {
          type: 'PresentationExchange',
          version: '1.0.0',
          challenge: 'fallback_challenge',
          presentation_definition: {
            id: 'election',
            input_descriptors: [{
              id: 'elig',
              name: 'Eligibility',
              purpose: 'Verify eligibility',
              constraints: {
                fields: [{
                  path: ['$.credentialSubject.status_matricula'],
                  predicate: 'required',
                }],
              },
            }],
          },
          election_id: electionId,
          predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
        };

        let threw = false;
        try {
          await PresentationService.createZKPPresentation(
            parsed,
            req,
            [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
          );
        } catch (error: any) {
          threw = true;
          assertMatch(error.message, /indisponível/, 'Should throw indisponibilidade error during presentation creation');
        }
        
        assert(threw, 'Expected presentation creation to fail');
      } finally {
        ZKProofServiceInstance.isCircuitAvailable = originalIsAvailable;
      }
    },
  },
];

export default nullifierFallbackTests;
