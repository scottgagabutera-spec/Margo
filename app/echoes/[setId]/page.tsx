import { EchoesSetView } from '@/components/echoes-set-view'

export default async function EchoesSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 16px) 16px' }}>
      <EchoesSetView setId={setId} />
    </div>
  )
}
