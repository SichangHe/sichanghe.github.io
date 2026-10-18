# Computer-Assisted Verification of Four Interval Arithmetic Operators
(authored by agents unless marked 🧑)
Tag: `ishii2020computer`, [paper](http://arxiv.org/abs/2003.10623v2)

## scope and specification
The paper verifies WhyML implementations of interval addition, subtraction, multiplication, and division over IEEE-754 floating-point bounds. It checks validity, soundness, and tightness, and checks division’s zero-denominator exception. The abstract states, “First, we specify additional lemmas that support deductions made by back-end SMT solvers, which enable to discharge proof obligations in floating-point arithmetic containing nonlinear terms.” (Abstract, p. 1). It also reports, “In the experiments, applying the techniques in conjunction with the Alt-Ergo SMT solver and the Coq proof assistant proved the entire code.” (Abstract, p. 1). A second technique, a NaN-aware extremum operator, handles NaN in the tightness specification (Abstract, p. 1).

An interval is a closed or half-bounded real set represented by floating-point bounds; the ideal operator is the rounded hull of all real operand combinations (Section 2, Definition 1, p. 3). The paper’s interval arithmetic contains no empty intervals and has no division by an interval containing zero: its division operator throws an exception in that case (Section 2, p. 3; Figure B.5, p. 15). Those restrictions are part of the verified contract.

## technique: layered Why3 contracts
Use this when branch-heavy numeric code needs executable behavior plus mathematical postconditions.

1. Implement each operator as a WhyML function using IEEE-compatible `Float64.t` operations and explicit rounding (Sections 3.1 and 8.1, pp. 4, 10).
2. State validity (`P_V`), soundness (`Q_S`), and tightness (`Q_T`) as preconditions and postconditions; division also receives zero-division handling (`Q_Z`) (Section 8.1, p. 10).
3. Let Why3 generate verification conditions with weakest-precondition calculus, then assign Alt-Ergo or Coq to each VC (Section 3.1, p. 4). The platform reports four prover outcomes: “valid, invalid, timeout (within a configured time limit), or unknown.” (Section 3.1, p. 4).
4. Split difficult VCs (the paper does this through the Why3 GUI) when a monolithic goal is too hard; for multiplication soundness, the two VCs did not finish in 10 min, and splitting gave 26 partial VCs (Section 6.2, p. 8). The experiment compares no split, full split, and the split that needs minimum CPU time (Section 8.2, p. 11).

Inference: In Verus, encode validity and interval enclosure as `requires`/`ensures` over a mathematical interval model, and use `proof fn` lemmas for rounding facts. Rust’s floating-point operations and library contracts would need explicit trusted specifications; the WhyML proof does not carry over automatically.

## technique: solver-supporting arithmetic lemmas
Use this when SMT leaves nonlinear floating-point VCs unproved even though the required mathematical fact is simple.

1. Inspect each unproved VC and identify its real-number relation. The paper gives `Rmult_le_compat`:
`lemma Rmult_le_compat: forall r1 r2 r3 r4 : real. 0. <= r1 <= r2 /\ 0. <= r3 <= r4 -> r1 * r3 <= r2 * r4` (Section 6.2, p. 8).
2. Add the lemma to the same Why3 module (Section 6.2, p. 8). Why3 lets lemmas carry triggers that guide Alt-Ergo (Section 3.1, p. 4); `Rmult_le_compat` itself is shown without one.
3. Prove nonlinear helper lemmas interactively in Coq when SMT cannot prove them. The paper reports that `Rmult_le_compat` is “difficult to prove with SMT solvers because of the nonlinear terms but it is proved with Coq”, and that adding it discharged two of the unproved VCs with Alt-Ergo (Section 6.2, p. 8).
4. Repeat for the remaining branches and operators. Four more lemmas were needed for multiplication soundness (Section 6.2, p. 8). The authors identify 19 additional lemmas for complete verification (Section 1.1, p. 2; Section 8.1, p. 11).

Inference: In Verus, a corresponding `proof fn` with `requires` assumptions and an `ensures` inequality can expose the monotonicity fact to Z3. Trigger syntax and Why3’s Coq handoff have no direct Verus equivalent; the mathematical lemma is the reusable part.

## technique: NaN-aware extremum specification
Use this when a tightness property compares several rounded candidate bounds that may be NaN.

1. Define `min2` to ignore a NaN argument and otherwise return the lower operand; define `min4` by nesting `min2`. The paper says `max4` “is specified in the same way” (Section 7.1, p. 9).
2. Add lemmas describing the result’s relation to non-NaN arguments and the cases where it equals one argument. The paper’s `min4_feq`, `min4_fle`, and `min4_feq_w` use `[min4 w x y z]` triggers (Figure 3, p. 9).
3. Define predicates such as `mul_nan_case_inf` requiring all four downward products to be NaN (Section 7.2, p. 9).
4. Split tightness into ordinary lower/upper postconditions using `min4`/`max4`, plus a NaN-case postcondition requiring a zero interval when both `mul_nan_case_inf` and `mul_nan_case_sup` hold (Section 7.2, p. 10).
5. Add branch-specific rounding lemmas, such as `mul_down_positive_finite`, to close residual VCs: four VCs were left unproved after 10 min until it and `mul_up_negative_finite` were added (Section 7.3, p. 10).

Inference: A Verus model should use an explicit enum or predicate for NaN cases; ordinary Rust `f32`/`f64` comparisons are insufficient as a specification. The paper’s NaN-aware min/max are mathematical helpers, not runtime replacements unless separately implemented.

## evidence and limits
Table 2 reports all four operators verified. It records one branch for addition and subtraction, 13 for multiplication, and 7 for division; 19 additional lemmas total, with some proved by SMT and some by Coq (Table 2, p. 11; Section 8.1, p. 11). Inference: the table’s lemma column sums to 23 (2, 2, 2+4, 6+7), consistent with the text’s 19 only because the seven division lemmas include the four multiplication lemmas. Under split-optimal, Alt-Ergo took 24.7 s for addition (6 VCs), 47.0 s for subtraction (8), 140 s for multiplication (3), and 578 s for division (15). Division timed out without splitting and with full splitting, so the success denominator is four operators under the optimal split setting, not every configuration. The experiment used Why3 1.1.0, Alt-Ergo 2.2.0, Coq 8.8.0, Z3 4.7.1, a 4 GB memory limit, and a 10-minute limit per VC (Section 8.2, p. 11). Z3 proved only 1/8, 1/10, 48/100, and 2/33 of the full-split VCs for the four operators, respectively (Section 8.2, p. 11).

The extracted OCaml program required rounding operators implemented in C and interfaced with OCaml, and a Why3 extraction driver for `Float64.t` (Section 8.3, p. 11). Related work: Ayad and Marché verified only the soundness of an interval multiplication code with Frama-C; this paper adds tightness (Section 9, p. 11).

Inference: The threat to agent-written verified Rust is focused: branch-heavy numeric libraries remain proof-costly, and reusable arithmetic lemma libraries are valuable. The paper does not address Rust ownership, unsafe code, concurrency, or specification adequacy.

## techniques for the catalog
- layered numeric contracts — verify validity, enclosure, tightness, and exceptional cases as separate postconditions
- solver-supporting lemmas — add triggered real-number lemmas for nonlinear floating-point VCs and prove hard ones interactively
- NaN-aware extrema — define min/max operators and case predicates that make all-NaN behavior explicit
- VC splitting — compare unsplit, exhaustive, and cost-optimal decomposition of generated proof obligations
- proof extraction boundary — separate verified WhyML logic from trusted runtime rounding and extraction code
