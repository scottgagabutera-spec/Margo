/* ============================================================
   MARGO — js/app.js
   v4.7 — Fix: scrollToFeed accounts for full header stack.
          FAB hidden on landing page.
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

// ── Navigation ──
function goToFeed() {
  landing.classList.remove('active');
  feed.classList.add('active');
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);

  // Hide FAB — motion.js shows it only after user scrolls down
  const fab = document.getElementById('margoScrollTop');
  if (fab) fab.classList.remove('visible');

  renderFeed();
}

function goToLanding() {
  feed.classList.remove('active');
  landing.classList.add('active');

  // Always hide FAB on landing — landing already has its own CTA button
  const fab = document.getElementById('margoScrollTop');
  if (fab) fab.classList.remove('visible');
}

function scrollToFeed() {
  // Measure the full sticky header stack so content isn't hidden behind it
  const header     = document.querySelector('.feed-header');
  const searchWrap = document.querySelector('.feed-search-wrap');
  const tabsWrap   = document.querySelector('.room-tabs-wrap');
  const sortBar    = document.getElementById('feedSortBar');

  let stickyHeight = 0;
  if (header)     stickyHeight += header.offsetHeight;
  if (searchWrap) stickyHeight += searchWrap.offsetHeight;
  if (tabsWrap)   stickyHeight += tabsWrap.offsetHeight;
  if (sortBar)    stickyHeight += sortBar.offsetHeight;

  const margin = 12;
  window.scrollTo({ top: stickyHeight + margin, behavior: 'smooth' });
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

console.log('MARGO v4.7 dev — scroll fix + FAB landing hide.');
