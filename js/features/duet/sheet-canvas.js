function _buildOpts() {
  return {
    format:     DS.format,
    theme:      DS.theme,
    cardStyle:  DS.cardStyle,
    fontFamily: DS.fontFamily,
    fontItalic: DS.fontItalic,
    motion:     DS.motion,
  };
}

/* ══════════════════════════════════════════════════════════
   BUILT-IN FALLBACK CANVAS RENDERER
══════════════════════════════════════════════════════════ */
function _fallbackDraw(ctx, W, H, t, p1, p2, opts) {
  if (!p1 || !p2) return;
  const m      = DS_THEMES[opts.theme] || DS_THEMES.gold;
  const pVibe  = DS_VIBE[p1.emotion] || m.l;
  const eVibe  = DS_VIBE[p2.emotion] || m.r;
  const isAnim = opts.format === 'gif';

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, m.bg);
  bg.addColorStop(1, _mix(m.bg, '#000', 0.4));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.save(); ctx.globalAlpha = 0.18;
  const g1 = ctx.createRadialGradient(W*.2, H*.22, 0, W*.2, H*.22, W*.6);
  g1.addColorStop(0, pVibe); g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  const eBlend = isAnim ? Math.min(1, Math.max(0, (t-0.38)/0.35)) : 1;
  ctx.globalAlpha = 0.18 * eBlend;
  const g2 = ctx.createRadialGradient(W*.8, H*.78, 0, W*.8, H*.78, W*.6);
  g2.addColorStop(0, eVibe); g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  _applyCardStyle(ctx, W, H, opts.cardStyle, m, pVibe, eVibe);

  const pad  = W * 0.065;
  const divY = H * 0.490;

  const mSz = Math.max(12, W * 0.038);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = m.accent; ctx.globalAlpha = 0.22;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.55);
  ctx.restore();

  ctx.save(); ctx.globalAlpha = 0.7;
  const tbar = ctx.createLinearGradient(0, 0, W, 0);
  tbar.addColorStop(0,'transparent'); tbar.addColorStop(0.5, pVibe); tbar.addColorStop(1,'transparent');
  ctx.fillStyle = tbar; ctx.fillRect(0, 0, W, 2);
  ctx.restore();

  const topT = pad + mSz * 1.7;
  const topB = divY - W * 0.055;
  const botT = divY + W * 0.055;
  const botB = H * 0.830;

  const e1 = isAnim ? Math.min(1, t / 0.28) : 1;
  const e2 = isAnim ? (t > 0.46 ? Math.min(1, (t-0.46)/0.28) : 0) : 1;

  ctx.save(); ctx.globalAlpha = e1;
  _drawZone(ctx, W, topT, topB, p1, m, pad, opts);
  ctx.restore();

  const dAlpha = isAnim ? Math.min(1, Math.max(0, (t-0.38)/0.12)) : 1;
  _drawDivider(ctx, W, divY, p2, m, dAlpha);

  ctx.save(); ctx.globalAlpha = e2;
  _drawZone(ctx, W, botT, botB, p2, m, pad, opts);
  ctx.restore();

  _drawSongsBar(ctx, W, H * 0.842, H * 0.918, p1, p2, m, pad);
  _drawWatermark(ctx, W, H, m);
  _drawMmark(ctx, W, H, m);
}

function _applyCardStyle(ctx, W, H, style, m, pV, eV) {
  ctx.save();
  switch (style) {
    case 'contrast':
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.45; ctx.fillRect(0,0,W,H); break;
    case 'mesh': {
      const mg = ctx.createLinearGradient(0,0,W,H);
      mg.addColorStop(0, pV+'44'); mg.addColorStop(0.5, m.bg); mg.addColorStop(1, eV+'44');
      ctx.fillStyle = mg; ctx.globalAlpha = 0.5; ctx.fillRect(0,0,W,H); break;
    }
    case 'grain':
      ctx.globalAlpha = 0.022;
      for (let y=0; y<H; y+=3) for (let x=0; x<W; x+=3) {
        const v = Math.random()*255|0;
        ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x,y,3,3);
      }
      break;
    case 'neon': {
      ctx.globalAlpha = 0.12;
      const ng = ctx.createLinearGradient(0,0,0,H);
      ng.addColorStop(0, m.accent+'88'); ng.addColorStop(1,'transparent');
      ctx.fillStyle = ng; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = 0.4; ctx.strokeStyle = m.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W*0.03, H*0.03, W*0.94, H*0.94);
      break;
    }
    case 'depth': {
      const dg = ctx.createRadialGradient(W/2,H/2,0, W/2,H/2,W*.7);
      dg.addColorStop(0,'rgba(0,0,0,0)'); dg.addColorStop(1,'rgba(0,0,0,0.6)');
      ctx.fillStyle = dg; ctx.globalAlpha = 1; ctx.fillRect(0,0,W,H);
      break;
    }
    case 'glass':
    default:
      ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.globalAlpha = 1; ctx.fillRect(0,0,W,H);
      break;
  }
  ctx.restore();
}

function _drawZone(ctx, W, zT, zB, post, m, pad, opts) {
  const zH   = zB - zT;
  const text = (post.text || post.lyric || '').substring(0, 120);
  const fs0  = Math.min(W * 0.052, zH * 0.28);
  const fstyle = opts.fontItalic ? 'italic 600' : '600';
  const ff   = `'${opts.fontFamily}',serif`;
  ctx.font = `${fstyle} ${fs0}px ${ff}`;
  let lines  = _wrapText(ctx, text, W - pad * 2.2);
  let fs     = fs0;
  if (lines.length > 4) {
    fs = Math.max(W*0.026, fs0 * 4/lines.length);
    ctx.font = `${fstyle} ${fs}px ${ff}`;
    lines = _wrapText(ctx, text, W - pad * 2.2);
  }
  const lh     = fs * 1.46;
  const blockH = lines.length * lh;
  const startY = Math.max(zT, zT + (zH - blockH)/2 - fs*0.1);

  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  lines.forEach((ln, i) => ctx.fillText(ln, pad * 1.15, startY + i*lh));
  ctx.shadowBlur = 0;

  const pk   = post.knowledge || {};
  const song = pk.song || post.song || '';
  if (song) {
    const afs = Math.max(8, W * 0.017);
    ctx.font = `700 ${afs}px 'Space Mono',monospace`;
    ctx.fillStyle = DS_VIBE[post.emotion] || m.accent;
    ctx.globalAlpha = 0.52; ctx.textBaseline = 'bottom';
    let str = song + ((pk.artist||post.artist) ? ' — '+(pk.artist||post.artist) : '');
    while (ctx.measureText(str).width > W - pad*2.2 && str.length > 4) str = str.slice(0,-4)+'…';
    ctx.fillText(str, pad*1.15, Math.min(zB - W*0.008, zB - 3));
  }
  ctx.restore();
}

function _drawDivider(ctx, W, divY, echoPost, m, alpha) {
  if (alpha <= 0) return;
  const user  = '@' + (echoPost.username||'anonymous').replace(/^@/,'').toUpperCase();
  const dText = `LYRIC BACK ↩  ${user}`;
  const dfs   = Math.max(9, W * 0.020);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${dfs}px 'Syne','Arial Black',sans-serif`;
  const dTW  = ctx.measureText(dText).width;
  const pH   = dfs * 2.1, pPad = W * 0.026;
  const pW   = dTW + pPad * 2;
  const pX   = W/2 - pW/2, pY = divY - pH/2, pR = pH/2;
  const gap  = pW/2 + W*0.018;

  [[W*0.04, W/2-gap],[W/2+gap, W*0.96]].forEach(([x1,x2]) => {
    const lg = ctx.createLinearGradient(x1,0,x2,0);
    if (x1 < W/2) { lg.addColorStop(0,'transparent'); lg.addColorStop(1, m.accent+'44'); }
    else           { lg.addColorStop(0, m.accent+'44'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1, divY-0.75, x2-x1, 1.5);
  });

  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.fillStyle = m.light ? 'rgba(0,0,0,0.07)' : 'rgba(232,197,71,0.09)'; ctx.fill();
  ctx.strokeStyle = m.accent+'55'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `800 ${dfs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = m.accent; ctx.globalAlpha = alpha;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(dText, W/2, divY);
  ctx.restore();
}

function _drawSongsBar(ctx, W, barT, barB, p1, p2, m, pad) {
  const bH = barB - barT;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pad*0.75, barT, W-pad*1.5, bH, W*0.016);
  else ctx.rect(pad*0.75, barT, W-pad*1.5, bH);
  ctx.fill(); ctx.stroke();

  const cy  = barT + bH/2;
  const lfs = Math.max(8, W*0.019);
  const sfs = Math.max(8, W*0.021);
  const afs = Math.max(7, W*0.014);

  ctx.font = `800 ${lfs}px 'Syne',sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('SONGS', pad, cy);

  const pk1 = p1.knowledge||{}, s1 = (pk1.song||p1.song||'').substring(0,18);
  const pk2 = p2.knowledge||{}, s2 = (pk2.song||p2.song||'').substring(0,18);

  ctx.font = `700 ${sfs}px 'DM Sans',sans-serif`; ctx.fillStyle='#fff'; ctx.textAlign='left';
  ctx.fillText(s1, W*0.26, cy - afs*0.5);
  ctx.font = `400 ${afs}px 'Space Mono',monospace`; ctx.fillStyle='rgba(255,255,255,0.38)';
  ctx.fillText(pk1.artist||p1.artist||'', W*0.26, cy + sfs*0.55);

  ctx.font = `400 ${sfs*1.1}px sans-serif`; ctx.fillStyle=m.accent; ctx.globalAlpha=0.65; ctx.textAlign='center';
  ctx.fillText('↔', W/2, cy); ctx.globalAlpha=1;

  ctx.font = `700 ${sfs}px 'DM Sans',sans-serif`; ctx.fillStyle='#fff'; ctx.textAlign='right';
  ctx.fillText(s2, W-pad, cy - afs*0.5);
  ctx.font = `400 ${afs}px 'Space Mono',monospace`; ctx.fillStyle='rgba(255,255,255,0.38)';
  ctx.fillText(pk2.artist||p2.artist||'', W-pad, cy + sfs*0.55);
  ctx.restore();
}

function _drawWatermark(ctx, W, H, m) {
  const fs  = Math.max(8, W*0.016);
  const txt = 'trymargo.com';
  ctx.save();
  ctx.font = `700 ${fs}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const tw = ctx.measureText(txt).width;
  const pw = tw + W*0.040, ph = fs*1.85;
  const px = W/2 - pw/2, py = H - W*0.034 - ph/2;
  ctx.globalAlpha = 0.78; ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px,py,pw,ph,ph/2); else ctx.rect(px,py,pw,ph);
  ctx.fill();
  ctx.globalAlpha = 0.50; ctx.strokeStyle = m.accent; ctx.lineWidth = 1;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px,py,pw,ph,ph/2); else ctx.rect(px,py,pw,ph);
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
  ctx.fillText(txt, W/2, py+ph/2);
  ctx.restore();
}

function _drawMmark(ctx, W, H, m) {
  const sz = Math.round(Math.min(W,H)*0.068);
  const bx = W - W*0.034 - sz, by = H - H*0.032 - sz;
  const cx = bx+sz/2, cy = by+sz/2, r = sz/2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = m.accent; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=14;
  ctx.fill(); ctx.shadowBlur=0;
  const s=sz*0.58, mx=cx-s/2, my=cy-s/2;
  ctx.strokeStyle = m.light ? '#ffffff' : '#0B0B0D';
  ctx.lineWidth=sz*0.10; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(mx, my+s*0.78); ctx.lineTo(mx, my+s*0.13);
  ctx.lineTo(mx+s*0.35, my+s*0.60); ctx.lineTo(mx+s*0.50, my+s*0.06);
  ctx.lineTo(mx+s*0.65, my+s*0.60); ctx.lineTo(mx+s, my+s*0.13);
  ctx.lineTo(mx+s, my+s*0.78); ctx.stroke();
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   DOWNLOAD — THE MAIN FIX
   Checks DS.view first:
   • 'convo' → renders the conversation layout to offscreen canvas
   • 'card'  → uses the existing rich card renderers
══════════════════════════════════════════════════════════ */
