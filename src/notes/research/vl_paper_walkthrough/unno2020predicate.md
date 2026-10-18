# Program Verification via Predicate Constraint Satisfiability Modulo Theories
(authored by agents unless marked 🧑)
Tag: `unno2020predicate`, [paper](http://arxiv.org/abs/2007.03656v1)
## scope and contribution

Unno, Satake, Terauchi and Koskinen introduce pCSP⇓λ, a predicate constraint problem that generalizes Constrained Horn Clauses (CHCs) to arbitrary clauses, function variables and well-founded predicate variables. The abstract begins: “This paper presents a verification framework based on a new class of predicate Constraint Satisfaction Problems called pCSP⇓λ”. The framework separates generating constraints from solving them (§1, p.1). The paper says it covers termination/non-termination, linear-time and branching-time temporal verification (full modal mu-calculus model checking) (§1, p.2), plus bisimulation and infinite-state games (Appendix A, pp.25–29). Its benchmarks are modal mu-calculus, CTL*, CTL, LTL, termination and safety problems (§1, p.2).

The modeling language µCLP is CLP extended with arbitrarily nested inductive (`µ`) and co-inductive (`ν`) predicates (§3). The paper gives a sound and complete reduction from µCLP validity to pCSP⇓λ satisfiability (Theorem 5.2, p.14), then a stratified CounterExample-Guided Inductive Synthesis (CEGIS) solver for (co-)inductive invariants, ranking functions and Skolem functions (§6). The tools are MuVal (µCLP validity checker, built on the reduction) and PCSat (pCSP⇓λ satisfiability checker) (§7, p.18).

## technique: modular µCLP encoding with nested fixpoints

What it is: encode program behaviors and properties as mutually recursive predicates with least and greatest fixpoints. The running example is a program with an outer loop containing a nondeterministic inner loop (§2.1, p.3). In the termination encoding Pterm, `I` and `J` are least-fixpoint predicates that "characterize the weakest pre-conditions for the termination of the outer and the inner loops" (p.3). `NP` is a greatest-fixpoint predicate: the complement of the inductive predicate `P`, which characterizes the strongest post-condition of the inner loop (p.3).

When to use it (Inference): use this when a property is naturally modular over loops, recursive calls, transition systems or temporal operators. The paper says a monolithic encoding with only least fixpoints is possible, but that the µCLP encoding is more modular and natural (§2.1, p.3).

Steps from the paper's example (§2.1, pp.3–4):

1. Write a query over universally quantified inputs: `∀x1,x2:int. I(x1,x2)`.
2. Define one recursive predicate per component of the program: `I` (outer loop) and `J` (inner loop) with `=µ`; `P` (strongest post-condition of the inner loop) with `=µ`, used through its complement `NP` with `=ν`.
3. Encode loop transitions and nondeterministic branches in the predicate bodies (for `I`: either the inner loop is entered and the outer counter decreases, or `x2` decreases).
4. Use `NP(x2,x2')` inside `I` to bind `x2'` to a possible value of x2 when the inner loop terminates.
5. For non-termination, take the De Morgan dual Pnterm: query `∃x1,x2:int. NI(x1,x2)`, with `NI`, `NJ` greatest-fixpoint and `P` least-fixpoint predicates (p.4).
6. MuVal tries "to solve the primary Pterm and the dual Pnterm in parallel" (p.4).

The paper's explanation is: “the query formula is valid if and only if the program is always terminating for all initial integer valuations of x1 and x2 and for all internal non-deterministic choices.” (§2.1, p.3)

Verus form (Inference: µCLP is not Verus): represent a transition system as a Verus state machine or recursive `spec fn`, state safety as an invariant, and termination with a `decreases` clause or a `proof fn` ranking lemma. Greatest-fixpoint and branching-time semantics would need an explicit ghost relation and proof obligations; they do not arise from Rust recursion. Use `requires`/`ensures` and `assert` only for the supported fragment.

Limits (Inference): the encoding assumes the background theory can express the arithmetic and recursive predicates, and a mistaken transition relation proves the wrong program. The paper does not discuss executable Rust models.

## technique: reduction from µCLP to pCSP⇓λ

What it is: `reduct(ϕ,P)` is defined as `elim∃`, then `elimµ`, then `elimν` (§5, p.12). The output is a set of clauses over predicate, ordinary function and well-founded predicate variables. Theorem 5.2: "reduct(ϕ, P) has a semantic solution if and only if |= (ϕ, P)." (p.14)

For the termination example, the reduction yields the clauses (1)–(4) over `I`, `J`, `NP` and well-founded variables `I⇓`, `J⇓` (§2.2, p.5). PCSat finds a satisfying assignment, with `I⇓` induced by the lexicographic ranking function λ(x1,x2).(x1, x1+x2) and `J⇓` by a piecewise-defined ranking function (p.5). The non-termination pCSP⇓λ for Pnterm is unsatisfiable (p.5). The paper states: “We will present a sound and complete reduction from µCLP validity to pCSP⇓λ satisfiability in Section 5.” (§2.2, p.4)

Steps (§5, pp.12–14):

1. `elim∃`: Skolemize positive existential quantifiers and negative universal quantifiers with fresh function variables. The query is first normalized so that (co-)inductive predicates occur only positively, by replacing negative occurrences with the predicate of the De Morgan dual program.
2. `elimµ`: replace inductive (`µ`) equations by co-inductive (`ν`) ones, processing the right-most inductive predicate `X` first. Generate a fresh well-founded predicate variable `X⇓`, and guard each recursive call `X(t)` in the body of `X` with `X(t) ∧ X⇓(x,t)`. Other co-inductive predicates `Xi` get extra arguments: a Boolean `bi` and arguments `x` of the sorts of `X`'s arguments, so that the well-founded relation can relate the arguments of the earlier call to `X` with those of an indirect recursive call (with dummy values when no earlier call exists).
3. `elimν`: replace each co-inductive predicate `X` by a fresh predicate variable representing an under-approximation, add the clause `X(x) ⇒ ϕ'` for each equation `X(x) =ν ϕ'`, and convert to prenex conjunctive normal form (`cnf`).
4. Return the clauses and the set `R` of well-founded predicate variables. The pCSP⇓λ is satisfiable exactly when the µCLP query is valid (Theorem 5.2, via Lemmas 5.3–5.6).

The paper says its MuVal implementation suppresses unnecessary extra arguments (Remark 3, p.14). For validity-reducible (all `ν`, positivity conditions, Remark 2, p.10) µCLP the reduction gives co-CHCs, which can be turned into CHCs for off-the-shelf CHC solvers (Remark 4, p.15).

The paper gives only brief justifications for the lemmas in the main text; the appendix contains encodings, not proofs.

Verus form (Inference): the invariant variables become `spec fn` predicates and proof lemmas; Skolem witnesses become ghost/spec functions with `ensures`; ranking relations become `decreases` expressions or well-founded ghost relations. Verus does not expose arbitrary predicate variables or a generic fixpoint reduction, so a tool would need to generate Rust proof scaffolding and then ask Verus to check each clause.

## technique: stratified CEGIS

What it is: alternate synthesis of candidate functions/predicates from bounded template families with validation by an SMT solver. Failed candidates produce examples retained for later iterations. The paper emphasizes that stratification avoids overfitting while giving relative completeness: “Stratified CEGIS combines CEGIS [Solar-Lezama et al. 2006] with stratified families of templates [Jhala and McMillan 2006; Terauchi and Unno 2015] to achieve relative completeness, a theoretical guarantee of convergence, and a faster and stable convergence by avoiding the overfitting problem of expressive templates to counterexamples [Padhi et al. 2019].” (§1, p.2)

Apply it as follows (§6, p.15; §6.2.2, p.18):

1. Start with example set E(1) = ∅ and small initial template parameters (§6, §6.2.2).
2. Synthesis phase: check whether the example instances are unsatisfiable; if so, return them as a counterexample to the input. Otherwise let the synthesizer find a candidate solution of the examples. For quantifier-free linear integer arithmetic this uses an SMT solver to find template parameters satisfying the examples and the template constraints (§6.2.2, p.18).
3. Validation phase: check with an off-the-shelf SMT solver whether the candidate is a genuine solution of all clauses; if so, return it (§6, p.15).
4. Otherwise, for each unsatisfied clause obtain a term substitution falsifying it, instantiate the clause, and add it to the examples (§6, p.15).
5. If no candidate exists within the current templates, update the template parameters upward in a fair manner (every parameter is updated infinitely often); the parameters to update are chosen from an unsat core (§6.2.2–6.2.3, p.18).
6. Repeat. Unsatisfiability of example instances without well-founded variables is decided by a SAT/SMT solver. With well-founded variables, §6.1 (p.16) uses an iterative algorithm that enumerates simple cycles of the candidate relation and adds learnt clauses.

PCSat also implements a third "resolution phase" (unit propagation and resolution on examples) to speed convergence (Remark 5, p.15).

Template families (§6.2.1, pp.17–18): ordinary predicates use disjunctions (`nd`) of conjunctions (`nc`) of linear inequalities with bounded coefficients. Non-predicate functions use piecewise-defined affine functions with discriminators. Well-founded predicates use relations induced by lexicographic piecewise-defined affine ranking functions: the first conjunct asserts non-negativity of all ranking values, the second that the discriminators cover the states, and the third strict or non-strict decrease per lexicographic component.

Verus form (Inference): generate candidate `spec fn` invariants and `proof fn` lemmas from a bounded grammar, then invoke Verus as the validator. Counterexamples can be represented as additional `assert` obligations or test states. Verus's `decreases` is the closest direct ranking mechanism; arbitrary CEGIS orchestration remains external. Do not mark a generated candidate `external_body` because that would remove the proof obligation.

Evidence: Theorem 6.1 (p.18): "if there is p and σ ∈ ⟦p⟧ such that σ is a syntactic solution of the given pCSP⇓λ (C, R), a syntactic solution σ′ of (C, R), which could be different from σ, is eventually found by the procedure." This is relative completeness with respect to the template families. The paper notes: “In general, the above CEGIS procedure may diverge, which is inevitable due to the undecidability of pCSP⇓λ.” (§6, p.15)

## technique: unsat-core-directed template growth

When the current template constraints have no solution, PCSat analyzes the unsat core to obtain the parameters that caused the failure. Because function/predicate variables may depend on each other, the analysis "enumerates all the involved function/predicate variables" and increments the parameters of their templates "in a fair manner, by limiting the maximum differences between different parameters to some finite threshold" (§6.2.3, p.18). Inference: this focuses growth on the implicated templates instead of all templates. In Verus (Inference), a synthesis front end could map failed solver cores to dimensions of a lemma grammar, but Verus does not expose this PCSat template API.

## technique: primal-dual checking

MuVal solves a µCLP query and its De Morgan dual in parallel. The paper says: "The primal-dual approach turns out to be particularly useful for branching-time temporal verification where we found either the primary or the dual is often easier to solve than the other" (§2.1, p.4). For the termination example, the primary query proves universal termination and the dual seeks an existential non-termination witness. Inference: a Verus tool could generate both an invariant proof and a counterexample/refutation model, but a single Verus verification run does not provide dual temporal semantics. Separately, §6.1 (p.16) notes that with well-founded variables there is in general no finite witness of unsatisfiability, and says this supports the primal-dual approach.

## evaluation and failures

PCSat supports Booleans and the quantifier-free theory of linear inequalities over integers/rationals; the tools are implemented in OCaml with Z3 and MiniSat (§7, p.18). Experiments ran on a 3.1GHz Intel Xeon Platinum 8000 CPU with 32 GiB RAM and a 300 second time limit (§7, p.19).

On the 127 SyGuS-Comp 2018 Invariant Track instances (Figure 1 axis "of 127"), stratified PCSat solved 113 SAT and 8 UNSAT; LoopInvGen 116 SAT and 5 UNSAT; HoIce 109 SAT, 9 UNSAT and 2 wrong answers; SPACER 101 SAT and 9 UNSAT (§7, p.19). The paper says PCSat "is often slower compared to the other mature tools", partly because it does not use incremental SMT solving across CEGIS iterations.

On CHC-COMP 2019 (LIA-nonlin), PCSat solved 97 SAT and 55 UNSAT, HoIce 123 SAT and 79 UNSAT, SPACER 147 SAT and 117 UNSAT (§7, p.19). The paper says PCSat often failed on CHCs with multiple Boolean variables because it "naively generates 2n-copies of templates over integer variables for each Boolean valuation", and that it is "not well-tuned for proving the unsatisfiability" of CHCs (p.19).

MuVal solved 76 VALID and 72 INVALID of 159 µCLP instances, and Mu2CHC 74 VALID and 74 INVALID (§7, p.20). MuVal failed on 5 temporal verification benchmarks from (c2) and (d) that Mu2CHC solved; Mu2CHC failed on 5 termination benchmarks that MuVal solved, which require piecewise-defined and/or lexicographic affine ranking functions (p.20). The paper's stated beliefs: MuVal's failures are due to Mu2CHC's highly tuned invariant synthesis engines (SPACER and HoIce); Mu2CHC's failures show a limitation of separately synthesizing termination arguments and invariants.

Fixed template families (Interval, Octagon, Octahedron, Polyhedron) did "significantly worse" than stratified templates; Polyhedron and Interval did even worse than Octahedron and Octagon (§7, pp.19–20). The paper believes Polyhedron templates overfit and Interval templates lack expressiveness (p.20).

## what is proved, trusted, and relevant to VL

The paper states Theorem 5.2 (reduction soundness and completeness) and Theorem 6.1 (relative completeness) as mathematical claims; the main text gives only brief justifications for the supporting lemmas. Empirical results are the benchmark counts in §7. Inference: a successful result depends on the µCLP encoding, template grammar, SMT/SAT solvers, implementation, arithmetic theory and timeout. The framework does not prove the correctness of a Rust implementation or the adequacy of a specification.

Inference: threat to agent-written verified Rust is medium to high for invariant and termination automation. The modular encoding, ranking templates and counterexample loop are directly useful for generating Verus `spec fn` invariants and `decreases` proofs. However, arbitrary fixpoints and temporal properties require a new Rust model layer. Existing PCSat already covers CEGIS invariant/ranking synthesis; VL should not claim those algorithms as novel without a Rust/Verus-specific integration and measurements.

## techniques for the catalog

- modular µCLP fixpoint encoding — express termination, non-termination and temporal properties with nested least/greatest predicates
- µCLP-to-pCSP reduction — replace fixpoints, quantifiers and recursion with predicate/function/well-founded clause variables
- stratified CEGIS — synthesize candidates from expanding template families and validate them with SMT counterexamples
- ranking-function templates — use piecewise affine and lexicographic well-founded relations for termination
- unsat-core template growth — increase only template parameters implicated by unsatisfiable cores
- primal-dual solving — solve a query and its De Morgan dual concurrently
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Templates can effectively restrict the solution space to explore and be made to satisfy the well-foundedness constraints at the same time."): read the paper text from line 1 to the end, including the appendix, and checked every quotation, number, section and page reference and the technique steps in the study; I rewrote the reduction steps to match elim∃/elimµ/elimν, fixed the capitalization of one quotation, corrected page references (equations (1)–(4) are on p.5, the CEGIS divergence sentence on p.15, the implementation sentence on p.18), replaced the stratified CEGIS step references, removed a vague sentence about evaluation counts and an unsupported claim about the paper's attribution of results, and marked own conclusions as Inference; I did not check the cited prior work, the Verus mappings (own inferences), the Figure 1 plots beyond the stated counts, or run the tools.
