const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Find the mobile media query we added and replace it
const idx = lines.findIndex(l => l.includes('@media(max-width:600px)') && lines[lines.indexOf(l)+1].includes('echo-smart-input'));
console.log('Found mobile CSS at line:', idx + 1);

const newMobileCSS = [
  "    @media(max-width:600px){",
  "      .echo-smart-input{font-size:16px!important}",
  "      .echo-lyric-input{font-size:16px!important}",
  "      .echo-compose-trigger{font-size:16px!important}",
  "      #echoSheet{max-height:85dvh;overflow-y:auto}",
  "      #echoSheetBackdrop{align-items:flex-end;padding-bottom:env(safe-area-inset-bottom,0px)}",
  "      .echo-compose{position:sticky;bottom:0;background:#0f0e12;z-index:10}",
  "    }",
];

// Remove old 6 lines and insert new ones
lines.splice(idx, 6, ...newMobileCSS);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
