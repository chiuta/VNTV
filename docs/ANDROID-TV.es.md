# VNTV en Android TV / Google TV / Fire TV

## Variante rápida (sin instalación)
Abre `https://vntv.dominio/` en un navegador para TV (p. ej. TV Bro, o Silk en Fire TV) y añádelo a favoritos.
El mando a distancia funciona: flechas, OK, Atrás, además de las teclas multimedia y Canal +/− donde existan.

## Aplicación instalable (Trusted Web Activity)
VNTV se aloja como aplicación web instalable (`deploy/site/`), por lo que puede empaquetarse como APK con Bubblewrap.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Para que aparezca en la pantalla de inicio del televisor, añade en el `app/src/main/AndroidManifest.xml` generado:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Después publica `/.well-known/assetlinks.json` en el dominio de la aplicación (Bubblewrap lo genera), para que no aparezca la barra del navegador.
Instalación en el televisor: `adb install app-release-signed.apk`, o distribuye el APK a través de F-Droid (repositorio propio).

Para el modo quiosco en el televisor, define `startUrl` en `twa-manifest.json`, por ejemplo `/?kiosk=1&preset=tv&muted=0`.
