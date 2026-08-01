# Make tatr scaffold the only record-creation path, guarded by a pre-commit check

- STATUS: OPEN
- PRIORITY: 38
- TAGS: process,tooling
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As a maintainer creating a task record, I want schema drift refused at write
time, so that copying a grandfathered neighbour cannot teach me a stale shape.

## Problem

Promoted from `LESSONS.md` `open-a-neighbouring-record-before-writing-a-new-one`
(x3): 20260729-182255, 20260730-111003, 20260731-212557. The third time the rule
was FOLLOWED and still failed - the neighbour opened predated the v2 schema
migration. Prose cannot distinguish a canonical sibling from a legacy one.

## Steps

- [ ] Document `tatr scaffold <id> <KIND>` as the only supported way a record is
      created, in the repository `AGENTS.md` and in the skills that write
      records.
- [ ] Add a pre-commit hook that runs `tatr check` on `tasks/`, so a drifted
      record is refused at commit rather than found after it lands.
- [ ] Decide how the hook is installed and whether it is opt-in, and record it.
