# Metajurassic

A daily dinosaur guessing game, in the shape of
[Metazooa](https://metazooa.com). Guess a species; the phylogenetic tree shows
how close you landed.

## Quickstart

JS tooling lives in the Nix dev shell (`nix develop`).

```console
npm install
npm run serve      # localhost:8080
npm run build      # production bundle in dist/
```

## Testing

```console
npm test           # Jest unit/integration suite
npm run test:e2e   # Playwright browser suite
npm run ci         # the full gate
```

## More

- [CHANGELOG.md](CHANGELOG.md) - releases and what shipped in each.
- [AGENTS.md](AGENTS.md) - repository map, environment, and workflow.
- [e2e/seed.spec.ts](e2e/seed.spec.ts) - a runnable walkthrough of a fixed
  practice round.
