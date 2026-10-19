# Hébergement de VNTV (HTTPS)

Sous HTTPS, VNTV s'installe comme une application (Android, iPhone, ordinateur), fonctionne hors ligne et accède de façon sûre
à la mise en veille de l'écran, à la traduction du navigateur et à l'envoi vers la TV.

## 1. L'application — YunoHost (le plus simple)

1. Dans YunoHost : **Applications → Installer → My Webapp**, sur un domaine ou un sous-domaine (p. ex. `vntv.trom.tf`),
   accès **public**.
2. Copiez le contenu du dossier `deploy/site/` dans `/var/www/my_webapp/www/` (SFTP avec l'utilisateur de l'application) :
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Ouvrez `https://vntv.domaine/` — sur Android, « Installer l'application » apparaît ; sur iPhone : Partager → Sur l'écran d'accueil.

À chaque nouvelle version : `node build.mjs`, puis la même synchronisation. Le nouveau `sw.js` remplace automatiquement l'ancienne version.

## 2. L'application — n'importe quel serveur nginx

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
`connect-src https:` est volontairement large : les spectateurs peuvent ajouter leur propre serveur LibreTranslate et d'autres instances PeerTube.

## 3. L'addon Stremio

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
Dans YunoHost : l'application **Redirect**, en mode « proxy », vers `http://127.0.0.1:7000`, sur un sous-domaine
(p. ex. `stremio.trom.tf`). Le proxy doit transmettre `Host` et `X-Forwarded-Proto`.

Publication dans le catalogue communautaire Stremio, une fois que cela fonctionne en HTTPS :
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Traduction privée (facultatif)

Installez **LibreTranslate** depuis le catalogue YunoHost. Dans VNTV : Couches → Langue → Moteur → LibreTranslate → adresse du
serveur. Dans l'addon : la variable `TRANSLATE_URL`.

## 5. Écrans publics (borne)

Adresse : `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* démarre tout seul, sans commandes ni curseur, et se recharge chaque jour ;
* le son ne démarre que si le navigateur l'autorise (sur les bornes Chromium : `--autoplay-policy=no-user-gesture-required`) ;
* sortie : appuyez **trois fois** sur **K**.

Exemple Raspberry Pi / mini-PC :
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
