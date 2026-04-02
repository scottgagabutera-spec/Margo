const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');
console.log('Line 637:', lines[636]);
lines.splice(636, 1);
fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
