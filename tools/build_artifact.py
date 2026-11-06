#!/usr/bin/env python3
"""Baut aus index.html eine einzelne HTML-Datei ohne Doctype (Fragment), z. B. zum Teilen als Artifact.

Aufruf: python3 tools/build_artifact.py <ausgabe.html>
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
index = (root / "index.html").read_text(encoding="utf-8")
out = sys.argv[1] if len(sys.argv) > 1 else str(root / "dist" / "oui-chef.html")

fonts = re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts[^>]+>', index)
css = (root / "css" / "game.css").read_text(encoding="utf-8")
scripts = re.findall(r'<script src="(js/[^"]+)"></script>', index)
js = "\n".join(f"<script>\n{(root / s).read_text(encoding='utf-8')}\n</script>" for s in scripts)

html = f"""<title>Oui, Chef!</title>
<meta name="theme-color" content="#12161a">
{chr(10).join(fonts)}
<style>
{css}
</style>
<div id="app"></div>
{js}
"""
Path(out).parent.mkdir(parents=True, exist_ok=True)
Path(out).write_text(html, encoding="utf-8")
print(f"{out}: {len(html) // 1024} KB")
