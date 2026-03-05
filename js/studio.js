/* ============================================================
   MARGO — js/studio.js
   v5.5 — concept-v2
   • Color swatches: compact pill/circle grid (not giant blocks)
   • Canvas redraws immediately on EVERY control change
   • Font cards activate + redraw canvas correctly
   • Photo upload zone visible and functional
   • MARGO wordmark size matches gif-studio.js
   • drawPosterToCtx is CANONICAL here — gif-studio.js defers to this
   • VIBE replaces EMOTION in all labels
   ============================================================ */

/* ── CANONICAL FLAG: gif-studio.js checks this before defining drawPosterToCtx ── */
window.STUDIO_POSTER_CANONICAL = true;

/* ══════════════════════════════════════════════════════════
   DESIGN CONFIG
══════════════════════════════════════════════════════════ */
const STUDIO_DESIGNS = [
  {
    id: 'midnight', label: 'Midnight',
    bg: (w, h, ctx) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.6, h);
      g.addColorStop(0, '#0B0B0D'); g.addColorStop(1, '#1A1420');
      return g;
    },
    accentColor: '#E8C547', textColor: '#F0F0F0', metaColor: 'rgba(240,240,240,0.5)',
    swatchCss: 'linear-gradient(135deg,#0B0B0D,#1A1420)',
  },
  {
    id: 'velvet', label: 'Velvet',
    bg: (w, h, ctx) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.7, h);
      g.addColorStop(0, '#1a0520'); g.addColorStop(1, '#0f0010');
      return g;
    },
    accentColor: '#C084FC', textColor: '#F5E6FF', metaColor: 'rgba(245,230,255,0.5)',
    swatchCss: 'linear-gradient(135deg,#1a0520,#0f0010)',
  },
  {
    id: 'ember', label: 'Ember',
    bg: (w, h, ctx) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.6, h);
      g.addColorStop(0, '#1a0800'); g.addColorStop(1, '#2a1000');
      return g;
    },
    accentColor: '#FF6440', textColor: '#FFF0E8', metaColor: 'rgba(255,240,232,0.5)',
    swatchCss: 'linear-gradient(135deg,#1a0800,#2a1000)',
  },
  {
    id: 'ocean', label: 'Ocean',
    bg: (w, h, ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#020c18'); g.addColorStop(1, '#051a30');
      return g;
    },
    accentColor: '#6B8CFF', textColor: '#E8F0FF', metaColor: 'rgba(232,240,255,0.5)',
    swatchCss: 'linear-gradient(135deg,#020c18,#051a30)',
  },
  {
    id: 'forest', label: 'Forest',
    bg: (w, h, ctx) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.5, h);
      g.addColorStop(0, '#020e08'); g.addColorStop(1, '#071a0e');
      return g;
    },
    accentColor: '#4ade80', textColor: '#E8FFE8', metaColor: 'rgba(232,255,232,0.5)',
    swatchCss: 'linear-gradient(135deg,#020e08,#071a0e)',
  },
  {
    id: 'rose', label: 'Rose',
    bg: (w, h, ctx) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.7, h);
      g.addColorStop(0, '#1a0510'); g.addColorStop(1, '#2a0a18');
      return g;
    },
    accentColor: '#FF6B9D', textColor: '#FFE8F0', metaColor: 'rgba(255,232,240,0.5)',
    swatchCss: 'linear-gradient(135deg,#1a0510,#2a0a18)',
  },
];

const STUDIO_FONTS = [
  { id: 'playfair',   label: 'Playfair',    css: "'Playfair Display', serif",       weight: '700',   style: 'normal',  preview: 'Aa'  },
  { id: 'cormorant',  label: 'Cormorant',   css: "'Cormorant Garamond', serif",      weight: '600',   style: 'italic',  preview: 'Aa'  },
  { id: 'lora',       label: 'Lora',        css: "'Lora', serif",                   weight: '600',   style: 'italic',  preview: 'Aa'  },
  { id: 'merriweather',label:'Merriweather', css: "'Merriweather', serif",           weight: '700',   style: 'normal',  preview: 'Aa'  },
  { id: 'josefin',    label: 'Josefin',     css: "'Josefin Sans', sans-serif",       weight: '700',   style: 'normal',  preview: 'Aa'  },
  { id: 'bebas',      label: 'Bebas',       css: "'Bebas Neue', display",            weight: '400',   style: 'normal',  preview: 'AA'  },
  { id: 'syne',       label: 'Syne',        css: "'Syne', sans-serif",              weight: '800',   style: 'normal',  preview: 'Aa'  },
  { id: 'dm',         label: 'DM Serif',    css: "'DM Serif Display', serif",       weight: '400',   style: 'italic',  preview: 'Aa'  },
];

/* ── Emotion vibe colors ── */
const VIBE_COLORS = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};
const VIBE_LABELS = {
  Love:'Love', Heartbreak:'Heartbreak', Hope:'Hope', Nostalgia:'Nostalgia',
  Healing:'Healing', Joy:'Joy', Rage:'Rage', Loneliness:'Loneliness',
  SendIt:'Send It', LetOut:'Let Out',
};

/* ── Canvas sizes ── */
const CANVAS_SIZES = {
  square:   { w: 1080, h: 1080, label: '1:1',  name: 'Square',   dim: '1080×1080' },
  portrait: { w: 1080, h: 1350, label: '4:5',  name: 'Portrait', dim: '1080×1350' },
  story:    { w: 1080, h: 1920, label: '9:16', name: 'Story',    dim: '1080×1920' },
  landscape:{ w: 1280, h: 720,  label: '16:9', name: 'Wide',     dim: '1280×720'  },
};

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
let studioDesign    = 'midnight';
let studioFont      = 'playfair';
let studioBrightness = 100;
let studioCanvasSize = 'square';
let studioPhotoData  = null;
let studioPhotoFilter = 'none';
let studioPhotoOpacity = 0.4;
let studioActiveTab = 'color';
let studioPost      = null;

/* ══════════════════════════════════════════════════════════
   INJECT STUDIO STYLES
══════════════════════════════════════════════════════════ */
function injectStudioStyles() {
  if (document.getElementById('studioV55styles')) return;
  const s = document.createElement('style');
  s.id = 'studioV55styles';
  s.textContent = `
    /* ── Compact color swatch grid (6 cols) ── */
    .color-scenes {
      display: grid !important;
      grid-template-columns: repeat(6, 1fr) !important;
      gap: 8px !important;
      margin-bottom: 14px !important;
    }
    .scene-swatch {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer; padding: 0;
    }
    .swatch-preview {
      width: 100%; aspect-ratio: 1; border-radius: 9px;
      border: 2px solid rgba(255,255,255,0.1);
      transition: all 0.18s; display: block; cursor: pointer;
    }
    .scene-swatch:hover .swatch-preview {
      border-color: rgba(255,255,255,0.35); transform: scale(1.07);
    }
    .scene-swatch.active .swatch-preview {
      border-color: #E8C547; box-shadow: 0 0 0 2px rgba(232,197,71,0.35);
    }
    .swatch-label {
      font-family: 'Space Mono', monospace; font-size: 0.42rem; font-weight: 700;
      color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px;
      transition: color 0.18s;
    }
    .scene-swatch.active .swatch-label { color: #E8C547; }

    /* ── Font cards ── */
    .font-cards { display: flex; flex-direction: column; gap: 6px; }
    .font-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 13px; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer; transition: all 0.18s;
    }
    .font-card:hover  { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); }
    .font-card.active { border-color: rgba(232,197,71,0.5); background: rgba(232,197,71,0.07); }
    .font-card-preview { font-size: 1rem; color: rgba(255,255,255,0.75); line-height: 1; }
    .font-card.active .font-card-preview { color: #fff; }
    .font-card-name {
      font-family: 'Space Mono', monospace; font-size: 0.46rem; font-weight: 700;
      color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 1px;
    }
    .font-card.active .font-card-name { color: #E8C547; }

    /* ── Photo drop zone ── */
    .photo-drop-zone {
      border: 1.5px dashed rgba(255,255,255,0.22); border-radius: 12px; padding: 20px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.03);
      margin-bottom: 12px; text-align: center;
    }
    .photo-drop-zone:hover,
    .photo-drop-zone.has-photo {
      border-color: rgba(232,197,71,0.45); background: rgba(232,197,71,0.04);
    }
    .photo-drop-icon { font-size: 1.6rem; opacity: 0.5; }
    .photo-drop-text {
      font-family: 'Space Mono', monospace; font-size: 0.55rem; font-weight: 700;
      color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px;
    }
    .photo-drop-hint { font-size: 0.65rem; color: rgba(255,255,255,0.25); }
    .photo-controls  { display: flex; flex-direction: column; gap: 10px; }
    .photo-controls.hidden { display: none; }
    .photo-effect-row { display: flex; align-items: center; gap: 10px; }
    .photo-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .photo-filter {
      padding: 5px 12px; border-radius: 20px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.55); font-family: 'Space Mono', monospace;
      font-size: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      cursor: pointer; transition: all 0.18s;
    }
    .photo-filter:hover  { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); }
    .photo-filter.active { background: rgba(232,197,71,0.12); border-color: rgba(232,197,71,0.4); color: #E8C547; }
    .photo-remove-btn {
      width: 100%; padding: 9px; border-radius: 9px;
      background: rgba(255,80,80,0.07); border: 1px solid rgba(255,80,80,0.2);
      color: rgba(255,130,130,0.9); font-family: 'Space Mono', monospace;
      font-size: 0.52rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
      cursor: pointer; transition: all 0.18s;
    }
    .photo-remove-btn:hover { background: rgba(255,80,80,0.14); color: #ff6464; }

    /* Slider */
    .brightness-row { display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.07); }
    .studio-slider {
      flex: 1; -webkit-appearance: none; appearance: none;
      height: 3px; border-radius: 2px; outline: none; cursor: pointer;
      background: linear-gradient(to right, #E8C547 0%, rgba(255,255,255,0.15) 0%);
    }
    .studio-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 16px; height: 16px; border-radius: 50%;
      background: #E8C547; cursor: pointer;
      box-shadow: 0 0 8px rgba(232,197,71,0.5); transition: transform 0.15s;
    }
    .studio-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
    .studio-slider-val {
      font-family: 'Space Mono', monospace; font-size: 0.52rem; font-weight: 700;
      color: #E8C547; min-width: 36px; text-align: right;
    }

    /* Dock label */
    .dock-label {
      font-family: 'Space Mono', monospace; font-size: 0.48rem; font-weight: 700;
      color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1.5px;
      display: block; margin-bottom: 8px;
    }

    /* Studio spinner */
    .studio-spinner {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid rgba(232,197,71,0.2); border-top-color: #E8C547;
      animation: stSpin 0.7s linear infinite; display: inline-block;
    }
    @keyframes stSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════
   CANVAS DRAW — CANONICAL drawPosterToCtx
   gif-studio.js uses window.STUDIO_POSTER_CANONICAL to defer
══════════════════════════════════════════════════════════ */

/**
 * CANONICAL poster renderer used by BOTH studio.js and gif-studio.js.
 * gif-studio.js must NOT redefine this function.
 */
window.drawPosterToCtx = function(ctx, W, H, post, options = {}) {
  if (!post) return;

  const designId   = options.design     || studioDesign;
  const fontId     = options.font       || studioFont;
  const brightness = options.brightness != null ? options.brightness : studioBrightness;
  const photoData  = options.photoData  || studioPhotoData;
  const photoFilter= options.photoFilter|| studioPhotoFilter;
  const photoOpacity=options.photoOpacity!=null ? options.photoOpacity : studioPhotoOpacity;

  const design = STUDIO_DESIGNS.find(d => d.id === designId) || STUDIO_DESIGNS[0];
  const font   = STUDIO_FONTS.find(f => f.id === fontId)     || STUDIO_FONTS[0];

  const pad    = W * 0.07;
  const innerW = W - pad * 2;

  /* ── Background ── */
  ctx.save();
  const bgFill = design.bg(W, H, ctx);
  ctx.fillStyle = bgFill;
  ctx.fillRect(0, 0, W, H);

  /* ── Photo layer ── */
  if (photoData) {
    try {
      const imgEl = document.getElementById('_studioPhotoImg');
      if (imgEl && imgEl.complete && imgEl.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = photoOpacity;
        const ratio   = Math.max(W / imgEl.naturalWidth, H / imgEl.naturalHeight);
        const iw      = imgEl.naturalWidth  * ratio;
        const ih      = imgEl.naturalHeight * ratio;
        const ix      = (W - iw) / 2;
        const iy      = (H - ih) / 2;

        if (photoFilter === 'mono') {
          ctx.filter = 'grayscale(100%)';
        } else if (photoFilter === 'warm') {
          ctx.filter = 'sepia(60%) saturate(120%)';
        } else if (photoFilter === 'cool') {
          ctx.filter = 'hue-rotate(20deg) saturate(80%)';
        }

        ctx.drawImage(imgEl, ix, iy, iw, ih);
        ctx.filter = 'none';

        // Dark overlay to ensure text readability
        ctx.globalAlpha = 0.55;
        const overlayGrad = ctx.createLinearGradient(0, 0, 0, H);
        overlayGrad.addColorStop(0, 'rgba(0,0,0,0.75)');
        overlayGrad.addColorStop(0.5, 'rgba(0,0,0,0.40)');
        overlayGrad.addColorStop(1, 'rgba(0,0,0,0.80)');
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    } catch (_) {}
  }

  /* ── Brightness overlay ── */
  if (brightness !== 100) {
    ctx.save();
    ctx.globalAlpha = Math.abs(brightness - 100) / 100 * 0.6;
    ctx.fillStyle   = brightness < 100 ? '#000' : '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ── Noise texture ── */
  ctx.save();
  ctx.globalAlpha = 0.028;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
  ctx.restore();

  /* ── Accent line (left) ── */
  const emotion     = post.emotion || 'Nostalgia';
  const vibeColor   = VIBE_COLORS[emotion] || design.accentColor;
  const lineH       = H * 0.42;
  const lineY       = (H - lineH) / 2;
  const lineX       = pad - W * 0.025;
  const lineW       = W * 0.007;
  ctx.save();
  const lineGrad = ctx.createLinearGradient(0, lineY, 0, lineY + lineH);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, vibeColor);
  lineGrad.addColorStop(0.7, vibeColor);
  lineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lineGrad;
  ctx.globalAlpha = 0.85;
  const lbr = lineW / 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(lineX, lineY, lineW, lineH, lbr) : ctx.rect(lineX, lineY, lineW, lineH);
  ctx.fill();
  ctx.restore();

  /* ── Top shimmer ── */
  ctx.save();
  const shimmer = ctx.createLinearGradient(pad, 0, W - pad, 0);
  shimmer.addColorStop(0,    'transparent');
  shimmer.addColorStop(0.25, vibeColor);
  shimmer.addColorStop(0.5,  vibeColor);
  shimmer.addColorStop(0.75, vibeColor);
  shimmer.addColorStop(1,    'transparent');
  ctx.globalAlpha = 0.65;
  ctx.fillStyle   = shimmer;
  ctx.fillRect(pad, 0, innerW, 1.5);
  ctx.restore();

  /* ── MARGO wordmark — matches gif-studio size ── */
  const margoSize = Math.max(22, W * 0.055);   // matches gif-studio.js ratio
  ctx.save();
  ctx.font        = `800 ${margoSize}px 'Syne', sans-serif`;
  ctx.fillStyle   = vibeColor;
  ctx.globalAlpha = 0.9;
  ctx.textBaseline = 'top';
  ctx.fillText('MARGO', pad, pad * 0.75);
  ctx.restore();

  /* ── Lyric text ── */
  const lyricText  = post.text || '';
  const maxFontSize = Math.min(W * 0.072, H * 0.055);
  const minFontSize = W * 0.032;

  let fontSize = maxFontSize;
  ctx.font = `${font.style === 'italic' ? 'italic ' : ''}${font.weight} ${fontSize}px ${font.css}`;

  const lines      = wrapText(ctx, lyricText, innerW);
  const totalLines = lines.length;

  // Scale down if too many lines
  if (totalLines > 6) {
    fontSize = Math.max(minFontSize, maxFontSize * (6 / totalLines));
    ctx.font = `${font.style === 'italic' ? 'italic ' : ''}${font.weight} ${fontSize}px ${font.css}`;
  }

  const lineHeight = fontSize * 1.45;
  const blockH     = lines.length * lineHeight;
  // Vertically center with slight upward bias
  const startY     = H * 0.38 - blockH / 2;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'left';

  // Text shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur    = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  lines.forEach((line, i) => {
    const alpha = 1 - (i / lines.length) * 0.08;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = design.textColor;
    ctx.fillText(line, pad, startY + i * lineHeight);
  });
  ctx.restore();

  /* ── Vibe tag ── */
  const vibeLabel  = VIBE_LABELS[emotion] || emotion;
  const tagFontSz  = Math.max(14, W * 0.022);
  const tagPadH    = W * 0.022;
  const tagPadV    = W * 0.01;
  const tagY       = startY + blockH + lineHeight * 0.6;

  ctx.save();
  ctx.font          = `700 ${tagFontSz}px 'Space Mono', monospace`;
  ctx.textBaseline  = 'middle';
  const tagW        = ctx.measureText(vibeLabel.toUpperCase()).width + tagPadH * 2;
  const tagH        = tagFontSz + tagPadV * 2;

  // Pill background
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = vibeColor;
  ctx.beginPath();
  const tagR = tagH / 2;
  ctx.roundRect ? ctx.roundRect(pad, tagY, tagW, tagH, tagR) : ctx.rect(pad, tagY, tagW, tagH);
  ctx.fill();

  // Pill border
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = vibeColor;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, tagY, tagW, tagH, tagR) : ctx.rect(pad, tagY, tagW, tagH);
  ctx.stroke();

  // Tag text
  ctx.globalAlpha  = 0.9;
  ctx.fillStyle    = vibeColor;
  ctx.letterSpacing = '1px';
  ctx.fillText(vibeLabel.toUpperCase(), pad + tagPadH, tagY + tagH / 2);
  ctx.restore();

  /* ── Song + artist ── */
  const k          = post.knowledge || {};
  const songName   = k.song   || '';
  const artistName = k.artist || '';
  const bottomY    = H - pad * 0.9;
  const metaFont   = Math.max(14, W * 0.022);

  if (songName || artistName) {
    ctx.save();
    ctx.font        = `700 ${metaFont}px 'DM Sans', sans-serif`;
    ctx.fillStyle   = design.textColor;
    ctx.globalAlpha = 0.85;
    ctx.textBaseline = 'bottom';

    const songStr  = songName   ? `♪ ${songName}`      : '';
    const artStr   = artistName ? ` — ${artistName}`   : '';
    const fullStr  = songStr + artStr;
    const maxW     = innerW * 0.75;

    let displayStr = fullStr;
    while (ctx.measureText(displayStr).width > maxW && displayStr.length > 4) {
      displayStr = displayStr.slice(0, -4) + '…';
    }
    ctx.fillText(displayStr, pad, bottomY);
    ctx.restore();
  }

  /* ── Thumbnail (if available) ── */
  const thumbImg = document.getElementById('_studioThumbImg');
  if (thumbImg && thumbImg.complete && thumbImg.naturalWidth) {
    try {
      const tSize = Math.round(W * 0.09);
      const tX    = W - pad - tSize;
      const tY    = bottomY - tSize - (metaFont + 4);
      ctx.save();
      ctx.beginPath();
      const tR = tSize * 0.15;
      ctx.roundRect ? ctx.roundRect(tX, tY, tSize, tSize, tR) : ctx.rect(tX, tY, tSize, tSize);
      ctx.clip();
      ctx.drawImage(thumbImg, tX, tY, tSize, tSize);
      ctx.restore();

      // Border
      ctx.save();
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tX, tY, tSize, tSize, tR) : ctx.rect(tX, tY, tSize, tSize);
      ctx.stroke();
      ctx.restore();
    } catch (_) {}
  }

  ctx.restore();
};

/* ── Word wrap helper ── */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ══════════════════════════════════════════════════════════
   STAGE CANVAS REFRESH — triggers on EVERY state change
══════════════════════════════════════════════════════════ */
function refreshStageCanvas() {
  const canvas = document.getElementById('studioCanvas');
  if (!canvas) return;
  const post   = studioPost || window.currentPost;
  if (!post)   return;

  const size  = CANVAS_SIZES[studioCanvasSize] || CANVAS_SIZES.square;
  const stage = canvas.parentElement;
  if (!stage) return;

  // Fit canvas into stage
  const maxW = stage.clientWidth  || 320;
  const maxH = (stage.clientHeight || 400) - 32;
  const scale = Math.min(maxW / size.w, maxH / size.h, 1);
  const dispW = Math.round(size.w * scale);
  const dispH = Math.round(size.h * scale);

  canvas.width  = size.w;
  canvas.height = size.h;
  canvas.style.width  = dispW + 'px';
  canvas.style.height = dispH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.save();
  window.drawPosterToCtx(ctx, size.w, size.h, post);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   BUILD DOCK UI
══════════════════════════════════════════════════════════ */
function buildColorPanel() {
  const panel = document.getElementById('dockColorPanel');
  if (!panel) return;
  panel.innerHTML = `
    <span class="dock-label">Scene</span>
    <div class="color-scenes">
      ${STUDIO_DESIGNS.map(d => `
        <button class="scene-swatch ${studioDesign === d.id ? 'active' : ''}" data-design="${d.id}">
          <span class="swatch-preview" style="background:${d.swatchCss}"></span>
          <span class="swatch-label">${d.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="brightness-row">
      <span class="dock-label" style="margin:0;flex-shrink:0">Brightness</span>
      <input type="range" class="studio-slider" id="brightnessSlider"
        min="40" max="160" value="${studioBrightness}"/>
      <span class="studio-slider-val" id="brightnessVal">${studioBrightness}%</span>
    </div>
  `;

  panel.querySelectorAll('.scene-swatch').forEach(btn => {
    btn.onclick = () => {
      studioDesign = btn.dataset.design;
      panel.querySelectorAll('.scene-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });

  const slider = document.getElementById('brightnessSlider');
  const val    = document.getElementById('brightnessVal');
  if (slider) {
    updateSliderGradient(slider, studioBrightness);
    slider.oninput = () => {
      studioBrightness = parseInt(slider.value);
      if (val) val.textContent = studioBrightness + '%';
      updateSliderGradient(slider, studioBrightness);
      refreshStageCanvas();
    };
  }
}

function buildFontPanel() {
  const panel = document.getElementById('dockFontPanel');
  if (!panel) return;
  panel.innerHTML = `
    <span class="dock-label">Typeface</span>
    <div class="font-cards">
      ${STUDIO_FONTS.map(f => `
        <button class="font-card ${studioFont === f.id ? 'active' : ''}" data-font="${f.id}">
          <span class="font-card-preview"
            style="font-family:${f.css};font-weight:${f.weight};font-style:${f.style}">
            ${f.preview} — ${f.label}
          </span>
          <span class="font-card-name">${f.label}</span>
        </button>
      `).join('')}
    </div>
  `;

  panel.querySelectorAll('.font-card').forEach(btn => {
    btn.onclick = () => {
      studioFont = btn.dataset.font;
      panel.querySelectorAll('.font-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });
}

function buildPhotoPanel() {
  const panel = document.getElementById('dockPhotoPanel');
  if (!panel) return;
  panel.innerHTML = `
    <span class="dock-label">Background Photo</span>
    <div class="photo-drop-zone ${studioPhotoData ? 'has-photo' : ''}" id="photoDropZone">
      <span class="photo-drop-icon">${studioPhotoData ? '🖼' : '📷'}</span>
      <span class="photo-drop-text">${studioPhotoData ? 'Photo added — tap to change' : 'Tap to upload a photo'}</span>
      <span class="photo-drop-hint">${studioPhotoData ? '' : 'JPG, PNG, WEBP'}</span>
    </div>
    <input type="file" id="photoFileInput" accept="image/*" style="display:none"/>
    <div class="photo-controls ${studioPhotoData ? '' : 'hidden'}" id="photoControls">
      <div class="photo-effect-row">
        <span class="dock-label" style="margin:0;flex-shrink:0">Opacity</span>
        <input type="range" class="studio-slider" id="photoOpacitySlider"
          min="5" max="80" value="${Math.round(studioPhotoOpacity * 100)}"/>
        <span class="studio-slider-val" id="photoOpacityVal">${Math.round(studioPhotoOpacity * 100)}%</span>
      </div>
      <div class="photo-filter-row">
        ${['none','mono','warm','cool'].map(f => `
          <button class="photo-filter ${studioPhotoFilter === f ? 'active' : ''}" data-filter="${f}">
            ${{none:'Original', mono:'Mono', warm:'Warm', cool:'Cool'}[f]}
          </button>
        `).join('')}
      </div>
      <button class="photo-remove-btn" id="photoRemoveBtn">Remove Photo</button>
    </div>
  `;

  const dropZone    = document.getElementById('photoDropZone');
  const fileInput   = document.getElementById('photoFileInput');
  const controls    = document.getElementById('photoControls');
  const opSlider    = document.getElementById('photoOpacitySlider');
  const opVal       = document.getElementById('photoOpacityVal');
  const removeBtn   = document.getElementById('photoRemoveBtn');

  dropZone.onclick = () => fileInput?.click();

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('has-photo'); });
  dropZone.addEventListener('dragleave', () => { if (!studioPhotoData) dropZone.classList.remove('has-photo'); });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) loadPhotoFile(file);
  });

  if (fileInput) {
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file) loadPhotoFile(file);
    };
  }

  if (opSlider) {
    updateSliderGradient(opSlider, Math.round(studioPhotoOpacity * 100));
    opSlider.oninput = () => {
      studioPhotoOpacity = parseInt(opSlider.value) / 100;
      if (opVal) opVal.textContent = Math.round(studioPhotoOpacity * 100) + '%';
      updateSliderGradient(opSlider, Math.round(studioPhotoOpacity * 100));
      refreshStageCanvas();
    };
  }

  panel.querySelectorAll('.photo-filter').forEach(btn => {
    btn.onclick = () => {
      studioPhotoFilter = btn.dataset.filter;
      panel.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });

  if (removeBtn) {
    removeBtn.onclick = () => {
      studioPhotoData = null;
      document.getElementById('_studioPhotoImg')?.remove();
      buildPhotoPanel();
      refreshStageCanvas();
    };
  }
}

function loadPhotoFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    studioPhotoData = e.target.result;
    // Pre-load into a hidden img for canvas drawImage
    let imgEl = document.getElementById('_studioPhotoImg');
    if (!imgEl) {
      imgEl = document.createElement('img');
      imgEl.id = '_studioPhotoImg';
      imgEl.style.display = 'none';
      document.body.appendChild(imgEl);
    }
    imgEl.onload = () => {
      buildPhotoPanel();
      refreshStageCanvas();
    };
    imgEl.src = studioPhotoData;
  };
  reader.readAsDataURL(file);
}

function updateSliderGradient(slider, value) {
  const min = parseInt(slider.min || 0);
  const max = parseInt(slider.max || 100);
  const pct = ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, #E8C547 ${pct}%, rgba(255,255,255,0.15) ${pct}%)`;
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE STUDIO
══════════════════════════════════════════════════════════ */
window.openStudio = function(post) {
  studioPost = post || window.currentPost;
  if (!studioPost) return;

  injectStudioStyles();

  const overlay = document.getElementById('studioOverlay');
  if (!overlay) { buildStudioOverlay(); }

  // Preload thumbnail
  const thumb = studioPost.youtubeMeta?.thumbnailSm || studioPost.youtubeMeta?.thumbnail;
  if (thumb) {
    let thumbEl = document.getElementById('_studioThumbImg');
    if (!thumbEl) {
      thumbEl = document.createElement('img');
      thumbEl.id = '_studioThumbImg';
      thumbEl.style.display = 'none';
      thumbEl.crossOrigin = 'anonymous';
      document.body.appendChild(thumbEl);
    }
    thumbEl.src = thumb;
  }

  document.getElementById('studioOverlay')?.classList.remove('hidden');
  document.body.classList.add('modal-open');

  // Build dock panels
  switchDockTab('color');
  buildColorPanel();

  requestAnimationFrame(() => {
    refreshStageCanvas();
  });
};

window.closeStudio = function() {
  document.getElementById('studioOverlay')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
};

/* ══════════════════════════════════════════════════════════
   BUILD STUDIO OVERLAY (if not in HTML)
══════════════════════════════════════════════════════════ */
function buildStudioOverlay() {
  if (document.getElementById('studioOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'studioOverlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div class="studio-stage">
      <canvas id="studioCanvas"></canvas>
      <div class="studio-topbar">
        <button class="studio-back-btn" id="studioBackBtn">←</button>
        <span class="studio-title">Image Studio</span>
        <button class="studio-export-btn" id="studioExportBtn">Save</button>
      </div>
    </div>
    <div class="studio-dock">
      <div class="dock-tabs">
        <button class="dock-tab active" data-tab="color">
          <span class="dock-tab-icon">🎨</span> Scene
        </button>
        <button class="dock-tab" data-tab="font">
          <span class="dock-tab-icon">✍️</span> Font
        </button>
        <button class="dock-tab" data-tab="photo">
          <span class="dock-tab-icon">📷</span> Photo
        </button>
      </div>
      <div class="dock-panel active" id="dockColorPanel"></div>
      <div class="dock-panel"        id="dockFontPanel"></div>
      <div class="dock-panel"        id="dockPhotoPanel"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  bindStudioEvents();
}

function bindStudioEvents() {
  document.getElementById('studioBackBtn')?.addEventListener('click', () => {
    window.closeStudio();
    if (typeof openStudioChooser === 'function') openStudioChooser();
  });

  document.getElementById('studioExportBtn')?.addEventListener('click', exportPoster);

  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => switchDockTab(tab.dataset.tab);
  });
}

function switchDockTab(tabId) {
  studioActiveTab = tabId;
  document.querySelectorAll('.dock-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));

  const panelMap = { color: 'dockColorPanel', font: 'dockFontPanel', photo: 'dockPhotoPanel' };
  const panelEl  = document.getElementById(panelMap[tabId]);
  if (panelEl) panelEl.classList.add('active');

  // Build panel on first switch
  if (tabId === 'color') buildColorPanel();
  if (tabId === 'font')  buildFontPanel();
  if (tabId === 'photo') buildPhotoPanel();
}

/* ══════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════ */
async function exportPoster() {
  const exportBtn = document.getElementById('studioExportBtn');
  if (exportBtn) { exportBtn.innerHTML = '<span class="studio-spinner"></span>'; exportBtn.disabled = true; }

  const size   = CANVAS_SIZES[studioCanvasSize] || CANVAS_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width  = size.w;
  canvas.height = size.h;
  const ctx    = canvas.getContext('2d');

  // Load fonts before export
  try {
    const font = STUDIO_FONTS.find(f => f.id === studioFont) || STUDIO_FONTS[0];
    await document.fonts.load(`${font.weight} 48px ${font.css}`);
    await document.fonts.load(`800 48px 'Syne', sans-serif`);
    await document.fonts.load(`700 24px 'Space Mono', monospace`);
    await document.fonts.load(`700 24px 'DM Sans', sans-serif`);
  } catch (_) {}

  window.drawPosterToCtx(ctx, size.w, size.h, studioPost || window.currentPost);

  const link = document.createElement('a');
  link.download = `margo-${(studioPost?.knowledge?.song || 'lyric').replace(/\s+/g,'-').toLowerCase()}.png`;
  link.href = canvas.toDataURL('image/png', 0.92);
  link.click();

  if (exportBtn) {
    exportBtn.disabled = false;
    exportBtn.textContent = 'Save';
    exportBtn.style.background = '#4ade80';
    exportBtn.style.color      = '#0B0B0D';
    setTimeout(() => {
      exportBtn.style.background = '';
      exportBtn.style.color      = '';
      exportBtn.textContent = 'Save';
    }, 2000);
  }

  if (typeof showToast === 'function') showToast('Saved to downloads ✓');
}

/* ══════════════════════════════════════════════════════════
   STUDIO CHOOSER
══════════════════════════════════════════════════════════ */
window.openStudioChooser = function(post) {
  if (post) { studioPost = post; window.currentPost = post; }
  const chooser = document.getElementById('studioChooser');
  if (!chooser) { buildStudioChooser(); return; }
  chooser.classList.remove('hidden');
};

window.closeStudioChooser = function() {
  document.getElementById('studioChooser')?.classList.add('hidden');
};

function buildStudioChooser() {
  if (document.getElementById('studioChooser')) {
    document.getElementById('studioChooser').classList.remove('hidden');
    return;
  }
  const el = document.createElement('div');
  el.id = 'studioChooser';
  el.innerHTML = `
    <div class="sc-inner">
      <div class="sc-header">
        <div class="sc-logo">
          <span class="sc-logo-text">MARGO</span>
        </div>
        <div class="sc-title">Make It Visual</div>
        <div class="sc-sub">Choose how you want to share this lyric</div>
      </div>
      <div class="sc-cards">
        <div class="sc-card" id="scChooseImage">
          <div class="sc-card-icon img-icon">🖼</div>
          <div class="sc-card-title">Poster</div>
          <div class="sc-card-desc">Save a still image for Instagram, WhatsApp, X</div>
          <span class="sc-card-tag img-tag">PNG</span>
        </div>
        <div class="sc-card" id="scChooseGif">
          <div class="sc-card-icon gif-icon">✨</div>
          <div class="sc-card-title">Animated GIF</div>
          <div class="sc-card-desc">Cinematic motion poster that moves</div>
          <span class="sc-card-tag gif-tag">GIF</span>
        </div>
      </div>
      <button class="sc-back" id="scBackBtn">Skip for now</button>
    </div>
  `;
  document.body.appendChild(el);

  document.getElementById('scChooseImage').onclick = () => {
    window.closeStudioChooser();
    window.openStudio(studioPost || window.currentPost);
  };
  document.getElementById('scChooseGif').onclick = () => {
    window.closeStudioChooser();
    if (typeof openGifStudio === 'function') openGifStudio(studioPost || window.currentPost);
  };
  document.getElementById('scBackBtn').onclick = () => {
    window.closeStudioChooser();
  };
}

/* ══════════════════════════════════════════════════════════
   SHARE SHEET INTEGRATION
══════════════════════════════════════════════════════════ */
window.openShareSheet = window.openShareSheet || function(post, opts = {}) {
  studioPost = post; window.currentPost = post;
  if (opts.isDuet) {
    if (typeof openDuetStudio === 'function') { openDuetStudio(post, opts.echoPost); return; }
  }
  window.openStudioChooser(post);
};

/* ══════════════════════════════════════════════════════════
   RESIZE HANDLER
══════════════════════════════════════════════════════════ */
let _studioResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_studioResizeTimer);
  _studioResizeTimer = setTimeout(() => {
    if (!document.getElementById('studioOverlay')?.classList.contains('hidden')) {
      refreshStageCanvas();
    }
  }, 150);
});

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
(function initStudio() {
  injectStudioStyles();

  // If overlay already in HTML, bind events
  const overlay = document.getElementById('studioOverlay');
  if (overlay) {
    bindStudioEvents();
    document.querySelectorAll('.dock-tab').forEach(tab => {
      tab.onclick = () => switchDockTab(tab.dataset.tab);
    });
  }
})();
