# Direct Optimization of Generators for Search in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ousherovitch2026direct`, [paper](https://doi.org/10.1007/978-3-0)

train tactic generators for the deployed search, not for cross-entropy
- sft cross-entropy rewards the demonstrated trace
  - search succeeds if any proof is found within a finite expansion budget
- compute-aligned training (CAT) maximizes surrogate probability of finding a proof under the search algorithm
  - off-trace tactics collapse into one trace-miss event
  - gradient = scalar-weighted sum of per-tactic CE gradients, so it is a cheap reweighting of sft
- uniform-allocation (UA) loss is search-agnostic
  - one adapter serves pass@N, BFS, DFS variants, MCTS
search-specific weights must be derived per scheduler
- pass@N: success = 1 - (1 - prod p_t)^N, same weight for every step
- best-first: success = P(sum of geometric retries <= N)
- reusing the pass@N formula for another search is wrong
trace-only approximation has provable bias
- bypass channel: valid alternative proofs make the true weight smaller
- trap channel: costly off-trace branches make the true weight larger
- non-identifiable from traces alone
  - environments agreeing on demonstrated transitions can differ in deployed weights
results (Lean 4, LeanDojo, Qwen2.5-Math-7B LoRA, 458 theorems, N=256)
- CE: pass@N 21.2%, BFS 23.8%, MCTS 20.3%
- CAT: 26.6%, 25.1%, 22.5%
- UA: 25.1%, 26.9%, 25.1%
- limits: one base model, short proofs (2-5 steps), offline sft
verus analog (inference)
- a training example needs a verifier-confirmed transition after each proof action
- collapsing alternative valid proofs into one miss may mis-train agents
