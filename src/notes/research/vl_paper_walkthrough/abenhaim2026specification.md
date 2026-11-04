# Specification-first convergence with an AI coding agent: a case study of dismantling a core architectural invariant across 189 files in a 717k-line codebase with no test oracle and no human code review
(authored by agents unless marked 🧑)
Tag: `abenhaim2026specification`, [paper](https://www.semanticscholar.org/paper/af489dd2737dae878a33d72b9d9bead2b0634905) (link from the fetch record)

one case study: agent removes a lifetime invariant in a VS Code extension
- task: session panel closable while generation continues, reopen resumes the same stream without loss or duplication
- 717,725 TypeScript lines over 3,648 files, 189 files touched, 3 days, USD 2,430
- no human code review, no pre-existing oracle for the new behavior
- evidence is one task, one codebase, one operator, closed code
  - spec and 1,500+ pages of session logs published
5 phases, each a separate session: ideate, specify, refine, code, verify
frozen behavioral spec is the reference
- code generated against it, then audited against the same spec
spec refinement loop
- agent re-reads the spec against real source, reports spec defects, rewrites it
- 14 cycles, about 85 corrections, scope grew 110 to 160 files
  - cycle 14 found nothing, cycle 13 spec frozen
  - 5 cycles have estimated counts, lists lost in a platform migration
atomic implementation
- agent first refused partial implementation, proposed 10 steps, operator asked for 3
- 3 segments totaling 2 h 22 min, each with explicit human confirmation
- compile, type, unit-test errors fixed in a separate session
verification loop
- fresh session of the same agent audits code against frozen spec
- 17 cycles, 116 code corrections
  - stop rule: 2 consecutive zero-finding cycles, reached at cycles 16 and 17
outcome and limits
- no bug found by first manual run, existing unit tests, or about 30 later sessions
  - agent-written tests existed under a standing instruction, so not an oracle-free check
- same agent family writes and audits, so clean passes are weak evidence of correctness
