/* ============================================================
   MARGO — js/core/brand.js
   Single source of truth for all brand mark drawing.
   drawMargoLockup(ctx, x, y, size, accentColor, isLight)
   x, y        — top-left position of the M circle
   size        — diameter of the M circle (e.g. W * 0.048)
   accentColor — theme accent color
   isLight     — true for light backgrounds
============================================================ */
window.drawMargoLockup = function(ctx, x, y, size, accentColor, isLight) {
  var r  = size / 2;
  var cx = x + r;
  var cy = y + r;
  var sc = size / 80;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle   = accentColor;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = size * 0.4;
  ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = isLight ? '#ffffff' : '#0C0C0E';
  ctx.lineWidth   = 6 * sc;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(cx+(19-40)*sc, cy+(55-40)*sc);
  ctx.lineTo(cx+(19-40)*sc, cy+(28-40)*sc);
  ctx.lineTo(cx+(31-40)*sc, cy+(44-40)*sc);
  ctx.lineTo(cx+(40-40)*sc, cy+(30-40)*sc);
  ctx.lineTo(cx+(49-40)*sc, cy+(44-40)*sc);
  ctx.lineTo(cx+(61-40)*sc, cy+(28-40)*sc);
  ctx.lineTo(cx+(61-40)*sc, cy+(55-40)*sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy+(60-40)*sc, 3*sc, 0, Math.PI*2);
  ctx.fillStyle   = isLight ? '#ffffff' : '#0C0C0E';
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  var textSize = Math.max(9, size * 0.55);
  ctx.font         = '800 ' + textSize + 'px Syne, Arial Black, sans-serif';
  ctx.fillStyle    = accentColor;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText('MARGO', cx + r + size * 0.22, cy);
  ctx.restore();
};
