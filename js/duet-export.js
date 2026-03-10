/* ============================================================
   MARGO — js/duet-export.js
   v8.0 — Design from duet-sheet.js _dsDrawCard (MAIN)
          Animation math from gif-studio.js gsDrawFrame (MAIN)
          Download engine from duet-export (concept-clean)
   ============================================================ */
(function () {

/* ── Vibe colours — mirror of DS_VIBE in duet-sheet.js ── */
const _VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

/* ── Speed map ── */
const _SPEED_MS = { slow: 130, normal: 70, fast: 35 };

/* ── Frame counts per animation ── */
const _ANIM_FRAMES = {
  'fade-up':24, 'typewriter':32, 'slide-in':22,
  'pulse':20, 'glitch':18, 'wave':28, 'shimmer':24, 'bounce':22,
};

/* ── Word wrap (same as _dsWrap in main) ── */
function _wrap(ctx, text, maxW) {
  const words = String(text || '').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ── Ease ── */
function _ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

/* ════════════════════════════════════════════════════════════
   CORE DRAW — exact replica of _dsDrawCard from main
   + animation applied to lyric layers per frame t (0→1)
   t = null means static (poster), t = 0..1 means animated frame
   ════════════════════════════════════════════════════════════ */
function _drawDuetFrame(ctx, W, H, t, DS) {
  const parent = DS.parentPost || {};
  const echo   = DS.echoPost   || {};
  const mot    = DS.motion     || 'fade-up';
  const ff     = DS.fontFamily || 'DM Serif Display';
  const italic = DS.fontItalic !== false;
  const isStatic = (t === null || t === undefined);

  const pad    = W * 0.07;
  const innerW = W - pad * 2;

  const pEmotion = parent.emotion || 'Nostalgia';
  const eEmotion = echo.emotion   || 'Nostalgia';
  const pVibe    = _VIBE[pEmotion] || '#E8C547';
  const eVibe    = _VIBE[eEmotion] || '#E8C547';
  const divY     = H * 0.495;

  /* ── 1. Background gradient (from _dsDrawCard) ── */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#090810');
  bg.addColorStop(0.48, '#0d0b12');
  bg.addColorStop(0.52, '#080c10');
  bg.addColorStop(1,    '#060809');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ── 2. Radial vibe glows ── */
  ctx.save();
  const pg = ctx.createRadialGradient(W*0.15, H*0.15, 0, W*0.15, H*0.15, W*0.7);
  pg.addColorStop(0, pVibe+'22'); pg.addColorStop(1, 'transparent');
  ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  const eg = ctx.createRadialGradient(W*0.85, H*0.85, 0, W*0.85, H*0.85, W*0.7);
  eg.addColorStop(0, eVibe+'22'); eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* ── 3. Grain texture ── */
  ctx.save();
  ctx.globalAlpha = 0.016;
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  ctx.restore();

  /* ── 4. Accent lines top/bottom ── */
  ctx.save();
  const tl = ctx.createLinearGradient(0, 0, W, 0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(0.5,pVibe); tl.addColorStop(1,'transparent');
  ctx.globalAlpha = 0.65; ctx.fillStyle = tl; ctx.fillRect(0, 0, W, 2);
  const bl = ctx.createLinearGradient(0, 0, W, 0);
  bl.addColorStop(0,'transparent'); bl.addColorStop(0.5,eVibe); bl.addColorStop(1,'transparent');
  ctx.fillStyle = bl; ctx.fillRect(0, H-2, W, 2);
  ctx.restore();

  /* ── 5. MARGO wordmark (from gsDrawWordmark) ── */
  const mSz = Math.max(14, W * 0.046);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.88;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.65);
  ctx.restore();

  /* ════════════════════════════════════════════════════════
     ANIMATION HELPERS — from gsDrawFrame animation functions
     Applied to lyric text only, not background/meta/wm
  ════════════════════════════════════════════════════════ */
  function animT(delay) {
    if (isStatic) return 1;
    return Math.max(0, Math.min(1, (t - delay) / Math.max(0.01, 1 - delay)));
  }

  /* Returns {alpha, ox, oy, scale} for a given delay */
  function getLyricAnim(delay) {
    if (isStatic) return { alpha:1, ox:0, oy:0, sc:1 };
    const ta = animT(delay);
    const e  = _ease(ta);
    switch (mot) {
      case 'fade-up':
        return { alpha: Math.min(1, e*2.2), ox:0, oy:(1-e)*38*(W/500), sc:1 };
      case 'slide-in': {
        const eo = 1 - Math.pow(1 - Math.min(1, ta/0.7), 3);
        return { alpha: Math.min(1, eo*1.6), ox:(1-eo)*W*0.28, oy:0, sc:1 };
      }
      case 'pulse':
        return { alpha:1, ox:0, oy:0, sc: 0.93+0.07*Math.sin(t*Math.PI*2+delay) };
      case 'glitch': {
        const ph = Math.floor(t*9), isG = ph%3===0 && t<0.85;
        return { alpha:1, ox: isG?(Math.random()-0.5)*10*(W/500):0, oy:0, sc:1, glitch:isG };
      }
      case 'wave':
        return { alpha:1, ox:0, oy: Math.sin(t*Math.PI*2+delay*3)*5*(W/500), sc:1 };
      case 'bounce': {
        const b = ta<0.5 ? 4*ta*ta*ta : 1-Math.pow(-2*ta+2,3)/2;
        return { alpha:1, ox:0, oy:(1-b)*H*0.06, sc: 0.86+b*0.14 };
      }
      case 'shimmer':
        return { alpha:1, ox:0, oy:0, sc:1, shimmer:true };
      case 'typewriter':
        return { alpha:1, ox:0, oy:0, sc:1, typewriter:true };
      default:
        return { alpha: Math.min(1, e*2.2), ox:0, oy:(1-e)*38*(W/500), sc:1 };
    }
  }

  /* Draw lyric text with animation applied */
  function drawLyricAnimated(text, cx, baseY, maxW, lh, fontStr, color, delay, isBottom) {
    const am = getLyricAnim(delay);
    const scale = W / 500;

    ctx.save();
    ctx.font = fontStr;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';

    let lines = _wrap(ctx, text, maxW);
    if (lines.length > 3) {
      /* Reduce font size to fit */
      const sizeParts = fontStr.match(/(\d+)px/);
      if (sizeParts) {
        const newSz = Math.max(W*0.028, parseFloat(sizeParts[1]) * (3/lines.length));
        fontStr = fontStr.replace(/\d+px/, Math.round(newSz) + 'px');
        ctx.font = fontStr;
        lines = _wrap(ctx, text, maxW);
      }
    }

    const blockH = lines.length * lh;
    const startY = baseY;

    if (am.shimmer) {
      /* Draw base text */
      ctx.globalAlpha = am.alpha;
      ctx.fillStyle   = color + '99';
      lines.forEach((l, i) => ctx.fillText(l, cx, startY + am.oy + i*lh));
      /* Shimmer overlay */
      const sx = t * (W + 160*scale) - 80*scale;
      const sh = ctx.createLinearGradient(sx-70*scale, 0, sx+70*scale, 0);
      sh.addColorStop(0,'transparent'); sh.addColorStop(0.4,'#E8C547');
      sh.addColorStop(0.6,'#ffffff');   sh.addColorStop(1,'transparent');
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = sh;
      lines.forEach((l, i) => ctx.fillText(l, cx, startY + am.oy + i*lh));
      ctx.restore();
    } else if (am.typewriter) {
      const ta2    = animT(delay);
      const chars  = Math.floor(ta2 * (text.length + 6));
      const vis    = text.substring(0, Math.min(chars, text.length));
      const cur    = chars <= text.length && (Math.floor(t*10)%2===0) ? '|' : '';
      ctx.globalAlpha   = 1;
      ctx.fillStyle     = color;
      ctx.shadowColor   = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur    = 10*scale;
      const vLines = _wrap(ctx, vis+cur, maxW);
      vLines.forEach((l, i) => ctx.fillText(l, cx, startY + i*lh));
    } else if (am.glitch) {
      if (am.glitch) {
        ctx.save();
        ctx.globalAlpha = 0.55; ctx.fillStyle = '#ff0040';
        ctx.translate(3*scale, 0);
        lines.forEach((l, i) => ctx.fillText(l, cx+am.ox, startY+am.oy+i*lh));
        ctx.restore();
      }
      ctx.globalAlpha = am.alpha;
      ctx.fillStyle   = color;
      ctx.translate(am.ox, 0);
      lines.forEach((l, i) => ctx.fillText(l, cx, startY+am.oy+i*lh));
    } else if (am.sc !== 1) {
      /* pulse / bounce — scale around lyric center */
      const cy2 = startY + blockH/2;
      ctx.globalAlpha = am.alpha;
      ctx.translate(cx, cy2 + am.oy);
      ctx.scale(am.sc, am.sc);
      ctx.fillStyle   = color;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur  = 12*scale;
      lines.forEach((l, i) => ctx.fillText(l, 0, -blockH/2 + i*lh));
    } else {
      ctx.globalAlpha = am.alpha;
      ctx.fillStyle   = color;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur  = isBottom ? 20*scale : 16*scale;
      lines.forEach((l, i) => ctx.fillText(l, cx+am.ox, startY+am.oy+i*lh));
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /* ── 6. TOP LYRIC (parent post) ── */
  const topZoneTop = pad * 2;
  const topZoneBot = divY - W * 0.05;
  const topH       = topZoneBot - topZoneTop;
  const pText      = parent.text || parent.lyric || '';
  let pFS = Math.min(W*0.054, topH*0.3);
  const pFontStr = `${italic?'italic ':''}600 ${Math.round(pFS)}px '${ff}',serif`;
  ctx.font = pFontStr;
  const pLines = _wrap(ctx, pText, innerW*0.9);
  const pActualFS = pLines.length > 3 ? Math.max(W*0.028, pFS*(3/pLines.length)) : pFS;
  const pLH     = pActualFS * 1.52;
  const pBlockH = Math.min(pLines.length, 3) * pLH;
  const pStartY = topZoneTop + (topH - pBlockH) / 2 - pActualFS*0.3;

  ctx.save();
  /* top lyric is dimmer (0.58 alpha base) — matches _dsDrawCard */
  ctx.globalAlpha = 0.58;
  drawLyricAnimated(
    pText, W/2, pStartY, innerW*0.9, pLH,
    `${italic?'italic ':''}600 ${Math.round(pActualFS)}px '${ff}',serif`,
    '#ffffff', 0.0, false
  );
  ctx.restore();

  /* ── 7. Parent song attribution ── */
  const pk      = parent.knowledge || {};
  const pSongStr = pk.song || parent.song || '';
  if (pSongStr) {
    const paFS = Math.max(9, W*0.019);
    ctx.save();
    ctx.font = `700 ${paFS}px 'Space Mono',monospace`;
    ctx.fillStyle = pVibe; ctx.globalAlpha = 0.42;
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    let paStr = pSongStr + ((pk.artist||parent.artist) ? ' — '+(pk.artist||parent.artist) : '');
    while (ctx.measureText(paStr).width > innerW*0.8 && paStr.length > 4)
      paStr = paStr.slice(0,-4)+'…';
    ctx.fillText(paStr, W/2, divY - W*0.045);
    ctx.restore();
  }

  /* ── 8. LYRIC BACK divider pill (from _dsDrawCard exactly) ── */
  const dText = `LYRIC BACK ↩  @${(echo.username||'anonymous').toUpperCase()}`;
  const dFS   = Math.max(10, W*0.021);
  ctx.font    = `700 ${dFS}px 'Space Mono',monospace`;
  const dTW   = ctx.measureText(dText).width;
  const pH    = dFS * 1.95;
  const pPH   = W * 0.028;
  const pW    = dTW + pPH * 2;
  const pX    = W/2 - pW/2;
  const pY    = divY - pH/2;
  const pR    = pH/2;

  ctx.save();
  const gap = pW/2 + W*0.018;
  [[pad, W/2-gap],[W/2+gap, W-pad]].forEach(([x1,x2]) => {
    const lg = ctx.createLinearGradient(x1,0,x2,0);
    if (x1===pad) { lg.addColorStop(0,'transparent'); lg.addColorStop(1,'rgba(232,197,71,0.22)'); }
    else          { lg.addColorStop(0,'rgba(232,197,71,0.22)'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle=lg; ctx.fillRect(x1, divY-0.75, x2-x1, 1.5);
  });
  ctx.restore();

  ctx.save();
  ctx.shadowColor='#E8C547'; ctx.shadowBlur=14;
  ctx.strokeStyle='rgba(232,197,71,0.6)'; ctx.lineWidth=1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.stroke(); ctx.shadowBlur=0;
  const pFill=ctx.createLinearGradient(pX,pY,pX,pY+pH);
  pFill.addColorStop(0,'rgba(232,197,71,0.14)'); pFill.addColorStop(1,'rgba(232,197,71,0.06)');
  ctx.fillStyle=pFill;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.fill();
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.95;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(dText, W/2, divY);
  ctx.restore();

  /* ── 9. BOTTOM LYRIC (echo post) — main/dominant ── */
  const botZoneTop = divY + pH/2 + W*0.025;
  const botZoneBot = H * 0.88;
  const botH       = botZoneBot - botZoneTop;
  const eText      = echo.lyric || echo.text || '';
  let eFS = Math.min(W*0.062, botH*0.3);
  const eFontStr   = `${italic?'italic ':''}700 ${Math.round(eFS)}px '${ff}',serif`;
  ctx.font = eFontStr;
  const eLines     = _wrap(ctx, eText, innerW*0.9);
  const eActualFS  = eLines.length > 3 ? Math.max(W*0.032, eFS*(3/eLines.length)) : eFS;
  const eLH        = eActualFS * 1.52;
  const eBlockH    = Math.min(eLines.length, 3) * eLH;
  const eStartY    = botZoneTop + (botH - eBlockH) / 2;

  drawLyricAnimated(
    eText, W/2, eStartY, innerW*0.9, eLH,
    `${italic?'italic ':''}700 ${Math.round(eActualFS)}px '${ff}',serif`,
    '#ffffff', 0.45, true
  );

  /* ── 10. Echo song attribution ── */
  if (echo.song) {
    const eaFS = Math.max(9, W*0.019);
    ctx.save();
    ctx.font=`700 ${eaFS}px 'Space Mono',monospace`;
    ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.8;
    ctx.textBaseline='bottom'; ctx.textAlign='center';
    let eaStr = echo.song + (echo.artist ? ' — '+echo.artist : '');
    while (ctx.measureText(eaStr).width > innerW*0.8 && eaStr.length>4)
      eaStr = eaStr.slice(0,-4)+'…';
    ctx.fillText(eaStr, W/2, H*0.89);
    ctx.restore();
  }

  /* ── 11. Watermark pill (from gsDrawWatermark) ── */
  const wFS  = Math.max(9, W*0.022);
  ctx.save();
  ctx.font = `700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline='middle';
  const wTxt  = 'trymargo.com';
  const wTxtW = ctx.measureText(wTxt).width;
  const wPadX = wFS * 1.0, wPadY = wFS * 0.55;
  const wW2   = wTxtW + wPadX*2, wH2 = wFS + wPadY*2;
  const wR    = wH2/2;
  const wX    = W/2 - wW2/2;
  const wY    = H*0.938 - wH2/2;
  ctx.beginPath();
  ctx.moveTo(wX+wR, wY);
  ctx.arcTo(wX+wW2, wY,      wX+wW2, wY+wH2, wR);
  ctx.arcTo(wX+wW2, wY+wH2,  wX,     wY+wH2, wR);
  ctx.arcTo(wX,     wY+wH2,  wX,     wY,     wR);
  ctx.arcTo(wX,     wY,      wX+wW2, wY,     wR);
  ctx.closePath();
  ctx.fillStyle   = 'rgba(255,255,255,0.12)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth   = Math.max(1, W*0.001); ctx.stroke();
  ctx.fillStyle   = '#ffffff';
  ctx.textAlign   = 'center'; ctx.shadowBlur = 0;
  ctx.fillText(wTxt, W/2, wY + wH2/2);
  ctx.restore();
}

/* ════════════════════════════════════════════════════════════
   PREVIEW (live animated canvas in the sheet)
   Hidden offscreen — HTML preview from duet-sheet.js shows instead
   Preview is only used to drive the CSS animations in HTML
   The canvas is only rendered during export
════════════════════════════════════════════════════════════ */
const PV = { _raf: null, _frame: 0, _last: 0 };

function _startPreview() {
  /* In this architecture, the HTML preview from duet-sheet.js
     is what the user sees — we don't inject a canvas preview.
     The CSS keyframe animations in duet-sheet.js handle the live preview.
     This function is a no-op kept for API compatibility. */
}

function _stopPreview() {
  if (PV._raf) { cancelAnimationFrame(PV._raf); PV._raf = null; }
}

/* ════════════════════════════════════════════════════════════
   DOWNLOAD HELPER
════════════════════════════════════════════════════════════ */
function _dl(blob, fname) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = fname;
  a.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
}

/* ════════════════════════════════════════════════════════════
   PROGRESS HELPER
════════════════════════════════════════════════════════════ */
function _setProgress(btn, pct, label, color) {
  if (!btn) return;
  btn.disabled = pct < 100;
  btn.textContent = pct < 100 ? label : label;
  btn.style.opacity = pct < 100 ? '0.7' : '1';
}

/* ════════════════════════════════════════════════════════════
   GIF EXPORT — same engine as gif-studio.js gsExport
   Design from _drawDuetFrame (= _dsDrawCard + animation)
════════════════════════════════════════════════════════════ */
async function _exportGif() {
  const DS = window._DS || {};
  const dlBtn = document.getElementById('dsBtnDownload');
  const shBtn = document.getElementById('dsBtnShare');
  if (dlBtn) { dlBtn.disabled = true; dlBtn.textContent = 'Building…'; }
  if (shBtn)   shBtn.disabled = true;

  const SIZE   = 1080;
  const mot    = DS.motion || 'fade-up';
  const frames = _ANIM_FRAMES[mot] || 24;
  const speed  = DS.speed  || 'normal';
  const delay  = _SPEED_MS[speed] || 70;

  const off = document.createElement('canvas');
  off.width = SIZE; off.height = SIZE;
  const oc  = off.getContext('2d');

  try {
    await document.fonts.ready;

    /* Load GIF.js if not already present */
    if (typeof GIF === 'undefined') {
      await new Promise((res, rej) => {
        const sc  = document.createElement('script');
        sc.src    = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
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
      _drawDuetFrame(oc, SIZE, SIZE, i/frames, DS);
      gif.addFrame(off, { copy: true, delay });
      if (dlBtn) dlBtn.textContent = `GIF ${Math.round((i/frames)*75)}%`;
      await new Promise(r => setTimeout(r, 0));
    }

    gif.on('progress', p => {
      if (dlBtn) dlBtn.textContent = `Encoding… ${Math.round(75+p*25)}%`;
    });

    gif.on('finished', blob => {
      _dl(blob, `margo-duet-${Date.now()}.gif`);
      if (dlBtn) { dlBtn.textContent = '✓ GIF Saved!'; dlBtn.disabled = false; }
      if (shBtn)   shBtn.disabled = false;
      if (typeof showToast === 'function') showToast('GIF saved ✓');
    });

    gif.render();

  } catch (err) {
    console.error('[duet-export] GIF error:', err);
    if (dlBtn) { dlBtn.textContent = 'GIF'; dlBtn.disabled = false; }
    if (shBtn)   shBtn.disabled = false;
  }
}

/* ════════════════════════════════════════════════════════════
   POSTER EXPORT — static t=null frame → PNG
════════════════════════════════════════════════════════════ */
async function _exportPoster() {
  const DS = window._DS || {};
  const dlBtn = document.getElementById('dsBtnDownload');
  const shBtn = document.getElementById('dsBtnShare');
  if (dlBtn) { dlBtn.disabled = true; dlBtn.textContent = 'Saving…'; }
  if (shBtn)   shBtn.disabled = true;

  const SIZE = 1080;
  const off  = document.createElement('canvas');
  off.width  = SIZE; off.height = SIZE;
  const oc   = off.getContext('2d');

  try {
    await document.fonts.ready;
    _drawDuetFrame(oc, SIZE, SIZE, null, DS); /* null = static/poster */

    off.toBlob(blob => {
      if (!blob) throw new Error('toBlob failed');
      const pSong = ((DS.parentPost?.knowledge?.song || DS.parentPost?.song || 'lyric'))
        .replace(/\s+/g,'-').toLowerCase();
      _dl(blob, `margo-duet-${pSong}.png`);
      if (dlBtn) { dlBtn.textContent = '✓ Poster Saved!'; dlBtn.disabled = false; }
      if (shBtn)   shBtn.disabled = false;
      if (typeof showToast === 'function') showToast('Poster saved ✓');
    }, 'image/png', 0.93);

  } catch (err) {
    console.error('[duet-export] Poster error:', err);
    if (dlBtn) { dlBtn.textContent = 'Download'; dlBtn.disabled = false; }
    if (shBtn)   shBtn.disabled = false;
  }
}

/* ════════════════════════════════════════════════════════════
   WIRE INTO DUET SHEET OPEN/CLOSE
   Patches window.openDuetSheet / window.closeDuetSheet
   to keep HTML preview working + connect export buttons
════════════════════════════════════════════════════════════ */
function _wireButtons() {
  /* Download button — routes based on DS.format */
  const dlBtn = document.getElementById('dsBtnDownload');
  if (dlBtn) {
    dlBtn.onclick = () => {
      const DS = window._DS || {};
      if (DS.format === 'poster') _exportPoster();
      else _exportGif();
    };
  }

  /* Share buttons if separate */
  const gifBtn    = document.getElementById('dsBtnGif');
  const posterBtn = document.getElementById('dsBtnPoster');
  if (gifBtn)    gifBtn.onclick    = _exportGif;
  if (posterBtn) posterBtn.onclick = _exportPoster;
}

/* Patch openDuetSheet to wire buttons after HTML is populated */
function _init() {
  const _origOpen  = window.openDuetSheet;
  const _origClose = window.closeDuetSheet;

  window.openDuetSheet = function(parentPost, echoPost) {
    /* Call original (populates HTML, shows sheet) */
    if (_origOpen) _origOpen(parentPost, echoPost);
    /* Expose DS state for export functions */
    /* duet-sheet.js keeps DS internal — we read it via DOM/globals */
    /* Wire the export buttons after open */
    setTimeout(_wireButtons, 100);
  };

  window.closeDuetSheet = function() {
    _stopPreview();
    if (_origClose) _origClose();
  };
}

/* ════════════════════════════════════════════════════════════
   EXPOSE PUBLIC API + GLOBAL HOOKS
   duet-sheet.js already calls window._duetDrawCard / _duetDrawConvo
   We expose _drawDuetFrame as BOTH — same design for both views
════════════════════════════════════════════════════════════ */

/* Adapter: duet-sheet calls drawFn(ctx, W, H, t, DS, theme)
   Our function signature: _drawDuetFrame(ctx, W, H, t, DS)
   DS is always window._DS which is the live state object */
function _frameAdapter(ctx, W, H, t, DS) {
  _drawDuetFrame(ctx, W, H, t, DS || window._DS || {});
}

window._duetDrawCard  = _frameAdapter; /* used by _dsExportGif in duet-sheet */
window._duetDrawConvo = _frameAdapter; /* same design for both views */

window._duetExport = {
  gif:          _exportGif,
  poster:       _exportPoster,
  drawFrame:    _drawDuetFrame,
  startPreview: _startPreview,
  stopPreview:  _stopPreview,
};

/* Also override the poster export in duet-sheet to use our canvas draw
   instead of html2canvas — patch _dsExportPoster via the gif path */
window._duetPosterDraw = function(ctx, W, H, DS) {
  _drawDuetFrame(ctx, W, H, null, DS || window._DS || {});
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}

})();
