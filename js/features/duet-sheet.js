/* ============================================================
   MARGO — js/features/duet-sheet.js  v4.3
   CHANGE v4.3: Fixed wide-canvas overflow (X 1600x900, LinkedIn/Facebook 1200x627).
                Only _drawConvoLayoutAnimated and _drawCardFrame changed.
                All other code identical to v4.2.
   ============================================================ */

(function () {

// ── Margo font preloader — self-hosted Lora, no Google dependency ──
(function _preloadMargoFonts() {
  const base = '/assets/fonts/lora/';
  const faces = [
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-regular.woff2)',     { weight: '400', style: 'normal' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-italic.woff2)',      { weight: '400', style: 'italic' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-500.woff2)',         { weight: '500', style: 'normal' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-500italic.woff2)',   { weight: '500', style: 'italic' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-600.woff2)',         { weight: '600', style: 'normal' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-600italic.woff2)',   { weight: '600', style: 'italic' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-700.woff2)',         { weight: '700', style: 'normal' }),
    new FontFace('Lora', 'url(' + base + 'lora-v37-latin-700italic.woff2)',   { weight: '700', style: 'italic' }),
  ];
  window._margoFontsReady = Promise.all(
    faces.map(f => f.load().then(loaded => { document.fonts.add(loaded); return loaded; }))
  ).catch(() => {});
})();

'use strict';

const DS = {
  post1: null, post2: null, mounted: false,
  view: 'convo', format: 'gif',
  motion: 'fade-up', dur: 2.4,
  theme: 'gold', cardStyle: 'glass',
  fontFamily: 'Lora', fontItalic: true,
  _raf: null, _loopId: 0, _frame: 0,
  _refreshTimer: null, _savedScrollY: 0,
};

const DS_VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

const DS_THEMES = {
  gold:   { accent:'#E8C547', bg:'#07060E', l:'#FF6B9D', r:'#6B8CFF',  bb1:'rgba(232,197,71,0.10)',  bb2:'rgba(107,140,255,0.09)', bd1:'rgba(232,197,71,0.28)',  bd2:'rgba(107,140,255,0.28)',  light:false },
  violet: { accent:'#c77dff', bg:'#0e0018', l:'#ff71ce', r:'#05ffa1',  bb1:'rgba(199,125,255,0.10)', bb2:'rgba(5,255,161,0.09)',   bd1:'rgba(199,125,255,0.28)', bd2:'rgba(5,255,161,0.28)',   light:false },
  ocean:  { accent:'#00e5ff', bg:'#04090f', l:'#00e5ff', r:'#0070ff',  bb1:'rgba(232,197,71,0.10)',   bb2:'rgba(0,112,255,0.09)',   bd1:'rgba(232,197,71,0.28)',   bd2:'rgba(0,112,255,0.28)',   light:false },
  ember:  { accent:'#ff6b6b', bg:'#0f0404', l:'#ff6b6b', r:'#ffb347',  bb1:'rgba(255,107,107,0.10)', bb2:'rgba(255,179,71,0.09)',  bd1:'rgba(255,107,107,0.28)', bd2:'rgba(255,179,71,0.28)',  light:false },
  forest: { accent:'#50fa7b', bg:'#020f06', l:'#50fa7b', r:'#00e5c0',  bb1:'rgba(80,250,123,0.10)',  bb2:'rgba(0,229,192,0.09)',   bd1:'rgba(80,250,123,0.28)',  bd2:'rgba(0,229,192,0.28)',   light:false },
  rose:   { accent:'#f4a4c0', bg:'#0f0508', l:'#f4a4c0', r:'#c084fc',  bb1:'rgba(244,164,192,0.10)', bb2:'rgba(192,132,252,0.09)', bd1:'rgba(244,164,192,0.28)', bd2:'rgba(192,132,252,0.28)', light:false },
  mono:   { accent:'#ffffff', bg:'#080808', l:'#ffffff',  r:'#aaaaaa',  bb1:'rgba(255,255,255,0.08)', bb2:'rgba(170,170,170,0.07)', bd1:'rgba(255,255,255,0.18)', bd2:'rgba(170,170,170,0.18)', light:false },
  wave:   { accent:'#05ffa1', bg:'#150520', l:'#ff71ce', r:'#05ffa1',  bb1:'rgba(255,113,206,0.10)', bb2:'rgba(5,255,161,0.09)',   bd1:'rgba(255,113,206,0.28)', bd2:'rgba(5,255,161,0.28)',   light:false },
  white:  { accent:'#0B0B0D', bg:'#f5f1e8', l:'#c0392b', r:'#1a6fbd',  bb1:'rgba(192,57,43,0.08)',   bb2:'rgba(26,111,189,0.08)',  bd1:'rgba(192,57,43,0.22)',   bd2:'rgba(26,111,189,0.22)',  light:true  },
};

function _injectCSS() {
  if (document.getElementById('_dsCSS')) return;
  const s = document.createElement('style');
  s.id = '_dsCSS';
  s.textContent = `
  #_dsBd {
    position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.90);
    backdrop-filter:blur(18px) saturate(0.5);-webkit-backdrop-filter:blur(18px) saturate(0.5);
    overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;
    display:flex;align-items:flex-end;justify-content:center;animation:_dsBdIn 0.22s ease;
  }
  #_dsBd.hide{display:none!important}
  body._dsOpen{overflow:hidden}
  @keyframes _dsBdIn{from{opacity:0}to{opacity:1}}
  #_dsSheet {
    width:100%;max-width:500px;background:var(--_dsBg,#0c0b10);
    border:1px solid rgba(255,255,255,0.07);border-radius:26px 26px 0 0;
    display:flex;flex-direction:column;box-shadow:0 -16px 80px rgba(0,0,0,0.95);
    animation:_dsUp 0.38s cubic-bezier(0.16,1,0.3,1);max-height:92vh;overflow:hidden;transition:background 0.3s ease;
  }
  @media(min-width:540px){#_dsSheet{border-radius:22px;margin:20px auto 20px;animation:_dsFd 0.3s cubic-bezier(0.16,1,0.3,1)}}
  @keyframes _dsUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes _dsFd{from{transform:translateY(20px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
  ._dsHandle{width:32px;height:4px;border-radius:2px;background:rgba(255,255,255,0.10);margin:10px auto 0;flex-shrink:0}
  ._dsHdr{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 0;flex-shrink:0}
  ._dsTtl{font-family:'Lora',serif;font-weight:800;font-size:0.82rem;letter-spacing:2.5px;text-transform:uppercase;
    background:linear-gradient(90deg,#fff 20%,var(--_dsAcc,#E8C547) 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  ._dsX{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);
    color:rgba(255,255,255,0.4);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.18s}
  ._dsX:hover{background:rgba(255,255,255,0.12);color:#fff}
  ._dsFmtRow{display:flex;gap:6px;padding:12px 16px 0;flex-shrink:0}
  ._dsFmtBtn{flex:1;padding:10px 8px;border-radius:12px;font-family:'Lora',serif;font-size:0.56rem;
    font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;
    border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.35);
    display:flex;align-items:center;justify-content:center;gap:6px}
  ._dsFmtBtn.gif-active{background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.35);color:#E8C547}
  ._dsFmtBtn.poster-active{background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.35);color:#E8C547}
  ._dsFmtBtn:not(.gif-active):not(.poster-active):hover{color:rgba(255,255,255,0.65);background:rgba(255,255,255,0.06)}
  ._dsFmtDot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  ._dsFmtBtn.gif-active ._dsFmtDot{background:#E8C547;box-shadow:0 0 6px #E8C547}
  ._dsFmtBtn.poster-active ._dsFmtDot{background:#E8C547;box-shadow:0 0 6px #E8C547}
  ._dsVwRow{display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 16px 0;flex-shrink:0}
  ._dsVwBtn{font-family:'Lora',serif;font-size:0.52rem;font-weight:700;letter-spacing:1px;
    text-transform:uppercase;padding:6px 16px;border-radius:20px;cursor:pointer;transition:all 0.18s;
    border:1px solid transparent;background:none;color:rgba(255,255,255,0.38)}
  ._dsVwBtn.active{background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.30);color:var(--_dsAcc,#E8C547)}
  ._dsVwBtn:not(.active){background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.08)}
  ._dsVwBtn:not(.active):hover{color:rgba(255,255,255,0.70);background:rgba(255,255,255,0.06)}
  ._dsBody{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;min-height:0}
  ._dsBody::-webkit-scrollbar{width:3px}
  ._dsBody::-webkit-scrollbar-track{background:transparent}
  ._dsBody::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
  ._dsCvo{padding:14px 16px 10px;display:flex;flex-direction:column;gap:10px}
  ._dsBbl{max-width:84%;display:flex;flex-direction:column;gap:5px;animation:_dsBblIn 0.4s cubic-bezier(0.16,1,0.3,1) both}
  @keyframes _dsBblIn{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  ._dsBbl.orig{align-self:flex-start;animation-delay:0.08s}
  ._dsBbl.rply{align-self:flex-end;align-items:flex-end;animation-delay:0.28s}
  ._dsBblU{font-family:'Lora',serif;font-size:0.58rem;font-weight:800;display:flex;align-items:center;gap:5px;padding:0 4px;letter-spacing:0.04em}
  ._dsBbl.orig ._dsBblU{color:var(--_dsL,#FF6B9D)}
  ._dsBbl.rply ._dsBblU{color:var(--_dsR,#6B8CFF);flex-direction:row-reverse}
  ._dsUdot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
  ._dsBbl.orig ._dsUdot{background:var(--_dsL,#FF6B9D)}
  ._dsBbl.rply ._dsUdot{background:var(--_dsR,#6B8CFF)}
  ._dsBblC{padding:13px 15px;border-radius:18px;position:relative;overflow:hidden}
  ._dsBbl.orig ._dsBblC{background:var(--_dsBB1,rgba(255,107,157,0.09));border:1px solid var(--_dsBD1,rgba(255,107,157,0.25));border-bottom-left-radius:4px}
  ._dsBbl.rply ._dsBblC{background:var(--_dsBB2,rgba(107,140,255,0.09));border:1px solid var(--_dsBD2,rgba(107,140,255,0.25));border-bottom-right-radius:4px}
  ._dsBblL{font-family:'Lora',serif;font-style:italic;font-size:1.12rem;line-height:1.5;color:var(--_dsLyC,#fff);position:relative;z-index:1}
  ._dsBblM{margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.09);position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px}
  ._dsBblSn{font-family:'Lora',serif;font-size:0.76rem;font-weight:700;color:var(--_dsLyC,#fff)}
  ._dsBblAr{font-family:'Lora',serif;font-size:0.52rem;color:rgba(255,255,255,0.5);margin-top:2px}
  ._dsBblVb{font-family:'Lora',serif;font-size:0.46rem;font-weight:800;text-transform:uppercase;padding:3px 9px;border-radius:20px;flex-shrink:0;letter-spacing:0.05em}
  ._dsBbl.orig ._dsBblVb{background:rgba(255,107,157,0.14);color:var(--_dsL,#FF9DC0);border:1px solid rgba(255,107,157,0.28)}
  ._dsBbl.rply ._dsBblVb{background:rgba(107,140,255,0.14);color:var(--_dsR,#9DB5FF);border:1px solid rgba(107,140,255,0.28)}
  ._dsDvd{display:flex;align-items:center;gap:8px;padding:1px 0;animation:_dsBblIn 0.36s cubic-bezier(0.16,1,0.3,1) 0.18s both}
  ._dsDvdL{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--_dsAcc,#E8C547)33,transparent)}
  ._dsDvdP{font-family:'Lora',serif;font-size:0.48rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;
    color:var(--_dsAcc,#E8C547);background:rgba(232,197,71,0.09);border:1px solid rgba(232,197,71,0.26);padding:5px 12px;border-radius:20px;white-space:nowrap}
  ._dsSng{margin:5px 16px 0;padding:10px 13px;background:#181720;border-radius:12px;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  ._dsSngLbl{font-family:'Lora',serif;font-size:0.46rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.4)}
  ._dsSngPair{display:flex;align-items:center;gap:10px}
  ._dsSngItem{display:flex;flex-direction:column;gap:1px}
  ._dsSngItem:last-child{align-items:flex-end}
  ._dsSngN{font-family:'Lora',serif;font-size:0.68rem;font-weight:700;color:rgba(255,255,255,0.82)}
  ._dsSngA{font-family:'Lora',serif;font-size:0.46rem;color:rgba(255,255,255,0.38)}
  ._dsSngSep{font-size:0.6rem;color:rgba(255,255,255,0.22)}
  ._dsCrd{padding:12px 16px 0}
  ._dsCrdRing{position:relative;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(232,197,71,0.10);background:#07060E;aspect-ratio:1;width:100%}
  #_dsCvs{display:block;width:100%;height:100%}
  ._dsEdt{margin:10px 16px 0;background:#16151f;border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;flex-shrink:0}
  ._dsOptRow{display:flex;gap:4px;padding:10px 10px 0;flex-wrap:wrap}
  ._dsOptBtn{padding:5px 10px;border-radius:20px;font-family:'Lora',serif;font-size:0.45rem;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;cursor:pointer;transition:all 0.16s;border:1px solid transparent;background:none}
  ._dsOptBtn.active{background:rgba(255,255,255,0.10);border-color:rgba(255,255,255,0.17);color:#fff}
  ._dsOptBtn:not(.active){background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35)}
  ._dsOptBtn:not(.active):hover{color:rgba(255,255,255,0.60);background:rgba(255,255,255,0.05)}
  ._dsPnl{padding:11px 10px 12px}
  ._dsSec{display:none}
  ._dsSec.on{display:block}
  ._dsPnlLbl{font-family:'Lora',serif;font-size:0.44rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.26);margin-bottom:8px}
  ._dsMtnG{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
  ._dsMtnB{padding:8px 4px;border-radius:8px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.60);font-family:'Lora',serif;font-size:0.60rem;font-weight:600;cursor:pointer;transition:all 0.16s;text-align:center}
  ._dsMtnB:hover{background:rgba(255,255,255,0.07);color:#fff;border-color:rgba(255,255,255,0.16)}
  ._dsMtnB.active{background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.35);color:#E8C547}
  ._dsSpdR{display:flex;gap:5px;margin-top:9px}
  ._dsSpdB{flex:1;padding:7px 5px;border-radius:8px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.45);font-family:'Lora',serif;font-size:0.46rem;font-weight:700;cursor:pointer;transition:all 0.16s;text-align:center}
  ._dsSpdB.active{background:rgba(232,197,71,0.08);border-color:rgba(232,197,71,0.28);color:#E8C547}
  ._dsSpdB:hover:not(.active){background:rgba(255,255,255,0.06);color:#fff}
  ._dsClrG{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  ._dsClrSw{border-radius:9px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.16s;aspect-ratio:1;position:relative}
  ._dsClrSw:hover{transform:scale(1.05)}
  ._dsClrSw.active{border-color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,0.35)}
  ._dsSwFl{width:100%;height:68%}
  ._dsSwNm{position:absolute;bottom:0;left:0;right:0;padding:2px 2px 3px;background:rgba(0,0,0,0.52);font-family:'Lora',serif;font-size:0.38rem;font-weight:700;color:rgba(255,255,255,0.75);text-align:center}
  ._dsStlG{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  ._dsStlB{padding:8px 6px;border-radius:8px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.50);font-family:'Lora',serif;font-size:0.60rem;font-weight:700;cursor:pointer;transition:all 0.16s;text-align:center}
  ._dsStlB:hover{background:rgba(255,255,255,0.07);color:#fff;border-color:rgba(255,255,255,0.16)}
  ._dsStlB.active{background:rgba(232,197,71,0.09);border-color:rgba(232,197,71,0.36);color:#E8C547}
  ._dsFntG{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  ._dsFntC{padding:10px 10px 8px;border-radius:10px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);cursor:pointer;transition:all 0.16s;display:flex;flex-direction:column;gap:3px}
  ._dsFntC:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.14)}
  ._dsFntC.active{background:rgba(232,197,71,0.07);border-color:rgba(232,197,71,0.28)}
  ._dsFntPv{font-size:0.90rem;line-height:1.3;color:rgba(255,255,255,0.88)}
  ._dsFntNm{font-family:'Lora',serif;font-size:0.42rem;font-weight:700;color:rgba(255,255,255,0.36);text-transform:uppercase;letter-spacing:1px}
  ._dsFntC.active ._dsFntNm{color:#E8C547}
  ._dsDlRow{display:flex;gap:8px;padding:10px 16px 18px;flex-shrink:0}
  ._dsDlBtn{flex:1;padding:13px 10px;border-radius:14px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);font-family:'Lora',serif;font-weight:700;font-size:0.50rem;letter-spacing:1.2px;text-transform:uppercase}
  ._dsDlBtn:hover{transform:translateY(-2px)}
  ._dsDlBtn:active{transform:scale(0.97)}
  ._dsDlBtn:disabled{opacity:0.55;cursor:not-allowed;transform:none}
  ._dsDlIco{font-size:0.95rem;line-height:1}
  ._dsDlGif{background:rgba(232,197,71,0.07);border:1px solid rgba(232,197,71,0.22);color:#E8C547}
  ._dsDlGif:hover{background:rgba(232,197,71,0.13);border-color:rgba(232,197,71,0.42);box-shadow:0 6px 20px rgba(232,197,71,0.10)}
  ._dsDlPost{background:rgba(232,197,71,0.09);border:1px solid rgba(232,197,71,0.26);color:#E8C547;flex:1.3}
  ._dsDlPost:hover{background:rgba(232,197,71,0.15);border-color:rgba(232,197,71,0.48);box-shadow:0 6px 20px rgba(232,197,71,0.12)}
  @keyframes _kFU{0%{opacity:0;transform:translateY(18px)}25%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-7px)}}
  @keyframes _kSI{0%{opacity:0;transform:translateX(-24px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(9px)}}
  @keyframes _kPL{0%,100%{opacity:0.35;transform:scale(0.96)}50%{opacity:1;transform:scale(1.03)}}
  @keyframes _kGL{0%,86%,100%{transform:translate(0,0) skew(0deg);filter:none;opacity:1}87%{transform:translate(-4px,2px) skew(-3deg);filter:hue-rotate(90deg) brightness(1.5);opacity:0.8}89%{transform:translate(4px,-2px) skew(3deg);filter:hue-rotate(-90deg);opacity:0.9}91%{transform:translate(-3px,1px);filter:brightness(1.6);opacity:0.85}93%{transform:translate(2px,-1px);filter:none;opacity:1}}
  @keyframes _kWV{0%,100%{transform:translateY(0)}30%{transform:translateY(-9px)}60%{transform:translateY(4px)}}
  @keyframes _kSH{0%{background-position:-300% center}100%{background-position:300% center}}
  @keyframes _kBN{0%,100%{transform:translateY(0)}35%{transform:translateY(-16px)}55%{transform:translateY(-5px)}70%{transform:translateY(-10px)}85%{transform:translateY(-2px)}}
  @keyframes _kTY{0%,4%{width:0;opacity:1}52%,88%{width:100%;opacity:1}94%,100%{width:100%;opacity:0}}
  @keyframes _kBL{0%,100%{border-color:var(--_dsAcc,#E8C547)}50%{border-color:transparent}}
  `;
  document.head.appendChild(s);
}

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
      <div class="_dsFmtRow">
        <button class="_dsFmtBtn gif-active" id="_dsFmtGif" data-fmt="gif"><span class="_dsFmtDot"></span>GIF</button>
        <button class="_dsFmtBtn" id="_dsFmtPost" data-fmt="poster"><span class="_dsFmtDot"></span>Poster</button>
      </div>
      <div class="_dsVwRow">
        <button class="_dsVwBtn active" id="_dsVwCvo">Conversation</button>
        <button class="_dsVwBtn" id="_dsVwCrd">Card</button>
      </div>
      <div class="_dsBody" id="_dsBody">
        <div id="_dsCvoView">
          <div class="_dsCvo" id="_dsCvoBubs"></div>
          <div class="_dsSng" id="_dsSngStrip"></div>
          <div style="height:6px"></div>
        </div>
        <div id="_dsCrdView" style="display:none">
          <div class="_dsCrd">
            <div class="_dsCrdRing" id="_dsCrdRing"><canvas id="_dsCvs"></canvas></div>
          </div>
          <div style="height:6px"></div>
        </div>
        <div class="_dsEdt">
          <div class="_dsOptRow" id="_dsOptRow">
            <button class="_dsOptBtn active" data-sec="motion" id="_dsTabMtn">Motion</button>
            <button class="_dsOptBtn" data-sec="color">Color</button>
            <button class="_dsOptBtn" data-sec="style">Style</button>
            <button class="_dsOptBtn" data-sec="font">Font</button>
          </div>
          <div class="_dsPnl">
            <div class="_dsSec on" id="_dsSec-motion">
              <div class="_dsPnlLbl">Animation style</div>
              <div class="_dsMtnG" id="_dsMtnG">
                <button class="_dsMtnB active" data-m="fade-up">Fade Up</button>
                <button class="_dsMtnB" data-m="typewriter">Type</button>
                <button class="_dsMtnB" data-m="slide-in">Slide</button>
                <button class="_dsMtnB" data-m="pulse">Pulse</button>
                <button class="_dsMtnB" data-m="glitch">Glitch</button>
                <button class="_dsMtnB" data-m="wave">Wave</button>
                <button class="_dsMtnB" data-m="shimmer">Shimmer</button>
                <button class="_dsMtnB" data-m="bounce">Bounce</button>
              </div>
              <div class="_dsPnlLbl" style="margin-top:10px">Speed</div>
              <div class="_dsSpdR" id="_dsSpdR">
                <button class="_dsSpdB" data-d="3.8">Slow</button>
                <button class="_dsSpdB active" data-d="2.4">Normal</button>
                <button class="_dsSpdB" data-d="1.3">Fast</button>
              </div>
            </div>
            <div class="_dsSec" id="_dsSec-color">
              <div class="_dsPnlLbl">Theme</div>
              <div class="_dsClrG">
                <div class="_dsClrSw active" data-theme="gold"><div class="_dsSwFl" style="background:linear-gradient(135deg,#0d0d0d,#E8C547)"></div><div class="_dsSwNm">Gold</div></div>
                <div class="_dsClrSw" data-theme="violet"><div class="_dsSwFl" style="background:linear-gradient(135deg,#1a0033,#c77dff)"></div><div class="_dsSwNm">Violet</div></div>
                <div class="_dsClrSw" data-theme="ocean"><div class="_dsSwFl" style="background:linear-gradient(135deg,#0a1420,#00e5ff)"></div><div class="_dsSwNm">Ocean</div></div>
                <div class="_dsClrSw" data-theme="ember"><div class="_dsSwFl" style="background:linear-gradient(135deg,#1a0a0a,#ff6b6b)"></div><div class="_dsSwNm">Ember</div></div>
                <div class="_dsClrSw" data-theme="forest"><div class="_dsSwFl" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></div><div class="_dsSwNm">Forest</div></div>
                <div class="_dsClrSw" data-theme="rose"><div class="_dsSwFl" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></div><div class="_dsSwNm">Rose</div></div>
                <div class="_dsClrSw" data-theme="mono"><div class="_dsSwFl" style="background:linear-gradient(135deg,#000,#fff)"></div><div class="_dsSwNm">Mono</div></div>
                <div class="_dsClrSw" data-theme="wave"><div class="_dsSwFl" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></div><div class="_dsSwNm">Wave</div></div>
              </div>
            </div>
            <div class="_dsSec" id="_dsSec-style">
              <div class="_dsPnlLbl">Card style</div>
              <div class="_dsStlG">
                <button class="_dsStlB active" data-s="glass">Frosted Glass</button>
                <button class="_dsStlB" data-s="contrast">Deep Contrast</button>
                <button class="_dsStlB" data-s="mesh">Gradient Mesh</button>
                <button class="_dsStlB" data-s="grain">Grain / Editorial</button>
                <button class="_dsStlB" data-s="neon">Neon Outline</button>
                <button class="_dsStlB" data-s="depth">Cinematic</button>
              </div>
            </div>
            <div class="_dsSec" id="_dsSec-font">
              <div class="_dsPnlLbl">Lyric font</div>
              <div class="_dsFntG">
                <div class="_dsFntC active" data-fam="Lora" data-itl="true" data-wgt="400"><div class="_dsFntPv" style="font-family:'Lora',serif;font-style:italic">Say everything</div><div class="_dsFntNm">Lora · Default</div></div>
                <div class="_dsFntC" data-fam="Lora" data-itl="false" data-wgt="700"><div class="_dsFntPv" style="font-family:'Lora',serif;font-weight:700">Say everything</div><div class="_dsFntNm">Lora · Bold</div></div>
                <div class="_dsFntC" data-fam="Lora" data-itl="true" data-wgt="700"><div class="_dsFntPv" style="font-family:'Lora',serif;font-style:italic;font-weight:700">Say everything</div><div class="_dsFntNm">Lora · Bold Italic</div></div>
                <div class="_dsFntC" data-fam="Lora" data-itl="false" data-wgt="500"><div class="_dsFntPv" style="font-family:'Lora',serif;font-weight:500">Say everything</div><div class="_dsFntNm">Lora · Light</div></div>
                
                
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="_dsDlRow" id="_dsDlRow">
        <button class="_dsDlBtn _dsDlGif" id="_dsDlA"><span class="_dsDlIco">◎</span><span id="_dsDlALbl">Download GIF</span></button>
        <button class="_dsDlBtn _dsDlPost" id="_dsDlB"><span class="_dsDlIco">↓</span><span id="_dsDlBLbl">Save Image</span></button>
      </div>
    </div>
  `;
  document.body.appendChild(bd);
  DS.mounted = true;
  _wireEvents();
}

function _wireEvents() {
  _el('_dsX').onclick     = closeSheet;
  _el('_dsVwCvo').onclick = () => _setView('convo');
  _el('_dsVwCrd').onclick = () => _setView('card');
  _el('_dsFmtGif').onclick  = () => _setFormat('gif');
  _el('_dsFmtPost').onclick = () => _setFormat('poster');

  _el('_dsOptRow').addEventListener('click', e => {
    const b = e.target.closest('._dsOptBtn'); if (!b) return;
    _qAll('._dsOptBtn').forEach(x => x.classList.remove('active'));
    _qAll('._dsSec').forEach(x => x.classList.remove('on'));
    b.classList.add('active');
    _el('_dsSec-' + b.dataset.sec).classList.add('on');
  });

  _el('_dsMtnG').addEventListener('click', e => {
    const b = e.target.closest('._dsMtnB'); if (!b) return;
    _qAll('._dsMtnB').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); DS.motion = b.dataset.m; _applyMotion();
  });

  _el('_dsSpdR').addEventListener('click', e => {
    const b = e.target.closest('._dsSpdB'); if (!b) return;
    _qAll('._dsSpdB').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); DS.dur = parseFloat(b.dataset.d); _applyMotion();
  });

  _qAll('._dsClrSw').forEach(sw => sw.addEventListener('click', () => {
    _qAll('._dsClrSw').forEach(x => x.classList.remove('active'));
    sw.classList.add('active'); DS.theme = sw.dataset.theme;
    _applyTheme(); _applyMotion(); _schedRefresh();
  }));

  _qAll('._dsStlB').forEach(b => b.addEventListener('click', () => {
    _qAll('._dsStlB').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); DS.cardStyle = b.dataset.s; _schedRefresh();
  }));

  _qAll('._dsFntC').forEach(c => c.addEventListener('click', () => {
    _qAll('._dsFntC').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    DS.fontFamily = c.dataset.fam; DS.fontItalic = c.dataset.itl === 'true'; DS.fontWeight = c.dataset.wgt || '400';
    _qAll('._dsBblL').forEach(el => {
      el.style.fontFamily = `'${DS.fontFamily}',serif`;
      el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
    });
    _schedRefresh();
  }));

  _el('_dsDlA').onclick = () => _download('primary');
  _el('_dsDlB').onclick = () => _download('secondary');
  _el('_dsBd').addEventListener('click', e => { if (e.target === _el('_dsBd')) closeSheet(); });

  const sheet = _el('_dsSheet'), handle = sheet.querySelector('._dsHandle');
  if (handle) {
    let sy = 0, cy = 0, drag = false;
    handle.addEventListener('touchstart', e => { sy = e.touches[0].clientY; cy = sy; drag = true; sheet.style.transition = 'none'; }, { passive:true });
    handle.addEventListener('touchmove',  e => { if (!drag) return; cy = e.touches[0].clientY; const d = Math.max(0, cy - sy); sheet.style.transform = `translateY(${d}px)`; sheet.style.opacity = String(1 - d/280); }, { passive:true });
    handle.addEventListener('touchend',   () => { if (!drag) return; drag = false; sheet.style.transition = ''; if (cy - sy > 70) closeSheet(); else { sheet.style.transform = ''; sheet.style.opacity = ''; } });
  }
}

function openSheet(post1, post2) {
  if (!post1 || !post2) return;
  _mount();
  DS.post1 = post1; DS.post2 = post2;
  DS.motion = 'fade-up'; DS.dur = 2.4; DS.theme = 'gold';
  DS.cardStyle = 'glass'; DS.fontFamily = 'Lora'; DS.fontItalic = true;
  _qAll('._dsMtnB').forEach(b => b.classList.toggle('active', b.dataset.m === 'fade-up'));
  _qAll('._dsSpdB').forEach(b => b.classList.toggle('active', b.dataset.d === '2.4'));
  _qAll('._dsClrSw').forEach(b => b.classList.toggle('active', b.dataset.theme === 'gold'));
  _qAll('._dsStlB').forEach(b => b.classList.toggle('active', b.dataset.s === 'glass'));
  _qAll('._dsFntC').forEach(b => b.classList.toggle('active', b.dataset.fam === 'Lora'));
  _qAll('._dsOptBtn').forEach((b, i) => b.classList.toggle('active', i === 0));
  _qAll('._dsSec').forEach((s, i) => s.classList.toggle('on', i === 0));
  _populateConvo(); _applyTheme(); _setFormat('gif'); _setView('convo');
  _el('_dsBd').classList.remove('hide');
  document.body.classList.add('_dsOpen');
  DS._savedScrollY = window.scrollY || 0;
}

function closeSheet() {
  _stopCanvas();
  const bd = _el('_dsBd'); if (bd) bd.classList.add('hide');
  document.body.classList.remove('_dsOpen');
  _qAll('._dsBblL').forEach(el => { el.style.cssText = ''; });
  requestAnimationFrame(() => window.scrollTo({ top: DS._savedScrollY, behavior: 'instant' }));
  // Restore echo sheet if hidden by echo→duet flow
  const _eb = document.getElementById('echoSheetBackdrop');
  if (_eb) _eb.style.visibility = '';
}

function _setFormat(fmt) {
  DS.format = fmt;
  _el('_dsFmtGif').className  = '_dsFmtBtn' + (fmt === 'gif'    ? ' gif-active'    : '');
  _el('_dsFmtPost').className = '_dsFmtBtn' + (fmt === 'poster' ? ' poster-active' : '');
  _updateDownloadLabels();
  const mtnTab = _el('_dsTabMtn');
  if (fmt === 'poster') {
    mtnTab.style.display = 'none';
    if (mtnTab.classList.contains('active')) {
      mtnTab.classList.remove('active'); _el('_dsSec-motion').classList.remove('on');
      document.querySelector('[data-sec="color"]').classList.add('active');
      _el('_dsSec-color').classList.add('on');
    }
    _qAll('._dsBblL').forEach(el => { el.style.cssText = ''; });
  } else {
    mtnTab.style.display = '';
    _applyMotion();
  }
  if (DS.view === 'card') _schedRefresh();
}

function _updateDownloadLabels() {
  const isGif = DS.format === 'gif';
  _el('_dsDlALbl').textContent = isGif ? 'Download GIF'  : 'Download Poster';
  _el('_dsDlBLbl').textContent = isGif ? 'Share GIF'     : 'Save Image';
}

function _setView(v) {
  DS.view = v;
  _el('_dsVwCvo').classList.toggle('active', v === 'convo');
  _el('_dsVwCrd').classList.toggle('active', v === 'card');
  _el('_dsCvoView').style.display = v === 'convo' ? '' : 'none';
  _el('_dsCrdView').style.display = v === 'card'  ? '' : 'none';
  _updateDownloadLabels();
  if (v === 'card') { _stopCanvas(); requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas())); }
  else { _stopCanvas(); if (DS.format !== 'poster') _applyMotion(); }
}

function _populateConvo() {
  const p = DS.post1, e = DS.post2; if (!p || !e) return;
  const pk = p.knowledge||{}, ek = e.knowledge||{};
  const pUser = '@'+(p.username||'anonymous').replace(/^@/,'').toUpperCase();
  const eUser = '@'+(e.username||'anonymous').replace(/^@/,'').toUpperCase();
  const pSong = pk.song||p.song||'—', pArt = pk.artist||p.artist||'';
  const eSong = ek.song||e.song||'—', eArt = ek.artist||e.artist||'';
  const pVibe = DS_VIBE[p.emotion]||'#E8C547', eVibe = DS_VIBE[e.emotion]||'#E8C547';
  const sh = _el('_dsSheet');
  sh.style.setProperty('--_dsL', pVibe); sh.style.setProperty('--_dsR', eVibe);
  _el('_dsTtl').textContent = 'Lyric Back';
  _el('_dsCvoBubs').innerHTML = `
    <div class="_dsBbl orig">
      <div class="_dsBblU"><span class="_dsUdot"></span>${_esc(pUser)}</div>
      <div class="_dsBblC">
        <div class="_dsBblL">${_esc(p.text||p.lyric||'')}</div>
        <div class="_dsBblM"><div><div class="_dsBblSn">${_esc(pSong)}</div><div class="_dsBblAr">${_esc(pArt)}</div></div><span class="_dsBblVb">${_esc(p.emotion||'Vibe')}</span></div>
      </div>
    </div>
    <div class="_dsDvd"><div class="_dsDvdL"></div><div class="_dsDvdP">Lyric Back ↩ ${_esc(eUser)}</div><div class="_dsDvdL"></div></div>
    <div class="_dsBbl rply">
      <div class="_dsBblU">${_esc(eUser)}<span class="_dsUdot"></span></div>
      <div class="_dsBblC">
        <div class="_dsBblL">${_esc(e.lyric||e.text||'')}</div>
        <div class="_dsBblM"><div><div class="_dsBblSn">${_esc(eSong)}</div><div class="_dsBblAr">${_esc(eArt)}</div></div><span class="_dsBblVb">${_esc(e.emotion||'Vibe')}</span></div>
      </div>
    </div>`;
  _el('_dsSngStrip').innerHTML = `
    <span class="_dsSngLbl">Songs</span>
    <div class="_dsSngPair">
      <div class="_dsSngItem"><span class="_dsSngN">${_esc(pSong)}</span><span class="_dsSngA">${_esc(pArt)}</span></div>
      <span class="_dsSngSep">↔</span>
      <div class="_dsSngItem"><span class="_dsSngN">${_esc(eSong)}</span><span class="_dsSngA">${_esc(eArt)}</span></div>
    </div>`;
}

function _applyTheme() {
  const m = DS_THEMES[DS.theme]||DS_THEMES.gold, sh = _el('_dsSheet'); if (!sh) return;
  sh.style.setProperty('--_dsAcc', m.accent);
  sh.style.setProperty('--_dsBg',  _mix(m.bg,'#0c0b10',0.35));
  sh.style.setProperty('--_dsBB1', m.bb1); sh.style.setProperty('--_dsBB2', m.bb2);
  sh.style.setProperty('--_dsBD1', m.bd1); sh.style.setProperty('--_dsBD2', m.bd2);
  sh.style.setProperty('--_dsL',   m.l);   sh.style.setProperty('--_dsR',   m.r);
  sh.style.setProperty('--_dsLyC', m.light ? '#0B0B0D' : '#ffffff');
}

function _applyMotion() {
  _schedRefresh();
  if (DS.view !== 'convo' || DS.format === 'poster') return;
  const els = _qAll('._dsBblL'), dur = DS.dur, m = DS.motion;
  const acc = (DS_THEMES[DS.theme]||DS_THEMES.gold).accent;
  els.forEach(el => { el.style.cssText = ''; });
  const bubs = _el('_dsCvoBubs'); if (bubs) void bubs.offsetHeight;
  els.forEach((el, i) => {
    const d = i * 0.16;
    el.style.fontFamily = `'${DS.fontFamily}',serif`;
    el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
    switch (m) {
      case 'fade-up':    el.style.animation = `_kFU ${dur}s ${d}s ease-in-out infinite both`; break;
      case 'slide-in':   el.style.animation = `_kSI ${dur}s ${d}s ease-in-out infinite both`; break;
      case 'pulse':      el.style.animation = `_kPL ${dur}s ${d}s ease-in-out infinite both`; break;
      case 'glitch':     el.style.animation = `_kGL ${dur}s ${d*0.5}s steps(1) infinite`; break;
      case 'wave':       el.style.display='inline-block'; el.style.animation=`_kWV ${dur}s ${d}s ease-in-out infinite`; break;
      case 'bounce':     el.style.display='inline-block'; el.style.animation=`_kBN ${dur}s ${d}s ease infinite`; break;
      case 'shimmer':
        el.style.background=`linear-gradient(90deg,rgba(255,255,255,0.5) 0%,#fff 35%,${acc} 50%,#fff 65%,rgba(255,255,255,0.5) 100%)`;
        el.style.backgroundSize='300% auto'; el.style.webkitBackgroundClip='text';
        el.style.webkitTextFillColor='transparent'; el.style.backgroundClip='text';
        el.style.animation=`_kSH ${dur}s ${d}s linear infinite`; break;
      case 'typewriter':
        el.style.overflow='hidden'; el.style.whiteSpace='nowrap';
        el.style.borderRight=`2px solid ${acc}`; el.style.width='0';
        el.style.animation=`_kTY ${dur}s ${d}s steps(30,end) infinite, _kBL 0.7s ${d}s step-end infinite`; break;
    }
  });
}

function _stopCanvas() {
  DS._loopId++; if (DS._raf) { cancelAnimationFrame(DS._raf); DS._raf = null; } DS._frame = 0;
}

function _startCanvas() {
  _stopCanvas();
  const canvas = _el('_dsCvs'); if (!canvas) return;
  const ring = _el('_dsCrdRing'), dpr = Math.min(window.devicePixelRatio||1, 2), size = ring.clientWidth||300;
  if (size < 10) { requestAnimationFrame(() => _startCanvas()); return; }
  canvas.width = Math.round(size*dpr); canvas.height = Math.round(size*dpr);
  canvas.style.width = size+'px'; canvas.style.height = size+'px';
  const ctx = canvas.getContext('2d'), myId = DS._loopId, opts = _buildOpts();
  const p1 = DS.post1, p2 = DS.post2, totalF = 36;
  const frameMs = Math.round((DS.dur*1000)/totalF); let lastTs = 0;
  const draw = (ts) => {
    if (DS._loopId !== myId) return;
    if (ts - lastTs >= frameMs) {
      lastTs = ts; ctx.setTransform(dpr,0,0,dpr,0,0);
      if (DS.format === 'poster') {
        _drawCardFrame(ctx, size, size, 1.0, DS.motion, p1, p2, opts);
      } else {
        _drawCardFrame(ctx, size, size, DS._frame/totalF, DS.motion, p1, p2, opts);
        DS._frame = (DS._frame+1)%totalF;
      }
    }
    DS._raf = requestAnimationFrame(draw);
  };
  (window._margoFontsReady || Promise.resolve()).then(() => {
    if (DS._loopId !== myId) return;
    DS._raf = requestAnimationFrame(draw);
  });
}

function _schedRefresh() {
  if (DS._refreshTimer) clearTimeout(DS._refreshTimer);
  DS._refreshTimer = setTimeout(() => {
    DS._refreshTimer = null;
    if (DS.view === 'card') { _stopCanvas(); requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas())); }
  }, 80);
}

function _buildOpts() {
  return {
    format:     DS.format,
    theme:      DS.theme,
    cardStyle:  DS.cardStyle,
    fontFamily: DS.fontFamily,
    fontWeight: DS.fontWeight || '400',
    fontItalic: DS.fontItalic,
    motion:     DS.motion,
    dur:        DS.dur,
  };
}

/* ══════════════════════════════════════════════════════════
   DOWNLOAD — identical to v4.2
══════════════════════════════════════════════════════════ */
function _download(which) {
  const p1 = DS.post1, p2 = DS.post2;
  if (!p1 || !p2) return;
  const opts = _buildOpts();

  const btnA = _el('_dsDlA'), btnB = _el('_dsDlB');
  const origA = btnA.innerHTML, origB = btnB.innerHTML;
  const busy = () => { btnA.disabled = true;  btnB.disabled = true;  };
  const done = () => { btnA.innerHTML = origA; btnA.disabled = false;
                       btnB.innerHTML = origB; btnB.disabled = false; };

  const exportOpts = Object.assign({}, opts, {
    onStart:    () => { busy(); },
    onProgress: (pct) => {
      const btn = which === 'primary' ? btnA : btnB;
      btn.innerHTML = `<span class="_dsDlIco">⏳</span><span>${Math.round(pct * 100)}%</span>`;
    },
    onDone:  done,
    onError: () => done(),
  });

  if (typeof window.PlatformPicker !== 'undefined') {
    window.PlatformPicker.pick({
      format: DS.format,
      view:   DS.view,
      p1,
      p2,
      opts: exportOpts,
    });
    return;
  }

  console.warn('[duet-sheet] PlatformPicker not loaded — falling back to direct export');

  if (which === 'primary') {
    if (DS.format === 'gif') {
      if (typeof window.GifExporter === 'undefined') { console.error('[duet-sheet] GifExporter not loaded'); return; }
      busy();
      btnA.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
      window.GifExporter.export(DS.view, p1, p2, {
        ...opts,
        onProgress: pct => {
          btnA.innerHTML = `<span class="_dsDlIco">⏳</span><span>${Math.round(pct*100)}%</span>`;
        },
        onDone:  done,
        onError: () => done(),
      });
    } else {
      if (typeof window.PosterExporter === 'undefined') { console.error('[duet-sheet] PosterExporter not loaded'); return; }
      busy();
      btnA.innerHTML = '<span class="_dsDlIco">⏳</span><span>Saving…</span>';
      window.PosterExporter.export(DS.view, p1, p2, { ...opts, onDone: done, onError: () => done() });
    }
  } else {
    busy();
    btnB.innerHTML = '<span class="_dsDlIco">⏳</span><span>…</span>';
    if (DS.format === 'gif') {
      _snapAndShare(p1, p2, opts).finally(done);
    } else {
      if (typeof window.PosterExporter !== 'undefined') {
        window.PosterExporter.export(DS.view, p1, p2, { ...opts, onDone: done, onError: () => done() });
      } else { done(); }
    }
  }
}

async function _snapAndShare(p1, p2, opts) {
  await (window._margoFontsReady || document.fonts.ready);
  const W = 1080, H = 1080;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const ctx = off.getContext('2d');
  if (DS.view === 'convo') {
    _drawConvoLayoutAnimated(ctx, W, H, 1.0, DS.motion, p1, p2, opts);
  } else {
    _drawCardFrame(ctx, W, H, 1.0, DS.motion, p1, p2, opts);
  }
  return new Promise(res => {
    off.toBlob(async blob => {
      if (!blob) { res(); return; }
      if (navigator.share) {
        try {
          const f = new File([blob], 'margo-duet.png', { type:'image/png' });
          await navigator.share({ files:[f], title:'Lyric Back on Margo', url:'https://trymargo.com' });
        } catch { _triggerDl(blob, `margo-duet-${Date.now()}.png`); }
      } else {
        _triggerDl(blob, `margo-duet-${Date.now()}.png`);
      }
      res();
    }, 'image/png', 0.95);
  });
}

/* ══════════════════════════════════════════════════════════
   _drawConvoLayoutAnimated
   v4.3 FIX: S = Math.min(W,H)/500  (was W/500)
   Everything else identical to v4.2
══════════════════════════════════════════════════════════ */
function _drawConvoLayoutAnimated(ctx, W, H, t, motion, p1, p2, opts) {
  if (!p1||!p2) return;
  const S  = Math.min(W, H) / 500;   /* v4.3 FIX — was: W / 500 */
  const m  = DS_THEMES[opts.theme]||DS_THEMES.gold;
  const pV = DS_VIBE[p1.emotion]||m.l;
  const eV = DS_VIBE[p2.emotion]||m.r;

  ctx.fillStyle = '#07060A';
  ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.10;
  const g1 = ctx.createRadialGradient(W*0.18,H*0.20,0,W*0.18,H*0.20,W*0.65);
  g1.addColorStop(0,pV); g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H); ctx.restore();
  ctx.save(); ctx.globalAlpha=0.09;
  const g2=ctx.createRadialGradient(W*0.82,H*0.80,0,W*0.82,H*0.80,W*0.65);
  g2.addColorStop(0,eV); g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H); ctx.restore();

  ctx.save(); ctx.globalAlpha=0.5;
  const tbar=ctx.createLinearGradient(0,0,W,0);
  tbar.addColorStop(0,'transparent'); tbar.addColorStop(0.35,pV+'99');
  tbar.addColorStop(0.65,eV+'99');   tbar.addColorStop(1,'transparent');
  ctx.fillStyle=tbar; ctx.fillRect(0,0,W,Math.max(2,Math.round(2*S)));
  ctx.restore();

  const PAD_H=Math.round(16*S), logoSz=Math.round(17*S), PAD_TOP=Math.round(14*S);
  const iconSz=Math.round(22*S);
  const ringT = t < 1.0 ? t : -1;
  _drawMargoIcon(ctx, PAD_H, PAD_TOP, iconSz, 0.42, ringT, m);
  ctx.save();
  ctx.font=`700 ${logoSz}px 'Lora',serif`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.38;
  ctx.textBaseline='middle'; ctx.textAlign='left';
  ctx.letterSpacing=`${Math.round(3*S)}px`;
  ctx.fillText('MARGO', PAD_H+iconSz+Math.round(6*S), PAD_TOP+iconSz/2);
  ctx.letterSpacing='0px'; ctx.restore();

  const headerH=PAD_TOP+iconSz+Math.round(10*S);
  const songBarH=Math.round(52*S), footerH=songBarH+Math.round(30*S);
  const innerH=H-headerH-footerH, divY=headerH+innerH*0.50;
  const topT=headerH+Math.round(4*S), topB=divY-Math.round(12*S);
  const botT=divY+Math.round(12*S),   botB=H-footerH-Math.round(4*S);

  const easeOut=x=>1-Math.pow(1-x,3);
  let la1=1,la2=1,ly1=0,ly2=0,lx1=0,lx2=0;
  switch(motion){
    case 'fade-up':
      la1=easeOut(Math.min(1,t/0.45)); la2=easeOut(Math.max(0,Math.min(1,(t-0.30)/0.45)));
      ly1=(1-la1)*14*S; ly2=(1-la2)*14*S; break;
    case 'slide-in':
      la1=easeOut(Math.min(1,t/0.45)); la2=easeOut(Math.max(0,Math.min(1,(t-0.30)/0.45)));
      lx1=-(1-la1)*20*S; lx2=(1-la2)*20*S; break;
    case 'pulse':
      la1=0.45+0.55*Math.abs(Math.sin(t*Math.PI));
      la2=0.45+0.55*Math.abs(Math.sin(t*Math.PI+Math.PI*0.5)); break;
    case 'bounce':
      ly1=-Math.abs(Math.sin(t*Math.PI*2.5))*10*S;
      ly2=-Math.abs(Math.sin(t*Math.PI*2.5+Math.PI))*10*S; break;
    case 'wave':
      ly1=Math.sin(t*Math.PI*3)*8*S; ly2=Math.sin(t*Math.PI*3+Math.PI)*8*S; break;
    default:
      la1=easeOut(Math.min(1,t/0.45)); la2=easeOut(Math.max(0,Math.min(1,(t-0.30)/0.45)));
      ly1=(1-la1)*14*S; ly2=(1-la2)*14*S;
  }
  const divAlpha=easeOut(Math.max(0,Math.min(1,(t-0.15)/0.20)));

  _drawBubbleShell(ctx,W,topT,topB,p1,m,'left', opts,S);
  _drawBubbleShell(ctx,W,botT,botB,p2,m,'right',opts,S);
  _drawDivider(ctx,W,divY,p2,m,divAlpha);
  _drawBubbleLyric(ctx,W,topT,topB,p1,m,'left', opts,S,la1,lx1,ly1,t,motion);
  _drawBubbleLyric(ctx,W,botT,botB,p2,m,'right',opts,S,la2,lx2,ly2,t,motion);

  const sbY=H-footerH+Math.round(4*S), sbX=PAD_H, sbW=W-PAD_H*2, sbH=songBarH-Math.round(4*S);
  ctx.save();
  ctx.fillStyle='#181720'; ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(sbX,sbY,sbW,sbH,Math.round(12*S)); else ctx.rect(sbX,sbY,sbW,sbH);
  ctx.fill(); ctx.stroke();
  const sbCy=sbY+sbH/2;
  const pk1=p1.knowledge||{}, pk2=p2.knowledge||{};
  const s1=(pk1.song||p1.song||'—').substring(0,22), a1=(pk1.artist||p1.artist||'').substring(0,24);
  const s2=(pk2.song||p2.song||'—').substring(0,22), a2=(pk2.artist||p2.artist||'').substring(0,24);
  const stSz=Math.max(6,Math.round(8*S)), snSz=Math.max(8,Math.round(13*S)), arSz=Math.max(6,Math.round(9*S));
  ctx.font=`700 ${stSz}px 'Lora',serif`; ctx.fillStyle='rgba(255,255,255,0.38)';
  ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText('SONGS',sbX+Math.round(10*S),sbCy);
  const lx=sbX+Math.round(60*S);
  ctx.font=`700 ${snSz}px 'Lora',serif`; ctx.fillStyle='#F4F1ED'; ctx.textAlign='left';
  ctx.fillText(s1,lx,sbCy-Math.round(5*S));
  ctx.font=`400 ${arSz}px 'Lora',serif`; ctx.fillStyle='#9A98A4';
  ctx.fillText(a1,lx,sbCy+Math.round(6*S));
  ctx.font=`400 ${Math.round(14*S)}px sans-serif`; ctx.fillStyle=m.accent; ctx.globalAlpha=0.6;
  ctx.textAlign='center'; ctx.fillText('↔',W/2,sbCy); ctx.globalAlpha=1;
  const rx=sbX+sbW-Math.round(10*S);
  ctx.font=`700 ${snSz}px 'Lora',serif`; ctx.fillStyle='#F4F1ED'; ctx.textAlign='right';
  ctx.fillText(s2,rx,sbCy-Math.round(5*S));
  ctx.font=`400 ${arSz}px 'Lora',serif`; ctx.fillStyle='#9A98A4';
  ctx.fillText(a2,rx,sbCy+Math.round(6*S));
  ctx.restore();

  _drawWatermark(ctx,W,H,m);
}

function _drawBubbleShell(ctx,W,areaT,areaB,post,m,side,opts,S){
  S=S||(W/500);
  const PAD_H=Math.round(16*S), col=side==='left'?m.l:m.r;
  const text=(post.text||post.lyric||'').substring(0,120);
  const pk=post.knowledge||{};
  const song=(pk.song||post.song||'').substring(0,28);
  const artist=(pk.artist||post.artist||'').substring(0,32);
  const user='@'+(post.username||'anonymous').replace(/^@/,'').toUpperCase();
  const vibe=(post.emotion||'').toUpperCase();
  const bubbleW=Math.round(W*0.76);
  const bubbleX=side==='left'?PAD_H:W-PAD_H-bubbleW;
  const cPadV=Math.round(12*S), cPadH=Math.round(14*S);
  const _fam=(opts&&opts.fontFamily)?opts.fontFamily:'Lora';
  const _fwt=(opts&&opts.fontWeight)?opts.fontWeight:'400';
  const _fitl=!(opts&&opts.fontItalic===false);
  const ff=`'${_fam}',serif`, _fstyle=_fitl?`italic ${_fwt}`:`${_fwt}`;
  let lyricSz=Math.max(11,Math.round(15*S));
  ctx.font=`${_fstyle} ${lyricSz}px ${ff}`;
  let lines=_wrapText(ctx,text,bubbleW-cPadH*2);
  if(lines.length>5){lyricSz=Math.max(10,Math.round(lyricSz*5/lines.length));ctx.font=`${_fstyle} ${lyricSz}px ${ff}`;lines=_wrapText(ctx,text,bubbleW-cPadH*2);}
  const lh=lyricSz*1.45;
  const snSz=Math.max(7,Math.round(11*S)), arSz=Math.max(6,Math.round(7.5*S)), vbSz=Math.max(5,Math.round(6.5*S));
  const metaDivH=Math.round(8*S), metaPadT=Math.round(7*S);
  const metaH=metaDivH+1+metaPadT+snSz+arSz*1.35;
  const areaH=areaB-areaT;
  const contentH=cPadV+Math.ceil(lines.length*lh)+metaH+cPadV;
  const cardH=Math.min(areaH*0.94,contentH);
  const cardY=areaT+Math.max(0,(areaH-cardH)/2);
  const uSz=Math.max(8,Math.round(9.5*S)), dotR=Math.max(2,Math.round(2.5*S)), dotCy=cardY-Math.round(9*S);
  ctx.save();
  ctx.font=`700 ${uSz}px 'Lora',serif`;
  ctx.fillStyle=col; ctx.globalAlpha=0.90; ctx.textBaseline='middle';
  if(side==='left'){
    ctx.beginPath();ctx.arc(bubbleX+dotR,dotCy,dotR,0,Math.PI*2);ctx.fill();
    ctx.textAlign='left'; ctx.fillText(user,bubbleX+dotR*2+Math.round(4*S),dotCy);
  } else {
    ctx.textAlign='right'; ctx.fillText(user,bubbleX+bubbleW-dotR*2-Math.round(4*S),dotCy);
    ctx.beginPath();ctx.arc(bubbleX+bubbleW-dotR,dotCy,dotR,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  const bigR=Math.round(18*S), smR=Math.round(4*S);
  ctx.save();
  ctx.beginPath();
  if(ctx.roundRect){if(side==='left')ctx.roundRect(bubbleX,cardY,bubbleW,cardH,[bigR,bigR,bigR,smR]);else ctx.roundRect(bubbleX,cardY,bubbleW,cardH,[bigR,bigR,smR,bigR]);}
  else ctx.rect(bubbleX,cardY,bubbleW,cardH);
  ctx.fillStyle=side==='left'?m.bb1.replace(/[\d.]+\)$/,'0.14)'):m.bb2.replace(/[\d.]+\)$/,'0.12)');
  ctx.strokeStyle=side==='left'?m.bd1:m.bd2; ctx.lineWidth=1.5; ctx.fill(); ctx.stroke(); ctx.restore();
  const metaLineY=cardY+cPadV+Math.ceil(lines.length*lh)+metaDivH;
  ctx.save(); ctx.globalAlpha=0.22; ctx.strokeStyle='rgba(255,255,255,0.09)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(bubbleX+cPadH,metaLineY); ctx.lineTo(bubbleX+bubbleW-cPadH,metaLineY); ctx.stroke(); ctx.restore();
  const metaContentY=metaLineY+Math.round(8*S);
  ctx.save();
  ctx.font=`700 ${snSz}px 'Lora',serif`; ctx.fillStyle=m.light?'#0B0B0D':'#ffffff';
  ctx.textBaseline='top'; ctx.textAlign='left'; ctx.fillText(song||'—',bubbleX+cPadH,metaContentY);
  if(artist){ctx.font=`400 ${arSz}px 'Lora',serif`;ctx.fillStyle='rgba(255,255,255,0.50)';ctx.fillText(artist,bubbleX+cPadH,metaContentY+snSz+Math.round(2*S));}
  if(vibe){
    ctx.font=`700 ${vbSz}px 'Lora',serif`;
    const vTW=ctx.measureText(vibe).width, vPH=Math.round(9*S), vPV=Math.round(3*S);
    const vPW=vTW+vPH*2, vPHt=vbSz+vPV*2, vPX=bubbleX+bubbleW-cPadH*0.4-vPW, vPY=metaContentY;
    ctx.fillStyle=col+'28'; ctx.strokeStyle=col+'77'; ctx.lineWidth=1.5;
    ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(vPX,vPY,vPW,vPHt,vPHt/2); else ctx.rect(vPX,vPY,vPW,vPHt);
    ctx.fill(); ctx.stroke(); ctx.fillStyle=col; ctx.textBaseline='middle'; ctx.textAlign='center';
    ctx.fillText(vibe,vPX+vPW/2,vPY+vPHt/2);
  }
  ctx.restore();
}

function _drawBubbleLyric(ctx,W,areaT,areaB,post,m,side,opts,S,alpha,oX,oY,t,motion){
  S=S||(W/500);
  const PAD_H=Math.round(16*S), bubbleW=Math.round(W*0.76);
  const bubbleX=side==='left'?PAD_H:W-PAD_H-bubbleW;
  const cPadV=Math.round(12*S), cPadH=Math.round(14*S);
  const text=(post.text||post.lyric||'').substring(0,120);
  const _fam2=(opts&&opts.fontFamily)?opts.fontFamily:'Lora';
  const _fwt2=(opts&&opts.fontWeight)?opts.fontWeight:'400';
  const _fitl2=!(opts&&opts.fontItalic===false);
  const ff=`'${_fam2}',serif`, _fstyle2=_fitl2?`italic ${_fwt2}`:`${_fwt2}`;
  let lyricSz=Math.max(11,Math.round(15*S));
  ctx.font=`${_fstyle2} ${lyricSz}px ${ff}`;
  let lines=_wrapText(ctx,text,bubbleW-cPadH*2);
  if(lines.length>5){lyricSz=Math.max(10,Math.round(lyricSz*5/lines.length));ctx.font=`${_fstyle2} ${lyricSz}px ${ff}`;lines=_wrapText(ctx,text,bubbleW-cPadH*2);}
  const lh=lyricSz*1.45;
  const snSz=Math.max(7,Math.round(11*S)), arSz=Math.max(6,Math.round(7.5*S));
  const metaDivH=Math.round(8*S), metaPadT=Math.round(7*S);
  const metaH=metaDivH+1+metaPadT+snSz+arSz*1.35;
  const areaH=areaB-areaT;
  const contentH=cPadV+Math.ceil(lines.length*lh)+metaH+cPadV;
  const cardH=Math.min(areaH*0.94,contentH);
  const cardY=areaT+Math.max(0,(areaH-cardH)/2);
  const lyricY=cardY+cPadV;
  ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,alpha)); ctx.translate(oX,oY);
  if(motion==='shimmer'){
    const col=side==='left'?m.l:m.r;
    ctx.font=`${_fstyle2} ${lyricSz}px ${ff}`;
    const shimX=(t*2-0.5)*(bubbleW+lyricSz*4);
    const sg=ctx.createLinearGradient(bubbleX+shimX-lyricSz*3,0,bubbleX+shimX+lyricSz*3,0);
    sg.addColorStop(0,'rgba(255,255,255,0.7)'); sg.addColorStop(0.4,'#ffffff');
    sg.addColorStop(0.5,col); sg.addColorStop(0.6,'#ffffff'); sg.addColorStop(1,'rgba(255,255,255,0.7)');
    ctx.fillStyle=sg;
  } else {
    ctx.font=`${_fstyle2} ${lyricSz}px ${ff}`;
    ctx.fillStyle=m.light?'#0B0B0D':'#ffffff';
  }
  ctx.textBaseline='top'; ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=Math.round(5*S);
  lines.forEach((ln,i)=>ctx.fillText(ln,bubbleX+cPadH,lyricY+i*lh));
  ctx.shadowBlur=0; ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   _drawCardFrame
   v4.3 FIX: S = Math.min(W,H)/500 (was W/500 inline)
             topB/botT use H*0.055 not W*0.055
             motion offsets use S not (W/500)
   Everything else identical to v4.2
══════════════════════════════════════════════════════════ */
function _drawCardFrame(ctx,W,H,t,motion,p1,p2,opts){
  if(!p1||!p2)return;
  const S = Math.min(W, H) / 500;   /* v4.3 FIX — was inline (W/500) throughout */
  const m=DS_THEMES[opts.theme]||DS_THEMES.gold;
  const pV=DS_VIBE[p1.emotion]||m.l, eV=DS_VIBE[p2.emotion]||m.r;
  const isAnim=t<1.0;
  _drawCardBg(ctx,W,H,t,m,pV,eV,opts.cardStyle||'glass',isAnim);
  const pad=W*0.065, mSz=Math.max(12,S*19), divY=H*0.490;
  const iconSz=Math.max(18,S*26);
  const ringT = isAnim ? t : -1;
  _drawMargoIcon(ctx, pad, pad*0.45, iconSz, 0.42, ringT, m);
  ctx.save();
  ctx.font=`700 ${mSz}px 'Lora',serif`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.38;
  ctx.textBaseline='middle'; ctx.textAlign='left';
  ctx.letterSpacing=`${Math.round(3*S)}px`;
  ctx.fillText('MARGO', pad+iconSz+W*0.014, pad*0.45+iconSz/2);
  ctx.letterSpacing='0px'; ctx.restore();
  /* v4.3 FIX: gaps around divider now use H*0.055 not W*0.055
     On 1200x627: H*0.055=34px vs old W*0.055=66px — saves 64px of vertical space */
  const topT=pad+iconSz*1.5, topB=divY-H*0.055, botT=divY+H*0.055, botB=H*0.830;
  const easeOut=x=>1-Math.pow(1-x,3);
  let a1=1,a2=1,oY1=0,oY2=0,oX1=0,oX2=0;
  /* v4.3 FIX: all motion offsets use S instead of (W/500) */
  switch(motion){
    case 'fade-up': a1=easeOut(Math.min(1,t/0.38));a2=easeOut(Math.max(0,Math.min(1,(t-0.38)/0.38)));oY1=(1-a1)*20*S;oY2=(1-a2)*20*S;break;
    case 'slide-in':a1=easeOut(Math.min(1,t/0.38));a2=easeOut(Math.max(0,Math.min(1,(t-0.38)/0.38)));oX1=-(1-a1)*28*S;oX2=(1-a2)*28*S;break;
    case 'pulse':   a1=0.45+0.55*Math.abs(Math.sin(t*Math.PI));a2=0.45+0.55*Math.abs(Math.sin(t*Math.PI+Math.PI*0.5));break;
    case 'bounce':  oY1=-Math.abs(Math.sin(t*Math.PI*2.5))*14*S;oY2=-Math.abs(Math.sin(t*Math.PI*2.5+Math.PI))*14*S;break;
    case 'wave':    oY1=Math.sin(t*Math.PI*3)*10*S;oY2=Math.sin(t*Math.PI*3+Math.PI)*10*S;break;
    case 'glitch':  if(t>0.86&&t<0.93){oX1=(Math.random()-0.5)*8*S;oY1=(Math.random()-0.5)*4*S;}break;
    default:        a1=easeOut(Math.min(1,t/0.38));a2=easeOut(Math.max(0,Math.min(1,(t-0.38)/0.38)));oY1=(1-a1)*20*S;oY2=(1-a2)*20*S;
  }
  const dA=easeOut(Math.max(0,Math.min(1,(t-0.28)/0.18)));
  _cardZone_p1 = p1; // tells _drawCardZone which post is 'left' vs 'right'
  _drawCardZone(ctx,W,topT,topB,p1,m,pad,opts,isAnim?a1:1,oX1,oY1,t,motion,S);
  _drawDivider(ctx,W,divY,p2,m,isAnim?dA:1);
  _drawCardZone(ctx,W,botT,botB,p2,m,pad,opts,isAnim?a2:1,oX2,oY2,t,motion,S);
  _drawSongsBar(ctx,W,H*0.842,H*0.918,p1,p2,m,pad);
  _drawWatermark(ctx,W,H,m);
}

function _drawCardBg(ctx,W,H,t,m,pV,eV,style,isAnim){
  const easeOut=x=>1-Math.pow(1-x,3);
  switch(style){
    case 'contrast':ctx.fillStyle='#000000';ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=0.22;const gc=ctx.createRadialGradient(W*.15,H*.15,0,W*.15,H*.15,W*.8);gc.addColorStop(0,pV);gc.addColorStop(1,'transparent');ctx.fillStyle=gc;ctx.fillRect(0,0,W,H);ctx.restore();break;
    case 'mesh':{const mg=ctx.createLinearGradient(0,0,W,H);mg.addColorStop(0,m.bg);mg.addColorStop(0.4,_mix(pV,m.bg,0.75));mg.addColorStop(0.6,_mix(eV,m.bg,0.75));mg.addColorStop(1,m.bg);ctx.fillStyle=mg;ctx.fillRect(0,0,W,H);break;}
    case 'grain':ctx.fillStyle=m.bg;ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=0.028;for(let y=0;y<H;y+=3)for(let x=0;x<W;x+=3){const v=Math.random()*255|0;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,3,3);}ctx.restore();break;
    case 'neon':ctx.fillStyle='#020202';ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=0.35;const ng=ctx.createLinearGradient(0,0,W,H);ng.addColorStop(0,pV);ng.addColorStop(1,eV);ctx.strokeStyle=ng;ctx.lineWidth=Math.max(2,W*0.006);ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W*0.016,H*0.016,W*0.968,H*0.968,W*0.025);else ctx.rect(W*0.016,H*0.016,W*0.968,H*0.968);ctx.stroke();ctx.restore();break;
    case 'depth':{const dg=ctx.createRadialGradient(W*.5,H*.38,0,W*.5,H*.5,W*.82);dg.addColorStop(0,_mix(m.bg,'#1a1520',0.5));dg.addColorStop(1,'#000000');ctx.fillStyle=dg;ctx.fillRect(0,0,W,H);break;}
    default:{const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,m.bg);bg.addColorStop(1,_mix(m.bg,'#000000',0.4));ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=0.18;const g1=ctx.createRadialGradient(W*.2,H*.22,0,W*.2,H*.22,W*.6);g1.addColorStop(0,pV);g1.addColorStop(1,'transparent');ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);ctx.restore();ctx.save();ctx.globalAlpha=0.18*(isAnim?easeOut(Math.min(1,t/0.7)):1);const g2=ctx.createRadialGradient(W*.8,H*.78,0,W*.8,H*.78,W*.6);g2.addColorStop(0,eV);g2.addColorStop(1,'transparent');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);ctx.restore();}
  }
}

function _drawCardZone(ctx,W,zT,zB,post,m,pad,opts,lyricAlpha,oX,oY,t,motion,S){
  /* v4.4: full bubble structure matching convo quality — username, bubble bg/border,
     lyric text, metadata separator, song/artist, vibe badge */
  // S is passed in from _drawCardFrame (= Math.min(W,H)/500) — never recompute locally
  if (!S) S = Math.min(W,H) / 500;
  const zH = zB - zT;
  const side = (post === _cardZone_p1) ? 'left' : 'right';
  const col = side === 'left' ? m.l : m.r;
  const text = (post.text||post.lyric||'').substring(0,120);
  const pk = post.knowledge||{};
  const song = (pk.song||post.song||'').substring(0,28);
  const artist = (pk.artist||post.artist||'').substring(0,32);
  const user = '@'+(post.username||'anonymous').replace(/^@/,'').toUpperCase();
  const vibe = (post.emotion||'').toUpperCase();

  // Bubble spans 88% of width — wider than convo (76%) for card's editorial feel
  const bubbleW = Math.round(W * 0.88);
  const bubbleX = side === 'left' ? pad : W - pad - bubbleW;

  // Font sizing — cap relative to zone height so nothing overflows
  const fam=(opts&&opts.fontFamily)?opts.fontFamily:'Lora';
  const fwt=(opts&&opts.fontWeight)?opts.fontWeight:'400';
  const fitl = !(opts&&opts.fontItalic===false);
  const fstyle = fitl ? `italic ${fwt}` : `${fwt}`;
  const ff = `'${fam}',serif`;
  const cPadH = Math.round(Math.min(16, W*0.014));
  const cPadV = Math.round(Math.min(12, zH*0.07));
  const snSz = Math.max(7, Math.min(Math.round(11*S), zH*0.09));
  const arSz = Math.max(6, Math.min(Math.round(7.5*S), zH*0.07));
  const vbSz = Math.max(5, Math.min(Math.round(6.5*S), zH*0.065));
  const metaDivH = Math.round(Math.min(8*S, zH*0.06));
  const metaH = metaDivH + 1 + Math.round(zH*0.04) + snSz + arSz*1.3 + cPadV;

  // Lyric font: 18*S base (bigger than convo's 15*S since card zones are larger)
  // cap at 30% of zone height so nothing overflows even on short wide canvases
  let lyricSz = Math.min(Math.round(18*S), zH*0.30);
  ctx.font = `${fstyle} ${lyricSz}px ${ff}`;
  let lines = _wrapText(ctx, text, bubbleW - cPadH*2);
  // Shrink further only if lines still overflow the available vertical space
  const maxLines = Math.floor((zH*0.90 - metaH - cPadV*2) / (lyricSz*1.45));
  if (lines.length > Math.max(2, maxLines)) {
    lyricSz = Math.max(Math.round(10*S), Math.floor(lyricSz * Math.max(2,maxLines) / lines.length));
    ctx.font = `${fstyle} ${lyricSz}px ${ff}`;
    lines = _wrapText(ctx, text, bubbleW - cPadH*2);
  }
  const lh = lyricSz * 1.45;
  const contentH = cPadV + Math.ceil(lines.length*lh) + metaH + cPadV;
  const cardH = Math.min(zH * 0.94, contentH);
  const cardY = zT + Math.max(0, (zH - cardH) / 2);

  // ── Username label above bubble ──
  const uSz = Math.max(7, Math.round(9*S));
  const dotR = Math.max(2, Math.round(2.5*S));
  const dotCy = cardY - Math.round(Math.max(7, 9*S));
  ctx.save();
  ctx.font = `700 ${uSz}px 'Lora',serif`;
  ctx.fillStyle = col; ctx.globalAlpha = 0.90; ctx.textBaseline = 'middle';
  if (side === 'left') {
    ctx.beginPath(); ctx.arc(bubbleX+dotR, dotCy, dotR, 0, Math.PI*2); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillText(user, bubbleX+dotR*2+Math.round(4*S), dotCy);
  } else {
    ctx.textAlign = 'right'; ctx.fillText(user, bubbleX+bubbleW-dotR*2-Math.round(4*S), dotCy);
    ctx.beginPath(); ctx.arc(bubbleX+bubbleW-dotR, dotCy, dotR, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Bubble background + border ──
  const bigR = Math.round(Math.min(18*S, zH*0.12));
  const smR  = Math.round(Math.min(4*S,  zH*0.03));
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    if (side==='left') ctx.roundRect(bubbleX, cardY, bubbleW, cardH, [bigR,bigR,bigR,smR]);
    else               ctx.roundRect(bubbleX, cardY, bubbleW, cardH, [bigR,bigR,smR,bigR]);
  } else { ctx.rect(bubbleX, cardY, bubbleW, cardH); }
  ctx.fillStyle   = side==='left' ? m.bb1.replace(/[\d.]+\)$/,'0.18)') : m.bb2.replace(/[\d.]+\)$/,'0.16)');
  ctx.strokeStyle = side==='left' ? m.bd1 : m.bd2;
  ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
  ctx.restore();

  // ── Lyric text (with animation) ──
  const lyricY = cardY + cPadV;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, lyricAlpha));
  ctx.translate(oX, oY);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = Math.round(6*S);
  if (motion === 'shimmer') {
    const shimX = (t*2-0.5)*(bubbleW+lyricSz*4);
    const sg = ctx.createLinearGradient(bubbleX+shimX-lyricSz*3,0,bubbleX+shimX+lyricSz*3,0);
    sg.addColorStop(0,'rgba(255,255,255,0.7)'); sg.addColorStop(0.4,'#ffffff');
    sg.addColorStop(0.5,col); sg.addColorStop(0.6,'#ffffff'); sg.addColorStop(1,'rgba(255,255,255,0.7)');
    ctx.fillStyle = sg;
  } else if (motion==='glitch' && t>0.86 && t<0.93) {
    ctx.filter = `hue-rotate(${Math.random()*180}deg) brightness(1.4)`;
    ctx.fillStyle = '#ffffff';
  } else {
    ctx.fillStyle = m.light ? '#0B0B0D' : '#ffffff';
  }
  ctx.font = `${fstyle} ${lyricSz}px ${ff}`;
  lines.forEach((ln,i) => ctx.fillText(ln, bubbleX+cPadH, lyricY+i*lh));
  ctx.shadowBlur = 0; ctx.filter = 'none';
  ctx.restore();

  // ── Metadata: separator + song/artist + vibe badge ──
  const metaLineY = cardY + cPadV + Math.ceil(lines.length*lh) + metaDivH;
  ctx.save();
  ctx.globalAlpha = 0.20; ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bubbleX+cPadH, metaLineY); ctx.lineTo(bubbleX+bubbleW-cPadH, metaLineY); ctx.stroke();
  ctx.restore();
  const metaY = metaLineY + Math.round(Math.max(4, 6*S));
  ctx.save();
  ctx.textBaseline = 'top'; ctx.globalAlpha = Math.max(0, Math.min(1, lyricAlpha));
  ctx.font = `700 ${snSz}px 'Lora',serif`;
  ctx.fillStyle = m.light ? '#0B0B0D' : '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(song||'—', bubbleX+cPadH, metaY);
  if (artist) {
    ctx.font = `400 ${arSz}px 'Lora',serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.fillText(artist, bubbleX+cPadH, metaY+snSz+Math.round(2*S));
  }
  if (vibe) {
    ctx.font = `700 ${vbSz}px 'Lora',serif`;
    const vTW = ctx.measureText(vibe).width;
    const vPH = Math.round(Math.min(9*S, zH*0.065));
    const vPV = Math.round(Math.min(3*S, zH*0.025));
    const vPW = vTW + vPH*2, vPHt = vbSz + vPV*2;
    const vPX = bubbleX+bubbleW-cPadH*0.5-vPW, vPY = metaY;
    ctx.fillStyle = col+'28'; ctx.strokeStyle = col+'77'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(vPX,vPY,vPW,vPHt,vPHt/2); else ctx.rect(vPX,vPY,vPW,vPHt);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(vibe, vPX+vPW/2, vPY+vPHt/2);
  }
  ctx.restore();
}

// Internal ref so _drawCardZone can detect which post is p1 vs p2 for side alignment
let _cardZone_p1 = null;

function _drawDivider(ctx,W,divY,echoPost,m,alpha){
  if(alpha<=0)return;
  const user='@'+(echoPost.username||'anonymous').replace(/^@/,'').toUpperCase();
  const dText=`LYRIC BACK ↩  ${user}`, dfs=Math.max(9,W*0.020);
  ctx.save(); ctx.globalAlpha=alpha; ctx.font=`800 ${dfs}px 'Lora',serif`;
  const dTW=ctx.measureText(dText).width, pH=dfs*2.1, pPad=W*0.026, pW=dTW+pPad*2, pX=W/2-pW/2, pY=divY-pH/2, pR=pH/2, gap=pW/2+W*0.018;
  [[W*0.04,W/2-gap],[W/2+gap,W*0.96]].forEach(([x1,x2])=>{const lg=ctx.createLinearGradient(x1,0,x2,0);if(x1<W/2){lg.addColorStop(0,'transparent');lg.addColorStop(1,m.accent+'44');}else{lg.addColorStop(0,m.accent+'44');lg.addColorStop(1,'transparent');}ctx.fillStyle=lg;ctx.fillRect(x1,divY-0.75,x2-x1,1.5);});
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(pX,pY,pW,pH,pR);else ctx.rect(pX,pY,pW,pH);
  ctx.fillStyle=m.light?'rgba(0,0,0,0.07)':'rgba(232,197,71,0.09)';ctx.fill();
  ctx.strokeStyle=m.accent+'55';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=m.accent;ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(dText,W/2,divY);
  ctx.restore();
}

function _drawSongsBar(ctx,W,barT,barB,p1,p2,m,pad){
  const bH=barB-barT;ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.04)';ctx.strokeStyle='rgba(255,255,255,0.09)';ctx.lineWidth=1;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(pad*0.75,barT,W-pad*1.5,bH,W*0.016);else ctx.rect(pad*0.75,barT,W-pad*1.5,bH);ctx.fill();ctx.stroke();
  const cy=barT+bH/2,lfs=Math.max(8,W*0.019),sfs=Math.max(8,W*0.021),afs=Math.max(7,W*0.014);
  ctx.font=`700 ${lfs}px 'Lora',serif`;ctx.fillStyle='rgba(255,255,255,0.55)';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText('SONGS',pad,cy);
  const pk1=p1.knowledge||{},s1=(pk1.song||p1.song||'').substring(0,18),pk2=p2.knowledge||{},s2=(pk2.song||p2.song||'').substring(0,18);
  ctx.font=`700 ${sfs}px 'Lora',serif`;ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(s1,W*0.26,cy-afs*0.5);
  ctx.font=`400 ${afs}px 'Lora',serif`;ctx.fillStyle='rgba(255,255,255,0.38)';ctx.fillText(pk1.artist||p1.artist||'',W*0.26,cy+sfs*0.55);
  ctx.font=`400 ${sfs*1.1}px sans-serif`;ctx.fillStyle=m.accent;ctx.globalAlpha=0.65;ctx.textAlign='center';ctx.fillText('↔',W/2,cy);ctx.globalAlpha=1;
  ctx.font=`700 ${sfs}px 'Lora',serif`;ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText(s2,W-pad,cy-afs*0.5);
  ctx.font=`400 ${afs}px 'Lora',serif`;ctx.fillStyle='rgba(255,255,255,0.38)';ctx.fillText(pk2.artist||p2.artist||'',W-pad,cy+sfs*0.55);
  ctx.restore();
}

function _drawWatermark(ctx,W,H,m){
  const fs=Math.max(8,W*0.016),txt='trymargo.com';ctx.save();
  ctx.font=`700 ${fs}px 'Lora',serif`;ctx.textBaseline='middle';ctx.textAlign='center';
  const tw=ctx.measureText(txt).width,pw=tw+W*0.040,ph=fs*1.85,px=W/2-pw/2,py=H-W*0.034-ph/2;
  ctx.globalAlpha=0.78;ctx.fillStyle='rgba(0,0,0,0.82)';
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(px,py,pw,ph,ph/2);else ctx.rect(px,py,pw,ph);ctx.fill();
  ctx.globalAlpha=0.50;ctx.strokeStyle=m.accent;ctx.lineWidth=1;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(px,py,pw,ph,ph/2);else ctx.rect(px,py,pw,ph);ctx.stroke();
  ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillText(txt,W/2,py+ph/2);ctx.restore();
}

/* ─────────────────────────────────────────────
   _drawMargoIcon — identical to v4.2
───────────────────────────────────────────── */
function _drawMargoIcon(ctx, x, y, sz, alpha, ringT, m) {
  ctx.save();
  const cx = x + sz/2, cy = y + sz/2, r = sz/2;

  if (ringT >= 0) {
    const easeOut = v => 1 - Math.pow(1-v, 3);
    const rA = easeOut(Math.min(1, ringT / 0.6));
    const ringR = r * (1.28 + rA * 0.22);
    const ringAlpha = alpha * (0.6 - rA * 0.5);
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI*2);
    ctx.strokeStyle = m ? m.accent : '#E8C547';
    ctx.lineWidth = Math.max(1, sz * 0.045);
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.90, 0, Math.PI*2);
  ctx.fillStyle = '#E8C547';
  ctx.fill();

  const sc = sz / 80;
  const pts = [[19,55],[19,28],[31,44],[40,30],[49,44],[61,28],[61,55]];
  ctx.globalAlpha = 1.0;
  ctx.beginPath();
  ctx.moveTo(x + pts[0][0]*sc, y + pts[0][1]*sc);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i][0]*sc, y + pts[i][1]*sc);
  ctx.strokeStyle = '#0C0C0E';
  ctx.lineWidth = Math.max(1.5, sz * 0.095);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + 40*sc, y + 60*sc, Math.max(1.5, 4*sc), 0, Math.PI*2);
  ctx.fillStyle = '#0C0C0E';
  ctx.globalAlpha = 1.0;
  ctx.fill();

  ctx.restore();
}

function _triggerDl(blob,name){if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),15000);}
function _el(id){return document.getElementById(id);}
function _qAll(sel){return Array.from(document.querySelectorAll(sel));}
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _wrapText(ctx,text,maxW){const words=text.split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);return lines;}
function _mix(h1,h2,t){const expand=c=>{let h=c.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};const a=expand(h1),b=expand(h2);return `rgb(${Math.round(a[0]*(1-t)+b[0]*t)},${Math.round(a[1]*(1-t)+b[1]*t)},${Math.round(a[2]*(1-t)+b[2]*t)})`;}

window._dsDrawConvoFrame = function(ctx, W, H, t, motion, p1, p2, opts) {
  _drawConvoLayoutAnimated(ctx, W, H, t, motion, p1, p2, opts);
};

window._dsDrawCardFrame = function(ctx, W, H, t, motion, p1, p2, opts) {
  _drawCardFrame(ctx, W, H, t, motion, p1, p2, opts);
};

window._dsDrawConvoStatic = function(ctx, W, H, p1, p2, opts) {
  _drawConvoLayoutAnimated(ctx, W, H, 1.0, (opts && opts.motion) || 'fade-up', p1, p2, opts);
};

window.openDuetSheet  = openSheet;
window.closeDuetSheet = closeSheet;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _mount);
else _mount();

})();
