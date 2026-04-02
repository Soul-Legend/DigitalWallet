# Arquitetura

## Visão geral

Aplicativo React Native 0.76.5 (Android) que implementa os três papéis do modelo SSI (Emissor, Titular, Verificador) em um único binário. A troca de credenciais e apresentações é feita via área de transferência (clipboard). Não há comunicação de rede entre os papéis.

## Camadas

```
┌─────────────────────────────────────────────────────────┐
│                    UI (React Native)                     │
│  Screens: Home, Issuer, Holder, Verifier, Logs, Glossary│
│  Components: ConsentModal, CredentialCard, etc.          │
├─────────────────────────────────────────────────────────┤
│                    Service Layer                         │
│  AgentService  │ AnonCredsService │ CredentialService    │
│  DIDService    │ PresentationService │ VerificationService│
│  ZKProofService│ CryptoService   │ EudiTransportService  │
│  StorageService│ LogService      │ ErrorHandler           │
├─────────────────────────────────────────────────────────┤
│                 Native Libraries (JSI/Rust)              │
│  @credo-ts/core        │ @hyperledger/aries-askar-react-native │
│  @hyperledger/anoncreds-react-native │ mopro-ffi (Circom/Groth16) │
│  @openwallet-foundation/eudi-wallet-kit-react-native     │
├─────────────────────────────────────────────────────────┤
│              Encrypted Storage (OS-level)                │
│  react-native-encrypted-storage (AES-256 via Keystore)  │
└─────────────────────────────────────────────────────────┘
```

## Serviços

### AgentService

Singleton que inicializa e gerencia o agente Credo (`@credo-ts/core`). O agente é configurado com:
- **AskarModule** (`@hyperledger/aries-askar-react-native`): wallet criptográfico para armazenamento de chaves Ed25519 e operações de assinatura.
- **AnonCredsModule** (`@hyperledger/anoncreds-react-native`): bindings nativos AnonCreds passados ao módulo Credo. Registries vazias (`registries: []`) porque os artefatos AnonCreds são gerenciados localmente pelo AnonCredsService.

Wallet configurado com derivação de chave Argon2IMod. Sem transportes DIDComm.

### AnonCredsService

Encapsula o protocolo CL-signature da biblioteca `@hyperledger/anoncreds-react-native`. Implementa:

1. **Schema**: `Schema.create({issuerId, name, version, attributeNames})`
2. **CredentialDefinition**: `CredentialDefinition.create({schemaId, schema, signatureType: 'CL', issuerId})` — gera credDef + credDefPrivate + keyCorrectnessProof
3. **LinkSecret**: `LinkSecret.create()` — fator de cegamento do titular para desvinculabilidade
4. **Offer → Request → Credential**: Protocolo de emissão em 3 passos
5. **Presentation**: `Presentation.create()` — ZKP com divulgação seletiva e provas de predicado
6. **Verification**: `Presentation.verify()` — verificação criptográfica

Todos os artefatos (schemas, cred defs, link secrets) são persistidos em `EncryptedStorage` via StorageService. Não há ledger.

### CredentialService

Emissão de credenciais em dois formatos:

- **SD-JWT** (`'sd-jwt'`): Constrói JWT com header/payload/signature. Assinatura Ed25519 via `agent.wallet.sign()` (Aries Askar). Chave de assinatura resolvida do DID do emissor.
- **AnonCreds** (`'anoncreds'`): Delega para `AnonCredsService.issueCredentialFull()` que executa o protocolo completo (Schema → CredDef → Offer → Request → Credential → Process). O resultado é um envelope JSON `{format: 'anoncreds', credential, schema_id, cred_def_id}`.

Parsing: `validateAndParseCredential()` detecta o formato (JWT com dots vs JSON com `format: 'anoncreds'` vs legacy `schema_id`) e converte para `VerifiableCredential` internamente.

### DIDService

Criação de DIDs via agente Credo:
- `did:key` — via `agent.dids.create({method: 'key'})`. Usado para titulares.
- `did:peer` — via `agent.dids.create({method: 'peer'})`.
- `did:web` — construído localmente (string formatting). Usado para emissores (`did:web:ufsc.br:identidade-academica`).

`generateIssuerIdentity()` cria um `did:key` para assinatura e um `did:web` para identidade pública. Ambos são armazenados.

### PresentationService

Gera apresentações verificáveis em três modos:

1. **SD-JWT** (`createPresentation()`): Extrai atributos selecionados, gera hashes SHA-256 dos não revelados, assina com chave privada do titular via CryptoService.
2. **Groth16/Circom** (`createZKPPresentation()`): Para cada predicado, gera prova ZK via ZKProofService (mopro-ffi). Circuitos: `age_range`, `status_check`, `nullifier`. Proof type: `Groth16Proof`.
3. **AnonCreds CL** (`createAnonCredsPresentation()`): Constrói presentation request do AnonCreds, recupera artefatos do storage, executa `AnonCredsService.createPresentation()` com CL-signatures. Proof type: `CLSignature2023`.

Nullifiers para eleições: tenta usar circuito ZK Circom, fallback para hash SHA-256 composto.

### VerificationService

Valida apresentações recebidas. Entrypoint: `validatePresentation()` que executa:

1. Validação de formato PEX
2. Verificação de assinatura do emissor (dispatch por proof type):
   - `Groth16Proof`: aceita — verificação delegada ao passo de integridade ZKP
   - `CLSignature2023`: executa `AnonCredsService.verifyPresentation()` contra artefatos locais
   - `JsonWebSignature2020`: verifica JWS com chave pública do emissor
3. **Verificação da cadeia de confiança** (se configurada): valida que o emissor da credencial pertence à cadeia de confiança PKI via `TrustChainService.verifyTrustChain()`. Se a cadeia existe mas o emissor não pertence, a verificação falha. Passo ignorado quando nenhuma cadeia está configurada (retrocompatível).
4. Integridade estrutural (atributos presentes na credencial)
5. Integridade ZKP: verifica cada prova Groth16 via `ZKProofService.verifyProof()`
6. Validação de predicados
7. Verificação de nullifiers (eleições)

### TrustChainService

Emula uma infraestrutura PKI hierárquica para emissores confiáveis. Modelo:

```
did:web:ufsc.br (Âncora Raiz — self-signed)
├── did:web:ctc.ufsc.br (Centro Tecnológico — assinado pela raiz)
│   └── did:web:ine.ufsc.br (Dept. Informática — assinado pelo CTC)
└── did:web:cagr.ufsc.br (CAGR — assinado pela raiz)
```

Cada emissor possui: DID, par de chaves Ed25519, nome, DID do pai, e certificado (assinatura do pai sobre os dados do emissor).

Operações principais:
- `initializeRootIssuer(did, name)`: Gera par Ed25519, auto-assina certificado, persiste.
- `registerChildIssuer(parentDid, parentPrivateKey, childDid, childName)`: Gera par Ed25519 para o filho, pai assina certificado sobre `{did, publicKey, name, parentDid}`.
- `verifyTrustChain(issuerDid)`: Percorre a cadeia do emissor até a raiz, verificando cada certificado com a chave pública do pai. Detecta ciclos via conjunto de DIDs visitados.
- `getAllIssuers()`, `isTrustedIssuer(did)`, `getIssuerPrivateKey(did)`, `reset()`.

Armazenamento via `StorageService.setRawItem('trust_chain_issuers', ...)`. Chaves privadas armazenadas em `trust_root_private_key` e `trust_issuer_private_key_${did}`.

### ZKProofService

Wrapper sobre `mopro-ffi` (Rust via UniFFI). Três circuitos suportados:

- `age_range`: inputs = [birthdate_as_number, threshold]. Prova que idade ≥ threshold.
- `status_check`: inputs = [value_hash, expected_hash]. Prova igualdade sem revelar valor.
- `nullifier`: inputs = [secret_hash, election_id_hash]. Gera nullifier determinístico dentro do circuito.

Circuitos são arquivos `.zkey` esperados em `RNFS.DocumentDirectoryPath/circuits/`.

### CryptoService

Operações criptográficas de baixo nível independentes do agente Credo:
- `computeHash(data, module)`: SHA-256 via `crypto-js`
- `signData(data, privateKeyHex, module)`: Ed25519 via `@noble/ed25519`
- `verifySignature(data, signatureHex, publicKeyHex)`: Ed25519
- `generateNonce()`: Nonce criptográfico
- `computeCompositeHash(parts[], module)`: Hash de múltiplas partes

Usado pelo PresentationService (SD-JWT hashing/signing) e VerificationService (SD-JWT verification).

### EudiTransportService

Camada de transporte opcional que encapsula o `@openwallet-foundation/eudi-wallet-kit-react-native`. Três modos:
- `clipboard` (default): Sem operação — o transporte é feito manualmente.
- `proximity`: BLE/NFC via EUDI wallet kit.
- `remote`: OpenID4VP sobre HTTPS.

Carregado via `require()` dinâmico para evitar falha quando o módulo nativo não está disponível. Não está integrado ao fluxo principal da UI.

### StorageService

Wrapper sobre `react-native-encrypted-storage`. Armazena:
- Chaves privadas/públicas do titular e emissor
- DIDs
- Credenciais (array JSON)
- Nullifiers por eleição
- Artefatos AnonCreds (schemas, cred defs, link secrets) via `setRawItem()`/`getRawItem()`

### LogService

Registro de eventos criptográficos com dados sensíveis ofuscados. Cada entrada contém: operação, módulo (emissor/titular/verificador), algoritmo, resultado, timestamp.

## Fluxos de dados

### Emissão (SD-JWT)

```
IssuerScreen
  → CredentialService.issueCredential(studentData, holderDID, 'sd-jwt')
    → getOrCreateIssuerDID()
      → DIDService.generateIssuerIdentity() → agent.dids.create({method:'key'})
    → createVerifiableCredential()
    → signCredentialAsSDJWT()
      → AgentService.getAgent()
      → StorageService.getIssuerSigningDid()
      → agent.dids.resolve(signingDid)
      → agent.wallet.sign({data, key})
    → return JWT string (header.payload.signature)
```

### Emissão (AnonCreds)

```
IssuerScreen
  → CredentialService.issueCredential(studentData, holderDID, 'anoncreds')
    → signCredentialAsAnonCreds()
      → AnonCredsService.issueCredentialFull()
        → Schema.create()
        → CredentialDefinition.create()  → stores credDefPrivate locally
        → LinkSecret.create()            → stored in EncryptedStorage
        → CredentialOffer.create()
        → CredentialRequest.create()
        → Credential.create()            → CL-signed
        → credential.process()           → blinded with link secret
      → return JSON envelope {format:'anoncreds', credential, schema_id, cred_def_id}
```

### Apresentação (AnonCreds)

```
HolderScreen
  → PresentationService.createAnonCredsPresentation(token, pexRequest, revealedAttrs, predicates)
    → Parse envelope, recover schema + credDef from storage
    → AnonCredsService.getOrCreateLinkSecret()
    → AnonCredsService.buildPredicateRequest()
    → AnonCredsService.createPresentation()  → CL-signature ZKP
    → return VerifiablePresentation with type='CLSignature2023'
```

### Verificação

```
VerifierScreen
  → VerificationService.validatePresentation(presentation, pexRequest)
    → validatePresentationFormat()
    → verifyIssuerSignature()
      ├─ CLSignature2023 → verifyAnonCredsPresentation()
      │                     → AnonCredsService.verifyPresentation()
      ├─ Groth16Proof    → accept (verified in ZKP integrity step)
      └─ JWS             → CryptoService.verifySignature()
    → verifyIntegrity()
      ├─ ZKP presentation → verifyZKPIntegrity()
      │                     → ZKProofService.verifyProof() per predicate
      └─ Standard         → verifyStandardIntegrity()
    → validatePredicates()
    → checkNullifier() (if election)
```

## Modelo de dados

### StudentData (atributos da credencial)

```typescript
interface StudentData {
  nome_completo: string;
  cpf: string;            // 11 dígitos
  matricula: string;
  curso: string;
  status_matricula: 'Ativo' | 'Inativo';
  data_nascimento: string; // YYYY-MM-DD
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

### Formatos de credencial na wire

**SD-JWT**: `base64url(header).base64url(payload).base64url(signature)` — JWT padrão com `payload.vc` contendo a VerifiableCredential.

**AnonCreds envelope**: `{"format":"anoncreds","credential":{...},"schema_id":"...","cred_def_id":"..."}` — o campo `credential` contém o objeto AnonCreds com `values`, `signature`, `schema_id`, `cred_def_id`.

### Proof types em apresentações

| Proof type | Serviço | Uso |
|---|---|---|
| `JsonWebSignature2020` | CryptoService (Ed25519) | SD-JWT selective disclosure |
| `Groth16Proof` | ZKProofService (mopro-ffi) | Circuitos Circom customizados |
| `CLSignature2023` | AnonCredsService | AnonCreds selective disclosure + predicados |

## Dependências nativas

Todos os módulos abaixo requerem bindings nativos (Rust/C++ via JSI) e não funcionam em testes sem mocks:

- `@credo-ts/core` + `@credo-ts/react-native` + `@credo-ts/askar` + `@credo-ts/anoncreds`
- `@hyperledger/aries-askar-react-native`
- `@hyperledger/anoncreds-react-native`
- `mopro-ffi`
- `@openwallet-foundation/eudi-wallet-kit-react-native`
- `react-native-encrypted-storage`

Mocks para todos estão em `__mocks__/` e `jest.setup.js`.

### Estrutura de mocks (`__mocks__/`)

Os mocks substituem os módulos nativos durante execução de testes Jest (que roda em Node.js, sem bindings Android):

| Mock | Módulo real | O que faz |
|---|---|---|
| `react-native-encrypted-storage.ts` | react-native-encrypted-storage | Key-value store em memória (Map), substitui AES-256 |
| `react-native-get-random-values.ts` | react-native-get-random-values | Stub do polyfill crypto.getRandomValues |
| `mopro-ffi.ts` | mopro-ffi | Retorna provas/verificações fake para `generateCircomProof`/`verifyCircomProof` |
| `@credo-ts/core.ts` | @credo-ts/core | Agent stub com `dids.create()`, `dids.resolve()`, `wallet.sign()` |
| `@credo-ts/react-native.ts` | @credo-ts/react-native | Stub de `agentDependencies` |
| `@credo-ts/askar.ts` | @credo-ts/askar | Stub de `AskarModule` |
| `@credo-ts/anoncreds.ts` | @credo-ts/anoncreds | Stub de `AnonCredsModule` |
| `@hyperledger/aries-askar-react-native.ts` | @hyperledger/aries-askar-react-native | Stub de `ariesAskar` |
| `@hyperledger/anoncreds-react-native.ts` | @hyperledger/anoncreds-react-native | Mock completo do protocolo CL-signature: Schema, CredentialDefinition, Credential, Presentation, LinkSecret com métodos create/fromJson/toJson/process/verify |
| `@openwallet-foundation/eudi-wallet-kit-react-native.ts` | @openwallet-foundation/eudi-wallet-kit-react-native | Stub do EUDI kit |

O `jest.config.js` configura `moduleNameMapper` para redirecionar imports para esses mocks. Mocks adicionais de serviços (AgentService, ZKProofService, AnonCredsService) são definidos em `jest.setup.js` via `jest.mock()`.

## Estado (Zustand)

Store único (`useAppStore`) com:
- `holderDID`, `issuerDID`: DIDs ativos
- `credentials`: array de credenciais armazenadas
- `logs`: histórico de eventos criptográficos
- `nullifiers`: mapa electionId → string[] para prevenção de voto duplicado
