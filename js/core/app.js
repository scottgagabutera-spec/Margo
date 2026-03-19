/* ============================================================
   MARGO — js/core/app.js
   v6.2 — concept-v2-clean:
          • initStudio() call removed — studio.js self-inits
          • patchStudioBackButtons uses onclick (overrides studio.js addEventListener)
          • closeStudio() called via window.closeStudio() for full state cleanup
          • studios return via reopenShareSheet()
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
function setArrows(show) {
  const al = document.querySelector('.nav-arrows-left');
  const ar = document.querySelector('.nav-arrows-right');
  if (al) al.style.display = show ? 'flex' : 'none';
  if (ar) ar.style.display = show ? 'flex' : 'none';
}
function goToFeed() {
  landing.classList.remove('active');
  feed.classList.add('active');
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
  setPageState('feed');
  mountUsernamePill();
  renderFeed();
  // Show swipe hint briefly on first feed load
  const hint = document.getElementById('swipeHint');
  if (hint) {
    hint.style.cssText = 'display:flex!important;opacity:1;visibility:visible;position:absolute;bottom:200px;left:50%;transform:translateX(-50%);z-index:200;flex-direction:column;align-items:center;gap:10px;pointer-events:none;transition:opacity 1s ease;';
    setTimeout(() => { hint.style.opacity = '0'; }, 3000);
    setTimeout(() => { hint.style.display = 'none'; }, 4000);
    document.addEventListener('touchstart', () => { hint.style.opacity = '0'; setTimeout(() => { hint.style.display = 'none'; }, 1000); }, { once: true });
  }
  setArrows(true);
}

/* ── Mount username pill into header ── */
function mountUsernamePill() {
  const slot = document.getElementById('headerUsernamePill');
  if (!slot || typeof window.MargoUsername === 'undefined') return;
  slot.style.display = 'flex';
  slot.innerHTML = '';
  const pill = window.MargoUsername.buildPill(window.MargoUsername.get());
  pill.style.cursor = 'pointer';
  pill.title = 'Your Margo name — tap to view';
  pill.onclick = () => window.MargoUsername.showReveal();
  slot.appendChild(pill);
}

function goToLanding() {
  setArrows(false);
  const stack = document.getElementById('cardStack');
  if (stack) delete stack.dataset.swipeReady;
  feed.classList.remove('active');
  landing.classList.add('active');
  setPageState('landing');
}

// ── scrollToFeed ──
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
  if (enterBtn) {
    enterBtn.onclick = () => {
      openModal(composer);
      setTimeout(() => textInput?.focus(), 200);
    };
  }

  const efb1 = document.getElementById('enterFeedBtn');
  const efb2 = document.getElementById('enterFeedBtn2');
  if (efb1) efb1.onclick = () => { goToFeed(); scrollToFeed(); };
  if (efb2) efb2.onclick = () => { goToFeed(); scrollToFeed(); };

  if (backBtn)          backBtn.onclick          = goToLanding;
  if (openComposerBtn)  openComposerBtn.onclick  = () => { openModal(composer); setTimeout(() => textInput?.focus(), 200); };
  if (closeComposerBtn) closeComposerBtn.onclick = () => { closeModal(composer); resetComposer(); };

  let tSX = 0, tSY = 0;
  [landing, feed].filter(Boolean).forEach(s => {
    s.addEventListener('touchstart', e => { tSX = e.touches[0].clientX; tSY = e.touches[0].clientY; });
    s.addEventListener('touchend', e => {
      const dx = tSX - e.changedTouches[0].clientX;
      const dy = Math.abs(tSY - e.changedTouches[0].clientY);
      if (Math.abs(dx) > dy && Math.abs(dx) > 100) {
        if (dx > 0 && landing.classList.contains('active')) goToFeed();
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
   Uses .onclick to fully override any addEventListener bound
   earlier by studio.js. Single handler, no double-fire.
   Calls window.closeStudio() / window.closeGifStudio() for full
   state cleanup, then reopens the share sheet.
──────────────────────────────────────────────────────────── */
function patchStudioBackButtons() {
  const closeStudioBtn = document.getElementById('closeStudio');
  if (closeStudioBtn) {
    closeStudioBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof window.closeStudio === 'function') {
        window.closeStudio();
      } else {
        document.getElementById('studioOverlay')?.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
      if (typeof reopenShareSheet === 'function') reopenShareSheet();
    };
  }

  const closeGifBtn = document.getElementById('closeGifStudio');
  if (closeGifBtn) {
    closeGifBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof gsStopPreview === 'function') gsStopPreview();
      const overlay = document.getElementById('gifStudioOverlay');
      if (overlay) overlay.classList.add('hidden');
      document.body.classList.remove('modal-open');
      if (typeof reopenShareSheet === 'function') reopenShareSheet();
    };
  }
}

/* ────────────────────────────────────────────────────────────
   SHARE SHEET — wire sharePosterBtn
──────────────────────────────────────────────────────────── */
function wireSharPosterBtn() {
  if (typeof sharePosterBtn !== 'undefined' && sharePosterBtn) {
    sharePosterBtn.onclick = () => {
      if (typeof openShareSheet === 'function' && currentPost) {
        openShareSheet(currentPost);
      }
    };
  }
}

/* ────────────────────────────────────────────────────────────
   COMPOSER SUBMIT — open share sheet after posting
──────────────────────────────────────────────────────────── */
function patchComposerForShareSheet() {
  window.openStudioChooser = function() {
    if (typeof openShareSheet === 'function' && currentPost) {
      setTimeout(() => {
        showToast('Posted — now make it visual');
        openShareSheet(currentPost);
      }, 120);
    }
  };
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
if (typeof initCardTilt === 'function') initCardTilt();
initComposer();

// NOTE: initStudio() removed — studio.js self-initialises on DOMContentLoaded

// concept-v2 patches — run after DOM is ready
patchStudioBackButtons();
patchComposerForShareSheet();
wireSharPosterBtn();

initAdmin();
startFirebaseSync();

console.log('MARGO v6.2 concept-v2-clean — duet sheet active, studio self-init.');
