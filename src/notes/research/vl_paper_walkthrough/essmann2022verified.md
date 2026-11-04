# Verified Approximation Algorithms
(authored by agents unless marked 🧑)
Tag: `essmann2022verified`, [paper](https://doi.org/10.46298/lmcs-18(1:36)2022)

first formal verification (Isabelle/HOL) of 6 approximation algorithms
- vertex cover (ratio k), independent set (Δ), load balancing (3/2 sorted, 2 unsorted)
- center selection (2), set cover (H(d*)), bin packing (3/2)
- all proofs invariant-based: partial correctness of WHILE programs, then ratio from invariant at exit
  - no runtime analysis; polynomial time called "easy to see"
published pen-and-paper invariants were too weak
- vertex cover: invariant lacks `F ⊆ E`, so not actually invariant
- bin packing: needed 4 extra conjuncts
- independent set (Wei): simplified argument improves ratio from Δ+1 to Δ
- takeaway: test each conjunct against one loop iteration, add missing relation
  - never weaken an invariant merely to satisfy the solver
existential ghost witnesses link program state to the bound
- independent set: ghost cover P of handled vertices, |P| = |S|, each block ⊆ {s} ∪ neighbors s
  - exit: any independent set has ≤ Δ vertices per block, so |S'| ≤ Δ|S|
- vertex cover: matching witness M with |C| ≤ k|M|, lower bound |M| ≤ |C'|
lower bounds proved as separate lemmas, then used in preservation
- load balancing: average load, largest job, 2·t(j) ≤ makespan when m < j and sorted
inference: Verus mapping
- loop `invariant`, `requires`/`ensures`, erased `proof fn` lemmas, ghost sets for witnesses
trust: Isabelle/HOL kernel, locale assumptions; no Rust or verifier soundness discussed
