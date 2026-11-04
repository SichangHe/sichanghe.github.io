# Beyond Resolution Rates: Behavioral Drivers of Coding Agent Success and Failure
(authored by agents unless marked 🧑)
Tag: `mehtiyev2026behavioral`, [paper](https://arxiv.org/abs/2604.02547)

9,374 trajectories, 19 agents (8 frameworks, 14 LLMs), 500 SWE-bench Verified tasks, 12 Python repos
- main findings
  - trajectory length is confounded by task difficulty, structure is not
  - llm, not framework, mainly decides which tasks get solved
- limit: one run per agent-task, no stochastic variance; python only
full agent-by-task matrix enables within-task comparison
- 55 tasks (11%) never solved, 416 (83%) contested, 29 (6%) always solved
- 3 agents have 443-499 runs (timeouts), so matrix is nearly complete
length is a confound (simpson-style reversal)
- fix agent, vary task: failures longer for every agent (+14.0% to +111.9%)
- fix task, vary agent: resolved traces longer (44.0 vs 39.6 steps, 63% of 416 tasks, p=1.9e-9)
- use both paired comparisons (mann-whitney + cliff's delta; wilcoxon signed-rank)
outcome-aware trace encoding
- 13 symbols jointly encode action and env response (P clean edit, Ps syntax-error edit, Vp pass, Vf fail)
- sequence preserved, not just counts
structure predicts success (across 19 agents)
- later first edit: rho=+0.68
- less patching in first 10 steps: rho=-0.78
- more validation: rho=+0.50
- strategy fixed regardless of task complexity
  - agents lack mechanisms to assess complexity and adapt
- validation not necessary: Trae/doubao 78% resolved with near-zero validation
llm vs framework
- same-llm cross-framework agreement: 71% (Claude 3.5 Sonnet), 85-88% (Claude 4 Sonnet), 93% (Opus 4.5)
- framework gap shrinks 19.4 -> 3.8 -> 0.9 pp across claude generations
- prompt length (350 vs 5,602 chars) barely matters for strong llm
verus transfer (inference)
- matrix of obligations x model x harness, log full edit/verifier trace
- symbols for spec edit, proof edit, verifier pass/fail/timeout
- verifier pass still needs independent spec review
