#!/bin/bash
set -e

echo "==========================================================="
echo "Setting up WSL for Mopro Android Build"
echo "==========================================================="

# 1. Install Rust if not present
if ! command -v cargo &> /dev/null; then
    echo "[1/6] Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "[1/6] Rust already installed."
    source $HOME/.cargo/env
fi

# 2. Install Linux build tools
echo "[2/6] Installing required Linux build tools (may ask for sudo password)..."
sudo apt-get update
sudo apt-get install -y build-essential clang cmake openjdk-17-jdk unzip wget pkg-config libssl-dev

# 3. Setup Android SDK & NDK inside WSL
if [ ! -d "$HOME/android-sdk/ndk" ]; then
    echo "[3/6] Setting up Android SDK and NDK in WSL..."
    mkdir -p $HOME/android-sdk/cmdline-tools
    cd $HOME/android-sdk
    
    # Download Android command line tools
    wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline.zip
    unzip -q cmdline.zip -d cmdline-tools
    mv cmdline-tools/cmdline-tools cmdline-tools/latest
    rm cmdline.zip

    export ANDROID_HOME=$HOME/android-sdk
    export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

    # Accept licenses and install NDK
    echo "Accepting Android licenses..."
    yes | sdkmanager --licenses
    
    echo "Installing Android NDK and platforms..."
    sdkmanager "ndk;25.2.9519653" "build-tools;34.0.0" "platforms;android-34"
    
    # Save to bashrc
    echo 'export ANDROID_HOME=$HOME/android-sdk' >> $HOME/.bashrc
    echo 'export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653' >> $HOME/.bashrc
    echo 'export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH' >> $HOME/.bashrc
else
    echo "[3/6] Android SDK/NDK already present in WSL."
    export ANDROID_HOME=$HOME/android-sdk
    export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
fi

# 4. Add Rust Android targets
echo "[4/6] Adding Rust targets for Android..."
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# 5. Install Mopro CLI
if ! command -v mopro &> /dev/null; then
    echo "[5/6] Installing mopro-cli (this might take a few minutes)..."
    cargo install mopro-cli
else
    echo "[5/6] mopro-cli already installed."
fi

# 6. Build the native bindings
echo "[6/6] Building Mopro bindings for Android..."
cd /mnt/s/Sandbox/DigitalWallet/DigitalWallet/mopro-bindings-src
mopro build --platforms android

# 7. Copy generated files
echo "Copying generated .a files to mopro-ffi node_modules..."
cd /mnt/s/Sandbox/DigitalWallet/DigitalWallet
for arch in armeabi-v7a arm64-v8a x86 x86_64; do
    mkdir -p node_modules/mopro-ffi/android/src/main/jniLibs/$arch
    cp mopro-bindings-src/MoproAndroidBindings/jniLibs/$arch/libmopro_example_app.so node_modules/mopro-ffi/android/src/main/jniLibs/$arch/
done

echo "==========================================================="
echo "✅ Done! The native bindings have been successfully compiled in WSL and copied to your project."
echo "You can now rebuild your Android app from Windows (e.g. npx react-native run-android)."
echo "==========================================================="
