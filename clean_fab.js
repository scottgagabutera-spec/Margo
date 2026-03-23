const fs = require('fs');
let css = fs.readFileSync('assets/css/feed.css', 'utf8');

// Remove all lines that mention dropLyricFAB or FAB (our added ones)
const lines = css.split('\n');
const cleaned = [];
let skipBlock = false;

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  
  // Skip single-line FAB rules
  if (l.includes('dropLyricFAB') || l.includes('/* FAB */') || l.includes('/* FAB always') || l.includes('/* FAB floating') || l.includes('/* FAB on card')) {
    skipBlock = false;
    continue;
  }
  
  cleaned.push(l);
}

fs.writeFileSync('assets/css/feed.css', cleaned.join('\n'));
console.log('All FAB rules removed from feed.css');

// Verify
const result = fs.readFileSync('assets/css/feed.css', 'utf8');
const remaining = result.split('\n').filter(l => l.includes('dropLyricFAB'));
console.log('Remaining FAB lines in feed.css:', remaining.length);
remaining.forEach(l => console.log(' -', l.trim()));
