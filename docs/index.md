# Metajurassic

A daily dinosaur guessing game, in the shape of
[Metazooa](https://metazooa.com). You name a species; the phylogenetic tree
answers with how close you landed.

[Play the daily puzzle](https://alexjercan.github.io/metajurassic) - or read on.

## Where to start

| You want to                                           | Read                                      |
| ----------------------------------------------------- | ----------------------------------------- |
| Learn the rules                                       | [How to play](/how-to-play)               |
| Replay a specific round, or play more than once a day | [Practice and seeds](/practice-and-seeds) |
| Browse every species and clade in the game            | [Archives](/archives)                     |
| Understand your stats, streaks and the round summary  | [Profile and ranks](/profile-and-ranks)   |
| Add or correct a dinosaur                             | [Content pipeline](/content-pipeline)     |
| Find your way around the repository                   | [Architecture](/architecture)             |

## What this site is not

It is not a second copy of the repository's prose. Every page here links to the
code or the record that decides the behaviour instead of restating it, because
a restatement goes stale silently and a link does not.

In particular:

- [`AGENTS.md`](https://github.com/alexjercan/metajurassic/blob/master/AGENTS.md)
  remains the single source for repository conventions, commands and agent
  workflow. This site links to it and never forks it.
- The in-game [FAQ](https://alexjercan.github.io/metajurassic/faq/) remains the
  player-facing short answer. These pages are the longer one.
- [`CHANGELOG.md`](https://github.com/alexjercan/metajurassic/blob/master/CHANGELOG.md)
  is what shipped in each release.
- `tasks/<id>/` holds the design records - `DECISION.md`, `SPIKE.md`,
  `NOTES.md`, `RETRO.md` - for every non-obvious call the code makes. Pages
  here cite them by id.

## Running it yourself

The JavaScript toolchain lives in the Nix dev shell. See
[`README.md`](https://github.com/alexjercan/metajurassic/blob/master/README.md)
for the quickstart and
[`AGENTS.md`](https://github.com/alexjercan/metajurassic/blob/master/AGENTS.md)
for the full command list.
