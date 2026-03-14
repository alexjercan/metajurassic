""" Python Tool script that uses https://dinosaurpictures.org/*-pictures to download pictures of dinosaurs. """

import json
import os
from typing import Optional

import bs4
import requests
from rich.progress import track

DINOSAUR_PICTURES_URL = "https://dinosaurpictures.org/{dinosaur_name}-pictures"

JURASSIC_PATH = os.path.join("src", "jurassic")
CLADES_PATH = os.path.join(JURASSIC_PATH, "clades")
SPECIES_PATH = os.path.join(JURASSIC_PATH, "species")
INDEX_JSON_PATH = os.path.join(JURASSIC_PATH, "index.json")


def download_dinosaur_pictures(dinosaur_name: str) -> Optional[str]:
    url = DINOSAUR_PICTURES_URL.format(dinosaur_name=dinosaur_name)
    response = requests.get(url)
    response.raise_for_status()

    text = response.text
    soup = bs4.BeautifulSoup(text, "html.parser")
    images = soup.find_all("img", {"title": dinosaur_name})
    for image in images:
        parent = image.parent
        if parent.name == "a":
            href = parent.get("href")
            if href is not None:
                return href

    return None


if __name__ == "__main__":
    with open(INDEX_JSON_PATH, "r") as f:
        data = json.load(f)

    for species, info in track(data["species"].items()):
        image_url = download_dinosaur_pictures(info["species"])
        if image_url is not None:
            info["image"] = image_url
        else:
            print(f"Could not find image for {species}.")

    with open(INDEX_JSON_PATH, "w") as f:
        json.dump(data, f, indent=4)
