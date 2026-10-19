# Requirements Development and Formalization for Reliable Code Generation: A Multi-Agent Vision
(authored by agents unless marked 🧑)
Tag: `lu2025requirements`, [paper](https://arxiv.org/abs/2508.18675v1)

## what ReDeFo proposes

ReDeFo is a proposed three-agent pipeline from natural-language requirements (NLRs) to verified executable code. The Analyst refines and structures requirements, the Formalizer translates them into formal specifications, and the Coder generates modules and verifies them. The paper's central claim is that “The core of ReDeFo is the use of formal specifications to bridge the gap between potentially ambiguous natural language requirements and precise executable code.” (Abstract, p. 1) The paper presents a vision and a case walkthrough; it reports no quantitative evaluation, end-to-end success denominator, runtime, or proof corpus.

The pipeline emits requirement specifications, an architecture model, informal and formal specifications, verified architecture/software components, and verification reports. Feedback can come from verification failures, unmet constraints, and inconsistencies. Humans can review intermediate artifacts or answer clarification questions, so the framework treats requirement interpretation as an interactive engineering activity. The authors write, “ReDeFo advocates human-in-the-loop interaction by incorporating expert judgment at critical points and facilitating more active expert participation beyond post-hoc review.” (Section II, p. 2)

## technique 1: analyst refinement, slicing, and architecture modeling

Inference: use this before formalization when requirements are vague, high-level, or contain hidden constraints.

Steps from Section II-A1 (p. 2):

1. Refine and slice each requirement into self-contained, formalization-ready sub-requirements. Uncover implicit constraints and behaviors.
2. Elaborate vague or underspecified statements into concrete, actionable descriptions.
3. Identify constraints and behaviors that are directly formalizable.
4. Decompose the system into modular components that reflect logical or domain-specific divisions.

Section II (p. 2) also describes constructing an initial architecture model and organizing the results into structured informal specifications. Section II-A1 lists use case analysis, goal modeling, and scenario-based modeling as supporting knowledge, rather than additional mandatory steps.

The Solar Search case illustrates four operating modes and their switch conditions. The Analyst creates a component diagram and a state diagram. System-related requirements become system-level properties, while mode-specific requirements become mode-level properties (Section III, p. 4). The case uses model checking for the state model and deductive reasoning for the mode functions.

Inference: for Verus, represent each refined sub-requirement as a Rust module contract. Encode modes as an enum or state-machine state, transitions as executable functions, and invariants as state-machine invariants or loop invariants. Use `requires` for trigger conditions and `ensures` for state and output effects. The Analyst's architecture diagram is a design artifact; Verus checks only the formalized model and code, so a transition contract would make each diagram edge available for verification.

The paper does not give accuracy measurements for refinement. It explicitly identifies hidden assumptions and corner cases as a completeness challenge (Section IV-A, p. 4). Inference: analyst output should remain open to review.

## technique 2: formalizer specification synthesis and consistency checks

Inference: use the Formalizer after refinement to choose suitable formalisms and work toward complete, internally coherent specifications.

Steps from Section II-A2 (p. 2):

1. Select suitable formalisms and generate specification segments from informal requirement slices.
2. Compose segments by merging similar or overlapping statements that describe identical or logically entailed semantics.
3. Complete the specification by making implicit semantics explicit.
4. Assess logical soundness and completeness, looking for contradictions, gaps, and ambiguities.

The supporting knowledge includes formalisms used in model checking, theorem proving, and static analysis; property descriptions such as invariants, pre/postconditions, and temporal assertions; and specification-quality methods such as structural checks, behavioral coverage analysis, and traceability/consistency verification (Section II-A2, p. 2). The examples of bounded-state model checking and highly expressive theorem proving appear in the Coder knowledge discussion (Section II-A3, p. 3).

In the case study, high-level behavior becomes Linear Temporal Logic (LTL) specifications and mode-level function behavior becomes ANSI/ISO C Specification Language (ACSL) specifications. NuSMV model-checks the state diagram against LTL; Frama-C performs deductive reasoning on ACSL-annotated C functions (Section III, p. 4).

Inference: for Verus, use `spec fn` predicates for mathematical properties, executable Rust functions with `requires`/`ensures`, and proof functions with lemmas to establish composition and invariants. For a mode transition, a proof should show that the pre-state mode and trigger imply the permitted next mode and preserve safety invariants. A transition invariant covers permitted next states; it does not by itself prove temporal claims about eventual behavior. Keep formal specification segments linked to source requirement identifiers so a passing proof does not conceal an omitted requirement.

The key limitation is semantic alignment. The paper states, “Even if the code is formally verified against the specification, any mismatch between the specification and the original intent still renders the system incorrect from the user’s perspective.” (Section IV-A, pp. 4–5) Inference: verification against a specification alone cannot establish that the specification captures user intent.

## technique 3: coder generation, modular verification, and assembly

The Coder uses both refined requirements and formal specifications (Section II, p. 2). The paper does not require specifications to be frozen before code generation.

Steps from Section II-A3 (p. 2):

1. Generate executable code modules from the refined requirements and formal specifications.
2. Check generated modules and models against the formal specifications using appropriate formal verification techniques.
3. Assemble modules into a complete system.

Section II (p. 2) separately describes verification reports and feedback, including verification failures, unmet constraints, and inconsistencies. Experts may review artifacts or answer agents’ questions; no fixed feedback-routing algorithm is given.

The Coder must choose implementation patterns that remain verifiable and preserve modular composition. The paper warns that verification tools may restrict how code must be structured (Section IV-B, p. 5). In the Solar Search example, the Coder creates C for each mode and a skeleton integrating four modes; model checking covers the state model, while Frama-C handles mode functions (Section III, p. 4).

Inference: for Verus, generate Rust modules whose public functions expose contracts, then prove module invariants before integration. Use ownership and explicit state-machine APIs to make module boundaries visible. A system-level proof should establish that assembly preserves each module's assumptions; do not mark the function being verified `external_body`, because that removes the implementation obligation. External dependencies remain trusted assumptions unless their contracts are themselves verified.

## technique 4: knowledge acquisition and human feedback

ReDeFo proposes three knowledge sources: real-world projects, authoritative literature, and professional experts (Section II-B, p. 3). Agents can infer missing informal requirements from code and comments, reconstruct architecture from module boundaries and data flow, and derive candidate formal properties, preconditions, and invariants from implementations. Literature supplies methods for model checking, deductive verification, theorem proving, abstract interpretation, and Satisfiability Modulo Theories (SMT). Experts validate functional requirements, architecture, formal properties, and tool outcomes.

Inference: these code-derived artifacts should remain labeled as inference. Code-derived specifications can describe existing behavior without proving that behavior is desired. Expert review is therefore a semantic check, while automated proof is a consistency check against the chosen specification.

## what is established, trusted, and missing

The paper describes a workflow and a Solar Search walkthrough using LTL, ACSL, NuSMV, and Frama-C (Sections II–III, pp. 2–4). It reports no quantitative evaluation, number of successfully verified modules, or baseline comparison. Inference: the walkthrough does not establish that LLM agents can reliably perform the steps. Elements whose correctness still needs justification include agent interpretation, domain knowledge, formalizer choices, generated specifications, verifier soundness, model/code correspondence, and human judgments. The authors identify specification completeness, semantic consistency, code quality, training data, feedback policy, and scalability as open challenges (Section IV, pp. 4–5).

Inference: for VeruLaw (VL), the requirement-to-contract boundary needs explicit review. ReDeFo's separation of analyst, formalizer, and coder matches VL's need to distinguish intent extraction, Verus specification writing, and Rust implementation. Its practical contribution is a reviewable artifact chain: every Verus contract should point to a refined requirement and architecture transition, every generated module should discharge its contract, and integration proofs should preserve assumptions. VL should not claim that a verified Rust function satisfies a human requirement until the requirement-to-specification link has evidence and human/domain review.

## techniques for the catalog

The following summarize the proposed techniques in Sections II–III (pp. 2–4).

- requirement slicing: refine vague natural language into self-contained, formalization-ready sub-requirements
- architecture modeling: decompose behavior into components, modes, state diagrams, and system constraints
- specification composition: generate, merge, complete, and consistency-check formal segments with traceability
- contract-directed code generation: produce modular code from requirements and formal specifications, verify modules and models, and assemble the system
- human-in-the-loop clarification: route ambiguity, contradictions, and verification failures to engineers and formal-methods experts

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "By engaging in the above process, agents can gradually develop a comprehensive understanding of how requirements, architecture, specifications, and code are interrelated."): read the full paper text and study; checked quotations, numbers, section/page references, technique steps, and evaluation claims; corrected the paper link, quotation punctuation, page references, and unsupported step requirements, and labeled recommendations as inference; did not reproduce the case study, run its tools, or validate the Verus adaptations.
