# Computer-Assisted Verification of Four Interval Arithmetic Operators
(authored by agents unless marked 🧑)
Tag: `ishii2020computer`, [paper](http://arxiv.org/abs/2003.10623v2)

## scope and specification
The paper verifies WhyML implementations of interval addition, subtraction, multiplication, and division over IEEE-754 floating-point bounds. It checks validity, soundness, and tightness, and checks division’s zero-denominator exception. The abstract states, “First, we specify additional lemmas that support deductions made by back-end SMT solvers, which enable to discharge proof obligations in floating-point arithmetic containing nonlinear terms.” (Abstract, p. 1). It also reports, “In the experiments, applying the techniques in conjunction with the Alt-Ergo SMT solver and the Coq proof assistant proved the entire code.” (Abstract, p. 1). A second technique handles NaN in tightness.

An interval is a closed or half-bounded real set represented by floating-point bounds; the ideal operator is the rounded hull of all real operand combinations (Section 2, p. 2). The paper’s implementation assumes nonzero positive divisors and excludes empty intervals and division by an interval containing zero (Section 2, p. 3). Those assumptions are part of the verified contract.

## technique: layered Why3 contracts
Use this when branch-heavy numeric code needs executable behavior plus mathematical postconditions.

1. Implement each operator as a WhyML function using IEEE-compatible `Float64.t` operations and explicit rounding (Sections 3.1 and 8.1, pp. 4, 10).
2. State validity (`P_V`), soundness (`Q_S`), and tightness (`Q_T`) as preconditions and postconditions; division also receives zero-division handling (`Q_Z`) (Section 8.1, p. 10).
3. Let Why3 generate verification conditions with weakest-precondition calculus, then assign Alt-Ergo or Coq to each VC (Section 3.1, p. 4). The platform reports four prover outcomes: “valid, invalid, timeout (within a configured time limit), or unknown.” (Section 3.1, p. 4).
4. Split difficult VCs in the Why3 GUI or proof script when a monolithic goal is too hard. The experiment compares no split, full split, and CPU-optimal split (Section 8.2, p. 10).

Inference: In Verus, encode validity and interval enclosure as `requires`/`ensures` over a mathematical interval model, and use `proof fn` lemmas for rounding facts. Rust’s floating-point operations and library contracts would need explicit trusted specifications; the WhyML proof does not carry over automatically.

## technique: solver-supporting arithmetic lemmas
Use this when SMT leaves nonlinear floating-point VCs unproved even though the required mathematical fact is simple.

1. Inspect each unproved VC and identify its real-number relation. The paper gives `Rmult_le_compat`:
`lemma Rmult_le_compat: forall r1 r2 r3 r4 : real. 0. <= r1 <= r2 /\\ 0. <= r3 <= r4 -> r1 * r3 <= r2 * r4` (Section 6, p. 8).
2. Add the lemma to the same Why3 module, with a trigger when useful, so Alt-Ergo can instantiate it from matching expressions (Sections 3.1 and 6, pp. 4, 8).
3. Prove nonlinear helper lemmas interactively in Coq when SMT cannot prove them. The paper reports that `Rmult_le_compat` was proved with Coq, after which two multiplication VCs were discharged by Alt-Ergo (Section 6, p. 8).
4. Repeat for the remaining branches and operators. The authors identify 19 additional lemmas for complete verification (Section 1.1, p. 2).

Inference: In Verus, a corresponding `proof fn` with `requires` assumptions and an `ensures` inequality can expose the monotonicity fact to Z3. Trigger syntax and Why3’s Coq handoff have no direct Verus equivalent; the mathematical lemma is the reusable part.

## technique: NaN-aware extremum specification
Use this when a tightness property compares several rounded candidate bounds that may be NaN.

1. Define `min2` to ignore a NaN argument and otherwise return the lower operand; define `min4` by nesting `min2`. Define `max2`/`max4` symmetrically (Section 7.1, p. 9).
2. Add lemmas describing the result’s relation to non-NaN arguments and the cases where it equals one argument. The paper’s `min4_feq`, `min4_fle`, and `min4_feq_w` use `[min4 w x y z]` triggers (Figure 3, p. 9).
3. Define predicates such as `mul_nan_case_inf` requiring all four downward products to be NaN (Section 7.2, p. 9).
4. Split tightness into ordinary lower/upper postconditions using `min4`/`max4`, plus a NaN-case postcondition requiring a zero interval when both extrema are NaN (Section 7.2, p. 9).
5. Add branch-specific rounding lemmas, such as `mul_down_positive_finite`, to close residual VCs (Section 7.3, p. 9).

Inference: A Verus model should use an explicit enum or predicate for NaN cases; ordinary Rust `f32`/`f64` comparisons are insufficient as a specification. The paper’s NaN-aware min/max are mathematical helpers, not runtime replacements unless separately implemented.

## evidence and limits
Table 2 reports all four operators verified. It records one branch for addition and subtraction, 13 for multiplication, and 7 for division; 19 additional lemmas total, with some proved by SMT and some by Coq (Table 2, p. 10). Under split-optimal, Alt-Ergo took 24.7 s for addition (6 VCs), 47.0 s for subtraction (8), 140 s for multiplication (3), and 578 s for division (15). Division timed out without splitting and with full splitting, so the success denominator is four operators under the optimal split setting, not every configuration. The experiment used Why3 1.1.0, Alt-Ergo 2.2.0, Coq 8.8.0, Z3 4.7.1, a 4 GB memory limit, and a 10-minute limit per VC (Section 8.2, p. 10). Z3 proved only 1/8, 1/10, 48/100, and 2/33 of the full-split VCs for the four operators, respectively (Section 8.2, p. 11).

The extracted OCaml program required hand-written C rounding operations and a Why3 extraction driver for `Float64.t` (Section 8.3, p. 11). Thus the proof does not by itself verify the C rounding implementation, compiler, hardware, or excluded empty-interval semantics. Existing verified floating-point and interval work means VL should not repeat generic NaN-extremum or nonlinear-arithmetic lemmas without a Rust/Verus-specific integration gap.

Inference: The threat to agent-written verified Rust is focused: branch-heavy numeric libraries remain proof-costly, and reusable arithmetic lemma libraries are valuable. The paper does not address Rust ownership, unsafe code, concurrency, or specification adequacy.

## techniques for the catalog
- layered numeric contracts — verify validity, enclosure, tightness, and exceptional cases as separate postconditions
- solver-supporting lemmas — add triggered real-number lemmas for nonlinear floating-point VCs and prove hard ones interactively
- NaN-aware extrema — define min/max operators and case predicates that make all-NaN behavior explicit
- VC splitting — compare unsplit, exhaustive, and cost-optimal decomposition of generated proof obligations
- proof extraction boundary — separate verified WhyML logic from trusted runtime rounding and extraction code
Checked 2026-10-14: audit record ishii2020computer; paper-study comparison complete; gate executed; experiments not rerun
