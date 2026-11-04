# Magnushammer: A Transformer-Based Approach to Premise Selection
(authored by agents unless marked 🧑)
Tag: `mikula2024magnushammer`, [paper](http://arxiv.org/abs/2303.04488v3)

two-stage neural premise selection for Isabelle
- SELECT: embed proof state and all premises, cosine top 1024 from 30-50K candidates
  - premise embeddings cached
  - trained with modified InfoNCE, N positives + M=3N extra negatives per batch
- RERANK: score each (proof state, premise) pair, return top KR (= KS = 1024)
  - trained with binary cross-entropy
  - 15 hard negatives per positive from SELECT top 1024 not used in the proof
  - alternate SELECT/RERANK updates, refresh negatives every 1000 steps
bounded search turns ranked premises into checked proofs
- try top-k prefixes (k in 2^0..2^10, 48, 96, 192) x tactics, 2s timeout each, in parallel
  - accept only if Isabelle verifies
  - rationale: tactics do combinatorial search, fewer premises shrink the space
- premises passed directly to native tactics, so proofs are one strong tactic + long premise list
  - retrieval is useful only because a trusted tactic consumes candidates
training data mined from existing proofs
- HPL: one (state, premise) pair per premise used in each human proof step, from AFP + stdlib
- SH: Sledgehammer alternative proofs of intermediate propositions
- MAPL = HPL ∪ SH: 4.4M pairs, 433K premises
  - mining cost 17 CPU years
  - 0.1% of MAPL (~4K samples) fine-tuned already beats Sledgehammer
results
- PISA (1000 problems) single-step: 59.5% (86M model) vs Sledgehammer 38.3%
- miniF2F test single-step: 34.0% vs Sledgehammer+heuristics 20.9%
- PISA multi-step: Thor + Magnushammer 71.0% vs Thor 57.0%
- miniF2F multi-step: 37.3% test, below DSP 39.3%, not best
limits
- text alone lacks semantic info on referenced objects (paper's own limitation)
for verus
- inference: external tool retrieves candidate lemmas/requires, bounded search over assert/lemma hints, keep only verified variants
  - no Verus experiment, types/ownership/triggers not captured by text
