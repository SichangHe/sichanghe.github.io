# Explaining Counterexamples with Giant-Step Assertion Checking
(authored by agents unless marked 🧑)
Tag: `becker2021explaining`, [paper](http://arxiv.org/abs/2108.02967v1)


## problem and result

The paper addresses a practical diagnosis problem: an SMT proof failure can mean faulty code, an insufficient annotation, or an incomplete prover. Its central proposal compares two executions driven by the solver's candidate model. The abstract states: “The first RAC execution follows the normal program semantics, and a violation of a program annotation indicates an incorrectness in the program.” It then defines giant-step execution, in which calls and loops are skipped and their written values are read from the model; a failure seen only there identifies a weak contract or invariant (abstract, p. 82).

The input is a deductively verified program with preconditions, postconditions, loop invariants, assertions, and a `writes` set. A failed VC is negated and sent to an SMT solver. A model is converted to triples of variable, source location, and value. The model is only a candidate: “the counterexample may be invalid, in which case it may add more confusion than help” (Introduction, p. 82).

## technique 1: standard versus giant-step RAC

What it is. Standard runtime assertion checking (RAC) executes the original code and checks annotations as encountered. Giant-step RAC checks the same annotations but replaces each function call and loop by one model-directed step. The paper's toy program calls `set_x 2`, whose contract is `x > n`, and then asserts `x = 3`. A solver model can assign `x = 4` after the call. Normal RAC computes `3` and succeeds; giant-step RAC takes `4` from the oracle and fails the assertion. This is a subcontract weakness because the call's postcondition permits too many results (Introduction, pp. 83–84).

When to use it. Use the method after a VC does not receive `unsat` and a model can be translated to values for the enclosing function's inputs and written variables. It distinguishes a genuine annotation violation from a model that merely exploits an under-specified call or loop. It also filters models that cannot satisfy the VC premises.

How to apply it.

1. Generate the VC from code and annotations, negate its conclusion, and query the SMT solver (Introduction, p. 82).
2. Convert a returned model to a candidate counterexample containing each variable's values at source locations (Introduction, p. 82).
3. Run ordinary RAC on the VC's enclosing function with the candidate's input and global values. If it fails at the VC location, classify non-conformance. If it fails elsewhere, report a bad model that still exposes another annotation violation (Section 2, p. 85).
4. If ordinary RAC does not classify it, run giant-step RAC with the model as oracle. A failure is a subcontract weakness; a stuck execution means the model is invalid; a normal execution discards the model (Section 2, p. 85).

The giant-step evaluator's call rule is explicit. Evaluate arguments, check the callee precondition, obtain result and written-variable values from the oracle, assign them, and check the postcondition. For a loop, check its invariant, obtain written values from the oracle, check the invariant again, test the guard, execute the body only when the guard remains true, and then require the invariant to be preserved. The pseudocode says: “query the oracle for values v1 · · · vk for y1 · · · yk and v for result, assign them in the context” (Figure 2, p. 84). A loop whose invariant is preserved after the oracle assignment is reported as stuck because that oracle did not expose a failure (Figure 2, p. 84).

Verus form. Inference: Verus can implement the same diagnostic split around a verified Rust function by recording a model-derived test input and executing an ordinary instrumented function, then executing a diagnostic harness that replaces a call with an unconstrained result satisfying its `requires`/`ensures` contract. A Verus loop uses `invariant(...)` clauses; function contracts use `requires` and `ensures`. Verus has no paper-defined giant-step interpreter, so the oracle and classification harness would be ordinary Rust test infrastructure, while the contracts being checked remain Verus specifications. Inference: a `spec fn` can describe the admissible post-state, but the diagnostic harness must not call proof-only code at run time.

Evidence. The Why3 implementation reproduced all 16 applicable modifications of three C/ACSL examples (Section 3, p. 86). In the SPARK Riposte suite, containing 24 programs and 247 checks, it identified 14 wrong counterexamples, 57 non-conformities, and 22 cases classified as either non-conformity or subcontract weakness; 154 checks remained uncategorised (Section 3, p. 86). These are counts over that stated suite, not accuracy percentages. The integer-square-root example gives two concrete classifications: changing `y ← y + z` to `y ← y - z` produces a standard-RAC failure of invariant I2 and is non-conformance; removing invariant I3 leaves ordinary RAC successful but giant-step RAC failing the postcondition, hence subcontract weakness (Section 3, pp. 86–87).

Limits and trust. The approach requires a usable model and source-level mapping. The paper reports missing support for type invariants, missing oracle values, calls without implementations, and polymorphic encodings. Quantified assertions can limit RAC, and a Why3-level model may not map accurately to a front-end language (Section 4, p. 87). Inference: a Verus adaptation inherits trust in the model-to-input mapping, test harness, solver model, and any abstracted dependency contracts; it diagnoses a failed proof but does not prove that the specification expresses the intended requirement.

## what is proved, measured, and trusted

The paper proves neither completeness of classification nor correctness of every model. It gives a semantic procedure and implementation evidence. The experimental denominator is explicit: 16 applicable WhyML modifications and 247 SPARK checks. The reported 154 uncategorised SPARK checks show that classification coverage is incomplete. The solver's `unsat` answer is treated as sound; other answers are not. The implementation and translation from solver model to oracle remain trusted engineering components.

Inference: for agent-written verified Rust, this is a moderate product threat and a useful feature opportunity. A failed Verus proof currently requires human interpretation; model-guided ordinary/contract-only replay could separate wrong Rust from missing invariants. The paper does not address Rust ownership, concurrency, or Verus syntax, so it does not remove those product-specific risks.

## techniques for the catalog

- model-guided counterexample generation — turn a failed SMT model into source-location values for replay
- giant-step assertion checking — replace calls and loops with oracle-supplied writes while checking contracts and invariants
- two-stage failure classification — use ordinary RAC for non-conformance, then giant-step RAC for weak contracts or invalid models
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
