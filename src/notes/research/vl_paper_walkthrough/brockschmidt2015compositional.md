# Compositional Safety Verification with Max-SMT
(authored by agents unless marked 🧑)
Tag: `brockschmidt2015compositional`, [paper](http://arxiv.org/abs/1507.03851v3)
## paper and central method

Brockschmidt, Larraz, Oliveras, Rodríguez-Carbonell, and Rubio present a bottom-up compositional safety analysis for sequential programs. For one program component and a target postcondition, it synthesizes a conditional inductive invariant and a precondition using Max-SMT. The precondition is propagated to predecessor components as their postcondition. The abstract states: “We present an automated compositional program verification technique for safety properties based on conditional inductive invariants.” (Abstract, p.1)

A conditional invariant need not hold on every entry; it must be inductive once its condition holds. This lets the solver discover useful intermediate contracts without forcing each component's invariant to hold from all initial states. The paper's method works over integer programs represented as control-flow graphs (CFGs), with linear inequality templates and quantifier-free linear/nonlinear arithmetic (§III, pp.2–3).

## technique: conditional inductive invariants

what it is

For a component `C`, a map `Q` from locations to formulas is conditional inductive when every transition preserves `Q` whenever `Q` holds at its source. A conditional invariant plus a condition at an entry transition implies the target assertion. The paper defines conditional safety as follows: “the program P is (t̃, ϕ̃)-conditionally safe for the assertion (t, ϕ) if for any evaluation that contains →t̃ (ℓ̃, ṽ) →∗P (ℓ̄, v̄) →t (ℓ, v), we have ṽ |= ϕ̃ implies that v |= ϕ.” (§III.3, p.3)

when to use it

Use this abstraction when a component's safety depends on a precondition that can be established by earlier code, or when a global invariant would be too strong or expensive to synthesize. The target assertion can be a single clause; a CNF postcondition is handled one conjunct at a time (§IV-A, p.4).

how to do it

1. Represent each component as an SCC of the CFG and identify its entry transitions and an exit assertion `(texit, ϕ)` (§III.3, §IV-A, pp.3–4)
2. Choose a template `Iℓ,k` at each location: a conjunction of `k` linear inequalities over program variables (§IV-A, p.4)
3. Generate hard consecution constraints (`I ∧ transition ⇒ I'`) and hard safety constraints (`I ∧ exit ⇒ ϕ'`) (§IV-A, Fig. 6, p.5)
4. Make initiation constraints soft, allowing the synthesized invariant to require a precondition at each component entry (§IV-A, p.4)
5. Solve for template coefficients; instantiate `Q` from the model and use `Q` at each entry as a precondition (§IV-A, pp.4–5)

The paper's example loop `while i > 0: x := x + 5; i := i − 1` obtains `Q1 = x + 5·i ≥ 0` for an `x ≥ 0` assertion (Fig. 1, p.2). This relation is a precondition at loop entry, not a claim that every arbitrary entry state is safe.

Verus form (inference)

Inference: In Verus, encode `Q` as a `spec fn` over the loop state, put it in `invariant(...)`, and prove entry, preservation, and exit obligations with proof lemmas. Conditional entry facts become a caller `requires` clause or a lemma precondition. Verus does not synthesize linear templates through Max-SMT as part of the language; an external synthesizer would need to emit and then prove the chosen invariant.

evidence and limits

The local correctness theorem says: “If the procedure call CondSafe(C, EC , (texit , ϕ)) returns Q = 6 None, then Q is a conditional inductive invariant for C and P is (t, Q(ℓ′ ))-conditionally safe for (texit , ϕ) for all t = (ℓ, τ, ℓ′ ) ∈ EC .” (Theorem 1, §IV-A, p.5) This guarantee is conditional on the arithmetic solver and the template theory. Linear templates cannot express arbitrary heap, array, or nonlinear invariants without extensions.

## technique: Max-SMT hard/soft synthesis

what it is

Max-SMT combines satisfiability modulo arithmetic with weighted soft constraints. Hard clauses enforce soundness; soft initiation clauses reward invariants that need fewer entry assumptions. The paper explains: “Thus, any solution to these constraints is a conditional inductive invariant implying our assertion.” (§IV-A, p.5)

how to do it

1. For each location `ℓ` and conjunct `j`, create `Iℓ,j,k(V) = iℓ,j + Σv iℓ,j,v·v ≤ 0` with fresh template variables (§IV-A, p.4)
2. Encode initiation, consecution, and safety as arithmetic implications (§IV-A, Fig. 6, p.5)
3. Mark consecution and safety hard; mark each initiation condition soft with a weight (§IV-A, p.5)
4. Apply Farkas' lemma locally to transform implications into constraints over template variables (§IV-A, footnote 8, p.5)
5. Ask Max-SMT for a model maximizing satisfied soft weights; use the model's coefficients as the invariant (§IV-A, pp.4–5)
6. Try `k = 1, 2, …` conjuncts until a model is found or `MAX_CONJUNCTS` is reached (Algorithm 1, p.5)

Verus form (inference)

Inference: The equivalent Verus workflow is to generate candidate linear predicates externally, then check them with `assert forall` or lemma proofs and place the successful predicate in `invariant(...)`. Max-SMT weights can prioritize candidates that minimize caller assumptions, but the final Verus proof must establish the exact predicate.

limits

The prototype sets `MAX_CONJUNCTS` to 3 (§IV-A, p.5), so failure may reflect a template bound rather than an unsafe program. Equal initiation weights are used in VeryMax; the appendix says changing them biases which initiation conditions are favored (Appendix B, p.13). The method's arithmetic domain is a stated limitation: future work proposes arrays and heap theories (§VI, p.10).

## technique: bottom-up propagation over SCCs

what it is

The CFG's SCC condensation is a DAG. The analysis starts with a user assertion, synthesizes entry preconditions for its component, and recursively proves those preconditions in predecessor components. The authors state: “The key to the precision of our approach is our treatment of failed proof attempts.” (§IV-B, p.5)

how to do it

1. Start `CheckSafe` at the target assertion (§IV-B, Algorithm 2, p.5)
2. Run `CondSafe` on the target SCC; for each entry transition and each invariant literal, recursively call `CheckSafe` on the predecessor component (§IV-B, Algorithm 2, pp.5–6)
3. Return `Safe` only if every recursive call succeeds; otherwise return `Maybe` (§IV-B, Algorithm 2, p.6)
4. If a precondition cannot be proved, narrow the relevant transitions by adding the negation of the already-proved invariant literals (§IV-B, pp.5–6)
5. Re-run local synthesis on the narrowed graph, thereby obtaining another disjunct of a conditional invariant (§IV-B, pp.5–6)

The paper's two-loop example first obtains `Q1 = x + 5·i ≥ 0`, then propagates it backward and obtains `Q2 = j ≥ 0 ∧ x + 5·(i+j) ≥ 0` (§II-b, p.2). This is an explicit example of an implicit contract between components.

Verus form (inference)

Inference: Model each SCC boundary as a Verus function or proof lemma with an `ensures` summary. Prove the callee summary first, then use it as a `requires` fact for predecessor proofs. Verus modules can encode this decomposition, but `Safe`/`Maybe` recursion and SCC discovery would be an external orchestration layer.

evidence and theorem

The global theorem states: “Let P be a program, C a component and EC its entries. Given an assertion (texit , ϕ) such that texit is an exit transition of C and ϕ is a clause, if CheckSafe(P, C, EC , (texit , ϕ)) = Safe, then P is safe for (texit , ϕ).” (Theorem 2, §IV-B, p.6) A `Maybe` result is inconclusive, not evidence of unsafety.

## technique: narrowing failed attempts into disjunctive proofs

what it is

When a synthesized conditional invariant cannot be established at a predecessor, narrowing removes states already shown safe. For an entry transition, the algorithm conjoins the negation of the unproved invariant literals; for component transitions it conjoins `¬Q(source) ∧ ¬Q(target)'`. Repeating this process can produce disjunctive conditional invariants.

how to do it

1. Keep each literal of `Q(ℓ')` as a separate assertion (§IV-B, p.6)
2. Identify recursive calls returning `Maybe` (§IV-B, Algorithm 2, p.6)
3. Narrow each failed entry transition with the disjunction-negation of unproved literals (§IV-B, pp.6–7)
4. Narrow component transitions with `¬Q(ℓ) ∧ ¬Q(ℓ')'` (§IV-B, p.7)
5. Reinvoke `CheckSafe` on the narrowed component; each successful result is one disjunct (§IV-B, p.7)

The running example starts with `y < x`, fails to prove it in a predecessor, narrows, and then finds `x < y`; propagating that result eventually proves the top-level assertion (Example 2, §IV-B, pp.6–7). The paper cautions that “not all disjunctive invariants can be discovered like this” because each intermediate result must remain inductive (§IV-B, p.7).

Verus form (inference)

Inference: In Verus, represent each disjunct as a separate lemma or a boolean predicate and prove that the disjunction covers the reachable cases. Narrowing is a proof-search transformation, not a Verus runtime operation; the final Rust code should not silently add assumptions that were never proved.

## technique: engineering the search

The paper presents four implementation techniques that preserve precision. First, assign Max-SMT weights so solutions implying the postcondition are preferred over solutions that disable transitions (§IV-C-a, p.8). Second, memoize unsuccessful `CheckSafe` calls; because `Maybe` means the method cannot prove that assertion, repeated identical calls can be skipped (§IV-C-b, p.8). Third, after a successful recursive call without narrowing, strengthen the corresponding transition with the proven fact so later synthesis can use it (§IV-C-c, pp.8–9). The authors warn that after repeated narrowing, transitions must be split rather than simply strengthened (§IV-C-c, p.9).

Fourth, parallelize by trying different conjunct counts in `CondSafe` simultaneously and parallelizing recursive `CheckSafe` calls (§IV-C-d, pp.9–10). The implementation's sequential and parallel variants are VeryMax-Seq and VeryMax-Par. The paper also describes storing successful invariants for incremental re-analysis after a component changes, but says this iterative-proving optimization is not implemented in the prototype (§IV-C-e, p.10).

Verus form (inference)

Inference: These optimizations map to caching successful Verus proof summaries, running independent proof obligations in parallel, and rechecking only changed modules. Cache invalidation must account for changed contracts and dependencies; the paper's unimplemented iterative proving is a design idea, not evidence of a working Verus workflow.

## evaluation and denominators

VeryMax uses Barcelogic's Max-SMT solver for nonlinear arithmetic and evaluates 46 small HOLA-BENCHS programs (17–71 lines, 1–4 loops), all safe (§VI, p.10). On this set, VeryMax-Seq proves 44/46 assertions with no timeouts; VeryMax-Par proves 45/46 with no timeouts. Table I reports total times of 343.83 s and 151.21 s respectively. CPAchecker sv-comp15 proves 33/46 and times out on 10; SeaHorn proves 32/46 and times out on 1; HOLA's published data proves 43/46 and times out on 3 (Table I, p.11). These are counts over the 46-program denominator; “Fail” and “TO” are separate columns.

The second set, NR-BENCHS, is much larger. Table II reports VeryMax-Seq safe on 6,105 instances, unsafe on 0, fail on 326, and timeout on 21; VeryMax-Par safe on 6,106, unsafe on 0, fail on 346, and timeout on 0. The table's row totals imply 6,452 and 6,452 instances respectively (6,105+0+326+21 and 6,106+0+346+0). SeaHorn reports 6,077 safe, 233 unsafe, 80 fail, and 62 timeout, totaling 6,452. The table does not identify the benchmark's semantic distribution beyond these tool outcomes, so “safe” is a tool result for a benchmark instance, not a universal correctness rate.

The parallel HOLA-BENCHS result is faster than sequential (151.21 s versus 343.83 s total), but the authors note many examples are solved quickly sequentially and the prototype lacks slicing optimizations (§VI, p.11). The machine for these experiments is an 8-core Intel i7 3.4 GHz with 16 GB RAM and a 300-second limit (§VI, p.10). Earlier comparisons use a 4-core machine and a 200-second limit (§VI, p.10), so timings across tools are not one uniform hardware setting.

## trusted base, failures, and VeruLaw implications

The method proves safety relative to the CFG transition relations, arithmetic theory, templates, Max-SMT solver, and correctness of the narrowing transformations. It does not model arrays, heaps, recursive calls (the prototype inlines calls), or arbitrary Rust ownership. A `Maybe` result is a limitation of search, not a counterexample. Max-SMT's hard constraints protect soundness, while soft constraints influence usefulness; incorrect transition models or postconditions remain outside the guarantee.

Inference: VeruLaw could use this as an external invariant-summary synthesizer for Rust functions or loops, then require Verus proofs of each summary. The compositional bottom-up order is directly useful for agent-written code because it produces small proof obligations and reusable contracts. The threat is medium: a wrong model or missing heap behavior can produce an apparently successful summary, and the 6,105/6,452 safe count on NR-BENCHS is tool-specific evidence. The strongest reuse is the failure-driven narrowing and explicit `Maybe` state, which prevents an agent from treating an unproved obligation as a proof.

## techniques for the catalog

- conditional inductive invariant — synthesize a predicate that is inductive under an explicit entry condition
- Max-SMT template solving — use hard consecution/safety constraints and weighted soft initiation constraints
- bottom-up SCC propagation — turn each component's inferred precondition into a predecessor postcondition
- narrowing after failure — remove states already covered by successful conditional invariants and search another disjunct
- compositional CheckSafe — return `Safe` only after recursively proving all component-entry obligations
- proof-search memoization — cache failed and successful local calls to avoid repeated analysis
- parallel and incremental analysis — try template sizes and independent SCC obligations concurrently and reuse summaries after changes
Checked 2026-10-13: audit record brockschmidt2015compositional; paper-study comparison complete; gate executed; experiments not rerun
