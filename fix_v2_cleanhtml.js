const fs = require('fs');
const lines = fs.readFileSync('js/features/echoes.js', 'utf8').split('\n');

// Find the form start and end
const formStart = lines.findIndex(l => l.includes('<div class="echo-compose-form" id="echoComposeForm">'));
const formEnd = lines.findIndex(l => l.includes('<div class="echo-vibe-label">Vibe</div>'));

console.log('Form content from line:', formStart + 1, 'to:', formEnd);

const newHTML = [
'        <div class="echo-compose-form" id="echoComposeForm">',
'          <div class="echo-form-user-row">',
'            <div id="echoFormAvatar"></div>',
'            <span class="echo-form-username" id="echoFormUsername"></span>',
'          </div>',
'          <div class="smart-search-wrap" id="echoSmartSearchWrap" style="position:relative">',
'            <div class="smart-search-field">',
'              <span class="smart-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>',
'              <input id="echoSmartInput" type="text" inputmode="text" autocomplete="off" autocorrect="off" spellcheck="false" class="smart-search-input" placeholder="Search by lyric, song or artist…" style="font-size:16px"/>',
'              <span id="echoSearchSpinner" class="search-spinner" style="display:none"></span>',
'              <button id="echoClearSearch" class="clear-search-btn" style="display:none" aria-label="Clear">×</button>',
'            </div>',
'            <div id="echoSearchSheet" class="search-sheet hidden">',
'              <div class="search-sheet-inner">',
'                <div id="echoSearchStatus" class="search-sheet-status"></div>',
'                <div id="echoSearchResults" class="search-sheet-results"></div>',
'              </div>',
'            </div>',
'          </div>',
'          <div id="echoSongPill" class="song-pill hidden">',
'            <span class="song-pill-art-wrap"><img id="echoSongPillArt" class="song-pill-art" src="" alt=""/><span class="song-pill-art-fallback">♪</span></span>',
'            <span class="song-pill-info"><span id="echoSongPillName" class="song-pill-name"></span><span id="echoSongPillArtist" class="song-pill-artist"></span></span>',
'            <button id="echoChangeSong" class="song-pill-change">Change</button>',
'          </div>',
'          <input type="hidden" id="echoSongInput"/>',
'          <input type="hidden" id="echoArtistInput"/>',
'          <div id="echoLyricWrap" style="display:none">',
'            <textarea class="echo-lyric-input" id="echoLyricInput" maxlength="140" placeholder="The lyric that answers this one…" rows="3" style="font-size:16px"></textarea>',
'            <div class="echo-char-count"><span id="echoCharCount">0</span>/140</div>',
'          </div>',
];

lines.splice(formStart, formEnd - formStart, ...newHTML);

fs.writeFileSync('js/features/echoes.js', lines.join('\n'), 'utf8');
console.log('Done. Form rewritten from line', formStart + 1, 'to', formStart + newHTML.length);
