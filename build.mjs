// Construiește VNTV dintr-o singură sursă în două variante:
//   index.html              — varianta găzduită, în rădăcină (GitHub Pages „main /root”), cu sw.js, manifest și pictograme alături (offline real)
//   dist/vntv.html          — un singur fișier, merge offline, se deschide direct din telefon sau calculator
//   deploy/site/index.html  — pentru găzduire pe HTTPS, cu manifest, pictograme și lucru offline (sw.js)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.dirname(new URL(import.meta.url).pathname);
const rd = f => fs.readFileSync(path.join(root, f), "utf8");
const pkg = JSON.parse(rd("package.json"));

const LANG_ORDER = ["en", "ro", "fr", "es", "de", "it", "pt", "hu"];
const i18n = {};
for (const l of LANG_ORDER) i18n[l] = JSON.parse(rd(`i18n/${l}.json`));
// verificare: toate limbile au toate cheile limbii engleze
const missing = [];
for (const l of LANG_ORDER) for (const k of Object.keys(i18n.en)) if (!(k in i18n[l])) missing.push(`${l}.${k}`);
if (missing.length) { console.error("Chei lipsă în traduceri:", missing.join(", ")); process.exit(1); }

const b64 = f => fs.readFileSync(path.join(root, "src/fonts", f)).toString("base64");
const fonts = `/* Oswald 700 — SIL Open Font License 1.1 (src/fonts/OFL-Oswald.txt), încorporat: fără cereri către terți */
@font-face{font-family:"VNTVDisplay";font-style:normal;font-weight:700;font-display:swap;src:url(data:font/woff2;base64,${b64("oswald-latin-ext-700-normal.woff2")}) format("woff2");
unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"VNTVDisplay";font-style:normal;font-weight:700;font-display:swap;src:url(data:font/woff2;base64,${b64("oswald-latin-700-normal.woff2")}) format("woff2");
unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`;

const jsFiles = fs.readdirSync(path.join(root, "src/js")).filter(f => f.endsWith(".js")).sort();
const js = jsFiles.map(f => `/* ---- ${f} ---- */\n` + rd(`src/js/${f}`)).join("\n");

// CSP: scriptul inline este permis prin hash SHA-256 (fără 'unsafe-inline' pentru script); recalculat la fiecare build
function withScriptHash(html){
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(m => !/type=["'](?!module|text\/javascript)/.test(m[1]))
    .map(m => `'sha256-${crypto.createHash("sha256").update(m[2], "utf8").digest("base64")}'`);
  if (!hashes.length || !html.includes("script-src 'unsafe-inline'")) throw new Error("CSP: nu am găsit script-src 'unsafe-inline' sau niciun script inline");
  return html.replace("script-src 'unsafe-inline'", () => "script-src " + hashes.join(" "));
}
function build(target, headLinks){
  const built = pkg.updated || new Date().toISOString().slice(0, 10);
  return withScriptHash(rd("src/index.template.html")
    .replace("{{HEAD_LINKS}}", headLinks)
    .replace("{{FONTS}}", () => fonts)
    .replace("{{CSS}}", () => rd("src/styles.css"))
    .replace("{{BODY}}", () => rd("src/body.html"))
    .split("{{VERSION}}").join(pkg.version).split("{{BUILT}}").join(built)
    .replace("{{BUILD_JSON}}", JSON.stringify({version:pkg.version, target, built}))
    .replace("{{I18N}}", () => JSON.stringify(i18n))
    .replace("{{JS}}", () => js));
}
fs.mkdirSync(path.join(root, "dist"), {recursive:true});
fs.mkdirSync(path.join(root, "deploy/site"), {recursive:true});
const single = build("single", `<link rel="apple-touch-icon" id="appleicon" href="">`);
fs.writeFileSync(path.join(root, "dist/vntv.html"), single);
const hosted = build("hosted", `<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" id="appleicon" href="icons/icon-180.png">
<link rel="icon" type="image/png" sizes="64x64" href="icons/favicon-64.png">`);
fs.writeFileSync(path.join(root, "deploy/site/index.html"), hosted);
fs.writeFileSync(path.join(root, "deploy/site/sw.js"), rd("src/sw.template.js").split("{{VERSION}}").join(pkg.version));
// rădăcina (GitHub Pages) servește varianta găzduită, ca service worker-ul și manifestul să existe cu adevărat
fs.writeFileSync(path.join(root, "index.html"), hosted);
fs.copyFileSync(path.join(root, "deploy/site/sw.js"), path.join(root, "sw.js"));
fs.copyFileSync(path.join(root, "deploy/site/manifest.webmanifest"), path.join(root, "manifest.webmanifest"));
fs.mkdirSync(path.join(root, "icons"), {recursive:true});
for (const f of fs.readdirSync(path.join(root, "deploy/site/icons"))) fs.copyFileSync(path.join(root, "deploy/site/icons", f), path.join(root, "icons", f));
console.log(`VNTV ${pkg.version}: index.html + dist/vntv.html (${(single.length / 1024).toFixed(0)} KB), deploy/site/index.html`);
