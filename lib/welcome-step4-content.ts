import type { WelcomeDraftRole } from './welcome-draft.ts'

export type WelcomeStep4Role = 'listener' | 'artist'

export type WelcomeStep4IconId =
  | 'pen'
  | 'compass'
  | 'feed'
  | 'lyric-back'
  | 'apply'
  | 'profile'
  | 'promote'

export interface WelcomeStep4CardDef {
  id: string
  icon: WelcomeStep4IconId
  title: string
  line: string
}

/** Saved "both" maps to artist cards [read from code]. */
export function resolveWelcomeStep4Role(role: WelcomeDraftRole | null): WelcomeStep4Role {
  if (role === 'artist' || role === 'both') return 'artist'
  return 'listener'
}

export function welcomeStep4Subtitle(role: WelcomeStep4Role): string {
  if (role === 'artist') {
    return 'Share your voice when you are ready. Listeners can still discover you here.'
  }
  return 'Your feed, Discover, and lyric moments are ready when you are.'
}

const COMPLETE_PROFILE_CARD: WelcomeStep4CardDef = {
  id: 'complete-profile',
  icon: 'profile',
  title: 'Complete your profile',
  line: 'Add a bio and signature lyric in Edit Profile, anytime.',
}

const LISTENER_CARDS: WelcomeStep4CardDef[] = [
  {
    id: 'discover-music',
    icon: 'compass',
    title: 'Find your kind of music',
    line: 'Browse songs and lyric moments in Discover, then sing along on a song page.',
  },
  {
    id: 'share-lyric',
    icon: 'pen',
    title: 'Say it through a song',
    line: 'Post a lyric that matches your mood in Compose.',
  },
  {
    id: 'answer-with-music',
    icon: 'lyric-back',
    title: 'Answer with music',
    line: 'Resonate, send a Lyric Back, export a Card, or repost a moment you love.',
  },
  COMPLETE_PROFILE_CARD,
]

const ARTIST_CARDS: WelcomeStep4CardDef[] = [
  {
    id: 'apply-artist',
    icon: 'apply',
    title: 'Apply to share your music',
    line: 'Build your artist profile and apply when you are ready. Studio unlocks after approval.',
  },
  {
    id: 'lyrics-find-people',
    icon: 'feed',
    title: 'Let your lyrics find people',
    line: 'Lyric moments help listeners discover your songs. They can Resonate and send Lyric Backs.',
  },
  {
    id: 'promote-music',
    icon: 'promote',
    title: 'Promote your music',
    line: 'After approval, prepare clips for TikTok and YouTube Shorts from Studio.',
  },
  COMPLETE_PROFILE_CARD,
]

export function welcomeStep4Cards(role: WelcomeStep4Role): WelcomeStep4CardDef[] {
  return role === 'artist' ? ARTIST_CARDS : LISTENER_CARDS
}
