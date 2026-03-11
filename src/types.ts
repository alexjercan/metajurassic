export interface Species {
    id: string;
    species: string;
    translation: string;
    clade: string;
    period: string;
    size: string;
    weight: string;
    description: string;
}

export interface Clade {
    id: string;
    name: string;
    parent?: string;
    description: string;
}

export interface GuessResult {
    isCorrect: boolean;
    lca: string | null;
}
