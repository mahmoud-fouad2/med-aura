const { withMainApplication } = require("expo/config-plugins")

module.exports = function forceRtlPlugin(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents

    if (!contents.includes("I18nUtil")) {
      contents = contents.replace(
        "import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative",
        "import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative\nimport com.facebook.react.modules.i18nmanager.I18nUtil"
      )
    }

    if (!contents.includes("forceRTL")) {
      contents = contents.replace(
        "loadReactNative(this)",
        "I18nUtil.getInstance().allowRTL(this, true)\n    I18nUtil.getInstance().forceRTL(this, true)\n    loadReactNative(this)"
      )
    }

    mod.modResults.contents = contents
    return mod
  })
}
