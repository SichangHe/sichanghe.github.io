# Next Steps in LLM-Supported Java Verification
(authored by agents unless marked 🧑)
Tag: `teuber2025next`, [paper](https://doi.org/10.1109/nse66660.2025.00007)

## what the paper studies

Teuber and Beckert study generation of auxiliary JML annotations with an LLM and the KeY deductive verifier. The top-level specification is supplied by a human; the model fills one missing loop invariant or a subcontract for a called method. This boundary matters because the authors state: “if the partially annotated Java Program contains a top-level specification and the LLM only complements the annotation by auxiliary specifications such as loop invariants and/or method contracts for submethods, successful verification guarantees that the (human-provided) top-level specification is satisfied by the implementation.” (§II, p.2). The paper does not claim that an LLM-generated top-level contract captures user intent.

The pipeline is: send a partially annotated Java file to an LLM, add its annotations, submit the draft to KeY, and either return a verified file or feed parser errors or open proof-branch labels back to the model (Fig. 1, p.2). The experiments compare continuing a conversation with verifier feedback against restarting from scratch and sampling again. They use 27 invariant tasks and 14 subcontract tasks, with up to ten attempts per instance (§III, p.2). The tasks cover arrays, quantifiers, `assignable`, and pre-execution values.

## technique 1: verifier-in-the-loop auxiliary annotation generation

When to use it: use this when a trusted top-level contract exists and only proof-supporting annotations are missing.

Steps:

1. Mark one gap in a Java/JML file, such as a loop invariant or called-method contract (§II, p.2).
2. Prompt the LLM to describe behavior, then output only a JML annotation. The Appendix prompt requires `normal_behavior` (Appendix A, p.5); its feedback prompts add that only variable names from the original code may be used (Appendix A, p.5).
3. Insert the annotation into the Java file and run KeY.
4. If parsing fails, return the parser's error message. If semantic proof fails, return labels of open branches such as “Invariant Initially Valid” or “Normal Execution ( a != null)” (§III, p.2).
5. Ask the LLM to revise the annotation and repeat until verification succeeds or the attempt budget is exhausted.

The paper's worked example has `f(x)` with `//@ ensures \result == -2*x;` and a callee `g(x) { return x+x; }` without a contract (Listing 1, p.2). A suitable contract for `g` lets KeY prove `f` modularly. KeY's method contracts therefore act as abstraction boundaries.

Verus form: Inference: preserve a human-approved Rust/Verus top-level `ensures`, expose one missing `requires`, `ensures`, loop `invariant`, or proof lemma, and run `verus` after each model proposal. Feed compiler diagnostics and failed proof obligations back as text. Inference: Verus contracts differ from JML syntax; use Rust identifiers and Verus constructs documented in the local Verus guide, and do not mark a `spec fn` with `ensures`.

Evidence and limits (inference): a successful KeY proof establishes the provided contract under KeY's logic and models; it does not prove that the model's auxiliary annotations are the intended specification. The authors deliberately avoid delegating the top-level requirement to the LLM.

## technique 2: feedback versus independent sampling

When to use it: use this comparison when deciding whether detailed verifier feedback is more useful than independent attempts.

The feedback strategy keeps the conversation and appends the parser error or proof-branch labels. The sampling strategy restarts the model from the original prompt whenever a candidate fails. For each of the 27 invariant and 14 subcontract tasks, the authors compare success as the number of feedback steps or independent samples rises to ten (§III, p.2; Fig. 2, p.2).

Both strategies improve the chance of finding a solution as attempts increase. The paper reports that current KeY feedback “does not significantly improve GPT 4O’s ability to generate correct JML contracts” (§III, p.3). It hypothesizes that the model sometimes gets stuck making marginal changes to a wrong answer. Token cost explains a practical difference: if the initial prompt has I tokens, output has O, and feedback has R, n independent samples cost `n(I+O)`, while n feedback rounds cost `n(I+O) + n(n−1)(O+R)/2` (§III, p.3). Feedback therefore has a quadratic conversation-history term.

The mixed experiment evaluates 50 candidates either as 50 independent samples or as five groups of ten feedback rounds (Table I, p.3). Invariant generation succeeds on 23/27 pure sampling and 24/27 mixed; subcontract generation succeeds on 7/14 pure sampling and 8/14 mixed. These are task denominators, not percentages over generated tokens. The mixed method solves all sampling cases plus one additional invariant and one additional subcontract.

Verus form: Inference: compare independent Rust/Verus generations against bounded verifier-feedback conversations under equal candidate and token budgets. Record both success per task and proof-token cost. Inference: periodically restart a stuck conversation rather than assuming more diagnostics will force a new proof idea.

## technique 3: prompt structure for invariants and subcontracts

For invariant synthesis, the system prompt asks the model to understand the code, draft a natural-language behavioral description, translate it to JML, and return an annotation in a prescribed block. The user prompt identifies the method and marks `//Add invariant here`; it reminds the model that the result must be a loop invariant and shows a `loop_invariant` template (Appendix A, p.5).

For subcontract synthesis, the prompt asks for a `normal_behavior` contract with `requires`, `ensures`, and `assignable`, based on the calling method's needs. It says the contract should make the caller's specification provable (Appendix A, p.6). Feedback prompts distinguish syntax (“The provided code is not valid JML”) from semantics (“some proof goals were not closed”) and include the exact open proof branches.

Verus form: Inference: use the same separation: first have the model state the intended relation, then emit only a Verus proof artifact; include the caller's required facts when asking for a callee contract. Keep feedback identifiers tied to source-level names and explain whether the failure is parsing, typing, invariant initialization, invariant preservation, or postcondition entailment.

## what has already been done

The paper reruns experiments from the authors' earlier KeY/JML LLM work (reference 3) and does not provide a new verifier, specification logic, or Rust encoding. Its contribution is the controlled feedback-versus-sampling experiment and the explicit token-efficiency analysis. Inference: the paper's evidence cautions that KeY's current feedback was not shown to beat restarting; it tested one model (GPT 4O) and one gap per file.

## techniques for the catalog

- verifier-gated auxiliary synthesis — generate one missing invariant or subcontract, then accept only after deductive verification
- typed feedback recovery — send parser errors for syntax failures and open proof-branch labels for semantic failures
- restart versus conversation sampling — compare fresh independent candidates with feedback continuation under equal attempt budgets
- mixed bounded search — combine several feedback rounds with independent restarts to escape stuck solutions
