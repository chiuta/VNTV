# VNTV — VideoNeat Television

[English](README.md) · [Română](README.ro.md) · [Français](README.fr.md) · [Italiano](README.it.md) · **Español** · [Português](README.pt.md) · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Versión:** 2.5.0 · **Última actualización:** 2026-10-19

Idiomas de la interfaz: **Română, English, Français, Italiano, Español, Português (PT), Deutsch, Magyar**

**En línea / demo:** https://chiuta.github.io/VNTV/

![VNTV — captura de pantalla: la guía de TV (datos de prueba simulados)](screenshot.png)

*La captura se realizó con datos de prueba simulados (títulos ficticios, clip de prueba), no con el catálogo real.*

Un canal de TV científico non-stop y trade-free (libre de lógica comercial), construido a partir de la colección de [VideoNeat.com](https://www.videoneat.com):
canales sincronizados, guía de TV, catálogo navegable, subtítulos traducidos, 8 idiomas, y funciona en teléfonos,
tabletas, ordenadores y televisores. Sin cuentas, sin analítica, sin cookies; por defecto la aplicación solo se comunica con los sitios propios de TROM (videoneat.com y videos.trom.tf), véase *Privacidad y trade-free* más abajo.

## Qué es

VNTV reproduce los **tráileres** de los documentales de la colección VideoNeat (alojados en la instancia PeerTube de TROM, `videos.trom.tf`) como un canal de televisión: canales por categorías, guía de TV, navegación por el catálogo, subtítulos y 8 idiomas de interfaz. El proyecto no aloja vídeo; muestra y remite a la fuente oficial. En el canal TROM y en los canales PeerTube que añadas tú se reproducen vídeos completos.

## Contenido de este repositorio

| Carpeta | Qué es |
|---|---|
| `index.html`, `dist/vntv.html` | **La aplicación en un solo archivo.** Ábrela en un navegador. Funciona también desde la carpeta Descargas de un teléfono. |
| `deploy/site/` | La aplicación para alojar en HTTPS: instalable (pantalla de inicio / aplicación), funciona sin conexión, iconos, service worker. |
| `wp-plugin/videoneat-index/` | **Plugin de WordPress para videoneat.com**: publica el catálogo JSON oficial que usan VNTV y el addon. |
| `stremio-addon/` | Addon de Stremio (7 idiomas, catálogo oficial, canales PeerTube adicionales, LibreTranslate opcional). |
| `src/`, `i18n/` | Fuentes. `node build.mjs` produce las dos variantes de la aplicación. |
| `tools/` | `coverage.mjs` (cuántos títulos se pueden reproducir), `structure-check.mjs` (comprobación semanal), `make-icons.py`. |
| `tests/` | Pruebas automáticas (Playwright, simulaciones sin conexión). `npm test`. |
| `docs/` | Arquitectura, despliegue, guía para los administradores de TROM, carta de propuesta a TROM, lista de comprobación en dispositivos reales, Android TV. |

## Funciones

Verificadas en el código:

- 14 canales por categorías, más los **Favoritos** y el canal **TROM**; puedes añadir canales PeerTube (Ajustes → Fuentes).
- **Emisión sincronizada** (ON AIR): la programación se calcula a partir de la fecha, de modo que todos los espectadores del mismo canal ven el mismo clip en el mismo momento (requiere el catálogo JSON con duraciones; sin él, la aplicación muestra «NON-STOP», su propia lista de reproducción).
- Guía de TV, navegación por la colección con búsqueda, ficha de detalles, favoritos, búsqueda como «canal».
- Subtítulos de PeerTube (incluidas las transcripciones automáticas), traducción automática de títulos, descripciones y subtítulos.
- 8 idiomas: inglés, rumano, francés, español, alemán, italiano, portugués, húngaro.
- Capas de pantalla (logotipo, reloj, banner, barra de progreso, pantalla «retro», etc.) y 4 preajustes: TV, Cine, Retro, Limpio.
- Reproducción **P2P** (el reproductor de PeerTube) o **directa** (archivo MP4); imagen en imagen, envío al televisor, pantalla encendida, controles desde la pantalla de bloqueo.
- Modo quiosco para pantallas públicas: `?kiosk=1&ch=3&lang=en&preset=cinema&muted=0&reload=24`.
- La versión alojada puede instalarse como aplicación y funciona sin conexión para la interfaz (pero no para el vídeo).

## Manual de uso

1. Abre la página y pulsa el botón de inicio de la pantalla de inicio (o Intro/Espacio).
2. Cambia de canal con ↑ / ↓ (o las cifras 1–9); clip siguiente / anterior con → / ←; Espacio o K pausa.
3. Pulsa **G** para la guía de TV (canales y programa siguiente), **B** para explorar la colección, **I** para los detalles del clip actual, **O** para capas y ajustes, **S** para favoritos, **F** para pantalla completa, **H** para pantalla limpia, **M** para el sonido.
4. En el teléfono usas los botones en pantalla; toca la pantalla para mostrar los controles.
5. Para otro idioma: Ajustes (O) → Idioma. La traducción automática puede desactivarse desde el mismo lugar.
6. Para un canal PeerTube: Ajustes (O) → Mostrar todo → Fuentes → pega la dirección del canal (`https://instancia/c/canal`) → Añadir.
7. Si el P2P no funciona o no quieres que tu dirección IP sea visible para otros espectadores: Ajustes → Red → **Directa**.

## De dónde obtiene VNTV sus datos

1. **Catálogo oficial (preferido):** `https://www.videoneat.com/wp-json/videoneat/v1/index`, publicado por el
   plugin `videoneat-index`. Un único archivo pequeño en caché: rápido, sin análisis frágil, y lleva las duraciones de los tráileres,
   que necesita la **emisión sincronizada**.
2. **Respaldo:** la API pública de WordPress, leyendo cada artículo. Más lento; la aplicación muestra con honestidad **NON-STOP**
   en lugar de **ON AIR**, porque cada uno recibe su propia lista de reproducción.
3. **Fuentes adicionales:** cualquier canal PeerTube con vídeos de licencia abierta puede añadirse como canal (Capas → Fuentes).

## Reproducción

* **P2P** (por defecto en ordenadores y televisores): el reproductor oficial de PeerTube, que reparte la carga entre los espectadores y
  reduce los costes del servidor de TROM. VNTV lo controla mediante la API de incrustación de PeerTube.
* **Directa** (por defecto en iOS y en teléfonos con datos móviles): el archivo MP4 en un elemento `<video>` — necesaria para
  imagen en imagen, AirPlay y Chromecast, y más ligera para los datos móviles.
* Antes del primer uso del P2P, VNTV explica que el P2P hace visible la IP del espectador a los demás espectadores y ofrece
  en su lugar la reproducción directa. Si el reproductor de PeerTube no responde en 10 s, VNTV pasa a la reproducción directa.

## Canales

Categorías de VideoNeat 1–14 (tráileres) · 15 Favoritos · **16 TROM** (los documentales completos de TROM de videos.trom.tf)
· 17+ cualquier canal PeerTube que añada el espectador. El canal 16 puede eliminarse en Ajustes → Fuentes.

## Privacidad y trade-free

* **Almacenamiento local (`localStorage`, solo en tu navegador):** `vntv.prefs` (idioma, canal, ajustes), `vntv.ov` (capas), `vntv.favs` (favoritos), `vntv.trc` (memoria de traducciones, máx. 2500). Sin cookies, cuentas ni analítica. Si `localStorage` no está disponible, la aplicación funciona con memoria temporal. En modo quiosco los ajustes no se guardan.
* Hosts contactados por defecto: `www.videoneat.com` (catálogo, imágenes; como respaldo, la API de WordPress) y `videos.trom.tf` (datos de vídeo, archivos, reproductor P2P, subtítulos). Otros hosts solo cuando el espectador añade un canal PeerTube, introduce una dirección de LibreTranslate o selecciona explícitamente MyMemory. En modo P2P el reproductor de PeerTube se conecta también a otros espectadores (WebRTC). Cuando la aplicación se sirve desde un host como GitHub Pages, ese host ve la visita como en cualquier página web.
* Las fuentes están incorporadas (Oswald, SIL OFL). Sin Google Fonts, sin analítica, sin cookies.
* Traducción del contenido: el traductor del navegador en el dispositivo, o tu propio **LibreTranslate**. El servicio comercial
  MyMemory (`api.mymemory.translated.net`) se usa **solo si el espectador lo selecciona explícitamente**, con una advertencia (los textos que se traducen se le envían).
* Los favoritos, los ajustes y las traducciones permanecen en el navegador del espectador.
* **Permisos:** pantalla encendida (wake lock), pantalla completa, imagen en imagen. No pide cámara, micrófono ni ubicación.
* La página contiene una política CSP (`<meta>`) que limita las cargas a HTTPS/HTTP y bloquea objetos y formularios.

## Límites y advertencias

- La aplicación depende de la disponibilidad de `videoneat.com` y `videos.trom.tf`; sin ellos no tiene nada que reproducir.
- Los tráileres pertenecen a sus productores (PBS, BBC y otros) y se muestran para su descubrimiento, con enlace a la fuente oficial. Para la retirada de contenido: [TROM](https://www.tromsite.com/contact/); lo que desaparece de VideoNeat / videos.trom.tf desaparece también de VNTV. VNTV no muestra ni remite a archivos torrent/magnet.
- Las traducciones automáticas pueden equivocarse; siempre puedes ver el original.
- Las capturas de pantalla y las pruebas automáticas usan datos simulados; el funcionamiento en dispositivos reales (TV, iOS, Cast) debe verificarse según `docs/TESTING.md`.
- La disponibilidad de P2P, AirPlay y Cast difiere entre navegadores y dispositivos.

## Changelog (2.3.0)

* 2.3.0 — 2026-10-18: resiliencia ante errores de reproducción — reintento, alternativa de calidad/formato, P2P y otro host PeerTube, espera sin conexión, lista negra local de 24 h, barra de errores con acciones, registro de errores local exportable (sin telemetría).

* 2.2.0 — 2026-10-18: nuevo panel **Pantalla** — Cast / AirPlay, imagen en imagen, ventana separada (segundo monitor) y un enlace de quiosco + código QR para un televisor o cualquier otra pantalla.

* 2.1.4 — 2026-10-12: la versión y la fecha de la última actualización se muestran ahora en la aplicación (panel Capas).
* Pantalla de inicio: el mensaje «no se puede cargar la lista» se muestra ahora en línea bajo el texto de introducción, en lugar de una notificación que se superponía al logotipo de VNTV a 360 px; mientras el navegador informa de que está sin conexión, la solicitud del catálogo ya no se intenta al arrancar (se reintenta sola con el evento `online`).

* CSP: el script en línea se permite ahora mediante hash SHA-256 (calculado por `build.mjs` en cada compilación); `script-src` ya no contiene `'unsafe-inline'`.
* La pantalla de inicio muestra un aviso (7 idiomas) cuando el navegador informa de que está sin conexión, ya que VNTV no tiene contenido sin conexión.
* El conjunto de pruebas incluido (Playwright, red simulada) se ejecuta ahora en este entorno: 25/25 superadas en la ejecución final (en una primera ejecución falló una prueba sensible al tiempo, la sincronización entre dos espectadores, que pasó al repetirla).
* El atributo `allow` del iframe de PeerTube se establece solo cuando se usa el iframe (elimina tres advertencias de la consola al arrancar).

* La aplicación está ahora envuelta en un hito `<main>` y el título «lower third» ya no es un encabezado vacío (axe-core: 0 infracciones a 1280 y 360 px).
* El mensaje «no se puede cargar la lista» indica ahora claramente que VNTV no tiene contenido sin conexión y necesita conexión a internet (7 idiomas).
* Versión subida a 2.1.1 (package.json, lockfile, service worker generado).
* Sin una red real falta el catálogo; la reproducción se verificó solo con la red simulada de las pruebas, no con videoneat.com (límite declarado).

## Licencia

MIT, véase [LICENSE](LICENSE). Fuente incorporada: Oswald, SIL OFL 1.1 (`src/fonts/OFL-Oswald.txt`, detalles en [NOTICE.md](NOTICE.md)).

## Compilación y pruebas

```bash
node build.mjs                 # index.html + dist/vntv.html + deploy/site/index.html + sw.js
npm install                    # ESLint + Playwright (dev only)
npx playwright install chromium
npm run test:all               # lint + 25 end-to-end + 30 PHP + 33 addon tests, all offline
```

Abre `index.html` directamente en el navegador (se necesita internet para el catálogo y el vídeo). `node build.mjs` genera `index.html`, `dist/vntv.html` y `deploy/site/` y no requiere `npm install`. Para las pruebas completas: `npm install`, `npm run test:all` (Playwright, PHP y Node; todas se ejecutan con datos simulados).

Publicación en GitHub Pages: `Settings → Pages → Source: GitHub Actions`; el workflow `.github/workflows/pages.yml` compila y publica `deploy/site` (más `vntv.html` como descarga).

## Quiosco / pantallas públicas

`vntv.html?kiosk=1&ch=3&lang=en&preset=cinema&muted=0&reload=24` — arranca sola, sin controles, sin cursor,
se recarga a diario. Pulsa **K** tres veces para salir.

## Autor

Alexio — Alexandru-Ionuț Chiuță, contacto: alexio@trom.tf

---
Véase [CHANGELOG.md](CHANGELOG.md).
