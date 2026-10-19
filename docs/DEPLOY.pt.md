# Alojamento do VNTV (HTTPS)

Em HTTPS, o VNTV instala-se como aplicação (Android, iPhone, computador), funciona offline e tem acesso seguro
ao ecrã sempre aceso, à tradução do navegador e ao envio para a TV.

## 1. A aplicação — YunoHost (o caminho mais simples)

1. No YunoHost: **Aplicações → Instalar → My Webapp**, num domínio ou subdomínio (ex.: `vntv.trom.tf`),
   acesso **público**.
2. Copie o conteúdo da pasta `deploy/site/` para `/var/www/my_webapp/www/` (SFTP com o utilizador da aplicação):
   ```bash
   rsync -av deploy/site/ my_webapp@server:/var/www/my_webapp/www/
   ```
3. Abra `https://vntv.dominio/` — no Android surge «Instalar aplicação»; no iPhone: Partilhar → Adicionar ao ecrã principal.

A cada nova versão: `node build.mjs` e a mesma sincronização. O novo `sw.js` substitui automaticamente a versão antiga.

## 2. A aplicação — qualquer servidor nginx

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
`connect-src https:` é propositadamente amplo: os espectadores podem adicionar o seu próprio servidor LibreTranslate e outras instâncias PeerTube.

## 3. O addon do Stremio

```bash
cd stremio-addon
docker build -t vntv-stremio .
docker run -d --restart unless-stopped -p 127.0.0.1:7000:7000 \
  -e TRANSLATE_URL=https://translate.example.org \
  -e PEERTUBE_CHANNELS=https://instanta.org/c/canal \
  vntv-stremio
```
No YunoHost: a aplicação **Redirect**, em modo «proxy», para `http://127.0.0.1:7000`, num subdomínio
(ex.: `stremio.trom.tf`). O proxy tem de transmitir `Host` e `X-Forwarded-Proto`.

Publicação no catálogo comunitário do Stremio, depois de funcionar em HTTPS:
```bash
node publish.js https://stremio.trom.tf/en/manifest.json
```

## 4. Tradução privada (opcional)

Instale o **LibreTranslate** a partir do catálogo do YunoHost. No VNTV: Camadas → Idioma → Motor → LibreTranslate → endereço do
servidor. No addon: a variável `TRANSLATE_URL`.

## 5. Ecrãs públicos (quiosque)

Endereço: `https://vntv.domeniu/?kiosk=1&ch=3&lang=ro&preset=cinema&muted=0&reload=24`
* arranca sozinho, sem comandos nem cursor, e recarrega diariamente;
* o som só arranca se o navegador o permitir (em quiosques Chromium: `--autoplay-policy=no-user-gesture-required`);
* saída: prima **K** três vezes.

Exemplo Raspberry Pi / mini-PC:
```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required "https://vntv.domeniu/?kiosk=1&preset=tv&muted=0"
```
