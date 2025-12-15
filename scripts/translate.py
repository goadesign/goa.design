#!/usr/bin/env python3
"""
Translation script for goa.design documentation using DeepL API.

Translates markdown files while preserving:
- YAML front matter
- Code blocks (fenced and indented)
- HTML tags
- Links and images

Usage:
    python scripts/translate.py [options] <file_or_directory>
    
Examples:
    # Translate a single file to all languages
    python scripts/translate.py content/en/docs/1-goa/quickstart.md
    
    # Translate to specific language
    python scripts/translate.py --lang fr content/en/docs/1-goa/quickstart.md
    
    # Translate entire directory
    python scripts/translate.py content/en/docs/1-goa/
    
    # Dry run (show what would be translated)
    python scripts/translate.py --dry-run content/en/docs/
    
    # Force re-translation even if target exists
    python scripts/translate.py --force content/en/docs/1-goa/quickstart.md
"""

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

try:
    import deepl
except ImportError:
    print("Error: deepl package not installed. Run: pip install deepl")
    sys.exit(1)

# =============================================================================
# Configuration
# =============================================================================

# DeepL API key (from environment variable)
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")

# Source language
SOURCE_LANG = "EN"

# Target languages and their content directories
TARGET_LANGUAGES = {
    "IT": "it",      # Italian
    "JA": "ja",      # Japanese
    "FR": "fr",      # French
    "ES": "es",      # Spanish
}

# Project root (relative to this script)
PROJECT_ROOT = Path(__file__).parent.parent

# Cache file for tracking translations
CACHE_FILE = PROJECT_ROOT / ".translation-cache.json"

# =============================================================================
# Markdown Processing
# =============================================================================

class MarkdownPreserver:
    """Preserves non-translatable content in markdown files."""
    
    def __init__(self):
        self.preserved = []
        self.counter = 0
    
    def _placeholder(self, content: str) -> str:
        """Generate a unique placeholder for preserved content.
        
        Uses XML-style tags that DeepL recognizes and preserves.
        """
        placeholder = f"<x id=\"{self.counter}\"/>"
        self.preserved.append((placeholder, content))
        self.counter += 1
        return placeholder
    
    def extract(self, text: str) -> str:
        """Extract and replace non-translatable content with placeholders."""
        
        # Preserve YAML front matter
        front_matter_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
        if front_matter_match:
            text = text[len(front_matter_match.group(1)):]
            # We'll handle front matter separately
            self.front_matter = front_matter_match.group(1)
        else:
            self.front_matter = ""
        
        # Preserve fenced code blocks (``` or ~~~)
        text = re.sub(
            r'(```[\w]*\n.*?```|~~~[\w]*\n.*?~~~)',
            lambda m: self._placeholder(m.group(0)),
            text,
            flags=re.DOTALL
        )
        
        # Preserve inline code
        text = re.sub(
            r'(`[^`\n]+`)',
            lambda m: self._placeholder(m.group(0)),
            text
        )
        
        # Preserve HTML tags
        text = re.sub(
            r'(<[^>]+>)',
            lambda m: self._placeholder(m.group(0)),
            text
        )
        
        # Preserve image references ![alt](url)
        text = re.sub(
            r'(!\[[^\]]*\]\([^)]+\))',
            lambda m: self._placeholder(m.group(0)),
            text
        )
        
        # Preserve link URLs but keep link text for translation
        # [text](url) -> [text](__PRESERVED_N__)
        text = re.sub(
            r'\[([^\]]+)\]\(([^)]+)\)',
            lambda m: f'[{m.group(1)}]({self._placeholder(m.group(2))})',
            text
        )
        
        # Preserve Hugo shortcodes
        text = re.sub(
            r'(\{\{[</%].*?[>/%]\}\})',
            lambda m: self._placeholder(m.group(0)),
            text,
            flags=re.DOTALL
        )
        
        return text
    
    def restore(self, text: str) -> str:
        """Restore preserved content from placeholders."""
        for placeholder, content in reversed(self.preserved):
            text = text.replace(placeholder, content)
        return self.front_matter + text


def escape_yaml_string(s: str) -> str:
    """Escape a string for YAML, handling quotes and special characters."""
    # If the string contains double quotes, escape them
    if '"' in s:
        s = s.replace('"', '\\"')
    return s


def translate_front_matter(front_matter: str, translator: deepl.Translator, 
                           target_lang: str) -> str:
    """Translate specific fields in YAML front matter.
    
    Only translates single-line field values. Multi-line YAML (using > or |)
    is preserved as-is to avoid breaking YAML syntax.
    """
    if not front_matter:
        return ""
    
    # Fields to translate (only if single-line)
    translatable_fields = ['title', 'linkTitle']
    
    lines = front_matter.split('\n')
    translated_lines = []
    
    for line in lines:
        translated = False
        for field in translatable_fields:
            match = re.match(rf'^({field}:\s*)(.+)$', line)
            if match:
                prefix, value = match.groups()
                # Skip multi-line indicators
                if value.strip() in ('>', '|', '>-', '|-'):
                    break
                # Handle quoted strings
                if value.startswith('"') and value.endswith('"'):
                    inner = value[1:-1]
                    # Unescape any existing escaped quotes
                    inner = inner.replace('\\"', '"')
                    result = translator.translate_text(inner, target_lang=target_lang)
                    # Escape quotes in the translated text
                    escaped = escape_yaml_string(result.text)
                    translated_lines.append(f'{prefix}"{escaped}"')
                elif value.startswith("'") and value.endswith("'"):
                    inner = value[1:-1]
                    result = translator.translate_text(inner, target_lang=target_lang)
                    # For single-quoted strings, escape single quotes
                    escaped = result.text.replace("'", "''")
                    translated_lines.append(f"{prefix}'{escaped}'")
                else:
                    result = translator.translate_text(value.strip(), target_lang=target_lang)
                    # Unquoted value - wrap in quotes if it contains special chars
                    text = result.text
                    if any(c in text for c in '":{}[]&*#?|-<>=!%@`'):
                        text = f'"{escape_yaml_string(text)}"'
                    translated_lines.append(f'{prefix}{text}')
                translated = True
                break
        
        if not translated:
            translated_lines.append(line)
    
    return '\n'.join(translated_lines)


# =============================================================================
# Translation Cache
# =============================================================================

def load_cache() -> dict:
    """Load translation cache from disk."""
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    """Save translation cache to disk."""
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)


def file_hash(path: Path) -> str:
    """Calculate MD5 hash of file contents."""
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def needs_translation(source_path: Path, target_path: Path, target_lang: str,
                      cache: dict, force: bool = False) -> bool:
    """Check if a file needs translation.
    
    Uses a cache keyed by source path + target language to track which
    translations are up-to-date. Only re-translates when the source file
    has changed (different hash) or the target file doesn't exist.
    """
    if force:
        return True
    
    if not target_path.exists():
        return True
    
    # Cache key includes target language to track each translation separately
    source_rel = str(source_path.relative_to(PROJECT_ROOT))
    cache_key = f"{source_rel}:{target_lang}"
    current_hash = file_hash(source_path)
    
    if cache_key in cache and cache[cache_key] == current_hash:
        return False
    
    return True


# =============================================================================
# Main Translation Logic
# =============================================================================


def translate_file(
    source_path: Path,
    target_lang: str,
    translator: Optional[deepl.Translator],
    cache: dict,
    force: bool = False,
    dry_run: bool = False,
) -> bool:
    """Translate a single markdown file.

    For Japanese (JA), this function does not perform automatic translation.
    Instead, it prints a reminder to update the corresponding file using an LLM
    and records the source hash in the cache so future runs only flag files
    whose English source has changed.
    """

    # Calculate target path
    rel_path = source_path.relative_to(PROJECT_ROOT / "content" / "en")
    target_dir = TARGET_LANGUAGES[target_lang]
    target_path = PROJECT_ROOT / "content" / target_dir / rel_path

    # Check if translation (or manual update) is needed
    if not needs_translation(source_path, target_path, target_lang, cache, force):
        return False

    # Special handling for Japanese: no automatic translation
    if target_lang == "JA":
        if dry_run:
            print(f"  [JA] Would need manual LLM update: {source_path} -> {target_path}")
        else:
            print(f"  [JA] Needs manual LLM update: {source_path} -> {target_path}")
            # Mark as processed for this English revision
            source_rel = str(source_path.relative_to(PROJECT_ROOT))
            cache_key = f"{source_rel}:{target_lang}"
            cache[cache_key] = file_hash(source_path)
        return True

    if dry_run:
        print(f"  Would translate: {source_path} -> {target_path}")
        return True

    if translator is None:
        raise RuntimeError(
            f"Translator is not initialized for auto-translated language {target_lang}"
        )

    print(f"  Translating: {source_path.name} -> {target_dir}/...")

    # Read source file
    with open(source_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract and preserve non-translatable content
    preserver = MarkdownPreserver()
    extractable = preserver.extract(content)

    # Translate the content
    if extractable.strip():
        result = translator.translate_text(
            extractable,
            source_lang=SOURCE_LANG,
            target_lang=target_lang,
            preserve_formatting=True,
        )
        translated = result.text
    else:
        translated = extractable

    # Translate front matter fields
    if preserver.front_matter:
        preserver.front_matter = translate_front_matter(
            preserver.front_matter, translator, target_lang
        )

    # Restore preserved content
    final_content = preserver.restore(translated)

    # Create target directory and write file
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(final_content)

    # Update cache with source path + language as key
    source_rel = str(source_path.relative_to(PROJECT_ROOT))
    cache_key = f"{source_rel}:{target_lang}"
    cache[cache_key] = file_hash(source_path)

    return True


def translate_directory(
    source_dir: Path,
    target_langs: list[str],
    translator: Optional[deepl.Translator],
    cache: dict,
    force: bool = False,
    dry_run: bool = False,
) -> int:
    """Translate all markdown files in a directory."""
    count = 0

    for md_file in sorted(source_dir.rglob("*.md")):
        for lang in target_langs:
            if translate_file(md_file, lang, translator, cache, force, dry_run):
                count += 1

    return count


def main():
    parser = argparse.ArgumentParser(
        description="Translate goa.design documentation using DeepL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        "path",
        type=Path,
        help="File or directory to translate"
    )
    parser.add_argument(
        "--lang", "-l",
        choices=list(TARGET_LANGUAGES.keys()),
        action="append",
        help="Target language(s). Can be specified multiple times. Default: all"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Force re-translation even if target exists and source unchanged"
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Show what would be translated without actually translating"
    )
    parser.add_argument(
        "--api-key",
        default=DEEPL_API_KEY,
        help="DeepL API key (default: from env or built-in)"
    )
    
    args = parser.parse_args()
    
    # Validate path
    source_path = args.path.resolve()
    if not source_path.exists():
        print(f"Error: Path does not exist: {source_path}")
        sys.exit(1)
    
    # Ensure path is under content/en
    try:
        source_path.relative_to(PROJECT_ROOT / "content" / "en")
    except ValueError:
        print(f"Error: Path must be under content/en/")
        sys.exit(1)
    
    # Determine target languages
    target_langs = args.lang if args.lang else list(TARGET_LANGUAGES.keys())
    auto_translated_langs = [lang for lang in target_langs if lang != "JA"]
    
    # Initialize DeepL translator only if needed (non-Japanese targets and not dry-run)
    translator: Optional[deepl.Translator]
    if args.dry_run or not auto_translated_langs:
        translator = None
    else:
        try:
            translator = deepl.Translator(args.api_key)
            # Test the API key
            translator.get_usage()
        except deepl.AuthorizationException:
            print("Error: Invalid DeepL API key")
            sys.exit(1)
    
    # Load cache
    cache = load_cache()
    
    print(f"Translating to: {', '.join(target_langs)}")
    print(f"Source: {source_path}")
    if args.dry_run:
        print("(Dry run - no changes will be made)")
    print()
    
    # Translate
    if source_path.is_file():
        count = 0
        for lang in target_langs:
            if translate_file(source_path, lang, translator, cache, args.force, args.dry_run):
                count += 1
    else:
        count = translate_directory(source_path, target_langs, translator, cache, 
                                    args.force, args.dry_run)
    
    # Save cache
    if not args.dry_run:
        save_cache(cache)
    
    print()
    print(f"Translated {count} file(s)")
    
    if not args.dry_run and translator:
        usage = translator.get_usage()
        if usage.character.limit:
            pct = (usage.character.count / usage.character.limit) * 100
            print(f"DeepL usage: {usage.character.count:,} / {usage.character.limit:,} chars ({pct:.1f}%)")


if __name__ == "__main__":
    main()

