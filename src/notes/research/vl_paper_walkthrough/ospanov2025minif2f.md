# miniF2F-Lean Revisited: Reviewing Limitations and Charting a Path Forward
(authored by agents unless marked 🧑)
Tag: `ospanov2025minif2f`, [paper](http://arxiv.org/abs/2511.03108v1)

## purpose and end-to-end criterion

The paper audits miniF2F as an Olympiad pipeline: read an informal problem, autoformalize it in Lean, prove the formal theorem, and receive credit only when the proof matches the original statement. It warns that compiler success and theorem-prover success are insufficient if translation changed the problem. “Such automated system would fail if it changes the original problem statement and proves an altered version of the competition problem” (Introduction, p. 2). The authors report an end-to-end accuracy of 34.8% for their strongest original pipeline after comparing final proofs with source statements, despite reported component figures of 97% autoformalization and 69% theorem proving (Introduction, p. 3).

They manually inspect all 488 miniF2F theorems, correct more than 300 Lean 4 statements, and release miniF2F-v2s (simplified) and v2c (competition). “We analyze every failure mode of an end-to-end formal reasoning pipeline on the miniF2F benchmark and correct over 300 Lean 4 statements to eliminate errors and simplifications.” (Introduction, p. 3) v2s makes formal and informal statements exactly correspond while retaining supplied solutions; v2c restores competition wording, choices, and unknown answers.

Inference: For Verus, a benchmark must score the complete path from prose requirement to verified Rust contract and implementation. A passing Verus proof should not count if the contract silently weakens the requirement.

## technique: classify failure stages

The paper's Figure 1 and introduction separate three automatic failure points. First, an autoformalizer can emit code that does not compile. Second, a compiling formal statement can differ from the informal one; a prover may then prove the wrong goal. Third, a faithful statement can remain unproved because the prover is inadequate. The authors retain only the first output that passes Lean REPL and is judged semantically faithful by human experts, then run theorem provers and compare the final theorem with the source (Evaluation of complete formal reasoning pipelines, §3, p. 6).

Apply this audit by recording each stage separately: compilation, semantic alignment, proof, and final correspondence. The paper's “effective accuracy” has two variants: full score credits excessively simplified proofs, while the Olympiad setting credits only proofs aligned with the source. Table 1 uses translator sampling @128 and prover sampling @32; those settings must be reported with each rate (Table 1, p. 5).

Inference: In Verus, retain separate logs for Rust compilation, Verus verification, contract adequacy review, and executable behavior tests. A single pass/fail metric hides where an agent failed.

## technique: repair informal statements from primary sources

The authors identify incomplete statements, missing variable types, discrepancies from original competitions, unprovable tasks, wrong supplied solutions, and missing supplied solutions. They replace incomplete or altered text with the original competition statement. For multiple-choice problems, v2s removes choices and keeps the final goal; v2c keeps every choice and requires the model to choose and prove. If the informal statement omits a solution while the formal theorem contains it, v2s adds the answer to prose; v2c removes it from the formal goal and leaves a `sorry` for the prover to discover (Errors in informal statements, §2.1, pp. 3–4).

They find 16 unprovable problems across test and validation sets, caused by missing hypotheses, wrong brackets, or wrong Mathlib functions (p. 5). Repair therefore starts from source text, not from a proof that happens to compile.

Inference: A Verus corpus should preserve the original requirement, explicitly label whether a result is given or must be discovered, and reject contracts whose assumptions were added only to make proving easy.

## technique: repair formal statements and restore difficulty

The audit finds excessive simplification: changed goals or conditions, omitted portions, helpful assumptions, wrong types, and replacing a function with an equivalence. It also finds undeclared functions and expressions. The authors rewrite each formal statement to match its informal counterpart exactly (Errors in formal statements, §2.2, p. 4).

They publish two versions to distinguish faithful difficulty from convenient solvability. v2s corrects errors and aligns statements while preserving solutions. v2c restores exact competition tasks, including choices and unknown answers. Every v2 theorem has a checked formal proof, so repaired unprovable items become provable (Evaluation of theorem provers, §5, p. 8).

Table 4 gives DeepSeek-Prover-V2-7B test accuracy 82.0% on v1, 74.2% on v2s, and 72.5% on v2c; the denominator is the complete test split, and all runs use @32 sampling. The drop reflects restored difficulty, not a regression in proof checking (Table 4, p. 8).

Inference: In Verus, publish both a contract-corrected benchmark and a competition-faithful benchmark when requirements contain hidden answers. Report which assumptions and goals differ.

## technique: human semantic evaluation of autoformalization

The authors test Herald, Kimina, and o4-mini. They exclude outputs that fail Lean compilation, then manually verify every retained translation with Lean experts. At @128 they inspect only the first translation that compiles, rather than all 128 candidates (Evaluation of autoformalization models, §4, p. 7). They compare this with an LLM judge using backtranslation and equivalence checks.

The gap is large. Table 2 reports Herald test accuracy on v1 as 97.5% by its automated judge versus 62.7% by humans; Kimina is 98.4% versus 90.6%. On v2c test, Herald is 95.1% versus 54.1%, and Kimina 98.4% versus 75.4% (denominators are the respective test splits at @128). The authors state: “The LLM tends to produce false positives and therefore reports a much higher accuracy than a human evaluator.” (Evaluation of autoformalization models, §4, p. 7)

Inference: For Verus, use independent requirement review for sampled contracts, and calibrate any LLM semantic checker against experts. Verus verification cannot establish that a natural-language requirement was translated faithfully.

## technique: prover evaluation with controlled versions and environments

For theorem-prover-only experiments, the authors start from formal statements and use @32 sampling. DeepSeek-Prover-V1.5-RL, Goedel-Prover-SFT, and DeepSeek-Prover-V2-7B run on Lean 4.9.0; Kimina-Prover-Distill-7B runs on Lean 4.17.0. Experiments use eight NVIDIA A5000 GPUs and 128 CPU cores (Evaluation of theorem provers, §5, p. 8).

They analyze repaired unprovable items separately: v2s test has 13 such problems, and Goedel-Prover-V2-7B solves 8/13 (61.5%); v2s validation has 3 and every listed prover solves 1/3 (Table 5, p. 8). For the excessively simplified v2s test subset of 45, Goedel-Prover-V2-7B falls from 42/45 (93.3%) on v1 to 36/45 (80.0%) on v2s; for validation it falls from 31/36 (86.1%) to 19/36 (52.8%) (Table 7, p. 9).

Inference: Verus evaluations should pin compiler, Verus, dependency, hardware, and sampling settings, and publish denominators for repaired and difficulty-stratified subsets.

## what remains trusted and product threat

The revisions rely on original competition sources, human Lean expertise, manually checked correspondence, Mathlib, Lean versions, prover implementations, and the definition of “effective accuracy.” The paper's v2 repairs establish checked formal proofs and alignment for its dataset; they do not prove that every original competition statement was transcribed without editorial judgment.

Inference: The threat to agent-written verified Rust is high at the specification boundary. Benchmark contamination or simplified contracts can make an agent appear reliable while proving weaker properties. The paper's remedy—source auditing, explicit variants, stage-separated metrics, and human semantic checks—should precede training or product claims.

## techniques for the catalog

- stage-separated pipeline audit — record compilation, semantic alignment, proof, and source correspondence as distinct gates
- source statement repair — restore incomplete, wrong, or unprovable prose from the original competition
- formal statement repair — remove omitted conditions, altered goals, helpful assumptions, and wrong declarations
- difficulty-controlled benchmark variants — publish simplified and competition-faithful versions with explicit solution handling
- human semantic evaluation — compare LLM judgments against expert review of every retained translation sample
- controlled prover benchmarking — pin versions, hardware, sampling, and denominator-stratified subsets
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
