export type HelpAudience = 'members' | 'artists'

export type HelpTopicIconId =
  | 'compass'
  | 'pencil'
  | 'memories'
  | 'discover'
  | 'messages'
  | 'lock'
  | 'studio'
  | 'upload'
  | 'lyrics'
  | 'promote'
  | 'links'
  | 'copyright'

export type HelpTopic = {
  id: string
  audience: HelpAudience
  title: string
  subtitle: string
  icon: HelpTopicIconId
}

/** Step text uses [[Label]] for UI emphasis (weight 500). */
export type HelpArticle = {
  id: string
  topicId: string
  audience: HelpAudience
  title: string
  categoryLabel: string
  intro: string
  steps: string[]
  goodToKnow?: string
  updated: string
}

export const HELP_REPLY_NOTICE = 'We reply in 24 to 48 hours.'

export const HELP_HOME_SUBTITLE = HELP_REPLY_NOTICE

export const MEMBER_TOPICS: readonly HelpTopic[] = [
  { id: 'get-started', audience: 'members', title: 'Get started', subtitle: 'Sign in, first post', icon: 'compass' },
  { id: 'post-and-share', audience: 'members', title: 'Post and share', subtitle: 'Compose, cards', icon: 'pencil' },
  { id: 'memories-and-profile', audience: 'members', title: 'Memories and profile', subtitle: 'Photo, bio, memories', icon: 'memories' },
  { id: 'discover-and-listen', audience: 'members', title: 'Discover and listen', subtitle: 'Search, Shorts, Echoes', icon: 'discover' },
  { id: 'messages-and-alerts', audience: 'members', title: 'Messages and alerts', subtitle: 'Inbox, requests', icon: 'messages' },
  { id: 'account-and-privacy', audience: 'members', title: 'Account and privacy', subtitle: 'Password, delete', icon: 'lock' },
]

export const ARTIST_TOPICS: readonly HelpTopic[] = [
  { id: 'artist-get-started', audience: 'artists', title: 'Get started', subtitle: 'Apply, approval', icon: 'compass' },
  { id: 'studio-basics', audience: 'artists', title: 'Studio', subtitle: 'Overview, songs', icon: 'studio' },
  { id: 'upload-songs', audience: 'artists', title: 'Upload songs', subtitle: 'Audio, artwork', icon: 'upload' },
  { id: 'lyrics-and-publish', audience: 'artists', title: 'Lyrics and publish', subtitle: 'Detect, go live', icon: 'lyrics' },
  { id: 'promote-reach', audience: 'artists', title: 'Promote', subtitle: 'YouTube, TikTok', icon: 'promote' },
  { id: 'artist-account', audience: 'artists', title: 'Account and rights', subtitle: 'DMCA, support', icon: 'copyright' },
]

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'create-account',
    topicId: 'get-started',
    audience: 'members',
    title: 'Create an account with email',
    categoryLabel: 'Get started',
    intro: 'Start with email and a password. You confirm from your inbox before the first sign in.',
    steps: [
      'Tap [[Sign In]] on the [[You]] tab or in the top nav.',
      'Switch to [[Create account]].',
      'Enter your email and password (10 or more characters, with a letter and a number).',
      'Check consent for the Terms of Service and Privacy Policy.',
      'Tap [[Create account]].',
      'Open the confirmation link in your email, then [[Sign in]].',
    ],
    goodToKnow: 'Google and Discord use [[Continue with Google]] or [[Continue with Discord]] instead of email.',
    updated: 'November 2026',
  },
  {
    id: 'sign-in',
    topicId: 'get-started',
    audience: 'members',
    title: 'Sign in',
    categoryLabel: 'Get started',
    intro: 'Open the sign in sheet, use email or a connected account, then land on Feed or Welcome.',
    steps: [
      'Tap [[Sign In]] on the [[You]] tab or in the top nav.',
      'Enter email and password, or tap [[Continue with Google]] or [[Continue with Discord]].',
      'If Margo shows [[Finish account]], accept Terms and tap [[Continue]].',
      'Complete [[Welcome]] if you are sent there.',
    ],
    updated: 'November 2026',
  },
  {
    id: 'post-a-lyric',
    topicId: 'post-and-share',
    audience: 'members',
    title: 'Post a lyric',
    categoryLabel: 'Post and share',
    intro: 'Pick a song, choose a line, then post it to Feed from Compose.',
    steps: [
      'Tap the [[Post]] tab.',
      'Search with [[Search song, artist, lyrics]] and pick a song.',
      'On [[Pick the line]], select a line or tap [[Write your line…]].',
      'Tap [[Continue]] or [[Skip preview]] when preview is shown.',
      'On your moment, use the gold [[Post this line]] control.',
    ],
    goodToKnow: 'To save without posting, open [[Download]] and tap [[Save private]].',
    updated: 'November 2026',
  },
  {
    id: 'save-a-moment-privately',
    topicId: 'post-and-share',
    audience: 'members',
    title: 'Save a moment privately',
    categoryLabel: 'Post and share',
    intro: 'Keep a lyric moment on your profile without publishing it to Feed.',
    steps: [
      'Finish your line and song in [[Post]].',
      'Tap [[Download]] on the moment toolbar.',
      'Tap [[Save private]].',
    ],
    goodToKnow: 'You see a [[Saved]] toast. The moment stays on your profile only.',
    updated: 'November 2026',
  },
  {
    id: 'change-your-profile-picture',
    topicId: 'memories-and-profile',
    audience: 'members',
    title: 'Change your profile picture',
    categoryLabel: 'Memories and profile',
    intro: 'Your photo shows on your profile, your posts, and your messages.',
    steps: [
      'Open the [[You]] tab.',
      'Tap [[Edit profile]].',
      'Tap [[Change Photo]] or [[Add Photo]].',
      'Tap [[Take photo]] or [[Choose from library]].',
      'Adjust the crop if prompted, then confirm.',
    ],
    goodToKnow: 'Your photo saves as soon as upload finishes. Name and bio still need [[Save]] on Edit profile.',
    updated: 'November 2026',
  },
  {
    id: 'edit-your-profile',
    topicId: 'memories-and-profile',
    audience: 'members',
    title: 'Edit your profile',
    categoryLabel: 'Memories and profile',
    intro: 'Update your name, username, bio, and signature lyric.',
    steps: [
      'Open [[Edit profile]] from the [[You]] tab or [[Account settings]].',
      'Change cover, name, username, or bio.',
      'For signature lyric, open the sheet and edit text or replace the song line.',
      'Tap [[Save]].',
    ],
    updated: 'November 2026',
  },
  {
    id: 'watch-shorts',
    topicId: 'discover-and-listen',
    audience: 'members',
    title: 'Watch Shorts on Feed',
    categoryLabel: 'Discover and listen',
    intro: 'Short vertical clips from the catalog on the Feed Shorts tab.',
    steps: [
      'Open [[Feed]].',
      'Tap [[Shorts]].',
      'Swipe vertically between clips.',
      'Use [[Mute Short audio]] or [[Unmute Short audio]] as needed.',
    ],
    goodToKnow: 'Signed out playback may show [[Sign up to play Shorts]].',
    updated: 'November 2026',
  },
  {
    id: 'messages-and-requests',
    topicId: 'messages-and-alerts',
    audience: 'members',
    title: 'Messages and requests',
    categoryLabel: 'Messages and alerts',
    intro: 'Chats and follow requests live behind Hub.',
    steps: [
      'Tap [[Hub]].',
      'Tap [[Messages]].',
      'Open a chat or the requests tab when you see pending follows.',
    ],
    updated: 'November 2026',
  },
  {
    id: 'hide-or-delete-account',
    topicId: 'account-and-privacy',
    audience: 'members',
    title: 'Hide or delete your account',
    categoryLabel: 'Account and privacy',
    intro: 'Pause visibility or permanently remove your account.',
    steps: [
      'Open [[Account settings]].',
      'Tap [[Hide My Account]] or [[Unhide My Account]] to toggle visibility.',
      'To delete, type your exact username in the confirmation field.',
      'Tap [[Delete My Account]].',
    ],
    updated: 'November 2026',
  },
  {
    id: 'report-a-post',
    topicId: 'account-and-privacy',
    audience: 'members',
    title: 'Report a post',
    categoryLabel: 'Account and privacy',
    intro: 'Flag a post that breaks community rules.',
    steps: [
      'On a post, open the menu (⋯).',
      'Tap [[Report]].',
      'Choose [[Spam]], [[Harassment]], [[Inappropriate]], or [[Other]].',
      'Tap [[Report]] to submit.',
    ],
    updated: 'November 2026',
  },
  {
    id: 'apply-as-artist',
    topicId: 'artist-get-started',
    audience: 'artists',
    title: 'Apply as an artist',
    categoryLabel: 'Get started',
    intro: 'Submit an artist application from settings when you are signed in.',
    steps: [
      'Open [[Account settings]].',
      'In Artist, tap [[Apply as an artist]].',
      'Complete the application form and submit.',
    ],
    goodToKnow: 'Status appears as Application status on the same row after you apply.',
    updated: 'November 2026',
  },
  {
    id: 'claim-artist-mentions',
    topicId: 'artist-account',
    audience: 'artists',
    title: 'Claim your artist name and see your mentions',
    categoryLabel: 'Account and rights',
    intro:
      'When members add you to Favorites, Margo counts those mentions on your catalog artist row. Share your public links in the artist application so we can connect that catalog row to your Margo profile.',
    steps: [
      'In [[Apply as an artist]], fill in optional streaming and social links (Spotify, Apple Music, YouTube, Instagram, and others).',
      'Submit the form. Our team reviews links and sets [[margo_profile_id]] on the matching catalog artist when it is clearly you.',
      'After you are an approved artist, open [[Account settings]] and tap [[See favorite mentions]] to view favorite counts and top favorited songs or albums.',
      'To claim a name that is not linked yet, contact support from [[Help center]] with your artist name and the same links you use on streaming platforms.',
    ],
    goodToKnow: 'There is no self-serve claim button yet—support links your profile after a quick check.',
    updated: 'November 2026',
  },
  {
    id: 'upload-a-song',
    topicId: 'upload-songs',
    audience: 'artists',
    title: 'Upload a song in Studio',
    categoryLabel: 'Upload songs',
    intro: 'Add audio and artwork for a live catalog song.',
    steps: [
      'Open [[Studio]] from your profile menu when you are an approved artist.',
      'Start a new song or open an existing draft.',
      'Add audio (50 MB or smaller) and poster artwork (5 MB or smaller).',
      'Save and continue through lyric detection when offered.',
    ],
    updated: 'November 2026',
  },
]

export const POPULAR_QUESTIONS: readonly { label: string; href: string }[] = [
  { label: 'How do I post a lyric', href: '/help/post-and-share/post-a-lyric' },
  { label: 'How do I change my profile picture', href: '/help/memories-and-profile/change-your-profile-picture' },
  { label: 'How do I save a moment privately', href: '/help/post-and-share/save-a-moment-privately' },
]

export function topicsForAudience(audience: HelpAudience): readonly HelpTopic[] {
  return audience === 'members' ? MEMBER_TOPICS : ARTIST_TOPICS
}

export function articlesForTopic(topicId: string): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.topicId === topicId)
}

export function getTopic(topicId: string): HelpTopic | undefined {
  return [...MEMBER_TOPICS, ...ARTIST_TOPICS].find((t) => t.id === topicId)
}

export function getArticle(topicId: string, articleId: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.topicId === topicId && a.id === articleId)
}

export function searchArticles(query: string, audience: HelpAudience): HelpArticle[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return HELP_ARTICLES.filter((a) => {
    if (a.audience !== audience) return false
    const hay = `${a.title} ${a.intro} ${a.categoryLabel} ${a.steps.join(' ')}`.toLowerCase()
    return hay.includes(q)
  })
}
