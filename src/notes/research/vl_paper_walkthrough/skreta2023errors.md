# Errors are Useful Prompts: Instruction Guided Task Programming with Verifier-Assisted Iterative Prompting
(authored by agents unless marked 🧑)
Tag: `skreta2023errors`, [paper](https://arxiv.org/abs/2303.14100)

## method and scope

The paper introduces CLAIRIFY, a loop that converts natural-language instructions into a domain-specific task plan, checks the plan, and feeds errors back to the language model. Its abstract says the method “combines automatic iterative prompting with program verification to ensure programs written in data-scarce domain-specific language are syntactically valid and incorporate environment constraints” (Abstract, p. 1). The demonstrated target is XDL, an XML chemistry language, and the final plans are passed to a task-and-motion planner (TAMP) for robot execution.

The verifier establishes syntax and selected static constraints, not semantic correctness of chemistry or a proof of physical safety. The paper says, “Once the generator output passes through the verifier with no errors, we are guaranteed that it is syntactically valid structured language” (Section III, p. 3).

## technique 1: verifier-assisted iterative prompting

Use case. Apply when an LLM must produce an unfamiliar DSL and training data are scarce, while a deterministic checker can report actionable errors. The method uses no fine-tuning and puts the DSL specification into the prompt.

Steps from Algorithm 1 and Section III-A (p. 3):

1. Give the generator the structured-language definition L and natural-language instruction x. The XDL description in the prompt includes “its file structure and lists of the available actions (can be thought of as functions), their allowed parameters and their documentation” (Section III-A, p. 3); optional hardware and reagent constraints follow it (Snippet 1, p. 4).
2. Generate `ySL0 = Generator(L, x)`.
3. Run `errors = Verifier(ySL0)`.
4. If errors are nonempty and timeout has not fired, call `Generator(L, x, ySL0, errors)`, passing both the previous plan and each error; then verify again. Algorithm 1 is printed as `while len(errors) > 0 or timeout condition != True` (p. 3); the prose says the loop continues “until the generated code is error-free or a timeout condition is reached” (Section III-A, p. 3). Inference: the printed loop condition looks mis-stated, and the prose gives the intended stopping rule. The iterative prompt (Snippet 2, p. 4) holds the XDL description, constraints, instruction, previous XDL, “This XDL was not correct.”, the error list one per line, and “Please fix the errors”.
5. Return the error-free plan; on timeout, “an error is thrown for the user” (Section III, p. 3), and Section III-A says “we were not able to generate a task plan”.
6. Translate the accepted high-level plan to robot actions through TAMP; CLAIRIFY uses PDDLStream and camera-derived predicates to ground execution (Section III-D, p. 4).

The paper's Figure 5 example (p. 7) requires 3 iterations: the first feedback lists a Hardware section that should contain only Component tags, a disallowed `solid` property in Reagent, and an undefined `container`; per the caption, once the tags could be processed, new errors appeared, “including a constraint error that the plan uses a vessel not in the environment”, and the loop repeated until the verifier passed a plan using the available beaker and stir bar. The ablation on a 10-experiment Chem-RnD validation set (Table III, p. 6; Section IV-C, p. 7) found plan-generation success of 0% for the naive message (previous XDL plus “This XDL was not correct. Please fix the errors.”), 30% for the last error list alone, 50% for the cumulative error list from all earlier iterations, and 100% for previous XDL plus last error list. The authors conclude that including the erroneous XDL and why it was wrong gave the best result, and that without the XDL context, success was low (Section IV-C, p. 7). Without any XDL description in the prompt, GPT-3 produced no usable XDL for any of the 10 validation inputs (p. 7).

Verus form. Inference: wrap an LLM-written Rust/Verus candidate in a loop that captures compiler and verifier diagnostics, then resubmits the exact source plus diagnostics. Keep the Verus checker authoritative: a candidate is accepted only after `cargo verus` verifies its contracts. Prompt repair may change implementation, contracts, or assumptions, so a human or policy layer must reject weakened specifications. The loop can include parser errors, failed `requires`/`ensures`, invariant failures, and unsupported Rust constructs, but the paper's syntax guarantee does not transfer to semantic correctness.

Evidence. Table I uses 108 Chem-RnD experiments: CLAIRIFY generated 105/108 plans (97%), and experts preferred its plan 75/108 times; SynthReader generated 92/108 and was preferred 13/108 (Section IV-B, Table I, p. 4, and text, p. 5; the remaining 20 were judged of similar quality). Table I's caption describes the 108 experiments as organic chemistry experiments from [34]; experiments are limited to under 1000 characters because of GPT-3 token limits (Section IV-A, p. 4). On 40 Chem-EDU instructions, CLAIRIFY generated 40/40 while SynthReader generated 0/40. The expert-preference comparison is on Chem-RnD only. These are dataset-specific denominators; the generator is text-davinci-003, and a run counts as failed after more than `x = 10` loop steps (Section IV-A, p. 4; Section IV-B(1), pp. 4–5).

Limits. Generated plans still contain wrong actions (more than SynthReader's), ambiguous values, and vessel reuse; on Chem-EDU, a few wrong-parameter errors where units are missing (Section IV-B, pp. 6–7). The authors note that a plan can be syntactically valid yet not executable by a robot, which requires information about the world state and robot capabilities (Introduction, p. 1). They also report that Chem-RnD plans passed through the verifier 2.58 ± 2.00 times on average (range 1–10), versus 1.15 ± 0.45 (range 1–3) for Chem-EDU (Table II, p. 6).

## technique 2: a rule-based syntax and static verifier

Use case. Use a deterministic verifier when the target DSL has a grammar and finite environment resources. The verifier first parses XML, then checks allowed action tags, mandatory and optional properties, and whether referenced hardware and reagents are defined (Section III-B, p. 3).

Steps (Inference: my itemization of the Section III-B description). (1) Parse the generated text as XML. (2) Reject malformed XML. (3) Check each action tag against the DSL's allowed set. (4) Check required attributes and reject forbidden attributes. (5) Check that every hardware or reagent identifier exists in the plan's declarations or supplied environment constraints. (6) Return a list of all errors for the next prompt. The verifier's counted Chem-RnD errors were 306 missing properties, 174 disallowed properties, 120 wrong tags, 21 nonexistent actions, 15 undefined resources, and 6 XML parse failures (Table II, p. 6, “number of times it caught that type”). Chem-EDU counts were 47 undefined resources, 26 disallowed properties, 40 wrong tags, and 3 missing properties (same table).

Verus form. Inference: implement a front-end that parses Rust and Verus syntax, checks API/resource names, and rejects unsupported constructs before invoking Verus. A static check can ensure every generated call has a declared contract, but only Verus proves the contract. Keep diagnostics tied to source spans and retain the original failed candidate for repair context.

Limits. The verifier's checks encode only known grammar and environment rules. The authors explicitly identify missing domain knowledge: wrong actions such as treating “dry over magnesium sulfate” as a `Dry` operation, reusing unwashed vessels, and ambiguous “boiling point” conditions (Section IV-B, p. 6). They propose adding look-up tables, visual feedback, and vessel-cleanliness constraints, showing that unmodeled requirements remain outside the verifier.

## technique 3: environment constraints and execution handoff

Use case. Supply available hardware and reagents so generation is grounded in a particular robot. CLAIRIFY adds these constraints to the prompt and checks that plans do not reference resources outside the list (Section III-C, p. 3); if no constraint list is given, “we assume the robot has access to all resources”. The accepted XDL is then translated by PDDLStream/TAMP to low-level actions, with visual perception grounding predicates (Section III-D, p. 4).

Steps. (1) Enumerate resources in the prompt. (2) Generate an XDL plan. (3) Verify declarations and references against that set. (4) Feed the accepted plan to TAMP. (5) Execute only after TAMP produces a motion plan; the paper says three Chem-EDU experiments were selected for robot execution (Section IV-B(4), p. 6; Figure 6 and the lemonade plan, p. 7).

Verus form. Inference: model deployment capabilities as explicit Verus inputs or trusted contracts, then separately verify that generated code calls only declared APIs. A proof that a function satisfies an abstract API contract does not prove that the linked driver, hardware, or runtime environment satisfies it.

Evidence and limits. The paper demonstrates real robot execution for selected Chem-EDU plans, while Chem-RnD is a proof of concept and is not executed in the real world (Section IV-A, p. 4). The success numbers therefore measure generation and selected demonstrations, not all-world task completion.

## techniques for the catalog

- verifier-assisted prompting — regenerate a DSL program with the previous candidate and deterministic error list until verification passes or a timeout
- syntax and static checks — parse, validate grammar and attributes, and check resource references before execution
- environment-grounded handoff — constrain generated resources and pass accepted plans to a planner that models actual execution capabilities
