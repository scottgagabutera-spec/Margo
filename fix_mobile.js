const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// 1. Add CSS before the closing backtick of the style block
const cssIdx = lines.findIndex(l => l.includes('document.head.appendChild(s)'));
console.log('CSS closing at line:', cssIdx);
const newCSS = [
  "    @media(max-width:600px){",
  "      #echoSheet.echo-fullscreen{",
  "        position:fixed;inset:0;max-height:100dvh;border-radius:0;",
  "        overflow-y:auto;z-index:660;",
  "      }",
  "      #echoSheet.echo-fullscreen .echo-list-wrap{flex:1;overflow-y:auto}",
  "    }",
];
lines.splice(cssIdx - 1, 0, ...newCSS);

// 2. Update expandEchoCompose — add echo-fullscreen on mobile
const expandIdx = lines.findIndex(l => l.includes('function expandEchoCompose()'));
console.log('expandEchoCompose at line:', expandIdx + 1);
lines.splice(expandIdx + 1, 0,
  "  if (window.innerWidth <= 600) {",
  "    const sheet = document.getElementById('echoSheet');",
  "    if (sheet) sheet.classList.add('echo-fullscreen');",
  "  }"
);

// 3. Update collapseEchoCompose — remove echo-fullscreen
const collapseIdx = lines.findIndex(l => l.includes('function collapseEchoCompose()'));
console.log('collapseEchoCompose at line:', collapseIdx + 1);
lines.splice(collapseIdx + 1, 0,
  "  const sheet = document.getElementById('echoSheet');",
  "  if (sheet) sheet.classList.remove('echo-fullscreen');"
);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
