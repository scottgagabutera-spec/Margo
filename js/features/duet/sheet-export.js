function _download(which) {
  const p1 = DS.post1, p2 = DS.post2;
  if (!p1 || !p2) return;
  const opts = _buildOpts();

  if (which === 'primary') {
    if (DS.format === 'gif') {
      DS.view === 'convo' ? _exportConvoGif(p1, p2, opts) : _exportCardGif(p1, p2, opts);
    } else {
      DS.view === 'convo' ? _exportConvoPoster(p1, p2, opts) : _exportCardPoster(p1, p2, opts);
    }
  } else {
    // Secondary = Share / Save
    if (DS.format === 'gif') {
      _shareGif(p1, p2, opts);
    } else {
      _savePng();
    }
  }
}

/* ── CONVERSATION VIEW: export as GIF (animated conversation layout) ── */
function _exportConvoGif(p1, p2, opts) {
  const btn = _el('_dsDlA');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
  btn.disabled  = true;

  // Pass view flag so the renderer knows to use conversation layout
  const exportOpts = Object.assign({}, opts, { view: 'convo' });

  const doExport = () => {
    if (typeof window.dsGifExport === 'function') {
      window.dsGifExport(p1, p2, DS.motion, DS.dur, exportOpts)
        .then(blob => _triggerDl(blob, `margo-duet-${Date.now()}.gif`))
        .catch(() => _snapConvoPng(p1, p2, opts).then(b => _triggerDl(b, `margo-duet-${Date.now()}.png`)))
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; });
    } else {
      // Fallback: snapshot the conversation view as a PNG
      _snapConvoPng(p1, p2, opts).then(blob => {
        _triggerDl(blob, `margo-duet-${Date.now()}.png`);
        btn.innerHTML = orig; btn.disabled = false;
      });
    }
  };
  doExport();
}

/* ── CARD VIEW: export as GIF (existing card layout) ── */
function _exportCardGif(p1, p2, opts) {
  const btn = _el('_dsDlA');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
  btn.disabled  = true;

  const prev = window._shareSheet;
  window._shareSheet = { post: p1, echoPost: p2, isDuet: true };

  const doExport = () => {
    if (typeof window.gsExportForShareSheet === 'function') {
      window.gsExportForShareSheet(null)
        .then(blob => _triggerDl(blob, `margo-duet-${Date.now()}.gif`))
        .catch(() => _savePng())
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; window._shareSheet = prev; });
    } else if (typeof window.dsGifExport === 'function') {
      window.dsGifExport(p1, p2, DS.motion, DS.dur, opts)
        .then(blob => _triggerDl(blob, `margo-duet-${Date.now()}.gif`))
        .catch(() => _savePng())
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; window._shareSheet = prev; });
    } else {
      _savePng();
      btn.innerHTML = orig; btn.disabled = false; window._shareSheet = prev;
    }
  };
  doExport();
}

/* ── CONVERSATION VIEW: export as Poster PNG ── */
function _exportConvoPoster(p1, p2, opts) {
  const btn = _el('_dsDlA');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
  btn.disabled  = true;

  // Render the conversation layout at 1080×1350 (tall to fit both bubbles nicely)
  _snapConvoPng(p1, p2, opts, 1080, 1350).then(blob => {
    _triggerDl(blob, `margo-poster-${Date.now()}.png`);
    btn.innerHTML = orig; btn.disabled = false;
  }).catch(() => {
    // Fallback to card poster
    _exportCardPoster(p1, p2, opts);
    btn.innerHTML = orig; btn.disabled = false;
  });
}

/* ── CARD VIEW: export as Poster PNG ── */
function _exportCardPoster(p1, p2, opts) {
  const btn = _el('_dsDlA');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
  btn.disabled  = true;

  if (typeof window.dsPosterExport === 'function') {
    window.dsPosterExport(p1, p2, opts)
      .then(blob => _triggerDl(blob, `margo-poster-${Date.now()}.png`))
      .catch(() => _savePng())
      .finally(() => { btn.innerHTML = orig; btn.disabled = false; });
  } else {
    const off = document.createElement('canvas');
    off.width = off.height = 1080;
    const ctx = off.getContext('2d');
    document.fonts.ready.then(() => {
      if (typeof window.dsPosterDraw === 'function') {
        window.dsPosterDraw(ctx, 1080, 1080, p1, p2, opts);
      } else {
        _fallbackDraw(ctx, 1080, 1080, 0, p1, p2, opts);
      }
      off.toBlob(blob => {
        if (blob) _triggerDl(blob, `margo-poster-${Date.now()}.png`);
        btn.innerHTML = orig; btn.disabled = false;
      }, 'image/png', 0.95);
    });
  }
}

/* ── Snapshot the CONVERSATION VIEW to an offscreen canvas → Blob ── */
function _snapConvoPng(p1, p2, opts, W = 1080, H = 1080) {
  return document.fonts.ready.then(() => {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const ctx = off.getContext('2d');

    // Use the rich poster renderer but with conversation layout proportions
    // The conversation layout IS the fallback draw — two bubble zones + divider + songs bar
    _drawConvoLayout(ctx, W, H, p1, p2, opts);

    return new Promise((resolve, reject) => {
      off.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png', 0.95);
    });
  });
}

/* ── Draw CONVERSATION LAYOUT to any canvas context ──
   This mirrors exactly what the user sees in the Conversation tab,
   rendered at export resolution. ── */
function _drawConvoLayout(ctx, W, H, p1, p2, opts) {
  if (!p1 || !p2) return;
  const m     = DS_THEMES[opts.theme] || DS_THEMES.gold;
  const pVibe = DS_VIBE[p1.emotion] || m.l;
  const eVibe = DS_VIBE[p2.emotion] || m.r;

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, m.bg);
  bg.addColorStop(1, _mix(m.bg, '#000', 0.4));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.save(); ctx.globalAlpha = 0.22;
  const g1 = ctx.createRadialGradient(W*.2, H*.22, 0, W*.2, H*.22, W*.65);
  g1.addColorStop(0, pVibe); g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H); ctx.restore();

  ctx.save(); ctx.globalAlpha = 0.18;
  const g2 = ctx.createRadialGradient(W*.8, H*.78, 0, W*.8, H*.78, W*.65);
  g2.addColorStop(0, eVibe); g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); ctx.restore();

  // ── Noise grain ──
  ctx.save(); ctx.globalAlpha = 0.025;
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    const v = Math.random()*255|0; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x,y,3,3);
  }
  ctx.restore();

  // ── Top bar ──
  ctx.save(); ctx.globalAlpha = 0.6;
  const tbar = ctx.createLinearGradient(0, 0, W, 0);
  tbar.addColorStop(0,'transparent'); tbar.addColorStop(0.5, pVibe); tbar.addColorStop(1,'transparent');
  ctx.fillStyle = tbar; ctx.fillRect(0, 0, W, 3); ctx.restore();

  // ── MARGO wordmark ──
  const mSz = Math.max(16, W * 0.038);
  const pad  = W * 0.060;
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = m.accent; ctx.globalAlpha = 0.24;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.55);
  ctx.restore();

  // ── Layout zones (conversation has 2 bubbles, divider, songs) ──
  const headerH = pad + mSz * 1.8;
  const footerH = H * 0.16;           // songs bar + watermark area
  const innerH  = H - headerH - footerH;
  const divY    = headerH + innerH * 0.50;
  const gap     = W * 0.04;

  const topT = headerH + gap;
  const topB = divY - W * 0.04;
  const botT = divY + W * 0.04;
  const botB = H - footerH + gap * 0.5;

  // ── Bubble 1 (original post) ──
  _drawConvoBubble(ctx, W, topT, topB, p1, m, 'left', opts);

  // ── Divider ──
  _drawDivider(ctx, W, divY, p2, m, 1.0);

  // ── Bubble 2 (echo/reply) ──
  _drawConvoBubble(ctx, W, botT, botB, p2, m, 'right', opts);

  // ── Songs bar ──
  const songsT = H - footerH + gap * 0.3;
  const songsB = songsT + W * 0.072;
  _drawSongsBar(ctx, W, songsT, songsB, p1, p2, m, pad);

  // ── Watermark + M-mark ──
  _drawWatermark(ctx, W, H, m);
  _drawMmark(ctx, W, H, m);
}

/* ── Draw a single conversation bubble (matches the HTML bubble style) ── */
function _drawConvoBubble(ctx, W, areaT, areaB, post, m, side, opts) {
  const areaH  = areaB - areaT;
  const pad    = W * 0.060;
  const col    = side === 'left' ? m.l : m.r;
  const align  = side === 'left' ? 'left' : 'right';
  const text   = (post.text || post.lyric || '').substring(0, 120);
  const pk     = post.knowledge || {};
  const song   = pk.song   || post.song   || '';
  const artist = pk.artist || post.artist || '';
  const user   = '@' + (post.username || 'anonymous').replace(/^@/,'').toUpperCase();
  const vibe   = (post.emotion || '').toUpperCase();
  const fStyle = opts.fontItalic ? 'italic 600' : '600';
  const ff     = `'${opts.fontFamily}',serif`;

  // Username pill
  const uFs = Math.max(12, W * 0.022);
  ctx.save();
  ctx.font = `800 ${uFs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = col; ctx.globalAlpha = 0.9;
  ctx.textBaseline = 'bottom';
  if (side === 'left') {
    ctx.textAlign = 'left';
    ctx.fillText('● ' + user, pad, areaT - W * 0.006);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(user + ' ●', W - pad, areaT - W * 0.006);
  }
  ctx.restore();

  // Card sizing — bubble fills its area with padding
  const bubbleW = W * 0.84;
  const bubbleX = side === 'left' ? pad : W - pad - bubbleW;
  const cPad    = W * 0.034;
  const sFs     = Math.max(10, W * 0.026);
  const aFs     = Math.max(9,  W * 0.018);
  const vFs     = Math.max(9,  W * 0.017);

  // Measure text to compute card height
  let lfs = Math.min(W * 0.048, areaH * 0.26);
  ctx.font = `${fStyle} ${lfs}px ${ff}`;
  let lines = _wrapText(ctx, text, bubbleW - cPad * 2);
  if (lines.length > 4) {
    lfs = Math.max(W * 0.028, lfs * 4 / lines.length);
    ctx.font = `${fStyle} ${lfs}px ${ff}`;
    lines = _wrapText(ctx, text, bubbleW - cPad * 2);
  }
  const lh     = lfs * 1.42;
  const cardH  = Math.min(areaH * 0.92, lines.length * lh + cPad * 2 + sFs * 2.6 + lfs * 0.4);
  const cardY  = areaT + (areaH - cardH) / 2;
  const cRad   = W * 0.028;
  const corner = side === 'left' ? cRad : W * 0.004;

  // Card background
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    if (side === 'left') ctx.roundRect(bubbleX, cardY, bubbleW, cardH, [cRad, cRad, cRad, corner]);
    else                 ctx.roundRect(bubbleX, cardY, bubbleW, cardH, [cRad, cRad, corner, cRad]);
  } else { ctx.rect(bubbleX, cardY, bubbleW, cardH); }
  ctx.fillStyle   = side === 'left' ? m.bb1.replace('0.10','0.14') : m.bb2.replace('0.09','0.12');
  ctx.globalAlpha = 1;
  ctx.fill();
  ctx.strokeStyle = side === 'left' ? m.bd1 : m.bd2;
  ctx.lineWidth   = 1.5; ctx.stroke();
  ctx.restore();

  // Corner accent glow
  ctx.save();
  const rg = ctx.createRadialGradient(
    side === 'left' ? bubbleX : bubbleX + bubbleW, cardY, 0,
    side === 'left' ? bubbleX : bubbleX + bubbleW, cardY, bubbleW * 0.7
  );
  rg.addColorStop(0, col + '18'); rg.addColorStop(1, 'transparent');
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bubbleX, cardY, bubbleW, cardH, cRad); else ctx.rect(bubbleX, cardY, bubbleW, cardH);
  ctx.fillStyle = rg; ctx.fill();
  ctx.restore();

  // Lyric text
  ctx.save();
  ctx.font = `${fStyle} ${lfs}px ${ff}`;
  ctx.fillStyle = m.light ? '#0B0B0D' : '#ffffff';
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8;
  lines.forEach((ln, i) => ctx.fillText(ln, bubbleX + cPad, cardY + cPad + i * lh));
  ctx.shadowBlur = 0;
  ctx.restore();

  // Divider line inside card
  const divLineY = cardY + cardH - sFs * 2.8;
  ctx.save();
  ctx.globalAlpha = 0.28; ctx.strokeStyle = m.light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bubbleX + cPad, divLineY); ctx.lineTo(bubbleX + bubbleW - cPad, divLineY); ctx.stroke();
  ctx.restore();

  // Song + artist
  if (song) {
    ctx.save();
    ctx.font = `700 ${sFs}px 'DM Sans',sans-serif`;
    ctx.fillStyle = m.light ? '#0B0B0D' : '#ffffff';
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    ctx.fillText(song, bubbleX + cPad, cardY + cardH - cPad * 0.6);
    ctx.font = `400 ${aFs}px 'Space Mono',monospace`;
    ctx.fillStyle = m.light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';
    ctx.fillText(artist, bubbleX + cPad, cardY + cardH - cPad * 0.6 + aFs * 1.3);
    ctx.restore();
  }

  // Vibe badge
  if (vibe) {
    ctx.save();
    ctx.font = `800 ${vFs}px 'Syne','Arial Black',sans-serif`;
    const vw  = ctx.measureText(vibe).width;
    const bw  = vw + W * 0.022, bh = vFs * 2.0;
    const bx  = bubbleX + bubbleW - cPad * 0.3 - bw;
    const by  = cardY + cardH - bh - W * 0.014;
    ctx.fillStyle   = col + '28'; ctx.strokeStyle = col + '77'; ctx.lineWidth = 1.5;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, bh/2); else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(vibe, bx + bw/2, by + bh/2);
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════
   SHARE GIF
══════════════════════════════════════════════════════════ */
