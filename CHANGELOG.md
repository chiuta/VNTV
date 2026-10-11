# Changelog

## 2.1.2 — 2026-10-11 · runda 6
- Securitate: CSP cu hash SHA-256 pentru scriptul inline (`build.mjs`), fără `'unsafe-inline'` în `script-src`.
- Ecranul de start avertizează (7 limbi) când browserul raportează că nu are rețea.
- Versiune ridicată la 2.1.2 (package.json, package-lock.json, sw.js generat).

## 2.1.1 — 2026-10-11 · runda de reparații
- Accesibilitate: aplicația este încadrată în `<main>`, titlul din „lower third” nu mai e gol (axe-core: 0 violări la 1280 și 360 px).
- Mesajul de eroare la încărcarea listei spune acum explicit că VNTV nu are conținut offline și cere internet (7 limbi).
- Versiune ridicată la 2.1.1 (package.json, package-lock.json, sw.js generat).

## Neversionat — audit de publicare 2026-10-08
- Securitate: CSP în pagină (`<meta>`), adrese de imagine codificate în `url()` CSS (`cssUrl`), gazde PeerTube validate (`okHost`), `?index=` doar HTTPS, `<noscript>`.
- Plugin WP: postările protejate cu parolă nu mai intră în catalog; gazdele acceptate sunt validate ca nume DNS; `previewPath` trebuie să înceapă cu `/`.
- Addon Stremio: lista de gazde PeerTube permise (SSRF), expirare 15 s la cereri, `href` escapat în pagina de instalare.
- Documentație: formularea „fără cereri către terți” precizată; LICENSE (MIT), README.ro.md, workflow GitHub Pages.

## 2.1.0 — 2026-09-25 · tot ce a scos la iveală a doua recenzie

**Defecte reparate**
- „Răsfoiește colecția” de pe ecranul de start lăsa ecranul negru după închidere; acum canalul pornește în spatele panoului.
- Programul sincronizat se reamesteca zilnic la 03:00 (miezul nopții UTC). Acum curge în cicluri: ordinea se schimbă
  doar la finalul unui ciclu complet, între două clipuri, fără salt.

**Robustețe**
- Dacă playerul PeerTube (P2P) nu răspunde în 10 s, VNTV trece singur la redarea directă.
- Varianta găzduită cere întâi catalogul de la rețea (4 s), apoi din memoria locală — toți spectatorii au același program.
- Canalele PeerTube exclud conținutul marcat NSFW.
- Pluginul reindexează în loturi mici, cu buget de 20 s, ca să nu atingă limita de timp PHP.

**Confidențialitate și accesibilitate**
- Informare clară înainte de P2P (adresa IP e vizibilă altor spectatori), cu opțiunea „Folosește fișierul direct”.
- Pe telefoane, P2P automat doar pe Wi-Fi (Android); pe iOS rămâne redarea directă.
- Toate butoanele-pictogramă au nume accesibil, tradus; contrast mai bun; mărimea subtitrărilor reglabilă (4 trepte).

**Produs**
- Canalul implicit **TROM** (16): documentarele TROM complete de pe videos.trom.tf.
- Setările au un mod simplu (limbă, presetări, subtitrări) și „Arată toate setările”.

**Proiect**
- Pagina de administrare a pluginului în engleză, traductibilă (română inclusă: .po/.mo).
- Addon: limită de cereri pe IP, `/health`, cel mult 4 traduceri simultane, cache de traduceri pe disc.
- Git, CI (GitHub Actions + Codeberg Woodpecker), ESLint pe pachetul construit, `docs/ARCHITECTURE.md`,
  `NOTICE.md`, scrisoare de propunere către TROM (`docs/PROPOSAL-TROM.md`).
- Teste: 25 end-to-end, 30 PHP, 33 addon, plus ESLint pe tot codul.

**Corectură la 2.0.0:** jurnalul spunea „toate recomandările”. Mai exact: Android TV, testarea pe dispozitive reale
și măsurarea acoperirii erau **pregătite** (ghid, listă de verificare, unealtă), nu **făcute**. Sunt tot pregătite,
nu făcute: cer acces la dispozitive reale și la site-ul live.

## 2.0.0 — 2026-09-25 · toate recomandările din recenzie

**P0 — rapide și obligatorii**
- Fără Google Fonts: fontul Oswald e încorporat (SIL OFL), textul folosește fonturile sistemului. Zero cereri către terți.
- MyMemory (comercial) nu mai e folosit implicit; doar la alegerea explicită a spectatorului, cu avertisment.
  Ordinea implicită: traducerea din browser → LibreTranslate propriu → nimic.
- „ÎN EMISIE” apare doar când emisia e sincronizată cu adevărat; altfel „NON-STOP”.
- Pachet de găzduire pe HTTPS (`deploy/site/`): manifest, pictograme PNG, lucru offline (service worker).
- Unelte pentru date reale: `tools/coverage.mjs` (câte titluri sunt redabile) și listă de testare pe dispozitive (`docs/TESTING.md`).

**P1 — fundația**
- Pluginul WordPress **VideoNeat Index**: catalog JSON oficial (cache, ETag, CORS, fișier static, WP-CLI, pagină de
  acoperire). VNTV și addonul îl folosesc automat, cu rezervă la API-ul WordPress.
- Redare **P2P** prin playerul PeerTube, comandat prin API-ul de încorporare (implicit pe calculator și TV).
- **Subtitrări** din PeerTube (inclusiv transcrieri automate), traduse pe loc în limba spectatorului.

**P2 — „este TV”**
- **Emisie sincronizată** fără server: programul zilei e calculat din dată; ghidul arată ore reale; „Live” readuce în direct.
- **Mod eco** automat pe aparate slabe sau cu economizor de date.
- **Răsfoire** integrată (înlocuiește vechiul Explorator): grilă, categorii, căutare, detalii, „Redă acum”.
- Cod sursă modular (`src/`, `i18n/`), un singur dicționar pe limbă, build într-un singur fișier, 18 teste automate.
- Verificare săptămânală a structurii (`tools/structure-check.mjs`).

**P3 — extinderi**
- **Mod chioșc** (`?kiosk=1`) pentru ecrane publice.
- **Canale PeerTube** adăugate de spectator (videouri complete cu licențe libere) — în aplicație și în addon.
- Addonul Stremio: catalog oficial, canale PeerTube, script de publicare în catalogul comunitar.
- Ghid Android TV (Trusted Web Activity).

## 1.x
- VNTV: emisie continuă de trailere, 7 limbi, optimizare iOS/Android/tabletă/desktop/TV.
- Addon Stremio multilingv.
