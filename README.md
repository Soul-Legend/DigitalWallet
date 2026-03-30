# Carteira Identidade Acadêmica

Sistema de Identidade Auto-Soberana (SSI) para credenciais acadêmicas verificáveis.

## Descrição

MVP de uma carteira digital de identidade acadêmica baseada em SSI que demonstra a viabilidade técnica de emissão, custódia e verificação de credenciais verificáveis usando React Native para Android.

## Tecnologias

- React Native 0.76.5 com TypeScript
- Nova Arquitetura (TurboModules)
- React Navigation para navegação
- Zustand para gerenciamento de estado
- Bibliotecas criptográficas:
  - @credo-ts/core
  - @hyperledger/anoncreds-react-native
  - mopro-react-native-package
  - @sd-jwt/sd-jwt-vc
  - eudi-wallet-kit-react-native
  - react-native-secure-sign

## Pré-requisitos

- Node.js >= 18
- Java Development Kit (JDK) 17
- Android Studio
- Android SDK (API 24+)

## Instalação

```bash
# Instalar dependências
npm install

# Para Android
cd android
./gradlew clean
cd ..

# Iniciar Metro bundler
npm start

# Em outro terminal, executar no Android
npm run android
```

## Estrutura do Projeto

```
src/
├── screens/       # Telas da aplicação
├── services/      # Serviços (crypto, DID, credential, etc.)
├── stores/        # Zustand stores
├── types/         # Definições TypeScript
└── utils/         # Funções utilitárias
```

## Módulos

1. **Emissor**: Emissão de credenciais acadêmicas
2. **Titular**: Gerenciamento e apresentação de credenciais
3. **Verificador**: Validação de apresentações verificáveis
4. **Logs**: Monitoramento de eventos criptográficos

## Status

Projeto em desenvolvimento - Task 1 completa (configuração inicial)
