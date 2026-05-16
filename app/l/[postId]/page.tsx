import { Metadata } from 'next'
import { LyricShareClient } from './client'

const BASE_URL = 'https://trymargo.com'

// ── Fetch post server-side for OG metadata ──────────────────────────
async function getPost(postId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL}/posts/${postId}.json`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data) return null
    return { ...data, id: postId }
  } catch {
    return null
  }
}

// ── Dynamic OG metadata ─────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { postId: string } }
): Promise<Metadata> {
  const post = await getPost(params.postId)

  if (!post) {
    return {
      title: 'Margo — A Lyric Moment',
      description: 'Communicate through song lyrics on Margo.',
    }
  }

  const lyric = post.text || ''
  const song  = post.knowledge?.song  || ''
  const artist = post.knowledge?.artist || ''
  const artwork = post.knowledge?.artwork || null

  const title       = `"${lyric.slice(0, 60)}${lyric.length > 60 ? '…' : ''}" — Margo`
  const description = song && artist
    ? `${song} · ${artist} — shared on Margo, the lyric-first music platform.`
    : 'A lyric moment shared on Margo.'

  const ogImage = artwork
    ? artwork
    : `${BASE_URL}/og-image.png`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url: `${BASE_URL}/l/${params.postId}`,
      siteName: 'Margo',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: lyric }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@OfficialUTM',
      title,
      description,
      images: [ogImage],
    },
  }
}

// ── Page ────────────────────────────────────────────────────────────
export default function LyricSharePage({ params }: { params: { postId: string } }) {
  return <LyricShareClient postId={params.postId} />
}
