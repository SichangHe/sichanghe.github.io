# Constraint Solving for Finite Model Finding in SMT Solvers
(authored by agents unless marked 🧑)
Tag: `reynolds2017constraint`, [paper](http://arxiv.org/abs/1706.00096v1)

## problem and contribution

Reynolds, Tinelli, and Barrett add finite-model finding to the DPLL(T) architecture used by SMT solvers. Their target is quantified SMT formulas whose quantified variables range over uninterpreted sorts or finite built-in sorts. Existing quantified SMT procedures are incomplete and can answer “unknown” when they cannot prove unsatisfiability; a finite model can instead be a concrete counter-model for a verification condition. The abstract states, “This inability to return counter-models limits their usefulness in applications that produce queries involving quantified formulas.” (Abstract, p. 1)

The method is implemented in cvc4. The paper also states, “The practical effectiveness of this approach relies on two crucial components: (i) a method for constructing and representing candidate models efficiently and (ii) a model-based quantifier instantiation heuristic that avoids the explicit generation and checking of all the ground instances of the input formula.” (§1, p. 3) Its formal guarantee is conditional: FM-Solve returns `unsat` only when its ground assignment solver is sound, and returns `sat` only when the instantiation heuristic is sound with respect to the candidate model (Theorem 2, §5, p. 12). The paper states no termination or completeness theorem for FM-Solve as a whole: Theorems 3 and 4 give soundness, completeness and termination only for the ground FCC strategies of Section 6, and the paper restricts its detailed correctness arguments for the three steps to EUF (§5, p. 13). Inference: the procedure is therefore not complete for arbitrary first-order SMT. Experiments report solved-benchmark counts and cumulative times, not proof soundness.

## technique: purification and proxy variables

Use purification before model finding so the DPLL(T) engine receives ground clauses while quantified obligations remain in a separate set. The input language is built from equalities, Boolean connectives, and universal quantification over an uninterpreted or finite sort (§5, p. 10). Apply these steps:

1. convert the input formula ψ to clausal form while treating each quantified subformula as an atom (§5, p. 11)
2. for each quantified formula `∀x ϕ`, create a fresh Boolean proxy `a` and record `a ⇔ ∀x ϕ` in set A (§5, p. 11)
3. replace a positive occurrence of the quantified formula in a clause by `a` (§5, p. 11)
4. replace a negative occurrence by `ϕ{x ↦ k}`, where `k` is a fresh variable treated as a Skolem constant (§5, p. 11)
5. repeat until the clause set F contains no quantifiers; the resulting `(F,A)` is equisatisfiable with ψ (§5, p. 11)

The paper's Example 1 turns `¬P(b,c) ∧ (Q(b,c) ⇔ ∀x P(b,x))` into ground clauses `F := {¬P(b,c), ¬P(b,k) ∨ Q(b,c), a ∨ ¬Q(b,c)}` and `A := {a ⇔ ∀x P(b,x)}` (§5, p. 11). The authors state, “This conversion from ψ to F and A can be done so that ψ and F ∪ A are equisatisfiable.” (§5, p. 11)

Inference: In Verus, purification could separate quantifier-heavy `spec fn` obligations from a ground solver query by introducing Boolean ghost facts and fresh witness values. This is an orchestration pattern, not a Verus language feature. Verus's specifications and solver translation already perform their own encoding; a VL tool should not assume that manually introducing proxies preserves the intended Rust contract without proving the equivalence.

## technique: FM-Solve finite-model loop

Use FM-Solve when a quantified formula is expected to have a small model over its free sorts. The algorithm in Figure 3 is the operational core (§5, p. 12):

1. find a satisfying assignment M for purified ground clauses F with DPLL(T); return `unsat` if none exists (§5)
2. construct a finite Σ-interpretation M satisfying that assignment, and choose a minimal set V of terms denoting every element of each uninterpreted sort (§5)
3. for every active quantified formula `a ⇔ ∀x ϕ` with `a ∈ M`, ask a heuristic H for substitutions from x to terms in V (§5)
4. add purified instances `¬a ∨ ϕσ` for those substitutions to F and A (§5)
5. if all returned substitution sets are empty, return `sat`; otherwise restart at Step 1 (§5)

The algorithm deliberately checks only quantified formulas whose proxy is true in the candidate assignment. The heuristic must satisfy the paper's model-soundness condition: an empty set is allowed only when the candidate model satisfies the universal formula. Theorem 2 says that unsat results rely on a sound ground-assignment method and sat results rely on this empty-set condition (p. 12). The paper later restricts itself to EUF for the correctness arguments of the three steps (§5, p. 13). The paper summarizes the loop as follows: “When this check fails, the model finder looks for a new candidate model, possibly under extended cardinality bounds for the free sorts.” (§1, p. 3)

Inference: A Verus integration could use this loop to turn a failed quantified proof obligation into a bounded model candidate, then translate a falsifying instance into a concrete Rust or ghost-state counterexample. The candidate is diagnostic evidence, not a proof that the original unbounded contract is false unless the instance is checked in the same semantics as the contract.

## technique: finite cardinality constraints and congruence solving

Use FCC to find small models for EUF ground constraints. FCC extends equality with Boolean atoms `cardS,k`, meaning sort S has at most k elements (§6, p. 13). The paper notes that satisfiability of FCC literals is NP-complete by graph-coloring reduction, although each fixed candidate model can be checked in polynomial time (§6, p. 13).

The decision procedure in Figure 4 (§6.1, p. 14; single uninterpreted sort) is:

1. compute congruence closure M* of the terms and subterms of the input literals (Definition 2, §6, p. 13)
2. reject if M* entails an equality whose disequality is asserted, including `false ≠ true` (§6.1, p. 14)
3. if there is no positive cardinality literal, accept (§6.1)
4. choose the smallest asserted bound `cardS,k`; reject conflicting `¬cardS,j` for `j ≥ k` (§6.1)
5. accept if M* has at most k equivalence classes (§6.1)
6. otherwise, if two terms in distinct classes of M* are not entailed disequal, branch on `s ≈ t` and `s ≠ t` and accept if either recursive branch accepts; if no such pair exists, reject (§6.1)

Lemma 1 states that this procedure is sound, complete, and terminating; Proposition 3 says every satisfiable FCC literal set has a finite model (§6.1, pp. 14–15). The branch measure is the number of pairs of equivalence classes not already entailed disequal, which decreases in either branch of the split (§6.1, p. 15).

The solver is integrated into DPLL(T) with weak and strong effort checks. Weak effort detects EUF conflicts, contradictory cardinality bounds, and a `(k+1)`-clique of pairwise disequal terms under `cardS,k`; it learns a clique lemma `¬cardS,k ∨ ¬distinct(t1,…,tk+1)` (Fig. 5, §6.2, pp. 15–16). Strong effort branches on an equality or disequality between representatives whenever more than k equivalence classes remain (Fig. 7, §6.2, p. 19). Theorem 3 states that the integrated `checkFCC` strategy is sound, complete, and terminating for every ground clause set (§6.2, p. 20).

## technique: region-based clique detection and fair cardinality search

The paper notes that checking for a `(k+1)`-clique in a graph is NP-complete in general, so its weak effort check uses an incomplete test based on regions of the disequality graph (§6.2, pp. 16–18). Maintain a `(k+1)`-regionalization: a partition whose regions satisfy the paper's external-edge bound (Definition 3, p. 17). The key lemma says every k-clique lies within one region (Lemma 2, p. 17). Maintain the graph incrementally as congruence classes and disequalities are added or merged, repairing a region with `fix_region` by merging it with another region until the invariant holds (Fig. 6, pp. 17–18). Watch k+1 vertices in each large region; if they are all pairwise connected, learn a clique lemma (§6.2, p. 18).

For several uninterpreted sorts, use the fixed-cardinality strategy in Figure 8. Introduce aggregate `cardΣ,k` atoms, decide the least currently feasible bound for each sort fairly, and conflict when the sum of per-sort bounds exceeds the aggregate bound (§6.3, pp. 20–22). This avoids an unfair search that increases one sort forever while another has no finite model. Theorem 4 states that fixed-cardinality `checkFCC` is sound, complete, and terminating (§6.3, p. 22).

Inference: A Verus analogue could maintain a graph of ghost identities and disequalities to discover small countermodels for quantified ownership or state-machine predicates. The region invariant and clique lemmas are mathematical solver internals, not Verus syntax. A simpler bounded-search harness may be easier to validate, but it will not inherit the completeness theorem unless it implements the same finite-domain semantics.

## technique: constructing candidate models with defining maps

Use a defining map to turn a satisfying ground assignment into a finite interpretation of uninterpreted functions (§7, pp. 23–26). The domain of each uninterpreted sort is the set of representative terms of the congruence classes of M* (§7, p. 23). A defining map ∆f for a function f is a finite set of equations `f(t1,…,tn) ≈ v`, where each argument ti is either a domain element or a fresh variable yi, and v is a domain element (Definition 4, p. 23). It must satisfy two requirements: whenever two distinct left-hand sides have a most general unifier σ, σ is non-empty and `s1σ ≈ v` is also in ∆f for some v; and some equation `f(y1,…,yn) ≈ v` (a default) is in ∆f. The value of a ground term f(v1,…,vn) is then given by the equation whose left-hand side is its unique most specific generalization (p. 24).

The Figure 9 procedure constructs a Σ-map from a satisfying assignment M and a set U of terms of M (p. 24). For each uninterpreted function f:

1. D1: for each term `f(t1,…,tn)` in M, add `f(VM(t1),…,VM(tn)) ≈ VM(t)`, where VM maps a term to the representative of its equivalence class (§7, Fig. 9)
2. D2: for each term in U, add an equation whose arguments are the representatives, except that an argument equal to the distinguished term e of its sort is replaced by the variable yi (§7, Fig. 9, p. 24)
3. let ∆f = D1 ∪ D2; for each unifiable pair of equations with mgu σ, if the instantiated left-hand side of the earlier equation is not already a left-hand side in ∆f, add it with that equation's value (§7, Fig. 9)
4. if `f(y1,…,yn)` is not a left-hand side, add it with an arbitrary value (§7, Fig. 9)

The paper's implementation chooses U to be the whole set of terms TM (p. 25). Example 7 (p. 25) shows that a different U would give a different ∆f. Proposition 5 states that, for an assignment containing only uninterpreted function symbols over uninterpreted sorts, the result is a Σ-map and the normal model it represents satisfies the assignment (pp. 25–26). Footnote 6 (p. 24) says a Σ-map represents a family of normal models that differ only over the variables and interpreted symbols of Σ. This construction supplies the candidate model M used by FM-Solve's Step 2 (§7, p. 23).

Inference: In Verus, a finite map can represent a bounded abstraction of a ghost function or state transition relation. It can produce a concrete witness for a failed `ensures`, but Rust's executable functions, memory layout, and unbounded integers are outside this EUF construction unless explicitly abstracted.

## technique: model-based quantifier instantiation

Use model-based instantiation to avoid enumerating every tuple in a finite candidate domain. Exhaustively instantiating n variables over k values produces `k^n` substitutions (§8, p. 26). The paper instead evaluates one instance, identifies critical variables on which its truth depends, and skips all tuples that vary only in noncritical positions.

Apply the method as follows:

1. evaluate a ground instance `ϕσ` in candidate model M (§8, pp. 26–27)
2. recursively compute each term's value and a set of critical variables with `eval` (Fig. 10, p. 27)
3. generalize the instance to all substitutions that agree on the critical variables; these instances are equisatisfiable with `ϕσ` in M (§8, pp. 26–27)
4. enumerate tuples in lexicographic order, jumping with `next_i` over noncritical coordinates (Fig. 11, p. 29)
5. add a representative substitution whenever the evaluated instance is false (§8.2)
6. return the set I of falsifying representatives; Theorem 5 states that I is empty exactly when M satisfies the universal formula (§8.2, p. 30)

The paper's Example 8 shows `eval` finding that `g(x2,b)` is constant in x2 and therefore returns no critical variable for that subterm (p. 28). Example 9 runs Hm over a three-element domain and returns the single substitution {x1 ↦ b, x2 ↦ a}, which stands for the falsified instances with x1 = b and any x2, rather than enumerating all nine pairs (p. 30). The authors note that their implementation adds the whole set I before recomputing a model, although any nonempty subset is logically enough to force revision (§8.2, p. 30).

Inference: For VL, this suggests a counterexample-guided instantiation layer for quantified Verus lemmas: evaluate a candidate model, identify which quantified variables affect the failing formula, and emit only representative counterexamples. Verus's SMT encoding does not expose the paper's Σ-map or critical-argument index, so implementing this requires an external model representation and a proof that skipped instances are equivalent for the chosen abstraction.

## technique: E-matching enhancement

Use heuristic E-matching before model-based instantiation when ground terms in the current assignment provide useful patterns (§8.3, pp. 30–31). If E-matching returns instances, use them; otherwise fall back to Hm. The authors recommend delaying E-matching until a candidate finite assignment has bounded equivalence classes, because unrestricted E-matching may not terminate. The bounded domain ensures only finitely many terms are unique up to congruence (§8.3, pp. 30–31).

Inference: In Verus, trigger-like lemma instantiation already affects solver behavior, but this paper's ordering gives a possible controller: use syntactic triggers to quickly refute a candidate abstraction, then use model-based representatives for coverage. It should be measured for solver load and proof stability; the paper does not establish that this ordering is universally best.

## evidence and limits

The FCC evaluation used 793 nontrivial graph-coloring benchmarks, each with 20–50 constants and 100–900 disequalities, a 60-second timeout, and an eight-core 2.60 GHz Intel E5-2670 with 16 GB RAM (§9.1, pp. 31–33). Region-based cvc4+f solved 723/793; cvc4+f-r, with one region per sort, solved 664/793; cvc4+fe, which explains cliques with larger conflict clauses, solved 309/793; and cvc4+mace solved 617/793 (§9.1, pp. 32–33). The paper reports median model sizes of 17 for the 123 benchmarks solved only by cvc4+f and 10 for the 13 solved only by cvc4+mace (p. 33). The counts 123 and 13 are subsets of the 793 benchmarks, not percentages.

For Intel DVF verification conditions, Figure 13 uses five classes with satisfiable denominators 45, 6, 42, 19, and 37 and unsatisfiable denominators 145, 40, 488, 304, and 244; each benchmark had a 600-second timeout (§9.2, pp. 33–34). cvc4+f solved all 45, 6, and 42 satisfiable cases in the first three classes and 18/19 and 36/37 in the last two; cvc4+fm and cvc4+fmi solved all satisfiable cases. On unsatisfiable cases, cvc4+i solved 145/145, 40/40, 484/488, 304/304, and 244/244, while cvc4+fmi solved 145/145, 40/40, 488/488, 302/304, and 244/244. The text says “configuration cvc4+fmi solves all unsatisfiable benchmarks within 900s” (§9.2, p. 34), but Figure 13 lists 302 of 304 for the apg class. Inference: the text and the table disagree, and the paper does not explain how; trust the table counts.

For TPTP 5.4.0, Figure 14 contains 12,406 unsatisfiable and 1,958 satisfiable problems, split into EPR (920/388), NEQ (2,008/618), SEQ (7,682/340), and PEQ (1,796/612) denominators (§9.2, p. 35). Under a 300-second timeout, cvc4+fm solved 1,277/1,958 satisfiable problems and cvc4+f solved 1,190/1,958; Paradox solved 1,450/1,958. For unsatisfiable cases, the table gives cvc4+fmi 3,798/12,406 (the text says 3781), while iProver solved 6,330/12,406. Some finite-model configuration solved 144 unsatisfiable cases that no other compared tool solved (§9.2, p. 36).

Model-based instantiation scaled to large possible-instance counts: cvc4+f solved only 13 problems with more than 100,000 possible instances (maximum about 5.6 million), whereas cvc4+fm solved 123 such problems, with a maximum above 2.8 trillion (§9.2, p. 37). On 13,041 Isabelle benchmarks, cvc4+fmi solved 824 satisfiable cases and cvc4+i solved 3,858 unsatisfiable cases within 300 seconds (Fig. 16, pp. 37–38). These results are benchmark-specific; they do not imply that finite-model finding dominates ordinary SMT solving. On the Intel unsatisfiable benchmarks the authors observe that “cvc4 with finite model finding is orders of magnitude slower than the SMT solvers on these benchmarks”, and attribute this to exhaustive instantiation with increasing cardinality bounds (§9.2, p. 34).

## trusted boundary and VL threat

The trusted boundary includes purification correctness, the DPLL(T) framework, FCC congruence and cardinality procedures, candidate-model construction, the quantifier-instantiation heuristic, cvc4's implementation, and the semantic assumption that a finite model is relevant to the query. The paper's sat guarantee is conditional on the heuristic's empty-set soundness; it does not prove that arbitrary quantified formulas have finite models. Its experiments use fixed hardware (Xeon E5-2670 for §9.1, E5-1650 for the other experiments, §9.2 p. 33), cvc4 version 1.2 for the TPTP runs, comparison solvers of the versions the paper lists (e.g. cvc3 2.4.1, Yices 1.0.32, z3 4.1 or 4.3), selected benchmark families, and timeouts. Inference: the reported wins support engineering value in those settings, not universal performance.

Inference: This work is a high threat to a product that generates agent-written verified Rust if VL currently treats an SMT `unknown` as a dead end. A finite-model layer could produce concrete counterexamples, guide lemma instantiation, and explain why a quantified contract is too strong. The threat is lower for soundness: a model finder can guide repairs, but Verus must still prove the repaired contract. VL should preserve the paper's separation between candidate-model evidence and proof acceptance, record denominators and timeout settings, and avoid claiming completeness outside bounded abstractions.

## techniques for the catalog

- purification with proxies — replace quantified subformulas by Boolean proxies and ground witnesses while preserving equisatisfiability
- FCC congruence solving — combine congruence closure with finite cardinality bounds and learned clique or split lemmas
- region-based finite-model search — maintain graph regionalizations to detect cardinality conflicts without general clique search
- defining-map model construction — build finite interpretations from congruence-class representatives and function tables
- model-based instantiation — evaluate critical variables and enumerate only representative falsifying substitutions
- E-matching fallback — prioritize syntactic instances, then use finite-model instantiation after domain bounds are established
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "If the number of equivalence classes is less than or equal to k, then the procedure returns true, indicating that M is FCC-satisfiable."): read the whole paper text and checked every quotation, section and page reference, the purification, FM-Solve, FCC (Figures 4-8), defining-map, eval and Hm steps, and all benchmark numbers against the text and Figures 12-16; changed purification page references (p. 11, not p. 10), removed unsupported completeness and indefinite-revision claims, rewrote the defining-map and Figure 9 steps to match Definition 4 and Figure 9, flagged the paper's own text-versus-table disagreements (900 s claim, 3781 vs 3798), and marked own conclusions "Inference:"; did not check the cited external papers, did not re-derive the proofs, and read Figures 12-16 only from the text layer (no scatter plot values).
