# Leveraging Test Driven Development with Large Language Models for Reliable and Verifiable Spreadsheet Code Generation: A Research Framework
(authored by agents unless marked 🧑)
Tag: `thorne2025leveraging`, [paper](http://arxiv.org/abs/2510.15585v2) (link from the fetch record; the paper text itself gives no arXiv or DOI link, only the EuSpRIG 2025 proceedings footer)

## what the paper establishes

This is a position paper and proposed experiment, not a completed evaluation. Its central claim is that writing tests before asking an LLM for implementation supplies both a technical constraint and a cognitive scaffold. The authors state: “We hypothesise that a "test first" methodology provides both technical constraints and cognitive scaffolding, guiding LLM outputs towards more accurate, verifiable, and comprehensible solutions.” (Abstract, PDF p. 1) No outcome numbers are reported; all expected improvements remain hypotheses (H1–H4, Section 1.1, PDF pp. 2–3: computational thinking, code comprehension and error diagnosis, confidence/control/engagement, and prompting behaviour). The abstract and introduction say the framework applies to Python and Rust, but no Rust example or experiment appears anywhere in the paper; the tasks are Python and Excel only.

## technique: test-first LLM generation

Use this when generated code or formulas must expose intended behavior before implementation, especially when edge cases and omissions matter. The paper's procedure is:

1. Write concrete test cases with inputs and expected outputs before implementation (Sections 2.4 and 3.5.2, PDF pp. 5, 8).
2. In the TDD condition, follow “Red (failing test) → Green (implement feature) → Refactor” (Section 3.5.2, PDF p. 8).
3. Ask GPT to generate code, debug failed tests, and suggest additional tests (Section 3.5.2, PDF p. 8).
4. Implement only enough behavior to pass the tests, then refactor for clarity or efficiency (Section 3.5.2, PDF p. 8).
5. Preserve the complete prompt and response log for later analysis (Section 3.2, PDF p. 6).

The examples make the method concrete. For compound interest, the tests include principal 1,000, rate 5, years 2, expected 1,102.50, and zero principal expected “Invalid input”; the supplied Python checks negative inputs and rounds the result, while the Excel formula mirrors those branches (Section 4.1, PDF p. 10). The supplied code rejects only negative values, so it returns 0 for principal 0 and does not satisfy that test (TC4); the paper does not mention this. The other examples cover overdue dates, stock thresholds, and tiered discounts, each with boundary cases (Sections 4.2–4.4, PDF pp. 10–12).

Inference (Verus form): represent each behavior as a `requires`/`ensures` contract on a Rust function and use `assert` or `proof fn` lemmas for arithmetic facts. A boundary test can remain an executable Rust test, while the universal property belongs in the contract. The paper's Red/Green/Refactor interaction and spreadsheet formulas do not carry over as Verus syntax; the invariant is checked symbolically rather than only by selected examples.

Evidence in this paper is illustrative only: “All examples have been passed through ChatGPT4o, the prompt used simply contains the TDD cases and the instruction to generate both Python and Excel code.” (Section 4.0, PDF p. 9) There is no denominator beyond these four examples, no baseline comparison, and no formal checker. The paper also says spreadsheet work lacks testing and that omission errors are common (Section 5.0 Discussion, PDF p. 12), but that is motivation, not a measurement from this study.

## technique: controlled TDD versus LLM-only study

Use this to measure whether the workflow changes correctness, comprehension, or user behavior. The planned design assigns approximately 40–50 second-year students to two conditions (Section 3.3, PDF p. 6): GPT-only users may write tests but are not required to; TDD+GPT users must write tests first and implement to pass them (Section 3.2, PDF p. 6). Both groups use ChatGPT 4 through its web interface, Python in Jupyter or an IDE, and no Copilot (Section 3.4.1, PDF p. 7). Assignment is stratified by baseline programming, TDD, and GPT familiarity, despite the wording “randomly assigned” in Section 3.2 and “randomly allocated” in Section 3.5.2 (PDF pp. 6, 8) versus the stratification stated in Section 3.5.1 (p. 7); this is an internal design inconsistency to resolve before replication.

The planned workflow is a 15–20 minute pre-test (vowel counting, Python questions, explicit test writing, and GPT-assisted averaging), a 90-minute task-management implementation, and a 10–15 minute post-test with comprehension, debugging, confidence, and a priority-sorting modification (Section 3.5, PDF pp. 7–8). Analysis combines paired and between-group t-tests or non-parametric alternatives, prompt-quality scoring, thematic coding of logs, and triangulation of code, logs, and surveys (Section 3.6, PDF p. 9).

Inference (Verus form): replace the Python task with a fixed Rust/Verus benchmark, freeze contracts and test inputs before prompting, and compare only proof-checked outputs. Score contract validity, proof completion, executable tests, repair attempts, and prompt logs. Stratification and pre/post design transfer; t-tests and Likert surveys remain empirical analysis rather than verification.

The paper reports no participants, completed runs, success fractions, or statistical results because “the experiment itself has not yet been conducted” (Section 3.7, PDF p. 9). Thus no evidence supports a product-level reliability gain yet.

## technique: concrete boundary-case catalogs

Use tables of normal, boundary, and invalid inputs to force the generator to confront branch conditions. The discount example has eight cases, including 499.99/474.99, exactly 500/450, exactly 1,000/850, zero, and an inconsistent row pairing order total 100.00 with “Invalid input” (Table 4, PDF p. 11; the code is on p. 12). The last row contradicts both the function, which treats 100 as valid, and row TC2 of the same table, which gives 100.00 a final price of 95.00; the paper does not discuss or repair this inconsistency.

Inference (Verus form): encode a table's valid rows as executable tests and universal ranges as `requires`/`ensures`; encode invalid rows only when the contract explicitly defines rejection. Do not weaken a contract to make a contradictory fixture pass.

## what is proved, measured, and trusted

Nothing is formally proved. The proposed measurements are code quality, feature completeness, debugging and modification accuracy, confidence/control/usefulness ratings, and prompt quality (Section 3.6, PDF p. 9). The trusted parts are GPT output, human-written tests, the Python/Excel runtimes, survey instruments, and the proposed analysis.

## techniques for the catalog

- test-first prompting — write expected cases first, then use an LLM in a Red–Green–Refactor loop and retain the interaction log
- boundary-case catalogs — enumerate normal, edge, and invalid inputs before generation and inspect contradictory rows
- controlled TDD comparison — compare mandatory TDD+LLM with optional-testing LLM-only users using pre/post code, logs, and surveys
- verification transfer — map cases to Verus contracts, executable tests, and proof lemmas, marking the mapping as an inference
