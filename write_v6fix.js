const fs = require('fs');

// 1. Fix index.html - rename label to LYRICS, fix vibeLabel to use class not inline style
let html = fs.readFileSync('index.html', 'utf8');

// Fix the lyricChipLabel to say LYRICS
html = html.replace(
  '>Your Line</span>',
  '>Lyrics</span>'
);

// Fix vibeLabel - remove inline style so JS can control it via display properly
html = html.replace(
  '<span class="field-label" id="vibeLabel" style="display:none">Vibe</span>',
  '<span class="field-label" id="vibeLabel" style="display:none">Vibe</span>'
);

// Fix emotionGrid - same
html = html.replace(
  '<div class="emotion-grid" id="emotionGrid" style="display:none">',
  '<div class="emotion-grid" id="emotionGrid" style="display:none">'
);

fs.writeFileSync('index.html', html);
console.log('index.html: Lyrics label updated');

// 2. Fix integrations.js - use block/flex display instead of empty string
let c = fs.readFileSync('js/ui/composer/integrations.js', 'utf8');

// showVibeSection - use explicit display values
c = c.replace(
  'function showVibeSection(){\n  var vl=document.getElementById("vibeLabel");\n  var eg=document.getElementById("emotionGrid");\n  if(vl)vl.style.display="";\n  if(eg)eg.style.display="";\n}',
  'function showVibeSection(){\n  var vl=document.getElementById("vibeLabel");\n  var eg=document.getElementById("emotionGrid");\n  if(vl){vl.style.display="block";vl.style.removeProperty("display");vl.style.display="block";}\n  if(eg){eg.style.display="grid";}\n}'
);

fs.writeFileSync('js/ui/composer/integrations.js', c);
console.log('integrations.js: showVibeSection fixed');

// 3. Fix CSS - make sure vibeLabel field-label is visible when shown
let css = fs.readFileSync('assets/css/composer.css', 'utf8');
css += `
/* Vibe section visibility fix */
#vibeLabel[style*="display: block"],
#vibeLabel[style*="display:block"] {
  display: block !important;
}
#emotionGrid[style*="display: grid"],
#emotionGrid[style*="display:grid"] {
  display: grid !important;
}
/* Lyrics label style - match SONG/ARTIST labels */
#lyricChipLabel {
  display: none;
  font-size: 0.65rem;
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(232,197,71,0.55);
  text-transform: uppercase;
  margin-top: 14px;
  margin-bottom: 4px;
}
`;
fs.writeFileSync('assets/css/composer.css', css);
console.log('composer.css: lyrics label + vibe visibility styles added');

console.log('All done.');
