# InvWeaver: Deductive Feedback for Invariant Synthesis in Interacting-Loop Programs
(authored by agents unless marked 🧑)
Tag: `wu2026invweaver`, [paper](https://doi.org/10.1145/)

## problem and core idea
InvWeaver targets nested and sequential loops where independent LLM guesses omit facts needed by neighboring loops. Its abstract states: “The key insight is to explicitly expose inter-loop dependencies and systematically propagate proof obligations through a principled combination of abstraction and deductive reasoning.” (abstract, p. 1) The authors identify the failure mode as local under-specification: “inner or intermediate loops typically lack explicit contextual information (e.g., precise pre-conditions or post-conditions) during reasoning, causing LLMs to hallucinate ‘weak invariants’.” (section 1, p. 1)

Inference: This decomposition maps naturally to Verus loop proofs: derive each loop's entry and exit predicates, then feed obligations from outer or preceding loops into the next loop's `invariant` and `ensures` clauses.

## technique: loop-constraint graph and obligation-guided synthesis

when to use it

Use this for interacting loops whose correctness depends on state transferred between loops, such as sorting, matrix processing, dynamic programming, and graph algorithms. A loop-constraint graph (LCG) has loop and boundary nodes, executable state-transition edges, and verification-dependency edges. The paper defines the graph as “a tuple G = (V, Est , Evd ), where the node set V is partitioned into two disjoint subsets Vbound and Vloop.” (section IV-A, p. 5)

steps from the method

1. Build the LCG from the program's AST and CFG. Nodes are entry/exit boundaries or individual loops; state-transition edges contain initialization, nested updates, and loop-body code; dependency edges say which establishment, preservation, or provability obligation needs another node's specification (section IV-A).
2. Traverse the graph in dependency order. For nested loops, traverse top-down; for sequential loops, traverse boundary-inward. The paper states: “I NV W EAVER then traverses the LCG top-down for nested loops and boundary-inward for sequential loops, using dependency-relevant specifications as local proof contexts to prompt initial invariants.” (section IV, p. 4)
3. Prompt the LLM with the local assumptions, pre-state, obligation, and post-state, asking for candidate invariants. The candidate is attached to the loop node, while dependent nodes retain an explicit obligation.
4. Formally validate each candidate's establishment, preservation, and provability. “A verifier checks the three properties of establishment, preservation, and provability, either passing the validation or returning the failed invariants and violated obligations when the verification fails.” (section IV, p. 4)
5. Diagnose each failure with weakest-precondition (WP) calculus. WP reconstructs the target predicate; the LLM reports failure cause, modification scope, and refinement direction (section IV, p. 4).
6. Repair the failed invariant and every dependent invariant, delay-filter irrecoverable candidates, propagate newly exposed obligations along the LCG, and return to formal validation. The paper calls this “Dependency-Propagating Refinement” (section IV, p. 4).

The motivating bubble-sort example shows why backward reasoning is needed: after a swap, the proof must establish that `a[down - 1]` is less than all elements in `(down, up + 1)` so ordering propagates (section III, p. 3). This is an example of a transferred postcondition becoming the next loop's local obligation.

Verus form

Inference: Build an LCG outside Verus from Rust control flow. For every node, encode establishment as an `assert` from the incoming predicate, preservation in a loop `invariant`, and provability as the postcondition needed by the successor. Use `requires`/`ensures` on functions and `invariant` on each `while` or `for` loop. Use proof functions and `assert forall`/quantifier lemmas for array ordering. WP diagnosis is an external calculation; Verus's solver failure is the validation signal. The paper's LCG and five-step controller are not Verus constructs.

## evidence, limits, and trust

The multi-loop benchmark contains 82 tasks from OOPSLA-13, SV-COMP, and CLRS-Alg. Table I reports InvWeaver solving 72/82, with 13 solved uniquely; the table gives 3.9 average proposals and 256.9 seconds average time. The paper summarizes: “I NV W EAVER solves 72 out of the 82 benchmark problems.” (abstract, p. 1) A separate single-loop benchmark has 70 tasks; Table II reports 68/70, 1.8 proposals, and 24.9 seconds, with six unique solutions (section V). The denominators and benchmark sources are table captions.

Inference: These are benchmark success rates, not soundness rates. Soundness rests on the formal verifier and the semantics of the source language; the LLM only proposes predicates. The approach assumes the AST/CFG extraction captures all relevant dependencies and that WP reconstruction is correct. It can spend substantially more time because repair is iterative. The paper's examples and evaluation are in C-like benchmarks, not Rust ownership or Verus's nonlinear arithmetic. Inference: Product threat is medium: weak invariants can waste iterations, while an unsound verifier or incorrect translation would threaten proof validity; the LCG makes missing context more observable.

## what is proved and what remains trusted

The method checks establishment, preservation, and provability for each accepted candidate, but it does not prove that the LLM's diagnosis is correct; the verifier decides acceptance. The benchmark measures solved tasks and time, not generated-proof maintainability. Trusted components include the parser/LCG builder, WP implementation, SMT verifier, and translation of candidate predicates. Inference: VL should preserve all accepted proof obligations in generated Rust so that the final Verus check, rather than an LLM judgment, remains the trust boundary.

## what VL should reuse

Inference: Reuse dependency-labeled obligations and delayed filtering to avoid repeatedly asking for predicates that cannot satisfy a known predecessor. Existing single-loop invariant generators should not be rerun independently on every inner loop; InvWeaver's contribution is the explicit propagation of context.

## techniques for the catalog

- loop-constraint graph: represent loops, boundaries, state transfers, and proof dependencies as a graph for synthesis order
- obligation-guided inference: prompt each loop with predecessor and successor proof obligations
- WP failure diagnosis: reconstruct failed targets and classify repair scope and direction
- dependency-propagating refinement: repair failed and dependent invariants, filter doomed candidates, and iterate validation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
