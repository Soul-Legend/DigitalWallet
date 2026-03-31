# Documentação de APIs dos Serviços

## Visão Geral

Esta documentação descreve as APIs públicas de todos os serviços da aplicação. Cada serviço é uma classe singleton que encapsula operações específicas.

## Índice

- [CryptoService](#cryptoservice)
- [DIDService](#didservice)
- [CredentialService](#credentialservice)
- [PresentationService](#presentationservice)
- [VerificationService](#verificationservice)
- [StorageService](#storageservice)
- [LogService](#logservice)
- [ErrorHandler](#errorhandler)

---

## CryptoService

Serviço responsável por operações criptográficas de baixo nível.

### Métodos

#### `computeHash(data: string, algorithm?: 'SHA-256' | 'SHA-512'): Promise<string>`

Computa o hash criptográfico de uma string.

**Parâmetros**:
- `data`: String a ser hasheada
- `algorithm`: Algoritmo de hash (padrão: 'SHA-256')

**Retorna**: Hash em formato hexadecimal

**Exemplo**:
```typescript
const hash = await CryptoService.computeHash('Hello World');
// Retorna: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
```

**Throws**: `CryptoError` se a operação falhar

---

#### `signData(data: string, privateKeyHex: string): Promise<string>`

Assina dados usando uma chave privada Ed25519.

**Parâmetros**:
- `data`: Dados a serem assinados
- `privateKeyHex`: Chave privada em formato hexadecimal

**Retorna**: Assinatura em formato hexadecimal

**Exemplo**:
```typescript
const signature = await CryptoService.signData(
  'message',
  privateKey
);
```

**Throws**: `CryptoError` se a assinatura falhar

---

#### `verifySignature(data: string, signatureHex: string, publicKeyHex: string): Promise<boolean>`

Verifica uma assinatura digital.

**Parâmetros**:
- `data`: Dados originais
- `signatureHex`: Assinatura em hexadecimal
- `publicKeyHex`: Chave pública em hexadecimal

**Retorna**: `true` se válida, `false` caso contrário

**Exemplo**:
```typescript
const isValid = await CryptoService.verifySignature(
  'message',
  signature,
  publicKey
);
```

---

#### `computeCompositeHash(parts: string[]): Promise<string>`

Computa hash de múltiplas partes concatenadas.

**Parâmetros**:
- `parts`: Array de strings a serem hasheadas juntas

**Retorna**: Hash composto em hexadecimal

**Exemplo**:
```typescript
const hash = await CryptoService.computeCompositeHash([
  'part1',
  'part2',
  'part3'
]);
```

---

## DIDService

Serviço para geração e gerenciamento de Identificadores Descentralizados.

### Métodos

#### `generateKeyPair(): Promise<{privateKey: string; publicKey: string}>`

Gera um par de chaves Ed25519.

**Retorna**: Objeto com chaves privada e pública em hexadecimal

**Exemplo**:
```typescript
const { privateKey, publicKey } = await DIDService.generateKeyPair();
```

**Throws**: `CryptoError` se a geração falhar

---

#### `createDidKey(publicKeyHex: string): string`

Cria um DID usando o método did:key.

**Parâmetros**:
- `publicKeyHex`: Chave pública em hexadecimal

**Retorna**: DID no formato `did:key:z...`

**Exemplo**:
```typescript
const did = DIDService.createDidKey(publicKey);
// Retorna: "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH"
```

---

#### `createDidPeer(publicKeyHex: string): string`

Cria um DID usando o método did:peer.

**Parâmetros**:
- `publicKeyHex`: Chave pública em hexadecimal

**Retorna**: DID no formato `did:peer:...`

**Exemplo**:
```typescript
const did = DIDService.createDidPeer(publicKey);
```

---

#### `createDidWeb(domain: string, path?: string): string`

Cria um DID usando o método did:web.

**Parâmetros**:
- `domain`: Domínio web (ex: 'ufsc.br')
- `path`: Caminho opcional (ex: 'identity')

**Retorna**: DID no formato `did:web:...`

**Exemplo**:
```typescript
const did = DIDService.createDidWeb('ufsc.br', 'identity');
// Retorna: "did:web:ufsc.br:identity"
```

---

## CredentialService

Serviço para emissão e gerenciamento de credenciais verificáveis.

### Métodos

#### `getOrCreateIssuerDID(): Promise<{did: string; publicKey: string}>`

Obtém ou cria o DID do emissor (UFSC).

**Retorna**: Objeto com DID e chave pública do emissor

**Exemplo**:
```typescript
const { did, publicKey } = await CredentialService.getOrCreateIssuerDID();
```

**Throws**: `CryptoError` se a geração falhar

---

#### `issueCredential(studentData: StudentData, format: 'SD-JWT' | 'AnonCreds'): Promise<string>`

Emite uma credencial verificável.

**Parâmetros**:
- `studentData`: Dados do estudante
- `format`: Formato da credencial ('SD-JWT' ou 'AnonCreds')

**Retorna**: Token da credencial (string)

**Exemplo**:
```typescript
const credential = await CredentialService.issueCredential(
  {
    nome_completo: 'João Silva',
    cpf: '12345678900',
    matricula: '20231234567',
    curso: 'Ciência da Computação',
    status_matricula: 'Ativo',
    data_nascimento: '2000-05-15',
    // ... outros campos
  },
  'SD-JWT'
);
```

**Throws**: 
- `ValidationError` se dados inválidos
- `CryptoError` se assinatura falhar

---

### Tipos

```typescript
interface StudentData {
  nome_completo: string;
  cpf: string;
  matricula: string;
  curso: string;
  status_matricula: 'Ativo' | 'Inativo';
  data_nascimento: string; // ISO 8601
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
```

---

## PresentationService

Serviço para processamento de requisições e geração de apresentações.

### Métodos

#### `validatePEXFormat(request: any): boolean`

Valida o formato de uma requisição PEX.

**Parâmetros**:
- `request`: Objeto da requisição

**Retorna**: `true` se válida, `false` caso contrário

**Exemplo**:
```typescript
const isValid = PresentationService.validatePEXFormat(pexRequest);
```

---

#### `extractRequestedAttributes(pexRequest: PresentationExchangeRequest): {required: string[]; optional: string[]}`

Extrai atributos solicitados de uma requisição PEX.

**Parâmetros**:
- `pexRequest`: Requisição PEX

**Retorna**: Objeto com arrays de atributos obrigatórios e opcionais

**Exemplo**:
```typescript
const { required, optional } = PresentationService.extractRequestedAttributes(
  pexRequest
);
// required: ['status_matricula', 'isencao_ru']
// optional: []
```

---

#### `processPEXRequest(pexRequest: PresentationExchangeRequest, credential: VerifiableCredential): Promise<ConsentData>`

Processa uma requisição PEX e prepara dados para consentimento.

**Parâmetros**:
- `pexRequest`: Requisição PEX
- `credential`: Credencial do titular

**Retorna**: Dados para modal de consentimento

**Exemplo**:
```typescript
const consentData = await PresentationService.processPEXRequest(
  pexRequest,
  credential
);
```

**Throws**: `ValidationError` se requisição inválida

---

#### `createSDJWTPresentation(credential: VerifiableCredential, selectedAttributes: string[], challenge: string): Promise<string>`

Cria uma apresentação SD-JWT.

**Parâmetros**:
- `credential`: Credencial verificável
- `selectedAttributes`: Atributos a revelar
- `challenge`: Nonce criptográfico

**Retorna**: Token da apresentação

**Exemplo**:
```typescript
const presentation = await PresentationService.createSDJWTPresentation(
  credential,
  ['status_matricula', 'isencao_ru'],
  challenge
);
```

---

#### `createZKPPresentation(credential: VerifiableCredential, predicates: Predicate[], challenge: string): Promise<string>`

Cria uma apresentação com provas ZKP.

**Parâmetros**:
- `credential`: Credencial verificável
- `predicates`: Predicados a provar
- `challenge`: Nonce criptográfico

**Retorna**: Token da apresentação

**Exemplo**:
```typescript
const presentation = await PresentationService.createZKPPresentation(
  credential,
  [{ attribute: 'status_matricula', operator: '==', value: 'Ativo' }],
  challenge
);
```

---

#### `generateNullifier(credential: VerifiableCredential, electionId: string): Promise<string>`

Gera um nullifier determinístico para eleições.

**Parâmetros**:
- `credential`: Credencial do titular
- `electionId`: ID único da eleição

**Retorna**: Hash nullifier

**Exemplo**:
```typescript
const nullifier = await PresentationService.generateNullifier(
  credential,
  'election-2026-01'
);
```

---

#### `generateRangeProof(credential: VerifiableCredential, attribute: string, operator: string, value: number): Promise<RangeProof>`

Gera uma Range Proof para predicados numéricos.

**Parâmetros**:
- `credential`: Credencial verificável
- `attribute`: Nome do atributo (ex: 'data_nascimento')
- `operator`: Operador ('>=', '<=', '==', '!=')
- `value`: Valor de comparação

**Retorna**: Objeto RangeProof

**Exemplo**:
```typescript
const proof = await PresentationService.generateRangeProof(
  credential,
  'data_nascimento',
  '>=',
  18 // idade mínima
);
```

---

## VerificationService

Serviço para validação de apresentações verificáveis.

### Métodos

#### `getScenarios(): Scenario[]`

Retorna lista de cenários pré-configurados.

**Retorna**: Array de cenários

**Exemplo**:
```typescript
const scenarios = VerificationService.getScenarios();
// [
//   { id: 'ru', name: 'Restaurante Universitário', ... },
//   { id: 'elections', name: 'Eleições', ... },
//   ...
// ]
```

---

#### `getScenario(scenarioId: string): Scenario | undefined`

Obtém um cenário específico por ID.

**Parâmetros**:
- `scenarioId`: ID do cenário ('ru', 'elections', 'labs', 'age')

**Retorna**: Cenário ou undefined

**Exemplo**:
```typescript
const scenario = VerificationService.getScenario('ru');
```

---

#### `generateChallenge(scenario: Scenario, resourceId?: string): Promise<PresentationExchangeRequest>`

Gera uma requisição PEX para um cenário.

**Parâmetros**:
- `scenario`: Cenário selecionado
- `resourceId`: ID do recurso (opcional, para laboratórios)

**Retorna**: Requisição PEX

**Exemplo**:
```typescript
const request = await VerificationService.generateChallenge(
  scenario,
  'LCN' // para laboratórios
);
```

---

#### `validatePresentation(presentation: VerifiablePresentation, request: PresentationExchangeRequest): Promise<ValidationResult>`

Valida uma apresentação verificável.

**Parâmetros**:
- `presentation`: Apresentação recebida
- `request`: Requisição original

**Retorna**: Resultado da validação

**Exemplo**:
```typescript
const result = await VerificationService.validatePresentation(
  presentation,
  request
);

if (result.valid) {
  console.log('Acesso aprovado');
} else {
  console.log('Acesso negado:', result.errors);
}
```

---

#### `checkNullifier(nullifier: string, electionId: string): Promise<boolean>`

Verifica se um nullifier já foi usado.

**Parâmetros**:
- `nullifier`: Hash nullifier
- `electionId`: ID da eleição

**Retorna**: `true` se já existe (duplicado), `false` se novo

**Exemplo**:
```typescript
const isDuplicate = await VerificationService.checkNullifier(
  nullifier,
  'election-2026-01'
);
```

---

#### `storeNullifier(nullifier: string, electionId: string): Promise<void>`

Armazena um nullifier após validação bem-sucedida.

**Parâmetros**:
- `nullifier`: Hash nullifier
- `electionId`: ID da eleição

**Exemplo**:
```typescript
await VerificationService.storeNullifier(
  nullifier,
  'election-2026-01'
);
```

---

### Tipos

```typescript
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  verified_attributes?: Record<string, any>;
  predicates_satisfied?: boolean;
  nullifier_check?: 'new' | 'duplicate';
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'selective_disclosure' | 'zkp_eligibility' | 'range_proof' | 'access_control';
  requested_attributes?: string[];
  predicates?: Predicate[];
}
```

---

## StorageService

Serviço para armazenamento seguro de dados.

### Métodos

#### `storeHolderPrivateKey(privateKey: string, did: string): Promise<void>`

Armazena a chave privada do titular.

**Parâmetros**:
- `privateKey`: Chave privada em hexadecimal
- `did`: DID do titular

**Exemplo**:
```typescript
await StorageService.storeHolderPrivateKey(privateKey, did);
```

**Throws**: `StorageError` se falhar

---

#### `getHolderPrivateKey(): Promise<string | null>`

Recupera a chave privada do titular.

**Retorna**: Chave privada ou null se não existir

**Exemplo**:
```typescript
const privateKey = await StorageService.getHolderPrivateKey();
```

---

#### `getHolderDID(): Promise<string | null>`

Recupera o DID do titular.

**Retorna**: DID ou null se não existir

**Exemplo**:
```typescript
const did = await StorageService.getHolderDID();
```

---

#### `storeCredential(credential: VerifiableCredential): Promise<void>`

Armazena uma credencial de forma criptografada.

**Parâmetros**:
- `credential`: Credencial verificável

**Exemplo**:
```typescript
await StorageService.storeCredential(credential);
```

---

#### `getCredentials(): Promise<VerifiableCredential[]>`

Recupera todas as credenciais armazenadas.

**Retorna**: Array de credenciais

**Exemplo**:
```typescript
const credentials = await StorageService.getCredentials();
```

---

## LogService

Serviço para captura e gerenciamento de logs.

### Métodos

#### `captureEvent(entry: Omit<LogEntry, 'id' | 'timestamp'>): void`

Captura um evento e adiciona ao log.

**Parâmetros**:
- `entry`: Dados do evento (sem id e timestamp)

**Exemplo**:
```typescript
LogService.captureEvent({
  operation: 'credential_issuance',
  module: 'emissor',
  details: {
    algorithm: 'EdDSA',
    did_method: 'did:web'
  },
  success: true
});
```

---

#### `logKeyGeneration(algorithm: string, keySize: number, didMethod: string, did: string): void`

Registra geração de chaves.

**Parâmetros**:
- `algorithm`: Nome do algoritmo
- `keySize`: Tamanho da chave em bits
- `didMethod`: Método DID usado
- `did`: DID gerado

**Exemplo**:
```typescript
LogService.logKeyGeneration('Ed25519', 256, 'did:key', did);
```

---

#### `logCredentialIssuance(issuerDID: string, holderDID: string, format: string): void`

Registra emissão de credencial.

**Parâmetros**:
- `issuerDID`: DID do emissor
- `holderDID`: DID do titular
- `format`: Formato da credencial

**Exemplo**:
```typescript
LogService.logCredentialIssuance(issuerDID, holderDID, 'SD-JWT');
```

---

#### `logPresentationCreation(type: string, attributesCount: number, hasZKP: boolean): void`

Registra criação de apresentação.

**Parâmetros**:
- `type`: Tipo de apresentação
- `attributesCount`: Número de atributos revelados
- `hasZKP`: Se contém provas ZKP

**Exemplo**:
```typescript
LogService.logPresentationCreation('SD-JWT', 2, false);
```

---

### Tipos

```typescript
interface LogEntry {
  id: string;
  timestamp: Date;
  operation: 'key_generation' | 'credential_issuance' | 'presentation_creation' | 
             'verification' | 'hash_computation' | 'zkp_generation' | 'error';
  module: 'emissor' | 'titular' | 'verificador';
  details: LogDetails;
  success: boolean;
  error?: Error;
}

interface LogDetails {
  algorithm?: string;
  key_size?: number;
  did_method?: string;
  hash_output?: string;
  verification_result?: boolean;
  parameters?: Record<string, any>;
  stack_trace?: string;
}
```

---

## ErrorHandler

Classes de erro customizadas para tratamento de exceções.

### Classes

#### `CryptoError`

Erro relacionado a operações criptográficas.

**Construtor**:
```typescript
new CryptoError(message: string, operation: string, details?: any)
```

**Exemplo**:
```typescript
throw new CryptoError(
  'Falha na assinatura',
  'signData',
  { algorithm: 'Ed25519' }
);
```

---

#### `ValidationError`

Erro relacionado a validação de dados.

**Construtor**:
```typescript
new ValidationError(message: string, field?: string, value?: any)
```

**Exemplo**:
```typescript
throw new ValidationError(
  'CPF inválido',
  'cpf',
  '123'
);
```

---

#### `StorageError`

Erro relacionado a operações de armazenamento.

**Construtor**:
```typescript
new StorageError(message: string, operation: string, details?: any)
```

**Exemplo**:
```typescript
throw new StorageError(
  'Falha ao salvar credencial',
  'storeCredential'
);
```

---

## Convenções de Uso

### Async/Await

Todos os métodos assíncronos devem ser chamados com `await`:

```typescript
// ✅ Correto
const credential = await CredentialService.issueCredential(data, 'SD-JWT');

// ❌ Incorreto
const credential = CredentialService.issueCredential(data, 'SD-JWT');
```

### Tratamento de Erros

Sempre use try-catch para operações que podem falhar:

```typescript
try {
  const credential = await CredentialService.issueCredential(data, 'SD-JWT');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Dados inválidos:', error.field);
  } else if (error instanceof CryptoError) {
    console.error('Erro criptográfico:', error.operation);
  }
}
```

### Logging

Operações importantes devem ser logadas:

```typescript
try {
  const result = await someOperation();
  LogService.captureEvent({
    operation: 'some_operation',
    module: 'titular',
    details: { result },
    success: true
  });
} catch (error) {
  LogService.captureEvent({
    operation: 'some_operation',
    module: 'titular',
    details: {},
    success: false,
    error
  });
}
```

---

## Exemplos Completos

### Fluxo de Emissão

```typescript
// 1. Obter DID do emissor
const { did: issuerDID } = await CredentialService.getOrCreateIssuerDID();

// 2. Preparar dados
const studentData: StudentData = {
  nome_completo: 'João Silva',
  cpf: '12345678900',
  // ... outros campos
};

// 3. Emitir credencial
try {
  const credential = await CredentialService.issueCredential(
    studentData,
    'SD-JWT'
  );
  
  // 4. Copiar para área de transferência
  Clipboard.setString(credential);
  
  console.log('Credencial emitida com sucesso');
} catch (error) {
  console.error('Erro na emissão:', error);
}
```

### Fluxo de Apresentação

```typescript
// 1. Validar requisição PEX
const isValid = PresentationService.validatePEXFormat(pexRequest);
if (!isValid) {
  throw new ValidationError('Requisição PEX inválida');
}

// 2. Extrair atributos solicitados
const { required, optional } = PresentationService.extractRequestedAttributes(
  pexRequest
);

// 3. Obter credencial armazenada
const credentials = await StorageService.getCredentials();
const credential = credentials[0];

// 4. Criar apresentação
const presentation = await PresentationService.createSDJWTPresentation(
  credential,
  required, // Revelar apenas atributos obrigatórios
  pexRequest.challenge
);

// 5. Copiar para área de transferência
Clipboard.setString(presentation);
```

### Fluxo de Validação

```typescript
// 1. Gerar desafio
const scenario = VerificationService.getScenario('ru');
const request = await VerificationService.generateChallenge(scenario);

// 2. Receber apresentação (via clipboard)
const presentationToken = await Clipboard.getString();
const presentation = JSON.parse(presentationToken);

// 3. Validar
try {
  const result = await VerificationService.validatePresentation(
    presentation,
    request
  );
  
  if (result.valid) {
    console.log('Acesso aprovado');
    console.log('Atributos verificados:', result.verified_attributes);
  } else {
    console.log('Acesso negado');
    console.log('Erros:', result.errors);
  }
} catch (error) {
  console.error('Erro na validação:', error);
}
```

---

**Versão**: 1.0.0  
**Última atualização**: Março 2026
