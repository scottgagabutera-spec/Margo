/* ============================================================
   MARGO — js/app.js
   v5.3 — scrollToFeed scrolls to the first feed card directly
          using its actual DOM position. No height measurement,
          no guessing — just finds the first card and goes there.
   ============================================================ */

// ── Toast ──
function showToast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ── Modal helpers ──
function openModal(modal) {
  savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  document.body.style.top = `-${savedScrollPosition}px`;
}

function closeModal(modal) {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, savedScrollPosition);
}

// ── Page state helpers ──
function setPageState(page) {
  document.body.classList.remove('on-landing', 'on-feed');
  document.body.classList.add('on-' + page);
  const fab = document.getElementById('margoScrollTop');
  if (fab) fab.classList.remove('visible');
}

// ── Navigation ──
function goToFeed() {
  landing.classList.remove('active');
  feed.classList.add('active');
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
  setPageState('feed');
  renderFeed();
}

function goToLanding() {
  feed.classList.remove('active');
  landing.classList.add('active');
  setPageState('landing');
}

// scrollToFeed — finds the first real feed card and scrolls to it.
// This is bulletproof: no sticky height guessing, just the card position.
function scrollToFeed() {
  let attempts = 0;

  const tryScroll = () => {
    attempts++;

    // Wait for a real card (not skeleton) to appear in the feed
    const firstCard = document.querySelector('#feedList .feed-card:not(.skeleton-card)');

    if (firstCard || attempts >= 20) {
      const target = firstCard
        ? firstCard.getBoundingClientRect().top + window.scrollY - 8
        : 200; // fallback

      setTimeout(() => {
        window.scrollTo({ top: target, behavior: 'instant' });
      }, 0);
    } else {
      setTimeout(tryScroll, 80);
    }
  };

  // Wait 500ms so renderFeed() completes and cards are in the DOM
  setTimeout(tryScroll, 500);
}

function initNavigation() {
  enterBtn.onclick = () => {
    goToFeed();
    setTimeout(() => { openModal(composer); setTimeout(() => textInput.focus(), 200); }, 100);
  };

  const efb1 = document.getElementById('enterFeedBtn');
  const efb2 = document.getElementById('enterFeedBtn2');
  if (efb1) efb1.onclick = () => { goToFeed(); scrollToFeed(); };
  if (efb2) efb2.onclick = () => { goToFeed(); scrollToFeed(); };

  backBtn.onclick          = goToLanding;
  openComposerBtn.onclick  = () => { openModal(composer); setTimeout(() => textInput.focus(), 200); };
  closeComposerBtn.onclick = () => { closeModal(composer); resetComposer(); };

  let tSX = 0, tSY = 0;
  [landing, feed].forEach(s => {
    s.addEventListener('touchstart', e => { tSX = e.touches[0].clientX; tSY = e.touches[0].clientY; });
    s.addEventListener('touchend', e => {
      const dx = tSX - e.changedTouches[0].clientX;
      const dy = Math.abs(tSY - e.changedTouches[0].clientY);
      if (Math.abs(dx) > dy && Math.abs(dx) > 100) {
        if (dx > 0 && landing.classList.contains('active')) goToFeed();
        if (dx < 0 && feed.classList.contains('active'))   goToLanding();
      }
    });
  });
}

function setupScrollToTop() {
  if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';
  if (newPostsIndicator) {
    newPostsIndicator.onclick = () => {
      newPostsAvailable = false;
      renderFeed();
      newPostsIndicator.classList.remove('visible');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }
}

// ════════════════════════════════════════════════════════
//   INIT
// ════════════════════════════════════════════════════════
setPageState('landing');

initStatsShimmer();
initNavigation();
setupScrollToTop();
setupStatsBar();
preloadStudioFonts();
buildLyricStream();
initSearch();
initRoomTabs();
initComposer();

try {
  initStudio();
} catch (err) {
  console.warn('[Margo] initStudio error (non-fatal):', err.message);
}

initAdmin();
startFirebaseSync();

console.log('MARGO v5.3 dev — scrollToFeed targets first card directly.');
