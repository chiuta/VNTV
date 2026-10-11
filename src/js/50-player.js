/* =====================================================================
   Redare: două motoare
   - „direct”: <video> cu fișierul MP4 (necesar pentru imagine în imagine, AirPlay, Chromecast, iOS)
   - „p2p”: playerul PeerTube încorporat, cu partajare între spectatori (reduce traficul serverului TROM),
            comandat prin protocolul API-ului de încorporare PeerTube (jschannel peste postMessage)
   ===================================================================== */
const PL = { mode:"direct", pos:0, dur:0, paused:false, lastUpd:0 };
const frame = $("#frame");
function onWifi(){ const c = navigator.connection; return !!(c && (c.type === "wifi" || c.type === "ethernet")); }
function netMode(){
  if (S.p2pBroken) return "direct";                  // playerul PeerTube nu a răspuns: redare directă până la reîncărcare
  if (P.net === "direct" || P.net === "p2p") return P.net;
  if (IS_IOS) return "direct";                       // iOS: imagine în imagine și AirPlay cer redare directă
  return (!TOUCH || onWifi()) ? "p2p" : "direct";    // automat: P2P pe calculator/TV și pe telefoanele Android conectate la Wi-Fi
}

/* ---- API-ul playerului PeerTube încorporat ---- */
const EMB = { win:null, ready:false, id:1, q:[], ping:0 };
function embPost(m){ try{ EMB.win && EMB.win.postMessage(JSON.stringify(m), "*"); }catch(e){} }
function embCall(method, params){ const m = {id:EMB.id++, method:"peertube::" + method, params}; if (EMB.ready) embPost(m); else EMB.q.push(m); }
function embReset(){
  EMB.win = frame.contentWindow; EMB.ready = false; EMB.q = [];
  clearInterval(EMB.ping);
  let n = 0;
  EMB.ping = setInterval(() => { if (EMB.ready || ++n > 40){ clearInterval(EMB.ping); return; } embPost({method:"peertube::__ready", params:"ping"}); }, 500);
}
addEventListener("message", e => {
  if (!EMB.win || e.source !== EMB.win) return;
  let m; try{ m = typeof e.data === "string" ? JSON.parse(e.data) : e.data; }catch(err){ return; }
  if (!m || typeof m !== "object" || typeof m.method !== "string") return;
  const meth = m.method.replace(/^peertube::/, "");
  if (meth === "__ready"){
    if (m.params === "ping") embPost({method:"peertube::__ready", params:"pong"});
    if (!EMB.ready){ EMB.ready = true; EMB.q.splice(0).forEach(embPost); if (P.muted) embCall("setVolume", 0); }
    return;
  }
  if (meth === "playbackStatusUpdate" && m.params) onEmbStatus(m.params);
  else if (meth === "playbackStatusChange") onEmbStatus({playbackState:m.params});
});
function onEmbStatus(st){
  if (PL.mode !== "p2p") return;
  PL.lastUpd = Date.now();
  if (typeof st.position === "number") PL.pos = st.position;
  if (typeof st.duration === "number" && st.duration > 0) PL.dur = st.duration;
  if (st.playbackState === "playing"){ if (PL.paused || !PL.started){ PL.paused = false; onPlaying(); } }
  else if (st.playbackState === "paused"){ PL.paused = true; syncPlay(); }
  else if (st.playbackState === "ended"){ next(true); return; }
  onTime(PL.pos, PL.dur);
  armFallback(Math.max(0, PL.dur - PL.pos) + 8);
}

/* ---- comenzi comune ---- */
const curTime = () => PL.mode === "p2p" ? PL.pos : V.currentTime || 0;
const curDur = () => PL.mode === "p2p" ? PL.dur : (isFinite(V.duration) ? V.duration : 0);
const isPaused = () => PL.mode === "p2p" ? PL.paused : V.paused;
function seekTo(s){
  s = Math.max(0, Math.min(curDur() - .3, s));
  if (PL.mode === "p2p"){ embCall("seek", s); PL.pos = s; } else if (V.duration) V.currentTime = s;
}
function seekBy(d){ leaveLive(); seekTo(curTime() + d); }
function setMuted(m){
  P.muted = m; savePrefs();
  if (PL.mode === "p2p") embCall("setVolume", m ? 0 : P.vol || 1);
  else { V.muted = m; if (!m && V.volume === 0) V.volume = .8; }
  $("#unmute").classList.remove("show"); syncVol();
}
function togglePlay(){
  if (PL.mode === "p2p"){ if (PL.paused){ S.userPaused = false; embCall("play"); PL.paused = false; } else { S.userPaused = true; embCall("pause"); PL.paused = true; leaveLive(); } syncPlay(); return; }
  if (!V.getAttribute("src")) return;
  if (V.paused){ S.userPaused = false; V.play().catch(() => {}); } else { S.userPaused = true; V.pause(); leaveLive(); }
}

/* ---- redarea unui titlu ---- */
let fallbackTimer = 0, stallTimer = 0;
function armFallback(sec){ clearTimeout(fallbackTimer); fallbackTimer = setTimeout(() => next(true), sec * 1000); }
async function play(i, opt = {}){
  if (!S.items.length){ if (S.pager) await loadMore(); if (!S.items.length){ toast(t("noTr"), 3500); return; } }
  if (i >= S.items.length){
    if (S.pager && S.pager.more){ await loadMore(); }
    if (i >= S.items.length){
      if (S.live){ const r = await tune(); if (r) return play(0, {offset:r.offset}); return; }
      i = 0;
    }
  }
  if (i < 0) i = S.items.length - 1;
  if (S.live && opt.offset === undefined){ i = liveCatchUp(i); }
  const offset = opt.offset ?? (S.live ? liveOffset(i) : 0);
  S.idx = i; const it = S.items[i]; const tok = ++S.playTok; S.clipCount++;
  if (S.pager && S.items.length - i < 5) loadMore();
  clearTimeout(fallbackTimer); clearTimeout(stallTimer);
  hideUpNext(); hideLower(); subsReset();
  transition(S.clipCount > 1 && O.idents ? "ident" : "static");
  V.style.opacity = 0; $("#spin").classList.add("show");
  updateNow(it); renderQueue(); renderTicker(); requestTr();
  if (isOpen("info")) renderInfo();

  let info = null;
  try{ info = await getVideo(it.v); }catch(e){}
  if (tok !== S.playTok) return;
  if (info){
    it.dur = info.duration || it.dur; it.preview = ptImage(info, it.v.host) || it.img;
    if (it.src === "pt" && !it.desc) it.desc = info.description || it.ex;
  }
  if (it.preview || it.img) $("#ambient").style.backgroundImage = `url("${cssUrl(it.preview || it.img)}")`;
  loadSubs(it);
  if (!it.desc) ensureDesc(it).then(() => { if (tok === S.playTok){ requestTr(); if (isOpen("info")) renderInfo(); } });

  const src = info && pickSrc(info);
  it._src = src || null;
  const mode = netMode();
  if (mode === "p2p" || !src) playEmbed(it, offset);
  else playDirect(it, src, offset);
  mediaSession(it);
  const nx = S.items[i + 1];
  if (nx) getVideo(nx.v).then(v => { nx.preview = ptImage(v, nx.v.host) || nx.img; nx.dur = v.duration || nx.dur; }).catch(() => {});
}
function playDirect(it, src, offset){
  PL.mode = "direct"; PL.started = false;
  if (frame.style.display === "block"){ frame.style.display = "none"; frame.removeAttribute("src"); EMB.win = null; }
  document.body.classList.remove("p2p");
  V.style.display = "";
  if (V.getAttribute("src") !== src){ V.src = src; }
  V._offset = offset > 1 ? offset : 0;
  V.volume = P.vol; V.muted = P.muted;
  if (V._offset && V.readyState >= 1){ V.currentTime = V._offset; V._offset = 0; }
  const pr = V.play();
  if (pr) pr.catch(() => { V.muted = true; V.play().catch(() => {}); $("#unmute").classList.add("show"); });
  if (!V.paused && V.readyState > 2) onPlaying();
  $("#bpip").hidden = !CAN_PIP;
}
function playEmbed(it, offset){
  PL.mode = "p2p"; PL.pos = offset; PL.dur = it.dur || 0; PL.paused = false; PL.started = false;
  V.pause(); V.removeAttribute("src"); V.load(); V.style.display = "none";
  document.body.classList.add("p2p");
  const q = new URLSearchParams({api:"1", autoplay:"1", controls:"0", controlBar:"0", title:"0", warningTitle:"0", peertubeLink:"0",
    p2p:"1", muted:P.muted ? "1" : "0", loop:"0"});
  if (offset > 1) q.set("start", String(Math.floor(offset)));
  frame.style.display = "block";
  frame.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");   // atributul se pune doar când se folosește playerul PeerTube
  frame.src = `https://${it.v.host}/videos/embed/${encodeURIComponent(it.v.id)}?${q}`;
  frame.onload = () => { embReset(); $("#spin").classList.remove("show"); setTimeout(() => { if (!PL.started) onPlaying(); }, 1500); };
  // dacă API-ul playerului nu răspunde în 10 s, trecem la redarea directă (fără bară de progres nu merită riscul)
  const tok = S.playTok;
  setTimeout(() => {
    if (tok !== S.playTok || PL.mode !== "p2p" || EMB.ready || !it._src) return;
    S.p2pBroken = true; toast(t("p2pFallback"), 4500);
    play(S.idx, {offset: S.live ? undefined : PL.pos});
  }, 10000);
  armFallback(Math.max(20, (it.dur || 150) - offset + 10));
  $("#bpip").hidden = true; $("#bcast").hidden = true;
}
function onPlaying(){
  PL.started = true;
  clearTimeout(stallTimer); $("#spin").classList.remove("show"); V.style.opacity = 1;
  if (!S._lowerShown){ S._lowerShown = true; setTimeout(() => showLower(S.items[S.idx]), 700); }
  syncPlay();
}
function next(auto){
  if (auto){ if (S._adv === S.playTok) return; S._adv = S.playTok; }
  else leaveLive();
  S._lowerShown = false;
  return play(S.idx + 1, auto && S.live ? {} : {offset:0});
}
function prev(){
  if (curTime() > 5){ leaveLive(); seekTo(0); return; }
  leaveLive(); S._lowerShown = false; play(S.idx - 1, {offset:0});
}
function playItemNow(it){
  leaveLive();
  const i = S.idx + 1;
  S.items.splice(i, 0, {...it});
  S._lowerShown = false;
  play(i, {offset:0});
}

/* ---- evenimentele elementului <video> ---- */
V.addEventListener("loadedmetadata", () => { if (V._offset){ try{ V.currentTime = V._offset; }catch(e){} V._offset = 0; } setupCast(); });
V.addEventListener("playing", onPlaying);
V.addEventListener("loadstart", () => { S._lowerShown = false; });
V.addEventListener("waiting", () => {
  if (PL.mode !== "direct") return;
  $("#spin").classList.add("show"); clearTimeout(stallTimer);
  stallTimer = setTimeout(() => { toast(t("slow")); next(true); }, 20000);
});
V.addEventListener("ended", () => { if (PL.mode === "direct") next(true); });
V.addEventListener("error", () => { if (PL.mode !== "direct" || !V.getAttribute("src")) return; toast(t("unavail")); setTimeout(() => next(true), 900); });
V.addEventListener("pause", syncPlay);
V.addEventListener("volumechange", syncVol);
V.addEventListener("timeupdate", () => { if (PL.mode === "direct") onTime(V.currentTime || 0, isFinite(V.duration) ? V.duration : 0); });

let seeking = false;
function onTime(c, d){
  const p = d ? c / d * 100 : 0;
  $("#bari").style.width = p + "%";
  if (!seeking){ $("#seek").value = Math.round(p * 10); $("#seek").style.setProperty("--p", p + "%"); }
  $("#tcur").textContent = fmt(c); $("#tdur").textContent = fmt(d);
  const left = d - c;
  if (d && left < 11 && left > 0.5) showUpNext(Math.ceil(left)); else hideUpNext();
  subsAt(c);
}
