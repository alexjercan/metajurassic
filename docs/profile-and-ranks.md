# Profile and ranks

Two different things share this page's name, and they are worth separating up
front:

- The **profile page** is your long-run record: games, streaks, distribution,
  discovery, rolling average.
- The **rank ladder** is the single-round summary card the game shows when a
  round ends.

Everything on both is derived from what is already in this browser's storage.
Nothing is sent anywhere, and there is no account.

## The profile page

[`src/profile/index.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/profile/index.ts)
is the bootstrap;
[`src/profile/statsPanel.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/profile/statsPanel.ts)
renders it.

Daily and practice are computed **separately** and shown on their own tabs, so
practice can never inflate a daily streak.

| Shown                                                 | Computed by                                    |
| ----------------------------------------------------- | ---------------------------------------------- |
| Games played, wins, losses, win rate                  | `computeGameStats`                             |
| Average guesses                                       | `formatAverageGuesses`                         |
| Current and longest streak                            | `calculateStreak`                              |
| Guess distribution over winning rounds                | `renderGuessDistribution`                      |
| Dinosaurs discovered, as a fraction of the collection | `allGuessedDinosaurs` against the species list |
| Rolling average of recent rounds                      | `calculateRollingAverage`                      |

All of the stats functions live in
[`src/gameStats.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/gameStats.ts).

### Where the numbers come from

`loadAllGames` scans storage rather than reading a separate stats blob. It walks
every key, keeps the ones `parseGameStateKey` recognises for the requested mode,
rebuilds a `GameState` from each, and **skips rounds that are not over**. A key
it cannot parse is warned about and skipped, so one corrupt entry cannot empty
the page.

Because the stats are the saved rounds, retention policy is stats policy: see
[Practice and seeds](/practice-and-seeds#storage-and-retention) for why finished
practice rounds are kept on abandon and why they are capped.

Daily rounds are dated from their seed via `seedToDate`, not from a stored
timestamp - the seed _is_ the calendar day. Practice rounds have no calendar
position, so they use their stored `createdAt`.

### Streaks

`calculateStreak` walks wins in date order and counts **calendar days**, through
`calendarDaysBetween`. Subtracting two instants and dividing by 86,400,000 drifts
by an hour whenever the local zone enters or leaves summer time - enough to
round a 23-hour night to zero days and break a streak that spanned it. The
comment at the call site records that as a fixed defect, not a preference.

The Jest suite pins itself to a DST-observing zone (`Europe/Bucharest`, set in
`test/setTimeZone.js`) so this stays covered.

### Rolling average

[`src/rollingAverage.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/rollingAverage.ts)
buckets **wins only** by time scale (`none`, `hourly`, `daily`, `weekly`), then
takes a trailing window over those buckets. The window average is weighted by
each bucket's game count, so a day with six rounds does not count the same as a
day with one. The profile page currently charts practice, daily-bucketed, over a
7-point window;
[`src/profile/rollingAverageChart.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/profile/rollingAverageChart.ts)
draws it.

Weeks start on Monday.

## The round summary

The end-of-round card, built by `buildRankLadder` in
[`src/rankLadder.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/rankLadder.ts)
and rendered by
[`src/ui/ladderCard.ts`](https://github.com/alexjercan/metajurassic/blob/master/src/ui/ladderCard.ts).

It lists the clades your guesses established, **root first**, each row next to
the guesses that revealed it, with each guess carrying the same closeness tier
the board and the share grid used. A guess the tree bucketed under an off-chain
pairwise ancestor rolls up to that clade's nearest ancestor on the chain - which
is provably its join with the answer, i.e. the clade you already saw when you
spent the guess.

Two properties are deliberate:

- It is a pure **read of the board**. It derives from the tree
  `buildGuessTree` already returned rather than re-traversing the species graph,
  so the card cannot disagree with the board it sits next to.
- It **stops at the deepest revealed clade**. No unrevealed rung, no `???` row,
  no remaining-depth number anywhere. Depth-to-target is difficulty information
  the game withholds on purpose; the fork and the call are in
  [`tasks/20260729-182320/DECISION.md`](https://github.com/alexjercan/metajurassic/blob/master/tasks/20260729-182320/DECISION.md).

Each row records **how** its clade came to be on screen - the root, your
guesses, or a hint you bought - which is what makes the card a summary of the
round rather than a picture of the answer.
