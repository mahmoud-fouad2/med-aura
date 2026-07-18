/**
 * Post-prebuild step (CI): patches the generated android project before
 * `assembleRelease`. Two things:
 *
 * 1. Wires the committed distribution keystore in, so the APK has a CONSISTENT
 *    signature across builds (debug keystores rotate per runner, which makes
 *    phones refuse to update: "app not installed"). Testing-distribution key
 *    only — the Play Store release uses a separate private key (docs/mobile-app.md).
 *
 * 2. Narrows the built ABIs to the two ARM variants real phones use
 *    (arm64-v8a + armeabi-v7a). Once the native video (WebRTC) libraries were
 *    added, building all four ABIs (incl. x86/x86_64, which only emulators
 *    need) pushed `assembleRelease` past an hour on the 2-core runner. Dropping
 *    the x86 variants roughly halves the native packaging work and shrinks the
 *    APK, with zero impact on physical devices.
 */
import { readFileSync, writeFileSync } from "node:fs"

// ── ABI narrowing ──────────────────────────────────────────────────────────
// The Expo Android template reads `reactNativeArchitectures` from
// gradle.properties to decide which ABIs to build.
const gradlePropsPath = "android/gradle.properties"
try {
  let props = readFileSync(gradlePropsPath, "utf8")
  const arm = "reactNativeArchitectures=arm64-v8a,armeabi-v7a"
  if (/^reactNativeArchitectures=.*/m.test(props)) {
    props = props.replace(/^reactNativeArchitectures=.*/m, arm)
  } else {
    props += `\n${arm}\n`
  }
  writeFileSync(gradlePropsPath, props)
  console.log("ABIs narrowed to arm64-v8a,armeabi-v7a in", gradlePropsPath)
} catch (err) {
  console.warn("could not narrow ABIs:", err.message)
}

// ── Release signing ────────────────────────────────────────────────────────
const gradlePath = "android/app/build.gradle"
let gradle = readFileSync(gradlePath, "utf8")

if (gradle.includes("medaura-dist.p12")) {
  console.log("release signing already applied")
  process.exit(0)
}

const signing = `
    signingConfigs {
        release {
            storeFile file('../../signing/medaura-dist.p12')
            storePassword 'medaura-dist-2026'
            keyAlias 'medaura'
            keyPassword 'medaura-dist-2026'
            storeType 'pkcs12'
        }
    }
    // The native video (WebRTC) libraries ship their own copy of shared
    // runtime .so files that also come from React Native — assembleRelease
    // can fail at the merge step with "More than one file was found with OS
    // independent path 'lib/<abi>/libc++_shared.so'". pickFirsts resolves the
    // duplicate deterministically (the copies are ABI-identical).
    packagingOptions {
        jniLibs {
            pickFirsts += [
                '**/libc++_shared.so',
                '**/libfbjni.so',
                '**/libjsc.so',
                '**/libhermes.so',
            ]
        }
    }
    // assembleRelease automatically runs lintVitalRelease, which crashed with
    // "Unexpected failure during lint analysis (this is a bug in lint...)" on
    // expo-modules-core / react-native-gesture-handler. Android lint is a
    // code-quality gate on third-party libraries, not a build requirement —
    // our own code is already gated by tsc + eslint — so it is disabled for
    // the distribution build rather than letting a lint bug block shipping.
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
`

// Insert the signingConfigs + packaging blocks right after `android {`
gradle = gradle.replace(/android \{/, (m) => m + signing)

// Point the release build type at it (the template's release block has no
// signingConfig; add one right inside it).
gradle = gradle.replace(
  /buildTypes \{[\s\S]*?release \{/,
  (m) => m + "\n            signingConfig signingConfigs.release",
)

writeFileSync(gradlePath, gradle)
console.log("release signing applied to", gradlePath)

// ── Disable release lint for EVERY module ──────────────────────────────────
// The crash was in library modules (expo-modules-core,
// react-native-gesture-handler) lintVitalAnalyzeRelease, not just :app.
// Belt-and-braces: turn release-lint off across all subprojects at the root
// so no lintVitalAnalyze task can run for any dependency.
const rootGradlePath = "android/build.gradle"
try {
  let root = readFileSync(rootGradlePath, "utf8")
  if (!root.includes("checkReleaseBuilds false")) {
    root += `

// Added post-prebuild: Android lint crashes ("bug in lint") on some library
// modules during release analysis. Disable release-lint everywhere — code
// quality is already gated by tsc + eslint on the JS side.
allprojects {
    afterEvaluate { proj ->
        def androidExt = proj.extensions.findByName("android")
        if (androidExt != null) {
            try {
                androidExt.lint {
                    checkReleaseBuilds false
                    abortOnError false
                }
            } catch (ignored) {}
        }
    }
}
`
    writeFileSync(rootGradlePath, root)
    console.log("release lint disabled for all modules in", rootGradlePath)
  }
} catch (err) {
  console.warn("could not disable module lint:", err.message)
}
