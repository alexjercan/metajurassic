import { Clade, Species } from "./types";
import { GameData } from "./gameData";

type WebpackContext = {
    keys: () => string[];
    (id: string): string;
};

type WebpackRequire = typeof require & {
    context: (
        path: string,
        recursive?: boolean,
        regExp?: RegExp
    ) => WebpackContext;
};

const parseFrontMatter = (text: string) => {
    const match =
        /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/m.exec(text);
    if (!match) {
        return {
            attributes: {} as Record<string, string>,
            body: text.trim(),
        };
    }

    const [, header, body] = match;
    const attributes: Record<string, string> = {};

    header
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const idx = line.indexOf(":");
            if (idx === -1) return;
            const key = line.slice(0, idx).trim();
            const rawValue = line.slice(idx + 1).trim();
            const value = rawValue.replace(/^"|"$/g, "");
            attributes[key] = value;
        });

    return { attributes, body: body.trim() };
};

const loadMarkdown = async <T>(
    context: WebpackContext,
    map: (attrs: Record<string, string>, body: string, id: string) => T
): Promise<T[]> => {
    const files = context.keys();
    const results = await Promise.all(
        files.map(async (key) => {
            const url = context(key);
            const response = await fetch(url);
            const text = await response.text();
            const { attributes, body } = parseFrontMatter(text);
            const id = key.replace(/^\.\//, "").replace(/\.md$/, "");
            return map(attributes, body, id);
        })
    );

    return results;
};

export async function loadGameData(): Promise<GameData> {
    const req = require as WebpackRequire;

    const speciesContext: WebpackContext = req.context(
        "./jurassic/species",
        false,
        /\.md$/
    );
    const cladesContext: WebpackContext = req.context(
        "./jurassic/clades",
        false,
        /\.md$/
    );

    const species = await loadMarkdown<Species>(
        speciesContext,
        (attrs, body, id) => ({
            id,
            species: attrs.species || "",
            translation: attrs.translation || "",
            clade: attrs.clade || "",
            period: attrs.period || "",
            size: attrs.size || "",
            weight: attrs.weight || "",
            description: body,
            image: attrs.image || undefined,
            icon: attrs.icon || undefined,
        })
    );

    const clades = await loadMarkdown<Clade>(
        cladesContext,
        (attrs, body, id) => ({
            id: id,
            name: attrs.clade || "",
            parent: attrs.parent ? attrs.parent.toLowerCase() : undefined,
            description: body,
            image: attrs.image || undefined,
        })
    );

    const cladesMap = clades.reduce(
        (map, clade) => {
            map[clade.name.toLowerCase()] = clade;
            return map;
        },
        {} as Record<string, Clade>
    );

    return new GameData(species, cladesMap);
}
