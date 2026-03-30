# Guia de Configuração do Ambiente

## Configuração do Projeto React Native

Este projeto foi configurado com React Native 0.76.5 e TypeScript, utilizando a Nova Arquitetura (TurboModules).

## Dependências Instaladas

### Principais
- **React Native 0.76.5**: Framework principal
- **TypeScript**: Tipagem estática
- **React Navigation**: Navegação entre telas
- **Zustand**: Gerenciamento de estado

### Bibliotecas Criptográficas
- **@credo-ts/core**: Framework SSI
- **@hyperledger/anoncreds-react-native**: Credenciais anônimas
- **mopro-react-native-package**: Otimização de circuitos ZKP
- **@sd-jwt/sd-jwt-vc**: Selective Disclosure JWT
- **eudi-wallet-kit-react-native**: Kit de carteira EUDI
- **react-native-secure-sign**: Assinatura segura com hardware

## Configuração do Android

### Requisitos
- Android Studio Arctic Fox ou superior
- JDK 17
- Android SDK API 24 (Android 7.0) ou superior
- Android SDK Build Tools 34.0.0

### Configurações Importantes

1. **Nova Arquitetura Habilitada**
   - Arquivo: `android/gradle.properties`
   - Propriedade: `newArchEnabled=true`

2. **Hermes Engine**
   - Habilitado por padrão para melhor performance
   - Propriedade: `hermesEnabled=true`

3. **Permissões**
   - INTERNET: Para comunicação de rede (futura)
   - USE_BIOMETRIC: Para autenticação biométrica
   - USE_FINGERPRINT: Para leitura de impressão digital

## Estrutura de Pastas

```
src/
├── screens/          # Telas da aplicação
│   ├── HomeScreen.tsx
│   ├── IssuerScreen.tsx
│   ├── HolderScreen.tsx
│   ├── VerifierScreen.tsx
│   └── LogsScreen.tsx
├── services/         # Serviços (a serem implementados)
├── stores/           # Zustand stores (a serem implementados)
├── types/            # Definições TypeScript
│   └── index.ts
└── utils/            # Funções utilitárias (a serem implementadas)
```

## Próximos Passos

1. Instalar dependências: `npm install`
2. Configurar Android SDK no Android Studio
3. Executar: `npm run android`

## Navegação

O aplicativo possui 4 módulos principais:
1. **Emissor**: Emissão de credenciais
2. **Titular**: Gerenciamento de credenciais
3. **Verificador**: Validação de apresentações
4. **Logs**: Monitoramento de eventos

A navegação está configurada com React Navigation usando Native Stack Navigator.

## Observações

- O projeto está configurado para usar a Nova Arquitetura do React Native
- Todas as bibliotecas criptográficas serão integradas nas próximas tarefas
- Os serviços e stores serão implementados incrementalmente
