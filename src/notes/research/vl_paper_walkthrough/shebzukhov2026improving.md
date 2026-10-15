# Improving Lean4 Autoformalization via Cycle Consistency Fine-tuning
(authored by agents unless marked 🧑)
Tag: `shebzukhov2026improving`, [paper](http://arxiv.org/abs/2603.24372v1)

## objective and result
This Stanford CS224N project fine-tunes Qwen3.5-2B to translate natural-language mathematics into Lean4 theorem declarations. It compares supervised fine-tuning (SFT) with and without difficulty curriculum and reinforcement learning (RL) with a cycle-consistency reward. The reward translates NL to Lean4, back-translates Lean4 to NL′, and computes cosine similarity between sentence embeddings. The abstract reports mean cycle consistency 0.669 versus 0.513 on held-out FineLeanCorpus (FLC) and 0.561 versus 0.422 on PutnamBench, with cross-entropy increasing by 0.011 nats.

Inference: the method transfers to Verus as a semantic ranking signal for generated Rust specifications, but its reward is not a proof. A candidate must still compile and satisfy Verus contracts. This is an inference because the experiment targets Lean4 and uses `sorry` placeholders.

## technique 1: cycle-consistency objective
The paper defines two models: `f_theta : S → L` maps natural-language statements to Lean4 declarations, and frozen `g_phi : L → S` maps Lean4 back to natural language. For statement `s`, the score is `C_theta(s) = cos(e(s), e(g_phi(f_theta(s))))`, where `e` is all-MiniLM-L6-v2 (Section 3.1, p. 2). The same score is the RL reward and primary evaluation metric. The authors motivate it by saying, “a good formalization l̂ = f(s) of a statement s should allow a back-translator g to recover the original meaning” (Section 1, p. 2).

Step by step: fine-tune NL→Lean and Lean→NL models independently with SFT; freeze the back-translator; generate Lean completions for each NL prompt; greedily back-translate each completion; embed original and reconstructed text; compute cosine reward; optimize the NL→Lean model with GRPO (Sections 3.1 and 3.4, pp. 2–3).

Inference: for VL, one can ask a model to emit a Rust/Verus contract, render the contract into a normalized natural-language summary, and reward agreement with the original requirement. The Verus compiler must be an additional hard reward or filter because embedding similarity can accept vacuous or wrong specifications.

## technique 2: parameter-efficient LoRA fine-tuning
The base is Qwen3.5-2B. LoRA adapters update only feed-forward `gate_proj`, `up_proj`, and `down_proj` modules, with rank 16 and scaling alpha 32. This yields approximately 9.4 million trainable parameters out of 2 billion; attention layers are excluded (Section 3.2, p. 2). Inputs are truncated to 512 tokens and training uses bfloat16. SFT data removes duplicates, compiler errors, and examples with TF-IDF cosine similarity above 0.5 to PutnamBench problems (Section 3.3, p. 3).

Inference: LoRA can adapt an NL-to-Verus generator on one GPU while leaving the base model unchanged. The target modules and rank must be re-tuned for the chosen Rust corpus; the paper supplies no Verus experiment.

## technique 3: curriculum versus shuffled SFT
The filtered SFT set contains 74.7k training and 3.93k validation examples across difficulty levels 1–10, capped at 10k examples per level. Curriculum SFT trains one epoch at difficulty 1, then 2 through 10, carrying the adapter forward. The ablation trains the identical data in one shuffled pass. Both use AdamW, learning rate 2×10^-4, cosine scheduling, 3% warmup, effective batch size 32, and cross-entropy (Section 3.3, p. 3).

The FLC held-out set has 700 examples, 100 per difficulty 1–7; difficulty 8–10 are absent from final evaluation because they were used for training (Section 4.1, p. 3). Table 1 gives FLC cycle scores 0.519 (no curriculum) and 0.513 (curriculum), with PutnamBench scores 0.432 and 0.422 respectively. Mann–Whitney tests find no significant difference: FLC p=0.46 and PutnamBench p=0.32 (Section 4.4, p. 4).

Inference: a VL training pipeline should measure curriculum against shuffled data at equal examples and optimizer budget; this paper found no benefit at its scale. It does not justify omitting curriculum for larger models or a different proof corpus.

## technique 4: GRPO with cycle reward
RL starts from the curriculum SFT checkpoint. The RL prompt set excludes SFT train and validation examples, stratifies at most 1,000 prompts per difficulty 1–7, and contains 7.7k prompts (Section 3.4, p. 3). For each prompt, GRPO samples G=8 completions. Rewards are normalized as `A_hat_i = (r_i - mu_r)/(sigma_r + epsilon)`. The policy maximizes a clipped surrogate objective with KL penalty beta·D_KL(f_theta || f_theta_ref), beta=0.04. RL uses learning rate 10^-5, batch size 1, gradient accumulation 16, and one epoch (Section 3.4, p. 3; Section 4.3, p. 4).

The run uses two L40S GPUs, 323 optimizer steps, and average reward latency 23.5 seconds per step. It was interrupted at step 100 and resumed; the paper reports a transient reward drop at the resume point (Section 4.3, p. 4).

Evidence: RL reaches 0.669 FLC and 0.561 PutnamBench, versus 0.513 and 0.422 for curriculum SFT. Improvements are 0.156 and 0.139, with p<10^-65 and p<10^-56 respectively (Section 4.4, p. 4). Cross-entropy on 3,932 FLC validation examples is 0.691 for RL versus 0.680 for curriculum SFT and 0.640 for shuffled SFT (Table 1, p. 4). The denominator 3,932 is the validation split stated in the caption.

Inference: Verus could use a GRPO-like policy update where reward combines semantic requirement preservation with successful Verus verification. A failed compile should receive a sharply lower reward than a merely low-similarity summary. KL regularization can limit drift from a known compiling generator.

## limitations and trust boundary
The paper explicitly cautions that “Cycle consistency is a proxy metric with several failure modes.” (Section 6, p. 8.) All generated theorem statements use `sorry` as a proof placeholder, so compilation tests syntax rather than mathematical truth (Section 6, p. 8). The frozen back-translator can bias both reward and evaluation, and it sometimes echoes the original statement, producing perfect reward for poor Lean4. The authors call this “a clear instance of reward hacking enabled by the metric’s blind spot.” (Section 6, p. 8.)

The paper also observes that RL gains decline from 0.208 at difficulty 1 to 0.126 at difficulty 7 because the back-translator's reward becomes noisier (Section 5, p. 5). FLC may contain repeated Lean patterns; PutnamBench is treated as the more conservative estimate because it is more diverse (Section 5, p. 6). Small domain groups are unreliable: FLC discrete mathematics has n=13 and PutnamBench probability n=14 (Section 5, p. 5).

Inference: for VL, the trusted base is the Verus checker and specification, not the embedding model, back-translator, RL reward, or `proof fn` text. A generated `ensures` clause can be semantically wrong while compiling if the precondition is too strong or the postcondition is vacuous. Product evaluation must therefore report proof success, requirement fidelity, and specification audits separately.

## what VL should reuse and avoid repeating
Inference: the paper already covers cycle-consistency rewards, LoRA-only adaptation, curriculum ablation, GRPO group normalization, KL-constrained updates, decontamination, and held-out cross-domain evaluation. VL should treat these as baselines. The unresolved research opportunity is a reward that couples natural-language fidelity to actual Verus proof success without allowing vacuous contracts.

## techniques for the catalog
- cycle-consistency reward: back-translate generated formal code and reward embedding similarity to the original statement
- LoRA autoformalization: adapt only feed-forward projections with low-rank adapters for single-GPU training
- curriculum ablation: compare difficulty-ordered SFT with identical shuffled data and budget
- GRPO semantic tuning: sample groups of completions, normalize rewards, and optimize a KL-constrained clipped objective
- proof-aware reward design: combine semantic round-trip quality with a hard formal-check result to avoid proxy reward hacking
Checked 2026-10-15 against paper shebzukhov2026improving: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
