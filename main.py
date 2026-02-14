#!/usr/bin/env python3
"""
Metajurassic - Guess the Dinosaur!

A phylogenetic guessing game where the player must identify
a randomly selected dinosaur species using clade feedback.
"""

import argparse
import json
import os
import random
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field, TypeAdapter


class Species(BaseModel):
    """ Represents a dinosaur species with its taxonomic information. """

    id_: str = Field(..., alias="id", description="The unique identifier of the species")
    name: str = Field(..., alias="name", description="The name of the species")
    clade: List[str] = Field(..., alias="clade", description="The clade(s) the species belongs to; from least specific to most general")

    description: str = Field(default="", alias="description", description="A short description of the species")


class Clade(BaseModel):
    """ Represents a clade in the phylogenetic tree. """

    name: str = Field(..., alias="name", description="The name of the clade")
    parent: Optional[str] = Field(default=None, alias="parent", description="The name of the parent clade (None if it's the root)")

    description: str = Field(default="", alias="description", description="A short description of the clade")


def __ensure_data_format(data_path: str) -> Tuple[List[Species], List[Clade]]:
    """ Ensure the dataset is in the correct format.

    Args:
        data_path (str): The path to the dataset directory.
    Returns:
        Tuple[List[Species], List[Clade]]: A tuple containing the list of Species and Clades.
    """

    index_path = os.path.join(data_path, "_index.json")
    if not os.path.exists(index_path):
        raise ValueError(f"Dataset {data_path} is not in the correct format. Missing _index.json.")

    with open(index_path, "r") as f:
        index = json.load(f)

    result = TypeAdapter(List[Species]).validate_python(index)
    clades: List[Clade] = []
    for species in result:
        markdown_path = os.path.join(data_path, "species", f"{species.id_}.md")
        with open(markdown_path, "r") as f:
            species.description = f.read()

        prev_clade: Optional[str] = None
        for clade_name in species.clade:
            if clade_name not in [c.name for c in clades]:
                clade_markdown_path = os.path.join(data_path, "clades", f"{clade_name.lower()}.md")
                if os.path.exists(clade_markdown_path):
                    with open(clade_markdown_path, "r") as f:
                        clade_description = f.read()
                else:
                    clade_description = ""

                clades.append(Clade(name=clade_name, parent=prev_clade, description=clade_description))

            prev_clade = clade_name

    return result, clades


def __compute_clade_tree(species_list: List[Species]) -> Dict[str, Any]:
    """Compute a nested clade tree structure from species list.

    Returns:
        Dict[str, Any]: Nested dictionary representing clade hierarchy.
                        Species are stored under a special "_species" key.
    """

    tree: Dict[str, Any] = {}

    for species in species_list:
        current_level = tree

        for clade_name in species.clade:
            if clade_name not in current_level:
                current_level[clade_name] = {}

            current_level = current_level[clade_name]

        if "_species" not in current_level:
            current_level["_species"] = {}

        current_level["_species"][species.id_] = species

    return tree


def __compute_lca(clade1: List[str], clade2: List[str]) -> Optional[str]:
    """Compute the Lowest Common Ancestor (LCA) of two clade lists.

    Args:
        clade1 (List[str]): The clade list of the first species.
        clade2 (List[str]): The clade list of the second species.

    Returns:
        Optional[str]: The name of the LCA clade, or None if no common clade is found.

    Example:
        clade1 = ["Dinosauria", "Saurischia", "Theropoda"]
        clade2 = ["Dinosauria", "Saurischia", "Theropoda", "Tetanurae"]
        lca = __compute_lca(clade1, clade2)
        print(lca)  # Output: "Theropoda"
    """

    for c1 in clade1[::-1]:
        if c1 in clade2:
            return c1

    return None


class SpeciesNotFoundError(Exception):
    """Custom exception raised when a species is not found in the dataset."""

    pass


class UnexpectedError(Exception):
    """Custom exception raised for any unexpected errors during the game."""

    pass


def __evaluate_guess(
    target: Species,
    guess_input: str,
    clade_tree: Dict[str, Any],
    species_list: List[Species]
) -> Tuple[bool, str]:
    """
    Evaluate a user's guess against the target species.

    This function:
    - Matches the guessed species (case-insensitive)
    - Computes the Lowest Common Ancestor (LCA) between guess and target
      using their ordered clade lists
    - Returns whether the guess is correct and a hint message

    Args:
        target (Species): The randomly selected target species.
        guess_input (str): The raw user input.
        clade_tree (Dict[str, Any]): The computed clade tree (unused here
                                     but kept for future expansion).
        species_list (List[Species]): The list of all species for name matching.

    Returns:
        tuple[bool, str]:
            - bool: True if guess is correct
            - str: The clade name of the LCA or a message if no common clade is found
    """

    # Normalize input
    guess_input = guess_input.strip().lower()

    # Find the guessed species by name (case-insensitive)
    guessed_species = next((s for s in species_list if s.name.lower() == guess_input), None)
    if guessed_species is None:
        raise SpeciesNotFoundError(f"Species '{guess_input}' not found in the dataset.")

    # Check for exact match
    if guessed_species.id_ == target.id_:
        return True, ""

    # Compute LCA
    lca = __compute_lca(target.clade, guessed_species.clade)
    if not lca:
        raise UnexpectedError("No common clade found between target and guess, which should not happen if data is consistent.")

    return False, lca


class Arguments(BaseModel):
    """ Command-line arguments for the Metajurassic game. """

    data: str = Field(default="jurassic", description="The data set to use for the game (default: jurassic)")


def main(args: Arguments):
    """ Main function to run the Metajurassic game. """

    species_list, clade_list = __ensure_data_format(args.data)
    clade_tree = __compute_clade_tree(species_list)
    clade_map = {clade.name: clade for clade in clade_list}

    target = random.choice(species_list)

    print("🎮 Welcome to Metajurassic - Guess the species!")
    print("=" * 80)
    print("I'm thinking of a dinosaur species. Can you guess which one it is?")

    guesses = 0
    max_guesses = 20

    while guesses < max_guesses:
        try:
            guess_input = input("Your guess: ").strip().lower()
        except EOFError:
            print(f"\nGame ended. The answer was: {target.name}")
            exit(0)

        if not guess_input:
            continue

        if guess_input == "quit":
            print(f"\nYou gave up! The answer was: {target.name}")
            exit(0)

        guesses += 1

        is_correct, hint = __evaluate_guess(target, guess_input, clade_tree, species_list)

        if is_correct:
            print(f"🎉 Correct! The species was {target.name}. You guessed it in {guesses} guesses!")
            print(f"Description: {target.description}")
            exit(0)

        print(f"❌ Incorrect guess. Hint: The LCA clade is '{hint}'. Try again!")
        print(f"Description: {clade_map[hint].description}")

    print(f"\nGame over! You've used all {max_guesses} guesses. The correct answer was: {target.name}")
    print(f"Description: {target.description}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Play Metajurassic - Guess the species!"
    )
    parser.add_argument(
        "--data",
        default=os.path.join("src", "jurassic"),
        help="The data set to use for the game (default: src/jurassic)",
    )

    args = parser.parse_args()
    main(Arguments(**vars(args)))
