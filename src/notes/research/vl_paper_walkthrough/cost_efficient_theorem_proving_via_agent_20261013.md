# Cost-Efficient Theorem Proving via Agent Orchestration in Program Verification
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number, fraction and percentage in Tables 1-3, 7, 8, 10, 12-14, the page and section references, the steps of Algorithms 1 and 2 and B.1-B.7, the prompt rules of Appendix E, the quotations and the Verus forms; changed 7 slips: an ablation called uninterpretable where the paper says hard to attribute, the automation ablation said to agree with the induction-unfolding story though the paper explains the AlgoVeri drop otherwise, within noise for comparable to noise, two hardest lemmas for the one the paper calls hardest, the source of items 5 and 6 of technique 10, and two unmarked inferences.

source: Yao, Holzer, Santolucito, Ray, Jana, She (Columbia, Barnard, HKUST), arXiv:2610.09681v1, 7 Oct 2026, preprint, 55 pages: main text pp.1-9, Appendix A theory pp.14-21, B operational details pp.21-26, C experiment details pp.26-30, D two case studies with full Lean code pp.30-51, E prompt templates pp.51-54, F limitations pp.54-55. The system is called CoCo-Prover. Cited pages are the PDF's, which carry the same printed number.

## the idea

Proving a program correct produces many obligations of very unequal difficulty, and a checker's verdict is binary, so the paper argues the thing to optimise is how many obligations get proved per dollar. Its diagnosis of existing provers: “Effective code proving therefore requires not simply more reasoning, but identifying where deep reasoning matters and concentrating model computation there.” (§1, p.2)

The design splits every step into two questions. Which goals next is answered with no model call, by a topological pass over a graph of proof state. What to do on them is answered by a model, the router, which buys one bounded action from one of four specialists at a chosen reasoning effort. In the paper's words: “LLM agents make the semantic decisions and dispatch the decisions to the specialist agents” (§3.2, p.5).

## what is proved, what is measured, what is trusted

Proved on paper (Appendix A), all about an abstraction: a regret identity for routers (Theorem 1), an ordering result for small cost weight (Proposition A.1), value-preservation of two filters under stated provisos (Lemmas A.6, A.7), a cost ratio for sharing a lemma (Proposition A.8), and soundness relative to the Lean kernel (Proposition A.9). The roadmap says of the link to the running system: “that the deployment realizes the abstraction is assumed, not shown” (Appendix A, p.14). Limitations repeats it: “In theory, we do not prove that the implemented LLM router must attain low regret.” (Appendix F, p.55)

Measured: solve rate and dollar cost on five Lean 4 benchmarks with three models, a three-way ablation on 30 problems, run-to-run variance of CoCo-Prover only, and two traced case studies.

Trusted: the Lean kernel; the fixed theorem statements; for CLEVER and AlgoVeri, implementations that the authors generated with GPT-5.6-Sol and checked by hand (§4, p.6); the five-check proof reviewer of Appendix C.1, two of whose checks are a model review and a manual sample. The task is proof only: “In every case the theorem statements are fixed inputs and code or specification synthesis is never a part of the measured task.” (§4, p.6)

## technique 1: the two-level proof graph as the only state

What it is. Two joined structures (§3.1, p.4; Appendix B.1, p.21). Across declarations, a lemma-dependency DAG with an edge u → v when the proof or plan of v uses helper u, and the target theorems as roots. Inside each declaration, an AND/OR hypergraph: AND nodes are normalized goal states, OR nodes are candidate proof steps, and running a step attaches a verified hyperedge to exactly the subgoals Lean returns. Every artifact carries a status: “Each artifact is labeled open, provisional, conditionally solved, stable, or rejected, and a goal with no admissible action is blocked.” (B.1, p.21)

When to use. A task with several obligations that share definitions and missing facts. The paper reports no ablation of the graph and says why: without it the system is one that proves each obligation alone, “which is what the baselines already do” (C.5, p.30).

How to maintain it (B.1, p.21; Algorithm 1, p.22):
1. start with the targets as roots, each with one open root goal (Algorithm 1 line 1)
2. on each executed proof step, attach the verified hyperedge with the returned subgoals; a goal keeps at most one valid alternative, and a discarded alternative stays as failure evidence (B.1)
3. when a helper is proposed and admitted, add its node and edges; it is provisional
4. promote a declaration to stable only when the kernel accepts its proof and every generated dependency is stable (Algorithm 1 lines 39-41)
5. when a provisional helper is rejected or changed, mark exactly its conditional descendants invalid and reopen them, keeping verified subgraphs that did not depend on it (Algorithm 1 line 34; B.1 “Nonlocal effects”)

The rule that keeps this sound: “Only a Lean-accepted declaration whose generated dependencies are stable can itself become stable, and conditional plans guide search but never certify a root.” (B.1, p.21)

Verus form. Inference: the lemma-dependency level maps directly. Nodes are `proof fn` lemmas and the target functions; an edge means the body of v calls lemma u. A provisional lemma is a `proof fn` with its `requires` and `ensures` written and `assume(false)` or `admit()` as body, which lets consumers verify against it; stable means it verifies with no `assume`/`admit` and every lemma it calls is stable; rejected means a counterexample to its `ensures` was found. The intra-declaration level does not carry over as is: Verus has no tactic state and returns no subgoals, only the list of clauses the solver could not establish. The nearest equivalent of an AND node is one failing clause (an `ensures`, an `assert(...)`, a loop `invariant` at entry or at the end of the body, a `requires` at a call site, a `decreases`), and the nearest equivalent of an executed step is an inserted `assert(...) by { ... }` or lemma call that makes that clause pass while the others are unchanged. Rollback to a node then means removing the proof lines added since that state, which a version-controlled file gives without a hypergraph.

Evidence. Case study D.2 (Vero prob 14, GPT-5.6-Terra): all 56 targets proved with 55 helper lemmas in a dependency hierarchy six levels deep, against 5 of 56 for the coding-agent baseline on the same model (Table 12, p.41). Reuse counts from Table 14 (p.51): one sortedness lemma is depended on transitively by 31 of the 56 targets, one nonemptiness lemma by 28, and seven proved targets are reused as lemmas by later targets.

## technique 2: a dependency-ready frontier kept by an incremental topological pass

What it is. The set of goals that may be worked on now, computed without a model: open goals of declarations whose prerequisites all have an elaborated statement, minus work with no dependency path to a root. “The scheduler exposes Ut = Ft , restricting the action space without spending model computation.” (§3.1, p.4)

How (Algorithm 2 and B.3, pp.23-24):
1. per declaration keep two counters: d, the number of prerequisites whose statement is not yet elaborated, and dσ, the number of prerequisites not yet stable
2. on a new edge u → l: if u is not elaborated, increment d(l) and take l's goals off the frontier; if u is not stable, increment dσ(l)
3. when u is elaborated: decrement d of each consumer; a consumer reaching 0 gets its open goals added to the frontier
4. when u becomes stable: decrement dσ of each consumer; dσ = 0 marks a declaration whose proof may be promoted
5. when u is retracted: reopen its conditional descendants, restore their counters, update the frontier
6. hand the router the whole frontier, ordered by dσ, so that unconditional work comes before work resting on provisional lemmas

Note the gate is elaboration, not proof: a consumer may be proved against a helper that is stated but unproved. “Work beneath a provisional prerequisite is admitted and its exposure is what Equation (19) measures and the Recovery Reviewer unwinds.” (B.3, p.24)

Verus form. Inference: elaborated means the lemma's signature type-checks under Verus with a placeholder body. The two counters carry over unchanged over the `proof fn` call graph. Verus adds one constraint Lean handles differently: a recursive `proof fn` or mutually recursive group needs a `decreases` clause to be accepted, so a cycle among helpers is not automatically illegal as it is in the paper's DAG, but allowing it would break the simple counters; keeping the helper graph acyclic and letting only a lemma call itself is the direct transfer.

Evidence. None separate from the whole system; the scheduler is never ablated. Lemma A.7 (p.20) argues that dropping root-disconnected work does not lower the optimal value, under an added assumption that such work can be postponed at no greater cost.

## technique 3: routing as a priced purchase, with rules that the router rewrites

What it is. At each step the router returns four things for one group of frontier goals: the group G, a specialist o, a configuration θ (reasoning effort and a working budget such as the maximum number of refinement iterations), and its own preliminary analysis j that the specialist continues from (§3.2, p.5). Each such invocation is treated as one bounded, separately priced computation.

The starting rule (§3.2, p.5): same provability, cheap-first. Among actions equally likely to leave every remaining root provable, take the one with the lowest total expected cost of finishing all of them. Both quantities are over the whole remaining task, which is why a helper lemma can be the cheap choice: “This explains why proposing a helper lemma can be the cheapest choice when several goals will use it, even though proving it once costs more than one direct proof.” (§3.2, p.5)

One decision epoch, from Algorithm 1 (p.22), by line:
1. propagate statuses and recompute the frontier (lines 4-5); if it is empty, report and stop (line 6)
2. cluster the frontier into groups without a model call (line 9; technique 4)
3. build the admissible set: triples (group, specialist, configuration) that pass the guards, which check contract membership, acyclicity, available identifiers and no identical deterministic repetition (line 9; operators paragraph, p.23); if none, mark the goals blocked (line 10)
4. if some group is definition-nested and automation is admissible for it, send it to Deterministic Automation with no routing call (lines 12-13)
5. otherwise build the evidence packet: the frontier goals with tactic states, their graph neighbourhood (prerequisites, consumers, blocking relations, conditional descendants), failure memory restricted to these goals, at-risk spend, the cost ledger and the specialists' contracts; the router adds its current rules (line 15)
6. call the router up to r_max times until it returns an admissible decision; reject malformed or guard-violating ones; charge every call to the router's own account (lines 16-19)
7. if none is admissible, take the deterministic default: the admissible triple with the lowest contract cost bound, which is automation whenever it is admissible (line 20; p.23)
8. execute the one purchased action and write verified results back (lines 23-36)
9. let the router amend its rules from the outcome just seen (line 37); update state and ledger (line 38); promote what the kernel accepts (lines 39-41)

How the rules evolve, the paper's example: “For instance, if the Proof Writer repeatedly fails on a kind of goal, the rules may evolve to increase reasoning effort or propose a shared helper lemma to decompose the goal.” (§3.2, p.5) The initial rules are a short description of each specialist, the one priority, and a few worked routing examples.

Decision rules that the theory supplies and that can be used directly:
- with a small positive weight on cost, the best action is the one that first maximises attainable success probability and then minimises expected remaining cost (Proposition A.1, p.16)
- a paid action that closes the remaining work with probability p at price κ is worth buying exactly when κ ≤ p · J*, where J* is the best expected remaining cost from the current state; being the cheapest action available does not imply it (Proposition A.2 and Equation 6, p.16)
- a router beats a fixed routine exactly when the regret it avoids exceeds its extra inference cost (Corollary 2, p.17); the paper notes Theorem 1 is the performance-difference identity of reinforcement learning applied to purchased computations
- a working budget is not free: returning to the router and resuming adds overhead, and the paper does not claim otherwise (“We therefore treat the bounded contract as a restriction of the action space, justified operationally by retention, and do not claim it is free.”, A.1, p.16)

Verus form. Inference: the decision record transfers as is; only the menu changes. For a failing Verus clause the options are: rerun with solver-side automation only (no model), ask a cheap model call for a few `assert` lines, ask an expensive call for a loop `invariant` or an induction, propose a shared lemma `proof fn`, or review and roll back. Configuration θ is the model tier and the cap on verify-edit rounds. The evidence packet for Verus holds the failing clause with the function's contract, the lemma call graph around it, and past failures on the same clause. The guard on identical deterministic repetition needs care in Verus: rerunning the solver on unchanged text is mostly but not strictly deterministic, since timeouts and unstable proofs make outcomes vary, so the cache key should include the solver's resource setting.

Evidence (Table 3, p.9; Gemini-3.5-Flash; 30 problems, 10 each from CLEVER, VERINA, AlgoVeri; complete-system cost is the mean of three runs). Replacing the router by one fixed order over the same graph, with automation still first: $155.20 against $110.94, +39.9%, and 29 of 30 solved against 30 of 30. The complete system's run-to-run coefficient of variation on these subsets is 2.4% to 8.3% (Table 7, p.30), so, Inference: this difference is outside noise (the paper says the same of the router ablation, C.4, p.29). The value of writing the rules down is not measured, and the paper says a difference in either direction would be hard to attribute (C.5, p.30).

Limits. The paper states it: “The symbolic guards are syntactic and do not judge whether a decision is good.” (Appendix F, p.55) Regret is never measured, yet Appendix F says the experiments demonstrate that the router can attain low regret; Inference: the experiments show lower cost than a fixed order on 30 problems, which is weaker.

## technique 4: batching related goals by embedding and spherical k-means

What it is. Before routing, frontier goals are grouped so one call analyses several related goals and a helper proposal sees several potential consumers (B.4, p.24).

How (B.4, p.24):
1. render each open goal as its normalized statement from the tactic state
2. embed it with a model trained on formal Lean statements (Lean Finder), unit-normalize, cache by statement hash
3. set the cluster count k = ⌈|frontier| / b⌉ for a fixed target batch size b; singletons allowed
4. seed with k-means++ from a seed derived from the hash of the frontier, so grouping is a deterministic function of the state
5. Lloyd iterations: assign each goal to the nearest centroid, set each centroid to the re-normalized mean, stop when assignments are stable; reseed an empty cluster with the goal furthest from its centroid
6. groups sent to the Lemma Planner are checked again for compatible environments and similarity in targets, hypotheses, source definitions or recursion structure (B.3, p.24)

The reason for step 6: “This restriction prevents surface similarity from becoming an unchecked dependency.” (B.3, p.24)

Verus form. Inference: the unit to embed is the failing clause together with the `spec fn` names it mentions. No embedding model trained on Verus statements is named in the paper; a general code embedding, or a purely symbolic grouping by the set of `spec fn`s a clause mentions, would be the substitutes, and neither is evaluated here. The batch size b and its effect are not reported in the paper at all.

Evidence. None in isolation.

## technique 5: free automation first, with a static check and a no-progress cache

What it is. Deterministic Automation is the one specialist with no model call: an extension of Aesop that tries tactics on the goal (§3.2, p.5). A static check sends goals whose only obstruction is unfolded definitions straight to it, skipping the router (Algorithm 1 lines 12-13; p.23). A no-progress result on an unchanged state is cached and the guards then exclude the repeat (Algorithm 1 line 25; Lemma A.6, p.19).

How:
1. detect definition-nested goals statically and dispatch them without a routing call
2. run the rule-based search; attach whatever verified steps it produced, including a partial script
3. if it made no progress, record that against the normalized state so it is not bought again
4. hand what remains to the router

The paper's CLEVER trace shows the typical yield: automation produced the five-tactic opening skeleton of the target theorem (`unfold`, `unfold`, `intro`, `simp_all`, `apply And.intro`) at zero model cost, and on the eight lower-level goals “failed fast” by heartbeat timeout, no progress, or a partial script below a quality threshold (Table 9 caption, p.32).

Where it hurts. On goals that need induction, eager unfolding destroys the shape the proof needs. In the Vero run all 52 backtracks had this cause: “All 52 backtracks in the run follow one pattern: automation or an eager script unfolds a recursive definition several levels deep and loses the induction structure” (D.2.4, p.50). The ablation does not isolate this cause: removing automation raised cost 11.5% on CLEVER and 12.4% on VERINA but lowered it 5.8% on AlgoVeri, +5.8% overall (Table 3, p.9, Gemini-3.5-Flash, 30 problems); the paper explains the AlgoVeri drop by frequent automation splitting a monolithic goal into meaningless subgoals (§4.2, p.9). The authors class the overall figure as comparable to the run-to-run noise: “the automation ablation, at 5.8% overall, is comparable to it, and we therefore read that component’s effect as small rather than precisely measured” (C.4, p.29).

An inconsistency. §3.2 and Algorithm 1 send only definition-nested goals to automation without routing; the Vero case study says “Deterministic Automation ran first on every open goal” (D.2.3, p.41), and the router ablation is described as automation still running first on every scheduled goal (§4.2, p.8). Which of the two the evaluated system did is not settled by the text.

Verus form. Inference: in Verus the free first move is the verifier itself. Run the function with no added proof; every clause the solver discharges costs no model call. The next free moves are fixed, model-free attempts on a failing arithmetic or bit-level clause: wrap it as `assert(...) by (nonlinear_arith)` or `assert(...) by (bit_vector)` and rerun. The paper's warning has an exact Verus counterpart: letting the solver unfold a recursive `spec fn` further (`reveal_with_fuel`) is the analogue of eager unfolding and does not produce an induction hypothesis; a clause about a recursive `spec fn` over an arbitrary input needs a recursive `proof fn` with `decreases`, so it should be routed away from automation at once.

## technique 6: a bounded proof writer that keeps partial progress

What it is. An agent that writes proof code for one goal under an iteration cap chosen by the router, starting from the router's analysis. “When the budget is exhausted, it keeps the partial successful proof and update the proof graphs.” (§3.2, p.6)

Rules from its prompt (Appendix E, pp.53-54) that are reusable as written:
1. return only the lines to insert at the open hole; never a standalone declaration, never a restated goal, never imports
2. write a step-by-step plan in words first when needed, then follow it
3. never guess a library lemma name; use only names confirmed by a check or returned by retrieval; on an unknown-name error, retrieve by description, and do not retry spelling variants
4. search tactics may be used to discover a lemma and never left in submitted code; the prompt explains that `apply?` admits the goal when it cannot close it
5. verify with the checker and fix until it passes; then submit exactly once, and only verified code

Verus form. Inference: rule 1 becomes: return only the lines to place inside the function body or `proof { }` block at the marked position, not the function. Rule 3 becomes: call only lemma `proof fn`s whose signature was read from the library source or returned by a search, a real failure mode with `vstd` lemma names. Rule 4 becomes the ban on leaving `assume(...)` or `admit()` in submitted code. Keeping partial progress means keeping each inserted `assert` that verifies even when the target clause still fails.

Evidence (D.1.3, p.31; CLEVER prob 15; GPT-5.6-Terra). 11 Proof Writer invocations at low reasoning effort, each of which closed its target on the first invocation; 7 planning invocations at high effort; no backtrack. That is one task.

## technique 7: a lemma planner that turns a blocker into a typed, tested, shared goal

What it is. An agent that states a missing fact as a separate top-level lemma with no proof, names who will use it, and returns control. The paper's summary of why baselines lose without it: “Every baseline correctly named the missing facts but had no agent whose job is to act on them.” (D.1.5, p.39)

How (§3.2, p.6; B.7, pp.25-26; Lemma Planner prompt, p.53):
1. check the existing pool; reuse or generalize an existing lemma before adding a near-duplicate
2. state the lemma at the generality of the definitions involved, not the shape of one goal: quantify over arguments, drop unneeded hypotheses, split a combined fact into independent parts
3. spell out every side condition (index bounds, non-emptiness, ordering of bounds) and mentally instantiate the statement at the corners: empty structure, equal and swapped bounds, index at or past the length, a negative integer under a coercion to naturals
4. write only the declaration header with a hole as body, plus an annotation header: name, namespace, description, proved flag, `depends_on`, `lib_depends_on`, `used_in`
5. `used_in` must name every consumer, since only declared edges are available to the prover; `depends_on` must list the pool lemmas the proof will need; no self-reference and no cycle through `used_in`
6. the controller admits the candidate only if it elaborates, keeps the graph acyclic, and survives the counterexample check (technique 8); it enters as provisional
7. its proof obligation enters the frontier as an ordinary goal; the planner does not prove it
8. a helper definition may be added with a complete body when it makes goals much easier to state, sparingly, since it changes the context of every later check

The paper's annotation, from the CLEVER case (p.33):

```
/-
@name: implementation_splitOn
@description: Splitting the space-intercalated decimal representations of the
 numbers in `List.range (n + 1)` recovers exactly that mapped range.
@lib_depends_on: [String.splitOn, String.intercalate, Nat.repr, List.range]
@used_in: [correctness]
-/
```

When sharing pays. Appendix B.5 (p.25): with K consumers, isolated cost is the sum over consumers of (cost of rediscovering h + residual), shared cost is (cost of proving h once + sum of residuals + cost of failed helper attempts and rollback); share when the second is smaller. Proposition A.5's example (p.19): with two consumers, a direct proof costing 5 each and a helper costing 6 with zero residual, the helper loses 6 to 5 from each consumer's view and wins 6 to 10 overall, so a router that sees one goal at a time must be wrong on one of the two cases. The paper adds a caveat that the amortization assumes the helper does not lower the chance of success: “a helper that turns out false, too hard, or abandoned lowers pshare , and rh prices those attempts without pricing their effect on whether the task is solved at all” (A.6, p.21).

Verus form. Inference: the candidate is a `proof fn` with `requires` and `ensures` and a placeholder body; the annotation header becomes a doc comment with the same fields, `used_in` naming the functions whose failing clauses it serves. Step 3 matters more in Verus than in Lean, because fixed-width integer bounds and `int` versus `usize` conversions add corners; the corner list should include the maximum value of the integer type. Step 8 is a `spec fn`. Sharing has a Verus-specific cost the paper's accounting lacks: a lemma made available automatically to many functions (`broadcast use`) enlarges every solver query it reaches, so sharing by explicit call keeps the price local.

Evidence (Table 3, p.9; Gemini-3.5-Flash; 30 problems). Without the Lemma Planner: $157.06 against $110.94, +41.6%, the costliest variant, and 27 of 30 solved, losing two VERINA problems and one AlgoVeri problem. Case D.1 (p.38): the baseline Ax-Prover-Base, same model, made 50 iterations and 151 model calls, 49 of 50 builds failed, and it kept three blocking facts as inline `have` steps inside one proof; each corresponds to a lemma chain that CoCo-Prover proved separately (p.39).

## technique 8: refute a proposed lemma before proving anything against it

What it is. A two-step screen applied to each proposed helper (B.7, pp.25-26).

How:
1. random testing, no model call: for an executable statement, sample concrete values for the universally quantified variables, instantiate, evaluate; one falsifying instance rejects the lemma
2. only if step 1 finds nothing: ask a model for a small set of structured instances (a singleton, an index at the boundary, an overflow value, the state just before and after a loop's last iteration) and evaluate them the same way
3. on a counterexample: reject, return the instance to the planner, which usually strengthens a hypothesis or restricts a bound and proposes a revision
4. if both pass: admit as provisional

The invariant that keeps this from weakening soundness: “Passing these checks is evidence rather than a guarantee: testing can refute a candidate but cannot promote it, and only Lean acceptance makes a declaration stable.” (B.7, p.26)

The paper's example (D.2.4, pp.43-44). The planner proposed that every interval produced by `insertByLo iv ys` is nonempty. False: an empty `iv` leaves `ys` unchanged, so an empty interval already in `ys` survives. The check returned `iv := { lo := 0, hi := 0 }, ys := [{ lo := 0, hi := 0 }]`. The planner restated the lemma with the hypothesis that every element of `ys` is nonempty, which is the form the surrounding fold needs.

Two gaps between description and trace:
- the Vero counterexample is logged as “refuted deductively; the statement is not evaluable (no cocheck verdict)” and verified by a tactic ladder (p.44). B.7 describes only evaluation of instances; a deductive refutation path exists in the system and is not described
- the screen often cannot run. In the CLEVER case 3 of the 9 proposed lemmas are logged inconclusive, one by timeout and two as not testable (Table 10, p.33), and all three were admitted. They include #9, which the paper calls the hardest step (D.1.4, p.35)

Verus form. Inference: a `spec fn` is in general not executable, so step 1 needs one of two substitutes. Where the statement only uses operations that have executable Rust twins, test the twin with random inputs. Otherwise use the deductive route the Vero trace shows: write a `proof fn` with no `requires` whose body asserts the hypotheses and the negated conclusion at the concrete instance, and let Verus check it; if it verifies, the lemma is false. For the paper's example the false lemma has no hypothesis, so the body only asserts that the output of the insertion on the concrete `iv` and `ys` contains an element with `lo == hi`. This costs a solver call and no model call once the instance is chosen. The rule that tests reject and never promote transfers unchanged.

Evidence. CLEVER case: all 9 proposed lemmas screened for $0.12 in total (D.1.5, p.39). Vero case: 56 helper lemmas accepted after the check, 55 used in the final proof (D.2.3, p.41); the number of candidates rejected in that run is not given beyond the one example.

## technique 9: recovery by checked diagnosis and nearest-safe-point rollback

What it is. A reviewer that decides why an attempt is failing and how far to rewind. It distinguishes a goal that is false from a goal that is provable on a path that has become expensive (§3.2, p.6).

How (§3.2, p.6; Recovery Reviewer prompt, p.54; B.5, p.25):
1. if every node in the group is viable, do nothing
2. unprovable: construct concrete instances that satisfy every hypothesis and falsify the goal; they are checked, and a rewind whose counterexamples do not refute the goal is refused
3. hard: state what makes this goal much harder than the one to rewind to; compare continuing with switching on expected remaining cost, revalidation included, and on which route looks less likely to close
4. rewind one node to one earlier node on its own path, preferring the nearest that restores a viable path; everything below it is discarded
5. consider abandoning a whole lemma only when it is unprovable or very hard and its parent can be proved without it; every path that used it is discarded; the top theorem can never be abandoned
6. write the reason into failure memory attached to the node; later passes treat it as settled and do not retry the path or re-propose the lemma. An entry marked plan not executable means the goal is still open and a different technique is required, not the same plan reworded
7. to decide whether to resolve a provisional lemma before building more on it, read its at-risk spend: the realized cost already charged to all its conditional descendants (Equation 19, p.25)

The paper is explicit that step 3 is a judgment: “The judgment is the model’s rather than a certified optimality test, since a cheaper route can also be a less provable one.” (§3.2, p.6)

A recorded reason from the Vero run, for a goal about `insertByLo` (p.50): the unfold-and-split path had exposed several fixed layers of the recursion and introduced no induction hypothesis for the remaining tail, while an earlier node still allowed structural induction on that tail.

Verus form. Inference: unprovable is checked as in technique 8. The Verus shape of the hard case is a function body that has accumulated many `assert` lines and case splits about a recursive `spec fn` without ever calling a recursive lemma; the safe point is the body before those lines, and the replacement is a lemma `proof fn` by induction. Failure memory is a comment block or side file keyed by function and clause. At-risk spend is the cost already spent on functions that call a lemma whose body is still `assume(false)`.

Evidence. Vero prob 14: 52 backtracks, each with a written reason (D.2.3, p.41). CLEVER prob 15: none. No ablation removes the reviewer.

## technique 10: proof-shape patterns recorded in the case studies

These are the planner's recurring moves: items 1-4 are the pattern the paper states for almost every non-trivial target of the Vero interval-set task (D.2.3, p.41), items 5 and 6 come from the Vero key episodes (D.2.4), items 7 and 8 from the CLEVER task.

1. do not unfold the implementation; unfold only the specification down to the composition of the implementation's stages. The plan text: “the existing coverage lemmas exactly factor merge into sorting and coalescing; do not unfold either implementation.” (D.2.3, p.41)
2. split each claim along the implementation's pipeline: a fact about one insertion step, lifted through the fold to the sort, combined with a fact about the coalescing stage that assumes a sortedness certificate as hypothesis
3. prove each layer by the induction that matches its recursion: structural induction for structurally recursive functions and folds, the function's own induction principle for well-founded recursion; revert or generalize hypotheses so the induction hypothesis applies to the changed argument
4. close the target in a few lines by rewriting with the layer lemmas
5. for uniqueness, determination and permutation-invariance targets, prove one extensionality lemma independent of the implementation (two canonical interval lists covering the same points are equal) and derive those targets from it and the two central results; this avoids any reasoning about how the sort handles ties (D.2.4, pp.46-48)
6. when automation has already rewritten a target into an unfolded shape that no lemma matches, state a bridge lemma in exactly that unfolded form, proved from the public-form lemma, and finish with one `exact` (D.2.4, p.49)
7. when the missing fact is about a private library function, state it as a lemma about that function, with a scoped header line that makes the private name resolvable (CLEVER lemma #7, p.35; system prompt, p.52). A baseline round described the same function as inaccessible; CoCo-Prover proved the lemma for $0.037 (p.38)
8. descend one abstraction layer per iteration: specification, string API, character lists, byte-level scanner (Table 9, p.32)

Verus form. Inference: pattern 1 is making the stage functions' `spec fn`s `opaque` (or `closed spec fn` across modules) and proving stage lemmas where the body is revealed with `reveal`; consumers then use only the lemmas' `ensures`. Pattern 2's certificate is a `requires` on the later stage's lemma and an `ensures` of the earlier stage's. Pattern 3 is a recursive `proof fn` whose `decreases` and `match` mirror the `spec fn`'s recursion; generalizing hypotheses means making them parameters and `requires` of the lemma, not facts captured from one call site. Pattern 5 transfers directly and is the standard way to get equality of two `Seq` results in Verus: prove pointwise agreement, then extensional equality. Pattern 6 has no need in Verus, since there is no goal term that an earlier step rewrote. Pattern 7's private-name problem does not arise the same way: a `closed spec fn` body in another module cannot be opened by a scoped directive, so the fact has to be exported as a lemma by the owning module.

## technique 11: continuing the router's conversation to reuse the prompt cache

What it is. The specialist appends its turns to the router's message history instead of starting a new conversation, so the shared prefix is billed at the cache-hit price and the specialist inherits the router's analysis (B.6, p.25). The ledger records cached and uncached input tokens separately.

Evidence (Table 8, p.31; CLEVER prob 15; GPT-5.6-Terra; same prices for all four systems). CoCo-Prover: $2.36, 2.54M prompt tokens over 161 calls, about 15.8k per call. Codex: $8.67, 27.08M prompt tokens, of which 26.68M cache reads costing $6.67, 77% of its bill; about 140k prompt tokens per step. Humanize: $10.74, of which $9.05 (84%) in eight rounds that ended without a proof. Ax-Prover-Base: $5.48 and failed, $4.33 of it output tokens. The cost breakdowns sum to the totals within a cent, and the cache-read cost matches the Table 4 price of $0.25 per million tokens.

The lesson the paper draws is about context size, not cache price: both successful baselines found proofs of similar size and structure (149 and 184 lines against 191), and “most of their extra cost is cache reads from re-sending an ever-growing context at every step” (Table 8 caption, p.31).

Verus form. Inference: independent of the prover. Two rules follow: give each specialist call only its goal, the router's analysis and the needed definitions; and never let one conversation carry the whole verification transcript.

Limit, stated by the paper: dollar figures depend on each provider's caching behaviour (Appendix F, p.55).

## technique 12: how solved and cost are measured

A run counts as solved only after five checks applied to every method (C.1, pp.27-28):
1. re-elaborate; reject holes written as `sorry` or `admit` or left by a placeholder tactic such as `apply?`; treat the elaborator's sorry warnings as failures
2. the statement is unmodified: string match against the benchmark original and re-elaboration in the benchmark environment
3. no new axioms: the axioms each target proof depends on must lie within the benchmark's environment
4. a model review (Codex with GPT-5.6-Sol) of each accepted proof for placeholders and vacuous proofs; flagged proofs are examined by hand
5. a manual audit of a random sample of passing proofs

Cost is compared only on problems that both systems solve. The reason: a method that gives up early, or closes a hard problem with an axiom or a rewritten statement, spends little exactly where an honest proof is expensive, “so counting those runs would reward failure” (§4.1, p.7). The paper adds that statement weakening and axioms are “the behavior we observe most often in the coding agents” (§4.1, p.7), with no count.

Caps and prices (C.1, p.26): $30 and 5 hours per function-level problem (NTP4VC included), $60 and 8 hours per repository-level task; token counts by type converted at one fixed price schedule (Table 4).

Verus form. Inference: check 1 is a scan for `assume(`, `admit()` and a clean Verus run; check 2 is a byte comparison of signatures, `requires`, `ensures` and the `spec fn`s they use; check 3 is a scan for `#[verifier::external_body]` and `assume_specification` items not in the original. Reporting cost only on commonly solved tasks is directly reusable for comparing VL configurations.

## results, with denominators

Solve rates (Table 1, p.7; counts from Table 2, p.8). CLEVER has 161 problems, VERINA 189, AlgoVeri 77, NTP4VC 300 (the first 300 tasks in alphabetical order, not a random sample), Vero 43 tasks.
- CoCo-Prover with GPT-5.6-Terra: 161/161, 189/189, 69/77 (89.6%), 268/300 (89.3%), 23/43 (53.5%)
- with Gemini-3.5-Flash: 161/161, 186/189 (98.4%), 62/77 (80.5%), 284/300 (94.7%), 26/43 (60.5%)
- with DeepSeek-V4-Flash: 156/161 (96.9%), 189/189, 72/77 (93.5%), 285/300 (95.0%), 6/43 (14.0%)
- strongest baseline, Humanize: 97.5%, 98.9%, 85.7% with GPT-5.6-Terra; 97.5%, 95.2%, 80.5% with Gemini-3.5-Flash; it ties CoCo-Prover on AlgoVeri with Gemini
- coding agents on Vero: 2.3%, 7.0%, 0% (1, 3 and 0 of 43); Humanize and Ax-Prover-Base were not run on the repository-level benchmarks

All printed percentages match their fractions. The summed function-level counts in Figure 4 (419, 409 and 417 of 427) match Table 2.

Cost on commonly solved problems (Table 2, p.8). The headline 30.9% is one cell: Humanize on CLEVER with GPT-5.6-Terra, 157 common problems, $136.6 against $94.4. Against Humanize with GPT-5.6-Terra the other two cells are 18.4% (VERINA, 187 common) and 1.3% (AlgoVeri, 66 common, $67.4 against $66.6). Savings are larger with DeepSeek-V4-Flash (38.4% to 85.7%), which the paper attributes to baselines' scaffolds not suiting that model (C.3, p.28). On Vero with GPT-5.6-Terra the coding agent is cheaper on the single common task ($1.6 against $3.6).

Wall-clock time is worse: on CLEVER, mean time over each system's solved set is higher for CoCo-Prover with GPT-5.6-Terra and Gemini-3.5-Flash (Figure 5, p.29; C.2, p.28).

## things that do not add up, or are weaker than stated

- variance against savings. The full three-benchmark Gemini-3.5-Flash run has a cost coefficient of variation of 9.2% over three runs ($969.8 mean, $89.5 standard deviation; C.4, p.29). The paper says this spread is an order of magnitude smaller than the cost gaps the comparison rests on. The Gemini savings against Humanize are 26.6%, 19.1% and 28.7%, two to three times the spread, not ten. Inference: the GPT-5.6-Terra savings of 1.3%, 9.5% and 9.8% in Table 2 are inside or near this noise, and baselines were not rerun, so their variance is unknown
- Table 2's Vero cell prints a 131.2% increase for $1.6 to $3.6, which is 125% from the printed figures; the AlgoVeri Humanize cell prints 1.3% for $67.4 to $66.6, which is 1.2%. Inference: both are rounding of unrounded costs
- Table 8 gives the CLEVER proof as 191 lines; the per-declaration line counts in Table 10 sum to 160. The paper does not say what the other 31 lines are; Inference: annotation headers are a likely candidate
- the abstract's phrase best solve rate on every benchmark includes one tie (AlgoVeri, Gemini-3.5-Flash)
- CLEVER and AlgoVeri implementations were written by a model and hand-checked; Inference: an unsolved AlgoVeri problem (5 to 15 of 77 depending on model) could be an incorrect implementation and not a hard proof, and the paper does not report checking the unsolved ones
- Table 6 lists the Humanize baseline's repository as humanfia/putnambench while the reference list gives github.com/humanfia/humanize
- two baselines, Goedel-Code-Prover and Hilbert, were excluded after trials that the paper describes in a paragraph each with no table (C.1, pp.26-27)

## what is already done, and the threat

Done, and not worth rebuilding from nothing: the control loop (frontier by dependency counters, group, route to a priced specialist, write back, promote on kernel acceptance), the helper-lemma admission pipeline with counterexample screening, the reviewer with checked rollback reasons, and the solved-and-cost measurement protocol. The prompts are printed in Appendix E.

Not done: anything outside Lean 4 (“All benchmarks are in Lean 4 since we don’t implement CoCo-Prover on Rocq or Isabelle/HOL.”, Appendix F, p.55); specification or code synthesis; an SMT-based verifier, where there is no tactic state to hang the inner graph on. Inference: the inner AND/OR level is the part a Verus system must redesign; the outer lemma graph, the routing and the screening transfer.

How much this threatens agent-written verified Rust as a product. Inference: high as a design competitor on the proof-search part and low on the product as a whole. One of its benchmarks, Vero, contains Lean translations of real repositories, and Figure 1 (p.2) labels its example task “One Task in Vero: Arithmetic | verus-lang/verus (vstd)”, so the method is already being exercised on statements derived from Verus's own library, in Lean. It reaches 23 to 26 of 43 such repository tasks with two of three models and 6 of 43 with the third, so repository-level proving is far from solved even here. It does not write Rust, does not write specifications, and takes the statement as given; a product whose difficulty lies in specifications and in Rust-specific proof (ownership, integer bounds, loop invariants) is not covered by this result.

## techniques for the catalog

- two-level proof graph: keep a lemma-dependency DAG across declarations joined to a per-declaration record of verified steps and open subgoals, with statuses open, provisional, conditionally solved, stable and rejected
- stable-only promotion: mark a declaration proved only when the checker accepts it and every generated lemma it depends on is itself stable
- dependency-ready frontier: maintain two in-degree counters per declaration (unelaborated and unstable prerequisites) and update them per event to get the workable goals without a model call
- root-relevance filter: never schedule a helper that has no dependency path to a target, and require each proposed helper to name its consumers
- priced routing decision: have a router return a goal group, a specialist, a reasoning-effort and iteration budget, and a preliminary analysis, choosing by same provability then lowest expected cost to finish the whole task
- self-amended routing rules: start from a short description of each specialist plus one priority and let the router revise the rules after each observed outcome
- guards with deterministic fallback: reject malformed or repeated decisions mechanically, bound router retries per step, and fall back to the cheapest admissible action
- buy-if rule: purchase a paid action that would finish the remaining work with probability p at price k only when k is at most p times the best expected remaining cost
- embedding-clustered goal batches: group frontier goals by deterministic spherical k-means on statement embeddings so one call serves related goals and a helper sees several consumers
- automation first with no-progress cache: try model-free proof search on goals blocked only by definitions, keep partial scripts, and cache failures on unchanged states
- bounded proof writer: give one goal, the router's analysis and an iteration cap, insert only hole-filling lines, keep partial verified progress when the cap is hit
- no-guess lemma names: allow only library names confirmed by a check or returned by retrieval, and retrieve by description after an unknown-name error
- lemma planner with consumer annotations: state a missing fact as a general, side-conditioned, proof-less lemma with declared dependencies and consumers, and prove it later as its own goal
- corner instantiation before proposing: mentally test a candidate lemma at empty, boundary, swapped-bound and overflow cases and add the missing hypotheses first
- two-step lemma refutation: screen each proposed lemma by random instances, then by model-proposed structured instances, rejecting on any counterexample and never promoting on a pass
- checked rollback: allow a rewind only with a counterexample that is verified to refute the goal or a stated reason the path is much harder, and rewind to the nearest node that restores a viable path
- failure memory: attach the reviewed reason for each abandoned path or lemma to its node so later planning does not retry it
- at-risk spend: for each unproved lemma that others were built on, report the cost already sunk in its dependents as a signal to resolve it first
- factor along the pipeline: prove one lemma per implementation stage with the earlier stage's guarantee as a hypothesis of the later, and close targets by rewriting with stage lemmas without unfolding the implementation
- induction matching recursion: choose structural induction or the function's own induction principle to mirror how each function recurses, generalizing hypotheses so the induction hypothesis fits the changed argument
- extensionality lemma for canonical forms: prove that two canonical values with the same observations are equal, then derive uniqueness and permutation-invariance targets from it
- conversation continuation: let the specialist continue the router's message history so the shared prefix is cache-priced and contexts stay small
- five-check solved criterion: count a proof only if it has no holes, an unmodified statement, no new axioms, passes a model review and survives a manual sample
- cost on commonly solved problems: compare spending between two systems only on the problems both solve, so that cheap failures and statement-weakening do not look efficient
