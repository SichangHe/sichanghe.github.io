# Array-Carrying Symbolic Execution for Function Contract Generation
(authored by agents unless marked 🧑)
Tag: `lu2026array`, [paper](https://doi.org/10.1007/978-3-031-37709-9_14)

symbolic execution that synthesizes ACSL `requires`/`ensures`/`assigns` for C
- success = Frama-C WP proves every generated goal
- prototype: about 19,000 lines of C++ on Clang/LLVM
queue-based path enumeration
- fork on `if`, update symbolic memory on assignments
- loops: call an external analyzer, conjoin its invariant and exit condition
- at exit: diff memory maps for `assigns`, project away temporaries, emit ACSL
- Verus analogue: ghost state for symbolic values, path enumeration stays outside Verus
carried array segments
- segment = base, offset, length, content summary
- read: substitute the offset into overlapping segments, keep a disjunction if several
- write: split the containing segment into prefix and suffix
- merge adjacent segments with equal summaries
- example `SearchZero`: quantified range `[0,i)` with `data[k] = 0`
  - Verus: `forall` over `Seq` + loop `invariant`
external invariant generators
- affine Farkas-lemma reasoning, idiom generators for search and max/min loops
- trusted for candidates only, Frama-C WP is the checker
results on 281 programs (SyGuS, OOPSLA-13, Frama-C, SV-Comp, X-509, openHiTLS)
- fully verified 68/281 vs 10/281 for AutoDeduct
- 143 partial, 1 timeout, 69 generation failures
- about 17.1x faster
- table and text averages disagree slightly (0.148s vs 0.160s)
limits
- unsupported `%`, `<<`, `>>`, nested loops, recursion
- weak pointers: base-plus-offset arrays only, no lists or trees
