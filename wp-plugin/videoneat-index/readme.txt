=== VideoNeat Index ===
Contributors: alexio
Tags: json, catalog, peertube, rest-api, trade-free
Requires at least: 6.0
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.1.0
License: MIT

Publishes a compact JSON catalog of VideoNeat titles for VNTV, the Stremio addon and other trade-free clients.

== Description ==

Instead of every client downloading full article pages and guessing data from the Elementor markup, this plugin
extracts the data once, when an article is saved, and serves it as one small cacheable JSON file.

For each published post: id, title, link, date, categories, image, PeerTube trailer (host, id, duration, preview),
year, length, source, source link and excerpt. Full descriptions are available per item.

* `GET /wp-json/videoneat/v1/index` — the whole catalog (12 h cache, ETag, open CORS)
* `GET /wp-json/videoneat/v1/item/<id>` — one title with its full description
* `GET /wp-json/videoneat/v1/stats` — coverage: how many titles have a PeerTube trailer
* Static copy: `/wp-content/uploads/videoneat-index.json`

Tools → VideoNeat Index shows coverage, lists the newest posts without a PeerTube trailer and rebuilds the index
in the background. WP-CLI: `wp videoneat-index rebuild` and `wp videoneat-index stats`.

No tracking, no third-party services. The only outgoing requests go to the configured PeerTube instance
(default videos.trom.tf) to read each trailer's duration and preview image.

== Installation ==

1. Upload the `videoneat-index` folder to `/wp-content/plugins/` (or upload the zip in Plugins → Add New).
2. Activate it. A full reindex starts automatically in the background (WP-Cron).
3. Check Tools → VideoNeat Index. With a real cron job the rebuild is faster:
   `*/5 * * * * wp --path=/var/www/videoneat cron event run --due-now`

== Changelog ==

= 1.1.0 =
* Admin page in English, translatable (Romanian included).
* Background reindex in small batches with a 20-second time budget, so it never hits PHP's time limit.
* Shorter PeerTube request timeout.

= 1.0.0 =
* First release.
