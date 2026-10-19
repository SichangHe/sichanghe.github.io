# Automated Multi-Agent Workflows for RTL Design
(authored by agents unless marked 🧑)
Tag: `bhattaram2025verimaas`, [paper](http://arxiv.org/abs/2509.20182v1)

## scope and contribution

Bhattaram et al. present VeriMaAS, a controller that composes prompting operators for Verilog RTL generation and uses HDL tool feedback to decide when to escalate reasoning. Inference: the transferable technique is a verifier-in-the-loop workflow whose controller consumes failures, scores candidate pools, and chooses the next operator.

The paper states: “Our key insight is to integrate HDL verification checks directly into the workflow generation process: we dynamically provide agentic reasoning with design logs and error messages from RTL/EDA synthesis tools to guide workflow creation.” (Section 1, p. 2). The abstract claims: “Our method improves synthesis performance by 5–7% for pass@k over fine-tuned baselines, while requiring only a few hundred “training” examples, representing an order-of-magnitude reduction in supervision cost.” (p. 1). Table 1 shows mixed results against fine-tuned models, so this claim should not be read as a uniform improvement.

## technique: verifier-in-the-loop operator composition

What it is: define a solution space of agentic operators—Zero-shot I/O, Chain-of-Thought, ReAct, Self-Refine, and Debate—and let a controller compose a sequence for each RTL task. Each candidate is run through Yosys and OpenSTA; compile, verification, area, timing, and power failures become controller feedback.

Inference: use this approach when candidate code has automated checks and failure feedback can inform escalation. The paper fixes the operator order; it does not describe a learned mapping from individual diagnostic types to particular repair operations.

How to do it (paper's method):

1. Define the operator set and sample `K = 20` candidate outputs per query, matching the pass@k convention (Section 2, p. 2)
2. Start with the cascade `{I/O → CoT → ReAct → SelfRefine → Debate}` (Section 2, p. 2)
3. Run candidates through Yosys for verification and area, and OpenSTA for timing and static power (Sections 2–3, pp. 2–3)
4. Compute stage score `s_c` as the percentage of candidates failing verification, synthesis, runtime, or power analysis (Section 2, p. 3)
5. Advance when `s_c` exceeds the stage threshold `τ_c`; return the current candidate vector when it falls below the threshold. The paper does not specify the equality case consistently (Section 2, pp. 2–3)
6. Pass synthesis logs and error messages into the next controller decision, or terminate and return the current pool (Section 2, p. 2)

The paper says: “The workflow controller receives synthesis logs to dynamically refine operator selection.” (Figure 1 caption, p. 2). Inference: for Verus, the checker would be `verus` plus any project-specific test or specification harness. A controller could select prompt or repair operators based on verifier diagnostics, but a successful Verus check proves only the supplied contracts; the workflow must keep specifications and trusted external code explicit.

## technique: threshold tuning from verifier failures

What it is: tune per-stage thresholds `T = {τ1, …, τC}`. Equation 1 states the objective as expected utility minus `λ` times cost; utility is pass@k, cost is average tokens per query, and `λ = 1e−3`. The implemented procedure uses failure-count percentiles rather than a reported search over that objective (Section 2, p. 3). The paper states: “To determine thresholds T , we aggregate failure counts across all samples and compute the 20th, 40th, 60th, and 80th percentiles (i.e., corresponding to our five operators in O).”

How to do it:

1. Randomly sample 500 datapoints from the VeriThoughts training set (Section 2, p. 3)
2. Compute pass@k and token cost against the ground-truth design; generate `K = 20` candidates per query and count failures in Yosys/OpenSTA checks (Section 2, p. 3)
3. Aggregate failure counts and take the 20th, 40th, 60th, and 80th percentiles for the five operators (Section 2, p. 3)
4. Use those thresholds in the cascading controller and evaluate on VeriThoughts and VerilogEval (Sections 2–3, p. 3). The paper does not explain how tuning samples are excluded from evaluation

Inference: in Verus, the same procedure could tune escalation from direct contract repair to lemma synthesis, invariant repair, or human review. The threshold denominator must be stated as candidates per query and the failure class; the paper's score is not a proof probability.

## technique: PPA-aware controller objective

What it is: replace the objective's token-cost term with Yosys area and compare resulting power, performance, and area (PPA). The paper states: “As a proof of concept, we set the cost term (Eq. 1) to the Yosys-reported area” (Section 3, p. 4).

How to do it: set `C = Area(T; q, a, O)`; use OpenAI o4 as a pseudo-oracle to select 20 designs likely to change downstream PPA; call the subsets VeriThoughts-PPA-Tiny and VerilogEval-PPA-Tiny; compare standard and PPA-optimized solutions on area, power, delay, and pass@10 (Section 3, p. 4). The prose reports: “As expected, we observe area and runtime reductions by up to 28.79%.” Table 3 instead labels the timing column `∆Delay%`: its largest area reduction is 28.79% for Qwen2.5-7B on VerilogEval-PPA-Tiny, whose delay reduction is 24.58%. The caption distinguishes PPA subsets from correctness evaluation: “Pass@10 deltas are on entire benchmark vs. +VeriMaAS baselines (Table 1).” (Table 3, p. 4).

Inference: a Verus analogue could substitute verification time for token cost while retaining proof success as utility. Comparisons would need fixed contracts to avoid rewarding weaker specifications.

## evidence, trusted parts, and limits

The evaluation uses VerilogEval and VeriThoughts, pass@1 and pass@10 over 20 samples, Skywater 130 nm PDK synthesis, Yosys, and OpenSTA (Section 3, p. 3). The authors state: “We evaluate performance on two state-of-the-art benchmarks, VerilogEval [13] and VeriThoughts [30], and report pass@1 and pass@10 scores over 20 samples following the VeriThoughts repo [30].” Table 1 reports, for example, Qwen2.5-7B+VeriMaAS on VeriThoughts at 56.62 pass@1 and 86.29 pass@10, versus the Qwen2.5-7B instruct baseline at 44.90 and 82.33; these are percentages over the benchmark's 20-sample pass@k protocol (Table 1, p. 3). For o4-mini on VerilogEval, VeriMaAS changes pass@10 from 85.13 to 84.50, a decrease of 0.63 percentage points, even while pass@1 rises from 75.67 to 76.15 (Table 1, p. 3). Table 1 also shows a VerilogEval pass@10 decrease for Qwen3-8B, from 74.64 to 74.18. The prose says “VerilogEval pass@10 which sees marginal drop across all operators” (Section 3, p. 4), but Table 2 supports that statement for o4-mini; the GPT-4o-mini and Qwen2.5-14B rows show increases.

Table 2 reports token overhead relative to single-agent baselines; for GPT-4o-mini, VeriMaAS uses 1.26k tokens on VeriThoughts and 0.85k on VerilogEval, or 2.52× and 1.47× the listed baseline, respectively (Table 2, p. 4). Section 2 defines cost as “the average number of tokens per query” (p. 3); these figures are not total training cost. The paper's few-hundred-example claim refers to the 500-point threshold-tuning sample, while the comparison to “tens of thousands” is a training-set scale claim, not an apples-to-apples proof-effort denominator.

Inference: the results depend on Yosys, OpenSTA, PDK models, benchmark references, candidate sampling, and the controller implementation. The paper states, “we maintain our prototype as an open-source WiP repository” and proposes “incorporating tree-search or RL-based policies” (Section 4, p. 4). Inference: the transferable idea for verified Rust is escalation based on checker feedback. These hardware results provide no direct evidence of Verus proof success; testing that transfer would require Verus tasks with fixed specifications and measurements of proof success, token cost, and repair time.

## techniques for the catalog

- verifier-in-the-loop cascade — run candidate RTL through deterministic checks and escalate prompting operators when failure percentage exceeds a learned threshold
- threshold tuning from failures — learn stage thresholds from verifier failure counts on a 500-example calibration set with 20 candidates each
- PPA-aware objective — substitute Yosys area for token cost in the controller objective while retaining HDL checks
- diagnostic feedback routing — feed synthesis and verification logs into the next workflow decision
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Based on synthesis results for K = 20 candidates per query, we count how many fail to pass Yosys and OpenSTA checks."): checked all six pages, quotations, numbers, references, method steps, author/year tag, and arXiv identifier; corrected Table 1 page references, separated the stated objective from percentile tuning, clarified threshold equality and unspecified evaluation separation, distinguished delay from runtime and PPA subsets from full-benchmark pass@10, qualified nonuniform gains, and marked transfer recommendations as inferences; did not inspect the prototype, rerun experiments, or verify cited works.
