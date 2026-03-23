/* ============================================================
   MARGO — js/share-sheet.js
   v1.4 — Duet preview + export now correctly routed:
          • ssStartPreview  → gsDrawDuetFrame  when isDuet + GIF
          • ssStartPreview  → drawDuetPosterToCtx when isDuet + Poster
          • ssGenerateGif   → gsExportForShareSheet (duet-mode.js
                               already branches on isDuetMode())
          • ssGeneratePoster→ drawDuetPosterToCtx at 1080×1080
          • Info strip shows both songs in duet mode
          • Header title + lyric preview updated for duet
   z-index kept at 600 (duet-sheet uses 700, share-sheet
   is opened from feed so 600 is correct here).
   ============================================================ */

window._shareSheet = window._shareSheet || {
  post:         null,
  echoPost:     null,
  isDuet:       false,
  activeTab:    'gif',
  gifBlob:      null,
  posterBlob:   null,
  isEncoding:   false,
  previewTimer: null,
  animFrame:    null,
  mounted:      false,
};
const SS = window._shareSheet;

/* ── Styles ── */
function injectShareSheetStyles() {
  if (document.getElementById('shareSheetStyles')) return;
  const s = document.createElement('style');
  s.id = 'shareSheetStyles';
  s.textContent = `
    #shareSheetBackdrop {
      position:fixed;inset:0;z-index:600;
      background:rgba(0,0,0,0.75);
      backdrop-filter:blur(14px) saturate(0.7);
      -webkit-backdrop-filter:blur(14px) saturate(0.7);
      display:flex;align-items:flex-end;justify-content:center;
      padding:0;
      animation:ssBackdropIn 0.28s ease;
    }
    @keyframes ssBackdropIn{from{opacity:0}to{opacity:1}}
    #shareSheetBackdrop.ss-hidden{display:none!important}

    @media(min-width:560px){
      #shareSheetBackdrop{align-items:center;padding:24px}
    }

    #shareSheet {
      width:100%;max-width:560px;
      background:#0f0e12;
      border:1px solid rgba(255,255,255,0.07);
      border-bottom:none;border-radius:28px 28px 0 0;
      overflow:hidden;display:flex;flex-direction:column;
      max-height:94dvh;
      box-shadow:0 -8px 60px rgba(0,0,0,0.8),0 0 0 1px rgba(232,197,71,0.05) inset;
      animation:ssSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);
      touch-action:pan-y;
    }
    @media(min-width:560px){
      #shareSheet{
        border-radius:24px;border-bottom:1px solid rgba(255,255,255,0.07);
        max-height:88dvh;animation:ssFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes ssSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes ssFadeUp{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    #shareSheet.ss-exit{animation:ssSlideDown 0.28s cubic-bezier(0.4,0,1,1) forwards}
    @keyframes ssSlideDown{to{transform:translateY(80px);opacity:0}}

    .ss-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);margin:12px auto 0;flex-shrink:0}

    .ss-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0;flex-shrink:0}
    .ss-title-wrap{display:flex;flex-direction:column;gap:2px}
    .ss-title{
      font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;
      letter-spacing:2px;text-transform:uppercase;
      background:linear-gradient(90deg,#fff 20%,#E8C547 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    .ss-lyric-preview{
      font-family:'DM Serif Display',serif;font-style:italic;
      font-size:0.78rem;color:rgba(255,255,255,0.38);
      line-height:1.4;max-width:260px;
      overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    }
    .ss-duet-badge{
      display:none;align-items:center;gap:5px;margin-top:3px;
      font-family:'Space Mono',monospace;font-size:0.44rem;font-weight:700;
      letter-spacing:1.5px;text-transform:uppercase;
      padding:3px 9px;border-radius:20px;
      background:rgba(232,197,71,0.09);border:1px solid rgba(232,197,71,0.25);
      color:#E8C547;
    }
    .ss-duet-badge.visible{display:inline-flex}
    .ss-duet-badge-dot{width:5px;height:5px;border-radius:50%;background:#E8C547;opacity:0.8}

    .ss-close{
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.38);width:30px;height:30px;
      border-radius:50%;font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.18s;flex-shrink:0;
    }
    .ss-close:hover{background:rgba(255,255,255,0.12);color:#fff}

    .ss-tabs{display:flex;gap:6px;padding:14px 18px 0;flex-shrink:0}
    .ss-tab{
      flex:1;padding:10px 8px;border-radius:12px;
      border:1px solid rgba(255,255,255,0.08);
      background:rgba(255,255,255,0.03);
      color:rgba(255,255,255,0.35);
      font-family:'Space Mono',monospace;font-size:0.58rem;
      font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
      cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
      display:flex;align-items:center;justify-content:center;gap:6px;
    }
    .ss-tab:hover{color:rgba(255,255,255,0.65);border-color:rgba(255,255,255,0.16)}
    .ss-tab.active{background:rgba(232,197,71,0.1);border-color:rgba(232,197,71,0.4);color:#E8C547}
    .ss-tab-dot{
      width:6px;height:6px;border-radius:50%;background:currentColor;opacity:0.7;
      animation:ssDotPulse 1.8s ease-in-out infinite;
    }
    @keyframes ssDotPulse{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}

    .ss-canvas-wrap{
      padding:14px 18px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
    }
    .ss-canvas-ring{
      position:relative;border-radius:16px;overflow:hidden;
      box-shadow:0 12px 48px rgba(0,0,0,0.7),0 0 0 1px rgba(232,197,71,0.15);
      background:#0B0B0D;
    }
    #ssCanvas{display:block;border-radius:16px}
    .ss-encoding-overlay{
      position:absolute;inset:0;border-radius:16px;
      background:rgba(11,11,13,0.85);backdrop-filter:blur(4px);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
    }
    .ss-encoding-overlay.hidden{display:none}
    .ss-encoding-label{font-family:'Space Mono',monospace;font-size:0.6rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5)}
    .ss-progress-bar-wrap{width:120px;height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden}
    .ss-progress-bar{height:100%;border-radius:2px;background:#E8C547;transition:width 0.1s linear;width:0%}

    .ss-info-strip{display:flex;align-items:center;gap:10px;padding:0 18px 12px;flex-shrink:0}
    .ss-song-thumb{width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.1)}
    .ss-song-info{flex:1;min-width:0}
    .ss-song-title{font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ss-song-artist{font-family:'Space Mono',monospace;font-size:0.58rem;color:rgba(255,255,255,0.38);letter-spacing:0.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ss-feeling-tag{font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:3px 9px;border-radius:20px;flex-shrink:0}

    .ss-actions{display:flex;gap:8px;padding:0 18px 10px;flex-shrink:0}
    .ss-btn{
      flex:1;padding:13px 10px;border-radius:12px;
      display:flex;flex-direction:column;align-items:center;gap:3px;
      cursor:pointer;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
      border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.04);
      color:rgba(255,255,255,0.7);
      font-family:'Space Mono',monospace;
      font-size:0.52rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;
    }
    .ss-btn:hover{border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#fff;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.4)}
    .ss-btn:active{transform:scale(0.96)}
    .ss-btn-icon{font-size:1.1rem;line-height:1}
    .ss-btn-download{background:rgba(232,197,71,0.1);border-color:rgba(232,197,71,0.35);color:#E8C547}
    .ss-btn-download:hover{background:rgba(232,197,71,0.18);border-color:rgba(232,197,71,0.6);color:#fff;box-shadow:0 6px 20px rgba(232,197,71,0.2)}
    .ss-btn-share{background:rgba(107,140,255,0.1);border-color:rgba(107,140,255,0.3);color:#6B8CFF}
    .ss-btn-share:hover{background:rgba(107,140,255,0.18);border-color:rgba(107,140,255,0.55);color:#fff}
    .ss-btn-studio{border-color:rgba(255,255,255,0.1);flex:0 0 auto;padding:13px 14px}

    .ss-customize-strip{padding:4px 18px 20px;flex-shrink:0}
    .ss-customize-btn{
      width:100%;padding:12px;background:none;border:1px dashed rgba(255,255,255,0.1);
      border-radius:12px;color:rgba(255,255,255,0.28);
      font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;
      text-transform:uppercase;letter-spacing:1.5px;cursor:pointer;transition:all 0.2s;
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    .ss-customize-btn:hover{border-color:rgba(232,197,71,0.3);color:rgba(232,197,71,0.7);background:rgba(232,197,71,0.03)}
    .ss-customize-btn:hover .ss-customize-arrow{transform:translateX(3px)}
    .ss-customize-arrow{transition:transform 0.18s;display:inline-block}
  `;
  document.head.appendChild(s);
}

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
const SS_FEELING_DEFAULT = { bg:'rgba(232,197,71,0.11)', text:'#E8C547', border:'rgba(232,197,71,0.25)' };

/* ══════════════════════════════════════════════════════════
   CANVAS PREVIEW
   KEY FIX: isDuet branches to duet-mode.js renderers
══════════════════════════════════════════════════════════ */

function ssStopPreview() {
  if (SS.animFrame) { cancelAnimationFrame(SS.animFrame); SS.animFrame = null; }
  clearTimeout(SS.previewTimer);
}

function ssStartPreview(canvas) {
  ssStopPreview();
  const post = SS.post;
  if (!canvas || !post) return;

  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  const wrap  = canvas.parentElement;
  const maxSz = Math.min(wrap ? wrap.clientWidth : 320, 320);
  const size  = Math.max(120, maxSz);

  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);

  /* ══ DUET MODE — route to duet-mode.js ══ */
  if (SS.isDuet && SS.echoPost) {
    if (SS.activeTab === 'poster') {
      document.fonts.ready.then(() => {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        if (typeof drawDuetPosterToCtx === 'function') {
          drawDuetPosterToCtx(ctx, size, size);
        } else {
          ssDrawFallback(ctx, size, size, post);
        }
      });
    } else {
      /* Animated duet GIF preview */
      let frame = 0, last = 0;
      const delay = 70, frames = 24;
      const loop = (ts) => {
        if (ts - last >= delay) {
          last = ts;
          const ctx = canvas.getContext('2d');
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          if (typeof gsDrawDuetFrame === 'function') {
            gsDrawDuetFrame(ctx, size, size, frame / frames);
          } else {
            ssDrawFallback(ctx, size, size, post);
          }
          frame = (frame + 1) % frames;
        }
        SS.animFrame = requestAnimationFrame(loop);
      };
      SS.animFrame = requestAnimationFrame(loop);
    }
    return;
  }

  /* ══ SINGLE POST MODE (unchanged) ══ */
  if (SS.activeTab === 'poster') {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    document.fonts.ready.then(() => {
      if (typeof window.drawPosterPreview === 'function') {
        window.drawPosterPreview(ctx, size, size, post);
      } else {
        ssDrawFallback(ctx, size, size, post);
      }
    });
  } else {
    let frame = 0, last = 0;
    const delay = 70, frames = 24;
    const loop = (ts) => {
      if (ts - last >= delay) {
        last = ts;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        window.currentPost = post;
        if (typeof gsDrawFrame === 'function') {
          gsDrawFrame(ctx, size, size, frame / frames);
        } else {
          ssDrawFallback(ctx, size, size, post);
        }
        frame = (frame + 1) % frames;
      }
      SS.animFrame = requestAnimationFrame(loop);
    };
    SS.animFrame = requestAnimationFrame(loop);
  }
}

/* ── Fallback renderer ── */
function ssDrawFallback(ctx, W, H, post) {
  if (!post) return;
  const feeling = post.emotion || post.feeling || 'Nostalgia';
  const cfg     = SS_FEELING_CFG[feeling] || SS_FEELING_DEFAULT;
  const k       = post.knowledge || {};

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B0B0D'); g.addColorStop(0.5, '#1a1410'); g.addColorStop(1, '#0B0B0D');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cfg.text; ctx.fillRect(0, 0, W, 2);

  // M circle + MARGO logo
  const _r = Math.round(W*0.028), _pad = Math.round(W*0.035);
  const _cx = _pad + _r, _cy = _pad + _r, _sc = _r/40;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.shadowColor="rgba(232,197,71,0.6)"; ctx.shadowBlur=Math.round(W*0.016);
  ctx.beginPath(); ctx.arc(_cx,_cy,_r,0,Math.PI*2);
  ctx.fillStyle="#E8C547"; ctx.fill(); ctx.shadowBlur=0;
  ctx.strokeStyle="#0B0B0D"; ctx.lineWidth=5*_sc; ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath();
  ctx.moveTo(_cx+(17-40)*_sc,_cy+(57-40)*_sc); ctx.lineTo(_cx+(17-40)*_sc,_cy+(27-40)*_sc);
  ctx.lineTo(_cx+(29-40)*_sc,_cy+(45-40)*_sc); ctx.lineTo(_cx+(40-40)*_sc,_cy+(26-40)*_sc);
  ctx.lineTo(_cx+(51-40)*_sc,_cy+(45-40)*_sc); ctx.lineTo(_cx+(63-40)*_sc,_cy+(27-40)*_sc);
  ctx.lineTo(_cx+(63-40)*_sc,_cy+(57-40)*_sc); ctx.stroke();
  ctx.fillStyle="#0B0B0D"; ctx.globalAlpha=0.55;
  const _dw=10*_sc,_dh=3.5*_sc;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(_cx+(35-40)*_sc,_cy+(60-40)*_sc,_dw,_dh,_dh/2);
  else ctx.rect(_cx+(35-40)*_sc,_cy+(60-40)*_sc,_dw,_dh);
  ctx.fillStyle="#E8C547"; ctx.globalAlpha=0.35;
  const _sz=Math.max(10,Math.round(W*0.028));
  ctx.globalAlpha = 0.35;
  ctx.font="800 "+_sz+"px Syne, Arial Black, sans-serif";
  ctx.fillStyle="#E8C547"; ctx.globalAlpha=1;
  ctx.textBaseline="middle"; ctx.textAlign="left";
  ctx.fillText("MARGO", _cx+_r+Math.round(W*0.022), _cy);
  ctx.restore();
  const lyric = (post.text || '').substring(0, 120);
  ctx.fillStyle = '#F0F0F0'; ctx.textAlign = 'center';
  const sz = lyric.length < 50 ? W*0.065 : W*0.048;
  ctx.font = `italic 600 ${sz}px 'DM Serif Display',serif`;
  ssWrapText(ctx, lyric, W/2, H*0.44, W*0.84, sz*1.25);

  ctx.fillStyle = cfg.text;
  ctx.font = `700 ${W*0.038}px 'Space Mono',monospace`;
  ctx.fillText((k.song||'').substring(0,28), W/2, H*0.76);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `400 ${W*0.028}px 'Space Mono',monospace`;
  ctx.fillText((k.artist||'').substring(0,32), W/2, H*0.76 + W*0.048);
  ctx.fillStyle = 'rgba(232,197,71,0.5)';
  ctx.font = `700 ${W*0.026}px 'Space Mono',monospace`;
  ctx.fillText('trymargo.com', W/2, H*0.92);
}

function ssWrapText(ctx, text, x, cy, maxW, lineH) {
  const words = text.split(' '); let line = ''; const lines = [];
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w+' '; }
    else line = t;
  });
  if (line.trim()) lines.push(line.trim());
  const startY = cy - ((lines.length-1)*lineH)/2;
  lines.forEach((l,i) => ctx.fillText(l, x, startY + i*lineH));
}

/* ══════════════════════════════════════════════════════════
   MOUNT SHEET DOM
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
        <div class="ss-title-wrap">
          <span class="ss-title" id="ssTitle">Share</span>
          <span class="ss-lyric-preview" id="ssLyricPreview"></span>
          <span class="ss-duet-badge" id="ssDuetBadge">
            <span class="ss-duet-badge-dot"></span>LYRIC BACK
          </span>
        </div>
        <button class="ss-close" id="ssClose" aria-label="Close">×</button>
      </div>
      <div class="ss-tabs">
        <button class="ss-tab active" data-sstab="gif" id="ssTabGif">
          <span class="ss-tab-dot"></span>GIF
        </button>
        <button class="ss-tab" data-sstab="poster" id="ssTabPoster">
          <span class="ss-tab-dot" style="animation-delay:.4s"></span>Poster
        </button>
      </div>
      <div class="ss-canvas-wrap">
        <div class="ss-canvas-ring" id="ssCanvasRing">
          <canvas id="ssCanvas"></canvas>
          <div class="ss-encoding-overlay hidden" id="ssEncodingOverlay">
            <span class="ss-encoding-label" id="ssEncodingLabel">Encoding…</span>
            <div class="ss-progress-bar-wrap">
              <div class="ss-progress-bar" id="ssProgressBar"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="ss-info-strip" id="ssInfoStrip"></div>
      <div class="ss-actions">
        <button class="ss-btn ss-btn-download" id="ssBtnDownload">
          <span class="ss-btn-icon">↓</span>
          <span id="ssBtnDownloadLabel">Download GIF</span>
        </button>
        <button class="ss-btn ss-btn-share" id="ssBtnShare">
          <span class="ss-btn-icon">↗</span>
          <span>Share</span>
        </button>
        <button class="ss-btn ss-btn-studio" id="ssBtnStudio" title="Open full studio">
          <span class="ss-btn-icon">✦</span>
          <span>Studio</span>
        </button>
      </div>
      <div class="ss-customize-strip">
        <button class="ss-customize-btn" id="ssCustomizeBtn">
          Customize in Studio <span class="ss-customize-arrow">→</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  SS.mounted = true;

  backdrop.querySelector('#ssClose').onclick       = closeShareSheet;
  backdrop.querySelector('#ssTabGif').onclick      = () => switchSSTab('gif');
  backdrop.querySelector('#ssTabPoster').onclick   = () => switchSSTab('poster');
  backdrop.querySelector('#ssBtnDownload').onclick = ssDownload;
  backdrop.querySelector('#ssBtnShare').onclick    = ssShare;
  backdrop.querySelector('#ssBtnStudio').onclick   = ssOpenStudio;
  backdrop.querySelector('#ssCustomizeBtn').onclick= ssOpenStudio;

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeShareSheet(); });
  initSSSwipeClose();
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
══════════════════════════════════════════════════════════ */
function openShareSheet(post, opts = {}) {
  if (!post) return;
  mountShareSheet();

  SS.post       = post;
  window.currentPost = post;
  SS.isDuet     = !!(opts.isDuet && opts.echoPost);
  SS.echoPost   = opts.echoPost || null;
  SS.gifBlob    = null;
  SS.posterBlob = null;
  SS.activeTab  = 'gif';

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

  document.getElementById('ssTabGif')?.classList.add('active');
  document.getElementById('ssTabPoster')?.classList.remove('active');
  const lbl = document.getElementById('ssBtnDownloadLabel');
  if (lbl) lbl.textContent = 'Download GIF';

  const backdrop = document.getElementById('shareSheetBackdrop');
  backdrop.classList.remove('ss-hidden');
  document.body.classList.add('modal-open');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ssStartPreview(document.getElementById('ssCanvas'));
    });
  });
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
  }, 300);
}

function reopenShareSheet() {
  const backdrop = document.getElementById('shareSheetBackdrop');
  if (!backdrop) return;
  backdrop.classList.remove('ss-hidden');
  document.body.classList.add('modal-open');
  window.currentPost = SS.post;
  requestAnimationFrame(() => ssStartPreview(document.getElementById('ssCanvas')));
}
window.reopenShareSheet = reopenShareSheet;

function switchSSTab(tab) {
  if (SS.activeTab === tab) return;
  SS.activeTab = tab; SS.gifBlob = null; SS.posterBlob = null;
  document.querySelectorAll('.ss-tab').forEach(t => { t.classList.toggle('active', t.dataset.sstab === tab); });
  const label = document.getElementById('ssBtnDownloadLabel');
  if (label) label.textContent = tab === 'gif' ? 'Download GIF' : 'Download Poster';
  ssStopPreview();
  requestAnimationFrame(() => ssStartPreview(document.getElementById('ssCanvas')));
}

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
    <span style="font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;color:rgba(232,197,71,0.55);flex-shrink:0;padding:0 4px">↔</span>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:right">
      <div style="font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:700;color:#6B8CFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kE.song||'Unknown'}</div>
      <div style="font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kE.artist||''}</div>
    </div>
    <span class="ss-feeling-tag" style="background:${eE.bg};color:${eE.text};border:1px solid ${eE.border};flex-shrink:0;margin-left:4px">${echoPost.emotion||'Echo'}</span>
  `;
}

/* ══════════════════════════════════════════════════════════
   DOWNLOAD / SHARE
══════════════════════════════════════════════════════════ */
async function ssDownload() {
  if (SS.isEncoding) return;
  if (SS.activeTab === 'poster') {
    await ssGeneratePoster();
    if (!SS.posterBlob) return;
    const url = URL.createObjectURL(SS.posterBlob);
    const a = document.createElement('a');
    a.href = url; a.download = `margo-${SS.isDuet?'duet-':''}poster-${Date.now()}.png`;
    a.style.display = 'none'; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    if (typeof showToast === 'function') showToast('Poster saved ✓');
  } else {
    await ssGenerateGif();
    if (!SS.gifBlob) return;
    const url = URL.createObjectURL(SS.gifBlob);
    const a = document.createElement('a');
    a.href = url; a.download = `margo-${SS.isDuet?'duet-':''}gif-${Date.now()}.gif`;
    a.style.display = 'none'; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    if (typeof showToast === 'function') showToast('GIF saved ✓');
  }
}

async function ssShare() {
  const isGif = SS.activeTab === 'gif';
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  if (typeof showToast === 'function') showToast('Saved to device ✓');
}

/* ── Poster generation — KEY FIX: duet uses drawDuetPosterToCtx ── */
async function ssGeneratePoster() {
  if (SS.posterBlob) return;
  SS.isEncoding = true;
  setSSEncoding(true, SS.isDuet ? 'Generating duet poster…' : 'Generating poster…');
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = 1080; offscreen.height = 1080;
    const ctx = offscreen.getContext('2d');
    await document.fonts.ready;
    if (SS.isDuet && SS.echoPost) {
      if (typeof drawDuetPosterToCtx === 'function') {
        drawDuetPosterToCtx(ctx, 1080, 1080);
      } else {
        ssDrawFallback(ctx, 1080, 1080, SS.post);
      }
    } else {
      if (typeof window.drawPosterPreview === 'function') {
        window.drawPosterPreview(ctx, 1080, 1080, SS.post);
      } else {
        ssDrawFallback(ctx, 1080, 1080, SS.post);
      }
    }
    SS.posterBlob = await new Promise((res,rej) => {
      offscreen.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png');
    });
  } catch(err) {
    console.error('[SS] poster gen error:', err);
    if (typeof showToast === 'function') showToast('Could not generate poster');
  } finally {
    SS.isEncoding = false; setSSEncoding(false);
  }
}

/* ── GIF generation — KEY FIX: gsExportForShareSheet already
   calls isDuetMode() internally and branches to gsDrawDuetFrame ── */
async function ssGenerateGif() {
  if (SS.gifBlob) return;
  if (typeof gsExportForShareSheet !== 'function') {
    if (typeof showToast === 'function') showToast('Open Studio to export GIF');
    ssOpenStudio(); return;
  }
  SS.isEncoding = true;
  setSSEncoding(true, SS.isDuet ? 'Creating duet GIF…' : 'Creating GIF…');
  try {
    window.currentPost = SS.post;
    SS.gifBlob = await gsExportForShareSheet((pct) => {
      const bar = document.getElementById('ssProgressBar');
      if (bar) bar.style.width = (pct*100) + '%';
      const lbl = document.getElementById('ssEncodingLabel');
      if (lbl) lbl.textContent = `${SS.isDuet?'Duet GIF':'Creating GIF'}… ${Math.round(pct*100)}%`;
    });
    if (typeof showToast === 'function') showToast(SS.isDuet ? 'Duet GIF ready ✓' : 'GIF ready ✓');
  } catch(err) {
    console.error('[SS] GIF gen error:', err);
    if (typeof showToast === 'function') showToast('GIF failed — try Studio');
  } finally {
    SS.isEncoding = false; setSSEncoding(false);
  }
}

function setSSEncoding(on, label='') {
  const overlay = document.getElementById('ssEncodingOverlay');
  const lbl     = document.getElementById('ssEncodingLabel');
  const bar     = document.getElementById('ssProgressBar');
  if (overlay) overlay.classList.toggle('hidden', !on);
  if (lbl && label) lbl.textContent = label;
  if (bar && !on) bar.style.width = '0%';
  ['ssBtnDownload','ssBtnShare','ssBtnStudio','ssCustomizeBtn'].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = on;
  });
}

function ssOpenStudio() {
  ssStopPreview();
  const backdrop = document.getElementById('shareSheetBackdrop');
  if (backdrop) backdrop.classList.add('ss-hidden');
  window.currentPost = SS.post;
  if (SS.activeTab === 'poster') {
    if (typeof openPosterStudio === 'function') openPosterStudio(SS.post);
    else if (typeof openStudio === 'function') openStudio(SS.post);
  } else {
    if (typeof openGifStudio === 'function') openGifStudio();
  }
}

function initSSSwipeClose() {
  const sheet  = document.getElementById('shareSheet');
  const handle = document.getElementById('ssDragHandle');
  if (!sheet || !handle) return;
  let startY = 0, currentY = 0, dragging = false;
  const onStart = (e) => { startY = e.touches ? e.touches[0].clientY : e.clientY; currentY = startY; dragging = true; sheet.style.transition = 'none'; };
  const onMove  = (e) => {
    if (!dragging) return;
    currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = Math.max(0, currentY - startY);
    sheet.style.transform = `translateY(${dy}px)`; sheet.style.opacity = String(1 - dy/300);
  };
  const onEnd = () => {
    if (!dragging) return; dragging = false; sheet.style.transition = '';
    if (currentY - startY > 80) { closeShareSheet(); }
    else { sheet.style.transform = ''; sheet.style.opacity = ''; }
  };
  handle.addEventListener('touchstart', onStart, { passive:true });
  handle.addEventListener('touchmove',  onMove,  { passive:true });
  handle.addEventListener('touchend',   onEnd);
}

window.openShareSheet   = openShareSheet;
window.closeShareSheet  = closeShareSheet;
window.reopenShareSheet = reopenShareSheet;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountShareSheet);
} else {
  mountShareSheet();
}
