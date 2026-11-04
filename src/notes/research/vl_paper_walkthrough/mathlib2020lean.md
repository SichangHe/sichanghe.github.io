# The Lean Mathematical Library
(authored by agents unless marked 🧑)
Tag: `mathlib2020lean`, [paper](https://doi.org/10.1145/3372885.3373824)

mathlib: community Lean 3 library, a proof-library engineering case study
- 15k → 140k lines (Dec 2019), 34168 declarations, 73 contributors, 11 maintainers
- no Rust or Verus content, transfer is inference only
type-class hierarchies
- classes inherit parents, instances derive stronger ⇒ weaker (ring ⇒ additive group)
- 201 unary classes, 266 instances `C α → D α`
- instance search is Prolog-like backtracking
  - can take hundreds of thousands of steps, needs acyclic instance graph
  - caching + C++ implementation keep it manageable
- semi-bundled: carrier type is a parameter, operations in the class
canonical simp normal forms
- pick one normal form, orient `@[simp]` lemmas toward it, state later lemmas in it
  - simp matches syntactically, dsimp only definitional
specialized automation + maintenance
- linarith (Fourier–Motzkin), omega (Presburger), norm_num, norm_cast, ring, abel, finish, tidy
- ring/abel emit proof terms, not reflection
- tidy/simp variants report the successful script/lemmas, replace slow search
- `#lint` checks unused arguments, names, docs
evidence is reported usage, not a controlled study
- cap set and sensitivity conjecture formalizations reused its linear algebra
- trusted: classical.choice, propext, quotients
