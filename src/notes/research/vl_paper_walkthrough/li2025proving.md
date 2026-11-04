# Proving Olympiad Inequalities by Synergizing LLMs and Symbolic Reasoning
(authored by agents unless marked 🧑)
Tag: `li2025proving`, [paper](https://arxiv.org/abs/2502.13834)

LIPS: Lean 4 prover splitting tactics into scaling (symbolic) and rewriting (LLM)
- output: human-readable Lean proof, checked by Lean
- results: 76.3% on 161 problems
  - ChenNEQ 95.1% (39/41), MO-INT 80.0% (16/20), 567NEQ subset 68.0% (68/100)
  - 90 min limit, GPT-4o, 96 scaling and 16 rewriting tactics
  - CAD 59.0% and MMA 57.1%, but they give no readable proof
scaling: enumerate finite lemma instantiations, prune bad ones with counterexamples
- e-matching yields candidates, e.g. 162 AM-GM patterns, only 6 valid
- reject a candidate if CAD finds a counterexample
  - cache counterexamples as test cases, check them before calling CAD
  - fallback: Newton + simulated annealing on g(x) - f(x)
- no counterexample is not a proof, Lean still checks
rewriting: LLM proposes transformations where the argument space is infinite
- format-specific prompts, e.g. rearrangement, simplification, denominator cancellation
- each result applied in Lean to get a new goal
goal filtering then ranking
- symbolic score: homogeneity and decoupling from a Taylor polynomial approximation, keep top 10
- LLM ranks the 10 by proof difficulty
  - avoids a fine-tuned value model, bounds context
- success stays above 85% for filter size 8-16
- proofs take at most 33 goal selections, avg 15.75 vs oracle 7.25
limits
- manual tactic library, effectiveness tied to its breadth
- Lean statements translated from LaTeX by rules, fidelity assumed
Verus mapping (inference)
- scaling = finite arithmetic lemma library plus SMT counterexample pruning before Verus
- rewriting = LLM proposes `assert`/lemma steps, untrusted until Verus accepts
- ranking proof obligations by syntactic size or solver time is a proposed adaptation, not in the paper
- not evaluated on Rust, pointers, concurrency, systems invariants
