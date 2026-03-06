/* ============================================================
   MARGO — js/duet-sheet.js
   v2.6 — Export quality overhaul:
   • Single share button (GIF tab → GIF only, Poster tab → Poster only)
   • GIF: FloydSteinberg dither, 36 frames, quality:1, per-frame palette
   • Conversation canvas rebuilt — proper 1080×1080 layout, nothing clipped
   • Card canvas: SONGS bar added at bottom
   • Conversation canvas: SONGS bar added at bottom
   • Competing-with-giants visual quality on all exports
   ============================================================ */

(function () {

/* ── State ── */
const DS = {
  parentPost: null,
  echoPost:   null,
  mounted:    false,
  motion:     'fade-up',
  dur:        2.4,
  format:     'gif',
  bgColor:    '#07060E',
  fontFamily: 'DM Serif Display',
  fontItalic: true,
};

/* ── Vibe colours ── */
const DS_VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

/* ── Color theme map ── */
const DS_THEMES = {
  '#07060E': { grad:'linear-gradient(135deg,#0d0d0d,#1a1410)',  text:'#ffffff', isLight:false },
  '#0e0018': { grad:'linear-gradient(135deg,#1a0033,#2d1b4e)',  text:'#ffffff', isLight:false },
  '#04090f': { grad:'linear-gradient(135deg,#0a1420,#142838)',  text:'#ffffff', isLight:false },
  '#0f0404': { grad:'linear-gradient(135deg,#1a0a0a,#2d1416)',  text:'#ffffff', isLight:false },
  '#020f06': { grad:'linear-gradient(135deg,#051a0d,#0d2e1a)',  text:'#ffffff', isLight:false },
  '#0f0508': { grad:'linear-gradient(135deg,#1a0d0f,#2d1a1f)',  text:'#ffffff', isLight:false },
  '#080808': { grad:'linear-gradient(135deg,#000000,#111111)',   text:'#ffffff', isLight:false },
  '#150520': { grad:'linear-gradient(135deg,#2d0a3d,#6b1fa8)',   text:'#ffffff', isLight:false },
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
      display:block;
      overflow-y:auto;overflow-x:hidden;
      -webkit-overflow-scrolling:touch;
      animation:dsBackdropIn 0.25s ease;
    }
    #duetBackdrop.ds-hidden { display:none!important; }
    body.ds-modal-open { overflow:hidden; }
    @keyframes dsBackdropIn { from{opacity:0} to{opacity:1} }

    #duetSheet {
      width:100%; max-width:520px;
      background:#0c0b10;
      border:1px solid rgba(255,255,255,0.07);
      border-radius:28px 28px 0 0;
      overflow:visible;
      display:flex; flex-direction:column;
      margin:0 auto;
      box-shadow:0 -12px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(232,197,71,0.06) inset;
      animation:dsSlideUp 0.42s cubic-bezier(0.16,1,0.3,1);
    }
    @media(min-width:560px) {
      #duetSheet {
        border-radius:24px;
        border:1px solid rgba(255,255,255,0.07);
        margin:24px auto;
        animation:dsFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
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

    .ds-view-toggle {
      display:flex; align-items:center; justify-content:center;
      gap:6px; padding:14px 20px 0;
    }
    .ds-toggle-btn {
      font-family:'Space Mono',monospace; font-size:0.55rem; font-weight:700;
      letter-spacing:1px; text-transform:uppercase; padding:7px 18px;
      border-radius:20px; cursor:pointer; transition:all 0.2s; border:1px solid transparent;
    }
    .ds-toggle-btn.active {
      background:rgba(232,197,71,0.12); border-color:rgba(232,197,71,0.35); color:#E8C547;
    }
    .ds-toggle-btn:not(.active) {
      background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.09); color:rgba(255,255,255,0.45);
    }
    .ds-toggle-btn:not(.active):hover { color:rgba(255,255,255,0.75); background:rgba(255,255,255,0.07); }

    /* CONVERSATION VIEW */
    .ds-convo { padding:18px 18px 14px; display:flex; flex-direction:column; gap:12px; }

    .ds-bubble { max-width:82%; display:flex; flex-direction:column; gap:6px; animation:dsBubbleIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
    @keyframes dsBubbleIn { from{opacity:0;transform:translateY(10px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    .ds-bubble.original { align-self:flex-start; animation-delay:0.1s; }
    .ds-bubble.reply    { align-self:flex-end; align-items:flex-end; animation-delay:0.35s; }

    .ds-bubble-user {
      font-family:'Space Mono',monospace; font-size:0.6rem; font-weight:700;
      display:flex; align-items:center; gap:6px; padding:0 5px;
    }
    .ds-bubble.original .ds-bubble-user { color:var(--ds-vibe-left, #FF6B9D); }
    .ds-bubble.reply    .ds-bubble-user { color:var(--ds-vibe-right, #6B8CFF); flex-direction:row-reverse; }
    .ds-udot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .ds-bubble.original .ds-udot { background:var(--ds-vibe-left, #FF6B9D); }
    .ds-bubble.reply    .ds-udot { background:var(--ds-vibe-right, #6B8CFF); }

    .ds-bubble-card { padding:15px 17px; border-radius:20px; position:relative; overflow:hidden; }
    .ds-bubble.original .ds-bubble-card {
      background:rgba(255,107,157,0.09); border:1px solid rgba(255,107,157,0.25);
      border-bottom-left-radius:5px;
    }
    .ds-bubble.reply .ds-bubble-card {
      background:rgba(107,140,255,0.09); border:1px solid rgba(107,140,255,0.25);
      border-bottom-right-radius:5px;
    }
    .ds-bubble-card::before { content:''; position:absolute; inset:0; opacity:0.09; pointer-events:none; }
    .ds-bubble.original .ds-bubble-card::before { background:radial-gradient(ellipse at top left, var(--ds-vibe-left, #FF6B9D), transparent 65%); }
    .ds-bubble.reply    .ds-bubble-card::before { background:radial-gradient(ellipse at bottom right, var(--ds-vibe-right, #6B8CFF), transparent 65%); }

    .ds-bubble-lyric { font-family:'DM Serif Display',serif; font-style:italic; font-size:1.1rem; line-height:1.5; color:#fff; position:relative; z-index:1; }
    .ds-bubble-meta { margin-top:11px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .ds-bubble-song  { font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:700; color:#fff; }
    .ds-bubble-artist { font-family:'Space Mono',monospace; font-size:0.58rem; color:rgba(255,255,255,0.6); margin-top:2px; }
    .ds-bubble-vibe  { font-family:'Space Mono',monospace; font-size:0.5rem; font-weight:700; text-transform:uppercase; padding:4px 10px; border-radius:20px; flex-shrink:0; }
    .ds-bubble.original .ds-bubble-vibe { background:rgba(255,107,157,0.15); color:#FF9DC0; border:1px solid rgba(255,107,157,0.3); }
    .ds-bubble.reply    .ds-bubble-vibe { background:rgba(107,140,255,0.15); color:#9DB5FF; border:1px solid rgba(107,140,255,0.3); }

    .ds-lb-divider { display:flex; align-items:center; gap:9px; padding:2px 0; animation:dsBubbleIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
    .ds-lb-line { flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(232,197,71,0.22),transparent); }
    .ds-lb-pill { font-family:'Space Mono',monospace; font-size:0.52rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#E8C547; background:rgba(232,197,71,0.1); border:1px solid rgba(232,197,71,0.28); padding:6px 13px; border-radius:20px; white-space:nowrap; }

    .ds-song-strip { margin:6px 18px 0; padding:11px 15px; background:#181720; border-radius:13px; border:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:space-between; }
    .ds-strip-label { font-family:'Space Mono',monospace; font-size:0.5rem; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:rgba(255,255,255,0.3); }
    .ds-strip-songs { display:flex; align-items:center; gap:12px; }
    .ds-strip-song  { display:flex; flex-direction:column; gap:2px; }
    .ds-strip-song:last-child { align-items:flex-end; }
    .ds-strip-song-name   { font-family:'DM Sans',sans-serif; font-size:0.72rem; font-weight:700; color:rgba(255,255,255,0.85); }
    .ds-strip-song-artist { font-family:'Space Mono',monospace; font-size:0.5rem; color:rgba(255,255,255,0.4); }
    .ds-strip-sep { font-size:0.65rem; color:rgba(255,255,255,0.2); }

    /* CARD VIEW */
    .ds-card-view { padding:16px 18px 0; }

    .ds-canvas-preview {
      border-radius:18px; overflow:hidden;
      border:1px solid rgba(255,255,255,0.08);
      aspect-ratio:1; position:relative;
      background:#07060E;
    }
    .ds-canvas-bg {
      position:absolute; inset:0;
      transition:background 0.4s; z-index:0;
    }
    .ds-canvas-bg::before {
      content:''; position:absolute; inset:0;
      background:
        radial-gradient(ellipse 55% 48% at 12% 12%, var(--ds-glow-left, rgba(255,107,157,0.22)) 0%, transparent 65%),
        radial-gradient(ellipse 55% 48% at 88% 88%, var(--ds-glow-right, rgba(107,140,255,0.22)) 0%, transparent 65%);
      pointer-events:none;
    }
    .ds-canvas-content {
      position:relative; z-index:1;
      width:100%; height:100%;
      padding:24px 26px 20px;
      display:flex; flex-direction:column;
    }
    .ds-c-margo { font-family:'Syne',sans-serif; font-weight:800; font-size:0.9rem; letter-spacing:5px; color:#E8C547; }
    .ds-c-top { flex:1; display:flex; flex-direction:column; justify-content:flex-end; padding-bottom:14px; }
    .ds-c-lyric { font-family:'DM Serif Display',serif; font-style:italic; line-height:1.5; }
    .ds-c-lyric.dim  { font-size:1rem;  color:rgba(255,255,255,0.6); }
    .ds-c-lyric.bold { font-size:1.2rem; color:#fff; }
    .ds-c-attr { font-family:'Space Mono',monospace; font-size:0.48rem; color:rgba(255,255,255,0.45); margin-top:7px; }
    .ds-c-divider { display:flex; align-items:center; gap:8px; margin:6px 0; }
    .ds-c-div-line { flex:1; height:1px; background:rgba(232,197,71,0.25); }
    .ds-c-div-pill { font-family:'Space Mono',monospace; font-size:0.42rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#E8C547; background:rgba(232,197,71,0.12); border:1px solid rgba(232,197,71,0.32); padding:5px 11px; border-radius:20px; white-space:nowrap; }
    .ds-c-bottom { flex:1.3; display:flex; flex-direction:column; justify-content:flex-start; padding-top:14px; }
    .ds-c-watermark { text-align:center; margin-top:auto; padding-top:10px; }
    .ds-c-watermark-pill { display:inline-block; font-family:'Space Mono',monospace; font-size:0.44rem; font-weight:700; letter-spacing:1.5px; color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); padding:5px 14px; border-radius:20px; }

    .ds-card-actions { display:flex; gap:9px; padding:12px 0 0; }
    .ds-card-btn { flex:1; padding:12px 10px; border-radius:13px; border:none; cursor:pointer; font-family:'Space Mono',monospace; font-size:0.54rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:7px; transition:all 0.2s; }
    .ds-card-btn:hover { transform:translateY(-1px); }
    .ds-card-btn-download { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.7); }
    .ds-card-btn-download:hover { background:rgba(255,255,255,0.1); color:#fff; }

    /* EDITING PANEL */
    .ds-section-sep { height:1px; background:rgba(255,255,255,0.06); margin:14px 18px 0; }
    .ds-edit-panel { margin:14px 18px 0; background:#181720; border-radius:18px; border:1px solid rgba(255,255,255,0.07); overflow:hidden; }

    .ds-format-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,0.07); }
    .ds-format-tab { flex:1; padding:13px 10px; font-family:'Space Mono',monospace; font-size:0.58rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; cursor:pointer; transition:all 0.2s; border:none; background:none; border-bottom:2px solid transparent; margin-bottom:-1px; color:rgba(255,255,255,0.35); }
    .ds-format-tab.active-gif    { color:#00E5FF; border-bottom-color:#00E5FF; background:rgba(0,229,255,0.05); }
    .ds-format-tab.active-poster { color:#E8C547; border-bottom-color:#E8C547; background:rgba(232,197,71,0.05); }
    .ds-format-tab:not(.active-gif):not(.active-poster):hover { color:rgba(255,255,255,0.6); background:rgba(255,255,255,0.03); }

    .ds-option-tabs { display:flex; gap:6px; padding:12px 14px 0; }
    .ds-option-tab { padding:6px 13px; border-radius:20px; font-family:'Space Mono',monospace; font-size:0.5rem; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; cursor:pointer; transition:all 0.18s; border:1px solid transparent; }
    .ds-option-tab.active { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.18); color:#fff; }
    .ds-option-tab:not(.active) { background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.07); color:rgba(255,255,255,0.38); }
    .ds-option-tab:not(.active):hover { color:rgba(255,255,255,0.65); background:rgba(255,255,255,0.06); }

    .ds-panel-content { padding:14px; }
    .ds-panel-section { display:none; }
    .ds-panel-section.active { display:block; }
    .ds-panel-label { font-family:'Space Mono',monospace; font-size:0.5rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:10px; }

    .ds-motion-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
    .ds-motion-btn { padding:9px 4px; border-radius:10px; background:#1E1D28; border:1px solid rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); font-family:'DM Sans',sans-serif; font-size:0.66rem; font-weight:600; cursor:pointer; transition:all 0.18s; text-align:center; }
    .ds-motion-btn:hover { background:rgba(255,255,255,0.08); color:#fff; border-color:rgba(255,255,255,0.18); }
    .ds-motion-btn.active { background:rgba(0,229,255,0.12); border-color:rgba(0,229,255,0.4); color:#00E5FF; }

    .ds-speed-row { display:flex; gap:7px; margin-top:12px; }
    .ds-speed-btn { flex:1; padding:9px 6px; border-radius:10px; background:#1E1D28; border:1px solid rgba(255,255,255,0.07); color:rgba(255,255,255,0.5); font-family:'Space Mono',monospace; font-size:0.52rem; font-weight:700; cursor:pointer; transition:all 0.18s; text-align:center; }
    .ds-speed-btn.active { background:rgba(0,229,255,0.1); border-color:rgba(0,229,255,0.3); color:#00E5FF; }
    .ds-speed-btn:hover:not(.active) { background:rgba(255,255,255,0.07); color:#fff; }

    .ds-color-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
    .ds-color-swatch { border-radius:11px; overflow:hidden; cursor:pointer; border:2px solid transparent; transition:all 0.18s; aspect-ratio:1; position:relative; }
    .ds-color-swatch:hover { transform:scale(1.05); }
    .ds-color-swatch.active { border-color:#fff; box-shadow:0 0 0 1px rgba(255,255,255,0.4); }
    .ds-swatch-fill { width:100%; height:70%; }
    .ds-swatch-name { position:absolute; bottom:0; left:0; right:0; padding:4px 2px 5px; background:rgba(0,0,0,0.55); font-family:'Space Mono',monospace; font-size:0.42rem; font-weight:700; color:rgba(255,255,255,0.8); text-align:center; }

    .ds-font-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
    .ds-font-card { padding:12px 12px 10px; border-radius:12px; background:#1E1D28; border:1px solid rgba(255,255,255,0.07); cursor:pointer; transition:all 0.18s; display:flex; flex-direction:column; gap:5px; }
    .ds-font-card:hover { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.16); }
    .ds-font-card.active { background:rgba(232,197,71,0.08); border-color:rgba(232,197,71,0.3); }
    .ds-font-preview { font-size:1rem; line-height:1.3; color:rgba(255,255,255,0.9); }
    .ds-font-card-name { font-family:'Space Mono',monospace; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:1px; }
    .ds-font-card.active .ds-font-card-name { color:#E8C547; }

    /* Share row — single button */
    .ds-share-row { display:flex; gap:9px; padding:14px 18px 22px; }
    .ds-share-btn { flex:1; padding:16px 10px; border-radius:17px; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; transition:all 0.22s cubic-bezier(0.16,1,0.3,1); font-family:'Space Mono',monospace; font-weight:700; font-size:0.54rem; letter-spacing:1.2px; text-transform:uppercase; }
    .ds-share-btn:hover  { transform:translateY(-2px); }
    .ds-share-btn:active { transform:scale(0.97); }
    .ds-share-btn:disabled { cursor:wait; transform:none; }
    .ds-share-btn-icon { font-size:1.1rem; }
    .ds-btn-gif { background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.25); color:#00E5FF; }
    .ds-btn-gif:hover { background:rgba(0,229,255,0.14); border-color:rgba(0,229,255,0.45); box-shadow:0 8px 24px rgba(0,229,255,0.12); }
    .ds-btn-poster { background:rgba(232,197,71,0.1); border:1px solid rgba(232,197,71,0.3); color:#E8C547; }
    .ds-btn-poster:hover { background:rgba(232,197,71,0.17); border-color:rgba(232,197,71,0.52); box-shadow:0 8px 24px rgba(232,197,71,0.15); }

    /* MOTION KEYFRAMES */
    @keyframes dsKFadeUp {
      0%       { opacity:0; transform:translateY(20px); }
      25%,75%  { opacity:1; transform:translateY(0); }
      100%     { opacity:0; transform:translateY(-8px); }
    }
    @keyframes dsKSlideIn {
      0%       { opacity:0; transform:translateX(-30px); }
      25%,75%  { opacity:1; transform:translateX(0); }
      100%     { opacity:0; transform:translateX(12px); }
    }
    @keyframes dsKPulse {
      0%,100%  { opacity:0.4; transform:scale(0.96); }
      50%      { opacity:1;   transform:scale(1.03); }
    }
    @keyframes dsKGlitch {
      0%,88%,100% { transform:translate(0,0) skew(0deg); filter:none; opacity:1; }
      89%  { transform:translate(-5px,2px) skew(-3deg); filter:hue-rotate(90deg) brightness(1.4); opacity:0.8; }
      91%  { transform:translate(5px,-2px) skew(3deg);  filter:hue-rotate(-90deg); opacity:0.9; }
      93%  { transform:translate(-3px,1px) skew(-1deg); filter:brightness(1.6); opacity:0.85; }
      95%  { transform:translate(3px,-1px); filter:none; opacity:1; }
    }
    @keyframes dsKWave {
      0%,100% { transform:translateY(0); }
      30%     { transform:translateY(-10px); }
      60%     { transform:translateY(5px); }
    }
    @keyframes dsKShimmer {
      0%   { background-position:-300% center; }
      100% { background-position:300% center; }
    }
    @keyframes dsKBounce {
      0%,100% { transform:translateY(0);    animation-timing-function:ease-in; }
      40%     { transform:translateY(-18px); animation-timing-function:ease-out; }
      60%     { transform:translateY(-6px); }
      75%     { transform:translateY(-12px); }
      90%     { transform:translateY(-2px); }
    }
    @keyframes dsKBlink { 0%,100%{border-color:#E8C547} 50%{border-color:transparent} }
    @keyframes dsKType  {
      0%,5%   { width:0; opacity:1; }
      55%,90% { width:100%; opacity:1; }
      95%,100%{ width:100%; opacity:0; }
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
          <div class="ds-canvas-preview">
            <div class="ds-canvas-bg" id="dsCanvasBg"></div>
            <div class="ds-canvas-content" id="dsCanvasContent">
              <div class="ds-c-margo ds-anim" data-i="0">MARGO</div>
              <div class="ds-c-top">
                <div class="ds-c-lyric dim ds-anim" data-i="1" id="dsCLyricTop"></div>
                <div class="ds-c-attr ds-anim"      data-i="2" id="dsCAttrTop"></div>
              </div>
              <div class="ds-c-divider ds-anim" data-i="3">
                <div class="ds-c-div-line"></div>
                <div class="ds-c-div-pill" id="dsCDivPill">LYRIC BACK ↩</div>
                <div class="ds-c-div-line"></div>
              </div>
              <div class="ds-c-bottom">
                <div class="ds-c-lyric bold ds-anim" data-i="4" id="dsCLyricBot"></div>
                <div class="ds-c-attr ds-anim"       data-i="5" id="dsCAttrBot"></div>
              </div>
              <div class="ds-c-watermark ds-anim" data-i="6">
                <span class="ds-c-watermark-pill">trymargo.com</span>
              </div>
            </div>
          </div>
          <div class="ds-card-actions">
            <button class="ds-card-btn ds-card-btn-download" id="dsBtnDownload">↓ Save Image</button>
          </div>
        </div>
      </div>

      <div class="ds-section-sep"></div>

      <!-- EDITING PANEL -->
      <div class="ds-edit-panel">
        <div class="ds-format-tabs">
          <button class="ds-format-tab active-gif"    id="dsFmtGif"    data-fmt="gif">GIF</button>
          <button class="ds-format-tab"               id="dsFmtPoster" data-fmt="poster">Poster</button>
        </div>

        <div class="ds-option-tabs" id="dsOptionTabs">
          <button class="ds-option-tab active" data-opt="motion">Motion</button>
          <button class="ds-option-tab"        data-opt="color">Color</button>
          <button class="ds-option-tab"        data-opt="font">Font</button>
        </div>

        <div class="ds-panel-content">

          <!-- MOTION -->
          <div class="ds-panel-section active" id="ds-section-motion">
            <div class="ds-panel-label">Pick a style — card updates live</div>
            <div class="ds-motion-grid" id="dsMotionGrid">
              <button class="ds-motion-btn active" data-motion="fade-up">Fade Up</button>
              <button class="ds-motion-btn"        data-motion="typewriter">Typewriter</button>
              <button class="ds-motion-btn"        data-motion="slide-in">Slide In</button>
              <button class="ds-motion-btn"        data-motion="pulse">Pulse</button>
              <button class="ds-motion-btn"        data-motion="glitch">Glitch</button>
              <button class="ds-motion-btn"        data-motion="wave">Wave</button>
              <button class="ds-motion-btn"        data-motion="shimmer">Shimmer</button>
              <button class="ds-motion-btn"        data-motion="bounce">Bounce</button>
            </div>
            <div class="ds-panel-label" style="margin-top:14px">Speed</div>
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
              <div class="ds-color-swatch active" data-bg="#07060E">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#0d0d0d,#E8C547)"></div>
                <div class="ds-swatch-name">Gold</div>
              </div>
              <div class="ds-color-swatch" data-bg="#0e0018">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0033,#c77dff)"></div>
                <div class="ds-swatch-name">Violet</div>
              </div>
              <div class="ds-color-swatch" data-bg="#04090f">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#0a1420,#00e5ff)"></div>
                <div class="ds-swatch-name">Ocean</div>
              </div>
              <div class="ds-color-swatch" data-bg="#0f0404">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0a0a,#ff6b6b)"></div>
                <div class="ds-swatch-name">Ember</div>
              </div>
              <div class="ds-color-swatch" data-bg="#020f06">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></div>
                <div class="ds-swatch-name">Forest</div>
              </div>
              <div class="ds-color-swatch" data-bg="#0f0508">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></div>
                <div class="ds-swatch-name">Rose</div>
              </div>
              <div class="ds-color-swatch" data-bg="#080808">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#000,#fff)"></div>
                <div class="ds-swatch-name">Mono</div>
              </div>
              <div class="ds-color-swatch" data-bg="#150520">
                <div class="ds-swatch-fill" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></div>
                <div class="ds-swatch-name">Wave</div>
              </div>
            </div>
          </div>

          <!-- FONT -->
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
              <div class="ds-font-card" data-family="Space Mono" data-italic="false">
                <div class="ds-font-preview" style="font-family:'Space Mono',monospace">Say everything</div>
                <div class="ds-font-card-name">Mono</div>
              </div>
              <div class="ds-font-card" data-family="DM Sans" data-italic="false">
                <div class="ds-font-preview" style="font-family:'DM Sans',sans-serif;font-weight:700">Say everything</div>
                <div class="ds-font-card-name">Sans Bold</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Single share button — swaps based on format tab -->
      <div class="ds-share-row">
        <button class="ds-share-btn ds-btn-gif" id="dsBtnShare">
          <span class="ds-share-btn-icon">◎</span><span id="dsBtnShareLabel">Share as GIF</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(backdrop);
  DS.mounted = true;

  document.getElementById('dsClose').onclick        = closeDuetSheet;
  document.getElementById('dsToggleConvo').onclick  = () => _dsShowView('convo');
  document.getElementById('dsToggleCard').onclick   = () => _dsShowView('card');
  document.getElementById('dsBtnDownload').onclick  = () => _dsExportPoster();
  document.getElementById('dsBtnShare').onclick     = () => _dsRoute();

  document.querySelectorAll('.ds-format-tab').forEach(btn => {
    btn.onclick = () => _dsSwitchFormat(btn.dataset.fmt);
  });

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
    _dsPlayMotion();
  });

  document.getElementById('dsSpeedRow').addEventListener('click', e => {
    const btn = e.target.closest('.ds-speed-btn');
    if (!btn) return;
    document.querySelectorAll('.ds-speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    DS.dur = parseFloat(btn.dataset.dur);
    _dsPlayMotion();
  });

  document.querySelectorAll('.ds-color-swatch').forEach(sw => {
    sw.onclick = () => {
      document.querySelectorAll('.ds-color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      DS.bgColor = sw.dataset.bg;
      _dsApplyTheme(DS.bgColor);
    };
  });

  document.querySelectorAll('.ds-font-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.ds-font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      DS.fontFamily = card.dataset.family;
      DS.fontItalic = card.dataset.italic === 'true';
      _dsUpdateCardFonts();
    };
  });

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
  DS.motion = 'fade-up';
  DS.dur    = 2.4;
  DS.format = 'gif';

  _dsPopulateConvo();
  _dsPopulateCard();
  _dsApplyTheme(DS.bgColor);
  _dsShowView('convo');
  _dsSwitchFormat('gif');

  const backdrop = document.getElementById('duetBackdrop');
  backdrop.classList.remove('ds-hidden');
  document.body.classList.add('ds-modal-open');
  DS._savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
}

function closeDuetSheet() {
  const backdrop = document.getElementById('duetBackdrop');
  if (backdrop) backdrop.classList.add('ds-hidden');
  document.body.classList.remove('ds-modal-open');
  _dsClearAnims();
  const savedY = DS._savedScrollY || 0;
  requestAnimationFrame(() => { window.scrollTo({ top: savedY, behavior: 'instant' }); });
}

/* ══════════════════════════════════════════════════════════
   POPULATE
══════════════════════════════════════════════════════════ */
function _dsPopulateConvo() {
  const p = DS.parentPost;
  const e = DS.echoPost;
  if (!p || !e) return;

  const pVibe  = DS_VIBE[p.emotion || 'Nostalgia'] || '#E8C547';
  const eVibe  = DS_VIBE[e.emotion || 'Nostalgia'] || '#E8C547';
  const pk     = p.knowledge || {};
  const pUser  = ('@' + (p.username  || 'anonymous')).toUpperCase();
  const eUser  = ('@' + (e.username  || 'anonymous')).toUpperCase();
  const pSong  = pk.song   || p.song   || '—';
  const pArtist= pk.artist || p.artist || '';
  const eSong  = e.song    || '—';
  const eArtist= e.artist  || '';

  const sheet = document.getElementById('duetSheet');
  sheet.style.setProperty('--ds-vibe-left',  pVibe);
  sheet.style.setProperty('--ds-vibe-right', eVibe);

  document.getElementById('dsConvoBubbles').innerHTML = `
    <div class="ds-bubble original">
      <div class="ds-bubble-user"><span class="ds-udot"></span>${_dsEsc(pUser)}</div>
      <div class="ds-bubble-card">
        <div class="ds-bubble-lyric">${_dsEsc(p.text || p.lyric || '')}</div>
        <div class="ds-bubble-meta">
          <div>
            <div class="ds-bubble-song">${_dsEsc(pSong)}</div>
            <div class="ds-bubble-artist">${_dsEsc(pArtist)}</div>
          </div>
          <span class="ds-bubble-vibe">${_dsEsc(p.emotion || 'Vibe')}</span>
        </div>
      </div>
    </div>
    <div class="ds-lb-divider">
      <div class="ds-lb-line"></div>
      <div class="ds-lb-pill">Lyric Back ↩ ${_dsEsc(eUser)}</div>
      <div class="ds-lb-line"></div>
    </div>
    <div class="ds-bubble reply">
      <div class="ds-bubble-user">${_dsEsc(eUser)}<span class="ds-udot"></span></div>
      <div class="ds-bubble-card">
        <div class="ds-bubble-lyric">${_dsEsc(e.lyric || e.text || '')}</div>
        <div class="ds-bubble-meta">
          <div>
            <div class="ds-bubble-song">${_dsEsc(eSong)}</div>
            <div class="ds-bubble-artist">${_dsEsc(eArtist)}</div>
          </div>
          <span class="ds-bubble-vibe">${_dsEsc(e.emotion || 'Vibe')}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('dsSongStrip').innerHTML = `
    <span class="ds-strip-label">Songs</span>
    <div class="ds-strip-songs">
      <div class="ds-strip-song">
        <span class="ds-strip-song-name">${_dsEsc(pSong)}</span>
        <span class="ds-strip-song-artist">${_dsEsc(pArtist)}</span>
      </div>
      <span class="ds-strip-sep">↔</span>
      <div class="ds-strip-song">
        <span class="ds-strip-song-name">${_dsEsc(eSong)}</span>
        <span class="ds-strip-song-artist">${_dsEsc(eArtist)}</span>
      </div>
    </div>
  `;
}

function _dsPopulateCard() {
  const p = DS.parentPost;
  const e = DS.echoPost;
  if (!p || !e) return;

  const pk      = p.knowledge || {};
  const pSong   = pk.song   || p.song   || '';
  const pArtist = pk.artist || p.artist || '';
  const eSong   = e.song    || '';
  const eArtist = e.artist  || '';
  const pUser   = ('@' + (p.username || 'anonymous')).toUpperCase();
  const eUser   = ('@' + (e.username || 'anonymous')).toUpperCase();

  const lyricTop = document.getElementById('dsCLyricTop');
  const lyricBot = document.getElementById('dsCLyricBot');
  const attrTop  = document.getElementById('dsCAttrTop');
  const attrBot  = document.getElementById('dsCAttrBot');
  const divPill  = document.getElementById('dsCDivPill');

  if (lyricTop) lyricTop.textContent = p.text   || p.lyric || '';
  if (lyricBot) lyricBot.textContent = e.lyric  || e.text  || '';
  if (attrTop)  attrTop.textContent  = [pSong, pArtist].filter(Boolean).join(' — ') + ' · ' + pUser;
  if (attrBot)  attrBot.textContent  = [eSong, eArtist].filter(Boolean).join(' — ') + ' · ' + eUser;
  if (divPill)  divPill.textContent  = 'LYRIC BACK ↩ ' + eUser;
}

function _dsApplyTheme(bg) {
  const theme = DS_THEMES[bg] || { grad: bg, text: '#ffffff', isLight: false };
  const textColor = theme.text;
  const isDark = !theme.isLight;

  const canvasBg = document.getElementById('dsCanvasBg');
  if (canvasBg) canvasBg.style.background = theme.grad;

  document.querySelectorAll('.ds-c-lyric').forEach(el => { el.style.color = textColor; });
  document.querySelectorAll('.ds-c-attr').forEach(el => {
    el.style.color = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)';
  });
  const margo = document.querySelector('.ds-c-margo');
  if (margo) margo.style.color = isDark ? '#E8C547' : '#0B0B0D';

  document.querySelectorAll('.ds-bubble.original .ds-bubble-card').forEach(el => {
    el.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    el.style.border = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)';
  });
  document.querySelectorAll('.ds-bubble.reply .ds-bubble-card').forEach(el => {
    el.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
    el.style.border = isDark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(0,0,0,0.15)';
  });
  document.querySelectorAll('.ds-bubble-lyric').forEach(el => { el.style.color = textColor; });
  document.querySelectorAll('.ds-bubble-song').forEach(el => { el.style.color = textColor; });
  document.querySelectorAll('.ds-bubble-artist').forEach(el => {
    el.style.color = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  });
  document.querySelectorAll('.ds-bubble-meta').forEach(el => {
    el.style.borderTopColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  });

  const convo = document.getElementById('dsViewConvo');
  if (convo) convo.style.background = theme.grad;
  const card = document.getElementById('dsViewCard');
  if (card) card.style.background = theme.grad;

  const strip = document.getElementById('dsSongStrip');
  if (strip) {
    strip.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    strip.style.border = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)';
  }
  document.querySelectorAll('.ds-strip-song-name').forEach(el => {
    el.style.color = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)';
  });
  document.querySelectorAll('.ds-strip-song-artist').forEach(el => {
    el.style.color = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  });
  document.querySelectorAll('.ds-strip-label').forEach(el => {
    el.style.color = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
  });
}

function _dsUpdateCardFonts() {
  ['dsCLyricTop','dsCLyricBot'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.fontFamily = `'${DS.fontFamily}', serif`;
    el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
  });
  document.querySelectorAll('.ds-bubble-lyric').forEach(el => {
    el.style.fontFamily = `'${DS.fontFamily}', serif`;
    el.style.fontStyle  = DS.fontItalic ? 'italic' : 'normal';
  });
}

/* ══════════════════════════════════════════════════════════
   VIEW TOGGLE
══════════════════════════════════════════════════════════ */
function _dsShowView(v) {
  const convo = document.getElementById('dsViewConvo');
  const card  = document.getElementById('dsViewCard');
  const tc    = document.getElementById('dsToggleConvo');
  const tk    = document.getElementById('dsToggleCard');

  convo.style.display = v === 'convo' ? '' : 'none';
  card.style.display  = v === 'card'  ? '' : 'none';
  tc.classList.toggle('active', v === 'convo');
  tk.classList.toggle('active', v === 'card');

  if (v === 'card' || v === 'convo') _dsPlayMotion();
  else _dsClearAnims();
}

/* ══════════════════════════════════════════════════════════
   FORMAT SWITCH — updates single share button label
══════════════════════════════════════════════════════════ */
function _dsSwitchFormat(fmt) {
  DS.format = fmt;
  const fmtGif    = document.getElementById('dsFmtGif');
  const fmtPoster = document.getElementById('dsFmtPoster');
  if (fmtGif)    fmtGif.className    = 'ds-format-tab' + (fmt === 'gif'    ? ' active-gif'    : '');
  if (fmtPoster) fmtPoster.className = 'ds-format-tab' + (fmt === 'poster' ? ' active-poster' : '');

  /* Swap button style + label */
  const btn   = document.getElementById('dsBtnShare');
  const label = document.getElementById('dsBtnShareLabel');
  if (btn && label) {
    if (fmt === 'gif') {
      btn.className = 'ds-share-btn ds-btn-gif';
      btn.querySelector('.ds-share-btn-icon').textContent = '◎';
      label.textContent = 'Share as GIF';
    } else {
      btn.className = 'ds-share-btn ds-btn-poster';
      btn.querySelector('.ds-share-btn-icon').textContent = '✦';
      label.textContent = 'Share as Poster';
    }
  }

  const motionTab = document.querySelector('[data-opt="motion"]');
  if (fmt === 'poster') {
    if (motionTab) motionTab.style.display = 'none';
    const activeOpt = document.querySelector('.ds-option-tab.active');
    if (activeOpt && activeOpt.dataset.opt === 'motion') {
      document.querySelectorAll('.ds-option-tab').forEach(b => b.classList.remove('active'));
      const colorTab = document.querySelector('[data-opt="color"]');
      if (colorTab) colorTab.classList.add('active');
      document.querySelectorAll('.ds-panel-section').forEach(s => s.classList.remove('active'));
      document.getElementById('ds-section-color').classList.add('active');
    }
    _dsClearAnims();
  } else {
    if (motionTab) motionTab.style.display = '';
    _dsPlayMotion();
  }
}

/* ══════════════════════════════════════════════════════════
   MOTION ANIMATIONS
══════════════════════════════════════════════════════════ */
function _dsClearAnims() {
  document.querySelectorAll('.ds-anim, .ds-bubble-lyric').forEach(el => {
    el.style.animation              = '';
    el.style.opacity                = '';
    el.style.transform              = '';
    el.style.overflow               = '';
    el.style.whiteSpace             = '';
    el.style.borderRight            = '';
    el.style.width                  = '';
    el.style.display                = '';
    el.style.background             = '';
    el.style.backgroundSize         = '';
    el.style.webkitBackgroundClip   = '';
    el.style.webkitTextFillColor    = '';
    el.style.backgroundClip         = '';
  });
}

function _dsPlayMotion() {
  if (DS.format === 'poster') return;
  _dsClearAnims();
  void document.getElementById('dsCanvasContent').offsetHeight;

  const els  = document.querySelectorAll('.ds-anim, .ds-bubble-lyric');
  const dur  = DS.dur;
  const name = DS.motion;

  els.forEach((el, idx) => {
    const i     = parseInt(el.getAttribute('data-i') ?? idx);
    const delay = i * 0.14;
    switch (name) {
      case 'fade-up':
        el.style.animation = `dsKFadeUp ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'slide-in':
        el.style.animation = `dsKSlideIn ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'pulse':
        el.style.animation = `dsKPulse ${dur}s ${delay}s ease-in-out infinite both`; break;
      case 'glitch':
        el.style.animation = `dsKGlitch ${dur}s ${delay * 0.5}s steps(1) infinite`; break;
      case 'wave':
        el.style.display   = 'inline-block';
        el.style.animation = `dsKWave ${dur}s ${delay}s ease-in-out infinite`; break;
      case 'shimmer':
        el.style.background           = 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, #fff 35%, #E8C547 50%, #fff 65%, rgba(255,255,255,0.6) 100%)';
        el.style.backgroundSize       = '300% auto';
        el.style.webkitBackgroundClip = 'text';
        el.style.webkitTextFillColor  = 'transparent';
        el.style.backgroundClip       = 'text';
        el.style.animation            = `dsKShimmer ${dur}s ${delay}s linear infinite`; break;
      case 'bounce':
        el.style.display   = 'inline-block';
        el.style.animation = `dsKBounce ${dur}s ${delay}s ease infinite`; break;
      case 'typewriter':
        el.style.overflow   = 'hidden';
        el.style.whiteSpace = 'nowrap';
        el.style.borderRight= '2px solid #E8C547';
        el.style.width      = '0';
        el.style.animation  =
          `dsKType ${dur}s ${delay}s steps(30,end) infinite,` +
          `dsKBlink 0.7s ${delay}s step-end infinite`; break;
    }
  });
}

/* ══════════════════════════════════════════════════════════
   ROUTE — single button dispatches based on DS.format
══════════════════════════════════════════════════════════ */
function _dsRoute() {
  if (DS.format === 'gif') _dsExportGif();
  else _dsExportPoster();
}

function _dsActiveView() {
  const card = document.getElementById('dsViewCard');
  return card && card.style.display !== 'none' ? 'card' : 'convo';
}

/* ══════════════════════════════════════════════════════════
   GIF EXPORT
   — 36 frames, quality:1, FloydSteinberg dither
   — Routes to correct canvas draw per active view
══════════════════════════════════════════════════════════ */
async function _dsExportGif() {
  const btn      = document.getElementById('dsBtnShare');
  const origHTML = btn ? btn.innerHTML : '';

  function setBtnText(txt) {
    if (btn) btn.innerHTML = `<span class="ds-share-btn-icon">◎</span>${txt}`;
  }

  if (btn) btn.disabled = true;
  setBtnText('GIF 0%');

  const SIZE   = 1080;
  const FRAMES = 36;
  const DELAY  = 55;

  const off = document.createElement('canvas');
  off.width = SIZE; off.height = SIZE;
  const oc  = off.getContext('2d');

  try {
    await document.fonts.ready;

    if (typeof GIF === 'undefined') {
      await new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src   = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
    }

    const isConvo = _dsActiveView() === 'convo';

    const gif = new GIF({
      workers:      4,
      quality:      1,
      width:        SIZE,
      height:       SIZE,
      workerScript: '/js/gif.worker.js',
      dither:       'FloydSteinberg',
      globalPalette: false,
    });

    for (let i = 0; i < FRAMES; i++) {
      const t = i / FRAMES;
      oc.clearRect(0, 0, SIZE, SIZE);
      if (isConvo) {
        _dsDrawConvo(oc, SIZE, SIZE);
      } else {
        _dsDrawCard(oc, SIZE, SIZE, DS.parentPost, DS.echoPost, t);
      }
      gif.addFrame(off, { copy: true, delay: DELAY });
      setBtnText(`GIF ${Math.round((i / FRAMES) * 75)}%`);
      await new Promise(r => setTimeout(r, 0));
    }

    gif.on('progress', p => {
      setBtnText(`Encoding… ${Math.round(75 + p * 25)}%`);
    });

    gif.on('finished', blob => {
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const name = (DS.parentPost?.knowledge?.song || DS.parentPost?.song || 'duet')
                     .replace(/\s+/g, '-').toLowerCase();
      a.href = url;
      a.download = `margo-duet-${name}.gif`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      if (btn) {
        btn.innerHTML = `<span class="ds-share-btn-icon">✓</span>GIF Saved!`;
        btn.disabled  = false;
        setTimeout(() => { btn.innerHTML = origHTML; }, 2200);
      }
    });

    gif.render();

  } catch (err) {
    console.error('Duet GIF error:', err);
    if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
  }
}

/* ══════════════════════════════════════════════════════════
   POSTER EXPORT
   — PNG, toBlob 0.92, exact poster.js pattern
══════════════════════════════════════════════════════════ */
function _dsExportPoster() {
  const btn      = document.getElementById('dsBtnShare');
  const origHTML = btn ? btn.innerHTML : '';

  function setBtnText(txt) {
    if (btn) btn.innerHTML = `<span class="ds-share-btn-icon">✦</span>${txt}`;
  }

  if (btn) btn.disabled = true;
  setBtnText('0%');

  const SIZE = 1080;
  const off  = document.createElement('canvas');
  off.width  = SIZE; off.height = SIZE;
  const ctx  = off.getContext('2d');

  setBtnText('35%');

  document.fonts.ready.then(() => {
    setBtnText('70%');

    const isConvo = _dsActiveView() === 'convo';
    if (isConvo) {
      _dsDrawConvo(ctx, SIZE, SIZE);
    } else {
      _dsDrawCard(ctx, SIZE, SIZE, DS.parentPost, DS.echoPost, 1);
    }

    setBtnText('90%');

    const name = (DS.parentPost?.knowledge?.song || DS.parentPost?.song || 'duet')
                   .replace(/\s+/g, '-').toLowerCase();

    off.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `margo-poster-${name}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      if (btn) {
        btn.innerHTML = `<span class="ds-share-btn-icon">✓</span>Saved!`;
        btn.disabled  = false;
        setTimeout(() => { btn.innerHTML = origHTML; }, 2200);
      }
    }, 'image/png', 0.92);
  });
}

/* ══════════════════════════════════════════════════════════
   CANVAS: CONVERSATION VIEW
   Rebuilt for 1080×1080 — proper proportions, nothing clipped
   Layout: MARGO → bubble1 → divider pill → bubble2 → songs bar → watermark
══════════════════════════════════════════════════════════ */
function _dsDrawConvo(ctx, W, H) {
  const p = DS.parentPost;
  const e = DS.echoPost;
  if (!p || !e) return;

  const theme      = DS_THEMES[DS.bgColor] || DS_THEMES['#07060E'];
  const isDark     = !theme.isLight;
  const textCol    = theme.text || '#ffffff';
  const lyricFont  = DS.fontFamily || 'DM Serif Display';
  const lyricStyle = DS.fontItalic !== false ? 'italic ' : '';

  const pk      = p.knowledge || {};
  const pVibe   = DS_VIBE[p.emotion || 'Nostalgia'] || '#E8C547';
  const eVibe   = DS_VIBE[e.emotion || 'Nostalgia'] || '#6B8CFF';
  const pUser   = ('@' + (p.username || 'anonymous')).toUpperCase();
  const eUser   = ('@' + (e.username || 'anonymous')).toUpperCase();
  const pSong   = pk.song   || p.song   || '';
  const pArtist = pk.artist || p.artist || '';
  const eSong   = e.song    || '';
  const eArtist = e.artist  || '';
  const pLyric  = p.text || p.lyric || '';
  const eLyric  = e.lyric || e.text || '';
  const pEmo    = p.emotion || '';
  const eEmo    = e.emotion || '';

  const pad     = W * 0.065;
  const bubbleW = W * 0.74;

  /* ── Background ── */
  const colors = theme.grad.match(/#[0-9a-fA-F]{6}/g) || ['#090810','#0d0b12'];
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, colors[0]);
  bg.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ── Vibe atmosphere glows ── */
  _dsGlow(ctx, W * 0.12, H * 0.22, W * 0.55, pVibe + '30');
  _dsGlow(ctx, W * 0.88, H * 0.78, W * 0.55, eVibe + '30');

  /* ── Top accent line ── */
  const tl = ctx.createLinearGradient(0, 0, W, 0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(0.5, pVibe); tl.addColorStop(1,'transparent');
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = tl; ctx.fillRect(0, 0, W, 2); ctx.restore();

  /* ── MARGO wordmark ── */
  const mSz = W * 0.048;
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.92;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.letterSpacing = '4px';
  ctx.fillText('MARGO', pad, pad * 0.7);
  ctx.restore();

  /* ── Measure bubble heights before drawing ── */
  const innerPad = W * 0.042;
  const lyrFS    = W * 0.052;
  const metaH    = W * 0.062;

  ctx.font = `${lyricStyle}600 ${lyrFS}px '${lyricFont}',serif`;
  const pLines = _dsWrap(ctx, pLyric, bubbleW - innerPad * 2);
  const eLines = _dsWrap(ctx, eLyric, bubbleW - innerPad * 2);
  const lyrLH  = lyrFS * 1.55;

  const pCardH = innerPad + pLines.length * lyrLH + innerPad * 0.6 + metaH + innerPad;
  const eCardH = innerPad + eLines.length * lyrLH + innerPad * 0.6 + metaH + innerPad;

  const userLabelH = W * 0.032;
  const userGap    = W * 0.014;
  const dividerH   = W * 0.052;
  const divGapV    = H * 0.028;

  /* Songs bar at bottom */
  const songsBarH  = W * 0.088;
  const songsBarY  = H - pad * 0.7 - songsBarH - W * 0.042; /* above watermark */
  const watermarkH = W * 0.035;
  const watermarkY = H - pad * 0.55;

  /* Layout top-down */
  const margoBottom = pad * 0.7 + mSz + pad * 0.5;
  const p1Y = margoBottom;                                          /* p user label top */
  const p2Y = p1Y + userLabelH + userGap;                          /* p bubble top */
  const divTop = p2Y + pCardH + divGapV;                           /* divider centre */
  const e1Y = divTop + dividerH / 2 + divGapV;                     /* e user label top */
  const e2Y = e1Y + userLabelH + userGap;                          /* e bubble top */

  /* ── Draw parent bubble ── */
  _dsDrawBubble(ctx, W, pad, bubbleW, p1Y, p2Y, pCardH, pLines, lyrFS, lyrLH, lyricStyle, lyricFont, innerPad, metaH, pSong, pArtist, pEmo, pUser, pVibe, textCol, isDark, true);

  /* ── Divider pill ── */
  const dText = `LYRIC BACK ↩  ${eUser}`;
  const dFS   = W * 0.022;
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  const dTW = ctx.measureText(dText).width;
  const pH  = dFS * 2.1;
  const pW  = dTW + W * 0.06;
  const pX  = W / 2 - pW / 2;
  const pR  = pH / 2;

  /* Lines either side */
  ctx.save();
  [[pad, pX - W * 0.02], [pX + pW + W * 0.02, W - pad]].forEach(([x1, x2]) => {
    const lg = ctx.createLinearGradient(x1, 0, x2, 0);
    if (x1 === pad) { lg.addColorStop(0,'transparent'); lg.addColorStop(1,'rgba(232,197,71,0.28)'); }
    else            { lg.addColorStop(0,'rgba(232,197,71,0.28)'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1, divTop - 0.8, x2 - x1, 1.6);
  });
  ctx.restore();

  ctx.save();
  ctx.shadowColor = '#E8C547'; ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(232,197,71,0.6)'; ctx.lineWidth = 1.5;
  _dsRR(ctx, pX, divTop - pH / 2, pW, pH, pR); ctx.stroke();
  ctx.shadowBlur = 0;
  const pFill = ctx.createLinearGradient(pX, divTop - pH / 2, pX, divTop + pH / 2);
  pFill.addColorStop(0,'rgba(232,197,71,0.16)'); pFill.addColorStop(1,'rgba(232,197,71,0.06)');
  ctx.fillStyle = pFill; _dsRR(ctx, pX, divTop - pH / 2, pW, pH, pR); ctx.fill();
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.95;
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(dText, W / 2, divTop);
  ctx.restore();

  /* ── Draw echo bubble ── */
  _dsDrawBubble(ctx, W, pad, bubbleW, e1Y, e2Y, eCardH, eLines, lyrFS, lyrLH, lyricStyle, lyricFont, innerPad, metaH, eSong, eArtist, eEmo, eUser, eVibe, textCol, isDark, false);

  /* ── Songs bar ── */
  _dsDrawSongsBar(ctx, W, pad, songsBarY, songsBarH, pSong, pArtist, eSong, eArtist, isDark, textCol);

  /* ── Bottom accent line ── */
  const bl = ctx.createLinearGradient(0, 0, W, 0);
  bl.addColorStop(0,'transparent'); bl.addColorStop(0.5, eVibe); bl.addColorStop(1,'transparent');
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = bl; ctx.fillRect(0, H - 2, W, 2); ctx.restore();

  /* ── Watermark ── */
  _dsDrawWatermark(ctx, W, watermarkY);
}

/* ── Draw a single bubble ── */
function _dsDrawBubble(ctx, W, pad, bubbleW, userY, cardY, cardH, lines, lyrFS, lyrLH, lyricStyle, lyricFont, innerPad, metaH, song, artist, emotion, user, vibe, textCol, isDark, isLeft) {
  const bX = isLeft ? pad : W - pad - bubbleW;
  const uFS = W * 0.023;
  const dotR = uFS * 0.3;

  /* User label */
  ctx.save();
  ctx.font = `700 ${uFS}px 'Space Mono',monospace`;
  ctx.fillStyle = vibe; ctx.globalAlpha = 0.9;
  ctx.textBaseline = 'top';
  const dotX = isLeft ? bX + innerPad : bX + bubbleW - innerPad;
  const labelX = isLeft ? dotX + dotR * 2.5 + uFS * 0.3 : dotX - dotR * 2.5 - uFS * 0.3;
  ctx.textAlign = isLeft ? 'left' : 'right';
  ctx.fillText(user, labelX, userY);
  ctx.beginPath();
  ctx.arc(isLeft ? dotX - dotR * 1.5 : dotX + dotR * 1.5, userY + uFS * 0.55, dotR, 0, Math.PI * 2);
  ctx.fillStyle = vibe; ctx.globalAlpha = 0.85; ctx.fill();
  ctx.restore();

  /* Bubble BG */
  const bubbleR = W * 0.032;
  ctx.save();
  ctx.globalAlpha = 0.13; ctx.fillStyle = vibe;
  _dsRR(ctx, bX, cardY, bubbleW, cardH, bubbleR); ctx.fill();
  ctx.globalAlpha = 0.32; ctx.strokeStyle = vibe; ctx.lineWidth = 1.5;
  _dsRR(ctx, bX, cardY, bubbleW, cardH, bubbleR); ctx.stroke();
  ctx.restore();

  /* Vibe glow inside bubble */
  ctx.save();
  const glowGrad = ctx.createRadialGradient(
    isLeft ? bX + bubbleW * 0.15 : bX + bubbleW * 0.85, cardY + cardH * 0.2, 0,
    isLeft ? bX + bubbleW * 0.15 : bX + bubbleW * 0.85, cardY + cardH * 0.2, bubbleW * 0.6
  );
  glowGrad.addColorStop(0, vibe + '1A'); glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad; ctx.fillRect(bX, cardY, bubbleW, cardH);
  ctx.restore();

  /* Lyric text */
  ctx.save();
  ctx.font = `${lyricStyle}600 ${lyrFS}px '${lyricFont}',serif`;
  ctx.fillStyle = textCol; ctx.globalAlpha = 0.96;
  ctx.textBaseline = 'top';
  ctx.textAlign = isLeft ? 'left' : 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
  const lyrX = isLeft ? bX + innerPad : bX + bubbleW - innerPad;
  lines.forEach((line, i) => {
    ctx.fillText(line, lyrX, cardY + innerPad + i * lyrLH);
  });
  ctx.restore();

  /* Meta separator */
  const metaSepY = cardY + innerPad + lines.length * lyrLH + innerPad * 0.55;
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bX + innerPad * 0.6, metaSepY);
  ctx.lineTo(bX + bubbleW - innerPad * 0.6, metaSepY);
  ctx.stroke();
  ctx.restore();

  /* Song + artist */
  if (song) {
    const sFS = W * 0.026;
    ctx.save();
    ctx.font = `700 ${sFS}px 'DM Sans',sans-serif`;
    ctx.fillStyle = textCol; ctx.globalAlpha = 0.88;
    ctx.textBaseline = 'middle';
    ctx.textAlign = isLeft ? 'left' : 'right';
    const sX = isLeft ? bX + innerPad : bX + bubbleW - innerPad;
    ctx.fillText(song, sX, metaSepY + metaH * 0.32);
    if (artist) {
      ctx.font = `400 ${W * 0.02}px 'Space Mono',monospace`;
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.52)';
      ctx.fillText(artist, sX, metaSepY + metaH * 0.72);
    }
    ctx.restore();
  }

  /* Vibe tag */
  if (emotion) {
    const vFS  = W * 0.019;
    ctx.save();
    ctx.font = `700 ${vFS}px 'Space Mono',monospace`;
    const vTW   = ctx.measureText(emotion.toUpperCase()).width;
    const vPadX = W * 0.018;
    const vH    = vFS * 1.7;
    const vW    = vTW + vPadX * 2;
    const vY    = metaSepY + (metaH - vH) / 2;
    const vX    = isLeft ? bX + bubbleW - innerPad - vW : bX + innerPad;
    ctx.globalAlpha = 0.15; ctx.fillStyle = vibe;
    _dsRR(ctx, vX, vY, vW, vH, vH / 2); ctx.fill();
    ctx.globalAlpha = 0.38; ctx.strokeStyle = vibe; ctx.lineWidth = 1;
    _dsRR(ctx, vX, vY, vW, vH, vH / 2); ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.fillStyle = vibe;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(emotion.toUpperCase(), vX + vPadX, vY + vH / 2);
    ctx.restore();
  }
}

/* ── Draw songs bar ── */
function _dsDrawSongsBar(ctx, W, pad, barY, barH, pSong, pArtist, eSong, eArtist, isDark, textCol) {
  const barX = pad;
  const barW = W - pad * 2;
  const barR = W * 0.022;

  ctx.save();
  ctx.globalAlpha = isDark ? 0.55 : 0.45;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  _dsRR(ctx, barX, barY, barW, barH, barR); ctx.fill();
  ctx.globalAlpha = isDark ? 0.35 : 0.25;
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1; _dsRR(ctx, barX, barW, barY, barH, barR); ctx.stroke();
  ctx.restore();

  const labelFS = W * 0.019;
  const songFS  = W * 0.024;
  const artistFS= W * 0.018;
  const midY    = barY + barH / 2;

  /* SONGS label */
  ctx.save();
  ctx.font = `700 ${labelFS}px 'Space Mono',monospace`;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('SONGS', barX + W * 0.038, midY);
  ctx.restore();

  /* Parent song (left-ish) */
  const s1X = barX + W * 0.2;
  ctx.save();
  ctx.font = `700 ${songFS}px 'DM Sans',sans-serif`;
  ctx.fillStyle = textCol; ctx.globalAlpha = 0.85;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(_dsTruncate(ctx, pSong, W * 0.22), s1X, midY - artistFS * 0.55);
  ctx.font = `400 ${artistFS}px 'Space Mono',monospace`;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  ctx.fillText(_dsTruncate(ctx, pArtist, W * 0.22), s1X, midY + songFS * 0.55);
  ctx.restore();

  /* Separator arrow */
  ctx.save();
  ctx.font = `400 ${W * 0.03}px 'Space Mono',monospace`;
  ctx.fillStyle = 'rgba(232,197,71,0.5)';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText('↔', W / 2, midY);
  ctx.restore();

  /* Echo song (right-ish) */
  const s2X = W - pad - W * 0.038;
  ctx.save();
  ctx.font = `700 ${songFS}px 'DM Sans',sans-serif`;
  ctx.fillStyle = textCol; ctx.globalAlpha = 0.85;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  ctx.fillText(_dsTruncate(ctx, eSong, W * 0.22), s2X, midY - artistFS * 0.55);
  ctx.font = `400 ${artistFS}px 'Space Mono',monospace`;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  ctx.fillText(_dsTruncate(ctx, eArtist, W * 0.22), s2X, midY + songFS * 0.55);
  ctx.restore();
}

/* ── Watermark ── */
function _dsDrawWatermark(ctx, W, centreY) {
  const wFS  = W * 0.021;
  const wTxt = 'trymargo.com';
  ctx.save();
  ctx.font = `700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const wW = ctx.measureText(wTxt).width + W * 0.048;
  const wH = wFS * 1.75;
  const wX = W / 2 - wW / 2;
  const wY = centreY - wH / 2;
  ctx.globalAlpha = 0.14; ctx.fillStyle = '#ffffff';
  _dsRR(ctx, wX, wY, wW, wH, wH / 2); ctx.fill();
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
  ctx.fillText(wTxt, W / 2, centreY);
  ctx.restore();
}

/* ── Radial glow helper ── */
function _dsGlow(ctx, cx, cy, r, color) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   CANVAS: CARD VIEW
   v2.6 — adds SONGS bar, respects DS theme + font
══════════════════════════════════════════════════════════ */
function _dsDrawCard(ctx, W, H, parent, echo, t) {
  if (!parent || !echo) return;

  const pad    = W * 0.07;
  const innerW = W - pad * 2;
  const theme  = DS_THEMES[DS.bgColor] || DS_THEMES['#07060E'];
  const isDark = !theme.isLight;

  const pEmotion = parent.emotion || 'Nostalgia';
  const eEmotion = echo.emotion   || 'Nostalgia';
  const pVibe    = DS_VIBE[pEmotion] || '#E8C547';
  const eVibe    = DS_VIBE[eEmotion] || '#E8C547';

  const lyricFont  = DS.fontFamily || 'DM Serif Display';
  const lyricItalic= DS.fontItalic !== false;
  const lyricStyle = lyricItalic ? 'italic ' : '';
  const textColor  = theme.text || '#ffffff';

  /* Background */
  const colors = theme.grad.match(/#[0-9a-fA-F]{6}/g) || ['#090810','#0d0b12'];
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, colors[0]); bg.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  /* Vibe glows */
  _dsGlow(ctx, W * 0.15, H * 0.15, W * 0.65, pVibe + '22');
  _dsGlow(ctx, W * 0.85, H * 0.85, W * 0.65, eVibe + '22');

  /* Accent lines */
  const tl = ctx.createLinearGradient(0,0,W,0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(0.5, pVibe); tl.addColorStop(1,'transparent');
  ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = tl; ctx.fillRect(0,0,W,2); ctx.restore();
  const bl2 = ctx.createLinearGradient(0,0,W,0);
  bl2.addColorStop(0,'transparent'); bl2.addColorStop(0.5, eVibe); bl2.addColorStop(1,'transparent');
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = bl2; ctx.fillRect(0,H-2,W,2); ctx.restore();

  /* MARGO wordmark */
  const mSz = W * 0.046;
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne',sans-serif`;
  ctx.fillStyle = isDark ? '#E8C547' : '#0B0B0D'; ctx.globalAlpha = 0.88;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', pad, pad * 0.65);
  ctx.restore();

  /* Songs bar at bottom (above watermark) */
  const songsBarH = W * 0.082;
  const watermarkH= W * 0.035;
  const watermarkY= H - pad * 0.5;
  const songsBarY = watermarkY - watermarkH / 2 - W * 0.022 - songsBarH;

  const pk = parent.knowledge || {};
  const pSong   = pk.song   || parent.song   || '';
  const pArtist = pk.artist || parent.artist || '';
  const eSong   = echo.song    || '';
  const eArtist = echo.artist  || '';

  _dsDrawSongsBar(ctx, W, pad, songsBarY, songsBarH, pSong, pArtist, eSong, eArtist, isDark, textColor);

  /* Working area for lyrics */
  const topStart  = pad * 2 + mSz * 0.3;
  const bottomEnd = songsBarY - W * 0.025;
  const divY      = topStart + (bottomEnd - topStart) * 0.46;

  /* Top lyric (parent) */
  const topH   = divY - W * 0.05 - topStart;
  const pText  = parent.text || parent.lyric || '';
  let pFS = Math.min(W * 0.056, topH * 0.28);
  ctx.font = `${lyricStyle}600 ${pFS}px '${lyricFont}',serif`;
  let pLines = _dsWrap(ctx, pText, innerW * 0.88);
  if (pLines.length > 3) { pFS = Math.max(W * 0.03, pFS * (3 / pLines.length)); ctx.font = `${lyricStyle}600 ${pFS}px '${lyricFont}',serif`; pLines = _dsWrap(ctx, pText, innerW * 0.88); }
  const pLH = pFS * 1.52;
  const pBlockH = pLines.length * pLH;
  const fadeT = t !== undefined ? t : 1;
  const pStartY = topStart + (topH - pBlockH) / 2 + (1 - fadeT) * 20;

  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16;
  pLines.forEach((line, i) => {
    ctx.globalAlpha = (0.62 - i * 0.04) * Math.min(1, fadeT * 2);
    ctx.fillStyle = textColor;
    ctx.fillText(line, W / 2, pStartY + i * pLH);
  });
  ctx.restore();

  /* Parent attribution */
  if (pSong) {
    const paFS = W * 0.019;
    ctx.save();
    ctx.font = `700 ${paFS}px 'Space Mono',monospace`;
    ctx.fillStyle = pVibe; ctx.globalAlpha = 0.45;
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    const paStr = _dsTruncate(ctx, pSong + (pArtist ? ' — ' + pArtist : ''), innerW * 0.78);
    ctx.fillText(paStr, W / 2, divY - W * 0.042);
    ctx.restore();
  }

  /* Divider pill */
  const dText = `LYRIC BACK ↩  @${(echo.username || 'anonymous').toUpperCase()}`;
  const dFS   = W * 0.021;
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  const dTW = ctx.measureText(dText).width;
  const dpH = dFS * 1.95;
  const dpW = dTW + W * 0.028 * 2;
  const dpX = W / 2 - dpW / 2;
  const dpY = divY - dpH / 2;
  const dpR = dpH / 2;

  ctx.save();
  const gap2 = dpW / 2 + W * 0.018;
  [[pad, W / 2 - gap2], [W / 2 + gap2, W - pad]].forEach(([x1, x2]) => {
    const lg = ctx.createLinearGradient(x1, 0, x2, 0);
    if (x1 === pad) { lg.addColorStop(0,'transparent'); lg.addColorStop(1,'rgba(232,197,71,0.22)'); }
    else            { lg.addColorStop(0,'rgba(232,197,71,0.22)'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1, divY - 0.75, x2 - x1, 1.5);
  });
  ctx.restore();

  ctx.save();
  ctx.shadowColor = '#E8C547'; ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(232,197,71,0.6)'; ctx.lineWidth = 1.5;
  _dsRR(ctx, dpX, dpY, dpW, dpH, dpR); ctx.stroke();
  ctx.shadowBlur = 0;
  const dpFill = ctx.createLinearGradient(dpX, dpY, dpX, dpY + dpH);
  dpFill.addColorStop(0,'rgba(232,197,71,0.14)'); dpFill.addColorStop(1,'rgba(232,197,71,0.06)');
  ctx.fillStyle = dpFill; _dsRR(ctx, dpX, dpY, dpW, dpH, dpR); ctx.fill();
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.95;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(dText, W / 2, divY);
  ctx.restore();

  /* Bottom lyric (echo) */
  const botStart = divY + dpH / 2 + W * 0.028;
  const botH     = songsBarY - W * 0.025 - botStart;
  const eText    = echo.lyric || echo.text || '';
  let eFS = Math.min(W * 0.064, botH * 0.28);
  ctx.font = `${lyricStyle}700 ${eFS}px '${lyricFont}',serif`;
  let eLines = _dsWrap(ctx, eText, innerW * 0.88);
  if (eLines.length > 3) { eFS = Math.max(W * 0.034, eFS * (3 / eLines.length)); ctx.font = `${lyricStyle}700 ${eFS}px '${lyricFont}',serif`; eLines = _dsWrap(ctx, eText, innerW * 0.88); }
  const eLH = eFS * 1.52;
  const eBlockH = eLines.length * eLH;
  const eOY = t !== undefined ? (1 - Math.min(1, t * 1.5)) * 20 : 0;
  const eStartY = botStart + (botH - eBlockH) / 2 + eOY;

  ctx.save();
  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 20;
  eLines.forEach((line, i) => {
    ctx.globalAlpha = (1 - i * 0.02) * (t !== undefined ? Math.min(1, t * 1.8) : 1);
    ctx.fillStyle = textColor;
    ctx.fillText(line, W / 2, eStartY + i * eLH);
  });
  ctx.restore();

  /* Echo attribution */
  if (eSong) {
    const eaFS = W * 0.019;
    ctx.save();
    ctx.font = `700 ${eaFS}px 'Space Mono',monospace`;
    ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.75;
    ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    const eaStr = _dsTruncate(ctx, eSong + (eArtist ? ' — ' + eArtist : ''), innerW * 0.78);
    ctx.fillText(eaStr, W / 2, eStartY + eBlockH + W * 0.012);
    ctx.restore();
  }

  /* Watermark */
  _dsDrawWatermark(ctx, W, watermarkY);
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function _dsWrap(ctx, text, maxW) {
  const words = (text || '').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function _dsTruncate(ctx, text, maxW) {
  if (!text) return '';
  let t = text;
  while (ctx.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -4) + '…';
  return t;
}

function _dsRR(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function _dsEsc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════
   SWIPE TO CLOSE
══════════════════════════════════════════════════════════ */
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
    if (curY - startY > 80) closeDuetSheet();
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
