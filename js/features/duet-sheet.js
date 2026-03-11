/* ============================================================
   MARGO — js/duet-sheet.js  v3.0
   Complete rewrite. All bugs fixed:
   ✓ NO FREEZING — single RAF loop guard, debounced refresh
   ✓ GIF / Poster toggle at TOP of sheet
   ✓ Download label matches format (Download GIF / Download Poster)
   ✓ Style / Color / Motion / Font all update canvas preview live
   ✓ Card view matches Conversation view quality
   ✓ No overlapping elements
   ✓ Flat js/ paths — works on concept-v2-clean branch
   ✓ duet-mode.js aliases called safely with existence check
   ============================================================ */

(function () {
'use strict';

/* ══════════════════════════════════════════════════════════
   STATE — single source of truth
══════════════════════════════════════════════════════════ */
const DS = {
  post1:      null,
  post2:      null,
  mounted:    false,
  view:       'convo',   // 'convo' | 'card'
  format:     'gif',     // 'gif'   | 'poster'
  motion:     'fade-up',
  dur:        2.4,
  theme:      'gold',
  cardStyle:  'glass',
  fontFamily: 'DM Serif Display',
  fontItalic: true,
  // RAF state — only ONE loop ever runs
  _raf:       null,
  _loopId:    0,         // incremented on every stop; loop checks its own id
  _frame:     0,
  _refreshTimer: null,   // debounce timer
  _savedScrollY: 0,
};

/* ── Vibe colours ── */
const DS_VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

/* ── Theme metadata ── */
const DS_THEMES = {
  gold:   { accent:'#E8C547', bg:'#07060E', l:'#FF6B9D', r:'#6B8CFF',  bb1:'rgba(232,197,71,0.10)',  bb2:'rgba(107,140,255,0.09)', bd1:'rgba(232,197,71,0.28)',  bd2:'rgba(107,140,255,0.28)',  light:false },
  violet: { accent:'#c77dff', bg:'#0e0018', l:'#ff71ce', r:'#05ffa1',  bb1:'rgba(199,125,255,0.10)', bb2:'rgba(5,255,161,0.09)',   bd1:'rgba(199,125,255,0.28)', bd2:'rgba(5,255,161,0.28)',   light:false },
  ocean:  { accent:'#00e5ff', bg:'#04090f', l:'#00e5ff', r:'#0070ff',  bb1:'rgba(0,229,255,0.10)',   bb2:'rgba(0,112,255,0.09)',   bd1:'rgba(0,229,255,0.28)',   bd2:'rgba(0,112,255,0.28)',   light:false },
  ember:  { accent:'#ff6b6b', bg:'#0f0404', l:'#ff6b6b', r:'#ffb347',  bb1:'rgba(255,107,107,0.10)', bb2:'rgba(255,179,71,0.09)',  bd1:'rgba(255,107,107,0.28)', bd2:'rgba(255,179,71,0.28)',  light:false },
  forest: { accent:'#50fa7b', bg:'#020f06', l:'#50fa7b', r:'#00e5c0',  bb1:'rgba(80,250,123,0.10)',  bb2:'rgba(0,229,192,0.09)',   bd1:'rgba(80,250,123,0.28)',  bd2:'rgba(0,229,192,0.28)',   light:false },
  rose:   { accent:'#f4a4c0', bg:'#0f0508', l:'#f4a4c0', r:'#c084fc',  bb1:'rgba(244,164,192,0.10)', bb2:'rgba(192,132,252,0.09)', bd1:'rgba(244,164,192,0.28)', bd2:'rgba(192,132,252,0.28)', light:false },
  mono:   { accent:'#ffffff', bg:'#080808', l:'#ffffff',  r:'#aaaaaa',  bb1:'rgba(255,255,255,0.08)', bb2:'rgba(170,170,170,0.07)', bd1:'rgba(255,255,255,0.18)', bd2:'rgba(170,170,170,0.18)', light:false },
  wave:   { accent:'#05ffa1', bg:'#150520', l:'#ff71ce', r:'#05ffa1',  bb1:'rgba(255,113,206,0.10)', bb2:'rgba(5,255,161,0.09)',   bd1:'rgba(255,113,206,0.28)', bd2:'rgba(5,255,161,0.28)',   light:false },
  white:  { accent:'#0B0B0D', bg:'#f5f1e8', l:'#c0392b', r:'#1a6fbd',  bb1:'rgba(192,57,43,0.08)',   bb2:'rgba(26,111,189,0.08)',  bd1:'rgba(192,57,43,0.22)',   bd2:'rgba(26,111,189,0.22)',  light:true  },
};

/* ══════════════════════════════════════════════════════════
   CSS INJECTION
══════════════════════════════════════════════════════════ */
function _injectCSS() {
  if (document.getElementById('_dsCSS')) return;
  const s = document.createElement('style');
  s.id = '_dsCSS';
  s.textContent = `
  /* ── BACKDROP ── */
  #_dsBd {
    position:fixed;inset:0;z-index:900;
    background:rgba(0,0,0,0.90);
    backdrop-filter:blur(18px) saturate(0.5);
    -webkit-backdrop-filter:blur(18px) saturate(0.5);
    overflow-y:auto;overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    display:flex;align-items:flex-end;justify-content:center;
    animation:_dsBdIn 0.22s ease;
  }
  #_dsBd.hide{display:none!important}
  body._dsOpen{overflow:hidden}
  @keyframes _dsBdIn{from{opacity:0}to{opacity:1}}

  /* ── SHEET ── */
  #_dsSheet {
    width:100%;max-width:500px;
    background:var(--_dsBg,#0c0b10);
    border:1px solid rgba(255,255,255,0.07);
    border-radius:26px 26px 0 0;
    display:flex;flex-direction:column;
    box-shadow:0 -16px 80px rgba(0,0,0,0.95);
    animation:_dsUp 0.38s cubic-bezier(0.16,1,0.3,1);
    max-height:92vh;
    overflow:hidden;
    transition:background 0.3s ease;
  }
  @media(min-width:540px){
    #_dsSheet{border-radius:22px;margin:20px auto 20px;animation:_dsFd 0.3s cubic-bezier(0.16,1,0.3,1)}
  }
  @keyframes _dsUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes _dsFd{from{transform:translateY(20px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}

  /* ── HANDLE + HEADER ── */
  ._dsHandle{width:32px;height:4px;border-radius:2px;background:rgba(255,255,255,0.10);margin:10px auto 0;flex-shrink:0}
  ._dsHdr{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 0;flex-shrink:0}
  ._dsTtl{font-family:'Syne',sans-serif;font-weight:800;font-size:0.82rem;letter-spacing:2.5px;text-transform:uppercase;
    background:linear-gradient(90deg,#fff 20%,var(--_dsAcc,#E8C547) 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  ._dsX{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);
    color:rgba(255,255,255,0.4);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.18s}
  ._dsX:hover{background:rgba(255,255,255,0.12);color:#fff}

  /* ── FORMAT TOGGLE — TOP ── */
  ._dsFmtRow{display:flex;gap:6px;padding:12px 16px 0;flex-shrink:0}
  ._dsFmtBtn{flex:1;padding:10px 8px;border-radius:12px;font-family:'Space Mono',monospace;font-size:0.56rem;
    font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;
    border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.35);
    display:flex;align-items:center;justify-content:center;gap:6px}
  ._dsFmtBtn.gif-active{background:rgba(0,229,255,0.10);border-color:rgba(0,229,255,0.35);color:#00E5FF}
  ._dsFmtBtn.poster-active{background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.35);color:#E8C547}
  ._dsFmtBtn:not(.gif-active):not(.poster-active):hover{color:rgba(255,255,255,0.65);background:rgba(255,255,255,0.06)}
  ._dsFmtDot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  ._dsFmtBtn.gif-active ._dsFmtDot{background:#00E5FF;box-shadow:0 0 6px #00E5FF}
  ._dsFmtBtn.poster-active ._dsFmtDot{background:#E8C547;box-shadow:0 0 6px #E8C547}

  /* ── VIEW TOGGLE ── */
  ._dsVwRow{display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 16px 0;flex-shrink:0}
  ._dsVwBtn{font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;letter-spacing:1px;
    text-transform:uppercase;padding:6px 16px;border-radius:20px;cursor:pointer;transition:all 0.18s;
    border:1px solid transparent;background:none;color:rgba(255,255,255,0.38)}
  ._dsVwBtn.active{background:rgba(232,197,71,0.10);border-color:rgba(232,197,71,0.30);color:var(--_dsAcc,#E8C547)}
  ._dsVwBtn:not(.active){background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.08)}
  ._dsVwBtn:not(.active):hover{color:rgba(255,255,255,0.70);background:rgba(255,255,255,0.06)}

  /* ── SCROLLABLE BODY ── */
  ._dsBody{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;min-height:0}
  ._dsBody::-webkit-scrollbar{width:3px}
  ._dsBody::-webkit-scrollbar-track{background:transparent}
  ._dsBody::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}

  /* ── CONVERSATION VIEW ── */
  ._dsCvo{padding:14px 16px 10px;display:flex;flex-direction:column;gap:10px}
  ._dsBbl{max-width:84%;display:flex;flex-direction:column;gap:5px;animation:_dsBblIn 0.4s cubic-bezier(0.16,1,0.3,1) both}
  @keyframes _dsBblIn{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  ._dsBbl.orig{align-self:flex-start;animation-delay:0.08s}
  ._dsBbl.rply{align-self:flex-end;align-items:flex-end;animation-delay:0.28s}
  ._dsBblU{font-family:'Syne',sans-serif;font-size:0.58rem;font-weight:800;
    display:flex;align-items:center;gap:5px;padding:0 4px;letter-spacing:0.04em}
  ._dsBbl.orig ._dsBblU{color:var(--_dsL,#FF6B9D)}
  ._dsBbl.rply ._dsBblU{color:var(--_dsR,#6B8CFF);flex-direction:row-reverse}
  ._dsUdot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
  ._dsBbl.orig ._dsUdot{background:var(--_dsL,#FF6B9D)}
  ._dsBbl.rply ._dsUdot{background:var(--_dsR,#6B8CFF)}
  ._dsBblC{padding:13px 15px;border-radius:18px;position:relative;overflow:hidden}
  ._dsBbl.orig ._dsBblC{background:var(--_dsBB1,rgba(255,107,157,0.09));border:1px solid var(--_dsBD1,rgba(255,107,157,0.25));border-bottom-left-radius:4px}
  ._dsBbl.rply ._dsBblC{background:var(--_dsBB2,rgba(107,140,255,0.09));border:1px solid var(--_dsBD2,rgba(107,140,255,0.25));border-bottom-right-radius:4px}
  ._dsBblL{font-family:'DM Serif Display',serif;font-style:italic;font-size:1.12rem;line-height:1.5;
    color:var(--_dsLyC,#fff);position:relative;z-index:1}
  ._dsBblM{margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.09);
    position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px}
  ._dsBblSn{font-family:'DM Sans',sans-serif;font-size:0.76rem;font-weight:700;color:var(--_dsLyC,#fff)}
  ._dsBblAr{font-family:'Space Mono',monospace;font-size:0.52rem;color:rgba(255,255,255,0.5);margin-top:2px}
  ._dsBblVb{font-family:'Syne',sans-serif;font-size:0.46rem;font-weight:800;text-transform:uppercase;
    padding:3px 9px;border-radius:20px;flex-shrink:0;letter-spacing:0.05em}
  ._dsBbl.orig ._dsBblVb{background:rgba(255,107,157,0.14);color:var(--_dsL,#FF9DC0);border:1px solid rgba(255,107,157,0.28)}
  ._dsBbl.rply ._dsBblVb{background:rgba(107,140,255,0.14);color:var(--_dsR,#9DB5FF);border:1px solid rgba(107,140,255,0.28)}
  ._dsDvd{display:flex;align-items:center;gap:8px;padding:1px 0;animation:_dsBblIn 0.36s cubic-bezier(0.16,1,0.3,1) 0.18s both}
  ._dsDvdL{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--_dsAcc,#E8C547)33,transparent)}
  ._dsDvdP{font-family:'Syne',sans-serif;font-size:0.48rem;font-weight:800;letter-spacing:0.06em;
    text-transform:uppercase;color:var(--_dsAcc,#E8C547);background:rgba(232,197,71,0.09);
    border:1px solid rgba(232,197,71,0.26);padding:5px 12px;border-radius:20px;white-space:nowrap}
  ._dsSng{margin:5px 16px 0;padding:10px 13px;background:#181720;border-radius:12px;
    border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  ._dsSngLbl{font-family:'Syne',sans-serif;font-size:0.46rem;font-weight:800;text-transform:uppercase;
    letter-spacing:1.5px;color:rgba(255,255,255,0.4)}
  ._dsSngPair{display:flex;align-items:center;gap:10px}
  ._dsSngItem{display:flex;flex-direction:column;gap:1px}
  ._dsSngItem:last-child{align-items:flex-end}
  ._dsSngN{font-family:'DM Sans',sans-serif;font-size:0.68rem;font-weight:700;color:rgba(255,255,255,0.82)}
  ._dsSngA{font-family:'Space Mono',monospace;font-size:0.46rem;color:rgba(255,255,255,0.38)}
  ._dsSngSep{font-size:0.6rem;color:rgba(255,255,255,0.22)}

  /* ── CARD VIEW ── */
  ._dsCrd{padding:12px 16px 0}
  ._dsCrdRing{position:relative;border-radius:14px;overflow:hidden;
    box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(232,197,71,0.10);
    background:#07060E;aspect-ratio:1;width:100%}
  #_dsCvs{display:block;width:100%;height:100%}

  /* ── EDIT PANEL ── */
  ._dsEdt{margin:10px 16px 0;background:#16151f;border-radius:16px;
    border:1px solid rgba(255,255,255,0.07);overflow:hidden;flex-shrink:0}
  ._dsOptRow{display:flex;gap:4px;padding:10px 10px 0;flex-wrap:wrap}
  ._dsOptBtn{padding:5px 10px;border-radius:20px;font-family:'Space Mono',monospace;font-size:0.45rem;
    font-weight:700;letter-spacing:0.8px;text-transform:uppercase;cursor:pointer;transition:all 0.16s;
    border:1px solid transparent;background:none}
  ._dsOptBtn.active{background:rgba(255,255,255,0.10);border-color:rgba(255,255,255,0.17);color:#fff}
  ._dsOptBtn:not(.active){background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35)}
  ._dsOptBtn:not(.active):hover{color:rgba(255,255,255,0.60);background:rgba(255,255,255,0.05)}
  ._dsPnl{padding:11px 10px 12px}
  ._dsSec{display:none}
  ._dsSec.on{display:block}
  ._dsPnlLbl{font-family:'Space Mono',monospace;font-size:0.44rem;font-weight:700;letter-spacing:1.5px;
    text-transform:uppercase;color:rgba(255,255,255,0.26);margin-bottom:8px}

  /* motion grid */
  ._dsMtnG{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
  ._dsMtnB{padding:8px 4px;border-radius:8px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);
    color:rgba(255,255,255,0.60);font-family:'DM Sans',sans-serif;font-size:0.60rem;font-weight:600;
    cursor:pointer;transition:all 0.16s;text-align:center}
  ._dsMtnB:hover{background:rgba(255,255,255,0.07);color:#fff;border-color:rgba(255,255,255,0.16)}
  ._dsMtnB.active{background:rgba(0,229,255,0.10);border-color:rgba(0,229,255,0.38);color:#00E5FF}
  ._dsSpdR{display:flex;gap:5px;margin-top:9px}
  ._dsSpdB{flex:1;padding:7px 5px;border-radius:8px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);
    color:rgba(255,255,255,0.45);font-family:'Space Mono',monospace;font-size:0.46rem;font-weight:700;
    cursor:pointer;transition:all 0.16s;text-align:center}
  ._dsSpdB.active{background:rgba(0,229,255,0.08);border-color:rgba(0,229,255,0.28);color:#00E5FF}
  ._dsSpdB:hover:not(.active){background:rgba(255,255,255,0.06);color:#fff}

  /* color grid */
  ._dsClrG{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  ._dsClrSw{border-radius:9px;overflow:hidden;cursor:pointer;border:2px solid transparent;
    transition:all 0.16s;aspect-ratio:1;position:relative}
  ._dsClrSw:hover{transform:scale(1.05)}
  ._dsClrSw.active{border-color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,0.35)}
  ._dsSwFl{width:100%;height:68%}
  ._dsSwNm{position:absolute;bottom:0;left:0;right:0;padding:2px 2px 3px;
    background:rgba(0,0,0,0.52);font-family:'Space Mono',monospace;
    font-size:0.38rem;font-weight:700;color:rgba(255,255,255,0.75);text-align:center}

  /* style grid */
  ._dsStlG{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  ._dsStlB{padding:8px 6px;border-radius:8px;background:#1d1c27;border:1px solid rgba(255,255,255,0.06);
    color:rgba(255,255,255,0.50);font-family:'DM Sans',sans-serif;font-size:0.60rem;font-weight:700;
    cursor:pointer;transition:all 0.16s;text-align:center}
  ._dsStlB:hover{background:rgba(255,255,255,0.07);color:#fff;border-color:rgba(255,255,255,0.16)}
  ._dsStlB.active{background:rgba(232,197,71,0.09);border-color:rgba(232,197,71,0.36);color:#E8C547}

  /* font grid */
  ._dsFntG{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  ._dsFntC{padding:10px 10px 8px;border-radius:10px;background:#1d1c27;
    border:1px solid rgba(255,255,255,0.06);cursor:pointer;transition:all 0.16s;
    display:flex;flex-direction:column;gap:3px}
  ._dsFntC:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.14)}
  ._dsFntC.active{background:rgba(232,197,71,0.07);border-color:rgba(232,197,71,0.28)}
  ._dsFntPv{font-size:0.90rem;line-height:1.3;color:rgba(255,255,255,0.88)}
  ._dsFntNm{font-family:'Space Mono',monospace;font-size:0.42rem;font-weight:700;
    color:rgba(255,255,255,0.36);text-transform:uppercase;letter-spacing:1px}
  ._dsFntC.active ._dsFntNm{color:#E8C547}

  /* ── DOWNLOAD ROW — BOTTOM ── */
  ._dsDlRow{display:flex;gap:8px;padding:10px 16px 18px;flex-shrink:0}
  ._dsDlBtn{flex:1;padding:13px 10px;border-radius:14px;border:none;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;gap:4px;
    transition:all 0.2s cubic-bezier(0.16,1,0.3,1);
    font-family:'Space Mono',monospace;font-weight:700;font-size:0.50rem;
    letter-spacing:1.2px;text-transform:uppercase}
  ._dsDlBtn:hover{transform:translateY(-2px)}
  ._dsDlBtn:active{transform:scale(0.97)}
  ._dsDlBtn:disabled{opacity:0.55;cursor:not-allowed;transform:none}
  ._dsDlIco{font-size:0.95rem;line-height:1}
  ._dsDlGif{background:rgba(0,229,255,0.07);border:1px solid rgba(0,229,255,0.22);color:#00E5FF}
  ._dsDlGif:hover{background:rgba(0,229,255,0.13);border-color:rgba(0,229,255,0.42);
    box-shadow:0 6px 20px rgba(0,229,255,0.10)}
  ._dsDlPost{background:rgba(232,197,71,0.09);border:1px solid rgba(232,197,71,0.26);color:#E8C547;flex:1.3}
  ._dsDlPost:hover{background:rgba(232,197,71,0.15);border-color:rgba(232,197,71,0.48);
    box-shadow:0 6px 20px rgba(232,197,71,0.12)}

  /* ── MOTION KEYFRAMES ── */
  @keyframes _kFU{0%{opacity:0;transform:translateY(18px)}25%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-7px)}}
  @keyframes _kSI{0%{opacity:0;transform:translateX(-24px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(9px)}}
  @keyframes _kPL{0%,100%{opacity:0.35;transform:scale(0.96)}50%{opacity:1;transform:scale(1.03)}}
  @keyframes _kGL{0%,86%,100%{transform:translate(0,0) skew(0deg);filter:none;opacity:1}
    87%{transform:translate(-4px,2px) skew(-3deg);filter:hue-rotate(90deg) brightness(1.5);opacity:0.8}
    89%{transform:translate(4px,-2px) skew(3deg);filter:hue-rotate(-90deg);opacity:0.9}
    91%{transform:translate(-3px,1px);filter:brightness(1.6);opacity:0.85}
    93%{transform:translate(2px,-1px);filter:none;opacity:1}}
  @keyframes _kWV{0%,100%{transform:translateY(0)}30%{transform:translateY(-9px)}60%{transform:translateY(4px)}}
  @keyframes _kSH{0%{background-position:-300% center}100%{background-position:300% center}}
  @keyframes _kBN{0%,100%{transform:translateY(0)}35%{transform:translateY(-16px)}55%{transform:translateY(-5px)}70%{transform:translateY(-10px)}85%{transform:translateY(-2px)}}
  @keyframes _kTY{0%,4%{width:0;opacity:1}52%,88%{width:100%;opacity:1}94%,100%{width:100%;opacity:0}}
  @keyframes _kBL{0%,100%{border-color:var(--_dsAcc,#E8C547)}50%{border-color:transparent}}
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════
   MOUNT HTML
══════════════════════════════════════════════════════════ */
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

  // Style — debounced to prevent freeze
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

  // Update download button labels
  _el('_dsDlALbl').textContent = fmt === 'gif' ? 'Download GIF' : 'Download Poster';
  _el('_dsDlBLbl').textContent = fmt === 'gif' ? 'Share GIF'    : 'Save Image';

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

/* ══════════════════════════════════════════════════════════
   VIEW — CONVO / CARD
══════════════════════════════════════════════════════════ */
function _setView(v) {
  DS.view = v;
  _el('_dsVwCvo').classList.toggle('active', v === 'convo');
  _el('_dsVwCrd').classList.toggle('active', v === 'card');
  _el('_dsCvoView').style.display = v === 'convo' ? '' : 'none';
  _el('_dsCrdView').style.display = v === 'card'  ? '' : 'none';

  if (v === 'card') {
    _stopCanvas();
    // Double rAF ensures ring has painted and has dimensions
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
   APPLY THEME — updates CSS vars so convo view changes too
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
   APPLY MOTION — CSS animations on convo bubbles
══════════════════════════════════════════════════════════ */
function _applyMotion() {
  // Always refresh canvas when motion changes
  _schedRefresh();
  if (DS.view !== 'convo' || DS.format === 'poster') return;

  const els = _qAll('._dsBblL');
  const dur = DS.dur;
  const m   = DS.motion;
  const acc = (DS_THEMES[DS.theme] || DS_THEMES.gold).accent;

  els.forEach(el => { el.style.cssText = ''; });
  // Force reflow so animations restart cleanly
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
  DS._loopId++;                              // invalidates any running loop
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
    // Layout not ready — retry once
    requestAnimationFrame(() => _startCanvas());
    return;
  }

  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';

  const ctx     = canvas.getContext('2d');
  const myId    = DS._loopId;              // capture — if DS._loopId changes, this loop stops
  const opts    = _buildOpts();
  const p1      = DS.post1;
  const p2      = DS.post2;
  const totalF  = 36;
  const frameMs = Math.round((DS.dur * 1000) / totalF);
  let lastTs    = 0;

  const draw = (ts) => {
    if (DS._loopId !== myId) return;       // ← FREEZE FIX: bail if superseded

    if (ts - lastTs >= frameMs) {
      lastTs = ts;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (DS.format === 'poster') {
        // Static draw — stop loop after first frame
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

/* Debounced refresh — prevents rapid clicks causing multiple concurrent loops */
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

/* ── Draw one canvas frame ── */
function _drawCanvas(ctx, W, H, t, p1, p2, opts) {
  // Try the renderer from duet-mode.js first
  if (opts.format === 'poster' && typeof window.dsPosterDraw === 'function') {
    window.dsPosterDraw(ctx, W, H, p1, p2, opts);
    return;
  }
  if (opts.format === 'gif' && typeof window.dsGifDrawFrame === 'function') {
    window.dsGifDrawFrame(ctx, W, H, t, DS.motion, p1, p2, opts);
    return;
  }
  // Fallback: built-in canvas renderer (always works even if duet-mode not loaded)
  _fallbackDraw(ctx, W, H, t, p1, p2, opts);
}

function _buildOpts() {
  return {
    format:     DS.format,
    theme:      DS.theme,
    cardStyle:  DS.cardStyle,
    fontFamily: DS.fontFamily,
    fontItalic: DS.fontItalic,
    motion:     DS.motion,
  };
}

/* ══════════════════════════════════════════════════════════
   BUILT-IN FALLBACK CANVAS RENDERER
   Matches the conversation view quality exactly.
   Runs even if duet-mode.js aliases haven't loaded yet.
══════════════════════════════════════════════════════════ */
function _fallbackDraw(ctx, W, H, t, p1, p2, opts) {
  if (!p1 || !p2) return;
  const m      = DS_THEMES[opts.theme] || DS_THEMES.gold;
  const pVibe  = DS_VIBE[p1.emotion] || m.l;
  const eVibe  = DS_VIBE[p2.emotion] || m.r;
  const isAnim = opts.format === 'gif';

  /* Background */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, m.bg);
  bg.addColorStop(1, _mix(m.bg, '#000', 0.4));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  /* Vibe glows */
  ctx.save();
  ctx.globalAlpha = 0.18;
  const g1 = ctx.createRadialGradient(W*.2, H*.22, 0, W*.2, H*.22, W*.6);
  g1.addColorStop(0, pVibe); g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  const eBlend = isAnim ? Math.min(1, Math.max(0, (t-0.38)/0.35)) : 1;
  ctx.globalAlpha = 0.18 * eBlend;
  const g2 = ctx.createRadialGradient(W*.8, H*.78, 0, W*.8, H*.78, W*.6);
  g2.addColorStop(0, eVibe); g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Card style overlay
  _applyCardStyle(ctx, W, H, opts.cardStyle, m, pVibe, eVibe);

  const pad  = W * 0.065;
  const divY = H * 0.490;

  /* MARGO wordmark */
  const mSz = Math.max(12, W * 0.038);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = m.accent; ctx.globalAlpha = 0.22;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.55);
  ctx.restore();

  /* Accent top bar */
  ctx.save();
  ctx.globalAlpha = 0.7;
  const tbar = ctx.createLinearGradient(0, 0, W, 0);
  tbar.addColorStop(0,'transparent'); tbar.addColorStop(0.5, pVibe); tbar.addColorStop(1,'transparent');
  ctx.fillStyle = tbar; ctx.fillRect(0, 0, W, 2);
  ctx.restore();

  /* Zone boundaries */
  const topT = pad + mSz * 1.7;
  const topB = divY - W * 0.055;
  const botT = divY + W * 0.055;
  const botB = H * 0.830;

  /* Lyric zones */
  const e1 = isAnim ? Math.min(1, t / 0.28) : 1;
  const e2 = isAnim ? (t > 0.46 ? Math.min(1, (t-0.46)/0.28) : 0) : 1;

  ctx.save(); ctx.globalAlpha = e1;
  _drawZone(ctx, W, topT, topB, p1, m, pad, opts);
  ctx.restore();

  /* Divider */
  const dAlpha = isAnim ? Math.min(1, Math.max(0, (t-0.38)/0.12)) : 1;
  _drawDivider(ctx, W, divY, p2, m, dAlpha);

  ctx.save(); ctx.globalAlpha = e2;
  _drawZone(ctx, W, botT, botB, p2, m, pad, opts);
  ctx.restore();

  /* Songs bar */
  _drawSongsBar(ctx, W, H * 0.842, H * 0.918, p1, p2, m, pad);

  /* Watermark + M-mark */
  _drawWatermark(ctx, W, H, m);
  _drawMmark(ctx, W, H, m);
}

function _applyCardStyle(ctx, W, H, style, m, pV, eV) {
  ctx.save();
  switch (style) {
    case 'contrast':
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.45; ctx.fillRect(0,0,W,H); break;
    case 'mesh': {
      const mg = ctx.createLinearGradient(0,0,W,H);
      mg.addColorStop(0, pV+'44'); mg.addColorStop(0.5, m.bg); mg.addColorStop(1, eV+'44');
      ctx.fillStyle = mg; ctx.globalAlpha = 0.5; ctx.fillRect(0,0,W,H); break;
    }
    case 'grain':
      ctx.globalAlpha = 0.022;
      for (let y=0; y<H; y+=3) for (let x=0; x<W; x+=3) {
        const v = Math.random()*255|0;
        ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x,y,3,3);
      }
      break;
    case 'neon': {
      ctx.globalAlpha = 0.12;
      const ng = ctx.createLinearGradient(0,0,0,H);
      ng.addColorStop(0, m.accent+'88'); ng.addColorStop(1,'transparent');
      ctx.fillStyle = ng; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = 0.4; ctx.strokeStyle = m.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W*0.03, H*0.03, W*0.94, H*0.94);
      break;
    }
    case 'depth': {
      const dg = ctx.createRadialGradient(W/2,H/2,0, W/2,H/2,W*.7);
      dg.addColorStop(0,'rgba(0,0,0,0)'); dg.addColorStop(1,'rgba(0,0,0,0.6)');
      ctx.fillStyle = dg; ctx.globalAlpha = 1; ctx.fillRect(0,0,W,H);
      break;
    }
    case 'glass':
    default:
      ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.globalAlpha = 1; ctx.fillRect(0,0,W,H);
      break;
  }
  ctx.restore();
}

function _drawZone(ctx, W, zT, zB, post, m, pad, opts) {
  const zH   = zB - zT;
  const text = (post.text || post.lyric || '').substring(0, 120);
  const fs0  = Math.min(W * 0.052, zH * 0.28);
  const fstyle = opts.fontItalic ? 'italic 600' : '600';
  const ff   = `'${opts.fontFamily}',serif`;
  ctx.font = `${fstyle} ${fs0}px ${ff}`;
  let lines  = _wrapText(ctx, text, W - pad * 2.2);
  let fs     = fs0;
  if (lines.length > 4) {
    fs = Math.max(W*0.026, fs0 * 4/lines.length);
    ctx.font = `${fstyle} ${fs}px ${ff}`;
    lines = _wrapText(ctx, text, W - pad * 2.2);
  }
  const lh     = fs * 1.46;
  const blockH = lines.length * lh;
  const startY = Math.max(zT, zT + (zH - blockH)/2 - fs*0.1);

  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  lines.forEach((ln, i) => ctx.fillText(ln, pad * 1.15, startY + i*lh));
  ctx.shadowBlur = 0;

  // Attribution
  const pk   = post.knowledge || {};
  const song = pk.song || post.song || '';
  if (song) {
    const afs = Math.max(8, W * 0.017);
    ctx.font = `700 ${afs}px 'Space Mono',monospace`;
    ctx.fillStyle = DS_VIBE[post.emotion] || m.accent;
    ctx.globalAlpha = 0.52; ctx.textBaseline = 'bottom';
    let str = song + ((pk.artist||post.artist) ? ' — '+(pk.artist||post.artist) : '');
    while (ctx.measureText(str).width > W - pad*2.2 && str.length > 4) str = str.slice(0,-4)+'…';
    ctx.fillText(str, pad*1.15, Math.min(zB - W*0.008, zB - 3));
  }
  ctx.restore();
}

function _drawDivider(ctx, W, divY, echoPost, m, alpha) {
  if (alpha <= 0) return;
  const user  = '@' + (echoPost.username||'anonymous').replace(/^@/,'').toUpperCase();
  const dText = `LYRIC BACK ↩  ${user}`;
  const dfs   = Math.max(9, W * 0.020);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${dfs}px 'Syne','Arial Black',sans-serif`;
  const dTW  = ctx.measureText(dText).width;
  const pH   = dfs * 2.1, pPad = W * 0.026;
  const pW   = dTW + pPad * 2;
  const pX   = W/2 - pW/2, pY = divY - pH/2, pR = pH/2;
  const gap  = pW/2 + W*0.018;

  [[W*0.04, W/2-gap],[W/2+gap, W*0.96]].forEach(([x1,x2]) => {
    const lg = ctx.createLinearGradient(x1,0,x2,0);
    if (x1 < W/2) { lg.addColorStop(0,'transparent'); lg.addColorStop(1, m.accent+'44'); }
    else           { lg.addColorStop(0, m.accent+'44'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1, divY-0.75, x2-x1, 1.5);
  });

  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.fillStyle = m.light ? 'rgba(0,0,0,0.07)' : 'rgba(232,197,71,0.09)'; ctx.fill();
  ctx.strokeStyle = m.accent+'55'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `800 ${dfs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = m.accent; ctx.globalAlpha = alpha;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(dText, W/2, divY);
  ctx.restore();
}

function _drawSongsBar(ctx, W, barT, barB, p1, p2, m, pad) {
  const bH = barB - barT;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pad*0.75, barT, W-pad*1.5, bH, W*0.016);
  else ctx.rect(pad*0.75, barT, W-pad*1.5, bH);
  ctx.fill(); ctx.stroke();

  const cy  = barT + bH/2;
  const lfs = Math.max(8, W*0.019);
  const sfs = Math.max(8, W*0.021);
  const afs = Math.max(7, W*0.014);

  ctx.font = `800 ${lfs}px 'Syne',sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('SONGS', pad, cy);

  const pk1 = p1.knowledge||{}, s1 = (pk1.song||p1.song||'').substring(0,18);
  const pk2 = p2.knowledge||{}, s2 = (pk2.song||p2.song||'').substring(0,18);

  ctx.font = `700 ${sfs}px 'DM Sans',sans-serif`; ctx.fillStyle='#fff'; ctx.textAlign='left';
  ctx.fillText(s1, W*0.26, cy - afs*0.5);
  ctx.font = `400 ${afs}px 'Space Mono',monospace`; ctx.fillStyle='rgba(255,255,255,0.38)';
  ctx.fillText(pk1.artist||p1.artist||'', W*0.26, cy + sfs*0.55);

  ctx.font = `400 ${sfs*1.1}px sans-serif`; ctx.fillStyle=m.accent; ctx.globalAlpha=0.65; ctx.textAlign='center';
  ctx.fillText('↔', W/2, cy); ctx.globalAlpha=1;

  ctx.font = `700 ${sfs}px 'DM Sans',sans-serif`; ctx.fillStyle='#fff'; ctx.textAlign='right';
  ctx.fillText(s2, W-pad, cy - afs*0.5);
  ctx.font = `400 ${afs}px 'Space Mono',monospace`; ctx.fillStyle='rgba(255,255,255,0.38)';
  ctx.fillText(pk2.artist||p2.artist||'', W-pad, cy + sfs*0.55);
  ctx.restore();
}

function _drawWatermark(ctx, W, H, m) {
  const fs  = Math.max(8, W*0.016);
  const txt = 'trymargo.com';
  ctx.save();
  ctx.font = `700 ${fs}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const tw = ctx.measureText(txt).width;
  const pw = tw + W*0.040, ph = fs*1.85;
  const px = W/2 - pw/2, py = H - W*0.034 - ph/2;
  ctx.globalAlpha = 0.78; ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px,py,pw,ph,ph/2); else ctx.rect(px,py,pw,ph);
  ctx.fill();
  ctx.globalAlpha = 0.50; ctx.strokeStyle = m.accent; ctx.lineWidth = 1;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px,py,pw,ph,ph/2); else ctx.rect(px,py,pw,ph);
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
  ctx.fillText(txt, W/2, py+ph/2);
  ctx.restore();
}

function _drawMmark(ctx, W, H, m) {
  const sz = Math.round(Math.min(W,H)*0.068);
  const bx = W - W*0.034 - sz, by = H - H*0.032 - sz;
  const cx = bx+sz/2, cy = by+sz/2, r = sz/2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = m.accent; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=14;
  ctx.fill(); ctx.shadowBlur=0;
  const s=sz*0.58, mx=cx-s/2, my=cy-s/2;
  ctx.strokeStyle = m.light ? '#ffffff' : '#0B0B0D';
  ctx.lineWidth=sz*0.10; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(mx, my+s*0.78); ctx.lineTo(mx, my+s*0.13);
  ctx.lineTo(mx+s*0.35, my+s*0.60); ctx.lineTo(mx+s*0.50, my+s*0.06);
  ctx.lineTo(mx+s*0.65, my+s*0.60); ctx.lineTo(mx+s, my+s*0.13);
  ctx.lineTo(mx+s, my+s*0.78); ctx.stroke();
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   DOWNLOAD
══════════════════════════════════════════════════════════ */
function _download(which) {
  const p1 = DS.post1, p2 = DS.post2;
  if (!p1 || !p2) return;
  const opts = _buildOpts();

  if (which === 'primary') {
    // Primary = GIF download or Poster download
    if (DS.format === 'gif') {
      _exportGif(p1, p2, opts);
    } else {
      _exportPoster(p1, p2, opts);
    }
  } else {
    // Secondary = Share GIF (native share or fallback) or Save Image (canvas snapshot)
    if (DS.format === 'gif') {
      _shareGif(p1, p2, opts);
    } else {
      _savePng();
    }
  }
}

function _exportGif(p1, p2, opts) {
  const btn = _el('_dsDlA');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
  btn.disabled  = true;

  // Set up _shareSheet for duet-mode.js
  const prev = window._shareSheet;
  window._shareSheet = { post: p1, echoPost: p2, isDuet: true };

  const doExport = () => {
    if (typeof window.gsExportForShareSheet === 'function') {
      window.gsExportForShareSheet(null)
        .then(blob => _triggerDl(blob, `margo-duet-${Date.now()}.gif`))
        .catch(() => _savePng())
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; window._shareSheet = prev; });
    } else if (typeof window.dsGifExport === 'function') {
      window.dsGifExport(p1, p2, DS.motion, DS.dur, opts)
        .then(blob => _triggerDl(blob, `margo-duet-${Date.now()}.gif`))
        .catch(() => _savePng())
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; window._shareSheet = prev; });
    } else {
      // No GIF encoder — fall back to PNG
      _savePng();
      btn.innerHTML = orig; btn.disabled = false; window._shareSheet = prev;
    }
  };
  doExport();
}

function _exportPoster(p1, p2, opts) {
  const btn = _el('_dsDlA');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="_dsDlIco">⏳</span><span>Rendering…</span>';
  btn.disabled  = true;

  if (typeof window.dsPosterExport === 'function') {
    window.dsPosterExport(p1, p2, opts)
      .then(blob => _triggerDl(blob, `margo-poster-${Date.now()}.png`))
      .catch(() => _savePng())
      .finally(() => { btn.innerHTML = orig; btn.disabled = false; });
  } else {
    // Render to offscreen canvas
    const off = document.createElement('canvas');
    off.width = off.height = 1080;
    const ctx = off.getContext('2d');
    document.fonts.ready.then(() => {
      if (typeof window.dsPosterDraw === 'function') {
        window.dsPosterDraw(ctx, 1080, 1080, p1, p2, opts);
      } else {
        _fallbackDraw(ctx, 1080, 1080, 0, p1, p2, opts);
      }
      off.toBlob(blob => {
        if (blob) _triggerDl(blob, `margo-poster-${Date.now()}.png`);
        btn.innerHTML = orig; btn.disabled = false;
      }, 'image/png', 0.95);
    });
  }
}

function _shareGif(p1, p2, opts) {
  // Try Web Share API, fall back to download
  if (navigator.share) {
    // Render offscreen then share
    const off = document.createElement('canvas');
    off.width = off.height = 600;
    const ctx = off.getContext('2d');
    document.fonts.ready.then(() => {
      _fallbackDraw(ctx, 600, 600, 0, p1, p2, opts);
      off.toBlob(async blob => {
        if (!blob) return;
        try {
          const file = new File([blob], 'margo-duet.png', { type: 'image/png' });
          await navigator.share({ files: [file], title: 'Lyric Back on Margo', url: 'https://trymargo.com' });
        } catch {
          _triggerDl(blob, `margo-duet-${Date.now()}.png`);
        }
      }, 'image/png');
    });
  } else {
    _exportGif(p1, p2, opts);
  }
}

function _savePng() {
  const canvas = _el('_dsCvs');
  if (canvas) {
    canvas.toBlob(blob => { if (blob) _triggerDl(blob, `margo-duet-${Date.now()}.png`); }, 'image/png');
  }
}

function _triggerDl(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
function _el(id) { return document.getElementById(id); }
function _qAll(sel) { return Array.from(document.querySelectorAll(sel)); }
function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur+' '+w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur); return lines;
}
function _mix(h1, h2, t) {
  const p = c => [parseInt(c.replace('#','').slice(0,2),16), parseInt(c.replace('#','').slice(2,4),16), parseInt(c.replace('#','').slice(4,6),16)];
  const a = p(h1), b = p(h2);
  return `rgb(${Math.round(a[0]*(1-t)+b[0]*t)},${Math.round(a[1]*(1-t)+b[1]*t)},${Math.round(a[2]*(1-t)+b[2]*t)})`;
}

/* ══════════════════════════════════════════════════════════
   EXPOSE
══════════════════════════════════════════════════════════ */
window.openDuetSheet  = openSheet;
window.closeDuetSheet = closeSheet;

// Mount on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _mount);
} else {
  _mount();
}

})();
