# Beyond Resolution Rates: Behavioral Drivers of Coding Agent Success and Failure
(authored by agents unless marked 🧑)
Tag: `mehtiyev2026behavioral`, [paper](https://arxiv.org/abs/2604.02547)

## what the paper studies
The paper analyzes 9,374 trajectories from 19 coding agents, 8 frameworks, 14 LLMs, 500 SWE-bench Verified tasks, and 12 Python repositories. Its central findings are that trajectory length is confounded by task difficulty while trajectory structure discriminates success from failure consistently, and that the LLM, not the framework, is the primary determinant of which tasks get solved (per-task agreement and resolution-rate gaps; no variance decomposition is reported). The abstract states: “We present a large-scale empirical study analyzing 9,374 trajectories from 19 agents (8 coding agent frameworks, 14 LLMs) on 500 tasks.” (abstract, p.1)

Inference: This is evidence about repair-agent behavior, not formal verification. For VL, the useful transfer is to instrument proof-writing trajectories and reward context gathering, controlled edits, and validation with Verus. The paper does not establish that these behaviors produce sound proofs.

## technique 1: use a complete agent-by-task matrix

What it is. Every agent attempts every benchmark task, allowing comparisons within the same task. The authors explain: “Since every task is attempted by every agent, this enables within-task comparisons that control for task difficulty, a confound that prior studies with 1–3 agents could not address.” (Section 3.1, p.3) Three agents have 443–499 runs because of timeouts or infrastructure failures, so the matrix is nearly, not perfectly, complete (Section 3.1, p.3).

How to apply it. Inference: this procedure is my reading of the paper's design, not a procedure the paper states. (1) Choose a fixed task set. (2) run each agent on each task under the same harness. (3) record success and the complete action/environment trajectory. (4) compare agents within each task before aggregating. The paper uses 500 tasks and labels tasks never-solved, contested, or always-solved by aggregate resolution (Section 4.1, p.4).

Verus form. Inference: build a matrix of Rust/Verus obligations by agent model and harness version. Record whether Verus verifies the target, which solver was used, elapsed time, and the full edit/compiler trace. Compare models on the same obligation so a harder specification is not mistaken for a weaker agent. A Verus success still means only that the checker accepted the stated specification; the benchmark must also test whether the specification expresses the intended behavior.

Evidence and limits. Of 500 tasks, 55 (11%) were never solved, 416 (83%) contested, and 29 (6%) always solved (Figure 2, p.4). The study is limited to 500 Python SWE-bench Verified tasks from 12 repositories, and each task has one run per agent, so stochastic variance is not measured (Section 5, p.9).

## technique 2: encode actions together with environment outcomes

What it is. Instead of recording only the agent action, the paper records action plus response. “We expand this by jointly encoding the agent action and the environment’s response.” (Section 3.2, p.3) A clean edit is `P`, an edit causing a syntax error is `Ps`, a passing validation is `Vp`, and a failed validation is `Vf`; the 13 symbols capture execution quality and error type (Section 3.2, p.3).

How to apply it. Inference: this procedure is my reading of the paper's design, not steps the paper lists. (1) Define a compact alphabet for exploration, locating, editing, reproduction, and validation. (2) append an outcome suffix or symbol when the environment responds. (3) preserve the sequence, not just counts. (4) compute features such as first edit position, patch intensity, and validation proportion. Figure 5 shows why this matters: two 32-step traces on the same task (astropy-13579) differ because one explores first and eventually passes, while the other patches immediately and repeats runtime errors (p.7).

Verus form. Inference: use symbols for repository reads (`L`), specification edits (`S`), proof edits (`P`), successful Verus checks (`Vv`), failed checks (`Vf`), solver timeouts (`Vt`), and test execution. Preserve exact diagnostics so a repeated invariant failure is distinguishable from a syntax error. This encoding is external telemetry; it is not a Verus language construct.

Evidence. The paper’s representative successful trace uses four exploration steps, one clean edit, a patch-fail loop, then passing and final validation; the failed trace starts with a syntax error and repeats `P→Ve` without adaptation (Figure 5, p.7). The authors do not claim that a symbol sequence proves causation.

## technique 3: control confounds with two paired comparisons

What it is. Algorithm 1 compares resolved and failed trajectories in two ways. Approach A fixes an agent and varies tasks, while Approach B fixes a task and varies agents. The paper says: “Comparing resolved and failed trajectories requires controlling for two confounds simultaneously: agent identity, since different agents have different capabilities; and task difficulty, since harder tasks produce more failures.” (Section 3.4.2, p.3)

Steps from Algorithm 1. For Approach A, collect resolved and failed tasks for each agent, skip groups below `n_min = 5`, run a one-sided Mann–Whitney U test and Cliff’s delta, then count significant positive and negative effects. For Approach B, collect resolved and failed agents for each contested task, compute the mean metric difference, apply a two-sided Wilcoxon signed-rank test across tasks, and report the mean difference and fraction with positive difference (Algorithm 1, p.4). The algorithm takes a significance level α; in the text I read, the algorithm itself gives no numeric value, and the paper uses p < 0.05 and p < 0.001 thresholds in its results.

Verus form. Inference: apply Approach A to ask whether one proof-writing agent behaves differently across obligations, and Approach B to compare agents on the exact same obligation. Use the same nonparametric tests only for exploratory behavior metrics; use Verus pass/fail and independently reviewed specifications for correctness claims.

Evidence. For trajectory length, Approach A finds failures longer for every agent, with gaps from +14.0% to +111.9% and p < 0.001 (Table 6, p.6). Approach B reverses the result: on 416 contested tasks, resolved traces average 44.0 steps versus 39.6 failed, resolved traces are longer on 263 tasks (63%), and the Wilcoxon p = 1.9 × 10−9 (Table 6, p.6 and Section 4.2.1). This contradiction is the paper’s point: length is confounded and should not be used alone.

## technique 4: monitor structural behavior in the opening and validation phases

What it is. The paper measures (a) the step of the first edit within the first ten steps, (b) the fraction of the first ten steps spent patching, and (c) the fraction of the trajectory spent validating. Its summary box “Answering RQ2” states: “Trajectory structure discriminates consistently: agents that gather context before editing, avoid premature patching, and invest in validation succeed more.” (Section 4.2, p.7)

How to apply it. Inference: this procedure is my reading of the paper's metric definitions, not steps the paper lists; the paper computes the metrics per agent and correlates them with each agent's overall resolution rate, not per task. (1) Set a ten-step observation window. (2) detect the first source edit. (3) count patch symbols in that window. (4) count validation symbols over the full trace. (5) correlate each metric with resolution and alert on premature patching. The paper’s Figure 6 reports first-edit step ρ = +0.68 (p < 0.001), opening patch intensity ρ = −0.78 (p < 0.001), and validation effort ρ = +0.50 (p < 0.05), each across the 19 agents against resolution rate (Figure 6, p.8; text on p.7).

The result is stable across task complexity. Figure 7 plots the three metrics against four patch-size bins and finds nearly flat lines per agent. The authors conclude: “Agents apply a fixed strategy regardless of what the task demands, suggesting that current agent designs lack mechanisms to assess task complexity and adjust their approach accordingly.” (Section 4.2.2, p.7; Figure 7 on p.8)

Verus form. Inference: for VL, alert if an agent edits a specification or proof before reading the relevant Rust module and existing lemmas; track the first successful Verus check and the share of steps spent rerunning Verus. A useful intervention is to require a read and a small compile/check before more edits. This can prioritize runs for review, but it cannot replace checking.

Limits. Validation correlates with success but is not necessary: Trae/doubao reaches 78% resolution with near-zero validation, while SWE-agent/gpt-4 validates 13% of steps and resolves 23% (Section 4.2.2, p.7). The paper therefore presents association, not a universal rule.

## technique 5: separate LLM capability from framework effects

What it is. The study holds one factor constant while varying the other. “by holding the framework constant and varying the LLM, we isolate the LLM effect; by holding the LLM constant and varying the framework, we isolate the framework effect.” (Section 3.4.3, p.4)

How to apply it. Inference: this procedure is my reading of the paper's design. (1) Compare several LLMs in one framework. (2) compare the same LLM in several frameworks. (3) compute aggregate resolution and per-task outcome agreement. (4) inspect prompts and trajectories for behavioral changes. Same-LLM agreement is 71% for Claude 3.5 Sonnet, 85–88% for Claude 4 Sonnet, and 93% for Claude Opus 4.5 across frameworks; same-framework, different-LLM agreement ranges 47–85% in SWE-agent and 66–88% in OpenHands (Section 4.3, p.7-8; Figure 9, p.9).

The framework gap narrows across Claude generations from 19.4 percentage points to 3.8 and then 0.9 (Section 4.3, p.7). Prompt length did not change total effort: SWE-agent’s prompt is about 350 characters and OpenHands’ is 5,602, yet for Claude 4 Sonnet the resolution difference is only 4% and validation work is nearly identical (18.2 vs. 20.0 actions per trajectory) (Section 4.3, p.8; Figure 10, p.10). For the weaker Claude 3.5 Sonnet, switching framework gives about 20 pp (Section 4.3, p.8).

Verus form. Inference: evaluate Verus agents factorially across model and harness, fixing the proof task and tool budget. This avoids blaming the Rust/Verus orchestration layer for failures caused by model reasoning. Compare proof success, specification-edit behavior, solver retries, and time, but retain an independent specification review.

## what is established, trusted, and risky for VL

The measured claims are benchmark associations, supported by 9,374 trajectories and nonparametric tests, not formal theorems. The study trusts its regex feature extraction, outcome labels, benchmark harness, and one-run trajectories. The authors state that 13-symbol encoding abstracts away finer reasoning and that task labels depend on the evaluated agent population (Section 5, p.9). The 12 never-solved simple-patch tasks are especially relevant: the best agent found the gold-patch file in 12/12 tasks and edited it in 10/12, yet no agent solved any of them (Table 5, p.5; Table 3, p.4). Ten failures were architectural judgment errors, one behavioral abandonment, and one domain-knowledge gap (Table 5, p.5).

Inference: existing VL should not repeat the paper’s generic resolution-rate analysis. It should reuse the controlled paired design and outcome-aware trace encoding for proof repair. The threat to a product that emits agent-written verified Rust is indirect: premature edits and wrong-layer fixes can waste compute and produce plausible but incorrectly specified proofs. Verus checking blocks unsound proof code, but it does not detect a specification that proves the wrong property; the product needs specification review and behavioral tests around the verified code.

## techniques for the catalog

- complete task matrix: run every agent on the same tasks to control task difficulty
- outcome-aware trace encoding: encode actions together with compiler and test responses
- paired confound control: fix agent or task and use nonparametric paired comparisons
- structural monitoring: measure read-first behavior, opening patch intensity, and validation effort
- factor decomposition: hold LLM or framework constant to separate their contributions
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "On the same task, the agents that succeed take more steps than the agents that fail."): read the whole paper text and the whole study; checked every quotation, number (9,374 trajectories, 19 agents, 55/416/29 task split, Table 6 percentages and counts, correlations in Figure 6, agreement and gap figures in Section 4.3, prompt sizes), Algorithm 1 steps, and section, table, figure and page references against the paper and the PDF page breaks. Changed: page references for Table 6 (p.7 to p.6), Figure 5 (p.6 to p.7), Section 4.2.2 (p.8 to p.7), Section 4.3, Figure 9 and Figure 10, and Section 5 (p.11 to p.9); moved the 'avoid premature patching' quotation from the abstract to the Answering RQ2 box (the abstract does not contain it); corrected 'all agents found the gold-patch file' to the best agent (Table 5 caption); fixed the quote start of Section 3.4.3 to match the original lowercase; reworded the central-findings sentence and the alpha note; marked the how-to-apply procedures as Inference. Not checked: the supplementary material, the cited references, the Verus transfer claims (labelled Inference), and numbers read only from figure graphics.
