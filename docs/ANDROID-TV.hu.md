# VNTV Android TV / Google TV / Fire TV készüléken

## Gyors megoldás (telepítés nélkül)
Nyisd meg a `https://vntv.domain/` címet egy TV-s böngészőben (pl. TV Bro, Fire TV-n Silk), és add hozzá a könyvjelzőkhöz.
A távirányító működik: nyilak, OK, Vissza, valamint a médiagombok és a Csatorna +/−, ahol vannak.

## Telepíthető alkalmazás (Trusted Web Activity)
A VNTV telepíthető webalkalmazásként van üzemeltetve (`deploy/site/`), ezért a Bubblewrappel APK-vá csomagolható.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Hogy megjelenjen a TV kezdőképernyőjén, a generált `app/src/main/AndroidManifest.xml` fájlba add hozzá:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Ezután tedd közzé a `/.well-known/assetlinks.json` fájlt az alkalmazás domainjén (a Bubblewrap legenerálja), hogy ne jelenjen meg a böngészősáv.
Telepítés a TV-re: `adb install app-release-signed.apk`, vagy terjeszd az APK-t F-Droidon keresztül (saját tárhely).

TV-n kioszk módhoz állítsd be a `startUrl` értékét a `twa-manifest.json` fájlban, például `/?kiosk=1&preset=tv&muted=0`.
