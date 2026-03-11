import csv
import json
import os
import re


def name_to_id(name: str) -> str:
    """
    change " " to "_", lowercase,
    and if there is anything in between `(` and `)`, remove it.
    """
    name = re.sub(r"\(.*?\)", "", name)
    name = name.strip()
    name = name.replace(" ", "_").lower()
    return name


if __name__ == "__main__":
    with open("species.json", "r") as f:
        species_data = json.load(f)

    species: dict = {}
    with open("species.csv", "r", newline="") as f:
        # NodeName,Translation,Era,InfoContent,MuseumFact
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            node_name, translation, era, info_content, museum_fact = row
            node_id = name_to_id(node_name)

            species[node_id] = {}
            species[node_id]["species"] = node_name
            species[node_id]["translation"] = translation
            species[node_id]["period"] = era
            size, weight = tuple(map(lambda a: a.strip(), info_content.split("/")))
            species[node_id]["size"] = size
            species[node_id]["weight"] = weight

            species[node_id]["description"] = museum_fact

    for data in species_data:
        name = data["genus"]
        lineage = data["lineage"]
        clade = lineage[-1] if lineage else "Unknown"
        species_id = name_to_id(name)
        assert species_id in species, f"{species_id} not found in species.csv"

        species[species_id]["clade"] = name_to_id(clade)

    for species_id, data in species.items():
        with open(os.path.join("src", "jurassic", "species", f"{species_id}.md"), "w") as f:
            f.write("---\n")
            for key in ["species", "translation", "clade", "period", "size", "weight"]:
                f.write(f"{key}: {data[key]}\n")
            f.write("---\n\n")
            f.write(data["description"])

    clades: dict = {}
    with open("clades.csv", "r", newline="") as f:
        # NodeName,-,-,InfoContent,MuseumFact
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            node_name, _, _, info_content, museum_fact = row
            node_id = name_to_id(node_name)

            clades[node_id] = {}
            clades[node_id]["clade"] = node_name
            clades[node_id]["short"] = info_content
            clades[node_id]["description"] = museum_fact

    for data in species_data:
        lineage = data["lineage"]

        for i in range(len(lineage) - 1):
            parent = lineage[i]
            child = lineage[i + 1]

            parent_id = name_to_id(parent)
            child_id = name_to_id(child)

            assert parent_id in clades, f"{parent_id} not found in clades.csv"
            assert child_id in clades, f"{child_id} not found in clades.csv"

            clades[child_id]["parent"] = parent_id

    for clade_id, data in clades.items():
        with open(os.path.join("src", "jurassic", "clades", f"{clade_id}.md"), "w") as f:
            f.write("---\n")
            f.write(f"clade: {data['clade']}\n")
            if "parent" in data:
                f.write(f"parent: {data['parent']}\n")
            f.write("---\n\n")
            f.write(data["description"])
