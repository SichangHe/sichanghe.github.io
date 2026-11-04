# SMT-Based Translation Validation for Machine Learning Compiler
(authored by agents unless marked 🧑)
Tag: `bang2022smt`: [paper](https://doi.org/10.1007/978-3-031-13188-2_19)

`mlir-tv`: SMT translation validator for MLIR transformations (8,900 lines C++)
- encodes source and target to final state `(ub, memory, value)`; checks refinement `fsrc ⊑ ftgt`
  - unsat = validated; model = bug witness
- abstraction refinement on failure or timeout
over-approximate floating point
- small bit-vectors of `ceil(log2 N)` bits, N = applied UFs + FP args + distinct constants
- UFs constrained by FP properties (including unsafe ones like associativity)
- proved in abstraction ⇒ correct for concrete FP; failure is inconclusive
- bounded dynamic tensor size (100) voids the no-missed-bugs claim
tensor, loop, memory encoding
- tensor = 1-D row-major SMT array plus uninitialized-flag array; ops as lambdas
- linalg loops: bounds from indexing maps; shape mismatch = UB
- memory split into blocks with size, type, writability, liveness
hash encoding of reduction commutativity
- sum of UF `f` over elements; equal hashes ⇒ permutation (Thm 1)
- existential over `f` moves out, so precondition is quantifier-free
staged abstraction refinement
- independent UFs → composed dot products → cast encoding → unrolled small sums
- IEEE-754 flag disables unsafe reduction properties
evidence
- 57 hand-written pairs: abstract FP 13.6x faster than IEEE-754
- 2,467 unit tests: 433 validated, 8 timeouts, 8 failures
- 3 TF Lite models: SqueezeNet and MobileNet last 2 transformations failed (unsupported ops)
