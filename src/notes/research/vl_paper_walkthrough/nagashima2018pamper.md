# PaMpeR: Proof Method Recommendation System for Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `nagashima2018pamper`, [paper](https://arxiv.org/abs/1806.07239)

recommends Isabelle/HOL proof methods from a proof state, with explanations
- trained on human proofs: standard library + AFP
- motivation: 159 stdlib methods, picking one needs expertise
- only recommends, Isabelle still checks the proof
features: 108 hand-written boolean assertions in Isabelle/ML
- cover goal, chained facts, goal-vs-context relations
- examples: constants in goal, types, schematic vars, defining keyword
- no user-defined constants, use meta-info instead
  - e.g. lemma `sep.elims` in context implies `sep` defined by `fun`
- abstraction is many-to-one, distinct states can collide
model: 1 regression tree per method
- label used=1.0 if the human used that method, else 0.0
- split greedily by RSS reduction up to a max depth, leaf = mean used
- chosen for explainability and small data on rare methods
data: only the apply/by commands modified in Isabelle to log (feature vector, method)
- 425334 data points, about 6021 CPU hours
- composite-method applies ignored
fast extractor drops assertions unused by any tree branch
- `which_method` shows top 15 with expectations, e.g. simp 0.4119, auto 0.1593
- `why_method m` prints feature-based reasons
- `rank_method m` prints rank among 239 learned methods
evaluation: 90/10 random split, metric = coincidence with the human-chosen method
- 239 learned methods, 171 in eval set
- simp: 58% top-1, 98% top-2, over 11385 invocations
- top 3 reaches 50% for 23 methods, top 15 for 72 methods
- 50% for 34 methods used under 0.1% of the time
- not success rates, other methods may also work
limits
- 1 human proof path per goal as label
- ignores method arguments and earlier proof steps
- poor on normalization, vector, general methods like safe, clarsimp
Verus transfer (inference)
- feature extractor over obligation, requires/ensures, invariants, available lemmas
- log features before each accepted lemma/assert/reveal, train per-construct trees
- scores are not success probabilities, Verus still decides
