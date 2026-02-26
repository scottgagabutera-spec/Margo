/* ================================================================
   MARGO · js/studio.js  v5.0  — Motion Studio
   ----------------------------------------------------------------
   Drop-in replacement. No changes to index.html, style.css,
   motion.js required.

   This file:
   - Rebuilds #studioOverlay innerHTML with the full Motion Studio UI
   - Injects all CSS needed (styles won't touch existing selectors)
   - Wires all events
   - Uses the proven CSS-class + style-injection animation system
     from the standalone margo-motion-studio-v3.html demo
   - Video export via canvas drawFrame() + MediaRecorder (WebM/VP9)
   - PNG export via canvas drawFrame() at t=1 (final frame)
   - All 9 canvas sizes covering every major social platform
   - Reads from window.currentPost (set by existing feed.js/state.js)
   ================================================================ */

/* ────────────────────────────────────────────────────────────────
   DATA
──────────────────────────────────────────────────────────────── */
const STU_SIZES = {
  square:   { w:1080, h:1080, ratio:'1:1',    label:'Instagram',        plat:'Instagram,Facebook,WhatsApp,Discord,Reddit,Telegram' },
  story:    { w:1080, h:1920, ratio:'9:16',   label:'IG / FB Story',    plat:'Instagram Story,Facebook Story,TikTok,WhatsApp Status,Snapchat,YouTube Shorts' },
  fbstory:  { w:1080, h:1920, ratio:'9:16',   label:'Facebook Story',   plat:'Facebook Story,Instagram Story,Messenger,WhatsApp Status' },
  twitter:  { w:1200, h:675,  ratio:'16:9',   label:'Twitter / X',      plat:'Twitter/X,Discord,Reddit,YouTube,LinkedIn' },
  reddit:   { w:1080, h:1080, ratio:'1:1',    label:'Reddit / Discord', plat:'Reddit,Discord,Telegram,Facebook,WhatsApp' },
  linkedin: { w:1200, h:627,  ratio:'1.91:1', label:'LinkedIn',         plat:'LinkedIn,Facebook OG,Discord,Reddit,Twitter/X' },
  whatsapp: { w:1080, h:1080, ratio:'1:1',    label:'WhatsApp',         plat:'WhatsApp,Instagram,Discord,Telegram,Facebook' },
  tiktok:   { w:1080, h:1920, ratio:'9:16',   label:'TikTok',           plat:'TikTok,Instagram Reels,YouTube Shorts,Snapchat' },
  pinterest:{ w:1000, h:1500, ratio:'2:3',    label:'Pinterest',        plat:'Pinterest,Instagram,Facebook' },
};

const STU_THEMES = {
  midnight: { bg0:'#0B0B0D', bg1:'#111118', bg2:'#0B0B0D', accent:'#E8C547', textCol:'#F0F0F0', light:false },
  violet:   { bg0:'#0d0014', bg1:'#130020', bg2:'#0a000f', accent:'#c77dff', textCol:'#F0F0F0', light:false },
  ocean:    { bg0:'#050e1a', bg1:'#071525', bg2:'#030b14', accent:'#00e5ff', textCol:'#F0F0F0', light:false },
  ember:    { bg0:'#120508', bg1:'#1a0608', bg2:'#0f0407', accent:'#ff6b4a', textCol:'#F0F0F0', light:false },
  forest:   { bg0:'#051a0d', bg1:'#071a0a', bg2:'#04140a', accent:'#50fa7b', textCol:'#F0F0F0', light:false },
  rose:     { bg0:'#1a0d0f', bg1:'#200d12', bg2:'#160b0d', accent:'#f4a4c0', textCol:'#F0F0F0', light:false },
  bone:     { bg0:'#f5f1e8', bg1:'#ede8dc', bg2:'#e8e2d4', accent:'#B8901A', textCol:'#1a1a20', light:true  },
  mono:     { bg0:'#000000', bg1:'#080808', bg2:'#050505', accent:'#ffffff', textCol:'#F0F0F0', light:false },
  wave:     { bg0:'#1a0533', bg1:'#0f0a20', bg2:'#001a1a', accent:'#ff71ce', textCol:'#F0F0F0', light:false },
  neon:     { bg0:'#0a0a0a', bg1:'#0d0d0d', bg2:'#080808', accent:'#ff00ff', textCol:'#F0F0F0', light:false },
  chrome:   { bg0:'#000033', bg1:'#000824', bg2:'#000020', accent:'#00ffff', textCol:'#F0F0F0', light:false },
  brutal:   { bg0:'#ffffff', bg1:'#f5f5f5', bg2:'#ebebeb', accent:'#0B0B0D', textCol:'#0B0B0D', light:true  },
};

const EMOTION_THEME_MAP = {
  Love:'rose', Heartbreak:'ember', Hope:'ocean',
  Nostalgia:'midnight', Healing:'forest',
  Joy:'midnight', Rage:'ember', Loneliness:'violet',
};

/* ────────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────────── */
const S = {
  theme:'midnight', font:{ fam:"'Playfair Display',serif", sty:'italic' },
  motion:'word', spd:1, textScale:1, pulse:3.4,
  photo:null, blur:0, dim:50, filter:'none',
  brightness:100, contrast:100,
  canvas:{ ...STU_SIZES.square },
  looping:false,
  song:'', artist:'', lyric:'', emotion:'',
};
let _photoImg = null;
let _loopTimer = null;

/* ────────────────────────────────────────────────────────────────
   CSS INJECTION
   All studio styles live here — zero changes to style.css needed
──────────────────────────────────────────────────────────────── */
function injectCSS() {
  if (document.getElementById('margo-stu-css')) return;
  const el = document.createElement('style');
  el.id = 'margo-stu-css';
  el.textContent = `
/* ── OVERLAY ── */
#studioOverlay{position:fixed;inset:0;z-index:500;background:#060609;display:grid;grid-template-rows:52px 1fr;overflow:hidden;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
#studioOverlay.hidden{display:none!important}

/* ── TOPBAR ── */
.ms-topbar{display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:rgba(11,11,13,.97);border-bottom:1px solid rgba(255,255,255,.06);backdrop-filter:blur(24px)}
.ms-tl{display:flex;align-items:center;gap:10px}
.ms-logo-wrap{position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center}
.ms-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(232,197,71,.65);width:20px;height:20px;animation:msPulse 3.4s ease-out infinite}
.ms-ring:nth-child(2){animation-delay:1.133s}.ms-ring:nth-child(3){animation-delay:2.266s}
@keyframes msPulse{0%{transform:scale(.55);opacity:1;border-color:rgba(232,197,71,.8)}100%{transform:scale(2.8);opacity:0;border-color:rgba(232,197,71,0)}}
.ms-logo-core{position:relative;z-index:2;animation:msBreathe 3.4s ease-in-out infinite}
@keyframes msBreathe{0%,100%{filter:drop-shadow(0 0 5px rgba(232,197,71,.6))}50%{filter:drop-shadow(0 0 16px rgba(232,197,71,1))}}
.ms-brand{font-family:'Syne',sans-serif;font-weight:800;font-size:.88rem;letter-spacing:4px;color:#E8C547}
.ms-sub{font-family:'Space Mono',monospace;font-size:.38rem;color:rgba(255,255,255,.22);text-transform:uppercase;letter-spacing:2px}
.ms-tr{display:flex;align-items:center;gap:8px}
.ms-back{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.55);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s;flex-shrink:0}
.ms-back:hover{background:rgba(255,255,255,.12);color:#fff}
.ms-replay{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.45);border-radius:8px;padding:7px 13px;font-family:'Space Mono',monospace;font-size:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;cursor:pointer;transition:all .18s}
.ms-replay:hover{border-color:rgba(232,197,71,.35);color:#E8C547}
.ms-export{background:#E8C547;color:#0B0B0D;border:none;border-radius:10px;padding:9px 20px;font-family:'Syne',sans-serif;font-weight:800;font-size:.75rem;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
.ms-export:hover{box-shadow:0 6px 20px rgba(232,197,71,.35);transform:translateY(-1px)}

/* ── BODY ── */
.ms-body{display:grid;grid-template-columns:300px 1fr;height:100%;overflow:hidden}
@media(max-width:700px){.ms-body{grid-template-columns:1fr;grid-template-rows:1fr 270px}.ms-stage{order:1}.ms-sidebar{order:2}}

/* ── STAGE ── */
.ms-stage{background:#060609;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:28px}
.ms-stage::before{content:'';position:absolute;width:700px;height:280px;background:radial-gradient(ellipse,rgba(232,197,71,.04) 0%,transparent 70%);top:-100px;left:50%;transform:translateX(-50%);pointer-events:none}
.ms-canvas-wrap{position:relative;border-radius:6px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.05);transition:all .4s cubic-bezier(.34,1.2,.64,1)}
.ms-stage-ctrl{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:5px;background:rgba(11,11,13,.92);border:1px solid rgba(255,255,255,.11);border-radius:100px;padding:6px 12px;backdrop-filter:blur(16px);white-space:nowrap}
.ms-sc-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.28);font-family:'Space Mono',monospace;font-size:.38rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 7px;border-radius:5px;transition:all .15s}
.ms-sc-btn:hover,.ms-sc-btn.active{color:#E8C547}
.ms-sc-div{width:1px;height:13px;background:rgba(255,255,255,.07)}
.ms-sz-info{font-family:'Space Mono',monospace;font-size:.38rem;color:rgba(255,255,255,.22);padding:3px 7px}

/* ── POSTER DOM ── */
.ms-poster{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.ms-t-midnight{background:#0B0B0D}
.ms-t-violet  {background:linear-gradient(145deg,#0d0014,#150020)}
.ms-t-ocean   {background:linear-gradient(145deg,#050e1a,#081525)}
.ms-t-ember   {background:linear-gradient(145deg,#120508,#1a0608)}
.ms-t-forest  {background:linear-gradient(145deg,#051a0d,#081a0a)}
.ms-t-rose    {background:linear-gradient(145deg,#1a0d0f,#200d12)}
.ms-t-bone    {background:linear-gradient(145deg,#f5f1e8,#ede8dc)}
.ms-t-mono    {background:#000}
.ms-t-wave    {background:linear-gradient(145deg,#1a0533,#001a1a)}
.ms-t-neon    {background:#0a0a0a}
.ms-t-chrome  {background:linear-gradient(145deg,#000033,#000824)}
.ms-t-brutal  {background:#fff}
.ms-p-shimmer{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(232,197,71,.6) 50%,transparent);z-index:3;pointer-events:none}
.ms-t-brutal .ms-p-shimmer,.ms-t-bone .ms-p-shimmer{display:none}
.ms-p-noise{position:absolute;inset:0;pointer-events:none;z-index:1;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");background-size:180px;opacity:.03;mix-blend-mode:overlay}
.ms-p-photo{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0;transition:filter .3s}
.ms-p-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;padding:10%;width:100%;height:100%;justify-content:center}
/* light themes */
.ms-t-bone .ms-p-lyric,.ms-t-brutal .ms-p-lyric{color:#1a1a20!important}
.ms-t-bone .ms-p-song,.ms-t-brutal .ms-p-song{color:rgba(26,26,32,.75)!important}
.ms-t-bone .ms-p-artist,.ms-t-brutal .ms-p-artist{color:rgba(26,26,32,.45)!important}
.ms-t-bone .ms-p-brand-word,.ms-t-brutal .ms-p-brand-word{color:#B8901A!important}
.ms-t-bone .ms-p-emotion,.ms-t-brutal .ms-p-emotion{color:#B8901A!important}
.ms-t-bone .ms-p-div,.ms-t-brutal .ms-p-div{background:rgba(26,26,32,.25)!important}
.ms-t-bone .ms-wbar,.ms-t-brutal .ms-wbar{background:rgba(26,26,32,.4)!important}
.ms-t-bone .ms-pr,.ms-t-brutal .ms-pr{border-color:rgba(26,26,32,.5)!important}
.ms-t-bone .ms-p-logo svg circle,.ms-t-brutal .ms-p-logo svg circle,
.ms-t-bone .ms-p-brand svg circle,.ms-t-brutal .ms-p-brand svg circle{fill:#1a1a20}
.ms-t-bone .ms-p-logo svg path,.ms-t-brutal .ms-p-logo svg path,
.ms-t-bone .ms-p-brand svg path,.ms-t-brutal .ms-p-brand svg path{stroke:#E8C547}
.ms-t-bone .ms-p-logo svg rect,.ms-t-brutal .ms-p-logo svg rect,
.ms-t-bone .ms-p-brand svg rect,.ms-t-brutal .ms-p-brand svg rect{fill:#E8C547}
/* logo */
.ms-p-logo{position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ms-p-rings{position:absolute;inset:-80%;display:flex;align-items:center;justify-content:center;pointer-events:none}
.ms-pr{position:absolute;border-radius:50%;border:1.5px solid rgba(232,197,71,.6);animation:msPRipple var(--ms-pulse,3.4s) ease-out infinite}
.ms-pr:nth-child(2){animation-delay:calc(var(--ms-pulse,3.4s)/3)}
.ms-pr:nth-child(3){animation-delay:calc(var(--ms-pulse,3.4s)/3*2)}
@keyframes msPRipple{0%{transform:scale(.5);opacity:1;border-color:rgba(232,197,71,.8)}100%{transform:scale(4);opacity:0;border-color:rgba(232,197,71,0)}}
.ms-p-logo svg{position:relative;z-index:2;animation:msBreathe var(--ms-pulse,3.4s) ease-in-out infinite}
/* waveform */
.ms-p-wave{display:flex;align-items:center;justify-content:center;gap:2px;flex-shrink:0}
.ms-wbar{border-radius:2px;background:rgba(232,197,71,.5);animation:msWv 1.2s ease-in-out infinite}
.ms-wbar:nth-child(1){animation-delay:0s}.ms-wbar:nth-child(2){animation-delay:.1s}.ms-wbar:nth-child(3){animation-delay:.2s}
.ms-wbar:nth-child(4){animation-delay:.3s}.ms-wbar:nth-child(5){animation-delay:.2s}.ms-wbar:nth-child(6){animation-delay:.1s}.ms-wbar:nth-child(7){animation-delay:0s}
@keyframes msWv{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
/* text */
.ms-p-lyric{font-style:italic;font-weight:400;color:#F0F0F0;line-height:1.45;text-align:center;position:relative;z-index:2;width:100%}
.ms-p-song{font-weight:600;color:rgba(240,240,240,.85);position:relative;z-index:2}
.ms-p-artist{font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(240,240,240,.45);position:relative;z-index:2}
.ms-p-div{width:26px;height:1px;background:rgba(232,197,71,.3);position:relative;z-index:2;flex-shrink:0}
.ms-p-brand{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;z-index:2}
.ms-p-brand-l{display:flex;align-items:center;gap:5px}
.ms-p-brand-word{font-family:'Syne',sans-serif;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#E8C547}
.ms-p-emotion{font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;color:#E8C547}

/* ── ANIMATION KEYFRAMES ── */
@keyframes msLogoIn  {from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes msSlideUp {from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
@keyframes msWordUp  {to{opacity:1;transform:translateY(0)}}
@keyframes msLyricUp {to{opacity:1;transform:translateY(0)}}
@keyframes msCinIn   {to{opacity:1;transform:scale(1);filter:blur(0)}}
@keyframes msTypeW   {from{width:0}to{width:100%}}
@keyframes msBlinkC  {from,to{border-color:transparent}50%{border-color:#E8C547}}
@keyframes msGlIn    {from{opacity:0;clip-path:inset(0 0 100% 0)}to{opacity:1;clip-path:inset(0 0 0% 0)}}
@keyframes msGlShk   {0%{transform:translate(-3px,0);color:#0ff}25%{transform:translate(3px,0);color:#f0f}50%{transform:translate(-2px,0);color:#ff0}100%{transform:translate(0);color:inherit}}
@keyframes msRiseUp  {to{opacity:1;transform:translateY(0)}}
@keyframes msBlurIn  {to{opacity:1;filter:blur(0);letter-spacing:normal}}

/* hidden until .ms-playing */
.ms-p-logo,.ms-p-wave,.ms-p-lyric,.ms-p-div,.ms-p-song,.ms-p-artist,.ms-p-brand{opacity:0}
.ms-anim-word  .ms-word{display:inline-block;opacity:0;transform:translateY(13px)}
.ms-anim-rise  .ms-p-lyric span.ms-ch{display:inline-block;opacity:0;transform:translateY(30px)}
.ms-anim-fade  .ms-p-lyric{opacity:0;transform:translateY(20px)}
.ms-anim-cinema .ms-p-lyric{opacity:0;transform:scale(.95);filter:blur(8px)}
.ms-anim-blur  .ms-p-lyric{opacity:0;filter:blur(22px);letter-spacing:.4em}
.ms-anim-glitch .ms-p-lyric{opacity:0}
.ms-anim-type  .ms-p-lyric{overflow:hidden;white-space:nowrap;border-right:2px solid #E8C547;width:0;opacity:1}
/* .ms-playing rules injected by setSpeed() */

/* ── SIDEBAR ── */
.ms-sidebar{background:#141418;border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;overflow:hidden}
.ms-tab-bar{display:flex;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;height:50px}
.ms-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;border:none;background:none;color:rgba(255,255,255,.25);transition:all .18s;position:relative;font-family:'Space Mono',monospace;font-size:.37rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.ms-tab-icon{font-size:.9rem;line-height:1}
.ms-tab::after{content:'';position:absolute;bottom:0;left:20%;right:20%;height:2px;background:#E8C547;border-radius:2px 2px 0 0;opacity:0;transition:opacity .18s}
.ms-tab.active{color:#E8C547}.ms-tab.active::after{opacity:1}
.ms-panels{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.06) transparent}
.ms-panels::-webkit-scrollbar{width:3px}
.ms-panel{display:none;padding:14px;flex-direction:column;gap:11px}
.ms-panel.active{display:flex}
.ms-lbl{font-family:'Space Mono',monospace;font-size:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:rgba(255,255,255,.22);display:flex;align-items:center;gap:8px;flex-shrink:0}
.ms-lbl::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06)}
/* inputs */
.ms-in{width:100%;padding:8px 11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:9px;color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:.8rem;outline:none;transition:border-color .2s;-webkit-appearance:none}
.ms-in:focus{border-color:rgba(232,197,71,.3)}.ms-in::placeholder{color:rgba(255,255,255,.2)}
.ms-g2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
/* canvas grid */
.ms-cv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.ms-cv-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);cursor:pointer;transition:all .18s}
.ms-cv-btn:hover{border-color:rgba(232,197,71,.25)}.ms-cv-btn.active{border-color:#E8C547;background:rgba(232,197,71,.08)}
.ms-cv-ratio{font-family:'Syne',sans-serif;font-size:.55rem;font-weight:700;color:#E8C547}
.ms-cv-name{font-family:'Space Mono',monospace;font-size:.32rem;font-weight:700;color:rgba(255,255,255,.28);text-transform:uppercase;letter-spacing:.3px;text-align:center;line-height:1.3}
.ms-cv-btn.active .ms-cv-name{color:#E8C547}
.ms-plat-wrap{display:flex;flex-wrap:wrap;gap:4px}
.ms-plat-tag{font-family:'Space Mono',monospace;font-size:.33rem;font-weight:700;text-transform:uppercase;letter-spacing:.3px;padding:2px 6px;border-radius:4px;color:rgba(74,222,128,.75);background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.15)}
/* theme grid */
.ms-th-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.ms-th-item{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}
.ms-th-sw{width:100%;aspect-ratio:1;border-radius:9px;border:2px solid transparent;transition:all .2s;box-shadow:0 3px 8px rgba(0,0,0,.4)}
.ms-th-item:hover .ms-th-sw{transform:scale(1.08)}.ms-th-item.active .ms-th-sw{border-color:#E8C547;box-shadow:0 0 0 3px rgba(232,197,71,.25)}
.ms-th-nm{font-family:'Space Mono',monospace;font-size:.35rem;font-weight:700;text-transform:uppercase;color:rgba(255,255,255,.25)}
.ms-th-item.active .ms-th-nm{color:#E8C547}
/* sliders */
.ms-sl-row{display:flex;align-items:center;gap:8px}
.ms-sl-lbl{font-family:'Space Mono',monospace;font-size:.4rem;font-weight:700;color:rgba(255,255,255,.28);text-transform:uppercase;letter-spacing:1px;min-width:58px}
.ms-sl{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.1);outline:none;-webkit-appearance:none;cursor:pointer}
.ms-sl::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#E8C547;cursor:pointer;box-shadow:0 0 6px rgba(232,197,71,.4)}
.ms-sl-val{font-family:'Space Mono',monospace;font-size:.44rem;font-weight:700;color:#E8C547;min-width:32px;text-align:right}
/* font grid */
.ms-fn-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ms-fn-btn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 7px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);cursor:pointer;transition:all .18s;text-align:center}
.ms-fn-btn:hover{border-color:rgba(232,197,71,.25)}.ms-fn-btn.active{border-color:#E8C547;background:rgba(232,197,71,.07)}
.ms-fn-pre{font-size:.84rem;color:rgba(255,255,255,.75);line-height:1.3;display:block}.ms-fn-btn.active .ms-fn-pre{color:#fff}
.ms-fn-nm{font-family:'Space Mono',monospace;font-size:.35rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.22)}.ms-fn-btn.active .ms-fn-nm{color:#E8C547}
/* motion */
.ms-mo-list{display:flex;flex-direction:column;gap:5px}
.ms-mo-btn{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:9px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);cursor:pointer;transition:all .18s}
.ms-mo-btn:hover{border-color:rgba(232,197,71,.25)}.ms-mo-btn.active{background:rgba(232,197,71,.08);border-color:rgba(232,197,71,.35)}
.ms-mo-ico{font-size:.95rem;width:20px;text-align:center;flex-shrink:0}
.ms-mo-name{font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:600;color:#F0F0F0;display:block;margin-bottom:1px}.ms-mo-btn.active .ms-mo-name{color:#E8C547}
.ms-mo-desc{font-family:'Space Mono',monospace;font-size:.35rem;color:rgba(255,255,255,.26);text-transform:uppercase;letter-spacing:.4px;display:block}
/* speed */
.ms-spd-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.ms-sp-btn{padding:9px 4px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.28);font-family:'Space Mono',monospace;font-size:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;cursor:pointer;transition:all .18s;text-align:center}
.ms-sp-btn:hover{border-color:rgba(232,197,71,.25);color:rgba(255,255,255,.6)}.ms-sp-btn.active{background:rgba(232,197,71,.1);border-color:rgba(232,197,71,.4);color:#E8C547}
/* photo */
.ms-ph-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:18px;border:1.5px dashed rgba(232,197,71,.25);border-radius:11px;cursor:pointer;transition:all .2s;background:rgba(232,197,71,.03);min-height:80px}
.ms-ph-drop:hover,.ms-ph-drop.has-photo{border-color:rgba(232,197,71,.5);background:rgba(232,197,71,.06)}
.ms-ph-ico{color:#E8C547;opacity:.6;font-size:1.3rem}
.ms-ph-txt{font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:600;color:rgba(255,255,255,.4)}
.ms-ph-sub{font-family:'Space Mono',monospace;font-size:.36rem;color:rgba(255,255,255,.2);text-transform:uppercase;letter-spacing:1px}
.ms-ph-ctrl{display:flex;flex-direction:column;gap:9px}.ms-ph-ctrl.hidden{display:none}
.ms-fi-row{display:flex;gap:4px}
.ms-fi-btn{flex:1;padding:7px 3px;border-radius:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.3);font-family:'Space Mono',monospace;font-size:.38rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;cursor:pointer;transition:all .15s;text-align:center}
.ms-fi-btn:hover{border-color:rgba(232,197,71,.25);color:rgba(255,255,255,.7)}.ms-fi-btn.active{background:rgba(232,197,71,.1);border-color:rgba(232,197,71,.4);color:#E8C547}
.ms-rm-ph{width:100%;padding:8px;background:transparent;border:1px solid rgba(255,100,100,.2);border-radius:8px;color:rgba(255,100,100,.5);font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:600;cursor:pointer;transition:all .18s}
.ms-rm-ph:hover{border-color:#ff6464;color:#ff6464}

/* ── EXPORT MODAL ── */
.ms-export-modal{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.87);backdrop-filter:blur(12px);display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s}
.ms-export-modal.open{opacity:1;pointer-events:all}
.ms-em-box{background:#111013;border:1px solid rgba(255,255,255,.08);border-bottom:none;border-radius:24px 24px 0 0;width:100%;max-width:560px;padding:26px 22px 42px;transform:translateY(50px);transition:transform .35s cubic-bezier(.34,1.2,.64,1)}
.ms-export-modal.open .ms-em-box{transform:translateY(0)}
.ms-em-h{font-family:'Syne',sans-serif;font-weight:800;font-size:.95rem;letter-spacing:2px;text-transform:uppercase;color:#E8C547;margin-bottom:3px}
.ms-em-sub{font-family:'Space Mono',monospace;font-size:.4rem;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:2px;margin-bottom:18px}
.ms-ef-list{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
.ms-ef{display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);cursor:pointer;transition:all .18s}
.ms-ef:hover,.ms-ef.rec{border-color:rgba(232,197,71,.35);background:rgba(232,197,71,.05)}
.ms-ef-ico{font-size:1.3rem;flex-shrink:0}
.ms-ef-name{font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;color:#F0F0F0;margin-bottom:2px}
.ms-ef-desc{font-family:'Space Mono',monospace;font-size:.36rem;color:rgba(255,255,255,.28);text-transform:uppercase;letter-spacing:.4px;line-height:1.6}
.ms-ef-badge{font-family:'Space Mono',monospace;font-size:.35rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 8px;border-radius:100px;flex-shrink:0;white-space:nowrap}
.ms-b-rec{background:rgba(232,197,71,.15);color:#E8C547;border:1px solid rgba(232,197,71,.3)}
.ms-b-sm{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.2)}
.ms-pl-list{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px}
.ms-pl-tag{display:flex;align-items:center;gap:3px;font-family:'Space Mono',monospace;font-size:.34rem;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:rgba(74,222,128,.75);background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.15);border-radius:4px;padding:3px 6px}
.ms-pl-dot{width:4px;height:4px;border-radius:50%;background:#4ade80}
.ms-em-cancel{width:100%;padding:11px;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:11px;color:rgba(255,255,255,.28);font-family:'Space Mono',monospace;font-size:.46rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;cursor:pointer;transition:all .18s}
.ms-em-cancel:hover{border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.55)}
`;
  document.head.appendChild(el);
}

/* ────────────────────────────────────────────────────────────────
   BUILD HTML — replaces #studioOverlay contents
──────────────────────────────────────────────────────────────── */
function buildStudioHTML() {
  const ov = document.getElementById('studioOverlay');
  if (!ov) return;
  ov.innerHTML = `
<header class="ms-topbar">
  <div class="ms-tl">
    <div class="ms-logo-wrap">
      <span class="ms-ring"></span><span class="ms-ring"></span><span class="ms-ring"></span>
      <svg class="ms-logo-core" viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
        <circle cx="40" cy="40" r="36" fill="#E8C547"/>
        <path d="M17 57L17 27L29 45L40 26L51 45L63 27L63 57" fill="none" stroke="#0B0B0D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55"/>
      </svg>
    </div>
    <div><div class="ms-brand">MARGO</div><div class="ms-sub">Motion Studio</div></div>
  </div>
  <div class="ms-tr">
    <button class="ms-back" id="msBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
    </button>
    <button class="ms-replay" id="msReplay">↺ Preview</button>
    <button class="ms-export" id="msExportBtn">↓ Export</button>
  </div>
</header>

<div class="ms-body">

  <!-- STAGE -->
  <main class="ms-stage" id="msStage">
    <div class="ms-canvas-wrap" id="msCanvasWrap">
      <div class="ms-poster ms-t-midnight ms-anim-word" id="msPoster">
        <div class="ms-p-shimmer"></div>
        <div class="ms-p-noise"></div>
        <div class="ms-p-photo" id="msPPhoto" style="display:none"></div>
        <div class="ms-p-content">
          <div class="ms-p-logo" id="msPLogo">
            <div class="ms-p-rings">
              <div class="ms-pr" id="msPr1"></div><div class="ms-pr" id="msPr2"></div><div class="ms-pr" id="msPr3"></div>
            </div>
            <svg id="msPLogoSvg" viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="36" fill="#E8C547"/>
              <path d="M17 57L17 27L29 45L40 26L51 45L63 27L63 57" fill="none" stroke="#0B0B0D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55"/>
            </svg>
          </div>
          <div class="ms-p-wave" id="msPWave">
            <div class="ms-wbar" style="height:7px"></div><div class="ms-wbar" style="height:12px"></div>
            <div class="ms-wbar" style="height:18px"></div><div class="ms-wbar" style="height:14px"></div>
            <div class="ms-wbar" style="height:22px"></div><div class="ms-wbar" style="height:14px"></div>
            <div class="ms-wbar" style="height:18px"></div>
          </div>
          <div class="ms-p-lyric" id="msPLyric"></div>
          <div class="ms-p-div"></div>
          <div class="ms-p-song" id="msPSong"></div>
          <div class="ms-p-artist" id="msPArtist"></div>
        </div>
        <div class="ms-p-brand" id="msPBrand">
          <div class="ms-p-brand-l">
            <svg id="msPBrandSvg" viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="36" fill="#E8C547"/>
              <path d="M17 57L17 27L29 45L40 26L51 45L63 27L63 57" fill="none" stroke="#0B0B0D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55"/>
            </svg>
            <span class="ms-p-brand-word">MARGO</span>
          </div>
          <div class="ms-p-emotion" id="msPEmotion"></div>
        </div>
      </div>
    </div>
    <div class="ms-stage-ctrl">
      <button class="ms-sc-btn" id="msReplayStage">↺ Replay</button>
      <div class="ms-sc-div"></div>
      <button class="ms-sc-btn" id="msLoopBtn">⟳ Loop</button>
      <div class="ms-sc-div"></div>
      <span class="ms-sz-info" id="msSzInfo">1080 × 1080</span>
    </div>
  </main>

  <!-- SIDEBAR -->
  <aside class="ms-sidebar">
    <div class="ms-tab-bar">
      <button class="ms-tab active" data-tab="content"><span class="ms-tab-icon">✎</span>Content</button>
      <button class="ms-tab" data-tab="color"><span class="ms-tab-icon">◑</span>Color</button>
      <button class="ms-tab" data-tab="font"><span class="ms-tab-icon">Aa</span>Font</button>
      <button class="ms-tab" data-tab="motion"><span class="ms-tab-icon">◈</span>Motion</button>
      <button class="ms-tab" data-tab="photo"><span class="ms-tab-icon">⊙</span>Photo</button>
    </div>
    <div class="ms-panels">

      <!-- CONTENT -->
      <div class="ms-panel active" id="ms-panel-content">
        <div class="ms-lbl">Lyric</div>
        <div id="msLyricPreview" style="font-family:'DM Serif Display',serif;font-style:italic;font-size:.88rem;line-height:1.6;color:rgba(255,255,255,.72);padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;min-height:44px"></div>
        <div class="ms-g2">
          <input class="ms-in" id="msSongIn" placeholder="Song title"/>
          <input class="ms-in" id="msArtistIn" placeholder="Artist"/>
        </div>
        <input class="ms-in" id="msEmotionIn" placeholder="Emotion tag"/>
        <div class="ms-lbl">Canvas Size</div>
        <div class="ms-cv-grid" id="msCvGrid">
          <div class="ms-cv-btn active" data-key="square"><span class="ms-cv-ratio">1:1</span><span class="ms-cv-name">Instagram</span></div>
          <div class="ms-cv-btn" data-key="story"><span class="ms-cv-ratio">9:16</span><span class="ms-cv-name">IG/FB Story</span></div>
          <div class="ms-cv-btn" data-key="fbstory"><span class="ms-cv-ratio">9:16</span><span class="ms-cv-name">FB Story</span></div>
          <div class="ms-cv-btn" data-key="twitter"><span class="ms-cv-ratio">16:9</span><span class="ms-cv-name">Twitter/X</span></div>
          <div class="ms-cv-btn" data-key="reddit"><span class="ms-cv-ratio">1:1</span><span class="ms-cv-name">Reddit/Discord</span></div>
          <div class="ms-cv-btn" data-key="linkedin"><span class="ms-cv-ratio">1.91:1</span><span class="ms-cv-name">LinkedIn</span></div>
          <div class="ms-cv-btn" data-key="whatsapp"><span class="ms-cv-ratio">1:1</span><span class="ms-cv-name">WhatsApp</span></div>
          <div class="ms-cv-btn" data-key="tiktok"><span class="ms-cv-ratio">9:16</span><span class="ms-cv-name">TikTok</span></div>
          <div class="ms-cv-btn" data-key="pinterest"><span class="ms-cv-ratio">2:3</span><span class="ms-cv-name">Pinterest</span></div>
        </div>
        <div class="ms-plat-wrap" id="msPlatTags"></div>
      </div>

      <!-- COLOR -->
      <div class="ms-panel" id="ms-panel-color">
        <div class="ms-lbl">Theme</div>
        <div class="ms-th-grid" id="msThemeGrid">
          <div class="ms-th-item active" data-theme="midnight"><div class="ms-th-sw" style="background:linear-gradient(135deg,#0B0B0D,#1a1a20)"></div><div class="ms-th-nm">Gold</div></div>
          <div class="ms-th-item" data-theme="violet"><div class="ms-th-sw" style="background:linear-gradient(135deg,#0d0014,#c77dff)"></div><div class="ms-th-nm">Violet</div></div>
          <div class="ms-th-item" data-theme="ocean"><div class="ms-th-sw" style="background:linear-gradient(135deg,#050e1a,#00e5ff)"></div><div class="ms-th-nm">Ocean</div></div>
          <div class="ms-th-item" data-theme="ember"><div class="ms-th-sw" style="background:linear-gradient(135deg,#120508,#ff6b4a)"></div><div class="ms-th-nm">Ember</div></div>
          <div class="ms-th-item" data-theme="forest"><div class="ms-th-sw" style="background:linear-gradient(135deg,#051a0d,#50fa7b)"></div><div class="ms-th-nm">Forest</div></div>
          <div class="ms-th-item" data-theme="rose"><div class="ms-th-sw" style="background:linear-gradient(135deg,#1a0d0f,#f4a4c0)"></div><div class="ms-th-nm">Rose</div></div>
          <div class="ms-th-item" data-theme="bone"><div class="ms-th-sw" style="background:linear-gradient(135deg,#f5f1e8,#d4c9b0)"></div><div class="ms-th-nm">Bone</div></div>
          <div class="ms-th-item" data-theme="mono"><div class="ms-th-sw" style="background:linear-gradient(135deg,#000,#333)"></div><div class="ms-th-nm">Mono</div></div>
          <div class="ms-th-item" data-theme="wave"><div class="ms-th-sw" style="background:linear-gradient(135deg,#ff71ce,#05ffa1)"></div><div class="ms-th-nm">Wave</div></div>
          <div class="ms-th-item" data-theme="neon"><div class="ms-th-sw" style="background:linear-gradient(135deg,#0a0a0a,#ff00ff)"></div><div class="ms-th-nm">Neon</div></div>
          <div class="ms-th-item" data-theme="chrome"><div class="ms-th-sw" style="background:linear-gradient(135deg,#000033,#0ff)"></div><div class="ms-th-nm">Chrome</div></div>
          <div class="ms-th-item" data-theme="brutal"><div class="ms-th-sw" style="background:#fff;border:1px solid #ddd"></div><div class="ms-th-nm">Brutal</div></div>
        </div>
        <div class="ms-lbl">Adjust</div>
        <div class="ms-sl-row"><span class="ms-sl-lbl">Brightness</span><input type="range" class="ms-sl" id="msBrightness" min="50" max="150" value="100"/><span class="ms-sl-val" id="msBrightnessVal">100%</span></div>
        <div class="ms-sl-row"><span class="ms-sl-lbl">Contrast</span><input type="range" class="ms-sl" id="msContrast" min="70" max="140" value="100"/><span class="ms-sl-val" id="msContrastVal">100%</span></div>
      </div>

      <!-- FONT -->
      <div class="ms-panel" id="ms-panel-font">
        <div class="ms-lbl">Typeface</div>
        <div class="ms-fn-grid" id="msFontGrid">
          <div class="ms-fn-btn active" data-fam="'Playfair Display',serif" data-sty="italic"><span class="ms-fn-pre" style="font-family:'Playfair Display',serif;font-style:italic">Say everything</span><span class="ms-fn-nm">Playfair</span></div>
          <div class="ms-fn-btn" data-fam="'Cormorant Garamond',serif" data-sty="italic"><span class="ms-fn-pre" style="font-family:'Cormorant Garamond',serif;font-style:italic">Say everything</span><span class="ms-fn-nm">Cormorant</span></div>
          <div class="ms-fn-btn" data-fam="'Lora',serif" data-sty="italic"><span class="ms-fn-pre" style="font-family:'Lora',serif;font-style:italic">Say everything</span><span class="ms-fn-nm">Lora</span></div>
          <div class="ms-fn-btn" data-fam="'Merriweather',serif" data-sty="normal"><span class="ms-fn-pre" style="font-family:'Merriweather',serif">Say everything</span><span class="ms-fn-nm">Merriweather</span></div>
          <div class="ms-fn-btn" data-fam="'Josefin Sans',sans-serif" data-sty="normal"><span class="ms-fn-pre" style="font-family:'Josefin Sans',sans-serif;letter-spacing:2px">Say everything</span><span class="ms-fn-nm">Josefin</span></div>
          <div class="ms-fn-btn" data-fam="'Bebas Neue',sans-serif" data-sty="normal"><span class="ms-fn-pre" style="font-family:'Bebas Neue',sans-serif;letter-spacing:3px;font-size:.9rem">SAY EVERYTHING</span><span class="ms-fn-nm">Bebas</span></div>
          <div class="ms-fn-btn" data-fam="'Oswald',sans-serif" data-sty="normal"><span class="ms-fn-pre" style="font-family:'Oswald',sans-serif;font-weight:600">Say everything</span><span class="ms-fn-nm">Oswald</span></div>
          <div class="ms-fn-btn" data-fam="'Dancing Script',cursive" data-sty="normal"><span class="ms-fn-pre" style="font-family:'Dancing Script',cursive">Say everything</span><span class="ms-fn-nm">Dancing</span></div>
        </div>
        <div class="ms-lbl">Text Size</div>
        <div class="ms-sl-row"><span class="ms-sl-lbl">Size</span><input type="range" class="ms-sl" id="msTextSize" min="60" max="150" value="100"/><span class="ms-sl-val" id="msTextSizeVal">100%</span></div>
      </div>

      <!-- MOTION -->
      <div class="ms-panel" id="ms-panel-motion">
        <div class="ms-lbl">Entrance Style</div>
        <div class="ms-mo-list" id="msMoList">
          <div class="ms-mo-btn active" data-mo="word"><span class="ms-mo-ico">◈</span><div><span class="ms-mo-name">Word by Word</span><span class="ms-mo-desc">Each word rises in</span></div></div>
          <div class="ms-mo-btn" data-mo="cinema"><span class="ms-mo-ico">◉</span><div><span class="ms-mo-name">Cinematic</span><span class="ms-mo-desc">Scale bloom from soft focus</span></div></div>
          <div class="ms-mo-btn" data-mo="fade"><span class="ms-mo-ico">↑</span><div><span class="ms-mo-name">Fade Up</span><span class="ms-mo-desc">Clean upward entrance</span></div></div>
          <div class="ms-mo-btn" data-mo="type"><span class="ms-mo-ico">|</span><div><span class="ms-mo-name">Typewriter</span><span class="ms-mo-desc">Types letter by letter</span></div></div>
          <div class="ms-mo-btn" data-mo="glitch"><span class="ms-mo-ico">⚡</span><div><span class="ms-mo-name">Glitch</span><span class="ms-mo-desc">Digital noise entrance</span></div></div>
          <div class="ms-mo-btn" data-mo="rise"><span class="ms-mo-ico">✦</span><div><span class="ms-mo-name">Rise</span><span class="ms-mo-desc">Characters float up</span></div></div>
          <div class="ms-mo-btn" data-mo="blur"><span class="ms-mo-ico">◌</span><div><span class="ms-mo-name">Blur Reveal</span><span class="ms-mo-desc">Sharpens from fog</span></div></div>
        </div>
        <div class="ms-lbl">Animation Speed</div>
        <div class="ms-spd-row" id="msSpdBtns">
          <button class="ms-sp-btn" data-spd="2.2">Slow</button>
          <button class="ms-sp-btn active" data-spd="1">Normal</button>
          <button class="ms-sp-btn" data-spd="0.6">Fast</button>
          <button class="ms-sp-btn" data-spd="0.35">Rapid</button>
        </div>
        <div class="ms-lbl">Custom Speed</div>
        <div class="ms-sl-row"><span class="ms-sl-lbl">Duration</span><input type="range" class="ms-sl" id="msCustomSpd" min="0.2" max="3.5" step="0.1" value="1"/><span class="ms-sl-val" id="msCustomSpdVal">1.0×</span></div>
        <div class="ms-lbl">Logo Pulse</div>
        <div class="ms-sl-row"><span class="ms-sl-lbl">Speed</span><input type="range" class="ms-sl" id="msPulseSpd" min="1" max="7" step="0.1" value="3.4"/><span class="ms-sl-val" id="msPulseSpdVal">3.4s</span></div>
      </div>

      <!-- PHOTO -->
      <div class="ms-panel" id="ms-panel-photo">
        <div class="ms-lbl">Background Image</div>
        <div class="ms-ph-drop" id="msPhDrop">
          <div class="ms-ph-ico">⊙</div>
          <div class="ms-ph-txt" id="msPhTxt">Tap to add a photo</div>
          <div class="ms-ph-sub">JPG · PNG · WEBP</div>
        </div>
        <input type="file" id="msPhFile" accept="image/*" style="display:none"/>
        <div class="ms-ph-ctrl hidden" id="msPhCtrl">
          <div class="ms-sl-row"><span class="ms-sl-lbl">Blur</span><input type="range" class="ms-sl" id="msPhBlur" min="0" max="20" value="0"/><span class="ms-sl-val" id="msBlurVal">0px</span></div>
          <div class="ms-sl-row"><span class="ms-sl-lbl">Dim</span><input type="range" class="ms-sl" id="msPhDim" min="0" max="95" value="50"/><span class="ms-sl-val" id="msDimVal">50%</span></div>
          <div class="ms-lbl">Filter</div>
          <div class="ms-fi-row" id="msFiRow">
            <button class="ms-fi-btn active" data-fi="none">None</button>
            <button class="ms-fi-btn" data-fi="warm">Warm</button>
            <button class="ms-fi-btn" data-fi="cool">Cool</button>
            <button class="ms-fi-btn" data-fi="drama">Drama</button>
            <button class="ms-fi-btn" data-fi="vintage">Vintage</button>
          </div>
          <button class="ms-rm-ph" id="msRmPh">Remove photo</button>
        </div>
      </div>

    </div>
  </aside>
</div>

<!-- EXPORT MODAL -->
<div class="ms-export-modal" id="msExportModal">
  <div class="ms-em-box">
    <div class="ms-em-h">Export Your Poster</div>
    <div class="ms-em-sub">Choose format · <span id="msEmSize">1080 × 1080</span></div>
    <div class="ms-ef-list">
      <div class="ms-ef rec" onclick="msDoExport('video')">
        <span class="ms-ef-ico">🎬</span>
        <div class="ms-ef-body">
          <div class="ms-ef-name">Animated Video (WebM)</div>
          <div class="ms-ef-desc">Ripple rings + motion text baked in · ~500KB–2MB · plays everywhere</div>
        </div>
        <span class="ms-ef-badge ms-b-rec">Best</span>
      </div>
      <div class="ms-ef" onclick="msDoExport('png')">
        <span class="ms-ef-ico">🖼</span>
        <div class="ms-ef-body">
          <div class="ms-ef-name">Static PNG</div>
          <div class="ms-ef-desc">Full-res still · all platforms · print · press kit · lightest file</div>
        </div>
        <span class="ms-ef-badge ms-b-sm">Tiny</span>
      </div>
    </div>
    <div class="ms-lbl" style="margin-bottom:8px">Works on</div>
    <div class="ms-pl-list">
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Instagram</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Instagram Story</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Facebook</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Facebook Story</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>TikTok</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>LinkedIn</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Twitter / X</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>YouTube Shorts</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>WhatsApp</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>WhatsApp Status</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Discord</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Reddit</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Pinterest</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Snapchat</div>
      <div class="ms-pl-tag"><div class="ms-pl-dot"></div>Telegram</div>
    </div>
    <button class="ms-em-cancel" onclick="msCloseExport()">Cancel</button>
  </div>
</div>
`;
}

/* ────────────────────────────────────────────────────────────────
   INIT  — called once on DOMContentLoaded
──────────────────────────────────────────────────────────────── */
function initStudio() {
  injectCSS();
  const btn = document.getElementById('sharePosterBtn');
  if (btn) btn.onclick = openStudio;
}

/* ────────────────────────────────────────────────────────────────
   OPEN STUDIO
──────────────────────────────────────────────────────────────── */
function openStudio() {
  // Close postcard if open
  const pm = document.getElementById('postcardModal');
  if (pm && typeof closeModal === 'function') closeModal(pm);

  // Pull data from currentPost
  const cp = (typeof currentPost !== 'undefined') ? currentPost : null;
  S.lyric   = cp?.text    || '';
  S.song    = cp?.knowledge?.song   || '';
  S.artist  = cp?.knowledge?.artist || '';
  S.emotion = cp?.emotion || '';
  S.theme   = EMOTION_THEME_MAP[S.emotion] || 'midnight';

  // Reset style state
  S.font={ fam:"'Playfair Display',serif", sty:'italic' };
  S.motion='word'; S.spd=1; S.textScale=1; S.pulse=3.4;
  S.photo=null; S.blur=0; S.dim=50; S.filter='none';
  S.brightness=100; S.contrast=100;
  S.canvas={ ...STU_SIZES.square };
  S.looping=false;
  _photoImg=null;

  // Build fresh HTML
  buildStudioHTML();

  // Populate content
  const lp = document.getElementById('msLyricPreview');
  if (lp) lp.textContent = S.lyric;
  $v('msSongIn',   S.song);
  $v('msArtistIn', S.artist);
  $v('msEmotionIn',S.emotion);

  // Set poster text
  $t('msPSong',   S.song);
  $t('msPArtist', S.artist.toUpperCase());
  $t('msPEmotion',S.emotion ? '✦ '+S.emotion.toUpperCase() : '');

  // Apply theme
  const poster = document.getElementById('msPoster');
  poster.classList.remove(...[...poster.classList].filter(c=>c.startsWith('ms-t-')));
  poster.classList.add('ms-t-'+S.theme);
  // activate correct theme swatch
  document.querySelectorAll('.ms-th-item').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === S.theme);
  });

  bindEvents();
  updatePlatTags();

  document.getElementById('studioOverlay').classList.remove('hidden');
  document.body.classList.add('modal-open');

  setTimeout(() => {
    sizeCanvas();
    setSpeed(1);
    buildLyricHTML();
    setTimeout(play, 400);
  }, 60);

  // YouTube thumbnail
  if (cp?.youtubeMeta?.thumbnail) setTimeout(() => injectYtOption(cp.youtubeMeta), 120);
}

/* ────────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────── */
function $(id){ return document.getElementById(id); }
function $v(id, val){ const el=$(id); if(el) el.value=val; }
function $t(id, txt){ const el=$(id); if(el) el.textContent=txt; }

/* ────────────────────────────────────────────────────────────────
   SIZE CANVAS
──────────────────────────────────────────────────────────────── */
function sizeCanvas() {
  const stage = $('msStage');
  if (!stage) return;
  const r  = stage.getBoundingClientRect();
  const sw = r.width-56, sh = r.height-56;
  const {w,h} = S.canvas;
  const ratio = w/h;
  let pw,ph;
  if (sw/sh > ratio) { ph=Math.min(sh,570); pw=ph*ratio; }
  else               { pw=Math.min(sw,520); ph=pw/ratio; }

  const cw = $('msCanvasWrap');
  if (!cw) return;
  cw.style.width=pw+'px'; cw.style.height=ph+'px';

  const ls  = Math.max(pw*.11, 34);
  const bls = Math.max(pw*.038, 11);
  const logoSvg  = $('msPLogoSvg');
  const brandSvg = $('msPBrandSvg');
  if (logoSvg)  { logoSvg.style.width=ls+'px';  logoSvg.style.height=ls+'px'; }
  if (brandSvg) { brandSvg.style.width=bls+'px';brandSvg.style.height=bls+'px'; }
  ['msPr1','msPr2','msPr3'].forEach(id => {
    const el=$(id); if(el){el.style.width=ls+'px';el.style.height=ls+'px';}
  });

  const fs = Math.max(pw*.053*(S.textScale||1), 12);
  const sl = $('msPLyric'), ss=$('msPSong'), sa=$('msPArtist'), sb=$('msPBrand');
  const sbw = sb?.querySelector('.ms-p-brand-word'), sem=$('msPEmotion');
  if(sl)  sl.style.fontSize  = fs+'px';
  if(ss)  ss.style.fontSize  = Math.max(pw*.028,8)+'px';
  if(sa)  sa.style.fontSize  = Math.max(pw*.020,7)+'px';
  if(sbw) sbw.style.fontSize = Math.max(pw*.017,6)+'px';
  if(sem) sem.style.fontSize = Math.max(pw*.015,5)+'px';

  const gap = Math.max(pw*.034, 9);
  const pLogo=$('msPLogo'), pWave=$('msPWave'), pDiv=document.querySelector('.ms-p-div');
  if(pLogo) pLogo.style.marginBottom=gap+'px';
  if(pWave) pWave.style.marginBottom=gap*.7+'px';
  if(sl)    sl.style.marginBottom=gap+'px';
  if(pDiv)  pDiv.style.marginBottom=gap*.65+'px';
  if(ss)    ss.style.marginBottom=gap*.18+'px';
  if(sb)    sb.style.padding=`${pw*.04}px ${pw*.07}px`;

  $t('msSzInfo', `${S.canvas.w} × ${S.canvas.h}`);
}

/* ────────────────────────────────────────────────────────────────
   PLATFORM TAGS
──────────────────────────────────────────────────────────────── */
function updatePlatTags() {
  const el = $('msPlatTags');
  if (!el || !S.canvas.plat) return;
  el.innerHTML = S.canvas.plat.split(',').map(p=>`<span class="ms-plat-tag">✓ ${p.trim()}</span>`).join('');
}

/* ────────────────────────────────────────────────────────────────
   PLAY
──────────────────────────────────────────────────────────────── */
function play() {
  const p=$('msPoster'); if(!p) return;
  p.classList.remove('ms-playing');
  void p.offsetWidth; // force reflow — critical
  p.classList.add('ms-playing');
  if (S.looping) {
    clearTimeout(_loopTimer);
    _loopTimer = setTimeout(play, (2.2*S.spd+1)*1000);
  }
}

/* ────────────────────────────────────────────────────────────────
   SET SPEED — inject real ms values (CSS calc is unreliable here)
──────────────────────────────────────────────────────────────── */
function setSpeed(spd) {
  S.spd = spd;
  const old=$('ms-spd-style'); if(old) old.remove();
  const s=spd;
  const logo  =+(0.60*s).toFixed(3), word=+(0.45*s).toFixed(3), meta=+(0.50*s).toFixed(3);
  const d0=+(0.10*s).toFixed(3), d1=+(0.90*s).toFixed(3), d2=+(1.30*s).toFixed(3);
  const d3=+(1.50*s).toFixed(3), d4=+(1.70*s).toFixed(3), d5=+(2.00*s).toFixed(3);
  const d03=+(0.30*s).toFixed(3), typeW=+(2.60*s).toFixed(3), cinW=+(1.20*s).toFixed(3);
  const fadeW=+(0.80*s).toFixed(3), blurW=+(1.00*s).toFixed(3);
  const glW=+(0.50*s).toFixed(3), glSh=+(0.15*s).toFixed(3), glShD=+(0.80*s).toFixed(3);

  const st=document.createElement('style'); st.id='ms-spd-style';
  st.textContent=`
    .ms-playing .ms-p-logo  {animation:msLogoIn  ${logo}s  cubic-bezier(.34,1.2,.64,1) ${d0}s  both!important}
    .ms-playing .ms-p-wave  {animation:msSlideUp ${meta}s  ease                        ${d1}s  both!important}
    .ms-playing .ms-p-div   {animation:msSlideUp ${meta}s  ease                        ${d2}s  both!important}
    .ms-playing .ms-p-song  {animation:msSlideUp ${meta}s  ease                        ${d3}s  both!important}
    .ms-playing .ms-p-artist{animation:msSlideUp ${meta}s  ease                        ${d4}s  both!important}
    .ms-playing .ms-p-brand {animation:msSlideUp ${meta}s  ease                        ${d5}s  both!important}
    .ms-playing.ms-anim-fade   .ms-p-lyric{animation:msLyricUp ${fadeW}s cubic-bezier(.34,1.2,.64,1) ${d03}s both!important}
    .ms-playing.ms-anim-cinema .ms-p-lyric{animation:msCinIn   ${cinW}s  cubic-bezier(.16,1,.3,1)    ${d03}s both!important}
    .ms-playing.ms-anim-blur   .ms-p-lyric{animation:msBlurIn  ${blurW}s cubic-bezier(.16,1,.3,1)    ${d03}s both!important}
    .ms-playing.ms-anim-glitch .ms-p-lyric{animation:msGlIn    ${glW}s   ease ${d03}s both,msGlShk ${glSh}s ease ${glShD}s!important}
    .ms-playing.ms-anim-type   .ms-p-lyric{animation:msTypeW   ${typeW}s steps(40,end) ${d03}s forwards,msBlinkC .75s step-end infinite!important}
    .ms-playing.ms-anim-word   .ms-word   {animation:msWordUp  ${word}s  cubic-bezier(.34,1.2,.64,1) both!important}
    .ms-playing.ms-anim-rise   .ms-p-lyric span.ms-ch{animation:msRiseUp ${word}s cubic-bezier(.34,1.5,.64,1) both!important}
  `;
  document.head.appendChild(st);
  buildLyricHTML();
}

/* ────────────────────────────────────────────────────────────────
   BUILD LYRIC SPANS
──────────────────────────────────────────────────────────────── */
function buildLyricHTML() {
  const el=$('msPLyric'); if(!el) return;
  const mo=S.motion, spd=S.spd, lyric=S.lyric||'';
  if (mo==='word') {
    el.innerHTML = lyric.split(' ').map((w,i)=>
      `<span class="ms-word" style="animation-delay:${(0.28+i*0.13)*spd}s;animation-duration:${0.45*spd}s">${w}</span>`
    ).join(' ');
  } else if (mo==='rise') {
    el.innerHTML = lyric.split('').map((c,i)=>
      c===' ' ? ' ' : `<span class="ms-ch" style="animation-delay:${(0.28+i*0.05)*spd}s;animation-duration:${0.45*spd}s">${c}</span>`
    ).join('');
  } else {
    el.textContent = lyric;
  }
  el.style.fontFamily = S.font.fam;
  el.style.fontStyle  = S.font.sty;
}

/* ────────────────────────────────────────────────────────────────
   BIND EVENTS
──────────────────────────────────────────────────────────────── */
function bindEvents() {
  // Back
  $('msBack').onclick = () => {
    clearTimeout(_loopTimer);
    $('studioOverlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
    const pm=$('postcardModal');
    if (pm && typeof openModal==='function') openModal(pm);
  };

  // Replay
  $('msReplay').onclick      = ()=>{ play(); toast('▶ Preview'); };
  $('msReplayStage').onclick = ()=>{ play(); toast('▶ Replay'); };

  // Loop
  $('msLoopBtn').onclick = function(){
    S.looping=!S.looping; this.classList.toggle('active',S.looping);
    if(S.looping){play();toast('⟳ Loop on');}
    else{clearTimeout(_loopTimer);toast('⟳ Loop off');}
  };

  // Export open
  $('msExportBtn').onclick = ()=>{
    $t('msEmSize',`${S.canvas.w} × ${S.canvas.h}`);
    $('msExportModal').classList.add('open');
  };

  // Tabs
  document.querySelector('.ms-tab-bar').addEventListener('click', e=>{
    const tab=e.target.closest('.ms-tab'); if(!tab) return;
    document.querySelectorAll('.ms-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.ms-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    const panel=$('ms-panel-'+tab.dataset.tab);
    if(panel) panel.classList.add('active');
  });

  // Canvas sizes
  $('msCvGrid').addEventListener('click', e=>{
    const btn=e.target.closest('.ms-cv-btn'); if(!btn) return;
    document.querySelectorAll('.ms-cv-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    S.canvas={...STU_SIZES[btn.dataset.key]};
    updatePlatTags(); sizeCanvas(); setTimeout(play,200);
    toast(btn.querySelector('.ms-cv-name').textContent);
  });

  // Theme
  $('msThemeGrid').addEventListener('click', e=>{
    const item=e.target.closest('.ms-th-item'); if(!item) return;
    document.querySelectorAll('.ms-th-item').forEach(x=>x.classList.remove('active'));
    item.classList.add('active');
    S.theme=item.dataset.theme;
    const p=$('msPoster');
    p.classList.remove(...[...p.classList].filter(c=>c.startsWith('ms-t-')));
    p.classList.add('ms-t-'+S.theme);
    setTimeout(play,80); toast('Theme: '+item.querySelector('.ms-th-nm').textContent);
  });

  // Brightness
  $('msBrightness').addEventListener('input',function(){
    S.brightness=+this.value; $t('msBrightnessVal',this.value+'%'); applyAdjust();
  });
  $('msContrast').addEventListener('input',function(){
    S.contrast=+this.value; $t('msContrastVal',this.value+'%'); applyAdjust();
  });

  // Font
  $('msFontGrid').addEventListener('click', e=>{
    const btn=e.target.closest('.ms-fn-btn'); if(!btn) return;
    document.querySelectorAll('.ms-fn-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    S.font={fam:btn.dataset.fam, sty:btn.dataset.sty};
    buildLyricHTML(); setTimeout(play,80);
    toast('Font: '+btn.querySelector('.ms-fn-nm').textContent);
  });
  $('msTextSize').addEventListener('input',function(){
    S.textScale=+this.value/100; $t('msTextSizeVal',this.value+'%'); sizeCanvas();
  });

  // Motion style
  $('msMoList').addEventListener('click', e=>{
    const btn=e.target.closest('.ms-mo-btn'); if(!btn) return;
    document.querySelectorAll('.ms-mo-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    S.motion=btn.dataset.mo;
    const p=$('msPoster');
    p.classList.remove(...[...p.classList].filter(c=>c.startsWith('ms-anim-')));
    p.classList.add('ms-anim-'+S.motion);
    buildLyricHTML(); setTimeout(play,80);
    toast('Motion: '+btn.querySelector('.ms-mo-name').textContent);
  });

  // Speed presets
  $('msSpdBtns').addEventListener('click', e=>{
    const btn=e.target.closest('.ms-sp-btn'); if(!btn) return;
    document.querySelectorAll('.ms-sp-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    const spd=parseFloat(btn.dataset.spd);
    $('msCustomSpd').value=spd; $t('msCustomSpdVal',spd.toFixed(1)+'×');
    setSpeed(spd); setTimeout(play,80); toast('Speed: '+btn.textContent);
  });

  // Custom speed
  $('msCustomSpd').addEventListener('input',function(){
    const spd=parseFloat(this.value);
    $t('msCustomSpdVal',spd.toFixed(1)+'×');
    document.querySelectorAll('.ms-sp-btn').forEach(x=>x.classList.remove('active'));
    setSpeed(spd); clearTimeout(window._msSpd);
    window._msSpd=setTimeout(play,300);
  });

  // Pulse speed
  $('msPulseSpd').addEventListener('input',function(){
    S.pulse=parseFloat(this.value); $t('msPulseSpdVal',this.value+'s');
    document.documentElement.style.setProperty('--ms-pulse',this.value+'s');
  });

  // Content inputs
  $('msSongIn').addEventListener('input',function(){ S.song=this.value; $t('msPSong',this.value); });
  $('msArtistIn').addEventListener('input',function(){ S.artist=this.value; $t('msPArtist',this.value.toUpperCase()); });
  $('msEmotionIn').addEventListener('input',function(){ S.emotion=this.value; $t('msPEmotion',this.value?'✦ '+this.value.toUpperCase():''); });

  // Photo upload
  $('msPhDrop').addEventListener('click',()=>$('msPhFile').click());
  $('msPhFile').addEventListener('change',function(e){
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      S.photo=ev.target.result;
      const ph=$('msPPhoto'); ph.style.backgroundImage=`url(${S.photo})`; ph.style.display='block';
      $t('msPhTxt','✓ Photo added'); $('msPhDrop').classList.add('has-photo');
      $('msPhCtrl').classList.remove('hidden');
      const img=new Image(); img.src=S.photo; _photoImg=img;
      applyPhotoStyles(); toast('✓ Photo added');
    };
    reader.readAsDataURL(file);
  });
  $('msPhBlur').addEventListener('input',function(){ S.blur=+this.value; $t('msBlurVal',this.value+'px'); applyPhotoStyles(); });
  $('msPhDim').addEventListener('input',function(){ S.dim=+this.value; $t('msDimVal',this.value+'%'); applyPhotoStyles(); });
  $('msFiRow').addEventListener('click',e=>{
    const btn=e.target.closest('.ms-fi-btn'); if(!btn) return;
    document.querySelectorAll('.ms-fi-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active'); S.filter=btn.dataset.fi;
    applyPhotoStyles(); toast('Filter: '+btn.textContent);
  });
  $('msRmPh').addEventListener('click',()=>{
    S.photo=null; _photoImg=null;
    $('msPPhoto').style.backgroundImage=''; $('msPPhoto').style.display='none';
    $t('msPhTxt','Tap to add a photo'); $('msPhDrop').classList.remove('has-photo');
    $('msPhCtrl').classList.add('hidden'); toast('Photo removed');
  });

  // Drag and drop on photo panel
  const drop=$('msPhDrop');
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('has-photo');});
  drop.addEventListener('dragleave',e=>{ if(!drop.contains(e.relatedTarget)) drop.classList.remove('has-photo'); });
  drop.addEventListener('drop',e=>{
    e.preventDefault();
    if(e.dataTransfer.files[0]){
      try{
        const dt=new DataTransfer(); dt.items.add(e.dataTransfer.files[0]);
        $('msPhFile').files=dt.files; $('msPhFile').dispatchEvent(new Event('change'));
      } catch(ex){ /* Safari fallback */ }
    }
  });

  window.addEventListener('resize', sizeCanvas);
}

/* ────────────────────────────────────────────────────────────────
   PHOTO + ADJUST
──────────────────────────────────────────────────────────────── */
function applyPhotoStyles() {
  const ph=$('msPPhoto'); if(!ph||!S.photo) return;
  const filters={none:'',warm:'sepia(.3) saturate(1.3) hue-rotate(-10deg)',cool:'saturate(.8) hue-rotate(20deg) brightness(1.05)',drama:'contrast(1.3) saturate(.8) brightness(.85)',vintage:'sepia(.5) contrast(.9) brightness(.9) saturate(.8)'};
  ph.style.filter=`blur(${S.blur}px) ${filters[S.filter]||''}`;
  ph.style.opacity=1-S.dim/100;
}
function applyAdjust() {
  const p=$('msPoster');
  if(p) p.style.filter=`brightness(${S.brightness/100}) contrast(${S.contrast/100})`;
}

/* ────────────────────────────────────────────────────────────────
   YOUTUBE THUMBNAIL
──────────────────────────────────────────────────────────────── */
function injectYtOption(meta) {
  const panel=$('ms-panel-photo'); if(!panel) return;
  $('msYtOpt')?.remove();
  const opt=document.createElement('div');
  opt.id='msYtOpt';
  opt.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,80,80,.3);background:rgba(255,0,0,.05);cursor:pointer;margin-bottom:8px;';
  opt.innerHTML=`<img src="${meta.thumbnail}" style="width:48px;height:36px;object-fit:cover;border-radius:5px;" onerror="this.parentElement.style.display='none'"/>
    <div><div style="font-family:'Space Mono',monospace;font-size:.4rem;font-weight:700;color:rgba(255,80,80,.8);text-transform:uppercase;letter-spacing:1px;">▶ Use Video Thumbnail</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:.72rem;color:rgba(255,255,255,.45);margin-top:2px;">${meta.title||meta.channel||''}</div></div>`;
  const tryLoad=src=>new Promise((res,rej)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>res(img);img.onerror=()=>rej();img.src=src;});
  const apply=img=>{
    _photoImg=img; S.photo=img.src;
    $('msPPhoto').style.backgroundImage=`url(${img.src})`; $('msPPhoto').style.display='block';
    $t('msPhTxt','YouTube thumbnail'); $('msPhDrop').classList.add('has-photo');
    $('msPhCtrl').classList.remove('hidden');
    opt.style.borderColor='rgba(255,0,0,.55)'; opt.style.background='rgba(255,0,0,.15)';
    applyPhotoStyles(); toast('Thumbnail set ✓');
  };
  opt.onclick=()=>tryLoad(meta.thumbnail).then(apply).catch(()=>fetch(meta.thumbnail).then(r=>r.blob()).then(b=>tryLoad(URL.createObjectURL(b))).then(apply).catch(()=>toast('Could not load thumbnail')));
  panel.insertBefore(opt, panel.firstChild);
}

/* ────────────────────────────────────────────────────────────────
   EXPORT
──────────────────────────────────────────────────────────────── */
function msCloseExport(){ $('msExportModal').classList.remove('open'); }
function msDoExport(type){ msCloseExport(); type==='png' ? exportPNG() : exportVideo(); }

function exportPNG() {
  toast('⏳ Preparing PNG…');
  const {w,h}=S.canvas;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  document.fonts.ready.then(()=>{
    drawFrame(ctx,w,h,1,4000);
    c.toBlob(blob=>{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download=`margo-${S.theme}-${w}x${h}.png`; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      toast(`✓ PNG saved · ${w}×${h}`);
    },'image/png');
  });
}

function exportVideo() {
  const {w,h}=S.canvas;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  let stream,recorder;
  try {
    stream=c.captureStream(30);
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4_500_000});
  } catch(e){ toast('⚠ Use Chrome/Edge for video export'); return; }

  toast('🎬 Recording animation…');
  const chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{
    const blob=new Blob(chunks,{type:'video/webm'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`margo-motion-${w}x${h}-${Date.now()}.webm`; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast(`✓ Video saved · ${w}×${h}`);
  };

  const dur=Math.max(4000,4000*S.spd);
  const start=performance.now();
  recorder.start();
  document.fonts.ready.then(()=>{
    function frame(now){
      const t=Math.min((now-start)/dur,1);
      drawFrame(ctx,w,h,t,now-start);
      if(t<1) requestAnimationFrame(frame); else recorder.stop();
    }
    requestAnimationFrame(frame);
  });
}

/* ────────────────────────────────────────────────────────────────
   DRAW FRAME  — canvas renderer for PNG + video export
   t  = 0→1 normalised time
   ms = elapsed milliseconds (for ripple phase)
──────────────────────────────────────────────────────────────── */
function drawFrame(ctx, w, h, t, ms) {
  const td=STU_THEMES[S.theme]||STU_THEMES.midnight;
  const isDark=!td.light, gold='#E8C547', black='#0B0B0D';
  const textCol=td.textCol;

  // Background
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,td.bg0); g.addColorStop(.5,td.bg1); g.addColorStop(1,td.bg2);
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  // Photo layer
  if (S.photo && _photoImg && _photoImg.complete) {
    ctx.save();
    ctx.globalAlpha=1-S.dim/100;
    if(S.blur>0) ctx.filter=`blur(${S.blur*(w/1080)}px)`;
    const img=_photoImg, ir=img.naturalWidth/img.naturalHeight, cr=w/h;
    let sx=0,sy=0,sw2=img.naturalWidth,sh2=img.naturalHeight;
    if(ir>cr){sw2=img.naturalHeight*cr;sx=(img.naturalWidth-sw2)/2;}
    else{sh2=img.naturalWidth/cr;sy=(img.naturalHeight-sh2)/2;}
    ctx.drawImage(img,sx,sy,sw2,sh2,0,0,w,h);
    ctx.filter='none'; ctx.restore();
    ctx.save(); ctx.fillStyle=`rgba(0,0,0,${S.dim/100})`; ctx.fillRect(0,0,w,h); ctx.restore();
  }

  // Ambient glow
  const ag=ctx.createRadialGradient(w/2,h,0,w/2,h,w*.7);
  ag.addColorStop(0,isDark?'rgba(232,197,71,.06)':'rgba(184,144,26,.04)');
  ag.addColorStop(1,'transparent');
  ctx.fillStyle=ag; ctx.fillRect(0,0,w,h);

  // Shimmer top line
  if(isDark){
    const sg=ctx.createLinearGradient(0,0,w,0);
    sg.addColorStop(0,'transparent'); sg.addColorStop(.5,'rgba(232,197,71,.5)'); sg.addColorStop(1,'transparent');
    ctx.fillStyle=sg; ctx.fillRect(0,0,w,1);
  }

  // ── LOGO ──
  const logoY=h*.27, ls=w*.12, cx=w/2;

  // Ripple rings
  const pDur=S.pulse;
  for(let i=0;i<3;i++){
    const delay=i*(pDur/3);
    const rt=((ms/1000-delay)%pDur)/pDur;
    if(rt>0){
      const sc=.5+rt*3.5, op=Math.max(0,1-rt)*.7;
      ctx.save(); ctx.beginPath(); ctx.arc(cx,logoY,ls/2*sc,0,Math.PI*2);
      ctx.strokeStyle=`rgba(232,197,71,${op})`; ctx.lineWidth=Math.max(w*.002,1); ctx.stroke(); ctx.restore();
    }
  }

  // Logo circle (breathing glow)
  const gp=.5+Math.sin(ms/1700)*.5;
  ctx.save(); ctx.shadowColor=gold; ctx.shadowBlur=12+gp*16;
  ctx.beginPath(); ctx.arc(cx,logoY,ls/2,0,Math.PI*2);
  ctx.fillStyle=isDark?gold:td.accent; ctx.fill(); ctx.restore();

  // M path
  const lx=cx-ls*.3, ly=logoY-ls*.34, lw=ls*.6, lh=ls*.65;
  ctx.save(); ctx.strokeStyle=isDark?black:'#ffffff';
  ctx.lineWidth=Math.max(ls*.09,2); ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(lx,ly+lh); ctx.lineTo(lx,ly);
  ctx.lineTo(lx+lw*.28,ly+lh*.42); ctx.lineTo(cx,ly+lh*.02);
  ctx.lineTo(lx+lw*.72,ly+lh*.42); ctx.lineTo(lx+lw,ly); ctx.lineTo(lx+lw,ly+lh);
  ctx.stroke(); ctx.restore();

  // ── WAVEFORM ──
  if(t>0.22){
    const wo=Math.min((t-.22)/.15,1);
    const bars=[.33,.58,.83,.67,1,.67,.83];
    const bw=Math.max(w*.005,2), bg2=Math.max(w*.007,2), maxH=h*.04;
    const totalBW=bars.length*(bw+bg2);
    let bx=cx-totalBW/2;
    const wy=logoY+ls*.82;
    ctx.save(); ctx.globalAlpha=wo*.6; ctx.fillStyle=td.accent;
    bars.forEach((hf,i)=>{
      const pulse=Math.sin(ms/400+i*.7)*.3+.7;
      const bh=maxH*hf*pulse;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(bx,wy-bh/2,bw,bh,bw/2);
      else ctx.rect(bx,wy-bh/2,bw,bh);
      ctx.fill(); bx+=bw+bg2;
    });
    ctx.restore();
  }

  // ── LYRIC ──
  const baseFS=w*.053*(S.textScale||1);
  const lyricY=h*.54, maxW=w*.78, lineH=baseFS*1.5;
  const fam=(S.font&&S.font.fam)||"'Playfair Display',serif";
  const italic=(S.font&&S.font.sty)==='italic';
  ctx.save();
  ctx.font=`${italic?'italic ':''}${baseFS}px ${fam.replace(/'/g,'')}`;
  ctx.textAlign='center'; ctx.textBaseline='middle';

  // Word wrap
  const words=S.lyric.split(' ');
  let lines=[],cur='';
  words.forEach(word=>{
    const test=cur?cur+' '+word:word;
    if(ctx.measureText(test).width>maxW){lines.push(cur);cur=word;}
    else cur=test;
  });
  if(cur) lines.push(cur);
  const totalLH=(lines.length-1)*lineH, startY=lyricY-totalLH/2;
  const lyricT=t/S.spd;

  if(['cinema','fade','blur'].includes(S.motion)){
    const lt=Math.max(0,Math.min((lyricT-.3)/.25,1));
    const blur=S.motion==='blur'?(1-lt)*20:S.motion==='cinema'?(1-lt)*8:0;
    if(blur>0) ctx.filter=`blur(${blur}px)`;
    ctx.globalAlpha=lt;
    const sc=S.motion==='cinema'?.96+lt*.04:1;
    lines.forEach((line,i)=>{ctx.save();ctx.translate(cx,startY+i*lineH);ctx.scale(sc,sc);ctx.fillStyle=textCol;ctx.fillText(line,0,0);ctx.restore();});
    ctx.filter='none';
  } else if(S.motion==='glitch'){
    const lt=Math.max(0,Math.min((lyricT-.3)/.2,1));
    if(lt<.85){
      [['rgba(0,255,255,.4)',-1],['rgba(255,0,255,.4)',1]].forEach(([col,dx])=>{
        ctx.save();ctx.globalAlpha=lt*.55;ctx.fillStyle=col;
        lines.forEach((line,i)=>ctx.fillText(line,cx+dx*(1-lt)*5,startY+i*lineH));
        ctx.restore();
      });
    }
    ctx.globalAlpha=lt; ctx.fillStyle=textCol;
    lines.forEach((line,i)=>ctx.fillText(line,cx,startY+i*lineH));
  } else if(S.motion==='type'){
    const lt=Math.max(0,Math.min((lyricT-.3)/(.7*S.spd),1));
    const shown=Math.floor(lt*S.lyric.length);
    const disp=S.lyric.substring(0,shown);
    const tl=[]; let tc='';
    disp.split(' ').forEach(w2=>{ const test=tc?tc+' '+w2:w2; if(ctx.measureText(test).width>maxW){tl.push(tc);tc=w2;}else tc=test; });
    tl.push(tc);
    const ttlH=(tl.length-1)*lineH;
    ctx.globalAlpha=1; ctx.fillStyle=textCol;
    tl.forEach((line,i)=>ctx.fillText(line,cx,lyricY-ttlH/2+i*lineH));
    if(lt<1 && Math.floor(t*8)%2===0){
      const ll=tl[tl.length-1]||'';
      const lw2=ctx.measureText(ll).width;
      ctx.save(); ctx.fillStyle=gold; ctx.globalAlpha=.9;
      ctx.fillRect(cx+lw2/2+4,lyricY-ttlH/2+(tl.length-1)*lineH-baseFS*.5,Math.max(2,3*(w/1080)),baseFS*.9);
      ctx.restore();
    }
  } else {
    // word-by-word (default) and rise both use word-level timing
    let wi=0;
    lines.forEach((line,li)=>{
      const lineW=ctx.measureText(line).width;
      let lxw=cx-lineW/2;
      line.split(' ').forEach((word,wi2)=>{
        const wDelay=(0.28+wi*0.13)*S.spd;
        const wt=Math.max(0,Math.min((t-wDelay)/(0.45*S.spd*.8),1));
        if(wt>0){
          const wy2=startY+li*lineH+(1-wt)*14;
          ctx.globalAlpha=wt; ctx.fillStyle=textCol;
          const ww=ctx.measureText(word).width;
          ctx.fillText(word,lxw+ww/2,wy2);
        }
        lxw+=ctx.measureText(word+(wi2<line.split(' ').length-1?' ':'')).width;
        wi++;
      });
    });
  }
  ctx.restore();

  // ── SONG & ARTIST ──
  const mDelay=1.5*S.spd;
  if(t>mDelay/4.5){
    const mt=Math.min((t-mDelay/4.5)/.15,1);
    const metaY=lyricY+totalLH/2+baseFS*.85;
    ctx.save(); ctx.globalAlpha=mt*.42; ctx.strokeStyle=isDark?gold:'rgba(184,144,26,.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-w*.02,metaY-baseFS*.28); ctx.lineTo(cx+w*.02,metaY-baseFS*.28); ctx.stroke(); ctx.restore();
    if(S.song){
      ctx.save(); ctx.globalAlpha=mt*.88;
      ctx.font=`600 ${baseFS*.5}px DM Sans,Arial,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=textCol;
      ctx.fillText(S.song.substring(0,36),cx,metaY); ctx.restore();
    }
    if(S.artist){
      ctx.save(); ctx.globalAlpha=mt*.48;
      ctx.font=`700 ${baseFS*.36}px Space Mono,monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=textCol;
      ctx.fillText(S.artist.toUpperCase().substring(0,40),cx,metaY+baseFS*.52); ctx.restore();
    }
  }

  // ── BRAND FOOTER ──
  const bDelay=2.0*S.spd;
  if(t>bDelay/4.5){
    const bt=Math.min((t-bDelay/4.5)/.15,1);
    const fy=h*.9, bls2=w*.038;
    ctx.save(); ctx.globalAlpha=bt;
    ctx.beginPath(); ctx.arc(w*.09,fy,bls2/2,0,Math.PI*2);
    ctx.fillStyle=isDark?gold:td.accent; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha=bt;
    ctx.font=`800 ${w*.017}px Syne,Arial,sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle=isDark?gold:td.accent; ctx.fillText('MARGO',w*.115,fy); ctx.restore();
    if(S.emotion){
      ctx.save(); ctx.globalAlpha=bt*.85;
      ctx.font=`700 ${w*.015}px Space Mono,monospace`;
      ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillStyle=isDark?gold:td.accent;
      ctx.fillText('✦ '+S.emotion.toUpperCase(),w*.91,fy); ctx.restore();
    }
  }
}

/* ────────────────────────────────────────────────────────────────
   TOAST
──────────────────────────────────────────────────────────────── */
function toast(msg){ if(typeof showToast==='function') showToast(msg); }

/* ────────────────────────────────────────────────────────────────
   GLOBAL EXPORTS  (onclick="..." in injected HTML uses these)
──────────────────────────────────────────────────────────────── */
window.msDoExport    = msDoExport;
window.msCloseExport = msCloseExport;
