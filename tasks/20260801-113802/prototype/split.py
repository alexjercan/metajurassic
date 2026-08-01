#!/usr/bin/env python3
"""Mechanically split src/style.css into N @import partials at depth-0 line
boundaries, preserving file order exactly. Evidence for spike 20260801-113802:
does an import-partial split survive webpack + @tailwindcss/postcss byte-for-byte?

Usage: python3 split.py <n_parts>
Writes src/partials/part-NN.css and rewrites src/style.css.
Run `git checkout src/style.css && rm -rf src/partials` to undo.
"""
import os
import sys

SRC = "src/style.css"
OUT = "src/partials"

n_parts = int(sys.argv[1]) if len(sys.argv) > 1 else 4
lines = open(SRC).read().splitlines(keepends=True)

# Header: the @tailwind directives, kept in style.css.
header_end = 0
for i, line in enumerate(lines):
    if line.startswith("@tailwind"):
        header_end = i + 1
header = lines[:header_end]
body = lines[header_end:]

# Depth-0 line indices: safe to cut before, and not inside a comment.
depth = 0
in_comment = False
safe = []
for i, line in enumerate(body):
    if depth == 0 and not in_comment and line.strip() == "":
        safe.append(i)
    j = 0
    while j < len(line):
        if in_comment:
            if line.startswith("*/", j):
                in_comment = False
                j += 2
                continue
        elif line.startswith("/*", j):
            in_comment = True
            j += 2
            continue
        elif line[j] == "{":
            depth += 1
        elif line[j] == "}":
            depth -= 1
        j += 1

target = len(body) / n_parts
cuts = []
for k in range(1, n_parts):
    want = target * k
    cuts.append(min(safe, key=lambda i: abs(i - want)))
cuts = sorted(set(cuts))

bounds = [0] + cuts + [len(body)]
os.makedirs(OUT, exist_ok=True)
names = []
for k in range(len(bounds) - 1):
    name = f"part-{k:02d}.css"
    names.append(name)
    with open(os.path.join(OUT, name), "w") as fh:
        fh.writelines(body[bounds[k] : bounds[k + 1]])

with open(SRC, "w") as fh:
    fh.writelines(header)
    fh.write("\n")
    for name in names:
        fh.write(f'@import "./partials/{name}";\n')

print(f"split {len(body)} body lines into {len(names)} partials at {cuts}")
