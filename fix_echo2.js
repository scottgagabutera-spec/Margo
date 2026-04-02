const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');
// Remove the two stray lines: "  });" and "}" after the closing } of mountEchoSheet
// They are at 0-indexed 459 and 460
lines.splice(459, 2);
fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
