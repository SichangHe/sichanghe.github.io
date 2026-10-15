# What do LLMs need to Synthesize Correct Router Configurations?
(authored by agents unless marked 🧑)
Tag: `mondal2023router`, [paper](https://doi.org/10.1145/3626111.3628194)

## central result

The paper studies GPT-4 synthesis of router configurations and proposes Verified Prompt Programming (VPP): combine an LLM with verifiers, convert verifier diagnostics into localized natural-language prompts, and iterate. The experiments cover Cisco-to-Juniper translation on one router and no-transit policy synthesis on a seven-router star network. The abstract reports 10× leverage for translation and 6× for no-transit, where leverage is automated correction prompts divided by human prompts.

The authors explicitly warn that verification cannot compensate for a missing specification or unusable diagnostics: “Verification requires a specification and actionable localized feedback to be effective” (Abstract, p. 1). They also state, “We emphasize we have not built C O S YNTH” and that API calls were manually simulated (Section 2, p. 2). Thus the results demonstrate a prompting method and feasibility evidence, not a deployed autonomous system.

## technique: verified prompt programming loop

What it is. VPP replaces direct human correction with a fast verifier-to-LLM loop and a slower human fallback. A human supplies context and desired behavior; the model emits configuration; verifiers check syntax, topology, and semantics; a humanizer turns diagnostics into a prompt; the model emits a complete revised configuration; iteration stops on success, timeout, or too many attempts.

Steps from the paper.

1. Form a triple `(A,H,V)` of AI, human, and verification suite (Section 2, p. 2).
2. Give the LLM a precise natural-language description of context and task (Section 2, p. 2).
3. Run the syntax verifier first; the paper uses Batfish (Section 2, p. 2).
4. Humanize error lines into natural-language feedback and send it to the LLM (Sections 2–3, pp. 2–3).
5. After syntax passes, run a semantic verifier; feed localized semantic differences back to the model (Section 2, p. 2).
6. If the verifier cannot finish or the trial budget expires, return the current output to a human (Section 2, p. 2).

The paper says, “Notice that there is a fast inner loop between V and A, where verifier results are automatically fed back to GPT-4” (Section 2, p. 2). Inference: A Verus version would run `cargo verus` or the Verus verifier after each generated Rust patch, humanize diagnostics by function/obligation, and retain a human fallback. Verus proof errors are not router counterexamples, so feedback templates and localization must be designed for Verus diagnostics; this is an inference.

## technique: modular verification and local specifications

The authors find that global feedback confuses GPT-4, while modular checks localize errors. For multi-router synthesis, a Modularizer converts a machine-readable JSON topology into separate natural-language prompts for each router and can emit local policy specifications. A Composer reassembles the generated pieces for Batfish (Section 2, p. 3). The paper says, “We found it was easier for the LLM to correct itself using feedback from modular verification of components of a network (individual routers or even route maps within a router), rather than the network as a whole” (Abstract, p. 1).

Steps from the paper.

1. Represent modules, topology, and connections in JSON (Section 2, p. 3).
2. Generate a textual topology prompt and separate local-policy prompts (Section 4.1, p. 4).
3. Synthesize one router configuration per prompt (Section 4.1, p. 4).
4. Verify each local topology and policy, returning a counterexample or mismatch to the relevant router prompt (Section 4.1, p. 4).
5. Compose all router files and run a final global simulation to check the global policy (Section 4.1, p. 4).

In the no-transit experiment, GPT-4 oscillated when given one global policy and a global counterexample. Local policy prompts (add a community on ingress, drop matching communities on egress) gave better results (Section 4.1, p. 4). Inference: For VL, split a large Verus specification into function- or module-local proof obligations, then run a final whole-program proof. Local contracts should still imply the global property; otherwise modular feedback can hide cross-module failures.

## technique: humanizers, error classes, and reusable instruction prompts

For Cisco-to-Juniper translation, the humanizer classifies diagnostics into syntax errors, structural mismatches, attribute differences, and policy-behavior differences (Section 3.1, p. 3). Syntax and structural errors are handled first because they can mask semantic differences. Each class has a formulaic prompt with fields filled from Batfish or Campion; policy differences use an example prefix because the affected input space is difficult to describe (Section 3.1, p. 3). An initial-instruction-prompt database (IIP) records expert rules that prevent recurring mistakes; the Modularizer also decomposes complex prompts into smaller prompts (Section 2, p. 3).

Steps from the paper.

1. Parse verifier output and assign an error class (Section 3.1, p. 3).
2. Fill the class's prompt template with affected lines, components, attributes, or example prefixes (Section 3.1, p. 3).
3. Ask the model to print the entire configuration and re-run all verifiers (Section 3.1, p. 3).
4. Add stable expert instructions to IIP as recurring mistakes are observed (Sections 2 and 4.2, pp. 3–5).

Inference: Verus humanizers should preserve the exact failing obligation, source span, assumptions, and remaining unsatisfied postcondition. An IIP could encode project conventions, but it must not replace checking: the paper's own AND/OR policy mistake persisted despite an IIP and required a human prompt (Section 4.2, p. 5).

## evidence and limitations

In translation, Table 2 marks six error classes. GPT-4 automatically fixed missing local-as, invalid prefix-list syntax, missing/extra route policy, OSPF attributes, and wrong BGP MED, but not different prefix lengths or redistribution behavior. The complete cycle used about two human and 20 automated prompts, giving 10× leverage; calls were manually fed to GPT-4 (Section 3.2, p. 4). The experiment ignored NTP and other non-routing features (Section 3.1, p. 3).

In no-transit synthesis, the cycle used two human and 12 automated prompts, giving 6× leverage. GPT-4 still needed human intervention for neighbor commands placed outside `router bgp` and for AND/OR route-map semantics (Section 4.2, p. 5). The topology was restricted to a seven-router star, and the authors call experiments “very preliminary” (Sections 4.1 and 6, pp. 4–5).

What is proved is tool-backed acceptance by Batfish/Campion for the selected routing and forwarding scope. The paper does not provide a formal proof of the LLM, humanizer, or prompt templates; it also does not build the proposed C O S YNTH API system. The verifier and its specifications remain trusted, and a verifier cannot prove behavior outside the supplied specification. Inference: for Verus, the trusted base includes Verus, solver models, external bodies, unsafe code, and the correctness of the contracts; localized feedback can accelerate repair but cannot establish missing requirements.

Threat to VL. Inference: the paper's strongest warning for agent-written verified Rust is specification incompleteness plus global-to-local mismatch. A model can satisfy a local lemma while violating a system invariant, or fix one proof obligation while introducing another. VL should reuse local diagnostics, modular obligations, automatic retry, and final global verification, while retaining explicit human review for unresolved or oscillating feedback. The paper has already demonstrated the pattern and the need for verifier feedback; VL should not claim novelty for merely adding a retry loop.

## techniques for the catalog

- verified prompt programming — iterate LLM generation with syntax and semantic verifiers that emit localized correction prompts
- modular verification prompts — synthesize and verify local components, then compose and check the global property
- diagnostic humanization — classify verifier output and fill reusable prompt templates with precise affected locations
- initial instruction prompts — maintain expert rules for recurring model mistakes while continuing to verify every result
- leverage measurement — report automated correction prompts divided by human prompts with the complete denominator

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
