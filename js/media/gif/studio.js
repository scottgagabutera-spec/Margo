/* ============================================================
   MARGO — js/gif-studio.js
   v1.8 — FIXED
   Bugs fixed vs v1.7:
   • midnight-gold bg updated to #07060A (matches style.css v6.8)
   • Wordmark font: Syne → Bebas Neue (Syne removed from index.html)
   • Preview loop: canvas size only recalculated on resize, not every frame
     — eliminates jitter + prevents compounding ctx.scale bug
   • gsWave: textAlign reset to 'center' before gsWrap fallback
   • gsShimmer: base layer draws at full opacity then composites correctly
   • gsGlitch: Math.random() stabilised per-phase to prevent flicker storm
   • All theme bg[0] values aligned to design system dark base
   ============================================================ */

/* ── State ── */
const GS = {
  theme: 'midnight-gold', font: 'playfair', animation: 'fade-up',
  speed: 'normal', isExporting: false,
  _animFrame: null, _frame: 0, _last: 0,
  _canvasSize: 0, /* cached — only recalc on resize */
};

/* ── Themes — bg[0] aligned to #07060A design system ── */
const GS_THEMES = {
  'midnight-gold':   { bg: ['#07060A','#1a1400','#07060A'], accent: '#E8C547',  text: '#ffffff' },
  'royal-purple':    { bg: ['#0d0014','#1a003a','#0d0014'], accent: '#c77dff',  text: '#ffffff' },
  'neon-cyan':       { bg: ['#050e1a','#0a1e2e','#050e1a'], accent: '#00e5ff',  text: '#ffffff' },
  'sunset-coral':    { bg: ['#1a0505','#2d0808','#1a0505'], accent: '#ff6b6b',  text: '#ffffff' },
  'emerald-night':   { bg: ['#051a0d','#0a2e18','#051a0d'], accent: '#50fa7b',  text: '#ffffff' },
  'rose-gold':       { bg: ['#1a0d0f','#2d1219','#1a0d0f'], accent: '#f4a4c0',  text: '#ffffff' },
  'monochrome':      { bg: ['#000000','#111111','#000000'], accent: '#ffffff',   text: '#ffffff' },
  'vaporwave':       { bg: ['#1a0533','#2d0a4d','#001a1a'], accent: '#ff71ce',  text: '#ffffff' },
  'neon-dark':       { bg: ['#0a0a0a','#141414','#0a0a0a'], accent: '#ff00ff',  text: '#ffffff' },
  'y2k-chrome':      { bg: ['#000033','#000824','#000033'], accent: '#00ffff',  text: '#ffffff' },
  'brutalist':       { bg: ['#ffffff','#f0f0f0','#ffffff'], accent: '#000000',  text: '#000000' },
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
   MARGO WORDMARK
   FIX: was 'Syne' — switched to 'Bebas Neue' (Syne removed from index.html)
   ================================================================ */
function gsDrawWordmark(ctx, W, H, th) {
  const sz = Math.max(14, Math.round(W*0.034));
  const pad = Math.round(W*0.048);
  ctx.save();
  ctx.font = `800 ${sz}px "Syne","Arial Black",sans-serif`;
  ctx.fillStyle = th.light ? "#0B0B0D" : th.acc;
  ctx.globalAlpha = 0.28;
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  const spacing = sz*0.22; let cx = pad;
  for (const ch of "MARGO".split("")) {
    ctx.fillText(ch, cx, pad*0.55);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.restore();
}
function gsDrawWordmark(ctx, W, H, theme) {
  const isLight = theme.text === "#000000";
  // Ghost wordmark top left - matches Lyric Back GIF
  const sz = Math.max(14, Math.round(W*0.034));
  const pad = Math.round(W*0.048);
  ctx.save();
  ctx.font = `800 ${sz}px "Syne","Arial Black",sans-serif`;
  ctx.fillStyle = isLight ? "#0B0B0D" : (theme.acc || "#E8C547");
  ctx.globalAlpha = 0.28;
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  const spacing = sz*0.22; let cx = pad;
  for (const ch of "MARGO".split("")) {
    ctx.fillText(ch, cx, pad*0.55);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.restore();
}

function gsDrawMmark(ctx, W, H, theme) {
  const isLight = theme.text === "#000000";
  const mSz = Math.round(Math.min(W,H)*0.07);
  const bx = W - Math.round(W*0.036) - mSz;
  const by = H - Math.round(H*0.034) - mSz;
  const mcx = bx+mSz/2, mcy = by+mSz/2;
  const s = mSz*0.62, mx = mcx-s/2, my = mcy-s/2;
  ctx.save();
  ctx.beginPath(); ctx.arc(mcx,mcy,mSz/2,0,Math.PI*2);
  ctx.fillStyle = isLight ? "#0B0B0D" : (theme.acc || "#E8C547");
  ctx.shadowColor="rgba(0,0,0,0.4)"; ctx.shadowBlur=18;
  ctx.fill(); ctx.shadowBlur=0;
  ctx.strokeStyle = isLight ? "#ffffff" : "#0B0B0D";
  ctx.lineWidth=mSz*0.098; ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath();
  ctx.moveTo(mx,my+s*0.78); ctx.lineTo(mx,my+s*0.13);
  ctx.lineTo(mx+s*0.35,my+s*0.60); ctx.lineTo(mx+s*0.50,my+s*0.06);
  ctx.lineTo(mx+s*0.65,my+s*0.60); ctx.lineTo(mx+s,my+s*0.13);
  ctx.lineTo(mx+s,my+s*0.78); ctx.stroke();
  ctx.restore();
}

function gsDrawMmark(ctx, W, H, theme) {
  const isLight = theme.text === "#000000";
  // M-mark circle bottom right - matches Lyric Back GIF
  const mSz = Math.round(Math.min(W,H)*0.07);
  const bx = W - Math.round(W*0.036) - mSz;
  const by = H - Math.round(H*0.034) - mSz;
  const mcx = bx+mSz/2, mcy = by+mSz/2;
  const s = mSz*0.62, mx = mcx-s/2, my = mcy-s/2;
  ctx.save();
  ctx.beginPath(); ctx.arc(mcx,mcy,mSz/2,0,Math.PI*2);
  ctx.fillStyle = isLight ? "#0B0B0D" : "#E8C547";
  ctx.shadowColor="rgba(0,0,0,0.4)"; ctx.shadowBlur=18;
  ctx.fill(); ctx.shadowBlur=0;
  ctx.strokeStyle = isLight ? "#ffffff" : "#0B0B0D";
  ctx.lineWidth=mSz*0.098; ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath();
  ctx.moveTo(mx,my+s*0.78); ctx.lineTo(mx,my+s*0.13);
  ctx.lineTo(mx+s*0.35,my+s*0.60); ctx.lineTo(mx+s*0.50,my+s*0.06);
  ctx.lineTo(mx+s*0.65,my+s*0.60); ctx.lineTo(mx+s,my+s*0.13);
  ctx.lineTo(mx+s,my+s*0.78); ctx.stroke();
  ctx.restore();
}
function gsDrawWordmark(ctx, W, H, theme) {
  ctx.save();
  const isLight = theme.text === '#000000';
  const fSize   = Math.max(18, W * 0.048);
  ctx.font         = `${fSize}px 'Bebas Neue', 'Arial Black', sans-serif`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = isLight ? '#0B0B0D' : '#E8C547';
  ctx.fillText('MARGO', W * 0.045, W * 0.046);
  ctx.restore();
}

/* ================================================================
   WATERMARK PILL
   ================================================================ */
function gsDrawWatermark(ctx, W, H, theme) {
  gsDrawMmark(ctx, W, H, theme);
  gsDrawMmark(ctx, W, H, theme);
  ctx.save();
  const isLight = theme.text === '#000000';
  const text    = 'trymargo.com';
  const fSize   = Math.max(10, W * 0.022);
  ctx.font = `700 ${fSize}px 'Space Mono', monospace`;
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(text).width;
  const padX  = fSize * 1.0;
  const padY  = fSize * 0.55;
  const pillW = textW + padX * 2;
  const pillH = fSize + padY * 2;
  const pillR = pillH / 2;
  const pillX = W / 2 - pillW / 2;
  const pillY = H * 0.938 - pillH / 2;
  ctx.beginPath();
  ctx.moveTo(pillX + pillR, pillY);
  ctx.arcTo(pillX + pillW, pillY,         pillX + pillW, pillY + pillH, pillR);
  ctx.arcTo(pillX + pillW, pillY + pillH, pillX,         pillY + pillH, pillR);
  ctx.arcTo(pillX,         pillY + pillH, pillX,         pillY,         pillR);
  ctx.arcTo(pillX,         pillY,         pillX + pillW, pillY,         pillR);
  ctx.closePath();
  ctx.fillStyle   = isLight ? 'rgba(11,11,13,0.80)' : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth   = Math.max(1, W * 0.001);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.fillText(text, W / 2, pillY + pillH / 2);
  ctx.restore();
}

/* ── Word wrap ── */
function gsWrap(ctx, text, cx, cy, maxW, lineH) {
  const words = text.split(' ');
  let line = '', lines = [];
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
    else line = t;
  });
  if (line.trim()) lines.push(line.trim());
  const startY = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
}

/* ── Meta (song/artist) ── */
function gsMeta(ctx, W, H, data, scale) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.shadowBlur = 0;
  ctx.fillStyle = data.theme.accent;
  ctx.font = `700 ${Math.max(12, 16 * scale)}px ${data.font.family}`;
  ctx.fillText(data.song, W / 2, H * 0.79);
  ctx.fillStyle = data.theme.text === '#000000' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)';
  ctx.font = `400 ${Math.max(9, 11 * scale)}px 'Space Mono', monospace`;
  ctx.fillText(data.artist, W / 2, H * 0.79 + 18 * scale);
  ctx.restore();
}

function gsLyricFont(ctx, data, scale) {
  const len  = data.lyric.length;
  const sz   = len < 40 ? 52 * scale : len < 70 ? 40 * scale : 30 * scale;
  const bold = ['bebas','josefin','oswald'].includes(GS.font);
  ctx.font   = `${data.font.style === 'italic' ? 'italic ' : ''}${bold ? '700' : '600'} ${sz}px ${data.font.family}`;
  return sz;
}

/* ================================================================
   FRAME RENDERER
   ================================================================ */
function gsDrawFrame(ctx, W, H, t, post) {
  const p     = post || window.currentPost || {};
  const theme = GS_THEMES[GS.theme] || GS_THEMES['midnight-gold'];
  const font  = GS_FONTS[GS.font]   || GS_FONTS.playfair;
  const k     = p.knowledge || {};

  const data = {
    lyric:  (p.text    || 'Your lyric here').substring(0, 120),
    song:   (k.song    || 'Unknown Song').substring(0, 36),
    artist: (k.artist  || 'Unknown Artist').substring(0, 36),
    theme, font,
  };

  /* Background gradient */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   theme.bg[0]);
  g.addColorStop(0.5, theme.bg[1]);
  g.addColorStop(1,   theme.bg[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  gsDrawWordmark(ctx, W, H, theme);

  const scale = W / 500;
  ctx.save();
  const anim = GS.animation;
  if      (anim === 'fade-up')    gsFadeUp(ctx, W, H, t, data, scale);
  else if (anim === 'typewriter') gsTypewriter(ctx, W, H, t, data, scale);
  else if (anim === 'slide-in')   gsSlideIn(ctx, W, H, t, data, scale);
  else if (anim === 'pulse')      gsPulse(ctx, W, H, t, data, scale);
  else if (anim === 'glitch')     gsGlitch(ctx, W, H, t, data, scale);
  else if (anim === 'wave')       gsWave(ctx, W, H, t, data, scale);
  else if (anim === 'shimmer')    gsShimmer(ctx, W, H, t, data, scale);
  else if (anim === 'bounce')     gsBounce(ctx, W, H, t, data, scale);
  ctx.restore();

  gsMeta(ctx, W, H, data, scale);
  gsDrawWatermark(ctx, W, H, theme);
}

/* ================================================================
   ANIMATIONS
   ================================================================ */
function gsFadeUp(ctx, W, H, t, data, scale) {
  const e  = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const oy = (1 - e) * 38 * scale;
  const a  = Math.min(1, e * 2.2);
  ctx.globalAlpha  = a;
  ctx.shadowColor  = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur   = 14 * scale;
  ctx.fillStyle    = data.theme.text;
  ctx.textAlign    = 'center';
  const sz = gsLyricFont(ctx, data, scale);
  gsWrap(ctx, data.lyric, W / 2, H * 0.44 + oy, W * 0.82, sz * 1.2);
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
}

function gsTypewriter(ctx, W, H, t, data, scale) {
  const chars = Math.floor(t * (data.lyric.length + 6));
  const vis   = data.lyric.substring(0, Math.min(chars, data.lyric.length));
  const cur   = chars <= data.lyric.length && (Math.floor(t * 10) % 2 === 0) ? '|' : '';
  ctx.fillStyle   = data.theme.text;
  ctx.textAlign   = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = 10 * scale;
  const sz = gsLyricFont(ctx, data, scale);
  gsWrap(ctx, vis + cur, W / 2, H * 0.44, W * 0.82, sz * 1.2);
  ctx.shadowBlur = 0;
}

function gsSlideIn(ctx, W, H, t, data, scale) {
  const e  = t < 0.4 ? t / 0.4 : 1;
  const eo = 1 - Math.pow(1 - e, 3);
  const ox = (1 - eo) * W * 0.55;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.globalAlpha = Math.min(1, eo * 1.6);
  ctx.fillStyle   = data.theme.text;
  ctx.textAlign   = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur  = 12 * scale;
  const sz = gsLyricFont(ctx, data, scale);
  ctx.translate(ox, 0);
  gsWrap(ctx, data.lyric, W / 2, H * 0.44, W * 0.82, sz * 1.2);
  ctx.restore();
  ctx.shadowBlur = 0;
}

function gsPulse(ctx, W, H, t, data, scale) {
  const p    = 0.93 + 0.07 * Math.sin(t * Math.PI * 2);
  const glow = 0.5  + 0.5  * Math.sin(t * Math.PI * 2);
  ctx.save();
  ctx.translate(W / 2, H * 0.44);
  ctx.scale(p, p);
  const sz = gsLyricFont(ctx, data, scale);
  ctx.shadowColor = data.theme.accent;
  ctx.shadowBlur  = (8 + glow * 22) * scale;
  ctx.fillStyle   = data.theme.text;
  ctx.textAlign   = 'center';
  gsWrap(ctx, data.lyric, 0, 0, W * 0.82, sz * 1.2);
  ctx.restore();
  ctx.shadowBlur = 0;
}

/* FIX: glitch offsets now seeded per-phase (not Math.random() per-pixel) */
function gsGlitch(ctx, W, H, t, data, scale) {
  const phase = Math.floor(t * 9);
  const isG   = phase % 3 === 0 && t < 0.85;
  /* deterministic offset based on phase — eliminates per-frame flicker storm */
  const ox    = isG ? ((phase * 7919) % 11 - 5) * scale : 0;
  const sz    = gsLyricFont(ctx, data, scale);
  if (isG) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle   = '#ff0040';
    ctx.textAlign   = 'center';
    ctx.translate(3 * scale, 0);
    gsWrap(ctx, data.lyric, W / 2 + ox, H * 0.44, W * 0.82, sz * 1.2);
    ctx.restore();
  }
  ctx.fillStyle  = data.theme.text;
  ctx.textAlign  = 'center';
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.translate(isG ? ox : 0, 0);
  gsWrap(ctx, data.lyric, W / 2, H * 0.44, W * 0.82, sz * 1.2);
  ctx.restore();
}

/* FIX: textAlign reset to 'center' before gsWrap fallback */
function gsWave(ctx, W, H, t, data, scale) {
  /* decorative wave line */
  ctx.beginPath();
  ctx.strokeStyle = data.theme.accent + '55';
  ctx.lineWidth   = 1.5 * scale;
  for (let x = 0; x <= W; x += 2) {
    const y = H * 0.87 + Math.sin((x / W) * 4 * Math.PI + t * Math.PI * 2) * 7 * scale;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = 10 * scale;
  const sz        = gsLyricFont(ctx, data, scale);

  /* measure total width for word-wave path */
  ctx.textAlign = 'left';
  const totalW  = data.lyric.split(' ').reduce((a, w) => a + ctx.measureText(w + ' ').width, 0);

  if (totalW > W * 0.88) {
    /* FIX: reset textAlign to center before gsWrap */
    ctx.textAlign = 'center';
    gsWrap(ctx, data.lyric, W / 2, H * 0.43, W * 0.82, sz * 1.2);
  } else {
    let cx2 = W / 2 - totalW / 2;
    data.lyric.split(' ').forEach((w, i) => {
      const wy = H * 0.44 + Math.sin((i / (data.lyric.split(' ').length)) * Math.PI * 2 + t * Math.PI * 2) * 7 * scale;
      ctx.textAlign = 'left';
      ctx.fillStyle = data.theme.text;
      ctx.fillText(w + ' ', cx2, wy);
      cx2 += ctx.measureText(w + ' ').width;
    });
  }
  ctx.shadowBlur = 0;
}

/* FIX: base layer drawn at full opacity; composite clip works correctly */
function gsShimmer(ctx, W, H, t, data, scale) {
  const sz = gsLyricFont(ctx, data, scale);

  /* Step 1: draw base text at full opacity */
  ctx.fillStyle  = data.theme.text;
  ctx.textAlign  = 'center';
  ctx.shadowBlur = 0;
  gsWrap(ctx, data.lyric, W / 2, H * 0.44, W * 0.82, sz * 1.2);

  /* Step 2: overlay shimmer using source-atop so it clips to drawn pixels */
  const sx = t * (W + 160 * scale) - 80 * scale;
  const sh = ctx.createLinearGradient(sx - 70 * scale, 0, sx + 70 * scale, 0);
  sh.addColorStop(0,   'transparent');
  sh.addColorStop(0.4, data.theme.accent);
  sh.addColorStop(0.6, '#ffffff');
  sh.addColorStop(1,   'transparent');

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.7;
  ctx.fillStyle   = sh;
  gsWrap(ctx, data.lyric, W / 2, H * 0.44, W * 0.82, sz * 1.2);
  ctx.restore();
}

function gsBounce(ctx, W, H, t, data, scale) {
  const b  = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const oy = (1 - b) * H * 0.28;
  const sy = 0.86 + b * 0.14;
  ctx.save();
  ctx.translate(W / 2, H * 0.44 + oy);
  ctx.scale(1, sy);
  const sz = gsLyricFont(ctx, data, scale);
  ctx.fillStyle   = data.theme.text;
  ctx.textAlign   = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur  = 12 * scale;
  gsWrap(ctx, data.lyric, 0, 0, W * 0.82, sz * 1.2);
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
      /* restart preview immediately on anim change */
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

  /* Tab switching */
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

  GS.theme = 'midnight-gold'; GS.font = 'playfair';
  GS.animation = 'fade-up'; GS.speed = 'normal';
  GS.isExporting = false;
  GS._canvasSize = 0; /* force size recalc on open */

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
   FIX: canvas dimensions only recalculated when size actually changes
        — eliminates jitter + ctx.scale compounding on every frame
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

        /* FIX: only resize canvas (and reset ctx scale) when size actually changed */
        if (size !== GS._canvasSize) {
          GS._canvasSize = size;
          canvas.style.width  = size + 'px';
          canvas.style.height = size + 'px';
          canvas.width  = Math.round(size * dpr);
          canvas.height = Math.round(size * dpr);
        }

        const ctx = canvas.getContext('2d');
        /* Always reset transform before drawing — safe because we control every pixel */
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
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
    }

    const gif = new GIF({
      workers: 4, quality: 1,
      width: SIZE, height: SIZE,
      workerScript: '/js/gif.worker.js',
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
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = `margo-${Date.now()}.gif`;
      a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      if (gifBtn) { gifBtn.textContent = '✓ GIF Saved!'; gifBtn.disabled = false; }
      if (mp4Btn) mp4Btn.disabled = false;
      GS.isExporting = false;
      setTimeout(gsStartPreview, 400);
    });

    gif.render();

  } catch (err) {
    console.error('GIF error:', err);
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
      a.href = url; a.download = `margo-${Date.now()}.mp4`;
      a.style.display = 'none';
      document.body.appendChild(a); a.click();
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
    console.error('MP4 error:', err);
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
