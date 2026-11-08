import { EchoesPersonView } from '@/components/echoes-person-view'

export default async function EchoesPersonPage({
  params,
}: {
  params: Promise<{ setId: string; profileId: string }>
}) {
  const { setId, profileId } = await params
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 16px) 16px' }}>
      <EchoesPersonView setId={setId} profileId={profileId} />
    </div>
  )
}
