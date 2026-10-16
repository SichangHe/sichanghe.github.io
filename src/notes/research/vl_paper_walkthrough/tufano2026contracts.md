# Grounding AI Agents in Contracts: An Empirical Evaluation of Spec-Driven Test Generation
(authored by agents unless marked 🧑)
Tag: `tufano2026contracts`, [paper](https://doi.org/10.1145/3842652.3843195)

## what is measured

This paper compares direct test generation with a two-phase Spec-Driven Agent. Before writing tests, the agent extracts a semi-formal behavioral contract for every public and private API, records preconditions, postconditions, and test suggestions, and marks each condition Tested or Untested. It then generates tests from that artifact. The paper defines a unit specification as `S_c = <D_c, Pre_c, Post_c, Sug_c>` (Section 2, p. 2), where `D` describes behavior, `Pre` constrains input state, `Post` covers validation, return values, side effects and expected variants, and `Sug` links tests to conditions.

The dataset contains 90 Google production bugs with verified fixes and reproducible failures, spanning C++, Java, Python, and Go. Bugs were filtered to single production-file fixes plus one test file and optional build files (Section 4.1, p. 4). Both agents use Gemini 3 Flash, the same harness and tools, and five independent runs per bug (`k=5`). The greenfield setup starts from fixed code while removing the existing tests; agents are blind to bug descriptions, commit messages, and diffs. The generated tests must pass fixed code, then fail on reverse-patched buggy code; build failures are not counted as detection (Sections 4.2–4.3, pp. 4–5).

At `k=5`, bug detection is 63.2% for Spec-Driven versus 53.4% baseline, a 9.8-point difference with McNemar `p=0.0352` (Table 2, p. 6). This is a fraction over 90 bugs: 57 versus 48 unique bugs detected (Table 4, p. 8), while the attempt-level analysis has 450 runs. Branch coverage is 48.9% versus 46.4%, +2.5 points, Wilcoxon `p=0.0034`; line coverage is 74.4% versus 74.8%, −0.4, `p=0.3659` (Table 3, p. 7). Test-suite pass@5 is 98.9% for both agents (Table 1, p. 6), so the detection gain is not simply more compilable code.

ContractCoverage@1 is 61.1% and reaches 78.9% at `k=5`; when the generated specification captures the violated contract, tests detect the bug in 151/275 runs (54.9%), versus 34/175 (19.4%) without coverage (Section 5.3.1, p. 7). These denominators are attempts, not unique bugs. The spec-driven agent consumes 336.7M tokens versus 243.9M baseline (+38.0%) over the five-run corpus, and 5.9M versus 5.1M tokens per unique bug (+16.2%) (Table 4, p. 8).

The paper's evidence does not prove formal contract correctness. Specifications are natural-language and judged by Gemini 3.1 Pro against bug descriptions, commit messages and fix diffs. The authors warn that contract coverage is a defect-driven proxy, requiring a known fix and covering only the target defect's boundaries (Section 4.4.3, p. 5). Inference: for VeruLaw, this is a useful front-end for discovering candidate contracts and tests, but Verus must check executable Rust against explicit specifications; an LLM-generated `.spec.md` remains untrusted until translated and proved.

## technique 1: contract extraction as an intermediate artifact

What it is and when to use it. Force an agent to articulate intended behavior before writing tests. The paper says, “The intermediate semi-formal specification acts as a cognitive scaffold to guide subsequent test generation” (abstract, p. 1). Use this when code lacks explicit contracts and direct test synthesis misses edge cases.

How to do it. (1) Aggregate source, requirements, docstrings, comments, RFCs and caller usage. (2) For every function, infer behavioral and safety boundaries. (3) Write `D`, `Pre`, and `Post`, including successful results, errors, side effects and state variants. (4) Cross-reference each condition against existing tests and mark Tested or Untested. (5) For every Untested condition, write a targeted `Sug` test. (6) Emit one structured `.spec.md` artifact covering helpers and private functions (Section 3.1, pp. 3–4). The illustrative `add_customer` contract marks invalid phone as tested, empty name as untested, and suggests an exception test (Listing 1, p. 3).

Verus form. Inference: convert `Pre` into `requires`, `Post` into `ensures`, and `D` into comments or a `spec fn` model. Use `proof fn` lemmas for nontrivial relationships and `assert` statements for local obligations. A generated test suggestion becomes a Rust test only after its expected behavior is reflected in a Verus contract. This translation is a design inference; the paper uses natural-language specifications, not Verus.

Evidence and limits. The 61.1% ContractCoverage@1 shows that the artifact captures the target contract in a majority of single attempts, but 141 attempts were classified as specification-generation failures (Section 5.3.2, p. 7). Failure categories include omitted methods (35), missing error handling (32), omitted data transformations (27), abstracted constants (25), and missing execution constraints (22). Inference: requiring an artifact exposes omissions for review, but does not guarantee completeness.

## technique 2: oracle-driven test generation

What it is and when to use it. Generate tests directly from untested contract conditions instead of asking for generic coverage. After optional curation, the agent receives finalized `S` and the empty baseline suite, then implements `Sug` as assertions (Section 3.3, p. 4).

How to do it. (1) Start from fixed source and empty test target. (2) Read the specification and enumerate every Untested pre/postcondition. (3) Generate a concrete test for each suggestion. (4) Build and run against fixed code. (5) Keep only suites that pass fixed code. (6) Reverse-patch the historical bug and run the same suite; count detection only if at least one test fails on buggy code. The paper formalizes detection as `D(b,T_gen)=1` iff some generated test fails on `C_b` (Section 4.3, p. 5).

Verus form. Inference: use contract clauses as proof or test oracles. For a function `fn add(...)`, `requires` states valid input and `ensures` states state changes; Rust tests exercise boundary cases, while Verus proves universal clauses. Keep tests as regression evidence and do not substitute them for proofs.

Evidence and limits. Spec-driven detection rises from 41.1% to 63.2% across `k=1` to `k=5`; baseline rises 36.9% to 53.4% (Table 2, p. 6). The same agents have nearly identical pass@5 (98.9%), supporting a semantic-oracle explanation. Yet 110 attempts had covered contracts but still failed to generate a fault-revealing test (Section 5.3.3, p. 7), with inadequate inputs (37), omitted scenarios (36), weak assertions (20), flawed logic (12), and invalid code (5).

## technique 3: greenfield fail-to-pass evaluation

What it is and when to use it. Remove existing tests and blind the agent to the historical patch so the measured suite must recover behavior from code and inferred intent. This prevents copying tests or repairing a known failure. The paper says the setup “forces it to rely entirely on its fundamental code understanding and inferred specification” (Section 4.3, p. 4).

How to do it. (1) Synchronize to fixed source `C_f`. (2) Delete existing test target `T_b`, yielding empty `T_∅`. (3) Run each agent on `C_f,T_∅`. (4) Audit file traces and discard runs that modify production source; temporary specs and scratchpads are allowed. (5) Measure line/branch coverage on fixed code. (6) Reverse-patch to `C_b` and measure fail-to-pass detection (Sections 4.3–4.3.1, pp. 4–5).

Verus form. Inference: use a similar two-artifact evaluation for VL: generate Rust/Verus from a stable implementation or specification while hiding seeded regressions, then run Verus and independent tests on fixed and buggy variants. A test that merely compiles is not evidence that the contract catches the regression.

Evidence and limits. The 90-bug corpus is real production data, but all bugs come from one Google monorepo and single-file fixes (Section 6, p. 8). Inference: greenfield isolation improves causal interpretation, while external validity to open-source Rust remains unknown.

## technique 4: ContractCoverage defect-driven metric

What it is and when to use it. Measure whether a generated specification states the exact pre/postcondition violated by a known fix, separating oracle quality from test-writing ability. The authors call this a “pragmatic, defect-driven proxy” (Section 4.4.3, p. 5).

How to do it. (1) Provide a stronger judge with bug description, human commit message, ground-truth diff and generated spec. (2) Ask whether the spec explicitly documents the fixed behavioral constraint. (3) Classify failures as Specification Generation Failure if the contract is missing, or Test Generation Failure if the contract is present but tests fail to expose the bug. (4) Compute ContractCoverage@k across all 5×90=450 attempts and correlate it with detection using a 2×2 table, Fisher's exact test and Phi coefficient (Section 5.3, p. 7).

Verus form. Inference: define a similar metric over seeded Rust regressions: a contract covers a regression only if its `requires`/`ensures` or state-machine invariant excludes the buggy behavior. The metric should inspect formal clauses and proofs, not an LLM judge alone.

Evidence and limits. Coverage correlates with detection (`p=3.62×10^-14`, Phi `φ=0.35`), but the judge sees the ground-truth fix and commit description, information unavailable during generation. Thus it evaluates alignment after the fact. Inference: use this metric for auditing a contract miner, not as proof of semantic completeness.

## technique 5: paired statistical and qualitative evaluation

What it is and when to use it. Compare the same model and harness with and without the specification phase, using paired bugs and multiple runs. Detection uses McNemar's test; coverage uses Wilcoxon signed-rank; confidence intervals use 10,000 bug-level bootstrap resamples (Section 4.4.1, p. 5). Qualitative quality uses a stronger Gemini 3.1 Pro judge, randomized and anonymized test-suite order, five votes per comparison, and majority aggregation (Section 4.4.2, p. 5).

How to do it. (1) Hold model, tools, source, and run count constant. (2) Sample five suites per bug. (3) Record pass, coverage, and fail-to-pass detection. (4) Bootstrap bug-level estimates with denominators explicit. (5) Use paired tests for statistical significance. (6) Judge best practices, readability, edge-case coverage and overall quality separately. The spec-driven suite is preferred over the baseline in 77.8% of evaluated cases, has 83.3% edge-case preference, and is preferred over human suites in 56.7% (Section 5.2.1, p. 7); these are LLM-judge outcomes, not formal proof.

Verus form. Inference: report Verus proof pass rates, solver time, repair attempts, and trusted assumptions with paired buggy/fixed Rust cases. Keep proof success separate from test coverage and human/LLM quality judgments.

Evidence and limits. The judge's self-agreement is at least 90% with tie rate at most 5.6%, but construct validity remains limited by model-based judgment. The study's absolute rates are tied to Gemini and Google's engineering style (Section 6, p. 8).

## what VL should reuse and product threat

Already done: contract-first agent prompting, pre/post/invariant extraction, coverage of untested conditions, fail-to-pass evaluation, defect-driven contract metrics, paired statistical analysis, and cost accounting. VL should not claim these as novel. Inference: a Rust/Verus contribution can add machine-checked contracts, ownership/concurrency invariants, and trusted-boundary reports.

The product threat is moderate. Semi-formal contracts improved detection by 9.8 points at five attempts, but consumed 38% more tokens and still missed many contracts and tests. Natural-language contract extraction can hallucinate intent, and the paper's judge uses information from the human fix. Verus can reject invalid proof obligations, yet a wrong or incomplete `requires`/`ensures` can still verify the wrong behavior. Inference: VL should expose the contract as a reviewable artifact and test that it excludes seeded regressions before claiming assurance.

## techniques for the catalog

- contract-first agent workflow — extract structured descriptions, preconditions, postconditions, and suggestions before test synthesis
- Tested/Untested condition mapping — cross-reference each contract clause with existing tests and generate targeted gaps
- oracle-driven fail-to-pass testing — generate suites from untested clauses, validate on fixed code, then reverse-patch historical bugs
- greenfield evaluation — remove tests and hide the fix to measure code understanding rather than test copying
- ContractCoverage metric — score whether a generated contract captures the exact defect behavior and separate spec failure from test failure
- paired multi-run evaluation — compare identical agents with and without contracts using explicit denominators, bootstraps, and paired tests
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
