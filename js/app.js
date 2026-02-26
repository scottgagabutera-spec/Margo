/* ============================================================
   MARGO — js/app.js
   v4.5 — Fixed scroll-to-feed: smooth scroll accounts for
           sticky header height so the sort bar and date
           section are never hidden behind it.
   Loaded last — all other modules must be loaded first.
   Depends on: state.js, firebase.js, feed.js, composer.js,
               studio.js, admin.js, motion.js
   ============================================================ */

// ── Toast ──
// motion.js will intercept and upgrade this automatically.
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

/* ──────────────────────────────────────────────────────────────
   scrollToFeed — smooth scroll to feed content area, accounting
   for the sticky feed header so no content is ever hidden under it.

   BEFORE: feedList.scrollIntoView({ behavior:'smooth' }) — this
   scrolled the LIST itself into view but ignored the sticky
   header, so the top 52px of content (date, sort bar, count)
   was always hidden behind it.

   NOW: We measure the header, add a comfortable margin (16px),
   and use window.scrollTo with smooth behavior so the transition
   is elegant rather than abrupt.
──────────────────────────────────────────────────────────────── */
function scrollToFeed() {
  const sortBar    = document.getElementById('feedSortBar');
  const header     = document.querySelector('.feed-header');
  const headerH    = header ? header.offsetHeight : 52;
  const margin     = 14; // comfortable breathing room below header

  // Prefer to scroll to the sort bar (sits above feedList), else feedList
  const target     = sortBar || feedList;
  if (!target) return;

  const targetTop  = target.getBoundingClientRect().top + window.pageYOffset;
  const scrollTo   = Math.max(0, targetTop - headerH - margin);

  window.scrollTo({ top: scrollTo, behavior: 'smooth' });
}

function initNavigation() {
  enterBtn.onclick = () => {
    goToFeed();
    setTimeout(() => { openModal(composer); setTimeout(() => textInput.focus(), 200); }, 100);
  };

  const efb1 = document.getElementById('enterFeedBtn');
  const efb2 = document.getElementById('enterFeedBtn2');

  // Fixed: use scrollToFeed() which accounts for header height
  if (efb1) efb1.onclick = () => { goToFeed(); setTimeout(scrollToFeed, 180); };
  if (efb2) efb2.onclick = () => { goToFeed(); setTimeout(scrollToFeed, 180); };

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
//   INIT
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

console.log('MARGO v4.5 — scroll fixed, moderation fixed, smart ranking.');
