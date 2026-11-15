export const MOBILE_DOWNLOADS = {
  // GitHub resolves these URLs to the latest published release automatically.
  // Keep both asset names unchanged in future releases: app-release.apk and Moodify.ipa.
  android: "https://github.com/Kandesfx/moodify-mobile/releases/latest/download/app-release.apk",
  releases: "https://github.com/Kandesfx/moodify-mobile/releases/latest",
  ios: "https://github.com/Kandesfx/moodify-mobile/releases/latest/download/Moodify.ipa",
  page: "/download",
} as const;
