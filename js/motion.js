/* ============================================================
   MARGO — js/motion.js
   Premium Interaction Layer v1.1
   Fix: FAB hidden on landing page. Scroll detection uses
        window only (feed does not have its own scrollbar).
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

      /* ── Kill old back-to-top ── */
      #scrollToTopBtn,
      .scroll-top {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* ── FAB ── */
      #margoScrollTop {
        position: fixed;
        bottom: 28px;
        right: 22px;
        width: 48px;
        height: 48px;
        z-index: 9998;
        cursor: pointer;
        border: none;
        background: none;
        padding: 0;
        pointer-events: none;
        opacity: 0;
        transform: translateY(16px) scale(0.85);
        transition:
          opacity 320ms var(--ease-out),
          transform 320ms var(--ease-spring);
      }
      #margoScrollTop.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }
      #margoScrollTop:active {
        transform: scale(0.88) !important;
        transition: transform 120ms var(--ease-smooth) !important;
      }
      #margoScrollTop svg.fab-ring {
        position: absolute;
        inset: 0;
        width: 100%; height: 100%;
        transform: rotate(-90deg);
        pointer-events: none;
      }
      #mst-track {
        fill: none;
        stroke: rgba(232,197,71,0.12);
        stroke-width: 2.5;
      }
      #mst-progress {
        fill: none;
        stroke: #E8C547;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-dasharray: 132;
        stroke-dashoffset: 132;
        transition: stroke-dashoffset 80ms linear;
        filter: drop-shadow(0 0 4px rgba(232,197,71,0.7));
      }
      #mst-disc {
        position: absolute;
        inset: 5px;
        border-radius: 50%;
        background: rgba(20, 20, 24, 0.88);
        backdrop-filter: blur(16px) saturate(1.4);
        -webkit-backdrop-filter: blur(16px) saturate(1.4);
        border: 1px solid rgba(232,197,71,0.22);
        display: flex; align-items: center; justify-content: center;
        box-shadow:
          0 8px 32px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(232,197,71,0.12);
        transition:
          border-color 180ms var(--ease-smooth),
          box-shadow 180ms var(--ease-smooth),
          background 180ms var(--ease-smooth);
      }
      #margoScrollTop:hover #mst-disc {
        border-color: rgba(232,197,71,0.55);
        background: rgba(28, 28, 34, 0.95);
        box-shadow:
          0 12px 40px rgba(0,0,0,0.55),
          0 0 20px rgba(232,197,71,0.12),
          inset 0 1px 0 rgba(232,197,71,0.2);
      }
      #mst-arrow {
        color: #E8C547;
        transition: transform 200ms var(--ease-spring);
        display: flex; align-items: center; justify-content: center;
      }
      #margoScrollTop:hover #mst-arrow {
        transform: translateY(-2px);
      }

      @media (max-width: 480px) {
        #margoScrollTop {
          bottom: 20px;
          right: 16px;
          width: 44px;
          height: 44px;
        }
        #mst-track, #mst-progress { stroke-width: 2; }
      }

      /* ── Toast container ── */
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
          bottom: 24px;
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
        .margo-toast {
          transform: translateY(20px) scale(0.95);
          max-width: 100%;
        }
      }
      .margo-toast.entering {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      @media (max-width: 600px) {
        .margo-toast.entering { transform: translateY(0) scale(1); }
      }
      .margo-toast.exiting {
        opacity: 0 !important;
        transform: translateX(28px) scale(0.92) !important;
        transition:
          opacity 250ms var(--ease-smooth),
          transform 250ms var(--ease-smooth) !important;
        pointer-events: none;
      }
      @media (max-width: 600px) {
        .margo-toast.exiting {
          transform: translateY(20px) scale(0.92) !important;
        }
      }
      .margo-toast:hover {
        box-shadow:
          0 4px 6px rgba(0,0,0,0.1),
          0 20px 60px rgba(0,0,0,0.65),
          0 0 0 1px rgba(232,197,71,0.3),
          inset 0 1px 0 rgba(232,197,71,0.15);
      }
      .margo-toast::before {
        content: '';
        position: absolute;
        left: 0; top: 12px; bottom: 12px;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--toast-accent, #E8C547);
        opacity: 0.9;
      }
      .margo-toast::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--toast-accent, rgba(232,197,71,0.6)) 50%,
          transparent 100%
        );
        opacity: 0.6;
      }
      .margo-toast-icon {
        font-size: 1rem; flex-shrink: 0;
        margin-top: 1px; line-height: 1;
        width: 18px; text-align: center;
      }
      .margo-toast-body { flex: 1; min-width: 0; }
      .margo-toast-title {
        font-family: 'Space Mono', monospace;
        font-size: 0.58rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 1.2px;
        color: var(--toast-accent, #E8C547);
        margin-bottom: 3px; line-height: 1.2;
      }
      .margo-toast-msg {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.8rem; font-weight: 500;
        color: rgba(240,240,240,0.85);
        line-height: 1.4; word-break: break-word;
      }
      .margo-toast-close {
        flex-shrink: 0;
        background: none; border: none;
        color: rgba(255,255,255,0.2);
        font-size: 0.85rem; cursor: pointer;
        padding: 2px; line-height: 1; margin-top: 1px;
        transition: color 150ms;
        font-family: 'DM Sans', sans-serif;
      }
      .margo-toast-close:hover { color: rgba(255,255,255,0.6); }
      .margo-toast-progress {
        position: absolute;
        bottom: 0; left: 0;
        height: 2px;
        background: var(--toast-accent, #E8C547);
        opacity: 0.45;
        border-radius: 0 0 16px 16px;
        width: 100%;
        transform-origin: left center;
        transition: transform linear;
      }

      /* Kill any legacy .toast elements */
      .toast { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════
     BACK TO TOP FAB
  ══════════════════════════════════════════════════════════ */
  function initScrollTop() {
    const oldBtn = document.getElementById('scrollToTopBtn');
    if (oldBtn) oldBtn.style.display = 'none';

    const btn = document.createElement('button');
    btn.id = 'margoScrollTop';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = `
      <svg class="fab-ring" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <circle id="mst-track"    cx="24" cy="24" r="21"/>
        <circle id="mst-progress" cx="24" cy="24" r="21"/>
      </svg>
      <div id="mst-disc">
        <span id="mst-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </span>
      </div>
    `;
    document.body.appendChild(btn);

    const progressEl    = document.getElementById('mst-progress');
    const CIRCUMFERENCE = 2 * Math.PI * 21;
    progressEl.style.strokeDasharray  = CIRCUMFERENCE;
    progressEl.style.strokeDashoffset = CIRCUMFERENCE;

    let ticking = false;

    function isLandingActive() {
      const landingEl = document.getElementById('landing');
      return landingEl && landingEl.classList.contains('active');
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Never show FAB on landing page
        if (isLandingActive()) {
          btn.classList.remove('visible');
          ticking = false;
          return;
        }

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollMax = document.documentElement.scrollHeight - window.innerHeight;

        if (scrollTop > 300) {
          btn.classList.add('visible');
        } else {
          btn.classList.remove('visible');
        }

        const pct = scrollMax > 0 ? Math.min(scrollTop / scrollMax, 1) : 0;
        progressEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
        ticking = false;
      });
    }

    // Only listen on window — the feed page scrolls the whole window, not #feed element
    window.addEventListener('scroll', onScroll, { passive: true });

    // Re-check whenever landing/feed switch (class changes on #landing or #feed)
    const landingEl = document.getElementById('landing');
    const feedEl    = document.getElementById('feed');
    const observer  = new MutationObserver(() => onScroll());
    if (landingEl) observer.observe(landingEl, { attributes: true, attributeFilter: ['class'] });
    if (feedEl)    observer.observe(feedEl,    { attributes: true, attributeFilter: ['class'] });

    // Click — scroll to top
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      btn.style.transition = 'transform 120ms cubic-bezier(0.4,0,0.2,1)';
      btn.style.transform  = 'scale(0.85)';
      setTimeout(() => { btn.style.transition = ''; btn.style.transform = ''; }, 120);
    });

    onScroll();
  }

  /* ══════════════════════════════════════════════════════════
     TOAST SYSTEM
  ══════════════════════════════════════════════════════════ */
  const TOAST_DURATION = 4000;
  const MAX_TOASTS     = 4;

  const TOAST_TYPES = {
    success: { icon: '✦', accent: '#4ade80', title: 'Done'    },
    error:   { icon: '✕', accent: '#ff6464', title: 'Error'   },
    info:    { icon: '♪', accent: '#6B8CFF', title: 'Hey'     },
    default: { icon: '✦', accent: '#E8C547', title: 'Margo'   },
  };

  let toastContainer = null;

  function getToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'margoToastContainer';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function detectToastType(message) {
    const m = (message || '').toLowerCase();
    if (m.includes('error') || m.includes('fail') || m.includes('wrong') || m.includes('invalid')) return 'error';
    if (m.includes('posted') || m.includes('done') || m.includes('saved') || m.includes('correct') || m.includes('thanks')) return 'success';
    if (m.includes('tip') || m.includes('searching') || m.includes('try') || m.includes('type')) return 'info';
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
    const cfg       = TOAST_TYPES[type || detectToastType(message)] || TOAST_TYPES.default;

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
      <button class="margo-toast-close" aria-label="Dismiss">✕</button>
      <div class="margo-toast-progress"></div>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('entering')));

    const bar = toast.querySelector('.margo-toast-progress');
    bar.style.transitionDuration = TOAST_DURATION + 'ms';
    requestAnimationFrame(() => requestAnimationFrame(() => bar.style.transform = 'scaleX(0)'));

    const timer = setTimeout(() => dismissToast(toast), TOAST_DURATION);

    toast.querySelector('.margo-toast-close').addEventListener('click', e => {
      e.stopPropagation();
      clearTimeout(timer);
      dismissToast(toast);
    });
    toast.addEventListener('click', () => { clearTimeout(timer); dismissToast(toast); });

    return toast;
  }

  /* ══════════════════════════════════════════════════════════
     INTERCEPT showToast
  ══════════════════════════════════════════════════════════ */
  function interceptShowToast() {
    const wrap = () => {
      window.showToast = function(message, type) {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        showMargoToast(message, type);
      };
      window.showMargoToast = showMargoToast;
    };

    if (typeof window.showToast === 'function') {
      wrap();
    } else {
      let tries = 0;
      const id = setInterval(() => {
        tries++;
        if (typeof window.showToast === 'function' || tries > 60) {
          clearInterval(id);
          wrap();
        }
      }, 100);
    }
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
