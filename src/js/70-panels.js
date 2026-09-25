/* =====================================================================
   Panouri: ghid TV, straturi & setări, detalii, răsfoire, limbă, favorite
   ===================================================================== */
const isOpen = id => $("#" + id).classList.contains("open");
const anyPanel = () => !!$(".panel.open");
function openPanel(id){
  if (KIOSK) return;
  if (isOpen(id)){ closePanels(); return; }
  $$(".panel.open").forEach(p => p.classList.remove("open"));
  $("#" + id).classList.add("open"); showUI(true);
  if (id === "guide") renderLists(); if (id === "info") renderInfo(); if (id === "layers") renderLayers(); if (id === "browse") openBrowse();
  if (history.state?.vntv !== "panel") try{ history.pushState({vntv:"panel"}, ""); }catch(e){}
  if (!TOUCH) setTimeout(() => { const p = $("#" + id);
    (p.querySelector(".q.now, .ch.on, .bc.on, .tg, .presets button, .btn, button:not(.x)") || p.querySelector(".x"))?.focus({preventScroll:true}); }, 60);
}
function closePanels(fromPop){
  $$(".panel.open").forEach(p => p.classList.remove("open"));
  $("#bdet").hidden = true;
  if (fromPop !== true && history.state?.vntv === "panel") try{ history.back(); }catch(e){}
  kickUI();
}
addEventListener("popstate", () => { if (!$("#bdet").hidden){ $("#bdet").hidden = true; try{ history.pushState({vntv:"panel"}, ""); }catch(e){} return; } if (anyPanel()) closePanels(true); });
$$("[data-close]").forEach(b => b.onclick = () => closePanels());
function panelNav(k){
  const pnl = $(".panel.open"); if (!pnl) return;
  const scope = !$("#bdet").hidden && pnl.id === "browse" ? $("#bdet") : pnl;
  const f = [...scope.querySelectorAll("button, [tabindex='0'], input, a[href]")].filter(e => e.offsetParent !== null && !e.disabled);
  let i = f.indexOf(document.activeElement);
  let step = (k === "ArrowDown" || k === "ArrowRight") ? 1 : -1;
  if (pnl.id === "browse" && scope === pnl && document.activeElement?.classList.contains("card") && (k === "ArrowDown" || k === "ArrowUp")){
    const g = $("#bgrid"), cols = Math.max(1, Math.round(g.clientWidth / (g.firstElementChild?.offsetWidth || 200)));
    step *= cols;
  }
  i = i < 0 ? 0 : Math.max(0, Math.min(f.length - 1, i + step));
  f[i]?.focus({preventScroll:true}); f[i]?.scrollIntoView({block:"nearest", inline:"nearest"}); resetAppScroll();
}

/* ---------- ghid TV ---------- */
function renderLists(){ renderChannels(); renderQueue(); }
function renderChannels(){
  const el = $("#chlist"); el.innerHTML = "";
  channelList().forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "ch" + (!S.search && i === S.chIdx ? " on" : "");
    b.innerHTML = `<span class="no">${pad2(i + 1)}</span><span class="nm">${esc(chName(c))}<small>${esc(chSub(c))}</small></span>`;
    b.onclick = () => switchChannel(i);
    el.appendChild(b);
  });
  if (S.search){
    const b = document.createElement("button"); b.className = "ch on";
    b.innerHTML = `<span class="no">🔍</span><span class="nm">${esc(S.search.q)}<small>${esc(t("searchCh"))}</small></span>`;
    el.prepend(b);
  }
}
function renderQueue(keep){
  if (!isOpen("guide")) return;
  const el = $("#qlist"), st = el.scrollTop;
  if (!S.items.length){ el.innerHTML = `<div class="empty">${S.loading ? t("loadingProg") : t("noTrCh")}</div>`; return; }
  const from = Math.max(0, S.idx - 1), list = S.items.slice(from, from + 60);
  el.innerHTML = "";
  if (S.live){ const h = document.createElement("div"); h.className = "livehead"; h.textContent = "● " + t("liveTip"); el.appendChild(h); }
  list.forEach((it, k) => {
    const i = from + k, b = document.createElement("button");
    b.className = "q" + (i === S.idx ? " now" : "");
    const when = S.live && it._start ? clkFmt.format(new Date(it._start)) : "";
    const tm = i === S.idx ? t("now") : i < S.idx ? t("earlier") : when || (i === S.idx + 1 ? t("upnext") : `+${i - S.idx}`);
    const kind = it.kind === "full" ? ` · ${t("fullVideo")}` : "";
    b.innerHTML = `<div class="th" data-now="${esc(t("now"))}" style="background-image:url('${esc(it.preview || it.img || "")}')"></div>
      <div><div class="tm">${esc(tm)} · ${esc(catLabel(it).toUpperCase())}${esc(kind.toUpperCase())}</div><div class="tt">${esc(tr(it.title))}</div><div class="ex">${esc(tr(it.ex))}</div></div>`;
    b.onclick = () => { if (i !== S.idx){ leaveLive(); S._lowerShown = false; play(i, {offset:0}); } closePanels(); };
    el.appendChild(b);
  });
  if (S.pager && S.pager.more){ const m = document.createElement("button"); m.className = "btn"; m.style.margin = "12px auto"; m.style.display = "flex";
    m.textContent = t("more"); m.onclick = () => loadMore(); el.appendChild(m); }
  if (keep) el.scrollTop = st; else { el.querySelector(".now")?.scrollIntoView({block:"nearest"}); requestTr(); }
}
$("#gform").onsubmit = e => {
  e.preventDefault(); const q = $("#gq").value.trim(); if (!q) return;
  switchChannel(S.chIdx, {type:"search", q}); $("#gq").blur();
};
$("#gbrowse").onclick = () => openPanel("browse");

/* ---------- straturi & setări ---------- */
function seg(name, cur, opts){ return `<div class="seg" data-seg="${name}">${opts.map(([k, n]) => `<button data-v="${k}" class="${cur === k ? "on" : ""}">${esc(n)}</button>`).join("")}</div>`; }
function tgl(key, on, n, d, attr = "data-p"){ return `<div class="tg ${on ? "on" : ""}" ${attr}="${key}" role="switch" aria-checked="${!!on}" tabindex="0"><div class="l">${esc(n)}<small>${esc(d)}</small></div><div class="sw"></div></div>`; }
function renderLayers(){
  const b = $("#lbody");
  let h = `<div class="grp">${esc(t("gLang"))}</div><div class="langs" id="llangs"></div>`;
  if (P.lang !== "en"){
    h += tgl("trOn", P.trOn, L().trOn[0], L().trOn[1]);
    if (P.trOn && P.adv){
      h += `<div class="l sub">${esc(t("trEngine"))}</div>` + seg("trEngine", P.trEngine, [["auto", t("trAuto")], ["browser", t("trBrowser")], ["libre", "LibreTranslate"], ["mymemory", "MyMemory"]]);
      if (P.trEngine === "mymemory") h += `<div class="warn">⚠ ${esc(t("mmWarn"))}</div>`;
      if (P.trEngine === "auto" || P.trEngine === "libre") h += `<label class="fld">${esc(t("trUrl"))}<input type="text" id="trUrl" placeholder="https://translate.example.org" value="${esc(P.trUrl)}"></label>
        <label class="fld">${esc(t("trKey"))}<input type="text" id="trKey" value="${esc(P.trKey)}" autocomplete="off"></label>
        <button class="btn" id="trSave">${esc(t("trSave"))}</button>`;
      h += `<div class="trst">${esc(TX.fn ? t("trStatus", {e:TX.name}) : t("trNone"))}</div><div class="hintp">${esc(t("trHint"))}</div>`;
    }
  }
  const A = P.adv;
  h += `<div class="grp">${esc(t("gPre"))}</div><div class="presets">` +
    Object.keys(PRESETS).map(k => `<button data-pre="${k}"><b>${esc(L().pre[k][0])}</b><small>${esc(L().pre[k][1])}</small></button>`).join("") + `</div>`;
  const subSeg = `<div class="l sub">${esc(t("subSize"))}</div>` + seg("subSize", P.subSize, [["s", "A−"], ["m", "A"], ["l", "A+"], ["xl", "A++"]]);
  if (!A){
    const [n, d] = L().ov.subs; h += `<div class="grp">${esc(t("gBroad"))}</div>` + tgl("subs", O.subs, n, d, "data-k") + (O.subs ? subSeg : "");
    h += `<button class="btn more-set" id="advT">${esc(t("showAll"))} ▾</button>`;
    b.innerHTML = h; bindLayers(b); return;
  }
  for (const x of OVERLAYS){
    if (x.g){ h += `<div class="grp">${esc(t(x.g))}</div>`; continue; }
    const [n, d] = L().ov[x.k];
    h += tgl(x.k, O[x.k], n, d, "data-k");
    if (x.k === "subs" && O.subs) h += subSeg;
  }
  h += `<div class="grp">${esc(t("gPlay"))}</div>`;
  h += tgl("sync", P.sync, L().syncT[0], L().syncT[1]);
  if (!P.sync) h += tgl("shuffle", P.shuffle, L().shuf[0], L().shuf[1]);
  if (DATA.mode === "wp") h += `<div class="hintp">${esc(t("syncNeedsIndex"))}</div>`;
  h += `<div class="l sub">${esc(t("netT"))}</div>` + seg("net", P.net, [["auto", t("netAuto")], ["p2p", t("netP2P")], ["direct", t("netDirect")]]) +
    `<div class="hintp">${esc(t("netHint"))} ${esc(t("netNow", {m: netMode() === "p2p" ? t("netP2P") : t("netDirect")}))}</div>`;
  h += `<div class="l sub">${esc(t("quality"))}</div>` + seg("quality", P.quality, [["auto", t("qAuto")], ["1080", "1080p"], ["720", "720p"], ["480", "480p"]]);
  h += `<div class="l sub">${esc(t("ecoT"))}</div>` + seg("eco", P.eco, [["auto", t("qAuto")], ["on", t("on")], ["off", t("off")]]) +
    `<div class="hintp">${esc(t("ecoHint"))} ${esc(ecoOn() ? t("ecoIsOn") : t("ecoIsOff"))}</div>`;

  h += `<div class="grp">${esc(t("gSrc"))}</div>
    <div class="hintp">${esc(DATA.mode === "index" ? t("catIndex", {n:DATA.all.length}) : DATA.mode === "wp" ? t("catWP") : t("loadingProg"))}</div>
    <div class="srcs">${P.sources.map((s, i) => `<div class="srcrow"><span><b>${esc(s.name || s.handle)}</b><small>${esc(s.host)}</small></span><button class="x" data-rm="${i}" aria-label="${esc(t("remove"))}">×</button></div>`).join("") || `<div class="hintp">${esc(t("noSrc"))}</div>`}</div>
    <label class="fld">${esc(t("addSrc"))}<input type="text" id="srcUrl" placeholder="https://peertube.example/c/channel"></label>
    <button class="btn" id="srcAdd">${esc(t("add"))}</button>
    <div class="hintp">${esc(t("srcHint"))}</div>
    <details class="adv"><summary>${esc(t("advanced"))}</summary>
      <label class="fld">${esc(t("idxUrl"))}<input type="text" id="idxUrl" placeholder="${esc(DEFAULT_INDEX[0])}" value="${esc(P.indexUrl)}"></label>
      <button class="btn" id="idxSave">${esc(t("trSave"))}</button>
      <div class="hintp">${esc(t("kioskHint"))}</div>
      <div class="hintp">VNTV ${esc(VERSION)} · ${esc(BUILD.target)}</div>
    </details>
    <button class="btn more-set" id="advT">${esc(t("showLess"))} ▴</button>`;
  b.innerHTML = h;
  bindLayers(b);
}
function bindLayers(b){
  renderLangs($("#llangs"));
  $("#advT").onclick = () => { P.adv = !P.adv; savePrefs(); renderLayers(); };
  // comutatoare
  b.querySelectorAll(".tg[data-k]").forEach(x => bindToggle(x, () => { O[x.dataset.k] = O[x.dataset.k] ? 0 : 1; applyOverlays();
    if (x.dataset.k === "subs" && O.subs && S.items[S.idx]) loadSubs(S.items[S.idx]); return !!O[x.dataset.k]; }));
  b.querySelectorAll(".tg[data-p]").forEach(x => bindToggle(x, () => {
    const k = x.dataset.p; P[k] = !P[k]; savePrefs();
    if (k === "trOn") reTranslate(true).then(applyLang);
    if (k === "sync"){ switchChannel(S.chIdx); renderLayers(); }
    if (k === "shuffle") toast(P.shuffle ? t("shufOn") : t("shufOff"), 3200);
    return P[k];
  }));
  b.querySelectorAll("[data-seg] button").forEach(x => x.onclick = () => {
    const name = x.parentElement.dataset.seg, v = x.dataset.v; P[name] = v; savePrefs();
    if (name === "trEngine") reTranslate(true).then(applyLang);
    if (name === "quality") toast(t("qualT", {q:x.textContent}));
    if (name === "net"){ toast(t("netNow", {m: netMode() === "p2p" ? t("netP2P") : t("netDirect")})); const it = S.items[S.idx]; if (it) play(S.idx, {offset:curTime()}); }
    if (name === "eco" || name === "subSize") applyPlatform();
    renderLayers();
  });
  b.querySelectorAll("[data-pre]").forEach(x => x.onclick = () => { Object.assign(O, PRESETS[x.dataset.pre].o); applyOverlays(); renderLayers(); toast(t("preset", {n:L().pre[x.dataset.pre][0]})); });
  const sv = $("#trSave"); if (sv) sv.onclick = () => { P.trUrl = $("#trUrl").value.trim(); P.trKey = $("#trKey").value.trim(); savePrefs(); reTranslate(true).then(applyLang); };
  if (!$("#srcAdd")) return;
  $("#srcAdd").onclick = addSource;
  b.querySelectorAll("[data-rm]").forEach(x => x.onclick = () => { P.sources.splice(+x.dataset.rm, 1); savePrefs(); renderLayers(); renderChannels(); });
  $("#idxSave").onclick = async () => { P.indexUrl = $("#idxUrl").value.trim(); savePrefs(); await loadIndex(); renderLayers(); switchChannel(S.chIdx); };
}
function bindToggle(x, fn){
  const f = () => { const on = fn(); x.classList.toggle("on", !!on); x.setAttribute("aria-checked", !!on); };
  x.onclick = f; x.onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); f(); } };
}
async function addSource(){
  const s = parseSource($("#srcUrl").value);
  if (!s){ toast(t("srcBad"), 3500); return; }
  if (P.sources.some(x => srcKey(x) === srcKey(s))){ toast(t("srcDup")); return; }
  try{
    const info = await ptSourceInfo(s);
    const list = await ptAll(s);
    if (!list.length){ toast(t("srcEmpty"), 3500); return; }
    P.sources.push({...s, name:info.name}); savePrefs();
    toast(t("srcAdded", {n:info.name, c:list.length, ch:channelList().length}), 4000);
    renderLayers(); renderChannels();
  }catch(e){ toast(t("srcErr", {e:e.message}), 4500); }
}

/* ---------- detalii ---------- */
function detailHTML(it, idp){
  const fav = !!S.favs[it.key];
  const pills = [it.year && `<span class="pill">${esc(t("year"))} <b>${esc(it.year)}</b></span>`,
    it.len && `<span class="pill">${esc(t("dur"))} <b>${esc(fmtLen(it.len))}</b></span>`,
    it.source && `<span class="pill">${esc(t("source"))} <b>${esc(it.source)}</b></span>`,
    it.licence && `<span class="pill">${esc(t("licence"))} <b>${esc(it.licence)}</b></span>`,
    `<span class="pill">${esc(it.kind === "full" ? t("fullVideo") : t("trailer"))}</span>`,
    ...(it.cats || []).map(c => L().cats[c] ? `<span class="pill">${esc(L().cats[c])}</span>` : ""), it.catLabel && `<span class="pill">${esc(it.catLabel)}</span>`].filter(Boolean).join("");
  const desc = it.desc || it.ex || "";
  const trn = P.lang !== "en" && P.trOn && (isTr(it.title) || isTr(desc) || S.showOrig)
    ? `<div class="trnote"><span>⟲ ${esc(t("autoTr"))}</span><button data-orig>${esc(S.showOrig ? t("showTr") : t("showOrig"))}</button></div>` : "";
  return `<div class="pv" style="background-image:url('${esc(it.img || it.preview || "")}')"></div>
    <h3>${esc(tr(it.title))}</h3><div class="meta">${pills}</div>${trn}
    <p class="d">${esc(tr(desc))}</p>
    <div class="acts">
      ${idp === "b" ? `<button class="btn pri" data-playnow ${it.v ? "" : "disabled"}>▶ ${esc(it.v ? t("playNow") : t("noTrailer"))}</button>` : ""}
      ${it.link ? `<a class="btn ${idp === "b" ? "" : "pri"}" href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.src === "pt" ? t("watchPT") : t("watch"))}</a>` : ""}
      ${it.sourceUrl && it.src === "vn" ? `<a class="btn" href="${esc(it.sourceUrl)}" target="_blank" rel="noopener">${esc(t("official"))}${it.source ? " (" + esc(it.source) + ")" : ""} ↗</a>` : ""}
      <button class="btn ${fav ? "on" : ""}" data-fav>${esc(fav ? t("inFav") : t("addFav"))}</button>
    </div>
    ${it.kind === "trailer" ? `<p class="note">${esc(t("note"))}</p>` : ""}`;
}
function bindDetail(root, it){
  root.querySelector("[data-fav]").onclick = () => { toggleFav(it); if (root.id !== "ibody") showBrowseDetail(it, true); };
  const o = root.querySelector("[data-orig]"); if (o) o.onclick = () => { S.showOrig = !S.showOrig; applyLang(); if (!S.showOrig) requestTr(); };
  const pn = root.querySelector("[data-playnow]"); if (pn) pn.onclick = () => { closePanels(); if (!S.started) start({noplay:true}); playItemNow(it); };
}
function renderInfo(){
  const it = S.items[S.idx]; const b = $("#ibody");
  if (!it){ b.innerHTML = ""; return; }
  need([it.title, it.desc || it.ex], true);
  if (!it.desc) ensureDesc(it).then(() => { if (isOpen("info") && S.items[S.idx] === it){ need([it.desc], true); renderInfo(); } });
  b.innerHTML = detailHTML(it, "i");
  bindDetail(b, it);
}

/* ---------- favorite ---------- */
function toggleFav(it){
  it = it || S.items[S.idx]; if (!it) return;
  if (S.favs[it.key]) delete S.favs[it.key]; else S.favs[it.key] = favSnapshot(it);
  store.set("favs", S.favs); syncFav();
  toast(S.favs[it.key] ? t("favAdd", {n:15}) : t("favRem"));
  if (isOpen("info") && S.items[S.idx]?.key === it.key) renderInfo();
}
function syncFav(){ const it = S.items[S.idx]; const on = !!(it && S.favs[it.key]); $("#bfav").innerHTML = icon(on ? "star" : "staro"); $("#bfav").classList.toggle("on", on); }

/* ---------- răsfoirea colecției (înlocuiește vechiul „Explorator”) ---------- */
const BR = { key:"vn0", q:"", list:null, shown:[], page:0, per:48, wp:null, tok:0 };
function browseCats(){
  return [...VN_CATS.map((c, i) => ({key:"vn" + c, name:L().ch[i][0], ch:{type:"vn", cat:c, i}})),
    ...P.sources.map(s => ({key:"pt:" + srcKey(s), name:s.name || s.handle, ch:{type:"pt", src:s}})),
    {key:"fav", name:L().ch[14][0], ch:{type:"fav", i:14}}];
}
function openBrowse(){
  const bc = $("#bcats");
  bc.innerHTML = browseCats().map(c => `<button class="bc ${c.key === BR.key ? "on" : ""}" data-k="${esc(c.key)}">${esc(c.name)}</button>`).join("");
  bc.querySelectorAll(".bc").forEach(b => b.onclick = () => { BR.key = b.dataset.k; BR.q = ""; $("#bq").value = ""; openBrowse(); brLoad(true); });
  $("#bdet").hidden = true;
  if (!BR.list && !BR.wp) brLoad(true); else renderBrowse();
}
async function brLoad(reset){
  const tok = ++BR.tok, cat = browseCats().find(c => c.key === BR.key) || browseCats()[0];
  if (reset){ BR.page = 0; BR.shown = []; BR.list = null; BR.wp = null; $("#bgrid").innerHTML = ""; }
  $("#bstat").textContent = t("loadingProg");
  try{
    let all = null;
    if (cat.ch.type !== "vn" || DATA.mode === "index") all = await channelAll(cat.ch);
    if (tok !== BR.tok) return;
    if (all){
      const q = norm(BR.q);
      BR.list = q ? all.filter(x => norm(x.title + " " + x.ex + " " + tr(x.title)).includes(q)) : all.slice().sort((a, b) => (b.id > a.id ? 1 : -1));
    } else {
      BR.wp = BR.wp || {page:0, pages:1, items:[]};
      const r = await wpPage({cat:cat.ch.cat || 0, q:BR.q, page:BR.wp.page + 1, per:24});
      if (tok !== BR.tok) return;
      BR.wp.page++; BR.wp.pages = r.pages; BR.wp.items.push(...r.items);
    }
  }catch(e){ $("#bstat").textContent = t("errList", {e:e.message}); return; }
  renderBrowse();
}
function renderBrowse(){
  const g = $("#bgrid");
  let items, more;
  if (BR.list){ BR.page = Math.max(BR.page, 1); items = BR.list.slice(0, BR.page * BR.per); more = items.length < BR.list.length; }
  else if (BR.wp){ items = BR.wp.items; more = BR.wp.page < BR.wp.pages; }
  else { items = []; more = false; }
  BR.shown = items;
  const total = BR.list ? BR.list.length : null;
  $("#bstat").textContent = total != null ? t("nTitles", {n:total}) : (items.length ? t("nTitles", {n:items.length + (more ? "+" : "")}) : t("noRes"));
  g.innerHTML = items.map((it, i) => `<button class="card" data-i="${i}"><div class="im" style="background-image:url('${esc(it.img || it.preview || "")}')">${it.v ? '<span class="pl">▶</span>' : ""}${S.favs[it.key] ? '<span class="fv">★</span>' : ""}</div>
    <div class="ct" data-t="${i}">${esc(tr(it.title))}</div><div class="cm">${esc([catLabel(it), it.year].filter(Boolean).join(" · "))}</div></button>`).join("");
  g.querySelectorAll(".card").forEach(c => c.onclick = () => showBrowseDetail(items[+c.dataset.i]));
  $("#bmore").hidden = !more;
  need(items.slice(-BR.per).map(x => x.title));
}
function refreshBrowseTitles(){ $$("#bgrid .ct").forEach(e => { const it = BR.shown[+e.dataset.t]; if (it) e.textContent = tr(it.title); }); if (!$("#bdet").hidden && BR.cur) showBrowseDetail(BR.cur, true); }
function showBrowseDetail(it, keepFocus){
  BR.cur = it;
  const d = $("#bdet"); d.hidden = false;
  d.innerHTML = `<div class="bdin"><button class="btn back" data-back>← ${esc(t("back"))}</button>${detailHTML(it, "b")}</div>`;
  d.querySelector("[data-back]").onclick = () => { d.hidden = true; };
  bindDetail(d, it);
  need([it.title, it.desc || it.ex], true);
  if (!it.desc) ensureDesc(it).then(() => { if (BR.cur === it && !d.hidden){ need([it.desc], true); showBrowseDetail(it, true); } });
  if (!keepFocus && !TOUCH) setTimeout(() => d.querySelector("[data-playnow], .btn.pri")?.focus({preventScroll:true}), 30);
}
$("#bmore").onclick = () => { if (BR.list){ BR.page++; renderBrowse(); } else brLoad(false); };
$("#bform").onsubmit = e => { e.preventDefault(); BR.q = $("#bq").value.trim(); $("#bq").blur(); brLoad(true); };

/* ---------- limbă ---------- */
function renderLangs(el){
  if (!el) return;
  el.innerHTML = Object.entries(I18N).map(([k, v]) => `<button data-lang="${k}" class="${k === P.lang ? "on" : ""}" lang="${k}">${esc(v._n)}</button>`).join("");
  el.querySelectorAll("[data-lang]").forEach(b => b.onclick = e => { e.stopPropagation(); setLang(b.dataset.lang); });
}
function kb(keys, label){ return keys.map(k => `<kbd>${k}</kbd>`).join("") + " " + esc(label); }
function applyLang(){
  document.documentElement.lang = P.lang;
  $$("[data-i]").forEach(e => e.textContent = t(e.dataset.i));
  $$("[data-it]").forEach(e => { e.title = t(e.dataset.it); if (e.tagName === "BUTTON" && !e.textContent.trim()) e.setAttribute("aria-label", t(e.dataset.it).replace(/\s*\([^)]*\)$/, "")); });
  $$("[data-ia]").forEach(e => e.setAttribute("aria-label", t(e.dataset.ia)));
  $$("[data-ip]").forEach(e => e.placeholder = t(e.dataset.ip));
  $("#ghint").innerHTML = [kb(["↑","↓"], t("kCh")), kb(["←","→"], t("kClip")), kb(["1","9"], t("kDirect")), kb(["G"], t("kGuide")), kb(["B"], t("kBrowse")),
    kb(["O"], t("kLayers")), kb(["I"], t("kInfo")), kb(["H"], t("kClean")), kb(["F"], t("kFull"))].join(" · ");
  $("#skeys").innerHTML = `<span class="kbd-only">` + [kb(["↑","↓"], t("kCh")), kb(["←","→"], t("kClip")), kb(["G"], t("kGuide")), kb(["B"], t("kBrowse")), kb(["O"], t("kLayers")), kb(["H"], t("kClean"))].join(" &nbsp; ")
    + `</span><span class="touch-only">${esc(t("mobile"))}</span>`;
  clkFmt = new Intl.DateTimeFormat(L()._loc, {hour:"2-digit", minute:"2-digit"}); tickClock();
  renderLangs($("#slangs")); renderChannels(); updateLiveUI();
  if (isOpen("layers")) renderLayers();
  if (isOpen("guide")) renderQueue(true);
  if (isOpen("info")) renderInfo();
  if (isOpen("browse")) openBrowse();
  const it = S.items[S.idx];
  if (it){ updateNow(it); renderTicker(); mediaSession(it); if ($("#lower").classList.contains("show")) showLower(it); SUB.last = null; subsAt(curTime()); }
}
function setLang(l){ if (!I18N[l]) return; P.lang = l; S.showOrig = false; savePrefs(); applyLang(); reTranslate(true).then(applyLang); const it = S.items[S.idx]; if (it && O.subs) loadSubs(it); }
