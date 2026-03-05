(function() {
/* ============================================================
   MARGO — js/poster.js  v1.2
   Self-contained poster studio, separate from gif-studio.js.
   Works with the existing #studioOverlay HTML in index.html.
   Called by share-sheet.js via window.openPosterStudio(post).
   FIX v1.1: exportBtn wired via addEventListener (not onclick)
             so studio.js IIFE binding does not double-fire.
   FIX v1.2: window.drawPosterPreview exposed for share-sheet preview.
             Song/artist/watermark layout matches GIF style.
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

/* ── Track whether export button listener is attached ── */
let _pExportBound = false;

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

  // Wire close button — use onclick so app.js patchStudioBackButtons
  // can override it cleanly with its own reopenShareSheet logic
  const closeBtn = document.getElementById('closeStudio');
  if (closeBtn) {
    closeBtn.onclick = () => window.closePosterStudio();
  }

  // Wire export button — bind once only to avoid double-fire with
  // studio.js IIFE which may have already added an addEventListener
  const exportBtn = document.getElementById('studioExportBtn');
  if (exportBtn && !_pExportBound) {
    exportBtn.addEventListener('click', _posterExport);
    _pExportBound = true;
  }
  // Always make sure onclick from studio.js IIFE is cleared
  if (exportBtn) exportBtn.onclick = null;

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



  /* ── MARGO wordmark — always gold like GIF ── */
  const margoSz = Math.max(22, W * 0.055);
  ctx.save();
  ctx.font         = `800 ${margoSz}px 'Syne',sans-serif`;
  ctx.fillStyle    = '#E8C547';
  ctx.globalAlpha  = 0.9;
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'left';
  ctx.fillText('MARGO', pad, pad * 0.75);
  ctx.restore();

  /* ── Lyric text — centered like GIF ── */
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
  ctx.textAlign    = 'center';
  ctx.shadowColor   = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur    = 18;
  lines.forEach((line, i) => {
    ctx.globalAlpha = 1 - i / lines.length * 0.06;
    ctx.fillStyle   = theme.text;
    ctx.fillText(line, W / 2, startY + i * lh);
  });
  ctx.restore();



  /* ── Song / artist — GIF style (centered, vibe color song name) ── */
  const k      = _pPost?.knowledge || {};
  const metaFS = Math.max(14, W * 0.038);

  if (k.song) {
    ctx.save();
    ctx.font         = `700 ${metaFS}px 'Space Mono',monospace`;
    ctx.fillStyle    = '#E8C547';
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'bottom';
    ctx.textAlign    = 'center';
    let songStr = k.song;
    while (ctx.measureText(songStr).width > innerW * 0.88 && songStr.length > 4)
      songStr = songStr.slice(0, -4) + '…';
    ctx.fillText(songStr, W / 2, H * 0.78);
    ctx.restore();
  }

  if (k.artist) {
    ctx.save();
    ctx.font         = `400 ${Math.max(12, W * 0.028)}px 'Space Mono',monospace`;
    ctx.fillStyle    = 'rgba(255,255,255,0.45)';
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'bottom';
    ctx.textAlign    = 'center';
    let artStr = k.artist;
    while (ctx.measureText(artStr).width > innerW * 0.88 && artStr.length > 4)
      artStr = artStr.slice(0, -4) + '…';
    ctx.fillText(artStr, W / 2, H * 0.78 + metaFS * 1.1);
    ctx.restore();
  }

  /* ── trymargo.com watermark pill — GIF style ── */
  const waterFS = Math.max(11, W * 0.026);
  ctx.save();
  ctx.font = `700 ${waterFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';
  const wText  = 'trymargo.com';
  const wW     = ctx.measureText(wText).width + W * 0.05;
  const wH     = waterFS * 1.7;
  const wX     = W / 2 - wW / 2;
  const wY     = H * 0.92 - wH / 2;
  const wR     = wH / 2;
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(wX, wY, wW, wH, wR) : ctx.rect(wX, wY, wW, wH);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(wText, W / 2, wY + wH / 2);
  ctx.restore();
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

/* ── Public preview — called by share-sheet.js ssStartPreview ──
   Sets _pPost then renders to the passed ctx/W/H. ── */
window.drawPosterPreview = function(ctx, W, H, post) {
  if (!post) return;
  _pPost = post;
  _posterRenderToCtx(ctx, W, H);
};

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
})();
