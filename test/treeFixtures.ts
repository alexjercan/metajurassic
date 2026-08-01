import { GameData } from "../src/gameData";
import { GameState } from "../src/gameState";
import { Clade, Species } from "../src/types";

// The synthetic tree these fixtures build:
//
//                    CladeA
//                    /    \
//                   v      v
//                 CladeB  CladeC
//                 /  \       \
//                v    v       v
//          Species1  CladeD    CladeE
//                      |        |    \
//                      v        v     v
//                  Species2  Species3  Species4
//
// Lineages:
//   Species1 -> CladeB -> CladeA
//   Species2 -> CladeD -> CladeB -> CladeA
//   Species3 -> CladeE -> CladeC -> CladeA
//   Species4 -> CladeE -> CladeC -> CladeA

export const species: Species[] = [
    {
        id: "species1",
        species: "Species1",
        translation: "",
        clade: "cladeb",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species2",
        species: "Species2",
        translation: "",
        clade: "claded",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species3",
        species: "Species3",
        translation: "",
        clade: "cladee",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
    {
        id: "species4",
        species: "Species4",
        translation: "",
        clade: "cladee",
        period: "",
        size: "",
        weight: "",
        description: "",
    },
];

export const clades: Record<string, Clade> = {
    cladea: {
        id: "cladea",
        name: "CladeA",
        description: "",
    },
    cladeb: {
        id: "cladeb",
        name: "CladeB",
        parent: "cladea",
        description: "",
    },
    cladec: {
        id: "cladec",
        name: "CladeC",
        parent: "cladea",
        description: "",
    },
    claded: {
        id: "claded",
        name: "CladeD",
        parent: "cladeb",
        description: "",
    },
    cladee: {
        id: "cladee",
        name: "CladeE",
        parent: "cladec",
        description: "",
    },
};

export function makeGameData(): GameData {
    return new GameData(species, clades);
}

export function makeState(
    targetId: string,
    guessIds: string[] = [],
    hintCladeIds: string[] = []
): GameState {
    return new GameState(
        makeGameData(),
        targetId,
        new Set(guessIds),
        undefined,
        new Set(hintCladeIds)
    );
}
