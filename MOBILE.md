# Building the native apps (App Store + Google Play)

The web app is wrapped with [Capacitor](https://capacitorjs.com/). The native
iOS/Android projects are **generated** (not committed) — you create them on your
Mac, then build and submit from Xcode / Android Studio.

## One-time prerequisites (on your Mac)

- **Node.js** 18+ (you already have it for the web app).
- **Xcode** (App Store) + **CocoaPods**: `sudo gem install cocoapods`.
- **Android Studio** (Google Play) with an SDK + JDK 17.
- Developer accounts:
  - **Apple Developer Program** — $99/year.
  - **Google Play Console** — $25 one-time.

## Set up the projects

```sh
git clone https://github.com/dzau/riflery_scoring_practice.git
cd riflery_scoring_practice
npm install

# Build the web bundle (www/) and create the native projects:
npm run add:ios
npm run add:android
```

`npm run build` copies the static site into `www/`; Capacitor wraps that.
Whenever you change the web app, run **`npm run sync`** to push the changes into
both native projects.

## Open and run

```sh
npm run open:ios       # opens Xcode
npm run open:android   # opens Android Studio
```

In Xcode: pick your team/signing, choose a device or simulator, and Run. Archive
→ Distribute App to submit to App Store Connect.

In Android Studio: Run on a device/emulator. Build → Generate Signed Bundle
(`.aab`) to upload to the Play Console.

## App identity

- The bundle id is `com.riflery.scoringpractice` (in `capacitor.config.json`).
  Change it to your own reverse-DNS id before first submit if you like — it must
  be unique and is permanent once published.
- App name: **Riflery Scoring Practice**.
- Icons: the PWA icons live in `assets/`. To generate full native icon/splash
  sets, run `npx @capacitor/assets generate` (point it at a 1024×1024 icon).

## Camera permissions (Mode 3)

The native app uses the Capacitor **Camera** plugin. Add the usage strings, or
the app will be rejected / crash when opening the camera.

**iOS** — in `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Take a photo of your target to score it.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Choose a target photo to score it.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save scored target photos.</string>
```

**Android** — in `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## Notes

- All scoring/detection runs **on-device** — no photos are uploaded.
- `ios/`, `android/`, `www/`, and `node_modules/` are git-ignored. If you prefer
  to version the native projects (so the permission edits above persist), remove
  `ios/` and `android/` from `.gitignore` and commit them.
