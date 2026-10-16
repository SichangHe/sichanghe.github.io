# QiMeng-CodeV-R1: Reasoning-Enhanced Verilog Generation
(authored by agents unless marked 🧑)
Tag: `zhu2025qimeng`, [paper](https://arxiv.org/abs/2505.24183)

## purpose and boundary

QiMeng-CodeV-R1 trains a Verilog generator with reinforcement learning from executable equivalence checks. The abstract identifies three obstacles: “the lack of automated and accurate verification environments, the scarcity of high-quality NL–code pairs, and the prohibitive computation cost of RLVR.” The proposed answer is an automated testbench, round-trip data synthesis, and a two-stage distill-then-RL pipeline with adaptive DAPO.

Inference: the paper's testbench is simulation-based equivalence checking, not a proof of arbitrary hardware properties. For VeruLaw, its transferable idea is to make generated Rust/Verus artifacts earn rewards only from a concrete checker; the Verus verifier remains the acceptance authority.

## technique 1: structure-aware rule-based testbench

What it is. The framework parses a golden Verilog module with Yosys, extracts I/O widths, clock edges, and reset synchrony/polarity, then generates randomized edge-triggered simulations comparing candidate and golden outputs. The authors state: “For each golden reference, the framework first performs circuit-structure analysis to extract information such as input/output (I/O) ports and reset/clock signals.” (Introduction, p. 2)

How to apply it. (1) Parse the golden code and enumerate ports, widths, clocks, and resets. (2) For combinational circuits, run M=100 independent sequences of N=1000 random inputs. (3) For sequential circuits with zero or one reset, run 100 sequences of 1000 clock toggles (500 cycles) with deterministic reset, then another 100 sequences with randomized resets. (4) For multiple resets, exhaustively test every non-conflicting reset combination with the same cycle budget. (5) Compare outputs after each clock toggle and compute error rate ε = ErrorNumber/(2MN)×100% for typical sequential circuits or ErrorNumber/(MN)×100% for combinational circuits. (6) Return success only when ε=0. The paper reports 32-way parallelization and 15 instances per second (§2.1, p. 3).

Inference: the corresponding Verus checker should compare the candidate's post-state and return values against a specification over symbolic inputs, with explicit `requires`, `ensures`, and loop invariants. Random simulation can complement Verus counterexamples but cannot replace solver coverage. Inference: model reset and clock state explicitly in the Rust abstraction; otherwise an apparently passing test can miss initialization bugs.

Evidence and limits. In a golden-versus-golden classification test, the proposed bench misclassified 0.3% of cases versus 7.6% for a DeepSeek-V3-generated bench, a 96.1% reduction in false negatives (§3.3.4, p. 9). In sequential fuzzing, it detected 65% of injected errors versus 40%, a 62.5% relative improvement. The denominators are the respective golden/self cases and injected-error cases. Inference: these are testbench detection rates under sampled stimuli, not exhaustive equivalence or formal soundness.

## technique 2: round-trip NL–code data synthesis

What it is. Start with open-source Verilog, ask an LLM to describe it in natural language, ask a reasoning model to regenerate Verilog, and keep only pairs whose regenerated code is equivalent to the original. The paper describes the filter: “Only code that passes the testbench is retained and combined with the NL to form high-quality data for reinforcement learning.” (Introduction, p. 2)

How to apply it. (1) Collect a code snippet y* and generate description x with DeepSeek-V3. (2) Generate thought c′ and code y′ from x with DeepSeek-R1. (3) Remove examples that baseline Qwen2.5-Coder models solve in any of five attempts and require y* to be synthesizable with Yosys. (4) Remove benchmark-contaminated examples with Rouge-L similarity above 0.5. (5) Run the structure-aware equivalence checker on y′ versus y*. (6) Discard inequivalent pairs; retain equivalent (x,y*) pairs for RL. The pipeline produces about 150K initial triples, 87K distillation samples, and 3.1K final RL examples (§2, pp. 3–5).

Inference: a Verus version can round-trip a Rust specification to generated code and back, then run Verus on the regenerated implementation. Keep the original specification as the reference and record compiler, dependency, and solver versions. Inference: round-trip success checks consistency between text and code, but it does not prove that the natural-language requirement is complete.

Evidence and assumptions. The paper defines NL-Code Deterministic Equivalence and gives a theorem that, under its deterministic-equivalence assumption and an ideal checker, round-trip equivalence implies both forward and backward equivalence (§2.3.1, p. 5). Inference: the theorem's assumptions are stronger than stochastic LLM behavior and sampled testbench execution, so the practical filter is probabilistic.

## technique 3: distill then reinforce

What it is. Supervised fine-tuning first teaches reasoning traces; RL then optimizes functional equivalence. The authors say: “We adopt a two-stage ‘distill-then-RL’ training pipeline to cold-start LLMs’ reasoning ability through SFT and apply RL to enhance model’s reasoning ability.” (Introduction, p. 2)

How to apply it. (1) Initialize Qwen2.5-Coder-7B-Instruct. (2) Fine-tune on 87K DeepSeek-R1-generated thought/code responses for six epochs, learning rate 1×10⁻⁵, batch 64, context 16,384. (3) Use the testbench to validate round-trip data and select 3.1K solvable but challenging examples. (4) Generate five variants per question and remove questions solved in all five attempts by the distilled model. (5) Train with RL for 300 steps, batch 128, learning rate 1×10⁻⁶, rollout temperature 1.0, response limit 16,384. The reward is 1 only for required `<think>…</think><answer>…</answer>` formatting and semantic equivalence; otherwise 0 (§2.3.2, p. 5).

Verus form. Inference: use SFT traces to teach contract and invariant patterns, then reward only code that compiles and passes Verus. A proof function or explanation must not run at runtime; generated claims cannot be substituted for `ensures`. Inference: retain failed candidates as negative examples so RL learns from concrete verifier errors.

## technique 4: adaptive DAPO sampling

What it is. DAPO requires each training group to contain both correct and incorrect responses. Fixed generation batches waste samples as success rates change. The paper estimates a valid-sample ratio and sets the next generation batch to `ceil(b_train / r_valid)`, updating `r_valid` to the minimum observed ratio (§2.3.2, p. 5).

How to apply it. (1) Start generation batch b_gen=b_train. (2) Accumulate a complete training batch containing both reward classes. (3) Compute valid samples divided by generated samples. (4) Replace r_valid with the minimum of its previous value and this ratio. (5) Set the next b_gen to ceil(b_train/r_valid), and recalculate remaining size if a generation attempt is short. Do not change the training batch composition or perform offline updates.

Inference: for Verus RL, “valid” should mean a completed Verus check with a true contract, while compile failures and timeouts are explicit negative rewards. Adaptive sampling must not hide hard failures by repeatedly oversampling easy tasks.

Evidence. The paper reports 1.25× overall speedup, with 1.44× after step 150 and 1.04× before step 150 (Figure 4, p. 9). CodeV-R1-7B achieves 68.8% pass@1 on VerilogEval v2 specification-to-RTL, 69.9% on code completion, and 68.0% on RTLLM v2 (Table 2, p. 7); each percentage is over that benchmark's queries with 20 responses used to estimate pass@k. On RTLLM v1.1, pass@1 rises from 57.4% for the distilled model to 72.9% after RL (Table 1, p. 7). Inference: benchmark pass rates measure generated-code tests, not universal hardware correctness.

## what is trusted and threat to VeruLaw

Trusted components include Yosys parsing, simulators, random-input generation, golden reference correctness, LLM-generated descriptions, reward code, and benchmark harnesses. The paper itself notes that golden code and generated instructions can be inconsistent and therefore filters by equivalence. Inference: for VL, the major risk is a false specification or incomplete test oracle: generated Rust can pass selected checks while violating an unstated safety property. Existing Verilog RLVR work already covers structure-aware testbenches, round-trip filtering, adaptive sampling, and distill-then-RL; VL should adapt these to Verus contracts rather than repeat the hardware claims.

## techniques for the catalog

- structure-aware randomized equivalence — parse ports, clocks, and resets, then compare candidate and golden outputs across controlled simulations
- round-trip data synthesis — describe code, regenerate it, and retain only checker-equivalent pairs
- difficulty filtering — keep tasks that strong baselines solve inconsistently, yielding useful RL positives and negatives
- distill-then-RL — supervised reasoning cold start followed by verifier-rewarded optimization
- adaptive DAPO — estimate valid-sample rates and resize generation batches to avoid rejected-sample waste
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
