const INDEX_UID = 'margo'

function readSearchKey(): string | null {
  return process.env.MEILISEARCH_SEARCH_KEY
    || process.env.MEILISEARCH_ADMIN_KEY
    || process.env.MEILISEARCH_API_KEY
    || null
}

function getHost(): string {
  const host = process.env.MEILISEARCH_HOST
  if (!host) throw new Error('MEILISEARCH_HOST is not set')
  return host.replace(/\/$/, '')
}

function getAdminKey(): string {
  const key = process.env.MEILISEARCH_ADMIN_KEY || process.env.MEILISEARCH_API_KEY
  if (!key) throw new Error('MEILISEARCH_ADMIN_KEY (or MEILISEARCH_API_KEY) is not set')
  return key
}

function getSearchKey(): string {
  const key = readSearchKey()
  if (!key) throw new Error('MEILISEARCH_SEARCH_KEY is not set')
  return key
}

/** Host + a key that can query the index. Preview often has neither. */
export function isMeilisearchSearchReady(): boolean {
  return Boolean(process.env.MEILISEARCH_HOST && readSearchKey())
}

async function meiliFetch(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<Response> {
  const key = init.admin === false ? getSearchKey() : getAdminKey()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${key}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${getHost()}${path}`, { ...init, headers })
}

export async function ensureMargoIndex(): Promise<void> {
  const res = await meiliFetch('/indexes', { method: 'GET', admin: true })
  if (!res.ok) throw new Error(`Meilisearch indexes list failed: ${res.status}`)
  const data = (await res.json()) as { results?: { uid: string }[] }
  const exists = (data.results || []).some(i => i.uid === INDEX_UID)
  if (!exists) {
    const create = await meiliFetch('/indexes', {
      method: 'POST',
      admin: true,
      body: JSON.stringify({ uid: INDEX_UID, primaryKey: 'id' }),
    })
    if (!create.ok && create.status !== 409) {
      throw new Error(`Meilisearch create index failed: ${create.status}`)
    }
  }

  await meiliFetch(`/indexes/${INDEX_UID}/settings`, {
    method: 'PATCH',
    admin: true,
    body: JSON.stringify({
      searchableAttributes: ['text', 'title', 'subtitle', 'username', 'emotion'],
      filterableAttributes: ['type'],
      sortableAttributes: ['resonateCount', 'plays', 'createdAt'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'resonateCount:desc',
        'plays:desc',
        'createdAt:desc',
      ],
      typoTolerance: { enabled: true },
    }),
  })
}

export async function upsertMargoDocuments(docs: unknown[]): Promise<void> {
  if (docs.length === 0) return
  await ensureMargoIndex()
  const res = await meiliFetch(`/indexes/${INDEX_UID}/documents`, {
    method: 'POST',
    admin: true,
    body: JSON.stringify(docs),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meilisearch upsert failed (${res.status}): ${body}`)
  }
}

export async function deleteMargoDocuments(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const res = await meiliFetch(`/indexes/${INDEX_UID}/documents/delete-batch`, {
    method: 'POST',
    admin: true,
    body: JSON.stringify(ids),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meilisearch delete failed (${res.status}): ${body}`)
  }
}

export async function searchMargoIndex(
  query: string,
  limitPerType = 8,
  types?: string[],
): Promise<{
  hits: Array<Record<string, unknown>>
  processingTimeMs: number
}> {
  const typeFilter = types && types.length > 0 && types.length < 4
    ? types.map((t) => `type = "${t}"`).join(' OR ')
    : undefined
  const res = await meiliFetch(`/indexes/${INDEX_UID}/search`, {
    method: 'POST',
    admin: false,
    body: JSON.stringify({
      q: query,
      limit: limitPerType * Math.max(1, types?.length || 4),
      ...(typeFilter ? { filter: typeFilter } : {}),
      attributesToHighlight: ['text', 'title', 'subtitle', 'username'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meilisearch search failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { hits: Array<Record<string, unknown>>; processingTimeMs: number }
  return { hits: data.hits || [], processingTimeMs: data.processingTimeMs || 0 }
}
