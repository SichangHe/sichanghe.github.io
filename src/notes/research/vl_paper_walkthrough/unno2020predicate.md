# Program Verification via Predicate Constraint Satisfiability Modulo Theories
(authored by agents unless marked 🧑)
Tag: `unno2020predicate`, [paper](http://arxiv.org/abs/2007.03656v1)
## scope and contribution

Unno, Satake, Terauchi and Koskinen introduce pCSP⇓λ, a predicate constraint problem that generalizes Constrained Horn Clauses (CHCs) to arbitrary clauses, function variables and well-founded predicate variables. The paper’s abstract says: “This paper presents a verification framework based on a new class of predicate Constraint Satisfaction Problems called pCSP⇓λ.” The framework separates encoding a verification problem from solving it, and supports safety, termination, non-termination, linear-time temporal, branching-time temporal and game properties.

The modeling language µCLP permits arbitrarily nested least (`µ`) and greatest (`ν`) fixpoints. The paper reports a sound and complete reduction from µCLP validity to pCSP⇓λ satisfiability, then a stratified CounterExample-Guided Inductive Synthesis (CEGIS) solver for invariants, ranking functions and Skolem functions (§1, pp.1–2). Implementations are MuVal (µCLP validity) and PCSat (pCSP⇓λ satisfiability).

## technique: modular µCLP encoding with nested fixpoints

What it is: encode program behaviors and properties as recursive predicates with least and greatest fixpoints. The running program has nested nondeterministic loops. `I` and `J` are least-fixpoint predicates for outer and inner termination; `NP` is a greatest-fixpoint complement of an inductive strongest-postcondition predicate (§2.1, pp.2–4).

When to use it: use this when a property is naturally modular over loops, recursive calls, transition systems or temporal operators, especially when termination and non-termination must be represented together. A monolithic transition encoding can work, but loses the modular structure the paper exploits.

Steps from the paper:

1. Define a µCLP query over universally or existentially quantified program inputs (§2.1)
2. Introduce one recursive predicate per component; choose least (`=µ`) for inductive/termination facts and greatest (`=ν`) for co-inductive/non-termination facts (§2.1)
3. Encode loop transitions and nondeterministic branches in the predicate body
4. Use a co-inductive predicate such as `NP(x2,x2')` to bind a possible post-loop value (§2.1)
5. For non-termination, form the De Morgan dual with existential inputs and greatest-fixpoint predicates (§2.1)
6. Ask MuVal to solve primary and dual queries in parallel; either can be easier for branching-time verification (§2.1)

The paper’s exact explanation is: “The query formula is valid if and only if the program is always terminating for all initial integer valuations of x1 and x2 and for all internal non-deterministic choices.” (§2.1, p.3)

Verus form (Inference: µCLP is not Verus): represent a transition system as a Verus state-machine or recursive `spec fn`, state safety as an invariant, and termination with a `decreases` clause or a `proof fn` ranking lemma. Greatest-fixpoint and temporal branching semantics require an explicit ghost relation and proof obligations; they do not arise automatically from Rust recursion. Use `requires`/`ensures` and `assert` only for the supported fragment.

Limits: the encoding assumes the background theory can express the arithmetic and recursive predicates. The reduction is logical, not an executable Rust model; a mistaken transition relation proves the wrong program.

## technique: reduction from µCLP to pCSP⇓λ

What it is: eliminate fixpoints by replacing predicates with under/over-approximations, eliminate quantifiers with Skolem function variables, and add well-founded predicate variables for decreasing arguments. The resulting constraints are arbitrary clauses over predicate, ordinary function and well-founded predicate variables (§2.2, §4–§5).

For the termination example, the reduction introduces `I`, `J`, `NP` predicate variables and well-founded relations `I⇓` and `J⇓`; clauses require preservation and strict descent along each recursive transition (displayed equations (1)–(4), §2.2, p.4). The paper states: “We will present a sound and complete reduction from µCLP validity to pCSP⇓λ satisfiability in Section 5.” (§2.2, p.4)

Steps:

1. Translate each least-fixpoint predicate to an inductive invariant variable and each greatest-fixpoint predicate to a co-inductive approximation (§5)
2. Replace quantified witnesses by Skolem function variables (§1, §5)
3. Introduce a well-founded relation variable for every recursive descent obligation (§2.2)
4. Generate clause constraints requiring the approximations to imply the original query and to be closed under transitions (§5)
5. Solve the resulting pCSP⇓λ instance; satisfiability supplies witnesses, while unsatisfiability refutes the query (§1)

Verus form (Inference): the invariant variables become `spec fn` predicates and proof lemmas; Skolem witnesses become ghost/spec functions with `ensures`; ranking relations become `decreases` expressions or well-founded ghost relations. Verus does not expose arbitrary predicate variables or a generic fixpoint reduction, so a tool would need to generate Rust proof scaffolding and then ask Verus to check each clause.

## technique: stratified CEGIS

What it is: alternate synthesis of candidate functions/predicates from bounded template families with validation by an SMT solver. Failed candidates produce examples retained for later iterations. The paper emphasizes that stratification avoids overfitting while giving relative completeness: “Stratified CEGIS combines CEGIS with stratified families of templates ... to achieve relative completeness, a theoretical guarantee of convergence, and a faster and stable convergence by avoiding the overfitting problem of expressive templates to counterexamples.” (§1, p.2)

Apply it as follows:

1. Initialize finite template bounds for each predicate, ordinary function and ranking-function variable (§6.2.2, pp.17–18)
2. Synthesis: use an SMT solver for quantifier-free linear integer/rational arithmetic to find parameters satisfying accumulated examples and template constraints (§6.2.2)
3. Substitute the candidate into all pCSP clauses and validate satisfiability with an SMT solver (§1, §6)
4. If valid, return the witness substitution; if invalid, extract a counterexample instance and add it to the example set (§1, §6.1)
5. If no candidate fits current templates, enlarge template parameters fairly so every parameter is eventually increased (§6.2.2)
6. Repeat until a candidate validates or examples become unsatisfiable, which concludes invalidity (§1)

Template families include Boolean/predicate templates, piecewise affine functions and lexicographic piecewise affine ranking relations. A ranking template asserts non-negativity, coverage of discriminators and strict/non-strict decrease for lexicographic components (§6.2.1, pp.17–18).

Verus form (Inference): generate candidate `spec fn` invariants and `proof fn` lemmas from a bounded grammar, then invoke Verus as the validator. Counterexamples can be represented as additional `assert` obligations or test states. Verus’s `decreases` is the closest direct ranking mechanism; arbitrary CEGIS orchestration remains external. Do not mark a generated candidate `external_body` because that would remove the proof obligation.

Evidence: Theorem 6.1 gives relative completeness: if a syntactic solution lies in some template family, a solution is eventually found (§6.2.2, p.18). This is conditional on the template enumeration and solver assumptions, not a termination guarantee for all CEGIS runs. The paper explicitly notes that CEGIS may diverge in general (§6, p.16).

## technique: unsat-core-directed template growth

When the current template constraints have no solution, PCSat analyzes an SMT unsat core to identify the involved function/predicate variables and increases their parameters, while bounding differences between updates (§6.2.3, p.18). This focuses growth instead of expanding every template. In Verus (Inference), a synthesis front end could map failed solver cores to candidate lemma grammar dimensions, but Verus itself does not expose this PCSat template API.

## technique: primal-dual checking

MuVal solves a µCLP query and its De Morgan dual in parallel. The paper reports that this is especially useful for branching-time temporal verification because one side is often easier (§2.1, p.4). For the termination example, the primary proves universal termination; the dual seeks an existential non-termination witness. Inference: a Verus tool could generate both an invariant proof and a counterexample/refutation model, but a single Verus verification run does not automatically provide dual temporal semantics.

## evaluation and failures

PCSat supports Booleans and quantifier-free linear inequalities over integers/rationals; it is implemented in OCaml with Z3 and MiniSat (§7, p.19). On 127 SyGuS-Comp 2018 invariant instances, stratified PCSat solves 113 SAT and 8 UNSAT cases; LoopInvGen solves 116 SAT and 5 UNSAT; HoIce 109 SAT, 9 UNSAT and 2 wrong answers; SPACER 101 SAT and 9 UNSAT (§7, p.19). These counts sum to each tool’s solved outcomes, with the denominator 127 shown in Figure 1.

On CHC-COMP 2019 LIA-nonlin, PCSat solves 97 SAT and 55 UNSAT, while HoIce solves 123 SAT and 79 UNSAT and SPACER 147 SAT and 117 UNSAT (§7, p.19). PCSat is slower partly because it does not use incremental SMT solving. It often fails on multiple Boolean variables because it naively generates `2^n` template copies, and it is not tuned for unsatisfiability in the Horn subclass (§7).

MuVal solves 76 VALID and 72 INVALID of 159 µCLP instances; Mu2CHC solves 74 VALID and 74 INVALID (§7, pp.19–20). MuVal fails five temporal benchmarks solved by Mu2CHC; Mu2CHC fails five termination benchmarks requiring piecewise or lexicographic ranking functions. The paper attributes this to different synthesis architecture, not to a universal superiority.

Fixed template families expose an expressiveness/generalization trade-off: Polyhedron templates overfit and Interval templates underfit relative to stratified families (§7, p.20). The time limit is 300 seconds on a 3.1 GHz Xeon with 32 GiB RAM (§7, p.19); no result establishes unbounded convergence in practice.

## what is proved, trusted, and relevant to VL

The reduction and CEGIS theorems are mathematical claims in the paper; PCSat/MuVal experimentally validate selected instances. A successful result depends on the µCLP encoding, template grammar, SMT/SAT solvers, implementation, arithmetic theory and timeout. The framework does not prove the correctness of a Rust implementation, the adequacy of a specification, or external libraries and hardware.

Inference: threat to agent-written verified Rust is medium to high for invariant and termination automation. The modular encoding, ranking templates and counterexample loop are directly useful for generating Verus `spec fn` invariants and `decreases` proofs. However, arbitrary fixpoints and temporal properties require a new Rust model layer. Existing PCSat already covers CEGIS invariant/ranking synthesis; VL should not claim those algorithms as novel without a Rust/Verus-specific integration and measurements.

## techniques for the catalog

- modular µCLP fixpoint encoding — express termination, non-termination and temporal properties with nested least/greatest predicates
- µCLP-to-pCSP reduction — replace fixpoints, quantifiers and recursion with predicate/function/well-founded clause variables
- stratified CEGIS — synthesize candidates from expanding template families and validate them with SMT counterexamples
- ranking-function templates — use piecewise affine and lexicographic well-founded relations for termination
- unsat-core template growth — increase only template parameters implicated by unsatisfiable cores
- primal-dual solving — solve a query and its De Morgan dual concurrently
Checked 2026-10-13: audit record unno2020predicate; paper-study comparison complete; gate executed; experiments not rerun
