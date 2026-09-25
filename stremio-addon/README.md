# VideoNeat for Stremio

A dependency-free Stremio addon (Node ≥ 18) that brings the **VideoNeat.com** collection into Stremio: science documentaries, films and courses curated by TROM.
Interface in **7 languages**: English (default), Română, Français, Español, Deutsch, Italiano, Português.

## Features
- **14 catalogs** in Discover (Latest, Documentaries, 10 science categories, Movies, Courses) with **search** and paging.
- **Full detail page**: title, image, description, year, length, genre, official source (PBS, BBC…).
- **Streams**: the trailer hosted on PeerTube `videos.trom.tf` (adaptive HLS + MP4 1080p/720p/480p), plus buttons to the VideoNeat page and the official source.
- Catalog names, genres, labels and stream titles are translated. **Titles and descriptions** can also be translated automatically through your own **LibreTranslate** server (optional).
- Internal cache, open CORS, install page with a language picker at `/`.

## Run
```bash
node index.js                    # or: PORT=8080 node index.js
```
Open `http://127.0.0.1:7000/`, pick a language and press **Install in Stremio**, or paste
`http://127.0.0.1:7000/<lang>/manifest.json` into Stremio → Addons (`en`, `ro`, `fr`, `es`, `de`, `it`, `pt`).
`/manifest.json` without a prefix is English. The ⚙ button in Stremio reopens the language picker.

### Official VideoNeat catalog (automatic)
When the **VideoNeat Index** WordPress plugin is active on videoneat.com, the addon reads its compact JSON catalog
(`/wp-json/videoneat/v1/index`) instead of full article pages — faster, and trailer data is exact. Override with
`INDEX_URL=…`. Without it, the addon falls back to the WordPress API.

### Extra PeerTube channels (full, openly licensed videos)
```bash
PEERTUBE_CHANNELS=https://instance.org/c/channel,https://other.org/a/account node index.js
```
Each becomes a catalog "PeerTube — <channel name>" whose streams are the full videos (HLS + MP4), with their licence.

### Operations
* `GET /health` — status (catalog source, number of titles, PeerTube channels, translation on/off, uptime).
* `RATE_LIMIT=120` — requests per minute per IP (default 120, `0` turns it off). Excess requests get HTTP 429.
* `CACHE_FILE=/data/translations.json` — keeps LibreTranslate results across restarts (saved every minute).
  At most 4 translation requests run at the same time, for all clients together.

### Publish to the Stremio community catalog
After the addon runs on HTTPS: `node publish.js https://your-host/en/manifest.json`

### Tests
`node test.js` — runs offline against mocks, with and without the official catalog.

### Automatic translation of titles and descriptions (optional)
```bash
TRANSLATE_URL=https://translate.your-domain.tld TRANSLATE_KEY=optional node index.js
```
Uses the LibreTranslate API (`POST /translate`). LibreTranslate is free software and is available as a YunoHost app.
Translations are cached in memory for 30 days. Without `TRANSLATE_URL`, titles and descriptions stay in English.

## Permanent hosting (e.g. YunoHost / any VPS)
```bash
docker build -t stremio-videoneat .
docker run -d --restart unless-stopped -p 7000:7000 -e TRANSLATE_URL=… stremio-videoneat
```
Put an HTTPS reverse proxy in front (e.g. `stremio.domain.tld` → `127.0.0.1:7000`).
**Stremio Web and the mobile apps require HTTPS**; Stremio desktop also accepts `http://127.0.0.1`.
The proxy should pass `Host` / `X-Forwarded-Proto` so the install link is correct.

## IDs
`vneat:<WordPress post ID>` — e.g. `vneat:26766` = *Dino Birds*.

## Data sources
- `https://www.videoneat.com/wp-json/wp/v2/posts` (public WordPress API)
- `https://videos.trom.tf/api/v1/videos/<id>` (PeerTube API)

---

**Pe scurt, în română:** addon-ul are interfața în 7 limbi; alegi limba pe pagina de instalare (`/`) sau folosești direct `/<limbă>/manifest.json`. Pentru traducerea automată a titlurilor și descrierilor, pornește-l cu `TRANSLATE_URL` spre serverul tău LibreTranslate (există ca aplicație YunoHost).
