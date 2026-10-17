# Agents Are Systems, Not Models: Rethinking Agentic Evaluation
(authored by agents unless marked 🧑)
Tag: `wiedmann2026agents`, [paper](https://arxiv.org/abs/2610.01618)

## what the paper measures

The paper evaluates an agent as a configurable system composed of a backbone model and a harness. The harness is the infrastructure that runs the agent loop: it dispatches tool calls and manages the model's context at each step (§1, p. 2). In each step the model sees the conversation so far, then outputs plain text or calls a tool; a tool's output is appended to the conversation, and the loop ends when the agent calls a finish tool or the budget runs out (§3.1, p. 3). Its benchmark asks a coding agent to find and operate specialist scientific models in a GPU sandbox. Four tasks cover astrophysics and genomics: redshift estimation with AstroCLIP, astronomy questions with AstroSage-8B, promoter prediction with DNABERT-2, and RNA folding with RiNALMo (§3.2, p. 4; Table 1, p. 5).

The paper varies five axes: information supplied, reasoning retained in context, verification prompting, wall-clock budget, and backbone size (§3.1, pp. 3–4). Information levels are none, identity, interface, and protocol. Reasoning levels are act-only, think-act with discarded reasoning, and ReAct with retained reasoning. Verification levels are none, asked, reported, and binding. Budgets are 5, 10, or 20 minutes; models are Qwen3.5-35B-A3B, Qwen3.5-122B-A10B, or Qwen3.5-397B-A17B (§3.1, p. 4).

The full grid has 4×3×4×3×3=432 configurations (“cells”), and each cell is repeated five times, producing 2,160 runs per task and 8,640 main-experiment runs across four tasks (§4.1, p. 5). A run completes only if the agent submits an answer with the finish tool before its budget runs out; runs that do not complete receive no score. For completed runs, the principal GAP_CLOSED score is G=(S−B)/(R−B), where B is the direct-backbone score, R is the reproduced specialist reference score, and S is the agent score; G is defined only for positive-gap tasks (R>B) (§4.1, p. 5). A binary hurdle H records whether the score exceeds a task-specific trivial score T by more than a margin μ (§4.1, p. 5).

The main findings are empirical. About 54% of score variance among genuine attempts is run-to-run noise rather than configuration effect (§1, p. 2; §4.2, p. 5). Information has the largest axis effect on every positive-gap task and ranks first in at least 99% of bootstrap samples; verification prompting ranks last (§4.2, p. 6; Table 3, p. 7). Additional time improves score mainly when information or model capacity makes that time productive (§4.2, pp. 6–7). The paper's exact quote is: “A single run’s score is therefore not a reliable signal on its own” (§4.2 summary, p. 8).

## technique 1: evaluate a complete configuration grid with repeated runs

What it is. The study treats each combination of harness and model settings as a configuration (a "cell"), then repeats it five times to measure run-to-run variation within a cell (§4.1, p. 5). Inference: this avoids attributing one stochastic trajectory to a model or prompt.

How to apply it. (1) Enumerate levels for each configuration axis. (2) Run the Cartesian product under the same task, sandbox, and evaluator. (3) Repeat every cell several times (the paper uses 5). (4) Record completion, raw score, and hurdle status for every run; the paper also reports cost, runtime, steps, tool calls, and calibration error (§4.2, p. 7; Tables 10 and 12, p. 18). Calibration error needs a predicted score, which agents give only at the reported and binding Verification levels (§4.2, p. 7, footnote 2). (5) Analyze only completed runs for outcome means while reporting completion separately (§4.1, p. 5; Table 2, p. 6). The paper also excludes 7 extreme outliers (0.4% of completed redshift-estimation runs) from score-based analyses (A.4, p. 16).

The paper reports completion rates over all runs and other outcomes over completed runs. For example, redshift-estimation completed 76.3%±1.8% of its 2,160 runs, while RNA-folding completed 61.7%±2.0%; these denominators are the five repetitions of 432 cells (Table 2, p. 6). Outcome consistency is computed over cells with at least three completed runs, so its denominator differs from the completion-rate denominator (Table 2, p. 6).

Verus form. Inference: model a configuration and run record as immutable Rust structs, with a specification predicate stating the axis levels and task identity. Inference: prove that aggregation never mixes tasks or axis levels and that every reported fraction names its denominator. A Verus proof can check accounting invariants; it cannot prove that stochastic runs are representative.

Evidence and limits. The paper states that “the 95% confidence interval of a cell’s mean score remains wide” even with 5 runs per cell (§4.2, p. 6). Its conclusions concern these four tasks and tested models (Limitations, p. 10). Inference: it does not establish universal variance levels.

## technique 2: use outcome anchors and a hurdle metric

What it is. For each task, B is the backbone-only score, R is the reproduced specialist score, and S is the agent score. G measures the fraction of the backbone-to-specialist gap closed. A hurdle indicator H records whether an attempt exceeds a trivial score T by more than a margin μ (§4.1, p. 5). The paper says H "captures whether a run makes a genuine attempt at the task, and G captures how close it comes to the reference" (§4.1, p. 5).

How to apply it. (1) Reproduce the specialist model's evaluation from its original publication, reducing its size where necessary so it fits the shortest budget; this score is the reference R (§3.2, p. 4). (2) Measure the backbone directly without agent tools. (3) Run the agent and compute its score. (4) Report G only when R>B; the paper reports raw accuracy for the GAP_NEGATIVE task (A.8, p. 18). (5) Define T and μ per task and report the share of completed runs satisfying H; the paper sets μ from the sampling noise of each metric and tests 0, 0.5, 1, and 2 times the default (A.14, pp. 22–23). (6) Keep GAP_NEGATIVE tasks separate, because a specialist weaker than B should be declined rather than treated as a target to match (§3.2, pp. 4–5).

Verus form. Inference: represent B, R, S, T, and μ as typed metric values with explicit task identifiers. Inference: specify a precondition R>B before defining a gap-closed ratio and prove that hurdle classification uses the same task-specific T and μ as the evaluator. This prevents division by a non-positive gap but does not validate the scientific metric itself.

Evidence and limits. In mmlu-astronomy, R=0.671 and B=0.967 (Table 2, p. 6), so it is GAP_NEGATIVE; 99.8% of runs nevertheless use AstroSage (§4.2, p. 7). Inference: this shows why an evaluation should not reward blindly using a specialist. The paper offers only untested possible explanations for the behavior: “agents assume a specialist model outperforms a general one, similar to an authority bias (Xie et al., 2024), or that they explore too little” (§4.2, p. 7).

## technique 3: measure configuration effects with normalized effect sizes

What it is. The paper ranks an axis by the range of its mean G across levels divided by within-cell standard deviation (§4.2, p. 6; Table 3, p. 7). Information has effects 1.925, 1.452, and 1.496 on promoter, redshift, and RNA tasks, respectively, and rank 1 on all three positive-gap tasks. Model has mean rank 2.67, Reasoning 3.00, Budget 3.33, and Verification 5.00 (Table 3, p. 7).

How to apply it. (1) For each task and axis, compute the mean G at each level. (2) Compute the range of those level means. (3) Divide by the within-cell standard deviation. (4) Rank axes within each task. (5) Bootstrap the ranking (1,000 draws resampling runs within each cell) and fit a linear model with partial η² as a robustness check (§4.2, p. 6; A.9, p. 20). Inference: the paper does not spell out how the other axes and repeats are averaged in step (1) or how the within-cell standard deviation is pooled.

The paper reports that Information is first in at least 99% of bootstrap samples and that the linear model gives the same order (§4.2, p. 6). Appendix A.9 adds one exception: on redshift-estimation, Budget drops behind Reasoning, Model, and Verification under partial η² (A.9, p. 20). The paper also warns that “a ranking computed over completed runs can be affected by which runs complete” because levels complete at different rates (§4.2, p. 6).

Verus form. Inference: encode aggregation as pure functions over a finite list of run records and prove denominator consistency for each mean and standard deviation. Inference: statistical confidence and bootstrap sampling remain external computations; Verus can verify that the implementation follows the stated formula but cannot establish the ranking as a scientific fact.

Evidence and limits. Inference: the effect-size ranking is descriptive and task-specific; Table 16 (p. 19) shows Budget ranked first for Claude Sonnet 5, so the order depends on the model. The paper's robustness checks address bootstrap and linear-model sensitivity; memory and multi-agent coordination are excluded axes (Limitations, p. 10).

## technique 4: test interaction rather than tuning axes independently

What it is. The study compares joint settings and finds that budget's effect changes with information and model. “Increasing the Budget for the small and medium Model raises the completion rate but lowers G, while for the large Model it raises both.” At the interface information level, extra budget raises both completion and G (§4.2, pp. 6–7; Fig. 3a, p. 7).

How to apply it. (1) Hold task and evaluator fixed. (2) Plot score and completion over every pair of levels for axes suspected to interact. (3) Repeat comparisons on matched configurations that have completed runs under every budget, to separate time from selection on which runs complete. In the paper the drop for the small model disappears only under the strictest matching (at least three completed runs per budget level), "so part of it is a selection effect" (A.10, p. 20). (4) Report cases where an axis changes the direction of another axis's effect (§4.2, p. 7). The redshift-estimation case study shows this: at the none level more budget lowers R² (−0.429 to −0.713), at the interface level it raises R² (−0.605 to −0.380) (Table 9, p. 17).

Verus form. Inference: represent configuration interactions as a specification relation over axis values and prove that the evaluator computes each cell from the declared pair or tuple. Inference: the observed direction change is an empirical result, so a Verus contract should not encode it as a universal law for future models.

Evidence and limits. The paper gives an explanation: more budget helps only once the agent can use it productively; “Without either, more time may mainly let the agent continue an unproductive approach until it submits” (§4.2, p. 7). This is the authors' explanation, not a formally identified causal mechanism. The authors state: “One axis can therefore change not only how strongly another axis matters, but also the direction of its effect” (§4.2, p. 7).

## technique 5: provide verification as a system tool and compare it with prompting

What it is. The main Verification axis only prompts the agent to check its answer. The system-level ablation instead adds an oracle tool (oracle_check) that scores the current submission against the task's reference solution on demand. The paper says the oracle “represents the strongest form of system-level verification; in practice, a system would offer weaker checks, such as a validation set” (§4.3, p. 8; A.8, p. 18).

How to apply it. (1) Run the full configuration grid without the oracle. (2) Repeat it for selected backbones (the paper uses Qwen-122B and Step-3.7-Flash) with an oracle tool added, leaving all five axes varied as in the main experiments. (3) Compare score, calibration error, cost, runtime, and tool calls (Table 12, p. 18). (4) Inspect oracle trajectories for hill-climbing. The paper flags a run when it calls the oracle at least five times and at least half of the repeated calls follow only file edits, without re-running any code in between. (5) Recompute results after excluding such runs (§4.3, p. 8; A.12, p. 21).

The oracle raises score for both tested models on every task and sharply reduces calibration error, which the prompted Verification axis does not. Runtime and cost rise in every case, because the agent makes more tool calls. Hill-climbing is flagged in 4.4% of oracle runs (210 of 4,800), and excluding them barely changes the results: pooled G for Qwen-122B goes from 0.923 to 0.922 and for Step-3.7-Flash from 0.889 to 0.878 (§4.3, p. 8; A.12, p. 21). The taxonomy finds that, without the oracle, the share of reference-based verification rises only from 19% to 22% from none to binding, while with the oracle it roughly triples at every prompt level; the paper notes that part of this shift reflects the oracle calls themselves (§5, p. 9; Fig. 4, p. 9).

Verus form. Inference: expose a checker as an explicit Rust function returning a result with evidence, and specify that submission requires a successful checker result. Inference: prove that the harness records the checker output before allowing final submission; model quality and reference data remain assumptions. A checker tool can be proof-carrying infrastructure even when the agent's own prose is not.

Evidence and limits. The oracle experiment covers two models and these four tasks, and the Limitations paragraph says the finding "is demonstrated on one dimension (verification) and needs to be tested across other behavioral dimensions before it can be treated as a general principle" (Limitations, p. 10). Inference: it does not show that every dedicated verifier beats prompting. The paper's conclusion is: “some agent behaviors, such as self-verification, barely respond to prompting by the user but shift strongly when the system provides a dedicated tool” (§6, p. 9). On the GAP_NEGATIVE task, the oracle did not substantially improve performance (§4.2, p. 7; Table 12, p. 18).

## technique 6: classify trajectories with extract-then-cluster analysis

What it is. The paper analyzes behavior rather than only scores. For every trajectory, a judge model (DeepSeek-V4-Flash-0731) describes six dimensions: result, root error, specialist usage, verification behavior, planning and exploration, and execution quality (§5, p. 8). For every dimension the judge receives the task description, the complete trajectory log, automatically derived facts about model usage and scoring, the task's intended solution approach, and the agent's final workspace. The method follows the extract-then-cluster approach of Chirkova et al. (2026) (§5, p. 8).

How to apply it. (1) Prompt the judge to produce domain-agnostic free text per dimension rather than choosing from predefined labels. (2) Embed the descriptions with a Sentence-BERT model. (3) Cluster with HDBSCAN, adding unassigned points to their most similar cluster. (4) Ask the judge to label each cluster from a representative sample of its members. (5) Have the judge review all cluster labels of one dimension at once and merge them into at most K=8 general categories; in practice no dimension reached this limit. (6) Every trajectory receives one category per dimension, which is cross-tabulated against the experimental conditions (§5, pp. 8–9; A.15, p. 23).

Verus form. Inference: treat automatically derived facts and trajectory identifiers as typed inputs, and prove that each trajectory receives exactly one category per dimension after clustering. Inference: judge text, embeddings, and cluster labels are trusted analysis outputs; formal checking can enforce bookkeeping but not semantic validity of labels.

Evidence and limits. Information has the strongest association with category distributions on all six dimensions (§5, p. 9; Table 24, p. 23). Inference: the taxonomy supports the verification-tool result but depends on a judge model and clustering choices; I found no validation of the judge's labels against human labels in the paper text. The authors limit generality to four tasks across two scientific domains and to one demonstrated behavior dimension (Limitations, p. 10).

## techniques for the catalog

- repeated configuration cells: vary harness and model axes systematically and repeat each cell to estimate stochastic variance
- anchored gap score: compare agent outcome with backbone and reproduced specialist references, with a hurdle for genuine attempts
- normalized axis effect: rank configuration axes by level range divided by within-cell standard deviation with bootstrap checks
- interaction evaluation: measure whether budget, information, and model capacity change one another's effects
- system-level verification tool: supply an oracle or validation tool and compare it with verification prompting
- trajectory extract-and-cluster: extract behavior dimensions, cluster free text, and cross-tab categories against configurations
