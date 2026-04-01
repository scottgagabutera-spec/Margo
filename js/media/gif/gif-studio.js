/* ============================================================
   MARGO — js/media/gif/gif-studio.js
   v2.0 — VOID VIOLET + MARGO LAYOUT
   • Void Violet default theme
   • Left-aligned italic serif lyric
   • Track number in accent mono above lyric
   • 24px accent rule above meta block
   • Near-invisible watermark
   • All themes: flat dark base, accent-only color
   • All 8 animations intact and working
   • GIF + MP4 export intact
   ============================================================ */

/* ── State ── */
const GS = {
  theme: 'void-violet', font: 'playfair', animation: 'fade-up',
  speed: 'normal', isExporting: false,
  _animFrame: null, _frame: 0, _last: 0,
  _canvasSize: 0,
};

/* ── Themes — flat dark base, accent only ── */
const GS_THEMES = {
  'void-violet':     { bg: ['#0E0B1A','#120E22','#0E0B1A'], accent: '#9B7FE8',  text: '#EAE5F5' },
  'midnight-gold':   { bg: ['#0B0B0D','#151004','#0B0B0D'], accent: '#E8C547',  text: '#ffffff' },
  'royal-purple':    { bg: ['#0d0014','#110018','#0d0014'], accent: '#c77dff',  text: '#ffffff' },
  'neon-cyan':       { bg: ['#050e1a','#081420','#050e1a'], accent: '#00e5ff',  text: '#ffffff' },
  'sunset-coral':    { bg: ['#1a0505','#200808','#1a0505'], accent: '#ff6b6b',  text: '#ffffff' },
  'emerald-night':   { bg: ['#051a0d','#081f10','#051a0d'], accent: '#50fa7b',  text: '#ffffff' },
  'rose-gold':       { bg: ['#1a0d0f','#200f12','#1a0d0f'], accent: '#f4a4c0', text: '#ffffff' },
  'monochrome':      { bg: ['#0a0a0a','#0f0f0f','#0a0a0a'], accent: '#ffffff',  text: '#ffffff' },
  'vaporwave':       { bg: ['#1a0533','#200640','#1a0533'], accent: '#ff71ce',  text: '#ffffff' },
  'neon-dark':       { bg: ['#0a0a0a','#111111','#0a0a0a'], accent: '#ff00ff',  text: '#ffffff' },
  'y2k-chrome':      { bg: ['#000033','#000540','#000033'], accent: '#00ffff',  text: '#ffffff' },
  'brutalist':       { bg: ['#ffffff','#f5f5f5','#ffffff'], accent: '#000000',  text: '#000000' },
  'cream-editorial': { bg: ['#f5f1e8','#ede8dc','#f5f1e8'], accent: '#B8901A', text: '#1a1a20' },
};

const GS_FONTS = {
  playfair:     { family:"'Playfair Display',serif",    style:'italic'  },
  cormorant:    { family:"'Cormorant Garamond',serif",  style:'italic'  },
  lora:         { family:"'Lora',serif",                style:'italic'  },
  merriweather: { family:"'Merriweather',serif",        style:'normal'  },
  josefin:      { family:"'Josefin Sans',sans-serif",   style:'normal'  },
  bebas:        { family:"'Bebas Neue',sans-serif",     style:'normal'  },
  oswald:       { family:"'Oswald',sans-serif",         style:'normal'  },
  dancing:      { family:"'Dancing Script',cursive",    style:'normal'  },
};

const GS_SPEED_MS = { slow: 130, normal: 70, fast: 35 };

const GS_ANIMS = {
  'fade-up':    { frames: 24 },
  'typewriter': { frames: 32 },
  'slide-in':   { frames: 22 },
  'pulse':      { frames: 20 },
  'glitch':     { frames: 18 },
  'wave':       { frames: 28 },
  'shimmer':    { frames: 24 },
  'bounce':     { frames: 22 },
};

const GS_EXPORT_SIZE = 1080;

/* ================================================================
   HELPERS
   ================================================================ */
function _gsHexToRgb(hex) {
  if (!hex || hex[0] !== '#') return null;
  const h = hex.replace('#','');
  const n = parseInt(h.length === 3
    ? h.split('').map(c=>c+c).join('') : h, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

function _gsBlendWithBg(bgHex, accentHex, t) {
  const bg = _gsHexToRgb(bgHex) || {r:14,g:11,b:26};
  const ac = _gsHexToRgb(accentHex) || {r:155,g:127,b:232};
  const r  = Math.round(bg.r + (ac.r - bg.r) * t);
  const g  = Math.round(bg.g + (ac.g - bg.g) * t);
  const b  = Math.round(bg.b + (ac.b - bg.b) * t);
  return `rgb(${r},${g},${b})`;
}

function _gsTrackNumber(post) {
  if (!post) return '— track 01';
  const id  = post.id || post._id || '';
  const num = id ? (parseInt(id.toString().replace(/\D/g,'').slice(-2) || '1', 10) % 99) + 1 : 1;
  return '— track ' + String(num).padStart(2, '0');
}

/* ── Word wrap ── */
function gsWrap(ctx, text, x, y, maxW, lineH, align) {
  const words = text.split(' ');
  let line = '', lines = [];
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
    else line = t;
  });
  if (line.trim()) lines.push(line.trim());

  const startY = align === 'center'
    ? y - ((lines.length - 1) * lineH) / 2
    : y;

  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineH));
  return lines.length;
}

/* ── Lyric font size ── */
function gsLyricFont(ctx, data, scale) {
  const len  = data.lyric.length;
  const sz   = len < 40 ? 48 * scale : len < 70 ? 38 * scale : 28 * scale;
  const bold = ['bebas','josefin','oswald'].includes(GS.font);
  ctx.font   = `${data.font.style === 'italic' ? 'italic ' : ''}${bold ? '700' : '600'} ${sz}px ${data.font.family}`;
  return sz;
}
/* ================================================================
   MARGO WORDMARK
   ================================================================ */
function gsDrawWordmark(ctx, W, H, theme) {
  var _isLight = theme.text === '#000000' || theme.text === '#1a1a20';
  drawMargoLockup(ctx, Math.round(W*0.035), Math.round(W*0.035), W*0.048, theme.accent, _isLight);
}

/* ================================================================
   WATERMARK — near-invisible
   ================================================================ */
function gsDrawWatermark(ctx, W, H, theme) {
  const isLight = theme.text === '#000000' || theme.text === '#1a1a20';
  const wmColor = isLight
    ? 'rgba(26,26,32,0.10)'
    : _gsBlendWithBg(theme.bg[0], theme.accent, 0.07);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';
  ctx.fillStyle    = wmColor;
  ctx.font         = `700 ${Math.max(9, W * 0.018)}px Space Mono, monospace`;
  ctx.fillText('trymargo.com', W / 2, H * 0.955);
  ctx.restore();
}

/* ================================================================
   FRAME RENDERER — gsDrawFrame
   ================================================================ */
function gsDrawFrame(ctx, W, H, t, post) {
  const p     = post || window.currentPost || {};
  const theme = GS_THEMES[GS.theme] || GS_THEMES['void-violet'];
  const font  = GS_FONTS[GS.font]   || GS_FONTS.playfair;
  const k     = p.knowledge || {};

  const data = {
    lyric:  (p.text    || 'Your lyric here').substring(0, 120),
    song:   (k.song    || '').substring(0, 36),
    artist: (k.artist  || '').substring(0, 36),
    track:  _gsTrackNumber(p),
    theme, font,
  };

  const pad    = Math.round(W * 0.075);
  const innerW = W - pad * 2;
  const scale  = W / 600;
  const isLight = theme.text === '#000000' || theme.text === '#1a1a20';

  /* ── Background ── */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   theme.bg[0]);
  g.addColorStop(0.5, theme.bg[1]);
  g.addColorStop(1,   theme.bg[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* ── Dot grid texture ── */
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.fillStyle   = theme.accent;
  const gridSpacing = Math.round(W * 0.05);
  for (let y = gridSpacing; y < H; y += gridSpacing) {
    for (let x = gridSpacing; x < W; x += gridSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  /* ── Logo ── */
  gsDrawWordmark(ctx, W, H, theme);

  /* ── Lyric block position ── */
  const sz = gsLyricFont(ctx, data, scale);
  ctx.save();

  const anim = GS.animation;
  if      (anim === 'fade-up')    gsFadeUp(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'typewriter') gsTypewriter(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'slide-in')   gsSlideIn(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'pulse')      gsPulse(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'glitch')     gsGlitch(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'wave')       gsWave(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'shimmer')    gsShimmer(ctx, W, H, t, data, scale, pad, innerW, sz);
  else if (anim === 'bounce')     gsBounce(ctx, W, H, t, data, scale, pad, innerW, sz);
  ctx.restore();

  /* ── Meta block — always drawn on top of animation ── */
  gsMeta(ctx, W, H, data, scale, pad, theme);
  gsDrawWatermark(ctx, W, H, theme);
}

/* ── Track number + rule — shared static layer ── */
function gsDrawTrackAndRule(ctx, W, H, data, scale, pad, lyricStartY, metaY) {
  const theme = data.theme;

  /* Track number */
  const trackSize = Math.max(8, Math.round(W * 0.020));
  ctx.save();
  ctx.font         = `700 ${trackSize}px Space Mono, monospace`;
  ctx.fillStyle    = theme.accent;
  ctx.globalAlpha  = 0.55;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  ctx.fillText(data.track, pad, lyricStartY - trackSize * 1.8);
  ctx.restore();

  /* Accent rule above meta */
  ctx.save();
  ctx.fillStyle   = theme.accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(pad, metaY - Math.round(W * 0.038), Math.round(W * 0.026), Math.round(H * 0.003));
  ctx.restore();
}

/* ── Meta (song/artist) — left-aligned ── */
function gsMeta(ctx, W, H, data, scale, pad, theme) {
  const metaY  = H * 0.76;
  const isLight = theme.text === '#000000' || theme.text === '#1a1a20';

  gsDrawTrackAndRule(ctx, W, H, data, scale, pad, H * 0.36, metaY);

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign    = 'left';
  ctx.shadowBlur   = 0;

  if (data.song) {
    ctx.fillStyle   = data.theme.text;
    ctx.globalAlpha = 0.9;
    ctx.font        = `600 ${Math.max(11, Math.round(W * 0.028))}px Space Mono, monospace`;
    ctx.fillText(data.song, pad, metaY);
  }
  if (data.artist) {
    ctx.fillStyle   = data.theme.accent;
    ctx.globalAlpha = 1;
    ctx.font        = `700 ${Math.max(9, Math.round(W * 0.022))}px Space Mono, monospace`;
    ctx.fillText(data.artist, pad, metaY + Math.round(W * 0.036));
  }
  ctx.restore();
}

/* ================================================================
   ANIMATIONS — all left-aligned
   ================================================================ */

/* lyric start Y for all animations */
function _lyricY(H) { return H * 0.36; }

function gsFadeUp(ctx, W, H, t, data, scale, pad, innerW, sz) {
  const e  = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  const oy = (1 - e) * 36 * scale;
  const a  = Math.min(1, e * 2.2);
  ctx.globalAlpha  = a;
  ctx.shadowColor  = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur   = 14 * scale;
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  gsWrap(ctx, data.lyric, pad, _lyricY(H) + oy, innerW, sz * 1.45, 'left');
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
}

function gsTypewriter(ctx, W, H, t, data, scale, pad, innerW, sz) {
  const chars = Math.floor(t * (data.lyric.length + 6));
  const vis   = data.lyric.substring(0, Math.min(chars, data.lyric.length));
  const cur   = chars <= data.lyric.length && (Math.floor(t * 10) % 2 === 0) ? '|' : '';
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor  = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur   = 10 * scale;
  gsWrap(ctx, vis + cur, pad, _lyricY(H), innerW, sz * 1.45, 'left');
  ctx.shadowBlur = 0;
}

function gsSlideIn(ctx, W, H, t, data, scale, pad, innerW, sz) {
  const e  = t < 0.4 ? t / 0.4 : 1;
  const eo = 1 - Math.pow(1 - e, 3);
  const ox = (1 - eo) * W * 0.5;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.globalAlpha  = Math.min(1, eo * 1.6);
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor  = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur   = 12 * scale;
  ctx.translate(ox, 0);
  gsWrap(ctx, data.lyric, pad, _lyricY(H), innerW, sz * 1.45, 'left');
  ctx.restore();
  ctx.shadowBlur = 0;
}

function gsPulse(ctx, W, H, t, data, scale, pad, innerW, sz) {
  const p    = 0.94 + 0.06 * Math.sin(t * Math.PI * 2);
  const glow = 0.5  + 0.5  * Math.sin(t * Math.PI * 2);
  ctx.save();
  ctx.translate(pad, _lyricY(H));
  ctx.scale(p, p);
  ctx.shadowColor  = data.theme.accent;
  ctx.shadowBlur   = (6 + glow * 18) * scale;
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  gsWrap(ctx, data.lyric, 0, 0, innerW, sz * 1.45, 'left');
  ctx.restore();
  ctx.shadowBlur = 0;
}

function gsGlitch(ctx, W, H, t, data, scale, pad, innerW, sz) {
  const phase = Math.floor(t * 9);
  const isG   = phase % 3 === 0 && t < 0.85;
  const ox    = isG ? ((phase * 7919) % 11 - 5) * scale : 0;
  if (isG) {
    ctx.save();
    ctx.globalAlpha  = 0.5;
    ctx.fillStyle    = '#ff0040';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.translate(3 * scale, 0);
    gsWrap(ctx, data.lyric, pad + ox, _lyricY(H), innerW, sz * 1.45, 'left');
    ctx.restore();
  }
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowBlur   = 0;
  ctx.save();
  ctx.translate(isG ? ox : 0, 0);
  gsWrap(ctx, data.lyric, pad, _lyricY(H), innerW, sz * 1.45, 'left');
  ctx.restore();
}

function gsWave(ctx, W, H, t, data, scale, pad, innerW, sz) {
  /* Decorative wave line */
  ctx.beginPath();
  ctx.strokeStyle = data.theme.accent + '55';
  ctx.lineWidth   = 1.5 * scale;
  for (let x = 0; x <= W; x += 2) {
    const y = H * 0.87 + Math.sin((x / W) * 4 * Math.PI + t * Math.PI * 2) * 6 * scale;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.shadowColor  = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur   = 10 * scale;
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';

  const words   = data.lyric.split(' ');
  let cx2       = pad;
  const baseY   = _lyricY(H);
  let rowY      = baseY;
  let rowWidth  = 0;

  words.forEach((w, i) => {
    const ww  = ctx.measureText(w + ' ').width;
    if (rowWidth + ww > innerW && rowWidth > 0) {
      rowY     += sz * 1.45;
      cx2       = pad;
      rowWidth  = 0;
    }
    const wy = rowY + Math.sin((i / words.length) * Math.PI * 2 + t * Math.PI * 2) * 5 * scale;
    ctx.fillText(w + ' ', cx2, wy);
    cx2      += ww;
    rowWidth += ww;
  });
  ctx.shadowBlur = 0;
}

function gsShimmer(ctx, W, H, t, data, scale, pad, innerW, sz) {
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowBlur   = 0;
  gsWrap(ctx, data.lyric, pad, _lyricY(H), innerW, sz * 1.45, 'left');

  const sx = t * (W + 160 * scale) - 80 * scale;
  const sh = ctx.createLinearGradient(sx - 70 * scale, 0, sx + 70 * scale, 0);
  sh.addColorStop(0,   'transparent');
  sh.addColorStop(0.4, data.theme.accent);
  sh.addColorStop(0.6, '#ffffff');
  sh.addColorStop(1,   'transparent');

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.65;
  ctx.fillStyle   = sh;
  gsWrap(ctx, data.lyric, pad, _lyricY(H), innerW, sz * 1.45, 'left');
  ctx.restore();
}

function gsBounce(ctx, W, H, t, data, scale, pad, innerW, sz) {
  const b  = t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  const oy = (1 - b) * H * 0.25;
  const sy = 0.88 + b * 0.12;
  ctx.save();
  ctx.translate(pad, _lyricY(H) + oy);
  ctx.scale(1, sy);
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor  = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur   = 12 * scale;
  gsWrap(ctx, data.lyric, 0, 0, innerW, sz * 1.45, 'left');
  ctx.restore();
  ctx.shadowBlur = 0;
}

/* ================================================================
   INIT
   ================================================================ */
function initGifStudio() {
  const ov = document.getElementById('gifStudioOverlay');
  if (!ov) return;

  ov.querySelectorAll('.gs-swatch').forEach(sw => {
    sw.onclick = () => {
      ov.querySelectorAll('.gs-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      GS.theme = sw.dataset.theme;
    };
  });

  ov.querySelectorAll('.gs-font-card').forEach(fc => {
    fc.onclick = () => {
      ov.querySelectorAll('.gs-font-card').forEach(f => f.classList.remove('active'));
      fc.classList.add('active');
      GS.font = fc.dataset.font;
    };
  });

  ov.querySelectorAll('.gs-anim-btn').forEach(btn => {
    btn.onclick = () => {
      ov.querySelectorAll('.gs-anim-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GS.animation = btn.dataset.anim;
      gsStartPreview();
    };
  });

  ov.querySelectorAll('.gs-speed-btn').forEach(btn => {
    btn.onclick = () => {
      ov.querySelectorAll('.gs-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GS.speed = btn.dataset.speed;
    };
  });

  ov.querySelectorAll('.gs-tab').forEach(tab => {
    tab.onclick = () => {
      ov.querySelectorAll('.gs-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ov.querySelectorAll('.gs-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`gs-panel-${tab.dataset.gstab}`);
      if (panel) panel.classList.add('active');
    };
  });

  document.getElementById('gsExportBtn')?.addEventListener('click', gsExport);
  document.getElementById('gsExportMp4')?.addEventListener('click', gsExportMp4);
  document.getElementById('closeGifStudio').onclick = closeGifStudio;
}

/* ================================================================
   OPEN / CLOSE
   ================================================================ */
function openGifStudio(post) {
  if (post) window.currentPost = post;
  const ov = document.getElementById('gifStudioOverlay');
  if (!ov) return;

  GS.theme     = 'void-violet';
  GS.font      = 'playfair';
  GS.animation = 'fade-up';
  GS.speed     = 'normal';
  GS.isExporting   = false;
  GS._canvasSize   = 0;

  ov.querySelectorAll('.gs-swatch').forEach((s, i)    => s.classList.toggle('active', i === 0));
  ov.querySelectorAll('.gs-font-card').forEach((f, i) => f.classList.toggle('active', i === 0));
  ov.querySelectorAll('.gs-anim-btn').forEach((b, i)  => b.classList.toggle('active', i === 0));
  ov.querySelectorAll('.gs-speed-btn').forEach(b      => b.classList.toggle('active', b.dataset.speed === 'normal'));

  const gifBtn = document.getElementById('gsExportBtn');
  const mp4Btn = document.getElementById('gsExportMp4');
  if (gifBtn) { gifBtn.textContent = 'GIF';     gifBtn.disabled = false; }
  if (mp4Btn) { mp4Btn.textContent = '▶ Video'; mp4Btn.disabled = false; }

  ov.classList.remove('hidden');
  document.body.classList.add('modal-open');
  gsStartPreview();
}

function closeGifStudio() {
  gsStopPreview();
  document.getElementById('gifStudioOverlay')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  document.getElementById('studioChooser')?.classList.remove('hidden');
}

/* ================================================================
   PREVIEW LOOP
   ================================================================ */
function gsStartPreview() {
  gsStopPreview();
  GS._frame = 0; GS._last = 0;

  const loop = (ts) => {
    const delay = GS_SPEED_MS[GS.speed] || 70;
    if (ts - GS._last >= delay) {
      GS._last = ts;
      const canvas = document.getElementById('gsCanvas');
      if (canvas) {
        const anim   = GS_ANIMS[GS.animation];
        const frames = anim?.frames || 24;
        const stage  = canvas.parentElement;
        const dpr    = window.devicePixelRatio || 1;
        const size   = Math.min(stage.clientWidth - 24, 340);

        if (size !== GS._canvasSize) {
          GS._canvasSize      = size;
          canvas.style.width  = size + 'px';
          canvas.style.height = size + 'px';
          canvas.width        = Math.round(size * dpr);
          canvas.height       = Math.round(size * dpr);
        }

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        gsDrawFrame(ctx, size, size, GS._frame / frames, window.currentPost);
        GS._frame = (GS._frame + 1) % frames;
      }
    }
    GS._animFrame = requestAnimationFrame(loop);
  };
  GS._animFrame = requestAnimationFrame(loop);
}

function gsStopPreview() {
  if (GS._animFrame) { cancelAnimationFrame(GS._animFrame); GS._animFrame = null; }
}

/* ================================================================
   GIF EXPORT
   ================================================================ */
async function gsExport() {
  if (GS.isExporting) return;
  GS.isExporting = true;
  gsStopPreview();

  const gifBtn = document.getElementById('gsExportBtn');
  const mp4Btn = document.getElementById('gsExportMp4');
  if (gifBtn) gifBtn.disabled = true;
  if (mp4Btn) mp4Btn.disabled = true;

  const SIZE   = GS_EXPORT_SIZE;
  const anim   = GS_ANIMS[GS.animation];
  const frames = anim?.frames || 24;
  const delay  = GS_SPEED_MS[GS.speed] || 70;

  const off = document.createElement('canvas');
  off.width = SIZE; off.height = SIZE;
  const oc  = off.getContext('2d');
  const exportPost = window.currentPost || {};

  try {
    await document.fonts.ready;

    if (typeof GIF === 'undefined') {
      await new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src   = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
    }

    const gif = new GIF({
      workers: 4, quality: 1,
      width: SIZE, height: SIZE,
      workerScript: '/js/media/gif/gif.worker.js',
      dither: false,
    });

    for (let i = 0; i < frames; i++) {
      oc.clearRect(0, 0, SIZE, SIZE);
      gsDrawFrame(oc, SIZE, SIZE, i / frames, exportPost);
      gif.addFrame(off, { copy: true, delay });
      if (gifBtn) gifBtn.textContent = `GIF ${Math.round((i / frames) * 75)}%`;
      await new Promise(r => setTimeout(r, 0));
    }

    gif.on('progress', p => {
      if (gifBtn) gifBtn.textContent = `Encoding… ${Math.round(75 + p * 25)}%`;
    });

    gif.on('finished', blob => {
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `margo-${Date.now()}.gif`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      if (gifBtn) { gifBtn.textContent = '✓ GIF Saved!'; gifBtn.disabled = false; }
      if (mp4Btn) mp4Btn.disabled = false;
      GS.isExporting = false;
      setTimeout(gsStartPreview, 400);
    });

    gif.render();

  } catch (err) {
    console.error('GIF export error:', err);
    if (gifBtn) { gifBtn.textContent = 'GIF'; gifBtn.disabled = false; }
    if (mp4Btn) mp4Btn.disabled = false;
    GS.isExporting = false;
    gsStartPreview();
  }
}

/* ================================================================
   MP4 EXPORT
   ================================================================ */
async function gsExportMp4() {
  if (GS.isExporting) return;
  GS.isExporting = true;
  gsStopPreview();

  const gifBtn = document.getElementById('gsExportBtn');
  const mp4Btn = document.getElementById('gsExportMp4');
  if (gifBtn) gifBtn.disabled = true;
  if (mp4Btn) { mp4Btn.disabled = true; mp4Btn.textContent = 'Preparing…'; }

  const SIZE        = GS_EXPORT_SIZE;
  const anim        = GS_ANIMS[GS.animation];
  const frames      = anim?.frames || 24;
  const delay       = GS_SPEED_MS[GS.speed] || 70;
  const LOOPS       = 3;
  const totalFrames = frames * LOOPS;
  const fps         = Math.round(1000 / delay);

  const off = document.createElement('canvas');
  off.width = SIZE; off.height = SIZE;
  const oc  = off.getContext('2d');
  const exportPost = window.currentPost || {};

  try {
    await document.fonts.ready;

    const mimeType = [
      'video/mp4;codecs=avc1',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    const stream   = off.captureStream(fps);
    const chunks   = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `margo-${Date.now()}.mp4`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
      if (mp4Btn) { mp4Btn.textContent = '✓ Video Saved!'; mp4Btn.disabled = false; }
      if (gifBtn) gifBtn.disabled = false;
      GS.isExporting = false;
      setTimeout(gsStartPreview, 400);
    };

    recorder.start();
    for (let i = 0; i < totalFrames; i++) {
      oc.clearRect(0, 0, SIZE, SIZE);
      gsDrawFrame(oc, SIZE, SIZE, (i % frames) / frames, exportPost);
      if (mp4Btn) mp4Btn.textContent = `Video ${Math.round((i / totalFrames) * 100)}%`;
      await new Promise(r => setTimeout(r, delay));
    }
    recorder.stop();

  } catch (err) {
    console.error('MP4 export error:', err);
    if (mp4Btn) { mp4Btn.textContent = '▶ Video'; mp4Btn.disabled = false; }
    if (gifBtn) gifBtn.disabled = false;
    GS.isExporting = false;
    gsStartPreview();
  }
}

/* ================================================================
   INIT ON LOAD
   ================================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGifStudio);
} else {
  initGifStudio();
}

window.openGifStudio  = openGifStudio;
window.closeGifStudio = closeGifStudio;
window.gsSetTheme = function(t) { GS.theme = t; };
