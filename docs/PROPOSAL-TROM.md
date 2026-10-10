# Proposal to TROM: VNTV and the VideoNeat Index plugin

*Draft for Alexio to adapt and send to Tio / the TROM team. Figures in brackets must be filled in after running
`npm run coverage` on the live site.*

---

Hi Tio,

I built **VNTV**, a non-stop "science TV channel" made from VideoNeat's trailers: channels by category, a TV guide,
subtitles, 7 languages, phones, tablets, computers and TVs, plus a Stremio addon. No accounts, no tracking, and no
requests to anyone but TROM's own hosts by default. It is trade-free in the same spirit as VideoNeat, and it's open source (MIT).

I'd like to ask for three things, each independent:

1. **Install a small WordPress plugin on videoneat.com ("VideoNeat Index").** It extracts each post's trailer, year,
   length and source once, when the post is saved, and publishes a compact JSON catalog at
   `/wp-json/videoneat/v1/index`. Today clients have to download full article pages and guess data from the
   Elementor markup. With the plugin: a much lighter load on the site, exact data, and the synchronized broadcast
   (everyone on a channel sees the same clip at the same time) becomes possible. Coverage today:
   [N] of [TOTAL] posts have a PeerTube trailer ([P]%). The plugin's admin page lists the newest posts without one.
   It adds no tracking and makes no outside requests except to videos.trom.tf for trailer durations.

2. **Turn on automatic captions on videos.trom.tf** (PeerTube ≥ 6.2, Whisper). VNTV already shows PeerTube captions
   and translates them into 7 languages; most trailers have none yet.

3. **Your blessing for the name "VNTV" and the use of the VideoNeat name/logo**, and for a default "TROM" channel
   that plays TROM's own documentaries from videos.trom.tf (already included, and removable by the viewer).

What VNTV does to keep costs down: on computers and TVs it plays through the PeerTube player with P2P, so viewers
share the traffic (with a clear notice about IP visibility and an option to opt out). It never shows or links
magnet files.

Technical details for your admin: `docs/TROM-ADMIN.md` in the repository. Everything is tested with automated
tests; I'd be glad to do a live test together before anything is announced.

Thank you,
Alexio
