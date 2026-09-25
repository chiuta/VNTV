/* =====================================================================
   Canale și program
   - sincronizat: programul zilei se calculează din dată, deci toți spectatorii văd același clip
     în același moment (fără server); „În emisie” e adevărat doar în acest mod
   - local: ordine aleatorie sau cronologică, doar pentru spectatorul curent
   ===================================================================== */
const S = {
  chIdx:0, ch:null, items:[], idx:-1, live:false, t0:0, pager:null, loading:false, token:0, playTok:0,
  favs:loadFavs(), started:false, showOrig:false, search:null, clipCount:0, lowerTimer:0, userPaused:false,
};

function channelList(){
  return [
    ...VN_CATS.map((cat, i) => ({type:"vn", cat, i})),
    {type:"fav", i:14},
    ...P.sources.map(s => ({type:"pt", src:s})),
  ];
}
function chName(ch){
  if (!ch) return "";
  if (ch.type === "search") return t("searchPre") + ch.q;
  if (ch.type === "pt") return ch.src.name || ch.src.handle;
  return L().ch[ch.i][0];
}
function chSub(ch){
  if (ch.type === "pt") return "PeerTube · " + ch.src.host;
  if (ch.type === "search") return t("searchCh");
  return L().ch[ch.i][1];
}
function chKey(ch){ return ch.type === "vn" ? "vn" + ch.cat : ch.type === "pt" ? "pt:" + srcKey(ch.src) : ch.type; }
const chNo = () => S.search ? "—" : pad2(S.chIdx + 1);
function catLabel(it){
  if (it.catLabel) return it.catLabel;
  const C = L().cats;
  const c = (it.cats || []).find(c => c !== 2 && C[c]) ?? (it.cats || []).find(c => C[c]);
  return C[c] || (it.src === "pt" ? "PeerTube" : "VideoNeat");
}

/* lista completă a unui canal, când o avem (listă JSON, favorite, PeerTube); altfel null */
async function channelAll(ch){
  if (ch.type === "fav") return Object.values(S.favs).filter(x => x.v);
  if (ch.type === "pt") return ptAll(ch.src);
  if (DATA.mode !== "index") return null;
  if (ch.type === "search"){ const q = norm(ch.q); return DATA.all.filter(x => norm(x.title + " " + x.ex + " " + tr(x.title)).includes(q)); }
  return DATA.all.filter(x => !ch.cat || x.cats.includes(ch.cat));
}

/* ---- programul sincronizat ---- */
/* Programul curge în „cicluri”: fiecare ciclu rulează o dată toate titlurile canalului, în ordinea dată de o
   amestecare deterministă (canal + numărul ciclului). Nu există salt la miezul nopții: ordinea se schimbă doar
   când se termină ciclul, la granița dintre două clipuri. Toți spectatorii cu același catalog văd același lucru. */
const EPOCH = Date.UTC(2026, 0, 1);
function buildSchedule(ch, all, now){
  const base = [...all].sort((a, b) => a.key < b.key ? -1 : 1);
  const slot = it => (it.dur || DEF_DUR) + GAP;
  const cycle = base.reduce((a, it) => a + slot(it), 0);
  const el = (now - EPOCH) / 1000, k = Math.floor(el / cycle);
  const order = n => shuffle(base.map(x => ({...x})), rng(chKey(ch) + "|" + n));
  const list = order(k);
  let tt = el - k * cycle, i = 0;
  while (i < list.length - 1 && tt >= slot(list[i])){ tt -= slot(list[i]); i++; }
  const items = list.slice(i).concat(order(k + 1));
  let start = now - tt * 1000;
  items.forEach(it => { it._start = start; start += slot(it) * 1000; });
  return {items, offset:tt};
}
function canSync(ch){ return P.sync && ch.type !== "fav" && ch.type !== "search"; }

/* ---- acordarea unui canal ---- */
async function tune(opts = {}){
  const ch = S.search || S.ch;
  const tok = ++S.token;
  S.items = []; S.idx = -1; S.pager = null; S.live = false; S.loading = true;
  renderLists();
  let all = null;
  try{ all = await channelAll(ch); }catch(e){ toast(t("errList", {e:e.message}), 4000); }
  if (tok !== S.token) return false;
  S.loading = false;
  if (all){
    if (!all.length){ renderLists(); return false; }
    if (canSync(ch)){
      const sc = buildSchedule(ch, all, Date.now());
      S.items = sc.items; S.idx = 0; S.live = true;
      renderLists(); updateLiveUI();
      return {offset: sc.offset};
    }
    const list = all.map(x => ({...x}));
    S.items = P.shuffle ? shuffle(list) : list.sort((a, b) => (b.id > a.id ? 1 : -1));
    S.idx = 0; renderLists(); updateLiveUI();
    return {offset:0};
  }
  // mod de rezervă: paginile API-ului WordPress, încărcate pe rând
  S.pager = {pages:null, pi:0, more:true};
  await loadMore();
  if (tok !== S.token) return false;
  S.idx = 0; updateLiveUI();
  return S.items.length ? {offset:0} : false;
}
function loadMore(){
  if (!S.pager || !S.pager.more) return Promise.resolve();
  if (S.pager.p) return S.pager.p;
  const pg = S.pager, tok = S.token, ch = S.search || S.ch;
  pg.p = (async () => {
    S.loading = true;
    try{
      let added = 0, tries = 0;
      while (!added && pg.more && tries < 6){
        tries++;
        const page = pg.pages ? pg.pages[pg.pi] : 1;
        const r = await wpPage({cat:ch.cat || 0, q:ch.q || "", page});
        if (tok !== S.token) return;
        if (!pg.pages){
          const rest = Array.from({length:Math.max(0, r.pages - 1)}, (_, i) => i + 2);
          pg.pages = [1, ...(P.shuffle ? shuffle(rest) : rest)];
        }
        pg.pi++;
        if (pg.pi >= pg.pages.length || !r.items.length) pg.more = false;
        const batch = r.items.filter(x => x.v);
        if (P.shuffle) shuffle(batch);
        S.items.push(...batch); added += batch.length;
      }
    }catch(e){ if (tok === S.token) toast(t("errList", {e:e.message}), 4000); }
    finally{ if (tok === S.token){ S.loading = false; pg.p = null; renderLists(); } }
  })();
  return pg.p;
}

/* ---- schimbarea canalului ---- */
async function switchChannel(n, search){
  const list = channelList();
  S.search = search || null;
  if (!search){ S.chIdx = (n + list.length) % list.length; S.ch = list[S.chIdx]; P.ch = S.chIdx; savePrefs(); }
  osd(); noise(420);
  if (!search && S.ch.type === "fav" && !Object.keys(S.favs).length) toast(t("noFavs"));
  const r = await tune();
  if (r) play(0, {offset:r.offset}); else if (S.started) toast(t("noTr"), 3500);
}
function backToLive(){ switchChannel(S.chIdx); }
function leaveLive(){ if (S.live){ S.live = false; updateLiveUI(); } }

/* poziția „în direct” pentru titlul i: câte secunde din el ar fi trebuit să fi rulat deja */
function liveOffset(i){
  const it = S.items[i]; if (!it || !it._start) return 0;
  return Math.max(0, (Date.now() - it._start) / 1000);
}
/* dacă am rămas în urmă (încărcări lente), sari la titlul care rulează acum */
function liveCatchUp(i){
  while (i < S.items.length - 1){
    const it = S.items[i], end = it._start + ((it.dur || DEF_DUR) + GAP) * 1000;
    if (Date.now() < end - 3000) break;
    i++;
  }
  return i;
}
