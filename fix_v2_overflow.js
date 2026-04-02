const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// 1. Change overflow:hidden to overflow:visible on #echoSheet (line 49, 0-indexed 48)
const sheetIdx = lines.findIndex(l => l.includes('overflow:hidden;display:flex;flex-direction:column;'));
console.log('Found #echoSheet overflow at line:', sheetIdx + 1);
lines[sheetIdx] = lines[sheetIdx].replace('overflow:hidden;', 'overflow:visible;');
console.log('Fixed to:', lines[sheetIdx]);

// 2. Add overflow:visible to echo-compose so dropdown escapes it
const composeIdx = lines.findIndex(l => l.includes('.echo-compose{'));
console.log('Found .echo-compose at line:', composeIdx + 1);
lines[composeIdx] = lines[composeIdx].replace('.echo-compose{', '.echo-compose{overflow:visible;');
console.log('Fixed to:', lines[composeIdx]);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
