# Review: Make the coverage gate see untested src modules

- TASK: 20260804-140413
- BRANCH: chore/coverage-gate-src-roots (base `master`)
- WORKTREE: /home/alex/.cache/sprouts/metajurassic/chore/coverage-gate-src-roots

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context general-purpose subagent `a04ee057797d6710d`,
  prompted with task ID, branch/worktree, dimensions and record format only.
- PRIMARY: re-ran the default coverage run and independently re-derived the
  load-bearing claim - 21 measured files, totals 95.39 / 81.83 / 99.31 / 98.22,
  zero `src/game/**` or `src/profile/**` files in the report, 32 suites /
  411 tests. Matches the refreshed `// Current:` comments exactly. Also
  independently confirmed the AGENTS.md comment rule behind finding 1.

### Proofs

| Proof | Result |
|-|-|
| `roots` reaches `src/` (explicit `src/game/**` glob) | green on branch (4 files), red on master (0 files) - discriminates |
| suite discovery unchanged | 32 suites, nothing under `src/` |
| `npm run ci` | exit 0; 411 jest tests, 184 playwright tests |

The reviewer additionally probed the Story directly, beyond the DoD: a
throwaway untested `src/zzzProbe.ts` reports at 0% on the branch and is absent
on master. That is the behaviour the Story asks for. Probe removed; both trees
clean.

The exclusion set was audited rather than assumed: of 47 `src/**/*.ts` files,
21 are measured and the 26 unmeasured are `src/assets.d.ts`, the 11
`src/ui/**` files, `src/types.ts` (interfaces only, emits nothing - absent on
master too), and exactly the 12 modules DECISION.md names. Nothing that was
measured on master is newly excluded.

### Findings

- MINOR - `jest.config.js:5-11`, `jest.config.js:26-33`. The rewritten `roots`
  comment dropped master's `See tasks/20260804-140413/.` pointer, and the new
  negative-glob block restates DECISION.md rationale with no pointer back to
  it. `AGENTS.md:139` lists "Record pointer" as a keep and `AGENTS.md:146` says
  rationale reproducing a `DECISION.md` compacts to one line plus the pointer.
  The exclusion list is this change's stated maintenance surface, so a reader
  hitting a red coverage gate has no path to the decision. Change: add one
  line to the negative-glob group, e.g.
  `// Exclusions decided per module: tasks/20260804-140413/DECISION.md`.
- NIT - `tasks/20260804-140413/TASK.md` close-out, "What and why". Says
  `collectCoverageFrom` "gains four negative globs"; it gains six. The
  miscount is inherited from Step 2 and NOTES.md ("6 entries -> 10"; actually
  6 -> 12). Change: say "six".
- NIT - `jest.config.js:26-27`. `src/game/index.ts` and `src/profile/index.ts`
  are bootstrap entry points sitting under the "DOM components" comment rather
  than the "page entry points" one. Cosmetic; the directory-wide globs are the
  right call per DECISION.md. No change required.

No BLOCKER or MAJOR. Every DoD proof holds as written, the red-green proof
discriminates on the one thing the task changes, and the close-out's evidence
bullets each reproduce.

### Pending user checks

None. The Definition of Done carries no `manual:` proofs.

### Inspection

```
cd /home/alex/.cache/sprouts/metajurassic/chore/coverage-gate-src-roots
git diff master...HEAD
npx jest --coverage --coverageReporters=json-summary --silent
node -e "const s=require('./coverage/coverage-summary.json');console.log(Object.keys(s).length-1, s.total.statements.pct)"
```
