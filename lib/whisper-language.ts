/**
 * Whisper-1 accepts the ISO-639-1 codes in openai/whisper tokenizer.LANGUAGES.
 * Studio also offers Zulu, Xhosa, Kinyarwanda, and Igbo — those have no Whisper
 * token, so the API must auto-detect and carry the name in `prompt`.
 */
const WHISPER_LANGUAGE_CODES = new Set([
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca', 'nl',
  'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro',
  'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy',
  'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu',
  'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw', 'gl', 'mr', 'pa', 'si', 'km',
  'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu', 'am', 'yi', 'lo',
  'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg',
  'as', 'tt', 'haw', 'ln', 'ha', 'ba', 'jw', 'su', 'yue',
])

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
  ko: 'Korean',
  fr: 'French',
  ja: 'Japanese',
  pt: 'Portuguese',
  ar: 'Arabic',
  it: 'Italian',
  id: 'Indonesian',
  hi: 'Hindi',
  vi: 'Vietnamese',
  he: 'Hebrew',
  ms: 'Malay',
  th: 'Thai',
  fa: 'Persian',
  sw: 'Swahili',
  sn: 'Shona',
  yo: 'Yoruba',
  so: 'Somali',
  af: 'Afrikaans',
  am: 'Amharic',
  ha: 'Hausa',
  tl: 'Tagalog',
  zu: 'Zulu',
  xh: 'Xhosa',
  rw: 'Kinyarwanda',
  ig: 'Igbo',
}

export function whisperLanguageName(code: string): string | null {
  return LANGUAGE_NAMES[code] ?? null
}

export function resolveWhisperLanguage(code: string | null | undefined): {
  apiLanguage?: string
  promptPrefix?: string
} {
  if (!code || code === 'auto') return {}
  const name = whisperLanguageName(code) || code
  if (WHISPER_LANGUAGE_CODES.has(code)) {
    return { apiLanguage: code }
  }
  return {
    promptPrefix: `This song is in ${name}. Transcribe the lyrics faithfully in ${name}.`,
  }
}
