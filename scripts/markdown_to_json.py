import json
import os
import re

JURASSIC_PATH = os.path.join("src", "jurassic")
CLADES_PATH = os.path.join(JURASSIC_PATH, "clades")
SPECIES_PATH = os.path.join(JURASSIC_PATH, "species")
INDEX_JSON_PATH = os.path.join(JURASSIC_PATH, "index.json")


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


if __name__ == "__main__":
    species_files = [f for f in os.listdir(SPECIES_PATH) if f.endswith(".md")]
    clades_files = [f for f in os.listdir(CLADES_PATH) if f.endswith(".md")]

    species_data = {}
    for filename in species_files:
        filepath = os.path.join(SPECIES_PATH, filename)
        species_id = filename[:-3]
        species_data[species_id] = parse_markdown_file(filepath)

    clades_data = {}
    for filename in clades_files:
        filepath = os.path.join(CLADES_PATH, filename)
        clade_id = filename[:-3]
        clades_data[clade_id] = parse_markdown_file(filepath)

    data = {
        "species": species_data,
        "clades": clades_data,
    }

    with open(INDEX_JSON_PATH, "w") as f:
        json.dump(data, f, indent=4)

    tree = build_tree(data)
    with open("commontree-metajurassic.json", "w") as f:
        json.dump(tree, f, indent=4)
