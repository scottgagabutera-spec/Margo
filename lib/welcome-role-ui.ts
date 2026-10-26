/** Visible label for listener role — change one word to rebrand (e.g. User). */
export const WELCOME_LISTENER_ROLE_LABEL = 'Listener'

export const WELCOME_ROLE_OPTIONS = [
  {
    value: 'listener' as const,
    label: WELCOME_LISTENER_ROLE_LABEL,
    description: 'I\u2019m here to discover music and say it through lyrics.',
  },
  {
    value: 'artist' as const,
    label: 'Artist',
    description: 'I make music and want to share it.',
  },
]

export type WelcomeCreatorType =
  | 'singer_performer'
  | 'songwriter'
  | 'producer'
  | 'other'

export const WELCOME_CREATOR_TYPE_CHIPS: { value: WelcomeCreatorType; label: string }[] = [
  { value: 'singer_performer', label: 'Singer or performer' },
  { value: 'songwriter', label: 'Songwriter or lyricist' },
  { value: 'producer', label: 'Producer or beatmaker' },
  { value: 'other', label: 'Other' },
]

export function isWelcomeCreatorType(raw: unknown): raw is WelcomeCreatorType {
  return raw === 'singer_performer'
    || raw === 'songwriter'
    || raw === 'producer'
    || raw === 'other'
}
