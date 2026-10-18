# Towards platform-independent verification of the standard mathematical functions: the square root function?
(authored by agents unless marked 🧑)
Tag: `shilov2018platform`, [paper](http://arxiv.org/abs/1801.00969v2)

This paper gives a human-oriented specification and pen-and-paper verification of Newton square root, then carries the proof through fixed-point and floating-point models. Its central design is to state simple assumptions about machine arithmetic instead of modeling one processor. The abstract says: “The primary purpose of the paper is to make explicit properties of the machine arithmetic that are sufficient to make verification presented in the paper.” (Abstract, p. 1) All evidence is manual; the paper names ACL2 as the proof assistant it plans to use later (Section 8, PDF p. 20). Page numbers below are PDF page numbers (25 pages); the arXiv PDF prints none.

## technique: replace an ambiguous library specification with an accuracy contract

What it is. The paper observes that a usual `sqrt` specification mixes an unrealistic exact-value requirement with a platform-dependent `0.5 ulp` note. It proposes a generic `SQR(Y,Eps)` for `Y ≥ 0`, `Eps > 0`, with postcondition `|returned value − √Y| ≤ Eps`, and defines a library-style `sqrt` as `SQR(Y, default(float)/2.0)`, where `default` is a new platform-dependent feature returning the ulp of a numeric type (Section 2, PDF pp. 5–6). The paper writes: “The first problem with the standard is type and platform dependence of the concept of the exact function” (Section 2, PDF p. 6), and adds that the specification and standards do not describe any validation procedure to check that an implementation conforms.

How to apply it.
1. Specify behavior for legal inputs and explicitly decide what happens for negative `Y` or nonpositive `Eps`; the paper remarks that its first Hoare specification is incomplete for those inputs (Section 2, PDF p. 7).
2. Use Newton's update `D := (Y/X − X)/2; X := X + D` and stop when `|D| < Eps/2` (Fig. 1, PDF p. 7; the C code loops `while (ab(D)>=Eps/2)`, with `X` initialized to `Y`).
3. State the total-correctness triple for real arithmetic: `[Y,Eps ∈ R & Y ≥ 0 & Eps > 0] SQR [|X − √Y| ≤ Eps]` (equation (3), Section 3, PDF p. 8; the paper calls it a “relaxation” of the second triple in (2)).
4. Split the proof into `0 ≤ Y < 1`, `Y = 1`, and `Y > 1`; the paper calls `Y = 1` trivial, says `0 ≤ Y < 1` and `Y > 1` are “ideologically” very similar, and proves only `Y > 1` (Section 3, PDF p. 8).

Verus form. Inference: define a `spec fn` for the mathematical square root contract and verify an executable Newton `fn` with `requires y >= 0 && eps > 0` and `ensures abs(x - sqrt_spec(y)) <= eps`. Use `invariant` for the bracket and positive accuracy. Verus cannot treat a runtime `proof fn` as computation, so the Newton update remains ordinary executable Rust and algebraic facts belong in erased proofs. If the input API preserves the paper's split cases, each case can be a separate lemma.

Evidence and limits. The proof assumes exact real operations and proves a relaxation of the generic contract. Inference: it does not establish behavior of the C `float` implementation from Fig. 1, and the specification still relies on a trusted mathematical square-root model.

## technique: prove Newton partial correctness with a bracket invariant

What it is. For the `Y > 1` case, the Floyd proof uses three control points. The invariant is `Y > 1 & Eps > 0 & √Y ≤ X ≤ Y`, and the postcondition is `|X − √Y| ≤ Eps` (Section 3.1, PDF pp. 8–9). The paper states: “Let us employ the Floyd method [6] for a pen-and-paper proof of partial correctness.” (Section 3.1, PDF p. 8)

How to apply it.
1. Initialize `X := Y`; the precondition implies the bracket `√Y ≤ X ≤ Y` (path 1..2, Section 3.1, PDF p. 9).
2. On the exit path, compute `D := (Y − X²)/(2X)` and use the test `|D| < Eps/2`. Algebra factors `|X−√Y|` through `|Y−X²|/(2X)` and the bracket to derive `|X−√Y| < Eps` (derivation (7), Section 3.1, PDF p. 9).
3. On the loop path, use AM-GM and the same bracket to show `√Y ≤ X + D ≤ Y`; thus the invariant is preserved when `|D| ≥ Eps/2` (derivation (8), Section 3.1, PDF pp. 9–10).
4. Prove termination by writing successive errors `d_n = (Y−x_n²)/(2x_n)` and deriving `|d_(n+1)|/|d_n| < 1/2`; therefore the loop stops after at most `1 + log₂((Y−√Y)/Eps)` iterations (Section 3.2, PDF p. 10).

Verus form (Inference, nothing in the paper concerns Verus): use a loop `invariant y > 1 && eps > 0 && sqrt_spec(y) <= x <= y`; add a lemma for the Newton bracket preservation and a lemma for the error ratio. The test is a Rust `while` guard; the invariant must include enough denominator facts to justify division by `2*x`. Termination may be supplied as a `decreases` expression based on a natural iteration bound, or by proving a bounded loop variant. The paper's real-number logarithm argument needs a discrete bound before it can be accepted by Verus.

Evidence and assumptions. The result is a pen-and-paper symbolic proof, with no measured iteration counts. It works over exact reals. The proof assumes `Y > 1`; the paper proves neither the `0 ≤ Y < 1` case nor the logarithmic bound for it. Inference: zero and subunit inputs are therefore not covered by the proof as written.

## technique: optimize initialization and make the loop count static

What it is. `ISQR` replaces the rough initial guess with `SUP(Y)` satisfying `√Y ≤ SUP(Y) ≤ Y`, and computes `|D|` directly as `AD := (X²−Y)/(2X)` (Section 4.1, PDF p. 10). For `SUP` returning rounded-up roots, so that `0 ≤ SUP(y)−√y < 1`, the paper gives the iteration bound `1 − log₂ ε`, instead of `1 + log₂ y − log₂ ε` for `SQR` (Section 4.1, PDF p. 11). It then defines `FSQR`, a non-adaptive for-loop whose iteration count is `N := any integer ≥ 1 + ⌈log₂((X−√Y)/Eps)⌉`, with `X = SUP(Y)` at that point (equation (10)), and proves the stronger assertion (11) with postcondition `|X−√Y| < Eps/2`; the annotated post-condition at control point 3 is `≤ Eps/2` (Section 4.2, PDF pp. 12–13).

How to apply it.
1. Supply `SUP` with the bracket contract (Section 4.1, PDF p. 11).
2. Initialize `X := SUP(Y)` and reuse the Newton invariant and path proofs (equation (9), PDF p. 11).
3. Choose `N` from the logarithmic bound; execute exactly `N` iterations (Fig. 4, Section 4.2, PDF p. 12).
4. Strengthen the invariant with a remaining-iterations counter `K` and a shrinking error bound; when `K = 0`, the bound is at most `Eps/2` (Section 4.2, PDF pp. 12–13).

Verus form (Inference): encode the precomputed bound as `requires`, and use a mutable `k: nat` with an invariant `0 <= k <= n` plus a `decreases k`. Keep the bracket and shrinking-error facts in the invariant. This fixed loop is easier for a verifier than a data-dependent termination proof, but the lookup-table contract itself remains trusted unless proved.

## technique: transfer exact Newton runs to fixed-point arithmetic

What it is. The fixed-point model has a finite `ValT`, exact addition/subtraction in range, and rounded multiplication/division with absolute error `< δT/2` (Section 5.1, PDF pp. 13–14). `fixSQR` runs the fixed-point version of `FSQR` and uses a lookup table `root`, an upward rounding function `round`, and step `Stp`. The table requirement (property ROOT) reads: “root is a pre-computed look-up table indexed by ArgStp”, such that `root[v] − δT < √v ≤ root[v]` for each index `v` in `ArgStp` (Section 5.2, PDF p. 15).

How to apply it.
1. Choose `Stp`, `root`, and `round` satisfying `STEP`, `ROOT`, and `ROUND` (Section 5.2, PDF pp. 14–15).
2. Select an integer `N` with `2^(N−1) ≥ Stp/Eps`; `N` is chosen non-deterministically as “some” such `n` (equation (12), PDF p. 14); Section 6 shows it is then a legal value for (10) because `SUP(y) − √y ≤ s` (PDF pp. 15–16).
3. Define `SUP` from the rounded index and lookup entry, then align a fixed-point run with an exact `FSQR` run using the same initial data (Section 6, PDF pp. 15–16).
4. Prove by induction that after `k` iterations, `|x'_k − x''_k| ≤ kδT` (equation (14), Section 6, PDF p. 16). The induction step bounds the new discrepancy by `|Δ|/2 + |Δ|/2 + δT`, so each iteration adds at most `δT`.
5. Conclude equation (13): `|X − √Y| < Eps/2 + N×δT` (equation (13), Section 5.2, PDF p. 15; proved at the end of Section 6, PDF p. 16).
6. Specialize to `mixSQR` with deterministic minimal `N` and require `Eps ≥ 2δT(2 + log₂(Stp/Eps))`; then the paper derives `|X − √Y| < Eps` (equation (15), Section 6, PDF pp. 16–17).

Verus form (Inference): make `round`, lookup validity, and operation-error bounds `spec fn` predicates. Use a `while` `invariant` carrying both exact-run value and machine-run value, and prove the induction step with arithmetic lemmas. The bound is an `ensures` expression containing `n * delta`; Rust integer types need explicit nonoverflow assumptions. (Not checked against the paper or any Verus documentation.)

Evidence and limits. The transfer proof is pen-and-paper and relies on the exact `FSQR` run's correctness (11) and the `STEP`/`ROOT`/`ROUND` properties; the fixed-point model treats range overflow only as an exception for addition and subtraction (Section 5.1). The paper remarks that “more iterations of the loop may be worse in accuracy” because of the addend `N × δT` in the postcondition (Section 6, PDF p. 16). There are no measured table sizes or runtime results.

## technique: reduce floating-point square root to fixed-point mantissa extraction

What it is. The floating-point model represents a positive `A` as `Man(A) × β_F^{Exp(A)}`. `fltSQR` extracts mantissa and exponent, adjusts the mantissa by one factor of `β_F` when the exponent is odd, calls verified `mixSQR`, and reconstructs the result. Its specification is equation (16): `|B − √A| < (Eps + δT/(2√β_F)) × β_F^⌊Exp(A)/2⌋`, with `⌊…⌋` integer round-down (Section 7, PDF pp. 17–19). Per Fig. 7 (PDF p. 18), the exponent is halved (`Z := Z/2`) and the result is `B := X × (β_F)^Z`.

How to apply it.
1. Assume finite floating values, exact `Man` and `Exp`, and exact reconstruction of the mantissa/exponent product (Section 7, PDF pp. 17–18).
2. If `Exp(A)` is odd, set `Y := Man(A) ⊗ β_F` and `Z := (Exp(A)−1)`; otherwise set `Y := Man(A)` and `Z := Exp(A)` (Fig. 7 and control-point annotations 2a, 2b, Section 7, PDF pp. 18–19).
3. Run `mixSQR` on `Y` in fixed-point arithmetic.
4. Reconstruct with `B := X × (β_F)^(Z/2)`, where `Z/2 = ⌊Exp(A)/2⌋` by (17). For odd `Exp(A)`, the proof bounds the fixed-point multiplication error `|Δ| < δT/2` through the Taylor expansion of `√(t+Δ)` as an alternating series, and uses `1 < Man(A)` to reach `Eps + δT/(2√β_F)` (property (18), Section 7, PDF pp. 20–21).

Verus form (Inference): model mantissa and exponent as verified specification functions and prove the odd/even case split in separate lemmas. Call the executable fixed-point kernel as ordinary Rust; its proof obligations are imported through its contract. The final bound includes the `δT/(2√β_F)` term, so a proof over `f64` that omits it would not implement this paper's contract.

Evidence and boundaries. The paper proves the reduction symbolically but does not verify a concrete IEEE format. It assumes exact decomposition and an integer exponent base. The conclusion says “All proofs in this paper are human-driven and oriented pen-and-paper proofs” and names validation with a proof assistant (ACL2) as the next topic (Section 8, PDF pp. 20–21).

## what is proved, measured, and trusted

The paper proves, by hand, real-arithmetic Newton partial and total correctness for `Y > 1`, optimized and fixed-loop variants, a fixed-point transfer bound, and a floating-point reduction contract. It reports no experiments, performance measurements, or machine proof artifacts. Its assumptions are the real square-root facts, the lookup table and rounding contracts, the fixed-point error axioms, exact mantissa/exponent operations, and unchecked manual algebra. Inference: a VL product using agent-written verified Rust faces substantial threat from wrong numeric assumptions and stale lookup tables even if the Newton loop verifies; the paper's contracts show exactly which assumptions must be made executable and checked.

Inference: the work already supplies the core Newton proof, iteration bounds, machine error accounting, and mantissa reduction. VL should avoid redoing those as informal design advice. A useful new task is a Verus implementation that proves the lookup table, fixed-point operations, and concrete format satisfy the paper's premises, then checks the resulting bound against actual library behavior.

## techniques for the catalog

- accuracy-first API: specify a generic `SQR(Y,Eps)` by an explicit absolute-error contract and define platform APIs through it
- Floyd Newton proof: preserve a square-root bracket, discharge the exit inequality, and prove termination by halving the Newton error
- static iteration scheduling: use an upper-root function and a logarithmic bound to replace an adaptive loop with a fixed count
- fixed-point run transfer: compare exact and rounded runs by induction and charge at most `δT` per iteration
- lookup-table initialization: provide rounded-up root entries and a rounding map with explicit coverage contracts
- mantissa reduction: normalize a floating argument, call the fixed-point kernel, and carry exponent and reconstruction error into the final bound

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In the new algorithm we use an additional variable Stp for a positive value in V alT , an array root, and a function round that have the following properties"): read the whole text and inspected the pages with equations (11), (16), ROOT and Fig. 7 as images; checked every quotation, equation number, bound and algorithm step against it, and replaced the earlier page numbers, which did not match the PDF, with PDF page numbers. Changed: the page references; the `sqrt` definition via `SQR(Y, default(float)/2.0)`; the ISQR iteration-bound comparison (`1 + log₂ y − log₂ ε`); FSQR `N` is any integer at least the bound, and equation (11) is strict `< Eps/2`; the ROOT quotation (it dropped the square root on `v`); equation (16), which is `(Eps + δT/(2√β_F)) × β_F^⌊Exp(A)/2⌋`, not `Eps + 2√(δT β_F)`; the claims about overflow and about the `0 ≤ Y < 1` case; and labelled my own conclusions "Inference:". Not checked: the Verus-specific advice and the VL-relevance remarks (they come from the study author, not the paper); the paper's algebra beyond matching the stated steps and bounds; the cited works.
