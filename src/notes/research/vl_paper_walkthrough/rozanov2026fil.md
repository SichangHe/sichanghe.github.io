# The FIL Hypothesis: Inductive Biases Help with Kernel Engineering
(authored by agents unless marked 🧑)
Tag: `rozanov2026fil`, [paper](https://arxiv.org/abs/2606.30442)

## claim and model

The paper proposes Feedback Information Loop (FIL), the time from generating a prediction to receiving its verification signal. It argues that data-driven scaling becomes impractical when verification takes hours to weeks; its own KernelBench testbed has a FIL of only minutes. The abstract states: “the Feedback Information Loop (FIL), the time required for a system to receive a verification signal after generating a prediction” (Abstract, p. 1). The paper's method, Inductive Bias Search, decomposes a difficult final metric into ordered submetrics and prompts the model to fix the first failing stage before attempting later stages.

The paper simplifies FIL to verification time (stage 2), although the full loop also has prediction and feedback-use stages (Section 2.1, p. 3). Table 2 calculates 10^6 checks as 114 years at one hour each, 2,738 years at one day, and 19,165 years at one week. Inference: these are arithmetic totals for serial checking, since Table 2 does not mention parallelism; the paper's later formula adds parallelism (k) (Section 3.1.1, p. 5).

## technique: ordered inductive-bias search

when to use it

Use the method when a final correctness or performance check is slow and naturally decomposes into easier prerequisites. Inference: the decomposition must be ordered, so that passing stage (i) is necessary before stage (i+1). The paper defines an ordered sequence (V_1,\ldots,V_N) with (V_i(y)\ge V_j(y)) for (i<j), ending at the final metric (V_N=V) (Section 3.1.1, p. 5).

how to do it

1. Define input space (X), solution space (Y), reference output, and final metric (V) (Section 3.1.1, p. 5).
2. Ask a domain expert to create ordered binary submetrics (V_i), thresholds (t_i), and a prompt bias (B_i) for each stage. The paper calls this the critical human contribution and says it often requires human-crafted verifiers (Section 3.1.2, p. 6).
3. Generate an initial candidate with the LLM (Appendix C, Algorithm 1, p. 17).
4. For each iteration and each stage in order, evaluate the candidate with (V_j) (Algorithm 1, p. 17).
5. At the first stage whose score is below (t_j), call the LLM with the prompt plus the corresponding inductive bias and leave the stage loop (the `break`); the next iteration checks stages again from the first (Algorithm 1, p. 17). The KernelBench prompts include the error message or speedup score (Table 9, p. 20).
6. Stop after the fixed iteration budget and return the candidate (Algorithm 1, p. 17).

The paper says, “Our method is motivated by the slow Feedback Information Loop” (Section 3, p. 4). It also says, “The choice of the ordered decomposition depends on the task at hand and can be based on the existing process of the human” (Section 3.1.2, p. 6). The method's probabilistic rationale is that conditioning on earlier successful stages raises the chance of final success; the paper states this as an expectation, “we expect that successive searches yield a higher final stage probability” (Eq. 1, Section 3.1.1, p. 6), not as a proved result. With parallelism (k), budget (B), and FIL τ, the number of checks is (M=kB/τ), and random search succeeds with (1-(1-p)^M) when candidate success probability is (p) (Section 3.1.1, p. 5). Inductive constraints instead seek to increase (p) when (M) is small.

Verus form (all Inference)

Inference: make each stage a Verus-checkable predicate over a Rust function. A compilation stage is an external build check; runtime and numerical stages can be modeled as executable tests; a formal-correctness stage should be a Verus proof with `requires` and `ensures`. Use `spec fn`s for mathematical stage predicates and `proof fn`s for lemmas that connect earlier conditions to later ones. A loop `invariant` can establish that a candidate remains within the previously passed subset. Verus cannot prove that a prompt bias improves a model's sampling distribution, nor can it certify a performance threshold without a trusted measurement model.

## KernelBench instantiation

The final metric is `fast_k`, which is true when the candidate runs correctly and is faster than the PyTorch reference by factor (k): (I_{\hat y\text{ runs correctly}}[time(y)/time(\hat y)>k]) (Section 4.2, p. 7). The ordered stages are Compilation Success, Runtime Success, Correctness, Fast 1, and Fast 2 (Section 4.2.1, p. 7). Each is binary with threshold 1. Prompts target the first failing stage: debug compilation, then runtime errors, then wrong outputs, then speed. Table 9 gives the stage-specific prompt language (Table 9, p. 20); the Fast 1 and Fast 2 prompts are identical and do not mention 1× or 2×.

The baseline is an iterative refinement method; the paper tests its method against it “by keeping everything fixed and adding only the inductive bias” (Section 4.3, p. 7). KernelBench Level 1 has 100 real-world PyTorch workloads; each candidate is compiled, executed, and profiled (Section 4.1, p. 6).

## evidence

Table 4 reports means ± standard deviation over three runs on a fixed 100-problem Level-1 test set, with Welch one-tailed (p<0.05) tests. Qwen3-14B correctness rises from 0.04±0.02 (iterative refinement) to 0.11±0.01 (+IB); Qwen3-32B rises 0.06±0.01 to 0.11±0.02. DeepSeek-v3.1 rises 0.09±0.01 to 0.20±0.03; Devstral-2512 rises 0.09±0.01 to 0.14±0.01; GPT-OSS-120B rises 0.21±0.02 to 0.33±0.05 (Table 4, p. 9). The maximum compilation gain is +0.31 for Devstral-2512; runtime gain reaches +0.17; correctness gain reaches +0.12 for GPT-OSS-120B (Section 5, “Magnitude of gains”, p. 8). No model exceeds 0.33 absolute correctness (Section 5, p. 8). Inconsistency in the paper: Table 4 gives runtime gains of +0.29 (deepseek-v3.1) and +0.24 (devstral-2512), above the text's “up to +0.17”, and Section 5.1 says compilation gains of +0.22 and +0.29 for DeepSeek and Devstral where Table 4 gives +0.29 and +0.31 (Table 4, p. 9; Section 5.1, p. 8).

The text says “No metric degrades” across “4 architecturally diverse models” (Section 5, p. 7), but the paper's Table 11 (p. 21) shows Qwen3-4B correctness falling from 0.05 to 0.02 with +IB and Qwen3-8B compilation falling from 0.13 to 0.11 and runtime from 0.11 to 0.09, and Table 5 shows Qwen3-Coder-30B-A3B Fast 1 falling from 0.05 to 0.01.

The control study compares additional coding pretraining. Qwen3-Coder-30B-A3B changes only from 0.22 to 0.23 correctness with +IB, while the less-pretrained Qwen3-30B-A3B changes 0.02 to 0.12 (Table 5, p. 9). DeepSeek-Coder changes 0.18 to 0.20. The paper reads this as support for its claim that inductive-bias gains shrink as more data is added (Section 5.2, p. 9). Inference: the control uses one fixed benchmark, the models differ in more than coding data, and the displayed standard deviations are 0.00 for these rows, which the paper says makes significance testing “trivial, but also potentially less reliable” (Table 5, p. 9; Appendix I.1.1, p. 22).

## assumptions and failure modes

Inference: the method assumes that stages are genuinely ordered and that prompts can target the first failure; a poorly chosen decomposition could optimize a proxy. Expert effort is required to create submetrics and thresholds; the authors call this “the human expert contribution of the ordered decomposition” (Section 3.1.2, p. 6). Fast 1 and Fast 2 show small changes, and “only Qwen3-30B-A3B has any statistical significance” there (Section 5.1, p. 9), a model whose reported standard deviations are 0.00 (Table 4, p. 9). The paper itself says KernelBench's FIL is “on the order of minutes, longer than the typical classification or game tasks, but far shorter than the hours or weeks envisioned for future scientific applications” (Appendix I.1, pp. 20–22), so the experiment is not a test at long FIL. The experiments are GPU-specific, use only Level 1, and measure 100 problems with three runs. The paper provides no formal proof of the FIL hypothesis; its evidence is empirical and its formula assumes independent samples.

## what is proved, measured, and trusted

Measured quantities are compilation, runtime, correctness, and speed fractions over the 100-problem test set, with run-to-run variation. Trusted components include the KernelBench reference, compiler/runtime/profiler, stage verifiers, prompt design, model implementations, and timing. The paper's claim is that inductive biases improve this benchmark under a constrained budget; it does not establish that all long-FIL tasks benefit or that humans can always create a useful ordered decomposition.

Inference: for VL, Verus verification time is a FIL component. A practical adaptation would order checks from Rust parsing and compilation, to executable tests, to Verus proof obligations, to stronger system-level properties. The key difference is that a Verus proof is a logical certificate, while a runtime or speed check remains empirical. The paper does not discuss Verus or Rust. Inference: when proof failures are slow, indiscriminate candidate sampling would waste the feedback budget, and stage-specific prompts could focus repairs on syntax, contracts, invariants, or solver lemmas. Inference: this does not justify weakening a contract to pass an earlier stage.

VL should not redo the generic ordered-metric idea, first-failure prompting, or the 100-problem KernelBench comparison. A new contribution would need a Verus-specific decomposition with measured proof-time, timeout, and repair outcomes and an explicit trust boundary.

## techniques for the catalog

- FIL accounting — estimate total verification cost as candidate count times feedback-loop duration, with parallelism included
- ordered metric decomposition — define binary prerequisite metrics ending at the final objective
- first-failing-stage search — evaluate stages in order and prompt a targeted repair at the first failure
- expert inductive-bias prompting — encode domain debugging knowledge as stage-specific prompts
- low-data control — compare the same biases with and without additional domain pretraining
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our setting, by contrast, focuses on regimes where the verification process itself determines the maximum feasible data scale, transforming what has traditionally been an algorithmic challenge into a fundamental data bottleneck."): read the whole paper text; checked every quotation, Table 2 and Table 4/5/11 numbers, the Algorithm 1 steps, section and page references against the text; changed the abstract-quote capitalization, the minutes-to-weeks overstatement, page references for Sections 3.1.2 and 5.1 and Table 9, the Fast 1/Fast 2 prompt description, the baseline wording, and marked own conclusions as Inference; added paper-internal text/table inconsistencies, Table 11 degradations, the low-variance caveat and the paper's own long-FIL limitation; did not check figures (Figures 1-8 and transition plots), cited references, or the GitHub code, and did not recompute significance tests; link is the arXiv ID printed in the paper header.
