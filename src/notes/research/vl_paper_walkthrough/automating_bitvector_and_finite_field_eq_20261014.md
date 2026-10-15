# Automating Bitvector and Finite Field Equivalence Proofs in Lean
(authored by agents unless marked 🧑)
Tag: `pertseva2026bitvector`, [paper](http://arxiv.org/abs/2605.15163v1)

## problem and result
Zero-knowledge-proof (ZKP) arithmetizations describe machine bit operations with finite-field polynomials. Proving that the polynomial and the bitvector operation agree is difficult because finite-field conversion and inequalities create large SMT encodings. BitModEq is a Lean tactic that translates finite-field terms through natural numbers into bitvectors, proves bounds with a dedicated range-analysis calculus, then invokes bit-blasting. The abstract reports that it “outperforms state-of-the-art SMT solvers, solving 19% more ZKP arithmetization benchmarks.” (Abstract, PDF p. 1.)

The motivating Jolt `bvor` encoding uses `ff2bv` to relate a bitvector to a field element. The authors observe, “The effectiveness of the translation primarily relies on range analysis.” (§1, PDF p. 2.) Their implementation is Lean v4.23.0 with `bv_decide` and mathlib (§4.4, PDF p. 15). The paper proves termination and soundness theorems for both translation and range analysis (§4.2–4.3, PDF pp. 11–15); the final bitvector equality is checked by Lean’s kernel.

## technique 1: finite-field to bitvector translation

what it is and when to use it

Use this pipeline for quantifier-free equivalence goals where field variables encode bits or bounded machine values. It chooses natural numbers as the intermediate domain because most such variables are nonnegative and only upper bounds are needed. The paper’s four phases are: “1. Convert all terms of sort FP in the proof context to terms of sort N. 2. Discharge any inequalities over N in the original goal using range analysis. 3. Convert any remaining terms of sort N to bitvector terms. 4. Discharge the final bitvector equality goal via the bv_decide tactic.” (§4.1, PDF p. 7.)

how to do it

1. Represent a field-to-bitvector relation with `toNat` and `toBV`; replace an expensive field range polynomial with `toNat(e) < 2^N` and `bv = toBV(N,toNat(e))` when the encoding permits this (§2, PDF pp. 3–4).
2. Traverse terms from the root and push `toNat` through addition, multiplication, conditionals, subtraction, and modulo. Use `distNatSub` only when a nonnegative result is proved; otherwise use the overflow-safe rule that adds the field modulus and retains `mod P` (§4.2, PDF pp. 8–10).
3. Detect bit encodings with `sqrBds`; add field-variable bounds with `addBds`; factor or drop modulo only after proving the operand is below the modulus.
4. Select a bit width that covers every relevant term. Push `toBV` through arithmetic and conditionals using `injBV`, `distBV`, `distBVIte`, `distBVSub`, and `distBVMod`; preserve inequalities in both natural and bitvector forms for later range reasoning (§4.2, PDF pp. 10–12).
5. Run `bv_decide` on the final equality. If range goals remain unresolved, return unknown rather than claim a proof (§4.1, PDF p. 8).

The concrete `bvor` example drops a modulus only after proving `toNat(x0·y0) ≤ toNat(x0+y0)`; when that cannot be shown it retains modular wraparound (§4.1, PDF pp. 8–9). The paper states, “The theorem is proven once range analysis discharges all inequalities and bit-blasting discharges the final bitvector equality.” (§4.1, PDF p. 8)

Verus form

Inference: In Verus, define mathematical field and bitvector encodings as `spec fn`s over `nat` or bounded integer types, prove conversion lemmas with `requires` bounds and `ensures` equalities, and use `assert` to trigger arithmetic and bitvector solver reasoning. Verus does not provide Lean’s `bv_decide` tactic; the final equivalence must be discharged by Verus-supported SMT reasoning or explicit lemmas. The paper’s proof-producing translation pattern carries over, but Lean kernel checking and the exact calculus do not.

evidence and limits

On Jolt’s 8-bit Lasso and 32-bit Twist&Shout suites, BitModEq solved 24/24 and 12/15, versus cvc5 weak 21/24 and 5/15 (Table 3, PDF p. 16). Strong cvc5 timed out during generation on 24/24 Lasso and 15/15 T&S instances; each timeout is under the 20-minute, 16 GB Jolt limit (§5.2, PDF p. 17). On sampled CirC, BitModEq solved 737/1318, cvc5 621/1318, and cvc5-split 522/1318; BitModEq won at 13 of 17 tested even bit widths (Table 4, PDF pp. 17–18). These denominators are benchmark counts, not percentages of all possible CirC programs. Field-specific behavior remains difficult: the authors estimate 42% of CirC benchmarks contain inverses, negation, or large constants (§5.2, PDF p. 18). Range analysis consumes 52% of runtime on solved Jolt benchmarks, translation 23%, bit-blasting 21%, and kernel checking 4% (Table 6, PDF p. 18).

## technique 2: syntax-directed range analysis

what it is and when to use it

Range analysis proves natural-number inequalities needed to remove modular operations and choose widths. It is syntax-directed and introduces placeholder variables for intermediate bounds. Use it when generic tactics (`ring_nf`, `omega`, `aesop`, etc.) cannot exploit variable dependencies or become overwhelmed by coefficients. The paper says, “While incomplete, our range analysis is largely independent of numeric magnitude and can be more efficient than bit-blasting for large bit widths.” (§4.1, PDF p. 8)

how to do it

1. Decompose inequalities with `introPVar`, `leqAddMul`, `leqSub`, `leqMod`, and `leqIf`, introducing placeholders for subexpression bounds (Figure 5, PDF p. 12).
2. Eliminate placeholders with hypotheses (`ineqHyp`), field bounds (`leqZMod`), bitvector bounds (`leqBV`), nonnegativity (`geNat`), or constants (`ineqConst`) (Figure 6, PDF p. 13).
3. Evaluate closed constant inequalities with `eval`.
4. Detect bit-variable dependencies with `ineqCases`; enumerate four assignments for two Boolean-like variables. Recognize XOR encodings with `ineqXOR`, converting a guarded expression into an `if`/`then`/`else` form (Figure 7, PDF p. 13).
5. Repeat until no rule applies. Soundness requires every resulting goal to be discharged; otherwise the tactic reports failure/unknown. The calculus is terminating and sound but incomplete (§4.3, PDF pp. 14–15).

Verus form

Inference: Encode each range lemma as a Verus `proof fn` with explicit `requires` bounds and `ensures` inequalities. Placeholder decomposition can be implemented as ghost variables and intermediate assertions; two-variable case splits use `if` branches with proved conditions. Verus loop invariants, where an iterative translation is executable, must state the bound preserved at each iteration. This is a design pattern, not a claim that Verus implements BitModEq’s calculus.

Evidence and limits

Table 5 compares full range analysis with no case splits and a portfolio of Lean tactics. Full analysis solved 24/24 Jolt Lasso, 12/15 T&S, and 737/1318 CirC; without case splits it solved 21/24, 8/15, and 720/1318; generic Lean tactics solved 7/24, 4/15, and 434/1318 (Table 5, PDF p. 18). Case analysis therefore matters most on Jolt’s dependent bit encodings. The calculus can strengthen goals and miss valid inequalities, so incompleteness is expected (§4.3, PDF p. 15).

## technique 3: bit-blasting and trusted checking

what it is and when to use it

After translation and bound discharge, `bv_decide` reduces the remaining fixed-width bitvector equality to a bit-blasted proof checked by the Lean kernel. This is suitable when the original field formula primarily simulates bit operations and all conversion bounds are explicit. It is less suitable for field-specific inverses, negation, or unbounded variables; cvc5’s theory combination can be more general there (§5.2, PDF p. 18).

how to do it

1. Normalize formulas with `simp`, `split_ifs`, and `split_ands`; rewrite commutativity and associativity as needed (§4.4, PDF p. 15).
2. Apply the `to_N` strategy to saturation, then `to_BV` with a global maximum width computed from hypotheses and goals (Figure 4, PDF pp. 11–12).
3. Invoke `bv_decide`; accept only a kernel-checked proof.
4. Record unknown goals and retain the original field proof obligation for manual or alternate-solver handling.

Verus form

Inference: Verus can use bitvector-typed spec values and `assert`/lemma proofs, but there is no direct guarantee that a single tactic reproduces Lean’s kernel-certified bit-blasting. The trusted boundary instead includes Verus’s SMT translation and solver. A VL implementation should preserve the explicit bound checks and treat solver success as proof of the stated encoding, not evidence that the encoding matches the intended circuit.

The evaluation found a real CirC soundness bug in 32-bit arithmetic right shift caused by integer overflow in its Rust implementation; it did not appear at smaller widths and was fixed after notification (§5.5, PDF p. 19). This demonstrates why verifying arithmetization implementations matters in addition to checking generated circuits.

## what is proved, what stays trusted, and product threat

The formal theorems establish termination and validity preservation of the two translation strategies, plus termination and soundness of range analysis (§4.2–4.3, PDF pp. 11–15). Experiments measure solved benchmark counts and runtime under stated limits. Lean’s kernel checks generated proofs, but Lean, mathlib, the tactic implementation, benchmark extraction, and the source encodings remain trusted inputs. Inference: For VeruLaw, the useful lesson is to make representation conversions and range assumptions explicit before asking Verus to prove code properties. The product threat is specification or encoding error: a perfectly checked proof can certify the wrong finite-field polynomial or a weak overflow assumption. Existing BitModEq already covers the finite-field/bitvector translation, dedicated bound calculus, and kernel-checking workflow; VL should not redo those claims without a Rust/Verus-specific contribution.

## techniques for the catalog

- finite-field to bitvector translation — convert field terms through bounded naturals, preserve modulo when bounds are unavailable, then bit-blast the fixed-width equality
- syntax-directed range analysis — decompose inequalities with placeholders, eliminate bounds from hypotheses, and use conservative bit case splits for dependencies
- width-aware bit-blasting — compute a safe common width, normalize formulas, and discharge the resulting bitvector equality with a proof-producing checker
- explicit conversion soundness checks — prove termination and validity preservation for every rewrite before accepting the translated goal
Checked 2026-10-14 against the paper by a Codex agent: audit record pertseva2026bitvector; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
