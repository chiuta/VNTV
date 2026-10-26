// Simulează videoneat.com, videos.trom.tf (API + player încorporat), LibreTranslate și o instanță PeerTube,
// ca testele să ruleze fără rețea. Nimic de aici nu ajunge în aplicație.
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname);
const CLIP30 = fs.readFileSync(path.join(dir, "fixtures/clip30.webm"));
const CLIP6 = fs.readFileSync(path.join(dir, "fixtures/clip6.webm"));

export const TITLES = [
  ["Mammal Origins", 128], ["The Secret Life of Deep Ocean Volcanoes", 128], ["Bat Superpowers", 21], ["Your Brain", 126],
  ["Black Holes Explained", 7], ["The Living Forest", 26], ["Code and Society", 15], ["Chemistry of Life", 31],
];
export function indexJSON(){
  return {v:1, generated:"2026-09-24T12:00:00Z", count:TITLES.length, items:TITLES.map(([t, c], i) => ({
    id:1000 + i, title:t, link:`https://www.videoneat.com/documentaries/${1000 + i}/x/`, date:"2026-01-0" + (i % 9 + 1), cats:[c, 2],
    img:null, trailer:{host:"videos.trom.tf", id:"T" + (1000 + i), dur:6}, year:"2025", length:"1 part (54 minutes)", source:"PBS",
    source_url:"https://www.pbs.org/x", excerpt:"Short description of " + t + ".",
  }))};
}
function wpPost(i){
  const [t, c] = TITLES[i], id = 1000 + i;
  return {id, date:"2026-01-01T00:00:00", title:{rendered:t}, link:`https://www.videoneat.com/documentaries/${id}/x/`, excerpt:{rendered:`<p>Short description of ${t}.</p>`}, categories:[c, 2],
    content:{rendered:`<iframe src="https://videos.trom.tf/videos/embed/T${id}?a=1"></iframe><div class="elementor-widget-text-editor"><div class="elementor-widget-container"><p><strong>YEAR:</strong> 2025 | <strong>LENGTH:</strong> 1 part (54 minutes) | <b>SOURCE: <a href="https://www.pbs.org/x">PBS</a></b></p></div></div><div class="elementor-widget-text-editor"><div class="elementor-widget-container"><p>Long description of ${t}. It explains many things.</p></div></div>`}};
}
const VTT = `WEBVTT

00:00:00.200 --> 00:00:02.500
Hello and welcome.

00:00:02.600 --> 00:00:05.800
This is science.
`;
// playerul PeerTube simulat: implementează protocolul jschannel ca playerul real
const EMBED = `<!doctype html><html><body style="margin:0;background:#123"><div id="st" style="color:#fff;font:20px sans-serif;padding:20px">EMBED</div><script>
const qs=new URLSearchParams(location.search); let pos=+(qs.get("start")||0), dur=6, state="playing", ready=false, vol=qs.get("muted")==="1"?0:1;
const send=m=>parent.postMessage(JSON.stringify(m),"*");
addEventListener("message",e=>{ let m; try{m=JSON.parse(e.data)}catch(x){return}
  if(m.method==="peertube::__ready"){ if(m.params==="ping") send({method:"peertube::__ready",params:"pong"}); ready=true; return; }
  const meth=(m.method||"").replace("peertube::","");
  if(meth==="play") state="playing"; if(meth==="pause") state="paused"; if(meth==="seek") pos=+m.params; if(meth==="setVolume") vol=+m.params;
  if(m.id) send({id:m.id,result:null}); window.__calls=(window.__calls||[]).concat(meth);
});
send({method:"peertube::__ready",params:"ping"});
setInterval(()=>{ if(!ready) return; if(state==="playing") pos+=0.25; if(pos>=dur){ pos=dur; state="ended"; }
  send({method:"peertube::playbackStatusUpdate",params:{position:pos,duration:dur,volume:vol,playbackState:state}});
  document.getElementById("st").textContent="EMBED "+pos.toFixed(1)+" "+state+" vol="+vol; if(state==="ended") state="stopped"; },250);
</script></body></html>`;

function rangeReply(route, buf){
  const h = route.request().headers()["range"];
  const base = {"content-type":"video/webm", "accept-ranges":"bytes", "access-control-allow-origin":"*"};
  if (h){
    const m = h.match(/bytes=(\d+)-(\d*)/); const s = +m[1], e = m[2] ? +m[2] : buf.length - 1;
    return route.fulfill({status:206, headers:{...base, "content-range":`bytes ${s}-${e}/${buf.length}`, "content-length":String(e - s + 1)}, body:buf.subarray(s, e + 1)});
  }
  return route.fulfill({status:200, headers:{...base, "content-length":String(buf.length)}, body:buf});
}
const J = (route, obj, status = 200, extra = {}) => route.fulfill({status, headers:{"content-type":"application/json", "access-control-allow-origin":"*", "access-control-expose-headers":"X-WP-TotalPages", ...extra}, body:JSON.stringify(obj)});

export async function install(page, opts = {}){
  const log = {requests:[], translate:0};
  page.on("request", r => log.requests.push(r.url()));
  await page.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (u.protocol === "file:") return route.continue();
    if (u.host === "www.videoneat.com"){
      if (u.pathname.startsWith("/wp-json/videoneat/v1/index") || u.pathname.endsWith("videoneat-index.json"))
        return opts.noIndex ? J(route, {code:"rest_no_route"}, 404) : J(route, indexJSON());
      const im = u.pathname.match(/\/wp-json\/videoneat\/v1\/item\/(\d+)/);
      if (im){ const i = +im[1] - 1000; return J(route, {id:+im[1], desc:"Full description of " + (TITLES[i] || ["video"])[0] + "."}); }
      const pm = u.pathname.match(/\/wp-json\/wp\/v2\/posts\/(\d+)/);
      if (pm){ const pi = +pm[1] - 1000; return TITLES[pi] ? J(route, wpPost(pi)) : J(route, {code:"rest_post_invalid_id"}, 404); }   // id necunoscut → 404 (nu mai oprește procesul de test)
      if (u.pathname === "/wp-json/wp/v2/posts"){
        const cat = +u.searchParams.get("categories") || 0, q = (u.searchParams.get("search") || "").toLowerCase();
        const list = TITLES.map((_, i) => wpPost(i)).filter(p => (!cat || p.categories.includes(cat)) && (!q || p.title.rendered.toLowerCase().includes(q)));
        return J(route, +u.searchParams.get("page") > 1 ? [] : list, 200, {"X-WP-TotalPages":"1"});
      }
      return route.fulfill({status:404, body:""});
    }
    if (u.host === "videos.trom.tf" || u.host === "peertube.example"){
      if (u.pathname.startsWith("/videos/embed/")) return route.fulfill({status:200, headers:{"content-type":"text/html"}, body: opts.deadEmbed ? "<!doctype html><body style='background:#321'>silent embed</body>"
        : opts.autoplayBlocked ? EMBED.replace('state="playing", ready=false','state="paused", ready=false').replace('if(meth==="play") state="playing";','') : opts.brokenPlayer ? EMBED.replace('send({method:"peertube::playbackStatusUpdate"', 'void ({method:"peertube::playbackStatusUpdate"') : EMBED});   // brokenPlayer: API-ul răspunde, dar playerul nu redă (ca în Edge)
      const cm = u.pathname.match(/\/api\/v1\/videos\/([^/]+)\/captions$/);
      if (cm) return J(route, {total:1, data:[{language:{id:"en", label:"English"}, captionPath:"/lazy-static/video-captions/x-en.vtt"}]});
      if (u.pathname.endsWith(".vtt")) return route.fulfill({status:200, headers:{"content-type":"text/vtt", "access-control-allow-origin":"*"}, body:VTT});
      const plm = u.pathname.match(/^\/api\/v1\/video-playlists\/([^/]+)(\/videos)?$/);
      if (plm){
        if (plm[1] === "missing") return J(route, {error:"not found"}, 404);
        if (!plm[2]) return J(route, {displayName:"Public Picks", id:5, uuid:plm[1]});
        const vids = [1, 2, 3, 4].map(n => ({id:n, position:n, video:n === 3 ? null : {uuid:"pl-uuid-" + n, nsfw:n === 4, shortUUID:"q" + n, name:"Playlist clip " + n, duration:6,
          truncatedDescription:"From a public playlist.", url:`https://${u.host}/w/q${n}`, previewPath:null, publishedAt:"2025-06-01", licence:{id:1, label:"CC BY"}, channel:{displayName:"Open Science Lab", url:`https://${u.host}/c/x`}}}));
        if (opts.plMore) vids.push({id:9, position:9, video:{uuid:"pl-uuid-9", nsfw:false, name:"Playlist clip 9", duration:6, url:`https://${u.host}/w/q9`, channel:{displayName:"Open Science Lab"}}});
        return J(route, {total:vids.length, data:vids});
      }
      const vm = u.pathname.match(/\/api\/v1\/videos\/([^/]+)$/);
      if (vm && (opts.dead || []).some(d => d === vm[1] || d === u.host + "/" + vm[1])) return J(route, {error:"gone"}, 404);
      if (vm && opts.netFail && opts.netFail.includes(vm[1])) return route.abort();
      if (vm) return J(route, {uuid:vm[1], shortUUID:vm[1], name:"x", duration:6, description:"PeerTube description.", thumbnails:[], previewPath:null,
        streamingPlaylists:[{playlistUrl:`https://${u.host}/hls/master.m3u8`, files: opts.allBad ? [{resolution:{id:720}, fileUrl:`https://${u.host}/static/bad720.webm`, hasVideo:true}]
          : opts.badTop ? [{resolution:{id:720}, fileUrl:`https://${u.host}/static/bad720.webm`, hasVideo:true}, {resolution:{id:480}, fileUrl:`https://${u.host}/static/clip6.webm`, hasVideo:true}]
          : [{resolution:{id:720, label:"720p"}, fileUrl:`https://${u.host}/static/clip6.webm`, hasVideo:true}]}], files:[]});
      if (/bad\d+\.webm$/.test(u.pathname)) return route.fulfill({status:404, body:""});
      if (u.pathname.endsWith("clip6.webm")) return rangeReply(route, CLIP6);
      if (u.pathname.endsWith("clip30.webm")) return rangeReply(route, CLIP30);
      const ch = u.pathname.match(/\/api\/v1\/video-channels\/([^/]+)(\/videos)?$/);
      if (ch && !ch[2]) return J(route, {displayName:"Open Science Lab", name:ch[1]});
      if (ch && ch[2]) return J(route, {total:4, data:[1, 2, 3, 4].map(n => ({uuid:"pt-uuid-" + n, nsfw: n === 4, shortUUID:"p" + n, name:"Open lecture " + n, duration:6,
        truncatedDescription:"An open lecture.", url:`https://${u.host}/w/p${n}`, previewPath:null, publishedAt:"2025-05-01", licence:{id:1, label:"CC BY"},
        category:{label:"Science & Technology"}, channel:{displayName:"Open Science Lab", url:`https://${u.host}/c/${ch[1]}`}}))});
      return route.fulfill({status:404, body:""});
    }
    if (u.host === "translate.test"){
      log.translate++;
      const b = JSON.parse(route.request().postData() || "{}");
      return J(route, {translatedText:`[${b.target}] ${b.q}`});
    }
    return route.abort();
  });
  return log;
}
