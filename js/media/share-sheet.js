/* ============================================================
   MARGO — js/media/share-sheet.js
   v2.0 — CLEAN SINGLE FLOW
   • GIF plays immediately on open, no tab choice
   • Five theme dots — tap to change, preview updates live
   • One primary Save button
   • Poster + Studio as secondary actions
   • All rendering calls unchanged:
       GIF preview  → gsDrawFrame (gif-studio.js)
       GIF export   → gsExportForShareSheet (duet-mode.js)
       Poster       → drawPosterPreview (poster/studio.js)
       Theme setter → gsSetTheme (gif-studio.js)
   • Duet mode fully preserved
   ============================================================ */

window._shareSheet = window._shareSheet || {
  post:         null,
  echoPost:     null,
  isDuet:       false,
  activeFormat: 'gif',   /* 'gif' | 'poster' */
  gifBlob:      null,
  posterBlob:   null,
  isEncoding:   false,
  animFrame:    null,
  mounted:      false,
  theme:        'void-violet',
};
const SS = window._shareSheet;

/* ── Theme palette — 5 core themes shown inline ── */
const SS_THEMES = [
  { id:'void-violet',   color:'#9B7FE8', bg:'#0E0B1A', label:'Violet'  },
  { id:'midnight-gold', color:'#E8C547', bg:'#0B0B0D', label:'Gold'    },
  { id:'neon-cyan',     color:'#00e5ff', bg:'#050e1a', label:'Ocean'   },
  { id:'sunset-coral',  color:'#ff6b6b', bg:'#1a0505', label:'Ember'   },
  { id:'rose-gold',     color:'#f4a4c0', bg:'#1a0d0f', label:'Rose'    },
];

/* ── Feeling config ── */
const SS_FEELING_CFG = {
  Love:       { bg:'rgba(255,107,157,0.13)', text:'#FF6B9D', border:'rgba(255,107,157,0.22)' },
  Heartbreak: { bg:'rgba(255,80,80,0.11)',   text:'#ff5050', border:'rgba(255,80,80,0.2)'    },
  Hope:       { bg:'rgba(107,140,255,0.13)', text:'#6B8CFF', border:'rgba(107,140,255,0.22)' },
  Nostalgia:  { bg:'rgba(232,197,71,0.11)',  text:'#E8C547', border:'rgba(232,197,71,0.25)'  },
  Healing:    { bg:'rgba(74,222,128,0.13)',  text:'#4ade80', border:'rgba(74,222,128,0.22)'  },
  Joy:        { bg:'rgba(255,200,71,0.11)',  text:'#ffc847', border:'rgba(255,200,71,0.22)'  },
  Rage:       { bg:'rgba(255,100,100,0.13)', text:'#FF6464', border:'rgba(255,100,100,0.22)' },
  Loneliness: { bg:'rgba(160,160,255,0.11)', text:'#a0a0ff', border:'rgba(160,160,255,0.22)' },
  SendIt:     { bg:'rgba(0,229,255,0.11)',   text:'#00E5FF', border:'rgba(0,229,255,0.22)'   },
  LetOut:     { bg:'rgba(255,160,50,0.11)',  text:'#FFA032', border:'rgba(255,160,50,0.22)'  },
};
const SS_FEELING_DEFAULT = { bg:'rgba(155,127,232,0.11)', text:'#9B7FE8', border:'rgba(155,127,232,0.25)' };

/* ══════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════ */
function injectShareSheetStyles() {
  if (document.getElementById('shareSheetStyles')) return;
  const s = document.createElement('style');
  s.id = 'shareSheetStyles';
  s.textContent = `
    #shareSheetBackdrop {
      position:fixed;inset:0;z-index:600;
      background:rgba(0,0,0,0.8);
      backdrop-filter:blur(16px) saturate(0.6);
      -webkit-backdrop-filter:blur(16px) saturate(0.6);
      display:flex;align-items:flex-end;justify-content:center;
      animation:ssBackdropIn 0.24s ease;
    }
    @keyframes ssBackdropIn{from{opacity:0}to{opacity:1}}
    #shareSheetBackdrop.ss-hidden{display:none!important}
    @media(min-width:560px){
      #shareSheetBackdrop{align-items:center;padding:24px}
    }

    #shareSheet {
      width:100%;max-width:480px;
      background:#0c0b12;
      border:1px solid rgba(255,255,255,0.07);
      border-bottom:none;border-radius:28px 28px 0 0;
      overflow:hidden;display:flex;flex-direction:column;
      max-height:92dvh;
      box-shadow:0 -8px 60px rgba(0,0,0,0.9);
      animation:ssSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    @media(min-width:560px){
      #shareSheet{
        border-radius:24px;border-bottom:1px solid rgba(255,255,255,0.07);
        animation:ssFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes ssSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes ssFadeUp{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    #shareSheet.ss-exit{animation:ssSlideDown 0.26s cubic-bezier(0.4,0,1,1) forwards}
    @keyframes ssSlideDown{to{transform:translateY(80px);opacity:0}}

    /* Handle */
    .ss-handle{
      width:36px;height:4px;border-radius:2px;
      background:rgba(255,255,255,0.1);
      margin:12px auto 0;flex-shrink:0;
    }

    /* Header */
    .ss-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 18px 0;flex-shrink:0;
    }
    .ss-header-left{display:flex;flex-direction:column;gap:2px}
    .ss-title{
      font-family:'Syne',sans-serif;font-weight:800;font-size:0.85rem;
      letter-spacing:2px;text-transform:uppercase;color:#fff;
    }
    .ss-lyric-preview{
      font-family:'DM Serif Display',serif;font-style:italic;
      font-size:0.75rem;color:rgba(255,255,255,0.32);
      line-height:1.4;max-width:260px;
      overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    }
    .ss-duet-badge{
      display:none;align-items:center;gap:5px;margin-top:3px;
      font-family:'Space Mono',monospace;font-size:0.44rem;font-weight:700;
      letter-spacing:1.5px;text-transform:uppercase;
      padding:3px 9px;border-radius:20px;
      background:rgba(155,127,232,0.09);border:1px solid rgba(155,127,232,0.25);
      color:#9B7FE8;
    }
    .ss-duet-badge.visible{display:inline-flex}
    .ss-duet-badge-dot{width:5px;height:5px;border-radius:50%;background:#9B7FE8;opacity:0.8}
    .ss-close{
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);
      color:rgba(255,255,255,0.35);width:30px;height:30px;
      border-radius:50%;font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.16s;flex-shrink:0;
    }
    .ss-close:hover{background:rgba(255,255,255,0.1);color:#fff}

    /* Canvas */
    .ss-canvas-wrap{
      padding:14px 18px 10px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
    }
    .ss-canvas-ring{
      position:relative;border-radius:18px;overflow:hidden;
      box-shadow:0 16px 56px rgba(0,0,0,0.8),0 0 0 1px rgba(155,127,232,0.15);
      background:#0E0B1A;
      transition:box-shadow 0.3s ease;
    }
    #ssCanvas{display:block;border-radius:18px}

    /* Encoding overlay */
    .ss-encoding-overlay{
      position:absolute;inset:0;border-radius:18px;
      background:rgba(12,11,18,0.88);backdrop-filter:blur(6px);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
    }
    .ss-encoding-overlay.hidden{display:none}
    .ss-encoding-label{
      font-family:'Space Mono',monospace;font-size:0.58rem;
      font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
      color:rgba(255,255,255,0.45);
    }
    .ss-progress-bar-wrap{width:100px;height:2px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden}
    .ss-progress-bar{height:100%;border-radius:2px;background:#9B7FE8;transition:width 0.1s linear;width:0%}

    /* Theme dots */
    .ss-themes{
      display:flex;align-items:center;justify-content:center;
      gap:10px;padding:4px 18px 12px;flex-shrink:0;
    }
    .ss-theme-dot{
      width:22px;height:22px;border-radius:50%;cursor:pointer;
      border:2px solid transparent;
      transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
      position:relative;flex-shrink:0;
    }
    .ss-theme-dot:hover{transform:scale(1.15)}
    .ss-theme-dot.active{
      border-color:#fff;
      transform:scale(1.18);
      box-shadow:0 0 0 3px rgba(255,255,255,0.12);
    }

    /* Info strip */
    .ss-info-strip{
      display:flex;align-items:center;gap:10px;
      padding:0 18px 12px;flex-shrink:0;
    }
    .ss-song-thumb{
      width:34px;height:34px;border-radius:8px;object-fit:cover;
      flex-shrink:0;border:1px solid rgba(255,255,255,0.08);
    }
    .ss-song-info{flex:1;min-width:0}
    .ss-song-title{
      font-family:'DM Sans',sans-serif;font-size:0.8rem;font-weight:600;
      color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .ss-song-artist{
      font-family:'Space Mono',monospace;font-size:0.55rem;
      color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .ss-feeling-tag{
      font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;
      text-transform:uppercase;letter-spacing:0.5px;
      padding:3px 9px;border-radius:20px;flex-shrink:0;
    }

    /* Primary save button */
    .ss-save-btn{
      margin:0 18px;padding:15px;border-radius:16px;
      background:#9B7FE8;border:none;color:#0E0B1A;
      font-family:'Space Mono',monospace;font-size:0.65rem;
      font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
      cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
      display:flex;align-items:center;justify-content:center;gap:8px;
      flex-shrink:0;
    }
    .ss-save-btn:hover{background:#b09af0;transform:translateY(-1px);box-shadow:0 8px 24px rgba(155,127,232,0.35)}
    .ss-save-btn:active{transform:scale(0.98)}
    .ss-save-btn:disabled{opacity:0.5;cursor:wait;transform:none}
    .ss-save-btn-icon{font-size:1rem}

    /* Secondary actions */
    .ss-secondary{
      display:flex;gap:8px;padding:10px 18px 20px;flex-shrink:0;
    }
    .ss-sec-btn{
      flex:1;padding:11px 8px;border-radius:12px;
      border:1px solid rgba(255,255,255,0.09);
      background:rgba(255,255,255,0.03);
      color:rgba(255,255,255,0.5);
      font-family:'Space Mono',monospace;
      font-size:0.5rem;font-weight:700;
      text-transform:uppercase;letter-spacing:1px;
      cursor:pointer;transition:all 0.18s;
      display:flex;flex-direction:column;align-items:center;gap:3px;
    }
    .ss-sec-btn:hover{border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff}
    .ss-sec-btn:active{transform:scale(0.97)}
    .ss-sec-btn-icon{font-size:1rem;line-height:1}
    .ss-sec-btn.active-format{
      border-color:rgba(155,127,232,0.4);
      background:rgba(155,127,232,0.08);
      color:#9B7FE8;
    }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════
   MOUNT DOM
══════════════════════════════════════════════════════════ */
function mountShareSheet() {
  if (document.getElementById('shareSheetBackdrop')) return;
  injectShareSheetStyles();

  const backdrop = document.createElement('div');
  backdrop.id = 'shareSheetBackdrop';
  backdrop.className = 'ss-hidden';
  backdrop.innerHTML = `
    <div id="shareSheet">
      <div class="ss-handle" id="ssDragHandle"></div>
      <div class="ss-header">
        <div class="ss-header-left">
          <span class="ss-title" id="ssTitle">Share</span>
          <span class="ss-lyric-preview" id="ssLyricPreview"></span>
          <span class="ss-duet-badge" id="ssDuetBadge">
            <span class="ss-duet-badge-dot"></span>LYRIC BACK
          </span>
        </div>
        <button class="ss-close" id="ssClose" aria-label="Close">×</button>
      </div>

      <div class="ss-canvas-wrap">
        <div class="ss-canvas-ring" id="ssCanvasRing">
          <canvas id="ssCanvas"></canvas>
          <div class="ss-encoding-overlay hidden" id="ssEncodingOverlay">
            <span class="ss-encoding-label" id="ssEncodingLabel">Saving…</span>
            <div class="ss-progress-bar-wrap">
              <div class="ss-progress-bar" id="ssProgressBar"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="ss-themes" id="ssThemes">
        ${SS_THEMES.map((t, i) => `
          <button
            class="ss-theme-dot${i === 0 ? ' active' : ''}"
            data-theme="${t.id}"
            style="background:linear-gradient(135deg,${t.bg},${t.color})"
            title="${t.label}"
            aria-label="${t.label} theme"
          ></button>
        `).join('')}
      </div>

      <div class="ss-info-strip" id="ssInfoStrip"></div>

      <button class="ss-save-btn" id="ssSaveBtn">
        <span class="ss-save-btn-icon">↓</span>
        <span id="ssSaveBtnLabel">Save GIF</span>
      </button>

      <div class="ss-secondary">
        <button class="ss-sec-btn" id="ssBtnPoster">
          <span class="ss-sec-btn-icon">◻</span>
          <span>Poster</span>
        </button>
        <button class="ss-sec-btn" id="ssBtnShare">
          <span class="ss-sec-btn-icon">↗</span>
          <span>Share</span>
        </button>
        <button class="ss-sec-btn" id="ssBtnStudio">
          <span class="ss-sec-btn-icon">✦</span>
          <span>Studio</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  SS.mounted = true;

  /* Wire events */
  backdrop.querySelector('#ssClose').onclick    = closeShareSheet;
  backdrop.querySelector('#ssSaveBtn').onclick  = ssSave;
  backdrop.querySelector('#ssBtnPoster').onclick = ssTogglePoster;
  backdrop.querySelector('#ssBtnShare').onclick  = ssShare;
  backdrop.querySelector('#ssBtnStudio').onclick = ssOpenStudio;

  /* Theme dots */
  backdrop.querySelector('#ssThemes').addEventListener('click', e => {
    const dot = e.target.closest('.ss-theme-dot');
    if (!dot) return;
    const themeId = dot.dataset.theme;
    SS.theme = themeId;
    backdrop.querySelectorAll('.ss-theme-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.theme === themeId);
    });
    /* Update canvas ring shadow color */
    const th = SS_THEMES.find(t => t.id === themeId);
    const ring = document.getElementById('ssCanvasRing');
    if (ring && th) {
      ring.style.boxShadow = `0 16px 56px rgba(0,0,0,0.8),0 0 0 1px ${th.color}33`;
      ring.style.background = th.bg;
    }
    if (typeof window.gsSetTheme === 'function') window.gsSetTheme(themeId);
    SS.gifBlob = null;
    SS.posterBlob = null;
  });

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeShareSheet(); });
  initSSSwipeClose();
}

/* ══════════════════════════════════════════════════════════
   PREVIEW
══════════════════════════════════════════════════════════ */
function ssStopPreview() {
  if (SS.animFrame) { cancelAnimationFrame(SS.animFrame); SS.animFrame = null; }
}

function ssStartPreview() {
  ssStopPreview();
  const canvas = document.getElementById('ssCanvas');
  const post   = SS.post;
  if (!canvas || !post) return;

  const dpr  = Math.min(window.devicePixelRatio || 1, 2);
  const wrap = canvas.parentElement;
  const maxSz = Math.min(wrap ? wrap.clientWidth - 0 : 320, 340);
  const size  = Math.max(120, maxSz);

  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);

  if (SS.activeFormat === 'poster') {
    /* Static poster */
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    document.fonts.ready.then(() => {
      if (SS.isDuet && SS.echoPost) {
        if (typeof drawDuetPosterToCtx === 'function') {
          drawDuetPosterToCtx(ctx, size, size);
        }
      } else {
        if (typeof window.drawPosterPreview === 'function') {
          window.drawPosterPreview(ctx, size, size, post);
        }
      }
    });
    return;
  }

  /* Animated GIF preview */
  let frame = 0, last = 0;
  const delay = 70, frames = 24;

  const loop = (ts) => {
    if (ts - last >= delay) {
      last = ts;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      window.currentPost = post;

      if (SS.isDuet && SS.echoPost) {
        if (typeof gsDrawDuetFrame === 'function') {
          gsDrawDuetFrame(ctx, size, size, frame / frames);
        }
      } else {
        if (typeof gsDrawFrame === 'function') {
          gsDrawFrame(ctx, size, size, frame / frames, post);
        }
      }
      frame = (frame + 1) % frames;
    }
    SS.animFrame = requestAnimationFrame(loop);
  };
  SS.animFrame = requestAnimationFrame(loop);
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
══════════════════════════════════════════════════════════ */
function openShareSheet(post, opts = {}) {
  if (!post) return;
  mountShareSheet();

  SS.post         = post;
  window.currentPost = post;
  SS.isDuet       = !!(opts.isDuet && opts.echoPost);
  SS.echoPost     = opts.echoPost || null;
  SS.gifBlob      = null;
  SS.posterBlob   = null;
  SS.activeFormat = 'gif';
  SS.theme        = 'void-violet';

  /* Reset theme dots */
  document.querySelectorAll('.ss-theme-dot').forEach((d, i) => {
    d.classList.toggle('active', i === 0);
  });
  if (typeof window.gsSetTheme === 'function') window.gsSetTheme('void-violet');

  /* Reset canvas ring */
  const ring = document.getElementById('ssCanvasRing');
  if (ring) {
    ring.style.boxShadow = '0 16px 56px rgba(0,0,0,0.8),0 0 0 1px rgba(155,127,232,0.15)';
    ring.style.background = '#0E0B1A';
  }

  /* Reset format buttons */
  document.getElementById('ssBtnPoster')?.classList.remove('active-format');
  const lbl = document.getElementById('ssSaveBtnLabel');
  if (lbl) lbl.textContent = 'Save GIF';

  /* Header */
  const titleEl = document.getElementById('ssTitle');
  const badgeEl = document.getElementById('ssDuetBadge');
  const prevEl  = document.getElementById('ssLyricPreview');

  if (SS.isDuet && SS.echoPost) {
    if (titleEl) titleEl.textContent = 'Lyric Back';
    if (badgeEl) badgeEl.classList.add('visible');
    if (prevEl)  prevEl.textContent =
      `"${(post.text||'').substring(0,28)}…" ↩ "${(SS.echoPost.text||'').substring(0,22)}…"`;
    populateSSDuetInfoStrip(post, SS.echoPost);
  } else {
    if (titleEl) titleEl.textContent = 'Share';
    if (badgeEl) badgeEl.classList.remove('visible');
    if (prevEl)  prevEl.textContent = (post.text||'').substring(0,48) + (post.text?.length > 48 ? '…' : '');
    populateSSInfoStrip(post);
  }

  const backdrop = document.getElementById('shareSheetBackdrop');
  backdrop.classList.remove('ss-hidden');
  document.body.classList.add('modal-open');

  requestAnimationFrame(() => requestAnimationFrame(() => ssStartPreview()));
}

function closeShareSheet() {
  ssStopPreview();
  const backdrop = document.getElementById('shareSheetBackdrop');
  const sheet    = document.getElementById('shareSheet');
  if (!backdrop || backdrop.classList.contains('ss-hidden')) return;
  sheet?.classList.add('ss-exit');
  document.body.classList.remove('modal-open');
  setTimeout(() => {
    backdrop.classList.add('ss-hidden');
    sheet?.classList.remove('ss-exit');
    SS.gifBlob = null; SS.posterBlob = null; SS.isEncoding = false;
  }, 280);
}

function reopenShareSheet() {
  const backdrop = document.getElementById('shareSheetBackdrop');
  if (!backdrop) return;
  backdrop.classList.remove('ss-hidden');
  document.body.classList.add('modal-open');
  window.currentPost = SS.post;
  requestAnimationFrame(() => ssStartPreview());
}
window.reopenShareSheet = reopenShareSheet;

/* ── Info strips ── */
function populateSSInfoStrip(post) {
  const strip = document.getElementById('ssInfoStrip');
  if (!strip) return;
  const k       = post.knowledge || {};
  const feeling = post.emotion || post.feeling || 'Nostalgia';
  const ecfg    = SS_FEELING_CFG[feeling] || SS_FEELING_DEFAULT;
  const meta    = post.youtubeMeta;
  const thumb   = meta?.thumbnailSm || meta?.thumbnail;
  strip.innerHTML = `
    ${thumb ? `<img src="${thumb}" class="ss-song-thumb" alt="" loading="lazy" onerror="this.style.display='none'"/>` : ''}
    <div class="ss-song-info">
      <div class="ss-song-title">${k.song||'Unknown Song'}</div>
      <div class="ss-song-artist">${k.artist||'Unknown Artist'}</div>
    </div>
    <span class="ss-feeling-tag" style="background:${ecfg.bg};color:${ecfg.text};border:1px solid ${ecfg.border}">${feeling}</span>
  `;
}

function populateSSDuetInfoStrip(post, echoPost) {
  const strip = document.getElementById('ssInfoStrip');
  if (!strip) return;
  const kP = post.knowledge     || {};
  const kE = echoPost.knowledge || {};
  const eE = SS_FEELING_CFG[echoPost.emotion] || SS_FEELING_DEFAULT;
  strip.innerHTML = `
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
      <div style="font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:700;color:#FF6B9D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kP.song||'Unknown'}</div>
      <div style="font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kP.artist||''}</div>
    </div>
    <span style="font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;color:rgba(155,127,232,0.55);flex-shrink:0;padding:0 4px">↔</span>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:right">
      <div style="font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:700;color:#6B8CFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kE.song||'Unknown'}</div>
      <div style="font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kE.artist||''}</div>
    </div>
    <span class="ss-feeling-tag" style="background:${eE.bg};color:${eE.text};border:1px solid ${eE.border};flex-shrink:0;margin-left:4px">${echoPost.emotion||'Echo'}</span>
  `;
}

/* ══════════════════════════════════════════════════════════
   FORMAT TOGGLE — Poster button
══════════════════════════════════════════════════════════ */
function ssTogglePoster() {
  const isPoster = SS.activeFormat === 'poster';
  SS.activeFormat = isPoster ? 'gif' : 'poster';
  SS.gifBlob = null;
  SS.posterBlob = null;

  const btn = document.getElementById('ssBtnPoster');
  const lbl = document.getElementById('ssSaveBtnLabel');
  if (btn) btn.classList.toggle('active-format', SS.activeFormat === 'poster');
  if (lbl) lbl.textContent = SS.activeFormat === 'gif' ? 'Save GIF' : 'Save Poster';

  ssStopPreview();
  requestAnimationFrame(() => ssStartPreview());
}

/* ══════════════════════════════════════════════════════════
   ENCODING OVERLAY
══════════════════════════════════════════════════════════ */
function setSSEncoding(on, label='') {
  const overlay = document.getElementById('ssEncodingOverlay');
  const lbl     = document.getElementById('ssEncodingLabel');
  const bar     = document.getElementById('ssProgressBar');
  if (overlay) overlay.classList.toggle('hidden', !on);
  if (lbl && label) lbl.textContent = label;
  if (bar && !on) bar.style.width = '0%';
  ['ssSaveBtn','ssBtnPoster','ssBtnShare','ssBtnStudio'].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = on;
  });
}

/* ══════════════════════════════════════════════════════════
   SAVE
══════════════════════════════════════════════════════════ */
async function ssSave() {
  if (SS.isEncoding) return;
  if (SS.activeFormat === 'poster') {
    await ssGeneratePoster();
    if (!SS.posterBlob) return;
    _downloadBlob(SS.posterBlob, `margo-${SS.isDuet?'duet-':''}poster-${Date.now()}.png`);
    if (typeof showToast === 'function') showToast('Poster saved ✓');
  } else {
    await ssGenerateGif();
    if (!SS.gifBlob) return;
    _downloadBlob(SS.gifBlob, `margo-${SS.isDuet?'duet-':''}gif-${Date.now()}.gif`);
    if (typeof showToast === 'function') showToast('GIF saved ✓');
  }
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

/* ══════════════════════════════════════════════════════════
   SHARE
══════════════════════════════════════════════════════════ */
async function ssShare() {
  const isGif = SS.activeFormat === 'gif';
  if (isGif && !SS.gifBlob) await ssGenerateGif();
  if (!isGif && !SS.posterBlob) await ssGeneratePoster();
  const blob = isGif ? SS.gifBlob : SS.posterBlob;
  if (!blob) return;
  const ext  = isGif ? 'gif' : 'png';
  const mime = isGif ? 'image/gif' : 'image/png';
  const fileName = `margo-${SS.isDuet?'duet-':''}${ext}-${Date.now()}.${ext}`;
  const text = SS.isDuet
    ? `"${SS.post?.text?.substring(0,40)||''}" ↩ "${SS.echoPost?.text?.substring(0,40)||''}" — trymargo.com`
    : `"${SS.post?.text?.substring(0,60)||''}" — trymargo.com`;
  const file = new File([blob], fileName, { type: mime });
  try {
    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
      await navigator.share({ title:'MARGO', text, files:[file] }); return;
    }
  } catch(e) { if (e.name === 'AbortError') return; }
  _downloadBlob(blob, fileName);
  if (typeof showToast === 'function') showToast('Saved to device ✓');
}

/* ══════════════════════════════════════════════════════════
   GENERATE POSTER
══════════════════════════════════════════════════════════ */
async function ssGeneratePoster() {
  if (SS.posterBlob) return;
  SS.isEncoding = true;
  setSSEncoding(true, 'Generating poster…');
  try {
    const off = document.createElement('canvas');
    off.width = 1080; off.height = 1080;
    const ctx = off.getContext('2d');
    await document.fonts.ready;
    if (SS.isDuet && SS.echoPost) {
      if (typeof drawDuetPosterToCtx === 'function') {
        drawDuetPosterToCtx(ctx, 1080, 1080);
      }
    } else {
      if (typeof window.drawPosterPreview === 'function') {
        window.drawPosterPreview(ctx, 1080, 1080, SS.post);
      }
    }
    SS.posterBlob = await new Promise((res, rej) => {
      off.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png');
    });
  } catch(err) {
    console.error('[SS] poster error:', err);
    if (typeof showToast === 'function') showToast('Could not generate poster');
  } finally {
    SS.isEncoding = false; setSSEncoding(false);
  }
}

/* ══════════════════════════════════════════════════════════
   GENERATE GIF
══════════════════════════════════════════════════════════ */
async function ssGenerateGif() {
  if (SS.gifBlob) return;
  if (typeof gsExportForShareSheet !== 'function') {
    if (typeof showToast === 'function') showToast('Open Studio to export GIF');
    ssOpenStudio(); return;
  }
  SS.isEncoding = true;
  setSSEncoding(true, SS.isDuet ? 'Creating Lyric Back GIF…' : 'Creating GIF…');
  try {
    window.currentPost = SS.post;
    SS.gifBlob = await gsExportForShareSheet((pct) => {
      const bar = document.getElementById('ssProgressBar');
      if (bar) bar.style.width = (pct * 100) + '%';
      const lbl = document.getElementById('ssEncodingLabel');
      if (lbl) lbl.textContent = `${Math.round(pct * 100)}%`;
    });
    if (typeof showToast === 'function') showToast(SS.isDuet ? 'Lyric Back GIF ready ✓' : 'GIF ready ✓');
  } catch(err) {
    console.error('[SS] GIF error:', err);
    if (typeof showToast === 'function') showToast('GIF failed — try Studio');
  } finally {
    SS.isEncoding = false; setSSEncoding(false);
  }
}

/* ══════════════════════════════════════════════════════════
   STUDIO
══════════════════════════════════════════════════════════ */
function ssOpenStudio() {
  ssStopPreview();
  const backdrop = document.getElementById('shareSheetBackdrop');
  if (backdrop) backdrop.classList.add('ss-hidden');
  window.currentPost = SS.post;
  if (SS.activeFormat === 'poster') {
    if (typeof openPosterStudio === 'function') openPosterStudio(SS.post);
    else if (typeof openStudio === 'function') openStudio(SS.post);
  } else {
    if (typeof openGifStudio === 'function') openGifStudio();
  }
}

/* ══════════════════════════════════════════════════════════
   SWIPE TO CLOSE
══════════════════════════════════════════════════════════ */
function initSSSwipeClose() {
  const sheet  = document.getElementById('shareSheet');
  const handle = document.getElementById('ssDragHandle');
  if (!sheet || !handle) return;
  let startY = 0, currentY = 0, dragging = false;
  const onStart = e => { startY = e.touches?.[0].clientY ?? e.clientY; currentY = startY; dragging = true; sheet.style.transition = 'none'; };
  const onMove  = e => {
    if (!dragging) return;
    currentY = e.touches?.[0].clientY ?? e.clientY;
    const dy = Math.max(0, currentY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    sheet.style.opacity   = String(1 - dy / 300);
  };
  const onEnd = () => {
    if (!dragging) return; dragging = false; sheet.style.transition = '';
    if (currentY - startY > 80) closeShareSheet();
    else { sheet.style.transform = ''; sheet.style.opacity = ''; }
  };
  handle.addEventListener('touchstart', onStart, { passive:true });
  handle.addEventListener('touchmove',  onMove,  { passive:true });
  handle.addEventListener('touchend',   onEnd);
}

/* ══════════════════════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════════════════════ */
window.openShareSheet   = openShareSheet;
window.closeShareSheet  = closeShareSheet;
window.reopenShareSheet = reopenShareSheet;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountShareSheet);
} else {
  mountShareSheet();
}
