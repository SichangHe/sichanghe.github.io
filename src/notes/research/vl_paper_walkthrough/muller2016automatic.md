# Automatic Verification of Iterated Separating Conjunctions using Symbolic Execution
(authored by agents unless marked 🧑)
Tag: `muller2016automatic`, [paper](http://arxiv.org/abs/1603.00649v3)

Viper extension for iterated separating conjunctions (ISC)
- ISC = quantified permission over unbounded locations, e.g. forall i :: l <= i < r ==> acc(a[i])
  - motivation: random access to arrays/graphs, which recursive predicates can't express
quantified chunk representation
- chunk r.f ↦ [v(r), p(r)] replaces one-chunk-per-location
- receiver e(x) must be injective on x with permission
  - introduce inverse e⁻¹ with Inv-1, Inv-2 axioms, avoiding existential search
  - injectivity checked on exhale only, inhale relies on a matching exhale
  - holds naturally for array indices and set elements
inhale/exhale
- inhale adds permission and assumes pure parts; exhale checks then removes
- remove: greedy pointwise min across all chunks of field f
  - fails if residual demand ≠ 0 anywhere
- field write = exhale, inhale, inhale
heap reads and framing
- summarise merges all chunk value maps lazily before a read, no SMT query, memoized
- heap-dependent functions get a partial value map (PVM) snapshot
  - uninterpreted type with domain and apply, plus extensionality axiom
  - defunctionalization into first-order data
trigger control
- generated quantifiers need careful triggers
  - too few → spurious failures, too many → slow or nonterminating
  - Inv-2 can't trigger on source e, so use v(x) or leave to tools
predicates
- fold/unfold = exhale body + inhale instance, so ISC bodies just work
- not supported: predicates inside ISCs, nested ISCs
evidence
- 9 hand-coded + 65 VerCors + 82 regression examples, all verify in seconds (max 11.81s)
- memoization off: modest slowdown only
- no soundness proof in the text read
Verus relevance
- inference: ghost map + injective index-to-location spec fn is the analogue
  - Viper chunks and inverse-function encodings are not exposed in Verus
  - trigger strategy may not transfer from Viper to Verus, measure it
