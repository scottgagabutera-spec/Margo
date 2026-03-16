/* ============================================================
   MARGO — js/ui/feed/swipe.js
   Swipe engine — TikTok-style card navigation
   ============================================================ */

let swipeIndex = 0;
let swipeDragging = false;
let swipeStartY = 0;
let swipeStartX = 0;
let swipeDeltaY = 0;
let swipeDeltaX = 0;
let swipeActive = null;
let swipeAnim = false;

function updateSwipeUI() {
  const filtered = getRankedPosts();
  const total = filtered.length;

  const counter = document.getElementById('cardCounter');
  if (counter) counter.textContent = total ? (swipeIndex + 1) + ' / ' + total : '';

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

  to.style.transition = 'none';
  to.style.transform = direction === 'next' ? 'translateY(105%)' : 'translateY(-105%)';
  to.style.zIndex = parseInt(from.style.zIndex || 0) + 1;

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      from.style.transition = 'transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.38s ease';
      from.style.transform = direction === 'next' ? 'translateY(-105%)' : 'translateY(105%)';
      from.style.opacity = '0';
      to.style.transition = 'transform 0.42s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s ease';
      to.style.transform = 'translateY(0)';
      to.style.opacity = '1';
      swipeIndex = toIdx;
      swipeActive = to;
      setTimeout(function() { swipeAnim = false; updateSwipeUI(); }, 420);
    });
  });
}

function onSwipeTouchStart(e) {
  if (swipeAnim || e.target.closest('button')) return;
  swipeDragging = true;
  swipeStartY = e.touches ? e.touches[0].clientY : e.clientY;
  swipeStartX = e.touches ? e.touches[0].clientX : e.clientX;
  swipeDeltaY = 0;
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
  if (swipeDeltaY > 0 && swipeIndex === 0) swipeDeltaY *= 0.15;
  if (swipeDeltaY < 0 && swipeIndex === filtered.length - 1) swipeDeltaY *= 0.15;
  swipeActive.style.transform = 'translateY(' + swipeDeltaY + 'px)';

  const stack = document.getElementById('cardStack');
  const cards = stack.querySelectorAll('.swipe-card');
  const thr = 40;
  if (swipeDeltaY < -thr && swipeIndex < filtered.length - 1) {
    const next = cards[swipeIndex + 1];
    const prog = Math.min(1, (-swipeDeltaY - thr) / (window.innerHeight * 0.4));
    next.style.transition = 'none';
    next.style.transform = 'translateY(' + ((1 - prog) * 105) + '%)';
    next.style.zIndex = parseInt(swipeActive.style.zIndex || 0) + 1;
  }
  if (swipeDeltaY > thr && swipeIndex > 0) {
    const prev = cards[swipeIndex - 1];
    const prog = Math.min(1, (swipeDeltaY - thr) / (window.innerHeight * 0.4));
    prev.style.transition = 'none';
    prev.style.transform = 'translateY(' + (-(1 - prog) * 105) + '%)';
    prev.style.zIndex = parseInt(swipeActive.style.zIndex || 0) + 1;
  }
}

function onSwipeTouchEnd() {
  if (!swipeDragging) return;
  swipeDragging = false;
  const thr = window.innerHeight * 0.12;
  const thrX = window.innerWidth * 0.2;
  if (Math.abs(swipeDeltaX) > Math.abs(swipeDeltaY) && Math.abs(swipeDeltaX) > thrX) {
    if (swipeDeltaX < 0) swipeGoTo('next');
    else swipeGoTo('prev');
  } else if (swipeDeltaY < -thr) {
    swipeGoTo('next');
  } else if (swipeDeltaY > thr) {
    swipeGoTo('prev');
  } else {
    if (swipeActive) {
      swipeActive.style.transition = 'transform 0.4s cubic-bezier(0.34,1.3,0.64,1)';
      swipeActive.style.transform = 'translateY(0)';
    }
    const stack = document.getElementById('cardStack');
    const cards = stack.querySelectorAll('.swipe-card');
    const filtered = getRankedPosts();
    if (swipeIndex < filtered.length - 1) {
      cards[swipeIndex + 1].style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
      cards[swipeIndex + 1].style.transform = 'translateY(105%)';
    }
    if (swipeIndex > 0) {
      cards[swipeIndex - 1].style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
      cards[swipeIndex - 1].style.transform = 'translateY(-105%)';
    }
  }
}

function initSwipeEngine() {
  const stack = document.getElementById('cardStack');
  if (!stack || stack.dataset.swipeReady) return;
  stack.dataset.swipeReady = '1';

  swipeIndex = 0;
  swipeActive = stack.querySelector('.swipe-card');
  stack.querySelectorAll('.swipe-card').forEach((c,i) => { c.style.opacity = i === 0 ? '1' : '0'; });

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

  const TAB_COLORS = {
    all:'#F4F1ED', Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF',
    Nostalgia:'#E8C547', Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6440',
    Loneliness:'#a0a0ff', SendIt:'#00e5c8', LetOut:'#c864ff'
  };

  

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