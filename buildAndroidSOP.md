# Android APK Build Standard Operating Procedure (SOP)

This document outlines the steps required to build a debug APK for this Capacitor project from the command line.

## Prerequisites

- Node.js and npm installed.
- Android SDK installed on the system.
- Java Development Kit (JDK) (version 11 or higher) installed on the system.

## Build Steps

### 1. Configure Android SDK Path

Gradle, the build tool for Android, needs to know where your Android SDK is located. Create a file named `local.properties` inside the `android/` directory.

**File:** `android/local.properties`

**Content:**
```
sdk.dir=/path/to/your/Android/Sdk
```

You must replace `/path/to/your/Android/Sdk` with the actual absolute path to your SDK.

*(During the previous successful build, the path was `/home/user/.androidsdkroot`)*


### 2. Install Project Dependencies

If you haven't already, install the necessary Node.js packages defined in `package.json`.

```bash
npm install
```

### 3. Build the Web Application

Compile the web assets (React/TypeScript code) that will be packaged inside the native Android app.

```bash
npm run build
```

### 4. Sync Capacitor Project

Copy the built web assets into the native Android project. This command will also create the `android` project if it doesn't already exist.

```bash
npx cap sync android
```

### 5. Build the APK

This is the final step where Gradle compiles the native Android app and packages it into an APK. For this command to succeed, you must provide the path to your Java installation by setting the `JAVA_HOME` environment variable.

Execute the following command, replacing `/path/to/your/jdk` with the actual absolute path to your JDK installation.

```bash
export JAVA_HOME="/path/to/your/jdk" && cd android && ./gradlew assembleDebug
```
export JAVA_HOME="/nix/store/pjk560fgk8z96nvcy4v95iprj1psnp18-openjdk-17.0.16+8/lib/openjdk" && cd android && ./gradlew assembleDebug
*(During the previous successful build, the path was `/nix/store/pjk560fgk8z96nvcy4v95iprj1psnp18-openjdk-17.0.16+8/lib/openjdk`)*

### 6. Locate the APK

After a successful build, the APK file can be found at the following path:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 7. Upload APK to GitHub Release

This section describes how to upload the generated APK to a GitHub Release using the GitHub CLI (`gh`).

### Prerequisites

- **GitHub CLI (`gh`)**: You must have the [GitHub CLI](https://cli.github.com/) installed on your system.

### Steps

1.  **Authenticate with GitHub**:
    If you haven't already, you need to authenticate with your GitHub account.
    ```bash
    gh auth login
    ```

2.  **Create the Release and Upload**:
    Use the `gh release create` command to create a new release and upload the APK file. You will need to provide a unique tag for the release.

    ```bash
    gh release create <tag_name> /path/to/your/app-debug.apk --title "Release Title" --notes "Release notes or description."
    ```

    **Example:**
    ```bash
    gh release create debug-$(date +%Y-%m-%d) android/app/build/outputs/apk/debug/app-debug.apk --title "debug Build $(date +%Y-%m-%d)" --notes "Automated debug build."
    ```
    This example creates a release with a tag like `nightly-2025-10-10` and uploads the debug APK.
    gh release create test3-$(date +%Y-%m-%d) app/build/outputs/apk/debug/app-debug.apk --title "Test3 Build $(date +%Y-%m-%d)" --notes "Automated Test build."
     gh release create test5-$(date +%Y-%m-%d) app/build/outputs/apk/debug/app-debug.apk --title "Test5 Build $(date +%Y-%m-%d)" --notes "Automated Test build."


     npm i
     npm run build
     npx cap sync android
     export JAVA_HOME="/nix/store/pjk560fgk8z96nvcy4v95iprj1psnp18-openjdk-17.0.16+8/lib/openjdk" && cd android && ./gradlew assembleDebug
     cd ..
     gh release create debug3-$(date +%Y-%m-%d) android/app/build/outputs/apk/debug/app-debug.apk --title "debug3 Build $(date +%Y-%m-%d)" --notes "Automated Test build."

    