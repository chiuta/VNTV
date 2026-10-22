# Changelog

## 2.5.2 — 2026-10-22
- Texte rămase: mesajul „nu pot încărca lista” de pe ecranul de start și descrierea din panoul de transparență fff-kit urmează limba interfeței (și la schimbarea ei).

## 2.5.1 — 2026-10-19
- Texte rămase: meta description urmează limba interfeței (cheie nouă `metaDesc`, în toate cele 8 limbi); mesajul `<noscript>` este în cele 8 limbi.

## 2.5.0 — 2026-10-19
- Nou: **limba maghiară (hu)** — interfața completă (toate cele 209 de chei, inclusiv lista de canale, categoriile și panourile), ca a opta limbă; `i18n/hu.json`, `build.mjs` (LANG_ORDER) și testul de limbi extins la 8.
- Titlurile/descrierile VideoNeat rămân în engleză; traducerea automată (Translator API / LibreTranslate) le poate afișa în maghiară dacă motorul o acceptă.

## 2.4.0 — 2026-10-19
- Kitul comun fff 1.1.1 (eticheta „Transparență”, copie de siguranță `.fff.json`), aplicat în `src/index.template.html`; după `node build.mjs` se rulează `fff-kit info` pe cele trei ieșiri pentru `fff-info`/`app.json`.

## 2.3.0 — 2026-10-18
- Nou: **reziliență la erori de redare** (totul local, fără telemetrie). Ordinea la o eroare/blocaj: aceeași sursă încă o dată → alt fișier/altă calitate → playerul P2P → aceeași înregistrare pe altă instanță PeerTube → abia apoi clipul se sare.
- Se aleg doar formatele pe care browserul le poate reda; pe conexiune lentă / economisire de date se pornește cu calitate mai mică (plafon care se relaxează după 4 clipuri curate).
- Fără rețea: se așteaptă revenirea conexiunii (programul sincronizat nu se consumă), apoi redarea reia.
- Clipurile care au eșuat intră pe o listă neagră locală de 24 h (se sar fără așteptare; programul sincronizat rămâne același).
- După 5 clipuri la rând eșuate, redarea se oprește și apare o **bară de erori** cu motivul și acțiuni: calitate mai mică, comută P2P/direct, reîncearcă, clipul următor.
- Preîncărcare de metadate pentru clipul următor; jurnal local exportabil (ultimele 60 de evenimente) din panoul Straturi.
- 7 limbi (17 chei noi), 7 teste noi (`Reziliență: …`); corectat: aceeași adresă de fișier nu se reîncărca după o eroare.

## 2.2.0 — 2026-10-18
- Nou: panoul **Ecran** (butonul monitor din bara de comenzi; pe telefon, din panoul Straturi) cu toate variantele de trimitere pe alt ecran: Cast / AirPlay (când browserul îl permite), imagine în imagine, fereastră separată (se deschide pe al doilea monitor dacă browserul permite `getScreenDetails`) și link de chioșc + cod QR pentru TV / alt dispozitiv (același canal, pe tot ecranul, sincronizat cu programul; comutator „Cu sunet”).
- Linkul și QR-ul apar doar în varianta găzduită (HTTPS); copia dintr-un fișier local explică de ce nu au sens.
- Notă scurtă pe ecranul de start despre linkul pentru TV.
- 7 limbi (15 chei noi), test automat nou (`Ecran: …`), buton Buy Me a Coffee în panou.
- Versiune ridicată la 2.2.0.

## 2.1.4 — 2026-10-12
- 2.1.4 — 2026-10-12: versiunea și data ultimei actualizări sunt afișate în aplicație (panoul Straturi/Layers, în toate cele 7 limbi) și în `<meta name="application-version">` / `<meta name="last-updated">`; `package.json` are acum câmpul `updated`, folosit de `build.mjs` ca dată a construcției.
- Versiune ridicată la 2.1.4 (package.json, package-lock.json, sw.js generat).

## 2.1.3 — 2026-10-11 · runda 7
- UX: eroarea „nu pot încărca lista” de pe ecranul de start apare acum în pagină (sub text), nu ca notificare suprapusă peste sigla VNTV pe ecrane de 360 px; după pornire rămâne notificare.
- Fără rețea (`navigator.onLine === false`) catalogul nu mai încearcă la pornire cereri care oricum eșuează; se reîncarcă singur la revenirea conexiunii (evenimentul `online`).
- Versiune ridicată la 2.1.3 (package.json, package-lock.json, sw.js generat).

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
