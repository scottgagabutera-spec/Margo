/* ============================================================
   MARGO — js/ui/feed/swipe.js
   Swipe engine — modern fluid navigation
   ============================================================ */

let swipeIndex = 0;
let swipeDragging = false;
let swipeStartY = 0;
let swipeStartX = 0;
let swipeStartTime = 0;
let swipeDeltaY = 0;
let swipeDeltaX = 0;
let swipeActive = null;
let swipeAnim = false;

function updateSwipeUI() {
  const filtered = getRankedPosts();
  const total = filtered.length;
  const dotsEl = document.getElementById('progressDots');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    const show = Math.min(total, 12);
    for (let i = 0; i < show; i++) {
      const d = document.createElement('div');
      d.className = 'prog-dot' + (i === swipeIndex ? ' active' : '');
      dotsEl.appendChild(d);
    }
  }
  const navUp = document.getElementById('navUp');
  const navDown = document.getElementById('navDown');
  if (navUp) navUp.style.opacity = swipeIndex > 0 ? '1' : '0.2';
  if (navDown) navDown.style.opacity = swipeIndex < total - 1 ? '1' : '0.2';
}

function swipeGoTo(direction) {
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
  to.style.opacity = '0';
  to.style.transform = direction === 'next' ? 'translateY(55px) scale(0.94)' : 'translateY(-55px) scale(0.94)';
  to.style.zIndex = parseInt(from.style.zIndex || 0) + 1;

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      // Outgoing card
      from.style.transition = 'transform 0.28s cubic-bezier(0.4,0,1,1), opacity 0.22s ease';
      from.style.transform = direction === 'next' ? 'translateY(-30px) scale(0.9)' : 'translateY(30px) scale(0.9)';
      from.style.opacity = '0';
      // Incoming card — spring overshoot feel
      to.style.transition = 'transform 0.42s cubic-bezier(0.22,1.15,0.36,1), opacity 0.3s ease';
      to.style.transform = 'translateY(0) scale(1)';
      to.style.opacity = '1';
      swipeActive = to;
      setTimeout(function() { swipeAnim = false; updateSwipeUI(); }, 400);
    });
  });
}

function onSwipeTouchStart(e) {
  if (swipeAnim || e.target.closest('button,a,input')) return;
  swipeDragging = true;
  swipeStartY = e.touches ? e.touches[0].clientY : e.clientY;
  swipeStartX = e.touches ? e.touches[0].clientX : e.clientX;
  swipeStartTime = Date.now();
  swipeDeltaY = 0;
  swipeDeltaX = 0;
  if (swipeActive) swipeActive.style.transition = 'none';
}

function onSwipeTouchMove(e) {
  if (!swipeDragging || !swipeActive) return;
  e.preventDefault();
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  swipeDeltaY = y - swipeStartY;
  swipeDeltaX = x - swipeStartX;
  const filtered = getRankedPosts();

  // Rubber band at edges
  if (swipeDeltaY > 0 && swipeIndex === 0) swipeDeltaY *= 0.12;
  if (swipeDeltaY < 0 && swipeIndex === filtered.length - 1) swipeDeltaY *= 0.12;

  // Smooth drag follow with slight scale
  const progress = Math.abs(swipeDeltaY) / window.innerHeight;
  const scale = 1 - (progress * 0.03);
  swipeActive.style.transform = 'translateY(' + swipeDeltaY + 'px) scale(' + scale + ')';

  // Peek next/prev card
  const stack = document.getElementById('cardStack');
  const cards = stack.querySelectorAll('.swipe-card');
  const peekThr = 20;
  if (swipeDeltaY < -peekThr && swipeIndex < filtered.length - 1) {
    const next = cards[swipeIndex + 1];
    const prog = Math.min(1, (-swipeDeltaY - peekThr) / (window.innerHeight * 0.5));
    next.style.transition = 'none';
    next.style.opacity = String(0.4 + prog * 0.6);
    next.style.transform = 'translateY(' + ((1 - prog) * 100) + '%)';
    next.style.zIndex = parseInt(swipeActive.style.zIndex || 0) + 1;
  }
  if (swipeDeltaY > peekThr && swipeIndex > 0) {
    const prev = cards[swipeIndex - 1];
    const prog = Math.min(1, (swipeDeltaY - peekThr) / (window.innerHeight * 0.5));
    prev.style.transition = 'none';
    prev.style.opacity = String(0.4 + prog * 0.6);
    prev.style.transform = 'translateY(' + (-(1 - prog) * 100) + '%)';
    prev.style.zIndex = parseInt(swipeActive.style.zIndex || 0) + 1;
  }
}

function onSwipeTouchEnd() {
  if (!swipeDragging) return;
  swipeDragging = false;
  const elapsed = Date.now() - swipeStartTime;
  const velocityY = Math.abs(swipeDeltaY) / elapsed;
  const velocityX = Math.abs(swipeDeltaX) / elapsed;
  const thr = window.innerHeight * 0.12;
  const thrX = window.innerWidth * 0.18;

  // Fast flick always triggers — slow drag needs distance
  const isFastFlick = velocityY > 0.5 && Math.abs(swipeDeltaY) > 30;
  const isFastFlickX = velocityX > 0.5 && Math.abs(swipeDeltaX) > 30;

  if (Math.abs(swipeDeltaX) > Math.abs(swipeDeltaY) && (Math.abs(swipeDeltaX) > thrX || isFastFlickX)) {
    if (swipeDeltaX < 0) swipeGoTo('next');
    else swipeGoTo('prev');
  } else if (swipeDeltaY < -thr || isFastFlick && swipeDeltaY < -30) {
    swipeGoTo('next');
  } else if (swipeDeltaY > thr || isFastFlick && swipeDeltaY > 30) {
    swipeGoTo('prev');
  } else {
    // Snap back with spring
    if (swipeActive) {
      swipeActive.style.transition = 'transform 0.45s cubic-bezier(0.34,1.4,0.64,1), opacity 0.2s ease';
      swipeActive.style.transform = 'translateY(0) scale(1)';
      swipeActive.style.opacity = '1';
    }
    const stack = document.getElementById('cardStack');
    const cards = stack.querySelectorAll('.swipe-card');
    const filtered = getRankedPosts();
    if (swipeIndex < filtered.length - 1) {
      cards[swipeIndex + 1].style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease';
      cards[swipeIndex + 1].style.transform = 'translateY(100%)';
      cards[swipeIndex + 1].style.opacity = '0';
    }
    if (swipeIndex > 0) {
      cards[swipeIndex - 1].style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease';
      cards[swipeIndex - 1].style.transform = 'translateY(-100%)';
      cards[swipeIndex - 1].style.opacity = '0';
    }
  }
}

function initSwipeEngine() {
  const stack = document.getElementById('cardStack');
  swipeIndex = 0; swipeAnim = false; swipeDragging = false;
  if (stack.dataset.swipeReady) {
    swipeActive = stack.querySelector(".swipe-card");
    stack.querySelectorAll(".swipe-card").forEach((c,i) => {
      c.style.opacity = i === 0 ? "1" : "0";
      c.style.transform = i === 0 ? "translateY(0)" : "translateY(100%)";
    });
    updateSwipeUI(); return;
  }
  stack.dataset.swipeReady = "1";
  stack.addEventListener('touchstart', onSwipeTouchStart, { passive: true });
  stack.addEventListener('touchmove', onSwipeTouchMove, { passive: false });
  stack.addEventListener('touchend', onSwipeTouchEnd, { passive: true });
  stack.addEventListener('mousedown', onSwipeTouchStart);
  document.addEventListener('mousemove', function(e) { if (swipeDragging) onSwipeTouchMove(e); });
  document.addEventListener('mouseup', function() { if (swipeDragging) onSwipeTouchEnd(); });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') swipeGoTo('next');
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') swipeGoTo('prev');
  });

  var wheelT;
  stack.addEventListener('wheel', function(e) {
    e.preventDefault();
    clearTimeout(wheelT);
    wheelT = setTimeout(function() {
      if (e.deltaY > 30) swipeGoTo('next');
      else if (e.deltaY < -30) swipeGoTo('prev');
    }, 50);
  }, { passive: false });

  const navDown = document.getElementById('navDown');
  const navUp = document.getElementById('navUp');
  if (navDown) navDown.onclick = function() { swipeGoTo('next'); };
  if (navUp) navUp.onclick = function() { swipeGoTo('prev'); };

  document.querySelectorAll('.sort-btn').forEach(function(btn) {
    btn.onclick = function() {
      document.querySelectorAll('.sort-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentSort = btn.dataset.sort || 'fresh';
      renderFeed();
    };
  });

  updateSwipeUI();
}
