import argparse
import json
import os
import re
import sys

DEFAULT_JURASSIC_PATH = os.path.join("src", "jurassic")
DEFAULT_TREE_PATH = "commontree-metajurassic.json"

# A frontmatter value is a plain scalar. Every one of the 150 species `icon`
# fields once held a stringified Python list (`['https://...svg']`) that leaked
# out of the content scraper, and because this script copied frontmatter
# strings straight through, the repr landed in index.json and every card in the
# game rendered a broken <img>.
#
# The fix is to REFUSE, not to sanitize: unwrapping the value here would make
# the generated JSON disagree with the markdown that is the source of truth,
# which hides the authoring bug instead of surfacing it. See
# tasks/20260729-092352/DECISION.md, choice 2.
#
# MIRRORED in TypeScript as `isSerializedCollection` in `src/frontMatter.ts`,
# which the Jest data tests use. The two must accept and reject the same
# values; `scripts/test_content_pipeline.py` and the "recognises the historical
# defect shape" case in `test/contentSource.test.ts` assert the SAME five
# examples on both sides, so loosening one without the other reddens a test
# instead of leaving the pair silently out of step.
COLLECTION_REPR = re.compile(r"^(\[.*\]|\{.*\}|\(.*,.*\))$")


class ContentError(Exception):
    """A defect in the authored markdown that must not reach index.json."""


def validate_attributes(attributes: dict, filepath: str) -> None:
    for key, value in attributes.items():
        # Frontmatter parsing only ever yields strings, but the reverse
        # direction validates records loaded from index.json, where a number,
        # null or a nested object is representable. Refuse those by name rather
        # than letting `.strip()` raise a bare AttributeError traceback.
        if not isinstance(value, str):
            raise ContentError(
                f"{filepath}: frontmatter '{key}' is not a string: "
                f"{value!r} ({type(value).__name__})"
            )
        if COLLECTION_REPR.match(value.strip()):
            raise ContentError(
                f"{filepath}: frontmatter '{key}' is a serialized collection, "
                f"not a scalar: {value}"
            )


def parse_markdown_file(filepath: str) -> dict:
    with open(filepath, "r") as f:
        content = f.read()

    match = re.match(
        r"^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$",
        content,
        re.MULTILINE
    )
    if not match:
        return {
            "description": content.strip(),
        }

    header, body = match.groups()
    attributes = {}
    for line in header.splitlines():
        line = line.strip()
        if not line:
            continue
        if ":" not in line:
            continue
        key, raw_value = line.split(":", 1)
        key = key.strip()
        value = raw_value.strip().strip('"')
        attributes[key] = value

    validate_attributes(attributes, filepath)

    return {**attributes, "description": body.strip()}


def build_tree(data: dict) -> dict:
    clades = data["clades"]
    species = data["species"]

    # Build a node for every clade, keyed by clade ID (filename).
    nodes: dict[str, dict] = {}
    for clade_id, clade in clades.items():
        nodes[clade_id] = {
            "scientific": clade["clade"],
            "name": clade["clade"],
            "children": [],
        }

    # Attach each clade node under its parent clade.
    root = None
    for clade_id, clade in clades.items():
        parent_id = clade.get("parent")
        if parent_id and parent_id in nodes:
            nodes[parent_id]["children"].append(nodes[clade_id])
        elif not parent_id:
            root = nodes[clade_id]

    # Attach each species as a leaf node under its parent clade.
    for _, sp in species.items():
        leaf = {
            "scientific": sp["species"],
            "name": sp["species"],
        }
        parent_clade_id = sp.get("clade", "").lower()
        if parent_clade_id in nodes:
            nodes[parent_clade_id]["children"].append(leaf)

    if root is None:
        raise ValueError("No root clade found (a clade with no parent)")

    return root


def load_directory(path: str) -> dict:
    # Sorted, NOT directory order: index.json key order picks the daily answer
    # (src/gameData.ts), so os.listdir order would re-point every puzzle across
    # machines and after any file churn. Guarded by
    # `test_sorts_ids_regardless_of_creation_order`.
    entries = {}
    for filename in sorted(os.listdir(path)):
        if not filename.endswith(".md"):
            continue
        entries[filename[:-3]] = parse_markdown_file(os.path.join(path, filename))
    return entries


def main(jurassic_path: str, index_path: str, tree_path: str) -> None:
    data = {
        "species": load_directory(os.path.join(jurassic_path, "species")),
        "clades": load_directory(os.path.join(jurassic_path, "clades")),
    }

    tree = build_tree(data)

    # Both files are written only after every markdown file has parsed and
    # validated, so a rejected value leaves the committed index.json untouched
    # rather than half-rewritten.
    with open(index_path, "w") as f:
        json.dump(data, f, indent=4)

    with open(tree_path, "w") as f:
        json.dump(tree, f, indent=4)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate the served content graph from the markdown source"
    )
    parser.add_argument(
        "--jurassic-path",
        default=DEFAULT_JURASSIC_PATH,
        help="content root holding species/ and clades/ (default: src/jurassic)",
    )
    parser.add_argument(
        "--index-path",
        default=None,
        help="output index.json (default: <jurassic-path>/index.json)",
    )
    parser.add_argument(
        "--tree-path",
        default=DEFAULT_TREE_PATH,
        help=f"output common tree json (default: {DEFAULT_TREE_PATH})",
    )
    args = parser.parse_args()

    index_path = args.index_path or os.path.join(args.jurassic_path, "index.json")

    try:
        main(args.jurassic_path, index_path, args.tree_path)
    except ContentError as exc:
        # Exit non-zero and name the offending file, so a defect in the authored
        # frontmatter stops the pipeline instead of being laundered into JSON.
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)
