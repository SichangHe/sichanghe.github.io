# Correct Tests Are Not Enough: Measuring and Training Oracle Conversion in Specification-Based Test Generation
(authored by agents unless marked 🧑)
Tag: `liang2026correct`, [paper](https://arxiv.org/abs/2609.05879)

## core distinction
The paper states, “These results identify oracle conversion as a measurable bottleneck and show the benefits and limits of preserving input-utility feedback in joint test generation.” (abstract, p. 1) The paper studies specification-only test generation, where a model must generate both inputs and expected outputs without a trusted implementation in the prompt. Its central measurement separates an input’s ability to expose faulty programs from the model’s ability to provide the correct oracle. The authors define oracle conversion as “the extent to which potentially detectable faulty programs are actually detected by fully correct generated tests.” (section 1, p. 3) This is directly relevant to formal verification pipelines: a test or counterexample is useful only when its asserted result is itself justified.

A task returns at most five unique input/output pairs in one JSON response. Audited reference programs establish a consensus output during evaluation; a fixed bank of faulty programs measures detection. For valid input x, potential detection Dq(x) contains faulty programs that disagree with the reference; effective detection includes Dq(x) only when the generated output matches the reference (section 3.1–3.2, pp. 4–5). Suite unions prevent duplicate credit. The paper explicitly warns that “An incorrect generated output is not allowed to reject programs: otherwise, a false assertion could manufacture an apparent kill.” (section 3.2, p. 5)

## technique: suite-level potential/effective metrics
Use these metrics when a generator emits both a stimulus and an expected result. For each task q:

1. run every candidate input against at least five retained reference programs; require successful, agreeing executions and normalize line endings/outer whitespace (section 4.4, p. 8)
2. record the consensus output y*q(x) and mark the input reference-valid
3. run each valid input against the faulty bank Wq; Dq(x) is the set of faulty programs that fail or disagree
4. union Dq(x) over all generated inputs for potential set Pq
5. union only those Dq(x) whose generated pair is fully correct for effective set Eq
6. report Oq=|Pq|/|Wq| (input/potential kill) and Kq=|Eq|/|Wq| (full/effective kill), with Kq≤Oq (section 3.2, pp. 5–6)

Aggregate correctness and validity divide by the fixed five-slot budget across 142 evaluation tasks, while O and K are task-macro averages with failed tasks assigned zero (section 3.3, p. 6). Oracle-conversion efficiency is the opportunity-weighted ratio Σ|Eq|/Σ|Pq|; it is undefined when no potential detections exist. The paper also reports the macro gap G=O−K and a harmonic Balanced TDD Score (BTS), but cautions that BTS does not replace effective union kill (section 3.3, p. 6).

Inference: VL can apply the same accounting to generated verification lemmas or test harnesses: count which faulty implementations a proposed precondition/input can expose, then count only cases where the generated postcondition or expected result is verified. The Verus verifier should establish expected results; an unverified `assume` must not count as effective detection.

## technique: additive executable reward
The generator jointly emits five tests. During training, audited references and faulty programs supply executable feedback. The additive reward is `0.05F + 0.05Q + 0.15Vq + 0.25Cq + 0.25Kq + 0.25Oq − 0.10L`, where F is strict JSON format, Q counts/uniqueness, Vq valid-input fraction, Cq full correctness, Kq effective kill, Oq potential kill, and L penalizes responses beyond 16,000 characters (section 4.2, pp. 6–7). NoKill removes both kill terms; FullKill-only retains Kq; Additive retains both. Coefficients are not redistributed in ablations (Table 1, p. 7).

Apply it as follows:

1. sample a complete suite from the policy; parse JSON, deduplicate inputs, and truncate to five slots (section 3.1, p. 4)
2. execute references and cache consensus outputs; invalidate inputs when references time out or disagree (section 4.4, p. 8)
3. execute the faulty bank once per valid input; reuse the execution matrix for Oq and Kq
4. score format, count, validity, correctness, potential kill, effective kill, and length
5. sample G=8 suites per prompt and normalize each scalar reward relative to that group with GRPO advantage `(ri−r̄)/(std+ε)` (section 4.3, p. 7)
6. apply a clipped PPO-family policy loss with a reference-policy KL penalty; every response token receives the suite-level advantage (section 4.3, p. 7)

At deployment the policy makes one generation call and has no access to reference or faulty banks. The paper therefore treats reward execution as training/evaluation infrastructure, not a runtime certificate (section 4.4, p. 8).

Inference: a Verus-oriented version could reward valid compilable Rust, verifier-proved postconditions, and mutation detection during training, but deploy only code whose proof obligations pass Verus. The additive reward does not itself transfer a proof across unseen programs.

## technique: fixed-input source/oracle crossover
Use this diagnostic to distinguish harder input selection from degraded output prediction. On 64 training-pool tasks, each policy first generates ordinary suites. Then discard outputs, freeze input bytes and order, and ask each policy to fill outputs in a common JSON scaffold; this yields nine source-target cells per seed and 27 cells overall (section 6.3.1, p. 12). Compare rows to measure input-source changes and columns to measure oracle-policy changes. The primary NoKill-to-FullKill contrast uses 561 common source-task instances and 2,385 valid slots across seeds and source policies (section 6.3.1, p. 12).

The reported source input-kill increase is 2.02 points, while changing the target policy on identical inputs improves oracle accuracy by 1.18 points; the authors attribute the main free-generation loss to which inputs are selected, not general output deterioration (section 6.3.1, pp. 12–13). This experiment is diagnostic on training-pool tasks, not a held-out generalization result.

Inference: for VL, freeze generated specifications and separately vary proof synthesis to tell whether failures arise from selecting hard-to-prove claims or from proving a fixed claim. Keep denominators and common-support filters explicit.

## evidence and limitations
The authors caution, “This is a learning objective for competing requirements, not a guarantee that every policy update improves both.” (section 4.1, p. 6) The audited Quality-v2 split has 506 training, 56 validation, and 142 evaluation tasks; references per task range 5–8 and faulty programs 5–19 (section 5.1, Table 2, p. 9). Three Qwen3.5-9B seeds at step 75 improve full correctness from 28.59% to 42.54%, input kill from 24.06% to 25.27%, and effective full kill from 12.23% to 14.15% on the 142-task evaluation set (abstract and section 6.1, p. 10). The step-75 Additive OCE is 56.51%, up from 49.70%; only 7.28% of tasks have all five tests fully correct (section 6.1, p. 10). At matched 50-step training, NoKill has 47.04% correctness and 14.36% full kill but 21.60% input kill; Additive has 24.43% input kill and 13.67% full kill (section 6.2, p. 11). These are three-seed means, with five dependent slots per task.

The highest-potential bin exposes conversion failure: Additive-50 has 27 valid slots above 0.5 potential kill, only three correct (11.11%), yielding 7.11% effective per-test kill; the denominator is 27 slots pooled across three runs (Table 4, p. 12). Training is costly: step-75 runs take 6.01, 5.51, and 5.58 hours on four A800 GPUs, mean 5.70 hours or 22.80 GPU-hours per seed (section 6.4, p. 13).

What remains trusted is the audited reference consensus, faulty-program bank, execution sandbox, parser, and reward implementation; the model’s generated tests are not certified for arbitrary requirements. Inference: the practical risk to agent-written verified Rust is substantial: the metric framework exposes oracle failure, but executable reward can still favor trade-offs, output truncation, and benchmark-specific faults. The paper itself reports nine failed tasks for one step-75 seed due to an unterminated JSON response (section 6.4, p. 13).

## techniques for the catalog
- potential/effective kill accounting — union faulty-program detections and count only fully correct outputs as effective
- additive executable reward — jointly reward correctness, valid inputs, potential kill, and effective kill
- group-relative suite training — normalize eight complete-suite rewards and apply a clipped policy update
- fixed-input crossover — freeze inputs and cross policies to separate input-selection difficulty from oracle prediction
Checked 2026-10-15 against paper liang2026correct: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
