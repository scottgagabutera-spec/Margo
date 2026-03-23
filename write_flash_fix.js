const fs = require('fs');

let c = fs.readFileSync('js/core/app.js', 'utf8');

// 1. Fix enterBtn - textInput?.focus() → smartSearchInput focus
c = c.replace(
  'setTimeout(() => textInput?.focus(), 200);',
  'setTimeout(() => { var si = document.getElementById("smartSearchInput"); if(si) si.focus(); }, 200);'
);

// 2. Fix openModal - remove body.style.top which causes the flash
// Replace just the one line that sets body.style.top
c = c.replace(
  'document.body.style.top = `-${savedScrollPosition}px`;',
  '/* body top offset removed — caused flash on modal open */'
);

// 3. Fix closeModal - remove the scroll restore that went with body.style.top
c = c.replace(
  'window.scrollTo(0, savedScrollPosition);',
  '/* scroll restore removed */'
);

// 4. Fix toast duration to 1600ms
let m = fs.readFileSync('js/features/motion.js', 'utf8');
m = m.replace('const TOAST_DURATION = 2600;', 'const TOAST_DURATION = 1600;');
fs.writeFileSync('js/features/motion.js', m);
console.log('toast duration → 1600ms');

fs.writeFileSync('js/core/app.js', c);

// Verify the changes landed
const result = fs.readFileSync('js/core/app.js', 'utf8');
const hasOldFocus = result.includes('textInput?.focus()');
const hasOldTop   = result.includes('`-${savedScrollPosition}px`');
console.log('enterBtn old focus removed:', !hasOldFocus);
console.log('body top offset removed:', !hasOldTop);
console.log('done');
