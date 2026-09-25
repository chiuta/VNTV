# VNTV — guide for TROM / VideoNeat administrators

Four changes on TROM's side make VNTV faster, cheaper to run and truly multilingual. Each one is independent.

## 1. Install the “VideoNeat Index” plugin on videoneat.com (most important)

What it does: when an article is saved, it extracts the trailer, year, length and source once and publishes a
compact JSON catalog. Clients (VNTV, the Stremio addon) stop downloading full article pages.

1. Zip `wp-plugin/videoneat-index/` and upload it in **Plugins → Add New → Upload**, then **Activate**.
2. A full reindex starts in the background (WP-Cron, 40 articles per batch). Follow it in
   **Tools → VideoNeat Index**. With WP-CLI it's one command:
   ```bash
   wp videoneat-index rebuild      # ~1,350 articles; add --no-peertube to skip durations
   wp videoneat-index stats
   ```
3. Check: `https://www.videoneat.com/wp-json/videoneat/v1/index` returns JSON, and
   `https://www.videoneat.com/wp-content/uploads/videoneat-index.json` exists.
4. The **Tools → VideoNeat Index** page lists the newest articles without a PeerTube trailer, so they can be fixed.

Notes:
* The endpoints are public and read-only, with open CORS (the data is already public) and a 12-hour cache with ETag.
* The only outgoing requests go to `videos.trom.tf`, to read each trailer's duration and preview image.
* If a caching plugin or CDN is in front of WordPress, allow `/wp-json/videoneat/v1/*` to be cached for ~15 minutes.
* Uninstalling removes all its data (options, post meta, static file).

## 2. Automatic subtitles on videos.trom.tf (PeerTube ≥ 6.2)

VNTV shows PeerTube captions and translates them into the viewer's language. Most trailers have no captions yet;
PeerTube can generate them with Whisper.

1. **Administration → Configuration → VOD → Automatic transcription**: enable it (the `whisper-ctranslate2`
   engine is the usual choice). On a small server, use a remote **peertube-runner** instead of transcribing locally.
2. For existing videos: in **Overview → Videos**, select videos and choose **Generate captions**.
3. Check CORS on caption files (the browser must be allowed to read them):
   ```bash
   curl -sI https://videos.trom.tf/lazy-static/video-captions/<file>.vtt | grep -i access-control
   ```
   If the header is missing, add to the PeerTube nginx `location ~ ^/lazy-static/` block:
   `add_header Access-Control-Allow-Origin "*";`

## 3. P2P on videos.trom.tf

On computers and TVs VNTV plays through the PeerTube embed so viewers share the traffic. Make sure P2P stays enabled
for embeds (`production.yaml`):
```yaml
defaults:
  p2p:
    webapp:
      enabled: true
    embed:
      enabled: true
```
The WebSocket tracker (`wss://videos.trom.tf/tracker/socket`) must be reachable through the reverse proxy.

## 4. Optional: a LibreTranslate instance

A self-hosted LibreTranslate (there is a YunoHost app) gives every VNTV viewer and the Stremio addon private
translation of titles, descriptions and subtitles, without any commercial service. Share its URL (and an API key,
if you set one) with users, or configure it in the addon with `TRANSLATE_URL`.

## Weekly health check

`node tools/structure-check.mjs` exits with code 1 and a readable message if VideoNeat's markup, the catalog or the
PeerTube API changed in a way that breaks VNTV. Example cron (Mondays 07:15, mails the output on failure):
```cron
MAILTO=admin@example.org
15 7 * * 1  node /opt/vntv/tools/structure-check.mjs > /dev/null
```
