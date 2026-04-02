const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes("'#echoCancelBtn').onclick") || l.includes('"#echoCancelBtn").onclick'));
console.log('Found echoCancelBtn at line:', idx + 1);
lines.splice(idx + 1, 0, "  backdrop.querySelector('#echoSubmitBtn').onclick      = submitEcho;");

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
