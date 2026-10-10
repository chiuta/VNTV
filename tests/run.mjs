// Teste automate VNTV (Playwright + Chromium, fără rețea). Rulare: npm test
// Necesită Playwright instalat (npm i -D playwright) sau disponibil prin NODE_PATH.
import { createRequire } from "node:module";
import path from "node:path";
import { install, TITLES } from "./mock.mjs";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");  // din node_modules (npm install) sau din NODE_PATH
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const APP = "file://" + path.join(root, "dist/vntv.html");

const results = [];
async function test(name, fn){
  const t0 = Date.now();
  try{ await fn(); results.push([name, "OK", Date.now() - t0]); console.log("✔", name); }
  catch(e){ results.push([name, "FAIL: " + e.message.split("\n")[0], Date.now() - t0]); console.log("✘", name, "\n   ", e.message.split("\n").slice(0, 3).join("\n    ")); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:["--autoplay-policy=no-user-gesture-required"]});
async function open(ctxOpts = {}, mockOpts = {}, query = ""){
  const ctx = await browser.newContext({viewport:{width:1440, height:900}, ...ctxOpts});
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const log = await install(page, mockOpts);
  // implicit în teste: informarea P2P deja acceptată și toate setările vizibile (testele dedicate le verifică separat)
  if (!mockOpts.fresh) await page.addInitScript(() => { try{ if (!localStorage.getItem("vntv.prefs")) localStorage.setItem("vntv.prefs", JSON.stringify({p2pAck:true, adv:true})); }catch{ /* fără localStorage */ } });
  await page.goto(APP + query);
  return {ctx, page, log, errors};
}
const state = page => page.evaluate(() => ({mode:DATA.mode, live:S.live, idx:S.idx, key:S.items[S.idx]?.key, pl:PL.mode, pos:curTime(),
  label:$("#livelab").textContent, items:S.items.length, ch:S.chIdx, eco:document.body.classList.contains("eco")}));

await test("Pornire pe desktop: catalog oficial, emisie sincronizată, P2P prin playerul PeerTube", async () => {
  const {ctx, page, errors} = await open();
  await page.click("#go");
  await page.waitForFunction(() => PL.started && EMB.ready && PL.pos > 0, null, {timeout:15000}).catch(() => {});
  const s = await state(page);
  ok(s.mode === "index", "catalogul trebuia citit din lista JSON: " + s.mode);
  ok(s.live && s.label === "ON AIR", "trebuia „ON AIR”: " + s.label);
  ok(s.pl === "p2p", "pe desktop trebuia P2P: " + s.pl);
  ok(await page.evaluate(() => EMB.ready), "API-ul playerului încorporat nu s-a conectat");
  ok(s.pos > 0, "poziția nu avansează în P2P");
  ok(await page.isVisible("#frame"), "playerul P2P nu e vizibil");
  const before = s.key;
  await page.waitForTimeout(7000);
  ok((await state(page)).key !== before, "nu a trecut singur la clipul următor după „ended”");
  ok(!errors.length, "erori: " + errors.join(" | "));
  await ctx.close();
});

await test("Sincronizare: doi spectatori văd același clip în același moment", async () => {
  const a = await open(), b = await open();
  await Promise.all([a.page.click("#go"), b.page.click("#go")]);
  await a.page.waitForTimeout(2000); await b.page.waitForTimeout(100);
  const [sa, sb] = [await state(a.page), await state(b.page)];
  ok(sa.key === sb.key, `clipuri diferite: ${sa.key} vs ${sb.key}`);
  const [oa, ob] = await Promise.all([a.page, b.page].map(p => p.evaluate(() => S.items[S.idx]._start)));
  ok(oa === ob, "ora de început a clipului diferă");
  await a.ctx.close(); await b.ctx.close();
});

await test("Telefon (Pixel): redare directă din fișier, cu subtitrări", async () => {
  const {ctx, page, errors} = await open({...devices["Pixel 7"]});
  await page.tap("#go"); await page.waitForTimeout(2600);
  const s = await state(page);
  ok(s.pl === "direct", "pe telefon trebuia redare directă: " + s.pl);
  ok(await page.evaluate(() => !V.paused && V.currentTime > 0), "videoul nu rulează");
  let sub = "";
  for (let i = 0; i < 20 && !sub; i++){ await page.waitForTimeout(200); sub = await page.textContent("#subt"); }
  ok(/Hello and welcome|This is science/.test(sub), "subtitrarea nu apare: „" + sub + "”");
  ok(!errors.length, "erori: " + errors.join(" | "));
  await ctx.close();
});

await test("Subtitrări traduse (română, prin LibreTranslate)", async () => {
  const {ctx, page, log} = await open({...devices["Pixel 7"]});
  await page.evaluate(() => { P.lang = "ro"; P.trEngine = "libre"; P.trUrl = "https://translate.test"; savePrefs(); });
  await page.reload(); await page.tap("#go"); await page.waitForTimeout(1500);
  let sub = "";
  for (let i = 0; i < 20 && !/^\[ro\]/.test(sub); i++){ await page.waitForTimeout(250); sub = await page.textContent("#subt"); }
  const title = await page.textContent("#nowt");
  ok(/^\[ro\]/.test(sub), "subtitrarea nu e tradusă: „" + sub + "”");
  ok(/^\[ro\]/.test(title), "titlul nu e tradus: „" + title + "”");
  ok(log.translate > 0, "LibreTranslate nu a fost apelat");
  await ctx.close();
});

await test("Rezervă fără lista JSON: citire din WordPress, „NON-STOP” onest, redare", async () => {
  const {ctx, page, errors} = await open({}, {noIndex:true});
  await page.click("#go"); await page.waitForTimeout(3500);
  const s = await state(page);
  ok(s.mode === "wp", "trebuia modul de rezervă: " + s.mode);
  ok(!s.live && s.label === "NON-STOP", "eticheta trebuia NON-STOP: " + s.label);
  ok(s.items > 0 && s.key, "nu s-a încărcat nimic");
  ok(!errors.length, "erori: " + errors.join(" | "));
  await ctx.close();
});

await test("Răsfoire: grilă, detalii, „Redă acum”, ieșire și revenire în direct", async () => {
  const {ctx, page} = await open();
  await page.click("#go"); await page.waitForTimeout(1500);
  await page.keyboard.press("b"); await page.waitForTimeout(600);
  const n = await page.locator("#bgrid .card").count();
  ok(n === TITLES.length, `grila trebuia să aibă ${TITLES.length} titluri, are ${n}`);
  await page.locator("#bgrid .card").nth(3).click(); await page.waitForTimeout(400);
  ok(await page.isVisible("#bdet"), "detaliile nu s-au deschis");
  const pick = await page.evaluate(() => BR.cur.key);
  await page.click("[data-playnow]"); await page.waitForTimeout(1500);
  const s = await state(page);
  ok(s.key === pick, "nu rulează titlul ales");
  ok(!s.live && await page.isVisible("#blive"), "trebuia să iasă din direct și să arate butonul „Live”");
  await page.keyboard.press("o"); await page.waitForTimeout(500);
  ok(await page.evaluate(() => $("#app").scrollLeft === 0 && $("#app").scrollTop === 0), "ecranul s-a deplasat la deschiderea panoului");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.click("#blive"); await page.waitForTimeout(1500);
  ok((await state(page)).live, "nu a revenit în direct");
  await ctx.close();
});

await test("Canal PeerTube adăugat de spectator (videouri complete, licență liberă)", async () => {
  const {ctx, page} = await open();
  await page.click("#go"); await page.waitForTimeout(1200);
  await page.keyboard.press("o"); await page.waitForTimeout(400);
  await page.fill("#srcUrl", "https://peertube.example/c/openscience");
  await page.click("#srcAdd"); await page.waitForTimeout(1200);
  const n = await page.evaluate(() => channelList().length);
  ok(n === 17, "trebuiau 17 canale (14 VideoNeat + Favorite + TROM + cel nou), sunt " + n);
  await page.keyboard.press("Escape");
  await page.evaluate(() => switchChannel(16)); await page.waitForTimeout(2000);
  const it = await page.evaluate(() => S.items[S.idx]);
  ok(it && it.kind === "full" && it.licence === "CC BY", "canalul PeerTube nu rulează videouri complete: " + JSON.stringify(it && {k:it.kind, l:it.licence}));
  await ctx.close();
});

await test("Mod chioșc: pornește singur, fără comenzi, fără cursor", async () => {
  const {ctx, page} = await open({}, {}, "?kiosk=1&ch=3&preset=cinema");
  await page.waitForTimeout(3000);
  const s = await state(page);
  ok(s.ch === 2, "trebuia canalul 3, e " + (s.ch + 1));
  ok(await page.evaluate(() => S.started), "nu a pornit singur");
  ok(!(await page.isVisible("#ctl")) && !(await page.isVisible("#splash")), "comenzile sau ecranul de start sunt vizibile");
  ok(await page.evaluate(() => document.body.classList.contains("ov-letterbox")), "presetarea cinema nu s-a aplicat");
  await ctx.close();
});

await test("Mod eco: fără estompări și efecte grele", async () => {
  const {ctx, page} = await open({}, {}, "?eco=on");
  await page.waitForFunction(() => document.body.classList.contains("eco"), null, {timeout:5000}).catch(() => {});
  const s = await state(page);
  ok(s.eco, "clasa eco lipsește");
  const bf = await page.evaluate(() => getComputedStyle($("#toast")).backdropFilter);
  ok(bf === "none", "backdrop-filter încă activ: " + bf);
  await ctx.close();
});

await test("Fără cereri către terți: zero Google Fonts, zero MyMemory (implicit)", async () => {
  const {ctx, page, log} = await open();
  await page.evaluate(() => { P.lang = "fr"; savePrefs(); }); await page.reload();
  await page.click("#go"); await page.waitForTimeout(2500);
  const bad = log.requests.filter(u => /fonts\.(googleapis|gstatic)|mymemory|google-analytics|googletagmanager/.test(u));
  ok(!bad.length, "cereri nepermise: " + bad.join(", "));
  const hosts = [...new Set(log.requests.map(u => { try{ return new URL(u).host; }catch{ return ""; } }).filter(Boolean))];
  ok(hosts.every(h => ["www.videoneat.com", "videos.trom.tf"].includes(h)), "gazde neașteptate: " + hosts.join(", "));
  await ctx.close();
});

await test("7 limbi: interfața se schimbă complet, fără chei netraduse", async () => {
  const {ctx, page} = await open();
  for (const l of ["ro", "fr", "es", "de", "it", "pt", "en"]){
    await page.evaluate(x => setLang(x), l); await page.waitForTimeout(150);
    const raw = await page.evaluate(() => [...document.querySelectorAll("[data-i],[data-it],[data-ip]")].filter(e =>
      (e.dataset.i && e.textContent === e.dataset.i) || (e.dataset.it && e.title === e.dataset.it) || (e.dataset.ip && e.placeholder === e.dataset.ip)).map(e => e.dataset.i || e.dataset.it || e.dataset.ip));
    ok(!raw.length, `${l}: chei afișate netraduse: ${raw.join(", ")}`);
  }
  ok(await page.textContent("#go") === "Start broadcast", "revenirea la engleză a eșuat");
  await ctx.close();
});


await test("Defect reparat: „Răsfoiește colecția” de la start → canalul rulează în spate", async () => {
  const {ctx, page} = await open();
  await page.click("#gobrowse"); await page.waitForTimeout(2500);
  ok(await page.isVisible("#browse"), "răsfoirea nu s-a deschis");
  await page.keyboard.press("Escape"); await page.waitForTimeout(800);
  const s = await state(page);
  ok(s.idx >= 0 && s.pos > 0, "după închiderea răsfoirii nu rulează nimic: " + JSON.stringify(s));
  await ctx.close();
});

await test("Program pe cicluri: fără salt la miezul nopții, continuitate între cicluri", async () => {
  const {ctx, page} = await open();
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const ch = channelList()[0], all = DATA.all;
    const mid = Date.UTC(2026, 8, 26), a = buildSchedule(ch, all, mid - 20000), b = buildSchedule(ch, all, mid + 20000);
    const key = sc => sc.items[0].key;
    // clipul care rulează la 00:00:20 UTC trebuie să fie fie același, fie următorul față de cel de la 23:59:40
    const cont = key(b) === key(a) || key(b) === a.items[1].key;
    // la granița dintre cicluri, programul continuă cu ciclul următor fără goluri
    const cyc = all.reduce((x, it) => x + (it.dur || DEF_DUR) + GAP, 0) * 1000;
    const k = Math.floor((mid - EPOCH) / cyc), edge = EPOCH + (k + 1) * cyc;
    const c = buildSchedule(ch, all, edge - 1000), d = buildSchedule(ch, all, edge + 1000);
    const gapless = c.items.every((it, i) => i === 0 || Math.abs(it._start - c.items[i - 1]._start - ((c.items[i - 1].dur || DEF_DUR) + GAP) * 1000) < 2);
    return {cont, gapless, edgeNext: d.items[0].key === c.items[1].key && Math.abs(d.items[0]._start - c.items[1]._start) < 2};
  });
  ok(r.cont, "salt la miezul nopții UTC");
  ok(r.gapless && r.edgeNext, "discontinuitate la granița dintre cicluri: " + JSON.stringify(r));
  await ctx.close();
});

await test("P2P care nu răspunde → trecere automată la redarea directă", async () => {
  const {ctx, page} = await open({}, {deadEmbed:true});
  await page.click("#go");
  await page.waitForFunction(() => PL.mode === "p2p", null, {timeout:15000}).catch(() => {});
  const st0 = await state(page);
  ok(st0.pl === "p2p", "trebuia să înceapă în P2P: " + JSON.stringify(st0));
  await page.waitForTimeout(11500);
  const s = await state(page);
  ok(s.pl === "direct" && await page.evaluate(() => S.p2pBroken && !V.paused), "nu a trecut la redarea directă: " + JSON.stringify(s));
  await ctx.close();
});

await test("Informare P2P (IP vizibil) cu alegere: „Folosește fișierul direct”", async () => {
  const {ctx, page} = await open({}, {fresh:true});
  await page.click("#go"); await page.waitForTimeout(3200);
  ok(await page.isVisible("#p2pnote"), "informarea P2P nu apare");
  await page.click("#p2pDirect"); await page.waitForTimeout(1500);
  const s = await state(page);
  ok(s.pl === "direct" && await page.evaluate(() => P.net === "direct" && P.p2pAck), "alegerea nu a fost aplicată");
  await page.reload(); await page.click("#go"); await page.waitForTimeout(3200);
  ok(!(await page.isVisible("#p2pnote")), "informarea reapare după ce a fost acceptată");
  await ctx.close();
});

await test("Accesibilitate: toate butoanele-pictogramă au nume accesibil", async () => {
  const {ctx, page} = await open();
  const bad = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => !b.textContent.trim() && !b.getAttribute("aria-label")).map(b => b.id || b.className));
  ok(!bad.length, "fără aria-label: " + bad.join(", "));
  await page.evaluate(() => setLang("de")); await page.waitForTimeout(100);
  ok(await page.getAttribute("#bguide", "aria-label") === "TV-Programm", "aria-label netradus: " + await page.getAttribute("#bguide", "aria-label"));
  await ctx.close();
});

await test("Mod simplu al setărilor, cu „Arată toate setările” și mărimea subtitrărilor", async () => {
  const {ctx, page} = await open({}, {fresh:true});
  await page.evaluate(() => { P.p2pAck = true; savePrefs(); });
  await page.click("#go"); await page.waitForTimeout(1200);
  await page.keyboard.press("o"); await page.waitForTimeout(400);
  const few = await page.locator("#lbody .tg").count();
  ok(few <= 3 && !(await page.isVisible("[data-p=sync]")), "modul simplu arată prea multe: " + few);
  await page.click("[data-seg=subSize] [data-v=xl]"); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.body.classList.contains("subs-xl")), "mărimea subtitrărilor nu s-a aplicat");
  await page.click("#advT"); await page.waitForTimeout(300);
  ok(await page.isVisible("[data-p=sync]") && await page.locator("#lbody .tg").count() > 10, "modul avansat nu arată toate setările");
  await ctx.close();
});

await test("Canalul TROM implicit: documentare complete, fără conținut marcat NSFW", async () => {
  const {ctx, page} = await open();
  await page.click("#go"); await page.waitForTimeout(1200);
  const ch = await page.evaluate(() => channelList()[15]);
  ok(ch.type === "pt" && ch.src.host === "videos.trom.tf" && ch.src.handle === "trom", "canalul 16 nu e TROM: " + JSON.stringify(ch));
  await page.evaluate(() => switchChannel(15)); await page.waitForTimeout(2000);
  const r = await page.evaluate(() => ({kind:S.items[S.idx]?.kind, n:new Set(S.items.map(x => x.key)).size, nsfw:S.items.some(x => /pt-uuid-4/.test(x.key))}));
  ok(r.kind === "full" && r.n === 3 && !r.nsfw, "canalul TROM: " + JSON.stringify(r));
  await ctx.close();
});

await test("Varianta găzduită: se instalează și merge offline (service worker + manifest)", async () => {
  const http = await import("node:http"), fs = await import("node:fs");
  const siteDir = path.join(root, "deploy/site");
  const types = {".html":"text/html", ".js":"text/javascript", ".webmanifest":"application/manifest+json", ".png":"image/png"};
  const srv = http.createServer((q, r) => {
    const f = path.join(siteDir, decodeURIComponent(new URL(q.url, "http://x").pathname.replace(/\/$/, "/index.html")));
    if (!f.startsWith(siteDir) || !fs.existsSync(f)){ r.writeHead(404); r.end(); return; }
    r.writeHead(200, {"content-type": types[path.extname(f)] || "application/octet-stream"}); r.end(fs.readFileSync(f));
  }).listen(8799);
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.route(/videoneat\.com|videos\.trom\.tf/, r => r.abort());
  try{
    await page.goto("http://localhost:8799/"); await page.waitForTimeout(2500);
    ok(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), "service worker neînregistrat");
    ok(await page.evaluate(async () => (await fetch(document.querySelector("link[rel=manifest]").href)).ok), "manifest indisponibil");
    await page.reload(); await page.waitForTimeout(800);
    await ctx.setOffline(true); await page.reload(); await page.waitForTimeout(1000);
    ok(await page.textContent("#go") === "Start broadcast", "aplicația nu se deschide offline");
  } finally { await ctx.close(); srv.close(); }
});

for (const [name, dev] of [["iPhone 13", devices["iPhone 13"]], ["iPhone 13 orizontal", devices["iPhone 13 landscape"]], ["Pixel 7", devices["Pixel 7"]],
  ["iPad Pro 11", devices["iPad Pro 11 landscape"]], ["Desktop 1440", {viewport:{width:1440, height:900}}], ["TV 1920", {viewport:{width:1920, height:1080}}]]){
  await test(`Aspect: ${name} — comenzile încap pe ecran`, async () => {
    const {ctx, page, errors} = await open(dev);
    if (dev.hasTouch) await page.tap("#go"); else await page.click("#go");
    await page.waitForTimeout(1500);
    await page.evaluate(() => showUI(true)); await page.waitForTimeout(400);
    const over = await page.evaluate(() => { const r = $("#ctl .row").getBoundingClientRect();
      return [...$$("#ctl .row > *")].filter(e => getComputedStyle(e).display !== "none" && !e.hidden).filter(e => e.getBoundingClientRect().right > r.right + 1).map(e => e.id || e.className); });
    ok(!over.length, "ies din ecran: " + over.join(", "));
    await page.screenshot({path:path.join(root, "tests/out", name.replace(/\W+/g, "_") + ".png")});
    ok(!errors.length, "erori: " + errors.join(" | "));
    await ctx.close();
  });
}

await browser.close();
const failed = results.filter(r => r[1] !== "OK");
console.log(`\n${results.length - failed.length}/${results.length} teste trecute`);
process.exit(failed.length ? 1 : 0);
