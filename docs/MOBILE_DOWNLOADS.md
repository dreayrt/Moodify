# Mobile app downloads

The listener dashboard and home footer share `components/shared/app-download-footer.tsx`.
The public `/download` page provides the same download buttons and installation instructions without requiring a login.

- **Android:** `lib/mobile-downloads.ts` links to GitHub's `/releases/latest/download/app-release.apk`. The other `moodify-release.apk` asset is not used.
- **iOS:** The same module links to GitHub's `/releases/latest/download/Moodify.ipa`. The site no longer bundles a fixed IPA. The old `/downloads/Moodify.ipa` URL temporarily redirects to the latest GitHub IPA, so existing links keep working.

Both URLs target `https://github.com/Kandesfx/moodify-mobile`. Publish a Release marked **Latest** with both assets named exactly **app-release.apk** and **Moodify.ipa** (case-sensitive). Pushing source or a tag alone does not publish downloadable binaries. After this web change is deployed, later mobile releases need no web rebuild or deployment. Each platform's file must be present in the latest release; there is no fallback to older releases when an asset is missing. This updates download destinations, not apps already installed on phones.

Verified on 2026-11-10 against release **v0.1.3**: Android asset 74,471,786 bytes; IPA asset 30,582,581 bytes; latest IPA download returned HTTP 200 with `Content-Disposition: attachment; filename=Moodify.ipa`. The download page avoids fixed version numbers, minimum iOS versions, and file sizes so they cannot become stale when a release changes.

The download buttons describe APK/IPA files rather than implying App Store or Google Play availability. The iOS instructions link to [Sideloadly's official site](https://sideloadly.io/); downloading an IPA is distinct from signing and installing it on an iPhone.

To verify after deployment, open `/download` while signed out and check that both buttons resolve to assets in the latest GitHub release. Also verify `/downloads/Moodify.ipa` returns a temporary redirect to the GitHub latest IPA URL. No backend or database changes are required.
