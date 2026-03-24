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

  // Prepare incoming card — starts slightly offset and transparent
  to.style.transition = 'none';
  to.style.opacity = '0';
  to.style.transform = direction === 'next' ? 'translateY(55px) scale(0.94)' : 'translateY(-55px) scale(0.94)';
  to.style.zIndex = parseInt(from.style.zIndex || 0) + 1;

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      // Outgoing card — shrinks and fades into background
      from.style.transition = 'transform 0.28s cubic-bezier(0.4,0,1,1), opacity 0.22s ease';
      from.style.transform = direction === 'next' ? 'translateY(-30px) scale(0.9)' : 'translateY(30px) scale(0.9)';
      from.style.opacity = '0';
      // Incoming card — rises up with spring bounce
      to.style.transition = 'transform 0.42s cubic-bezier(0.22,1.15,0.36,1), opacity 0.3s ease';
      to.style.transform = 'translateY(0) scale(1)';
      to.style.opacity = '1';
      swipeIndex = toIdx;
      swipeActive = to;
      setTimeout(function() { swipeAnim = false; updateSwipeUI(); }, 450);
    });
  });
}`;

if (c.indexOf(oldFn) !== -1) {
  c = c.replace(oldFn, newFn);
  fs.writeFileSync('js/ui/feed/swipe.js', c);
  console.log('swipeGoTo rewritten successfully');
} else {
  console.log('ERROR: pattern not found - no changes made');
}
