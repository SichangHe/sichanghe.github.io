# PatchPilot: A Cost-Efficient Software Engineering Agent with Early Attempts on Formal Verification
(authored by agents unless marked 🧑)
Tag: `li2025patchpilot`, [paper](https://doi.org/10.48550/arxiv.2502.02747)

## scope
PatchPilot is a rule-based software patching agent. Its five phases are reproduction, localization, generation, validation, and refinement (abstract, p. 1). The formal-verification extension is deliberately preliminary: it generates contracts with an LLM and checks Python functions with CrossHair and Z3. The paper states, “Although we only verify eleven patches in SWE-bench Lite, this marks an early exploration of verifiable patching agents.” (section 1, p. 2) Therefore its patching benchmark results should not be read as verification results.

The paper says PatchPilot “proposes a novel rule-based planning workflow with five components: reproduction, localization, generation, validation, and refinement.” (abstract, p. 1) The main SWE-bench Lite benchmark has 300 instances and SWE-bench Verified has 500 human-validated instances (section 4.1, p. 6). With Claude-3.5-Sonnet, PatchPilot resolves 136/300 Lite instances (45.33%) at $0.97 average cost and 268/500 Verified instances (53.60%) at $0.99 (Table 1, p. 6). A resolved instance means the patch fixes the issue and passes hidden functionality tests (section 4.1, p. 6).

## technique 1: deterministic rule-based patch workflow
Use this when stability and cost matter more than allowing an agent to invent a workflow per issue. Given repository R and issue description Di, PatchPilot first recovers a proof-of-concept (PoC) and benign tests, then localizes the root cause, creates several candidates, validates them, and refines the best candidate when tests fail (sections 3.1–3.5, pp. 3–6).

Step by step from the method:
1. Reproduction prompts the LLM to create a PoC and iteratively correct missing dependencies, configuration, or non-reproducing behavior (section 3.2, p. 4).
2. Execute the PoC and collect covered files, stack traces, and output; also retrieve three relevant functionality-test files (section 3.2, p. 4).
3. Localize hierarchically from files to functions to lines, using PoC evidence and code-search tools for definitions and fuzzy matching (section 3.3, p. 5).
4. Generate N plans and then patches. Prompt variants request comprehensive, minimal, or standard plans (section 3.4, p. 5).
5. Run lint and syntax checks after each plan step, then execute PoC and benign functionality tests and rank candidates by passed tests (section 3.4, p. 5).
6. Feed validation feedback to refinement; if no candidate passes a new test, rerun localization with that feedback (section 3.5, p. 6).

Inference: For Verus, this maps to a fixed pipeline that reproduces executable behavior, localizes the relevant Rust function and specification, generates a contract-and-code patch, runs Verus, and refines using diagnostics. A deterministic controller can reduce tool-call variance, but it cannot replace proof checking.

## technique 2: formal contract generation and CrossHair checking
Use this when a Python function can be expressed with explicit preconditions and postconditions and CrossHair can symbolically execute its paths. The paper explains that “CrossHair works by symbolically executing the function under the given pre-conditions and using the Z3 SMT solver to check whether the post-condition holds for all valid inputs.” (section 5, p. 8)

The paper’s three-step procedure is:
1. Contract Generation: prompt the LLM with the issue and original functions; request type annotations plus logical preconditions and postconditions for each modified function (section 5, p. 8).
2. Contract Validation: insert the contracts into the original functions and run CrossHair. A counterexample causing AssertionError makes the contract set plausible; if no counterexample appears, regenerate up to Nregen times (section 5, p. 8).
3. Formal Verification: insert the contracts into patched functions and run CrossHair. If no counterexample satisfies the precondition while violating the postcondition for any patched function, mark the instance verified (section 5, p. 9).

If plausible contracts still cannot be generated, the method asks the LLM to remove branches irrelevant to the postconditions and retries; otherwise the instance is marked unverified (section 5, p. 9). The evaluation uses Nregen=3 and o3 on SWE-bench Lite, but only eleven patches are formally verified because Python verifiers struggle with intricate data structures and deeply nested or dynamic calls (section 5, p. 9).

Inference: In Verus, the corresponding artifacts are Rust function signatures with `requires` and `ensures`, plus proof lemmas for arithmetic or data-structure facts. CrossHair’s symbolic execution does not transfer to Verus; `cargo verus` and Verus proofs must check the Rust implementation. The LLM-generated contract should be treated as a candidate specification, and a human or product policy must ensure it expresses the issue’s intended behavior.

## technique 3: validation feedback and refinement
PatchPilot ranks candidates by PoC and benign tests, prioritizing PoC passes while requiring functionality preservation (section 3.2, p. 4). Refinement starts from the top-ranked current patch rather than regenerating from scratch. The prompt asks for corrections to failed tests; if an entire batch fails to pass any new test, localization is rerun with the later feedback (section 3.5, p. 6).

Evidence on 300 Lite tasks: the ablation’s base localization+generation resolves 84 tasks (28.0%); adding the authors’ localization and generation raises this to 100 (33.33%); adding PoC validation yields 111 (37.00%); adding functionality validation yields 125 (41.67%); adding refinement reaches 136 (45.33%) (Figure 3 and section 4.3, pp. 7–8). The percentages use the same 300-task denominator. Three repeated GPT-4o runs on 45 instances report PatchPilot resolved 30, 32, and 35 tasks, standard deviation 2.52, while OpenHands resolved 15, 20, and 21, standard deviation 3.21 (section 4.2, p. 7). These are patch outcomes, not theorem-proving rates.

Inference: In VL, Verus diagnostics should be fed back as structured failed obligations, while regression tests ensure that a proof patch did not alter executable behavior. Refinement must stop at a bounded budget and leave unverifiable candidates rejected.

## proved, trusted, and product threat
CrossHair’s counterexample search and Z3 checks provide evidence only for the generated contracts and supported Python semantics. The LLM-generated contracts, contract plausibility heuristic, test selection, and issue specification remain trusted. The paper itself limits the formal experiment to eleven patches and reports verifier difficulty on dynamic Python features. Inference: the threat to agent-written verified Rust is high if contracts are weak or vacuous, but the paper contributes a useful pattern: fixed orchestration, independent regression validation, explicit contracts, and counterexample-guided retries. VL should not redo a generic SWE-bench patching agent; it should adapt the contract loop to Verus and measure proof success with denominator, model, and specification quality reported.

## techniques for the catalog
- fixed rule workflow: run reproduction, localization, generation, validation, and bounded refinement in a deterministic order
- hierarchical localization: narrow from files to functions to lines using PoC traces and code-search tools
- plan-then-generate: produce multi-step patch plans and validate each step before final candidates
- contract synthesis: ask an LLM for preconditions and postconditions, then filter with counterexamples
- formal patch checking: rerun symbolic verification on patched functions and reject any counterexample
- validation-guided refinement: repair the best partial patch using failed tests and rerun localization when needed
Checked 2026-10-15 against paper li2025patchpilot: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
