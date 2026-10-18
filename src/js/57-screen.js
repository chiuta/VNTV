/* =====================================================================
   Ecran: trimite canalul pe alt ecran — Cast/AirPlay, PiP, fereastră separată, link + QR pentru alt dispozitiv
   (generatorul QR este același encoder compact, mod octeți, folosit și în FASCICUL; fără resurse externe)
   ===================================================================== */
const QR=(()=>{
const ECC=[[-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28]];
const NB=[[-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49]];
const FB=[1,0]; // biți format: L=1, M=0
const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=(v/7|0)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
const cap=(v,l)=>(raw(v)>>3)-ECC[l][v]*NB[l][v];
const gm=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z};
const gen=d=>{const r=new Array(d).fill(0);r[d-1]=1;let root=1;for(let i=0;i<d;i++){for(let j=0;j<d;j++){r[j]=gm(r[j],root);if(j+1<d)r[j]^=r[j+1]}root=gm(root,2)}return r};
const rem=(data,g)=>{const r=g.map(()=>0);for(const b of data){const f=b^r.shift();r.push(0);g.forEach((c,i)=>r[i]^=gm(c,f))}return r};
function make(text){
  const bytes=[...new TextEncoder().encode(text)];
  const fit=l=>{for(let v=1;v<=40;v++){if(4+(v<10?8:16)+bytes.length*8<=cap(v,l)*8)return v}return 0};
  const vm=fit(1),vl=fit(0);let l,v;
  if(vm&&vm<=20){l=1;v=vm}else if(vl){l=0;v=vl}else throw new Error('Cod prea lung pentru QR');
  const bits=[];const put=(x,n)=>{for(let i=n-1;i>=0;i--)bits.push((x>>>i)&1)};
  put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(b=>put(b,8));
  const cb=cap(v,l)*8;put(0,Math.min(4,cb-bits.length));while(bits.length%8)bits.push(0);
  for(let p=0xEC;bits.length<cb;p^=0xEC^0x11)put(p,8);
  const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=b<<1|bits[i+j];data.push(b)}
  // blocuri + ECC
  const nb=NB[l][v],be=ECC[l][v],rc=raw(v)>>3,ns=nb-rc%nb,sl=(rc/nb|0),g=gen(be),blocks=[];
  for(let i=0,k=0;i<nb;i++){const dl=sl-be+(i<ns?0:1);const d=data.slice(k,k+dl);k+=dl;const e=rem(d,g);if(i<ns)d.push(0);blocks.push(d.concat(e))}
  const all=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==sl-be||j>=ns)all.push(b[i])});
  // matrice
  const size=v*4+17,m=Array.from({length:size},()=>new Array(size).fill(false)),f=Array.from({length:size},()=>new Array(size).fill(false));
  const set=(x,y,d)=>{m[y][x]=d;f[y][x]=true};
  for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  const finder=(x,y)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),xx=x+dx,yy=y+dy;if(xx>=0&&xx<size&&yy>=0&&yy<size)set(xx,yy,d!==2&&d!==4)}};
  finder(3,3);finder(size-4,3);finder(3,size-4);
  const ap=[];if(v>1){const n=(v/7|0)+2,st=v===32?26:Math.ceil((v*4+4)/(n*2-2))*2;ap.push(6);for(let p=size-7;ap.length<n;p-=st)ap.splice(1,0,p)}
  const na=ap.length;
  for(let i=0;i<na;i++)for(let j=0;j<na;j++){if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))continue;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
  const fmt=mk=>{const d=FB[l]<<3|mk;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=(d<<10|r)^0x5412,bt=i=>((b>>>i)&1)!==0;
    for(let i=0;i<=5;i++)set(8,i,bt(i));set(8,7,bt(6));set(8,8,bt(7));set(7,8,bt(8));for(let i=9;i<15;i++)set(14-i,8,bt(i));
    for(let i=0;i<8;i++)set(size-1-i,8,bt(i));for(let i=8;i<15;i++)set(8,size-15+i,bt(i));set(8,size-8,true)};
  fmt(0);
  if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=v<<12|r;for(let i=0;i<18;i++){const bt=((b>>>i)&1)!==0,a=size-11+i%3,c=(i/3|0);set(a,c,bt);set(c,a,bt)}}
  // codewords
  for(let i=0,right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;if(!f[y][x]&&i<all.length*8){m[y][x]=((all[i>>>3]>>>(7-(i&7)))&1)!==0;i++}}}
  const mask=k=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(f[y][x])continue;let inv;switch(k){case 0:inv=(x+y)%2===0;break;case 1:inv=y%2===0;break;case 2:inv=x%3===0;break;case 3:inv=(x+y)%3===0;break;case 4:inv=((x/3|0)+(y/2|0))%2===0;break;case 5:inv=x*y%2+x*y%3===0;break;case 6:inv=(x*y%2+x*y%3)%2===0;break;default:inv=((x+y)%2+x*y%3)%2===0}m[y][x]=m[y][x]!==inv}};
  const pen=()=>{let r=0,dark=0;for(let t=0;t<2;t++)for(let a=0;a<size;a++){let run=1,prev=null,s='';for(let b=0;b<size;b++){const c=t?m[b][a]:m[a][b];s+=c?'1':'0';if(c===prev){run++;if(run===5)r+=3;else if(run>5)r++}else run=1;prev=c}r+=40*((s.match(/(?=00001011101|10111010000)/g)||[]).length)}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const c=m[y][x];if(c)dark++;if(x<size-1&&y<size-1&&c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1])r+=3}
    return r+(Math.ceil(Math.abs(dark*20-size*size*10)/(size*size))-1)*10};
  let best=0,bp=1e9;for(let k=0;k<8;k++){mask(k);fmt(k);const p=pen();if(p<bp){bp=p;best=k}mask(k)}
  mask(best);fmt(best);
  return{size,m,v,l};
}
return{make};
})();
function drawQR(cv, text){
  const q = QR.make(text), n = q.size + 8, k = Math.max(3, Math.floor(480 / n));
  cv.width = cv.height = n * k; const c = cv.getContext("2d");
  c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = "#000";
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.m[y][x]) c.fillRect((x + 4) * k, (y + 4) * k, k, k);
}
let scrSound = false;
function screenUrl(){
  if (location.protocol === "file:") return null;                      // un link către un fișier local nu se poate deschide pe alt dispozitiv
  const q = new URLSearchParams({kiosk:"1", ch:String((P.ch | 0) + 1), lang:P.lang, muted:scrSound ? "0" : "1"});
  if (P.sync) q.set("sync", "1");
  return location.origin + location.pathname + "?" + q;
}
async function popOut(){
  const url = screenUrl() || location.href.split("#")[0] + "?kiosk=1";
  let feat = "popup=yes,width=1280,height=720";
  try{                                                                   // dacă browserul permite, fereastra se deschide direct pe al doilea monitor
    if (window.getScreenDetails){
      const d = await getScreenDetails(), s = d.screens.find(x => x !== d.currentScreen);
      if (s) feat = `popup=yes,left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`;
    }
  }catch(e){ /* permisiune refuzată sau indisponibilă: fereastră normală */ }
  const w = window.open(url, "vntv-screen", feat);
  if (!w) toast(t("scrWinBlocked"), 4200);
}
async function copyText(s){
  try{ await navigator.clipboard.writeText(s); return true; }catch(e){ /* fără permisiune */ }
  const ta = document.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;opacity:0";
  document.body.appendChild(ta); ta.select(); let ok = false; try{ ok = document.execCommand("copy"); }catch(e){ /* indisponibil */ } ta.remove(); return ok;
}
function renderScreen(){
  const b = $("#scbody"), url = screenUrl();
  const canCast = !$("#bcast").hidden && PL.mode === "direct";
  let h = `<div class="grp">${esc(t("scrCastH"))}</div><div class="scr"><p>${esc(t("scrCastD"))}</p>` +
    (canCast ? `<button class="btn pri" id="scCast">${esc(t("scrCastBtn"))}</button>` : `<p class="hintp">${esc(t("scrCastNo"))}</p>`) + `</div>`;
  if (CAN_PIP) h += `<div class="grp">${esc(t("scrPipH"))}</div><div class="scr"><p>${esc(t("scrPipD"))}</p><button class="btn" id="scPip">${esc(t("scrPipBtn"))}</button></div>`;
  h += `<div class="grp">${esc(t("scrWinH"))}</div><div class="scr"><p>${esc(t("scrWinD"))}</p><button class="btn" id="scWin">${esc(t("scrWinBtn"))}</button></div>`;
  h += `<div class="grp">${esc(t("scrLinkH"))}</div><div class="scr"><p>${esc(t("scrLinkD"))}</p>`;
  if (!url) h += `<p class="hintp">${esc(t("scrHost"))}</p>`;
  else h += `<label class="tg" for="scSnd"><span class="l">${esc(t("scrSound"))}</span><input type="checkbox" id="scSnd"${scrSound ? " checked" : ""}></label>
    <input type="text" id="scUrl" class="scurl" readonly value="${esc(url)}" aria-label="${esc(t("scrLinkH"))}">
    <div class="scbtns"><button class="btn" id="scCopy">${esc(t("scrCopy"))}</button><button class="btn" id="scShare">${esc(t("scrShare"))}</button></div>
    <canvas id="scQr" class="scqr" role="img" aria-label="${esc(t("scrQr"))}"></canvas>`;
  h += `</div>` + DONATE_PILL;
  b.innerHTML = h;
  $("#scCast")?.addEventListener("click", cast);
  $("#scPip")?.addEventListener("click", togglePip);
  $("#scWin").addEventListener("click", popOut);
  if (!url) return;
  const fill = () => { const u = screenUrl(); $("#scUrl").value = u; try{ drawQR($("#scQr"), u); }catch(e){ $("#scQr").hidden = true; } };
  fill();
  $("#scSnd").addEventListener("change", e => { scrSound = e.target.checked; fill(); });
  $("#scUrl").addEventListener("focus", e => e.target.select());
  $("#scCopy").addEventListener("click", async () => { toast(t((await copyText($("#scUrl").value)) ? "shareCopied" : "scrCopy"), 2600); });
  $("#scShare").addEventListener("click", async () => {
    const u = $("#scUrl").value;
    try{ if (navigator.share){ await navigator.share({title:"VNTV", url:u}); return; } }catch(e){ if (e && e.name === "AbortError") return; }
    toast(t((await copyText(u)) ? "shareCopied" : "scrCopy"), 2600);
  });
}

// pe telefon butonul „Ecran” nu încape în bara de comenzi: se deschide din panoul Straturi
$("#lbody").addEventListener("click", e => { if (e.target.closest("#goScreen")) openPanel("screen"); });
