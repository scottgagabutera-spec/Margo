const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Lines 596-597 (0-indexed 595-596) are duplicate stray lines — delete them
console.log('Line 595:', lines[595]);
console.log('Line 596:', lines[596]);
lines.splice(595, 2);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
