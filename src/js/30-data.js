/* =====================================================================
   Date: catalogul VideoNeat (listă JSON oficială sau, de rezervă, API-ul WordPress),
   canale PeerTube adăugate de spectator, detalii video, subtitrări
   Model unic de titlu:
   { key, src:"vn"|"pt", id, title, ex, desc, link, cats[], catLabel, img, year, len, source, sourceUrl,
     v:{host,id}, dur, preview, kind:"trailer"|"full", licence }
   ===================================================================== */
const DATA = { mode:null, all:null, indexUrl:null, generated:null, pt:{}, ptNames:{} };

/* ---- listă JSON oficială (pluginul „VideoNeat Index”) ---- */
function fromIndex(o){
  const tr = o.trailer || {};
  return {
    key:"vn:" + o.id, src:"vn", id:o.id, title:o.title || "", ex:o.excerpt || "", desc:o.desc || null, link:safeUrl(o.link),
    cats:o.cats || [], img:o.img || null, year:o.year || (o.date || "").slice(0, 4) || null, len:o.length || null,
    source:o.source || null, sourceUrl:safeUrl(o.source_url), v: tr.id && okHost(tr.host || VN_HOST) && /^[A-Za-z0-9_-]{1,64}$/.test(tr.id) ? {host:tr.host || VN_HOST, id:tr.id} : null,
    dur:+tr.dur || null, preview:tr.preview || null, kind:"trailer",
  };
}
async function loadIndex(){
  const urls = [...new Set([P.indexUrl, ...DEFAULT_INDEX].filter(Boolean))];
  for (const u of urls){
    try{
      const j = await getJSON(u, 9000);
      if (!Array.isArray(j.items)) continue;
      DATA.all = j.items.map(fromIndex).filter(x => x.v);
      DATA.mode = "index"; DATA.indexUrl = u; DATA.generated = j.generated || null;
      return true;
    }catch(e){}
  }
  DATA.mode = "wp";
  return false;
}

/* ---- rezervă: API-ul WordPress + extragerea din conținutul Elementor ---- */
function parseContent(html){
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const r = {v:null, year:null, len:null, source:null, sourceUrl:null, desc:""};
  const ifr = [...doc.querySelectorAll("iframe")].map(f => f.getAttribute("src") || "")
    .find(s => /\/videos\/embed\/[A-Za-z0-9-]+/.test(s) && /videos\.trom\.tf/.test(s));
  if (ifr){ const m = ifr.match(/https?:\/\/([^/]+)\/videos\/embed\/([A-Za-z0-9-]+)/); if (m && okHost(m[1])) r.v = {host:m[1], id:m[2]}; }
  const blocks = [...doc.querySelectorAll(".elementor-widget-text-editor")];
  const info = blocks.find(b => /YEAR:/i.test(b.textContent));
  if (info){
    const tx = info.textContent.replace(/ /g, " ");
    r.year = (tx.match(/YEAR:\s*(\d{4})/i) || [])[1] || null;
    r.len = ((tx.match(/LENGTH:\s*([^|]+)/i) || [])[1] || "").trim() || null;
    const a = info.querySelector("a[href]"); if (a){ r.sourceUrl = safeUrl(a.getAttribute("href")); r.source = a.textContent.trim() || null; }
  }
  r.desc = blocks.filter(b => b !== info).map(b => b.textContent.replace(/ /g, " ").trim()).filter(Boolean).join("\n\n");
  return r;
}
function fromWP(p){
  const c = parseContent(p.content?.rendered);
  const it = {
    key:"vn:" + p.id, src:"vn", id:p.id, title:decode(p.title?.rendered), ex:decode(p.excerpt?.rendered), desc:null, link:safeUrl(p.link),
    cats:p.categories || [], img:null, year:c.year || (p.date || "").slice(0, 4), len:c.len, source:c.source, sourceUrl:c.sourceUrl,
    v:c.v, dur:null, preview:null, kind:"trailer",
  };
  it.desc = c.desc || it.ex;
  const m = p._embedded?.["wp:featuredmedia"]?.[0];
  if (m && !m.code){ const s = m.media_details?.sizes || {}; it.img = (s.medium_large || s.large || s.medium || {}).source_url || m.source_url || null; }
  return it;
}
async function wpPage({cat = 0, q = "", page = 1, per = PER}){
  let u = `${WP}/posts?per_page=${per}&page=${page}&_embed=wp:featuredmedia&_fields=id,title,link,date,content,excerpt,categories,_links,_embedded`;
  if (cat) u += `&categories=${cat}`;
  if (q) u += `&search=${encodeURIComponent(q)}`;
  const r = await within(fetch(u, {headers:{Accept:"application/json"}}), 15000);
  if (r.status === 400) return {items:[], pages:page - 1};
  if (!r.ok) throw new Error("HTTP " + r.status);
  const data = await r.json();
  const pages = +r.headers.get("X-WP-TotalPages") || (data.length < per ? page : page + 1);
  return {items:data.map(fromWP), pages};
}
/* descrierea completă se încarcă doar când e nevoie */
async function ensureDesc(it){
  if (it.desc) return it.desc;
  try{
    if (it.src === "vn"){
      let d = null;
      if (DATA.mode === "index"){ try{ const j = await getJSON(`${DATA.indexUrl.replace(/\/index(\?.*)?$/, "")}/item/${it.id}`, 8000); d = j.desc; }catch(e){} }
      if (!d){ const p = await getJSON(`${WP}/posts/${it.id}?_fields=content`, 12000); d = parseContent(p.content?.rendered).desc; }
      it.desc = d || it.ex;
    } else if (it.src === "pt"){
      const v = await getVideo(it.v); it.desc = v.description || it.ex;
    }
  }catch(e){ it.desc = it.desc || it.ex; }
  return it.desc;
}

/* ---- PeerTube: detalii video, imagini, surse de redare ---- */
const vidCache = new Map();
function getVideo(v){
  const k = v.host + "/" + v.id;
  if (vidCache.has(k)) return vidCache.get(k);
  const pr = getJSON(`https://${v.host}/api/v1/videos/${encodeURIComponent(v.id)}`, 12000);
  vidCache.set(k, pr); pr.catch(() => vidCache.delete(k));
  return pr;
}
function ptImage(info, host){
  const th = (info?.thumbnails || []).filter(x => x.fileUrl && x.aspectRatio !== "1:1").sort((a, b) => b.width - a.width)[0];
  return th?.fileUrl || (info?.previewPath ? `https://${host}${info.previewPath}` : null);
}
function pickSrc(info){
  const hls = (info.streamingPlaylists || [])[0];
  const files = [...(hls?.files || []), ...(info.files || [])].filter(f => f.fileUrl && f.hasVideo !== false)
    .sort((a, b) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
  if (files.length){
    const cn = navigator.connection || {};
    const slow = cn.saveData || /(^|-)?(2g|3g)$/.test(cn.effectiveType || "");
    let tgt = P.quality === "auto"
      ? (slow ? 480 : Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) >= 1700 ? 1080 : 720) : +P.quality;
    if (ecoOn() && P.quality === "auto") tgt = Math.min(tgt, 720);
    return (files.find(f => (f.resolution?.id || 0) <= tgt) || files[files.length - 1]).fileUrl;
  }
  if (hls?.playlistUrl && V.canPlayType("application/vnd.apple.mpegurl")) return hls.playlistUrl;
  return null;
}

/* ---- canale PeerTube adăugate de spectator (videouri complete, de regulă cu licențe libere) ---- */
function parseSource(url){
  try{
    const u = new URL(url.trim());
    if (!/^https:$/.test(u.protocol)) return null;
    const m = u.pathname.match(/^\/(c|video-channels|a|accounts)\/([^/]+)/);
    if (!m) return null;
    return {host:u.host, kind:/^(c|video-channels)$/.test(m[1]) ? "video-channels" : "accounts", handle:decodeURIComponent(m[2])};
  }catch(e){ return null; }
}
const srcKey = s => `${s.host}/${s.kind}/${s.handle}`;
async function ptSourceInfo(s){
  const j = await getJSON(`https://${s.host}/api/v1/${s.kind}/${encodeURIComponent(s.handle)}`, 10000);
  return {name:j.displayName || j.name || s.handle, desc:j.description || ""};
}
function fromPT(v, host){
  const img = v.previewPath ? `https://${host}${v.previewPath}` : v.thumbnailPath ? `https://${host}${v.thumbnailPath}` : null;
  const lic = v.licence?.id ? v.licence.label : null;
  return {
    key:`pt:${host}:${v.uuid}`, src:"pt", id:v.uuid, title:v.name || "", ex:(v.truncatedDescription || v.description || "").slice(0, 400),
    desc:null, link:safeUrl(v.url) || `https://${host}/w/${v.shortUUID || v.uuid}`, cats:[], catLabel:v.category?.label || null,
    img, year:(v.originallyPublishedAt || v.publishedAt || "").slice(0, 4) || null, len:v.duration ? Math.round(v.duration / 60) + " min" : null,
    source:v.channel?.displayName || v.account?.displayName || host, sourceUrl:safeUrl(v.channel?.url || v.account?.url),
    v:{host, id:v.uuid}, dur:v.duration || null, preview:img, kind:"full", licence:lic,
  };
}
async function ptAll(s){
  const k = srcKey(s);
  if (DATA.pt[k]) return DATA.pt[k];
  const out = [];
  for (let start = 0; start < 500; start += 100){
    const j = await getJSON(`https://${s.host}/api/v1/${s.kind}/${encodeURIComponent(s.handle)}/videos?count=100&start=${start}&sort=-publishedAt`, 15000);
    const data = (j.data || []).filter(v => !v.isLive && v.duration > 0 && !v.nsfw);
    out.push(...data.map(v => fromPT(v, s.host)));
    if (!j.data || j.data.length < 100 || start + 100 >= (j.total || 0)) break;
  }
  DATA.pt[k] = out;
  return out;
}

/* ---- subtitrări PeerTube ---- */
async function getCaptions(v){
  const j = await getJSON(`https://${v.host}/api/v1/videos/${encodeURIComponent(v.id)}/captions`, 8000);
  return (j.data || []).map(c => ({lang:c.language?.id, label:c.language?.label, auto:!!c.automaticallyGenerated,
    url:c.fileUrl || (c.captionPath ? `https://${v.host}${c.captionPath}` : null)})).filter(c => c.url);
}
function parseVTT(s){
  const cues = [];
  const ts = x => { const p = x.replace(",", ".").split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  for (const block of String(s).replace(/\r/g, "").split(/\n{2,}/)){
    const lines = block.split("\n");
    const i = lines.findIndex(l => l.includes("-->"));
    if (i < 0) continue;
    const m = lines[i].match(/([\d:.,]+)\s+-->\s+([\d:.,]+)/);
    if (!m) continue;
    const text = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (text) cues.push({start:ts(m[1]), end:ts(m[2]), text});
  }
  return cues;
}

/* ---- favorite (cu migrarea formatului vechi) ---- */
function loadFavs(){
  const raw = store.get("favs", {}), out = {};
  for (const f of Object.values(raw)){
    if (!f) continue;
    if (f.key){ out[f.key] = f; continue; }
    if (f.trailer) out["vn:" + f.id] = {...f, key:"vn:" + f.id, src:"vn", v:{host:VN_HOST, id:f.trailer}, source:f.src, sourceUrl:f.srcUrl, kind:"trailer"};
  }
  return out;
}
function favSnapshot(it){
  const {key, src, id, title, ex, link, cats, catLabel, img, year, len, source, sourceUrl, v, dur, preview, kind, licence} = it;
  return {key, src, id, title, ex, link, cats, catLabel, img, year, len, source, sourceUrl, v, dur, preview, kind, licence, at:Date.now()};
}
