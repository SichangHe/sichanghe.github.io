# Model Checking C Programs with Loops via k-Induction and Invariants
(authored by agents unless marked 🧑)
Tag: `rocha2015model`, [paper](http://arxiv.org/abs/1502.02327v1)

## method

Rocha et al. combine k-induction with automatically inferred affine (polyhedral) invariants to verify C programs with bounded and unbounded loops. The abstract says: “The k -induction algorithm consists of three cases: in the base case, we aim to find a counterexample with up to k loop unwindings; in the forward condition, we check whether loops have been fully unrolled and that the safety property P holds in all states reachable within k unwindings; and in the inductive step, we check that whenever P holds for k unwindings, it also holds after the next unwinding of the system.” (Abstract, p. 1).

Inference: this is a loop-proof scheduling pattern for VL. It suggests automatically proposing affine invariants before asking Verus to prove a Rust loop, but the paper's C/GOTO transformations and PIPS invariants do not transfer as Verus syntax.

## technique 1: three-part k-induction

For a C program `P`, property `φ`, and increasing `k`, run the following steps (Algorithm Figure 2, p. 4).

1. Base case: unwind each loop through `k` iterations and search for a counterexample up to that depth; return false with the trace if found
2. Increase `k`
3. Forward condition: add an unwinding assertion and check that all states reachable within `k` iterations satisfy `φ`; return true if the loop is fully covered
4. Inductive step: assume the postcondition and termination condition for `k` consecutive iterations and prove `φ` after the next unfolding
5. Stop with unknown when the maximum iteration bound is reached without either result

The paper specifies that “The input of the algorithm is a C program P together with the safety property φ.” and that “The algorithm returns true (if there is no path that violates the safety property), false (if there exists a path that violates the safety property), and unknown (if it does not succeed in computing an answer true or false).” (Section 2.1, p. 3). For the simple decrement loop, BMC alone cannot know how many iterations are required, while induction proves `x == 0` for arbitrary initial `x` (Introduction, pp. 1–2).

Verus form. Inference: represent the loop body as a Rust `while`, add a `requires` precondition, `ensures` postcondition, and `invariant` clauses for the induction hypothesis; use `decreases` for termination. Inference: Verus checks one inductive preservation obligation directly, whereas the paper's base/forward/inductive orchestration is an external driver.

## technique 2: loop-free encodings and inductive transformation

Each k step converts loops into finite `ite` chains. The base case inserts an unwinding assumption `I ∧ T ∧ σ ⇒ φ`; the forward case inserts an unwinding assertion `I ∧ T ⇒ σ ∧ φ` (Section 2.1, pp. 5–6). For induction, `while(c){E;}` becomes `A; while(c){S; E; U; R;}`: havoc loop variables, save the pre-state, execute the body, update local state, and remove redundant states (Equation 1, p. 5).

Steps.

1. Convert `for` loops to `while` loops with explicit initialization and increment (Equation 2, p. 6)
2. Havoc variables used in loop termination, loop counters, or repeatedly modified in the body (Definition 3, p. 5)
3. Save and restore state vectors around each body execution
4. Encode the induction hypothesis as postcondition plus negated termination condition
5. Submit the resulting quantifier-free formula to the SMT solver

Verus form. Inference: the saved state is a ghost snapshot; use `old(...)` only where supported by the local Verus contract pattern, and otherwise maintain explicit ghost values. Use `assert` and `proof fn` lemmas to relate one iteration's state to the next. The paper's `assume` instrumentation is a trust boundary and must not be copied as an unchecked executable assumption.

## technique 3: polyhedral invariant generation

PIPS computes affine transformers bottom-up, then propagates polyhedral invariants along instructions (Section 2.1, p. 6). Generated mathematical constraints are inserted as `assume` expressions in the transformed C code so they constrain SMT states. The authors report that the invariants strengthen both the forward condition and induction hypothesis.

Verus form. Inference: translate each affine relation into a specification predicate or arithmetic fact, place it in a loop `invariant`, and discharge it with `assert` or `proof fn`. Inference: a polyhedral analyzer can propose candidate invariants, but Verus must prove them for the actual Rust operations and types.

## evidence, trust, and limits

The evaluation uses 142 SV-COMP 2015 Loops tasks: 49 valid and 93 invalid, with 15-minute CPU and 15 GB memory limits and maximum `k = 100` (Section 3.1, p. 11). DepthK (k-induction plus polyhedral invariants) scores 141/235, ESBMC k-induction 115/235, and plain BMC 66/235 (Figure 7, p. 12). DepthK solves 66% of the 142 tasks and times out on 6%; ESBMC k-induction solves 53% and times out on 10% (Section 3.2, p. 13). DepthK takes about 11,518 seconds total versus 15,320 seconds for ESBMC k-induction, a reported 25% reduction (Section 3.2, p. 13). The paper's conclusion repeats the 66% versus 52% comparison for polyhedral versus non-invariant k-induction (p. 14); 66% of 142 is about 94 tasks, while 52% is about 74, so the percentages are rounded and the denominator is the 142-task suite.

The authors attribute 28% of DepthK's tasks without a solution to weak or non-convex generated invariants (Section 3.2, p. 13). What is proved is soundness of the transformed SMT checks under their C semantics; what stays trusted includes ESBMC, PIPS, SMT solving, inserted assumptions, C-to-GOTO translation, and the property encoding. Inference: for VL, the main risk is importing analyzer-produced facts as trusted assumptions instead of proving them in Verus.

Inference: product risk for agent-written verified Rust is moderate. Automatic affine candidates could reduce loop-proof effort, but the benchmark is C-specific and only 142 tasks. VL should reuse the three-case scheduling idea and reject any invariant that cannot be verified as a genuine Verus `invariant`.

## techniques for the catalog

- three-part k-induction — combine bounded counterexample search, forward coverage, and an inductive step

- loop-free induction encoding — transform each loop into finite `ite` copies and havoc/save/update state for induction

- polyhedral invariant inference — compute affine constraints with abstract interpretation and use them to strengthen induction

Checked 2026-10-15 against the paper by a Codex agent for model_checking_c_programs_with_loops_via_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
