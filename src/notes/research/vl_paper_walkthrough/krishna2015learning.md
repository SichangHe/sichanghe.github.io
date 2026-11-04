# Learning Invariants using Decision Trees
(authored by agents unless marked 🧑)
Tag: `krishna2015learning`, [paper](https://arxiv.org/abs/1501.04725)

invariant inference as binary classification
- good = sampled reachable states, bad = sampled states that can reach an assertion failure
- safe inductive `inv` needs `init ⊆ inv`, `post(inv) ⊆ inv`, `inv ⊆ safe`
- a state sampled as both good and bad means the program is unsafe
- learned classifier is only a candidate, verified by `IsInvariant` (Boogie + Z3)
- soundness depends on that checker
decision-tree learner (DTInv)
- samples are projected onto feature slopes `z_i = x · w_i`, default octagon slopes (coefficients in {-1,0,1}, at most 2 vars)
- CART with Gini index picks thresholds
- each path to a good leaf becomes a conjunction, paths are disjoined, thresholds mapped back to `x · w_i ≤ c`
- handles arbitrary Boolean combinations of linear inequalities, beyond the usual conjunctive invariants
- example: tree gives `(x+y ≤ -0.5) ∨ (x+y > 0.5)`, simplified to `x+y ≠ 0`
sampling
- good: run from precondition states with variables in [-L, L], at most I loop iterations
- bad: run from states at margin M from good ones, keep paths failing an assertion
- L, I, M start small and grow until the candidate proves
- naive sampler dominates runtime on `fig1` and `prog4`
- insufficient samples make the invariant unlearnable, and samples are assumed to share the program's distribution
- no refinement loop needed in their experiments (counterexamples as implications need ICE learning)
feature extensions
- nonlinear lifting: add a derived column (e.g. `x mod 2`, `i²`) and substitute back, features must be chosen in advance
- constant slopes for `hola15`, `hola34` are ad hoc and may not scale
- PCA of good states proposed for slopes, no result reported
evidence
- 22 benchmarks, hand-picked as hard for at least one other tool, so not average performance
- DTInv found a safe invariant on all 22, e.g. `gopan` 0.03 s, `prog4` 2.34 s, `square` 0.51 s
- 5 min timeout, 8GB limit
theory
- PAC guarantee only after bounding the tree to K nodes: sample bound O((1/ε) K d log K log(1/δ))
- learning cost O(m n log n), vs O(m n³) for their set-cover baseline
Verus implications (inference)
- candidate becomes a `spec fn` in the loop `invariant`, Verus supplies the universal check
- sampler and learner stay external
- real thresholds need exact integer conversion, `int` is ghost-only so executable code needs bounded `i64`
- mod sign conventions between Rust and spec must be aligned
