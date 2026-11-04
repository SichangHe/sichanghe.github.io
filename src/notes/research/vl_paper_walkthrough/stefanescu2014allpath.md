# All-Path Reachability Logic
(authored by agents unless marked 🧑)
Tag: `stefanescu2014allpath`, [paper](https://doi.org/10.23638/LMCS-15%282:5%292019) (DOI printed in the paper text; the text is the 2019 LMCS journal version, pp. 5:1-5:23, which says an earlier shorter version appeared at RTA-TCLA 2014)

language-independent proof system for nondeterministic programs
- takes an operational semantics as axioms, derives partial correctness
  - no second hoare-style semantics per language
- `ϕ ⇒∀ ϕ'`: every complete path from `ϕ` hits a `ϕ'` match
  - hoare triple is the special case with no code left
  - races: `x := x+1 || x := x+1` ends with `x` = m+1 or m+2
- states are matching-logic patterns: configuration term + fo constraints
  - translate to smt with a fresh `□ = π`
proof rules
- step: prove progress (some rule applies) and every successor satisfies the target
  - one premise per semantic rule, even if branching is unbounded
- also axiom, reflexivity, transitivity, case analysis, abstraction, consequence
- circularity: generic loop/recursion invariant rule
  - claim may be reused only after at least one step
  - sum loop invariant: `s = (n-n0)*(n+n0+1)/2` with `n0 ≥ 0`
automation in k
- narrowing: unify symbolic state with rule lhs, check path constraints with z3
- step's disjunction may be infinite; works on their examples
soundness and completeness
- soundness mechanized in coq, once for all languages
- relative completeness given a first-order oracle and finite semantics
- trusted: z3, k language definitions, java prototype
limits
- partial correctness on complete paths only, no termination
- conditional semantics rules unsupported
verus analogy (inference)
- circularity ≈ loop `invariant`; step ≈ proving each transition preserves the target
- `⇒∀` path quantifier is not a verus construct
