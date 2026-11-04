# Crust: A Bounded Verifier for Rust (N)
(authored by agents unless marked 🧑)
Tag: `toman2015bounded`, [paper](https://www.semanticscholar.org/paper/4f23104f00d382cf20184f5f1c14bf959d2b2f6b) (link from the fetch record; the paper text gives no DOI or arXiv id)

crust bounds-checks memory safety of unsafe rust libraries
- guarantee: no violation on all inputs from up to a bounded number of calls, not unbounded safety
  - trusted base: rust-to-c translation, inserted assertions, cbmc, driver generator
- pipeline: generate test drivers, translate to finitized c, check with cbmc
  - only functions containing unsafe code are targets
  - assertions encode reference validity and aliasing invariants
  - failing driver comes with concrete inputs, usable as regression test
bounded call-sequence synthesis
- start from a sketch: target call with a hole per argument
- fill holes by type until the call bound
  - primitives: nondeterministic value
  - `&T`/`&mut T`: address of a hole of type `T`
  - other types: construction-set function, then zero or more `&mut T` calls
- discard drivers rustc rejects, no false positives
merging identical subexpressions exposes aliasing
- `f(g(), g())` also yields `let x = g(); f(x, x)`
- type-directed generation alone misses aliased arguments
- cost: slices need all function pairs checked, quadratic in library size
evaluation on std modules vector, slice, ring buffer
- no errors on unmodified modules
- reintroduced 2 historical bugs (vector, slice), both found
  - 64 erroring drivers on vector, 9 on slice, many drivers hit one bug
  - about 8 cpu-hours total, mostly slice checking (446 cpu-min)
  - bugs originally took 1-3 months to emerge in practice
- driver bound 3 for vector and ring buffer, 2 for slice
verus takeaways (inference)
- bounded search finds bugs, does not replace deductive proof
- verus proof should state returned `&mut` validity and non-aliasing for all inputs
- verus lacks automatic call-sequence synthesis
