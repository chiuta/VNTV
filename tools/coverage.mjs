#!/usr/bin/env node
// Măsoară câte titluri VideoNeat pot rula în VNTV (au trailer PeerTube), direct din site-ul public.
// Rulare: node tools/coverage.mjs [--csv raport.csv]     (Node 18+, ~35 cereri pentru ~1.350 de articole)
import fs from "node:fs";
import { extract } from "./parse.mjs";
const WP = process.env.WP || "https://www.videoneat.com/wp-json/wp/v2";
const csvPath = process.argv.includes("--csv") ? process.argv[process.argv.indexOf("--csv") + 1] : null;
const rows = []; let page = 1, pages = 1;
do {
  const r = await fetch(`${WP}/posts?per_page=100&page=${page}&_fields=id,title,link,date,content,categories`);
  if (!r.ok) throw new Error(`HTTP ${r.status} la pagina ${page}`);
  pages = +r.headers.get("x-wp-totalpages") || page;
  for (const p of await r.json()){
    const e = extract(p.content?.rendered || "");
    rows.push({id:p.id, date:p.date.slice(0, 10), title:p.title.rendered.replace(/&#8217;/g, "’").replace(/&amp;/g, "&"), link:p.link,
      kind: e.trailer ? "peertube" : e.youtube ? "youtube" : "none", year:e.year, length:e.length, source:e.source});
  }
  process.stderr.write(`\rpagina ${page}/${pages}`);
} while (++page <= pages);
const n = k => rows.filter(r => r.kind === k).length, pc = x => (100 * x / rows.length).toFixed(1) + "%";
console.log(`\n\nArticole: ${rows.length}`);
console.log(`Cu trailer PeerTube (redabile în VNTV): ${n("peertube")} (${pc(n("peertube"))})`);
console.log(`Doar YouTube:                          ${n("youtube")} (${pc(n("youtube"))})`);
console.log(`Fără trailer:                          ${n("none")} (${pc(n("none"))})`);
console.log(`Cu an / durată / sursă extrase:        ${rows.filter(r => r.year).length} / ${rows.filter(r => r.length).length} / ${rows.filter(r => r.source).length}`);
const byYear = {}; for (const r of rows){ const y = r.date.slice(0, 4); byYear[y] = byYear[y] || {t:0, p:0}; byYear[y].t++; if (r.kind === "peertube") byYear[y].p++; }
console.log("\nPe anul publicării (redabile / total):"); for (const [y, v] of Object.entries(byYear).sort()) console.log(`  ${y}: ${v.p}/${v.t}`);
if (csvPath){
  const q = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
  fs.writeFileSync(csvPath, "id,date,kind,title,year,length,source,link\n" + rows.map(r => [r.id, r.date, r.kind, q(r.title), r.year, q(r.length), q(r.source), r.link].join(",")).join("\n"));
  console.log(`\nRaport complet: ${csvPath}`);
}
