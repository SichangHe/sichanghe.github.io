# GDEPO: Group Dual-dynamic and Equal-right Advantage Policy Optimization with Enhanced Training Data Utilization for Sample-Constrained Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `yan2026gdepo`, [paper](https://arxiv.org/abs/2601.06795)

## what the paper changes

Yan et al. propose GDEPO, a reinforcement-learning method for Lean theorem-proving agents. It modifies GRPO in three places: dynamic additional sampling keeps sampling a problem until a group contains a Lean-verified proof or a maximum is reached; equal-right advantage forces the verifier's binary correctness label to determine the update sign while auxiliary rewards determine magnitude; and dynamic additional iterations gives extra gradient steps to samples that become correct only after additional sampling. The abstract describes the goal as “resamples invalid batches until a valid proof is discovered” (Abstract, p. 1).

## technique 1: dynamic additional sampling

what it is: GRPO normally samples one fixed group of `G` completions for each query. If every completion is rejected by Lean, the batch has no positive binary signal and may be discarded. GDEPO resamples the same query until one completion is correct or a maximum number of rounds `n` is reached.

when to use it: use when difficult prompts have low but nonzero probability of producing a valid proof and all-invalid groups would otherwise contribute nothing.

how to do it:

1. initialize round counter `k=0` and sample `G` outputs for query `q`
2. run every output through Lean and record binary labels `l_i∈{1,-1}` plus auxiliary rewards `r_i`
3. if any `l_i=1`, stop and retain that round's group; otherwise increment `k` and sample the same query again
4. stop after the maximum `n` rounds even if no valid output appears
5. return the latest valid group, labels, and rewards for advantage computation (Algorithm 1, p. 4)

The paper formalizes the stopping condition as `∃ l_i=1` or the maximum round and says: “if the initial sampling for a query yields no correct output, the system performs additional sampling on the same query until either a valid output is obtained or a preset maximum number of attempts is reached” (Section III-A, p. 4).

evidence: the overall ablation uses 30,000 training problems with 30% challenging instances. With the Goedel-Prover-V2-8B baseline, dynamic additional sampling alone raises MiniF2F-test pass rate from 84.6% to 84.9%, MathOlympiadBench solved problems from 60 to 63, and PutnamBench solved problems from 25 to 36 (Table III, p. 9). The denominators are benchmark problem counts: MiniF2F-test has 244 problems, MathOlympiadBench 360, and PutnamBench 644 (Section IV-B, pp. 6–7), although Table III reports counts rather than recalculated percentages for the latter two. All reported results are averaged over 10 independent runs with distinct random seeds (Section IV-C, p. 7).

limits and Verus form: extra sampling multiplies Lean calls and can still fail at the maximum. The paper does not report the per-query round distribution, maximum `n` used in each experiment, or sampling cost.

## technique 2: equal-right advantage

what it is: standard GRPO normalizes a composite reward across a group. A correct trajectory can then receive a negative advantage if an auxiliary reward (length or repetition) is unfavorable. GDEPO computes the sign from Lean correctness alone and uses auxiliary reward only for update magnitude.

when to use it: use when combining verifier correctness with quality rewards such as repetition, concision, style, or proof length. It is most active when the group pass rate is below threshold `τ`; above `τ`, GDEPO reverts to conventional GRPO's normalized advantage.

how to do it:

1. for the valid group, compute weighted auxiliary score `S_i=Σ_k w_k r_{i,k}` with nonnegative weights summing to one
2. min-max normalize `S_i` within the group; if all scores are equal, use the paper's 0.5 fallback
3. when pass rate `c_q≤τ`, set per-token advantage to `l_i·L(l_i,Ŝ_i)`, where `l_i` is the Lean label and `L` interpolates magnitude from the normalized auxiliary score
4. when `c_q>τ`, use the standard normalized auxiliary advantage `r̃_i`
5. apply the same advantage to every token in a trajectory and optimize the clipped policy objective (Equations 5a–5c, Algorithm 2, pp. 5–6)

The paper states: “the sign of the advantage—i.e., the direction of policy update—is determined solely by the binary label from the verifier, while auxiliary rewards modulate only the magnitude” (Section III-B, p. 5).

evidence: Table II compares Goedel-Prover-V2-8B on the stated benchmark settings. Equal-right versus single-binary GRPO gives MiniF2F pass 85.3% versus 84.8% (244-problem denominator), MathOlympiadBench 62 versus 61 solved (360-problem denominator), and PutnamBench 31 versus 27 solved (644-problem denominator). It also lowers average tokens and repetition rate relative to the single-binary baseline in the same table. Composite-reward GRPO without equal-right gives 83.2% on MiniF2F, 59 and 24 solved on the two larger sets, so its correctness loss is visible under the paper's fixed 30,000-sample training settings (Table II, p. 9).

limits and Verus form: the guarantee about update direction is an analysis of the clipped policy objective, not a theorem that training converges. The reward weights, threshold `τ`, and auxiliary reward definitions remain hyperparameters.

## technique 3: dynamic additional iterations

what it is: allocate extra policy updates to medium-difficulty prompts that fail initially but become valid after resampling. Easy prompts and prompts still unsolved after all rounds receive one update; a prompt with a later-round valid group receives `m` consecutive updates.

how to do it:

1. inspect the retained group and its sampling round `k`
2. if at least one valid output exists and `k>1`, repeat the clipped policy update for iterations `0…m`
3. otherwise perform one update
4. return the updated policy (Algorithm 3, p. 6)

The paper's rationale is that later successes have higher instructional value: “the latter—requiring sustained search to succeed—deserve deeper RL attention” (Section III-C, p. 6).

evidence: in Table III, adding dynamic iterations on top of dynamic sampling raises MiniF2F from 84.9% to 85.8%, MathOlympiadBench from 63 to 64 solved, and PutnamBench from 36 to 41 solved; the full three-component system reaches 86.2%, 65, and 46 respectively (30,000-problem training set with 30% challenging samples; Table III, p. 9). The paper does not isolate dynamic iterations without dynamic sampling because the former depends on later-round outcomes.

limits and Verus form: repeated updates increase compute and can overfit a small set of successful hard examples. The method's “difficulty” is defined by sampling round, not by an independent theorem complexity measure.

## overall evaluation and contradictions

The main experiment trains GDEPO-Prover-8B on 30,000 samples with 30% challenging instances, learning rate `1×10^-6`, batch size 32, two epochs, bfloat16, DeepSpeed ZeRO-3, FlashAttention-2, AdamW, asymmetric clipping `ε_low=0.2`, `ε_high=0.28`, and no KL constraint (Section IV-D, p. 7). Table I reports GDEPO 86.2% on MiniF2F-test, 65 solved MathOlympiadBench problems, and 46 solved PutnamBench problems, compared with the Goedel-Prover-V2-8B baseline's 84.6%, 60, and 25 (Table I, p. 8). The Putnam count changes from 25 to 46, a gain of 21 solved problems out of the 644-problem benchmark; the abstract's phrase “84% gain on the most challenging PutnamBench” is consistent with the relative increase `(46−25)/25=84%`, not an 84 percentage-point accuracy gain.

Inference: the 10-run averaging statement applies to reported results, but the paper does not give standard deviations or confidence intervals, so statistical uncertainty is not quantified. Inference: gains are evidence that verifier-driven resampling and sign protection can improve this Lean setup, not evidence of transfer to Verus, Rust ownership, or concurrency.

## techniques for the catalog

- dynamic additional sampling — resample a failed theorem prompt until a verifier-accepted completion appears or a cap is reached
- equal-right advantage — use verifier correctness for policy-update sign and auxiliary rewards only for magnitude
- dynamic additional iterations — allocate extra gradient passes to samples that become valid after retries
- verifier-aware reward separation — keep formal acceptance distinct from length, repetition, and other shaping rewards
