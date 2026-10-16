# An LLM Agentic Approach for Legal-Critical Software: A Case Study for Tax Prep Software
(authored by agents unless marked 🧑)
Tag: `gogani2025legal`, [paper](https://doi.org/10.1145/3744916.3764575)

## result and setting

This paper presents Synedrion, a multi-agent pipeline for translating U.S. federal tax law into executable tax software and testing it when an absolute expected output is unavailable. It uses a TaxExpertAgent, two CoderAgents, a SeniorCoderAgent, and a MetamorphicTestingAgent. The technical contribution most relevant to formal verification is higher-order metamorphic testing (HMT): tests compare several related inputs and compare rates of change, so a systematically wrong implementation can fail even when pairwise monotonicity passes. The paper states: “Metamorphic testing addresses the oracle problem—where the correct output is unknown—by ensuring relative correctness between input pairs.” (Introduction, p. 2). It extends this to n-ary relations inferred by an LLM from legal documents, examples, and heuristics.

The paper evaluates six Tax Year 2021 scenarios: brackets/deductions; EITC; child and dependent credits; American Opportunity Tax Credit; itemized deductions; and 1099-R distributions and penalties. It reports Partial Pass@1, Partial Pass@10, and Worst@10, where partial pass is the average proportion of successful test cases and Worst@10 is the lowest successful-test percentage among ten generations. The result is empirical, not a proof of tax-law compliance. “Our findings indicate that Synedrion, when employing smaller language models (e.g., GPT-4o-mini), can outperform frontier models (e.g., GPT-4o and Claude-3.5) in complex tax code generation tasks, achieving a worst-case pass rate of 45% compared with 9%–15%.” (Abstract, p. 1).

## tax-rule specification and code-generation pipeline

The TaxExpertAgent parses legal text into schema-validated JSON. The JSON contains filing-status bracket arrays, thresholds, rates, deductions, calculations, edge cases, and required function descriptions. If schema validation fails, the agent regenerates. CoderAgents receive the JSON function description rather than free-form legal text. One CoderAgent writes an implementation; the SeniorCoderAgent checks it against the specification; a second CoderAgent revises it when feedback identifies a defect. The workflow is: (1) parse the statute; (2) validate required keys and types; (3) produce a structured function specification; (4) generate an implementation; (5) review it against the specification; (6) revise; (7) run symbolic and metamorphic tests; (8) feed counterexamples back for repair.

The paper’s example schema constrains `income` to nonnegative numbers, `status` to an allowed filing-status set, and `tax_due` to a rounded output. It instructs code to apply bracket formulas through JSON keys instead of hardcoded constants. This is a specification boundary, not a legal proof: the JSON may omit a statutory condition or encode an incorrect interpretation.

Inference: for Verus, represent the JSON-derived contract as Rust types plus `spec fn` predicates for domain, bracket ordering, rates, deductions, and rounding. Put `requires` on generated functions for input constraints and `ensures` for tax equations. Use loop `invariant`s for bracket accumulation. Treat the LLM-generated JSON and legal interpretation as untrusted input until a human or independently checked parser validates them. Verus can prove the implementation against the supplied contract, not that the contract completely captures tax law.

## ordinary metamorphic testing

A metamorphic relation states how outputs should change under a controlled input transformation. The baseline relation compares two similar taxpayer profiles. If `x ≡_L x'` means they agree on every label outside the changed-label set L, then a relation can assert that making a taxpayer blind lowers or leaves unchanged liability. Pairwise testing is useful when legal text gives a directional property but no absolute oracle. The paper notes that a flat-rate bug can satisfy monotonicity, so pairwise checks alone miss systematic rate errors.

The agent generates counterexamples by increasing income, changing deductions, or changing other legal inputs and checking expected directional relations. A violation is a concrete input/output pair sent to the SeniorCoderAgent, which repairs the relevant function. The evaluation reports a 4-ary MT improvement in Scenario 6: GPT-4o-mini Worst@10 rises from 45% without MT to 55%; GPT-4o rises from 72% to 83%. The denominator is ten generated programs per scenario/model cell, and the metric is the lowest partial pass among those ten (Section 4.3.3, p. 8).

Inference: in Verus, encode a metamorphic relation as a pure predicate over two input/output states and prove it as a theorem about a function. A test-only relation remains bounded empirical evidence: it can find violations but cannot prove the relation for all inputs unless the predicate is quantified in a function contract and the implementation verifies against it.

## higher-order metamorphic relations

HMT generalizes pairwise tests to n input pairs `(x_i,y_i)` that share all labels outside L. The method uses three categories: proportional increase, threshold jump, and saturation. It asks the MetamorphicAgent to infer test tuples from tax rules and return structured JSON with inputs and a reason. The paper’s progressive-tax example uses a 4-ary monotonicity relation and an 8-ary rate-of-change relation. For incomes around a 12% to 22% threshold, compute `R1=(F(x1)-F(xb))/(x1-xb)` and `R2=(F(x2)-F(xb))/(x2-xb)`; a progressive implementation should satisfy `R2>R1`. A flat 12% implementation yields approximately equal rates and fails to represent the statutory jump (Section 2, pp. 2–3; worked example, p. 5).

To apply HMT: (1) identify a legal threshold from the statute; (2) choose a base value just below it, a first value near the boundary, and a second value above it; (3) ensure increments are large enough to expose a rate change; (4) run the generated tuple through the candidate; (5) compute the relation’s output differences or rates; (6) emit a discrepancy with inputs, outputs, relation category, and reason; (7) repair and rerun. The paper’s Figure 3 prompt asks for at least four threshold-jump tuples and a valid JSON list. Manual review checked a subset of generated tuples for sensible threshold placement.

The HMT result is strongest on robustness. In Scenario 6, GPT-4o-mini Worst@10 rises from 55% with 4-ary MT to 69% with HMT, and GPT-4o rises from 72% with MT to 88% with HMT. GPT-4o-mini Partial Pass@10 rises from 68% with MT to 75% with HMT. These are one-run framework results; the paper explicitly says its results reflect one run from initial JSON through refinement (Section 3.3, p. 5). It also reports cost: in the complex Scenario 6, basic code generation uses 111,081 tokens while HMT uses 450,134 tokens (Figure 4, p. 8).

Inference: this is directly expressible as Verus arithmetic. Define a tax function `F`, a threshold relation, and `ensures` clauses for rate ordering or saturation. A proof of `R2>R1` for all permitted values is stronger than generated tuples. HMT remains valuable as counterexample generation for contracts that are not yet formalized. Do not present LLM-inferred relations as sound until their legal premises and quantifier domains are reviewed.

## symbolic execution and the reference oracle

The paper generates test inputs with symbolic execution over a hand-authored reference implementation. Symbolic execution explores path conditions, collects boundary cases, and produces expected outputs from ten reference functions covering brackets, deductions, EITC, CTC/ODC, AOTC tiers and cap, itemized deductions, and 1099-R logic. Candidate code is run on those cases and compared with the reference output. The authors stress-test bracket knees, phase-in/out breakpoints, cap and saturation regions, and spot-check overlapping behavior against open-source tax tools (Section 4.2.1–4.2.2, p. 6).

The reference is not formally guaranteed. The paper says: “Our evaluation significantly depends on the correctness of ground-truth tax software.” (Discussion, p. 9). It also acknowledges that reference implementations may contain logical bugs despite boundary stress testing and cross-reference. Thus symbolic execution improves coverage while inheriting the reference oracle’s assumptions.

Inference: a Verus version would specify the reference semantics and prove the candidate implementation equivalent for the modeled domain, using `ensures` and proof functions. Symbolic execution itself is an external test generator; its path coverage does not prove unvisited paths. The reference implementation, legal interpretation, rounding, and external tax-year assumptions remain trusted unless separately verified.

## counterexample-guided refinement

Metamorphic failures drive a concrete repair loop. The MetamorphicAgent reports triggering inputs, observed outputs, expected relationship, and implicated functions. The SeniorCoderAgent supplies that counterexample to a CoderAgent, which edits the relevant function; the revised implementation is then retested. The loop is particularly useful for boundary and systematic errors that ordinary examples omit. The agent’s three HMT categories target proportional changes, threshold jumps, and saturation; a discrepancy can therefore identify whether the defect is a slope, breakpoint, or cap error.

Inference: for Verus, convert each counterexample into a regression lemma or a strengthened precondition/postcondition, then re-run verification. A failed test is evidence that the current implementation or contract is wrong; it is not itself a proof of the desired universal property. Keep the failing input in a verified regression suite after the repair.

## experimental comparison and limitations

The baselines are zero-shot and step-wise chain-of-thought prompts on five models. The agentic framework uses GPT-4o-mini, GPT-4o, and Claude-3.5-Sonnet. With all three agents plus TaxExpertAgent, Table 3 reports Scenario 6 Partial Pass@1/10/Worst@10 of 78/62/45% for GPT-4o-mini, 89/83/72% for GPT-4o, and 93/85/78% for Claude-3.5. With HMT, Table 4 reports Scenario 6 75% Partial Pass@10 and 69% Worst@10 for GPT-4o-mini; GPT-4o reaches 93% Partial Pass@10 and 88% Worst@10; Claude-3.5 reaches 95% and 93%. These denominators are ten generated programs for each PP@10/Worst@10 cell and one best generation for PP@1.

The paper identifies important limits: HMT covers only three relation categories, does not guarantee all edge cases, incurs large token cost, and relies on an imperfect reference oracle. A single run limits confidence in the exact percentages. The method also targets U.S. Tax Year 2021; legal updates require regenerating and reviewing the structured specification.

## what is proved, measured, and trusted

The paper defines metamorphic relations mathematically and measures generated-code partial pass rates, but it does not prove tax-law compliance. Measured evidence includes six scenarios, ten-generation partial-pass metrics, ablations removing agents, symbolic-execution test generation, and MT/HMT comparisons. Trusted elements include legal interpretation by TaxExpertAgent, the JSON schema, the hand-authored reference functions, Z3 symbolic execution, tax-year assumptions, model outputs, and the mapping from a metamorphic relation to a statutory requirement.

Inference: the threat to an agent-written verified-Rust product is high at specification boundaries. HMT can expose systematic bugs and produce regression inputs, but a relation inferred by an LLM may be incomplete or legally wrong. VL should use HMT as an evidence generator around a reviewed Verus contract, then require compilation and proof of the implementation. The paper’s result that HMT raises worst-case scores does not show that its remaining 7–12% failures are harmless; legal-critical deployment needs a complete trusted-specification argument.

Inference: what VL should not redo is the basic observation that pairwise metamorphic tests can miss flat-rate or systematic errors, and that higher-order rate comparisons can expose them. A useful VL extension would be to formalize a small relation library in Verus, prove each relation’s soundness for a defined domain, and use LLM agents only to propose candidate tuples and repairs.

## techniques for the catalog

- schema-constrained specification extraction — parse legal text into typed JSON, regenerate on schema failure, and use the validated structure as the code contract
- multi-agent contract-to-code review — separate legal interpretation, implementation, senior review, and revision into explicit agents
- pairwise metamorphic testing — compare related cases when absolute expected outputs are unavailable and flag directional violations
- higher-order metamorphic testing — compare rates or saturation across n related cases to detect systematic errors that pairwise checks miss
- threshold-jump test generation — choose values around statutory boundaries and require the observed slope to change as the law specifies
- symbolic-execution oracle generation — explore a reference implementation to produce boundary tests and expected outputs
- counterexample-guided refinement — send metamorphic discrepancies with inputs and outputs back to the coder for targeted repair
- reference-oracle stress testing — test knees, breakpoints, caps, and saturation and cross-reference overlapping behavior before using a reference as ground truth
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
