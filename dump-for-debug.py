#!/usr/bin/env python3
import os, sys

SKIP_DIRS = {'node_modules', '.git', 'public/assets/thumbnails', 'public/games', 'data'}
SKIP_EXTS = {'.webp', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.mp3', '.mp4', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz'}
MAX_FILE = 500 * 1024  # 500KB cap per file

def should_include(path):
    rel = os.path.relpath(path, '.')
    for skip in SKIP_DIRS:
        if rel.startswith(skip + os.sep) or rel == skip:
            return False
    if any(rel.endswith(ext) for ext in SKIP_EXTS):
        return False
    # Only text-ish files
    name = os.path.basename(rel)
    if '.' not in name:
        return True  # no extension = probably text/config
    ext = os.path.splitext(name)[1].lower()
    good = {'.js', '.mjs', '.css', '.html', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.conf', '.config', '.env', '.example', '.sh', '.py', '.sql'}
    return ext in good or ext == ''

out = []
for root, dirs, files in os.walk('.'):
    # Prune skip dirs
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
    for f in sorted(files):
        path = os.path.join(root, f)
        rel = os.path.relpath(path, '.')
        if not should_include(path):
            continue
        try:
            size = os.path.getsize(path)
            if size > MAX_FILE:
                out.append(f"\n{'='*60}\nFILE: {rel}\nSIZE: {size} bytes (TRUNCATED to first {MAX_FILE})\n{'='*60}\n")
                with open(path, 'r', encoding='utf-8', errors='replace') as fh:
                    out.append(fh.read(MAX_FILE))
            else:
                out.append(f"\n{'='*60}\nFILE: {rel}\n{'='*60}\n")
                with open(path, 'r', encoding='utf-8', errors='replace') as fh:
                    out.append(fh.read())
        except Exception as e:
            out.append(f"\n{'='*60}\nFILE: {rel}\nERROR: {e}\n{'='*60}\n")

with open('strato-dump.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Dumped to strato-dump.txt ({len(''.join(out))} chars)")
print("Upload that file here (or paste chunks if it's huge).")