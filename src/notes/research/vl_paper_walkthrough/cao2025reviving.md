# Reviving DSP for Advanced Theorem Proving in the Era of Reasoning Models
(authored by agents unless marked 🧑)
Tag: `cao2025reviving`, [paper](http://arxiv.org/abs/2506.11487v1)
## What the paper establishes
The paper presents DSP+, an inference-only pipeline for Lean theorem proving that coordinates a reasoning model, an autoformalizing sketch model, and a tactic step prover. Its central claim is measured on three benchmarks. The abstract states: “DSP+ solves 80.7%, 32.8%, and 24 out of 644 problems from miniF2F, ProofNet, and PutnamBench, respectively, while requiring fewer budgets compared to state-of-the-arts.” (Abstract, p. 1). The benchmark denominators differ: miniF2F-test has 244 problems, ProofNet-test 186, and the PutnamBench Lean subset 644 (Section 5.2, pp. 5–6). Table 1 reports 80.7% for the R1-V3-BFS configuration at 1,024 attempts on miniF2F-test, 32.8% on ProofNet at 128 attempts, and 24/644 on PutnamBench at 128 attempts; its ensemble row reports 83.6%, 33.9%, and 25/644 (Table 1, p. 7). Inference: these pass rates measure benchmark coverage under the listed budgets, not proof completeness.

The pipeline is deliberately staged. The authors describe the motivation as follows: “DSP+ achieves this through fine-grained and integrated neuro-symbolic enhancements based on three intuitions” (Introduction, p. 2). Each enhancement is an operational technique below.

## technique: concise draft generation

What it is and when to use it

Give the formal theorem statement directly to a reasoning model and ask for an informal sequence of key formulas. Inference: use it when a theorem needs mathematical decomposition before Lean syntax is generated. The draft is an intermediate plan, not a proof accepted by Lean.

How to do it

1. Feed the formal statement to a reasoning model such as QwQ-32B or DeepSeek-R1 (Section 3.1, p. 4)
2. Permit internal `<think>` reasoning but remove those tokens before passing output onward (Section 3.1)
3. Prompt for concise proof steps focused on formulas, because the authors say this prevents “overloading the sketch phase” (Section 3.1)
4. Pass the resulting ordered steps to the sketch model

Figure 2 drafts three steps: establish the sine bound for positive `x`, derive `y < x`, and conclude `y < 1/2` (p. 4). The authors also test removing the concision constraint: Figure 4 reports 75.4% for “No Format” versus 74.2% for “Concise Steps” in the displayed miniF2F pass@128 experiment (Section 6.2, p. 8). Inference: concision is a design choice, not a universally demonstrated improvement.

Verus form

Inference: use a Verus planning prompt that emits mathematical subgoals before Rust/Verus syntax. The draft itself is outside the verifier and must not be trusted as evidence. A Verus adaptation would need independently verified proof blocks or lemma calls; filtering model thinking is a generator operation.

Evidence and limits

The default implementation uses QwQ-32B for drafting, DeepSeek-V3-0324 for sketching, and BFS-Prover-7B for proving (Section 4, p. 5). Figure 6 (p. 9) reports draft-model results at pass@128: QwQ-32B 74.2%, DeepSeek-R1 75.8%, GPT-4o 71.7%, and DeepSeek-V3-0324 73.0%. Section 7 (p. 9) lists “the proof of novelty for the draft, vague abstraction for the sketch, and misaligned difficulty for the proving” as challenges. The experiment is Lean 4 v4.17.0-rc1 with Mathlib4, so transfer to Verus is an inference.

## technique: hypothesis-hinted sketching

What it is and when to use it

Convert each informal draft step into a hierarchy of Lean subgoals while leaving each subgoal’s proof hole open. Add an explicit list of hypotheses expected to prove that subgoal. The authors explain: “both proving models and symbolic search degrade when faced with overly cluttered subgoals” (Section 3.2, p. 4).

How to do it

1. Ask the sketch model to autoformalize the draft into Lean declarations and `have` subgoals (Section 3.2, p. 4)
2. For each subgoal, emit a hint such as `prove_with [h2]`; the paper defines this as a pseudonym for Lean’s `sorry` augmented with hypothesis usage (Section 3.2)
3. Keep the hierarchy and hints as the input to proving
4. Split the proving budget between using only the hinted hypotheses, via `clear * - ...`, and using all available hypotheses; success in either attempt is sufficient (Appendix A.1, p. 13)

Figure 2 gives these subgoals (line breaks flattened): `have h3 : Real.sin x ≤ x := by prove_with [h2]`, then `have h4 : y < x := by prove_with [h3, t]`, and finally `have h5 : y < (1:ℝ) / 2 := by prove_with [h1, h4]` (Figure 2, p. 4). The authors contrast this with DeepSeek-Prover-V2, which uses either all or no hypotheses (Section 3.2).

Verus form

Inference: emit `assert` or a named intermediate fact with only the selected variables and facts in scope, then replace `prove_with` with a Verus proof block or a lemma call. Verus has no `prove_with` keyword; a hole must be removed before verification. The selection idea carries over, while Lean’s `sorry` semantics does not.

Evidence and limits

The ablation removes explicit hypothesis specification and reports 71.3% versus 74.2% for both optimizations in the plotted miniF2F pass@128 comparison (Figure 5, p. 8). The denominator is 244 miniF2F-test problems, as defined in Section 5.2. Appendix A.1 (p. 13) states: “the hypotheses specified by the sketch model are sometimes inaccurate.”

## technique: error-line masking and iterative repair

What it is and when to use it

Repair a syntactically invalid sketch without regenerating the entire sketch. This keeps valid earlier lines while isolating invalid dependent material.

How to do it

1. Execute the generated sketch in Lean
2. If a subgoal statement is syntactically wrong, comment out that line and every subsequent dependent line
3. If a proof line inside a subgoal errors, replace that line and all subsequent dependent lines with `sorry`
4. Repeat masking through Lean feedback until the sketch is syntactically valid, then send it to the proving phase (Section 3.2, p. 4; Appendix A.4, p. 14; Figure 9, p. 17)

The two rules are stated verbatim by the authors: “if a subgoal statement is syntactically wrong, the subgoal line and all subsequent dependent lines are directly commented out” and “if a proof line within a subgoal raises an error, only that line and all subsequent dependent lines are replaced with sorry.” (Section 3.2, p. 4). This is masking, not proof: the later proving phase must close every remaining `sorry`.

Verus form

Inference: run `verus` after generation, identify a malformed `assert` or lemma invocation, and remove dependent generated statements or replace them with explicit temporary obligations tracked outside the verified artifact. Do not leave `external_body` or an unproved axiom in product code. Dependent generated statements would need to be identified outside the verifier; the paper does not implement this for Verus.

Evidence and limits

Figure 5’s miniF2F pass@128 ablation gives 71.3% with no error masking and 74.2% with both error masking and hypothesis hints (244-problem denominator). The authors state their aim: “We aim to sidestep the re-execution of the sketch phase and retain sketch lines as much as possible” (Section 3.2, p. 4). Section 7 (p. 9) separately identifies vague sketch abstractions as a failure mode.

## technique: integrated step proving and tree search

What it is and when to use it

Combine symbolic tactic search with a model that predicts the next tactic. The search aims “to eliminate every prove_with and sorry in the sketch given the corresponding proof state” (Section 3.3, p. 5).

How to do it

1. Represent each outstanding subgoal as a Lean proof state
2. At each tree node, obtain candidate tactics from Aesop’s symbolic rules and from BFS-Prover (Section 3.3, p. 5)
3. Search with Aesop’s tree while allowing either source to generate a node
4. Stop when every subgoal is closed or the configured search budget/time limit is exhausted

The implementation uses Lean Copilot to integrate BFS-Prover with Aesop’s internal logic, avoiding external proof-state parsing (Section 4, p. 5). The tree-search setup has beam width 4 selected from 8 tactics, tree size 64, up to 8 attempts per subgoal, and a 2,400-second limit per proof search and verification (Section 5.1, p. 5).

Verus form

Inference: use Verus diagnostics as the proof-state feedback loop and have a tactic model propose lemma calls, `assert` chains, and trigger/quantifier changes. Aesop and Lean Copilot do not transfer; the transferable design is verifier-in-the-loop branching with bounded search. Every accepted branch must compile and verify in Verus.

Evidence and limits

The default QwQ-V3-BFS configuration reaches 79.5% on miniF2F-test at 1,024 attempts; R1-V3-BFS reaches 80.7% at the same 1,024 attempts (Table 1, p. 7; denominator 244). Replacing the proving model with common tactics gives 47.5% at pass@128, versus 74.2% with BFS-Prover (Section 6.3, p. 8), showing the measured contribution of the step prover under that budget. The authors caution that Lean version changes affect accuracy (Section 7).

## technique: ensemble budgets and buffered execution

Run one problem repeatedly with different draft/sketch model combinations. The implementation pipelines the phases with buffers, shares buffered results across combinations, and appends configurations until solved or timed out (Section 4, p. 5). Table 2’s ensemble combines pass@1024 and pass@128 configurations and reports 204 solved miniF2F problems cumulatively, corresponding to 83.6% of 244 (Table 2, p. 8). Inference: this increases inference-time coverage without changing Lean’s proof acceptance standard.

Inference: a Verus agent could cache phase outputs and vary model prompts or search heuristics. Transfer would require an implementation and evaluation in Verus; this paper supplies neither.

## what is proved, measured, and trusted

The authors state: “All proofs are verified using Lean 4 (v4.17.0-rc1) with the corresponding Mathlib4 [54].” (Section 5.1, p. 5). Verification applies to the formal statement. Appendix F (pp. 19–20) reports eight incorrect miniF2F-test problems: “These problems are either unprovable or contain translation errors, causing a mismatch between the Lean formalization and the natural language description.” The paper also says it uses Kimina’s corrected versions of `aime_1994_p3` and `mathd_numbertheory_618`, two errors it did not independently discover (Appendix F, footnote 5, p. 19).

Table 3 (p. 9) reports average tokens per pass separately by model size: R1-V3-BFS uses 12k from the 7B prover plus 3.6k + 0.8k from the 671B draft and sketch models, achieving 80.7% at 1,024 passes. Kimina-Prover-Preview uses 10k from a 72B model, achieving 80.7% at 8,192 passes. Inference: the token comparison supports fewer total generated tokens at these reported settings; it is not a model-size-adjusted compute comparison. Appendix B (p. 14) derives the prover estimate from miniF2F-test pass@32 observations: about 1,500 samples per workflow attempt and about 8 tokens per sample.

## techniques for the catalog
- concise draft generation — derive ordered mathematical subgoals from the formal statement and filter reasoning tokens before sketching
- hypothesis-hinted sketching — autoformalize a hierarchy of subgoals with explicit supporting hypotheses
- error-line masking — comment out malformed dependent lines or replace failing proof lines with `sorry` for later repair
- integrated step proving — combine model-predicted tactics with symbolic tree search under bounded budgets
- ensemble buffering — cache phase outputs and try diverse model configurations to increase cumulative coverage
