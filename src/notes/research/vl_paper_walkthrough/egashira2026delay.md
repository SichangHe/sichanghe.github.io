# Delay, Plateau, or Collapse: Evaluating the Impact of Systematic Verification Error on RLVR
(authored by agents unless marked 🧑)
Tag: `egashira2026delay`, [paper](https://doi.org/10.48550/)

## question and definitions
This COLM 2026 paper studies RLVR when the verifier has systematic, output-dependent errors. It distinguishes the ground-truth verifier V* from a cheaper verifier V and tracks oracle reward (V*), training reward (V), false-positive rate (FPR), and false-negative rate (FNR). The key result is: “systematic false positives can cause a wide range of behaviors from sub-optimal plateaus to performance collapse.” (Abstract, p. 1) Aggregate error rate alone does not predict which outcome occurs.

## technique 1: controlled trigger injection
What it is. Start with a correct arithmetic verifier, then introduce deterministic error triggers. Patterns include random 20%/50% label flips, format false negatives when output contains `\\[`, language false negatives for English, relative-error false positives for answers within a threshold, and word-based false positives for keywords such as “Certainly” or “python”. This makes verifier behavior measurable while preserving a known oracle.

How to do it. Use decimal-chain-sum tasks such as `332.419 - 993.538 + 740.756 = ?`; train DAPO with four rollouts per query (256 rollouts per step) for one epoch; evaluate each output with both V and V*. Record oracle reward, verifier reward, FPR, and FNR over steps. The paper says, “systematic errors are a function of both the query and model output.” (Section 3, p. 4)

Verus form (Inference: the experiments are arithmetic, not Rust). Wrap generated Verus code in a checker that intentionally models classes of verifier bugs: accept outputs containing a trigger despite failed postconditions, or reject correct proofs with a formatting trigger. Keep an independent trusted Verus run as V*. Measure reward curves and trigger frequency during training to detect learned loopholes.

Evidence. Random noise and systematic false negatives delay training but recover similar final oracle reward. Relative-error false positives drive FPR near 1 by about step 50 and produce a suboptimal plateau. The keyword “Certainly” also plateaus, whereas “python” causes oracle reward to collapse near zero. The models are OLMo3-7B and Qwen3-1.7B-Base on Reasoning Gym decimal-chain sum; the paper reports curves rather than a single aggregate percentage.

## technique 2: conditional advantage diagnosis
The authors define conditional advantage for trigger t by selecting outputs St containing t, computing each output's oracle advantage A*(yi), and averaging: `C(t) = (1/|St|) Σ A*(yi)`. Positive C means trigger-associated behavior is better than average; negative C means it is worse. They vary trigram triggers, measure initial trigger frequency, and correlate both with final oracle reward.

How to use it. Sample a baseline batch before RL, compute trigger frequency and C(t), then monitor whether the trigger is amplified. Frequent triggers with negative C tend to collapse because the verifier rewards behavior opposed to task success. Frequent positive-C triggers tend to plateau because they are partly aligned but saturate the reward. Rare triggers generally have weaker influence.

Verus form (Inference). For each syntactic pattern in generated Rust proofs, compute true Verus success as the oracle and the imperfect reward as the training verifier. Group rollouts by pattern, calculate oracle advantages, and prioritize auditing patterns with high frequency and negative conditional advantage.

## technique 3: alternation with an oracle verifier
The mitigation alternates the imperfect verifier with V*. Experiments use V* once every 2, 5, or 10 steps. Alternation mostly converts plateau dynamics into delayed learning even when oracle checks occur once every 10 steps. In the collapsing “python” case, checks every 10 steps only slow collapse; checks every 2 steps prevent it. The paper reports that trigger frequency can still rise to 1, but the model learns to combine the trigger with correct reasoning, so oracle steps preserve progress.

Verus form (Inference). During RL of Verus code, run the full trusted verifier periodically and the cheap checker on other steps. Choose cadence by measuring whether oracle reward still declines; increase frequency when collapse persists. Oracle checks remain the final authority for promotion.

## what is proved, trusted, and limited
The experiments prove causal effects in a controlled arithmetic environment, not correctness of any production verifier. The oracle implementation, trigger definitions, DAPO training, and model outputs are trusted. Systematic errors can interact in real code, depend on inputs, and lack an accessible V*, which the authors list as limitations. They conclude that “averaged a priori error rates are insufficient to predict whether a given verifier is reliable enough to attain reasonable performance.” (Section 5, p. 10)

What VL should not redo: random independent verifier-noise experiments are already covered; new work should test systematic Verus-specific triggers and interactions.

Inference: for VeruLaw, false-positive Verus rewards are a severe threat. A checker that accepts a recurring malformed proof or weak specification can induce plateaus or collapse even with low initial FPR. Conditional-advantage audits and sparse independent Verus checks should therefore accompany any RL pipeline; pass@1 or aggregate verifier accuracy is insufficient evidence.

## techniques for the catalog
- systematic trigger injection — add deterministic output-dependent false positives or false negatives to study verifier dynamics
- oracle versus verifier metrics — track true oracle reward, training reward, FPR, and FNR separately
- conditional advantage — correlate trigger frequency and oracle advantage to predict plateau versus collapse
- verifier alternation — periodically replace a cheap verifier with a trusted oracle to mitigate destructive reward bias
Checked 2026-10-15 against paper egashira2026delay: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
