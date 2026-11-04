# CASP: An Evaluation Dataset for Formal Verification of C Code
(authored by agents unless marked 🧑)
Tag: `hertzberg2025casp`, [paper](https://doi.org/10.1007/978-3-032-07132-3_5)

casp = 506 pairs of C code + ACSL contract, each checked by Frama-C
- mined from The Stack v1 + v2 (deduplicated C files)
- pair = self-contained function + spec, usable for spec-to-code and code-to-spec
- every pair manually inspected after verification
mining pipeline
- regex for ACSL-like markers: 14,525 → 5,916 → 2,958 files (Table 3)
- keep "minimally complete" files, only std-lib dependencies: 1,180 files
- regex is candidate discovery only, cannot show a spec is valid
  - for Verus: filter by parseability, compilability, no unresolved crates, deterministic verifier run
- paper's own dataset size numbers (section 3.1 vs Table 1 vs Table 3) are inconsistent
checker-backed LLM repair
- Frama-C WP + RTE, Z3/Alt-Ergo/CVC4, 60s per goal
- Gemini 2.0 Flash gets failing file + failed goals, ≤7 iterations
  - prompt: do not alter the code unless absolutely necessary, minimal changes, output intended behavior
- 292/1,180 verify unchanged, 177/888 failing files repaired (19.9%)
  - paper: repair is hard even for advanced LLMs
- caveat: repair can weaken a contract to pass, so spec adequacy needs a separate check
pair extraction
- keep functions with no in-file function dependency, not main, longer than 1 line
- regex pipeline ∪ Gemini pipeline → 513 pairs → rerun Frama-C, manual fix, dedupe → 506
- Verus analogue: smallest compilable module, keep ghost/spec dependencies or the task gets too easy
contamination check
- embed verified files with CodexEmbed, t-SNE + nearest neighbor
- only ~35 casp files very similar to files in other datasets
trusted / not shown
- not shown: contracts capture programmer intent, all UB modeled, usefulness on production code
- trusted: Frama-C, SMT solvers, Gemini edits, manual inspection, extraction scripts
