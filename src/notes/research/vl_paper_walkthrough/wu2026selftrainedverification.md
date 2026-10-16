# Self-Trained Verification for Training- and Test-Time Self-Improvement
(authored by agents unless marked 🧑)
Tag: `wu2026selftrainedverification`, [paper](http://arxiv.org/abs/2605.30290v2)

## scope and result

This paper trains a verifier without human feedback annotations by giving a teacher model the reference solution, then distilling its verdict and diagnostic feedback into a student that sees only the problem and attempted solution. The resulting self-trained verification (STV) supports verification–refinement (V-R) loops at test time. A second procedure, verifier-in-the-loop (ViL) training, trains a generator inside those loops using a frozen STV verifier. The experiments use Qwen3 models on hard math and scientific reasoning. The evidence concerns answer correctness on benchmark problems; it does not establish correctness of arbitrary generated programs or specifications.

## technique 1: reference-conditioned teacher and on-policy distillation

What it is. In a V-R loop, a generator emits `y_0`; at each round the verifier returns `(v_r,f_r)`, where the verdict is accept/reject and feedback is natural language. On rejection the generator refines using the feedback. STV defines a student `V_θ(·|x,y_{r−1})` without a reference and a teacher `V*(·|x,y_{r−1},y*(x))` that receives the ground-truth solution. Both use the same model under different prompts. The student is trained to match the teacher's full output distribution with on-policy distillation (OPD), using α-divergence with α=0.5 (Jensen–Shannon), plus verdict RL.

The paper's key observation is exact: “while a model cannot reliably generate feedback for the attempted solution from scratch, it can locate logical gaps when shown the reference solution alongside the attempt, and this reference-conditioned distribution becomes a natural supervision target.” (Section 3, p. 3). This converts privileged information available during training into a feedback capability available at test time.

When to use it. Use this method when correctness labels are available but actionable error explanations are not. It is designed for long V-R loops where an untrained verifier's score can inflate while accuracy stagnates and where generic feedback gives the generator no repair direction.

How to apply it.

1. Collect generator rollouts `(x,y_{r−1})` from training prompts (Section 3, p. 3).
2. Prompt the teacher with the problem, attempted solution, and ground-truth solution; record its verdict and feedback distribution (Section 3, p. 3).
3. Prompt the student with only the problem and attempt; minimize OPD divergence between student and teacher distributions (equation 2, Section 3, p. 3).
4. Add verdict-RL with reward `I[v_r = I[y_{r−1}=y*(x)]]` and optimize `L_STV=L_OPD+λL_RL` (Section 3, p. 3).
5. At test time, remove the reference and run the student in the V-R loop: accept, or refine with feedback, until acceptance or R rounds (Problem Formulation, p. 3).

The authors compare OPD with ordinary SFT. “On the models and datasets we experimented with, we see that OPD improves the V-R performance while SFT fails.” (Section 3, p. 3). They attribute SFT's failure to off-policy prefixes: the student encounters its own outputs at test time, not just teacher-generated sequences.

Verus form (Inference). Replace the reference solution with a trusted reference implementation, specification, or proof certificate during training. The student can learn to inspect a candidate Rust/Verus proof and produce a diagnostic; at deployment it sees only the candidate and specification. The actual acceptance must still be `verus` compilation and specification checks. OPD, α-divergence, and verdict RL are training algorithms outside Verus. Inference: a reference proof may teach useful error localization, but if the reference specification is wrong, distillation faithfully reproduces that error.

Evidence and limits. The student and teacher share model weights but differ in prompts, so teacher quality and reference correctness are trusted. The method does not prove that natural-language feedback is complete; only the final benchmark verifier labels determine reward.

## technique 2: verifier-guided refinement with calibrated feedback

What it is. Keep the generator fixed and compare verifier training methods over up to 20 rounds. Baselines include no verifier training, verdict-only RL, a meta-verifier RL proxy, and SFT on teacher traces. STV's verifier returns both a verdict and feedback, allowing the generator to refine the latest solution rather than merely resample.

How to apply it.

1. Split hard problems by base-generator pass@1 estimated with 32 rollouts: Hard has `0 < pass@1 < 0.2`; Hardest has pass@1=0 (Section 5.1, p. 4).
2. Remove test items with cosine similarity above 0.8 to any training item using text-embedding-3-large, leaving about 150 problems per test bin (Section 5.1, p. 4).
3. For each test problem, run 32 independent V-R loops for up to 20 rounds (Section 5.1, p. 4).
4. Compare final-round pass@1 and round-by-round precision/coverage against the baseline verifiers (Sections 5.2 and 5.5, pp. 4–7).
5. Stop each loop on acceptance or after the round budget; retain the final answer for correctness scoring (Problem Formulation, p. 3).

Evidence. On the base Qwen3-8B generator, STV lifts final-round pass@1 by up to 2× over the untrained-verifier pipeline with p<0.01; on Hardest it reaches 5.5% and on Hard 27.4%, versus Qwen3-32B without verification at 2.7% and 17.8% (Section 5.2, p. 5). On SciKnowEval, Table 1 reports Hardest/Hard pass@1 of 1.5/11.5 with no verification, 2.1/11.4 with no verifier training, and 21.0/42.4 with STV (Table 1, p. 5; denominators are the respective test-bin problems). The authors state: “STV lifts pass@1 by an order of magnitude on Hardest and nearly 4× on Hard.” (Section 5.2, p. 5). The comparisons use 32 loops per problem and up to 20 rounds, so percentages are not single sampled trajectories.

The paper diagnoses calibration: “Without training, verifier scores increase over rounds while accuracy stagnates.” (Section 5.5, p. 7). STV's precision–coverage curve instead improves with rounds, indicating that accepted solutions become more likely correct. It also beats resampling at matched compute, which the authors interpret as structured exploration from actionable feedback.

Verus form (Inference). Use a generator–verifier loop where the verifier proposes a repair and explanation, but gate each repair by compiling with `verus`; retain the last compiling proof as the prefix. A natural-language score should be treated as diagnostic only. Relevant Verus constructs are `requires`, `ensures`, loop `invariant`, `assert`, and `proof fn`; no Verus construct corresponds to the paper's accept token or feedback distribution. Inference: a hidden compiler/test harness can provide the final verdict while exposing selected diagnostics for repair.

## technique 3: weak-to-strong verifier training

What it is. STV can train a smaller verifier to evaluate a larger generator. On the 8B generator, untrained 4B and 1.7B verifiers perform no better than 8B self-verification; after STV, 4B reaches pass@1 26.4% versus 27.4% for 8B STV, and 1.7B reaches 21.7% versus 20.6% for an untrained 8B verifier (Section 5.3, p. 6; same Hard bin and round protocol as above).

When to use it. Use it to reduce test-time cost when verifier outputs are shorter or cheaper to train than generator outputs. The method is useful only if the smaller verifier is trained on on-policy attempts from the target generator distribution.

How to apply it.

1. Choose a generator and collect its current rollouts.
2. Train 4B/1.7B student verifiers with the same reference-conditioned teacher and OPD/RL objective (Section 5.3, p. 6).
3. Run identical V-R rounds and compare pass@1 against untrained verifiers at each scale.

Verus form (Inference). A smaller model can suggest proof repairs for a larger code generator, but the final Verus checker remains the authority. Inference: this is a latency/cost optimization around the proof compiler, not a weaker proof standard.

## technique 4: verifier-in-the-loop generator training (ViL)

What it is. Freeze a trained STV verifier and train the generator with standard RL over complete multi-turn V-R episodes. The generator emits `y_0`, receives verifier feedback, emits refinements, and gets reward from final correctness against `y*(x)`. Only generator parameters update. The paper calls the unexpected round-0 improvement “training-time self-improvement.”

How to apply it.

1. Start from a generator converged under RLVR (Section 4, p. 3).
2. For each episode, sample `y_0`, run the frozen verifier, and sample each refinement conditioned on prior answer and feedback (Section 4, p. 3).
3. Score only the final answer against the verifiable ground truth and update G with RL (Section 4, p. 3).
4. Evaluate both round 0 without a verifier and later rounds with STV (Section 5.4, p. 6).
5. Compare against spending the same compute on longer ordinary RLVR (Section 5.4, p. 6).

Evidence. On Hardest, ViL raises round-0 pass@1 from 10.7% to 14.7% (+37%); on Hard, 36.7% to 47.7% (+30%). With STV at test time, final-round pass@1 reaches 27.3% on Hardest versus 16.1% for longer RLVR (p<0.01) (Section 5.4, p. 6). The paper reports: “training G inside the V-R loop teaches it skills that surface in its first attempt, without any verifier present at test time.” (Section 4, p. 3). An oracle ablation shows ViL + STV at round 0/20 is 31.2/43.3, while ViL + self-verify is 29.8/39.4 (Table 2, p. 7); these are pass@1 percentages on the same evaluation protocol.

Verus form (Inference). Train a Rust generator on episodes where each proposed proof is compiled, diagnostics are fed back, and final reward is successful verification plus meaningful tests. Freeze the diagnostic verifier during generator updates. The reward must not be only “compiles”: it should include the intended postcondition and behavior checks, because a vacuous specification can compile. Inference: ViL can teach repair patterns that appear in first attempts, but it cannot remove the need to compile the final artifact.

## techniques for the catalog

- self-trained verification: distill reference-conditioned verdict and feedback into an on-policy student that works without references
- verifier-guided refinement: iterate generator and verifier for up to a fixed round budget, using actionable feedback
- weak-to-strong verifier: train a smaller verifier on a larger generator's rollouts to reduce inference cost
- verifier-in-the-loop training: train the generator inside frozen-verifier episodes so diagnostic feedback improves first attempts
