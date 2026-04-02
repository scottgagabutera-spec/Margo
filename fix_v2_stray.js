const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');
console.log('Line 360:', lines[359]);
lines.splice(359, 1);
fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
