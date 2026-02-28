/* ============================================================
   MARGO — js/gif-studio.js
   Animated GIF Studio: canvas-rendered lyric animations → GIF
   8 animation styles, all themes, all fonts from image studio
   v1.3 — Proper brand logo (icon + ripple rings) top-left
          Always-legible trymargo.com pill watermark bottom
          Max quality export: 1080px, quality:1, 4 workers
   ============================================================ */

/* ── State ── */
const GS = {
  theme: 'midnight-gold', font: 'playfair', animation: 'fade-up',
  speed: 'normal', isExporting: false,
  _animFrame: null, _frame: 0, _last: 0,
};

/* ── Themes ── */
const GS_THEMES = {
  'midnight-gold':  { bg: ['#0B0B0D','#1a1400','#0B0B0D'], accent: '#E8C547',  text: '#ffffff' },
  'royal-purple':   { bg: ['#0d0014','#1a003a','#0d0014'], accent: '#c77dff',  text: '#ffffff' },
  'neon-cyan':      { bg: ['#050e1a','#0a1e2e','#050e1a'], accent: '#00e5ff',  text: '#ffffff' },
  'sunset-coral':   { bg: ['#1a0505','#2d0808','#1a0505'], accent: '#ff6b6b',  text: '#ffffff' },
  'emerald-night':  { bg: ['#051a0d','#0a2e18','#051a0d'], accent: '#50fa7b',  text: '#ffffff' },
  'rose-gold':      { bg: ['#1a0d0f','#2d1219','#1a0d0f'], accent: '#f4a4c0',  text: '#ffffff' },
  'monochrome':     { bg: ['#000000','#111111','#000000'], accent: '#ffffff',   text: '#ffffff' },
  'vaporwave':      { bg: ['#1a0533','#2d0a4d','#001a1a'], accent: '#ff71ce',  text: '#ffffff' },
  'neon-dark':      { bg: ['#0a0a0a','#141414','#0a0a0a'], accent: '#ff00ff',  text: '#ffffff' },
  'y2k-chrome':     { bg: ['#000033','#000824','#000033'], accent: '#00ffff',  text: '#ffffff' },
  'brutalist':      { bg: ['#ffffff','#f0f0f0','#ffffff'], accent: '#000000',   text: '#000000' },
  'cream-editorial':{ bg: ['#f5f1e8','#ede8dc','#f5f1e8'], accent: '#B8901A', text: '#1a1a20' },
};

const GS_FONTS = {
  playfair:    { family:"'Playfair Display',serif",    style:'italic'  },
  cormorant:   { family:"'Cormorant Garamond',serif",  style:'italic'  },
  lora:        { family:"'Lora',serif",                style:'italic'  },
  merriweather:{ family:"'Merriweather',serif",        style:'normal'  },
  josefin:     { family:"'Josefin Sans',sans-serif",   style:'normal'  },
  bebas:       { family:"'Bebas Neue',sans-serif",     style:'normal'  },
  oswald:      { family:"'Oswald',sans-serif",         style:'normal'  },
  dancing:     { family:"'Dancing Script',cursive",    style:'normal'  },
};

const GS_SPEED_MS = { slow: 130, normal: 70, fast: 35 };

const GS_ANIMS = {
  'fade-up':   { label:'Fade Up',    frames:24, icon:'↑' },
  'typewriter':{ label:'Typewriter', frames:32, icon:'▌' },
  'slide-in':  { label:'Slide In',   frames:22, icon:'→' },
  'pulse':     { label:'Pulse',      frames:20, icon:'◎' },
  'glitch':    { label:'Glitch',     frames:18, icon:'▒' },
  'wave':      { label:'Wave',       frames:28, icon:'∿' },
  'shimmer':   { label:'Shimmer',    frames:24, icon:'✦' },
  'bounce':    { label:'Bounce',     frames:22, icon:'◡' },
};

/* ── Export resolution ── */
const GS_EXPORT_SIZE = 1080;

/* ================================================================
   BRAND MARK RENDERER
   Draws the full Margo logo: ripple rings + gold circle + M-mark
   Sourced directly from brand kit SVG paths.

   cx, cy  = centre of the logo circle
   r       = radius of the gold circle (outermost ring reaches ~2.65r)
   ================================================================ */
function gsDrawBrandMark(ctx, cx, cy, r) {
  ctx.save();

  /* ── 3 concentric ripple rings ── */
  const ripples = [
    { rMult: 1.55, alpha: 0.18, width: 0.06 },
    { rMult: 2.05, alpha: 0.10, width: 0.05 },
    { rMult: 2.65, alpha: 0.05, width: 0.04 },
  ];
  ripples.forEach(({ rMult, alpha, width }) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * rMult, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(232,197,71,${alpha})`;
    ctx.lineWidth   = r * width;
    ctx.stroke();
  });

  /* ── Gold filled circle ── */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#E8C547';
  ctx.fill();

  /* ── M / lightning icon mark
        Original from brand kit SVG (circle r=102, centred at 150,150):
        M114 122 L114 70 L124 86 L140 68 L156 86 L166 70 L166 122
        We scale and translate to fit our (cx,cy,r).
  ── */
  const s  = r / 102;           // scale factor
  const ox = cx - 150 * s;     // X origin shift
  const oy = cy - 150 * s;     // Y origin shift

  ctx.beginPath();
  ctx.moveTo(ox + 114*s, oy + 122*s);
  ctx.lineTo(ox + 114*s, oy +  70*s);
  ctx.lineTo(ox + 124*s, oy +  86*s);
  ctx.lineTo(ox + 140*s, oy +  68*s);
  ctx.lineTo(ox + 156*s, oy +  86*s);
  ctx.lineTo(ox + 166*s, oy +  70*s);
  ctx.lineTo(ox + 166*s, oy + 122*s);
  ctx.strokeStyle = '#0B0B0D';
  ctx.lineWidth   = 9 * s;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.stroke();

  /* ── Small base rectangle ── */
  const bx = ox + 133*s, by = oy + 125*s;
  const bw = 14*s,       bh = 5*s, br = 2.5*s;
  ctx.beginPath();
  ctx.moveTo(bx + br, by);
  ctx.arcTo(bx+bw, by,    bx+bw, by+bh, br);
  ctx.arcTo(bx+bw, by+bh, bx,    by+bh, br);
  ctx.arcTo(bx,    by+bh, bx,    by,    br);
  ctx.arcTo(bx,    by,    bx+bw, by,    br);
  ctx.closePath();
  ctx.fillStyle = 'rgba(11,11,13,0.45)';
  ctx.fill();

  ctx.restore();
}

/* ================================================================
   WATERMARK — always-legible frosted pill at bottom centre
   Font: Space Mono (Margo brand mono font)
   Pill background guarantees contrast on every theme
   ================================================================ */
function gsDrawWatermark(ctx, W, H, theme) {
  ctx.save();

  const isLight = (theme.text === '#000000');
  const text    = 'trymargo.com';
  const fSize   = Math.max(10, W * 0.022);

  ctx.font         = `700 ${fSize}px 'Space Mono', monospace`;
  ctx.textBaseline = 'middle';

  const textW = ctx.measureText(text).width;
  const padX  = fSize * 1.0;
  const padY  = fSize * 0.55;
  const pillW = textW + padX * 2;
  const pillH = fSize + padY * 2;
  const pillR = pillH / 2;
  const pillX = W / 2 - pillW / 2;
  const pillY = H * 0.938 - pillH / 2;

  /* Pill shape */
  ctx.beginPath();
  ctx.moveTo(pillX + pillR, pillY);
  ctx.arcTo(pillX + pillW, pillY,         pillX + pillW, pillY + pillH, pillR);
  ctx.arcTo(pillX + pillW, pillY + pillH, pillX,         pillY + pillH, pillR);
  ctx.arcTo(pillX,         pillY + pillH, pillX,         pillY,         pillR);
  ctx.arcTo(pillX,         pillY,         pillX + pillW, pillY,         pillR);
  ctx.closePath();

  /* Background fill — dark pill on light themes, frosted on dark */
  ctx.fillStyle = isLight ? 'rgba(11,11,13,0.75)' : 'rgba(255,255,255,0.10)';
  ctx.fill();

  /* Subtle border for crisp edge definition */
  ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = Math.max(1, W * 0.001);
  ctx.stroke();

  /* Text — always white inside pill (contrast guaranteed on both themes) */
  ctx.fillStyle   = '#FFFFFF';
  ctx.textAlign   = 'center';
  ctx.shadowBlur  = 0;
  ctx.fillText(text, W / 2, pillY + pillH / 2);

  ctx.restore();
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
    };
  });

  ov.querySelectorAll('.gs-speed-btn').forEach(btn => {
    btn.onclick = () => {
      ov.querySelectorAll('.gs-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      GS.speed = btn.dataset.speed;
    };
  });

  document.getElementById('gsExportBtn').onclick    = gsExport;
  document.getElementById('closeGifStudio').onclick = closeGifStudio;
}

/* ================================================================
   OPEN / CLOSE
   ================================================================ */
function openGifStudio() {
  const ov = document.getElementById('gifStudioOverlay');
  if (!ov) return;
  GS.theme = 'midnight-gold'; GS.font = 'playfair';
  GS.animation = 'fade-up';   GS.speed = 'normal';
  GS.isExporting = false;

  ov.querySelectorAll('.gs-swatch').forEach((s,i)    => s.classList.toggle('active', i===0));
  ov.querySelectorAll('.gs-font-card').forEach((f,i) => f.classList.toggle('active', i===0));
  ov.querySelectorAll('.gs-anim-btn').forEach((b,i)  => b.classList.toggle('active', i===0));
  ov.querySelectorAll('.gs-speed-btn').forEach(b     => b.classList.toggle('active', b.dataset.speed==='normal'));

  const btn = document.getElementById('gsExportBtn');
  if (btn) { btn.textContent = 'Create GIF →'; btn.disabled = false; }

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
        canvas.style.width  = size + 'px';
        canvas.style.height = size + 'px';
        canvas.width  = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        gsDrawFrame(ctx, size, size, GS._frame / frames);
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
   FRAME RENDERER
   ================================================================ */
function gsDrawFrame(ctx, W, H, t) {
  const theme = GS_THEMES[GS.theme] || GS_THEMES['midnight-gold'];
  const font  = GS_FONTS[GS.font]   || GS_FONTS.playfair;
  const post  = currentPost || {};
  const k     = post.knowledge || {};
  const data  = {
    lyric:  (post.text || 'Your lyric here').substring(0, 120),
    song:   (k.song   || 'Unknown Song').substring(0, 36),
    artist: (k.artist || 'Unknown Artist').substring(0, 36),
    theme, font,
  };

  /* ── Background gradient ── */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   theme.bg[0]);
  g.addColorStop(0.5, theme.bg[1]);
  g.addColorStop(1,   theme.bg[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* ── Brand mark top-left
        logoR  = gold circle radius (~7% of canvas)
        logoX/Y = centre position, padded so outermost ripple (2.65r) doesn't clip
  ── */
  const logoR = W * 0.07;
  const logoPad = logoR * 2.65 + W * 0.012;  // outermost ring radius + small margin
  gsDrawBrandMark(ctx, logoPad, logoPad, logoR);

  /* ── Animation layer ── */
  const scale = W / 500;
  ctx.save();
  const anim = GS.animation;
  if      (anim==='fade-up')    gsFadeUp(ctx,W,H,t,data,scale);
  else if (anim==='typewriter') gsTypewriter(ctx,W,H,t,data,scale);
  else if (anim==='slide-in')   gsSlideIn(ctx,W,H,t,data,scale);
  else if (anim==='pulse')      gsPulse(ctx,W,H,t,data,scale);
  else if (anim==='glitch')     gsGlitch(ctx,W,H,t,data,scale);
  else if (anim==='wave')       gsWave(ctx,W,H,t,data,scale);
  else if (anim==='shimmer')    gsShimmer(ctx,W,H,t,data,scale);
  else if (anim==='bounce')     gsBounce(ctx,W,H,t,data,scale);
  ctx.restore();

  /* ── Song + artist meta ── */
  gsMeta(ctx, W, H, data, scale);

  /* ── Watermark pill — drawn last so it's always on top ── */
  gsDrawWatermark(ctx, W, H, theme);
}

/* ── Helpers ── */
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

function gsMeta(ctx, W, H, data, scale) {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = data.theme.accent;
  ctx.font = `700 ${Math.max(12, 16*scale)}px ${data.font.family}`;
  ctx.fillText(data.song, W/2, H*0.79);
  ctx.fillStyle = data.theme.text === '#000000' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)';
  ctx.font = `400 ${Math.max(9, 11*scale)}px 'Space Mono',monospace`;
  ctx.fillText(data.artist, W/2, H*0.79 + 18*scale);
  ctx.restore();
}

function gsLyricFont(ctx, data, scale, W) {
  const len  = data.lyric.length;
  const sz   = len < 40 ? 52*scale : len < 70 ? 40*scale : 30*scale;
  const bold = ['bebas','josefin','oswald'].includes(GS.font);
  ctx.font   = `${data.font.style==='italic' ? 'italic ' : ''}${bold ? '700' : '600'} ${sz}px ${data.font.family}`;
  return sz;
}

/* ── Animations (unchanged) ── */
function gsFadeUp(ctx,W,H,t,data,scale) {
  const e = t<0.5 ? 2*t*t : -1+(4-2*t)*t;
  const oy = (1-e)*38*scale, a = Math.min(1, e*2.2);
  ctx.globalAlpha = a; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14*scale;
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  const sz = gsLyricFont(ctx, data, scale, W);
  gsWrap(ctx, data.lyric, W/2, H*0.44+oy, W*0.82, sz*1.2);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function gsTypewriter(ctx,W,H,t,data,scale) {
  const chars = Math.floor(t * (data.lyric.length + 6));
  const vis   = data.lyric.substring(0, Math.min(chars, data.lyric.length));
  const cur   = chars <= data.lyric.length && (Math.floor(t*10) % 2 === 0) ? '|' : '';
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10*scale;
  const sz = gsLyricFont(ctx, data, scale, W);
  gsWrap(ctx, vis+cur, W/2, H*0.44, W*0.82, sz*1.2);
  ctx.shadowBlur = 0;
}

function gsSlideIn(ctx,W,H,t,data,scale) {
  const e = t<0.4 ? t/0.4 : 1; const eo = 1 - Math.pow(1-e, 3);
  const ox = (1-eo) * W * 0.55;
  ctx.save(); ctx.rect(0,0,W,H); ctx.clip();
  ctx.globalAlpha = Math.min(1, eo*1.6);
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 12*scale;
  const sz = gsLyricFont(ctx, data, scale, W);
  ctx.translate(ox, 0);
  gsWrap(ctx, data.lyric, W/2, H*0.44, W*0.82, sz*1.2);
  ctx.restore(); ctx.shadowBlur = 0;
}

function gsPulse(ctx,W,H,t,data,scale) {
  const p    = 0.93 + 0.07 * Math.sin(t * Math.PI * 2);
  const glow = 0.5  + 0.5  * Math.sin(t * Math.PI * 2);
  ctx.save(); ctx.translate(W/2, H*0.44); ctx.scale(p, p);
  const sz = gsLyricFont(ctx, data, scale, W);
  ctx.shadowColor = data.theme.accent; ctx.shadowBlur = (8 + glow*22) * scale;
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  gsWrap(ctx, data.lyric, 0, 0, W*0.82, sz*1.2);
  ctx.restore(); ctx.shadowBlur = 0;
}

function gsGlitch(ctx,W,H,t,data,scale) {
  const phase = Math.floor(t*9); const isG = phase%3===0 && t<0.85;
  const sz = gsLyricFont(ctx, data, scale, W);
  const ox = isG ? (Math.random()-0.5)*10*scale : 0;
  if (isG) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#ff0040'; ctx.textAlign = 'center';
    ctx.translate(3*scale, 0); gsWrap(ctx, data.lyric, W/2+ox, H*0.44, W*0.82, sz*1.2); ctx.restore();
  }
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.save(); ctx.translate(isG ? ox : 0, 0);
  gsWrap(ctx, data.lyric, W/2, H*0.44, W*0.82, sz*1.2); ctx.restore();
}

function gsWave(ctx,W,H,t,data,scale) {
  ctx.beginPath(); ctx.strokeStyle = data.theme.accent+'55'; ctx.lineWidth = 1.5*scale;
  for (let x=0; x<=W; x+=2) {
    const y = H*0.87 + Math.sin((x/W)*4*Math.PI + t*Math.PI*2)*7*scale;
    x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10*scale;
  const sz = gsLyricFont(ctx, data, scale, W);
  const words = data.lyric.split(' ');
  const totalW = words.reduce((a,w) => a + ctx.measureText(w+' ').width, 0);
  if (totalW > W*0.88) {
    gsWrap(ctx, data.lyric, W/2, H*0.43, W*0.82, sz*1.2);
  } else {
    let cx2 = W/2 - totalW/2;
    words.forEach((w,i) => {
      const wy = H*0.44 + Math.sin((i/words.length)*Math.PI*2 + t*Math.PI*2)*7*scale;
      ctx.textAlign = 'left'; ctx.fillText(w+' ', cx2, wy);
      cx2 += ctx.measureText(w+' ').width;
    });
  }
  ctx.shadowBlur = 0;
}

function gsShimmer(ctx,W,H,t,data,scale) {
  const sz = gsLyricFont(ctx, data, scale, W);
  ctx.fillStyle = data.theme.text+'99'; ctx.textAlign = 'center';
  gsWrap(ctx, data.lyric, W/2, H*0.44, W*0.82, sz*1.2);
  const sx = t*(W + 160*scale) - 80*scale;
  const sh = ctx.createLinearGradient(sx-70*scale, 0, sx+70*scale, 0);
  sh.addColorStop(0, 'transparent'); sh.addColorStop(0.4, data.theme.accent);
  sh.addColorStop(0.6, '#ffffff'); sh.addColorStop(1, 'transparent');
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = sh; gsWrap(ctx, data.lyric, W/2, H*0.44, W*0.82, sz*1.2); ctx.restore();
}

function gsBounce(ctx,W,H,t,data,scale) {
  const b  = t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
  const oy = (1-b) * H * 0.28; const sy = 0.86 + b*0.14;
  ctx.save(); ctx.translate(W/2, H*0.44+oy); ctx.scale(1, sy);
  const sz = gsLyricFont(ctx, data, scale, W);
  ctx.fillStyle = data.theme.text; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 12*scale;
  gsWrap(ctx, data.lyric, 0, 0, W*0.82, sz*1.2);
  ctx.restore(); ctx.shadowBlur = 0;
}

/* ================================================================
   GIF EXPORT  —  MAX QUALITY
   ================================================================ */
async function gsExport() {
  if (GS.isExporting) return;
  GS.isExporting = true;
  gsStopPreview();

  const btn = document.getElementById('gsExportBtn');
  btn.disabled = true;

  const SIZE   = GS_EXPORT_SIZE;   // 1080
  const anim   = GS_ANIMS[GS.animation];
  const frames = anim?.frames || 24;
  const delay  = GS_SPEED_MS[GS.speed] || 70;

  const off = document.createElement('canvas');
  off.width  = SIZE;
  off.height = SIZE;
  const oc   = off.getContext('2d');

  try {
    await document.fonts.ready;

    if (typeof GIF === 'undefined') {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const gif = new GIF({
      workers:      4,
      quality:      1,         // 1 = maximum quality
      width:        SIZE,
      height:       SIZE,
      workerScript: '/js/gif.worker.js',
      dither:       false,     // sharper text/edges
    });

    for (let i = 0; i < frames; i++) {
      oc.clearRect(0, 0, SIZE, SIZE);
      gsDrawFrame(oc, SIZE, SIZE, i / frames);
      gif.addFrame(off, { copy: true, delay });
      btn.textContent = `Building… ${Math.round((i / frames) * 75)}%`;
      await new Promise(r => setTimeout(r, 0));
    }

    gif.on('progress', p => {
      btn.textContent = `Encoding… ${Math.round(75 + p * 25)}%`;
    });

    gif.on('finished', blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `margo-${Date.now()}.gif`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      btn.textContent = '✓ Saved!';
      btn.disabled    = false;
      GS.isExporting  = false;
      setTimeout(gsStartPreview, 400);
    });

    gif.render();

  } catch(err) {
    console.error('GIF error:', err);
    btn.textContent = 'Try Again';
    btn.disabled    = false;
    GS.isExporting  = false;
    gsStartPreview();
  }
}
