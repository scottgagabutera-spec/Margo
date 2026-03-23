const fs = require('fs');

let css = fs.readFileSync('assets/css/composer.css', 'utf8');

// 1. Make smart-search-wrap position:relative so sheet can anchor to it
css = css.replace(
  '.smart-search-wrap{position:relative;margin-top:12px;}',
  '.smart-search-wrap{position:relative;margin-top:12px;z-index:40;}'
);

// 2. Make search sheet position:absolute, anchored below the search input
css = css.replace(
  '.search-sheet{margin-top:6px;border-radius:16px;background:#141318;border:1px solid rgba(255,255,255,0.08);box-shadow:0 16px 48px rgba(0,0,0,0.6);overflow:hidden;opacity:0;transform:translateY(8px);transition:opacity 0.22s ease,transform 0.22s cubic-bezier(0.16,1,0.3,1);}',
  '.search-sheet{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:50;border-radius:16px;background:#141318;border:1px solid rgba(255,255,255,0.08);box-shadow:0 16px 48px rgba(0,0,0,0.6);overflow:hidden;opacity:0;transform:translateY(8px);transition:opacity 0.22s ease,transform 0.22s cubic-bezier(0.16,1,0.3,1);}'
);

// 3. Make modal-body overflow:visible so the sheet can float outside its bounds
css += `
/* Allow search sheet to float over modal body content */
#composer .modal-body {
  overflow: visible !important;
}
#composer .modal-sheet {
  overflow: visible !important;
}
#shareInputs {
  position: relative;
  z-index: 40;
}
`;

fs.writeFileSync('assets/css/composer.css', css);
console.log('composer.css fixed - search sheet now floats over content');
