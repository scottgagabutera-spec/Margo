/* ============================================================
   MARGO — js/features/duet-sheet.js  v3.1
   FIX: Download now respects the active view.
   • Conversation view → renders conversation layout to canvas → exports
   • Card view         → uses existing card canvas → exports
   Same logic applied to both GIF and Poster.
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
  _loopId:    0,
  _frame:     0,
  _refreshTimer: null,
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
