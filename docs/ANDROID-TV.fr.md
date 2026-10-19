# VNTV sur Android TV / Google TV / Fire TV

## Variante rapide (sans installation)
Ouvrez `https://vntv.domaine/` dans un navigateur pour TV (p. ex. TV Bro, ou Silk sur Fire TV) et ajoutez-le aux favoris.
La télécommande fonctionne : flèches, OK, Retour, ainsi que les touches multimédia et Chaîne +/− là où elles existent.

## Application installable (Trusted Web Activity)
VNTV est hébergé comme application web installable (`deploy/site/`) ; il peut donc être empaqueté en APK avec Bubblewrap.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://vntv.domeniu/manifest.webmanifest
bubblewrap build          # produce app-release-signed.apk
```

Pour qu'il apparaisse sur l'écran d'accueil du téléviseur, ajoutez dans le `app/src/main/AndroidManifest.xml` généré :
```xml
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<!-- în <application>: -->
android:banner="@drawable/banner"   <!-- imagine 320×180 px -->
<!-- în <intent-filter>-ul activității principale: -->
<category android:name="android.intent.category.LEANBACK_LAUNCHER" />
```
Publiez ensuite `/.well-known/assetlinks.json` sur le domaine de l'application (Bubblewrap le génère), afin que la barre du navigateur n'apparaisse pas.
Installation sur la TV : `adb install app-release-signed.apk`, ou distribuez l'APK via F-Droid (dépôt personnel).

Pour le mode borne sur une TV, définissez `startUrl` dans `twa-manifest.json`, par exemple `/?kiosk=1&preset=tv&muted=0`.
