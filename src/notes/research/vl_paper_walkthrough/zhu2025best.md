# Establishing Best Practices for Building Rigorous Agentic Benchmarks
(authored by agents unless marked 🧑)
Tag: `zhu2025best`, [paper](https://arxiv.org/abs/2507.02825)

## scope and contribution
This paper develops the Agentic Benchmark Checklist (ABC) for judging whether agent benchmarks measure what they claim. It separates task validity (the task is solvable if and only if the target capability is present), outcome validity (the score indicates actual success), and reporting quality. The abstract reports that “SWE-bench-Verified uses insufficient test cases” and that applying ABC to CVE-Bench reduced performance overestimation by 33%. (abstract, p. 1)

## technique 1: separate task validity from outcome validity

What it is. Task validity asks whether only the target capability can solve the task. Outcome validity asks whether the evaluator’s positive result means the task was actually solved. The authors state: “Outcome validity: the evaluation result (e.g., tests or checks) truly indicates task success.” (Section 1, p. 2)

When to use it. Apply this separation when designing or reviewing any agent benchmark, especially code-generation and proof-generation tasks where weak tests can pass incorrect outputs.

How it is done. First identify the target capability and the task’s required actions. Then inspect the environment for shortcuts and impossible cases. Finally inspect the evaluator and test whether passing it implies the intended behavior. The paper’s taxonomy models an agent acting in an environment with tools, producing an unstructured outcome, and a checker mapping that outcome to success (Section 3, pp. 3–4).

Verus form. Inference: Define the target as a specification over observable Rust behavior; define task validity tests that prevent an agent from satisfying the harness without proving the specification. Define outcome validity as soundness of the acceptance predicate: if the harness accepts, the required postcondition must hold. Keep the Verus verifier, compiler, and any external axioms listed as trusted infrastructure.

Evidence and limits. The authors found that evaluation issues can change reported performance by up to 100% in relative terms (Section 1, p. 2). They report 24% of the top 50 SWE-bench-Verified leaderboard positions as incorrect because tests missed edge cases, and a trivial empty-response agent reaching a 38% success rate on τ-bench, where some tasks are intentionally impossible (Section 1, p. 2; the 38% is the airline subset, Section 5.2, p. 8). Inference: A passing proof script or test suite is evidence only for the encoded obligations; it is not evidence for omitted properties.

## technique 2: audit task setup, tools, and environment (ABC T.1–T.10)

What it is. ABC’s task-validity checklist checks versions, API availability, failure handling, state cleanup, isolation, reproducibility, labels, solvability, oracle solutions, and exploitable implementation flaws. The checklist explicitly includes “Residual data or state are fully cleared between runs” (Figure 2, p. 5) and “Agent is completely isolated from any ground truth information” (Figure 2, p. 5).

How it is done. Record tool and package versions; make required APIs consistently available; terminate or flag runs when APIs fail; clear residual files and memory; isolate answers; freeze the environment; verify labels and solvability; provide an oracle solver; and inspect outliers for shortcuts (Section 4.1, pp. 4–5). The paper gives a concrete failure: KernelBench left ground truth in GPU memory, permitting out-of-bounds recovery (Section 4.1, p. 5).

Verus form. Inference: Pin Verus and Rust versions, solver versions, and command-line options. Run each candidate in a clean container with no access to reference proofs. Clear build artifacts between tasks. Include a trusted oracle that verifies known-good solutions and a negative suite that must fail. Treat timeouts and solver crashes as explicit infrastructure failures, not successful proofs.

Evidence and limits. The authors assessed ten benchmarks and found seven with task-validity issues (Section 1, p. 2; Figure 5, p. 8). They state that “it is possible that we have not presented an exhaustive checklist for ensuring evaluation rigor” (Appendix A, p. 16), so the checklist is a set of inspection criteria, not a proof that no side channel remains.

## technique 3: validate code outcomes with layered tests

What it is. For code-generation benchmarks, ABC distinguishes unit, fuzz, and end-to-end testing. The paper warns: “poorly constructed unit tests can lead to both false positives and false negatives.” (Section 4.2, p. 6)

When to use it. Use unit tests for local behavior, fuzzing for broad input and edge-case coverage, and end-to-end tests for interactions across a complete workflow. Combine them when a proof or generated program has both local and system-level obligations.

How it is done. Manually verify test correctness and measure objective quality such as coverage and cyclomatic complexity (O.d.1–O.d.2). For fuzzing, generate values, types, memory layouts, and ranges that affect the program output (O.e.1–O.e.3). For end-to-end testing, exercise all relevant workflow branches and remove nondeterminism (O.f.1–O.f.2) (Section 4.2, pp. 6–7).

Verus form. Inference: Use Verus postconditions and invariants as the primary semantic oracle, then add runtime tests for executable behavior and fuzz tests for panic, parsing, and integration surfaces. Verify that each test input reaches the intended branch; a test that never exercises a precondition is weak evidence. Keep test-generated assumptions separate from theorem statements.

Evidence and limits. The checklist lists 20 outcome-validity checks (O.a.1 to O.i.1), grouped by information acquisition, code generation, state modification, and multistep reasoning (Figure 3, p. 6). It names coverage and cyclomatic complexity as objective quality measures (O.d.2) next to manual verification of test cases (O.d.1) (Section 4.2, p. 6).

## technique 4: make fuzz inputs sensitive and state checks complete

What it is. Fuzzing is useful only when generated inputs can expose differences in behavior. State-based tasks need a ground truth that covers all successful end states and a state space that also contains irrelevant states. ABC requires that ground truth include all successful final states and that the state space be complex enough to defeat trivial changes (O.g.1–O.g.3, Figure 3, p. 6).

When to use it. Apply this to agent-written verified Rust where the agent may satisfy a narrow test while violating ownership, resource, or security behavior elsewhere.

How it is done. Enumerate successful state variants; include unchanged and out-of-scope state; generate inputs that affect outputs; include edge values and layout variations; compare the complete resulting state rather than a single marker (Section 4.2, p. 6; the paper’s CVE-Bench example of a SLEEP string in a database log is in Section 5.3, p. 9).

Verus form. Inference: Specify frame conditions with `ensures` so unrelated state remains unchanged, and prove collection bounds and ownership invariants. Use `old(...)` in postconditions when comparing pre-state values. Add adversarial tests for aliasing, empty collections, and boundary arithmetic.

Evidence and limits. The paper’s examples are benchmark-level rather than Verus-specific. The authors caution that state checks must include irrelevant state to detect whether agents affect the environment outside the target scope (Section 4.2, p. 6).

## technique 5: audit answer parsers, judges, and reward metrics

What it is. ABC checks whether string matching handles semantic equivalents, redundancy, negation, listing-all answers, and guessing. For LLM judges it requires pilot evidence of accuracy, consistency, agreement with humans, and resistance to adversarial inputs and reward hacking. For multistep tasks it requires explicit answer-format assumptions and metrics strongly correlated with the reasoning process (Section 4.2, pp. 5–7; Figure 3, p. 6).

When to use it. Use this whenever a benchmark parses agent output, invokes an LLM judge, or scores a proxy such as a reward model.

How it is done. Enumerate equivalent outputs and negation forms; test whether an agent can list every answer to win; run judge pilots against human labels; test adversarial outputs; state parser assumptions in task descriptions; and report non-AI and trivial baselines (Sections 4.2–4.3, pp. 5–7).

Verus form. Inference: Prefer verifier success based on machine-checkable proof artifacts and exact specifications rather than a language model’s judgment. If natural-language explanations are scored, separate them from proof acceptance and test parser robustness. Report human, oracle, no-op, and random baselines.

Evidence and limits. The paper reports that all ten assessed benchmarks had reporting limitations and that ABC identified issues causing up to 100% relative estimation errors (Section 1, p. 2). The authors write that completely avoiding evaluation issues “can be challenging, and is sometimes not feasible, especially when using LLM-as-a-Judge or testing-based techniques” (Section 4.3, p. 7).

## technique 6: report flaws and quantify their impact

What it is. ABC’s reporting section asks for open data and harnesses, contamination controls, updates, construct validity, mitigation steps, qualitative and quantitative impact analyses, confidence intervals, and trivial baselines (Figure 4, p. 7).

How it is done. Release the dataset and evaluator; hold out contamination-resistant tasks; explain the capability-to-outcome mapping; document known flaws; estimate their effect with sampling or uncertainty quantification; report statistical significance and non-AI (e.g., human) and trivial-agent results (Section 4.3, p. 7; the BIRD reporting example is Appendix F, pp. 30–31).

Verus form. Inference: Publish verifier version, solver configuration, axioms, admitted specifications, timeout policy, and per-obligation logs. Include confidence intervals over tasks and a breakdown by specification difficulty. A proof accepted with `external_body` or an untrusted axiom must be counted as trusted code, not as fully verified behavior.

Evidence and limits. In the CVE-Bench case study, ABC reduced performance overestimation by 33% (abstract, p. 1). The authors state: “First, our analysis covered only 17 agentic benchmarks that are used by top AI providers between January 2024 and March 2025.” (Appendix A, p. 16), so generalization beyond that sample is uncertain.

## techniques for the catalog

- task/outcome validity split: check both whether only the target capability solves a task and whether acceptance means success
- benchmark environment audit: pin tools, isolate ground truth, clear state, freeze setup, and test solvability and shortcuts
- layered code testing: manually checked unit, sensitive fuzz, and deterministic end-to-end tests (paper); Inference: add verified specifications as the primary oracle
- complete state checking: include all valid final states and relevant unchanged state to catch unintended modifications
- evaluator audit: test parsers, judges, negation, equivalent answers, guessing, and reward hacking
- transparent reporting: publish harnesses, contamination controls, baselines, uncertainty, and quantified flaw impact
