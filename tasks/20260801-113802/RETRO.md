# Retro: Spike: can src/style.css split into @import partials with byte-identical compiled output

- TASK: 20260801-113802
- BRANCH: master
- REVIEW ROUNDS: 1

## What went well

- A mechanical partition answered the toolchain question without touching the
  hard question. Cutting at depth-0 blank lines at arbitrary quarter points
  isolated "does `@import` survive the loader chain" from "are the surfaces
  contiguous", and only the first needed a build.
- Comparing at the postcss layer instead of the bundle layer. `style-loader`
  inlines CSS into JS, so bundles differ for reasons unrelated to CSS; running
  the project's own postcss config directly produced two files that could
  actually be diffed.
- Normalising before concluding. The raw diff was 210 lines and looked
  alarming; normalising whitespace turned it into proof of the opposite.
- Testing the rejected alternative rather than reasoning about it. One build
  turned "JS-side imports probably cost something" into "+58 KB per bundle".

## What went wrong

- Two attempts to extract the compiled CSS back out of `dist/*.js` with inline
  `node -e` scripts died on shell quoting before the postcss approach replaced
  them. The right move - compile through the project's own config - was also
  the simpler one, and was reachable from the start.
- The +58 KB in the rejected option is not fully attributed. Preflight is not
  duplicated, so it is the partials being emitted near source size, but the
  last of it was left unexplained because the magnitude already decided it.

## What to improve next time

- When a bundler inlines an artifact into JS, do not parse it back out. Re-run
  the transform stage that produced it, using the project's own config. That is
  both easier and a better match for what the question is about.
- Multi-line inline scripts through `nix develop --command node -e` inside fish
  are a quoting trap. Write the script to a file - it is also the artifact the
  spike has to keep anyway.

## Action items

- Candidate lesson: compare compiled output at the stage that produces it, not
  at the bundle that embeds it. Offered to `LESSONS.md` at Finish.
- Candidate lesson: a large whitespace-only diff is a serializer signature, not
  a semantic change; normalise before concluding. Offered to `LESSONS.md` at
  Finish.
- 20260731-212617 resumes at its second Step with the relaxed proof criterion.
