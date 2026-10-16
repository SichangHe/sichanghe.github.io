# Reviving DSP for Advanced Theorem Proving in the Era of Reasoning Models
(authored by agents unless marked 🧑)
Tag: `cao2025reviving`, [paper](http://arxiv.org/abs/2506.11487v1)
## What the paper establishes
The paper presents DSP+, an inference-only pipeline for Lean theorem proving that coordinates a reasoning model, an autoformalizing sketch model, and a tactic step prover. Its central claim is measured on three benchmarks. The abstract states: “DSP+ solves 80.7%, 32.8%, and 24 out of 644 problems from miniF2F, ProofNet, and PutnamBench, respectively, while requiring fewer budgets compared to state-of-the-arts.” (Abstract, p. 1). The benchmark denominators differ: miniF2F-test has 244 problems, ProofNet-test 186, and the PutnamBench Lean subset 644 (Section 5.2, p. 5). Table 1 reports 80.7% for the R1-V3-BFS configuration at 1,024 attempts on miniF2F-test, 32.8% on ProofNet at 128 attempts, and 24/644 on PutnamBench; its ensemble row reports 83.6%, 33.9%, and 25/644 (Table 1, p. 7). Those are pass rates under the listed budgets, not proof completeness.

The pipeline is deliberately staged. The authors describe the motivation as follows: “DSP+ achieves this through fine-grained and integrated neuro-symbolic enhancements based on three intuitions” (Introduction, p. 2). Each enhancement is an operational technique below.

## technique: concise draft generation

What it is and when to use it

Give the formal theorem statement directly to a reasoning model and ask for an informal sequence of key formulas. Use it when a theorem needs mathematical decomposition before Lean syntax is generated. The draft is an intermediate plan, not a proof accepted by Lean.

How to do it

1. Feed the formal statement to a reasoning model such as QwQ-32B or DeepSeek-R1 (Section 3.1, p. 4)
2. Permit internal `<think>` reasoning but remove those tokens before passing output onward (Section 3.1)
3. Prompt for concise proof steps focused on formulas, because the authors say this prevents “overloading the sketch phase” (Section 3.1)
4. Pass the resulting ordered steps to the sketch model

The paper’s example drafts “Step 1: sin x < x for 0 < x”, “Step 2: y < x”, and “Step 3: y < 1/2” for a theorem about `y < Real.sin x` and `x ≤ 1/2` (Figure 2, p. 4). The authors also test removing the concision constraint: Figure 4 reports 75.4% for “No Format” versus 74.2% for “Concise Steps” in the displayed miniF2F pass@128 experiment (Section 6.2, p. 8). Thus concision is a design choice, not a universally demonstrated improvement.

Verus form

Inference: use a Verus planning prompt that emits mathematical subgoals before Rust/Verus syntax. The draft itself is outside the verifier and must not be trusted as evidence. The Verus proof still needs `requires`, `ensures`, `assert`, `assume` only when justified, and proof lemmas accepted by Verus; the paper’s Lean `<think>` filtering has no direct Verus construct.

Evidence and limits

The default implementation uses QwQ-32B for drafting, DeepSeek-V3-0324 for sketching, and BFS-Prover-7B for proving (Section 4, p. 5). The paper reports that reasoning models are stronger for the draft, but Section 7 lists novelty proof and vague abstraction as failure cases. The experiment is Lean 4 v4.17.0-rc1 with Mathlib4, so transfer to Verus is an inference.

## technique: hypothesis-hinted sketching

What it is and when to use it

Convert each informal draft step into a hierarchy of Lean subgoals while leaving each subgoal’s proof hole open. Add an explicit list of hypotheses expected to prove that subgoal. This is useful when a proof state contains many irrelevant facts.

How to do it

1. Ask the sketch model to autoformalize the draft into Lean declarations and `have` subgoals (Section 3.2, p. 4)
2. For each subgoal, emit a hint such as `prove_with [h2]`; the paper defines this as a pseudonym for Lean’s `sorry` augmented with hypothesis usage (Section 3.2)
3. Keep the hierarchy and hints as the input to proving
4. Let the proving model work on each hinted subgoal, rather than exposing all hypotheses

Figure 2 gives the exact shape: `have h3 : Real.sin x ≤ x := by prove_with [h2]`, then `have h4 : y < x := by prove_with [h3, t]`, and finally `have h5 : y < (1:ℝ) / 2 := by prove_with [h1, h4]` (Figure 2, p. 4). The authors contrast this with DeepSeek-Prover-V2, which uses either all or no hypotheses (Section 3.2).

Verus form

Inference: emit `assert` or a named intermediate fact with only the selected variables and facts in scope, then replace `prove_with` with a Verus proof block or a lemma call. Verus has no `prove_with` keyword; a hole must be removed before verification. The selection idea carries over, while Lean’s `sorry` semantics does not.

Evidence and limits

The ablation removes explicit hypothesis specification and reports 71.3% versus 74.2% for both optimizations in the plotted miniF2F pass@128 comparison (Figure 5, p. 8). The denominator is 244 miniF2F-test problems, as defined in Section 5.2. The result is a component ablation, not an independent guarantee that every hint is correct.

## technique: error-line masking and iterative repair

What it is and when to use it

Repair a syntactically invalid sketch without regenerating the entire sketch. This keeps valid earlier lines while isolating invalid dependent material.

How to do it

1. Execute the generated sketch in Lean
2. If a subgoal statement is syntactically wrong, comment out that line and every subsequent dependent line
3. If a proof line inside a subgoal errors, replace that line and all subsequent dependent lines with `sorry`
4. Send the repaired sketch to the proving phase (Section 3.2, p. 4)

The two rules are stated verbatim by the authors: “if a subgoal statement is syntactically wrong, the subgoal line and all subsequent dependent lines are directly commented out” and “if a proof line within a subgoal raises an error, only that line and all subsequent dependent lines are replaced with sorry.” (Section 3.2, p. 4). This is masking, not proof: the later proving phase must close every remaining `sorry`.

Verus form

Inference: run `verus` after generation, identify a malformed `assert` or lemma invocation, and remove dependent generated statements or replace them with explicit temporary obligations tracked outside the verified artifact. Do not leave `external_body` or an unproved axiom in product code. A Verus implementation needs a generator-side dependency graph because the paper’s masking rules are defined for Lean source lines.

Evidence and limits

Figure 5’s miniF2F pass@128 ablation gives 71.3% with no error masking and 74.2% with both error masking and hypothesis hints (244-problem denominator). The paper reports that masking avoids re-executing the sketch phase (Section 3.2). A masked line can hide a bad abstraction; Section 7 therefore identifies vague sketch abstractions as a failure mode.

## technique: integrated step proving and tree search

What it is and when to use it

Combine symbolic tactic search with a model that predicts the next tactic. Use it to close the `prove_with` and `sorry` holes after sketching.

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

Run one problem repeatedly with different draft/sketch model combinations. The implementation pipelines the phases with buffers, shares buffered results across combinations, and appends configurations until solved or timed out (Section 4, p. 5). Table 2’s ensemble combines pass@1024 and pass@128 configurations and reports 204 solved miniF2F problems cumulatively, corresponding to 83.6% of 244 (Table 2, p. 8). This is an inference-time coverage strategy; it does not increase the correctness standard of Lean checking.

Inference: a Verus agent can similarly cache generated specifications and proof states, then vary model prompts or search heuristics while retaining only Verus-verified artifacts. The threat to agent-written verified Rust is reduced for safety properties by final Verus checking, but remains for wrong specifications, omitted behaviors, and unsafe trusted assumptions.

## what is proved, measured, and trusted

Lean checks each final proof, but the draft, sketch, model, Aesop search configuration, benchmark formalizations, and model APIs are trusted inputs or infrastructure. The paper found eight wrongly formalized miniF2F statements by inspecting inconsistent subgoals (Introduction, p. 2); therefore a passing Lean proof can still prove an unintended statement. Table 3 compares average token cost: R1-V3-BFS uses 3.6k + 0.8k tokens per pass at 80.7% and 1,024 passes, while Kimina-Prover-Preview uses 10k at 80.7% and 8,192 passes (Table 3, p. 9). These settings and denominators must remain attached to the numbers. The paper does not establish Verus performance, Rust safety coverage, or production reliability.

Inference: VL should reuse the staged decomposition, explicit hypothesis narrowing, compiler-driven repair, verifier-in-the-loop search, and ensemble caching. It should not redo these as unverified natural-language-only prompting; the paper already supplies a measured Lean implementation. The remaining product threat is specification error and trusted generator/runtime infrastructure, not acceptance of an invalid proof by Verus itself.

## techniques for the catalog
- concise draft generation — derive ordered mathematical subgoals from the formal statement and filter reasoning tokens before sketching
- hypothesis-hinted sketching — autoformalize a hierarchy of subgoals with explicit supporting hypotheses
- error-line masking — comment out malformed dependent lines or replace failing proof lines with `sorry` for later repair
- integrated step proving — combine model-predicted tactics with symbolic tree search under bounded budgets
- ensemble buffering — cache phase outputs and try diverse model configurations to increase cumulative coverage
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
