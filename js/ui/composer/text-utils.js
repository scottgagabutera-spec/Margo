/* ============================================================
   MARGO — js/composer.js
   v5.8 — concept-v2:
          • Mode buttons (Share/Guess/Discover) hidden via CSS
          • "or just post without creating" — rgba(255,255,255,0.6)
          • Loading overlay force-cleared after post submit
          • submitPost snapshots postedPost and passes it directly
            to openShareSheet — fixes GIF showing wrong lyric
   ============================================================ */

/* ══════════════════════════════════════════════════════════════
   MODERATION ENGINE — v2.0
   ══════════════════════════════════════════════════════════════ */

const SAFE_WORDS = new Set([
  'night','nights','midnight','knight','knights','tonight','fortnight',
  'bass','bassist','classic','classics','classical','classy','glass','glasses',
  'grass','mass','masses','massive','class','classes','classic','passage',
  'passion','passionate','compass','compass','harass','embarrass','assassin',
  'assumption','assistant','assemble','asset','assets','assess','assign',
  'associate','assist','assistance','association','assist',
  'pass','passes','passing','passenger','passion','passive',
  'mass','massage','ambassador',
  'cock','cocktail','cockatoo','peacock','hancock','woodcock','haycock',
  'rooster','weathercock',
  'piss','dismiss','bliss','kiss','kissing','missy','mississippi',
  'bastard','dastardly',
  'damn','damning','adamant','madam',
  'pitch','ditch','hitch','switch','witch','kitchen','itch',
  'dig','digit','digital','digs','dignity','digging',
  'asset','assets',
]);

const BANNED_PATTERNS = [
  'fuck','shit','bitch','asshole','nigger','cunt',
  'whore','slut','pussy','dick','cock','bastard',
];

const BANNED_VARIATIONS = {
  fuck:    ['fuk','fck','fuq','phuck','fux','f u c k','f*ck'],
  shit:    ['sh1t','sht','5hit'],
  bitch:   ['biatch','b1tch','bytch'],
  pussy:   ['pus5y','puss1','pussi','pus5i'],
  dick:    ['d1ck','dik','d!ck'],
  cock:    ['c0ck','cok','c0k'],
  bastard: ['b4stard','baztard'],
  asshole: ['a55hole','@sshole','ahole'],
  nigger:  ['n1gger','nigg3r'],
  cunt:    ['c*nt','kunt'],
  whore:   ['wh0re','h0re'],
  slut:    ['5lut','sl*t'],
};

function tokenize(text) {
  return text.toLowerCase().split(/[\s,\.!?;:\-"'()\[\]{}\/\\|<>]+/).filter(Boolean);
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
}

function isWordBanned(word) {
  const norm = normalizeWord(word);
  if (SAFE_WORDS.has(word.toLowerCase())) return false;
  if (SAFE_WORDS.has(norm)) return false;
  for (const pattern of BANNED_PATTERNS) {
    const normPattern = normalizeWord(pattern);
    if (norm === normPattern) return true;
    const vars = BANNED_VARIATIONS[pattern] || [];
    if (vars.some(v => norm === normalizeWord(v))) return true;
  }
  return false;
}

function containsBannedWord(text) {
  return tokenize(text).some(word => isWordBanned(word));
}

function censorText(text) {
  let result = text;
  for (const pattern of BANNED_PATTERNS) {
    const allVariants = [pattern, ...(BANNED_VARIATIONS[pattern] || [])];
    for (const variant of allVariants) {
      if (!variant.includes(' ')) {
        try {
          const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
          const censored = pattern[0] + '*'.repeat(Math.max(pattern.length - 2, 1)) + pattern[pattern.length - 1];
          result = result.replace(regex, (match) => {
            if (SAFE_WORDS.has(match.toLowerCase())) return match;
            return censored;
          });
        } catch (_) {}
      }
    }
  }
  return result;
}

function decodeHTML(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

/* ── STYLES ── */
