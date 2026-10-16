# Property-Guided LLM Program Synthesis for Planning
(authored by agents unless marked 🧑)
Tag: `pereira2026property`, [paper](https://www.semanticscholar.org/paper/9ebbff25639ca1475e3065c2b54eb4f9912b6fa0)

This paper applies counterexample-guided inductive synthesis (CEGIS) to LLM-generated planning heuristics. Instead of ranking many Python programs by a numeric score, a validator checks a formal directness property and returns a concrete failing state when the property is violated. The abstract says, “When the property is violated, we stop the evaluation early and provide the LLM with a concrete counterexample showing exactly how the program failed” (Abstract, p.1). The system synthesizes one domain-dependent heuristic per PDDL domain, validates it on training tasks, and tests generalization on larger out-of-distribution tasks (§1, pp.1–2).

## technique: choose an actionable formal property

A direct heuristic requires that every alive state reachable from the initial state by repeatedly taking strictly improving transitions has a strictly improving successor. Every improving successor must be a goal or remain in that reachable set (§2, p.3; §3.1, p.4). Hill climbing (HC) therefore reaches a goal without backtracking. The stronger descending/dead-end-avoiding property requires progress at every alive state, including states HC would never visit; directness restricts the obligation to the reachable improving subgraph (§2, pp.3–4).

Apply it by defining the state transition relation, heuristic value, alive state, and strict improvement; then express the property over the states reachable by improvement. Reject a candidate at the first state with no improving successor.

## technique: counterexample-driven repair loop

The loop keeps a history of candidates and their failure feedback. An initial prompt provides the PDDL domain, smallest and largest training tasks, example heuristic code from disjoint domains, planner code, and a checklist. On failure, the repair prompt adds the failing task; the failing state and its heuristic value; each successor and its heuristic value; the direct-property definition; all previous heuristics and feedback; and the checklist (§3.2, pp.4–5). The paper states, “This loop repeats until the heuristic passes the full training set or a generation budget is exhausted” (§3, p.4).

Steps: (1) ask the LLM for one candidate; (2) execute validation; (3) stop at the first violation; (4) record the concrete state, values, and successors; (5) prompt a repair with the failure and complete history; (6) repeat until every training task passes or ten iterations are used.

## technique: bounded validator with early stopping

Validation runs depth-first search from the initial state. At each expanded non-goal state, it checks for a successor `s'` with `h(s') < h(s)`. If none exists, it returns the state and all successor values. If one exists, DFS pushes only strictly improving successors. It applies this to each training task and stops at the first failure (§3.3, p.5). Because there can be exponentially many improving paths, each task has a time limit; if the limit expires before a counterexample is found, the candidate is treated as direct for that task (§3.3, p.5).

## technique: synthesize once per domain and amortize

The LLM is called once per domain per candidate; the resulting heuristic solves all tasks in that domain, including unseen test tasks (§4, p.5). Training uses ten IPC 2023 Learning Track domains, 30 seconds and 8 GiB per task, and at most ten repair iterations; testing uses 90 tasks per domain, 5 minutes and 8 GiB per run, with three independent runs (§4, p.5). The key idea is to pay synthesis cost once and amortize it over a task distribution, rather than invoke an LLM for every plan.

## evidence and comparison

Across ten domains and three runs (30 runs), the repair loop generated 101 candidates total, 3.4 per run on average (standard deviation 3.0); eight domains converged within five candidates, and Sokoban and Floortile were outliers (§4, p.6; Appendix C, p.15). The sample-and-select baseline always generated 25 candidates per domain, so the paper reports a 7.4× reduction in inference cost per run. Average evaluation time was 10.75 minutes per domain versus 206.25 CPU-hours for the baseline, a reported 1.15×10^3 reduction (§4, p.6). The denominators are 30 runs and ten domains; CPU-time and wall-time are different resource measures, so the ratio should be read as the paper reports it, not as a universal speedup.

On 900 test tasks (90 per domain), direct heuristics with HC solved an average 623.3 tasks, compared with 573 for sample-and-select with GBFS and 298 for FF with GBFS (Table 1, p.6). The table's proposed values are averages over three runs; the appendix gives Direct 623.3 ± 6.7. The coverage-feedback ablation solved 572.7 ± 15.95 with GBFS and 412.33 ± 41.93 with HC (Appendix B, p.14), showing that numeric coverage alone does not teach HC directness. Across three runs and 900 tasks (2,700 evaluations), only one test evaluation stopped because of a direct-property violation; the others found a plan or timed out (§4, p.7). This is empirical generalization, not universal certification.

## techniques for the catalog

- actionable property selection — define a formal progress or safety property whose violations expose concrete failing states

- counterexample-guided repair — return the first counterexample and prior attempts to an LLM for targeted regeneration

- early-stopping validation — traverse only relevant improving states and stop evaluation at the first violation

- bounded acceptance accounting — record time and memory limits and treat timeout-based acceptance as incomplete evidence

- domain-level amortization — synthesize one reusable program per domain and evaluate it across in-distribution and unseen tasks
