const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Line 372 (0-indexed 371) is the closing </div> of echoSearchSheet — it's wrong indentation
// We need to:
// 1. Add </div> to close smart-search-wrap after line 366 (0-indexed 365)
// 2. Fix closing </div> of echoSearchSheet at line 372 (0-indexed 371)

// Line 366 is </div> closing smart-search-field — after this we need </div> for smart-search-wrap
// then echoSearchSheet starts

// Current structure (0-indexed):
// 365: </div>  ← closes smart-search-field
// 366: <div id="echoSearchSheet"...  ← should be AFTER smart-search-wrap closes
// 367: <div class="search-sheet-inner">
// 368: <div id="echoSearchStatus"...
// 369: <div id="echoSearchResults"...
// 370: </div>  ← closes search-sheet-inner
// 371: </div>  ← should close smart-search-wrap AND echoSearchSheet needs its own

// Fix: insert </div> after line 365 to close smart-search-wrap
// then fix line 371 to properly close echoSearchSheet
lines.splice(365, 0, '          </div>'); // close smart-search-wrap

// Now echoSearchSheet closing </div> is at 0-indexed 372, add another closing </div>
lines.splice(373, 0, '          </div>'); // close echoSearchSheet properly

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
