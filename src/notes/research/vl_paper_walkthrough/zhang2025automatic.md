# Automatic Verification of Floating-Point Accumulation Networks
(authored by agents unless marked 🧑)
Tag: `zhang2025automatic`, [paper](https://arxiv.org/abs/2505.18791v1)

## problem and result
Floating-point accumulation networks (FPANs) are branch-free sequences of rounded sums and `TwoSum` operations. They underlie compensated summation and double-double arithmetic, but composing several error-free transformations makes rounding errors interact. The paper's abstract states: “In this paper, we present an automatic procedure that produces computer-verified proofs of several FPAN correctness properties, including error bounds that are tight to the nearest bit.” (Abstract, p. 1.) Its central reduction is one-sided: “Our key technical insight is a one-sided reduction from a correctness property P of an FPAN F to a satisfiability problem SP,F in quantifier-free Presburger arithmetic (QF LIA).” (Section 1, p. 2.) Unsatisfiability proves the property; satisfiability does not necessarily refute it.

The method introduces SELTZO, an abstraction tracking sign, exponent, and leading/trailing zero/one counts in each mantissa. Here `p` is the binary precision and `u=2^{-p}` is unit roundoff; operations use round-to-nearest, ties-to-even (Section 2.2, p. 5). It proves a new double-double addition FPAN, `madd`, with an error bound asymptotic to `2u²`, compared with its proved `ddadd` bound asymptotic to `4u²`. The paper also compares against a previously proved `3u²` bound for `ddadd` (Section 6, pp. 15–16). It reports circuit depth 4 for `madd` versus 5 for `ddadd` (Section 6, p. 15).

## technique 1: model an algorithm as an FPAN and state local invariants
what it is
An FPAN is a diagram of wires and vertical `TwoSum` operations; a wire can be discarded. The exact sum of all wires is preserved by every `TwoSum`, and only discarded wires change that sum (Section 3, p. 8). Correctness is therefore split into a nonoverlap invariant for retained outputs and an error bound for discarded outputs. The paper states: “The purpose of an FPAN is to compute a nonoverlapping floating-point expansion of the exact value of the sum of its inputs.” (Section 3, p. 8.)

when to use it
Inference: Use this representation for fixed, branch-free floating-point kernels such as compensated summation or expansion arithmetic. Choose the nonoverlap relation (`S`, `P`, `ulp`, or `QD`) and a relative error bound appropriate to the library's contract.

how it is done
1. Draw each input as a wire and each rounded sum or `TwoSum` as a node (Section 3, pp. 7–8).
2. Mark discarded outputs; keep the remaining outputs in order (Section 3, p. 8).
3. State a nonoverlap relation such as `|a_{i+1}|≤½ulp(a_i)` for retained terms and a bound such as `|b_i|≤½ulp(a_last)` for discarded terms (Section 3, p. 8).
4. Encode each relation as inequalities over exponents and mantissa metadata (Section 4.1, p. 11).

The paper gives Dekker's `add2`: `TwoSum(x0,y0)`, then `x1⊕y1`, then `s1⊕t`, then `TwoSum(s0,u)` (Figure 5, p. 8). It also models Kahan–Babuška–Neumaier summation as a double staircase of `TwoSum` operations (Section 3, pp. 9–10, Figure 6).

Verus form
Inference: Model the executable FPAN as Rust floating-point operations and write a `spec fn` for the mathematical sum and nonoverlap predicate. A `proof fn` can connect each operation to its abstract specification; loop-free code needs no loop invariant, while a looped summation needs an `invariant` preserving the accumulated exact sum and compensation relation. Use `ensures` on the verified function for the final error bound. The paper's operation diagrams suggest this proof decomposition; the paper does not discuss Verus.

evidence and limits
The FPAN abstraction keeps the algorithm's fixed structure, so the method does not automatically cover data-dependent branches. The paper's motivating example shows why a local-looking circuit can fail: `ddadd` was claimed to have error `2u²` but a counterexample gives `2.25u²` (Section 1, p. 2).

## technique 2: SELTZO abstract domain
what it is
For each floating-point value `x`, SELTZO records `(s_x,e_x,nlz_x,nlo_x,ntz_x,nto_x)`: sign, exponent, and exact leading/trailing zero/one counts, excluding the implicit leading bit (Definition 4, p. 10). The paper explains why precision improves near exponent boundaries: “As these bit counts increase, the number of concrete values that correspond to a particular abstract value drops exponentially, making the SELTZO abstraction more precise near exponent boundaries.” (Section 4, p. 11.) The paper says: “Although we lose completeness by passing to an overapproximation, we show that our abstraction is nonetheless precise enough to prove best-possible error bounds, tight to the nearest bit, for several FPANs of practical interest, including ddadd and madd.” (Section 1, p. 3.)

when to use it
Inference: Use SELTZO when interval or real-arithmetic abstractions lose the finite-precision behavior of `TwoSum`, and bit-blasting is too large. The paper reports verifying its `TwoSum` lemmas for binary16, bfloat16, binary32, binary64, and binary128 (Section 4.2, p. 12).

how it is done
1. Assign each wire segment a label; an FPAN with `n` wires and `g` `TwoSum` operations has `n+2g` segments (Section 5, p. 12).
2. Give each segment six integer variables for its SELTZO tuple (Section 5, p. 12).
3. Add consistency constraints for valid sign, exponent, zero, and bit-count combinations (Equations 9–16, p. 13).
4. Add execution constraints for every `TwoSum` operation using the fixed-point propositions and appendix lemmas (Section 5, p. 13).
5. Encode the negation of the desired nonoverlap or error property as counterexample constraints (Section 5, pp. 13–14).
6. Ask a QF LIA SMT solver whether the resulting `S_{P,F}` is unsatisfiable. Unsatisfiability proves the FPAN property because every concrete counterexample would induce an abstract one (Section 5, p. 12).

The authors report more than 70 `TwoSum` output lemmas and their verification with a portfolio including Z3, CVC5, MathSAT, and Bitwuzla across five formats (Section 4.2, p. 12). The exponent has no upper bound in the abstraction. Proposition 5 extends the proof to all finite inputs, including subnormals, when the property uses sign and bit counts and refers to exponents only through their differences; its argument scales inputs by a common power of two (Section 5.1, p. 14).

Verus form
Inference: Represent the six metadata fields as a ghost struct and define `spec fn` predicates for consistency, operation execution, and the target property. Use `proof fn` lemmas for each `TwoSum` relation and for the implication from an unsatisfiable abstract counterexample condition to the concrete bound. Verus's SMT backend is not a floating-point bit-vector proof of these lemmas automatically; the abstraction and its lemmas must be supplied, and executable Rust must separately respect the assumed IEEE operation semantics.

evidence and limits
The abstraction is intentionally one-sided and overapproximating. Its strength depends on the stated execution lemmas. The paper specifies the logical guarantee: “Here, one-sidedness means that if SP,F is unsatisfiable, then P (F ) provably holds, but if SP,F is satisfiable, then P (F ) may or may not hold.” (Section 1, p. 2.) The paper does not claim completeness of the abstraction for arbitrary FPAN properties.

## technique 3: automatic error-bound proof and solver comparison
what it is
For a target property `P`, construct `S_{P,F}` and use an SMT solver to prove it unsatisfiable. For each of `ddadd` and `madd`, the authors add one extra `TwoSum` computing the two error terms `(w0,w1)`, prove `|w0|<2^{-k}|z0|` under the input assumptions, and algebraically derive the final relative bound. The extra operation is for analysis and is omitted from the implementation (Section 6, p. 15, Figure 7).

how it is done and evidence
Theorems 1 and 2 assume `x0=RNE(x0+x1)` and `y0=RNE(y0+y1)`, meaning both input expansions are fixed points of `TwoSum`. Under these assumptions, Theorem 1 proves `ddadd` relative error at most `(1+2u)2^{-(2p-2)}≈4u²`; Theorem 2 proves `madd` relative error at most `(1+2u)2^{-(2p-1)}≈2u²` for all five formats (Section 6, p. 15). Table 2 reports SELTZO solve times from 0.623 to 0.991 seconds for ten algorithm/format cases on an AMD Ryzen 9 9950X using Z3 4.13.4. Successful direct QF FP runs took 71–1088 minutes or 3898 minutes; other entries report no termination within three days (DNF) or rejection as unsolvable (N/A). All direct runs for binary64 and binary128 were DNF or N/A (Table 2, p. 16). The paper defines “tight to the nearest bit” as having the smallest possible power-of-two leading constant. Its examples yield relative errors approximately `3u²` for `ddadd` and `1.5u²` for `madd`; thus the proved leading constants 4 and 2 are minimal among powers of two (Section 6, p. 16). Table 3 reports weaker leading constants for the simpler SE abstraction (128 and 64) and SETZ abstraction (16 and 8), respectively (Section 6.1, p. 17).

Verus form
Inference: Encode the final theorem as an `ensures` bound over the function's mathematical result, and use `proof fn` lemmas to derive the algebraic conversion from an auxiliary error term to relative error. A Verus implementation would need an explicit floating-point model or an external contract for IEEE rounding; the paper's solver timings do not establish Verus performance.

## what is proved, measured, and trusted
The paper presents proofs of the stated error bounds and a reduction for expressible nonoverlap properties, and reports solver runtimes on ten algorithm/format cases. Inference: These results do not establish compiler preservation of an FPAN implementation or hardware compliance with the assumed arithmetic semantics. The paper explicitly allows incompleteness of its abstraction. Inference: For VL, this is a strong pattern for numeric Rust: verify a compact abstract counterexample problem and separately state which arithmetic semantics remain trusted.

## implications for VL
Section 7 distinguishes three alternatives: real-arithmetic abstractions cannot express the required finite-precision behavior; interactive tools require expert proof scripts; and integer-based arbitrary-precision libraries trade speed at moderate precision for unrestricted precision (pp. 17–18). For interactive tools, the authors write: “Tools such as Flocq [13] and Gappa [22] have been used to verify algorithms involving FPANs [19,59], but they require a high degree of user expertise to construct sophisticated proof scripts.” (Section 7, p. 18.) Inference: VL should not redo a generic floating-point abstraction search before checking SELTZO's metadata and lemma library. Inference: threat to agent-written verified Rust is medium to high for numeric code: a solver can discharge the reduced formulas quickly, but the abstraction boundary, floating-point semantics, and generated Rust implementation still need explicit contracts and validation.

## techniques for the catalog
- FPAN operation decomposition: represent fixed floating-point kernels as `TwoSum` networks and prove retained nonoverlap plus discarded-error bounds
- SELTZO abstraction: track sign, exponent, and leading/trailing mantissa runs to reduce finite-precision reasoning to QF LIA
- one-sided abstract counterexample reduction: prove a concrete property from unsatisfiability of an overapproximated abstract counterexample formula
- solver-backed tight error proofs: combine SMT unsatisfiability with algebraic postprocessing to derive relative error bounds and compare solver cost
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In all cases, the SELTZO abstraction produces problems that are many orders of magnitude faster to solve."): checked the complete text including references and appendix, all study quotations, numerical bounds, theorem assumptions, technique steps, page references, and the arXiv identifier; corrected the abstract quotation, operation terminology, references, input assumptions, runtime outcomes, and the distinction between proved and previously known bounds; clarified subnormal scope and marked recommendations as inferences; did not rerun the paper's solvers, independently prove its lemmas, or validate the proposed Verus adaptations.
