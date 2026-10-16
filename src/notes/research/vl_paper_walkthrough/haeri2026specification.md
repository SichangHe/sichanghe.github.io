# Specification Grounding Drives Test Effectiveness for LLM Code
(authored by agents unless marked 🧑)
Tag: `haeri2026specification`, [paper](https://arxiv.org/abs/2607.06636)

## what the paper establishes

The paper tests whether LLM-generated tests work because there are more tests or because their expected behavior is grounded in an external specification. Its abstract states: “Holding fixed everything that normally varies (test count, which model writes the tests, and the repair loop), we change a single line of the test-writer’s prompt that controls whether it receives the spec as a checklist of rules.” The main comparison uses SPEC, which receives an enumerated specification and writes one test per rule, against FREE+, which sees only the ticket but is explicitly told to test invalid inputs and edge cases. A fixed Sonnet 4.6 tester and repairer, one-shot implementations from Claude Haiku 4.5 and Sonnet 4.6, and an independent hidden gold oracle isolate the prompt effect.

The core benchmark has 8 specification-completeness tasks, 18 tasks in the larger specification-completeness set, and 8 logic tasks as a scope control. On 48 core instances (8 tasks × two code models × three seeds), 30 drafts are buggy. SPEC finishes correct on 100% of instances and detects 30/30 buggy drafts; FREE+ finishes at 60% and detects 18/30. The paper reports the paired SPEC−FREE+ gain as +38 percentage points across three Claude tiers, +36 points on a held-out set, +28 for GPT-5.3-codex, and +19 for Gemini 3.5 Flash. The denominators and settings differ and are stated below; they are not one pooled estimate.

The central causal result is the ablation in Table 3: FREE detects 0/30, DECOMP (a coverage plan without spec content) 2/30, PROSE (the spec as a paragraph) 27/30, and SPEC (spec content plus enumeration) 30/30. Thus content is the main lever and one-test-per-rule enumeration adds a small margin. The scope limit is explicit: the benefit is for specification-completeness defects in small functions, not a general claim about algorithmic logic. On eight logic tasks there were 0 natural bugs among 45 valid submissions.

## technique: turn each specification rule into a grounded test

What it is: give the tester the specification’s checkable rules and ask for one test per rule. Expected values come from the external rules, not from candidate code. The paper's conclusion says, “What closes that gap is grounding the tests in an enumerated specification, one check per rule, rather than writing more tests or adding a generic ‘test the edges’ nudge.”

When to use it: use this when a task has invalid-input, boundary, or other edge behavior that a prose ticket leaves implicit, and when the correct edge semantics can be written down. It is a poor fit when no agreed specification exists or when the defect is algorithmic logic outside the rules.

How to do it:

1. Write a prose ticket, an enumerated specification with K rules, a trusted reference implementation, and an independent gold test suite broader than the rule list (Section 3.2).
2. Have a code model produce one implementation; keep the same one-shot implementation for every test arm (Sections 3.1 and 3.3).
3. Give the tester the ticket plus K rules and require one test per rule; compute expected outputs from the rules, never the candidate code (Section 3.3).
4. Run those tests, feed failing-test descriptions to the repairer, and allow the specified repair rounds (Section 3.4).
5. Judge final code with the hidden gold suite, not the generated tests (Sections 3.1 and 3.5).

Inference: In Verus, translate each rule into a `requires`/`ensures` contract or a proof obligation and use a proof function to establish the implementation satisfies the rule. Where executable edge tests are still useful, generate Rust tests from the same rule data. The paper's experiment does not prove that a Verus contract is complete; the specification remains a trusted input.

Evidence: Table 2 reports final correctness 100% for SPEC versus 60% for FREE+ on the 48 core instances; detection is 30/30 versus 18/30 among 30 buggy drafts. Against the edge-prompted baseline over all 18 specification-completeness tasks, the mean per-task gain is +31 points, SPEC is better on all nine tasks with any difference, and the task-level sign test is p=0.002. The 18-task denominator includes 8 core, 4 held-out, and 6 scale-up tasks.

Failure and assumptions: the gold suite is independent and broader, but writing correct rules requires domain knowledge. The paper warns that “The method is only as good as the spec it is given.” An incomplete rule list loses detection; an incorrect rule can produce precise tests for the wrong behavior.

## technique: separate grounding content from coverage planning

What it is: compare the same test budget with and without specification content to identify whether decomposition or content causes the gain. DECOMP asks the tester to plan K behaviors from only the ticket; PROSE supplies the specification as one paragraph and asks for K thorough tests; SPEC supplies rules and one test per rule.

When to use it: use this ablation when designing a VL test/proof pipeline, because a model's ability to enumerate cases does not show that it knows the intended behavior.

How to do it:

1. Freeze the code one-shot, tester, budget, and repair procedure across arms (Section 4.2).
2. Run FREE (no spec, no enumeration), DECOMP (enumeration only), PROSE (spec content only), and SPEC (both) on the same 30 buggy one-shots (Table 3).
3. Compare detection fractions and inspect misses for cases where a rule is known but the chosen input fails to trigger the bug (Section 4.2).

Inference: In Verus, a proof template that lists lemmas or cases without encoding their semantic predicates is analogous to DECOMP; it cannot replace a precise contract. Separate the content of a `requires`/`ensures` statement from proof-search decomposition when evaluating agent assistance.

Evidence: Table 3 gives FREE 0/30, DECOMP 2/30, PROSE 27/30, and SPEC 30/30 detection. The paper explains that PROSE's three misses were on split money: it had the right content but did not turn every rule into a test that triggered the bug.

Failure and assumptions: decomposition still helps a little when content is present; enumeration does not guarantee a triggering input, as the held-out `size ≥ 1` rule produced size=0 and missed a size=−1 bug.

## technique: use a hidden independent oracle and report two-sided test quality

What it is: judge final correctness with a hand-written gold suite that no model sees and report final correctness, detection, false alarms, repair completeness, and the SPEC−FREE+ difference. A test strategy can miss a bug or reject correct code; both matter.

When to use it: use this whenever a generated test suite is also used as a repair signal or gate. Passing generated tests alone is not proof of correctness.

How to do it:

1. Validate the reference implementation and gold suite against worked examples; keep the suite hidden and broader than the rule list (Section 3.2).
2. For each arm, count final-correct instances over all instances, detected bugs over truly buggy one-shots, false alarms over truly correct one-shots, and repairs among detected bugs (Section 3.5).
3. Compute paired gaps and 95% bootstrap intervals; use the task as the significance unit because six instances within a task share one code draw (Section 3.5).
4. Treat the test-pass fraction as a confidence score only for a selective risk–coverage analysis, not as formal proof (Section 3.5).

Inference: For Verus, combine executable tests with `ensures` proofs and an independent specification review. A passing Verus proof establishes only the written contract; an independent oracle is still needed to detect an underspecified contract. Use proof status as an evidence field rather than as an unconditional correctness claim.

Evidence: On three trickier behavioral specs, SPEC asserted 0 wrong expected values (0/37) and had 0% false alarms, while FREE+ asserted wrong expectations on 3/36 cases and falsely rejected correct code on 33% of its checks (Section 4.4). At the test-pass selective signal, SPEC AURC was 0.257 versus FREE 0.577 (Appendix E). The paper's 0% false-alarm result is limited to this fixed tester and task set.

Failure and assumptions: generated tests can be accurate yet incomplete; the hidden oracle itself is a trusted artifact. Inference: a Verus proof can be unsound relative to the real requirement when the contract omits an edge.

## technique: compare grounding with stronger ungrounded generators

What it is: evaluate property-based testing and an AlphaCodium-style flow at the same bug set and score them with the same oracle. Property-based generation creates random inputs and general properties; the agentic flow reflects, generates tests, writes code, and jointly repairs code and tests.

When to use it: use these as baselines before claiming that a specification-grounded approach merely beats a weak prompt.

How to do it:

1. Give property generation and the agentic flow the ticket without enumerated rules (Section 4.3).
2. Run each on the same 30 buggy core one-shots and use the independent gold oracle (Section 4.3).
3. Record both detection and out-of-spec assertions; a detector that rejects the trusted reference is producing false alarms (Table 4).

Evidence: property-based testing detects 28/30 but 2/15 task-seed batteries wrongly reject the trusted reference by asserting `roman_to_int("IIII")` must raise, although the paper says that input is valid. SPEC detects 30/30 with no out-of-spec assertions. The AlphaCodium-style flow on 12 specification-completeness tasks and three seeds reaches 72% final correctness, equal to codex FREE+ and below codex SPEC at 100%.

Inference: In Verus, property tests can generate counterexamples to a contract, but they do not replace a complete `ensures` statement; a false property can make a correct implementation appear wrong. Agent-generated proof lemmas should therefore be checked against the specification before admission.

Failure and assumptions: random properties can invent requirements; jointly editing tests and code can rewrite a correct test to fit buggy code. The paper does not test repository-scale Verus proof generation.

## technique: test specification quality by controlled corruption

What it is: deliberately remove or add a wrong rule, then observe separate effects on detection and precision. Completeness controls coverage; correctness controls false alarms.

When to use it: use this to audit a specification before trusting it as a repair or verification oracle.

How to do it:

1. Drop validation rules from five buggy core tasks and rerun the grounded tester (Section 4.5).
2. Add a contradictory rule that endorses the bug and rerun the same pipeline (Section 4.5).
3. Compare detection and tester accuracy independently, rather than collapsing them into one score.

Evidence: dropping rules reduces detection from 30/30 to 6/30 while remaining tests stay 100% accurate. Adding a wrong rule keeps detection at 30/30 but reduces tester accuracy to 82.8% (15/87 tests disagreeing with the reference). These denominators are for the five-task corruption experiment; the paper describes the settings in Section 4.5.

Inference: In Verus, a missing `ensures` clause can leave behavior unproved while all stated proofs pass; an incorrect clause may prove a different behavior. Review contracts against reference examples and negative cases before using them as acceptance gates.

Failure and assumptions: the two perturbations are simple; real specification errors can be correlated, ambiguous, or stateful. The paper's tests are small Python functions, not Rust or repository code.

## technique: scale grounding across models while tracking scope

What it is: keep the tester and repairer fixed while varying code-model tiers, then replicate the full stack on other model families and independent or real-library tasks.

When to use it: use this design when asking whether a verification aid is a model-capability effect or a signal-quality effect.

How to do it:

1. Use the same tester and repairer for Haiku 4.5, Sonnet 4.6, and Opus 4.8, with multiple per-task draws (Sections 3.4 and 4.4).
2. Repeat coder, tester, and repairer together on GPT-5.3-codex and Gemini 3.5 Flash (Section 4.5).
3. Add held-out, standard-library, HuggingFace/NLTK, PyPA, and stateful tasks, keeping the oracle independent (Section 4.5).
4. Include logic tasks where no specification-completeness bug is present as a scope control (Section 4.4).

Evidence: across three Claude tiers, SPEC−FREE+ is +38 points; held-out SPEC is 61% versus FREE+ 25% (+36 points). Cross-vendor results are +28 points for codex and +19 for Gemini; the denominators are 12 tasks × three seeds × the reported full-stack runs. On 8 logic tasks, 45 valid submissions had 0 natural bugs. Against real third-party oracles, SPEC catches 90% versus FREE+ 40% on the transformers/NLTK slice (+50 points); standard-library and packaging slices report 68% and 100% false alarms for ungrounded tests versus 0% for grounded tests.

Failure and assumptions: the core tasks are bespoke small functions and the paper says a larger study should include repository and algorithmic bugs. The HumanEval+ port's grounding gap vanishes because its tasks are well specified; the paper does not claim grounding helps every code-generation setting.

## what is proved, measured, and trusted

The experiment measures test detection, repair completeness, final correctness, false alarms, tester accuracy, and selective risk under controlled prompts and independent gold oracles. It does not formally prove code correctness. Trusted artifacts include the enumerated specification, reference implementation, gold tests, model APIs, harness, and model sampling. The authors state that “The main risk we see is over-trust: it is easy to mistake a passing test suite for proof that the code is correct.” Their evidence supports grounding for specification-completeness defects; it does not establish a general theorem about algorithmic correctness or repository-scale agents.

## implications for VeruLaw

Inference: VL can turn every explicit Rust/Verus contract rule into a test or proof obligation, while keeping a separately reviewed oracle for behavior the contract may omit. A useful pipeline is: extract rules; generate one executable check and one Verus contract clause per rule; run tests and proofs; feed failures back to repair; then independently validate the final code. The paper's decomposition result says a plan or list of proof cases without semantic rule content is insufficient.

Inference: threat to a product generating agent-written verified Rust is high when the specification is incomplete or wrong: a proof can pass while an omitted edge remains untested, and a generated property can reject correct code. The paper's main lesson is a signal-quality risk at the specification boundary, not a Verus-specific weakness. Existing VL work should not repeat generic “more tests” comparisons without measuring rule grounding, false alarms, repair completeness, and independent-oracle correctness.

## techniques for the catalog

- enumerated specification grounding — provide external rules and write one test per rule, with expected values from the rules
- content-versus-decomposition ablation — compare spec content and coverage planning separately to identify the causal signal
- independent-oracle evaluation — score final correctness, detection, false alarms, and repair completeness against a hidden broader suite
- grounded versus ungrounded baselines — compare against doubled budgets, property generation, and agentic test-and-repair flows
- specification corruption audit — drop or contradict rules and measure coverage loss separately from precision loss
- model and scope replication — vary code models and vendors while preserving tester controls and explicit bug-class limits
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
