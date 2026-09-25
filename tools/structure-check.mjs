#!/usr/bin/env node
// Verificare periodică: au schimbat VideoNeat sau PeerTube structura de care depinde VNTV?
// Iese cu cod 1 (și un mesaj clar) dacă ceva s-a stricat — potrivit pentru cron (MAILTO) sau un timer systemd.
// Rulare: node tools/structure-check.mjs      Exemplu cron (luni, 07:15):  15 7 * * 1  node /opt/vntv/tools/structure-check.mjs
import { extract } from "./parse.mjs";
const problems = [], notes = [];
const get = async u => { const r = await fetch(u, {headers:{Accept:"application/json"}}); if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`); return r.json(); };
// 1. catalogul oficial (pluginul VideoNeat Index)
try {
  const j = await get("https://www.videoneat.com/wp-json/videoneat/v1/index");
  const withT = j.items.filter(x => x.trailer).length;
  notes.push(`catalog oficial: ${j.items.length} titluri, ${withT} cu trailer, generat ${j.generated}`);
  if (Date.now() - Date.parse(j.generated) > 7 * 864e5) problems.push("catalogul oficial nu a mai fost regenerat de peste 7 zile");
  if (withT < j.items.length * 0.3) problems.push(`doar ${withT} din ${j.items.length} titluri au trailer în catalog`);
} catch (e) { notes.push("catalogul oficial nu e disponibil (" + e.message + ") — VNTV folosește rezerva WordPress"); }
// 2. rezerva: ultimele 20 de articole trebuie să se poată citi
try {
  const posts = await get("https://www.videoneat.com/wp-json/wp/v2/posts?per_page=20&_fields=id,content");
  const ex = posts.map(p => extract(p.content?.rendered || ""));
  const t = ex.filter(e => e.trailer).length, y = ex.filter(e => e.year).length;
  notes.push(`ultimele 20 de articole: ${t} cu trailer PeerTube, ${y} cu an extras`);
  if (t < 10) problems.push(`doar ${t}/20 dintre articolele recente au un trailer recunoscut — s-a schimbat structura?`);
  if (y < 10) problems.push(`doar ${y}/20 au rândul „YEAR:” recunoscut — s-a schimbat șablonul?`);
  // 3. API-ul PeerTube pentru primul trailer
  const first = ex.find(e => e.trailer);
  if (first){
    const v = await get(`https://${first.trailer.host}/api/v1/videos/${first.trailer.id}`);
    const files = [...(v.streamingPlaylists?.[0]?.files || []), ...(v.files || [])].filter(f => f.fileUrl);
    notes.push(`PeerTube: „${v.name}”, ${files.length} fișiere, durată ${v.duration}s`);
    if (!files.length && !v.streamingPlaylists?.[0]?.playlistUrl) problems.push("PeerTube nu mai întoarce fișiere redabile");
  }
} catch (e) { problems.push("nu pot citi site-ul sau PeerTube: " + e.message); }
console.log(notes.map(n => "· " + n).join("\n"));
if (problems.length){ console.error("\nPROBLEME:\n" + problems.map(p => "✘ " + p).join("\n")); process.exit(1); }
console.log("\n✔ Structura e cea așteptată.");
