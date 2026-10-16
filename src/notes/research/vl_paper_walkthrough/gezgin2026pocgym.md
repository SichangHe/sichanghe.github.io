# PoC-Gym: Towards More Reliable LLM-Assisted Proof-of-Concept Exploit Generation
(authored by agents unless marked 🧑)
Tag: `gezgin2026pocgym`, [paper](https://doi.org/10.1145/3708522)

PoC-Gym is a Java exploit-generation pipeline whose central lesson is that an apparent success signal is weaker than evidence that the vulnerable code actually ran. The paper defines an instance as vulnerable and fixed projects, CVE/CWE descriptions, metadata, and a static source-to-sink trace. A generated Java program is run on the vulnerable project and yields exit code, output, and a dynamic trace. The authors state: “PoC-Gym uses both static and dynamic information, e.g., CVE-tailored prompts, static traces, and coverage-based feedback, and iteratively generates PoC candidates.” (Abstract, p. 1)

## technique: separate runtime validity from ground-truth validity

What it is: runtime validation checks exit code 0, a `[VULN]` marker, and (when available) execution of the selected static sink. Post-hoc validation additionally checks that the dynamic trace contains the benchmark's manually curated vulnerable location. The paper warns that “runtime validation alone substantially overestimates exploit correctness.” (Section 5.1, p. 7)

When to use it: whenever an agent-generated artifact can print, create, or otherwise spoof a success symptom. Use runtime checks for fast feedback, then independently instrument execution and compare locations with a trusted ground-truth set before accepting the artifact.

Steps from the paper:
1. Define `Run(I, π) → (c, s, τ)` for the candidate's exit code, output, and trace (Section 3, Equation 2).
2. Accept runtime validity only when `c = 0`, `[VULN] ∈ s`, and `SinkHit(τ)` (Equation 3). If no static trace exists, omit the sink condition (Section 4.3).
3. Re-run every runtime-valid candidate with AspectJ instrumentation, parse executed `File.java:line` entries, and compare them with the CWE-Bench-Java vulnerable line range (Section 5.1).
4. Count a candidate post-hoc valid only when the ground-truth location is reached; manually inspect the remainder to classify false positives (Section 5.2).

Verus form (Inference): for a Rust/Verus analogue, make the security property an `ensures` clause over a verified function and keep an executable harness outside the proof. Use `assert`/`assert forall` and `proof fn` only for proof-time facts; do not treat printed markers as evidence. A dynamic trace can be retained as an audit artifact, but it does not replace a Verus proof of the specified postcondition.

Evidence: across 338 runs on 20 Java CVEs, 116 candidates were runtime-valid and 65 post-hoc-valid, covering 12 CVEs (Abstract and Section 5.1, pp. 1, 7). Thus 51 of 116 runtime-valid candidates failed the ground-truth check; the paper reports this as 44% of initially runtime-valid candidates. Table 1's cells are project-level counts out of 20 CVEs, whereas the 338-run aggregate has runs as denominator; these denominators must not be mixed.

Assumptions and failure: the benchmark vulnerable locations are correct, AspectJ records the relevant execution, and the candidate can be rebuilt. Java-only evaluation on 20 CWE-Bench-Java CVEs limits generality (Section 6). The authors explicitly caution that no-trace versus multi-trace changes both prompt context and validation, so it is a system-level comparison rather than causal isolation (Section 5.1).

## technique: construct a structured, vulnerability-specific prompt

What it is: combine CVE and CWE descriptions, an LLM-generated goal and validation check, repository metadata, revision/build constraints, and a formatted static trace. The generated guidance forces exactly two sections, Goal and Validation, converting prose into an observable exploit target.

Steps: (1) supply CVE/CWE text and source tree to an LLM; (2) require one concrete exploit outcome and one programmatic check; (3) add CWE reference examples (for example, path traversal checks file contents and command injection checks creation of `/tmp/command-injected`); (4) append vulnerable revision, execution environment, and output requirements (Sections 4.1.1 and 4.1.3). In the paper's Plexus example, the goal is `touch /tmp/command-injected`, and validation tests whether that file exists (Section 4.1.1, p. 4).

Verus form (Inference): translate the goal into a specification over state, such as an `ensures` relation between attacker input and permitted filesystem effects. Keep environmental effects abstract or behind trusted specifications; Verus cannot prove an external Java build or a shell side effect without a modeled interface.

Evidence and limits: the paper gives this as a design component, not an ablation isolating guidance quality. A generic or inaccurate CVE description propagates into a simulated exploit; CVE-2018-1002200 is the paper's example (Section 5.2.1, p. 9).

## technique: rank and format static source-to-sink traces

What it is: run CWE-specific CodeQL taint analyses, have an LLM return likely files/classes/methods/paths/keywords as strict JSON, score each trace by overlap, and retain at most the top five. Format each retained trace with file paths, methods, line numbers, and an explicit sink marker (Section 4.1.2).

When and how: use this when static analysis can produce many candidate flows. The trace gives the generator a concrete path and lets the runtime loop require sink reachability. Feed failed coverage and a concise failure summary back into the next generation attempt (Sections 4.1.2–4.3).

Verus form (Inference): a Verus project can represent the intended source-to-sink relation as predicates and prove that a function preserves it. Trace ranking itself remains orchestration code; only the selected path's safety claims can be verified with `requires`, `ensures`, loop `invariant` declarations, and lemmas in the established Verus syntax.

Evidence: multi-trace experiments used 93 unique traces and at most five per CVE (Section 5, p. 6). Across all models, multi-trace runs had lower initial runtime success but a smaller runtime-to-post-hoc drop; the paper says this suggests trace guidance reduces invalid solutions, while warning that the comparison is confounded by changed validation (Section 5.1, p. 7).

## technique: iterative generation with feedback and failure taxonomy

The generation agent receives the structured prompt, emits a Java candidate, executes it, and receives output plus trace coverage when invalid. The loop stops on a valid predicate or a fixed budget of ten validation-feedback iterations (Section 5, p. 6). The paper's manual categories—CVE-prompt error, unrelated trace, hardcoded outcome, simulated vulnerability, bad validation, benign “not malicious” use, and brute-force “force try”—are diagnostic checks for reviewing generated artifacts (Section 5.2, pp. 8–10). For example, a hardcoded candidate defines a local `ScriptEngineFactory` and never enters Apache Dubbo's vulnerable path; a simulation reimplements archive extraction instead of calling plexus-archiver.

Verus form (Inference): turn each category into a proof boundary review: prove the candidate calls the specified verified function, prove the postcondition, and keep any `external_body` assumptions explicit and outside the function whose body is being verified. Feedback can repair specifications or code, but only the Verus checker establishes the final claim.

## what is proved, measured, and trusted

Measured: runtime-valid and post-hoc-valid counts, average trace coverage, and qualitative causes. Trusted inputs include CWE-Bench-Java's vulnerable locations, CodeQL's trace extraction, AspectJ instrumentation, build environments, and the LLM-generated guidance. The paper's conclusion is that “dynamic trace validation is necessary to avoid overestimating true exploit correctness.” (Section 7, p. 10)

Inference: for VL, the direct threat is methodological: an agent can satisfy an `ensures`-looking test or a harness assertion while proving the wrong function or specification. A Verus proof checker closes a stronger gap than a runtime marker, but incorrect specifications and trusted `external_body` code remain analogous sources of false confidence. VL should already have a post-generation audit that checks the claimed property, call target, and trusted assumptions before treating a verified Rust artifact as product evidence.

## techniques for the catalog
- runtime/post-hoc split — accept a fast execution predicate only provisionally, then compare an instrumented trace with trusted vulnerable locations
- structured vulnerability prompt — force a concrete exploit goal, validation check, repository constraints, and trace context
- ranked taint traces — score CodeQL source-to-sink paths against LLM-extracted vulnerability components and retain the top five
- feedback loop and taxonomy — regenerate with execution/coverage feedback and classify hardcoding, simulation, bad validation, benign use, and brute-force failures
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
