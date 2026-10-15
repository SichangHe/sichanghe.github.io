# Errors are Useful Prompts: Instruction Guided Task Programming with Verifier-Assisted Iterative Prompting
(authored by agents unless marked 🧑)
Tag: `skreta2023errors`, [paper](https://arxiv.org/abs/2303.14100)

## method and scope

The paper introduces CLAIRIFY, a loop that converts natural-language instructions into a domain-specific task plan, checks the plan, and feeds errors back to the language model. Its abstract says the method “combines automatic iterative prompting with program verification to ensure programs written in data-scarce domain-specific language are syntactically valid and incorporate environment constraints” (Abstract, p. 1). The demonstrated target is XDL, an XML chemistry language, and the final plans are passed to a task-and-motion planner (TAMP) for robot execution.

The verifier establishes syntax and selected static constraints, not semantic correctness of chemistry or a proof of physical safety. The paper says, “Once the generator output passes through the verifier with no errors, we are guaranteed that it is syntactically valid structured language” (Section III, p. 4). Inference: for VL, this is a pattern for compiler/verifier feedback around Verus code, but a syntax pass must not be presented as a functional proof.

## technique 1: verifier-assisted iterative prompting

Use case. Apply when an LLM must produce an unfamiliar DSL and training data are scarce, while a deterministic checker can report actionable errors. The method uses no fine-tuning and puts the DSL specification into the prompt.

Steps from Algorithm 1 and Section III-A (pp. 4–5):

1. Give the generator the structured-language definition L and natural-language instruction x. The initial prompt includes the file structure, actions, allowed parameters, and documentation (Snippet 1, p. 5).
2. Generate `ySL0 = Generator(L, x)`.
3. Run `errors = Verifier(ySL0)`.
4. If errors are nonempty and timeout has not fired, call `Generator(L, x, ySL0, errors)`, passing both the previous plan and each error; then verify again. Algorithm 1 repeats this while `len(errors) > 0` and a timeout condition is false (p. 4).
5. Return the error-free plan, or raise an error on timeout (Section III-A, p. 4).
6. Translate the accepted high-level plan to robot actions through TAMP; CLAIRIFY uses PDDLStream and camera-derived predicates to ground execution (Section III-D, p. 6).

The paper's Figure 5 example requires three iterations: the verifier first rejects invalid Hardware tags and a disallowed `solid` property, then rejects an undefined vessel, and finally accepts a plan using the available beaker. The authors report that passing only the error list is insufficient: including the erroneous previous plan and why it was wrong gives the best result (Section IV-C, p. 8).

Verus form. Inference: wrap an LLM-written Rust/Verus candidate in a loop that captures compiler and verifier diagnostics, then resubmits the exact source plus diagnostics. Keep the Verus checker authoritative: a candidate is accepted only after `cargo verus` verifies its contracts. Prompt repair may change implementation, contracts, or assumptions, so a human or policy layer must reject weakened specifications. The loop can include parser errors, failed `requires`/`ensures`, invariant failures, and unsupported Rust constructs, but the paper's syntax guarantee does not transfer to semantic correctness.

Evidence. Table I uses 108 Chem-RnD experiments: CLAIRIFY generated 105/108 plans (97%), and experts preferred its plan 75/108 times; SynthReader generated 92/108 and was preferred 13/108 (Section IV-B, Table I, p. 6). On 40 Chem-EDU instructions, CLAIRIFY generated 40/40 while SynthReader generated 0/40. These are dataset-specific denominators and use `x = 10` as the maximum verifier-loop iterations (Section IV-A, p. 6).

Limits. Generated plans still contain missing or wrong actions, ambiguous values, and vessel reuse. The authors note that a plan can be syntactically valid yet not executable, motivating environment checks and later TAMP (Introduction, p. 2). They also report that Chem-RnD plans passed through the verifier 2.58 ± 2.00 times on average (range 1–10), versus 1.15 ± 0.45 (range 1–3) for Chem-EDU (Table II, p. 8).

## technique 2: a rule-based syntax and static verifier

Use case. Use a deterministic verifier when the target DSL has a grammar and finite environment resources. The verifier first parses XML, then checks allowed action tags, mandatory and optional properties, and whether referenced hardware and reagents are defined (Section III-B, p. 5).

Steps. (1) Parse the generated text as XML. (2) Reject malformed XML. (3) Check each action tag against the DSL's allowed set. (4) Check required attributes and reject forbidden attributes. (5) Check that every hardware or reagent identifier exists in the plan's declarations or supplied environment constraints. (6) Return a list of all errors for the next prompt. The verifier's counted Chem-RnD errors were 306 missing properties, 174 disallowed properties, 120 wrong tags, 21 nonexistent actions, 15 undefined resources, and 6 XML parse failures (Table II, p. 8). Chem-EDU counts were 47 undefined resources, 26 disallowed properties, 40 wrong tags, and 3 missing properties (same table).

Verus form. Inference: implement a front-end that parses Rust and Verus syntax, checks API/resource names, and rejects unsupported constructs before invoking Verus. A static check can ensure every generated call has a declared contract, but only Verus proves the contract. Keep diagnostics tied to source spans and retain the original failed candidate for repair context.

Limits. The verifier's checks encode only known grammar and environment rules. The authors explicitly identify missing domain knowledge: wrong actions such as treating “dry over magnesium sulfate” as a `Dry` operation, reusing unwashed vessels, and ambiguous “boiling point” conditions (Section IV-B, pp. 7–8). They propose adding look-up tables, visual feedback, and vessel-cleanliness constraints, showing that unmodeled requirements remain outside the verifier.

## technique 3: environment constraints and execution handoff

Use case. Supply available hardware and reagents so generation is grounded in a particular robot. CLAIRIFY adds these constraints to the prompt and checks that plans do not reference resources outside the list (Section III-C, p. 5). The accepted XDL is then translated by PDDLStream/TAMP to low-level actions, with visual perception grounding predicates (Section III-D, p. 6).

Steps. (1) Enumerate resources in the prompt. (2) Generate an XDL plan. (3) Verify declarations and references against that set. (4) Feed the accepted plan to TAMP. (5) Execute only after TAMP produces a motion plan; the paper ran three Chem-EDU experiments on a robot (Section IV-B, p. 8).

Verus form. Inference: model deployment capabilities as explicit Verus inputs or trusted contracts, then separately verify that generated code calls only declared APIs. A proof that a function satisfies an abstract API contract does not prove that the linked driver, hardware, or runtime environment satisfies it.

Evidence and limits. The paper demonstrates real robot execution for selected Chem-EDU plans, while Chem-RnD is a proof of concept and is not executed in the real world (Section IV-A, p. 6). The success numbers therefore measure generation and selected demonstrations, not all-world task completion. Existing work already combines language models with external checkers and task planners; VL should not redo the generic feedback-loop idea without evaluating Verus diagnostics, contract-preservation, and repair cost. Inference: the product threat is moderate to high for specification drift—an agent can repeatedly repair code until it passes while silently weakening contracts—so acceptance must compare contract strength and preserve trusted assumptions.

## techniques for the catalog

- verifier-assisted prompting — regenerate a DSL program with the previous candidate and deterministic error list until verification passes or a timeout
- syntax and static checks — parse, validate grammar and attributes, and check resource references before execution
- environment-grounded handoff — constrain generated resources and pass accepted plans to a planner that models actual execution capabilities
Checked 2026-10-15 against paper skreta2023errors: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
