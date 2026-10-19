# VNTV — VideoNeat Television

[English](README.md) · [Română](README.ro.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · **Português** · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Versão:** 2.4.0 · **Última atualização:** 2026-10-19

**Online / demonstração:** https://chiuta.github.io/VNTV/

![VNTV — captura de ecrã: o guia de TV (dados de teste simulados)](screenshot.png)

*A captura foi feita com dados de teste simulados (títulos fictícios, clipe de teste), não com o catálogo real.*

Um canal de TV científico non-stop e trade-free (livre de lógica comercial), construído a partir da coleção do [VideoNeat.com](https://www.videoneat.com):
canais sincronizados, guia de TV, catálogo navegável, legendas traduzidas, 7 idiomas, e funciona em telemóveis,
tablets, computadores e televisores. Sem contas, sem analítica, sem cookies; por predefinição a aplicação comunica apenas com os sítios próprios da TROM (videoneat.com e videos.trom.tf), ver *Privacidade e trade-free* mais abaixo.

## O que é

O VNTV reproduz os **trailers** dos documentários da coleção VideoNeat (alojados na instância PeerTube da TROM, `videos.trom.tf`) como um canal de televisão: canais por categorias, guia de TV, navegação pelo catálogo, legendas e 7 idiomas de interface. O projeto não aloja vídeo; mostra e remete para a fonte oficial. No canal TROM e nos canais PeerTube que você acrescentar reproduzem-se vídeos completos.

## Conteúdo deste repositório

| Pasta | O que é |
|---|---|
| `index.html`, `dist/vntv.html` | **A aplicação num único ficheiro.** Abra-a num navegador. Funciona também a partir da pasta Transferências de um telemóvel. |
| `deploy/site/` | A aplicação para alojar em HTTPS: instalável (ecrã principal / aplicação), funciona offline, ícones, service worker. |
| `wp-plugin/videoneat-index/` | **Plugin WordPress para o videoneat.com**: publica o catálogo JSON oficial usado pelo VNTV e pelo addon. |
| `stremio-addon/` | Addon do Stremio (7 idiomas, catálogo oficial, canais PeerTube adicionais, LibreTranslate opcional). |
| `src/`, `i18n/` | Fontes. `node build.mjs` produz as duas variantes da aplicação. |
| `tools/` | `coverage.mjs` (quantos títulos são reproduzíveis), `structure-check.mjs` (verificação semanal), `make-icons.py`. |
| `tests/` | Testes automáticos (Playwright, simulações offline). `npm test`. |
| `docs/` | Arquitetura, publicação, guia para os administradores da TROM, carta de proposta à TROM, lista de verificação em dispositivos reais, Android TV. |

## Funcionalidades

Verificadas no código:

- 14 canais por categorias, mais os **Favoritos** e o canal **TROM**; pode acrescentar canais PeerTube (Definições → Fontes).
- **Emissão sincronizada** (ON AIR): a programação é calculada a partir da data, pelo que todos os espectadores do mesmo canal veem o mesmo clipe no mesmo momento (requer o catálogo JSON com durações; sem ele, a aplicação mostra «NON-STOP», a sua própria lista de reprodução).
- Guia de TV, navegação pela coleção com pesquisa, ficha de detalhes, favoritos, pesquisa como «canal».
- Legendas do PeerTube (incluindo transcrições automáticas), tradução automática de títulos, descrições e legendas.
- 7 idiomas: inglês, romeno, francês, espanhol, alemão, italiano, português.
- Camadas de apresentação (logótipo, relógio, faixa, barra de progresso, ecrã «retro», etc.) e 4 predefinições: TV, Cinema, Retro, Limpo.
- Reprodução **P2P** (o leitor PeerTube) ou **direta** (ficheiro MP4); imagem em imagem, envio para a televisão, ecrã sempre ligado, controlos a partir do ecrã de bloqueio.
- Modo quiosque para ecrãs públicos: `?kiosk=1&ch=3&lang=en&preset=cinema&muted=0&reload=24`.
- A versão alojada pode ser instalada como aplicação e funciona offline quanto à interface (mas não quanto ao vídeo).

## Manual de utilização

1. Abra a página e prima o botão de arranque do ecrã inicial (ou Enter/Espaço).
2. Mude de canal com ↑ / ↓ (ou os dígitos 1–9); clipe seguinte / anterior com → / ←; Espaço ou K coloca em pausa.
3. Prima **G** para o guia de TV (canais e programa seguinte), **B** para explorar a coleção, **I** para os detalhes do clipe atual, **O** para camadas e definições, **S** para favoritos, **F** para ecrã inteiro, **H** para ecrã limpo, **M** para o som.
4. No telemóvel usa os botões no ecrã; toque no ecrã para mostrar os controlos.
5. Para outro idioma: Definições (O) → Idioma. A tradução automática pode ser desligada no mesmo local.
6. Para um canal PeerTube: Definições (O) → Mostrar tudo → Fontes → cole o endereço do canal (`https://instância/c/canal`) → Adicionar.
7. Se o P2P não funcionar ou não quiser que o seu endereço IP seja visível a outros espectadores: Definições → Rede → **Direta**.

## De onde o VNTV obtém os dados

1. **Catálogo oficial (preferido):** `https://www.videoneat.com/wp-json/videoneat/v1/index`, publicado pelo
   plugin `videoneat-index`. Um único ficheiro pequeno em cache: rápido, sem análise frágil, e traz as durações dos trailers,
   de que a **emissão sincronizada** precisa.
2. **Alternativa:** a API pública do WordPress, lendo cada artigo. Mais lento; a aplicação mostra com honestidade **NON-STOP**
   em vez de **ON AIR**, porque cada um recebe a sua própria lista de reprodução.
3. **Fontes adicionais:** qualquer canal PeerTube com vídeos de licença aberta pode ser acrescentado como canal (Camadas → Fontes).

## Reprodução

* **P2P** (predefinida em computadores e televisões): o leitor oficial do PeerTube, que reparte a carga entre os espectadores e
  reduz os custos do servidor da TROM. O VNTV controla-o através da API de incorporação do PeerTube.
* **Direta** (predefinida no iOS e em telemóveis com dados móveis): o ficheiro MP4 num elemento `<video>` — necessária para
  imagem em imagem, AirPlay e Chromecast, e mais leve para os dados móveis.
* Antes da primeira utilização do P2P, o VNTV explica que o P2P torna o IP do espectador visível aos outros espectadores e oferece
  em alternativa a reprodução direta. Se o leitor PeerTube não responder em 10 s, o VNTV passa para a reprodução direta.

## Canais

Categorias VideoNeat 1–14 (trailers) · 15 Favoritos · **16 TROM** (os documentários completos da TROM de videos.trom.tf)
· 17+ qualquer canal PeerTube acrescentado pelo espectador. O canal 16 pode ser removido em Definições → Fontes.

## Privacidade e trade-free

* **Armazenamento local (`localStorage`, apenas no seu navegador):** `vntv.prefs` (idioma, canal, definições), `vntv.ov` (camadas), `vntv.favs` (favoritos), `vntv.trc` (memória das traduções, máx. 2500). Sem cookies, contas ou analítica. Se `localStorage` não estiver disponível, a aplicação funciona com memória temporária. No modo quiosque as definições não são guardadas.
* Anfitriões contactados por predefinição: `www.videoneat.com` (catálogo, imagens; como alternativa, a API do WordPress) e `videos.trom.tf` (dados de vídeo, ficheiros, leitor P2P, legendas). Outros anfitriões apenas quando o espectador acrescenta um canal PeerTube, introduz um endereço LibreTranslate ou seleciona explicitamente o MyMemory. No modo P2P o leitor PeerTube liga-se também a outros espectadores (WebRTC). Quando a aplicação é servida por um anfitrião como o GitHub Pages, esse anfitrião vê a visita como em qualquer página web.
* Os tipos de letra estão incorporados (Oswald, SIL OFL). Sem Google Fonts, sem analítica, sem cookies.
* Tradução do conteúdo: o tradutor do navegador no dispositivo, ou o seu próprio **LibreTranslate**. O serviço comercial
  MyMemory (`api.mymemory.translated.net`) é usado **apenas se o espectador o selecionar explicitamente**, com um aviso (os textos a traduzir são-lhe enviados).
* Os favoritos, as definições e as traduções ficam no navegador do espectador.
* **Permissões:** ecrã sempre ligado (wake lock), ecrã inteiro, imagem em imagem. Não pede câmara, microfone nem localização.
* A página contém uma política CSP (`<meta>`) que limita os carregamentos a HTTPS/HTTP e bloqueia objetos e formulários.

## Limites e avisos

- A aplicação depende da disponibilidade de `videoneat.com` e `videos.trom.tf`; sem eles não tem nada para reproduzir.
- Os trailers pertencem aos seus produtores (PBS, BBC e outros) e são mostrados para descoberta, com ligação à fonte oficial. Para remoção de conteúdo: [TROM](https://www.tromsite.com/contact/); o que desaparece do VideoNeat / videos.trom.tf desaparece também do VNTV. O VNTV não mostra nem remete para ficheiros torrent/magnet.
- As traduções automáticas podem errar; pode sempre ver o original.
- As capturas de ecrã e os testes automáticos usam dados simulados; o funcionamento em dispositivos reais (TV, iOS, Cast) deve ser verificado segundo `docs/TESTING.md`.
- A disponibilidade do P2P, do AirPlay e do Cast difere entre navegadores e dispositivos.

## Changelog (2.3.0)

* 2.3.0 — 2026-10-18: resiliência a erros de reprodução — nova tentativa, alternativa de qualidade/formato, P2P e outro anfitrião PeerTube, espera offline, lista negra local de 24 h, barra de erros com ações, registo de erros local exportável (sem telemetria).

* 2.2.0 — 2026-10-18: novo painel **Ecrã** — Cast / AirPlay, imagem em imagem, janela separada (segundo monitor) e uma ligação de quiosque + código QR para uma televisão ou qualquer outro ecrã.

* 2.1.4 — 2026-10-12: a versão e a data da última atualização são agora apresentadas na aplicação (painel Camadas).
* Ecrã inicial: a mensagem «não é possível carregar a lista» é agora apresentada em linha, por baixo do texto de introdução, em vez de uma notificação que se sobrepunha ao logótipo do VNTV a 360 px; enquanto o navegador indica que está offline, o pedido do catálogo já não é tentado no arranque (repete-se sozinho no evento `online`).

* CSP: o script inline é agora permitido por hash SHA-256 (calculado por `build.mjs` em cada compilação); `script-src` já não contém `'unsafe-inline'`.
* O ecrã inicial mostra um aviso (7 idiomas) quando o navegador indica que está offline, uma vez que o VNTV não tem conteúdo offline.
* O conjunto de testes incluído (Playwright, rede simulada) corre agora neste ambiente: 25/25 aprovados na execução final (numa primeira execução um teste sensível ao tempo, a sincronização entre dois espectadores, falhou e passou ao repetir).
* O atributo `allow` da iframe do PeerTube só é definido quando a iframe é usada (elimina três avisos da consola no arranque).

* A aplicação está agora envolvida num marco `<main>` e o título «lower third» já não é um cabeçalho vazio (axe-core: 0 violações a 1280 e 360 px).
* A mensagem «não é possível carregar a lista» diz agora claramente que o VNTV não tem conteúdo offline e precisa de ligação à internet (7 idiomas).
* Versão elevada para 2.1.1 (package.json, lockfile, service worker gerado).
* Sem uma rede real o catálogo falta; a reprodução foi verificada apenas com a rede simulada dos testes, não com o videoneat.com (limite declarado).

## Licença

MIT, ver [LICENSE](LICENSE). Tipo de letra incorporado: Oswald, SIL OFL 1.1 (`src/fonts/OFL-Oswald.txt`, detalhes em [NOTICE.md](NOTICE.md)).

## Compilação e testes

```bash
node build.mjs                 # index.html + dist/vntv.html + deploy/site/index.html + sw.js
npm install                    # ESLint + Playwright (dev only)
npx playwright install chromium
npm run test:all               # lint + 25 end-to-end + 30 PHP + 33 addon tests, all offline
```

Abra `index.html` diretamente no navegador (é necessária internet para o catálogo e o vídeo). `node build.mjs` gera `index.html`, `dist/vntv.html` e `deploy/site/` e não requer `npm install`. Para os testes completos: `npm install`, `npm run test:all` (Playwright, PHP e Node; todos correm com dados simulados).

Publicação no GitHub Pages: `Settings → Pages → Source: GitHub Actions`; o workflow `.github/workflows/pages.yml` compila e publica `deploy/site` (mais `vntv.html` como transferência).

## Quiosque / ecrãs públicos

`vntv.html?kiosk=1&ch=3&lang=en&preset=cinema&muted=0&reload=24` — arranca sozinha, sem controlos, sem cursor,
recarrega diariamente. Prima **K** três vezes para sair.

## Autor

Alexio — Alexandru-Ionuț Chiuță, contacto: alexio@trom.tf

---
Ver [CHANGELOG.md](CHANGELOG.md).
