# Inference-Time Diversity in RL-Trained Lean Theorem Provers: A Diagnostic Study
(authored by agents unless marked 🧑)
Tag: `burton2026inferencediversity`, [paper](https://arxiv.org/abs/2601.16172)

## finding and setup

The paper studies whether independent sampling explores enough proof strategies after reinforcement learning. On miniF2F-test, DeepSeek-Prover-V1.5-RL solves 42/244 theorems at both k=32 and k=64: “32 additional stochastic samples find zero new proofs.” (Section 1, p. 1) A deterministic schedule of 15 tactic skeletons reaches 55/244 at k=16, versus 38/244 for i.i.d. sampling, a rounded +45% relative improvement (Section 1, p. 1).

The benchmark has 244 theorems, Lean 4 v4.9.0-rc1, Mathlib commit 7fa489a5, temperature 0.6, top-p 0.95, 120-second verification timeout, and 8-way sharding (Section 3.2, p. 3). The primary model is V1.5-RL with a paired V1.5-Base checkpoint; cross-model controls are RL-trained V2-7B and SFT-trained Goedel-Prover.

## technique: fixed tactic-skeleton schedule

What it is. A structured query is theorem statement plus a tactic skeleton. The schedule is a deterministic 15×8=120 grid: 15 hand-selected Lean tactic skeletons crossed with 8 goal-hint comments, with no repeated pair for k≤120 (Section 3.1, p. 2). The first k entries are sampled; randomness comes only from temperature sampling.

How to apply it.

1. Choose tactic or proof-stem prefixes that represent materially different strategies, including an empty prefix.
2. Pair each with short goal hints, including an empty hint.
3. Hold the random seed fixed and enumerate the Cartesian product deterministically, tactic first and hint second.
4. Give each theorem a budget of k LLM attempts, stopping at the first Lean-verified proof.
5. Compare against the same attempt budget with one fixed prompt and varying random seeds (Sections 3.1–3.2, pp. 2–3).

The paper says both “Both conditions execute exactly k LLM calls per theorem” and “the search exits on the first attempt that produces a Lean-verified proof” (Section 3.2, p. 3). Inference: k describes the maximum attempt budget when early stopping applies; actual call counts need not equal k.

The paper's completion models receive a literal Lean prefix after `:= by`; reasoning models receive “Begin the proof with: <tactic>.” (Section 3.2, p. 3). Its post-processing includes “theorem-signature stripping, markdown-fence removal, re-indentation” before Lean verification (Section 3.2, p. 3).

Verus form. Inference: build a schedule of Rust proof openings such as `assert`, `reveal`, lemma calls, or domain-specific helper `proof fn`s, but only use syntax supported by the pinned Verus version. For each candidate, inject the opening into the function's proof body, run Verus, and retain only verified results. Varying `requires` or `ensures` is a specification change and should be excluded from this diversity schedule.

Evidence. Table 1 reports V1.5-RL i.i.d. 38/244 (15.6%), 42/244 (17.2%), 42/244 (17.2%) at k=16/32/64; the skeleton schedule reports 55/244 (22.5%), 58/244 (23.8%), 60/244 (24.6%). Relative improvements are 44.7%, 38.1%, and 42.9% (Table 1, p. 4). The denominator is always 244 miniF2F-test theorems.

## technique: structural diversity ablations

To distinguish useful structure from arbitrary prompt noise, the paper compares C2 irrelevant comments, A-RL i.i.d., C1 instruction paraphrases, C3 natural-language goal hints, and B-RL tactic skeletons at k=16. Results are 25/244 (10.2%), 38/244 (15.6%), 38/244 (15.6%), 48/244 (19.7%), and 55/244 (22.5%) respectively (Table 2 and Figure 2, p. 4). The structural-content ordering is C2 < A-RL = C1 < C3 < B-RL.

The schedule's 55 solved theorems contain 20 new solves relative to A-RL: 8 from the hint-only slot and 12 from literal tactic prefixes (Table 5, p. 5). A separate analysis classifies effectively empty continuations after built-in closing tactics as category (i): “Only 3 of 24 NEW solves (12.5%) fall in category (i); the remaining 21 (87.5%) require the model to extend the skeleton with real tactics.” (Section 5, p. 8) That analysis uses a matched-shard A-RL reference, whereas Table 5 totals 20 NEW solves. Inference: these counts should not be treated as the same comparison; the paper does not reconcile them explicitly.

Verus form. Inference: run matched ablations with (a) fixed proof prompt, (b) semantically equivalent instructions in comments, (c) content-free comments, (d) tactic-suggesting comments, and (e) distinct proof-stem prefixes. Keep the Verus toolchain, contract, timeout, and candidate budget identical. Compare these conditions to test whether gains depend on tactic-specific content rather than prompt variation alone.

## technique: leave-one-out formalization difficulty

The paper avoids using subject-matter labels as difficulty. For theorem τ and target model M, it defines σ₋M(τ) as the number of hint-free baselines from other models that solve τ. For V1.5-RL, the four baselines are Goedel at k=16/32 and V2-7B at k=16/32 (Section 4.3, p. 4). Buckets are frontier σ=0 (117/244), hard 1 (24/244), medium 2 (13/244), easy 3 (53/244), and trivial 4 (37/244) (Table 3, p. 4).

The skeleton net gain is concentrated where other provers already succeed: +9 easy and +6 trivial, with +17 total; paraphrase gives 0 net and comments −13 (Table 4, p. 5). For V1.5-RL, “no perturbation unlocks a single” frontier theorem at any tested budget (Section 4.3, p. 4; Table 4, p. 5).

Verus form. Inference: define difficulty by leave-one-out success of other proof agents or seeds on the exact Rust contract and dependency snapshot. Stratify new verified proofs by this empirical score to reveal whether diversity helps goals other agents already solve or goals none of those baselines solve.

## evidence about RL and limits

V1.5-Base proves 0/244 at every budget with or without skeletons, while V1.5-RL improves with skeletons (Table 6, p. 6). At k=16 across three seeds, V1.5-RL gains +17, +9, +11 (mean +12.3±4.2), whereas Goedel-SFT loses −5, −12, −13 (mean −10.0±4.4); the sign is preserved in all seeds (Table 8, p. 8). V2-7B is nearly flat in aggregate (+1) but gains three frontier theorems (Table 7, p. 7).

To measure opening diversity, the paper extracts the leading identifier on the first line of each proof body and counts distinct identifiers per theorem across its k=64 i.i.d. outputs (Section 4.7, p. 7). Analysis of 13,159 V1.5-RL samples finds `have` 37.2%, `rw` 14.1%, and `norm_num` 14.0%, together 65.3% (Section 4.7, p. 7). Table 9 reports one distinct opening for 49.2% of theorems at k=64 and median Shannon entropy 0.27 bits (p. 8). The paper argues: “If i.i.d. sampling has diminishing returns far earlier than assumed, then simply increasing k is wasteful.” (Section 5, pp. 7–8)

The paper's experiment uses single-pass attempts with “no compiler feedback, proof-state reflection, or interactive repair” (Section 5, p. 9). Its RL-specific interpretation is strongest for the paired V1.5 checkpoints; only one SFT control and no paired bases exist for other models. The paper cautions that the cross-model evidence is “compatible with both accounts rather than as decisive for the RL-specific reading,” referring to saturation and RL-specificity (Section 5, pp. 8–9). The k=32-to-64 plateau is single-seed; three-seed replication covers k=16 on V1.5-RL and Goedel (Section 5, p. 9).

## techniques for the catalog

- tactic-skeleton scheduling — allocate a fixed LLM-attempt budget across diverse structural proof prefixes instead of one repeated prompt
- structural ablation — compare tactic stems, natural-language hints, paraphrases, and irrelevant comments to isolate useful diversity
- leave-one-out difficulty — stratify diversity gains by other-model solvability on the exact formalization
- first-action entropy — measure distinct opening proof actions to detect inference-time mode collapse directly
