# Modular Information Flow through Ownership
(authored by agents unless marked 🧑)
Tag: `crichton2022modular`, [paper](https://doi.org/10.1145/3519939.3523445)

Flowistry: modular information-flow analysis for safe Rust using only callee type signatures
- ownership types give sound, precise flow through calls
- soundness = noninterference, proved in the Oxide model (Appendix A.2)
  - values only, not termination or timing
  - unsafe, raw pointers, interior mutability are outside the guarantee
dependency context Θ maps each place to a set of expression labels
- assignment adds the expression's deps to all conflicting places
  - conflicts = ancestors and descendants in the type tree, not siblings
  - `t.1 := 3` updates Θ(t), Θ(t.1), not Θ(t.0)
- flow-sensitive, field-sensitive
pointer analysis comes free from ownership
- loans: borrow `&r ω p` starts Γ(r)={p}, propagate along outlives constraints to fixpoint
- write through a reference adds deps to every unique loan
- Rust builds no loan sets itself, so the implementation reconstructs them from outlives constraints
call summary from signature alone
- return depends on all readable inputs (κarg)
- κarg also added to every place reachable via unique references
- no callee body needed, so higher-order functions are trivial
implementation: forward dataflow over MIR
- join = key-wise union, iterate to fixpoint
- control dependence from post-dominator frontier; panics excluded
evaluation: 10 crates, 286,682 LOC, 3.49M data points
- modular = whole-program result in 94% of cases
  - median dependency-set increase in the other 6%: 7%
- ablations
  - no mutability info: 39% differ, median +50%
  - no lifetimes: 17% differ, median +56%
- speed: median 370 μs/function
  - rg3d `GameEngine::render`: 0.13 s modular vs 23.18 s whole-program
- tools: intraprocedural IFC checker, VSCode slicer
Verus relevance (inference)
- could encode the map as a ghost `spec fn` with conflict lemmas
- call summaries as predicates plus lemmas
- MIR extraction and fixpoint stay external to Verus
