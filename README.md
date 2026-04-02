# Carteira de Identidade Acadêmica

Protótipo mobile de carteira de identidade digital para o contexto universitário da UFSC, baseado na adaptação da arquitetura europeia (EUDI Wallet/ARF) ao ecossistema brasileiro de confiança digital (ICP-Brasil, Gov.br).

Desenvolvido como trabalho de conclusão de curso em Ciências da Computação — UFSC, 2026.

## Escopo

O aplicativo roda em Android (React Native 0.76.5) e implementa os três papéis do modelo SSI (Issuer/Holder/Verifier) em um único app. Credenciais são trocadas via área de transferência — não há protocolos de rede ou ledger distribuído envolvidos. O transporte real (OpenID4VP, BLE) está preparado como camada opcional via `EudiTransportService`.

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.76.5, TypeScript 5.0.4 |
| Agente SSI | @credo-ts/core 0.5.3 (gerencia wallet Aries Askar, DIDs, configuração AnonCreds) |
| Credenciais CL | @hyperledger/anoncreds-react-native 0.2.2 (Schema, CredDef, Credential, Presentation com CL-signatures) |
| Provas ZK (Groth16) | mopro-ffi (compilação e execução de circuitos Circom no dispositivo) |
| Armazenamento | react-native-encrypted-storage (AES-256 via Keystore/Keychain) |
| Wallet criptográfico | @hyperledger/aries-askar-react-native 0.2.1 (Ed25519, armazenamento de chaves) |
| Transporte (opcional) | @openwallet-foundation/eudi-wallet-kit-react-native 0.1.3 (BLE, OpenID4VP) |
| Estado | Zustand 4.5.0 |
| Testes | Jest 29.x, fast-check 4.6.0 |

## Formatos de credencial suportados

- **SD-JWT**: Credencial assinada com Ed25519 via Aries Askar. Divulgação seletiva por hash de atributos (SHA-256).
- **AnonCreds**: Protocolo completo CL-signature: Schema → CredentialDefinition → Offer → Request → Credential → Presentation. Provas de predicado (ex: idade ≥ 18) e desvinculabilidade nativa.

## Provas de conhecimento zero

- **AnonCreds (CL)**: Divulgação seletiva e provas de predicado com desvinculabilidade entre apresentações. Usado para cenários padrão.
- **Groth16/Circom (mopro)**: Circuitos customizados para age_range, status_check e nullifiers de eleições. Usado quando a lógica de prova excede o que AnonCreds expressa nativamente.

## Estrutura do projeto

```
src/
├── services/
│   ├── AgentService.ts          # Singleton do agente Credo (Askar + AnonCreds modules)
│   ├── AnonCredsService.ts      # Protocolo CL-signature completo
│   ├── CredentialService.ts     # Emissão SD-JWT e AnonCreds
│   ├── CryptoService.ts         # SHA-256, Ed25519 (via @noble/ed25519)
│   ├── DIDService.ts            # did:key, did:peer, did:web (via agente Credo)
│   ├── EudiTransportService.ts  # Camada de transporte BLE/OpenID4VP (opcional)
│   ├── PresentationService.ts   # Apresentações SD-JWT, Groth16 e AnonCreds
│   ├── StorageService.ts        # Encrypted storage wrapper
│   ├── VerificationService.ts   # Validação de apresentações
│   ├── ZKProofService.ts        # Wrapper mopro-ffi para Groth16
│   ├── LogService.ts            # Registro de eventos criptográficos
│   └── ErrorHandler.ts          # Classes de erro tipadas
├── screens/                     # UI: Home, Issuer, Holder, Verifier, Logs, Glossary
├── components/                  # ConsentModal, CredentialCard, etc.
├── stores/                      # Zustand (useAppStore)
├── types/                       # TypeScript interfaces
└── utils/                       # Acessibilidade, tema, glossário
```

## Cenários de verificação implementados

1. **Restaurante Universitário**: Divulgação seletiva SD-JWT de `status_matricula` e `isencao_ru`.
2. **Eleições estudantis**: ZKP de matrícula ativa + nullifier determinístico (previne voto duplicado).
3. **Verificação de maioridade**: Range proof de `data_nascimento ≥ 18` sem revelar a data.
4. **Acesso a laboratórios**: Verificação de presença em arrays `acesso_laboratorios`/`acesso_predios`.

## Testes

Property-based testing com fast-check. Cada propriedade é testada com dados gerados aleatoriamente.

```bash
# Requer npm install --legacy-peer-deps primeiro
npx jest
```

Estrutura de testes:
- `src/services/__tests__/` — Testes unitários e property-based dos serviços
- `src/screens/__tests__/` — Testes de telas
- `src/__tests__/` — Testes E2E dos fluxos completos

## Documentação

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arquitetura e fluxos de dados
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) — APIs dos serviços
- [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md) — Decisões técnicas e trade-offs
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — Guia de uso
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — Resolução de problemas

## Limitações

- Não há ledger distribuído. Schemas e CredentialDefinitions do AnonCreds são armazenados localmente.
- O transporte é via clipboard. BLE/OpenID4VP estão disponíveis como camada opcional mas não integrados ao fluxo principal da UI.
- Emissor, titular e verificador coexistem no mesmo app (adequado para prototipagem, não para produção).
- Circuitos Circom (.zkey) precisam ser compilados e empacotados no bundle do app.
- `node_modules` não está incluso — executar `npm install --legacy-peer-deps` antes de usar.