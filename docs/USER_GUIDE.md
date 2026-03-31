# Guia do Usuário - Carteira Identidade Acadêmica

## Introdução

Este guia explica como usar o aplicativo de Carteira de Identidade Acadêmica para emitir, armazenar e apresentar credenciais verificáveis.

## Glossário de Termos

- **DID (Identificador Descentralizado)**: Seu identificador único digital que você controla
- **Credencial Verificável**: Documento digital assinado contendo seus dados acadêmicos
- **Apresentação Verificável**: Resposta contendo apenas os dados solicitados
- **SD-JWT**: Formato que permite revelar apenas alguns atributos
- **ZKP (Prova de Conhecimento Zero)**: Prova matemática que valida informação sem revelá-la
- **Nullifier**: Hash único usado para prevenir duplicação de votos

Para mais termos, acesse o Glossário dentro do aplicativo.

## Primeira Inicialização

### Geração de Identidade

Na primeira vez que você abre o aplicativo:

1. O sistema exibe uma tela de inicialização
2. Automaticamente gera seu par de chaves criptográficas no hardware seguro do dispositivo
3. Cria seu DID (Identificador Descentralizado)
4. Exibe seu DID gerado (formato: `did:key:z...`)

**Importante**: Suas chaves privadas nunca saem do dispositivo e ficam armazenadas de forma criptografada.

## Navegação

O aplicativo possui 5 telas principais acessíveis pelo menu:

- **Início**: Tela principal com visão geral
- **Emissor**: Para emitir credenciais (simula a UFSC)
- **Titular**: Para gerenciar suas credenciais
- **Verificador**: Para validar apresentações
- **Logs**: Para monitorar eventos criptográficos

## Módulo Emissor

### Objetivo
Simula a instituição (UFSC) emitindo uma credencial acadêmica.

### Passo a Passo

1. **Acesse o Módulo Emissor** pelo menu
2. **Preencha o formulário** com seus dados acadêmicos:
   - Nome completo
   - CPF (11 dígitos)
   - Matrícula
   - Curso
   - Status de matrícula (Ativo/Inativo)
   - Data de nascimento (formato: AAAA-MM-DD)
   - Benefícios sociais (checkboxes)
   - Isenções (checkboxes)
   - Acessos a laboratórios e prédios (separados por vírgula)

3. **Clique em "Emitir Credencial"**
   - O sistema valida os campos obrigatórios
   - Gera a credencial em formato SD-JWT ou AnonCreds
   - Assina digitalmente com a chave da instituição
   - Copia automaticamente para a área de transferência

4. **Confirmação**: Mensagem de sucesso aparece quando a credencial é copiada

### Campos Obrigatórios

- Nome completo
- CPF
- Matrícula
- Curso
- Status de matrícula
- Data de nascimento

### Exemplo de Dados

```
Nome: João Silva Santos
CPF: 12345678900
Matrícula: 20231234567
Curso: Ciência da Computação
Status: Ativo
Data de Nascimento: 2000-05-15
Acesso Laboratórios: LCN, LINSE, LabSEC
Acesso Prédios: INE, CTC
```

## Módulo Titular

### Objetivo
Gerenciar suas credenciais e responder a requisições de apresentação.

### Armazenar uma Credencial

1. **Acesse o Módulo Titular**
2. **Cole a credencial** no campo de entrada
   - Use o botão "Colar" ou Ctrl+V
3. **Aguarde a validação**
   - O sistema verifica a estrutura do token
   - Armazena de forma criptografada
4. **Visualize sua credencial**
   - Todos os atributos são exibidos em texto claro
   - Navegue entre múltiplas credenciais se tiver mais de uma

### Responder a uma Requisição

1. **Cole a requisição PEX** recebida do verificador
2. **Revise o Modal de Consentimento**
   - Veja quais atributos são solicitados
   - Atributos obrigatórios aparecem marcados
   - Atributos opcionais podem ser desmarcados
3. **Aprove ou Cancele**
   - Aprovar: Gera a apresentação
   - Cancelar: Fecha o modal sem gerar nada
4. **Aguarde a geração**
   - Para SD-JWT: Ofusca atributos não revelados
   - Para ZKP: Gera provas matemáticas
5. **Apresentação copiada**: Mensagem de sucesso confirma

### Tipos de Apresentação

**SD-JWT (Divulgação Seletiva)**
- Revela apenas os atributos solicitados
- Outros atributos são substituídos por hashes
- Usado no cenário de Restaurante Universitário

**ZKP (Prova de Conhecimento Zero)**
- Prova predicados sem revelar valores exatos
- Usado em Eleições e Verificação de Maioridade

## Módulo Verificador

### Objetivo
Validar apresentações verificáveis em diferentes cenários.

### Cenários Disponíveis

#### 1. Restaurante Universitário (RU)

**Objetivo**: Validar vínculo ativo e isenção tarifária

**Atributos solicitados**:
- status_matricula
- isencao_ru

**Fluxo**:
1. Selecione "Restaurante Universitário"
2. Clique em "Gerar Requisição"
3. Requisição é copiada automaticamente
4. Envie para o titular (via área de transferência)
5. Receba a apresentação do titular
6. Cole a apresentação no campo de validação
7. Sistema valida:
   - Assinatura do emissor
   - Hashes dos atributos revelados
   - Presença dos atributos obrigatórios
8. Resultado: Acesso aprovado ou negado

#### 2. Eleições Estudantis

**Objetivo**: Validar elegibilidade e prevenir voto duplicado

**Atributos solicitados**:
- status_matricula (prova ZKP de "Ativo")
- Nullifier único

**Fluxo**:
1. Selecione "Eleições"
2. Sistema gera requisição com election_id único
3. Titular gera:
   - Prova ZKP de matrícula ativa
   - Nullifier (hash determinístico)
4. Verificador valida:
   - Prova matemática de elegibilidade
   - Nullifier não está duplicado
5. Se válido: Registra nullifier e aprova voto
6. Se duplicado: Rejeita com mensagem de duplicidade

**Importante**: O mesmo estudante sempre gera o mesmo nullifier para a mesma eleição, impedindo voto duplicado.

#### 3. Laboratórios

**Objetivo**: Validar permissão de acesso físico

**Atributos solicitados**:
- acesso_laboratorios ou acesso_predios

**Fluxo**:
1. Selecione "Laboratórios"
2. Digite o nome do laboratório/prédio (ex: "LCN", "INE")
3. Sistema gera requisição específica
4. Titular verifica se tem permissão
5. Se tem: Gera apresentação confirmando
6. Se não tem: Exibe mensagem de ausência de permissão
7. Verificador valida a permissão específica

#### 4. Verificação de Maioridade

**Objetivo**: Validar idade >= 18 anos sem revelar data de nascimento

**Atributos solicitados**:
- Range Proof de data_nascimento >= 18 anos

**Fluxo**:
1. Selecione "Maioridade"
2. Sistema gera requisição com predicado idade >= 18
3. Titular gera Range Proof:
   - Calcula idade a partir de data_nascimento
   - Gera prova matemática de idade >= 18
   - NÃO revela a data exata
4. Verificador valida:
   - Prova matemática
   - Predicado satisfeito
5. Resultado: Maior ou menor de idade (sem revelar data)

## Painel de Logs

### Objetivo
Monitorar todos os eventos criptográficos em tempo real.

### Informações Exibidas

Cada entrada de log contém:
- **Timestamp**: Data e hora do evento
- **Operação**: Tipo (geração de chave, emissão, verificação, etc.)
- **Módulo**: Onde ocorreu (Emissor, Titular, Verificador)
- **Detalhes técnicos**:
  - Algoritmo usado
  - Tamanho de chave
  - Método DID
  - Hashes (truncados)
  - Resultados de validação
  - Parâmetros
- **Status**: Sucesso ou erro
- **Stack trace**: Em caso de erro

### Funcionalidades

- **Rolagem**: Navegue pelo histórico completo
- **Limpeza**: Botão para limpar todos os logs
- **Privacidade**: Dados sensíveis (CPF, nome) são ofuscados

### Exemplo de Log

```
[2026-03-31 18:30:45] Geração de Chaves
Módulo: Titular
Algoritmo: Ed25519
Tamanho: 256 bits
Método DID: did:key
Status: Sucesso
```

## Fluxo Completo de Uso

### Cenário: Acesso ao Restaurante Universitário

1. **Emissor emite credencial**
   - Preenche dados do estudante
   - Emite credencial SD-JWT
   - Credencial copiada

2. **Titular armazena credencial**
   - Cola credencial no Módulo Titular
   - Sistema valida e armazena
   - Credencial visível na tela

3. **Verificador gera requisição**
   - Seleciona cenário "RU"
   - Gera requisição PEX
   - Requisição copiada

4. **Titular gera apresentação**
   - Cola requisição no Módulo Titular
   - Revisa modal de consentimento
   - Aprova divulgação de status_matricula e isencao_ru
   - Apresentação SD-JWT gerada e copiada

5. **Verificador valida apresentação**
   - Cola apresentação no Módulo Verificador
   - Sistema valida assinatura e hashes
   - Resultado: Acesso aprovado ✓

6. **Logs registram tudo**
   - Emissão da credencial
   - Armazenamento
   - Geração de apresentação
   - Validação

## Dicas e Boas Práticas

### Segurança

- ✅ Suas chaves privadas nunca saem do dispositivo
- ✅ Credenciais são armazenadas criptografadas
- ✅ Você controla quais atributos revelar
- ✅ Logs ofuscam dados sensíveis

### Privacidade

- Use SD-JWT quando quiser revelar apenas alguns atributos
- Use ZKP quando quiser provar algo sem revelar o valor
- Sempre revise o modal de consentimento antes de aprovar
- Desmarque atributos opcionais que não quer revelar

### Performance

- Operações ZKP podem levar alguns segundos
- Range Proofs são computacionalmente intensivas
- Aguarde os indicadores de loading

### Troubleshooting

**Credencial não é aceita**
- Verifique se copiou o token completo
- Verifique se o formato está correto (deve começar com `eyJ...`)

**Apresentação rejeitada**
- Verifique se revelou todos os atributos obrigatórios
- Verifique se a credencial não expirou
- Veja os logs para detalhes do erro

**Nullifier duplicado**
- Você já votou nesta eleição
- O sistema previne voto duplicado por design

## Acessibilidade

O aplicativo suporta:
- ✅ Screen readers (TalkBack)
- ✅ Tamanhos de fonte do sistema
- ✅ Alto contraste
- ✅ Touch targets mínimos de 44x44dp
- ✅ Navegação por teclado

## Suporte

Para problemas técnicos:
1. Consulte o [Guia de Troubleshooting](./TROUBLESHOOTING.md)
2. Verifique os logs no Painel de Logs
3. Abra uma issue no repositório

---

**Versão**: 1.0.0  
**Última atualização**: Março 2026
