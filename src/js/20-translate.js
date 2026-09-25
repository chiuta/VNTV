/* =====================================================================
   Traducerea automată a conținutului (titluri, descrieri, subtitrări)
   Ordinea implicită: browser (pe dispozitiv) → LibreTranslate (dacă e configurat) → nimic.
   MyMemory (serviciu comercial) se folosește DOAR dacă spectatorul îl alege explicit.
   ===================================================================== */
const TRC = store.get("trc", {});
let trcTimer = 0;
function trcSave(){ clearTimeout(trcTimer); trcTimer = setTimeout(() => {
  const k = Object.keys(TRC); if (k.length > 2500) k.slice(0, k.length - 2500).forEach(x => delete TRC[x]);
  store.set("trc", TRC); }, 1500); }
const TX = { fn:null, name:"", kind:"", browser:{}, dl:{}, q:[], pend:new Set(), running:0, quotaWarned:false };
const trOn = () => P.lang !== "en" && P.trOn && !S.showOrig;
const trKey = s => P.lang + "\u0001" + s;
function tr(s){ if (!s || !trOn()) return s; return TRC[trKey(s)] ?? s; }
function isTr(s){ return !!(s && trOn() && TRC[trKey(s)]); }

async function browserTranslator(lang, gesture){
  if (!("Translator" in self)) return null;
  if (TX.browser[lang]) return TX.browser[lang];
  try{
    const av = await within(Translator.availability({sourceLanguage:"en", targetLanguage:lang}), 2500);
    if (av === "unavailable" || av === "no") return null;
    if (av === "available" || av === "readily"){
      TX.browser[lang] = await within(Translator.create({sourceLanguage:"en", targetLanguage:lang}), 6000);
      return TX.browser[lang];
    }
    if (gesture && !TX.dl[lang]){          // modelul se descarcă în fundal; între timp folosim alt motor
      TX.dl[lang] = true; toast(t("trDl"), 3500);
      Translator.create({sourceLanguage:"en", targetLanguage:lang}).then(x => {
        TX.browser[lang] = x; if (P.lang === lang && (P.trEngine === "auto" || P.trEngine === "browser")) reTranslate(false);
      }).catch(() => {}).finally(() => { TX.dl[lang] = false; });
    }
    return null;
  }catch(e){ return null; }
}
async function viaLibre(text){
  const r = await within(fetch(P.trUrl.replace(/\/+$/, "") + "/translate", {method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({q:text, source:"en", target:P.lang, format:"text", ...(P.trKey ? {api_key:P.trKey} : {})})}), 20000);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json(); if (!j.translatedText) throw new Error("empty"); return j.translatedText;
}
function chunks(text, max){
  const out = []; let cur = "";
  for (const part of text.split(/(?<=[.!?…])\s+|\n+/)){
    if (!part) continue;
    if ((cur + " " + part).length > max && cur){ out.push(cur); cur = part; } else cur = cur ? cur + " " + part : part;
  }
  if (cur) out.push(cur);
  return out.flatMap(c => c.length <= max ? [c] : c.match(new RegExp(".{1," + max + "}(\\s|$)", "g")) || [c]);
}
async function viaMyMemory(text){
  const res = [];
  for (const para of text.split(/\n{2,}/)){
    const bits = [];
    for (const c of chunks(para, 450)){
      const j = await getJSON("https://api.mymemory.translated.net/get?langpair=en|" + P.lang + "&q=" + encodeURIComponent(c));
      if (+j.responseStatus !== 200 || /MYMEMORY WARNING|QUOTA/i.test(j.responseData?.translatedText || "")){ const e = new Error("quota"); e.quota = true; throw e; }
      bits.push(j.responseData.translatedText);
    }
    res.push(bits.join(" "));
  }
  return res.join("\n\n");
}
async function pickEngine(gesture){
  TX.fn = null; TX.name = ""; TX.kind = "";
  if (P.lang === "en" || !P.trOn) return;
  const e = P.trEngine;
  if (e === "auto" || e === "browser"){
    const b = await browserTranslator(P.lang, gesture);
    if (b){ TX.fn = s => b.translate(s); TX.name = t("trBrowser"); TX.kind = "browser"; return; }
  }
  if ((e === "auto" || e === "libre") && P.trUrl){ TX.fn = viaLibre; TX.name = "LibreTranslate"; TX.kind = "libre"; return; }
  if (e === "mymemory"){ TX.fn = viaMyMemory; TX.name = "MyMemory"; TX.kind = "mymemory"; }
}
function need(texts, front){
  if (!trOn() || !TX.fn) return;
  const add = [...new Set(texts.filter(s => s && s.trim() && !TRC[trKey(s)] && !TX.pend.has(trKey(s))))];
  add.forEach(s => TX.pend.add(trKey(s)));
  const jobs = add.map(s => ({s, lang:P.lang}));
  front ? TX.q.unshift(...jobs) : TX.q.push(...jobs);
  pump();
}
function pump(){
  while (TX.running < (TX.kind === "mymemory" ? 1 : 3) && TX.q.length){
    const job = TX.q.shift(); const fn = TX.fn;
    if (job.lang !== P.lang || !fn){ TX.pend.delete(job.lang + "\u0001" + job.s); continue; }
    TX.running++;
    Promise.resolve().then(() => fn(job.s)).then(out => {
      if (out && out.trim()){ TRC[job.lang + "\u0001" + job.s] = out; trcSave(); refreshTr(); }
    }).catch(err => {
      if (err && err.quota){ TX.q.length = 0; TX.fn = null; if (!TX.quotaWarned){ TX.quotaWarned = true; toast(t("trQuota"), 4000); } }
    }).finally(() => { TX.pend.delete(job.lang + "\u0001" + job.s); TX.running--; pump(); });
  }
}
function requestTr(){
  if (!trOn() || !TX.fn) return;
  const it = S.items[S.idx];
  if (it){ need([it.title], true); if (it.desc) need([it.desc], true); }
  need(S.items.slice(S.idx + 1, S.idx + 13).map(x => x.title));
  if (isOpen("guide")){
    const w = S.items.slice(Math.max(0, S.idx - 1), S.idx + 25);
    need(w.map(x => x.title));
    if (TX.kind !== "mymemory") need(w.map(x => x.ex));
  }
  if (isOpen("browse")) need(BR.shown.map(x => x.title));
  if (SUB.cues.length && SUB.lang !== P.lang && TX.kind !== "mymemory") need(SUB.cues.map(c => c.text));
}
let refTimer = 0, tickTimer = 0;
function refreshTr(){
  clearTimeout(refTimer);
  refTimer = setTimeout(() => {
    const it = S.items[S.idx];
    if (it){
      $("#nowt").textContent = tr(it.title); document.title = `${tr(it.title)} — VNTV`;
      if ($("#lower").classList.contains("show")) $("#ltitle").textContent = tr(it.title);
      const nx = S.items[S.idx + 1]; if (nx) $("#untitle").textContent = tr(nx.title);
      mediaSession(it);
    }
    if (isOpen("guide")) renderQueue(true);
    if (isOpen("info")) renderInfo();
    if (isOpen("browse")) refreshBrowseTitles();
    clearTimeout(tickTimer); tickTimer = setTimeout(renderTicker, 1200);
  }, 250);
}
async function reTranslate(gesture){
  TX.q.length = 0; TX.pend.clear(); TX.quotaWarned = false;
  await pickEngine(gesture); requestTr(); refreshTr();
  if (isOpen("layers")) renderLayers();
}
