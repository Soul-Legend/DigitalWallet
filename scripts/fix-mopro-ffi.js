const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replacement, alreadyPatchedRegex) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if already patched
    if (alreadyPatchedRegex && alreadyPatchedRegex.test(content)) {
      console.log(`Already patched: ${filePath}`);
      return;
    }

    if (searchRegex.test(content)) {
      content = content.replace(searchRegex, replacement);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Patched ${filePath} successfully!`);
    } else {
      console.error(`ERROR: Could not find match in ${filePath}`);
      process.exit(1);
    }
  } else {
    console.error(`ERROR: File not found ${filePath}`);
    process.exit(1);
  }
}

console.log('Patching mopro-ffi for React Native 0.76...');

// 1. Disable new architecture in build.gradle
replaceInFile(
  'node_modules/mopro-ffi/android/build.gradle',
  /def isNewArchitectureEnabled\(\) \{[\s\S]*?\}/g,
  'def isNewArchitectureEnabled() {\n  return false\n}',
  /def isNewArchitectureEnabled\(\) \{\s*return false\s*\}/
);

// 2. Fix MoproFfiModule.kt
const moduleKtPath = 'node_modules/mopro-ffi/android/src/main/java/com/moproffi/MoproFfiModule.kt';

replaceInFile(
  moduleKtPath,
  /import com\.facebook\.react\.bridge\.ReactApplicationContext/g,
  `import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod`,
  /import com\.facebook\.react\.bridge\.ReactContextBaseJavaModule/
);

replaceInFile(
  moduleKtPath,
  /class MoproFfiModule\(reactContext: ReactApplicationContext\) :\s*NativeMoproFfiSpec\(reactContext\)/g,
  `class MoproFfiModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext)`,
  /class MoproFfiModule\(reactContext: ReactApplicationContext\) :\s*ReactContextBaseJavaModule\(reactContext\)/
);

replaceInFile(
  moduleKtPath,
  /override fun installRustCrate\(\): Boolean \{/g,
  `@ReactMethod(isBlockingSynchronousMethod = true)
  fun installRustCrate(): Boolean {`,
  /@ReactMethod\(isBlockingSynchronousMethod = true\)\s*fun installRustCrate\(\): Boolean \{/
);

replaceInFile(
  moduleKtPath,
  /override fun cleanupRustCrate\(\): Boolean \{/g,
  `@ReactMethod(isBlockingSynchronousMethod = true)
  fun cleanupRustCrate(): Boolean {`,
  /@ReactMethod\(isBlockingSynchronousMethod = true\)\s*fun cleanupRustCrate\(\): Boolean \{/
);

// 3. Fix MoproFfiPackage.kt
replaceInFile(
  'node_modules/mopro-ffi/android/src/main/java/com/moproffi/MoproFfiPackage.kt',
  /true \/\/ isTurboModule/g,
  'false // isTurboModule',
  /false \/\/ isTurboModule/
);

console.log('Patching complete.');
