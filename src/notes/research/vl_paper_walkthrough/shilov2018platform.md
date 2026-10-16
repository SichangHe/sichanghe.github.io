# Towards platform-independent verification of the standard mathematical functions: the square root function?
(authored by agents unless marked 🧑)
Tag: `shilov2018platform`, [paper](http://arxiv.org/abs/1801.00969v2)

This paper gives a human-oriented specification and pen-and-paper verification of Newton square root, then carries the proof through fixed-point and floating-point models. Its central design is to state simple assumptions about machine arithmetic instead of modeling one processor. The abstract says: “The primary purpose of the paper is to make explicit properties of the machine arithmetic that are sufficient to make verification presented in the paper.” (Abstract, p. 1) All evidence is manual; the paper proposes ACL2 validation later.

## technique: replace an ambiguous library specification with an accuracy contract

What it is. The paper observes that a usual `sqrt` specification mixes an unrealistic exact-value requirement with a platform-dependent `0.5 ulp` note. It proposes a generic `SQR(Y,Eps)` for `Y ≥ 0`, `Eps > 0`, with postcondition `|returned value − √Y| ≤ Eps`, and defines a library-style `sqrt` by choosing half an ulp as `Eps` (Section 2, pp. 3–4). The paper writes: “The first problem with the standard is type and platform dependence of the concept of the exact function.” (Section 2, p. 3)

How to apply it.
1. Specify behavior for legal inputs and explicitly decide what happens for negative `Y` or nonpositive `Eps`; the paper notes its first Hoare specification is incomplete for those inputs (Section 2, p. 4).
2. Use Newton's update `D := (Y/X − X)/2; X := X + D` and stop when `|D| < Eps/2` (Fig. 1, p. 4).
3. State the total-correctness triple for real arithmetic: `[Y,Eps ∈ R & Y ≥ 0 & Eps > 0] SQR [|X − √Y| ≤ Eps]` (equation (3), Section 3, p. 5).
4. Split the proof into `0 ≤ Y < 1`, `Y = 1`, and `Y > 1`; the paper proves the last case and says the first is ideologically similar (Section 3, p. 5).

Verus form. Inference: define a `spec fn` for the mathematical square root contract and verify an executable Newton `fn` with `requires y >= 0 && eps > 0` and `ensures abs(x - sqrt_spec(y)) <= eps`. Use `invariant` for the bracket and positive accuracy. Verus cannot treat a runtime `proof fn` as computation, so the Newton update remains ordinary executable Rust and algebraic facts belong in erased proofs. If the input API preserves the paper's split cases, each case can be a separate lemma.

Evidence and limits. The proof assumes exact real operations and proves a relaxation of the generic contract. It does not establish behavior of the C `float` implementation from Fig. 1. The specification still relies on a trusted mathematical square-root model.

## technique: prove Newton partial correctness with a bracket invariant

What it is. For the `Y > 1` case, the Floyd proof uses three control points. The invariant is `Y > 1 & Eps > 0 & √Y ≤ X ≤ Y`, and the postcondition is `|X − √Y| ≤ Eps` (Section 3.1, p. 5). The paper states: “Let us employ the Floyd method [6] for a pen-and-paper proof of partial correctness.” (Section 3.1, p. 5)

How to apply it.
1. Initialize `X := Y`; the precondition implies the bracket `√Y ≤ X ≤ Y` (path 1..2, Section 3.1, p. 5).
2. On the exit path, compute `D := (Y − X²)/(2X)` and use the test `|D| < Eps/2`. Algebra factors `|X−√Y|` through `|Y−X²|/(2X)` and the bracket to derive the requested error (derivation (7), Section 3.1, p. 6).
3. On the loop path, use AM-GM and the same bracket to show `√Y ≤ X + D ≤ Y`; thus the invariant is preserved when `|D| ≥ Eps/2` (derivation (8), Section 3.1, pp. 6–7).
4. Prove termination by writing successive errors `d_n = (Y−x_n²)/(2x_n)` and deriving `|d_(n+1)|/|d_n| < 1/2`; therefore the loop stops after at most `1 + log₂((Y−√Y)/Eps)` iterations (Section 3.2, p. 7).

Verus form. Inference: use a loop `invariant y > 1 && eps > 0 && sqrt_spec(y) <= x <= y`; add a lemma for the Newton bracket preservation and a lemma for the error ratio. The test is a Rust `while` guard; the invariant must include enough denominator facts to justify division by `2*x`. Termination may be supplied as a `decreases` expression based on a natural iteration bound, or by proving a bounded loop variant. The paper's real-number logarithm argument needs a discrete bound before it can be accepted by Verus.

Evidence and assumptions. The result is a symbolic proof, with no measured iteration counts. It assumes exact order, division, and square-root inequalities. The logarithmic bound depends on `Y > 1` and does not directly cover zero or subunit values.

## technique: optimize initialization and make the loop count static

What it is. `ISQR` replaces the rough initial guess with `SUP(Y)` satisfying `√Y ≤ SUP(Y) ≤ Y`, and computes `|D|` directly. The paper reports an upper bound `1 − log₂(Eps)` when `SUP` is a rounded-up root, versus `1 + log₂((Y−√Y)/Eps)` for the original algorithm (Section 4.1, p. 8). It then defines `FSQR`, a non-adaptive for-loop, with an iteration count `N` selected to exceed `1 + log₂((SUP(Y)−√Y)/Eps)` and proves the stronger postcondition `|X−√Y| ≤ Eps/2` (equations (10)–(11), Section 4.2, pp. 8–9).

How to apply it.
1. Supply `SUP` with the bracket contract (Section 4.1, p. 8).
2. Initialize `X := SUP(Y)` and reuse the Newton invariant and path proofs (equation (9), p. 8).
3. Choose `N` from the logarithmic bound; execute exactly `N` iterations (Fig. 4, Section 4.2, p. 9).
4. Strengthen the invariant with a remaining-iterations counter `K` and a shrinking error bound; when `K = 0`, the bound is at most `Eps/2` (Section 4.2, pp. 9–10).

Verus form. Inference: encode the precomputed bound as `requires`, and use a mutable `k: nat` with an invariant `0 <= k <= n` plus a `decreases k`. Keep the bracket and shrinking-error facts in the invariant. This fixed loop is easier for a verifier than a data-dependent termination proof, but the lookup-table contract itself remains trusted unless proved.

## technique: transfer exact Newton runs to fixed-point arithmetic

What it is. The fixed-point model has a finite `ValT`, exact addition/subtraction in range, and rounded multiplication/division with absolute error `< δT/2` (Section 5.1, pp. 10–11). `fixSQR` runs the fixed-point version of `FSQR` and uses a lookup table `root`, an upward rounding function `round`, and step `Stp`. The table requirements are explicit: “root is a pre-computed look-up table indexed by ArgStp such that root[v] − δT < v ≤ root[v] for each index v ∈ ArgStp.” (Section 5.2, p. 12)

How to apply it.
1. Choose `Stp`, `root`, and `round` satisfying `STEP`, `ROOT`, and `ROUND` (Section 5.2, pp. 12–13).
2. Select an integer `N` with `2^(N−1) ≥ Stp/Eps`; this is the fixed-point analogue of the exact iteration bound (equation (12), p. 13).
3. Define `SUP` from the rounded index and lookup entry, then align a fixed-point run with an exact `FSQR` run using the same initial data (Section 6, p. 13).
4. Prove by induction that after `k` iterations, `|x'_k − x''_k| ≤ kδT` (equation (14), Section 6, p. 14). Each rounded update contributes at most `δT` to the discrepancy.
5. Conclude equation (13): `|X − √Y| < Eps/2 + N×δT` (Section 5.2, p. 13).
6. Specialize to `mixSQR` with deterministic minimal `N` and require `Eps ≥ 2δT(2 + log₂(Stp/Eps))`; then the paper derives `|X − √Y| < Eps` (equation (15), Section 6, p. 15).

Verus form. Inference: make `round`, lookup validity, and operation-error bounds `spec fn` predicates. Use a `while` `invariant` carrying both exact-run value and machine-run value, and prove the induction step with arithmetic lemmas. The bound is an `ensures` expression containing `n * delta`; Rust integer types need explicit nonoverflow assumptions. Do not write `modifies` or attach `ensures` to a `spec fn`; those are not the constructs used by Verus in the local Verus guide.

Evidence and limits. The transfer proof is pen-and-paper and assumes the exact run's correctness, table properties, representability, and no overflow. The paper itself warns that “more iterations of the loop may be worse in accuracy” because the `N×δT` term grows (Section 6, p. 15). There are no measured table sizes or runtime results.

## technique: reduce floating-point square root to fixed-point mantissa extraction

What it is. The floating-point model represents a positive `A` as `Man(A) × β_F^{Exp(A)}`. `fltSQR` extracts mantissa and exponent, adjusts the mantissa by one factor of `β_F` when the exponent is odd, calls verified `mixSQR`, and reconstructs the result. Its specification is equation (16): the root error is bounded by `Eps + 2√(δT β_F)` (with the exponent-dependent reconstruction factor) (Section 7, pp. 16–18).

How to apply it.
1. Assume finite floating values, exact `Man` and `Exp`, and exact reconstruction of the mantissa/exponent product (Section 7, pp. 16–17).
2. If `Exp(A)` is odd, set `Y := Man(A) ⊗ β_F` and `Z := (Exp(A)−1)`; otherwise set `Y := Man(A)` and `Z := Exp(A)` (control-point annotations, Section 7, p. 18).
3. Run `mixSQR` on `Y` in fixed-point arithmetic.
4. Reconstruct with exponent `floor(Z/2)` and use the fixed-point multiplication error plus a Taylor bound for `√(t+Δ)` to derive the final postcondition (Section 7, pp. 18–19).

Verus form. Inference: model mantissa and exponent as verified specification functions and prove the odd/even case split in separate lemmas. Call the executable fixed-point kernel as ordinary Rust; its proof obligations are imported through its contract. The final square-root bound must include the reconstruction rounding term, so a proof over `f64` that omits it would not implement this paper's contract.

Evidence and boundaries. The paper proves the reduction symbolically but does not verify a concrete IEEE format. It assumes exact decomposition and an integer exponent base. The conclusion says all proofs are human-driven and that ACL2 validation is future work.

## what is proved, measured, and trusted

The paper proves real-arithmetic Newton partial and total correctness, optimized and fixed-loop variants, a fixed-point transfer bound, and a floating-point reduction contract. It reports no experiments, performance measurements, or machine proof artifacts. Trusted components are the real square-root facts, the lookup table and rounding contracts, the fixed-point error axioms, exact mantissa/exponent operations, and manual algebra. Inference: a VL product using agent-written verified Rust faces substantial threat from wrong numeric assumptions and stale lookup tables even if the Newton loop verifies; the paper's contracts show exactly which assumptions must be made executable and checked.

The work already supplies the core Newton proof, iteration bounds, machine error accounting, and mantissa reduction. VL should avoid redoing those as informal design advice. A useful new task is a Verus implementation that proves the lookup table, fixed-point operations, and concrete format satisfy the paper's premises, then checks the resulting bound against actual library behavior.

## techniques for the catalog

- accuracy-first API: specify a generic `SQR(Y,Eps)` by an explicit absolute-error contract and define platform APIs through it
- Floyd Newton proof: preserve a square-root bracket, discharge the exit inequality, and prove termination by halving the Newton error
- static iteration scheduling: use an upper-root function and a logarithmic bound to replace an adaptive loop with a fixed count
- fixed-point run transfer: compare exact and rounded runs by induction and charge at most `δT` per iteration
- lookup-table initialization: provide rounded-up root entries and a rounding map with explicit coverage contracts
- mantissa reduction: normalize a floating argument, call the fixed-point kernel, and carry exponent and reconstruction error into the final bound

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
