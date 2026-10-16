# A Primal-Dual Perspective on Program Verification Algorithms
(authored by agents unless marked 🧑)
Tag: `tsukada2025primal`, [paper](https://doi.org/10.1007/3-540-45319-9_19)

## scope and central claim

The paper gives one Lagrangian framework for verification searches that alternate between a proof candidate and a counterexample. Its formal object is a function `L : X × Y -> P`, where `P` is a totally ordered complete lattice. The primal objective is `inf_x sup_y L(x,y)` and the dual objective is `sup_y inf_x L(x,y)`. Weak duality always gives the dual value no larger than the primal value. Strong duality means equality. The authors use the sign of the value (`-1`, `0`, `1`) as the decision boundary.

The paper states: "We propose a unified primal-dual framework for designing verification algorithms that leverage duality." (abstract, p. 1). The useful design pattern is to choose `X` as possible counterexamples and `Y` as possible proofs (or the reverse), define `L` so that a positive value means the pair is compatible, and implement checks for a witness on each side.

## generic primal-dual procedure

Use this when a verification problem has two mutually informative searches.

1. Choose `L`, `X`, `Y`, and a threshold zero so that a dual witness `beta` with `inf_x L(x,beta) >= 0` certifies the desired property, while a primal witness `alpha` with `sup_y L(alpha,y) <= 0` certifies a negative result or a useful counterexample (Section 2.3)
2. Start with arbitrary `alpha` and `beta` (Algorithm 1, line 1)
3. Check the dual witness. If `inf_x L(x,beta) >= 0`, return `(D,beta)` (lines 3-4)
4. Otherwise obtain `delta` with `L(delta,beta) < 0`, and set `alpha := delta` or, when `X` is a join semilattice, `alpha := alpha ⊔ delta` (lines 5-6)
5. Check the primal witness. If `sup_y L(alpha,y) <= 0`, return `(P,alpha)` (lines 7-8)
6. Otherwise obtain `gamma` with `L(alpha,gamma) > 0`, and set `beta := gamma` or `beta := beta ⊔ gamma` when `Y` is a join semilattice (lines 9-10)
7. Implement the two witness checks with domain-specific solvers; choose `delta` and `gamma` heuristically when multiple witnesses exist (Remark 2.7)

The paper's correctness theorem says each returned witness gives the corresponding bound. Progress is guaranteed when one side is a join semilattice and `L` is monotone on `Y` or antimonotone on `X`, provided the update on that side always uses join. The same candidates are then never assigned twice (Theorems 2.8-2.9). Termination is not generally guaranteed: a duality gap makes both return tests impossible (Theorem 2.10), and even strong duality can diverge when a needed witness is only reached as an infinite limit (Example 2.11). Stratify one side into finite layers and always choose a witness from the smallest possible layer to obtain termination under a suitable witness assumption (Theorems 2.12-2.13).

Verus form (Inference: the paper is language-independent): represent a candidate proof and counterexample as ghost/spec data, define a `spec fn` Lagrangian returning an ordered finite type, and prove witness soundness with `requires`/`ensures`. Use a `while` loop with a `invariant` clause for accumulated candidates and a `decreases` measure only when a finite-layer termination argument exists. Verus's `proof fn` can establish monotonicity and that a returned witness implies safety; the solver and SMT calls remain trusted components of the verification workflow, not executable proof code.

## safety: CEGAR

For a transition system, set `X` to finite state traces and `Y` to finite predicate sets. `L_CEGAR(trace,A) = -1` exactly when the abstraction induced by `A` has an abstract error trace; otherwise it is `1` (Section 3.2). Apply it as follows.

1. Begin with an empty predicate set `A`
2. Check the abstract transition system `S_A`; if safe, return safe
3. If unsafe, extract an abstract trace `tau`
4. Check feasibility of `tau` in the concrete system; if feasible, return unsafe
5. If infeasible, synthesize predicates that refute `tau` and union them into `A`
6. Repeat

The paper states: "Counter-Example Guided Abstraction Refinement (known as CEGAR) is a famous technique for the safety verification problem" (Section 3.2, p. 11). The dual witness check is abstract safety checking; the primal witness check is abstraction refinement. Strong duality holds for the idealized predicate universe, and a positive dual value implies concrete safety. Finite predicate languages can lose strong duality: a safe system may lack a proof expressible in the available predicates, so the procedure can return unknown or diverge. Stratified predicates (smallest level first) provide the paper's termination condition.

Verus form (Inference): model `A` as a ghost `Set<Predicate>` and traces as ghost sequences. Encode each predicate as a `spec fn(State)->bool`; prove abstraction soundness as a lemma that an abstract-safe invariant excludes concrete bad states. Verus can check the invariant's initiation, consecution, and safety with `requires`/`ensures`; predicate discovery itself is an external synthesis step.

## safety: ICE learning

ICE uses a teacher/learner interaction. `X` is finite information `(initial states, transitions, bad states)` and `Y` is candidate predicates. `L_ICE(S',p)=1` iff `p` is an inductive invariant for the subsystem described by `S'` (Section 3.3).

1. Start with empty subsystem information
2. Learner proposes an invariant valid for the current finite subsystem
3. Teacher checks it against the complete transition system
4. If invalid, teacher returns a counterexample initial state, transition, or bad state and adds it to the subsystem
5. Repeat until the candidate is a global invariant or the learner cannot prove the finite subsystem

The paper's worked example adds bad state `-3`, then initial state `0`, then transitions `(0,1),(2,3),(8,9),(-4,-3)`, leading to `p(x) := x > -2` (Example 3.8, pp. 12-13). Here monotonic accumulation is on `X`, not `Y`; the teacher is the dual witness check and the learner is the primal witness check. Soundness follows from the idealized reachable-state set, but practical termination depends on the candidate predicate language and learner.

Verus form (Inference): keep accumulated examples in ghost sets and specify candidate predicates as `spec fn`s. A proof lemma can show that a candidate satisfying all reachable-state obligations is inductive; the teacher's counterexample search is an untrusted or separately verified oracle.

## primal-dual Houdini and induction duality

Cartesian abstraction restricts invariants to conjunctions of a predicate set. Houdini computes the strongest such invariant by repeatedly removing predicates that fail initiation, consecution, or safety. Primal-dual Houdini runs this idea simultaneously on a transition system `S` and an induction-dual system `I` over predicate sets. The duality conditions (ID1)-(ID4) ensure that a path in `I` implies an inductive invariant of `S`; a reachable bad predicate in `I` therefore proves `S` safe (Lemma 4.1 and Corollary 4.2).

Its Lagrangian is `-1` when no subset of `y` is a safe invariant of the restricted `S|x`, `1` when no subset of `x` is a safe invariant of restricted `I|y`, and `0` otherwise (Equation 2, Section 4.3). Both arguments are join semilattices, so the algorithm accumulates states and predicates on both sides (Algorithm 4). Theorem 4.3 is needed to show the `1` and `-1` cases cannot both hold. The formulation is symmetric: swapping `S` and `I` changes only the sign.

Verus form (Inference): represent `S` and `I` as ghost transition relations and encode ID1-ID4 as proof lemmas. Use set union as the join update. A Verus invariant can prove that every accumulated dual path implies the conjunction of predicates; no paper result establishes automation or runtime costs in Verus.

## termination: ranking functions and disjunctive relations

For termination, a ranking function maps reachable states to ordinals and strictly decreases on every reachable transition (Section 5.1). ICE transfers directly: `X` is finite initial states and transitions, `Y` is candidate ranking functions, and `L_T-ICE(S',r)=1` iff `r` ranks the subsystem. The dual check reduces to safety by constructing `S^(r)` whose states are pairs `(s,s')` and whose bad states satisfy `r(s) <= r(s')` (Section 5.2). A safety counterexample yields the finite subsystem that refutes `r`; synthesis of a generalized ranking function remains difficult and may use templates, decision trees, or support-vector machines.

CEGAR instead uses a finite set `R` of ranking functions and the disjunctively well-founded relation `s ≻_R s'` iff some `r in R` decreases. `L_T-CEGAR(trace,R)=1` requires `s_i ≻_R s_j` for every pair `i<j`, not only adjacent states (Section 5.3). Adding ranking functions is a monotone join update. The Podelski-Rybalchenko theorem gives termination when this relation decreases over every reachable nonempty path. The dual check again reduces to safety, while the primal check only needs a ranking function for one trace; this is the core of Terminator.

Verus form (Inference): encode a ranking function as a ghost `spec fn` into `nat` (or an explicitly modeled well-founded measure), and prove strict decrease with `decreases` on recursive code. For disjunction, keep a ghost finite set of measures and prove that every nonempty path segment decreases under at least one member. Verus's `decreases` annotation handles a chosen measure; the finite-disjunction argument needs separate lemmas.

## quantified LRA: strategy skeletons

Plain Skolem functions give a mathematically exact Lagrangian for quantified formulas, but their domains are not ordered and may have no finite representation. Strategy skeletons solve both issues. A SAT skeleton uses grammar `• | forall y.π | ⊔_i t_i.π_i`; at an existential variable it offers a finite set of terms. An UNSAT skeleton is dual and uses conjunction-like `⊓` choices. The induced quantifier-free formula `<rho | phi | pi>` is true exactly when the pair is compatible (Section 6.2).

Use the solver as follows.

1. Put the formula in prenex normal form over LRA
2. Maintain SAT and UNSAT skeletons, ordered by inclusion of offered terms
3. Expand a SAT skeleton into `phi|pi`, a universally quantified formula
4. Ask an SMT solver for validity
5. If invalid, convert the countermodel's rational assignments into finite LRA terms and add an UNSAT skeleton
6. Join the new skeleton with the old one and repeat

The paper states: "Since 𝜑 |𝜋⟩ is a formula with no ∃, its validity can be checked by an SMT solver." (Section 6.2, p. 23). Strategy-skeleton monotonicity gives progress, and finiteness of the term vocabulary used by Farzan and Kincaid gives termination. Theorem 6.7 states strong duality and that the optimal value equals formula validity.

Verus form (Inference): this technique is primarily SMT-level, not a direct Rust encoding. A Verus application can generate quantified obligations and use `assert`/`assert forall` with triggers, but finite candidate-term enumeration and model extraction remain external orchestration.

## fixed-point logic solver MuStrat

The paper combines strategy skeletons for quantifiers with disjunctively well-founded relations for least fixed points. `X` contains ranking-function sets for greatest-fixed-point predicates plus UNSAT skeletons; `Y` contains ranking-function sets for least-fixed-point predicates plus SAT skeletons. Each pair induces a quantifier-free recursive program. Evaluation records visited predicate arguments; a recursive call is cut off when a ranking relation is violated, yielding a terminating reduction and a Boolean value (Section 7.2). Fine ranking-function sets are sufficient for soundness (Theorem 7.2).

A crucial failure mode is angelic branching: reducing a recursive formula to safety is unsound if a choice can inspect the extra history component. The paper repairs this by replacing the choice with a fresh function of the real state only (Example 7.3). MuStrat was evaluated with a 300-second timeout on 335 termCOMP C Integer benchmarks, 202 MuVal benchmarks, and 47 game-solving benchmarks. It solved 6 and 7 instances respectively that MuVal timed out on, while solving slightly fewer total instances; rpgsolve solved all but two game benchmarks. These denominators and settings are those given in Section 7.3, not percentages.

Verus form (Inference): encode recursive predicates as `spec fn`s and use explicit well-founded `decreases` measures for least fixed points. History sets must be ghost state that cannot influence angelic choices; model choices as functions of program arguments only. The paper's soundness proof assumes fineness and game semantics, so a Verus port would need lemmas establishing those assumptions.

## what is proved, measured, and trusted

Theorems prove weak/strong duality properties, witness soundness, monotonic progress, conditional termination, and MuStrat soundness. The empirical evidence is only the MuStrat comparison above; no runtime table or aggregate success fraction is reported in the extracted text, only scatter plots and solved-instance counts. The framework assumes complete lattices, monotonicity where progress is claimed, effective witness checks, and adequate expressiveness (or fineness) of candidate domains. SMT solvers, Houdini, Spacer, ranking-function synthesis, and term extraction are trusted or separately trusted components; the paper does not provide machine-checked Verus proofs.

Inference: for a product that asks agents to write verified Rust, the most transferable threat is search incompleteness rather than an unsound returned proof. A finite predicate/ranking vocabulary can cause unknown or divergence even when the Rust program is safe. Inference: the framework suggests a product architecture that stores both failed counterexamples and accumulated proof candidates, with explicit monotonicity and termination diagnostics. Existing CEGAR, ICE, Houdini, Terminator, and quantified-LRA methods already implement these patterns; VL should reuse their ideas rather than rediscover generic proof/counterexample alternation.

## techniques for the catalog

- generalized Lagrangian: encode proof/counterexample compatibility in a lattice-valued function and solve primal and dual witness problems together
- monotone primal-dual search: accumulate joins on a monotone side to avoid repeating candidates
- stratified search: order finite witness layers and always choose the smallest available layer for conditional termination
- CEGAR Lagrangian: alternate abstract error traces with predicate refinements
- ICE Lagrangian: alternate finite teacher counterexamples with learner-generated inductive invariants
- primal-dual Houdini: run symmetric Cartesian invariant searches over induction-dual systems
- ranking-function ICE: reduce ranking validation to safety and synthesize generalized measures from finite traces
- disjunctive termination CEGAR: accumulate finite sets of ranking functions defining a well-founded union
- strategy skeletons: replace infinite Skolem functions with finite term alternatives ordered by inclusion
- fixed-point primal-dual search: combine skeletons and ranking relations, with history-independent angelic choices
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
