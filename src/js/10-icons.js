/* ---------- icoane (SVG în linie) ---------- */
const IC = {
  play:'<path d="M8 5v14l11-7z"/>', pause:'<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  prev:'<path d="M6 6h2v12H6zM9.5 12 18 18V6z"/>', next:'<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>',
  vol:'<path d="M4 9v6h4l5 5V4L8 9zM16.5 12A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/>',
  mute:'<path d="M4 9v6h4l5 5V4L8 9z"/><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2" fill="none"/>',
  full:'<path d="M4 4h6v2H6v4H4zm16 0v6h-2V6h-4V4zM4 20v-6h2v4h4v2zm16 0h-6v-2h4v-4h2z"/>',
  screen:'<rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20h8m-4-4v4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M7 11.5h10" stroke="currentColor" stroke-width="2"/>',
  guide:'<path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h12v2H3z"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5zm-9 9.5 2-1.1 7 3.9 7-3.9 2 1.1-9 5z"/>',
  info:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 10h2v7h-2zm0-3h2v2h-2z"/>',
  star:'<path d="m12 3 2.8 5.9 6.2.9-4.5 4.4 1 6.3-5.5-3-5.5 3 1-6.3L3 9.8l6.2-.9z"/>',
  staro:'<path d="m12 3 2.8 5.9 6.2.9-4.5 4.4 1 6.3-5.5-3-5.5 3 1-6.3L3 9.8l6.2-.9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  cast:'<path d="M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10zm20-7H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>',
  pip:'<path d="M19 7h-8v6h8zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18z"/>',
  lib:'<path d="M4 4h2v16H4zm4 0h2v16H8zm4.5.5 1.9-.6 4.6 15.3-1.9.6z"/>',
  browse:'<path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z"/>',
  up:'<path d="m7 14 5-5 5 5z"/>', down:'<path d="m7 10 5 5 5-5z"/>',
  share:'<path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>',
  cc:'<path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${IC[n]}</svg>`;
[["bprev","prev"],["bnext","next"],["bfull","full"],["bscreen","screen"],["bcast","cast"],["bpip","pip"],["bguide","guide"],["blayers","layers"],
 ["binfo","info"],["bbrowse","browse"],["blib","lib"],["bsubs","cc"],["bshare","share"],["chup","up"],["chdn","down"]].forEach(([id, n]) => { const e = $("#" + id); if (e) e.innerHTML = icon(n); });
