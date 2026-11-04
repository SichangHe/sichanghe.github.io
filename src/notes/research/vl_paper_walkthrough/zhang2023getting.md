# Getting More out of Large Language Models for Proofs
(authored by agents unless marked 🧑)
Tag: `zhang2023getting`, [paper](https://arxiv.org/abs/2305.04369)

2-page talk proposal; GPT-3.5 Turbo/GPT-4 writing Coq proofs
- failure analysis only; the 6 recommendations are untested proposals
- 740 GPT-4 few-shot outputs annotated (Fig 1a)
  - hallucination 34.3%, dependency 20.7%, proof state 19.5%, refusal 5.4%, syntax 4.9%
- zero-shot proves 0 theorems for both models (Table 1)
  - best GPT-4: FS+Lem 14 correct proofs, FS-sim 7 proven theorems
  - Proverbot baseline proves 23
  - total theorem count unstated, so no success rate
recommendations
- let model query the prover mid-proof
  - refusals ask for missing definitions (e.g. Coq `Print`)
  - Verus: read-only query for `spec fn`, datatypes, contracts
- feed current proof state
  - model clashes with existing names (`intros R` when `R` is bound)
  - Verus: summarize failing obligation and `requires` from diagnostics
- supply file dependencies and restrict to existing names
  - model invents lemmas (`stutter_bisim`)
  - Verus: retrieve exact signatures, never mask gaps with `external_body`
- retrieve preceding proofs as few-shot
  - FS-sim vs FS-rand: GPT-4 7 vs 6, GPT-3.5 4 vs 6, no consistent gain
  - similarity retriever: fine-tuned all-mpnet-base-v2
- feed verifier errors back for repair
  - paper runs no repair loop; cites Baldur
- diversify prompts
  - setups prove largely different theorems (pairwise overlap at most 3)
  - model misses `trans_incl` that `auto.` proves
