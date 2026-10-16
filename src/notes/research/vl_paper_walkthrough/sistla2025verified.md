# Towards Verified Code Reasoning by LLMs
(authored by agents unless marked 🧑)
Tag: `sistla2025verified`: [paper](https://www.semanticscholar.org/paper/f93d90094c273bddd86adbead1eaf89ccf9ddd27)

## central method
The paper checks an LLM's prose explanation after generation. Its key abstraction is three linked objects: CodeSemantics (the program's formal meaning), AgentClaims (a formalization of the response), and a VerificationCondition (the property the answer must establish). Correctness is split into two implications: code semantics imply the claims, and claims imply the requested condition. This decomposition is useful because an LLM can slice a large codebase and explain it, while a checker tests the claims.

The paper explicitly leaves the first implication unimplemented: CodeQL or another static-analysis tool could produce code semantics, but this work assumes the verification condition is given by the user. The trusted result is therefore conditional. The paper says, “The agent’s explanation is correct if the following holds: CodeSemantics ⇒ AgentClaims” and then “AgentClaims ⇒ VerificationCondition” (§3.1, p.7). It also says, “In this paper, we will assume that the verification condition is defined and given by the user” (§3.1, p.8). Inference: A user applying the method must therefore (1) define the question's condition, (2) choose a formal vocabulary, (3) extract claims, and (4) check the resulting formulas.

## MSAN uninitialized-use checking
For memory-sanitizer (MSAN) root-cause explanations, the paper defines a Datalog condition requiring an uninitialized expression, a data-flow path, and a later use. The predicates are `uninitialized(x,x_l)`, `flow(x,x_l,y,y_l)`, and `use(y,y_l)` (§4.1, p.9). The practical pipeline is:

1. ask the reasoning agent for an explanation and relevant snippets
2. fill missing snippets from the repository using the explanation's file and line references (§4.2, p.10)
3. ask a trace extractor to turn the snippets and final summary into a sequence of program points (§4.2.1, p.10)
4. ask a formalizer to emit facts from a fixed predicate vocabulary, such as `allocated`, `flow`, `uses`, `uninitialized`, and `memoryError` (Table 1, p.10)
5. run the Datalog verification condition; return YES only when the facts entail the condition

The paper's example facts connect an allocation to flows and uses, then conclude `uninitialized` and `memoryError` (Fig. 13, p.11). The method is not a proof of the whole C/C++ program: CodeSemantics is not generated or checked, and only the explanation's formal claims are checked. The authors state, “If we can verify that the agent proved the verification condition, we can conclude that the agent’s reasoning about the root cause for the bug is correct” (§4.1, p.9); that conclusion is conditional on the predicates and user condition capturing the real bug.

The evaluation used 20 internal MSAN bugs, five Gemini 2.0 Flash runs per bug, hence 100 runs. Human review marked 88/100 explanations valid. One formalizer pass verified 18/88 valid explanations; five extraction passes raised this to 36/88, and at least one verified run covered 13/20 bugs (§4.3, pp.12–13). The paper attributes missed validations to inconsistent fact generation. The denominator matters: 18/88 and 36/88 are among human-valid explanations, not all 100 runs.

## program-equivalence checking
For two programs, the paper's condition requires every live variable at one program's exit to have a semantically equivalent live variable at the other's exit, assuming both terminate normally (§5.1, p.14). This is stronger than observational equivalence. Apply it as follows:

1. give an equivalence analyzer the partial snippets, query, and `cat`/`code_search` tools (§5.2.1, p.14)
2. let it retrieve relevant code and state whether semantics are preserved
3. pass its snippets and explanation to a formalizer
4. have the formalizer build a PDG-like abstraction with data/control dependency predicates (§5.2.2, p.15)
5. iteratively request missing predicate instances until the abstraction is complete (§5.4, p.18)
6. run the Datalog rules for the equivalence condition and classify the answer as validated, caught, missed, or inconclusive

The paper tested 20 examples with Gemini 2.5 Pro. Fifteen had a sufficient predicate set: the agent hallucinated on 8/20 overall, and the verifier caught 6/8 (75%); thus 6/20 (30%) of all examples were caught. Three of 20 (15%) were verifier incorrect outputs caused by incomplete analysis. The 15-example confusion matrix has 3 true positives, 0 false negatives, 6 false positives, and 6 true negatives (Table 3, p.20). The remaining five examples were outside the current predicate vocabulary (Table 4, p.21). The authors caution, “we cannot circumvent the undecidability of program equivalence, just because we are using LLMs!” (§6, p.25).

## Verus form and product implications
Inference: in Verus, represent AgentClaims as `spec fn` predicates over a Rust model of the program state; use executable Rust only for the implementation and use `requires`/`ensures` to state the verification condition. A trace fact can be an assertion or a `proof fn` lemma establishing a flow relation; loop facts belong in loop `invariant` declarations. Verus can check the claims-to-condition implication, but CodeSemantics still needs a proved relation from the actual Rust implementation to the model. The paper's Datalog syntax, CodeQL semantics, and C++ source locations do not carry over directly.

Inference: a VL system can use this as a post-generation gate: have an agent explain a suspected bug or equivalence, translate its claims into Verus specifications, and reject outputs unless Verus proves the supplied condition. The threat is high if the supplied condition or model is incomplete, because the paper does not verify Eq. (1), and its equivalence verifier has both false positives and false negatives. What remains trusted includes the specification, predicate vocabulary, extraction prompts, source-code retrieval, Datalog implementation, and external libraries; only accepted logical entailments are machine checked.

## what was already done and what Inference: VL should not redo
The paper already demonstrates post-facto formal checking of LLM explanations, iterative missing-fact synthesis, and explicit separation of semantic truth from agent claims. VL should not present “LLM answer plus checker” or repeated extraction as a new core idea. Inference: A useful extension would instead connect the model to actual Rust/Verus semantics and measure whether the check catches wrong contracts or invariants on a held-out corpus. The paper reports no end-to-end verified Rust implementation, no proof of CodeSemantics, and no soundness proof for the Datalog-to-source extraction.

## techniques for the catalog
- claim-condition decomposition — split code semantics, agent claims, and the user verification condition into implications checked by a formal solver
- trace-to-Datalog extraction — recover snippets and traces, then encode them as facts from a fixed predicate vocabulary
- iterative predicate completion — rerun formalization to add missing predicate instances before checking
- equivalence entailment checking — encode live-variable semantic equivalence as Datalog rules and classify verifier outcomes

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
