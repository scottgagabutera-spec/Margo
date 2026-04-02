const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

const newCSS = [
  "    .echo-smart-search-wrap{position:relative;margin-bottom:2px}",
  "    .echo-smart-search-field{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);transition:border-color 0.2s}",
  "    .echo-smart-search-field:focus-within{border-color:rgba(232,197,71,0.35)}",
  "    .echo-smart-input{flex:1;background:none;border:none;outline:none;color:#fff;font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:500;min-width:0;caret-color:#E8C547}",
  "    .echo-smart-input::placeholder{color:rgba(255,255,255,0.22)}",
  "    .echo-search-spinner{width:12px;height:12px;border-radius:50%;border:2px solid rgba(232,197,71,0.2);border-top-color:#E8C547;animation:echoSpin 0.7s linear infinite;flex-shrink:0}",
  "    .echo-clear-search{background:none;border:none;color:rgba(255,255,255,0.3);font-size:1rem;cursor:pointer;padding:0 2px;flex-shrink:0;transition:color 0.15s;line-height:1}",
  "    .echo-clear-search:hover{color:rgba(255,255,255,0.7)}",
  "    .echo-search-results{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:50;border-radius:12px;background:#141318;border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);overflow:hidden;max-height:220px;overflow-y:auto}",
  "    .echo-song-pill{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(232,197,71,0.06);border:1px solid rgba(232,197,71,0.22)}",
  "    .echo-song-pill-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}",
  "    .echo-song-pill-name{font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  "    .echo-song-pill-artist{font-family:'Space Mono',monospace;font-size:0.55rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  "    .echo-song-pill-change{background:none;border:1px solid rgba(232,197,71,0.3);color:rgba(232,197,71,0.7);font-family:'Space Mono',monospace;font-size:0.46rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 9px;border-radius:8px;cursor:pointer;flex-shrink:0;transition:all 0.18s}",
  "    .echo-song-pill-change:hover{background:rgba(232,197,71,0.1);color:#E8C547;border-color:rgba(232,197,71,0.6)}",
];

// Insert before line 285 (0-indexed: 284) which is the closing backtick
lines.splice(284, 0, ...newCSS);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done');
