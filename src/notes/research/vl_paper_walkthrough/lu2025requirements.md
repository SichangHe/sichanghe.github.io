# Requirements Development and Formalization for Reliable Code Generation: A Multi-Agent Vision
(authored by agents unless marked 🧑)
Tag: `lu2025requirements`, [paper](https://www.semanticscholar.org/paper/8d31c772f62b23d12d4479885377219ce4b230cb)

## what ReDeFo proposes

ReDeFo is a proposed three-agent pipeline from natural-language requirements to verified executable code. The Analyst refines and structures requirements, the Formalizer translates them into formal specifications, and the Coder generates modules and verifies them. The paper's central claim is that “The core of ReDeFo is the use of formal specifications to bridge the gap between potentially ambiguous natural language requirements and precise executable code” (Abstract, p. 1). It is a vision paper, not a benchmarked system: no end-to-end success denominator, runtime, or proof corpus is reported.

The pipeline emits requirement specifications, an architecture model, informal and formal specifications, verified architecture/software components, and verification reports. Feedback can come from verification failures, unmet constraints, and inconsistencies. Humans can review intermediate artifacts or answer clarification questions, so the framework treats requirement interpretation as an interactive engineering activity. The authors write, “ReDeFo advocates human-in-the-loop interaction by incorporating expert judgment at critical points and facilitating more active expert participation beyond post-hoc review” (Section II, p. 2).

## technique 1: analyst refinement, slicing, and architecture modeling

When to use: use this before formalization when requirements are vague, high-level, cross-cutting, or contain hidden constraints.

Steps from Section II-A (pp. 2–3):

1. Refine and slice each requirement into self-contained, formalization-ready sub-requirements. Uncover implicit constraints and behaviors.
2. Elaborate vague or underspecified statements into concrete, actionable descriptions.
3. Identify constraints and behaviors that are directly formalizable.
4. Select formalizable content and map it to use cases, goals, scenarios, or similar structured requirement models.
5. Decompose the system into modular components and construct an initial architecture model, including component and state diagrams.
6. Organize the result as structured informal specifications that retain links to the original NLR.

The Solar Search case illustrates four operating modes and their switch conditions. The Analyst creates a component diagram and a state diagram, then separates system-level properties from mode-level properties. This decomposition lets later tools model-check the architecture and deductively verify each mode function.

Verus form (Inference): represent each refined sub-requirement as a Rust module contract. Encode modes as an enum or state-machine state, transitions as executable functions, and invariants as state-machine invariants or loop invariants. Use `requires` for trigger conditions and `ensures` for state and output effects. The Analyst's architecture diagram is a design artifact; Verus checks only the formalized model and code, so every diagram edge needs a corresponding transition contract.

The paper does not give accuracy measurements for refinement. It explicitly identifies hidden assumptions and corner cases as a completeness challenge (Section IV-A, p. 4), so analyst output remains a reviewable hypothesis.

## technique 2: formalizer specification synthesis and consistency checks

When to use: use the Formalizer after refinement to choose suitable formalisms and produce a complete, internally coherent specification.

Steps from Section II-A (pp. 2–3):

1. Select a formalism appropriate to each slice: model checking for state behavior, theorem proving for high expressiveness and rigor, static analysis, invariants, pre/postconditions, or temporal assertions.
2. Generate specification segments from the informal slices.
3. Compose segments by merging overlapping or logically entailed statements, preserving one coherent meaning and reducing redundancy.
4. Complete the specification by making implicit semantics explicit.
5. Assess logical soundness and completeness, looking for contradictions, gaps, and ambiguities.
6. Check traceability and consistency between NLR, architecture, formal specification, and later code.

In the case study, high-level behavior becomes LTL and mode-level function behavior becomes ACSL. NuSMV model-checks the state diagram against LTL; Frama-C performs deductive reasoning on ACSL-annotated C functions (Section III, pp. 3–4). The authors list structural checks, behavioral coverage, and traceability/consistency verification as specification-quality methods.

Verus form (Inference): use `spec fn` predicates for mathematical properties, executable Rust functions with `requires`/`ensures`, and proof functions with lemmas to establish composition and invariants. For a mode transition, a proof should show that the pre-state mode and trigger imply the permitted next mode and preserve safety invariants. LTL operators are not Verus constructs; encode the relevant transition invariant and induction argument. Keep formal specification segments linked to source requirement identifiers so a passing proof does not conceal an omitted requirement.

The key limitation is semantic alignment. The paper states, “Even if the code is formally verified against the specification, any mismatch between the specification and the original intent still renders the system incorrect from the user’s perspective” (Section IV-A, p. 4). This is a claim about the assurance boundary, not an empirical result.

## technique 3: coder generation, modular verification, and assembly

When to use: use the Coder after formal specifications stabilize, while retaining the refined NLR for traceability.

Steps from Section II-A (p. 3):

1. Generate executable code modules from the refined requirements and formal specifications.
2. Verify each generated module and its model against the formal specifications using suitable tools.
3. Assemble modules into a complete system.
4. Verify system-level behavior and preserve the relation between module proofs and architecture transitions.
5. Return verification reports and route failures or unmet constraints back to Analyst/Formalizer/human review.

The Coder must choose implementation patterns that remain verifiable and preserve modular composition. The paper warns that verification tools impose restrictions on how code must be structured. In the Solar Search example, the Coder creates C for each mode and a skeleton integrating four modes; model checking covers the state model, while Frama-C handles mode functions (Section III, pp. 3–4).

Verus form (Inference): generate Rust modules whose public functions expose contracts, then prove module invariants before integration. Use ownership and explicit state-machine APIs to make module boundaries visible. A system-level proof should establish that assembly preserves each module's assumptions; do not mark the function being verified `external_body`, because that removes the implementation obligation. External dependencies remain trusted assumptions unless their contracts are themselves verified.

## technique 4: knowledge acquisition and human feedback

ReDeFo proposes three knowledge sources: real-world projects, authoritative literature, and professional experts (Section II-B, pp. 3–4). Agents can infer missing informal requirements from code and comments, reconstruct architecture from module boundaries and data flow, and derive candidate formal properties, preconditions, and invariants from implementations. Literature supplies methods for model checking, deductive verification, theorem proving, abstract interpretation, and SMT. Experts validate functional requirements, architecture, formal properties, and tool outcomes.

These inferred artifacts must remain labeled as inference. Code-derived specifications can describe existing behavior without proving that behavior is desired. Expert review is therefore a semantic check, while automated proof is a consistency check against the chosen specification.

## what is established, trusted, and missing

The paper establishes a coherent workflow design and a concrete Solar Search walkthrough using LTL, ACSL, NuSMV, and Frama-C. It does not establish that LLM agents can reliably perform the steps. There is no quantitative evaluation, no number of successfully verified modules, and no comparison with a baseline. Trusted elements include agent interpretation, domain knowledge, formalizer choices, generated specifications, verifier soundness, model/code correspondence, and human judgments. The authors identify specification completeness, semantic consistency, code quality, training data, feedback policy, and scalability as open challenges (Section IV, pp. 4–5).

Inference: the threat to VeruLaw is high at the requirement-to-contract boundary and moderate in code generation. ReDeFo's separation of analyst, formalizer, and coder matches VL's need to distinguish intent extraction, Verus specification writing, and Rust implementation. Its practical contribution is a reviewable artifact chain: every Verus contract should point to a refined requirement and architecture transition, every generated module should discharge its contract, and integration proofs should preserve assumptions. VL should not claim that a verified Rust function satisfies a human requirement until the requirement-to-specification link has evidence and human/domain review.

## techniques for the catalog

- requirement slicing: refine vague natural language into self-contained, formalization-ready sub-requirements
- architecture modeling: decompose behavior into components, modes, state diagrams, and system constraints
- specification composition: generate, merge, complete, and consistency-check formal segments with traceability
- contract-directed code generation: produce modular code from formal specifications and verify modules before assembly
- human-in-the-loop clarification: route ambiguity, contradictions, and verification failures to engineers and formal-methods experts

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
