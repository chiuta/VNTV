/* =====================================================================
   Comenzi: butoane, atingere și gesturi, tastatură și telecomandă
   ===================================================================== */
function syncPlay(){ $("#bplay").innerHTML = icon(isPaused() ? "play" : "pause"); if (isPaused() && S.started) showUI(true); else kickUI(); }
function syncVol(){
  const m = PL.mode === "p2p" ? P.muted : (V.muted || V.volume === 0);
  $("#bmute").innerHTML = icon(m ? "mute" : "vol");
  const v = m ? 0 : Math.round((PL.mode === "p2p" ? P.vol : V.volume) * 100);
  $("#vol").value = v; $("#vol").style.setProperty("--p", v + "%");
}
function toggleMute(){ setMuted(!(PL.mode === "p2p" ? P.muted : V.muted)); }
function toggleFull(auto){
  const d = document;
  if (!CAN_FS){                               // iPhone: paginile nu pot intra pe ecran complet
    if (!STANDALONE){ const n = store.get("a2hsN", 0); if (!auto || n < 2){ toast(t("a2hs"), 6000); store.set("a2hsN", n + 1); } }
    return;
  }
  if (!d.fullscreenElement && !d.webkitFullscreenElement){
    const el = d.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rq) Promise.resolve(rq.call(el, {navigationUI:"hide"})).then(() => { if (TOUCH && isPhone()) screen.orientation?.lock?.("landscape").catch(() => {}); }).catch(() => {});
  } else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
}
function togglePip(){
  if (PL.mode !== "direct") return;
  try{
    if (document.pictureInPictureElement) return document.exitPictureInPicture();
    if (V.requestPictureInPicture) return V.requestPictureInPicture().catch(() => {});
    if (V.webkitSetPresentationMode) V.webkitSetPresentationMode(V.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
  }catch(e){}
}
let castInit = false;
function setupCast(){
  if (castInit) return; castInit = true;
  const b = $("#bcast");
  if (window.WebKitPlaybackTargetAvailabilityEvent){
    V.addEventListener("webkitplaybacktargetavailabilitychanged", e => { b.hidden = e.availability !== "available" || PL.mode !== "direct"; });
  } else if (V.remote?.watchAvailability){
    V.remote.watchAvailability(a => { b.hidden = !a || PL.mode !== "direct"; }).catch(() => { b.hidden = !IS_ANDROID || PL.mode !== "direct"; });
  }
}
function cast(){
  if (PL.mode !== "direct") return;
  if (V.webkitShowPlaybackTargetPicker) return V.webkitShowPlaybackTargetPicker();
  if (V.remote?.prompt) V.remote.prompt().catch(e => { if (e.name !== "AbortError") toast(t("noCast")); });
}
function ripple(side){ const r = $(side === "l" ? "#ripL" : "#ripR"); r.classList.remove("go"); void r.offsetWidth; r.classList.add("go"); }

$("#seek").addEventListener("input", e => { seeking = true; const p = e.target.value / 10; e.target.style.setProperty("--p", p + "%");
  if (curDur()) $("#tcur").textContent = fmt(curDur() * p / 100); });
$("#seek").addEventListener("change", e => { if (curDur()){ leaveLive(); seekTo(curDur() * e.target.value / 1000); } seeking = false; });
$("#vol").addEventListener("input", e => { const v = e.target.value / 100; P.vol = v || P.vol; savePrefs();
  if (PL.mode === "p2p"){ P.muted = v === 0; embCall("setVolume", v); syncVol(); } else { V.volume = v; V.muted = v === 0; P.muted = V.muted; } });
$("#bplay").onclick = togglePlay; $("#bnext").onclick = () => next(); $("#bprev").onclick = prev; $("#bmute").onclick = toggleMute;
$("#bfull").onclick = () => toggleFull(); $("#bpip").onclick = togglePip; $("#bcast").onclick = cast; $("#bscreen").onclick = () => openPanel("screen");
$("#bguide").onclick = () => openPanel("guide"); $("#blayers").onclick = () => openPanel("layers"); $("#bbrowse").onclick = () => openPanel("browse");
$("#binfo").onclick = () => openPanel("info"); $("#bfav").onclick = () => toggleFav(); $("#bsubs").onclick = () => toggleSubs(); $("#bshare").onclick = () => shareItem();
$("#chup").onclick = () => switchChannel(S.chIdx + (S.search ? 0 : 1)); $("#chdn").onclick = () => switchChannel(S.chIdx - (S.search ? 0 : 1));
$("#upnext").onclick = () => next(); $("#blive").onclick = backToLive;
$("#unmute").onclick = () => setMuted(false);

/* ---- ascunderea automată a interfeței ---- */
let uiTimer = 0;
function showUI(stay){ if (KIOSK) return; document.body.classList.add("ui"); clearTimeout(uiTimer); if (!stay) uiTimer = setTimeout(hideUI, TOUCH ? 4500 : 3200); }
function hideUI(){ if (anyPanel() || (isPaused() && S.started && PL.started) || !S.started) return; document.body.classList.remove("ui"); }
function kickUI(){ showUI(false); }
document.addEventListener("mousemove", kickUI, {passive:true});

/* ---- atingere: atingere = comenzi, dublă atingere laterală = ±10 s, glisare = clip / canal ---- */
let tStart = null, lastTap = null, tapTimer = 0;
const app = $("#app");
// containerul are overflow:hidden, dar focalizarea unui element dintr-un panou ascuns îl poate derula; îl ținem mereu fix
function resetAppScroll(){ if (app.scrollLeft || app.scrollTop){ app.scrollLeft = 0; app.scrollTop = 0; } }
app.addEventListener("scroll", resetAppScroll);
addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); });
app.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") tStart = {x:e.clientX, y:e.clientY, tg:e.target}; }, {passive:true});
app.addEventListener("pointerup", e => {
  if (!tStart || !S.started || KIOSK){ tStart = null; return; }
  const dx = e.clientX - tStart.x, dy = e.clientY - tStart.y, tg = tStart.tg; tStart = null;
  if (tg.closest("#ctl,.panel,#upnext,#unmute,#splash")) return;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)){ dx < 0 ? next() : prev(); return; }
  if (Math.abs(dy) > 70){ switchChannel(dy < 0 ? S.chIdx + 1 : S.chIdx - 1); return; }
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12){
    const now = Date.now(), x = e.clientX, side = x < innerWidth * .35 ? "l" : x > innerWidth * .65 ? "r" : null;
    const toggle = () => document.body.classList.contains("ui") ? (clearTimeout(uiTimer), hideUI()) : kickUI();
    if (side && lastTap && lastTap.side === side && now - lastTap.t < 320){ clearTimeout(tapTimer); lastTap = {t:now, side}; seekBy(side === "l" ? -10 : 10); ripple(side); return; }
    lastTap = {t:now, side};
    if (side){ clearTimeout(tapTimer); tapTimer = setTimeout(toggle, 280); } else toggle();
  }
});
app.addEventListener("click", e => {
  if (e.pointerType && e.pointerType !== "mouse") return;
  if (!S.started || KIOSK || e.target.closest("#ctl,.panel,#upnext,#unmute,#splash,button,a,input")) return;
  if (anyPanel()) closePanels(); else togglePlay();
});
app.addEventListener("dblclick", e => { if (!TOUCH && !KIOSK && !e.target.closest("#ctl,.panel,#splash")) toggleFull(); });

/* ---- tastatură și telecomandă ---- */
let digits = "", digitTimer = 0, kioskKeys = [];
document.addEventListener("keydown", e => {
  if (KIOSK){  // în chioșc: doar M (sunet) și secvența K-K-K pentru a ieși
    if (e.key === "m" || e.key === "M") toggleMute();
    kioskKeys = [...kioskKeys, e.key.toLowerCase()].slice(-3);
    if (kioskKeys.join("") === "kkk"){ location.search = ""; }
    return;
  }
  if (!S.started){ if ((e.key === "Enter" || e.key === " ") && !e.target.closest("button,a,input")){ e.preventDefault(); start(); } return; }
  if (e.target.matches("input[type=search],input[type=text]")){ if (e.key === "Escape") e.target.blur(); return; }
  const k = e.key;
  if (/^[0-9]$/.test(k) && !anyPanel()){
    digits += k; clearTimeout(digitTimer);
    $("#osdn").textContent = digits.padStart(2, "–"); $("#osdnm").textContent = ""; $("#osd").classList.add("show");
    digitTimer = setTimeout(() => { const n = parseInt(digits, 10); digits = ""; if (n >= 1 && n <= channelList().length) switchChannel(n - 1); else $("#osd").classList.remove("show"); }, 900);
    return;
  }
  const inPanel = anyPanel();
  switch (k){
    case " ": case "k": case "K": case "MediaPlayPause": if (inPanel && e.target.closest?.(".panel")) return; e.preventDefault(); togglePlay(); break;
    case "ArrowRight": case "ArrowLeft": case "ArrowUp": case "ArrowDown":
      if (inPanel){ e.preventDefault(); panelNav(k); return; }
      e.preventDefault();
      if (e.shiftKey && (k === "ArrowRight" || k === "ArrowLeft")){ seekBy(k === "ArrowRight" ? 10 : -10); ripple(k === "ArrowRight" ? "r" : "l"); break; }
      if (k === "ArrowRight") next(); else if (k === "ArrowLeft") prev(); else switchChannel(k === "ArrowUp" ? S.chIdx + 1 : S.chIdx - 1);
      break;
    case "MediaTrackNext": case "l": case "L": if (inPanel) return; next(); break;
    case "MediaTrackPrevious": case "j": case "J": if (inPanel) return; prev(); break;
    case "ChannelUp": case "PageUp": if (inPanel) return; e.preventDefault(); switchChannel(S.chIdx + 1); break;
    case "ChannelDown": case "PageDown": if (inPanel) return; e.preventDefault(); switchChannel(S.chIdx - 1); break;
    case "c": case "C": if (!$("#bcast").hidden) cast(); break;
    case "t": case "T": toggleSubs(); break;
    case "e": case "E": shareItem(); break;
    case "p": case "P": if (CAN_PIP) togglePip(); break;
    case "m": case "M": toggleMute(); break;
    case "f": case "F": toggleFull(); break;
    case "g": case "G": case "ContextMenu": openPanel("guide"); break;
    case "b": case "B": openPanel("browse"); break;
    case "w": case "W": openLib(); break;
    case "o": case "O": openPanel("layers"); break;
    case "i": case "I": openPanel("info"); break;
    case "s": case "S": toggleFav(); break;
    case "v": case "V": if (!$("#blive").hidden) backToLive(); break;
    case "h": case "H": {
      const isClean = OVERLAYS.filter(x => x.k && x.k !== "ambient" && x.k !== "subs").every(x => !O[x.k]);
      if (isClean){ Object.assign(O, store.get("ovBeforeClean", PRESETS.tv.o)); toast(t("layersBack")); }
      else { store.set("ovBeforeClean", {...O}); Object.assign(O, PRESETS.clean.o); toast(t("cleanOn")); }
      applyOverlays(); if (isOpen("layers")) renderLayers(); break; }
    case "Escape": case "Backspace": case "BrowserBack": case "GoBack":
      if (inPanel){ e.preventDefault(); if (!$("#bdet").hidden) $("#bdet").hidden = true; else closePanels(); } break;
    case "Enter": if (!inPanel){ showLower(S.items[S.idx]); kickUI(); } break;
    default: return;
  }
  kickUI();
});
