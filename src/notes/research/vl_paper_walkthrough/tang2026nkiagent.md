# NKI-Agent: Domain-Specific Fine-Tuning and Agentic Tool Use for Neuron Kernel Generation
(authored by agents unless marked 🧑)
Tag: `tang2026nkiagent`, [paper](https://www.semanticscholar.org/paper/f8ed15e1f2a72da61fe623923dcd974104bec04a)

## what the paper establishes

NKI-Agent targets AWS Trainium/Inferentia kernels written with the Neuron Kernel Interface (NKI). The system combines domain-specific supervised fine-tuning, a rank-aware prompt, and a multi-turn compile–verify–fix loop on real Trn1 hardware. The paper states: "NKI-AGENT: A multi-turn agent with compile and verify tools and a rank-aware system prompt for NKI kernel generation." (section 1, p. 1)

NKI programs use four engines (Tensor, Vector, Scalar, GpSimd), 2-D tiles with a fixed 128-element partition dimension, and explicit HBM/SBUF/PSUM movement. The authors synthesize NKI-Agent-Ops-6K from roughly 400 seeds, shape/dtype/fusion expansion to roughly 15,000 candidates, then compile, execute, stability-filter, and baseline-filter to 6,000 tasks. They hold out a 250-task NKIGEN-BENCH and evaluate a balanced 150-task subset (50 per level) plus a 60-task ablation subset.

On 150 tasks, Claude Opus 4.8 with tools reaches 77.3% (116/150, inferred from 74% + 34/50, 44/50, 38/50 level counts in table 2), while base Qwen3-Coder-30B-A3B with NKI-Agent reaches 20.0% (30/150), SFT 20.7% (31/150), and GRPO 17.3% (26/150) (table 1, p. 3). On 60 tasks, SFT reaches 25.0% versus Opus 63.3% and Sonnet 15.0%. The paper cautions: "GRPO with binary compilation reward fails to improve over SFT, providing guidance on reward design for RL-based kernel generation." (abstract, p. 1)

## technique: synthesize and qualify domain data

What it is. Build a large task corpus from real operator and kernel seeds, combinatorially expand shapes, dtypes, and fusion patterns, then retain only candidates that compile, execute, are stable, and beat a baseline.

How to do it.

1. Crawl roughly 180 PyTorch torch.nn operators, 30 nki-samples kernels, and 250 KernelBench tasks, yielding about 400 seeds (section 3.2, p. 2)
2. Expand each seed across five shapes, three dtypes, and about 200 fusion patterns to about 15,000 candidates (section 3.2, p. 2)
3. Compile and execute candidates on Neuron hardware; require stability coefficient of variation below 10% and baseline checks (section 3.2, p. 2)
4. Balance and retain 6,000 tasks; hold out the 250 benchmark tasks, and curate 647 SFT episodes through four quality iterations (sections 3.2 and 5.1, pp. 2, 5)

Verus form. Inference: represent each kernel task's tensor shapes, dtypes, and memory layout as Rust specification data. Prove shape-preservation and bounds predicates for host-side wrappers with `requires` and `ensures`; model hardware compilation/execution as trusted external checks. A proof cannot establish that a benchmark corpus covers all NKI operations.

Evidence. SFT data quality dominates hyperparameters: v2 with bad data scores 8.3% on 60 tasks versus base 10.0%; v4 after fixing function names and 2-D shape errors scores 15.0%, an 81% relative increase over v2 (table 4, p. 5). The paper says: "Each fix targeted one issue: v1→v2 fixed message format; v2→v3 standardized function names (64% were wrong); v3→v4 converted 3D tensors to 2D." (section 5.1, p. 5)

Limits. The data and results are specific to Neuron SDK 2.24, and the paper does not measure runtime performance beyond correctness (section 6, p. 6).

## technique: rank-aware prompting

What it is. Add input-rank-specific instructions and templates for 2-D, 3-D, and 4-D tensors, plus the requirement that every output element be written by `nl.store`. This is a prompt-only intervention (section 3.3, p. 2).

How to do it.

1. Read each task's input-shape block
2. Select the matching rank template
3. Remind the model of 128-element partition dimensions and complete output stores
4. Generate NKI code under the same model and tool budget (section 3.3, p. 2)

Verus form. Inference: encode rank and tile dimensions in Rust types or ghost values; use `requires` to state dimension compatibility and `ensures` to state output coverage. Verus can prove arithmetic shape constraints but not NKI compiler semantics.

Evidence. The rank-aware prompt is identified as the primary driver of frontier-model gains on hard examples (section 3.3, p. 2). Inference: because it changes only context, its causal effect is confounded unless evaluated with paired prompts and fixed seeds; the paper reports no separate statistical test for the prompt alone.

## technique: compile–verify–fix agent loop

What it is. Let the agent call two tools on real Trn1 hardware: compile invokes neuronx-cc with a 120-second timeout and returns status/errors; verify runs the compiled kernel on random inputs and compares against the PyTorch reference using `torch.allclose`. Iterate up to T=10 turns: generate, compile, verify, fix (section 3.3, p. 2).

How to do it.

1. Generate an NKI kernel from the task and rank-aware prompt
2. Compile with neuronx-cc; feed compile diagnostics back on failure
3. If compilation passes, run random-input verification against PyTorch using `torch.allclose`
4. Feed numerical failures back and regenerate a complete corrected kernel
5. Stop on verification pass or after ten turns; count pass only when compilation and numerical verification both succeed (sections 3.3 and 4.2, pp. 2–3)

The paper's example starts with nonexistent `nl.matmul`, switches to `nisa.nc matmul`, fixes a tile shape mismatch, then adds PSUM accumulation; turn 4 verifies successfully (figure 4, p. 5). It says: "The agent iteratively discovers the correct API (nisa.nc matmul), fixes tile dimension constraints, and adds proper accumulation, errors that are impossible to recover from in single-shot mode." (figure 4 caption, p. 5)

Verus form. Inference: make the Rust wrapper's kernel specification explicit, with `requires` for tile compatibility and initialized buffers and `ensures` for output equivalence to a reference model. Use a loop `invariant` to preserve buffer bounds across tiling and accumulation. The NKI compiler and hardware numerical behavior remain trusted; a Verus proof of the wrapper does not certify generated Python/NKI code.

Evidence. On the 60-task subset, Opus single-shot scores 6% (3/60) and NKI-Agent 63.3% (38/60); SFT single-shot 15.0% (9/60) and NKI-Agent 25.0% (15/60). Multi-turn without tools remains 15.0%, showing that grounded compiler/verification feedback, not extra conversational turns, supplies the gain (section 4.4, pp. 4–5). Tool use can hurt easy tasks: the agent sometimes changes already-correct code after warnings or exhausts turns (section 4.4, p. 5).

Limits. The ten-turn limit is empirical, results are single-run without error bars, and correctness is measured with random inputs rather than exhaustive equivalence (section 6, p. 6). Inference: `torch.allclose` can miss shape-specific or adversarial numerical failures, so VL should pair dynamic checks with formal contracts and targeted edge cases.

## technique: LoRA SFT followed by binary-reward GRPO

What it is. Fine-tune Qwen3-Coder-30B-A3B on 647 curated episodes using rank-32 LoRA, then optionally apply GRPO from the SFT checkpoint. SFT uses two epochs, learning rate 2×10^-4, batch 4, BF16, and eight A100 40GB GPUs. GRPO samples G=4 kernels per prompt for 200 steps with binary reward +1 correct/−0.5 fail, learning rate 5×10^-7, and beta 0.1 (section 3.4, p. 3).

How to do it.

1. Curate and freeze the 647 episodes (section 3.2, p. 2)
2. Train LoRA SFT with the fixed recipe (section 3.4, p. 3)
3. For GRPO, sample four kernels, compile/verify each, assign binary reward, compute group-relative advantages, and update for 200 steps (section 3.4, p. 3)
4. Evaluate single-shot and ten-turn NKI-Agent modes on the held-out benchmark (section 4.2, p. 3)

Verus form. Inference: treat model weights, reward computation, and hardware runs as trusted experiment inputs. Verus can verify score aggregation and denominator accounting but cannot prove policy improvement. The product gate should accept generated Rust only after Verus proof and independent runtime tests, regardless of model reward.

Evidence. GRPO underperforms SFT on every reported configuration: 60-task single-shot 13.3% versus 15.0%, NKI-Agent 16.7% versus 25.0%; 150-task single-shot 15.3% versus 19.3%, NKI-Agent 17.3% versus 20.7% (table 5, p. 5). The authors hypothesize sparse binary signal, discontinuous compile outcomes, and roughly 75% failing generations; they leave graded rewards for future work (section 5.2, p. 5).

## what is proved, measured, and trusted

The paper measures compile-and-verify pass rates on real Trn1 hardware, by difficulty level and model, plus SFT data-quality progression. It does not provide confidence intervals; absolute differences of 1–2 tasks on 150 are within noise (table 1, p. 3). Trusted components include the Neuron SDK/compiler, PyTorch reference, random-input sampling, `torch.allclose`, generated dataset filters, LoRA/GRPO implementations, and single-run evaluation. The benchmark spans 250 tasks but the principal balanced result uses 150 (50 per level); every percentage above retains its denominator.

Inference: for VL, this paper's most transferable idea is a bounded compile–verify–fix loop with explicit typed diagnostics, while its strongest warning is that tool success on a finite dynamic sample is not a formal proof. Agent-written verified Rust should expose the same separation: compile and Verus-check after each candidate, preserve diagnostics, and cap repair turns. A model can still repeatedly produce a kernel that passes sampled tests while violating an unmodeled shape or memory invariant; encode those invariants in Verus contracts and retain hardware checks as complementary evidence.

## techniques for the catalog

- domain corpus synthesis — expand real operator seeds across shapes, dtypes, and fusions, then compile/execute/stability/baseline filter
- rank-aware prompting — select 2-D/3-D/4-D templates from input-shape metadata and require complete stores
- compile–verify–fix loop — iterate real-hardware compilation and reference comparison for up to ten turns
- curated LoRA SFT — train on quality-controlled domain episodes with frozen low-rank adaptation settings
- binary-reward GRPO audit — compare RL against SFT and treat sparse binary compilation reward as a tested failure mode

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
