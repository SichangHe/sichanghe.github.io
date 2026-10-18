# Quantifier Elimination for Database Driven Verification
(authored by agents unless marked 🧑)

Tag: `calvanese2018quantifier`, [paper](http://arxiv.org/abs/1806.09686v2)

## scope and result

The paper addresses verification of infinite-state systems whose state contains read-only database data. Its central object is a *cover*: a quantifier-free formula that summarizes an existential formula as strongly as possible over the free variables. The authors connect covers to uniform quantifier-free interpolation and model completions (Theorem 1), show that a database theory axiomatized by finitely many universal one-variable formulae over an acyclic signature has a model completion (Proposition 2), give a constrained-superposition procedure for equality with uninterpreted functions (EUF) that is proved terminating (Proposition 3) and correct (Theorem 2), give an O(n^2) bound for unary functions plus relations (Proposition 4), and describe a partial MCMT implementation. The abstract states: “In this paper, we show how covers are strictly related to model completions, a well-known topic in model theory.” (Abstract, p. 1) The paper is arXiv v2 (June 2019) and calls itself “the extended version of [13]” (Introduction, p. 2).

## technique 1: replace quantifier elimination with a cover

What it is. For an existential formula `∃e φ(e,y)`, a residue is any quantifier-free `θ(y,z)` such that `T |= φ(e,y) → θ(y,z)`; a cover `ψ(y)` is a residue that implies (modulo T) every other residue. The paper's semantic test (Lemma 1) is: (i) `T |= ∀y (∃e φ(e,y) → ψ(y))`, and (ii) for every model M of T and tuple a with `M |= ψ(a)`, there is a model N of T such that M embeds into N and `N |= ∃e φ(e,a)`. The authors motivate it because “Precise computations of the set of reachable states require some form of quantifier elimination and hence are subject to two problems, namely that quantifier elimination might not be available at all and that, when available, it is computationally very expensive.” (Introduction, p. 1)

When to use it. Use a cover when a symbolic model checker must eliminate transition-local existential variables but the background theory lacks a practical complete quantifier-elimination algorithm. The paper's target is database signatures with unary function symbols and free relations (§4.1, Definition 3, p. 9).

How to apply it.

1. Express the predecessor or transition condition as `∃e φ(e,y)`, with `φ` a conjunction of literals (primitive formula; §2, p. 3). The model checker computes preimages as `Pre(φ1, φ2) = ∃x′ (φ1(x,x′) ∧ φ2(x′))` (§4, p. 7).
2. Replace the quantifier elimination call by a cover computation: the output `ψ(y)` is quantifier-free and mentions only the free variables `y`. §3 defines covers but gives no algorithm; algorithms are in §5 (EUF, constrained superposition) and §6 (unary functions plus relations).
3. If needed, check the extension condition (ii) of Lemma 1 (§3, p. 5).
4. Use the cover as the next symbolic reachable-state formula in the backward reachability algorithm (Algorithm 1, `BReach`, §4, p. 8; Proposition 1, p. 8, says it is effective and partially correct when T is universal, has decidable constraint satisfiability and has a model completion). The paper's introduction says covers “can be used instead of quantifier elimination and yield a precise computation of reachable states” (Introduction, p. 1).

Example. The paper's Example 1 (§5, p. 18) computes the cover of `∃e f(f(e,y1),y2) ≠ f(f(e,y1′),y2′)`; it is `y1 ≠ y1′ ∨ y2 ≠ y2′` (stated on p. 12). The saturation derives the clause `y1 = y1′ ∧ y2 = y2′ → ⊥`, which is the only clause in the output.

Verus form. Inference: Verus does not expose first-order quantifier elimination as a user API. A Rust proof can instead state an `ensures` postcondition over non-ghost outputs and prove a lemma that existential ghost state implies a quantifier-free summary over ordinary state. The summary would be a `spec fn` or predicate, and callers would use the lemma rather than ask the solver to eliminate arbitrary quantifiers. The model-extension condition has no direct executable counterpart; it becomes a proof obligation that the summary is sufficient for every permitted caller state.

Evidence and limits. The technique is mathematically exact under the stated theory assumptions (Lemma 1 and Proposition 1 are proved in the paper). It does not solve theories without covers, and the paper notes that “a model completion may not exist at all” (§5, p. 11). It assumes formulas are represented in the supported first-order signature and that the computed cover is trusted by the model checker.

## technique 2: derive covers from model completions and interpolation

What it is. Theorem 1 proves, for a universal theory `T`, that `T` has a model completion `T*` iff `T` has uniform quantifier-free interpolation. If so, `T*` is axiomatized by the infinitely many sentences `∀y (ψ(y) → ∃e φ(e,y))` (formula (2)), where `∃e φ(e,y)` is a primitive formula and `ψ` is a cover of it. The introduction states that “computing covers for a theory is equivalent to eliminating quantifiers in its model completion” (Introduction, p. 2).

How to apply it.

1. Identify the universal base theory `T` for the data structures and transition system (Theorem 1, §3, p. 6).
2. For each primitive existential formula, compute a cover `ψ`, checking it with Lemma 1.
3. Add the corresponding extension axiom `∀y(ψ(y) → ∃e φ(e,y))` to define `T*` (Theorem 1, p. 6).
4. Reason quantifier-free in `T*`; to embed each model of `T` into a model of `T*`, the proof builds a chain of models by transfinite induction and iterates it countably many times (proof of Theorem 1, pp. 6–7).

Verus form. Inference: A Verus analogue is a library of lemmas whose preconditions are quantifier-free predicates and whose postconditions establish existence of ghost witnesses. Rust code would keep witnesses in proof-only state and expose only the summary predicate. This is an encoding of the theorem, not a Verus model-completion engine.

Evidence and limits. The theorem is conditional on universality and existence of covers for all primitive formulas. The chain argument uses model theory and does not by itself produce executable witnesses or Rust code. For database theories, Proposition 2 (§4.1, p. 10) gives one sufficient class: finitely many universal one-variable axioms and an acyclic signature (the sort graph of the unary function symbols has no cycle); §5 says the quantifier elimination algorithm suggested by its proof “is highly impractical” (p. 12).

## technique 3: constrained superposition for EUF covers

What it is. The paper computes covers for the empty theory (EUF, function symbols of any arity) by saturating constrained literals `L ‖ C` with a Constrained Superposition Calculus. Here `L` is a ground flat literal and `C` is a conjunction of ground equalities among e-free terms (terms without the existential variables); `L ‖ C` means the Horn clause `C → L` (§5, p. 13). The rules are Superposition Right, Superposition Left, Reflexion and Demodulation (§5, p. 14). Relation symbols are handled in §5 by rewriting `R(t1,...,tn)` as `R(t1,...,tn) = true`; a Resolution rule appears only in the optimized unary-function fragment of §6 (p. 20). The paper states: “covers for (EUF) can be computed through a constrained version of the Superposition Calculus” (Introduction, p. 2).

How to apply it.

1. Flatten the input conjunction so that it consists of e-flat literals, replacing subterms by fresh existential variables with defining equalities (the abstraction step, §5, pp. 12–13).
2. Choose a total reduction ordering on ground terms that orients e-flat literals `t = a` left to right in two stated cases (§5, p. 13). The initial set is `{L ‖ ∅ | L is a flat literal of the matrix}` (Remark 3, p. 14).
3. Apply the four rules until saturation. Superposition, Reflexion and Demodulation are applied to literals that are not e-free, and Demodulation is applied only with a premise `e_j = t(y) ‖ D` where `t` is e-free, with higher priority than the inference rules (Remarks 1, 2 and 4, pp. 14–15). Every produced literal is e-flat (Lemma 4, p. 15).
4. Termination: only e-flat terms of degree at most n (n is the number of existential variables) can occur, so saturation terminates (Lemma 5 and Proposition 3, pp. 15–17).
5. Output the conjunction of the clauses `C → L` for the e-free constrained literals in the saturated set (Remark 3, p. 14). Theorem 2 (p. 17) says this output is a cover of `∃e φ(e,y)`.

For the unary-function plus relation fragment, use the paper's optimized order: first close under Restricted Superposition (rules whose left premise is not of the form `e_i = t(y)`), then exhaustively Demodulate, then apply Reflexion and Resolution. Lemma 6 says this order is sufficient (§6, p. 21). In this fragment, with relations of arity n > 1, the only constrained clauses generated have the form `⊥ ‖ {t1 = t1′, ..., t_{n-1} = t′_{n-1}}` (§6, p. 19).

Verus form. Inference: This is best transferred as an off-line VC simplifier or verified meta-tool, not as run-time Rust. A Verus proof could encode each rewrite rule as a lemma over symbolic terms and prove that saturation preserves entailment. Inference: Verus's SMT backend may perform some rewriting automatically, but the paper's explicit ordering and termination argument would still be needed for predictable database-state elimination.

Evidence and limits. The proof of Theorem 2 relies on the refutational completeness of the unconstrained Superposition Calculus (the paper builds a model of the diagram of M together with the saturated set, p. 18) and on the finite-term bound of Proposition 3. The procedure targets EUF; the paper also gives a variant for the axiom `∀x (x = undef ↔ f(x) = undef)` (§6.1, pp. 23–24). Theories other than EUF with such axioms are not covered; §7 lists further theories as future work.

## technique 4: database complexity and MCMT deployment

For signatures with only unary functions and m-ary relations, the paper says constrained superposition computes covers “in polynomial time for the empty theory” (§6, p. 19) and, with its optimized strategy, Proposition 4 gives a cover in dag-format in time O(n^2), n the size of the formula (§6, pp. 19–23). The authors conjecture O(n·log(n)) may be possible (p. 23). If relations are at most binary, a primitive formula's cover is a conjunction of literals, which fits symbolic-state representations (§6.2, p. 24). MCMT's implementation handles EUF with unary functions, unary relations, and binary relations, but “The optimized procedute of Section 6 has not yet been implemented” (§6.2, p. 24; the paper contains this spelling). The tool instead uses Knuth–Bendix completion for the supported fragment, where the constraints are trivial.

The paper reports that a first experimental evaluation, “based on the existing benchmark provided in [32], which samples 32 real-world BPMN workflows”, is described in [10], not here, and that the benchmarks are in MCMT distribution 2.8 (§6.2, p. 25). It says: “the tool was able to solve in few seconds all the proposed benchmarks and the cover computations generated automatically during model-checking search were discharged instantaneously” (§6.2, p. 25). No table or per-workflow timings appear in this paper. Inference: these are informal performance observations, not a proof of universal speed or completeness beyond the supported fragment.

Verus form.

## what is proved, measured, and trusted

The paper proves the cover/model-completion equivalence (Theorem 1), that the constrained-superposition output is a cover (Theorem 2) after terminating (Proposition 3), and the O(n^2) bound for the restricted signature (Proposition 4). It reports no measurements of its own; the only empirical statement is the informal summary of the MCMT benchmark run described in [10] (32 BPMN workflows, “few seconds”, covers “discharged instantaneously”). Inference: trusted components include the logical theory, the implementation of MCMT and its completion procedure, the SMT/model-checking encoding, and the correctness of any user-supplied transition schema. Inference: a Verus product would additionally trust the translation from Rust state to the database abstraction and the specification's correspondence to product requirements.

## techniques for the catalog

- cover-based existential elimination — summarize `∃e φ(e,y)` with a strongest quantifier-free formula satisfying the model-extension test
- model-completion bridge — obtain quantifier elimination from uniform quantifier-free interpolation in a universal theory
- constrained-superposition covers — saturate e-flat EUF literals with ordered rewriting and reflexion (plus resolution for relations in the unary-function fragment)
- database-fragment optimization — exploit unary functions and free relations for polynomial or quadratic cover computation
- MCMT deployment — integrate the cover procedure into database-driven symbolic model checking, as reported for BPMN workflows in [10]
