# Program Synthesis from Polymorphic Refinement Types
(authored by agents unless marked 🧑)
Tag: `polikarpova2015program`, [paper](http://arxiv.org/abs/1510.08419v3)

result: Synquid synthesizes recursive functional programs from polymorphic refinement types
- synthesized and verified 64/64 benchmarks (sorting, BST, AVL, red-black trees)
  - all but 7 in under 5 s; 3 timed out (2 min limit)
- logic-based specs fit ops with complex rep invariant but simple abstract effect
  - example-based approaches fit complex exposed representations better
- BST op specs over 6x shorter than implementations
- logic limits: decidable quantifier-free logic only; some nested/filter transformations inexpressible
- no trusted-base discussion in paper
spec drives search
- refinement type `{ν : B | φ}` over measures, e.g. `replicate :: n:Nat → x:α → {List α | len ν = n}`
  - parametricity gives free content guarantee
- Verus (inference): `ensures` + `spec fn` measures; generate candidates from spec, not generate-then-verify
round-trip type checking
- push goal top-down, infer bottom-up, check subtyping at each E-term
  - catches errors at variable and application sites
- ablation: removing it times out 33/64 benchmarks
- completeness only relative to bottom-up liquid inference, weakened termination
- Verus: proof-organization pattern via helper lemmas and local `assert`
liquid abduction for branches
- infer weakest guard from a candidate branch's postcondition
  - e.g. `replicate` base case yields `n ≤ 0`
- limits: no function composition in guards; match abduction only for variable scrutinees
- Verus: guards written by hand, no synthesis
MUSFIX incremental solving
- greatest-fixpoint Horn solving by enumerating minimal unsatisfiable subsets
- ablation: breadth-first search instead times out 37/64
- precision limited to given qualifiers
termination + invariant inference
- recursive calls require strictly smaller measure
- polymorphic recursion + Horn solving infers BST sortedness invariant
  - other tools (Leon, Jennisys) cannot
- Verus: `decreases`; invariants must be written by hand
threat to agent-written Rust (inference)
- underspecified specs or missing qualifiers undermine guarantees
- benchmarks are not production-scale effectful code
