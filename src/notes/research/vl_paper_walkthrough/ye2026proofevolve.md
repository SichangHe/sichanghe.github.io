# ProofEvolve: Neuro-Symbolic Evolution for Formal Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ye2026proofevolve`, [paper](https://arxiv.org/abs/2608.26334)

keep verified partial proofs instead of discarding failed root attempts
- Lean 4 prover, Claude Opus 4.8 base
- proof = AND-OR DAG; node = tactic state; edge = Lean-elaborated constructor
  - LLM proposes decompose/repair/schema-apply; kernel accepts or rejects every edge
  - closed sub-DAG reusable even if root stays open
  - returned proofs type-check by construction
    - authors reverified >400 solutions, 0 false positives
graded fitness from verified closure ρ in [0,1]
- closed node 1, frontier 0, AND edge = weighted child avg, OR node = max
  - ρ=1 iff root closed; extending a DAG never lowers ρ
  - uniform weights, not learned
- schedule frontier by counterfactual gain in root ρ
behavioral archive keeps diverse candidates
- one DAG per cell (depth bin, tactic family, schema-index region)
- challenger replaces incumbent only if new cell or higher ρ
- parents sampled by softmax(ρ/τ)
- no comparison of alternative descriptors
theorem schemas from closed sub-DAGs
- generalize to ∀-quantified lemma with explicit premises + kernel proof
- reuse: match conclusion, missing premises become child goals, Lean rechecks whole edge
- persistent library across targets
- synthetic compositional families: growing library 19.8% vs reset 7.3%
- Lean Workbook, 744 screened theorems, 3-run means
  - zero-shot 49.5%, relevant retrieval K=8 53.4%, random retrieval 49.6%
  - retrieval closes 351 left open by zero-shot; 322/351 = 91.7% of those, not of all 744
repair from Lean errors
- LLM sees rejected edge + diagnostic, proposes replacement at same frontier state
- rejects never touch trusted archive or library
results (mean of 3 runs)
- PutnamBench 71.2%, IMO-LeanProofBench 53.3%, CombiBench 49.0%
  - 57.8% = unweighted mean of the three, not pooled over 485 targets
- ablation on 60 IMO problems, 5 seeds: full 32/60
  - no decomposition 11/60, no recombination 14/60, no repair 9/60
trust boundary
- trusted: Lean kernel, fixed Mathlib, standard axioms, benchmark statements, schema premises
- untrusted search: LLM, retriever, archive ranking, operators
Verus port (inference)
- schema = `proof fn` with `requires`/`ensures`; rerun Verus on every instantiation
- repair agent edits only proof body, `assert`, `invariant`; freezes contract; reject `assume`/`admit`
- risk: schema with broad premises transfers pattern but proves wrong property
