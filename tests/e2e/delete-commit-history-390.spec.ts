import { test } from '@playwright/test'
import fs from 'node:fs'

const OUT = '/opt/cursor/artifacts/screenshots'

/** Static harnesses matching delete UI at key commits (for Scott compare). */
const HARNESSES: Record<string, { html: string; caption: string }> = {
  'de987cc-focused-inline': {
    caption: 'Focused delete with dark scrim and confirm under the post.',
    html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
      body{margin:0;background:#111;color:#eee;font-family:system-ui,sans-serif}
      .scrim{position:fixed;inset:0;background:rgba(7,6,10,0.88);backdrop-filter:blur(6px);z-index:200}
      .card{margin:12px;padding:12px;background:#1a1a1e;border-radius:16px;position:relative;z-index:201}
      .panel{margin:12px;padding:20px 18px;border-radius:16px;background:#161420;border:1px solid rgba(255,255,255,0.05)}
      .panel p{margin:0 0 8px;font-style:italic;font-size:1.05rem}
      .sub{font-size:0.78rem;color:#aaa;margin:0 0 16px}
    </style></head><body><div class="scrim"></div><div class="card"><p>Feed post</p><div class="panel"><p>Delete this Moment?</p><p class="sub">This can't be undone. It will be removed from Feed, your profile, and anywhere else it appears.</p></div></div></body></html>`,
  },
  '34e59db-portal-popup': {
    caption: 'Centered popup portaled to body with dark scrim.',
    html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
      body{margin:0;background:#111}
      .scrim{position:fixed;inset:0;background:rgba(7,6,10,0.85);backdrop-filter:blur(8px);z-index:100}
      .dlg{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:101;width:min(340px,calc(100% - 48px));padding:18px 16px;background:#0f0e14;border-radius:20px;text-align:center;color:#eee;font-family:system-ui,sans-serif}
    </style></head><body><div class="scrim"></div><div class="dlg"><p style="font-style:italic;font-size:1.0625rem;margin:0 0 6px">Delete this Moment?</p><p style="font-size:0.8125rem;color:#aaa;margin:0 0 16px">This can't be undone.</p></div></body></html>`,
  },
  'next-inline-light': {
    caption: 'Light scrim; solid confirm attached under the post.',
    html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
  body{margin:0;background:#111;color:#eee;font-family:system-ui,sans-serif}
  .scrim{position:fixed;inset:0;background:rgba(7,6,10,0.35);backdrop-filter:blur(3px);z-index:200}
  .card{margin:12px;padding:12px;background:#1a1a1e;border-radius:16px;position:relative;z-index:201}
  .panel{margin:10px;padding:12px;border-radius:14px;background:#161420;border:1px solid rgba(255,255,255,0.085)}
  .panel p{margin:0 0 4px;font-style:italic;font-size:0.9375rem}
  .sub{font-size:0.75rem;color:#aaa;margin:0}
</style></head><body><div class="scrim"></div><div class="card"><p>Feed post</p><div class="panel"><p>Delete this Moment?</p><p class="sub">This can't be undone.</p></div></div></body></html>`,
  },
}

for (const [name, { html }] of Object.entries(HARNESSES)) {
  test(`delete UI @390 — ${name}`, async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: `${OUT}/delete-commit-${name}-390.png`, fullPage: true })
  })
}
