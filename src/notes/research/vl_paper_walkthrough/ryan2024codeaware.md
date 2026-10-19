# Code-Aware Prompting: A Study of Coverage-Guided Test Generation in Regression Setting using LLM
(authored by agents unless marked 🧑)
Tag: `ryan2024codeaware`, [paper](https://doi.org/10.1145/3643769)

## scope and core idea

The paper introduces SymPrompt, a three-stage prompting method for generating regression tests from a focal method. The stages are static path analysis, selective context extraction, and one prompt per target path. “At a high level, SymPrompt works in three stages: (i) Given a focal method, SymPrompt tries to statically capture the execution behavior of the method by collecting approximate path constraints and return values for each execution path. (ii) SymPrompt collects some properties of the focal method including argument types, external library dependencies, code context, etc. (iii) For each execution path, SymPrompt constructs a prompt using the collected information and solicits the LLM to generate a test input that will execute the corresponding path.” (Section 1, p. 3)

The purpose is to make the model solve one path at a time rather than infer all missing paths while writing a whole suite. The authors explain: “In our approach, we delegate steps 1 and 2 to traditional static analysis, allowing the LLM to focus solely on step 3.” Here, steps 1 and 2 identify the previously covered branch and select another branch; step 3 creates its test (Section 1, p. 3). The prototype uses TreeSitter for Python (Section 1, p. 3). The benchmark contains 897 methods from 26 open-source projects: “We select focal methods from these projects where Pynguin [24] (an SBST tool for Python) was unable to achieve full coverage on the focal method during 10 runs, indicating the focal method poses a challenge for existing automated test generation tools.” (Section 4, p. 11)

Inference: for VL, the same decomposition can assign one proof obligation or branch invariant to each prompt, while preserving shared type and dependency context. The paper’s method is a test-generation method, so its Verus mapping is an inference rather than a result reported by the authors.

## technique 1: approximate path-constraint collection

What it is. SymPrompt parses the focal method’s AST and performs a preorder traversal. At each branch or loop it records the condition, inverting it for paths that do not take the branch. At a return it records the accumulated conditions and the return expression. “We perform a preorder traversal of the focal method abstract syntax tree (AST) and collect constraints for each branch and loop condition while maintaining a set of all constraints that appear on each possible execution path.” (Section 3.2.1, p. 7)

When to use it. The method addresses complex types, unresolved calls, and external dependencies. The authors state: “First, instead of trying to resolve all the data types and unresolved dependencies while collecting path constraints, we allow approximations.” Their example retains `path.is_dir()` without symbolically resolving the call (Section 3.1, p. 7).

How to do it.

1. Parse the focal method and traverse its AST in preorder (Sections 2 and 3.2.1, pp. 6–7)
2. Record branch and loop conditions on each path; invert branch conditions for branches not taken (Sections 2 and 3.2.1, pp. 6–7)
3. At each return, save the path’s conjunction and returned value expression (Section 3.2.1, p. 7)
4. Keep unresolved calls as named conditions instead of solving their semantics (Section 3.1, p. 7)
5. Build one prompt for each retained path, including its constraints and any recorded return expression (Sections 2 and 3.4, pp. 6, 10)

The working example traverses `path.is_dir()`, then `path.is_file()`, and continues through the remaining branches to the final return, recording conditions and values at each return (Figure 2, p. 5). Inference: in Verus, the analogous extracted conditions are branch facts and proof obligations from `if`, `match`, loops, and `assert`; a failed `ensures` or invariant obligation can be treated as a target condition. Inference: unresolved library calls should remain explicit assumptions or trusted preconditions rather than being silently modeled as facts.

## technique 2: basis-path minimization

Why it is needed. All branch combinations grow exponentially. SymPrompt retains a linearly independent subset of basis paths. “To prevent an exponential explosion of paths when collecting path constraints, we minimize the path set on each traversal step to only include paths that increase overall branch coverage.” (Section 3.2.1, p. 7)

How it is done. Split each path into branch constraints, keep a set of constraints already represented, and add a path only when it introduces a new constraint. Minimization is applied after collecting new constraints from each `if` or `while` statement (Section 3.2.2, p. 9). The paper’s three-branch example has eight combinations but the algorithm keeps at most four paths, “one initial path, +1 for each branch” (Section 3.2.2, p. 9; Figure 5, p. 8). The authors state: “For testing purposes, basis paths are convenient because a set of tests that execute a set of basis paths in a method will achieve full branch coverage on that method.” (Section 3.2.2, pp. 8–9) Inference: this claim depends on executing the selected paths; static selection alone does not establish feasibility or semantic equivalence.

Inference: a VL implementation can maintain a set of uncovered proof obligations and select a candidate path or invariant that adds a new obligation. It must not discard paths merely because they share branch conditions if they differ in arithmetic facts, aliasing, quantified triggers, or trusted assumptions. Inference: basis-path selection is a prompt-budget heuristic, not a completeness guarantee for functional verification.

## technique 3: selective type and dependency context

What it is. The generation context includes imports and globals, relevant type and function definitions available in the focal file, the focal class signature and constructor when applicable, called methods of that class, and the focal method itself. The path prompt includes the focal method signature. Figure 6 names five components: imports/globals, type context, focal-class type context, focal-class method context, and focal method (Section 3.3, p. 9).

How to do it.

1. Parse the focal file and extract imports, globals, classes, and methods; add all imports and global definitions to the context (Section 3.3, p. 10)
2. Add definitions of classes and functions used by the focal method when defined in that file (Section 3.3, p. 10)
3. If the method belongs to a class, add its type signature, constructor, and called class methods (Section 3.3, p. 10)
4. Append the full focal method immediately before the test context and generation prompt (Section 3.3, p. 10)
5. Build the execution context from these definitions and remove model-generated imports that duplicate them (Section 3.4, pp. 10–11)

The authors report: “Overwriting the model-generated imports with the classes and objects identified in the calling context greatly reduced errors when the tests were executed.” (Section 4.4, p. 16) Inference: for Verus, include the relevant struct and enum definitions, trait bounds, spec functions, preconditions, postconditions, loop invariants, and called proof functions. Inference: compile the candidate against the actual module so a prompt cannot invent a type or specification that is absent from the checked crate.

## technique 4: iterative path prompts and output parsing

For each retained path, SymPrompt asks the model for a test case and appends generated tests to later prompts. “After constructing a set of path constraint prompts, we use these to iteratively prompt the model to generate tests for each path, and include the generated tests in the prompt for the next generation.” (Section 3.4, p. 10) The generated code is parsed; on parse errors, lines are removed from the end until it parses (Section 3.4, p. 11). Evaluation executes tests in the constructed context; generation itself does not use runtime coverage feedback. The methodology states: “This entire process is done statically without executing the focal method.” (Section 3.1, p. 7)

Inference: in VL, a corresponding loop can append the latest proof attempt and diagnostics to the next target-specific prompt. Verus compilation and verification should filter candidates; truncating source text until it parses does not establish Rust or specification correctness. Inference: preserve the specification and reject a candidate that passes only after deleting obligations or changing trusted annotations.

## evidence and denominators

On the full benchmark, CodeGen2 (16B parameters) over ten generations per focal method gives baseline Pass@1 0.12, FM Call@1 0.34, Correct@1 0.03, line coverage 0.38, and branch coverage 0.40; SymPrompt gives 0.41, 0.49, 0.15, 0.48, and 0.44 respectively (Table 1, p. 13). The authors define Correct@1 as “The average number of tests that both pass and correctly call the focal method for each generated testsuite.” They explain that these metrics “may contain partially passing rates on each generation, since a single generated testsuite may contain both passing and failing tests.” Coverage is averaged over focal methods and generated suites (Section 4, p. 11). The authors describe this as nearly 4× pass-rate and 5× correct-generation improvement (Section 4.1, p. 12).

On the 100-method ablation, CodeGen2 SymPrompt reaches Correct@1 0.26 and line/branch coverage 0.53/0.42; constraints-only reaches 0.17 and 0.49/0.38; context-only reaches 0.06 and 0.42/0.35; baseline reaches 0.04 and 0.30/0.29 (Table 2, p. 15). For GPT-4, baseline Correct@1 is 0.09 and coverage 0.36/0.40, while SymPrompt is 0.25 and 0.74/0.74 (Table 2, p. 15). GPT-4 uses model-generated paths rather than the static extraction used with CodeGen2: “instead of generating path prompts with static analysis, we prompt the model to describe execution paths and then embed each path description in a test docstring” (Section 4.4, p. 16). Its baseline first describes the method’s intent and then generates tests. Path prompts alone give GPT-4 line coverage 0.39 versus baseline 0.36; context alone gives 0.43 (Table 2, p. 15). The paper’s path-following manual check found 6 of 10 GPT-4 tests followed their specified paths; four failed because of deeply nested branches or exception handling (Section 4.4, p. 16).

The filtered comparison is an evaluation variant: “we also run a version of SymPrompt (Symprompt Filtered) where test suites with no working tests (i.e., that do not execute and call the focal method) are discarded.” (Section 4.1, p. 13) It reports SymPrompt Filtered line/branch coverage 0.77/0.66 versus Pynguin 0.72/0.64 on the full benchmark (Table 1, p. 13). Unseen-project evaluation still gives SymPrompt Correct@1 0.12 versus baseline 0.03 and line coverage 0.36 versus 0.32 (Table 1, p. 13). The authors acknowledge: “the possibility remains that CodeGen2 could have seen some of the focal methods or similar code in its training data.” They also state: “Our evaluations focus on open source Python projects and utilize specific language models (CodeGen2 and GPT-4). This restricts the generalizability of our findings to other languages or models.” (Section 5, p. 16)

## what is proved, trusted, and threatened

The paper measures test execution, method calls, and line/branch coverage (Section 4, p. 11). It assumes the implementation is correct: “As a result, our generated tests may not uncover any implementation bugs.” (Section 5, p. 17) Inference: these results do not establish semantic correctness or Verus proof correctness. Inference: VL must replace coverage metrics with verifier pass rate, specification coverage, and regression checks over trusted assumptions. Inference: faults in the parser, static path extractor, Python execution environment, model output, or assertions can affect generation or its measured results. Inference: a Verus deployment should record compiler and verifier versions, admitted or external-body items, and all preconditions treated as environment assumptions.

Inference: SymPrompt threatens VL mainly as a workflow precedent: staged prompts and precise context can make an agent reach difficult branches or proof states, but they also make it easy to optimize a shallow metric. VL should not redo the paper’s path decomposition idea; it should adapt the idea to proof obligations and add specification-diff and trust-boundary checks. Inference: the 6/10 path-following result supports checking whether a generated artifact satisfies its requested target; a generated Rust proof needs Verus acceptance and review of what was proved.

## techniques for the catalog

- approximate path-constraint collection — traverse the AST and record branch conditions plus return behavior for each path
- basis-path minimization — keep only paths that add a new branch condition to control exponential growth
- selective type and dependency context — expose definitions needed to construct valid inputs and calls
- iterative path prompting — generate one path-targeted test at a time and append earlier tests as context
- output parsing — delete trailing generated lines until the Python code parses
- filtered evaluation — discard suites with no tests that execute and call the focal method when computing the separate filtered comparison
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "After constructing a set of path constraint prompts, we use these to iteratively prompt the model to generate tests for each path, and include the generated tests in the prompt for the next generation."): checked every quotation, number, section/page reference, technique step, and inference against all 21 pages; corrected references and an inexact quotation, distinguished GPT-4-generated paths and filtered evaluation, and marked unsupported interpretations as inferences; did not reproduce experiments, inspect prototype code, or check supplemental materials.
