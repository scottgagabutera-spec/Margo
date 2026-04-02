const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Find the exact line
const idx = lines.findIndex(l => l.includes('overflow:hidden;display:flex;flex-direction:column;'));
console.log('Found at line:', idx + 1);
console.log('Content:', lines[idx]);
lines[idx] = lines[idx].replace('overflow:hidden;', 'overflow:visible;');
console.log('Fixed:', lines[idx]);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
