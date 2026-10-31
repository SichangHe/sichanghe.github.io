# miniF2F-Lean Revisited: Reviewing Limitations and Charting a Path Forward
(authored by agents unless marked 🧑)
Tag: `ospanov2025minif2f`, [paper](http://arxiv.org/abs/2511.03108v1)

## purpose and end-to-end criterion

The paper audits miniF2F as an Olympiad pipeline: read an informal problem, autoformalize it in Lean, prove the formal theorem, and receive credit only when the proof matches the original statement. It warns that compiler success and theorem-prover success are insufficient if translation changed the problem. “Such automated system would fail if it changes the original problem statement and proves an altered version of the competition problem, the same way that if a human participant proves a simplified version of a problem will likely get no, or at the most, a partial credit not sufficient for a medal.” (Introduction, p. 2) The introduction reports 34.8% combined accuracy after comparison with the original informal statements, against reported component accuracies of about 97% for autoformalization and 70.8% for Kimina Prover (Introduction, p. 3). This is not the strongest pipeline in Table 1: Kimina autoformalizer with Goedel-V2-7B reaches 49.2% on v1 test and 69.7% on v2s test in the Olympiad setting (Table 1, p. 5).

They manually inspect all 488 miniF2F theorems, correct more than 300 Lean 4 statements, and release miniF2F-v2s (simplified) and v2c (competition). “We analyze every failure mode of an end-to-end formal reasoning pipeline on the miniF2F benchmark and correct over 300 Lean 4 statements to eliminate errors and simplifications.” (Introduction, p. 3) v2s makes formal and informal statements exactly correspond while retaining supplied solutions; v2c restores original IMO and AMC competition statements, including choices and unknown answers.

Inference: For Verus, a benchmark must score the complete path from prose requirement to verified Rust contract and implementation. A passing Verus proof should not count if the contract silently weakens the requirement.

## technique: classify failure stages

The introduction distinguishes autoformalization failure, translation failure, and prover failure (Figure 1 and Introduction, pp. 2–3). First, an autoformalizer can emit code that does not compile. Second, a compiling formal statement can differ from the informal one; proving that altered goal earns no credit. Third, the prover can fail on either a faithful translation or a mistranslation. Section 3 describes selecting an output that compiles and remains faithful: “we keep the first formal output that both passes REPL verification and remains semantically faithful to the source, which is judged by human experts.” (§3, p. 6) Section 4 specifies the @128 human review more narrowly: “human evaluation is performed only on the first translation that successfully passes the Lean compiler, rather than on all 128 translations.” (§4, p. 7) Inference: These descriptions do not establish a retry procedure after a compiling translation fails human review.

Inference: Record each stage separately: compilation, semantic alignment, proof, and final correspondence.

The paper's “effective accuracy” has two variants: full score credits excessively simplified proofs, while the Olympiad setting credits only proofs aligned with the source. Table 1 uses translator sampling @128 and prover sampling @32; those settings must be reported with each rate (Table 1, p. 5).

Inference: In Verus, retain separate logs for Rust compilation, Verus verification, contract adequacy review, and executable behavior tests. A single pass/fail metric hides where an agent failed.

## technique: repair informal statements from primary sources

The authors identify incomplete statements, missing variable types, discrepancies from original competitions, unprovable tasks, wrong supplied solutions, and missing supplied solutions. They replace incomplete or altered text with the original competition statement. For multiple-choice problems, v2s removes choices and keeps the final goal; v2c keeps every choice and requires the model to choose and prove. If the informal statement omits a solution while the formal theorem contains it, v2s adds the answer to prose; v2c removes it from the formal goal and leaves a `sorry` for the prover to discover (Errors in informal statements, §2.1, p. 4).

They find 16 unprovable problems across test and validation sets: “The errors come from improper translation of the informal statement to a formal counterpart, such as missing brackets or using a wrong function from the Mathlib library.” (§2.2, p. 5) Section 2.1 also identifies missing critical hypotheses in informal statements (p. 4).

Inference: Repair should start from source text rather than a proof that happens to compile.

Inference: A Verus corpus should preserve the original requirement, explicitly label whether a result is given or must be discovered, and reject contracts whose assumptions were added only to make proving easy.

## technique: repair formal statements and restore difficulty

The audit finds excessive simplification: changed goals or conditions, omitted portions, helpful assumptions, wrong types, and replacing a function with an equivalence. It also finds undeclared functions and expressions. The authors rewrite each formal statement to match its informal counterpart exactly (Errors in formal statements, §2.2, p. 4).

They publish two versions to distinguish faithful difficulty from convenient solvability. v2s corrects errors and aligns statements while preserving solutions. v2c restores exact competition tasks, including choices and unknown answers. The authors report formal proofs for all v2 problems, including repaired unprovable items (Evaluation of theorem provers, §5, pp. 8–9).

Table 4 gives Goedel-V2 test accuracy 82.0% on v1, 74.2% on v2s, and 72.5% on v2c. DeepSeek-Prover-V2-7B instead scores 73.4%, 68.1%, and 64.4%, respectively. The denominator is the complete 244-problem test split, and all runs use @32 sampling (Table 4 and §5, p. 8; Appendix A, p. 15). The authors attribute the decline to restored difficulty: “the accuracy of every theorem prover is lower on miniF2F-v2, since many simplifications made in miniF2F were reverted back, and theorems became more challenging.” (§5, p. 8)

Inference: In Verus, publish both a contract-corrected benchmark and a competition-faithful benchmark when requirements contain hidden answers. Report which assumptions and goals differ.

## technique: human semantic evaluation of autoformalization

The authors test Herald, Kimina, and o4-mini. They exclude outputs that fail Lean compilation, then manually verify every retained translation with Lean experts. At @128 they inspect only the first translation that compiles, rather than all 128 candidates (Evaluation of autoformalization models, §4, p. 7). They compare this with an LLM judge using backtranslation and equivalence checks.

The gap is large. Table 2 reports Herald test accuracy on v1 as 97.5% by its automated judge versus 62.7% by humans; Kimina is 98.4% versus 90.6%. On v2c test, Herald is 95.1% versus 54.1%, and Kimina 98.4% versus 75.4% (denominators are the respective test splits at @128; Table 2, p. 6). The authors state: “The LLM tends to produce false positives and therefore reports a much higher accuracy than a human evaluator.” (Evaluation of autoformalization models, §4, p. 7)

Inference: For Verus, use independent requirement review for sampled contracts, and calibrate any LLM semantic checker against experts. Verus verification cannot establish that a natural-language requirement was translated faithfully.

## technique: prover evaluation with controlled versions and environments

For theorem-prover-only experiments, the authors start from formal statements and use @32 sampling. DeepSeek-Prover-V1.5-RL, Goedel-Prover-SFT, and DeepSeek-Prover-V2-7B run on Lean 4.9.0; Kimina-Prover-Distill-7B runs on Lean 4.17.0. Experiments use eight NVIDIA A5000 GPUs and 128 CPU cores (Evaluation of theorem provers, §5, p. 8).

They analyze repaired unprovable items separately: v2s test has 13 such problems, and Goedel-V2 solves 8/13 (61.5%); v2s validation has 3 and every listed prover solves 1/3 (Table 5, p. 8). For the excessively simplified v2s test subset of 45, Goedel-V2 falls from 42/45 (93.3%) on v1 to 36/45 (80.0%) on v2s; for validation it falls from 31/36 (86.1%) to 19/36 (52.8%) (Table 7, p. 9).

Inference: Verus evaluations should pin compiler, Verus, dependency, hardware, and sampling settings, and publish denominators for repaired and difficulty-stratified subsets.

## techniques for the catalog

Inference: The following are reusable audit techniques drawn from the paper.

- stage-separated pipeline audit — record compilation, semantic alignment, proof, and source correspondence as distinct checks
- source statement repair — restore incomplete, wrong, or unprovable prose from the original competition
- formal statement repair — restore omitted conditions and goals, remove helpful assumptions, and correct declarations
- difficulty-controlled benchmark variants — publish simplified and competition-faithful versions with explicit solution handling
- human semantic evaluation — compare LLM judgments against expert review of every retained translation sample
- controlled prover benchmarking — pin versions, hardware, sampling, and denominator-stratified subsets
