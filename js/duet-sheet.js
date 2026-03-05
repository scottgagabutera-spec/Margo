/* ============================================================
   MARGO — js/duet-sheet.js
   v1.0 — Duet Conversation Card
   Triggered by GIF · POSTER on any Lyric Back echo card.
   Shows a cinematic preview of both lyrics together,
   then routes to the regular share sheet as GIF or Poster.
   Completely self-contained — touches no other file at runtime.
   ============================================================ */

(function () {

/* ── State ── */
const DS = {
  parentPost: null,
  echoPost:   null,
  mounted:    false,
};

/* ── Vibe colours (self-contained copy) ── */
const DS_VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

/* ══════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════ */
function injectDuetStyles() {
  if (document.getElementById('duetSheetStyles')) return;
  const s = document.createElement('style');
  s.id = 'duetSheetStyles';
  s.textContent = `
    #duetBackdrop {
      position:fixed;inset:0;z-index:700;
      background:rgba(0,0,0,0.88);
      backdrop-filter:blur(20px) saturate(0.6);
      -webkit-backdrop-filter:blur(20px) saturate(0.6);
      display:flex;align-items:flex-end;justify-content:center;
      animation:dsBackdropIn 0.25s ease;
    }
    #duetBackdrop.ds-hidden { display:none!important; }
    @keyframes dsBackdropIn { from{opacity:0} to{opacity:1} }

    @media(min-width:560px) {
      #duetBackdrop { align-items:center; padding:24px; }
    }

    #duetSheet {
      width:100%; max-width:520px;
      background:#0c0b10;
      border:1px solid rgba(255,255,255,0.07);
      border-bottom:none; border-radius:28px 28px 0 0;
      overflow:hidden; display:flex; flex-direction:column;
      max-height:96dvh;
      box-shadow:0 -12px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(232,197,71,0.06) inset;
      animation:dsSlideUp 0.42s cubic-bezier(0.16,1,0.3,1);
    }
    @media(min-width:560px) {
      #duetSheet {
        border-radius:24px; border-bottom:1px solid rgba(255,255,255,0.07);
        max-height:92dvh; animation:dsFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes dsSlideUp { from{transform:translateY(70px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes dsFadeUp  { from{transform:translateY(24px) scale(0.97);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }

    .ds-handle {
      width:36px; height:4px; border-radius:2px;
      background:rgba(255,255,255,0.1); margin:12px auto 0; flex-shrink:0;
    }

    .ds-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px 0; flex-shrink:0;
    }
    .ds-title {
      font-family:'Syne',sans-serif; font-weight:800; font-size:0.88rem;
      letter-spacing:2.5px; text-transform:uppercase;
      background:linear-gradient(90deg,#fff 20%,#E8C547 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    }
    .ds-close {
      width:30px; height:30px; border-radius:50%;
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.4); font-size:1.1rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center; transition:all 0.18s;
    }
    .ds-close:hover { background:rgba(255,255,255,0.12); color:#fff; }

    /* ── Canvas wrap ── */
    .ds-canvas-wrap {
      padding:16px 18px 12px;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .ds-canvas-ring {
      position:relative; border-radius:18px; overflow:hidden;
      box-shadow:0 16px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,197,71,0.12);
    }
    #duetCanvas { display:block; border-radius:18px; }

    /* ── Meta strip ── */
    .ds-meta {
      display:flex; align-items:center; gap:10px;
      padding:0 18px 14px; flex-shrink:0;
    }
    .ds-meta-divider {
      width:1px; height:28px; background:rgba(255,255,255,0.1); flex-shrink:0;
    }
    .ds-meta-side { flex:1; min-width:0; }
    .ds-meta-label {
      font-family:'Space Mono',monospace; font-size:0.42rem; font-weight:700;
      color:rgba(255,255,255,0.25); text-transform:uppercase; letter-spacing:2px;
      margin-bottom:2px;
    }
    .ds-meta-song {
      font-family:'DM Sans',sans-serif; font-size:0.72rem; font-weight:700;
      color:rgba(255,255,255,0.75); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .ds-meta-artist {
      font-family:'Space Mono',monospace; font-size:0.52rem;
      color:rgba(255,255,255,0.3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }

    /* ── Action buttons ── */
    .ds-actions {
      display:flex; gap:10px; padding:0 18px 22px; flex-shrink:0;
    }
    .ds-btn {
      flex:1; padding:15px 10px; border-radius:14px;
      display:flex; flex-direction:column; align-items:center; gap:4px;
      cursor:pointer; transition:all 0.22s cubic-bezier(0.16,1,0.3,1);
      font-family:'Space Mono',monospace; font-size:0.55rem;
      font-weight:700; text-transform:uppercase; letter-spacing:1.2px;
    }
    .ds-btn-icon { font-size:1.3rem; line-height:1; }

    .ds-btn-gif {
      background:rgba(107,140,255,0.08);
      border:1px solid rgba(107,140,255,0.3);
      color:#6B8CFF;
    }
    .ds-btn-gif:hover {
      background:rgba(107,140,255,0.18); border-color:rgba(107,140,255,0.6);
      color:#fff; transform:translateY(-2px); box-shadow:0 8px 28px rgba(107,140,255,0.2);
    }

    .ds-btn-poster {
      background:rgba(232,197,71,0.1);
      border:1px solid rgba(232,197,71,0.38);
      color:#E8C547;
    }
    .ds-btn-poster:hover {
      background:rgba(232,197,71,0.2); border-color:rgba(232,197,71,0.65);
      color:#fff; transform:translateY(-2px); box-shadow:0 8px 28px rgba(232,197,71,0.22);
    }

    .ds-btn-download {
      flex:0 0 auto; padding:15px 16px;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.55);
    }
    .ds-btn-download:hover {
      background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.25);
      color:#fff; transform:translateY(-2px);
    }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════
   MOUNT
══════════════════════════════════════════════════════════ */
function mountDuetSheet() {
  if (document.getElementById('duetBackdrop')) return;
  injectDuetStyles();

  const backdrop = document.createElement('div');
  backdrop.id = 'duetBackdrop';
  backdrop.className = 'ds-hidden';
  backdrop.innerHTML = `
    <div id="duetSheet">
      <div class="ds-handle" id="dsDragHandle"></div>
      <div class="ds-header">
        <span class="ds-title">Conversation</span>
        <button class="ds-close" id="dsClose" aria-label="Close">×</button>
      </div>
      <div class="ds-canvas-wrap">
        <div class="ds-canvas-ring">
          <canvas id="duetCanvas"></canvas>
        </div>
      </div>
      <div class="ds-meta" id="dsMeta"></div>
      <div class="ds-actions">
        <button class="ds-btn ds-btn-gif" id="dsBtnGif">
          <span class="ds-btn-icon">◎</span>Share as GIF
        </button>
        <button class="ds-btn ds-btn-poster" id="dsBtnPoster">
          <span class="ds-btn-icon">✦</span>Share as Poster
        </button>
        <button class="ds-btn ds-btn-download" id="dsBtnDownload" title="Save image">
          <span class="ds-btn-icon">↓</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  DS.mounted = true;

  document.getElementById('dsClose').onclick     = closeDuetSheet;
  document.getElementById('dsBtnGif').onclick    = () => _dsRoute('gif');
  document.getElementById('dsBtnPoster').onclick = () => _dsRoute('poster');
  document.getElementById('dsBtnDownload').onclick = _dsDownload;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeDuetSheet(); });
  _initDsSwipe();
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
══════════════════════════════════════════════════════════ */
function openDuetSheet(parentPost, echoPost) {
  if (!parentPost || !echoPost) return;
  mountDuetSheet();

  DS.parentPost = parentPost;
  DS.echoPost   = echoPost;

  _populateMeta();

  const backdrop = document.getElementById('duetBackdrop');
  backdrop.classList.remove('ds-hidden');
  document.body.classList.add('modal-open');

  requestAnimationFrame(() => requestAnimationFrame(() => _dsRender()));
}

function closeDuetSheet() {
  const backdrop = document.getElementById('duetBackdrop');
  if (backdrop) backdrop.classList.add('ds-hidden');
  document.body.classList.remove('modal-open');
}

/* ── Meta strip ── */
function _populateMeta() {
  const strip = document.getElementById('dsMeta');
  if (!strip) return;
  const pk = DS.parentPost?.knowledge || {};
  const ev = DS.echoPost?.emotion || 'Nostalgia';
  const ec = DS_VIBE[ev] || '#E8C547';

  strip.innerHTML = `
    <div class="ds-meta-side" style="text-align:right">
      <div class="ds-meta-label">Original</div>
      <div class="ds-meta-song">${pk.song || '—'}</div>
      <div class="ds-meta-artist">${pk.artist || ''}</div>
    </div>
    <div class="ds-meta-divider"></div>
    <div class="ds-meta-side">
      <div class="ds-meta-label">Echo</div>
      <div class="ds-meta-song" style="color:${ec}">${DS.echoPost?.song || '—'}</div>
      <div class="ds-meta-artist">${DS.echoPost?.artist || ''}</div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   CANVAS RENDER
══════════════════════════════════════════════════════════ */
function _dsRender() {
  const canvas = document.getElementById('duetCanvas');
  if (!canvas) return;

  const dpr  = Math.min(window.devicePixelRatio || 1, 2);
  const wrap = canvas.parentElement;
  const maxW = Math.min((wrap?.clientWidth || 320) - 0, 340);
  const size = Math.max(200, maxW);

  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  document.fonts.ready.then(() => {
    _dsDrawCard(ctx, size, size, DS.parentPost, DS.echoPost);
  });
}

/* ── The actual duet card drawing ── */
function _dsDrawCard(ctx, W, H, parent, echo) {
  if (!parent || !echo) return;

  const pad    = W * 0.07;
  const innerW = W - pad * 2;

  const pEmotion = parent.emotion || 'Nostalgia';
  const eEmotion = echo.emotion   || 'Nostalgia';
  const pVibe    = DS_VIBE[pEmotion] || '#E8C547';
  const eVibe    = DS_VIBE[eEmotion] || '#E8C547';
  const divY     = H * 0.495;

  /* ── Background ── */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#090810');
  bg.addColorStop(0.48, '#0d0b12');
  bg.addColorStop(0.52, '#080c10');
  bg.addColorStop(1,    '#060809');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ── Parent vibe glow top-left ── */
  ctx.save();
  const pg = ctx.createRadialGradient(W * 0.15, H * 0.15, 0, W * 0.15, H * 0.15, W * 0.7);
  pg.addColorStop(0, pVibe + '22');
  pg.addColorStop(1, 'transparent');
  ctx.fillStyle = pg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* ── Echo vibe glow bottom-right ── */
  ctx.save();
  const eg = ctx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.7);
  eg.addColorStop(0, eVibe + '22');
  eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  /* ── Noise ── */
  ctx.save();
  ctx.globalAlpha = 0.016;
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  ctx.restore();

  /* ── Top accent line ── */
  ctx.save();
  const tl = ctx.createLinearGradient(0, 0, W, 0);
  tl.addColorStop(0, 'transparent');
  tl.addColorStop(0.5, pVibe);
  tl.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = tl;
  ctx.fillRect(0, 0, W, 2);
  ctx.restore();

  /* ── Bottom accent line ── */
  ctx.save();
  const bl = ctx.createLinearGradient(0, 0, W, 0);
  bl.addColorStop(0, 'transparent');
  bl.addColorStop(0.5, eVibe);
  bl.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = bl;
  ctx.fillRect(0, H - 2, W, 2);
  ctx.restore();

  /* ── MARGO wordmark ── */
  const mSz = Math.max(14, W * 0.046);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne',sans-serif`;
  ctx.fillStyle = '#E8C547';
  ctx.globalAlpha = 0.88;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.65);
  ctx.restore();

  /* ══ PARENT LYRIC — top zone ══ */
  const topZoneTop = pad * 2;
  const topZoneBot = divY - W * 0.05;
  const topH = topZoneBot - topZoneTop;

  const pText = parent.text || '';
  let pFS = Math.min(W * 0.054, topH * 0.3);
  ctx.font = `italic 600 ${pFS}px 'DM Serif Display',serif`;
  let pLines = _dsWrap(ctx, pText, innerW * 0.9);
  if (pLines.length > 3) {
    pFS = Math.max(W * 0.028, pFS * (3 / pLines.length));
    ctx.font = `italic 600 ${pFS}px 'DM Serif Display',serif`;
    pLines = _dsWrap(ctx, pText, innerW * 0.9);
  }
  const pLH     = pFS * 1.52;
  const pBlockH = pLines.length * pLH;
  const pStartY = topZoneTop + (topH - pBlockH) / 2 - pFS * 0.3;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 16;
  pLines.forEach((line, i) => {
    ctx.globalAlpha = 0.58 - i * 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, W / 2, pStartY + i * pLH);
  });
  ctx.restore();

  /* Parent song tiny attribution */
  const pk = parent.knowledge || {};
  if (pk.song) {
    const paFS = Math.max(9, W * 0.019);
    ctx.save();
    ctx.font = `700 ${paFS}px 'Space Mono',monospace`;
    ctx.fillStyle = pVibe;
    ctx.globalAlpha = 0.42;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    let paStr = pk.song + (pk.artist ? ' — ' + pk.artist : '');
    while (ctx.measureText(paStr).width > innerW * 0.8 && paStr.length > 4)
      paStr = paStr.slice(0, -4) + '…';
    ctx.fillText(paStr, W / 2, divY - W * 0.045);
    ctx.restore();
  }

  /* ══ DIVIDER PILL — the hero ══ */
  const dText = `ECHOED BY  @${(echo.username || 'anonymous').toUpperCase()}`;
  const dFS   = Math.max(10, W * 0.021);
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  const dTW   = ctx.measureText(dText).width;
  const pH    = dFS * 1.95;
  const pPH   = W * 0.028;
  const pW    = dTW + pPH * 2;
  const pX    = W / 2 - pW / 2;
  const pY    = divY - pH / 2;
  const pR    = pH / 2;

  /* Lines either side */
  ctx.save();
  const gap = pW / 2 + W * 0.018;
  [[pad, W / 2 - gap], [W / 2 + gap, W - pad]].forEach(([x1, x2]) => {
    const lg = ctx.createLinearGradient(x1, 0, x2, 0);
    if (x1 === pad) {
      lg.addColorStop(0, 'transparent');
      lg.addColorStop(1, 'rgba(232,197,71,0.22)');
    } else {
      lg.addColorStop(0, 'rgba(232,197,71,0.22)');
      lg.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x1, divY - 0.75, x2 - x1, 1.5);
  });
  ctx.restore();

  /* Pill */
  ctx.save();
  ctx.shadowColor = '#E8C547';
  ctx.shadowBlur  = 14;
  ctx.strokeStyle = 'rgba(232,197,71,0.6)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pX, pY, pW, pH, pR) : ctx.rect(pX, pY, pW, pH);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const pFill = ctx.createLinearGradient(pX, pY, pX, pY + pH);
  pFill.addColorStop(0, 'rgba(232,197,71,0.14)');
  pFill.addColorStop(1, 'rgba(232,197,71,0.06)');
  ctx.fillStyle = pFill;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(pX, pY, pW, pH, pR) : ctx.rect(pX, pY, pW, pH);
  ctx.fill();

  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle = '#E8C547';
  ctx.globalAlpha = 0.95;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(dText, W / 2, divY);
  ctx.restore();

  /* ══ ECHO LYRIC — bottom zone ══ */
  const botZoneTop = divY + pH / 2 + W * 0.025;
  const botZoneBot = H * 0.88;
  const botH = botZoneBot - botZoneTop;

  const eText = echo.lyric || '';
  let eFS = Math.min(W * 0.062, botH * 0.3);
  ctx.font = `italic 700 ${eFS}px 'DM Serif Display',serif`;
  let eLines = _dsWrap(ctx, eText, innerW * 0.9);
  if (eLines.length > 3) {
    eFS = Math.max(W * 0.032, eFS * (3 / eLines.length));
    ctx.font = `italic 700 ${eFS}px 'DM Serif Display',serif`;
    eLines = _dsWrap(ctx, eText, innerW * 0.9);
  }
  const eLH     = eFS * 1.52;
  const eBlockH = eLines.length * eLH;
  const eStartY = botZoneTop + (botH - eBlockH) / 2;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 20;
  eLines.forEach((line, i) => {
    ctx.globalAlpha = 1 - i * 0.02;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, W / 2, eStartY + i * eLH);
  });
  ctx.restore();

  /* Echo song attribution */
  if (echo.song) {
    const eaFS = Math.max(9, W * 0.019);
    ctx.save();
    ctx.font = `700 ${eaFS}px 'Space Mono',monospace`;
    ctx.fillStyle = '#E8C547';
    ctx.globalAlpha = 0.8;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    let eaStr = echo.song + (echo.artist ? ' — ' + echo.artist : '');
    while (ctx.measureText(eaStr).width > innerW * 0.8 && eaStr.length > 4)
      eaStr = eaStr.slice(0, -4) + '…';
    ctx.fillText(eaStr, W / 2, H * 0.89);
    ctx.restore();
  }

  /* ── trymargo.com watermark ── */
  const wFS = Math.max(9, W * 0.02);
  ctx.save();
  ctx.font = `700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const wTxt = 'trymargo.com';
  const wW2  = ctx.measureText(wTxt).width + W * 0.044;
  const wH2  = wFS * 1.7;
  const wX   = W / 2 - wW2 / 2;
  const wY   = H - pad * 0.85 - wH2 / 2;
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(wX, wY, wW2, wH2, wH2 / 2) : ctx.rect(wX, wY, wW2, wH2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(wTxt, W / 2, wY + wH2 / 2);
  ctx.restore();
}

/* ── Word wrap helper ── */
function _dsWrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ══════════════════════════════════════════════════════════
   ACTIONS — route to share sheet or download
══════════════════════════════════════════════════════════ */
function _dsRoute(tab) {
  closeDuetSheet();

  /* Give the duet sheet time to close before opening share sheet */
  setTimeout(() => {
    if (typeof window.openShareSheet === 'function') {
      /* Pass the echo post as the primary post for single-lyric share,
         or if share sheet supports duet, pass both */
      window.openShareSheet(DS.parentPost, {
        isDuet:    true,
        echoPost:  DS.echoPost,
        preferTab: tab,
      });
    }
  }, 160);
}

function _dsDownload() {
  const offscreen = document.createElement('canvas');
  offscreen.width  = 1080;
  offscreen.height = 1080;
  const ctx = offscreen.getContext('2d');

  document.fonts.ready.then(() => {
    _dsDrawCard(ctx, 1080, 1080, DS.parentPost, DS.echoPost);
    const link = document.createElement('a');
    const pSong = (DS.parentPost?.knowledge?.song || 'lyric').replace(/\s+/g, '-').toLowerCase();
    link.download = `margo-conversation-${pSong}.png`;
    link.href = offscreen.toDataURL('image/png', 0.93);
    link.click();
    if (typeof showToast === 'function') showToast('Conversation saved ✓');
  });
}

/* ── Swipe to close ── */
function _initDsSwipe() {
  const sheet  = document.getElementById('duetSheet');
  const handle = document.getElementById('dsDragHandle');
  if (!sheet || !handle) return;

  let startY = 0, curY = 0, dragging = false;

  const onStart = e => { startY = e.touches ? e.touches[0].clientY : e.clientY; curY = startY; dragging = true; sheet.style.transition = 'none'; };
  const onMove  = e => {
    if (!dragging) return;
    curY = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = Math.max(0, curY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    sheet.style.opacity   = String(1 - dy / 320);
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    if (curY - startY > 80) { closeDuetSheet(); }
    else { sheet.style.transform = ''; sheet.style.opacity = ''; }
  };

  handle.addEventListener('touchstart', onStart, { passive: true });
  handle.addEventListener('touchmove',  onMove,  { passive: true });
  handle.addEventListener('touchend',   onEnd);
}

/* ══════════════════════════════════════════════════════════
   GLOBAL EXPOSE
══════════════════════════════════════════════════════════ */
window.openDuetSheet  = openDuetSheet;
window.closeDuetSheet = closeDuetSheet;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountDuetSheet);
} else {
  mountDuetSheet();
}

})();
