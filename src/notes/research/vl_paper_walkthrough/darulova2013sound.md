# Sound Compilation of Reals
(authored by agents unless marked 🧑)
Tag: `darulova2013sound`, [paper](https://www.semanticscholar.org/paper/2586bee6e557fefe4153ea03c244d92102f7c118)

## problem and contribution
Darulova and Kuncak compile programs written over mathematical reals into finite precision while checking a target error. “We present a programming model where the user writes a program in a real-valued implementation and specification language that explicitly includes different types of uncertainties.” (Abstract, PDF p. 1) The developer supplies preconditions, postconditions, and a precision target; the compiler generates verification conditions (VCs), proves them with SMT over reals, then emits floating-point code. “The compiler chooses a floating point representation while checking that the desired precision targets are met.” (Abstract, PDF p. 1)

Inference: the key reusable idea for VL is to separate an ideal specification from implementation arithmetic and discharge a translation obligation. It is not a Verus technique because the paper's language and solver model are Scala and real arithmetic.

## technique 1: real specification plus uncertainty
Write each method over `Real`, annotate input uncertainty in the precondition, and state both an ideal result and an allowed uncertainty in the postcondition. The postcondition can constrain a result range and maximum error. The compiler models roundoff at every arithmetic operation, combines it with external uncertainty, and checks the requested bound. The paper says, “The postcondition can specify the range and the maximum allowed uncertainty on the result.” (Section 3, PDF p. 3)

Steps: define real-valued body; give precondition and target precision; translate expressions with error variables; generate a VC; ask Z3 whether the VC is valid; choose a candidate precision; emit code and generated postconditions. Function calls are handled modularly by inlining or by using their postconditions. The paper describes modular verification through callee postconditions (Section 3, PDF p. 3)

Inference: in Verus, use a `spec fn` for ideal mathematics, an executable Rust function, and `requires`/`ensures` contracts. Verus integer and bit-vector arithmetic does not carry over to real floating-point rounding automatically; a faithful model needs explicit error bounds and axioms or lemmas about the chosen numeric representation.

## technique 2: approximation pipeline for VCs
When Z3 cannot solve the full nonlinear VC, progressively approximate it. The implementation first asks Z3 on the complete constraint, treating calls as uninterpreted functions; if that fails, inline postconditions; then compute sound range and error over-approximations. The paper reports: “We view verification as a stream of approximations to be proven.” (Section 5.4, PDF p. 5)

For nonlinear expressions, compute ranges with interval and affine arithmetic, use SMT checks to validate bounds, and refine until the interval width reaches a precision threshold or a maximum iteration count. For conditionals, reason about both ideal and finite-precision paths, because uncertainty can change a branch. For each branch, propagate ranges and errors and merge the resulting bounds.

Inference: a Verus implementation can encode each approximation as a lemma that bounds an expression and invoke it from a proof function. The paper's floating-point error model, Taylor approximations, and affine arithmetic must be re-derived; Verus does not provide these real-number facts by default.

## evidence and limits
The implementation uses Scala programs, range arithmetic, Z3 nonlinear solving, and double precision unless stated otherwise (Section 4, PDF p. 9). The paper's triangle example reports an error of `2.3e-11` for one method, exceeding the required precision, while a sorted variant reduces the error (Section 3, PDF p. 3). The evaluation includes numerical examples such as jetEngine, turbine1, doppler3, rigidBody1, and sine variants (Table 2, PDF p. 9). Numbers are per benchmark method and the table records whether inputs have external uncertainty.

The method is sound only relative to its abstraction and solver checks; over-approximation may be too large and yield unknown or failure. The authors explicitly say: “Our approach makes a different compromise on the precision vs. automation tradeoff, by being less precise, but automatic.” (Conclusion, PDF p. 11) Conditional discontinuities, nonlinear solver imprecision, and timeouts remain limits. Trusted components include the real-to-floating translation, error model, SMT solver, compiler, and user contracts.

## VL implications and threat
Inference: VL can reuse the ideal-versus-implementation contract split for fixed-width arithmetic, but must treat rounding and overflow as explicit modeled state. Inference: this paper is a medium threat to agent-written verified Rust only when agents silently assume real arithmetic or omit numerical error contracts; it does not replace proof of Rust code.

## techniques for the catalog
- real specification compilation: write ideal real code with uncertainty and precision contracts, then generate and prove floating-point obligations
- VC approximation pipeline: solve a full VC first, then inline postconditions and refine sound range/error over-approximations
- modular postcondition reuse: verify callees once and use their postconditions at call sites
- conditional error analysis: propagate ideal and finite-precision paths separately and merge bounds

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
