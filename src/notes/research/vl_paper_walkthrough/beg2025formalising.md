# Working Document - Formalising Software Requirements with Large Language Models
(authored by agents unless marked 🧑)
Tag: `beg2025formalising`: [paper](https://www.semanticscholar.org/paper/a62939abfe15a4f6cf4472de88a4327eaf7dac68)

## scope and evidence
This is a structured review and working document, not a new verifier. It surveys 94 papers on LLM-assisted requirements formalisation, traceability, formal methods, and prompting. The authors state: “In this project, we aim to ease the burden of writing specification, helping to bridge the gap between the need for formal verification techniques and their lack of use in the software industry (due to the fast pace of the industry environment).” (Section 1, p.1). Their method searches IEEE Xplore, ACM, Scopus, Springer Link and Google Scholar, then uses Elicit for suggestions followed by manual relevance review (Section 2, pp.2–3). The reported database counts differ: 17 IEEE articles, 20 Scopus, 595 Springer, 1,368 ACM and 14,800 Google Scholar references since 2021; these are search-result counts, not included-paper denominators.

## technique 1: LLM translation and iterative refinement
what it is: translate natural-language requirements into a formal notation, then let users refine the translation. The review describes nl2spec as an LLM framework where “Users can iteratively refine translations, making formalization easier.” (Section 3, p.3).

how to apply:
1. give the requirement and target formal language to the model (the review’s examples include JML, assertions and domain models)
2. ask for a candidate specification or precondition
3. expose the result in an interface so a user can inspect and revise it
4. send the revision back for another translation
5. pass the accepted artifact to a theorem prover, model checker or code verifier

Inference: in Verus, the target can be `requires`, `ensures`, `invariant`, `spec fn`, and ghost proofs. The model’s text is only a candidate; compile and verify it, and have a human confirm that the contract captures intent. A specification can be syntactically valid yet semantically wrong.

## technique 2: neuro-symbolic checker feedback
what it is: combine an LLM or NLI model with a theorem prover. Explanation-Refiner formalises explanatory sentences, asks the prover for a guarantee, and feeds errors back for correction. The paper says: “The theorem prover then provides feedback for further improvements in NLI (Natural Language Inference) model.” (Section 3, p.3).

how to apply:
1. generate a formal explanation from natural language
2. encode it in the prover’s logic
3. run proof checking
4. return failed obligations or contradictions to the generator
5. revise and re-check until accepted

Inference: a Verus implementation can generate a lemma or contract, run `verus`, parse failed obligations, and ask for a patch. Proof functions must remain ghost-only; generated executable code must not call them at runtime. The loop proves only the encoded proposition, not the original requirement.

## technique 3: assertions and specification synthesis
AssertLLM is described as a three-phase hardware flow: “first understanding specifications, mapping signal definitions and generating assertions.” (Section 3, p.4). Its reported result is 89% correct assertions, but the review does not give the test-set denominator or an independent oracle. SpecSyn treats specification generation as sequence-to-sequence learning and reports 21% accuracy improvement over prior tools; the review gives no denominator or confidence interval. Inference: for Verus, map fields and state variables before generating assertions, emit one contract at a time, and verify each against examples and counterexamples.

## technique 4: formal testing and model checking
The review classifies model-based, finite-state, process-algebraic and algebraic methods. Model-based testing partitions inputs using assumptions of uniform behavior; finite-state testing checks language conformance but faces combinatorial state growth; process algebra uses labelled transition systems and state-space reduction. Model checkers can produce counterexamples that become test cases. The paper states: “Formal descriptions of systems can significantly support the testing process.” (Section 5, p.8).

Inference: Verus does not replace model checking. Use executable Rust plus contracts for local properties, and a finite model or test generator for transition coverage; import counterexamples as regression tests. The paper’s survey claims are not evidence that any one tool verifies arbitrary Rust.

## technique 5: prompt decomposition and retrieval
Zero-shot, one-shot, few-shot and Chain-of-Thought prompts decompose a task into intermediate steps. Retrieval-augmented generation supplies retrieved facts. The review warns that zero-shot can outperform few-shot in some studies and describes a lost-in-the-middle attention failure (Section 7.1, pp.10–11). Inference: provide Verus API rules and small verified examples as retrieved context, ask for a contract, then ask a separate checker prompt to challenge it; measure acceptance and repair rates rather than trusting fluent output.

## trusted boundary, limits and VL implications
The review’s numbers and claims are second-hand summaries of cited papers. It does not prove that LLM translations are sound, nor report a unified benchmark. Ambiguity, domain adaptation and verification remain open (Section 8). What VL should not redo (Inference): another broad taxonomy of model checking, theorem proving and prompt names. VL needs an auditable translation pipeline with requirement identifiers, generated contracts, prover obligations, counterexamples and human approval. Threat to agent-written verified Rust is high when an agent silently strengthens or weakens a natural-language requirement; the verifier then certifies the wrong statement.

## techniques for the catalog
- iterative LLM formalisation — generate a specification, expose it for revision, and re-check each revision
- neuro-symbolic feedback — use prover failures as structured corrections to model output
- assertion synthesis — map signals or program variables, generate assertions, then verify syntax and meaning
- model-based testing — partition inputs and derive tests oracles from formal descriptions
- finite-state and process testing — check conformance while controlling state explosion with reduction
- counterexample-to-test reuse — turn model-checker counterexamples into executable regression cases
- structured prompting and retrieval — provide examples, intermediate reasoning and retrieved verifier facts before generation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
