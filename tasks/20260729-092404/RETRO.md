# Retro: Repair broken Jurassic media references

- TASK: 20260729-092404
- BRANCH: test/jurassic-data-integrity
- REVIEW ROUNDS: 1 (APPROVE, shared with 20260729-092352)

This task was folded into `20260729-092352` at that task's plan gate and
delivered by the same branch, review round and cycle. The process retro for the
whole cycle - including the repair - is
`tasks/20260729-092352/RETRO.md`; duplicating it here would just make two
records to keep in step.

The one observation specific to this task: the repair turned out to be far
safer than the task record assumed. Its Steps anticipated deciding what to do
about missing images and hunting down malformed references case by case. In
fact the scan showed a uniform defect - 150 icons, each a 1-element list holding
exactly the species' own clade `image` - so the repair was a mechanical unwrap
with a checkable post-condition, and "decide what missing media should look
like" turned out to be moot because no species or clade is missing media at all.
Scanning the data before planning the repair is what collapsed a judgement-heavy
task into a verifiable one.
