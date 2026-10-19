# Hosting VNTV (HTTPS)

Over HTTPS, VNTV installs as an app (Android, iPhone, computer), works offline and has safe access to
screen wake lock, in-browser translation and casting to a TV.

## 1. The app — YunoHost (the easiest way)

1. In YunoHost: **Apps → Install → My Webapp**, on a domain or subdomain (e.g. `vntv.trom.tf`),
   **public** access.
2. Copy the contents of the `deploy/site/` folder into `/var/www/my_webapp/www/` (SFTP as the app user):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Open `https://vntv.domain/` — on Android an "Install app" prompt appears; on iPhone: Share → Add to Home Screen.

For every new release: `node build.mjs`, then the same sync. The new `sw.js` automatically replaces the old version.

## 2. The app — any nginx server

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
`connect-src https:` is deliberately broad: viewers can add their own LibreTranslate server and other PeerTube instances.

## 3. The Stremio addon

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
In YunoHost: the **Redirect** app, in "proxy" mode, to `http://127.0.0.1:7000`, on a subdomain
(e.g. `stremio.trom.tf`). The proxy must forward `Host` and `X-Forwarded-Proto`.

Publishing to the Stremio community catalog, once it works over HTTPS:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Private translation (optional)

Install **LibreTranslate** from the YunoHost catalog. In VNTV: Layers → Language → Engine → LibreTranslate → the server
address. In the addon: the `TRANSLATE_URL` variable.

## 5. Public screens (kiosk)

Address: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* starts on its own, with no controls and no cursor, and reloads daily;
* sound starts only if the browser allows it (on Chromium kiosks: `--autoplay-policy=no-user-gesture-required`);
* exit: press **K** three times.

Raspberry Pi / mini-PC example:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
