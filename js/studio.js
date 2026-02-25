/* ============================================================
   MARGO — js/studio.js  v5.1
   Animated Motion Studio
   - Ripple ring logo animation (live canvas)
   - Word-by-word lyric entrance (7 styles)
   - Speed control (Slow / Normal / Fast / Rapid)
   - Motion dock tab (injected, no HTML changes needed)
   - New canvas sizes: WhatsApp, LinkedIn, Discord, FB Story
   - All existing features preserved (photo, fonts, themes, etc.)

   NOTE: FONT_FAMILIES, POSTER_DESIGNS, POSTER_SIZES,
         EMOTION_DESIGN_MAP, APP_DOMAIN, and all studio state
         variables (studioFont, studioDesign, studioBgImage,
         studioBrightness, studioBlur, studioDim, studioFilter,
         generatedBlob, selectedSize) are declared in state.js.
         Do NOT re-declare them here.
   ============================================================ */

/* ─────────────────────────────────────────
   CONSTANTS (studio.js-only — not in state.js)
───────────────────────────────────────── */
const MOTION_STYLES = {
  word:    'Word by Word',
  cinema:  'Cinematic',
  fade:    'Fade Up',
  type:    'Typewriter',
  glitch:  'Glitch',
  rise:    'Rise',
  blur:    'Blur Reveal',
};

const SPEED_PRESETS = [
  { label: 'Slow',   mult: 2.2  },
  { label: 'Normal', mult: 1.0  },
  { label: 'Fast',   mult: 0.6  },
  { label: 'Rapid',  mult: 0.35 },
];

// Extended sizes (superset of state.js POSTER_SIZES)
const POSTER_SIZES_STUDIO = {
  'instagram-square': { w: 1080, h: 1080, label: 'Instagram',      ratio: '1:1'    },
  'instagram-story':  { w: 1080, h: 1920, label: 'Story / TikTok', ratio: '9:16'   },
  'facebook-story':   { w: 1080, h: 1920, label: 'Facebook Story',  ratio: '9:16'   },
  'whatsapp':         { w: 1080, h: 1080, label: 'WhatsApp',        ratio: '1:1'    },
  'whatsapp-status':  { w: 1080, h: 1920, label: 'WhatsApp Status', ratio: '9:16'   },
  'linkedin':         { w: 1200, h: 627,  label: 'LinkedIn',        ratio: '1.91:1' },
  'discord':          { w: 1280, h: 720,  label: 'Discord',         ratio: '16:9'   },
  'reddit':           { w: 1200, h: 1200, label: 'Reddit',          ratio: '1:1'    },
  'twitter':          { w: 1200, h: 675,  label: 'X / Twitter',     ratio: '16:9'   },
  'pinterest':        { w: 1000, h: 1500, label: 'Pinterest',       ratio: '2:3'    },
};

/* ─────────────────────────────────────────
   MOTION STATE (studio.js-only)
───────────────────────────────────────── */
let studioMotion    = 'word';
let studioSpeedMult = 1.0;

// Animation engine
let _rafId       = null;
let _animStart   = null;
let _animPlaying = false;

/* ─────────────────────────────────────────
   DOM REFS (resolved in initStudio)
───────────────────────────────────────── */
// Note: studioOverlay, studioCanvas, studioExportBtn, closeStudio,
// sizePicker, sizeCancelBtn, ceremonyOverlay, ceremonyThumb,
// cerDownload, cerShare, ceremonyBack, studioPhotoInput
// are all declared in state.js — use them directly.

/* ─────────────────────────────────────────
   INJECT MOTION TAB INTO DOCK
───────────────────────────────────────── */
function injectMotionTab() {
  const dockTabs   = document.querySelector('.dock-tabs');
  const dock       = document.querySelector('.studio-dock');
  if (!dockTabs || !dock) return;

  // ── Tab button (between Font and Photo) ──
  const photoTab  = dockTabs.querySelector('[data-tab="photo"]');
  const motionTab = document.createElement('button');
  motionTab.className   = 'dock-tab';
  motionTab.dataset.tab = 'motion';
  motionTab.innerHTML   = '<span class="dock-tab-icon">◈</span><span>Motion</span>';
  dockTabs.insertBefore(motionTab, photoTab);

  // ── Panel ──
  const panel = document.createElement('div');
  panel.className = 'dock-panel';
  panel.id        = 'panel-motion';

  panel.innerHTML = `
    <div class="motion-section-label">Entrance Style</div>
    <div class="motion-style-list" id="motionStyleList">
      ${Object.entries(MOTION_STYLES).map(([key, label]) => `
        <button class="motion-style-btn${key === 'word' ? ' active' : ''}" data-motion="${key}">
          <span class="msb-icon">${motionIcon(key)}</span>
          <span class="msb-label">${label}</span>
        </button>
      `).join('')}
    </div>
    <div class="motion-section-label" style="margin-top:14px">Animation Speed</div>
    <div class="motion-speed-row" id="motionSpeedRow">
      ${SPEED_PRESETS.map((p, i) => `
        <button class="motion-speed-btn${i === 1 ? ' active' : ''}" data-mult="${p.mult}">${p.label}</button>
      `).join('')}
    </div>
    <div class="motion-replay-row">
      <button class="motion-replay-btn" id="motionReplayBtn">↺ Preview</button>
      <label class="motion-loop-label">
        <input type="checkbox" id="motionLoopCheck"> Loop
      </label>
    </div>
  `;

  dock.insertBefore(panel, dock.querySelector('#panel-photo'));

  // ── Motion style clicks ──
  panel.querySelector('#motionStyleList').addEventListener('click', e => {
    const btn = e.target.closest('.motion-style-btn');
    if (!btn) return;
    panel.querySelectorAll('.motion-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    studioMotion = btn.dataset.motion;
    triggerAnimation();
  });

  // ── Speed preset clicks ──
  panel.querySelector('#motionSpeedRow').addEventListener('click', e => {
    const btn = e.target.closest('.motion-speed-btn');
    if (!btn) return;
    panel.querySelectorAll('.motion-speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    studioSpeedMult = parseFloat(btn.dataset.mult);
    triggerAnimation();
  });

  // ── Replay ──
  panel.querySelector('#motionReplayBtn').addEventListener('click', triggerAnimation);

  // ── Loop ──
  panel.querySelector('#motionLoopCheck').addEventListener('change', function() {
    if (this.checked) triggerAnimation();
  });
}

function motionIcon(key) {
  const icons = { word:'◈', cinema:'◉', fade:'↑', type:'|', glitch:'⚡', rise:'✦', blur:'◌' };
  return icons[key] || '◈';
}

/* ─────────────────────────────────────────
   INJECT MOTION STYLES INTO <head>
───────────────────────────────────────── */
function injectMotionStyles() {
  if (document.getElementById('studioMotionStyles')) return;
  const s = document.createElement('style');
  s.id = 'studioMotionStyles';
  s.textContent = `
    .motion-section-label {
      font-family: 'Space Mono', monospace;
      font-size: 0.46rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 2.5px;
      color: rgba(255,255,255,0.28); margin-bottom: 9px;
    }
    .motion-style-list { display: flex; flex-direction: column; gap: 5px; }
    .motion-style-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 9px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.45);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.78rem; font-weight: 600;
      cursor: pointer; transition: all 0.18s; text-align: left; width: 100%;
    }
    .motion-style-btn:hover { border-color: rgba(232,197,71,0.3); color: rgba(255,255,255,0.85); }
    .motion-style-btn.active { background: rgba(232,197,71,0.09); border-color: rgba(232,197,71,0.4); color: #E8C547; }
    .msb-icon { font-size: 0.9rem; width: 18px; text-align: center; flex-shrink: 0; }
    .msb-label { flex: 1; }
    .motion-speed-row {
      display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-bottom: 12px;
    }
    .motion-speed-btn {
      padding: 8px 4px; border-radius: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.35);
      font-family: 'Space Mono', monospace;
      font-size: 0.46rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      cursor: pointer; transition: all 0.18s; text-align: center;
    }
    .motion-speed-btn:hover { border-color: rgba(232,197,71,0.3); color: rgba(255,255,255,0.7); }
    .motion-speed-btn.active { background: rgba(232,197,71,0.1); border-color: rgba(232,197,71,0.45); color: #E8C547; }
    .motion-replay-row { display: flex; align-items: center; gap: 10px; }
    .motion-replay-btn {
      flex: 1; padding: 9px 12px; border-radius: 9px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
      font-family: 'Space Mono', monospace;
      font-size: 0.5rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px;
      cursor: pointer; transition: all 0.18s;
    }
    .motion-replay-btn:hover { border-color: rgba(232,197,71,0.35); color: #E8C547; }
    .motion-loop-label {
      display: flex; align-items: center; gap: 6px;
      font-family: 'Space Mono', monospace;
      font-size: 0.5rem; font-weight: 700;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase; letter-spacing: 1px;
      cursor: pointer; flex-shrink: 0;
    }
    .motion-loop-label input { width: auto; accent-color: #E8C547; }
    .size-opt-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
    .size-opt-tag {
      font-family: 'Space Mono', monospace;
      font-size: 0.38rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.3px;
      padding: 1px 5px; border-radius: 3px;
      background: rgba(74,222,128,0.08); color: rgba(74,222,128,0.7);
      border: 1px solid rgba(74,222,128,0.18);
    }
  `;
  document.head.appendChild(s);
}

/* ─────────────────────────────────────────
   UPDATE SIZE PICKER OPTIONS
───────────────────────────────────────── */
function updateSizePicker() {
  const sizeOptions = document.querySelector('.size-options');
  if (!sizeOptions) return;

  const sizes = [
    { key: 'instagram-square', tags: ['Instagram', 'WhatsApp', 'Discord', 'Reddit'] },
    { key: 'instagram-story',  tags: ['Instagram Story', 'TikTok', 'YouTube Shorts'] },
    { key: 'facebook-story',   tags: ['Facebook Story', 'WhatsApp Status', 'Snapchat'] },
    { key: 'whatsapp',         tags: ['WhatsApp', 'Telegram', 'Facebook'] },
    { key: 'linkedin',         tags: ['LinkedIn', 'Facebook OG', 'Twitter/X'] },
    { key: 'discord',          tags: ['Discord', 'Reddit', 'YouTube', 'Twitter/X'] },
    { key: 'reddit',           tags: ['Reddit', 'Discord', 'Facebook'] },
    { key: 'twitter',          tags: ['Twitter/X', 'Discord', 'LinkedIn'] },
    { key: 'pinterest',        tags: ['Pinterest', 'Instagram'] },
  ];

  sizeOptions.innerHTML = sizes.map(({ key, tags }) => {
    const d = POSTER_SIZES_STUDIO[key];
    if (!d) return '';
    return `
      <button class="size-opt" data-size="${key}">
        <span class="size-ratio">${d.ratio}</span>
        <div style="flex:1;min-width:0">
          <span class="size-name">${d.label}</span>
          <div class="size-opt-tags">
            ${tags.map(t => `<span class="size-opt-tag">${t}</span>`).join('')}
          </div>
        </div>
        <span class="size-dim">${d.w} × ${d.h}</span>
      </button>
    `;
  }).join('');
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
function initStudio() {
  // DOM refs come from state.js — verify they exist
  if (!studioOverlay || !studioCanvas) {
    console.warn('[Studio] DOM refs missing — check state.js loaded first');
    return;
  }

  const sharePosterBtn = document.getElementById('sharePosterBtn');
  if (sharePosterBtn) sharePosterBtn.onclick = openStudio;

  closeStudio.onclick = () => {
    stopAnimation();
    studioOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (typeof openModal === 'function' && postcardModal) openModal(postcardModal);
  };

  // Inject Motion tab and styles
  injectMotionStyles();
  injectMotionTab();
  updateSizePicker();

  // Dock tabs (re-bind after motion tab injection)
  document.querySelector('.studio-dock').addEventListener('click', e => {
    const tab = e.target.closest('.dock-tab');
    if (!tab) return;
    document.querySelectorAll('.dock-tab').forEach(t  => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById('panel-' + tab.dataset.tab);
    if (panel) panel.classList.add('active');
  });

  // Color swatches
  document.querySelectorAll('.scene-swatch').forEach(swatch => {
    swatch.onclick = () => {
      document.querySelectorAll('.scene-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      studioDesign = swatch.dataset.design;
      scheduleRedraw();
    };
  });

  // Brightness
  const bSlider = document.getElementById('studiobrightness');
  const bValEl  = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.oninput = () => {
    studioBrightness = parseInt(bSlider.value);
    if (bValEl) bValEl.textContent = studioBrightness + '%';
    scheduleRedraw();
  };

  // Font cards
  document.querySelectorAll('.font-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      studioFont = card.dataset.font;
      scheduleRedraw();
    };
  });

  // Photo upload
  if (photoDropZone) {
    photoDropZone.onclick = () => studioPhotoInput?.click();
    photoDropZone.addEventListener('dragover', e => { e.preventDefault(); photoDropZone.classList.add('has-photo'); });
    photoDropZone.addEventListener('dragleave', e => { if (!photoDropZone.contains(e.relatedTarget)) photoDropZone.classList.remove('has-photo'); });
    photoDropZone.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleStudioPhoto(f); });
  }
  if (studioPhotoInput) studioPhotoInput.onchange = e => { const f = e.target.files[0]; if (f) handleStudioPhoto(f); };

  // Blur / Dim
  const blurSlider = document.getElementById('studioBlur');
  const blurValEl  = document.getElementById('studioBlurVal');
  const dimSlider  = document.getElementById('studioDim');
  const dimValEl   = document.getElementById('studioDimVal');
  if (blurSlider) blurSlider.oninput = () => { studioBlur = parseInt(blurSlider.value); if (blurValEl) blurValEl.textContent = studioBlur; scheduleRedraw(); };
  if (dimSlider)  dimSlider.oninput  = () => { studioDim  = parseInt(dimSlider.value);  if (dimValEl)  dimValEl.textContent = studioDim + '%'; scheduleRedraw(); };

  // Photo filters
  document.querySelectorAll('.photo-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioFilter = btn.dataset.filter;
      scheduleRedraw();
    };
  });

  // Remove photo
  const removeBtn = document.getElementById('studioRemovePhoto');
  if (removeBtn) removeBtn.onclick = () => {
    studioBgImage = null;
    if (photoDropText) photoDropText.textContent = 'Tap to add a photo';
    if (photoDropZone) photoDropZone.classList.remove('has-photo');
    if (photoControls) photoControls.classList.add('hidden');
    if (studioPhotoInput) studioPhotoInput.value = '';
    document.getElementById('ytBgOption')?.remove();
    scheduleRedraw();
  };

  // Export
  studioExportBtn.onclick = () => {
    updateSizePicker();
    sizePicker.classList.remove('hidden');
  };
  sizeCancelBtn.onclick = () => sizePicker.classList.add('hidden');

  // Size picker — event delegation
  sizePicker.addEventListener('click', async e => {
    const btn = e.target.closest('.size-opt');
    if (!btn) return;
    selectedSize = btn.dataset.size;
    sizePicker.classList.add('hidden');
    studioCanvas.classList.add('zoom-in');

    ceremonyOverlay.classList.remove('hidden');
    const headlineEl = ceremonyOverlay.querySelector('.ceremony-headline');
    const actionsEl  = ceremonyOverlay.querySelector('.ceremony-actions');
    if (headlineEl) headlineEl.textContent = 'Generating your poster…';
    if (actionsEl) actionsEl.style.opacity = '0.4';

    try {
      generatedBlob = await generateFinalPoster(selectedSize);
    } catch (err) {
      console.error('Poster generation error:', err);
      if (typeof showToast === 'function') showToast('Error generating poster — try again');
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
  });

  // Ceremony
  ceremonyBack.onclick = () => { ceremonyOverlay.classList.add('hidden'); generatedBlob = null; };
  cerDownload.onclick  = () => {
    if (!generatedBlob) { if (typeof showToast === 'function') showToast('Generating poster…'); return; }
    downloadPosterBlob();
    if (typeof showToast === 'function') showToast('Saved to device ✓');
  };
  cerShare.onclick = shareOrDownloadPoster;
}

/* ─────────────────────────────────────────
   OPEN STUDIO
───────────────────────────────────────── */
function openStudio() {
  if (typeof closeModal === 'function' && postcardModal) closeModal(postcardModal);

  // Reset state — these vars live in state.js
  studioBgImage    = null;
  studioFont       = 'playfair';
  studioBrightness = 100;
  studioBlur       = 0;
  studioDim        = 50;
  studioFilter     = 'none';
  generatedBlob    = null;
  selectedSize     = null;

  // Motion state (local to studio.js)
  studioMotion    = 'word';
  studioSpeedMult = 1.0;

  studioDesign = (currentPost?.emotion)
    ? (EMOTION_DESIGN_MAP[currentPost.emotion] || 'midnight-gold')
    : 'midnight-gold';

  studioOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  resetStudioUI();

  // YouTube thumbnail injection
  const meta = currentPost?.youtubeMeta;
  if (meta?.thumbnail) setTimeout(() => injectYoutubeBgOption(meta), 80);

  // Start live animated preview
  setTimeout(() => {
    refreshStageCanvas();
    triggerAnimation();
  }, 80);
}

/* ─────────────────────────────────────────
   RESET STUDIO UI
───────────────────────────────────────── */
function resetStudioUI() {
  document.querySelectorAll('.dock-tab').forEach((t, i)   => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.dock-panel').forEach((p, i) => p.classList.toggle('active', i === 0));
  document.querySelectorAll('.scene-swatch').forEach(s    => s.classList.toggle('active', s.dataset.design === studioDesign));
  document.querySelectorAll('.font-card').forEach((fc, i) => fc.classList.toggle('active', i === 0));
  document.querySelectorAll('.motion-style-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.motion-speed-btn').forEach((b, i) => b.classList.toggle('active', i === 1));

  const bSlider = document.getElementById('studiobrightness');
  const bVal    = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.value    = 100;
  if (bVal)    bVal.textContent = '100%';

  if (photoDropText) photoDropText.textContent = 'Tap to add a photo';
  if (photoDropZone) photoDropZone.classList.remove('has-photo');
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

  const loopCheck = document.getElementById('motionLoopCheck');
  if (loopCheck) loopCheck.checked = false;
}

/* ─────────────────────────────────────────
   ANIMATION ENGINE
───────────────────────────────────────── */
function triggerAnimation() {
  stopAnimation();
  _animStart   = null;
  _animPlaying = true;
  _rafId = requestAnimationFrame(animationLoop);
}

function stopAnimation() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  _animPlaying = false;
}

function scheduleRedraw() {
  if (!_animPlaying) refreshStageCanvas();
}

function animationLoop(timestamp) {
  if (!_animStart) _animStart = timestamp;
  const elapsed = timestamp - _animStart;

  refreshStageCanvas(elapsed);

  const totalDuration = getTotalDuration();

  if (elapsed < totalDuration) {
    _rafId = requestAnimationFrame(animationLoop);
  } else {
    refreshStageCanvas(totalDuration);
    _animPlaying = false;
    _rafId = null;

    const loopCheck = document.getElementById('motionLoopCheck');
    if (loopCheck && loopCheck.checked) {
      setTimeout(triggerAnimation, 600);
    }
  }
}

function getTotalDuration() {
  return Math.max(3000, 4500 * studioSpeedMult);
}

/* ─────────────────────────────────────────
   CANVAS RENDERING
───────────────────────────────────────── */
function refreshStageCanvas(elapsedMs) {
  if (!studioCanvas) return;
  const stage  = studioCanvas.parentElement;
  const dpr    = window.devicePixelRatio || 1;
  const availW = stage.clientWidth  - 40;
  const availH = stage.clientHeight - 40;
  const size   = Math.max(80, Math.min(availW, availH, 700));

  studioCanvas.style.width  = size + 'px';
  studioCanvas.style.height = size + 'px';
  const res           = Math.round(size * dpr);
  studioCanvas.width  = res;
  studioCanvas.height = res;

  const ctx = studioCanvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const ms = (elapsedMs !== undefined) ? elapsedMs : getTotalDuration();
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size, ms));
}

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

/* ─────────────────────────────────────────
   DRAW POSTER TO CANVAS CTX
───────────────────────────────────────── */
function drawPosterToCtx(ctx, W, H, ms) {
  // Use POSTER_DESIGNS from state.js
  const c  = POSTER_DESIGNS[studioDesign] || POSTER_DESIGNS['midnight-gold'];
  // Use FONT_FAMILIES from state.js
  const fd = FONT_FAMILIES[studioFont]    || FONT_FAMILIES['playfair'];
  const scale = W / 1080;
  const t     = Math.min(ms / getTotalDuration(), 1);

  ctx.clearRect(0, 0, W, H);
  ctx.filter = 'none';

  drawBackground(ctx, W, H, c, scale);
  drawRippleRings(ctx, W, H, scale, ms, c);

  const logoOpacity = easeOut(clamp((t - 0.0) / (0.12 * studioSpeedMult), 0, 1));
  drawLogo(ctx, W, H, scale, ms, logoOpacity, c);

  const waveOpacity = easeOut(clamp((t - 0.15 * studioSpeedMult) / 0.1, 0, 1));
  if (waveOpacity > 0) drawWaveform(ctx, W, H, scale, ms, waveOpacity, c);

  drawLyric(ctx, W, H, scale, t, fd, c);

  const metaDelay   = 0.55 * studioSpeedMult;
  const metaOpacity = easeOut(clamp((t - metaDelay) / 0.12, 0, 1));
  if (metaOpacity > 0) drawMeta(ctx, W, H, scale, metaOpacity, fd, c);

  const brandDelay   = 0.68 * studioSpeedMult;
  const brandOpacity = easeOut(clamp((t - brandDelay) / 0.1, 0, 1));
  if (brandOpacity > 0) drawBrand(ctx, W, H, scale, brandOpacity, c);
}

/* ── Background ── */
function drawBackground(ctx, W, H, c, scale) {
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
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,   c.bg[0]);
    g.addColorStop(0.5, c.bg[1]);
    g.addColorStop(1,   c.bg[2]);
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
  const glow = ctx.createRadialGradient(W/2, H, 0, W/2, H, W * 0.8);
  glow.addColorStop(0, hexToRgba(c.primary, 0.06));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  if (!c.light) {
    const sl = ctx.createLinearGradient(0, 0, W, 0);
    sl.addColorStop(0,   'transparent');
    sl.addColorStop(0.5, hexToRgba(c.primary, 0.55));
    sl.addColorStop(1,   'transparent');
    ctx.fillStyle = sl;
    ctx.fillRect(0, 0, W, 1);
  }
}

/* ── Ripple rings ── */
function drawRippleRings(ctx, W, H, scale, ms, c) {
  const cx = W / 2;
  const cy = H * 0.28;
  const baseR    = W * 0.075;
  const pulseDur = 3400;

  ctx.save();
  for (let i = 0; i < 3; i++) {
    const offset   = (i / 3) * pulseDur;
    const progress = ((ms + offset) % pulseDur) / pulseDur;
    const radius   = baseR + progress * baseR * 2.8;
    const opacity  = (1 - progress) * 0.65;
    if (opacity <= 0) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(c.primary, opacity);
    ctx.lineWidth   = Math.max(1.5, scale * 1.8);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Logo ── */
function drawLogo(ctx, W, H, scale, ms, opacity, c) {
  if (opacity <= 0) return;
  const cx = W / 2;
  const cy = H * 0.28;
  const r  = W * 0.075;

  ctx.save();
  ctx.globalAlpha = opacity;

  const breathe       = 0.5 + Math.sin(ms / 1700) * 0.5;
  ctx.shadowColor     = hexToRgba(c.primary, 0.6 + breathe * 0.4);
  ctx.shadowBlur      = (10 + breathe * 20) * scale;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = c.primary;
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

  const lx = cx - r * 0.55, lw = r * 1.1, ly = cy - r * 0.42, lh = r * 0.85;
  ctx.strokeStyle = c.light ? '#ffffff' : '#0B0B0D';
  ctx.lineWidth   = Math.max(r * 0.14, 2);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(lx, ly + lh);
  ctx.lineTo(lx, ly);
  ctx.lineTo(lx + lw * 0.28, ly + lh * 0.42);
  ctx.lineTo(cx,             ly + lh * 0.02);
  ctx.lineTo(lx + lw * 0.72, ly + lh * 0.42);
  ctx.lineTo(lx + lw,        ly);
  ctx.lineTo(lx + lw,        ly + lh);
  ctx.stroke();

  ctx.restore();
}

/* ── Waveform bars ── */
function drawWaveform(ctx, W, H, scale, ms, opacity, c) {
  const cx   = W / 2;
  const wy   = H * 0.28 + W * 0.095;
  const barW = Math.max(W * 0.006, 2);
  const gap  = Math.max(W * 0.009, 2.5);
  const maxH = H * 0.045;
  const bars = 7;
  const totalW  = bars * (barW + gap) - gap;
  const delays  = [0, 0.1, 0.2, 0.3, 0.2, 0.1, 0];

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle   = hexToRgba(c.primary, 0.55);

  for (let i = 0; i < bars; i++) {
    const pulse = Math.sin(ms / 400 + delays[i] * 10) * 0.4 + 0.6;
    const bh    = maxH * pulse;
    const bx    = cx - totalW / 2 + i * (barW + gap);
    const by    = wy - bh / 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, barW, bh, barW / 2);
    else ctx.rect(bx, by, barW, bh);
    ctx.fill();
  }
  ctx.restore();
}

/* ── Lyric text with motion styles ── */
function drawLyric(ctx, W, H, scale, t, fd, c) {
  if (!currentPost) return;

  const lyricRaw  = currentPost.text || '';
  const lyricText = lyricRaw.length > 100 ? lyricRaw.substring(0, 97) + '…' : lyricRaw;
  if (!lyricText) return;

  const textColor = studioBgImage ? '#ffffff' : c.text;
  const lyricLen  = lyricText.length;
  const baseSize  = lyricLen < 40 ? 82 * scale
                  : lyricLen < 65 ? 64 * scale
                  : lyricLen < 90 ? 52 * scale : 42 * scale;
  const isBold    = ['bebas','josefin','oswald'].includes(studioFont);
  const fontStr   = `${fd.style === 'italic' ? 'italic ' : ''}${isBold ? '700' : '600'} ${baseSize}px ${fd.family}`;

  ctx.font = fontStr;

  const maxW   = W * 0.82;
  const lines  = wrapText(ctx, lyricText, maxW);
  const lineH  = baseSize * 1.18;
  const totalH = (lines.length - 1) * lineH;
  const centerY = H * 0.46;

  const spd = studioSpeedMult;

  switch (studioMotion) {
    case 'word':   drawLyricWordByWord(ctx, W, lines, centerY, lineH, totalH, baseSize, fontStr, textColor, t, spd); break;
    case 'cinema': drawLyricCinema(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd); break;
    case 'fade':   drawLyricFade(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd); break;
    case 'type':   drawLyricTypewriter(ctx, W, lyricText, centerY, baseSize, fontStr, textColor, t, spd, maxW); break;
    case 'glitch': drawLyricGlitch(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd); break;
    case 'rise':   drawLyricRise(ctx, W, lines, centerY, lineH, totalH, baseSize, fontStr, textColor, t, spd); break;
    case 'blur':   drawLyricBlur(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd); break;
    default:       drawLyricFade(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd);
  }
}

/* Word by Word */
function drawLyricWordByWord(ctx, W, lines, centerY, lineH, totalH, baseSize, fontStr, textColor, t, spd) {
  ctx.font = fontStr;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let wordIdx = 0;
  const lyricStartT = 0.18 * spd;

  lines.forEach((line, li) => {
    const lineWords = line.split(' ');
    const y = centerY - totalH / 2 + li * lineH;
    let lineX = W / 2 - ctx.measureText(line).width / 2;

    lineWords.forEach(word => {
      const delay    = lyricStartT + wordIdx * 0.08 * spd;
      const wordT    = clamp((t - delay) / (0.15 * spd), 0, 1);
      const wordEase = easeSpring(wordT);
      if (wordT > 0) {
        const wordW = ctx.measureText(word).width;
        const drawX = lineX + wordW / 2;
        const drawY = y + (1 - wordEase) * 18 * (W / 1080);
        ctx.save();
        ctx.globalAlpha = wordT;
        ctx.fillStyle   = textColor;
        ctx.fillText(word, drawX, drawY);
        ctx.restore();
      }
      lineX += ctx.measureText(word + ' ').width;
      wordIdx++;
    });
  });
}

/* Cinematic */
function drawLyricCinema(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd) {
  const delay = 0.12 * spd;
  const lt    = clamp((t - delay) / (0.35 * spd), 0, 1);
  const ease  = easeOut(lt);
  ctx.save();
  ctx.globalAlpha = ease;
  ctx.filter      = `blur(${(1 - ease) * 10}px)`;
  ctx.font        = fontStr;
  ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle   = textColor;
  const sc = 0.94 + ease * 0.06;
  ctx.translate(W / 2, centerY);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -centerY);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, centerY - totalH / 2 + i * lineH));
  ctx.restore();
}

/* Fade Up */
function drawLyricFade(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd) {
  const delay = 0.12 * spd;
  const lt    = clamp((t - delay) / (0.28 * spd), 0, 1);
  const ease  = easeOut(lt);
  const shift = (1 - ease) * 22 * (W / 1080);
  ctx.save();
  ctx.globalAlpha = ease;
  ctx.font        = fontStr;
  ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle   = textColor;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, centerY - totalH / 2 + i * lineH + shift));
  ctx.restore();
}

/* Typewriter */
function drawLyricTypewriter(ctx, W, fullText, centerY, baseSize, fontStr, textColor, t, spd, maxW) {
  const delay   = 0.12 * spd;
  const lt      = clamp((t - delay) / (0.7 * spd), 0, 1);
  const shown   = Math.floor(lt * fullText.length);
  const display = fullText.substring(0, shown);

  ctx.save();
  ctx.font      = fontStr;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 1;

  const lines  = wrapText(ctx, display, maxW);
  const lineH  = baseSize * 1.18;
  const totalH = (lines.length - 1) * lineH;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, centerY - totalH / 2 + i * lineH));

  if (lt < 1 && Math.floor(t * 8) % 2 === 0) {
    const lastLine = lines[lines.length - 1] || '';
    const lw = ctx.measureText(lastLine).width;
    const cx = W / 2 + lw / 2 + 4 * (W / 1080);
    const cy = centerY - totalH / 2 + (lines.length - 1) * lineH;
    ctx.fillStyle   = '#E8C547';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(cx, cy - baseSize * 0.5, Math.max(2, 3 * (W / 1080)), baseSize * 0.9);
  }
  ctx.restore();
}

/* Glitch */
function drawLyricGlitch(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd) {
  const delay = 0.10 * spd;
  const lt    = clamp((t - delay) / (0.2 * spd), 0, 1);
  const ease  = easeOut(lt);

  ctx.save();
  ctx.font      = fontStr;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (lt < 0.85) {
    const colors = ['rgba(0,255,255,0.4)', 'rgba(255,0,255,0.4)'];
    colors.forEach((col, ci) => {
      ctx.save();
      ctx.globalAlpha = ease * 0.6;
      ctx.fillStyle   = col;
      const dx = (ci === 0 ? -1 : 1) * (1 - ease) * 5 * (W / 1080);
      lines.forEach((line, i) => ctx.fillText(line, W / 2 + dx, centerY - totalH / 2 + i * lineH));
      ctx.restore();
    });
  }

  ctx.globalAlpha = ease;
  ctx.fillStyle   = textColor;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, centerY - totalH / 2 + i * lineH));
  ctx.restore();
}

/* Rise */
function drawLyricRise(ctx, W, lines, centerY, lineH, totalH, baseSize, fontStr, textColor, t, spd) {
  ctx.font      = fontStr;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const delay   = 0.12 * spd;
  let charIdx   = 0;

  lines.forEach((line, li) => {
    const y   = centerY - totalH / 2 + li * lineH;
    const lw  = ctx.measureText(line).width;
    let lineX = W / 2 - lw / 2;
    line.split('').forEach(ch => {
      const charDelay = delay + charIdx * 0.025 * spd;
      const charT     = clamp((t - charDelay) / (0.18 * spd), 0, 1);
      const charEase  = easeSpring(charT);
      if (charT > 0) {
        const shift = (1 - charEase) * 30 * (W / 1080);
        ctx.save();
        ctx.globalAlpha = charT;
        ctx.fillStyle   = textColor;
        ctx.fillText(ch, lineX, y + shift);
        ctx.restore();
      }
      lineX += ctx.measureText(ch).width;
      charIdx++;
    });
  });
}

/* Blur Reveal */
function drawLyricBlur(ctx, W, lines, centerY, lineH, totalH, fontStr, textColor, t, spd) {
  const delay   = 0.12 * spd;
  const lt      = clamp((t - delay) / (0.45 * spd), 0, 1);
  const ease    = easeOut(lt);
  const blurAmt = (1 - ease) * 18;

  ctx.save();
  ctx.globalAlpha = ease;
  if (blurAmt > 0.5) ctx.filter = `blur(${blurAmt}px)`;
  ctx.font        = fontStr;
  ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle   = textColor;
  const spacing   = (1 - ease) * 0.3;
  ctx.letterSpacing = spacing ? spacing + 'em' : '';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, centerY - totalH / 2 + i * lineH));
  ctx.restore();
}

/* ── Song & Artist ── */
function drawMeta(ctx, W, H, scale, opacity, fd, c) {
  if (!currentPost) return;
  const k = currentPost.knowledge || {};
  // For guess mode with hidden knowledge, don't reveal song/artist on poster
  if (currentPost.mode === 'guess' && k.hidden) return;
  if (!k.song && !k.artist) return;

  const textColor = studioBgImage ? '#ffffff' : c.text;
  const lyricLen  = (currentPost.text || '').length;
  const baseSize  = lyricLen < 40 ? 82 * scale : lyricLen < 65 ? 64 * scale : lyricLen < 90 ? 52 * scale : 42 * scale;
  const songSize  = Math.max(Math.round(baseSize * 0.42), 28 * scale);
  const artSize   = Math.max(Math.round(baseSize * 0.30), 20 * scale);
  const songY     = H * 0.76;
  const artistY   = songY + songSize + 16 * scale;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign   = 'center';

  ctx.strokeStyle = hexToRgba(c.primary, 0.35);
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 18 * scale, songY - songSize * 0.85);
  ctx.lineTo(W / 2 + 18 * scale, songY - songSize * 0.85);
  ctx.stroke();

  if (studioBgImage) { ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 14 * scale; }
  ctx.fillStyle = studioBgImage ? '#fff' : c.primary;
  ctx.font      = `700 ${songSize}px ${fd.family}`;
  const song    = (k.song || '').length > 32 ? k.song.substring(0, 32) + '…' : (k.song || '');
  ctx.fillText(song, W / 2, songY);

  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.fillStyle  = studioBgImage ? 'rgba(255,255,255,0.8)' : (c.light ? 'rgba(42,37,32,0.65)' : 'rgba(255,255,255,0.65)');
  ctx.font       = `700 ${artSize}px 'Space Mono', monospace`;
  const artist   = (k.artist || '').length > 40 ? k.artist.substring(0, 40) + '…' : (k.artist || '');
  ctx.fillText(artist, W / 2, artistY);

  ctx.restore();
}

/* ── Brand footer ── */
function drawBrand(ctx, W, H, scale, opacity, c) {
  // APP_DOMAIN is declared in state.js
  const markColor = studioBgImage ? 'rgba(255,255,255,0.7)'
                  : c.light ? hexToRgba(c.primary, 0.75)
                  : hexToRgba(c.primary, 0.8);
  const fy  = H * 0.94;
  const lSz = Math.max(Math.round(18 * scale), 12);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle   = markColor;
  ctx.font        = `700 ${lSz}px 'Space Mono', monospace`;
  ctx.textAlign   = 'center';
  ctx.fillText(APP_DOMAIN, W / 2, fy);
  ctx.restore();
}

/* ── Text wrap helper ── */
function wrapText(ctx, text, maxW) {
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
  return lines;
}

/* ─────────────────────────────────────────
   GENERATE FINAL POSTER
───────────────────────────────────────── */
async function generateFinalPoster(sizeKey) {
  // Use extended sizes map for export
  const dim = POSTER_SIZES_STUDIO[sizeKey] || POSTER_SIZES[sizeKey];
  if (!dim || !currentPost) throw new Error('Invalid size or no post');

  const offscreen   = document.createElement('canvas');
  offscreen.width   = dim.w;
  offscreen.height  = dim.h;
  const ctx         = offscreen.getContext('2d');
  await document.fonts.ready;
  drawPosterToCtx(ctx, dim.w, dim.h, getTotalDuration());

  return new Promise((resolve, reject) => {
    offscreen.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

/* ─────────────────────────────────────────
   CEREMONY THUMBNAIL
───────────────────────────────────────── */
function drawCeremonyThumb() {
  const dpr  = window.devicePixelRatio || 1;
  const size = 600;
  ceremonyThumb.width        = Math.round(size * dpr);
  ceremonyThumb.height       = Math.round(size * dpr);
  ceremonyThumb.style.width  = '';
  ceremonyThumb.style.height = '';
  const ctx = ceremonyThumb.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size, getTotalDuration()));
}

/* ─────────────────────────────────────────
   PHOTO HANDLING
───────────────────────────────────────── */
function handleStudioPhoto(file) {
  if (!file.type.startsWith('image/')) {
    if (typeof showToast === 'function') showToast('Please upload an image');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('File too large (max 15MB)');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      studioBgImage = img;
      if (photoDropText) photoDropText.textContent = file.name;
      if (photoDropZone) photoDropZone.classList.add('has-photo');
      if (photoControls) photoControls.classList.remove('hidden');
      document.getElementById('ytBgOption')?.remove();
      if (typeof showToast === 'function') showToast('Photo added');
      scheduleRedraw();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/* ─────────────────────────────────────────
   YOUTUBE THUMBNAIL OPTION
───────────────────────────────────────── */
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

  const tryLoad = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('CORS'));
    img.src     = src;
  });

  const applyImage = img => {
    studioBgImage = img;
    if (photoDropText) photoDropText.textContent = 'YouTube thumbnail';
    if (photoDropZone) photoDropZone.classList.add('has-photo');
    if (photoControls) photoControls.classList.remove('hidden');
    opt.style.background  = 'rgba(255,0,0,0.18)';
    opt.style.borderColor = 'rgba(255,0,0,0.55)';
    if (typeof showToast === 'function') showToast('Thumbnail set as background ✓');
    scheduleRedraw();
  };

  opt.onclick = () => {
    tryLoad(meta.thumbnail)
      .then(applyImage)
      .catch(() =>
        fetch(meta.thumbnail)
          .then(r => r.blob())
          .then(blob => tryLoad(URL.createObjectURL(blob)))
          .then(applyImage)
          .catch(() => {
            if (typeof showToast === 'function') showToast('Could not load thumbnail — upload manually');
          })
      );
  };

  panel.insertBefore(opt, panel.firstChild);
  document.querySelector('[data-tab="photo"]')?.click();
}

/* ─────────────────────────────────────────
   EXPORT
───────────────────────────────────────── */
async function shareOrDownloadPoster() {
  if (!generatedBlob) {
    if (typeof showToast === 'function') showToast('Poster not ready yet');
    return;
  }
  const fileName  = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
  const file      = new File([generatedBlob], fileName, { type: 'image/png' });
  const shareData = {
    title: `MARGO — ${currentPost?.text?.substring(0, 50) || 'Lyric'}`,
    text:  `"${currentPost?.text || ''}" — drop your lyric at trymargo.com`,
    files: [file],
  };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      if (typeof showToast === 'function') showToast('Shared!');
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  downloadPosterBlob();
  if (typeof showToast === 'function') showToast('Saved to device!');
}

function downloadPosterBlob() {
  if (!generatedBlob) {
    if (typeof showToast === 'function') showToast('Poster not ready');
    return;
  }
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
    if (typeof showToast === 'function') showToast('Could not download — try again');
  }
}

/* ─────────────────────────────────────────
   EASING HELPERS
───────────────────────────────────────── */
function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
function easeSpring(t) {
  t = clamp(t, 0, 1);
  return 1 + Math.pow(t - 1, 3) * Math.cos(t * Math.PI * 4.5) * 0.28;
}
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(232,197,71,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─────────────────────────────────────────
   WINDOW RESIZE
───────────────────────────────────────── */
window.addEventListener('resize', () => {
  if (!studioOverlay || studioOverlay.classList.contains('hidden')) return;
  if (_animPlaying) return;
  refreshStageCanvas(getTotalDuration());
});
