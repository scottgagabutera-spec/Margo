/**
 * Profile route layout — house artist MusicGroup JSON-LD only on /profile/margo.
 * Platform schema stays in app/layout.tsx (WebApplication + Organization, no MusicGroup).
 */
export default async function ProfileUsernameLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const isHouseArtist = username.toLowerCase() === 'margo'

  return (
    <>
      {isHouseArtist ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MusicGroup',
              name: 'Trymargo',
              url: 'https://trymargo.com/profile/margo',
              image: 'https://trymargo.com/icon.svg',
              description:
                'Trymargo is Margo\'s house music artist — original releases on the Margo platform. Listen on Spotify, Apple Music, Boomplay, YouTube and major streaming platforms.',
              sameAs: [
                'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ',
                'https://music.apple.com/us/artist/trymargo/1896142795',
                'https://www.boomplay.com/share/artist/130532485',
                'https://youtube.com/@trymargo',
                'https://www.tiktok.com/@officialtrymargo',
                'https://www.instagram.com/officialtrymargo',
              ],
            }),
          }}
        />
      ) : null}
      {children}
    </>
  )
}
