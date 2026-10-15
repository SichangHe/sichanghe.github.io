# Improving Small Language Models for Code Generation with Reinforcement Learning from Verification Feedback
(authored by agents unless marked 🧑)
Tag: `skopin2026improving`, [paper](https://arxiv.org/abs/2605.30478)

## setup and finding
The paper tests reinforcement learning with verifiable rewards (RLVR) for Python code on MBPP using Qwen3-0.6B and Llama3.2-1B with LoRA adapters. It compares unit-test rewards, Ruff static-analysis rewards, and a combined reward under token-level GRPO and sequence-level GSPO. The paper's hypothesis is that static-analysis-only shaping can shorten outputs without improving correctness, while combined rewards are more stable. It reports: “RLVR improves pass@1 on MBPP test by up to 13 percentage points under proposed combined reward configuration.” (Abstract, p. 1)

## technique 1: graded unit-test reward
What it is. Execute each generated function against all MBPP tests and map outcomes to graded rewards: Passed 1.0; Assertion Error (including timeout) −0.3; Runtime Error −0.6; Interpreter Error or other −1.0. This supplies more signal than binary pass/fail.

How to apply it. Prompt with a problem and one example test, extract a self-contained function, execute it in the HumanEval-style harness, classify the first failure mode, and return the scalar. The paper gives the code shape `assert first_repeated_char("abcabc") == "a"`.

Verus form (Inference: the paper uses Python, not Verus). Compile generated Rust/Verus and run a suite of executable checks. Give full reward only when all tests pass; use distinct negative values for compile failure, panic/timeout, and assertion failure. Keep the graded mapping explicit and record the denominator of tests passed.

Evidence. On MBPP test, Qwen3-0.6B reaches 0.412 (GSPO unit) and 0.388 (GRPO unit), versus 0.273 normal; Llama3.2-1B reaches 0.379 and 0.375 versus 0.349. These are means ± SD over 10 test evaluations, with pass@1 defined as the fraction of tasks whose first sampled solution passes all tests.

## technique 2: Ruff static-analysis shaping and normalization
The static-only reward runs `ruff check --stdin-filename tmp.py --output-format=json`, maps findings to error/high/normal/low, and assigns −10.0/−5.0/−1.0/−0.2. The total is the sum over findings, or zero when there are none. To reduce length bias, divide by `max(1, L(y))` and clip to [−1,0]. The paper emphasizes: “Normalization reduces sensitivity to output length and discourages degenerate behavior in which the model minimizes penalties primarily by producing overly short code.” (Section 3.4.2, p. 6)

When to use it. Use as an auxiliary signal for style or static defects, not as the sole correctness objective. In the reported setup, Ruff-only decreases correctness: Qwen3-0.6B normal 0.273 versus 0.232 GSPO Ruff; Llama3.2-1B normal 0.349 versus 0.287 GSPO Ruff-normalized. These means are over 10 MBPP test runs.

Verus form (Inference). Run formatter/linter and Verus diagnostics, map severity to a bounded penalty, normalize by generated lines, and retain a separate proof-success reward. Lint cleanliness must not substitute for `verus!` proof checking.

## technique 3: pass-gated combined reward
Compute the graded test reward, normalized Ruff reward, and an anti-shortcut penalty (−0.5 if fewer than 30 characters or three lines). Add Ruff with λpass=0.3 when tests pass and λfail=0.1 otherwise; add the length penalty in either case. This gate prevents static penalties from dominating before functional correctness.

Verus form (Inference). Gate lint and style terms on successful compilation/proof or on the strongest verified postcondition, while retaining a small penalty for empty code. This separates semantic verification from proxy quality signals.

Evidence. For Qwen3-0.6B, combined GSPO and GRPO reach pass@1 0.417 and 0.415 (normal 0.273); for Llama3.2-1B they reach 0.383 and 0.389 (normal 0.349). The table reports mean ± SD over 10 runs. The paper also reports EvalPlus per-seed results (seeds 101 and 202), where combined rewards are not uniformly better than unit-test-only, so transfer to hidden tests is uncertain.

## technique 4: group-relative GRPO and GSPO
For each prompt, sample G=8 completions, calculate rewards, subtract the group mean to form each completion's advantage, and optimize a clipped policy objective. GRPO applies the importance ratio per token and shares the completion advantage across tokens. GSPO aggregates log-probability ratios across the sequence and applies clipping once per completion. Training uses LoRA rank 32, α 64, learning rate 1e−5, five epochs, temperature 0.9, max 768 tokens, ε=0.2, and no KL reference (β=0).

Verus form (Inference). Treat each generated proof/code candidate as a rollout, score it by compiler, Verus, and tests, normalize advantages within the rollout group, then apply a policy-gradient update. The paper's GRPO/GSPO equations do not prove Rust properties; they optimize the generator against external checks.

## what remains trusted and limitations
The unit tests, Ruff rules and severity map, execution harness, base model, and reward implementation are trusted. Correctness is measured on short MBPP tasks (374 train, 500 test, 90 validation, 10 prompt; 974 total) and selected EvalPlus hidden tests. The authors state that benchmarks are “short, mostly self-contained Python programming tasks with relatively small test suites,” so longer-horizon transfer is unknown. The abstract says “up to 13 percentage points,” while Table 1 shows Qwen3-0.6B combined GSPO improving from 0.273 to 0.417, a 14.4-point difference; the paper does not reconcile this discrepancy.

What VL should not redo: unit-test-only, Ruff-only, combined rewards, and GRPO versus GSPO have already been compared on MBPP; VL should focus on Verus-specific reward validity and longer-horizon tasks.

Inference: reward hacking remains a direct threat to agent-written verified Rust if linter or partial-proof rewards are allowed to outweigh complete Verus verification; the combined gate is a mitigation, not a proof of specification completeness.

## techniques for the catalog
- graded execution reward — map pass, assertion, runtime, and interpreter outcomes to distinct scalars
- normalized static-analysis shaping — sum severity penalties, divide by line count, and clip to a bounded range
- pass-gated reward combination — weight style penalties more after functional success and add an anti-empty penalty
- group-relative GRPO/GSPO — optimize token-level or sequence-level clipped objectives from within-prompt reward advantages
Checked 2026-10-15 against paper skopin2026improving: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
