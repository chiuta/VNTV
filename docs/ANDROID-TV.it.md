# VNTV su Android TV / Google TV / Fire TV

## Variante rapida (senza installazione)
Apri `https://vntv.dominio/` in un browser per TV (ad es. TV Bro, o Silk su Fire TV) e aggiungilo ai preferiti.
Il telecomando funziona: frecce, OK, Indietro, più i tasti multimediali e Canale +/− dove presenti.

## Applicazione installabile (Trusted Web Activity)
VNTV è pubblicato come applicazione web installabile (`deploy/site/`), quindi può essere impacchettato come APK con Bubblewrap.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Per farlo comparire nella schermata Home del televisore, nel file `app/src/main/AndroidManifest.xml` generato aggiungi:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Poi pubblica `/.well-known/assetlinks.json` sul dominio dell'applicazione (Bubblewrap lo genera), in modo che non compaia la barra del browser.
Installazione sulla TV: `adb install app-release-signed.apk`, oppure distribuisci l'APK tramite F-Droid (repository proprio).

Per la modalità chiosco sulla TV, imposta `startUrl` in `twa-manifest.json`, ad esempio `/?kiosk=1&preset=tv&muted=0`.
