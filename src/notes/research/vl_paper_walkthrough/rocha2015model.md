# Model Checking C Programs with Loops via k-Induction and Invariants
(authored by agents unless marked 🧑)
Tag: `rocha2015model`, [paper](http://arxiv.org/abs/1502.02327v1)

## method

Rocha et al. combine k-induction with automatically inferred affine (polyhedral) invariants to verify C programs with bounded and unbounded loops. The abstract says: “The k -induction algorithm consists of three cases: in the base case, we aim to find a counterexample up to k loop unwindings; in the forward condition, we check whether loops have been fully unrolled and that the safety property P holds in all states reachable within k unwindings; and in the inductive step, we check that whenever P holds for k unwindings, it also holds after the next unwinding of the system.” (Abstract, p. 1).

Inference: this is a loop-proof scheduling pattern for VL. It suggests automatically proposing affine invariants before asking Verus to prove a Rust loop, but the paper's C/GOTO transformations and PIPS invariants do not transfer as Verus syntax.

## technique 1: three-part k-induction

For a C program `P`, property `φ`, and increasing `k`, run the following steps (Algorithm Figure 2, p. 4).

1. Base case: unwind each loop through `k` iterations and search for a counterexample up to that depth; return false with the trace if found
2. Increase `k`
3. Forward condition: add an unwinding assertion and check that all states reachable within `k` iterations satisfy `φ`; return true if the loop is fully covered
4. Inductive step: havoc the loop variables and check `γ ∧ σ ⇒ φ`, where the induction hypothesis is the conjunction of the postconditions and the loop termination condition (Section 2.1, p. 6); return true if this holds
5. Stop with unknown when the loop `while k <= max iterations` ends without a result; the experiments set max iterations to 100 (Section 3.1, p. 11)

The base case is tried first at every `k`, and `k` only increases if the base case finds no counterexample (Section 2.1, p. 3).

The paper specifies that “The input of the algorithm is a C program P together with the safety property φ.” and that “The algorithm returns true (if there is no path that violates the safety property), false (if there exists a path that violates the safety property), and unknown (if it does not succeed in computing an answer true or false).” (Section 2.1, p. 3). The introduction's example is the loop `while (x>0) x--;` followed by `assert (x==0);` with `x` nondeterministic: the paper says “the assertion in line 3 holds independent of x’s initial value” but that BMC tools “typically fail to verify programs that contain such loops” (Introduction, pp. 1–2).

Verus form. Inference: represent the loop body as a Rust `while`, add a `requires` precondition, `ensures` postcondition, and `invariant` clauses for the induction hypothesis; use `decreases` for termination. Inference: Verus checks one inductive preservation obligation directly, whereas the paper's base/forward/inductive orchestration is an external driver.

## technique 2: loop-free encodings and inductive transformation

Each k step converts loops into finite `ite` chains. The base case inserts an unwinding assumption `I ∧ T ∧ σ ⇒ φ`; the forward case inserts an unwinding assertion `I ∧ T ⇒ σ ∧ φ` (Section 2.1, p. 5). For induction, `while(c){E;}` becomes `A; while(c){S; E; U;} R;`: `A` havocs the loop variables, `S` stores the current state before the body `E`, `U` updates the variables after `E`, and `R` removes redundant states (Equation 1, p. 5). In the running example, Figure 6 (p. 11) implements `R` as an `assume` that the stored state differs from the current one, placed inside the `if`.

Steps.

1. Convert `for` loops to `while` loops with explicit initialization and increment (Equation 2, p. 5)
2. Havoc variables used in loop termination, loop counters, or repeatedly modified in the body (Definition 3, p. 5)
3. Store the current state in a state vector `sv` before each body execution, update the current state `cs` after it, and assume the stored state differs from the current one so redundant states are not added (Section 2.2, pp. 8–10)
4. The induction hypothesis is the conjunction of postconditions and the loop termination condition (Section 2.1, p. 6)
5. Check the resulting loop-free program with the SMT-based checker ESBMC (Introduction, p. 2)

The paper notes that the `cs` data structure “does not handle heap-allocated objects” in the current implementation (Section 2.2, p. 9).

Verus form. Inference: the saved state is a ghost snapshot; use `old(...)` only where supported by the local Verus contract pattern, and otherwise maintain explicit ghost values. Use `assert` and `proof fn` lemmas to relate one iteration's state to the next. Inference: the paper's `assume` instrumentation is a trust boundary and must not be copied as an unchecked executable assumption.

## technique 3: polyhedral invariant generation

PIPS computes affine transformers bottom-up, then propagates polyhedral invariants along instructions (Section 2.1, p. 6). PIPS emits invariants as comments in its output C code; these “are translated and instrumented into the program as assume statements” to “limit possible values of the variables that are related to the invariants” (Section 2.1, p. 6). The introduction says invariants are used “to prune the state space exploration and to strength the induction hypothesis” (p. 2), and the results section says “invariants help prove that the loop is sufficiently unfolded and whether the property is valid” in the forward condition (Section 3.2, p. 12).

Verus form. Inference: translate each affine relation into a specification predicate or arithmetic fact, place it in a loop `invariant`, and discharge it with `assert` or `proof fn`. Inference: a polyhedral analyzer can propose candidate invariants, but Verus must prove them for the actual Rust operations and types.

## evidence, trust, and limits

The evaluation uses 142 SV-COMP 2015 Loops tasks: 49 valid and 93 invalid, with 15-minute CPU and 15 GB memory limits and maximum `k = 100` (Section 3.1, p. 11). DepthK (k-induction plus polyhedral invariants) scores 141/235, ESBMC k-induction 115/235, and plain BMC 66/235 (Figure 7, p. 12). DepthK solves 66% of the 142 tasks and times out on 6%; ESBMC k-induction solves 53% and times out on 10% (Section 3.2, p. 13). DepthK takes about 11,518 seconds total versus 15,320 seconds for ESBMC k-induction, a reported 25% reduction (Section 3.2, p. 13). The conclusion gives 66% for polyhedral k-induction but 52% (not 53%) for k-induction without invariants (p. 14), so the paper is internally inconsistent by one point. Inference: 66% of 142 is about 94 tasks and 52–53% is about 74–75, so the percentages are rounded and the denominator is the 142-task suite. The implementations are called DepthK (with invariants) and ESBMC with k-induction, both on ESBMC v1.24.1 (Section 3, p. 11).

The authors attribute DepthK's 28% of tasks without a solution to the invariants from PIPS, “which could not generate strong invariants to be k-inductive either due to the transformers or due to the invariants are not convex” (Section 3.2, pp. 12–13). The paper gives no soundness proof of the transformations; it states that “correctness of the loop-free program implies correctness of the program with loops” (Section 2.1, p. 4). Inference: what stays trusted includes ESBMC, PIPS, SMT solving, inserted assumptions, C-to-GOTO translation, and the property encoding. Inference: for VL, the main risk is importing analyzer-produced facts as trusted assumptions instead of proving them in Verus.

Inference: product risk for agent-written verified Rust is moderate. Automatic affine candidates could reduce loop-proof effort, but the benchmark is C-specific and only 142 tasks. VL should reuse the three-case scheduling idea and reject any invariant that cannot be verified as a genuine Verus `invariant`.

## techniques for the catalog

- three-part k-induction — combine bounded counterexample search, forward coverage, and an inductive step

- loop-free induction encoding — transform each loop into finite `ite` copies and havoc/save/update state for induction

- polyhedral invariant inference — compute affine constraints with abstract interpretation and use them to strengthen induction

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In the SV-COMP benchmarks, we observed a substantial improvement in performance if we generate and check constraints as described in Equation (4)."): read the whole paper text and checked every quotation, number, page reference and technique step; changed one abstract quote word, the form of Equation 1 (R is after the loop), page references (Equations 1 and 2 on p. 5, invariant discussion on pp. 12–13), the inductive-step and state-vector descriptions, removed the unsupported claims that the paper proves soundness, that the formula is quantifier-free, and that the introduction shows induction proves the decrement example, and noted the 52% versus 53% inconsistency; did not check the cited references, the bar-chart percentages in Figure 8 beyond the text, or the DepthK tool itself.
