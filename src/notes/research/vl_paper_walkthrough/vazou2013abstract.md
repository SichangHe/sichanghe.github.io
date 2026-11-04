# Abstract Refinement Types
(authored by agents unless marked 🧑)
Tag: `vazou2013abstract`, [paper](https://www.semanticscholar.org/paper/2a8218a004ac837d51a66ba86ce1063f5f5fc940)

abstract refinement types: quantify over refinement predicates, still SMT-decidable
- predicate parameter p encoded as uninterpreted function in the logic
  - Int<p> is shorthand for {v:Int | p(v)}
  - max :: forall <p::Int->Bool>. Int<p> -> Int<p> -> Int<p>, instantiated with e.g. evenness at call site
- typeclass predicates preclude universal quantification, so laws must be constrained
uses
- index-dependent refinements: Vec a <dom,rng> for bounds, initialization, null-termination, memoized fib
- recursive refinements: sorted lists, unique lists, bst, heaps via head-tail relation
- inductive refinements: foldr quantifies the relation between input list and output
  - gives length, append with measures like len
liquid inference (H-SOLVE)
- templates with unknown predicates, subtyping constraints, solved by abstract interpretation over qualifiers
- eval: 6 program groups, 1,723 lines, 216 spec lines, 277 s total
  - needed occasional code changes such as ghost values
- soundness by translation to the contract calculus FH, not re-proved; call-by-name left to future work
verus transfer (inference)
- spec fn predicate with generic lemma requires p(x) && p(y), ensures p(result)
- recursive spec fn for sortedness over Seq; terminating spec fn len
- liquid-style inference not available in verus, agent-proposed predicates must still be verified
- results are haskell only, no agent or rust evaluation
