/* ============================================================
   MARGO — js/media/share-sheet.js
   v2.1 — FIXES:
   • Encoding overlay clears properly after GIF save
   • Preview restarts after save — sheet never freezes
   • Poster canvas sized correctly before draw
   • Share opens PlatformPicker (Instagram/WhatsApp/TikTok etc)
   • Download filename uses song name
   • Track number removed
   • Theme dots refined
   • Duet mode fully preserved
   ============================================================ */

window._shareSheet = window._shareSheet || {
  post:         null,
  echoPost:     null,
  isDuet:       false,
  activeFormat: 'poster',
  size:         'square',
  gifBlob:      null,
  posterBlob:   null,
  isEncoding:   false,
  animFrame:    null,
  mounted:      false,
  theme:        'midnight-gold',
};
const SS = window._shareSheet;

/* ── 5 core themes ── */
const SS_THEMES = [
  { id:'midnight-gold',   color:'#E8C547', bg:'#0E0B1A' },
  { id:'midnight-gold', color:'#E8C547', bg:'#0B0B0D' },
  { id:'neon-cyan',     color:'#00e5ff', bg:'#050e1a' },
  { id:'sunset-coral',  color:'#ff6b6b', bg:'#1a0505' },
  { id:'monochrome',    color:'#ffffff', bg:'#0a0a0a' },
];

/* ── Feeling colours ── */
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
const SS_FEELING_DEFAULT = { bg:'rgba(232,197,71,0.09)', text:'#E8C547', border:'rgba(232,197,71,0.28)' };

/* ── Song name for filename ── */
function _songFilename(post, ext) {
  const slug = ((post?.knowledge?.song || 'Lyric').trim().replace(/[^a-z0-9\s]/gi,'').split(/\s+/).slice(0,4).join('-').toLowerCase()).substring(0,24);
  const size = (typeof SS !== 'undefined' && SS.size === 'landscape') ? 'Wide' : (typeof SS !== 'undefined' && SS.size === 'vertical') ? 'Vertical' : 'Square';
  return 'MARGO_' + slug + '_' + size + (ext ? '.' + ext : '');
}

/* ==========================================================
   STYLES
========================================================== */
function injectShareSheetStyles() {
  if (document.getElementById('shareSheetStyles')) return;
  const s = document.createElement('style');
  s.id = 'shareSheetStyles';
  s.textContent = `
    #shareSheetBackdrop {
      position:fixed;inset:0;z-index:600;
      background:rgba(0,0,0,0.82);
      backdrop-filter:blur(18px) saturate(0.55);
      -webkit-backdrop-filter:blur(18px) saturate(0.55);
      display:flex;align-items:flex-end;justify-content:center;
      animation:ssBackdropIn 0.22s ease;
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
        border-radius:24px;
        border-bottom:1px solid rgba(255,255,255,0.07);
        animation:ssFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes ssSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes ssFadeUp{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    #shareSheet.ss-exit{animation:ssSlideDown 0.26s cubic-bezier(0.4,0,1,1) forwards}
    @keyframes ssSlideDown{to{transform:translateY(80px);opacity:0}}

    .ss-handle{
      width:36px;height:4px;border-radius:2px;
      background:rgba(255,255,255,0.1);
      margin:12px auto 0;flex-shrink:0;
    }

    .ss-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 18px 0;flex-shrink:0;
    }
    .ss-header-left{display:flex;flex-direction:column;gap:2px}
    .ss-title{
      font-family:'Lora',serif;font-weight:800;font-size:0.7rem;
      letter-spacing:1px;text-transform:uppercase;color:#fff;
    }
    .ss-lyric-preview{display:none;
      font-family:'Lora',serif;font-style:italic;
      font-size:0.7rem;font-style:italic;color:rgba(255,255,255,0.32);
      line-height:1.4;max-width:260px;
      overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    }
    .ss-duet-badge{
      display:none;align-items:center;gap:5px;margin-top:3px;
      font-family:'Lora',serif;font-size:0.6rem;font-weight:600;
      letter-spacing:1px;text-transform:uppercase;
      padding:3px 9px;border-radius:20px;
      background:rgba(232,197,71,0.09);border:1px solid rgba(232,197,71,0.28);
      color:#E8C547;
    }
    .ss-duet-badge.visible{display:inline-flex}
    .ss-duet-badge-dot{width:5px;height:5px;border-radius:50%;background:#E8C547;opacity:0.8}
    .ss-close{
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);
      color:rgba(255,255,255,0.35);width:30px;height:30px;
      border-radius:50%;font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.16s;flex-shrink:0;
    }
    .ss-close:hover{background:rgba(255,255,255,0.1);color:#fff}

    .ss-canvas-wrap{
      padding:10px 18px 8px;flex:1 1 auto;min-height:0;
      display:flex;align-items:center;justify-content:center;
    }
    .ss-canvas-ring{
      position:relative;border-radius:14px;overflow:hidden;
      box-shadow:0 16px 56px rgba(0,0,0,0.8),0 0 0 1px rgba(232,197,71,0.12);
      background:#0E0B1A;
      transition:width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.25s cubic-bezier(0.16,1,0.3,1);
    }
    #ssCanvas{display:block;border-radius:14px;transition:width 0.25s cubic-bezier(0.16,1,0.3,1),height 0.25s cubic-bezier(0.16,1,0.3,1);}

    .ss-encoding-overlay{
      position:absolute;inset:0;border-radius:18px;
      background:rgba(12,11,18,0.9);backdrop-filter:blur(6px);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
    }
    .ss-encoding-overlay.hidden{display:none}
    .ss-encoding-label{
      font-family:'Lora',serif;font-size:0.6rem;
      font-weight:600;letter-spacing:1px;text-transform:uppercase;
      color:rgba(255,255,255,0.5);
    }
    .ss-progress-bar-wrap{
      width:120px;height:2px;border-radius:2px;
      background:rgba(255,255,255,0.08);overflow:hidden;
    }
    .ss-progress-bar{
      height:100%;border-radius:2px;background:#E8C547;
      transition:width 0.1s linear;width:0%;
    }

    /* Theme dots */
    .ss-themes{
      display:flex;align-items:center;justify-content:center;
      gap:12px;padding:2px 18px 12px;flex-shrink:0;
    }
    .ss-theme-dot{
      width:20px;height:20px;border-radius:50%;cursor:pointer;
      border:2px solid rgba(255,255,255,0.0);
      transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
      flex-shrink:0;outline:none;
    }
    .ss-theme-dot:hover{transform:scale(1.2)}
    .ss-theme-dot.active{
      border-color:rgba(255,255,255,0.9);
      transform:scale(1.25);
      box-shadow:0 0 0 3px rgba(255,255,255,0.1);
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
      font-family:'Lora',serif;font-size:0.82rem;font-weight:600;
      color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .ss-song-artist{
      font-family:'Lora',serif;font-size:0.7rem;
      color:rgba(255,255,255,0.35);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .ss-feeling-tag{
      font-family:'Lora',serif;font-size:0.6rem;font-weight:600;
      text-transform:uppercase;letter-spacing:0.5px;
      padding:3px 9px;border-radius:20px;flex-shrink:0;
    }

    .ss-logo-lockup{display:flex;align-items:center;gap:7px;text-decoration:none;}
    .ss-logo-wordmark{font-family:'Syne',sans-serif;font-weight:800;font-size:0.82rem;letter-spacing:4px;color:var(--gold,#E8C547);text-transform:uppercase;line-height:1;opacity:0.75;}
    /* ── SHARE SHEET TABS ── */
    .ss-size-row{display:flex;gap:8px;padding:10px 18px 0;flex-shrink:0;}
    .ss-size-btn{
      flex:1;padding:10px 6px;border-radius:10px;
      border:1px solid rgba(255,255,255,0.07);
      background:#161420;color:#555360;
      font-family:'Lora',serif;
      font-size:0.56rem;font-weight:600;
      letter-spacing:0.5px;text-transform:uppercase;
      cursor:pointer;transition:all 150ms;
      display:flex;flex-direction:column;align-items:center;gap:5px;
      min-height:44px;
    }
    .ss-size-btn:hover{border-color:rgba(255,255,255,0.12);color:#9A98A4;}
    .ss-size-btn.ss-size-active{
      background:rgba(232,197,71,0.08);
      border-color:rgba(232,197,71,0.28);
      color:#E8C547;
    }
    .ss-size-thumb-v{width:12px;height:20px;border-radius:2px;background:currentColor;opacity:0.6;}
    .ss-size-thumb-s{width:18px;height:18px;border-radius:2px;background:currentColor;opacity:0.6;}
    .ss-size-thumb-w{width:24px;height:14px;border-radius:2px;background:currentColor;opacity:0.6;}
    .ss-actions{display:flex;gap:8px;padding:10px 18px 16px;flex-shrink:0;}
    .ss-action-btn{
      flex:1;padding:13px 8px;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.09);
      border-radius:12px;
      color:rgba(255,255,255,0.55);
      font-family:'Lora',serif;
      font-size:0.58rem;font-weight:600;
      letter-spacing:0.5px;text-transform:uppercase;
      cursor:pointer;transition:all 150ms;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
      min-height:48px;
    }
    .ss-action-btn:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.18);color:#fff;}
    .ss-action-btn:active{transform:scale(0.97);}
    .ss-action-btn.ss-primary{
      background:rgba(232,197,71,0.10);
      border-color:rgba(232,197,71,0.35);
      color:#E8C547;
    }
    .ss-action-btn.ss-primary:hover{background:rgba(232,197,71,0.18);border-color:rgba(232,197,71,0.6);}
    .ss-action-icon{font-size:1rem;line-height:1;}
  `;
  document.head.appendChild(s);
}

/* ==========================================================
   MOUNT
========================================================== */
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
          <a class="ss-logo-lockup" href="/" aria-label="Margo home">
            <span class="margo-mark margo-mark--md">
              <span class="logo-ring"></span>
              <span class="logo-ring"></span>
              <span class="logo-ring"></span>
              <span class="logo-circle"><svg viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="40" cy="40" r="36" fill="#E8C547"/><path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57" fill="none" stroke="#0B0B0D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55"/></svg></span>
            </span>
            <span class="ss-logo-wordmark">MARGO</span>
          </a>
          <span class="ss-duet-badge" id="ssDuetBadge" style="display:none">
            <span class="ss-duet-badge-dot"></span>LYRIC BACK
          </span>
        </div>
        <button class="ss-close" id="ssClose" aria-label="Close">×</button>
      </div>

      <div class="ss-canvas-wrap">
        <div class="ss-canvas-ring" id="ssCanvasRing">
          <canvas id="ssCanvas"></canvas>
          <div class="ss-encoding-overlay hidden" id="ssEncodingOverlay">
            <span class="ss-encoding-label" id="ssEncodingLabel">Creating…</span>
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
            style="background:radial-gradient(circle at 35% 35%,${t.color},${t.bg})"
            aria-label="${t.id} theme"
          ></button>
        `).join('')}
      </div>

      <div class="ss-info-strip" id="ssInfoStrip"></div>

      <div class="ss-size-row" id="ssSizeRow">
        <button class="ss-size-btn" data-size="square" style="border-color:rgba(232,197,71,0.28);background:rgba(232,197,71,0.08);color:#E8C547;">
          <div class="ss-size-thumb-s"></div>
          <span>Square</span>
        </button>
        <button class="ss-size-btn" data-size="vertical">
          <div class="ss-size-thumb-v"></div>
          <span>Vertical</span>
        </button>
        <button class="ss-size-btn" data-size="landscape">
          <div class="ss-size-thumb-w"></div>
          <span>Wide</span>
        </button>
      </div>
      <div class="ss-actions">
        <button class="ss-action-btn" id="ssSaveBtn">
          <span class="ss-action-icon">&#8595;</span>
          <span>Save Card</span>
        </button>
        <button class="ss-action-btn" id="ssCopyTextBtn">
          <span class="ss-action-icon">&#8696;</span>
          <span>Copy Text</span>
        </button>
        <button class="ss-action-btn" id="ssBtnShareLink">
          <span class="ss-action-icon">&#8599;</span>
          <span>Share Link</span>
        </button>
      </div>
    </div>
  `;


  document.body.appendChild(backdrop);
  SS.mounted = true;

  backdrop.querySelector('#ssClose').onclick     = closeShareSheet;
  backdrop.querySelector('#ssSaveBtn').onclick    = ssSave;
  backdrop.querySelector('#ssCopyTextBtn').onclick = ssCopyText;
  backdrop.querySelector('#ssBtnShareLink').onclick = ssShareLink;
  backdrop.querySelector('#ssSizeRow').addEventListener('click', e => {
    const btn = e.target.closest('.ss-size-btn');
    if (!btn) return;
    if (SS.isEncoding) return;
    SS.size = btn.dataset.size;
    SS.posterBlob = null;
    backdrop.querySelectorAll('.ss-size-btn').forEach(b => {
      b.classList.remove('ss-size-active');
      b.style.borderColor = '';
      b.style.background  = '';
      b.style.color       = '';
    });
    btn.classList.add('ss-size-active');
    requestAnimationFrame(() => ssStartPreview());
  });

  /* Theme dots */
  backdrop.querySelector('#ssThemes').addEventListener('click', e => {
    const dot = e.target.closest('.ss-theme-dot');
    if (!dot || SS.isEncoding) return;
    SS.theme = dot.dataset.theme;
    backdrop.querySelectorAll('.ss-theme-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.theme === SS.theme);
    });
    /* Update ring accent */
    const th = SS_THEMES.find(t => t.id === SS.theme);
    const ring = document.getElementById('ssCanvasRing');
    if (ring && th) {
      ring.style.boxShadow = `0 16px 56px rgba(0,0,0,0.8),0 0 0 1px ${th.color}33`;
      ring.style.background = th.bg;
    }
    if (typeof window.gsSetTheme === 'function') window.gsSetTheme(SS.theme);
    SS.gifBlob = null;
    SS.posterBlob = null;
    requestAnimationFrame(() => ssStartPreview());
  });

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeShareSheet();
  });
  initSSSwipeClose();
}

/* ==========================================================
   CANVAS SIZE HELPER
========================================================== */
function _sizeCanvas(canvas, dpr) {
  const wrap  = canvas.parentElement;
  const maxSz = Math.min(wrap ? wrap.clientWidth : 320, 340);
  const size  = Math.max(120, maxSz);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  return size;
}

/* ==========================================================
   PREVIEW
========================================================== */
function ssStopPreview() {
  if (SS.animFrame) { cancelAnimationFrame(SS.animFrame); SS.animFrame = null; }
}

/* Preview render token — cancels stale renders */
let _ssPreviewToken = 0;

function ssStartPreview() {
  ssStopPreview();
  const canvas = document.getElementById('ssCanvas');
  const post   = SS.post;
  if (!canvas || !post) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* Size-aware preview dimensions */
  const isV = SS.size === 'vertical';
  const isL = SS.size === 'landscape';
  const maxSz = Math.min(Math.max(120, window.innerWidth * 0.68), 460);
  const dispW = isL ? maxSz       : isV ? Math.round(maxSz * (1080/1920)) : maxSz;
  const dispH = isL ? Math.round(maxSz * (608/1920)) : maxSz;
  canvas.style.width  = dispW + 'px';
  canvas.style.height = dispH + 'px';
  /* Resize ring to match canvas for smooth transition */
  const ring = document.getElementById('ssCanvasRing');
  if (ring) { ring.style.width = dispW + 'px'; ring.style.height = dispH + 'px'; }
  canvas.width  = Math.round(dispW * dpr);
  canvas.height = Math.round(dispH * dpr);

  if (SS.activeFormat === 'poster') {
    const token = ++_ssPreviewToken;
    document.fonts.ready.then(() => {
      if (token !== _ssPreviewToken) return;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      if (SS.isDuet && SS.echoPost) {
        if (typeof drawDuetPosterToCtx === 'function') {
          drawDuetPosterToCtx(ctx, dispW, dispH);
        }
      } else {
        const _draw = () => {
          if (token !== _ssPreviewToken) return;
          if (typeof window.drawPosterToCtx === 'function') {
            try { window.drawPosterToCtx(ctx, dispW, dispH, post, { design: SS.theme || 'midnight-gold', font: 'lora' }); } catch(e) { console.error('[SS poster]', e); }
          } else if (typeof window.drawPosterPreview === 'function') {
            try { window.drawPosterPreview(ctx, dispW, dispH, post); } catch(e) { console.error('[SS poster]', e); }
          } else {
            setTimeout(_draw, 100);
          }
        };
        _draw();
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
        if (typeof gsDrawDuetFrame === 'function') gsDrawDuetFrame(ctx, size, size, frame / frames);
      } else {
        if (typeof gsDrawFrame === 'function') gsDrawFrame(ctx, size, size, frame / frames, post);
      }
      frame = (frame + 1) % frames;
    }
    SS.animFrame = requestAnimationFrame(loop);
  };
  SS.animFrame = requestAnimationFrame(loop);
}

/* ==========================================================
   OPEN / CLOSE
========================================================== */
function openShareSheet(post, opts = {}) {
  if (!post) return;
  mountShareSheet();

  SS.post         = post;
  window.currentPost = post;
  SS.isDuet       = !!(opts.isDuet && opts.echoPost);
  SS.echoPost     = opts.echoPost || null;
  SS.gifBlob      = null;
  SS.posterBlob   = null;
  /* Reset size buttons */
  setTimeout(() => {
    const sizeRow = document.getElementById('ssSizeRow');
    if (sizeRow) {
      sizeRow.querySelectorAll('.ss-size-btn').forEach(b => {
        const isSquare = b.dataset.size === 'square';
        b.classList.toggle('ss-size-active', isSquare);
        b.style.borderColor = isSquare ? 'rgba(232,197,71,0.28)' : '';
        b.style.background  = isSquare ? 'rgba(232,197,71,0.08)' : '';
        b.style.color       = isSquare ? '#E8C547' : '';
      });
    }
  }, 0);
  SS.isEncoding   = false;
  SS.activeFormat = 'poster';
  SS.size         = 'square';
  SS.theme        = 'midnight-gold';

  /* Reset theme dots */
  document.querySelectorAll('.ss-theme-dot').forEach((d, i) => {
    d.classList.toggle('active', i === 0);
  });
  if (typeof window.gsSetTheme === 'function') window.gsSetTheme('midnight-gold');

  /* Reset ring */
  const ring = document.getElementById('ssCanvasRing');
  if (ring) {
    ring.style.boxShadow = '0 16px 56px rgba(0,0,0,0.8),0 0 0 1px rgba(232,197,71,0.12)';
    ring.style.background = '#0E0B1A';
  }

  /* Reset buttons */
  const lbl = document.getElementById('ssSaveBtnLabel');
  if (lbl) lbl.textContent = '↓ Save Card';

  /* Encoding overlay off */
  setSSEncoding(false);

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
    if (prevEl)  prevEl.textContent =
      (post.text||'').substring(0,48) + (post.text?.length > 48 ? '…' : '');
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
    SS.gifBlob    = null;
    SS.posterBlob = null;
    SS.isEncoding = false;
    setSSEncoding(false);
  }, 280);
}

function reopenShareSheet() {
  const backdrop = document.getElementById('shareSheetBackdrop');
  if (!backdrop) return;
  backdrop.classList.remove('ss-hidden');
  document.body.classList.add('modal-open');
  window.currentPost = SS.post;
  setSSEncoding(false);
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
      <div class="ss-song-title">${k.song || 'Unknown Song'}</div>
      <div class="ss-song-artist">${k.artist || 'Unknown Artist'}</div>
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
      <div style="font-family:'Lora',serif;font-size:0.75rem;font-weight:700;color:#FF6B9D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kP.song||'Unknown'}</div>
      <div style="font-family:'Lora',serif;font-size:0.5rem;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kP.artist||''}</div>
    </div>
    <span style="font-family:'Lora',serif;font-size:0.55rem;font-weight:700;color:rgba(232,197,71,0.50);flex-shrink:0;padding:0 4px">↔</span>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:right">
      <div style="font-family:'Lora',serif;font-size:0.75rem;font-weight:700;color:#6B8CFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kE.song||'Unknown'}</div>
      <div style="font-family:'Lora',serif;font-size:0.5rem;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kE.artist||''}</div>
    </div>
    <span class="ss-feeling-tag" style="background:${eE.bg};color:${eE.text};border:1px solid ${eE.border};flex-shrink:0;margin-left:4px">${echoPost.emotion||'Echo'}</span>
  `;
}
/* ==========================================================
   ENCODING OVERLAY
========================================================== */
function setSSEncoding(on, label = '') {
  const overlay = document.getElementById('ssEncodingOverlay');
  const lbl     = document.getElementById('ssEncodingLabel');
  const bar     = document.getElementById('ssProgressBar');
  if (overlay) overlay.classList.toggle('hidden', !on);
  if (lbl && label) lbl.textContent = label;
  if (bar && !on) bar.style.width = '0%';
  ['ssSaveBtn','ssBtnShareLink'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !!on;
  });
}

/* ==========================================================
   SAVE — download to device
========================================================== */
function ssSave() {
  if (SS.isEncoding) return;
  const fmt  = SS.activeFormat;
  const post = SS.post;
  if (fmt === 'text') {
    const lyric  = post?.text || '';
    const song   = post?.knowledge?.song   || '';
    const artist = post?.knowledge?.artist || '';
    const W = 1080, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    // Background
    ctx.fillStyle = '#07060A';
    ctx.fillRect(0, 0, W, H);
    // Gold border
    ctx.strokeStyle = 'rgba(232,197,71,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    // M logo — gold circle
    const logoSize = 72;
    const logoX = W / 2 - logoSize / 2;
    const logoY = 100;
    const lR = logoSize / 2;
    const lCx = logoX + lR;
    const lCy = logoY + lR;
    const sc = logoSize / 80;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(lCx, lCy, lR, 0, Math.PI * 2);
    ctx.fillStyle = '#E8C547';
    ctx.fill();
    // M wave path
    ctx.strokeStyle = '#07060A';
    ctx.lineWidth = 5 * sc;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lCx + (19-40)*sc, lCy + (55-40)*sc);
    ctx.lineTo(lCx + (19-40)*sc, lCy + (27-40)*sc);
    ctx.lineTo(lCx + (31-40)*sc, lCy + (44-40)*sc);
    ctx.lineTo(lCx + (40-40)*sc, lCy + (28-40)*sc);
    ctx.lineTo(lCx + (49-40)*sc, lCy + (44-40)*sc);
    ctx.lineTo(lCx + (61-40)*sc, lCy + (27-40)*sc);
    ctx.lineTo(lCx + (61-40)*sc, lCy + (55-40)*sc);
    ctx.stroke();
    ctx.restore();
    // MARGO wordmark — ghost, Lora 700
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#E8C547';
    ctx.font = '700 36px "Lora", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '8px';
    ctx.fillText('MARGO', W / 2, logoY + logoSize + 38);
    ctx.restore();
    // Divider line — very subtle
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#E8C547';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, logoY + logoSize + 62);
    ctx.lineTo(W / 2 + 80, logoY + logoSize + 62);
    ctx.stroke();
    ctx.restore();
    // Lyric text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'italic 48px "Instrument Serif", serif';
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = lyric.split(' ');
    const lines = [];
    let line = '';
    const maxW = W - 240;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lineH = 72;
    const totalH = lines.length * lineH;
    const lyricStartY = (H - totalH) / 2 + 40;
    let y = lyricStartY;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += lineH;
    }
    // Song name
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 34px "Bebas Neue", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textBaseline = 'middle';
    ctx.fillText(song ? song.toUpperCase() : '', W / 2, H - 180);
    // Artist name
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '400 28px "Lora", serif';
    ctx.letterSpacing = '0px';
    ctx.fillText(artist || '', W / 2, H - 138);
    // Divider line bottom
    ctx.strokeStyle = 'rgba(232,197,71,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, H - 108);
    ctx.lineTo(W / 2 + 120, H - 108);
    ctx.stroke();
    // trymargo.com
    ctx.fillStyle = 'rgba(232,197,71,0.6)';
    ctx.font = '400 24px "Lora", serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('trymargo.com', W / 2, H - 76);
    const _drawAndSave = () => {
      canvas.toBlob(blob => {
        const filename = (song || 'Lyric').trim().substring(0, 40) + ' — MARGO.png';
        _downloadBlob(blob, filename);
        if (typeof showToast === 'function') showToast('Text card saved ✓');
      }, 'image/png');
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(_drawAndSave);
    } else {
      _drawAndSave();
    }
    return;
  }
  // Direct download
  const theme = SS.theme || 'midnight-gold';
  const isVertical  = SS.size === 'vertical';
  const isLandscape = SS.size === 'landscape';
  const W = isLandscape ? 1920 : 1080;
  const H = isVertical  ? 1920 : (isLandscape ? 608 : 1080);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const _doSave = () => {
    try {
      if (typeof window.drawPosterToCtx === 'function') {
        window.drawPosterToCtx(ctx, W, H, post, { design: theme, font: 'lora' });
      } else if (typeof window.drawPosterPreview === 'function') {
        window.drawPosterPreview(ctx, W, H, post);
      }
      canvas.toBlob(blob => {
        if (!blob) { if (typeof showToast === 'function') showToast('Export failed'); return; }
        const filename = (post?.knowledge?.song || 'Lyric').trim().substring(0, 40) + ' — MARGO.png';
        _downloadBlob(blob, filename);
        if (typeof showToast === 'function') showToast('Card saved ✓');
      }, 'image/png');
    } catch(e) {
      console.error('[SS save]', e);
      if (typeof showToast === 'function') showToast('Export failed');
    }
  };
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(_doSave); } else { _doSave(); }
}

function ssCopyText() {
  const post   = SS.post;
  const lyric  = post?.text || '';
  const song   = post?.knowledge?.song   || '';
  const artist = post?.knowledge?.artist || '';
  const text = [
    'MARGO',
    '',
    '❝ ' + lyric + ' ❞',
    '',
    (song ? song.toUpperCase() : ''),
    (artist ? '— ' + artist : ''),
    '',
    'trymargo.com'
  ].filter(Boolean).join('\n');
  const tiktokText = (() => {
    const base = '❝ ' + lyric + ' ❞' + '\n' + (song ? song.toUpperCase() : '') + (artist ? ' — ' + artist : '') + '\n' + 'MARGO · trymargo.com';
    return base.length > 150 ? base.substring(0, 147) + '…' : base;
  })();
  navigator.clipboard.writeText(text).then(() => {
    if (typeof showToast === 'function') showToast('Copied to clipboard ✓');
  }).catch(() => {
    if (typeof showToast === 'function') showToast('Copy failed — try again');
  });
}
function ssPopulateCopyPreview() {
  const post   = SS.post;
  const lyric  = post?.text || '';
  const song   = post?.knowledge?.song   || '';
  const artist = post?.knowledge?.artist || '';
  const text = ['MARGO', '', '\u275d ' + lyric + ' \u275e', '', (song ? song.toUpperCase() : ''), (artist ? '\u2014 ' + artist : ''), '', 'trymargo.com'].filter(Boolean).join('\n');
  const el = document.getElementById('ssCopyPreview');
  if (el) el.textContent = text;
}

function ssPopulateLinkBox() {
  const post = SS.post;
  const url  = (post && post.id) ? 'https://trymargo.com/post/' + post.id : 'https://trymargo.com';
  const el = document.getElementById('ssLinkUrl');
  if (el) el.textContent = url;
}

function ssPopulateCopyPreview() {
  const post   = SS.post;
  const lyric  = post?.text || '';
  const song   = post?.knowledge?.song   || '';
  const artist = post?.knowledge?.artist || '';
  const text = ['MARGO', '', '\u275d ' + lyric + ' \u275e', '', song ? song.toUpperCase() : '', artist ? '\u2014 ' + artist : '', '', 'trymargo.com'].filter(Boolean).join('\n');
  const el = document.getElementById('ssCopyPreview');
  if (el) el.textContent = text;
}

function ssPopulateLinkBox() {
  const post = SS.post;
  const url  = (post && post.id) ? 'https://trymargo.com/post/' + post.id : 'https://trymargo.com';
  const el = document.getElementById('ssLinkUrl');
  if (el) el.textContent = url;
}

function ssShareLink() {
  const post = SS.post;
  const url  = (post && post.id) ? 'https://trymargo.com/post/' + post.id : 'https://trymargo.com';
  const lyric = (post?.text || '').substring(0, 60);
  const shareText = '“' + lyric + '” — trymargo.com';
  if (navigator.share) {
    navigator.share({ title: 'MARGO', text: shareText, url }).catch(() => {});
    return;
  }
  // Desktop fallback
  const existing = document.getElementById('ssSharePopup');
  if (existing) { existing.remove(); return; }
  const popup = document.createElement('div');
  popup.id = 'ssSharePopup';
  popup.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:16px;z-index:99999;display:flex;flex-direction:column;gap:10px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
  const encoded = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);
  popup.innerHTML = `
    <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Share via</div>
    <a href="https://x.com/intent/tweet?url=${encoded}&text=${encodedText}" target="_blank" style="color:#fff;text-decoration:none;padding:10px 14px;background:rgba(255,255,255,0.06);border-radius:10px;font-size:0.9rem;">𝕏 Twitter / X</a>
    <a href="https://wa.me/?text=${encodedText}%20${encoded}" target="_blank" style="color:#fff;text-decoration:none;padding:10px 14px;background:rgba(255,255,255,0.06);border-radius:10px;font-size:0.9rem;">&#x1F4AC; WhatsApp</a>
    <a href="mailto:?subject=Lyric on MARGO&body=${encodedText}%0A%0A${encoded}" style="color:#fff;text-decoration:none;padding:10px 14px;background:rgba(255,255,255,0.06);border-radius:10px;font-size:0.9rem;">&#x2709;&#xFE0F; Email</a>
    <button onclick="navigator.clipboard.writeText('${url}').then(()=>{document.getElementById('ssSharePopup').remove();typeof showToast==='function'&&showToast('Link copied ✓')})" style="color:#fff;background:rgba(232,197,71,0.15);border:1px solid rgba(232,197,71,0.3);border-radius:10px;padding:10px 14px;font-size:0.9rem;cursor:pointer;text-align:left;">&#x2698; Copy link</button>
    <button onclick="document.getElementById('ssSharePopup').remove()" style="color:rgba(255,255,255,0.4);background:none;border:none;padding:6px;font-size:0.8rem;cursor:pointer;">Cancel</button>
  `;
  document.body.appendChild(popup);
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

/* ==========================================================
   SHARE TO — opens PlatformPicker
========================================================== */
async function ssShareTo() {
  if (SS.isEncoding) return;

  /* Generate blob if not cached */
  if (!SS.posterBlob) await ssGeneratePoster();


  const blob     = SS.posterBlob;
  const ext      = 'png';
  const mime     = 'image/png';
  const fileName = _songFilename(SS.post, ext);
  const lyric    = SS.post?.text?.substring(0, 60) || '';
  const shareText = `"${lyric}" — trymargo.com`;

  /* Tier 1 — native share with file (mobile, modern desktop) */
  if (blob && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: mime });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'MARGO', text: shareText, files: [file] });
        return;
      } catch(e) { if (e.name === 'AbortError') return; }
    }
  }

  /* Tier 2 — native share without file (desktop Chrome/Edge/Safari — opens OS share with email, nearby, etc) */
  if (navigator.share) {
    try {
      await navigator.share({ title: 'MARGO', text: shareText, url: 'https://trymargo.com' });
      return;
    } catch(e) { if (e.name === 'AbortError') return; }
  }

  /* Tier 3 — no Web Share API support — open PlatformPicker */
  if (blob && typeof window.PlatformPicker?.pick === 'function') {
    window.PlatformPicker.pick({
      format: 'poster',
      blob,
      post: SS.post,
    });
    return;
  }

  /* Last resort — download */
  if (blob) {
    _downloadBlob(blob, fileName);
    if (typeof showToast === 'function') showToast('Saved to device ✓');
  }
}

/* ==========================================================
   GENERATE POSTER
========================================================== */
async function ssGeneratePoster() {
  if (SS.posterBlob) return;
  if (SS.isEncoding) return;
  SS.isEncoding = true;
  setSSEncoding(true, 'Generating…');
  try {
    const _isV = SS.size === 'vertical';
    const _isL = SS.size === 'landscape';
    const PW   = _isL ? 1920 : 1080;
    const PH   = _isV ? 1920 : (_isL ? 608 : 1080);
    const off = document.createElement('canvas');
    off.width = PW; off.height = PH;
    const ctx = off.getContext('2d');
    await document.fonts.ready;
    if (SS.isDuet && SS.echoPost) {
      if (typeof drawDuetPosterToCtx === 'function') drawDuetPosterToCtx(ctx, PW, PH);
    } else {
      if (typeof window.drawPosterToCtx === 'function') {
        window.drawPosterToCtx(ctx, PW, PH, SS.post, { design: SS.theme || 'midnight-gold', font: 'lora' });
      }
    }
    SS.posterBlob = await new Promise((res, rej) => {
      off.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png');
    });
  } catch(err) {
    console.error('[SS] poster error:', err);
    if (typeof showToast === 'function') showToast('Could not generate poster');
  } finally {
    SS.isEncoding = false;
    setSSEncoding(false);
  }
}

/* ==========================================================
   GENERATE GIF
========================================================== */
async function ssGenerateGif() {
  if (SS.gifBlob) return;
  if (typeof gsExportForShareSheet !== 'function') {
    if (typeof showToast === 'function') showToast('Open Studio to export GIF');
    ssOpenStudio();
    return;
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
  } catch(err) {
    console.error('[SS] GIF error:', err);
    SS.gifBlob = null;
    if (typeof showToast === 'function') showToast('GIF failed — try Studio');
  } finally {
    SS.isEncoding = false;
    setSSEncoding(false);
  }
}

/* ==========================================================
   STUDIO
========================================================== */
function ssOpenStudio() {
  if (SS.isEncoding) return;
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

/* ==========================================================
   SWIPE TO CLOSE
========================================================== */
function initSSSwipeClose() {
  const sheet  = document.getElementById('shareSheet');
  const handle = document.getElementById('ssDragHandle');
  if (!sheet || !handle) return;
  let startY = 0, currentY = 0, dragging = false;
  const onStart = e => {
    startY = e.touches?.[0].clientY ?? e.clientY;
    currentY = startY; dragging = true;
    sheet.style.transition = 'none';
  };
  const onMove = e => {
    if (!dragging) return;
    currentY = e.touches?.[0].clientY ?? e.clientY;
    const dy = Math.max(0, currentY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    sheet.style.opacity   = String(1 - dy / 300);
  };
  const onEnd = () => {
    if (!dragging) return; dragging = false;
    sheet.style.transition = '';
    if (currentY - startY > 80) closeShareSheet();
    else { sheet.style.transform = ''; sheet.style.opacity = ''; }
  };
  handle.addEventListener('touchstart', onStart, { passive:true });
  handle.addEventListener('touchmove',  onMove,  { passive:true });
  handle.addEventListener('touchend',   onEnd);
}

/* ==========================================================
   EXPORTS
========================================================== */
window.openShareSheet   = openShareSheet;
window.closeShareSheet  = closeShareSheet;
window.reopenShareSheet = reopenShareSheet;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountShareSheet);
} else {
  mountShareSheet();
}
