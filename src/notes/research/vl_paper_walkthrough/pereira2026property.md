# Property-Guided LLM Program Synthesis for Planning
(authored by agents unless marked 🧑)
Tag: `pereira2026property`, [paper](https://www.semanticscholar.org/paper/9ebbff25639ca1475e3065c2b54eb4f9912b6fa0)

This paper applies counterexample-guided inductive synthesis (CEGIS) to LLM-generated planning heuristics. Instead of ranking many Python programs by a numeric score, a validator checks a formal directness property and returns a concrete failing state when the property is violated. The abstract says, “When the property is violated, we stop the evaluation early and provide the LLM with a concrete counterexample showing exactly how the program failed” (Abstract, p.1). The system synthesizes one domain-dependent heuristic per PDDL domain, validates it on training tasks, and tests generalization on larger out-of-distribution tasks (§1, pp.1–2).

## technique: choose an actionable formal property

A direct heuristic requires that every alive state reachable from the initial state by repeatedly taking strictly improving transitions has a strictly improving successor. Every improving successor must be a goal or remain in that reachable set (§2, p.3; §3.1, p.4). Hill climbing (HC) therefore reaches a goal without backtracking. The stronger descending/dead-end-avoiding property requires progress at every alive state, including states HC would never visit; directness restricts the obligation to the reachable improving subgraph (§2, pp.3–4).

Apply it by defining the state transition relation, heuristic value, alive state, and strict improvement; then express the property over the states reachable by improvement. Reject a candidate at the first state with no improving successor. Inference: for VL, a similar property can require that every reachable nonterminal Rust state has a transition preserving an invariant and decreasing a well-founded rank. Verus can encode the invariant and rank in `requires`, `ensures`, loop invariants, and proof functions; this is an inference because the paper studies PDDL and Python, not Verus. Inference: a property is useful only if its violation can be turned into a concrete program input and state.

## technique: counterexample-driven repair loop

The loop keeps a history of candidates and their failure feedback. An initial prompt provides the PDDL domain, smallest and largest training tasks, example heuristic code from disjoint domains, planner code, and a checklist. On failure, the repair prompt adds the failing task; the failing state and its heuristic value; each successor and its heuristic value; the direct-property definition; all previous heuristics and feedback; and the checklist (§3.2, pp.4–5). The paper states, “This loop repeats until the heuristic passes the full training set or a generation budget is exhausted” (§3, p.4).

Steps: (1) ask the LLM for one candidate; (2) execute validation; (3) stop at the first violation; (4) record the concrete state, values, and successors; (5) prompt a repair with the failure and complete history; (6) repeat until every training task passes or ten iterations are used. Inference: a VL repair prompt can include the failing verifier obligation, source span, model state, and counterexample trace, while preserving prior attempts to avoid oscillation. Inference: only the verifier's successful proof is evidence; the LLM's explanation of a repair is not.

## technique: bounded validator with early stopping

Validation runs depth-first search from the initial state. At each expanded non-goal state, it checks for a successor `s'` with `h(s') < h(s)`. If none exists, it returns the state and all successor values. If one exists, DFS pushes only strictly improving successors. It applies this to each training task and stops at the first failure (§3.3, p.5). Because there can be exponentially many improving paths, each task has a time limit; if the limit expires before a counterexample is found, the candidate is treated as direct for that task (§3.3, p.5).

Inference: bounded validation is a sound refutation procedure for found counterexamples but not a proof of universal directness when time expires. Inference: Verus checking is generally symbolic rather than bounded DFS; a VL system could use symbolic verification for universal guarantees and concrete counterexamples from failed proof obligations for repair. If it uses bounded execution, it must label timeout acceptance as an assumption.

## technique: synthesize once per domain and amortize

The LLM is called once per domain per candidate; the resulting heuristic solves all tasks in that domain, including unseen test tasks (§4, p.5). Training uses ten IPC 2023 Learning Track domains, 30 seconds and 8 GiB per task, and at most ten repair iterations; testing uses 90 tasks per domain, 5 minutes and 8 GiB per run, with three independent runs (§4, p.5). The key idea is to pay synthesis cost once and amortize it over a task distribution, rather than invoke an LLM for every plan.

Inference: for VL, synthesize reusable verified components or API contracts per subsystem and apply them across many inputs. This does not remove the need to verify each concrete instantiation if assumptions differ. Inference: domain-level amortization is attractive for agent-written Rust libraries, but the paper provides no evidence about changing dependencies, unsafe code, or hardware behavior.

## evidence and comparison

Across ten domains and three runs (30 runs), the repair loop generated 101 candidates total, 3.4 per run on average (standard deviation 3.0); eight domains converged within five candidates, and Sokoban and Floortile were outliers (§4, p.6; Appendix C, p.15). The sample-and-select baseline always generated 25 candidates per domain, so the paper reports a 7.4× reduction in inference cost per run. Average evaluation time was 10.75 minutes per domain versus 206.25 CPU-hours for the baseline, a reported 1.15×10^3 reduction (§4, p.6). The denominators are 30 runs and ten domains; CPU-time and wall-time are different resource measures, so the ratio should be read as the paper reports it, not as a universal speedup.

On 900 test tasks (90 per domain), direct heuristics with HC solved an average 623.3 tasks, compared with 573 for sample-and-select with GBFS and 298 for FF with GBFS (Table 1, p.6). The table's proposed values are averages over three runs; the appendix gives Direct 623.3 ± 6.7. The coverage-feedback ablation solved 572.7 ± 15.95 with GBFS and 412.33 ± 41.93 with HC (Appendix B, p.14), showing that numeric coverage alone does not teach HC directness. Across three runs and 900 tasks (2,700 evaluations), only one test evaluation stopped because of a direct-property violation; the others found a plan or timed out (§4, p.7). This is empirical generalization, not universal certification.

## failure modes, trust, and VL threat

The method assumes an efficiently checkable property with actionable counterexamples. The limitations section states, “For problems where no such informative property is available, or where the training set is too small to expose meaningful counterexamples, the repair loop loses its main advantage and degenerates to score-based ranking” (§6, p.9). It checks only a small training set under bounded resources, and passing does not certify unseen tasks (§6, p.9). It synthesizes unconstrained Python, making results harder to interpret or verify than structured feature representations (§6, p.9). The property itself is a modeling assumption: directness guarantees HC progress, but does not establish that the heuristic values are meaningful for another planner.

Trusted elements include the PDDL parser, planner, DFS validator, time-limit policy, Python runtime, LLM, and the assumption that training tasks represent deployment. Inference: the threat to VL is high when a verifier emits only a scalar “failed” result; counterexamples can direct repair toward the exact state and obligation. Inference: a Verus integration should preserve the concrete trace, then re-run full verification after repair. Inference: the paper's bounded timeout acceptance is unsafe as proof evidence and should not be copied into a soundness claim. Existing work already established CEGIS and planning directness; VL should not redo those concepts, but can test counterexample-guided repair for Verus contracts and measure whether counterexamples improve proof repair rather than merely code execution.

## techniques for the catalog

- actionable property selection — define a formal progress or safety property whose violations expose concrete failing states

- counterexample-guided repair — return the first counterexample and prior attempts to an LLM for targeted regeneration

- early-stopping validation — traverse only relevant improving states and stop evaluation at the first violation

- bounded acceptance accounting — record time and memory limits and treat timeout-based acceptance as incomplete evidence

- domain-level amortization — synthesize one reusable program per domain and evaluate it across in-distribution and unseen tasks

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
