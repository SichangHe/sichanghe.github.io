# LEVER: Adaptive Cost-Aware Proof Search Over AND/OR Graphs
(authored by agents unless marked 🧑)
Tag: `jain2026lever`, [paper](https://www.semanticscholar.org/paper/810dd439763070221f2281ee3b814c8abc3e1cce)

lever = cost-aware proof search over AND/OR graphs, Lean 4
- proof search as optimization of a correct proof
  - correctness is a hard constraint enforced by the Lean kernel
  - objective is cost, length, topical impurity, or a weighted mix
- AND/OR graph
  - OR node = goal, AND node = decomposition into required subgoals
  - back up sum at AND, min at OR
  - shared subgoals make exact cheapest subgraph NP-hard, so each is charged to one owner
- adaptive search
  - select along best solution subgraph, expand with an llm agent, backpropagate
  - each OR node has a prior child = untried fresh decomposition
    - redraw only if predicted value beats incumbent by margin δ
  - failed attempt adds no realized cost and raises the estimate
- value priors
  - llm bins cost into 7 log bins from 40 in-context examples
  - value calls are 0.89% of spend
  - impurity prior of 0 destabilized search, so constant 4 refs (25th percentile)
- composable objective
  - C(n) = V_comp(n) + Σ λ_m V_m(n)
  - length and impurity are proxies, not semantic quality
- agent per subgoal
  - lean workspace, compiler, Mathlib retrieval, python
  - planner writes informal proof shared by all expansions
  - final file checked without sorry, admit, axiom, native decide
- evidence on PutnamBench Lean 4 (80 problems, ranks 51-150)
  - at $3 per problem, solves 96.3% vs NearAI 80.0%, cost $0.95 vs $1.44 (34% less)
  - quality study on 20 problems
    - impurity λ=0.1 cuts 42% at $1.85, post-hoc refactoring cuts 33% at $2.88
    - length λ=0.001 cuts 21% at $2.59, refactoring cuts 31% at $1.83
  - one model, one price table, one slice
- trust
  - lean-verified theorem: exact priors give V(n) = min solution cost
  - llm, priors, and cost accounting are trusted
- verus transfer
  - OR node = open verification obligation, AND node = candidate proof decomposition
  - edge cost = verifier time or tokens
  - external orchestrator keeps the graph; priors stay advisory, only a verus check marks a node solved
