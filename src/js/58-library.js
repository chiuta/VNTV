/* =====================================================================
   Biblioteca mea (3.0.0): istoric local cu cutii de reluare, liste proprii, abonamente la liste publice PeerTube,
   verificarea automată a legăturilor, export M3U / JSON. Totul rămâne în acest browser (vntv.hist, vntv.lists, vntv.links);
   singurele cereri de rețea sunt către instanțele PeerTube ale titlurilor deja salvate sau ale listelor la care te abonezi.
   ===================================================================== */
const HIST_MAX = 200, LIST_MAX = 30, LIST_ITEMS = 300, LINK_TTL = 3 * 864e5, SUB_TTL = 6 * 36e5, AUTO_CHECK = 24;
const rid = () => Math.random().toString(36).slice(2, 10);
const fin = (x, d = 0) => Number.isFinite(+x) ? +x : d;
const LIB = { tab:"resume", open:null, chk:null, subBusy:false };

/* ---- curățarea datelor din stocare / din fișiere importate (nu sunt de încredere) ---- */
function libClean(f){
  const c = cleanFav(f); if (!c) return null;
  const s = (x, n) => typeof x === "string" ? x.slice(0, n) : null;
  return {key:c.key, src:c.src === "pt" ? "pt" : "vn", id:typeof c.id === "number" || typeof c.id === "string" ? c.id : "", title:s(c.title, 300) || "", ex:s(c.ex, 400) || "",
    link:c.link, cats:Array.isArray(c.cats) ? c.cats.filter(Number.isFinite).slice(0, 8) : [], catLabel:s(c.catLabel, 60), img:c.img,
    year:c.year == null ? null : String(c.year).slice(0, 8), len:s(c.len, 60), source:s(c.source, 80), sourceUrl:c.sourceUrl, v:c.v,
    dur:fin(c.dur) > 0 ? fin(c.dur) : null, preview:c.preview, kind:c.kind === "full" ? "full" : "trailer", licence:s(c.licence, 60)};
}
function cleanHist(h){
  if (!h || typeof h !== "object") return null;
  const it = libClean(h.it); if (!it) return null;
  return {it, pos:Math.max(0, fin(h.pos)), dur:Math.max(0, fin(h.dur)), at:fin(h.at), done:!!h.done};
}
function cleanList(l){
  if (!l || typeof l !== "object" || Array.isArray(l)) return null;
  const seen = new Set(), items = [];
  for (const x of (Array.isArray(l.items) ? l.items : []).slice(0, LIST_ITEMS)){ const c = libClean(x); if (c && !seen.has(c.key)){ seen.add(c.key); items.push(c); } }
  const o = {id:typeof l.id === "string" && /^[a-z0-9]{3,12}$/.test(l.id) ? l.id : rid(), name:(typeof l.name === "string" ? l.name.trim().slice(0, 60) : "") || "—", items};
  const sb = l.sub;
  if (sb && typeof sb === "object" && okHost(sb.host) && typeof sb.pid === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(sb.pid))
    o.sub = {host:sb.host, pid:sb.pid, at:fin(sb.at), added:Math.max(0, fin(sb.added) | 0), err:typeof sb.err === "string" ? sb.err.slice(0, 120) : ""};
  return o;
}
const HIST = (() => { const a = store.get("hist", []); return (Array.isArray(a) ? a : []).slice(0, HIST_MAX).map(cleanHist).filter(Boolean); })();
const LISTS = (() => { const a = store.get("lists", []); const out = []; for (const x of (Array.isArray(a) ? a : []).slice(0, LIST_MAX)){ const c = cleanList(x); if (c && !out.some(o => o.id === c.id)) out.push(c); } return out; })();
const LINKS = (() => { const m = store.get("links", {}); const o = {}; if (m && typeof m === "object" && !Array.isArray(m)) for (const k of Object.keys(m).slice(0, 1500)){ const e = m[k]; if (/^(vn|pt):/.test(k) && e && typeof e === "object") o[k] = {ok:e.ok === false ? false : true, at:fin(e.at)}; } return o; })();
const histSave = () => store.set("hist", HIST);
const listsSave = () => store.set("lists", LISTS);
const linksSave = () => { const ks = Object.keys(LINKS); if (ks.length > 1500) ks.sort((a, b) => LINKS[a].at - LINKS[b].at).slice(0, ks.length - 1500).forEach(k => delete LINKS[k]); store.set("links", LINKS); };
const isDead = it => !!(it && LINKS[it.key] && LINKS[it.key].ok === false);
const listById = id => LISTS.find(l => l.id === id);

/* ---- istoric: se înregistrează când pornește redarea; poziția se salvează la ~5 s ---- */
let HCUR = null, hSaved = 0;
function histStart(it){
  if (KIOSK || P.hist === false || !it || !it.v) return;
  if (HCUR && HCUR.it.key === it.key) return;
  const snap = libClean(favSnapshot(it)); if (!snap) return;
  const i = HIST.findIndex(h => h.it.key === snap.key);
  const h = i >= 0 ? HIST.splice(i, 1)[0] : {it:snap, pos:0, dur:snap.dur || 0, at:0, done:false};
  h.it = snap; h.at = Date.now(); h.done = false; if (i < 0) h.pos = 0;
  HIST.unshift(h); HIST.length = Math.min(HIST.length, HIST_MAX); HCUR = h; histSave(); hSaved = Date.now(); syncResumeBox();
}
function histTick(c, d){
  if (!HCUR || !(c > 0.5)) return;
  HCUR.pos = c; if (d > 0) HCUR.dur = d;
  if (d > 0 && c >= d - 2){ HCUR.done = true; HCUR.pos = 0; }
  if (Date.now() - hSaved > 5000){ hSaved = Date.now(); histSave(); }
}
function histStop(){ if (HCUR){ histSave(); HCUR = null; } }
addEventListener("pagehide", () => { if (HCUR) histSave(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && HCUR) histSave(); });
const resumable = h => !h.done && h.pos > 20 && (!h.dur || h.pos < h.dur - 20);
const resumables = () => HIST.filter(resumable).filter(h => !isDead(h.it));
function resumeItem(h){
  const it = libClean(h.it); if (!it) return;
  closePanels(); if (!S.started) start({noplay:true});
  playItemNow(it, Math.max(0, h.pos - 3));
}
function syncResumeBox(){
  const b = $("#resumebox"); if (!b) return;
  const r = P.hist === false ? null : resumables()[0];
  b.hidden = !r;
  if (r) b.innerHTML = `<span class="rk">${esc(t("libResumeNow"))}</span><b>${esc(tr(r.it.title))}</b><small>${esc(fmt(r.pos))}${r.dur ? " / " + esc(fmt(r.dur)) : ""}</small>`;
}

/* ---- liste proprii ---- */
function newList(name){
  if (LISTS.length >= LIST_MAX){ toast(t("libMax"), 3200); return null; }
  const l = {id:rid(), name:(name || "").trim().slice(0, 60) || t("libDefName", {n:LISTS.length + 1}), items:[]};
  LISTS.push(l); listsSave(); renderChannels(); return l;
}
function addToList(id, it){
  const l = listById(id); if (!l || l.sub || !it || !it.v) return false;
  if (l.items.some(x => x.key === it.key)){ toast(t("libHave", {n:l.name}), 2800); return false; }
  if (l.items.length >= LIST_ITEMS){ toast(t("libMax"), 3200); return false; }
  const c = libClean(favSnapshot(it)); if (!c) return false;
  l.items.push(c); listsSave(); renderChannels(); toast(t("libAdded", {n:l.name}), 2600); return true;
}
function listChanged(){ listsSave(); renderChannels(); }
function playList(id){
  const l = listById(id); if (!l) return;
  if (!l.items.some(x => !isDead(x))){ toast(t("libEmpty"), 3200); return; }
  const i = channelList().findIndex(c => c.type === "pl" && c.id === id);
  if (i < 0){ toast(t("libEmpty"), 3200); return; }
  closePanels(); if (!S.started) start({noplay:true}); switchChannel(i);
}
function pickHTML(excludeSubs = true){
  return `<select class="btn libpick" data-act="addto" aria-label="${esc(t("libAddTo"))}"><option value="">＋ ${esc(t("libAddTo"))}</option>${LISTS.filter(l => !l.sub).map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("")}<option value="__new">${esc(t("libNewList"))}…</option></select>`;
}
function bindPick(root, getItem){
  root.querySelectorAll("select[data-act=addto]").forEach(sel => sel.onchange = () => {
    const it = getItem(sel); let v = sel.value; sel.value = "";
    if (!v || !it) return;
    if (v === "__new"){ const l = newList(""); if (!l) return; v = l.id; }
    addToList(v, it); if (isOpen("lib")) renderLib();
  });
}

/* ---- M3U și JSON ---- */
function pageUrl(it){ return it.link || (it.v ? `https://${it.v.host}/w/${it.v.id}` : ""); }
function toM3U(l){
  const one = s => String(s || "").replace(/[\r\n]+/g, " ").trim();
  return "#EXTM3U\n#PLAYLIST:" + one(l.name) + "\n" + l.items.filter(x => pageUrl(x)).map(x => `#EXTINF:${x.dur ? Math.round(x.dur) : -1},${one(x.title)}\n${pageUrl(x)}`).join("\n") + "\n";
}
function download(name, text, type){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const fileSafe = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "lista";
function exportLists(){
  download("vntv-liste.json", JSON.stringify({app:"vntv", kind:"lists", version:1, lists:LISTS.filter(l => !l.sub).map(l => ({name:l.name, items:l.items})), subs:LISTS.filter(l => l.sub).map(l => ({name:l.name, host:l.sub.host, pid:l.sub.pid}))}, null, 1), "application/json");
}
function importLists(text){
  let d; try{ d = JSON.parse(text); }catch(e){ return -1; }
  if (!d || d.app !== "vntv" || d.kind !== "lists" || !Array.isArray(d.lists)) return -1;
  let n = 0;
  for (const x of d.lists.slice(0, LIST_MAX)){
    if (LISTS.length >= LIST_MAX) break;
    const c = cleanList({name:x && x.name, items:x && x.items}); if (!c || (!c.items.length && !(x && x.name))) continue;
    c.id = rid(); delete c.sub; LISTS.push(c); n++;
  }
  for (const s of (Array.isArray(d.subs) ? d.subs : []).slice(0, LIST_MAX)){
    if (LISTS.length >= LIST_MAX) break;
    const c = cleanList({name:s && s.name, items:[], sub:{host:s && s.host, pid:s && s.pid}});
    if (c && c.sub && !LISTS.some(l => l.sub && l.sub.host === c.sub.host && l.sub.pid === c.sub.pid)){ LISTS.push(c); n++; }
  }
  if (n) listChanged();
  return n;
}

/* ---- abonamente: liste publice PeerTube (/w/p/<id>) ---- */
function parsePlaylistUrl(url){
  try{
    const u = new URL(String(url).trim());
    if (u.protocol !== "https:" || !okHost(u.host)) return null;
    const m = u.pathname.match(/^\/(?:w\/p|videos\/watch\/playlist|video-playlists)\/([A-Za-z0-9_-]{4,64})\/?$/);
    return m ? {host:u.host, pid:m[1]} : null;
  }catch(e){ return null; }
}
async function fetchPlaylist(host, pid){
  const base = `https://${host}/api/v1/video-playlists/${encodeURIComponent(pid)}`;
  const info = await getJSON(base, 10000);
  const items = [];
  for (let start = 0; start < LIST_ITEMS; start += 100){
    const j = await getJSON(`${base}/videos?start=${start}&count=100`, 15000);
    for (const e of (j.data || [])){
      const v = e && e.video;
      if (!v || typeof v.uuid !== "string" || v.isLive || !(v.duration > 0) || v.nsfw) continue;
      const c = libClean(fromPT(v, host)); if (c && !items.some(x => x.key === c.key)) items.push(c);
    }
    if (!j.data || j.data.length < 100 || start + 100 >= (j.total || 0)) break;
  }
  return {name:String(info.displayName || info.name || pid).slice(0, 60), items:items.slice(0, LIST_ITEMS)};
}
async function refreshSub(l){
  if (!l || !l.sub) return false;
  try{
    const r = await fetchPlaylist(l.sub.host, l.sub.pid);
    const old = new Set(l.items.map(x => x.key));
    l.sub.added = old.size ? r.items.filter(x => !old.has(x.key)).length : 0;
    l.items = r.items; if (r.name && r.name !== "—") l.name = r.name;
    l.sub.at = Date.now(); l.sub.err = "";
    listChanged(); return true;
  }catch(e){
    l.sub.err = String(e && e.status ? "HTTP " + e.status : (e && e.message) || "error").slice(0, 120); l.sub.at = Date.now(); listsSave(); return false;
  }
}
async function subscribe(url){
  const p = parsePlaylistUrl(url);
  if (!p){ toast(t("libSubBad"), 3500); return; }
  if (LISTS.some(l => l.sub && l.sub.host === p.host && l.sub.pid === p.pid)){ toast(t("libSubDup"), 3000); return; }
  if (LISTS.length >= LIST_MAX){ toast(t("libMax"), 3200); return; }
  LIB.subBusy = true; renderLib();
  try{
    const r = await fetchPlaylist(p.host, p.pid);
    if (!r.items.length){ toast(t("libSubEmpty"), 3500); }
    else {
      LISTS.push({id:rid(), name:r.name, items:r.items, sub:{host:p.host, pid:p.pid, at:Date.now(), added:0, err:""}}); listChanged();
      toast(t("libSubOk", {n:r.name, c:r.items.length}), 3500);
    }
  }catch(e){ toast(t("libSubErr", {e:e && e.status ? "HTTP " + e.status : (e && e.message) || "error"}), 4500); }
  LIB.subBusy = false; if (isOpen("lib")) renderLib();
}
async function autoRefreshSubs(){
  const due = LISTS.filter(l => l.sub && Date.now() - l.sub.at > SUB_TTL).slice(0, 3);
  if (!due.length || navigator.onLine === false) return;
  for (const l of due) await refreshSub(l);
  if (isOpen("lib")) renderLib();
}

/* ---- verificarea legăturilor: înregistrarea mai există pe instanța ei? (404/410 = nu; erorile de rețea nu contează ca „stricat”) ---- */
async function probe(host, id){
  try{ await getJSON(`https://${host}/api/v1/videos/${encodeURIComponent(id)}`, 8000); return true; }
  catch(e){ return e && (e.status === 404 || e.status === 410) ? false : null; }
}
async function checkOne(it){
  let r = await probe(it.v.host, it.v.id);
  if (r === false){
    const hosts = [...new Set([VN_HOST, ...P.sources.map(s => s.host)])].filter(h => h !== it.v.host && okHost(h)).slice(0, 3);
    for (const h of hosts){ if (await probe(h, it.v.id) === true){ r = true; break; } }   // aceeași înregistrare pe altă instanță: redarea o găsește singură
  }
  return r;
}
function trackedItems(){
  const m = new Map();
  for (const l of LISTS) for (const x of l.items) m.set(x.key, x);
  for (const x of Object.values(S.favs)) if (x && x.v && !m.has(x.key)) m.set(x.key, x);
  for (const h of HIST.slice(0, 40)) if (!m.has(h.it.key)) m.set(h.it.key, h.it);
  return [...m.values()];
}
async function runChecks(force){
  if (LIB.chk && LIB.chk.running) return;
  if (navigator.onLine === false){ if (force) toast(t("libOffline"), 3000); return; }
  const now = Date.now();
  let todo = trackedItems().filter(x => force || !LINKS[x.key] || now - LINKS[x.key].at > LINK_TTL);
  if (!force) todo = todo.slice(0, AUTO_CHECK); else todo = todo.slice(0, LIST_ITEMS);
  if (!todo.length){ if (force) toast(t("libAllFresh"), 2600); return; }
  const st = LIB.chk = {running:true, done:0, total:todo.length, dead:0, unk:0};
  if (isOpen("lib")) renderLib();
  let k = 0;
  const worker = async () => {
    while (k < todo.length){
      const it = todo[k++];
      const r = await checkOne(it);
      if (r === null) st.unk++; else { LINKS[it.key] = {ok:r, at:Date.now()}; if (r === false) st.dead++; }
      st.done++; if (isOpen("lib") && LIB.tab === "links") renderLib();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  st.running = false; linksSave(); renderChannels(); syncResumeBox();
  if (isOpen("lib")) renderLib();
  if (force) toast(t("libChecked", {d:st.dead, n:st.done}), 3500);
}
function removeDead(){
  let n = 0;
  for (const l of LISTS) if (!l.sub){ const b = l.items.length; l.items = l.items.filter(x => !isDead(x)); n += b - l.items.length; }
  for (const k of Object.keys(S.favs)) if (LINKS[k] && LINKS[k].ok === false){ delete S.favs[k]; n++; }
  const hb = HIST.length; for (let i = HIST.length - 1; i >= 0; i--) if (isDead(HIST[i].it)) HIST.splice(i, 1); n += hb - HIST.length;
  if (HCUR && !HIST.includes(HCUR)) HCUR = null;
  store.set("favs", S.favs); listChanged(); histSave(); syncFav(); syncResumeBox();
  toast(t("libRemoved", {n}), 3000);
}

/* ---- interfața panoului ---- */
const when = at => at ? new Intl.DateTimeFormat(L()._loc, {dateStyle:"medium", timeStyle:"short"}).format(new Date(at)) : "";
function thumb(it){ return `<div class="th" style="background-image:url('${esc(cssUrl(it.preview || it.img))}')"></div>`; }
function renderLib(){
  const b = $("#libbody"); if (!b) return;
  const keep = b.scrollTop;
  const tabs = [["resume", "libTabResume"], ["lists", "libTabLists"], ["links", "libTabLinks"]];
  $("#libtabs").innerHTML = tabs.map(([k, n]) => `<button role="tab" class="${LIB.tab === k ? "on" : ""}" aria-selected="${LIB.tab === k}" data-tab="${k}">${esc(t(n))}</button>`).join("");
  b.innerHTML = LIB.tab === "resume" ? libResumeHTML() : LIB.tab === "lists" ? libListsHTML() : libLinksHTML();
  bindPick(b, sel => { const row = sel.closest("[data-hi]"); const h = row && HIST[+row.dataset.hi]; return h ? h.it : null; });
  need([...HIST.slice(0, 12).map(h => h.it.title), ...LISTS.slice(0, 10).flatMap(l => l.items.slice(0, 6).map(x => x.title))]);
  b.scrollTop = keep;
}
function libResumeHTML(){
  const rs = resumables().slice(0, 6);
  let h = `<p class="hintp">${esc(t("libPrivacy"))}</p>` + tgl("hist", P.hist !== false, t("libHistOn"), t("libHistOnD"), "data-lib");
  h += `<div class="grp">${esc(t("libResumeH"))}</div>`;
  h += rs.length ? rs.map(r => { const i = HIST.indexOf(r), pc = r.dur ? Math.min(100, Math.round(r.pos / r.dur * 100)) : 0;
    return `<div class="rbox" data-hi="${i}">${thumb(r.it)}<div class="rt"><b>${esc(tr(r.it.title))}</b><small>${esc(fmt(r.pos))}${r.dur ? " / " + esc(fmt(r.dur)) : ""} · ${esc(when(r.at))}</small>
      <div class="rbar"><i style="width:${pc}%"></i></div></div><button class="btn pri" data-act="resume">▶ ${esc(t("libResume"))}</button><button class="x" data-act="hdel" aria-label="${esc(t("remove"))}">×</button></div>`; }).join("")
    : `<div class="empty">${esc(t("libNoResume"))}</div>`;
  h += `<div class="grp">${esc(t("libHistH"))}</div>`;
  const rows = HIST.slice(0, 60);
  h += rows.length ? rows.map((r, i) => `<div class="lrow" data-hi="${i}">${thumb(r.it)}<div class="rt"><b>${esc(tr(r.it.title))}</b><small>${esc(when(r.at))}${r.done ? " · ✓" : ""}${isDead(r.it) ? " · ⚠ " + esc(t("libDead")) : ""}</small></div>
      <button class="btn" data-act="hplay" ${r.it.v ? "" : "disabled"}>▶</button>${pickHTML()}<button class="x" data-act="hdel" aria-label="${esc(t("remove"))}">×</button></div>`).join("")
      + `<button class="btn" data-act="hclear">${esc(t("libClear"))}</button>`
    : `<div class="empty">${esc(t("libNoHist"))}</div>`;
  return h;
}
function libListsHTML(){
  let h = `<div class="grp">${esc(t("libNewList"))}</div><form class="gsearch" data-form="newlist"><input type="text" id="nlName" maxlength="60" placeholder="${esc(t("libNamePh"))}" aria-label="${esc(t("libNamePh"))}" autocomplete="off"><button class="btn pri">${esc(t("libCreate"))}</button></form>`;
  h += `<div class="grp">${esc(t("libSubH"))}</div><form class="gsearch" data-form="sub"><input type="text" id="subUrl" placeholder="https://peertube.example/w/p/…" aria-label="${esc(t("libSubPh"))}" autocomplete="off"><button class="btn pri" ${LIB.subBusy ? "disabled" : ""}>${esc(LIB.subBusy ? t("loadingProg") : t("libSubscribe"))}</button></form>
    <p class="hintp">${esc(t("libSubHint"))}</p>`;
  h += `<div class="grp">${esc(t("libMine"))}</div>`;
  if (!LISTS.length) h += `<div class="empty">${esc(t("libNoLists"))}</div>`;
  for (const l of LISTS){
    const op = LIB.open === l.id, dead = l.items.filter(isDead).length;
    h += `<div class="lcard" data-li="${esc(l.id)}"><div class="lhead"><button class="lname" data-act="toggle" aria-expanded="${op}"><b>${esc(l.name)}</b><small>${esc(t("libCount", {n:l.items.length}))}${l.sub ? " · " + esc(t("libSubBadge", {h:l.sub.host})) : ""}${l.sub && l.sub.added ? " · " + esc(t("libNew", {n:l.sub.added})) : ""}${dead ? " · ⚠ " + esc(t("libDeadN", {n:dead})) : ""}</small></button>
      <button class="btn pri" data-act="playlist" aria-label="${esc(t("libPlay"))}">▶</button></div>`;
    if (op){
      h += `<div class="lacts">${l.sub ? `<button class="btn" data-act="refresh">↻ ${esc(t("libRefresh"))}</button><button class="btn" data-act="copy">${esc(t("libCopy"))}</button>` : `<button class="btn" data-act="addcur" ${S.items[S.idx] ? "" : "disabled"}>＋ ${esc(t("libAddCur"))}</button>`}
        <button class="btn" data-act="m3u">${esc(t("libM3u"))}</button><button class="btn" data-act="ldel">${esc(t("libDelList"))}</button></div>`;
      if (!l.sub) h += `<label class="fld">${esc(t("libRename"))}<input type="text" data-rename maxlength="60" value="${esc(l.name)}"></label>`;
      if (l.sub && l.sub.err) h += `<div class="warn">⚠ ${esc(t("libSubErr", {e:l.sub.err}))}</div>`;
      if (l.sub) h += `<div class="hintp">${esc(t("libSubAt", {d:when(l.sub.at)}))}</div>`;
      h += l.items.length ? l.items.map((x, i) => `<div class="lrow" data-ii="${i}">${thumb(x)}<div class="rt"><b>${esc(tr(x.title))}</b><small>${esc([catLabel(x), x.year].filter(Boolean).join(" · "))}${isDead(x) ? " · ⚠ " + esc(t("libDead")) : ""}</small></div>
        <button class="btn" data-act="iplay">▶</button>${l.sub ? "" : `<button class="x" data-act="up" aria-label="${esc(t("libUp"))}">▲</button><button class="x" data-act="down" aria-label="${esc(t("libDown"))}">▼</button><button class="x" data-act="idel" aria-label="${esc(t("remove"))}">×</button>`}</div>`).join("")
        : `<div class="empty">${esc(t("libEmpty"))}</div>`;
    }
    h += `</div>`;
  }
  h += `<div class="lacts"><button class="btn" data-act="export" ${LISTS.length ? "" : "disabled"}>${esc(t("libExport"))}</button><button class="btn" data-act="import">${esc(t("libImport"))}</button><input type="file" id="libFile" accept="application/json,.json" hidden></div>`;
  return h;
}
function libLinksHTML(){
  const items = trackedItems(), now = Date.now();
  const dead = items.filter(isDead), fresh = items.filter(x => LINKS[x.key] && LINKS[x.key].ok && now - LINKS[x.key].at <= LINK_TTL).length;
  const st = LIB.chk;
  let h = `<p class="hintp">${esc(t("libLinksHint"))}</p><div class="stat">${esc(t("libLinksSum", {n:items.length, ok:fresh, d:dead.length}))}</div>`;
  if (st && st.running) h += `<div class="stat" role="status">${esc(t("libChecking", {a:st.done, b:st.total}))}</div><div class="rbar"><i style="width:${Math.round(st.done / st.total * 100)}%"></i></div>`;
  h += `<div class="lacts"><button class="btn pri" data-act="check" ${st && st.running ? "disabled" : ""}>${esc(t("libCheckNow"))}</button>${dead.length ? `<button class="btn" data-act="rmdead">${esc(t("libRemoveDead", {n:dead.length}))}</button>` : ""}</div>`;
  h += dead.length ? dead.slice(0, 80).map(x => `<div class="lrow">${thumb(x)}<div class="rt"><b>${esc(tr(x.title))}</b><small>⚠ ${esc(t("libDead"))} · ${esc(x.v.host)} · ${esc(when(LINKS[x.key].at))}</small></div></div>`).join("")
    : `<div class="empty">${esc(t("libNoDead"))}</div>`;
  return h;
}
function libAsk(msg){ return FFF.dialog.confirm(msg, {danger:true}); }
$("#libtabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (!b) return; LIB.tab = b.dataset.tab; renderLib(); b.focus?.(); $("#libtabs [aria-selected=true]")?.focus({preventScroll:true}); });
$("#libbody").addEventListener("submit", e => {
  e.preventDefault(); const f = e.target.dataset.form;
  if (f === "newlist"){ const l = newList($("#nlName").value); if (l){ LIB.open = l.id; renderLib(); } }
  else if (f === "sub") subscribe($("#subUrl").value);
});
$("#libbody").addEventListener("change", e => {
  const el = e.target;
  if (el.id === "libFile"){
    const f = el.files[0]; el.value = ""; if (!f) return;
    if (f.size > 4e6){ toast(t("libImpBad"), 3200); return; }
    const rd = new FileReader();
    rd.onload = () => { const n = importLists(String(rd.result)); toast(n < 0 ? t("libImpBad") : t("libImpOk", {n}), 3200); renderLib(); };
    rd.onerror = () => toast(t("libImpBad"), 3200);
    rd.readAsText(f);
  } else if (el.matches("[data-rename]")){
    const l = listById(el.closest("[data-li]").dataset.li); const n = el.value.trim().slice(0, 60);
    if (l && n && !l.sub){ l.name = n; listChanged(); renderLib(); }
  }
});
$("#libbody").addEventListener("click", async e => {
  const a = e.target.closest("[data-act]");
  const hrow = e.target.closest("[data-hi]"), lcard = e.target.closest("[data-li]"), irow = e.target.closest("[data-ii]");
  const H = hrow ? HIST[+hrow.dataset.hi] : null, l = lcard ? listById(lcard.dataset.li) : null;
  if (!a) return;
  const act = a.dataset.act;
  if (act === "addto") return;
  if (act === "resume" && H) return resumeItem(H);
  if (act === "hplay" && H){ const it = libClean(H.it); if (it){ closePanels(); if (!S.started) start({noplay:true}); playItemNow(it); } return; }
  if (act === "hdel" && H){ HIST.splice(+hrow.dataset.hi, 1); if (HCUR === H) HCUR = null; histSave(); syncResumeBox(); return renderLib(); }
  if (act === "hclear"){ if (await libAsk(t("libClearQ"))){ HIST.length = 0; HCUR = null; histSave(); syncResumeBox(); renderLib(); } return; }
  if (act === "check") return runChecks(true);
  if (act === "rmdead"){ if (await libAsk(t("libRemoveDeadQ"))) { removeDead(); renderLib(); } return; }
  if (act === "export") return exportLists();
  if (act === "import") return $("#libFile").click();
  if (!l) return;
  const i = irow ? +irow.dataset.ii : -1;
  if (act === "toggle"){ LIB.open = LIB.open === l.id ? null : l.id; return renderLib(); }
  if (act === "playlist") return playList(l.id);
  if (act === "refresh"){ a.disabled = true; await refreshSub(l); toast(l.sub.err ? t("libSubErr", {e:l.sub.err}) : t("libRefreshed", {n:l.sub.added}), 3000); return renderLib(); }
  if (act === "copy"){ const c = cleanList({name:l.name, items:l.items}); c.id = rid(); if (LISTS.length >= LIST_MAX) return toast(t("libMax"), 3200); LISTS.push(c); LIB.open = c.id; listChanged(); return renderLib(); }
  if (act === "addcur"){ addToList(l.id, S.items[S.idx]); return renderLib(); }
  if (act === "m3u"){ download("vntv-" + fileSafe(l.name) + ".m3u", toM3U(l), "audio/x-mpegurl"); return; }
  if (act === "ldel"){ if (await libAsk(t("libDelQ", {n:l.name}))){ LISTS.splice(LISTS.indexOf(l), 1); LIB.open = null; const wasCur = S.ch && S.ch.type === "pl" && S.ch.id === l.id; listChanged(); renderLib(); if (wasCur) switchChannel(0); } return; }
  if (act === "iplay" && i >= 0){ const it = libClean(l.items[i]); if (it){ closePanels(); if (!S.started) start({noplay:true}); playItemNow(it); } return; }
  if (act === "idel" && i >= 0 && !l.sub){ l.items.splice(i, 1); listChanged(); return renderLib(); }
  if ((act === "up" || act === "down") && i >= 0 && !l.sub){
    const j = act === "up" ? i - 1 : i + 1; if (j < 0 || j >= l.items.length) return;
    [l.items[i], l.items[j]] = [l.items[j], l.items[i]]; listChanged(); renderLib();
    $(`#libbody [data-li="${l.id}"] [data-ii="${j}"] [data-act=${act}]`)?.focus({preventScroll:true}); return;
  }
});
$("#libbody").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("[data-rename]")) e.target.blur(); });
$("#libbody").addEventListener("click", e => {
  const x = e.target.closest(".tg[data-lib]"); if (!x) return;
  P.hist = P.hist === false ? true : false; savePrefs(); if (P.hist === false) histStop(); syncResumeBox(); renderLib();
});
$("#libbody").addEventListener("keydown", e => {
  const x = e.target.closest?.(".tg[data-lib]"); if (!x || (e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault(); e.stopPropagation(); P.hist = P.hist === false ? true : false; savePrefs(); if (P.hist === false) histStop(); syncResumeBox(); renderLib();
  $("#libbody .tg[data-lib]")?.focus({preventScroll:true});
});
function openLib(){ openPanel("lib"); }
$("#blib").onclick = openLib;
$("#resumebox").onclick = () => { const r = resumables()[0]; if (r) resumeItem(r); };
