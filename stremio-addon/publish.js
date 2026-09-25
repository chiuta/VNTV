#!/usr/bin/env node
// Publică addonul în catalogul comunitar Stremio (după ce e găzduit pe HTTPS).
// Folosire: node publish.js https://stremio.domeniul-tau.tld/en/manifest.json
"use strict";
const url = process.argv[2];
if (!url || !/^https:\/\/.+\/manifest\.json$/.test(url)) {
  console.error("Folosire: node publish.js https://gazda-ta/<limba>/manifest.json   (trebuie HTTPS)");
  process.exit(1);
}
(async () => {
  // 1. verificăm că manifestul răspunde corect înainte de publicare
  const m = await fetch(url).then(r => { if (!r.ok) throw new Error("manifestul răspunde cu HTTP " + r.status); return r.json(); });
  if (m.id !== "tf.trom.videoneat") throw new Error("manifest neașteptat: " + m.id);
  // 2. publicare (API-ul public folosit și de stremio-addon-sdk)
  const r = await fetch("https://api.strem.io/api/addonPublish", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transportUrl: url, transportName: "http" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("publicarea a eșuat: " + JSON.stringify(j.error || j));
  console.log("Publicat în catalogul comunitar Stremio:", url);
})().catch(e => { console.error(e.message); process.exit(1); });
