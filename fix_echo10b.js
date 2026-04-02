const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Insert before collapseEchoCompose() in closeEchoSheet — 0-indexed line 521
lines.splice(521, 0, '  _echoStopKeyboardWatch();');

// collapseEchoCompose form hide is now at line 602 (shifted +1 after above insert) = 0-indexed 602
lines.splice(602, 0, '  _echoStopKeyboardWatch();');

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
