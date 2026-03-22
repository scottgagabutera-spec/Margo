/* ── Logo matching Lyric Back Poster ── */
  const _th = {acc: design.accentColor || "#E8C547", light: design.textColor==="#000000"||design.textColor==="#1a1a20"};
  stDrawWordmark(ctx, W, H, _th);
  stDrawWatermark(ctx, W, H, _th);
  stDrawMmark(ctx, W, H, _th);
  /* ── Lyric text ── */
  const lyricText = post.text || '';
  let fontSize = Math.min(W * 0.072, H * 0.055);
  const fStyle = font.style === 'italic' ? 'italic ' : '';
  ctx.font = `${fStyle}${font.weight} ${fontSize}px ${font.css}`;

  const lines = _studioWrapText(ctx, lyricText, innerW);
  if (lines.length > 6) {
    fontSize = Math.max(W * 0.032, fontSize * (6 / lines.length));
    ctx.font = `${fStyle}${font.weight} ${fontSize}px ${font.css}`;
  }

  const lh     = fontSize * 1.45;
  const blockH = lines.length * lh;
  const startY = H * 0.38 - blockH / 2;

  ctx.save();
  ctx.textBaseline  = 'top';
  ctx.textAlign     = 'left';
  ctx.shadowColor   = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur    = 16;
  ctx.shadowOffsetY = 2;
  lines.forEach((line, i) => {
    ctx.globalAlpha = 1 - (i / lines.length) * 0.08;
    ctx.fillStyle   = design.textColor;
    ctx.fillText(line, pad, startY + i * lh);
  });
  ctx.restore();

  /* ── Vibe tag ── */
  const vibeLabel = VIBE_LABELS[emotion] || emotion;
  const tagFS  = Math.max(14, W * 0.022);
  const tagY   = startY + blockH + lh * 0.6;
  ctx.save();
  ctx.font         = `700 ${tagFS}px 'Space Mono', monospace`;
  ctx.textBaseline = 'middle';
  const tagPad = W * 0.022;
  const tagW   = ctx.measureText(vibeLabel.toUpperCase()).width + tagPad * 2;
  const tagH   = tagFS + W * 0.012;
  const tagR   = tagH / 2;
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = vibeColor;
  if (ctx.roundRect) ctx.roundRect(pad, tagY, tagW, tagH, tagR);
  else { ctx.beginPath(); ctx.rect(pad, tagY, tagW, tagH); }
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = vibeColor;
  ctx.lineWidth   = 1.5;
  if (ctx.roundRect) ctx.roundRect(pad, tagY, tagW, tagH, tagR);
  else { ctx.beginPath(); ctx.rect(pad, tagY, tagW, tagH); }
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle   = vibeColor;
  ctx.fillText(vibeLabel.toUpperCase(), pad + tagPad, tagY + tagH / 2);
  ctx.restore();

  /* ── Song + artist ── */
  const k = post.knowledge || {};
  if (k.song || k.artist) {
    ctx.save();
    const metaFS = Math.max(14, W * 0.022);
    ctx.font         = `700 ${metaFS}px 'DM Sans', sans-serif`;
    ctx.fillStyle    = design.textColor;
    ctx.globalAlpha  = 0.85;
    ctx.textBaseline = 'bottom';
    let str = (k.song ? `♪ ${k.song}` : '') + (k.artist ? ` — ${k.artist}` : '');
    const maxW = innerW * 0.75;
    while (ctx.measureText(str).width > maxW && str.length > 4) str = str.slice(0, -4) + '…';
    ctx.fillText(str, pad, H - pad * 0.9);
    ctx.restore();
  }

  /* ── Thumbnail ── */
  const thumbImg = document.getElementById('_studioThumbImg');
  if (thumbImg && thumbImg.complete && thumbImg.naturalWidth) {
    try {
      const tSz = Math.round(W * 0.09);
      const tX  = W - pad - tSz;
      const tY  = H - pad * 0.9 - tSz - 4;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(tX, tY, tSz, tSz, tSz * 0.15);
      else ctx.rect(tX, tY, tSz, tSz);
      ctx.clip();
      ctx.drawImage(thumbImg, tX, tY, tSz, tSz);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = vibeColor;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(tX, tY, tSz, tSz, tSz * 0.15);
      else ctx.rect(tX, tY, tSz, tSz);
      ctx.stroke();
      ctx.restore();
    } catch (_) {}
  }
};

/* ══════════════════════════════════════════════════════════
   STAGE CANVAS REFRESH
══════════════════════════════════════════════════════════ */
function refreshStageCanvas() {
  const canvas = document.getElementById('studioCanvas');
  if (!canvas) return;
  const post = studioPost || window.currentPost;
  if (!post)  return;

  const size  = CANVAS_SIZES[studioCanvasSize] || CANVAS_SIZES.square;
  const stage = canvas.parentElement;
  if (!stage) return;

  const maxW  = stage.clientWidth  || 320;
  const maxH  = (stage.clientHeight || 380) - 20;
  const scale = Math.min(maxW / size.w, maxH / size.h, 1);

  canvas.width        = size.w;
  canvas.height       = size.h;
  canvas.style.width  = Math.round(size.w * scale) + 'px';
  canvas.style.height = Math.round(size.h * scale) + 'px';

  const ctx = canvas.getContext('2d');
  window.drawPosterToCtx(ctx, size.w, size.h, post);
}

/* ══════════════════════════════════════════════════════════
   SLIDER GRADIENT HELPER
══════════════════════════════════════════════════════════ */
function _updateSlider(slider, value) {
  const min = parseInt(slider.min || 0);
  const max = parseInt(slider.max || 100);
  const pct = ((value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right,#E8C547 ${pct}%,rgba(255,255,255,0.12) ${pct}%)`;
}

/* ══════════════════════════════════════════════════════════
   WIRE UP THE HTML PANELS (panel-color, panel-font, panel-photo)
   These IDs come directly from index.html
══════════════════════════════════════════════════════════ */
function wireColorPanel() {
  const panel = document.getElementById('panel-color');
  if (!panel) return;

  /* Wire existing scene swatches from HTML */
  panel.querySelectorAll('.scene-swatch').forEach(btn => {
    const designId = btn.dataset.design;
    if (designId === studioDesign) btn.classList.add('active');
    btn.onclick = () => {
      studioDesign = designId;
      panel.querySelectorAll('.scene-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });

  /* Brightness slider */
  const slider = document.getElementById('studiobrightness');
  const val    = document.getElementById('studioBrightnessVal');
  if (slider) {
    _updateSlider(slider, studioBrightness);
    slider.oninput = () => {
      studioBrightness = parseInt(slider.value);
      if (val) val.textContent = studioBrightness + '%';
      _updateSlider(slider, studioBrightness);
      refreshStageCanvas();
    };
  }
}

function wireFontPanel() {
  const panel = document.getElementById('panel-font');
  if (!panel) return;

  panel.querySelectorAll('.font-card').forEach(btn => {
    const fontId = btn.dataset.font;
    if (fontId === studioFont) btn.classList.add('active');
    btn.onclick = () => {
      studioFont = fontId;
      panel.querySelectorAll('.font-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });
}

function wirePhotoPanel() {
  const panel = document.getElementById('panel-photo');
  if (!panel) return;

  const dropZone  = document.getElementById('photoUploadZone');
  const fileInput = document.getElementById('studioPhotoInput');
  const controls  = document.getElementById('photoControls');
  const dropText  = document.getElementById('photoDropText');
  const blurSlider= document.getElementById('studioBlur');
  const blurVal   = document.getElementById('studioBlurVal');
  const dimSlider = document.getElementById('studioDim');
  const dimVal    = document.getElementById('studioDimVal');
  const removeBtn = document.getElementById('studioRemovePhoto');

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('has-photo'); };
    dropZone.ondragleave = () => { if (!studioPhotoData) dropZone.classList.remove('has-photo'); };
    dropZone.ondrop = e => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) _loadPhotoFile(file, dropZone, controls, dropText);
    };
    fileInput.onchange = () => {
      const file = fileInput.files?.[0];
      if (file) _loadPhotoFile(file, dropZone, controls, dropText);
    };
  }

  if (blurSlider) {
    _updateSlider(blurSlider, studioBlur);
    blurSlider.oninput = () => {
      studioBlur = parseInt(blurSlider.value);
      if (blurVal) blurVal.textContent = studioBlur;
      _updateSlider(blurSlider, studioBlur);
      refreshStageCanvas();
    };
  }

  if (dimSlider) {
    _updateSlider(dimSlider, studioDim);
    dimSlider.oninput = () => {
      studioDim = parseInt(dimSlider.value);
      if (dimVal) dimVal.textContent = studioDim + '%';
      _updateSlider(dimSlider, studioDim);
      refreshStageCanvas();
    };
  }

  panel.querySelectorAll('.photo-filter').forEach(btn => {
    btn.onclick = () => {
      studioPhotoFilter = btn.dataset.filter;
      panel.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshStageCanvas();
    };
  });

  if (removeBtn) {
    removeBtn.onclick = () => {
      studioPhotoData = null;
      document.getElementById('_studioPhotoImg')?.remove();
      if (dropZone)  dropZone.classList.remove('has-photo');
      if (controls)  controls.classList.add('hidden');
      if (dropText)  dropText.textContent = 'Tap to add a photo';
      refreshStageCanvas();
    };
  }
}

function _loadPhotoFile(file, dropZone, controls, dropText) {
  const reader = new FileReader();
  reader.onload = e => {
    studioPhotoData = e.target.result;
    let imgEl = document.getElementById('_studioPhotoImg');
    if (!imgEl) {
      imgEl = document.createElement('img');
      imgEl.id = '_studioPhotoImg';
      imgEl.style.display = 'none';
      document.body.appendChild(imgEl);
    }
    imgEl.onload = () => {
      if (dropZone) dropZone.classList.add('has-photo');
      if (controls) controls.classList.remove('hidden');
      if (dropText)  dropText.textContent = 'Tap to change photo';
      refreshStageCanvas();
    };
    imgEl.src = studioPhotoData;
  };
  reader.readAsDataURL(file);
}

/* ══════════════════════════════════════════════════════════
   DOCK TAB SWITCHING
══════════════════════════════════════════════════════════ */
function _switchDockTab(tabId) {
  document.querySelectorAll('.dock-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  const panelIds = {
    color: ['panel-color', 'dockColorPanel'],
    font:  ['panel-font',  'dockFontPanel'],
    photo: ['panel-photo', 'dockPhotoPanel'],
  };
  Object.values(panelIds).flat().forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  (panelIds[tabId] || []).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  });
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
   FIX v5.7: openStudio now delegates to openPosterStudio
   if poster.js is loaded, so the share sheet "Studio" button
   never navigates to the landing page.
══════════════════════════════════════════════════════════ */
window.openStudio = function(post) {
  /* Delegate to poster.js if available — it owns the overlay */
  if (typeof window.openPosterStudio === 'function') {
    return window.openPosterStudio(post || window.currentPost);
  }

  /* Fallback: studio.js direct open (poster.js not loaded) */
  studioPost = post || window.currentPost;
  if (!studioPost) return;

  injectStudioStyles();

  const overlay = document.getElementById('studioOverlay');
  if (!overlay) return;

  /* Preload thumbnail */
  const thumb = studioPost.youtubeMeta?.thumbnailSm || studioPost.youtubeMeta?.thumbnail;
  if (thumb) {
    let thumbEl = document.getElementById('_studioThumbImg');
    if (!thumbEl) {
      thumbEl = document.createElement('img');
      thumbEl.id = '_studioThumbImg';
      thumbEl.style.display = 'none';
      thumbEl.crossOrigin = 'anonymous';
      document.body.appendChild(thumbEl);
    }
    thumbEl.src = thumb;
  }

  overlay.classList.remove('hidden');
  document.body.classList.add('modal-open');

  wireColorPanel();
  wireFontPanel();
  wirePhotoPanel();

  _switchDockTab('color');

  requestAnimationFrame(() => refreshStageCanvas());
};

window.closeStudio = function() {
  document.getElementById('studioOverlay')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
};

/* ══════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════ */
async function exportPoster() {
  const btn = document.getElementById('studioExportBtn');
  if (btn) { btn.innerHTML = '<span class="studio-spinner"></span>'; btn.disabled = true; }

  const size   = CANVAS_SIZES[studioCanvasSize] || CANVAS_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width  = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');

  try {
    const font = STUDIO_FONTS.find(f => f.id === studioFont) || STUDIO_FONTS[0];
    await document.fonts.load(`${font.weight} 48px ${font.css}`);
    await document.fonts.load(`800 48px 'Syne', sans-serif`);
    await document.fonts.load(`700 24px 'Space Mono', monospace`);
    await document.fonts.load(`700 24px 'DM Sans', sans-serif`);
  } catch (_) {}

  window.drawPosterToCtx(ctx, size.w, size.h, studioPost || window.currentPost);

  const post = studioPost || window.currentPost || {};
  const name = (post.knowledge?.song || 'lyric').replace(/\s+/g, '-').toLowerCase();
  const link = document.createElement('a');
  link.download = `margo-${name}.png`;
  link.href     = canvas.toDataURL('image/png', 0.93);
  link.click();

  if (btn) {
    btn.disabled    = false;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#4ade80';
    btn.style.color      = '#0B0B0D';
    setTimeout(() => {
      btn.style.background = '';
      btn.style.color      = '';
      btn.textContent = 'Export';
    }, 2200);
  }
  if (typeof showToast === 'function') showToast('Saved to downloads ✓');
}

/* ══════════════════════════════════════════════════════════
   STUDIO CHOOSER
══════════════════════════════════════════════════════════ */
window.openStudioChooser = function(post) {
  if (post) { studioPost = post; window.currentPost = post; }
  if (typeof window.openShareSheet === 'function') {
    window.openShareSheet(studioPost || window.currentPost);
  }
};
window.closeStudioChooser = function() {
  // No-op — share sheet handles its own close
};

/* ══════════════════════════════════════════════════════════
   RESIZE
══════════════════════════════════════════════════════════ */
let _studioResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_studioResizeTimer);
  _studioResizeTimer = setTimeout(() => {
    if (!document.getElementById('studioOverlay')?.classList.contains('hidden')) {
      refreshStageCanvas();
    }
  }, 150);
});

/* ══════════════════════════════════════════════════════════
   INIT — bind events already in HTML
   NOTE: studioExportBtn is NOT bound here — poster.js owns
   it when openPosterStudio() is called, preventing double-fire.
══════════════════════════════════════════════════════════ */
(function initStudio() {
  injectStudioStyles();

  /* Close button is handled by app.js patchStudioBackButtons — do not bind here */

  /* Bind dock tabs */
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => _switchDockTab(tab.dataset.tab);
  });
})();
})();
