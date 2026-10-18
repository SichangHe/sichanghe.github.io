# A Fixed-point Theorem for Horn Formula Equations
(authored by agents unless marked 🧑)
Tag: `hetzl2021fixed`, [paper](https://doi.org/10.4204/EPTCS.344.5)

## what is proved
Hetzl and Kloibhofer recast constrained Horn clause solving as solving existential second-order formula equations. Their main result expresses the minimal model of Horn clauses with a simultaneous least-fixed-point operator in first-order logic with least fixed points (FO[LFP]). The abstract says: “We state and prove a fixed-point theorem for Horn formula equations which is based on expressing the fixed-point computation of a minimal model of a set of Horn clauses on the object level as a formula in first-order logic with a least fixed point operator.” The result is a logical theorem, not an implementation benchmark: no runtime, task count, or solver success rate is measured.

A Horn formula equation is `∃X1...Xn ψ`, where `ψ` is the universal closure of constrained Horn clauses. A solution substitutes each predicate variable with a first-order formula. The paper distinguishes satisfiability, validity, and syntactic solvability; a valid equation need not have a first-order solution (Section 2, pp. 66–68). Inference: this distinction matters when interpreting a verifier that returns “sat”: satisfiability does not itself produce an invariant formula.

## technique 1: construct the least fixed point of Horn clauses
what it is: convert each Horn equation into a monotone operator whose least fixed point is the canonical solution. The operator adds a tuple whenever a base clause or an induction clause derives it.

how to do it:
1. classify clauses as base `ϕ → Xi(s)`, induction `ϕ ∧ Xi1(t1) ∧ ... ∧ Xim(tm) → Xj(s)`, or end `ϕ ∧ ... → ⊥` (Section 3, PDF pp. 69–70)
2. for each predicate `Xj`, form `ϕj(X1,...,Xn,xj)` as an existential disjunction of base and induction bodies, conjoining `xj = s`
3. note that every `Xi` occurs only positively in `Φψ` by construction, so the induced operator is monotone
4. interpret `[lfp Xj Φψ]` as the j-th component of the least fixed point, justified by Knaster–Tarski
5. substitute these formulas for `Xj`; the end clauses then hold whenever the equation is valid, because the proof of Lemma 6 shows the substitution satisfies them (Theorem 7 assumes validity)

The paper defines FO[LFP] so that “the predicate [lfpX ϕ (X, u)] is interpreted as that least fixed point” (Section 3, PDF p. 68). Lemma 6 proves that `∃X ψ ↔ ψ[X\μ]` is valid and that `μj → Rj` holds in any structure for any relations `R` satisfying `ψ`; Theorem 7 states the fixed-point theorem for valid Horn formula equations (Lemma 6 on pp. 69–70, Theorem 7 on p. 70). A concrete graph example uses `u=v ∨ ∃w(X(u,w) ∧ E(w,v))`; its least fixed point is graph reachability (Example 4, p. 68).

Inference: in Verus, represent each predicate relation as a `spec fn` over mathematical values, and state base/induction closure as `proof fn` lemmas with `requires` for clause premises and `ensures` for the derived relation. Verus does not provide a general `lfp` operator. A finite inductive invariant can be approximated by a ghost set/sequence plus lemmas for initialization and one-step closure; the paper's FO[LFP] semantics remains a mathematical specification or external solver result, not executable Verus syntax.

## technique 2: dual and linear Horn bounds
what it is: for a dual Horn equation, replace every predicate with its negation (giving a Horn equation), take the least fixed point of that, and negate it. The result is an upper bound on every FO[LFP] solution, analogous to a greatest solution; the paper does not claim it is the greatest fixed point.

how to do it:
1. form `ψD = ψ[X1\¬X1,...,Xn\¬Xn]` for a dual Horn equation `ψ`, which is logically equivalent to a Horn equation (Section 3, pp. 70–71)
2. build `ΦψD` using the same base/induction construction
3. define `νj = ¬[lfp Xj ΦψD]`
4. for a valid dual Horn equation, use Theorem 10 to obtain `ψ[X\ν]` and the implication bound `χj → νj` for every FO[LFP] solution `χ`
5. when the equation is both Horn and dual Horn (linear Horn) and valid, use Theorem 11 (p. 72) to sandwich any FO[LFP] solution: `μj → χj → νj`; the paper reads this as an interpolation problem in FO[LFP] and says it helps explain “the efficacy of interpolation-based methods for solving constrained Horn clauses”

The authors explicitly caution that “ν is not the greatest fixed point of Φψ” and leave a sensible greatest-fixed-point definition as future work (Section 3, PDF p. 71). Inference: a Verus proof can encode lower and upper relational approximations as separate `spec fn`s and prove implication lemmas; it must not label the negated dual solution as a greatest fixed point without an additional theorem.

## technique 3: verification-condition encoding and invariant generation
what it is: encode a Hoare triple as a Horn formula equation whose existential predicate variables are loop invariants or sequence summaries.

how to do it:
1. use the grammar `skip | x := t | p0;p1 | if B then p0 else p1 | while B do p0` over integer states (Section 4, p. 72)
2. recursively generate `vc({ϕ}p{ψ})`: assignment substitutes `t`, sequencing introduces a fresh predicate `I`, conditionals split on `B` and `¬B`, and a loop generates `vc({I ∧ B}p0{I}) ∧ (ϕ → I) ∧ (I ∧ ¬B → ψ)` (Definition 12, p. 72)
3. existentially quantify all fresh predicates; the paper states, as shown “by a straightforward induction” without writing it out, that `vc({ϕ}p{ψ})` is a linear Horn formula equation
4. solve it with Theorem 7; by Corollary 14 (p. 73), `Z |= vc({ϕ}p{ψ})` iff the substitution `I\μ` makes the matrix true in `Z`, i.e. a canonical FO[LFP] invariant solution exists
5. for linear equations, compute lower `μ` and upper `ν` and seek a fixed-point-free interpolant between them (Corollary 15, p. 73)

The paper states, with only a proof sketch: “Then ⊢ {ϕ}p{ψ} iff Z |= {ϕ}p{ψ} iff Z |= vc({ϕ}p{ψ}).” (Theorem 13, PDF p. 73.) Corollary 15 says that finding first-order loop invariants is an interpolation problem between the two fixed-point bounds. Inference: a Verus encoding uses executable Rust loops with `invariant` clauses, `requires`/`ensures` contracts, and helper `proof fn`s; a CHC solver may propose the invariant, but Verus must check initialization, preservation, and the postcondition. The paper's imperative language, integer denotational semantics, and FO[LFP] formulas do not directly verify Rust ownership or memory behavior.

## technique 4: weakest preconditions and strongest postconditions
what it is: solve two linear Horn equations to obtain exact state predicates for a program's strongest postcondition and weakest precondition.

how to do it:
1. define `∃X0 vc({ϕ}p{X0})` and solve its least fixed point `μ`; Corollary 18 proves `[μ] = sp(p,ϕ)`
2. define `∃X0 vc({X0}p{ψ})` and solve the dual equation; Corollary 19 gives `[ν] = wp(p,ψ)` (Definition 16 and Lemma 17 on p. 73, Corollaries 18 and 19 on p. 74)
3. use the Hoare relation `[ϕ] ⊆ wp(p,ψ)` or `[ψ] ⊇ sp(p,ϕ)` to establish partial correctness

The proof of Corollary 18 uses the existence of first-order formulas defining `sp` and `wp`, which relies on an encoding of finite sequences in the integers; the paper notes only that the resulting `μ` and `ν` do not rely on that expressivity hypothesis. Inference: in Verus, a postcondition can be strengthened by ghost state and `ensures`; a precondition can be proposed as a `requires` predicate and checked by calling proofs. Verus does not compute exact weakest/strongest predicates automatically, and total termination requires a `decreases` proof absent from this paper.

## technique 5: abstract interpretation of the fixed point (conjectural)
what it is: replace concrete relation lattices with abstract domains connected by abstraction `α` and concretization `γ`, then iterate the abstract monotone operator. The paper defines a model abstraction with complete lattices `Vk` and a Galois connection (Section 5, pp. 74–75).

how to do it:
1. choose an abstract domain, such as affine subspaces, and define `αk` and `γk`
2. interpret second-order quantifiers through `γk`
3. define `Fi# = αki ∘ Fi ∘ γ` and compute its least fixed point
4. use the proposed abstract fixed-point theorem to derive a first-order solution; the paper labels this statement Conjecture 24, not a proved theorem
5. in Example 25, exploit finite height of affine-subspace lattices and finish with linear arithmetic

Inference: Verus can represent an abstract domain with a ghost datatype and prove soundness of `γ(α(S))` over-approximation using `proof fn`s. Because Conjecture 24 is unproved, an agent must not treat this abstraction as a sound Verus backend without separately proving the abstraction theorem.

## techniques for the catalog
- Horn-to-least-fixed-point construction — classify base, induction, and end clauses and substitute the monotone least fixed point
- dual fixed-point upper bound — for a dual Horn equation, negate the least fixed point of its dualization to bound every FO[LFP] solution from above
- verification-condition Horn encoding — recursively turn Hoare sequencing, branching, and loops into existential Horn predicates
- interpolation invariant generation — find a fixed-point-free formula between lower and upper solutions of a linear Horn equation
- fixed-point strongest postcondition — solve `vc({ϕ}p{X})` to obtain the exact reachable post-state predicate
- fixed-point weakest precondition — solve the dual `vc({X}p{ψ})` equation to obtain the exact safe pre-state predicate
- abstract-domain fixed point — lift the monotone operator through a Galois connection, noting the paper's result is conjectural
