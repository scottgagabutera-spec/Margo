/* ============================================================
   MARGO — js/studio.js
   v5.1 — Full Motion Studio (duplicate-safe)
   ─────────────────────────────────────────────────────────
   Fixed: renamed internal constants to avoid collision with
   state.js (POSTER_DESIGNS → STUDIO_DESIGNS, etc.)
   ============================================================ */

/* ── Load mp4-muxer from CDN ── */
(function loadMp4Muxer() {
  if (window.Mp4Muxer) return;
  const s   = document.createElement('script');
  s.src     = 'https://cdn.jsdelivr.net/npm/mp4-muxer@latest/build/mp4-muxer.js';
  s.async   = true;
  s.onerror = () => console.warn('[Studio] mp4-muxer failed — will fall back to WebM');
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════════════════
   DESIGN DATA  (studio-private, won't clash with state.js)
══════════════════════════════════════════════════════════ */
const STUDIO_DESIGNS = {
  'midnight-gold':   { bg:['#0B0B0D','#111116','#0B0B0D'],   accent:'#E8C547', text:'#F0F0F0', light:false },
  'royal-purple':    { bg:['#0d0014','#1a0028','#0a0010'],   accent:'#c77dff', text:'#F0F0F0', light:false },
  'neon-cyan':       { bg:['#050e1a','#071525','#050e1a'],   accent:'#00e5ff', text:'#F0F0F0', light:false },
  'sunset-coral':    { bg:['#120508','#1e080c','#120508'],   accent:'#ff6b4a', text:'#F0F0F0', light:false },
  'emerald-night':   { bg:['#051a0d','#081f10','#051a0d'],   accent:'#50fa7b', text:'#F0F0F0', light:false },
  'rose-gold':       { bg:['#1a0d0f','#220f13','#1a0d0f'],   accent:'#f4a4c0', text:'#F0F0F0', light:false },
  'cream-editorial': { bg:['#f5f1e8','#ede8dc','#f5f1e8'],   accent:'#B8901A', text:'#1a1a20', light:true  },
  'monochrome':      { bg:['#000000','#111111','#000000'],   accent:'#ffffff', text:'#F0F0F0', light:false },
  'vaporwave':       { bg:['#1a0533','#0f1a33','#001a1a'],   accent:'#ff71ce', text:'#F0F0F0', light:false },
  'neon-dark':       { bg:['#0a0a0a','#0f0a0f','#0a0a0a'],   accent:'#ff00ff', text:'#F0F0F0', light:false },
  'y2k-chrome':      { bg:['#000033','#000824','#000033'],   accent:'#00ffff', text:'#F0F0F0', light:false },
  'brutalist':       { bg:['#ffffff','#f0f0f0','#ffffff'],   accent:'#000000', text:'#1a1a20', light:true  },
};

const STUDIO_FONT_MAP = {
  playfair:     { family:"'Playfair Display', serif",   style:'italic',  weight:'400' },
  cormorant:    { family:"'Cormorant Garamond', serif", style:'italic',  weight:'600' },
  lora:         { family:"'Lora', serif",               style:'italic',  weight:'400' },
  merriweather: { family:"'Merriweather', serif",       style:'normal',  weight:'700' },
  josefin:      { family:"'Josefin Sans', sans-serif",  style:'normal',  weight:'400' },
  bebas:        { family:"'Bebas Neue', sans-serif",    style:'normal',  weight:'400' },
  oswald:       { family:"'Oswald', sans-serif",        style:'normal',  weight:'600' },
  dancing:      { family:"'Dancing Script', cursive",   style:'normal',  weight:'700' },
};

const STUDIO_SIZES = {
  'instagram-square': { w:1080, h:1080,  label:'Instagram 1:1'      },
  'instagram-story':  { w:1080, h:1920,  label:'IG/FB Story 9:16'   },
  'facebook-story':   { w:1080, h:1920,  label:'Facebook Story 9:16' },
  'tiktok':           { w:1080, h:1920,  label:'TikTok 9:16'        },
  'twitter':          { w:1200, h:675,   label:'Twitter/X 16:9'     },
  'linkedin':         { w:1200, h:627,   label:'LinkedIn 1.91:1'    },
  'reddit':           { w:1200, h:1200,  label:'Reddit 1:1'         },
  'whatsapp':         { w:1080, h:1080,  label:'WhatsApp 1:1'       },
  'pinterest':        { w:1000, h:1500,  label:'Pinterest 2:3'      },
};

const EMOTION_THEME_MAP = {
  Love:'rose-gold', Heartbreak:'sunset-coral', Hope:'neon-cyan',
  Nostalgia:'midnight-gold', Healing:'emerald-night', Joy:'vaporwave',
  Rage:'sunset-coral', Loneliness:'royal-purple',
};

/* ══════════════════════════════════════════════════════════
   STUDIO STATE
   Note: studioBgImage, studioFont, studioBrightness,
   studioBlur, studioDim, studioFilter, studioDesign,
   generatedBlob, selectedSize are declared in state.js.
   Only motion-specific state lives here.
══════════════════════════════════════════════════════════ */
let studioMotion = 'word';
let studioSpeed  = 1.0;
let _exportType  = 'mp4';
let _studioMode  = 'image'; // 'image' | 'video'

/* ══════════════════════════════════════════════════════════
   INJECT STYLES
══════════════════════════════════════════════════════════ */
function injectStudioV5Styles() {
  if (document.getElementById('studioV5Styles')) return;
  const s = document.createElement('style');
  s.id = 'studioV5Styles';
  s.textContent = `
    #panel-motion {
      display: none; flex-direction: column; gap: 10px; padding: 10px 0;
    }
    #panel-motion.active { display: flex; }

    .motion-list { display: flex; flex-direction: column; gap: 5px; }

    .motion-style-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px; width: 100%; text-align: left;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.07);
      cursor: pointer; transition: all 0.18s;
    }
    .motion-style-btn:hover   { border-color: rgba(232,197,71,0.28); }
    .motion-style-btn.active  {
      background: rgba(232,197,71,0.09);
      border-color: rgba(232,197,71,0.38);
    }
    .msb-icon  { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
    .msb-name  {
      display: block; font-family: 'DM Sans', sans-serif;
      font-size: 0.74rem; font-weight: 600; color: rgba(240,240,240,0.88);
      margin-bottom: 1px;
    }
    .motion-style-btn.active .msb-name { color: #E8C547; }
    .msb-desc  {
      display: block; font-family: 'Space Mono', monospace;
      font-size: 0.37rem; color: rgba(255,255,255,0.28);
      text-transform: uppercase; letter-spacing: 0.4px;
    }

    .motion-sec-label {
      font-family: 'Space Mono', monospace; font-size: 0.4rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 2px;
      color: rgba(255,255,255,0.28); padding-top: 4px;
    }

    .motion-spd-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; }
    .motion-spd-btn {
      padding: 8px 4px; border-radius: 8px; text-align: center;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.3);
      font-family: 'Space Mono', monospace; font-size: 0.4rem; font-weight: 700;
      text-transform: uppercase; cursor: pointer; transition: all 0.18s;
    }
    .motion-spd-btn:hover  { border-color: rgba(232,197,71,0.3); color: rgba(255,255,255,0.7); }
    .motion-spd-btn.active {
      background: rgba(232,197,71,0.1); border-color: rgba(232,197,71,0.42); color: #E8C547;
    }

    .ceremony-type-row {
      display: flex; gap: 8px; margin-bottom: 12px; width: 100%;
    }
    .cer-type-btn {
      flex: 1; padding: 10px 8px; border-radius: 10px; cursor: pointer;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.45); text-align: center;
      font-family: 'Space Mono', monospace; transition: all 0.2s;
    }
    .cer-type-btn .ctb-icon { font-size: 1.1rem; display: block; margin-bottom: 4px; }
    .cer-type-btn .ctb-name {
      display: block; font-size: 0.42rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;
    }
    .cer-type-btn .ctb-desc {
      display: block; font-size: 0.32rem; text-transform: uppercase;
      letter-spacing: 0.5px; color: rgba(255,255,255,0.2);
    }
    .cer-type-btn.active {
      background: rgba(232,197,71,0.1);
      border-color: rgba(232,197,71,0.45);
      color: #E8C547;
    }
    .cer-type-btn.active .ctb-desc { color: rgba(232,197,71,0.45); }

    .cer-progress-wrap {
      width: 100%; height: 3px; border-radius: 2px;
      background: rgba(255,255,255,0.07);
      margin: 6px 0 10px; overflow: hidden; display: none;
    }
    .cer-progress-wrap.show { display: block; }
    .cer-progress-bar {
      height: 100%; background: #E8C547; border-radius: 2px;
      width: 0%; transition: width 0.1s linear;
    }

    .size-options { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px !important; }

    /* ── Studio Mode Picker ── */
    .studio-mode-picker {
      position: absolute; inset: 0; z-index: 200;
      background: #0B0B0D;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 24px;
    }
    .studio-mode-picker.hidden { display: none; }
    .smp-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    .smp-logo-text {
      font-family: 'Syne', sans-serif; font-size: 0.75rem;
      font-weight: 800; letter-spacing: 3px; color: #E8C547; text-transform: uppercase;
    }
    .smp-title {
      font-family: 'Syne', sans-serif; font-size: 1.3rem;
      font-weight: 800; color: #F0F0F0; text-align: center;
      margin-bottom: 6px;
    }
    .smp-sub {
      font-family: 'Space Mono', monospace; font-size: 0.38rem;
      color: rgba(255,255,255,0.28); text-align: center;
      text-transform: uppercase; letter-spacing: 2px; margin-bottom: 28px;
    }
    .smp-cards { display: flex; gap: 12px; width: 100%; max-width: 420px; }
    .smp-card {
      flex: 1; border-radius: 16px; padding: 22px 14px 18px;
      cursor: pointer; text-align: center;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
      position: relative; overflow: hidden;
    }
    .smp-card:hover {
      border-color: rgba(232,197,71,0.4);
      background: rgba(232,197,71,0.06);
      transform: translateY(-2px);
    }
    .smp-card:active { transform: translateY(0); }
    .smp-card-icon { font-size: 2rem; display: block; margin-bottom: 12px; line-height: 1; }
    .smp-card-name {
      display: block; font-family: 'Syne', sans-serif; font-size: 0.85rem;
      font-weight: 800; color: #F0F0F0; margin-bottom: 8px;
    }
    .smp-card-desc {
      font-family: 'Space Mono', monospace; font-size: 0.34rem;
      color: rgba(255,255,255,0.3); text-transform: uppercase;
      letter-spacing: 0.8px; line-height: 1.8;
    }
    .smp-card-tag {
      display: inline-block; margin-top: 10px;
      padding: 4px 10px; border-radius: 20px; font-size: 0.32rem;
      font-family: 'Space Mono', monospace; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .smp-card-image .smp-card-tag { background: rgba(232,197,71,0.12); color: #E8C547; border: 1px solid rgba(232,197,71,0.25); }
    .smp-card-video .smp-card-tag { background: rgba(107,140,255,0.12); color: #6B8CFF; border: 1px solid rgba(107,140,255,0.25); }
    .smp-cancel {
      margin-top: 20px; background: none; border: none;
      color: rgba(255,255,255,0.22); font-family: 'Space Mono', monospace;
      font-size: 0.38rem; text-transform: uppercase; letter-spacing: 1.5px;
      cursor: pointer; padding: 8px 16px; transition: color 0.18s;
    }
    .smp-cancel:hover { color: rgba(255,255,255,0.5); }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════
   BUILD + SHOW MODE PICKER
══════════════════════════════════════════════════════════ */
function buildModePicker() {
  if (document.getElementById('studioModePicker')) return;
  const overlay = document.getElementById('studioOverlay');
  const picker  = document.createElement('div');
  picker.id        = 'studioModePicker';
  picker.className = 'studio-mode-picker hidden';
  picker.innerHTML = `
    <div class="smp-logo">
      <svg viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <circle cx="40" cy="40" r="36" fill="#E8C547"/>
        <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
              fill="none" stroke="#0B0B0D" stroke-width="5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="smp-logo-text">MARGO · Studio</span>
    </div>
    <div class="smp-title">What are you creating?</div>
    <div class="smp-sub">Choose your format to begin</div>
    <div class="smp-cards">
      <div class="smp-card smp-card-image" data-mode="image">
        <span class="smp-card-icon">🖼</span>
        <span class="smp-card-name">Image</span>
        <div class="smp-card-desc">Static poster<br>PNG · Instant</div>
        <span class="smp-card-tag">PNG</span>
      </div>
      <div class="smp-card smp-card-video" data-mode="video">
        <span class="smp-card-icon">🎬</span>
        <span class="smp-card-name">Video</span>
        <div class="smp-card-desc">Animated clip<br>MP4 · All platforms</div>
        <span class="smp-card-tag">MP4</span>
      </div>
    </div>
    <button class="smp-cancel" id="smpCancelBtn">← Back</button>
  `;
  overlay.appendChild(picker);

  picker.querySelector('.smp-cards').addEventListener('click', e => {
    const card = e.target.closest('.smp-card');
    if (!card) return;
    _studioMode = card.dataset.mode;
    _exportType = _studioMode === 'video' ? 'mp4' : 'png';
    hideModePickerAndEnterStudio();
  });

  document.getElementById('smpCancelBtn').onclick = () => {
    document.getElementById('studioModePicker')?.remove();
    studioOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    openModal(postcardModal);
  };
}

function showModePicker() {
  const picker = document.getElementById('studioModePicker');
  if (picker) picker.classList.remove('hidden');
}

function hideModePickerAndEnterStudio() {
  // Remove picker
  document.getElementById('studioModePicker')?.remove();

  // Show/hide Motion tab based on mode
  const motionTab   = document.querySelector('[data-tab="motion"]');
  const motionPanel = document.getElementById('panel-motion');
  if (motionTab)   motionTab.style.display   = _studioMode === 'video' ? '' : 'none';
  if (motionPanel) motionPanel.style.display = _studioMode === 'video' ? '' : 'none';

  // Full UI reset now that mode is known
  resetStudioUI();

  // Offer YouTube thumbnail if available
  const meta = currentPost?.youtubeMeta;
  if (meta?.thumbnail) setTimeout(() => injectYoutubeBgOption(meta), 80);

  setTimeout(refreshStageCanvas, 60);
}

/* ══════════════════════════════════════════════════════════
   BUILD MOTION TAB
══════════════════════════════════════════════════════════ */
const MOTION_DEFS = [
  { key:'word',   icon:'◈', name:'Word by Word', desc:'Each word rises in'           },
  { key:'cinema', icon:'◉', name:'Cinematic',    desc:'Scale + bloom from soft focus' },
  { key:'fade',   icon:'↑', name:'Fade Up',      desc:'Clean upward entrance'        },
  { key:'type',   icon:'|', name:'Typewriter',   desc:'Types letter by letter'       },
  { key:'glitch', icon:'⚡', name:'Glitch',       desc:'Digital noise entrance'       },
  { key:'rise',   icon:'✦', name:'Rise',         desc:'Characters float up'          },
  { key:'blur',   icon:'◌', name:'Blur Reveal',  desc:'Sharpens from fog'            },
];

function buildMotionDockTab() {
  const dockTabs = document.querySelector('.dock-tabs');
  if (!dockTabs || document.querySelector('[data-tab="motion"]')) return;

  const tab   = document.createElement('button');
  tab.className   = 'dock-tab';
  tab.dataset.tab = 'motion';
  tab.innerHTML   = `<span class="dock-tab-icon">◈</span><span>Motion</span>`;
  dockTabs.appendChild(tab);

  const dock  = document.querySelector('.studio-dock');
  const panel = document.createElement('div');
  panel.className = 'dock-panel';
  panel.id        = 'panel-motion';

  const styleRows = MOTION_DEFS.map(m =>
    `<button class="motion-style-btn${m.key === 'word' ? ' active' : ''}" data-motion="${m.key}">
      <span class="msb-icon">${m.icon}</span>
      <div><span class="msb-name">${m.name}</span><span class="msb-desc">${m.desc}</span></div>
    </button>`
  ).join('');

  panel.innerHTML = `
    <div class="motion-list">${styleRows}</div>
    <div class="motion-sec-label">Animation Speed</div>
    <div class="motion-spd-grid">
      <button class="motion-spd-btn"        data-spd="2.2">Slow</button>
      <button class="motion-spd-btn active" data-spd="1">Normal</button>
      <button class="motion-spd-btn"        data-spd="0.6">Fast</button>
      <button class="motion-spd-btn"        data-spd="0.35">Rapid</button>
    </div>`;
  dock.appendChild(panel);

  panel.querySelector('.motion-list').addEventListener('click', e => {
    const btn = e.target.closest('.motion-style-btn');
    if (!btn) return;
    panel.querySelectorAll('.motion-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    studioMotion = btn.dataset.motion;
    refreshStageCanvas();
  });

  panel.querySelector('.motion-spd-grid').addEventListener('click', e => {
    const btn = e.target.closest('.motion-spd-btn');
    if (!btn) return;
    panel.querySelectorAll('.motion-spd-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    studioSpeed = parseFloat(btn.dataset.spd);
  });

  tab.addEventListener('click', () => {
    document.querySelectorAll('.dock-tab').forEach(t   => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
  });
}

/* ══════════════════════════════════════════════════════════
   BUILD CEREMONY EXPORT TYPE ROW
══════════════════════════════════════════════════════════ */
function buildCeremonyExtras() {
  const inner = document.querySelector('.ceremony-inner');
  if (!inner || inner.querySelector('.ceremony-type-row')) return;

  const actions = inner.querySelector('.ceremony-actions');

  const typeRow = document.createElement('div');
  typeRow.className = 'ceremony-type-row';
  typeRow.innerHTML = `
    <button class="cer-type-btn active" data-export="mp4">
      <span class="ctb-icon">🎬</span>
      <span class="ctb-name">Animated MP4</span>
      <span class="ctb-desc">All phones · All platforms</span>
    </button>
    <button class="cer-type-btn" data-export="png">
      <span class="ctb-icon">🖼</span>
      <span class="ctb-name">Static PNG</span>
      <span class="ctb-desc">Lightest · Instant share</span>
    </button>`;
  inner.insertBefore(typeRow, actions);

  typeRow.addEventListener('click', e => {
    const btn = e.target.closest('.cer-type-btn');
    if (!btn) return;
    typeRow.querySelectorAll('.cer-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _exportType = btn.dataset.export;
  });

  const prog = document.createElement('div');
  prog.className = 'cer-progress-wrap';
  prog.id        = 'cerProgressWrap';
  prog.innerHTML = `<div class="cer-progress-bar" id="cerProgressBar"></div>`;
  inner.insertBefore(prog, actions);
}

/* ══════════════════════════════════════════════════════════
   UPGRADE SIZE PICKER
══════════════════════════════════════════════════════════ */
function upgradeSizePicker() {
  const opts = document.querySelector('.size-options');
  if (!opts || opts.dataset.v5) return;
  opts.dataset.v5 = '1';

  [
    { size:'facebook-story', ratio:'9:16',   name:'FB Story',  dim:'1080 × 1920' },
    { size:'tiktok',         ratio:'9:16',   name:'TikTok',    dim:'1080 × 1920' },
    { size:'linkedin',       ratio:'1.91:1', name:'LinkedIn',  dim:'1200 × 627'  },
    { size:'whatsapp',       ratio:'1:1',    name:'WhatsApp',  dim:'1080 × 1080' },
  ].forEach(({ size, ratio, name, dim }) => {
    const btn = document.createElement('button');
    btn.className    = 'size-opt';
    btn.dataset.size = size;
    btn.innerHTML    = `<span class="size-ratio">${ratio}</span><span class="size-name">${name}</span><span class="size-dim">${dim}</span>`;
    opts.appendChild(btn);
  });
}

/* ══════════════════════════════════════════════════════════
   INIT STUDIO
══════════════════════════════════════════════════════════ */
function initStudio() {
  injectStudioV5Styles();
  buildMotionDockTab();
  buildCeremonyExtras();
  upgradeSizePicker();

  sharePosterBtn.onclick = openStudio;

  closeStudio.onclick = () => {
    studioOverlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    openModal(postcardModal);
  };

  document.querySelectorAll('.dock-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.dock-tab').forEach(t   => t.classList.remove('active'));
      document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    };
  });

  document.querySelectorAll('.scene-swatch').forEach(sw => {
    sw.onclick = () => {
      document.querySelectorAll('.scene-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      studioDesign = sw.dataset.design;
      refreshStageCanvas();
    };
  });

  const bSlider = document.getElementById('studiobrightness');
  const bValEl  = document.getElementById('studioBrightnessVal');
  if (bSlider) {
    bSlider.oninput = () => {
      studioBrightness = parseInt(bSlider.value);
      if (bValEl) bValEl.textContent = studioBrightness + '%';
      refreshStageCanvas();
    };
  }

  document.querySelectorAll('.font-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      studioFont = card.dataset.font;
      refreshStageCanvas();
    };
  });

  const dropZone = document.getElementById('photoUploadZone');
  if (dropZone) {
    dropZone.onclick = () => studioPhotoInput?.click();
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', e => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop',      e => { e.preventDefault(); dropZone.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) handleStudioPhoto(f); });
  }
  if (studioPhotoInput) {
    studioPhotoInput.onchange = e => { const f = e.target.files[0]; if (f) handleStudioPhoto(f); };
  }

  const blurSlider = document.getElementById('studioBlur'),  blurVal = document.getElementById('studioBlurVal');
  const dimSlider  = document.getElementById('studioDim'),   dimVal  = document.getElementById('studioDimVal');
  if (blurSlider) blurSlider.oninput = () => { studioBlur = parseInt(blurSlider.value); if (blurVal) blurVal.textContent = studioBlur; refreshStageCanvas(); };
  if (dimSlider)  dimSlider.oninput  = () => { studioDim  = parseInt(dimSlider.value);  if (dimVal)  dimVal.textContent  = studioDim + '%'; refreshStageCanvas(); };

  document.querySelectorAll('.photo-filter').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioFilter = btn.dataset.filter;
      refreshStageCanvas();
    };
  });

  const rmBtn = document.getElementById('studioRemovePhoto');
  if (rmBtn) rmBtn.onclick = clearStudioPhoto;

  studioExportBtn.onclick = () => sizePicker.classList.remove('hidden');
  sizeCancelBtn.onclick   = () => sizePicker.classList.add('hidden');

  document.querySelector('.size-options').addEventListener('click', async e => {
    const btn = e.target.closest('.size-opt');
    if (!btn) return;
    selectedSize = btn.dataset.size;
    sizePicker.classList.add('hidden');

    ceremonyOverlay.classList.remove('hidden');
    const headline = ceremonyOverlay.querySelector('.ceremony-headline');
    const actions  = ceremonyOverlay.querySelector('.ceremony-actions');
    const progWrap = document.getElementById('cerProgressWrap');
    const progBar  = document.getElementById('cerProgressBar');

    if (headline) headline.textContent = _studioMode === 'video' ? 'Recording animation…' : 'Generating poster…';
    if (actions)  actions.style.pointerEvents = 'none';
    if (progWrap && _studioMode === 'video') progWrap.classList.add('show');

    try {
      generatedBlob = _studioMode === 'video'
        ? await exportAnimatedMP4(selectedSize, p => { if (progBar) progBar.style.width = (p * 100).toFixed(0) + '%'; })
        : await generateStaticPNG(selectedSize);
    } catch (err) {
      console.error('[Studio] export failed:', err);
      showToast('Export failed — try again');
      ceremonyOverlay.classList.add('hidden');
      if (progWrap) progWrap.classList.remove('show');
      if (actions)  actions.style.pointerEvents = '';
      return;
    }

    if (progWrap) { progWrap.classList.remove('show'); if (progBar) progBar.style.width = '0%'; }
    if (actions)  actions.style.pointerEvents = '';
    drawCeremonyThumb();
    if (headline) headline.textContent = _studioMode === 'video' ? 'Your video is ready.' : 'Your poster is ready.';
  });

  ceremonyBack.onclick = () => { ceremonyOverlay.classList.add('hidden'); generatedBlob = null; };

  cerDownload.onclick = () => {
    if (!generatedBlob) { showToast('Still generating…'); return; }
    downloadBlob();
    showToast('Saved to device ✓');
  };

  cerShare.onclick = shareOrDownload;
}

/* ══════════════════════════════════════════════════════════
   OPEN STUDIO
══════════════════════════════════════════════════════════ */
function openStudio() {
  closeModal(postcardModal);

  // Reset all state
  studioBgImage    = null;
  studioFont       = 'playfair';
  studioBrightness = 100;
  studioBlur       = 0;
  studioDim        = 50;
  studioFilter     = 'none';
  studioMotion     = 'word';
  studioSpeed      = 1.0;
  generatedBlob    = null;
  selectedSize     = null;
  _studioMode      = 'image';
  _exportType      = 'png';
  studioDesign     = EMOTION_THEME_MAP[currentPost?.emotion] || 'midnight-gold';

  studioOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');

  // Show mode picker FIRST — resetStudioUI and canvas happen after user picks
  document.getElementById('studioModePicker')?.remove();
  buildModePicker();
  showModePicker();
}


/* ══════════════════════════════════════════════════════════
   RESET STUDIO UI
══════════════════════════════════════════════════════════ */
function resetStudioUI() {
  document.querySelectorAll('.dock-tab').forEach((t, i)   => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.dock-panel').forEach((p, i) => p.classList.toggle('active', i === 0));

  document.querySelectorAll('.scene-swatch').forEach(s => s.classList.toggle('active', s.dataset.design === studioDesign));
  document.querySelectorAll('.font-card').forEach((fc, i) => fc.classList.toggle('active', i === 0));
  document.querySelectorAll('.motion-style-btn').forEach(b => b.classList.toggle('active', b.dataset.motion === 'word'));
  document.querySelectorAll('.motion-spd-btn').forEach(b    => b.classList.toggle('active', b.dataset.spd   === '1'));
  document.querySelectorAll('.cer-type-btn').forEach(b => b.classList.toggle('active', b.dataset.export === _exportType));

  const bsl = document.getElementById('studiobrightness'), bvl = document.getElementById('studioBrightnessVal');
  if (bsl) bsl.value = 100; if (bvl) bvl.textContent = '100%';

  clearStudioPhoto();
  const blurSl = document.getElementById('studioBlur'), blurV = document.getElementById('studioBlurVal');
  const dimSl  = document.getElementById('studioDim'),  dimV  = document.getElementById('studioDimVal');
  if (blurSl) blurSl.value = 0;  if (blurV) blurV.textContent = '0';
  if (dimSl)  dimSl.value  = 50; if (dimV)  dimV.textContent  = '50%';
  document.querySelectorAll('.photo-filter').forEach((f, i) => f.classList.toggle('active', i === 0));

  sizePicker.classList.add('hidden');
  ceremonyOverlay.classList.add('hidden');
  document.getElementById('ytBgOption')?.remove();
}

function clearStudioPhoto() {
  studioBgImage = null;
  const dropText = document.getElementById('photoDropText');
  const dropZone = document.getElementById('photoUploadZone');
  const controls = document.getElementById('photoControls');
  if (dropText) dropText.textContent = 'Tap to add a photo';
  if (dropZone) dropZone.classList.remove('has-photo');
  if (controls) controls.classList.add('hidden');
  if (studioPhotoInput) studioPhotoInput.value = '';
  const ytOpt = document.getElementById('ytBgOption');
  if (ytOpt) { ytOpt.style.background = ''; ytOpt.style.borderColor = ''; }
  refreshStageCanvas();
}

/* ══════════════════════════════════════════════════════════
   YOUTUBE THUMBNAIL AS BACKGROUND
══════════════════════════════════════════════════════════ */
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
    </div>`;

  opt.onclick = () => {
    const tryLoad = src => new Promise((res, rej) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => res(img); img.onerror = () => rej(); img.src = src;
    });
    const apply = img => {
      studioBgImage = img;
      const dt = document.getElementById('photoDropText');
      const dz = document.getElementById('photoUploadZone');
      const pc = document.getElementById('photoControls');
      if (dt) dt.textContent = 'YouTube thumbnail';
      if (dz) dz.classList.add('has-photo');
      if (pc) pc.classList.remove('hidden');
      opt.style.background  = 'rgba(255,0,0,0.18)';
      opt.style.borderColor = 'rgba(255,0,0,0.55)';
      showToast('Thumbnail set as background ✓');
      refreshStageCanvas();
    };
    tryLoad(meta.thumbnail)
      .then(apply)
      .catch(() =>
        fetch(meta.thumbnail)
          .then(r => r.blob())
          .then(blob => tryLoad(URL.createObjectURL(blob)))
          .then(apply)
          .catch(() => showToast('Could not load thumbnail — upload a photo manually'))
      );
  };
  panel.insertBefore(opt, panel.firstChild);
}

/* ══════════════════════════════════════════════════════════
   PHOTO HANDLER
══════════════════════════════════════════════════════════ */
function handleStudioPhoto(file) {
  if (!file.type.startsWith('image/')) { showToast('Please upload an image file'); return; }
  if (file.size > 15 * 1024 * 1024)   { showToast('File too large — max 15 MB');  return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const img  = new Image();
    img.onload = () => {
      studioBgImage = img;
      const dt = document.getElementById('photoDropText');
      const dz = document.getElementById('photoUploadZone');
      const pc = document.getElementById('photoControls');
      if (dt) dt.textContent = file.name.length > 22 ? file.name.substring(0,22)+'…' : file.name;
      if (dz) dz.classList.add('has-photo');
      if (pc) pc.classList.remove('hidden');
      const ytOpt = document.getElementById('ytBgOption');
      if (ytOpt) { ytOpt.style.background = ''; ytOpt.style.borderColor = ''; }
      showToast('Photo added');
      refreshStageCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/* ══════════════════════════════════════════════════════════
   CANVAS HELPERS
══════════════════════════════════════════════════════════ */
function wrapLines(ctx, text, maxW) {
  const words = (text || '').split(' ');
  let line = '', lines = [];
  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = word;
    } else { line = test; }
  });
  if (line) lines.push(line);
  return lines;
}

/* ══════════════════════════════════════════════════════════
   DRAW FRAME
══════════════════════════════════════════════════════════ */
function drawFrame(ctx, W, H, t, ms) {
  const sc    = W / 1080;
  const d     = STUDIO_DESIGNS[studioDesign] || STUDIO_DESIGNS['midnight-gold'];
  const fd    = STUDIO_FONT_MAP[studioFont]  || STUDIO_FONT_MAP['playfair'];
  const spd   = studioSpeed;
  const isDark = !d.light;
  const GOLD   = '#E8C547';
  const BLACK  = '#0B0B0D';

  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter       = 'none';
  ctx.shadowBlur   = 0;
  ctx.shadowColor  = 'transparent';
  ctx.globalAlpha  = 1;
  ctx.clearRect(0, 0, W, H);

  /* ── 1. BACKGROUND ── */
  if (studioBgImage) {
    _drawPhotoBg(ctx, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,   d.bg[0]);
    g.addColorStop(0.5, d.bg[1]);
    g.addColorStop(1,   d.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (studioBrightness !== 100) {
      const delta = (studioBrightness - 100) / 100;
      ctx.fillStyle = delta < 0
        ? `rgba(0,0,0,${Math.abs(delta) * 0.9})`
        : `rgba(255,255,255,${delta * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.filter = 'none';

  const ag = ctx.createRadialGradient(W/2, H, 0, W/2, H, W*0.72);
  ag.addColorStop(0, isDark ? 'rgba(232,197,71,0.07)' : 'rgba(184,144,26,0.04)');
  ag.addColorStop(1, 'transparent');
  ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);

  if (isDark) {
    const sg = ctx.createLinearGradient(0, 0, W, 0);
    sg.addColorStop(0,   'transparent');
    sg.addColorStop(0.5, 'rgba(232,197,71,0.5)');
    sg.addColorStop(1,   'transparent');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, 1);
  }

  /* ── 2. LOGO + RIPPLE RINGS ── */
  const cx      = W / 2;
  const ls      = W * 0.12;
  const logoY   = H * 0.27;
  const logoDly = 0.10 * spd;
  const logoT   = ease(t, logoDly, 0.60 * spd);

  if (logoT > 0) {
    ctx.save();
    ctx.globalAlpha = logoT;
    const logoSc = 0.70 + logoT * 0.30;
    ctx.translate(cx, logoY);
    ctx.scale(logoSc, logoSc);
    ctx.translate(-cx, -logoY);

    const ringColor = isDark ? 'rgba(232,197,71,' : 'rgba(26,26,32,';
    for (let i = 0; i < 3; i++) {
      const pDur  = 3.4;
      const delay = i * (pDur / 3);
      const rt    = ((ms / 1000 - delay) % pDur) / pDur;
      if (rt > 0 && rt < 1) {
        const rSc = 0.5 + rt * 3.5;
        const op  = Math.max(0, (1 - rt)) * 0.7 * logoT;
        ctx.beginPath();
        ctx.arc(cx, logoY, ls / 2 * rSc, 0, Math.PI * 2);
        ctx.strokeStyle = `${ringColor}${op.toFixed(3)})`;
        ctx.lineWidth   = Math.max(W * 0.002, 1.2);
        ctx.stroke();
      }
    }

    const gp = 0.5 + Math.sin(ms / 1700) * 0.5;
    ctx.shadowColor = isDark ? GOLD : '#B8901A';
    ctx.shadowBlur  = (12 + gp * 16) * sc;
    ctx.beginPath();
    ctx.arc(cx, logoY, ls / 2, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? GOLD : '#1a1a20';
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    const lx = cx - ls*0.3, ly = logoY - ls*0.34, lw = ls*0.6, lh = ls*0.65;
    ctx.strokeStyle   = isDark ? BLACK : GOLD;
    ctx.lineWidth     = Math.max(ls * 0.09, 2);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx,          ly + lh);
    ctx.lineTo(lx,          ly);
    ctx.lineTo(lx+lw*0.28,  ly + lh*0.42);
    ctx.lineTo(cx,          ly + lh*0.02);
    ctx.lineTo(lx+lw*0.72,  ly + lh*0.42);
    ctx.lineTo(lx+lw,       ly);
    ctx.lineTo(lx+lw,       ly + lh);
    ctx.stroke();
    ctx.restore();
  }

  /* ── 3. WAVEFORM ── */
  const waveDly = 0.90 * spd;
  const waveT   = ease(t, waveDly, 0.50 * spd);
  if (waveT > 0) {
    const bars  = [0.33, 0.58, 0.83, 0.67, 1.00, 0.67, 0.83];
    const bw    = Math.max(W * 0.005, 2), bg2 = Math.max(W * 0.007, 2.5);
    const maxH  = H * 0.04;
    const wy    = logoY + ls * 0.82;
    let   bx    = cx - (bars.length * (bw + bg2)) / 2;
    ctx.save(); ctx.globalAlpha = waveT * 0.6;
    ctx.fillStyle = d.accent;
    bars.forEach((hf, i) => {
      const pulse = Math.sin(ms / 400 + i * 0.7) * 0.3 + 0.7;
      const bh    = maxH * hf * pulse;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, wy - bh/2, bw, bh, bw/2);
      else ctx.rect(bx, wy - bh/2, bw, bh);
      ctx.fill();
      bx += bw + bg2;
    });
    ctx.restore();
  }

  /* ── 4. LYRIC TEXT ── */
  const lyricRaw  = (currentPost?.text || '').substring(0, 120);
  const len       = lyricRaw.length;
  const baseFS    = W * 0.053;
  const lyricSize = len < 40 ? baseFS * 1.55
                  : len < 65 ? baseFS * 1.20
                  : len < 90 ? baseFS * 0.97
                  :             baseFS * 0.79;
  const maxW      = W * 0.78;
  const lyricY    = H * 0.54;
  const lineH     = lyricSize * 1.18;

  const fontStr = `${fd.style === 'italic' ? 'italic ' : ''}${fd.weight} ${lyricSize}px ${fd.family.replace(/'/g,'"')}`;
  ctx.font         = fontStr;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const lines    = wrapLines(ctx, lyricRaw, maxW);
  const totalLH  = (lines.length - 1) * lineH;
  const startY   = lyricY - totalLH / 2;
  const textCol  = studioBgImage ? '#ffffff' : d.text;
  const lyricDly = 0.30 * spd;

  _drawLyric(ctx, lines, startY, lineH, lyricSize, t, ms, textCol, cx, W, H, sc, spd, lyricDly, fontStr);

  /* ── 5. DIVIDER + SONG + ARTIST ── */
  const k       = currentPost?.knowledge || {};
  const divY    = lyricY + totalLH/2 + lyricSize * 0.55;
  const songY   = divY   + lyricSize * 0.6;
  const artistY = songY  + lyricSize * 0.56;

  const divT = ease(t, 1.30 * spd, 0.50 * spd);
  if (divT > 0) {
    ctx.save(); ctx.globalAlpha = divT * 0.42;
    ctx.strokeStyle = isDark ? GOLD : 'rgba(184,144,26,0.5)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx - W*0.022, divY); ctx.lineTo(cx + W*0.022, divY);
    ctx.stroke(); ctx.restore();
  }

  if (k.song && k.song !== 'Unknown Song') {
    const sT = ease(t, 1.50 * spd, 0.50 * spd);
    if (sT > 0) {
      ctx.save();
      if (studioBgImage) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14 * sc; }
      ctx.globalAlpha  = sT * 0.88;
      ctx.font         = `600 ${lyricSize * 0.42}px ${fd.family.replace(/'/g,'"')}`;
      ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle    = studioBgImage ? '#ffffff' : d.accent;
      ctx.fillText(k.song.length > 34 ? k.song.substring(0,34)+'…' : k.song, cx, songY);
      ctx.restore();
    }
  }

  if (k.artist && k.artist !== 'Unknown Artist') {
    const aT = ease(t, 1.70 * spd, 0.50 * spd);
    if (aT > 0) {
      ctx.save(); ctx.globalAlpha = aT * 0.48;
      ctx.font         = `700 ${lyricSize * 0.30}px 'Space Mono', monospace`;
      ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle    = studioBgImage ? 'rgba(255,255,255,0.85)' : d.text;
      ctx.fillText(k.artist.length > 42 ? k.artist.substring(0,42)+'…' : k.artist.toUpperCase(), cx, artistY);
      ctx.restore();
    }
  }

  /* ── 6. BRAND FOOTER ── */
  const brandT = ease(t, 2.00 * spd, 0.50 * spd);
  if (brandT > 0) {
    const fy   = H * 0.90;
    const bls  = W * 0.038;
    const bCol = isDark ? GOLD : '#B8901A';
    ctx.save(); ctx.globalAlpha = brandT;

    ctx.beginPath(); ctx.arc(W*0.09, fy, bls/2, 0, Math.PI*2);
    ctx.fillStyle = bCol; ctx.fill();

    const fx = W*0.09, mlx = fx - bls*0.3, mly = fy - bls*0.34, mlw = bls*0.6, mlh = bls*0.65;
    ctx.strokeStyle = isDark ? BLACK : GOLD;
    ctx.lineWidth   = Math.max(bls * 0.09, 1);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(mlx,          mly + mlh);
    ctx.lineTo(mlx,          mly);
    ctx.lineTo(mlx+mlw*0.28, mly+mlh*0.42);
    ctx.lineTo(fx,            mly+mlh*0.02);
    ctx.lineTo(mlx+mlw*0.72, mly+mlh*0.42);
    ctx.lineTo(mlx+mlw,      mly);
    ctx.lineTo(mlx+mlw,      mly + mlh);
    ctx.stroke();

    ctx.font      = `800 ${W*0.017}px 'Syne', sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = bCol;
    ctx.fillText('MARGO', W*0.115, fy);

    const emo = currentPost?.emotion || '';
    if (emo) {
      ctx.font      = `700 ${W*0.015}px 'Space Mono', monospace`;
      ctx.textAlign = 'right';
      ctx.fillText('✦ ' + emo.toUpperCase(), W*0.91, fy);
    }

    ctx.globalAlpha  = brandT * 0.5;
    ctx.font         = `700 ${Math.max(14, Math.round(16*sc))}px 'Space Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.fillText('trymargo.com', W/2, H*0.945);

    ctx.restore();
  }
}

/* ── Lyric drawing per motion style ── */
function _drawLyric(ctx, lines, startY, lineH, lyricSize, t, ms, textCol, cx, W, H, sc, spd, lyricDly, fontStr) {
  const mo = studioMotion;

  if (mo === 'cinema') {
    const lt   = ease(t, lyricDly, 1.20 * spd);
    if (lt <= 0) return;
    const blur = (1 - lt) * 8 * sc;
    if (blur > 0.2) ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = lt;
    const s2 = 0.96 + lt * 0.04;
    lines.forEach((line, i) => {
      ctx.save(); ctx.translate(cx, startY + i*lineH); ctx.scale(s2,s2);
      ctx.fillStyle = textCol; ctx.fillText(line, 0, 0); ctx.restore();
    });
    ctx.filter = 'none';

  } else if (mo === 'fade') {
    const lt = ease(t, lyricDly, 0.80 * spd);
    if (lt <= 0) return;
    ctx.globalAlpha = lt;
    lines.forEach((line, i) => {
      const y = startY + i*lineH + (1-lt) * 18 * sc;
      ctx.fillStyle = textCol; ctx.fillText(line, cx, y);
    });

  } else if (mo === 'blur') {
    const lt   = ease(t, lyricDly, 1.00 * spd);
    if (lt <= 0) return;
    const blur = (1 - lt) * 22 * sc;
    if (blur > 0.2) ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = lt;
    lines.forEach((line, i) => { ctx.fillStyle = textCol; ctx.fillText(line, cx, startY+i*lineH); });
    ctx.filter = 'none';

  } else if (mo === 'glitch') {
    const lt = ease(t, lyricDly, 0.50 * spd);
    if (lt <= 0) return;
    ctx.globalAlpha = lt;
    const gp    = Math.max(0, Math.min((t - lyricDly - 0.80*spd) / (0.15*spd), 1));
    const cols  = ['#0ff','#f0f','#ff0', textCol];
    const col   = gp < 1 ? cols[Math.min(Math.floor(gp * 3), 3)] : textCol;
    const shift = gp < 1 ? (1-gp) * 3 * sc : 0;
    ctx.save(); ctx.translate(shift, 0);
    lines.forEach((line, i) => { ctx.fillStyle = col; ctx.fillText(line, cx, startY+i*lineH); });
    ctx.restore();

  } else if (mo === 'type') {
    const lt    = ease(t, lyricDly, 2.60 * spd);
    const full  = lines.join(' ');
    const chars = Math.floor(lt * full.length);
    const part  = full.substring(0, chars) || ' ';
    ctx.globalAlpha = 1;
    ctx.font = fontStr;
    const tLines  = wrapLines(ctx, part, W * 0.78);
    const tTotalH = (tLines.length - 1) * lineH;
    const tStartY = (startY + (lines.length-1)*lineH/2) - tTotalH/2;
    tLines.forEach((line, i) => { ctx.fillStyle = textCol; ctx.fillText(line, cx, tStartY+i*lineH); });
    if (lt < 1) {
      const on = Math.floor(ms / 530) % 2 === 0;
      if (on) {
        const last  = tLines[tLines.length-1] || '';
        const lw    = ctx.measureText(last).width;
        const curX  = cx + lw/2 + 3*sc;
        const curY  = tStartY + (tLines.length-1)*lineH;
        ctx.fillStyle = STUDIO_DESIGNS[studioDesign]?.accent || '#E8C547';
        ctx.fillRect(curX, curY - lyricSize*0.4, Math.max(2, 2.5*sc), lyricSize*0.82);
      }
    }

  } else if (mo === 'rise') {
    let charIdx = 0;
    lines.forEach((line, li) => {
      const lw  = ctx.measureText(line).width;
      let   lcx = cx - lw/2;
      line.split('').forEach(ch => {
        const delay = (lyricDly + charIdx * 0.05) * spd;
        const ct    = ease(t, delay, 0.45 * spd);
        if (ct > 0) {
          const cy2 = startY + li*lineH + (1-ct) * 28 * sc;
          ctx.save(); ctx.globalAlpha = ct; ctx.fillStyle = textCol;
          ctx.fillText(ch, lcx + ctx.measureText(ch).width/2, cy2);
          ctx.restore();
        }
        lcx += ctx.measureText(ch).width;
        charIdx++;
      });
      charIdx++;
    });

  } else {
    /* word — default */
    let wordIdx = 0;
    ctx.font = fontStr;
    lines.forEach((line, li) => {
      const lw  = ctx.measureText(line).width;
      let   lcx = cx - lw/2;
      line.split(' ').forEach(word => {
        const delay = (lyricDly + (0.28 + wordIdx * 0.13)) * spd;
        const wt    = ease(t, delay, 0.45 * spd);
        if (wt > 0) {
          const wy2 = startY + li*lineH + (1-wt)*13*sc;
          ctx.save(); ctx.globalAlpha = wt; ctx.fillStyle = textCol;
          const ww  = ctx.measureText(word).width;
          ctx.fillText(word, lcx + ww/2, wy2);
          ctx.restore();
        }
        lcx += ctx.measureText(word + ' ').width;
        wordIdx++;
      });
    });
  }
}

/* Draw photo background with filters */
function _drawPhotoBg(ctx, W, H) {
  const img = studioBgImage;
  const iw  = img.naturalWidth  || img.width;
  const ih  = img.naturalHeight || img.height;
  const sc  = Math.max(W/iw, H/ih);

  const tmp    = document.createElement('canvas');
  tmp.width    = W; tmp.height = H;
  const tc     = tmp.getContext('2d');

  const filters = {
    warm:     'sepia(0.3) saturate(1.3) hue-rotate(-10deg)',
    cool:     'saturate(0.85) hue-rotate(15deg)',
    dramatic: 'contrast(1.5) saturate(1.2) brightness(0.9)',
    vintage:  'sepia(0.5) contrast(1.2)',
  };
  tc.filter = `brightness(${studioBrightness}%)${filters[studioFilter] ? ' ' + filters[studioFilter] : ''}`;
  tc.drawImage(img, (W - iw*sc)/2, (H - ih*sc)/2, iw*sc, ih*sc);
  tc.filter = 'none';

  if (studioBlur > 0) {
    const tmp2 = document.createElement('canvas');
    tmp2.width = W; tmp2.height = H;
    const tc2  = tmp2.getContext('2d');
    tc2.filter = `blur(${studioBlur * 2}px)`;
    tc2.drawImage(tmp, 0, 0); tc2.filter = 'none';
    ctx.drawImage(tmp2, 0, 0);
  } else {
    ctx.drawImage(tmp, 0, 0);
  }

  if (studioDim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${studioDim/100})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function ease(t, delay, duration) {
  if (duration <= 0) return 1;
  const p = Math.max(0, Math.min((t - delay) / duration, 1));
  return 1 - Math.pow(1 - p, 3);
}

/* ══════════════════════════════════════════════════════════
   STAGE CANVAS
══════════════════════════════════════════════════════════ */
function refreshStageCanvas() {
  if (!currentPost || !studioCanvas) return;
  const stage  = studioCanvas.parentElement;
  const dpr    = Math.min(window.devicePixelRatio || 1, 2);
  const avail  = Math.min(stage.clientWidth - 40, stage.clientHeight - 40, 660);
  const size   = Math.max(80, avail);

  studioCanvas.style.width  = size + 'px';
  studioCanvas.style.height = size + 'px';
  studioCanvas.width        = Math.round(size * dpr);
  studioCanvas.height       = Math.round(size * dpr);

  const ctx = studioCanvas.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawFrame(ctx, size, size, 1, 2400));
}

/* ══════════════════════════════════════════════════════════
   ANIMATED MP4 EXPORT
══════════════════════════════════════════════════════════ */
async function exportAnimatedMP4(sizeKey, onProgress) {
  const dim = STUDIO_SIZES[sizeKey];
  if (!dim)         throw new Error('Unknown size: ' + sizeKey);
  if (!currentPost) throw new Error('No active post');

  const words      = (currentPost?.text || '').split(' ').length;
  const durSecs    = Math.max(4, Math.min(14, 3 + words * 0.22 + 2.0 * studioSpeed));
  const W = dim.w, H = dim.h;
  const FPS        = 30;
  const totalFrames = Math.round(durSecs * FPS);

  await document.fonts.ready;

  if (typeof VideoEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined') {
    return new Promise((resolve, reject) => {
      let muxer, encoder;
      try {
        muxer = new Mp4Muxer.Muxer({
          target:    new Mp4Muxer.ArrayBufferTarget(),
          video:     { codec: 'avc', width: W, height: H },
          fastStart: 'in-memory',
        });
        encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error:  err => reject(err),
        });
        encoder.configure({
          codec:    'avc1.42001f',
          width:     W,
          height:    H,
          bitrate:   Math.min(5_000_000, W * H * 2),
          framerate: FPS,
        });
      } catch (e) {
        console.warn('[Studio] VideoEncoder setup failed, falling back to WebM:', e);
        exportAnimatedWebM(sizeKey, onProgress).then(resolve).catch(reject);
        return;
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = W; offscreen.height = H;
      const offCtx    = offscreen.getContext('2d', { willReadFrequently: true });

      let frameIdx = 0;
      const next = () => {
        if (frameIdx >= totalFrames) {
          encoder.flush().then(() => {
            muxer.finalize();
            const buf = muxer.target.buffer;
            resolve(new Blob([buf], { type: 'video/mp4' }));
          }).catch(reject);
          return;
        }

        const t   = frameIdx / totalFrames;
        const ms  = (frameIdx / FPS) * 1000;
        const pts = Math.round((frameIdx * 1_000_000) / FPS);

        drawFrame(offCtx, W, H, t, ms);

        const frame = new VideoFrame(offscreen, {
          timestamp: pts,
          duration:  Math.round(1_000_000 / FPS),
        });
        encoder.encode(frame, { keyFrame: frameIdx % 30 === 0 });
        frame.close();
        frameIdx++;
        if (onProgress) onProgress(frameIdx / totalFrames);

        if (frameIdx % 10 === 0) setTimeout(next, 0);
        else next();
      };
      next();
    });
  }

  return exportAnimatedWebM(sizeKey, onProgress);
}

function exportAnimatedWebM(sizeKey, onProgress) {
  return new Promise((resolve, reject) => {
    const dim = STUDIO_SIZES[sizeKey];
    if (!dim) { reject(new Error('Unknown size')); return; }

    const words   = (currentPost?.text || '').split(' ').length;
    const durSecs = Math.max(4, Math.min(14, 3 + words * 0.22 + 2.0 * studioSpeed));
    const W = dim.w, H = dim.h;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx    = canvas.getContext('2d');

    let stream, recorder;
    try {
      stream   = canvas.captureStream(30);
      const mt = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';
      recorder = new MediaRecorder(stream, { mimeType: mt, videoBitsPerSecond: 4_500_000 });
    } catch (e) {
      reject(new Error('Video recording not supported in this browser.'));
      return;
    }

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop          = () => resolve(new Blob(chunks, { type: 'video/webm' }));

    const durMs = durSecs * 1000;
    const start = performance.now();
    recorder.start();

    const frame = now => {
      const t  = Math.min((now - start) / durMs, 1);
      drawFrame(ctx, W, H, t, now - start);
      if (onProgress) onProgress(t);
      if (t < 1) requestAnimationFrame(frame);
      else recorder.stop();
    };
    requestAnimationFrame(frame);
  });
}

/* ══════════════════════════════════════════════════════════
   STATIC PNG EXPORT
══════════════════════════════════════════════════════════ */
async function generateStaticPNG(sizeKey) {
  const dim = STUDIO_SIZES[sizeKey];
  if (!dim || !currentPost) throw new Error('Invalid size or no post');

  const offscreen = document.createElement('canvas');
  offscreen.width  = dim.w;
  offscreen.height = dim.h;
  const ctx        = offscreen.getContext('2d');
  await document.fonts.ready;
  drawFrame(ctx, dim.w, dim.h, 1, 2500);

  return new Promise((resolve, reject) => {
    offscreen.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')),
      'image/png'
    );
  });
}

const generateFinalPoster = generateStaticPNG;

/* ══════════════════════════════════════════════════════════
   CEREMONY THUMBNAIL
══════════════════════════════════════════════════════════ */
function drawCeremonyThumb() {
  if (!ceremonyThumb) return;
  const dpr  = Math.min(window.devicePixelRatio || 1, 2);
  const size = 600;
  ceremonyThumb.width        = Math.round(size * dpr);
  ceremonyThumb.height       = Math.round(size * dpr);
  ceremonyThumb.style.width  = '';
  ceremonyThumb.style.height = '';
  const ctx = ceremonyThumb.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawFrame(ctx, size, size, 1, 2500));
}

/* ══════════════════════════════════════════════════════════
   DOWNLOAD + SHARE
══════════════════════════════════════════════════════════ */
async function shareOrDownload() {
  if (!generatedBlob) { showToast('Not ready yet'); return; }

  const isWebM   = generatedBlob.type.includes('webm');
  const ext      = _exportType === 'mp4' ? (isWebM ? 'webm' : 'mp4') : 'png';
  const fileName = `margo-${selectedSize || 'poster'}-${Date.now()}.${ext}`;
  const file     = new File([generatedBlob], fileName, { type: generatedBlob.type });

  const shareData = {
    title: 'MARGO — ' + (currentPost?.text || '').substring(0, 50),
    text:  `"${currentPost?.text || ''}" — share at trymargo.com`,
    files: [file],
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      showToast('Shared!');
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }

  downloadBlob();
  showToast('Saved to device!');
}

function downloadBlob() {
  if (!generatedBlob) { showToast('Not ready'); return; }
  const isWebM = generatedBlob.type.includes('webm');
  const ext    = _exportType === 'mp4' ? (isWebM ? 'webm' : 'mp4') : 'png';
  try {
    const url = URL.createObjectURL(generatedBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `margo-${selectedSize || 'poster'}-${Date.now()}.${ext}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1200);
  } catch (err) {
    console.error('[Studio] download error:', err);
    showToast('Download failed — please try again');
  }
}
