/* ============================================================
   MARGO — js/duet-sheet.js  v3.1
   • GIF animated — BOTH card AND conversation view
     Conversation GIF: html2canvas DOM capture per frame
     Card GIF: canvas geometry draw per frame
   • Poster PNG — BOTH views, correct platform dimensions
   • Platform picker bottom sheet before every export
   • Download + Share buttons always present (both formats)
   • MARGO wordmark stamp (opacity 0.28) top-left every export
   • M-mark bottom-right on every export
   • Zero Google dependency — fonts from browser cache
   • html2canvas one-time CDN load, cached
   • gif.worker from /js/gif.worker.js
   Changes v3.1:
   - DS_THEMES expanded: 9 themes, each with g1/g2/acc/l/r/glow1/glow2/light
   - White/light theme added (white bg, black text, black logo)
   - MARGO wordmark = stamp treatment (globalAlpha 0.28, muted colour)
   - Username labels: Syne 800 (not Space Mono)
   - LYRIC BACK divider pill: Syne 800
   - SONGS label: Syne 800, legible opacity
   - trymargo.com watermark: clearly visible
   ============================================================ */
(function () {

const DS = {
  parentPost:null, echoPost:null, mounted:false,
  motion:'fade-up', dur:2.4, format:'gif',
  bgColor:'#07060E', fontFamily:'DM Serif Display', fontItalic:true,
  _savedScrollY:0,
};

const DS_PLATFORMS = [
  {id:'square', label:'Square',         sub:'IG · FB · Reddit · Discord',  w:1080,h:1080,ratio:'1:1' },
  {id:'story',  label:'Story / TikTok', sub:'IG Stories · Snap · TikTok',  w:1080,h:1920,ratio:'9:16'},
  {id:'wide',   label:'Wide',           sub:'Twitter/X · LinkedIn',        w:1200,h:675, ratio:'16:9'},
];

const DS_VIBE = {
  Love:'#FF6B9D',Heartbreak:'#ff5050',Hope:'#6B8CFF',Nostalgia:'#E8C547',
  Healing:'#4ade80',Joy:'#ffc847',Rage:'#FF6440',Loneliness:'#a0a0ff',
  SendIt:'#00e5c8',LetOut:'#c864ff',
};

/* ─── THEMES ───
   g1/g2   = gradient stops for background
   acc     = accent colour (MARGO wordmark, divider, M-mark)
   l / r   = left/right bubble accent colours
   glow1/2 = radial glow overlay colours (rgba strings)
   light   = true → invert text/icon colours
─────────────────────────────────────────────────────────── */
const DS_THEMES = {
  '#07060E':{g1:'#0c0a04',g2:'#1a1306',acc:'#E8C547',l:'#FF6B9D',r:'#6B8CFF',glow1:'rgba(232,197,71,0.18)',glow2:'rgba(107,140,255,0.14)',grad:'linear-gradient(135deg,#0d0d0d,#1a1410)',text:'#ffffff',light:false},
  '#0e0018':{g1:'#100020',g2:'#1c0730',acc:'#c77dff',l:'#ff71ce',r:'#05ffa1',glow1:'rgba(199,125,255,0.2)',glow2:'rgba(5,255,161,0.12)',grad:'linear-gradient(135deg,#1a0033,#2d1b4e)',text:'#ffffff',light:false},
  '#04090f':{g1:'#040f18',g2:'#071622',acc:'#00e5ff',l:'#00e5ff',r:'#0070ff',glow1:'rgba(0,229,255,0.18)',glow2:'rgba(0,112,255,0.12)',grad:'linear-gradient(135deg,#0a1420,#142838)',text:'#ffffff',light:false},
  '#0f0404':{g1:'#140505',g2:'#1e0a0a',acc:'#ff6b6b',l:'#ff6b6b',r:'#ffb347',glow1:'rgba(255,107,107,0.2)',glow2:'rgba(255,179,71,0.12)',grad:'linear-gradient(135deg,#1a0a0a,#2d1416)',text:'#ffffff',light:false},
  '#020f06':{g1:'#020d06',g2:'#05160a',acc:'#50fa7b',l:'#50fa7b',r:'#00e5c0',glow1:'rgba(80,250,123,0.18)',glow2:'rgba(0,229,192,0.12)',grad:'linear-gradient(135deg,#051a0d,#0d2e1a)',text:'#ffffff',light:false},
  '#0f0508':{g1:'#120708',g2:'#1c0c0f',acc:'#f4a4c0',l:'#f4a4c0',r:'#c084fc',glow1:'rgba(244,164,192,0.18)',glow2:'rgba(192,132,252,0.12)',grad:'linear-gradient(135deg,#1a0d0f,#2d1a1f)',text:'#ffffff',light:false},
  '#080808':{g1:'#000000',g2:'#0a0a0a',acc:'#E8C547',l:'#ffffff',r:'#aaaaaa',glow1:'rgba(255,255,255,0.07)',glow2:'rgba(200,200,200,0.04)',grad:'linear-gradient(135deg,#000000,#111111)',text:'#ffffff',light:false},
  '#150520':{g1:'#110317',g2:'#09140f',acc:'#05ffa1',l:'#ff71ce',r:'#05ffa1',glow1:'rgba(255,113,206,0.2)',glow2:'rgba(5,255,161,0.14)',grad:'linear-gradient(135deg,#2d0a3d,#6b1fa8)',text:'#ffffff',light:false},
  '#f5f0e8':{g1:'#ffffff',g2:'#ece8e0',acc:'#0B0B0D',l:'#c0392b',r:'#1a6fbd',glow1:'rgba(0,0,0,0.05)',glow2:'rgba(0,0,0,0.03)',grad:'linear-gradient(135deg,#ffffff,#ece8e0)',text:'#0B0B0D',light:true},
};

/* ════════════════════════ STYLES ════════════════════════ */
function injectDuetStyles(){
  if(document.getElementById('duetSheetStyles'))return;
  const s=document.createElement('style');
  s.id='duetSheetStyles';
  s.textContent=`
#duetBackdrop{position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.88);backdrop-filter:blur(20px) saturate(0.6);-webkit-backdrop-filter:blur(20px) saturate(0.6);display:block;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;animation:dsBackdropIn 0.25s ease}
#duetBackdrop.ds-hidden{display:none!important}
body.ds-modal-open{overflow:hidden}
@keyframes dsBackdropIn{from{opacity:0}to{opacity:1}}
#duetSheet{width:100%;max-width:520px;background:#0c0b10;border:1px solid rgba(255,255,255,0.07);border-radius:28px 28px 0 0;overflow:visible;display:flex;flex-direction:column;margin:0 auto;box-shadow:0 -12px 80px rgba(0,0,0,0.9),0 0 0 1px rgba(232,197,71,0.06) inset;animation:dsSlideUp 0.42s cubic-bezier(0.16,1,0.3,1)}
@media(min-width:560px){#duetSheet{border-radius:24px;margin:24px auto;animation:dsFadeUp 0.32s cubic-bezier(0.16,1,0.3,1)}}
@keyframes dsSlideUp{from{transform:translateY(70px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes dsFadeUp{from{transform:translateY(24px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
.ds-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin:12px auto 0;flex-shrink:0}
.ds-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0;flex-shrink:0}
.ds-title{font-family:'Syne',sans-serif;font-weight:800;font-size:0.88rem;letter-spacing:2.5px;text-transform:uppercase;background:linear-gradient(90deg,#fff 20%,#E8C547 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ds-close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.18s}
.ds-close:hover{background:rgba(255,255,255,0.12);color:#fff}
.ds-view-toggle{display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 20px 0}
.ds-toggle-btn{font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:7px 18px;border-radius:20px;cursor:pointer;transition:all 0.2s;border:1px solid transparent}
.ds-toggle-btn.active{background:rgba(232,197,71,0.12);border-color:rgba(232,197,71,0.35);color:#E8C547}
.ds-toggle-btn:not(.active){background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.09);color:rgba(255,255,255,0.45)}
.ds-toggle-btn:not(.active):hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.07)}
.ds-convo{padding:18px 18px 14px;display:flex;flex-direction:column;gap:12px}
.ds-bubble{max-width:82%;display:flex;flex-direction:column;gap:6px;animation:dsBubbleIn 0.45s cubic-bezier(0.16,1,0.3,1) both}
@keyframes dsBubbleIn{from{opacity:0;transform:translateY(10px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.ds-bubble.original{align-self:flex-start;animation-delay:0.1s}
.ds-bubble.reply{align-self:flex-end;align-items:flex-end;animation-delay:0.35s}
/* FIX A: username labels — Syne 800, not Space Mono */
.ds-bubble-user{font-family:'Syne',sans-serif;font-weight:800;font-size:0.65rem;letter-spacing:0.04em;display:flex;align-items:center;gap:6px;padding:0 5px}
.ds-bubble.original .ds-bubble-user{color:var(--ds-vibe-left,#FF6B9D)}
.ds-bubble.reply .ds-bubble-user{color:var(--ds-vibe-right,#6B8CFF);flex-direction:row-reverse}
.ds-udot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.ds-bubble.original .ds-udot{background:var(--ds-vibe-left,#FF6B9D)}
.ds-bubble.reply .ds-udot{background:var(--ds-vibe-right,#6B8CFF)}
.ds-bubble-card{padding:15px 17px;border-radius:20px;position:relative;overflow:hidden}
.ds-bubble.original .ds-bubble-card{background:rgba(255,107,157,0.09);border:1px solid rgba(255,107,157,0.25);border-bottom-left-radius:5px}
.ds-bubble.reply .ds-bubble-card{background:rgba(107,140,255,0.09);border:1px solid rgba(107,140,255,0.25);border-bottom-right-radius:5px}
.ds-bubble-card::before{content:'';position:absolute;inset:0;opacity:0.09;pointer-events:none}
.ds-bubble.original .ds-bubble-card::before{background:radial-gradient(ellipse at top left,var(--ds-vibe-left,#FF6B9D),transparent 65%)}
.ds-bubble.reply .ds-bubble-card::before{background:radial-gradient(ellipse at bottom right,var(--ds-vibe-right,#6B8CFF),transparent 65%)}
.ds-bubble-lyric{font-family:'DM Serif Display',serif;font-style:italic;font-size:1.1rem;line-height:1.5;color:#fff;position:relative;z-index:1}
.ds-bubble-meta{margin-top:11px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px}
.ds-bubble-song{font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:700;color:#fff}
.ds-bubble-artist{font-family:'Space Mono',monospace;font-size:0.58rem;color:rgba(255,255,255,0.6);margin-top:2px}
.ds-bubble-vibe{font-family:'Syne',sans-serif;font-weight:800;font-size:0.5rem;letter-spacing:0.05em;text-transform:uppercase;padding:4px 10px;border-radius:20px;flex-shrink:0}
.ds-bubble.original .ds-bubble-vibe{background:rgba(255,107,157,0.15);color:#FF9DC0;border:1px solid rgba(255,107,157,0.3)}
.ds-bubble.reply .ds-bubble-vibe{background:rgba(107,140,255,0.15);color:#9DB5FF;border:1px solid rgba(107,140,255,0.3)}
/* FIX B: LYRIC BACK divider — Syne 800 */
.ds-lb-divider{display:flex;align-items:center;gap:9px;padding:2px 0;animation:dsBubbleIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.22s both}
.ds-lb-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(232,197,71,0.22),transparent)}
.ds-lb-pill{font-family:'Syne',sans-serif;font-weight:800;font-size:0.55rem;letter-spacing:0.06em;text-transform:uppercase;color:#E8C547;background:rgba(232,197,71,0.1);border:1px solid rgba(232,197,71,0.28);padding:6px 13px;border-radius:20px;white-space:nowrap}
.ds-song-strip{margin:6px 18px 0;padding:11px 15px;background:#181720;border-radius:13px;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
/* FIX C: SONGS label — Syne 800, legible */
.ds-strip-label{font-family:'Syne',sans-serif;font-weight:800;font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7)}
.ds-strip-songs{display:flex;align-items:center;gap:12px}
.ds-strip-song{display:flex;flex-direction:column;gap:2px}
.ds-strip-song:last-child{align-items:flex-end}
.ds-strip-song-name{font-family:'DM Sans',sans-serif;font-size:0.72rem;font-weight:700;color:rgba(255,255,255,0.85)}
.ds-strip-song-artist{font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.4)}
.ds-strip-sep{font-size:0.65rem;color:rgba(255,255,255,0.2)}
.ds-card-view{padding:16px 18px 0}
.ds-canvas-preview{border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);aspect-ratio:1;position:relative;background:#07060E}
.ds-canvas-bg{position:absolute;inset:0;transition:background 0.4s;z-index:0}
.ds-canvas-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 55% 48% at 12% 12%,var(--ds-glow-left,rgba(255,107,157,0.22)) 0%,transparent 65%),radial-gradient(ellipse 55% 48% at 88% 88%,var(--ds-glow-right,rgba(107,140,255,0.22)) 0%,transparent 65%);pointer-events:none}
.ds-canvas-content{position:relative;z-index:1;width:100%;height:100%;padding:24px 26px 20px;display:flex;flex-direction:column}
/* FIX D: MARGO wordmark in card preview — stamp treatment */
.ds-c-margo{font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;letter-spacing:5px;opacity:0.28;filter:blur(0.3px) contrast(0.7)}
.ds-c-top{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:14px}
.ds-c-lyric{font-family:'DM Serif Display',serif;font-style:italic;line-height:1.5}
.ds-c-lyric.dim{font-size:1rem;color:rgba(255,255,255,0.6)}
.ds-c-lyric.bold{font-size:1.2rem;color:#fff}
.ds-c-attr{font-family:'Space Mono',monospace;font-size:0.48rem;color:rgba(255,255,255,0.45);margin-top:7px}
.ds-c-divider{display:flex;align-items:center;gap:8px;margin:6px 0}
.ds-c-div-line{flex:1;height:1px;background:rgba(232,197,71,0.25)}
/* FIX E: card view divider pill — Syne 800 */
.ds-c-div-pill{font-family:'Syne',sans-serif;font-weight:800;font-size:0.44rem;letter-spacing:0.06em;text-transform:uppercase;color:#E8C547;background:rgba(232,197,71,0.12);border:1px solid rgba(232,197,71,0.32);padding:5px 11px;border-radius:20px;white-space:nowrap}
.ds-c-bottom{flex:1.3;display:flex;flex-direction:column;justify-content:flex-start;padding-top:14px}
.ds-c-watermark{text-align:center;margin-top:auto;padding-top:10px}
/* FIX F: trymargo.com watermark — clearly visible */
.ds-c-watermark-pill{display:inline-block;font-family:'Space Mono',monospace;font-size:0.44rem;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.18);padding:5px 14px;border-radius:20px}
.ds-section-sep{height:1px;background:rgba(255,255,255,0.06);margin:14px 18px 0}
.ds-edit-panel{margin:14px 18px 0;background:#181720;border-radius:18px;border:1px solid rgba(255,255,255,0.07);overflow:hidden}
.ds-format-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.07)}
.ds-format-tab{flex:1;padding:13px 10px;font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;color:rgba(255,255,255,0.35)}
.ds-format-tab.active-gif{color:#00E5FF;border-bottom-color:#00E5FF;background:rgba(0,229,255,0.05)}
.ds-format-tab.active-poster{color:#E8C547;border-bottom-color:#E8C547;background:rgba(232,197,71,0.05)}
.ds-format-tab:not(.active-gif):not(.active-poster):hover{color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.03)}
.ds-option-tabs{display:flex;gap:6px;padding:12px 14px 0}
.ds-option-tab{padding:6px 13px;border-radius:20px;font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;cursor:pointer;transition:all 0.18s;border:1px solid transparent}
.ds-option-tab.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.18);color:#fff}
.ds-option-tab:not(.active){background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.38)}
.ds-option-tab:not(.active):hover{color:rgba(255,255,255,0.65);background:rgba(255,255,255,0.06)}
.ds-panel-content{padding:14px}
.ds-panel-section{display:none}
.ds-panel-section.active{display:block}
.ds-panel-label{font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:10px}
.ds-motion-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.ds-motion-btn{padding:9px 4px;border-radius:10px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-family:'DM Sans',sans-serif;font-size:0.66rem;font-weight:600;cursor:pointer;transition:all 0.18s;text-align:center}
.ds-motion-btn:hover{background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.18)}
.ds-motion-btn.active{background:rgba(0,229,255,0.12);border-color:rgba(0,229,255,0.4);color:#00E5FF}
.ds-speed-row{display:flex;gap:7px;margin-top:12px}
.ds-speed-btn{flex:1;padding:9px 6px;border-radius:10px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;cursor:pointer;transition:all 0.18s;text-align:center}
.ds-speed-btn.active{background:rgba(0,229,255,0.1);border-color:rgba(0,229,255,0.3);color:#00E5FF}
.ds-speed-btn:hover:not(.active){background:rgba(255,255,255,0.07);color:#fff}
.ds-color-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.ds-color-swatch{border-radius:11px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.18s;aspect-ratio:1;position:relative}
.ds-color-swatch:hover{transform:scale(1.05)}
.ds-color-swatch.active{border-color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,0.4)}
.ds-swatch-fill{width:100%;height:70%}
.ds-swatch-name{position:absolute;bottom:0;left:0;right:0;padding:4px 2px 5px;background:rgba(0,0,0,0.55);font-family:'Space Mono',monospace;font-size:0.42rem;font-weight:700;color:rgba(255,255,255,0.8);text-align:center}
.ds-font-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.ds-font-card{padding:12px 12px 10px;border-radius:12px;background:#1E1D28;border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.18s;display:flex;flex-direction:column;gap:5px}
.ds-font-card:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.16)}
.ds-font-card.active{background:rgba(232,197,71,0.08);border-color:rgba(232,197,71,0.3)}
.ds-font-preview{font-size:1rem;line-height:1.3;color:rgba(255,255,255,0.9)}
.ds-font-card-name{font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px}
.ds-font-card.active .ds-font-card-name{color:#E8C547}
/* EXPORT ROW */
.ds-export-row{display:flex;gap:9px;padding:14px 18px 22px}
.ds-export-btn{flex:1;padding:15px 10px;border-radius:17px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.22s cubic-bezier(0.16,1,0.3,1);font-family:'Space Mono',monospace;font-weight:700;font-size:0.52rem;letter-spacing:1px;text-transform:uppercase;position:relative;overflow:hidden}
.ds-export-btn:hover{transform:translateY(-2px)}
.ds-export-btn:active{transform:scale(0.97)}
.ds-export-btn:disabled{cursor:wait;transform:none;opacity:0.7}
.ds-export-icon{font-size:1rem;line-height:1}
.ds-btn-dl-gif{background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.25);color:#00E5FF}
.ds-btn-dl-gif:hover{background:rgba(0,229,255,0.14);border-color:rgba(0,229,255,0.45);box-shadow:0 8px 24px rgba(0,229,255,0.12)}
.ds-btn-sh-gif{background:rgba(0,229,255,0.04);border:1px solid rgba(0,229,255,0.16);color:#00E5FF}
.ds-btn-sh-gif:hover{background:rgba(0,229,255,0.1);border-color:rgba(0,229,255,0.3)}
.ds-btn-dl-poster{background:rgba(232,197,71,0.1);border:1px solid rgba(232,197,71,0.3);color:#E8C547}
.ds-btn-dl-poster:hover{background:rgba(232,197,71,0.17);border-color:rgba(232,197,71,0.52);box-shadow:0 8px 24px rgba(232,197,71,0.15)}
.ds-btn-sh-poster{background:rgba(232,197,71,0.04);border:1px solid rgba(232,197,71,0.18);color:#E8C547}
.ds-btn-sh-poster:hover{background:rgba(232,197,71,0.1);border-color:rgba(232,197,71,0.35)}
.ds-progress-bar{position:absolute;bottom:0;left:0;height:3px;border-radius:1.5px;transition:width 0.25s ease;width:0%}
/* PLATFORM PICKER */
#dsPlatformPicker{position:fixed;inset:0;z-index:900;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:dsBackdropIn 0.2s ease}
#dsPlatformPicker.ds-hidden{display:none!important}
.ds-picker-sheet{width:100%;max-width:520px;background:#0f0e14;border:1px solid rgba(255,255,255,0.08);border-radius:24px 24px 0 0;padding:20px 20px 32px;animation:dsSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)}
.ds-picker-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin:0 auto 18px}
.ds-picker-title{font-family:'Syne',sans-serif;font-weight:800;font-size:0.82rem;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:14px;text-align:center}
.ds-picker-cards{display:flex;flex-direction:column;gap:10px}
.ds-picker-card{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:all 0.18s}
.ds-picker-card:hover{background:rgba(255,255,255,0.08);border-color:rgba(232,197,71,0.35);transform:translateY(-1px)}
.ds-picker-ratio{width:44px;height:44px;border-radius:10px;background:rgba(232,197,71,0.08);border:1px solid rgba(232,197,71,0.25);display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;color:#E8C547;flex-shrink:0;text-align:center;line-height:1.3}
.ds-picker-info{display:flex;flex-direction:column;gap:3px;flex:1}
.ds-picker-name{font-family:'DM Sans',sans-serif;font-weight:700;font-size:0.9rem;color:#fff}
.ds-picker-sub{font-family:'Space Mono',monospace;font-size:0.46rem;color:rgba(255,255,255,0.4);letter-spacing:0.5px}
.ds-picker-dim{font-family:'Space Mono',monospace;font-size:0.46rem;color:rgba(232,197,71,0.55);flex-shrink:0}
.ds-picker-cancel{display:block;width:100%;margin-top:14px;padding:13px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.45);font-family:'Space Mono',monospace;font-size:0.56rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:all 0.18s}
.ds-picker-cancel:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7)}
@keyframes dsKFadeUp{0%{opacity:0;transform:translateY(20px)}25%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}
@keyframes dsKSlideIn{0%{opacity:0;transform:translateX(-30px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(12px)}}
@keyframes dsKPulse{0%,100%{opacity:0.4;transform:scale(0.96)}50%{opacity:1;transform:scale(1.03)}}
@keyframes dsKGlitch{0%,88%,100%{transform:translate(0,0) skew(0deg);filter:none;opacity:1}89%{transform:translate(-5px,2px) skew(-3deg);filter:hue-rotate(90deg) brightness(1.4);opacity:0.8}91%{transform:translate(5px,-2px) skew(3deg);filter:hue-rotate(-90deg);opacity:0.9}93%{transform:translate(-3px,1px) skew(-1deg);filter:brightness(1.6);opacity:0.85}95%{transform:translate(3px,-1px);filter:none;opacity:1}}
@keyframes dsKWave{0%,100%{transform:translateY(0)}30%{transform:translateY(-10px)}60%{transform:translateY(5px)}}
@keyframes dsKShimmer{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes dsKBounce{0%,100%{transform:translateY(0);animation-timing-function:ease-in}40%{transform:translateY(-18px);animation-timing-function:ease-out}60%{transform:translateY(-6px)}75%{transform:translateY(-12px)}90%{transform:translateY(-2px)}}
@keyframes dsKBlink{0%,100%{border-color:#E8C547}50%{border-color:transparent}}
@keyframes dsKType{0%,5%{width:0;opacity:1}55%,90%{width:100%;opacity:1}95%,100%{width:100%;opacity:0}}
`;
  document.head.appendChild(s);
}

/* ════════════════════════ MOUNT ════════════════════════ */
function mountDuetSheet(){
  if(document.getElementById('duetBackdrop'))return;
  injectDuetStyles();

  const backdrop=document.createElement('div');
  backdrop.id='duetBackdrop';
  backdrop.className='ds-hidden';
  backdrop.innerHTML=`
<div id="duetSheet">
  <div class="ds-handle" id="dsDragHandle"></div>
  <div class="ds-header">
    <span class="ds-title">Conversation</span>
    <button class="ds-close" id="dsClose">×</button>
  </div>
  <div class="ds-view-toggle">
    <button class="ds-toggle-btn active" id="dsToggleConvo">Conversation</button>
    <button class="ds-toggle-btn" id="dsToggleCard">Card</button>
  </div>
  <div id="dsViewConvo">
    <div class="ds-convo" id="dsConvoBubbles"></div>
    <div class="ds-song-strip" id="dsSongStrip"></div>
  </div>
  <div id="dsViewCard" style="display:none">
    <div class="ds-card-view">
      <div class="ds-canvas-preview">
        <div class="ds-canvas-bg" id="dsCanvasBg"></div>
        <div class="ds-canvas-content" id="dsCanvasContent">
          <div class="ds-c-margo ds-anim" data-i="0">MARGO</div>
          <div class="ds-c-top">
            <div class="ds-c-lyric dim ds-anim" data-i="1" id="dsCLyricTop"></div>
            <div class="ds-c-attr ds-anim" data-i="2" id="dsCAttrTop"></div>
          </div>
          <div class="ds-c-divider ds-anim" data-i="3">
            <div class="ds-c-div-line"></div>
            <div class="ds-c-div-pill" id="dsCDivPill">LYRIC BACK ↩</div>
            <div class="ds-c-div-line"></div>
          </div>
          <div class="ds-c-bottom">
            <div class="ds-c-lyric bold ds-anim" data-i="4" id="dsCLyricBot"></div>
            <div class="ds-c-attr ds-anim" data-i="5" id="dsCAttrBot"></div>
          </div>
          <div class="ds-c-watermark ds-anim" data-i="6">
            <span class="ds-c-watermark-pill">trymargo.com</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="ds-section-sep"></div>
  <div class="ds-edit-panel">
    <div class="ds-format-tabs">
      <button class="ds-format-tab active-gif" id="dsFmtGif" data-fmt="gif">GIF</button>
      <button class="ds-format-tab" id="dsFmtPoster" data-fmt="poster">Poster</button>
    </div>
    <div class="ds-option-tabs" id="dsOptionTabs">
      <button class="ds-option-tab active" data-opt="motion">Motion</button>
      <button class="ds-option-tab" data-opt="color">Color</button>
      <button class="ds-option-tab" data-opt="font">Font</button>
    </div>
    <div class="ds-panel-content">
      <div class="ds-panel-section active" id="ds-section-motion">
        <div class="ds-panel-label">Pick a style</div>
        <div class="ds-motion-grid" id="dsMotionGrid">
          <button class="ds-motion-btn active" data-motion="fade-up">Fade Up</button>
          <button class="ds-motion-btn" data-motion="typewriter">Typewriter</button>
          <button class="ds-motion-btn" data-motion="slide-in">Slide In</button>
          <button class="ds-motion-btn" data-motion="pulse">Pulse</button>
          <button class="ds-motion-btn" data-motion="glitch">Glitch</button>
          <button class="ds-motion-btn" data-motion="wave">Wave</button>
          <button class="ds-motion-btn" data-motion="shimmer">Shimmer</button>
          <button class="ds-motion-btn" data-motion="bounce">Bounce</button>
        </div>
        <div class="ds-panel-label" style="margin-top:14px">Speed</div>
        <div class="ds-speed-row" id="dsSpeedRow">
          <button class="ds-speed-btn" data-dur="3.8">Slow</button>
          <button class="ds-speed-btn active" data-dur="2.4">Normal</button>
          <button class="ds-speed-btn" data-dur="1.3">Fast</button>
        </div>
      </div>
      <div class="ds-panel-section" id="ds-section-color">
        <div class="ds-panel-label">Background theme</div>
        <div class="ds-color-grid">
          <div class="ds-color-swatch active" data-bg="#07060E"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#0d0d0d,#E8C547)"></div><div class="ds-swatch-name">Gold</div></div>
          <div class="ds-color-swatch" data-bg="#0e0018"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0033,#c77dff)"></div><div class="ds-swatch-name">Violet</div></div>
          <div class="ds-color-swatch" data-bg="#04090f"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#0a1420,#00e5ff)"></div><div class="ds-swatch-name">Ocean</div></div>
          <div class="ds-color-swatch" data-bg="#0f0404"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0a0a,#ff6b6b)"></div><div class="ds-swatch-name">Ember</div></div>
          <div class="ds-color-swatch" data-bg="#020f06"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></div><div class="ds-swatch-name">Forest</div></div>
          <div class="ds-color-swatch" data-bg="#0f0508"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></div><div class="ds-swatch-name">Rose</div></div>
          <div class="ds-color-swatch" data-bg="#080808"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#000,#fff)"></div><div class="ds-swatch-name">Mono</div></div>
          <div class="ds-color-swatch" data-bg="#150520"><div class="ds-swatch-fill" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></div><div class="ds-swatch-name">Wave</div></div>
          <div class="ds-color-swatch" data-bg="#f5f0e8"><div class="ds-swatch-fill" style="background:#fff;border:1px solid #ddd"></div><div class="ds-swatch-name" style="background:rgba(0,0,0,0.08);color:#333">White</div></div>
        </div>
      </div>
      <div class="ds-panel-section" id="ds-section-font">
        <div class="ds-panel-label">Lyric font</div>
        <div class="ds-font-grid">
          <div class="ds-font-card active" data-family="DM Serif Display" data-italic="true"><div class="ds-font-preview" style="font-family:'DM Serif Display',serif;font-style:italic">Say everything</div><div class="ds-font-card-name">Serif · Default</div></div>
          <div class="ds-font-card" data-family="Playfair Display" data-italic="true"><div class="ds-font-preview" style="font-family:'Playfair Display',serif;font-style:italic">Say everything</div><div class="ds-font-card-name">Playfair</div></div>
          <div class="ds-font-card" data-family="Space Mono" data-italic="false"><div class="ds-font-preview" style="font-family:'Space Mono',monospace">Say everything</div><div class="ds-font-card-name">Mono</div></div>
          <div class="ds-font-card" data-family="DM Sans" data-italic="false"><div class="ds-font-preview" style="font-family:'DM Sans',sans-serif;font-weight:700">Say everything</div><div class="ds-font-card-name">Sans Bold</div></div>
        </div>
      </div>
    </div>
  </div>
  <div class="ds-export-row">
    <button class="ds-export-btn ds-btn-dl-gif" id="dsBtnDownload">
      <span class="ds-export-icon">↓</span>
      <span id="dsBtnDlLabel">Download GIF</span>
    </button>
    <button class="ds-export-btn ds-btn-sh-gif" id="dsBtnShare">
      <span class="ds-export-icon">↗</span>
      <span id="dsBtnShLabel">Share GIF</span>
    </button>
  </div>
</div>`;
  document.body.appendChild(backdrop);

  /* Platform picker */
  const picker=document.createElement('div');
  picker.id='dsPlatformPicker';
  picker.className='ds-hidden';
  picker.innerHTML=`<div class="ds-picker-sheet"><div class="ds-picker-handle"></div><div class="ds-picker-title">Choose platform</div><div class="ds-picker-cards" id="dsPickerCards"></div><button class="ds-picker-cancel" id="dsPickerCancel">Cancel</button></div>`;
  document.body.appendChild(picker);

  const cardsEl=document.getElementById('dsPickerCards');
  DS_PLATFORMS.forEach(p=>{
    const c=document.createElement('div');
    c.className='ds-picker-card'; c.dataset.pid=p.id;
    c.innerHTML=`<div class="ds-picker-ratio">${p.ratio}</div><div class="ds-picker-info"><div class="ds-picker-name">${p.label}</div><div class="ds-picker-sub">${p.sub}</div></div><div class="ds-picker-dim">${p.w}×${p.h}</div>`;
    cardsEl.appendChild(c);
  });

  DS.mounted=true;

  /* Events */
  document.getElementById('dsClose').onclick       =closeDuetSheet;
  document.getElementById('dsToggleConvo').onclick =()=>_dsShowView('convo');
  document.getElementById('dsToggleCard').onclick  =()=>_dsShowView('card');
  document.getElementById('dsBtnDownload').onclick =()=>_dsOpenPicker('download');
  document.getElementById('dsBtnShare').onclick    =()=>_dsOpenPicker('share');
  document.getElementById('dsPickerCancel').onclick=_dsClosePicker;
  document.getElementById('dsPlatformPicker').addEventListener('click',e=>{if(e.target===document.getElementById('dsPlatformPicker'))_dsClosePicker();});
  document.getElementById('dsPickerCards').addEventListener('click',e=>{
    const c=e.target.closest('.ds-picker-card');
    if(!c)return;
    const plat=DS_PLATFORMS.find(p=>p.id===c.dataset.pid);
    if(plat)_dsStartExport(plat);
  });
  document.querySelectorAll('.ds-format-tab').forEach(b=>b.onclick=()=>_dsSwitchFormat(b.dataset.fmt));
  document.getElementById('dsOptionTabs').addEventListener('click',e=>{
    const b=e.target.closest('.ds-option-tab');if(!b)return;
    document.querySelectorAll('.ds-option-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    document.querySelectorAll('.ds-panel-section').forEach(x=>x.classList.remove('active'));
    document.getElementById('ds-section-'+b.dataset.opt).classList.add('active');
  });
  document.getElementById('dsMotionGrid').addEventListener('click',e=>{
    const b=e.target.closest('.ds-motion-btn');if(!b)return;
    document.querySelectorAll('.ds-motion-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    DS.motion=b.dataset.motion;_dsPlayMotion();
  });
  document.getElementById('dsSpeedRow').addEventListener('click',e=>{
    const b=e.target.closest('.ds-speed-btn');if(!b)return;
    document.querySelectorAll('.ds-speed-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    DS.dur=parseFloat(b.dataset.dur);_dsPlayMotion();
  });
  document.querySelectorAll('.ds-color-swatch').forEach(sw=>{
    sw.onclick=()=>{document.querySelectorAll('.ds-color-swatch').forEach(s=>s.classList.remove('active'));sw.classList.add('active');DS.bgColor=sw.dataset.bg;_dsApplyTheme(DS.bgColor);};
  });
  document.querySelectorAll('.ds-font-card').forEach(card=>{
    card.onclick=()=>{document.querySelectorAll('.ds-font-card').forEach(c=>c.classList.remove('active'));card.classList.add('active');DS.fontFamily=card.dataset.family;DS.fontItalic=card.dataset.italic==='true';_dsUpdateCardFonts();};
  });
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeDuetSheet();});
  _initDsSwipe();
}

/* ════════════ PICKER ════════════ */
let _dsPickerAction='download';
function _dsOpenPicker(action){_dsPickerAction=action;document.getElementById('dsPlatformPicker').classList.remove('ds-hidden');}
function _dsClosePicker(){document.getElementById('dsPlatformPicker').classList.add('ds-hidden');}
function _dsStartExport(plat){_dsClosePicker();DS.format==='gif'?_dsExportGif(plat,_dsPickerAction):_dsExportPoster(plat,_dsPickerAction);}

/* ════════════ OPEN / CLOSE ════════════ */
function openDuetSheet(parentPost,echoPost){
  if(!parentPost||!echoPost)return;
  mountDuetSheet();
  DS.parentPost=parentPost;DS.echoPost=echoPost;
  DS.motion='fade-up';DS.dur=2.4;DS.format='gif';
  _dsPopulateConvo();_dsPopulateCard();
  _dsApplyTheme(DS.bgColor);_dsShowView('convo');_dsSwitchFormat('gif');
  document.getElementById('duetBackdrop').classList.remove('ds-hidden');
  document.body.classList.add('ds-modal-open');
  DS._savedScrollY=window.scrollY||0;
}
function closeDuetSheet(){
  const b=document.getElementById('duetBackdrop');
  if(b)b.classList.add('ds-hidden');
  document.body.classList.remove('ds-modal-open');
  _dsClearAnims();
  requestAnimationFrame(()=>window.scrollTo({top:DS._savedScrollY||0,behavior:'instant'}));
}

/* ════════════ POPULATE ════════════ */
function _dsPopulateConvo(){
  const p=DS.parentPost,e=DS.echoPost;if(!p||!e)return;
  const pV=DS_VIBE[p.emotion||'Nostalgia']||'#E8C547',eV=DS_VIBE[e.emotion||'Nostalgia']||'#E8C547';
  const pk=p.knowledge||{};
  const pU=('@'+(p.username||'anonymous')).toUpperCase(),eU=('@'+(e.username||'anonymous')).toUpperCase();
  const pS=pk.song||p.song||'—',pA=pk.artist||p.artist||'';
  const eS=e.song||'—',eA=e.artist||'';
  const sh=document.getElementById('duetSheet');
  sh.style.setProperty('--ds-vibe-left',pV);sh.style.setProperty('--ds-vibe-right',eV);
  document.getElementById('dsConvoBubbles').innerHTML=`
<div class="ds-bubble original"><div class="ds-bubble-user"><span class="ds-udot"></span>${_esc(pU)}</div><div class="ds-bubble-card"><div class="ds-bubble-lyric">${_esc(p.text||p.lyric||'')}</div><div class="ds-bubble-meta"><div><div class="ds-bubble-song">${_esc(pS)}</div><div class="ds-bubble-artist">${_esc(pA)}</div></div><span class="ds-bubble-vibe">${_esc(p.emotion||'Vibe')}</span></div></div></div>
<div class="ds-lb-divider"><div class="ds-lb-line"></div><div class="ds-lb-pill">Lyric Back ↩ ${_esc(eU)}</div><div class="ds-lb-line"></div></div>
<div class="ds-bubble reply"><div class="ds-bubble-user">${_esc(eU)}<span class="ds-udot"></span></div><div class="ds-bubble-card"><div class="ds-bubble-lyric">${_esc(e.lyric||e.text||'')}</div><div class="ds-bubble-meta"><div><div class="ds-bubble-song">${_esc(eS)}</div><div class="ds-bubble-artist">${_esc(eA)}</div></div><span class="ds-bubble-vibe">${_esc(e.emotion||'Vibe')}</span></div></div></div>`;
  document.getElementById('dsSongStrip').innerHTML=`<span class="ds-strip-label">SONGS</span><div class="ds-strip-songs"><div class="ds-strip-song"><span class="ds-strip-song-name">${_esc(pS)}</span><span class="ds-strip-song-artist">${_esc(pA)}</span></div><span class="ds-strip-sep">↔</span><div class="ds-strip-song"><span class="ds-strip-song-name">${_esc(eS)}</span><span class="ds-strip-song-artist">${_esc(eA)}</span></div></div>`;
}
function _dsPopulateCard(){
  const p=DS.parentPost,e=DS.echoPost;if(!p||!e)return;
  const pk=p.knowledge||{};
  const pS=pk.song||p.song||'',pA=pk.artist||p.artist||'',eS=e.song||'',eA=e.artist||'';
  const pU=('@'+(p.username||'anonymous')).toUpperCase(),eU=('@'+(e.username||'anonymous')).toUpperCase();
  const el=id=>document.getElementById(id);
  if(el('dsCLyricTop'))el('dsCLyricTop').textContent=p.text||p.lyric||'';
  if(el('dsCLyricBot'))el('dsCLyricBot').textContent=e.lyric||e.text||'';
  if(el('dsCAttrTop'))el('dsCAttrTop').textContent=[pS,pA].filter(Boolean).join(' — ')+' · '+pU;
  if(el('dsCAttrBot'))el('dsCAttrBot').textContent=[eS,eA].filter(Boolean).join(' — ')+' · '+eU;
  if(el('dsCDivPill'))el('dsCDivPill').textContent='LYRIC BACK ↩ '+eU;
}

function _dsApplyTheme(bg){
  const t=DS_THEMES[bg]||DS_THEMES['#07060E'];
  const dk=!t.light;
  const cb=document.getElementById('dsCanvasBg');
  if(cb){
    cb.style.background=t.grad;
    /* Per-theme radial glows via CSS variables */
    cb.style.setProperty('--ds-glow-left', t.glow1||'rgba(255,107,157,0.22)');
    cb.style.setProperty('--ds-glow-right',t.glow2||'rgba(107,140,255,0.22)');
  }
  /* Lyric / attr text colour adapts to light theme */
  document.querySelectorAll('.ds-c-lyric').forEach(el=>el.style.color=t.text);
  document.querySelectorAll('.ds-c-attr').forEach(el=>el.style.color=dk?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.5)');
  /* MARGO stamp colour follows accent */
  const m=document.querySelector('.ds-c-margo');
  if(m)m.style.color=t.acc;
  /* Bubble lyric/song text */
  document.querySelectorAll('.ds-bubble-lyric,.ds-bubble-song').forEach(el=>el.style.color=t.text);
  /* View backgrounds */
  const cv=document.getElementById('dsViewConvo'),cd=document.getElementById('dsViewCard');
  if(cv)cv.style.background=t.grad;
  if(cd)cd.style.background=t.grad;
}

function _dsUpdateCardFonts(){
  ['dsCLyricTop','dsCLyricBot'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.style.fontFamily=`'${DS.fontFamily}',serif`;el.style.fontStyle=DS.fontItalic?'italic':'normal';});
  document.querySelectorAll('.ds-bubble-lyric').forEach(el=>{el.style.fontFamily=`'${DS.fontFamily}',serif`;el.style.fontStyle=DS.fontItalic?'italic':'normal';});
}

/* ════════════ VIEW ════════════ */
function _dsShowView(v){
  document.getElementById('dsViewConvo').style.display=v==='convo'?'':'none';
  document.getElementById('dsViewCard').style.display=v==='card'?'':'none';
  document.getElementById('dsToggleConvo').classList.toggle('active',v==='convo');
  document.getElementById('dsToggleCard').classList.toggle('active',v==='card');
  _dsPlayMotion();
}

/* ════════════ FORMAT SWITCH ════════════ */
function _dsSwitchFormat(fmt){
  DS.format=fmt;
  document.getElementById('dsFmtGif').className='ds-format-tab'+(fmt==='gif'?' active-gif':'');
  document.getElementById('dsFmtPoster').className='ds-format-tab'+(fmt==='poster'?' active-poster':'');
  const dl=document.getElementById('dsBtnDownload'),sh=document.getElementById('dsBtnShare');
  const dlL=document.getElementById('dsBtnDlLabel'),shL=document.getElementById('dsBtnShLabel');
  if(fmt==='gif'){
    if(dl)dl.className='ds-export-btn ds-btn-dl-gif';
    if(sh)sh.className='ds-export-btn ds-btn-sh-gif';
    if(dlL)dlL.textContent='Download GIF';if(shL)shL.textContent='Share GIF';
    if(dl)dl.querySelector('.ds-export-icon').textContent='↓';
    if(sh)sh.querySelector('.ds-export-icon').textContent='↗';
    const mt=document.querySelector('[data-opt="motion"]');if(mt)mt.style.display='';
    _dsPlayMotion();
  }else{
    if(dl)dl.className='ds-export-btn ds-btn-dl-poster';
    if(sh)sh.className='ds-export-btn ds-btn-sh-poster';
    if(dlL)dlL.textContent='Download Poster';if(shL)shL.textContent='Share Poster';
    if(dl)dl.querySelector('.ds-export-icon').textContent='↓';
    if(sh)sh.querySelector('.ds-export-icon').textContent='↗';
    const mt=document.querySelector('[data-opt="motion"]');if(mt)mt.style.display='none';
    const ao=document.querySelector('.ds-option-tab.active');
    if(ao&&ao.dataset.opt==='motion'){
      document.querySelectorAll('.ds-option-tab').forEach(b=>b.classList.remove('active'));
      const ct=document.querySelector('[data-opt="color"]');if(ct)ct.classList.add('active');
      document.querySelectorAll('.ds-panel-section').forEach(s=>s.classList.remove('active'));
      document.getElementById('ds-section-color').classList.add('active');
    }
    _dsClearAnims();
  }
}

/* ════════════ MOTION ════════════ */
function _dsClearAnims(){
  document.querySelectorAll('.ds-anim,.ds-bubble-lyric').forEach(el=>{
    el.style.animation=el.style.opacity=el.style.transform=el.style.overflow=
    el.style.whiteSpace=el.style.borderRight=el.style.width=el.style.display=
    el.style.background=el.style.backgroundSize=el.style.webkitBackgroundClip=
    el.style.webkitTextFillColor=el.style.backgroundClip='';
  });
}
function _dsPlayMotion(){
  if(DS.format==='poster'){return;}
  _dsClearAnims();
  const cc=document.getElementById('dsCanvasContent');if(cc)void cc.offsetHeight;
  const els=document.querySelectorAll('.ds-anim,.ds-bubble-lyric');
  const dur=DS.dur,name=DS.motion;
  els.forEach((el,idx)=>{
    const i=parseInt(el.getAttribute('data-i')??idx),d=i*0.14;
    switch(name){
      case'fade-up':el.style.animation=`dsKFadeUp ${dur}s ${d}s ease-in-out infinite both`;break;
      case'slide-in':el.style.animation=`dsKSlideIn ${dur}s ${d}s ease-in-out infinite both`;break;
      case'pulse':el.style.animation=`dsKPulse ${dur}s ${d}s ease-in-out infinite both`;break;
      case'glitch':el.style.animation=`dsKGlitch ${dur}s ${d*0.5}s steps(1) infinite`;break;
      case'wave':el.style.display='inline-block';el.style.animation=`dsKWave ${dur}s ${d}s ease-in-out infinite`;break;
      case'shimmer':el.style.background='linear-gradient(90deg,rgba(255,255,255,0.6) 0%,#fff 35%,#E8C547 50%,#fff 65%,rgba(255,255,255,0.6) 100%)';el.style.backgroundSize='300% auto';el.style.webkitBackgroundClip='text';el.style.webkitTextFillColor='transparent';el.style.backgroundClip='text';el.style.animation=`dsKShimmer ${dur}s ${d}s linear infinite`;break;
      case'bounce':el.style.display='inline-block';el.style.animation=`dsKBounce ${dur}s ${d}s ease infinite`;break;
      case'typewriter':el.style.overflow='hidden';el.style.whiteSpace='nowrap';el.style.borderRight='2px solid #E8C547';el.style.width='0';el.style.animation=`dsKType ${dur}s ${d}s steps(30,end) infinite,dsKBlink 0.7s ${d}s step-end infinite`;break;
    }
  });
}

/* ════════════ FONT PRELOAD ════════════ */
async function _dsPreloadFonts(){
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('800 1em Syne'),
    document.fonts.load('700 1em "Space Mono"'),
    document.fonts.load('400 1em "Space Mono"'),
    document.fonts.load('700 1em "DM Sans"'),
    document.fonts.load('400 1em "DM Sans"'),
    document.fonts.load(`600 1em "${DS.fontFamily}"`),
    document.fonts.load(`italic 600 1em "${DS.fontFamily}"`),
  ].map(p=>p.catch(()=>{})));
}

/* ════════════ html2canvas LOADER ════════════ */
async function _dsLoadH2C(){
  if(window.html2canvas)return;
  await new Promise((res,rej)=>{
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);
  });
}

/* ════════════ PROGRESS HELPER ════════════ */
function _dsSetProgress(btn,pct,label,color){
  if(!btn)return;
  const icon=btn.querySelector('.ds-export-icon');
  const lbl=btn.querySelector('span:last-child');
  if(icon)icon.textContent=pct>=100?'✓':'◎';
  if(lbl)lbl.textContent=label;
  let bar=btn.querySelector('.ds-progress-bar');
  if(!bar){bar=document.createElement('div');bar.className='ds-progress-bar';btn.appendChild(bar);}
  bar.style.width=pct+'%';
  bar.style.background=color||'#00E5FF';
}

/* ════════════ GIF EXPORT ════════════ */
async function _dsExportGif(plat,action){
  const dlBtn=document.getElementById('dsBtnDownload'),shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'',origSh=shBtn?shBtn.innerHTML:'';
  const isConvo=document.getElementById('dsViewCard').style.display==='none';
  const W=plat.w,H=plat.h,FRAMES=28,DELAY=65;
  const color='#00E5FF';

  if(dlBtn)dlBtn.disabled=true;if(shBtn)shBtn.disabled=true;
  _dsSetProgress(btn,0,'Starting…',color);

  try{
    await _dsPreloadFonts();
    if(typeof GIF==='undefined'){
      await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
    }
    if(isConvo)await _dsLoadH2C();

    const gif=new GIF({workers:4,quality:1,width:W,height:H,workerScript:'/js/gif.worker.js',dither:'FloydSteinberg',globalPalette:false});
    const off=document.createElement('canvas');off.width=W;off.height=H;
    const oc=off.getContext('2d');

    if(isConvo){
      const convoEl=document.getElementById('dsViewConvo');
      const srcW=convoEl.offsetWidth,srcH=convoEl.scrollHeight;
      const scaleX=W/srcW,scaleY=H/srcH;
      const useScale=Math.min(scaleX,scaleY)*1.5;

      for(let i=0;i<FRAMES;i++){
        const t=i/FRAMES;
        _dsSetProgress(btn,Math.round((i/FRAMES)*65),`Frame ${i+1}/${FRAMES}`,color);

        const alpha=(0.35+0.65*Math.abs(Math.sin(t*Math.PI*1.5))).toFixed(3);
        convoEl.querySelectorAll('.ds-bubble-lyric,.ds-lb-pill').forEach(el=>el.style.opacity=alpha);

        const snap=await window.html2canvas(convoEl,{
          width:srcW,height:srcH,scale:useScale,
          backgroundColor:null,logging:false,useCORS:true,allowTaint:true,
        });

        convoEl.querySelectorAll('.ds-bubble-lyric,.ds-lb-pill').forEach(el=>el.style.opacity='');

        oc.clearRect(0,0,W,H);
        const th=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'];
        const cols=th.grad.match(/#[0-9a-fA-F]{6}/g)||['#090810','#0d0b12'];
        const gbg=oc.createLinearGradient(0,0,0,H);gbg.addColorStop(0,cols[0]);gbg.addColorStop(1,cols[1]||cols[0]);
        oc.fillStyle=gbg;oc.fillRect(0,0,W,H);
        const dW=W,dH=Math.round(snap.height*(W/snap.width));
        const dY=Math.max(0,(H-dH)/2);
        oc.drawImage(snap,0,dY,dW,Math.min(dH,H));
        _dsDrawBranding(oc,W,H);
        gif.addFrame(off,{copy:true,delay:DELAY});
        await new Promise(r=>setTimeout(r,0));
      }
    } else {
      for(let i=0;i<FRAMES;i++){
        const t=i/FRAMES;
        _dsSetProgress(btn,Math.round((i/FRAMES)*65),`Frame ${i+1}/${FRAMES}`,color);
        oc.clearRect(0,0,W,H);
        _dsDrawCard(oc,W,H,DS.parentPost,DS.echoPost,t);
        gif.addFrame(off,{copy:true,delay:DELAY});
        await new Promise(r=>setTimeout(r,0));
      }
    }

    gif.on('progress',p=>_dsSetProgress(btn,Math.round(65+p*33),`Encoding ${Math.round(65+p*33)}%`,color));

    gif.on('finished',async blob=>{
      _dsSetProgress(btn,100,'✓ Done!',color);
      const name=(DS.parentPost?.knowledge?.song||DS.parentPost?.song||'duet').replace(/\s+/g,'-').toLowerCase();
      const fname=`margo-duet-${name}-${plat.id}.gif`;
      if(action==='share'&&navigator.share){
        try{await navigator.share({files:[new File([blob],fname,{type:'image/gif'})],title:'Margo Duet',text:'trymargo.com'});}
        catch{_dsDl(blob,fname);}
      } else {_dsDl(blob,fname);}
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
      if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      _dsSwitchFormat(DS.format);
    });

    gif.render();

  } catch(err){
    console.error('GIF error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
    if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    _dsSwitchFormat(DS.format);
  }
}

/* ════════════ POSTER EXPORT ════════════ */
async function _dsExportPoster(plat,action){
  const dlBtn=document.getElementById('dsBtnDownload'),shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'',origSh=shBtn?shBtn.innerHTML:'';
  const isConvo=document.getElementById('dsViewCard').style.display==='none';
  const W=plat.w,H=plat.h;
  const color='#E8C547';

  if(dlBtn)dlBtn.disabled=true;if(shBtn)shBtn.disabled=true;
  _dsSetProgress(btn,0,'Preparing…',color);

  try{
    await _dsPreloadFonts();
    _dsSetProgress(btn,30,'Drawing…',color);

    const off=document.createElement('canvas');off.width=W;off.height=H;
    const ctx=off.getContext('2d');

    if(isConvo){
      await _dsLoadH2C();
      _dsSetProgress(btn,50,'Rendering…',color);
      const convoEl=document.getElementById('dsViewConvo');
      const srcW=convoEl.offsetWidth,srcH=convoEl.scrollHeight;
      const scaleX=W/srcW,scaleY=H/srcH;
      const snap=await window.html2canvas(convoEl,{
        width:srcW,height:srcH,scale:Math.min(scaleX,scaleY)*2,
        backgroundColor:null,logging:false,useCORS:true,allowTaint:true,
      });
      const th=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'];
      const cols=th.grad.match(/#[0-9a-fA-F]{6}/g)||['#090810','#0d0b12'];
      const gbg=ctx.createLinearGradient(0,0,0,H);gbg.addColorStop(0,cols[0]);gbg.addColorStop(1,cols[1]||cols[0]);
      ctx.fillStyle=gbg;ctx.fillRect(0,0,W,H);
      const dW=W,dH=Math.round(snap.height*(W/snap.width));
      ctx.drawImage(snap,0,Math.max(0,(H-dH)/2),dW,Math.min(dH,H));
      _dsDrawBranding(ctx,W,H);
    } else {
      _dsDrawCard(ctx,W,H,DS.parentPost,DS.echoPost,1);
    }

    _dsSetProgress(btn,85,'Saving…',color);
    const name=(DS.parentPost?.knowledge?.song||DS.parentPost?.song||'duet').replace(/\s+/g,'-').toLowerCase();
    const fname=`margo-poster-${name}-${plat.id}.png`;

    off.toBlob(async blob=>{
      if(!blob)return;
      _dsSetProgress(btn,100,'✓ Done!',color);
      if(action==='share'&&navigator.share){
        try{await navigator.share({files:[new File([blob],fname,{type:'image/png'})],title:'Margo Poster',text:'trymargo.com'});}
        catch{_dsDl(blob,fname);}
      } else {_dsDl(blob,fname);}
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
      if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      _dsSwitchFormat(DS.format);
    },'image/png',0.95);

  } catch(err){
    console.error('Poster error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
    if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    _dsSwitchFormat(DS.format);
  }
}

function _dsDl(blob,fname){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=fname;a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}

/* ════════════ BRANDING OVERLAY ════════════
   MARGO = stamp treatment: globalAlpha 0.28, muted colour
   M-mark = full opacity solid circle
   trymargo.com = clearly legible
═══════════════════════════════════════════ */
function _dsDrawBranding(ctx,W,H){
  const t=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'];
  const pad=W*0.055;

  /* MARGO wordmark — stamp: low opacity, slightly desaturated */
  const mSz=W*0.044;
  const stampColor = t.light ? 'rgba(0,0,0,0.35)' : _hexMix(t.acc,'#888888',0.45);
  ctx.save();
  ctx.font=`800 ${mSz}px Syne,sans-serif`;
  ctx.fillStyle=stampColor;
  ctx.globalAlpha=0.28;
  ctx.textBaseline='top';
  ctx.textAlign='left';
  ctx.fillText('MARGO',pad,pad*0.62);
  ctx.restore();

  /* M-mark circle bottom-right — full accent colour */
  const r=W*0.038,cx=W-pad-r,cy=H-pad-r;
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle=t.acc;ctx.globalAlpha=0.92;ctx.fill();
  const sc=r/40;
  const strokeClr=t.light?'#ffffff':'#0B0B0D';
  ctx.strokeStyle=strokeClr;ctx.lineWidth=5.5*sc;ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=1;
  ctx.beginPath();
  ctx.moveTo(cx+(17-40)*sc,cy+(57-40)*sc);ctx.lineTo(cx+(17-40)*sc,cy+(27-40)*sc);
  ctx.lineTo(cx+(29-40)*sc,cy+(45-40)*sc);ctx.lineTo(cx+(40-40)*sc,cy+(26-40)*sc);
  ctx.lineTo(cx+(51-40)*sc,cy+(45-40)*sc);ctx.lineTo(cx+(63-40)*sc,cy+(27-40)*sc);
  ctx.lineTo(cx+(63-40)*sc,cy+(57-40)*sc);
  ctx.stroke();ctx.restore();

  /* trymargo.com watermark — legible */
  const wFS=W*0.018,wTxt='trymargo.com';
  ctx.save();
  ctx.font=`700 ${wFS}px "Space Mono",monospace`;
  ctx.textBaseline='middle';ctx.textAlign='center';
  const wW=ctx.measureText(wTxt).width+W*0.042,wH=wFS*1.8;
  const wX=W/2-wW/2,wY=H-pad*0.55-wH/2;
  ctx.globalAlpha=0.14;
  ctx.fillStyle=t.light?'#000000':'#ffffff';
  if(ctx.roundRect){ctx.beginPath();ctx.roundRect(wX,wY,wW,wH,wH/2);ctx.fill();}
  else ctx.fillRect(wX,wY,wW,wH);
  ctx.globalAlpha=0.82;  /* clearly visible */
  ctx.fillStyle=t.light?'rgba(0,0,0,0.75)':'#ffffff';
  ctx.fillText(wTxt,W/2,wY+wH/2);
  ctx.restore();
}

/* Hex colour mix helper for stamp colour desaturation */
function _hexMix(hex1,hex2,t){
  const p=c=>{const h=c.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
  const [r1,g1,b1]=p(hex1),[r2,g2,b2]=p(hex2);
  const r=Math.round(r1+(r2-r1)*t),g=Math.round(g1+(g2-g1)*t),b=Math.round(b1+(b2-b1)*t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/* ════════════ CARD CANVAS DRAW ════════════ */
function _dsDrawCard(ctx,W,H,parent,echo,t){
  if(!parent||!echo)return;
  const pad=W*0.07,innerW=W-pad*2;
  const th=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'],dk=!th.light;
  const pV=DS_VIBE[parent.emotion||'Nostalgia']||'#E8C547',eV=DS_VIBE[echo.emotion||'Nostalgia']||'#E8C547';
  const lf=DS.fontFamily||'DM Serif Display',li=DS.fontItalic!==false,ls=li?'italic ':'';
  const tc=th.text||'#ffffff';
  const cols=th.grad.match(/#[0-9a-fA-F]{6}/g)||['#090810','#0d0b12'];
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,cols[0]);bg.addColorStop(1,cols[1]||cols[0]);
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  /* Per-theme radial glows */
  _dsGlow(ctx,W*0.15,H*0.15,W*0.65,th.glow1||pV+'22');
  _dsGlow(ctx,W*0.85,H*0.85,W*0.65,th.glow2||eV+'22');
  /* Edge accent lines */
  const tl=ctx.createLinearGradient(0,0,W,0);tl.addColorStop(0,'transparent');tl.addColorStop(0.5,th.l||pV);tl.addColorStop(1,'transparent');
  ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle=tl;ctx.fillRect(0,0,W,2);ctx.restore();
  const bl=ctx.createLinearGradient(0,0,W,0);bl.addColorStop(0,'transparent');bl.addColorStop(0.5,th.r||eV);bl.addColorStop(1,'transparent');
  ctx.save();ctx.globalAlpha=0.38;ctx.fillStyle=bl;ctx.fillRect(0,H-2,W,2);ctx.restore();
  /* Branding (stamp MARGO + M-mark + watermark) */
  _dsDrawBranding(ctx,W,H);
  const pk=parent.knowledge||{};
  const pS=pk.song||parent.song||'',pA=pk.artist||parent.artist||'',eS=echo.song||'',eA=echo.artist||'';
  const sbH=W*0.082,wFS2=W*0.018;
  ctx.font=`700 ${wFS2}px "Space Mono",monospace`;
  const sbY=H-W*0.055*0.55-wFS2*1.8/2-W*0.02-sbH;
  _dsSongsBar(ctx,W,pad,sbY,sbH,pS,pA,eS,eA,dk,tc,th);
  const mSz2=W*0.044,ts=W*0.055*0.62+mSz2+W*0.022,be=sbY-W*0.018,dY=ts+(be-ts)*0.46;
  /* Top lyric */
  const topH=dY-W*0.046-ts;const pTxt=parent.text||parent.lyric||'';
  let pFS=Math.min(W*0.056,topH*0.28);ctx.font=`${ls}600 ${pFS}px "${lf}",serif`;
  let pLn=_wrap(ctx,pTxt,innerW*0.88);
  if(pLn.length>3){pFS=Math.max(W*0.03,pFS*(3/pLn.length));ctx.font=`${ls}600 ${pFS}px "${lf}",serif`;pLn=_wrap(ctx,pTxt,innerW*0.88);}
  const pLH=pFS*1.52,pBH=pLn.length*pLH,ft=t!==undefined?t:1;
  const pSY=ts+(topH-pBH)/2+(1-ft)*20;
  ctx.save();ctx.textBaseline='top';ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=16;
  pLn.forEach((l,i)=>{ctx.globalAlpha=(0.62-i*0.04)*Math.min(1,ft*2);ctx.fillStyle=tc;ctx.fillText(l,W/2,pSY+i*pLH);});ctx.restore();
  if(pS){const paFS=W*0.019;ctx.save();ctx.font=`700 ${paFS}px "Space Mono",monospace`;ctx.fillStyle=th.l||pV;ctx.globalAlpha=0.55;ctx.textBaseline='bottom';ctx.textAlign='center';ctx.fillText(_trunc(ctx,pS+(pA?' — '+pA:''),innerW*0.78),W/2,dY-W*0.04);ctx.restore();}
  /* Divider — Syne 800 */
  const dTxt=`LYRIC BACK ↩  @${(echo.username||'anonymous').toUpperCase()}`,dFS=W*0.021;
  ctx.font=`800 ${dFS}px Syne,sans-serif`;
  const dTW=ctx.measureText(dTxt).width,dpH=dFS*1.95,dpW=dTW+W*0.028*2,dpX=W/2-dpW/2,dpY2=dY-dpH/2,dpR=dpH/2;
  ctx.save();[[pad,W/2-dpW/2-W*0.018],[W/2+dpW/2+W*0.018,W-pad]].forEach(([x1,x2])=>{const lg=ctx.createLinearGradient(x1,0,x2,0);if(x1===pad){lg.addColorStop(0,'transparent');lg.addColorStop(1,'rgba(232,197,71,0.22)');}else{lg.addColorStop(0,'rgba(232,197,71,0.22)');lg.addColorStop(1,'transparent');}ctx.fillStyle=lg;ctx.fillRect(x1,dY-0.75,x2-x1,1.5);});ctx.restore();
  ctx.save();ctx.shadowColor='#E8C547';ctx.shadowBlur=14;ctx.strokeStyle='rgba(232,197,71,0.6)';ctx.lineWidth=1.5;_rr(ctx,dpX,dpY2,dpW,dpH,dpR);ctx.stroke();ctx.shadowBlur=0;
  const dpF=ctx.createLinearGradient(dpX,dpY2,dpX,dpY2+dpH);dpF.addColorStop(0,'rgba(232,197,71,0.14)');dpF.addColorStop(1,'rgba(232,197,71,0.06)');ctx.fillStyle=dpF;_rr(ctx,dpX,dpY2,dpW,dpH,dpR);ctx.fill();
  ctx.font=`800 ${dFS}px Syne,sans-serif`;ctx.fillStyle=th.acc||'#E8C547';ctx.globalAlpha=0.95;ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(dTxt,W/2,dY);ctx.restore();
  /* Bottom lyric */
  const bS2=dY+dpH/2+W*0.026,bH2=sbY-W*0.018-bS2;const eTxt=echo.lyric||echo.text||'';
  let eFS=Math.min(W*0.064,bH2*0.28);ctx.font=`${ls}700 ${eFS}px "${lf}",serif`;
  let eLn=_wrap(ctx,eTxt,innerW*0.88);
  if(eLn.length>3){eFS=Math.max(W*0.034,eFS*(3/eLn.length));ctx.font=`${ls}700 ${eFS}px "${lf}",serif`;eLn=_wrap(ctx,eTxt,innerW*0.88);}
  const eLH=eFS*1.52,eBH=eLn.length*eLH,eOY=t!==undefined?(1-Math.min(1,t*1.5))*20:0;
  const eSY=bS2+(bH2-eBH)/2+eOY;
  ctx.save();ctx.textBaseline='top';ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=20;
  eLn.forEach((l,i)=>{ctx.globalAlpha=(1-i*0.02)*(t!==undefined?Math.min(1,t*1.8):1);ctx.fillStyle=tc;ctx.fillText(l,W/2,eSY+i*eLH);});ctx.restore();
  if(eS){const eaFS=W*0.019;ctx.save();ctx.font=`700 ${eaFS}px "Space Mono",monospace`;ctx.fillStyle=th.r||eV;ctx.globalAlpha=0.75;ctx.textBaseline='top';ctx.textAlign='center';ctx.fillText(_trunc(ctx,eS+(eA?' — '+eA:''),innerW*0.78),W/2,eSY+eBH+W*0.012);ctx.restore();}
}

/* ════════════ SONGS BAR — Syne 800 SONGS label, legible ════════════ */
function _dsSongsBar(ctx,W,pad,bY,bH,pS,pA,eS,eA,dk,tc,th){
  const bX=pad,bW=W-pad*2,bR=W*0.022;
  ctx.save();ctx.globalAlpha=0.55;ctx.fillStyle=dk?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)';_rr(ctx,bX,bY,bW,bH,bR);ctx.fill();
  ctx.globalAlpha=0.3;ctx.strokeStyle=dk?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)';ctx.lineWidth=1;_rr(ctx,bX,bY,bW,bH,bR);ctx.stroke();ctx.restore();
  const lFS=W*0.022,sFS=W*0.024,aFS=W*0.018,mY=bY+bH/2;
  /* SONGS label — Syne 800, clearly readable */
  ctx.save();
  ctx.font=`800 ${lFS}px Syne,sans-serif`;
  ctx.fillStyle=dk?'rgba(255,255,255,0.72)':'rgba(0,0,0,0.6)';
  ctx.textBaseline='middle';ctx.textAlign='left';
  ctx.fillText('SONGS',bX+W*0.038,mY);
  ctx.restore();
  const s1X=bX+W*0.2;ctx.save();ctx.font=`700 ${sFS}px "DM Sans",sans-serif`;ctx.fillStyle=tc;ctx.globalAlpha=0.85;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(_trunc(ctx,pS,W*0.22),s1X,mY-aFS*0.55);ctx.font=`400 ${aFS}px "Space Mono",monospace`;ctx.fillStyle=dk?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.45)';ctx.fillText(_trunc(ctx,pA,W*0.22),s1X,mY+sFS*0.55);ctx.restore();
  ctx.save();ctx.font=`400 ${W*0.03}px "Space Mono",monospace`;ctx.fillStyle=(th&&th.acc)?th.acc+'99':'rgba(232,197,71,0.55)';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText('↔',W/2,mY);ctx.restore();
  const s2X=W-pad-W*0.038;ctx.save();ctx.font=`700 ${sFS}px "DM Sans",sans-serif`;ctx.fillStyle=tc;ctx.globalAlpha=0.85;ctx.textBaseline='middle';ctx.textAlign='right';ctx.fillText(_trunc(ctx,eS,W*0.22),s2X,mY-aFS*0.55);ctx.font=`400 ${aFS}px "Space Mono",monospace`;ctx.fillStyle=dk?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.45)';ctx.fillText(_trunc(ctx,eA,W*0.22),s2X,mY+sFS*0.55);ctx.restore();
}

function _dsGlow(ctx,cx,cy,r,col){ctx.save();const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}
function _rr(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function _wrap(ctx,text,maxW){const words=(text||'').split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);return lines.length?lines:[''];}
function _trunc(ctx,text,maxW){if(!text)return'';let t=text;while(ctx.measureText(t).width>maxW&&t.length>3)t=t.slice(0,-4)+'…';return t;}
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ════════════ SWIPE ════════════ */
function _initDsSwipe(){
  const sh=document.getElementById('duetSheet'),h=document.getElementById('dsDragHandle');
  if(!sh||!h)return;
  let sY=0,cY=0,dr=false;
  h.addEventListener('touchstart',e=>{sY=e.touches[0].clientY;cY=sY;dr=true;sh.style.transition='none';},{passive:true});
  h.addEventListener('touchmove',e=>{if(!dr)return;cY=e.touches[0].clientY;const dy=Math.max(0,cY-sY);sh.style.transform=`translateY(${dy}px)`;sh.style.opacity=String(1-dy/320);},{passive:true});
  h.addEventListener('touchend',()=>{if(!dr)return;dr=false;sh.style.transition='';if(cY-sY>80)closeDuetSheet();else{sh.style.transform='';sh.style.opacity='';}});
}

window.openDuetSheet=openDuetSheet;
window.closeDuetSheet=closeDuetSheet;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountDuetSheet);
else mountDuetSheet();

})();
