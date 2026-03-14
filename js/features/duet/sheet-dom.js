function _mount() {
  if (document.getElementById('_dsBd')) return;
  _injectCSS();

  const bd = document.createElement('div');
  bd.id = '_dsBd';
  bd.className = 'hide';
  bd.innerHTML = `
    <div id="_dsSheet">
      <div class="_dsHandle"></div>

      <div class="_dsHdr">
        <span class="_dsTtl" id="_dsTtl">Lyric Back</span>
        <button class="_dsX" id="_dsX" aria-label="Close">×</button>
      </div>

      <!-- FORMAT TOGGLE — TOP -->
      <div class="_dsFmtRow">
        <button class="_dsFmtBtn gif-active" id="_dsFmtGif" data-fmt="gif">
          <span class="_dsFmtDot"></span>GIF
        </button>
        <button class="_dsFmtBtn" id="_dsFmtPost" data-fmt="poster">
          <span class="_dsFmtDot"></span>Poster
        </button>
      </div>

      <!-- VIEW TOGGLE -->
      <div class="_dsVwRow">
        <button class="_dsVwBtn active" id="_dsVwCvo">Conversation</button>
        <button class="_dsVwBtn"        id="_dsVwCrd">Card</button>
      </div>

      <!-- SCROLLABLE BODY -->
      <div class="_dsBody" id="_dsBody">

        <!-- CONVERSATION VIEW -->
        <div id="_dsCvoView">
          <div class="_dsCvo" id="_dsCvoBubs"></div>
          <div class="_dsSng" id="_dsSngStrip"></div>
          <div style="height:6px"></div>
        </div>

        <!-- CARD VIEW -->
        <div id="_dsCrdView" style="display:none">
          <div class="_dsCrd">
            <div class="_dsCrdRing" id="_dsCrdRing">
              <canvas id="_dsCvs"></canvas>
            </div>
          </div>
          <div style="height:6px"></div>
        </div>

        <!-- EDIT PANEL -->
        <div class="_dsEdt">
          <div class="_dsOptRow" id="_dsOptRow">
            <button class="_dsOptBtn active" data-sec="motion" id="_dsTabMtn">Motion</button>
            <button class="_dsOptBtn"        data-sec="color">Color</button>
            <button class="_dsOptBtn"        data-sec="style">Style</button>
            <button class="_dsOptBtn"        data-sec="font">Font</button>
          </div>
          <div class="_dsPnl">

            <!-- MOTION -->
            <div class="_dsSec on" id="_dsSec-motion">
              <div class="_dsPnlLbl">Animation style</div>
              <div class="_dsMtnG" id="_dsMtnG">
                <button class="_dsMtnB active" data-m="fade-up">Fade Up</button>
                <button class="_dsMtnB"        data-m="typewriter">Type</button>
                <button class="_dsMtnB"        data-m="slide-in">Slide</button>
                <button class="_dsMtnB"        data-m="pulse">Pulse</button>
                <button class="_dsMtnB"        data-m="glitch">Glitch</button>
                <button class="_dsMtnB"        data-m="wave">Wave</button>
                <button class="_dsMtnB"        data-m="shimmer">Shimmer</button>
                <button class="_dsMtnB"        data-m="bounce">Bounce</button>
              </div>
              <div class="_dsPnlLbl" style="margin-top:10px">Speed</div>
              <div class="_dsSpdR" id="_dsSpdR">
                <button class="_dsSpdB"        data-d="3.8">Slow</button>
                <button class="_dsSpdB active" data-d="2.4">Normal</button>
                <button class="_dsSpdB"        data-d="1.3">Fast</button>
              </div>
            </div>

            <!-- COLOR -->
            <div class="_dsSec" id="_dsSec-color">
              <div class="_dsPnlLbl">Theme</div>
              <div class="_dsClrG">
                <div class="_dsClrSw active" data-theme="gold">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#0d0d0d,#E8C547)"></div>
                  <div class="_dsSwNm">Gold</div>
                </div>
                <div class="_dsClrSw" data-theme="violet">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#1a0033,#c77dff)"></div>
                  <div class="_dsSwNm">Violet</div>
                </div>
                <div class="_dsClrSw" data-theme="ocean">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#0a1420,#00e5ff)"></div>
                  <div class="_dsSwNm">Ocean</div>
                </div>
                <div class="_dsClrSw" data-theme="ember">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#1a0a0a,#ff6b6b)"></div>
                  <div class="_dsSwNm">Ember</div>
                </div>
                <div class="_dsClrSw" data-theme="forest">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></div>
                  <div class="_dsSwNm">Forest</div>
                </div>
                <div class="_dsClrSw" data-theme="rose">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></div>
                  <div class="_dsSwNm">Rose</div>
                </div>
                <div class="_dsClrSw" data-theme="mono">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#000,#fff)"></div>
                  <div class="_dsSwNm">Mono</div>
                </div>
                <div class="_dsClrSw" data-theme="wave">
                  <div class="_dsSwFl" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></div>
                  <div class="_dsSwNm">Wave</div>
                </div>
              </div>
            </div>

            <!-- STYLE -->
            <div class="_dsSec" id="_dsSec-style">
              <div class="_dsPnlLbl">Card style</div>
              <div class="_dsStlG">
                <button class="_dsStlB active" data-s="glass">Frosted Glass</button>
                <button class="_dsStlB"        data-s="contrast">Deep Contrast</button>
                <button class="_dsStlB"        data-s="mesh">Gradient Mesh</button>
                <button class="_dsStlB"        data-s="grain">Grain / Editorial</button>
                <button class="_dsStlB"        data-s="neon">Neon Outline</button>
                <button class="_dsStlB"        data-s="depth">Cinematic</button>
              </div>
            </div>

            <!-- FONT -->
            <div class="_dsSec" id="_dsSec-font">
              <div class="_dsPnlLbl">Lyric font</div>
              <div class="_dsFntG">
                <div class="_dsFntC active" data-fam="DM Serif Display" data-itl="true">
                  <div class="_dsFntPv" style="font-family:'DM Serif Display',serif;font-style:italic">Say everything</div>
                  <div class="_dsFntNm">Serif · Default</div>
                </div>
                <div class="_dsFntC" data-fam="Playfair Display" data-itl="true">
                  <div class="_dsFntPv" style="font-family:'Playfair Display',serif;font-style:italic">Say everything</div>
                  <div class="_dsFntNm">Playfair</div>
                </div>
                <div class="_dsFntC" data-fam="Lora" data-itl="true">
                  <div class="_dsFntPv" style="font-family:'Lora',serif;font-style:italic">Say everything</div>
                  <div class="_dsFntNm">Lora · Romantic</div>
                </div>
                <div class="_dsFntC" data-fam="Space Mono" data-itl="false">
                  <div class="_dsFntPv" style="font-family:'Space Mono',monospace">Say everything</div>
                  <div class="_dsFntNm">Space Mono</div>
                </div>
                <div class="_dsFntC" data-fam="DM Sans" data-itl="false">
                  <div class="_dsFntPv" style="font-family:'DM Sans',sans-serif;font-weight:700">Say everything</div>
                  <div class="_dsFntNm">Sans Bold</div>
                </div>
                <div class="_dsFntC" data-fam="Comic Sans MS" data-itl="false">
                  <div class="_dsFntPv" style="font-family:'Comic Sans MS',cursive">Say everything</div>
                  <div class="_dsFntNm">Playful</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div><!-- /_dsBody -->

      <!-- DOWNLOAD ROW — BOTTOM -->
      <div class="_dsDlRow" id="_dsDlRow">
        <button class="_dsDlBtn _dsDlGif"  id="_dsDlA">
          <span class="_dsDlIco">◎</span>
          <span id="_dsDlALbl">Download GIF</span>
        </button>
        <button class="_dsDlBtn _dsDlPost" id="_dsDlB">
          <span class="_dsDlIco">↓</span>
          <span id="_dsDlBLbl">Save Image</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(bd);
  DS.mounted = true;
  _wireEvents();
}

/* ══════════════════════════════════════════════════════════
   WIRE EVENTS
══════════════════════════════════════════════════════════ */
function _wireEvents() {
  _el('_dsX').onclick     = closeSheet;
  _el('_dsVwCvo').onclick = () => _setView('convo');
  _el('_dsVwCrd').onclick = () => _setView('card');

  // Format toggle
  _el('_dsFmtGif').onclick  = () => _setFormat('gif');
  _el('_dsFmtPost').onclick = () => _setFormat('poster');

  // Option tabs
  _el('_dsOptRow').addEventListener('click', e => {
    const b = e.target.closest('._dsOptBtn');
    if (!b) return;
    _qAll('._dsOptBtn').forEach(x => x.classList.remove('active'));
    _qAll('._dsSec').forEach(x => x.classList.remove('on'));
    b.classList.add('active');
    _el('_dsSec-' + b.dataset.sec).classList.add('on');
  });

  // Motion
  _el('_dsMtnG').addEventListener('click', e => {
    const b = e.target.closest('._dsMtnB');
    if (!b) return;
    _qAll('._dsMtnB').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    DS.motion = b.dataset.m;
    _applyMotion();
  });

  // Speed
  _el('_dsSpdR').addEventListener('click', e => {
    const b = e.target.closest('._dsSpdB');
    if (!b) return;
    _qAll('._dsSpdB').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    DS.dur = parseFloat(b.dataset.d);
    _applyMotion();
  });

  // Color
  _qAll('._dsClrSw').forEach(sw => sw.addEventListener('click', () => {
    _qAll('._dsClrSw').forEach(x => x.classList.remove('active'));
    sw.classList.add('active');
    DS.theme = sw.dataset.theme;
    _applyTheme();
    _applyMotion();
    _schedRefresh();
  }));

  // Style
  _qAll('._dsStlB').forEach(b => b.addEventListener('click', () => {
    _qAll('._dsStlB').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    DS.cardStyle = b.dataset.s;
    _schedRefresh();
  }));

  // Font
  _qAll('._dsFntC').forEach(c => c.addEventListener('click', () => {
    _qAll('._dsFntC').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    DS.fontFamily = c.dataset.fam;
    DS.fontItalic = c.dataset.itl === 'true';
    _qAll('._dsBblL').forEach(el => {
      el.style.fontFamily = `'${DS.fontFamily}',serif`;
      el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
    });
    _schedRefresh();
  }));

  // Download buttons
  _el('_dsDlA').onclick = () => _download('primary');
  _el('_dsDlB').onclick = () => _download('secondary');

  // Backdrop click to close
  _el('_dsBd').addEventListener('click', e => {
    if (e.target === _el('_dsBd')) closeSheet();
  });

  // Swipe to close
  const sheet = _el('_dsSheet');
  const handle = sheet.querySelector('._dsHandle');
  if (handle) {
    let sy = 0, cy = 0, drag = false;
    handle.addEventListener('touchstart', e => { sy = e.touches[0].clientY; cy = sy; drag = true; sheet.style.transition = 'none'; }, { passive:true });
    handle.addEventListener('touchmove',  e => { if (!drag) return; cy = e.touches[0].clientY; const d = Math.max(0, cy - sy); sheet.style.transform = `translateY(${d}px)`; sheet.style.opacity = String(1 - d/280); }, { passive:true });
    handle.addEventListener('touchend',   ()  => { if (!drag) return; drag = false; sheet.style.transition = ''; if (cy - sy > 70) closeSheet(); else { sheet.style.transform = ''; sheet.style.opacity = ''; } });
  }
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
══════════════════════════════════════════════════════════ */
