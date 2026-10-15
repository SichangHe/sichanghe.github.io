# Leanabell-Prover: Posttraining Scaling in Formal Reasoning
(authored by agents unless marked 🧑)
Tag: `zhang2025leanabell` , [paper](https://www.semanticscholar.org/paper/1ff3d0a6a97aff7717409307bc730b5bc88c8f65)

## result and setup
Leanabell-Prover combines continual supervised training, synthetic self-reflection data, and reinforcement learning (RL) from Lean 4 compiler outcomes. “Next, we explore reinforcement learning with the use of outcome reward returned by Lean 4 compiler.” (abstract, p. 1) The released data contain 1.52M formal statements and 0.22M statements with informal chain-of-thought comments, proofs, and verification (introduction, p. 3; Table 1, p. 5).

Inference: the transferable idea for Verus is a checker-as-reward loop around whole-proof generation. The reported evidence concerns Lean 4 theorem statements and MiniF2F; it does not establish specification recovery or Rust verification.

## technique 1: continual training with verified data

how it is done
1. Start from DeepSeek-Prover-v1.5-SFT and Goedel-Prover-SFT, both 7B whole-proof models (§3.1, p. 4).
2. Gather formal statement/proof pairs from Lean Workbook, STP-Lean, NuminaMath, AoPS, PromptCoT, and synthetic sources. Table 1 gives 1.52M formal statements and 0.22M with formal proofs plus informal comments (§3.1, pp. 4–5).
3. Formalize natural-language math with a Qwen2.5-32B-Coder formalizer, then verify each resulting statement with Lean 4 compiler (§3.1, p. 5).
4. Run continual SFT on 8 H100 GPUs, learning rate 5e-5, global batch 32, two epochs (§3.1, p. 5).

Verus form
Inference: build a corpus of Rust/Verus statement-and-proof pairs only after running the exact repository Verus command. Preserve implementation, `requires`, `ensures`, and proof text as separate fields so a model cannot learn from unchecked pseudo-proofs. Use `proof fn` and `assert` forms documented by Verus; do not execute proof functions at runtime. The paper’s natural-language formalizer has no direct Verus equivalent unless the desired contract is independently reviewed.

limits
The source distributions cover MiniF2F better than ProofNet; the authors explicitly observe domain bias (§3.1, p. 5). Inference: a Verus corpus must stratify APIs, data structures, concurrency, and unsafe boundaries instead of relying on one benchmark.

## technique 2: synthetic reflection and rewriting

Lean completion
Sample 5K statements whose prior pass@16 is below 100%, locate the first erroneous tactic, and resample a valid completion (§3.2, p. 6). Give Claude the old proof, Lean error, and corrected proof; request a step-by-step reflection that identifies the failing tactic and an alternative. “We observe that an effective reflection process can only be achieved by combining incorrect proofs, correct proofs, and tactic error messages.” (Lean completion, §3.2, p. 6)

Rewriting
Use Qwen2.5-72B-Instruct to judge whether an informal solution idea is correct and rewrite an incorrect idea. Then give Claude invalid and valid Lean code to create explanatory chains of thought (§3.2, pp. 6–7). This yields 19K CoT samples (§3.2, p. 7). The paper’s prompt forbids emitting new code in the reflection response, keeping the data focused on diagnosis.

Inference: for Verus, collect failed compilations, verifier diagnostics, and repaired proof functions; use a model to explain the mismatch, while training the code generator on the repaired code. Keep diagnostics masked or separately supervised so the model learns to predict corrections rather than copy tool output. A human or deterministic policy must reject repairs that weaken `requires` or `ensures`.

## technique 3: GRPO with compiler outcome reward

method
For each formal statement q, sample a group of G outputs from the old policy, compile each with Lean, and assign a reward from the feedback. Normalize group rewards into an advantage, then optimize the clipped GRPO objective (§3.3, pp. 7–8). The paper uses epsilon 0.2 and no KL penalty (§3.3, p. 8). The terminal reward is binary: “Our rewards are derived from: (1) Terminal reward Rsuccess: a scalar reward granted if the entire proof is validated successfully by Lean 4 verifier. (2) Penalty Rfail: a negative reward for proofs with critical errors...” (Reward Function, §3.3, p. 8)

Training selects statements with pass@32 in [2,16], samples 32 candidates per theorem, uses maximum rollout 8192 and global batch 1024 (§3.3, p. 8). This selection preserves both failures and exploration space rather than training only on impossible or already solved tasks.

Verus form
Inference: replace Lean compilation with the pinned Verus verifier command. For each target, sample a fixed group of complete proof candidates, assign success only when Verus accepts the unchanged executable code and intended contract, and normalize rewards within the group. Track verifier warnings separately; a passing proof with a weakened contract must not receive success. The exact GRPO clipping and group ranges are implementation choices, not proven Verus requirements.

## evidence, denominators, and failures
On MiniF2F-test, Leanabell-Prover-GD-RL reaches 59.8% pass@32, versus 57.6% for Goedel-Prover-SFT; the denominator is the MiniF2F-test theorem set and pass@32 means at least one successful proof among 32 samples (Table 2, p. 10). Leanabell-Prover-DS-RL reaches 56.6% at pass@32 versus 50.0% for DeepSeek-Prover-v1.5-RL (Table 2, p. 10). At pass@128, DS-RL is 59.0% and GD-RL 61.1% (same table). The authors report standard deviations for several baselines, but not every Leanabell row, so direct significance claims are limited.

The paper says RL gains depend on a suitable prompt set and that pass@N alone is insufficient (§4, p. 11). It also reports that self-reflection weakens after RL and that weak base models limit scaling (limitations, p. 12). “Although we achieved performance gains, we observe that the integrated sefl-reflection capacities demonstrate a weakening trend after RL training.” (limitations, p. 12)

Lean 4 compiler, Mathlib, formalization model, generated data, and benchmark statements remain trusted or assumed. The compiler proves the encoded theorem, not that it is the intended theorem. Inference: threat to agent-written verified Rust is medium: checker rewards can improve proof completion, but outcome-only rewards can reinforce vacuous or over-permissive specifications unless contracts are fixed and audited.

Existing VL work should not redo generic whole-proof RL from compiler outcomes. A useful new experiment is Verus-specific ablation: fixed specs versus model-generated specs, binary verifier reward versus diagnostic reward, and repository-held-out pass rates with executable differential tests.

## techniques for the catalog
- verified-data continual training: enlarge a formal corpus only with compiler-checked statements and proofs
- reflection and rewriting synthesis: pair failed code, diagnostics, and repaired code to train error analysis
- group-relative verifier RL: sample proof groups, score complete compilation, normalize rewards, and optimize with GRPO

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
