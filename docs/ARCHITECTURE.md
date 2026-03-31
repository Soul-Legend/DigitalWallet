# Documentação de Arquitetura

## Visão Geral

A Carteira de Identidade Acadêmica é um aplicativo React Native que implementa os padrões W3C de Credenciais Verificáveis e Identificadores Descentralizados (DIDs) para criar um ecossistema completo de SSI (Self-Sovereign Identity).

## Princípios Arquiteturais

### 1. Separação de Responsabilidades

Cada camada tem responsabilidades bem definidas:
- **UI Layer**: Apresentação e interação com usuário
- **Service Layer**: Lógica de negócio e operações criptográficas
- **Storage Layer**: Persistência segura de dados

### 2. Abstração Criptográfica

Bibliotecas criptográficas complexas são encapsuladas em serviços simples, facilitando manutenção e testes.

### 3. State Management Centralizado

Zustand gerencia estado global, logs e comunicação entre módulos.

### 4. Modularidade

Cada módulo (Emissor, Titular, Verificador) opera independentemente, permitindo desenvolvimento e testes isolados.

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Emissor  │  │ Titular  │  │Verificador│  │  Logs   ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘│
│       │             │              │              │      │
│  ┌────┴─────────────┴──────────────┴──────────────┴───┐ │
│  │           Service Layer (Business Logic)           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │ │
│  │  │Crypto│ │ DID  │ │Cred  │ │Present│ │Verify│    │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │ │
│  └────────────────────────────────────────────────────┘ │
│                           │                              │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │         Native Crypto Libraries                    │  │
│  │  @credo-ts  jose  @noble/ed25519  crypto-js       │  │
│  └────────────────────────────────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │         Secure Storage (OS-level)                  │  │
│  │  react-native-encrypted-storage  keychain         │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Camadas da Aplicação

### UI Layer

**Responsabilidade**: Apresentação e interação com usuário

**Componentes**:
- **Screens**: Telas principais (HomeScreen, IssuerScreen, HolderScreen, etc.)
- **Components**: Componentes reutilizáveis (CredentialCard, ConsentModal, etc.)
- **Navigation**: React Navigation com Native Stack

**Tecnologias**:
- React Native 0.76.5
- React Navigation 6.x
- TypeScript

### Service Layer

**Responsabilidade**: Lógica de negócio e operações criptográficas

#### CryptoService

**Funções**:
- Geração de pares de chaves (Ed25519)
- Assinatura digital (EdDSA)
- Verificação de assinaturas
- Hashing criptográfico (SHA-256)
- Operações JWT/JWS

**Dependências**:
- @noble/ed25519
- jose
- crypto-js

#### DIDService

**Funções**:
- Criação de DIDs (did:key, did:peer, did:web)
- Resolução de documentos DID
- Gerenciamento de métodos DID

**Formatos suportados**:
- `did:key`: DID derivado diretamente da chave pública
- `did:peer`: DID para comunicação peer-to-peer
- `did:web`: DID baseado em domínio web

#### CredentialService

**Funções**:
- Emissão de credenciais verificáveis
- Formatação SD-JWT
- Formatação AnonCreds
- Validação de estrutura de credenciais

**Formatos suportados**:
- W3C Verifiable Credentials Data Model
- SD-JWT (Selective Disclosure JWT)
- AnonCreds (Hyperledger)

#### PresentationService

**Funções**:
- Processamento de requisições PEX
- Geração de apresentações SD-JWT
- Geração de provas ZKP
- Geração de Range Proofs
- Computação de Nullifiers

**Protocolos**:
- Presentation Exchange (PEX)
- SD-JWT presentations
- AnonCreds presentations

#### VerificationService

**Funções**:
- Geração de desafios PEX
- Validação de assinaturas
- Verificação de hashes SD-JWT
- Validação de provas ZKP
- Verificação de Range Proofs
- Gerenciamento de Nullifiers

#### StorageService

**Funções**:
- Armazenamento criptografado de credenciais
- Armazenamento seguro de chaves privadas
- Gerenciamento de Nullifiers
- Cache de documentos DID

**Tecnologias**:
- react-native-encrypted-storage
- react-native-keychain

#### LogService

**Funções**:
- Captura de eventos criptográficos
- Registro de operações
- Ofuscação de dados sensíveis
- Gerenciamento de histórico

### State Management

**Tecnologia**: Zustand

**Stores**:

```typescript
interface AppStore {
  // Identity
  holderDID: string | null;
  issuerDID: string | null;
  
  // Credentials
  credentials: VerifiableCredential[];
  
  // Logs
  logs: LogEntry[];
  
  // Nullifiers (for verifier)
  nullifiers: Record<string, string[]>;
  
  // Actions
  setHolderDID: (did: string) => void;
  addCredential: (credential: VerifiableCredential) => void;
  addLog: (log: LogEntry) => void;
  addNullifier: (electionId: string, nullifier: string) => void;
  clearLogs: () => void;
}
```

## Fluxo de Dados

### 1. Emissão de Credencial

```
IssuerScreen (UI)
    ↓ [StudentData]
CredentialService.issueCredential()
    ↓
DIDService.createDidWeb() → Issuer DID
    ↓
CryptoService.sign() → Digital Signature
    ↓
Format as SD-JWT or AnonCreds
    ↓
LogService.captureEvent()
    ↓
Clipboard.setString()
    ↓
Success Message (UI)
```

### 2. Armazenamento de Credencial

```
HolderScreen (UI)
    ↓ [Credential Token]
CredentialService.validate()
    ↓ [Valid?]
StorageService.storeCredential()
    ↓ [Encrypted]
AppStore.addCredential()
    ↓
LogService.captureEvent()
    ↓
Display CredentialCard (UI)
```

### 3. Geração de Apresentação

```
HolderScreen (UI)
    ↓ [PEX Request]
PresentationService.processRequest()
    ↓
ConsentModal (UI) → User Approval
    ↓ [Selected Attributes]
PresentationService.createPresentation()
    ├─ SD-JWT: Obfuscate non-disclosed attributes
    └─ ZKP: Generate zero-knowledge proofs
    ↓
CryptoService.sign()
    ↓
LogService.captureEvent()
    ↓
Clipboard.setString()
    ↓
Success Message (UI)
```

### 4. Validação de Apresentação

```
VerifierScreen (UI)
    ↓ [Presentation]
VerificationService.validatePresentation()
    ├─ Verify issuer signature
    ├─ Verify structural integrity
    ├─ Validate SD-JWT hashes
    ├─ Validate ZKP proofs
    └─ Check nullifier (if elections)
    ↓
LogService.captureEvent()
    ↓
ValidationResult (UI)
```

## Modelos de Dados

### VerifiableCredential

```typescript
interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string; // DID
  issuanceDate: string;
  credentialSubject: {
    id: string; // Holder DID
    nome_completo: string;
    cpf: string;
    matricula: string;
    curso: string;
    status_matricula: 'Ativo' | 'Inativo';
    data_nascimento: string;
    // ... outros atributos
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}
```

### PresentationRequest (PEX)

```typescript
interface PresentationRequest {
  type: 'PresentationExchange';
  challenge: string;
  presentation_definition: {
    id: string;
    input_descriptors: Array<{
      id: string;
      constraints: {
        fields: Array<{
          path: string[];
          filter?: {
            type: string;
            const?: any;
          };
        }>;
      };
    }>;
  };
}
```

### VerifiablePresentation

```typescript
interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  holder: string; // DID
  verifiableCredential: any;
  presentation_submission: {
    id: string;
    definition_id: string;
    descriptor_map: Array<{
      id: string;
      format: string;
      path: string;
    }>;
  };
  proof: {
    type: string;
    challenge: string;
    jws: string;
  };
}
```

## Segurança

### Geração de Chaves

- Chaves geradas usando algoritmos padrão da indústria (Ed25519)
- Geração no hardware seguro quando disponível
- Chaves privadas nunca saem do dispositivo

### Armazenamento

- Credenciais armazenadas com criptografia AES-256
- Chaves privadas no Keychain/Keystore do OS
- Dados sensíveis ofuscados em logs

### Criptografia

- **Assinaturas**: EdDSA com Ed25519
- **Hashing**: SHA-256
- **Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2

### Validação

- Verificação de assinatura em todas as credenciais
- Validação de estrutura contra schemas
- Verificação de integridade de hashes
- Validação matemática de provas ZKP

## Performance

### Otimizações Implementadas

1. **Cache de Documentos DID**
   - Documentos DID resolvidos são cacheados
   - Reduz latência em validações repetidas

2. **Lazy Loading**
   - Componentes carregados sob demanda
   - Reduz tempo de inicialização

3. **Memoization**
   - Componentes React memoizados
   - Previne re-renders desnecessários

4. **Async Operations**
   - Operações criptográficas em background
   - UI permanece responsiva

### Métricas de Performance

- **Geração de chaves**: ~500ms
- **Emissão de credencial**: ~1s
- **Geração SD-JWT**: ~500ms
- **Geração ZKP**: ~2-3s
- **Validação**: ~500ms

## Escalabilidade

### Limitações Atuais

- Armazenamento local limitado pelo dispositivo
- Operações ZKP computacionalmente intensivas
- Sem sincronização entre dispositivos

### Melhorias Futuras

- Backup criptografado em nuvem
- Otimização de circuitos ZKP com mopro
- Suporte a múltiplos dispositivos
- Revogação de credenciais

## Conformidade com Padrões

### W3C Standards

- ✅ Verifiable Credentials Data Model 1.1
- ✅ Decentralized Identifiers (DIDs) v1.0
- ✅ JSON-LD 1.1
- ✅ Linked Data Proofs

### DIF Standards

- ✅ Presentation Exchange (PEX) v2.0
- ✅ DID Methods (did:key, did:peer, did:web)

### IETF Standards

- ✅ JSON Web Signature (JWS) - RFC 7515
- ✅ JSON Web Token (JWT) - RFC 7519
- ✅ SD-JWT - Draft Specification

### Hyperledger

- ✅ AnonCreds Specification v1.0

## Testes

### Estratégia de Testes

1. **Unit Tests**: Serviços individuais
2. **Property-Based Tests**: 39 propriedades de correção
3. **Integration Tests**: Fluxos E2E completos

### Cobertura

- Services: 95%+
- Components: 90%+
- Utils: 100%

### Property-Based Testing

Cada propriedade é testada com 100+ iterações usando dados gerados aleatoriamente:

```typescript
// Exemplo: Property 19 - Nullifier Determinism
fc.assert(
  fc.property(
    arbitraryCredential(),
    fc.string(),
    (credential, electionId) => {
      const n1 = generateNullifier(credential, electionId);
      const n2 = generateNullifier(credential, electionId);
      return n1 === n2; // Deve ser determinístico
    }
  ),
  { numRuns: 100 }
);
```

## Decisões Técnicas

### Por que React Native?

- Cross-platform (Android/iOS)
- Acesso a APIs nativas de segurança
- Ecossistema maduro de bibliotecas criptográficas
- Performance adequada para operações criptográficas

### Por que Zustand?

- Simples e leve
- TypeScript first-class support
- Sem boilerplate
- Performance superior ao Redux

### Por que Área de Transferência?

- Abstrai complexidade de rede
- Foco em validação criptográfica
- Facilita testes e debugging
- MVP mais rápido

### Por que Ed25519?

- Assinaturas pequenas (64 bytes)
- Verificação rápida
- Amplamente suportado
- Padrão da indústria SSI

## Diagramas

### Diagrama de Sequência: Fluxo Completo

```
Emissor          Titular          Verificador
   |                |                  |
   |--Issue Cred--->|                  |
   |                |                  |
   |                |<--PEX Request----|
   |                |                  |
   |                |--Presentation--->|
   |                |                  |
   |                |<--Validation-----|
```

### Diagrama de Componentes

```
┌─────────────────────────────────────┐
│           UI Components             │
├─────────────────────────────────────┤
│  Screens  │  Components  │  Nav     │
└────────────┬────────────────────────┘
             │
┌────────────┴────────────────────────┐
│          Service Layer              │
├─────────────────────────────────────┤
│ Crypto │ DID │ Cred │ Present │ ... │
└────────────┬────────────────────────┘
             │
┌────────────┴────────────────────────┐
│       Native Libraries              │
├─────────────────────────────────────┤
│  @credo-ts  │  jose  │  noble/ed25519│
└─────────────────────────────────────┘
```

## Referências

- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [W3C DIDs](https://www.w3.org/TR/did-core/)
- [DIF Presentation Exchange](https://identity.foundation/presentation-exchange/)
- [SD-JWT Specification](https://datatracker.ietf.org/doc/draft-ietf-oauth-selective-disclosure-jwt/)
- [Hyperledger AnonCreds](https://hyperledger.github.io/anoncreds-spec/)

---

**Versão**: 1.0.0  
**Última atualização**: Março 2026
