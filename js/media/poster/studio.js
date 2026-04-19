(function() {
/* ============================================================
   MARGO — js/media/poster/studio.js
   v6.0 — VOID VIOLET + MARGO LAYOUT
   • Void Violet default theme
   • Left-aligned italic serif lyric
   • Track number in accent mono above lyric
   • 24px accent rule above meta block
   • Near-invisible watermark
   • All themes upgraded: flat dark base, accent-only color
   • Format picker: square / portrait / story / landscape
   • All existing controls (color, font, photo, brightness) intact
   ============================================================ */

/* ==========================================================
   DESIGN CONFIG
========================================================== */
const STUDIO_DESIGNS = [
  { id:'midnight-gold',     label:'Violet',  swatchCss:'linear-gradient(135deg,#0E0B1A,#E8C547)',   bg:'#0E0B1A', accentColor:'#E8C547', textColor:'#EAE5F5', metaColor:'rgba(234,229,245,0.6)' },
  { id:'gold-flat',       label:'Gold',    swatchCss:'linear-gradient(135deg,#0d0d0d,#E8C547)',   bg:'#0B0B0D', accentColor:'#E8C547', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'royal-purple',    label:'Amethyst',swatchCss:'linear-gradient(135deg,#1a0033,#c77dff)',   bg:'#0d0014', accentColor:'#c77dff', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'neon-cyan',       label:'Ocean',   swatchCss:'linear-gradient(135deg,#0a1420,#00e5ff)',   bg:'#050e1a', accentColor:'#00e5ff', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'sunset-coral',    label:'Ember',   swatchCss:'linear-gradient(135deg,#1a0a0a,#ff6b6b)',   bg:'#1a0505', accentColor:'#ff6b6b', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'emerald-night',   label:'Forest',  swatchCss:'linear-gradient(135deg,#051a0d,#50fa7b)',   bg:'#051a0d', accentColor:'#50fa7b', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'rose-gold',       label:'Rose',    swatchCss:'linear-gradient(135deg,#1a0d0f,#f4a4c0)',   bg:'#1a0d0f', accentColor:'#f4a4c0', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'monochrome',      label:'Mono',    swatchCss:'linear-gradient(135deg,#000,#fff)',          bg:'#0a0a0a', accentColor:'#ffffff', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'vaporwave',       label:'Wave',    swatchCss:'linear-gradient(135deg,#ff71ce,#05ffa1)',   bg:'#1a0533', accentColor:'#ff71ce', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'neon-dark',       label:'Neon',    swatchCss:'linear-gradient(135deg,#0a0a0a,#ff00ff)',   bg:'#0a0a0a', accentColor:'#ff00ff', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'y2k-chrome',      label:'Chrome',  swatchCss:'linear-gradient(135deg,#000033,#0ff)',      bg:'#000033', accentColor:'#00ffff', textColor:'#ffffff', metaColor:'rgba(255,255,255,0.6)' },
  { id:'brutalist',       label:'Brutal',  swatchCss:'linear-gradient(135deg,#fff,#000)',          bg:'#ffffff', accentColor:'#000000', textColor:'#000000', metaColor:'rgba(0,0,0,0.5)' },
  { id:'cream-editorial', label:'Bone',    swatchCss:'linear-gradient(135deg,#f5f1e8,#2a2520)',   bg:'#f5f1e8', accentColor:'#B8901A', textColor:'#1a1a20', metaColor:'rgba(26,26,32,0.5)' },
];

const STUDIO_FONTS = [
  { id:'lora-intimate',   label:'Intimate',   emotion:'Default',  css:"'Lora',serif", weight:'400', style:'italic',  preview:'Say everything' },
  { id:'lora-bold',       label:'Bold',       emotion:'Powerful', css:"'Lora',serif", weight:'700', style:'normal',  preview:'Say everything' },
  { id:'lora-passionate', label:'Passionate', emotion:'Intense',  css:"'Lora',serif", weight:'700', style:'italic',  preview:'Say everything' },
  { id:'lora-quiet',      label:'Quiet',      emotion:'Minimal',  css:"'Lora',serif", weight:'500', style:'normal',  preview:'Say everything' },
  { id:'lora-tender',     label:'Tender',     emotion:'Soft',     css:"'Lora',serif", weight:'500', style:'italic',  preview:'Say everything' },
];

const VIBE_COLORS = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

const CANVAS_SIZES = {
  square:    { w:1080, h:1080 },
  portrait:  { w:1080, h:1350 },
  story:     { w:1080, h:1920 },
  landscape: { w:1200, h:675  },
};

/* ==========================================================
   STATE
========================================================== */
let studioDesign      = 'midnight-gold';
let studioFont        = 'lora-intimate';
let studioBrightness  = 100;
let studioCanvasSize  = 'square';
let studioPhotoData   = null;
let studioPhotoFilter = 'none';
let studioPhotoOpacity= 0.4;
let studioBlur        = 0;
let studioDim         = 50;
let studioPost        = null;

/* ==========================================================
   INJECT STYLES
========================================================== */
function injectStudioStyles() {
  if (document.getElementById('studioV60styles')) return;
  const s = document.createElement('style');
  s.id = 'studioV60styles';
  s.textContent = `
    .studio-overlay { position:fixed;inset:0;z-index:800;display:flex;flex-direction:column;background:#090910; }
    .studio-overlay.hidden { display:none!important; }

    .studio-stage {
      flex:1;position:relative;display:flex;align-items:center;justify-content:center;
      background:#0a0a12;overflow:hidden;min-height:0;
    }
    #studioCanvas { border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.7); max-width:100%; max-height:100%; }

    .studio-topbar {
      position:absolute;top:0;left:0;right:0;
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px;background:linear-gradient(to bottom,rgba(0,0,0,0.8),transparent);
      z-index:10;
    }
    .studio-back-btn {
      width:36px;height:36px;border-radius:50%;
      background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);
      color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:all 0.18s;
    }
    .studio-back-btn:hover { background:rgba(255,255,255,0.16); }
    .studio-title {
      font-family:'Lora',serif;font-weight:800;font-size:0.8rem;
      letter-spacing:1px;color:#E8C547;text-transform:uppercase;
    }
    .studio-export-btn {
      padding:8px 18px;border-radius:20px;
      background:#E8C547;border:none;color:#0E0B1A;
      font-family:'Lora',serif;font-weight:700;font-size:0.6rem;
      letter-spacing:1px;text-transform:uppercase;cursor:pointer;
      transition:all 0.18s;
    }
    .studio-export-btn:hover { background:#F5D46A;transform:scale(1.04); }
    .studio-export-btn:disabled { opacity:0.5;cursor:wait; }

    .studio-dock {
      flex-shrink:0;background:#0f0e15;border-top:1px solid rgba(255,255,255,0.07);
      display:flex;flex-direction:column;max-height:42dvh;overflow:hidden;
    }

    .dock-tabs {
      display:flex;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;
    }
    .dock-tab {
      flex:1;padding:12px 8px;background:none;border:none;
      font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
      color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:1px;
      cursor:pointer;transition:all 0.18s;border-bottom:2px solid transparent;
    }
    .dock-tab:hover { color:rgba(255,255,255,0.65); }
    .dock-tab.active { color:#E8C547;border-bottom-color:#E8C547; }

    .dock-panel { display:none;padding:14px 16px;overflow-y:auto;flex:1; scrollbar-width:none; }
    .dock-panel::-webkit-scrollbar { display:none; }
    .dock-panel.active { display:block; }

    .color-scenes {
      display:grid!important;grid-template-columns:repeat(6,1fr)!important;
      gap:8px!important;margin-bottom:14px!important;
    }
    .scene-swatch {
      display:flex;flex-direction:column;align-items:center;gap:4px;
      background:none;border:none;cursor:pointer;padding:0;
    }
    .swatch-preview {
      width:100%;aspect-ratio:1;border-radius:8px;
      border:2px solid rgba(255,255,255,0.1);transition:all 0.18s;display:block;
    }
    .scene-swatch:hover .swatch-preview { border-color:rgba(255,255,255,0.35);transform:scale(1.07); }
    .scene-swatch.active .swatch-preview { border-color:#E8C547;box-shadow:0 0 0 2px rgba(232,197,71,0.35); }
    .swatch-label {
      font-family:'Lora',serif;font-size:0.4rem;font-weight:700;
      color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.5px;transition:color 0.18s;
    }
    .scene-swatch.active .swatch-label { color:#E8C547; }

    .brightness-row {
      display:flex;align-items:center;gap:10px;padding-top:10px;
      border-top:1px solid rgba(255,255,255,0.07);
    }
    .dock-label {
      font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
      color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;
      display:block;margin-bottom:6px;flex-shrink:0;
    }
    .studio-slider {
      flex:1;-webkit-appearance:none;appearance:none;
      height:3px;border-radius:2px;outline:none;cursor:pointer;
    }
    .studio-slider::-webkit-slider-thumb {
      -webkit-appearance:none;width:16px;height:16px;border-radius:50%;
      background:#E8C547;cursor:pointer;box-shadow:0 0 8px rgba(232,197,71,0.5);
    }
    .studio-slider-val {
      font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
      color:#E8C547;min-width:36px;text-align:right;
    }

    .font-cards { display:flex;flex-direction:column;gap:5px; }
    .font-card {
      display:flex;align-items:center;justify-content:space-between;
      padding:9px 13px;border-radius:10px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
      cursor:pointer;transition:all 0.18s;
    }
    .font-card:hover { border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.06); }
    .font-card.active { border-color:rgba(232,197,71,0.5);background:rgba(232,197,71,0.07); }
    .font-card-preview { font-size:0.9rem;color:rgba(255,255,255,0.7); }
    .font-card.active .font-card-preview { color:#fff; }
    .font-card-name {
      font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
      color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:1px;
    }
    .font-card.active .font-card-name { color:#E8C547; }

    .photo-drop-zone {
      border:1.5px dashed rgba(255,255,255,0.2);border-radius:12px;padding:18px;
      display:flex;flex-direction:column;align-items:center;gap:8px;
      cursor:pointer;transition:all 0.2s;background:rgba(255,255,255,0.02);
      margin-bottom:12px;text-align:center;
    }
    .photo-drop-zone:hover,.photo-drop-zone.has-photo {
      border-color:rgba(232,197,71,0.40);background:rgba(232,197,71,0.03);
    }
    .photo-drop-icon { font-size:1.5rem;opacity:0.45; }
    .photo-drop-text {
      font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
      color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px;
    }
    .photo-controls { display:flex;flex-direction:column;gap:10px; }
    .photo-controls.hidden { display:none; }
    .photo-effect-row { display:flex;align-items:center;gap:10px; }
    .photo-filter-row { display:flex;gap:6px;flex-wrap:wrap; }
    .photo-filter {
      padding:5px 11px;border-radius:20px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.5);font-family:'Lora',serif;
      font-size:0.6rem;font-weight:700;text-transform:uppercase;
      cursor:pointer;transition:all 0.18s;
    }
    .photo-filter:hover { border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.8); }
    .photo-filter.active { background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.40);color:#E8C547; }
    .photo-remove-btn {
      width:100%;padding:9px;border-radius:9px;
      background:rgba(255,80,80,0.07);border:1px solid rgba(255,80,80,0.2);
      color:rgba(255,130,130,0.9);font-family:'Lora',serif;
      font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;
      cursor:pointer;transition:all 0.18s;
    }
    .photo-remove-btn:hover { background:rgba(255,80,80,0.14);color:#ff6464; }

    .studio-spinner {
      width:14px;height:14px;border-radius:50%;
      border:2px solid rgba(232,197,71,0.20);border-top-color:#E8C547;
      animation:stSpin 0.7s linear infinite;display:inline-block;vertical-align:middle;
    }
    @keyframes stSpin { to { transform:rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

/* ==========================================================
   WORD WRAP HELPER
========================================================== */
function _studioWrapText(ctx, text, maxWidth) {
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

/* ==========================================================
   TRACK NUMBER HELPER
   Returns "— track N" string derived from post ID or index
========================================================== */
function _trackNumber(post) {
  if (!post) return '';
  const song = (post.knowledge && post.knowledge.song) || post.song || '';
  if (song) return '— ' + song;
  return '';
}

/* ==========================================================
   CANVAS DRAW — window.drawPosterToCtx
   v6.0: New MARGO layout — left-aligned, track number, rule
========================================================== */

function _toTitleCase(str) {
  if (!str) return '';
  const small = new Set(['a','an','the','and','but','or','for','nor','on','at','to','by','in','of','up','as','is']);
  return str
    .replace(/[^\s-]+/g, (word, i) => {
      const lower = word.toLowerCase();
      if (i === 0 || !small.has(lower)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return lower;
    })
    .replace(/\.([a-z])/g, (_, c) => '.' + c.toUpperCase());
}

window.drawPosterToCtx = function(ctx, W, H, post, options) {
  options = options || {};
  if (!post) return;

  const designId    = options.design      || studioDesign;
  const fontId      = options.font        || studioFont;
  const brightness  = options.brightness  != null ? options.brightness  : studioBrightness;
  const photoData   = options.photoData   || studioPhotoData;
  const photoFilter = options.photoFilter || studioPhotoFilter;
  const photoOpacity= options.photoOpacity!= null ? options.photoOpacity : studioPhotoOpacity;

  const design = STUDIO_DESIGNS.find(d => d.id === designId) || STUDIO_DESIGNS[0];
  const font   = STUDIO_FONTS.find(f => f.id === fontId)     || STUDIO_FONTS[0];

  const isLight = design.textColor === '#000000' || design.textColor === '#1a1a20';
  const pad     = Math.round(W * 0.075);
  const innerW  = W - pad * 2;

  /* ── Background — flat dark base ── */
  ctx.save();
  ctx.fillStyle = design.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* ── Subtle dot grid texture ── */
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.fillStyle = design.accentColor;
  const gridSpacing = Math.round(W * 0.04);
  for (let y = gridSpacing; y < H; y += gridSpacing) {
    for (let x = gridSpacing; x < W; x += gridSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  /* ── Photo layer ── */
  if (photoData) {
    try {
      const imgEl = document.getElementById('_studioPhotoImg');
      if (imgEl && imgEl.complete && imgEl.naturalWidth) {
        ctx.save();
        const ratio = Math.max(W / imgEl.naturalWidth, H / imgEl.naturalHeight);
        const iw = imgEl.naturalWidth  * ratio;
        const ih = imgEl.naturalHeight * ratio;
        const ix = (W - iw) / 2;
        const iy = (H - ih) / 2;
        if (photoFilter === 'mono')     ctx.filter = 'grayscale(100%)';
        else if (photoFilter === 'warm')     ctx.filter = 'sepia(60%) saturate(120%)';
        else if (photoFilter === 'cool')     ctx.filter = 'hue-rotate(20deg) saturate(80%)';
        else if (photoFilter === 'dramatic') ctx.filter = 'contrast(130%) saturate(80%)';
        else if (photoFilter === 'vintage')  ctx.filter = 'sepia(40%) contrast(90%)';
        ctx.globalAlpha = photoOpacity;
        ctx.drawImage(imgEl, ix, iy, iw, ih);
        ctx.filter = 'none';
        ctx.globalAlpha = studioDim / 100;
        const ov = ctx.createLinearGradient(0, 0, 0, H);
        ov.addColorStop(0,   'rgba(0,0,0,0.85)');
        ov.addColorStop(0.4, 'rgba(0,0,0,0.4)');
        ov.addColorStop(1,   'rgba(0,0,0,0.90)');
        ctx.fillStyle = ov;
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
  /* ── Brand lockup ── */
  /* MARGO BRAND STANDARD: logo = min(W,H)*0.038, pad = min(W,H)*0.055 */
  const _logoBase = Math.min(W, H);
  const _markSize = Math.round(_logoBase * 0.038);
  const _logoPad  = Math.round(_logoBase * 0.055);
  drawMargoLockup(ctx, _logoPad, _logoPad, _markSize, design.accentColor, isLight);
  /* ── Lyric block — left-aligned ── */
  const lyricText = post.text || '';
  const isLandscape = W > H;
  const fStyle = font.style === 'italic' ? 'italic ' : '';
  /* Landscape: left 56% of width for lyric, right for meta */
  const lyricWrapW = isLandscape ? W * 0.52 : innerW;
  /* Available height for lyric block — landscape is tight */
  const maxLyricH = isLandscape ? H * 0.58 : H * 0.55;
  /* Start font size, then shrink until block fits */
  let fontSize = isLandscape
    ? Math.min(H * 0.12, W * 0.036)
    : Math.min(W * 0.068, H * 0.052);
  ctx.font = `${fStyle}${font.weight} ${fontSize}px ${font.css}`;
  let lines = _studioWrapText(ctx, lyricText, lyricWrapW);
  /* Shrink font until block fits within maxLyricH */
  let lh = fontSize * 1.42;
  let blockH = lines.length * lh;
  let iters = 0;
  while (blockH > maxLyricH && fontSize > (isLandscape ? 18 : 14) && iters < 20) {
    fontSize *= 0.88;
    ctx.font = `${fStyle}${font.weight} ${fontSize}px ${font.css}`;
    lines = _studioWrapText(ctx, lyricText, lyricWrapW);
    lh = fontSize * 1.42;
    blockH = lines.length * lh;
    iters++;
  }

  /* Landscape: center in middle zone; others: upper-center */
  const lyricCenterY = isLandscape ? H * 0.36 : H * 0.42;
  const startY = lyricCenterY - blockH / 2;

  /* track label removed — song shown once in meta block only */

  /* ── Lyric lines ── */
  ctx.save();
  ctx.textBaseline  = 'top';
  ctx.textAlign     = 'left';
  ctx.shadowColor   = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur    = 18;
  ctx.shadowOffsetY = 2;
  lines.forEach((line, i) => {
    ctx.globalAlpha = 1 - (i / lines.length) * 0.06;
    ctx.fillStyle   = design.textColor;
    ctx.fillText(line, pad, startY + i * lh);
  });
  ctx.restore();

  /* ── Meta block — rule + song + artist ── */
  const k = post.knowledge || {};
  /* All formats: meta at bottom, full-width rule */
  const metaPad    = pad;
  const songSize   = Math.max(12, Math.round(Math.min(W, H) * 0.030));
  const artistSize = Math.max(10, Math.round(Math.min(W, H) * 0.024));
  const ruleY      = isLandscape ? H * 0.72 : H * 0.80;
  const songY      = ruleY + Math.round(H * (isLandscape ? 0.06 : 0.034));
  const artistY    = songY + songSize + Math.round(H * (isLandscape ? 0.06 : 0.016));

  /* Full-width accent rule */
  ctx.save();
  ctx.fillStyle   = design.accentColor;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(pad, ruleY, W - pad * 2, isLandscape ? 2 : Math.round(H * 0.003));
  ctx.restore();

  if (k.song || k.artist) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';
    ctx.shadowBlur   = 0;

    if (k.song) {
      ctx.fillStyle   = design.textColor;
      ctx.globalAlpha = 0.88;
      ctx.font        = `600 ${songSize}px 'Lora',serif`;
      ctx.fillText(_toTitleCase(k.song).substring(0, 32), pad, songY);
    }

    if (k.artist) {
      ctx.fillStyle   = design.accentColor;
      ctx.globalAlpha = 1;
      ctx.font        = `700 ${artistSize}px 'Lora',serif`;
      ctx.fillText(_toTitleCase(k.artist).substring(0, 32), metaPad, artistY);
    }
    ctx.restore();
  }

  /* ── Watermark — ghost but legible ── */
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'center';
  ctx.fillStyle    = isLight ? 'rgba(26,26,32,0.20)' : 'rgba(232,197,71,0.22)';
  ctx.globalAlpha  = 1;
  ctx.font         = `600 ${Math.max(9, Math.round(W * 0.016))}px 'Lora',serif`;
  ctx.letterSpacing = '2px';
  ctx.fillText('trymargo.com', W / 2, H * 0.955);
  ctx.restore();
};

/* Blend helper — returns a color slightly lifted from bg toward accent */
function _blendWithBg(bgHex, accentHex, t) {
  const bg = _hexToRgb(bgHex) || {r:14,g:11,b:26};
  const ac = _hexToRgb(accentHex) || {r:155,g:127,b:232};
  const r  = Math.round(bg.r + (ac.r - bg.r) * t);
  const g  = Math.round(bg.g + (ac.g - bg.g) * t);
  const b  = Math.round(bg.b + (ac.b - bg.b) * t);
  return `rgb(${r},${g},${b})`;
}
function _hexToRgb(hex) {
  if (!hex || hex[0] !== '#') return null;
  const h = hex.replace('#','');
  const n = parseInt(h.length === 3
    ? h.split('').map(c=>c+c).join('') : h, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

/* ==========================================================
   STAGE CANVAS REFRESH
========================================================== */
function refreshStageCanvas() {
  const canvas = document.getElementById('studioCanvas');
  if (!canvas) return;
  const post = studioPost || window.currentPost;
  if (!post)  return;

  const size  = CANVAS_SIZES[studioCanvasSize] || CANVAS_SIZES.square;
  const stage = canvas.parentElement;
  if (!stage) return;

  const maxW  = stage.clientWidth  || 320;
  const maxH  = (stage.clientHeight || 380) - 20;
  const scale = Math.min(maxW / size.w, maxH / size.h, 1);

  canvas.width        = size.w;
  canvas.height       = size.h;
  canvas.style.width  = Math.round(size.w * scale) + 'px';
  canvas.style.height = Math.round(size.h * scale) + 'px';

  const ctx = canvas.getContext('2d');
  window.drawPosterToCtx(ctx, size.w, size.h, post);
}

/* ==========================================================
   SLIDER GRADIENT HELPER
========================================================== */
function _updateSlider(slider, value) {
  const min = parseInt(slider.min || 0);
  const max = parseInt(slider.max || 100);
  const pct = ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right,#E8C547 ${pct}%,rgba(255,255,255,0.12) ${pct}%)`;
}

/* ==========================================================
   WIRE UP PANELS
========================================================== */
function wireColorPanel() {
  const panel = document.getElementById('panel-color');
  if (!panel) return;

  panel.querySelectorAll('.scene-swatch').forEach(btn => {
    const designId = btn.dataset.design;
    if (designId === studioDesign) btn.classList.add('active');
    btn.onclick = () => {
      studioDesign = designId;
      panel.querySelectorAll('.scene-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });

  const slider = document.getElementById('studiobrightness');
  const val    = document.getElementById('studioBrightnessVal');
  if (slider) {
    _updateSlider(slider, studioBrightness);
    slider.oninput = () => {
      studioBrightness = parseInt(slider.value);
      if (val) val.textContent = studioBrightness + '%';
      _updateSlider(slider, studioBrightness);
      refreshStageCanvas();
    };
  }
}

function wireFontPanel() {
  const panel = document.getElementById('panel-font');
  if (!panel) return;
  panel.querySelectorAll('.font-card').forEach(btn => {
    const fontId = btn.dataset.font;
    if (fontId === studioFont) btn.classList.add('active');
    btn.onclick = () => {
      studioFont = fontId;
      panel.querySelectorAll('.font-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });
}

function wirePhotoPanel() {
  const panel = document.getElementById('panel-photo');
  if (!panel) return;

  const dropZone  = document.getElementById('photoUploadZone');
  const fileInput = document.getElementById('studioPhotoInput');
  const controls  = document.getElementById('photoControls');
  const dropText  = document.getElementById('photoDropText');
  const blurSlider= document.getElementById('studioBlur');
  const blurVal   = document.getElementById('studioBlurVal');
  const dimSlider = document.getElementById('studioDim');
  const dimVal    = document.getElementById('studioDimVal');
  const removeBtn = document.getElementById('studioRemovePhoto');

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('has-photo'); };
    dropZone.ondragleave = () => { if (!studioPhotoData) dropZone.classList.remove('has-photo'); };
    dropZone.ondrop = e => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) _loadPhotoFile(file, dropZone, controls, dropText);
    };
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file) _loadPhotoFile(file, dropZone, controls, dropText);
    };
  }

  if (blurSlider) {
    _updateSlider(blurSlider, studioBlur);
    blurSlider.oninput = () => {
      studioBlur = parseInt(blurSlider.value);
      if (blurVal) blurVal.textContent = studioBlur;
      _updateSlider(blurSlider, studioBlur);
      refreshStageCanvas();
    };
  }

  if (dimSlider) {
    _updateSlider(dimSlider, studioDim);
    dimSlider.oninput = () => {
      studioDim = parseInt(dimSlider.value);
      if (dimVal) dimVal.textContent = studioDim + '%';
      _updateSlider(dimSlider, studioDim);
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
      if (dropZone) dropZone.classList.remove('has-photo');
      if (controls) controls.classList.add('hidden');
      if (dropText) dropText.textContent = 'Tap to add a photo';
      refreshStageCanvas();
    };
  }
}

function _loadPhotoFile(file, dropZone, controls, dropText) {
  const reader = new FileReader();
  reader.onload = e => {
    studioPhotoData = e.target.result;
    let imgEl = document.getElementById('_studioPhotoImg');
    if (!imgEl) {
      imgEl = document.createElement('img');
      imgEl.id = '_studioPhotoImg';
      imgEl.style.display = 'none';
      document.body.appendChild(imgEl);
    }
    imgEl.onload = () => {
      if (dropZone) dropZone.classList.add('has-photo');
      if (controls) controls.classList.remove('hidden');
      if (dropText) dropText.textContent = 'Tap to change photo';
      refreshStageCanvas();
    };
    imgEl.src = studioPhotoData;
  };
  reader.readAsDataURL(file);
}

/* ==========================================================
   FORMAT PICKER — wires size buttons if present in HTML
========================================================== */
function wireFormatPicker() {
  document.querySelectorAll('[data-format]').forEach(btn => {
    if (btn.dataset.format === studioCanvasSize) btn.classList.add('active');
    btn.onclick = () => {
      studioCanvasSize = btn.dataset.format;
      document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });
}

/* ==========================================================
   DOCK TAB SWITCHING
========================================================== */
function _switchDockTab(tabId) {
  document.querySelectorAll('.dock-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  const panelIds = {
    color: ['panel-color', 'dockColorPanel'],
    font:  ['panel-font',  'dockFontPanel'],
    photo: ['panel-photo', 'dockPhotoPanel'],
  };
  Object.values(panelIds).flat().forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  (panelIds[tabId] || []).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  });
}

/* ==========================================================
   OPEN / CLOSE
========================================================== */
window.openStudio = function(post) {
  studioPost = post || window.currentPost;
  if (!studioPost) return;

  injectStudioStyles();

  const overlay = document.getElementById('studioOverlay');
  if (!overlay) return;

  /* Reset state to defaults */
  studioDesign     = 'midnight-gold';
  studioFont       = 'lora-intimate';
  studioBrightness = 100;
  studioCanvasSize = 'square';

  /* Preload thumbnail */
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

  overlay.classList.remove('hidden');
  document.body.classList.add('modal-open');

  wireColorPanel();
  wireFontPanel();
  wirePhotoPanel();
  wireFormatPicker();

  _switchDockTab('color');

  requestAnimationFrame(() => refreshStageCanvas());
};

window.closeStudio = function() {
  document.getElementById('studioOverlay')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
};

/* ==========================================================
   EXPORT — full resolution, all fonts preloaded
========================================================== */
window.exportPoster = function exportPoster() {
  const btn  = document.getElementById('studioExportBtn');
  const _post = studioPost || window.currentPost;
  if (!_post) return;
  if (typeof window.PlatformPicker === 'undefined') {
    console.error('[Studio] PlatformPicker not loaded'); return;
  }
  window.PlatformPicker.pick({
    format: 'poster',
    view:   'card',
    p1:     _post,
    p2:     null,
    opts: {
      drawFn: (ctx, W, H) => {
        window.drawPosterToCtx(ctx, W, H, _post, {
          design:       studioDesign,
          font:         studioFont,
          brightness:   studioBrightness,
          photoData:    studioPhotoData,
          photoFilter:  studioPhotoFilter,
          photoOpacity: studioPhotoOpacity,
        });
      },
      filename: 'MARGO_' + ((_post.knowledge?.song || 'Lyric').trim().replace(/[^a-z0-9\s]/gi,'').split(/\s+/).slice(0,4).join('-').toLowerCase()).substring(0,24) + '_' + (typeof SS !== 'undefined' && SS.size === 'landscape' ? 'Wide' : typeof SS !== 'undefined' && SS.size === 'vertical' ? 'Vertical' : 'Square') + '.png',
      onDone: () => {
        if (btn) { btn.disabled = false; btn.textContent = 'Export'; }
        if (typeof showToast === 'function') showToast('Poster saved ✓');
      },
      onError: () => {
        if (btn) { btn.disabled = false; btn.textContent = 'Export'; }
        if (typeof showToast === 'function') showToast('Export failed');
      },
    },
  });
};

/* ==========================================================
   STUDIO CHOOSER
========================================================== */
window.openStudioChooser = function(post) {
  if (post) { studioPost = post; window.currentPost = post; }
  if (typeof window.openShareSheet === 'function') {
    window.openShareSheet(studioPost || window.currentPost);
  }
};
window.closeStudioChooser = function() {};

/* ==========================================================
   RESIZE
========================================================== */
let _studioResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_studioResizeTimer);
  _studioResizeTimer = setTimeout(() => {
    if (!document.getElementById('studioOverlay')?.classList.contains('hidden')) {
      refreshStageCanvas();
    }
  }, 150);
});

/* ==========================================================
   INIT
========================================================== */
(function initStudio() {
  injectStudioStyles();
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => _switchDockTab(tab.dataset.tab);
  });

})();

// Alias for share-sheet.js — outside IIFE so always available
window.drawPosterPreview = function(ctx, W, H, post) {
  window.drawPosterToCtx(ctx, W, H, post);
};


})();
