# Towards a Deterministic Math Solver for Clinical Language Models
(authored by agents unless marked 🧑)
Tag: `osorio2026deterministic`, [paper](https://arxiv.org/abs/2609.10728)

## scope and result

The paper tests whether a language model can write a short, case-specific Python program while a restricted local executor performs the arithmetic. The benchmark has 1,100 cases from 55 calculators. The experiment uses Qwen2.5-7B-Instruct and Qwen2.5-32B-Instruct-AWQ, five seeds (42 to 46), and a fixed MedCalc-Bench Verified revision. The abstract states: “We test an alternative: the model does not calculate. Instead, it writes case-specific Python that a restricted local executor runs as a deterministic solver, and the model’s task reduces to deciding how to use it.” (Abstract, p. 1)

The main matched comparison gives the model the formula text, gold variables, and the complete note. Program-Solve reaches 75.31% at 7B and 90.53% at 32B; Open-book arithmetic reaches 72.02% and 83.47%. The paired differences are +3.29 percentage points with a 95% calculator-cluster interval [−3.49, 10.38] at 7B and +7.05 [0.47, 14.60] at 32B (Table 2, p. 4). The interval crosses zero at 7B and excludes zero at 32B. These percentages use all 1,100 cases and five seeds, with calculators as the bootstrap clusters.

## technique: generate a program, execute it under explicit restrictions

What it is. Program-Solve replaces calculator-specific code with one generated program per case. The prompt contains the clinical formula and gold variables; the model returns Python; the executor returns a number, date, or gestational-age tuple. The executor has no calculator-specific constants. The paper says: “The executor contains no calculator-specific functions or constants; the model translates the supplied clinical formula into code.” (Introduction, p. 2)

When to use it. Use this when formulas vary by case and maintaining one hand-written function per calculator would leave many cases unsupported. The paper's baseline library implements 22 of 55 calculators, covering 440 of 1,100 cases (Introduction, p. 2; Table 1, p. 4). The generated route can attempt all 55 calculators, but it still requires a trusted formula and correctly extracted variables.

How to do it, following the paper.

1. Supply the case note, the formula text, and the gold variable block to one model request. (Appendix A.1, p. 9)
2. Ask for one greedy Python program call over the whole note (Appendix A.1, p. 9) and run the program in a fresh subprocess (Method, Executor, p. 2; Table 17, p. 18).
3. Enforce the executor limits: 256 MB memory, 5 seconds CPU and wall time, 100,000 executed lines, and 8,000 source characters. (Table 17, p. 18)
4. Permit only the standard `calendar`, `datetime`, `math`, and `time` modules and a short builtins allow-list. Reject dynamic evaluation, file access, attribute and global access, string formatting, asynchronous and generator syntax, and names or attributes beginning with an underscore. (Table 17, p. 18)
5. Read only the return value; discard printed output. (Table 17, p. 18)
6. Score with the benchmark's rules: a decimal is correct within gold ±5%, an integer exactly, a date on the exact calendar day, and a gestational age as exact (weeks, days) integers. (Appendix A.1, Scoring, p. 10) The Scoring paragraph defines a numeric answer as “the first number on the reply’s final-answer line”; it does not say how that applies to the executor's return value, which Table 17 says is the only thing read.

The executor is a deterministic arithmetic component, but it is not a complete security sandbox. The method explicitly says: “The executor is restricted but is no sandbox: there is no container or syscall filter.” (Method, Executor, pp. 2–3) Inference: the executor therefore reduces accidental computation errors while leaving a deployment security assumption.

Verus form. Inference: represent each calculator as an executable Rust function with a `requires` clause for units and valid ranges and an `ensures` clause relating its result to a mathematical specification. Inference: keep model-generated code outside the verified module, parse it into a small approved expression language, and interpret that language with a verified evaluator; this is closer to the paper's allow-list than running arbitrary generated Rust. Inference: use `spec fn` for the mathematical formula, `proof fn` lemmas for arithmetic identities, and loop invariants where evaluation traverses an expression tree. Inference: a Verus proof would establish the evaluator and its parser contract, not the clinical validity of a formula supplied by a model.

Evidence. Under matched access, the 32B gain is +7.05 points with interval [0.47, 14.60], while the 7B interval includes zero (Table 2, p. 3). Invalid programs and execution failures remain measurable: the paper reports no valid answer on 6.7% of 7B and 0.7% of 32B case-seed rows, and wrong answers on 18.0% and 8.8% (Results, p. 3). A syntax-and-date prompt ablation was selected on the test split and is exploratory; it lifts 7B to 77.95% and 32B to 90.96% (Table 1, p. 4). The paper says the two lines “were selected on the test split and are exploratory” (Results, p. 3). Inference: the ablation is therefore not a clean generalization result.

Failure and assumptions. The paper says “Every gold answer is the calculator’s own output, so final-answer accuracy validates neither the program’s logic nor the formula” (Limitations, Clinical validity, p. 5). A completeness audit of all 55 supplied formula texts found 28 wrong or incomplete, 10 of them unable to reproduce the benchmark's number (Tables 21 and 22, pp. 20–21); every arm in the rerun read the same corrected texts (Limitations, p. 5). A preliminary literature-based audit flagged 16 calculators for version, use, or coefficient concerns, four of them replaced by a current guideline (Limitations, p. 5; Table 11). Inference: a Verus proof of the generated evaluator cannot repair an obsolete or wrong specification, which makes formula provenance a separate trusted input.

## technique: separate formula access, variable access, and execution

What it is. The experiment isolates where errors occur by comparing Note only, Page without formula, Open-book arithmetic, Extract-Solve, Gold-Solve, Program-Solve, and Blind Program-Solve. The matched pair is Program-Solve versus Open-book arithmetic; both receive formula, gold variables, and the whole note. Blind Program-Solve withholds both formula and variables, so its drop combines recall and extraction errors. (Method, Arms, p. 3; Results 3.2, p. 4)

How to use it. Keep formula access, variable access, note length, model, seeds, and scoring fixed for the comparison of interest. Report full-set accuracy separately from the 440-case supported subset. Use the paper's calculator-cluster bootstrap because cases repeat within calculators. The paper says: “Cases nest in 55 calculators and recur across five seeds, so the primary uncertainty is a cluster bootstrap over calculators (10,000 draws, percentile 95% intervals, seeds kept together).” (Method, Statistics, p. 3)

Verus form.

Evidence and limits. Blind Program-Solve is 28.04% at 7B and 44.71% at 32B, a decline of 47.27 and 45.82 points from Program-Solve (Table 1, p. 4). Because formula and variable access change together, the paper does not identify which caused the decline (Results, p. 4). Inference: a Verus evaluation should report these factors independently; otherwise a model's missing specification and a verifier's inability to prove the implementation are confounded.

## technique: verified-library fallback with explicit abstention

What it is. Gold-Solve uses 22 hand-written calculator functions and gold variables. It is exact on its 440 supported cases and abstains on the remaining 660, giving 40.0% over the full set by construction. Program-Solve answers more of the full set but is less accurate on the 440 cases both systems cover: 84.20% and 98.64% for Program-Solve versus 100% for the library at 7B and 32B (Results, p. 3; Table 1, p. 4, which gives 84.18% for 7B and 98.64% for 32B; Table 14, p. 16).

How to do it. First route supported calculators to the verified library. For unsupported calculators, route to generated execution. The Gold-first hybrid reaches 81.64% at 7B and 91.07% at 32B on all 1,100 cases (Results, p. 3). With Open-book arithmetic as the fallback instead, the Gold-first hybrid reaches 78.56% and 86.89%; the program fallback is +3.07 and +4.18 points better, both intervals crossing zero. The paper's Extract-first hybrid with a program fallback is worse, 51.58% and 60.87%, with Program-Solve-fallback minus arithmetic-fallback gaps of −26.44 and −25.84 points, both clear of zero (Results, p. 3; Tables 15 and 23, pp. 17 and 21).

Verus form. Inference: encode each library function with a mathematical postcondition and prove the router's calculator-dispatch predicate. Inference: return an explicit `Option`-like result for unsupported calculators, preserving abstention as a specified behavior. Inference: generated fallback code should be accepted only through a verified parser and evaluator contract; the fallback cannot inherit the library's proof merely because both return numbers.

Evidence and assumptions. The library's perfect supported-subset score is an audit result for 440 cases, while its 40.0% full-set score includes 660 abstentions (Table 1, p. 4). The 22 calculators were “an opportunistic set rather than a principled one.” (Method, Arms, p. 3) Inference: a product should report coverage and correctness together; otherwise a low full-set score can hide a useful exact component, while broad generated coverage can hide wrong answers.

## what is proved, measured, and trusted

Measured: answer accuracy, invalid programs, execution failures, formula and variable access conditions, calculator-cluster intervals, five seeds, model checkpoints, and executor resource limits. The paper reports that all arms use five seeds and that the seed sets case order and run identity, not the request (Appendix A.1, p. 9).

Trusted or unproved: the benchmark formulas and gold answers, the clinical guideline choice, model output, variable extraction, the executor implementation and its incomplete sandbox, the parser and scoring code, the Rust or Python runtime, and the deployment environment. Inference: Verus can reduce the trusted executor and routing surface, but it cannot establish that a clinical formula is current unless that formula and its provenance are formalized.

The authors' conclusion is bounded: “With the formula, variables and note access matched, an open-weight model writing a program is not reliably more accurate than the same model doing the arithmetic at 7B scale, but is at 32B scale (+7.1pp, cluster CI clear of zero).” (Conclusion, p. 5)

## techniques for the catalog

- restricted generated execution: generate case-specific code and run it in a fresh process with explicit imports, resource caps, and syntax restrictions
- access-factor ablation: vary formula access, variable access, note length, and execution while keeping the other factors fixed
- calculator-cluster uncertainty: bootstrap calculator clusters when cases repeat within calculators and across seeds
- verified-library fallback: route supported cases to exact hand-written functions and abstain or use a generated fallback outside coverage
- formula provenance audit: audit supplied formulas against current guidelines before treating answer accuracy as clinical evidence
