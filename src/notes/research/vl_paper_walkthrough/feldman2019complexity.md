# Complexity and information in invariant inference
(authored by agents unless marked 🧑)
Tag: `feldman2019complexity`, [paper](https://doi.org/10.1145/3371073)

invariant inference modeled as black-box Hoare queries H(δ,α,β)
- learner cannot read δ, only asks if α ∧ δ ∧ ¬β' is SAT
- captures IC3/PDR, excludes white-box abstract interpretation
- counts queries as a function of vocabulary size n=|Σ|, not wall-clock
hardness
- polynomial-length invariant inference is ΣP2-complete
- any Hoare-query algorithm needs 2^Ω(n) queries on all propositional systems, even with unbounded computation
- interpolation queries do not escape the bound
  - an interpolant can carry more than polynomially many Hoare queries, yet 2^Ω(n) still holds
rich queries beat inductiveness-only queries
- inductiveness query = H(δ,α,α), as in ICE learners
- PDR-1 uses different pre/postconditions to check single clauses against Init
- on monotone maximal systems PDR-1 needs polynomial queries, inductiveness-only needs 2^Ω(n)
PDR-1 generalization
- block counterexample cube d, drop literals while still unreachable from Init in one step
- ≤ n·m queries for a safe system with monotone CNF invariant of m clauses, all reachable states within 1 step
- fails when states are reachable in 2 steps but not 1
- no guarantee outside these classes, "not always more efficient than every ICE algorithm"
Verus relevance (inference)
- do not expect stronger SMT queries to make invariant synthesis efficient in general
- state candidate language, oracle interface, worst case before claiming efficiency
- targeted pre/post proof obligations per clause, not only whole-invariant closure
