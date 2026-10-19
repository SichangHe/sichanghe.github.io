# Kimina-Prover Preview: Towards Large Formal Reasoning Models with Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `numinakimiteam2025kiminaprover`, [paper](https://arxiv.org/abs/2504.11354)

## scope and result

The paper is authored by Numina & Kimi Team (title page, p. 1). Kimina-Prover is a Lean 4 theorem prover whose training pipeline combines autoformalized problems, supervised fine-tuning (SFT), and reinforcement learning (RL). Its central technique is to let a language model generate long structured reasoning and a complete Lean proof, then use Lean verification as a binary reward. The system avoids explicit best-first or Monte Carlo tree search at inference; the authors describe the model's reasoning tokens as implicitly exploring alternatives. The reported miniF2F-test result is 80.74% pass@8192, 68.85% pass@32, and 52.94% pass@1 for the 72B model (Table 1, p. 5). These are results on this benchmark at the stated sampling budgets.

Inference: the useful formal-verification lesson is the closed loop: construct formal problems, generate candidate proofs, run Lean, assign reward 1 only to a completely accepted proof, and stabilize training against format collapse. Inference: long reasoning is insufficient evidence of proof correctness; retain the verifier result. Compiler acceptance also cannot establish that a generated statement faithfully represents the informal problem (§2.1, p. 2).

The paper describes its intended search behavior this way: “This allows the model to emulate human problem-solving strategies, implicitly exploring the proof space and iteratively generating and refining proof steps through a process guided by its internal reasoning tokens.” (§1, p. 2)

## technique 1: autoformalization with expert iteration

What it is. The authors need a large supply of Lean 4 problems for online RL. They train an autoformalizer to translate natural-language statements into syntactically valid Lean 4 statements ending with a placeholder proof. Because statement correctness cannot be checked directly from natural language, they combine initialization, SFT, structured expert iteration, and an LLM judge (§2.1, p. 2). They release Kimina-Autoformalizer-7B.

When to use it. Inference: use autoformalization when manually writing enough formal tasks is too expensive, with compilation, semantic judging, and human review. Treat the outputs as candidate training problems rather than established translations.

How to do it. The paper's method is:

1. filter NuminaMath 1.5 for proof problems or explicit numeric/symbolic outputs, excluding geometry and combinatorics (Appendix C.1, p. 10)
2. fine-tune Qwen2.5-Coder-7B-Instruct on formal problem pairs from PutnamBench, miniF2F, ProofNet, and Compfiles (Appendix C.2.1, p. 10)
3. generate candidate formalizations, retain compilable ones, and use QwQ-32B to judge semantic correctness with multiple judge samples and unanimous voting; add accepted examples to the dataset and train again (Appendix C.2.2, pp. 10–11)
4. monitor with Lean experts and refine the judge prompt; add filters for contradictions, provable negations, and triviality (Appendix C.2.2, p. 11)
5. combine approximately 100k autoformalized statements with approximately 10k human-annotated statements, resampling the latter to a 1:1 ratio for 200k total training entries; use QwQ-32B preview difficulty ratings to balance difficulty (Appendix C.3, pp. 11–12)
6. prune consistently easy problems, send wrong or difficult statements for human annotation, and judge post-RL proofs for exploitation of formalization mistakes (Appendix C.3, p. 12)

Verus form. Inference: replace the Lean statement with a Rust function signature plus `requires` and `ensures`, and ask a model to translate an informal requirement into those contracts. Inference: run a Verus checker and a human or model judge, but keep the generated contract provisional until an independent review confirms that it states the intended property. Inference: include deliberately false or over-strong requirements so the agent learns to flag an impossible contract instead of adding `assume`, `admit`, or `external_body`.

Evidence and limits. The autoformalizer reaches 90% one-shot compilation and 66% accuracy on an approximately 1,000-problem human-curated test set. Accuracy means both compilation and approval by the LLM judge, whose prompt was optimized on that set (Appendix C.2.3, p. 11). The authors warn: “We note that this method required careful expert monitoring as we observe that the model would repeatedly make mistakes that the LLM judge model cannot catch, as long as it passed compilation.” (Appendix C.2.3, p. 11) Inference: the reported accuracy is a judge-based measure, not an independent guarantee of semantic correctness.

## technique 2: formal reasoning pattern and cold-start SFT

What it is. The model emits a `<think> ... </think>` block containing informal reasoning interleaved with Lean 4 snippets marked by special tokens, then emits the final proof between chosen delimiters (§2.2, pp. 2–3). Training filters for samples containing the pattern and requires most Lean snippets in the thinking block to appear in the final proof. The paper associates this pattern with increasing output length and proof complexity; it does not establish that all intermediate reasoning is correct.

Cold start procedure. Before RL, the authors collect olympiad-style problems with statements and solutions in both natural language and Lean 4. Claude 3.7 Sonnet synthesizes thinking blocks from those paired proofs, yielding about 20,000 mini-SFT examples (§2.2, p. 3). They mix in informal mathematical thinking data from Kimi k1.5 to broaden reflection patterns; they report better RL performance than with formal-only SFT. The paper states: “To enforce thinking block alignment with the final proof, we ensure that the majority of the Lean 4 code snippets appear in the final proof.” (§2.2, p. 3)

When to use it. Inference: use this format to train proof planning and case analysis, requiring overlap between intermediate code and the final proof. Such overlap constrains the format without validating the intervening prose.

Verus form. Inference: interleave prose with candidate assertions, proof functions, loop invariants, and termination measures, followed by the complete program and proof. Inference: train on verifier-accepted outputs and filter for overlap between the intermediate proof fragments and the final artifact.

Evidence and limits. Figure 4 and §3.2.4 (pp. 5–6) associate growth from 2,500 to over 10,000 output tokens with miniF2F pass@32 improving from 61.8% to nearly 69%. Inference: this correlation does not isolate the causal contribution of textual reasoning. Appendix F.2.1 (pp. 23–24) shows an incomplete case analysis whose generated Lean tactic fails. Inference: VL should retain verifier logs alongside reasoning traces.

## technique 3: RL with Lean binary rewards and format stabilization

What it is. After SFT, each RL iteration samples N = 1000 problems. For each problem, the current policy produces k = 8 candidate rollouts. Lean verifies every final candidate; reward is 1 for a completely correct proof and 0 otherwise (§2.3, p. 3). Training starts from Qwen2.5-72B and uses the Kimi k1.5 objective, a KL coefficient τ = 0.4, and constant learning rate 2 × 10−6. To prevent format collapse, each sample must contain at least one tactic block, tactic blocks must cover at least 60% of Lean code in the final solution, and samples with negative gradients are randomly discarded with probability ω = 0.5 (§2.3, p. 4).

The paper states: “The final Lean 4 code of each candidate is then rigorously verified using the Lean compiler to determine correctness.” (§2.3, p. 3)

When to use it. Inference: use verifier-based RL when a checker supplies a sufficiently cheap correctness signal. Apply format constraints if training loses the intended reasoning format. The paper specifically attributes early format collapse to negative gradients and limited SFT data (§2.3, p. 4).

How to do it.

1. sample a batch of 1,000 formal problems (§2.3, p. 3)
2. generate eight candidate proofs per problem (§2.3, p. 3)
3. compile each candidate with Lean and assign reward 1 only to a complete proof (§2.3, p. 3)
4. filter samples by the tactic-block constraints; discard each negative-gradient sample with probability 0.5 (§2.3, p. 4)
5. update the policy under the stated KL constraint and repeat (§2.3, pp. 3–4)

Verus form. Inference: use Verus verification success as the binary reward, with separate checks that executable behavior and contracts are unchanged. Inference: format constraints should require at least one proof construct and require candidate proof fragments to cover a stated fraction of proof obligations, while avoiding a fixed percentage that has not been validated for Verus. Inference: a safer reward tuple would include contract-preservation, verifier acceptance, and no forbidden escape hatch; a single “verifies” bit can reward a vacuous specification.

Evidence and limits. Inference: a positive reward records acceptance under the configured Lean environment; it does not independently establish fidelity to the natural-language theorem or audit the environment's assumptions. Inference: for Verus, record the tool version, imported specifications, and external-body assumptions with each accepted proof.

## technique 4: cached parallel verification and test-time scaling

What it is. Training and evaluation use the Numina Lean Server, built on LeanREPL. It caches preloaded environments by import headers with an LRU cache and runs many Lean REPL processes in parallel. The authors report a 10× verification-throughput speedup, up to 100 iterations per second on 64 CPU cores and 512 GB RAM, and 640 CPU cores for RL training (§3.1, p. 4).

The evaluation uses the Lean 4 miniF2F version from DeepSeek-ProverV1.5, 13-gram decontamination, removal of overlapping AMC12/AIME/IMO training problems, and correction of eight unsolvable benchmark statements (§3.1, p. 4). Each attempt is sampled independently with a context length of 32K and budgets up to 8,192 attempts.

When to use it. Inference: cache import environments when initialization is costly and parallelize independent candidate checks. Record the environment and compiler versions used for each result.

Verus form. Inference: a Verus service can cache parsed crates and run independent verification workers, but cache keys must include Rust, Verus, dependency, and specification revisions. Inference: stale cache reuse can make a proof appear valid under the wrong environment, so periodically force cold verification.

Evidence and limits. Inference: throughput measures checking capacity rather than proof quality. The paper reports correcting eight statements, not changing the benchmark's size (§3.1, p. 4). Inference: comparisons should account for benchmark statement and Lean-version differences; training-set decontamination does not change the evaluation denominator.

## results, trust, and threat to VL

Table 1 reports Kimina-Prover-Preview (72B) at 52.94% pass@1, 65.16% pass@8, 68.85% pass@32, 77.87% pass@1024, and 80.74% pass@8192 on miniF2F-test (p. 5). The 1.5B distilled model reaches 56.2% at 32 samples and 61.9% at 1,024; the 7B distilled model reaches 63.1% and 70.8% at those budgets (Table 1, p. 5). These smaller models receive SFT on 72B rollouts, starting from Qwen2.5-Math-Instruct models, with packing, cosine learning-rate scheduling, initial learning rate 2 × 10−5, and three epochs (§3.1, p. 4).

Table 2 (p. 6) reports miniF2F pass@32 of 68.85% for Kimina, 37.70% for gemini-2.5-pro-preview-03-25, and 24.59% for OpenAI o3-mini. The prose says o3 in §3.2.2, but the table identifies o3-mini. At pass@32, the IMO/AIME subset scores are 20.00%/46.67% for Kimina, 5%/13.33% for Gemini, and 0%/6.67% for o3-mini. At pass@8192, Kimina reaches 80.74% overall, 40.00% on IMO, and 86.67% on AIME; the table has no corresponding 8192-sample results for the other models.

Inference: trusting these results requires trusting the verification environment, benchmark statements, server, and evaluation implementation. Autoformalization and judging are additional sources of training-data error; Lean acceptance does not validate their semantic decisions. Inference: a Verus product should distinguish proving a generated contract from establishing that the contract captures the user's requirement.

Inference: the relevant competitive pressure on VL is automated proof generation with verifier feedback. The reported size comparison combines distilled 1.5B/7B models with a 72B RL-trained model, so it does not isolate model size from training procedure. Rust ownership, unsafe code, external crates, concurrency, and system-scale invariants are not evaluated here. Inference: VL could adapt the reward design to Verus, add prerequisite checks for contract preservation and forbidden proof bypasses, and evaluate repair under dependency changes. Compiler-feedback repair and external library search are future directions in this paper, not demonstrated parts of its inference pipeline (§4, p. 6).

## techniques for the catalog

- autoformalization with expert iteration — translate informal tasks into candidate Lean statements, judge them, and use accepted statements for prover training
- structured formal reasoning — interleave informal reasoning and Lean snippets, then require substantial snippet overlap with the final proof
- verifier-reward RL — sample multiple proofs, compile each, assign a binary reward only to complete Lean proofs, and optimize under KL control
- format-collapse filtering — require tactic-block coverage and discard unstable negative-gradient samples during RL
- cached parallel checking — reuse import environments with LRU caching and parallel Lean workers to raise verification throughput
- test-time scaling — sample independently at increasing pass@k budgets and measure the fraction of benchmark problems solved
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We note that this method required careful expert monitoring as we observe that the model would repeatedly make mistakes that the LLM judge model cannot catch, as long as it passed compilation."): checked the entire paper including appendices, all study quotations, numbers, section and page references, and technique steps; corrected author tag, paper link, search terminology, autoformalization procedure and metrics, SFT description, page references, benchmark comparisons, and unsupported conclusions; did not reproduce experiments, inspect released code or datasets, or validate the proposed Verus adaptations.
