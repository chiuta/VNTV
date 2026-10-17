/* =====================================================================
   Straturile de pe ecran, tranzițiile, ceasul, sesiunea media
   ===================================================================== */
const cv = $("#static"), cx = cv.getContext("2d"); let staticRAF = 0;
function noise(ms){
  if (document.body.classList.contains("eco")){ cv.style.opacity = .9; cx.fillStyle = "#111"; cx.fillRect(0, 0, cv.width, cv.height); setTimeout(() => cv.style.opacity = 0, Math.min(ms, 200)); return; }
  cancelAnimationFrame(staticRAF); cv.style.opacity = .9; const end = performance.now() + ms;
  const img = cx.createImageData(cv.width, cv.height), d = img.data;
  (function f(now){
    for (let i = 0; i < d.length; i += 4){ const g = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255; }
    cx.putImageData(img, 0, 0);
    if (now < end) staticRAF = requestAnimationFrame(f); else cv.style.opacity = 0;
  })(performance.now());
}
function transition(kind){
  if (kind === "ident"){ const id = $("#ident"); id.classList.remove("show"); void id.offsetWidth; id.classList.add("show"); setTimeout(() => id.classList.remove("show"), 1500); }
  else noise(260);
}

function showLower(it){
  if (!it) return; const el = $("#lower");
  $("#ltag").textContent = catLabel(it);
  $("#ltitle").textContent = tr(it.title);
  const kind = it.kind === "full" ? t("fullVideo") : t("trailer");
  $("#lmeta").innerHTML = [it.year && `<span><b>${esc(it.year)}</b></span>`, it.len && `<span>${esc(fmtLen(it.len))}</span>`,
    it.source && `<span>${esc(t("source"))}: <b>${esc(it.source)}</b></span>`, it.licence && `<span>${esc(it.licence)}</span>`,
    `<span>${esc(kind)}${it.dur ? " · " + fmt(it.dur) : ""}</span>`].filter(Boolean).join("");
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); document.body.classList.toggle("lower-on", !!O.lower);
  clearTimeout(S.lowerTimer); S.lowerTimer = setTimeout(hideLower, 9000);
}
function hideLower(){ $("#lower").classList.remove("show"); document.body.classList.remove("lower-on"); }
function showUpNext(sec){
  const nx = S.items[S.idx + 1]; if (!nx) return;
  $("#untitle").textContent = tr(nx.title); $("#uncount").textContent = t("upNextIn", {s:sec});
  const img = nx.preview || nx.img; $("#unth").style.backgroundImage = img ? `url("${cssUrl(img)}")` : "";
  $("#upnext").classList.add("show");
}
function hideUpNext(){ $("#upnext").classList.remove("show"); }
function renderTicker(){
  const up = S.items.slice(S.idx + 1, S.idx + 13);
  const el = $("#tick");
  if (!up.length){ el.innerHTML = ""; return; }
  const html = up.map(x => {
    const when = S.live && x._start ? `<b class="tt">${clkFmt.format(new Date(x._start))}</b> ` : "";
    return `<span>${when}${esc(tr(x.title))} <em>· ${esc(catLabel(x))}</em></span>`;
  }).join("");
  el.innerHTML = html + html;
  el.style.animationDuration = Math.max(30, up.reduce((a, x) => a + tr(x.title).length, 0) * 0.34) + "s";
}
function updateNow(it){
  const ch = S.search || S.ch, no = chNo();
  $("#nowch").textContent = `CH ${no} · ${chName(ch)}`; $("#nowt").textContent = tr(it.title);
  $("#bugch").textContent = S.search ? t("srchBug") : `CH ${no} · ${chName(ch)}`;
  $("#chno").textContent = S.search ? t("srchShort") : "CH " + no;
  syncFav(); updateLiveUI();
  document.title = `${tr(it.title)} — VNTV`;
}
function updateLiveUI(){
  const l = $("#livelab");
  l.textContent = S.live ? t("live") : t("nonstop");
  l.classList.toggle("off", !S.live);
  l.title = S.live ? t("liveTip") : t("nonstopTip");
  const canLive = S.started && !S.live && !S.search && S.ch && canSync(S.ch) && (DATA.mode === "index" || S.ch.type === "pt");
  $("#blive").hidden = !canLive;
}
function osd(){
  const ch = S.search || S.ch;
  $("#osdn").textContent = S.search ? "🔍" : pad2(S.chIdx + 1); $("#osdnm").textContent = chName(ch);
  const o = $("#osd"); o.classList.add("show"); clearTimeout(osd._t); osd._t = setTimeout(() => o.classList.remove("show"), 2200);
}
function applyOverlays(){
  for (const x of OVERLAYS) if (x.k) document.body.classList.toggle("ov-" + x.k, !!O[x.k]);
  store.set("ov", O);
  if (!O.subs) subsAt(0);
  syncSubsBtn();
}

/* ---- ceas ---- */
let clkFmt = new Intl.DateTimeFormat(L()._loc, {hour:"2-digit", minute:"2-digit"});
function tickClock(){ $("#clk").textContent = clkFmt.format(new Date()); }
setInterval(tickClock, 5000); tickClock();

/* ---- sesiunea media (ecranul de blocare, căști, telecomenzi Bluetooth) ---- */
function mediaSession(it){
  if (!("mediaSession" in navigator) || !it) return;
  try{
    const art = it.preview || it.img;
    navigator.mediaSession.metadata = new MediaMetadata({title:tr(it.title), artist:"VNTV · " + chName(S.search || S.ch), album:"VideoNeat",
      artwork: art ? [{src:art, sizes:"1280x720", type:"image/jpeg"}] : []});
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("play", () => { if (isPaused()) togglePlay(); });
    navigator.mediaSession.setActionHandler("pause", () => { if (!isPaused()) togglePlay(); });
  }catch(e){}
}
