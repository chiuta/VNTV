# VNTV auf Android TV / Google TV / Fire TV

## Schnelle Variante (ohne Installation)
Öffne `https://vntv.domain/` in einem Browser für Fernseher (z. B. TV Bro oder Silk auf dem Fire TV) und füge es den Lesezeichen hinzu.
Die Fernbedienung funktioniert: Pfeiltasten, OK, Zurück sowie Medientasten und Kanal +/−, wo vorhanden.

## Installierbare App (Trusted Web Activity)
VNTV wird als installierbare Web-App gehostet (`deploy/site/`) und kann daher mit Bubblewrap als APK verpackt werden.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Damit es auf dem Startbildschirm des Fernsehers erscheint, füge in die erzeugte `app/src/main/AndroidManifest.xml` Folgendes ein:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Veröffentliche dann `/.well-known/assetlinks.json` auf der Domain der App (Bubblewrap erzeugt die Datei), damit die Browserleiste nicht erscheint.
Installation auf dem Fernseher: `adb install app-release-signed.apk`, oder verteile die APK über F-Droid (eigenes Repository).

Für den Kioskmodus auf dem Fernseher setze `startUrl` in `twa-manifest.json`, zum Beispiel `/?kiosk=1&preset=tv&muted=0`.
