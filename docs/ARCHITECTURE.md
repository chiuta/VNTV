# VNTV architecture — for whoever maintains this next

VNTV is a plain-JavaScript app with no framework and no runtime dependencies. The sources are split into
modules under `src/js/`. `build.mjs` concatenates them in file-name order into **one** `<script>`, so every
top-level `const`/`function` is shared by all modules. ESLint runs on the concatenated bundle (`npm run lint`),
which catches references between modules that don't exist.

```
src/index.template.html   page skeleton with placeholders
src/styles.css            all CSS (dark only; tokens on :root)
src/body.html             all markup; texts come from i18n via data-i / data-it / data-ia / data-ip attributes
src/fonts/                Oswald 700 (OFL), embedded as base64 by the build
src/sw.template.js        service worker for the hosted build
i18n/<lang>.json          one dictionary per language; the build fails if a key is missing in any language
src/js/
  00-core.js      constants, storage (localStorage with in-memory fallback), preferences P, overlays O,
                  URL parameters, t() translation, utilities, deterministic RNG, platform detection
  10-icons.js     inline SVG icons
  20-translate.js content translation: browser Translator API → LibreTranslate → (MyMemory only if chosen)
  30-data.js      the item model, the official catalog (plugin), the WordPress fallback + Elementor parsing,
                  PeerTube API (videos, channels, captions), VTT parsing, favorites
  40-schedule.js  S (state), channels, the synchronized schedule (cycles), tune(), the WordPress pager,
                  switchChannel(), live offsets
  50-player.js    two engines: "direct" (<video>) and "p2p" (PeerTube embed + embed API over postMessage);
                  play(), next(), prev(), automatic fallback from P2P to direct
  55-subs.js      captions: fetch, parse, translate, render as an overlay (works in both engines)
  60-ui.js        overlays (lower third, up next, ticker, OSD, live label), transitions, clock, Media Session
  70-panels.js    guide, settings (simple/advanced), details, browse, language
  80-input.js     buttons, touch gestures, keyboard and TV remote, fullscreen, PiP, cast
  90-app.js       start-up, kiosk mode, wake lock, P2P notice, service worker registration, app icon
```

## Data model
Every playable thing is an item:
`{key, src:"vn"|"pt", id, title, ex, desc, link, cats[], catLabel, img, year, len, source, sourceUrl, v:{host,id}, dur, preview, kind:"trailer"|"full", licence}`.
`key` is stable (`vn:<post id>` or `pt:<host>:<uuid>`) and is used for favorites, the schedule and translations' context.

## Synchronized broadcast
`buildSchedule()` sorts the channel's items by key, then shuffles them with a seed of `channel + cycle number`.
A cycle is one pass through all items (trailer duration + 2 s gap each), counted from `EPOCH` (2026-01-01 UTC).
Every viewer with the same catalog computes the same schedule; the order changes only at a cycle boundary,
between two clips. When the catalog changes (a title is added), the schedule changes for everyone at once.
If `P.sync` is off, or the catalog comes from the WordPress fallback (no durations), playback is local and the
label says NON-STOP.

## P2P engine
The PeerTube embed is loaded with `api=1`. VNTV speaks the embed API's jschannel protocol directly
(`peertube::__ready` ping/pong, `peertube::play|pause|seek|setVolume`, notifications
`peertube::playbackStatusUpdate`). This was written from the protocol's documentation, not tested against a live
PeerTube: if the handshake doesn't complete within 10 s, VNTV switches to direct playback for the session
(`S.p2pBroken`). A fallback timer based on the known duration always advances to the next clip.

## Things that are easy to break
* The order of files in `src/js/` matters only for code that runs at load time (top-level statements).
* `renderLayers()` builds different markup in simple and advanced mode; `bindLayers()` must tolerate missing elements.
* The service worker caches the app shell; bump `package.json` version on every release so clients update.
* Tests mock every network host (`tests/mock.mjs`). The mock embed implements the same protocol understanding as
  the app, so a passing P2P test proves consistency, not compatibility with real PeerTube. Test P2P by hand.

## Release checklist
`npm run test:all` → bump version in `package.json` (and `stremio-addon/package.json`, plugin header if changed) →
`CHANGELOG.md` → `git tag vX.Y.Z` → copy `deploy/site/` to the server.
