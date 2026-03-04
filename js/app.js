/* ============================================================
   MARGO — js/app.js
   v6.0 — concept-v2 branch:
          • postcardModal / studioChooser removed
          • studios return via reopenShareSheet()
          • sharePosterBtn → openShareSheet()
          • FAB wiring unchanged
          • scrollToFeed unchanged
          • initStudio() back-button patched to call reopenShareSheet
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

// ── Modal helpers (kept for guess/discover/listen/analytics) ──
function openModal(modal) {
  if (!modal) return;
  savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  document.body.style.top = `-${savedScrollPosition}px`;
}

function closeModal(modal) {
  if (!modal) return;
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

// ── scrollToFeed ── (unchanged from v5.4)
function scrollToFeed() {
  let attempts = 0;

  function getStickyOffset() {
    const header  = document.querySelector('.feed-header');
    const search  = document.querySelector('.feed-search-wrap');
    const tabs    = document.querySelector('.room-tabs-wrap');
    const sortBar = document.getElementById('feedSortBar');
    return (
      (header  ? header.offsetHeight  : 54) +
      (search  ? search.offsetHeight  : 52) +
      (tabs    ? tabs.offsetHeight    : 42) +
      (sortBar ? sortBar.offsetHeight : 38)
    );
  }

  const tryScroll = () => {
    attempts++;
    const firstCard = document.querySelector('#feedList .feed-card:not(.skeleton-card)');
    if (firstCard || attempts >= 20) {
      const stickyOffset = getStickyOffset();
      const cardTop = firstCard
        ? firstCard.getBoundingClientRect().top + window.scrollY
        : 300;
      const target = cardTop - stickyOffset - 12;
      window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
    } else {
      setTimeout(tryScroll, 80);
    }
  };
  setTimeout(tryScroll, 500);
}

function initNavigation() {
  // Enter → open feed + composer
  if (enterBtn) {
    enterBtn.onclick = () => {
      goToFeed();
      setTimeout(() => { openModal(composer); setTimeout(() => textInput?.focus(), 200); }, 100);
    };
  }

  const efb1 = document.getElementById('enterFeedBtn');
  const efb2 = document.getElementById('enterFeedBtn2');
  if (efb1) efb1.onclick = () => { goToFeed(); scrollToFeed(); };
  if (efb2) efb2.onclick = () => { goToFeed(); scrollToFeed(); };

  if (backBtn)          backBtn.onclick          = goToLanding;
  if (openComposerBtn)  openComposerBtn.onclick  = () => { openModal(composer); setTimeout(() => textInput?.focus(), 200); };
  if (closeComposerBtn) closeComposerBtn.onclick = () => { closeModal(composer); resetComposer(); };

  // Touch swipe nav
  let tSX = 0, tSY = 0;
  [landing, feed].filter(Boolean).forEach(s => {
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

/* ────────────────────────────────────────────────────────────
   STUDIO BACK BUTTON PATCH
   In concept-v2, studios return to the share sheet, not
   the (removed) postcard modal. We patch closeStudio and
   closeGifStudio to call reopenShareSheet() instead.
──────────────────────────────────────────────────────────── */
function patchStudioBackButtons() {
  // Image studio close button
  const closeStudioBtn = document.getElementById('closeStudio');
  if (closeStudioBtn) {
    closeStudioBtn.onclick = () => {
      const overlay = document.getElementById('studioOverlay');
      if (overlay) overlay.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (typeof reopenShareSheet === 'function') reopenShareSheet();
    };
  }

  // GIF studio close button
  const closeGifBtn = document.getElementById('closeGifStudio');
  if (closeGifBtn) {
    closeGifBtn.onclick = () => {
      if (typeof gsStopPreview === 'function') gsStopPreview();
      const overlay = document.getElementById('gifStudioOverlay');
      if (overlay) overlay.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (typeof reopenShareSheet === 'function') reopenShareSheet();
    };
  }
}

/* ────────────────────────────────────────────────────────────
   SHARE SHEET — wire sharePosterBtn from postcard (now gone)
   sharePosterBtn in index.html was inside postcardModal.
   In concept-v2 the postcard is removed, but if the element
   still exists for backward compat, wire it to openShareSheet.
──────────────────────────────────────────────────────────── */
function wireSharPosterBtn() {
  if (sharePosterBtn) {
    sharePosterBtn.onclick = () => {
      if (typeof openShareSheet === 'function' && currentPost) {
        openShareSheet(currentPost);
      }
    };
  }
}

/* ────────────────────────────────────────────────────────────
   COMPOSER SUBMIT — open share sheet after posting
   Patches the submitPost behaviour: after a successful post,
   instead of opening the studio chooser, open the share sheet.
──────────────────────────────────────────────────────────── */
function patchComposerForShareSheet() {
  // openStudioChooser is called by composer.js submitPost(true).
  // We override it to open the share sheet instead.
  window.openStudioChooser = function() {
    if (typeof openShareSheet === 'function' && currentPost) {
      setTimeout(() => {
        showToast('Posted — now make it visual');
        openShareSheet(currentPost);
      }, 120);
    }
  };
}

/* ────────────────────────────────────────────────────────────
   GUESS / DISCOVER / LISTEN / ANALYTICS
   These modals still exist and work the same way.
──────────────────────────────────────────────────────────── */
// (All wired by composer.js — no changes needed here)

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
if (typeof initCardTilt === 'function') initCardTilt();
initComposer();

try {
  initStudio();
} catch (err) {
  console.warn('[Margo] initStudio error (non-fatal):', err.message);
}

// concept-v2 patches
patchStudioBackButtons();
patchComposerForShareSheet();
wireSharPosterBtn();

initAdmin();
startFirebaseSync();

console.log('MARGO v6.0 concept-v2 — share sheet, echoes, resonate, username system active.');
