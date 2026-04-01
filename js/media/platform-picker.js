/* ============================================================
   MARGO — js/media/platform-picker.js  v2.2
   CHANGES v2.2:
   • z-index raised to 1100 — always appears above share-sheet,
     duet-sheet, and all other modals (was 800, got buried)
   • Warning/confirmation step removed — export fires immediately
     on platform select + button click
   • Export button shows live progress bar while encoding
   • All v2.1 fixes preserved (no shape boxes, white labels,
     all platforms visible for GIF)
   ============================================================ */

(function () {
'use strict';

const PLATFORMS = [
  /* ── SQUARE ── */
  { id:'ig-post',   label:'Instagram',   group:'square',  w:1080, h:1080, layout:'square', gifOk:true  },
  { id:'whatsapp',  label:'WhatsApp',    group:'square',  w:1080, h:1080, layout:'square', gifOk:true  },
  { id:'discord',   label:'Discord',     group:'square',  w:1080, h:1080, layout:'square', gifOk:true  },
  { id:'reddit',    label:'Reddit',      group:'square',  w:1200, h:1200, layout:'square', gifOk:true  },

  /* ── STORY / VERTICAL ── */
  { id:'ig-story',  label:'IG Story',    group:'story',   w:1080, h:1920, layout:'story',  gifOk:true  },
  { id:'tiktok',    label:'TikTok',      group:'story',   w:1080, h:1920, layout:'story',  gifOk:true  },
  { id:'reels',     label:'Reels',       group:'story',   w:1080, h:1920, layout:'story',  gifOk:true  },
  { id:'wa-status', label:'WA Status',   group:'story',   w:1080, h:1920, layout:'story',  gifOk:true  },

  /* ── WIDE ── */
  { id:'twitter',   label:'X / Twitter', group:'wide',    w:1600, h:900,  layout:'wide',   gifOk:true  },
  { id:'linkedin',  label:'LinkedIn',    group:'wide',    w:1200, h:627,  layout:'wide',   gifOk:true  },
  { id:'facebook',  label:'Facebook',    group:'wide',    w:1200, h:630,  layout:'wide',   gifOk:true  },
];

const GROUPS = [
  { id:'square', label:'Posts & Chats',    sub:'1:1 Square'    },
  { id:'story',  label:'Stories & Reels',  sub:'9:16 Vertical' },
  { id:'wide',   label:'Feed & Timeline',  sub:'16:9 Wide'     },
];

const PP = {
  mounted:  false,
  pending:  null,
  selected: null,
};

function _injectStyles() {
  if (document.getElementById('_ppCSS')) return;
  const s = document.createElement('style');
  s.id = '_ppCSS';
  s.textContent = `
    #_ppBd {
      position:fixed;inset:0;z-index:1300;
      background:rgba(0,0,0,0.72);
      backdrop-filter:blur(12px) saturate(0.6);
      -webkit-backdrop-filter:blur(12px) saturate(0.6);
      display:flex;align-items:flex-end;justify-content:center;
      animation:_ppBdIn 0.22s ease;
    }
    #_ppBd.hide { display:none !important }
    @keyframes _ppBdIn { from{opacity:0} to{opacity:1} }

    #_ppSheet {
      width:100%;max-width:560px;
      background:#0d0c12;
      border:1px solid rgba(255,255,255,0.07);
      border-bottom:none;
      border-radius:26px 26px 0 0;
      display:flex;flex-direction:column;
      max-height:88dvh;overflow:hidden;
      box-shadow:0 -12px 60px rgba(0,0,0,0.9),
                 0 0 0 1px rgba(232,197,71,0.04) inset;
      animation:_ppUp 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    @media(min-width:560px){
      #_ppSheet{border-radius:22px;border-bottom:1px solid rgba(255,255,255,0.07);margin:20px;animation:_ppFd 0.3s cubic-bezier(0.16,1,0.3,1)}
    }
    @keyframes _ppUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes _ppFd { from{transform:translateY(20px) scale(0.97);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
    #_ppSheet.pp-exit { animation:_ppDn 0.26s cubic-bezier(0.4,0,1,1) forwards }
    @keyframes _ppDn { to{transform:translateY(80px);opacity:0} }

    ._ppHandle {
      width:34px;height:4px;border-radius:2px;
      background:rgba(255,255,255,0.10);
      margin:11px auto 0;flex-shrink:0;
    }

    ._ppHdr {
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 18px 0;flex-shrink:0;
    }
    ._ppHdrLeft { display:flex;flex-direction:column;gap:3px }
    ._ppTitle {
      font-family:'Syne',sans-serif;font-weight:800;font-size:0.85rem;
      letter-spacing:2.5px;text-transform:uppercase;
      background:linear-gradient(90deg,#fff 20%,#E8C547 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
    }
    ._ppSub {
      font-family:'Space Mono',monospace;font-size:0.50rem;
      color:rgba(255,255,255,0.28);letter-spacing:0.5px;
    }
    ._ppX {
      width:28px;height:28px;border-radius:50%;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.10);
      color:rgba(255,255,255,0.38);font-size:1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.16s;flex-shrink:0;
    }
    ._ppX:hover { background:rgba(255,255,255,0.12);color:#fff }

    ._ppBody {
      flex:1;overflow-y:auto;overflow-x:hidden;
      -webkit-overflow-scrolling:touch;
      padding:14px 18px 6px;
      display:flex;flex-direction:column;gap:16px;
    }
    ._ppBody::-webkit-scrollbar{width:3px}
    ._ppBody::-webkit-scrollbar-track{background:transparent}
    ._ppBody::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.10);border-radius:2px}

    ._ppGroup { display:flex;flex-direction:column;gap:8px }
    ._ppGroupHdr {
      display:flex;align-items:baseline;gap:8px;
      padding:0 2px;
    }
    ._ppGroupName {
      font-family:'Syne',sans-serif;font-weight:800;font-size:0.62rem;
      letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,0.55);
    }
    ._ppGroupSub {
      font-family:'Space Mono',monospace;font-size:0.44rem;
      color:rgba(255,255,255,0.22);letter-spacing:0.3px;
    }
    ._ppGroupDivider {
      flex:1;height:1px;
      background:linear-gradient(90deg,rgba(255,255,255,0.07),transparent);
      margin-left:6px;align-self:center;
    }

    ._ppGrid {
      display:grid;grid-template-columns:repeat(4,1fr);gap:7px;
    }

    ._ppTile {
      display:flex;flex-direction:column;align-items:center;gap:6px;
      padding:12px 6px 10px;border-radius:14px;
      background:rgba(255,255,255,0.03);
      border:1.5px solid rgba(255,255,255,0.07);
      cursor:pointer;
      transition:all 0.18s cubic-bezier(0.16,1,0.3,1);
      position:relative;
    }
    ._ppTile:hover {
      background:rgba(255,255,255,0.07);
      border-color:rgba(255,255,255,0.18);
      transform:translateY(-2px);
    }
    ._ppTile.selected {
      background:rgba(232,197,71,0.10);
      border-color:rgba(232,197,71,0.55);
      box-shadow:0 0 16px rgba(232,197,71,0.10);
      transform:translateY(-2px);
    }

    ._ppTileLabel {
      font-family:'Space Mono',monospace;font-size:0.44rem;
      font-weight:700;letter-spacing:0.4px;
      text-transform:uppercase;color:rgba(255,255,255,0.85);
      text-align:center;line-height:1.3;
      transition:color 0.16s;
    }
    ._ppTile.selected ._ppTileLabel { color:#E8C547 }
    ._ppTileSize {
      font-family:'Space Mono',monospace;font-size:0.36rem;
      color:rgba(255,255,255,0.28);letter-spacing:0.3px;
      text-align:center;
    }
    ._ppTile.selected ._ppTileSize { color:rgba(232,197,71,0.55) }

    ._ppSelBadge {
      margin:0 18px;padding:10px 14px;
      background:rgba(232,197,71,0.06);
      border:1px solid rgba(232,197,71,0.18);
      border-radius:12px;flex-shrink:0;
      display:flex;align-items:center;justify-content:space-between;
      transition:opacity 0.2s;
    }
    ._ppSelBadge.hide { opacity:0;pointer-events:none }
    ._ppSelBadgeLeft { display:flex;flex-direction:column;gap:2px }
    ._ppSelBadgeName {
      font-family:'Syne',sans-serif;font-weight:800;font-size:0.65rem;
      letter-spacing:1.5px;text-transform:uppercase;color:#E8C547;
    }
    ._ppSelBadgeSize {
      font-family:'Space Mono',monospace;font-size:0.48rem;
      color:rgba(255,255,255,0.38);letter-spacing:0.5px;
    }
    ._ppSelBadgeHint {
      font-family:'Space Mono',monospace;font-size:0.44rem;
      color:rgba(255,255,255,0.25);text-align:right;max-width:140px;
      line-height:1.5;
    }

    ._ppActions {
      display:flex;gap:8px;padding:10px 18px 20px;flex-shrink:0;
    }
    ._ppBtnExport {
      flex:1;padding:14px 10px;border-radius:14px;
      background:rgba(232,197,71,0.12);
      border:1.5px solid rgba(232,197,71,0.40);
      color:#E8C547;cursor:pointer;
      font-family:'Space Mono',monospace;font-size:0.56rem;
      font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
      display:flex;align-items:center;justify-content:center;gap:8px;
      transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    ._ppBtnExport:hover {
      background:rgba(232,197,71,0.20);
      border-color:rgba(232,197,71,0.65);color:#fff;
      transform:translateY(-2px);
      box-shadow:0 8px 24px rgba(232,197,71,0.15);
    }
    ._ppBtnExport:active { transform:scale(0.97) }
    ._ppBtnExport:disabled { opacity:0.55;cursor:not-allowed;transform:none;pointer-events:none }
    ._ppBtnCancel {
      padding:14px 16px;border-radius:14px;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.09);
      color:rgba(255,255,255,0.35);cursor:pointer;
      font-family:'Space Mono',monospace;font-size:0.52rem;
      font-weight:700;letter-spacing:1px;text-transform:uppercase;
      transition:all 0.18s;
    }
    ._ppBtnCancel:hover { background:rgba(255,255,255,0.08);color:#fff }

    /* Progress bar — shown during encoding */
    ._ppProgress {
      margin:0 18px 14px;
      display:none;flex-direction:column;gap:8px;
    }
    ._ppProgress.show { display:flex }
    ._ppProgressLabel {
      font-family:'Space Mono',monospace;font-size:0.50rem;
      font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
      color:rgba(255,255,255,0.45);text-align:center;
    }
    ._ppProgressTrack {
      width:100%;height:3px;border-radius:2px;
      background:rgba(255,255,255,0.08);overflow:hidden;
    }
    ._ppProgressBar {
      height:100%;border-radius:2px;width:0%;
      background:linear-gradient(90deg,#E8C547,#ffd980);
      transition:width 0.12s ease;
      box-shadow:0 0 8px rgba(232,197,71,0.5);
    }
  `;
  document.head.appendChild(s);
}

function _mount() {
  if (document.getElementById('_ppBd')) return;
  _injectStyles();

  const bd = document.createElement('div');
  bd.id = '_ppBd';
  bd.className = 'hide';

  bd.innerHTML = `
    <div id="_ppSheet">
      <div class="_ppHandle"></div>
      <div class="_ppHdr">
        <div class="_ppHdrLeft">
          <span class="_ppTitle">Where are you sharing?</span>
          <span class="_ppSub">Pick a platform — we'll size it perfectly</span>
        </div>
        <button class="_ppX" id="_ppX" aria-label="Close">×</button>
      </div>
      <div class="_ppBody" id="_ppBody">
        ${GROUPS.map(g => _renderGroup(g)).join('')}
      </div>
      <div class="_ppSelBadge hide" id="_ppSelBadge">
        <div class="_ppSelBadgeLeft">
          <span class="_ppSelBadgeName" id="_ppSelBadgeName">—</span>
          <span class="_ppSelBadgeSize" id="_ppSelBadgeSize">—</span>
        </div>
        <span class="_ppSelBadgeHint" id="_ppSelBadgeHint"></span>
      </div>
      <div class="_ppProgress" id="_ppProgress">
        <div class="_ppProgressLabel" id="_ppProgressLabel">Preparing…</div>
        <div class="_ppProgressTrack"><div class="_ppProgressBar" id="_ppProgressBar"></div></div>
      </div>
      <div class="_ppActions">
        <button class="_ppBtnExport" id="_ppBtnExport" disabled>
          <span id="_ppBtnExportIcon">↓</span>
          <span id="_ppBtnExportLabel">Select a platform first</span>
        </button>
        <button class="_ppBtnCancel" id="_ppBtnCancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(bd);
  PP.mounted = true;
  _wireEvents();
}

function _renderGroup(g) {
  const tiles = PLATFORMS
    .filter(p => p.group === g.id)
    .map(p => `
      <div class="_ppTile" data-id="${p.id}" data-layout="${p.layout}" tabindex="0" role="button" aria-label="${p.label}">
        <span class="_ppTileLabel">${p.label}</span>
        <span class="_ppTileSize">${p.w}×${p.h}</span>
      </div>
    `).join('');

  return `
    <div class="_ppGroup" data-group="${g.id}">
      <div class="_ppGroupHdr">
        <span class="_ppGroupName">${g.label}</span>
        <span class="_ppGroupSub">${g.sub}</span>
        <div class="_ppGroupDivider"></div>
      </div>
      <div class="_ppGrid">${tiles}</div>
    </div>
  `;
}

function _wireEvents() {
  document.getElementById('_ppX').onclick        = _close;
  document.getElementById('_ppBtnCancel').onclick = _close;
  document.getElementById('_ppBtnExport').onclick  = _fireExport;

  document.getElementById('_ppBody').addEventListener('click', e => {
    const tile = e.target.closest('._ppTile');
    if (!tile) return;
    _selectTile(tile.dataset.id);
  });

  document.getElementById('_ppBody').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const tile = e.target.closest('._ppTile');
      if (tile) { e.preventDefault(); _selectTile(tile.dataset.id); }
    }
  });

  document.getElementById('_ppBd').addEventListener('click', e => {
    if (e.target === document.getElementById('_ppBd')) _close();
  });

  const sheet = document.getElementById('_ppSheet');
  const handle = sheet.querySelector('._ppHandle');
  if (handle) {
    let sy = 0, cy = 0, drag = false;
    handle.addEventListener('touchstart', e => { sy = e.touches[0].clientY; cy = sy; drag = true; sheet.style.transition = 'none'; }, { passive:true });
    handle.addEventListener('touchmove',  e => { if (!drag) return; cy = e.touches[0].clientY; const d = Math.max(0, cy-sy); sheet.style.transform = `translateY(${d}px)`; sheet.style.opacity = String(1-d/280); }, { passive:true });
    handle.addEventListener('touchend',   () => { if (!drag) return; drag = false; sheet.style.transition = ''; if (cy-sy > 80) _close(); else { sheet.style.transform = ''; sheet.style.opacity = ''; } });
  }
}

function _selectTile(id) {
  const p = PLATFORMS.find(x => x.id === id);
  if (!p) return;
  PP.selected = id;

  document.querySelectorAll('._ppTile').forEach(t => {
    t.classList.toggle('selected', t.dataset.id === id);
  });

  const badge     = document.getElementById('_ppSelBadge');
  const badgeName = document.getElementById('_ppSelBadgeName');
  const badgeSize = document.getElementById('_ppSelBadgeSize');
  const badgeHint = document.getElementById('_ppSelBadgeHint');
  const fmt       = PP.pending && PP.pending.format;

  badgeName.textContent = p.label;
  badgeSize.textContent = `${p.w} × ${p.h} px`;
  badgeHint.textContent = _layoutHint(p.layout, fmt);
  badge.classList.remove('hide');

  const btn = document.getElementById('_ppBtnExport');
  const lbl = document.getElementById('_ppBtnExportLabel');
  const ico = document.getElementById('_ppBtnExportIcon');
  btn.disabled = false;
  ico.textContent = fmt === 'gif' ? '◎' : '↓';
  lbl.textContent = fmt === 'gif'
    ? `Export GIF for ${p.label}`
    : `Save Poster for ${p.label}`;
}

function _layoutHint(layout, format) {
  const fmtLabel = format === 'gif' ? 'GIF' : 'Poster';
  switch (layout) {
    case 'square': return `${fmtLabel} sized for square feed posts`;
    case 'story':  return `Tall vertical layout — lyrics fill the screen`;
    case 'wide':   return `Landscape layout — optimised for timelines`;
    default:       return '';
  }
}

function _fireExport() {
  if (!PP.selected || !PP.pending) return;
  const platform = PLATFORMS.find(p => p.id === PP.selected);
  if (!platform) return;

  const { format, view, p1, p2, opts } = PP.pending;

  // Wrap caller's callbacks so we can show/hide progress in the picker
  const callerStart    = typeof opts.onStart    === 'function' ? opts.onStart    : () => {};
  const callerProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const callerDone     = typeof opts.onDone     === 'function' ? opts.onDone     : () => {};
  const callerError    = typeof opts.onError    === 'function' ? opts.onError    : () => {};

  const progressEl = document.getElementById('_ppProgress');
  const barEl      = document.getElementById('_ppProgressBar');
  const lblEl      = document.getElementById('_ppProgressLabel');
  const exportBtn  = document.getElementById('_ppBtnExport');
  const cancelBtn  = document.getElementById('_ppBtnCancel');

  function _showProgress(pct, label) {
    if (progressEl) progressEl.classList.add('show');
    if (barEl) barEl.style.width = (pct * 100) + '%';
    if (lblEl) lblEl.textContent = label || 'Encoding…';
  }
  function _hideProgress() {
    if (progressEl) progressEl.classList.remove('show');
    if (barEl) barEl.style.width = '0%';
  }

  const exportOpts = Object.assign({}, opts, {
    width:    platform.w,
    height:   platform.h,
    size:     Math.min(platform.w, platform.h),
    layout:   platform.layout,
    platform: platform.id,
    onStart: () => {
      if (exportBtn) exportBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      _showProgress(0, format === 'gif' ? 'Creating GIF…' : 'Generating poster…');
      callerStart();
    },
    onProgress: (pct) => {
      _showProgress(pct, `${format === 'gif' ? 'GIF' : 'Poster'} ${Math.round(pct * 100)}%`);
      callerProgress(pct);
    },
    onDone: () => {
      _hideProgress();
      _close();
      callerDone();
    },
    onError: (err) => {
      _hideProgress();
      if (exportBtn) exportBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      console.error('[PlatformPicker] export error', err);
      callerError(err);
    },
  });

  // Fire immediately — no confirmation warning
  if (format === 'gif') {
    if (typeof window.GifExporter !== 'undefined') {
      window.GifExporter.export(view, p1, p2, exportOpts);
    } else {
      console.error('[PlatformPicker] GifExporter not loaded');
    }
  } else {
    if (typeof window.PosterExporter !== 'undefined') {
      window.PosterExporter.export(view, p1, p2, exportOpts);
    } else {
      console.error('[PlatformPicker] PosterExporter not loaded');
    }
  }
}

function _open(pending) {
  _mount();
  PP.pending  = pending;
  PP.selected = null;

  document.querySelectorAll('._ppTile').forEach(t => t.classList.remove('selected'));
  document.getElementById('_ppSelBadge').classList.add('hide');
  const btn = document.getElementById('_ppBtnExport');
  btn.disabled = true;
  document.getElementById('_ppBtnExportLabel').textContent = 'Select a platform first';
  document.getElementById('_ppBtnExportIcon').textContent  = '↓';

  // Show all groups and all tiles regardless of format
  document.querySelectorAll('._ppGroup').forEach(g => { g.style.display = ''; });
  document.querySelectorAll('._ppTile').forEach(t  => { t.style.display = ''; });

  const bd = document.getElementById('_ppBd');
  bd.classList.remove('hide');
  document.body.classList.add('modal-open');
}

function _close() {
  const bd    = document.getElementById('_ppBd');
  const sheet = document.getElementById('_ppSheet');
  if (!bd || bd.classList.contains('hide')) return;
  sheet.classList.add('pp-exit');
  document.body.classList.remove('modal-open');
  setTimeout(() => {
    bd.classList.add('hide');
    sheet.classList.remove('pp-exit');
    sheet.style.transform = '';
    sheet.style.opacity   = '';
    PP.pending  = null;
    PP.selected = null;
    // Reset progress bar state
    const progressEl = document.getElementById('_ppProgress');
    const barEl      = document.getElementById('_ppProgressBar');
    const exportBtn  = document.getElementById('_ppBtnExport');
    const cancelBtn  = document.getElementById('_ppBtnCancel');
    if (progressEl) progressEl.classList.remove('show');
    if (barEl) barEl.style.width = '0%';
    if (exportBtn) exportBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }, 280);
}

window.PlatformPicker = { pick: _open };

})();
