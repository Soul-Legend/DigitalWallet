# Instruções de Instalação

## Passo 1: Instalar Dependências

Antes de executar o projeto, você precisa instalar todas as dependências:

```bash
npm install
```

**Nota**: Algumas dependências podem não estar disponíveis nos repositórios públicos do npm:
- `mopro-react-native-package`: Pode precisar ser instalado de um repositório específico
- `eudi-wallet-kit-react-native`: Pode estar em desenvolvimento
- `react-native-secure-sign`: Pode precisar de configuração adicional

Se alguma dependência falhar na instalação, você pode:
1. Comentar temporariamente no `package.json`
2. Instalar manualmente de repositórios alternativos
3. Implementar mocks para desenvolvimento inicial

## Passo 2: Configurar Android

### Instalar Android Studio
1. Baixe e instale o Android Studio
2. Abra o Android Studio
3. Vá em Tools > SDK Manager
4. Instale:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android Emulator

### Configurar Variáveis de Ambiente

**Windows:**
```
ANDROID_HOME=C:\Users\[SEU_USUARIO]\AppData\Local\Android\Sdk
```

Adicione ao PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

## Passo 3: Executar o Projeto

### Iniciar Metro Bundler
```bash
npm start
```

### Executar no Android (em outro terminal)
```bash
npm run android
```

Ou usando o Gradle diretamente:
```bash
cd android
./gradlew assembleDebug
cd ..
```

## Passo 4: Verificar Instalação

O aplicativo deve abrir com uma tela inicial mostrando 4 módulos:
- Emissor
- Titular
- Verificador
- Logs

Você deve conseguir navegar entre as telas (que ainda estão com placeholders).

## Troubleshooting

### Erro: "SDK location not found"
Crie o arquivo `android/local.properties`:
```
sdk.dir=C:\\Users\\[SEU_USUARIO]\\AppData\\Local\\Android\\Sdk
```

### Erro: "Execution failed for task ':app:installDebug'"
- Certifique-se de que um emulador está rodando ou um dispositivo está conectado
- Execute: `adb devices` para verificar

### Erro: "Unable to load script"
- Certifique-se de que o Metro Bundler está rodando
- Execute: `npm start -- --reset-cache`

### Erro de dependências não encontradas
- Algumas bibliotecas podem não estar disponíveis publicamente
- Você pode comentá-las temporariamente no package.json
- As funcionalidades serão implementadas nas próximas tarefas

## Próximas Tarefas

Após a instalação bem-sucedida:
1. Task 2: Implementar camada de serviços base
2. Task 3: Implementar geração de identidade
3. E assim por diante...
