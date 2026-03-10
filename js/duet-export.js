/* ============================================================
   MARGO — js/duet-export.js  v4.0
   Pure canvas export — NO html2canvas, NO DOM screenshots.
   Mirrors gif-studio.js exactly: every pixel drawn with ctx calls.
   Reads from duet-sheet.js via:
     window._DS        — state (motion, dur, bgColor, fontFamily)
     window._DSThemes  — theme map
   ============================================================ */

(function () {

/* ── Font stacks (mirrors duet-sheet.js fStack) ── */
function fStack(f) {
  return {
    'DM Serif Display': "'DM Serif Display',serif",
    'Playfair Display': "'Playfair Display',serif",
    'Space Mono':       "'Space Mono',monospace",
    'DM Sans':          "'DM Sans',sans-serif",
    'Georgia':          'Georgia,serif',
  }[f] || ("'" + f + "',sans-serif");
}
function isItalic(f) {
  return ['DM Serif Display','Playfair Display','Georgia'].includes(f);
}

/* ── Word wrap (mirrors gsWrap) ── */
function wrap(ctx, text, cx, cy, maxW, lineH) {
  const words = String(text || '').split(' ');
  let line = '', lines = [];
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
    else line = t;
  });
  if (line.trim()) lines.push(line.trim());
  const startY = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
  return lines.length;
}

/* ── Rounded rect helper ── */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/* ── Animation easing ── */
function ease(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

/* ════════════════════════════════════════════════════════
   MAIN FRAME DRAW
   W, H  — canvas dimensions
   t     — animation progress 0..1
   DS    — state from window._DS
   theme — theme object from window._DSThemes
   ════════════════════════════════════════════════════════ */
function drawDuetFrame(ctx, W, H, t, DS, theme) {
  const mot     = DS.motion  || 'fade-up';
  const ff      = DS.fontFamily || 'DM Serif Display';
  const italic  = isItalic(ff);
  const parent  = DS.parentPost || {};
  const echo    = DS.echoPost   || {};
  const light   = !!theme.light;
  const bodyTxt = light ? '#0B0B0D' : '#ffffff';
  const mutedTxt= light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';

  const scale = W / 600;   // design baseline 600px
  const q = v => Math.round(v);

  /* ── 1. BACKGROUND ── */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   theme.g1);
  bg.addColorStop(1,   theme.g2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* soft radial glows */
  const g1 = ctx.createRadialGradient(W*0.2, H*0.25, 0, W*0.2, H*0.25, W*0.55);
  g1.addColorStop(0, theme.glow1 || 'rgba(232,197,71,0.18)');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W*0.8, H*0.75, 0, W*0.8, H*0.75, W*0.5);
  g2.addColorStop(0, theme.glow2 || 'rgba(107,140,255,0.14)');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  /* top/bottom accent lines */
  const lL = ctx.createLinearGradient(0, 0, W, 0);
  lL.addColorStop(0, 'transparent');
  lL.addColorStop(0.4, (theme.l || theme.acc) + '73');
  lL.addColorStop(1, 'transparent');
  ctx.fillStyle = lL; ctx.globalAlpha = 0.45;
  ctx.fillRect(0, 0, W, 2 * scale);

  const lR = ctx.createLinearGradient(0, 0, W, 0);
  lR.addColorStop(0, 'transparent');
  lR.addColorStop(0.6, (theme.r || theme.acc) + '73');
  lR.addColorStop(1, 'transparent');
  ctx.fillStyle = lR; ctx.globalAlpha = 0.35;
  ctx.fillRect(0, H - 2*scale, W, 2*scale);
  ctx.globalAlpha = 1;

  /* ── 2. ANIMATION STATE ── */
  /* We offset each element so they animate at different phases,
     same technique as gsFadeUp/gsSlideIn etc in gif-studio.js */
  function animState(delay) {
    // shift t by delay, clamp to 0..1
    const t2 = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    return t2;
  }

  function applyMotion(ctx, mot, ta, W, H, slotCX, slotCY) {
    /* Returns {ox, oy, alpha, scaleX, scaleY} for the given animation */
    const e = ease(ta);
    switch(mot) {
      case 'fade-up':
        return { ox:0, oy:(1-e)*22*scale, alpha: Math.min(1, e*2.2), sx:1, sy:1 };
      case 'slide-in':
        return { ox:(1-ease(Math.min(1,ta/0.7)))*W*0.35, oy:0, alpha: Math.min(1, ta*2), sx:1, sy:1 };
      case 'pulse': {
        const p = 0.94 + 0.06*Math.sin(t*Math.PI*2);
        return { ox:0, oy:0, alpha:1, sx:p, sy:p };
      }
      case 'glitch': {
        const phase = Math.floor(t*9);
        const isG = phase%3===0 && t<0.85;
        return { ox: isG?((phase*7919)%11-5)*scale:0, oy:0, alpha:1, sx:1, sy:1 };
      }
      case 'wave':
        return { ox:0, oy:Math.sin(t*Math.PI*2+ta*3)*6*scale, alpha:1, sx:1, sy:1 };
      case 'bounce': {
        const b = ta<0.5 ? 4*ta*ta*ta : 1-Math.pow(-2*ta+2,3)/2;
        return { ox:0, oy:(1-b)*H*0.12, alpha:1, sx:1, sy: 0.88+b*0.12 };
      }
      case 'shimmer':
        return { ox:0, oy:0, alpha:1, sx:1, sy:1, shimmer:true };
      case 'typewriter':
        return { ox:0, oy:0, alpha:1, sx:1, sy:1, typewriter:true };
      default:
        return { ox:0, oy:(1-e)*22*scale, alpha: Math.min(1, e*2.2), sx:1, sy:1 };
    }
  }

  /* ── 3. LAYOUT CONSTANTS ── */
  const pad    = q(W * 0.052);
  const innerW = W - pad*2;
  const colL   = theme.l || theme.acc;
  const colR   = theme.r || theme.acc;

  /* Vertical layout: header | bubble-left | divider | bubble-right | songs | watermark */
  const headerH  = q(H * 0.072);
  const songsH   = q(H * 0.072);
  const wmH      = q(H * 0.044);
  const divH     = q(H * 0.060);
  const bubbleArea = H - headerH - songsH - wmH - divH - pad*2;
  const bubbleH  = q(bubbleArea * 0.47);

  let curY = pad;

  /* ── 4. HEADER — MARGO logo + ghost M icon ── */
  {
    const mFs = q(W * 0.038);
    ctx.save();
    ctx.font = `800 ${mFs}px 'Syne','DM Sans',sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = light ? '#0B0B0D' : theme.acc;
    ctx.fillText('MARGO', pad, curY);
    ctx.restore();

    /* ghost M circle top-right */
    const msz = q(W * 0.056);
    const mx = W - pad - msz/2;
    const my = curY + msz/2;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = light ? 'rgba(0,0,0,0.12)' : theme.acc;
    ctx.beginPath(); ctx.arc(mx, my, msz/2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = light ? '#ffffff' : '#0B0B0D';
    ctx.lineWidth = 2.2*scale;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ic = msz*0.52;
    const ix = mx - ic/2, iy = my - ic/2;
    ctx.beginPath();
    ctx.moveTo(ix,        iy+ic*0.7);
    ctx.lineTo(ix,        iy+ic*0.2);
    ctx.lineTo(ix+ic*0.4, iy+ic*0.55);
    ctx.lineTo(ix+ic*0.5, iy+ic*0.15);
    ctx.lineTo(ix+ic*0.6, iy+ic*0.55);
    ctx.lineTo(ix+ic,     iy+ic*0.2);
    ctx.lineTo(ix+ic,     iy+ic*0.7);
    ctx.stroke();
    ctx.restore();

    curY += headerH;
  }

  /* ── 5. HELPER: draw a bubble card ── */
  function drawBubble(side, post, yTop, height, tAnim, delay) {
    const col  = side==='left' ? colL : colR;
    const pk   = post.knowledge || {};
    const song   = pk.song   || post.song   || '';
    const artist = pk.artist || post.artist || '';
    const lyric  = post.lyric || post.text  || '';
    const emotion= post.emotion || '';
    const username = (post.username || 'anonymous').toUpperCase();
    const bW = q(innerW * 0.88);
    const bX = side==='left' ? pad : W - pad - bW;

    const st = animState(delay);
    const am = applyMotion(ctx, mot, st, W, H, bX+bW/2, yTop+height/2);

    ctx.save();
    ctx.globalAlpha = am.alpha;
    const cx = bX + bW/2, cy = yTop + height/2;
    ctx.translate(cx + am.ox, cy + am.oy);
    ctx.scale(am.sx, am.sy);
    const drawX = -bW/2, drawY = -height/2;

    /* bubble bg */
    const r = q(bW * 0.042);
    roundRect(ctx, drawX, drawY, bW, height, r);
    ctx.fillStyle = col + '22';
    ctx.fill();
    ctx.strokeStyle = col + '55';
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();

    /* inner glow */
    const ig = ctx.createRadialGradient(
      drawX + (side==='left'?0:bW), drawY,     0,
      drawX + (side==='left'?0:bW), drawY+height, bW*0.8
    );
    ig.addColorStop(0, col + '20');
    ig.addColorStop(1, 'transparent');
    ctx.fillStyle = ig; ctx.fill();

    /* username row */
    const uFs = q(bW * 0.048);
    ctx.font = `800 ${uFs}px 'Syne','DM Sans',sans-serif`;
    ctx.textAlign = side==='left' ? 'left' : 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = col;
    ctx.shadowBlur = 0;
    const dotR = q(uFs * 0.32);
    const uY = drawY + q(height*0.045);
    if(side==='left') {
      ctx.beginPath(); ctx.arc(drawX + dotR*2, uY + uFs/2, dotR, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = col;
      ctx.fillText('@'+username, drawX + dotR*5, uY);
    } else {
      ctx.fillText('@'+username, drawX+bW - dotR*5, uY);
      ctx.beginPath(); ctx.arc(drawX+bW - dotR*2, uY + uFs/2, dotR, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
    }

    /* lyric text */
    const lFs = q(bW * 0.076);
    const lyricY = drawY + q(height * 0.18);
    const lyricMaxW = bW * 0.84;
    const lyricLineH = lFs * 1.42;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    if(mot === 'shimmer') {
      /* base */
      ctx.fillStyle = bodyTxt;
      ctx.font = `${italic?'italic ':''}600 ${lFs}px ${fStack(ff)}`;
      wrap(ctx, lyric, drawX + bW*0.08, lyricY, lyricMaxW, lyricLineH);
      /* shimmer overlay */
      const sx = (t * (bW + 120*scale)) - 60*scale + drawX;
      const sh = ctx.createLinearGradient(sx-60*scale, 0, sx+60*scale, 0);
      sh.addColorStop(0,   'transparent');
      sh.addColorStop(0.4, theme.acc);
      sh.addColorStop(0.6, '#ffffff');
      sh.addColorStop(1,   'transparent');
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = sh;
      ctx.font = `${italic?'italic ':''}600 ${lFs}px ${fStack(ff)}`;
      wrap(ctx, lyric, drawX + bW*0.08, lyricY, lyricMaxW, lyricLineH);
      ctx.restore();
    } else if(mot === 'typewriter') {
      const chars = Math.floor(st * (lyric.length + 4));
      const vis = lyric.substring(0, Math.min(chars, lyric.length));
      const cur = chars <= lyric.length && (Math.floor(t*10)%2===0) ? '|' : '';
      ctx.fillStyle = bodyTxt;
      ctx.font = `${italic?'italic ':''}600 ${lFs}px ${fStack(ff)}`;
      wrap(ctx, vis+cur, drawX + bW*0.08, lyricY, lyricMaxW, lyricLineH);
    } else {
      ctx.fillStyle = bodyTxt;
      ctx.font = `${italic?'italic ':''}600 ${lFs}px ${fStack(ff)}`;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur  = 8*scale;
      wrap(ctx, lyric, drawX + bW*0.08, lyricY, lyricMaxW, lyricLineH);
      ctx.shadowBlur = 0;
    }

    /* divider line */
    const divLineY = drawY + height*0.70;
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = Math.max(1, scale*0.8);
    ctx.beginPath();
    ctx.moveTo(drawX + bW*0.05, divLineY);
    ctx.lineTo(drawX + bW*0.95, divLineY);
    ctx.stroke();

    /* song + artist */
    const sFs = q(bW * 0.052);
    const aFs = q(bW * 0.036);
    const metaY = divLineY + q(height*0.035);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${sFs}px 'DM Sans',sans-serif`;
    ctx.fillStyle = bodyTxt;
    ctx.fillText(song.substring(0,28), drawX + bW*0.05, metaY);
    ctx.font = `400 ${aFs}px 'Space Mono',monospace`;
    ctx.fillStyle = mutedTxt;
    ctx.fillText(artist.substring(0,32), drawX + bW*0.05, metaY + sFs*1.15);

    /* emotion pill */
    if(emotion) {
      const eFs = q(bW*0.034);
      ctx.font = `800 ${eFs}px 'Syne','DM Sans',sans-serif`;
      const eTw = ctx.measureText(emotion).width;
      const ePadX = eFs*0.7, ePadY = eFs*0.35;
      const ePW = eTw + ePadX*2, ePH = eFs + ePadY*2;
      const ePX = drawX+bW*0.95 - ePW;
      const ePY = metaY + (sFs*1.15+aFs)/2 - ePH/2;
      roundRect(ctx, ePX, ePY, ePW, ePH, ePH/2);
      ctx.fillStyle = col + '25'; ctx.fill();
      ctx.strokeStyle = col + '55'; ctx.lineWidth = scale; ctx.stroke();
      ctx.fillStyle = col;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(emotion.substring(0,14), ePX+ePW/2, ePY+ePH/2);
    }

    ctx.restore();
  }

  /* ── 6. DRAW LEFT BUBBLE (parent post) ── */
  drawBubble('left', parent, curY, bubbleH, t, 0.05);
  curY += bubbleH;

  /* ── 7. LYRIC BACK DIVIDER ── */
  {
    const eUser = (echo.username || 'anonymous').toUpperCase();
    const st = animState(0.3);
    const am = applyMotion(ctx, mot, st, W, H, W/2, curY+divH/2);
    ctx.save();
    ctx.globalAlpha = am.alpha;
    ctx.translate(am.ox, am.oy);

    const lineY = q(curY + divH/2);
    const aRgba = light ? 'rgba(0,0,0,0.22)' : 'rgba(232,197,71,0.28)';

    /* left line */
    const lineGL = ctx.createLinearGradient(pad, 0, W*0.3, 0);
    lineGL.addColorStop(0, 'transparent');
    lineGL.addColorStop(1, aRgba);
    ctx.strokeStyle = lineGL;
    ctx.lineWidth = scale;
    ctx.beginPath(); ctx.moveTo(pad, lineY); ctx.lineTo(W*0.3, lineY); ctx.stroke();

    /* pill */
    const pFs = q(W * 0.026);
    const pillTxt = 'LYRIC BACK ↩ @' + eUser;
    ctx.font = `800 ${pFs}px 'Syne','DM Sans',sans-serif`;
    const ptW = ctx.measureText(pillTxt).width;
    const ppX = q(W*0.305), ppPadX = pFs*0.7, ppPadY = pFs*0.45;
    const ppW = ptW + ppPadX*2, ppH = pFs + ppPadY*2;
    const ppY = lineY - ppH/2;
    roundRect(ctx, ppX, ppY, ppW, ppH, ppH/2);
    ctx.fillStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(232,197,71,0.09)';
    ctx.fill();
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.18)' : 'rgba(232,197,71,0.28)';
    ctx.lineWidth = scale; ctx.stroke();
    ctx.fillStyle = light ? '#0B0B0D' : theme.acc;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(pillTxt, ppX+ppPadX, lineY);

    /* right line */
    const rightStart = ppX + ppW + W*0.01;
    const lineGR = ctx.createLinearGradient(rightStart, 0, W-pad, 0);
    lineGR.addColorStop(0, aRgba);
    lineGR.addColorStop(1, 'transparent');
    ctx.strokeStyle = lineGR;
    ctx.lineWidth = scale;
    ctx.beginPath(); ctx.moveTo(rightStart, lineY); ctx.lineTo(W-pad, lineY); ctx.stroke();

    ctx.restore();
    curY += divH;
  }

  /* ── 8. DRAW RIGHT BUBBLE (echo post) ── */
  drawBubble('right', echo, curY, bubbleH, t, 0.5);
  curY += bubbleH;

  /* ── 9. SONGS BAR ── */
  {
    const pk = parent.knowledge || {};
    const pS = pk.song||parent.song||'', pA = pk.artist||parent.artist||'';
    const eS = echo.song||'', eA = echo.artist||'';
    const barPad = q(W*0.034);
    const barY = curY + q((songsH - songsH*0.72)/2);
    const barH = q(songsH*0.72);

    roundRect(ctx, pad, barY, innerW, barH, q(innerW*0.018));
    ctx.fillStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = scale; ctx.stroke();

    const lFs2 = q(innerW*0.030);
    const sFs2 = q(innerW*0.034);
    const aFs2 = q(innerW*0.024);

    /* SONGS label */
    ctx.font = `800 ${lFs2}px 'Syne','DM Sans',sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
    ctx.fillText('SONGS', pad+barPad, barY+barH/2);

    /* parent song (left side of right section) */
    const rightSec = pad + innerW*0.36;
    ctx.font = `700 ${sFs2}px 'DM Sans',sans-serif`;
    ctx.fillStyle = light ? '#0B0B0D' : '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText((pS||'—').substring(0,18), rightSec, barY+barH*0.34);
    ctx.font = `400 ${aFs2}px 'Space Mono',monospace`;
    ctx.fillStyle = mutedTxt;
    ctx.fillText((pA||'').substring(0,22), rightSec, barY+barH*0.70);

    /* swap arrow */
    ctx.font = `${q(innerW*0.040)}px sans-serif`;
    ctx.fillStyle = theme.acc;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'center';
    ctx.fillText('↔', W/2, barY+barH/2+2);
    ctx.globalAlpha = 1;

    /* echo song (right) */
    const rightSec2 = W - pad - barPad;
    ctx.font = `700 ${sFs2}px 'DM Sans',sans-serif`;
    ctx.fillStyle = light ? '#0B0B0D' : '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText((eS||'—').substring(0,18), rightSec2, barY+barH*0.34);
    ctx.font = `400 ${aFs2}px 'Space Mono',monospace`;
    ctx.fillStyle = mutedTxt;
    ctx.fillText((eA||'').substring(0,22), rightSec2, barY+barH*0.70);

    curY += songsH;
  }

  /* ── 10. WATERMARK ── */
  {
    const text = 'trymargo.com';
    const fSize = q(W * 0.024);
    ctx.font = `700 ${fSize}px 'Space Mono',monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(text).width;
    const pX = fSize*1.0, pY = fSize*0.55;
    const pW = textW + pX*2, pH = fSize + pY*2;
    const pR = pH/2;
    const pillX = W/2 - pW/2;
    const pillY = curY + (wmH - pH)/2;
    roundRect(ctx, pillX, pillY, pW, pH, pR);
    ctx.fillStyle = light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.09)';
    ctx.fill();
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = scale; ctx.stroke();
    ctx.fillStyle = light ? '#0B0B0D' : '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(text, W/2, pillY + pH/2);
  }

  /* ── 11. MARGO M ICON (bottom-right) ── */
  {
    const sz = q(Math.min(W,H)*0.062);
    const mx = W - q(W*0.036) - sz/2;
    const my = H - q(H*0.034) - sz/2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur  = 10*scale;
    ctx.fillStyle   = theme.acc;
    ctx.beginPath(); ctx.arc(mx, my, sz/2, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = light ? '#ffffff' : '#0B0B0D';
    ctx.lineWidth   = 3.2*scale;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ic = sz*0.56;
    const ix = mx - ic/2, iy = my - ic/2;
    ctx.beginPath();
    ctx.moveTo(ix,        iy+ic*0.72);
    ctx.lineTo(ix,        iy+ic*0.18);
    ctx.lineTo(ix+ic*0.38,iy+ic*0.54);
    ctx.lineTo(ix+ic*0.5, iy+ic*0.12);
    ctx.lineTo(ix+ic*0.62,iy+ic*0.54);
    ctx.lineTo(ix+ic,     iy+ic*0.18);
    ctx.lineTo(ix+ic,     iy+ic*0.72);
    ctx.stroke();
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════
   PREVIEW LOOP
   Runs on the conversation view canvas (dsPreviewCanvas)
   Mirrors gsStartPreview from gif-studio.js exactly
   ════════════════════════════════════════════════════════ */
const PREVIEW = {
  _frame: 0, _last: 0, _raf: null, _size: 0,
  _frames: 24, _delay: 70,
};

function _startPreview() {
  _stopPreview();
  PREVIEW._frame = 0; PREVIEW._last = 0; PREVIEW._size = 0;

  const loop = (ts) => {
    const DS     = window._DS;
    const themes = window._DSThemes;
    if (!DS || !themes) { PREVIEW._raf = requestAnimationFrame(loop); return; }

    const delay  = Math.round((DS.dur * 1000) / 24);
    const frames = 24;

    if (ts - PREVIEW._last >= delay) {
      PREVIEW._last = ts;

      const canvas = document.getElementById('dsConvoPreviewCanvas');
      if (canvas) {
        const theme  = themes[DS.bgColor] || themes['#07060E'];
        const stage  = canvas.parentElement;
        const dpr    = window.devicePixelRatio || 1;
        const size   = Math.min(stage ? stage.clientWidth - 4 : 340, 400);

        /* Only resize when size changed — eliminates jitter (same fix as gif-studio.js) */
        if (size !== PREVIEW._size) {
          PREVIEW._size = size;
          canvas.style.width  = size + 'px';
          canvas.style.height = size + 'px';
          canvas.width  = Math.round(size * dpr);
          canvas.height = Math.round(size * dpr);
        }

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawDuetFrame(ctx, size, size, PREVIEW._frame / frames, DS, theme);
        PREVIEW._frame = (PREVIEW._frame + 1) % frames;
      }
    }
    PREVIEW._raf = requestAnimationFrame(loop);
  };
  PREVIEW._raf = requestAnimationFrame(loop);
}

function _stopPreview() {
  if (PREVIEW._raf) { cancelAnimationFrame(PREVIEW._raf); PREVIEW._raf = null; }
}

/* ════════════════════════════════════════════════════════
   GIF EXPORT
   Mirrors gsExport from gif-studio.js exactly
   ════════════════════════════════════════════════════════ */
async function _exportGif(plat, action) {
  const DS     = window._DS;
  const themes = window._DSThemes;
  if (!DS || !themes) return;

  _stopPreview();

  const dlBtn = document.getElementById('dsBtnDownload');
  const shBtn = document.getElementById('dsBtnShare');
  const btn   = action === 'download' ? dlBtn : shBtn;
  const origDl = dlBtn ? dlBtn.innerHTML : '';
  const origSh = shBtn ? shBtn.innerHTML : '';

  if (dlBtn) dlBtn.disabled = true;
  if (shBtn) shBtn.disabled = true;

  const W      = plat.w, H = plat.h;
  const FRAMES = 24;
  const DELAY  = Math.round((DS.dur * 1000) / FRAMES);
  const color  = '#00E5FF';

  function setProgress(pct, label) {
    if (!btn) return;
    const icon = btn.querySelector('.ds-export-icon');
    const lbl  = btn.querySelector('span:last-child');
    if (icon) icon.textContent = pct >= 100 ? '✓' : '◎';
    if (lbl)  lbl.textContent  = label;
    let bar = btn.querySelector('.ds-progress-bar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'ds-progress-bar'; btn.appendChild(bar); }
    bar.style.width      = pct + '%';
    bar.style.background = color;
  }

  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`700 1em 'DM Sans'`),
      document.fonts.load(`600 1em '${DS.fontFamily}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily}'`),
    ].map(p => p.catch(() => {})));

    if (typeof GIF === 'undefined') {
      await new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
    }

    const theme = themes[DS.bgColor] || themes['#07060E'];

    const gif = new GIF({
      workers: 4, quality: 1,
      width: W, height: H,
      workerScript: '/js/gif.worker.js',
      dither: false,
    });

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc  = off.getContext('2d');

    for (let i = 0; i < FRAMES; i++) {
      oc.clearRect(0, 0, W, H);
      drawDuetFrame(oc, W, H, i / FRAMES, DS, theme);
      gif.addFrame(off, { copy: true, delay: DELAY });
      setProgress(Math.round((i / FRAMES) * 72), `Frame ${i+1}/${FRAMES}`);
      await new Promise(r => setTimeout(r, 0));
    }

    gif.on('progress', p => setProgress(Math.round(72 + p * 26), `Encoding ${Math.round(72 + p * 26)}%`));

    gif.on('finished', async blob => {
      setProgress(100, '✓ Done!');
      const name = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g, '-').toLowerCase();
      const fname = `margo-duet-${name}-${plat.id}.gif`;

      if (action === 'share' && navigator.share) {
        try { await navigator.share({ files: [new File([blob], fname, { type: 'image/gif' })], title: 'Margo Duet', text: 'trymargo.com' }); }
        catch { _dl(blob, fname); }
      } else { _dl(blob, fname); }

      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      setTimeout(_startPreview, 400);
    });

    gif.render();

  } catch (err) {
    console.error('GIF error:', err);
    if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
    if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
    if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format || 'gif');
    _startPreview();
  }
}

/* ════════════════════════════════════════════════════════
   POSTER EXPORT
   Same canvas draw, single frame, still=true via t=0.99
   ════════════════════════════════════════════════════════ */
async function _exportPoster(plat, action) {
  const DS     = window._DS;
  const themes = window._DSThemes;
  if (!DS || !themes) return;

  _stopPreview();

  const dlBtn = document.getElementById('dsBtnDownload');
  const shBtn = document.getElementById('dsBtnShare');
  const btn   = action === 'download' ? dlBtn : shBtn;
  const origDl = dlBtn ? dlBtn.innerHTML : '';
  const origSh = shBtn ? shBtn.innerHTML : '';

  if (dlBtn) dlBtn.disabled = true;
  if (shBtn) shBtn.disabled = true;

  const W = plat.w, H = plat.h;
  const color = '#E8C547';

  function setProgress(pct, label) {
    if (!btn) return;
    const icon = btn.querySelector('.ds-export-icon');
    const lbl  = btn.querySelector('span:last-child');
    if (icon) icon.textContent = pct >= 100 ? '✓' : '◎';
    if (lbl)  lbl.textContent  = label;
    let bar = btn.querySelector('.ds-progress-bar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'ds-progress-bar'; btn.appendChild(bar); }
    bar.style.width      = pct + '%';
    bar.style.background = color;
  }

  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`700 1em 'DM Sans'`),
      document.fonts.load(`600 1em '${DS.fontFamily}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily}'`),
    ].map(p => p.catch(() => {})));

    setProgress(20, 'Rendering…');

    const theme = themes[DS.bgColor] || themes['#07060E'];
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc  = off.getContext('2d');

    /* Use t=1 so all elements are fully visible (eased to end state) */
    drawDuetFrame(oc, W, H, 1, DS, theme);

    setProgress(85, 'Saving…');

    off.toBlob(async blob => {
      if (!blob) return;
      setProgress(100, '✓ Done!');
      const name = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g, '-').toLowerCase();
      const fname = `margo-poster-${name}-${plat.id}.png`;

      if (action === 'share' && navigator.share) {
        try { await navigator.share({ files: [new File([blob], fname, { type: 'image/png' })], title: 'Margo Poster', text: 'trymargo.com' }); }
        catch { _dl(blob, fname); }
      } else { _dl(blob, fname); }

      if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
      if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      setTimeout(_startPreview, 400);
    }, 'image/png', 0.95);

  } catch (err) {
    console.error('Poster error:', err);
    if (dlBtn) { dlBtn.disabled = false; dlBtn.innerHTML = origDl; }
    if (shBtn) { shBtn.disabled = false; shBtn.innerHTML = origSh; }
    if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format || 'poster');
    _startPreview();
  }
}

function _dl(blob, fname) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = fname; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
}

/* ════════════════════════════════════════════════════════
   INJECT CANVAS INTO CONVO VIEW
   duet-sheet.js mounts the HTML — we add a canvas on top
   of dsConvoBubbles so the preview animates live
   ════════════════════════════════════════════════════════ */
function _injectConvoCanvas() {
  /* Wait for duet-sheet.js to mount */
  const check = setInterval(() => {
    const view = document.getElementById('dsViewConvo');
    if (!view) return;
    if (document.getElementById('dsConvoPreviewCanvas')) { clearInterval(check); return; }

    /* Insert canvas as the FIRST child of dsViewConvo so it sits above the HTML bubbles */
    const wrap = document.createElement('div');
    wrap.id = 'dsConvoCanvasWrap';
    wrap.style.cssText = 'padding:12px 18px 0;';

    const canvas = document.createElement('canvas');
    canvas.id = 'dsConvoPreviewCanvas';
    canvas.style.cssText = 'display:block;border-radius:16px;width:100%;background:#07060E';

    wrap.appendChild(canvas);

    /* Insert BEFORE the existing convo HTML (bubbles) */
    view.insertBefore(wrap, view.firstChild);

    clearInterval(check);
  }, 100);
}

/* ════════════════════════════════════════════════════════
   HOOK INTO openDuetSheet
   Called after duet-sheet.js sets DS.parentPost/echoPost
   ════════════════════════════════════════════════════════ */
const _origOpen = window.openDuetSheet;
window.openDuetSheet = function(parentPost, echoPost) {
  if (_origOpen) _origOpen(parentPost, echoPost);
  /* Small delay to let duet-sheet.js finish mounting */
  setTimeout(() => {
    _injectConvoCanvas();
    setTimeout(_startPreview, 200);
  }, 80);
};

const _origClose = window.closeDuetSheet;
window.closeDuetSheet = function() {
  _stopPreview();
  if (_origClose) _origClose();
};

/* ── Expose API to duet-sheet.js ── */
window._duetExport = {
  gif:    _exportGif,
  poster: _exportPoster,
  startPreview: _startPreview,
  stopPreview:  _stopPreview,
};

/* ── Auto-init if sheet already open ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _injectConvoCanvas);
} else {
  _injectConvoCanvas();
}

})();
