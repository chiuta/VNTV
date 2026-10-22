/* =====================================================================
   Distribuire: fiecare video are o ancoră proprie (#v=gazdă/id).
   - adresa din bara browserului se actualizează la fiecare video, deci poate fi copiată oricând;
   - butonul „Distribuie” (și tasta E) folosește meniul de partajare al sistemului sau copiază linkul;
   - un link cu ancoră deschide direct acel video (după apăsarea „Start”, cerută de browsere pentru sunet).
   ===================================================================== */
const DL_RE = /^#v=([a-z0-9.-]+(?::\d{1,5})?)\/([A-Za-z0-9_-]{1,64})$/i;
function deepLink(){ const m = DL_RE.exec(location.hash); return m && okHost(m[1]) ? {host:m[1], id:m[2]} : null; }
function shareUrl(it){
  if (!it) return null;
  if (!it.v) return it.link || null;                          // fără trailer: pagina titlului pe videoneat.com
  const base = location.protocol === "file:" ? location.href.split("#")[0] : location.origin + location.pathname;
  return `${base}#v=${it.v.host}/${it.v.id}`;
}
function setAnchor(it){
  if (KIOSK || !it || !it.v) return;
  try{ history.replaceState(null, "", "#v=" + it.v.host + "/" + it.v.id); }catch(e){ /* context fără istoric (iframe, sandbox) */ }
}
async function shareItem(it){
  it = it || S.items[S.idx];
  const url = shareUrl(it); if (!url) return;
  const title = tr(it.title) + " · VNTV";
  try{ if (navigator.share){ await navigator.share({title, text:title, url}); return; } }
  catch(e){ if (e && e.name === "AbortError") return; }
  try{ await navigator.clipboard.writeText(url); toast(t("shareCopied"), 2600); return; }catch(e){ /* fără permisiune pentru clipboard */ }
  const ta = document.createElement("textarea");
  ta.value = url; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;opacity:0";
  document.body.appendChild(ta); ta.select();
  let done = false; try{ done = document.execCommand("copy"); }catch(e){ /* indisponibil */ }
  ta.remove();
  if (done) toast(t("shareCopied"), 2600); else toast(url, 9000);   // ultima soluție: linkul apare în mesaj, ca să poată fi copiat manual
}

/* Hosturile de încredere pentru linkuri directe: VideoNeat/TROM și sursele adăugate de spectator.
   Pentru oricare altul cerem confirmarea (altfel un link ostil ar putea deschide un player străin fără știrea spectatorului). */
function trustedHost(h){ return h === VN_HOST || P.sources.some(s => s.host === h); }
async function itemFromDeepLink(dl){
  const same = x => x && x.v && x.v.host === dl.host && x.v.id === dl.id;
  const known = (S.items || []).find(same) || (DATA.all || []).find(same) || Object.values(DATA.pt || {}).flat().find(same);
  if (known) return {...known};
  if (!trustedHost(dl.host)){
    const msg = t("dlConfirm", {h:dl.host});
    const yes = await FFF.dialog.confirm(msg, {danger:true});
    if (!yes) return null;
  }
  try{
    const j = await getVideo(dl);
    if (!j || j.isLive || !(j.duration > 0) || j.nsfw) return null;
    return fromPT({...j, uuid:j.uuid || dl.id}, dl.host);
  }catch(e){ return null; }
}
async function openDeepLink(force){
  const dl = deepLink(); if (!dl) return false;
  const cur = S.items[S.idx];
  if (!force && cur && cur.v && cur.v.host === dl.host && cur.v.id === dl.id) return true;   // deja rulează
  const it = await itemFromDeepLink(dl);
  if (!it) return false;
  playItemNow(it);
  return true;
}
addEventListener("hashchange", () => { if (S.started && !KIOSK) openDeepLink(); });
