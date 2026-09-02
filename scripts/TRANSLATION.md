# Translation Workflow for goa.design

This document describes how to translate goa.design documentation using DeepL.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your DeepL API key:
   ```
   DEEPL_API_KEY=your-api-key-here
   ```

Get a DeepL API key at: https://www.deepl.com/pro-api

## Quick Start

```bash
# Translate all English docs supported by DeepL
./scripts/translate --lang IT --lang FR --lang ES content/en/docs/

# Translate a single file to French only
./scripts/translate --lang FR content/en/docs/1-goa/quickstart.md

# Check which Japanese files need a manual update without changing the cache
./scripts/translate --dry-run --lang JA content/en/docs/1-goa/

# See what would be translated (dry run)
./scripts/translate --dry-run content/en/docs/
```

## How It Works

1. **Source files** live in `content/en/docs/`
2. **Translated files** are placed in `content/{lang}/docs/` with the same structure
3. DeepL translates Italian, French, and Spanish; Japanese is updated manually
4. A **cache file** (`.translation-cache.json`) tracks which files have been translated
5. Only **changed files** are re-translated (unless `--force` is used)

For Japanese, inspect pending files with `--dry-run` before editing them. A
normal Japanese run does not update the translated file: it prints a reminder
and records the current English hash in the cache. Run it only after the manual
Japanese update, so the cache is not advanced before the translation is ready.

## Supported Languages

| Code | Language | Directory | Method |
|------|----------|-----------|--------|
| EN   | English  | content/en | Source |
| IT   | Italian  | content/it | DeepL |
| FR   | French   | content/fr | DeepL |
| ES   | Spanish  | content/es | DeepL |
| JA   | Japanese | content/ja | Manual |

## What Gets Translated

- **Translated**: Prose, headings, lists, front matter (title, description, linkTitle)
- **Preserved**: Code blocks, inline code, HTML tags, URLs, Hugo shortcodes

## Common Tasks

### After editing English docs

```bash
# Re-translate changed files supported by DeepL
./scripts/translate --lang IT --lang FR --lang ES content/en/docs/

# Force DeepL to re-translate everything it supports
./scripts/translate --force --lang IT --lang FR --lang ES content/en/docs/

# List Japanese files whose English source changed
./scripts/translate --dry-run --lang JA content/en/docs/

# After manually updating those Japanese files, record their English revision
./scripts/translate --lang JA content/en/docs/
```

### Adding a new page

```bash
# Translate the new page with DeepL
./scripts/translate --lang IT --lang FR --lang ES content/en/docs/1-goa/new-page.md

# Then inspect and manually update its Japanese translation
./scripts/translate --dry-run --lang JA content/en/docs/1-goa/new-page.md
./scripts/translate --lang JA content/en/docs/1-goa/new-page.md
```

### Translate only to one language

```bash
./scripts/translate --lang FR content/en/docs/
```

## DeepL API

Usage is displayed after each run. The free tier includes 500,000 chars/month.

You can also pass a different API key directly:
```bash
./scripts/translate --api-key "your-key-here" --lang IT --lang FR --lang ES content/en/docs/
```

## Troubleshooting

### Virtual environment issues

The script creates a `.venv/` directory for its dependencies. If you have issues:

```bash
rm -rf .venv
./scripts/translate --help  # Will recreate venv
```

### Force re-translation

If a file is corrupted or you want to re-translate:

```bash
./scripts/translate --force --lang IT --lang FR --lang ES content/en/docs/1-goa/quickstart.md
```

### Clear translation cache

To re-translate everything:

```bash
rm .translation-cache.json
./scripts/translate --lang IT --lang FR --lang ES content/en/docs/
./scripts/translate --dry-run --lang JA content/en/docs/
```

After manually checking every Japanese file reported by the dry run, run
`./scripts/translate --lang JA content/en/docs/` once to record the reviewed
English revisions.

## Files

- `scripts/translate` - Main entry point (shell script)
- `scripts/translate.py` - Python translation logic
- `.translation-cache.json` - Tracks translated files (gitignored)
- `.venv/` - Python virtual environment (gitignored)
- `i18n/*.yaml` - UI string translations (manually maintained)
