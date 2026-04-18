/* ============================================================
   MARGO — js/core/brand.js
   Single source of truth for all brand mark drawing.

   drawMargoLockup(ctx, x, y, size, accentColor, isLight)
   — static version for poster

   drawMargoLockupAnimated(ctx, x, y, size, accentColor, isLight, t)
   — animated version for GIF (t = 0..1 per cycle)
============================================================ */

window.drawMargoLockup = function(ctx, x, y, size, accentColor, isLight) {
  var r  = size / 2;
  var cx = x + r;
  var cy = y + r;
  var sc = size / 80;
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle   = accentColor;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = size * 0.4;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = isLight ? '#ffffff' : '#0C0C0E';
  ctx.lineWidth   = 6 * sc;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(cx+(17-40)*sc, cy+(57-40)*sc);
  ctx.lineTo(cx+(17-40)*sc, cy+(27-40)*sc);
  ctx.lineTo(cx+(29-40)*sc, cy+(45-40)*sc);
  ctx.lineTo(cx+(40-40)*sc, cy+(26-40)*sc);
  ctx.lineTo(cx+(51-40)*sc, cy+(45-40)*sc);
  ctx.lineTo(cx+(63-40)*sc, cy+(27-40)*sc);
  ctx.lineTo(cx+(63-40)*sc, cy+(57-40)*sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.beginPath();
  ctx.roundRect(cx + (35-40)*sc, cy + (60-40)*sc, 10*sc, 3.5*sc, 1.75*sc);
  ctx.fillStyle   = isLight ? '#ffffff' : '#0C0C0E';
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.font         = '800 ' + Math.max(9, size*0.55) + 'px Syne, Arial Black, sans-serif';
  ctx.fillStyle    = accentColor;
  ctx.globalAlpha  = 0.25;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText('MARGO', cx + r + size * 0.22, cy);
  ctx.restore();
};

window.drawMargoLockupAnimated = function(ctx, x, y, size, accentColor, isLight, t) {
  var r  = size / 2;
  var cx = x + r;
  var cy = y + r;
  var sc = size / 80;

  /* ── 3 ripple rings — staggered like landing page ── */
  var delays = [0, 0.33, 0.66];
  delays.forEach(function(delay) {
    var p = (t + delay) % 1;
    /* scale: 0.55 → 2.8, opacity: 0.7 → 0 */
    var scale   = 0.55 + p * (2.8 - 0.55);
    var opacity = 0.7 * (1 - p);
    ctx.save();
    ctx.globalAlpha = opacity * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  });

  /* ── Static lockup on top of rings ── */
  window.drawMargoLockup(ctx, x, y, size, accentColor, isLight);
};
