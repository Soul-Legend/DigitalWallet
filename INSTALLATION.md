# Guia de Instalação

## Visão Geral

Este guia fornece instruções passo a passo para instalar e executar a Carteira de Identidade Acadêmica em seu ambiente de desenvolvimento.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

### Obrigatórios

- **Node.js** >= 18.0.0
  - [Download Node.js](https://nodejs.org/)
  - Verifique: `node --version`

- **npm** >= 9.0.0 (vem com Node.js)
  - Verifique: `npm --version`

- **Java Development Kit (JDK)** 17
  - [Download JDK 17](https://adoptium.net/)
  - Verifique: `java -version`

- **Android Studio** Arctic Fox ou superior
  - [Download Android Studio](https://developer.android.com/studio)

### Componentes do Android Studio

Após instalar o Android Studio, instale:

1. **Android SDK Platform 34** (Android 14)
2. **Android SDK Build-Tools 34.0.0**
3. **Android Emulator**
4. **Android SDK Platform-Tools**
5. **Android SDK Tools**

**Como instalar**:
1. Abra Android Studio
2. Vá em `Tools > SDK Manager`
3. Na aba `SDK Platforms`, marque `Android 14.0 (API 34)`
4. Na aba `SDK Tools`, marque os itens acima
5. Clique em `Apply` e aguarde o download

## Passo 1: Clonar o Repositório

```bash
git clone <repository-url>
cd CarteiraIdentidadeAcademica
```

## Passo 2: Configurar Variáveis de Ambiente

### Windows

Adicione as seguintes variáveis de ambiente:

```
ANDROID_HOME=C:\Users\[SEU_USUARIO]\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-17
```

Adicione ao PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
%JAVA_HOME%\bin
```

**Como adicionar**:
1. Pesquise "Variáveis de Ambiente" no menu Iniciar
2. Clique em "Editar as variáveis de ambiente do sistema"
3. Clique em "Variáveis de Ambiente"
4. Adicione as variáveis acima

### macOS/Linux

Adicione ao seu `~/.bashrc`, `~/.zshrc` ou `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$JAVA_HOME/bin
```

Depois execute:
```bash
source ~/.bashrc  # ou ~/.zshrc
```

## Passo 3: Configurar Android SDK

Crie o arquivo `android/local.properties`:

**Windows**:
```properties
sdk.dir=C:\\Users\\[SEU_USUARIO]\\AppData\\Local\\Android\\Sdk
```

**macOS**:
```properties
sdk.dir=/Users/[SEU_USUARIO]/Library/Android/sdk
```

**Linux**:
```properties
sdk.dir=/home/[SEU_USUARIO]/Android/Sdk
```

## Passo 4: Instalar Dependências

```bash
npm install
```

### Problemas Conhecidos

Algumas dependências podem não estar disponíveis publicamente:
- `mopro-react-native-package`
- `eudi-wallet-kit-react-native`
- `react-native-secure-sign`

**Soluções**:

1. **Instalar com --legacy-peer-deps**:
```bash
npm install --legacy-peer-deps
```

2. **Limpar cache e reinstalar**:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

3. **Comentar dependências problemáticas** (temporário):
   - Edite `package.json`
   - Comente as dependências não encontradas
   - Reinstale: `npm install`

## Passo 5: Configurar Emulador ou Dispositivo

### Opção A: Usar Emulador

1. Abra Android Studio
2. Vá em `Tools > Device Manager`
3. Clique em `Create Device`
4. Selecione um dispositivo (ex: Pixel 5)
5. Selecione uma imagem do sistema (API 34, x86_64)
6. Clique em `Finish`
7. Inicie o emulador

### Opção B: Usar Dispositivo Físico

1. Habilite "Opções do Desenvolvedor" no dispositivo:
   - Vá em `Configurações > Sobre o telefone`
   - Toque 7 vezes em "Número da versão"

2. Habilite "Depuração USB":
   - Vá em `Configurações > Opções do desenvolvedor`
   - Ative "Depuração USB"

3. Conecte o dispositivo via USB

4. Verifique a conexão:
```bash
adb devices
```

Deve mostrar seu dispositivo listado.

## Passo 6: Executar o Aplicativo

### Terminal 1: Iniciar Metro Bundler

```bash
npm start
```

Aguarde a mensagem: `✓ Metro is ready`

### Terminal 2: Executar no Android

```bash
npm run android
```

Ou manualmente:
```bash
cd android
./gradlew installDebug
cd ..
```

**Primeira execução**: Pode levar 5-10 minutos para compilar.

## Passo 7: Verificar Instalação

O aplicativo deve abrir e exibir:

1. **Tela de Inicialização**: Geração automática de identidade DID
2. **Tela Principal**: Menu com 4 módulos
   - Emissor
   - Titular
   - Verificador
   - Logs

**Teste básico**:
1. Navegue entre as telas
2. Verifique que não há erros no console
3. Acesse o Painel de Logs e veja o evento de geração de chaves

## Comandos Úteis

### Limpar cache e rebuild

```bash
# Limpar cache do Metro
npm start -- --reset-cache

# Limpar build do Android
cd android
./gradlew clean
cd ..

# Limpar tudo
rm -rf node_modules package-lock.json
npm install
```

### Desinstalar e reinstalar app

```bash
# Desinstalar
adb uninstall com.carteiraidentidadeacademica

# Reinstalar
npm run android
```

### Ver logs em tempo real

```bash
# Logs do React Native
npx react-native log-android

# Logs do Android
adb logcat | grep -i "ReactNative"
```

## Troubleshooting

### Erro: "SDK location not found"

**Solução**: Crie `android/local.properties` com o caminho do SDK (veja Passo 3)

### Erro: "Unable to load script"

**Solução**:
```bash
npm start -- --reset-cache
```

### Erro: "Execution failed for task ':app:installDebug'"

**Solução**: Verifique se emulador/dispositivo está conectado:
```bash
adb devices
```

### Erro: "Command failed: gradlew.bat"

**Solução**: Verifique JAVA_HOME e ANDROID_HOME

### Erro: "EPERM: operation not permitted" (Windows)

**Solução**: Execute terminal como Administrador

### Erro: "Duplicate class found"

**Solução**:
```bash
cd android
./gradlew clean
./gradlew cleanBuildCache
cd ..
npm run android
```

Para mais soluções, consulte [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## Verificar Ambiente

Execute o diagnóstico do React Native:

```bash
npx react-native doctor
```

Deve mostrar ✓ para todos os itens.

## Próximos Passos

Após instalação bem-sucedida:

1. Leia o [Guia do Usuário](./docs/USER_GUIDE.md)
2. Explore a [Documentação de Arquitetura](./docs/ARCHITECTURE.md)
3. Veja a [Documentação de APIs](./docs/API_DOCUMENTATION.md)
4. Execute os testes: `npm test`

## Suporte

Se encontrar problemas:

1. Consulte [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
2. Verifique issues existentes no repositório
3. Abra uma nova issue com:
   - Descrição do problema
   - Logs completos
   - Versões (Node, Java, Android SDK)
   - Sistema operacional

---

**Tempo estimado de instalação**: 30-60 minutos (primeira vez)

**Versão**: 1.0.0  
**Última atualização**: Março 2026
