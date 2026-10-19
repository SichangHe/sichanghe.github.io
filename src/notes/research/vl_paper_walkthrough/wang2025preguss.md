# Preguss: It Analyzes, It Specifies, It Verifies
(authored by agents unless marked 🧑)
Tag: `wang2025preguss`, [paper](https://arxiv.org/abs/2508.14532)

## scope and contribution

Preguss is a six-page position paper proposing a pipeline for scaling formal specification synthesis to large C/C++ programs. Its target is runtime-error (RTE) freedom, including division by zero, overflow, and null dereference, as a prerequisite to functional correctness. The paper's central claim is that static analysis should expose all possible RTE assertions, while an LLM should synthesize local, interprocedural specifications that let a deductive verifier prove those assertions. The authors state, "Preguss synergizes between static analysis and deductive verification by orchestrating two components: (i) potential runtime error (RTE)-guided construction and prioritization of verification units, and (ii) LLM-aided synthesis of interprocedural specifications at the unit level." (Abstract, PDF p. 1)

This is a design proposal, not an evaluated implementation. The conclusion says it is subject to "an extensive experimental evaluation in future work" (Section 4, PDF p. 4). Thus the architecture and examples are evidence of a method; there are no success rates, benchmark denominators, runtime measurements, or soundness theorem for Preguss itself.

## technique 1: RTE-guided verification units and priority

What it is. Use a sound abstract interpreter to insert or report guards for every potential undefined behavior, then split a whole-program proof into small verification units (V-Units). A unit contains one guard assertion and a two-layer slice: its host function and its callees. The goal is to avoid sending a whole program to an LLM and to make work follow the program's call hierarchy.

When to use it. Inference: use it when the program is too large for one context and when the property can be expressed as local guards (RTEs in the paper). The paper warns that conventional approaches are limited by LLM context and by the need for many different interprocedural contracts.

How to do it (paper steps).

1. Run an abstract-interpretation analyzer and emit guards for all possible UBs (Section 3.1, PDF p. 3). The paper's `abs` example reports the guard `-2147483647 <= x` for negating an integer (Section 2.1, PDF p. 2).
2. Build the call graph and record all call sites (Section 3.1, PDF p. 3).
3. Classify assertions into analyzer-generated UB guards and call-site precondition checks, initially setting the latter to tautological `true`; synthesize or update these preconditions during specification generation (Section 3.1, PDF p. 3).
4. Package each assertion with its contextual slices as a V-Unit (Section 3.1, PDF p. 3). The two-layer context comprises its host function and callees (PDF p. 4).
5. Put units in a queue in the order of a post-order call-graph traversal, so leaves are processed before callers (Section 3.1, PDF pp. 3–4). The paper calls this a bottom-up mechanism.
6. Process the queue; if a unit cannot be verified after its iteration budget, terminate with a high-risk RTE alert (Section 3.2, PDF p. 4). Inference: this alert is not by itself proof of a genuine error.

Verus form. Inference: represent each V-Unit as a Rust function with a narrow `requires`/`ensures` contract and a `proof fn` that establishes the guard from the callee contracts. A loop in the slice would need suitable invariants. An adaptation would also need to construct the call graph, slices, and priority queue; the paper provides no Verus implementation. The paper's C ACSL annotation `requires INT_MIN < x` maps conceptually to a Verus `requires x > i32::MIN` contract, but integer semantics and casts must be modeled explicitly.

Evidence and limits. The paper gives a concrete `abs` program analyzed with Frama-C/Eva; separately, it illustrates abstract states by approximating possible values `{−3, 0, 3}` with the interval `[−3, 3]` (Section 2.1, PDF p. 2). It also gives `id`, `one`, and `zero` to show that a postcondition `ensures \result == x` can prove `one` safe while an over-constrained `requires x != 0` would create a false alarm at `id(0)` (Section 2.2, PDF p. 3). These examples support the decomposition rationale, not scalability. Abstract interpretation can produce false positives; the paper says manually identifying alarms or tuning configurations remains difficult (Section 1, PDF p. 1). The paper warns that function pointers may produce incomplete call graphs and omit function dependencies and verification context (Section 4, PDF p. 5). The authors explicitly say rigorous formalization and a proof of semantic equivalence between generated specifications and program behavior are still needed (Section 4, PDF p. 5).

## technique 2: two-stage, verifier-in-the-loop contract synthesis

What it is. For each V-Unit, ask an LLM to infer the host function's preconditions and auxiliary specifications by reasoning backward from the guard. Then, only if the assertion depends on a callee result, synthesize callee postconditions. The loop is generate, verify, and refine from verifier feedback.

When to use it. Inference: use this for interprocedural properties where a single holistic contract would mix unrelated call sites. The paper's key safety rule is to prohibit callee precondition synthesis in the callee phase, because such preconditions can be over-constrained and induce spurious alarms.

How to do it (paper steps).

1. Give the LLM the guard and the V-Unit's constrained slice, rather than the entire program (Section 3.1, PDF p. 4).
2. In phase 1, generate a host-function precondition and auxiliary specifications such as loop contracts by backward reasoning, analogous to weakest-precondition reasoning (Section 3.2, PDF p. 4).
3. Run the deductive verifier on the guard using the candidate specifications (Section 3.2, PDF p. 4).
4. Feed a failed proof back to the LLM and refine; stop on success or when `#iter` is exhausted (Section 3.2, PDF p. 4).
5. If the guard depends on a callee return value, enter phase 2 and generate callee postconditions. Explicitly prohibit callee preconditions in this phase (Section 3.2, PDF p. 4).
6. Check the assertion and all generated specifications except host preconditions. On success, advance to the next V-Unit, or return the specified program if the queue is empty; if verification remains unsuccessful after refinement, halt and alert (Section 3.2, PDF p. 4). The host preconditions become checks at caller sites (Section 2.1, PDF pp. 2–3).

The paper describes the loop as: "Both phases employ an iterative refinement strategy where (i) an LLM generates candidate specifications, (ii) a verifier validates the target assertion using these specifications, and (iii) an LLM refines the (possibly) failed candidates based on the verifier's feedback." (Section 3.2, PDF p. 4)

Verus form. Inference: use `requires` for caller assumptions, `ensures` for callee results, and `proof fn` lemmas or `assert` statements to connect the returned value to the guard. Keep generated contracts in a reviewable module and rerun Verus after each candidate. Do not encode the paper's forbidden callee precondition as a way to silence a failure; instead expose the failing caller or strengthen a proved postcondition. Verus's solver feedback is not an oracle that a specification matches intent, so a human or independent checker must review the generated contract.

Evidence and limits. The `id` example is the paper's evidence that postconditions can remove a false division alarm without constraining `id(0)`; Fig. 2 labels the two analysis/verification outcomes (Section 2.2, PDF p. 3). No experiment tests convergence, iteration budgets, or false-positive rates. Inference: an LLM may repeatedly produce a satisfiable but semantically wrong contract; a successful Verus proof would establish only that Rust satisfies the written contract. The proposal also assumes the analyzer's guards are complete enough and the call graph captures all relevant edges.

## what is proved, measured, and trusted

The paper proves no theorem about Preguss and reports no measurements. Its examples show how Frama-C/Eva and Frama-C/Wp interact on `abs` and `id`. It does not establish a formal trusted computing base for Preguss. Inference: a sound implementation would need sound analysis, complete relevant call dependencies, appropriate slices, and deductive checks of generated specifications; LLM output alone would not establish correctness. The paper itself identifies the missing foundation: "establishing a formal proof of its soundness remains non-trivial" (Section 4, PDF p. 5). Inference: for VL, Preguss is an orchestration pattern for prioritizing Verus obligations, not evidence that an agent can safely generate Rust contracts at scale. Inference: adapting it to verified Rust requires checking that generated assumptions are justified at call sites and that relevant interprocedural dependencies are retained; this paper does not assess Verus soundness.

Other explicit limitations are mutual recursion, which disrupts bottom-up traversal, and star-shaped call graphs, whose many callees can exceed the LLM context limit. For the latter, the authors suggest slicing to statements relevant to the target assertion and omitting nonessential callees (Section 4, PDF p. 5). They also leave translation of verifier diagnostics into effective LLM refinement prompts as a research challenge (Section 4, PDF p. 5).

Already done that VL should not redo. The paper's static-analysis-to-deductive-verification split, bottom-up call-graph order, and host-then-callee contract phases are explicit design ideas. Inference: VL can reuse these as orchestration hypotheses; implementation and evaluation on Rust/Verus programs, including checks of generated contracts and soundness assumptions, remain work beyond this paper.

## techniques for the catalog

- rte-guided verification units — generate UB guards, slice host-plus-callee contexts, and verify units bottom-up in call-graph post-order

- two-stage contract synthesis — infer host preconditions first, then callee postconditions only when a guard depends on a return value, with verifier-guided refinement

- precondition discipline — prohibit callee precondition synthesis in the callee phase to avoid over-constrained contracts and false alarms

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For each assertion, we construct a verification unit (V-Unit) containing both the assertion and its necessary contextual program slices."): read all six pages, including references; checked quotations, examples, numbers, section/page references, technique steps, tag, and paper identity; corrected page references, the interval-example description, precondition checks, unsupported parser and trust claims, and the paper link using its arXiv identifier; added stated limitations and marked conclusions as inferences; did not reproduce verification examples, test the Verus adaptations, or validate the cited external works.
