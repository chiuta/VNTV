# Găzduire VNTV (HTTPS)

Pe HTTPS, VNTV se instalează ca aplicație (Android, iPhone, calculator), merge offline și are acces sigur la
ecranul ținut aprins, traducerea din browser și trimiterea la TV.

## 1. Aplicația — YunoHost (cea mai simplă cale)

1. În YunoHost: **Aplicații → Instalează → My Webapp**, pe un domeniu sau subdomeniu (ex. `vntv.trom.tf`),
   acces **public**.
2. Copiază conținutul folderului `deploy/site/` în `/var/www/my_webapp/www/` (SFTP cu utilizatorul aplicației):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Deschide `https://vntv.domeniu/` — pe Android apare „Instalează aplicația”; pe iPhone: Partajare → Adaugă pe ecranul principal.

La fiecare versiune nouă: `node build.mjs`, apoi aceeași sincronizare. Noul `sw.js` înlocuiește automat versiunea veche.

## 2. Aplicația — orice server nginx

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
`connect-src https:` e larg intenționat: spectatorii pot adăuga propriul server LibreTranslate și alte instanțe PeerTube.

## 3. Addonul Stremio

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
În YunoHost: aplicația **Redirect**, în modul „proxy”, către `http://127.0.0.1:7000`, pe un subdomeniu
(ex. `stremio.trom.tf`). Proxy-ul trebuie să transmită `Host` și `X-Forwarded-Proto`.

Publicarea în catalogul comunitar Stremio, după ce merge pe HTTPS:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Traducere privată (opțional)

Instalează **LibreTranslate** din catalogul YunoHost. În VNTV: Straturi → Limbă → Motor → LibreTranslate → adresa
serverului. În addon: variabila `TRANSLATE_URL`.

## 5. Ecrane publice (chioșc)

Adresa: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* pornește singur, fără comenzi și fără cursor, și se reîncarcă zilnic;
* sunetul pornește doar dacă browserul permite (pe chioșcuri Chromium: `--autoplay-policy=no-user-gesture-required`);
* ieșire: apasă **K** de trei ori.

Exemplu Raspberry Pi / mini-PC:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
