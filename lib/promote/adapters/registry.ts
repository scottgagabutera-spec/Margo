import { bufferPublishAdapter } from '@/lib/promote/adapters/buffer'
import { directPublishAdapter } from '@/lib/promote/adapters/direct'
import type { PublishAdapter } from '@/lib/promote/adapters/types'
import type { PublishAdapterKind } from '@/lib/promote/types'

const ADAPTERS: Record<PublishAdapterKind, PublishAdapter> = {
  direct: directPublishAdapter,
  buffer: bufferPublishAdapter,
}

export function getPublishAdapter(kind: PublishAdapterKind): PublishAdapter {
  const adapter = ADAPTERS[kind]
  if (!adapter) throw new Error(`Unknown publish adapter: ${kind}`)
  return adapter
}

export function resolvePublishAdapterKind(
  publishAdapter: string | null | undefined,
): PublishAdapterKind {
  return publishAdapter === 'buffer' ? 'buffer' : 'direct'
}
