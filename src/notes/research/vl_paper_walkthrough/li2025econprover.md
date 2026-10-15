# EconProver: Towards More Economical Test-Time Scaling for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2025econprover`, [paper](https://arxiv.org/abs/2509.12603)

## scope and result
EconProver measures theorem-prover inference by generated tokens and combines dynamic chain-of-thought (CoT) switching with diverse parallel-scaled reinforcement learning. The abstract says: “Our E CON P ROVER -GD achieves comparable performance while requiring only 12% of the sampling cost compared to the base model.” (Abstract, PDF p.1) In Table 1, on miniF2F-test (244 test problems), Goedel-Prover-V2-8B CoT scores 84.4% with 12.3k×32 token units, while EconProver-GD scores 84.0% with 2.9k×16 and relative cost 3× the non-CoT baseline (Table 1, p.7). On ProofNet-test (186 Lean 4 problems), the same rows are 28.5% versus 28.0%, with costs 15.2k×32 and 3.1k×16 (Table 1, p.7). These percentages are benchmark pass rates; the table does not report per-row confidence intervals.

## technique 1: dynamic CoT switching

when to use
Use a learned gate when easy problems are solved directly but hard proofs need extended reasoning. Their analysis found “roughly 83 % of the solved problems of Deepseek-Prover-V2-7B below IMO difficulty level are base-solvable” (Method §3.1, PDF p.5). The paper’s cost metric sums all tokens generated in every pass and refinement step (§2.1, p.2). It states: “The sampling cost is calculated as the sum of initial tokens generated in each pass and the tokens generated during all refinement steps.” (§2.1, p.2)

steps
1. Run a baseline on training problems and label each as Non-CoT-solvable or CoT-dependent by success pattern (§3.1, p.5)
2. For each problem, construct preference pair `(y_base,y_CoT)`. For base-solvable examples, direct proof is preferred and CoT is rejected; for CoT-dependent examples, CoT is preferred (§3.1, p.5)
3. Train with DPO, using the paper’s β=0.1 objective (§3.1, p.5)
4. Train on 15,000 balanced LeanWorkbook/Goedel-Pset pairs: 40% base-solvable and 60% CoT-dependent (§3.1, p.5)
5. At inference, use one prompt that lets the model choose direct proof or informal reasoning then formal proof; no external difficulty flag is supplied (prompt and §3.1, p.5)

Verus form
Inference: provide a Rust/Verus task and two generation modes: direct verified function, or an informal plan followed by a Verus proof. Train preference pairs from verifier-checked success. DPO remains model training, not Verus syntax. The generated artifact must use supported Verus contracts (`requires`, `ensures`) and proof functions; a successful gate must invoke Verus on the final code.

Evidence and limits
The paper’s ablation on DeepSeek-Prover-V2 reports Dynamic CoT 75.4% pass@32 and 1,186 average tokens versus Full CoT 75.8% and 4,488 tokens (Table 2, p.8); the authors state 99.7% of Full-CoT accuracy and 15% of its token usage. The denominator is the miniF2F-test benchmark under pass@32. Inference: these data do not show the classifier is semantically correct; it learns correlations from baseline outcomes and can misclassify distribution shifts. Low-temperature or prompt changes may alter the gate’s behavior. What remains trusted is the Lean checker and the training/evaluation data; the model’s internal difficulty judgment is not a proof.

## technique 2: difficulty-aware diverse parallel heads

when to use
Use this when many parallel samples repeat the same proof prefix and additional passes have diminishing returns. The paper measures Prefix Diversity Coverage by taking each attempt’s first 20 tokens, splitting into 3-grams, and measuring distinct-3-gram coverage relative to 512 attempts (§2.3, p.4). It observes +6.1% total gain from 8 to 32 passes but only +0.6% from 32 to 128 despite fourfold cost (§2.3, p.4).

steps
1. Run the base prover for 32 attempts and record success count `c(x)` for each problem (§3.2, p.5)
2. Sort by `c(x)` and split into n difficulty bins from easy to hard
3. Build shard `S_i` for each head with 50% examples from its bin and 50% uniformly sampled from other bins (§3.2, p.5)
4. Learn n lightweight prefix embeddings independently with PPO; reward is 1 for a verifier-correct proof and 0 otherwise (§3.2, p.5)
5. Use n=8 heads, and at inference allocate calls uniformly, e.g. Pass@16 gives 16/n calls per head (§3.2, p.5)

Verus form
Inference: prepend eight learned proof-search prefixes to equivalent Verus tasks, train each from Verus success rewards, and split data by verified success count. Uniform allocation is unchanged. The paper says: “This independent optimization framework allows each prefix to specialize in different proof strategies, thereby increasing the diversity and coverage of the parallel search process.” (§3.2, p.6) Prefix diversity is a search heuristic; Verus only certifies the resulting Rust proof.

Evidence and limits
Table 3 (p.9) shows DeepSeek non-CoT baseline Pass@16 65.6%, random eight heads 68.9%, and difficulty-aware eight heads 70.5%; Cover@8 is 74.3%, 74.8%, and 84.1%, respectively. Table 4 (p.9) shows CoT baseline Pass@16 73.0%, random heads 73.4%, and difficulty-aware heads 75.0%. These are miniF2F pass rates under the stated pass budgets. Inference: PDC is a proxy for search diversity, not a correctness guarantee, and prefix behavior may differ for Verus APIs.

## technique 3: token-level cost accounting and hybrid scaling

Count initial and refinement tokens across every pass (§2.1, p.2), then compare sequential CoT and parallel sampling on a performance-cost curve. Hybrid scaling combines both. The paper reports PS=8 at 63.1% versus sequential CoT 58.6%, using 443×8 versus 4,488 tokens (§2.2, p.3). Inference: VL should report verified-pass rate together with total generation tokens and Verus verification time; pass count alone hides this tradeoff.

## trusted boundary, contradictions, and product threat
Lean compilation verifies candidate proof terms, but data construction, preference labels, prefix training, and cost accounting remain outside the kernel. The 12% headline is a relative sampling-cost claim for the Goedel setting; Table 1’s EconProver-GD row reports relative cost 3× versus its non-CoT baseline, so the denominator must be stated. Existing VL should not redo generic token-cost plots without a Verus benchmark, because model/context and verifier overhead differ. Inference: EconProver threatens agent cost and latency more than logical soundness; independent Verus checking still determines acceptance.

## techniques for the catalog

- dynamic CoT switching — train DPO preferences that select direct proofs for base-solvable tasks and extended reasoning for hard tasks
- difficulty-aware prefix heads — partition by verified success count, train independent PPO prefix embeddings, and allocate calls uniformly
- prefix diversity coverage — measure distinct early proof n-grams as a proxy for redundant parallel exploration
- token-level scaling accounting — sum generated tokens over passes and refinement to compare cost with verified accuracy
Checked 2026-10-15 against paper li2025econprover: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
