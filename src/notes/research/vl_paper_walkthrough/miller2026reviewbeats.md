# Review Beats Planning: Dual-Model Interaction Patterns for Code Synthesis
(authored by agents unless marked 🧑)
Tag: `miller2026reviewbeats`, [paper](https://arxiv.org/abs/2603.03406)

## scope and evidence

This paper evaluates how two different language models should interact when generating code. The code specialist is Qwen2.5-Coder-14B-Instruct, the reasoning generalist is Qwen3-32B; both are AWQ 4-bit models served on separate A10G GPUs with greedy decoding (temperature 0). HumanEval+ has 164 problems with rich signatures, docstrings, types, and doctest examples; MBPP+ has 378 problems with lean descriptions and a single assertion. The paper’s abstract reports: “When the code specialist generates freely and the reasoning model reviews instead of plans, the same two models on the same hardware achieve 90.2% pass@1.” All percentages below are pass@1 over the stated benchmark problem count, unless a table reports a separate comparison.

On HumanEval+’s 164 problems, the raw coder scores 78.0%, plan-then-code 75.6%, review-then-fix without retry 87.8%, review-then-fix with retry 90.2%, and adversarial debate 86.6% (Table 2). The paper says plan-then-code introduced errors in 15 of 164 problems; it produced 15 regressions and 14 improvements relative to the raw coder. On MBPP+’s 378 problems, review-then-fix is 69.8% versus a 67.5% raw-coder baseline, a +2.3 percentage-point change. Rich HumanEval+ specifications therefore show a +9.8 point gain, roughly four times the +2.3 point MBPP+ gain; the paper calls this a moderating effect of specification richness.

## technique 1: review-then-fix pipeline

What it is. Let the code specialist write an unconstrained first solution, then use the reasoning model to identify concrete defects, and let the specialist apply the corrections. Section 3.2 gives the complete procedure: “1. Coder generates a solution (identical prompt to raw baseline) 2. Planner reviews the solution against the specification 3. If bugs found, coder receives the review and fixes (single pass).” The review message should be an actionable report such as “line X does Y, but should do Z,” rather than an abstract algorithm plan.

When to use it. Use this when one model is better at code production and another at diagnosis. The method is especially useful when the specification gives executable examples, types, and edge cases that a reviewer can check. The paper reports that a no-retry review uses 2–3 LLM calls per problem: generation, review, and an optional fix.

How to apply it.

1. Give the exact function signature and specification to the code specialist and save its output (paper §3.2)
2. Give the generated code and the same specification to the reasoning model for bug review (§3.2)
3. If the review reports a defect, pass the specific report to the code specialist for one fix pass (§3.2)
4. Extract the function body and normalize fences, repeated signatures, indentation, and trailing text (§2.3)
5. Compile and evaluate the resulting code; the paper’s main no-retry comparison uses no execution feedback (§3.2)

Verus form. Inference: have one model generate Rust with Verus specifications, then pass the source and its `requires`/`ensures` contracts to a second model for review. The review should point to a concrete contract mismatch, missing invariant, or verifier diagnostic; the generator then edits the source and reruns Verus. A successful Verus check, rather than the reviewer’s prose, is the acceptance criterion. This adapts the interaction direction to verified Rust; the experiments target Python synthesis.

Evidence and failure boundary. HumanEval+ pass@1 improves from 78.0% to 87.8% without retry and 90.2% with retry, over 164 problems. The comparison is not evidence of correctness for arbitrary multi-file systems: the authors state that HumanEval+ tests single-function problems. Review-then-fix also costs 2–7 calls when retries are enabled, versus one call for single-shot generation.

## technique 2: compiler/test feedback as a separate retry layer

What it is. Add an evaluation loop only after the review/fix pass. The output is compiled, run against docstring examples visible in the prompt, and the error is returned for up to three corrections. Section 2.3 says: “On failure, the error message is fed back for correction (up to 3 retries).” The authors explicitly avoid hidden EvalPlus tests during retries, so this is not test leakage.

How to apply it. (1) run review-then-fix; (2) compile and execute the function on visible examples; (3) if it fails, send the error message to the coder; (4) repeat no more than three times; and (5) evaluate once on the benchmark’s augmented hidden tests (paper §§2.3, 3.2). The paper reports 90.2% with retry versus 87.8% without retry on HumanEval+’s 164 problems, isolating the benefit of visible feedback from review itself.

Verus form. Inference: after a review pass, run the project’s Verus verification command and feed only its diagnostic text into a bounded repair loop. Keep hidden regression tests and independent specifications outside the prompt when measuring the system. The retry loop can repair syntax or failed obligations, but it cannot establish that the contract expresses the intended system behavior; reviewers must keep the specification fixed or explicitly version changes.

## technique 3: adversarial dual-generation and selection

What it is. Generate two independent candidate solutions, cross-validate them, and use review/synthesis only when agreement is insufficient. Section 3.3 specifies: “1. Both models generate solutions independently (in parallel) 2. Cross-validate both against docstring tests 3. If exactly one passes, use it; if both pass, adversarial review selects the better one 4. If neither passes, the planner reviews both; the coder synthesizes a third solution informed by both failures and their reviews.” This removes the planner’s opportunity to contaminate the coder before it has attempted its own solution.

When to use it. Use it when independent candidates are cheap and a test or verifier can select between them. The reported HumanEval+ result is 86.6% pass@1 over 164 problems, below review-then-fix with retry but above the raw coder.

Verus form. Inference: generate two Rust/Verus candidates independently, run Verus on both, and select a candidate only when its contract and verification pass. If both pass, a reviewer can compare clarity or proof cost; if neither passes, synthesize from diagnostics. Passing Verus does not show that two candidates implement the same intended behavior unless their contracts and tests are strong enough.

## technique 4: specification richness as a design variable

What it is. Measure review under specifications with different amounts of explicit information instead of treating a benchmark score as model-only. HumanEval+ includes signatures, detailed docstrings, annotations, and doctests; MBPP+ usually has one sentence and one assertion. The same no-retry review gains +9.8 points on HumanEval+ (78.0% to 87.8%, denominator 164) but only +2.3 points on MBPP+ (67.5% to 69.8%, denominator 378). The paper attributes the gap to the reviewer’s ability to assess correctness and reports that lean specifications increase missed bugs and false positives.

The authors test two mitigations. Spec-gated review scores 84.1% on HumanEval+ and 69.0% on MBPP+, while unconditional review scores 87.8% and 69.8%; gating is therefore worse on both stated benchmarks. Spec-enriched review scores 88.4% on HumanEval+ and 69.8% on MBPP+, adding only 0.6 points and 0 points respectively, at one extra call per problem. The paper concludes that generated enrichment does not substitute for genuine specification detail.

Verus form. Inference: expose complete behavioral contracts, type constraints, resource assumptions, and representative boundary cases to the reviewer. Measure review on the same fixed Verus specifications at multiple richness levels. Do not let an agent silently weaken `ensures` to make verification pass; any changed contract is a separate artifact requiring review.

## what is proved, trusted, and already done

The paper’s evidence is empirical pass@1 measurement with deterministic greedy decoding, extraction and compilation checks, visible test retries, and benchmark hidden tests. It does not establish that the reviewer’s diagnosis is sound, that richer generated specifications are correct, or that the Qwen pair generalizes to other models. It explicitly limits the scope to single-function benchmarks and says the results are model-specific.

## techniques for the catalog

- review-then-fix — generate code freely, review it against the specification, and feed concrete bug reports back for one fix pass
- verifier/test feedback loop — compile and test visible examples, then perform bounded repairs from diagnostics
- adversarial dual-generation — generate independent candidates, select passing outputs, and synthesize after both fail
- specification-richness measurement — compare review gains across explicit and lean contracts with fixed denominators
