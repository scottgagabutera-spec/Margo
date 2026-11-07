# Migration drift notes

- **Prod-only (now in repo):** `20261023084807_shell_clear_author_rpc.sql` — parity marker; no DDL delta on fresh installs that already have `shell_clear_author`.
- **Name mismatch (not renamed):** production `lyric_back_delete_shell_text_empty` vs repo `lyric_back_shell_text_empty`.
- **Memories applied on prod:** version `20261107104029`, name `20261108100007_memories_core` — repo file `20261107104029_memories_core.sql`.
