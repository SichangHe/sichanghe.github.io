# Test-Oriented Programming: rethinking coding for the GenAI era
(authored by agents unless marked 🧑)
Tag: `melegati2026testoriented`, [paper](http://arxiv.org/abs/2604.08102v1)

## scope and claims

This two-page ICSE Companion paper proposes Test-Oriented Programming (TOP): developers specify a project and acceptance tests, inspect generated test code, and delegate production-code generation to an LLM. The abstract calls it “a novel paradigm consisting of the complete delegation of code generation based on natural language specifications, in which developers are only responsible for verifying test code.” The prototype, Onion, generates a small BibTeX command-line program from YAML configuration and tests. The evidence is a small feasibility demonstration, not a reliability or security evaluation.

Inference: TOP is relevant to VeruLaw because a Verus specification and proof obligation can serve as an executable acceptance boundary, but ordinary unit tests do not prove functional correctness. A Verus workflow must retain the verifier as the acceptance oracle.

## technique: make tests the reviewed specification

What it is: shift human review from generated production code to generated test code. Natural-language requirements remain input, but test code resolves their ambiguity. Section 2 explains that conventional programming's ambiguity is solved by formal specifications and proposes combining LLMs with test-driven development.

When to use it: use it when production code can be generated from deterministic, executable checks and reviewers can understand those checks. It is unsafe when tests omit important behavior or encode a wrong requirement.

How to do it:

1. Write natural-language project and acceptance-test statements.
2. Ask the tool to generate tests and production code from those statements.
3. Inspect and, if needed, edit the generated test code.
4. Let test execution decide whether production-code generation has succeeded.

Evidence: the paper says, “TOP is based on creating code for automatic tests (test code), which, alongside natural language specifications, is used to automatically generate production code.” It also reports, “developers only have to check test code generated based on natural language specifications, rather than focusing on production code.”

Verus form: Inference: replace the test acceptance boundary with a reviewed Verus contract: `requires` states legal inputs, `ensures` states behavior, and `assert`/proof lemmas discharge invariants. Generated Rust may be changed freely while the contract remains human-reviewed. Unit tests can complement the contract but cannot replace proof obligations. Verus syntax and proof checking are additional requirements absent from TOP.

Evidence limits: the paper does not establish that reviewed tests are complete. Its own results show test inconsistencies blocked generation, so the test layer is a failure source as well as a specification.

## technique: Onion's staged configuration-to-code loop

What it is: Onion is an iterative command-line tool driven by a fixed YAML template. It separates project description, generated structure, class tests, and acceptance tests.

How to do it:

1. Put project goal, library dependencies, outputs, and acceptance-test descriptions in the main YAML configuration.
2. Have the LLM generate a structure YAML listing packages, classes, and methods.
3. Developer reviews or edits the structure.
4. Generate acceptance tests and per-class tests.
5. Developer reviews or edits those test files.
6. Execute tests while generating each class's implementation.
7. If a bounded number of attempts fails, edit tests, structure, or the main configuration and restart.
8. When all class tests pass, run acceptance tests to generate the main file.

Evidence: Section 3 states, “The configuration file contains, as lists of natural language statements, i) a description of the project … and ii) the description of acceptance tests.” It then says, “If, after a defined number of tries, the generation fails, the tool aborts and the developer should modify the tests, the structure or even the main configuration file.”

Verus form: Inference: use a staged Rust crate: a reviewed module interface and `spec` contracts first, generated implementation second, and `cargo verus` after each repair attempt. A failed proof should trigger edits to the implementation or contract under review, with a bounded retry count. Verus has no direct YAML-to-proof mechanism in this paper; the staging policy is the transferable idea.

## technique: iterative repair guided by verifier feedback

What it is: do not hand-edit generated production code; repair the tests or supporting structure when generated code fails. In the BibTeX experiment, the authors generated code five times from scratch for each of two models while keeping the accepted structure fixed.

Evidence: “All the tries were successful but with different levels of developer intervention and code quality.” “In none of the tries, we had to directly modify the production code.” “In most of the tries, the generation failed because of inconsistencies in the test code. Once we fixed these issues, the production code was correctly implemented.”

Denominators and setting: the experiment used two LLMs, GPT-4o mini and Gemini 2.5-Flash, with five generation runs per model (10 runs total). The paper says two runs, one per model, required added comments in test code; this is 2/10 runs. It does not report a larger benchmark or statistical uncertainty.

Verus form: Inference: replace “tests pass” with verifier success for the current Rust crate. Feed compiler/verifier diagnostics back to the agent, but require a human to approve changes to contracts and test specifications. This can catch proof failures but cannot detect an underspecified contract.

## technique: treat model variability as an engineering input

What it is: compare models under the same accepted structure and record interactions, generated code, and logs. Section 3 uses GPT-4o mini and Gemini 2.5-Flash and reports different intervention levels, verbosity, and determinism.

Evidence: “We also observed the issue of the lack of determinism of LLMs in the generation of production and test code: most of the tries led to the generation of different outputs.” The paper further reports, “there is a huge difference to the generated code for different models.”

Use: hold the structure and prompts constant, run multiple independent generations, and measure intervention, failures, and output quality. Do not infer reliability from one successful run.

Verus form: Inference: benchmark candidate agents by proof compilation rate, repair count, contract changes, and trusted-code size, separated by model and prompt. The paper gives no Verus measurements, so these are proposed adaptations.

## what is proved, measured, and trusted

The paper demonstrates that Onion generated a BibTeX CLI with no direct production-code edits in the reported 10 runs and that all runs eventually succeeded, while exposing test inconsistencies, test-review workload, nondeterminism, and model-dependent verbosity. It does not prove semantic completeness, security, scalability, or correctness beyond the selected tests. The developer's acceptance of structure and tests, the LLM, Python runtime, and test framework remain trusted. Inference: threat to agent-written verified Rust is medium to high if TOP is used without a formal contract; the paper's central failure mode is an inconsistent or incomplete test specification. What VL should reuse is the staged, bounded repair loop and the explicit accounting of model/run denominators. What VL should not redo is treating passing generated tests as evidence equivalent to a proof.

## techniques for the catalog

- reviewed-test specification — make human review focus on executable acceptance tests that drive generation
- staged Onion workflow — progress from YAML requirements to structure, tests, class implementations, and acceptance execution
- bounded repair loop — repair tests or structure after failed generation, then retry up to a fixed limit
- model variability audit — repeat generations per model and report intervention, failures, and output differences
Checked 2026-10-15 against paper melegati2026testoriented: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
