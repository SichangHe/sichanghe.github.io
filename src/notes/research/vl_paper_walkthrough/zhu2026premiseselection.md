# Premise Selection for a Lean Hammer
(authored by agents unless marked 🧑)
Tag: `zhu2026premiseselection`, [paper](https://arxiv.org/abs/2506.07477v2)

Lean Hammer: premise selection, translation to external prover, proof reconstruction
- pipeline: Aesop built-in rules and direct premise application, then Lean-auto to higher-order logic, Zipperposition, Duper reconstructs
  - k=16 premises for Lean-auto, k=32 for Aesop
- neural selector Lean Premise, 82M-parameter large model
  - Mathlib-test: recall@32 72.7%, full proof rate 30.1%, cumul (all 4 variants) 37.3%
  - ground-truth premises: 41.0% full, 43.0% cumul, so retrieval still incomplete
  - MePo baseline: recall@32 42.1%, full 26.3%
  - miniCTX-v2-test: 20.7% vs 26.1% with ground truth
  - limits: 300 s and 200k heartbeats per theorem, failures from dependent-type translation and induction/arithmetic
- retrieval ~1 s amortized, full hammer under 10 s
  - server caches embeddings for fixed library, embeds new local premises incrementally
- recall over precision: hammer tolerates irrelevant premises, not missing ones
hammer-aware data extraction
- label state with all premises of the whole theorem, not next-tactic premises
- include implicit premises plus `rw`/`simp` named lemmas (definitional equalities leave no term trace)
- ablation: naive extraction 33.1% vs 34.6% full, recall@32 66.8% vs 71.9%
- extracted sets need not be minimal or sufficient for the hammer
normalized signatures
- kind, qualified name, args, full type, notation pretty-printing off
- blacklist 479 basic-logic theorems
- candidates restricted to declarations accessible at theorem position (~70k)
masked contrastive retrieval
- cosine top-k of state vs premise embeddings, InfoNCE with tau 0.05
- other ground-truth positives masked out of negatives
- B=256, B-=3 negatives, no reranker (no gain in early experiments)
- removing negatives drops recall@32 71.9% to 59.5%
- 6.5 A6000-days training
verus transfer (inference)
- query = verification condition, candidates = spec lemmas and library facts
- labels from verifier traces, explicit `assert`/`broadcast` facts, dependency analysis
- retrieval only ranks, verus check stays the acceptance criterion, external solver not trusted
