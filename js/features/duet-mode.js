/* ============================================================
   MARGO — js/features/duet-mode.js
   v1.2 — FIXED
   • Aliases now route to the RICH v2.1 renderers:
       dsGifDrawFrame  → js/media/gif/duet-renderer.js
       dsPosterDraw    → js/media/poster/duet-renderer.js
   • gsExportForShareSheet uses dsGifExport (rich encoder)
   • gif.worker.js path set correctly for concept-v2-clean
   • All original code unchanged above the alias block
   ============================================================ */

/* ── Duet state helpers ── */
function isDuetMode() {
  const ss = window._shareSheet;
  return !!(ss && ss.isDuet && ss.echoPost);
}

function getDuetData() {
  const ss = window._shareSheet;
  if (!ss) return { post1: null, post2: null };
  return { post1: ss.post, post2: ss.echoPost };
}

/* ── Vibe colours ── */
const DM_VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

function _dmVibeColor(emotion) {
  return DM_VIBE[emotion] || '#E8C547';
}

/* ── Word-wrap helper ── */
function _dmWrap(ctx, text, cx, startY, maxW, lineH) {
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

/* ────────────────────────────────────────────────────────────
   DUET POSTER RENDERER (legacy — kept for fallback only)
   The real renderer is js/media/poster/duet-renderer.js
──────────────────────────────────────────────────────────── */
function drawDuetPosterToCtx(ctx, W, H) {
  const { post1, post2 } = getDuetData();
  if (!post1 || !post2) {
    if (typeof window.drawPosterPreview === 'function') {
      window.drawPosterPreview(ctx, W, H, post1 || window.currentPost);
    }
    return;
  }

  /* Delegate to the rich renderer if available */
  if (typeof window.dsPosterDraw === 'function') {
    window.dsPosterDraw(ctx, W, H, post1, post2, {});
    return;
  }

  /* ── Minimal fallback ── */
  const pVibe = _dmVibeColor(post1.emotion || 'Nostalgia');
  const eVibe = _dmVibeColor(post2.emotion || 'Nostalgia');
  const pad   = W * 0.07;
  const divY  = H * 0.495;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#090810'); bg.addColorStop(1, '#060809');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const mSz = Math.max(14, W * 0.044);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.85;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.65);
  ctx.restore();

  const topH = divY - pad * 2 - W * 0.05;
  const pText = post1.text || post1.lyric || '';
  let pFS = Math.min(W * 0.054, topH * 0.3);
  ctx.font = `italic 600 ${pFS}px 'DM Serif Display',serif`;
  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  _dmWrap(ctx, pText, W / 2, pad * 2, W - pad * 2.2, pFS * 1.52);
  ctx.restore();

  const eText = post2.text || post2.lyric || '';
  let eFS = Math.min(W * 0.062, topH * 0.3);
  ctx.font = `italic 700 ${eFS}px 'DM Serif Display',serif`;
  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  _dmWrap(ctx, eText, W / 2, divY + W * 0.06, W - pad * 2.2, eFS * 1.52);
  ctx.restore();

  const wFS = Math.max(9, W * 0.02);
  ctx.save();
  ctx.font = `700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1;
  ctx.fillText('trymargo.com', W / 2, H - pad * 0.85);
  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   DUET GIF FRAME RENDERER (legacy — kept for fallback only)
   The real renderer is js/media/gif/duet-renderer.js
──────────────────────────────────────────────────────────── */
function gsDrawDuetFrame(ctx, W, H, t) {
  const { post1, post2 } = getDuetData();
  if (!post1 || !post2) {
    if (typeof gsDrawFrame === 'function') gsDrawFrame(ctx, W, H, t);
    return;
  }

  /* Delegate to the rich renderer if available (loaded after us) */
  if (typeof window._dsGifDrawFrameRich === 'function') {
    window._dsGifDrawFrameRich(ctx, W, H, t, 'fade-up', post1, post2, {});
    return;
  }

  const pVibe = _dmVibeColor(post1.emotion || 'Nostalgia');
  const eVibe = _dmVibeColor(post2.emotion || 'Nostalgia');
  const scale = W / 500;

  const blend = Math.min(1, Math.max(0, (t - 0.38) / 0.38));
  const bg    = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#090810'); bg.addColorStop(0.5, '#0d0b12'); bg.addColorStop(1, '#090810');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  const pg2 = ctx.createRadialGradient(W*0.2, H*0.25, 0, W*0.2, H*0.25, W*0.55);
  pg2.addColorStop(0, pVibe); pg2.addColorStop(1, 'transparent');
  ctx.fillStyle = pg2; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22 * blend;
  const eg2 = ctx.createRadialGradient(W*0.8, H*0.75, 0, W*0.8, H*0.75, W*0.55);
  eg2.addColorStop(0, eVibe); eg2.addColorStop(1, 'transparent');
  ctx.fillStyle = eg2; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${Math.round(22 * scale)}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.75;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('MARGO', W * 0.09, W * 0.09);
  ctx.restore();

  const e1 = t <= 0.55 ? Math.min(1, t / 0.3) : 1;
  const y1off = (1 - e1) * 18 * scale;
  ctx.save();
  ctx.globalAlpha = e1;
  ctx.translate(0, y1off);
  _drawGifLyric(ctx, W, H, scale, post1, H * 0.36, pVibe, false);
  ctx.restore();

  if (t > 0.40) {
    const da = Math.min(1, (t - 0.40) / 0.10);
    ctx.save(); ctx.globalAlpha = da * 0.35;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 * scale;
    ctx.setLineDash([5 * scale, 7 * scale]);
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H * 0.5); ctx.lineTo(W * 0.9, H * 0.5);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,197,71,' + (da * 0.6) + ')';
    ctx.font = `700 ${Math.round(13 * scale)}px 'Space Mono',monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = da;
    ctx.fillText('↩ LYRIC BACK', W / 2, H * 0.5);
    ctx.restore();
  }

  if (t > 0.48) {
    const e2 = Math.min(1, (t - 0.48) / 0.30);
    const y2off = (1 - e2) * 18 * scale;
    ctx.save();
    ctx.globalAlpha = e2;
    ctx.translate(0, y2off);
    _drawGifLyric(ctx, W, H, scale, post2, H * 0.70, eVibe, true);
    ctx.restore();
  }

  const wfs = Math.round(12 * scale);
  ctx.save();
  ctx.font = `700 ${wfs}px 'Space Mono',monospace`;
  const wTxt = 'trymargo.com';
  const wW = ctx.measureText(wTxt).width + W * 0.04;
  const wH = wfs * 1.7;
  const wX = W / 2 - wW / 2;
  const wY = H * 0.95 - wH / 2;
  ctx.globalAlpha = 0.80; ctx.fillStyle = 'rgba(0,0,0,0.80)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(wX, wY, wW, wH, wH/2); else ctx.rect(wX, wY, wW, wH);
  ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(wTxt, W / 2, wY + wH / 2);
  ctx.restore();
}

function _drawGifLyric(ctx, W, H, scale, post, yCenter, color, isEcho) {
  const k      = post.knowledge || {};
  const lyric  = (post.text || post.lyric || '').substring(0, 70);
  const song   = (k.song   || post.song   || '').substring(0, 28);
  const artist = (k.artist || post.artist || '').substring(0, 30);

  ctx.textAlign = 'center';
  const len = lyric.length;
  const sz  = (len < 35 ? 34 : len < 55 ? 27 : 21) * scale;

  ctx.fillStyle = isEcho ? '#ffffff' : 'rgba(255,255,255,0.88)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8 * scale;
  ctx.font = `italic 600 ${sz}px 'DM Serif Display',serif`;
  _dmWrap(ctx, `"${lyric}"`, W / 2, yCenter - sz * 0.9, W * 0.82, sz * 1.22);

  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  const metaY = yCenter + sz * 1.55;
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.max(10, 11 * scale)}px 'Space Mono',monospace`;
  ctx.fillText(song, W / 2, metaY);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = `400 ${Math.max(8, 9 * scale)}px 'Space Mono',monospace`;
  ctx.fillText(artist, W / 2, metaY + 13 * scale);
}

function _blendHex(h1, h2, t) {
  const p = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
  const a = p(h1), b = p(h2);
  const r = (c1,c2) => Math.round(c1 + (c2-c1)*t);
  return `rgb(${r(a[0],b[0])},${r(a[1],b[1])},${r(a[2],b[2])})`;
}

/* Helper: count wrap lines */
function _splitWrap(ctx, text, maxW) {
  const words = text.split(' ');
  let line = '', count = 0;
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { count++; line = w + ' '; }
    else line = t;
  });
  if (line.trim()) count++;
  return count || 1;
}

/* ────────────────────────────────────────────────────────────
   GIF EXPORT FOR SHARE SHEET
   Uses the rich dsGifExport from duet-renderer.js if available,
   falls back to the local simple renderer.
──────────────────────────────────────────────────────────── */
window.gsExportForShareSheet = async function(onProgress) {
  const { post1, post2 } = getDuetData();

  /* ── PREFER the rich encoder from js/media/gif/duet-renderer.js ── */
  if (post1 && post2 && typeof window._dsGifExportRich === 'function') {
    const opts = {};
    return window._dsGifExportRich(post1, post2, 'fade-up', 2.4, opts);
  }

  /* ── Fallback: simple loop ── */
  const SIZE   = 600;
  const frames = 24;
  const delay  = 70;

  const off = document.createElement('canvas');
  off.width = SIZE; off.height = SIZE;
  const oc  = off.getContext('2d');

  await document.fonts.ready;

  if (typeof GIF === 'undefined') {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  return new Promise((resolve, reject) => {
    /* Determine correct worker path */
    const workerPath = _resolveWorkerPath();

    const gif = new GIF({
      workers: 2, quality: 5,
      width: SIZE, height: SIZE,
      workerScript: workerPath,
      dither: false,
    });

    const drawFn = isDuetMode() ? gsDrawDuetFrame
      : (typeof gsDrawFrame === 'function' ? gsDrawFrame : null);

    if (!drawFn) { reject(new Error('No draw function available')); return; }

    (async () => {
      for (let i = 0; i < frames; i++) {
        oc.clearRect(0, 0, SIZE, SIZE);
        drawFn(oc, SIZE, SIZE, i / frames);
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
   WORKER PATH RESOLVER
   Tries multiple paths — works on both main and concept-v2-clean
──────────────────────────────────────────────────────────── */
function _resolveWorkerPath() {
  /* Prefer the path that actually exists by checking script tags */
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  for (const sc of scripts) {
    if (sc.src.includes('gif.worker')) return sc.src;
    if (sc.src.includes('gif/exporter')) {
      /* gif exporter is at js/media/gif/ → worker is sibling */
      return sc.src.replace('exporter.js', 'gif.worker.js');
    }
  }
  /* Ordered fallback list */
  return '/js/media/gif/gif.worker.js';
}

/* ────────────────────────────────────────────────────────────
   GLOBAL EXPOSE — original names
──────────────────────────────────────────────────────────── */
window.isDuetMode          = isDuetMode;
window.getDuetData         = getDuetData;
window.drawDuetPosterToCtx = drawDuetPosterToCtx;
window.gsDrawDuetFrame     = gsDrawDuetFrame;

/* ────────────────────────────────────────────────────────────
   ALIASES — bridge to duet-sheet.js expected names
   ─────────────────────────────────────────────────────────
   IMPORTANT: These are set as WEAK defaults only.
   js/media/gif/duet-renderer.js   sets window.dsGifDrawFrame  (rich)
   js/media/poster/duet-renderer.js sets window.dsPosterDraw   (rich)

   Those files load AFTER us (per index.html script order) and
   their window.X = ... assignments WIN, overwriting these stubs.

   These stubs only fire if the rich renderers somehow failed to load.
──────────────────────────────────────────────────────────── */

/* Stub: overwritten by js/media/gif/duet-renderer.js */
if (!window.dsGifDrawFrame) {
  window.dsGifDrawFrame = function(ctx, W, H, t, motion, p1, p2, opts) {
    const prev = window._shareSheet;
    window._shareSheet = { post: p1, echoPost: p2, isDuet: true };
    gsDrawDuetFrame(ctx, W, H, t);
    window._shareSheet = prev;
  };
}

/* Stub: overwritten by js/media/gif/duet-renderer.js */
if (!window.dsGifExport) {
  window.dsGifExport = function(p1, p2, motion, dur, opts) {
    const prev = window._shareSheet;
    window._shareSheet = { post: p1, echoPost: p2, isDuet: true };
    return window.gsExportForShareSheet(null).finally(() => {
      window._shareSheet = prev;
    });
  };
}

/* Stub: overwritten by js/media/poster/duet-renderer.js */
if (!window.dsPosterDraw) {
  window.dsPosterDraw = function(ctx, W, H, p1, p2, opts) {
    const prev = window._shareSheet;
    window._shareSheet = { post: p1, echoPost: p2, isDuet: true };
    drawDuetPosterToCtx(ctx, W, H);
    window._shareSheet = prev;
  };
}

/* Stub: overwritten by js/media/poster/duet-renderer.js */
if (!window.dsPosterExport) {
  window.dsPosterExport = function(p1, p2, opts) {
    return new Promise((resolve, reject) => {
      try {
        const size = 1080;
        const off  = document.createElement('canvas');
        off.width  = size; off.height = size;
        const ctx  = off.getContext('2d');
        document.fonts.ready.then(() => {
          window.dsPosterDraw(ctx, size, size, p1, p2, opts || {});
          off.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
          }, 'image/png', 0.95);
        });
      } catch(err) { reject(err); }
    });
  };
}
