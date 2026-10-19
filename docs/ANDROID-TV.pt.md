# VNTV no Android TV / Google TV / Fire TV

## Variante rápida (sem instalação)
Abra `https://vntv.dominio/` num navegador para TV (por ex. TV Bro, ou Silk no Fire TV) e adicione-o aos favoritos.
O telecomando funciona: setas, OK, Voltar, além das teclas multimédia e Canal +/− onde existirem.

## Aplicação instalável (Trusted Web Activity)
O VNTV está alojado como aplicação web instalável (`deploy/site/`), pelo que pode ser empacotado como APK com o Bubblewrap.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Para que apareça no ecrã principal da televisão, adicione ao `app/src/main/AndroidManifest.xml` gerado:
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Depois publique `/.well-known/assetlinks.json` no domínio da aplicação (o Bubblewrap gera-o), para que a barra do navegador não apareça.
Instalação na TV: `adb install app-release-signed.apk`, ou distribua o APK através do F-Droid (repositório próprio).

Para o modo quiosque na TV, defina `startUrl` em `twa-manifest.json`, por exemplo `/?kiosk=1&preset=tv&muted=0`.
