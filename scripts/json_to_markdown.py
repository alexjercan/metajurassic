import json
import os

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


def to_markdown(attributes: dict, field_order: list[str]) -> str:
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


if __name__ == "__main__":
    with open(INDEX_JSON_PATH, "r") as f:
        data = json.load(f)

    os.makedirs(SPECIES_PATH, exist_ok=True)
    os.makedirs(CLADES_PATH, exist_ok=True)

    for species_id, species in data["species"].items():
        filepath = os.path.join(SPECIES_PATH, f"{species_id}.md")
        with open(filepath, "w") as f:
            f.write(to_markdown(species, SPECIES_FIELDS))

    for clade_id, clade in data["clades"].items():
        filepath = os.path.join(CLADES_PATH, f"{clade_id}.md")
        with open(filepath, "w") as f:
            f.write(to_markdown(clade, CLADE_FIELDS))
