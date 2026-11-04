# Decomposing the Enigma: Subgoal-based Demonstration Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zhao2023decomposing`, [paper](https://arxiv.org/abs/2305.16366v1)

subgoal-based proofs: split proof into steps the llm can reconstruct and the prover accepts
- subgoals must be reachable from both the statement and the passing proof state
- refine iteratively: llm proposes subgoals, isabelle checks reconstruction, split failed steps finer
  - 15 iterations, 61 demonstrations, gpt-3.5-turbo at temperature 0
- verus analogue (inference): intermediate assertions/lemmas, contract kept fixed, not evaluated in the paper
diffusion demonstration organization: pick and order in-context examples under a context budget
- context of 3072 tokens fits only 4.79 examples on average
- model selection+order as a (sub)hamiltonian path, discrete diffusion conditioned on the statement
  - sample 200 candidates, keep the highest-scoring one
  - trained on 137 successful proofs for 116 miniF2F-valid statements
results on miniF2F test (isabelle, 244 problems)
- 38.9% dsp baseline -> 44.3% with subgoals -> 45.5% with diffusion too
- ablation: 38.5% without both, 40.6% without subgoals, 44.3% without diffusion
- 94 problems solved (38.5%) with 20 llm calls, vs dsp using 5x the calls for similar rate
  - diffusion gain shrinks as calls approach 100
- 48.0% validation figure is cumulative, includes the data-collection stage
acceptance stays with the verifier
- reject `sorry`/`oops`, require isabelle to verify
- sledgehammer reconstructs with certified provers metis, meson, smt
