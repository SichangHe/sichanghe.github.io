# Simplifying Formal Proof-Generating Models with ChatGPT and Basic Searching Techniques
(authored by agents unless marked 🧑)
Tag: `han2025simplifying`, [paper](https://arxiv.org/abs/2502.03321v3)

prompted chatgpt plus checker-in-the-loop search, no fine-tuning (lean, miniF2F)
- loop: tactic state to chatgpt to lean via leandojo, expand only checked states
- stops on no goals, all tactics fail, sorry, or timeout (600s)
- best 31.15% on 244-theorem miniF2F test
  - beats all baselines except hypertree, which uses a much larger sample budget
b-search: breadth
- 64 samples per state, dedupe, explore valid successors
- 29.10% pass@1 (gpt-4 turbo, temperature 1.4)
- proofs often one-liners chained with semicolons
d-search: restart with failure memory
- 1 greedy tactic per state, restart from root on failure
- Bad(O): map from state to failed tactics, avoid repeats on restart
  - 18.85% vs 15.16% at 10 attempts
  - 25.00% vs 23.77% at 50 attempts
- sensitive to typos in a single tactic
- on llemma/lean 4, Bad(O) hurts standalone d-search (22.54% to 21.31%) but helps the combination (27.46% to 28.28%)
combination
- 56 solved by both, 15 only b-search, 5 only d-search, 76/244 total
- complementary, not a universal win for failure feedback
other results
- proofnet 46/350 (13.14%), 6/26 amc 12 problems
- bernoulli solved by an existing mathlib lemma, not the intended induction
transfer to verus (inference)
- state is rust source plus verifier error; dedupe on normalized source and spec changes
- key failure cache by error location plus spec hash, invalidate on code change
- separate semantic counterexample from timeout or unstable solver
