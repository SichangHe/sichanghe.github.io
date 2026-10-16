# Tool Verification for Test-Time Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `liao2026tool`, [paper](http://arxiv.org/abs/2603.02203v2)

## scope and claim

Inference: This paper introduces T3 RL, a test-time reinforcement-learning loop that uses an external verifier and executable tools to turn unlabeled model rollouts into weighted pseudo-labels. Its target is false-popular mode collapse: majority voting can repeatedly reward a frequent wrong answer. The paper’s central claim is that verification evidence makes the online reward more reliable and improves math reasoning accuracy.

The paper describes the problem precisely: “However, the majority answer is not always correct.” It then identifies the mechanism: “If the model has a systematic bias, many rollouts may converge to the same wrong solution.” Inference: This is a reward-label integrity problem rather than a proof of the model’s reasoning; the verifier only changes which sampled traces receive reward.

### what it is and when to use it

Inference: Use this technique when inputs have no labels during adaptation, the model can generate multiple candidate traces, and a deterministic or independently checkable tool can test at least part of a trace. It is especially suited to tasks where solutions are difficult to generate but easy to execute or check, such as arithmetic, code, SMT constraints, or theorem-checker inputs.

The paper states: “We therefore ask: Can label-free test-time reinforcement learning be made robust to false-popular mode collapse?” Its answer is T3 RL, which “uses tools to verify candidate rollouts and constructs pseudo-labels through verification-weighted voting.”

### how to apply it

Inference: The following sequence is the paper’s method, with notation aligned to its equations and Appendix A pseudocode.

1. Inference: For prompt `x`, sample `N` rollouts `Y = {y_i}` from policy `πθ`; this is the sampling step in §4.1 and pseudocode lines 3–4.
2. Inference: Extract each rollout’s final answer `â_i = Extract(y_i)`; Eq. (3) and pseudocode lines 7–8 define this candidate answer.
3. Inference: Give each rollout to verifier `V`. The verifier turns the rationale into a lightweight Python program, asks the verification tool to execute it, and returns a binary validity flag `v_i ∈ {0,1}`; §4.1 and pseudocode lines 9–14 describe these operations.
4. Inference: Assign unit vote mass to an unverified rollout and mass `ω` to a verified rollout: `w_i = (1−v_i)·1 + v_i·ω`, where `ω ≥ 1`; this is Eq. (7).
5. Inference: Choose the answer with maximum weighted vote, `ỹ* = arg max_a Σ_i w_i·1[â_i=a]`; this is Eq. (8) and pseudocode line 18.
6. Inference: Give reward one to every rollout whose extracted answer equals `ỹ*`, and zero otherwise, `r_i^v = 1[â_i=ỹ*]`; this is Eq. (9) and pseudocode line 19.
7. Inference: Keep the TTRL policy-gradient objective but replace its majority label with `ỹ*`; Eq. (10) says the authors optimize this with GRPO in practice.

The paper’s compact implementation shape is:

```python
Y = policy.sample_rollouts(x, n=N)
for y in Y:
    a_hat = extract_answer(y)
    code = verifier.generate(x, y)
    t = sandbox.execute(code)
    v = verifier.judge(x, y, a_hat, t)
    vote[a_hat] += (1.0 if v == 0 else omega)
y_star = max(vote, key=vote.get)
rewards = [1.0 if a_hat == y_star else 0.0 for a_hat in A]
```

Inference: A practical setting reported in §5.1 uses 64 responses for label estimation, downsamples to 32 for training, a 2,560-token maximum, verifier generation capped at 1,024 tokens, temperature 0.6, AdamW with peak learning rate `5 × 10^-7`, and 8 NVIDIA A100 GPUs. Episode counts are 10 for MATH-500, 30 for AMC, and 80 for AIME 2024.

### Verus form

Inference: In Verus, the weighted-vote data path could be executable Rust, while the aggregation property could be specified and proved. A faithful skeleton uses `spec fn` for mathematical vote mass, `ensures` on a proof or executable function contract, `requires` for bounds such as `omega >= 1`, and `assert` or `assert forall` facts to discharge arithmetic. A loop would need a loop invariant; a sequence or map representation should match the chosen executable data structure. The external LLM, Python sandbox, and model sampling remain outside the Verus proof unless replaced by modeled inputs and explicit contracts.

Inference: The Verus analogue is therefore a proof that the returned label has maximal modeled weighted mass, not a proof that the LLM extracted the right answer, generated sound code, or that Python execution faithfully represents the original reasoning. This distinction follows Verus’s documented contract boundary: the proof establishes the written specification under its assumptions.

### evidence and limits

The paper reports three benchmarks (AIME 2024, AMC, and MATH-500) and five backbones. In Table 1(a), Qwen-2.5-Math-1.5B rises from TTRL `15.8 ± 2.1` to T3 RL `20.8 ± 1.6` on AIME 2024, from `48.9 ± 1.6` to `50.9 ± 2.7` on AMC, and from `73.0 ± 3.8` to `74.6 ± 3.2` on MATH-500. These are pass@1 averages: AIME averages 16 independent evaluations, while AMC and MATH-500 average 4, with temperature 0.6 and top-p 0.95. Across the 15 paired T3 RL–TTRL model/benchmark comparisons, the paper says T3 RL wins all 15.

Inference: The headline relative gains must retain their denominator. For example, the stated AIME gain of +31.6% for Qwen-2.5-Math-1.5B is relative to the TTRL score 15.8, because `(20.8−15.8)/15.8 ≈ 31.6%`; it is not a percentage of all AIME questions. The reported AIME “maximum relative improvement of 31.6%” therefore describes this model/benchmark comparison, not universal accuracy.

The paper measures verifier and tool contributions separately. Figure 6b reports AIME increasing from 18.3 to 20.8 with a 1.5B verifier when code execution is added, and from 20.0 to 21.7 with a 7B verifier. Table 2 reports self-verification on AIME at 16.7 (math 1.5B), 16.9 (Llama 3B), and 39.8 (Qwen3 4B), while the external verifier gives 20.8, 17.1, and 40.0 respectively; the TTRL baselines are 15.8, 13.3, and 36.4. The paper reports label flips on 5.40% of AIME 2024, 10.75% of AMC, and 12.87% of MATH-500.

The weight ablation shows why `ω` is soft rather than a hard filter. The paper reports the largest Qwen-2.5-Math-1.5B AIME gain at `ω=5` (+31.6%), with MATH-500 +2.2%; `ω=1` is TTRL, and `ω→∞` approximates filtering all unverified rollouts. Table 3 gives verifier accuracy of 73.2% for Qwen-2.5-Math-1.5B policy rollouts checked by Coder-1.5B, so a hard filter can discard true positives or keep false positives.

Inference: The reported percentages and score units are not interchangeable. Table 1 scores are pass@1 percentages averaged over runs; Table 3’s “Acc.” is verifier accuracy on policy rollouts; Figure 4’s false-majority share is a fraction of questions. The paper does not provide a single denominator for every plotted relative gain, so each comparison must retain its table or figure context.

### what it is and when to use it

Inference: Replace the Python arithmetic checker with a domain tool whose output can be compared to the extracted answer. The tool must produce external evidence rather than merely restating the rollout. The paper’s formal interface is `t_i = T(Code(x,y_i))` (Eq. 5), followed by `v_i = 1[t_i = â_i]` (Eq. 6).

For non-math generalization, the paper translates Knights-and-Knaves solutions into SMT-LIB2 constraints and executes them with Z3. Its example encodes “A says: ‘B is a knave.’” as `(assert (= A (not B)))` and “B says: ‘A and I are different.’” as `(assert (= B (xor A B)))`; Z3 reports `A=false` and `B=true`. Table 6 uses Qwen-2.5-VL-1.5B and reports base 52.13 ± 1.3, TTRL 48.58 ± 1.3, and T3 RL 78.50 ± 1.1, a +26.38 percentage-point gain over base.

Inference: For Verus, the domain checker can be modeled as a trusted input function with a contract, or its relevant decision procedure can be reimplemented and proved. A Rust wrapper can parse a candidate answer, call an external process outside the proof boundary, and pass back a result whose assumptions are explicit. The Verus proof can then establish the weighted aggregation conditional on `v_i` values; it cannot establish the soundness of an unmodeled Python interpreter or Z3 invocation.

### evidence and failure boundary

The paper’s cross-dataset experiment adapts on each of AIME, AMC, and MATH-500 and evaluates on all three targets. It reports all nine train–test pairs improving, mean +3.0 points, and mean run-to-run standard deviation decreasing from 2.38 to 2.18 (an 8.4% decrease). These results support transfer of the verification-shaped update across the three math datasets, while the Knights-and-Knaves result supports a narrower claim about a reliable SMT checker.

Inference: The method assumes that the verifier compiles the trace into a faithful checker. If the verifier copies a wrong answer into code, execution only proves that the copied code prints that answer. The paper’s Appendix C shows this failure for a 0.5B verifier: it “frequently exhibits severe instruction-following failures” and can output a hardcoded trace answer. It also reports malformed syntax, missing imports, and delimiter errors that cause execution failures.

## what is proved, measured, and trusted

Inference: No formal theorem about T3 RL’s learned policy is proved. The paper measures pass@1, verifier accuracy/precision/recall, vote flips, compute, and variance under specified models, datasets, temperatures, rollout counts, and episodes. The learned policy update, answer extractor, verifier LLM, generated program, sandbox, Python semantics, Z3 soundness, model weights, and benchmark labels are trusted or empirically assessed rather than verified by a proof assistant.

The paper reports that T3 RL@16 reaches AIME 20.0 versus TTRL@64 15.8 while using 147K versus 365K rollout tokens, 126 versus 324 seconds, and 3.0K versus 7.9K TFLOPs (Table 4). At inference, T3 RL uses 1,630 tokens per query; tool-verified majority with 16 samples uses 96K tokens and reaches AIME 20.8, AMC 51.5, and MATH-500 65.5, while T3 RL reaches 20.8, 50.9, and 74.6. Inference: These are separate training and per-query accounting regimes, so the apparent MATH-500 discrepancy reflects different methods and measurement settings, not a stated contradiction resolved by the paper.

## techniques for the catalog

- verification-weighted pseudo-labeling — sample unlabeled rollouts, verify each candidate, upweight verified answers by `ω`, and train against the weighted consensus
- executable trace checking — compile a rollout’s claimed computation into a restricted program, execute it in a sandbox, and compare output to the extracted answer
- domain solver verification — translate candidate logical claims into SMT-LIB2 constraints and use a solver such as Z3 as external evidence before reward assignment
- soft verifier weighting — use finite `ω>1` because noisy verifiers make hard filtering brittle; retain unit mass for unverified candidates
- verifier-capacity evaluation — measure verifier accuracy and run ablations with self, external, and undersized verifiers before trusting verification-shaped updates
