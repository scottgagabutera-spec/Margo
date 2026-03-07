/* ============================================================
   MARGO — js/duet-sheet.js  v4.0
   Export strategy: identical to prototype renderConvo/renderCard.
   Build full-resolution HTML at exact export dimensions in a
   hidden offscreen div → html2canvas at scale=1.
   What you see in the preview IS what you download.
   ============================================================ */
(function () {

const DS = {
  parentPost:null, echoPost:null, mounted:false,
  motion:'fade-up', dur:2.4, format:'gif',
  bgColor:'#07060E', fontFamily:'DM Serif Display', fontItalic:true,
  _savedScrollY:0,
};

const DS_PLATFORMS = [
  {id:'square', label:'Square',         sub:'IG \u00b7 FB \u00b7 Reddit \u00b7 Discord',  w:1080,h:1080,ratio:'1:1' },
  {id:'story',  label:'Story / TikTok', sub:'IG Stories \u00b7 Snap \u00b7 TikTok',  w:1080,h:1920,ratio:'9:16'},
  {id:'wide',   label:'Wide',           sub:'Twitter/X \u00b7 LinkedIn',        w:1200,h:675, ratio:'16:9'},
];

const DS_VIBE = {
  Love:'#FF6B9D',Heartbreak:'#ff5050',Hope:'#6B8CFF',Nostalgia:'#E8C547',
  Healing:'#4ade80',Joy:'#ffc847',Rage:'#FF6440',Loneliness:'#a0a0ff',
  SendIt:'#00e5c8',LetOut:'#c864ff',
};

const DS_THEMES = {
  '#07060E':{g1:'#0c0a04',g2:'#1a1306',acc:'#E8C547',l:'#FF6B9D',r:'#6B8CFF',glow1:'rgba(232,197,71,0.18)',glow2:'rgba(107,140,255,0.14)',light:false},
  '#0e0018':{g1:'#100020',g2:'#1c0730',acc:'#c77dff',l:'#ff71ce',r:'#05ffa1',glow1:'rgba(199,125,255,0.2)',glow2:'rgba(5,255,161,0.12)',light:false},
  '#04090f':{g1:'#040f18',g2:'#071622',acc:'#00e5ff',l:'#00e5ff',r:'#0070ff',glow1:'rgba(0,229,255,0.18)',glow2:'rgba(0,112,255,0.12)',light:false},
  '#0f0404':{g1:'#140505',g2:'#1e0a0a',acc:'#ff6b6b',l:'#ff6b6b',r:'#ffb347',glow1:'rgba(255,107,107,0.2)',glow2:'rgba(255,179,71,0.12)',light:false},
  '#020f06':{g1:'#020d06',g2:'#05160a',acc:'#50fa7b',l:'#50fa7b',r:'#00e5c0',glow1:'rgba(80,250,123,0.18)',glow2:'rgba(0,229,192,0.12)',light:false},
  '#0f0508':{g1:'#120708',g2:'#1c0c0f',acc:'#f4a4c0',l:'#f4a4c0',r:'#c084fc',glow1:'rgba(244,164,192,0.18)',glow2:'rgba(192,132,252,0.12)',light:false},
  '#080808':{g1:'#000000',g2:'#0a0a0a',acc:'#E8C547',l:'#ffffff',r:'#aaaaaa',glow1:'rgba(255,255,255,0.07)',glow2:'rgba(200,200,200,0.04)',light:false},
  '#150520':{g1:'#110317',g2:'#09140f',acc:'#05ffa1',l:'#ff71ce',r:'#05ffa1',glow1:'rgba(255,113,206,0.2)',glow2:'rgba(5,255,161,0.14)',light:false},
  '#f5f0e8':{g1:'#ffffff',g2:'#ece8e0',acc:'#0B0B0D',l:'#c0392b',r:'#1a6fbd',glow1:'rgba(0,0,0,0.05)',glow2:'rgba(0,0,0,0.03)',light:true},
};

/* ═══════════════════════════════════════
   HTML FRAME BUILDERS (mirrors prototype)
═══════════════════════════════════════ */

function q(n){return Math.round(n);}

function fStack(f){
  return {'DM Serif Display':"'DM Serif Display',serif",'Playfair Display':"'Playfair Display',serif",'Space Mono':"'Space Mono',monospace",'DM Sans':"'DM Sans',sans-serif",'Georgia':'Georgia,serif'}[f]||("'"+f+"',sans-serif");
}
function isItalic(f){return['DM Serif Display','Playfair Display','Georgia'].includes(f);}

function _bgLayers(t){
  const eL=t.light?'rgba(0,0,0,0.15)':t.l;
  const eR=t.light?'rgba(0,0,0,0.1)':t.r;
  return '<div style="position:absolute;inset:0;z-index:0;opacity:'+(t.light?0.02:0.04)+';pointer-events:none;background-image:url(\'data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E\');background-size:160px"></div>'
    +'<div style="position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 55% 45% at 20% 25%,'+t.glow1+',transparent 65%),radial-gradient(ellipse 50% 45% at 80% 75%,'+t.glow2+',transparent 65%)"></div>'
    +'<div style="position:absolute;top:0;left:0;right:0;height:2px;z-index:0;background:linear-gradient(90deg,transparent,'+eL+' 40%,transparent);opacity:0.45"></div>'
    +'<div style="position:absolute;bottom:0;left:0;right:0;height:2px;z-index:0;background:linear-gradient(90deg,transparent,'+eR+' 60%,transparent);opacity:0.35"></div>';
}

function _mmark(W,H,t){
  const sz=q(Math.min(W,H)*0.07);
  const ic=q(sz*0.62);
  const stroke=t.light?'#ffffff':'#0B0B0D';
  return '<div style="position:absolute;bottom:'+q(H*0.034)+'px;right:'+q(W*0.036)+'px;z-index:6;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+t.acc+';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(0,0,0,0.4)"><svg width="'+ic+'" height="'+ic+'" viewBox="0 0 46 46" fill="none"><path d="M8 32 L8 14 L17 24 L23 12 L29 24 L38 14 L38 32" stroke="'+stroke+'" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
}

function _ghostM(sz,t){
  const ic=q(sz*0.58);
  const stroke=t.light?'#ffffff':'#0B0B0D';
  const bg=t.light?'rgba(0,0,0,0.12)':t.acc;
  return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+bg+';opacity:0.15;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="'+ic+'" height="'+ic+'" viewBox="0 0 46 46" fill="none"><path d="M8 28 L8 13 L16 22 L23 12 L30 22 L38 13 L38 28" stroke="'+stroke+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
}

function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _songsBar(B,t,parent,echo){
  const light=t.light;
  const pBg=light?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)';
  const pBdr=light?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.1)';
  const lClr=light?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.7)';
  const sClr=light?'#0B0B0D':'#ffffff';
  const aClr=light?'rgba(0,0,0,0.45)':'rgba(255,255,255,0.45)';
  const br=q(B*0.018)+'px';
  const lFs=q(B*0.020)+'px';
  const sFs=q(B*0.024)+'px';
  const aFs=q(B*0.017)+'px';
  const pk=parent.knowledge||{};
  const pS=_esc(pk.song||parent.song||'');
  const pA=_esc(pk.artist||parent.artist||'');
  const eS=_esc(echo.song||'');
  const eA=_esc(echo.artist||'');
  return '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;background:'+pBg+';border:1px solid '+pBdr+';border-radius:'+br+';padding:'+q(B*0.019)+'px '+q(B*0.026)+'px">'
    +'<span style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+lFs+';color:'+lClr+';letter-spacing:0.12em;text-transform:uppercase">SONGS</span>'
    +'<div style="display:flex;align-items:center;gap:'+q(B*0.018)+'px">'
    +'<div style="display:flex;flex-direction:column;gap:'+q(B*0.003)+'px"><span style="font-family:\'DM Sans\',sans-serif;font-weight:700;font-size:'+sFs+';color:'+sClr+'">'+pS+'</span><span style="font-family:\'Space Mono\',monospace;font-size:'+aFs+';color:'+aClr+'">'+pA+'</span></div>'
    +'<span style="font-size:'+sFs+';color:'+t.acc+';opacity:0.7">&#8596;</span>'
    +'<div style="display:flex;flex-direction:column;gap:'+q(B*0.003)+'px;text-align:right"><span style="font-family:\'DM Sans\',sans-serif;font-weight:700;font-size:'+sFs+';color:'+sClr+'">'+(eS.length>20?eS.slice(0,20)+'\u2026':eS)+'</span><span style="font-family:\'Space Mono\',monospace;font-size:'+aFs+';color:'+aClr+'">'+eA+'</span></div>'
    +'</div></div>';
}

function _watermark(B,t){
  const light=t.light;
  const bg=light?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.09)';
  const bdr=light?'rgba(0,0,0,0.18)':'rgba(255,255,255,0.18)';
  const clr=light?'#0B0B0D':'#ffffff';
  const fs=q(B*0.017)+'px';
  return '<div style="flex-shrink:0;text-align:center;padding:'+q(B*0.005)+'px 0"><span style="font-family:\'Space Mono\',monospace;font-weight:700;font-size:'+fs+';color:'+clr+';background:'+bg+';border:1px solid '+bdr+';border-radius:100px;padding:'+q(B*0.009)+'px '+q(B*0.022)+'px;letter-spacing:0.04em">trymargo.com</span></div>';
}

function _lbDiv(B,t,username,animStr){
  const light=t.light;
  const aRgba=light?'rgba(0,0,0,0.22)':'rgba(232,197,71,0.28)';
  const pBg=light?'rgba(0,0,0,0.06)':'rgba(232,197,71,0.09)';
  const pBdr=light?'rgba(0,0,0,0.18)':'rgba(232,197,71,0.28)';
  const pClr=light?'#0B0B0D':t.acc;
  const dFs=q(B*0.020)+'px';
  return '<div style="display:flex;align-items:center;gap:'+q(B*0.026)+'px;flex-shrink:0;'+animStr+'">'
    +'<div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,'+aRgba+',transparent)"></div>'
    +'<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+dFs+';color:'+pClr+';background:'+pBg+';border:1px solid '+pBdr+';border-radius:100px;padding:'+q(B*0.011)+'px '+q(B*0.022)+'px;white-space:nowrap;letter-spacing:0.06em;text-transform:uppercase;flex-shrink:0">LYRIC BACK &#8617; @'+_esc(username.toUpperCase())+'</div>'
    +'<div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,'+aRgba+',transparent)"></div>'
    +'</div>';
}

function _bubbleCard(side,data,B,t,bubbleAnimStr,lyricAnimStr){
  const light=t.light;
  const bodyTxt=light?'#0B0B0D':'#ffffff';
  const mutedTxt=light?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.48)';
  const divLine=light?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)';
  const col=side==='left'?t.l:t.r;
  const bgl=col+'22';
  const bbc=col+'44';
  const lFs=q(B*0.043)+'px';
  const sFs=q(B*0.026)+'px';
  const aFs=q(B*0.018)+'px';
  const vFs=q(B*0.016)+'px';
  const bPad=q(B*0.036)+'px';
  const bRad=q(B*0.030)+'px';
  const bR2=q(B*0.005)+'px';
  const uFs=q(B*0.022)+'px';
  const dot=q(B*0.009)+'px';
  const radii=side==='left'?(bRad+' '+bRad+' '+bRad+' '+bR2):(bRad+' '+bRad+' '+bR2+' '+bRad);
  const pk=data.knowledge||{};
  const song=_esc(pk.song||data.song||'');
  const artist=_esc(pk.artist||data.artist||'');
  const lyric=_esc(data.lyric||data.text||'');
  const emotion=_esc(data.emotion||'');
  const username=_esc(data.username||'anonymous');
  const bubbleBg='background:'+bgl+';border:1px solid '+bbc+';'+(side==='left'?'border-bottom-left-radius:'+bR2:'border-bottom-right-radius:'+bR2);
  const uRow=side==='right'
    ?('@'+username+'<span style="width:'+dot+';height:'+dot+';border-radius:50%;background:'+col+';flex-shrink:0;display:inline-block;margin-left:'+q(B*0.006)+'px"></span>')
    :('<span style="width:'+dot+';height:'+dot+';border-radius:50%;background:'+col+';flex-shrink:0;display:inline-block;margin-right:'+q(B*0.006)+'px"></span>@'+username);
  return '<div style="display:flex;flex-direction:column;gap:'+q(B*0.009)+'px;align-self:'+(side==='left'?'flex-start':'flex-end')+';max-width:88%;'+bubbleAnimStr+'">'
    +'<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+uFs+';color:'+col+';display:flex;align-items:center;gap:'+q(B*0.008)+'px;letter-spacing:0.04em;'+(side==='right'?'justify-content:flex-end':'')+'">'+uRow+'</div>'
    +'<div style="position:relative;border-radius:'+radii+';padding:'+bPad+';'+bubbleBg+';overflow:hidden">'
    +'<div style="position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0.08;background:radial-gradient(ellipse at '+(side==='left'?'top left':'bottom right')+','+col+',transparent 60%)"></div>'
    +'<div style="font-family:'+fStack(DS.fontFamily)+';font-style:'+(isItalic(DS.fontFamily)?'italic':'normal')+';font-size:'+lFs+';line-height:1.42;position:relative;z-index:1;color:'+bodyTxt+';'+lyricAnimStr+'">'+lyric+'</div>'
    +'<div style="border-top:1px solid '+divLine+';padding-top:'+q(B*0.014)+'px;margin-top:'+q(B*0.015)+'px;display:flex;align-items:center;justify-content:space-between;gap:'+q(B*0.01)+'px;position:relative;z-index:1">'
    +'<div><div style="font-family:\'DM Sans\',sans-serif;font-weight:700;font-size:'+sFs+';color:'+bodyTxt+'">'+song+'</div>'
    +'<div style="font-family:\'Space Mono\',monospace;font-size:'+aFs+';color:'+mutedTxt+';margin-top:'+q(B*0.004)+'px">'+artist+'</div></div>'
    +'<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+vFs+';padding:'+q(B*0.007)+'px '+q(B*0.016)+'px;border-radius:100px;background:'+bgl+';color:'+col+';border:1px solid '+bbc+';white-space:nowrap;letter-spacing:0.05em">'+emotion+'</div>'
    +'</div></div></div>';
}

const KF = '@keyframes dsFadeUp{0%{opacity:0;transform:translateY(20px)}25%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-8px)}}'
  +'@keyframes dsSlideIn{0%{opacity:0;transform:translateX(-30px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(12px)}}'
  +'@keyframes dsPulse{0%,100%{opacity:0.4;transform:scale(0.96)}50%{opacity:1;transform:scale(1.03)}}'
  +'@keyframes dsGlitch{0%,88%,100%{transform:translate(0,0);filter:none;opacity:1}89%{transform:translate(-5px,2px);filter:hue-rotate(90deg);opacity:0.8}91%{transform:translate(5px,-2px);filter:hue-rotate(-90deg)}93%{transform:translate(-3px,1px);filter:brightness(1.6)}95%{transform:translate(3px,-1px);filter:none}}'
  +'@keyframes dsWave{0%,100%{transform:translateY(0)}30%{transform:translateY(-10px)}60%{transform:translateY(5px)}}'
  +'@keyframes dsBounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-18px)}60%{transform:translateY(-6px)}}'
  +'@keyframes dsShimmer{0%{background-position:-300% center}100%{background-position:300% center}}'
  +'@keyframes dsTypeOn{0%,5%{width:0}55%,100%{width:100%}}';

function _anim(mot,dur,delay,still){
  if(still) return '';
  const m={
    'fade-up':'animation:dsFadeUp '+dur+'s '+delay+'s ease-in-out infinite both',
    'slide-in':'animation:dsSlideIn '+dur+'s '+delay+'s ease-in-out infinite both',
    'pulse':'animation:dsPulse '+dur+'s '+delay+'s ease-in-out infinite both',
    'glitch':'animation:dsGlitch '+dur+'s '+(delay*0.5)+'s steps(1) infinite',
    'wave':'animation:dsWave '+dur+'s '+delay+'s ease-in-out infinite',
    'bounce':'animation:dsBounce '+dur+'s '+delay+'s ease infinite',
    'shimmer':'animation:dsShimmer '+(dur*1.5)+'s '+delay+'s linear infinite',
    'typewriter':'animation:dsTypeOn '+dur+'s '+delay+'s steps(24,end) infinite',
  };
  return m[mot]||m['fade-up'];
}
function _lyricAnim(mot,acc,dur,delay,still,bodyTxt){
  if(still) return 'color:'+bodyTxt;
  if(mot==='shimmer') return 'background:linear-gradient(90deg,rgba(255,255,255,0.45),#fff 35%,'+acc+' 50%,#fff 65%,rgba(255,255,255,0.45));background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:dsShimmer '+(dur*1.5)+'s '+delay+'s linear infinite';
  if(mot==='typewriter') return 'overflow:hidden;white-space:nowrap;border-right:2px solid '+acc+';width:0;display:block;animation:dsTypeOn '+dur+'s '+delay+'s steps(24,end) infinite;color:'+bodyTxt;
  return 'color:'+bodyTxt+';'+_anim(mot,dur,delay+0.06,false);
}

/* ── CONVO HTML BUILDER ── */
function _buildConvoHTML(W,H,t,still){
  const parent=DS.parentPost, echo=DS.echoPost;
  const mot=DS.motion, dur=DS.dur;
  const B=W>H ? H : (H>W*1.4 ? W : Math.min(W,H));
  const Bb=W>H?B*0.92:B;
  const p=q(Bb*0.05);
  const mFs=q(Bb*0.037)+'px';
  const gMSz=q(Bb*0.054);
  const gap=q(Bb*(W>H?0.017:H>W*1.5?0.022:0.026));
  const logoClr=t.light?'#0B0B0D':t.acc;
  const bodyTxt=t.light?'#0B0B0D':'#ffffff';

  const bLA=_anim(mot,dur,0.10,still);
  const bDA=_anim(mot,dur,0.30,still);
  const bRA=_anim(mot,dur,0.50,still);
  const lLA=_lyricAnim(mot,t.acc,dur,0.10,still,bodyTxt);
  const lRA=_lyricAnim(mot,t.acc,dur,0.50,still,bodyTxt);

  return '<div style="width:'+W+'px;height:'+H+'px;position:relative;overflow:hidden;display:flex;flex-direction:column;background:linear-gradient(160deg,'+t.g1+' 0%,'+t.g2+' 100%);font-family:\'DM Sans\',sans-serif">'
    +'<style>'+KF+'</style>'
    +_bgLayers(t)
    +'<div style="position:relative;z-index:2;display:flex;flex-direction:column;height:100%;padding:'+p+'px;gap:'+q(Bb*0.019)+'px;box-sizing:border-box;overflow:hidden">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
    +'<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+mFs+';letter-spacing:0.22em;color:'+logoClr+';opacity:0.28;filter:blur(0.3px) contrast(0.7)">MARGO</div>'
    +_ghostM(gMSz,t)
    +'</div>'
    +'<div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;gap:'+gap+'px;min-height:0">'
    +_bubbleCard('left',parent,Bb,t,bLA,lLA)
    +_lbDiv(Bb,t,echo.username||'anonymous',bDA)
    +_bubbleCard('right',echo,Bb,t,bRA,lRA)
    +'</div>'
    +_songsBar(Bb,t,parent,echo)
    +_watermark(Bb,t)
    +'</div>'
    +_mmark(W,H,t)
    +'</div>';
}

/* ── CARD HTML BUILDER ── */
function _buildCardHTML(W,H,t,still){
  const parent=DS.parentPost, echo=DS.echoPost;
  const mot=DS.motion, dur=DS.dur;
  const B=W>H ? H : (H>W*1.4 ? W : Math.min(W,H));
  const padV=q(Math.min(H*0.055,B*0.065));
  const padH=q(B*0.062);
  const mFs=q(B*0.038)+'px';
  const lFs=q(B*0.052)+'px';
  const lFsB=q(B*0.060)+'px';
  const atFs=q(B*0.019)+'px';
  const dFs=q(B*0.020)+'px';
  const cRad=q(B*0.024)+'px';
  const cPad=q(Math.min(B*0.036,W*0.026))+'px';
  const vGap=q(H*0.016)+'px';
  const logoClr=t.light?'#0B0B0D':t.acc;
  const bodyTxt=t.light?'#0B0B0D':'#fff';
  const mutedTxt=t.light?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.48)';
  const aRgba=t.light?'rgba(0,0,0,0.22)':'rgba(232,197,71,0.32)';
  const pillBg=t.light?'rgba(0,0,0,0.06)':'rgba(232,197,71,0.09)';
  const pillBdr=t.light?'rgba(0,0,0,0.18)':'rgba(232,197,71,0.3)';
  const pillClr=t.light?'#0B0B0D':t.acc;
  const cardBg=t.light?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.04)';
  const cardBdr=t.light?'rgba(0,0,0,0.14)':'rgba(255,255,255,0.1)';
  const pk=parent.knowledge||{};
  const pS=_esc(pk.song||parent.song||''), pA=_esc(pk.artist||parent.artist||'');
  const eS=_esc(echo.song||''), eA=_esc(echo.artist||'');
  const pU='@'+_esc((parent.username||'anonymous').toUpperCase());
  const eU='@'+_esc((echo.username||'anonymous').toUpperCase());
  const lS1=_lyricAnim(mot,t.acc,dur,0.12,still,bodyTxt);
  const lS2=_lyricAnim(mot,t.acc,dur,0.38,still,bodyTxt);
  const a0=_anim(mot,dur,0,still);
  const a2=_anim(mot,dur,0.2,still);
  const a28=_anim(mot,dur,0.28,still);
  const a46=_anim(mot,dur,0.46,still);
  return '<div style="width:'+W+'px;height:'+H+'px;position:relative;overflow:hidden;display:flex;flex-direction:column;background:linear-gradient(160deg,'+t.g1+' 0%,'+t.g2+' 100%);font-family:\'DM Sans\',sans-serif">'
    +'<style>'+KF+'</style>'
    +_bgLayers(t)
    +'<div style="position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;padding:'+padV+'px '+padH+'px;gap:'+vGap+';box-sizing:border-box;overflow:hidden">'
    +'<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+mFs+';letter-spacing:0.22em;color:'+logoClr+';opacity:0.28;filter:blur(0.3px) contrast(0.7);flex-shrink:0;'+a0+'">MARGO</div>'
    +'<div style="flex:1;display:flex;align-items:center;min-height:0">'
    +'<div style="width:100%;position:relative;border-radius:'+cRad+';padding:'+cPad+';background:'+cardBg+';border:1px solid '+cardBdr+';overflow:hidden">'
    +'<div style="position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0.08;background:radial-gradient(ellipse at top left,'+t.l+',transparent 60%)"></div>'
    +'<div style="font-family:'+fStack(DS.fontFamily)+';font-style:'+(isItalic(DS.fontFamily)?'italic':'normal')+';font-size:'+lFs+';line-height:1.42;position:relative;z-index:1;'+lS1+'">'+_esc(parent.text||parent.lyric||'')+'</div>'
    +'<div style="font-family:\'Space Mono\',monospace;font-size:'+atFs+';margin-top:'+q(B*0.013)+'px;color:'+t.l+';opacity:'+(t.light?0.8:0.9)+';position:relative;z-index:1;'+a2+'">'+pS+(pA?' \u2014 '+pA:'')+' \u00b7 '+pU+'</div>'
    +'</div></div>'
    +'<div style="display:flex;align-items:center;gap:'+q(B*0.028)+'px;flex-shrink:0;'+a28+'">'
    +'<div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,'+aRgba+',transparent)"></div>'
    +'<div style="font-family:\'Syne\',sans-serif;font-weight:800;font-size:'+dFs+';color:'+pillClr+';background:'+pillBg+';border:1px solid '+pillBdr+';border-radius:100px;padding:'+q(B*0.011)+'px '+q(B*0.022)+'px;white-space:nowrap;text-transform:uppercase;letter-spacing:0.06em;flex-shrink:0">LYRIC BACK &#8617; '+eU+'</div>'
    +'<div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,'+aRgba+',transparent)"></div>'
    +'</div>'
    +'<div style="flex:1.15;display:flex;align-items:center;min-height:0">'
    +'<div style="width:100%;position:relative;border-radius:'+cRad+';padding:'+cPad+';background:'+cardBg+';border:1px solid '+cardBdr+';overflow:hidden">'
    +'<div style="position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0.08;background:radial-gradient(ellipse at bottom right,'+t.r+',transparent 60%)"></div>'
    +'<div style="font-family:'+fStack(DS.fontFamily)+';font-style:'+(isItalic(DS.fontFamily)?'italic':'normal')+';font-size:'+lFsB+';line-height:1.38;position:relative;z-index:1;'+lS2+'">'+_esc(echo.lyric||echo.text||'')+'</div>'
    +'<div style="font-family:\'Space Mono\',monospace;font-size:'+atFs+';margin-top:'+q(B*0.013)+'px;color:'+t.r+';opacity:'+(t.light?0.8:0.9)+';position:relative;z-index:1;'+a46+'">'+eS+(eA?' \u2014 '+eA:'')+' \u00b7 '+eU+'</div>'
    +'</div></div>'
    +_songsBar(B,t,parent,echo)
    +_watermark(B,t)
    +'</div>'
    +_mmark(W,H,t)
    +'</div>';
}

/* ── OFFSCREEN CAPTURE ── */
let _offEl=null;
function _getOff(){
  if(_offEl)return _offEl;
  _offEl=document.createElement('div');
  _offEl.style.cssText='position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none;overflow:hidden';
  document.body.appendChild(_offEl);
  return _offEl;
}

async function _captureFrame(html,W,H){
  const el=_getOff();
  el.style.width=W+'px';el.style.height=H+'px';
  el.innerHTML=html;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const snap=await window.html2canvas(el,{
    width:W,height:H,scale:1,
    backgroundColor:null,logging:false,
    useCORS:true,allowTaint:true,foreignObjectRendering:false,
  });
  el.innerHTML='';
  return snap;
}


/* ════════════════════════ SHEET UI STYLES ════════════════════════ */
function injectDuetStyles(){
  if(document.getElementById('duetSheetStyles'))return;
  const s=document.createElement('style');s.id='duetSheetStyles';
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
.ds-bubble{max-width:82%;display:flex;flex-direction:column;gap:6px}
.ds-bubble.original{align-self:flex-start}
.ds-bubble.reply{align-self:flex-end;align-items:flex-end}
.ds-bubble-user{font-family:'Syne',sans-serif;font-weight:800;font-size:0.65rem;letter-spacing:0.04em;display:flex;align-items:center;gap:6px;padding:0 5px}
.ds-bubble.original .ds-bubble-user{color:var(--ds-vibe-left,#FF6B9D)}
.ds-bubble.reply .ds-bubble-user{color:var(--ds-vibe-right,#6B8CFF);flex-direction:row-reverse}
.ds-udot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.ds-bubble.original .ds-udot{background:var(--ds-vibe-left,#FF6B9D)}
.ds-bubble.reply .ds-udot{background:var(--ds-vibe-right,#6B8CFF)}
.ds-bubble-card{padding:15px 17px;border-radius:20px;position:relative;overflow:hidden}
.ds-bubble.original .ds-bubble-card{background:rgba(255,107,157,0.09);border:1px solid rgba(255,107,157,0.25);border-bottom-left-radius:5px}
.ds-bubble.reply .ds-bubble-card{background:rgba(107,140,255,0.09);border:1px solid rgba(107,140,255,0.25);border-bottom-right-radius:5px}
.ds-bubble-lyric{font-family:'DM Serif Display',serif;font-style:italic;font-size:1.1rem;line-height:1.5;color:#fff;position:relative;z-index:1}
.ds-bubble-meta{margin-top:11px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px}
.ds-bubble-song{font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:700;color:#fff}
.ds-bubble-artist{font-family:'Space Mono',monospace;font-size:0.58rem;color:rgba(255,255,255,0.6);margin-top:2px}
.ds-bubble-vibe{font-family:'Syne',sans-serif;font-weight:800;font-size:0.5rem;letter-spacing:0.05em;text-transform:uppercase;padding:4px 10px;border-radius:20px;flex-shrink:0}
.ds-bubble.original .ds-bubble-vibe{background:rgba(255,107,157,0.15);color:#FF9DC0;border:1px solid rgba(255,107,157,0.3)}
.ds-bubble.reply .ds-bubble-vibe{background:rgba(107,140,255,0.15);color:#9DB5FF;border:1px solid rgba(107,140,255,0.3)}
.ds-lb-divider{display:flex;align-items:center;gap:9px;padding:2px 0}
.ds-lb-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(232,197,71,0.22),transparent)}
.ds-lb-pill{font-family:'Syne',sans-serif;font-weight:800;font-size:0.55rem;letter-spacing:0.06em;text-transform:uppercase;color:#E8C547;background:rgba(232,197,71,0.1);border:1px solid rgba(232,197,71,0.28);padding:6px 13px;border-radius:20px;white-space:nowrap}
.ds-song-strip{margin:6px 18px 0;padding:11px 15px;background:#181720;border-radius:13px;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
.ds-strip-label{font-family:'Syne',sans-serif;font-weight:800;font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7)}
.ds-strip-songs{display:flex;align-items:center;gap:12px}
.ds-strip-song{display:flex;flex-direction:column;gap:2px}
.ds-strip-song:last-child{align-items:flex-end}
.ds-strip-song-name{font-family:'DM Sans',sans-serif;font-size:0.72rem;font-weight:700;color:rgba(255,255,255,0.85)}
.ds-strip-song-artist{font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.4)}
.ds-strip-sep{font-size:0.65rem;color:rgba(255,255,255,0.2)}
.ds-section-sep{height:1px;background:rgba(255,255,255,0.06);margin:14px 18px 0}
.ds-edit-panel{margin:14px 18px 0;background:#181720;border-radius:18px;border:1px solid rgba(255,255,255,0.07);overflow:hidden}
.ds-format-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.07)}
.ds-format-tab{flex:1;padding:13px 10px;font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;color:rgba(255,255,255,0.35)}
.ds-format-tab.active-gif{color:#00E5FF;border-bottom-color:#00E5FF;background:rgba(0,229,255,0.05)}
.ds-format-tab.active-poster{color:#E8C547;border-bottom-color:#E8C547;background:rgba(232,197,71,0.05)}
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
.ds-motion-btn:hover{background:rgba(255,255,255,0.08);color:#fff}
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
.ds-picker-cancel:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7)}`;
  document.head.appendChild(s);
}

/* ════════════════════════ MOUNT ════════════════════════ */
function mountDuetSheet(){
  if(document.getElementById('duetBackdrop'))return;
  injectDuetStyles();
  const backdrop=document.createElement('div');
  backdrop.id='duetBackdrop';backdrop.className='ds-hidden';
  backdrop.innerHTML=`
<div id="duetSheet">
  <div class="ds-handle" id="dsDragHandle"></div>
  <div class="ds-header"><span class="ds-title">Duet Export</span><button class="ds-close" id="dsClose">&#215;</button></div>
  <div class="ds-view-toggle">
    <button class="ds-toggle-btn active" id="dsToggleConvo">Conversation</button>
    <button class="ds-toggle-btn" id="dsToggleCard">Card</button>
  </div>
  <div id="dsViewConvo">
    <div class="ds-convo" id="dsConvoBubbles"></div>
    <div class="ds-song-strip" id="dsSongStrip"></div>
  </div>
  <div id="dsViewCard" style="display:none">
    <div style="padding:16px 18px 0">
      <div style="border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);aspect-ratio:1;position:relative;background:#07060E" id="dsCardPreviewWrap">
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
          <div class="ds-font-card active" data-family="DM Serif Display" data-italic="true"><div class="ds-font-preview" style="font-family:'DM Serif Display',serif;font-style:italic">Say everything</div><div class="ds-font-card-name">Serif \u00b7 Default</div></div>
          <div class="ds-font-card" data-family="Playfair Display" data-italic="true"><div class="ds-font-preview" style="font-family:'Playfair Display',serif;font-style:italic">Say everything</div><div class="ds-font-card-name">Playfair</div></div>
          <div class="ds-font-card" data-family="Space Mono" data-italic="false"><div class="ds-font-preview" style="font-family:'Space Mono',monospace">Say everything</div><div class="ds-font-card-name">Mono</div></div>
          <div class="ds-font-card" data-family="DM Sans" data-italic="false"><div class="ds-font-preview" style="font-family:'DM Sans',sans-serif;font-weight:700">Say everything</div><div class="ds-font-card-name">Sans Bold</div></div>
        </div>
      </div>
    </div>
  </div>
  <div class="ds-export-row">
    <button class="ds-export-btn ds-btn-dl-gif" id="dsBtnDownload"><span class="ds-export-icon">\u2193</span><span id="dsBtnDlLabel">Download GIF</span></button>
    <button class="ds-export-btn ds-btn-sh-gif" id="dsBtnShare"><span class="ds-export-icon">\u2197</span><span id="dsBtnShLabel">Share GIF</span></button>
  </div>
</div>`;
  document.body.appendChild(backdrop);

  const picker=document.createElement('div');picker.id='dsPlatformPicker';picker.className='ds-hidden';
  picker.innerHTML='<div class="ds-picker-sheet"><div class="ds-picker-handle"></div><div class="ds-picker-title">Choose platform</div><div class="ds-picker-cards" id="dsPickerCards"></div><button class="ds-picker-cancel" id="dsPickerCancel">Cancel</button></div>';
  document.body.appendChild(picker);

  DS_PLATFORMS.forEach(p=>{
    const c=document.createElement('div');c.className='ds-picker-card';c.dataset.pid=p.id;
    c.innerHTML='<div class="ds-picker-ratio">'+p.ratio+'</div><div class="ds-picker-info"><div class="ds-picker-name">'+p.label+'</div><div class="ds-picker-sub">'+p.sub+'</div></div><div class="ds-picker-dim">'+p.w+'\u00d7'+p.h+'</div>';
    document.getElementById('dsPickerCards').appendChild(c);
  });

  DS.mounted=true;
  document.getElementById('dsClose').onclick=closeDuetSheet;
  document.getElementById('dsToggleConvo').onclick=()=>_dsShowView('convo');
  document.getElementById('dsToggleCard').onclick=()=>_dsShowView('card');
  document.getElementById('dsBtnDownload').onclick=()=>_dsOpenPicker('download');
  document.getElementById('dsBtnShare').onclick=()=>_dsOpenPicker('share');
  document.getElementById('dsPickerCancel').onclick=_dsClosePicker;
  document.getElementById('dsPlatformPicker').addEventListener('click',e=>{if(e.target===document.getElementById('dsPlatformPicker'))_dsClosePicker();});
  document.getElementById('dsPickerCards').addEventListener('click',e=>{
    const c=e.target.closest('.ds-picker-card');if(!c)return;
    const plat=DS_PLATFORMS.find(p=>p.id===c.dataset.pid);if(plat)_dsStartExport(plat);
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
    DS.motion=b.dataset.motion;_dsRefreshPreview();
  });
  document.getElementById('dsSpeedRow').addEventListener('click',e=>{
    const b=e.target.closest('.ds-speed-btn');if(!b)return;
    document.querySelectorAll('.ds-speed-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    DS.dur=parseFloat(b.dataset.dur);_dsRefreshPreview();
  });
  document.querySelectorAll('.ds-color-swatch').forEach(sw=>{
    sw.onclick=()=>{document.querySelectorAll('.ds-color-swatch').forEach(s=>s.classList.remove('active'));sw.classList.add('active');DS.bgColor=sw.dataset.bg;_dsRefreshPreview();};
  });
  document.querySelectorAll('.ds-font-card').forEach(card=>{
    card.onclick=()=>{document.querySelectorAll('.ds-font-card').forEach(c=>c.classList.remove('active'));card.classList.add('active');DS.fontFamily=card.dataset.family;DS.fontItalic=card.dataset.italic==='true';_dsRefreshPreview();};
  });
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeDuetSheet();});
  _initDsSwipe();
}

let _dsPickerAction='download';
function _dsOpenPicker(a){_dsPickerAction=a;document.getElementById('dsPlatformPicker').classList.remove('ds-hidden');}
function _dsClosePicker(){document.getElementById('dsPlatformPicker').classList.add('ds-hidden');}
function _dsStartExport(plat){_dsClosePicker();DS.format==='gif'?_dsExportGif(plat,_dsPickerAction):_dsExportPoster(plat,_dsPickerAction);}

function openDuetSheet(parentPost,echoPost){
  if(!parentPost||!echoPost)return;
  mountDuetSheet();
  DS.parentPost=parentPost;DS.echoPost=echoPost;
  DS.motion='fade-up';DS.dur=2.4;DS.format='gif';
  _dsPopulateConvo();
  _dsShowView('convo');_dsSwitchFormat('gif');
  document.getElementById('duetBackdrop').classList.remove('ds-hidden');
  document.body.classList.add('ds-modal-open');
  DS._savedScrollY=window.scrollY||0;
}
function closeDuetSheet(){
  const b=document.getElementById('duetBackdrop');if(b)b.classList.add('ds-hidden');
  document.body.classList.remove('ds-modal-open');
  requestAnimationFrame(()=>window.scrollTo({top:DS._savedScrollY||0,behavior:'instant'}));
}

/* Sheet preview — convo view uses the same styled preview as before */
function _dsPopulateConvo(){
  const p=DS.parentPost,e=DS.echoPost;if(!p||!e)return;
  const pV=DS_VIBE[p.emotion||'Nostalgia']||'#E8C547',eV=DS_VIBE[e.emotion||'Nostalgia']||'#E8C547';
  const pk=p.knowledge||{};
  const pU=('@'+(p.username||'anonymous')).toUpperCase(),eU=('@'+(e.username||'anonymous')).toUpperCase();
  const pS=pk.song||p.song||'\u2014',pA=pk.artist||p.artist||'';
  const eS=e.song||'\u2014',eA=e.artist||'';
  const sh=document.getElementById('duetSheet');
  sh.style.setProperty('--ds-vibe-left',pV);sh.style.setProperty('--ds-vibe-right',eV);
  document.getElementById('dsConvoBubbles').innerHTML=
    '<div class="ds-bubble original"><div class="ds-bubble-user"><span class="ds-udot"></span>'+_esc(pU)+'</div><div class="ds-bubble-card"><div class="ds-bubble-lyric">'+_esc(p.text||p.lyric||'')+'</div><div class="ds-bubble-meta"><div><div class="ds-bubble-song">'+_esc(pS)+'</div><div class="ds-bubble-artist">'+_esc(pA)+'</div></div><span class="ds-bubble-vibe">'+_esc(p.emotion||'Vibe')+'</span></div></div></div>'
    +'<div class="ds-lb-divider"><div class="ds-lb-line"></div><div class="ds-lb-pill">Lyric Back \u21a9 '+_esc(eU)+'</div><div class="ds-lb-line"></div></div>'
    +'<div class="ds-bubble reply"><div class="ds-bubble-user">'+_esc(eU)+'<span class="ds-udot"></span></div><div class="ds-bubble-card"><div class="ds-bubble-lyric">'+_esc(e.lyric||e.text||'')+'</div><div class="ds-bubble-meta"><div><div class="ds-bubble-song">'+_esc(eS)+'</div><div class="ds-bubble-artist">'+_esc(eA)+'</div></div><span class="ds-bubble-vibe">'+_esc(e.emotion||'Vibe')+'</span></div></div></div>';
  document.getElementById('dsSongStrip').innerHTML=
    '<span class="ds-strip-label">SONGS</span><div class="ds-strip-songs"><div class="ds-strip-song"><span class="ds-strip-song-name">'+_esc(pS)+'</span><span class="ds-strip-song-artist">'+_esc(pA)+'</span></div><span class="ds-strip-sep">\u2194</span><div class="ds-strip-song"><span class="ds-strip-song-name">'+_esc(eS)+'</span><span class="ds-strip-song-artist">'+_esc(eA)+'</span></div></div>';
}

/* Card view: render at true 1080×1080 resolution, scale down via CSS transform */
function _dsRefreshPreview(){
  const isCard=document.getElementById('dsViewCard').style.display!=='none';
  if(!isCard)return;
  const wrap=document.getElementById('dsCardPreviewWrap');if(!wrap)return;
  const t=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'];
  const still=DS.format==='poster';
  // Always render at true export resolution (square default for preview)
  const PW=1080,PH=1080;
  // Scale to fit the wrap container
  const wrapW=wrap.clientWidth||340;
  const scale=wrapW/PW;
  wrap.style.height=(PH*scale)+'px';
  wrap.style.overflow='hidden';
  wrap.style.position='relative';
  const inner=document.createElement('div');
  inner.style.cssText='position:absolute;top:0;left:0;width:'+PW+'px;height:'+PH+'px;transform:scale('+scale+');transform-origin:top left;pointer-events:none';
  inner.innerHTML=_buildCardHTML(PW,PH,t,still?'still':'animated');
  wrap.innerHTML='';
  wrap.appendChild(inner);
}

function _dsShowView(v){
  document.getElementById('dsViewConvo').style.display=v==='convo'?'':'none';
  document.getElementById('dsViewCard').style.display=v==='card'?'':'none';
  document.getElementById('dsToggleConvo').classList.toggle('active',v==='convo');
  document.getElementById('dsToggleCard').classList.toggle('active',v==='card');
  if(v==='card')_dsRefreshPreview();
}
function _dsSwitchFormat(fmt){
  DS.format=fmt;
  document.getElementById('dsFmtGif').className='ds-format-tab'+(fmt==='gif'?' active-gif':'');
  document.getElementById('dsFmtPoster').className='ds-format-tab'+(fmt==='poster'?' active-poster':'');
  const dl=document.getElementById('dsBtnDownload'),sh=document.getElementById('dsBtnShare');
  const dlL=document.getElementById('dsBtnDlLabel'),shL=document.getElementById('dsBtnShLabel');
  if(fmt==='gif'){
    if(dl)dl.className='ds-export-btn ds-btn-dl-gif';if(sh)sh.className='ds-export-btn ds-btn-sh-gif';
    if(dlL)dlL.textContent='Download GIF';if(shL)shL.textContent='Share GIF';
    if(dl)dl.querySelector('.ds-export-icon').textContent='\u2193';
    if(sh)sh.querySelector('.ds-export-icon').textContent='\u2197';
    const mt=document.querySelector('[data-opt="motion"]');if(mt)mt.style.display='';
  }else{
    if(dl)dl.className='ds-export-btn ds-btn-dl-poster';if(sh)sh.className='ds-export-btn ds-btn-sh-poster';
    if(dlL)dlL.textContent='Download Poster';if(shL)shL.textContent='Share Poster';
    if(dl)dl.querySelector('.ds-export-icon').textContent='\u2193';
    if(sh)sh.querySelector('.ds-export-icon').textContent='\u2197';
    const mt=document.querySelector('[data-opt="motion"]');if(mt)mt.style.display='none';
    const ao=document.querySelector('.ds-option-tab.active');
    if(ao&&ao.dataset.opt==='motion'){
      document.querySelectorAll('.ds-option-tab').forEach(b=>b.classList.remove('active'));
      const ct=document.querySelector('[data-opt="color"]');if(ct)ct.classList.add('active');
      document.querySelectorAll('.ds-panel-section').forEach(s=>s.classList.remove('active'));
      document.getElementById('ds-section-color').classList.add('active');
    }
  }
  _dsRefreshPreview();
}

function _dsSetProgress(btn,pct,label,color){
  if(!btn)return;
  const icon=btn.querySelector('.ds-export-icon');const lbl=btn.querySelector('span:last-child');
  if(icon)icon.textContent=pct>=100?'\u2713':'\u25ce';if(lbl)lbl.textContent=label;
  let bar=btn.querySelector('.ds-progress-bar');
  if(!bar){bar=document.createElement('div');bar.className='ds-progress-bar';btn.appendChild(bar);}
  bar.style.width=pct+'%';bar.style.background=color||'#00E5FF';
}

async function _dsPreloadFonts(){
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('800 1em Syne'),
    document.fonts.load('700 1em "Space Mono"'),
    document.fonts.load('400 1em "Space Mono"'),
    document.fonts.load('700 1em "DM Sans"'),
    document.fonts.load('400 1em "DM Sans"'),
    document.fonts.load('600 1em "'+DS.fontFamily+'"'),
    document.fonts.load('italic 600 1em "'+DS.fontFamily+'"'),
  ].map(p=>p.catch(()=>{})));
}

async function _dsLoadH2C(){
  if(window.html2canvas)return;
  await new Promise((res,rej)=>{
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);
  });
}

/* ════ GIF EXPORT ════ */
async function _dsExportGif(plat,action){
  const dlBtn=document.getElementById('dsBtnDownload'),shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'',origSh=shBtn?shBtn.innerHTML:'';
  const isConvo=document.getElementById('dsViewCard').style.display==='none';
  const W=plat.w,H=plat.h,FRAMES=24;
  const DELAY=Math.round((DS.dur*1000)/FRAMES);
  const color='#00E5FF';
  if(dlBtn)dlBtn.disabled=true;if(shBtn)shBtn.disabled=true;
  _dsSetProgress(btn,0,'Starting\u2026',color);
  try{
    await _dsPreloadFonts();await _dsLoadH2C();
    if(typeof GIF==='undefined'){
      await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
    }
    const t=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'];
    const gif=new GIF({workers:4,quality:2,width:W,height:H,workerScript:'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',dither:'FloydSteinberg',globalPalette:false});
    const buildFn=isConvo?_buildConvoHTML:_buildCardHTML;
    for(let i=0;i<FRAMES;i++){
      _dsSetProgress(btn,Math.round((i/FRAMES)*72),'Frame '+(i+1)+'/'+FRAMES,color);
      const html=buildFn(W,H,t,'animated');
      const snap=await _captureFrame(html,W,H);
      gif.addFrame(snap,{copy:true,delay:DELAY});
      await new Promise(r=>setTimeout(r,4));
    }
    gif.on('progress',p=>_dsSetProgress(btn,Math.round(72+p*26),'Encoding '+Math.round(72+p*26)+'%',color));
    gif.on('finished',async blob=>{
      _dsSetProgress(btn,100,'\u2713 Done!',color);
      const name=((DS.parentPost&&(DS.parentPost.knowledge&&DS.parentPost.knowledge.song||DS.parentPost.song))||'duet').replace(/\s+/g,'-').toLowerCase();
      const fname='margo-duet-'+name+'-'+plat.id+'.gif';
      if(action==='share'&&navigator.share){
        try{await navigator.share({files:[new File([blob],fname,{type:'image/gif'})],title:'Margo Duet',text:'trymargo.com'});}
        catch{_dsDl(blob,fname);}
      }else{_dsDl(blob,fname);}
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      _dsSwitchFormat(DS.format);
    });
    gif.render();
  }catch(err){
    console.error('GIF error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    _dsSwitchFormat(DS.format);
  }
}

/* ════ POSTER EXPORT ════ */
async function _dsExportPoster(plat,action){
  const dlBtn=document.getElementById('dsBtnDownload'),shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'',origSh=shBtn?shBtn.innerHTML:'';
  const isConvo=document.getElementById('dsViewCard').style.display==='none';
  const W=plat.w,H=plat.h,color='#E8C547';
  if(dlBtn)dlBtn.disabled=true;if(shBtn)shBtn.disabled=true;
  _dsSetProgress(btn,0,'Preparing\u2026',color);
  try{
    await _dsPreloadFonts();await _dsLoadH2C();
    _dsSetProgress(btn,30,'Rendering\u2026',color);
    const t=DS_THEMES[DS.bgColor]||DS_THEMES['#07060E'];
    const buildFn=isConvo?_buildConvoHTML:_buildCardHTML;
    const html=buildFn(W,H,t,'still');
    const snap=await _captureFrame(html,W,H);
    _dsSetProgress(btn,85,'Saving\u2026',color);
    const name=((DS.parentPost&&(DS.parentPost.knowledge&&DS.parentPost.knowledge.song||DS.parentPost.song))||'duet').replace(/\s+/g,'-').toLowerCase();
    const fname='margo-poster-'+name+'-'+plat.id+'.png';
    snap.toBlob(async blob=>{
      if(!blob)return;
      _dsSetProgress(btn,100,'\u2713 Done!',color);
      if(action==='share'&&navigator.share){
        try{await navigator.share({files:[new File([blob],fname,{type:'image/png'})],title:'Margo Poster',text:'trymargo.com'});}
        catch{_dsDl(blob,fname);}
      }else{_dsDl(blob,fname);}
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      _dsSwitchFormat(DS.format);
    },'image/png',0.95);
  }catch(err){
    console.error('Poster error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    _dsSwitchFormat(DS.format);
  }
}

function _dsDl(blob,fname){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=fname;a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}

function _initDsSwipe(){
  const sh=document.getElementById('duetSheet'),h=document.getElementById('dsDragHandle');
  if(!sh||!h)return;
  let sY=0,cY=0,dr=false;
  h.addEventListener('touchstart',e=>{sY=e.touches[0].clientY;cY=sY;dr=true;sh.style.transition='none';},{passive:true});
  h.addEventListener('touchmove',e=>{if(!dr)return;cY=e.touches[0].clientY;const dy=Math.max(0,cY-sY);sh.style.transform='translateY('+dy+'px)';sh.style.opacity=String(1-dy/320);},{passive:true});
  h.addEventListener('touchend',()=>{if(!dr)return;dr=false;sh.style.transition='';if(cY-sY>80)closeDuetSheet();else{sh.style.transform='';sh.style.opacity='';}});
}

window.openDuetSheet=openDuetSheet;
window.closeDuetSheet=closeDuetSheet;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountDuetSheet);
else mountDuetSheet();

})();
