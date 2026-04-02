const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// 1. Add position:relative to echo-compose-form CSS
const formCssIdx = lines.findIndex(l => l.includes('.echo-compose-form{'));
console.log('echo-compose-form CSS at line:', formCssIdx + 1);
if (formCssIdx > 0) {
  lines[formCssIdx] = lines[formCssIdx].replace('.echo-compose-form{', '.echo-compose-form{position:relative;');
}

// 2. Remove echoSearchSheet from inside smart-search-wrap
// and place it right after the closing </div> of smart-search-wrap
const startSearch = lines.findIndex(l => l.includes('<div id="echoSearchSheet"'));
const endSearch = lines.findIndex(l => l.includes('</div>') && lines.indexOf(l) > startSearch && l.includes('</div>') && lines[startSearch + 4] && l === lines[startSearch + 4]);

// Find exact lines
let searchSheetStart = -1;
let searchSheetEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div id="echoSearchSheet"')) searchSheetStart = i;
  if (searchSheetStart > 0 && i > searchSheetStart && lines[i].trim() === '</div>' && searchSheetEnd === -1) {
    // count to find the closing div of echoSearchSheet (3 closing divs deep)
    searchSheetEnd = i;
    break;
  }
}
console.log('echoSearchSheet from line:', searchSheetStart + 1, 'to:', searchSheetEnd + 1);

// Extract the search sheet lines
const searchSheetLines = lines.splice(searchSheetStart, searchSheetEnd - searchSheetStart + 1);

// Now find the closing </div> of smart-search-wrap (which is now where searchSheet was)
const wrapCloseIdx = lines.findIndex((l, i) => i >= searchSheetStart && l.trim() === '</div>');
console.log('smart-search-wrap closes at line:', wrapCloseIdx + 1);

// Insert searchSheet after the wrap closing div
lines.splice(wrapCloseIdx + 1, 0, ...searchSheetLines);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
