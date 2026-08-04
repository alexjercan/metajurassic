# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-04

### Added

- Daily dinosaur guessing game. One mystery species per day, the same for
  everyone, derived from the calendar rather than from storage.
- Phylogenetic tree feedback. Each guess joins the tree at the clade it shares
  with the answer; the deeper the join, the closer the guess. Guessed nodes are
  coloured on a cold-to-hot closeness scale.
- Info panel. Clicking any node opens details for that species or clade, and
  after each guess it holds the narrowest clade the answer is known to belong
  to. On narrow viewports it waits behind a labelled tab instead of covering
  the tree.
- Guess budget. A fixed number of attempts per round, stated on the board and
  enforced by the round state. Unknown names are rejected without costing an
  attempt.
- Hints. Spending guesses reveals the shallowest unrevealed clade in the
  answer's lineage that meaningfully cuts the remaining field - a way out of a
  lost round, never the answer itself.
- Practice mode with reproducible seeds. A separate page that deals a random
  target as often as you like, kept apart from the daily puzzle in storage,
  stats, and share text. `?seed=N` loads a chosen round; practice rounds resume
  on revisit.
- Species and clades archives. Browsable pages for all 150 species and 108
  clades in the collection, each with its own detail page.
- Profile page. Games played, win rate, current and longest streak, average
  guesses, winning-guess distribution, discovery progress, and a rolling
  average of recent rounds - counted separately for daily and practice.
- Round summary. An end-of-round ladder of the clades your guesses established,
  root-first, each next to the guesses that revealed it, stopping at the
  deepest clade reached.
- Share text. One square per guess in the order played, coloured by closeness,
  plus a bulb per hint bought, with practice rounds labelled as such.
- Daily countdown. The end-of-round screen counts down to the next puzzle at
  local midnight.
- In-board onboarding. A pre-guess brief above the input and a fuller
  how-to-play card in the info panel, so a first-timer can start without
  leaving the board.
- FAQ page covering the daily game, the tree, the info panel, hints, the round
  summary, practice and seeds, sharing, the profile page, and the archives.

[Unreleased]: https://github.com/alexjercan/metajurassic/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/alexjercan/metajurassic/releases/tag/v1.0.0
