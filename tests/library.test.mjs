// VNTV 3.0.0 — Biblioteca mea: istoric + cutii de reluare, liste proprii, abonamente PeerTube, verificarea legăturilor, M3U/JSON.
// Rulare: node tests/library.test.mjs  (necesită dist/vntv.html construit: node build.mjs)
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { install } from "./mock.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const APP = "file://" + path.join(root, "dist/vntv.html");
const LT = ms => Math.round(ms * Math.min(6, Math.max(1, os.loadavg()[0] / os.cpus().length)));
const until = async (page, fn, arg, timeout = 30000) => { for (let k = 0; ; k++){ try { return await page.waitForFunction(fn, arg, {timeout: LT(timeout)}); } catch (e){ if (k < 3 && /context was destroyed|navigation/i.test(e.message)){ await page.waitForTimeout(300); continue; } throw e; } } };
let pass = 0, fail = 0;
const check = (name, cond, extra) => { if (cond){ pass++; console.log("  ok  " + name); } else { fail++; console.log("FAIL  " + name + (extra !== undefined ? "  -> " + JSON.stringify(extra) : "")); } };
const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args:["--autoplay-policy=no-user-gesture-required"]});
const settle = page => page.waitForFunction(() => document.getAnimations().every(a => { const e = a.effect && a.effect.getComputedTiming(); return !e || !isFinite(e.endTime) || a.playState === "finished"; }), null, {timeout:LT(15000)}).catch(() => {});
async function open({seed = {}, mock = {}, query = "", net = "direct"} = {}){
  const ctx = await browser.newContext({viewport:{width:1280, height:800}, acceptDownloads:true});
  ctx.setDefaultTimeout(LT(30000));
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const opts = {...mock};
  const log = await install(page, opts);
  await page.addInitScript(([seed, net]) => { try{
    if (!localStorage.getItem("vntv.prefs")) localStorage.setItem("vntv.prefs", JSON.stringify({p2pAck:true, adv:true, net}));
    for (const k of Object.keys(seed)) if (!localStorage.getItem("vntv." + k)) localStorage.setItem("vntv." + k, typeof seed[k] === "string" ? seed[k] : JSON.stringify(seed[k]));
  }catch(e){} }, [seed, net]);
  await page.goto(APP + query); await settle(page);
  return {ctx, page, log, errors, opts};
}
const snap = (key, extra = {}) => ({key, src:"pt", id:key.split(":").pop(), title:"Seed " + key, ex:"", link:null, cats:[], img:null, year:"2024", len:null, source:"S", sourceUrl:null,
  v:{host:"peertube.example", id:key.split(":").pop()}, dur:120, preview:null, kind:"full", licence:null, ...extra});
const start = async page => { await ck(page, "#go"); await until(page, () => PL.started && S.items[S.idx]); };
const openLib = async (page, tab) => { await page.keyboard.press("w"); await until(page, () => document.querySelector("#lib.open")); if (tab) { await ck(page, `#libtabs [data-tab=${tab}]`); } };
const ck = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error("lipsește " + s); e.click(); }, sel);
const confirmYes = async page => { await page.waitForSelector("dialog[open]"); await page.evaluate(() => { const b = [...document.querySelectorAll("dialog[open] button")]; b[b.length - 1].click(); }); };

console.log("1. istoric: se înregistrează poziția");
{
  const {ctx, page, errors} = await open();
  await start(page);
  check("intrare în istoric pentru clipul curent", await page.evaluate(() => HIST.length >= 1 && HIST.some(h => h.it.key === S.items[S.idx].key)));
  await until(page, () => HIST.some(h => h.pos > 0.5));
  await page.evaluate(() => histSave());
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("vntv.hist")));
  check("salvat în vntv.hist cu poziție", st.length >= 1 && st.some(h => h.pos > 0.5 && h.it.v.host === "videos.trom.tf"), st.map(h => h.pos));
  check("fără erori", errors.length === 0, errors);
  await ctx.close();
}

console.log("2. cutie de reluare pe ecranul de start și în panou");
{
  const seed = {hist:[
    {it:snap("pt:peertube.example:aaa111"), pos:40, dur:120, at:Date.now() - 1000, done:false},
    {it:snap("pt:peertube.example:bbb222"), pos:70, dur:120, at:Date.now() - 5000, done:false},
    {it:snap("pt:peertube.example:ccc333"), pos:0, dur:120, at:Date.now() - 9000, done:true},
    {it:snap("pt:peertube.example:ddd444"), pos:5, dur:120, at:Date.now() - 9500, done:false},
    {it:snap("pt:peertube.example:eee555"), pos:118, dur:120, at:Date.now() - 9800, done:false},
  ]};
  const {ctx, page, errors} = await open({seed});
  check("cutia de reluare e vizibilă pe splash", await page.isVisible("#resumebox"));
  check("arată cel mai recent titlu neterminat", /Seed pt:peertube.example:aaa111/.test(await page.textContent("#resumebox")) && /0:40/.test(await page.textContent("#resumebox")));
  await page.evaluate(() => { window.__pl = []; const o = play; play = (i, opt) => { __pl.push({i, offset:opt && opt.offset}); return o(i, opt); }; });
  await ck(page, "#resumebox");
  await until(page, () => S.started && S.items[S.idx] && S.items[S.idx].key === "pt:peertube.example:aaa111");
  const offs = await page.evaluate(() => __pl.map(x => x.offset));
  check("pornește cu 3 s înainte de poziția salvată (37)", offs.includes(37), offs);
  check("splash-ul dispare după pornire", await page.evaluate(() => document.getElementById("splash").classList.contains("hide")));
  await page.evaluate(() => { HCUR = null; });
  // clipul scurt din mock a rulat până la capăt: refacem starea istoricului
  await page.evaluate(seed => { HIST.length = 0; seed.forEach(h => HIST.push(cleanHist(h))); histSave(); window.histStart = () => {}; window.histTick = () => {}; histStart = () => {}; histTick = () => {}; }, seed.hist);
  await page.keyboard.press("w"); await until(page, () => document.querySelector("#lib.open"));
  check("panoul Continuă arată doar titlurile cu poziție utilă (2)", await page.locator("#libbody .rbox").count() === 2, await page.locator("#libbody .rbox").count());
  check("titlurile terminate sau aproape terminate nu apar în cutii", (await page.locator("#libbody .rbox").filter({hasText: "eee555"}).count()) === 0 && (await page.locator("#libbody .rbox").filter({hasText: "ccc333"}).count()) === 0);
  check("istoricul listează toate intrările", await page.locator("#libbody .lrow").count() >= 5);
  check("tab-urile au roluri ARIA", await page.locator('#libtabs[role=tablist] [role=tab]').count() === 3 && await page.locator('#libtabs [aria-selected=true]').count() === 1);
  // ștergere intrare
  const n0 = await page.locator("#libbody .lrow").count();
  await page.evaluate(() => document.querySelector("#libbody .lrow [data-act=hdel]").click());
  await until(page, n => document.querySelectorAll("#libbody .lrow").length === n, n0 - 1).catch(() => {});
  check("ștergerea unei intrări", await page.locator("#libbody .lrow").count() === n0 - 1, [n0, await page.locator("#libbody .lrow").count()]);
  // oprire istoric
  await page.evaluate(() => document.querySelector("#libbody .tg[data-lib]").click());
  check("istoric oprit: preferință salvată", await page.evaluate(() => P.hist === false && JSON.parse(localStorage.getItem("vntv.prefs")).hist === false));
  const before = await page.evaluate(() => HIST.length);
  await page.evaluate(() => { HCUR = null; histStart({...S.items[S.idx], key:"vn:9999", v:{host:"videos.trom.tf", id:"zzz"}}); });
  check("cu istoricul oprit nu se mai înregistrează", await page.evaluate(() => HIST.length) === before);
  await page.evaluate(() => document.querySelector("#libbody .tg[data-lib]").click());
  // ștergere totală cu confirmare
  await page.evaluate(() => document.querySelector("#libbody [data-act=hclear]").click()); await confirmYes(page);
  await until(page, () => HIST.length === 0);
  check("istoric șters după confirmare", await page.locator("#libbody .lrow").count() === 0 && await page.locator("#libbody .empty").count() >= 1);
  check("fără erori", errors.length === 0, errors);
  await ctx.close();
}

console.log("3. liste proprii: creare, adăugare, ordine, redare, M3U/JSON");
{
  const {ctx, page, errors} = await open();
  await start(page);
  await openLib(page, "lists");
  await page.fill("#nlName", "Seara <b>de știință</b>"); await ck(page, '[data-form=newlist] .btn');
  check("listă creată și deschisă", await page.evaluate(() => LISTS.length === 1 && LISTS[0].name === "Seara <b>de știință</b>"));
  check("nume escapat în pagină", (await page.locator(".lcard .lname b").innerHTML()).includes("&lt;b&gt;"));
  await ck(page, "[data-act=addcur]");
  check("titlul curent adăugat", await page.evaluate(() => LISTS[0].items.length === 1 && LISTS[0].items[0].key === S.items[S.idx].key));
  // adaugă încă 2 titluri direct
  await page.evaluate(() => { for (const n of [2, 3]) addToList(LISTS[0].id, {...S.items[0], key:"vn:100" + n, id:100 + n, title:"Titlu " + n, v:{host:"videos.trom.tf", id:"T100" + n}}); renderLib(); });
  check("3 titluri în listă", await page.evaluate(() => LISTS[0].items.length) === 3);
  await page.evaluate(() => addToList(LISTS[0].id, LISTS[0].items[1]));
  check("fără dubluri", await page.evaluate(() => LISTS[0].items.length) === 3);
  const k = await page.evaluate(() => LISTS[0].items.map(x => x.key));
  await page.locator('.lrow[data-ii="2"] [data-act=up]').click();
  check("mutare în sus", JSON.stringify(await page.evaluate(() => LISTS[0].items.map(x => x.key))) === JSON.stringify([k[0], k[2], k[1]]));
  await page.locator('.lrow[data-ii="0"] [data-act=up]').click();
  check("prima poziție nu se mută mai sus", (await page.evaluate(() => LISTS[0].items[0].key)) === k[0]);
  await page.fill("[data-rename]", "Redenumită"); await page.keyboard.press("Enter");
  check("redenumire", await page.evaluate(() => LISTS[0].name) === "Redenumită");
  // redare: ordinea listei, canal nou la sfârșit
  await ck(page, "[data-act=playlist]");
  await until(page, () => S.ch && S.ch.type === "pl" && S.items.length === 3 && PL.started);
  check("canalul listei, în ordinea ei, fără amestecare", JSON.stringify(await page.evaluate(() => S.items.map(x => x.key))) === JSON.stringify([k[0], k[2], k[1]]));
  check("canalul apare la sfârșitul ghidului și e nesincronizat", await page.evaluate(() => channelList().at(-1).type === "pl" && !S.live));
  await page.evaluate(() => closePanels());
  // M3U
  await page.keyboard.press("w"); await until(page, () => document.querySelector("#lib.open"));
  await ck(page, "#libtabs [data-tab=lists]");
  if (!(await page.locator("[data-act=m3u]").count())) await ck(page, "[data-act=toggle]");
  const [dl] = await Promise.all([page.waitForEvent("download"), ck(page, "[data-act=m3u]")]);
  const m3u = fs.readFileSync(await dl.path(), "utf8");
  check("M3U: antet, nume, 3 intrări cu durată și adresă https", m3u.startsWith("#EXTM3U\n#PLAYLIST:Redenumită\n") && (m3u.match(/#EXTINF:/g) || []).length === 3 && (m3u.match(/\nhttps:\/\//g) || []).length === 3, m3u.slice(0, 200));
  check("M3U: nume fișier curat", /^vntv-Redenumita\.m3u$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  // JSON
  const [dj] = await Promise.all([page.waitForEvent("download"), ck(page, "[data-act=export]")]);
  const exp = JSON.parse(fs.readFileSync(await dj.path(), "utf8"));
  check("export JSON", exp.app === "vntv" && exp.kind === "lists" && exp.lists[0].items.length === 3);
  await page.setInputFiles("#libFile", {name:"l.json", mimeType:"application/json", buffer:Buffer.from(JSON.stringify(exp))});
  await until(page, () => LISTS.length === 2);
  check("import: a doua listă adăugată", await page.evaluate(() => LISTS[1].items.length === 3 && LISTS[1].id !== LISTS[0].id));
  const hostile = {app:"vntv", kind:"lists", version:1, lists:[{name:"x".repeat(500), items:[{key:"vn:1", v:{host:"evil.com/x", id:"a"}}, {key:"pt:h:1", v:{host:"ok.example", id:"../../x"}}, {key:"pt:ok.example:7", title:{toString:1}, v:{host:"ok.example", id:"v7"}, link:"javascript:alert(1)", img:"data:text/html,x", cats:["a", 3]}, null, 5]}, {name:"__proto__", items:"no"}], subs:[{name:"s", host:"evil host", pid:"abc"}, {name:"ok", host:"peertube.example", pid:"abcd1234"}]};
  await page.setInputFiles("#libFile", {name:"h.json", mimeType:"application/json", buffer:Buffer.from(JSON.stringify(hostile))});
  await until(page, () => LISTS.length >= 4);
  const hl = await page.evaluate(() => LISTS.slice(2).map(l => ({n:l.name.length, items:l.items.map(x => [x.key, x.link, x.img, x.title]), sub:l.sub && l.sub.host})));
  check("import ostil: doar elementul valid, adrese periculoase eliminate, nume tăiat", hl[0].n === 60 && hl[0].items.length === 1 && hl[0].items[0][1] === null && hl[0].items[0][2] === null && hl[0].items[0][3] === "", hl);
  check("import ostil: abonamentul cu gazdă invalidă respins", hl.filter(x => x.sub).length === 1 && hl.find(x => x.sub).sub === "peertube.example");
  await page.setInputFiles("#libFile", {name:"b.json", mimeType:"application/json", buffer:Buffer.from("{nu e json")});
  await page.waitForTimeout(300);
  check("fișier invalid respins fără erori", errors.length === 0, errors);
  // persistență
  await page.reload(); await settle(page);
  check("listele supraviețuiesc reîncărcării", await page.evaluate(() => LISTS.length >= 4 && LISTS[0].name === "Redenumită"));
  // ștergere listă
  await page.evaluate(() => { LIB.tab = "lists"; LIB.open = LISTS[1].id; openPanel("lib"); });
  const nl0 = await page.evaluate(() => LISTS.length);
  await ck(page, "[data-act=ldel]"); await confirmYes(page);
  await until(page, n => LISTS.length === n, nl0 - 1);
  check("lista ștearsă după confirmare", await page.evaluate(() => LISTS.length) === nl0 - 1);
  check("fără erori", errors.length === 0, errors);
  await ctx.close();
}

console.log("4. adăugare din panoul de detalii");
{
  const {ctx, page, errors} = await open();
  await start(page);
  await page.keyboard.press("i"); await until(page, () => document.querySelector("#info.open"));
  check("selector „Adaugă la listă” în detalii", await page.locator("#ibody select.libpick").count() === 1);
  await page.selectOption("#ibody select.libpick", "__new");
  check("listă nouă creată cu titlul curent", await page.evaluate(() => LISTS.length === 1 && LISTS[0].items.length === 1 && /(Lista mea|My list) 1/.test(LISTS[0].name)));
  check("fără erori", errors.length === 0, errors);
  await ctx.close();
}

console.log("5. abonamente la liste publice PeerTube");
{
  const {ctx, page, errors, opts} = await open();
  await start(page);
  await openLib(page, "lists");
  for (const bad of ["http://peertube.example/w/p/abcd1234", "https://peertube.example/c/canal", "nu e adresă", "https://evil host/w/p/abcd1234", "javascript:alert(1)"]) {
    await page.fill("#subUrl", bad); await ck(page, "[data-form=sub] .btn");
    await page.waitForTimeout(150);
  }
  check("adrese invalide respinse (nicio listă)", await page.evaluate(() => LISTS.length) === 0);
  await page.fill("#subUrl", "https://peertube.example/w/p/abcd1234"); await ck(page, "[data-form=sub] .btn");
  await until(page, () => LISTS.length === 1);
  const l = await page.evaluate(() => LISTS[0]);
  check("abonament: nume din API, 2 titluri (null și nsfw sărite)", l.name === "Public Picks" && l.items.length === 2 && l.sub.host === "peertube.example" && l.sub.pid === "abcd1234", l);
  check("titlurile au gazda și id-ul corecte", l.items.every(x => x.v.host === "peertube.example" && /^pl-uuid-/.test(x.v.id) && x.kind === "full"));
  await page.fill("#subUrl", "https://peertube.example/w/p/abcd1234"); await ck(page, "[data-form=sub] .btn");
  await page.waitForTimeout(300);
  check("abonament duplicat respins", await page.evaluate(() => LISTS.length) === 1);
  await page.fill("#subUrl", "https://peertube.example/w/p/missing"); await ck(page, "[data-form=sub] .btn");
  await page.waitForTimeout(500);
  check("listă inexistentă: eroare, nimic adăugat", await page.evaluate(() => LISTS.length === 1 && /404/.test($("#toast").textContent)));
  // actualizare cu titlu nou
  opts.plMore = true;
  await page.evaluate(() => { LIB.open = LISTS[0].id; renderLib(); });
  await ck(page, "[data-act=refresh]");
  await until(page, () => LISTS[0].items.length === 3);
  check("actualizare: 1 titlu nou raportat", await page.evaluate(() => LISTS[0].sub.added) === 1);
  check("abonamentul nu poate fi editat (fără butoane de ordonare/ștergere titlu)", await page.locator(".lcard .lrow [data-act=idel]").count() === 0 && await page.locator("[data-act=addcur]").count() === 0);
  // copiere în listele mele
  await ck(page, "[data-act=copy]");
  await until(page, () => LISTS.length === 2);
  check("copie editabilă, fără abonament", await page.evaluate(() => !LISTS[1].sub && LISTS[1].items.length === 3));
  // redare din abonament
  await page.evaluate(() => playList(LISTS[0].id));
  await until(page, () => S.ch && S.ch.type === "pl" && S.items.length === 3);
  check("redarea unui abonament folosește ordinea listei", await page.evaluate(() => S.items[0].key.startsWith("pt:peertube.example:pl-uuid-1")));
  // reîmprospătare automată după 6 ore
  await page.evaluate(() => { LISTS[0].sub.at = Date.now() - 7 * 36e5; closePanels(); });
  opts.plMore = false;
  await page.keyboard.press("w");
  await until(page, () => LISTS[0].items.length === 2, null, 15000);
  check("reîmprospătare automată a abonamentului vechi la deschiderea panoului", true);
  check("fără erori", errors.length === 0, errors);
  await ctx.close();
}

console.log("6. verificarea legăturilor");
{
  const seed = {lists:[{id:"lst1", name:"De verificat", items:[snap("pt:peertube.example:gone111"), snap("pt:peertube.example:alive22"), snap("pt:peertube.example:flaky33"), snap("pt:peertube.example:alt4444")]}]};
  const {ctx, page, errors} = await open({seed, mock:{dead:["gone111", "peertube.example/alt4444"], netFail:["flaky33"]}});
  await start(page);
  await page.evaluate(() => { LISTS.splice(0, LISTS.length, ...JSON.parse(localStorage.getItem("vntv.lists")).map(cleanList)); });
  await openLib(page, "links");
  await until(page, () => LIB.chk && !LIB.chk.running, null, 30000);
  const lk = await page.evaluate(() => JSON.parse(JSON.stringify(LINKS)));
  check("titlul dispărut e marcat indisponibil", lk["pt:peertube.example:gone111"] && lk["pt:peertube.example:gone111"].ok === false, lk);
  check("titlul existent e marcat în regulă", lk["pt:peertube.example:alive22"] && lk["pt:peertube.example:alive22"].ok === true);
  check("eroarea de rețea NU marchează titlul ca indisponibil", !lk["pt:peertube.example:flaky33"]);
  check("titlul dispărut de pe o gazdă dar găsit pe alta rămâne în regulă", lk["pt:peertube.example:alt4444"] && lk["pt:peertube.example:alt4444"].ok === true);
  check("verificarea automată la deschiderea panoului", true);
  check("rezumat vizibil cu 1 indisponibil", /1/.test(await page.textContent("#libbody .stat")) && await page.locator("#libbody .lrow").count() === 1);
  check("titlul indisponibil e listat", /Seed pt:peertube.example:gone111/.test(await page.textContent("#libbody")));
  // redarea listei sare titlul indisponibil
  await page.evaluate(() => { playList("lst1"); });
  await until(page, () => S.ch && S.ch.type === "pl" && PL.started && S.items.length > 0);
  const plk = await page.evaluate(() => S.items.map(x => x.key));
  check("redarea listei sare titlurile indisponibile, păstrând ordinea celorlalte", !plk.some(k => k.endsWith("gone111")) && ["alive22", "flaky33", "alt4444"].every(n => plk.some(k => k.endsWith(n))) && plk.filter(k => k.startsWith("pt:")).map(k => k.split(":")[2]).join() === "alive22,flaky33,alt4444", plk);
  // reverificare forțată doar la cerere
  await page.keyboard.press("w"); await until(page, () => document.querySelector("#lib.open"));
  await ck(page, "#libtabs [data-tab=links]");
  await ck(page, "[data-act=check]");
  await until(page, () => LIB.chk && !LIB.chk.running);
  check("„Verifică acum” rulează din nou", await page.evaluate(() => LIB.chk.total) >= 3);
  // eliminarea celor indisponibile
  await ck(page, "[data-act=rmdead]"); await confirmYes(page);
  await until(page, () => LISTS[0].items.length === 3);
  check("titlurile indisponibile eliminate din liste", await page.evaluate(() => LISTS[0].items.every(x => !x.key.endsWith("gone111"))));
  check("fără erori", errors.length === 0, errors);
  await ctx.close();
}

console.log("7. date corupte și mod chioșc");
{
  const {ctx, page, errors} = await open({seed:{hist:"{{nu e json", lists:JSON.stringify([null, 5, {id:"!!", name:5, items:[{key:"x"}, {key:"vn:1", v:{host:"a b", id:"x"}}]}, {id:"ok1", name:"Bună", items:[], sub:{host:"a b", pid:"x"}}]), links:JSON.stringify({"vn:1":{ok:false, at:"x"}, "bad":1, "pt:h:2":5})}});
  check("pornește cu date corupte", errors.length === 0, errors);
  check("liste normalizate", await page.evaluate(() => LISTS.length === 2 && LISTS.every(l => typeof l.id === "string" && typeof l.name === "string" && !l.items.length && !l.sub)));
  await start(page);
  await openLib(page, "lists");
  check("panoul se desenează", await page.locator("#libbody .lcard").count() === 2 && errors.length === 0, errors);
  await ctx.close();
  const k = await open({query:"?kiosk=1&muted=1"});
  await until(k.page, () => S.started && S.items[S.idx]);
  await until(k.page, () => PL.started);
  check("modul chioșc nu înregistrează istoric", await k.page.evaluate(() => HIST.length === 0 && !localStorage.getItem("vntv.hist")));
  await k.ctx.close();
}

await browser.close();
console.log(`\n${pass} reușite, ${fail} eșuate`);
process.exit(fail ? 1 : 0);
