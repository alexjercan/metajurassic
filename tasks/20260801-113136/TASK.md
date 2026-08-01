# Name the home for shipped-data claims in AGENTS.md

- STATUS: OPEN
- PRIORITY: 34
- TAGS: docs,process
- KIND: TASK
- FLOW STEP: BACKLOG
- PLAN STATUS: DRAFT

## Story

As someone writing a test that claims something holds for the SHIPPED data, I
want one obvious file to put it in, so that the rule is a place rather than
something to remember.

## Problem

Promoted from `LESSONS.md`
`mock-fixtures-hide-real-data-defects-test-the-real-payload` (x3):
20260729-092352, 20260729-101740. `AGENTS.md` already states the rule as prose
and it recurred anyway. The ledger's proposal is to name the destination.

## Steps

- [ ] Name `test/dataIntegrity.test.ts` in `AGENTS.md` as THE home for any
      "holds for the shipped content graph" claim, next to the existing rule.
- [ ] Check the suites that already make such a claim against the real payload
      (`closeness`, `share`, `hintRule`, `seedMode`, `contentSource`) and decide
      whether each belongs there or is correctly separate; record the reason.
