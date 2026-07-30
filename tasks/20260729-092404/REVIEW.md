# Review: Repair broken Jurassic media references

- TASK: 20260729-092404
- BRANCH: test/jurassic-data-integrity

This task was delivered by the same branch and the same review cycle as
`20260729-092352`, which folded it in at the plan gate. The round-1
out-of-context reviewer was given BOTH task ids and ran both Definitions of
Done, including this task's own proof
(`rg -n "icon.*\[|\['https?://" src/jurassic/index.json src/jurassic/species src/jurassic/clades`,
no output) and the browser route tests.

## Round 1

- VERDICT: APPROVE
- REVIEWER: out-of-context

The findings and their responses live in `tasks/20260729-092352/REVIEW.md`;
none of the six was specific to this task's repair. The mutation test most
relevant here: re-wrapping all 150 `index.json` icons as lists makes the
formerly-`test.fixme` species-icon assertion in `e2e/images.spec.ts` fail on the
real rendered `src`, so the repair is pinned by something that can actually go
red.

Pending user checks: none - this task has no `manual:` DoD item.
