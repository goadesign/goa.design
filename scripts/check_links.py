#!/usr/bin/env python3
"""Check local destinations and heading anchors in the built Hugo site."""

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


class Page(HTMLParser):
    """Collect link destinations and element IDs from one rendered page."""

    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "a" and attributes.get("href"):
            self.links.append(attributes["href"])


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "public")
    pages = {}
    for path in root.rglob("index.html"):
        relative = path.parent.relative_to(root).as_posix()
        url = "/" if relative == "." else f"/{relative}/"
        pages[url] = Page(path.read_text())
    if not pages:
        sys.exit(f"No built pages in {root}; run Hugo first.")

    failures = set()
    for source, page in pages.items():
        for href in page.links:
            if href == "#":
                continue
            destination = urlsplit(urljoin(f"https://goa.design{source}", href))
            if destination.scheme not in ("http", "https") or destination.netloc != "goa.design":
                continue
            target = unquote(destination.path)
            route = target.removesuffix("index.html")
            fragment = unquote(destination.fragment)
            if route in pages:
                if fragment and fragment not in pages[route].ids:
                    failures.add(f"{source}: missing anchor {target}#{fragment}")
            elif not (root / target.lstrip("/")).is_file():
                failures.add(f"{source}: missing page {target}")

    for failure in sorted(failures):
        print(failure)
    print(f"Checked {len(pages)} HTML pages; {len(failures)} broken internal links.")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
