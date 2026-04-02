const fs = require('fs');
let c = fs.readFileSync('js/features/echoes.js', 'utf8');

// 1. Change overflow:hidden to overflow:visible on #echoSheet
c = c.replace(
  'overflow:hidden;display:flex;flex-direction:column;\n      max-height:92dvh;',
  'overflow:visible;display:flex;flex-direction:column;\n      max-height:92dvh;'
);

// 2. Update mobile echo-compose to allow scrolling
c = c.replace(
  '.echo-compose{position:sticky;bottom:0;background:#0f0e12;z-index:10}',
  '.echo-compose{position:sticky;bottom:0;background:#0f0e12;z-index:10;overflow-y:auto;max-height:60dvh}'
);

fs.writeFileSync('js/features/echoes.js', c, 'utf8');
console.log('Done');
