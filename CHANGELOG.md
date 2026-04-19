# CHANGELOG

Todas as mudanças notáveis desta carteira digital são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/) e o projeto adota
versionamento incremental por fases de auditoria (P0 → P1 → P2).

---

## [Não publicado] — Auditoria completa do código + remoção do EUDI wallet-kit

Esta entrada agrupa todo o trabalho realizado na rodada atual de revisão.
A bateria de testes (`npx jest`) continua verde com **354/354** em **35 suites**;
`npx tsc --noEmit` retorna 0 erros; ESLint reporta 0 erros em código de produção
(24 avisos de variáveis não-usadas em `__tests__/` são pré-existentes).

### Removido — `@openwallet-foundation/eudi-wallet-kit-react-native`

- A dependência `@openwallet-foundation/eudi-wallet-kit-react-native@^0.1.3` foi
  removida de `package.json` (e de `package-lock.json` via `npm install`) e do
  manifesto auxiliar `package.specialized.json`.
- O serviço `src/services/EudiTransportService.ts` (~430 linhas) foi removido
  e substituído por `src/services/TransportService.ts` (~55 linhas), que mantém
  apenas os modos `clipboard` (default) e `qrcode` — os dois caminhos efetivamente
  exercitados pela UI.
- O mock `__mocks__/@openwallet-foundation/eudi-wallet-kit-react-native.ts` e o
  diretório pai foram apagados.
- O `TransportModeSelector` perdeu a opção *BLE/NFC*; as telas
  `HolderScreen` e `VerifierScreen` perderam os ramos `proximity` e os estilos
  `proximityInfo` / `proximityIcon` / `proximityText` / `proximityNote` que
  ficaram órfãos.
- Modos por proximidade BLE (ISO 18013-5 mDoc) e remoto (OpenID4VP) foram
  declarados **fora de escopo** desta versão. A justificativa está registrada em
  [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md#transporte-de-apresentações).
- Substituto comum: o QR code já era renderizado por `react-native-qrcode-svg`,
  dependência mantida; a área de transferência usa `@react-native-clipboard/clipboard`,
  já presente.

### Documentação atualizada

Todos os documentos abaixo foram revisados para refletir a remoção do EUDI lib
e demais mudanças desta rodada:

- `README.md` — stack, escopo e árvore de projeto
- `docs/ARCHITECTURE.md` — diagrama, levels de DI, mocks, mermaid de dependências
- `docs/API_DOCUMENTATION.md` — substituiu a seção `EudiTransportService` por
  `TransportService` (API enxuta com `getMode` / `setMode`)
- `docs/DESIGN_DECISIONS.md` — nova seção *Transporte de apresentações* com
  registro da decisão e plano de evolução
- `docs/TROUBLESHOOTING.md` — removida nota de instalação opcional do EUDI lib
- `INSTALLATION.md`, `SETUP.md`, `DEPENDENCIES_NOTES.md` — referências removidas

---

### Fase P0 — Correções de segurança (C1–C8)

Auditoria completa da camada criptográfica antes de qualquer refatoração.

- **C1** — `CryptoService` removeu o fallback para `Math.random()`. Se o polyfill
  `react-native-get-random-values` não estiver disponível, a operação lança
  `CryptoError` em vez de gerar bytes previsíveis.
- **C2** — `VerificationService` (AnonCreds path) deixou de retornar `true`
  silenciosamente quando os artefatos do emissor não estavam disponíveis.
  Agora lança `ValidationError`.
- **C3** — Verificação ZKP rejeita explicitamente provas Groth16 quando o
  `.zkey` do circuito não está presente ou quando os campos da prova estão
  ausentes.
- **C4** — `StorageService` ganhou um mutex *per-key* para serializar operações
  read-modify-write em arrays (credenciais, nullifiers). Operações em chaves
  diferentes continuam paralelas.
- **C5** — `LogService` impôs limite circular de 1000 entradas para evitar
  vazamento de memória.
- **C6** — `DIDService.createDidWeb` passou a validar o domínio com regex
  RFC-1123 e o path com lista branca de caracteres; portas são percent-encoded
  (`:8080` → `%3A8080`) conforme a spec W3C did:web.
- **C7** — `CredentialService` parametrizou o TTL do JWT (`exp`) via parâmetro
  do construtor `credentialTtlSeconds`, com default em
  `CREDENTIAL_DEFAULT_TTL_SECONDS = 365 dias` (`utils/constants.ts`). `iat` e
  `exp` agora são derivados de um único `nowSeconds` para evitar drift.
- **C8** — Lista branca de caracteres aceitos em paths de did:web e mensagens
  de erro padronizadas via `CryptoError`.

### Fase P1 — Reorganização arquitetural

#### A1 — Subsistema de verificação extraído

`VerificationService` foi reduzido a uma fachada e o pipeline foi materializado
em colaboradores especializados sob `src/services/verification/`:

- `PexHelpers.ts`
- `ScenarioCatalog.ts`
- `PresentationFormatValidator.ts`
- `NullifierStore.ts`
- `ResourceAccessChecker.ts`
- `PredicateChecker.ts`
- `SignatureVerifier.ts`
- `IntegrityVerifier.ts`

O parâmetro `trustChainService` foi removido do construtor de
`VerificationService` (o passo `createTrustChainStep` usa o singleton
diretamente). `container.ts` foi ajustado.

#### A2 — Subsistema de apresentações extraído

`PresentationService` ganhou builders por formato em
`src/services/presentations/`:

- `PEXValidator.ts`
- `SDJWTPresentationBuilder.ts`
- `ZKPPresentationBuilder.ts`
- `AnonCredsPresentationBuilder.ts`

#### A3 — Encoding shim

`src/services/encoding.ts` centraliza polyfills de `Buffer` / `TextEncoder`
para o Hermes do React Native 0.76.

### Fase P2 — Polimento por batches

#### Batch 1 — Tema, acessibilidade e bugs visuais

- `src/utils/accessibility.ts` ganhou implementação real de `getContrastRatio`
  conforme WCAG 2.1 (gama-expansão sRGB + luminância relativa); `parseHexColor`,
  `channelLuminance` e `relativeLuminance` foram adicionados; o try/catch
  inacessível de `isHighContrastEnabled` foi colapsado.
- `src/utils/theme.ts` — `getResponsiveSpacing` virou função de densidade real;
  `getAccessibleTextColor` substituiu uma allow-list de 4 cores por uma decisão
  baseada em luminância. O pivô usado é `0.179` (`sqrt(1.05*0.05) - 0.05`,
  recomendação W3C AERT) — o valor minimiza o pior caso de contraste.
- `src/components/LogEntry.tsx` — adicionados rótulos de operação faltantes
  `trust_chain_init` e `trust_chain_register`.

#### Batch 2 — Performance / memoização

- `src/screens/LogsScreen.tsx` — migrou de `ScrollView` para `FlatList`
  virtualizada (`initialNumToRender: 20`, `windowSize: 10`,
  `removeClippedSubviews`); `useMemo` para sortedLogs; `useCallback` estável
  em `renderItem` / `keyExtractor`.
- `src/screens/GlossaryScreen.tsx` — `useMemo` para `filteredTerms`; `CATEGORIES`
  e `CATEGORY_COLORS` movidos para escopo de módulo.
- `src/screens/VerifierScreen.tsx` — `SCENARIOS` movido para escopo de módulo;
  `election_id` agora é gerado a cada clique via `liveScenario` (apenas no
  cenário `eleicoes`), garantindo unicidade por requisição PEX.
- `src/screens/IssuerScreen.tsx` — todos os 16 sites
  `setFormData({...formData, key: value})` foram coletados em
  `updateField('key', value)`, eliminando o risco de stale state.

#### IssuerScreen reducer

- `src/screens/hooks/useIssuerState.ts` adotou `useReducer` com `formReducer`
  e união discriminada `FormAction` (`updateField` | `reset` | `replace`).
  Expõe `updateField`, `setFormData` e `resetForm` com identidades estáveis
  (todos os `useCallback` têm `[]` ou apenas dispatches estáveis nas deps).

#### Batch 3 — Tipos e estritude

- `tsconfig.json` foi unificado:
  - `module: "esnext"`, `moduleResolution: "bundler"` (alinhado com o pai
    `@react-native/typescript-config`, que define `customConditions: ["react-native"]`)
  - `strict: true`, `noFallthroughCasesInSwitch: true`
  - `include: ["src/**/*"]`, exclui `__tests__/`, `node_modules`, `docs`,
    `android`, `ios`
  - `noUnusedLocals` / `noUnusedParameters` / `noImplicitOverride` foram
    descartados porque `node_modules/uniffi-bindgen-react-native` envia
    arquivos `.ts` que vazam pelo `skipLibCheck`.

#### Batch 4 — Código morto

- `src/utils/performanceCache.ts` foi **deletado** (~360 LOC, zero importadores).
- Imports não usados removidos em `AnonCredsService.ts` (4 tipos),
  `StorageService.ts`, `TrustChainService.ts`, `VerificationSteps.ts`
  (`evaluatePredicate`, `LogService`), `GlossaryScreen.tsx`
  (`AccessibilityLabels`, `AccessibilityHints`), `IssuerScreen.tsx`
  (`Clipboard`), `theme.ts` (`Platform`).
- `ErrorHandler.logError` marcou o parâmetro `context` como `_context` para
  documentar que faz parte da API pública mas é intencionalmente não-usado.

#### Batch 5 — Lint sweep final

- `eslint --fix` limpou 157 avisos de espaço em branco no fim de linha.
- Bug real corrigido: `useIssuerState.ts:282` ganhou `resetForm` na lista de
  dependências do `useCallback` de `issueCredential`.
- 0 erros de ESLint em código de produção (24 avisos pré-existentes em
  `__tests__/`).

---

## Métricas finais

| Métrica | Estado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npx jest --silent` | 354 / 354 (35 suites) |
| ESLint (produção) | 0 erros |
| Código removido | EUDI service (~430 LOC) + performanceCache (~360 LOC) + 16 imports não usados |
| Código adicionado | TransportService (~55 LOC) + verification/ (8 colaboradores) + presentations/ (4 builders) + encoding shim |
