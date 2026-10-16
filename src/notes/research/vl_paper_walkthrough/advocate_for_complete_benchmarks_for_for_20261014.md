# Advocate for Complete Benchmarks for Formal Reasoning with Formal/Informal Statements and Formal/Informal Proofs
(authored by agents unless marked 🧑)
Tag: `yousefzadeh2025advocate`, [paper](https://arxiv.org/abs/2507.04719)

## purpose and result

Yousefzadeh and Cao present a position paper about benchmark construction and evaluation for automated theorem proving (ATP) and autoformalization. Their proposed benchmark unit contains four linked artifacts: an informal problem statement, a formal problem statement, an informal proof, and a formal proof. The paper's operational motivation is reproducibility: a formal proof demonstrates that the formal statement is provable, while both informal artifacts let researchers judge whether the formalization matches the intended problem. The authors state, “We take the position that special attention and effort should be paid to ensure that the benchmarks are complete and error-free, verified by the creators of the benchmarks.” (Sec. 1.2, p. 2)

Inference: the same four-artifact design is a useful specification for a Verus benchmark, but Verus programs need executable code, contracts, proof code, tool version, and build configuration in addition to prose.

## technique: complete, creator-verified benchmark units

What it is: release all four components together and require the benchmark creators to check their correctness before release. The authors define completeness as exactly “informal statements, formal statements, informal proofs, formal proofs.” (Sec. 3, p. 5)

How to apply it:
1. Write the natural-language requirement and a formal statement that is intended to mean the same thing. (Sec. 3, p. 5)
2. Write an informal proof explaining the reasoning steps. (Sec. 3, p. 5)
3. Write and machine-check a formal proof before publishing the item. The paper says that requiring proofs before release “ensures that all theorems are provable and correct.” (Sec. 3, p. 5)
4. Cross-check the formal and informal statements and proofs, and correct mismatches. (Sec. 3, pp. 5–7)
5. Publish code, data, proofs, and evaluation scripts so another group can reproduce the result. (Secs. 1.2, 4.1, pp. 2, 7)

Verus form: Inference: each item should include a Rust function or module, its `requires`/`ensures` contracts, proof functions and lemmas, a prose requirement, a prose argument, the exact Verus commit/toolchain, dependencies, and a command that runs verification. The Verus checker proves the supplied contract; it does not prove that the prose requirement and contract are equivalent. That equivalence therefore needs a human-reviewed mapping or a separately tested alignment artifact.

Evidence and limits: the paper reports that miniF2F errors were still being found in April 2025, including five errors attributed to Wang et al. (Sec. 1.1, p. 2), but it does not give a denominator for the full miniF2F set in this discussion. The proposed workflow detects unprovable statements only when proofs are attempted; it cannot establish that a formal statement expresses the intended informal one. The paper explicitly excludes conjecture-generation benchmarks from its completeness requirement because many generated conjectures are intentionally unprovable (Sec. 3, p. 6).

## technique: evaluate proof systems beyond one accuracy number

What it is: report proof lengths and the number of theorems solved by automatic tactics alone, alongside the usual pass rate. The authors write, “It would be crucial for the community to start reporting more information about their achievements beyond a simple accuracy metric.” (Sec. 4.1, p. 8)

How to apply it:
1. Keep the benchmark denominator and split fixed, and report the number proved and the resulting percentage. (Sec. 4.1, p. 8)
2. For every proved theorem, report formal proof length and the prover's attempt budget/settings. (Sec. 4.1, p. 8)
3. Count theorems proved by built-in automatic solvers alone (`nlinarith`, `linarith`, `omega` are the paper's examples). (Sec. 4.1, p. 8)
4. Publish per-item outcomes so readers can distinguish easy solver calls from long generated proofs. (Sec. 4.1, pp. 7–8)

Verus form: Inference: report verified-item count over the exact suite denominator; proof lines or AST nodes; verification time and solver calls; and whether each item succeeds with only baseline automation or requires explicit lemmas, triggers, and invariants. Record hardware, Verus version, Z3 version, and timeout. A Verus proof's line count is only a proxy for effort, so include repair edits and failed attempts when measuring agent performance.

Evidence: the paper gives two illustrative proof-length comparisons: IMO 1985 P6 has “more than 1,200 lines” manually while `algebra_5778` has “about 100 lines”; Kimina's generated proofs had 3 and 44 lines respectively (Sec. 2, p. 3). These are two examples, not a benchmark-wide denominator. The paper also reports a miniF2F autoformalization evaluation of 97% under an LLM-judge pipeline versus 67% on manual checking, but it does not state the item denominator in the cited passage (Sec. 4.2, p. 9). Those percentages must therefore not be generalized beyond that reported evaluation.

## technique: audit automated autoformalization evaluators

What it is: validate an automated judge against expert labels before using it to claim model accuracy. A formal proof checker can establish proof validity, but it cannot by itself establish that a generated formal statement preserves the informal meaning. The paper states, “In autoformalization, there is no automated system that can verify the correctness of a translation with high certainty.” (Sec. 4.2, p. 8)

How to apply it:
1. Build a held-out set of informal/formal pairs with expert judgments of semantic alignment. (Sec. 4.2, pp. 8–9)
2. Run the proposed evaluator on that set. (Sec. 4.2, p. 9)
3. Compare evaluator decisions with expert decisions before reporting production accuracy. (Sec. 4.2, p. 9)
4. If using back-translation, judge whether the returned informal statement preserves the original, and report false positives and false negatives. (Sec. 4.2, p. 9)
5. Prefer evaluation without giving the model a ground-truth formal translation when measuring realistic autoformalization. (Sec. 4.2, p. 9)

Verus form: Inference: use Verus compilation to check that generated proof code verifies, then use a separate contract-alignment review set to check that the Rust contract matches the natural-language requirement. A second LLM can propose an alignment label, but it should not be the sole oracle. Store the expert labels and evaluator confusion matrix with the benchmark.

Limits: multiple formal statements can correctly express one informal statement, so exact string matching to one ground truth is insufficient (Sec. 4.2, p. 8). The paper says automated equivalence methods have had “some success” but are “still far from being reliably deployed in practice.” (Sec. 4.2, p. 8)

## technique: open data, code, and ablations

What it is: release training sources, training scripts, search code, model settings, and proof data, then ablate data and method contributions. The authors argue that withholding these prevents others from identifying why accuracy changed (Sec. 4.1, pp. 7–8).

How to apply it: publish the exact train/validation/test split; identify any benchmark items used in training; release fine-tuning and proof-search code; report all hyperparameters and human involvement; rerun with each major data or method component removed. (Sec. 4.1, pp. 7–8)

Verus form: Inference: an agent-written Verus benchmark should publish prompts, generated candidates, rejected candidates, repair traces, contracts, and tool logs. Ablations should separate model generation from proof repair and solver settings. This makes “verified” measurable as a reproducible process rather than a final green check.

## what is proved, what stays trusted, and threat to VL

The paper proves no new theorem and reports no new prover experiment; it makes methodological claims and cites examples. Its recommendations trust benchmark creators, expert semantic judgments, the proof assistant, and accurate reporting of denominators. A green formal proof proves the formal statement accepted by the checker, while alignment with the informal requirement, model training data, search implementation, and engineering reproducibility remain outside that proof.

Inference: for VeruLaw, the largest threat is evaluation overclaim: an agent can produce a valid Verus proof for a weakened or mismatched contract, and a single pass percentage can hide proof length, solver dependence, or benchmark leakage. The paper's complete-item and audit practices directly reduce that threat. VL should reuse the four-artifact record, per-item logs, denominator discipline, and evaluator validation. It should not redo the paper's broad debate about whether proofs should be public; it should implement an open, versioned benchmark and measure the resulting reproducibility.

## techniques for the catalog

- complete benchmark unit: release informal/formal statements and informal/formal proofs together, creator-verified
- cross-artifact alignment: check that formal and informal statements and proofs describe the same task
- proof-effort reporting: publish proof lengths, automatic-solver-only counts, settings, and per-item outcomes
- evaluator audit: validate automated autoformalization judges against expert labels before deployment
- open reproducibility: release code, data, search procedures, training sources, and ablations
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
