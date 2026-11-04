# EvoSpex: An Evolutionary Algorithm for Learning Postconditions
(authored by agents unless marked 🧑)
Tag: `molina2021evospex`, [paper](https://arxiv.org/abs/2102.13569)

infers java postconditions from executions, not proofs
- output is a likely spec of current behavior, truth for all executions not guaranteed
bounded state generation
- enumerate executions within a finite scope, collect valid pre/post pairs V
- mutate post-state or return value, keep pair if not in V, giving invalid set I
  - unsound: a mutant may be a valid execution missing from V
- state matching: drop traces whose resulting object duplicates an earlier one
genetic search
- chromosome = conjunction of genes (navigation, quantifiers, closure, cardinality)
- asymmetric fitness
  - first drive positive counterexamples (valid pairs violated) to 0
  - then count negative counterexamples (invalid pairs accepted), penalize size
- mutation rate 0.3 per gene, crossover 0.35, 30 generations or 10 min, 10 runs, most frequent result
evaluation
- 16 SF110 projects, 200 methods
  - EvoSpex 522 assertions, 35 false positives (6.70%)
  - Daikon 2,219 assertions, 388 false positives (17.49%)
- recovered an exact property in 8/11 Eiffel and 9/12 Cozy methods
- false negatives remain, weaker than strongest postcondition
verus inference (not in paper)
- use as outside-verifier proposer of `ensures` candidates, verus must prove survivors
- failed-proof counterexamples replace test-pair fitness
