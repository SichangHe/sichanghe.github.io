# Leanabell-Prover: Posttraining Scaling in Formal Reasoning
(authored by agents unless marked 🧑)
Tag: `zhang2025leanabell` , [paper](https://arxiv.org/abs/2504.06122v3)

## result and setup
Leanabell-Prover combines continual supervised training, synthetic self-reflection data, and reinforcement learning (RL) from Lean 4 compiler outcomes. “Next, we explore reinforcement learning with the use of outcome reward returned by Lean 4 compiler.” (abstract, p. 1) The released data contain 1.52M formal statements and 0.22M statements with informal chain-of-thought comments, proofs, and verification (introduction, p. 3; Table 1, p. 5).

Inference: the transferable idea for Verus is a checker-as-reward loop around whole-proof generation. The reported evidence concerns Lean 4 theorem statements and MiniF2F; it does not establish specification recovery or Rust verification.

## technique 1: continual training with verified data

how it is done
1. Start from DeepSeek-Prover-v1.5-SFT and Goedel-Prover-SFT, both 7B whole-proof models (§3.1, p. 4).
2. Collect formal statements from Lean Workbook, STP-Lean, NuminaMath, AoPS, and PromptCoT. Sample proofs with DeepSeek-Prover and Goedel-Prover and retain verified proofs. Table 1 lists 1.52M formal statements, of which about 0.22M have informal comments and verified proofs (§3.1, p. 5).
3. Formalize natural-language math with a Qwen2.5-32B-Coder-Instruct formalizer, then verify each resulting statement with Lean 4 compiler (§3.1, p. 5).
4. Run continual SFT on 8 H100 GPUs, learning rate 5e-5, global batch 32, two epochs, and weight decay 0.1 (§3.1, p. 5).

Verus form
Inference: build a corpus of Rust/Verus statement-and-proof pairs only after running the exact repository Verus command. Preserve the implementation, preconditions, postconditions, and proof text as separate fields. Check that generated contracts express the intended requirements independently of checking proofs.

limits
The authors report domain bias for ProofNet: “On the contrast, there is an obvious domain bias for ProofNet, which is also revealed by (Lin et al., 2025).” (§3.1, p. 5) Inference: a Verus corpus must stratify APIs, data structures, concurrency, and unsafe boundaries instead of relying on one benchmark.

## technique 2: synthetic reflection and rewriting

Lean completion
Sample 5K statements from the preceding continual-training stage whose 16 sampled proofs are not all correct, locate the first erroneous tactic, and resample a valid completion (§3.2, p. 6). Give Claude the old proof, Lean error, and corrected proof; request a step-by-step reflection that identifies the failing tactic and an alternative. “We observe that an effective reflection process can only be achieved by combining incorrect proofs, correct proofs, and tactic error messages.” (Lean completion, §3.2, p. 6)

Rewriting
Use Qwen2.5-72B-Instruct to judge whether an informal solution idea is correct and rewrite an incorrect idea. Then give Claude invalid and valid Lean code to create explanatory chains of thought (§3.2, pp. 6–7). This yields 19K CoT samples (§3.2, p. 7). Claude is instructed: “Do not provide any new Lean4 code beyond what I’ve given you - focus exclusively on analyzing the provided code.” (rewriting step 2 prompt, p. 8) Train on the synthesized data for one epoch at learning rate 5e-5 and global batch 1024 to obtain Leanabell-Prover-SFT (§3.2, p. 7).

Inference: for Verus, collect failed compilations, verifier diagnostics, and repaired proof functions; use a model to explain the mismatch, while training the code generator on the repaired code. Keep diagnostics masked or separately supervised so the model learns to predict corrections rather than copy tool output. A human or deterministic policy must reject repairs that weaken `requires` or `ensures`.

## technique 3: GRPO with compiler outcome reward

method
For each formal statement q, sample a group of G outputs from the old policy, compile each with Lean, and assign a reward from the feedback. Normalize group rewards into an advantage, then optimize the clipped GRPO objective (§3.3, pp. 7–8). The paper uses epsilon 0.2 and no KL penalty (§3.3, p. 8). The reward has two outcomes: a success reward for a validated proof and a negative reward for failure; numerical values are not specified. “Unlike stepwise rewards, the feedback is provided only after the full proof is compiled by Lean 4 verifier in our experiments.” (Reward Function, §3.3, p. 8) Warnings are ignored when compilation and verification succeed (same section).

Training selects statements with 2–16 successful proofs among 32 samples, samples 32 candidates per theorem, uses a maximum rollout length of 8192, global batch 1024, and constant learning rate 1e-6 (§3.3, p. 9). The authors explain: “We believe this subset of data has a certain level of difficulty while providing exploration space, making it effective for updating the policy model.” (same section)

Verus form
Inference: replace Lean compilation with the pinned Verus verifier command. For each target, sample a fixed group of complete proof candidates, assign success only when Verus accepts the unchanged executable code and intended contract, and normalize rewards within the group. Track verifier warnings separately; a passing proof with a weakened contract must not receive success. The exact GRPO clipping and group ranges are implementation choices, not proven Verus requirements.

## evidence, denominators, and failures
On MiniF2F-test, Leanabell-Prover-GD-RL reaches 59.8% pass@32, versus 57.6% for Goedel-Prover-SFT; the evaluation set is MiniF2F-test and the sample budget is 32 (Table 2, p. 10). Leanabell-Prover-DS-RL reaches 56.6% at pass@32 versus 50.0% for DeepSeek-Prover-v1.5-RL (Table 2, p. 10). At pass@128, DS-RL is 59.0% and GD-RL 61.1% (same table). Table 2 reports standard deviations for several baselines and none for the Leanabell rows. Inference: these results alone do not establish statistical significance.

The paper says RL gains depend on a suitable prompt set and that pass@N alone is insufficient (§4, p. 11). It also reports that self-reflection weakens after RL and that weak base models limit scaling (limitations, p. 12). “Moreover, although we achieved performance gains, we observe that the integrated sefl-reflection capacities demonstrate a weakening trend after RL training.” (limitations, p. 12)

Inference: verification checks the encoded theorem; it does not establish that formalization preserved the intended problem. Appendix B.2 illustrates this distinction: the informal problem asks for distinct integers (p. 20), but the displayed Lean statement omits distinctness and the revised proof uses `List.replicate n 0` (p. 21). Inference: the example permits a vacuous proof, so verifier rewards alone are insufficient when generated specifications may omit requirements. This matters when adapting the method to agent-written verified Rust.

Inference: a useful Verus experiment would compare fixed specifications versus model-generated specifications and binary verifier rewards versus diagnostic rewards, measuring success on repositories held out from training and checking executable behavior with differential tests.

## techniques for the catalog
- verified-data continual training: train on statement/proof pairs with compiler-verified proofs
- reflection and rewriting synthesis: pair failed code, diagnostics, and repaired code to train error analysis
- group-relative verifier RL: sample proof groups, score complete compilation, normalize rewards, and optimize with GRPO
