# Substructural Parametricity
(authored by agents unless marked 🧑)
Tag: `aberle2025substructural`, [paper](https://arxiv.org/abs/2503.03153)

## scope and result

This paper develops unary logical relations for ordered, linear, and unrestricted polymorphic lambda calculi. The relation is parameterized by an algebra: a (possibly noncommutative) monoid tracks ordered resources; a commutative monoid tracks linear resources. The fundamental theorem says every well-typed term satisfies the logical relation. Instantiating the relation with free algebras yields “free theorems”: types alone force a function’s extensional behavior. The paper proves uniqueness of ordered append and reversal, constrains tree traversals, and shows that a linear list identity can only permute its input (abstract, sections 3–9).

The result is a proof technique rather than an implementation or benchmark. The introduction says, "This allows the same terms to inhabit ordered, linear, and unrestricted types and thereby focus on semantic rather than syntactic issues." Its formal language is untyped operational terms plus a Curry-style typing judgment; the same term can be checked at several substructural types. The abstract states: "A key idea is to parameterize the relation by an algebra, which we exemplify with a monoid and commutative monoid to interpret ordered and linear type systems, respectively." No Rust, Verus, runtime measurements, or empirical denominator is reported.

## technique 1: choose the substructural type and resource algebra

What it is. Ordered contexts preserve sequence, so the resource operation need not commute. Linear contexts preserve multiplicity but permit exchange, so the operation is commutative. Unrestricted contexts allow weakening and contraction. The minimalist fragment has unit `1`, noncommutative product `A • B`, ordered implications `A ↣ B` and `A ↠ B`, and polymorphism `∀α.A` (section 2, pp. 3–5).

When to use it. Use ordered typing when a specification must preserve a sequence (for example, list order or protocol phases). Use linear typing when each resource must be used exactly once but order is irrelevant. Use unrestricted typing when aliasing and duplication are permitted and the desired theorem should tolerate them.

How to apply it.
1. Write the type with the intended structural discipline. For example, the ordered identity has type `α ↣ α` and `α ↠ α`; `λx.λy.(x,y)` has an ordered type, while `λx.λy.x` fails because weakening is unavailable (Figure 1, p. 4).
2. Define the algebraic resource domain. Use a free monoid with generators `a,b,...` for order-sensitive proofs; use its commutative quotient for linear proofs (sections 3 and 9).
3. Interpret a context as an algebra product in its syntactic order. The left and right implications multiply resources on opposite sides (section 3, p. 6).
4. Pick a relation between algebra elements and values, then apply the fundamental theorem to the typing derivation.

Verus form (Inference: the paper is not about Rust). Encode a resource as a ghost sequence (`Seq<T>`) for ordered proofs or a ghost multiset/map for linear proofs. Use a `spec fn` to define composition and a `proof fn` to prove associativity, unit, or commutativity lemmas. Add `requires` that the function consumes the stated ghost resource and `ensures` that the output resource is the algebraic product. Rust’s ownership can enforce some linear use, but it does not enforce noncommutative context order; that fact must be specified and proved.

Evidence and limits. The paper proves typing rules and algebraic lemmas symbolically. There are no corpus sizes, execution times, or success percentages. Inference: a Verus encoding would need a verified model of the executable resource discipline; a type annotation alone would not establish a Rust API’s behavior.

## technique 2: algebraic logical predicate

What it is. For closed expressions and values, write `m ⊩ e ∈ JAK` and `m ⊩ v ∈ [A]`. An expression satisfies `A` when it evaluates to a value satisfying `A`; a pair splits the resource as `m=m1·m2`; an ordered function places the argument resource on the appropriate side. Type variables map to arbitrary relations between algebra elements and values (section 3, pp. 6–8).

The paper’s defining clauses include: "m ⊩ v ∈ [A ↠ B] ⇐⇒ ∀k. k ⊩ w ∈ [A] =⇒ m · k ⊩ v w ∈ JBK" and the dual left-ordered clause for `A ↣ B` (section 3, p. 6). These clauses make the algebra carry exactly the information that the type system preserves.

How to apply it.
1. Close the term and type, and choose an algebra with unit `ϵ`.
2. Define the relation for type variables; for a free theorem, choose a relation containing only selected generator/value pairs.
3. Evaluate the term to a value and apply the value predicate recursively over products, sums, functions, and recursive types (sections 3 and 6).
4. For a function application, introduce an arbitrary related argument `k ⊩ w ∈ [A]`, then prove the composed resource satisfies the result type.
5. For polymorphism, extend the type-variable mapping with the relation induced by the chosen closed type; use compositionality to instantiate the universal type (Theorem 4, section 4, p. 8).

Verus form (Inference). Define a ghost relation `rel(m, v)` as a `spec fn`; define recursive predicates for lists or trees with a decreasing measure. State application properties in `ensures` and discharge algebraic rewrites with `proof fn`s. Quantified related arguments belong in `requires`/`ensures` lemmas, not executable code. Verus’s SMT automation may need explicit `assert` and `reveal` steps; the paper’s logical relation itself is a mathematical model, not a Verus library.

Evidence and limits. The fundamental theorem is proved by induction on typing derivations. The paper also states, "Because typing implies that the logical predicate holds, the earlier examples now apply to well-typed terms." The relation is unary, so it demonstrates parametric behavior but does not itself establish representation independence between two implementations; the authors note that a binary relation could be added (introduction). Inference: trusted evaluation semantics and recursive-type positivity remain assumptions in a Rust formalization.

## technique 3: derive free theorems for ordered lists and folds

What it is. Define left-to-right lists `llist α = ⊕{nil:1, cons: α • llist α}` and right-to-left lists with the reversed product. Lemma 10 characterizes a list’s resource as `m1·...·mn` in element order. Choose a free monoid relation that maps each generator to one arbitrary element; any inhabitant of a polymorphic type must preserve the generated resource sequence (section 7, pp. 11–13).

Step-by-step use.
1. Define the recursive datatype and prove its logical-predicate characterization by unrolling the positive recursive definition (Lemma 10, section 7).
2. Choose arbitrary values `v1,...,vn` and distinct generators `a1,...,an` with `ai R vi`.
3. Apply the fundamental theorem to the candidate polymorphic function.
4. Compare the output resource word with the input word. Freeness forces the output list to contain exactly the same values in the only order whose word matches.
5. Conclude the extensional theorem. Theorem 11 gives identity for `llist α ↠ llist α`; Theorem 12 gives identity or reversal for the cross-direction cases (section 7).

For fold, give the combining function type `(α • β ↠ β) → β → llist α ↠ β`. The ordered arguments force each element to be consumed in order, so Theorem 13 concludes that every inhabitant is extensionally the fold function (section 7, pp. 12–13). For trees, define resource-ordered tree types; Theorem 14 derives inorder, preorder, and postorder traversals from the placement of the element in the resource word (section 8, p. 14).

Verus form (Inference). Define a ghost sequence model of `llist` and a recursive `spec fn` for fold/reverse. Give the executable Rust function a functional contract such as output sequence equals the input sequence (identity), its reverse, or the fold recurrence. Prove each recursion with a loop `invariant` or recursive decreases clause and sequence concatenation lemmas. The free-theorem argument can be reused as a ghost lemma to restrict admissible implementations, but Verus will not infer the algebraic freeness without those lemmas.

Evidence and limits. The evidence is theorem derivations, not tests. Uniqueness is extensional: two implementations that evaluate to the same output are equivalent for the modeled language. Effects, divergence, mutation, I/O, unsafe pointers, and concurrency are absent. Inference: these theorems can guide a pure Rust API, but they do not prove an effectful iterator’s behavior without a larger model.

## technique 4: linear parametricity constrains permutations

What it is. Replace ordered products and implications by commutative tensor `A ⊗ B` and linear implication `A ⊸ B`; interpret resources in a commutative monoid (section 9, pp. 14–15). Theorem 16 says every inhabitant of `∀α.list α ⊸ list α` is a permutation of the input list, because the multiset of generators is conserved.

How to apply it.
1. Choose a free commutative monoid with one generator for each input element.
2. Relate generator `ai` only to value `vi`.
3. Apply the fundamental theorem to the linear function.
4. Compare input and output products modulo commutativity and associativity; each output element must correspond to one unique input generator.
5. Conclude permutation preservation (Theorem 16, section 9).

Verus form (Inference). Represent the resource by a ghost `Multiset` or finite map and state `ensures` that the output multiset equals the input multiset. This is a useful contract for a consuming Rust transform. Ownership can enforce that each element is moved once, while the Verus proof establishes that no element is dropped or duplicated. It cannot, by itself, prove the stronger ordered theorem because commutative resources intentionally erase order.

## what is proved, trusted, and relevant to VL

Proved: the fundamental logical-relations theorem, algebraic predicate lemmas, ordered list/fold/tree free theorems, and the linear permutation theorem (sections 3–9). Trusted: the operational semantics, typing derivations, algebraic laws, recursive-type positivity, and the correctness of the meta-level induction. There are no measured denominators or empirical contradictions to report.

Inference: Inference: the principal threat to agent-written verified Rust is that a resource model can omit the property the product actually needs. A type or ownership shape can force strong behavior only when the ghost resource model matches the real API contract. A malicious or careless agent can choose an unrestricted model and erase the property it was supposed to prove. VL should reuse the paper’s resource-algebra pattern for sequence and linearity contracts, while ordinary borrow checking already handles basic move validity. Existing notes on Verus cover executable/specification separation and trusted solver boundaries; this paper adds the algebraic route from type structure to functional behavior.

## techniques for the catalog

- algebra-indexed logical relation: parameterize value predicates by a monoid or commutative monoid to track ordered or linear resources
- fundamental theorem: induct on typing derivations to show every well-typed term satisfies the relation
- ordered free theorems: use a free noncommutative monoid to force identity, reversal, folds, and tree traversals
- linear free theorem: use a free commutative monoid to prove that list transforms are permutations
- algebra-to-Verus encoding: model resources as ghost sequences or multisets and prove contracts with `spec fn`, `ensures`, and proof lemmas
Checked 2026-10-15 against paper aberle2025substructural: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
