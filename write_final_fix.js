const fs = require('fs');
let c = fs.readFileSync('js/ui/composer/integrations.js', 'utf8');

// Fix 1: showLyricChip - chipText undefined (should be chip), display fixes
const oldShowLyricChip = `function showLyricChip(lyric){
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
  wrap.style.display="";
  chipText.contentEditable="true";
  var lbl=document.getElementById("lyricChipLabel");if(lbl)lbl.style.display="";
  showVibeSection();
}`;

const newShowLyricChip = `function showLyricChip(lyric){
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
  wrap.style.display="block";
  chip.contentEditable="true";
  var lbl=document.getElementById("lyricChipLabel");
  if(lbl){lbl.style.removeProperty("display");lbl.style.display="block";}
  showVibeSection();
}`;

// Fix 2: showVibeSection - use explicit display values
const oldShowVibeSection = `function showVibeSection(){
  var vl=document.getElementById("vibeLabel");
  var eg=document.getElementById("emotionGrid");
  if(vl)vl.style.display="";
  if(eg)eg.style.display="";
}`;

const newShowVibeSection = `function showVibeSection(){
  var vl=document.getElementById("vibeLabel");
  var eg=document.getElementById("emotionGrid");
  if(vl){vl.style.removeProperty("display");vl.style.display="block";}
  if(eg){eg.style.removeProperty("display");eg.style.display="flex";}
}`;

if(c.includes(oldShowLyricChip)){
  c = c.replace(oldShowLyricChip, newShowLyricChip);
  console.log('showLyricChip fixed');
} else {
  console.log('ERROR: showLyricChip pattern not found - check file');
}

if(c.includes(oldShowVibeSection)){
  c = c.replace(oldShowVibeSection, newShowVibeSection);
  console.log('showVibeSection fixed');
} else {
  console.log('ERROR: showVibeSection pattern not found - check file');
}

fs.writeFileSync('js/ui/composer/integrations.js', c);
console.log('Done.');
