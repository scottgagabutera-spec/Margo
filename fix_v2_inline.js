const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

const styleEndIdx = lines.findIndex(l => l.includes('document.head.appendChild(s)'));
console.log('Style block ends at line:', styleEndIdx);

const inlineCSS = [
'    #echoSheetBackdrop .search-sheet{',
'      position:static;',
'      opacity:1;',
'      transform:none;',
'      transition:none;',
'      border-radius:12px;',
'      margin-top:4px;',
'      max-height:220px;',
'      overflow-y:auto;',
'    }',
'    #echoSheetBackdrop .search-sheet.hidden{display:none}',
'    #echoSheetBackdrop .search-sheet.open{display:block}',
];

lines.splice(styleEndIdx - 1, 0, ...inlineCSS);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
