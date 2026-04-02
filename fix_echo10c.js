const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Find the line with form.classList.remove and swap the two lines after it
const idx = lines.findIndex(l => l.includes("form.classList.remove('open')"));
console.log('Found at line:', idx + 1);
console.log('Line content:', lines[idx]);
console.log('Line before:', lines[idx - 1]);

// Swap: _echoStopKeyboardWatch is at idx-1, form hide is at idx
// Move _echoStopKeyboardWatch to after the form hide line
const stop = lines[idx - 1];
lines[idx - 1] = lines[idx];
lines[idx] = stop;

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
