/**
 * Post-prebuild step (CI): wires the committed distribution keystore into the
 * generated android project so `assembleRelease` produces an installable APK
 * with a CONSISTENT signature across builds (debug keystores rotate per
 * runner, which makes phones refuse to update: "app not installed").
 *
 * This keystore is for direct-download testing distribution only — the Play
 * Store release will use a separate private key (see docs/mobile-app.md).
 */
import { readFileSync, writeFileSync } from "node:fs"

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
`

// Insert the signingConfigs block right after `android {`
gradle = gradle.replace(/android \{/, (m) => m + signing)

// Point the release build type at it (the template's release block has no
// signingConfig; add one right inside it).
gradle = gradle.replace(
  /buildTypes \{[\s\S]*?release \{/,
  (m) => m + "\n            signingConfig signingConfigs.release",
)

writeFileSync(gradlePath, gradle)
console.log("release signing applied to", gradlePath)
