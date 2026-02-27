/* ============================================================
   MARGO — js/app.js
   v4.9 — Body gets class 'on-landing' or 'on-feed' so CSS
          can cleanly hide the floating FAB on landing.
          scrollToFeed waits for sort bar injection.
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
  // 'landing' or 'feed'
  document.body.classList.remove('on-landing', 'on-feed');
  document.body.classList.add('on-' + page);
  // Always hide FAB immediately when switching pages
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

// Measure sticky stack height — waits for sort bar (injected by feed.js)
function scrollToFeed() {
  let attempts = 0;
  const tryScroll = () => {
    attempts++;
    const sortBar    = document.getElementById('feedSortBar');
    const header     = document.querySelector('.feed-header');
    const searchWrap = document.querySelector('.feed-search-wrap');
    const tabsWrap   = document.querySelector('.room-tabs-wrap');

    if (sortBar || attempts >= 10) {
      let h = 0;
      if (header)     h += header.getBoundingClientRect().height;
      if (searchWrap) h += searchWrap.getBoundingClientRect().height;
      if (tabsWrap)   h += tabsWrap.getBoundingClientRect().height;
      if (sortBar)    h += sortBar.getBoundingClientRect().height;
      window.scrollTo({ top: h + 8, behavior: 'smooth' });
    } else {
      setTimeout(tryScroll, 50);
    }
  };
  // Give renderFeed() a head start before we try to measure
  setTimeout(tryScroll, 80);
}

function initNavigation() {
  enterBtn.onclick = () => {
    goToFeed();
    setTimeout(() => { openModal(composer); setTimeout(() => textInput.focus(), 200); }, 100);
  };

  const efb1 = document.getElementById('enterFeedBtn');
  const efb2 = document.getElementById('enterFeedBtn2');
  if (efb1) efb1.onclick = () => { goToFeed(); setTimeout(scrollToFeed, 200); };
  if (efb2) efb2.onclick = () => { goToFeed(); setTimeout(scrollToFeed, 200); };

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
// Set initial page state — landing is active on load
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

console.log('MARGO v4.9 dev — body state class + scroll fix + minimal TOP.');
