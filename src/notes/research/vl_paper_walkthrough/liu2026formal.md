# Can Formal Specifications Be Synthesized from Tests Alone?
(authored by agents unless marked 🧑)
Tag: `liu2026formal`, [paper](https://doi.org/10.1145/3832783.3834549)

## purpose and result

This paper asks whether an LLM can infer method-level JML specifications from test code and dynamic observations while never seeing implementation source. The pipeline records selected pre-state and post-state fields, prompts an LLM for a candidate contract, and validates it with bounded model checking (BMC) in two ways. The abstract says: “Our approach uses LLMs to infer candidate specifications solely from test code and dynamic execution traces.” (Abstract, p. 1)

The prototype uses GPT-5.4 for inference and refinement and JJBMC with loop-unrolling bound 5. It succeeds on 11 of 22 SpecGenBench APIs; 7 succeed in the first iteration and 4 after refinement (Section 4, p. 4). Nine tasks end in checker-compatibility errors and two in failed refinement. A passing candidate is explicitly not a complete specification: it only avoids the tested failure modes within the analyzed bounds.

Inference: for Verus, this is a contract-inference workflow for black-box or restricted-source settings. It can propose `requires`, `ensures`, and state relations, but Verus must check the resulting Rust specification and the product must separately assess whether the contract captures the intended behavior.

## technique 1: structured execution observations

What it is. Engineers select tests and fields to record immediately before and after each method call. Each observation is `⟨args, pre, post, outcome⟩`, including receiver and call arguments, selected object fields, normal return values, or exceptions (Section 3.1, pp. 2–3). Sensitive fields and tests that expose sensitive information are excluded. The paper says: “These traces complement test code by making observed input-output and state-transition relations explicit.” (Section 3.1, p. 2)

How to apply it.
1. Select tests using domain expertise, coverage goals, and operational constraints (Section 3.1, p. 2).
2. Choose non-sensitive objects and fields for pre/post logging or bytecode instrumentation.
3. Execute each test and record receiver-construction arguments, method arguments, pre-state, post-state, and outcome.
4. Reuse the structured observations for LLM prompting, coverage checks, and later refinement (Section 3.1, p. 3).

The motivating `deposit` example records balance and checksum while excluding `auditKey`; tests assert only a balance increase, but the observation exposes checksum change (Section 2, p. 2). This lets the inferred contract detect removal of the checksum update even though the original assertion would not.

Verus form. Inference: a Rust harness can record ghost snapshots or serialized observations at a verified function boundary. Selected fields can become ghost values in a `requires`/`ensures` relation; sensitive fields stay outside the prompt. Verus does not provide the paper's logging or bytecode instrumentation, so this requires an external harness and a proof that the recorded state corresponds to the call boundary.

Evidence and limits. The observations are engineer-controlled projections, not complete states. Unrecorded fields and untested inputs remain unconstrained. Inference: an agent could infer a strong-looking contract from a narrow projection while missing ownership, aliasing, or error behavior in other fields.

## technique 2: two-stage specification inference

What it is. The zero-shot prompt first infers a contract from test inputs and assertions, covering candidate preconditions, postconditions, exceptional behavior, and assignable locations. It then refines that contract using repeated pre/post relations and observed outcomes (Section 3.2, p. 3). The prompt forbids unsupported generalization and requires non-vacuous, syntactically valid JML clauses. Unsupported domain assumptions are to be reported as hypotheses rather than encoded as clauses (Section 3.2, p. 3).

How to apply it.
1. Supply the method signature, invoking tests, and structured observations.
2. Generate an initial JML contract from test assertions and inputs.
3. Add relations supported by repeated observations and observed returns or exceptions.
4. Keep assumptions that lack evidence as hypotheses, not contract clauses.
5. Reject vacuous or syntactically invalid output before validation.

Verus form. Inference: ask an LLM to emit a Rust function contract and proof skeleton, with `requires` for observed preconditions and `ensures` for post-state relations. Keep hypotheses in a separate review artifact. A contract that verifies but has `ensures true` is non-vacuous only syntactically, so the pipeline needs semantic-strength checks outside the paper.

## technique 3: bounded consistency and observation coverage

What it is. The approach treats the implementation as a local behavioral reference. A consistency check asks BMC whether, within a bound, an implementation execution violates the candidate postcondition. An observation-coverage check asks whether every recorded test behavior satisfies the candidate. The paper defines three sets: implementation behaviors `B_code`, tested behaviors `B_test`, and candidate-admitted behaviors `B_spec`, with `B_test ⊆ B_code` by construction (Section 3.3, p. 3). It cautions: “A candidate that passes both checks is treated as a validated candidate, not as a complete specification.” (Section 3.3, p. 4)

How to apply it.
1. Encode each observation as a harness that fixes the pre-state and requires its recorded post-state (Section 3.3, p. 4).
2. Run bounded consistency checking against the implementation; if a counterexample lies in `B_code \ B_spec`, convert it into an additional observation.
3. Run direct observation coverage so every recorded test behavior is admitted.
4. Feed counterexamples back to the LLM and repeat for at most three iterations (Section 4, p. 4).
5. Classify each task as Success only when both checks pass; classify unsupported JML as Error and exhausted refinement as Fail (Section 4, p. 4).

Verus form. Inference: encode each observation as a verified harness calling the target function under a `requires` pre-state and asserting the expected post-state. Use Verus's `ensures`, `assert`, and loop `invariant` constructs for the candidate; a failed assertion or contract obligation is feedback. BMC's finite loop bound does not directly carry over to Verus's deductive proof, so bounded testing must remain a separate validation layer.

Evidence and limits. The evaluation uses 22 APIs with Booleans, integers, floating point, arrays, and loops, excluding strings and reachability-style heap properties unsupported by JJBMC (Section 4, p. 4). Nine of 22 (40.9%) are Errors caused by unsupported constructs such as `\\num_of`, ghost/model fields, and quantified arithmetic; two of 22 (9.1%) are Fails. The paper's successful count is therefore 11/22 (50%), with 7/22 (31.8%) first-iteration successes and 4/22 (18.2%) requiring refinement. The denominator is API tasks, not generated candidates or executions.

## evidence, trust, and threat to VL

The implementation-consistency check assumes the existing implementation is the behavioral reference. BMC's default loop bound of 5 can miss longer behaviors; the paper calls bounded verification a source of precision concerns (Section 4, p. 4). Checker compatibility also dominates failures: a standard JML clause can be rejected by JJBMC without proving the clause semantically wrong. The paper reports average instruction coverage of 76.9% for generated JUnit tests, but this is a coarse sanity check, not specification completeness (Section 4, p. 4).

Inference: the corresponding Verus trust boundary includes the inferred contract, selected observations, external-library specifications, Rust compiler, Verus verifier, solver, and any erasure step. A passing Verus proof establishes the supplied contract, not that the test-derived contract expresses the product requirement. Threat to agent-written verified Rust is high for under-specification and moderate for checker integration: this workflow can reduce contract-authoring cost but can also automate a false sense of completeness.

## techniques for the catalog

- structured execution observations — record selected arguments, pre-state, post-state, and outcomes as reusable behavioral evidence
- two-stage test-derived inference — infer a contract from tests, then refine it with repeated state relations while isolating unsupported hypotheses
- bounded consistency checking — reject candidates that contradict implementation executions within the BMC bound and feed counterexamples back
- observation-coverage checking — require every recorded test behavior to be admitted by the candidate, while reporting the finite evidence boundary
Checked 2026-10-14 against the paper by a Codex agent: audit record liu2026formal; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
