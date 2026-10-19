# A Primal-Dual Perspective on Program Verification Algorithms
(authored by agents unless marked 🧑)
Tag: `tsukada2025primal`, [paper](https://arxiv.org/abs/2501.01512)

## scope and central claim

The paper gives one Lagrangian framework for verification searches that alternate between a proof candidate and a counterexample. Its formal object is a function `L : X × Y -> P`, where `P` is a totally ordered complete lattice. The primal objective is `inf_x sup_y L(x,y)` and the dual objective is `sup_y inf_x L(x,y)`. Weak duality always gives the dual value no larger than the primal value. Strong duality means equality. The procedure compares witness bounds with a threshold written as `0`; the codomain need not be restricted to `{-1,0,1}` (Section 2.3).

The paper states: "In this paper we propose a unified primal-dual framework for designing verification algorithms that leverage duality." (abstract, p. 1). Applying the framework requires relating at least one witness bound to the target problem, establishing the required monotonicity, and implementing both witness checks (Section 2.3, p. 10).

## generic primal-dual procedure

Use this when a verification problem has two mutually informative searches.

1. Choose `L`, `X`, `Y`, and a threshold zero so that a dual witness `beta` with `inf_x L(x,beta) >= 0` certifies the desired property, while a primal witness `alpha` with `sup_y L(alpha,y) <= 0` gives an upper bound on the primal optimum; its meaning for the target problem requires a separate soundness argument (Section 2.3)
2. Start with arbitrary `alpha` and `beta` (Algorithm 1, line 1)
3. Check the dual witness. If `inf_x L(x,beta) >= 0`, return `(D,beta)` (lines 3-4)
4. Otherwise obtain `delta` with `L(delta,beta) < 0`, and set `alpha := delta` or, when `X` is a join semilattice, `alpha := alpha ⊔ delta` (lines 5-6)
5. Check the primal witness. If `sup_y L(alpha,y) <= 0`, return `(P,alpha)` (lines 7-8)
6. Otherwise obtain `gamma` with `L(alpha,gamma) > 0`, and set `beta := gamma` or `beta := beta ⊔ gamma` when `Y` is a join semilattice (lines 9-10)
7. Implement the two witness checks with domain-specific solvers; choose `delta` and `gamma` heuristically when multiple witnesses exist (Remark 2.7)

The paper's correctness theorem says each returned witness gives the corresponding bound. Progress is guaranteed when one side is a join semilattice and `L` is monotone on `Y` or antimonotone on `X`, provided the update on that side always uses join. The same candidates are then never assigned twice (Theorems 2.8-2.9). Termination is not generally guaranteed. A gap with `sup_y inf_x L(x,y) < 0 < inf_x sup_y L(x,y)` makes both return tests impossible (Theorem 2.10). Strong duality alone does not ensure termination: in Example 2.11 a witness `beta = ∞` exists, but the procedure can keep choosing finite values. Theorem 2.12 combines join accumulation and antimonotonicity on `X` with finite layers on `Y`, choosing `gamma` from the smallest possible layer, assuming a positive witness exists. Theorem 2.13 instead puts monotonicity, join accumulation, and stratification on `Y`: the layer index must preserve joins as maximum, each layer must have finite height, and the same smallest-layer choice and positive-witness assumption apply. The dual cases exchange the roles of `X` and `Y`.

## safety: CEGAR

For a transition system, set `X` to finite state traces and `Y` to finite predicate sets. `L_CEGAR(trace,A) = -1` exactly when the supplied trace, mapped to equivalence classes under `A`, is an initial-to-bad trace in the abstract system; otherwise it is `1` (Section 3.2). Apply it as follows.

1. Begin with an empty predicate set `A`
2. Check the abstract transition system `S_A`; if safe, return safe
3. If unsafe, extract an abstract trace `tau`
4. Check whether available predicates can refute feasibility of `tau`; if not, return unknown, as in Algorithm 2
5. Otherwise synthesize an infeasibility witness `alpha` and update `A := A ∪ alpha`
6. Repeat

The paper states: "Counter-Example Guided Abstraction Refinement (known as CEGAR) is a famous technique for the safety verification problem" (Section 3.2, p. 11). The dual witness check is abstract safety checking; the primal witness check is abstraction refinement. Strong duality holds for the idealized predicate universe, and a positive dual value implies concrete safety. Restricting the predicate universe can lose strong duality: a safe system may lack an expressible proof. If some trace cannot be refuted using these predicates, Algorithm 2 returns unknown; if every trace can be refuted but safety cannot be proved, it cannot terminate (Theorem 2.10). A primal witness alone therefore does not establish concrete unsafety. Stratified predicates, chosen from the smallest possible level with the required layer conditions, give conditional termination when a positive witness exists (Remark 3.7; Theorem 2.13).

## safety: ICE learning

ICE uses a teacher/learner interaction. `X` is finite information `(initial states, transitions, bad states)` and `Y` is candidate predicates. `L_ICE(S',p)=1` iff `p` is a safe inductive invariant for the subsystem described by `S'` (Section 3.3).

1. Start with empty subsystem information
2. Learner proposes a safe inductive invariant for the current finite subsystem; if none exists in the candidate language, return unknown
3. Teacher checks it against the complete transition system
4. If invalid, teacher returns a counterexample initial state, transition, or bad state and adds it to the subsystem
5. Return safe if the candidate is a safe inductive invariant of the complete system; otherwise repeat (Algorithm 3)

The paper's worked example adds bad state `-3`, then initial state `0`, then transitions `(0,1),(2,3),(8,9),(-4,-3)`, leading to `p(x) := x > -2` (Example 3.8, pp. 12-13). Here monotonic accumulation is on `X`, not `Y`; the teacher is the dual witness check and the learner is the primal witness check. The idealized predicate universe has strong duality (Proposition 3.9), and a positive dual value implies safety (Corollary 3.10). These facts do not guarantee termination for a restricted predicate language.

## primal-dual Houdini and induction duality

Cartesian abstraction restricts invariants to conjunctions of a predicate set. Houdini computes the strongest inductive invariant expressible as a conjunction from the supplied predicates, then checks whether it proves safety (Section 4.1). Primal-dual Houdini runs this idea simultaneously on a transition system `S` and an induction-dual system `I` over predicate sets. The duality conditions (ID1)-(ID4) ensure that a path in `I` implies an inductive invariant of `S`; a reachable bad predicate in `I` therefore proves `S` safe (Lemma 4.1 and Corollary 4.2).

Its Lagrangian is `-1` when no subset of `y` is a safe inductive invariant of the restricted `S|x`, `1` when no subset of `x` is a safe inductive invariant of restricted `I|y`, and `0` otherwise (Equation 2, Section 4.3). Both arguments are join semilattices, and the Lagrangian is antimonotone on `X` and monotone on `Y`. Algorithm 4 accumulates states and predicates on both sides. It returns safe for a dual witness and unknown for a primal witness. Its refinement requires `L_pdH = 1`, a stronger requirement than the `L_pdH >= 0` sufficient for ordinary abstraction refinement (Section 4.3). Theorem 4.3 is needed to show the `1` and `-1` cases cannot both hold. The formulation is symmetric: swapping `S` and `I` changes only the sign.

## termination: ranking functions and disjunctive relations

For termination, a ranking function maps states to an ordinal and strictly decreases on every reachable transition (Section 5.1). ICE transfers directly: `X` is finite initial states and transitions, `Y` is candidate natural-valued ranking functions, and `L_T-ICE(S',r)=1` iff `r` ranks the subsystem. The dual check reduces to safety by constructing `S^(r)` whose states are pairs `(s,s')` and whose bad states satisfy `r(s) <= r(s')` (Section 5.2). A safety counterexample yields the finite subsystem that refutes `r`; synthesis of a generalized ranking function remains difficult and may use templates, decision trees, or support-vector machines.

CEGAR instead uses a finite set `R` of ranking functions and the disjunctively well-founded relation `s ≻_R s'` iff some `r in R` decreases. `L_T-CEGAR(trace,R)=1` requires `s_i ≻_R s_j` for every pair `i<j`, not only adjacent states (Section 5.3). Adding ranking functions is a monotone join update. The Podelski-Rybalchenko theorem gives termination when this relation decreases over every reachable nonempty path. The dual check again reduces to safety, while the primal check only needs a ranking function for one trace; this is the core of Terminator.

## quantified LRA: strategy skeletons

Section 6 works over linear rational arithmetic (LRA). Plain Skolem functions give a mathematically exact Lagrangian for quantified formulas, but the candidate sets lack the required order and can include functions with no finite representation. Strategy skeletons solve both issues. A SAT skeleton uses grammar `• | forall y.π | ⊔_i t_i.π_i`; at an existential variable it offers a finite set of terms. An UNSAT skeleton is dual and uses conjunction-like `⊓` choices. The Lagrangian `L_FK(rho,pi)` is `1` exactly when the induced closed quantifier-free formula `<rho | phi | pi>` is true, and `-1` otherwise (Section 6.2).

Use the solver as follows.

1. Put the formula in prenex normal form over LRA
2. Maintain SAT and UNSAT skeletons, ordered by inclusion of offered terms
3. Expand a SAT skeleton `pi` into `phi|pi`, which has no existential quantifiers, and check validity with a satisfiability modulo theories (SMT) solver
4. If valid, return a positive witness; otherwise construct an UNSAT skeleton from the countermodel and join it with the accumulated UNSAT skeleton
5. Perform the symmetric primal witness check; return a negative witness if successful, otherwise construct and accumulate a SAT skeleton
6. Repeat; for the Farzan-Kincaid termination argument, convert concrete rational assignments into terms from the finite set used in quantifier elimination or model-based projection (Section 6.2, p. 23)

The paper states: "Since 𝜑 |𝜋⟩ is a formula with no ∃, its validity can be checked by an SMT solver." (Section 6.2, p. 23). Strategy-skeleton monotonicity gives progress, and finiteness of the term vocabulary used by Farzan and Kincaid gives termination. Theorem 6.7 states strong duality and that the optimal value equals formula validity.

## fixed-point logic solver MuStrat

The paper combines strategy skeletons for quantifiers with disjunctively well-founded relations for least fixed points. `X` contains ranking-function sets for greatest-fixed-point predicates plus UNSAT skeletons; `Y` contains ranking-function sets for least-fixed-point predicates plus SAT skeletons. Each pair induces a quantifier-free recursive program. Evaluation records visited predicate arguments; a recursive call is cut off when a ranking relation is violated, returning false for a least-fixed-point predicate and true for a greatest-fixed-point predicate. Conjunctions and disjunctions combine successor values. The reduction terminates, and `L_Fix = 1` exactly when its initial configuration evaluates to true, provided the candidate ranking functions are computable (Section 7.2). Theorem 7.2 gives a sufficient condition for soundness on the expressiveness of the candidate ranking-function sets.

A failure mode is angelic branching (a branch chosen to make the formula true): reducing a recursive formula to safety is unsound if a choice can inspect the extra history component. The paper repairs this by replacing the choice with a fresh function of the real state only (Example 7.3). MuStrat was evaluated with a 300-second timeout on 335 termCOMP C Integer benchmarks, 202 MuVal benchmarks, and 47 game-solving benchmarks. On the first two sets, it solved 6 and 7 instances respectively that MuVal timed out on, while solving slightly fewer total instances than MuVal on each set. The dedicated solver rpgsolve solved all but two of the 47 game benchmarks. The experiments ran in StarExec (Section 7.3, pp. 27-28).

## what is proved, measured, and trusted

The paper establishes weak duality for every generalized Lagrangian (Lemma 2.4), partial correctness and conditional progress for Algorithm 1 (Theorems 2.8-2.9), and sufficient conditions for termination (Theorems 2.12-2.13). Strong duality is proved for specified idealizations and the quantified-LRA skeleton Lagrangian, not for every restricted candidate domain. Theorem 7.2 gives a soundness condition for the fixed-point Lagrangian under its stated expressiveness assumption.

The evaluation compares MuStrat with MuVal and discusses rpgsolve; it reports the benchmark counts, timeout, and complementary solved instances above, with runtime scatter plots in Figures 1-3. MuStrat uses Spacer as its backend constrained Horn clause (CHC) solver (Section 7.3). The paper leaves detailed Lagrangian analyses of IC3/PDR and of MuVal's algorithm to future work (Section 8, p. 29).

Inference: the transferable idea for verified-Rust proof search is to accumulate candidates under a proved monotonicity condition. Restricted proof vocabularies can leave a search inconclusive even for a safe program. Applying these ideas in Verus would require a separate encoding and soundness argument; this study does not validate such an implementation.

## techniques for the catalog

- generalized Lagrangian: encode proof/counterexample compatibility in a lattice-valued function and solve primal and dual witness problems together
- monotone primal-dual search: accumulate joins on a monotone side to avoid repeating candidates
- stratified search: use finite layers on the opposite side from join accumulation, or finite-height layers with a join-preserving index on the same side, for conditional termination
- CEGAR Lagrangian: alternate abstract error traces with predicate refinements
- ICE Lagrangian: alternate finite teacher counterexamples with learner-generated inductive invariants
- primal-dual Houdini: run symmetric Cartesian invariant searches over induction-dual systems
- ranking-function ICE: reduce ranking validation to safety and synthesize generalized measures from finite traces
- disjunctive termination CEGAR: accumulate finite sets of ranking functions defining a disjunctively well-founded relation
- strategy skeletons: replace infinite Skolem functions with finite term alternatives ordered by inclusion
- fixed-point primal-dual search: combine skeletons and ranking relations, with history-independent angelic choices
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The following theorem is new to this paper, an abstraction of the progress proof in Padon et al. [2022]."): checked the whole paper, including references and appendices, against the study's quotations, numbers, references, and technique steps; corrected the paper link using its arXiv identifier, the abstract quotation, witness meanings, CEGAR outcomes, stratification conditions, Houdini description, symmetric skeleton checks, recursive cutoffs, and disjunctive well-foundedness; removed unsupported Verus implementation advice and marked the remaining application conclusion as Inference; did not reproduce experiments, independently verify the paper's proofs, or test a Verus implementation.
