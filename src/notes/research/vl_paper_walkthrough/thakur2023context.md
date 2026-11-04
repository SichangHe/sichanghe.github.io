# An In-Context Learning Agent for Formal Theorem-Proving
(authored by agents unless marked 🧑)
Tag: `thakur2023context`, [paper](http://arxiv.org/abs/2310.04353v5)

COPRA: search around an unmodified GPT-4, one tactic per query, proof assistant checks every step
- targets Lean 3 (miniF2F-test, 244 theorems) and Coq (118 CompCert theorems, 98 of which PROVERBOT9001 proves)
- LLM, retriever, search all untrusted; wrong tactic only gives an error state
- budget: 60 queries and 600 s per theorem, temperature 0
- test-set leakage not ruled out
depth-first search with backtracking
- push state, prompt for a tactic, execute, recurse; pop after t failed tries
- one step per query because intermediate states are visible
- results on miniF2F
  - few-shot whole proof 13.52% (33/244)
  - COPRA 26.63% (65/244)
  - no backtracking 24.59% (60)
  - backtracking helps mostly on longer proofs
- Coq: COPRA 57/118 vs few-shot GPT-4 36 and GPT-3.5 10
- needs GPT-4: GPT-3.5 gets 9.02%, CodeLlama 5.73%, mostly format failures
- slow per query (13.34 s) but few queries per proof
failure dictionary in prompt
- store tactics already rejected per state, list under `[INCORRECT STEPS]` and last step with error message
- fixes temperature-0 repeats
- no isolated ablation in paper
- exact-match only; rephrased failures evade it
progress check
- reject a tactic if the new state is no easier than a state on the stack
  - O1 ⊒ O2: every obligation in O2 has a same-goal obligation in O1 with a subset of hypotheses
- avoids cyclic tactic sequences; no isolated measurement
- Verus: no hypotheses printed, so compare failing-obligation sets (inference)
grammar-based prompt and answer protocol
- fields: goals, hypotheses, steps, incorrect steps, last step with error
- parser repairs truncated or malformed answers by re-querying
- prompts vary hugely: CompCert mean 3220 tokens, max 116574
retrieval and informal proofs
- BM25 lemma retrieval: 26.63% to 29.09% (+6 theorems)
  - model may still misuse the retrieved lemma
  - retrieval costs more queries (37.88 vs 21.73)
- generated informal proof as context: 29.92% at 60 queries, 30.74% at 100 queries
  - not applicable to software verification, which has no informal proofs
- stage cheap-first under one shared budget: plain, then retrieval, then informal proof
leakage audit
- compare found proofs to repository proofs
  - 22 of 75 exact matches, 17 single-tactic
  - 53/58 distinct once single-tactic matches removed
- Verus: diff produced proofs against reference proofs on public benchmarks (inference)
paper inconsistencies
- text says 91.93%, table gives 91.37%
- margin over REPROVER is a handful of theorems, single run, no variance
