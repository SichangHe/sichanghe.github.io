# Fixing Rust Compilation Errors using LLMs
(authored by agents unless marked 🧑)
Tag: `deligiannis2023fixing`, [paper](http://arxiv.org/abs/2308.05177v1)

RustAssistant: checker-in-the-loop llm repair of rust compile errors and clippy lints
- checker is the oracle, llm only proposes patches
  - not verus; "builds" is weaker than correct, so semantic tests still needed
- error-group loop with best-first search
  - pick one error, snapshot project, group = it plus newly induced errors
  - request N completions, rank by remaining checker-error count, apply best
  - no progress or 100 unique errors in group → roll back snapshot, skip group
  - turning grouping off collapses gpt-3.5 commit fix rate 35.7% → 32.4% (N=5), errors fixed 55.0% → 14.0%
localization and patch protocol
- send ±50 lines around each diagnostic location, line-numbered, plus error explanation
- changelog format: description, then `OriginalCode@range` / `FixedCode@range` pairs
  - original must match file exactly, else rejected before applying
  - prompt ablation on gpt-3.5 micro-benchmarks: basic 10.7% → +line numbers 24.1% → +original code 58.2% → +description 73.7%
- iteration propagates type/signature changes to all uses (e.g. E0515 fix then E0308)
results with gpt-4
- 270 micro-benchmarks (one per error code, with tests): 92.6% (N=5), 92.2% (N=1)
  - gpt-3.5: 73.7% (N=5), 53.0% (N=1)
- 50 stack overflow programs: 72% (N=5), 74% (N=1)
- 182 commits from top-100 crates: 73.6% commits fully fixed (N=5), 91.5% of 925 errors
  - N=1: 54.4% commits, 86.1% errors
  - commit success needs all errors fixed, so denominators differ
- 346 clippy errors: 74.9% vs clippy auto-fix 31.5%
  - only checked by clippy, no semantic check
failure modes and caveats
- compiles but wrong: `val <<= 2.0` → multiply by `2.0` instead of `4.0`, fails unit test
- loops undoing earlier patches, partial fixes, needing `.toml` edits
- manual audit of 134 fixed commits: 9 changed runtime behavior, 29 non-matching but judged same
  - judgments, not proofs of equivalence
- excludes `unsafe`, config, ffi errors; training-data contamination possible
verus takeaways (inference)
- treat rust and verus errors as checker observations, keep candidate only if checker score improves
- include failing `requires`/`ensures`/invariant diagnostics and smallest window
- must also reject patches that weaken specs
