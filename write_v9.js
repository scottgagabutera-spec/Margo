const fs = require('fs');

/* ── 1. Fix core.js — replace textInput/charCount with getters ── */
let core = fs.readFileSync('js/ui/composer/core.js', 'utf8');

// Fix lazy bind that we added before — now use getters properly
core = core.replace(
  `// Wire textInput lazily — it lives inside lyricEditWrap which is injected later
  setTimeout(function(){
  var ta  = document.getElementById("textInput");
  var cc  = document.getElementById("charCount");
  if(ta && cc) ta.oninput = function(){ cc.textContent = ta.value.length; };
  }, 400);`,
  `// textInput/charCount are dynamically injected — wired in integrations.js wireLyricChip()`
);

// Fix submitPost — replace all textInput references with getters
core = core.replace(
  `let text = textInput.value.trim();`,
  `let text = (getTextInput() ? getTextInput().value.trim() : '');`
);
core = core.replace(
  `textInput.value = text;\n    charCount.textContent = text.length;`,
  `if(getTextInput()) getTextInput().value = text;\n    if(getCharCount()) getCharCount().textContent = text.length;`
);

// Fix resetComposer — replace textInput/charCount/songInput/artistInput refs
core = core.replace(
  `if (typeof textInput   !== 'undefined' && textInput)   textInput.value   = '';`,
  `var _ti = getTextInput(); if(_ti) _ti.value = '';`
);
core = core.replace(
  `if (typeof songInput   !== 'undefined' && songInput)   songInput.value   = '';`,
  `var _si = getSongInput(); if(_si) _si.value = '';`
);
core = core.replace(
  `if (typeof artistInput !== 'undefined' && artistInput) artistInput.value = '';`,
  `var _ai = getArtistInput(); if(_ai) _ai.value = '';`
);
core = core.replace(
  `if (typeof charCount      !== 'undefined' && charCount)      charCount.textContent = '0';`,
  `var _cc = getCharCount(); if(_cc) _cc.textContent = '0';`
);

// Fix songVal/artistVal in submitPost
core = core.replace(
  `const songVal   = typeof songInput   !== 'undefined' ? (songInput?.value.trim()   || '') : '';`,
  `const songVal   = getSongInput()   ? (getSongInput().value.trim()   || '') : '';`
);
core = core.replace(
  `const artistVal = typeof artistInput !== 'undefined' ? (artistInput?.value.trim() || '') : '';`,
  `const artistVal = getArtistInput() ? (getArtistInput().value.trim() || '') : '';`
);

fs.writeFileSync('js/ui/composer/core.js', core);
console.log('core.js fixed');

/* ── 2. Also sync songConfirmInput → hidden fields on submit as fallback ── */
// Add fallback sync at the top of submitPost in case input events were missed
core = fs.readFileSync('js/ui/composer/core.js', 'utf8');
core = core.replace(
  `let text = (getTextInput() ? getTextInput().value.trim() : '');`,
  [
    `// Sync confirm inputs → hidden fields (fallback in case oninput was missed)`,
    `  var _sci = document.getElementById('songConfirmInput');`,
    `  var _aci = document.getElementById('artistConfirmInput');`,
    `  var _sih = getSongInput();`,
    `  var _aih = getArtistInput();`,
    `  if(_sci && _sih && _sci.value.trim()) _sih.value = _sci.value.trim();`,
    `  if(_aci && _aih && _aci.value.trim()) _aih.value = _aci.value.trim();`,
    `  let text = (getTextInput() ? getTextInput().value.trim() : '');`
  ].join('\n  ')
);
fs.writeFileSync('js/ui/composer/core.js', core);
console.log('core.js sync fallback added');

/* ── 3. Upgrade CSS — remarkable edit pen + change button ── */
let css = fs.readFileSync('assets/css/composer.css', 'utf8');

// Remove old edit pen styles
const cutEdit = css.indexOf('/* \u2550\u2550 SONG CONFIRM BLOCK v8 \u2550\u2550 */');
if(cutEdit > -1) css = css.slice(0, cutEdit).trimEnd();

css += `
/* \u2550\u2550 SONG CONFIRM + VISUAL v9 \u2550\u2550 */
.song-confirm-block{margin-top:10px;animation:pillIn 0.25s cubic-bezier(0.16,1,0.3,1);}
.song-confirm-block.hidden{display:none;}
.song-confirm-row{display:flex;gap:8px;}
.song-confirm-field{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}
.song-confirm-label{font-family:var(--font-mono,monospace);font-size:0.5rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(232,197,71,0.7);}
.song-confirm-input{background:rgba(232,197,71,0.04);border:1px solid rgba(232,197,71,0.22);border-radius:10px;padding:9px 12px;color:#fff;font-size:0.82rem;font-weight:600;outline:none;width:100%;transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;}
.song-confirm-input:focus{border-color:rgba(232,197,71,0.6);box-shadow:0 0 0 3px rgba(232,197,71,0.1);background:rgba(232,197,71,0.07);}
.song-confirm-input::placeholder{color:rgba(255,255,255,0.2);font-weight:400;}

/* Edit pen — gold shiny pulsing */
@keyframes editGlow{
  0%,100%{box-shadow:0 0 0 0 rgba(232,197,71,0),0 0 6px rgba(232,197,71,0.3);opacity:1;}
  50%{box-shadow:0 0 0 6px rgba(232,197,71,0.12),0 0 14px rgba(232,197,71,0.5);opacity:0.85;}
}
@keyframes editShine{
  0%{background-position:200% center;}
  100%{background-position:-200% center;}
}
.lyric-chip-edit{
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,#f5d878 0%,#E8C547 40%,#b8922a 100%);
  background-size:200% auto;
  border:none;
  color:#0B0B0D;font-size:0.9rem;font-weight:900;
  cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
  animation:editGlow 1.6s ease-in-out 5, editShine 2.5s linear 3;
  transition:transform 0.18s,box-shadow 0.18s;
  box-shadow:0 2px 12px rgba(232,197,71,0.4);
}
.lyric-chip-edit:hover{transform:scale(1.12);box-shadow:0 4px 20px rgba(232,197,71,0.6);animation:none;}
.lyric-chip-edit:active{transform:scale(0.95);}

/* Change button — gold outlined pill */
.song-pill-change{
  background:linear-gradient(135deg,rgba(232,197,71,0.12),rgba(232,197,71,0.06));
  border:1.5px solid rgba(232,197,71,0.55);
  border-radius:20px;
  color:#E8C547;
  font-family:var(--font-mono,monospace);font-size:0.52rem;font-weight:800;
  letter-spacing:1.5px;text-transform:uppercase;
  padding:6px 12px;cursor:pointer;
  transition:all 0.2s;flex-shrink:0;
  box-shadow:0 0 8px rgba(232,197,71,0.15);
}
.song-pill-change:hover{
  background:linear-gradient(135deg,rgba(232,197,71,0.25),rgba(232,197,71,0.15));
  border-color:#E8C547;
  box-shadow:0 0 16px rgba(232,197,71,0.35);
  transform:scale(1.04);
}
.song-pill-change:active{transform:scale(0.97);}
`;

fs.writeFileSync('assets/css/composer.css', css);
console.log('composer.css v9 updated');
console.log('\nAll done. Commit and push.');
