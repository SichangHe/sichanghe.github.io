# LeanDojo: Theorem Proving with Retrieval-Augmented Language Models
(authored by agents unless marked 🧑)
Tag: `yang2023leandojo`, [paper](https://arxiv.org/abs/2306.15626)

leandojo: open toolkit for proof data extraction + programmatic Lean interaction, plus reprover retrieval-augmented prover
- core problem: premise selection, all premises do not fit in context
data extraction
- patch Lean elaborator to record pre-expressions and expressions
  - gives fully qualified premise names, definition and use locations
  - patched Lean only for extraction, not evaluation, so soundness is safe
- benchmark: 98,734 theorems, 3,384 files, 130,262 premises, 217,776 tactics
interaction environment
- initialize(theorem), run_tac(state, tactic) -> next state or error
- wraps interaction as a Lean tactic inserted into the proof
  - lean-gym misjudged 21.1% of correct proofs, leandojo 1.4%
anti-memorization split
- random split overestimates via memorization
- novel_premises: test proof uses ≥1 premise unseen in training
  - all methods drop substantially on it
retrieval
- restrict to accessible premises: 128K -> 33K average
- in-file hard negatives (1 of 3 negatives per example)
  - R@10 on random: 38.4% vs 33.1% without
  - BM25 R@10 17.2%
reprover generation + search
- ByT5-small, state + retrieved premises, input limit 2,300 tokens (10-15 premises)
- 64 beam candidates per state, best-first search by summed log-likelihood
- training 120 GPU hours on one A100, vs >1000 for prior methods
results (Pass@1, 10 min)
- random 51.2% (47.6% without retrieval), novel_premises 26.3% (23.2%)
- GPT-4 29.0% / 7.4%, possible contamination
- MiniF2F 26.5%, ProofNet 13.8%
verus analogue (inference)
- filter retrieval by module visibility
- split benchmark by unseen lemmas/repos
- acceptance stays the unmodified verifier
