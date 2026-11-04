# CounterExample Guided Neural Synthesis
(authored by agents unless marked 🧑)
Tag: `polgreen2020counterexample`, [paper](http://arxiv.org/abs/2001.09245v1)

idea: neural network proposes bit-vector loop-invariant predicates from i/o examples, SMT verifier checks them
- only the final SMT check gives soundness
- counterexample guidance (cegns) nearly doubles benchmarks the network solves alone
training data
- 32M generated bit-vector programs, 29.4M kept after removing equivalent/trivial ones
- 10 i/o examples per program via random inputs + Z3 for branch coverage
- recurrent encoder (input/output lstm); feed-forward net fails
egns: example-guided
- SMT turns invariant spec into labeled examples
  - labels: definite, over-approximate (true if assertion allows), under-approximate (false if init fails), else random
  - all three heuristics together work best
- candidates verified against full spec; fails with no answer otherwise
cegns: counterexample-guided
- counterexample from a failed candidate becomes a new labeled example, loop not guaranteed to terminate
- pre-verify beam candidates against known examples before calling the verifier
- keep a bounded window of examples, drop duplicates and old ones (neural candidates non-monotonic)
- Z3 random phase selection diversifies counterexamples
results
- 600 s timeout: cegns 21 solved, egns 12, cegis 23, cegis(t) 26, CVC4 53
- cegns solves 5 that cegis misses, but CVC4 is far stronger
  - shows guidance helps the network, not that neural beats solvers
limits
- bit-vector only, limited benchmarks, one architecture
- Verus: failed initialization vs preservation obligation give different example labels
  - Verus may not expose a stable SMT model, so a custom query may be needed
