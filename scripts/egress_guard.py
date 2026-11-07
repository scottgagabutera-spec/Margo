#!/usr/bin/env python3
"""Read-only egress guard: Supabase Storage bans, list-query hygiene, R2 presign uploads."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", ".git", ".next", "dist", "build", "coverage"}

# Legacy Supabase Storage — report as debt; do not fail CI until migrated.
STORAGE_ALLOWLIST = {
    "components/cover-upload.tsx",
    "lib/profile-avatar-upload.ts",
    "lib/purge-user-account.ts",
    "lib/studio/song-media-delete.ts",
    "scripts/verify-account-deletion.mjs",
}

STORAGE_PATTERNS = [
    re.compile(r"supabase\.storage"),
    re.compile(r"storage\.from\s*\("),
    re.compile(r"https://[a-z0-9]+\.supabase\.co/storage/v1/object"),
]

SELECT_STAR = re.compile(r"""\.select\s*\(\s*['"]\*['"]\s*\)""")
LIST_ROUTE_HINT = re.compile(r"app/api/.+/route\.(ts|js)$")

# Routes with known select('*') debt — report only; fail on new paths under app/api/memories.
SELECT_STAR_ALLOWLIST_PREFIXES = (
    "app/api/promote/",
    "app/api/admin/",
)

UPLOAD_ROUTE = re.compile(r"(upload|/photo|/artwork|/avatar|/cover)", re.I)
R2_PRESIGN_HINT = re.compile(r"(presign|/api/.+upload-url|putCatalogFileToR2|presignedPut)", re.I)


def iter_source_files() -> list[Path]:
    out: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix not in {".ts", ".tsx", ".js", ".mjs", ".jsx"}:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith("scripts/egress_guard"):
            continue
        out.append(path)
    return out


def main() -> int:
    storage_hits: list[tuple[str, int, str]] = []
    star_hits: list[tuple[str, int, str, str]] = []
    upload_hits: list[tuple[str, str]] = []

    for path in iter_source_files():
        rel = path.relative_to(ROOT).as_posix()
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        lines = text.splitlines()
        for i, line in enumerate(lines, start=1):
            for pat in STORAGE_PATTERNS:
                if pat.search(line):
                    storage_hits.append((rel, i, line.strip()[:120]))
            if SELECT_STAR.search(line) and LIST_ROUTE_HINT.search(rel):
                if rel.startswith("app/api/memories/"):
                    star_hits.append((rel, i, line.strip()[:120], "FAIL"))
                elif any(rel.startswith(p) for p in SELECT_STAR_ALLOWLIST_PREFIXES):
                    star_hits.append((rel, i, line.strip()[:120], "LEGACY"))
                else:
                    star_hits.append((rel, i, line.strip()[:120], "WARN"))
        if "app/api/" in rel and UPLOAD_ROUTE.search(rel):
            if not R2_PRESIGN_HINT.search(text):
                upload_hits.append((rel, "API upload route without R2 presign pattern in file"))

    fail = False
    print("## Egress guard report\n")
    print("### Supabase Storage usage")
    for rel, ln, snippet in storage_hits:
        status = "LEGACY (allowlisted)" if rel in STORAGE_ALLOWLIST else "FAIL"
        if status == "FAIL":
            fail = True
        print(f"| {rel}:{ln} | {status} | {snippet} |")

    print("\n### select('*') in API routes")
    for rel, ln, snippet, status in star_hits:
        print(f"| {rel}:{ln} | {status} | {snippet} |")
        if status == "FAIL":
            fail = True

    print("\n### Upload routes without R2 presign hint")
    for rel, msg in upload_hits:
        if "memories" in rel and "photo-upload-url" in rel:
            continue
        print(f"| {rel} | FAIL | {msg} |")
        fail = True

    if not storage_hits and not star_hits and not upload_hits:
        print("(no issues)")
    elif not fail:
        print("\n**Result:** PASS (legacy storage debt only)")
        return 0

    print("\n**Result:** FAIL")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
