const fs = require('fs');
let code = fs.readFileSync('js/features/motion.js', 'utf8');

// 1. Fix MAX_TOASTS to 1 — never show two at once
code = code.replace(
  'const MAX_TOASTS     = 4;',
  'const MAX_TOASTS     = 1;'
);

// 2. Fix TOAST_DURATION to 2600ms — faster
code = code.replace(
  'const TOAST_DURATION = 4000;',
  'const TOAST_DURATION = 2600;'
);

// 3. Replace TOAST_TYPES with unique Margo icons and voice
code = code.replace(
  `  /* Clean typographic marks — no emoji, no AI aesthetics */
  const TOAST_TYPES = {
    success: { icon: '—', accent: '#4ade80', title: 'Done'    },
    error:   { icon: '—', accent: '#ff6464', title: 'Heads up' },
    info:    { icon: '—', accent: '#6B8CFF', title: 'Note'    },
    default: { icon: '—', accent: '#E8C547', title: 'Margo'   },
  };`,
  `  /* Margo-unique typographic icons — music-themed, no emoji */
  const TOAST_TYPES = {
    success: { icon: '\u266a', accent: '#E8C547', title: 'Yes'     },
    error:   { icon: '\u2715', accent: '#ff6464', title: 'Wait'    },
    info:    { icon: '\u2013', accent: 'rgba(232,197,71,0.7)', title: 'Hey'     },
    warning: { icon: '\u25cf', accent: '#F5A623', title: 'Note'    },
    default: { icon: '\u266a', accent: '#E8C547', title: 'Margo'   },
  };`
);

// 4. Fix detectToastType — add warning type for validation messages
code = code.replace(
  `  function detectToastType(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('error')||m.includes('fail')||m.includes('wrong')||m.includes('invalid')||m.includes('heads up')) return 'error';
    if (m.includes('posted')||m.includes('done')||m.includes('saved')||m.includes('correct')||m.includes('thanks')||m.includes('dropped')||m.includes('got it')) return 'success';
    if (m.includes('tip')||m.includes('searching')||m.includes('try')||m.includes('type')||m.includes('add')) return 'info';
    return 'default';
  }`,
  `  function detectToastType(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('error')||m.includes('fail')||m.includes('wrong')||m.includes('invalid')) return 'error';
    if (m.includes('live')||m.includes('posted')||m.includes('saved')||m.includes('correct')||m.includes('thanks')||m.includes('dropped')||m.includes('done')||m.includes('\u2713')) return 'success';
    if (m.includes('add')||m.includes('pick')||m.includes('enter')||m.includes('write')||m.includes('try')||m.includes('type')) return 'warning';
    if (m.includes('note')||m.includes('tip')||m.includes('adjusted')||m.includes('searching')) return 'info';
    return 'default';
  }`
);

// 5. Fix mobile position — move to top on mobile, not bottom (avoids feed action bar)
code = code.replace(
  `      @media (max-width: 600px) {
        #margoToastContainer {
          top: auto;
          bottom: 80px;
          right: 0; left: 0;
          align-items: center;
          max-width: 100%;
          width: 100%;
          padding: 0 16px;
        }
      }`,
  `      @media (max-width: 600px) {
        #margoToastContainer {
          top: 16px;
          bottom: auto;
          right: 0; left: 0;
          align-items: center;
          max-width: 100%;
          width: 100%;
          padding: 0 16px;
        }
      }`
);

// 6. Fix mobile toast exit animation — slide up not down
code = code.replace(
  `      @media (max-width: 600px) {
        .margo-toast.exiting { transform: translateY(20px) scale(0.92) !important; }
      }`,
  `      @media (max-width: 600px) {
        .margo-toast.exiting { transform: translateY(-16px) scale(0.92) !important; }
      }`
);

// 7. Make toast font sizes more readable
code = code.replace(
  `      .margo-toast-title {
        font-family: 'Space Mono', monospace; font-size: 0.56rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 1.2px;
        color: var(--toast-accent, #E8C547); margin-bottom: 3px; line-height: 1.2;
      }
      .margo-toast-msg {
        font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500;
        color: rgba(240,240,240,0.85); line-height: 1.4; word-break: break-word;
      }`,
  `      .margo-toast-title {
        font-family: 'Space Mono', monospace; font-size: 0.58rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 1.5px;
        color: var(--toast-accent, #E8C547); margin-bottom: 4px; line-height: 1.2;
      }
      .margo-toast-msg {
        font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
        color: rgba(244,241,237,0.9); line-height: 1.4; word-break: break-word;
      }`
);

// 8. Make toast icon bigger and more visible
code = code.replace(
  `      .margo-toast-icon  {
        font-size: 0.85rem; flex-shrink: 0; margin-top: 1px;
        line-height: 1; width: 18px; text-align: center;
        color: var(--toast-accent, #E8C547);
        font-family: 'Space Mono', monospace; font-weight: 700;
      }`,
  `      .margo-toast-icon  {
        font-size: 1rem; flex-shrink: 0; margin-top: 2px;
        line-height: 1; width: 20px; text-align: center;
        color: var(--toast-accent, #E8C547);
        font-family: 'Space Mono', monospace; font-weight: 700;
        filter: drop-shadow(0 0 4px var(--toast-accent, rgba(232,197,71,0.6)));
      }`
);

fs.writeFileSync('js/features/motion.js', code);
console.log('motion.js toast system upgraded');
console.log('Changes: MAX_TOASTS=1, duration=2600ms, Margo icons, mobile top position, better readability');
