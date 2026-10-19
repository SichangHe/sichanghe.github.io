# Combining LLM Code Generation with Formal Specifications and Reactive Program Synthesis
(authored by agents unless marked 🧑)
Tag: `murphy2024combining`, [paper](https://arxiv.org/abs/2410.19736)

## problem and claimed contribution

The paper targets LLM-generated code for high-risk reactive systems. It states: “However, LLMs still struggle with accuracy and are unsuitable for high-risk applications without additional oversight and verification.” (Abstract, p. 1). Its proposal splits generation between an LLM and formal reactive synthesis. The paper states: “We introduce a solution that divides the code generation into two parts; one to be handled by an LLM and one to be handled by formal methods-based program synthesis.” (Abstract, p. 1).

The concrete instantiation uses Temporal Stream Logic (TSL). TSL expresses temporal control while predicate terms observe inputs and function terms construct outputs. The paper states (Introduction, p. 1):

> Our key insight is to use formal specification languages that allow for “holes” in the generated code that can be later filled in with LLM code generation.

The synthesis engine supplies the temporal controller, while LLM-generated code supplies data transformations and integration (System Overview, p. 3).

## technique 1: natural language to TSL with few-shot prompting

Inference: use this when requirements describe a reactive system through a high-level problem summary plus explicit assumptions and guarantees. The paper’s pipeline input has three parts: “(a) A high-level, natural language summary of the problem (Problem Description in Fig. 1). (b) A more detailed, natural language description of the most important assumptions and guarantees needed in the spec (System Behavior in Fig. 1). (c) A separation of data and control in the form of function and predicate terms. The specification should use these to encapsulate logic not relevant to the assumptions and guarantees (Data Transformations in Fig. 1).” (System Overview, p. 3).

How to do it:

1. Provide the summary, assumptions, guarantees, and function/predicate terms (System Overview, p. 3).
2. Put several NL-to-TSL examples and explicit explanations of TSL terms and statements in a prompting template (Natural Language (NL) to TSL, p. 3).
3. Ask the LLM to convert the structured NL input into a TSL formula. The paper says: “Using prompt engineering, we utilize an LLM to convert the NL inputs into a TSL specification” (System Overview, p. 3).
4. Attempt compilation and synthesis. The experiments include specifications that fail to compile. The authors suggest rejection and reprompting for real-world use: “In real-world applications, rejecting unsynthesizable TSL specifications and using techniques like reprompting can lead to much better success rates.” (Testing Methodology, p. 5).

The paper’s arbiter example separates a request predicate `r`, a grant output `g`, and a coin-flip predicate `p`. Its TSL assumptions include `always assume { F (r t); }`; guarantees include `(r 1) -> F ([ g <- 1 ])` and ordering constraints such as `((p 2 3) && [ g <- 1 ] -> ! ([ g <- 2 ]) W [ g <- 3 ]);` (Fig. 2, p. 3). The figure says the TSL specification is semantically identical to the NL description (Fig. 2 caption, p. 3).

Inference: Verus form: represent the generated temporal controller as a verified Rust state machine. Keep request and grant data in Rust types; write `spec fn` predicates for pure observations and state relations, and use `requires`, `ensures`, and loop `invariant` clauses to prove each transition preserves the arbiter safety properties. A `proof fn` can establish the transition invariant, while executable wrapper functions perform I/O. TSL’s temporal synthesis guarantee itself does not carry over automatically: the Verus proof must establish the temporal property over an explicit transition relation, and any LLM-written wrapper remains a separate proof obligation.

Evidence: the paper reports that GPT-4 “can perform very well using few shot prompting” for NL-to-TSL conversion (Natural Language (NL) to TSL, p. 3), but this is a qualitative claim without a separate NL-to-TSL accuracy denominator. The failure condition is also explicit: “This weak performance demonstrates the limits of few shot prompting when requiring the LLM to generate a syntactically complicated and unknown language.” (Results, p. 6).

## technique 2: TSL synthesis to reduce unverified code

Inference: use formal synthesis to isolate temporal control from LLM-generated implementations of data transformations. TSL universally quantifies over implementations of predicate and function symbols; the specification constrains temporal relations, while users implement the symbols. The paper states: “The specification φ only describes a temporal relation of predicate evaluations to function applications–abstracting away from what these predicates and functions do to any underlying data.” (Formal Verification Assisted Code Generation, p. 4).

How to do it:

1. Define predicate terms for environment observations and function terms for output values (Formal Verification Assisted Code Generation, p. 4).
2. Write a TSL formula containing assumptions and guarantees over those terms.
3. Solve the TSL realizability problem with a formal synthesis tool; the synthesized strategy becomes a code block describing a Mealy machine (Formal Verification Assisted Code Generation, p. 4).
4. Implement the predicate and function bodies and integrate the synthesized code into the larger project (System Overview, p. 3).
5. Manually check that the TSL specification captures the intended requirements. The paper states: “The user only needs to manually check the correctness of the specification is correct.” (Formal Verification Assisted Code Generation, p. 4).

Inference: Verus form: encode the synthesized controller as an enum or struct carrying state, with a transition function whose `ensures` clause states the next-state relation. Prove safety and request/grant ordering with `assert`, `assert forall`, and inductive `invariant` clauses. Treat external predicates and function bodies as trusted only after proving their contracts; do not treat a generated controller as verified until those contracts connect the Rust implementation to the TSL assumptions.

Evidence: the paper’s arbiter benchmark runs each trial 25 times (Table 2 caption, p. 6). TSL success rates are 61.5% for 10 conditions, 45.4% for 20, and 16.7% for 30; the LLM pipeline is 0% at all three condition counts (Table 2, p. 6). The row labeled “Average line count (TSL)” gives 22, 31, and 40 for those condition counts (Table 2, p. 6). The caption mentions both verified synthesized lines and generated integration lines, but the table displays only this one line-count row; it does not label a separate count for each category. Inference: the reported success rates cannot be reconstructed as simple success counts out of 25, since none is an integer multiple of 4 percentage points. The paper gives no explanation of this discrepancy.

The project-oriented benchmark compares five tasks under TSL, LLM-only, and prompt-seeded regeneration, with success-rate columns labeled `sr 5`, `sr 10`, and `sr 15` (Table 1, p. 6). For example, Game of Life TSL is 60%, 50%, and 73% at 5, 10, and 15 tries, while Game of Life LLM is 40%, 50%, and 40%; the table gives average total lines 124 and 87 respectively and average unverified lines 98 for TSL. The methodology refers to a “pass at k condition”, and the results describe the `sr 15` comparison as “at 15 tries” (pp. 5–6). The paper does not provide raw success counts or further independent-run counts.

## technique 3: prompt seeding with synthesized code

Inference: consider prompt seeding when task-specific synthesized code could help the LLM generate a complete solution. The authors distinguish it from preserving verified code: “Additionally, we show that, when not concerned with verification, LLM code generation can be significantly improved when using TSL-based prompt seeding.” (Conclusion, p. 6). The paper’s alternative is: “Alternatively, we adopt the prompt seeding technique of Magicoder (Wei et al. 2024) and use the synthesized code to request the LLM to generate from the ground up a working solution.” (System Overview, p. 3).

How to do it:

1. Generate the TSL specification and synthesize its controller.
2. Insert that synthesized, task-specific code into the LLM prompt.
3. Ask the LLM to regenerate the entire solution from the seeded prompt; this is pipeline (b), distinct from pipeline (a), which implements wrapper code around the synthesized controller (Fig. 1, p. 2; System Overview, p. 3).
4. Evaluate whether the generated program is a working implementation, as in the full-generation benchmark (Testing Methodology, p. 5).

The paper explains the rationale: “We expect that using verified and task-specific code to further improve the outputs of the pipeline over LLM-only generation.” (Testing Methodology, p. 5). For Game of Life, it reports: “On challenging tasks like implementing a working implementation of Conway’s game of life, the prompt seeding approach achieves a 0.80 success rate as opposed to GPT-4’s 0.40 success rate at 15 tries.” (Results, p. 5; Table 1, p. 6).

Inference: Verus form: seed an LLM with a Verus-verified module whose public functions expose proved contracts. Ask it to generate an application using that module. This adapts prompt seeding while retaining the module, rather than reproducing the paper’s whole-solution regeneration. Run `verus` on the entire result and add proof obligations for ownership, state representation, and wrapper assumptions; passing the seeded module’s proofs does not prove the generated integration.

## what is proved, measured, and trusted

The formal guarantee applies to the synthesized TSL strategy under the formula’s assumptions and universal quantification over function and predicate interpretations. The authors state that users must manually check the specification (Formal Verification Assisted Code Generation, p. 4). Table 1 separately counts unverified code in pipeline (a). Inference: correctness of the intended application also requires checking the NL-to-TSL translation, data transformations, and integration; the synthesized strategy alone does not prove these. Benchmark success and line counts do not establish production reliability or general correctness of NL-to-TSL translation.

The paper reports a scaling result: “the number of generated lines grows linearly with the number of conditions; the interacting requirements do not create exponential complexity that would cause it to be impractical to review.” (Results, p. 6). Inference: this is useful for VL because it suggests shrinking proof scope by isolating temporal control, but Verus still needs executable-state invariants and contracts for every data transformation.

Inference: the main threat to a product that has agents write verified Rust is specification drift. An LLM can omit or misstate a guarantee before synthesis, and the synthesis engine will faithfully implement the wrong formula. The paper itself identifies unsynthesizable TSL and few-shot prompting limits as failure modes. Inference: a VL workflow should preserve the NL requirements, generated TSL or Verus contracts, synthesis output, and verifier logs as linked artifacts so a reviewer can detect this drift.

Inference: VL should not redo the paper’s basic split of temporal control from data manipulation or its prompt-seeding experiment. New work should test the split with Verus contracts, explicit temporal-to-inductive invariant translations, and realistic Rust integration benchmarks.

## techniques for the catalog

- nl-to-tsl few-shot prompting: convert structured natural-language assumptions and guarantees into a TSL specification with examples and term explanations
- tsl correct-by-construction synthesis: synthesize the temporal controller, then implement predicate and function terms around its guaranteed control structure
- synthesized-code prompt seeding: place synthesized code in an LLM prompt to regenerate the entire solution
- data/control separation: keep temporal behavior in the specification and move pointwise data transformations into function and predicate terms
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This separation enables developers to first focus on when their system should execute certain behaviors, and leave the question of how those behaviors should be implemented for a later step in the development process."): checked the whole paper, quotations, reported numbers, page and section references, technique steps, tag, and arXiv link; corrected quotations and page references, distinguished wrapper generation from whole-solution prompt seeding, qualified ambiguous trial and line-count reporting, and marked adaptations as inferences; did not reproduce experiments or verify the proposed Verus adaptations.
