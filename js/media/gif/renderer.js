/* ============================================================
   MARGO — js/media/gif/duet-renderer.js  v2.0
   Full port from prototype v3 (margo-duet-export-prototype-v3.html)

   Card styles: glass · contrast · mesh · grain · neon · depth
   All 8 motion styles with real per-frame animation
   Color themes fully applied to background + glows
   MARGO ghost wordmark top-left (0.28 opacity)
   Solid M-mark circle bottom-right
   trymargo.com pill — always readable regardless of theme

   window.dsGifDrawFrame(ctx, W, H, t, motion, post1, post2, opts)
   window.dsGifExport(post1, post2, motion, dur, opts) → Promise<Blob>
   ============================================================ */

(function () {
'use strict';

/* ─────────────────────────────────────────────
   THEMES  (keyed by theme name, matches duet-sheet.js S.theme)
───────────────────────────────────────────── */
const THEMES = {
  gold:   {g1:'#0c0a04',g2:'#1a1306',acc:'#E8C547',glow1:'rgba(232,197,71,0.22)',glow2:'rgba(180,140,30,0.12)',l:'#FF6B9D',r:'#6B8CFF',light:false},
  violet: {g1:'#100020',g2:'#1c0730',acc:'#c77dff',glow1:'rgba(199,125,255,0.22)',glow2:'rgba(120,50,200,0.12)',l:'#ff71ce',r:'#05ffa1',light:false},
  ocean:  {g1:'#040f18',g2:'#071622',acc:'#00e5ff',glow1:'rgba(0,229,255,0.18)',glow2:'rgba(0,150,200,0.1)',l:'#00e5ff',r:'#0070ff',light:false},
  ember:  {g1:'#140505',g2:'#1e0a0a',acc:'#ff6b6b',glow1:'rgba(255,107,107,0.22)',glow2:'rgba(200,50,50,0.12)',l:'#ff6b6b',r:'#ffb347',light:false},
  forest: {g1:'#020d06',g2:'#05160a',acc:'#50fa7b',glow1:'rgba(80,250,123,0.18)',glow2:'rgba(40,180,80,0.1)',l:'#50fa7b',r:'#00e5c0',light:false},
  rose:   {g1:'#120708',g2:'#1c0c0f',acc:'#f4a4c0',glow1:'rgba(244,164,192,0.18)',glow2:'rgba(180,80,120,0.1)',l:'#f4a4c0',r:'#c084fc',light:false},
  mono:   {g1:'#000000',g2:'#0a0a0a',acc:'#E8C547',glow1:'rgba(255,255,255,0.08)',glow2:'rgba(200,200,200,0.04)',l:'#ffffff',r:'#aaaaaa',light:false},
  wave:   {g1:'#110317',g2:'#09140f',acc:'#05ffa1',glow1:'rgba(255,113,206,0.22)',glow2:'rgba(5,255,161,0.12)',l:'#ff71ce',r:'#05ffa1',light:false},
  white:  {g1:'#ffffff',g2:'#ece8e0',acc:'#0B0B0D',glow1:'rgba(0,0,0,0.06)',glow2:'rgba(0,0,0,0.04)',l:'#c0392b',r:'#1a6fbd',light:true},
};

function _theme(name) {
  return THEMES[name] || THEMES['gold'];
}

/* ─────────────────────────────────────────────
   EASING
───────────────────────────────────────────── */
function easeOut(t)    { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t)  { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

/* ─────────────────────────────────────────────
   WORD WRAP
───────────────────────────────────────────── */
function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ─────────────────────────────────────────────
   HEX → RGBA helper
───────────────────────────────────────────── */
function hexA(hex, a) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─────────────────────────────────────────────
   BACKGROUND — gradient + radial glows + noise + edge lines
   Matches prototype bgLayers()
───────────────────────────────────────────── */
function drawBg(ctx, W, H, th) {
  /* base gradient */
  const bg = ctx.createLinearGradient(0, 0, W * 0.7, H);
  bg.addColorStop(0, th.g1);
  bg.addColorStop(1, th.g2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* glow top-left */
  const g1 = ctx.createRadialGradient(W*.20, H*.25, 0, W*.20, H*.25, W*.65);
  g1.addColorStop(0, th.glow1);
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  /* glow bottom-right */
  const g2 = ctx.createRadialGradient(W*.80, H*.75, 0, W*.80, H*.75, W*.65);
  g2.addColorStop(0, th.glow2);
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  /* noise grain */
  ctx.save();
  ctx.globalAlpha = th.light ? 0.018 : 0.032;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
  ctx.restore();

  /* top edge line */
  const edgeL = th.light ? 'rgba(0,0,0,0.15)' : th.l;
  ctx.save();
  ctx.globalAlpha = 0.45;
  const tl = ctx.createLinearGradient(0, 0, W, 0);
  tl.addColorStop(0, 'transparent');
  tl.addColorStop(0.4, edgeL);
  tl.addColorStop(1, 'transparent');
  ctx.fillStyle = tl;
  ctx.fillRect(0, 0, W, 2);
  ctx.restore();

  /* bottom edge line */
  const edgeR = th.light ? 'rgba(0,0,0,0.1)' : th.r;
  ctx.save();
  ctx.globalAlpha = 0.35;
  const bl = ctx.createLinearGradient(0, 0, W, 0);
  bl.addColorStop(0, 'transparent');
  bl.addColorStop(0.6, edgeR);
  bl.addColorStop(1, 'transparent');
  ctx.fillStyle = bl;
  ctx.fillRect(0, H - 2, W, 2);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   MARGO GHOST WORDMARK — top-left, 0.28 opacity
   Matches prototype: Syne 800, letter-spacing 0.22em
───────────────────────────────────────────── */
function drawMargoWordmark(ctx, W, H, th) {
  const sz  = Math.max(14, Math.round(W * 0.034));
  const pad = Math.round(W * 0.048);
  ctx.save();
  ctx.font = `800 ${sz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle  = th.light ? '#0B0B0D' : th.acc;
  ctx.globalAlpha = 0.28;
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'left';
  /* letter-spacing simulation: draw char by char */
  const letters = 'MARGO'.split('');
  const spacing = sz * 0.22;
  let cx = pad;
  for (const ch of letters) {
    ctx.fillText(ch, cx, pad * 0.55);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────
   SOLID M-MARK CIRCLE — bottom-right
   Matches prototype mmark()
───────────────────────────────────────────── */
function drawMmark(ctx, W, H, th) {
  const sz = Math.round(Math.min(W, H) * 0.07);
  const bx = W - Math.round(W * 0.036) - sz;
  const by = H - Math.round(H * 0.034) - sz;
  const cx = bx + sz / 2;
  const cy = by + sz / 2;
  const r  = sz / 2;
  const ic = sz * 0.62;

  ctx.save();
  /* circle */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = th.acc;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur  = 18;
  ctx.fill();
  ctx.shadowBlur = 0;

  /* M path — matches SVG in prototype */
  const stroke = th.light ? '#ffffff' : '#0B0B0D';
  const s  = ic;
  const mx = cx - s / 2;
  const my = cy - s / 2;
  ctx.strokeStyle = stroke;
  ctx.lineWidth   = sz * 0.098;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(mx,          my + s * 0.78);
  ctx.lineTo(mx,          my + s * 0.13);
  ctx.lineTo(mx + s * 0.35, my + s * 0.60);
  ctx.lineTo(mx + s * 0.50, my + s * 0.06);
  ctx.lineTo(mx + s * 0.65, my + s * 0.60);
  ctx.lineTo(mx + s,      my + s * 0.13);
  ctx.lineTo(mx + s,      my + s * 0.78);
  ctx.stroke();
  ctx.restore();
}

/* ─────────────────────────────────────────────
   trymargo.com WATERMARK PILL — always readable
   Matches prototype watermarkPill()
───────────────────────────────────────────── */
function drawWatermark(ctx, W, H, th) {
  const fs   = Math.max(9, Math.round(W * 0.017));
  const light = th.light;
  ctx.save();
  ctx.font = `700 ${fs}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';
  const txt = 'trymargo.com';
  const tw  = ctx.measureText(txt).width;
  const pw  = tw + W * 0.044;
  const ph  = fs * 1.9;
  const px  = W / 2 - pw / 2;
  const py  = H - W * 0.038 - ph / 2;

  /* pill background */
  ctx.globalAlpha = light ? 0.25 : 0.22;
  ctx.fillStyle   = light ? '#000000' : '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, ph / 2);
  else ctx.rect(px, py, pw, ph);
  ctx.fill();

  /* pill border */
  ctx.globalAlpha = light ? 0.45 : 0.36;
  ctx.strokeStyle = light ? '#000000' : '#ffffff';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, ph / 2);
  else ctx.rect(px, py, pw, ph);
  ctx.stroke();

  /* text */
  ctx.globalAlpha = light ? 0.90 : 0.82;
  ctx.fillStyle   = light ? '#0B0B0D' : '#ffffff';
  ctx.fillText(txt, W / 2, py + ph / 2);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   CARD BACKGROUND — 6 styles
   Matches prototype cardStyleCSS()
───────────────────────────────────────────── */
function drawCardBg(ctx, x, y, w, h, r, style, acc, sideColor, light) {
  ctx.save();

  const path = () => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  };

  switch (style) {
    case 'contrast':
      path();
      ctx.fillStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.92)';
      ctx.fill();
      path();
      ctx.strokeStyle = light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;

    case 'mesh': {
      const mg = ctx.createLinearGradient(x, y, x + w, y + h);
      mg.addColorStop(0, hexA(sideColor, 0.18));
      mg.addColorStop(0.45, light ? 'rgba(240,235,220,0.80)' : 'rgba(0,0,0,0.65)');
      mg.addColorStop(1, hexA(sideColor, 0.18));
      path(); ctx.fillStyle = mg; ctx.fill();
      path(); ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }

    case 'grain':
      path();
      ctx.fillStyle = light ? 'rgba(245,240,232,0.92)' : 'rgba(18,16,12,0.94)';
      ctx.fill();
      path();
      ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(232,197,71,0.14)';
      ctx.lineWidth = 1; ctx.stroke();
      /* grain texture */
      ctx.save(); ctx.globalAlpha = 0.30; ctx.globalCompositeOperation = light ? 'multiply' : 'overlay';
      for (let gy = y; gy < y + h; gy += 2)
        for (let gx = x; gx < x + w; gx += 2) {
          const v = Math.random() * 255 | 0;
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(gx, gy, 2, 2);
        }
      ctx.restore();
      break;

    case 'neon':
      path();
      ctx.fillStyle = light ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.78)';
      ctx.fill();
      ctx.shadowColor = acc; ctx.shadowBlur = 20;
      path(); ctx.strokeStyle = acc; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowBlur = 0;
      /* top accent line */
      ctx.save();
      const nl = ctx.createLinearGradient(x, 0, x + w * 0.38, 0);
      nl.addColorStop(0, acc); nl.addColorStop(1, 'transparent');
      ctx.strokeStyle = nl; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w * 0.38, y); ctx.stroke();
      ctx.restore();
      break;

    case 'depth':
      path();
      ctx.fillStyle = light ? 'rgba(240,235,228,0.90)' : 'rgba(10,8,4,0.96)';
      ctx.fill();
      path(); ctx.strokeStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke();
      /* scanlines */
      ctx.save(); ctx.globalAlpha = 0.025;
      for (let sl = y; sl < y + h; sl += 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, sl, w, 1);
      }
      ctx.restore();
      break;

    default: /* glass */
      path();
      ctx.fillStyle = light ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      path(); ctx.strokeStyle = light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  /* inner radial colour tint */
  const rg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.8);
  rg.addColorStop(0, hexA(sideColor, 0.08));
  rg.addColorStop(1, 'transparent');
  path(); ctx.fillStyle = rg; ctx.fill();

  ctx.restore();
}

/* ─────────────────────────────────────────────
   LYRIC BACK DIVIDER PILL
   Matches prototype lbDiv()  — Syne 800
───────────────────────────────────────────── */
function drawDivider(ctx, W, divY, echoUser, alpha, th) {
  if (alpha <= 0) return;
  const light    = th.light;
  const accRgba  = light ? 'rgba(0,0,0,0.22)'        : 'rgba(232,197,71,0.28)';
  const pillBg   = light ? 'rgba(0,0,0,0.06)'         : 'rgba(232,197,71,0.09)';
  const pillBdr  = light ? 'rgba(0,0,0,0.18)'         : 'rgba(232,197,71,0.28)';
  const pillClr  = light ? '#0B0B0D'                  : th.acc;
  const dText    = `LYRIC BACK \u21A9  @${(echoUser || 'ANONYMOUS').toString().replace(/^@/,'').toUpperCase()}`;
  const dFS      = Math.max(10, Math.round(W * 0.020));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${dFS}px 'Syne','Arial Black',sans-serif`;

  const dTW = ctx.measureText(dText).width;
  const pH  = dFS * 2.0;
  const pPad = W * 0.028;
  const pW  = dTW + pPad * 2;
  const pX  = W / 2 - pW / 2;
  const pY  = divY - pH / 2;
  const pR  = pH / 2;
  const gap = pW / 2 + W * 0.020;

  /* side lines */
  [[W * 0.05, W / 2 - gap], [W / 2 + gap, W * 0.95]].forEach(([x1, x2]) => {
    const lg = ctx.createLinearGradient(x1, 0, x2, 0);
    if (x1 < W / 2) { lg.addColorStop(0, 'transparent'); lg.addColorStop(1, accRgba); }
    else             { lg.addColorStop(0, accRgba);       lg.addColorStop(1, 'transparent'); }
    ctx.fillStyle = lg;
    ctx.fillRect(x1, divY - 0.75, x2 - x1, 1.5);
  });

  /* pill shadow */
  ctx.shadowColor = light ? 'rgba(0,0,0,0.15)' : th.acc;
  ctx.shadowBlur  = 12;
  ctx.strokeStyle = pillBdr; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX, pY, pW, pH, pR); else ctx.rect(pX, pY, pW, pH);
  ctx.stroke();
  ctx.shadowBlur = 0;

  /* pill fill */
  const pf = ctx.createLinearGradient(pX, pY, pX, pY + pH);
  pf.addColorStop(0, light ? 'rgba(0,0,0,0.07)' : 'rgba(232,197,71,0.13)');
  pf.addColorStop(1, light ? 'rgba(0,0,0,0.03)' : 'rgba(232,197,71,0.05)');
  ctx.fillStyle = pf;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX, pY, pW, pH, pR); else ctx.rect(pX, pY, pW, pH);
  ctx.fill();

  /* pill text */
  ctx.font = `800 ${dFS}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle    = pillClr;
  ctx.globalAlpha  = alpha * 0.96;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';
  ctx.fillText(dText, W / 2, divY);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   SONGS BAR — Syne 800 label, fully legible
   Matches prototype songsBar()
───────────────────────────────────────────── */
function drawSongsBar(ctx, W, byY, post1, post2, th) {
  const light    = th.light;
  const B        = W;
  const bh       = Math.round(B * 0.072);
  const px       = Math.round(B * 0.048);
  const br       = Math.round(B * 0.018);
  const lFs      = Math.max(9,  Math.round(B * 0.020));
  const sFs      = Math.max(9,  Math.round(B * 0.022));
  const aFs      = Math.max(8,  Math.round(B * 0.017));
  const cy       = byY + bh / 2;

  ctx.save();
  ctx.fillStyle   = light ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)';
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)'  : 'rgba(255,255,255,0.10)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px * 0.8, byY, W - px * 1.6, bh, br);
  else ctx.rect(px * 0.8, byY, W - px * 1.6, bh);
  ctx.fill(); ctx.stroke();

  /* SONGS label — Syne 800 */
  ctx.font = `800 ${lFs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle    = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.70)';
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText('SONGS', px, cy);

  const k1   = post1.knowledge || {};
  const s1   = (k1.song   || post1.song   || '').substring(0, 20);
  const a1   = (k1.artist || post1.artist || '');
  const k2   = post2.knowledge || {};
  const s2   = (k2.song   || post2.song   || '').substring(0, 20);
  const a2   = (k2.artist || post2.artist || '');
  const songC = light ? '#0B0B0D'                     : '#ffffff';
  const artC  = light ? 'rgba(0,0,0,0.45)'            : 'rgba(255,255,255,0.45)';

  /* left song */
  ctx.font = `700 ${sFs}px 'DM Sans',sans-serif`;
  ctx.fillStyle = songC; ctx.textAlign = 'left';
  ctx.fillText(s1, W * 0.28, cy - aFs * 0.5);
  ctx.font = `400 ${aFs}px 'Space Mono',monospace`;
  ctx.fillStyle = artC;
  ctx.fillText(a1, W * 0.28, cy + sFs * 0.55);

  /* separator */
  ctx.font = `400 ${sFs}px sans-serif`;
  ctx.fillStyle    = th.acc;
  ctx.globalAlpha  = 0.7;
  ctx.textAlign    = 'center';
  ctx.fillText('\u2194', W / 2, cy);
  ctx.globalAlpha = 1;

  /* right song */
  ctx.font = `700 ${sFs}px 'DM Sans',sans-serif`;
  ctx.fillStyle = songC; ctx.textAlign = 'right';
  ctx.fillText(s2, W - px, cy - aFs * 0.5);
  ctx.font = `400 ${aFs}px 'Space Mono',monospace`;
  ctx.fillStyle = artC;
  ctx.fillText(a2, W - px, cy + sFs * 0.55);

  ctx.restore();
  return byY + bh;
}

/* ─────────────────────────────────────────────
   VIBE BADGE
───────────────────────────────────────────── */
function drawVibeBadge(ctx, vibe, bx, by, bw, bh, col, alpha) {
  if (!vibe) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.80;
  const vfs = Math.max(8, bh * 0.48);
  ctx.font = `800 ${vfs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle   = hexA(col, 0.16);
  ctx.strokeStyle = hexA(col, 0.45);
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, bh / 2); else ctx.rect(bx, by, bw, bh);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle    = col;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';
  ctx.fillText(vibe.toUpperCase(), bx + bw / 2, by + bh / 2);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   FONT STACK helper
───────────────────────────────────────────── */
function fStack(f) {
  const m = {
    'DM Serif Display': "'DM Serif Display',serif",
    'Space Mono':       "'Space Mono',monospace",
    'Georgia':          'Georgia,serif',
  };
  return m[f] || `'${f}',sans-serif`;
}
function isItalic(f) { return ['DM Serif Display','Georgia'].includes(f); }

/* ─────────────────────────────────────────────
   PER-FRAME MOTION TRANSFORM + ALPHA
   phaseT: 0→1 within this post's phase window
───────────────────────────────────────────── */
function motionTransform(motion, phaseT, side) {
  let tx = 0, ty = 0, alpha = easeOut(phaseT), scaleX = 1;
  const flip = side === 'right' ? 1 : -1;

  switch (motion) {
    case 'fade-up':
      ty = (1 - easeOut(phaseT)) * 20;
      break;
    case 'slide-in':
      tx = flip * (1 - easeOut(phaseT)) * 28;
      break;
    case 'pulse': {
      const o = 0.5 + 0.5 * Math.sin(phaseT * Math.PI * 2 + (side === 'right' ? Math.PI : 0));
      alpha  = 0.45 + 0.55 * o;
      scaleX = 0.97 + 0.04 * o;
      break;
    }
    case 'glitch':
      if (phaseT > 0.88 && phaseT < 0.96) {
        tx = (Math.random() - 0.5) * 8;
        ty = (Math.random() - 0.5) * 4;
        alpha = 0.82;
      }
      break;
    case 'wave':
      ty = Math.sin(phaseT * Math.PI * 3 + (side === 'right' ? Math.PI : 0)) * 10;
      break;
    case 'bounce':
      ty = -Math.abs(Math.sin(phaseT * Math.PI * 2.5)) * 14;
      break;
    case 'shimmer':
    case 'typewriter':
      /* handled separately in lyric draw */
      break;
  }
  return { tx, ty, alpha, scaleX };
}

/* ─────────────────────────────────────────────
   DRAW ONE LYRIC BUBBLE
   side: 'left' | 'right'
   phaseT: 0→1 (this post's animation phase)
───────────────────────────────────────────── */
function drawBubble(ctx, W, H, areaTop, areaBot, post, th, side, phaseT, motion, opts) {
  const { fontFamily = 'DM Serif Display', cardStyle = 'glass' } = opts;
  const light    = th.light;
  const col      = side === 'left' ? th.l : th.r;
  const bodyTxt  = light ? '#0B0B0D' : '#ffffff';
  const mutedTxt = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';
  const divLine  = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  const text     = (post.text || post.lyric || '').substring(0, 120);
  const k        = post.knowledge || {};
  const song     = (k.song   || post.song   || '');
  const artist   = (k.artist || post.artist || '');
  const username = ('@' + (post.username || 'anonymous').toString().replace(/^@/,'')).toUpperCase();
  const vibe     = (post.emotion || '').toUpperCase();
  const areaH    = areaBot - areaTop;

  const { tx, ty, alpha, scaleX } = motionTransform(motion, phaseT, side);
  if (alpha <= 0.01) return;

  /* card sizing */
  const pad    = Math.round(W * 0.048);
  const innerW = W - pad * 2;
  let lfs      = Math.min(W * 0.043, areaH * 0.28);
  const fStyle  = isItalic(fontFamily) ? 'italic 600' : '600';
  ctx.font = `${fStyle} ${lfs}px ${fStack(fontFamily)}`;
  let lines = wrapText(ctx, text, innerW * 0.82);
  if (lines.length > 4) {
    lfs = Math.max(W * 0.026, lfs * (4 / lines.length));
    ctx.font = `${fStyle} ${lfs}px ${fStack(fontFamily)}`;
    lines = wrapText(ctx, text, innerW * 0.82);
  }
  const lh    = lfs * 1.42;
  const cPad  = Math.round(W * 0.036);
  const sFs   = Math.max(9,  Math.round(W * 0.026));
  const aFs   = Math.max(8,  Math.round(W * 0.018));
  const vFs   = Math.max(8,  Math.round(W * 0.016));
  const uFs   = Math.max(10, Math.round(W * 0.022));
  const cardH = Math.min(areaH * 0.88, lines.length * lh + cPad * 2 + sFs * 2.5 + lfs * 0.5);
  const cardY = areaTop + (areaH - cardH) / 2;
  const cRad  = Math.round(W * 0.030);
  const cR2   = Math.round(W * 0.005);
  const radii = side === 'left'
    ? [cRad, cRad, cRad, cR2]
    : [cRad, cRad, cR2, cRad];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(tx, ty);
  if (scaleX !== 1) { ctx.translate(W / 2, 0); ctx.scale(scaleX, 1); ctx.translate(-W / 2, 0); }

  /* username row — Syne 800 */
  const dot   = Math.round(W * 0.009);
  const uGap  = Math.round(W * 0.008);
  const uY    = cardY - uFs * 0.5 - Math.round(W * 0.010);
  ctx.font         = `800 ${uFs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle    = col;
  ctx.globalAlpha  = alpha * 0.90;
  ctx.textBaseline = 'middle';
  if (side === 'right') {
    ctx.textAlign = 'right';
    ctx.fillText('\u25CF ' + username, W - pad, uY + uFs * 0.5);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText('\u25CF ' + username, pad, uY + uFs * 0.5);
  }

  /* card background */
  ctx.globalAlpha = alpha;
  /* rounded rect path helper for non-uniform radii */
  const pathCard = () => {
    const [tl, tr, br2, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(pad + tl, cardY);
    ctx.lineTo(pad + innerW - tr, cardY);
    ctx.quadraticCurveTo(pad + innerW, cardY, pad + innerW, cardY + tr);
    ctx.lineTo(pad + innerW, cardY + cardH - br2);
    ctx.quadraticCurveTo(pad + innerW, cardY + cardH, pad + innerW - br2, cardY + cardH);
    ctx.lineTo(pad + bl, cardY + cardH);
    ctx.quadraticCurveTo(pad, cardY + cardH, pad, cardY + cardH - bl);
    ctx.lineTo(pad, cardY + tl);
    ctx.quadraticCurveTo(pad, cardY, pad + tl, cardY);
    ctx.closePath();
  };
  drawCardBg(ctx, pad, cardY, innerW, cardH, cRad, cardStyle, th.acc, col, light);

  /* inner radial tint */
  ctx.save();
  const rg = ctx.createRadialGradient(
    side === 'left' ? pad : pad + innerW, cardY, 0,
    side === 'left' ? pad : pad + innerW, cardY, Math.max(innerW, cardH) * 0.7
  );
  rg.addColorStop(0, hexA(col, 0.08)); rg.addColorStop(1, 'transparent');
  pathCard(); ctx.fillStyle = rg; ctx.fill();
  ctx.restore();

  /* lyric text */
  const lyricTop = cardY + cPad;
  ctx.globalAlpha  = alpha;
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'left';
  ctx.font         = `${fStyle} ${lfs}px ${fStack(fontFamily)}`;
  ctx.shadowColor  = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur   = 10;

  if (motion === 'shimmer') {
    const sp  = (phaseT * 2.5 + (side === 'right' ? 0.5 : 0)) % 1.2 - 0.1;
    const sg  = ctx.createLinearGradient(W * sp - W * 0.4, 0, W * sp + W * 0.4, 0);
    sg.addColorStop(0,   'rgba(255,255,255,0.5)');
    sg.addColorStop(0.35,'#ffffff');
    sg.addColorStop(0.5,  th.acc);
    sg.addColorStop(0.65,'#ffffff');
    sg.addColorStop(1,   'rgba(255,255,255,0.5)');
    ctx.fillStyle = sg;
  } else {
    ctx.fillStyle = bodyTxt;
  }

  if (motion === 'typewriter') {
    const full   = lines.join(' ');
    const show   = Math.floor(phaseT * full.length);
    let revealed = 0;
    lines.forEach((line, i) => {
      const s = Math.max(0, Math.min(line.length, show - revealed));
      ctx.fillText(line.slice(0, s), pad + cPad, lyricTop + i * lh);
      if (show >= revealed && show < revealed + line.length) {
        const curX = pad + cPad + ctx.measureText(line.slice(0, s)).width + 2;
        ctx.save();
        ctx.globalAlpha  = 0.9;
        ctx.fillStyle    = th.acc;
        ctx.fillRect(curX, lyricTop + i * lh, Math.max(2, lfs * 0.06), lfs * 0.88);
        ctx.restore();
      }
      revealed += line.length + 1;
    });
  } else {
    lines.forEach((line, i) => ctx.fillText(line, pad + cPad, lyricTop + i * lh));
  }
  ctx.shadowBlur = 0;

  /* divider line in card */
  const divLineY = cardY + cardH - sFs * 2.8;
  ctx.save();
  ctx.globalAlpha  = alpha * 0.35;
  ctx.strokeStyle  = divLine;
  ctx.lineWidth    = 1;
  ctx.beginPath(); ctx.moveTo(pad + cPad, divLineY); ctx.lineTo(pad + innerW - cPad, divLineY); ctx.stroke();
  ctx.restore();

  /* song / artist */
  if (song) {
    ctx.font         = `700 ${sFs}px 'DM Sans',sans-serif`;
    ctx.fillStyle    = bodyTxt;
    ctx.globalAlpha  = alpha;
    ctx.textBaseline = 'bottom';
    ctx.textAlign    = 'left';
    ctx.fillText(song, pad + cPad, cardY + cardH - cPad * 0.6);
    ctx.font         = `400 ${aFs}px 'Space Mono',monospace`;
    ctx.fillStyle    = mutedTxt;
    ctx.fillText(artist, pad + cPad, cardY + cardH - cPad * 0.6 + aFs * 1.3);
  }

  /* vibe badge */
  if (vibe) {
    ctx.font = `800 ${vFs}px 'Syne','Arial Black',sans-serif`;
    const vw  = ctx.measureText(vibe).width;
    const bw2 = vw + Math.round(W * 0.022);
    const bh2 = vFs * 2.0;
    const bx2 = pad + innerW - cPad * 0.3 - bw2;
    const by2 = cardY + cardH - bh2 - Math.round(W * 0.014);
    drawVibeBadge(ctx, vibe, bx2, by2, bw2, bh2, col, alpha);
  }

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════
   PUBLIC: dsGifDrawFrame
   t ∈ [0,1)  — normalised animation time for the loop
   Phase model (mirrors prototype keyframes):
     post1 (left)  fades in  t 0.00 → 0.40   (bubbleLeft)
     divider       sweeps in t 0.20 → 0.38   (dividerIn)
     post2 (right) fades in  t 0.35 → 0.75   (bubbleRight)
═══════════════════════════════════════════════════════ */
function dsGifDrawFrame(ctx, W, H, t, motion, post1, post2, opts = {}) {
  if (!post1 || !post2) return;

  const th    = _theme(opts.theme || 'gold');
  const ff    = opts.fontFamily || 'DM Serif Display';
  const cs    = opts.cardStyle  || 'glass';

  /* background */
  drawBg(ctx, W, H, th);
  drawMargoWordmark(ctx, W, H, th);

  /* zones */
  const divY   = H * 0.500;
  const topT   = H * 0.110;
  const topB   = divY - H * 0.050;
  const botT   = divY + H * 0.050;
  const botB   = H    * 0.840;

  /* phase scalars (clamp 0→1) */
  const p1t = Math.max(0, Math.min(1, t / 0.40));           // post1: 0→0.40
  const dT  = Math.max(0, Math.min(1, (t - 0.20) / 0.18)); // divider: 0.20→0.38
  const p2t = Math.max(0, Math.min(1, (t - 0.35) / 0.40)); // post2: 0.35→0.75

  drawBubble(ctx, W, H, topT, topB, post1, th, 'left',  p1t, motion, { fontFamily: ff, cardStyle: cs });
  drawDivider(ctx, W, divY, post2.username, dT, th);
  if (p2t > 0)
    drawBubble(ctx, W, H, botT, botB, post2, th, 'right', p2t, motion, { fontFamily: ff, cardStyle: cs });

  /* songs bar */
  const songsY = H * 0.852;
  drawSongsBar(ctx, W, songsY, post1, post2, th);

  drawWatermark(ctx, W, H, th);
  drawMmark(ctx, W, H, th);
}

/* ═══════════════════════════════════════════════════════
   PUBLIC: dsGifExport → Promise<Blob>
   Renders full animated GIF via gif.js
═══════════════════════════════════════════════════════ */
async function dsGifExport(post1, post2, motion, dur, opts = {}) {
  const SIZE   = 600;
  const FPS    = 18;
  const frames = Math.round(FPS * Math.min(Math.max(dur || 2.4, 1), 6));
  const delay  = Math.round(1000 / FPS);

  /* offscreen canvas */
  const off = document.createElement('canvas');
  off.width = off.height = SIZE;
  const oc  = off.getContext('2d');

  /* wait for fonts */
  await document.fonts.ready;

  /* load gif.js if needed */
  if (typeof GIF === 'undefined') {
    await new Promise((res, rej) => {
      const s   = document.createElement('script');
      s.src     = '/js/gif.worker.js'
        ? 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
        : 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      s.onload  = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers:      2,
      quality:      6,
      width:        SIZE,
      height:       SIZE,
      workerScript: '/js/gif.worker.js',
      dither:       false,
    });

    (async () => {
      for (let i = 0; i < frames; i++) {
        oc.clearRect(0, 0, SIZE, SIZE);
        dsGifDrawFrame(oc, SIZE, SIZE, i / frames, motion, post1, post2, opts);
        gif.addFrame(off, { copy: true, delay });
        /* yield to keep UI responsive */
        await new Promise(r => setTimeout(r, 0));
      }
      gif.on('finished', resolve);
      gif.on('error',    reject);
      gif.render();
    })();
  });
}

/* ── expose ── */
window.dsGifDrawFrame = dsGifDrawFrame;
window.dsGifExport    = dsGifExport;

})();
