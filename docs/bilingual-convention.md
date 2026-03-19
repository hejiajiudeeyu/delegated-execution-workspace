# Bilingual Documentation Convention

This document defines how bilingual documentation is maintained in this repository.

## Scope

- Applies to root governance docs and all files under `docs/` in Wave1.
- English/original files remain `*.md`.
- Chinese paired files use `*.zh-CN.md` in the same directory.

## Pairing Rules

1. Keep the original file path and file name unchanged.
2. Create one Chinese paired file for each target markdown file.
3. Keep heading hierarchy and critical steps aligned between language pairs.
4. If there is any mismatch between language versions, Chinese documentation is the source of truth.

## Chinese File Header Format

Each Chinese file must start with:

1. `# <中文标题>`
2. blank line
3. `> 英文版：<relative-link-to-original-md>`
4. `> 说明：中文文档为准。`

## Translation Guidelines

- Prefer complete translation for short and medium files.
- For long files, provide a concise but complete Chinese adaptation that preserves:
  - key constraints
  - required checks
  - command steps
  - ownership and boundary statements
- Keep command blocks in their original shell form unless localization is necessary.

## Maintenance Workflow

1. Update the English/original `*.md` file.
2. Update the paired `*.zh-CN.md` file in the same change.
3. Verify every target `*.md` has a `*.zh-CN.md` counterpart.
4. Run repository checks as needed for CI-sensitive doc references (for example `nx.json` shared globals paths).
