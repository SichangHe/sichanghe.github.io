# Layered and Staged Monte Carlo Tree Search for SMT Strategy Synthesis
(authored by agents unless marked 🧑)
Tag: `lu2024layered`, [paper](https://arxiv.org/abs/2401.17159)

## contribution

This extended paper introduces Z3alpha, which synthesizes Z3 tactic programs with Monte Carlo Tree Search (MCTS). The strategy grammar contains tactic sequencing, fallback, bounded execution, predicates, and parameter settings (Section 3, Figure 1, pp. 3–4). The paper's premise is that “finding a rigorously optimal solution is impractical” because the strategy space is infinite and evaluation is empirical (Section 1.1, p. 2). It therefore seeks a high-performing strategy on a finite benchmark set. The paper identifies itself as arXiv:2401.17159v2, dated 30 April 2024 (p. 1).

## basic MCTS formulation

A strategy derivation is a deterministic Markov decision process: a state is a sentential string, an action applies a production rule to the leftmost variable, and one complete derivation is one episode (Section 4.1, p. 4). The four standard simulation phases are selection, expansion, rollout, and backup (Section 3, p. 4). Z3alpha uses UCT for selection, random rollouts, and max-backup, which propagates the best observed return rather than its mean (Section 4.2, p. 4).

Application steps are: select a finite training set P; encode the grammar and domain restrictions; repeatedly select a leaf with UCT; expand unexplored actions; randomly finish the partial strategy; evaluate the strategy on P; and back up the terminal reward until the simulation budget is reached. The paper states, “The MCTS stops when a simulation budget is reached.” Reward is based on PAR-10, which averages runtimes across instances, using the measured runtime for a solved instance and ten times the timeout for an unsolved instance. Lower PAR-10 is better (Sections 4.1–4.2, p. 4; Appendix B.2, p. 10). The staged method below replaces direct solver evaluation in its second stage with cached results.

## layered MCTS for parameter tuning

The paper's first heuristic prevents parameter combinations from multiplying the grammar tree. It says, “our layered search method approaches the tuning of each tactic parameter as a separate Multi-Armed Bandit (MAB) problem” (Section 4.3, p. 5). Each arm represents a candidate parameter value. A parameter MAB is attached to a tree edge representing one particular tactic application, so two uses of `simplify` receive independent parameter learners.

To apply it, preselect candidate values for each parameter (Figure 3 uses `som` and `max_degree`), retain tactic and sequencing choices in the main tree, and let each attached MAB choose a value whenever its edge is traversed. Update those MABs using the episode reward during backup. The MABs are separate from the main search tree and create no additional tree branches for parameter choices (Section 4.3, pp. 4–5, Figure 3). In the conventional tree illustrated in Figure 3(a), the two parameters' combinations expand the search tree sixfold.

Inference: for proof search, parameter arms could select solver settings or bounded retry counts local to one proof-plan occurrence. A real Verus run would still need to check the resulting obligations. Separating parameter choices may obscure interactions; held-out experiments could test whether the resulting policies generalize.

## staged MCTS and portfolio construction

Staged search addresses the cost of evaluating nested branches. Stage one searches only linear strategies, defined as tactic sequences without branching, connected only by `then`. Stage two searches the full grammar with actions restricted to combinations of selected linear candidates through branching (Section 4.4, p. 5). The paper gives the rationale: “the evaluation of the combined strategies can be done speedily based on the cached linear-strategy performances in the first stage, without costly SMT solver calls” (Section 4.4, p. 5).

Procedure: (1) run first-stage MCTS on linear derivations; (2) build a portfolio greedily, adding the candidate that most improves a virtual-best oracle that chooses the best strategy per training instance, measured by average PAR-10; (3) measure each selected candidate on all of P and cache results; (4) in stage two, combine candidates through branching, using constructs such as `if`, `or-else`, and `try-for`; (5) evaluate a combined strategy by determining its equivalent sequence of linear-strategy applications on each instance and deriving performance from cached results (Section 4.4, p. 5; Appendix A, p. 10). The paper's example first tries `(then simplify sat)` for four seconds and then applies `smt` if needed. A smaller subset P1 may be used for stage-one exploration, with the selected candidates then evaluated on P (Appendix A, p. 10).

The method also supports long timeouts: explore candidates with a short limit, re-evaluate the selected candidates at the intended long limit, and then compose them using those results (Section 4.4, pp. 5–6).

## grammar restrictions

Appendix A (p. 10) lists six domain rules: a standalone tactic must be a solver wrapper, while the first tactic in `then` cannot be a solver wrapper; do not apply `try-for` to a strategy already assigned a `try-for` timeout; limit `if` to the first three syntax-tree depths and disallow it after any tactic application; preselect numerical parameter values, timeouts, and probe comparisons; do not repeat `nla2bv` within a tactic sequence; and apply `bit-blast` only immediately after `simplify`. The restriction on `if` preserves the staged method because tactics may change formula measures. The authors concede that “certain simplification rules might eliminate parts of the search space that include effective strategies” (Appendix A, p. 10).

## experimental evidence

The specific-family experiments use Sage2 and core (QF_BV), AProVE and leipzig (QF_NIA), and hycomp (QF_NRA). Z3alpha preserves FastSMT's test sets, merges its training and validation sets into P, and uses its training set as the stage-one subset P1 (Section 5.1, p. 6; Appendix B.1, p. 10). Table 1 (p. 6) gives test denominators and solved percentages at a 10-second timeout: Sage2 has 6,444 test instances and Z3alpha solves 52.9%; core has 270 and 99.6%; AProVE has 1,712 and 94.8%; leipzig has 68 and 91.2%; hycomp has 1,982 and 91.4%. For Sage2, the authors report “42.7% more instances than the default strategy did” (Section 5.3, p. 7). This is a relative improvement over the default Z3 solved count; Table 1 reports 52.9% versus 37.1% solved.

The setup selected 20 linear strategies from 800 first-stage simulations and used 300,000 second-stage simulations; Z3alpha0, which omits staged search, used 1,000 full-grammar simulations (Section 5.2, pp. 6–7). Z3alpha and FastSMT used Z3-4.12.2 and identical tactic and parameter pools; the other general solver baseline was CVC5-1.0.5. The reported cluster had Intel E5-2683 v4 processors at 2.10 GHz and 75 GB of memory (Section 5.2, p. 7). Table 2 reports average PAR-2 and Table 3 PAR-10 (p. 11), with penalties defined in Appendix B.2 (p. 10). The five-family results in Section 5.3 were averaged over five random seeds; later experiments used one run (Section 5.2, p. 7).

For the full-logic QF_LIA, QF_LRA, and QF_S experiments, the training set contains 750 randomly selected instances, of which 250 form P1; the remaining SMT-LIB instances are the test sets (Appendix B.1, p. 10). Table 1 reports test sizes of 12,476, 1,003, and 18,173 respectively. Z3alpha solved 76.2% versus Z3's 74.6% for QF_LIA, and 73.6% versus 71.0% for QF_LRA. FastSMT solved four more QF_LRA instances than Z3alpha (Section 5.4, p. 7). The QF_S experiment integrates user-defined tactics and reports 99.0% solved for Z3alpha versus 98.2% for Z3, 98.4% for CVC5, and 97.2% for Z3str4; FastSMT was excluded because the required tactics lacked its needed Python APIs (Sections 5.1–5.2 and 5.6, pp. 6–7).

For Sage2 at 60 and 300 seconds, Table 2's PAR-2 values are 43.57 and 163.26 for Z3alpha versus 43.82 and 181.00 for FastSMT; CVC5 has lower values of 38.77 and 80.71 (p. 11). Z3alpha synthesizes new strategies for these timeouts, while FastSMT reuses its short-timeout strategy (Section 5.1, p. 6). Inference: these results support benchmark performance comparisons under the reported setup, not formal optimality or general superiority to every solver.

## techniques for the catalog

- MDP grammar search — represent a solver strategy as production-rule decisions and use UCT MCTS with terminal reward based on PAR-10
- layered parameter MABs — attach separate bandits to parameter choices at each tactic occurrence instead of expanding all combinations
- staged linear portfolio — discover branch-free strategies, greedily retain complementary candidates, and compose them with cached per-instance results
- virtual-best selection — choose each next portfolio member by its improvement to an oracle that picks the best candidate per instance
- restricted grammar — prune nesting, depth, repetition, and numerical choices to make expensive strategy evaluation tractable
