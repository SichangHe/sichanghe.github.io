# Novel tree-search method for synthesizing SMT strategies
(authored by agents unless marked 🧑)
Tag: `lu2025novel`, [paper](https://www.semanticscholar.org/paper/d2851bdfa600b5df8ba479661de0dc4b205227f3)

## scope and result

The paper presents Z3alpha, an automated synthesizer for Z3 strategy programs. Its search space is a context-free grammar of tactics, parameters, sequencing, fallback, timeouts, and predicates. The objective is empirical: a strategy is scored on a representative training set, because “It is important to note that due to the infinite nature of the strategy search space and the empirical approach to strategy evaluation, finding a rigorously optimal solution is impractical.” (Section 1.1, p. 2). The central techniques are MCTS over grammar derivations, layered parameter search, staged composition of linear strategies, domain restrictions, and PAR-10 reward.

## technique: model strategy synthesis as an MDP and MCTS

What it is. A state is a partially expanded sentential string; an action applies a grammar production to its leftmost variable; a terminal state is a complete strategy. The paper states: “the states are the sentential strings derived from G, while the actions are the production-rule applications” (Section 4.1, p. 7). The reward is delivered only at the terminal state and is based on PAR-10: successful runtimes are averaged and unsolved instances receive ten times the timeout penalty (Section 4.1, p. 8).

When to use it. Use this when a solver exposes a compositional strategy language and candidate evaluation is expensive but measurable on a finite benchmark set. The paper's grammar includes `then`, `or-else`, `try-for`, `if`, tactic parameters, and probes (Section 3.2, pp. 6–7).

How to do it. (1) Choose a training set P and a timeout. (2) Encode the strategy grammar as deterministic leftmost expansions. (3) Build an MCTS tree whose nodes are partial strings. (4) In each simulation perform selection with UCT, expansion with unexplored productions, random rollout to a terminal strategy, and backup of the reward; these are the four steps listed in Section 3.3 (p. 7). (5) Use max-backup, retaining the best observed return rather than an average (Section 4.2, p. 8). (6) Stop at a simulation or wall-clock budget and return the highest-reward strategy (Section 4.2, p. 8).

Verus form. Inference: VL could treat a Verus proof-search configuration as a grammar program whose terminals are solver hints, lemma exposure choices, invariant templates, or backend options. An external harness would run `verus` on each benchmark and return a numeric score; the Rust proof itself remains ordinary Verus code with `requires`, `ensures`, loop invariants, and `proof fn` lemmas. Inference: this tunes proof orchestration, not the soundness of Verus, Z3, or the specification.

Evidence and limits. On six SMT logics, Z3alpha was compared with FastSMT, default Z3, and cvc5. Table 1 reports percentages of solved test instances with explicit denominators: for example, at a 10-second timeout, Sage2 QF_BV has 6,444 test instances and Z3alpha solves 52.9%; AProVE QF_NIA has 1,712 and Z3alpha solves 94.8%. The study used one core and 1.5 GB per solver-instance pair (Section 5.2.2, p. 15), and Section 5.2.3 says the six family experiments were averaged over five random seeds while later experiments used one run. The authors caution that the infinite search space and empirical scoring preclude a proof of global optimality (Section 1.1, p. 2).

## technique: layered search for tactic parameters

What it is. Parameter values are removed from the main MCTS tree and optimized by separate multi-armed bandits attached to each tactic-use edge. The paper explains that “our layered search method approaches the tuning of each parameter as a separate Multi-Armed Bandit (MAB) problem.” (Section 4.3, p. 10). Thus two parameters of one `simplify` occurrence create two MABs rather than a six-way Cartesian expansion.

How to do it. (1) Keep tactic choice and tactic sequencing in the main MCTS grammar. (2) For every occurrence of a parameterized tactic, create one MAB per parameter. (3) Put candidate values (for example `True`/`False` for `som`, or 16, 32, 64 for `max_degree`) in that MAB's arms (Section 4.3, p. 10). (4) When the edge is traversed, choose an arm. (5) During backup update those MABs with the episode reward, but do not add their arms as MCTS nodes. The paper says the MABs “are not part of the main MCTS tree” and are updated during backup (Section 4.3, p. 10).

Verus form. Inference: attach a small bandit to each proof-search decision point, such as the set of solver facts exposed to a function or a candidate trigger pattern, while the main tree chooses the sequence of proof steps. A generated candidate must still be checked by Verus; no parameter value is trusted without a successful verification run.

Failure assumptions. The authors say dozens of tactic parameters and repeated tactic use make full expansion impractical, but they also acknowledge that the layered decomposition treats parameters as auxiliary and may miss interactions (Section 4.3, p. 10). Inference: parameter independence is a search heuristic, not a semantic guarantee.

## technique: staged search with cached linear strategies

What it is. Stage one searches only branch-free tactic sequences and selects n complementary linear strategies. Stage two searches the full grammar but is restricted to combinations of those candidates. The paper states: “the staged search method divides the entire search process into two stages” (Section 4.4, p. 10).

How to do it. (1) Run MCTS with branch-producing actions disabled to discover linear strategies. (2) Select n candidates greedily: repeatedly add the strategy that most improves a virtual-best oracle over the training set (Section 4.4.1, p. 12). (3) Re-evaluate selected candidates over all P and cache per-instance runtimes. (4) In stage two allow `if`, `or-else`, and `try-for` only to combine the selected candidates. (5) Translate each branched strategy on an instance into an ordered list of linear strategies with internal time limits; derive its runtime from cached results, avoiding new solver calls (Section 4.4, pp. 10–11). For long timeouts, select candidates with a short timeout, then re-evaluate only the selected candidates at the long timeout (Section 4.4.2, p. 12).

Verus form. Inference: stage one can synthesize independent Verus proof plans (for example, alternative lemma sequences or solver-option bundles) and cache each plan's verification result per benchmark. Stage two can synthesize branch conditions that try one plan for a bounded effort and fall back to another. Inference: this requires deterministic, cacheable proof-run outcomes and cannot infer a proof for a benchmark never checked.

Evidence. In the six-family experiments, stage one used 800 simulations to select n=20 linear strategies; stage two used 300,000 simulations, while Z3alpha0 used 1,000 full-grammar simulations (Section 5.2, p. 15). Table 3 reports total synthesis times in minutes; for AProVE, Z3alpha took 293.1 minutes versus FastSMT's 759.6, and Z3alpha outperformed Z3alpha0 on every listed benchmark family (Section 5.3.1, pp. 15–16). In SMT-COMP 2024, Table 5 reports 16 logics: Z3alpha improved over default Z3 in 12, but solved four fewer in QF_UFBV and QF_IDL; QF_NIA and QF_NRA gains were 291 and 343 instances respectively (Section 6.2, pp. 19–20). The authors note training/competition overlap and a mismatch between five-minute synthesis and twenty-minute competition limits (Section 6.2, p. 20).

## technique: domain restrictions and candidate pools

The paper uses six explicit simplifications (Section 4.5, p. 12): do not end a sequence with a simplifier or put a solver in an intermediate position; avoid nested `try-for`; restrict `if` to depth three and forbid it after tactic application; discretize continuous parameters; avoid repeating theory transformations such as `nla2bv`; and apply `bit-blast` immediately after `simplify`. Appendix A lists tactic/parameter pools separately for QF_BV, QF_NIA, QF_NRA, QF_LIA, QF_LRA, and QF_S (pp. 21–24).

Inference: a VL implementation should make such restrictions explicit configuration, record which candidate pool was used, and treat excluded strategies as an unsearched region. The authors warn that simplification rules “might eliminate parts of the search space that include effective strategies” (Section 4.5, p. 12).

## proof boundary and VL relevance

The paper reports benchmark performance and does not establish global optimality. Trusted components include Z3 tactic implementations, the grammar and domain restrictions, benchmark representativeness, timeout measurements, and the correctness of the evaluation harness. Inference: for agent-written verified Rust, the direct threat is operational: an optimizer could select a proof configuration that passes sampled obligations while degrading coverage or reproducibility on unseen code. Existing work already supplies MCTS, parameter decomposition, staged caching, and solver-strategy benchmarks; VL should not redo those as if they were new. Inference: a useful VL experiment is to tune proof-search settings on training crates, hold out crates and dependency revisions, and require every selected configuration to pass full Verus verification.

## techniques for the catalog

- grammar MCTS — search solver-strategy derivations with UCT selection, random rollout, max-backup, and an empirical terminal reward
- layered parameter bandits — optimize each tactic occurrence's parameter values in separate MABs outside the main tree
- staged cached synthesis — discover linear strategies first, then compose them through branches using cached per-instance results
- domain-restricted strategy search — shrink the grammar with tactic-order, depth, repetition, and discretization rules while recording excluded space

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
