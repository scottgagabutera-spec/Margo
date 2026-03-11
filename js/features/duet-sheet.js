/* ============================================================
   MARGO — js/duet-sheet.js  v2.6
   Surgical fix pass on v2.5:
   ✓ Colors NOW work in convo view (sheet bg tint + bubble border tint)
   ✓ Color change also re-arms motion CSS in convo view
   ✓ Artist name in card: clamped, never overflows zone top
   ✓ Font panel expanded: Lora, Syne Mono, Comic Sans added
   ✓ Convo .ds-bubble-lyric font-size: 1.05rem → 1.15rem (closer to card)
   ✓ trymargo.com watermark contrast boosted in fallback
   ✓ Poster layout: genuinely different (single featured card per post)
   Signatures unchanged — all renderer calls identical to v2.5
   ============================================================ */

(function () {
'use strict';

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
const DS = {
  parentPost: null,
  echoPost:   null,
  mounted:    false,
  view:       'convo',
  format:     'gif',
  motion:     'fade-up',
  dur:        2.4,
  theme:      'gold',
  cardStyle:  'glass',
  fontFamily: 'DM Serif Display',
  fontItalic: true,
  _raf:       null,
  _frame:     0,
  _savedScrollY: 0,
};

const DS_VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

/* Theme metadata — used for CSS convo tinting */
const DS_THEME_META = {
  gold:    { accent:'#E8C547', bg:'#07060E', l:'#FF6B9D', r:'#6B8CFF',  bubbleBg1:'rgba(232,197,71,0.10)',  bubbleBg2:'rgba(107,140,255,0.09)', border1:'rgba(232,197,71,0.28)',   border2:'rgba(107,140,255,0.28)',   light:false },
  violet:  { accent:'#c77dff', bg:'#0e0018', l:'#ff71ce', r:'#05ffa1',  bubbleBg1:'rgba(199,125,255,0.10)', bubbleBg2:'rgba(5,255,161,0.09)',   border1:'rgba(199,125,255,0.28)',  border2:'rgba(5,255,161,0.28)',    light:false },
  ocean:   { accent:'#00e5ff', bg:'#04090f', l:'#00e5ff', r:'#0070ff',  bubbleBg1:'rgba(0,229,255,0.10)',   bubbleBg2:'rgba(0,112,255,0.09)',   border1:'rgba(0,229,255,0.28)',    border2:'rgba(0,112,255,0.28)',    light:false },
  ember:   { accent:'#ff6b6b', bg:'#0f0404', l:'#ff6b6b', r:'#ffb347',  bubbleBg1:'rgba(255,107,107,0.10)', bubbleBg2:'rgba(255,179,71,0.09)',  border1:'rgba(255,107,107,0.28)',  border2:'rgba(255,179,71,0.28)',   light:false },
  forest:  { accent:'#50fa7b', bg:'#020f06', l:'#50fa7b', r:'#00e5c0',  bubbleBg1:'rgba(80,250,123,0.10)',  bubbleBg2:'rgba(0,229,192,0.09)',   border1:'rgba(80,250,123,0.28)',   border2:'rgba(0,229,192,0.28)',    light:false },
  rose:    { accent:'#f4a4c0', bg:'#0f0508', l:'#f4a4c0', r:'#c084fc',  bubbleBg1:'rgba(244,164,192,0.10)', bubbleBg2:'rgba(192,132,252,0.09)', border1:'rgba(244,164,192,0.28)',  border2:'rgba(192,132,252,0.28)',  light:false },
  mono:    { accent:'#E8C547', bg:'#080808', l:'#ffffff',  r:'#aaaaaa', bubbleBg1:'rgba(255,255,255,0.08)', bubbleBg2:'rgba(170,170,170,0.07)', border1:'rgba(255,255,255,0.18)',  border2:'rgba(170,170,170,0.18)',  light:false },
  wave:    { accent:'#05ffa1', bg:'#150520', l:'#ff71ce', r:'#05ffa1',  bubbleBg1:'rgba(255,113,206,0.10)', bubbleBg2:'rgba(5,255,161,0.09)',   border1:'rgba(255,113,206,0.28)',  border2:'rgba(5,255,161,0.28)',    light:false },
  white:   { accent:'#0B0B0D', bg:'#ffffff', l:'#c0392b', r:'#1a6fbd',  bubbleBg1:'rgba(192,57,43,0.08)',   bubbleBg2:'rgba(26,111,189,0.08)',  border1:'rgba(192,57,43,0.22)',    border2:'rgba(26,111,189,0.22)',   light:true  },
};

const DS_BG_TO_THEME = {
  '#07060E':'gold', '#0e0018':'violet', '#04090f':'ocean', '#0f0404':'ember',
  '#020f06':'forest', '#0f0508':'rose', '#080808':'mono', '#150520':'wave', '#ffffff':'white',
};

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
function _injectStyles() {
  if (document.getElementById('duetSheetStyles')) return;
  const s = document.createElement('style');
  s.id = 'duetSheetStyles';
  s.textContent = `
    #duetBackdrop {
      position:fixed;inset:0;z-index:700;
      background:rgba(0,0,0,0.88);
      backdrop-filter:blur(20px) saturate(0.6);
      -webkit-backdrop-filter:blur(20px) saturate(0.6);
      overflow-y:auto;overflow-x:hidden;
      -webkit-overflow-scrolling:touch;
      animation:dsBackdropIn 0.25s ease;
    }
    #duetBackdrop.ds-hidden{display:none!important}
    body.ds-modal-open{overflow:hidden}
    @keyframes dsBackdropIn{from{opacity:0}to{opacity:1}}

    #duetSheet{
      width:100%;max-width:520px;
      background:var(--ds-sheet-bg,#0c0b10);
      border:1px solid rgba(255,255,255,0.07);
      border-radius:28px 28px 0 0;
      display:flex;flex-direction:column;
      margin:0 auto;
      box-shadow:0 -12px 80px rgba(0,0,0,0.9),0 0 0 1px var(--ds-acc,rgba(232,197,71,0.06)) inset;
      animation:dsSlideUp 0.42s cubic-bezier(0.16,1,0.3,1);
      overflow:hidden;
      transition: background 0.35s ease;
    }
    @media(min-width:560px){
      #duetSheet{border-radius:24px;margin:24px auto;animation:dsFadeUp 0.32s cubic-bezier(0.16,1,0.3,1)}
    }
    @keyframes dsSlideUp{from{transform:translateY(70px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes dsFadeUp {from{transform:translateY(24px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}

    .ds-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin:12px auto 0;flex-shrink:0}

    .ds-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0;flex-shrink:0}
    .ds-title{font-family:'Syne',sans-serif;font-weight:800;font-size:0.88rem;letter-spacing:2.5px;text-transform:uppercase;background:linear-gradient(90deg,#fff 20%,var(--ds-acc,#E8C547) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .ds-close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.18s}
    .ds-close:hover{background:rgba(255,255,255,0.12);color:#fff}

    .ds-view-toggle{display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 20px 0}
    .ds-toggle-btn{font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:7px 18px;border-radius:20px;cursor:pointer;transition:all 0.2s;border:1px solid transparent;background:none;color:rgba(255,255,255,0.45)}
    .ds-toggle-btn.active{background:rgba(232,197,71,0.12);border-color:rgba(232,197,71,0.35);color:var(--ds-acc,#E8C547)}
    .ds-toggle-btn:not(.active){background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.09)}
    .ds-toggle-btn:not(.active):hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.07)}

    /* ── CONVO ── */
    .ds-convo{padding:18px 18px 14px;display:flex;flex-direction:column;gap:12px}
    .ds-bubble{max-width:82%;display:flex;flex-direction:column;gap:6px;animation:dsBubbleIn 0.45s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes dsBubbleIn{from{opacity:0;transform:translateY(10px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    .ds-bubble.original{align-self:flex-start;animation-delay:0.1s}
    .ds-bubble.reply   {align-self:flex-end;align-items:flex-end;animation-delay:0.35s}
    .ds-bubble-user{font-family:'Syne',sans-serif;font-size:0.62rem;font-weight:800;display:flex;align-items:center;gap:6px;padding:0 5px;letter-spacing:0.04em}
    /* FIX: bubble user colors now use CSS vars updated by _applyThemeToConvo */
    .ds-bubble.original .ds-bubble-user{color:var(--ds-cl,#FF6B9D)}
    .ds-bubble.reply    .ds-bubble-user{color:var(--ds-cr,#6B8CFF);flex-direction:row-reverse}
    .ds-udot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
    .ds-bubble.original .ds-udot{background:var(--ds-cl,#FF6B9D)}
    .ds-bubble.reply    .ds-udot{background:var(--ds-cr,#6B8CFF)}
    .ds-bubble-card{padding:15px 17px;border-radius:20px;position:relative;overflow:hidden}
    /* FIX: bubble card bg/border now use CSS vars so theme changes them */
    .ds-bubble.original .ds-bubble-card{background:var(--ds-bubble-bg1,rgba(255,107,157,0.09));border:1px solid var(--ds-bubble-bd1,rgba(255,107,157,0.25));border-bottom-left-radius:5px}
    .ds-bubble.reply    .ds-bubble-card{background:var(--ds-bubble-bg2,rgba(107,140,255,0.09));border:1px solid var(--ds-bubble-bd2,rgba(107,140,255,0.25));border-bottom-right-radius:5px}
    .ds-bubble-card::before{content:'';position:absolute;inset:0;opacity:0.09;pointer-events:none}
    .ds-bubble.original .ds-bubble-card::before{background:radial-gradient(ellipse at top left,var(--ds-cl,#FF6B9D),transparent 65%)}
    .ds-bubble.reply    .ds-bubble-card::before{background:radial-gradient(ellipse at bottom right,var(--ds-cr,#6B8CFF),transparent 65%)}
    /* FIX: lyric size increased from 1.05rem to 1.15rem */
    .ds-bubble-lyric{font-family:'DM Serif Display',serif;font-style:italic;font-size:1.15rem;line-height:1.52;color:var(--ds-lyric-c,#fff);position:relative;z-index:1}
    .ds-bubble-meta{margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,0.1);position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .ds-bubble-song  {font-family:'DM Sans',sans-serif;font-size:0.8rem;font-weight:700;color:var(--ds-lyric-c,#fff)}
    .ds-bubble-artist{font-family:'Space Mono',monospace;font-size:0.56rem;color:rgba(255,255,255,0.55);margin-top:2px}
    .ds-bubble-vibe  {font-family:'Syne',sans-serif;font-size:0.5rem;font-weight:800;text-transform:uppercase;padding:4px 10px;border-radius:20px;flex-shrink:0;letter-spacing:0.05em}
    .ds-bubble.original .ds-bubble-vibe{background:rgba(255,107,157,0.15);color:var(--ds-cl,#FF9DC0);border:1px solid rgba(255,107,157,0.3)}
    .ds-bubble.reply    .ds-bubble-vibe{background:rgba(107,140,255,0.15);color:var(--ds-cr,#9DB5FF);border:1px solid rgba(107,140,255,0.3)}
    .ds-lb-divider{display:flex;align-items:center;gap:9px;padding:2px 0;animation:dsBubbleIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.22s both}
    .ds-lb-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--ds-lb-line,rgba(232,197,71,0.22)),transparent)}
    .ds-lb-pill{font-family:'Syne',sans-serif;font-size:0.52rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--ds-acc,#E8C547);background:rgba(232,197,71,0.1);border:1px solid var(--ds-lb-bdr,rgba(232,197,71,0.28));padding:6px 13px;border-radius:20px;white-space:nowrap}
    .ds-song-strip{margin:6px 18px 0;padding:11px 15px;background:#181720;border-radius:13px;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .ds-strip-label{font-family:'Syne',sans-serif;font-size:0.5rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.45)}
    .ds-strip-songs{display:flex;align-items:center;gap:12px}
    .ds-strip-song {display:flex;flex-direction:column;gap:2px}
    .ds-strip-song:last-child{align-items:flex-end}
    .ds-strip-song-name  {font-family:'DM Sans',sans-serif;font-size:0.72rem;font-weight:700;color:rgba(255,255,255,0.85)}
    .ds-strip-song-artist{font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.4)}
    .ds-strip-sep{font-size:0.65rem;color:rgba(255,255,255,0.25)}

    /* ── CARD VIEW ── */
    .ds-card-view{padding:14px 18px 0}
    .ds-canvas-ring{position:relative;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(232,197,71,0.12);background:#07060E;aspect-ratio:1;width:100%}
    #dsCardCanvas{display:block;width:100%;height:100%}
    .ds-card-actions{display:flex;gap:9px;padding:10px 0 0}
    .ds-card-btn{flex:1;padding:11px 10px;border-radius:12px;border:none;cursor:pointer;font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s}
    .ds-card-btn:hover{transform:translateY(-1px)}
    .ds-card-btn-download{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7)}
    .ds-card-btn-download:hover{background:rgba(255,255,255,0.1);color:#fff}

    /* ── EDIT PANEL ── */
    .ds-section-sep{height:1px;background:rgba(255,255,255,0.06);margin:12px 18px 0;flex-shrink:0}
    .ds-edit-panel{margin:12px 18px 0;background:#181720;border-radius:18px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;flex-shrink:0}
    .ds-format-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.07)}
    .ds-format-tab{flex:1;padding:13px 10px;font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;color:rgba(255,255,255,0.35)}
    .ds-format-tab.active-gif   {color:#00E5FF;border-bottom-color:#00E5FF;background:rgba(0,229,255,0.05)}
    .ds-format-tab.active-poster{color:#E8C547;border-bottom-color:#E8C547;background:rgba(232,197,71,0.05)}
    .ds-format-tab:not(.active-gif):not(.active-poster):hover{color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.03)}
    .ds-option-tabs{display:flex;gap:5px;padding:11px 12px 0;flex-wrap:wrap}
    .ds-option-tab{padding:5px 11px;border-radius:20px;font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;cursor:pointer;transition:all 0.18s;border:1px solid transparent;background:none}
    .ds-option-tab.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.18);color:#fff}
    .ds-option-tab:not(.active){background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.38)}
    .ds-option-tab:not(.active):hover{color:rgba(255,255,255,0.65);background:rgba(255,255,255,0.06)}
    .ds-panel-content{padding:12px}
    .ds-panel-section{display:none}
    .ds-panel-section.active{display:block}
    .ds-panel-label{font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.28);margin-bottom:9px}
    .ds-motion-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
    .ds-motion-btn{padding:8px 4px;border-radius:9px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.65);font-family:'DM Sans',sans-serif;font-size:0.63rem;font-weight:600;cursor:pointer;transition:all 0.18s;text-align:center}
    .ds-motion-btn:hover{background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.18)}
    .ds-motion-btn.active{background:rgba(0,229,255,0.12);border-color:rgba(0,229,255,0.4);color:#00E5FF}
    .ds-speed-row{display:flex;gap:6px;margin-top:10px}
    .ds-speed-btn{flex:1;padding:8px 6px;border-radius:9px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;cursor:pointer;transition:all 0.18s;text-align:center}
    .ds-speed-btn.active{background:rgba(0,229,255,0.1);border-color:rgba(0,229,255,0.3);color:#00E5FF}
    .ds-speed-btn:hover:not(.active){background:rgba(255,255,255,0.07);color:#fff}
    .ds-color-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    .ds-color-swatch{border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.18s;aspect-ratio:1;position:relative}
    .ds-color-swatch:hover{transform:scale(1.05)}
    .ds-color-swatch.active{border-color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,0.4)}
    .ds-swatch-fill{width:100%;height:70%}
    .ds-swatch-name{position:absolute;bottom:0;left:0;right:0;padding:3px 2px 4px;background:rgba(0,0,0,0.55);font-family:'Space Mono',monospace;font-size:0.4rem;font-weight:700;color:rgba(255,255,255,0.8);text-align:center}
    .ds-cstyle-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
    .ds-cstyle-btn{padding:9px 6px;border-radius:9px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.55);font-family:'DM Sans',sans-serif;font-size:0.63rem;font-weight:700;cursor:pointer;transition:all 0.18s;text-align:center}
    .ds-cstyle-btn:hover{background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.18)}
    .ds-cstyle-btn.active{background:rgba(232,197,71,0.1);border-color:rgba(232,197,71,0.38);color:#E8C547}
    .ds-font-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .ds-font-card{padding:11px 11px 9px;border-radius:11px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.18s;display:flex;flex-direction:column;gap:4px}
    .ds-font-card:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.16)}
    .ds-font-card.active{background:rgba(232,197,71,0.08);border-color:rgba(232,197,71,0.3)}
    .ds-font-preview{font-size:0.95rem;line-height:1.3;color:rgba(255,255,255,0.9)}
    .ds-font-card-name{font-family:'Space Mono',monospace;font-size:0.45rem;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px}
    .ds-font-card.active .ds-font-card-name{color:#E8C547}

    /* ── SHARE ROW ── */
    .ds-share-row{display:flex;gap:9px;padding:12px 18px 20px;flex-shrink:0}
    .ds-share-btn{flex:1;padding:14px 10px;border-radius:16px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.22s cubic-bezier(0.16,1,0.3,1);font-family:'Space Mono',monospace;font-weight:700;font-size:0.52rem;letter-spacing:1.2px;text-transform:uppercase}
    .ds-share-btn:hover{transform:translateY(-2px)}
    .ds-share-btn:active{transform:scale(0.97)}
    .ds-share-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
    .ds-share-btn-icon{font-size:1rem}
    .ds-btn-gif   {background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.25);color:#00E5FF}
    .ds-btn-gif:hover{background:rgba(0,229,255,0.14);border-color:rgba(0,229,255,0.45);box-shadow:0 8px 24px rgba(0,229,255,0.12)}
    .ds-btn-poster{background:rgba(232,197,71,0.1);border:1px solid rgba(232,197,71,0.3);color:#E8C547;flex:1.4}
    .ds-btn-poster:hover{background:rgba(232,197,71,0.17);border-color:rgba(232,197,71,0.52);box-shadow:0 8px 24px rgba(232,197,71,0.15)}

    /* ── MOTION KEYFRAMES ── */
    @keyframes dsKFadeUp  {0%{opacity:0;transform:translateY(20px)}25%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}
    @keyframes dsKSlideIn {0%{opacity:0;transform:translateX(-28px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(10px)}}
    @keyframes dsKPulse   {0%,100%{opacity:0.4;transform:scale(0.96)}50%{opacity:1;transform:scale(1.03)}}
    @keyframes dsKGlitch  {0%,88%,100%{transform:translate(0,0) skew(0deg);filter:none;opacity:1}89%{transform:translate(-5px,2px) skew(-3deg);filter:hue-rotate(90deg) brightness(1.4);opacity:0.8}91%{transform:translate(5px,-2px) skew(3deg);filter:hue-rotate(-90deg);opacity:0.9}93%{transform:translate(-3px,1px) skew(-1deg);filter:brightness(1.6);opacity:0.85}95%{transform:translate(3px,-1px);filter:none;opacity:1}}
    @keyframes dsKWave    {0%,100%{transform:translateY(0)}30%{transform:translateY(-10px)}60%{transform:translateY(5px)}}
    @keyframes dsKShimmer {0%{background-position:-300% center}100%{background-position:300% center}}
    @keyframes dsKBounce  {0%,100%{transform:translateY(0)}40%{transform:translateY(-18px)}60%{transform:translateY(-6px)}75%{transform:translateY(-12px)}90%{transform:translateY(-2px)}}
    @keyframes dsKBlink   {0%,100%{border-color:var(--ds-acc,#E8C547)}50%{border-color:transparent}}
    @keyframes dsKType    {0%,5%{width:0;opacity:1}55%,90%{width:100%;opacity:1}95%,100%{width:100%;opacity:0}}
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════
   MOUNT
══════════════════════════════════════════════════════════ */
function mountDuetSheet() {
  if (document.getElementById('duetBackdrop')) return;
  _injectStyles();

  const backdrop = document.createElement('div');
  backdrop.id        = 'duetBackdrop';
  backdrop.className = 'ds-hidden';
  backdrop.innerHTML = `
    <div id="duetSheet">
      <div class="ds-handle" id="dsDragHandle"></div>

      <div class="ds-header">
        <span class="ds-title">Lyric Back</span>
        <button class="ds-close" id="dsClose" aria-label="Close">×</button>
      </div>

      <div class="ds-view-toggle">
        <button class="ds-toggle-btn active" id="dsToggleConvo">Conversation</button>
        <button class="ds-toggle-btn"        id="dsToggleCard">Card</button>
      </div>

      <!-- CONVERSATION VIEW -->
      <div id="dsViewConvo">
        <div class="ds-convo" id="dsConvoBubbles"></div>
        <div class="ds-song-strip" id="dsSongStrip"></div>
      </div>

      <!-- CARD VIEW -->
      <div id="dsViewCard" style="display:none">
        <div class="ds-card-view">
          <div class="ds-canvas-ring">
            <canvas id="dsCardCanvas"></canvas>
          </div>
          <div class="ds-card-actions">
            <button class="ds-card-btn ds-card-btn-download" id="dsBtnSaveImg">↓ Save Image</button>
          </div>
        </div>
      </div>

      <div class="ds-section-sep"></div>

      <!-- EDITING PANEL -->
      <div class="ds-edit-panel">
        <div class="ds-format-tabs">
          <button class="ds-format-tab active-gif" id="dsFmtGif"    data-fmt="gif">GIF</button>
          <button class="ds-format-tab"             id="dsFmtPoster" data-fmt="poster">Poster</button>
        </div>
        <div class="ds-option-tabs" id="dsOptionTabs">
          <button class="ds-option-tab active" data-opt="motion" id="dsTabMotion">Motion</button>
          <button class="ds-option-tab"        data-opt="color">Color</button>
          <button class="ds-option-tab"        data-opt="style">Style</button>
          <button class="ds-option-tab"        data-opt="font">Font</button>
        </div>
        <div class="ds-panel-content">

          <!-- MOTION -->
          <div class="ds-panel-section active" id="ds-section-motion">
            <div class="ds-panel-label">Motion style — updates live</div>
            <div class="ds-motion-grid" id="dsMotionGrid">
              <button class="ds-motion-btn active" data-motion="fade-up">Fade Up</button>
              <button class="ds-motion-btn"        data-motion="typewriter">Type</button>
              <button class="ds-motion-btn"        data-motion="slide-in">Slide In</button>
              <button class="ds-motion-btn"        data-motion="pulse">Pulse</button>
              <button class="ds-motion-btn"        data-motion="glitch">Glitch</button>
              <button class="ds-motion-btn"        data-motion="wave">Wave</button>
              <button class="ds-motion-btn"        data-motion="shimmer">Shimmer</button>
              <button class="ds-motion-btn"        data-motion="bounce">Bounce</button>
            </div>
            <div class="ds-panel-label" style="margin-top:12px">Speed</div>
            <div class="ds-speed-row" id="dsSpeedRow">
              <button class="ds-speed-btn"        data-dur="3.8">Slow</button>
              <button class="ds-speed-btn active" data-dur="2.4">Normal</button>
              <button class="ds-speed-btn"        data-dur="1.3">Fast</button>
            </div>
          </div>

          <!-- COLOR -->
          <div class="ds-panel-section" id="ds-section-color">
            <div class="ds-panel-label">Background theme</div>
            <div class="ds-color-grid">
              <div class="ds-color-swatch active" data-bg="#07060E" data-theme="gold">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#0d0d0d,#E8C547)"></div>
                <div class="ds-swatch-name">Gold</div>
              </div>
              <div class="ds-color-swatch" data-bg="#0e0018" data-theme="violet">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0033,#c77dff)"></div>
                <div class="ds-swatch-name">Violet</div>
              </div>
              <div class="ds-color-swatch" data-bg="#04090f" data-theme="ocean">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#0a1420,#00e5ff)"></div>
                <div class="ds-swatch-name">Ocean</div>
              </div>
              <div class="ds-color-swatch" data-bg="#0f0404" data-theme="ember">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0a0a,#ff6b6b)"></div>
                <div class="ds-swatch-name">Ember</div>
              </div>
              <div class="ds-color-swatch" data-bg="#020f06" data-theme="forest">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></div>
                <div class="ds-swatch-name">Forest</div>
              </div>
              <div class="ds-color-swatch" data-bg="#0f0508" data-theme="rose">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></div>
                <div class="ds-swatch-name">Rose</div>
              </div>
              <div class="ds-color-swatch" data-bg="#080808" data-theme="mono">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#000,#fff)"></div>
                <div class="ds-swatch-name">Mono</div>
              </div>
              <div class="ds-color-swatch" data-bg="#150520" data-theme="wave">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></div>
                <div class="ds-swatch-name">Wave</div>
              </div>
            </div>
          </div>

          <!-- STYLE -->
          <div class="ds-panel-section" id="ds-section-style">
            <div class="ds-panel-label">Lyric card style</div>
            <div class="ds-cstyle-grid">
              <button class="ds-cstyle-btn active" data-style="glass">Frosted Glass</button>
              <button class="ds-cstyle-btn"        data-style="contrast">Deep Contrast</button>
              <button class="ds-cstyle-btn"        data-style="mesh">Gradient Mesh</button>
              <button class="ds-cstyle-btn"        data-style="grain">Grain/Editorial</button>
              <button class="ds-cstyle-btn"        data-style="neon">Neon Outline</button>
              <button class="ds-cstyle-btn"        data-style="depth">Cinematic</button>
            </div>
          </div>

          <!-- FONT — FIX: 3 new fonts added -->
          <div class="ds-panel-section" id="ds-section-font">
            <div class="ds-panel-label">Lyric font</div>
            <div class="ds-font-grid">
              <div class="ds-font-card active" data-family="DM Serif Display" data-italic="true">
                <div class="ds-font-preview" style="font-family:'DM Serif Display',serif;font-style:italic">Say everything</div>
                <div class="ds-font-card-name">Serif · Default</div>
              </div>
              <div class="ds-font-card" data-family="Playfair Display" data-italic="true">
                <div class="ds-font-preview" style="font-family:'Playfair Display',serif;font-style:italic">Say everything</div>
                <div class="ds-font-card-name">Playfair</div>
              </div>
              <div class="ds-font-card" data-family="Lora" data-italic="true">
                <div class="ds-font-preview" style="font-family:'Lora',serif;font-style:italic">Say everything</div>
                <div class="ds-font-card-name">Lora · Romantic</div>
              </div>
              <div class="ds-font-card" data-family="Space Mono" data-italic="false">
                <div class="ds-font-preview" style="font-family:'Space Mono',monospace">Say everything</div>
                <div class="ds-font-card-name">Space Mono</div>
              </div>
              <div class="ds-font-card" data-family="Syne Mono" data-italic="false">
                <div class="ds-font-preview" style="font-family:'Syne Mono',monospace">Say everything</div>
                <div class="ds-font-card-name">Syne Mono</div>
              </div>
              <div class="ds-font-card" data-family="DM Sans" data-italic="false">
                <div class="ds-font-preview" style="font-family:'DM Sans',sans-serif;font-weight:700">Say everything</div>
                <div class="ds-font-card-name">Sans Bold</div>
              </div>
              <div class="ds-font-card" data-family="Comic Sans MS" data-italic="false">
                <div class="ds-font-preview" style="font-family:'Comic Sans MS',cursive">Say everything</div>
                <div class="ds-font-card-name">Comic · Playful</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- SHARE ROW -->
      <div class="ds-share-row">
        <button class="ds-share-btn ds-btn-gif" id="dsBtnGif">
          <span class="ds-share-btn-icon">◎</span>GIF
        </button>
        <button class="ds-share-btn ds-btn-poster" id="dsBtnPoster">
          <span class="ds-share-btn-icon">✦</span>Poster
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  DS.mounted = true;

  document.getElementById('dsClose').onclick       = closeDuetSheet;
  document.getElementById('dsToggleConvo').onclick = () => _setView('convo');
  document.getElementById('dsToggleCard').onclick  = () => _setView('card');
  document.getElementById('dsBtnSaveImg').onclick  = _dsSaveImage;
  document.getElementById('dsBtnGif').onclick      = () => _dsExport('gif');
  document.getElementById('dsBtnPoster').onclick   = () => _dsExport('poster');

  document.querySelectorAll('.ds-format-tab').forEach(btn =>
    btn.addEventListener('click', () => _setFormat(btn.dataset.fmt))
  );

  document.getElementById('dsOptionTabs').addEventListener('click', e => {
    const btn = e.target.closest('.ds-option-tab');
    if (!btn) return;
    document.querySelectorAll('.ds-option-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.ds-panel-section').forEach(s => s.classList.remove('active'));
    document.getElementById('ds-section-' + btn.dataset.opt).classList.add('active');
  });

  document.getElementById('dsMotionGrid').addEventListener('click', e => {
    const btn = e.target.closest('.ds-motion-btn');
    if (!btn) return;
    document.querySelectorAll('.ds-motion-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    DS.motion = btn.dataset.motion;
    _applyMotion();
  });

  document.getElementById('dsSpeedRow').addEventListener('click', e => {
    const btn = e.target.closest('.ds-speed-btn');
    if (!btn) return;
    document.querySelectorAll('.ds-speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    DS.dur = parseFloat(btn.dataset.dur);
    _applyMotion();
  });

  /* FIX: color swatch also calls _applyMotion to re-arm CSS after theme change */
  document.querySelectorAll('.ds-color-swatch').forEach(sw =>
    sw.addEventListener('click', () => {
      document.querySelectorAll('.ds-color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      DS.theme = sw.dataset.theme || DS_BG_TO_THEME[sw.dataset.bg] || 'gold';
      _applyThemeToConvo();
      _refreshCanvas();
      _applyMotion();   /* FIX: re-arm motion CSS after theme vars update */
    })
  );

  document.querySelectorAll('.ds-cstyle-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ds-cstyle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      DS.cardStyle = btn.dataset.style || 'glass';
      _refreshCanvas();
    })
  );

  document.querySelectorAll('.ds-font-card').forEach(card =>
    card.addEventListener('click', () => {
      document.querySelectorAll('.ds-font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      DS.fontFamily = card.dataset.family;
      DS.fontItalic = card.dataset.italic === 'true';
      document.querySelectorAll('.ds-bubble-lyric').forEach(el => {
        el.style.fontFamily = `'${DS.fontFamily}',serif`;
        el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
      });
      _refreshCanvas();
    })
  );

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeDuetSheet(); });
  _initSwipe();
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
══════════════════════════════════════════════════════════ */
function openDuetSheet(parentPost, echoPost) {
  if (!parentPost || !echoPost) return;
  mountDuetSheet();

  DS.parentPost = parentPost;
  DS.echoPost   = echoPost;
  DS.motion     = 'fade-up';
  DS.dur        = 2.4;
  DS.format     = 'gif';
  DS.theme      = 'gold';
  DS.cardStyle  = 'glass';
  DS.fontFamily = 'DM Serif Display';
  DS.fontItalic = true;

  document.querySelectorAll('.ds-motion-btn').forEach(b => b.classList.toggle('active', b.dataset.motion === 'fade-up'));
  document.querySelectorAll('.ds-speed-btn').forEach(b => b.classList.toggle('active', b.dataset.dur === '2.4'));
  document.querySelectorAll('.ds-color-swatch').forEach(b => b.classList.toggle('active', b.dataset.theme === 'gold'));
  document.querySelectorAll('.ds-cstyle-btn').forEach(b => b.classList.toggle('active', b.dataset.style === 'glass'));
  document.querySelectorAll('.ds-font-card').forEach(b => b.classList.toggle('active', b.dataset.family === 'DM Serif Display'));

  _populateConvo();
  _applyThemeToConvo();
  _setView('convo');
  _setFormat('gif');

  document.getElementById('duetBackdrop').classList.remove('ds-hidden');
  document.body.classList.add('ds-modal-open');
  DS._savedScrollY = window.scrollY || 0;
}

function closeDuetSheet() {
  const bd = document.getElementById('duetBackdrop');
  if (bd) bd.classList.add('ds-hidden');
  document.body.classList.remove('ds-modal-open');
  _stopCanvas();
  document.querySelectorAll('.ds-bubble-lyric').forEach(el => { el.style.cssText = ''; });
  requestAnimationFrame(() => window.scrollTo({ top: DS._savedScrollY, behavior: 'instant' }));
}

/* ══════════════════════════════════════════════════════════
   VIEW / FORMAT
══════════════════════════════════════════════════════════ */
function _setView(v) {
  DS.view = v;
  const convo = document.getElementById('dsViewConvo');
  const card  = document.getElementById('dsViewCard');
  document.getElementById('dsToggleConvo').classList.toggle('active', v === 'convo');
  document.getElementById('dsToggleCard').classList.toggle('active',  v === 'card');
  convo.style.display = v === 'convo' ? '' : 'none';
  card.style.display  = v === 'card'  ? '' : 'none';

  if (v === 'card') {
    _stopCanvas();
    requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas()));
  } else {
    _stopCanvas();
    _applyMotion();
  }
}

function _setFormat(fmt) {
  DS.format = fmt;
  document.getElementById('dsFmtGif').className    = 'ds-format-tab' + (fmt === 'gif'    ? ' active-gif'    : '');
  document.getElementById('dsFmtPoster').className = 'ds-format-tab' + (fmt === 'poster' ? ' active-poster' : '');

  const motionTab = document.getElementById('dsTabMotion');
  if (fmt === 'poster') {
    motionTab.style.display = 'none';
    if (document.querySelector('.ds-option-tab.active')?.dataset.opt === 'motion') {
      document.querySelectorAll('.ds-option-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ds-panel-section').forEach(s => s.classList.remove('active'));
      document.querySelector('[data-opt="color"]').classList.add('active');
      document.getElementById('ds-section-color').classList.add('active');
    }
    document.querySelectorAll('.ds-bubble-lyric').forEach(el => { el.style.cssText = ''; });
  } else {
    motionTab.style.display = '';
    _applyMotion();
  }

  if (DS.view === 'card') {
    _stopCanvas();
    requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas()));
  }
}

/* ══════════════════════════════════════════════════════════
   POPULATE CONVO
══════════════════════════════════════════════════════════ */
function _populateConvo() {
  const p = DS.parentPost, e = DS.echoPost;
  if (!p || !e) return;

  const pk      = p.knowledge || {};
  const ek      = e.knowledge || {};
  const pUser   = '@' + (p.username || 'anonymous').replace(/^@/, '').toUpperCase();
  const eUser   = '@' + (e.username || 'anonymous').replace(/^@/, '').toUpperCase();
  const pSong   = pk.song   || p.song   || '—';
  const pArtist = pk.artist || p.artist || '';
  const eSong   = ek.song   || e.song   || '—';
  const eArtist = ek.artist || e.artist || '';
  const pVibe   = DS_VIBE[p.emotion] || '#E8C547';
  const eVibe   = DS_VIBE[e.emotion] || '#E8C547';

  const sheet = document.getElementById('duetSheet');
  sheet.style.setProperty('--ds-cl', pVibe);
  sheet.style.setProperty('--ds-cr', eVibe);

  document.getElementById('dsConvoBubbles').innerHTML = `
    <div class="ds-bubble original">
      <div class="ds-bubble-user"><span class="ds-udot"></span>${_esc(pUser)}</div>
      <div class="ds-bubble-card">
        <div class="ds-bubble-lyric">${_esc(p.text || p.lyric || '')}</div>
        <div class="ds-bubble-meta">
          <div>
            <div class="ds-bubble-song">${_esc(pSong)}</div>
            <div class="ds-bubble-artist">${_esc(pArtist)}</div>
          </div>
          <span class="ds-bubble-vibe">${_esc(p.emotion || 'Vibe')}</span>
        </div>
      </div>
    </div>
    <div class="ds-lb-divider">
      <div class="ds-lb-line"></div>
      <div class="ds-lb-pill">Lyric Back ↩ ${_esc(eUser)}</div>
      <div class="ds-lb-line"></div>
    </div>
    <div class="ds-bubble reply">
      <div class="ds-bubble-user">${_esc(eUser)}<span class="ds-udot"></span></div>
      <div class="ds-bubble-card">
        <div class="ds-bubble-lyric">${_esc(e.lyric || e.text || '')}</div>
        <div class="ds-bubble-meta">
          <div>
            <div class="ds-bubble-song">${_esc(eSong)}</div>
            <div class="ds-bubble-artist">${_esc(eArtist)}</div>
          </div>
          <span class="ds-bubble-vibe">${_esc(e.emotion || 'Vibe')}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('dsSongStrip').innerHTML = `
    <span class="ds-strip-label">Songs</span>
    <div class="ds-strip-songs">
      <div class="ds-strip-song">
        <span class="ds-strip-song-name">${_esc(pSong)}</span>
        <span class="ds-strip-song-artist">${_esc(pArtist)}</span>
      </div>
      <span class="ds-strip-sep">↔</span>
      <div class="ds-strip-song">
        <span class="ds-strip-song-name">${_esc(eSong)}</span>
        <span class="ds-strip-song-artist">${_esc(eArtist)}</span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   APPLY THEME TO CONVO VIEW — FIX: now updates ALL CSS vars
   including bubble bg, border, lyric color, sheet bg tint
══════════════════════════════════════════════════════════ */
function _applyThemeToConvo() {
  const m = DS_THEME_META[DS.theme] || DS_THEME_META.gold;
  const sheet = document.getElementById('duetSheet');
  if (!sheet) return;

  /* accent color for title gradient, divider pill, etc */
  sheet.style.setProperty('--ds-acc',       m.accent);
  /* sheet bg: subtle tint toward theme bg */
  sheet.style.setProperty('--ds-sheet-bg',  _blendHex(m.bg, '#0c0b10', 0.35));
  /* bubble bg + border: now themed */
  sheet.style.setProperty('--ds-bubble-bg1', m.bubbleBg1);
  sheet.style.setProperty('--ds-bubble-bg2', m.bubbleBg2);
  sheet.style.setProperty('--ds-bubble-bd1', m.border1);
  sheet.style.setProperty('--ds-bubble-bd2', m.border2);
  /* bubble user colors: use theme l/r instead of fixed vibe */
  sheet.style.setProperty('--ds-cl', m.l);
  sheet.style.setProperty('--ds-cr', m.r);
  /* lyric text: ensure readable on any theme */
  sheet.style.setProperty('--ds-lyric-c', m.light ? '#0B0B0D' : '#ffffff');
  /* lb pill + line */
  sheet.style.setProperty('--ds-lb-line', m.accent + '33');
  sheet.style.setProperty('--ds-lb-bdr',  m.accent + '55');
}

/* blend hex color toward another hex, factor 0→1 */
function _blendHex(hex1, hex2, t) {
  const p = hex1.replace('#',''), q = hex2.replace('#','');
  const r1=parseInt(p.slice(0,2),16), g1=parseInt(p.slice(2,4),16), b1=parseInt(p.slice(4,6),16);
  const r2=parseInt(q.slice(0,2),16), g2=parseInt(q.slice(2,4),16), b2=parseInt(q.slice(4,6),16);
  const r=Math.round(r1*(1-t)+r2*t), g=Math.round(g1*(1-t)+g2*t), b=Math.round(b1*(1-t)+b2*t);
  return `rgb(${r},${g},${b})`;
}

/* ══════════════════════════════════════════════════════════
   MOTION — convo CSS + canvas refresh
══════════════════════════════════════════════════════════ */
function _applyMotion() {
  _refreshCanvas();
  if (DS.view !== 'convo' || DS.format === 'poster') return;

  const els  = document.querySelectorAll('.ds-bubble-lyric');
  const dur  = DS.dur;
  const name = DS.motion;

  els.forEach(el => { el.style.cssText = ''; });
  const bubbles = document.getElementById('dsConvoBubbles');
  if (bubbles) void bubbles.offsetHeight;

  els.forEach((el, idx) => {
    const delay = idx * 0.18;
    el.style.fontFamily = `'${DS.fontFamily}',serif`;
    el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
    switch (name) {
      case 'fade-up':
        el.style.animation = `dsKFadeUp ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'slide-in':
        el.style.animation = `dsKSlideIn ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'pulse':
        el.style.animation = `dsKPulse ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'glitch':
        el.style.animation = `dsKGlitch ${dur}s ${delay*0.5}s steps(1) infinite`; break;
      case 'wave':
        el.style.display   = 'inline-block';
        el.style.animation = `dsKWave ${dur}s ${delay}s ease-in-out infinite`; break;
      case 'shimmer':
        el.style.background           = `linear-gradient(90deg,rgba(255,255,255,0.6) 0%,#fff 35%,${DS_THEME_META[DS.theme]?.accent||'#E8C547'} 50%,#fff 65%,rgba(255,255,255,0.6) 100%)`;
        el.style.backgroundSize       = '300% auto';
        el.style.webkitBackgroundClip = 'text';
        el.style.webkitTextFillColor  = 'transparent';
        el.style.backgroundClip       = 'text';
        el.style.animation            = `dsKShimmer ${dur}s ${delay}s linear infinite`; break;
      case 'bounce':
        el.style.display   = 'inline-block';
        el.style.animation = `dsKBounce ${dur}s ${delay}s ease infinite`; break;
      case 'typewriter':
        el.style.overflow    = 'hidden';
        el.style.whiteSpace  = 'nowrap';
        el.style.borderRight = `2px solid ${DS_THEME_META[DS.theme]?.accent||'#E8C547'}`;
        el.style.width       = '0';
        el.style.animation   = `dsKType ${dur}s ${delay}s steps(30,end) infinite, dsKBlink 0.7s ${delay}s step-end infinite`; break;
    }
  });
}

/* ══════════════════════════════════════════════════════════
   CANVAS PREVIEW
══════════════════════════════════════════════════════════ */
function _stopCanvas() {
  if (DS._raf) { cancelAnimationFrame(DS._raf); DS._raf = null; }
  DS._frame = 0;
}

function _startCanvas() {
  _stopCanvas();
  const canvas = document.getElementById('dsCardCanvas');
  if (!canvas) return;
  const ring = canvas.parentElement;
  const dpr  = Math.min(window.devicePixelRatio || 1, 2);
  const size = ring.clientWidth || 300;
  canvas.width  = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');

  const opts = {
    theme:      DS.theme      || 'gold',
    cardStyle:  DS.cardStyle  || 'glass',
    fontFamily: DS.fontFamily || 'DM Serif Display',
    fontItalic: DS.fontItalic !== false,
  };

  if (DS.format === 'poster') {
    document.fonts.ready.then(() => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (typeof window.dsPosterDraw === 'function') {
        window.dsPosterDraw(ctx, size, size, DS.parentPost, DS.echoPost, opts);
      } else {
        _drawFallback(ctx, size, size);
      }
    });
  } else {
    const totalFrames = 36;
    const frameMs     = Math.round((DS.dur * 1000) / totalFrames);
    let lastTs = 0;

    const loop = (ts) => {
      if (ts - lastTs >= frameMs) {
        lastTs = ts;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (typeof window.dsGifDrawFrame === 'function') {
          window.dsGifDrawFrame(
            ctx, size, size,
            DS._frame / totalFrames,
            DS.motion,
            DS.parentPost, DS.echoPost,
            opts
          );
        } else {
          _drawFallback(ctx, size, size);
        }
        DS._frame = (DS._frame + 1) % totalFrames;
      }
      DS._raf = requestAnimationFrame(loop);
    };

    document.fonts.ready.then(() => { DS._raf = requestAnimationFrame(loop); });
  }
}

function _refreshCanvas() {
  if (DS.view === 'card') {
    _stopCanvas();
    requestAnimationFrame(() => requestAnimationFrame(() => _startCanvas()));
  }
}

/* ══════════════════════════════════════════════════════════
   FALLBACK CANVAS — FIX: clamped layout, boosted watermark
══════════════════════════════════════════════════════════ */
function _drawFallback(ctx, W, H) {
  const p = DS.parentPost, e = DS.echoPost;
  if (!p || !e) return;
  const m     = DS_THEME_META[DS.theme] || DS_THEME_META.gold;
  const light = m.light;
  const bodyC = light ? '#0B0B0D' : '#ffffff';
  const mutedC= light ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, m.bg); bg.addColorStop(1, m.bg + 'cc');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const gl = ctx.createRadialGradient(W*.2, H*.2, 0, W*.2, H*.2, W*.7);
  gl.addColorStop(0, m.l + '33'); gl.addColorStop(1, 'transparent');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);

  const pad  = W * 0.055;
  const divY = H * 0.49;

  /* MARGO wordmark — clamped to top padding */
  const mSz = Math.max(12, W * 0.034);
  const mY  = pad * 0.55;
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = light ? '#0B0B0D' : m.accent;
  ctx.globalAlpha = 0.28; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  let cx2 = pad;
  for (const ch of 'MARGO') { ctx.fillText(ch, cx2, mY); cx2 += ctx.measureText(ch).width + mSz * 0.22; }
  ctx.restore();

  /* zone boundaries — FIX: clamped so username never escapes zone */
  const topZoneT = pad + mSz * 1.8;   // below MARGO wordmark + margin
  const topZoneB = divY - H * 0.06;
  const botZoneT = divY + H * 0.06;
  const botZoneB = H * 0.830;          // leaves room for songs bar + watermark

  _drawLyricZone(ctx, W, topZoneT, topZoneB, p, m, 'left',  pad, light, bodyC, mutedC);
  _drawDividerPill(ctx, W, divY, e, m, light);
  _drawLyricZone(ctx, W, botZoneT, botZoneB, e, m, 'right', pad, light, bodyC, mutedC);
  _drawSongsBar(ctx, W, H * 0.845, H * 0.920, p, e, m, light, pad);
  _drawWatermark(ctx, W, H, light, m.accent);
  _drawMmark(ctx, W, H, m);
}

function _drawLyricZone(ctx, W, zT, zB, post, m, side, pad, light, bodyC, mutedC) {
  const zH   = zB - zT;
  const text = (post.text || post.lyric || '').substring(0, 120);
  const col  = side === 'left' ? m.l : m.r;
  let fs     = Math.min(W * 0.050, zH * 0.26);
  const fStyle = DS.fontItalic ? 'italic 600' : '600';
  ctx.font = `${fStyle} ${fs}px '${DS.fontFamily}',serif`;
  let lines = _wrap(ctx, text, W - pad * 2.4);
  if (lines.length > 4) {
    fs = Math.max(W * 0.026, fs * 4 / lines.length);
    ctx.font = `${fStyle} ${fs}px '${DS.fontFamily}',serif`;
    lines = _wrap(ctx, text, W - pad * 2.4);
  }
  const lh = fs * 1.45;
  const blockH = lines.length * lh;
  const startY = Math.max(zT, zT + (zH - blockH) / 2 - fs * 0.1);

  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
  ctx.fillStyle = bodyC;
  lines.forEach((line, i) => ctx.fillText(line, pad * 1.2, startY + i * lh));
  ctx.shadowBlur = 0;

  const pk   = post.knowledge || {};
  const song = pk.song || post.song || '';
  if (song) {
    const afs = Math.max(8, W * 0.018);
    ctx.font = `700 ${afs}px 'Space Mono',monospace`;
    ctx.fillStyle = col; ctx.globalAlpha = 0.55; ctx.textBaseline = 'bottom';
    let aStr = song + ((pk.artist || post.artist) ? ' — ' + (pk.artist || post.artist) : '');
    while (ctx.measureText(aStr).width > W - pad * 2.4 && aStr.length > 4) aStr = aStr.slice(0, -4) + '…';
    ctx.fillText(aStr, pad * 1.2, Math.min(zB - W * 0.010, zB - 4));
  }
  ctx.restore();
}

function _drawDividerPill(ctx, W, divY, echoPost, m, light) {
  const user  = '@' + (echoPost.username || 'anonymous').replace(/^@/, '').toUpperCase();
  const dText = `LYRIC BACK ↩  ${user}`;
  const dfs   = Math.max(9, W * 0.019);
  ctx.save();
  ctx.font = `800 ${dfs}px 'Syne','Arial Black',sans-serif`;
  const dTW = ctx.measureText(dText).width;
  const pH  = dfs * 2.1, pPad = W * 0.026;
  const pW  = dTW + pPad * 2;
  const pX  = W / 2 - pW / 2, pY = divY - pH / 2, pR = pH / 2;
  const gap = pW / 2 + W * 0.018;

  [[W * 0.05, W / 2 - gap], [W / 2 + gap, W * 0.95]].forEach(([x1, x2]) => {
    const lg = ctx.createLinearGradient(x1, 0, x2, 0);
    if (x1 < W / 2) { lg.addColorStop(0, 'transparent'); lg.addColorStop(1, m.accent + '44'); }
    else             { lg.addColorStop(0, m.accent + '44'); lg.addColorStop(1, 'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1, divY - 0.75, x2 - x1, 1.5);
  });

  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(pX, pY, pW, pH, pR); else ctx.rect(pX, pY, pW, pH);
  ctx.fillStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(232,197,71,0.10)'; ctx.fill();
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.20)' : m.accent + '55'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `800 ${dfs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = light ? '#0B0B0D' : m.accent;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(dText, W / 2, divY);
  ctx.restore();
}

function _drawSongsBar(ctx, W, barT, barB, post1, post2, m, light, pad) {
  const bH = barB - barT;
  ctx.save();
  ctx.fillStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pad * 0.8, barT, W - pad * 1.6, bH, W * 0.018);
  else ctx.rect(pad * 0.8, barT, W - pad * 1.6, bH);
  ctx.fill(); ctx.stroke();

  const cy  = barT + bH / 2;
  const lfs = Math.max(8, W * 0.020);
  const sfs = Math.max(8, W * 0.021);
  const afs = Math.max(7, W * 0.015);
  const sC  = light ? '#0B0B0D' : '#ffffff';
  const aC  = light ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';

  ctx.font = `800 ${lfs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('SONGS', pad, cy);

  const pk1 = post1.knowledge || {}, s1 = (pk1.song || post1.song || '').substring(0, 18);
  const pk2 = post2.knowledge || {}, s2 = (pk2.song || post2.song || '').substring(0, 18);

  ctx.font = `700 ${sfs}px 'DM Sans',sans-serif`; ctx.fillStyle = sC; ctx.textAlign = 'left';
  ctx.fillText(s1, W * 0.28, cy - afs * 0.5);
  ctx.font = `400 ${afs}px 'Space Mono',monospace`; ctx.fillStyle = aC;
  ctx.fillText(pk1.artist || post1.artist || '', W * 0.28, cy + sfs * 0.55);

  ctx.font = `400 ${sfs}px sans-serif`; ctx.fillStyle = m.accent; ctx.globalAlpha = 0.7; ctx.textAlign = 'center';
  ctx.fillText('↔', W / 2, cy); ctx.globalAlpha = 1;

  ctx.font = `700 ${sfs}px 'DM Sans',sans-serif`; ctx.fillStyle = sC; ctx.textAlign = 'right';
  ctx.fillText(s2, W - pad, cy - afs * 0.5);
  ctx.font = `400 ${afs}px 'Space Mono',monospace`; ctx.fillStyle = aC;
  ctx.fillText(pk2.artist || post2.artist || '', W - pad, cy + sfs * 0.55);
  ctx.restore();
}

/* FIX: watermark — always-dark pill so text is always readable */
function _drawWatermark(ctx, W, H, light, accent) {
  const fs  = Math.max(8, W * 0.016);
  const txt = 'trymargo.com';
  ctx.save();
  ctx.font = `700 ${fs}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const tw = ctx.measureText(txt).width;
  const pw = tw + W * 0.042, ph = fs * 1.85;
  const px = W / 2 - pw / 2, py = H - W * 0.036 - ph / 2;
  /* always dark bg pill — readable on any theme */
  ctx.globalAlpha = 0.75;
  ctx.fillStyle   = 'rgba(0,0,0,0.80)';
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, ph / 2); else ctx.rect(px, py, pw, ph);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = accent || '#E8C547'; ctx.lineWidth = 1;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, ph / 2); else ctx.rect(px, py, pw, ph);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(txt, W / 2, py + ph / 2);
  ctx.restore();
}

function _drawMmark(ctx, W, H, m) {
  const sz = Math.round(Math.min(W, H) * 0.070);
  const bx = W - Math.round(W * 0.036) - sz;
  const by = H - Math.round(H * 0.034) - sz;
  const cx2 = bx + sz / 2, cy2 = by + sz / 2, r = sz / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
  ctx.fillStyle = m.accent; ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 16;
  ctx.fill(); ctx.shadowBlur = 0;
  const s = sz * 0.60, mx = cx2 - s / 2, my = cy2 - s / 2;
  ctx.strokeStyle = m.light ? '#ffffff' : '#0B0B0D';
  ctx.lineWidth = sz * 0.10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(mx,          my + s * 0.78);
  ctx.lineTo(mx,          my + s * 0.13);
  ctx.lineTo(mx + s * 0.35, my + s * 0.60);
  ctx.lineTo(mx + s * 0.50, my + s * 0.06);
  ctx.lineTo(mx + s * 0.65, my + s * 0.60);
  ctx.lineTo(mx + s,      my + s * 0.13);
  ctx.lineTo(mx + s,      my + s * 0.78);
  ctx.stroke();
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════ */
function _dsExport(tab) {
  const p1 = DS.parentPost, p2 = DS.echoPost;
  if (!p1 || !p2) return;

  const opts = {
    theme:      DS.theme      || 'gold',
    cardStyle:  DS.cardStyle  || 'glass',
    fontFamily: DS.fontFamily || 'DM Serif Display',
    fontItalic: DS.fontItalic !== false,
  };

  const gifBtn    = document.getElementById('dsBtnGif');
  const posterBtn = document.getElementById('dsBtnPoster');

  if (tab === 'poster') {
    if (typeof window.dsPosterExport !== 'function') { _dsSaveImage(); return; }
    const orig = posterBtn.innerHTML;
    posterBtn.innerHTML = '<span class="ds-share-btn-icon">⏳</span>Rendering…';
    posterBtn.disabled  = true;
    if (typeof showToast === 'function') showToast('Preparing poster…');
    window.dsPosterExport(p1, p2, opts)
      .then(blob => _triggerDownload(blob, `margo-duet-poster-${Date.now()}.png`))
      .catch(err  => { console.error('[Margo] Poster export:', err); _dsSaveImage(); })
      .finally(() => { posterBtn.innerHTML = orig; posterBtn.disabled = false; if (typeof showToast === 'function') showToast('Poster saved ✓'); });
  } else {
    if (typeof window.dsGifExport !== 'function') { _dsSaveImage(); return; }
    const orig = gifBtn.innerHTML;
    gifBtn.innerHTML = '<span class="ds-share-btn-icon">⏳</span>Rendering…';
    gifBtn.disabled  = true;
    if (typeof showToast === 'function') showToast('Rendering GIF…');
    window.dsGifExport(p1, p2, DS.motion, DS.dur, opts)
      .then(blob => _triggerDownload(blob, `margo-duet-${DS.motion}-${Date.now()}.gif`))
      .catch(err  => { console.error('[Margo] GIF export:', err); if (typeof showToast === 'function') showToast('Export failed — try again'); })
      .finally(() => { gifBtn.innerHTML = orig; gifBtn.disabled = false; });
  }
}

function _triggerDownload(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

function _dsSaveImage() {
  const canvas = document.getElementById('dsCardCanvas');
  if (canvas) {
    canvas.toBlob(blob => { if (blob) _triggerDownload(blob, `margo-duet-${Date.now()}.png`); }, 'image/png');
    return;
  }
  const off = document.createElement('canvas');
  off.width = off.height = 1080;
  const ctx = off.getContext('2d');
  document.fonts.ready.then(() => {
    _drawFallback(ctx, 1080, 1080);
    const lnk = document.createElement('a');
    lnk.download = `margo-duet-${Date.now()}.png`;
    lnk.href = off.toDataURL('image/png', 0.93);
    document.body.appendChild(lnk); lnk.click(); document.body.removeChild(lnk);
  });
}

/* ══════════════════════════════════════════════════════════
   SWIPE + UTILS
══════════════════════════════════════════════════════════ */
function _initSwipe() {
  const sheet  = document.getElementById('duetSheet');
  const handle = document.getElementById('dsDragHandle');
  if (!sheet || !handle) return;
  let startY = 0, curY = 0, dragging = false;
  handle.addEventListener('touchstart', e => { startY = e.touches[0].clientY; curY = startY; dragging = true; sheet.style.transition = 'none'; }, { passive: true });
  handle.addEventListener('touchmove',  e => { if (!dragging) return; curY = e.touches[0].clientY; const dy = Math.max(0, curY - startY); sheet.style.transform = `translateY(${dy}px)`; sheet.style.opacity = String(1 - dy / 320); }, { passive: true });
  handle.addEventListener('touchend',   ()  => { if (!dragging) return; dragging = false; sheet.style.transition = ''; if (curY - startY > 80) closeDuetSheet(); else { sheet.style.transform = ''; sheet.style.opacity = ''; } });
}

function _wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

function _esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════════
   EXPOSE
══════════════════════════════════════════════════════════ */
window.openDuetSheet  = openDuetSheet;
window.closeDuetSheet = closeDuetSheet;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountDuetSheet);
} else {
  mountDuetSheet();
}

})();
