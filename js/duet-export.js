/* ============================================================
   MARGO — js/duet-export.js  v9.0
   ─ Preview  : HTML from duet-sheet.js — NOT TOUCHED
   ─ Export   : _dsDrawCard design from main duet-sheet.js
                + animation math from gif-studio.js gsDrawFrame
   ─ No canvas injection, no HTML hiding, no preview loop
   ============================================================ */

(function () {

/* ── helpers ── */
function q(n) { return Math.round(n); }

function _wrap(ctx, text, maxW) {
  const words = String(text || '').split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function _ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

/* ── Vibe colours ── */
const _VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};

/* ── Frame counts per animation ── */
const _FRAMES = {
  'fade-up':24, 'typewriter':32, 'slide-in':22,
  'pulse':20, 'glitch':18, 'wave':28, 'shimmer':24, 'bounce':22,
};

/* ── Speed ms ── */
const _SPEED = { slow:130, normal:70, fast:35 };

/* ════════════════════════════════════════════════════════════
   DRAW FRAME
   Exact port of _dsDrawCard from main duet-sheet.js v2.1
   + lyric animation layer from gif-studio.js gsDrawFrame
   t = null → static poster  |  t = 0..1 → animated GIF frame
════════════════════════════════════════════════════════════ */
function _drawFrame(ctx, W, H, t, DS) {
  const isStatic = (t === null || t === undefined);
  const parent   = DS.parentPost || {};
  const echo     = DS.echoPost   || {};
  const mot      = DS.motion     || 'fade-up';
  const ff       = DS.fontFamily || 'DM Serif Display';
  const italic   = DS.fontItalic !== false;
  const scale    = W / 500;

  const pVibe = _VIBE[parent.emotion || 'Nostalgia'] || '#E8C547';
  const eVibe = _VIBE[echo.emotion   || 'Nostalgia'] || '#E8C547';
  const pad   = W * 0.07;
  const iW    = W - pad * 2;
  const divY  = H * 0.495;

  /* 1 — Background */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#090810');
  bg.addColorStop(0.48, '#0d0b12');
  bg.addColorStop(0.52, '#080c10');
  bg.addColorStop(1,    '#060809');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  /* 2 — Radial vibe glows */
  ctx.save();
  const pg = ctx.createRadialGradient(W*0.15,H*0.15,0, W*0.15,H*0.15,W*0.7);
  pg.addColorStop(0, pVibe+'22'); pg.addColorStop(1,'transparent');
  ctx.fillStyle = pg; ctx.fillRect(0,0,W,H); ctx.restore();

  ctx.save();
  const eg = ctx.createRadialGradient(W*0.85,H*0.85,0, W*0.85,H*0.85,W*0.7);
  eg.addColorStop(0, eVibe+'22'); eg.addColorStop(1,'transparent');
  ctx.fillStyle = eg; ctx.fillRect(0,0,W,H); ctx.restore();

  /* 3 — Grain */
  ctx.save(); ctx.globalAlpha = 0.016;
  for (let y=0;y<H;y+=4) for (let x=0;x<W;x+=4) {
    const v = Math.random()*255|0;
    ctx.fillStyle=`rgb(${v},${v},${v})`; ctx.fillRect(x,y,4,4);
  }
  ctx.restore();

  /* 4 — Accent lines */
  ctx.save();
  const tl = ctx.createLinearGradient(0,0,W,0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(0.5,pVibe); tl.addColorStop(1,'transparent');
  ctx.globalAlpha=0.65; ctx.fillStyle=tl; ctx.fillRect(0,0,W,2);
  const bl = ctx.createLinearGradient(0,0,W,0);
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

  /* ── Animation helpers (from gsDrawFrame) ── */
  function animT(delay) {
    if (isStatic) return 1;
    return Math.max(0, Math.min(1, (t-delay) / Math.max(0.01, 1-delay)));
  }
  function getAnim(delay) {
    if (isStatic) return { alpha:1, ox:0, oy:0, sc:1 };
    const ta=animT(delay), e=_ease(ta);
    switch(mot) {
      case 'fade-up':   return { alpha:Math.min(1,e*2.2), ox:0, oy:(1-e)*38*scale, sc:1 };
      case 'slide-in':  { const eo=1-Math.pow(1-Math.min(1,ta/0.7),3);
                          return { alpha:Math.min(1,eo*1.6), ox:(1-eo)*W*0.28, oy:0, sc:1 }; }
      case 'pulse':     return { alpha:1, ox:0, oy:0, sc:0.93+0.07*Math.sin(t*Math.PI*2+delay) };
      case 'glitch':    { const ph=Math.floor(t*9),isG=ph%3===0&&t<0.85;
                          return { alpha:1, ox:isG?(Math.random()-0.5)*10*scale:0, oy:0, sc:1, glitch:isG }; }
      case 'wave':      return { alpha:1, ox:0, oy:Math.sin(t*Math.PI*2+delay*3)*5*scale, sc:1 };
      case 'bounce':    { const b=ta<0.5?4*ta*ta*ta:1-Math.pow(-2*ta+2,3)/2;
                          return { alpha:1, ox:0, oy:(1-b)*H*0.06, sc:0.86+b*0.14 }; }
      case 'shimmer':   return { alpha:1, ox:0, oy:0, sc:1, shimmer:true };
      case 'typewriter':return { alpha:1, ox:0, oy:0, sc:1, typewriter:true };
      default:          return { alpha:Math.min(1,e*2.2), ox:0, oy:(1-e)*38*scale, sc:1 };
    }
  }

  /* Draw lyric block with animation */
  function drawLyric(text, cx, baseY, maxW, fontStr, delay, alpha_base) {
    const am = getAnim(delay);
    ctx.save();
    ctx.font = fontStr;
    let lines = _wrap(ctx, text, maxW);
    /* Auto-reduce font if too many lines */
    if (lines.length > 3) {
      const m = fontStr.match(/(\d+)px/);
      if (m) {
        const ns = Math.max(W*0.028, parseFloat(m[1])*(3/lines.length));
        fontStr  = fontStr.replace(/\d+px/, q(ns)+'px');
        ctx.font = fontStr;
        lines    = _wrap(ctx, text, maxW);
      }
    }
    const lh      = parseFloat(fontStr.match(/(\d+)px/)[1]) * 1.52;
    const blockH  = lines.length * lh;
    const startY  = baseY;

    ctx.textBaseline = 'top'; ctx.textAlign = 'center';

    if (am.shimmer) {
      ctx.globalAlpha = alpha_base;
      ctx.fillStyle   = '#ffffff99';
      lines.forEach((l,i) => ctx.fillText(l, cx, startY+am.oy+i*lh));
      const sx = t*(W+160*scale)-80*scale;
      const sh = ctx.createLinearGradient(sx-70*scale,0,sx+70*scale,0);
      sh.addColorStop(0,'transparent'); sh.addColorStop(0.4,'#E8C547');
      sh.addColorStop(0.6,'#ffffff');   sh.addColorStop(1,'transparent');
      ctx.save(); ctx.globalCompositeOperation='source-atop';
      ctx.fillStyle=sh; lines.forEach((l,i)=>ctx.fillText(l,cx,startY+am.oy+i*lh));
      ctx.restore();
    } else if (am.typewriter) {
      const ta2   = animT(delay);
      const chars = Math.floor(ta2*(text.length+6));
      const vis   = text.substring(0,Math.min(chars,text.length));
      const cur   = chars<=text.length&&(Math.floor(t*10)%2===0)?'|':'';
      ctx.globalAlpha=alpha_base; ctx.fillStyle='#ffffff';
      ctx.shadowColor='rgba(0,0,0,0.35)'; ctx.shadowBlur=10*scale;
      _wrap(ctx,vis+cur,maxW).forEach((l,i)=>ctx.fillText(l,cx,startY+i*lh));
    } else if (am.sc !== 1) {
      const cy2 = startY+blockH/2;
      ctx.globalAlpha=alpha_base*am.alpha;
      ctx.translate(cx, cy2+am.oy); ctx.scale(am.sc,am.sc);
      ctx.fillStyle='#ffffff';
      ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=12*scale;
      lines.forEach((l,i)=>ctx.fillText(l,0,-blockH/2+i*lh));
    } else if (am.glitch) {
      if (am.glitch) {
        ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle='#ff0040';
        ctx.translate(3*scale,0);
        lines.forEach((l,i)=>ctx.fillText(l,cx+am.ox,startY+am.oy+i*lh));
        ctx.restore();
      }
      ctx.globalAlpha=alpha_base; ctx.fillStyle='#ffffff';
      ctx.translate(am.ox,0);
      lines.forEach((l,i)=>ctx.fillText(l,cx,startY+am.oy+i*lh));
    } else {
      ctx.globalAlpha=alpha_base*am.alpha; ctx.fillStyle='#ffffff';
      ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=16*scale;
      lines.forEach((l,i)=>ctx.fillText(l,cx+am.ox,startY+am.oy+i*lh));
    }
    ctx.shadowBlur=0; ctx.restore();
  }

  /* 6 — Top lyric (parent) — dimmed */
  const topH   = divY*0.9 - pad*2;
  const pText  = parent.text || parent.lyric || '';
  let pFS      = Math.min(W*0.054, topH*0.3);
  const pFont  = `${italic?'italic ':''}600 ${q(pFS)}px '${ff}',serif`;
  ctx.font = pFont;
  const pLines = _wrap(ctx, pText, iW*0.9);
  const pActFS = pLines.length>3 ? Math.max(W*0.028,pFS*(3/pLines.length)) : pFS;
  const pLH    = pActFS*1.52;
  const pBlockH= Math.min(pLines.length,3)*pLH;
  const pStartY= pad*2 + (topH-pBlockH)/2 - pActFS*0.3;
  drawLyric(pText, W/2, pStartY, iW*0.9,
    `${italic?'italic ':''}600 ${q(pActFS)}px '${ff}',serif`,
    0.0, 0.58);

  /* 7 — Parent song attribution */
  const pk = parent.knowledge || {};
  const pSongStr = pk.song || parent.song || '';
  if (pSongStr) {
    const paFS = Math.max(9, W*0.019);
    ctx.save();
    ctx.font=`700 ${paFS}px 'Space Mono',monospace`;
    ctx.fillStyle=pVibe; ctx.globalAlpha=0.42;
    ctx.textBaseline='bottom'; ctx.textAlign='center';
    let paStr = pSongStr+((pk.artist||parent.artist)?' — '+(pk.artist||parent.artist):'');
    while(ctx.measureText(paStr).width>iW*0.8&&paStr.length>4) paStr=paStr.slice(0,-4)+'…';
    ctx.fillText(paStr, W/2, divY-W*0.045);
    ctx.restore();
  }

  /* 8 — LYRIC BACK divider pill (exact from _dsDrawCard) */
  const dText = `LYRIC BACK ↩  @${(echo.username||'anonymous').toUpperCase()}`;
  const dFS   = Math.max(10, W*0.021);
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  const dTW=ctx.measureText(dText).width;
  const pH=dFS*1.95, pPH=W*0.028, pW=dTW+pPH*2;
  const pX=W/2-pW/2, pY=divY-pH/2, pR=pH/2;

  ctx.save();
  const gap=pW/2+W*0.018;
  [[pad,W/2-gap],[W/2+gap,W-pad]].forEach(([x1,x2])=>{
    const lg=ctx.createLinearGradient(x1,0,x2,0);
    if(x1===pad){lg.addColorStop(0,'transparent');lg.addColorStop(1,'rgba(232,197,71,0.22)');}
    else{lg.addColorStop(0,'rgba(232,197,71,0.22)');lg.addColorStop(1,'transparent');}
    ctx.fillStyle=lg; ctx.fillRect(x1,divY-0.75,x2-x1,1.5);
  });
  ctx.restore();

  ctx.save();
  ctx.shadowColor='#E8C547'; ctx.shadowBlur=14;
  ctx.strokeStyle='rgba(232,197,71,0.6)'; ctx.lineWidth=1.5;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.stroke(); ctx.shadowBlur=0;
  const pFill=ctx.createLinearGradient(pX,pY,pX,pY+pH);
  pFill.addColorStop(0,'rgba(232,197,71,0.14)'); pFill.addColorStop(1,'rgba(232,197,71,0.06)');
  ctx.fillStyle=pFill;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.fill();
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.95;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(dText, W/2, divY);
  ctx.restore();

  /* 9 — Bottom lyric (echo) — prominent */
  const botTop  = divY+pH/2+W*0.025;
  const botH    = H*0.88-botTop;
  const eText   = echo.lyric||echo.text||'';
  let eFS       = Math.min(W*0.062, botH*0.3);
  ctx.font      = `${italic?'italic ':''}700 ${q(eFS)}px '${ff}',serif`;
  const eLines  = _wrap(ctx, eText, iW*0.9);
  const eActFS  = eLines.length>3 ? Math.max(W*0.032,eFS*(3/eLines.length)) : eFS;
  const eLH     = eActFS*1.52;
  const eBlockH = Math.min(eLines.length,3)*eLH;
  const eStartY = botTop+(botH-eBlockH)/2;
  drawLyric(eText, W/2, eStartY, iW*0.9,
    `${italic?'italic ':''}700 ${q(eActFS)}px '${ff}',serif`,
    0.45, 1.0);

  /* 10 — Echo song attribution */
  if (echo.song) {
    const eaFS=Math.max(9,W*0.019);
    ctx.save();
    ctx.font=`700 ${eaFS}px 'Space Mono',monospace`;
    ctx.fillStyle='#E8C547'; ctx.globalAlpha=0.8;
    ctx.textBaseline='bottom'; ctx.textAlign='center';
    let eaStr=echo.song+(echo.artist?' — '+echo.artist:'');
    while(ctx.measureText(eaStr).width>iW*0.8&&eaStr.length>4) eaStr=eaStr.slice(0,-4)+'…';
    ctx.fillText(eaStr, W/2, H*0.89);
    ctx.restore();
  }

  /* 11 — Watermark pill (from gsDrawWatermark) */
  const wFS=Math.max(9,W*0.022);
  ctx.save();
  ctx.font=`700 ${wFS}px 'Space Mono',monospace`;
  ctx.textBaseline='middle';
  const wTxt='trymargo.com', wTW=ctx.measureText(wTxt).width;
  const wPX=wFS*1.0, wPY=wFS*0.55;
  const wW=wTW+wPX*2, wH=wFS+wPY*2, wR=wH/2;
  const wX=W/2-wW/2, wY=H*0.938-wH/2;
  ctx.beginPath();
  ctx.moveTo(wX+wR,wY); ctx.arcTo(wX+wW,wY,wX+wW,wY+wH,wR);
  ctx.arcTo(wX+wW,wY+wH,wX,wY+wH,wR); ctx.arcTo(wX,wY+wH,wX,wY,wR);
  ctx.arcTo(wX,wY,wX+wW,wY,wR); ctx.closePath();
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.22)';
  ctx.lineWidth=Math.max(1,W*0.001); ctx.stroke();
  ctx.fillStyle='#ffffff'; ctx.textAlign='center'; ctx.shadowBlur=0;
  ctx.fillText(wTxt, W/2, wY+wH/2);
  ctx.restore();
}

/* ════════════════════════════════════════════════════════════
   NO PREVIEW INJECTION — HTML from duet-sheet.js handles it
════════════════════════════════════════════════════════════ */
function _startPreview() { /* no-op — HTML preview is authoritative */ }
function _stopPreview()  { /* no-op */ }

/* ════════════════════════════════════════════════════════════
   DOWNLOAD HELPER — mobile-safe
════════════════════════════════════════════════════════════ */
function _dl(blob, fname) {
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=fname;
  a.style.cssText='position:fixed;left:-9999px;top:-9999px';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },2000);
}

/* ════════════════════════════════════════════════════════════
   PROGRESS HELPER
════════════════════════════════════════════════════════════ */
function _setProgress(btn, pct, label, color) {
  if (!btn) return;
  const icon=btn.querySelector('.ds-export-icon');
  const lbl =btn.querySelector('span:last-child');
  if(icon) icon.textContent = pct>=100?'✓':'◎';
  if(lbl)  lbl.textContent  = label;
  let bar=btn.querySelector('.ds-progress-bar');
  if(!bar){ bar=document.createElement('div'); bar.className='ds-progress-bar'; btn.appendChild(bar); }
  bar.style.width=pct+'%'; bar.style.background=color||'#00E5FF';
}

/* ════════════════════════════════════════════════════════════
   GIF EXPORT
════════════════════════════════════════════════════════════ */
async function _exportGif(plat, action) {
  const DS=window._DS;
  if (!DS) return;

  const dlBtn=document.getElementById('dsBtnDownload');
  const shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'', origSh=shBtn?shBtn.innerHTML:'';
  if(dlBtn) dlBtn.disabled=true;
  if(shBtn) shBtn.disabled=true;

  const W=plat.w, H=plat.h;
  const mot    = DS.motion||'fade-up';
  const FRAMES = _FRAMES[mot]||24;
  const DELAY  = _SPEED[DS.speed||'normal']||70;
  const color  = '#00E5FF';

  _setProgress(btn,0,'Starting…',color);
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`600 1em '${DS.fontFamily||'DM Serif Display'}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily||'DM Serif Display'}'`),
    ].map(p=>p.catch(()=>{})));

    if (typeof GIF==='undefined') {
      await new Promise((res,rej)=>{
        const sc=document.createElement('script');
        sc.src='https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        sc.onload=res; sc.onerror=rej; document.head.appendChild(sc);
      });
    }

    const gif=new GIF({
      workers:4, quality:1, width:W, height:H,
      workerScript:'/js/gif.worker.js', dither:false,
    });
    const off=document.createElement('canvas');
    off.width=W; off.height=H;
    const oc=off.getContext('2d');

    for(let i=0;i<FRAMES;i++){
      oc.clearRect(0,0,W,H);
      _drawFrame(oc,W,H,i/FRAMES,DS);
      gif.addFrame(off,{copy:true,delay:DELAY});
      _setProgress(btn,Math.round((i/FRAMES)*72),`Frame ${i+1}/${FRAMES}`,color);
      await new Promise(r=>setTimeout(r,0));
    }

    gif.on('progress',p=>_setProgress(btn,Math.round(72+p*26),`Encoding ${Math.round(72+p*26)}%`,color));
    gif.on('finished',async blob=>{
      _setProgress(btn,100,'✓ Done!',color);
      const name=((DS.parentPost&&(DS.parentPost.knowledge&&DS.parentPost.knowledge.song||DS.parentPost.song))||'duet').replace(/\s+/g,'-').toLowerCase();
      const fname='margo-duet-'+name+'-'+plat.id+'.gif';
      if(action==='share'&&navigator.share){
        try{await navigator.share({files:[new File([blob],fname,{type:'image/gif'})],title:'Margo Duet',text:'trymargo.com'});}
        catch{_dl(blob,fname);}
      }else{_dl(blob,fname);}
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
      if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    });
    gif.render();

  } catch(err) {
    console.error('[duet-export] GIF error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
    if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format||'gif');
  }
}

/* ════════════════════════════════════════════════════════════
   POSTER EXPORT
════════════════════════════════════════════════════════════ */
async function _exportPoster(plat, action) {
  const DS=window._DS;
  if (!DS) return;

  const dlBtn=document.getElementById('dsBtnDownload');
  const shBtn=document.getElementById('dsBtnShare');
  const btn=action==='download'?dlBtn:shBtn;
  const origDl=dlBtn?dlBtn.innerHTML:'', origSh=shBtn?shBtn.innerHTML:'';
  if(dlBtn) dlBtn.disabled=true;
  if(shBtn) shBtn.disabled=true;

  const W=plat.w, H=plat.h, color='#E8C547';
  _setProgress(btn,0,'Preparing…',color);
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 1em 'Syne'`),
      document.fonts.load(`700 1em 'Space Mono'`),
      document.fonts.load(`600 1em '${DS.fontFamily||'DM Serif Display'}'`),
      document.fonts.load(`italic 600 1em '${DS.fontFamily||'DM Serif Display'}'`),
    ].map(p=>p.catch(()=>{})));

    _setProgress(btn,20,'Rendering…',color);
    const off=document.createElement('canvas');
    off.width=W; off.height=H;
    const oc=off.getContext('2d');
    _drawFrame(oc,W,H,null,DS); /* null = static */

    _setProgress(btn,80,'Saving…',color);
    off.toBlob(async blob=>{
      if(!blob) return;
      _setProgress(btn,100,'✓ Done!',color);
      const name=((DS.parentPost&&(DS.parentPost.knowledge&&DS.parentPost.knowledge.song||DS.parentPost.song))||'duet').replace(/\s+/g,'-').toLowerCase();
      const fname='margo-poster-'+name+'-'+plat.id+'.png';
      if(action==='share'&&navigator.share){
        try{await navigator.share({files:[new File([blob],fname,{type:'image/png'})],title:'Margo Poster',text:'trymargo.com'});}
        catch{_dl(blob,fname);}
      }else{_dl(blob,fname);}
      if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
      if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
      if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format);
    },'image/png',0.95);

  } catch(err) {
    console.error('[duet-export] Poster error:',err);
    if(dlBtn){dlBtn.disabled=false;dlBtn.innerHTML=origDl;}
    if(shBtn){shBtn.disabled=false;shBtn.innerHTML=origSh;}
    if(window._dsSwitchFormat) window._dsSwitchFormat(DS.format||'poster');
  }
}

/* ════════════════════════════════════════════════════════════
   HOOK — expose export fns so duet-sheet.js can call them
   duet-sheet already calls window._duetExport.gif / .poster
════════════════════════════════════════════════════════════ */
const _origOpen  = window.openDuetSheet;
const _origClose = window.closeDuetSheet;

window.openDuetSheet = function(parentPost, echoPost) {
  if (_origOpen) _origOpen(parentPost, echoPost);
  /* No canvas injection — HTML preview is authoritative */
};
window.closeDuetSheet = function() {
  if (_origClose) _origClose();
};

window._duetExport = {
  gif:          _exportGif,
  poster:       _exportPoster,
  startPreview: _startPreview,
  stopPreview:  _stopPreview,
};

/* Also expose as the hooks duet-sheet._dsExportGif calls */
window._duetDrawCard  = (ctx,W,H,t,DS) => _drawFrame(ctx,W,H,t,DS||window._DS||{});
window._duetDrawConvo = (ctx,W,H,t,DS) => _drawFrame(ctx,W,H,t,DS||window._DS||{});

})();
