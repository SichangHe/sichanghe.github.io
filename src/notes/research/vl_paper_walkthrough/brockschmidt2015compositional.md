# Compositional Safety Verification with Max-SMT
(authored by agents unless marked 🧑)
Tag: `brockschmidt2015compositional`, [paper](http://arxiv.org/abs/1507.03851v3)
## paper and central method

Brockschmidt, Larraz, Oliveras, Rodríguez-Carbonell, and Rubio present a bottom-up compositional safety analysis for sequential programs. For one program component and a target postcondition, it synthesizes a conditional inductive invariant and a precondition using Max-SMT. The precondition is propagated to predecessor components as their postcondition. The abstract states: “We present an automated compositional program verification technique for safety properties based on conditional inductive invariants.” (Abstract, p.1). Page numbers in this study are those of the 9-page arXiv v3 PDF.

A conditional invariant need not hold on every entry; it must be inductive once its condition holds. This lets the solver discover useful intermediate contracts without forcing each component's invariant to hold from all initial states. The paper's method works over integer programs represented as control-flow graphs (CFGs), with linear inequality templates and quantifier-free integer linear/nonlinear arithmetic (§III, pp.2–3).

## technique: conditional inductive invariants

what it is

For a component `C`, a map `Q` from locations to formulas is conditional inductive when every transition preserves `Q` whenever `Q` holds at its source. A conditional invariant plus a condition at an entry transition implies the target assertion. The paper defines conditional safety as follows: “The program P is (t̃, ϕ̃)-conditionally safe for the assertion (t, ϕ) if for any evaluation that contains →t̃ (ℓ̃, ṽ) →∗P (ℓ̄, v̄) →t (ℓ, v), we have ṽ |= ϕ̃ implies that v |= ϕ.” (Definition 1, §IV, p.3)

when to use it

Use this abstraction when a component's safety depends on a precondition that can be established by earlier code. The paper's motivation is that whole-program invariant construction is “sometimes infeasible or undesirable in practice” (§IV, p.3). The target assertion must be a single clause; a CNF postcondition is handled one conjunct at a time (§IV-A, p.3).

how to do it

1. Represent each component as an SCC of the CFG and identify its entry transitions and an exit assertion `(texit, ϕ)` (§IV, §IV-A, p.3)
2. Choose a template `Iℓ,k` at each location: a conjunction of `k` linear inequalities over program variables (§IV-A, p.4)
3. Generate hard consecution constraints (`I ∧ transition ⇒ I'`) and hard safety constraints (`I ∧ exit ⇒ ϕ'`) (§IV-A, Fig. 6, p.4)
4. Make initiation constraints soft, allowing the synthesized invariant to require a precondition at each component entry (§IV-A, p.4)
5. Solve for template coefficients; instantiate `Q` from the model and use `Q` at each entry as a precondition (§IV-A, Algorithm 1, p.4)

The paper's example loop `while i > 0: x := x + 5; i := i − 1` obtains `Q1 = x + 5·i ≥ 0` for an `x ≥ 0` assertion (Fig. 1, pp.1–2). This relation is a precondition at loop entry, not a claim that every arbitrary entry state is safe.

Verus form (inference)

Inference: In Verus, encode `Q` as a `spec fn` over the loop state, put it in `invariant(...)`, and prove entry, preservation, and exit obligations with proof lemmas. Conditional entry facts become a caller `requires` clause or a lemma precondition. Verus does not synthesize linear templates through Max-SMT as part of the language; an external synthesizer would need to emit and then prove the chosen invariant.

evidence and limits

The local correctness theorem says: “If the procedure call CondSafe(C, EC , (texit , ϕ)) returns Q = 6 None, then Q is a conditional inductive invariant for C and P is (t, Q(ℓ′ ))-conditionally safe for (texit , ϕ) for all t = (ℓ, τ, ℓ′ ) ∈ EC .” (Theorem 1, §IV-A, p.4) The proofs are in Appendix A (p.9). Inference: this guarantee is conditional on the arithmetic solver and the template theory, and linear templates cannot express arbitrary heap, array, or nonlinear invariants without extensions; the paper lists arrays and the heap as future work (§VII, p.8).

## technique: Max-SMT hard/soft synthesis

what it is

Max-SMT combines Max-SAT and SMT: it seeks a model of the hard clauses that maximizes the total weight of satisfied soft clauses (§III.1, p.2). The paper works over quantifier-free integer linear or polynomial arithmetic. Hard clauses (consecution, safety) enforce soundness; soft initiation clauses make the solver prefer solutions that require fewer preconditions. The paper explains: “Thus, any solution to these constraints is a conditional inductive invariant implying our assertion.” (§IV-A, p.4)

how to do it

1. For each location `ℓ` and conjunct `j`, create `Iℓ,j,k(V) = iℓ,j + Σv iℓ,j,v·v ≤ 0` with fresh template variables (§IV-A, p.4)
2. Encode initiation, consecution, and safety as arithmetic implications (§IV-A, Fig. 6, p.4)
3. Mark consecution and safety hard; mark each initiation condition soft with the weight ωI (§IV-A, p.4)
4. Apply Farkas' lemma locally to the subformulas to transform implications into constraints over template variables, adding weights on the resulting constraints (§IV-A, footnote 8, p.4; Farkas' lemma is introduced in §III.4, p.3)
5. Ask Max-SMT for a model maximizing satisfied soft weights; use the model's coefficients as the invariant (§IV-A, Algorithm 1, p.4)
6. Try `k = 1, 2, …` conjuncts until a model is found or `MAX_CONJUNCTS` is reached (Algorithm 1, p.4)

Verus form (inference)

Inference: The equivalent Verus workflow is to generate candidate linear predicates externally, then check them with `assert forall` or lemma proofs and place the successful predicate in `invariant(...)`. Max-SMT weights can prioritize candidates that minimize caller assumptions, but the final Verus proof must establish the exact predicate.

limits

The prototype sets `MAX_CONJUNCTS` to 3 (§IV-A, p.4), so failure may reflect a template bound rather than an unsafe program. Equal initiation weights are used in VeryMax; the appendix says changing them biases which initiation conditions are favored (Appendix B, p.9). The conclusion says the authors want to “consider more expressive theories to model program features such as arrays or the heap” (§VII, p.8).

## technique: bottom-up propagation over SCCs

what it is

The CFG's SCC condensation is a DAG. The analysis starts with a user assertion, synthesizes entry preconditions for its component, and recursively proves those preconditions in predecessor components. The authors state: “The key to the precision of our approach is our treatment of failed proof attempts.” (§IV-B, p.4)

how to do it

1. Start `CheckSafe` at the target assertion; it returns `Safe` at once if the exit transition already implies `ϕ'`, and `Maybe` if the exit transition leaves the start location (Algorithm 2, lines 2–3, p.5)
2. Run `CondSafe` on the target SCC (return `Maybe` if it returns `None`); for each entry transition and each literal of the resulting invariant at the entry target, recursively call `CheckSafe` on the predecessor component (§IV-B, Algorithm 2, lines 4–9, p.5)
3. Return `Safe` only if every recursive call succeeds (Algorithm 2, lines 10–11, p.5)
4. Otherwise narrow: conjoin each entry transition with the negation of the conjunction of those literals whose recursive call returned `Maybe`, and conjoin each component transition with `¬Q(ℓ)` and `¬Q(ℓ')'` (Algorithm 2, lines 13–14, p.5)
5. Re-run `CheckSafe` on the narrowed component, thereby obtaining another disjunct of a conditional invariant (Algorithm 2, line 15, p.5)

The paper's two-loop example first obtains `Q1 = x + 5·i ≥ 0`, then propagates it backward and obtains `Q2 = j ≥ 0 ∧ x + 5·(i+j) ≥ 0` (§II-b, p.2). Inference: this is an explicit example of an implicit contract between components.

Verus form (inference)

Inference: Model each SCC boundary as a Verus function or proof lemma with an `ensures` summary. Prove the callee summary first, then use it as a `requires` fact for predecessor proofs. Verus modules can encode this decomposition, but `Safe`/`Maybe` recursion and SCC discovery would be an external orchestration layer.

evidence and theorem

The global theorem states: “Let P be a program, C a component and EC its entries. Given an assertion (texit , ϕ) such that texit is an exit transition of C and ϕ is a clause, if CheckSafe(P, C, EC , (texit , ϕ)) = Safe, then P is safe for (texit , ϕ).” (Theorem 2, §IV-B, p.5) Inference: a `Maybe` result is inconclusive, not evidence of unsafety; Algorithm 2 returns only `Safe` or `Maybe` and never reports a violation.

## technique: narrowing failed attempts into disjunctive proofs

what it is

When a synthesized conditional invariant cannot be established at a predecessor, narrowing removes states already shown safe. For an entry transition, the algorithm conjoins the negation of the unproved invariant literals; for component transitions it conjoins `¬Q(source) ∧ ¬Q(target)'`. Repeating this process can produce disjunctive conditional invariants.

how to do it

1. Keep each literal of `Q(ℓ')` as a separate assertion (§IV-B, p.4)
2. Identify recursive calls returning `Maybe` (§IV-B, Algorithm 2, p.5)
3. Narrow each entry transition by conjoining the negation of the conjunction of the literals that returned `Maybe`; with more than one such literal “the negation is a disjunction, which in our program model implies splitting transitions” (§IV-B, p.5)
4. Narrow component transitions with `¬Q(ℓ) ∧ ¬Q(ℓ')'` (§IV-B, Algorithm 2, line 14, p.5)
5. Reinvoke `CheckSafe` on the narrowed component; each result of `CondSafe` is one disjunct (§IV-B, p.5)

The running example starts with `y < x`, fails to prove it in a predecessor, narrows, and then finds `x < y`; propagating that result eventually proves the top-level assertion (Example 2, §IV-B, p.5; the simpler Fig. 3/Fig. 4 version with `x > y` then `x < y` is in §II-c, p.2). The paper cautions that “not all disjunctive invariants can be discovered like this” because each intermediate result must remain inductive (§IV-B, p.5).

Verus form (inference)

Inference: In Verus, represent each disjunct as a separate lemma or a boolean predicate and prove that the disjunction covers the reachable cases. Narrowing is a proof-search transformation, not a Verus runtime operation; the final Rust code should not silently add assumptions that were never proved.

## technique: engineering the search

The paper says none of its performance techniques influences the precision of the overall framework (§IV-C, p.5) and presents five, a) to e), the last of which is not implemented. First, assign Max-SMT weights so solutions implying the postcondition are preferred over solutions that disable transitions (§IV-C-a, pp.5–6). Second, memoize unsuccessful `CheckSafe` calls; because `Maybe` means the method cannot prove that assertion, repeated identical calls can be skipped; the paper's memoization of failed attempts is local to the initial `CheckSafe` call (§IV-C-b, p.6). Third, after a successful recursive call without narrowing, strengthen the corresponding transition with the proven fact so later synthesis can use it (§IV-C-c, p.6). The authors warn that if a transition was obtained through repeated narrowing, “one needs to split transitions, and it is not correct to just add ϕ′ to t” (§IV-C-c, p.6).

Fourth, parallelize by trying different conjunct counts in `CondSafe` simultaneously and parallelizing recursive `CheckSafe` calls (§IV-C-d, p.6). Other parallelization directions (returning several invariants in parallel, look-ahead) are not implemented (§IV-C-d, p.6). The implementation's sequential and parallel variants are VeryMax-Seq and VeryMax-Par (§VI, p.7). The paper also describes storing successful invariants for incremental re-analysis after a component changes, but says this iterative-proving technique “has not been implemented yet” (§IV-C-e, p.6).

Verus form (inference)

Inference: These optimizations map to caching successful Verus proof summaries, running independent proof obligations in parallel, and rechecking only changed modules. Cache invalidation must account for changed contracts and dependencies; the paper's unimplemented iterative proving is a design idea, not evidence of a working Verus workflow.

## evaluation and denominators

VeryMax is an early prototype using the Max-SMT solver for non-linear arithmetic in the Barcelogic system (§VI, p.7). The first set, HOLA-BENCHS, is the 46 programs from the safety-prover evaluation in Dillig et al. (the paper's [27]); they have 17 to 71 lines of code and 1 to 4 nested or consecutive loops, and “All of them are safe” (§VI, p.7). On this set, VeryMax-Seq proves 44/46 assertions with 2 fails and no timeouts; VeryMax-Par proves 45/46 with 1 fail and no timeouts. Table I reports total times of 343.83 s and 151.21 s respectively. CPAchecker sv-comp15 proves 33/46 (3 fail, 10 timeouts); CPAchecker predicateAnalysis proves 25/46 (11 fail, 10 timeouts); SeaHorn proves 32/46 (13 fail, 1 timeout); HOLA proves 43/46 (0 fail, 3 timeouts) (Table I, p.8). The HOLA row was taken from [27], where the experiments ran on an Intel i5 2.6 GHz CPU with 8 GB of memory; the paper ran the other tools on a 4-core machine “with the same specification” and a 200-second timeout (§VI, p.7). These are counts over the 46-program denominator; “Fail” and “TO” are separate columns. The authors say the parallel version “was two times faster than our sequential one on four cores” (§VI, p.7).

The second set, NR-BENCHS, is much larger: integer abstractions of 217 numerical algorithms from Numerical Recipes in C++, with two array-bounds safety problems per array access, for 6452 problems of up to 284 lines of C code; because of the abstraction “some assertions may not hold” (§VI, p.7). Table II reports VeryMax-Seq safe on 6,105 instances, unsafe on 0, fail on 326, and timeout on 21; VeryMax-Par safe on 6,106, unsafe on 0, fail on 346, and timeout on 0 (Table II, p.8). The row totals are 6,452 for each (6,105+0+326+21 and 6,106+0+346+0). SeaHorn reports 6,077 safe, 233 unsafe, 80 fail, and 62 timeout, totaling 6,452; CPAchecker sv-comp15 reports 5,570 safe, and predicateAnalysis 5,928 safe. Inference: VeryMax's zero unsafe column follows from CheckSafe returning only `Safe` or `Maybe`. The paper does not say how many NR-BENCHS instances are actually safe, so “safe” is a tool result for a benchmark instance, not a universal correctness rate.

The authors say that on NR-BENCHS “many examples are solved very quickly in the sequential solver already, and thus do not profit from our parallelization” and that slicing techniques are not yet implemented (§VI, p.7). These NR-BENCHS experiments used an 8-core Intel i7 3.4 GHz machine with 16 GB RAM and a 300-second limit (§VI, p.7), so timings across the two benchmark sets and across the HOLA row are not one uniform hardware setting.

## techniques for the catalog

- conditional inductive invariant — synthesize a predicate that is inductive under an explicit entry condition
- Max-SMT template solving — use hard consecution/safety constraints and weighted soft initiation constraints
- bottom-up SCC propagation — turn each component's inferred precondition into a predecessor postcondition
- narrowing after failure — remove states already covered by successful conditional invariants and search another disjunct
- compositional CheckSafe — return `Safe` only after recursively proving all component-entry obligations
- proof-search memoization — cache failed `CheckSafe` calls (local to the initial call) to avoid repeated analysis; proven results instead strengthen the program
- parallel and incremental analysis — try template sizes and independent SCC obligations concurrently (implemented); reuse stored invariants after changes (described, not implemented)
