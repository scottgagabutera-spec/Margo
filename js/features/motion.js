/* ============================================================
   MARGO — js/motion.js
   Premium Interaction Layer v1.5

   FIXES:
   - No emoji in toast icons — clean typographic marks only
   - Toast wording is direct, human, not system-like
   - No longer creates a new #margoScrollTop — reuses HTML button
   - body.on-landing hides ALL fixed floaters via CSS
   - Scroll detection on window (not #feed)
   ============================================================ */

(function () {
  'use strict';

  function injectMotionStyles() {
    if (document.getElementById('margoMotionStyles')) return;
    const s = document.createElement('style');
    s.id = 'margoMotionStyles';
    s.textContent = `
      :root {
        --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
        --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* ── Kill ALL legacy scroll/back-to-top elements ── */
      #scrollToTopBtn,
      .scroll-top,
      [id*="scrollTop"]:not(#margoScrollTop) {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* ═══════════════════════════════════════
         LANDING PAGE: hide ALL floating buttons
      ═══════════════════════════════════════ */
      body.on-landing #margoScrollTop,
      body.on-landing #dropLyricFAB,
      body.on-landing [style*="position: fixed"][style*="DROP"],
      body.on-landing [style*="position:fixed"][style*="DROP"] {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateY(12px) !important;
      }

      /* ── FAB wrapper ── */
      #margoScrollTop {
        position: fixed;
        bottom: 28px;
        right: 20px;
        z-index: 9998;
        cursor: pointer;
        border: none;
        padding: 0;
        background: none;
        pointer-events: none;
        opacity: 0;
        transform: translateY(10px);
        transition:
          opacity 260ms var(--ease-out),
          transform 260ms var(--ease-spring);
      }
      #margoScrollTop.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }
      #margoScrollTop:active {
        transform: scale(0.92) !important;
        transition: transform 100ms var(--ease-smooth) !important;
      }

      /* ── The pill ── */
      #mst-pill {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        padding: 9px 16px 10px;
        border-radius: 50px;
        background: rgba(10, 10, 12, 0.78);
        backdrop-filter: blur(24px) saturate(1.8);
        -webkit-backdrop-filter: blur(24px) saturate(1.8);
        border: 1px solid rgba(232, 197, 71, 0.25);
        box-shadow:
          0 2px 20px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.04);
        overflow: hidden;
        transition:
          border-color 200ms var(--ease-smooth),
          box-shadow   200ms var(--ease-smooth),
          background   200ms var(--ease-smooth);
      }
      #margoScrollTop:hover #mst-pill {
        border-color: rgba(232, 197, 71, 0.6);
        background: rgba(18, 18, 22, 0.9);
        box-shadow:
          0 6px 28px rgba(0,0,0,0.5),
          0 0 14px rgba(232,197,71,0.08),
          inset 0 1px 0 rgba(232,197,71,0.08);
      }

      /* Arrow icon */
      #mst-arrow {
        color: #E8C547;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 200ms var(--ease-spring);
        line-height: 1;
      }
      #margoScrollTop:hover #mst-arrow {
        transform: translateY(-2px);
      }

      /* "TOP" label */
      #mst-label {
        font-family: 'Space Mono', monospace;
        font-size: 0.42rem;
        font-weight: 700;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        color: rgba(232, 197, 71, 0.55);
        line-height: 1;
        transition: color 200ms;
        margin-top: 1px;
      }
      #margoScrollTop:hover #mst-label {
        color: rgba(232, 197, 71, 0.9);
      }

      /* Thin progress line — bottom edge of pill */
      #mst-progress-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        width: 0%;
        background: linear-gradient(90deg, rgba(232,197,71,0.4), #E8C547);
        border-radius: 0 0 50px 50px;
        transition: width 80ms linear;
      }

      @media (max-width: 480px) {
        #margoScrollTop { bottom: 18px; right: 14px; }
        #mst-pill { padding: 8px 13px 9px; }
      }

      /* ══════════════════════════════════════
         TOAST CONTAINER
      ══════════════════════════════════════ */
      #margoToastContainer {
        position: fixed;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        top: 20px;
        right: 20px;
        align-items: flex-end;
        max-width: 340px;
        width: calc(100vw - 40px);
      }
      @media (max-width: 600px) {
        #margoToastContainer {
          top: auto;
          bottom: 80px;
          right: 0; left: 0;
          align-items: center;
          max-width: 100%;
          width: 100%;
          padding: 0 16px;
        }
      }

      /* ── Toast ── */
      .margo-toast {
        pointer-events: all;
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 11px;
        padding: 13px 14px 16px;
        border-radius: 16px;
        min-width: 220px;
        max-width: 340px;
        width: 100%;
        overflow: hidden;
        cursor: pointer;
        background: rgba(18, 18, 22, 0.92);
        backdrop-filter: blur(24px) saturate(1.5);
        -webkit-backdrop-filter: blur(24px) saturate(1.5);
        border: 1px solid rgba(232,197,71,0.2);
        box-shadow:
          0 4px 6px rgba(0,0,0,0.1),
          0 16px 48px rgba(0,0,0,0.55),
          inset 0 1px 0 rgba(232,197,71,0.1);
        opacity: 0;
        transform: translateX(24px) scale(0.95);
        transition:
          opacity 320ms var(--ease-out),
          transform 320ms var(--ease-spring),
          box-shadow 200ms var(--ease-smooth);
      }
      @media (max-width: 600px) {
        .margo-toast { transform: translateY(20px) scale(0.95); max-width: 100%; }
      }
      .margo-toast.entering { opacity: 1; transform: translateX(0) scale(1); }
      @media (max-width: 600px) {
        .margo-toast.entering { transform: translateY(0) scale(1); }
      }
      .margo-toast.exiting {
        opacity: 0 !important;
        transform: translateX(28px) scale(0.92) !important;
        transition: opacity 250ms var(--ease-smooth), transform 250ms var(--ease-smooth) !important;
        pointer-events: none;
      }
      @media (max-width: 600px) {
        .margo-toast.exiting { transform: translateY(20px) scale(0.92) !important; }
      }
      .margo-toast:hover {
        box-shadow:
          0 4px 6px rgba(0,0,0,0.1), 0 20px 60px rgba(0,0,0,0.65),
          0 0 0 1px rgba(232,197,71,0.3), inset 0 1px 0 rgba(232,197,71,0.15);
      }
      .margo-toast::before {
        content: ''; position: absolute;
        left: 0; top: 12px; bottom: 12px; width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--toast-accent, #E8C547); opacity: 0.9;
      }
      .margo-toast::after {
        content: ''; position: absolute;
        top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, var(--toast-accent, rgba(232,197,71,0.6)), transparent);
        opacity: 0.6;
      }
      .margo-toast-icon  {
        font-size: 0.85rem; flex-shrink: 0; margin-top: 1px;
        line-height: 1; width: 18px; text-align: center;
        color: var(--toast-accent, #E8C547);
        font-family: 'Space Mono', monospace; font-weight: 700;
      }
      .margo-toast-body  { flex: 1; min-width: 0; }
      .margo-toast-title {
        font-family: 'Space Mono', monospace; font-size: 0.56rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 1.2px;
        color: var(--toast-accent, #E8C547); margin-bottom: 3px; line-height: 1.2;
      }
      .margo-toast-msg {
        font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500;
        color: rgba(240,240,240,0.85); line-height: 1.4; word-break: break-word;
      }
      .margo-toast-close {
        flex-shrink: 0; background: none; border: none;
        color: rgba(255,255,255,0.2); font-size: 0.85rem; cursor: pointer;
        padding: 2px; line-height: 1; margin-top: 1px; transition: color 150ms;
        font-family: 'DM Sans', sans-serif;
      }
      .margo-toast-close:hover { color: rgba(255,255,255,0.6); }
      .margo-toast-progress {
        position: absolute; bottom: 0; left: 0; height: 2px;
        background: var(--toast-accent, #E8C547); opacity: 0.45;
        border-radius: 0 0 16px 16px; width: 100%;
        transform-origin: left center; transition: transform linear;
      }

      /* Kill legacy toasts */
      .toast { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════
     BACK TO TOP — reuses existing #margoScrollTop from HTML
  ══════════════════════════════════════════════════════════ */
  function initScrollTop() {
    const oldBtn = document.getElementById('scrollToTopBtn');
    if (oldBtn) oldBtn.style.display = 'none';

    let btn = document.getElementById('margoScrollTop');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'margoScrollTop';
      btn.setAttribute('aria-label', 'Back to top');
      document.body.appendChild(btn);
    }

    btn.innerHTML = `
      <div id="mst-pill">
        <span id="mst-arrow">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="3"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </span>
        <span id="mst-label">Top</span>
        <div id="mst-progress-bar"></div>
      </div>
    `;

    btn.removeAttribute('style');

    const progressBar = document.getElementById('mst-progress-bar');
    let ticking = false;

    function isOnLanding() {
      return document.body.classList.contains('on-landing');
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (isOnLanding()) {
          btn.classList.remove('visible');
          ticking = false;
          return;
        }

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollMax = document.documentElement.scrollHeight - window.innerHeight;

        btn.classList.toggle('visible', scrollTop > 300);

        if (progressBar) {
          const pct = scrollMax > 0 ? Math.min((scrollTop / scrollMax) * 100, 100) : 0;
          progressBar.style.width = pct + '%';
        }

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    new MutationObserver(onScroll).observe(document.body, {
      attributes: true, attributeFilter: ['class']
    });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    onScroll();
  }

  /* ══════════════════════════════════════════════════════════
     TOAST SYSTEM
  ══════════════════════════════════════════════════════════ */
  const TOAST_DURATION = 2600;
  const MAX_TOASTS     = 1;

  /* Clean typographic marks — no emoji, no AI aesthetics */
  const TOAST_TYPES = {
    success: { icon: '—', accent: '#4ade80', title: 'Done'    },
    error:   { icon: '—', accent: '#ff6464', title: 'Heads up' },
    info:    { icon: '—', accent: '#6B8CFF', title: 'Note'    },
    default: { icon: '—', accent: '#E8C547', title: 'Margo'   },
  };

  let toastContainer = null;
  function getToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'margoToastContainer';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function detectToastType(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('error')||m.includes('fail')||m.includes('wrong')||m.includes('invalid')||m.includes('heads up')) return 'error';
    if (m.includes('posted')||m.includes('done')||m.includes('saved')||m.includes('correct')||m.includes('thanks')||m.includes('dropped')||m.includes('got it')) return 'success';
    if (m.includes('tip')||m.includes('searching')||m.includes('try')||m.includes('type')||m.includes('add')) return 'info';
    return 'default';
  }

  function dismissToast(el) {
    if (el._dismissed) return;
    el._dismissed = true;
    el.classList.add('exiting');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
  }

  function showMargoToast(message, type) {
    const container = getToastContainer();
    const cfg = TOAST_TYPES[type || detectToastType(message)] || TOAST_TYPES.default;

    while (container.children.length >= MAX_TOASTS) {
      dismissToast(container.firstElementChild);
    }

    const toast = document.createElement('div');
    toast.className  = 'margo-toast';
    toast._dismissed = false;
    toast.style.setProperty('--toast-accent', cfg.accent);
    toast.innerHTML = `
      <span class="margo-toast-icon">${cfg.icon}</span>
      <div class="margo-toast-body">
        <div class="margo-toast-title">${cfg.title}</div>
        <div class="margo-toast-msg">${message}</div>
      </div>
      <button class="margo-toast-close" aria-label="Dismiss">×</button>
      <div class="margo-toast-progress"></div>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('entering')));

    const bar = toast.querySelector('.margo-toast-progress');
    bar.style.transitionDuration = TOAST_DURATION + 'ms';
    requestAnimationFrame(() => requestAnimationFrame(() => bar.style.transform = 'scaleX(0)'));

    const timer = setTimeout(() => dismissToast(toast), TOAST_DURATION);
    toast.querySelector('.margo-toast-close').addEventListener('click', e => {
      e.stopPropagation(); clearTimeout(timer); dismissToast(toast);
    });
    toast.addEventListener('click', () => { clearTimeout(timer); dismissToast(toast); });
    return toast;
  }

  /* ── Intercept showToast ── */
  function interceptShowToast() {
    const wrap = () => {
      window.showToast = (message, type) => {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        showMargoToast(message, type);
      };
      window.showMargoToast = showMargoToast;
    };
    if (typeof window.showToast === 'function') { wrap(); return; }
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      if (typeof window.showToast === 'function' || tries > 60) { clearInterval(id); wrap(); }
    }, 100);
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  function init() {
    injectMotionStyles();
    initScrollTop();
    interceptShowToast();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
