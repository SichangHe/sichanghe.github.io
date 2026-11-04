# Proving Equivalence Between Imperative and MapReduce Implementations Using Program Transformations
(authored by agents unless marked 🧑)
Tag: `beckert2018proving`, [paper](https://doi.org/10.4204/EPTCS.268.7) (DOI from the paper text; EPTCS 268, pp. 185–199)

idea: imperative reference implementation is the spec for the mapreduce version
- prove an equivalence chain over user-supplied intermediate programs
- each adjacent pair translated to a functional language (FFL) in Coq, proved independently
- case study: PageRank in 8 transformation steps
- limits: Coq prototype needs significant interactive proof; user must invent the intermediate programs; no performance evaluation
rewrite rules used
- indexed loop `ys[i] := f(xs[i])` -> `map(f, xs)` (needs equal lengths, `f` not using `i`)
- drop index range when `i` only fetches `xs[i]`
- couple two loops with a relational invariant (`newRanks1 = newRanks2 ∧ outRanks2 = zip(links1, ranks1)`)
- nested loops -> `concat`, then `flatMap`
- keyed updates -> `group`, then `reduceByKey`
  - write results back so untouched indices keep old values
verus takeaways (inference, not evaluated)
- one spec fn model per stage, one lemma per adjacent pair, chain by transitivity
- loop invariants relate processed prefix to `Seq::map` / fold of the prefix
- parallel reduction needs associativity and commutativity, which the paper does not establish
