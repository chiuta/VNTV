# Testare pe dispozitive reale

Testele automate (`npm test`) rulează în Chromium, cu date simulate. Nu pot verifica Safari, AirPlay, Chromecast,
telecomenzile reale sau datele reale de pe videoneat.com. Lista de mai jos acoperă exact ce lipsește.
Bifează și notează versiunea browserului.

## 0. Date reale (o singură dată, de pe orice calculator)
- [ ] `node tools/coverage.mjs --csv acoperire.csv` — notează procentul de titluri redabile: ____ %
- [ ] `node tools/structure-check.mjs` — iese cu ✔
- [ ] Deschide `dist/vntv.html`: în Straturi → Surse scrie „Catalog: listă oficială” sau „citit de pe site”

## 1. iPhone — Safari (iOS ____)
- [ ] „Pornește emisia” pornește **cu sunet** din prima atingere
- [ ] Clipurile următoare pornesc singure, tot cu sunet
- [ ] Apare sfatul „Adaugă pe ecranul principal”; după adăugare, aplicația se deschide pe tot ecranul
- [ ] Imagine în imagine: butonul funcționează, emisia continuă când ieși din Safari
- [ ] AirPlay: butonul apare lângă un Apple TV și trimite imaginea
- [ ] Rotirea: pe verticală, banda cu titlul stă sub imagine; pe orizontală, comenzile încap
- [ ] Glisare stânga/dreapta = clip; sus/jos = canal; dublă atingere laterală = ±10 s
- [ ] Ecranul de blocare arată titlul și butoanele înainte/înapoi

## 2. Android — Chrome (Android ____)
- [ ] Pornire cu sunet, ecran complet, rotire pe orizontală
- [ ] Butonul „Înapoi” al telefonului închide panoul deschis, nu aplicația
- [ ] Chromecast: butonul apare în rețeaua cu Chromecast și trimite videoul
- [ ] Pe date mobile, cu economizorul de date pornit, calitatea automată e 480p
- [ ] Varianta găzduită: „Instalează aplicația” apare; aplicația instalată merge fără rețea până la ecranul de start

## 3. Tabletă (iPad / Android)
- [ ] Ghidul și panourile au lățimi potrivite; răsfoirea arată 3–4 coloane

## 4. Calculator — Chrome, Firefox, Safari, Edge
- [ ] Modul P2P: redarea pornește prin playerul PeerTube; bara de progres și timpul avansează
      (dacă stau pe loc, API-ul playerului nu răspunde — raportează versiunea PeerTube)
- [ ] În P2P, clipul următor pornește singur la final
- [ ] Emisia sincronizată: două browsere pe același canal arată același clip (±3 s)
- [ ] Tastele: ↑↓ ←→ Shift+←→ cifre G B O I H F M S V P C
- [ ] Traducerea din browser (Chrome/Edge): titlurile și subtitrările apar în limba aleasă

## 5. Televizor (Android TV / Fire TV / browser TV)
- [ ] Telecomanda: săgețile mută selecția în ghid și panouri; OK activează; Înapoi închide
- [ ] Textele se citesc de la 3 m
- [ ] Modul eco se pornește singur pe televizoarele slabe (fluid, fără sacadări)

## 6. Chioșc
- [ ] `?kiosk=1&muted=0` pe Chromium cu `--autoplay-policy=no-user-gesture-required` pornește singur, cu sunet
- [ ] După 24 h se reîncarcă (sau testează cu `&reload=0.01`)
