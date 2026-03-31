# Validação - Referência Rápida

## 🚀 Início Rápido

```bash
# 1. Executar todos os testes
npm test

# 2. Verificar cobertura
npm test -- --coverage

# 3. Buscar TODOs
grep -rn "TODO\|FIXME\|HACK" src/

# 4. Buscar simulações
grep -rn "simulate\|mock\|fake" src/ -i
```

## 📋 Checklist Rápido

### Requisitos (12 total)
- [ ] 1. Geração de Identidade
- [ ] 2. Emissão de Credenciais
- [ ] 3. Armazenamento
- [ ] 4. Apresentações Seletivas
- [ ] 5. Validação
- [ ] 6. Eleições (Nullifiers)
- [ ] 7. RU (SD-JWT)
- [ ] 8. Maioridade (Range Proofs)
- [ ] 9. Logs
- [ ] 10. Laboratórios
- [ ] 11. Segurança
- [ ] 12. Navegação

### Propriedades (39 total)
- [ ] 1-3: Identidade e Chaves
- [ ] 4-6: Emissão
- [ ] 7-10: Armazenamento
- [ ] 11-15: Apresentações
- [ ] 16-18: Validação
- [ ] 19-22: Eleições
- [ ] 23: RU
- [ ] 24-25: Maioridade
- [ ] 26-32: Logs
- [ ] 33-35: Laboratórios
- [ ] 36-37: Segurança
- [ ] 38-39: Navegação

### Testes (244 total)
- [ ] 27 suites passando
- [ ] 244 testes passando
- [ ] Cobertura >= 80%

## 🔍 Arquivos Críticos

### Segurança
- `src/services/DIDService.ts`
- `src/services/CryptoService.ts`
- `src/services/StorageService.ts`

### Credenciais
- `src/services/CredentialService.ts`
- `src/services/PresentationService.ts`
- `src/services/VerificationService.ts`

### UI
- `src/screens/IssuerScreen.tsx`
- `src/screens/HolderScreen.tsx`
- `src/screens/VerifierScreen.tsx`

## ⚠️ Pontos de Atenção

1. **Hardware Seguro:** Verificar uso real de TEE
2. **ZKP:** Confirmar implementação real (não simulada)
3. **Range Proofs:** Validar implementação
4. **Chaves Privadas:** Nunca expostas ou logadas
5. **Conformidade:** W3C VC, DID, PEX, SD-JWT

## 🎯 Comandos Úteis

```bash
# Testes específicos
npm test -- --testPathPattern="property"
npm test -- --testPathPattern="E2E"

# Buscar padrões
grep -rn "TODO" src/
grep -rn "privateKey" src/
grep -rn "console.log" src/

# Verificar tipos
npx tsc --noEmit

# Lint
npm run lint
```

## ✅ Critérios de Sucesso

- ✅ 12/12 requisitos completos
- ✅ 39/39 propriedades validadas
- ✅ 244/244 testes passando
- ✅ Sem implementações temporárias críticas
- ✅ Conformidade com padrões
- ✅ Segurança validada
- ✅ WCAG AA completo

## 📊 Status Atual

```
Requisitos: __/12 ✅
Propriedades: __/39 ✅
Testes: 244/244 ✅
Cobertura: ___%
```

## 🚦 Decisão

- [ ] ✅ PRONTO PARA PRODUÇÃO
- [ ] ⚠️ REQUER CORREÇÕES CRÍTICAS
- [ ] ⚠️ REQUER CORREÇÕES IMPORTANTES
- [ ] ❌ REQUER MAIS DESENVOLVIMENTO

---

**Ver:** `VALIDATION_CHECKLIST.md` para detalhes completos
**Ver:** `VALIDATION_GUIDE.md` para processo passo a passo
