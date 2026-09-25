// Extrage JavaScript-ul din dist/vntv.html și rulează ESLint pe el și pe restul codului Node.
import fs from "node:fs"; import { execSync } from "node:child_process";
const html = fs.readFileSync("dist/vntv.html", "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
fs.mkdirSync(".lint", {recursive:true}); fs.writeFileSync(".lint/bundle.js", js);
execSync("npx eslint .lint/bundle.js stremio-addon tools build.mjs tests --max-warnings=0", {stdio:"inherit"});
