// Type definitions for the application
// Will be populated in subsequent tasks

export interface StudentData {
  nome_completo: string;
  cpf: string;
  matricula: string;
  curso: string;
  status_matricula: 'Ativo' | 'Inativo';
  data_nascimento: string;
  alojamento_indigena: boolean;
  auxilio_creche: boolean;
  auxilio_moradia: boolean;
  bolsa_estudantil: boolean;
  bolsa_permanencia_mec: boolean;
  paiq: boolean;
  moradia_estudantil: boolean;
  isencao_ru: boolean;
  isencao_esporte: boolean;
  isencao_idiomas: boolean;
  acesso_laboratorios: string[];
  acesso_predios: string[];
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: StudentData & {id: string};
  proof: Proof;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  jws?: string;
  signature?: string;
  challenge?: string;
}

export interface PresentationRequest {
  type: 'PresentationExchange';
  challenge: string;
  requested_attributes: string[];
  optional_attributes?: string[];
  predicates?: Predicate[];
}

export interface Predicate {
  attribute: string;
  p_type: '>=' | '<=' | '==' | '!=';
  value: any;
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential | string;
  proof: Proof;
  disclosed_attributes?: Record<string, any>;
  zkp_proofs?: any[];
  nullifier?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  operation:
    | 'key_generation'
    | 'credential_issuance'
    | 'presentation_creation'
    | 'verification'
    | 'hash_computation'
    | 'zkp_generation'
    | 'error';
  module: 'emissor' | 'titular' | 'verificador';
  details: LogDetails;
  success: boolean;
  error?: Error;
}

export interface LogDetails {
  algorithm?: string;
  key_size?: number;
  did_method?: string;
  hash_output?: string;
  verification_result?: boolean;
  parameters?: Record<string, any>;
  stack_trace?: string;
}

// PEX (Presentation Exchange) Types
export interface PresentationExchangeRequest {
  type: 'PresentationExchange';
  version: string;
  challenge: string;
  presentation_definition: {
    id: string;
    input_descriptors: Array<{
      id: string;
      name: string;
      purpose: string;
      constraints: {
        fields: Array<{
          path: string[];
          filter?: {
            type: string;
            const?: any;
            pattern?: string;
          };
          predicate?: 'required' | 'preferred';
        }>;
        limit_disclosure?: 'required' | 'preferred';
      };
    }>;
  };
  predicates?: Array<{
    attribute: string;
    p_type: '>=' | '<=' | '==' | '!=';
    value: any;
  }>;
  election_id?: string;
  resource_id?: string;
}

// Scenario Types
export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'selective_disclosure' | 'zkp_eligibility' | 'range_proof' | 'access_control';
  requested_attributes?: string[];
  predicates?: Predicate[];
  challenge_data?: any;
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  verified_attributes?: Record<string, any>;
  predicates_satisfied?: boolean;
  nullifier_check?: 'new' | 'duplicate';
}

// Secure Storage
export interface SecureStorage {
  holder_private_key: string;
  holder_did: string;
  credentials: VerifiableCredential[];
  nullifiers: Record<string, string[]>;
  issuer_private_key: string;
  issuer_did: string;
}

// Consent Data
export interface ConsentData {
  requested_attributes: string[];
  optional_attributes: string[];
  required_attributes: string[];
  predicates?: Predicate[];
}

// ZKP Proof
export interface ZKPProof {
  proof_data: any;
  revealed_attrs: string[];
  predicates: Array<{
    attr_name: string;
    p_type: string;
    value: number;
  }>;
}
