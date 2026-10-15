# LEVER: Adaptive Cost-Aware Proof Search Over AND/OR Graphs
(authored by agents unless marked 🧑)
Tag: `jain2026lever`, [paper](https://www.semanticscholar.org/paper/810dd439763070221f2281ee3b814c8abc3e1cce)

## problem and contribution

LEVER treats proof search as optimization over correct proofs. Instead of finding any Lean proof and refactoring it later, it maintains an AND/OR graph and chooses expansions using a value that combines realized costs with predictions for open subgoals. The paper summarizes the goal: “L EVER scores partial proofs over an AND/OR proof graph, combining realized objective values with predictions for open subgoals, so the objective guides search before a proof is complete.” (Abstract, p. 1.) Correctness is a hard constraint enforced by the Lean kernel; the objective can be computational cost, proof length, topical impurity, or a weighted combination.

The evaluation uses PutnamBench Lean 4. The original set has 672 problems; the controlled study ranks them by a published NearAI run, uses ranks 51–150, calibrates on 20, and evaluates on 80 (Section 4.1, p. 5). At a common re-priced $3 budget per problem, LEVER solves 0.963 of 80 problems and costs $0.95 on average; NearAI solves 0.800 and costs $1.44 (Table 1, p. 7). Thus the reported 34% reduction is `(1.44−0.95)/1.44`, with denominator 80 for solve rates. These are measurements for one model, Lean version, price table, and selected 80-problem slice, not a universal cost guarantee.

## technique: AND/OR proof representation

Use this when one goal can have alternative decompositions and each decomposition creates several required subgoals. An OR node is a theorem or goal; an AND node is a decomposition. An OR node is solved if any child is solved; an AND node is solved only when all children are solved. A solution subgraph picks exactly one AND child for every OR node and all children for every selected AND node. The paper states: “Then each S maps to a unique proof written in Lean.” (Section 3.1, p. 3.) Assign every edge a nonnegative cost. Back up a sum at AND nodes and a minimum at OR nodes; the root value is the cheapest currently represented solution.

Inference: in Verus, represent each OR node as an unsolved verification obligation and each AND node as a candidate proof decomposition, such as establish arithmetic fact, then call a lemma, then close a postcondition A decomposition is accepted only if the resulting Rust/Verus fragment compiles and verifies. Verus does not expose LEVER's graph API, so this graph must be maintained by an external orchestrator that stores source fragments and verifier results. Inference: keep shared obligations with explicit ownership or memoization; blindly duplicating them can misprice work.

## technique: adaptive selection, expansion, and backpropagation

Use this when LLM expansions are stochastic and redrawing an existing goal can produce a cheaper proof. Algorithm 1 initializes a root prior, repeatedly selects goals along the current best solution subgraph, expands each selected goal, attaches priors to new subgoals, and backpropagates values until the budget is spent or selection returns nothing (Algorithm 1, p. 4). Selection descends by minimum at OR and all children at AND. Each OR node has a prior child representing an untried fresh decomposition. A redraw is selected only when its predicted value beats the incumbent by a margin δ.

Expansion asks an LLM agent to write a decomposition; Lean checks it and creates OR nodes for open subgoals. Backpropagation updates every prior on the path. For a goal with prior `V0(g)` and observed decomposition costs `v_i`, LEVER updates the log-cost mean as `μ̂_g=(n log V0(g)+Σ log v_i)/(n+k)`, with `n=σ²/ρ²`, and uses `Ṽ(g)=exp(μ̂_g)` (Section 3.3, p. 4). A failed attempt contributes no realized cost and raises the estimate by one spread.

Inference: a Verus orchestrator can use verifier compile time, model-token cost, or a measured search budget as edge cost. Expansion writes a candidate `proof fn`, lemma invocation, or `assert`/`calc` block; Verus diagnostics determine whether children are real obligations. Backpropagation should sum required subproof costs and choose the minimum alternative. A model prior is heuristic, never a proof: only a completed Verus check can mark an OR node solved.

## technique: composable objective and cost-to-go

Use this to optimize a proof property during search. LEVER separates sunk spend (already paid and immutable) from remaining computational cost `V_comp`. Any additive proof metric `m` receives edge costs and a backed-up value `V_m`; the combined objective is `C(n)=V_comp(n)+Σ λ_m V_m(n)`, where λ is the price of one metric unit (Section 3.3, p. 4). Setting all λ to zero minimizes remaining computation. Correctness is represented by infinite cost for an unsolved goal, so every finite objective is over type-checking proofs.

The implementation measures computational cost in dollars, proof length in Lean tokens, and topical impurity as references outside the theorem's namespace and directory (Section 4.3, pp. 6–7). Length is easy to game—for example, one `nlinarith` call can be short without explaining mathematics—so it is a proxy rather than a semantic quality measure. Impurity is also a proxy based on Mathlib's organization, not a general definition of mathematical relevance.

Inference: for Verus, candidate metrics can include verifier wall time, proof-source size, number of external lemmas, or solver instability, but each needs an explicit measurable definition. A weighted objective can prioritize shorter, faster proofs while retaining Verus verification as a constraint. Do not interpret a low source-size score as a stronger specification or a more maintainable proof without separate review.

## technique: value-function priors

Use a cheap value model to estimate the cost of closing an open goal before spending an LLM expansion. LEVER's value function asks an LLM to place computational cost and proof length into seven logarithmic bins; it prices a bin at its geometric center. For length, it multiplies the center by 0.2 to encourage exploration of short proofs. The prompt includes 40 in-context calibration examples. Value calls are 0.89% of LEVER's spend (Section 4.4, p. 7). For impurity, predicting zero made every open goal look pure and caused unstable redraws, so the implementation uses a constant four references, the 25th percentile on calibration goals (Section 4.4, p. 7).

Inference: in Verus, calibrate priors on completed obligations from the target repository, using bins for verifier time, token cost, or proof size. Track prediction error and a redraw margin, and update priors with realized checks. The constant-impurity workaround shows a general limitation: a value model can destabilize search when its floor or uncertainty is wrong. Keep priors advisory and expose their calibration set.

## technique: agentic subgoal decomposition

Each expansion is an LLM conversation with a Lean workspace, compiler, Mathlib retrieval, Python, and file I/O. The agent may submit a complete proof or leave helper lemmas as open subgoals. A planner first writes an informal proof, and every expansion receives that plan; each subgoal starts from compacted parent output rather than the entire parent transcript (Section 4.2, p. 6). The root is assembled into one file and checked without `sorry`, `admit`, `axiom`, or `native decide` (Section 4.2, p. 6).

Inference: a Verus implementation can give each obligation a local Rust workspace, project specifications, and retrieved lemmas; pass a compact parent rationale and obligation-specific context; and require a final build with no unchecked placeholders or external-body escape hatches. Verus syntax and trust rules differ from Lean, so the exact prohibition list must follow the repository's Verus policy. The decomposition architecture transfers; the agent's Lean tools and use of `sorry` as a temporary dependency marker do not.

## evidence: computational cost and proof quality

At the $3 budget and N=80, LEVER solves 96.3% versus NearAI's 80.0% and reads 17.9M input tokens per problem versus 42.0M (Table 1, p. 7). The paper reports: “LEVER solves 96.3% of the problems, against 80.0% for NearAI, and costs 34% less.” (Section 5.1, p. 7.) Under the quality study, N=20 problems receive a $4.5 budget. For topical impurity, λ=0.1 yields a 42% mean reduction at $1.85 per problem; post-hoc refactoring yields 33% at $2.88. The standard deviations are 32 and 101 percentage points respectively (Section 5.2, p. 9). For length, λ=0.001 produces a 21% reduction at $2.59, while refactoring produces 31% at $1.83 (Section 5.2, p. 8). These denominators are 20 problems; failed or over-budget runs are scored at the NearAI baseline metric and charged $4.5 (Section 5.2, p. 8).

The quality trade-off is explicit: increasing λ improves the selected metric but costs more. Table 2 also shows interaction: optimizing length makes impurity 18% lower at the strongest setting, whereas optimizing impurity makes proofs 10% longer. The authors' evidence supports search-time steering for this benchmark and model; it does not establish that topical impurity is a reliable proxy for mathematical quality.

## formal assurance, limits, and Verus implications

The paper includes a Lean-verified theorem in Appendix D: with exact priors and nonnegative additive costs on a finite-branching acyclic AND/OR DAG, backed-up `V(n)` equals the minimum cost of a solution subgraph or infinity when none exists. Real value functions are noisy; their theoretical analysis is left for future work (Section 3.3, p. 4). Shared subgoals can make globally cheapest subgraph selection NP-hard, so LEVER charges a shared subgoal to one owner (Section 3.3, p. 4).

What is proved: the exact-prior backup property in the formal model, and Lean kernel acceptance of final submitted proofs. What remains trusted: the LLM, value priors, stochastic expansion policy, cost accounting and cache-rate repricing, Mathlib, Lean's kernel and compiler, benchmark formalizations, and the mapping from a user's desired quality to λ and metric definitions. Inference: for VL, the threat is mainly resource waste and objective gaming rather than proof unsoundness when Verus checks every artifact. A model may optimize token count by hiding complexity in a broad lemma, or optimize verifier time by weakening a contract. Keep specification review and trust-boundary checks outside LEVER's objective.

Inference: VL should reuse the graph, cost-to-go, prior calibration, and weighted-objective patterns, but should not claim that the paper's Lean results establish Verus performance. Existing Verus proof search and solver automation remain necessary; LEVER is an orchestration policy over them.

## techniques for the catalog

- AND/OR proof graph — represent alternative decompositions and conjunctive subgoals with min-at-OR and sum-at-AND backup
- adaptive redraw search — select, expand, and backpropagate stochastic LLM decompositions under a budget
- learned cost-to-go — predict open-goal cost bins and update priors with realized expansion costs
- weighted proof objective — combine remaining computation with additive length, purity, or repository-specific metrics
- subgoal-local agents — run each obligation in a compact local context with compiler and library tools
- quality-aware verification — enforce verifier correctness while optimizing measurable proof quality during construction

Checked 2026-10-15 against the paper by a Codex agent for lever_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
