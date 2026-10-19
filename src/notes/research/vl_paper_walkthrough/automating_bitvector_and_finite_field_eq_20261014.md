# Automating Bitvector and Finite Field Equivalence Proofs in Lean
(authored by agents unless marked 🧑)
Tag: `pertseva2026bitvector`, [paper](http://arxiv.org/abs/2605.15163v1)

## problem and result
Zero-knowledge-proof (ZKP) arithmetizations describe machine bit operations with finite-field polynomials. Proving that the polynomial and the bitvector operation agree is difficult because finite-field conversion and inequalities create large SMT encodings. BitModEq is a Lean tactic that translates finite-field terms through natural numbers into bitvectors, proves bounds with a dedicated range-analysis calculus, then invokes bit-blasting. The abstract reports that it “outperforms state-of-the-art SMT solvers, solving 19% more ZKP arithmetization benchmarks.” (Abstract, PDF p. 1.)

The motivating Jolt `bvor` encoding uses `ff2bv` to relate a bitvector to a field element. The authors observe, “Our second insight is that the effectiveness of the translation primarily relies on range analysis.” (§1, PDF p. 2.) Their implementation is Lean v4.23.0 with `bv_decide` and mathlib (§4.4, PDF p. 15). The paper states termination and soundness theorems for both translation and range analysis (§4.2–4.3, PDF pp. 12–15), with proofs in Appendices A–B (PDF pp. 24–25); the final proof is checked by Lean’s kernel.

## technique 1: finite-field to bitvector translation

what it is and when to use it

Use this pipeline for quantifier-free equivalence goals where field variables encode bits or bounded machine values. It chooses natural numbers as the intermediate domain because most such variables are nonnegative and only upper bounds are needed. The paper’s four phases are: “1. Convert all terms of sort FP in the proof context to terms of sort N. 2. Discharge any inequalities over N in the original goal using range analysis. 3. Convert any remaining terms of sort N to bitvector terms. 4. Discharge the final bitvector equality goal via the bv_decide tactic.” (§4.1, PDF p. 7.)

how to do it

1. Represent a field-to-bitvector relation with `toNat` and `toBV`; replace an expensive field range polynomial with `toNat(e) < 2^N` and `bv = toBV(N,toNat(e))` when the encoding permits this (§2, PDF pp. 3–4).
2. Start with `sqrBds` to turn field constraints `t*t = t` into `toNat(t) ≤ 1`. Apply `injNat` to field equalities and `mvZModSub` to group additions before subtractions. Traverse terms from the root and push `toNat` through addition, multiplication, conditionals, and subtraction. Use `distNatSub` only when `toNat(t1) ≥ toNat(t2)` is proved; otherwise use `distNatSubOvrflw`, which adds the field modulus and retains `mod P` (§4.2, PDF pp. 9–11).
3. Factor nested modulo operations with `mvMod`; this does not require a range proof. Use `dropMod` only after proving the operand is below the modulus. Use `addBds` to add the bound `toNat(v) ≤ P−1` when a field variable has no such or tighter bound (Figure 2, PDF p. 9).
4. Discharge original natural-number inequality goals by range analysis. For equality conversion with `injBV`, prove both sides fit the target width. Figure 4 uses a common maximum width; footnote 7 says the implementation calculates widths per variable. Retain hypothesis inequalities over naturals and add bounded bitvector versions with `injBVLeqHyp`. Push `toBV` inward with `distBV` and `distBVIte`; `distBVSub` requires a bound on the minuend and a bitvector ordering proof, and `distBVMod` requires the operand and modulus to fit (§4.2, PDF pp. 10–12).
5. Run `bv_decide` on the final equality. If range goals remain unresolved, return unknown rather than claim a proof (§4.1, PDF p. 8).

The concrete `bvor` example drops a modulus only after proving `toNat(x0·y0) ≤ toNat(x0+y0)`; when that cannot be shown it retains modular wraparound (§4.1, PDF pp. 8–9). The paper states, “The theorem is proven once range analysis discharges all inequalities and bit-blasting discharges the final bitvector equality.” (§4.1, PDF p. 8)

Verus form

Inference: A Verus adaptation could define mathematical field and bitvector encodings as `spec fn`s, state conversion lemmas with `requires` bounds and `ensures` equalities, and expose intermediate facts with `assert`. This is a proposed adaptation; the paper implements and evaluates Lean, so it does not establish that Verus can discharge the same goals.

evidence and limits

On Jolt’s 8-bit Lasso and 32-bit Twist&Shout suites, BitModEq solved 24/24 and 12/15, versus cvc5 weak 21/24 and 5/15 (Table 3a, PDF p. 16). Strong SMT statement generation timed out on 9/24 Lasso and 15/15 T&S instances (Table 3b, PDF p. 16). Generation had a one-minute limit; Jolt solving had a 20-minute timeout and 16 GB memory limit (§5.2, PDF pp. 16–17).

On sampled CirC, BitModEq solved 737/1318, cvc5 621/1318, and cvc5-split 522/1318; BitModEq solved more instances at 13 of 17 tested even bit widths. The sample covers 0–6 arguments and even widths 0–32, with up to two benchmarks per arithmetization and width, under a five-minute timeout and 8 GB memory limit (Table 4 and §5.2, PDF p. 17). These are bounded benchmark results. Using large constants, multiplicative-inverse constraints, and field negation as an overapproximation, the authors estimate that 42% of CirC benchmarks contain field-specific behavior (§5.2, PDF p. 18). Average runtime on solved Jolt benchmarks is 52% range analysis, 23% translation, 21% `bv_decide`, and 4% kernel checking; the authors use type checking as a proxy for kernel checking (Table 6, PDF p. 18).

## technique 2: syntax-directed range analysis

what it is and when to use it

Range analysis proves natural-number inequalities needed to remove modular operations and choose widths. It is syntax-directed and introduces placeholder variables for intermediate bounds. Use it when generic tactics (`ring_nf`, `omega`, `aesop`, etc.) cannot exploit variable dependencies or become overwhelmed by coefficients. The paper says, “While incomplete, our range analysis is largely independent of numeric magnitude and can be more efficient than bit-blasting for large bit widths.” (§4.1, PDF p. 8)

how to do it

1. Decompose inequalities with `introPVar`, `leqAddMul`, `leqSub`, `leqMod`, and `leqIf`, introducing placeholders for subexpression bounds (Figure 5, PDF p. 12).
2. Eliminate placeholders with hypotheses (`ineqHyp`), field bounds (`leqZMod`), bitvector bounds (`leqBV`), nonnegativity (`geNat`), or constants (`ineqConst`) (Figure 6, PDF p. 13).
3. Evaluate closed constant inequalities with `eval`.
4. Apply `ineqCases` only when exactly two distinct original variables occur, both are bounded by 1, and the goal contains subtraction or variables on both sides. Enumerate their four assignments. Use `ineqXOR` for `v*t1 + (1−v)*t2` with `v ≤ 1`, rewriting it as `ite(v = 0, t2, t1)` (Figure 7 and §4.3, PDF pp. 13–15).
5. Repeat until no rule applies. Soundness requires every resulting goal to be discharged; otherwise the tactic reports failure/unknown. The calculus is terminating and sound but incomplete (§4.3, PDF pp. 14–15).

Verus form

Inference: A Verus adaptation could express range lemmas as `proof fn`s with explicit `requires` bounds and `ensures` inequalities, expose subexpression bounds with intermediate assertions, and use branches for the four bit assignments. The paper does not demonstrate this adaptation or an equivalent of Lean’s metavariable mechanism.

Evidence and limits

Table 5 compares full range analysis with disabling both `ineqCases` and `ineqXOR`, and with a portfolio of `ring_nf`, `linarith`, `nlinarith`, `aesop`, `grind`, and `omega`. Full analysis solved 24/24 Jolt Lasso, 12/15 T&S, and 737/1318 CirC; without case splits it solved 21/24, 8/15, and 720/1318; the portfolio solved 7/24, 4/15, and 434/1318 (Table 5, PDF p. 17; §5.3, PDF p. 18). The authors explain, “Case splits play a more significant role for the Jolt benchmarks because they tend to contain more variable dependencies.” (§5.3, PDF p. 18.) The calculus can strengthen goals and miss valid inequalities (§4.3, PDF p. 15). Implementation priority differs from the explanatory sequence above: it first tries `ineqCases`, `ineqXOR`, `ineqHyp`, and `ineqConst`; `geNat` is a last resort (§4.4, PDF p. 15).

## technique 3: bit-blasting and trusted checking

what it is and when to use it

After translation and bound discharge, `bv_decide` reduces the remaining fixed-width bitvector equality to a bit-blasted proof checked by the Lean kernel. This is suitable when the original field formula primarily simulates bit operations and all conversion bounds are explicit. It is less suitable for field-specific inverses, negation, or unbounded variables; cvc5’s theory combination can be more general there (§5.2, PDF p. 18).

how to do it

1. Normalize formulas with `simp`, `split_ifs`, and `split_ands`; rewrite commutativity and associativity as needed (§4.4, PDF p. 15).
2. Apply the `to_N` strategy to saturation, discharge original natural-number inequalities, then apply `to_BV`. The pseudocode computes a global maximum width from hypotheses and goals; the implementation calculates widths per variable (Figure 1, PDF p. 7; Figure 4 and footnote 7, PDF pp. 11–12).
3. Invoke `bv_decide`; accept only a kernel-checked proof.
4. Return unknown when range analysis or bit-blasting cannot discharge the remaining goals (Figure 1, PDF p. 7).

Verus form

Inference: A Verus adaptation should preserve explicit conversion bounds and distinguish proving an encoding from establishing that the encoding matches the intended circuit. This paper supplies no Verus implementation or assessment of its trusted components.

During tool comparison, SMT-based verification found a CirC soundness bug in 32-bit arithmetic right shift caused by integer overflow in its Rust implementation; it did not appear at smaller widths and was fixed after notification (§5.5, PDF pp. 18–19). The authors state, “The issue was uncovered via SMT-based verification during tool comparison, did not occur at smaller bit widths, and shows the importance of verification beyond toy sizes.” (§5.5, PDF p. 19.)

## what is proved, what stays trusted, and product threat

The paper states termination and validity preservation for the translation strategies, plus termination and soundness for range analysis (§4.2–4.3, PDF pp. 12–15; Appendices A–B, PDF pp. 24–25). It describes Lean proof checking as shrinking “the trusted computing base (TCB) to Lean’s small trusted kernel.” (§3.3, PDF p. 6.) Mathlib lemmas and tactic-generated proofs are checked by that kernel; the paper does not identify the tactic implementation as part of this trusted base.

Inference: Kernel checking establishes the stated theorem; it does not establish that benchmark extraction or source encodings capture the intended system. For VeruLaw, representation conversions and range assumptions should therefore be explicit. A proof of the wrong polynomial or an assumed overflow condition can miss the intended property. Any proposed Rust/Verus contribution should distinguish itself from BitModEq’s existing translation, bound analysis, and proof-checking workflow.

## techniques for the catalog

- finite-field to bitvector translation — convert field terms through bounded naturals, preserve modulo when bounds are unavailable, then bit-blast the fixed-width equality
- syntax-directed range analysis — decompose inequalities with placeholders, eliminate bounds from hypotheses, and use conservative bit case splits for dependencies
- width-aware bit-blasting — compute safe widths, normalize formulas, and discharge the resulting bitvector equality with a proof-producing checker
- explicit conversion soundness checks — prove validity preservation of translation rules and termination of their application strategies
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The majority of our translation and range analysis rules are implemented using existing lemmas in mathlib."): read the full paper including appendices and checked quotations, numbers, section/page references, translation rules, range analysis, and trust claims; corrected generation timeouts and limits, rule prerequisites, implementation widths, Table 5's page, SMT bug attribution, and unsupported Verus assertions; did not run the Lean implementation, reproduce experiments, inspect source code, or validate the proposed Verus adaptations.
