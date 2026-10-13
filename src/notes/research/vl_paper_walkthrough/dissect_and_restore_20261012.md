# Dissect-and-Restore: AI-based Code Verification with Transient Refactoring
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

This study covers the complete extracted paper, including Prometheus's code decomposition, proof-tree search, rollback, restoration, and evaluation. I found no earlier paper-specific walkthrough. The paper's main claim is transient refactoring: the abstract says transiently applying modular restructuring substantially improves the AI's effectiveness in verifying individual components (abstract, p. 1). The implementation targets Dafny; Verus mappings below are inferences.

## technique 1: transient code-level modularization

What it is. Prometheus rewrites nested imperative loops into named sub-methods, each with at most one loop. The outer method keeps its original signature and contract; the extracted method receives generated pre/postconditions. After each sub-method is verified, an LLM restores the original shape and maps proofs back.

When to use it. Use this when nested loops make invariants interact or overwhelm the verifier. The paper says: "We perform loop lifting by refactoring the imperative loops into named functions that encapsulate their bodies." (Sec. 3, p. 5). It reduces the number of control-flow interactions presented at once.

How to apply it.

1. Give the model the original method and contract
2. Extract each loop body into a named method with a bounded loop count
3. Generate a contract for each extracted method
4. Sanity-check that the contracts are mutually verifiable and sufficient to restore the original
5. Verify sub-methods sequentially
6. Recompose the original method and rerun the verifier
7. If automatic restoration fails, manually map the verified method back

The running MaxSub example extracts `innerLoop` from `MaxSubImpl`, then calls it from the outer loop (Fig. 2, p. 6). The authors explicitly caution that contracts must suffice to restore the original code.

Verus form (inference). Extract a Rust loop body into a helper function or lemma with explicit `requires`, `ensures`, and `invariant`; call it from the outer function. Preserve ownership and borrow lifetimes in the helper signature. Restoration must be checked by Verus on the original control flow, because a helper contract can be too weak or hide an aliasing obligation. Dafny method syntax and generated contracts do not transfer directly.

Evidence and limits. Code refactoring changes the proof surface and may change semantics if contracts or side effects are mishandled. The system's final guarantee is only as strong as restoration equivalence and verifier checking. It does not prove equivalence independently; it asks the LLM to merge and then verifies the result.

## technique 2: proof-level decomposition into a verification tree

What it is. Prometheus builds a tree of partially verified code. Each node stores code, a sub-lemma signature with pre/postconditions, and optional proof text. Depth-first traversal asks an LLM for missing assertions, invariants, lemma signatures, calls, and bodies; Dafny checks every generated version.

How to apply it.

1. Initialize the root with the target code and optional natural-language proof outline
2. Ask the LLM whether the current signature is logically verifiable
3. Generate code and all required verification fragments
4. Run Dafny and classify errors
5. For valid-looking but unproved assertions, ask for a helper lemma and insert its `by` call
6. For loop invariants, ask for a lemma proving the invariant after one iteration
7. Add generated signatures to a working list and create child nodes
8. DFS through children until all signatures have verified bodies

The paper describes the node contents: "A tree node contains (i) a partially verified version of the code, (ii) the signature of the sub-lemma including pre- and post-conditions, and (iii) the optional textual proof." (Sec. 3.3, p. 6). Its example uses `SegSumExt` and `Lemma2` to establish sequence-sum facts inside `innerLoop` (Fig. 3, p. 7).

Verus form (inference). Represent each node as a candidate Rust module containing a lemma signature and proof body. Insert `by`-style lemma calls as explicit Verus lemma invocations, and keep a working list of unresolved lemmas. A proof outline can become comments or structured metadata in the prompt. The DFS orchestration belongs outside Verus; Verus checks each node's code.

Evidence and limits. Decomposition expands the search space. The paper identifies a central risk: "Automatically synthesized helper lemmas may be irrelevant, overly strong, or based on overly restrictive assumptions" (Sec. 3.1, p. 5). A lemma that verifies in isolation may not help the root goal, so utility must be checked at recomposition.

## technique 3: verifier-feedback generation and targeted repair

What it is. Prometheus runs the verifier after every generated code fragment. Syntax errors, unprovable contracts, and timeouts trigger regeneration with the verifier output and additional generic guidance. It repairs two classes of proof failures: assertions that seem logically valid but are unproved, and loop invariants that seem correct but need a helper lemma.

How to apply it.

1. Generate a candidate code body and annotations
2. Run Dafny with a per-invocation timeout
3. Feed diagnostics into a repair prompt rather than editing blindly
4. For a failed assertion, ask whether a helper lemma is logically appropriate
5. Generate its signature and call, insert `by { ... }`, and rerun
6. For a failed invariant, generate a one-iteration lemma and insert its call
7. Repeat up to a configurable attempt limit

The paper says it "does not attempt direct fixes" for syntax, unprovable conditions, or timeouts; it re-prompts with feedback (Sec. 3.3, p. 6). This keeps the verifier as the acceptance oracle and makes every repair auditable.

Verus form (inference). Parse Verus diagnostics, classify them, and ask for a revised invariant, trigger, lemma, or call. Keep the failed source and diagnostic. Do not convert a timeout into success or insert `assume` to silence it. Verus's borrow-checker diagnostics should be treated as a separate class from SMT failures.

Evidence and limits. Feedback is limited: the model may repeatedly regenerate the same invalid fragment. A retry cap is required. The paper reports no proof that a generated repair preserves the original specification other than rerunning Dafny.

## technique 4: rollback, depth-first search, and temperature annealing

What it is. The search is autonomous DFS with rollback. If a node fails after t generation attempts, it retries up to s times while lowering LLM temperature by Delta-temp. If the node still fails, it rolls back to its parent; root failure aborts the run. This preserves verified fragments while abandoning an unproductive branch.

How to apply it.

1. Keep a parent pointer and current verified code at every node
2. Explore the first child depth-first
3. On repeated generation or verification failure, retry with lower temperature
4. After s failures, discard the node and return to its parent
5. Reuse verified siblings and fragments; do not restart the whole tree
6. Abort only after the root exhausts its retries

The authors summarize the strategy: "Briefly, the approach resembles simulated annealing" (Sec. 3.3, p. 7). Temperature reaches zero, making the final attempts deterministic.

Verus form (inference). Use a persistent search tree of source snapshots and diagnostics. Lower sampling temperature or switch to deterministic decoding after failures. A rollback must restore the exact verified parent source. Keep all abandoned branches for audit; never merge a proof fragment whose assumptions differ from the current parent.

Evidence and limits. DFS can miss a successful branch because ordering is heuristic. Lower temperature improves repeatability but not semantic quality. User-configurable t and s determine cost and completeness.

## technique 5: optional natural-language proof outlines

What it is. Users may provide a lightweight textual sketch of intended reasoning. Prometheus includes it in the root and node prompts to guide decomposition, while Dafny remains the checker. This is useful where the model cannot infer the required induction structure.

Verus form (inference). Accept a proof outline describing invariant meaning, induction cases, and helper lemmas; treat it as untrusted guidance. Convert it into candidate annotations, then require Verus proof. Do not treat prose as a specification or evidence.

## measured results, trust, and product threat

The abstract reports 86% success versus 68% baseline on the curated dataset, with specification-complexity success rising from 30% to 69% and proof-outline cases from 25% to 87% (p. 1). Table 1 (p. 8) reports 19/22 (86%) Prometheus success on TitanBench (baseline 15/22, 68%), 10/10 on the column headed with nested loop (10 tasks; baseline 6/10) and 9/12 (75%) on the column headed without nested loop (baseline 9/12); the paper's text says 12 of the 22 tasks have nested loops, which disagrees with those column sizes. On MBPP-DFY-153 Prometheus solves 90/90 (100%) and the baseline 89/90 (98%). Table 2 (p. 9) reports restoration rates such as 7/8 verification and 7/7 restoration for Full-Sharing. The 90 programs are the MBPP-DFY-153 selection, not the larger-program experiment. That experiment (Sec. 4.4, Table 4, p. 10) has eight LeetCode-derived tasks with five runs each: Prometheus verifies 7 of the 8 at least once (the task with 487 verification lines fails), and the baseline verifies only the two simplest. Denominators vary by benchmark subset, so headline rates must not be combined.

Proved: only the verifier-checked Dafny output. Measured: search success under chosen prompts, timeouts, temperatures, and curated tasks. Trusted: Dafny semantics, refactoring/restoration correctness, parser and tree bookkeeping, and the model's assumption that generated contracts are adequate. The system does not independently prove semantic equivalence between original and transiently refactored code.

VL should reuse transient helper extraction, proof trees, verifier feedback, and rollback. It should not let an LLM silently weaken contracts or preserve a helper proof without checking the original Rust. Threat to an agent-written verified-Rust product (inference): high for specification drift and medium for proof soundness if Verus checks restored code. A weak helper contract, incorrect restoration, or branch bookkeeping bug can produce a verified artifact that no longer implements the intended behavior. Require equivalence checks, complete source snapshots, and explicit rejection of `assume`-based repairs.

## techniques for the catalog

- transient loop lifting — extract nested loops into one-loop helpers, verify, then restore original structure
- proof-tree decomposition — recursively split complex obligations into helper lemma nodes with tracked code and contracts
- feedback-driven repair — regenerate annotations using verifier diagnostics and bounded retries
- rollback with annealing — DFS search with parent rollback and decreasing model temperature after failures
- proof-outline guidance — use optional natural-language strategy to steer generated induction and helper lemmas
- restoration verification — recompose verified fragments and rerun the verifier on the original shape

## study status

The first-page title was confirmed before reading. Main text, figures, algorithm descriptions, evaluation, and limitations were read from the extracted PDF. Quotes are verbatim and section/page pointed. The study is staged pending the gate.
Audited 2026-10-12 against the paper: checked the abstract figures (86, 68, 30, 69, 25, 87 percent), Tables 1 to 4, the t, s, and temperature-step settings, the by-lemma and invariant repair steps, the rollback description, and all quotations; page references were counted from PDF page 1. Changed: page references for six quotations and figures (each was two pages early); the abstract quotation that cut off mid-word is now a plain paraphrase; MBPP-DFY-153 baseline corrected from 90/90 to 89/90; Table 1 subsets labelled and the paper text-versus-table mismatch on nested-loop counts noted; the 90 unverified programs were wrongly attributed to the larger-program experiment, now replaced by the eight-task Table 4 result. The Verus form paragraphs are marked inference and are sound as sketches.
