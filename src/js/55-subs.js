/* =====================================================================
   Subtitrări: din PeerTube (inclusiv transcrierile automate), traduse pe loc când nu există
   în limba aleasă. Se afișează ca strat propriu, deci merg și în modul direct, și în P2P.
   ===================================================================== */
const SUB = { cues:[], lang:null, tok:0, last:null, avail:[] };
function subsReset(){ SUB.cues = []; SUB.lang = null; SUB.last = null; SUB.avail = []; $("#subt").textContent = ""; $("#subs").classList.remove("on"); }
async function loadSubs(it){
  const tok = ++SUB.tok;
  if (!O.subs || !it.v) return;
  try{
    const list = await getCaptions(it.v);
    if (tok !== SUB.tok) return;
    SUB.avail = list;
    const pick = list.find(c => c.lang === P.lang) || list.find(c => c.lang === "en") || list[0];
    if (!pick) return;
    const r = await within(fetch(pick.url), 10000);
    if (!r.ok || tok !== SUB.tok) return;
    SUB.cues = parseVTT(await r.text()); SUB.lang = pick.lang;
    if (SUB.lang !== P.lang && TX.kind !== "mymemory") need(SUB.cues.map(c => c.text));
  }catch(e){}
}
/* comutator rapid (butonul CC și tasta T): pornit/oprit, cu reîncărcarea subtitrărilor clipului curent */
function syncSubsBtn(){
  const b = $("#bsubs"); if (!b) return;
  b.classList.toggle("on", !!O.subs); b.setAttribute("aria-pressed", O.subs ? "true" : "false");
}
function toggleSubs(){
  O.subs = O.subs ? 0 : 1;
  applyOverlays();
  const it = S.items[S.idx];
  if (O.subs && it){ SUB.last = null; loadSubs(it); }
  if (isOpen("layers")) renderLayers();
  toast(t(O.subs ? "subsOn" : "subsOff"), 1800);
}
function subsAt(time){
  const el = $("#subs");
  if (!O.subs || !SUB.cues.length){ if (SUB.last !== null){ SUB.last = null; $("#subt").textContent = ""; el.classList.remove("on"); } return; }
  const c = SUB.cues.find(x => time >= x.start && time < x.end);
  const txt = c ? (SUB.lang === P.lang ? c.text : (SUB.lang === "en" ? tr(c.text) : c.text)) : "";
  if (txt !== SUB.last){ SUB.last = txt; $("#subt").textContent = txt; el.classList.toggle("on", !!txt); }
}
