/* ══════════════════════════════════════
   PULL TO REFRESH
   Attaches to the landing section.
   On mobile: pull down > 72px triggers
   a Firebase re-sync + feed re-render.
══════════════════════════════════════ */
(function initPullToRefresh() {
  const THRESHOLD   = 72;   // px to pull before triggering
  const MAX_PULL    = 110;  // px max visual stretch
  const ANIM_MS     = 380;  // reset animation duration

  let startY     = 0;
  let pulling    = false;
  let indicator  = null;

  /* ── Create the indicator element ── */
  function createIndicator() {
    const el = document.createElement('div');
    el.id = 'pullRefreshIndicator';
    el.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 0;
      overflow: hidden;
      z-index: 9000;
      pointer-events: none;
      transition: height ${ANIM_MS}ms cubic-bezier(.22,1,.36,1);
      background: linear-gradient(to bottom, rgba(11,11,13,0.95), transparent);
    `;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;opacity:0;transition:opacity 0.2s;">
        <svg id="pullRefreshIcon" width="22" height="22" viewBox="0 0 24 24" fill="none"
          style="transition:transform 0.2s;stroke:var(--gold,#E8C547);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 .49-4"></path>
        </svg>
        <span style="font-family:'Lora',serif;font-size:0.55rem;text-transform:uppercase;
          letter-spacing:1.5px;color:var(--gold,#E8C547);" id="pullRefreshLabel">Pull to refresh</span>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  /* ── Only active when landing is visible ── */
  function isLandingVisible() {
    const landing = document.getElementById('landing');
    return landing && (landing.classList.contains('active') || getComputedStyle(landing).display !== 'none');
  }

  /* ── Touch start ── */
  function onTouchStart(e) {
    if (!isLandingVisible()) return;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop > 0) return;
    startY  = e.touches[0].clientY;
    pulling = false;
  }

  /* ── Touch move ── */
  function onTouchMove(e) {
    if (!isLandingVisible()) return;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollTop > 0) { pulling = false; return; }

    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { pulling = false; return; }

    pulling = true;
    const clamped  = Math.min(dy, MAX_PULL);
    const progress = clamped / THRESHOLD;

    if (!indicator) indicator = createIndicator();
    const inner = indicator.firstElementChild;
    const icon  = document.getElementById('pullRefreshIcon');
    const label = document.getElementById('pullRefreshLabel');

    indicator.style.height  = clamped * 0.65 + 'px';
    inner.style.opacity     = Math.min(progress, 1);
    if (icon) icon.style.transform = `rotate(${Math.min(progress * 220, 220)}deg)`;
    if (label) label.textContent   = progress >= 1 ? 'Release to refresh' : 'Pull to refresh';

    if (dy > 10) e.preventDefault();
  }

  /* ── Touch end ── */
  function onTouchEnd() {
    if (!pulling || !indicator) return;
    pulling = false;

    const inner = indicator.firstElementChild;
    const label = document.getElementById('pullRefreshLabel');
    const icon  = document.getElementById('pullRefreshIcon');
    const pulled = parseFloat(indicator.style.height) / 0.65;

    if (pulled >= THRESHOLD) {
      if (label) label.textContent = 'Refreshing\u2026';
      if (icon)  icon.style.animation = 'ptr-spin 0.7s linear infinite';

      if (!document.getElementById('ptr-keyframes')) {
        const style = document.createElement('style');
        style.id = 'ptr-keyframes';
        style.textContent = '@keyframes ptr-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      setTimeout(() => {
        if (typeof renderFeed === 'function') renderFeed();
        if (typeof buildLyricStream === 'function') buildLyricStream();
        collapse();
      }, 600);
    } else {
      collapse();
    }
  }

  function collapse() {
    if (!indicator) return;
    const inner = indicator.firstElementChild;
    const icon  = document.getElementById('pullRefreshIcon');
    indicator.style.transition = `height ${ANIM_MS}ms cubic-bezier(.22,1,.36,1)`;
    indicator.style.height     = '0';
    if (inner) inner.style.opacity = '0';
    if (icon)  icon.style.animation = '';
    startY = 0;
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: true });
})();
