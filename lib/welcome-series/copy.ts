import type { WelcomeSeriesKind } from './kinds.ts'
import { firstNameFromDisplayName } from './first-name.ts'

export type WelcomeSeriesCopy = {
  title: string
  body: string
  buttonLabel: string
  href: string
}

function welcomeBody(kind: WelcomeSeriesKind, firstName: string): string {
  const name = firstName || 'there'
  switch (kind) {
    case 'welcome':
      return `Hey ${name}, welcome to Margo. I'm Scott, the founder.

Say what you feel through music. Post a lyric, answer someone with another lyric, or share a memory with a photo or a few words.

Start with one song that means something to you.`
    case 'first_memory':
      return `Some songs take you back to a moment you never want to lose.

Save it as a Memory with a song, a photo, or a few words that tell the story.`
    case 'first_lyric':
      return `Pick a song, choose the line that speaks to you, and share it.

You do not need a perfect caption. What lyric is on your mind today?`
    case 'follow_people':
      return `Follow people whose lyrics you connect with, and artists whose music means something to you.

Open a profile and tap Follow.`
    case 'artist_guide':
      return `Are you an independent artist? Apply for artist verification on Margo.

Verify with Suno, or share at least 3 links to your streaming or social profiles. We review every application by hand and answer within 3 business days.`
    default:
      return ''
  }
}

const META: Record<WelcomeSeriesKind, Omit<WelcomeSeriesCopy, 'body'>> = {
  welcome: {
    title: 'Welcome to Margo',
    buttonLabel: 'Explore Margo',
    href: '/feed',
  },
  first_memory: {
    title: 'Save a memory',
    buttonLabel: 'Add a memory',
    href: '/memories/new',
  },
  first_lyric: {
    title: 'Post a lyric',
    buttonLabel: 'Post a lyric',
    href: '/compose',
  },
  follow_people: {
    title: 'Find your people',
    buttonLabel: 'Find people',
    href: '/search',
  },
  artist_guide: {
    title: 'Apply as an artist',
    buttonLabel: 'Apply as an artist',
    href: '/apply-artist',
  },
}

export function welcomeSeriesCopy(
  kind: WelcomeSeriesKind,
  firstName?: string | null,
): WelcomeSeriesCopy {
  const name = firstNameFromDisplayName(firstName ?? undefined)
  const meta = META[kind]
  return {
    ...meta,
    body: welcomeBody(kind, name === 'there' && firstName ? firstName : name),
  }
}

export function welcomeSeriesBodyFromNotification(
  kind: WelcomeSeriesKind,
  data: { firstName?: string | null; body?: string } | null | undefined,
): string {
  if (data?.body && typeof data.body === 'string') return data.body
  const stored = data?.firstName
  return welcomeSeriesCopy(kind, stored).body
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
