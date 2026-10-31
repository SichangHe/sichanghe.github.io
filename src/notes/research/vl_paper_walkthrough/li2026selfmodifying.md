# Self-Modifying Lean Proof Agents with Verifier-Grounded Benchmark Coevolution
(authored by agents unless marked 🧑)
Tag: `li2026selfmodifying`, [paper](https://www.semanticscholar.org/paper/d3598cbceec98736eb6b276c5d4ba5d1339fc79a)

## what is proved or measured

Li, Wu, Gan, and Liu study a self-evolving Lean proof agent. A fixed trusted runtime performs Lean verification, evaluation, benchmark management, and proof-context validation; a mutable workspace contains the proof workflow, prompts, tools, and meta-level editing logic. A champion agent can modify the active benchmark after each generation. The benchmark starts with 76 tasks at three levels (author warm-ups, miniF2F valid problems, and PutnamBench), and the held-out miniF2F test split has 244 problems. Both coevolving and fixed-benchmark runs last 15 active generations.

The abstract reports a best held-out solve rate of 45.1%, compared with 12.7% for the seed and 32.0% for the best fixed-benchmark agent. The paper cautions that changing benchmark difficulty makes raw coevolving scores incomparable, so it uses held-out evaluation and a single-anchor difficulty coefficient. It states: “All evolution stays inside a Lean-grounded verification loop: however the agent rewrites itself, a success counts only when its behavior yields Lean-verified proofs under a trusted snapshot.” (Abstract, p.1).

## technique 1: separate trusted runtime from mutable workflow

what it is: keep all mechanisms that determine correctness and reward outside the evolutionary search. Mutations may rewrite the workflow, tools, or proof-producing code, but a fixed runtime runs smoke tests and then independently re-verifies the task statement and returned proof under a trusted Lean snapshot.

when to use it: use this split when an agent is allowed to rewrite its own code and could otherwise falsify its score, verifier status, or benchmark records.

how to do it, from Section 3.1:
1. define a fixed runtime for Lean verification, evaluation, benchmark updates, and context validation (paper)
2. expose only a constrained edit interface over the mutable workspace (paper)
3. run code-level execution and smoke tests before evaluation (paper)
4. treat smoke-test success as interface validity, not theorem success (paper)
5. re-verify each returned proof in the fixed runtime; drive benchmark updates only from those records (paper)
6. keep the seed minimal so later repair/search behavior is attributable to evolution (paper)

The paper says: “whether a proof obligation is solved is decided solely by the trusted runtime, which re-verifies the generated proof under a trusted Lean snapshot” (Section 3.1, p.5). Verus form (Inference): put Verus invocation, source/specification checks, and score calculation in an immutable orchestration process; let the agent edit proof files and prompts in a copied workspace; accept a task only after a fresh Verus run succeeds. This is an inference because the paper uses Lean.

evidence and limits: isolated worker processes execute mutable entry points on copied workspaces; the trusted parent does not import mutable modules directly (Section 3.2, p.6). Inference: this limits straightforward score spoofing but does not by itself prove isolation against every operating-system or dependency flaw.

## technique 2: representation-free but grounded proof context

what it is: require every attempt to return `{ok, proof_body, proof_context}`. The context may be a graph, tree, lemma table, or other representation, but must have a root, at least one mathematical claim/subgoal/lemma besides the root, valid dependency edges, and Lean-verified evidence for every item marked solved. Workflow traces and diagnostics do not count as mathematical context.

when to use it: use this contract when proof structure should remain inspectable while allowing agents to invent representations during evolution.

how to do it:
1. require a root context item (Section 3.2)
2. require at least one non-root mathematical claim, subgoal, or lemma (Section 3.2)
3. check that dependency edges point to known items (Section 3.2)
4. reject proof-attempt or diagnostic records as substitutes for mathematical nodes (Section 3.2)
5. independently verify formal `lean_statement`/`proof_body` fields when supplied (Section 3.2)
6. mark a node solved only after trusted Lean evidence passes (Section 3.2)

The source states: “The principle is that representation is flexible, but groundedness is mandatory.” (Section 3.2, p.6). Verus form (Inference): define a JSON or Rust-side context with a root, claims, subgoals, and dependency identifiers; for formal nodes, store the Verus function/specification and proof body, then run Verus before marking them solved. Use ordinary Verus `requires`, `ensures`, `proof fn`, and `assert` constructs; do not treat a context label as proof.

evidence and limits: context quality is logged but not rewarded, and empirically stays roughly stable while final solve rate changes (Section 4.5, p.10). Many extracted `have` nodes depend on surrounding binders and fail when isolated; successful c44/c47 nodes remain shallow supports rather than reusable deep graphs (Section 4.5, pp.10–11). Inference: a flexible context contract alone does not create compositional proof decomposition.

## technique 3: mastery-throttled benchmark coevolution

what it is: maintain a candidate pool stratified into L1<L2<L3. After each generation, the champion can retire mastered tasks and replace them laterally or with harder tasks. An update occurs only when raw champion solve rate exceeds γ=0.30. A retired task is replaced at the next level only when the champion’s level-specific mastery is at least τ=0.70; otherwise replacement stays at the same level. Up to κ=6 tasks are retired per generation, and newly inserted tasks count as unsolved until evaluated.

how to do it, following Section 3.3 and Appendix B:
1. collect per-task solve records for the generation (paper)
2. leave the benchmark unchanged if champion raw rate is below γ (paper)
3. choose up to κ tasks solved by all current agents, preferring low levels (paper)
4. compute champion solved/total counts per level and recompute after each swap (paper)
5. choose next-level replacement when mastery ≥τ, otherwise same-level replacement (paper)
6. prefer domains with many archive failures (paper)
7. re-evaluate the champion on the new benchmark and update the difficulty coefficient (paper)

The paper says: “This makes the update self-throttling: a level can graduate only while the champion’s level-specific mastery remains high, and repeated replacements reduce the measured mastery rate, preventing abrupt benchmark hardening.” (Section 3.3, p.6). Verus form (Inference): build a Verus-task pool with difficulty strata such as contracts, loops, ownership, and concurrency; use successful Verus runs as the only mastery signal; retain an immutable held-out set for generalization.

evidence and limits: the initial active benchmark is 76 tasks with L1:L2:L3=27:46:3; the candidate pool is 365 tasks (52, 57, and 256 per level), and the seed solves approximately 28/76 (Section A, p.12). The run is single-run with no variance estimates (Appendix A, p.11), so evolutionary gains are uncertain across seeds.

## technique 4: single-anchor recalibration and parent selection

what it is: because benchmark difficulty changes, preserve cross-generation comparability by re-running the champion after each update. If `r_t` is its old raw rate and `r_{t+1}` its new rate, update `c_{t+1}=c_t*r_t/max(r_{t+1}, ε)` with `c_0=1`, and report every agent’s normalized score `q=r*c`. Within a generation, sample parents with weight `w=max(q,0)/(1+n_c)`, discounting agents with many children, including pending children.

when to use it: use recalibration when curriculum changes make raw scores incomparable, and use child-count discounting when one lineage could otherwise dominate exploration.

how to do it:
1. evaluate the champion before and after a benchmark update (Section 3.3)
2. apply the multiplicative coefficient formula with ε=0.1 in the experiment (Appendix A)
3. compute normalized q for selection (Section 3.4)
4. archive each accepted child immediately and make it eligible as a parent (Section 3.4)
5. sample parents proportional to `w` while counting pending offspring (Section 3.4)

The source says: “By construction the champion’s normalized score is preserved across the recalibration.” (Section 3.3, p.7). Inference: the coefficient is a selection normalization, not a proof of capability and not the held-out accuracy.

## technique 5: evolve repair, lemma checking, and subgoal workflows

what it is: evolution discovers workflow variants. The winning pattern is a bounded loop that generates a full proof, runs Lean, reads errors and verified lemma-name checks, and retries. Mutable tools add `#check`, source search, batched signature checks, namespace-aware caches, and verified-only fallbacks. A later c141 branch plans self-contained lemmas, proves them independently, and assembles the theorem.

how to do it:
1. try fast native tactics (Appendix C Listing 1)
2. run a short monolithic proof-repair loop with compiler feedback (Listing 1)
3. if repair fails, ask for up to five explicitly quantified helper lemmas (Appendix C Listing 2)
4. prove helper lemmas one by one and assemble the final theorem (Listing 1)
5. verify names/signatures before including them in prompts or proofs (Section 4.4)
6. keep bounded attempts and wall-clock limits to avoid prompt growth and truncation (Section 4.3)

The paper’s subgoal prompt requires: “Each lemma should be a self-contained statement with all variables explicitly quantified.” (Appendix C, p.13). Verus form (Inference): make helper lemmas separate `proof fn`s with explicit parameters and `requires`/`ensures`; verify each with Verus before using it in a final proof. Use bounded retries and feed exact compiler/verifier diagnostics back to the agent.

evidence and limits: held-out miniF2F solve rates for selected coevolving agents vary from 11.9% to 45.1% across generations (Table 1, p.8), so improvement is not monotonic. The best fixed-benchmark agents score 32.0% and 26.6% on the same 244-problem held-out split (Section 4.2, p.9). The decomposition branch is fragile: helper interfaces, JSON parsing, assembly, and longer prompts create failure points; very large repair budgets also regress (Section 4.3, pp.9–10).

## trusted boundary, contradictions, and product implications

Lean verification, proof-context validation, immutable runtime configuration, and protected worker execution are trusted mechanisms. Inference: model output, self-modifying code, parent selection, curriculum policy, score normalization, and tool caches are untrusted search/control logic. Lean’s correctness and the specification of each task remain assumptions. The experiment uses DeepSeek deepseek-v4-pro at temperature 0, a 600-second API timeout, a 1200-second workflow cap, Mathlib 4.30.0, and a single run (Appendix A, p.11); the paper explicitly warns that output instability remains at boundary problems.

The abstract’s 45.1% is a held-out solve rate on 244 miniF2F-test problems, whereas 32.0% is the best fixed-benchmark baseline on that same held-out split; the active benchmark has 76 tasks and is not the denominator for those figures. The difficulty coefficient rises from 1.00 to 3.17 by generation 15 (Table 2, p.16), but that coefficient is not a solve rate. Inference: reports that compare raw active-benchmark percentages across generations would be misleading.

## techniques for the catalog

- trusted mutable-workspace split — evolve workflows in a copied workspace while a fixed runtime alone verifies proofs and scores
- grounded proof-context contract — permit arbitrary context representations but require roots, mathematical nodes, valid edges, and verifier evidence
- mastery-throttled curriculum — replace mastered tasks laterally or with harder tasks only after level-specific mastery
- anchor recalibration — preserve cross-generation selection scores with champion re-evaluation and a difficulty coefficient
- verifier-feedback evolution — evolve bounded repair, lemma-name checking, and optional self-contained subgoal workflows under Lean checks
