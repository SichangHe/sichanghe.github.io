# LeanPlan: Optimal Planning with LLM-Generated Heuristics and Admissibility Proofs
(authored by agents unless marked 🧑)
Tag: `pereira2026leanplan`, [paper](http://arxiv.org/abs/2610.08246v1)
## system and guarantee
LeanPlan has an LLM coding agent write a domain-specific heuristic, its admissibility proof, and Boolean checks for domain assumptions. A deterministic generator translates PDDL action schemas into a Lean module; Lean's kernel checks the proof; A* reuses the compiled heuristic on every new task. The paper states: “Because the proof is about the code that the planner actually runs, there is no separate implementation that could deviate from the verified one.” (section 1, p. 2). The proof establishes goal awareness and consistency on reachable states; a shared theorem derives admissibility and hence optimality.

The paper defines admissibility as “h(s) ≤ h∗(s) for every state s” (section 2, p. 3). The workflow is: generate module; give the agent training tasks, interface, and shared proof library; let it revise code using build and planner failures; reject `sorry`, `admit`, `native_decide`, or new axioms; rebuild and rerun all checks; accept only when certificates pass and training coverage is at least Scorpion's with fewer total expansions on shared solved tasks (section 3, pp. 3–4). The agent cannot certify itself. “Since the agent’s own report of success is not evidence, an automated controller re-checks the files the agent leaves behind.” (section 3, p. 4).

## technique: prove a reusable local invariant instead of global optimality
Use this when the desired property quantifies over all states and tasks. LeanPlan proves two local obligations for every reachable state s and transition s→s′: h(s)=0 at goals, and h(s)≤c(a)+h(s′) for each action. Consistency bounds the decrease along a plan; goal awareness makes the final value zero, so h(s)≤plan cost and therefore h is admissible (section 2, p. 3). Domain assumptions are explicit Boolean certificate checks; tasks failing them are refused before search (section 3, p. 3).

Inference: in Verus, encode the heuristic as a `spec fn` or executable function with `requires` for certificate assumptions and `ensures` for goal awareness/consistency. Prove the shared induction over a finite action sequence using `lemma` functions and `assert` steps. The proof must refer to the exact function used by search; do not verify a separate model of the heuristic.

## technique: action-counting lower bounds
Miconic counts unmet waiting passengers W, aboard passengers R, and distinct required floors F; h=2|W|+|R|+|F|. Boarding or leaving reduces the passenger term by one, and a move reaches at most one required floor, so each action decreases h by at most one; all sets are empty at goals (section 4, p. 5). Figure 2's concrete Lean pattern is `def passengerBound (w r : Nat) : Nat := 2 * w + r` and a theorem proved by `unfold` and `omega` (figure 2, p. 5).

Spanner combines loose goal nuts L, carried usable spanners C, and directed distance D: `L + max(0, L − C) + D`. If carried plus reachable usable spanners are fewer than L, it returns threshold B to prune a dead end (section 4, p. 5).

Inference: in Verus, use ghost/spec set cardinalities and arithmetic lemmas for per-action changes. Represent a dead-end sentinel with a bounded `Nat`/integer and prove that search never treats a non-dead-end as the sentinel under certificate assumptions.

## technique: max of admissible relaxations
Sokoban uses a push graph and two lower bounds: a sum of shortest push counts plus the robot's first-push walk, and the maximum single-box walk-plus-push cost. Since the bounds can overlap, it takes their maximum, not their sum (section 4, p. 5). Distance tables are computed by BFS; rather than prove BFS, LeanPlan checks table properties such as distance decreasing by at most one per move (section 4, p. 6).

Inference: Verus can verify table postconditions supplied by an external BFS implementation, but must keep the table and the checked property tied to the runtime value. A `requires` clause can state the decrease property; a proof function can establish consistency of `max` from each component's bound.

## evidence and boundaries
The study evaluates 900 IPC 2023 and 270 new-domain test tasks, 90 per domain, across 13 domains. GPT-5.6 Sol averages 69.8 minutes and 33,724,876 input plus 103,196 output tokens per domain; it tries 10.3 variants (section 5, p. 6). LeanPlan solves 281/900 IPC tasks and 67/270 new tasks versus Scorpion SCP's 221/900 and 51/270 (table 1, p. 7). On 595 IPC tasks larger than every training task, LeanPlan solves 53, SCP 13, LM-cut 7, blind 0 (section 5.2, p. 8). Three Cisterns test tasks fail the certificate; these are counted unsolved (section 5.2, p. 8).

The proof covers unit-cost STRIPS tasks satisfying certificates, not arbitrary PDDL. Trusted pieces include Lean kernel, compiler/runtime, PDDL parser, and Lean definitions of PDDL semantics; the paper names these explicitly in its limitations (section 7, p. 9). It does not certify unsolvability. Inference: threat to agent-written verified Rust is high for the specification boundary but lower for proof soundness: an agent can propose useful algorithms, yet certificate assumptions can silently exclude product inputs, as Cisterns demonstrates.

## what VL should reuse and avoid
Inference: reuse the compile-and-recheck controller, explicit input certificates, local invariant decomposition, and performance acceptance criterion. Avoid treating passing training tasks as proof; avoid unchecked external tables and assumptions. LeanPlan already covers reusable proof-guided heuristic synthesis; VL should focus on Rust/Verus integration and richer stateful systems rather than reproduce the planning architecture unchanged.

## techniques for the catalog
- certificate-gated synthesis — reject generated verified code unless Boolean input assumptions pass
- local admissibility proof — prove goal awareness and transition consistency, then derive global optimality
- action-count lower bounds — count unavoidable operations and prove each transition decreases the count by at most cost
- max-combined relaxations — combine overlapping lower bounds with `max` to preserve admissibility
- checked distance tables — use BFS tables only after verifying the distance properties the proof consumes
- automated candidate acceptance — rebuild code, proofs, certificates, and performance before accepting an agent artifact
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
