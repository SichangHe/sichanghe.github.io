# Towards platform-independent specification and verification of the standard trigonometry functions?
(authored by agents unless marked 🧑)
Tag: `shilov2019platform`, [paper](http://arxiv.org/abs/1901.03414v1)

The paper develops an incremental, platform-independent way to specify and manually verify approximations of `cos` and `sin`. Its target is a small argument range, `[-1,1]`, in a fixed-point model. It starts with exact real arithmetic, carries the same algorithm and proof idea into machine arithmetic, and leaves proof-assistant validation and large floating-point arguments as future work. The abstract states: “Incrementality means that we start with the most straightforward specification of the simplest easy to verify algorithm in real numbers and finish with a realistic specification and a verification of an algorithm in computer arithmetic.” (Abstract, p. 1)

## technique: turn a mathematical series into a total-correctness contract

What it is. Define the mathematical function by a convergent Taylor series, then make the truncation error the postcondition. For cosine and sine the paper uses
`cos x = Σ(n≥0) (-1)^n x^(2n)/(2n)!` and `sin x = Σ(n≥0) (-1)^n x^(2n+1)/(2n+1)!`. The alternating-series bound is stated for `|x| ≤ 2n`: the remainder after cosine term `n` is at most `x^(2n+2)/(2n+2)!`, and the analogous sine remainder is at most `x^(2n+3)/(2n+3)!` (Section 4, p. 4). The paper says: “Both series are alternating absolutely converging series for all x ∈ R, and — moreover — according to Leibnitz criterion for the alternating series.” (Section 4, p. 4)

When to use it. Use this pattern when the implementation can accumulate terms until a computable next-term bound is below a requested `ε`. It produces a contract independent of a processor format, provided the arithmetic really is exact.

How to apply it.
1. Choose inputs `x` and `0 < ε < 1` (Section 4, p. 4).
2. For cosine initialize `cs := 1`, `n := 1`, `sign := -1`, `tc := x²/2`; while `ε < tc`, add `sign*tc` to `cs`, increment `n`, flip `sign`, and update `tc := tc*x²/(2n(2n−1))` (Fig. 4, Section 4, p. 4).
3. For sine use `sn := x`, `ts := x³/6`, and update the denominator with `2n(2n+1)` (Fig. 5, Section 4, p. 5).
4. Specify total correctness as `[0 < ε < 1] CosCodeInReals [|cs − cos x| ≤ ε]` and the corresponding sine triple (equations (11) and (12), Section 4, p. 4–5).
5. Prove partial correctness with a Floyd invariant. For cosine the paper records `sign = (−1)^n`, `tc = x^(2n)/(2n)!`, and `cs = Σ(m=0..n−1) (−1)^m x^(2m)/(2m)!` together with the input bound (equation (13), Section 4, p. 5). On loop exit, the invariant and the alternating-series estimate imply the requested error. Prove termination by choosing the first `m` with `2^m > |x|` and then showing the term decreases below `ε` after a logarithmic number of additional iterations (Section 4, p. 5).

Verus form. Inference: represent the mathematical specification as a `spec fn` for a finite Taylor sum and a remainder bound, and place the executable loop in a Rust `fn` with `requires` and `ensures`. Use a loop `invariant` containing the term, sign, index, and accumulated sum facts above. A `proof fn` can establish the factorial and alternating-series lemmas; it is erased and never called as runtime code. Verus does not automatically supply convergence mathematics, so the paper's inequalities must become explicit lemmas. Exact real arithmetic also needs a supported mathematical model; machine `f32`/`f64` operations would require a separately justified abstraction.

Evidence and boundaries. The evidence is a hand proof, not a measured implementation: the paper explicitly says the proof-assistant validation is postponed. The result assumes exact real operations and a convergence precondition; it says only that the sine proof is similar. It does not prove IEEE floating-point behavior.

## technique: diagnose floating-point failure before proving a machine algorithm

What it is. Compile the real-arithmetic recurrence directly in C `float`, then sweep inputs to expose loss of significance. The test function evaluates `x` from a minimum to a maximum with step `0.05` and `ε = 10^-6` (Fig. 6 and Table 1, Section 5, p. 6). Reported outputs include `1.144768` at `1.85` radians and `13158.8` at `29` radians, although cosine must be in `[-1,1]` (Table 1, p. 6). The paper attributes this to normalization before addition: “while n ≤ x the values of terms x^n/n! in the series (10) are so big that later addition of small values x^m/m! with x << m ‘vanish’ because of normalization of floating point values prior to addition.” (Section 5, p. 6)

When and how. Use this test whenever a real proof is about to be transferred to finite precision. Compare every result with a mathematical range or oracle. Then reduce large arguments using periodicity, addition, double-angle, or Chebyshev formulas; the paper lists these as remedies (Section 5, p. 6). This gives a concrete threat model for VL: a proof of the real recurrence does not imply a proof of the floating implementation.

Verus form. Inference: make the argument-range reduction and an error model explicit in `requires`; keep the recurrence's loop invariant over an abstract fixed-point value, not native floats unless a verified float model exists. A range assertion such as `-1 <= x <= 1` can be an invariant, while a lemma connects each rounded operation to exact multiplication plus an error bounded by `δ/2`.

Evidence and limits. The sweep is a diagnostic experiment, not a correctness result. It uses one C `float` implementation, inputs `[0,30]`, step `0.05`, and tolerance `10^-6`; no denominator beyond that grid is claimed. Large-argument reduction and floating-point verification remain future work.

## technique: axiomatize fixed-point arithmetic and transfer the proof with an error budget

What it is. Define a finite value set `ValD`, exact addition/subtraction when in range, correctly rounded multiplication/division with error at most `δD/2`, and exact comparisons (Section 6.1, p. 7). The paper's machine contract is: “A fix-point data-type (with Gaussian rounding) D satisfies the following axims.” (Section 6.1, p. 7; the PDF spells “axims”).

How to apply it.
1. Restrict `x` and `ε` to representable values with `-1 ≤ x ≤ 1`, `0 < ε < 1` (Section 6.2, p. 8).
2. Run the same recurrence as the real algorithm, but use machine multiplication `⊗` and the finite type's values (Fig. 7, Section 6.2, p. 8).
3. Extend the invariant with an error variable `ep = (−1)^n (2n)! ε / x^(2n)`, the exact-term relation, and the accumulated partial sum (equation (15), Section 6.2, p. 8).
4. Compare the fixed-point run with the real run synchronously. The proof sketch bounds the first product error by `3δD/4` and propagates it through the recurrence, obtaining a cumulative term `3nδD/(2(1−δD))` (Appendix A, pp. 11–12).
5. State the resulting contract, equation (16): the cosine error is at most `ε + 3nδD/(2(1−δD))`, with `n` the least factorial index satisfying `(2n)! ε ≥ 1` (Section 6.2, p. 8). Sine uses the analogous `(2n+1)!` condition and equation (18) (Section 6.3, p. 9).

Verus form. Inference: encode the finite value set and rounding guarantees as abstract predicates or `spec fn`s. Put `δD < 1`, representability, and the factorial termination witness in `requires`; put the accumulated approximation and error budget in `ensures`. Each arithmetic update needs a lemma applying the `δD/2` bound. A Verus loop `invariant` can carry the synchronous real/machine discrepancy and term bound. The paper's proof is manual, so these lemmas are design work rather than a direct translation.

Evidence and assumptions. The proof is an appendix sketch for cosine and a similarity claim for sine. It assumes no overflow, exact comparisons, and the stated rounding axioms. There is no implementation measurement or proof-assistant run in this paper; the conclusion says validation with ACL2 is still planned.

## what is proved, measured, and trusted

The paper proves by hand total-correctness assertions for real arithmetic and gives a preliminary manual transfer proof for fixed-point cosine, plus a sine analogue. The C experiment measures nine representative table entries from a sweep and demonstrates catastrophic floating-point behavior; it does not validate the fixed-point contracts. Trusted items include real-analysis facts about Taylor series, the fixed-point axioms, the correctness of the manual reasoning, and (for any future implementation) the arithmetic library and compiler. The paper leaves floating-point formats, large arguments, and computer-aided proof outside its result. Inference: agent-written verified Rust using this method would face a high threat from unchecked numeric assumptions: a functional proof can pass while the chosen float operations violate the model, and the machine error term grows with the iteration count.

The paper's scope also tells VL what not to redo: it already supplies the incremental workflow, the real-series invariants, a concrete fixed-point error budget, and a failure experiment. New work should instead instantiate and mechanically validate those obligations for a specific Rust numeric type, or verify range reduction and floating-point semantics.

## techniques for the catalog

- series-to-contract: define `sin` and `cos` by Taylor sums, stop on a next-term bound, and prove a Floyd invariant against the alternating-series remainder
- floating-point diagnostic sweep: run the real recurrence over a grid and compare outputs with mathematical range bounds to expose loss of significance
- fixed-point transfer proof: axiomatize rounded operations, synchronize machine and real runs, and carry a `δD`-dependent error budget into the postcondition
- range reduction: use periodicity, addition, double-angle, or Chebyshev identities to reduce large arguments before evaluating a stable small-argument kernel

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
