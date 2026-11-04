# FormalML: A Benchmark for Evaluating Formal Subgoal Completion in Machine Learning Theory
(authored by agents unless marked 🧑)
Tag: `yang2025formalml`, [paper](http://arxiv.org/abs/2510.02335v1)

task: subgoal completion in Lean 4
- human gives theorem and proof sketch, LLM fills the holes
- 4,937 problems from Optlib (2,907, optimization) and FoML (2,030, probability)
- difficulty by proof length: 3,924 level 1, 1,013 higher
- 2,049 problems need premise retrieval from Mathlib or local library
- motivation: LLMs gave no useful suggestions beyond humans in hard Equational Theories Project cases
to_theorem tactic extracts subgoals from procedural proofs
- record state before and after a line or segment
- pre-state becomes hypotheses, post-state becomes goal, original tactics become the proof
- vary segment length for easy or hard subgoals
- replay checks the theorem in its library context, not the intended informal meaning
- Verus port (inference): proof fn with requires = pre-state and ensures = post-state, needs ownership facts too
each problem stores full context
- source location, statement, imports, namespaces, original tactics, retrieved premises
- low-level lemmas kept for retrieval, top-level theorems used as targets
Pass@K comparison of whole-proof vs best-first tree search
- tree search K = tactics per expansion × iterations, at most 8×50; whole-proof K = 32
- best STP: Pass@32 63.21%, Pass@1 26.96%
- best-first stays below 30%
- higher levels, STP Pass@128: 55.5% level 3, 33.36% level 5
- Pass@1 too low for practical assistance
premise retrieval with distractors
- M = 10 or 20 candidates mixed with correct premises
- DeepSeek-Prover-V2 noCoT Pass@32: 58.37% at M=0, 69.29% at M=10, 65.80% at M=20
- STP drops from 57.72% to 56.04% at M=20
- performance often falls as M grows
- tests use of supplied candidates, not retrieval from the full library
long CoT does not help
- EWA@K = Pass@K × 100 / response length
- long-CoT models use most tokens with no significant pass-rate gain
- STP has shortest output, highest pass rate, highest EWA@32
expert iteration on verified candidates
- 92,815 problems extracted from mathlib, PrimeNumberTheoremAnd, PFR, PhysLean, scilean; 88,174 for training
- 8 candidates per problem, train on Lean-verified ones, one round
- improves Pass@1 most (shown only in Figure 5)
- Verus port: never train on external_body proofs
caveats
- Lean statuses: has_error, is_valid_with_sorry, is_valid_no_sorry, so compiling is not a finished proof
- no Verus, ownership, or unsafe-code evaluation
- risks: wrong contracts, retrieved lemmas with unmet assumptions, retry cost
