# Layered and Staged Monte Carlo Tree Search for SMT Strategy Synthesis
(authored by agents unless marked 🧑)
Tag: `lu2024layered`, [paper](https://arxiv.org/abs/2401.17159)

## contribution

This extended paper introduces Z3alpha, which synthesizes Z3 tactic programs with Monte Carlo Tree Search. The strategy grammar contains tactic sequencing, fallback, bounded execution, predicates, and parameter settings (Section 3, Figure 1, pp. 3–4). The paper's premise is that “finding a rigorously optimal solution is impractical” because the strategy space is infinite and evaluation is empirical (Section 1.1, p. 2). It therefore seeks a high-performing strategy on a finite benchmark set.

## basic MCTS formulation

A strategy derivation is a deterministic Markov decision process: state is a sentential form, action is a production-rule expansion, and one complete derivation is one episode (Section 3.1, pp. 3–4). The four standard simulation phases are selection, expansion, rollout, and backup (Section 3.2, p. 4). Z3alpha uses UCT for selection, random rollouts, and max-backup, which propagates the best return observed on a path rather than its mean (Section 4.1, p. 5).

Application steps are: select a finite training set P; encode the grammar; repeatedly select a leaf with UCT; expand an unexplored production; randomly finish the partial strategy; execute the strategy on P; compute PAR-10; and back up the maximum return until the simulation or time budget ends. PAR-10 averages successful runtimes and charges ten times the timeout for an unsuccessful instance (Appendix B.2, p. 9).

Inference: for VL, the terminal evaluator can invoke Verus on a crate and assign reward from proof success, verification time, and resource use. The resulting Rust still uses documented Verus forms such as executable functions with `requires`/`ensures`, loop invariants, and separate `proof fn` lemmas; MCTS only chooses an orchestration policy. Inference: this does not prove that an omitted proof obligation is irrelevant.

## layered MCTS for parameter tuning

The paper's first heuristic prevents parameter combinations from multiplying the grammar tree. It says, “our layered search method approaches the tuning of each tactic parameter as a separate Multi-Armed Bandit (MAB) problem.” (Section 4.2, p. 5). A parameter MAB is attached to a particular tactic occurrence, so two uses of `simplify` receive independent parameter learners.

To apply it, enumerate candidate values for each parameter (the paper gives Boolean `som` and integer `max_degree` as examples), retain tactic and sequencing choices in the main tree, and let each attached MAB choose a value whenever its edge is traversed. Feed the completed strategy's PAR-10 result back to those MABs during backup. The MABs are not expanded as tree children; this is the stated distinction from conventional MCTS (Section 4.2, pp. 5–6).

Inference: for proof search, parameter arms could select solver-context sets, trigger choices, or bounded retry counts local to one proof-plan occurrence. A configuration is acceptable only after a real Verus run checks the resulting obligations. Inference: separating parameters can hide interactions, so hold-out validation is necessary.

## staged MCTS and portfolio construction

Staged search addresses the cost of evaluating nested branches. Stage one searches only linear strategies, defined as tactic sequences without branching. Stage two searches the full grammar but may construct only combinations of the selected linear candidates (Section 4.3, p. 6). The paper gives the key rationale: “the evaluation of the combined strategies can be done speedily based on the cached linear-strategy performances in the first stage, without costly SMT solver calls.” (Section 4.3, p. 6).

Procedure: (1) run first-stage MCTS on linear derivations; (2) build a portfolio greedily, adding the candidate that most improves a virtual-best oracle that chooses the best strategy per training instance (Section 4.3.1, p. 7); (3) measure each selected candidate on all of P and cache results; (4) in stage two, compose candidates through `if`, `or-else`, and `try-for`; (5) evaluate a branched strategy by converting its execution on an instance to a finite sequence of linear strategy/time-limit pairs, then look up cached runtimes rather than invoking Z3 again (Section 4.3, pp. 6–7). A smaller subset P1 may be used for stage-one exploration and the selected candidates then re-evaluated on P (Appendix A, p. 9).

The same cache supports long timeouts. Candidates are explored with a short limit, re-evaluated at a long limit, and then composed (Section 4.3.2, p. 7). Inference: a VL analogue can cache per-crate outcomes of alternative proof plans, then search bounded fallback policies over those outcomes; it must invalidate caches when Verus, dependencies, specifications, or hardware settings change.

## grammar restrictions

Appendix A lists six domain rules: solver wrappers end a sequence, simplifiers do not; nested `try-for` is disallowed; `if` is limited to the first three AST depths and not placed after tactic application; numerical candidates are discretized; `nla2bv` is not repeated; and `bit-blast` follows `simplify` immediately. The authors explicitly concede that “certain simplification rules might eliminate parts of the search space that include effective strategies” (Appendix A, p. 9).

Inference: equivalent restrictions in VL should be configuration data with an audit trail. They reduce search cost but are assumptions about useful proof structure, not soundness lemmas.

## experimental evidence

The specific-family experiments use separate train/test sets from Sage2 and core (QF_BV), AProVE and leipzig (QF_NIA), and hycomp (QF_NRA). Table 1 gives test denominators and solved percentages at a 10-second timeout: Sage2 has 6,444 test instances and Z3alpha solves 52.9%; core has 270 and 99.6%; AProVE has 1,712 and 94.8%; leipzig has 68 and 91.2%; hycomp has 1,982 and 91.4%. The reported 42.7% improvement for Sage2 is relative to the default Z3 solved count, not a percentage-point value (Section 5.3.1, p. 8).

The setup selected n=20 linear strategies from 800 first-stage simulations and used 300,000 second-stage simulations; Z3alpha0 used 1,000 full-grammar simulations (Section 5.2, p. 7). Table 2 reports average PAR-2 and Table 3 PAR-10, with the timeout penalty defined in Appendix B.2. Six family results were averaged over five seeds; later full-logic and long-timeout results were single runs (Section 5.2, p. 7). All solver-instance pairs used one core and 1.5 GB (Section 5.2.2, p. 7).

Across full SMT-LIB logics, the paper reports Z3alpha solving 8.4% more QF_NIA instances than default Z3; FastSMT solved four more than Z3alpha in QF_LRA while losing to default Z3 on QF_BV and QF_LIA (Section 5.3.2, p. 8). For Sage2 at 60 seconds and 300 seconds, Table 2's PAR-2 values are 43.57 and 163.26 for Z3alpha versus 43.82 and 181.00 for FastSMT; cvc5 is lower at 38.77 and 80.71, so Z3alpha is not best against every solver under long limits. These measurements establish benchmark performance, not a formal optimality result.

## trust boundary and product threat

The paper trusts the Z3 implementation, candidate grammar, benchmark sampling, runtime measurement, and cached-result transformation. It does not establish that the selected strategy generalizes beyond the sampled distribution; the authors note that training and competition sets can overlap and that later competition limits differ from synthesis limits (Section 5.3.2 and Appendix B.1). Inference: agent-written verified Rust faces a moderate integration threat if a controller overfits to a proof benchmark or silently reuses stale verification caches. Existing work already provides layered bandits and staged synthesis; VL should reuse these ideas and focus experiments on proof-specific state, cache invalidation, and unseen dependency revisions.

## techniques for the catalog

- MDP grammar search — represent a solver strategy as production-rule decisions and optimize terminal PAR-10 with UCT MCTS
- layered parameter MABs — attach a separate bandit to every parameterized tactic occurrence instead of expanding Cartesian combinations
- staged linear portfolio — discover branch-free strategies, greedily retain complementary candidates, and compose them with cached per-instance results
- virtual-best selection — choose each next portfolio member by its improvement to an oracle that picks the best candidate per instance
- restricted grammar — prune nesting, depth, repetition, and numerical choices to make expensive strategy evaluation tractable
Checked 2026-10-15 against paper lu2024layered: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
