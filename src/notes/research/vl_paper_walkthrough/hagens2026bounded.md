# Bounded Rewriting Induction for LCSTRSs
(authored by agents unless marked 🧑)
Tag: `hagens2026bounded`, [paper](http://arxiv.org/abs/2601.02803v1)

## scope and result

Hagens and Kop present Bounded Rewriting Induction (Bounded RI) for logically constrained simply typed rewriting systems (LCSTRSs), including higher-order applications and guarded rules. The goal is to prove inductive equations while avoiding the usual requirement that every induction hypothesis be oriented within the well-founded ordering. The paper also extends the method to disprove equations in ground-confluent systems, prove ground confluence from critical pairs, and construct the required ordering pair. It also describes an interactive implementation in the tool Cora (Section 8).

The paper states the motivation precisely: “Induction proofs in RI require induction hypotheses to be oriented in a well-founded ordering.” (Section 1, p. 2). Its replacement is to carry two bounds with every equation and check decrease only when an induction hypothesis is used. “More specifically, the bounding terms provide us with a way to keep track of terms to be in used in the ordering requirements (along the equation we are proving) – instead of orienting the induction hypothesis themselves – yielding milder termination requirements.” (Section 1, p. 3).

The object being proved is R-ground convertibility, not equality in every model. The authors explicitly qualify soundness: “Our notion of soundness does not consider all possible models, but rather one particular model: we fix our semantics to inductive theorems, i.e. R-ground convertibility.” (Remark 3.5, p. 10). The assumptions for the main soundness theorem are a weakly normalizing, quasi-reductive LCSTRS and a bounding pair; completeness (Theorem 3.19) additionally assumes ground confluence (Theorems 3.4 and 3.19, pp. 10, 21).

## technique 1: bounded rewriting induction

what it is

A proof state is `(E,H)`. `E` contains equation contexts `(ς ; s ≈ t ; τ)[ψ]`; `H` contains equations already made induction hypotheses. The pair `(≻,⪰)` consists of a well-founded partial order and a quasi-order, with `≻ ⊆ ⪰`, composition closure (`≻·⪰ ⊆ ≻` and `⪰·≻ ⊆ ≻`), and, for a bounding pair, `s⪰t` whenever `s→R t` or `s ▷ t`. The fresh symbol `•` behaves as an infinite term (`• ≻ s` for every term `s`), so initial goals have infinite bounds. A context is bounded when `ς⪰s[ψ]` and `τ⪰t[ψ]`; it is strongly bounded when `ς = s` or `ς≻s[ψ]`, and likewise `τ = t` or `τ≻t[ψ]`. (Definitions 3.1–3.3, 3.8–3.9, pp. 9–12.)

when to use it

Use it for an equation `s≈t[ψ]` whose ground instances should be shown convertible under constrained rewriting. The paper's motivation is that orienting all induction hypotheses as rules requires a termination proof that may be too strong or impossible (its example is `add(x, y) ≈ add(y, x)`, which is not orientable in either direction; Section 1, p. 2). Start with the initial context `(• ; s≈t ; •)[ψ]` and an empty `H`.

how to do it

1. Choose or accumulate requirements for a bounding pair. The pair need not be fixed before proof search: “in practice we can leave this pair undecided, use the proof system to collect requirements about it, and then select a suitable bounding pair at the end” (p. 10, Section 3.1). Each rule application can add requirements such as `u≻v[φ]`.
2. Apply `(Induct)` to a goal. Replace `(ς ; s≈t ; τ)[ψ]` by `(s ; s≈t ; t)[ψ]` and add `s≈t[ψ]` to `H`. The bounds now restrict later hypothesis applications to strictly smaller instances. (Figure 1 and Section 3.2, pp. 11–12.)
3. Use `(Case)` to split guards. Supply a cover set `C` of pairs `(δ, φ)` (a substitution and a constraint) such that every ground semi-constructor instance is an instance of one member. For `i,n:int`, the paper uses `{([],i<n),([],i≥n)}`. Each resulting context receives the substituted bounds and the conjoined constraint `ψδ ∧ φ`. (Definition 3.10 and the following paragraph, p. 13.)
4. Use `(Simplify)` with a rule `ℓ→r[φ]` (including calculation rules) when `ψ |=δ φ`; replace `C[ℓδ]` by `C[rδ]`. The side condition ensures every instance really satisfies the rule guard (Definition 3.6 and Example 3.7, p. 10).
5. Use `(Alter)` or `(Generalize)` when the current syntax does not expose a useful rule. In the running proof, `(Alter)` adds the definitions `i′=i−1` and `n′=n+1` as fresh variables in the constraint, so the calculation rules `i−1 → i′ [i′=i−1]` and `n+1 → n′ [n′=n+1]` can then be applied by `(Simplify)`. The bound inequalities needed by `(Alter)` follow from strong boundedness (Section 3.2, pp. 13–14).
6. Use `(Hypothesis)` only with `ℓ≃r[φ]∈H`, a valid guard entailment `ψ |=δ φ`, and three ordering conditions: `ς≻ℓδ[ψ]`, `ς≻rδ[ψ]`, and `ς⪰C[rδ][ψ]`. This replaces the selected occurrence by the other side of the hypothesis. `(H-Delete)` removes a context of the form `(ς ; C[ℓδ]≃C[rδ] ; τ)[ψ]` where `ℓ≃r[φ]∈H` and `ψ |=δ φ`, and needs only `ς≻ℓδ[ψ]` or `τ≻rδ[ψ]`. (Figure 1, p. 11.)
7. Use `(Semi-constructor)` to split `f s1…sn≈f t1…tn` into component equations when `n>0` and either `f` is a variable or `n<ar(f)`. Use `(Delete)` when the constraint is unsatisfiable or both sides are syntactically equal. `(Postulate)` adds a fresh unbounded goal `(• ; s≈t ; •)[ψ]` (a lemma); it does not have the Completeness Property, so it cannot be used on the path to a disproof (Lemma 3.16, p. 19).
8. Finish when `E` is empty. Theorem 3.4 says that a finite derivation `(E,∅)⊢* (∅,H)` proves every original equation inductive, under weak normalization and quasi-reductivity.

The paper’s worked example proves `recdown f n i a ≈ tailup f n i a` (Section 3.2, pp. 12–16). The derivation is: `(Induct)`, `(Case)` on `i<n` / `i≥n`, `(Simplify)` and `(Delete)`, `(Alter)` plus two calculation `(Simplify)` steps, `(Hypothesis)` with the induction hypothesis, a second `(Induct)`, `(Case)` on `i=n` / `i>n`, more `(Simplify)` and `(Alter)` steps, and finally `(H-Delete)`, which removes the last context. Its concrete strict requirement is (REQ1) `recdown f n i a ≻ f i (tailup f n i′ a)` under `i′=i−1 ∧ n′=n+1 ∧ i≥n`. The authors satisfy it by taking `≻` to be `(→R∪Q ∪ ▷)+`, where `Q` is the single rule `recdown f n i a → f i (tailup f n i′ a) [i′=i−1 ∧ n′=n+1 ∧ i≥n]`, noting that `→R∪Q` is terminating, which “can for instance be proved using static dependency pairs [GHKV24]” (p. 16). The paper’s second example is structural induction on lists (`rev`/`app`, pp. 16–18), which also uses `(Generalize)`, `(Semi-constructor)` and `(Postulate)`.

Verus form

Inference: In Verus, represent the executable recursion in ordinary Rust and state the equation as a `proof fn` with `requires` for `ψ` and `ensures` for equality. Use `decreases` on the recursive proof/function to express the well-founded decrease that Bounded RI records as `≻`. Use `assert` or `assert forall` to split arithmetic guards, and call previously proved proof functions as induction hypotheses. A Verus `spec fn` expresses the mathematical result; it cannot carry an `ensures` clause. The paper’s higher-order variables and rewrite-rule matching do not transfer directly: instantiate them with Rust closures/spec functions or specialize the theorem. These are inferences from the paper’s ordering and guard conditions, not constructions evaluated by the authors. The Verus-specific claims were not checked against Verus documentation.

evidence, assumptions, limits

The main result is a metatheorem (soundness and completeness proofs in Section 4), supported by a few worked examples and an implementation, not by a benchmark. Soundness is proved modularly in Section 4: all rules except `(Induct)` satisfy a base-soundness property, and all rules preserve bounds (Lemmas 4.2, 4.10–4.17; Theorem 4.18, pp. 22–29). The assumptions are material: weak normalization is needed for `(Alter)` completeness (p. 21) and for the soundness lemmas on `(Case)`, `(Generalize)` and `(Alter)` (Lemmas 4.11, 4.17); quasi-reductivity means every irreducible ground term is a semi-constructor term; and a chosen bounding pair must be well-founded. The paper says that “Bounded RI can be seen as a heuristic that provides guidance on which ordering requirements to impose” (Section 10, p. 50) and that a fully automatic process “will need to include a powerful lemma generation engine” (Section 8, p. 44). `(Generalize)`, `(Postulate)`, and the general case of `(Semi-constructor)` (variable head) lack the Completeness Property (Lemma 3.16, p. 19).

## technique 2: disproving non-equations

Use a complete proof state and derive a contradictory equation. A state is complete if it is the initial state, follows a complete state by a rule with the Completeness Property, or has `Ei ⊆ Ej` for an earlier complete `Pj` (Definition 3.17, p. 20). An equation `s≈t[ψ]` is contradictory (Definition 3.18, p. 20) if some ground substitution respecting `ψ` makes either (1) `s` and `t` instances headed by different symbols `f ≠ g` that are both under-applied (`n<ar(f)`, `m<ar(g)`), or (2) `s,t` theory terms with `[[(ψ∧s≠t)γ]]=⊤`. The `(Disprove)` rule yields `⊥`; Theorem 3.19 (p. 21) then states that, for a weakly normalizing, quasi-reductive, ground confluent LCSTRS, at least one original equation is not an inductive theorem. The worked example (Example 3.20, p. 21) uses the LCSTRS of Example 3.14, whose ground confluence is shown in Example 5.12. It starts from `G f k x≈H f n m x[k=n+m]`, applies `(Case)`, `(Simplify)`, `(Alter)` and `(Case)` again, reaches `x≈f x` under the constraint `n′≤0 ∧ n′=n−1 ∧ k<0 ∧ n>0 ∧ k=n+m`, which is contradictory by case (2), and concludes the equation is not an inductive theorem.

Inference: A Verus analogue is a proof of the negation of a specification for a concrete satisfying input, using a witness and `assert(lhs != rhs)`. This is a counterexample theorem, not an executable “disprove” primitive; Verus still requires the arithmetic and function semantics to be established.

## technique 3: critical-pair ground confluence

Generate overlaps of variable-disjoint renamings of rules, at every position of the left-hand side that is not a variable, where positions (Definition 5.1) include partial applications. An overlap `⟨ρ1,p,ρ2⟩` needs `σ = mgu(ℓ1, ℓ2|p)` with `σ(Var(φ1)∪Var(φ2)) ⊆ Val ∪ V`, a satisfiable `φ1σ ∧ φ2σ`, and, if `p = ϵ` and both rules are renamings of the same rule, `Var(r1)\Var(ℓ1) ≠ ∅`. The critical pair is `ℓ2[r1]pσ ≈ r2σ [φ1σ ∧ φ2σ]`; the paper retains the source as a critical peak `ℓ2[r1]pσ ← ℓ2σ → r2σ [φ1σ ∧ φ2σ]`. (Definitions 5.1–5.5, pp. 31–32.) The Critical Peak Lemma says that if `s →R t1` and `s →R t2`, then either `t1` and `t2` join, or the step pair is an instance of a critical peak under a context (Lemma 5.8, pp. 33–34). The Ground Critical Peak Theorem says a terminating LCSTRS is ground confluent if, for every critical peak `v1 ← u → v2 [φ]`, the context `(u ; v1 ≈ v2 ; u)[φ]` is R/∅/∅-bounded ground convertible for the bounding pair (Theorem 5.10, p. 36; proof pp. 36–38). Corollary 5.11 (p. 36) turns this into a test with Bounded RI for terminating, quasi-reductive systems: if `(E,∅)⊢*(∅,H)` for the set `E` of these contexts, then `R` is ground confluent. Example 5.12 does this for the `H` rules of Example 3.14 (single critical peak).

Inference: In Verus, critical-pair checking can be encoded as lemmas for each pair of Rust transition rules, with preconditions for overlapping guards and postconditions asserting a common state. This requires an explicit transition model; Verus does not automatically enumerate rewrite overlaps.

## technique 4: constructing the bounding pair

The paper gives two constructions. First (Section 6.1, pp. 38–39), choose a reduction ordering `⊐` (monotonic, well-founded partial order) that orients every rule instance (`ℓγ ⊐ rγ`), and define `a ≻1 b` if `a ⊐ b` or `a ▷ b`, `a ≻ b` if `a ≻1+ b`, and `a ⪰ b` if `a ≻1* b`. Alternatively, collect requirements into a rule set `Q`; if `R∪Q` terminates, then `→Q∪R+` is a reduction ordering, and the paper’s `(→R∪Q ∪ ▷)+` is used in the worked example. This may fail when a requirement is not a valid rule (different types on the two sides, or an applied variable in the left-hand side), which the paper handles by requiring only `sγ (→Q∪R ∪ ▷)+ tγ` and introducing helper constructors such as `inttolist`. It notes that this choice gives a pair satisfying Lemma 4.3, so strongly bounded contexts can be maintained and “substantially fewer ordering requirements” result.

Second (Section 6.2, pp. 39–42), separate top-level requirement steps from inner rewrite steps, so requirements need not be oriented by a monotonic relation. Assuming each requirement has the form `f ℓ⃗ ≻ r [φ]` or `f ℓ⃗ ⪰ r [φ]` with `f ∈ Σ`, build `REQS≻`, `REQS⪰`, lifted rules `R′`, the set `Defs`, candidate terms, and the dependency-pair-like sets `Pweak` and `Pstrong`. Lemma 6.2 (p. 40) proves that if no infinite strong chain exists, the resulting `(≻,⪰)` is a bounding pair that orients all requirements. Corollary 6.3 (p. 41) gives a sufficient test with a reduction triple (weak monotonicity only). The paper’s example: for `R = {f a → f b}` and `REQS = {b ≻ a}`, no reduction ordering orients the requirement (it would need both `f a ⊐ f b` and `f b ⊐ f a`), yet a bounding pair exists (p. 39). The paper notes that building reduction triples for higher-order constrained rewriting is future work (p. 42).

Inference: A Verus proof uses `decreases` measures or lexicographic tuples as the practical counterpart of `≻`; the dependency-pair chain test is an external termination argument, not a Verus construct. The paper reports an implementation (Cora, Section 8: user-supplied proof steps, SMT checks via Z3, termination of the requirements via the Section 6.1 strategy and [GHKV24]) and a page with savefiles of proofs of its examples, but no timings, benchmark set or success rate (Section 8, p. 44). Inference: there is therefore no empirical evidence in the paper that these constructions scale to agent-written Rust.

## what is proved and trusted

Proved: soundness of bounded RI, completeness of the restricted rules and disproof path under ground confluence, the critical-peak decomposition, and two sufficient bounding-pair constructions.

The paper reports no experimental counts or timings; its implementation (Cora) is interactive and “Currently, any proof by Bounded RI is (almost) completely human driven.” (Section 10, p. 49). On novelty, Section 9 (p. 47) says that Aoto’s earlier systems “already employed a bounding pair (≻, ⪰)” but differ in that “we do not orient induction hypotheses themselves”, and Section 1 states that RI with critical pairs for ground confluence was known only for first-order systems without constraints [AT16]. The contribution is the bounded, semantic reformulation with equation contexts and its LCSTRS extensions.

## techniques for the catalog

- bounded equation contexts — carry left and right upper bounds so induction hypotheses need only be applied below the current instance

- cover-set case splitting — split guarded equations with substitutions and constraints that cover every ground semi-constructor instance

- bounded hypothesis and deletion — rewrite or delete by an induction hypothesis only after explicit strict-bound checks

- disproof by contradictory equation — derive a concrete syntactic or theory contradiction from a complete proof state

- critical-peak confluence — enumerate higher-order guarded overlaps and prove each critical peak bounded ground convertible by bounded RI

- bounding-pair synthesis — derive a well-founded ordering from reduction rules or from a strong dependency-pair-chain test
