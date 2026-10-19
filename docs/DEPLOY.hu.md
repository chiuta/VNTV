# A VNTV üzemeltetése (HTTPS)

HTTPS-en a VNTV alkalmazásként telepíthető (Android, iPhone, számítógép), offline is működik, és biztonságosan hozzáfér
a képernyő bekapcsolva tartásához, a böngészős fordításhoz és a TV-re küldéshez.

## 1. Az alkalmazás — YunoHost (a legegyszerűbb út)

1. A YunoHostban: **Alkalmazások → Telepítés → My Webapp**, egy domainen vagy aldomainen (pl. `vntv.trom.tf`),
   **nyilvános** hozzáféréssel.
2. Másold a `deploy/site/` mappa tartalmát a `/var/www/my_webapp/www/` könyvtárba (SFTP az alkalmazás felhasználójával):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Nyisd meg a `https://vntv.domain/` címet — Androidon megjelenik az „Alkalmazás telepítése” felirat; iPhone-on: Megosztás → Főképernyőhöz adás.

Minden új kiadásnál: `node build.mjs`, majd ugyanaz a szinkronizálás. Az új `sw.js` automatikusan leváltja a régit.

## 2. Az alkalmazás — bármely nginx-szerver

```nginx
server {
  server_name vntv.example.org;
  root /var/www/vntv;              # conținutul lui deploy/site/
  index index.html;
  location = /sw.js { add_header Cache-Control "no-cache"; }
  location / { try_files $uri /index.html; add_header Cache-Control "public, max-age=300"; }
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src https: blob:; connect-src https:; frame-src https:; font-src data:; worker-src 'self'; manifest-src 'self'" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "interest-cohort=()" always;
  # listen 443 ssl; certificate … (certbot / YunoHost)
}
```
A `connect-src https:` szándékosan tág: a nézők hozzáadhatják saját LibreTranslate-szerverüket és más PeerTube-példányokat.

## 3. A Stremio-kiegészítő

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
A YunoHostban: a **Redirect** alkalmazás „proxy” módban, a `http://127.0.0.1:7000` címre, egy aldomainen
(pl. `stremio.trom.tf`). A proxynak át kell adnia a `Host` és az `X-Forwarded-Proto` fejlécet.

Közzététel a Stremio közösségi katalógusában, miután HTTPS-en működik:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Privát fordítás (opcionális)

Telepítsd a **LibreTranslate**-et a YunoHost katalógusából. A VNTV-ben: Rétegek → Nyelv → Motor → LibreTranslate → a szerver
címe. A kiegészítőben: a `TRANSLATE_URL` változó.

## 5. Nyilvános képernyők (kioszk)

Cím: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* magától elindul, vezérlők és kurzor nélkül, és naponta újratölt;
* a hang csak akkor indul, ha a böngésző engedi (Chromium-kioszkokon: `--autoplay-policy=no-user-gesture-required`);
* kilépés: nyomd meg a **K** billentyűt háromszor.

Raspberry Pi / mini-PC példa:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
