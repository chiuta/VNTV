/* =====================================================================
   Pornire, ecran aprins, mod chioșc, lucrul offline, pictograma aplicației
   ===================================================================== */
async function keepAwake(){ try{ if ("wakeLock" in navigator && document.visibilityState === "visible") S.wake = await navigator.wakeLock.request("screen"); }catch(e){} }
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !S.started) return;
  keepAwake();
  if (PL.mode === "direct" && V.paused && !S.userPaused && V.getAttribute("src")) V.play().catch(() => {});
  if (S.live && S.items[S.idx]){ const i = liveCatchUp(S.idx); if (i !== S.idx) play(i); }   // după o pauză lungă, revino la ce rulează acum
});

async function start(opts = {}){
  if (S.started) return; S.started = true;
  // iOS/Android: primul play() pornește direct din atingere, ca să meargă și sunetul
  if (S.firstSrc && netMode() === "direct" && !V.getAttribute("src") && !opts.noplay){ V.src = S.firstSrc; V.volume = P.vol; V.muted = P.muted; V.play().catch(() => {}); }
  $("#splash").classList.add("hide");
  if (!KIOSK && (TOUCH || innerWidth < 900) && !opts.noplay) toggleFull(true);
  setTimeout(() => $("#rotate").classList.add("gone"), 7000);
  reTranslate(true);
  keepAwake(); applyOverlays(); syncVol(); syncFav(); updateLiveUI();
  if (!KIOSK && !P.p2pAck && netMode() === "p2p") setTimeout(() => { $("#p2pnote").hidden = false; }, 2500);
  if (opts.noplay) return;
  osd(); noise(500);
  await S.ready;
  const opened = !KIOSK && await openDeepLink(true);       // link cu ancoră (#v=…): deschide direct acel video
  if (opened){ /* playItemNow a pornit deja videoul */ }
  else if (S.items.length) play(0, {offset:S.firstOffset || 0}); else switchChannel(S.chIdx);
  if (!opts.keepPanel) kickUI();
}
$("#go").onclick = () => start();
$("#p2pKeep").onclick = () => { P.p2pAck = true; savePrefs(); $("#p2pnote").hidden = true; };
$("#p2pDirect").onclick = () => { P.net = "direct"; P.p2pAck = true; savePrefs(); $("#p2pnote").hidden = true;
  if (S.items[S.idx]) play(S.idx, {offset: S.live ? undefined : curTime()}); if (isOpen("layers")) renderLayers(); };
$("#gobrowse").onclick = () => { openPanel("browse"); start({keepPanel:true}); };   // canalul pornește în spatele panoului de răsfoire

/* ---- avertisment dacă browserul raportează că nu are rețea (VNTV nu are conținut offline) ---- */
function syncOffNote(){ $("#offnote").hidden = navigator.onLine !== false; }
addEventListener("online", syncOffNote); addEventListener("offline", syncOffNote); syncOffNote();

/* ---- inițializare ---- */
applyPlatform(); applyOverlays(); applyLang(); syncPlay(); syncVol(); syncFav(); pickEngine(false);
V.volume = P.vol; V.muted = P.muted;
$("#bpip").hidden = !CAN_PIP;
if (!CAN_FS && STANDALONE) $("#bfull").hidden = true;
async function bootCatalog(){
  if (navigator.onLine === false){   // fără rețea: nu încerca cereri care oricum eșuează; reîncearcă la „online”
    S.netFail = true;
    const l0 = channelList(); S.chIdx = Math.min(Math.max(0, P.ch), l0.length - 1); S.ch = l0[S.chIdx]; renderChannels();
    return;
  }
  S.netFail = false; $("#neterr").hidden = true;
  await loadIndex();
  const list = channelList();
  S.chIdx = Math.min(Math.max(0, P.ch), list.length - 1); S.ch = list[S.chIdx];
  const r = await tune();
  S.firstOffset = r ? r.offset : 0;
  renderChannels(); if (isOpen("layers")) renderLayers();
  const f = S.items[0];
  if (f) getVideo(f.v).then(v => { S.firstSrc = pickSrc(v); f.dur = v.duration || f.dur; f.preview = ptImage(v, f.v.host) || f.img; }).catch(() => {});
}
S.ready = bootCatalog();
addEventListener("online", () => { if (S.netFail && !S.items.length){ const was = S.started; S.ready = bootCatalog(); if (was) S.ready.then(() => { if (!S.items.length) switchChannel(S.chIdx); else play(0, {offset:S.firstOffset || 0}); }); } });

/* ---- mod chioșc: ?kiosk=1 (&ch=3&lang=ro&preset=cinema&muted=0&reload=24) ---- */
if (KIOSK){
  document.body.classList.remove("ui");
  S.ready.then(() => start());
  const hrs = parseFloat(QS.get("reload") || "24");
  if (hrs > 0) setTimeout(() => location.reload(), hrs * 3600e3);
  if (P.muted) $("#unmute").classList.add("show");
}

/* ---- lucru offline și instalare (doar când e găzduit pe HTTPS, cu sw.js alături) ---- */
if (BUILD.target === "hosted" && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

/* ---- pictograma aplicației generată la rulare (varianta într-un singur fișier) ---- */
function makeIcons(){
  if (BUILD.target === "hosted") return;
  try{
    const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d");
    const g = x.createRadialGradient(256, 200, 20, 256, 256, 360); g.addColorStop(0, "#10261f"); g.addColorStop(1, "#000");
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const rr = (X, Y, W, H, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); };
    const X0 = 56, Y0 = 176, W = 400, H = 160, half = 200;
    const gr = x.createLinearGradient(X0 + half, Y0, X0 + W, Y0 + H); gr.addColorStop(0, "#4fd1a5"); gr.addColorStop(1, "#3aa0ff");
    x.save(); rr(X0, Y0, W, H, 34); x.clip(); x.fillStyle = gr; x.fillRect(X0 + half, Y0, W - half, H); x.restore();
    x.lineWidth = 12; x.strokeStyle = "#fff"; x.beginPath();
    x.moveTo(X0 + half, Y0 + 6); x.lineTo(X0 + 34, Y0 + 6); x.arcTo(X0 + 6, Y0 + 6, X0 + 6, Y0 + 34, 28); x.lineTo(X0 + 6, Y0 + H - 34);
    x.arcTo(X0 + 6, Y0 + H - 6, X0 + 34, Y0 + H - 6, 28); x.lineTo(X0 + half, Y0 + H - 6); x.stroke();
    x.font = "700 118px VNTVDisplay, 'Arial Narrow', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "#fff"; x.fillText("VN", X0 + half / 2 + 4, Y0 + H / 2 + 6);
    x.fillStyle = "#04130d"; x.fillText("TV", X0 + half + (W - half) / 2, Y0 + H / 2 + 6);
    const png = c.toDataURL("image/png");
    $("#appleicon").href = png;
  }catch(e){}
}
(document.fonts?.ready || Promise.resolve()).then(makeIcons);
if (!KIOSK) $("#go").focus();
