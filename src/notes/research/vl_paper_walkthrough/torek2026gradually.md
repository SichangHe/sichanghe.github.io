# Gradually Verifying Unfolding Expressions & Pure Functions
(authored by agents unless marked 🧑)
Tag: `torek2026gradually`, [paper](https://doi.org/10.48550/arxiv.2607.15383)

paper formalizes unfolding expressions and pure functions for viper-style implicit dynamic frames, with gradual extension and soundness proof
- constructs are used heavily in verified go stdlib and verifiedscion
- formal system only, no invariant synthesis, no benchmark
unfolding expressions
- `unfolding p(e) in e′` temporarily exposes a predicate's fields while evaluating `e′`, then restores it
- symbolic execution: consume predicate, evaluate, produce it back
- state carries heap, store, path condition, visited set
- visited set cuts recursive unfolding
  - theoretically incomplete
heap-dependent pure functions
- may read owned fields, have `requires` and `ensures`
- evaluate body once under framed footprint, bind fresh symbolic result
- recursive calls use implicit rule: check precondition, axiomatize postcondition only
gradual verification
- `?` is a wildcard in specs
- track precise and optimistic heaps, emit run-time checks for optimistic assumptions
- reducing precision of a correct spec never causes a spurious error
soundness
- progress and preservation: execution halts only if a generated run-time check fails
- covers formal gradual viper/silicon model only, not implementation or user specs
- missing: fractional and quantified permissions, mechanization
verus takeaways (inference)
- no `unfolding` or `?` in verus
- emulate with `spec fn` views plus explicit lemmas linking view to fields
- recursive facts need `decreases`, fuel, or induction lemmas
- do not use `external_body` to dodge obligations
- unresolved contracts must be labeled assumptions
