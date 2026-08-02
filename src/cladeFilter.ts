import { GameData } from "./gameData";
import { Species } from "./types";

/** One entry in the archive's clade filter: its id, display name, and member count. */
export interface CladeFilterOption {
    id: string;
    name: string;
    count: number;
}

/**
 * The species that belong to `cladeId`, at any depth below it.
 *
 * Membership is lineage-aware: a species whose immediate clade is Ceratopsidae
 * is a member of Cerapoda. Comparing against `species.clade` alone would only
 * ever match leaf-adjacent clades. Returns `[]` for an unknown id.
 */
export function speciesInClade(data: GameData, cladeId: string): Species[] {
    const target = cladeId.toLowerCase();
    if (!data.findCladeById(target)) return [];

    return data.species.filter((s) => data.lineage(s.clade).includes(target));
}

/**
 * Every clade in the graph as a filter option, sorted by display name.
 *
 * Alphabetical because the player arrives already knowing the NAME - off a hint
 * or a card - so a known-name lookup is the entry path, not browsing the
 * hierarchy (`tasks/20260729-141425/DECISION.md`).
 */
export function cladeFilterOptions(data: GameData): CladeFilterOption[] {
    return Object.values(data.clades)
        .map((clade) => ({
            id: clade.id,
            name: clade.name,
            count: speciesInClade(data, clade.id).length,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
