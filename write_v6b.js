const fs = require('fs');

// Fix integrations.js
let c = fs.readFileSync('js/ui/composer/integrations.js', 'utf8');

// 1. Fix chipText -> chip (undefined variable), fix label display, fix wrap display
c = c.replace(
  '  wrap.classList.remove("hidden");\n  wrap.style.display="";\n  chipText.contentEditable="true";\n  var lbl=document.getElementById("lyricChipLabel");if(lbl)lbl.style.display="";\n  showVibeSection();',
  '  wrap.classList.remove("hidden");\n  wrap.style.removeProperty("display");\n  chip.contentEditable="true";\n  var lbl=document.getElementById("lyricChipLabel");if(lbl){lbl.style.removeProperty("display");lbl.style.display="block";}\n  showVibeSection();'
);

// 2. Fix showVibeSection - use removeProperty then set explicit value
c = c.replace(
  'function showVibeSection(){\n  var vl=document.getElementById("vibeLabel");\n  var eg=document.getElementById("emotionGrid");\n  if(vl){vl.style.display="block";vl.style.removeProperty("display");vl.style.display="block";}\n  if(eg){eg.style.display="grid";}\n}',
  'function showVibeSection(){\n  var vl=document.getElementById("vibeLabel");\n  var eg=document.getElementById("emotionGrid");\n  if(vl){vl.style.removeProperty("display");vl.style.display="block";}\n  if(eg){eg.style.removeProperty("display");eg.style.display="flex";}\n}'
);

fs.writeFileSync('js/ui/composer/integrations.js', c);
console.log('integrations.js fixed');

// Fix index.html
let html = fs.readFileSync('index.html', 'utf8');

// Normalize lyricChipLabel style
html = html.replace(
  /(<span[^>]*id="lyricChipLabel"[^>]*)style="[^"]*"/,
  '$1style="display:none"'
);

// Normalize emotionGrid
html = html.replace(
  /<div class="emotion-grid" id="emotionGrid" style="[^"]*">/,
  '<div class="emotion-grid" id="emotionGrid" style="display:none">'
);

fs.writeFileSync('index.html', html);
console.log('index.html fixed');
console.log('All done.');
