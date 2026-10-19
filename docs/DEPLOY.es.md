# Alojamiento de VNTV (HTTPS)

Con HTTPS, VNTV se instala como aplicación (Android, iPhone, ordenador), funciona sin conexión y tiene acceso seguro
a la pantalla siempre encendida, a la traducción del navegador y al envío al televisor.

## 1. La aplicación — YunoHost (el camino más sencillo)

1. En YunoHost: **Aplicaciones → Instalar → My Webapp**, en un dominio o subdominio (p. ej. `vntv.trom.tf`),
   acceso **público**.
2. Copia el contenido de la carpeta `deploy/site/` en `/var/www/my_webapp/www/` (SFTP con el usuario de la aplicación):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Abre `https://vntv.dominio/` — en Android aparece «Instalar aplicación»; en iPhone: Compartir → Añadir a pantalla de inicio.

En cada versión nueva: `node build.mjs` y la misma sincronización. El nuevo `sw.js` sustituye automáticamente a la versión anterior.

## 2. La aplicación — cualquier servidor nginx

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
`connect-src https:` es amplio a propósito: los espectadores pueden añadir su propio servidor LibreTranslate y otras instancias de PeerTube.

## 3. El addon de Stremio

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
En YunoHost: la aplicación **Redirect**, en modo «proxy», hacia `http://127.0.0.1:7000`, en un subdominio
(p. ej. `stremio.trom.tf`). El proxy debe transmitir `Host` y `X-Forwarded-Proto`.

Publicación en el catálogo comunitario de Stremio, una vez que funcione con HTTPS:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Traducción privada (opcional)

Instala **LibreTranslate** desde el catálogo de YunoHost. En VNTV: Capas → Idioma → Motor → LibreTranslate → dirección del
servidor. En el addon: la variable `TRANSLATE_URL`.

## 5. Pantallas públicas (quiosco)

Dirección: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* arranca solo, sin controles y sin cursor, y se recarga a diario;
* el sonido solo se activa si el navegador lo permite (en quioscos Chromium: `--autoplay-policy=no-user-gesture-required`);
* salida: pulsa **K** tres veces.

Ejemplo Raspberry Pi / mini-PC:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
