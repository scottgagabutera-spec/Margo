/* ============================================================
   MARGO — js/media/duet-mode.js   (concept-v2-clean)
   v1.0 — Self-contained duet canvas renderer.
   No dependency on main-branch duet-mode.js.

   Reads duet data directly from window._shareSheet:
     window._shareSheet.post      → original post
     window._shareSheet.echoPost  → echo post
     window._shareSheet.isDuet    → boolean flag

   Exports (via window):
     isDuetMode()           → true when share sheet is in duet mode
     getDuetData()          → { post1, post2 }
     drawDuetPosterToCtx(ctx, W, H)
     gsDrawDuetFrame(ctx, W, H, t)
     gsExportForShareSheet(onProgress) → Promise<Blob>
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

/* ────────────────────────────────────────────────────────────
   SHARED WORD-WRAP HELPER
──────────────────────────────────────────────────────────── */
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
   DUET POSTER RENDERER
   Layout: conversation-style — top half original, bottom echo,
   gold "LYRIC BACK ↩ @user" divider at 50%.
──────────────────────────────────────────────────────────── */
function drawDuetPosterToCtx(ctx, W, H) {
  const { post1, post2 } = getDuetData();
  if (!post1 || !post2) {
    /* Fallback: render single post if data missing */
    if (typeof window.drawPosterPreview === 'function') {
      window.drawPosterPreview(ctx, W, H, post1 || window.currentPost);
    }
    return;
  }

  const pVibe = _dmVibeColor(post1.emotion || 'Nostalgia');
  const eVibe = _dmVibeColor(post2.emotion || 'Nostalgia');
  const pad   = W * 0.07;
  const divY  = H * 0.495;

  /* ── Background ── */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#090810');
  bg.addColorStop(0.48, '#0d0b12');
  bg.addColorStop(0.52, '#08080f');
  bg.addColorStop(1,    '#060809');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Vibe glows */
  ctx.save();
  const pg = ctx.createRadialGradient(W * 0.15, H * 0.18, 0, W * 0.15, H * 0.18, W * 0.65);
  pg.addColorStop(0, pVibe + '28'); pg.addColorStop(1, 'transparent');
  ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  const eg = ctx.createRadialGradient(W * 0.85, H * 0.82, 0, W * 0.85, H * 0.82, W * 0.65);
  eg.addColorStop(0, eVibe + '28'); eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* Grain */
  ctx.save();
  ctx.globalAlpha = 0.018;
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  ctx.restore();

  /* Edge accent lines */
  ctx.save();
  ctx.globalAlpha = 0.65;
  const tl = ctx.createLinearGradient(0, 0, W, 0);
  tl.addColorStop(0, 'transparent'); tl.addColorStop(0.5, pVibe); tl.addColorStop(1, 'transparent');
  ctx.fillStyle = tl; ctx.fillRect(0, 0, W, 2);
  const bl = ctx.createLinearGradient(0, 0, W, 0);
  bl.addColorStop(0, 'transparent'); bl.addColorStop(0.5, eVibe); bl.addColorStop(1, 'transparent');
  ctx.fillStyle = bl; ctx.fillRect(0, H - 2, W, 2);
  ctx.restore();

  /* ── MARGO wordmark ── */
  const mSz = Math.max(14, W * 0.044);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.85;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.65);
  ctx.restore();

  /* ── Top lyric (original post) ── */
  const topZoneTop = pad * 2;
  const topZoneBot = divY - W * 0.05;
  const topH = topZoneBot - topZoneTop;
  const pText = post1.text || post1.lyric || '';
  let pFS = Math.min(W * 0.054, topH * 0.3);
  ctx.font = `italic 600 ${pFS}px 'DM Serif Display',serif`;
  let pLines = _splitWrap(ctx, pText, W - pad * 2.2);
  if (pLines > 3) {
    pFS = Math.max(W * 0.028, pFS * (3 / pLines));
    ctx.font = `italic 600 ${pFS}px 'DM Serif Display',serif`;
    pLines = _splitWrap(ctx, pText, W - pad * 2.2);
  }
  const pLH     = pFS * 1.52;
  const pBlockH = pLines * pLH;
  const pStartY = topZoneTop + (topH - pBlockH) / 2 - pFS * 0.3;
  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6;
  _dmWrap(ctx, pText, W / 2, pStartY, W - pad * 2.2, pLH);
  ctx.restore();

  /* Original song attribution */
  const pk = post1.knowledge || {};
  const pSongStr = pk.song || post1.song || '';
  if (pSongStr) {
    const paFS = Math.max(9, W * 0.019);
    ctx.save();
    ctx.font = `700 ${paFS}px 'Space Mono',monospace`;
    ctx.fillStyle = pVibe; ctx.globalAlpha = 0.42;
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    let paStr = pSongStr + (pk.artist || post1.artist ? ' — ' + (pk.artist || post1.artist) : '');
    while (ctx.measureText(paStr).width > (W - pad * 2.2) * 0.9 && paStr.length > 4)
      paStr = paStr.slice(0, -4) + '…';
    ctx.fillText(paStr, W / 2, divY - W * 0.045);
    ctx.restore();
  }

  /* ── Divider pill ── */
  const dText = `LYRIC BACK ↩  @${(post2.username || 'anonymous').toUpperCase()}`;
  const dFS   = Math.max(10, W * 0.021);
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  const dTW = ctx.measureText(dText).width;
  const pH  = dFS * 1.95, pPH = W * 0.028;
  const pW  = dTW + pPH * 2;
  const pX  = W / 2 - pW / 2;
  const pY  = divY - pH / 2;
  const pR  = pH / 2;
  const gap = pW / 2 + W * 0.018;

  ctx.save();
  [[pad, W / 2 - gap], [W / 2 + gap, W - pad]].forEach(([x1, x2]) => {
    const lg = ctx.createLinearGradient(x1, 0, x2, 0);
    if (x1 === pad) { lg.addColorStop(0,'transparent'); lg.addColorStop(1,'rgba(232,197,71,0.22)'); }
    else            { lg.addColorStop(0,'rgba(232,197,71,0.22)'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1, divY - 0.75, x2 - x1, 1.5);
  });
  ctx.restore();

  ctx.save();
  ctx.shadowColor = '#E8C547'; ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(232,197,71,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX, pY, pW, pH, pR); else ctx.rect(pX, pY, pW, pH);
  ctx.stroke(); ctx.shadowBlur = 0;
  const pFill = ctx.createLinearGradient(pX, pY, pX, pY + pH);
  pFill.addColorStop(0,'rgba(232,197,71,0.14)'); pFill.addColorStop(1,'rgba(232,197,71,0.06)');
  ctx.fillStyle = pFill;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX, pY, pW, pH, pR); else ctx.rect(pX, pY, pW, pH);
  ctx.fill();
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.95;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(dText, W / 2, divY);
  ctx.restore();

  /* ── Bottom lyric (echo) ── */
  const botZoneTop = divY + pH / 2 + W * 0.025;
  const botZoneBot = H * 0.88;
  const botH  = botZoneBot - botZoneTop;
  const eText = post2.text || post2.lyric || '';
  let eFS = Math.min(W * 0.062, botH * 0.3);
  ctx.font = `italic 700 ${eFS}px 'DM Serif Display',serif`;
  let eLines = _splitWrap(ctx, eText, W - pad * 2.2);
  if (eLines > 3) {
    eFS = Math.max(W * 0.032, eFS * (3 / eLines));
    ctx.font = `italic 700 ${eFS}px 'DM Serif Display',serif`;
    eLines = _splitWrap(ctx, eText, W - pad * 2.2);
  }
  const eLH     = eFS * 1.52;
  const eBlockH = eLines * eLH;
  const eStartY = botZoneTop + (botH - eBlockH) / 2;
  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1;
  _dmWrap(ctx, eText, W / 2, eStartY, W - pad * 2.2, eLH);
  ctx.restore();

  /* Echo song attribution */
  if (post2.knowledge?.song || post2.song) {
    const eaFS = Math.max(9, W * 0.019);
    ctx.save();
    ctx.font = `700 ${eaFS}px 'Space Mono',monospace`;
    ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.8;
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    const ek = post2.knowledge || {};
    let eaStr = (ek.song || post2.song || '') + (ek.artist || post2.artist ? ' — ' + (ek.artist || post2.artist) : '');
    while (ctx.measureText(eaStr).width > (W - pad * 2.2) * 0.9 && eaStr.length > 4)
      eaStr = eaStr.slice(0, -4) + '…';
    ctx.fillText(eaStr, W / 2, H * 0.89);
    ctx.restore();
  }

  /* ── Watermark ── */
  const wFS = Math.max(9, W * 0.02);
  ctx.save();
  ctx.font = `700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const wTxt = 'trymargo.com';
  const wW2  = ctx.measureText(wTxt).width + W * 0.044;
  const wH2  = wFS * 1.7;
  const wX   = W / 2 - wW2 / 2;
  const wY   = H - pad * 0.85 - wH2 / 2;
  ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(wX, wY, wW2, wH2, wH2 / 2); else ctx.rect(wX, wY, wW2, wH2);
  ctx.fill();
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
  ctx.fillText(wTxt, W / 2, wY + wH2 / 2);
  ctx.restore();
}

/* Helper: count wrap lines without drawing */
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
   DUET GIF FRAME RENDERER
   Two-phase animation:
   Phase 1 (t 0→0.5): original lyric fades in + holds
   Phase 2 (t 0.5→1): echo lyric fades in below divider
──────────────────────────────────────────────────────────── */
function gsDrawDuetFrame(ctx, W, H, t) {
  const { post1, post2 } = getDuetData();
  if (!post1 || !post2) {
    if (typeof gsDrawFrame === 'function') gsDrawFrame(ctx, W, H, t);
    return;
  }

  const pVibe = _dmVibeColor(post1.emotion || 'Nostalgia');
  const eVibe = _dmVibeColor(post2.emotion || 'Nostalgia');
  const scale = W / 500;

  /* Background blends from pVibe theme → eVibe theme */
  const blend = Math.min(1, Math.max(0, (t - 0.38) / 0.38));
  const bgC1  = _blendHex('#090810', '#08080f', blend);
  const bgC2  = _blendHex('#1a0d12', '#0d0820', blend);
  const bg    = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, bgC1); bg.addColorStop(0.5, bgC2); bg.addColorStop(1, bgC1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  /* Vibe glows */
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

  /* MARGO wordmark */
  ctx.save();
  ctx.font = `800 ${Math.round(22 * scale)}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.75;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('MARGO', W * 0.09, W * 0.09);
  ctx.restore();

  /* Phase 1 — original lyric */
  const e1 = t <= 0.55 ? Math.min(1, t / 0.3) : 1;
  const y1off = (1 - e1) * 18 * scale;
  ctx.save();
  ctx.globalAlpha = e1;
  ctx.translate(0, y1off);
  _drawGifLyric(ctx, W, H, scale, post1, H * 0.36, pVibe, false);
  ctx.restore();

  /* Divider sweeps in at t=0.42 */
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

  /* Phase 2 — echo lyric */
  if (t > 0.48) {
    const e2 = Math.min(1, (t - 0.48) / 0.30);
    const y2off = (1 - e2) * 18 * scale;
    ctx.save();
    ctx.globalAlpha = e2;
    ctx.translate(0, y2off);
    _drawGifLyric(ctx, W, H, scale, post2, H * 0.70, eVibe, true);
    ctx.restore();
  }

  /* Watermark */
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = `700 ${Math.round(12 * scale)}px 'Space Mono',monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('trymargo.com', W / 2, H * 0.97);
  ctx.restore();
}

function _drawGifLyric(ctx, W, H, scale, post, yCenter, color, isEcho) {
  const k      = post.knowledge || {};
  const lyric  = (post.text || post.lyric || '').substring(0, 70);
  const song   = (k.song   || post.song   || '').substring(0, 28);
  const artist = (k.artist || post.artist || '').substring(0, 30);

  ctx.textAlign = 'center';
  const len  = lyric.length;
  const sz   = (len < 35 ? 34 : len < 55 ? 27 : 21) * scale;

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

/* ── Hex blend helper ── */
function _blendHex(h1, h2, t) {
  const p = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
  const a = p(h1), b = p(h2);
  const r = (c1,c2) => Math.round(c1 + (c2-c1)*t);
  return `rgb(${r(a[0],b[0])},${r(a[1],b[1])},${r(a[2],b[2])})`;
}

/* ────────────────────────────────────────────────────────────
   GIF EXPORT FOR SHARE SHEET
   Called by share-sheet.js as gsExportForShareSheet(progressCb)
   Returns Promise<Blob>
──────────────────────────────────────────────────────────── */
window.gsExportForShareSheet = async function(onProgress) {
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
    const gif = new GIF({
      workers: 2, quality: 5,
      width: SIZE, height: SIZE,
      workerScript: '/js/gif.worker.js',
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
   GLOBAL EXPOSE
──────────────────────────────────────────────────────────── */
window.isDuetMode          = isDuetMode;
window.getDuetData         = getDuetData;
window.drawDuetPosterToCtx = drawDuetPosterToCtx;
window.gsDrawDuetFrame     = gsDrawDuetFrame;
