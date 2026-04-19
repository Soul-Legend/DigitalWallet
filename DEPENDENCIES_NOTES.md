# Notas sobre Dependências

## Status das Dependências Criptográficas

Este documento lista o status de cada dependência criptográfica e possíveis alternativas.

### ✅ Disponíveis no NPM

1. **@credo-ts/core** (v0.5.3)
   - Status: Disponível
   - Repositório: https://github.com/openwallet-foundation/credo-ts
   - Uso: Framework principal para SSI

2. **zustand** (v4.5.0)
   - Status: Disponível
   - Repositório: https://github.com/pmndrs/zustand
   - Uso: Gerenciamento de estado

3. **@react-navigation/native** e **@react-navigation/native-stack**
   - Status: Disponível
   - Repositório: https://reactnavigation.org/
   - Uso: Navegação entre telas

### ⚠️ Podem Precisar de Configuração Especial

4. **@hyperledger/anoncreds-react-native** (v0.2.2)
   - Status: Pode precisar de build nativo
   - Repositório: https://github.com/hyperledger/anoncreds-rs
   - Alternativa: Usar @hyperledger/anoncreds-nodejs para testes
   - Uso: Credenciais anônimas e ZKP

5. **@sd-jwt/sd-jwt-vc** (v0.7.0)
   - Status: Verificar disponibilidade
   - Repositório: https://github.com/openwallet-foundation-labs/sd-jwt-js
   - Alternativa: Implementar SD-JWT manualmente com jose
   - Uso: Selective Disclosure JWT

### ❓ Status Incerto / Podem Não Existir

6. **mopro-react-native-package** (v0.1.0)
   - Status: Pode não estar publicado
   - Repositório: https://github.com/zkmopro/mopro
   - Alternativa: Usar apenas AnonCreds para ZKP
   - Uso: Otimização de circuitos ZKP

7. **eudi-wallet-kit-react-native** — REMOVIDO
   - Status: Pacote `@openwallet-foundation/eudi-wallet-kit-react-native` foi removido do projeto.
   - Motivo: Sem implementação React Native estável e amplamente adotada de ISO 18013-5 (mDoc proximity) e OpenID4VP. Os modos `proximity`/`remote` foram retirados; o protótipo opera em `clipboard` e `qrcode` apenas.
   - Substituto: `src/services/TransportService.ts` (modo holder) + `react-native-qrcode-svg` (já era dependência) para o modo QR code.

8. **react-native-secure-sign** (v1.0.0)
   - Status: Pode não existir com este nome
   - Alternativa: react-native-keychain ou @react-native-community/async-storage
   - Uso: Armazenamento seguro de chaves

## Estratégia de Implementação

### Fase 1: Dependências Core (Task 1 - Atual)
- Configurar projeto base
- Instalar dependências disponíveis
- Criar estrutura de pastas

### Fase 2: Implementação com Mocks (Tasks 2-5)
- Implementar interfaces de serviços
- Usar mocks para funcionalidades criptográficas
- Focar na lógica de negócio e UI

### Fase 3: Integração Real (Tasks 6+)
- Substituir mocks por implementações reais
- Integrar bibliotecas disponíveis
- Implementar alternativas para bibliotecas indisponíveis

## Alternativas Recomendadas

### Para Armazenamento Seguro
```bash
npm install react-native-keychain
# ou
npm install @react-native-async-storage/async-storage
npm install react-native-encrypted-storage
```

### Para Operações Criptográficas
```bash
npm install react-native-crypto
npm install crypto-js
npm install jose  # Para JWT/JWS
```

### Para ZKP (se bibliotecas nativas não funcionarem)
- Implementar provas simplificadas
- Usar apenas hashing para demonstração
- Focar em SD-JWT que é mais simples

## Comandos de Instalação Recomendados

```bash
# Instalar dependências base primeiro
npm install react react-native zustand
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# Tentar instalar dependências criptográficas
npm install @credo-ts/core --legacy-peer-deps
npm install @sd-jwt/sd-jwt-vc --legacy-peer-deps

# Instalar alternativas para armazenamento
npm install react-native-keychain
npm install react-native-encrypted-storage

# Instalar ferramentas crypto JavaScript
npm install crypto-js
npm install jose
```

## Próximos Passos

1. Executar `npm install` com as dependências disponíveis
2. Comentar dependências problemáticas no package.json
3. Implementar serviços com interfaces TypeScript
4. Adicionar implementações reais conforme bibliotecas ficam disponíveis
