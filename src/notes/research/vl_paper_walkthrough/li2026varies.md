# VARIES: Verification Harness Synthesis and Efficient Scheduling for Unsoundness Detection in Rust Libraries
(authored by agents unless marked 🧑)
Tag: `li2026varies`, [paper](https://doi.org/10.1145/3832783.3837450)

bounded model checking (Kani) for Rust unsoundness; synthesize harnesses and schedule them together
- targets public safe APIs that encapsulate unsafe code (EUs)
- goal is bug finding within a budget, not proving soundness; backend-agnostic in principle
API dependency graph gives seed harnesses
- nodes = APIs and concrete types after trait resolution and monomorphization
- edges = construction, usage, mutation dependencies
- resolve each target argument backward to constructors; keep minimal call sequences
  - dedupe by ordered API ids, rank toward fewer construction steps and rarer APIs
  - unconstructed inputs become symbolic
mutator injection finds state-dependent bugs
- seeds miss bugs needing prior state changes (example: unsound `get` fails only after `push`)
- insert public `&mut` APIs after the constructor, up to 3 rounds, with per-round quotas 64/32/16
- results form a derivation DAG (paper calls it a tree)
feedback-driven scheduling
- verify parents before children, record outcome, time, covered/uncovered blocks
- failure pruning: drop descendants of failed or timed-out harnesses
- coverage pruning: keep a branch only if it adds new covered blocks and leaves uncovered ones
  - force-retain children if uncovered/covered ratio > tau_R
  - trades recall for cost; can suppress a descendant that reaches covered blocks under a new state
- score pruning: score = (alpha*new coverage + beta*never-reached blocks)/time, keep top-k siblings
  - thresholds are heuristic
results on 20 libraries (1,435 to 127,759 LOC)
- VARIES: 46 positives, 15 true positives, 1,834 CPU-min
- Autoharness: 187 positives, 17 TP, 1,262 min; RuMono: 979 positives, 6 TP, 33,160 min; Safe4U: 9 positives, 3 TP
- VARIES finds a TP in 5 libraries, RuMono 4, Autoharness 3, Safe4U 2
- misses infinite-loop and out-of-memory bugs (bounded unrolling)
ablation
- no derivation: harnesses 13,814 -> 1,714, TP 15 -> 11
- no pruning: time 1,834 -> ~2,000 min, TP 19 (one extra index-out-of-bounds bug pruned by default)
wild deployment
- 217 crates after filtering (ranks 2,001 to 15,000), 118 completed, ~29.9 min per crate
- 18 warnings, 10 confirmed new unsoundness (Miri or sanitizer replay), 6 acknowledged
- false positives: Kani concurrency gaps, CBMC memset precondition model, skipped syscalls
Verus takeaways
- dependency-graph call sequences as exploration or smoke-test callers, not proofs
- pruning policy lives in orchestration code, not in Verus
