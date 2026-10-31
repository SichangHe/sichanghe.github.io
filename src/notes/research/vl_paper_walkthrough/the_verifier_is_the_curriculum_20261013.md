# The Verifier is the Curriculum: Precision Sets the Return on Search in Code Self-Distillation
(authored by agents unless marked 🧑)
Tag: `zhou2026verifier`, [paper](https://arxiv.org/abs/2607.09709)

source: Zhou, Jiang, Wu, Zhou (Institute of Science Tokyo, Zhejiang University, National University of Singapore), arXiv:2607.09709v2, 15 Sep 2026, 15 pages in two columns; appendices A to D

## what the paper measures and what it leaves trusted

The paper proves nothing. It measures what happens when a code model is retrained on its own outputs after a pass or fail check has filtered them, and how the result depends on how often the check lets wrong outputs through. No formal verifier appears; the two checks are a game engine that must start a generated project without error, and hidden unit tests. The reason to read it for verified Rust is that a Verus run is the same kind of check, a fixed predicate on the artifact, and the paper prices the ways such a check can be loose.

Terms the paper uses and this study keeps:

- fuel: the model's own outputs that passed the check and are added to the training set
- precision π: the fraction of admitted outputs that are truly correct
- false positive: a wrong output admitted; false negative: a correct output rejected
- Kh, the harvest budget: how many candidates are sampled per task before filtering

Two settings. GameCraft-Bench: write a whole Godot 4 project from a one-paragraph brief; 140 tasks in 15 families, 10 families (111 gold projects) for training, 4 families (25 tasks) held out, 1 family (4 tasks) unused (§3). APPS introductory problems: 1500 training problems, 470 held-out, candidates checked by hidden unit tests (§8).

Trusted: that passing hidden unit tests means correct (the APPS “clean” label is all tests passing, nothing stronger); that a clean launch is worth learning from; and, for the two readouts of technique 8, a hand-built score and a blind judge (the paper does not say what model the blind judge is).

## technique 1: an all-or-nothing execution gate with no score

What it is. A filter that returns pass or fail from running the artifact under a fixed tool, and exposes no number a model could push up. “A candidate passes only if the materialized project launches cleanly under a headless engine: the engine returns exit code 0 with no parse, load, or resource error (STRICT-LAUNCH)—a property of the artifact under a fixed engine, not an opinion.” (§1)

When to use it. When the alternative training signal is a learned judge. The paper's test for a bad signal: “We call a filter gameable if a cheap transformation of the artifact raises its score while leaving task-relevant executable behavior unchanged.” (§4) Its example: swapping placeholder rectangles for real sprites, code frozen, made the benchmark's GPT-5.5 judge give 1.8 times the art score, and random sprites did as well as retrieved ones (Appendix A).

Steps (Appendix B, “STRICT-LAUNCH”):

1. write the candidate out as a project tree
2. run the engine headless on it with `--quit-after 5` and read the exit code
3. scan stderr for error patterns; exit code 0 alone is not enough. The definition: “A candidate passes STRICT-LAUNCH if godot --headless --path PROJECT --quit-after 5 returns exit code 0 and emits no parse, load, or resource-resolution error on stderr (we match patterns such as Parse Error, Failed to load script, unresolved identifiers or calls, and failed ext_resource lookups).”
4. check the gate on known answers: all 25 held-out gold projects pass it (Appendix B)

Step 3 is what the paper points to as the difference between the strict gate and the lenient one. The lenient BUILD check opens the project and quits, and “does not treat parse, project, or scene-resource errors as fatal: the process can still exit 0” (Appendix B). Of the 888 candidates the first model generated on the training families, BUILD admits 887 and STRICT-LAUNCH 73, which is 8.2% (§4).

Verus form. Inference: the gate is a Verus run on the crate that reports zero errors, and the lesson of step 3 is to list what else must hold, because Verus exits successfully on files that prove nothing new. A candidate should fail if it adds `assume(...)`, `admit()` or `#[verifier::external_body]`, if it changes the `requires` or `ensures` it was given, or if the function it was asked to prove is no longer in the file. A Rust type check without Verus is the counterpart of BUILD: nearly everything passes and it certifies nothing about the proof. What does not carry over: the paper's gate has no notion of a specification, so it cannot say anything about a candidate that verifies against a weakened one; that false positive is specific to verification and is the one to guard first.

Evidence: techniques 2, 3 and 8 rest on this gate; techniques 4 to 7 use APPS unit tests or an APPS-trained policy as the gate (§8, §10). Its direct evidence is the filter swap in technique 3.

Limits. A clean launch says little about whether the game does what the brief asked; see the two readouts in technique 8.

## technique 2: gated self-distillation in rounds, with gold as anchor

What it is. Generate on the training tasks, keep what passes the gate, add it to the gold data, retrain from the base model, repeat. “Each subsequent round generates candidates with the previous model, harvests its clean self-generated set (the fuel), appends it to the gold pool, which remains the anchor, and retrains a fresh LoRA from the base.” (§5)

Steps (Appendix Algorithm 1, with details from §5 and Appendix C):

1. round 0: fine-tune the base on the gold training projects (111 here) to get M0
2. for each training brief, sample Kh = 8 candidates from the current model
3. drop candidates with fewer than three files; materialize the rest; run the gate
4. per brief, keep at most two clean candidates after removing duplicates
5. add the kept candidates to the data pool, which still contains all gold
6. fine-tune a fresh adapter from the base model on the pool, not from the previous round's adapter
7. repeat from step 2 with the new model

Details the paper gives: Qwen3-14B with LoRA (rank 16, α 32), 8 epochs, learning rate 1e-4; sampling at temperature 0.7; held-out tasks never enter the harvest (Appendix C).

Verus form. Inference: tasks are functions with a fixed specification; candidates are proof-annotated bodies; the gate is technique 1's Verus gate; gold is human-written verified code. Steps 4 to 6 carry over unchanged. One change: for Verus the unit that is capped and deduplicated should be the function and its specification, since two proofs of one function that differ only in an `assert` are near-duplicates.

Evidence. Table 1, four held-out families, 25 tasks, 800 candidates per model (8 per task, four decoding seeds), share of candidates that launch cleanly: 8.8% for M0, then 13.6%, 30.9%, 42.2% after rounds 1, 2, 3. Share of the 25 tasks with a clean candidate among 32: 84%, 88%, 100%, 100%. Retrained under three training seeds, the rounds give 13.3±0.7, 26.4±1.6, 43.7±1.5. Fuel sizes were 67, 123 and 186 projects, covering 48, 77 and 101 of the 111 training tasks (§5, §7). At 8B the same loop gives 3.5 → 6.2 → 9.3 → 17.0% (five decoding seeds), and at 4B one round gives 2.00% → 4.17% (§9).

Where it fails or what it assumes. One engine and 25 held-out tasks; the authors: “Our main compounding loop is studied on a single engine (N = 25 held-out tasks); the precision axis replicates in a second domain under a semantic gate (APPS, §8).” (Limitations) Inference: the loop needs a first model that already passes sometimes. The evidence: every base tried produced clean fuel at 2.1% to 9.6% of 888 candidates (Table 2). The paper does not test a base whose rate is zero.

## technique 3: matched controls that isolate the filter

What it is. Four variants of round 1 that each change one thing; the paper says three matched controls at a fixed fuel budget (§7) locate the gain, and the volume cut is a fourth comparison.

Steps (§7):

1. gold duplication (CTRL): replace the fuel by the same number of copies of gold. “CTRL adds 67 exact duplicates of gold training projects, matched per task to round 1’s fuel.”
2. filter swap (BUILD-gated): same generator, same count, lenient filter in place of the strict one
3. generator swap (GEN-SWAP): round 1's count of fuel, drawn from a later round's model
4. volume cut: reduce round 1's fuel from 67 projects to 8

Results, held-out clean-launch rate per candidate, against M0 at 8.8% and round 1 at 13.6% (§7, Table 1):

- CTRL: 5.6%, below M0 (7 tasks better, 13 worse, p = 0.018)
- BUILD-gated: 8.6%, equal to M0 (paired p = 1.0) and below round 1 (p = 0.0012). The reason given: “Because BUILD accepts nearly every candidate while STRICT-LAUNCH accepts few, the count-matched BUILD fuel is 81% STRICT-LAUNCH-broken (54/67).” The paper's conclusion: “Changing only the verifier’s precision—nothing about the optimizer, the budget, or the task distribution—erases the entire first-round gain: what transfers depends on the acceptance signal.”
- GEN-SWAP: 22.4%, so later fuel is better per item, not only more numerous
- 8 projects of fuel: 11.3%, +2.5 points over M0 with interval [+0.4, +4.8]

Verus form. Inference: before trusting a Verus self-training loop, run the same two controls: duplicate the human-verified examples to the same count, and swap the Verus gate for the type check alone. If the Verus-gated arm does not beat both, the loop is not learning from verification.

## technique 4: pricing precision with a constructed ladder

What it is. Hold the task set, gold data and number of admitted candidates fixed; vary only π by replacing truly passing candidates with failing ones; retrain; plot held-out gain against π.

Steps (§8, “A linear conversion rate”):

1. train M0 lightly: Qwen3-4B on 300 APPS solutions for one epoch (20.4% pass@1 on 470 held-out problems)
2. harvest 8 candidates on each of 1500 training problems and run every candidate on all unit tests; 527 problems yield a candidate passing all
3. build a clean fuel set of 1300 candidates with a fixed number of slots per problem
4. for each target π, replace a share 1 − π of the slots with candidates that do not pass all tests, on the same problems
5. retrain M0 on gold plus each set; evaluate pass@1 on the held-out problems over many training seeds (23 here)
6. compare each gain with π times the clean gain

Result. Gains over M0 of +7.39, +6.32, +5.37, +3.59 and +1.89 points at π = 1.0, 0.875, 0.75, 0.5 and 0.25; the gaps from the straight line π × 7.39 are −0.14, −0.17, −0.10 and +0.04, each interval containing zero (§8). These four residuals match the arithmetic. The summary: “Precision therefore prices the fuel it admits: a batch of precision π buys about π of what clean fuel buys.” (§8) On 320 further problems added after the analysis was fixed, the five gains are +7.77, +6.66, +5.63, +3.82, +2.05 (§8).

A separate, harvested (not constructed) comparison, eight training seeds, 470 problems (Appendix Table 6): fuel admitted by all tests passing lifts pass@1 from 20.4% to 25.5%; fuel admitted by at least half the tests but not all, to 22.5%; fuel that is only syntax-valid, to 20.3%.

Verus form. Inference: this gives a way to cost an imperfect Verus gate. If a share f of admitted proofs are false positives (an `assume` slipped through, or a weakened `ensures`), expect to lose about f of the gain from self-training, with no threshold below which the loss vanishes. The ladder can be rebuilt for Verus by injecting such proofs on purpose at known rates.

Limits. The linear law is measured from π = 0.25 to 1 only, on one model size and one benchmark, with offline fine-tuning on a fixed-size set.

## technique 5: separating the two directions of gate error

What it is. A second ladder at a fixed admitted count where the gate errs in one direction at a time.

Steps (§8, “Only false positives are paid for”; Appendix C):

1. harvest 48 candidates per problem once and freeze them
2. CLEAN arm: all-pass candidates only, 944 rows, fixed slots per problem
3. FP25: replace a quarter of the slots by same-problem, syntax-valid candidates that do not pass all tests
4. FN25, FN50, FN75: hide a quarter, half or three quarters of each problem's passing candidates before filling the same slots
5. MIX: half the error budget each way
6. retrain over eight seeds and compare with CLEAN
7. control for the count of true positives: train on the 708 true positives of FP25 alone (C708), and on those 708 with 236 duplicated back to 944 rows (C708R)

Result. FN75 moves held-out pass@1 by −0.03 points [−0.74, +0.63]; FP25 by −1.58 [−2.23, −0.95]; MIX by −0.87, close to half of FP25 (§8). The conclusion: “At a fixed admitted count, then, the damage is almost entirely a function of the false-positive rate, and a gate’s recall is very nearly free, because it costs no problem coverage: the false-negative arms keep each problem’s slot count by construction.” (§8) In the rerun for step 7, against CLEAN: C708R +0.40 [−0.18, +1.03], C708 −0.91 [−1.86, +0.06], FP25 −2.17 [−3.02, −1.46] (Appendix C).

When the rule holds. The paper establishes it for offline filtering into a fixed-size set, as long as the surviving pool fills the quota (introduction); under GRPO it reverses (technique 6). The paper states the reason: “That ranking is a statement about offline rejection sampling, where the gate decides which rows enter a fixed-size training set: a false positive writes a wrong trajectory into the fuel, while a false negative merely withholds one of many interchangeable right ones.” (§8)

Verus form. Inference: Verus false negatives are proofs that are right but time out or fail on an unlucky solver run. For building a training set, this result says to prefer the harsh setting: a low resource limit, and rejecting any proof that does not pass on every rerun, costs little as long as each function still has a surviving proof. False positives are what to spend effort on.

## technique 6: the same errors under reinforcement learning behave differently

What it is. A check that the rule of technique 5 depends on the training method. The gate is used as the reward for GRPO, a policy-gradient method that compares rollouts within a group, in place of a filter.

Setup (§8, Appendix C): Qwen3-4B with LoRA, 300 optimizer steps, groups of 8, 50 problems whose pass rate under the policy lies in [0.25, 0.75], eight seeds per arm; false negatives or false positives injected at about 25% each.

Result (Appendix Table 3). Share of groups in which every rollout gets the same reward, so no gradient: 0.488 clean, 0.367 with false positives, 0.141 with false negatives. Gradient norm: 0.293, 0.318, 0.405. Clean reward (the policy's own rollouts scored by the uncorrupted verifier): 0.696, 0.629, 0.608. In the paper's words: “The false-negative arm therefore receives more gradient than the clean one in every seed, not less (Appendix Table 3), and spends it pushing away from trajectories that in fact passed: measured by the uncorrupted verifier, the policy’s own rollouts score 0.608 against the clean arm’s 0.696.” (§8)

Limit. The held-out difference between the two corrupted arms is not resolved: false-negative minus false-positive is −1.90 points with interval [−5.08, +0.96] over 150 problems (§8).

Verus form. Inference: if Verus success is used as a reward during reinforcement learning, flaky timeouts are no longer cheap; they punish correct proofs. So the tolerance for Verus instability depends on the training method: nearly free for filtered fine-tuning in the paper's experiment, costly for reward-based training.

## technique 7: crossing search budget with gate strictness

What it is. A two-by-two experiment: gate strict or partial, Kh 8 or 32, all four arms cut to the same 900 rows from the same frozen candidates, eight seeds (§10).

Result. Going from 8 to 32 candidates per problem is worth +1.62 points [+0.72, +2.60] behind the strict gate and +0.31 [−0.47, +1.17] behind the partial one. “The STRICT gate at the low budget still beats the PARTIAL gate at four times the budget, by +1.78pp [+0.65, +2.94] (p = 0.0026, in all eight seeds).” (§10) The four numbers are consistent: the strict gate's lead is +2.09 at Kh = 8 and +3.40 at Kh = 32, and 2.09 − 0.31 = 1.78.

The cost of strictness is yield: “The one cost precision does carry is yield: at a fixed admitted count a stricter gate needs 1/yield times the generation, and STRICT-LAUNCH admits 73 of 888 candidates where BUILD admits 887.” (§10)

Verus form. Inference: sampling more proof candidates per function pays only if the acceptance check is tight. Tightening the Verus gate by text checks such as banning `assume` (technique 1) costs no extra Verus runs; quadrupling samples costs four times the generation and four times the Verus time.

## technique 8: readouts the gate never sees, each with a negative control

What it is. Two measurements of whether the output does anything useful, kept out of training and each checked on known-good and known-bad inputs.

Execution grounding (Appendix B). Steps: inject a probe into a copy of the project; step the running scene for up to 180 frames with no input, with synthetic input, and with replayed recorded input; score 0.35 for exposed state, 0.25 for state change without input, 0.40 for change due to input beyond that baseline; zero if any runtime error; call a project grounded at 0.50 or more. Calibration: 15 gold projects score at least 0.58, and 16 known-bad ones score near zero.

Brief compliance (§6, Appendix B). A judge that reads only the brief and the scripts. Its negative control is one do-nothing project submitted for all 25 briefs: “It launches cleanly, and the blind judge rates it 0/25 against gold’s 19/25.” (Appendix B)

Result (§6). Held-out tasks with a grounded clean candidate: 10, 12, 14, 15 of 25 over the rounds. Projects that launch and implement the brief: 5.0, 7.4, 12.4, 14.4 per 100 candidates.

Inference from these numbers, not stated in the paper: the share of clean-launching candidates that also implement their brief falls as the loop runs, from 5.0 of 8.8 (57%) to 14.4 of 42.2 (34%). The model learns to pass the gate faster than it learns to do the task. For Verus the parallel is a loop that gets better at producing proofs that verify faster than at producing code that does what was wanted, which is why the specification must be fixed outside the loop.

Inference on the judge: gold projects are rated compliant on 19 of 25 briefs only, so either the judge misses about a quarter of correct work or a quarter of the gold does not follow its brief; the paper does not say which.

Verus form. Inference: keep one check that training never touches, for example running the verified function on held-out input and output pairs, and test that check on a do-nothing function (one with a trivial `ensures`) before believing it.

## technique 9: statistics for sampled candidates

Steps (§5, Appendix C):

1. treat the task, not the candidate, as the unit; the reason given: “Because candidates drawn for the same task are strongly correlated (intraclass correlation 0.63), every comparison clusters on the task rather than on the candidate.”
2. compare two models with a permutation test that shuffles candidate labels within each task (50,000 draws), and bootstrap over tasks for intervals
3. for the APPS ladders, which have several training seeds, resample seeds and tasks independently (10,000 draws, a crossed seed-by-task bootstrap)
4. report coverage at K from n pooled candidates with c clean as 1 − C(n − c, K) / C(n, K), not as the raw share
5. to tell “cannot” from “rarely does”, resample hard tasks heavily from the weaker model

Step 5 in the paper (Appendix D): on the four held-out tasks where M0 had no clean candidate in 32, 512 fresh draws were taken. “All four yielded clean projects: 15, 23, 3, and 5 successes out of 512, against 17, 25, 6, and 8 out of 32 for the distilled model.” The stated 25 to 35 draws of M0 to match one distilled draw agrees with these counts.

Verus form. Inference: unchanged. Proof attempts for one function are correlated in the same way, so per-attempt confidence intervals overstate certainty.

## points that do not add up or are thin

- Table 1's single-run rate after round 2 is 30.9%, while the three-seed mean is 26.4±1.6; the single run that the controls are compared against sits about three standard deviations above the mean at that round. The paper notes only that the seeds “end above the single-run trajectory” (§6), which holds for round 3 (43.7 against 42.2)
- §10 cites Appendix C for the 8B generator's clean rate rising “4.6 → 9.8 → 17.5%”; the Appendix C text gives task coverage 31 → 51 → 75 and Table 2 gives 4.62% for the first value, and the other two values do not appear there
- two different “clean” APPS gains appear: +5.15 points (harvested, eight seeds, Table 6) and +7.39 (constructed, 23 seeds, Fig. 1); the paper says the second is a different construction (§8), so they are not in conflict but must not be mixed
- the rerun of FP25 gives −2.17 where the first run gave −1.58; the paper says the second “reproduces” the first on overlapping intervals (Appendix C)
- code, fuel and adapters are promised “upon publication” (Appendix C); none is linked

## what is already done, and the threat

Done in the paper: the filter-swap control; the linear price of false positives between π = 0.25 and 1; the near-zero price of false negatives for filtered fine-tuning; the reversal under GRPO; the result that more sampling pays only behind a strict gate.

Not done: any formal verifier as the gate; any gate that can be passed by weakening the goal, which is the main false positive in verification; base models stronger than 14B; more than three rounds.

## techniques for the catalog

- all-or-nothing execution gate: accept a candidate only on exit code 0 plus no error pattern in the tool's output, and expose no score
- gameability probe: apply a cheap change that leaves behaviour fixed and see whether the signal's score moves
- gated self-distillation with gold anchor: per round, sample 8 per task, keep at most two deduplicated passing candidates, add to gold, retrain a fresh adapter from the base
- matched controls for self-training: gold duplication, filter swap, generator swap and volume cut, each at the same fuel count
- precision ladder: at fixed admitted count, replace a known share of correct fuel with incorrect fuel and fit gain against precision; here gain is about precision times the clean gain
- error-direction ladder: mask true positives or inject false positives separately at a fixed count; for filtered fine-tuning only false positives cost
- optimizer-swap check: repeat the error-direction test with the gate as an RL reward, where false negatives push away from correct outputs; the clean reward falls to 0.608, against 0.629 with false positives and 0.696 clean (Appendix Table 3)
- search-by-gate crossing: vary candidates per task and gate strictness together; more samples pay only behind the strict gate
- unoptimized readouts with negative controls: an instrumented state-change score and a blind brief judge, each calibrated on gold and on known-bad or do-nothing artifacts
- task-clustered statistics: permute within task, bootstrap over tasks and seeds, use the unbiased coverage estimator, and resample hard tasks to separate efficiency from reach
