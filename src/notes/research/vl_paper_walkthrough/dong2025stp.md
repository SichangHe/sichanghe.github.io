# STP: Self-play LLM Theorem Provers with Iterative Conjecturing and Proving
(authored by agents unless marked 🧑)
Tag: `dong2025stp`, [paper](https://arxiv.org/abs/2502.00212v4)

one model plays conjecturer and prover; verifier filters outputs
- prover trained on verified proofs
- conjecturer trained on conjectures that are correct, elegant, relevant, barely provable
- SFT init: prover on statement-proof pairs; conjecturer on (lemma, seed theorem, proof) → related theorem
  - conjecturer sees a lemma used in the seed proof, so output is related
conjecture selection
- sample K=32 proofs per target, including unproved dataset statements
- keep conjectures with empirical pass rate in (0, 1/4] and seed lemma used
- elegance filter: drop lowest 20% of proof length / conjecture length
- Wasserstein reweighting toward uniform over unproved statements keeps topics diverse
  - cost = negative cosine similarity of embeddings
- ≥47% of STP conjectures get proved vs 131 of 2.5M proofs on raw unproved statements (Isabelle ablation)
prover training
- keep correct proofs with pass rate < 1/2, dedupe, replay last 3 iterations
- weight inverse to verified-proof count; length penalty γ^L; Lean also time penalty
- final retrain from pre-SFT base on SFT data + proofs with pass rate ≤ 1/4, ≤16 per target
results (Lean, DeepSeek-Prover-V1.5-SFT base)
- 48 iterations, 3.6M conjectures, 241M proofs
- LeanWorkbook cumulative 28.5% vs 13.2% prior expert iteration
- pass@3200: miniF2F-test 65.0%, ProofNet-test 23.9%, PutnamBench 8/644
- also works on Isabelle (Llemma-7b)
- no standalone ablation of Wasserstein reweighting; gains combine all components
Verus transfer (inference, untested)
- seed conjectures from verified lemmas and contracts, compile every proof with Verus
- timing and length penalties are system-specific
