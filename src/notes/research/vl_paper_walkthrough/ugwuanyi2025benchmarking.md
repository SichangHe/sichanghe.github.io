# Benchmarking Energy Calculations Using Formal Proofs
(authored by agents unless marked 🧑)
Tag: `ugwuanyi2025benchmarking`, [paper](https://arxiv.org/abs/2505.09095)

## scope and result
LeanLJ formalizes Lennard-Jones pair energies in periodic boxes, proves mathematical properties, and executes floating-point code through polymorphic functions. The paper’s abstract says: “We introduce a strategy that uses polymorphic functions and type classes to bridge formal proofs (about idealized Real numbers) and executable programs (over floating point numbers).” (Abstract, PDF p.1) The authors compare four systems against NIST SRSW: 30, 200, 400, and 800 particles. Table 2 (p.21) reports Lean and NIST values for pair energy and long-range correction; the authors report agreement within the digits provided by NIST (§6, p.20). Inference: this comparison does not prove that NIST or the input files are correct. The discussion uses the stronger wording: “Our calculations agree to machine precision with the NIST reference values.” (§7, PDF p.21) Inference: Table 2 establishes agreement at the reported precision; it does not independently establish agreement to machine precision.

## technique 1: define and prove the idealized Lennard-Jones mathematics

when to use
Inference: start with pure, infinite-precision specifications before optimizing or executing. The truncated potential is `4ε((σ/r)^12-(σ/r)^6)` when `r≤r_c`, and zero otherwise (§3, pp.5–7). The paper writes two mathematically equivalent Lean definitions: a direct `lj` and an exponentiation-by-3/6/12 `lj_Real` (§4.2, pp.8–10).

steps
1. Define the direct piecewise function over `R` and mark it `noncomputable` (§4.2, p.9)
2. Define the optimized form using `r3`, `r6`, and `r12`
3. Prove `lj_eq` by unfolding both definitions, simplifying the branch, and using `ring_nf` (code, p.9)
4. State cutoff behavior under `r>r_c`, the in-range closed form under `0<r≤r_c`, and continuity restricted to `{r | 0<r ∧ r≤r_c}` (§4.2, p.10). The printed `cutoff_behaviour` calls `lj_Real ε σ r r_c`, although its definition takes arguments in the order `r r_c ε σ`. Inference: that listing does not establish the intended cutoff property as printed; the in-range and continuity statements use the intended distance variable
5. State domain limits explicitly: the paper says the function diverges at `r=0` and has a step at `r_c`, so whole-domain continuity is not claimed (§4.2, p.10)

Verus form
Inference: a candidate Verus adaptation is to specify the idealized potential, implement its factored form, and prove equivalence under explicit distance assumptions. This paper does not implement or validate that adaptation, or establish its connection to floating-point execution.

## technique 2: prove periodic wrapping and minimum-image distance

what it is
`pbc_Real(pos,L)=pos-L*round(pos/L)` wraps a coordinate. The key theorem is `|pbc_Real p L|≤L/2` for `L>0` (`abs_pbc_le`, §4.3, p.11). Minimum-image distance computes wrapped coordinate differences in three dimensions, sums squares, and takes a square root (§4.4, pp.11–12).

steps
1. Define `pbc_Real` over `R` (§4.3, p.11)
2. Let `δ=(p/L)-round(p/L)` and use the rounding bound `|δ|≤1/2`; rewrite the wrapped value as `L*δ` (proof code, p.11)
3. Prove non-negativity of square-root distance and zero distance from a point to itself (`minImageDistance_real_nonneg`, p.12; `minImageDistance_real_self`, p.13)
4. State that wrapped and unwrapped points have equal squared minimum-image distance when each box length is nonzero (`squaredminImageDistance_theorem`, p.12). The proof is omitted; the printed statement also puts `boxLength` first in calls to a function defined with positions first. Inference: treat the intended identity as the authors’ reported result, rather than a checked proof from this listing
5. Keep semantic types in mind: the authors note that using one real type for positions and displacements permits a position/displacement mix-up that Lean will not reject (§4.4, p.13)

Verus form
Inference: a candidate Verus adaptation would use a fixed-length coordinate representation, explicit box-length assumptions, and separate proofs of the rounding bound and distance identities. Distinct position and displacement types could express the semantic distinction the authors identify. Feasibility in Verus is not evaluated here.

## technique 3: derive long-range correction

The long-range correction is defined by an integral over `(r_c,∞)` and reduced to a closed form, implemented as `U_LRC_Real`. The paper states `long_range_correction_equality` under `0<r_c`, omitting its proof (§4.5, p.13). The closed form is `8πρε(σ^12/(9r_c^9) − σ^6/(3r_c^3))`. Inference: the reusable pattern is to specify an analytic integral, implement its closed form, and prove equality before execution. The printed theorem uses `U_LRC`, whereas the displayed definition is named `U_LRC_Real`; this study does not resolve that difference against the repository.

Inference: a Verus adaptation would need an explicit account of where the analytic equality is proved or assumed. The Lean paper supplies no Verus proof of that equality.

## technique 4: recursive pair enumeration with a cardinality proof

Lean’s functional implementation replaces nested loops with recursion. The paper gives a recursive accumulator and then a `pairs` helper producing index pairs such as `[(0,1),(0,2),(1,2)]` for n=3. It proves `pairs_length_eq (n): (pairs n).length = n*(n-1)/2` by induction (§5.1, pp.14–16). The pair list is folded into `total_energy_pairs`. The authors state: “Lean automatically checks functions for termination, which is quite important for recursive functions, lest they get trapped in an infinite loop.” (§5.1, p.16) Inference: the displayed pair-count theorem alone establishes neither uniqueness of pairs nor index safety; the displayed accumulator uses `positions[i]!` and `positions[j]!`. This study does not independently validate those accesses or the full summation.

Verus form
Inference: a candidate Verus adaptation would state the processed-pair count and accumulator meaning as loop invariants. Separate obligations should cover pair uniqueness, completeness, and valid indices; the length equation alone does not imply them.

## technique 5: polymorphic bridge from proofs to floats

A generic `pbc` and `lj_p` use type classes for subtraction, multiplication, division, rounding, square root, and comparisons. `RealLike` groups these operations so one definition works for `R` proofs and `Float` execution (§5.2, pp.16–19). The authors warn that Lean does not check whether the manually linked Real and Float functions are semantically equivalent; even a square-root/cube-root mismatch is technically possible (§5.2, p.18). They also state that Real proofs do not detect floating-point round-off error (§4.2, p.9).

Verus form
Inference: a candidate Verus adaptation needs an explicit relation between mathematical operations and the executed numeric operations. Any unproved correspondence remains an assumption. The paper’s generic code does not itself prove bounds on floating-point error.

## evidence, trusted boundary, and product threat

The setup is Lean 4.16.0-rc2, Mathlib commit e1a3d4c, and VS Code 1.96 (§2, p.4). Table 2’s four particle counts are the complete reported benchmark denominator. The authors explain that proofs concern pure functions, while CSV parsing and terminal parameters remain exposed: “if an incorrect value for σ were input, Lean would not catch it.” (§5.3, PDF p.20) They report that an early CSV reader failed to read all atoms and that tests caught the bug, whereas proofs did not (§5.3, p.20). They list further trust in Mathlib/core axioms, `RealLike` links, accidentally executing a Float function, user parameters, and the operating system (§7, p.21). Inference: this is directly relevant to VL’s spec-to-exec boundary. A proposed Verus product should connect the proved contract to the exact executed implementation and validate parsing/configuration; numerical agreement alone is insufficient. A possible follow-up is to evaluate numeric assumptions, I/O validation, and proof maintenance in a Verus implementation; the paper reports no such evaluation.

## techniques for the catalog

- idealized-then-optimized specification — define a direct real-valued function, optimize it, and prove the two forms equal
- periodic-boundary contracts — prove half-box wrapping and minimum-image distance identities under box-length assumptions
- analytic-to-closed-form proof — prove a long-range integral equals its real-valued closed form before linking execution
- recursive pair-count invariant — enumerate interaction pairs and prove the exact `n(n−1)/2` cardinality
- polymorphic proof/execution bridge — share generic numeric code while separately proving Real behavior and executing Float instances
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The RealLike type class manually links certain Real-typed and Float-typed functions, and mistakes in RealLike won’t be flagged by Lean."): checked the full text, quotations, numbers, page and section references, and technique descriptions; corrected references and benchmark precision, qualified inconsistent theorem listings and pair-count guarantees, and marked proposed adaptations as inferences; did not check the repository, execute Lean proofs, reproduce benchmarks, or validate Verus adaptations.
