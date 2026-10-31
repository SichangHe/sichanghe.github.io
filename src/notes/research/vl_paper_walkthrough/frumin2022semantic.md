# Semantic cut elimination for the logic of bunched implications, formalized in Coq
(authored by agents unless marked 🧑)
Tag: `frumin2022semantic`, [paper](https://doi.org/10.1145/3497775.3503690)

## what is proved

Dan Frumin formalizes in Coq a semantic proof that every derivable sequent in the logic of bunched implications (BI) has a cut-free derivation (Theorem 6.8, p. 10: cut is admissible in the cut-free fragment). BI models ownership of resources and is a foundation for separation logic. The paper’s abstract says, “The logic of bunched implications (BI) is a substructural logic that forms the backbone of separation logic, the much studied logic for reasoning about heap-manipulating programs.” (Abstract, p. 1.) The result is obtained by interpreting sequents in a specially constructed universal algebra and then using soundness. The same construction is extended to a finite collection of simple structural rules (Section 7, p. 10; the abstract says “an arbitrary set”) and an S4-like box modality (Section 8).

The paper emphasizes why this organization matters: “This results in a more modular and elegant proof than a standard Gentzen-style cut elimination argument, which can be subtle and error-prone in manual proofs for BI.” (Abstract, p. 1.) It also reports the scope precisely: “We formalize the results in the Coq proof assistant, which is to our knowledge the first published formalization of cut elimination for BI.” (Section 1.1, pp. 2–3.) The formalization is at https://github.com/co-dan/BI-cutelim, git hash 93aa954, DOI 10.5281/zenodo.5770478 (Section 1.2, p. 3).

## technique: specify BI syntax and cut-free derivability

Use this when a resource-sensitive logic has nested contexts and structural rules that can act below arbitrary context holes.

1. Represent formulas with intuitionistic connectives, separating conjunction `*`, magic wand `-*`, the unit `Emp`, and atoms. Represent a context as a bunch: a tree whose binary nodes are multiplicative `,` or additive `;`, and whose leaves are formulas or the empty bunches `∅m` and `∅a` (Section 3, p. 4).
2. Bunches are morally equivalence classes of trees modulo commutative-monoid laws. The paper gives these as a structural congruence `≡` in Figure 1 (p. 5) and uses an explicit context-conversion rule `eqiv` instead of defining provability on equivalence classes (Section 3, p. 4).
3. Define the sequent judgment `Δ ⊢ φ` and its cut-free variant `Δ ⊢cf φ`; left and structural rules apply to formulas nested inside a bunched context `Δ(-)` (Section 3, p. 4; Figure 1, p. 5). The axiom rule is stated only for atoms; the general identity `φ ⊢cf φ` is derived (Proposition 3.1, p. 4).
4. Prove invertibility of the rules the semantic model needs: `-*R` and `→R` (Lemma 3.2, p. 4), and `∗L`, `∧L`, `EmpL`, `TrueL` (Lemma 3.4, p. 5). Corollary 3.5 (p. 5) collapses a bunch into a single formula on the left.

Inference: In Verus, these judgments would be ghost data types or specifications over an AST, with `proof fn` lemmas for structural congruence and derivability. Verus can check finite syntax transformations but does not supply Coq’s inductive proof objects or dependent derivation-height induction automatically.

Evidence and limits: BI’s explicit contraction makes plain structural induction insufficient for inverting `∗L`. The paper’s example is a premise `φ ∗ ψ ; φ ∗ ψ ⊢cf χ`: the first application of the induction hypothesis yields a proof that “is not a strict subderivation of the original derivation” (Section 3.1, p. 4). It therefore strengthens the statement and does induction on derivation height. The paper adds that Lemma 3.4 would be false with an axiom rule for arbitrary formulas, because `φ ∗ ψ ⊢cf φ ∗ ψ` would have height 0 while the smallest proof of `φ , ψ ⊢cf φ ∗ ψ` has height 1 (p. 5). This is a proof obligation, not a runtime experiment.

## technique: replace direct Gentzen reduction with a universal semantic algebra

Use when direct cut-reduction has many context cases or a known risk of missing a contraction case. The paper reports such a gap: a proof of cut elimination for BI in Pym’s book “had a gap, that was later fixed in [3]”, which “seems to arise from the treatment of the contraction rule” (Section 1, p. 2).

1. Seek an algebra `C` in which formula interpretations satisfy `⟦ψ⟧ ≤ ⟦φ⟧` only when `ψ ⊢cf φ` is derivable. The paper states, “The main idea is to find a particular algebra C, in which we can interpret the sequent calculus, and which has a property that if JψK ≤ JφK in C, then ψ ⊢ φ is derivable without applications of the cut rule.” (Section 2, p. 3.)
2. Interpret the ordinary sequent calculus soundly in any BI algebra: derivability implies the corresponding algebraic inequality (Theorem 4.3, p. 6).
3. Construct the special `C` (Section 6, pp. 7–10). Then cut admissibility follows (Theorem 6.8, p. 10): from `Δ ⊢cf ψ` and `Γ(ψ) ⊢cf φ`, soundness gives `⟦(Δ)*⟧ ≤ ⟦ψ⟧`; induction on `Γ` gives `⟦(Γ(Δ))*⟧ ≤ ⟦(Γ(ψ))*⟧ ≤ ⟦φ⟧`; and Theorem 6.7 turns this into `Γ(Δ) ⊢cf φ`.
4. This avoids a cut-reduction procedure. The abstract says, “In particular, our semantic approach avoids unnecessary inversions on proof derivations, or the uses of cut reductions and the multi-cut rule.” (Abstract, p. 1.) It does not remove height induction altogether: the invertibility lemmas of Section 3.1 still use it. The paper says, “In our proof we adapt the methods of algebraic semantic cut elimination for linear logic [33, 34]” (Section 1, p. 2), and that Galatos and Jipsen’s earlier method needs residuated frames, which this proof does without (Section 1, p. 2).

Inference: For Verus, this architecture suggests separating a semantic model from syntax proofs. A Rust verifier could specify an interpreter and prove soundness plus a reification theorem; it would not make the semantic inequality itself executable.

Evidence: The result is a Coq-formalized proof and is claimed as the first published formalization of cut elimination for BI. No benchmark denominator or performance comparison is supplied. The method’s further evidence is its extensions in Sections 7 and 8.

## technique: build a BI algebra from a strong Moore closure

Use when the free powerset model on bunches `℘(Bunch)` is not enough. The paper says that model “does not involve any notion of provability (only equivalence of contexts)” (Section 4.1, p. 6), and that the empty set cannot interpret `False` because `False ∉ ∅` (Section 2, p. 3). The model must be refined to a subalgebra.

1. Start with a partial commutative monoid `M` of resources. Its powerset forms a BI algebra with set intersection/union, monoidal composition, and a residuated wand (Section 4.1, p. 6).
2. Define a Moore collection `C` as sets closed under arbitrary intersections, or equivalently the fixed points of a closure operator `cl` that is extensive, monotone, and idempotent (Section 5, p. 6).
3. Define joins by closure of unions, meets by intersections, and implication through the largest closed subset of powerset implication, `int(X ⊃ Y)` (Propositions 5.3 and 5.4, pp. 6–7).
4. Require closure strength `cl(X) • Y ⊆ cl(X • Y)` (Definition 5.5). Lift the BI operations as `Emp = cl(0)`, `X * Y = cl(X • Y)`, and `X -* Y = cl(X -• Y)`, where `•` and `-•` are the powerset operations; prove the wand adjunction and the unit and associativity laws (Section 5.1, p. 7). Proposition 5.9 gives an alternative condition: the operator is strong iff `X -• Y` is closed whenever `Y` is closed.
5. Avoid a universe-level increase in type theory by defining the closure from basic closed sets `B` rather than quantifying over all closed sets (Section 5.1, “A remark on (im)predicativity”, p. 7).

Inference: In Verus, closure properties are naturally ghost predicates and lemmas. The resource monoid and closure operator would need explicit Rust models; quantification over arbitrary sets is mathematical specification, not an executable data structure.

Evidence: The paper proves Theorem 5.8 (p. 7): for a partial commutative monoid `M` and a strong closure operator on `℘(M)` such that `C` has Heyting implication, the closed sets form a BI algebra. This is a symbolic theorem with no empirical denominator. The impredicativity workaround is a concrete Coq type-theory constraint, not a performance claim.

## technique: instantiate the closure with cut-free provability

Use to obtain the universal model rather than an arbitrary semantic algebra.

1. For each formula `φ`, define its principal closed set `⟨φ⟩ = {Δ | Δ ⊢cf φ}` (Definition 6.1, Section 6.1, p. 8).
2. Define `cl(X)` as the intersection of all principal sets containing `X`, and define `C` as the fixed points of this closure (Section 6.1, p. 8).
3. Prove closure properties (Proposition 6.2, p. 8): `False` is in every closed set; closed sets are closed under weakening and contraction of bunches; and `Δ ∈ X` iff `(Δ)* ∈ X` (collapse). Use them to characterize meets (Proposition 6.3, p. 8) and the BI operations (summary, p. 9).
4. Prove that wand and Heyting implication remain closed (Lemma 6.4 and Proposition 6.5, Section 6.2, pp. 8–9). Lemma 6.4 uses invertibility of `-*R` and Corollary 3.5.
5. Interpret atoms as their principal sets and prove Okada’s property `φ ∈ ⟦φ⟧ ⊆ ⟨φ⟩` by induction on formulas (Lemma 6.6, Section 6.3, p. 9). Theorem 6.7 (p. 9): if `⟦(Δ)*⟧ ≤ ⟦φ⟧` holds in `C`, then `Δ ⊢cf φ`.

Inference: In Verus, this is best represented as ghost sets or predicates and proof lemmas; a product implementation should keep the model outside runtime code. The crucial proof is a reification bridge from semantic inclusion back to a syntax derivation.

Evidence and limits: The paper’s construction of `C` depends on the invertibility lemmas of Section 3.1 (Inference: so an error there would break the closure proofs). It proves cut admissibility for the specified BI calculus, not every separation logic or every operational semantics built on BI.

## technique: parameterize extensions and reuse the proof

Use when the logic evolves and the same cut-elimination argument should survive extensions. The paper gives a roadmap (Section 7, p. 10): re-verify invertibility of the left rules and of `→R` and `-*R`, check that the new rules are validated in `C`, and re-verify Okada’s property; a new connective also needs an interpretation on `C`.

1. Represent each simple structural rule as a tuple `({T1, …, Tm}, T)` of premise bunched terms and a conclusion term, where `T` is linear (every variable occurs at most once). Weakening `W;` is `({x1}, x1 , x2)` (Section 7.1, p. 10). The Coq signature `SIMPLE_STRUCT_EXT` has `rules` and a `rules_good` linearity proof (Section 9, p. 12).
2. An algebra validates the rule when `⟦T⟧(a) ≤ ⟦T1⟧(a) ∨ … ∨ ⟦Tm⟧(a)` (Section 7.2, p. 10). Soundness (Lemma 7.1), the description of `⟦T⟧` in `C` (Lemmas 7.2 and 7.3), and `C` validating all rules in `L` (Lemma 7.4) are on p. 11; cut admissibility for `BI+L` is Theorem 7.5, p. 11.
3. Add an S4-like `□` modality with rules `□R` and `□L` (Section 8, p. 11). Interpret it on `C` as `□X = cl({□Δ | Δ ∈ X})`, show `(C, □)` is a BIS4 algebra (Definition 8.1, Lemmas 8.3 and 8.4, p. 12), prove invertibility of `□L` by height induction (Lemma 8.2, p. 11), and check one extra case of Okada’s property (Lemma 8.5, p. 12; Theorem 8.6, p. 12).
4. In Coq, use an auxiliary inductive decomposition relation `Δ ⇝ ⟨Π(-) | Δ'⟩` (Figure 2, p. 13) that captures exactly when `Δ = Π(Δ')` (Lemma 9.1), to locate formulas inside arbitrary bunch contexts. Lemma 9.4 handles simple structural rules and Lemma 9.5 handles the box (Section 9, p. 13).

The formalization section says, “The trickiest proofs to formalize were the admissibility of the inverted rules (Lemma 3.4) in the cut-free sequent calculus.” (Section 9, p. 12.) The authors formalize only the cut-free calculus and prove cut admissible in it, rather than deriving it from a calculus with cut (Section 9, p. 12). To track derivation height they use a relation `proves : bunch → formula → nat → Prop` instead of a height function (Section 9, p. 12).

Inference: Verus can mirror this with recursive ghost predicates for context decomposition and reusable `proof fn` lemmas. It lacks Coq modules and dependent induction syntax, so the parameter boundary would be Rust traits or specification functions plus separate lemmas.

Evidence: The authors report minor, systematic modifications for both extension families (Abstract, p. 1; Section 1, p. 2: “the modifications that we do have to make are, in a way, systematic”). No quantitative success rate is given; the evidence is formal proof completion.

## techniques for the catalog

- cut-free syntax: encode bunched contexts, deep rules, atomic-only axioms, and strengthened derivation-height induction
- universal semantic algebra: obtain cut elimination from sound interpretation into a model universal for cut-free provability
- Moore closure BI model: lift powerset resource operations through a strong closure operator
- principal provability sets: generate the universal model from sets of contexts proving each formula cut-free
- extension parameterization: reuse closure and decomposition proofs for structural rules and an S4-like modality
