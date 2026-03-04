/* ============================================================
   MARGO — js/studio.js
   Image Studio (canvas → PNG)
   v5.4 — concept-v2 clean:
          • postcardModal references removed entirely
          • openStudio() no longer calls closeModal(postcardModal)
          • closeStudio routes back to reopenShareSheet()
          • All exports and controls fully functional
   ============================================================ */

/* ── GIF studio dock tabs ── */
function initGifStudioTabs() {
  const ov = document.getElementById('gifStudioOverlay');
  if (!ov) return;
  ov.querySelectorAll('.gs-tab').forEach(tab => {
    tab.onclick = () => {
      ov.querySelectorAll('.gs-tab').forEach(t  => t.classList.remove('active'));
      ov.querySelectorAll('.gs-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = ov.querySelector(`#gs-panel-${tab.dataset.gstab}`);
      if (panel) panel.classList.add('active');
    };
  });
}

/* ════════════════════════════════════════
   IMAGE STUDIO
   ════════════════════════════════════════ */
function initStudio() {
  // closeStudio → back to share sheet (no postcardModal)
  const closeStudioEl = document.getElementById('closeStudio');
  if (closeStudioEl) {
    closeStudioEl.onclick = () => {
      studioOverlay.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (typeof reopenShareSheet === 'function') reopenShareSheet();
    };
  }

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

  // Photo upload zone
  const photoDropZone = document.getElementById('photoUploadZone');
  if (photoDropZone) {
    photoDropZone.onclick = () => studioPhotoInput?.click();
    photoDropZone.addEventListener('dragover', e => {
      e.preventDefault();
      photoDropZone.classList.add('has-photo');
    });
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
    const photoDropText = document.getElementById('photoDropText');
    const pDZ = document.getElementById('photoUploadZone');
    const photoControls = document.getElementById('photoControls');
    if (photoDropText) photoDropText.textContent = 'Tap to add a photo';
    if (pDZ) pDZ.classList.remove('has-photo');
    if (photoControls) photoControls.classList.add('hidden');
    if (studioPhotoInput) studioPhotoInput.value = '';
    const ytOpt = document.getElementById('ytBgOption');
    if (ytOpt) { ytOpt.style.background = ''; ytOpt.style.borderColor = ''; }
    refreshStageCanvas();
  };

  // Export / size picker
  if (studioExportBtn) studioExportBtn.onclick = () => sizePicker.classList.remove('hidden');
  if (sizeCancelBtn)   sizeCancelBtn.onclick   = () => sizePicker.classList.add('hidden');

  document.querySelectorAll('.size-opt').forEach(btn => {
    btn.onclick = async () => {
      selectedSize = btn.dataset.size;
      sizePicker.classList.add('hidden');
      studioCanvas.classList.add('zoom-in');

      ceremonyOverlay.classList.remove('hidden');
      const headlineEl = ceremonyOverlay.querySelector('.ceremony-headline');
      if (headlineEl) headlineEl.textContent = 'Generating your poster…';
      const actionsEl = ceremonyOverlay.querySelector('.ceremony-actions');
      if (actionsEl) actionsEl.style.opacity = '0.4';

      try {
        generatedBlob = await generateFinalPoster(selectedSize);
      } catch (err) {
        console.error('Poster generation error:', err);
        showToast('Error generating poster — try again');
        studioCanvas.classList.remove('zoom-in');
        ceremonyOverlay.classList.add('hidden');
        return;
      }

      setTimeout(() => {
        studioCanvas.classList.remove('zoom-in');
        drawCeremonyThumb();
        if (headlineEl) headlineEl.textContent = 'Your poster is ready.';
        if (actionsEl) actionsEl.style.opacity = '1';
      }, 400);
    };
  });

  // Ceremony actions
  if (ceremonyBack) {
    ceremonyBack.onclick = () => {
      ceremonyOverlay.classList.add('hidden');
      generatedBlob = null;
    };
  }

  if (cerDownload) {
    cerDownload.onclick = async () => {
      if (!generatedBlob) { showToast('Generating poster…'); return; }
      try {
        downloadPosterBlob();
        showToast('Saved to device ✓');
      } catch (err) {
        showToast('Download failed — try again');
        console.error('Download error:', err);
      }
    };
  }

  if (cerShare) cerShare.onclick = shareOrDownloadPoster;

  initGifStudioTabs();
  if (typeof initGifStudio === 'function') initGifStudio();
}

/* ── Open Image Studio (no postcardModal reference) ── */
function openStudio() {
  // Don't call closeModal(postcardModal) — postcard is gone in concept-v2
  studioBgImage    = null;
  studioFont       = 'playfair';
  studioBrightness = 100;
  studioBlur       = 0;
  studioDim        = 50;
  studioFilter     = 'none';
  generatedBlob    = null;
  selectedSize     = null;
  studioDesign     = (typeof EMOTION_DESIGN_MAP !== 'undefined' && currentPost?.emotion)
    ? (EMOTION_DESIGN_MAP[currentPost.emotion] || 'midnight-gold')
    : 'midnight-gold';

  if (studioOverlay) {
    studioOverlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }
  resetStudioUI();

  const meta = currentPost?.youtubeMeta;
  if (meta?.thumbnail) setTimeout(() => injectYoutubeBgOption(meta), 80);
  setTimeout(refreshStageCanvas, 60);
}

const openImageStudio = openStudio;

/* ── YouTube thumbnail as background ── */
function injectYoutubeBgOption(meta) {
  const panel = document.getElementById('panel-photo');
  if (!panel) return;
  document.getElementById('ytBgOption')?.remove();

  const opt = document.createElement('div');
  opt.id        = 'ytBgOption';
  opt.className = 'yt-bg-option';
  opt.innerHTML = `
    <img src="${meta.thumbnail}" alt="" onerror="this.parentElement.style.display='none'"/>
    <div class="yt-bg-option-text">
      <div class="yt-bg-option-label">▶ Use Video Thumbnail</div>
      <div class="yt-bg-option-title">${meta.title || meta.channel || ''}</div>
    </div>
  `;

  opt.onclick = () => {
    const tryLoad = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('CORS'));
      img.src = src;
    });

    const applyImage = (img) => {
      studioBgImage = img;
      const photoDropText = document.getElementById('photoDropText');
      const pDZ = document.getElementById('photoUploadZone');
      const photoControls = document.getElementById('photoControls');
      if (photoDropText) photoDropText.textContent = 'YouTube thumbnail';
      if (pDZ) pDZ.classList.add('has-photo');
      if (photoControls) photoControls.classList.remove('hidden');
      opt.style.background  = 'rgba(255,0,0,0.18)';
      opt.style.borderColor = 'rgba(255,0,0,0.55)';
      showToast('Thumbnail set as background ✓');
      refreshStageCanvas();
    };

    tryLoad(meta.thumbnail)
      .then(applyImage)
      .catch(() => {
        fetch(meta.thumbnail)
          .then(r => r.blob())
          .then(blob => { const url = URL.createObjectURL(blob); return tryLoad(url); })
          .then(applyImage)
          .catch(() => showToast('Could not load thumbnail — upload manually'));
      });
  };

  panel.insertBefore(opt, panel.firstChild);
  document.querySelector('[data-tab="photo"]')?.click();
}

/* ── Reset Studio UI ── */
function resetStudioUI() {
  document.querySelectorAll('.dock-tab').forEach((t, i)   => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.dock-panel').forEach((p, i) => p.classList.toggle('active', i === 0));
  document.querySelectorAll('.scene-swatch').forEach(s    => s.classList.toggle('active', s.dataset.design === studioDesign));
  document.querySelectorAll('.font-card').forEach((fc, i) => fc.classList.toggle('active', i === 0));

  const bSlider = document.getElementById('studiobrightness');
  const bVal    = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.value    = 100;
  if (bVal)    bVal.textContent = '100%';

  const photoDropText = document.getElementById('photoDropText');
  const pDZ = document.getElementById('photoUploadZone');
  const photoControls = document.getElementById('photoControls');
  if (photoDropText) photoDropText.textContent = 'Tap to add a photo';
  if (pDZ) pDZ.classList.remove('has-photo');
  if (photoControls) photoControls.classList.add('hidden');
  if (studioPhotoInput) studioPhotoInput.value = '';

  const bsl = document.getElementById('studioBlur'),  bvl = document.getElementById('studioBlurVal');
  const dsl = document.getElementById('studioDim'),   dvl = document.getElementById('studioDimVal');
  if (bsl) bsl.value = 0;  if (bvl) bvl.textContent = '0';
  if (dsl) dsl.value = 50; if (dvl) dvl.textContent  = '50%';

  document.querySelectorAll('.photo-filter').forEach((f, i) => f.classList.toggle('active', i === 0));
  if (sizePicker) sizePicker.classList.add('hidden');
  if (ceremonyOverlay) ceremonyOverlay.classList.add('hidden');
  document.getElementById('ytBgOption')?.remove();
}

/* ════════════════════════════════════════
   CANVAS RENDERING
   ════════════════════════════════════════ */
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

/* ── Single source of truth for poster canvas ── */
function drawPosterToCtx(ctx, W, H) {
  const post = window.currentPost;
  if (!post) return;

  const c     = (typeof POSTER_DESIGNS !== 'undefined' ? POSTER_DESIGNS[studioDesign] : null)
    || { bg:['#0B0B0D','#1a1400','#0B0B0D'], text:'#ffffff', primary:'#E8C547', light:false };
  const fd    = (typeof FONT_FAMILIES !== 'undefined' ? FONT_FAMILIES[studioFont] : null)
    || { family:"'Playfair Display',serif", style:'italic' };
  const scale = W / 1080;

  ctx.filter = 'none';

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
      const tc2  = tmp2.getContext('2d');
      tc2.filter = `blur(${Math.max(1, studioBlur) * 2}px)`;
      tc2.drawImage(tmp, 0, 0);
      tc2.filter = 'none';
      ctx.drawImage(tmp2, 0, 0);
    } else {
      ctx.drawImage(tmp, 0, 0);
    }
    ctx.filter    = 'none';
    ctx.fillStyle = `rgba(0,0,0,${studioDim / 100})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.filter    = 'none';
    const g       = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.bg[0]);
    g.addColorStop(0.5, c.bg[1]);
    g.addColorStop(1, c.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (studioBrightness !== 100) {
      const bDelta  = (studioBrightness - 100) / 100;
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
  ctx.textAlign  = 'center';

  // Lyric text
  const lyricText = post.text.length > 100
    ? post.text.substring(0, 97) + '…'
    : post.text;

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

  const k        = post.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
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
  ctx.fillStyle = artistColor;
  ctx.font      = `700 ${artSize}px 'Space Mono', monospace`;
  ctx.fillText(k.artist.length > 40 ? k.artist.substring(0, 40) + '…' : k.artist, W / 2, artistY);

  // Domain watermark
  const APP_DOMAIN_VAL = typeof APP_DOMAIN !== 'undefined' ? APP_DOMAIN : 'trymargo.com';
  const markSize  = Math.max(Math.round(18 * scale), 14);
  const markColor = studioBgImage ? 'rgba(255,255,255,0.75)'
    : c.light ? 'rgba(42,37,32,0.6)'
    : c.primary + 'cc';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = markColor;
  ctx.font      = `700 ${markSize}px 'Space Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(APP_DOMAIN_VAL, W / 2, H * 0.94);
}

function wrapTextCenter(ctx, text, x, centerY, maxW, lineHeight) {
  const words = text.split(' ');
  let line    = '';
  const lines = [];
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line.trim()); line = word + ' ';
    } else { line = test; }
  });
  if (line.trim()) lines.push(line.trim());
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function refreshStageCanvas() {
  if (!window.currentPost || !studioCanvas) return;
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
  const dim = typeof POSTER_SIZES !== 'undefined' ? POSTER_SIZES[sizeKey] : null;
  if (!dim || !window.currentPost) throw new Error('Invalid size or no post');
  const offscreen = document.createElement('canvas');
  offscreen.width  = dim.w;
  offscreen.height = dim.h;
  const ctx = offscreen.getContext('2d');
  await document.fonts.ready;
  drawPosterToCtx(ctx, dim.w, dim.h);
  return new Promise((resolve, reject) => {
    offscreen.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

function drawCeremonyThumb() {
  const dpr  = window.devicePixelRatio || 1;
  const size = 600;
  if (!ceremonyThumb) return;
  ceremonyThumb.width        = Math.round(size * dpr);
  ceremonyThumb.height       = Math.round(size * dpr);
  ceremonyThumb.style.width  = '';
  ceremonyThumb.style.height = '';
  const ctx = ceremonyThumb.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size));
}

function handleStudioPhoto(file) {
  if (!file.type.startsWith('image/')) { showToast('Please upload an image'); return; }
  if (file.size > 15 * 1024 * 1024)   { showToast('File too large (max 15MB)'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      studioBgImage = img;
      const photoDropText = document.getElementById('photoDropText');
      const pDZ = document.getElementById('photoUploadZone');
      const photoControls = document.getElementById('photoControls');
      if (photoDropText) photoDropText.textContent = file.name;
      if (pDZ) pDZ.classList.add('has-photo');
      if (photoControls) photoControls.classList.remove('hidden');
      const ytOpt = document.getElementById('ytBgOption');
      if (ytOpt) { ytOpt.style.background = ''; ytOpt.style.borderColor = ''; }
      showToast('Photo added');
      refreshStageCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function shareOrDownloadPoster() {
  if (!generatedBlob) { showToast('Poster not ready yet'); return; }
  const post = window.currentPost;
  const fileName  = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
  const file      = new File([generatedBlob], fileName, { type: 'image/png' });
  const shareData = {
    title: `MARGO — ${post?.text?.substring(0, 50) || 'Lyric'}`,
    text:  `"${post?.text || ''}" — drop your lyric at trymargo.com`,
    files: [file]
  };

  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      showToast('Shared!');
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }

  downloadPosterBlob();
  showToast('Saved to device!');
}

function downloadPosterBlob() {
  if (!generatedBlob) { showToast('Poster not ready'); return; }
  try {
    const url = URL.createObjectURL(generatedBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  } catch (err) {
    console.error('Download error:', err);
    showToast('Could not download — try again');
  }
}
