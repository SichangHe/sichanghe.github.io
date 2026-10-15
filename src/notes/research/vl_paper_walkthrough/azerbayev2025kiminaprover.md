# Kimina-Prover Preview: Towards Large Formal Reasoning Models with Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `azerbayev2025kiminaprover`, [paper](https://doi.org/10.48550/arxiv.2504.11354)

## scope and result

Kimina-Prover is a Lean 4 theorem prover trained with autoformalization, supervised fine-tuning (SFT), and reinforcement learning (RL). Its central technique is to let a language model generate long structured reasoning and a complete Lean proof, then use Lean compilation as a binary reward. The system avoids an explicit breadth-first or Monte Carlo tree search at inference; the model's own reasoning tokens implicitly explore alternatives. The reported miniF2F-test result is 80.74% pass@8192, 68.85% pass@32, and 52.94% pass@1 for the 72B model (Table 1, p. 4). These are sample-budget pass rates, not percentages of all Lean theorems.

The useful formal-verification lesson is the closed loop: construct formal problems, generate candidate proofs, run Lean, assign reward 1 only to a completely accepted proof, and stabilize training against format collapse. A second lesson is negative: a model can generate long, persuasive reasoning while still emitting invalid Lean, so every quality claim must use the compiler as oracle.

The paper describes its intended search behavior this way: “This allows the model to emulate human problem-solving strategies, implicitly exploring the proof space and iteratively generating and refining proof steps through a process guided by its internal reasoning tokens.” (§1, p. 2)

## technique 1: autoformalization with expert iteration

What it is. The authors need a large supply of Lean 4 problems for online RL. They train an autoformalizer to translate natural-language statements into syntactically valid Lean 4 statements ending with a placeholder proof. Because statement correctness cannot be checked directly from natural language, they combine initialization, SFT, structured expert iteration, and an LLM judge (§2.1, p. 2). They release Kimina-Autoformalizer-7B.

When to use it. Use autoformalization when manually writing enough formal tasks is too expensive, but only after adding filters that catch malformed, trivial, or semantically wrong statements. It is suitable for generating candidate training problems, not for establishing that an informal theorem was faithfully formalized.

How to do it. The paper's method is:

1. collect natural-language mathematics and formal Lean examples (§2.2, p. 2)
2. supervised-fine-tune an autoformalizer to produce a Lean statement with a proof placeholder (§2.1, p. 2)
3. use structured expert iteration and an LLM judge to improve statement quality (§2.1, p. 2)
4. pass accepted statements into the formal-proof training set; rely on Lean later to reject unprovable proof attempts (§2.1–§2.3, pp. 2–3)

Verus form. Inference: replace the Lean statement with a Rust function signature plus `requires` and `ensures`, and ask a model to translate an informal requirement into those contracts. Inference: run a Verus checker and a human or model judge, but keep the generated contract provisional until an independent review confirms that it states the intended property. Inference: include deliberately false or over-strong requirements so the agent learns to flag an impossible contract instead of adding `assume`, `admit`, or `external_body`.

Evidence and limits. The paper does not report autoformalizer precision, judge agreement, or the fraction of generated statements that survive later proof training. Inference: this unmeasured front end can dominate downstream results, because a prover evaluated only on easy or misformalized statements may appear stronger than it is.

## technique 2: formal reasoning pattern and cold-start SFT

What it is. The model emits a `<think> ... </think>` block containing informal reasoning interleaved with Lean 4 snippets marked by special tokens, then emits the final proof between chosen delimiters (§2.2, p. 2). Training filters for samples containing the pattern and requires most Lean snippets in the thinking block to appear in the final proof. This aligns visible reasoning with compilable proof text and yields longer outputs as training progresses.

Cold start procedure. Before RL, the authors ask Claude 3.7 Sonnet to synthesize a mini-SFT set of about 20,000 olympiad examples containing natural-language solutions and formal Lean solutions (§2.2, p. 2). They mix this with informal mathematical thinking data from Kimi k1.5 because formal-only SFT produced narrow, repetitive reflection. The paper states: “To enforce thinking block alignment with the final proof, we ensure that the majority of the Lean 4 code snippets appear in the final proof.” (§2.2, p. 2)

When to use it. Use a structured reasoning format when proof generation requires planning, case analysis, and iterative correction that a one-shot tactic completion cannot express. Require a syntactic relationship between intermediate code and the final proof so the reasoning channel cannot drift entirely away from executable content.

Verus form. Inference: a Verus reasoning block can interleave prose with candidate `assert`, `lemma`, `invariant`, and `decreases` fragments, followed by a complete Rust function and proof. Inference: train on accepted Verus outputs and reject examples whose reasoning claims a fact absent from the final proof. Verus erases proof code at runtime, so the final artifact must still separate executable code from proof-only functions.

Evidence and limits. The paper correlates longer outputs with higher pass rates but does not show that the textual reasoning itself causes the gain. The model's reasoning tokens are not a proof object; only Lean acceptance is proof evidence. Inference: VL should treat chain-of-thought as a search trace and retain verifier logs as the authoritative artifact.

## technique 3: RL with Lean binary rewards and format stabilization

What it is. After SFT, each RL iteration samples N = 1000 problems. For each problem, the current policy produces k = 8 candidate rollouts. Lean compiles every final candidate; reward is 1 for a completely correct proof and 0 otherwise (§2.3, p. 3). The policy is optimized with the Kimi k1.5 objective, using a KL coefficient τ = 0.4 and constant learning rate 2 × 10−6. To prevent format collapse, each sample must contain at least one tactic block, tactic blocks must cover at least 60% of Lean code in the final solution, and samples with negative gradients are randomly discarded with probability ω = 0.5 (§2.3, p. 3).

The paper states: “The final Lean 4 code of each candidate is then rigorously verified using the Lean compiler to determine correctness.” (§2.3, p. 3)

When to use it. Use verifier-based RL when a checker can provide a reliable, cheap, binary signal and proof text is too structurally complex for supervised imitation alone. Use format constraints when RL otherwise learns to shorten, omit tactics, or exploit reward-model artifacts.

How to do it.

1. sample a batch of 1,000 formal problems (§2.3, p. 3)
2. generate eight independent candidate proofs per problem (§2.3, p. 3)
3. compile each candidate with Lean and assign reward 1 only to a complete proof (§2.3, p. 3)
4. discard or filter samples that violate tactic-block coverage; randomly discard half of negative-gradient samples (§2.3, p. 3)
5. update the policy under the stated KL constraint and repeat (§2.3, p. 3)

Verus form. Inference: use Verus verification success as the binary reward, with separate checks that executable behavior and contracts are unchanged. Inference: format constraints should require at least one proof construct and require candidate proof fragments to cover a stated fraction of proof obligations, while avoiding a fixed percentage that has not been validated for Verus. Inference: a safer reward tuple would include contract-preservation, verifier acceptance, and no forbidden escape hatch; a single “verifies” bit can reward a vacuous specification.

Evidence and limits. The binary reward proves only that Lean accepted the generated statement and proof under the configured environment. It does not prove the natural-language theorem, library correctness, or absence of axioms. Inference: for Verus, report the exact tool version, imported specifications, and any external-body assumptions with every reward.

## technique 4: cached parallel verification and test-time scaling

What it is. Training and evaluation use the Numina Lean Server, built on LeanREPL. It caches preloaded environments by import headers with an LRU cache and runs many Lean REPL processes in parallel. The authors report a 10× verification-throughput speedup, up to 100 iterations per second on 64 CPU cores and 512 GB RAM, and 640 CPU cores for RL training (§3.1, p. 4).

The evaluation uses the Lean 4 miniF2F version from DeepSeek-ProverV1.5, 13-gram decontamination, removal of overlapping AMC12/AIME/IMO training problems, and correction of eight unsolvable benchmark statements (§3.1, p. 4). Each attempt is sampled independently with a context length of 32K and budgets up to 8,192 attempts.

When to use it. Cache parser/import environments when verification startup dominates proof generation. Parallelize independent candidate checks, but record whether cached state, imports, and compiler versions are identical across candidates.

Verus form. Inference: a Verus service can cache parsed crates and run independent verification workers, but cache keys must include Rust, Verus, dependency, and specification revisions. Inference: stale cache reuse can make a proof appear valid under the wrong environment, so periodically force cold verification.

Evidence and limits. The throughput number is a systems measurement, not a proof-quality metric. The benchmark's decontamination and eight corrected problems change the denominator relative to earlier miniF2F reports; comparisons are meaningful only when the exact corrected set and Lean version match.

## results, trust, and threat to VL

Table 1 reports Kimina-Prover-Preview (72B) at 52.94% pass@1, 65.16% pass@8, 68.85% pass@32, 77.87% pass@1024, and 80.74% pass@8192 on miniF2F-test (p. 4). The 1.5B distilled model reaches 56.2% at 32 samples and 61.9% at 1,024; the 7B distilled model reaches 63.1% and 70.8% at those budgets (Table 1, p. 4). Table 2 reports 68.85% versus Gemini 37.70% and o3 24.59% at pass@32, and 80.74% versus 40.00% and no o3 value at pass@8192 for the miniF2F/IMO/AIME subsets as shown (p. 5). These denominators are benchmark problems and independently sampled attempts; pass@k is the fraction of problems solved by at least one of k samples.

The paper's primary measured fact is Lean acceptance. Trusted components include Lean's kernel and compiler, imported libraries, benchmark statement correctness, the Numina server, sampling implementation, and the training data's autoformalization and judging. The model's informal reasoning, the LLM judge, and the generated specification remain untrusted until checked by Lean. Inference: a Verus product should preserve this distinction and never describe a verifier-accepted generated contract as evidence that the contract captures the user's requirement.

Inference: threat to VL is high for specification and environment drift, and moderate for proof-search automation. Kimina demonstrates that long-reasoning RL plus verifier rewards can scale from 1.5B to 72B and exploit larger test-time budgets. It does not address Rust ownership, unsafe code, external crates, concurrency, or system-scale invariants. VL should not redo a generic Lean prover; it should adapt the closed-loop reward design to Verus, add contract-preservation and anti-cheating gates, and measure proof repair under dependency changes.

## techniques for the catalog

- autoformalization with expert iteration — translate informal tasks into candidate Lean statements, judge them, and use accepted statements for prover training
- structured formal reasoning — interleave informal reasoning and Lean snippets, then require substantial snippet overlap with the final proof
- verifier-reward RL — sample multiple proofs, compile each, assign a binary reward only to complete Lean proofs, and optimize under KL control
- format-collapse filtering — require tactic-block coverage and discard unstable negative-gradient samples during RL
- cached parallel checking — reuse import environments with LRU caching and parallel Lean workers to raise verification throughput
- test-time scaling — sample independently at increasing pass@k budgets and measure the fraction of benchmark problems solved
Checked 2026-10-15 against paper azerbayev2025kiminaprover: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
