# Agentic Code Reasoning
(authored by agents unless marked 🧑)
Tag: `ugare2026agenticcodereasoning`, [paper](https://arxiv.org/abs/2603.01896)

## scope and evidence
The paper evaluates a prompt-level method called semi-formal reasoning for execution-free code analysis. It requires explicit premises, code-path traces, and conclusions. The authors state: “These templates act as certificates: the agent must state premises, trace relevant code paths, and provide formal conclusions.” (section 1, p. 1). The method is tested on patch equivalence, fault localization, and code question answering, with Opus-4.5, Sonnet-4.5, and fixed datasets.

Patch-equivalence ground truth is actual test execution, although the verifier cannot execute tests. The curated set has 170 examples; standard reasoning scores 78.2% and semi-formal 88.8% (Table 2, p. 5). The real-world set has 200 balanced examples (100 correct and 100 incorrect patches); Opus-4.5 semi-formal scores 93.0% versus 87.0% agentic standard (Table 3, p. 6). These percentages therefore have denominators 170 and 200 respectively. RubberDuckBench is graded by Gemini-3-Pro and GPT-5.2 against an expert rubric, with 85% grader agreement (section 4.3, p. 9); Opus agentic semi-formal scores 87.0% (Table 6, p. 9). Defects4J has a 43-bug evaluable small sample and a 90-bug evaluable larger sample; “All” requires every ground-truth hunk and “Any” at least one (sections 4.2, pp. 7–8).

## technique 1: patch-equivalence certificate

What it is. A task-specific template defines equivalence modulo tests, records what each patch changes, traces every test under both patches, compares outcomes, and states a formal conclusion. The condensed template is: “D1: Two patches are EQUIVALENT MODULO TESTS iff the test suite produces identical pass/fail outcomes for both patches.” (Figure 2, p. 4).

How to do it.
1. Read both patches, the fail-to-pass test patch, the repository, and pass-to-pass tests (section 4.1.2, p. 6).
2. Fill premises P1/P2 with changed files and behavior, and P3 with what fail-to-pass tests check (Figure 2, p. 4).
3. For each test, write the predicted pass/fail outcome for each patch and an execution trace; record SAME or DIFFERENT (Figure 2, p. 4).
4. If outcomes differ, give a counterexample test and specific code-trace evidence; then conclude equivalent or not by D1 (Figure 2, p. 4).
5. Explore definitions rather than trusting names. In the Django example, tracing `format` finds a module-level function expecting a datetime, so `format(476, "04d")` raises `AttributeError` (Figure 1, p. 2).

Verus form. Inference: encode each patch's behavioral contract as `ensures` on a Verus function and state test preconditions with `requires`; use `proof fn` lemmas to show that both implementations return equal results for the tested domain. Inference: for repository code with external effects, model the observable test outcome as a spec state transition and explicitly mark unmodeled environment behavior as an assumption. A prompt certificate cannot replace Verus compilation; it can organize the obligations sent to Verus.

Evidence and limits. On the 170 curated examples, semi-formal accuracy is 88.8% versus 78.2%, at 28.17 versus 10.08 average steps (Table 2, p. 5). On 200 real-world patches, Opus semi-formal is 93.0% (186/200) and Sonnet semi-formal 91.5% (183/200) (Table 3, p. 6). Remaining Opus errors are incomplete tracing, guessed third-party semantics, and dismissal of subtle differences (section 4.1.2, p. 6). The method has no formal guarantee: the paper says templates improve evidence, while conclusions remain LLM judgments.

## technique 2: premise-to-claim fault localization

What it is. The fault-localization template enforces a chain from test semantics to code paths, divergence claims, and ranked predictions. Phase 1 states test premises and expected behavior; phase 2 records each method's file and line; phase 3 links each divergence claim to a premise and location; phase 4 ranks predictions citing those claims (Appendix B, pp. 16–17).

How to do it.
1. State failing-test operations, assertions, expected behavior, and observed failure as premises (Appendix B, p. 16).
2. Trace calls from test entry into production code, recording method, location, behavior, and relevance (p. 16).
3. For each path, write a divergence claim such as “At [file:line], [code] would produce [behavior] which contradicts PREMISE T[N]” (p. 16).
4. Rank suspicious regions, citing the supporting claims; during exploration, state a hypothesis, evidence, and confidence before requesting a file (p. 17).

Verus form. Inference: turn each premise into a `requires` condition or state-machine invariant, and each divergence claim into a `proof fn` obligation that identifies the violated `ensures`. Use source locations as review metadata, not proof terms. Inference: this structure can prioritize which Verus contract or invariant to inspect when a verification error is reported.

Evidence. On 43 evaluable Defects4J bugs, agentic semi-formal reaches 72.1% Top-5 All and 88.4% Top-5 Any, versus agentic standard 60.5% and 81.4% (Table 4, p. 8). On 90 evaluable bugs, Opus semi-formal reaches 47.8% Top-5 All and 68.9% Any versus 43.3% and 65.6% standard (Table 5, p. 8). The denominators differ and must not be merged. Failure modes include indirection, multi-file bugs, domain-specific bugs, and more than five ground-truth regions (section 4.2, p. 8).

## technique 3: function-trace and data-flow answer certificate

For code QA, require a function trace table with function, file:line, parameter and return types, and verified behavior; a data-flow analysis listing where a variable is created, modified, and used; explicit semantic properties with evidence; and an alternative-hypothesis check (Appendix D, p. 19). The paper's operational steps are: “1. Locate and read both function implementations 2. Document their exact signatures and behavior in the trace table 3. Identify semantic differences with specific file:line evidence 4. Check whether the opposite conclusion is supported by evidence” (Appendix D, p. 19).

Inference: for Verus code review, use the same table with specification signatures, `requires`/`ensures`, ownership-relevant mutations, and cited lemmas; then compile the claimed contract. Evidence is mixed by model: Opus rises from 78.3% standard agentic to 87.0% semi-formal, while Sonnet is 84.2% versus 84.8% (Table 6, p. 9). The template can fail through elaborate but incomplete chains (section 4.3, p. 9).

## techniques for the catalog
- patch-equivalence certificates: state premises, trace every test under both patches, compare outcomes, and conclude from an explicit definition
- premise-to-claim fault localization: connect test premises through traced calls and divergence claims to ranked suspicious regions
- function-trace QA: require signatures, data flow, semantic evidence, and alternative-hypothesis checks before answering
- structured exploration: record hypothesis, evidence, and confidence for each file request and observation
