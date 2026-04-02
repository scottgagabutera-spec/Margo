const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

console.log('Line 48:', lines[47]);
lines[47] = lines[47].replace('overflow:hidden;', 'overflow:visible;');
console.log('Fixed:', lines[47]);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
