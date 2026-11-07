import type { WelcomeSeriesKind } from './kinds.ts'

export type WelcomeSeriesCopy = {
  title: string
  body: string
  buttonLabel: string
  href: string
}

const COPY: Record<WelcomeSeriesKind, WelcomeSeriesCopy> = {
  welcome: {
    title: 'Welcome to Margo',
    body:
      'Hey, welcome to Margo. I\'m Scott, the founder. I started Margo because I believe music carries moments of our lives. A song can remind us of someone, bring back a memory, or say something we cannot quite put into words. Here you can share the lyrics that mean something to you, save your memories, and connect with people who feel the same way. A few short notes will follow to help you start. Start with a song that means something to you.',
    buttonLabel: 'Explore Margo',
    href: '/feed',
  },
  first_memory: {
    title: 'Save a memory',
    body:
      'Some songs take us straight back to a moment in our lives. On Margo you can save that moment as a Memory with a song, a photo, or just a few words. Think of one moment you never want to forget. Save it here.',
    buttonLabel: 'Add a memory',
    href: '/memories/new',
  },
  first_lyric: {
    title: 'Post a lyric',
    body:
      'Ever heard a lyric that says exactly how you feel? Pick a song, choose the line that speaks to you, and share it. You do not need a perfect caption. What lyric is on your mind today?',
    buttonLabel: 'Post a lyric',
    href: '/compose',
  },
  follow_people: {
    title: 'Find your people',
    body:
      'Music brings people together, even when they have never met. Follow people whose lyrics you connect with, and artists whose music means something to you. Visit a profile and tap Follow.',
    buttonLabel: 'Find people',
    href: '/search',
  },
  artist_guide: {
    title: 'Apply as an artist',
    body:
      'Are you an independent artist? You can apply for artist verification on Margo. Verify with Suno, or share at least 3 links to your streaming or social profiles. We review every application by hand and answer within 3 business days.',
    buttonLabel: 'Apply as an artist',
    href: '/apply-artist',
  },
}

export function welcomeSeriesCopy(kind: WelcomeSeriesKind): WelcomeSeriesCopy {
  return COPY[kind]
}

export function welcomeSeriesKindFromData(data: unknown): WelcomeSeriesKind | null {
  if (!data || typeof data !== 'object') return null
  const kind = (data as { kind?: string }).kind
  if (
    kind === 'welcome'
    || kind === 'first_memory'
    || kind === 'first_lyric'
    || kind === 'follow_people'
    || kind === 'artist_guide'
  ) {
    return kind
  }
  return null
}
