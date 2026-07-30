import json
import os
import sys

from markdown_to_json import ContentError, validate_attributes

JURASSIC_PATH = os.path.join("src", "jurassic")
CLADES_PATH = os.path.join(JURASSIC_PATH, "clades")
SPECIES_PATH = os.path.join(JURASSIC_PATH, "species")
INDEX_JSON_PATH = os.path.join(JURASSIC_PATH, "index.json")

SPECIES_FIELDS = [
    "species",
    "translation",
    "clade",
    "period",
    "size",
    "weight",
    "image",
    "icon",
]
CLADE_FIELDS = ["clade", "parent", "image"]


def to_markdown(attributes: dict, field_order: list[str], source: str) -> str:
    # Same refusal as the forward direction: this script rewrites the SOURCE OF
    # TRUTH from generated JSON, so laundering a serialized-collection value
    # back into frontmatter would re-author the very defect markdown_to_json.py
    # rejects. Guarding only one direction leaves the loop open.
    validate_attributes(
        {k: v for k, v in attributes.items() if k in field_order}, source
    )

    lines = ["---"]
    for key in field_order:
        if key in attributes:
            lines.append(f"{key}: {attributes[key]}")
    lines.append("---")

    description = attributes.get("description", "")
    if description:
        lines.append("")
        lines.append(description)

    return "\n".join(lines)


def main() -> None:
    with open(INDEX_JSON_PATH, "r") as f:
        data = json.load(f)

    # Render and validate EVERY file before writing any of them, so a rejected
    # value cannot leave the markdown source half-rewritten.
    rendered = {}
    for species_id, species in data["species"].items():
        source = f"index.json species/{species_id}"
        rendered[os.path.join(SPECIES_PATH, f"{species_id}.md")] = to_markdown(
            species, SPECIES_FIELDS, source
        )
    for clade_id, clade in data["clades"].items():
        source = f"index.json clades/{clade_id}"
        rendered[os.path.join(CLADES_PATH, f"{clade_id}.md")] = to_markdown(
            clade, CLADE_FIELDS, source
        )

    os.makedirs(SPECIES_PATH, exist_ok=True)
    os.makedirs(CLADES_PATH, exist_ok=True)

    for filepath, text in rendered.items():
        with open(filepath, "w") as f:
            f.write(text)


if __name__ == "__main__":
    try:
        main()
    except ContentError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)
