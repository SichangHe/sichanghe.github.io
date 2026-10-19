# An LLM Agentic Approach for Legal-Critical Software: A Case Study for Tax Prep Software
(authored by agents unless marked 🧑)
Tag: `gogani2026legal`, [paper](https://doi.org/10.1145/3744916.3764575)

## result and setting

Synedrion translates U.S. federal tax rules into Python through a TaxExpertAgent, two CoderAgents, a SeniorCoderAgent, and a MetamorphicAgent. Its testing contribution is higher-order metamorphic testing (HMT), which compares rates of output change across related inputs. The motivation is that a flat-rate tax implementation can pass a pairwise check that higher income produces higher tax while missing the statutory change in marginal rates. The authors explain: “Metamorphic testing addresses the oracle problem—where the correct output is unknown—by ensuring relative correctness between input pairs.” (Section 1, p. 2).

The evaluation covers six scenarios: brackets and standard deductions; Earned Income Tax Credit (EITC); Child Tax Credit and Other Dependent Credit; American Opportunity Tax Credit (AOTC); itemized deductions; and Form 1099-R distributions and penalties (Section 4.1.1, p. 6). The reference implementation uses Tax Year 2021 rules (Section 4.2.2, p. 7). The supplied paper is the March 2026 arXiv revision and gives an ICSE 2026 citation, so the tag year is corrected to 2026.

The paper defines Partial Pass@10 as the average percentage of test cases passed across ten code generations, Partial Pass@1 as the highest percentage passed by a single generation, and Worst@10 as the lowest percentage across ten generations (Section 4.2.3, p. 7). These measure test performance. Inference: they do not establish tax-law compliance for every input.

## tax-rule specification and code-generation pipeline

The TaxExpertAgent first converts legal text into tax-rule JSON. Its predefined schema checks required fields, data types, and structure, such as filing-status arrays containing bracket thresholds and rates. Failed validation causes regeneration. After validation, the agent produces JSON function descriptions containing purposes, inputs, outputs, calculations, and edge cases (Sections 3.1.1 and 3.3, pp. 4 and 6). The authors state: “If the generated JSON fails schema validation, the agent regenerates it until compliance is achieved.” (Section 3.1.1, p. 4). Here, compliance means passing the schema check.

CoderAgents use these descriptions to generate Python functions that access tax-rule JSON keys instead of hardcoding constants. One coder produces an initial implementation. The SeniorCoderAgent evaluates it against the specification, accepts satisfactory code, or supplies feedback for a second coder to revise it. The two coders use the same base LLM with slightly different temperatures to encourage different implementations (Section 3.1.2, p. 4).

The example function description constrains `income` to a nonnegative float, restricts `status` to listed filing statuses, and gives `tax_due` a float type with rounding to two decimal places. These are requirements supplied to code generation; the paper does not show a proof that the generated function satisfies them. Schema validation checks the structure of the extracted rules, while senior review and metamorphic testing check generated implementations. Symbolic execution belongs to the separate evaluation procedure described below, rather than to the generation-and-repair sequence (Sections 3.3 and 4.2.1, pp. 6–7).

Inference: for Verus, translate reviewed rule data into Rust types and `spec fn` predicates for input domains, bracket ordering, rates, deductions, and rounding. Function `requires` and `ensures` clauses could describe the intended calculation, with loop `invariant`s for bracket accumulation. Such a proof would relate the implementation to the supplied contract; the legal interpretation would still need independent review.

## ordinary metamorphic testing

For profiles `x` and `x'`, the notation `x ≡_L x'` means that they agree on every label outside the set L. A pairwise metamorphic test changes selected fields and checks the expected relationship between outputs. The introduction gives blindness as an example: an otherwise identical blind taxpayer should have liability less than or equal to that of a non-blind taxpayer. Section 2 illustrates income monotonicity: increasing income should not decrease tax (pp. 2–3).

The framework's ordinary MT uses directional changes to generate counterexamples, such as increasing income and checking the resulting tax direction (Section 4.3.3, pp. 8–9). In Scenario 6, Table 4 reports GPT-4o-mini Worst@10 increasing from 45% without MT to 55% with MT, and GPT-4o increasing from 72% to 83% (p. 10). Each value is the lowest test-pass percentage among ten generated programs, rather than a count of programs that pass every test.

Inference: a Verus version could state a relation over two calls to the same function and prove it for a defined domain. Passing generated input pairs alone provides evidence only for the tested pairs. The relation also needs correct assumptions: a legal exception or an omitted eligibility condition can invalidate an unrestricted directional assertion.

## higher-order metamorphic relations

Section 2 extends pairwise relations to n-ary relations over related base and follow-up cases. Section 3.2 implements three categories: proportional increase checks proportional changes in output; threshold jump checks changes in rates across legal boundaries; saturation checks that further input increases leave output invariant in a saturated region (pp. 3–5). Figure 2 illustrates these using a baseline input `xb` and two modifications `x1` and `x2`.

The agent receives natural-language relation descriptions, tax rules, examples, and a required output format. It generates test inputs instead of encoding the relations directly in first-order logic. Figure 3's threshold-jump prompt asks it to identify a tax bracket boundary, place the base and first modification below the boundary and the second above it, choose a meaningful increment, and return at least four tuples in valid JSON with reasons (p. 5).

The worked example uses `(35000, 40525, 48000)` for a single filer around the $40,525 boundary between 12% and 22% marginal brackets. The first modification is at the boundary in this example, although the prompt says just below it. The test computes `R1=(F(x1)-F(xb))/(x1-xb)` and `R2=(F(x2)-F(xb))/(x2-xb)` and checks `R2>R1`. The first interval has a rate near 0.12; the second includes income taxed at 22%. A flat-rate implementation has approximately equal rates and fails this test. The authors manually reviewed a subset of generated tuples during development for logical soundness, including meaningful threshold placement (Section 3.2, pp. 5–6).

The AOTC example checks a different rate pattern: 100% credit on the first $2,000 of qualified expenses, 25% on the next $2,000, then saturation at the $2,500 cap. HMT is intended to detect an implementation that continues at the same rate after the statutory tier changes (Section 3.2, p. 5).

In Scenario 6, Table 4 reports GPT-4o-mini Worst@10 of 45%, 55%, and 69% without MT, with ordinary MT, and with HMT, respectively. Its Partial Pass@10 values are 62%, 68%, and 75%. GPT-4o Worst@10 is 72%, 83%, and 88% across the same configurations (p. 10). The study uses these table values because the prose in Section 4.3.3 incorrectly labels 72% as the GPT-4o MT score; 72% belongs to the configuration without MT.

Inference: Verus could formalize the worked threshold test, with explicit domains and nonzero denominators, and prove rate ordering or saturation from a reviewed tax function specification. The generated input tuples do not by themselves prove that every legal threshold or exception is handled.

## symbolic execution and the reference oracle

For evaluation, the authors apply symbolic execution to ground-truth tax software to collect test cases and expected results. They compare candidate outputs with those reference outputs. The implementation uses Z3 (Sections 4.2.1 and 4.2.4, p. 7). The paper states: “These generated test cases are then used to evaluate the generated code by comparing its outputs against the ground-truth software.” (Section 4.2.1, p. 7).

The hand-authored oracle comprises ten reference functions covering progressive brackets, standard deductions and age/blindness additions, EITC phases, child/dependent credit thresholds, AOTC tiers and cap, itemized deductions, and retirement distributions and penalties. The authors stress-test bracket boundaries, phase-in/out breakpoints, caps, and saturation regions. They also spot-check overlapping behavior against OpenTaxSolver and the Colorado Toolbox (Section 4.2.2, p. 7). These boundary checks validate the reference; the paper does not establish that symbolic execution itself generates every boundary case or achieves complete path coverage.

The authors acknowledge: “Due to the lack of formal guarantees, our reference implementations may contain logical bugs.” (Section 4.4, p. 10).

Inference: a Verus extension could specify reference semantics and prove candidate equivalence over the modeled domain. The correctness of legal interpretation, reference equations, rounding, and tax-year assumptions would remain separate obligations.

## counterexample-guided refinement

The MetamorphicAgent tests code received from the SeniorCoderAgent and reports violations with the triggering inputs, outputs, and implicated functions. The SeniorCoderAgent uses those counterexamples to repair the corresponding functions (Sections 3.2–3.3, pp. 4–6). Section 3.3 says: “Our results reflect the outcome of a single run of the framework—from initial JSON specifications through code generation, metamorphic testing, and refinement by the SeniorCoderAgent.” (p. 6). This describes the generation-to-refinement process; the evaluation metrics still summarize ten code generations.

Inference: a Verus workflow could keep a failing input as a regression case and use it to correct an implementation or clarify an incomplete contract. Changing a precondition merely to exclude a valid taxpayer would not repair the legal requirement. A successful repair should satisfy the reviewed contract for all permitted inputs.

## experimental comparison and limitations

Baselines use zero-shot and two-stage chain-of-thought prompting: reason about tax rules, then generate code. Five models are evaluated: GPT-4o, GPT-4o-mini, Claude 3.5-Sonnet, Llama 3.1-70B, and Llama 3.1-8B. The agentic experiments use the first three (Sections 4.1.2–4.1.3 and 4.3.2, pp. 6–8).

Without MT, Table 3 gives Scenario 6 Partial Pass@1, Partial Pass@10, and Worst@10 of 78/62/45% for GPT-4o-mini, 89/83/72% for GPT-4o, and 93/85/78% for Claude 3.5 (p. 8). GPT-4o-mini's 45% Worst@10 exceeds the GPT-4o and Claude chain-of-thought baseline values of 9% and 15% in Table 2. Those are comparisons across different configurations. With HMT, Scenario 6 Partial Pass@10/Worst@10 reaches 75/69%, 93/88%, and 95/93% for the three models respectively (Table 4, p. 10).

Table 5 compares coder-only, code-generation teams, MT, and HMT configurations (p. 11). The discussion also reports a heterogeneous team with GPT-4o as TaxExpertAgent and GPT-4o-mini as coder and senior coder: Scenario 6 Partial Pass@10 is 73%, compared with 62% for all-mini and 83% for all-GPT-4o teams without MT (Section 4.4, pp. 9–10). Inference: the grouped configurations do not independently isolate every agent's causal contribution.

HMT costs more tokens. Section 4.3.4 reports 111,081 tokens for basic Scenario 6 code generation and 450,134 with HMT (p. 9; Figure 4, p. 8). Section 4.4 limits HMT to three relation categories and disclaims coverage of all errors and edge cases (p. 10). Inference: the one-run process report and ten-generation summaries do not establish reproducibility across repeated complete experiments.

## what is proved, measured, and trusted

The paper supplies mathematical relations, generated test tuples, partial-pass measurements, and comparisons across agent configurations. It does not give a formal proof of candidate tax software. Its reference code is manually checked and stress-tested, while LLM interpretation supplies rule data and test proposals.

## techniques for the catalog

- schema-constrained specification extraction — parse legal text into tax-rule JSON, regenerate on schema failure, then produce structured function descriptions
- multi-agent specification-to-code review — use separate tax interpretation, coding, senior review, and revision roles
- pairwise metamorphic testing — compare related input/output pairs and detect directional violations without absolute expected outputs
- higher-order metamorphic testing — test proportional changes, threshold jumps, and saturation across multiple related inputs
- threshold-jump test generation — identify a legal boundary, propose tuples around it, compare baseline-relative rates, and report violations
- symbolic-execution oracle generation — generate evaluation cases from reference tax code and compare candidate outputs with reference outputs
- counterexample-guided refinement — return triggering inputs, outputs, and implicated functions to the SeniorCoderAgent for repair
- reference-oracle stress testing — check boundaries, breakpoints, caps, and saturation, then spot-check overlapping behavior against tax tools
