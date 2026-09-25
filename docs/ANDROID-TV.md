# VNTV pe Android TV / Google TV / Fire TV

## Varianta rapidă (fără instalare)
Deschide `https://vntv.domeniu/` într-un browser pentru TV (de ex. TV Bro sau Silk pe Fire TV) și adaug-o la favorite.
Telecomanda funcționează: săgeți, OK, Înapoi, iar tastele media și Canal +/− acolo unde există.

## Aplicație instalabilă (Trusted Web Activity)
VNTV e găzduit ca aplicație web instalabilă (`deploy/site/`), deci poate fi împachetat ca APK cu Bubblewrap.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Ca să apară pe ecranul principal al televizorului, în `app/src/main/AndroidManifest.xml` generat adaugă:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Apoi publică `/.well-known/assetlinks.json` pe domeniul aplicației (Bubblewrap îl generează), ca să nu apară bara
browserului. Instalare pe TV: `adb install app-release-signed.apk`, sau distribuie APK-ul prin F-Droid (repo propriu).

Pentru mod chioșc pe TV, setează `startUrl` în `twa-manifest.json`, de exemplu `/?kiosk=1&preset=tv&muted=0`.
