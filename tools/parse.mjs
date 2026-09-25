// Extragerea datelor dintr-un articol VideoNeat (aceeași logică ca pluginul PHP), pentru uneltele din linia de comandă.
export function text(html){
  return String(html || "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
export function extract(html, hosts = ["videos.trom.tf"]){
  const out = {trailer:null, youtube:null, year:null, length:null, source:null, sourceUrl:null};
  for (const m of String(html).matchAll(/https?:\/\/([a-z0-9.-]+)\/(?:videos\/embed|videos\/watch|w)\/([A-Za-z0-9-]{6,})/gi)){
    if (hosts.includes(m[1].toLowerCase())){ out.trailer = {host:m[1].toLowerCase(), id:m[2]}; break; }
  }
  const y = String(html).match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/); if (y) out.youtube = y[1];
  const t = text(html);
  out.year = (t.match(/YEAR:\s*(\d{4})/i) || [])[1] || null;
  out.length = ((t.match(/LENGTH:\s*([^|\n]+)/i) || [])[1] || "").trim() || null;
  const s = String(html).match(/SOURCE:\s*(?:<[^>]+>\s*)*<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (s){ out.sourceUrl = s[1]; out.source = text(s[2]) || null; }
  return out;
}
