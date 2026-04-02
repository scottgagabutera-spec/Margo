const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

const mobileCSS = [
  "    @media(max-width:600px){",
  "      .echo-smart-input{font-size:16px!important}",
  "      .echo-lyric-input{font-size:16px!important}",
  "      .echo-compose-trigger{font-size:16px!important}",
  "      #echoSheet{max-height:100dvh}",
  "    }",
];

// Insert before the closing backtick of the style block
// Find the line with just "  `;" after the CSS
const idx = lines.findIndex(l => l.trim() === '`\;' || (l.includes('`') && l.includes(';') && !l.includes('cssText') && !l.includes('//')));
console.log('Inserting at line:', idx + 1);
lines.splice(idx, 0, ...mobileCSS);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
