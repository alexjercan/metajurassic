import argparse
import csv
import json
import os
import sys
from typing import Dict

from markdown_to_json import ContentError, validate_attributes

JURASSIC_PATH = os.path.join("src", "jurassic")
CLADES_PATH = os.path.join(JURASSIC_PATH, "clades")
SPECIES_PATH = os.path.join(JURASSIC_PATH, "species")
INDEX_JSON_PATH = os.path.join(JURASSIC_PATH, "index.json")

CSV_FIELDS = [
    "NodeName",
    "Translation",
    "Era",
    "InfoContent",
    "MuseumFact",
]


def read_csv_data(csv_path: str) -> Dict[str, Dict[str, str]]:
    data = {}

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            node_name = row["NodeName"].strip().lower().replace(" ", "_")
            data[node_name] = {
                "name": row["NodeName"],
                "translation": row["Translation"],
                "era": row["Era"],
                "info_content": row["InfoContent"],
                "museum_fact": row["MuseumFact"],
            }

    return data


def merge_csv(csv_path: str) -> None:
    csv_data = read_csv_data(csv_path)
    with open(INDEX_JSON_PATH, "r") as f:
        data = json.load(f)

    for species_id, species in data["species"].items():
        new_data = csv_data.get(species_id)
        if new_data:
            species["species"] = new_data["name"]
            species["translation"] = new_data["translation"]
            species["period"] = new_data["era"]
            species_size, species_weight = tuple(map(str.strip, new_data["info_content"].split("/")))
            species["size"] = species_size
            species["weight"] = species_weight
            species["description"] = new_data["museum_fact"]

    for clade_id, clade in data["clades"].items():
        new_data = csv_data.get(clade_id)
        if new_data:
            clade["clade"] = new_data["name"]
            clade["description"] = new_data["museum_fact"]

    # This script is the THIRD pipeline entry point, and the only one that
    # writes index.json without going through the markdown source, so an
    # unguarded merge could both launder a defect and leave the payload out of
    # step with the files it is generated from. Same refusal as the other two,
    # applied before anything is written: a bad CSV cell stops the merge rather
    # than landing in the served graph. Re-run markdown_to_json.py afterwards
    # (or json_to_markdown.py first) to keep source and payload in step.
    for species_id, species in data["species"].items():
        validate_attributes(species, f"index.json species/{species_id}")
    for clade_id, clade in data["clades"].items():
        validate_attributes(clade, f"index.json clades/{clade_id}")

    with open(INDEX_JSON_PATH, "w") as f:
        json.dump(data, f, indent=4)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge a data CSV into index.json")
    parser.add_argument("csv_file", help="Path to the input CSV file")
    args = parser.parse_args()

    try:
        merge_csv(args.csv_file)
    except ContentError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)
