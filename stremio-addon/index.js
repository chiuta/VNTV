#!/usr/bin/env node
/*
 * VideoNeat — Stremio addon (no dependencies, Node 18+) · 7 languages
 * Catalogs: documentaries, films and courses from www.videoneat.com (public WordPress API)
 * Streams:  the official trailer hosted on PeerTube videos.trom.tf (HLS + MP4),
 *           plus external links to the VideoNeat page and the official source (PBS, BBC…).
 *
 * Start:    node index.js              (default port 7000, or PORT=xxxx)
 * Install:  http://<host>:7000/                      → pick a language
 *           http://<host>:7000/<lang>/manifest.json  (en, ro, fr, es, de, it, pt)
 *
 * Optional automatic translation of titles & descriptions (self-hosted LibreTranslate):
 *           TRANSLATE_URL=https://translate.example.org  TRANSLATE_KEY=…  node index.js
 * Official VideoNeat catalog (plugin "VideoNeat Index"), used automatically when published:
 *           INDEX_URL=https://www.videoneat.com/wp-json/videoneat/v1/index   (default)
 * Extra PeerTube channels with full, openly licensed videos (comma-separated):
 *           PEERTUBE_CHANNELS=https://instance.org/c/channel,https://other.org/a/account
 * Hardening: RATE_LIMIT=120 (requests per minute per IP, 0 = off) · CACHE_FILE=/data/translations.json
 * Health check: GET /health
 */
"use strict";
const http = require("http");
const fs = require("fs");
const I18N = require("./i18n.json");

const PORT = +process.env.PORT || 7000;
const WP = "https://www.videoneat.com/wp-json/wp/v2";
const TR_URL = (process.env.TRANSLATE_URL || "").replace(/\/+$/, "");
const TR_KEY = process.env.TRANSLATE_KEY || "";
const PAGE = 100;
const TTL_LIST = 30 * 60e3, TTL_ITEM = 6 * 3600e3, TTL_TR = 30 * 24 * 3600e3;
const PREFIX = "vneat:";
const PT_PREFIX = "vnpt:";
const INDEX_URLS = [process.env.INDEX_URL, "https://www.videoneat.com/wp-json/videoneat/v1/index",
  "https://www.videoneat.com/wp-content/uploads/videoneat-index.json"].filter(Boolean);
const TTL_INDEX = 15 * 60e3;
function parseSource(url) {
  try {
    const u = new URL(url.trim());
    const m = u.pathname.match(/^\/(c|video-channels|a|accounts)\/([^/]+)/);
    if (u.protocol !== "https:" || !m) return null;
    return { host: u.host, kind: /^(c|video-channels)$/.test(m[1]) ? "video-channels" : "accounts", handle: decodeURIComponent(m[2]) };
  } catch { return null; }
}
const PT_SOURCES = (process.env.PEERTUBE_CHANNELS || "").split(",").map(parseSource).filter(Boolean)
  .map((s, i) => ({ ...s, id: "peertube-" + (i + 1), name: s.handle }));
const LANGS = Object.keys(I18N);
const DEF = "en";

// [catalog id, WordPress category, index in the channel list of the dictionary]
const CATEGORIES = [
  ["all", 0, 0], ["docs", 2, 1], ["astro", 7, 2], ["nature", 26, 3], ["bio", 21, 4], ["society", 3, 5], ["tech", 15, 6],
  ["health", 126, 7], ["archaeo", 128, 8], ["mathphys", 34, 9], ["chem", 31, 10], ["geo", 42, 11], ["movies", 129, 12], ["courses", 156, 13],
].map(([id, wp, ch]) => ({ id, wp, ch }));

const T = (lang, k, v) => { let x = (I18N[lang] || I18N[DEF])[k] ?? I18N[DEF][k] ?? k; if (v) for (const n in v) x = String(x).replace("{" + n + "}", v[n]); return x; };

function manifest(lang) {
  const catName = c => "VideoNeat — " + (c.wp ? I18N[lang].ch[c.ch][0] : T(lang, "latest"));
  return {
    id: "tf.trom.videoneat",
    version: "1.3.0",
    name: "VideoNeat",
    description: T(lang, "desc") + (TR_URL && lang !== "en" ? " " + T(lang, "trNote") + "." : ""),
    logo: "https://www.videoneat.com/wp-content/uploads/cropped-videoneat-icon-favicon-2-270x270.png",
    background: "https://www.videoneat.com/wp-content/uploads/videoneat-main-1.png",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    idPrefixes: [PREFIX, PT_PREFIX],
    catalogs: [
      ...CATEGORIES.map(c => ({
        type: "movie", id: "videoneat-" + c.id, name: catName(c),
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
      })),
      ...PT_SOURCES.map(s => ({
        type: "movie", id: s.id, name: "PeerTube — " + s.name,
        extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }],
      })),
    ],
    behaviorHints: { configurable: true, configurationRequired: false },
  };
}

/* ---------------- utilities ---------------- */
const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  const val = await fn();
  cache.set(key, { val, exp: Date.now() + ttl });
  if (cache.size > 20000) cache.delete(cache.keys().next().value);
  return val;
}
async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "stremio-videoneat/1.2" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
function text(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function httpUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } }
function fmtLen(lang, s) {
  if (!s) return s; const w = I18N[lang].lw || {};
  return s.replace(/\b(parts?|episodes?|minutes?|hours?|seasons?|lectures?|lessons?|and)\b/gi, m => w[m.toLowerCase()] ?? m);
}

/* optional machine translation through a self-hosted LibreTranslate
   - at most 4 requests to LibreTranslate at the same time (all clients together)
   - translations can persist across restarts in CACHE_FILE */
const CACHE_FILE = process.env.CACHE_FILE || "";
const TRDISK = new Map();
if (CACHE_FILE) { try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")))) TRDISK.set(k, v); } catch { /* first run */ } }
let trDirty = false;
if (CACHE_FILE) setInterval(() => { if (!trDirty) return; trDirty = false;
  const obj = Object.fromEntries([...TRDISK].slice(-50000));
  fs.writeFile(CACHE_FILE + ".tmp", JSON.stringify(obj), e => { if (!e) fs.rename(CACHE_FILE + ".tmp", CACHE_FILE, () => {}); });
}, 60e3).unref();
let trActive = 0; const trWait = [];
const trSlot = () => new Promise(res => { if (trActive < 4) { trActive++; res(); } else trWait.push(res); });
const trFree = () => { const n = trWait.shift(); if (n) n(); else trActive--; };
async function translate(lang, s) {
  if (!s || lang === "en" || !TR_URL) return s;
  const key = `${lang}|${s}`;
  if (TRDISK.has(key)) return TRDISK.get(key);
  try {
    return await cached(`tr|${key}`, TTL_TR, async () => {
      await trSlot();
      try {
      const r = await fetch(TR_URL + "/translate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: s, source: "en", target: lang, format: "text", ...(TR_KEY ? { api_key: TR_KEY } : {}) }),
        signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      if (!j.translatedText) throw new Error("empty");
      TRDISK.set(key, j.translatedText); trDirty = true;
      return j.translatedText;
      } finally { trFree(); }
    });
  } catch (e) { return s; }
}
async function translateMany(lang, list) {
  if (lang === "en" || !TR_URL) return list;
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (i < list.length) { const k = i++; out[k] = await translate(lang, list[k]); } }));
  return out;
}

function image(p, big) {
  const m = p?._embedded?.["wp:featuredmedia"]?.[0];
  if (!m || m.code) return undefined;
  const s = m.media_details?.sizes || {};
  const pick = big ? (s.full || s["1536x1536"] || s.large) : (s.medium_large || s.large || s.medium);
  return (pick && pick.source_url) || m.source_url || undefined;
}

/* Extracts the metadata from the article's Elementor content */
function parseContent(html) {
  html = String(html || "");
  const out = { trailer: null, year: null, length: null, minutes: null, sourceUrl: null, sourceName: null, desc: "" };
  const tr = html.match(/videos\.trom\.tf\/videos\/embed\/([A-Za-z0-9-]+)/);
  if (tr) out.trailer = tr[1];
  const blocks = [...html.matchAll(/elementor-widget-text-editor[\s\S]*?elementor-widget-container">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  const infoIdx = blocks.findIndex(b => /YEAR:/i.test(b));
  if (infoIdx >= 0) {
    const info = blocks[infoIdx], t = text(info);
    out.year = (t.match(/YEAR:\s*(\d{4})/i) || [])[1] || null;
    out.length = ((t.match(/LENGTH:\s*([^|]+)/i) || [])[1] || "").trim() || null;
    const mins = [...(out.length || "").matchAll(/(\d+)\s*min/gi)].map(m => +m[1]);
    if (mins.length) out.minutes = mins.reduce((a, b) => a + b, 0);
    const a = info.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (a) { out.sourceUrl = httpUrl(text(a[1])); out.sourceName = text(a[2]) || null; }
  }
  out.desc = blocks.filter((_, i) => i !== infoIdx).map(text).filter(Boolean).join("\n\n");
  return out;
}

function genres(lang, cats) {
  const C = I18N[lang].cats;
  return [...new Set((cats || []).filter(c => c !== 2).map(c => C[c]).filter(Boolean))];
}

/* ---------------- official catalog (plugin "VideoNeat Index") ---------------- */
async function getIndex() {
  return cached("index", TTL_INDEX, async () => {
    for (const u of INDEX_URLS) {
      try {
        const j = await getJSON(u);
        if (Array.isArray(j.items)) return { url: u, items: j.items, byId: new Map(j.items.map(x => [x.id, x])) };
      } catch (e) { /* try the next address */ }
    }
    return null;
  }).catch(() => null);
}
async function indexDesc(idx, id) {
  if (!/\/index(\?.*)?$/.test(idx.url)) return null;
  const u = idx.url.replace(/\/index(\?.*)?$/, "") + "/item/" + id;
  try { return (await cached(u, TTL_ITEM, () => getJSON(u))).desc || null; } catch { return null; }
}
const minutesOf = len => { const m = [...String(len || "").matchAll(/(\d+)\s*min/gi)].map(x => +x[1]); return m.length ? m.reduce((a, b) => a + b, 0) : null; };

/* ---------------- PeerTube channels ---------------- */
async function ptList(src) {
  return cached("ptlist|" + src.host + src.kind + src.handle, TTL_LIST, async () => {
    const out = [];
    for (let start = 0; start < 500; start += 100) {
      const j = await getJSON(`https://${src.host}/api/v1/${src.kind}/${encodeURIComponent(src.handle)}/videos?count=100&start=${start}&sort=-publishedAt`);
      out.push(...(j.data || []).filter(v => !v.isLive && v.duration > 0));
      if (!j.data || j.data.length < 100 || start + 100 >= (j.total || 0)) break;
    }
    return out;
  });
}
const ptId = (host, uuid) => PT_PREFIX + host + ":" + uuid;
function ptSplit(id) { const [host, uuid] = id.slice(PT_PREFIX.length).split(":"); return { host, uuid }; }
async function loadPtNames() {
  for (const s of PT_SOURCES) {
    try { const j = await getJSON(`https://${s.host}/api/v1/${s.kind}/${encodeURIComponent(s.handle)}`); s.name = j.displayName || s.handle; } catch { /* keep the handle */ }
  }
}

function filterSearch(list, q, pick) {
  if (!q) return list;
  const n = x => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const qq = n(q);
  return list.filter(x => n(pick(x)).includes(qq));
}

/* ---------------- handlers ---------------- */
async function catalog(lang, id, extra) {
  const skip = Math.max(0, parseInt(extra.skip || "0", 10) || 0);
  const q = (extra.search || "").trim();
  const src = PT_SOURCES.find(s => s.id === id);
  if (src) {
    const list = filterSearch(await ptList(src), q, v => v.name + " " + (v.truncatedDescription || "")).slice(skip, skip + PAGE);
    const names = await translateMany(lang, list.map(v => v.name));
    return {
      metas: list.map((v, i) => ({
        id: ptId(src.host, v.uuid), type: "movie", name: names[i], posterShape: "landscape",
        poster: v.previewPath ? `https://${src.host}${v.previewPath}` : undefined,
        description: (v.truncatedDescription || "").slice(0, 300), releaseInfo: (v.originallyPublishedAt || v.publishedAt || "").slice(0, 4),
      })),
      cacheMaxAge: 1800,
    };
  }
  const cat = CATEGORIES.find(c => "videoneat-" + c.id === id);
  if (!cat) return { metas: [] };
  const idx = await getIndex();
  if (idx) {
    let list = idx.items.filter(x => x.trailer && (!cat.wp || (x.cats || []).includes(cat.wp)));
    list = filterSearch(list, q, x => x.title + " " + (x.excerpt || "")).slice(skip, skip + PAGE);
    const names = await translateMany(lang, list.map(x => x.title));
    const descs = await translateMany(lang, list.map(x => x.excerpt || ""));
    return {
      metas: list.map((x, i) => ({
        id: PREFIX + x.id, type: "movie", name: names[i], poster: x.img || x.trailer?.preview || undefined, posterShape: "landscape",
        description: descs[i], genres: genres(lang, x.cats), releaseInfo: x.year || (x.date || "").slice(0, 4),
      })),
      cacheMaxAge: 1800,
    };
  }
  let url = `${WP}/posts?per_page=${PAGE}&offset=${skip}&_embed=wp:featuredmedia` +
    `&_fields=id,title,excerpt,categories,_links,_embedded`;
  if (cat.wp) url += `&categories=${cat.wp}`;
  if (q) url += `&search=${encodeURIComponent(q)}`;
  const data = await cached(url, TTL_LIST, () => getJSON(url).catch(e => { if (/HTTP 400/.test(e.message)) return []; throw e; }));
  const names = await translateMany(lang, data.map(p => text(p.title?.rendered)));
  const descs = await translateMany(lang, data.map(p => text(p.excerpt?.rendered)));
  return {
    metas: data.map((p, i) => ({
      id: PREFIX + p.id, type: "movie", name: names[i], poster: image(p, false), posterShape: "landscape",
      description: descs[i], genres: genres(lang, p.categories),
    })),
    cacheMaxAge: 1800,
  };
}

async function post(id) {
  const url = `${WP}/posts/${id}?_embed=wp:featuredmedia&_fields=id,title,link,content,excerpt,categories,date,_links,_embedded`;
  return cached(url, TTL_ITEM, () => getJSON(url));
}

/* one normalized record for a VideoNeat title, from the official catalog or (fallback) from the article */
async function vnRecord(wpId) {
  const idx = await getIndex();
  const x = idx && idx.byId.get(wpId);
  if (x) {
    return {
      name: x.title, desc: (await indexDesc(idx, wpId)) || x.excerpt || "", link: httpUrl(x.link), cats: x.cats || [],
      poster: x.img || x.trailer?.preview, background: x.trailer?.preview || x.img, year: x.year || (x.date || "").slice(0, 4),
      length: x.length, minutes: minutesOf(x.length), source: x.source, sourceUrl: httpUrl(x.source_url),
      trailer: x.trailer ? { host: x.trailer.host || "videos.trom.tf", id: x.trailer.id } : null,
    };
  }
  const p = await post(wpId);
  const info = parseContent(p.content?.rendered);
  return {
    name: text(p.title?.rendered), desc: info.desc || text(p.excerpt?.rendered), link: httpUrl(p.link), cats: p.categories || [],
    poster: image(p, false), background: image(p, true), year: info.year || (p.date || "").slice(0, 4),
    length: info.length, minutes: info.minutes, source: info.sourceName, sourceUrl: info.sourceUrl,
    trailer: info.trailer ? { host: "videos.trom.tf", id: info.trailer } : null,
  };
}

async function meta(lang, id) {
  const auto = TR_URL && lang !== "en" ? `\n\n(${T(lang, "trNote")})` : "";
  if (id.startsWith(PT_PREFIX)) {
    const { host, uuid } = ptSplit(id);
    const v = await peertube(host, uuid);
    const [name, desc] = await translateMany(lang, [v.name || "", v.description || ""]);
    const lic = v.licence?.id ? `${T(lang, "lic")}: ${v.licence.label}` : "";
    return {
      meta: {
        id, type: "movie", name, posterShape: "landscape",
        poster: v.previewPath ? `https://${host}${v.previewPath}` : undefined, background: v.previewPath ? `https://${host}${v.previewPath}` : undefined,
        description: [desc, lic, v.channel?.displayName ? `${T(lang, "src")}: ${v.channel.displayName}` : ""].filter(Boolean).join("\n\n") + auto,
        releaseInfo: (v.originallyPublishedAt || v.publishedAt || "").slice(0, 4),
        runtime: v.duration ? `${Math.round(v.duration / 60)} min` : undefined,
        genres: v.category?.label ? [v.category.label] : [],
        website: httpUrl(v.url) || undefined,
        links: httpUrl(v.url) ? [{ name: "PeerTube", category: T(lang, "page"), url: v.url }] : [],
      },
      cacheMaxAge: 21600,
    };
  }
  const wpId = parseInt(id.slice(PREFIX.length), 10);
  if (!wpId) return { meta: null };
  const r = await vnRecord(wpId);
  const [name, desc] = await translateMany(lang, [r.name, r.desc]);
  const links = [];
  if (r.link) links.push({ name: "VideoNeat", category: T(lang, "page"), url: r.link });
  if (r.sourceUrl) links.push({ name: r.source || T(lang, "offN"), category: T(lang, "srcCat"), url: r.sourceUrl });
  return {
    meta: {
      id, type: "movie", name,
      poster: r.poster, posterShape: "landscape", background: r.background,
      description: [desc, r.length ? `${T(lang, "len")}: ${fmtLen(lang, r.length)}` : "",
        r.source ? `${T(lang, "src")}: ${r.source}` : ""].filter(Boolean).join("\n\n") + auto,
      releaseInfo: r.year,
      year: r.year ? +r.year : undefined,
      runtime: r.minutes ? `${r.minutes} min` : undefined,
      genres: genres(lang, r.cats),
      website: r.link || undefined,
      links,
    },
    cacheMaxAge: 21600,
  };
}

async function peertube(host, id) {
  const url = `https://${host}/api/v1/videos/${encodeURIComponent(id)}`;
  return cached(url, TTL_ITEM, () => getJSON(url));
}
function videoStreams(lang, v, host, full) {
  const out = [];
  const hls = (v.streamingPlaylists || [])[0];
  const mins = Math.round((v.duration || 0) / 60) || "<1";
  const label = full ? "PeerTube\nVideo" : "VideoNeat\nTrailer";
  if (hls?.playlistUrl) out.push({
    name: label, title: `${T(lang, full ? "fullHls" : "hls")}\n${host} · ${mins} min`,
    url: hls.playlistUrl, behaviorHints: { bingeGroup: (full ? "pt-full" : "videoneat-trailer") },
  });
  const files = [...(hls?.files || []), ...(v.files || [])]
    .filter(f => f.fileUrl && f.hasVideo !== false)
    .sort((a, b) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
  for (const f of files) out.push({
    name: `${full ? "PeerTube" : "VideoNeat"}\n${f.resolution?.label || "MP4"}`,
    title: `${T(lang, full ? "fullMp4" : "mp4", { r: f.resolution?.label || "" }).replace("  ", " ")}\n${f.size ? (f.size / 1048576).toFixed(0) + " MB · " : ""}${host}`,
    url: f.fileUrl, behaviorHints: { bingeGroup: (full ? "pt-full-" : "videoneat-trailer-") + (f.resolution?.id || 0) },
  });
  return out;
}

async function stream(lang, id) {
  if (id.startsWith(PT_PREFIX)) {
    const { host, uuid } = ptSplit(id);
    const v = await peertube(host, uuid);
    const streams = videoStreams(lang, v, host, true);
    if (httpUrl(v.url)) streams.push({ name: "PeerTube", title: T(lang, "openPT"), externalUrl: v.url });
    return { streams, cacheMaxAge: 21600 };
  }
  const wpId = parseInt(id.slice(PREFIX.length), 10);
  if (!wpId) return { streams: [] };
  const r = await vnRecord(wpId);
  const streams = [];
  if (r.trailer) {
    try { streams.push(...videoStreams(lang, await peertube(r.trailer.host, r.trailer.id), r.trailer.host, false)); }
    catch (e) { streams.push({ name: "VideoNeat\nTrailer", title: T(lang, "web"), externalUrl: `https://${r.trailer.host}/w/${r.trailer.id}` }); }
  }
  if (r.link) streams.push({ name: "VideoNeat", title: T(lang, "open"), externalUrl: r.link });
  if (r.sourceUrl) streams.push({ name: r.source || T(lang, "src"), title: T(lang, "off", { s: r.source || r.sourceUrl }), externalUrl: r.sourceUrl });
  return { streams, cacheMaxAge: 21600 };
}

/* ---------------- HTTP server ---------------- */
const escH = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function landing(host, lang) {
  const m = `${host}/${lang}/manifest.json`;
  const deep = m.replace(/^https?:\/\//, "stremio://");
  const mf = manifest(lang);
  const langs = LANGS.map(l => `<a class="l${l === lang ? " on" : ""}" href="/${l}/configure" lang="${l}">${escH(I18N[l].n)}</a>`).join("");
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VideoNeat · Stremio</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0f12;color:#e8ecf1;font:16px/1.5 system-ui,sans-serif}
.c{max-width:600px;padding:32px 20px;text-align:center}img{width:88px;border-radius:18px}h1{margin:12px 0 4px}
p{color:#8f9aa8}a.b{display:inline-block;margin:8px 4px;padding:12px 22px;border-radius:999px;background:#4fd1a5;color:#04130d;font-weight:700;text-decoration:none}
a.b.s{background:#161a20;color:#e8ecf1;border:1px solid #2a313b}
.ls{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:14px 0 18px}
.ls small{width:100%;color:#8f9aa8;text-transform:uppercase;letter-spacing:.14em;font-size:11px}
a.l{padding:6px 12px;border-radius:999px;border:1px solid #2a313b;color:#dfe5ec;text-decoration:none;font-size:14px}
a.l.on{background:#fff;color:#000;font-weight:700}
code{display:block;margin-top:18px;padding:10px;background:#161a20;border:1px solid #2a313b;border-radius:8px;word-break:break-all;color:#e8ecf1}
</style></head><body><div class="c"><img src="${mf.logo}" alt=""><h1>VideoNeat</h1>
<p>${escH(mf.description)}</p>
<div class="ls"><small>${escH(T(lang, "pick"))}</small>${langs}</div>
<a class="b" href="${deep}">${escH(T(lang, "install"))}</a>
<a class="b s" href="https://web.stremio.com/#/addons?addon=${encodeURIComponent(m)}">Stremio Web</a>
<code>${escH(m)}</code><p>${escH(T(lang, "hint"))}</p></div></body></html>`;
}

function send(res, code, body, type = "application/json; charset=utf-8", maxAge = 0) {
  res.writeHead(code, {
    "Content-Type": type, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*",
    "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-cache",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function parseExtra(s) {
  const out = {};
  if (!s) return out;
  for (const part of s.split("&")) {
    const [k, v = ""] = part.split("=");
    try { out[decodeURIComponent(k)] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}
function bestLang(req) {
  const al = String(req.headers["accept-language"] || "").toLowerCase();
  for (const part of al.split(",")) { const l = part.trim().slice(0, 2); if (LANGS.includes(l)) return l; }
  return DEF;
}

/* simple per-IP rate limit (token bucket) */
const RATE = process.env.RATE_LIMIT === undefined ? 120 : +process.env.RATE_LIMIT;
const buckets = new Map();
function allowed(req) {
  if (!RATE) return true;
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const now = Date.now(), b = buckets.get(ip) || { t: RATE, at: now };
  b.t = Math.min(RATE, b.t + (now - b.at) / 60000 * RATE); b.at = now;
  if (b.t < 1) { buckets.set(ip, b); return false; }
  b.t -= 1; buckets.set(ip, b);
  if (buckets.size > 50000) buckets.clear();
  return true;
}
const STARTED = Date.now();

async function route(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.url === "/health") {
    const idx = await getIndex();
    return send(res, 200, { ok: true, version: manifest(DEF).version, catalog: idx ? "index" : "wordpress", titles: idx ? idx.items.length : null,
      peertube: PT_SOURCES.map(x => x.name), translate: !!TR_URL, uptime: Math.round((Date.now() - STARTED) / 1000) });
  }
  if (!allowed(req)) { res.setHeader("Retry-After", "30"); return send(res, 429, { err: "too many requests" }); }
  const u = new URL(req.url, "http://x");
  let path = u.pathname.replace(/\/+$/, "") || "/";
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;

  // optional language prefix: /ro/manifest.json, /ro/catalog/…
  let lang = DEF, prefixed = false;
  const lm = path.match(/^\/([a-z]{2})(\/.*|$)/);
  if (lm && LANGS.includes(lm[1])) { lang = lm[1]; path = lm[2] || "/"; prefixed = true; }

  if (path === "/" || path === "/configure") return send(res, 200, landing(host, prefixed ? lang : bestLang(req)), "text/html; charset=utf-8");
  if (path === "/manifest.json") return send(res, 200, manifest(lang), undefined, 3600);

  const m = path.match(/^\/(catalog|meta|stream)\/([^/]+)\/([^/]+?)(?:\/([^/]+?))?\.json$/);
  if (!m) return send(res, 404, { err: "not found" });
  const [, resource, type, rawId, rawExtra] = m;
  const id = decodeURIComponent(rawId);
  const extra = { ...parseExtra(rawExtra), ...Object.fromEntries(u.searchParams) };
  const empty = resource === "catalog" ? { metas: [] } : resource === "meta" ? { meta: null } : { streams: [] };
  if (type !== "movie") return send(res, 200, empty);
  try {
    let out;
    if (resource === "catalog") out = await catalog(lang, id, extra);
    else if (!id.startsWith(PREFIX) && !id.startsWith(PT_PREFIX)) out = empty;
    else if (resource === "meta") out = await meta(lang, id);
    else out = await stream(lang, id);
    send(res, 200, out, undefined, out.cacheMaxAge || 0);
  } catch (e) {
    console.error(`[${lang}/${resource}] ${id}:`, e.message);
    send(res, 502, { err: e.message, ...empty });
  }
}

if (require.main === module) {
  loadPtNames();
  getIndex().then(i => console.log(i ? `Catalog: official VideoNeat index (${i.items.length} titles)` : "Catalog: VideoNeat website (fallback)"));
  http.createServer((req, res) => route(req, res).catch(e => send(res, 500, { err: e.message })))
    .listen(PORT, () => console.log(`VideoNeat for Stremio: http://127.0.0.1:${PORT}/  (${LANGS.join(", ")})` +
      (TR_URL ? `\nAutomatic translation via ${TR_URL}` : "")));
}
module.exports = { loadPtNames, getIndex, translate, TRDISK, manifest, parseContent, text, catalog, meta, stream, route, fmtLen };
