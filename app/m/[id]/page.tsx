import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MomentRecipientView } from '@/components/moment/moment-recipient-view'
import { loadPublicMomentById } from '@/lib/moment/load'
import { buildMomentPageMetadata } from '@/lib/moment/metadata'

interface MomentPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: MomentPageProps): Promise<Metadata> {
  const { id } = await params
  const loaded = await loadPublicMomentById(id)
  if (!loaded) {
    return {
      title: 'Moment not found',
      robots: { index: false, follow: false },
    }
  }
  return buildMomentPageMetadata(loaded.moment, id, {
    senderLabel: loaded.senderLabel,
  })
}

export default async function MomentRecipientPage({ params }: MomentPageProps) {
  const { id } = await params
  const loaded = await loadPublicMomentById(id)
  if (!loaded) notFound()

  return (
    <MomentRecipientView
      moment={loaded.moment}
      senderLabel={loaded.senderLabel}
      artworkUrl={loaded.artworkUrl}
    />
  )
}
