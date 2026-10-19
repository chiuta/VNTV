# Hosting di VNTV (HTTPS)

Su HTTPS, VNTV si installa come applicazione (Android, iPhone, computer), funziona offline e ha accesso sicuro
allo schermo sempre acceso, alla traduzione del browser e all'invio alla TV.

## 1. L'applicazione — YunoHost (la via più semplice)

1. In YunoHost: **Applicazioni → Installa → My Webapp**, su un dominio o sottodominio (es. `vntv.trom.tf`),
   accesso **pubblico**.
2. Copia il contenuto della cartella `deploy/site/` in `/var/www/my_webapp/www/` (SFTP con l'utente dell'applicazione):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Apri `https://vntv.dominio/` — su Android compare «Installa app»; su iPhone: Condividi → Aggiungi a Home.

Per ogni nuova versione: `node build.mjs`, poi la stessa sincronizzazione. Il nuovo `sw.js` sostituisce automaticamente la versione precedente.

## 2. L'applicazione — qualsiasi server nginx

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
`connect-src https:` è volutamente ampio: gli spettatori possono aggiungere il proprio server LibreTranslate e altre istanze PeerTube.

## 3. L'addon Stremio

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
In YunoHost: l'applicazione **Redirect**, in modalità «proxy», verso `http://127.0.0.1:7000`, su un sottodominio
(es. `stremio.trom.tf`). Il proxy deve inoltrare `Host` e `X-Forwarded-Proto`.

Pubblicazione nel catalogo della comunità Stremio, dopo che funziona su HTTPS:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Traduzione privata (facoltativa)

Installa **LibreTranslate** dal catalogo YunoHost. In VNTV: Livelli → Lingua → Motore → LibreTranslate → indirizzo del
server. Nell'addon: la variabile `TRANSLATE_URL`.

## 5. Schermi pubblici (chiosco)

Indirizzo: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* parte da solo, senza comandi e senza cursore, e si ricarica ogni giorno;
* l'audio parte solo se il browser lo consente (sui chioschi Chromium: `--autoplay-policy=no-user-gesture-required`);
* uscita: premi **K** tre volte.

Esempio Raspberry Pi / mini-PC:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
