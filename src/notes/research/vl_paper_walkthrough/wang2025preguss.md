# Preguss: It Analyzes, It Specifies, It Verifies
(authored by agents unless marked 🧑)
Tag: `wang2025preguss`, [paper](https://www.semanticscholar.org/paper/b928ef07775b3c6df1d95a15e19ac65e30acb8b4)

## scope and contribution

Preguss is a six-page position paper proposing a pipeline for scaling formal specification synthesis to large C/C++ programs. Its target is runtime-error (RTE) freedom, including division by zero, overflow, and null dereference, as a prerequisite to functional correctness. The paper's central claim is that static analysis should expose all possible RTE assertions, while an LLM should synthesize local, interprocedural specifications that let a deductive verifier prove those assertions. The authors state, "Preguss synergizes between static analysis and deductive verification by orchestrating two components: (i) potential runtime error (RTE)-guided construction and prioritization of verification units, and (ii) LLM-aided synthesis of interprocedural specifications at the unit level." (Abstract, PDF p. 1)

This is a design proposal, not an evaluated implementation. The conclusion says it is subject to "an extensive experimental evaluation in future work" (Section 4, PDF p. 5). Thus the architecture and examples are evidence of a method; there are no success rates, benchmark denominators, runtime measurements, or soundness theorem for Preguss itself.

## technique 1: RTE-guided verification units and priority

What it is. Use a sound abstract interpreter to insert or report guards for every potential undefined behavior, then split a whole-program proof into small verification units (V-Units). A unit contains one guard assertion and a two-layer slice: its host function and its callees. The goal is to avoid sending a whole repository to an LLM and to make work follow the program's call hierarchy.

When to use it. Use it when the program is too large for one context and when the property can be expressed as local guards (RTEs in the paper). The paper warns that conventional approaches are limited by LLM context and by the need for many different interprocedural contracts.

How to do it (paper steps).

1. Run an abstract-interpretation analyzer and emit guards for all possible UBs (Section 3.1, PDF p. 4). The paper's `abs` example reports the guard `-2147483647 <= x` for negating an integer (Section 2.1, PDF p. 2).
2. Build the call graph and record all call sites (Section 3.1, PDF p. 4).
3. Classify assertions into analyzer-generated UB guards and call-site precondition checks, initially setting the latter to tautological `true` (Section 3.1, PDF p. 4).
4. Slice the program around each assertion into its host plus callees and package this assertion and slice as a V-Unit (Section 3.1, PDF p. 4).
5. Put units in a queue in the order of a post-order call-graph traversal, so leaves are processed before callers (Section 3.1, PDF p. 4). The paper calls this a bottom-up mechanism.
6. Process the queue; if a unit cannot be verified after its iteration budget, terminate and report a high-risk RTE (Section 3.1, PDF p. 4).

Verus form. Inference: represent each V-Unit as a Rust function with a narrow `requires`/`ensures` contract and a `proof fn` that establishes the guard from the callee contracts. A loop in the slice uses an explicit `invariant` block; executable code remains ordinary Rust. Verus does not provide the paper's call-graph slicer or queue, so an external analyzer/orchestrator must construct units. The paper's C ACSL annotation `requires INT_MIN < x` maps conceptually to a Verus `requires x > i32::MIN` contract, but integer semantics and casts must be modeled explicitly.

Evidence and limits. The paper gives a concrete `abs` program and explains that Frama-C/Eva's interval abstraction `[−3, 3]` can validate or flag guards (Section 2.1, PDF p. 2). It also gives `id`, `one`, and `zero` to show that a postcondition `ensures \result == x` can prove `one` safe while an over-constrained `requires x != 0` would create a false alarm at `id(0)` (Section 2.2, PDF pp. 2–3). These examples support the decomposition rationale, not scalability. Abstract interpretation can produce false positives; the paper says manually identifying alarms or tuning configurations remains difficult (Section 1, PDF p. 2). An incomplete call graph, function pointers, or unsound parser can omit paths. The authors explicitly say rigorous formalization and a proof of semantic equivalence between generated specifications and program behavior are still needed (Section 4, PDF p. 5).

## technique 2: two-stage, verifier-in-the-loop contract synthesis

What it is. For each V-Unit, ask an LLM to infer the host function's preconditions and auxiliary specifications by reasoning backward from the guard. Then, only if the assertion depends on a callee result, synthesize callee postconditions. The loop is generate, verify, and refine from verifier feedback.

When to use it. Use this for interprocedural properties where a single holistic contract would mix unrelated call sites. The paper's key safety rule is to prohibit callee precondition synthesis in the callee phase, because such preconditions can be over-constrained and induce spurious alarms.

How to do it (paper steps).

1. Give the LLM the guard and the V-Unit's constrained slice, rather than the entire program (Section 3.1, PDF p. 4).
2. In phase 1, generate a host-function precondition and auxiliary specifications such as loop contracts by backward reasoning, analogous to weakest-precondition reasoning (Section 3.2, PDF p. 4).
3. Run the deductive verifier on the guard using the candidate specifications (Section 3.2, PDF p. 4).
4. Feed a failed proof back to the LLM and refine; stop on success or when `#iter` is exhausted (Section 3.2, PDF p. 4).
5. If the guard depends on a callee return value, enter phase 2 and generate callee postconditions. Explicitly prohibit callee preconditions in this phase (Section 3.2, PDF p. 4).
6. Verify the guard again with all generated specifications. Advance to the next V-Unit on success; otherwise halt and alert (Sections 3.1–3.2, PDF p. 4).

The paper describes the loop exactly as: "Both phases employ an iterative refinement strategy where (i) an LLM generates candidate specifications, (ii) a verifier validates the target assertion using these specifications, and (iii) an LLM refines the (possibly) failed candidates based on the verifier's feedback." (Section 3.2, PDF p. 4)

Verus form. Inference: use `requires` for caller assumptions, `ensures` for callee results, and `proof fn` lemmas or `assert` statements to connect the returned value to the guard. Keep generated contracts in a reviewable module and rerun Verus after each candidate. Do not encode the paper's forbidden callee precondition as a way to silence a failure; instead expose the failing caller or strengthen a proved postcondition. Verus's solver feedback is not an oracle that a specification matches intent, so a human or independent checker must review the generated contract.

Evidence and limits. The `id` example is the paper's evidence that postconditions can remove a false division alarm without constraining `id(0)`; Fig. 2 labels the two analysis/verification outcomes (Section 2.2, PDF p. 3). No experiment tests convergence, iteration budgets, or false-positive rates. Inference: an LLM may repeatedly produce a satisfiable but semantically wrong contract; a successful Verus proof would establish only that Rust satisfies the written contract. The proposal also assumes the analyzer's guards are complete enough and the call graph captures all relevant edges.

## what is proved, measured, and trusted

The paper proves no theorem about Preguss and reports no measurements. Its examples show how Frama-C/Eva and Frama-C/Wp interact on `abs` and `id`; the trusted basis is therefore the cited analyzers, their abstract semantics, the deductive verifier, the call-graph/slicing machinery, and the LLM-generated specifications. The paper itself identifies the missing foundation: "establishing a formal proof of its soundness remains non-trivial" (Section 4, PDF p. 5). Inference: for VL, Preguss is an orchestration pattern for prioritizing Verus obligations, not evidence that an agent can safely generate Rust contracts at scale. It threatens a verified-Rust product mainly through unsound or over-constrained contracts and missed interprocedural edges; it does not by itself threaten the Verus kernel or solver assumptions.

Already done that VL should not redo. The paper's static-analysis-to-deductive-verification split, bottom-up call-graph order, and host-then-callee contract phases are explicit design ideas. VL should reuse these as orchestration hypotheses rather than re-inventing a monolithic prompt. The missing work is an implementation and evaluation on Rust/Verus programs, including contract review and soundness boundaries.

## techniques for the catalog

- rte-guided verification units — generate UB guards, slice host-plus-callee contexts, and verify units bottom-up in call-graph post-order

- two-stage contract synthesis — infer host preconditions first, then callee postconditions only when a guard depends on a return value, with verifier-guided refinement

- precondition discipline — prohibit callee precondition synthesis in the callee phase to avoid over-constrained contracts and false alarms

Checked 2026-10-15 against the paper by a Codex agent for preguss_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
