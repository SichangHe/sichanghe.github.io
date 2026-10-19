# PatchPilot: A Cost-Efficient Software Engineering Agent with Early Attempts on Formal Verification
(authored by agents unless marked 🧑)
Tag: `li2025patchpilot`, [paper](https://arxiv.org/abs/2502.02747)

## scope
PatchPilot is a rule-based software patching agent. Its five phases are reproduction, localization, generation, validation, and refinement (abstract, p. 1). The formal-verification extension is deliberately preliminary: it generates contracts with an LLM and checks Python functions with CrossHair and Z3. The paper states, “Although we only verify eleven patches in SWE-bench Lite, this marks an early exploration of verifiable patching agents.” (section 1, p. 2) Inference: its patching benchmark results should not be read as verification results.

The paper states, “PatchPilot proposes a novel rule-based planning workflow with five components: reproduction, localization, generation, validation, and refinement (where refinement is unique to PatchPilot).” (abstract, p. 1) The main SWE-bench Lite benchmark has 300 instances and SWE-bench Verified has 500 human-validated instances (section 4.1, p. 6). With Claude-3.5-Sonnet, PatchPilot resolves 136/300 Lite instances (45.33%) at $0.97 average cost and 268/500 Verified instances (53.60%) at $0.99 (Table 1, p. 6). A resolved instance means the patch fixes the issue and passes hidden functionality tests (section 4.1, p. 6).

## technique 1: fixed rule-based patch workflow
Inference: use this when stability and cost matter more than allowing an agent to invent a workflow per issue. Given repository R and issue description Di, PatchPilot first recovers a proof-of-concept (PoC) and benign tests, then localizes the root cause, creates several candidates, validates them, and refines the best candidate when tests fail (sections 3.1–3.5, pp. 3–6).

Step by step from the method:
1. Reproduction prompts the LLM to create a PoC and iteratively correct missing dependencies, configuration, or non-reproducing behavior. The implementation allows seven iterations and at most one PoC per instance; if reproduction fails, it proceeds without a PoC (section 3.2, p. 4; Appendix B, p. 13).
2. Execute the PoC and collect covered files, stack traces, and output; also retrieve three relevant functionality-test files (section 3.2, p. 4).
3. Localize hierarchically from files to classes and functions to lines, using PoC evidence and code-search tools for definitions and fuzzy matching. Review the result to retrieve context or correct the root cause (section 3.3, p. 5; Appendix B, pp. 13–14).
4. Generate N plans and then patches. The implementation uses four candidates per batch, at most twelve candidates per instance, and at most three steps per plan. The first batch uses one comprehensive, one minimal, and two standard plans; later batches use only standard plans (section 3.4, p. 5; Appendix B, p. 14).
5. Run lint and syntax checks after each plan step and retry failed steps; skip a step if an acceptable edit cannot be generated. Execute PoC and benign functionality tests. Rank by the PoC-failure indicator plus the fraction of failed functionality tests, with lower scores preferred and an LLM breaking ties (sections 3.2 and 3.4, pp. 4–5; Appendices A–B, pp. 13–14).
6. Refine the top-ranked patch using validation feedback until a patch passes all available tests or the candidate limit is reached. Section 3.5 says to rerun localization if a batch passes no new tests; Appendix B specifies no new functionality tests and forces exploration beyond prior localization results (section 3.5, p. 6; Appendix B, p. 14).

Inference: For Verus, this maps to a fixed pipeline that reproduces executable behavior, localizes the relevant Rust function and specification, generates a contract-and-code patch, runs Verus, and refines using diagnostics. A deterministic controller can reduce tool-call variance, but it cannot replace proof checking.

## technique 2: formal contract generation and CrossHair checking
Inference: use this when a Python function can be expressed with explicit preconditions and postconditions and CrossHair can symbolically execute its paths. The paper explains that “CrossHair works by symbolically executing the function under the given pre-conditions and using the Z3 SMT solver to check whether the post-condition holds for all valid inputs.” (section 5, p. 8)

The paper’s three-step procedure is:
1. Contract Generation: prompt the LLM with the issue and original functions; request type annotations plus logical preconditions and postconditions for each modified function (section 5, p. 8).
2. Contract Validation: insert the type annotations and contracts into the original functions and run CrossHair. At least one counterexample triggering AssertionError in any original function makes the contract set plausible. If no counterexample appears for any function, regenerate contracts and annotations for all functions, up to Nregen iterations (section 5, pp. 8–9).
3. Formal Verification: insert the contracts into patched functions and run CrossHair. If no counterexample satisfies the precondition while violating the postcondition for any patched function, mark the instance verified (section 5, p. 9).

If regeneration fails, the method prompts the LLM with the issue and original functions again and allows it to remove branches and logic irrelevant to the postconditions, keeping the key logic. If plausible contracts still cannot be generated, it marks the instance unverified (section 5, p. 9). The evaluation uses Nregen=3 and o3 on SWE-bench Lite, but only eleven patches are formally verified because Python verifiers struggle with intricate data structures and deeply nested or dynamic calls (section 5, p. 9).

Inference: In Verus, the corresponding artifacts are Rust function signatures with `requires` and `ensures`, plus proof lemmas for arithmetic or data-structure facts. CrossHair’s symbolic execution does not transfer to Verus; `cargo verus` and Verus proofs must check the Rust implementation. The LLM-generated contract should be treated as a candidate specification, and a human or product policy must ensure it expresses the issue’s intended behavior.

## technique 3: validation feedback and refinement
PatchPilot ranks candidates by PoC and benign tests, prioritizing PoC passes; a qualified patch must pass all available tests (sections 3.1–3.2, pp. 4–5; Appendix A, p. 13). Refinement starts from the top-ranked current patch rather than regenerating from scratch. The prompt asks for corrections to failed tests; if an entire batch fails to pass any new test, localization is rerun with the later feedback (section 3.5, p. 6).

Evidence on 300 Lite tasks: the ablation’s base localization+generation resolves 98 tasks (32.7%); adding the authors’ localization and generation raises this to 116 (38.7%); adding PoC validation yields 111 (37.00%); adding functionality validation yields 125 (41.67%); adding refinement reaches 136 (45.33%) (Figure 3 and section 4.3, pp. 7–8). The percentages use the same 300-task denominator. Three repeated GPT-4o runs on 45 instances randomly selected from 102 instances previously resolved by both tools report PatchPilot resolved 30, 32, and 35 tasks, standard deviation 2.52, while OpenHands resolved 15, 20, and 21, standard deviation 3.21 (section 4.2, p. 7). Inference: these patch outcomes do not measure theorem-proving success, and the selected stability sample does not establish stability across all benchmark instances.

## techniques for the catalog
- fixed rule workflow: run reproduction, localization, generation, validation, and bounded refinement under predefined control rules
- hierarchical localization: narrow from files to functions to lines using PoC traces and code-search tools
- plan-then-generate: produce multi-step patch plans and validate each step before final candidates
- contract synthesis: ask an LLM for preconditions and postconditions, then filter with counterexamples
- formal patch checking: rerun symbolic verification on patched functions and reject any counterexample
- validation-guided refinement: repair the best partial patch using failed tests and rerun localization when needed
