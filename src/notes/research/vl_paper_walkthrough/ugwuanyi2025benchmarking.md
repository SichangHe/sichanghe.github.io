# Benchmarking Energy Calculations Using Formal Proofs
(authored by agents unless marked 🧑)
Tag: `ugwuanyi2025benchmarking`, [paper](https://arxiv.org/abs/2505.09095)

## scope and result
LeanLJ formalizes Lennard-Jones pair energies in periodic boxes, proves mathematical properties, and executes floating-point code through polymorphic functions. The paper’s abstract says: “We introduce a strategy that uses polymorphic functions and type classes to bridge formal proofs (about idealized Real numbers) and executable programs (over floating point numbers).” (Abstract, PDF p.1) The authors compare four systems against NIST SRSW: 30, 200, 400, and 800 particles. Table 2 (p.21) reports Lean and NIST values for pair energy and long-range correction; all four rows agree to the digits shown. This is a test comparison, not a proof that NIST or input files are correct. The discussion states: “Our calculations agree to machine precision with the NIST reference values.” (Discussion, PDF p.21)

## technique 1: define and prove the idealized Lennard-Jones mathematics

when to use
Start with pure, infinite-precision specifications before optimizing or executing. The truncated potential is `4ε((σ/r)^12-(σ/r)^6)` when `r≤r_c`, and zero otherwise (§3, pp.5–7). The paper writes two mathematically equivalent Lean definitions: a direct `lj` and an exponentiation-by-3/6/12 `lj_Real` (§4.2, pp.8–10).

steps
1. Define the direct piecewise function over `R` and mark it `noncomputable` (§4.2, p.9)
2. Define the optimized form using `r3`, `r6`, and `r12`
3. Prove `lj_eq` by unfolding both definitions, simplifying the branch, and using `ring_nf` (code, p.9)
4. Prove cutoff behavior under `r>r_c`, the in-range closed form under `0<r≤r_c`, and continuity on the closed positive domain (Theorems `cutoff_behaviour`, `ljp_eq_le`, `lj_p_continuous_closed_domain`, pp.10–11)
5. State domain limits explicitly: the paper says the function diverges at `r=0` and has a step at `r_c`, so whole-domain continuity is not claimed (§4.2, p.10)

Verus form
Inference: use a `spec fn` for the idealized potential and a `proof fn` to establish equivalence of direct and factored forms under explicit nonzero/positive-distance preconditions. A Rust executable function can implement the branch, with `requires` for valid parameters and `ensures` matching the specification. Verus does not provide Lean’s `noncomputable` keyword or `ring_nf`; arithmetic lemmas and solver facts must be expressed using supported Verus proof constructs.

## technique 2: prove periodic wrapping and minimum-image distance

what it is
`pbc_Real(pos,L)=pos-L*round(pos/L)` wraps a coordinate. The key theorem is `|pbc_Real p L|≤L/2` for `L>0` (`abs_pbc_le`, §4.3, pp.11–12). Minimum-image distance computes wrapped coordinate differences in three dimensions, sums squares, and takes a square root (§4.4, pp.12–13).

steps
1. Define `pbc_Real` over `R` (§4.3, p.11)
2. Let `δ=(p/L)-round(p/L)` and use the rounding bound `|δ|≤1/2`; rewrite the wrapped value as `L*δ` (proof code, p.12)
3. Prove non-negativity of square-root distance and zero distance from a point to itself (`minImageDistance_real_nonneg`, `minImageDistance_real_self`, p.13)
4. Prove wrapped and unwrapped points have equal squared minimum-image distance when each box length is nonzero (`squaredminImageDistance_theorem`, p.12)
5. Keep semantic types in mind: the authors note that using one real type for positions and displacements permits a position/displacement mix-up that Lean will not reject (§4.4, p.13)

Verus form
Inference: represent a 3-vector as a fixed-length structure or sequence with length invariants; use `requires` for positive/nonzero box lengths and `ensures` for the half-box bound and distance identities. Prove the rounding lemma separately. Verus’s integer/real support and available nonlinear arithmetic determine whether an explicit lemma is needed; do not assume Lean tactics transfer.

## technique 3: derive long-range correction

The long-range correction is defined by an integral over `(r_c,∞)` and reduced to a closed form, implemented as `U_LRC_Real`. The paper proves `long_range_correction_equality` under `0<r_c` (§4.5, pp.13–14). This is a reusable pattern: specify an analytic integral, implement its closed form, and prove equality before execution.

Inference: in Verus, keep the integral as an external mathematical specification or a separately proven lemma; Verus is aimed at program contracts, so the analytic derivation may need a trusted lemma or a different proof library. Any such trust must be recorded rather than presented as an automatically checked Verus fact.

## technique 4: recursive pair enumeration with a cardinality proof

Lean’s functional implementation replaces nested loops with recursion. The paper gives a recursive accumulator and then a `pairs` helper producing index pairs such as `[(0,1),(0,2),(1,2)]` for n=3. It proves `pairs_length_eq (n): (pairs n).length = n*(n-1)/2` by induction (§5.1, pp.14–16). The pair list is folded into `total_energy_pairs`; Lean checks termination and array bounds (§5.1, p.16).

Verus form
Inference: write executable Rust loops or recursive functions and add a loop invariant expressing processed-pair count and accumulator meaning. Use `invariant` as a loop clause, and `ensures` for the final count/energy relation. A sequence-length theorem can be a `proof fn`; it must not be called at runtime.

## technique 5: polymorphic bridge from proofs to floats

A generic `pbc` and `lj_p` use type classes for subtraction, multiplication, division, rounding, square root, and comparisons. `RealLike` groups these operations so one definition works for `R` proofs and `Float` execution (§5.2, pp.16–19). The authors warn that Lean does not check whether the manually linked Real and Float functions are semantically equivalent; even a square-root/cube-root mismatch is technically possible (§5.2, p.18). They also state that Real proofs do not detect floating-point round-off error (§4.2, p.10).

Verus form
Inference: use a trait or separate specification/executable functions, then prove a refinement relation only for operations whose rounding behavior is modeled. Verus integer arithmetic is not a proof of IEEE floating-point semantics. If a float library is outside Verus’s model, its contract is trusted and must be listed as such.

## evidence, trusted boundary, and product threat

The setup is Lean 4.16.0-rc2, Mathlib commit e1a3d4c, and VS Code 1.96 (§2, p.4). Table 2’s four particle counts are the complete reported benchmark denominator. The authors explain that proofs concern pure functions, while CSV parsing and terminal parameters remain exposed: “if an incorrect value for σ were input, Lean would not catch it.” (§5.3, PDF p.20) They report that an early CSV reader failed to read all atoms and that tests caught the bug, whereas proofs did not (§5.3, p.20). They list further trust in Mathlib/core axioms, `RealLike` links, accidentally executing a Float function, user parameters, and the operating system (§7, pp.21–22). Inference: this is directly relevant to VL’s spec-to-exec boundary. A Verus product must connect the proved contract to the exact executed implementation and validate parsing/configuration; numerical agreement alone is insufficient. Existing VL should not redo the LeanLJ benchmark unchanged; it should measure a Verus-supported numeric domain, floating-point assumptions, I/O validation, and proof maintenance.

## techniques for the catalog

- idealized-then-optimized specification — define a direct real-valued function, optimize it, and prove the two forms equal
- periodic-boundary contracts — prove half-box wrapping and minimum-image distance identities under box-length assumptions
- analytic-to-closed-form proof — prove a long-range integral equals its executable formula
- recursive pair-count invariant — enumerate interaction pairs and prove the exact `n(n−1)/2` cardinality
- polymorphic proof/execution bridge — share generic numeric code while separately proving Real behavior and executing Float instances
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
