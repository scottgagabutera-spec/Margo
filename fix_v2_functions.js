const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Find the three functions
const expandIdx = lines.findIndex(l => l.includes('function expandEchoCompose()'));
const collapseIdx = lines.findIndex(l => l.includes('function collapseEchoCompose()'));
const clearIdx = lines.findIndex(l => l.includes('function clearEchoForm()'));

console.log('expandEchoCompose at:', expandIdx + 1);
console.log('collapseEchoCompose at:', collapseIdx + 1);
console.log('clearEchoForm at:', clearIdx + 1);

// Replace expandEchoCompose (6 lines: 601-606 = idx 600-605)
const newExpand = [
  'function expandEchoCompose() {',
  '  const collapsed = document.getElementById(\'echoCollapsed\');',
  '  if (collapsed) collapsed.style.display = \'none\';',
  '  const form = document.getElementById(\'echoComposeForm\');',
  '  if (form) { form.classList.add(\'open\'); form.style.display = \'flex\'; }',
  '  setTimeout(() => { const si = document.getElementById(\'echoSmartInput\'); if (si) si.focus(); }, 80);',
  '}',
];
lines.splice(expandIdx, 7, ...newExpand);

// Recalculate after splice
const collapseIdx2 = lines.findIndex(l => l.includes('function collapseEchoCompose()'));
const clearIdx2 = lines.findIndex(l => l.includes('function clearEchoForm()'));

console.log('collapseEchoCompose now at:', collapseIdx2 + 1);
console.log('clearEchoForm now at:', clearIdx2 + 1);

// Replace clearEchoForm — add reset for new elements, remove old echoGeniusResults/echoLiveHint
const newClear = [
  'function clearEchoForm() {',
  '  [\'echoLyricInput\',\'echoSongInput\',\'echoArtistInput\'].forEach(id => {',
  '    const el = document.getElementById(id);',
  '    if (el) el.value = \'\';',
  '  });',
  '  const cc = document.getElementById(\'echoCharCount\');',
  '  if (cc) cc.textContent = \'0\';',
  '  const submitBtn = document.getElementById(\'echoSubmitBtn\');',
  '  if (submitBtn) submitBtn.disabled = true;',
  '  document.querySelectorAll(\'.echo-vibe-opt\').forEach(b => b.classList.remove(\'active\'));',
  '  const pill = document.getElementById(\'echoSongPill\');',
  '  if (pill) pill.classList.add(\'hidden\');',
  '  const lyricWrap = document.getElementById(\'echoLyricWrap\');',
  '  if (lyricWrap) lyricWrap.style.display = \'none\';',
  '  const sw = document.getElementById(\'echoSmartSearchWrap\');',
  '  if (sw) sw.style.display = \'\';',
  '  const si = document.getElementById(\'echoSmartInput\');',
  '  if (si) si.value = \'\';',
  '  const cs = document.getElementById(\'echoClearSearch\');',
  '  if (cs) cs.style.display = \'none\';',
  '}',
];

// clearEchoForm is 14 lines (616-629 = idx 615-628)
lines.splice(clearIdx2, 14, ...newClear);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
