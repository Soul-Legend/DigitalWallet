# Carteira Identidade Acadêmica

Sistema de Identidade Auto-Soberana (SSI) para credenciais acadêmicas verificáveis baseado em React Native.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Características](#características)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Uso](#uso)
- [Arquitetura](#arquitetura)
- [Testes](#testes)
- [Documentação](#documentação)
- [Troubleshooting](#troubleshooting)
- [Contribuindo](#contribuindo)

## 🎯 Visão Geral

MVP de uma carteira digital de identidade acadêmica que demonstra a viabilidade técnica de emissão, custódia e verificação de credenciais verificáveis usando protocolos SSI (Self-Sovereign Identity).

O sistema simula o ecossistema completo em um único aplicativo Android:
- **Emissor**: Instituição (UFSC) que emite credenciais acadêmicas
- **Titular**: Estudante que armazena e gerencia suas credenciais
- **Verificador**: Sistemas que validam apresentações verificáveis
- **Logs**: Painel de monitoramento de eventos criptográficos

### Casos de Uso Implementados

1. **Restaurante Universitário**: Divulgação seletiva com SD-JWT
2. **Eleições Estudantis**: Prevenção de voto duplicado com Nullifiers
3. **Laboratórios**: Controle de acesso físico
4. **Verificação de Maioridade**: Range Proofs preservando privacidade

## ✨ Características

- ✅ Geração de identidade descentralizada (DID)
- ✅ Emissão de credenciais verificáveis (SD-JWT e AnonCreds)
- ✅ Armazenamento criptografado de credenciais
- ✅ Divulgação seletiva de atributos
- ✅ Provas de conhecimento zero (ZKP)
- ✅ Validação de apresentações verificáveis
- ✅ Prevenção de duplicação com Nullifiers
- ✅ Range Proofs para predicados matemáticos
- ✅ Painel de logs criptográficos em tempo real
- ✅ Suporte a acessibilidade (WCAG AA)
- ✅ Testes de propriedade (Property-Based Testing)

## 🛠 Tecnologias

### Core
- **React Native 0.76.5** com TypeScript
- **Nova Arquitetura** (TurboModules)
- **React Navigation** para navegação
- **Zustand** para gerenciamento de estado

### Bibliotecas Criptográficas
- **@credo-ts/core**: Framework SSI
- **@noble/ed25519**: Assinaturas digitais EdDSA
- **jose**: Operações JWT/JWS
- **crypto-js**: Funções criptográficas
- **react-native-encrypted-storage**: Armazenamento seguro
- **react-native-keychain**: Gerenciamento de chaves

### Testes
- **Jest**: Framework de testes
- **fast-check**: Property-Based Testing
- **React Native Testing Library**: Testes de componentes

## 📦 Pré-requisitos

- **Node.js** >= 18
- **Java Development Kit (JDK)** 17
- **Android Studio** Arctic Fox ou superior
- **Android SDK** API 24+ (Android 7.0+)
- **Android SDK Build Tools** 34.0.0

## 🚀 Instalação

### 1. Clonar o repositório

```bash
git clone <repository-url>
cd CarteiraIdentidadeAcademica
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar Android

Crie o arquivo `android/local.properties`:

```properties
sdk.dir=C:\\Users\\[SEU_USUARIO]\\AppData\\Local\\Android\\Sdk
```

### 4. Executar o aplicativo

```bash
# Terminal 1: Iniciar Metro Bundler
npm start

# Terminal 2: Executar no Android
npm run android
```

Para instruções detalhadas, consulte [INSTALLATION.md](./INSTALLATION.md).

## 📱 Uso

### Fluxo Completo

1. **Inicialização**: Na primeira execução, o app gera automaticamente a identidade DID do titular
2. **Emissão**: Acesse o módulo Emissor, preencha os dados acadêmicos e emita a credencial
3. **Armazenamento**: No módulo Titular, cole a credencial emitida para armazená-la
4. **Verificação**: No módulo Verificador, selecione um cenário e gere a requisição
5. **Apresentação**: No módulo Titular, cole a requisição, aprove o consentimento e gere a apresentação
6. **Validação**: No módulo Verificador, cole a apresentação para validá-la
7. **Logs**: Acompanhe todos os eventos criptográficos no painel de Logs

Para guia detalhado de uso, consulte [docs/USER_GUIDE.md](./docs/USER_GUIDE.md).

## 🏗 Arquitetura

### Estrutura de Pastas

```
src/
├── screens/              # Telas da aplicação
│   ├── HomeScreen.tsx
│   ├── InitializationScreen.tsx
│   ├── IssuerScreen.tsx
│   ├── HolderScreen.tsx
│   ├── VerifierScreen.tsx
│   ├── LogsScreen.tsx
│   └── GlossaryScreen.tsx
├── services/             # Camada de serviços
│   ├── CryptoService.ts
│   ├── DIDService.ts
│   ├── CredentialService.ts
│   ├── PresentationService.ts
│   ├── VerificationService.ts
│   ├── StorageService.ts
│   ├── LogService.ts
│   └── ErrorHandler.ts
├── components/           # Componentes reutilizáveis
│   ├── CredentialCard.tsx
│   ├── ConsentModal.tsx
│   ├── AttributeSelector.tsx
│   ├── LoadingIndicator.tsx
│   ├── ErrorMessage.tsx
│   └── SuccessMessage.tsx
├── stores/               # Zustand stores
│   └── useAppStore.ts
├── types/                # Definições TypeScript
│   └── index.ts
└── utils/                # Funções utilitárias
    ├── accessibility.ts
    ├── errorMessages.ts
    ├── glossary.ts
    ├── performanceCache.ts
    └── theme.ts
```

### Fluxo de Dados

```
UI Layer (React Components)
    ↓
Navigation Layer (React Navigation)
    ↓
Service Layer (Business Logic)
    ↓
Crypto Libraries (Native Modules)
    ↓
Secure Storage (OS-level encryption)
```

Para detalhes arquiteturais, consulte [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 🧪 Testes

### Executar todos os testes

```bash
npm test
```

### Executar testes com saída detalhada

```bash
npm run test:verbose
```

### Cobertura de Testes

- **Testes Unitários**: Serviços, utilitários e componentes
- **Testes de Propriedade**: 39 propriedades de correção validadas
- **Testes de Integração**: 6 fluxos E2E completos

Cada teste de propriedade valida pelo menos 100 iterações com dados gerados aleatoriamente.

## 📚 Documentação

- [Guia de Instalação](./INSTALLATION.md)
- [Guia de Configuração](./SETUP.md)
- [Guia do Usuário](./docs/USER_GUIDE.md)
- [Documentação de Arquitetura](./docs/ARCHITECTURE.md)
- [Documentação de APIs](./docs/API_DOCUMENTATION.md)
- [Decisões de Design](./docs/DESIGN_DECISIONS.md)
- [Guia de Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Guia de Acessibilidade](./ACCESSIBILITY_MIGRATION_GUIDE.md)

## 🔧 Troubleshooting

### Problemas Comuns

**Erro: "SDK location not found"**
```bash
# Crie android/local.properties com o caminho do SDK
echo "sdk.dir=C:\\Users\\[SEU_USUARIO]\\AppData\\Local\\Android\\Sdk" > android/local.properties
```

**Erro: "Unable to load script"**
```bash
# Limpe o cache do Metro
npm start -- --reset-cache
```

**Erro de build do Android**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

Para mais soluções, consulte [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é um MVP acadêmico para demonstração de conceitos SSI.

## 🙏 Agradecimentos

- W3C Verifiable Credentials Working Group
- Hyperledger Aries/AnonCreds Community
- React Native Community

## 📞 Contato

Para questões técnicas ou sugestões, abra uma issue no repositório.

---

**Status do Projeto**: MVP Completo - Todas as funcionalidades principais implementadas e testadas.
