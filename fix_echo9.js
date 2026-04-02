const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('function expandEchoCompose()'));
console.log('Found expandEchoCompose at line:', idx + 1);

const newFunctions = [
  "/* ── Visual viewport keyboard handler ── */",
  "let _echoVVListener = null;",
  "function _echoStartKeyboardWatch() {",
  "  if (!window.visualViewport) return;",
  "  _echoStopKeyboardWatch();",
  "  _echoVVListener = () => {",
  "    const sheet = document.getElementById('echoSheet');",
  "    if (!sheet) return;",
  "    const vv = window.visualViewport;",
  "    const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;",
  "    sheet.style.transform = 'translateY(-' + Math.max(0, offsetBottom) + 'px)';",
  "    sheet.style.transition = 'transform 0.1s ease';",
  "  };",
  "  window.visualViewport.addEventListener('resize', _echoVVListener);",
  "  window.visualViewport.addEventListener('scroll', _echoVVListener);",
  "}",
  "function _echoStopKeyboardWatch() {",
  "  if (!window.visualViewport || !_echoVVListener) return;",
  "  window.visualViewport.removeEventListener('resize', _echoVVListener);",
  "  window.visualViewport.removeEventListener('scroll', _echoVVListener);",
  "  _echoVVListener = null;",
  "  const sheet = document.getElementById('echoSheet');",
  "  if (sheet) { sheet.style.transform = ''; sheet.style.transition = ''; }",
  "}",
  "",
  "function expandEchoCompose() {",
  "  const collapsed = document.getElementById('echoCollapsed');",
  "  if (collapsed) collapsed.style.display = 'none';",
  "  const form = document.getElementById('echoComposeForm');",
  "  if (form) { form.classList.add('open'); form.style.display = 'flex'; }",
  "  _echoStartKeyboardWatch();",
  "  setTimeout(() => { const si = document.getElementById('echoSmartInput'); if (si) si.focus(); }, 80);",
  "}",
];

// Replace the old expandEchoCompose (lines idx to idx+4)
lines.splice(idx, 5, ...newFunctions);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
