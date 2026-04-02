# Decisões de Design

Registro das decisões técnicas tomadas durante o desenvolvimento, com razões, alternativas avaliadas e trade-offs.

## Índice

1. [Plataforma e Frameworks](#plataforma-e-frameworks)
2. [Identidade e Criptografia](#identidade-e-criptografia)
3. [Credenciais e Provas](#credenciais-e-provas)
4. [Transporte e Armazenamento](#transporte-e-armazenamento)
5. [Interface](#interface)
6. [Testes](#testes)
7. [Decisões Futuras (Pós-MVP)](#decisões-futuras-pós-mvp)

---

## Plataforma e Frameworks

### React Native como Framework

**Escolha**: React Native 0.76.5 com TypeScript 5.0.4

**Razões**:
- Cross-platform com acesso a APIs nativas de segurança (Keystore)
- Ecossistema SSI disponível: @credo-ts, @hyperledger/anoncreds-react-native, mopro-ffi
- Suporte à Nova Arquitetura (TurboModules)

**Alternativas avaliadas**:
- Flutter: ecossistema SSI menos maduro no momento da decisão
- Native Android (Kotlin): sem cross-platform, escopo do protótipo é validação de conceito
- PWA: sem acesso ao Keystore do OS

**Trade-offs**:
- Performance inferior ao nativo puro para operações criptográficas
- Bundle maior devido às dependências nativas (Askar, AnonCreds, mopro)

---

### Zustand para State Management

**Escolha**: Zustand 4.5.0

**Razões**:
- API sem boilerplate (comparado a Redux)
- TypeScript first-class
- Tamanho reduzido (~1KB)

**Alternativas avaliadas**: Redux (overhead desnecessário para MVP), Context API (performance inferior com re-renders).

---

### Três módulos em um único app

**Escolha**: Emissor, Titular e Verificador coexistem no mesmo aplicativo, acessíveis por tabs.

**Razões**:
- Demonstração completa do ecossistema em um protótipo
- Testes E2E executam sem rede
- Setup de avaliação simplificado

**Trade-off**: Não demonstra separação real de entidades. Em produção seriam apps ou servidores distintos.

---

## Identidade e Criptografia

### Credo (Aries Framework JavaScript) como agente SSI

**Escolha**: @credo-ts/core com módulos Askar e AnonCreds.

**Razões**:
- Framework SSI de referência da OpenWallet Foundation
- Gerencia wallet criptografado (Aries Askar via @hyperledger/aries-askar-react-native)
- Suporta DID methods (did:key, did:peer) via `agent.dids.create()`
- Integra AnonCreds module para registro de schemas e credential definitions

**Alternativas avaliadas**:
- Gerenciamento manual de chaves (Ed25519 via @noble/ed25519 + armazenamento próprio): mais simples, mas reimplementa funcionalidades que Credo já resolve
- Veramo: menos suporte a AnonCreds

**Configuração**:
- Wallet: `academic-wallet`, key derivation: Argon2IMod
- Módulos: `AskarModule({ariesAskar})`, `AnonCredsModule({anoncreds, registries: []})`
- Sem DIDComm transport (app usa clipboard)

---

### DID Methods: did:key, did:peer, did:web

**Escolha**: Três métodos sem dependência de blockchain.

- **did:key**: Para chaves de assinatura do titular e emissor. Simples, auto-resolvível.
- **did:peer**: Para interações peer-to-peer (disponível, não usado nos cenários atuais).
- **did:web**: Para identidade institucional do emissor (UFSC). Formatação local — não publica documento DID.

**Alternativas avaliadas**: did:ethr (requer Ethereum), did:sov (requer ledger Indy/Sovrin). Ambas adicionam dependência de infraestrutura que foge do escopo do protótipo.

**Trade-off**: did:web sem publicação real do documento DID. Em produção, a UFSC publicaria o DID document no domínio.

---

### Ed25519 para assinaturas (SD-JWT)

CryptoService usa `@noble/ed25519` para assinar credenciais SD-JWT e apresentações. Assinaturas de 64 bytes. SHA-256 via `crypto-js` para hashing.

O agente Credo gerencia suas próprias chaves Ed25519 via Askar internamente.

---

### Armazenamento criptografado

**Escolha**: `react-native-encrypted-storage` (AES-256, chaves gerenciadas pelo Keystore do Android).

Não usa `react-native-keychain`.

**Alternativas avaliadas**: AsyncStorage (não criptografado), SQLite com SQLCipher (overhead desnecessário).

**Trade-off**: Sem backup ou sincronização. Dados perdidos se o dispositivo for perdido.

---

### Cadeia de confiança PKI para emissores

**Escolha**: TrustChainService implementa uma hierarquia de emissores confiáveis inspirada em PKI (Public Key Infrastructure), usando certificados Ed25519 em vez de X.509.

**Razões**:
- Em ambientes reais, credenciais acadêmicas são emitidas por departamentos que operam sob a autoridade de uma instituição raiz (UFSC → CTC → INE).
- Verificar apenas a assinatura da credencial não garante que o emissor é legítimo — qualquer detentor de chave Ed25519 pode assinar.
- A cadeia de confiança permite validar que o emissor foi autorizado pela âncora raiz, percorrendo a cadeia até a raiz e verificando cada certificado.

**Alternativas avaliadas**:
- **X.509/TLS certificates**: Complexidade desnecessária para um protótipo acadêmico; não se integra com DIDs.
- **Trust registries on-chain**: Dependência de ledger externa; este protótipo opera totalmente offline.
- **Lista estática de emissores confiáveis**: Simples mas não escalável e sem hierarquia.

**Trade-offs**:
- Modelo hierárquico centralizado (raiz única), diferente do modelo descentralizado de uma web-of-trust.
- Cadeia de confiança é local — não resolvida via rede. Em produção, os certificados seriam publicados em um registry público.
- Retrocompatível: se nenhuma cadeia estiver configurada, a verificação ignora este passo.

---

## Credenciais e Provas

### Dois formatos de credencial: SD-JWT e AnonCreds

Conforme definido na tese (Seção 6.3, Tabela 7), o protótipo implementa ambos os formatos para demonstrar trade-offs.

**SD-JWT**:
- Header/payload JSON assinado com Ed25519
- Divulgação seletiva por atributo: apresentação revela apenas os campos selecionados
- Proof type: `JsonWebSignature2020`
- Implementação: `CredentialService.signCredentialAsSDJWT()`

**AnonCreds**:
- CL-signatures via `@hyperledger/anoncreds-react-native`
- Divulgação seletiva com unlinkability (credencial e apresentação não são correlacionáveis)
- Suporta predicados numéricos (e.g., age >= 18) sem revelar o valor
- Proof type: `CLSignature2023`
- Implementação: `AnonCredsService.issueCredentialFull()`

**Trade-off**: AnonCreds é mais complexo e requer mais artefatos (schema, credential definition, link secret). SD-JWT é mais simples mas não provê unlinkability.

---

### AnonCreds direto (sem ledger)

**Escolha**: Usar `@hyperledger/anoncreds-react-native` diretamente, sem registro de schemas/credential definitions em ledger.

**Razões**:
- Conforme recomendado na tese – sem dependência de infraestrutura Indy/Sovrin
- Artefatos (schema, credential definition, key correctness proof) persistidos localmente via StorageService com prefixo `anoncreds_`
- Protocolo completo: Schema.create → CredentialDefinition.create → LinkSecret.create → Offer → Request → Credential → Process → Presentation → Verify
- Registries vazios (`registries: []`) no AnonCredsModule do Credo

**Alternativa avaliada**: Usar módulo AnonCreds do Credo com registry (AnonCredsCredentialFormatService). Requer ledger ou registry mock, adiciona complexidade sem benefício para o protótipo.

**Trade-off**: Sem revogação de credenciais via accumulator (requer registry). Sem verificação distribuída de schemas.

---

### Provas ZKP via mopro (Groth16/Circom)

**Escolha**: `mopro-ffi` para execução de circuitos Circom com provas Groth16.

**Razões**:
- Conforme tese (Tabela 7): mopro atribuído ao papel de "ZKP circuit compilation"
- Três circuitos: `age_range`, `status_check`, `nullifier`
- Cada circuito requer arquivo `.zkey` incluído na build
- `generateCircomProof()` e `verifyCircomProof()` da lib mopro-ffi

**Alternativa avaliada**: Snarkjs puro em JavaScript — performance insuficiente em dispositivos móveis.

**Trade-off**: Circuitos devem ser pré-compilados. Adicionar novo circuito requer compilação off-chain e inclusão do `.zkey` na build.

---

### Arquitetura dual de provas

O sistema suporta duas abordagens de ZKP, usadas em contextos diferentes:

| Abordagem | Biblioteca | Uso |
|---|---|---|
| CL-signatures (AnonCreds) | @hyperledger/anoncreds-react-native | Divulgação seletiva com unlinkability, predicados integrados |
| Groth16 (Circom circuits) | mopro-ffi | Provas customizadas: faixa etária, verificação de status, nullifiers |

Ambas coexistem. AnonCreds é usado quando a credencial é emitida nesse formato. Groth16 é usado em cenários que requerem provas customizadas sobre credenciais SD-JWT.

---

### Presentation Exchange (PEX)

**Escolha**: Formato PEX (DIF) para requisições de apresentação.

**Razões**: Padrão da indústria, expressivo (JSONPath, filtros), parte do OpenID4VP.

**Trade-off**: Complexidade de parsing. A implementação atual não suporta todas as funcionalidades do PEX (e.g., submission_requirements).

---

## Transporte e Armazenamento

### Clipboard como transporte padrão

**Escolha**: Credenciais e apresentações transferidas via clipboard do sistema operacional.

**Razões**: O foco do protótipo é a camada criptográfica, não o transporte. Clipboard elimina complexidade de rede e permite demonstração em um único dispositivo.

**Trade-off**: Experiência de uso não realista. Em produção, seria substituído por DIDComm ou OpenID4VP.

---

### EudiTransportService como camada opcional

`EudiTransportService` encapsula `@openwallet-foundation/eudi-wallet-kit-react-native` para BLE (ISO 18013-5) e OpenID4VP. O módulo EUDI é carregado via `require()` dinâmico — se indisponível, o serviço opera em modo clipboard.

**Status**: Integração parcial. A API está implementada mas não é usada nos cenários atuais da UI. Existe para demonstrar como o protótipo pode evoluir para transporte real.

---

## Interface

### Modal de consentimento

O titular vê a lista de atributos solicitados e seleciona quais revelar antes de gerar a apresentação. Conformidade com LGPD.

### Painel de logs

Todas as operações criptográficas são registradas via `LogService` e visíveis na tela LogsScreen. Armazenamento em memória apenas (não persistido).

### Glossário

Tela com termos SSI definidos. Reduz barreira para avaliadores sem conhecimento prévio em SSI.

---

## Testes

### Property-based testing com fast-check

**Escolha**: fast-check 4.6.0 com Jest 29.x.

**Razões**: Valida propriedades formais das operações criptográficas com inputs gerados aleatoriamente. Encontra edge cases que testes unitários manuais não cobrem.

Propriedades validadas incluem: determinismo de hash, verificação de assinatura, round-trip de credencial (issue → parse → verify), consistência de divulgação seletiva.

### Testes E2E

Seis cenários E2E que executam o fluxo completo (emissão → apresentação → verificação) com dados gerados via fast-check:
- Fluxo completo SD-JWT
- Restaurante universitário (divulgação seletiva)
- Eleições (nullifier)
- Faixa etária (range proof)
- Acesso a laboratório
- Estado de navegação

---

## Decisões Futuras (Pós-MVP)

### Revogação de credenciais

Opções: Status List 2021 (W3C, bitmap), Accumulator-based (AnonCreds nativo, requer registry).

### Backup

Opções: Backup criptografado em nuvem, seed phrase, social recovery.

### Transporte em produção

Opções: DIDComm (DIF), OpenID4VP sobre HTTP (OIDF), BLE via EUDI kit.
