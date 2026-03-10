/* ============================================================
   MARGO — js/media/gif/duet-renderer.js
   v1.0 — Card GIF renderer for the Duet Sheet.

   Draws the duet card layout with real per-frame motion
   animations matching the motion styles in duet-sheet.js.

   Motion styles supported (mirrors ds-motion-btn values):
     fade-up · typewriter · slide-in · pulse ·
     glitch   · wave       · shimmer  · bounce

   Exports (via window):
     dsGifDrawFrame(ctx, W, H, t, motion, post1, post2)
       — single frame at normalised time t ∈ [0,1)
     dsGifExport(post1, post2, motion, dur) → Promise<Blob>
       — renders full animated GIF via gif.js
   ============================================================ */

(function () {

/* ── Vibe colours ── */
const VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};
function _vc(e){ return VIBE[e] || '#E8C547'; }

/* ── Word-wrap helper ── */
function _wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ── Hex blend ── */
function _blend(h1, h2, t) {
  const p = s => [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
  const [a,b] = [p(h1),p(h2)];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
}

/* ── Easing ── */
function _easeOut(t){ return 1 - Math.pow(1-t, 3); }
function _easeInOut(t){ return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

/* ══════════════════════════════════════════════════════════
   BACKGROUND + CHROME  (shared by all frames)
══════════════════════════════════════════════════════════ */
function _drawBase(ctx, W, H, pVibe, eVibe, blend) {
  /* bg */
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#090810'); bg.addColorStop(0.5,'#0d0b12'); bg.addColorStop(1,'#060809');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  /* vibe glows — blend from p→e as animation progresses */
  ctx.save();
  ctx.globalAlpha = 0.22;
  const pg = ctx.createRadialGradient(W*.15,H*.2,0,W*.15,H*.2,W*.65);
  pg.addColorStop(0,pVibe); pg.addColorStop(1,'transparent');
  ctx.fillStyle = pg; ctx.fillRect(0,0,W,H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22 * blend;
  const eg = ctx.createRadialGradient(W*.85,H*.8,0,W*.85,H*.8,W*.65);
  eg.addColorStop(0,eVibe); eg.addColorStop(1,'transparent');
  ctx.fillStyle = eg; ctx.fillRect(0,0,W,H);
  ctx.restore();

  /* top/bottom edge lines */
  ctx.save(); ctx.globalAlpha = 0.65;
  const tl = ctx.createLinearGradient(0,0,W,0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(.5,pVibe); tl.addColorStop(1,'transparent');
  ctx.fillStyle = tl; ctx.fillRect(0,0,W,2);
  const bl = ctx.createLinearGradient(0,0,W,0);
  bl.addColorStop(0,'transparent'); bl.addColorStop(.5,eVibe); bl.addColorStop(1,'transparent');
  ctx.fillStyle = bl; ctx.fillRect(0,H-2,W,2);
  ctx.restore();

  /* MARGO wordmark */
  const mSz = Math.max(14, W*.044);
  ctx.save();
  ctx.font = `800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle = '#E8C547'; ctx.globalAlpha = 0.82;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillText('MARGO', W*.07, W*.055);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   DIVIDER PILL
══════════════════════════════════════════════════════════ */
function _drawDivider(ctx, W, H, echoUser, alpha) {
  const divY  = H * .50;
  const dText = `LYRIC BACK ↩  @${(echoUser||'anonymous').toUpperCase()}`;
  const dFS   = Math.max(10, W*.021);
  ctx.font = `700 ${dFS}px 'Space Mono',monospace`;
  const dTW = ctx.measureText(dText).width;
  const pH  = dFS*1.95, pPad = W*.028, pW = dTW+pPad*2;
  const pX  = W/2-pW/2, pY = divY-pH/2, pR = pH/2;
  const gap = pW/2+W*.018;

  ctx.save(); ctx.globalAlpha = alpha;

  /* separator lines */
  [[W*.07,W/2-gap],[W/2+gap,W*.93]].forEach(([x1,x2]) => {
    const lg = ctx.createLinearGradient(x1,0,x2,0);
    if (x1 < W/2){ lg.addColorStop(0,'transparent'); lg.addColorStop(1,'rgba(232,197,71,.22)'); }
    else          { lg.addColorStop(0,'rgba(232,197,71,.22)'); lg.addColorStop(1,'transparent'); }
    ctx.fillStyle = lg; ctx.fillRect(x1,divY-.75,x2-x1,1.5);
  });

  /* pill */
  ctx.shadowColor='#E8C547'; ctx.shadowBlur=14;
  ctx.strokeStyle='rgba(232,197,71,.6)'; ctx.lineWidth=1.5;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.stroke(); ctx.shadowBlur=0;
  const pf = ctx.createLinearGradient(pX,pY,pX,pY+pH);
  pf.addColorStop(0,'rgba(232,197,71,.14)'); pf.addColorStop(1,'rgba(232,197,71,.06)');
  ctx.fillStyle=pf;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH);
  ctx.fill();
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=alpha*.95;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(dText,W/2,divY);
  ctx.restore();

  return { divY, pH };
}

/* ══════════════════════════════════════════════════════════
   LYRIC BLOCK
   Draws lyric text + song attribution with transform/alpha
   passed in as { tx, ty, alpha, scaleX }
══════════════════════════════════════════════════════════ */
function _drawLyricBlock(ctx, W, areaTop, areaBot, post, vibe, opts) {
  const { tx=0, ty=0, alpha=1, scaleX=1, fontFamily='DM Serif Display', italic=true, shimmerT=null } = opts;
  const pad    = W*.07;
  const innerW = W*.86;
  const areaH  = areaBot - areaTop;

  const text  = (post.text || post.lyric || '').substring(0, 120);
  const k     = post.knowledge || {};
  const song  = k.song   || post.song   || '';
  const artist= k.artist || post.artist || '';

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(tx, ty);
  if (scaleX !== 1) { ctx.translate(W/2,0); ctx.scale(scaleX,1); ctx.translate(-W/2,0); }

  /* font sizing */
  let fs = Math.min(W*.054, areaH*.28);
  const fStyle = italic ? 'italic 600' : '600';
  ctx.font = `${fStyle} ${fs}px '${fontFamily}',serif`;
  let lines = _wrap(ctx, text, innerW);
  if (lines.length > 3) {
    fs = Math.max(W*.026, fs*(3/lines.length));
    ctx.font = `${fStyle} ${fs}px '${fontFamily}',serif`;
    lines = _wrap(ctx, text, innerW);
  }
  const lh      = fs*1.52;
  const blockH  = lines.length*lh;
  const startY  = areaTop + (areaH - blockH)/2;

  ctx.textBaseline='top'; ctx.textAlign='center';
  ctx.shadowColor='rgba(0,0,0,.85)'; ctx.shadowBlur=14;

  if (shimmerT !== null) {
    /* shimmer: animated gradient mask */
    const gx = ctx.createLinearGradient(W*shimmerT - W*.4, 0, W*shimmerT + W*.4, 0);
    gx.addColorStop(0,'rgba(255,255,255,.55)');
    gx.addColorStop(.35,'#ffffff');
    gx.addColorStop(.5,'#E8C547');
    gx.addColorStop(.65,'#ffffff');
    gx.addColorStop(1,'rgba(255,255,255,.55)');
    ctx.fillStyle = gx;
  } else {
    ctx.fillStyle = '#ffffff';
  }

  lines.forEach((l,i) => ctx.fillText(l, W/2, startY+i*lh));

  /* attribution */
  if (song) {
    const afs = Math.max(9, W*.019);
    ctx.shadowBlur=0; ctx.font=`700 ${afs}px 'Space Mono',monospace`;
    ctx.fillStyle=vibe; ctx.globalAlpha=.45;
    ctx.textBaseline='bottom'; ctx.textAlign='center';
    let aStr = song + (artist?' — '+artist:'');
    while(ctx.measureText(aStr).width > innerW*.8 && aStr.length>4) aStr=aStr.slice(0,-4)+'…';
    ctx.fillText(aStr, W/2, areaTop-W*.01);
  }

  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   WATERMARK
══════════════════════════════════════════════════════════ */
function _drawWatermark(ctx, W, H) {
  const wfs = Math.max(9,W*.02);
  ctx.save();
  ctx.font=`700 ${wfs}px 'Space Mono',monospace`;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  const ww=ctx.measureText('trymargo.com').width+W*.044, wh=wfs*1.7;
  const wx=W/2-ww/2, wy=H-W*.05-wh/2;
  ctx.globalAlpha=.14; ctx.fillStyle='#ffffff';
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(wx,wy,ww,wh,wh/2); else ctx.rect(wx,wy,ww,wh);
  ctx.fill();
  ctx.globalAlpha=.45; ctx.fillStyle='#ffffff';
  ctx.fillText('trymargo.com',W/2,wy+wh/2);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   MAIN FRAME RENDERER
   t ∈ [0,1) — normalised animation time
   motion — one of the 8 style keys
   post1   — original post
   post2   — echo post
   opts    — { fontFamily, fontItalic, bgColor }
══════════════════════════════════════════════════════════ */
function dsGifDrawFrame(ctx, W, H, t, motion, post1, post2, opts = {}) {
  if (!post1 || !post2) return;

  const fontFamily = opts.fontFamily || 'DM Serif Display';
  const italic     = opts.fontItalic !== false;

  const pVibe = _vc(post1.emotion || 'Nostalgia');
  const eVibe = _vc(post2.emotion || 'Nostalgia');

  /* blend scalar — 0 at start, 1 at end */
  const blendT = _easeInOut(t);

  _drawBase(ctx, W, H, pVibe, eVibe, blendT);

  /* divider animates in at t=0.42 */
  const divAlpha = t < .42 ? 0 : Math.min(1, (t-.42)/.12);
  const { divY, pH } = _drawDivider(ctx, W, H, post2.username, divAlpha);

  const topArea  = [W*.14, divY - pH/2 - W*.04];   /* [top, bot] */
  const botArea  = [divY + pH/2 + W*.02, H*.88];

  /* ── Per-motion transform for each lyric block ── */
  /* Phase 1: original lyric (t 0→0.5)
     Phase 2: echo lyric    (t 0.5→1)
     Each phase eases in over its first 30% then holds */

  const p1t = Math.min(1, t / .35);          /* 0→1 in first 35% */
  const p2t = t < .5 ? 0 : Math.min(1,(t-.5)/.30); /* 0→1 in second phase */

  function _motionOpts(phase_t, isEcho) {
    const e = _easeOut(phase_t);
    switch (motion) {
      case 'fade-up':
        return { alpha: e, ty: (1-e)*22*(W/500), fontFamily, italic };
      case 'slide-in':
        return { alpha: e, tx: (isEcho?1:-1)*(1-e)*30*(W/500), fontFamily, italic };
      case 'pulse': {
        const osc = .5+.5*Math.sin(t*Math.PI*2+(isEcho?Math.PI:0));
        return { alpha: .45+.55*osc, scaleX: .97+.04*osc, fontFamily, italic };
      }
      case 'glitch': {
        const g = t > .88 && t < .96;
        return { alpha: g ? .8 : e, tx: g ? (Math.random()-.5)*8*(W/500) : 0, ty: g ? (Math.random()-.5)*5*(W/500) : 0, fontFamily, italic };
      }
      case 'wave': {
        const wOsc = Math.sin(t*Math.PI*3+(isEcho?Math.PI:0));
        return { alpha: e, ty: wOsc*10*(W/500), fontFamily, italic };
      }
      case 'shimmer':
        return { alpha: e, shimmerT: (t*2.5 + (isEcho?.5:0)) % 1.2 - .1, fontFamily, italic };
      case 'bounce': {
        const b = t*.9; const bOsc = Math.abs(Math.sin(b*Math.PI*2.5));
        return { alpha: e, ty: -bOsc*16*(W/500), fontFamily, italic };
      }
      case 'typewriter':
        return { alpha: 1, fontFamily, italic, typewriterT: phase_t };
      default:
        return { alpha: e, fontFamily, italic };
    }
  }

  /* top lyric */
  if (motion === 'typewriter') {
    _drawLyricTypewriter(ctx, W, topArea[0], topArea[1], post1, pVibe, p1t, { fontFamily, italic });
  } else {
    _drawLyricBlock(ctx, W, topArea[0], topArea[1], post1, pVibe, _motionOpts(p1t, false));
  }

  /* echo lyric */
  if (p2t > 0) {
    if (motion === 'typewriter') {
      _drawLyricTypewriter(ctx, W, botArea[0], botArea[1], post2, eVibe, p2t, { fontFamily, italic });
    } else {
      _drawLyricBlock(ctx, W, botArea[0], botArea[1], post2, eVibe, _motionOpts(p2t, true));
    }
  }

  _drawWatermark(ctx, W, H);
}

/* ── Typewriter variant ── */
function _drawLyricTypewriter(ctx, W, areaTop, areaBot, post, vibe, phase_t, opts) {
  const { fontFamily='DM Serif Display', italic=true } = opts;
  const pad    = W*.07;
  const innerW = W*.86;
  const areaH  = areaBot - areaTop;
  const text   = (post.text || post.lyric || '').substring(0,120);
  const k      = post.knowledge || {};
  const song   = k.song || post.song || '';
  const artist = k.artist || post.artist || '';

  let fs = Math.min(W*.054, areaH*.28);
  const fStyle = italic ? 'italic 600' : '600';
  ctx.font = `${fStyle} ${fs}px '${fontFamily}',serif`;
  let lines = _wrap(ctx, text, innerW);
  if(lines.length>3){fs=Math.max(W*.026,fs*(3/lines.length));ctx.font=`${fStyle} ${fs}px '${fontFamily}',serif`;lines=_wrap(ctx,text,innerW);}
  const lh=fs*1.52, blockH=lines.length*lh, startY=areaTop+(areaH-blockH)/2;

  /* reveal characters proportionally */
  const fullText  = lines.join(' ');
  const charCount = Math.floor(phase_t * fullText.length);
  let   revealed  = 0;

  ctx.save();
  ctx.textBaseline='top'; ctx.textAlign='center';
  ctx.shadowColor='rgba(0,0,0,.85)'; ctx.shadowBlur=14;
  ctx.fillStyle='#ffffff';

  lines.forEach((line,i) => {
    const show = Math.max(0, Math.min(line.length, charCount-revealed));
    ctx.fillText(line.slice(0,show), W/2, startY+i*lh);
    /* cursor on active line */
    if (charCount >= revealed && charCount < revealed+line.length) {
      const partial = line.slice(0,show);
      const cX = W/2 + ctx.measureText(partial).width/2 + 2;
      ctx.save(); ctx.globalAlpha=.9; ctx.fillStyle='#E8C547';
      ctx.fillRect(cX, startY+i*lh, Math.max(2,fs*.06), fs*.9);
      ctx.restore();
    }
    revealed += line.length+1;
  });

  if (song) {
    const afs=Math.max(9,W*.019); ctx.shadowBlur=0;
    ctx.font=`700 ${afs}px 'Space Mono',monospace`;
    ctx.fillStyle=vibe; ctx.globalAlpha=.45;
    ctx.textBaseline='bottom'; ctx.textAlign='center';
    let aStr=song+(artist?' — '+artist:'');
    while(ctx.measureText(aStr).width>innerW*.8&&aStr.length>4)aStr=aStr.slice(0,-4)+'…';
    ctx.fillText(aStr,W/2,areaTop-W*.01);
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   GIF EXPORT
   Renders full animated GIF via gif.js
   Returns Promise<Blob>
══════════════════════════════════════════════════════════ */
async function dsGifExport(post1, post2, motion, dur, opts = {}) {
  const SIZE   = 600;
  const FPS    = 24;
  const frames = Math.round(FPS * Math.min(Math.max(dur||2.4), 5));
  const delay  = Math.round(1000 / FPS);

  const off = document.createElement('canvas');
  off.width = off.height = SIZE;
  const oc = off.getContext('2d');

  await document.fonts.ready;

  /* load gif.js if needed */
  if (typeof GIF === 'undefined') {
    await new Promise((res,rej) => {
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
      s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
  }

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers:2, quality:5, width:SIZE, height:SIZE,
      workerScript:'/js/gif.worker.js', dither:false,
    });

    (async () => {
      for (let i=0; i<frames; i++) {
        oc.clearRect(0,0,SIZE,SIZE);
        dsGifDrawFrame(oc, SIZE, SIZE, i/frames, motion, post1, post2, opts);
        gif.addFrame(off, { copy:true, delay });
        await new Promise(r=>setTimeout(r,0));
      }
      gif.on('finished', resolve);
      gif.on('error',    reject);
      gif.render();
    })();
  });
}

/* ── Global expose ── */
window.dsGifDrawFrame = dsGifDrawFrame;
window.dsGifExport    = dsGifExport;

})();
