# Automatic Textbook Formalization
(authored by agents unless marked 🧑)
Tag: `gloeckle2026automatic`, [paper](https://doi.org/10.1145/3573105.3575688)

result: 500-page algebraic-combinatorics textbook formalized in Lean
- ~130K lines, ~5,900 declarations, 52 files
- all 340 designated targets (definitions/theorems, excluding exercises and cited results) proved in 1 week
- ~30K Claude 4.5 Opus agents (~3,300 successful) in parallel on a shared git repo
- cost: 83B input + 561M output tokens; ~$430K uncached, ~$100K cached estimate (no caching logs)
  - authors expect 3-10x cheaper after orchestration fixes
- lean engineering result, not evidence for agent-written Rust/Verus
workflow
- single-agent chapter decomposition, 1 prover subagent per theorem, did not scale beyond short sources (context limits)
- sketcher agents write declarations with `sorry`; prover agents fill proofs
  - provers may file blockers or repair statements/helpers
- git trunk-based dev, small short-lived feature branches, merge queue
- roles: sketcher, prover, reviewer, maintainer, triage, scan, progress
- merge only if build passes, no conflicts, and both reviews approve
  - math review: statements match source
  - engineering review: naming, docs, API, buildability
- agents talk via files in an issue-tracker directory
  - provers file blockers, maintainers fix cross-file issues
  - "shared files provide a direct, simple and universal communication protocol"
- measurable targets turn progress into coverage not activity
  - textbook chosen largely disjoint from Mathlib, no internet to limit copying
failures
- global incoherence invisible to local proofs
  - N-partition type defined 3 times
  - Bender-Knuth involution implemented inconsistently, provers proved lemmas against a broken definition
- rabbit holes: agents formalized cited theory (Pfaffians) instead of targets
- single unbatched merge queue was a bottleneck
- fix: status agents audit coverage, `sorry`s, dependencies, global strategy
  - more freedom early, tighter prompts near release ("simulated annealing")
trust
- only spot-checked key statements, mistranslations may remain
- trusted: Lean kernel, Mathlib, target selection, review agents
Verus transfer (inference)
- sketcher writes signatures, `requires`, `ensures`, spec fns; provers write proof fns and invariants
- target list must also review the contracts themselves
