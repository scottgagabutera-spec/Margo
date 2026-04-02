const fs = require('fs');
const content = fs.readFileSync('js/features/echoes.js', 'utf8');

const fixed = content
  .replace(
    "    const val = echoSmartInput.value.trim();\n    echoClearSearch.style.display = val ? '' : 'none';\n    if (val.length < 2) return;",
    "    const val = echoSmartInput.value.trim();\n    echoClearSearch.style.display = val ? '' : 'none';\n    if (!val) { echoSearchResults.style.display = 'none'; echoSearchResults.innerHTML = ''; echoLastQuery = ''; return; }\n    if (val.length < 2) return;"
  )
  .replace(
    "    echoSmartInput.focus();\n  };\n}\n  });\n}",
    "    echoSmartInput.focus();\n  };\n}"
  );

fs.writeFileSync('js/features/echoes.js', fixed, 'utf8');
console.log('Done');
