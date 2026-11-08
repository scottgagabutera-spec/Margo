import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeArtistName } from '@/lib/catalog-artist/normalize'
import { ingestCatalogArtistArtwork } from '@/lib/catalog-artist/artwork-ingest'
import {
  findMargoArtistProfileId,
  loadMargoArtistProfileForCatalog,
} from '@/lib/catalog-artist/margo-profile-match'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import { catalogArtistArtworkKey } from '@/lib/catalog-artist/artwork-ingest'
import { searchDeezerArtists, type DeezerArtistHit } from '@/lib/catalog-artist/deezer-search'
import { catalogArtistDeezerR2IngestEnabled } from '@/lib/catalog-artist/config'

export type CatalogArtistPublic = {
  id: string
  name: string
  artworkUrl: string | null
  previewArtworkUrl: string | null
  onMargo: boolean
  margoUsername: string | null
  source: string
}

function resolveCatalogArtistArtwork(opts: {
  artworkKey: string | null
  deezerPreview: string | null
  margoAvatarUrl: string | null
}): { artworkUrl: string | null; previewArtworkUrl: string | null } {
  if (opts.artworkKey) {
    return {
      artworkUrl: publicCatalogMediaUrl(opts.artworkKey),
      previewArtworkUrl: opts.deezerPreview,
    }
  }
  if (opts.deezerPreview) {
    return {
      artworkUrl: opts.deezerPreview,
      previewArtworkUrl: opts.deezerPreview,
    }
  }
  return {
    artworkUrl: opts.margoAvatarUrl,
    previewArtworkUrl: null,
  }
}

async function resolveMargoPublicFields(
  margoProfileId: string | null,
  artistName: string,
  rowId: string,
): Promise<{ margoProfileId: string | null; margoUsername: string | null; margoAvatarUrl: string | null }> {
  const admin = getSupabaseAdmin()
  let profileId = margoProfileId
  if (!profileId) {
    const margo = await findMargoArtistProfileId(artistName)
    if (margo) {
      profileId = margo.profileId
      await admin.from('catalog_artists').update({ margo_profile_id: margo.profileId }).eq('id', rowId)
    }
  }
  if (!profileId) {
    return { margoProfileId: null, margoUsername: null, margoAvatarUrl: null }
  }
  const prof = await loadMargoArtistProfileForCatalog(profileId)
  if (!prof) {
    return { margoProfileId: null, margoUsername: null, margoAvatarUrl: null }
  }
  return {
    margoProfileId: profileId,
    margoUsername: prof.username,
    margoAvatarUrl: prof.avatarUrl,
  }
}

export async function ensureCatalogArtistFromDeezer(
  hit: DeezerArtistHit,
  opts?: { materializeArtwork?: boolean },
): Promise<CatalogArtistPublic> {
  const materializeArtwork = opts?.materializeArtwork === true && catalogArtistDeezerR2IngestEnabled()
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

  const margo = await resolveMargoPublicFields(
    (row?.margo_profile_id as string | null) ?? null,
    hit.name,
    rowId,
  )
  const art = resolveCatalogArtistArtwork({
    artworkKey,
    deezerPreview: hit.pictureUrl,
    margoAvatarUrl: margo.margoAvatarUrl,
  })

  return {
    id: rowId,
    name: row?.name || hit.name,
    artworkUrl: art.artworkUrl,
    previewArtworkUrl: art.previewArtworkUrl,
    onMargo: !!margo.margoProfileId && !!margo.margoUsername,
    margoUsername: margo.margoUsername,
    source: row?.source || hit.source,
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

  const margo = await resolveMargoPublicFields(
    row.margo_profile_id as string | null,
    row.name as string,
    row.id as string,
  )

  let artworkKey = row.artwork_r2_key as string | null

  if (artworkKey) {
    return assemblePublicFromRow(row, artworkKey, margo)
  }

  if (catalogArtistDeezerR2IngestEnabled() && row.source === 'deezer') {
    const hits = await searchDeezerArtists(row.name as string, 3)
    const hit = hits.find((h) => h.sourceId === row.source_id) || hits[0]
    if (hit?.pictureUrl) {
      try {
        const ingested = await ingestCatalogArtistArtwork(row.id as string, hit.pictureUrl)
        artworkKey = ingested.key96
        await admin
          .from('catalog_artists')
          .update({ artwork_r2_key: artworkKey, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        return assemblePublicFromRow(row, artworkKey, margo)
      } catch (e) {
        console.warn('[catalog-artist] materialize ingest failed', row.id, e)
      }
    }
  }

  const art = resolveCatalogArtistArtwork({
    artworkKey: null,
    deezerPreview: null,
    margoAvatarUrl: margo.margoAvatarUrl,
  })

  return {
    id: row.id as string,
    name: row.name as string,
    artworkUrl: art.artworkUrl,
    previewArtworkUrl: art.previewArtworkUrl,
    onMargo: !!margo.margoProfileId && !!margo.margoUsername,
    margoUsername: margo.margoUsername,
    source: row.source as string,
  }
}

function assemblePublicFromRow(
  row: { id: string; name: string; source: string },
  artworkKey: string,
  margo: { margoProfileId: string | null; margoUsername: string | null },
): CatalogArtistPublic {
  return {
    id: row.id as string,
    name: row.name as string,
    artworkUrl: publicCatalogMediaUrl(artworkKey),
    previewArtworkUrl: null,
    onMargo: !!margo.margoProfileId && !!margo.margoUsername,
    margoUsername: margo.margoUsername,
    source: row.source as string,
  }
}

export function artworkUrlFromKey(key: string | null | undefined): string | null {
  if (!key) return null
  return publicCatalogMediaUrl(key)
}

export function displayArtworkKey(catalogArtistId: string): string {
  return catalogArtistArtworkKey(catalogArtistId, 96)
}
