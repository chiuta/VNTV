# VNTV on Android TV / Google TV / Fire TV

## Quick option (no installation)
Open `https://vntv.domain/` in a TV browser (e.g. TV Bro, or Silk on Fire TV) and add it to your bookmarks.
The remote works: arrows, OK, Back, plus the media keys and Channel +/− where available.

## Installable app (Trusted Web Activity)
VNTV is hosted as an installable web app (`deploy/site/`), so it can be packaged as an APK with Bubblewrap.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

To make it appear on the TV home screen, add the following to the generated `app/src/main/AndroidManifest.xml`:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Then publish `/.well-known/assetlinks.json` on the app's domain (Bubblewrap generates it), so the browser bar does not appear.
Installing on the TV: `adb install app-release-signed.apk`, or distribute the APK through F-Droid (your own repo).

For kiosk mode on a TV, set `startUrl` in `twa-manifest.json`, for example `/?kiosk=1&preset=tv&muted=0`.
