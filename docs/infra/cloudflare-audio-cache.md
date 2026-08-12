# Cloudflare edge cache — `audio.trymargo.com`

Production MP3s are served from R2 via `audio.trymargo.com`. Probes show `Server: cloudflare` but `cf-cache-status: DYNAMIC` — every first play hits origin.

## Apply this cache rule (Cloudflare dashboard)

1. **Rules → Cache Rules → Create rule**
2. **Name:** `Margo audio MP3 edge cache`
3. **When incoming requests match:**
   - Field: **Hostname** → equals `audio.trymargo.com`
   - AND Field: **URI Path** → starts with `/Margo/audio/`
4. **Then:**
   - **Cache eligibility:** Eligible for cache
   - **Edge TTL:** Ignore cache-control and use this TTL → **1 month** (or longer; MP3s are immutable by filename)
   - **Browser TTL:** Respect origin (or override to 1 day)
   - **Cache key:** Include query string **off** (paths are canonical)

## Verify after deploy

```bash
curl.exe -sI "https://audio.trymargo.com/Margo/audio/Formidable.mp3"
# Expect: cf-cache-status: HIT (on second request from same PoP)
# Expect: Accept-Ranges: bytes (range requests still work when cached)
```

Range requests (`206 Partial Content`) are supported by Cloudflare cache for cacheable assets. First request may still be `MISS`; repeat plays and warms should be `HIT`.

## R2 origin (if using custom domain)

Ensure the R2 bucket custom domain `audio.trymargo.com` remains connected under **R2 → bucket → Settings → Custom Domains**. This is separate from the cache rule above.
