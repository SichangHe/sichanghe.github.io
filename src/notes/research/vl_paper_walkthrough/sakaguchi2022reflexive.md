# Reflexive tactics for algebra, revisited
(authored by agents unless marked 🧑)
Tag: `sakaguchi2022reflexive`: [paper](https://arxiv.org/abs/2202.04330)

problem: reflexive tactics in Coq/MathComp match operators syntactically
- packed classes give same operator syntactically different but convertible instances
- homomorphisms have differing domain/codomain types
computational reflection
- syntax tree + evaluator + verified normalizer + one reflection lemma
- reify both sides, normalize by reduction, close with `erefl`
conversion-aware reification
- match operator head syntactically (keyed matching)
- compare structure arguments by unification, i.e. conversion
  - full unification for matching is too costly
homomorphism preprocessing
- push maps down to leaves (`Mnorm`), proved correct (`M_correct`)
- reuse the existing normalizer (`AGeval`, `AGnorm`, `AG_correct`) unchanged
- adding an operator = adding a preprocessing equation (e.g. opaque `subr`), not a new normalizer
canonical zification
- map ring terms to integers via canonical instances, then `lia` for field side conditions
evidence: Apéry's theorem proof
- removes 485 of 5881 lines, checking 26% faster (9 min 19 s → 6 min 52 s)
- hardest `field` call 91.9 s → 87.4 s, big coefficients (>10^12) limit gain
- no rational or variable exponents, preprocessor not user-extensible
takeaways for Verus
- generated normalizers enlarge the trusted proof-engineering surface
- Verus has no canonical-structure/conversion API, so mappings must be explicit ghost lemmas
