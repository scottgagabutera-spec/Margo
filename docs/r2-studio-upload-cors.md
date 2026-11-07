# Studio catalog upload and R2 CORS

Browser uploads use a presigned `PUT` to `https://<account>.r2.cloudflarestorage.com/...`. If CORS is wrong, the client shows **Failed to fetch** even though presign succeeded.

## Cloudflare dashboard (tap by tap)

1. Open Cloudflare dashboard → R2 → bucket **margo** (or your `R2_BUCKET_NAME`).
2. Settings → CORS policy → Add rule.
3. Allowed origins (one rule or separate rules):
   - `https://trymargo.com`
   - `https://www.trymargo.com`
   - Your Vercel preview origin if you test uploads on preview builds
4. Allowed methods: `GET`, `PUT`, `HEAD`.
5. Allowed headers: `Content-Type`, `x-amz-content-sha256`, `x-amz-date`, `Authorization`.
6. Expose headers: `ETag`.
7. Max age: `3600`.
8. Save.

## App fallbacks (this PR)

- Presigned PUT sends only `Content-Type` (no signed `Cache-Control`).
- `credentials: 'omit'`, retry with backoff.
- Files ≤ 6 MB can use `POST /api/studio/catalog-upload` (server-side PutObject) when the browser PUT fails.

Larger audio (up to 25 MB) still requires working R2 CORS for direct PUT.
