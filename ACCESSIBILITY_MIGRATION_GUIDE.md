# Guia de Migração de Acessibilidade

## Como Atualizar Componentes Existentes

### 1. Importar Utilitários
```typescript
import {scaleFontSize} from '../utils/theme';
import {AccessibilityLabels, MIN_TOUCH_TARGET_SIZE} from '../utils/accessibility';
```

### 2. Atualizar Estilos de Texto
```typescript
// Antes
fontSize: 14,

// Depois
fontSize: scaleFontSize(14),
```

### 3. Adicionar Acessibilidade a Botões
```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Descrição clara"
  accessibilityHint="O que acontece ao tocar"
  accessibilityRole="button"
  style={{minHeight: MIN_TOUCH_TARGET_SIZE}}
/>
```

### 4. Adicionar Acessibilidade a Inputs
```typescript
<TextInput
  accessible={true}
  accessibilityLabel="Campo de entrada"
  accessibilityHint="Digite aqui"
  style={{minHeight: MIN_TOUCH_TARGET_SIZE}}
/>
```

### 5. Usar Mensagens de Erro Padronizadas
```typescript
import {getErrorMessage, formatError} from '../utils/errorMessages';

const errorMsg = formatError('INVALID_CREDENTIAL_FORMAT');
```

## Checklist por Componente

- [ ] Importar utilitários
- [ ] Substituir fontSize por scaleFontSize()
- [ ] Adicionar accessibilityLabel em elementos interativos
- [ ] Adicionar accessibilityRole apropriado
- [ ] Garantir minHeight: 44 em touch targets
- [ ] Testar com TalkBack

## Referências
- Ver `GlossaryScreen.tsx` para exemplo completo
- Ver `ACCESSIBILITY_IMPROVEMENTS.md` para detalhes
