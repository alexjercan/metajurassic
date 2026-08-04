# Make the generated content graph deterministically ordered

- PRIORITY: 35
- TAGS: chore, content, tooling
- KIND: TASK
- ACTIVITY: UNDERSTANDING
- GATES: -
- RESOLUTION: -

## Story

As someone regenerating the content graph, I want `index.json` to come out in a
stable order, so that a one-line content edit produces a one-line diff no matter
which machine ran the script.

## Context

Found while doing `20260729-092352`. `scripts/markdown_to_json.py` builds its
dicts by iterating `os.listdir`, which returns directory order - arbitrary, and
different across filesystems and after any file churn. The committed
`index.json` happens to be in one such order today.

Sorting was tried in that task and immediately reverted: it reshuffled the whole
file, turning a 150-line content repair into a 1886-line diff that nobody could
review. The reorder is worth doing, but it has to land as its own change whose
diff is ONLY the reorder.

## Steps

- [ ] Sort species and clade ids in `load_directory` (and confirm
      `json_to_markdown.py` needs no matching change).
- [ ] Regenerate `src/jurassic/index.json`; the diff must be a pure reorder -
      verify with a content-equality check, not by eye.
- [ ] Confirm `test/contentSource.test.ts` still passes (it compares
      structurally, so order is not supposed to matter to it).

## Definition of Done

- Regenerating twice from a clean tree produces no diff. (cmd: `python scripts/markdown_to_json.py && git diff --exit-code src/jurassic/index.json`)
- The landing diff changes no field value, only key order. (cmd: `npx jest test/contentSource.test.ts`)
- `npm run ci` passes. (cmd: `npm run ci`)
