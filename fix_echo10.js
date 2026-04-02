const fs = require('fs');
let c = fs.readFileSync('js/features/echoes.js', 'utf8');

// Add stop to closeEchoSheet — right before collapseEchoCompose() call
c = c.replace(
  '  collapseEchoCompose();\n  clearEchoForm();',
  '  _echoStopKeyboardWatch();\n  collapseEchoCompose();\n  clearEchoForm();'
);

// Add stop to collapseEchoCompose — right after form is hidden
c = c.replace(
  "  if (form) { form.classList.remove('open'); form.style.display = 'none'; }\n}",
  "  if (form) { form.classList.remove('open'); form.style.display = 'none'; }\n  _echoStopKeyboardWatch();\n}"
);

fs.writeFileSync('js/features/echoes.js', c, 'utf8');
console.log('Done');
