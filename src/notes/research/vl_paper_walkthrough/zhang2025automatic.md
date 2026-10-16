# Automatic Verification of Floating-Point Accumulation Networks
(authored by agents unless marked 🧑)
Tag: `zhang2025automatic`, [paper](http://arxiv.org/abs/2505.18791v1)

## problem and result
Floating-point accumulation networks (FPANs) are branch-free sequences of rounded sums and `TwoSum` gates. They underlie compensated summation and double-double arithmetic, but composing several error-free transformations makes rounding errors interact. The paper's abstract states: “We present an automatic procedure that produces computer-verified proofs of several FPAN correctness properties, including error bounds that are tight to the nearest bit.” (Abstract, p. 1.) Its central reduction is one-sided: “Our key technical insight is a one-sided reduction from a correctness property P of an FPAN F to a satisfiability problem SP,F in quantifier-free Presburger arithmetic (QF LIA).” (Section 1, p. 2.) Unsatisfiability proves the property; satisfiability does not necessarily refute it.

The method introduces SELTZO, an abstraction tracking sign, exponent, and leading/trailing zero/one counts in each mantissa. It proves a new double-double addition FPAN, `madd`, with relative error about `2u²` and depth 4, compared with `ddadd`'s bound about `4u²` and depth 5 (Section 6, p. 15).

## technique 1: model an algorithm as an FPAN and state local invariants
what it is
An FPAN is a diagram of wires and vertical `TwoSum` gates; a wire can be discarded. The exact sum of all wires is preserved by every `TwoSum`, and only discarded wires create error (Section 3, p. 7). Correctness is therefore split into a nonoverlap invariant for retained outputs and an error bound for discarded outputs. The paper states: “The purpose of an FPAN is to compute a nonoverlapping floating-point expansion of the exact value of the sum of its inputs.” (Section 3, p. 8.)

when to use it
Use this representation for fixed, branch-free floating-point kernels such as compensated summation or expansion arithmetic. Choose the nonoverlap relation (`S`, `P`, `ulp`, or `QD`) and a relative error bound appropriate to the library's contract.

how it is done
1. Draw each input as a wire and each rounded sum or `TwoSum` as a gate (Section 3, pp. 7–8).
2. Mark discarded outputs; keep the remaining outputs in order (Section 3, p. 8).
3. State a nonoverlap relation such as `|a_{i+1}|≤½ulp(a_i)` for retained terms and a bound such as `|b_i|≤½ulp(a_last)` for discarded terms (Section 3, p. 8).
4. Encode each relation as inequalities over exponents and mantissa metadata (Section 4.1, pp. 10–11).

The paper gives Dekker's `add2`: `TwoSum(x0,y0)`, then `x1⊕y1`, then `s1⊕t`, then `TwoSum(s0,u)` (Figure 5, p. 8). It also models Kahan–Babuška–Neumaier summation as a double staircase of `TwoSum` gates (Section 3, p. 10).

Verus form
Inference: Model the executable FPAN as Rust floating-point operations and write a `spec fn` for the mathematical sum and nonoverlap predicate. A `proof fn` can connect each gate to its abstract specification; loop-free code needs no loop invariant, while a looped summation needs an `invariant` preserving the accumulated exact sum and compensation relation. Use `ensures` on the verified function for the final error bound. The paper's gate-level diagrams are an inference-friendly proof decomposition, not a Verus built-in.

evidence and limits
The FPAN abstraction keeps the algorithm's fixed structure, so the method does not automatically cover data-dependent branches. The paper's motivating example shows why a local-looking circuit can fail: `ddadd` was claimed to have error `2u²` but a counterexample gives `2.25u²` (Section 1, p. 2).

## technique 2: SELTZO abstract domain
what it is
For each floating-point value `x`, SELTZO records `(s_x,e_x,nlz_x,nlo_x,ntz_x,nto_x)`: sign, exponent, and leading/trailing zero/one counts (Definition 4, p. 10). The abstraction does not retain every mantissa bit but is precise near powers of two, where FPANs are pathological. The paper says: “Although we lose completeness by passing to an overapproximation, we show that our abstraction is nonetheless precise enough to prove best-possible error bounds, tight to the nearest bit, for several FPANs of practical interest, including ddadd and madd.” (Section 1, p. 3.)

when to use it
Use SELTZO when interval or real-arithmetic abstractions lose the finite-precision behavior of `TwoSum`, and bit-blasting is too large. It is designed for binary16, bfloat16, binary32, binary64, and binary128 formats (Definitions 1–4, pp. 7–11).

how it is done
1. Assign each wire segment a label; an FPAN with `n` wires and `g` gates has `n+2g` segments (Section 5, p. 12).
2. Give each segment six integer variables for its SELTZO tuple (Section 5, p. 12).
3. Add consistency constraints for valid sign, exponent, zero, and bit-count combinations (Equations 9–16, pp. 12–13).
4. Add execution constraints for every `TwoSum` gate using the fixed-point propositions and appendix lemmas (Section 5, p. 13).
5. Encode the negation of the desired nonoverlap or error property as counterexample constraints (Sections 5, pp. 13–14).
6. Ask a QF LIA SMT solver whether the resulting `S_{P,F}` is unsatisfiable. Unsatisfiability proves the FPAN property because every concrete counterexample would induce an abstract one (Section 5, p. 12).

The authors verify more than 70 `TwoSum` output lemmas with Z3, CVC5, MathSAT, and Bitwuzla across five formats (Section 4.2, p. 12). Proposition 5 extends the result to subnormal finite inputs when the property depends only on exponent differences (Section 5.1, p. 14).

Verus form
Inference: Represent the six metadata fields as a ghost struct and define `spec fn` predicates for consistency, gate execution, and the target property. Use `proof fn` lemmas for each `TwoSum` relation and for the implication from an unsatisfiable abstract counterexample condition to the concrete bound. Verus's SMT backend is not a floating-point bit-vector proof of these lemmas automatically; the abstraction and its lemmas must be supplied, and executable Rust must separately respect the assumed IEEE operation semantics.

evidence and limits
The abstraction is intentionally one-sided and overapproximating. Its strength depends on the manually stated execution lemmas; unsatisfiability is evidence, whereas satisfiability only indicates a possible abstract counterexample. The paper does not claim completeness of the abstraction for arbitrary FPAN properties.

## technique 3: automatic error-bound proof and solver comparison
what it is
For a target property `P`, construct `S_{P,F}` and use an SMT solver to prove it unsatisfiable. For `ddadd` and `madd`, the authors add extra gates computing error terms, prove `|w0|<2^{-k}|z0|`, and algebraically derive the final relative bound (Section 6, pp. 15–16).

how it is done and evidence
Theorem 1 proves `ddadd` error at most `(1+2u)2^{-(2p-2)}≈4u²`; Theorem 2 proves `madd` at most `(1+2u)2^{-(2p-1)}≈2u²` for all five formats (Section 6, p. 15). Table 2 reports SELTZO solve times from 0.623 to 0.991 seconds for ten algorithm/format cases on an AMD Ryzen 9 9950X using Z3 4.13.4. The compared QF FP solvers either took 71–1088 minutes, 3898 minutes, or did not finish within three days; the table defines “DNF” as no termination within three days and “N/A” as rejection (Table 2, p. 16). The paper's bounds are tight to the nearest power of two, but `ddadd`'s 4u² is looser than the previously known 3u² bound (Section 6, p. 16).

Verus form
Inference: Encode the final theorem as an `ensures` bound over the function's mathematical result, and use `proof fn` lemmas to derive the algebraic conversion from an auxiliary error term to relative error. A Verus implementation would need an explicit floating-point model or an external contract for IEEE rounding; the paper's solver timings do not establish Verus performance.

## what is proved, measured, and trusted
The paper proves the stated error bounds and nonoverlap properties through its reduction, and measures solver runtime on ten cases with the specified hardware and solver versions. It does not prove that a compiler preserves the FPAN implementation, that hardware obeys every assumed IEEE behavior, or that the abstraction's manually supplied lemmas are complete for properties outside its language. Inference: For VL, this is a strong pattern for numeric Rust: verify a compact abstract counterexample problem and separately state which arithmetic semantics remain trusted.

## implications for VL
Existing work already covers interval, real-arithmetic, interactive Flocq/Gappa, and arbitrary-precision integer approaches; the paper says these either cannot express finite-precision `TwoSum` behavior or require substantial manual proof scripts (Section 7, pp. 17–18). Inference: VL should not redo a generic floating-point abstraction search before checking SELTZO's metadata and lemma library. Inference: threat to agent-written verified Rust is medium to high for numeric code: a solver can discharge the reduced formulas quickly, but the abstraction boundary, floating-point semantics, and generated Rust implementation still need explicit contracts and validation.

## techniques for the catalog
- FPAN gate decomposition: represent fixed floating-point kernels as `TwoSum` networks and prove retained nonoverlap plus discarded-error bounds
- SELTZO abstraction: track sign, exponent, and leading/trailing mantissa runs to reduce finite-precision reasoning to QF LIA
- one-sided abstract counterexample reduction: prove a concrete property from unsatisfiability of an overapproximated abstract counterexample formula
- solver-backed tight error proofs: combine SMT unsatisfiability with algebraic postprocessing to derive relative error bounds and compare solver cost
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
