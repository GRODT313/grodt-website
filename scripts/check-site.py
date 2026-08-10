#!/usr/bin/env python3
"""Static production checks for GRODT website."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ERRORS: list[str] = []


def err(msg: str) -> None:
    ERRORS.append(msg)


def main() -> int:
    required = [
        "index.html",
        "success.html",
        "404.html",
        "robots.txt",
        "sitemap.xml",
        "privacy-policy.html",
        "terms-of-service.html",
        "return-policy.html",
        "shipping-policy.html",
        "refund-policy.html",
        "css/styles.css",
        "js/script.js",
        "assets/favicon.png",
        "assets/hero-action.jpg",
        "assets/grodt-logo-nav.png",
    ]
    for rel in required:
        if not (PUBLIC / rel).exists():
            err(f"Missing required file: public/{rel}")

    index = (PUBLIC / "index.html").read_text(encoding="utf-8")
    for needle in [
        'rel="canonical"',
        'property="og:image"',
        'name="twitter:card"',
        'application/ld+json',
        'class="skip-link"',
        'assets/hero-action.jpg',
        'assets/favicon.png',
    ]:
        if needle not in index:
            err(f"index.html missing SEO/a11y marker: {needle}")

    # No secrets in public files
    secretish = re.compile(r"sk_(live|test)_[A-Za-z0-9]{10,}")
    for path in PUBLIC.rglob("*"):
        if path.is_file() and path.suffix in {".html", ".js", ".css", ".txt", ".xml", ".md"}:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if secretish.search(text):
                err(f"Possible Stripe secret committed in {path.relative_to(ROOT)}")

    # Validate local asset references in HTML/JS
    asset_refs = []
    for path in list(PUBLIC.rglob("*.html")) + list(PUBLIC.rglob("*.js")):
        text = path.read_text(encoding="utf-8")
        for ref in re.findall(r"""(?:src|href)=["']([^"']+)["']""", text):
            if ref.startswith(("http://", "https://", "mailto:", "#", "/api")):
                continue
            clean = ref.split("?")[0].split("#")[0]
            if not clean or clean.endswith("/"):
                continue
            # Root-absolute from public
            if clean.startswith("/"):
                target = PUBLIC / clean.lstrip("/")
            else:
                target = (path.parent / clean).resolve()
            asset_refs.append((path, clean, target))
            if not target.exists():
                err(f"Broken local ref in {path.relative_to(ROOT)}: {ref}")

    # Photo assets should be real JPEGs with .jpg extension
    for jpg in (PUBLIC / "assets").glob("*.jpg"):
        head = jpg.read_bytes()[:3]
        if head != b"\xff\xd8\xff":
            err(f"{jpg.name} does not look like a JPEG")

    # Policy pages linked from homepage footer
    for policy in [
        "privacy-policy.html",
        "terms-of-service.html",
        "return-policy.html",
        "shipping-policy.html",
        "refund-policy.html",
    ]:
        if policy not in index and policy.replace(".html", "") not in index:
            err(f"Homepage does not link to {policy}")

    if "Detroit, Michigan" in index or "Built in Detroit" in index:
        # Story section may mention Detroit; forbid hero-style marketing strings
        hero = index.split('id="story"')[0]
        if "Detroit" in hero:
            err("Detroit reference found outside Our Story section")

    if ERRORS:
        print("SITE CHECK FAILED")
        for item in ERRORS:
            print(f" - {item}")
        return 1

    print(f"Site checks passed ({len(asset_refs)} local refs verified).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
