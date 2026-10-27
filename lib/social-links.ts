/**
 * Official Margo social profile URLs (footer + marketing).
 * Schema sameAs also includes Facebook separately — see MARGO_SCHEMA_EXTRA_SAME_AS.
 */
export type MargoSocialId = 'instagram' | 'tiktok' | 'x' | 'youtube' | 'spotify'

export type MargoSocialLink = {
  id: MargoSocialId
  label: string
  href: string
}

export const MARGO_SOCIAL_LINKS: readonly MargoSocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/officialtrymargo',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@officialtrymargo',
  },
  {
    id: 'x',
    label: 'X',
    href: 'https://x.com/OfficialUTM',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://youtube.com/@trymargo',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    href: 'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ',
  },
] as const

/** Footer social URLs in display order. */
export function margoFooterSocialHrefs(): string[] {
  return MARGO_SOCIAL_LINKS.map((l) => l.href)
}

/** Facebook page URL used in JSON-LD only (not in footer row). */
export const MARGO_FACEBOOK_SAME_AS = 'https://www.facebook.com/share/1CiYZanmmg/'

/** Full schema.org sameAs list (five footer accounts + Facebook). */
export function margoSchemaSameAs(): string[] {
  return [...margoFooterSocialHrefs(), MARGO_FACEBOOK_SAME_AS]
}
