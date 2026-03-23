const fs = require('fs');

/* ── 1. Update integrations.js ── */
let integ = fs.readFileSync('js/ui/composer/integrations.js', 'utf8');

// Replace wireLyricChip — make chip text directly editable, remove edit button toggle logic
const oldWire = `function wireLyricChip(){
  var editBtn=document.getElementById("lyricChipEdit");
  if(!editBtn)return;
  editBtn.addEventListener("click",function(){
    var editWrap=document.getElementById("lyricEditWrap");
    if(!editWrap)return;
    var isHidden=editWrap.classList.contains("hidden");
    editWrap.classList.toggle("hidden",!isHidden);
    if(isHidden){
      var ta=document.getElementById("textInput");
      if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);}
    }
  });
  var ta=document.getElementById("textInput");
  if(ta){
    ta.addEventListener("input",function(){
      var chip=document.getElementById("lyricChipText");
      if(chip)chip.textContent=ta.value||"Tap ✎ to write your line…";
      var cc=document.getElementById("charCount");
      if(cc)cc.textContent=ta.value.length;
    });
  }
}`;

const newWire = `function wireLyricChip(){
  // Make chip text itself a contenteditable — no second textarea revealed
  var chipText=document.getElementById("lyricChipText");
  var editBtn=document.getElementById("lyricChipEdit");
  var ta=document.getElementById("textInput");
  if(!chipText)return;

  // Make chip text directly editable
  chipText.contentEditable="true";
  chipText.spellcheck=false;
  chipText.setAttribute("data-placeholder","Write your line here…");

  chipText.addEventListener("focus",function(){
    chipText.classList.add("editing");
    // select all on focus
    var range=document.createRange();
    range.selectNodeContents(chipText);
    var sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  chipText.addEventListener("blur",function(){
    chipText.classList.remove("editing");
    syncChipToTextarea();
  });

  chipText.addEventListener("input",function(){
    syncChipToTextarea();
    // enforce 140 char limit
    var text=chipText.textContent||"";
    if(text.length>140){
      chipText.textContent=text.substring(0,140);
      // move cursor to end
      var range=document.createRange();
      range.selectNodeContents(chipText);
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });

  chipText.addEventListener("keydown",function(e){
    if(e.key==="Enter"){e.preventDefault();chipText.blur();}
  });

  // Edit button just focuses the chip text
  if(editBtn){
    editBtn.addEventListener("click",function(){
      chipText.focus();
    });
  }

  function syncChipToTextarea(){
    var text=(chipText.textContent||"").substring(0,140);
    if(ta)ta.value=text;
    var cc=document.getElementById("charCount");
    if(cc)cc.textContent=text.length;
  }
}`;

integ = integ.replace(oldWire, newWire);

// Update showLyricChip — set textContent on contenteditable span, hide lyricEditWrap always
const oldShow = `function showLyricChip(lyric){
  var wrap=document.getElementById("lyricChipWrap");
  var chip=document.getElementById("lyricChipText");
  var ta=document.getElementById("textInput");
  var cc=document.getElementById("charCount");
  if(!wrap||!chip)return;
  var text=lyric.substring(0,140);
  chip.textContent=text||"Tap ✎ to write your line…";
  if(ta){ta.value=text;}
  if(cc){cc.textContent=text.length;}
  wrap.classList.remove("hidden");
  showVibeSection();
}`;

const newShow = `function showLyricChip(lyric){
  var wrap=document.getElementById("lyricChipWrap");
  var chip=document.getElementById("lyricChipText");
  var ta=document.getElementById("textInput");
  var cc=document.getElementById("charCount");
  var editWrap=document.getElementById("lyricEditWrap");
  if(!wrap||!chip)return;
  var text=lyric.substring(0,140);
  chip.textContent=text;
  if(ta){ta.value=text;}
  if(cc){cc.textContent=text.length;}
  if(editWrap)editWrap.classList.add("hidden");
  wrap.classList.remove("hidden");
  showVibeSection();
}`;

integ = integ.replace(oldShow, newShow);

fs.writeFileSync('js/ui/composer/integrations.js', integ);
console.log('integrations.js updated');

/* ── 2. Fix CSS ── */
let css = fs.readFileSync('assets/css/composer.css', 'utf8');

// Fix lyric-chip-text to show editable style when focused
// Fix lyric-chip-edit to be solid gold
// Fix song-pill-change to be solid gold
// Remove duplicate lyric-chip-edit rules and replace cleanly

// Remove old v9 block and rebuild
const cutAt = css.indexOf('/* \u2550\u2550 SONG CONFIRM + VISUAL v9 \u2550\u2550 */');
if(cutAt > -1) css = css.slice(0, cutAt).trimEnd();

// Also remove old static lyric-chip-edit rule in the earlier block
css = css.replace(
  '.lyric-chip-edit{flex-shrink:0;background:none;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:rgba(255,255,255,0.4);width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.75rem;transition:all 0.15s;}',
  '.lyric-chip-edit{flex-shrink:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.85rem;transition:all 0.18s;}'
);
css = css.replace(
  '.lyric-chip-edit:hover{border-color:rgba(232,197,71,0.4);color:#E8C547;background:rgba(232,197,71,0.06);}',
  ''
);

css += `
/* \u2550\u2550 COMPOSER v9 — inline edit, gold buttons \u2550\u2550 */

/* Lyric chip — contenteditable inline */
.lyric-chip{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);transition:border-color 0.2s,box-shadow 0.2s;cursor:text;}
.lyric-chip:focus-within{border-color:rgba(232,197,71,0.45);box-shadow:0 0 0 3px rgba(232,197,71,0.08);}
.lyric-chip-text{flex:1;font-size:0.9rem;color:#fff;font-style:italic;opacity:0.85;line-height:1.5;min-width:0;word-break:break-word;outline:none;caret-color:#E8C547;}
.lyric-chip-text:empty:before{content:attr(data-placeholder);color:rgba(255,255,255,0.25);font-style:italic;}
.lyric-chip-text.editing{opacity:1;font-style:normal;}

/* Edit pen — solid gold circle */
@keyframes editGlow{
  0%,100%{box-shadow:0 0 0 0 rgba(232,197,71,0),0 2px 8px rgba(232,197,71,0.35);}
  50%{box-shadow:0 0 0 6px rgba(232,197,71,0.12),0 2px 16px rgba(232,197,71,0.55);}
}
.lyric-chip-edit{
  width:32px;height:32px;border-radius:50%;
  background:#E8C547;
  border:none;color:#0B0B0D;
  font-size:0.85rem;font-weight:900;
  cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:0 2px 10px rgba(232,197,71,0.4);
  animation:editGlow 1.8s ease-in-out 5;
  transition:transform 0.18s,box-shadow 0.18s;
}
.lyric-chip-edit:hover{transform:scale(1.1);box-shadow:0 4px 20px rgba(232,197,71,0.65);animation:none;}
.lyric-chip-edit:active{transform:scale(0.95);}

/* Change button — solid gold */
.song-pill-change{
  background:#E8C547;
  border:none;border-radius:20px;
  color:#0B0B0D;
  font-family:var(--font-mono,monospace);font-size:0.52rem;font-weight:900;
  letter-spacing:1.5px;text-transform:uppercase;
  padding:7px 13px;cursor:pointer;flex-shrink:0;
  box-shadow:0 2px 10px rgba(232,197,71,0.35);
  transition:all 0.2s;
}
.song-pill-change:hover{background:#f5d878;box-shadow:0 4px 18px rgba(232,197,71,0.55);transform:scale(1.04);}
.song-pill-change:active{transform:scale(0.97);}

/* Song confirm fields */
.song-confirm-block{margin-top:10px;animation:pillIn 0.25s cubic-bezier(0.16,1,0.3,1);}
.song-confirm-block.hidden{display:none;}
.song-confirm-row{display:flex;gap:8px;}
.song-confirm-field{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}
.song-confirm-label{font-family:var(--font-mono,monospace);font-size:0.5rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(232,197,71,0.7);}
.song-confirm-input{background:rgba(232,197,71,0.04);border:1px solid rgba(232,197,71,0.22);border-radius:10px;padding:9px 12px;color:#fff;font-size:0.82rem;font-weight:600;outline:none;width:100%;transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;box-sizing:border-box;}
.song-confirm-input:focus{border-color:rgba(232,197,71,0.6);box-shadow:0 0 0 3px rgba(232,197,71,0.1);background:rgba(232,197,71,0.07);}
.song-confirm-input::placeholder{color:rgba(255,255,255,0.2);font-weight:400;}
`;

fs.writeFileSync('assets/css/composer.css', css);
console.log('composer.css updated');
console.log('\nDone. Commit and push.');
