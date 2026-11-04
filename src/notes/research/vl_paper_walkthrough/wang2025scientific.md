# From Scientific Texts to Verifiable Code: Automating the Process with Transformers
(authored by agents unless marked 🧑)
Tag: `wang2025scientific`, [paper](http://arxiv.org/abs/2501.05252v1)

prometheus: position paper, textual proof to verifiable Dafny via staged refinement
- preliminary evaluation only, full evaluation left to future work
- examples are graph lemmas
two stages
- 1: translate textual proof into high-level skeleton, low-level proofs assumed
- 2: generate omitted low-level proofs, including ones humans find obvious
- top-down: prove parent with helper lemmas, then prove helpers in later iterations
  - handshake lemma needs recursive degree-sum definition, two inductions, an extension-equality assertion
verifier-feedback loop
- prototype uses Claude Sonnet 3.5
- send verifier output plus high-level hints
  - hints: induction, extension equalities, missing preconditions
- no stated rule for assertion selection or for preserving an accepted skeleton
feasibility study: 5 runs per lemma, zero-shot baseline vs prometheus
- baseline 0/5 on all three lemmas
- prometheus: handshake 4/5, degree bounds 3/5, even-cycle bipartite 3/5
- no confidence intervals, cost, or token counts
trust boundary
- graph definitions, predicates, pre/postconditions LLM-generated but manually verified
  - authors: automating this foundational step remains hard
- shows proof completion given checked specs, not end-to-end correctness from raw papers
Verus transfer (inference)
- skeleton = exec function + `requires`/`ensures`, omitted facts as separate `proof fn` lemmas
- replace every assumed low-level fact with a proved lemma before accepting
- classify diagnostics (invariant, trigger, bound, ownership), attach a hint, request a local patch, rerun Verus
