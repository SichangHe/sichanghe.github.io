# Agentic Specification Generator for Move Programs
(authored by agents unless marked 🧑)
Tag: `fu2025agentic`, [paper](https://arxiv.org/abs/2509.24515)
## scope and result

Fu, Xu, and Kim present MSG, an automated generator of Move Specification Language (MSL) clauses for Move smart contracts. The paper's central design is compositional generation followed by prover-guided repair. Its experiment covers 357 functions from three Aptos libraries, with three trials per function and five generation rounds. The authors report 300/357 (84%) non-abstract verifiable specifications with OpenAI o3-mini; this denominator is all selected functions, and abstract outputs for the remaining 57 are not counted as verifiable (Abstract, pp. 1–2; §V-A, p. 7). The target code has 3,259 lines inside function bodies and 17 loop-containing functions (Table I, p. 7).

The trust boundary is explicit: Move Prover translates implementation and specification to Boogie and SMT formulas, then checks them with Z3 or CVC5 (§II-B, p. 3). A passing proof establishes the generated clauses for the encoded implementation; it does not establish that the clauses express the product requirement. Inference: for VeruLaw, an LLM-generated Verus contract must likewise be treated as a candidate promise until a human or independent requirement check validates its meaning.

## technique: split specification generation by semantic class

What it is: MSG dispatches four specialized ClauseGen agents for abort conditions (`aborts_if`), global-state effects (`modifies`), postconditions (`ensures`), and loop invariants, then uses an ensembler to merge them. The paper says, “MSG employs four different ClauseGen agents, each specialized in generating a specific class of functional specification clauses expressible in MSL” (§III, p. 3). This separates orthogonal obligations and prevents one failed class from discarding useful clauses.

How to apply: (1) extract the target function and dependencies; (2) ask one agent for each applicable clause class; (3) retain loop invariants inside the function, while collecting other clauses in a specification block; (4) merge snippets and normalize bindings and ordering with an ensembler. For `ensures`, the prompt asks the model to connect arguments, result, and global-state changes; for branches it recommends implications such as `ensures c ==> ...` and `ensures !c ==> ...` (§III-A, p. 5).

Verus form: Inference: use separate prompt/tools for `requires`, `ensures`, `modifies`, and loop `invariant` blocks, then emit one Rust/Verus function and proof block. Verus has no Move `aborts_if`; encode expected failure behavior in the API contract or a result type. Verus loop invariants are written as `invariant` clauses in the loop syntax, not as a function call. The separation is an orchestration choice, not a Verus language feature.

Evidence and limits: MSG produced 876 clauses: 466 `ensures`, 252 `aborts_if`, 144 `modifies`, and 14 loop invariants (Table II, p. 8). Its 300/357 success rate is compared with all-in-one MSG-AIO's 191/357 (53.5%) (Table II, pp. 8–9). Inference: the comparison supports decomposition for this dataset and model, not a universal optimum. Deeply nested calls and impure or nonexistent functions still caused failures (§V-A, p. 8).

## technique: verifier-in-the-loop iterative repair

What it is: Move Prover is used as an oracle after each generation round. “As long as verification fails (2, 3, 4), we include the Move Prover diagnostics, error summary, pre-defined guidance on common fixes for known error types, and the counterexample (if any) in the prompt for one or more responsible ClauseGen agents” (§III-B, p. 5). Outcomes are pass, counterexample, timeout, or compilation error.

Steps: generate clauses; post-process formatting; ensemble; run the prover; classify the diagnostic; ask the relevant agent to revise; repeat up to five rounds. Regular expressions match common prover errors, such as undefined or impure functions, and add targeted guidance (§III-B, p. 5).

Verus form: Inference: run `verus` after each candidate, feed diagnostics and counterexamples back to the responsible contract/proof prompt, and preserve a bounded repair loop. Counterexamples guide revisions but do not prove requirement completeness. Evidence: removing prover feedback reduced agentic verifiability from 300/357 (84.0%) to 253/357 (70.9%) and clauses from 876 to 590 (Table II, p. 8); in all-in-one generation, 59/191 (30.9%) successes occurred after the first round with feedback, versus 7/147 (4.8%) without it (§V-B, p. 9). The denominators are successful functions for the round statistic and all 357 targets for overall rates.

## technique: specification coverage by random deletion

What it is: Because partial MSL specifications can pass, MSG estimates whether clauses cover implementation behavior by mutating the function AST. “1 Randomly delete parts of the AST (e.g., code blocks, statements, expressions) of function to create mutants. 2 Lift modified AST to source code and check the code mutant against the generated specification by Move Prover. 3 If verification passes, the deletion is not covered by the specification; otherwise, the part is covered.” (§III-C, p. 6).

Steps: delete AST nodes; pretty-print each mutant; verify it against the candidate; label a deletion uncovered when the mutant still verifies; include line diffs for uncovered regions in the next prompt. The paper's pair example changes `(a0 + b0, a1 + b1)` to `(a0 + b0, 0)` and shows that a specification asserting only the first component passes both versions, while the complete two-component specification rejects the mutant (Fig. 3, p. 6).

Verus form: Inference: mutate executable Rust expressions or statements, re-run Verus against the same `ensures`, and use surviving mutants to request missing contracts. A Rust AST mutator and source printer are needed; this does not transfer automatically from Move. Evidence: 66/1,071 MSG trials and 77/1,071 MSG-AIO trials triggered coverage feedback (three trials × 357 functions); the paper reports few triggers because prover-accepted outputs were usually already complete (§V-C, p. 10). This metric is implementation-agnostic but does not test whether the specification matches an external requirement.

## technique: dependency slicing and selective inlining

What it is: MSG performs interprocedural def-use analysis for direct and indirect callees, structs, and constants, then builds two contexts: a sliced context listing definitions (V2) and a best-effort inlined context (V1) (§III-D, p. 6). Inlining proceeds monotonically: inline a callee if compilation succeeds, and skip conflicting later callees.

Steps: identify dependencies; slice the library; attempt callee inlining; pretty-print the resulting AST; dispatch both contexts to ClauseGen agents; compare or ensemble results. Inlining unblocked 7 functions for agentic MSG and 20 for all-in-one MSG (Introduction, p. 2). Evidence: MSG verified 300/357 (84.0%) versus MSG-inline 299/357 (83.8%); overlap analysis found 7 inline-only and 8 normal-only successes (Table II and Table V, pp. 8–10). Inference: parallel context variants are safer than assuming inlining always helps, because deeply nested branches can overwhelm the model.

Verus form: Inference: use Rust module/AST dependency extraction and optionally inline small pure helpers into a prompt context; keep executable source modular. Verus proofs still require contracts for called functions, so textual inlining cannot replace verified summaries.

## technique: abstract specifications as a last resort

When all ClauseGen agents fail, MSG emits an MSL abstract specification using uninterpreted functions as a proof template. “However, we do not consider abstract specifications as verifiable specifications in evaluating MSG as they are only placeholders for developers essentially” (§III-E, p. 6). Inference: a Verus analogue is an explicitly marked `external_body` or axiom boundary only for trusted dependencies, never on the function whose behavior is being verified; replace it with a proved lemma or executable model before claiming end-to-end assurance.

## what is proved, measured, and trusted

The measured claims are prover acceptance, clause counts, matching against expert clauses, and coverage mutations. For comprehensiveness, the paper decomposes expert specifications into clauses and counts generated clauses that imply each one; move-stdlib has 50/58 (86.2%) full matches, while aptos-framework has 120/188 (63.8%) among functions with ground-truth conditions (§V-A, p. 7). Overall generated clauses include 291 unique clauses (33.2% of 876) absent from expert specifications (Table III, p. 8). The paper does not prove those unique clauses are required. Inference: the main threat to agent-written verified Rust is semantic omission masked by a successful proof; MSG's deletion metric and independent requirement review are useful defenses. Functions with impure calls, hallucinated functions, invalid syntax, or high complexity remain failure modes (§V-A, p. 8). Existing work already supplies the core verifier loop, compositional prompting, dependency context engineering, mutation coverage, and abstract fallback; VL should reuse these patterns rather than re-invent them.

## techniques for the catalog

- compositional clause agents — generate postconditions, abort conditions, state effects, and loop invariants with separate specialized prompts, then ensemble them
- prover-guided repair — run the verifier after each candidate and feed diagnostics and counterexamples into bounded regeneration rounds
- random-deletion specification coverage — mutate AST code and verify mutants to locate behavior not constrained by a candidate specification
- dependency slicing and best-effort inlining — build bounded LLM contexts from interprocedural dependencies and compare normal and inlined forms
- abstract specification fallback — emit uninterpreted-function templates for expert completion when concrete proof generation fails
Checked 2026-10-13: audit record fu2025agentic; paper-study comparison complete; gate executed; experiments not rerun
