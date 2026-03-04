/* ============================================================
   MARGO — js/duet-mode.js
   Duet canvas renderer — used by both studio.js and gif-studio.js
   when a share sheet is opened from an echo card.

   Exports (via window):
     drawDuetPosterToCtx(ctx, W, H)
     gsDrawDuetFrame(ctx, W, H, t)
     isDuetMode()          — true when share sheet is in duet mode
     getDuetData()         — { post1, post2 }

   Studios call isDuetMode() and branch to these functions.
   Single-post mode is unchanged.
   v1.0
   ============================================================ */

/* ── Duet state — mirrors SS (share sheet) state ── */
function isDuetMode() {
  return !!(window._shareSheet && window._shareSheet.isDuet && window._shareSheet.echoPost);
}

function getDuetData() {
  const ss = window._shareSheet;
  if (!ss) return { post1: null, post2: null };
  return { post1: ss.post, post2: ss.echoPost };
}

/* ────────────────────────────────────────────────────────────
   SHARED HELPERS
──────────────────────────────────────────────────────────── */

/** Word-wrap centred text, returns line count */
function duetWrapText(ctx, text, cx, startY, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
    else line = t;
  });
  if (line.trim()) lines.push(line.trim());
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
  return lines.length;
}

/** Get the design/theme for an emotion */
function duetThemeForEmotion(emotion) {
  const EMOTION_DESIGN_MAP = {
    Love:'rose-gold', Heartbreak:'sunset-coral', Hope:'emerald-night',
    Nostalgia:'midnight-gold', Healing:'cream-editorial', Joy:'vaporwave',
    Rage:'neon-dark', Loneliness:'royal-purple'
  };
  const POSTER_DESIGNS = window.POSTER_DESIGNS || {
    'midnight-gold':   { bg:['#0B0B0D','#1a1410','#0B0B0D'], primary:'#E8C547', text:'#F0F0F0', light:false },
    'rose-gold':       { bg:['#1a0d0f','#2d1a1f','#1a0d0f'], primary:'#f4a4c0', text:'#F0F0F0', light:false },
    'sunset-coral':    { bg:['#1a0a0a','#2d1416','#1a0a0a'], primary:'#ff8080', text:'#F0F0F0', light:false },
    'emerald-night':   { bg:['#051a0d','#0d2e1a','#051a0d'], primary:'#50fa7b', text:'#F0F0F0', light:false },
    'royal-purple':    { bg:['#1a0033','#2d1b4e','#1a0033'], primary:'#c77dff', text:'#F0F0F0', light:false },
    'vaporwave':       { bg:['#2d0a3d','#6b1fa8','#1a0d3d'], primary:'#ff71ce', text:'#ffffff', light:false },
    'neon-dark':       { bg:['#0a0a0a','#0f0f0f','#0a0a0a'], primary:'#ff00ff', text:'#00ffff', light:false },
    'cream-editorial': { bg:['#f5f1e8','#ebe3d5','#f5f1e8'], primary:'#2a2520', text:'#2a2520', light:true  },
  };
  const key = EMOTION_DESIGN_MAP[emotion] || 'midnight-gold';
  return POSTER_DESIGNS[key] || POSTER_DESIGNS['midnight-gold'];
}

/** Get username color or fallback */
function duetUsernameColor(username) {
  if (typeof MargoUsername !== 'undefined' && username) {
    return MargoUsername.getColor(username).color;
  }
  return '#E8C547';
}

/* ────────────────────────────────────────────────────────────
   DUET POSTER RENDERER
   Layout: stacked — post1 top half, post2 bottom half,
   separated by a divider line with a ♪ glyph.
   Each half has: lyric, song, artist, username
──────────────────────────────────────────────────────────── */
function drawDuetPosterToCtx(ctx, W, H) {
  const { post1, post2 } = getDuetData();
  if (!post1 || !post2) {
    // Fallback to single poster if data missing
    if (typeof drawPosterToCtx === 'function') {
      window.currentPost = post1 || window.currentPost;
      drawPosterToCtx(ctx, W, H);
    }
    return;
  }

  const theme1 = duetThemeForEmotion(post1.emotion || 'Nostalgia');
  const theme2 = duetThemeForEmotion(post2.emotion || 'Nostalgia');
  const scale  = W / 1080;

  ctx.filter = 'none';

  /* ── Background — split gradient ── */
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0,    theme1.bg[0]);
  bgGrad.addColorStop(0.35, theme1.bg[1]);
  bgGrad.addColorStop(0.5,  '#0f0e12');   // seam between the two halves
  bgGrad.addColorStop(0.65, theme2.bg[1]);
  bgGrad.addColorStop(1,    theme2.bg[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  /* Subtle grain overlay */
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < W * H / 400; i++) {
    const gx = Math.random() * W;
    const gy = Math.random() * H;
    ctx.fillStyle = '#fff';
    ctx.fillRect(gx, gy, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;

  /* ── MARGO wordmark top-left ── */
  ctx.textAlign  = 'left';
  ctx.fillStyle  = `rgba(232,197,71,0.45)`;
  ctx.font       = `700 ${Math.round(20 * scale)}px 'Space Mono', monospace`;
  ctx.fillText('MARGO', 48 * scale, 52 * scale);

  /* ── Duet label top-right ── */
  ctx.textAlign  = 'right';
  ctx.fillStyle  = `rgba(255,255,255,0.22)`;
  ctx.font       = `700 ${Math.round(14 * scale)}px 'Space Mono', monospace`;
  ctx.fillText('DUET', W - 48 * scale, 52 * scale);

  ctx.textAlign = 'center';

  /* ── Half 1 — post1 ── */
  _drawDuetHalf(ctx, W, H, scale, post1, {
    yCenter: H * 0.275,
    color:   theme1.primary,
    isLight: theme1.light,
  });

  /* ── Divider ── */
  const divY = H * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1 * scale;
  ctx.setLineDash([6 * scale, 8 * scale]);
  ctx.beginPath();
  ctx.moveTo(40 * scale, divY);
  ctx.lineTo(W - 40 * scale, divY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ♪ glyph at divider centre
  ctx.fillStyle  = 'rgba(255,255,255,0.35)';
  ctx.font       = `400 ${Math.round(22 * scale)}px serif`;
  ctx.textAlign  = 'center';
  ctx.fillText('♪', W / 2, divY + 8 * scale);

  /* ── Half 2 — post2 (echo) ── */
  _drawDuetHalf(ctx, W, H, scale, post2, {
    yCenter: H * 0.735,
    color:   theme2.primary,
    isLight: theme2.light,
  });

  /* ── Domain watermark ── */
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font      = `700 ${Math.round(14 * scale)}px 'Space Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('trymargo.com', W / 2, H * 0.965);
}

function _drawDuetHalf(ctx, W, H, scale, post, opts) {
  const { yCenter, color } = opts;
  const k        = post.knowledge || post; // echo stores lyric/song/artist at top level
  const lyricText= (post.text || post.lyric || '').substring(0, 80);
  const song     = (k.song   || post.song   || 'Unknown Song').substring(0, 30);
  const artist   = (k.artist || post.artist || '').substring(0, 32);
  const username = post.username || null;
  const halfH    = H * 0.46; // usable height of each half

  ctx.textAlign = 'center';

  /* Lyric */
  const lyricLen  = lyricText.length;
  const lyricSize = lyricLen < 35 ? 60 * scale
    : lyricLen < 55 ? 48 * scale
    : lyricLen < 80 ? 38 * scale
    : 30 * scale;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10 * scale;
  ctx.font = `italic 600 ${lyricSize}px 'DM Serif Display', 'Playfair Display', serif`;
  duetWrapText(ctx, `"${lyricText}"`, W / 2, yCenter - lyricSize * 1.5, W * 0.8, lyricSize * 1.22);

  /* Song */
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  const songY    = yCenter + halfH * 0.18;
  const songSize = Math.max(Math.round(lyricSize * 0.38), 18 * scale);
  ctx.fillStyle  = color;
  ctx.font       = `700 ${songSize}px 'Space Mono', monospace`;
  ctx.fillText(song, W / 2, songY);

  /* Artist */
  const artistY = songY + songSize + 8 * scale;
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font      = `400 ${Math.max(Math.round(songSize * 0.7), 14 * scale)}px 'Space Mono', monospace`;
  ctx.fillText(artist, W / 2, artistY);

  /* Username pill */
  if (username) {
    const uColor  = duetUsernameColor(username);
    const uY      = artistY + 24 * scale;
    const uSize   = Math.max(12 * scale, 12);
    ctx.fillStyle = uColor;
    ctx.font      = `700 ${uSize}px 'Space Mono', monospace`;
    ctx.fillText(username, W / 2, uY);
  }
}

/* ────────────────────────────────────────────────────────────
   DUET GIF RENDERER
   Animates both lyrics in sequence:
   - First half of animation: show post1 lyric with fade/slide
   - Second half: transition to post2 lyric
   - Divider line sweeps in at the midpoint
──────────────────────────────────────────────────────────── */
function gsDrawDuetFrame(ctx, W, H, t) {
  const { post1, post2 } = getDuetData();
  if (!post1 || !post2) {
    if (typeof gsDrawFrame === 'function') gsDrawFrame(ctx, W, H, t);
    return;
  }

  const theme1 = duetThemeForEmotion(post1.emotion || 'Nostalgia');
  const theme2 = duetThemeForEmotion(post2.emotion || 'Nostalgia');
  const scale  = W / 500;

  /* ── Background transitions between both themes ── */
  const blendT = Math.min(1, Math.max(0, (t - 0.4) / 0.4)); // blend starts at t=0.4
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   blendColors(theme1.bg[0], theme2.bg[0], blendT));
  bg.addColorStop(0.5, blendColors(theme1.bg[1], theme2.bg[1], blendT));
  bg.addColorStop(1,   blendColors(theme1.bg[2], theme2.bg[2], blendT));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ── MARGO wordmark ── */
  if (typeof gsDrawWordmark === 'function') {
    gsDrawWordmark(ctx, W, { text: '#000000', bg: ['#0B0B0D', '#0B0B0D', '#0B0B0D'] });
  }

  /* Phase 1 (t 0→0.45): post1 lyric fades in and holds */
  if (t <= 0.55) {
    const e1 = Math.min(1, t / 0.35);
    const y1 = (1 - e1) * 20 * scale;
    ctx.globalAlpha = e1;
    ctx.save();
    ctx.translate(0, y1);
    _drawDuetGifLyric(ctx, W, H, scale, post1, H * 0.44, theme1.primary);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* Divider sweeps in at t=0.45 */
  if (t > 0.42) {
    const divAlpha = Math.min(1, (t - 0.42) / 0.08);
    ctx.save();
    ctx.globalAlpha = divAlpha * 0.4;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H * 0.5);
    ctx.lineTo(W * 0.9, H * 0.5);
    ctx.stroke();
    ctx.globalAlpha = divAlpha;
    ctx.fillStyle   = 'rgba(255,255,255,0.5)';
    ctx.font        = `400 ${Math.round(16 * scale)}px serif`;
    ctx.textAlign   = 'center';
    ctx.fillText('♪', W / 2, H * 0.5 + 6 * scale);
    ctx.restore();
  }

  /* Phase 2 (t 0.5→1): post2 lyric fades in below */
  if (t > 0.5) {
    const e2 = Math.min(1, (t - 0.5) / 0.35);
    const y2 = (1 - e2) * 20 * scale;
    ctx.globalAlpha = e2;
    ctx.save();
    ctx.translate(0, y2);
    _drawDuetGifLyric(ctx, W, H, scale, post2, H * 0.72, theme2.primary);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ── Watermark ── */
  if (typeof gsDrawWatermark === 'function') {
    gsDrawWatermark(ctx, W, H, { text: '#000000' });
  }
}

function _drawDuetGifLyric(ctx, W, H, scale, post, yCenter, color) {
  const k        = post;
  const lyric    = (post.text || post.lyric || '').substring(0, 70);
  const song     = (k.song || k.knowledge?.song || '').substring(0, 28);
  const artist   = (k.artist || k.knowledge?.artist || '').substring(0, 30);
  const username = post.username || null;

  ctx.textAlign = 'center';

  const len  = lyric.length;
  const sz   = len < 35 ? 36 * scale : len < 55 ? 28 * scale : 22 * scale;
  ctx.fillStyle   = '#F0F0F0';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8 * scale;
  ctx.font = `italic 600 ${sz}px 'DM Serif Display', serif`;
  duetWrapText(ctx, `"${lyric}"`, W / 2, yCenter - sz * 0.8, W * 0.84, sz * 1.2);

  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

  const metaY = yCenter + sz * 1.5;
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.max(11 * scale, 11)}px 'Space Mono', monospace`;
  ctx.fillText(song, W / 2, metaY);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `400 ${Math.max(9 * scale, 9)}px 'Space Mono', monospace`;
  ctx.fillText(artist, W / 2, metaY + 14 * scale);

  if (username) {
    ctx.fillStyle = duetUsernameColor(username);
    ctx.font      = `700 ${Math.max(8 * scale, 8)}px 'Space Mono', monospace`;
    ctx.fillText(username, W / 2, metaY + 25 * scale);
  }
}

/* ── Simple color blend helper ── */
function blendColors(c1, c2, t) {
  // Accepts hex or rgb/rgba strings — fallback to c1 if parse fails
  try {
    const p = (s) => {
      const m = s.match(/[\d.]+/g);
      return m ? m.map(Number) : [11,11,13,1];
    };
    const a = p(c1), b = p(c2);
    const r = (ch1, ch2) => Math.round(ch1 + (ch2 - ch1) * t);
    if (c1.startsWith('#')) {
      const n1 = parseInt(c1.slice(1), 16);
      const n2 = parseInt(c2.slice(1), 16);
      const r1=(n1>>16)&0xff, g1=(n1>>8)&0xff, b1=n1&0xff;
      const r2=(n2>>16)&0xff, g2=(n2>>8)&0xff, b2=n2&0xff;
      return `rgb(${r(r1,r2)},${r(g1,g2)},${r(b1,b2)})`;
    }
    return c1; // fallback
  } catch (_) { return c1; }
}

/* ────────────────────────────────────────────────────────────
   GIF EXPORT FOR SHARE SHEET
   Called by share-sheet.js as gsExportForShareSheet(progressCb)
   Returns a Promise<Blob>
──────────────────────────────────────────────────────────── */
window.gsExportForShareSheet = async function(onProgress) {
  const SIZE   = 600; // smaller for quick share (not the full 1080 studio quality)
  const frames = 24;
  const delay  = 70;

  const off = document.createElement('canvas');
  off.width = SIZE; off.height = SIZE;
  const oc  = off.getContext('2d');

  await document.fonts.ready;

  // Load GIF.js if needed
  if (typeof GIF === 'undefined') {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2, quality: 5,
      width: SIZE, height: SIZE,
      workerScript: '/js/gif.worker.js',
      dither: false,
    });

    const drawFn = isDuetMode() ? gsDrawDuetFrame : (typeof gsDrawFrame === 'function' ? gsDrawFrame : null);
    if (!drawFn) { reject(new Error('No draw function')); return; }

    (async () => {
      for (let i = 0; i < frames; i++) {
        oc.clearRect(0, 0, SIZE, SIZE);
        const prev = window.currentPost;
        window.currentPost = getDuetData().post1 || window.currentPost;
        drawFn(oc, SIZE, SIZE, i / frames);
        window.currentPost = prev;
        gif.addFrame(off, { copy: true, delay });
        if (onProgress) onProgress((i / frames) * 0.75);
        await new Promise(r => setTimeout(r, 0));
      }

      gif.on('progress', p => { if (onProgress) onProgress(0.75 + p * 0.25); });
      gif.on('finished', blob => resolve(blob));
      gif.on('error',    err  => reject(err));
      gif.render();
    })();
  });
};

/* ────────────────────────────────────────────────────────────
   PATCH studio.js refreshStageCanvas / generateFinalPoster
   to branch into duet mode when applicable.
   These run AFTER studio.js loads, patching its functions.
──────────────────────────────────────────────────────────── */
(function patchStudiosForDuet() {
  // Wait for studio.js to be parsed
  const tryPatch = () => {
    if (typeof refreshStageCanvas !== 'function') {
      setTimeout(tryPatch, 100); return;
    }

    // Wrap refreshStageCanvas
    const _origRefresh = refreshStageCanvas;
    window.refreshStageCanvas = function() {
      if (!isDuetMode()) { _origRefresh(); return; }
      // Duet: draw onto studio canvas using duet renderer
      const canvas = window.studioCanvas;
      if (!canvas || !getDuetData().post1) { _origRefresh(); return; }
      const stage  = canvas.parentElement;
      const dpr    = window.devicePixelRatio || 1;
      const availW = stage.clientWidth  - 40;
      const availH = stage.clientHeight - 40;
      const size   = Math.max(80, Math.min(availW, availH, 700));
      canvas.style.width  = size + 'px';
      canvas.style.height = size + 'px';
      const res = Math.round(size * dpr);
      canvas.width  = res;
      canvas.height = res;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      document.fonts.ready.then(() => drawDuetPosterToCtx(ctx, size, size));
    };

    // Wrap generateFinalPoster
    const _origGenerate = typeof generateFinalPoster === 'function' ? generateFinalPoster : null;
    window.generateFinalPoster = async function(sizeKey) {
      if (!isDuetMode()) {
        return _origGenerate ? _origGenerate(sizeKey) : Promise.reject(new Error('No generator'));
      }
      const POSTER_SIZES = window.POSTER_SIZES || { 'instagram-square':{ w:1080, h:1080 } };
      const dim = POSTER_SIZES[sizeKey] || { w: 1080, h: 1080 };
      const offscreen = document.createElement('canvas');
      offscreen.width  = dim.w;
      offscreen.height = dim.h;
      const ctx = offscreen.getContext('2d');
      await document.fonts.ready;
      drawDuetPosterToCtx(ctx, dim.w, dim.h);
      return new Promise((resolve, reject) => {
        offscreen.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
      });
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  } else {
    setTimeout(tryPatch, 50);
  }
})();

/* ────────────────────────────────────────────────────────────
   GLOBAL EXPOSE
──────────────────────────────────────────────────────────── */
window.isDuetMode          = isDuetMode;
window.getDuetData         = getDuetData;
window.drawDuetPosterToCtx = drawDuetPosterToCtx;
window.gsDrawDuetFrame     = gsDrawDuetFrame;
