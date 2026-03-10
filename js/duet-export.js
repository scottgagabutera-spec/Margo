/* ============================================================
   MARGO — js/duet-export.js  v5.0
   Pure canvas export — NO html2canvas, NO DOM screenshots.
   Mirrors gif-studio.js exactly: every pixel drawn with ctx calls.

   KEY FIXES v5.0:
   - scale = MIN(W,H)/500 — fixes overflow on wide/story formats
   - Card view draws card layout, convo view draws convo layout
   - Live animated canvas preview injected into conversation view
   - Mobile-safe download trigger

   Reads from duet-sheet.js via:
     window._DS        — state (motion, dur, bgColor, fontFamily)
     window._DSThemes  — theme map
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
   CONVERSATION FRAME DRAW
   ════════════════════════════════════════════════════════ */
function drawConvoFrame(ctx, W, H, t, DS, theme) {
  const mot    = DS.motion || 'fade-up';
  const ff     = DS.fontFamily || 'DM Serif Display';
  const italic = isItalic(ff);
  const parent = DS.parentPost || {};
  const echo   = DS.echoPost   || {};
  const light  = !!theme.light;
  const B      = Math.min(W, H);
  const scale  = B / 500;
  const bodyTxt  = light ? '#0B0B0D' : '#ffffff';
  const mutedTxt = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';
  const colL     = theme.l || theme.acc;
  const colR     = theme.r || theme.acc;

  /* background */
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,theme.g1); bg.addColorStop(1,theme.g2);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const g1=ctx.createRadialGradient(W*0.2,H*0.25,0,W*0.2,H*0.25,W*0.6);
  g1.addColorStop(0,theme.glow1||'rgba(232,197,71,0.18)'); g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);

  const g2=ctx.createRadialGradient(W*0.8,H*0.75,0,W*0.8,H*0.75,W*0.5);
  g2.addColorStop(0,theme.glow2||'rgba(107,140,255,0.14)'); g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);

  ctx.save();
  const lL=ctx.createLinearGradient(0,0,W,0);
  lL.addColorStop(0,'transparent'); lL.addColorStop(0.4,colL+'73'); lL.addColorStop(1,'transparent');
  ctx.fillStyle=lL; ctx.globalAlpha=0.45; ctx.fillRect(0,0,W,q(2*scale));
  const lR=ctx.createLinearGradient(0,0,W,0);
  lR.addColorStop(0,'transparent'); lR.addColorStop(0.6,colR+'73'); lR.addColorStop(1,'transparent');
  ctx.fillStyle=lR; ctx.globalAlpha=0.35; ctx.fillRect(0,H-q(2*scale),W,q(2*scale));
  ctx.restore();

  /* animation helpers */
  function animT(delay) { return Math.max(0,Math.min(1,(t-delay)/Math.max(0.01,1-delay))); }
  function getAm(delay) {
    const ta=animT(delay), e=easeInOut(ta);
    switch(mot){
      case 'fade-up':  return {ox:0,oy:(1-e)*16*scale,alpha:Math.min(1,e*2.2)};
      case 'slide-in': return {ox:(1-easeInOut(Math.min(1,ta/0.7)))*W*0.28,oy:0,alpha:Math.min(1,ta*2)};
      case 'pulse':    return {ox:0,oy:0,alpha:1,pulse:0.94+0.06*Math.sin(t*Math.PI*2)};
      case 'glitch':   { const ph=Math.floor(t*9),isG=ph%3===0&&t<0.85; return {ox:isG?((ph*7919)%11-5)*scale:0,oy:0,alpha:1}; }
      case 'wave':     return {ox:0,oy:Math.sin(t*Math.PI*2+delay*3)*5*scale,alpha:1};
      case 'bounce':   { const b=ta<0.5?4*ta*ta*ta:1-Math.pow(-2*ta+2,3)/2; return {ox:0,oy:(1-b)*H*0.06,alpha:1}; }
      default:         return {ox:0,oy:(1-e)*16*scale,alpha:Math.min(1,e*2.2)};
    }
  }

  /* layout */
  const pad      = q(B*0.048);
  const innerW   = W - pad*2;
  const headerH  = q(H*0.080);
  const divH     = q(H*0.068);
  const songsH   = q(H*0.088);
  const wmH      = q(H*0.054);
  const bubbleArea = H - pad - headerH - divH - songsH - wmH - pad;
  const bubbleH    = q(bubbleArea * 0.48);
  let curY = pad;

  /* header */
  {
    const mFs=q(B*0.034);
    ctx.save();
    ctx.font=`800 ${mFs}px 'Syne','DM Sans',sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.globalAlpha=0.28; ctx.fillStyle=light?'#0B0B0D':theme.acc;
    ctx.fillText('MARGO',pad,curY+headerH/2);
    ctx.restore();
    const msz=q(B*0.050), mx=W-pad-msz/2, my=curY+headerH/2;
    ctx.save();
    ctx.globalAlpha=0.15; ctx.fillStyle=theme.acc;
    ctx.beginPath(); ctx.arc(mx,my,msz/2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.4; ctx.strokeStyle=light?'#ffffff':'#0B0B0D';
    ctx.lineWidth=2*scale; ctx.lineCap='round'; ctx.lineJoin='round';
    const ic=msz*0.52,ix=mx-ic/2,iy=my-ic/2;
    ctx.beginPath();
    ctx.moveTo(ix,iy+ic*0.72); ctx.lineTo(ix,iy+ic*0.18);
    ctx.lineTo(ix+ic*0.38,iy+ic*0.54); ctx.lineTo(ix+ic*0.5,iy+ic*0.12);
    ctx.lineTo(ix+ic*0.62,iy+ic*0.54); ctx.lineTo(ix+ic,iy+ic*0.18);
    ctx.lineTo(ix+ic,iy+ic*0.72); ctx.stroke();
    ctx.restore();
    curY += headerH;
  }

  /* bubble draw helper */
  function drawBubble(side, post, yTop, bH) {
    const col    = side==='left'?colL:colR;
    const pk     = post.knowledge||{};
    const song   = (pk.song||post.song||'').substring(0,26);
    const artist = (pk.artist||post.artist||'').substring(0,28);
    const lyric  = (post.lyric||post.text||'').substring(0,120);
    const emotion= (post.emotion||'').substring(0,14);
    const uname  = ('@'+(post.username||'anonymous')).toUpperCase();
    const delay  = side==='left'?0.05:0.50;
    const am     = getAm(delay);
    const p      = am.pulse||1;
    const bW     = q(innerW*0.88);
    const bX     = side==='left'?pad:W-pad-bW;
    const cx     = bX+bW/2, cy=yTop+bH/2;

    ctx.save();
    ctx.globalAlpha = am.alpha!==undefined?am.alpha:1;
    ctx.translate(cx+(am.ox||0), cy+(am.oy||0));
    ctx.scale(p,p);
    const dx=-bW/2, dy=-bH/2, r=q(B*0.026);

    roundRect(ctx,dx,dy,bW,bH,r);
    ctx.fillStyle=col+'22'; ctx.fill();
    ctx.strokeStyle=col+'55'; ctx.lineWidth=Math.max(1,scale*0.8); ctx.stroke();

    const ig=ctx.createRadialGradient(dx+(side==='left'?0:bW),dy,0,dx+(side==='left'?0:bW),dy+bH,bW*0.7);
    ig.addColorStop(0,col+'18'); ig.addColorStop(1,'transparent');
    roundRect(ctx,dx,dy,bW,bH,r); ctx.fillStyle=ig; ctx.fill();

    /* username */
    const uFs=q(B*0.036), dotR=q(uFs*0.28);
    const uY=dy+q(bH*0.055);
    ctx.font=`800 ${uFs}px 'Syne','DM Sans',sans-serif`;
    ctx.textBaseline='top'; ctx.shadowBlur=0;
    if(side==='left'){
      ctx.textAlign='left';
      ctx.beginPath(); ctx.arc(dx+dotR*2.2,uY+uFs*0.5,dotR,0,Math.PI*2);
      ctx.fillStyle=col; ctx.fill();
      ctx.fillText(uname,dx+dotR*5,uY);
    } else {
      ctx.textAlign='right';
      ctx.fillStyle=col;
      ctx.fillText(uname,dx+bW-dotR*5,uY);
      ctx.beginPath(); ctx.arc(dx+bW-dotR*2.2,uY+uFs*0.5,dotR,0,Math.PI*2);
      ctx.fillStyle=col; ctx.fill();
    }

    /* lyric */
    const lFs=q(B*0.055), lLineH=lFs*1.42;
    const lX=dx+bW*0.07, lY=dy+q(bH*0.22), lMaxW=bW*0.86;
    ctx.font=`${italic?'italic ':''}600 ${lFs}px ${fStack(ff)}`;
    ctx.textAlign='left'; ctx.textBaseline='top';

    if(mot==='shimmer'){
      ctx.fillStyle=bodyTxt; wrap(ctx,lyric,lX,lY,lMaxW,lLineH);
      const sx=(t*(bW+80*scale))-40*scale+dx;
      const sh=ctx.createLinearGradient(sx-40*scale,0,sx+40*scale,0);
      sh.addColorStop(0,'transparent'); sh.addColorStop(0.4,theme.acc);
      sh.addColorStop(0.6,'#ffffff'); sh.addColorStop(1,'transparent');
      ctx.save(); ctx.globalCompositeOperation='source-atop'; ctx.globalAlpha=0.7;
      ctx.fillStyle=sh; wrap(ctx,lyric,lX,lY,lMaxW,lLineH); ctx.restore();
    } else if(mot==='typewriter'){
      const chars=Math.floor(animT(delay)*(lyric.length+4));
      const vis=lyric.substring(0,Math.min(chars,lyric.length));
      const cur=chars<=lyric.length&&(Math.floor(t*10)%2===0)?'|':'';
      ctx.fillStyle=bodyTxt; wrap(ctx,vis+cur,lX,lY,lMaxW,lLineH);
    } else {
      ctx.fillStyle=bodyTxt;
      ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=5*scale;
      wrap(ctx,lyric,lX,lY,lMaxW,lLineH);
      ctx.shadowBlur=0;
    }

    /* divider */
    const divY=dy+q(bH*0.72);
    ctx.strokeStyle=light?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)';
    ctx.lineWidth=Math.max(1,scale*0.7);
    ctx.beginPath(); ctx.moveTo(dx+bW*0.04,divY); ctx.lineTo(dx+bW*0.96,divY); ctx.stroke();

    /* song/artist */
    const sFs=q(B*0.040), aFs=q(B*0.028), mY=divY+q(bH*0.04);
    ctx.textBaseline='top'; ctx.textAlign='left'; ctx.shadowBlur=0;
    ctx.font=`700 ${sFs}px 'DM Sans',sans-serif`;
    ctx.fillStyle=bodyTxt; ctx.fillText(song,dx+bW*0.05,mY);
    ctx.font=`400 ${aFs}px 'Space Mono',monospace`;
    ctx.fillStyle=mutedTxt; ctx.fillText(artist,dx+bW*0.05,mY+sFs*1.2);

    /* emotion pill */
    if(emotion){
      const eFs=q(B*0.028);
      ctx.font=`800 ${eFs}px 'Syne','DM Sans',sans-serif`;
      const etW=ctx.measureText(emotion).width;
      const epX=q(B*0.020),epY2=q(B*0.016);
      const epW=etW+epX*2,epH=eFs+epY2*2;
      const epL=dx+bW*0.95-epW,epT=mY+(sFs*1.2+aFs)/2-epH/2;
      roundRect(ctx,epL,epT,epW,epH,epH/2);
      ctx.fillStyle=col+'25'; ctx.fill();
      ctx.strokeStyle=col+'55'; ctx.lineWidth=scale; ctx.stroke();
      ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(emotion,epL+epW/2,epT+epH/2);
    }
    ctx.restore();
  }

  drawBubble('left',  parent, curY, bubbleH); curY += bubbleH;

  /* lyric back divider */
  {
    const am=getAm(0.3), lineY=curY+divH/2;
    const eU=('@'+(echo.username||'anonymous')).toUpperCase();
    ctx.save();
    ctx.globalAlpha=am.alpha!==undefined?am.alpha:1;
    ctx.translate(am.ox||0,am.oy||0);
    const aRgba=light?'rgba(0,0,0,0.22)':'rgba(232,197,71,0.28)';
    const gl=ctx.createLinearGradient(pad,0,W*0.28,0);
    gl.addColorStop(0,'transparent'); gl.addColorStop(1,aRgba);
    ctx.strokeStyle=gl; ctx.lineWidth=scale;
    ctx.beginPath(); ctx.moveTo(pad,lineY); ctx.lineTo(W*0.28,lineY); ctx.stroke();
    const pFs=q(B*0.022);
    const pillTxt='LYRIC BACK ↩ '+eU;
    ctx.font=`800 ${pFs}px 'Syne','DM Sans',sans-serif`;
    const ptW=ctx.measureText(pillTxt).width;
    const ppPX=pFs*0.65,ppPY=pFs*0.38;
    const ppW=ptW+ppPX*2,ppH=pFs+ppPY*2;
    const ppX=q(W*0.285),ppY=lineY-ppH/2;
    roundRect(ctx,ppX,ppY,ppW,ppH,ppH/2);
    ctx.fillStyle=light?'rgba(0,0,0,0.06)':'rgba(232,197,71,0.09)'; ctx.fill();
    ctx.strokeStyle=light?'rgba(0,0,0,0.18)':'rgba(232,197,71,0.28)';
    ctx.lineWidth=scale; ctx.stroke();
    ctx.fillStyle=light?'#0B0B0D':theme.acc;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(pillTxt,ppX+ppPX,lineY);
    const grStart=ppX+ppW+W*0.008;
    const gr=ctx.createLinearGradient(grStart,0,W-pad,0);
    gr.addColorStop(0,aRgba); gr.addColorStop(1,'transparent');
    ctx.strokeStyle=gr; ctx.lineWidth=scale;
    ctx.beginPath(); ctx.moveTo(grStart,lineY); ctx.lineTo(W-pad,lineY); ctx.stroke();
    ctx.restore();
    curY += divH;
  }

  drawBubble('right', echo,   curY, bubbleH); curY += bubbleH;

  /* songs bar */
  {
    const pk=parent.knowledge||{};
    const pS=(pk.song||parent.song||'').substring(0,16);
    const pA=(pk.artist||parent.artist||'').substring(0,18);
    const eS=(echo.song||'').substring(0,16);
    const eA=(echo.artist||'').substring(0,18);
    const bPad=q(B*0.028), bY=curY+q((songsH-songsH*0.78)/2), bH2=q(songsH*0.78);
    roundRect(ctx,pad,bY,innerW,bH2,q(B*0.014));
    ctx.fillStyle=light?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle=light?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.1)';
    ctx.lineWidth=scale; ctx.stroke();
    const lFs2=q(B*0.024),sFs2=q(B*0.028),aFs2=q(B*0.020);
    ctx.font=`800 ${lFs2}px 'Syne','DM Sans',sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle=light?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.7)';
    ctx.fillText('SONGS',pad+bPad,bY+bH2/2);
    const rSec=pad+innerW*0.34;
    ctx.font=`700 ${sFs2}px 'DM Sans',sans-serif`;
    ctx.fillStyle=light?'#0B0B0D':'#ffffff'; ctx.textAlign='left';
    ctx.fillText(pS,rSec,bY+bH2*0.33);
    ctx.font=`400 ${aFs2}px 'Space Mono',monospace`;
    ctx.fillStyle=mutedTxt; ctx.fillText(pA,rSec,bY+bH2*0.70);
    ctx.font=`${q(B*0.030)}px sans-serif`;
    ctx.fillStyle=theme.acc; ctx.globalAlpha=0.7; ctx.textAlign='center';
    ctx.fillText('↔',W/2,bY+bH2/2+1); ctx.globalAlpha=1;
    ctx.font=`700 ${sFs2}px 'DM Sans',sans-serif`;
    ctx.fillStyle=light?'#0B0B0D':'#ffffff'; ctx.textAlign='right';
    ctx.fillText(eS,W-pad-bPad,bY+bH2*0.33);
    ctx.font=`400 ${aFs2}px 'Space Mono',monospace`;
    ctx.fillStyle=mutedTxt; ctx.fillText(eA,W-pad-bPad,bY+bH2*0.70);
    curY += songsH;
  }

  /* watermark */
  {
    const text='trymargo.com', fSize=q(B*0.020);
    ctx.font=`700 ${fSize}px 'Space Mono',monospace`;
    ctx.textBaseline='middle'; ctx.textAlign='center';
    const tW=ctx.measureText(text).width;
    const pX=fSize*0.9,pY=fSize*0.5,pW=tW+pX*2,pH=fSize+pY*2;
    const pillX=W/2-pW/2,pillY=curY+(wmH-pH)/2;
    roundRect(ctx,pillX,pillY,pW,pH,pH/2);
    ctx.fillStyle=light?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.09)'; ctx.fill();
    ctx.strokeStyle=light?'rgba(0,0,0,0.18)':'rgba(255,255,255,0.18)';
    ctx.lineWidth=scale; ctx.stroke();
    ctx.fillStyle=light?'#0B0B0D':'#ffffff'; ctx.shadowBlur=0;
    ctx.fillText(text,W/2,pillY+pH/2);
  }

  /* M icon */
  {
    const sz=q(B*0.055), mx=W-q(W*0.034)-sz/2, my=H-q(H*0.030)-sz/2;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=8*scale;
    ctx.fillStyle=theme.acc;
    ctx.beginPath(); ctx.arc(mx,my,sz/2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.strokeStyle=light?'#ffffff':'#0B0B0D';
    ctx.lineWidth=2.8*scale; ctx.lineCap='round'; ctx.lineJoin='round';
    const ic=sz*0.52,ix=mx-ic/2,iy=my-ic/2;
    ctx.beginPath();
    ctx.moveTo(ix,iy+ic*0.72); ctx.lineTo(ix,iy+ic*0.18);
    ctx.lineTo(ix+ic*0.38,iy+ic*0.54); ctx.lineTo(ix+ic*0.5,iy+ic*0.12);
    ctx.lineTo(ix+ic*0.62,iy+ic*0.54); ctx.lineTo(ix+ic,iy+ic*0.18);
    ctx.lineTo(ix+ic,iy+ic*0.72); ctx.stroke();
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════
   CARD FRAME DRAW
   ════════════════════════════════════════════════════════ */
function drawCardFrame(ctx, W, H, t, DS, theme) {
  const mot    = DS.motion || 'fade-up';
  const ff     = DS.fontFamily || 'DM Serif Display';
  const italic = isItalic(ff);
  const parent = DS.parentPost || {};
  const echo   = DS.echoPost   || {};
  const light  = !!theme.light;
  const B      = Math.min(W, H);
  const scale  = B / 500;
  const isWide = W > H * 1.2;
  const bodyTxt  = light ? '#0B0B0D' : '#ffffff';
  const mutedTxt = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.48)';
  const colL     = theme.l || theme.acc;
  const colR     = theme.r || theme.acc;

  /* background */
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,theme.g1); bg.addColorStop(1,theme.g2);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const g1=ctx.createRadialGradient(W*0.2,H*0.25,0,W*0.2,H*0.25,W*0.6);
  g1.addColorStop(0,theme.glow1||'rgba(232,197,71,0.18)'); g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);
  const g2=ctx.createRadialGradient(W*0.8,H*0.75,0,W*0.8,H*0.75,W*0.5);
  g2.addColorStop(0,theme.glow2||'rgba(107,140,255,0.14)'); g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);

  function animT(delay) { return Math.max(0,Math.min(1,(t-delay)/Math.max(0.01,1-delay))); }
  function getAm(delay) {
    const ta=animT(delay),e=easeInOut(ta);
    switch(mot){
      case 'fade-up':  return {ox:0,oy:(1-e)*14*scale,alpha:Math.min(1,e*2.2)};
      case 'slide-in': return {ox:(1-easeInOut(Math.min(1,ta/0.7)))*W*0.22,oy:0,alpha:Math.min(1,ta*2)};
      case 'pulse':    return {ox:0,oy:0,alpha:1,pulse:0.94+0.06*Math.sin(t*Math.PI*2)};
      case 'glitch':   { const ph=Math.floor(t*9),isG=ph%3===0&&t<0.85; return {ox:isG?((ph*7919)%11-5)*scale:0,oy:0,alpha:1}; }
      case 'wave':     return {ox:0,oy:Math.sin(t*Math.PI*2+delay*3)*5*scale,alpha:1};
      case 'bounce':   { const b=ta<0.5?4*ta*ta*ta:1-Math.pow(-2*ta+2,3)/2; return {ox:0,oy:(1-b)*H*0.05,alpha:1}; }
      default:         return {ox:0,oy:(1-e)*14*scale,alpha:Math.min(1,e*2.2)};
    }
  }

  const pad    = q(B*0.048);
  const mFs    = q(B*0.034);

  /* MARGO label */
  ctx.save();
  ctx.font=`800 ${mFs}px 'Syne','DM Sans',sans-serif`;
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.globalAlpha=0.28; ctx.fillStyle=light?'#0B0B0D':theme.acc;
  ctx.fillText('MARGO',pad,pad);
  ctx.restore();

  const labelH = mFs*2.2;
  const songsH = q(B*0.078);
  const wmH    = q(B*0.048);
  const divH   = q(B*isWide?0.00:0.062);
  const availH = H - pad - labelH - (isWide?0:divH) - songsH - wmH - pad;

  let c1X,c1Y,c1W,c1H,c2X,c2Y,c2W,c2H,divMidX,divMidY;

  if(isWide){
    const gap=q(B*0.05);
    c1W=q((W-pad*2-gap)*0.5); c1H=availH;
    c1X=pad; c1Y=pad+labelH;
    c2W=c1W; c2H=availH;
    c2X=W-pad-c2W; c2Y=c1Y;
    divMidX=W/2; divMidY=c1Y+c1H/2;
  } else {
    c1W=W-pad*2; c1H=q(availH*0.47);
    c1X=pad; c1Y=pad+labelH;
    c2W=W-pad*2; c2H=q(availH*0.47);
    c2X=pad; c2Y=c1Y+c1H+divH;
    divMidX=W/2; divMidY=c1Y+c1H+divH/2;
  }

  /* card draw fn */
  function drawCard(post,cx,cy,cw,ch,col,delay){
    const pk     = post.knowledge||{};
    const song   = (pk.song||post.song||'').substring(0,26);
    const artist = (pk.artist||post.artist||'').substring(0,28);
    const lyric  = (post.lyric||post.text||'').substring(0,120);
    const uname  = ('@'+(post.username||'anonymous')).toUpperCase();
    const am     = getAm(delay);
    const p      = am.pulse||1;

    ctx.save();
    ctx.globalAlpha=am.alpha!==undefined?am.alpha:1;
    ctx.translate(cx+cw/2+(am.ox||0),cy+ch/2+(am.oy||0));
    ctx.scale(p,p);
    const dx=-cw/2,dy=-ch/2,r=q(B*0.024);

    roundRect(ctx,dx,dy,cw,ch,r);
    ctx.fillStyle=col+'18'; ctx.fill();
    ctx.strokeStyle=col+'40'; ctx.lineWidth=Math.max(1,scale*0.8); ctx.stroke();

    const ig=ctx.createRadialGradient(dx,dy,0,dx+cw,dy+ch,cw*0.9);
    ig.addColorStop(0,col+'15'); ig.addColorStop(1,'transparent');
    roundRect(ctx,dx,dy,cw,ch,r); ctx.fillStyle=ig; ctx.fill();

    /* lyric */
    const lFs=q(B*0.054), lLineH=lFs*1.42;
    const lX=dx+cw*0.07, lY=dy+ch*0.10, lMaxW=cw*0.86;
    ctx.font=`${italic?'italic ':''}600 ${lFs}px ${fStack(ff)}`;
    ctx.fillStyle=bodyTxt; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=5*scale;

    if(mot==='shimmer'){
      wrap(ctx,lyric,lX,lY,lMaxW,lLineH);
      const sx=(t*(cw+80*scale))-40*scale+dx;
      const sh=ctx.createLinearGradient(sx-40*scale,0,sx+40*scale,0);
      sh.addColorStop(0,'transparent'); sh.addColorStop(0.4,theme.acc);
      sh.addColorStop(0.6,'#ffffff'); sh.addColorStop(1,'transparent');
      ctx.save(); ctx.globalCompositeOperation='source-atop'; ctx.globalAlpha=0.7;
      ctx.fillStyle=sh; wrap(ctx,lyric,lX,lY,lMaxW,lLineH); ctx.restore();
    } else if(mot==='typewriter'){
      const chars=Math.floor(animT(delay)*(lyric.length+4));
      const vis=lyric.substring(0,Math.min(chars,lyric.length));
      const cur=chars<=lyric.length&&(Math.floor(t*10)%2===0)?'|':'';
      ctx.fillStyle=bodyTxt; wrap(ctx,vis+cur,lX,lY,lMaxW,lLineH);
    } else {
      wrap(ctx,lyric,lX,lY,lMaxW,lLineH);
    }
    ctx.shadowBlur=0;

    /* song · artist · @user */
    const atFs=q(B*0.024);
    ctx.font=`400 ${atFs}px 'Space Mono',monospace`;
    ctx.fillStyle=col; ctx.textAlign='left'; ctx.textBaseline='bottom';
    const songMeta=(song?(song+(artist?' — '+artist:'')):'')+(song?' · ':'')+uname;
    ctx.fillText(songMeta.substring(0,52),dx+cw*0.07,dy+ch-ch*0.07);
    ctx.restore();
  }

  drawCard(parent,c1X,c1Y,c1W,c1H,colL,0.08);

  /* divider pill */
  {
    const am=getAm(0.28);
    const eU=('@'+(echo.username||'anonymous')).toUpperCase();
    ctx.save();
    ctx.globalAlpha=am.alpha!==undefined?am.alpha:1;
    ctx.translate(am.ox||0,am.oy||0);
    const pFs=q(B*0.021);
    const pillTxt='LYRIC BACK ↩ '+eU;
    ctx.font=`800 ${pFs}px 'Syne','DM Sans',sans-serif`;
    const ptW=ctx.measureText(pillTxt).width;
    const ppPX=pFs*0.65,ppPY=pFs*0.38;
    const ppW=ptW+ppPX*2,ppH=pFs+ppPY*2;
    const ppX=divMidX-ppW/2,ppY=divMidY-ppH/2;
    const aRgba=light?'rgba(0,0,0,0.22)':'rgba(232,197,71,0.28)';

    if(isWide){
      const lx=divMidX;
      const v1=ctx.createLinearGradient(0,c1Y,0,ppY);
      v1.addColorStop(0,'transparent'); v1.addColorStop(1,aRgba);
      ctx.strokeStyle=v1; ctx.lineWidth=scale;
      ctx.beginPath(); ctx.moveTo(lx,c1Y); ctx.lineTo(lx,ppY); ctx.stroke();
      const v2=ctx.createLinearGradient(0,ppY+ppH,0,c1Y+c1H);
      v2.addColorStop(0,aRgba); v2.addColorStop(1,'transparent');
      ctx.strokeStyle=v2;
      ctx.beginPath(); ctx.moveTo(lx,ppY+ppH); ctx.lineTo(lx,c1Y+c1H); ctx.stroke();
    } else {
      const h1=ctx.createLinearGradient(pad,0,ppX,0);
      h1.addColorStop(0,'transparent'); h1.addColorStop(1,aRgba);
      ctx.strokeStyle=h1; ctx.lineWidth=scale;
      ctx.beginPath(); ctx.moveTo(pad,divMidY); ctx.lineTo(ppX,divMidY); ctx.stroke();
      const h2=ctx.createLinearGradient(ppX+ppW,0,W-pad,0);
      h2.addColorStop(0,aRgba); h2.addColorStop(1,'transparent');
      ctx.strokeStyle=h2;
      ctx.beginPath(); ctx.moveTo(ppX+ppW,divMidY); ctx.lineTo(W-pad,divMidY); ctx.stroke();
    }

    roundRect(ctx,ppX,ppY,ppW,ppH,ppH/2);
    ctx.fillStyle=light?'rgba(0,0,0,0.06)':'rgba(232,197,71,0.09)'; ctx.fill();
    ctx.strokeStyle=light?'rgba(0,0,0,0.18)':'rgba(232,197,71,0.28)';
    ctx.lineWidth=scale; ctx.stroke();
    ctx.fillStyle=light?'#0B0B0D':theme.acc;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pillTxt,divMidX,divMidY);
    ctx.restore();
  }

  drawCard(echo,c2X,c2Y,c2W,c2H,colR,0.46);

  /* songs bar */
  {
    const pk=parent.knowledge||{};
    const pS=(pk.song||parent.song||'').substring(0,16);
    const pA=(pk.artist||parent.artist||'').substring(0,18);
    const eS=(echo.song||'').substring(0,16);
    const eA=(echo.artist||'').substring(0,18);
    const bY=H-pad-wmH-songsH+q(songsH*0.1), bH2=q(songsH*0.8), bPad=q(B*0.026);
    roundRect(ctx,pad,bY,W-pad*2,bH2,q(B*0.012));
    ctx.fillStyle=light?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle=light?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.1)';
    ctx.lineWidth=scale; ctx.stroke();
    const lFs2=q(B*0.022),sFs2=q(B*0.026),aFs2=q(B*0.019);
    ctx.font=`800 ${lFs2}px 'Syne','DM Sans',sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle=light?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.7)';
    ctx.fillText('SONGS',pad+bPad,bY+bH2/2);
    const rSec=pad+(W-pad*2)*0.34;
    ctx.font=`700 ${sFs2}px 'DM Sans',sans-serif`;
    ctx.fillStyle=light?'#0B0B0D':'#ffffff'; ctx.textAlign='left';
    ctx.fillText(pS,rSec,bY+bH2*0.33);
    ctx.font=`400 ${aFs2}px 'Space Mono',monospace`;
    ctx.fillStyle=mutedTxt; ctx.fillText(pA,rSec,bY+bH2*0.70);
    ctx.font=`${q(B*0.028)}px sans-serif`;
    ctx.fillStyle=theme.acc; ctx.globalAlpha=0.7; ctx.textAlign='center';
    ctx.fillText('↔',W/2,bY+bH2/2+1); ctx.globalAlpha=1;
    ctx.font=`700 ${sFs2}px 'DM Sans',sans-serif`;
    ctx.fillStyle=light?'#0B0B0D':'#ffffff'; ctx.textAlign='right';
    ctx.fillText(eS,W-pad-bPad,bY+bH2*0.33);
    ctx.font=`400 ${aFs2}px 'Space Mono',monospace`;
    ctx.fillStyle=mutedTxt; ctx.fillText(eA,W-pad-bPad,bY+bH2*0.70);
  }

  /* watermark */
  {
    const text='trymargo.com', fSize=q(B*0.019);
    ctx.font=`700 ${fSize}px 'Space Mono',monospace`;
    ctx.textBaseline='middle'; ctx.textAlign='center';
    const tW=ctx.measureText(text).width;
    const pX=fSize*0.9,pY=fSize*0.45,pW=tW+pX*2,pH=fSize+pY*2;
    const pillX=W/2-pW/2,pillY=H-pad-pH*0.9;
    roundRect(ctx,pillX,pillY,pW,pH,pH/2);
    ctx.fillStyle=light?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.09)'; ctx.fill();
    ctx.strokeStyle=light?'rgba(0,0,0,0.18)':'rgba(255,255,255,0.18)';
    ctx.lineWidth=scale; ctx.stroke();
    ctx.fillStyle=light?'#0B0B0D':'#ffffff'; ctx.shadowBlur=0;
    ctx.fillText(text,W/2,pillY+pH/2);
  }

  /* M icon */
  {
    const sz=q(B*0.052),mx=W-q(W*0.032)-sz/2,my=H-q(H*0.028)-sz/2;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=7*scale;
    ctx.fillStyle=theme.acc;
    ctx.beginPath(); ctx.arc(mx,my,sz/2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.strokeStyle=light?'#ffffff':'#0B0B0D';
    ctx.lineWidth=2.8*scale; ctx.lineCap='round'; ctx.lineJoin='round';
    const ic=sz*0.52,ix=mx-ic/2,iy=my-ic/2;
    ctx.beginPath();
    ctx.moveTo(ix,iy+ic*0.72); ctx.lineTo(ix,iy+ic*0.18);
    ctx.lineTo(ix+ic*0.38,iy+ic*0.54); ctx.lineTo(ix+ic*0.5,iy+ic*0.12);
    ctx.lineTo(ix+ic*0.62,iy+ic*0.54); ctx.lineTo(ix+ic,iy+ic*0.18);
    ctx.lineTo(ix+ic,iy+ic*0.72); ctx.stroke();
    ctx.restore();
  }
}

/* ════════════════════════════════════════════════════════
   PREVIEW LOOP
   ════════════════════════════════════════════════════════ */
const PV = { _raf:null, _frame:0, _last:0, _size:0 };

function _startPreview() {
  _stopPreview();
  PV._frame=0; PV._last=0; PV._size=0;
  const loop = (ts) => {
    const DS=window._DS, themes=window._DSThemes;
    if(!DS||!themes){ PV._raf=requestAnimationFrame(loop); return; }
    const delay=Math.round((DS.dur*1000)/24);
    if(ts-PV._last>=delay){
      PV._last=ts;
      const canvas=document.getElementById('dsConvoPreviewCanvas');
      if(canvas){
        const theme=themes[DS.bgColor]||themes['#07060E'];
        const stage=canvas.parentElement;
        const dpr=window.devicePixelRatio||1;
        const w=stage?stage.clientWidth-4:340;
        const h=w; /* square preview */
        if(w!==PV._size){
          PV._size=w;
          canvas.style.width=w+'px'; canvas.style.height=h+'px';
          canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
        }
        const ctx=canvas.getContext('2d');
        ctx.setTransform(dpr,0,0,dpr,0,0);
        const isCard=document.getElementById('dsViewCard')?.style.display!=='none';
        if(isCard) drawCardFrame(ctx,w,h,PV._frame/24,DS,theme);
        else       drawConvoFrame(ctx,w,h,PV._frame/24,DS,theme);
        PV._frame=(PV._frame+1)%24;
      }
    }
    PV._raf=requestAnimationFrame(loop);
  };
  PV._raf=requestAnimationFrame(loop);
}
function _stopPreview(){
  if(PV._raf){ cancelAnimationFrame(PV._raf); PV._raf=null; }
}

/* ════════════════════════════════════════════════════════
   INJECT CANVAS into convo view
   ════════════════════════════════════════════════════════ */
function _injectCanvas(){
  const check=setInterval(()=>{
    if(!document.getElementById('duetSheet')) return;
    if(document.getElementById('dsConvoPreviewCanvas')){ clearInterval(check); return; }
    const view=document.getElementById('dsViewConvo');
    if(!view) return;
    const wrap=document.createElement('div');
    wrap.id='dsConvoCanvasWrap';
    wrap.style.cssText='padding:10px 18px 0;';
    const canvas=document.createElement('canvas');
    canvas.id='dsConvoPreviewCanvas';
    canvas.style.cssText='display:block;border-radius:14px;width:100%;background:#07060E;';
    wrap.appendChild(canvas);
    view.insertBefore(wrap,view.firstChild);
    clearInterval(check);
  },100);
}

/* ════════════════════════════════════════════════════════
   DOWNLOAD — mobile-safe
   ════════════════════════════════════════════════════════ */
function _dl(blob, fname){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=fname;
  a.style.cssText='position:fixed;top:-999px;left:-999px';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },2000);
}

/* ════════════════════════════════════════════════════════
   PROGRESS
   ════════════════════════════════════════════════════════ */
function _setProgress(btn,pct,label,color){
  if(!btn) return;
  const icon=btn.querySelector('.ds-export-icon');
  const lbl=btn.querySelector('span:last-child');
  if(icon) icon.textContent=pct>=100?'✓':'◎';
  if(lbl)  lbl.textContent=label;
  let bar=btn.querySelector('.ds-progress-bar');
  if(!bar){ bar=document.createElement('div'); bar.className='ds-progress-bar'; btn.appendChild(bar); }
  bar.style.width=pct+'%'; bar.style.background=color||'#00E5FF';
}

/* ════════════════════════════════════════════════════════
   GIF EXPORT
   ════════════════════════════════════════════════════════ */
async function _exportGif(plat,action){
  const DS=window._DS, themes=window._DSThemes;
  if(!DS||!themes) return;
  _stopPreview();
  const dlBtn=document.getElementById('dsBtnDownload');
  const shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'', origSh=shBtn?shBtn.innerHTML:'';
  if(dlBtn) dlBtn.disabled=true;
  if(shBtn) shBtn.disabled=true;
  const W=plat.w,H=plat.h,FRAMES=24;
  const DELAY=Math.round((DS.dur*1000)/FRAMES);
  const color='#00E5FF';
  const isCard=document.getElementById('dsViewCard')?.style.display!=='none';
  const drawFn=isCard?drawCardFrame:drawConvoFrame;
  _setProgress(btn,0,'Starting…',color);
  try{
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`700 1em 'DM Sans'`),
      document.fonts.load(`600 1em '${DS.fontFamily}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily}'`),
    ].map(p=>p.catch(()=>{})));
    if(typeof GIF==='undefined'){
      await new Promise((res,rej)=>{
        const sc=document.createElement('script');
        sc.src='https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload=res; sc.onerror=rej; document.head.appendChild(sc);
      });
    }
    const theme=themes[DS.bgColor]||themes['#07060E'];
    const gif=new GIF({workers:4,quality:1,width:W,height:H,workerScript:'/js/gif.worker.js',dither:false});
    const off=document.createElement('canvas');
    off.width=W; off.height=H;
    const oc=off.getContext('2d');
    for(let i=0;i<FRAMES;i++){
      oc.clearRect(0,0,W,H);
      drawFn(oc,W,H,i/FRAMES,DS,theme);
      gif.addFrame(off,{copy:true,delay:DELAY});
      _setProgress(btn,Math.round((i/FRAMES)*72),'Frame '+(i+1)+'/'+FRAMES,color);
      await new Promise(r=>setTimeout(r,0));
    }
    gif.on('progress',p=>_setProgress(btn,Math.round(72+p*26),'Encoding '+Math.round(72+p*26)+'%',color));
    gif.on('finished',async blob=>{
      _setProgress(btn,100,'✓ Done!',color);
      const name=((DS.parentPost&&(DS.parentPost.knowledge&&DS.parentPost.knowledge.song||DS.parentPost.song))||'duet').replace(/\s+/g,'-').toLowerCase();
      const fname='margo-duet-'+name+'-'+plat.id+'.gif';
      if(action==='share'&&navigator.share){
        try{ await navigator.share({files:[new File([blob],fname,{type:'image/gif'})],title:'Margo Duet',text:'trymargo.com'}); }
        catch{ _dl(blob,fname); }
      } else { _dl(blob,fname); }
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
      if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      setTimeout(_startPreview,400);
    });
    gif.render();
  }catch(err){
    console.error('[duet-export] GIF error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
    if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format||'gif');
    _startPreview();
  }
}

/* ════════════════════════════════════════════════════════
   POSTER EXPORT
   ════════════════════════════════════════════════════════ */
async function _exportPoster(plat,action){
  const DS=window._DS, themes=window._DSThemes;
  if(!DS||!themes) return;
  _stopPreview();
  const dlBtn=document.getElementById('dsBtnDownload');
  const shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'', origSh=shBtn?shBtn.innerHTML:'';
  if(dlBtn) dlBtn.disabled=true;
  if(shBtn) shBtn.disabled=true;
  const W=plat.w,H=plat.h,color='#E8C547';
  const isCard=document.getElementById('dsViewCard')?.style.display!=='none';
  const drawFn=isCard?drawCardFrame:drawConvoFrame;
  _setProgress(btn,0,'Preparing…',color);
  try{
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`700 1em 'DM Sans'`),
      document.fonts.load(`600 1em '${DS.fontFamily}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily}'`),
    ].map(p=>p.catch(()=>{})));
    _setProgress(btn,20,'Rendering…',color);
    const theme=themes[DS.bgColor]||themes['#07060E'];
    const off=document.createElement('canvas');
    off.width=W; off.height=H;
    const oc=off.getContext('2d');
    drawFn(oc,W,H,1,DS,theme); /* t=1 = fully visible */
    _setProgress(btn,80,'Saving…',color);
    off.toBlob(async blob=>{
      if(!blob) return;
      _setProgress(btn,100,'✓ Done!',color);
      const name=((DS.parentPost&&(DS.parentPost.knowledge&&DS.parentPost.knowledge.song||DS.parentPost.song))||'duet').replace(/\s+/g,'-').toLowerCase();
      const fname='margo-poster-'+name+'-'+plat.id+'.png';
      if(action==='share'&&navigator.share){
        try{ await navigator.share({files:[new File([blob],fname,{type:'image/png'})],title:'Margo Poster',text:'trymargo.com'}); }
        catch{ _dl(blob,fname); }
      } else { _dl(blob,fname); }
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
      if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
      setTimeout(_startPreview,400);
    },'image/png',0.95);
  }catch(err){
    console.error('[duet-export] Poster error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
    if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format||'poster');
    _startPreview();
  }
}

/* ════════════════════════════════════════════════════════
   HOOK openDuetSheet / closeDuetSheet
   ════════════════════════════════════════════════════════ */
const _origOpen=window.openDuetSheet;
const _origClose=window.closeDuetSheet;
window.openDuetSheet=function(parentPost,echoPost){
  if(_origOpen) _origOpen(parentPost,echoPost);
  setTimeout(()=>{ _injectCanvas(); setTimeout(_startPreview,200); },80);
};
window.closeDuetSheet=function(){
  _stopPreview();
  if(_origClose) _origClose();
};

/* PUBLIC API */
window._duetExport={
  gif:          _exportGif,
  poster:       _exportPoster,
  startPreview: _startPreview,
  stopPreview:  _stopPreview,
};

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_injectCanvas);
} else {
  _injectCanvas();
}

})();
