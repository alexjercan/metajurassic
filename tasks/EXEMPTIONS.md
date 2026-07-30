# Historical schema exemptions

`tatr check` validates every task record against the v2 schema. The records
below were written before the rule they now trip, and the flow trail is
append-only history: a task record is not rewritten to satisfy a rule
invented after it landed. Each line classifies one such record:
48 lines over 24 of this repository's 42 tasks.

Format, one exemption per line:

```
- <task-id> <rule>: <why this record is exempt>
```

An entry suppresses that rule for that task only. An entry that never fires
is reported as `unused-exemption` on a full `tatr check`, so the list cannot
rot: when a record is legitimately rewritten, its exemption must go with it.

Every entry here is on a CLOSED task. New work does not get exemptions:
scaffold the record with `tatr scaffold <id> <RECORD>` and it is schema-clean
from the first byte.

## Records that predate the v2 record schema

These carry the same facts in the shape the tooling asked for at the time:
free-form headings, a single verdict line, no reviewer or task pointer.

- 20260331-154614 bad-record-schema: RETRO/REVIEW/TASK predate the v2 record schema
- 20260331-154614 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-092239 bad-record-schema: RETRO predates the v2 record schema
- 20260729-092258 bad-record-schema: DECISION predates the v2 record schema
- 20260729-092315 bad-record-schema: DECISION predates the v2 record schema
- 20260729-092327 bad-record-schema: DECISION predates the v2 record schema
- 20260729-092339 bad-record-schema: DECISION/REVIEW predate the v2 record schema
- 20260729-092339 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-092352 bad-record-schema: DECISION predates the v2 record schema
- 20260729-092404 bad-record-schema: RETRO predates the v2 record schema
- 20260729-092419 bad-record-schema: DECISION/RETRO/REVIEW predate the v2 record schema
- 20260729-092419 bad-verdict: REVIEW.md predates the per-round VERDICT line
- 20260729-092419 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-092435 bad-record-schema: DECISION/RETRO predate the v2 record schema
- 20260729-092435 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-092435 bad-verdict: REVIEW.md predates the per-round VERDICT line
- 20260729-092435 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-092504 bad-record-schema: RETRO/REVIEW predate the v2 record schema
- 20260729-092504 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-101740 bad-record-schema: DECISION/RETRO/REVIEW predate the v2 record schema
- 20260729-101740 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-101740 bad-verdict: REVIEW.md predates the per-round VERDICT line
- 20260729-101740 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-101744 bad-record-schema: RETRO/REVIEW predate the v2 record schema
- 20260729-101744 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-101747 bad-record-schema: DECISION/RETRO/REVIEW predate the v2 record schema
- 20260729-101747 bad-verdict: REVIEW.md predates the per-round VERDICT line
- 20260729-101747 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-101754 bad-record-schema: DECISION/RETRO/REVIEW predate the v2 record schema
- 20260729-101754 bad-verdict: REVIEW.md predates the per-round VERDICT line
- 20260729-101754 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-101819 bad-record-schema: DECISION/RETRO/REVIEW predate the v2 record schema
- 20260729-101819 bad-verdict: REVIEW.md predates the per-round VERDICT line
- 20260729-101819 missing-reviewer: REVIEW.md predates the REVIEWER field
- 20260729-101823 bad-record-schema: DECISION predates the v2 record schema
- 20260729-122943 bad-record-schema: DECISION predates the v2 record schema
- 20260729-130138 bad-record-schema: DECISION predates the v2 record schema
- 20260729-141414 bad-record-schema: DECISION/RETRO predate the v2 record schema
- 20260729-141424 bad-record-schema: DECISION/RETRO/REVIEW predate the v2 record schema
- 20260729-141424 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-160500 bad-record-schema: RETRO/REVIEW/SPIKE predate the v2 record schema
- 20260729-160500 bad-review-round: REVIEW.md predates the '## Round <n>' structure
- 20260729-160500 bad-spike-status: SPIKE.md STATUS predates the RECOMMENDED|INCONCLUSIVE|DROPPED vocabulary
- 20260729-182255 bad-record-schema: DECISION/RETRO predate the v2 record schema
- 20260730-111003 bad-record-schema: DECISION/RETRO predate the v2 record schema

## Definition-of-Done proofs written before the parenthesized notation

The proof kind was written as a `- cmd:` / `- manual:` prefix, or the item
named no proof at all, before `(cmd: ...)` became the parsed form.

- 20260729-092327 bad-proof-syntax: DoD predates the parenthesized (test:/cmd:/manual:) proof notation
- 20260729-092504 bad-proof-syntax: DoD predates the parenthesized (test:/cmd:/manual:) proof notation
- 20260729-130138 bad-proof-syntax: DoD predates the parenthesized (test:/cmd:/manual:) proof notation
