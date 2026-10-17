# Proof2Silicon: Prompt Repair for Verified Code and Hardware Generation via Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `jha2025proof2silicon`, [paper](https://arxiv.org/abs/2509.06239)

Audit: audited 2026-10-13 against the paper; rechecked Tables I to III, every fraction and percentage, the loop, reward and PPO details, page and section references and the numbers-that-do-not-add-up list, which all held; changed one overstated claim (no functional test, when tests were written but not reported), one added premise (closed model), one pointer to the earlier paper the text does not make, one reference range (Section IV-E spans pp.5-6) and one detail (32-bit, where the paper gives np.int32 and np.float32 as examples); the Verus statements are marked Inference and agree with the Verus papers.

source: Jha, Wan, Chen (University of Illinois Urbana-Champaign), arXiv:2509.06239v2 (20 Oct 2025), presented at SRC TECHCON 2025, 9 pages, no appendix, no code link in the text

## two things in one paper

1. PREFACE, the authors' earlier system, cited as [6]: a small language model (SLM), trained by reinforcement learning, edits the prompt given to a frozen large model until the Dafny that model writes passes the Dafny verifier. Only the small model is trained. “By restricting training to the lightweight SLM, PREFACE achieves formally verified code synthesis without fine-tuning the base LLM, forming the core of Proof2Silicon.” (Section III-C, p.4)
2. a translation chain from the verified Dafny to FPGA hardware: Dafny → Python → cleaned Python → C for high-level synthesis (HLS) → register-transfer-level (RTL) design by Vivado HLS.

The headline claim joins them: “This work presents Proof2Silicon, a novel end-to-end synthesis framework that embeds the previously proposed PREFACE flow to enable the generation of correctness-by-construction hardware directly from natural language specifications.” (Abstract, p.1). The first half has a measured effect. The second half carries no proof and no reported functional test result from the Dafny onward (the paper says tests were written by hand, Section IV-C, p.5, but reports none and does no co-simulation), so the hardware is not verified in any sense the paper demonstrates.

## what is verified, what is measured, what is trusted

verified: each accepted Dafny program against its Dafny contract, by the Dafny verifier (Section III-A, p.3)

measured, on 100 tasks sampled from DafnyBench, five models (Section V, p.6)
- share of tasks whose Dafny verifies, under six prompt settings (Table I, p.7)
- of the verified programs, how many compile to HLS C and how many complete Vivado HLS synthesis (Table II, p.7)
- latency and resource counts of three selected designs (Table III, p.7)

trusted, with no check reported
- Dafny's Python backend
- the authors' script that removes Dafny runtime imports and substitutes NumPy operations (Section IV-B, p.4)
- the conversion of all numbers to fixed-width NumPy types (Section IV-C, p.5)
- PyLog's Python-to-C compilation and Vivado HLS
- functional behavior of the RTL: “Although we do not perform functional co-simulation, this step verifies that the design is structurally FPGA-compatible and meets target performance and area constraints.” (Section IV-E, pp.5-6)

where the task's contract comes from is unclear. Section III-A (p.3) takes it as input: “Given task specifications τ (pre / postconditions), a handcrafted prompt p0 = φ(τ ) is submitted to M, producing a candidate code ct.” The abstract and contributions speak of natural language specifications, and Table I's caption (p.7) names a prompting mode of one-line and detailed descriptions. Inference: if the frozen model writes the `requires` and `ensures` as well as the body, a verification pass can be obtained with a weak contract, and the paper has no check on contract strength.

## technique 1: prompt repair by a trained small model, with the verifier as reward

what it is: treat the prompt as the thing being repaired, not the code. A small policy model reads the last prompt, the code it produced and the verifier's feedback, and emits an edit to the prompt. The large model is called again with the edited prompt.

when to use, per the paper's argument (Section I, pp.1-2): the target language has too little data for fine-tuning (it cites DafnyBench at about 700 tasks), fine-tuning a large model is costly and risks overwriting pre-trained capabilities, and the verifier returns structured errors that can be counted.

the loop (Algorithm 1, p.3; Section III-A, p.3)
1. input: specification τ; initial handcrafted prompt p0 = φ(τ); at most Tmax = 7 iterations
2. generate code ct from the frozen model M with prompt pt
3. run the Dafny verifier; get error count et and feedback text ot
4. if et = 0, return ct
5. build the state st = ψ(pt, ct, ot)
6. sample a prompt edit Δpt from the policy πθ given st
7. set pt+1 = pt ⊕ Δpt and repeat

the learning problem (Section III-B, pp.3-4)
1. state: the encoding of current prompt, generated code and verifier feedback
2. action: a discrete, token-level modification of the prompt drawn from the SLM's vocabulary
3. transition: defined implicitly by generation plus verification
4. reward: +Rsucc when the next error count is 0; otherwise −α·e − β, with α = 0.2 and β = 0.5, where e is the next error count; a large penalty for empty outputs
5. discount γ = 0.99

training (Section III-C, p.4; Section V-A, p.6)
1. Proximal Policy Optimization: the actor maximizes the clipped surrogate objective, the critic minimizes squared error between its value estimate and the return; Adam with gradient-norm clipping
2. “PREFACE was trained for approximately 100 h on two NVIDIA H100 GPUs, during which shaped rewards, policy loss, and value loss were recorded over 2000+ episodes (Figure 4).” (Section V-A, p.6)
3. not in the paper: which SLM is used; the value of Rsucc and of the empty-output penalty; the clip range; what the operator ⊕ does to the prompt (append, replace, insert); the encoder ψ; which tasks were used for training and whether they are disjoint from the 100 evaluation tasks; which frozen model was in the loop during training. The paper cites [6] for PREFACE but does not say these are given there

Verus form (Inference: the paper is about Dafny)
- the loop transfers without change in shape: M writes a Rust function with `requires`, `ensures`, `invariant`, `decreases` and proof hints; the Verus verifier's report gives the count of failed obligations and their messages; the policy edits the prompt
- the reward's per-error slope needs care in Verus. Inference: one missing `invariant` can produce several reported failures (invariant not satisfied before the loop, not preserved, postcondition not proved), and a parse or type error hides all later errors, so a raw error count is a noisier distance than the paper's formula assumes; the paper does not separate syntax errors from verification errors in its reward
- what does not carry over: nothing in the method is Dafny-specific except the verifier call
- what must be added (not in the paper): a guard that the edited prompt does not lead the model to change the contract, since a reward of error count zero is reached fastest by weakening `ensures`

evidence (Table I, p.7; percentage of the 100 tasks verified; the bracketed differences in the table are against the baseline column with the same feedback setting)
- baseline without SLM, without and with feedback: ChatGPT-4o 25% and 36%; ChatGPT-o1-mini 23% and 35%; Qwen2.5-Coder-14B 15% and 21%; Qwen2.5-7B 3% and 7%; Gemini-2-Flash 20% and 33%
- untrained SLM, without and with feedback: 10% and 44%; 8% and 42%; 2% and 12%; 0% and 4%; 3% and 32%
- trained SLM, without and with feedback: 23% and 50%; 23% and 52%; 16% and 31%; 3% and 11%; 29% and 55%
- gain of trained SLM with feedback over baseline with feedback, in percentage points: 14, 17, 10, 4, 22

reading the table (Inference)
- for the two OpenAI models an untrained SLM with feedback already beats the baseline with feedback by 8 and 7 points, so about half of the reported 14 and 17 points does not come from the 100 hours of training
- without feedback the trained SLM is no better than the plain prompt for three of five models (23 against 25, 23 against 23, 3 against 3)
- the paper has no comparison against a plain repair loop of equal length that feeds errors to the large model with a fixed instruction and more iterations, nor against sampling the baseline several times; what the feedback baseline does is not described

where it fails or what it assumes
- one run per cell, no variance; 100 tasks, so one task is one point
- cost is not reported: no token counts, no number of iterations used, no price of the 100 GPU-hours against the gain
- absolute rates stay low for small models: 11% for Qwen2.5-7B with everything enabled
- Inference: the policy is trained against one verifier version and (unstated) one or more frozen models; nothing shows it transfers to a model released after training, although the paper calls the method model-agnostic

## technique 2: use a verification language as the front of a compile chain

what it is: verify in Dafny, then reach the real target through a sequence of existing compilers and a clean-up script.

the chain (Section IV, pp.4-6; Figure 3, p.5)
1. compile the verified Dafny to Python with `dafny build -target py verified.dfy`. The stated reason for not going to C directly: “This transformation is necessary as direct translation from Dafny to C incurs critical issues, particularly concerning integer overflow and limited support for various mathematical constructs required for accurate hardware synthesis.” (Section IV-A, p.4)
2. run a script that removes Dafny library imports and empty class wrappers and replaces Dafny mathematical operations with Python-native or NumPy ones (Section IV-B, p.4)
3. add PyLog decorators marking the functions to be turned into hardware, with directives for loop pipelining, unrolling and array partitioning (Section IV-C, pp.4-5)
4. fix number types: “Incorporating NumPy library calls, all numerical data types and operations in the Python code are explicitly converted to NumPy types (e.g., np.int32, np.float32).” (Section IV-C, p.5)
5. write test cases by hand: “Given the limited availability of automated test generation tools suitable for this specific context, we manually crafted test cases for each DafnyBench [8] benchmark used in our evaluations.” (Section IV-C, p.5)
6. PyLog compiles the Python to HLS C (Section IV-D, p.5)
7. Vivado HLS synthesizes RTL for device xc7z020clg484-1 with a 10 ns target clock and reports timing and resources (Section IV-E, pp.5-6; Section V-B, p.6)

why the guarantee does not survive the chain (Inference, from the paper's own steps)
- step 4 replaces Dafny's unbounded `int` by NumPy fixed-width types after the proof is done (the paper's examples are np.int32 and np.float32). A Dafny proof about `int` says nothing about wrap-around, so any design whose values can exceed the chosen width computes something the proof does not cover. Step 1 names integer overflow as the reason to avoid direct C, and step 4 then reintroduces it
- step 2 is an unverified source-to-source rewrite
- step 5's tests are written, but no pass rate is reported, and Section IV-E states there is no functional co-simulation; so the only reported check on the hardware is that synthesis completed

Verus form (Inference)
- most of this chain has no counterpart, since Verus verifies the Rust that is compiled and no intermediate language is involved
- the integer problem is handled at the source in Verus: exec code uses Rust's fixed-width integer types and the verifier raises an overflow obligation on their arithmetic, so the proof is about the machine integers that run. A contract proved over mathematical integers in a `spec fn` still has to be connected to the fixed-width exec code by the function's `ensures`
- the general rule for VL: a proof covers the artifact the verifier read. Every later rewrite needs either its own proof, or a checker in the style of translation validation, or at least differential tests whose results are reported

evidence (Table II, p.7; the percentage printed in the table is synthesized over verified, which the fractions confirm)
- ChatGPT-4o: without feedback 23 verified, 17 compiled to HLS, 12 synthesized (12/23 = 52.2%, printed 52.1%); with feedback 50, 29, 25 (50%)
- ChatGPT-o1-mini: 23, 17, 12 (printed 52.1%); with feedback 52, 35, 29 (55.8%)
- Qwen2.5-Coder-14B: 16, 12, 10 (62.5%); with feedback 31, 23, 17 (54.8%)
- Qwen2.5-7B: 3, 3, 2 (66.67%); with feedback 11, 7, 6 (54.5%)
- Gemini-2-Flash: 29, 24, 21 (72.4%); with feedback 55, 44, 38 (69.1%)
- average synthesis time 32.76 s to 34.21 s and average peak memory 677.5 MB to 705.4 MB per kernel across the ten rows
- causes of loss given in Section V-B (pp.6-7): at the PyLog stage, recursion, dynamic memory use and while-loops, plus Dafny-specific data structures and typing; at Vivado HLS, recursive calls, inconsistent function signatures and type mismatches such as a function declared void that computes an integer

where it fails: the authors' own summary is “It is important to note that the current results represent initial demonstrations of the Proof2Silicon flow rather than a fully optimized end-to-end solution.” (Section V-B, p.8). Table III (p.7) shows that for the same task (Cube) different models' verified programs synthesize to different hardware, from 305 to 798 LUTs and 60 ns to 80 ns latency; the paper does not check that they compute the same function.

## numbers that do not add up

- “Crucially, Proof2Silicon achieved an end-to-end hardware synthesis success rate of up to 72%, generating RTL designs through Vivado HLS synthesis flows.” (Abstract, p.1). The 72.4% is 21 synthesized of 29 verified for Gemini-2-Flash without feedback (Table II). End to end from the 100 tasks that row is 21%, and the best row is 38 of 100 (Gemini-2-Flash with feedback). The contributions list words it correctly as a share of verified programs (Section I-A, p.2)
- the headline gain of up to 21% (Abstract, p.1) is a difference in percentage points, and by Table I it is 55% − 33% = 22 points for Gemini-2-Flash; the table prints (+21%)
- “On a 100-task DafnyBench subset (Table I), static prompting baselines were outperformed by SLM-tuned prompting even without feedback, achieving 23% for both ChatGPT-4o and ChatGPT-o1, 16% for Qwen2.5-Coder-14B, 3% for Qwen2.5-7B, and 29% for Gemini-2-Flash.” (Section V-A, p.6). Table I shows the baseline without feedback at 25%, 23%, 15%, 3% and 20%: the trained SLM is lower for ChatGPT-4o, equal for two models, and higher for two
- “Enabling the full verifier feedback loop further improves synthesis rates—ChatGPT-o1mini rises to 55.8%, while synthesis latencies remain stable (32.8–34.2 s) and memory usage exhibits minimal variance (678–683 MB).” (Section V-B, pp.7-8). In Table II the synthesized share falls with feedback for the other four models (52.1% to 50%, 62.5% to 54.8%, 66.67% to 54.5%, 72.4% to 69.1%)
- “These issues account for the observed discrepancy between Compiled to HLS and HLS Synthesized, with approximately 30% of otherwise verified programs excluded during this stage.” (Section V-B, p.7). Between those two columns the loss is 1 to 6 programs per row, which is 8% to 33% of the verified count (33% being 1 of 3 for Qwen2.5-7B without feedback); the loss from verified to synthesized over both stages is 28% to 50%
- the text names the model ChatGPT-o1 (Section V, p.6); the tables name ChatGPT-o1-mini

## already done, so VL should not redo

- Inference: a learned prompt-editing policy is an expensive way to get a 4 to 22 point gain on single Dafny methods; the paper gives no evidence it beats a longer plain repair loop, and the Spec-Harness study in this collection reports that a different prompt optimizer driven by verifier acceptance plateaued. VL has no reason to build this before that comparison exists
- Inference: Dafny as a verified front end to another target has now been tried for Python (the work the paper cites as [15]) and for FPGA hardware here; in both the back half is unverified
- not done: any Rust or Verus experiment; any check of contract strength; any functional validation of the generated hardware

## weight as a competitor to VL

Inference: low. The verified part is single-method Dafny at 11% to 55% success; the hardware claim rests on synthesis completing. It competes with VL only in the phrase it uses for itself, and its own tables contradict the abstract's end-to-end figure.

## techniques for the catalog

- RL prompt repair — train a small policy model with PPO to edit the prompt of a frozen code model, rewarding a verifier pass and penalizing each remaining error
- error-count shaped reward — give a success bonus at zero verifier errors and otherwise a penalty linear in the error count plus a constant, with a large penalty for empty output
- prompt-as-state loop — encode prompt, generated code and verifier feedback as the state and cap the repair at a fixed number of rounds (seven here)
- verification language as compiler front end — verify in Dafny, emit Python with the stock backend, strip the runtime, and hand the result to a domain compiler, accepting that the guarantee stops at the first unverified rewrite
- synthesis-readiness funnel — report counts at each stage (verified, compiled, synthesized) so that the loss per stage is visible
