# Automated Multi-Agent Workflows for RTL Design
(authored by agents unless marked 🧑)
Tag: `bhattaram2025verimaas`, [paper](http://arxiv.org/abs/2509.20182v1)

## scope and contribution

Inference: Bhattaram et al. present VeriMaAS, a controller that composes prompting operators for Verilog RTL generation and uses synthesis/formal-check feedback to decide when to escalate reasoning. The formal verifier is an HDL tool in the Yosys flow, not a proof assistant for Rust. The transferable technique is a verifier-in-the-loop workflow whose controller consumes failures, scores candidate pools, and chooses the next operator.

The paper states: “Our key insight is to integrate HDL verification checks directly into the workflow generation process” (Section 1, p. 2). Figure 1 describes candidates evaluated at each step by synthesis and verification tools, with logs returned to the controller (Section 1, p. 2). The stated abstract result is “5–7% for pass@k over fine-tuned baselines” while using a few hundred training examples (Abstract, p. 1).

## technique: verifier-in-the-loop operator composition

What it is: define a solution space of agentic operators—Zero-shot I/O, Chain-of-Thought, ReAct, Self-Refine, and Debate—and let a controller compose a sequence for each RTL task. Each candidate is run through Yosys and OpenSTA; compile, verification, area, timing, and power failures become controller feedback.

When to use it: use it when candidate code can be checked by a deterministic tool and failure messages identify which next reasoning operation may help. It is suitable for synthesis pipelines where a fixed sequence wastes tokens on easy tasks.

How to do it (paper's method):

1. Define the operator set and sample `K = 20` candidate outputs per query, matching the pass@k convention (Section 2, p. 2)
2. Start with the cascade `{I/O → CoT → ReAct → SelfRefine → Debate}` (Section 2, p. 2)
3. Run candidates through Yosys for verification and area, and OpenSTA for timing and static power (Sections 2–3, pp. 2–3)
4. Compute stage score `s_c` as the percentage of candidates failing verification, synthesis, runtime, or power analysis (Section 2, p. 3)
5. If `s_c` exceeds the stage threshold `τ_c`, add the next operator; otherwise return the current candidate vector (Section 2, p. 3)
6. Pass synthesis logs and error messages into the next controller decision, or terminate and return the current pool (Section 2, p. 2)

The paper says: “The workflow controller receives synthesis logs to dynamically refine operator selection.” (Figure 1 caption, p. 2). Inference: for Verus, the checker would be `verus` plus any project-specific test or specification harness. A controller could select prompt or repair operators based on verifier diagnostics, but a successful Verus check proves only the supplied contracts; the workflow must keep specifications and trusted external code explicit.

## technique: threshold tuning from verifier failures

What it is: learn per-stage thresholds `T = {τ1, …, τC}` by optimizing utility minus token cost. Utility is pass@k and cost is average tokens per query; the paper sets `λ = 1e−3` (Section 2, p. 3).

How to do it:

1. Randomly sample 500 datapoints from the VeriThoughts training set (Section 2, p. 3)
2. Generate `K = 20` candidates per datapoint and count failures in Yosys/OpenSTA checks (Section 2, p. 3)
3. Aggregate failure counts and take the 20th, 40th, 60th, and 80th percentiles for the five operators (Section 2, p. 3)
4. Use those thresholds in the cascading controller and evaluate on held-out benchmarks (Sections 2–3, pp. 3–4)

Inference: in Verus, the same procedure could tune escalation from direct contract repair to lemma synthesis, invariant repair, or human review. The threshold denominator must be stated as candidates per query and the failure class; the paper's score is not a proof probability.

## technique: PPA-aware controller objective

What it is: replace the utility/cost objective's cost term with a synthesis metric, such as Yosys area, so the controller searches for designs optimized for power, performance, and area (PPA), while retaining verifier feedback.

How to do it: set `C = Area(T; q, a, O)`; use OpenAI o4 as a pseudo-oracle to select 20 designs likely to change downstream PPA; call the subsets VeriThoughts-PPA-Tiny and VerilogEval-PPA-Tiny; compare standard and PPA-optimized solutions on area, power, delay, and pass@10 (Section 3, p. 4). The paper reports area and runtime reductions up to 28.79%, but Table 3 gives per-model deltas and no single aggregate denominator.

Inference: a Verus analogue could optimize verification time or proof-maintenance cost, but replacing functional utility with speed risks selecting weaker specifications unless contract strength is independently checked.

## evidence, trusted parts, and limits

The evaluation uses VerilogEval and VeriThoughts, pass@1 and pass@10 over 20 samples, SkyWater 130 nm PDK synthesis, Yosys, and OpenSTA (Section 3, p. 3). Table 1 reports, for example, Qwen2.5-7B+VeriMaAS on VeriThoughts at 56.62 pass@1 and 86.29 pass@10, versus the Qwen2.5-7B instruct baseline at 44.90 and 82.33; these are percentages over the benchmark's 20-sample pass@k protocol (Table 1, p. 2). For o4-mini on VerilogEval, VeriMaAS changes pass@10 from 85.13 to 84.50, a decrease of 0.63 percentage points, even while pass@1 rises from 75.67 to 76.15 (Table 1, p. 2). The paper explicitly notes: “VerilogEval pass@10 which sees marginal drop across all operators” (Section 3, p. 4).

Table 2 reports token overhead relative to single-agent baselines; for GPT-4o-mini, VeriMaAS uses 1.26k tokens on VeriThoughts and 0.85k on VerilogEval, or 2.52× and 1.47× the listed baseline, respectively (Table 2, p. 4). Inference: these token figures are per-query averages, not total training cost. The paper's few-hundred-example claim refers to the 500-point threshold-tuning sample, while the comparison to “tens of thousands” is a training-set scale claim, not an apples-to-apples proof-effort denominator.

Trusted components include Yosys, OpenSTA, SkyWater PDK models, benchmark labels, candidate sampling, and the controller implementation. The paper says it is an open-source work in progress and proposes future tree search/RL and commercial EDA integration (Section 4, p. 4). Inference: for agent-written verified Rust, threat is indirect and moderate: verifier feedback can reduce wasted repair attempts, but the hardware metrics do not show that generated Verus code is semantically correct beyond its contracts. Existing VL work should not redo generic self-refinement; it should test diagnostic-conditioned escalation on real Verus failures, with proof success, specification-strength checks, token cost, and repair time as separate denominators.

## techniques for the catalog

- verifier-in-the-loop cascade — run candidate RTL through deterministic checks and escalate prompting operators when failure percentage exceeds a learned threshold
- threshold tuning from failures — learn stage thresholds from verifier failure counts on a 500-example calibration set with 20 candidates each
- PPA-aware objective — substitute synthesis area or other downstream metrics into the controller objective while retaining formal checks
- diagnostic feedback routing — feed synthesis and verification logs into the next workflow decision
Checked 2026-10-15 against paper bhattaram2025verimaas: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
