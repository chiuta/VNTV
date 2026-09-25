// Teste pentru addon, fără rețea: node test.js
"use strict";
const { spawnSync } = require("child_process");
process.env.RATE_LIMIT = process.env.RATE_LIMIT || "5";
process.env.TRANSLATE_URL = process.env.TRANSLATE_URL || "https://translate.test";
if (!process.env.VN_CASE) {
  let bad = 0;
  for (const c of ["index", "noindex"]) {
    const r = spawnSync(process.execPath, [__filename], { env: { ...process.env, VN_CASE: c, PEERTUBE_CHANNELS: "https://peertube.example/c/openscience" }, encoding: "utf8" });
    process.stdout.write(r.stdout + r.stderr); if (r.status) bad++;
  }
  console.log(bad ? `\n${bad} scenarii eșuate` : "\nToate testele addonului au trecut");
  process.exit(bad ? 1 : 0);
}
const NOINDEX = process.env.VN_CASE === "noindex";
const post = { id: 26766, title: { rendered: "Dino Birds" }, link: "https://www.videoneat.com/documentaries/26766/dino-birds/", date: "2026-02-22T00:00:00", categories: [128, 2],
  excerpt: { rendered: "<p>Fossils reveal&#8230;</p>" },
  content: { rendered: `<iframe src="https://videos.trom.tf/videos/embed/pzFz?x=1"></iframe><div class="elementor-widget-text-editor"><div class="elementor-widget-container"><p><strong>YEAR:</strong> 2025 | <strong>LENGTH:</strong> 1 part (54 minutes) | <b>SOURCE: <a href="https://www.pbs.org/x">PBS</a></b></p></div></div><div class="elementor-widget-text-editor"><div class="elementor-widget-container"><p>Birds are dinosaurs.</p></div></div>` } };
const index = { v: 1, items: [{ id: 26766, title: "Dino Birds", link: post.link, date: "2026-02-22", cats: [128, 2], img: "https://x/img.jpg",
  trailer: { host: "videos.trom.tf", id: "pzFz", dur: 112, preview: "https://videos.trom.tf/p.jpg" }, year: "2025", length: "1 part (54 minutes)", source: "PBS", source_url: "https://www.pbs.org/x", excerpt: "Fossils reveal…" },
  { id: 1, title: "No trailer here", cats: [2], trailer: null }] };
const video = (host) => ({ duration: 112, name: "Open lecture 1", description: "Full lecture.", url: `https://${host}/w/p1`, previewPath: "/p.jpg", licence: { id: 1, label: "CC BY" },
  channel: { displayName: "Open Science Lab" }, category: { label: "Science & Technology" },
  streamingPlaylists: [{ playlistUrl: `https://${host}/m.m3u8`, files: [{ resolution: { id: 720, label: "720p" }, fileUrl: `https://${host}/720.mp4`, size: 28e6 }] }], files: [] });
const calls = []; let trNow = 0, trMax = 0;
global.fetch = async (url, opt) => {
  calls.push(url);
  if (/translate\.test/.test(url)) { trNow++; trMax = Math.max(trMax, trNow); await new Promise(r => setTimeout(r, 20)); trNow--;
    const b = JSON.parse(opt.body); return { ok: true, status: 200, json: async () => ({ translatedText: `[${b.target}] ${b.q}` }) }; }
  const J = (b, ok = true, status = 200) => ({ ok, status, json: async () => b });
  if (/videoneat\/v1\/index|videoneat-index\.json/.test(url)) return NOINDEX ? J({}, false, 404) : J(index);
  if (/videoneat\/v1\/item\/26766/.test(url)) return J({ desc: "Full description from the index." });
  if (/wp\/v2\/posts\/26766/.test(url)) return J(post);
  if (/wp\/v2\/posts\?/.test(url)) return J([post]);
  if (/peertube\.example\/api\/v1\/video-channels\/openscience\/videos/.test(url)) return J({ total: 1, data: [{ uuid: "u1", name: "Open lecture 1", duration: 600, truncatedDescription: "Lecture", previewPath: "/p.jpg" }] });
  if (/peertube\.example\/api\/v1\/video-channels\/openscience$/.test(url)) return J({ displayName: "Open Science Lab" });
  const m = url.match(/https:\/\/([^/]+)\/api\/v1\/videos\//); if (m) return J(video(m[1]));
  return J({}, false, 404);
};
const A = require("./index.js");
let fail = 0;
const ok = (n, c, g) => { console.log((c ? "✔ " : "✘ ") + `[${process.env.VN_CASE}] ` + n + (c ? "" : " — " + JSON.stringify(g))); if (!c) fail++; };
(async () => {
  await A.loadPtNames();
  const m = A.manifest("ro");
  ok("manifest: 15 cataloage (14 VideoNeat + 1 PeerTube)", m.catalogs.length === 15, m.catalogs.length);
  ok("manifest: numele canalului PeerTube", m.catalogs[14].name === "PeerTube — Open Science Lab", m.catalogs[14].name);
  ok("manifest: prefixe ID", m.idPrefixes.join() === "vneat:,vnpt:", m.idPrefixes);
  const c = await A.catalog("ro", "videoneat-archaeo", {});
  ok("catalog VideoNeat", c.metas.length === 1 && c.metas[0].id === "vneat:26766" && c.metas[0].genres[0] === "Arheologie & paleontologie", c.metas);
  if (!NOINDEX) ok("catalog: fără titluri fără trailer", (await A.catalog("en", "videoneat-docs", {})).metas.length === 1);
  const s = await A.catalog("en", "videoneat-all", { search: "dino" });
  ok("căutare", s.metas.length === 1, s.metas.length);
  const mt = (await A.meta("de", "vneat:26766")).meta;
  ok("meta: durată tradusă, sursă", /Länge: 1 Teil \(54 Minuten\)/.test(mt.description) && /Quelle: PBS/.test(mt.description), mt.description);
  ok("meta: descriere " + (NOINDEX ? "din articol" : "din catalog") + ", tradusă", mt.description.replace(/^\[de\] /, "").startsWith(NOINDEX ? "Birds are dinosaurs." : "Full description from the index.") && mt.description.startsWith("[de] "), mt.description.slice(0, 40));
  const st = (await A.stream("fr", "vneat:26766")).streams;
  ok("stream-uri trailer", st[0].url === "https://videos.trom.tf/m.m3u8" && /Bande-annonce/.test(st[0].title) && st.some(x => x.externalUrl === "https://www.pbs.org/x"), st.map(x => x.title));
  const pc = await A.catalog("en", "peertube-1", {});
  ok("catalog PeerTube", pc.metas.length === 1 && pc.metas[0].id === "vnpt:peertube.example:u1", pc.metas);
  const pm = (await A.meta("it", "vnpt:peertube.example:u1")).meta;
  ok("meta PeerTube: licență", /Licenza: CC BY/.test(pm.description), pm.description);
  const ps = (await A.stream("es", "vnpt:peertube.example:u1")).streams;
  ok("stream PeerTube: video complet", /Vídeo completo/.test(ps[0].title) && ps[0].url === "https://peertube.example/m.m3u8", ps.map(x => x.title));
  ok(NOINDEX ? "rezervă: citește din WordPress" : "catalog: nu mai descarcă articole întregi",
    NOINDEX ? calls.some(u => /wp\/v2\/posts/.test(u)) : !calls.some(u => /wp\/v2\/posts/.test(u)), calls.filter(u => /wp\/v2/.test(u)));
  // traduceri: cel mult 4 cereri simultane către LibreTranslate
  await Promise.all(Array.from({ length: 20 }, (_, i) => A.translate("de", "text " + i)));
  ok("LibreTranslate: maximum 4 cereri simultane", trMax > 0 && trMax <= 4, trMax);
  ok("traduceri păstrate pentru disc", A.TRDISK.size >= 20, A.TRDISK.size);
  // /health și limita de cereri
  const call = path => new Promise(done => { const res = { h: {}, setHeader(k, v){ this.h[k] = v; }, writeHead(c){ this.c = c; }, end(b){ done({ code: this.c, body: b }); } };
    A.route({ method: "GET", url: path, headers: { host: "x", "x-forwarded-for": "9.9.9.9" }, socket: {} }, res); });
  const h = JSON.parse((await call("/health")).body);
  ok("/health", h.ok === true && h.version === "1.3.0" && h.catalog === (NOINDEX ? "wordpress" : "index"), h);
  const codes = []; for (let i = 0; i < 8; i++) codes.push((await call("/manifest.json")).code);
  ok("limita de cereri: 429 după 5 pe minut", codes.slice(0, 5).every(c => c === 200) && codes.slice(5).every(c => c === 429), codes);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
