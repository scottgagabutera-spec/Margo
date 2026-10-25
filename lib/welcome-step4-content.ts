import type { WelcomeDraftRole } from './welcome-draft.ts'

export type WelcomeStep4Role = 'listener' | 'artist' | 'both'

export type WelcomeStep4IconId =
  | 'pen'
  | 'compass'
  | 'feed'
  | 'lyric-back'
  | 'apply'
  | 'profile'

export interface WelcomeStep4CardDef {
  id: string
  icon: WelcomeStep4IconId
  title: string
  line: string
}

export function resolveWelcomeStep4Role(role: WelcomeDraftRole | null): WelcomeStep4Role {
  if (role === 'artist') return 'artist'
  if (role === 'both') return 'both'
  return 'listener'
}

export function welcomeStep4Subtitle(role: WelcomeStep4Role): string {
  if (role === 'artist') {
    return 'Share your voice and grow when you are ready.'
  }
  if (role === 'both') {
    return 'Listen, share lines, and explore what you can build here.'
  }
  return 'Your feed, Discover, and lyric moments start here.'
}

const COMPLETE_PROFILE_CARD: WelcomeStep4CardDef = {
  id: 'complete-profile',
  icon: 'profile',
  title: 'Complete your profile',
  line: 'Add a bio and signature lyric in Edit Profile, anytime.',
}

const LISTENER_CARDS: WelcomeStep4CardDef[] = [
  {
    id: 'post-lyric',
    icon: 'pen',
    title: 'Post a lyric',
    line: 'Share a line from the heart in Compose.',
  },
  {
    id: 'discover-listen',
    icon: 'compass',
    title: 'Discover and listen',
    line: 'Find songs through lyric moments and sing along in karaoke.',
  },
  {
    id: 'feed-follow',
    icon: 'feed',
    title: 'Follow voices you love',
    line: 'Build your Feed with posts, Shorts, and Lyric Backs.',
  },
  COMPLETE_PROFILE_CARD,
]

const ARTIST_CARDS: WelcomeStep4CardDef[] = [
  {
    id: 'post-lyric',
    icon: 'pen',
    title: 'Post a lyric',
    line: 'Introduce yourself with lines that feel like you.',
  },
  {
    id: 'discover-listen',
    icon: 'compass',
    title: 'Discover the catalog',
    line: 'Explore songs and moments the way listeners do today.',
  },
  {
    id: 'apply-artist',
    icon: 'apply',
    title: 'Apply to share music',
    line: 'When you are ready, apply as an artist. Studio unlocks after approval.',
  },
  COMPLETE_PROFILE_CARD,
]

const BOTH_CARDS: WelcomeStep4CardDef[] = [
  {
    id: 'post-lyric',
    icon: 'pen',
    title: 'Post a lyric',
    line: 'Share lines in Compose and join the conversation.',
  },
  {
    id: 'discover-listen',
    icon: 'compass',
    title: 'Discover and listen',
    line: 'Moments, songs, and karaoke are all in Discover.',
  },
  {
    id: 'listen-and-apply',
    icon: 'lyric-back',
    title: 'Connect and grow',
    line: 'Follow people, send Lyric Backs, and apply to share your music later.',
  },
  COMPLETE_PROFILE_CARD,
]

export function welcomeStep4Cards(role: WelcomeStep4Role): WelcomeStep4CardDef[] {
  if (role === 'artist') return ARTIST_CARDS
  if (role === 'both') return BOTH_CARDS
  return LISTENER_CARDS
}
