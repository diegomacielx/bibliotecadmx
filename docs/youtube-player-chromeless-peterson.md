# Player YouTube “chromeless” — documentação técnica

**Destinatário:** Peterson  
**Projeto de referência:** Biblioteca DMX  
**Objetivo:** Reproduzir vídeos do YouTube dentro da aplicação **sem qualquer vestígio perceptível da UI nativa do player** (barra de controles, botões, logo, overlays do iframe), substituindo-a por **controles 100% proprietários** (play/pause por clique, seek bar customizada, navegação, replay).

---

## 1. Problema e restrições da plataforma

O embed padrão do YouTube (`controls=1`) sempre injeta chrome nativo dentro do iframe cross-origin. Esse chrome **não pode ser estilizado nem removido via CSS/DOM** a partir da página pai por causa da **Same-Origin Policy**.

Abordagens que **não** resolvem o problema sozinhas:

| Abordagem | Limitação |
|-----------|-----------|
| `controls=0` via URL/API | Remove a barra principal, mas **ainda renderiza faixa inferior residual** (progresso/branding) em muitos viewports |
| `modestbranding=1` | Reduz logo; **não elimina** UI |
| `setPlaybackQuality()` / seletor de qualidade via IFrame API | **Deprecated / no-op** desde ~2019 para players HTML5; não confiar nisso |
| CSS `pointer-events: none` no iframe | Impede interação, mas **não esconde** visualmente o chrome |
| Overlay opaco sobre a barra | Hack frágil; quebra em resize, PiP, fullscreen nativo |

**Solução adotada:** combinação de (a) **desativação programática de chrome via `playerVars`**, (b) **recorte físico do iframe com overflow + offset negativo**, e (c) **reimplementação completa da UX de transporte** na camada DOM pai (fora do iframe).

---

## 2. Arquitetura em camadas

```
┌─────────────────────────────────────────────────────────────┐
│  CinemaLightbox (DOM pai, mesma origin)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ .cinema-overlay-controls (z-index 20, pointer-events) │  │
│  │   - navegação prev/next                               │  │
│  │   - VideoProgressBar (.cinema-seekbar, z-index 24)    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ .cinema-play-catch (z-index 2, hit area transparente) │  │
│  │   → togglePlay() via ref imperativa                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ .cinema-player-layer (overflow hidden)                │  │
│  │   └─ YouTubePlayer (.dmx-yt-root--chromeless)         │  │
│  │        └─ iframe (cross-origin, chrome recortado)      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Princípio:** tudo que o usuário vê e interage (exceto o quadro de vídeo em si) vive **fora** do iframe.

---

## 3. Componente `YouTubePlayer` — IFrame Player API

**Arquivo:** `src/components/YouTubePlayer.tsx`

### 3.1 Carregamento da API

Script oficial injetado uma única vez:

```javascript
https://www.youtube.com/iframe_api
```

Singleton `apiPromise` evita race conditions; callback global `onYouTubeIframeAPIReady` encadeado.

### 3.2 Instanciação do player

```typescript
new window.YT.Player(hostElement, {
  videoId,
  width: '100%',
  height: '100%',
  host: 'https://www.youtube.com',
  playerVars: { /* ver tabela abaixo */ },
  events: {
    onReady,
    onStateChange,
  },
});
```

### 3.3 `playerVars` — modo cinema (`controls={false}`)

| Parâmetro | Valor (chromeless) | Efeito técnico |
|-----------|-------------------|----------------|
| `controls` | `0` | Desabilita control bar nativa |
| `fs` | `0` | Desabilita botão fullscreen **nativo** do YouTube (fullscreen passa a ser DOM pai via `requestFullscreen`) |
| `disablekb` | `1` | Desabilita atalhos de teclado **dentro** do iframe (atalhos ficam na app) |
| `modestbranding` | `1` | Minimiza branding YouTube |
| `rel` | `0` | Não sugere vídeos relacionados ao fim |
| `iv_load_policy` | `3` | Desabilita anotações/cards interativos |
| `cc_load_policy` | `0` | Legendas off por padrão |
| `playsinline` | `1` | Reprodução inline em iOS |
| `enablejsapi` | `1` | Obrigatório para `playVideo`, `seekTo`, eventos |
| `origin` | `window.location.origin` | Requisito de segurança postMessage da API |
| `autoplay` | `1` ou `0` | Conforme UX |
| `mute` | `0` | Áudio habilitado no lightbox desktop |

Quando `controls={true}` (ex.: previews admin), a classe `dmx-yt-root--chromeless` **não** é aplicada — player legado com chrome nativo.

### 3.4 Classe condicional chromeless

```typescript
const rootClass = ['dmx-yt-root', !controls ? 'dmx-yt-root--chromeless' : ''].join(' ');
```

### 3.5 API imperativa exposta (`forwardRef`)

Interface `YouTubePlayerHandle`:

- `playVideo()` / `pauseVideo()` / `togglePlay()`
- `seekTo(seconds)` → `player.seekTo(seconds, true)`
- `getCurrentTime()` / `getDuration()` / `getVideoLoadedFraction()`
- `getPlayerState()` → estados YT: `-1` unstarted, `0` ended, `1` playing, `2` paused, `3` buffering, `5` cued
- `requestFullscreen()` → `player.getIframe()` ou container

Callbacks via **refs** (`onReadyRef`, `onEndedRef`) para evitar re-instanciar o player a cada render.

### 3.6 Eventos

```typescript
onStateChange: (event) => {
  if (event.data === 0) onEndedRef.current?.();      // YT.PlayerState.ENDED
  if (event.data === 1) onPlayStateChangeRef.current?.(true);  // PLAYING
  if (event.data === 2) onPlayStateChangeRef.current?.(false); // PAUSED
}
```

`onEnded` alimenta lógica de **loop** e overlay de replay no lightbox.

---

## 4. Recorte CSS da barra residual do YouTube

Mesmo com `controls=0`, o iframe ainda reserva ~**48–72px** na base para elementos internos do player HTML5.

**Arquivo:** `src/index.css` (bloco `.dmx-yt-root--chromeless`)

```css
.dmx-yt-root--chromeless {
  overflow: hidden;
}

.dmx-yt-root--chromeless .dmx-yt-host {
  overflow: hidden;
  position: relative;
}

.dmx-yt-root--chromeless .dmx-yt-host iframe {
  height: calc(100% + 72px) !important;
  margin-bottom: -72px;
}
```

**Mecânica:**

1. Container pai (`overflow: hidden`) define viewport visível = área desejada do vídeo.
2. Iframe é **maior** que o container (+72px de altura).
3. `margin-bottom: -72px` “puxa” o layout para cima, **empurrando a faixa inferior do iframe para fora** da área clipada.

O valor `72px` é empírico — funciona para o chrome residual atual do player embed. Se o YouTube alterar o layout interno, pode ser necessário recalibrar (tipicamente entre 60–80px).

**Importante:** `width/height: 100% !important` no iframe garante preenchimento horizontal; o crop só afeta a borda inferior.

---

## 5. Vídeo vertical (9:16) — modo `vertical-theater`

Exercícios filmados em portrait (Shorts / vertical). O stream YouTube ainda chega em container 16:9; é preciso **crop horizontal** para preencher viewport vertical sem letterboxing.

**Classe:** `.cinema-player-layer--vertical-theater`

```css
.cinema-player-layer--vertical-theater {
  overflow: hidden;
  background: #050506;
}

.cinema-player-layer--vertical-theater .dmx-yt-root {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  width: max(1920px, calc(100% * 256 / 81));
  transform: translateX(-50%);
}
```

- Largura superdimensionada (`256/81 ≈ 3.16×` aspect ratio efetivo) força zoom no eixo X.
- `translateX(-50%)` centraliza o crop.
- `max(1920px, …)` favorece buffer de qualidade em superfícies grandes (`largeSurface` no componente).

O recorte chromeless (`+72px / -72px`) **também** se aplica neste modo:

```css
.cinema-player-layer--vertical-theater .dmx-yt-root--chromeless .dmx-yt-host iframe {
  height: calc(100% + 72px) !important;
  margin-bottom: -72px;
}
```

Detecção de orientação: `resolveVideoOrientation()` em `src/lib/utils.ts` (metadados `videoOrientation`, `aspectRatio`, ou URL `/shorts/`).

---

## 6. Controles proprietários (substituem 100% da UI nativa)

### 6.1 Play / pause — `.cinema-play-catch`

**Arquivo:** `CinemaLightbox.tsx`

Botão transparente `position: absolute; inset: 0; z-index: 2` sobre o vídeo:

```tsx
<button
  type="button"
  className="cinema-play-catch absolute inset-0 z-[2]"
  onClick={() => playerRef.current?.togglePlay()}
/>
```

- Só renderizado quando **não** há overlay de replay (`showReplay === false`).
- Com `controls=0`, cliques no iframe não togglaram play de forma confiável cross-browser — a hit area fica no DOM pai.
- `z-index` inferior à seek bar (24) e overlay de replay (3).

Atalho global: `Space` → `togglePlay()` registrado no `keydown` do lightbox.

### 6.2 Seek bar — `VideoProgressBar`

**Arquivo:** `src/components/VideoProgressBar.tsx`

Implementação **sem** dependência de UI do YouTube:

| Funcionalidade | Implementação |
|----------------|---------------|
| Posição atual | Poll `getCurrentTime()` a cada 250ms |
| Duração | `getDuration()` quando disponível |
| Buffer | `getVideoLoadedFraction()` → barra buffered |
| Scrub | `pointerdown/move/up` + `setPointerCapture` |
| Seek | `player.seekTo(ratio * duration, true)` |
| Acessibilidade | `role="slider"`, `aria-valuenow/min/max` |

Estilos: `.cinema-seekbar` — pill glassmorphism flutuante, track + played + thumb; oculta com `.cinema-seekbar--hidden` quando auto-hide de controles (`controlsVisible === false`).

**Regra de ouro:** `onClick={(e) => e.stopPropagation()}` na seek bar para não disparar play/pause da camada inferior.

### 6.3 Navegação e auto-hide

**Container:** `.cinema-overlay-controls` — `pointer-events: none` no wrapper; filhos interativos reativam `pointer-events: auto`.

Timer de inatividade (`CONTROLS_HIDE_MS = 3200`): mousemove no lightbox reseta visibilidade de seek bar + nav prev/next.

### 6.4 Fim do vídeo / replay

Quando `onEnded` dispara e loop está desligado:

- `setShowReplay(true)` → overlay `.cinema-replay-overlay` com botão customizado.
- Remove `.cinema-play-catch` enquanto replay visível (evita toggle acidental).

Com loop habilitado (`videoLoop`):

```typescript
playerRef.current?.seekTo(0);
playerRef.current?.playVideo();
```

---

## 7. Integração no lightbox (desktop)

Trecho representativo (`CinemaLightbox.tsx`):

```tsx
<YouTubePlayer
  ref={playerRef}
  videoId={ytId}
  autoplay
  mute={false}
  controls={false}      // ← ativa pipeline chromeless
  largeSurface          // ← superfície grande → melhor rung ABR do YouTube
  onReady={handlePrimaryPlayerReady}
  onEnded={handlePlayerEnded}
/>

<button className="cinema-play-catch …" … />

<div className="cinema-overlay-controls">
  <VideoProgressBar
    playerRef={playerRef}
    readyToken={playerReadyToken}
    visible={controlsVisible}
    onInteract={resetHideTimer}
  />
</div>
```

**Modo comparador:** dois `YouTubePlayer` idênticos (`controls={false}`), cada um com `VideoProgressBar` e `cinema-play-catch` próprios; sync de play/pause via refs separadas.

---

## 8. Pré-aquecimento (latência de first frame)

**Arquivo:** `src/lib/videoPlaybackPrime.ts`

Objetivo: reduzir TTFF ao abrir o lightbox.

1. `preloadYouTubePlayerApi()` — carrega `iframe_api` antecipadamente.
2. `warmYouTubeVideo(videoId)` — iframe 1×1px off-screen com mesmos `playerVars` chromeless:

```
enablejsapi=1&autoplay=0&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3
```

3. `primeVideoPlaybackIntent(ex)` — chamado em hover / intenção de play no card.

Isso **não** substitui o player do lightbox (nova instância `YT.Player` no mount), mas aquece DNS/TLS/CDN e parsing da API.

---

## 9. Escopo mobile (decisão de produto)

No layout touch (`useTouchLayout()`), o lightbox **não** usa embed chromeless — exibe capa + botão **“Assistir no YouTube”** (`MobileWatchPanel` → `openYouTubeWatch()`).

Motivos típicos:

- Políticas de autoplay/unmute em iOS/Android.
- Menor ROI do crop + seek custom em viewport pequeno.
- Fullscreen nativo do app YouTube superior em mobile.

**Implicação para Peterson:** chromeless é **path desktop/tablet landscape**; mobile pode ser deep-link ou PiP nativo.

---

## 10. Preview nos cards (fora do escopo iframe)

Hover preview nos cards usa `<video>` HTML5 com MP4/CDN (`CardVideoPreview.tsx`), **não** o iframe YouTube — evita múltiplos iframes pesados na grid. Pipeline separado do lightbox.

---

## 11. APIs removidas / armadilhas

| Item | Status |
|------|--------|
| `setPlaybackQuality()` | No-op na prática; seletor de qualidade removido do produto |
| `getAvailableQualityLevels()` | Idem |
| Parâmetro URL `vq=hd2160` | Ignorado pelo player moderno; ABR automático por viewport/bitrate |
| `loop=1&playlist=VIDEO_ID` na URL | Alternativa ao loop via `onEnded` + `seekTo(0)`; usamos JS para controle fino (comparador, playlist) |

Qualidade HD/4K: confiar em **`largeSurface`** (iframe grande) + viewport generoso → ABR do YouTube sobe naturalmente.

---

## 12. Checklist de implementação (portável)

Para replicar em outro app (ex.: projeto do Peterson):

1. [ ] Wrapper React/Vanilla com **YouTube IFrame Player API** (não `<iframe src>` estático isolado, se precisar de seek imperativo).
2. [ ] Prop `controls={false}` + `playerVars` da tabela §3.3.
3. [ ] Classe `dmx-yt-root--chromeless` + **crop `+72px / -72px`** com `overflow: hidden`.
4. [ ] Camada `.cinema-play-catch` para toggle play/pause.
5. [ ] Seek bar custom polling `getCurrentTime` / `seekTo`.
6. [ ] `onStateChange` → `ENDED` para loop/replay.
7. [ ] Desabilitar `fs` e `disablekb` no iframe; keyboard shortcuts na página pai.
8. [ ] (Opcional) Modo vertical com overflow horizontal center-crop.
9. [ ] (Opcional) Warmup iframe hidden + preload API.
10. [ ] Testar resize, DPR alto, fullscreen do **container** (não iframe), e regressão se YouTube alterar altura do chrome (~72px).

---

## 13. Mapa de arquivos (Biblioteca DMX)

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/components/YouTubePlayer.tsx` | API YT, playerVars, chromeless class, ref imperativa |
| `src/components/VideoProgressBar.tsx` | Seek bar customizada |
| `src/components/CinemaLightbox.tsx` | Composição das camadas, play-catch, replay, compare |
| `src/index.css` | `.dmx-yt-root--chromeless`, `.cinema-seekbar*`, `.vertical-theater` |
| `src/lib/videoPlaybackPrime.ts` | Preload API + warm iframe |
| `src/lib/utils.ts` | `getYouTubeEmbedUrl()` (embed URL builder legado/auxiliar) |
| `src/types/youtube.d.ts` | Tipagem mínima IFrame API |

---

## 14. Limitações conhecidas (inerentes ao YouTube)

- **Cross-origin:** impossível ler DOM interno do iframe ou interceptar cliques dentro dele sem overlay.
- **ToS / branding:** embed ainda pode exibir watermark pontual ou “More videos” em edge cases; crop mitiga a barra inferior, não garante contrato zero UI em perpetuidade.
- **72px empírico:** monitorar player do YouTube após updates.
- **Autoplay com áudio:** browsers exigem gesto do usuário ou mute inicial; aqui autoplay desktop funciona após interação prévia (login/browse).
- **Fullscreen:** `requestFullscreen` no iframe pode ainda mostrar UI nativa do SO/browser — preferir fullscreen no container `.cinema-video-stage`.

---

## 15. Referências externas

- [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference)
- [Player Parameters (`playerVars`)](https://developers.google.com/youtube/player_parameters)
- Player states: `YT.PlayerState` (ENDED = 0, PLAYING = 1, PAUSED = 2)

---

*Documento gerado a partir da implementação em produção da Biblioteca DMX. Para dúvidas sobre este pipeline, contatar quem compartilhou este arquivo.*
