/* ============================================================
   MARGO — js/studio.js
   Margo Studio: canvas rendering, poster designs, photo
   handling, size picker, ceremony export flow.
   Depends on: state.js, firebase.js (for APP_DOMAIN)
   v4.3
   ============================================================ */

function initStudio() {
  sharePosterBtn.onclick = openStudio;
  closeStudio.onclick    = () => {
    studioOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    openModal(postcardModal);
  };

  // Dock tabs
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.dock-tab').forEach(t  => t.classList.remove('active'));
      document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    };
  });

  // Color swatches
  document.querySelectorAll('.scene-swatch').forEach(swatch => {
    swatch.onclick = () => {
      document.querySelectorAll('.scene-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      studioDesign = swatch.dataset.design;
      refreshStageCanvas();
    };
  });

  // Brightness slider
  const bSlider = document.getElementById('studiobrightness');
  const bValEl  = document.getElementById('studioBrightnessVal');
  if (bSlider) {
    bSlider.oninput = () => {
      studioBrightness = parseInt(bSlider.value);
      if (bValEl) bValEl.textContent = studioBrightness + '%';
      refreshStageCanvas();
    };
  }

  // Font cards
  document.querySelectorAll('.font-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      studioFont = card.dataset.font;
      refreshStageCanvas();
    };
  });

  // Photo upload
  if (photoDropZone) {
    photoDropZone.onclick = () => studioPhotoInput?.click();
    photoDropZone.addEventListener('dragover', e => { e.preventDefault(); photoDropZone.classList.add('has-photo'); });
    photoDropZone.addEventListener('dragleave', e => {
      if (!photoDropZone.contains(e.relatedTarget)) photoDropZone.classList.remove('has-photo');
    });
    photoDropZone.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleStudioPhoto(f);
    });
  }
  if (studioPhotoInput) {
    studioPhotoInput.onchange = e => { const f = e.target.files[0]; if (f) handleStudioPhoto(f); };
  }

  // Blur / Dim sliders
  const blurSlider = document.getElementById('studioBlur');
  const blurValEl  = document.getElementById('studioBlurVal');
  const dimSlider  = document.getElementById('studioDim');
  const dimValEl   = document.getElementById('studioDimVal');
  if (blurSlider) blurSlider.oninput = () => { studioBlur = parseInt(blurSlider.value); if (blurValEl) blurValEl.textContent = studioBlur; refreshStageCanvas(); };
  if (dimSlider)  dimSlider.oninput  = () => { studioDim  = parseInt(dimSlider.value);  if (dimValEl)  dimValEl.textContent  = studioDim + '%'; refreshStageCanvas(); };

  // Photo filters
  document.querySelectorAll('.photo-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioFilter = btn.dataset.filter;
      refreshStageCanvas();
    };
  });

  // Remove photo
  const removeBtn = document.getElementById('studioRemovePhoto');
  if (removeBtn) removeBtn.onclick = () => {
    studioBgImage = null;
    if (photoDropText)    photoDropText.textContent = 'Tap to add a photo';
    if (photoDropZone)    photoDropZone.classList.remove('has-photo');
    if (photoControls)    photoControls.classList.add('hidden');
    if (studioPhotoInput) studioPhotoInput.value = '';
    refreshStageCanvas();
  };

  // Export / size picker
  studioExportBtn.onclick = () => sizePicker.classList.remove('hidden');
  sizeCancelBtn.onclick   = () => sizePicker.classList.add('hidden');

  document.querySelectorAll('.size-opt').forEach(btn => {
    btn.onclick = async () => {
      selectedSize = btn.dataset.size;
      sizePicker.classList.add('hidden');
      studioCanvas.classList.add('zoom-in');
      showToast('Generating…');
      try {
        generatedBlob = await generateFinalPoster(selectedSize);
      } catch (err) {
        console.error(err);
        showToast('Error generating poster');
        studioCanvas.classList.remove('zoom-in');
        return;
      }
      setTimeout(() => {
        studioCanvas.classList.remove('zoom-in');
        drawCeremonyThumb();
        ceremonyOverlay.classList.remove('hidden');
      }, 400);
    };
  });

  // Ceremony
  ceremonyBack.onclick = () => ceremonyOverlay.classList.add('hidden');
  cerDownload.onclick  = () => { if (!generatedBlob) { showToast('No poster yet'); return; } downloadPosterBlob(); showToast('Saved!'); };
  cerShare.onclick     = shareOrDownloadPoster;
}

function openStudio() {
  closeModal(postcardModal);
  studioBgImage    = null;
  studioFont       = 'playfair';
  studioBrightness = 100;
  studioBlur       = 0;
  studioDim        = 50;
  studioFilter     = 'none';
  generatedBlob    = null;
  selectedSize     = null;
  studioDesign     = EMOTION_DESIGN_MAP[currentPost?.emotion] || 'midnight-gold';
  studioOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  resetStudioUI();
  setTimeout(refreshStageCanvas, 60);
}

function resetStudioUI() {
  document.querySelectorAll('.dock-tab').forEach((t, i)  => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.dock-panel').forEach((p, i) => p.classList.toggle('active', i === 0));
  document.querySelectorAll('.scene-swatch').forEach(s   => s.classList.toggle('active', s.dataset.design === studioDesign));
  document.querySelectorAll('.font-card').forEach((fc, i) => fc.classList.toggle('active', i === 0));
  const bSlider = document.getElementById('studiobrightness');
  const bVal    = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.value = 100;
  if (bVal)    bVal.textContent = '100%';
  if (photoDropText)    photoDropText.textContent = 'Tap to add a photo';
  if (photoDropZone)    photoDropZone.classList.remove('has-photo');
  if (photoControls)    photoControls.classList.add('hidden');
  if (studioPhotoInput) studioPhotoInput.value = '';
  const bsl = document.getElementById('studioBlur'),  bvl = document.getElementById('studioBlurVal');
  const dsl = document.getElementById('studioDim'),   dvl = document.getElementById('studioDimVal');
  if (bsl) bsl.value = 0;  if (bvl) bvl.textContent = '0';
  if (dsl) dsl.value = 50; if (dvl) dvl.textContent = '50%';
  document.querySelectorAll('.photo-filter').forEach((f, i) => f.classList.toggle('active', i === 0));
  sizePicker.classList.add('hidden');
  ceremonyOverlay.classList.add('hidden');
}

// ── Canvas rendering ──
function getPhotoFilter() {
  let f = `brightness(${studioBrightness}%)`;
  const filters = {
    warm:     ' sepia(0.3) saturate(1.3) hue-rotate(-10deg)',
    cool:     ' saturate(0.85) hue-rotate(15deg)',
    dramatic: ' contrast(1.5) saturate(1.2) brightness(0.9)',
    vintage:  ' sepia(0.5) contrast(1.2)',
  };
  if (filters[studioFilter]) f += filters[studioFilter];
  return f;
}

function drawPosterToCtx(ctx, W, H) {
  const c  = POSTER_DESIGNS[studioDesign] || POSTER_DESIGNS['midnight-gold'];
  const fd = FONT_FAMILIES[studioFont]    || FONT_FAMILIES['playfair'];
  const scale = W / 1080;

  ctx.filter = 'none';

  // Background
  if (studioBgImage) {
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tc  = tmp.getContext('2d');
    const iw  = studioBgImage.naturalWidth  || studioBgImage.width;
    const ih  = studioBgImage.naturalHeight || studioBgImage.height;
    const imgScale = Math.max(W / iw, H / ih);
    tc.filter = getPhotoFilter();
    tc.drawImage(studioBgImage, (W - iw * imgScale) / 2, (H - ih * imgScale) / 2, iw * imgScale, ih * imgScale);
    tc.filter = 'none';
    if (studioBlur > 0) {
      const tmp2 = document.createElement('canvas');
      tmp2.width = W; tmp2.height = H;
      const tc2 = tmp2.getContext('2d');
      tc2.filter = `blur(${Math.max(1, studioBlur) * 2}px)`;
      tc2.drawImage(tmp, 0, 0);
      tc2.filter = 'none';
      ctx.filter = 'none';
      ctx.drawImage(tmp2, 0, 0);
    } else {
      ctx.filter = 'none';
      ctx.drawImage(tmp, 0, 0);
    }
    ctx.filter = 'none';
    ctx.fillStyle = `rgba(0,0,0,${studioDim / 100})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.filter = 'none';
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.bg[0]);
    g.addColorStop(0.5, c.bg[1]);
    g.addColorStop(1, c.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (studioBrightness !== 100) {
      const bDelta = (studioBrightness - 100) / 100;
      ctx.fillStyle = bDelta < 0
        ? `rgba(0,0,0,${Math.abs(bDelta) * 0.9})`
        : `rgba(255,255,255,${bDelta * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.filter = 'none';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  const textColor = studioBgImage ? '#ffffff' : c.text;
  if (studioBgImage) {
    ctx.shadowColor   = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur    = 14 * scale;
    ctx.shadowOffsetY = 2 * scale;
  }

  // MARGO wordmark
  ctx.textAlign  = 'left';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.fillStyle  = studioBgImage ? 'rgba(255,255,255,0.32)' : (c.primary + '88');
  ctx.font       = `700 ${22 * scale}px 'Space Mono', monospace`;
  ctx.fillText('MARGO', 52 * scale, 58 * scale);

  ctx.textAlign = 'center';

  // Lyric text
  const lyricText = currentPost.text.length > 100
    ? currentPost.text.substring(0, 97) + '…'
    : currentPost.text;

  if (studioBgImage) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18 * scale; }
  ctx.fillStyle = textColor;

  const lyricLen  = lyricText.length;
  const lyricSize = lyricLen < 40 ? 82 * scale
    : lyricLen < 65 ? 64 * scale
    : lyricLen < 90 ? 52 * scale
    : 42 * scale;

  const isBold = ['bebas','josefin','oswald'].includes(studioFont);
  ctx.font = `${fd.style === 'italic' ? 'italic ' : ''}${isBold ? '700' : '600'} ${lyricSize}px ${fd.family}`;
  wrapTextCenter(ctx, lyricText, W / 2, H * 0.46, W * 0.82, lyricSize * 1.18);

  // Song & Artist
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.filter = 'none'; ctx.textAlign = 'center';

  const k       = currentPost.knowledge || { song:'Unknown Song', artist:'Unknown Artist' };
  const songSize = Math.max(Math.round(lyricSize * 0.42), 28 * scale);
  const artSize  = Math.max(Math.round(lyricSize * 0.30), 20 * scale);
  const songY    = H * 0.76;
  const artistY  = songY + songSize + 16 * scale;

  let songColor, artistColor;
  if (studioBgImage) {
    songColor = '#ffffff'; artistColor = 'rgba(255,255,255,0.82)';
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 14 * scale; ctx.shadowOffsetY = 1 * scale;
  } else if (c.light) {
    songColor = c.primary; artistColor = 'rgba(42,37,32,0.7)';
  } else {
    songColor = c.primary; artistColor = 'rgba(255,255,255,0.72)';
  }

  ctx.fillStyle = songColor;
  ctx.font      = `700 ${songSize}px ${fd.family}`;
  ctx.fillText(k.song.length > 32 ? k.song.substring(0, 32) + '…' : k.song, W / 2, songY);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle   = artistColor;
  ctx.font        = `700 ${artSize}px 'Space Mono', monospace`;
  ctx.fillText(k.artist.length > 40 ? k.artist.substring(0, 40) + '…' : k.artist, W / 2, artistY);

  // Domain watermark
  const markSize  = Math.max(Math.round(18 * scale), 14);
  const markColor = studioBgImage ? 'rgba(255,255,255,0.75)'
    : c.light ? 'rgba(42,37,32,0.6)'
    : c.primary + 'cc';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle   = markColor;
  ctx.font        = `700 ${markSize}px 'Space Mono', monospace`;
  ctx.textAlign   = 'center';
  ctx.fillText(APP_DOMAIN, W / 2, H * 0.94);
}

function wrapTextCenter(ctx, text, x, centerY, maxW, lineHeight) {
  const words = text.split(' ');
  let line = '', lines = [];
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' '; }
    else line = test;
  });
  if (line.trim()) lines.push(line.trim());
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function refreshStageCanvas() {
  if (!currentPost || !studioCanvas) return;
  const stage  = studioCanvas.parentElement;
  const dpr    = window.devicePixelRatio || 1;
  const availW = stage.clientWidth  - 40;
  const availH = stage.clientHeight - 40;
  const size   = Math.max(80, Math.min(availW, availH, 700));
  studioCanvas.style.width  = size + 'px';
  studioCanvas.style.height = size + 'px';
  const res = Math.round(size * dpr);
  studioCanvas.width  = res;
  studioCanvas.height = res;
  const ctx = studioCanvas.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size));
}

async function generateFinalPoster(sizeKey) {
  const dim = POSTER_SIZES[sizeKey];
  if (!dim || !currentPost) return null;
  const offscreen = document.createElement('canvas');
  offscreen.width = dim.w; offscreen.height = dim.h;
  const ctx = offscreen.getContext('2d');
  await document.fonts.ready;
  drawPosterToCtx(ctx, dim.w, dim.h);
  return new Promise(resolve => offscreen.toBlob(blob => resolve(blob), 'image/png'));
}

function drawCeremonyThumb() {
  const dpr  = window.devicePixelRatio || 1;
  const size = 600;
  ceremonyThumb.width  = Math.round(size * dpr);
  ceremonyThumb.height = Math.round(size * dpr);
  ceremonyThumb.style.width  = '';
  ceremonyThumb.style.height = '';
  const ctx = ceremonyThumb.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size));
}

function handleStudioPhoto(file) {
  if (!file.type.startsWith('image/'))  { showToast('Please upload an image'); return; }
  if (file.size > 15 * 1024 * 1024)    { showToast('File too large (max 15MB)'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      studioBgImage = img;
      if (photoDropText) photoDropText.textContent = file.name;
      if (photoDropZone) photoDropZone.classList.add('has-photo');
      if (photoControls) photoControls.classList.remove('hidden');
      showToast('Photo added');
      refreshStageCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function shareOrDownloadPoster() {
  if (!generatedBlob) { showToast('Generating…'); return; }
  const file = new File([generatedBlob], `margo-poster-${Date.now()}.png`, { type: 'image/png' });
  const shareData = {
    title: `MARGO — ${currentPost?.text?.substring(0, 50) || 'Lyric'}`,
    text:  `"${currentPost?.text || ''}"`,
    files: [file]
  };
  let shared = false;
  try {
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      shared = true;
      showToast('Shared!');
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  if (!shared) { downloadPosterBlob(); showToast('Saved to device!'); }
}

function downloadPosterBlob() {
  if (!generatedBlob) return;
  const a   = document.createElement('a');
  const url = URL.createObjectURL(generatedBlob);
  a.href     = url;
  a.download = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
