/* ============================================================
   MARGO — js/media/poster/duet-renderer.js  v2.2
   FIXED vs v2.1:
   • Registers as window._dsPosterDrawRich for duet-mode.js delegation
   • Still sets window.dsPosterDraw + window.dsPosterExport
     (wins over duet-mode.js stubs because this loads AFTER it)
   ============================================================ */

(function () {
'use strict';

/* ─────────────────────────────────────────────
   THEMES
───────────────────────────────────────────── */
const THEMES = {
  gold:   {g1:'#0c0a04',g2:'#1a1306',acc:'#E8C547',glow1:'rgba(232,197,71,0.22)',glow2:'rgba(180,140,30,0.12)',l:'#FF6B9D',r:'#6B8CFF',light:false},
  violet: {g1:'#100020',g2:'#1c0730',acc:'#c77dff',glow1:'rgba(199,125,255,0.22)',glow2:'rgba(120,50,200,0.12)',l:'#ff71ce',r:'#05ffa1',light:false},
  ocean:  {g1:'#040f18',g2:'#071622',acc:'#00e5ff',glow1:'rgba(0,229,255,0.18)',glow2:'rgba(0,150,200,0.1)',l:'#00e5ff',r:'#0070ff',light:false},
  ember:  {g1:'#140505',g2:'#1e0a0a',acc:'#ff6b6b',glow1:'rgba(255,107,107,0.22)',glow2:'rgba(200,50,50,0.12)',l:'#ff6b6b',r:'#ffb347',light:false},
  forest: {g1:'#020d06',g2:'#05160a',acc:'#50fa7b',glow1:'rgba(80,250,123,0.18)',glow2:'rgba(40,180,80,0.1)',l:'#50fa7b',r:'#00e5c0',light:false},
  rose:   {g1:'#120708',g2:'#1c0c0f',acc:'#f4a4c0',glow1:'rgba(244,164,192,0.18)',glow2:'rgba(180,80,120,0.1)',l:'#f4a4c0',r:'#c084fc',light:false},
  mono:   {g1:'#000000',g2:'#0a0a0a',acc:'#E8C547',glow1:'rgba(255,255,255,0.08)',glow2:'rgba(200,200,200,0.04)',l:'#ffffff',r:'#aaaaaa',light:false},
  wave:   {g1:'#110317',g2:'#09140f',acc:'#05ffa1',glow1:'rgba(255,113,206,0.22)',glow2:'rgba(5,255,161,0.12)',l:'#ff71ce',r:'#05ffa1',light:false},
  white:  {g1:'#ffffff',g2:'#ece8e0',acc:'#0B0B0D',glow1:'rgba(0,0,0,0.06)',glow2:'rgba(0,0,0,0.04)',l:'#c0392b',r:'#1a6fbd',light:true},
};

function _theme(name) { return THEMES[name] || THEMES['gold']; }

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
function hexA(hex, a) {
  const h=hex.replace('#','');
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}

function wrapText(ctx, text, maxW) {
  const words=text.split(' '), lines=[]; let cur='';
  for(const w of words){
    const test=cur?cur+' '+w:w;
    if(ctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}else cur=test;
  }
  if(cur)lines.push(cur); return lines;
}

function fStack(f) {
  const m={
    'DM Serif Display':"'DM Serif Display', serif",
    'Playfair Display':"'Playfair Display', serif",
    'Lora':            "'Lora', serif",
    'Space Mono':      "'Space Mono', monospace",
    'Syne Mono':       "'Syne Mono', monospace",
    'DM Sans':         "'DM Sans', sans-serif",
    'Syne':            "'Syne', sans-serif",
    'Comic Sans MS':   "'Comic Sans MS', cursive",
    'Georgia':         "Georgia, serif",
  };
  return m[f]||m['DM Serif Display'];
}

function isItalic(f) {
  return ['DM Serif Display','Playfair Display','Lora','Georgia'].includes(f);
}

/* ─────────────────────────────────────────────
   BACKGROUND
───────────────────────────────────────────── */
function drawBg(ctx, W, H, th) {
  const bg=ctx.createLinearGradient(0,0,W*0.7,H);
  bg.addColorStop(0,th.g1); bg.addColorStop(1,th.g2);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const g1=ctx.createRadialGradient(W*.20,H*.25,0,W*.20,H*.25,W*.65);
  g1.addColorStop(0,th.glow1); g1.addColorStop(1,'transparent');
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);

  const g2=ctx.createRadialGradient(W*.80,H*.75,0,W*.80,H*.75,W*.65);
  g2.addColorStop(0,th.glow2); g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);

  ctx.save(); ctx.globalAlpha=th.light?0.018:0.032;
  for(let y=0;y<H;y+=3) for(let x=0;x<W;x+=3){
    const v=Math.random()*255|0; ctx.fillStyle=`rgb(${v},${v},${v})`; ctx.fillRect(x,y,3,3);
  }
  ctx.restore();

  const edgeL=th.light?'rgba(0,0,0,0.15)':th.l;
  ctx.save(); ctx.globalAlpha=0.45;
  const tl=ctx.createLinearGradient(0,0,W,0);
  tl.addColorStop(0,'transparent'); tl.addColorStop(0.4,edgeL); tl.addColorStop(1,'transparent');
  ctx.fillStyle=tl; ctx.fillRect(0,0,W,2); ctx.restore();

  const edgeR=th.light?'rgba(0,0,0,0.1)':th.r;
  ctx.save(); ctx.globalAlpha=0.35;
  const bl=ctx.createLinearGradient(0,0,W,0);
  bl.addColorStop(0,'transparent'); bl.addColorStop(0.6,edgeR); bl.addColorStop(1,'transparent');
  ctx.fillStyle=bl; ctx.fillRect(0,H-2,W,2); ctx.restore();
}

/* ─────────────────────────────────────────────
   MARGO GHOST WORDMARK
───────────────────────────────────────────── */
function drawMargoWordmark(ctx, W, H, th) {
  const sz=Math.max(14,Math.round(W*0.034)), pad=Math.round(W*0.048);
  ctx.save();
  ctx.font=`800 ${sz}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle=th.light?'#0B0B0D':th.acc; ctx.globalAlpha=0.28;
  ctx.textBaseline='top'; ctx.textAlign='left';
  const spacing=sz*0.22; let cx=pad;
  for(const ch of 'MARGO'.split('')){
    ctx.fillText(ch,cx,pad*0.55); cx+=ctx.measureText(ch).width+spacing;
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────
   SOLID M-MARK CIRCLE
───────────────────────────────────────────── */
function drawMmark(ctx, W, H, th) {
  const sz=Math.round(Math.min(W,H)*0.07);
  const bx=W-Math.round(W*0.036)-sz, by=H-Math.round(H*0.034)-sz;
  const cx=bx+sz/2, cy=by+sz/2, r=sz/2, ic=sz*0.62;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle=th.acc; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=18;
  ctx.fill(); ctx.shadowBlur=0;
  const s=ic, mx=cx-s/2, my=cy-s/2;
  ctx.strokeStyle=th.light?'#ffffff':'#0B0B0D';
  ctx.lineWidth=sz*0.098; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(mx,my+s*0.78); ctx.lineTo(mx,my+s*0.13);
  ctx.lineTo(mx+s*0.35,my+s*0.60); ctx.lineTo(mx+s*0.50,my+s*0.06);
  ctx.lineTo(mx+s*0.65,my+s*0.60); ctx.lineTo(mx+s,my+s*0.13);
  ctx.lineTo(mx+s,my+s*0.78); ctx.stroke();
  ctx.restore();
}

/* ─────────────────────────────────────────────
   WATERMARK PILL
───────────────────────────────────────────── */
function drawWatermark(ctx, W, H, th) {
  const fs=Math.max(9,Math.round(W*0.017)), light=th.light;
  ctx.save();
  ctx.font=`700 ${fs}px 'Space Mono',monospace`;
  ctx.textBaseline='middle'; ctx.textAlign='center';
  const txt='trymargo.com', tw=ctx.measureText(txt).width;
  const pw=tw+W*0.044, ph=fs*1.9, px=W/2-pw/2, py=H-W*0.038-ph/2;
  ctx.globalAlpha=light?0.25:0.22;
  ctx.fillStyle=light?'#000000':'#ffffff';
  ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(px,py,pw,ph,ph/2); else ctx.rect(px,py,pw,ph); ctx.fill();
  ctx.globalAlpha=light?0.45:0.36;
  ctx.strokeStyle=light?'#000000':'#ffffff'; ctx.lineWidth=1;
  ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(px,py,pw,ph,ph/2); else ctx.rect(px,py,pw,ph); ctx.stroke();
  ctx.globalAlpha=light?0.90:0.82;
  ctx.fillStyle=light?'#0B0B0D':'#ffffff';
  ctx.fillText(txt,W/2,py+ph/2);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   CARD BACKGROUND — 6 styles
───────────────────────────────────────────── */
function drawCardBg(ctx, x, y, w, h, r, style, acc, sideColor, light) {
  ctx.save();
  const path=()=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);};
  switch(style){
    case 'contrast':
      path(); ctx.fillStyle=light?'rgba(0,0,0,0.06)':'rgba(0,0,0,0.92)'; ctx.fill();
      path(); ctx.strokeStyle=light?'rgba(0,0,0,0.15)':'rgba(255,255,255,0.08)'; ctx.lineWidth=1.5; ctx.stroke(); break;
    case 'mesh':{
      const mg=ctx.createLinearGradient(x,y,x+w,y+h);
      mg.addColorStop(0,hexA(sideColor,0.18)); mg.addColorStop(0.45,light?'rgba(240,235,220,0.80)':'rgba(0,0,0,0.65)'); mg.addColorStop(1,hexA(sideColor,0.18));
      path(); ctx.fillStyle=mg; ctx.fill();
      path(); ctx.strokeStyle=light?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.stroke(); break;}
    case 'grain':
      path(); ctx.fillStyle=light?'rgba(245,240,232,0.92)':'rgba(18,16,12,0.94)'; ctx.fill();
      path(); ctx.strokeStyle=light?'rgba(0,0,0,0.12)':'rgba(232,197,71,0.14)'; ctx.lineWidth=1; ctx.stroke();
      ctx.save(); ctx.globalAlpha=0.30; ctx.globalCompositeOperation=light?'multiply':'overlay';
      for(let gy=y;gy<y+h;gy+=2) for(let gx=x;gx<x+w;gx+=2){const v=Math.random()*255|0;ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(gx,gy,2,2);}
      ctx.restore(); break;
    case 'neon':
      path(); ctx.fillStyle=light?'rgba(255,255,255,0.70)':'rgba(0,0,0,0.78)'; ctx.fill();
      ctx.shadowColor=acc; ctx.shadowBlur=20;
      path(); ctx.strokeStyle=acc; ctx.lineWidth=1.5; ctx.stroke(); ctx.shadowBlur=0;
      ctx.save(); const nl=ctx.createLinearGradient(x,0,x+w*0.38,0);
      nl.addColorStop(0,acc); nl.addColorStop(1,'transparent');
      ctx.strokeStyle=nl; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w*0.38,y); ctx.stroke();
      ctx.restore(); break;
    case 'depth':
      path(); ctx.fillStyle=light?'rgba(240,235,228,0.90)':'rgba(10,8,4,0.96)'; ctx.fill();
      path(); ctx.strokeStyle=light?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)'; ctx.lineWidth=1; ctx.stroke();
      ctx.save(); ctx.globalAlpha=0.025;
      for(let sl=y;sl<y+h;sl+=3){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(x,sl,w,1);} ctx.restore(); break;
    default:
      path(); ctx.fillStyle=light?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.06)'; ctx.fill();
      path(); ctx.strokeStyle=light?'rgba(0,0,0,0.10)':'rgba(255,255,255,0.13)'; ctx.lineWidth=1.5; ctx.stroke();
  }
  const rg=ctx.createRadialGradient(x,y,0,x,y,Math.max(w,h)*0.8);
  rg.addColorStop(0,hexA(sideColor,0.08)); rg.addColorStop(1,'transparent');
  path(); ctx.fillStyle=rg; ctx.fill();
  ctx.restore();
}

/* ─────────────────────────────────────────────
   DIVIDER PILL
───────────────────────────────────────────── */
function drawDivider(ctx, W, divY, echoUser, th) {
  const light=th.light;
  const accRgba=light?'rgba(0,0,0,0.22)':'rgba(232,197,71,0.28)';
  const pillBdr=light?'rgba(0,0,0,0.18)':'rgba(232,197,71,0.28)';
  const pillClr=light?'#0B0B0D':th.acc;
  const dText=`LYRIC BACK \u21A9  @${(echoUser||'ANONYMOUS').toString().replace(/^@/,'').toUpperCase()}`;
  const dFS=Math.max(10,Math.round(W*0.020));
  ctx.save();
  ctx.font=`800 ${dFS}px 'Syne','Arial Black',sans-serif`;
  const dTW=ctx.measureText(dText).width;
  const pH=dFS*2.0, pPad=W*0.028, pW=dTW+pPad*2;
  const pX=W/2-pW/2, pY=divY-pH/2, pR=pH/2, gap=pW/2+W*0.020;

  [[W*0.05,W/2-gap],[W/2+gap,W*0.95]].forEach(([x1,x2])=>{
    const lg=ctx.createLinearGradient(x1,0,x2,0);
    if(x1<W/2){lg.addColorStop(0,'transparent');lg.addColorStop(1,accRgba);}
    else{lg.addColorStop(0,accRgba);lg.addColorStop(1,'transparent');}
    ctx.fillStyle=lg; ctx.fillRect(x1,divY-0.75,x2-x1,1.5);
  });

  ctx.shadowColor=light?'rgba(0,0,0,0.15)':th.acc; ctx.shadowBlur=12;
  ctx.strokeStyle=pillBdr; ctx.lineWidth=1.5;
  ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH); ctx.stroke();
  ctx.shadowBlur=0;

  const pf=ctx.createLinearGradient(pX,pY,pX,pY+pH);
  pf.addColorStop(0,light?'rgba(0,0,0,0.07)':'rgba(232,197,71,0.13)');
  pf.addColorStop(1,light?'rgba(0,0,0,0.03)':'rgba(232,197,71,0.05)');
  ctx.fillStyle=pf;
  ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(pX,pY,pW,pH,pR); else ctx.rect(pX,pY,pW,pH); ctx.fill();

  ctx.font=`800 ${dFS}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle=pillClr; ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(dText,W/2,divY);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   SONGS BAR
───────────────────────────────────────────── */
function drawSongsBar(ctx, W, byY, post1, post2, th) {
  const light=th.light, B=W;
  const bh=Math.round(B*0.072), px=Math.round(B*0.048), br=Math.round(B*0.018);
  const lFs=Math.max(9,Math.round(B*0.020)), sFs=Math.max(9,Math.round(B*0.022)), aFs=Math.max(8,Math.round(B*0.017));
  const cy=byY+bh/2;
  ctx.save();
  ctx.fillStyle=light?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)';
  ctx.strokeStyle=light?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.10)'; ctx.lineWidth=1;
  ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(px*0.8,byY,W-px*1.6,bh,br); else ctx.rect(px*0.8,byY,W-px*1.6,bh);
  ctx.fill(); ctx.stroke();
  ctx.font=`800 ${lFs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle=light?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.70)';
  ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillText('SONGS',px,cy);
  const k1=post1.knowledge||{},s1=(k1.song||post1.song||'').substring(0,20),a1=(k1.artist||post1.artist||'');
  const k2=post2.knowledge||{},s2=(k2.song||post2.song||'').substring(0,20),a2=(k2.artist||post2.artist||'');
  const sc=light?'#0B0B0D':'#ffffff', ac=light?'rgba(0,0,0,0.45)':'rgba(255,255,255,0.45)';
  ctx.font=`700 ${sFs}px 'DM Sans',sans-serif`; ctx.fillStyle=sc; ctx.textAlign='left';
  ctx.fillText(s1,W*0.28,cy-aFs*0.5);
  ctx.font=`400 ${aFs}px 'Space Mono',monospace`; ctx.fillStyle=ac; ctx.fillText(a1,W*0.28,cy+sFs*0.55);
  ctx.font=`400 ${sFs}px sans-serif`; ctx.fillStyle=th.acc; ctx.globalAlpha=0.7; ctx.textAlign='center';
  ctx.fillText('\u2194',W/2,cy); ctx.globalAlpha=1;
  ctx.font=`700 ${sFs}px 'DM Sans',sans-serif`; ctx.fillStyle=sc; ctx.textAlign='right';
  ctx.fillText(s2,W-px,cy-aFs*0.5);
  ctx.font=`400 ${aFs}px 'Space Mono',monospace`; ctx.fillStyle=ac; ctx.fillText(a2,W-px,cy+sFs*0.55);
  ctx.restore();
}

/* ─────────────────────────────────────────────
   LYRIC CARD
───────────────────────────────────────────── */
function drawLyricCard(ctx, W, areaTop, areaH, post, th, side, opts) {
  const{fontFamily='DM Serif Display',cardStyle='glass'}=opts;
  const light=th.light, col=side==='left'?th.l:th.r;
  const bodyTxt=light?'#0B0B0D':'#ffffff';
  const mutedTxt=light?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.48)';
  const divLine=light?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.1)';
  const text=(post.text||post.lyric||'').substring(0,120);
  const k=post.knowledge||{};
  const song=(k.song||post.song||''), artist=(k.artist||post.artist||'');
  const user=('@'+(post.username||'anonymous').toString().replace(/^@/,'')).toUpperCase();
  const vibe=(post.emotion||'').toUpperCase();
  const B=W;
  const padH=Math.round(B*0.058);
  const lFsRaw=side==='right'?B*0.058:B*0.050;
  const sFs=Math.max(9,Math.round(B*0.026)), aFs=Math.max(8,Math.round(B*0.018));
  const vFs=Math.max(8,Math.round(B*0.016)), uFs=Math.max(10,Math.round(B*0.022));
  const cPad=Math.round(Math.min(B*0.034,W*0.025)), cRad=Math.round(B*0.022);
  const fStyle=isItalic(fontFamily)?'italic 600':'600';
  let lfs=lFsRaw;
  ctx.font=`${fStyle} ${lfs}px ${fStack(fontFamily)}`;
  const innerW=W-padH*2;
  let lines=wrapText(ctx,text,innerW-cPad*2);
  if(lines.length>4){
    lfs=Math.max(B*0.026,lfs*(4/lines.length));
    ctx.font=`${fStyle} ${lfs}px ${fStack(fontFamily)}`;
    lines=wrapText(ctx,text,innerW-cPad*2);
  }
  const lh=lfs*1.42;
  const cardH=Math.min(areaH*0.88,lines.length*lh+cPad*2+sFs*2.5+lfs*0.5);
  const cardX=padH, cardY=areaTop+(areaH-cardH)/2, cardW=innerW;
  ctx.save();
  ctx.font=`800 ${uFs}px 'Syne','Arial Black',sans-serif`;
  ctx.fillStyle=col; ctx.globalAlpha=0.90;
  ctx.textBaseline='middle'; ctx.textAlign='left';
  ctx.fillText('\u25CF @'+user,padH,cardY-uFs*0.5-Math.round(B*0.010));
  ctx.globalAlpha=1;
  drawCardBg(ctx,cardX,cardY,cardW,cardH,cRad,cardStyle,th.acc,col,light);
  const rg=ctx.createRadialGradient(cardX,cardY,0,cardX,cardY,Math.max(cardW,cardH)*0.7);
  rg.addColorStop(0,hexA(col,0.08)); rg.addColorStop(1,'transparent');
  ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(cardX,cardY,cardW,cardH,cRad); else ctx.rect(cardX,cardY,cardW,cardH);
  ctx.fillStyle=rg; ctx.fill();
  ctx.font=`${fStyle} ${lfs}px ${fStack(fontFamily)}`;
  ctx.fillStyle=bodyTxt; ctx.textBaseline='top'; ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=10;
  lines.forEach((l,i)=>ctx.fillText(l,cardX+cPad,cardY+cPad+i*lh));
  ctx.shadowBlur=0;
  const divLineY=cardY+cardH-sFs*2.8;
  ctx.save(); ctx.globalAlpha=0.35; ctx.strokeStyle=divLine; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cardX+cPad,divLineY); ctx.lineTo(cardX+cardW-cPad,divLineY); ctx.stroke(); ctx.restore();
  if(song){
    ctx.font=`700 ${sFs}px 'DM Sans',sans-serif`; ctx.fillStyle=bodyTxt;
    ctx.textBaseline='bottom'; ctx.textAlign='left';
    ctx.fillText(song,cardX+cPad,cardY+cardH-cPad*0.6);
    ctx.font=`400 ${aFs}px 'Space Mono',monospace`; ctx.fillStyle=mutedTxt;
    ctx.fillText(artist,cardX+cPad,cardY+cardH-cPad*0.6+aFs*1.3);
  }
  if(vibe){
    ctx.font=`800 ${vFs}px 'Syne','Arial Black',sans-serif`;
    const vw=ctx.measureText(vibe).width;
    const bw=vw+Math.round(B*0.022), bh=vFs*2.0;
    const bx=cardX+cardW-cPad*0.3-bw, by=cardY+cardH-bh-Math.round(B*0.014);
    ctx.fillStyle=hexA(col,0.16); ctx.strokeStyle=hexA(col,0.45); ctx.lineWidth=1.5;
    ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(bx,by,bw,bh,bh/2); else ctx.rect(bx,by,bw,bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle=col; ctx.textBaseline='middle'; ctx.textAlign='center';
    ctx.fillText(vibe,bx+bw/2,by+bh/2);
  }
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════
   PUBLIC: dsPosterDraw
═══════════════════════════════════════════════════════ */
function dsPosterDraw(ctx, W, H, post1, post2, opts={}) {
  if(!post1||!post2) return;
  const th=_theme(opts.theme||'gold');
  const ff=opts.fontFamily||'DM Serif Display';
  const cs=opts.cardStyle||'glass';
  const B=Math.min(W,H);
  const padV=Math.round(Math.min(H*0.052,B*0.062)), vGap=Math.round(H*0.015);
  const divY=H*0.500, divH=Math.round(B*0.040);
  const topArea={top:padV+Math.round(B*0.036)+vGap, h:divY-padV-Math.round(B*0.036)-vGap*2-divH/2};
  const botArea={top:divY+divH/2+vGap,              h:H*0.840-divY-divH/2-vGap};
  const songsY=Math.round(H*0.852);

  drawBg(ctx,W,H,th);
  drawMargoWordmark(ctx,W,H,th);
  drawLyricCard(ctx,W,topArea.top,topArea.h,post1,th,'left', {fontFamily:ff,cardStyle:cs});
  drawDivider(ctx,W,divY,post2.username,th);
  drawLyricCard(ctx,W,botArea.top,botArea.h,post2,th,'right',{fontFamily:ff,cardStyle:cs});
  drawSongsBar(ctx,W,songsY,post1,post2,th);
  drawWatermark(ctx,W,H,th);
  drawMmark(ctx,W,H,th);
}

/* ═══════════════════════════════════════════════════════
   PUBLIC: dsPosterExport → Promise<Blob>
═══════════════════════════════════════════════════════ */
async function dsPosterExport(post1, post2, opts={}) {
  const SIZE=1080;
  const off=document.createElement('canvas');
  off.width=off.height=SIZE;
  const oc=off.getContext('2d');
  await document.fonts.ready;
  dsPosterDraw(oc,SIZE,SIZE,post1,post2,opts);
  return new Promise((resolve,reject)=>{
    off.toBlob(blob=>{
      if(blob)resolve(blob); else reject(new Error('Canvas toBlob failed'));
    },'image/png');
  });
}

/* ═══════════════════════════════════════════════════════
   EXPOSE — rich names + standard names (override stubs)
═══════════════════════════════════════════════════════ */
window._dsPosterDrawRich   = dsPosterDraw;    // for duet-mode.js drawDuetPosterToCtx delegation
window._dsPosterExportRich = dsPosterExport;  // future use

window.dsPosterDraw   = dsPosterDraw;         // overrides stub in duet-mode.js
window.dsPosterExport = dsPosterExport;       // overrides stub in duet-mode.js

})();
