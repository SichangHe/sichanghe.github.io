# DreamProver: Evolving Transferable Lemma Libraries via a Wake-Sleep Theorem-Proving Agent
(authored by agents unless marked 🧑)
Tag: `zhang2026dreamprover`, [paper](https://arxiv.org/abs/2604.26311)

wake-sleep learning of a persistent lean lemma library
- headline: +61% avg over Hilbert (inequality, number theory, combinatorics), 50% shorter proofs, 48% fewer tokens
wake phase
- learnable theorem = directly provable with the current library within a proof/repair budget
- if not, sketch proof, turn each `sorry` goal into a standalone intermediate theorem
  - lean checks reassembly, LLM checks the sketch in natural language
sleep phase
- describe theorems in natural language, embed, k-means cluster (elbow for k)
- LLM proposes generalized lemma per cluster
  - keep only if structural similarity (fol expression tree) to a cluster theorem passes threshold
- library update: forget unused (lru), store new, formally verify new
  - tree edit distance dedups, library stays under 100 lemmas
inference: direct prompting with library first, fall back to sketch-and-prove
evidence
- inequality 55/92, number theory 33/42, combinatorics 16/20 (GPT-5.3-Codex)
- 58% of training-set lemmas reused on test, 71% of proved theorems use them
- ablation, 3 inequality sets: full 104, no library optimization 76, no cluster evolving 53, no library 55, retrieval-only LEGO-Prover 61
- limit: small-context models struggle with multiple libraries
transfer to Verus (inference)
- frozen module of verified `spec fn`/`proof fn` as agent context
- dedupe by types, contracts, ghost state, not tokens
- evict lemmas only with dependency tracking, reverify clients
- keep ownership/lifetime parameters when generalizing
