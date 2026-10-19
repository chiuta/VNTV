# VNTV hosten (HTTPS)

Über HTTPS wird VNTV als App installiert (Android, iPhone, Computer), funktioniert offline und hat sicheren Zugriff auf
das Wachhalten des Bildschirms, die Übersetzung im Browser und das Senden an den Fernseher.

## 1. Die App — YunoHost (der einfachste Weg)

1. In YunoHost: **Apps → Installieren → My Webapp**, auf einer Domain oder Subdomain (z. B. `vntv.trom.tf`),
   **öffentlicher** Zugriff.
2. Kopiere den Inhalt des Ordners `deploy/site/` nach `/var/www/my_webapp/www/` (SFTP mit dem Benutzer der App):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Öffne `https://vntv.domain/` — auf Android erscheint „App installieren“; auf dem iPhone: Teilen → Zum Home-Bildschirm.

Bei jeder neuen Version: `node build.mjs`, dann dieselbe Synchronisierung. Die neue `sw.js` ersetzt automatisch die alte Version.

## 2. Die App — jeder nginx-Server

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
`connect-src https:` ist absichtlich weit gefasst: Zuschauer können ihren eigenen LibreTranslate-Server und weitere PeerTube-Instanzen hinzufügen.

## 3. Das Stremio-Addon

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
In YunoHost: die App **Redirect**, im Modus „proxy“, auf `http://127.0.0.1:7000`, auf einer Subdomain
(z. B. `stremio.trom.tf`). Der Proxy muss `Host` und `X-Forwarded-Proto` weiterreichen.

Veröffentlichung im Stremio-Community-Katalog, sobald es über HTTPS läuft:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Private Übersetzung (optional)

Installiere **LibreTranslate** aus dem YunoHost-Katalog. In VNTV: Ebenen → Sprache → Engine → LibreTranslate → Adresse des
Servers. Im Addon: die Variable `TRANSLATE_URL`.

## 5. Öffentliche Bildschirme (Kiosk)

Adresse: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* startet von selbst, ohne Bedienelemente und ohne Mauszeiger, und lädt täglich neu;
* der Ton startet nur, wenn der Browser es erlaubt (bei Chromium-Kiosken: `--autoplay-policy=no-user-gesture-required`);
* Beenden: dreimal **K** drücken.

Beispiel Raspberry Pi / Mini-PC:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
