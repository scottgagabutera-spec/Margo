/* ============================================================
   MARGO — js/duet-export.js  v6.0
   Pure canvas export — NO html2canvas, NO DOM screenshots.
   Mirrors gif-studio.js exactly: every pixel drawn with ctx calls.

   KEY FIXES v6.0:
   - Canvas injected into convo view + HTML bubbles HIDDEN (fixes double view)
   - _dsShowView integration: canvas starts/stops with view switching
   - Card view: canvas preview replaces HTML card preview
   - Layout math verified: no overflow on any platform size
   - Mobile-safe download trigger
   ============================================================ */

(function () {

/* ── helpers ── */
function q(n) { return Math.round(n); }

function fStack(f) {
  return {
    'DM Serif Display': "'DM Serif Display',serif",
    'Playfair Display': "'Playfair Display',serif",
    'Space Mono':       "'Space Mono',monospace",
    'DM Sans':          "'DM Sans',sans-serif",
    'Georgia':          'Georgia,serif',
  }[f] || ("'" + f + "',sans-serif");
}
function isItalic(f) {
  return ['DM Serif Display','Playfair Display','Georgia'].includes(f);
}

function wrap(ctx, text, x, y, maxW, lineH) {
  const words = String(text || '').split(' ');
  let line = '', lines = [];
  words.forEach(w => {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
    else line = t;
  });
  if (line.trim()) lines.push(line.trim());
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

/* ════════════════════════════════════════════════════════
   BACKGROUND — shared by both views
   ════════════════════════════════════════════════════════ */
function drawBg(ctx, W, H, theme) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, theme.g1);
  bg.addColorStop(1, theme.g2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(W*0.2, H*0.25, 0, W*0.2, H*0.25, W*0.6);
  g1.addColorStop(0, theme.glow1 || 'rgba(232,197,71,0.18)');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W*0.8, H*0.75, 0, W*0.8, H*0.75, W*0.5);
  g2.addColorStop(0, theme.glow2 || 'rgba(107,140,255,0.14)');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);
}

/* ════════════════════════════════════════════════════════
   M ICON — shared, matches original _mmark SVG exactly
   ════════════════════════════════════════════════════════ */
function drawMIcon(ctx, W, H, B, scale, theme) {
  const sz  = q(Math.min(W,H)*0.070);
  const mx  = W - q(W*0.036) - sz/2;
  const my  = H - q(H*0.034) - sz/2;
  const ic  = q(sz*0.62);
  const ix  = mx - ic/2, iy = my - ic/2;
  const stroke = theme.light ? '#ffffff' : '#0B0B0D';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur  = 10*scale;
  ctx.fillStyle   = theme.acc;
  ctx.beginPath(); ctx.arc(mx, my, sz/2, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth   = q(4.5*scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* matches: M8 32 L8 14 L17 24 L23 12 L29 24 L38 14 L38 32 scaled to ic */
  ctx.beginPath();
  ctx.moveTo(ix,         iy+ic*0.696);
  ctx.lineTo(ix,         iy+ic*0.130);
  ctx.lineTo(ix+ic*0.370,iy+ic*0.522);
  ctx.lineTo(ix+ic*0.500,iy+ic*0.000);
  ctx.lineTo(ix+ic*0.630,iy+ic*0.522);
  ctx.lineTo(ix+ic,      iy+ic*0.130);
  ctx.lineTo(ix+ic,      iy+ic*0.696);
  ctx.stroke();
  ctx.restore();
}

/* ════════════════════════════════════════════════════════
   SONGS BAR — shared
   ════════════════════════════════════════════════════════ */
function drawSongsBar(ctx, W, barY, barH, pad, B, scale, DS, theme) {
  const light    = !!theme.light;
  const bodyTxt  = light ? '#0B0B0D' : '#ffffff';
  const mutedTxt = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';
  const innerW   = W - pad*2;
  const bPad     = q(B*0.028);
  const bH       = q(barH * 0.78);
  const bY       = barY + q((barH - bH) / 2);

  const pk    = (DS.parentPost || {}).knowledge || {};
  const pS    = (pk.song   || (DS.parentPost  || {}).song   || '').substring(0,16);
  const pA    = (pk.artist || (DS.parentPost  || {}).artist || '').substring(0,18);
  const eS    = ((DS.echoPost || {}).song   || '').substring(0,16);
  const eA    = ((DS.echoPost || {}).artist || '').substring(0,18);

  roundRect(ctx, pad, bY, innerW, bH, q(B*0.014));
  ctx.fillStyle   = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
  ctx.lineWidth   = scale; ctx.stroke();

  const lFs = q(B*0.024), sFs = q(B*0.028), aFs = q(B*0.020);
  const mid  = bY + bH/2;

  ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;
  ctx.font      = `800 ${lFs}px 'Syne','DM Sans',sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
  ctx.fillText('SONGS', pad + bPad, mid);

  const rSec = pad + innerW * 0.34;
  ctx.font      = `700 ${sFs}px 'DM Sans',sans-serif`;
  ctx.fillStyle = bodyTxt; ctx.textAlign = 'left';
  ctx.fillText(pS, rSec, bY + bH*0.33);
  ctx.font      = `400 ${aFs}px 'Space Mono',monospace`;
  ctx.fillStyle = mutedTxt;
  ctx.fillText(pA, rSec, bY + bH*0.70);

  ctx.font      = `${q(B*0.030)}px sans-serif`;
  ctx.fillStyle = theme.acc; ctx.globalAlpha = 0.7; ctx.textAlign = 'center';
  ctx.fillText('↔', W/2, mid + 1);
  ctx.globalAlpha = 1;

  ctx.font      = `700 ${sFs}px 'DM Sans',sans-serif`;
  ctx.fillStyle = bodyTxt; ctx.textAlign = 'right';
  ctx.fillText(eS, W - pad - bPad, bY + bH*0.33);
  ctx.font      = `400 ${aFs}px 'Space Mono',monospace`;
  ctx.fillStyle = mutedTxt;
  ctx.fillText(eA, W - pad - bPad, bY + bH*0.70);
}

/* ════════════════════════════════════════════════════════
   WATERMARK — shared
   ════════════════════════════════════════════════════════ */
function drawWatermark(ctx, W, wmY, wmH, B, scale, theme) {
  const light  = !!theme.light;
  const text   = 'trymargo.com';
  const fSize  = q(B*0.020);
  ctx.font         = `700 ${fSize}px 'Space Mono',monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const tW  = ctx.measureText(text).width;
  const pX  = fSize*0.9, pY = fSize*0.5;
  const pW  = tW + pX*2, pH = fSize + pY*2;
  const pllX = W/2 - pW/2, pllY = wmY + (wmH - pH)/2;
  roundRect(ctx, pllX, pllY, pW, pH, pH/2);
  ctx.fillStyle   = light ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.09)'; ctx.fill();
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.18)'  : 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = scale; ctx.stroke();
  ctx.fillStyle   = light ? '#0B0B0D' : '#ffffff';
  ctx.fillText(text, W/2, pllY + pH/2);
}

/* ════════════════════════════════════════════════════════
   CONVERSATION FRAME
   ════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════
   DRAW FRAME — design from _dsDrawCard (main duet-sheet.js)
   Animation math from gsDrawFrame (main gif-studio.js)
   Used for BOTH drawConvoFrame and drawCardFrame
   ════════════════════════════════════════════════════════ */
function _dsMainDraw(ctx, W, H, t, DS) {
  const isStatic = (t === null || t === undefined || t === 1) && t !== 0;
  const tVal     = isStatic ? 1 : t;
  const parent   = DS.parentPost || {};
  const echo     = DS.echoPost   || {};
  const mot      = DS.motion     || 'fade-up';
  const ff       = DS.fontFamily || 'DM Serif Display';
  const italic   = DS.fontItalic !== false;
  const scale    = W / 500;

  const _VIBE_LOCAL = {
    Love:'#FF6B9D',Heartbreak:'#ff5050',Hope:'#6B8CFF',Nostalgia:'#E8C547',
    Healing:'#4ade80',Joy:'#ffc847',Rage:'#FF6440',Loneliness:'#a0a0ff',
    SendIt:'#00e5c8',LetOut:'#c864ff',
  };
  const pVibe = _VIBE_LOCAL[parent.emotion||'Nostalgia']||'#E8C547';
  const eVibe = _VIBE_LOCAL[echo.emotion  ||'Nostalgia']||'#E8C547';
  const pad   = W * 0.07;
  const iW    = W - pad * 2;
  const divY  = H * 0.495;

  /* 1 — Background */
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,   '#090810');
  bg.addColorStop(0.48,'#0d0b12');
  bg.addColorStop(0.52,'#080c10');
  bg.addColorStop(1,   '#060809');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  /* 2 — Vibe glows */
  ctx.save();
  const pg=ctx.createRadialGradient(W*0.15,H*0.15,0,W*0.15,H*0.15,W*0.7);
  pg.addColorStop(0,pVibe+'22'); pg.addColorStop(1,'transparent');
  ctx.fillStyle=pg; ctx.fillRect(0,0,W,H); ctx.restore();
  ctx.save();
  const eg=ctx.createRadialGradient(W*0.85,H*0.85,0,W*0.85,H*0.85,W*0.7);
  eg.addColorStop(0,eVibe+'22'); eg.addColorStop(1,'transparent');
  ctx.fillStyle=eg; ctx.fillRect(0,0,W,H); ctx.restore();

  /* 3 — Grain */
  ctx.save(); ctx.globalAlpha=0.016;
  for(let y=0;y<H;y+=4) for(let x=0;x<W;x+=4){
    const v=Math.random()*255|0;
    ctx.fillStyle=`rgb(${v},${v},${v})`; ctx.fillRect(x,y,4,4);
  }
  ctx.restore();

  /* 4 — Accent lines */
  ctx.save();
  const tl=ctx.createLinearGradient(0,0,W,0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(0.5,pVibe); tl.addColorStop(1,'transparent');
  ctx.globalAlpha=0.65; ctx.fillStyle=tl; ctx.fillRect(0,0,W,2);
  const bl=ctx.createLinearGradient(0,0,W,0);
  bl.addColorStop(0,'transparent'); bl.addColorStop(0.5,eVibe); bl.addColorStop(1,'transparent');
  ctx.fillStyle=bl; ctx.fillRect(0,H-2,W,2);
  ctx.restore();

  /* 5 — MARGO wordmark */
  ctx.save();
  ctx.font=`800 ${Math.max(14,W*0.046)}px 'Syne',sans-serif`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.88;
  ctx.textBaseline='top'; ctx.textAlign='left';
  ctx.fillText('MARGO', pad, pad*0.65);
  ctx.restore();

  /* Animation helpers — from gsDrawFrame in gif-studio.js */
  function animT(delay) {
    return Math.max(0,Math.min(1,(tVal-delay)/Math.max(0.01,1-delay)));
  }
  function getAnim(delay) {
    const ta=animT(delay), e=easeInOut(ta);
    switch(mot){
      case 'fade-up':   return {alpha:Math.min(1,e*2.2),ox:0,oy:(1-e)*38*scale,sc:1};
      case 'slide-in':  {const eo=1-Math.pow(1-Math.min(1,ta/0.7),3);
                         return {alpha:Math.min(1,eo*1.6),ox:(1-eo)*W*0.28,oy:0,sc:1};}
      case 'pulse':     return {alpha:1,ox:0,oy:0,sc:0.93+0.07*Math.sin(tVal*Math.PI*2+delay)};
      case 'glitch':    {const ph=Math.floor(tVal*9),isG=ph%3===0&&tVal<0.85;
                         return {alpha:1,ox:isG?(Math.random()-0.5)*10*scale:0,oy:0,sc:1,glitch:isG};}
      case 'wave':      return {alpha:1,ox:0,oy:Math.sin(tVal*Math.PI*2+delay*3)*5*scale,sc:1};
      case 'bounce':    {const b=ta<0.5?4*ta*ta*ta:1-Math.pow(-2*ta+2,3)/2;
                         return {alpha:1,ox:0,oy:(1-b)*H*0.06,sc:0.86+b*0.14};}
      case 'shimmer':   return {alpha:1,ox:0,oy:0,sc:1,shimmer:true};
      case 'typewriter':return {alpha:1,ox:0,oy:0,sc:1,typewriter:true};
      default:          return {alpha:Math.min(1,e*2.2),ox:0,oy:(1-e)*38*scale,sc:1};
    }
  }

  /* Lyric draw with animation */
  function drawLyric(text, cx, baseY, maxW, fontSize, weight, delay, baseAlpha) {
    const fontStr=`${italic?'italic ':''}${weight} ${Math.round(fontSize)}px '${ff}',serif`;
    const am=getAnim(delay);
    ctx.save();
    ctx.font=fontStr;
    let lines=_wrapText(ctx,text,maxW);
    if(lines.length>3){
      const ns=Math.max(W*0.028,fontSize*(3/lines.length));
      ctx.font=`${italic?'italic ':''}${weight} ${Math.round(ns)}px '${ff}',serif`;
      lines=_wrapText(ctx,text,maxW);
      fontSize=ns;
    }
    const lh=fontSize*1.52;
    const blockH=lines.length*lh;
    ctx.textBaseline='top'; ctx.textAlign='center';

    if(am.shimmer){
      ctx.globalAlpha=baseAlpha; ctx.fillStyle='#ffffff99';
      lines.forEach((l,i)=>ctx.fillText(l,cx,baseY+am.oy+i*lh));
      const sx=tVal*(W+160*scale)-80*scale;
      const sh=ctx.createLinearGradient(sx-70*scale,0,sx+70*scale,0);
      sh.addColorStop(0,'transparent');sh.addColorStop(0.4,'#E8C547');
      sh.addColorStop(0.6,'#ffffff');sh.addColorStop(1,'transparent');
      ctx.save();ctx.globalCompositeOperation='source-atop';
      ctx.fillStyle=sh;lines.forEach((l,i)=>ctx.fillText(l,cx,baseY+am.oy+i*lh));ctx.restore();
    } else if(am.typewriter){
      const chars=Math.floor(animT(delay)*(text.length+6));
      const vis=text.substring(0,Math.min(chars,text.length));
      const cur=chars<=text.length&&(Math.floor(tVal*10)%2===0)?'|':'';
      ctx.globalAlpha=baseAlpha;ctx.fillStyle='#ffffff';
      ctx.shadowColor='rgba(0,0,0,0.35)';ctx.shadowBlur=10*scale;
      _wrapText(ctx,vis+cur,maxW).forEach((l,i)=>ctx.fillText(l,cx,baseY+i*lh));
    } else if(am.sc!==1){
      const cy2=baseY+blockH/2;
      ctx.globalAlpha=baseAlpha*am.alpha;
      ctx.translate(cx,cy2+am.oy);ctx.scale(am.sc,am.sc);
      ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=12*scale;
      lines.forEach((l,i)=>ctx.fillText(l,0,-blockH/2+i*lh));
    } else {
      ctx.globalAlpha=baseAlpha*am.alpha;ctx.fillStyle='#ffffff';
      ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=16*scale;
      lines.forEach((l,i)=>ctx.fillText(l,cx+am.ox,baseY+am.oy+i*lh));
    }
    ctx.shadowBlur=0;ctx.restore();
  }

  function _wrapText(ctx,text,maxW){
    const words=String(text||'').split(' ');
    const lines=[];let cur='';
    for(const w of words){
      const test=cur?cur+' '+w:w;
      if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}
      else cur=test;
    }
    if(cur)lines.push(cur);
    return lines;
  }

  /* 6 — Top lyric */
  const topH   = divY*0.9 - pad*2;
  const pText  = parent.text||parent.lyric||'';
  const pFS    = Math.min(W*0.054,topH*0.3);
  ctx.font=`${italic?'italic ':''}600 ${Math.round(pFS)}px '${ff}',serif`;
  const pLines =_wrapText(ctx,pText,iW*0.9);
  const pActFS = pLines.length>3?Math.max(W*0.028,pFS*(3/pLines.length)):pFS;
  const pLH    = pActFS*1.52;
  const pBlockH= Math.min(pLines.length,3)*pLH;
  const pStartY= pad*2+(topH-pBlockH)/2-pActFS*0.3;
  drawLyric(pText,W/2,pStartY,iW*0.9,pActFS,'600',0.0,0.58);

  /* 7 — Parent attribution */
  const pk=parent.knowledge||{};
  const pSong=pk.song||parent.song||'';
  if(pSong){
    ctx.save();
    ctx.font=`700 ${Math.max(9,W*0.019)}px 'Space Mono',monospace`;
    ctx.fillStyle=pVibe;ctx.globalAlpha=0.42;
    ctx.textBaseline='bottom';ctx.textAlign='center';
    let s=pSong+((pk.artist||parent.artist)?' — '+(pk.artist||parent.artist):'');
    while(ctx.measureText(s).width>iW*0.8&&s.length>4)s=s.slice(0,-4)+'…';
    ctx.fillText(s,W/2,divY-W*0.045);
    ctx.restore();
  }

  /* 8 — LYRIC BACK pill */
  const dText=`LYRIC BACK ↩  @${(echo.username||'anonymous').toUpperCase()}`;
  const dFS=Math.max(10,W*0.021);
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  const dTW=ctx.measureText(dText).width;
  const pH=dFS*1.95,pPH=W*0.028,pW=dTW+pPH*2;
  const pX=W/2-pW/2,pY=divY-pH/2,pR=pH/2;
  ctx.save();
  const gap=pW/2+W*0.018;
  [[pad,W/2-gap],[W/2+gap,W-pad]].forEach(([x1,x2])=>{
    const lg=ctx.createLinearGradient(x1,0,x2,0);
    if(x1===pad){lg.addColorStop(0,'transparent');lg.addColorStop(1,'rgba(232,197,71,0.22)');}
    else{lg.addColorStop(0,'rgba(232,197,71,0.22)');lg.addColorStop(1,'transparent');}
    ctx.fillStyle=lg;ctx.fillRect(x1,divY-0.75,x2-x1,1.5);
  });
  ctx.restore();
  ctx.save();
  ctx.shadowColor='#E8C547';ctx.shadowBlur=14;
  ctx.strokeStyle='rgba(232,197,71,0.6)';ctx.lineWidth=1.5;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(pX,pY,pW,pH,pR);else ctx.rect(pX,pY,pW,pH);
  ctx.stroke();ctx.shadowBlur=0;
  const pFill=ctx.createLinearGradient(pX,pY,pX,pY+pH);
  pFill.addColorStop(0,'rgba(232,197,71,0.14)');pFill.addColorStop(1,'rgba(232,197,71,0.06)');
  ctx.fillStyle=pFill;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(pX,pY,pW,pH,pR);else ctx.rect(pX,pY,pW,pH);
  ctx.fill();
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle='#E8C547';ctx.globalAlpha=0.95;
  ctx.textBaseline='middle';ctx.textAlign='center';
  ctx.fillText(dText,W/2,divY);
  ctx.restore();

  /* 9 — Bottom lyric */
  const botTop=divY+pH/2+W*0.025;
  const botH  =H*0.88-botTop;
  const eText =echo.lyric||echo.text||'';
  const eFS   =Math.min(W*0.062,botH*0.3);
  ctx.font=`${italic?'italic ':''}700 ${Math.round(eFS)}px '${ff}',serif`;
  const eLines=_wrapText(ctx,eText,iW*0.9);
  const eActFS=eLines.length>3?Math.max(W*0.032,eFS*(3/eLines.length)):eFS;
  const eLH   =eActFS*1.52;
  const eBlockH=Math.min(eLines.length,3)*eLH;
  const eStartY=botTop+(botH-eBlockH)/2;
  drawLyric(eText,W/2,eStartY,iW*0.9,eActFS,'700',0.45,1.0);

  /* 10 — Echo attribution */
  if(echo.song){
    ctx.save();
    ctx.font=`700 ${Math.max(9,W*0.019)}px 'Space Mono',monospace`;
    ctx.fillStyle='#E8C547';ctx.globalAlpha=0.8;
    ctx.textBaseline='bottom';ctx.textAlign='center';
    let s=echo.song+(echo.artist?' — '+echo.artist:'');
    while(ctx.measureText(s).width>iW*0.8&&s.length>4)s=s.slice(0,-4)+'…';
    ctx.fillText(s,W/2,H*0.89);
    ctx.restore();
  }

  /* 11 — Watermark pill */
  const wFS=Math.max(9,W*0.022);
  ctx.save();
  ctx.font=`700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline='middle';
  const wTxt='trymargo.com',wTW=ctx.measureText(wTxt).width;
  const wPX=wFS*1.0,wPY=wFS*0.55,wW=wTW+wPX*2,wH=wFS+wPY*2,wR=wH/2;
  const wX=W/2-wW/2,wY=H*0.938-wH/2;
  ctx.beginPath();
  ctx.moveTo(wX+wR,wY);ctx.arcTo(wX+wW,wY,wX+wW,wY+wH,wR);
  ctx.arcTo(wX+wW,wY+wH,wX,wY+wH,wR);ctx.arcTo(wX,wY+wH,wX,wY,wR);
  ctx.arcTo(wX,wY,wX+wW,wY,wR);ctx.closePath();
  ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.22)';ctx.lineWidth=Math.max(1,W*0.001);ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.shadowBlur=0;
  ctx.fillText(wTxt,W/2,wY+wH/2);
  ctx.restore();
}

/* Both views use the same main design */
function drawConvoFrame(ctx, W, H, t, DS, theme) {
  _dsMainDraw(ctx, W, H, t, DS);
}
function drawCardFrame(ctx, W, H, t, DS, theme) {
  _dsMainDraw(ctx, W, H, t, DS);
}

const PV = { _raf:null, _frame:0, _last:0, _size:0 };

function _startPreview() {
  _stopPreview();
  PV._frame = 0; PV._last = 0; PV._size = 0;

  const loop = (ts) => {
    const DS = window._DS, themes = window._DSThemes;
    if (!DS || !themes) { PV._raf = requestAnimationFrame(loop); return; }

    const delay = Math.round((DS.dur * 1000) / 24);
    if (ts - PV._last >= delay) {
      PV._last = ts;
      const canvas = document.getElementById('dsConvoPreviewCanvas');
      if (canvas) {
        const theme  = themes[DS.bgColor] || themes['#07060E'];
        const stage  = canvas.parentElement;
        const dpr    = window.devicePixelRatio || 1;
        const w      = stage ? stage.clientWidth - 4 : 340;
        const h      = w; /* square preview */
        if (w !== PV._size) {
          PV._size = w;
          canvas.style.width  = w + 'px';
          canvas.style.height = h + 'px';
          canvas.width  = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx    = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const isCard = document.getElementById('dsViewCard')?.style.display !== 'none';
        const isPoster = DS.format === 'poster';
        const frameT = isPoster ? 1 : PV._frame/24;
        if (isCard) drawCardFrame(ctx, w, h, frameT, DS, theme);
        else        drawConvoFrame(ctx, w, h, frameT, DS, theme);
        if (!isPoster) PV._frame = (PV._frame + 1) % 24;
      }
    }
    PV._raf = requestAnimationFrame(loop);
  };
  PV._raf = requestAnimationFrame(loop);
}

function _stopPreview() {
  if (PV._raf) { cancelAnimationFrame(PV._raf); PV._raf = null; }
}

/* ════════════════════════════════════════════════════════
   INJECT CANVAS — hides HTML bubbles, shows only canvas
   ════════════════════════════════════════════════════════ */
function _injectCanvas() {
  const check = setInterval(() => {
    if (!document.getElementById('duetSheet')) return;
    clearInterval(check);

    /* hide the HTML bubble elements — canvas replaces them */
    const bubbles   = document.getElementById('dsConvoBubbles');
    const songStrip = document.getElementById('dsSongStrip');
    if (bubbles)   bubbles.style.display   = 'none';
    if (songStrip) songStrip.style.display = 'none';

    /* inject canvas if not already present */
    if (document.getElementById('dsConvoPreviewCanvas')) return;
    const view = document.getElementById('dsViewConvo');
    if (!view) return;

    const wrap   = document.createElement('div');
    wrap.id      = 'dsConvoCanvasWrap';
    wrap.style.cssText = 'padding:10px 18px 0;';

    const canvas = document.createElement('canvas');
    canvas.id    = 'dsConvoPreviewCanvas';
    canvas.style.cssText = 'display:block;border-radius:14px;width:100%;background:#07060E;';

    wrap.appendChild(canvas);
    view.insertBefore(wrap, view.firstChild);
  }, 100);
}

/* ════════════════════════════════════════════════════════
   DOWNLOAD — mobile-safe
   ════════════════════════════════════════════════════════ */
function _dl(blob, fname) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url; a.download = fname;
  a.style.cssText = 'position:fixed;top:-999px;left:-999px';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
}

/* ════════════════════════════════════════════════════════
   PROGRESS
   ════════════════════════════════════════════════════════ */
function _setProgress(btn, pct, label, color) {
  if (!btn) return;
  const icon = btn.querySelector('.ds-export-icon');
  const lbl  = btn.querySelector('span:last-child');
  if (icon) icon.textContent = pct >= 100 ? '✓' : '◎';
  if (lbl)  lbl.textContent  = label;
  let bar = btn.querySelector('.ds-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'ds-progress-bar';
    btn.appendChild(bar);
  }
  bar.style.width      = pct + '%';
  bar.style.background = color || '#00E5FF';
}

/* ════════════════════════════════════════════════════════
   GIF EXPORT
   ════════════════════════════════════════════════════════ */
async function _exportGif(plat, action) {
  const DS     = window._DS, themes = window._DSThemes;
  if (!DS || !themes) return;
  _stopPreview();

  const dlBtn  = document.getElementById('dsBtnDownload');
  const shBtn  = document.getElementById('dsBtnShare');
  const btn    = action === 'download' ? dlBtn : shBtn;
  const origDl = dlBtn ? dlBtn.innerHTML : '';
  const origSh = shBtn ? shBtn.innerHTML : '';
  if (dlBtn) dlBtn.disabled = true;
  if (shBtn) shBtn.disabled = true;

  const W = plat.w, H = plat.h, FRAMES = 24;
  const DELAY = Math.round((DS.dur * 1000) / FRAMES);
  const color  = '#00E5FF';
  const isCard = document.getElementById('dsViewCard')?.style.display !== 'none';
  const drawFn = isCard ? drawCardFrame : drawConvoFrame;

  _setProgress(btn, 0, 'Starting…', color);
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`700 1em 'DM Sans'`),
      document.fonts.load(`600 1em '${DS.fontFamily}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily}'`),
    ].map(p => p.catch(() => {})));

    if (typeof GIF === 'undefined') {
      await new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src     = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload  = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
    }

    const theme = themes[DS.bgColor] || themes['#07060E'];
    const gif   = new GIF({
      workers: 4, quality: 1, width: W, height: H,
      workerScript: '/js/gif.worker.js', dither: false,
    });

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc  = off.getContext('2d');

    for (let i = 0; i < FRAMES; i++) {
      oc.clearRect(0, 0, W, H);
      drawFn(oc, W, H, i/FRAMES, DS, theme);
      gif.addFrame(off, { copy:true, delay:DELAY });
      _setProgress(btn, Math.round((i/FRAMES)*72), `Frame ${i+1}/${FRAMES}`, color);
      await new Promise(r => setTimeout(r, 0));
    }

    gif.on('progress', p => _setProgress(btn, Math.round(72+p*26), `Encoding ${Math.round(72+p*26)}%`, color));
    gif.on('finished', async blob => {
      _setProgress(btn, 100, '✓ Done!', color);
      const name  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g,'-').toLowerCase();
      const fname = 'margo-duet-' + name + '-' + plat.id + '.gif';
      if (action === 'share' && navigator.share) {
        try { await navigator.share({ files:[new File([blob],fname,{type:'image/gif'})], title:'Margo Duet', text:'trymargo.com' }); }
        catch { _dl(blob, fname); }
      } else { _dl(blob, fname); }
      if (dlBtn) { dlBtn.disabled=false; dlBtn.innerHTML=origDl; }
      if (shBtn) { shBtn.disabled=false; shBtn.innerHTML=origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      setTimeout(_startPreview, 400);
    });
    gif.render();
  } catch(err) {
    console.error('[duet-export] GIF error:', err);
    if (dlBtn) { dlBtn.disabled=false; dlBtn.innerHTML=origDl; }
    if (shBtn) { shBtn.disabled=false; shBtn.innerHTML=origSh; }
    if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format || 'gif');
    _startPreview();
  }
}

/* ════════════════════════════════════════════════════════
   POSTER EXPORT
   ════════════════════════════════════════════════════════ */
async function _exportPoster(plat, action) {
  const DS     = window._DS, themes = window._DSThemes;
  if (!DS || !themes) return;
  _stopPreview();

  const dlBtn  = document.getElementById('dsBtnDownload');
  const shBtn  = document.getElementById('dsBtnShare');
  const btn    = action === 'download' ? dlBtn : shBtn;
  const origDl = dlBtn ? dlBtn.innerHTML : '';
  const origSh = shBtn ? shBtn.innerHTML : '';
  if (dlBtn) dlBtn.disabled = true;
  if (shBtn) shBtn.disabled = true;

  const W = plat.w, H = plat.h, color = '#E8C547';
  const isCard = document.getElementById('dsViewCard')?.style.display !== 'none';
  const drawFn = isCard ? drawCardFrame : drawConvoFrame;

  _setProgress(btn, 0, 'Preparing…', color);
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`700 1em 'DM Sans'`),
      document.fonts.load(`600 1em '${DS.fontFamily}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily}'`),
    ].map(p => p.catch(() => {})));

    _setProgress(btn, 20, 'Rendering…', color);
    const theme = themes[DS.bgColor] || themes['#07060E'];
    const off   = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc  = off.getContext('2d');
    drawFn(oc, W, H, 1, DS, theme); /* t=1 = fully visible */

    _setProgress(btn, 80, 'Saving…', color);
    off.toBlob(async blob => {
      if (!blob) return;
      _setProgress(btn, 100, '✓ Done!', color);
      const name  = ((DS.parentPost && (DS.parentPost.knowledge && DS.parentPost.knowledge.song || DS.parentPost.song)) || 'duet')
        .replace(/\s+/g,'-').toLowerCase();
      const fname = 'margo-poster-' + name + '-' + plat.id + '.png';
      if (action === 'share' && navigator.share) {
        try { await navigator.share({ files:[new File([blob],fname,{type:'image/png'})], title:'Margo Poster', text:'trymargo.com' }); }
        catch { _dl(blob, fname); }
      } else { _dl(blob, fname); }
      if (dlBtn) { dlBtn.disabled=false; dlBtn.innerHTML=origDl; }
      if (shBtn) { shBtn.disabled=false; shBtn.innerHTML=origSh; }
      if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      setTimeout(_startPreview, 400);
    }, 'image/png', 0.95);
  } catch(err) {
    console.error('[duet-export] Poster error:', err);
    if (dlBtn) { dlBtn.disabled=false; dlBtn.innerHTML=origDl; }
    if (shBtn) { shBtn.disabled=false; shBtn.innerHTML=origSh; }
    if (window._dsSwitchFormat) window._dsSwitchFormat(DS.format || 'poster');
    _startPreview();
  }
}

/* ════════════════════════════════════════════════════════
   HOOK openDuetSheet / closeDuetSheet
   ════════════════════════════════════════════════════════ */
const _origOpen  = window.openDuetSheet;
const _origClose = window.closeDuetSheet;

window.openDuetSheet = function(parentPost, echoPost) {
  if (_origOpen) _origOpen(parentPost, echoPost);
  setTimeout(() => { _injectCanvas(); setTimeout(_startPreview, 200); }, 80);
};
window.closeDuetSheet = function() {
  _stopPreview();
  if (_origClose) _origClose();
};

/* PUBLIC API */
window._duetExport = {
  gif:          _exportGif,
  poster:       _exportPoster,
  startPreview: _startPreview,
  stopPreview:  _stopPreview,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _injectCanvas);
} else {
  _injectCanvas();
}

})();
