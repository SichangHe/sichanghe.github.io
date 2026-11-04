# The Lean 4 Theorem Prover and Programming Language
(authored by agents unless marked 🧑)
Tag: `demoura2021lean4`, [paper](https://doi.org/10.1007/978-3-030-79876-5_37)

what it is
- Lean 4 is a reimplementation of the Lean itp in Lean itself, also a compiled functional language
- system paper: executable snippets, no proof-success benchmark, no autonomous proof generation eval
proof patterns
- computation: `def`, `#eval`, close reductions with `rfl`
- structural induction on inductive types
  - `BoolExpr` example: `simplify` bottom-up, `denote` semantics
  - `denote_simplify` by `induction`, `simp [ih1, ih2]` per case
  - register reusable equalities with `@[simp]`
- verus analogue (inference)
  - exec fn + `spec fn` model + `proof fn` induction
  - lean definitional equality and tactic syntax do not carry over
typeclasses and decision
- tabled typeclass resolution with discrimination trees
- `deriving` and `decide` only work when a `Decidable` instance exists
- verus has traits but no instance table or `deriving`
extensibility
- user-extensible parser, elaborator, tactics, decision procedures, pretty printer, code generator
- hygienic macros: parsing separated from expansion, capture-avoiding
- compiler emits C, so automation can be compiled and loaded as plugin
- fbip: reference counting lets unshared lists and arrays update in place, no allocation
trust and limits
- small trusted kernel, the final evidence
- also trusted: compiler, generated C, metaprograms, axioms, user theorem statements
- perf claim beats ocamlopt and GHC is preliminary, cites other work
- threat to verus-agent products (inference)
  - high if novelty is only extensible syntax or tactic plugins
  - lower for spec discovery plus complete verus proofs on systems code, not evaluated here
