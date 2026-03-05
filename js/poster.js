/* ============================================================
   MARGO — js/poster.js  v1.0
   Self-contained poster studio, separate from gif-studio.js.
   Works with the existing #studioOverlay HTML in index.html.
   Called by share-sheet.js via window.openPosterStudio(post).
   ============================================================ */

/* ── VIBE colours ── */
const POSTER_VIBE_COLORS = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};
const POSTER_VIBE_LABELS = {
  Love:'Love', Heartbreak:'Heartbreak', Hope:'Hope', Nostalgia:'Nostalgia',
  Healing:'Healing', Joy:'Joy', Rage:'Rage', Loneliness:'Loneliness',
  SendIt:'Send It', LetOut:'Let Out',
};

/* ── Design themes (matching index.html swatch data-design values) ── */
const POSTER_THEMES = {
  'midnight-gold':   { bg1:'#0d0d0d', bg2:'#1a1500', accent:'#E8C547', text:'#F0F0F0' },
  'royal-purple':    { bg1:'#0d0014', bg2:'#1a0033', accent:'#c77dff', text:'#f0e6ff' },
  'neon-cyan':       { bg1:'#020c14', bg2:'#0a1420', accent:'#00e5ff', text:'#e0f8ff' },
  'sunset-coral':    { bg1:'#140505', bg2:'#1a0a0a', accent:'#ff6b6b', text:'#fff0ee' },
  'emerald-night':   { bg1:'#020e06', bg2:'#051a0d', accent:'#50fa7b', text:'#e8ffe8' },
  'rose-gold':       { bg1:'#140408', bg2:'#1a0d0f', accent:'#f4a4c0', text:'#fff0f4' },
  'cream-editorial': { bg1:'#f5f1e8', bg2:'#e8e0d0', accent:'#2a2520', text:'#1a1510' },
  'monochrome':      { bg1:'#0a0a0a', bg2:'#1a1a1a', accent:'#ffffff', text:'#f0f0f0' },
  'vaporwave':       { bg1:'#1a0828', bg2:'#0a1428', accent:'#ff71ce', text:'#f0e8ff' },
  'neon-dark':       { bg1:'#050505', bg2:'#100010', accent:'#ff00ff', text:'#ffe0ff' },
  'y2k-chrome':      { bg1:'#00001a', bg2:'#000033', accent:'#00ffff', text:'#e0ffff' },
  'brutalist':       { bg1:'#ffffff', bg2:'#e8e8e8', accent:'#000000', text:'#0a0a0a' },
};

/* ── Font map ── */
const POSTER_FONTS = {
  playfair:    { css:"'Playfair Display',serif",     style:'italic', weight:'700' },
  cormorant:   { css:"'Cormorant Garamond',serif",   style:'italic', weight:'600' },
  lora:        { css:"'Lora',serif",                 style:'italic', weight:'600' },
  merriweather:{ css:"'Merriweather',serif",         style:'normal', weight:'700' },
  josefin:     { css:"'Josefin Sans',sans-serif",    style:'normal', weight:'700' },
  bebas:       { css:"'Bebas Neue',display",         style:'normal', weight:'400' },
  oswald:      { css:"'Oswald',sans-serif",          style:'normal', weight:'600' },
  dancing:     { css:"'Dancing Script',cursive",     style:'normal', weight:'700' },
};

/* ── Canvas sizes ── */
const POSTER_SIZES = {
  'instagram-square': { w:1080, h:1080 },
  'instagram-story':  { w:1080, h:1920 },
  'reddit':           { w:1200, h:1200 },
  'twitter':          { w:1200, h:675  },
  'pinterest':        { w:1000, h:1500 },
};

/* ── STATE ── */
let _pPost       = null;
let _pTheme      = 'midnight-gold';
let _pFont       = 'playfair';
let _pBrightness = 100;
let _pSize       = 'instagram-square';
let _pPhotoImg   = null;
let _pPhotoBlur  = 0;
let _pPhotoDim   = 50;
let _pPhotoFilter= 'none';
let _pThumbImg   = null;

/* ============================================================
   OPEN
============================================================ */
window.openPosterStudio = function(post) {
  _pPost = post || window.currentPost;
  if (!_pPost) { console.warn('[poster] no post'); return; }

  // Preload YouTube thumbnail
  const thumbUrl = _pPost.youtubeMeta?.thumbnailSm || _pPost.youtubeMeta?.thumbnail;
  if (thumbUrl) {
    _pThumbImg = new Image();
    _pThumbImg.crossOrigin = 'anonymous';
    _pThumbImg.onload = () => _posterDraw();
    _pThumbImg.src = thumbUrl;
  } else {
    _pThumbImg = null;
  }

  // Show the existing studioOverlay
  const overlay = document.getElementById('studioOverlay');
  if (!overlay) { console.error('[poster] #studioOverlay not found'); return; }
  overlay.classList.remove('hidden');
  document.body.classList.add('modal-open');

  // Hide size picker / ceremony if open
  document.getElementById('sizePicker')?.classList.add('hidden');
  document.getElementById('ceremonyOverlay')?.classList.add('hidden');

  // Wire close button (index.html uses id="closeStudio")
  const closeBtn = document.getElementById('closeStudio');
  if (closeBtn) {
    closeBtn.onclick = () => window.closePosterStudio();
  }

  // Wire export button
  const exportBtn = document.getElementById('studioExportBtn');
  if (exportBtn) {
    exportBtn.onclick = () => _posterExport();
  }

  // Wire dock tabs
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => _posterSwitchTab(tab.dataset.tab);
  });

  // Wire colour swatches (panel-color in index.html)
  document.querySelectorAll('#panel-color .scene-swatch').forEach(sw => {
    sw.onclick = () => {
      _pTheme = sw.dataset.design;
      document.querySelectorAll('#panel-color .scene-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      _posterDraw();
    };
  });

  // Wire brightness slider
  const bSlider = document.getElementById('studiobrightness');
  const bVal    = document.getElementById('studioBrightnessVal');
  if (bSlider) {
    bSlider.oninput = () => {
      _pBrightness = parseInt(bSlider.value);
      if (bVal) bVal.textContent = _pBrightness + '%';
      _posterUpdateSlider(bSlider, _pBrightness, 50, 150);
      _posterDraw();
    };
    _posterUpdateSlider(bSlider, _pBrightness, 50, 150);
  }

  // Wire font cards (panel-font in index.html)
  document.querySelectorAll('#panel-font .font-card').forEach(card => {
    card.onclick = () => {
      _pFont = card.dataset.font;
      document.querySelectorAll('#panel-font .font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      _posterDraw();
    };
  });

  // Wire photo upload (panel-photo in index.html)
  const photoZone  = document.getElementById('photoUploadZone');
  const photoInput = document.getElementById('studioPhotoInput');
  const photoCtrl  = document.getElementById('photoControls');
  const removeBtn  = document.getElementById('studioRemovePhoto');
  const blurSlider = document.getElementById('studioBlur');
  const blurVal    = document.getElementById('studioBlurVal');
  const dimSlider  = document.getElementById('studioDim');
  const dimVal     = document.getElementById('studioDimVal');

  if (photoZone)  photoZone.onclick  = () => photoInput?.click();
  if (photoInput) {
    photoInput.onchange = () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          _pPhotoImg = img;
          if (photoZone) {
            const txt = document.getElementById('photoDropText');
            if (txt) txt.textContent = 'Photo added — tap to change';
            photoZone.style.borderColor = 'rgba(232,197,71,0.5)';
          }
          photoCtrl?.classList.remove('hidden');
          _posterDraw();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };
  }
  if (removeBtn) {
    removeBtn.onclick = () => {
      _pPhotoImg = null;
      photoCtrl?.classList.add('hidden');
      if (photoZone) {
        const txt = document.getElementById('photoDropText');
        if (txt) txt.textContent = 'Tap to add a photo';
        photoZone.style.borderColor = '';
      }
      _posterDraw();
    };
  }
  if (blurSlider) {
    blurSlider.oninput = () => {
      _pPhotoBlur = parseInt(blurSlider.value);
      if (blurVal) blurVal.textContent = _pPhotoBlur;
      _posterUpdateSlider(blurSlider, _pPhotoBlur, 0, 15);
      _posterDraw();
    };
  }
  if (dimSlider) {
    dimSlider.oninput = () => {
      _pPhotoDim = parseInt(dimSlider.value);
      if (dimVal) dimVal.textContent = _pPhotoDim + '%';
      _posterUpdateSlider(dimSlider, _pPhotoDim, 0, 90);
      _posterDraw();
    };
  }

  // Wire photo filters
  document.querySelectorAll('#panel-photo .photo-filter').forEach(btn => {
    btn.onclick = () => {
      _pPhotoFilter = btn.dataset.filter;
      document.querySelectorAll('#panel-photo .photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _posterDraw();
    };
  });

  // Wire size picker
  document.querySelectorAll('.size-opt').forEach(opt => {
    opt.onclick = () => {
      _pSize = opt.dataset.size;
      document.getElementById('sizePicker')?.classList.add('hidden');
      _posterDraw();
    };
  });
  document.getElementById('sizeCancelBtn')?.addEventListener('click', () => {
    document.getElementById('sizePicker')?.classList.add('hidden');
  });

  // Wire ceremony
  document.getElementById('cerDownload')?.addEventListener('click', _posterDownloadFinal);
  document.getElementById('cerShare')?.addEventListener('click',    _posterShareFinal);
  document.getElementById('ceremonyBack')?.addEventListener('click', () => {
    document.getElementById('ceremonyOverlay')?.classList.add('hidden');
  });

  // Initial render
  requestAnimationFrame(() => _posterDraw());
};

window.closePosterStudio = function() {
  document.getElementById('studioOverlay')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
};

/* ── Tab switch ── */
function _posterSwitchTab(tab) {
  document.querySelectorAll('.dock-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
  const panelMap = { color:'panel-color', font:'panel-font', photo:'panel-photo' };
  document.getElementById(panelMap[tab])?.classList.add('active');
}

/* ── Slider gradient ── */
function _posterUpdateSlider(el, val, min, max) {
  const pct = ((val - min) / (max - min)) * 100;
  el.style.background = `linear-gradient(to right,#E8C547 ${pct}%,rgba(255,255,255,0.12) ${pct}%)`;
}

/* ============================================================
   DRAW
============================================================ */
function _posterDraw() {
  const canvas = document.getElementById('studioCanvas');
  if (!canvas) return;

  const size  = POSTER_SIZES[_pSize] || POSTER_SIZES['instagram-square'];
  const W = size.w, H = size.h;

  // Fit into stage
  const stage  = canvas.parentElement;
  const maxW   = (stage?.clientWidth  || 340) - 16;
  const maxH   = (stage?.clientHeight || 500) - 48;
  const scale  = Math.min(maxW / W, maxH / H, 1);
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = Math.round(W * scale) + 'px';
  canvas.style.height = Math.round(H * scale) + 'px';

  const ctx = canvas.getContext('2d');
  _posterRenderToCtx(ctx, W, H);

  // Also render ceremony thumb if overlay visible
  if (!document.getElementById('ceremonyOverlay')?.classList.contains('hidden')) {
    _renderCeremonyThumb();
  }
}

function _posterRenderToCtx(ctx, W, H) {
  const theme = POSTER_THEMES[_pTheme] || POSTER_THEMES['midnight-gold'];
  const font  = POSTER_FONTS[_pFont]   || POSTER_FONTS.playfair;
  const pad   = W * 0.07;
  const innerW = W - pad * 2;

  const emotion   = _pPost?.emotion || 'Nostalgia';
  const vibeColor = POSTER_VIBE_COLORS[emotion] || theme.accent;
  const vibeLabel = POSTER_VIBE_LABELS[emotion] || emotion;

  ctx.clearRect(0, 0, W, H);

  /* ── Background gradient ── */
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, theme.bg1);
  bg.addColorStop(1, theme.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ── Photo layer ── */
  if (_pPhotoImg) {
    ctx.save();
    // Blur via shadow trick (canvas has no native blur, use offscreen)
    if (_pPhotoBlur > 0) {
      ctx.filter = `blur(${_pPhotoBlur}px)`;
    }
    if (_pPhotoFilter === 'warm')     ctx.filter += ' sepia(50%) saturate(130%)';
    if (_pPhotoFilter === 'cool')     ctx.filter += ' hue-rotate(20deg) saturate(80%)';
    if (_pPhotoFilter === 'dramatic') ctx.filter += ' contrast(130%) saturate(120%)';
    if (_pPhotoFilter === 'vintage')  ctx.filter += ' sepia(40%) contrast(110%)';
    ctx.filter = ctx.filter.trim();

    const r = Math.max(W / _pPhotoImg.naturalWidth, H / _pPhotoImg.naturalHeight);
    const iw = _pPhotoImg.naturalWidth  * r;
    const ih = _pPhotoImg.naturalHeight * r;
    ctx.drawImage(_pPhotoImg, (W - iw) / 2, (H - ih) / 2, iw, ih);
    ctx.filter = 'none';

    // Dim overlay
    ctx.globalAlpha = _pPhotoDim / 100;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ── Brightness tweak ── */
  if (_pBrightness !== 100) {
    ctx.save();
    ctx.globalAlpha = Math.abs(_pBrightness - 100) / 100 * 0.55;
    ctx.fillStyle   = _pBrightness < 100 ? '#000' : '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ── Emotion vignette ── */
  ctx.save();
  const vig = ctx.createRadialGradient(W * 0.25, H * 0.25, 0, W * 0.5, H * 0.5, W * 0.9);
  vig.addColorStop(0, vibeColor + '20');
  vig.addColorStop(1, 'transparent');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* ── Top shimmer line ── */
  ctx.save();
  const shimmer = ctx.createLinearGradient(pad, 0, W - pad, 0);
  shimmer.addColorStop(0, 'transparent');
  shimmer.addColorStop(0.5, vibeColor);
  shimmer.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.75;
  ctx.fillStyle   = shimmer;
  ctx.fillRect(pad, 0, W - pad * 2, 2);
  ctx.restore();

  /* ── Left accent bar ── */
  ctx.save();
  const barH  = H * 0.42;
  const barY  = (H - barH) / 2;
  const barX  = pad - W * 0.026;
  const barW  = W * 0.007;
  const barGr = ctx.createLinearGradient(0, barY, 0, barY + barH);
  barGr.addColorStop(0, 'transparent');
  barGr.addColorStop(0.3, vibeColor);
  barGr.addColorStop(0.7, vibeColor);
  barGr.addColorStop(1, 'transparent');
  ctx.fillStyle   = barGr;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.restore();

  /* ── MARGO wordmark ── */
  const margoSz = Math.max(22, W * 0.055);
  ctx.save();
  ctx.font         = `800 ${margoSz}px 'Syne',sans-serif`;
  ctx.fillStyle    = vibeColor;
  ctx.globalAlpha  = 0.9;
  ctx.textBaseline = 'top';
  ctx.fillText('MARGO', pad, pad * 0.75);
  ctx.restore();

  /* ── Lyric text ── */
  const lyric  = _pPost?.text || '';
  const maxFS  = Math.min(W * 0.072, H * 0.055);
  let fontSize = maxFS;
  const fStr   = () => `${font.style === 'italic' ? 'italic ' : ''}${font.weight} ${fontSize}px ${font.css}`;

  ctx.font = fStr();
  let lines = _posterWrap(ctx, lyric, innerW);
  if (lines.length > 6) {
    fontSize = Math.max(W * 0.032, maxFS * (6 / lines.length));
    ctx.font = fStr();
    lines = _posterWrap(ctx, lyric, innerW);
  }

  const lh     = fontSize * 1.5;
  const blockH = lines.length * lh;
  const startY = H * 0.38 - blockH / 2;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.shadowColor   = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur    = 18;
  lines.forEach((line, i) => {
    ctx.globalAlpha = 1 - i / lines.length * 0.06;
    ctx.fillStyle   = theme.text;
    ctx.fillText(line, pad, startY + i * lh);
  });
  ctx.restore();

  /* ── Vibe pill ── */
  const tagFS  = Math.max(14, W * 0.022);
  const tagY   = startY + blockH + lh * 0.65;
  ctx.save();
  ctx.font = `700 ${tagFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle';
  const tagPH = W * 0.022;
  const tagPV = W * 0.01;
  const tagW  = ctx.measureText(vibeLabel.toUpperCase()).width + tagPH * 2;
  const tagH  = tagFS + tagPV * 2;
  const tagR  = tagH / 2;

  ctx.globalAlpha = 0.16;
  ctx.fillStyle   = vibeColor;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, tagY, tagW, tagH, tagR) : ctx.rect(pad, tagY, tagW, tagH);
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = vibeColor;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pad, tagY, tagW, tagH, tagR) : ctx.rect(pad, tagY, tagW, tagH);
  ctx.stroke();

  ctx.globalAlpha = 0.92;
  ctx.fillStyle   = vibeColor;
  ctx.fillText(vibeLabel.toUpperCase(), pad + tagPH, tagY + tagH / 2);
  ctx.restore();

  /* ── Song / artist ── */
  const k       = _pPost?.knowledge || {};
  const metaFS  = Math.max(14, W * 0.022);
  const bottomY = H - pad;

  if (k.song || k.artist) {
    ctx.save();
    ctx.font         = `700 ${metaFS}px 'DM Sans',sans-serif`;
    ctx.fillStyle    = theme.text;
    ctx.globalAlpha  = 0.8;
    ctx.textBaseline = 'bottom';
    let str = [k.song ? `♪ ${k.song}` : '', k.artist ? ` — ${k.artist}` : ''].join('');
    while (ctx.measureText(str).width > innerW * 0.72 && str.length > 4) str = str.slice(0, -4) + '…';
    ctx.fillText(str, pad, bottomY);
    ctx.restore();

    /* artist line below */
    if (k.artist) {
      ctx.save();
      ctx.font         = `400 ${Math.max(12, W * 0.018)}px 'Space Mono',monospace`;
      ctx.fillStyle    = vibeColor;
      ctx.globalAlpha  = 0.55;
      ctx.textBaseline = 'bottom';
      ctx.fillText(k.artist, pad, bottomY - metaFS * 1.4);
      ctx.restore();
    }
  }

  /* ── trymargo.com watermark ── */
  const waterFS = Math.max(11, W * 0.016);
  ctx.save();
  ctx.font         = `400 ${waterFS}px 'Space Mono',monospace`;
  ctx.fillStyle    = theme.text;
  ctx.globalAlpha  = 0.22;
  ctx.textBaseline = 'bottom';
  ctx.textAlign    = 'center';
  ctx.fillText('trymargo.com', W / 2, H - pad * 0.5);
  ctx.restore();

  /* ── YouTube thumbnail ── */
  if (_pThumbImg?.complete && _pThumbImg.naturalWidth) {
    try {
      const tS = Math.round(W * 0.09);
      const tX = W - pad - tS;
      const tY = bottomY - tS - metaFS * 1.6;
      ctx.save();
      ctx.beginPath();
      const tR = tS * 0.14;
      ctx.roundRect ? ctx.roundRect(tX, tY, tS, tS, tR) : ctx.rect(tX, tY, tS, tS);
      ctx.clip();
      ctx.drawImage(_pThumbImg, tX, tY, tS, tS);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tX, tY, tS, tS, tR) : ctx.rect(tX, tY, tS, tS);
      ctx.stroke();
      ctx.restore();
    } catch (_) {}
  }
}

function _posterWrap(ctx, text, maxW) {
  const words = text.split(' ');
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

/* ============================================================
   EXPORT
============================================================ */
async function _posterExport() {
  const exportBtn = document.getElementById('studioExportBtn');
  if (exportBtn) { exportBtn.textContent = '…'; exportBtn.disabled = true; }

  const size = POSTER_SIZES[_pSize] || POSTER_SIZES['instagram-square'];
  const offscreen = document.createElement('canvas');
  offscreen.width  = size.w;
  offscreen.height = size.h;
  const ctx = offscreen.getContext('2d');

  // Load fonts
  try {
    const f = POSTER_FONTS[_pFont] || POSTER_FONTS.playfair;
    await Promise.all([
      document.fonts.load(`${f.weight} 48px ${f.css}`),
      document.fonts.load(`800 48px 'Syne',sans-serif`),
      document.fonts.load(`700 24px 'Space Mono',monospace`),
      document.fonts.load(`700 24px 'DM Sans',sans-serif`),
    ]);
  } catch (_) {}

  _posterRenderToCtx(ctx, size.w, size.h);

  // Show ceremony overlay
  const blob = offscreen.toDataURL('image/png', 0.92);
  const ceremonyThumb = document.getElementById('ceremonyThumb');
  if (ceremonyThumb) {
    const tW = Math.min(260, window.innerWidth * 0.7);
    const tH = Math.round(tW * size.h / size.w);
    ceremonyThumb.width  = size.w;
    ceremonyThumb.height = size.h;
    ceremonyThumb.style.width  = tW + 'px';
    ceremonyThumb.style.height = tH + 'px';
    const tCtx = ceremonyThumb.getContext('2d');
    _posterRenderToCtx(tCtx, size.w, size.h);
  }

  // Store blob for download/share
  window._posterExportBlob = blob;
  document.getElementById('ceremonyOverlay')?.classList.remove('hidden');

  if (exportBtn) { exportBtn.textContent = 'Export'; exportBtn.disabled = false; }
}

function _renderCeremonyThumb() {
  const thumb = document.getElementById('ceremonyThumb');
  if (!thumb) return;
  const size = POSTER_SIZES[_pSize] || POSTER_SIZES['instagram-square'];
  thumb.width  = size.w;
  thumb.height = size.h;
  _posterRenderToCtx(thumb.getContext('2d'), size.w, size.h);
}

function _posterDownloadFinal() {
  const blob = window._posterExportBlob;
  if (!blob) return;
  const size = POSTER_SIZES[_pSize] || POSTER_SIZES['instagram-square'];
  const offscreen = document.createElement('canvas');
  offscreen.width  = size.w;
  offscreen.height = size.h;
  _posterRenderToCtx(offscreen.getContext('2d'), size.w, size.h);
  const link = document.createElement('a');
  const song = (_pPost?.knowledge?.song || 'lyric').replace(/\s+/g, '-').toLowerCase();
  link.download = `margo-${song}.png`;
  link.href     = offscreen.toDataURL('image/png', 0.92);
  link.click();
  if (typeof showToast === 'function') showToast('Saved ✓');
}

async function _posterShareFinal() {
  const size = POSTER_SIZES[_pSize] || POSTER_SIZES['instagram-square'];
  const offscreen = document.createElement('canvas');
  offscreen.width  = size.w;
  offscreen.height = size.h;
  _posterRenderToCtx(offscreen.getContext('2d'), size.w, size.h);

  offscreen.toBlob(async (blob) => {
    if (!blob) return;
    if (navigator.share && navigator.canShare?.({ files:[new File([blob],'margo.png',{type:'image/png'})] })) {
      try {
        await navigator.share({
          files: [new File([blob], 'margo.png', { type: 'image/png' })],
          title: 'Margo',
          text: _pPost?.text || '',
        });
      } catch (_) {}
    } else {
      // Fallback: download
      _posterDownloadFinal();
    }
  }, 'image/png', 0.92);
}

/* ── Resize ── */
let _pResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_pResizeTimer);
  _pResizeTimer = setTimeout(() => {
    if (!document.getElementById('studioOverlay')?.classList.contains('hidden')) {
      _posterDraw();
    }
  }, 120);
});
