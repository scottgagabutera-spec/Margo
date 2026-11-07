# Studio upload and R2 CORS

## Cause of today's failure

The browser sends audio directly to `*.r2.cloudflarestorage.com` with a presigned PUT. If the bucket CORS policy does not allow your site origin, the browser blocks the request and Studio shows **Upload could not reach storage** (a failed `fetch`, not a bad file). Vercel previews also fail because their hostname is usually not in CORS.

Production fix: correct R2 CORS on **trymargo.com** plus chunked server upload fallback in the app.

## Cloudflare: set CORS on your phone

1. Open the Cloudflare app (or Safari/Chrome) and sign in.
2. Tap **R2** in the menu.
3. Tap your bucket (**margo** or your production bucket name).
4. Tap **Settings**.
5. Find **CORS policy** and tap **Add CORS policy** (or **Edit**).
6. Paste the JSON below into the policy editor.
7. Tap **Save**.

## JSON to paste

```json
[
  {
    "AllowedOrigins": [
      "https://trymargo.com",
      "https://www.trymargo.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Length",
      "x-amz-content-sha256",
      "x-amz-date",
      "Authorization"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

No API keys or secrets go in this policy.

## App behavior (chunked fallback)

- Fast path: presigned PUT when CORS works.
- Fallback: 3 MB chunks through `/api/studio/catalog-upload/multipart/*` with resume in `sessionStorage`, up to **50 MB** audio.
