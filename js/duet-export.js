/* ============================================================
   MARGO — js/duet-export.js  v2.0
   Pure canvas export — no html2canvas, no DOM screenshots.
   Same approach as gif-studio.js: draw everything with ctx calls.

   Reads from duet-sheet.js via:
     window._DS        — state (parentPost, echoPost, motion, dur, bgColor, fontFamily)
     window._DSThemes  — theme map

   Exposes: window._duetExport.gif(plat, action)
            window._duetExport.poster(plat, action)
   ============================================================ */

(function () {

  /* ── wait for duet-sheet.js to expose its globals ── */
  function _ready(fn) {
    if (window._DS && window._DSThemes) { fn(); return; }
    const iv = setInterval(() => {
      if (window._DS && window._DSThemes) { clearInterval(iv); fn(); }
    }, 50);
  }

  /* ════════════════════════════════════════
     DEPENDENCIES
  ════════════════════════════════════════ */

  async function _loadGIF() {
    if (typeof GIF !== 'undefined') return;
    await new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      sc.onload = res; sc.onerror = rej;
      document.head.appendChild(sc);
    });
  }

  async function _preloadFonts(DS) {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('800 1em Syne'),
      document.fonts.load('700 1em "Space Mono"'),
      document.fonts.load('400 1em "Space Mono"'),
      document.fonts.load('700 1em "DM Sans"'),
      document.fonts.load('400 1em "DM Sans"'),
      document.fonts.load('600 1em "' + DS.fontFamily + '"'),
      document.fonts.load('italic 600 1em "' + DS.fontFamily + '"'),
    ].map(p => p.catch(() => {})));
  }

  /* ════════════════════════════════════════
     DOWNLOAD TRIGGER
  ════════════════════════════════════════ */

  function _dl(blob, fname) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = fname; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }

  /* ════════════════════════════════════════
     FONT HELPERS
  ════════════════════════════════════════ */

  function _fStack(f) {
    return {
      'DM Serif Display': "'DM Serif Display',serif",
      'Playfair Display':  "'Playfair Display',serif",
      'Space Mono':        "'Space Mono',monospace",
      'DM Sans':           "'DM Sans',sans-serif",
      'Georgia':           'Georgia,serif',
    }[f] || ("'" + f + "',sans-serif");
  }

  function _isItalic(f) {
    return ['DM Serif Display', 'Playfair Display', 'Georgia'].includes(f);
  }

  /* ════════════════════════════════════════
     TEXT WRAP HELPER
  ════════════════════════════════════════ */

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

  /* ════════════════════════════════════════
     ANIMATION — t01 is 0..1 per full cycle
  ════════════════════════════════════════ */

  function _ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function _animState(mot, t01, delayFrac) {
    let p = ((t01 - delayFrac) % 1 + 1) % 1;
    const e = _ease(p);
    const fadeIn  = p < 0.25 ? p / 0.25 : 1;
    const fadeOut = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    const alpha   = Math.min(fadeIn, fadeOut);

    if (mot === 'fade-up')  return { alpha, dx: 0, dy: (1 - e) * 22, sx: 1, sy: 1, hue: 0 };
    if (mot === 'slide-in') return { alpha, dx: (1 - e) * -32, dy: 0, sx: 1, sy: 1, hue: 0 };
    if (mot === 'bounce')   return { alpha, dx: 0, dy: (1 - e) * -20, sx: 1, sy: 1, hue: 0 };
    if (mot === 'wave')     return { alpha: 1, dx: 0, dy: Math.sin(p * Math.PI * 2) * 10, sx: 1, sy: 1, hue: 0 };
    if (mot === 'pulse') {
      const sc = 0.93 + 0.07 * Math.sin(p * Math.PI * 2);
      return { alpha: 0.4 + 0.6 * Math.abs(Math.sin(p * Math.PI)), dx: 0, dy: 0, sx: sc, sy: sc, hue: 0 };
    }
    if (mot === 'glitch') {
      const phase = Math.floor(p * 9);
      const isG   = phase % 3 === 0 && p < 0.85;
      const ox    = isG ? ((phase * 7919) % 11 - 5) : 0;
      return { alpha: 1, dx: ox, dy: 0, sx: 1, sy: 1, hue: isG ? 90 : 0 };
    }
    if (mot === 'shimmer')    return { alpha: 1, dx: 0, dy: 0, sx: 1, sy: 1, hue: 0, shimmerP: p };
    if (mot === 'typewriter') return { alpha: 1, dx: 0, dy: 0, sx: 1, sy: 1, hue: 0, typerP: p };
    return { alpha, dx: 0, dy: (1 - e) * 22, sx: 1, sy: 1, hue: 0 };
  }

  /* ════════════════════════════════════════
     CANVAS FRAME RENDERER
  ════════════════════════════════════════ */

  function _drawDuetFrame(ctx, W, H, t01, DS, theme) {
    const parent  = DS.parentPost || {};
    const echo    = DS.echoPost   || {};
    const mot     = DS.motion;
    const isLight = theme.light;
    const bodyTxt  = isLight ? '#0B0B0D' : '#ffffff';
    const mutedTxt = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';
    const fam      = _fStack(DS.fontFamily);
    const italic   = _isItalic(DS.fontFamily);

    /* background */
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, theme.g1);
    bg.addColorStop(1, theme.g2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* glow */
    const gL = ctx.createRadialGradient(W * 0.18, H * 0.28, 0, W * 0.18, H * 0.28, W * 0.55);
    gL.addColorStop(0, theme.glow1); gL.addColorStop(1, 'transparent');
    ctx.fillStyle = gL; ctx.fillRect(0, 0, W, H);
    const gR = ctx.createRadialGradient(W * 0.82, H * 0.72, 0, W * 0.82, H * 0.72, W * 0.5);
    gR.addColorStop(0, theme.glow2); gR.addColorStop(1, 'transparent');
    ctx.fillStyle = gR; ctx.fillRect(0, 0, W, H);

    /* MARGO wordmark */
    const mSz = Math.max(16, W * 0.042);
    ctx.save();
    ctx.font = `800 ${mSz}px 'Syne',sans-serif`;
    ctx.fillStyle = theme.acc; ctx.globalAlpha = 0.9;
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText('MARGO', W * 0.046, W * 0.038);
    ctx.restore();

    /* layout constants */
    const isWide = W > H;
    const isTall = H > W * 1.4;
    const B      = isWide ? H : (isTall ? W : Math.min(W, H));
    const pad    = B * 0.05;
    const gap    = B * (isWide ? 0.017 : isTall ? 0.022 : 0.026);
    const lyricFsz = Math.max(12, B * 0.043);
    const songFsz  = Math.max(10, B * 0.026);
    const artFsz   = Math.max(9,  B * 0.018);
    const uFsz     = Math.max(10, B * 0.022);
    const bPad     = B * 0.036;
    const bRad     = B * 0.030;
    const bR2      = B * 0.005;
    const lh       = lyricFsz * 1.42;
    const bubH     = uFsz * 1.5 + bPad * 2 + lh * 3.5 + songFsz * 2.4 + bPad;
    const divH     = Math.max(24, B * 0.044);
    const barH     = Math.max(40, B * 0.062);
    const wmarkH   = Math.max(20, B * 0.032);

    /* animation states — stagger right bubble by 18% */
    const animL = _animState(mot, t01, 0);
    const animD = _animState(mot, t01, 0.09);
    const animR = _animState(mot, t01, 0.18);

    /* ── draw one bubble card ── */
    function _bubble(side, data, bx, by, bw, anim) {
      const col = side === 'left' ? theme.l : theme.r;
      const bgl = col + '22';
      const bbc = col + '44';
      const pk     = data.knowledge || {};
      const song   = (pk.song   || data.song   || '').substring(0, 26);
      const artist = (pk.artist || data.artist || '').substring(0, 26);
      const lyric  = (data.lyric || data.text  || '').substring(0, 200);
      const emotion= (data.emotion || '');
      const user   = ('@' + (data.username || 'anonymous')).toUpperCase().substring(0, 20);

      ctx.save();
      ctx.globalAlpha = anim.alpha;
      if (anim.hue) ctx.filter = `hue-rotate(${anim.hue}deg)`;

      /* translate from centre of card */
      const cx = bx + bw / 2;
      const cy = by + bubH / 2;
      ctx.translate(cx + anim.dx, cy + anim.dy);
      if (anim.sx !== 1 || anim.sy !== 1) ctx.scale(anim.sx, anim.sy);
      ctx.translate(-cx, -cy);

      /* username */
      ctx.font = `800 ${uFsz}px 'Syne',sans-serif`;
      ctx.fillStyle = col;
      ctx.textBaseline = 'top';
      ctx.textAlign = side === 'left' ? 'left' : 'right';
      ctx.shadowBlur = 0;
      ctx.fillText(user, side === 'left' ? bx : bx + bw, by);

      const cardY  = by + uFsz * 1.5;
      const cardH  = bubH - uFsz * 1.5;
      const radTL  = bRad, radTR = bRad;
      const radBL  = side === 'left' ? bR2 : bRad;
      const radBR  = side === 'left' ? bRad : bR2;

      /* card background */
      ctx.beginPath();
      ctx.moveTo(bx + radTL, cardY);
      ctx.lineTo(bx + bw - radTR, cardY);
      ctx.arcTo(bx + bw, cardY, bx + bw, cardY + radTR, radTR);
      ctx.lineTo(bx + bw, cardY + cardH - radBR);
      ctx.arcTo(bx + bw, cardY + cardH, bx + bw - radBR, cardY + cardH, radBR);
      ctx.lineTo(bx + radBL, cardY + cardH);
      ctx.arcTo(bx, cardY + cardH, bx, cardY + cardH - radBL, radBL);
      ctx.lineTo(bx, cardY + radTL);
      ctx.arcTo(bx, cardY, bx + radTL, cardY, radTL);
      ctx.closePath();
      ctx.fillStyle = bgl;
      ctx.fill();
      ctx.strokeStyle = bbc;
      ctx.lineWidth   = 1;
      ctx.stroke();

      /* lyric */
      const lyricY   = cardY + bPad;
      const lyricMaxW= bw - bPad * 2;
      ctx.font = `${italic ? 'italic ' : ''}600 ${lyricFsz}px ${fam}`;
      ctx.fillStyle    = bodyTxt;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.shadowColor  = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur   = 8;

      let lines = _wrap(ctx, lyric, lyricMaxW);
      if (lines.length > 4) lines = lines.slice(0, 4);

      if (anim.typerP !== undefined) {
        const full  = lyric;
        const chars = Math.floor(anim.typerP * (full.length + 4));
        lines = _wrap(ctx, full.substring(0, Math.min(chars, full.length)), lyricMaxW);
        if (lines.length > 4) lines = lines.slice(0, 4);
      }

      lines.forEach((line, i) => ctx.fillText(line, bx + bPad, lyricY + i * lh));
      ctx.shadowBlur = 0;

      /* shimmer */
      if (anim.shimmerP !== undefined) {
        const sx = anim.shimmerP * (bw + 100) - 50;
        const sh = ctx.createLinearGradient(bx + sx - 55, 0, bx + sx + 55, 0);
        sh.addColorStop(0, 'transparent');
        sh.addColorStop(0.4, col);
        sh.addColorStop(0.6, '#ffffff');
        sh.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.45;
        ctx.fillStyle   = sh;
        lines.forEach((line, i) => ctx.fillText(line, bx + bPad, lyricY + i * lh));
        ctx.restore();
      }

      /* divider */
      const divLineY = lyricY + lines.length * lh + bPad * 0.7;
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(bx + bPad, divLineY);
      ctx.lineTo(bx + bw - bPad, divLineY);
      ctx.stroke();

      /* song / artist */
      const metaY = divLineY + bPad * 0.55;
      ctx.font = `700 ${songFsz}px 'DM Sans',sans-serif`;
      ctx.fillStyle = bodyTxt; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(song, bx + bPad, metaY);
      ctx.font = `400 ${artFsz}px 'Space Mono',monospace`;
      ctx.fillStyle = mutedTxt;
      ctx.fillText(artist, bx + bPad, metaY + songFsz * 1.35);

      /* emotion pill */
      if (emotion) {
        const eFsz  = Math.max(8, B * 0.016);
        const ePadX = B * 0.016, ePadY = B * 0.007;
        ctx.font = `800 ${eFsz}px 'Syne',sans-serif`;
        const eW  = ctx.measureText(emotion).width + ePadX * 2;
        const eH  = eFsz + ePadY * 2;
        const eX  = bx + bw - bPad - eW;
        const eY  = metaY;
        ctx.fillStyle   = bgl;
        ctx.strokeStyle = bbc;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(eX, eY, eW, eH, eH / 2);
        else ctx.rect(eX, eY, eW, eH);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emotion, eX + eW / 2, eY + eH / 2);
      }

      ctx.restore();
    }

    if (isWide) {
      /* side-by-side */
      const bw = W * 0.44;
      const by = (H - bubH) / 2;
      _bubble('left',  parent, pad, by, bw, animL);
      _bubble('right', echo,   W - pad - bw, by, bw, animR);
    } else {
      /* stacked portrait */
      const bw = W - pad * 2;
      let cy   = H * 0.10;

      _bubble('left', parent, pad, cy, bw, animL);
      cy += bubH + gap;

      /* divider pill */
      ctx.save();
      ctx.globalAlpha = animD.alpha;
      ctx.translate(0, animD.dy);
      const dFsz  = Math.max(9, B * 0.020);
      const dText = 'LYRIC BACK \u21A9 @' + (echo.username || 'anonymous').toUpperCase();
      ctx.font = `800 ${dFsz}px 'Syne',sans-serif`;
      const dW  = ctx.measureText(dText).width + B * 0.044;
      const dH  = dFsz + B * 0.022;
      const dX  = W / 2 - dW / 2;
      const dY  = cy + (divH - dH) / 2;

      /* side lines */
      const lineY = dY + dH / 2;
      const lineClr = isLight ? 'rgba(0,0,0,0.22)' : 'rgba(232,197,71,0.28)';
      const lg1 = ctx.createLinearGradient(pad, 0, dX - 8, 0);
      lg1.addColorStop(0, 'transparent'); lg1.addColorStop(1, lineClr);
      ctx.strokeStyle = lg1; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, lineY); ctx.lineTo(dX - 8, lineY); ctx.stroke();
      const lg2 = ctx.createLinearGradient(dX + dW + 8, 0, W - pad, 0);
      lg2.addColorStop(0, lineClr); lg2.addColorStop(1, 'transparent');
      ctx.strokeStyle = lg2;
      ctx.beginPath(); ctx.moveTo(dX + dW + 8, lineY); ctx.lineTo(W - pad, lineY); ctx.stroke();

      ctx.fillStyle   = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(232,197,71,0.09)';
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.18)' : 'rgba(232,197,71,0.28)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(dX, dY, dW, dH, dH / 2);
      else ctx.rect(dX, dY, dW, dH);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = isLight ? '#0B0B0D' : theme.acc;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(dText, W / 2, dY + dH / 2);
      ctx.restore();

      cy += divH + gap;
      _bubble('right', echo, pad, cy, bw, animR);
      cy += bubH + gap;

      /* songs bar */
      ctx.save();
      ctx.globalAlpha = Math.min(animL.alpha + 0.3, 1);
      const sbX = pad, sbY = cy, sbW = bw;
      ctx.fillStyle   = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.12)'  : 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sbX, sbY, sbW, barH, B * 0.018);
      else ctx.rect(sbX, sbY, sbW, barH);
      ctx.fill(); ctx.stroke();

      const midY  = sbY + barH / 2;
      const lbFsz = Math.max(9, B * 0.020);
      const sFsz2 = Math.max(10, B * 0.024);
      const aFsz2 = Math.max(9,  B * 0.017);

      ctx.font = `800 ${lbFsz}px 'Syne',sans-serif`;
      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('SONGS', sbX + B * 0.026, midY);

      const pk     = parent.knowledge || {};
      const pSong  = (pk.song || parent.song || '').substring(0, 18);
      const pArt   = (pk.artist || parent.artist || '').substring(0, 18);
      const eSong  = (echo.song   || '').substring(0, 18);
      const eArt   = (echo.artist || '').substring(0, 18);
      const leftX  = sbX + sbW * 0.28;
      const rightX = sbX + sbW * 0.72;

      ctx.font = `700 ${sFsz2}px 'DM Sans',sans-serif`;
      ctx.fillStyle = isLight ? '#0B0B0D' : '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(pSong, leftX - 4, midY - sFsz2 * 0.55);
      ctx.font = `400 ${aFsz2}px 'Space Mono',monospace`;
      ctx.fillStyle = mutedTxt;
      ctx.fillText(pArt, leftX - 4, midY + aFsz2 * 0.9);

      ctx.font = `${sFsz2}px sans-serif`;
      ctx.fillStyle = theme.acc; ctx.globalAlpha *= 0.7;
      ctx.textAlign = 'center'; ctx.fillText('↔', W / 2, midY);
      ctx.globalAlpha = Math.min(animL.alpha + 0.3, 1);

      ctx.font = `700 ${sFsz2}px 'DM Sans',sans-serif`;
      ctx.fillStyle = isLight ? '#0B0B0D' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(eSong, rightX + 4, midY - sFsz2 * 0.55);
      ctx.font = `400 ${aFsz2}px 'Space Mono',monospace`;
      ctx.fillStyle = mutedTxt;
      ctx.fillText(eArt, rightX + 4, midY + aFsz2 * 0.9);
      ctx.restore();

      cy += barH + gap;

      /* watermark */
      ctx.save();
      ctx.globalAlpha = 0.55;
      const wFsz = Math.max(9, B * 0.017);
      ctx.font = `700 ${wFsz}px 'Space Mono',monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const wText = 'trymargo.com';
      const wW    = ctx.measureText(wText).width + B * 0.044;
      const wH2   = wFsz + B * 0.018;
      const wX    = W / 2 - wW / 2;
      const wY    = cy;
      ctx.fillStyle   = isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.09)';
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.18)'  : 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(wX, wY, wW, wH2, wH2 / 2);
      else ctx.rect(wX, wY, wW, wH2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = isLight ? '#0B0B0D' : '#ffffff';
      ctx.fillText(wText, W / 2, wY + wH2 / 2);
      ctx.restore();
    }

    /* Margo badge bottom-right */
    const badgeSz = Math.round(Math.min(W, H) * 0.07);
    const badgeX  = W - W * 0.036 - badgeSz;
    const badgeY  = H - H * 0.034 - badgeSz;
    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeX + badgeSz / 2, badgeY + badgeSz / 2, badgeSz / 2, 0, Math.PI * 2);
    ctx.fillStyle = theme.acc;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    const ic  = badgeSz * 0.52;
    const icX = badgeX + (badgeSz - ic) / 2;
    const icY = badgeY + (badgeSz - ic) / 2;
    ctx.strokeStyle = isLight ? '#ffffff' : '#0B0B0D';
    ctx.lineWidth   = ic * 0.10;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(icX,               icY + ic * 0.70);
    ctx.lineTo(icX,               icY + ic * 0.30);
    ctx.lineTo(icX + ic * 0.20,   icY + ic * 0.52);
    ctx.lineTo(icX + ic * 0.50,   icY + ic * 0.26);
    ctx.lineTo(icX + ic * 0.80,   icY + ic * 0.52);
    ctx.lineTo(icX + ic,          icY + ic * 0.30);
    ctx.lineTo(icX + ic,          icY + ic * 0.70);
    ctx.stroke();
    ctx.restore();
  }

  /* ════════════════════════════════════════
     PROGRESS HELPER
  ════════════════════════════════════════ */

  function _setProgress(btn, pct, label, color) {
    if (!btn) return;
    const icon = btn.querySelector('.ds-export-icon');
    const lbl  = btn.querySelector('span:last-child');
    if (icon) icon.textContent = pct >= 100 ? '✓' : '◎';
    if (lbl)  lbl.textContent  = label;
    let bar = btn.querySelector('.ds-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ds-progress-bar';
      btn.appendChild(bar);
    }
    bar.style.width      = pct + '%';
    bar.style.background = color || '#00E5FF';
  }

  /* ════════════════════════════════════════
     GIF EXPORT
  ════════════════════════════════════════ */

  async function exportGif(plat, action) {
    const DS     = window._DS;
    const themes = window._DSThemes;

    const dlBtn  = document.getElementById('dsBtnDownload');
    const shBtn  = document.getElementById('dsBtnShare');
    const btn    = action === 'download' ? dlBtn : shBtn;
    const origDl = dlBtn ? dlBtn.innerHTML : '';
    const origSh = shBtn ? shBtn.innerHTML : '';

    const W      = plat.w;
    const H      = plat.h;
    const FRAMES = 24;
    const DELAY  = Math.round((DS.dur * 1000) / FRAMES);
    const color  = '#00E5FF';

    if (dlBtn) dlBtn.disabled = true;
    if (shBtn) shBtn.disabled = true;
    _setProgress(btn, 0, 'Starting…', color);

    try {
      await _preloadFonts(DS);
      await _loadGIF();

      const theme = themes[DS.bgColor] || themes['#07060E'];

      const off = document.createElement('canvas');
      off.width  = W;
      off.height = H;
      const oc   = off.getContext('2d');

      const gif = new GIF({
        workers: 4,
        quality: 2,
        width:   W,
        height:  H,
        workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
        dither: 'FloydSteinberg',
        globalPalette: false,
      });

      for (let i = 0; i < FRAMES; i++) {
        _setProgress(btn, Math.round((i / FRAMES) * 72), 'Frame ' + (i + 1) + '/' + FRAMES, color);
        oc.clearRect(0, 0, W, H);
        _drawDuetFrame(oc, W, H, i / FRAMES, DS, theme);
        gif.addFrame(off, { copy: true, delay: DELAY });
        await new Promise(r => setTimeout(r, 0));
      }

      gif.on('progress', p =>
        _setProgress(btn, Math.round(72 + p * 26), 'Encoding ' + Math.round(72 + p * 26) + '%', color)
      );

      gif.on('finished', async blob => {
        _setProgress(btn, 100, '✓ Done!', color);
        const song  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
          .replace(/\s+/g, '-').toLowerCase();
        const fname = 'margo-duet-' + song + '-' + plat.id + '.gif';
        if (action === 'share' && navigator.share) {
          try {
            await navigator.share({ files: [new File([blob], fname, { type: 'image/gif' })], title: 'Margo Duet', text: 'trymargo.com' });
          } catch (_) { _dl(blob, fname); }
        } else {
          _dl(blob, fname);
        }
        if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
        if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
        if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      });

      gif.render();

    } catch (err) {
      console.error('[duet-export] GIF error:', err);
      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    }
  }

  /* ════════════════════════════════════════
     POSTER EXPORT
  ════════════════════════════════════════ */

  async function exportPoster(plat, action) {
    const DS     = window._DS;
    const themes = window._DSThemes;

    const dlBtn  = document.getElementById('dsBtnDownload');
    const shBtn  = document.getElementById('dsBtnShare');
    const btn    = action === 'download' ? dlBtn : shBtn;
    const origDl = dlBtn ? dlBtn.innerHTML : '';
    const origSh = shBtn ? shBtn.innerHTML : '';

    const W     = plat.w;
    const H     = plat.h;
    const color = '#E8C547';

    if (dlBtn) dlBtn.disabled = true;
    if (shBtn) shBtn.disabled = true;
    _setProgress(btn, 0, 'Preparing…', color);

    try {
      await _preloadFonts(DS);
      _setProgress(btn, 30, 'Rendering…', color);

      const theme = themes[DS.bgColor] || themes['#07060E'];

      const off = document.createElement('canvas');
      off.width  = W;
      off.height = H;
      const oc   = off.getContext('2d');

      /* t01 = 0.5 so everything is fully visible (mid-animation = fully shown) */
      _drawDuetFrame(oc, W, H, 0.5, DS, theme);

      _setProgress(btn, 85, 'Saving…', color);

      const song  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g, '-').toLowerCase();
      const fname = 'margo-poster-' + song + '-' + plat.id + '.png';

      off.toBlob(async blob => {
        if (!blob) return;
        _setProgress(btn, 100, '✓ Done!', color);
        if (action === 'share' && navigator.share) {
          try {
            await navigator.share({ files: [new File([blob], fname, { type: 'image/png' })], title: 'Margo Poster', text: 'trymargo.com' });
          } catch (_) { _dl(blob, fname); }
        } else {
          _dl(blob, fname);
        }
        if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
        if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
        if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      }, 'image/png', 0.95);

    } catch (err) {
      console.error('[duet-export] Poster error:', err);
      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    }
  }

  /* ════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════ */

  _ready(function () {
    window._duetExport = {
      gif:    exportGif,
      poster: exportPoster,
    };
  });

})();
