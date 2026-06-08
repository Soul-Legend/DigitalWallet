#!/bin/bash
set -e

# Export Android variables manually
export ANDROID_HOME=$HOME/android-sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

source $HOME/.cargo/env

cd /mnt/s/Sandbox/DigitalWallet/DigitalWallet/mopro-bindings-src

# Remove old bindings to avoid Permission Denied
rm -rf MoproAndroidBindings MoproReactNativeBindings target build

echo "Clean cargo..."
cargo clean

echo "Building Mopro..."
mopro build --platforms android --mode release --architectures x86_64-linux-android i686-linux-android armv7-linux-androideabi aarch64-linux-android --no-auto-update

# Copy the built shared libraries
echo "Copying generated .so files to mopro-ffi node_modules..."
for arch in armeabi-v7a arm64-v8a x86 x86_64; do
    mkdir -p node_modules/mopro-ffi/android/src/main/jniLibs/$arch
    cp mopro-bindings-src/MoproAndroidBindings/jniLibs/$arch/libmopro_example_app.so node_modules/mopro-ffi/android/src/main/jniLibs/$arch/
done
