import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeArtistName } from '@/lib/catalog-artist/normalize'
import { ingestCatalogArtistArtwork } from '@/lib/catalog-artist/artwork-ingest'
import { findMargoArtistProfileId } from '@/lib/catalog-artist/margo-profile-match'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import { catalogArtistArtworkKey } from '@/lib/catalog-artist/artwork-ingest'
import { searchDeezerArtists, type DeezerArtistHit } from '@/lib/catalog-artist/deezer-search'

export type CatalogArtistPublic = {
  id: string
  name: string
  artworkUrl: string | null
  previewArtworkUrl: string | null
  onMargo: boolean
  margoUsername: string | null
  source: string
}

export async function ensureCatalogArtistFromDeezer(
  hit: DeezerArtistHit,
  opts?: { materializeArtwork?: boolean },
): Promise<CatalogArtistPublic> {
  const materializeArtwork = opts?.materializeArtwork === true
  const admin = getSupabaseAdmin()
  const nameNormalized = normalizeArtistName(hit.name)

  const { data: found } = await admin
    .from('catalog_artists')
    .select('id, name, artwork_r2_key, margo_profile_id, source')
    .eq('source', hit.source)
    .eq('source_id', hit.sourceId)
    .maybeSingle()

  let row = found
  let rowId = row?.id as string | undefined
  if (!rowId) {
    const margo = await findMargoArtistProfileId(hit.name)
    const { data: inserted, error } = await admin
      .from('catalog_artists')
      .insert({
        name: hit.name,
        name_normalized: nameNormalized,
        source: hit.source,
        source_id: hit.sourceId,
        margo_profile_id: margo?.profileId ?? null,
      })
      .select('id, name, artwork_r2_key, margo_profile_id, source')
      .single()
    if (error || !inserted) throw error || new Error('insert failed')
    row = inserted
    rowId = inserted.id
  }

  if (!rowId) throw new Error('catalog artist row missing')

  let artworkKey = row?.artwork_r2_key as string | null
  if (materializeArtwork && !artworkKey && hit.pictureUrl) {
    try {
      const ingested = await ingestCatalogArtistArtwork(rowId, hit.pictureUrl)
      artworkKey = ingested.key96
      await admin
        .from('catalog_artists')
        .update({ artwork_r2_key: artworkKey, updated_at: new Date().toISOString() })
        .eq('id', rowId)
    } catch (e) {
      console.warn('[catalog-artist] artwork ingest failed', rowId, e)
    }
  }

  let margoProfileId = row?.margo_profile_id as string | null
  let margoUsername: string | null = null
  if (margoProfileId) {
    const { data: prof } = await admin.from('profiles').select('username, is_admin').eq('id', margoProfileId).maybeSingle()
    if (prof?.is_admin) margoProfileId = null
    else margoUsername = prof?.username ?? null
  } else {
    const margo = await findMargoArtistProfileId(hit.name)
    if (margo) {
      margoProfileId = margo.profileId
      margoUsername = margo.username
      await admin.from('catalog_artists').update({ margo_profile_id: margo.profileId }).eq('id', rowId)
    }
  }

  return {
    id: rowId,
    name: row?.name || hit.name,
    artworkUrl: artworkKey ? publicCatalogMediaUrl(artworkKey) : null,
    previewArtworkUrl: !artworkKey && hit.pictureUrl ? hit.pictureUrl : null,
    onMargo: !!margoProfileId && !!margoUsername,
    margoUsername,
    source: hit.source,
  }
}

export async function materializeCatalogArtistArtwork(catalogArtistId: string): Promise<CatalogArtistPublic | null> {
  const admin = getSupabaseAdmin()
  const { data: row } = await admin
    .from('catalog_artists')
    .select('id, name, artwork_r2_key, margo_profile_id, source, source_id')
    .eq('id', catalogArtistId)
    .maybeSingle()
  if (!row) return null
  if (row.artwork_r2_key) {
    return {
      id: row.id,
      name: row.name,
      artworkUrl: publicCatalogMediaUrl(row.artwork_r2_key),
      previewArtworkUrl: null,
      onMargo: false,
      margoUsername: null,
      source: row.source,
    }
  }
  if (row.source !== 'deezer') return null
  const hits = await searchDeezerArtists(row.name, 3)
  const hit = hits.find((h) => h.sourceId === row.source_id) || hits[0]
  if (!hit?.pictureUrl) return null
  const ingested = await ingestCatalogArtistArtwork(row.id, hit.pictureUrl)
  await admin
    .from('catalog_artists')
    .update({ artwork_r2_key: ingested.key96, updated_at: new Date().toISOString() })
    .eq('id', row.id)
  return {
    id: row.id,
    name: row.name,
    artworkUrl: ingested.publicUrl96,
    previewArtworkUrl: null,
    onMargo: false,
    margoUsername: null,
    source: row.source,
  }
}

export function artworkUrlFromKey(key: string | null | undefined): string | null {
  if (!key) return null
  return publicCatalogMediaUrl(key)
}

export function displayArtworkKey(catalogArtistId: string): string {
  return catalogArtistArtworkKey(catalogArtistId, 96)
}
