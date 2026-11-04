# Finding a Crab in the C: Assured Translation via Comparative Symbolic Execution
(authored by agents unless marked 🧑)
Tag: `helbling2026finding`, [paper](https://arxiv.org/abs/2605.12731v1)

cozy compares C and Rust translations as binaries via comparative symbolic execution
- claim: developer classifies each flagged difference as intentional or erroneous, outside them binaries are formally equivalent
- differential assurance, not memory-safety proof, bounded by explored paths (inference)
- fits human or agent c-to-rust translation where intentional bug fixes break literal equivalence
algorithm
- run both binaries in angr on the same symbolic input, pair terminal states
- pair is compatible iff `is_sat(s.constraints ∧ s'.constraints)`
- compare memory by `is_sat(... ∧ v ≠ v')`, compare instruction/memory/io event streams by git-style diff
- concrete inputs satisfying the joint constraints reproduce each difference
unsat-core memoization prunes the n² pair checks
- cache core on conflict, skip solver if a cached core is a subset of new constraints
- paper says bottleneck is binary interpretation, not solving
cross-language state alignment
- `repr(C)`, `extern "C"`, annotations naming fields and array slots, dwarf debug data
- dynamic vectors needed custom modeling
- optimizations made z3 struggle on a modulo, disabled in all compilers
gui localizes differences
- highlights errors, syscalls, loop-bound exceedances, failed assertions
- prune branches, compress straight-line nodes, set differences A\B and B\A show refinement
- paper only suggests an llm could consume the text report to refine a translation
experiments
- insertion sort (C, Rust, C2Rust, and vs bubble sort), watch incrementer, box blur
- only small bounded inputs, overflow states excluded by assumptions in watch case
- trusted: binaries, compilers, angr, z3, layout annotations, bounds, developer classifications (inference)
- vs sequential equality harness (Kani, VERT): coarse pass/fail, copies second tree per leaf of first
