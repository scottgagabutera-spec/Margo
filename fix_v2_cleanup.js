const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('let _echoLastQuery'));
const endIdx = lines.findIndex(l => l.includes('async function fillEchoSongMeta'));
console.log('Removing lines', startIdx + 1, 'to', endIdx);

// Remove from _echoLastQuery up to (not including) fillEchoSongMeta
lines.splice(startIdx, endIdx - startIdx);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
