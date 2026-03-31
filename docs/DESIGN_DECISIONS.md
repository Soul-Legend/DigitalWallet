# Decisões de Design e Trade-offs

## Introdução

Este documento registra as principais decisões de design tomadas durante o desenvolvimento da Carteira de Identidade Acadêmica, incluindo as razões, alternativas consideradas e trade-offs aceitos.

## Índice

1. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
2. [Criptografia e Segurança](#criptografia-e-segurança)
3. [Protocolos e Padrões](#protocolos-e-padrões)
4. [Interface e Experiência do Usuário](#interface-e-experiência-do-usuário)
5. [Testes e Qualidade](#testes-e-qualidade)
6. [Performance e Otimização](#performance-e-otimização)

---

## Arquitetura e Tecnologias

### Decisão 1: React Native como Framework

**Escolha**: React Native 0.76.5 com TypeScript

**Razões**:
- Cross-platform (Android/iOS) com código compartilhado
- Acesso a APIs nativas de segurança (Keychain, Secure Enclave)
- Ecossistema maduro de bibliotecas criptográficas
- Performance adequada para operações criptográficas
- Suporte à Nova Arquitetura (TurboModules)

**Alternativas Consideradas**:
- **Flutter**: Boa performance, mas ecossistema SSI menos maduro
- **Native Android (Kotlin)**: Melhor performance, mas sem cross-platform
- **Progressive Web App**: Limitações de acesso a hardware seguro

**Trade-offs Aceitos**:
- ✅ Desenvolvimento mais rápido
- ✅ Código compartilhado entre plataformas
- ❌ Performance ligeiramente inferior ao nativo puro
- ❌ Tamanho do bundle maior

---

### Decisão 2: Zustand para State Management

**Escolha**: Zustand ao invés de Redux ou Context API

**Razões**:
- API simples e minimalista
- TypeScript first-class support
- Sem boilerplate
- Performance superior (menos re-renders)
- Tamanho pequeno (~1KB)

**Alternativas Consideradas**:
- **Redux**: Muito boilerplate, complexidade desnecessária para MVP
- **Context API**: Performance inferior, prop drilling
- **MobX**: Curva de aprendizado, magic demais

**Trade-offs Aceitos**:
- ✅ Código mais limpo e legível
- ✅ Menos código para manter
- ❌ Menos recursos avançados (middleware, time-travel debugging)
- ❌ Comunidade menor que Redux

---

### Decisão 3: Transferência via Área de Transferência

**Escolha**: Usar clipboard ao invés de rede (HTTP/BLE)

**Razões**:
- Foco em validação criptográfica, não em transporte
- Simplifica testes e debugging
- Reduz complexidade de rede
- MVP mais rápido
- Abstrai protocolos de transporte

**Alternativas Consideradas**:
- **HTTP/HTTPS**: Requer servidor, certificados, complexidade de rede
- **Bluetooth Low Energy**: Complexo, problemas de pareamento
- **QR Codes**: Limitação de tamanho, múltiplos scans

**Trade-offs Aceitos**:
- ✅ Desenvolvimento mais rápido
- ✅ Testes mais simples
- ✅ Foco em criptografia
- ❌ Experiência do usuário menos fluida
- ❌ Não demonstra protocolos de transporte reais

**Nota**: Em produção, seria substituído por DIDComm ou OpenID4VP sobre HTTP/BLE.

---

### Decisão 4: Módulos Simulados em um Único App

**Escolha**: Emissor, Titular e Verificador no mesmo aplicativo

**Razões**:
- Demonstração completa do ecossistema
- Facilita testes E2E
- Reduz complexidade de setup
- Ideal para MVP e validação de conceito

**Alternativas Consideradas**:
- **Apps separados**: Mais realista, mas complexo para demonstração
- **Backend separado**: Requer infraestrutura, deploy

**Trade-offs Aceitos**:
- ✅ Setup simples
- ✅ Testes mais fáceis
- ✅ Demonstração autocontida
- ❌ Menos realista
- ❌ Não demonstra separação de entidades

---

## Criptografia e Segurança

### Decisão 5: Ed25519 como Algoritmo de Assinatura

**Escolha**: EdDSA com curva Ed25519

**Razões**:
- Assinaturas pequenas (64 bytes)
- Verificação muito rápida
- Segurança comprovada (equivalente a RSA 3072-bit)
- Amplamente suportado em SSI
- Padrão em W3C DIDs e VCs

**Alternativas Consideradas**:
- **ECDSA (secp256k1)**: Usado em Bitcoin, mas mais lento
- **RSA**: Assinaturas grandes, mais lento
- **BLS**: Agregação de assinaturas, mas menos suportado

**Trade-offs Aceitos**:
- ✅ Performance excelente
- ✅ Assinaturas compactas
- ✅ Amplamente suportado
- ❌ Não permite agregação de assinaturas
- ❌ Curva única (sem flexibilidade)

---

### Decisão 6: SHA-256 para Hashing

**Escolha**: SHA-256 como função de hash padrão

**Razões**:
- Segurança comprovada
- Amplamente suportado
- Performance adequada
- Padrão da indústria

**Alternativas Consideradas**:
- **SHA-512**: Mais seguro, mas hashes maiores
- **SHA-3**: Mais moderno, mas menos suportado
- **BLAKE2**: Mais rápido, mas menos conhecido

**Trade-offs Aceitos**:
- ✅ Compatibilidade máxima
- ✅ Segurança adequada
- ❌ Não é o mais rápido
- ❌ Não é o mais moderno

---

### Decisão 7: Armazenamento Criptografado Local

**Escolha**: react-native-encrypted-storage + react-native-keychain

**Razões**:
- Criptografia AES-256 automática
- Integração com Keychain/Keystore do OS
- Chaves privadas isoladas
- Sem dependência de servidor

**Alternativas Consideradas**:
- **AsyncStorage**: Não criptografado
- **SQLite com SQLCipher**: Mais complexo, overhead desnecessário
- **Cloud Storage**: Requer rede, privacidade comprometida

**Trade-offs Aceitos**:
- ✅ Segurança máxima
- ✅ Privacidade preservada
- ✅ Offline-first
- ❌ Sem backup automático
- ❌ Perda de dados se dispositivo perdido

---

## Protocolos e Padrões

### Decisão 8: Suporte a SD-JWT e AnonCreds

**Escolha**: Implementar ambos os formatos

**Razões**:
- SD-JWT: Padrão IETF, divulgação seletiva simples
- AnonCreds: ZKP avançadas, predicados complexos
- Demonstra flexibilidade do sistema
- Casos de uso diferentes

**Alternativas Consideradas**:
- **Apenas SD-JWT**: Mais simples, mas sem ZKP
- **Apenas AnonCreds**: ZKP completo, mas complexo
- **JSON-LD com BBS+**: Muito complexo para MVP

**Trade-offs Aceitos**:
- ✅ Flexibilidade máxima
- ✅ Demonstra múltiplos protocolos
- ❌ Maior complexidade
- ❌ Mais código para manter

---

### Decisão 9: Presentation Exchange (PEX) para Requisições

**Escolha**: Formato PEX do DIF

**Razões**:
- Padrão da indústria (DIF)
- Expressivo (JSONPath, filtros, predicados)
- Suportado por múltiplas implementações
- Parte do OpenID4VP

**Alternativas Consideradas**:
- **Formato customizado**: Mais simples, mas não interoperável
- **GraphQL**: Expressivo, mas não padrão SSI
- **SPARQL**: Muito complexo

**Trade-offs Aceitos**:
- ✅ Interoperabilidade
- ✅ Expressividade
- ❌ Complexidade de parsing
- ❌ Curva de aprendizado

---

### Decisão 10: Métodos DID Suportados

**Escolha**: did:key, did:peer, did:web

**Razões**:
- **did:key**: Simples, sem registro, ideal para titular
- **did:peer**: Peer-to-peer, sem blockchain
- **did:web**: Baseado em DNS, ideal para instituições

**Alternativas Consideradas**:
- **did:ethr**: Requer Ethereum, complexo
- **did:ion**: Requer Bitcoin, complexo
- **did:sov**: Requer Sovrin, permissionado

**Trade-offs Aceitos**:
- ✅ Simplicidade
- ✅ Sem blockchain
- ✅ Sem custos
- ❌ Sem revogação nativa
- ❌ did:web depende de DNS

---

## Interface e Experiência do Usuário

### Decisão 11: Modal de Consentimento Explícito

**Escolha**: Modal com lista de atributos e checkboxes

**Razões**:
- Transparência total
- Controle do usuário
- GDPR/LGPD compliance
- Educação do usuário

**Alternativas Consideradas**:
- **Aprovação automática**: Mais rápido, mas sem controle
- **Aprovação por categoria**: Menos granular
- **Aprovação com timeout**: Confuso

**Trade-offs Aceitos**:
- ✅ Transparência máxima
- ✅ Controle granular
- ❌ Mais cliques
- ❌ Pode ser ignorado pelo usuário

---

### Decisão 12: Painel de Logs Visível

**Escolha**: Logs criptográficos acessíveis ao usuário

**Razões**:
- Transparência das operações
- Educação sobre SSI
- Debugging facilitado
- Auditoria

**Alternativas Consideradas**:
- **Logs apenas para desenvolvedores**: Menos transparente
- **Logs remotos**: Privacidade comprometida
- **Sem logs**: Caixa preta

**Trade-offs Aceitos**:
- ✅ Transparência total
- ✅ Educação do usuário
- ❌ Pode confundir usuários não técnicos
- ❌ Ocupa espaço na UI

---

### Decisão 13: Glossário Integrado

**Escolha**: Tela de glossário com termos SSI

**Razões**:
- Educação do usuário
- Reduz curva de aprendizado
- Acessibilidade
- Referência rápida

**Alternativas Consideradas**:
- **Tooltips inline**: Menos intrusivo, mas menos completo
- **Documentação externa**: Requer sair do app
- **Sem glossário**: Assume conhecimento prévio

**Trade-offs Aceitos**:
- ✅ Educação integrada
- ✅ Sempre disponível
- ❌ Mais uma tela
- ❌ Manutenção de conteúdo

---

## Testes e Qualidade

### Decisão 14: Property-Based Testing

**Escolha**: fast-check com 100+ iterações por propriedade

**Razões**:
- Encontra edge cases automaticamente
- Valida propriedades matemáticas
- Complementa testes unitários
- Confiança em operações criptográficas

**Alternativas Consideradas**:
- **Apenas testes unitários**: Menos cobertura
- **Apenas testes E2E**: Mais lentos, menos granulares
- **Formal verification**: Muito complexo para MVP

**Trade-offs Aceitos**:
- ✅ Cobertura excelente
- ✅ Encontra bugs sutis
- ❌ Testes mais lentos
- ❌ Curva de aprendizado

---

### Decisão 15: 39 Propriedades de Correção

**Escolha**: Definir e validar 39 propriedades formais

**Razões**:
- Especificação formal do sistema
- Validação matemática de correção
- Documentação executável
- Confiança em operações críticas

**Alternativas Consideradas**:
- **Menos propriedades**: Menos cobertura
- **Mais propriedades**: Diminishing returns
- **Sem propriedades formais**: Menos rigor

**Trade-offs Aceitos**:
- ✅ Especificação formal completa
- ✅ Alta confiança
- ❌ Mais trabalho inicial
- ❌ Manutenção de testes

---

## Performance e Otimização

### Decisão 16: Cache de Documentos DID

**Escolha**: Cachear documentos DID resolvidos

**Razões**:
- Reduz latência em validações
- Menos operações de rede (futuro)
- Melhora UX

**Alternativas Consideradas**:
- **Sem cache**: Mais lento
- **Cache persistente**: Pode ficar desatualizado
- **Cache com TTL**: Mais complexo

**Trade-offs Aceitos**:
- ✅ Performance melhorada
- ✅ Menos latência
- ❌ Pode ficar desatualizado
- ❌ Usa mais memória

---

### Decisão 17: Operações Assíncronas

**Escolha**: Todas as operações criptográficas são async

**Razões**:
- UI permanece responsiva
- Não bloqueia thread principal
- Permite indicadores de loading
- Melhor UX

**Alternativas Consideradas**:
- **Operações síncronas**: Mais simples, mas bloqueia UI
- **Web Workers**: Mais complexo, overhead

**Trade-offs Aceitos**:
- ✅ UI responsiva
- ✅ Melhor UX
- ❌ Código mais complexo (async/await)
- ❌ Mais difícil de debugar

---

### Decisão 18: Lazy Loading de Componentes

**Escolha**: Componentes carregados sob demanda

**Razões**:
- Reduz tempo de inicialização
- Menor uso de memória
- Melhor performance

**Alternativas Consideradas**:
- **Carregar tudo no início**: Mais simples, mas mais lento
- **Code splitting agressivo**: Mais complexo

**Trade-offs Aceitos**:
- ✅ Inicialização mais rápida
- ✅ Menos memória
- ❌ Pequeno delay ao navegar
- ❌ Mais complexidade

---

## Decisões Futuras (Pós-MVP)

### Revogação de Credenciais

**Opções**:
1. **Status List 2021**: Padrão W3C, bitmap eficiente
2. **Accumulator-based**: ZKP, mais privado
3. **Blockchain-based**: Descentralizado, mas complexo

**Recomendação**: Status List 2021 (balanço entre simplicidade e privacidade)

---

### Backup e Sincronização

**Opções**:
1. **Backup criptografado em nuvem**: Conveniente, mas requer confiança
2. **Seed phrase**: Descentralizado, mas UX ruim
3. **Social recovery**: Inovador, mas complexo

**Recomendação**: Backup criptografado com senha mestra

---

### Transporte de Dados

**Opções**:
1. **DIDComm**: Padrão DIF, mensagens criptografadas
2. **OpenID4VP sobre HTTP**: Padrão OIDF, amplamente suportado
3. **BLE**: Offline, mas complexo

**Recomendação**: OpenID4VP sobre HTTP (interoperabilidade máxima)

---

## Lições Aprendidas

### O que funcionou bem

1. **Property-Based Testing**: Encontrou bugs que testes unitários não pegariam
2. **Zustand**: State management simples e eficaz
3. **TypeScript**: Preveniu muitos bugs em tempo de compilação
4. **Área de transferência**: Simplificou MVP significativamente
5. **Logs visíveis**: Facilitou debugging e educação

### O que poderia ser melhor

1. **Operações ZKP**: Muito lentas, precisam de otimização
2. **Tamanho do bundle**: Bibliotecas criptográficas são grandes
3. **Testes E2E**: Flaky em alguns casos
4. **Documentação inline**: Poderia ter mais comentários no código
5. **Tratamento de erros**: Algumas mensagens poderiam ser mais claras

### Mudanças que faríamos

1. **Usar mopro desde o início**: Para otimizar ZKP
2. **Mais testes de integração**: Antes de testes E2E
3. **Design system**: Para consistência visual
4. **Internacionalização**: Desde o início
5. **Analytics**: Para entender uso real

---

## Conclusão

As decisões de design foram guiadas por:
- **Simplicidade**: MVP focado em validação de conceito
- **Padrões**: Conformidade com W3C, DIF, IETF
- **Segurança**: Criptografia forte, privacidade preservada
- **Educação**: Transparência e glossário integrado
- **Qualidade**: Property-based testing e 39 propriedades formais

O resultado é um MVP funcional que demonstra a viabilidade técnica de SSI para credenciais acadêmicas, com base sólida para evolução futura.

---

**Versão**: 1.0.0  
**Última atualização**: Março 2026
