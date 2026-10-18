/* =====================================================================
   Reziliență la erori de redare (totul local, fără telemetrie)
   Ordinea încercărilor la o eroare/blocaj pe motorul „direct”:
     1) aceeași sursă încă o dată (eroare de rețea trecătoare)
     2) altă calitate/alt fișier (la blocaj coborâm și plafonul de calitate pentru clipurile următoare)
     3) playerul P2P încorporat (dacă nu a eșuat deja pe acest browser)
     4) aceeași înregistrare pe altă instanță PeerTube de încredere
     5) abia apoi: clipul e marcat „stricat” 24 h (se sare fără așteptare, programul sincronizat rămâne neschimbat) și trecem mai departe
   După 5 clipuri la rând fără redare ne oprim și arătăm bara de erori cu acțiuni, în loc să sărim la nesfârșit.
   Fără rețea: așteptăm revenirea conexiunii, nu consumăm programul.
   ===================================================================== */
const BAD_MS = 864e5, CHAIN_MAX = 5, LOG_MAX = 60;
S.errChain = 0; S.badRun = 0; S.halted = false; S.qCap = 0; S.clean = 0; S.waitOnline = false;

/* ---- jurnal local (max 60 de intrări, în localStorage) ---- */
function errLog(){ const a = store.get("errLog", []); return Array.isArray(a) ? a : []; }
function logErr(it, kind, code){
  try{
    const cn = navigator.connection || {};
    const a = errLog(); a.push({t:new Date().toISOString(), host:it?._h || it?.v?.host || "", id:it?.v?.id || it?.key || "", kind, code:code ?? null,
      res:it?._cands?.[it._ci]?.res ?? null, mode:PL.mode, net:cn.effectiveType || "", online:navigator.onLine, ver:BUILD.version || ""});
    store.set("errLog", a.slice(-LOG_MAX));
  }catch(e){ /* stocare indisponibilă */ }
}
function errLogRow(){ const n = errLog().length; return `<div class="grp">${esc(t("logGrp"))}</div><div class="scr"><button class="btn" id="goLog">${esc(t("logRow", {n}))}</button><p class="hintp">${esc(t("logHint"))}</p></div>`; }
$("#lbody").addEventListener("click", async e => {
  if (!e.target.closest("#goLog")) return;
  const a = errLog(); if (!a.length){ toast(t("logEmpty"), 2600); return; }
  toast(t((await copyText(JSON.stringify(a, null, 1))) ? "logCopied" : "logEmpty"), 3200);
});

/* ---- clipuri „stricate” (24 h) ---- */
const vidKey = it => (it?._h || it?.v?.host || "") + "/" + (it?.v?.id || it?.key || "");
function isBadVid(it){ if (!it?.v) return false; const m = store.get("badVids", {}); const t0 = m && m[vidKey(it)]; return !!t0 && Date.now() - t0 < BAD_MS; }
function markBad(it){
  if (!it?.v) return;
  const m = store.get("badVids", {}) || {}, now = Date.now();
  for (const k of Object.keys(m)) if (now - m[k] > BAD_MS) delete m[k];
  m[vidKey(it)] = now; store.set("badVids", m);
}
function resetItemErr(it){ it._again = 0; it._tries = 0; it._embTried = 0; it._hostTried = 0; it._h = null; }

/* ---- bara de erori cu acțiuni ---- */
let errTimer = 0;
function showErr(msg, sticky){
  if (KIOSK) return;
  $("#errmsg").textContent = msg; $("#errbar").hidden = false; clearTimeout(errTimer);
  if (!sticky) errTimer = setTimeout(hideErr, 7000);
}
function hideErr(){ clearTimeout(errTimer); const b = $("#errbar"); if (b) b.hidden = true; }
const errWhy = (kind, code) => kind === "stall" ? t("errStall") : code === 2 ? t("errNet") : code === 3 ? t("errDecode") : code === 4 ? t("errSrc") : code === 1 ? t("errAbort") : t("errSrc");
const resLbl = c => c && c.res ? c.res + "p" : "HLS";

/* ---- altă instanță PeerTube pentru aceeași înregistrare ---- */
async function videoFromAltHost(it){
  if (!it?.v || it._hostTried) return null; it._hostTried = 1;
  const hosts = [...new Set([VN_HOST, ...P.sources.map(s => s.host)])].filter(h => h !== it.v.host && okHost(h)).slice(0, 3);
  for (const h of hosts){
    try{ const info = await getVideo({host:h, id:it.v.id}); if (info && (info.files?.length || info.streamingPlaylists?.length)) return {info, host:h}; }catch(e){ /* următoarea */ }
  }
  return null;
}

/* ---- reluarea clipului curent, de unde a rămas ---- */
function resumeAt(pos){ return S.live ? liveOffset(S.idx) : pos; }
function retryAt(it, ci, why){
  const c = it._cands[ci]; if (!c) return false;
  it._ci = ci; const pos = resumeAt(curTime());
  showErr(`${why} → ${resLbl(c)}`);
  V.removeAttribute("src"); try{ V.load(); }catch(e){ /* ignorat */ }
  playDirect(it, c.url, pos);
  return true;
}
function waitOnlinePlay(it){
  S.waitOnline = true; S._pos = curTime(); $("#spin").classList.add("show");
  showErr(t("errOffline"), true); logErr(it, "offline");
}
addEventListener("online", () => {
  if (!S.waitOnline) return; S.waitOnline = false; hideErr();
  const it = S.items[S.idx]; if (it){ resetItemErr(it); play(S.idx, {offset: S.live ? undefined : S._pos}); }
});

async function directFail(kind, code){
  const it = S.items[S.idx]; if (!it || PL.mode !== "direct") return;
  const tok = S.playTok; clearTimeout(stallTimer);
  logErr(it, kind, code);
  if (navigator.onLine === false){ waitOnlinePlay(it); return; }
  const why = errWhy(kind, code);
  if (kind === "error" && code === 2 && !it._again){ it._again = 1; if (retryAt(it, it._ci, why)) return; }      // 1) aceeași sursă
  if (kind === "stall"){ const c = it._cands?.[it._ci]; if (c && c.res){ S.qCap = Math.max(240, nextLowerRes(it, c.res)); S.clean = 0; } }
  if (it._cands && it._ci + 1 < it._cands.length && it._tries < 4){                                                 // 2) altă calitate/alt fișier
    it._tries++; if (retryAt(it, it._ci + 1, why)) return;
  }
  if (!it._embTried && P.net !== "direct" && !S.p2pBroken && !p2pRecentlyBad() && it.v){                            // 3) playerul P2P
    it._embTried = 1; showErr(`${why} → P2P`); playEmbed(it, resumeAt(curTime())); return;
  }
  const alt = await videoFromAltHost(it); if (tok !== S.playTok) return;                                            // 4) altă instanță
  if (alt){
    it._h = alt.host; it._cands = srcList(alt.info); it._ci = 0; it._tries = 0; it._again = 0;
    if (it._cands.length && retryAt(it, 0, `${why} → ${alt.host}`)) return;
  }
  markBad(it); logErr(it, "giveup");                                                                               // 5) renunțăm la clip
  if (++S.errChain >= CHAIN_MAX){ S.halted = true; $("#spin").classList.remove("show"); showErr(t("errChain"), true); return; }
  showErr(`${why} → ${t("errBtnSkip").toLowerCase()}`);
  setTimeout(() => { if (tok === S.playTok) next(true); }, 900);
}
function nextLowerRes(it, res){ const l = (it._cands || []).map(c => c.res).filter(r => r && r < res).sort((a, b) => b - a); return l[0] || res; }
function clipEnded(){                                                    // clip terminat fără probleme: după 4 la rând relaxăm plafonul de calitate
  const it = S.items[S.idx]; if (it && !it._tries && ++S.clean >= 4 && S.qCap){ S.qCap = 0; S.clean = 0; }
}

/* ---- preîncărcarea clipului următor (doar metadate): încălzește conexiunea și arată din timp dacă fișierul e stricat ---- */
const PRE = document.createElement("video"); PRE.preload = "metadata"; PRE.muted = true; PRE.setAttribute("playsinline", "");
function preloadNext(nx, info){
  try{
    if (netMode() !== "direct" || slowNet() || ecoOn()){ PRE.removeAttribute("src"); return; }
    const l = srcList(info); if (!l.length) return;
    nx._preBad = 0; PRE.onerror = () => { nx._preBad = 1; logErr(nx, "pre", PRE.error && PRE.error.code); };
    PRE.src = l[0].url;
  }catch(e){ /* ignorat */ }
}

/* ---- acțiunile din bara de erori ---- */
$("#eLow").onclick = () => { P.quality = "480"; savePrefs(); S.halted = false; S.errChain = 0; hideErr(); const it = S.items[S.idx]; if (it) resetItemErr(it); play(S.idx, {offset: resumeAt(curTime())}); };
$("#eEng").onclick = () => { P.net = PL.mode === "direct" ? "p2p" : "direct"; S.p2pBroken = false; savePrefs(); S.halted = false; S.errChain = 0; hideErr(); const it = S.items[S.idx]; if (it) resetItemErr(it); play(S.idx, {offset: resumeAt(curTime())}); };
$("#eRetry").onclick = () => { S.halted = false; S.errChain = 0; hideErr(); const it = S.items[S.idx]; if (it) resetItemErr(it); play(S.idx, {offset: resumeAt(curTime())}); };
$("#eSkip").onclick = () => { hideErr(); next(); };
