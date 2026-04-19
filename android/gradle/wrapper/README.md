# Gradle Wrapper

This directory contains the Gradle Wrapper configuration. Two files are
required for builds to work on a fresh checkout, but only one of them can be
committed via this tooling:

| File | Status | How to provision |
|---|---|---|
| `gradle-wrapper.properties` | ✅ Committed | n/a |
| `gradle-wrapper.jar` | ⬜ **Missing — must be regenerated** | `cd android && gradle wrapper --gradle-version 8.9 --distribution-type bin` |

The `.jar` is a binary blob that this tooling cannot generate directly. To
recreate it locally:

1. Install Gradle 8.9+ once on your machine (see https://gradle.org/install/).
2. From the repo root: `cd android && gradle wrapper --gradle-version 8.9 --distribution-type bin`
3. This regenerates `gradle/wrapper/gradle-wrapper.jar`, `../../gradlew`, and
   `../../gradlew.bat` (paths relative to this directory).
4. Commit `gradle-wrapper.jar`, `gradlew`, and `gradlew.bat`.

After that, `./gradlew assembleDebug` works on any fresh clone without a
pre-installed Gradle.

The pinned version (`8.9`) matches Android Gradle Plugin `8.3.0` declared in
[../../build.gradle](../../build.gradle). Bumping AGP requires a coordinated
Gradle bump per the
[AGP/Gradle compatibility matrix](https://developer.android.com/build/releases/gradle-plugin).
