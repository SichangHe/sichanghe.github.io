# Leveraging LLMs for Formal Software Requirements: Challenges and Prospects
(authored by agents unless marked 🧑)
Tag: `beg2025leveraging`, [paper](https://www.semanticscholar.org/paper/ca89f3d1febfe099bc396707f3e2b168c1556576)

## problem and contribution

This position paper addresses translation from ambiguous natural-language requirements to formal specifications that model checkers or theorem provers can verify. VERIFYAI combines natural-language processing, ontology-driven domain modelling, artefact reuse, large language models, symbolic feedback, and human review. The paper says, “Generating these specifications from informal and ambiguous natural language requirements remains the key challenge.” (abstract, p. 1). Its state-of-the-art synthesis finds that local assertion generation is more reliable than full contract synthesis, while larger specifications need post-processing and human oversight.

The paper identifies five challenges: semantic ambiguity, lack of ground-truth datasets, tool interoperability, traceability across artefacts, and explainability/user trust (Table 1, p. 8). It proposes human-in-the-loop formalisation, multimodal artefact alignment, standardised benchmarks, neuro-symbolic reasoning, and interactive traceability tools. Inference: these are research directions and observations from a position paper, not a validated end-to-end method.

## technique 1: scope generation at assertion level before whole contracts

What it is. Generate small assertions or helper conditions tied to local code and context before attempting a complete function contract. The survey reports AssertLLM at 89% correctness and Laurel above 50% success, while full JML or temporal-logic contracts often fail embedded SMT verification (section 2, pp. 4–5).

When to use it. Start locally when the specification target has narrow scope, well-defined semantics, and limited dependencies. The paper observes, “tasks with small scope and well-defined semantics yield better results” (section 2, p. 5).

How to do it.
1. Select a function, branch, or signal with clear semantics (section 2, p. 5).
2. Provide source context and the desired contract/assertion type to the LLM; AssertLLM conditions prompts on contract type and context (section 2, p. 4).
3. Generate an assertion or postcondition fragment (section 2, p. 4).
4. Submit it to the target verifier and reject or revise fragments that fail (sections 2 and 4.2, pp. 4 and 9).
5. Compose reviewed local fragments into a larger contract; the paper describes full contracts as requiring post-processing (section 2, p. 5).

Verus form. Inference: express local properties as `requires` and `ensures` on Rust functions, and use `assert` or `assert forall` for intermediate facts. Inference: have the model propose a small `ensures` clause, then run Verus before accepting it; avoid treating natural-language plausibility as proof. Full contract composition remains an inference because the paper uses ACSL, JML, Dafny, and temporal logic rather than Verus.

Evidence and limits. The 89% and over-50% figures are the survey's reported results for AssertLLM and Laurel, not a new common benchmark (section 2, p. 5). The paper says outputs can appear semantically sound yet fail automated verification, demonstrating a gap between human-readable and prover-accepted correctness (section 2, p. 5). Inference: local success does not imply system-level soundness when assumptions across modules interact.

## technique 2: verifier-in-the-loop iterative refinement

What it is. Generate a formal fragment, run a checker or solver, feed failures back into the prompt, and repeat. SpecGen uses prompt mutation and verification feedback; nl2spec uses interactive, step-by-step synthesis; the VERIFYAI design keeps symbolic reasoning and human review in the loop (sections 2 and 4.2, pp. 4 and 9).

How to do it.
1. Convert the requirement and source context into a candidate formal statement (section 4.2, p. 9).
2. Run the target tool and collect proof obligations, counterexamples, or unsatisfied constraints (section 4.3, p. 10).
3. Add the diagnostic output to the next prompt and ask for a correction (section 4.3, p. 10).
4. Repeat until the statement is accepted or a reviewer rejects the requirement as ambiguous (sections 2 and 4.2, pp. 4 and 9).

The paper reports SpecGen succeeding on 279 of 384 benchmark programs (section 2, p. 4), but does not state that this denominator transfers to every tool or task. Inference: in Verus, use compiler/solver diagnostics as feedback and preserve a human check that the repaired postcondition still expresses the requirement. A Verus proof result alone cannot detect an incorrect requirement.

## technique 3: domain grounding with ontologies and retrieval

What it is. Supply domain ontologies, retrieved artefacts, and prior specifications so an LLM does not interpret requirements in isolation. The proposed workflow combines natural-language requirements and domain ontologies, prompt strategies, and a tool-neutral JSON-LD representation (Figure 1b, p. 10).

How to do it.
1. Build or select an ontology describing domain entities and constraints (sections 1 and 3, pp. 2 and 8).
2. Retrieve relevant specifications, source fragments, tests, and execution traces (sections 2 and 4.2, pp. 4 and 9).
3. Prompt with the requirement plus this context using zero-shot, one-shot, few-shot, or Chain-of-Thought variants (sections 2 and 4.1, pp. 4 and 8).
4. Store the output in JSON-LD, then translate it to ACSL, JML, Dafny, or another verifier language (section 4.2, p. 9).

Verus form. Inference: map JSON-LD fields to Rust function signatures, `requires`, `ensures`, datatype invariants, and `spec fn` predicates. Inference: retrieved examples should constrain terminology, while every generated clause still needs Verus checking and review. JSON-LD interoperability is proposed by the paper, not demonstrated across Verus.

## technique 4: human review and traceability across artefacts

What it is. A formal-methods reviewer checks every generated specification for semantic alignment, logical completeness, and needed revisions. The paper states, “In both the Tritype baseline and PathCrawler-augmented workflows, every LLM-generated ACSL specification was checked by at least one author with formal methods expertise.” (section 4.2, p. 9).

How to do it.
1. Generate a candidate specification from requirements and analysis output (section 4.2, p. 9).
2. Check semantic alignment with intended behavior and logical completeness (section 4.2, p. 9).
3. Feed corrected fragments into the next prompt (section 4.2, p. 9).
4. Record links between requirement text, specification, source code, tests, and verification results; the paper proposes graph-backed trace maps (section 4.3, p. 10).

Verus form. Inference: keep requirement identifiers beside Rust functions and link each `requires`/`ensures` clause to reviewed prose. Inference: reviewers should inspect both the clause and the assumptions needed by Verus; a proof does not establish that the clause captures user intent.

## technique 5: symbolic execution as context and coverage diagnostic

What it is. The initial experiment re-simulates a PathCrawler workflow on the C `Tritype` program. PathCrawler supplies path-based input/output examples; the LLM uses them to generate ACSL annotations. The run explored 19 paths, covered 11, marked 8 infeasible, achieved 100% branch coverage, yet classified none of 11 generated test cases as success or failure because postconditions were insufficient (Appendix A, pp. 12–15).

How to do it.
1. Instrument the program with PathCrawler and collect all-path path predicates and I/O examples (Appendix A, pp. 12–14).
2. Prompt the LLM with those examples to propose ACSL annotations (Appendix A, p. 12).
3. Run Frama-C and its SMT provers on the annotated code (Appendix A, pp. 15–16).
4. Treat coverage and solver verdicts separately; add explicit output assertions when paths remain “unknown” (Appendix A, pp. 14–15).

The baseline Tritype file produced two implicit goals and all four provers proved 2/2; the pathcrawler-augmented file produced 20 goals, with Z3 proving 13/20, Alt-Ergo 15/20, CVC4 13/20, and CVC5 15/20 (Appendix A, Tables 2–3, pp. 16–18). The paper attributes failures to timeouts, unknown statuses, and difficult disjunction-heavy arithmetic. Inference: for Verus, symbolic execution traces can guide candidate invariants, but branch coverage is not a correctness proof; write explicit `ensures` and loop invariants and require Verus to discharge them.

## what is measured, trusted, and still open

Measured numbers come from heterogeneous prior studies and the paper's small Tritype re-simulation. The paper's own baseline and augmented tables count prover goals, not successful natural-language translations. Its planned evaluation will compare zero-shot, one-shot, few-shot, and CoT with precision, recall, and F1 under prompt perturbations (section 4.1, p. 8); those experiments are future work. The proposed JSON-LD bridge, graph traceability, multimodal alignment, hierarchical module synthesis, and active learning remain plans (sections 3–4, pp. 8–11).

Inference: the largest threat to a product of agent-written verified Rust is semantic omission: an LLM can produce a prover-accepted but incomplete specification, especially when requirements are ambiguous or multi-module. The paper's explicit human review, verifier feedback, and trace links are therefore safeguards to integrate. What VL should not redo is treating one successful proof or branch-coverage report as evidence that an informal requirement was faithfully captured; the paper documents the opposite failure mode in Tritype.

## techniques for the catalog

- local assertion-first synthesis: generate and verify narrow assertions before composing whole contracts
- verifier-in-the-loop refinement: feed solver failures and counterexamples back into iterative generation
- ontology and retrieval grounding: provide domain models and prior artefacts through a tool-neutral representation
- human traceability review: review semantic alignment and link requirements, code, specifications, tests, and results
- symbolic execution context: use path predicates and I/O examples to guide specifications while separating coverage from proof

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
