# Coming to Terms with Quantified Reasoning
(authored by agents unless marked 🧑)
Tag: `kovacs2016quantified`, [paper](http://arxiv.org/abs/1611.02908v1)

Page numbers below are PDF pages of the arXiv version (v1); Tables 2 and 3 are on p. 9, Table 1 and Figure 3 on p. 8.

## purpose and setting

Kovács, Robillard, and Voronkov address quantified first-order reasoning over finite term algebras, the logical model behind inductive data such as lists and trees. Their motivating verification example defines natural-number constructors `zero` and `succ` and a recursive `add`, and asks the prover to check `x ≠ zero ∨ y ≠ zero ⇒ add x y ≠ zero`, that is, a sum with a nonzero summand is nonzero (Section 1, p. 1). The paper reports two approaches: a finite conservative extension of the term-algebra theory and term-algebra-specific inference rules in a superposition prover. Its abstract states: “We implemented our work in the first-order theorem prover Vampire and evaluated it on a large number of algebraic data type benchmarks, as well as game theory constraints.” (Abstract, p. 1)

The target theory `TFT` is axiomatized by (A1) domain closure, (A2) distinctness, (A3) injectivity, and (A4) acyclicity, which is an infinite schema (Section 4.1, pp. 3–4). `TFT` is complete and decidable, and decidability needs formulas that contain only term-algebra symbols; with uninterpreted symbols added, the paper says the first-order theory of Σ-algebras is Π¹₁-complete when Σ contains at least one non-constant (Theorems 1 and 2, Section 4.2, p. 4). Inference: this boundary matters when translating Verus datatypes mixed with maps, arithmetic, or user-defined functions.

## technique 1: finite conservative extension with a proper-subterm predicate

what it is

Keep (A1)–(A3) and replace the infinite acyclicity schema (A4) with a binary predicate `Sub(s,t)`, meaning `s` is a proper subterm of `t`, and three axioms: (B1) `Sub(xi, f(x1,...,xi,...,xn))` for each constructor `f` and argument position `i`, (B2) transitivity, and (B3) `¬Sub(x,x)` (Section 5, p. 5). The authors state: “This extension relies on the addition of a predicate to describe the “proper subterm” relation between terms.” (Section 1, p. 2) The resulting theory is called `TF+T`. Theorem 3 says `TF+T` is a conservative extension of `TFT`: every theorem of `TFT` is a theorem of `TF+T`, and every theorem of `TF+T` that does not use `Sub` is a theorem of `TFT` (Section 5, p. 5). The proof of part 2 uses completeness of `TFT` and consistency of `TF+T`.

when to use it

Inference: Use this encoding when quantified datatype formulas must be combined with other first-order theories or uninterpreted symbols and a prover needs finitely many input axioms. The paper says the approach is complete for pure term-algebra formulas and can be used in any first-order theorem prover without modification (Sections 1 and 5, pp. 2, 5), so an ordinary superposition engine can use the axioms.

how to apply it

Inference: 1. declare each constructor and its arity (Section 4.1, p. 3)
Inference: 2. add the domain-closure, distinctness, and injectivity axioms A1–A3 (Section 4.1, pp. 3–4)
Inference: 3. add B1, B2, and B3 (Section 5, p. 5)
Inference: 4. translate the verification goal into clauses, negate it, and run complete superposition proof search (Section 5, p. 5; the paper says a superposition proof of a sentence F from the axioms of `TF+T` exists if and only if F holds in the Σ-term algebra)
Inference: 5. for a decision procedure on a pure formula, search for proofs of the formula and of its negation in parallel; completeness of `TFT` guarantees one succeeds (Section 5, p. 5)

Verus form (Inference:)

For a Verus `enum`, define a ghost recursive `spec fn subterm(a,b) -> bool` and prove constructor cases, transitivity, and irreflexivity as lemmas. Use datatype equality and recursive lemmas in place of a theorem prover's clause axioms. The conservative-extension theorem is not a Verus feature; it is an inference about how to structure ghost lemmas when a datatype proof also uses arithmetic or maps.

evidence and limits

The paper proves conservativity (Theorem 3, Section 5, p. 5) and notes that “the full first-order theory of term algebras with the subterm predicate is undecidable (Venkataraman 1987)”, so the finite encoding is a proof method, not a complete decision procedure for every extended formula (Section 5, p. 5). The paper also warns that the transitive nature of `Sub` “can impact the performance of provers negatively” and suggests replacing transitivity with `Sub(x, xi) → Sub(x, f(x1,...,xi,...,xn))` to get fewer inferences (Section 5, p. 6). Its Table 4 experiment (Section 7.5, p. 9) is consistent with that warning: acyclicity via theory axioms (including `Sub`) gave 9086 successful runs out of 90,000, versus 9602 for acyclicity simplification rules; the authors read this as evidence that the subterm-based axiomatization gives much larger search spaces. Inference: the encoding assumes the intended model is the finite, acyclic term algebra over the declared constructors.

## technique 2: superposition saturation with datatype theory axioms

what it is

The base engine is the superposition inference system `S`, parametrized by a simplification ordering and a well-behaved selection function. The paper states that `S` is sound and refutationally complete for first-order logic with equality (Section 3.1, p. 3). Provers try to saturate the input set, which the paper defines as to “build a set of formulas that contains S and is closed under inferences in S.” (Section 3.2, p. 3) If the empty clause is derived, the input is unsatisfiable. A fair inference selection strategy is needed to preserve completeness, and redundant clauses are deleted to reduce the search space (Section 3.2, p. 3). The inference rules of Figure 1 (p. 4) are resolution, superposition, and factoring, each in clause and equality forms.

when to use it

Inference: Use saturation for quantified equalities over constructors, especially when formulas include symbols outside the decidable pure term-algebra fragment. The paper says the approach can be combined with other theories and used on undecidable fragments (Sections 1 and 5, pp. 2, 5–6); Inference: termination and success are then empirical, not guaranteed.

how to apply it

Inference: 1. convert the theory axioms and the negated verification claim into clauses (Section 3.1, p. 3; Section 7.4, p. 8, where Sledgehammer problems carry “the negation of the goal”)
Inference: 2. choose a simplification ordering satisfying well-foundedness, stability under substitution, monotonicity, and the subterm property (Section 3.1, p. 3)
Inference: 3. choose a well-behaved selection function, which selects a negative literal or all maximal literals (Section 3.1, p. 3)
Inference: 4. saturate by the rules of Figure 1 with a fair inference selection strategy, deleting redundant clauses (Section 3.2, p. 3)
Inference: 5. conclude unsatisfiability when the empty clause is derived; otherwise the configured search did not finish or the input is satisfiable (Section 3.2, p. 3)

Verus form (Inference:)

Verus's SMT backend performs a related search internally, but users do not supply a saturation loop. The applicable lesson is to expose datatype constructor and destructor lemmas in small, trigger-friendly forms and to split large quantified goals into lemmas. There is no Verus construct corresponding to a custom clause selection function.

evidence and limits

The base calculus is sound and refutationally complete for first-order equality (Section 3.1, p. 3). The paper says a naive fair saturation algorithm “will not yield however an efficient theorem prover” because the clause set grows at every step, hence redundancy deletion (Section 3.2, p. 3). Inference: a failed Verus proof may reflect search shape rather than a false datatype property, but the paper does not establish a direct performance prediction for Verus.

## technique 3: constructor-specific simplification and deletion rules

what it is

The paper's Section 6 replaces the term-algebra axioms with rules that rewrite or delete clauses; these rules are implemented in Vampire (Section 7.1, p. 7).
- Distinctness (Section 6.2, p. 6): a literal `f(s) ≈ g(t)` with different constructors `f`, `g` is removed from its clause (a literal false in the theory), and a clause with `f(s) ≉ g(t)` is deleted (a theory tautology).
- Injectivity (Section 6.3, p. 6): a clause `f(s1..sn) ≈ f(t1..tn) ∨ C` is replaced by the clauses `si ≈ ti ∨ C`. The negative form `f(s1..sn) ≉ f(t1..tn) ∨ C` can become one clause `s1 ≉ t1 ∨ ... ∨ sn ≉ tn ∨ C` as a simplification under a clause-ordering condition.
- Acyclicity (Section 6.4, p. 7): `s ≈ t ∨ A` becomes `A`, and a clause containing `s ≉ t` is deleted, where `s` is a constructor subterm of `t`, defined as the smallest transitive relation under which each argument `ti` is a constructor subterm of `f(t1..tn)` for a constructor `f`. An additional rule, `t ≈ u ∨ A` giving `s ≉ u ∨ A`, is not a simplification, so the premise is kept.

Inference: these rules shrink the search space because they delete false literals and tautologies and replace clauses by smaller ones.

when to use it

Inference: Enable these rules when constructor equalities dominate the proof and ordinary axioms cause too many inferences. The paper reports that “adding simplification rules as described in Section 6 improves the behavior of the theorem prover.” (Section 7.4, p. 8) Limit: replacing the axioms by rules loses completeness. Section 6.1 gives ground examples (`f(a) ≈ b` with `g(a) ≈ b`, and `f(a) ≈ b` with `f(b) ≈ a`) that are unsatisfiable in term algebras but admit no superposition inference if the axiom is replaced by a rule, and Section 6.4 says the acyclicity rules are incomplete even for pure term-algebra formulas (p. 6–7).

how to apply it

Inference: 1. identify constructor symbols and compute constructor subterms (Section 6.4, p. 7)
Inference: 2. apply distinctness simplification to remove a false equality between different constructors, and deletion for the negated form (Section 6.2, p. 6)
Inference: 3. apply injectivity to replace an equality of equal-headed constructors with equalities of corresponding arguments (Section 6.3, p. 6)
Inference: 4. apply acyclicity simplification when a constructor subterm is asserted equal to its containing term, and deletion when the negated equality is a tautology (Section 6.4, p. 7)
Inference: 5. continue saturation after each simplification and retain only non-redundant clauses (Sections 3.2 and 6, pp. 3, 6–7)

Verus form (Inference:)

Inference: Write datatype lemmas such as `node(a)==node(b) ==> a==b` and constructor-disjointness lemmas, then invoke them explicitly in proof blocks. For recursive datatypes, prove a decreasing measure for subterm recursion instead of using an acyclicity inference rule. These are proof-structuring translations, not statements that Verus implements the paper's calculus.

evidence and limits

On the game problem (`k` from 1 to 7, so seven instances), Vampire with axioms plus rules (A+R) solves `k=6`, a formula with 12 alternated existential and universal quantifiers, in 8.19 seconds, against 31.57 seconds with axioms only (A); neither is solved at `k=7` (Table 1 and its discussion, p. 8). The paper's text says CVC4 can disprove the negated conjecture only for `k=1` and Z3 only for `k=1` or `k=2`, but Table 1 as printed shows 0.01 s for CVC4 at both `k=1` and `k=2`, so the text and the table disagree about CVC4. The paper also states that for this problem “the acyclicity rule plays no role in the proof”. Inference: the gain from (A) to (A+R) therefore comes from the other simplification rules, not from the acyclicity rules. The comparison is time on the stated cluster (two quad-core 2.4 GHz Intel processors and 24 GiB per node, Section 7.4, p. 8), not a correctness rate. For acyclicity specifically, Table 4 (Section 7.5, p. 9) reports, over 262 term-algebra problems and 90,000 runs per setting with a 30 second limit, 2030 solved runs with no acyclicity treatment, 9086 with theory axioms, and 9602 with simplification rules; 50 runs were solved only when acyclicity was off, so even the rules add overhead on some problems.

## technique 4: benchmark translation and solver comparison

what it is

The authors implement the subterm relation and simplification rules in Vampire, parse an extended SMT-LIB `declare-datatypes` syntax, and run two benchmark sets: Isabelle/Sledgehammer problems about functional programs and a parametrized game-theory problem (Sections 7.1–7.3, pp. 7–8). The Isabelle set originally included 4170 problems; 2869 contain at least one algebraic datatype and 2825 at least one co-algebraic datatype, some both (Section 7.4, p. 8). By replacing co-algebraic types with algebraic ones with similar constructors, they obtained 2112 new problems (Section 7.4, p. 8); Inference: 4170 + 2112 gives the 6282 problems used in Tables 2 and 3.

how to apply it

Inference: 1. encode constructors with `declare-datatypes` and assert the negated conjecture (Section 7.2, p. 7; Figure 3, p. 8)
Inference: 2. choose datatype axioms, simplification rules, and acyclicity mode (axioms, rules, or none) (Sections 7.2 and 7.5, pp. 7–8)
Inference: 3. fix a time limit and record solved counts and unique solves per solver; the paper's Table 3 uses a 120-second total limit for Vampire's combined strategies (Section 7.4, p. 8). The paper took the Z3 and CVC4 numbers on the Isabelle problems from earlier reporting (Reynolds and Blanchette 2015) and ran them itself only on the game problem, so same-environment runs are the protocol one would want, not what the paper did for the Isabelle set.
Inference: 4. separate algebraic-only, co-algebraic-only, and mixed cases, because for co-algebraic types Vampire omits the acyclicity axiom (Section 7.4, p. 8)

Verus form (Inference:)

evidence, trust, and implications

On the 6282 Isabelle problems, Table 3 (p. 9, Vampire with a combination of strategies, 120 seconds total) reports 1785 solved by Vampire, 1712 by CVC4, and 1663 by Z3. The rows are 3457 datatype-only, 1301 co-datatype-only, and 1524 mixed problems. Vampire uniquely solves 50 (23, 16, 11 across the rows), CVC4 four, and Z3 zero. Table 2 (p. 9, Vampire with a single best strategy) reports 1720 for Vampire, 1711 for CVC4, and 1665 for Z3. The paper says its implementation required “about 2,500 lines of C++ code.” (Section 7.1, p. 7) The paper cautions that Sledgehammer problems are not all provable, because “the lemmas selected by Sledgehammer are not sufficiently strong to prove the goal” in many cases (Section 7.4, p. 8), so solved counts are not a correctness rate.

## techniques for the catalog

- finite subterm extension: replace infinite acyclicity axioms with a conservative finite theory using a proper-subterm predicate
- superposition saturation: prove quantified datatype goals by fair clause saturation with redundancy deletion
- datatype simplification rules: use constructor distinctness, injectivity, and acyclicity rules to shrink proof search
- benchmarked solver configuration: compare datatype proof strategies on fixed corpora with explicit denominators and time limits
