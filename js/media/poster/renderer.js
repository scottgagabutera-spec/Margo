/* ============================================================
   MARGO — js/media/poster/duet-renderer.js
   v1.0 — Card Poster renderer for the Duet Sheet.

   Draws a static editorial poster layout for the duet
   conversation — distinct from the GIF card view.
   Designed to look like a designed artefact: bold type,
   strong vibe colour blocks, both lyrics given equal weight.

   Layout (1080×1080):
     ┌─────────────────────────────┐
     │ MARGO wordmark              │
     │ ─── vibe colour bar ───     │
     │ Original lyric (large)      │
     │ Song · Artist               │
     │ ═══ LYRIC BACK @user ═══   │
     │ Echo lyric (large)          │
     │ Song · Artist               │
     │ ─── vibe colour bar ───     │
     │ trymargo.com watermark      │
     └─────────────────────────────┘

   Exports (via window):
     dsPosterDraw(ctx, W, H, post1, post2, opts)
       — draw once, static
     dsPosterExport(post1, post2, opts) → Promise<Blob>
       — returns PNG blob at 1080×1080
   ============================================================ */

(function () {

/* ── Vibe colours ── */
const VIBE = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440', Loneliness:'#a0a0ff',
  SendIt:'#00e5c8', LetOut:'#c864ff',
};
function _vc(e){ return VIBE[e] || '#E8C547'; }

/* ── Color theme backgrounds ── */
const BG_THEMES = {
  '#07060E': ['#090810','#0d0b12','#06080a'],
  '#0e0018': ['#100022','#1e0040','#0a0014'],
  '#04090f': ['#060d18','#0c1e30','#040810'],
  '#0f0404': ['#140808','#261010','#0a0404'],
  '#020f06': ['#040f08','#091a0e','#020a04'],
  '#0f0508': ['#12060a','#201010','#0a0406'],
  '#080808': ['#060606','#111111','#040404'],
  '#150520': ['#1a0830','#2d1250','#0e0420'],
};
function _bgColors(bgColor) {
  return BG_THEMES[bgColor] || ['#090810','#0d0b12','#06080a'];
}

/* ── Word-wrap helper ── */
function _wrap(ctx, text, maxW) {
  const words=text.split(' '),lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}
  if(cur)lines.push(cur);return lines;
}

/* ══════════════════════════════════════════════════════════
   MAIN DRAW FUNCTION
══════════════════════════════════════════════════════════ */
function dsPosterDraw(ctx, W, H, post1, post2, opts = {}) {
  if (!post1 || !post2) return;

  const bgColor    = opts.bgColor    || '#07060E';
  const fontFamily = opts.fontFamily || 'DM Serif Display';
  const italic     = opts.fontItalic !== false;
  const fStyle     = italic ? 'italic' : 'normal';

  const pVibe = _vc(post1.emotion || 'Nostalgia');
  const eVibe = _vc(post2.emotion || 'Nostalgia');
  const [bgTop, bgMid, bgBot] = _bgColors(bgColor);

  const pad    = W * .07;
  const innerW = W - pad * 2;

  /* ── Background ── */
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,bgTop); bg.addColorStop(.5,bgMid); bg.addColorStop(1,bgBot);
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,W,H);

  /* Subtle vibe glows */
  ctx.save();
  ctx.globalAlpha = 0.18;
  const pg = ctx.createRadialGradient(W*.12,H*.14,0,W*.12,H*.14,W*.7);
  pg.addColorStop(0,pVibe); pg.addColorStop(1,'transparent');
  ctx.fillStyle=pg; ctx.fillRect(0,0,W,H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  const eg = ctx.createRadialGradient(W*.88,H*.86,0,W*.88,H*.86,W*.7);
  eg.addColorStop(0,eVibe); eg.addColorStop(1,'transparent');
  ctx.fillStyle=eg; ctx.fillRect(0,0,W,H);
  ctx.restore();

  /* Fine grain texture */
  ctx.save(); ctx.globalAlpha=0.014;
  for(let y=0;y<H;y+=3){for(let x=0;x<W;x+=3){const v=Math.random()*255|0;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,3,3);}}
  ctx.restore();

  /* ── Top vibe accent bar ── */
  const barH  = Math.max(3, W*.006);
  const barY  = pad * .55;
  const tBar  = ctx.createLinearGradient(0,0,W,0);
  tBar.addColorStop(0,'transparent'); tBar.addColorStop(.3,pVibe+'cc');
  tBar.addColorStop(.5,pVibe); tBar.addColorStop(.7,pVibe+'cc'); tBar.addColorStop(1,'transparent');
  ctx.save(); ctx.globalAlpha=.9; ctx.fillStyle=tBar; ctx.fillRect(0,barY,W,barH); ctx.restore();

  /* ── MARGO wordmark ── */
  const mSz = Math.max(18,W*.052);
  ctx.save();
  ctx.font=`800 ${mSz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=.92;
  ctx.textBaseline='top'; ctx.textAlign='left';
  ctx.fillText('MARGO', pad, pad*.68);
  ctx.restore();

  /* ── Layout zones ── */
  /* Divider sits at 50% */
  const divY   = H * .50;
  const dText  = `LYRIC BACK ↩  @${(post2.username||'anonymous').toUpperCase()}`;
  const dFS    = Math.max(11, W*.023);
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  const dTW  = ctx.measureText(dText).width;
  const dpH  = dFS*2, dpPad=W*.032, dpW=dTW+dpPad*2;
  const dpX  = W/2-dpW/2, dpY=divY-dpH/2, dpR=dpH/2;

  const topContentBot = divY - dpH/2 - W*.03;
  const botContentTop = divY + dpH/2 + W*.03;
  const topContentTop = pad  + mSz   + pad*.6;
  const botContentBot = H * .87;

  /* ── Original lyric ── */
  _drawPosterLyric(ctx, W, topContentTop, topContentBot, post1, pVibe, {
    fontFamily, fStyle, align:'left', opacity:1
  });

  /* ── Divider ── */
  _drawPosterDivider(ctx, W, divY, dpH, dpW, dpX, dpY, dpR, dText, dFS, pVibe, eVibe);

  /* ── Echo lyric ── */
  _drawPosterLyric(ctx, W, botContentTop, botContentBot, post2, eVibe, {
    fontFamily, fStyle, align:'right', opacity:1
  });

  /* ── Bottom vibe accent bar ── */
  const bBar = ctx.createLinearGradient(0,0,W,0);
  bBar.addColorStop(0,'transparent'); bBar.addColorStop(.3,eVibe+'cc');
  bBar.addColorStop(.5,eVibe); bBar.addColorStop(.7,eVibe+'cc'); bBar.addColorStop(1,'transparent');
  ctx.save();
  ctx.globalAlpha=.9;
  ctx.fillStyle=bBar;
  ctx.fillRect(0,H-barY-barH,W,barH);
  ctx.restore();

  /* ── Watermark ── */
  _drawPosterWatermark(ctx, W, H, pad);
}

/* ── Lyric block ── */
function _drawPosterLyric(ctx, W, areaTop, areaBot, post, vibe, opts) {
  const { fontFamily, fStyle, align, opacity } = opts;
  const pad    = W*.07;
  const innerW = W*.82;
  const areaH  = areaBot - areaTop;

  const text   = (post.text||post.lyric||'').substring(0,130);
  const k      = post.knowledge||{};
  const song   = k.song   || post.song   || '';
  const artist = k.artist || post.artist || '';
  const emotion= post.emotion || '';
  const user   = ('@'+(post.username||'anonymous')).toUpperCase();
  const isRight= align === 'right';

  ctx.save(); ctx.globalAlpha = opacity;

  /* username label */
  const ulFS = Math.max(9,W*.016);
  ctx.font=`700 ${ulFS}px 'Space Mono',monospace`;
  ctx.fillStyle=vibe; ctx.globalAlpha=opacity*.7;
  ctx.textBaseline='top'; ctx.textAlign=isRight?'right':'left';
  ctx.fillText(`● ${user}`, isRight?W-pad:pad, areaTop+W*.005);
  ctx.restore();

  /* lyric */
  ctx.save();
  const lyricTop = areaTop + ulFS*1.8;
  const lyricH   = areaH - ulFS*1.8;

  let fs = Math.min(W*.068, lyricH*.3);
  ctx.font=`${fStyle} 700 ${fs}px '${fontFamily}',serif`;
  let lines = _wrap(ctx, text, innerW);
  if(lines.length>4){fs=Math.max(W*.032,fs*(4/lines.length));ctx.font=`${fStyle} 700 ${fs}px '${fontFamily}',serif`;lines=_wrap(ctx,text,innerW);}
  const lh=fs*1.48, blockH=lines.length*lh;
  const startY=lyricTop + (lyricH-blockH)/2;

  ctx.textBaseline='top'; ctx.textAlign=isRight?'right':'left';
  const xPos = isRight ? W-pad : pad;

  ctx.shadowColor='rgba(0,0,0,.9)'; ctx.shadowBlur=18;
  lines.forEach((l,i) => {
    ctx.globalAlpha = opacity*(1-i*.04);
    ctx.fillStyle='#ffffff';
    ctx.fillText(l, xPos, startY+i*lh);
  });
  ctx.restore();

  /* song attribution line */
  if (song) {
    const afs=Math.max(9,W*.02);
    ctx.save();
    ctx.font=`700 ${afs}px 'Space Mono',monospace`;
    ctx.fillStyle=vibe; ctx.globalAlpha=opacity*.55;
    ctx.textBaseline='bottom';
    ctx.textAlign=isRight?'right':'left';
    let aStr=song+(artist?' — '+artist:'');
    const maxAW = innerW*.82;
    while(ctx.measureText(aStr).width>maxAW&&aStr.length>4)aStr=aStr.slice(0,-4)+'…';
    ctx.fillText(aStr,isRight?W-pad:pad,areaBot-W*.01);
    ctx.restore();
  }

  /* emotion badge */
  if (emotion) {
    const bFS=Math.max(8,W*.016);
    ctx.save();
    ctx.font=`700 ${bFS}px 'Space Mono',monospace`;
    const bTW=ctx.measureText(emotion.toUpperCase()).width;
    const bPad=W*.02, bW=bTW+bPad*2, bH=bFS*2;
    const bX=isRight?W-pad-bW:pad, bY=areaTop+W*.005+ulFS*1.2;
    ctx.fillStyle=vibe+'22'; ctx.strokeStyle=vibe+'66'; ctx.lineWidth=1.5;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(bX,bY,bW,bH,bH/2); else ctx.rect(bX,bY,bW,bH);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle=vibe; ctx.globalAlpha=opacity*.85;
    ctx.textBaseline='middle'; ctx.textAlign=isRight?'right':'left';
    ctx.fillText(emotion.toUpperCase(),isRight?W-pad-bPad:pad+bPad,bY+bH/2);
    ctx.restore();
  }
}

/* ── Divider ── */
function _drawPosterDivider(ctx, W, divY, dpH, dpW, dpX, dpY, dpR, dText, dFS, pVibe, eVibe) {
  const gap = dpW/2+W*.022;

  ctx.save();
  /* left line */
  const ll=ctx.createLinearGradient(W*.07,0,W/2-gap,0);
  ll.addColorStop(0,'transparent'); ll.addColorStop(1,'rgba(232,197,71,.3)');
  ctx.fillStyle=ll; ctx.fillRect(W*.07,divY-.75,W/2-gap-W*.07,1.5);
  /* right line */
  const rl=ctx.createLinearGradient(W/2+gap,0,W*.93,0);
  rl.addColorStop(0,'rgba(232,197,71,.3)'); rl.addColorStop(1,'transparent');
  ctx.fillStyle=rl; ctx.fillRect(W/2+gap,divY-.75,W*.93-(W/2+gap),1.5);
  ctx.restore();

  /* pill */
  ctx.save();
  ctx.shadowColor='#E8C547'; ctx.shadowBlur=18;
  ctx.strokeStyle='rgba(232,197,71,.7)'; ctx.lineWidth=2;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(dpX,dpY,dpW,dpH,dpR); else ctx.rect(dpX,dpY,dpW,dpH);
  ctx.stroke(); ctx.shadowBlur=0;
  const pf=ctx.createLinearGradient(dpX,dpY,dpX,dpY+dpH);
  pf.addColorStop(0,'rgba(232,197,71,.16)'); pf.addColorStop(1,'rgba(232,197,71,.07)');
  ctx.fillStyle=pf;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(dpX,dpY,dpW,dpH,dpR); else ctx.rect(dpX,dpY,dpW,dpH);
  ctx.fill();
  ctx.font=`700 ${dFS}px 'Space Mono',monospace`;
  ctx.fillStyle='#E8C547'; ctx.globalAlpha=.98;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(dText,W/2,divY);
  ctx.restore();
}

/* ── Watermark ── */
function _drawPosterWatermark(ctx, W, H, pad) {
  const wfs=Math.max(9,W*.02);
  ctx.save();
  ctx.font=`700 ${wfs}px 'Space Mono',monospace`;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  const ww=ctx.measureText('trymargo.com').width+W*.044, wh=wfs*1.7;
  const wx=W/2-ww/2, wy=H-pad*.8-wh/2;
  ctx.globalAlpha=.15; ctx.fillStyle='#ffffff';
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(wx,wy,ww,wh,wh/2); else ctx.rect(wx,wy,ww,wh);
  ctx.fill();
  ctx.globalAlpha=.48; ctx.fillStyle='#ffffff';
  ctx.fillText('trymargo.com',W/2,wy+wh/2);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   EXPORT — returns PNG blob at 1080×1080
══════════════════════════════════════════════════════════ */
async function dsPosterExport(post1, post2, opts = {}) {
  const SIZE = 1080;
  const off  = document.createElement('canvas');
  off.width  = off.height = SIZE;
  const ctx  = off.getContext('2d');
  await document.fonts.ready;
  dsPosterDraw(ctx, SIZE, SIZE, post1, post2, opts);
  return new Promise(resolve => {
    off.toBlob(resolve, 'image/png', 1.0);
  });
}

/* ── Global expose ── */
window.dsPosterDraw   = dsPosterDraw;
window.dsPosterExport = dsPosterExport;

})();
