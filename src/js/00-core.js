/* =====================================================================
   VNTV — nucleu: constante, stocare, preferințe, utilitare, limbă, platformă
   ===================================================================== */
const VERSION = BUILD.version;
const WP = "https://www.videoneat.com/wp-json/wp/v2";
const VN_HOST = "videos.trom.tf";
const DEFAULT_INDEX = [
  "https://www.videoneat.com/wp-json/videoneat/v1/index",
  "https://www.videoneat.com/wp-content/uploads/videoneat-index.json",
];
const PER = 40;                 // articole pe pagină în modul de rezervă (API WordPress)
const GAP = 2;                  // secunde rezervate trecerii dintre clipuri în programul sincronizat
const DEF_DUR = 120;            // durată presupusă când nu o știm
const VN_CATS = [0, 2, 7, 26, 21, 3, 15, 126, 128, 34, 31, 42, 129, 156];
const QS = new URLSearchParams(location.search);
const KIOSK = QS.get("kiosk") === "1";

/* ---------- stocare (sigură: merge și fără localStorage) ---------- */
const MEM = new Map();
const store = {
  get(k, d){ try{ const v = localStorage.getItem("vntv." + k); if (v != null) return JSON.parse(v); }catch(e){}
    return MEM.has(k) ? MEM.get(k) : d; },
  set(k, v){ MEM.set(k, v); if (KIOSK && k === "prefs") return; try{ localStorage.setItem("vntv." + k, JSON.stringify(v)); }catch(e){} },
};

/* ---------- straturi și presetări ---------- */
const OVERLAYS = [
  {g:"gBroad"}, {k:"logo"}, {k:"clock"}, {k:"lower"}, {k:"subs"}, {k:"upnext"}, {k:"ticker"}, {k:"progress"}, {k:"idents"},
  {g:"gCine"}, {k:"ambient"}, {k:"letterbox"}, {k:"vignette"}, {k:"grain"}, {k:"scan"}, {k:"fill"},
];
const PRESETS = {
  tv:     {o:{logo:1,clock:1,lower:1,subs:1,upnext:1,ticker:1,progress:1,idents:1,ambient:1,letterbox:0,vignette:0,grain:0,scan:0,fill:0}},
  cinema: {o:{logo:1,clock:0,lower:1,subs:1,upnext:0,ticker:0,progress:0,idents:1,ambient:1,letterbox:1,vignette:1,grain:1,scan:0,fill:0}},
  retro:  {o:{logo:1,clock:1,lower:1,subs:1,upnext:1,ticker:1,progress:0,idents:1,ambient:0,letterbox:0,vignette:1,grain:1,scan:1,fill:0}},
  clean:  {o:{logo:0,clock:0,lower:0,subs:1,upnext:0,ticker:0,progress:0,idents:0,ambient:1,letterbox:0,vignette:0,grain:0,scan:0,fill:0}},
};
const O = Object.assign({}, PRESETS.tv.o, store.get("ov", {}));

/* ---------- preferințe ---------- */
const P = Object.assign({
  lang:"en", ch:0, shuffle:true, sync:true, net:"auto", eco:"auto", quality:"auto", vol:1, muted:false,
  trOn:true, trEngine:"auto", trUrl:"", trKey:"", indexUrl:"", sources:[], subSize:"m", adv:false, p2pAck:false, srcInit:0,
}, store.get("prefs", {}));
if (!Array.isArray(P.sources)) P.sources = [];
// canalul implicit cu documentarele TROM (complete, trade-free), adăugat o singură dată; spectatorul îl poate elimina
const TROM_SRC = {host:"videos.trom.tf", kind:"video-channels", handle:"trom", name:"TROM"};
if (!P.srcInit){ if (!P.sources.some(s => s.host === TROM_SRC.host && s.handle === TROM_SRC.handle)) P.sources.unshift({...TROM_SRC}); P.srcInit = 1; }
// parametri din adresă (legături directe și modul chioșc): ?ch=3&lang=ro&preset=cinema&sync=1&net=p2p&muted=1
(function urlPrefs(){
  const l = QS.get("lang"); if (l) P.lang = l;
  const c = parseInt(QS.get("ch"), 10); if (c >= 1) P.ch = c - 1;
  if (QS.has("sync")) P.sync = QS.get("sync") !== "0";
  if (QS.has("net")) P.net = QS.get("net");
  if (QS.has("eco")) P.eco = QS.get("eco");
  if (QS.has("muted")) P.muted = QS.get("muted") !== "0"; else if (KIOSK) P.muted = true;
  const pr = QS.get("preset"); if (pr && PRESETS[pr]) Object.assign(O, PRESETS[pr].o);
  if (QS.has("subs")) O.subs = QS.get("subs") !== "0" ? 1 : 0;   // ?subs=0 oprește subtitrările pentru această vizită
  if (QS.has("index")){ const u = safeUrl(QS.get("index")); if (u && u.startsWith("https:")) P.indexUrl = u; }   // doar HTTPS; o legătură ostilă nu poate impune o sursă de catalog nesigură
})();
if (!I18N[P.lang]) P.lang = "en";
function savePrefs(){ store.set("prefs", P); }
// subtitrările pornesc automat: o singură dată se corectează și preferințele salvate de versiunile vechi; apoi se respectă alegerea spectatorului (butonul CC / tasta T)
if (!P.subsInit){ P.subsInit = 1; if (!QS.has("subs")){ O.subs = 1; store.set("ov", O); } savePrefs(); }

/* ---------- limbă ---------- */
const L = () => I18N[P.lang] || I18N.en;
function t(k, v){ let x = L()[k] ?? I18N.en[k] ?? k; if (v) for (const n in v) x = String(x).split("{" + n + "}").join(v[n]); return x; }
function fmtLen(s){
  if (!s) return s; const w = L().lw || {};
  return s.replace(/\b(parts?|episodes?|minutes?|hours?|seasons?|lectures?|lessons?|and)\b/gi, m => w[m.toLowerCase()] ?? m);
}

/* ---------- utilitare ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function decode(h){ return new DOMParser().parseFromString("<!doctype html><body>" + (h || ""), "text/html").body.textContent.trim(); }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function safeUrl(u){ try{ const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; }catch(e){ return null; } }
function fmt(s){ s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; }
/* URL pentru CSS url('…'): doar http(s), cu ghilimele/paranteze/spații codificate (altfel o adresă ostilă ar putea închide șirul și injecta CSS) */
function cssUrl(u){ const x = safeUrl(u); return x ? x.replace(/['"()\\\s]/g, ch => "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")) : ""; }
/* nume de gazdă PeerTube plauzibil (fără utilizator@, cale sau caractere ciudate) */
const okHost = h => typeof h === "string" && /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?(:\d{1,5})?$/i.test(h);
function pad2(n){ return String(n).padStart(2, "0"); }
const within = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
function toast(m, ms = 2600){ const el = $("#toast"); el.textContent = m; el.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), ms); }
function norm(s){ return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
async function getJSON(url, ms = 12000){
  const r = await within(fetch(url, {headers:{Accept:"application/json"}}), ms);
  if (!r.ok){ const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
  return r.json();
}
/* aleator determinist (același program pentru toți spectatorii) */
function hashStr(s){ let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++){ h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
function rng(seed){ let a = hashStr(seed)(); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a);
  x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a, rnd = Math.random){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- platformă ---------- */
const V = $("#v");
const UA = navigator.userAgent;
const IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(UA);
const STANDALONE = matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches || navigator.standalone === true;
const CAN_FS = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const CAN_PIP = !!(document.pictureInPictureEnabled || (V.webkitSupportsPresentationMode && V.webkitSupportsPresentationMode("picture-in-picture")));
const mqTouch = matchMedia("(pointer:coarse)");
let TOUCH = mqTouch.matches || (navigator.maxTouchPoints > 0 && matchMedia("(hover:none)").matches);
const isPhone = () => Math.min(screen.width, screen.height) < 600;
function lowEnd(){
  const cn = navigator.connection || {};
  return (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 && TOUCH)
    || !!cn.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches;
}
const ecoOn = () => P.eco === "on" || (P.eco === "auto" && lowEnd());
function applyPlatform(){
  const b = document.body.classList;
  b.toggle("touch", TOUCH); b.toggle("ios", IS_IOS); b.toggle("android", IS_ANDROID);
  b.toggle("standalone", STANDALONE); b.toggle("nofs", !CAN_FS); b.toggle("eco", ecoOn()); b.toggle("kiosk", KIOSK);
  ["s", "m", "l", "xl"].forEach(z => b.toggle("subs-" + z, P.subSize === z));
}
mqTouch.addEventListener?.("change", e => { TOUCH = e.matches; applyPlatform(); });
