# Relatório: Desafios na Integração de Zero-Knowledge Proofs (ZKP) com React Native via Mopro no Android

A integração de provas de conhecimento zero (Zero-Knowledge Proofs - ZKP) no aplicativo móvel exigiu a construção de uma ponte nativa entre os circuitos gerados (Circom), a lógica de geração de provas em Rust e a interface em React Native (via UniFFI e módulos JNI). Durante a configuração da biblioteca nativa no Android, diversos obstáculos complexos relacionados à compilação cruzada, linkagem dinâmica e manipulação de bibliotecas C++ e Rust foram encontrados. 

Este relatório detalha os principais desafios, as abordagens adotadas para solução e os resultados obtidos.

---

## Desafio 1: Incompatibilidade de Nomenclatura na Interface JNI (UniFFI)

### O Problema
A biblioteca React Native configurada para interagir com o código Rust (`mopro-ffi`) utiliza o UniFFI para gerar as pontes de comunicação. No entanto, o Android emite o erro `UnsatisfiedLinkError` em tempo de execução porque o código Java esperava interagir com uma biblioteca chamada `libmopro_example_app.so`, enquanto a compilação padrão do Rust estava gerando o artefato com o nome `libmopro_bindings.so`.

### Tentativas de Solução
Inicialmente, tentou-se renomear o arquivo compilado manualmente após a geração (`mv libmopro_bindings.so libmopro_example_app.so`), mas essa abordagem apresentou falhas intermitentes no processo de build e não resolveu os cabeçalhos internos da biblioteca exportada.

### A Solução
O arquivo de configuração do Rust (`Cargo.toml`) do diretório `mopro-bindings-src` foi modificado para que o nome do *crate* compilado correspondesse exatamente à expectativa da ponte JNI. A propriedade `name` foi alterada para `mopro_example_app`, garantindo que o compilador Rust (`rustc`) gerasse nativamente o artefato `libmopro_example_app.so` e mantivesse a coerência dos símbolos exportados na tabela do ELF.

---

## Desafio 2: Falta de Envio das Bibliotecas Nativas para o Build do Android

### O Problema
Durante a compilação do React Native (`npm run android`), o sistema de build do Android (Gradle + CMake) queixou-se de que não havia regras conhecidas para fabricar ou localizar o artefato `libmopro_example_app.so`. O processo de build nativo em Rust era feito utilizando o *Windows Subsystem for Linux (WSL)*, gerando os arquivos `.so` em um diretório isolado que o Gradle não conhecia.

### Tentativas de Solução
Foi realizada a tentativa de usar scripts antigos baseados no React Native antigo (`wsl_build_mopro.sh`), que copiavam arquivos com extensão `.a` em vez de `.so` (Dynamic Shared Objects). Como o CMake do Android estava configurado para encontrar a biblioteca compartilhada `.so`, a ausência do arquivo paralisava o build.

### A Solução
Foi criado um novo pipeline de build automatizado via script (`wsl_clean_build_mopro.sh`). Este script automatizou a limpeza dos caches e invocou a ferramenta `mopro build --platforms android`. Em seguida, iterou sobre todas as arquiteturas (como `arm64-v8a`, `x86_64`, etc.) e copiou cirurgicamente os arquivos `libmopro_example_app.so` do diretório `MoproAndroidBindings` gerado pelo WSL diretamente para as pastas `node_modules/mopro-ffi/android/src/main/jniLibs/`, as quais são lidas e injetadas na construção do APK pelo sistema de autolinking do React Native.

---

## Desafio 3: Codificação Incorreta de Caminho Absoluto pelo CMake Linker

### O Problema
Mesmo após a cópia correta do arquivo e o sucesso na compilação do APK, o aplicativo falhava de imediato ao iniciar no emulador. O log exibiu novamente `UnsatisfiedLinkError: dlopen failed`, relatando a incapacidade de localizar a biblioteca: `"../../../../src/main/jniLibs/arm64-v8a/libmopro_example_app.so"`. 

O erro não estava na ausência física da biblioteca, mas sim em como o Android tentava carregá-la. Como a biblioteca Rust não possuía um campo `SONAME` preenchido internamente, o CMake (usando a declaração `SHARED IMPORTED`) registrou de forma "preguiçosa" todo o *caminho relativo utilizado no momento da compilação* no cabeçalho `NEEDED` do arquivo que atua como proxy nativo (`libmopro-ffi.so`). No ambiente Android real em execução, esse diretório relativo não existe.

### Tentativas de Solução
Foi tentado injetar uma propriedade `SONAME` diretamente na biblioteca gerada através de utilitários como `patchelf`. No entanto, isso quebrava o isolamento de build entre plataformas, criando mais atrito.

### A Solução
O problema foi resolvido na raiz, modificando o arquivo de compilação `CMakeLists.txt` do `mopro-ffi`. A diretiva `add_library(... SHARED IMPORTED)` foi totalmente removida. Em seu lugar, as diretivas padrões de linkagem de C++ foram adicionadas: `link_directories` e `target_link_libraries` com a flag clássica `-lmopro_example_app`. Essa técnica forçou o linker do Android (lld) a buscar pela resolução dinâmica do arquivo apenas por nome ("libmopro_example_app.so"), delegando a busca do diretório ao `dlopen` dinâmico do sistema operacional.

---

## Desafio 4: Conflito Sintático de Geradores C++ (Underscore Stripping)

### O Problema
Um último erro surgiu durante a inicialização: `dlopen failed: cannot locate symbol "age_rangeInstantiate" referenced by libmopro_example_app.so`. 
Esse foi o erro mais obscuro e estava ligado diretamente aos circuitos do Circom. A biblioteca transpila circuitos `.wasm` para `.cpp` internamente (usando a crate `rust-witness`). Descobriu-se que o transpilador silenciosamente **remove todos os sublinhados (`_`) e traços (`-`)** do nome do circuito ao gerar os identificadores em C++. O código Rust esperava importar `age_rangeInstantiate` (mantendo o sublinhado). Essa ausência no mapeamento gerou um artefato Rust em que os símbolos dos circuitos ficaram indefinidos (`U` no `nm`), quebrando o carregamento no Android.

### Tentativas de Solução
Foi feita uma inspeção minuciosa com a ferramenta `nm` nos arquivos `.a` e `.so` isolados, localizando os símbolos reais em texto plano e descobrindo a ausência do sublinhado.

### A Solução
As declarações nas macros do Rust que mapeiam as chaves dos circuitos (localizadas em `src/lib.rs`) foram atualizadas de `rust_witness::witness!(age_range)` para `rust_witness::witness!(agerange)`, e o mesmo foi aplicado para circuitos como `status_check` (`statuscheck`). Ao equalizar as referências de acordo com o comportamento de sanitização do C++, o linker do Rust (`lld`) finalmente pôde encontrar os símbolos em tempo de build, empacotando tudo de maneira segura no arquivo binário unificado `.so`. 

---

### Conclusão

A integração do framework Mopro no React Native requer uma manipulação sofisticada e controle estrito de toolchains e builds nativos. O pipeline resultante tornou a comunicação Rust-C++-Java-JavaScript totalmente viável e robusta para gerar provas de ZKP em dispositivos móveis.
