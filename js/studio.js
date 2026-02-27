/* ============================================================
   MARGO — js/studio.js
   Image Studio (canvas → PNG) + Studio Chooser wiring
   v5.2 — Injects own HTML into #studioOverlay, then calls
          bindStudioElements() from state.js. No more null crashes.
   ============================================================ */

/* ════════════════════════════════════════
   BUILD STUDIO HTML
   Injected into the empty #studioOverlay
   shell that exists in index.html
   ════════════════════════════════════════ */
function buildStudioHTML() {
  const overlay = document.getElementById('studioOverlay');
  if (!overlay || overlay.dataset.built) return;
  overlay.dataset.built = '1';

  overlay.innerHTML = `
    <div class="studio-topbar">
      <button class="studio-back-btn" id="closeStudio" aria-label="Back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <span class="studio-topbar-title">✦ Poster Studio</span>
      <button class="studio-export-btn" id="studioExportBtn">Export →</button>
    </div>

    <div class="studio-body">
      <div class="studio-stage">
        <canvas id="studioCanvas"></canvas>
      </div>

      <div class="studio-dock">
        <div class="dock-tab-bar">
          <button class="dock-tab active" data-tab="scene">Scene</button>
          <button class="dock-tab" data-tab="font">Font</button>
          <button class="dock-tab" data-tab="photo">Photo</button>
        </div>
        <div class="dock-panels">

          <div class="dock-panel active" id="panel-scene">
            <p class="dock-label">Background</p>
            <div class="scene-swatches">
              <button class="scene-swatch active" data-design="midnight-gold"><span class="swatch-preview" style="background:linear-gradient(135deg,#0B0B0D,#E8C547)"></span><span class="swatch-label">Gold</span></button>
              <button class="scene-swatch" data-design="royal-purple"><span class="swatch-preview" style="background:linear-gradient(135deg,#1a0033,#c77dff)"></span><span class="swatch-label">Violet</span></button>
              <button class="scene-swatch" data-design="neon-cyan"><span class="swatch-preview" style="background:linear-gradient(135deg,#0a1420,#00e5ff)"></span><span class="swatch-label">Ocean</span></button>
              <button class="scene-swatch" data-design="sunset-coral"><span class="swatch-preview" style="background:linear-gradient(135deg,#1a0a0a,#ff8080)"></span><span class="swatch-label">Ember</span></button>
              <button class="scene-swatch" data-design="emerald-night"><span class="swatch-preview" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></span><span class="swatch-label">Forest</span></button>
              <button class="scene-swatch" data-design="rose-gold"><span class="swatch-preview" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></span><span class="swatch-label">Rose</span></button>
              <button class="scene-swatch" data-design="cream-editorial"><span class="swatch-preview" style="background:linear-gradient(135deg,#f5f1e8,#2a2520)"></span><span class="swatch-label">Bone</span></button>
              <button class="scene-swatch" data-design="monochrome"><span class="swatch-preview" style="background:linear-gradient(135deg,#000,#fff)"></span><span class="swatch-label">Mono</span></button>
              <button class="scene-swatch" data-design="vaporwave"><span class="swatch-preview" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></span><span class="swatch-label">Wave</span></button>
              <button class="scene-swatch" data-design="neon-dark"><span class="swatch-preview" style="background:linear-gradient(135deg,#0a0a0a,#ff00ff)"></span><span class="swatch-label">Neon</span></button>
              <button class="scene-swatch" data-design="y2k-chrome"><span class="swatch-preview" style="background:linear-gradient(135deg,#000033,#0ff)"></span><span class="swatch-label">Chrome</span></button>
              <button class="scene-swatch" data-design="brutalist"><span class="swatch-preview" style="background:linear-gradient(135deg,#fff,#000)"></span><span class="swatch-label">Brutal</span></button>
            </div>
            <p class="dock-label" style="margin-top:14px">Brightness</p>
            <div class="slider-row">
              <input type="range" id="studiobrightness" min="20" max="160" value="100"/>
              <span id="studioBrightnessVal">100%</span>
            </div>
          </div>

          <div class="dock-panel" id="panel-font">
            <p class="dock-label">Typeface</p>
            <div class="font-cards">
              <button class="font-card active" data-font="playfair"><span class="font-preview" style="font-family:'Playfair Display',serif;font-style:italic">Say everything</span><span class="font-name">Playfair</span></button>
              <button class="font-card" data-font="cormorant"><span class="font-preview" style="font-family:'Cormorant Garamond',serif;font-style:italic">Say everything</span><span class="font-name">Cormorant</span></button>
              <button class="font-card" data-font="lora"><span class="font-preview" style="font-family:'Lora',serif;font-style:italic">Say everything</span><span class="font-name">Lora</span></button>
              <button class="font-card" data-font="merriweather"><span class="font-preview" style="font-family:'Merriweather',serif">Say everything</span><span class="font-name">Merriweather</span></button>
              <button class="font-card" data-font="josefin"><span class="font-preview" style="font-family:'Josefin Sans',sans-serif;letter-spacing:2px">Say everything</span><span class="font-name">Josefin</span></button>
              <button class="font-card" data-font="bebas"><span class="font-preview" style="font-family:'Bebas Neue',sans-serif;letter-spacing:3px">SAY EVERYTHING</span><span class="font-name">Bebas</span></button>
              <button class="font-card" data-font="oswald"><span class="font-preview" style="font-family:'Oswald',sans-serif;font-weight:600">Say everything</span><span class="font-name">Oswald</span></button>
              <button class="font-card" data-font="dancing"><span class="font-preview" style="font-family:'Dancing Script',cursive">Say everything</span><span class="font-name">Dancing</span></button>
            </div>
          </div>

          <div class="dock-panel" id="panel-photo">
            <p class="dock-label">Background Photo</p>
            <div class="photo-upload-zone" id="photoUploadZone">
              <span id="photoDropText">Tap to add a photo</span>
              <input type="file" id="studioPhotoInput" accept="image/*" style="display:none"/>
            </div>
            <div class="photo-controls hidden" id="photoControls">
              <p class="dock-label">Blur</p>
              <div class="slider-row">
                <input type="range" id="studioBlur" min="0" max="20" value="0"/>
                <span id="studioBlurVal">0</span>
              </div>
              <p class="dock-label">Dim</p>
              <div class="slider-row">
                <input type="range" id="studioDim" min="0" max="90" value="50"/>
                <span id="studioDimVal">50%</span>
              </div>
              <p class="dock-label">Filter</p>
              <div class="photo-filters">
                <button class="photo-filter active" data-filter="none">None</button>
                <button class="photo-filter" data-filter="warm">Warm</button>
                <button class="photo-filter" data-filter="cool">Cool</button>
                <button class="photo-filter" data-filter="dramatic">Drama</button>
                <button class="photo-filter" data-filter="vintage">Vintage</button>
              </div>
              <button class="studio-remove-photo" id="studioRemovePhoto">Remove photo</button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div class="size-picker hidden" id="sizePicker">
      <div class="size-picker-inner">
        <p class="size-picker-title">Choose size</p>
        <div class="size-opts">
          <button class="size-opt" data-size="instagram-square">Instagram Square<br/><small>1080×1080</small></button>
          <button class="size-opt" data-size="instagram-story">Instagram Story<br/><small>1080×1920</small></button>
          <button class="size-opt" data-size="twitter">Twitter / X<br/><small>1200×675</small></button>
          <button class="size-opt" data-size="reddit">Reddit<br/><small>1200×1200</small></button>
          <button class="size-opt" data-size="pinterest">Pinterest<br/><small>1000×1500</small></button>
        </div>
        <button class="size-cancel" id="sizeCancelBtn">Cancel</button>
      </div>
    </div>

    <div class="ceremony-overlay hidden" id="ceremonyOverlay">
      <div class="ceremony-inner">
        <canvas class="ceremony-thumb" id="ceremonyThumb"></canvas>
        <p class="ceremony-headline">Your poster is ready.</p>
        <div class="ceremony-actions">
          <button class="ceremony-btn primary" id="cerDownload">⬇ Download</button>
          <button class="ceremony-btn secondary" id="cerShare">↗ Share</button>
        </div>
        <button class="ceremony-back" id="ceremonyBack">← Back to studio</button>
      </div>
    </div>
  `;

  // Bind all the newly created elements into state.js variables
  bindStudioElements();
}

/* ════════════════════════════════════════
   STUDIO CHOOSER
   ════════════════════════════════════════ */
function initStudioChooser() {
  const chooser   = document.getElementById('studioChooser');
  if (!chooser) return;

  const motionBtn = document.getElementById('chooserMotionBtn');
  const gifBtn    = document.getElementById('chooserGifBtn');
  const backBtn   = document.getElementById('chooserBackBtn');

  if (motionBtn) motionBtn.addEventListener('click', () => {
    chooser.classList.add('hidden');
    openImageStudio();
  });

  if (gifBtn) gifBtn.addEventListener('click', () => {
    chooser.classList.add('hidden');
    if (typeof openGifStudio === 'function') openGifStudio();
  });

  if (backBtn) backBtn.addEventListener('click', () => {
    chooser.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (postcardModal && typeof openModal === 'function') openModal(postcardModal);
  });
}

function openStudioChooser() {
  if (postcardModal && typeof closeModal === 'function') closeModal(postcardModal);
  const chooser = document.getElementById('studioChooser');
  if (!chooser) { openImageStudio(); return; }
  chooser.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

/* ════════════════════════════════════════
   INIT STUDIO — called from app.js
   ════════════════════════════════════════ */
function initStudio() {
  // 1. Inject HTML + bind elements
  buildStudioHTML();

  // 2. Wire Create Poster button
  if (sharePosterBtn) sharePosterBtn.onclick = openStudioChooser;

  // 3. Close button
  const cs = document.getElementById('closeStudio');
  if (cs) cs.onclick = () => {
    if (studioOverlay) studioOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (postcardModal && typeof openModal === 'function') openModal(postcardModal);
  };

  // 4. Dock tabs
  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.dock-tab').forEach(t  => t.classList.remove('active'));
      document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    };
  });

  // 5. Color swatches
  document.querySelectorAll('.scene-swatch').forEach(swatch => {
    swatch.onclick = () => {
      document.querySelectorAll('.scene-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      studioDesign = swatch.dataset.design;
      refreshStageCanvas();
    };
  });

  // 6. Brightness
  const bSlider = document.getElementById('studiobrightness');
  const bValEl  = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.oninput = () => {
    studioBrightness = parseInt(bSlider.value);
    if (bValEl) bValEl.textContent = studioBrightness + '%';
    refreshStageCanvas();
  };

  // 7. Font cards
  document.querySelectorAll('.font-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      studioFont = card.dataset.font;
      refreshStageCanvas();
    };
  });

  // 8. Photo upload
  const photoDropZone = document.getElementById('photoUploadZone');
  if (photoDropZone) {
    photoDropZone.onclick = () => studioPhotoInput?.click();
    photoDropZone.addEventListener('dragover', e => { e.preventDefault(); photoDropZone.classList.add('has-photo'); });
    photoDropZone.addEventListener('dragleave', e => { if (!photoDropZone.contains(e.relatedTarget)) photoDropZone.classList.remove('has-photo'); });
    photoDropZone.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleStudioPhoto(f); });
  }
  if (studioPhotoInput) studioPhotoInput.onchange = e => { const f = e.target.files[0]; if (f) handleStudioPhoto(f); };

  // 9. Blur / Dim
  const blurSlider = document.getElementById('studioBlur');
  const blurValEl  = document.getElementById('studioBlurVal');
  const dimSlider  = document.getElementById('studioDim');
  const dimValEl   = document.getElementById('studioDimVal');
  if (blurSlider) blurSlider.oninput = () => { studioBlur = parseInt(blurSlider.value); if (blurValEl) blurValEl.textContent = studioBlur; refreshStageCanvas(); };
  if (dimSlider)  dimSlider.oninput  = () => { studioDim  = parseInt(dimSlider.value);  if (dimValEl)  dimValEl.textContent  = studioDim + '%'; refreshStageCanvas(); };

  // 10. Photo filters
  document.querySelectorAll('.photo-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioFilter = btn.dataset.filter;
      refreshStageCanvas();
    };
  });

  // 11. Remove photo
  const removeBtn = document.getElementById('studioRemovePhoto');
  if (removeBtn) removeBtn.onclick = () => {
    studioBgImage = null;
    const pdz = document.getElementById('photoUploadZone');
    const pdt = document.getElementById('photoDropText');
    const pc  = document.getElementById('photoControls');
    if (pdt) pdt.textContent = 'Tap to add a photo';
    if (pdz) pdz.classList.remove('has-photo');
    if (pc)  pc.classList.add('hidden');
    if (studioPhotoInput) studioPhotoInput.value = '';
    const ytOpt = document.getElementById('ytBgOption');
    if (ytOpt) { ytOpt.style.background = ''; ytOpt.style.borderColor = ''; }
    refreshStageCanvas();
  };

  // 12. Export flow
  if (studioExportBtn) studioExportBtn.onclick = () => { if (sizePicker) sizePicker.classList.remove('hidden'); };
  if (sizeCancelBtn)   sizeCancelBtn.onclick   = () => { if (sizePicker) sizePicker.classList.add('hidden'); };

  document.querySelectorAll('.size-opt').forEach(btn => {
    btn.onclick = async () => {
      selectedSize = btn.dataset.size;
      if (sizePicker) sizePicker.classList.add('hidden');
      if (studioCanvas) studioCanvas.classList.add('zoom-in');
      if (ceremonyOverlay) ceremonyOverlay.classList.remove('hidden');
      const headlineEl = ceremonyOverlay?.querySelector('.ceremony-headline');
      const actionsEl  = ceremonyOverlay?.querySelector('.ceremony-actions');
      if (headlineEl) headlineEl.textContent = 'Generating your poster…';
      if (actionsEl)  actionsEl.style.opacity = '0.4';
      try {
        generatedBlob = await generateFinalPoster(selectedSize);
      } catch (err) {
        console.error('Poster generation error:', err);
        if (studioCanvas) studioCanvas.classList.remove('zoom-in');
        if (ceremonyOverlay) ceremonyOverlay.classList.add('hidden');
        return;
      }
      setTimeout(() => {
        if (studioCanvas) studioCanvas.classList.remove('zoom-in');
        drawCeremonyThumb();
        if (headlineEl) headlineEl.textContent = 'Your poster is ready.';
        if (actionsEl)  actionsEl.style.opacity = '1';
      }, 400);
    };
  });

  // 13. Ceremony actions
  if (ceremonyBack) ceremonyBack.onclick = () => { if (ceremonyOverlay) ceremonyOverlay.classList.add('hidden'); generatedBlob = null; };
  if (cerDownload)  cerDownload.onclick  = async () => { if (!generatedBlob) return; try { downloadPosterBlob(); } catch(e) { console.error(e); } };
  if (cerShare)     cerShare.onclick     = shareOrDownloadPoster;

  // 14. GIF studio tabs + chooser wiring
  initGifStudioTabs();
  initStudioChooser();

  if (typeof initGifStudio === 'function') initGifStudio();
}

/* ── Wire GIF studio dock tabs ── */
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
   OPEN IMAGE STUDIO
   ════════════════════════════════════════ */
function openImageStudio() {
  studioBgImage    = null;
  studioFont       = 'playfair';
  studioBrightness = 100;
  studioBlur       = 0;
  studioDim        = 50;
  studioFilter     = 'none';
  generatedBlob    = null;
  selectedSize     = null;
  studioDesign     = EMOTION_DESIGN_MAP[currentPost?.emotion] || 'midnight-gold';
  if (studioOverlay) studioOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  resetStudioUI();
  const meta = currentPost?.youtubeMeta;
  if (meta?.thumbnail) setTimeout(() => injectYoutubeBgOption(meta), 80);
  setTimeout(refreshStageCanvas, 60);
}

const openStudio = openImageStudio;

/* ════════════════════════════════════════
   YOUTUBE THUMBNAIL BACKGROUND
   ════════════════════════════════════════ */
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
    const tryLoad = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('CORS'));
      img.src = src;
    });
    const applyImage = img => {
      studioBgImage = img;
      const pdt = document.getElementById('photoDropText');
      const pdz = document.getElementById('photoUploadZone');
      const pc  = document.getElementById('photoControls');
      if (pdt) pdt.textContent = 'YouTube thumbnail';
      if (pdz) pdz.classList.add('has-photo');
      if (pc)  pc.classList.remove('hidden');
      opt.style.background  = 'rgba(255,0,0,0.18)';
      opt.style.borderColor = 'rgba(255,0,0,0.55)';
      refreshStageCanvas();
    };
    tryLoad(meta.thumbnail)
      .then(applyImage)
      .catch(() => {
        fetch(meta.thumbnail)
          .then(r => r.blob())
          .then(blob => { const url = URL.createObjectURL(blob); return tryLoad(url); })
          .then(applyImage)
          .catch(() => console.log('Could not load thumbnail'));
      });
  };

  panel.insertBefore(opt, panel.firstChild);
  document.querySelector('[data-tab="photo"]')?.click();
}

/* ════════════════════════════════════════
   RESET STUDIO UI
   ════════════════════════════════════════ */
function resetStudioUI() {
  document.querySelectorAll('.dock-tab').forEach((t, i)   => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.dock-panel').forEach((p, i) => p.classList.toggle('active', i === 0));
  document.querySelectorAll('.scene-swatch').forEach(s    => s.classList.toggle('active', s.dataset.design === studioDesign));
  document.querySelectorAll('.font-card').forEach((fc, i) => fc.classList.toggle('active', i === 0));

  const bSlider = document.getElementById('studiobrightness');
  const bVal    = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.value    = 100;
  if (bVal)    bVal.textContent = '100%';

  const pdz = document.getElementById('photoUploadZone');
  const pdt = document.getElementById('photoDropText');
  const pc  = document.getElementById('photoControls');
  if (pdt) pdt.textContent = 'Tap to add a photo';
  if (pdz) pdz.classList.remove('has-photo');
  if (pc)  pc.classList.add('hidden');
  if (studioPhotoInput) studioPhotoInput.value = '';

  const bsl = document.getElementById('studioBlur'),  bvl = document.getElementById('studioBlurVal');
  const dsl = document.getElementById('studioDim'),   dvl = document.getElementById('studioDimVal');
  if (bsl) bsl.value = 0;  if (bvl) bvl.textContent = '0';
  if (dsl) dsl.value = 50; if (dvl) dvl.textContent  = '50%';

  document.querySelectorAll('.photo-filter').forEach((f, i) => f.classList.toggle('active', i === 0));
  if (sizePicker)      sizePicker.classList.add('hidden');
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

function drawPosterToCtx(ctx, W, H) {
  const c     = POSTER_DESIGNS[studioDesign] || POSTER_DESIGNS['midnight-gold'];
  const fd    = FONT_FAMILIES[studioFont]    || FONT_FAMILIES['playfair'];
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
      ctx.fillStyle = bDelta < 0 ? `rgba(0,0,0,${Math.abs(bDelta) * 0.9})` : `rgba(255,255,255,${bDelta * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.filter = 'none';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  const textColor = studioBgImage ? '#ffffff' : c.text;
  if (studioBgImage) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14 * scale; ctx.shadowOffsetY = 2 * scale; }

  ctx.textAlign  = 'left';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.fillStyle  = studioBgImage ? 'rgba(255,255,255,0.32)' : (c.primary + '88');
  ctx.font       = `700 ${22 * scale}px 'Space Mono', monospace`;
  ctx.fillText('MARGO', 52 * scale, 58 * scale);
  ctx.textAlign  = 'center';

  const lyricText = currentPost.text.length > 100 ? currentPost.text.substring(0, 97) + '…' : currentPost.text;
  if (studioBgImage) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18 * scale; }
  ctx.fillStyle = textColor;

  const lyricLen  = lyricText.length;
  const lyricSize = lyricLen < 40 ? 82 * scale : lyricLen < 65 ? 64 * scale : lyricLen < 90 ? 52 * scale : 42 * scale;
  const isBold    = ['bebas','josefin','oswald'].includes(studioFont);
  ctx.font = `${fd.style === 'italic' ? 'italic ' : ''}${isBold ? '700' : '600'} ${lyricSize}px ${fd.family}`;
  wrapTextCenter(ctx, lyricText, W / 2, H * 0.46, W * 0.82, lyricSize * 1.18);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.filter = 'none'; ctx.textAlign = 'center';

  const k        = currentPost.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
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

  const markSize  = Math.max(Math.round(18 * scale), 14);
  const markColor = studioBgImage ? 'rgba(255,255,255,0.75)' : c.light ? 'rgba(42,37,32,0.6)' : c.primary + 'cc';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = markColor;
  ctx.font      = `700 ${markSize}px 'Space Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(APP_DOMAIN, W / 2, H * 0.94);
}

function wrapTextCenter(ctx, text, x, centerY, maxW, lineHeight) {
  const words = text.split(' ');
  let line    = '';
  const lines = [];
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' '; }
    else { line = test; }
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
  if (!dim || !currentPost) throw new Error('Invalid size or no post');
  const offscreen = document.createElement('canvas');
  offscreen.width  = dim.w;
  offscreen.height = dim.h;
  const ctx = offscreen.getContext('2d');
  await document.fonts.ready;
  drawPosterToCtx(ctx, dim.w, dim.h);
  return new Promise((resolve, reject) => {
    offscreen.toBlob(blob => { if (blob) resolve(blob); else reject(new Error('toBlob failed')); }, 'image/png');
  });
}

function drawCeremonyThumb() {
  if (!ceremonyThumb) return;
  const dpr  = window.devicePixelRatio || 1;
  const size = 600;
  ceremonyThumb.width        = Math.round(size * dpr);
  ceremonyThumb.height       = Math.round(size * dpr);
  ceremonyThumb.style.width  = '';
  ceremonyThumb.style.height = '';
  const ctx = ceremonyThumb.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size));
}

function handleStudioPhoto(file) {
  if (!file.type.startsWith('image/')) return;
  if (file.size > 15 * 1024 * 1024)   return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      studioBgImage = img;
      const pdt = document.getElementById('photoDropText');
      const pdz = document.getElementById('photoUploadZone');
      const pc  = document.getElementById('photoControls');
      if (pdt) pdt.textContent = file.name;
      if (pdz) pdz.classList.add('has-photo');
      if (pc)  pc.classList.remove('hidden');
      const ytOpt = document.getElementById('ytBgOption');
      if (ytOpt) { ytOpt.style.background = ''; ytOpt.style.borderColor = ''; }
      refreshStageCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function shareOrDownloadPoster() {
  if (!generatedBlob) return;
  const fileName  = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
  const file      = new File([generatedBlob], fileName, { type: 'image/png' });
  const shareData = {
    title: `MARGO — ${currentPost?.text?.substring(0, 50) || 'Lyric'}`,
    text:  `"${currentPost?.text || ''}" — drop your lyric at trymargo.com`,
    files: [file]
  };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData); return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  downloadPosterBlob();
}

function downloadPosterBlob() {
  if (!generatedBlob) return;
  try {
    const url = URL.createObjectURL(generatedBlob);
    const a   = document.createElement('a');
    a.href = url; a.download = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  } catch (err) { console.error('Download error:', err); }
}
