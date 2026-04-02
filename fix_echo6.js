const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');
// Remove 4 lines: echoGeniusResults get, if gr, echoLiveHint get, if lh
// They are at 0-indexed 578-581
lines.splice(578, 4);
fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
