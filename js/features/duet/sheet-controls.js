function openSheet(post1, post2) {
  if (!post1 || !post2) return;
  _mount();

  DS.post1      = post1;
  DS.post2      = post2;
  DS.motion     = 'fade-up';
  DS.dur        = 2.4;
  DS.theme      = 'gold';
  DS.cardStyle  = 'glass';
  DS.fontFamily = 'DM Serif Display';
  DS.fontItalic = true;

  // Reset UI selectors
  _qAll('._dsMtnB').forEach(b => b.classList.toggle('active', b.dataset.m === 'fade-up'));
  _qAll('._dsSpdB').forEach(b => b.classList.toggle('active', b.dataset.d === '2.4'));
  _qAll('._dsClrSw').forEach(b => b.classList.toggle('active', b.dataset.theme === 'gold'));
  _qAll('._dsStlB').forEach(b => b.classList.toggle('active', b.dataset.s === 'glass'));
  _qAll('._dsFntC').forEach(b => b.classList.toggle('active', b.dataset.fam === 'DM Serif Display'));
  _qAll('._dsOptBtn').forEach((b, i) => b.classList.toggle('active', i === 0));
  _qAll('._dsSec').forEach((s, i) => s.classList.toggle('on', i === 0));

  _populateConvo();
  _applyTheme();
  _setFormat('gif');
  _setView('convo');

  _el('_dsBd').classList.remove('hide');
  document.body.classList.add('_dsOpen');
  DS._savedScrollY = window.scrollY || 0;
}

function closeSheet() {
  _stopCanvas();
  const bd = _el('_dsBd');
  if (bd) bd.classList.add('hide');
  document.body.classList.remove('_dsOpen');
  _qAll('._dsBblL').forEach(el => { el.style.cssText = ''; });
  requestAnimationFrame(() => window.scrollTo({ top: DS._savedScrollY, behavior: 'instant' }));
}

/* ══════════════════════════════════════════════════════════
   FORMAT — GIF / POSTER
══════════════════════════════════════════════════════════ */
function _setFormat(fmt) {
  DS.format = fmt;
  const gBtn = _el('_dsFmtGif'), pBtn = _el('_dsFmtPost');
  gBtn.className = '_dsFmtBtn' + (fmt === 'gif' ? ' gif-active' : '');
  pBtn.className = '_dsFmtBtn' + (fmt === 'poster' ? ' poster-active' : '');

  // Update download button labels based on BOTH format AND view
  _updateDownloadLabels();

  // Hide Motion tab when Poster (static)
  const mtnTab = _el('_dsTabMtn');
  if (fmt === 'poster') {
    mtnTab.style.display = 'none';
    if (mtnTab.classList.contains('active')) {
      mtnTab.classList.remove('active');
      _el('_dsSec-motion').classList.remove('on');
      const colorTab = document.querySelector('[data-sec="color"]');
      colorTab.classList.add('active');
      _el('_dsSec-color').classList.add('on');
    }
    _qAll('._dsBblL').forEach(el => { el.style.cssText = ''; });
  } else {
    mtnTab.style.display = '';
    _applyMotion();
  }

  if (DS.view === 'card') _schedRefresh();
}

/* ── Update button labels to match current view + format ── */
function _updateDownloadLabels() {
  const isGif    = DS.format === 'gif';
  const isConvo  = DS.view   === 'convo';

  if (isGif) {
    _el('_dsDlALbl').textContent = isConvo ? 'Download GIF' : 'Download GIF';
    _el('_dsDlBLbl').textContent = isConvo ? 'Share GIF'    : 'Share GIF';
  } else {
    _el('_dsDlALbl').textContent = isConvo ? 'Download Poster' : 'Download Poster';
    _el('_dsDlBLbl').textContent = isConvo ? 'Save Image'      : 'Save Image';
  }
}

/* ══════════════════════════════════════════════════════════
   VIEW — CONVO / CARD
══════════════════════════════════════════════════════════ */
function _setView(v) {
  DS.view = v;
  _el('_dsVwCvo').classList.toggle('active', v === 'convo');
  _el('_dsVwCrd').classList.toggle('active', v === 'card');
  _el('_dsCvoView').style.display = v === 'convo' ? '' : 'none';
  _el('_dsCrdView').style.display = v === 'card'  ? '' : 'none';

  // Update labels when view changes
  _updateDownloadLabels();

  if (v === 'card') {
    _stopCanvas();
    requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas()));
  } else {
    _stopCanvas();
    if (DS.format !== 'poster') _applyMotion();
  }
}

/* ══════════════════════════════════════════════════════════
   POPULATE CONVERSATION VIEW
══════════════════════════════════════════════════════════ */
function _populateConvo() {
  const p = DS.post1, e = DS.post2;
  if (!p || !e) return;

  const pk    = p.knowledge || {};
  const ek    = e.knowledge || {};
  const pUser = '@' + (p.username || 'anonymous').replace(/^@/, '').toUpperCase();
  const eUser = '@' + (e.username || 'anonymous').replace(/^@/, '').toUpperCase();
  const pSong = pk.song   || p.song   || '—';
  const pArt  = pk.artist || p.artist || '';
  const eSong = ek.song   || e.song   || '—';
  const eArt  = ek.artist || e.artist || '';
  const pVibe = DS_VIBE[p.emotion] || '#E8C547';
  const eVibe = DS_VIBE[e.emotion] || '#E8C547';

  const sheet = _el('_dsSheet');
  sheet.style.setProperty('--_dsL', pVibe);
  sheet.style.setProperty('--_dsR', eVibe);

  _el('_dsTtl').textContent = 'Lyric Back';

  _el('_dsCvoBubs').innerHTML = `
    <div class="_dsBbl orig">
      <div class="_dsBblU"><span class="_dsUdot"></span>${_esc(pUser)}</div>
      <div class="_dsBblC">
        <div class="_dsBblL">${_esc(p.text || p.lyric || '')}</div>
        <div class="_dsBblM">
          <div>
            <div class="_dsBblSn">${_esc(pSong)}</div>
            <div class="_dsBblAr">${_esc(pArt)}</div>
          </div>
          <span class="_dsBblVb">${_esc(p.emotion || 'Vibe')}</span>
        </div>
      </div>
    </div>
    <div class="_dsDvd">
      <div class="_dsDvdL"></div>
      <div class="_dsDvdP">Lyric Back ↩ ${_esc(eUser)}</div>
      <div class="_dsDvdL"></div>
    </div>
    <div class="_dsBbl rply">
      <div class="_dsBblU">${_esc(eUser)}<span class="_dsUdot"></span></div>
      <div class="_dsBblC">
        <div class="_dsBblL">${_esc(e.lyric || e.text || '')}</div>
        <div class="_dsBblM">
          <div>
            <div class="_dsBblSn">${_esc(eSong)}</div>
            <div class="_dsBblAr">${_esc(eArt)}</div>
          </div>
          <span class="_dsBblVb">${_esc(e.emotion || 'Vibe')}</span>
        </div>
      </div>
    </div>
  `;

  _el('_dsSngStrip').innerHTML = `
    <span class="_dsSngLbl">Songs</span>
    <div class="_dsSngPair">
      <div class="_dsSngItem">
        <span class="_dsSngN">${_esc(pSong)}</span>
        <span class="_dsSngA">${_esc(pArt)}</span>
      </div>
      <span class="_dsSngSep">↔</span>
      <div class="_dsSngItem">
        <span class="_dsSngN">${_esc(eSong)}</span>
        <span class="_dsSngA">${_esc(eArt)}</span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   APPLY THEME
══════════════════════════════════════════════════════════ */
function _applyTheme() {
  const m = DS_THEMES[DS.theme] || DS_THEMES.gold;
  const sh = _el('_dsSheet');
  if (!sh) return;
  sh.style.setProperty('--_dsAcc',  m.accent);
  sh.style.setProperty('--_dsBg',   _mix(m.bg, '#0c0b10', 0.35));
  sh.style.setProperty('--_dsBB1',  m.bb1);
  sh.style.setProperty('--_dsBB2',  m.bb2);
  sh.style.setProperty('--_dsBD1',  m.bd1);
  sh.style.setProperty('--_dsBD2',  m.bd2);
  sh.style.setProperty('--_dsL',    m.l);
  sh.style.setProperty('--_dsR',    m.r);
  sh.style.setProperty('--_dsLyC',  m.light ? '#0B0B0D' : '#ffffff');
}

/* ══════════════════════════════════════════════════════════
   APPLY MOTION
══════════════════════════════════════════════════════════ */
function _applyMotion() {
  _schedRefresh();
  if (DS.view !== 'convo' || DS.format === 'poster') return;

  const els = _qAll('._dsBblL');
  const dur = DS.dur;
  const m   = DS.motion;
  const acc = (DS_THEMES[DS.theme] || DS_THEMES.gold).accent;

  els.forEach(el => { el.style.cssText = ''; });
  const bubs = _el('_dsCvoBubs');
  if (bubs) void bubs.offsetHeight;

  els.forEach((el, i) => {
    const delay = i * 0.16;
    el.style.fontFamily = `'${DS.fontFamily}',serif`;
    el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
    switch (m) {
      case 'fade-up':   el.style.animation = `_kFU ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'slide-in':  el.style.animation = `_kSI ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'pulse':     el.style.animation = `_kPL ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'glitch':    el.style.animation = `_kGL ${dur}s ${delay*0.5}s steps(1) infinite`; break;
      case 'wave':      el.style.display = 'inline-block'; el.style.animation = `_kWV ${dur}s ${delay}s ease-in-out infinite`; break;
      case 'bounce':    el.style.display = 'inline-block'; el.style.animation = `_kBN ${dur}s ${delay}s ease infinite`; break;
      case 'shimmer':
        el.style.background = `linear-gradient(90deg,rgba(255,255,255,0.5) 0%,#fff 35%,${acc} 50%,#fff 65%,rgba(255,255,255,0.5) 100%)`;
        el.style.backgroundSize = '300% auto';
        el.style.webkitBackgroundClip = 'text';
        el.style.webkitTextFillColor  = 'transparent';
        el.style.backgroundClip       = 'text';
        el.style.animation = `_kSH ${dur}s ${delay}s linear infinite`;
        break;
      case 'typewriter':
        el.style.overflow    = 'hidden';
        el.style.whiteSpace  = 'nowrap';
        el.style.borderRight = `2px solid ${acc}`;
        el.style.width       = '0';
        el.style.animation   = `_kTY ${dur}s ${delay}s steps(30,end) infinite, _kBL 0.7s ${delay}s step-end infinite`;
        break;
    }
  });
}

/* ══════════════════════════════════════════════════════════
   CANVAS — single loop, guarded by loopId
══════════════════════════════════════════════════════════ */
function _stopCanvas() {
  DS._loopId++;
  if (DS._raf) { cancelAnimationFrame(DS._raf); DS._raf = null; }
  DS._frame = 0;
}

function _startCanvas() {
  _stopCanvas();
  const canvas = _el('_dsCvs');
  if (!canvas) return;

  const ring = _el('_dsCrdRing');
  const dpr  = Math.min(window.devicePixelRatio || 1, 2);
  const size = ring.clientWidth || 300;

  if (size < 10) {
    requestAnimationFrame(() => _startCanvas());
    return;
  }

  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';

  const ctx     = canvas.getContext('2d');
  const myId    = DS._loopId;
  const opts    = _buildOpts();
  const p1      = DS.post1;
  const p2      = DS.post2;
  const totalF  = 36;
  const frameMs = Math.round((DS.dur * 1000) / totalF);
  let lastTs    = 0;

  const draw = (ts) => {
    if (DS._loopId !== myId) return;

    if (ts - lastTs >= frameMs) {
      lastTs = ts;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (DS.format === 'poster') {
        _drawCanvas(ctx, size, size, 0, p1, p2, opts);
        return;
      }
      _drawCanvas(ctx, size, size, DS._frame / totalF, p1, p2, opts);
      DS._frame = (DS._frame + 1) % totalF;
    }
    DS._raf = requestAnimationFrame(draw);
  };

  document.fonts.ready.then(() => {
    if (DS._loopId !== myId) return;
    DS._raf = requestAnimationFrame(draw);
  });
}

function _schedRefresh() {
  if (DS._refreshTimer) clearTimeout(DS._refreshTimer);
  DS._refreshTimer = setTimeout(() => {
    DS._refreshTimer = null;
    if (DS.view === 'card') {
      _stopCanvas();
      requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas()));
    }
  }, 80);
}

function _drawCanvas(ctx, W, H, t, p1, p2, opts) {
  if (opts.format === 'poster' && typeof window.dsPosterDraw === 'function') {
    window.dsPosterDraw(ctx, W, H, p1, p2, opts);
    return;
  }
  if (opts.format === 'gif' && typeof window.dsGifDrawFrame === 'function') {
    window.dsGifDrawFrame(ctx, W, H, t, DS.motion, p1, p2, opts);
    return;
  }
  _fallbackDraw(ctx, W, H, t, p1, p2, opts);
}

