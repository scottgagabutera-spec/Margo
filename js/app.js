/* ============================================================
   MARGO — js/app.js
   Navigation, modal helpers, toast, scroll, and the
   main INIT block that starts everything.
   Loaded last — all other modules must be loaded first.
   Depends on: state.js, firebase.js, feed.js, composer.js,
               studio.js, admin.js, motion.js
   v4.4 — scroll FAB delegated to motion.js
   ============================================================ */

// ── Toast ──
// motion.js will intercept and upgrade this automatically.
// This is just the base definition so the function exists.
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
  renderFeed();
}

function goToLanding() {
  feed.classList.remove('active');
  landing.classList.add('active');
}

function initNavigation() {
  enterBtn.onclick = () => {
    goToFeed();
    setTimeout(() => { openModal(composer); setTimeout(() => textInput.focus(), 200); }, 100);
  };

  const efb1 = document.getElementById('enterFeedBtn');
  const efb2 = document.getElementById('enterFeedBtn2');
  if (efb1) efb1.onclick = () => { goToFeed(); setTimeout(() => feedList?.scrollIntoView({ behavior: 'smooth' }), 150); };
  if (efb2) efb2.onclick = () => { goToFeed(); setTimeout(() => feedList?.scrollIntoView({ behavior: 'smooth' }), 150); };

  backBtn.onclick         = goToLanding;
  openComposerBtn.onclick = () => { openModal(composer); setTimeout(() => textInput.focus(), 200); };
  closeComposerBtn.onclick= () => { closeModal(composer); resetComposer(); };

  // Swipe left/right between landing and feed
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

// ── Scroll utilities ──
// The back-to-top FAB is fully handled by motion.js.
// This only hides the legacy button and wires the new-posts indicator.
function setupScrollToTop() {
  // Hide legacy button — motion.js FAB replaces it
  if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';

  // New posts indicator
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
//   INIT — runs once on page load, in dependency order
// ════════════════════════════════════════════════════════
initStatsShimmer();    // show shimmer before Firebase loads
initNavigation();      // wire nav buttons + swipe
setupScrollToTop();    // hide legacy btn, wire new-posts bar
setupStatsBar();       // responsive stats alignment
preloadStudioFonts();  // kick off font loading early
buildLyricStream();    // populate hero stream with samples
initSearch();          // search bar
initRoomTabs();        // emotion room tab filter
initComposer();        // composer modal + post/guess/discover
initStudio();          // Margo Studio canvas
initAdmin();           // admin moderation (B+G trigger)
startFirebaseSync();   // start Firebase listeners last

console.log('MARGO v4.4 — modular. Firebase:', isFirebaseEnabled);
