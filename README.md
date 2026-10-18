# VNTV — VideoNeat Television

**Version:** 2.2.0 · **Last updated:** 18 October 2026

**Live / demo:** https://chiuta.github.io/VNTV/

![VNTV — captură de ecran / screenshot](screenshot.png)


A non-stop, trade-free science TV channel built from the [VideoNeat.com](https://www.videoneat.com) collection:
synchronized channels, a TV guide, a browsable catalog, translated subtitles, 7 languages, and it works on phones,
tablets, computers and TVs. No accounts, no analytics, no cookies; by default the app talks only to TROM's own sites (videoneat.com and videos.trom.tf), see *Privacy and trade-free* below.

*Română: rezumatul în limba română e la sfârșitul fișierului.*

## What's in this repository

| Folder | What it is |
|---|---|
| `index.html`, `dist/vntv.html` | **The app as one file.** Open it in a browser. Works from a phone's Downloads folder too. |
| `deploy/site/` | The app for hosting on HTTPS: installable (home screen / app), works offline, icons, service worker. |
| `wp-plugin/videoneat-index/` | **WordPress plugin for videoneat.com**: publishes the official JSON catalog VNTV and the addon use. |
| `stremio-addon/` | Stremio addon (7 languages, official catalog, extra PeerTube channels, optional LibreTranslate). |
| `src/`, `i18n/` | Sources. `node build.mjs` produces both app variants. |
| `tools/` | `coverage.mjs` (how many titles are playable), `structure-check.mjs` (weekly check), `make-icons.py`. |
| `tests/` | Automated tests (Playwright, offline mocks). `npm test`. |
| `docs/` | Architecture, deployment, TROM admin guide, proposal letter to TROM, real-device checklist, Android TV. |

## How VNTV gets its data

1. **Official catalog (preferred):** `https://www.videoneat.com/wp-json/videoneat/v1/index`, published by the
   `videoneat-index` plugin. One small cached file: fast, no fragile parsing, and it carries trailer durations,
   which the **synchronized broadcast** needs.
2. **Fallback:** the public WordPress API, reading each article. Slower; the app honestly shows **NON-STOP**
   instead of **ON AIR** because everyone gets their own playlist.
3. **Extra sources:** any PeerTube channel with openly licensed videos can be added as a channel (Layers → Sources).

## Playback

* **P2P** (default on computers and TVs): the official PeerTube player, which shares the load between viewers and
  lowers TROM's server costs. VNTV controls it through the PeerTube embed API.
* **Direct** (default on iOS and on phones using mobile data): the MP4 file in a `<video>` element — needed for
  picture-in-picture, AirPlay and Chromecast, and lighter on mobile data.
* Before P2P is used the first time, VNTV explains that P2P makes the viewer's IP visible to other viewers and offers
  direct playback instead. If the PeerTube player doesn't respond within 10 s, VNTV switches to direct playback.

## Channels

1–14 VideoNeat categories (trailers) · 15 Favorites · **16 TROM** (TROM's own full documentaries from videos.trom.tf)
· 17+ any PeerTube channel the viewer adds. Channel 16 can be removed in Settings → Sources.

## Privacy and trade-free

* Hosts contacted by default: `www.videoneat.com` (catalog, images) and `videos.trom.tf` (video data, files, P2P player, subtitles). Other hosts only when the viewer adds a PeerTube channel, enters a LibreTranslate address, or explicitly selects MyMemory. In P2P mode the PeerTube player also connects to other viewers (WebRTC). When the app is served from a host such as GitHub Pages, that host sees the visit as with any web page.
* Fonts are embedded (Oswald, SIL OFL). No Google Fonts, no analytics, no cookies.
* Translation of content: the browser's on-device translator, or your own **LibreTranslate**. The commercial
  MyMemory service is used **only if the viewer explicitly selects it**, with a warning.
* Favorites, settings and translations stay in the viewer's browser.

See also: [README.ro.md](README.ro.md) (Română, with a user manual and the exact list of network hosts).

## Changelog (2.2.0)

* 2.2.0 — 2026-10-18: new **Screen** panel — Cast / AirPlay, picture-in-picture, separate window (second monitor) and a kiosk link + QR code for a TV or any other screen.

* 2.1.4 — 2026-10-12: the version and the last-updated date are now shown in the app (Layers panel).
* Start screen: the "can't load the list" message is now shown inline under the intro text instead of a toast that overlapped the VNTV logo at 360 px; while the browser reports it is offline, the catalogue request is no longer attempted at start-up (it retries by itself on the `online` event).

* CSP: the inline script is now allowed by SHA-256 hash (computed by `build.mjs` on every build); `script-src` no longer contains `'unsafe-inline'`.
* The start screen shows a notice (7 languages) when the browser reports it is offline, since VNTV has no offline content.
* The bundled test suite (Playwright, mocked network) now runs in this environment: 25/25 passed on the final run (a first run had one failure in the timing-sensitive two-viewer sync test, which passed on re-run).
* The PeerTube iframe's `allow` attribute is set only when the iframe is used (removes three console warnings at start-up).

* The app is now wrapped in a `<main>` landmark and the lower-third title is no longer an empty heading (axe-core: 0 violations at 1280 and 360 px).
* The "can't load the list" message now says plainly that VNTV has no offline content and needs an internet connection (7 languages).
* Version bumped to 2.1.1 (package.json, lockfile, generated service worker).

## Licence

MIT, see [LICENSE](LICENSE). Embedded font: Oswald, SIL OFL 1.1 ([NOTICE.md](NOTICE.md)).

## Build and test

```bash
node build.mjs                 # index.html + dist/vntv.html + deploy/site/index.html + sw.js
npm install                    # ESLint + Playwright (dev only)
npx playwright install chromium
npm run test:all               # lint + 25 end-to-end + 30 PHP + 33 addon tests, all offline
```

## Kiosk / public screens

`vntv.html?kiosk=1&ch=3&lang=en&preset=cinema&muted=0&reload=24` — starts by itself, no controls, no cursor,
reloads daily. Press **K** three times to exit.

---

## Pe scurt, în română

* `dist/vntv.html` — aplicația într-un singur fișier; se deschide direct.
* `deploy/site/` — varianta de găzduit pe HTTPS: se instalează ca aplicație și merge offline.
* `wp-plugin/videoneat-index/` — pluginul WordPress pentru videoneat.com care publică lista JSON oficială.
  Fără el, VNTV citește articolele (mai lent) și afișează sincer „NON-STOP” în loc de „ÎN EMISIE”.
* `stremio-addon/` — addonul Stremio, acum cu lista oficială și canale PeerTube suplimentare.
* Ghidurile sunt în `docs/`: găzduire (YunoHost), ghid pentru administratorii TROM, testare pe dispozitive reale, Android TV.

---
See [CHANGELOG.md](CHANGELOG.md).
