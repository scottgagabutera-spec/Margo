import type { MemoryPublic } from '@/lib/memory/types'
import { assembleMemoriesPublicBatch } from '@/lib/memory/assemble-batch'

type Row = Record<string, unknown>

export async function assembleMemoryPublic(
  memory: Row,
  viewerId: string | null,
): Promise<MemoryPublic | null> {
  const batch = await assembleMemoriesPublicBatch([memory], viewerId)
  return batch[0] ?? null
}
