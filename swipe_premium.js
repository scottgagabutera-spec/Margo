const fs = require('fs');
let c = fs.readFileSync('js/ui/feed/swipe.js', 'utf8');

const oldFn = `function swipeGoTo(direction) {
  if (swipeAnim) return;
  const filtered = getRankedPosts();
  const total = filtered.length;
  if (direction === 'next' && swipeIndex >= total - 1) return;
  if (direction === 'prev' && swipeIndex <= 0) return;

  swipeAnim = true;
  const stack = document.getElementById('cardStack');
  const cards = stack.querySelectorAll('.swipe-card');
  const from = cards[swipeIndex];
  const toIdx = direction === 'next' ? swipeIndex + 1 : swipeIndex - 1;
  const to = cards[toIdx];

  // Prepare incoming card
  to.style.transition = 'none';
  to.style.opacity = '1';
  to.style.transform = direction === 'next' ? 'translateY(100%)' : 'translateY(-100%)';
  to.style.zIndex = parseInt(from.style.zIndex || 0) + 1;

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      // Outgoing card
      from.style.transition = 'transform 0.32s cubic-bezier(0.4,0,1,1), opacity 0.28s ease';
      from.style.transform = direction === 'next' ? 'translateY(-100%)' : 'translateY(100%)';
      from.style.opacity = '0';
      // Incoming card — spring overshoot feel
      to.style.transition = 'transform 0.38s cubic-bezier(0.22,1.2,0.36,1)';
      to.style.transform = 'translateY(0) scale(1)';
      swipeIndex = toIdx;
      swipeActive = to;
      setTimeout(function() { swipeAnim = false; updateSwipeUI(); }, 400);
    });
  });
}`;

const newFn = `function swipeGoTo(direction) {
  if (swipeAnim) return;
  const filtered = getRankedPosts();
  const total = filtered.length;
  if (direction === 'next' && swipeIndex >= total - 1) return;
  if (direction === 'prev' && swipeIndex <= 0) return;

  swipeAnim = true;
  const stack = document.getElementById('cardStack');
  const cards = stack.querySelectorAll('.swipe-card');
  const from = cards[swipeIndex];
  const toIdx = direction === 'next' ? swipeIndex + 1 : swipeIndex - 1;
  const to = cards[toIdx];

  // Prepare incoming card — just below/above, slightly scaled down, fully visible
  to.style.transition = 'none';
  to.style.opacity = '1';
  to.style.transform = direction === 'next' ? 'translateY(6%) scale(0.96)' : 'translateY(-6%) scale(0.96)';
  to.style.zIndex = parseInt(from.style.zIndex || 0) + 1;

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      // Outgoing card — shrinks and fades out quickly
      from.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.6,1), opacity 0.25s ease';
      from.style.transform = direction === 'next' ? 'translateY(-8%) scale(0.92)' : 'translateY(8%) scale(0.92)';
      from.style.opacity = '0';
      // Incoming card — rises into place with premium spring
      to.style.transition = 'transform 0.4s cubic-bezier(0.22,1.1,0.36,1), opacity 0.3s ease';
      to.style.transform = 'translateY(0) scale(1)';
      to.style.opacity = '1';
      swipeIndex = toIdx;
      swipeActive = to;
      setTimeout(function() { swipeAnim = false; updateSwipeUI(); }, 420);
    });
  });
}`;

if (c.indexOf(oldFn) !== -1) {
  c = c.replace(oldFn, newFn);
  fs.writeFileSync('js/ui/feed/swipe.js', c);
  console.log('SUCCESS: swipeGoTo rewritten with premium transition');
} else {
  console.log('ERROR: pattern not found - no changes made');
}
