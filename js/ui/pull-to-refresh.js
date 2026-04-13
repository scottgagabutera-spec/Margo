/* ══════════════════════════════════════
   PULL TO REFRESH — Margo Edition
   Premium, tactile, brand-native.
   The M logo rises, pulses gold,
   then snaps back on release.
══════════════════════════════════════ */
(function initPullToRefresh() {
  const THRESHOLD = 80;   // px to trigger
  const MAX_PULL  = 130;  // px max drag
  const SNAP_MS   = 420;  // collapse duration

  let startY    = 0;
  let currentY  = 0;
  let active    = false;
  let triggered = false;
  let indicator = null;
  let logoEl    = null;
  let labelEl   = null;

  /* ── Build indicator ── */
  function buildIndicator() {
    if (indicator) return;
    indicator = document.createElement('div');
    indicator.id = 'ptr-wrap';
    indicator.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      pointer-events: none;
      height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      overflow: hidden;
      will-change: height;
    `;

    indicator.innerHTML = `
      <div id="ptr-inner" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-bottom: 14px;
        opacity: 0;
        transform: scale(0.7) translateY(10px);
        transition: opacity 0.18s, transform 0.18s;
        will-change: opacity, transform;
      ">
        <div id="ptr-ring" style="
          width: 44px; height: 44px;
          border-radius: 50%;
          background: rgba(232,197,71,0.10);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 0 rgba(232,197,71,0.35);
          transition: box-shadow 0.3s, background 0.3s;
        ">
          <svg id="ptr-logo" viewBox="-4 -4 88 88" xmlns="http://www.w3.org/2000/svg"
            width="26" height="26"
            style="transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), opacity 0.2s;">
            <circle cx="40" cy="40" r="36" fill="#E8C547"/>
            <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
              fill="none" stroke="#0B0B0D" stroke-width="5"
              stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55"/>
          </svg>
        </div>
        <span id="ptr-label" style="
          font-family: 'Lora', serif;
          font-size: 0.52rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: rgba(232,197,71,0.75);
          transition: color 0.2s, opacity 0.2s;
        ">Pull to refresh</span>
      </div>
    `;

    document.body.appendChild(indicator);
    logoEl  = indicator.querySelector('#ptr-logo');
    labelEl = indicator.querySelector('#ptr-label');
  }

  /* ── Helpers ── */
  function isLandingVisible() {
    const el = document.getElementById('landing');
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function atTop() {
    return (document.documentElement.scrollTop || document.body.scrollTop || 0) < 2;
  }

  /* ── Touch start ── */
  function onTouchStart(e) {
    if (!isLandingVisible() || !atTop()) return;
    startY   = e.touches[0].clientY;
    currentY = startY;
    active   = true;
    triggered = false;
    buildIndicator();
  }

  /* ── Touch move ── */
  function onTouchMove(e) {
    if (!active || !atTop()) return;
    currentY = e.touches[0].clientY;
    const dy = Math.max(0, currentY - startY);
    if (dy < 4) return;

    // Rubber-band resistance: feels elastic
    const pull     = Math.pow(dy, 0.78) * 2.1;
    const clamped  = Math.min(pull, MAX_PULL);
    const progress = Math.min(clamped / THRESHOLD, 1);

    const inner = document.getElementById('ptr-inner');
    const ring  = document.getElementById('ptr-ring');

    indicator.style.height = clamped * 0.72 + 'px';
    if (inner) {
      inner.style.opacity   = Math.min(progress * 1.4, 1);
      inner.style.transform = `scale(${0.7 + progress * 0.3}) translateY(${(1 - progress) * 8}px)`;
    }
    if (logoEl) {
      logoEl.style.transform = `rotate(${progress * 180}deg) scale(${0.85 + progress * 0.15})`;
    }
    if (ring) {
      const glow = Math.round(progress * 18);
      ring.style.boxShadow = `0 0 ${glow}px ${Math.round(glow * 0.6)}px rgba(232,197,71,${(progress * 0.4).toFixed(2)})`;
      ring.style.background = `rgba(232,197,71,${(0.08 + progress * 0.14).toFixed(2)})`;
    }
    if (labelEl) {
      labelEl.textContent = progress >= 1 ? 'Release to refresh' : 'Pull to refresh';
      labelEl.style.color = progress >= 1
        ? 'rgba(232,197,71,1)'
        : 'rgba(232,197,71,0.65)';
    }

    if (!triggered && progress >= 1) {
      triggered = true;
      // Haptic pulse if available
      if (navigator.vibrate) navigator.vibrate(8);
    }

    if (dy > 8) e.preventDefault();
  }

  /* ── Touch end ── */
  function onTouchEnd() {
    if (!active) return;
    active = false;

    const dy = Math.max(0, currentY - startY);
    const pull = Math.pow(dy, 0.78) * 2.1;

    if (pull >= THRESHOLD) {
      // Trigger: pulse the logo then refresh
      const ring  = document.getElementById('ptr-ring');
      const inner = document.getElementById('ptr-inner');
      if (labelEl) labelEl.textContent = 'Refreshing…';
      if (ring) {
        ring.style.transition  = 'box-shadow 0.15s, background 0.15s, transform 0.15s';
        ring.style.transform   = 'scale(1.15)';
        ring.style.boxShadow   = '0 0 28px 12px rgba(232,197,71,0.45)';
      }

      // Add spin keyframes once
      if (!document.getElementById('ptr-keyframes')) {
        const s = document.createElement('style');
        s.id = 'ptr-keyframes';
        s.textContent = `
          @keyframes ptr-spin {
            from { transform: rotate(0deg) scale(1); }
            to   { transform: rotate(360deg) scale(1); }
          }
          @keyframes ptr-pulse {
            0%,100% { box-shadow: 0 0 14px 4px rgba(232,197,71,0.3); }
            50%      { box-shadow: 0 0 28px 12px rgba(232,197,71,0.55); }
          }
        `;
        document.head.appendChild(s);
      }
      if (logoEl) logoEl.style.animation = 'ptr-spin 0.65s linear infinite';
      if (ring)   ring.style.animation   = 'ptr-pulse 0.65s ease-in-out infinite';

      setTimeout(() => {
        if (typeof renderFeed === 'function') renderFeed();
        if (typeof buildLyricStream === 'function') buildLyricStream();
        collapse(true);
      }, 700);
    } else {
      collapse(false);
    }
  }

  /* ── Collapse ── */
  function collapse(success) {
    if (!indicator) return;
    const inner = document.getElementById('ptr-inner');
    const ring  = document.getElementById('ptr-ring');

    if (logoEl) { logoEl.style.animation = ''; logoEl.style.transform = 'rotate(0deg) scale(1)'; }
    if (ring)   { ring.style.animation = ''; ring.style.transform = ''; }

    indicator.style.transition = `height ${SNAP_MS}ms cubic-bezier(.22,1,.36,1)`;
    indicator.style.height     = '0';
    if (inner) {
      inner.style.opacity   = '0';
      inner.style.transform = 'scale(0.7) translateY(10px)';
    }
    startY = 0; currentY = 0; triggered = false;
  }

  /* ── Attach ── */
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: true });
  document.addEventListener('touchcancel', () => { active = false; collapse(false); }, { passive: true });
})();
