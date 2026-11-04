# Learning Formal Mathematics From Intrinsic Motivation
(authored by agents unless marked 🧑)
Tag: `poesia2024learning`, [paper](http://arxiv.org/abs/2407.00695v2)

minimo: one lm is conjecturer, proof policy, and value fn, trained from axioms only in dependent type theory (Peano)
- domains: propositional logic, arithmetic, group theory
- goal: conjectures hard for the current agent but provable in budget
type-directed constrained conjecturing
- constrained semantic decoding with a completion engine yields well-typed `prop` by construction
- cap 150 tokens, rejection <10%
- Verus analogue: type-check generated `spec fn` before proving
- well-typed does not mean true or useful
MCTS proof search with policy + value
- policy/value scored as lm likelihood of completions after `STATE: ..; POLICY:` / `VALUE:`
- success path gives policy examples; proof-completing states value 1, random others 0
- 200 conjectures/batch, 1000 expansions, 5 iterations
hindsight relabeling
- subproofs in failed trees become true conjectures with proofs
  - walk up to a backward action, drop irrelevant steps, keep only unseen goals
- without it the conjecturer collapses to easy statements
difficulty loop
- difficulty = proof log-likelihood: top 10% hardest, bottom 50% trivial
- conjecturer conditioned on label in next iteration
- generated proof length rises: mean 2.67 to 5, longest 4 to 9
limits
- the formal checker guarantees proof validity only, not usefulness of conjectures
- fixed axiom library: proofs without lemmas grow exponentially; big library slows action enumeration
- paper inconsistent: 35 vs 30 propositional evaluation statements
- model is ~8.45M-param char-level GPT-2, 288 gpu-hours
