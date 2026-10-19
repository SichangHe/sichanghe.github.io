# L-Mosaics and Bounded Join-Semilattices in Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `linzi2025mosaics`, [paper](https://arxiv.org/abs/2509.19854v1)

## scope and result

This paper formalizes the object-level equivalence between L-mosaics and bounded join-semilattices in Isabelle/HOL. An L-mosaic has a set-valued operation; a bounded join-semilattice has a single-valued join and bottom. The bridge is the Nakano construction. The abstract states: “We present a complete formalization in Isabelle/HOL of the object part of an equivalence between L-mosaics and bounded join-semilattices, employing an AI-assisted methodology that integrates large language models as reasoning assistants throughout the proof development process.” (p. 1). Section 1 reports: “Our formalization consists of approximately 2,000 lines of Isabelle/HOL code organized across six interconnected theory files.” (p. 2). Inference: the file count is internally inconsistent: sections 3.1–3.5 name seven theory files (pp. 4–5).

Inference: this is a formalization workflow and algebraic encoding case study, not a systems-verification result. It supplies patterns for Verus specifications of set-valued relations, uniqueness, and derived operations, but it contains no Rust or Verus code.

## technique 1: layered locales for algebraic structures

What it is. `BJoinSemilattices.thy` defines a locale with carrier set `L`, operation `sup`, bottom `bot`, closure, associativity, commutativity, idempotence, and bottom laws (section 3.1, p. 4). `Mosaics.thy` and `Lmosaics.thy` layer a basic multivalued magma into a mosaic and then an L-mosaic, adding commutativity and four axioms (section 3.2, p. 4). Isabelle locale assumptions make the relevant hypotheses available in each proof context.

Inference: When to use it. Use a layered context when several structures share a carrier and operation but add laws incrementally. It keeps theorem dependencies explicit and avoids repeating assumptions.

Inference: How to do it. (1) Declare the carrier and operations as locale parameters. (2) Add closure and algebraic laws as assumptions. (3) Define derived order and prove generic properties in the base locale. (4) Extend the locale with multivalued or reversibility axioms. (5) Interpret the extended locale for each concrete construction (sections 3.1–3.3). The paper’s L-mosaic axioms include `lm1_e`, `lm1_id`, `lm2`, `lm3`, and a unique-existence condition `lm4` (section 3.2, p. 4).

Verus form. Inference: encode a structure as a Rust ghost state or specification record, with set membership represented by a predicate such as `spec fn in_carrier(x) -> bool`. Put laws in `requires` clauses of proof functions or as separate lemmas. Verus has no Isabelle locale command, so inheritance is replaced by explicit lemma parameters and reusable predicates. Keep executable data separate from ghost specifications.

Evidence and limits. Section 5.4 says: “The strategic use of locale assumptions significantly reduced proof burden by automatically making relevant hypotheses available in appropriate contexts.” (p. 8). Inference: this supports the organizational pattern, but the paper supplies no measured proof-time or defect-rate comparison.

## technique 2: represent multivalued operations with sets

What it is. L-mosaic multiplication maps two elements to a nonempty set. The formalization treats operation results with set membership, closure, intersections, and unions. The authors write: “One of the primary challenges in the formalization was handling multivalued operations in a type-safe manner.” (section 5.1, p. 6).

Inference: When to use it. Use set-valued relations when an operation is nondeterministic or intentionally returns all admissible results, such as transition systems or abstract nondeterministic APIs.

Inference: How to do it. (1) Define `mul x y` as an element set. (2) State membership and closure conditions for every input in the carrier. (3) Define left and right multiplication over sets. (4) Prove intersection/union lemmas needed by diagonal and reversibility axioms. (5) Use set membership to express existence and uniqueness rather than selecting an arbitrary result (sections 3.2 and 5.1).

Verus form. Inference: represent the set extensionally by a `spec fn member(x, y, z) -> bool`; prove closure with quantified `forall` facts and use `assert` to instantiate them. If a finite executable set is needed, prove that its contents satisfy the specification. Verus’s quantifier triggers and solver behavior may require auxiliary lemmas; Isabelle set notation does not transfer directly.

Evidence. Section 5.1 says: “We addressed this by systematically using set-theoretic constructions and establishing comprehensive libraries of lemmas for manipulating multivalued operations.” (p. 6). Inference: this is a methodological report without a lemma count or an independent replication.

## technique 3: Nakano construction from a bounded join

What it is. Given a bounded join-semilattice, define the multivalued operation
`Nak_mul x y = {z ∈ L. x sup y = x sup z ∧ x sup y = z sup y}` (section 3.3, p. 5). The construction’s reversibility map is identity. Interpretation lemmas prove that it satisfies mosaic and L-mosaic axioms.

Inference: How to do it. (1) Assume carrier closure, associative/commutative/idempotent join, and bottom. (2) Define `Nak_mul` by the two join equalities. (3) Prove every returned z lies in L. (4) Establish nonemptiness and each L-mosaic axiom by rewriting with join laws (section 3.3). (5) Interpret the locale to obtain an L-mosaic instance.

Verus form. Inference: define `spec fn nak_member(x, y, z) -> bool` as carrier membership plus the two equality conditions. Prove a function returning a witness only when existence is established; otherwise keep the operation relational. `ensures` can state membership and closure, while `proof fn` lemmas establish commutativity and diagonal properties. Verus’s `choose` support and executable witness representation must be checked against the actual project API; do not assume Isabelle’s Hilbert choice syntax carries over.

Evidence. Theorem 4.1 states: “Every bounded join-semilattice gives rise to an L-mosaic via the Nakano construction, and this construction preserves the essential order-theoretic properties.” Section 4 adds: “The formalization provides complete mechanized proofs of these results.” (p. 6). These are the paper’s claims; the repository theories were not independently checked for this study.

## technique 4: recover a join by diagonal uniqueness

What it is. `LMosaic To BJoin.thy` extracts a single-valued join from an L-mosaic. The induced order is `x ≤ y` iff `x ∈ y ⊕ y`; the join is the unique element satisfying diagonal and membership conditions (section 3.4, p. 5). Section 3.4 says: “This was proved via antisymmetry using the upper-bound and leastness lemmas in a standard order-theoretic argument.” (p. 5). This sentence refers to associativity of the derived join.

Inference: How to do it. (1) Define the induced order from diagonal membership. (2) Use the unique-existence axiom to select the candidate `x ⊔ y`. (3) Prove x and y are below it. (4) Prove leastness against any common upper bound. (5) Derive commutativity and idempotence from the L-mosaic laws. (6) Prove associativity by antisymmetry: both `(x⊔y)⊔z` and `x⊔(y⊔z)` are least upper bounds of the same set (section 3.4).

Verus form. Inference: define `le(x,y)` as a specification predicate and state upper-bound and leastness lemmas. A deterministic executable join needs a representation and a proved uniqueness theorem; otherwise use a ghost witness or relation. Verus can prove associativity from two leastness inequalities and antisymmetry, but the proof script must use valid `assert`, `ensures`, and lemma calls rather than Isabelle’s locale or choice syntax.

## technique 5: equivalence and AI-assisted proof development

The final two theories are reported to prove that the forward and reverse transformations are mutual inverses (section 3.5, p. 5). Section 5.2 reports using LLMs to suggest lemma statements, tactic combinations, and missing intermediate steps (p. 7). It cautions: “However, all AI-generated suggestions required careful verification and adaptation, as the tools occasionally proposed syntactically correct but logically flawed approaches.” (p. 7).

## what is proved, trusted, and missing

The reported formal result covers the stated Isabelle locales, definitions, and mutual-inverse theorems. Theorem 4.3 states: “The functors between the category of L-mosaics and the category of bounded join-semilattices are mutually inverse.” (section 4, p. 6). Inference: that claim is broader than the abstract’s explicit “object part”; the paper presents no morphism definitions or proofs, so this study credits the object constructions and their reported mutual-inverse properties.

Section 5.3 says: “The use of Hilbert’s choice operator (THE) in Isabelle/HOL was crucial for defining the inverse constructions, allowing us to extract the unique elements guaranteed by the existence and uniqueness conditions in the L-mosaic axioms.” (p. 7). Inference: unique selection and its proof obligations are the transferable pattern; this study does not independently establish the paper’s further claim about the axiom of choice. Trust in the formal encoding and Isabelle/HOL is assumed, rather than independently audited here. The paper claims reduced development time but reports no measured engineering effort, proof maintenance, or executable performance.

## techniques for the catalog

- layered algebraic locales: organize shared carrier laws and specialized axioms into reusable proof contexts
- set-valued operation encoding: model multivalued results with membership, closure, and set-theoretic lemmas
- Nakano construction: derive an L-mosaic relation from join equalities in a bounded join-semilattice
- diagonal join recovery: obtain a least upper bound from unique diagonal membership in an L-mosaic
- mutual-inverse formalization: prove forward and reverse constructions equal through dedicated equivalence theories
- AI-assisted interactive proving: use LLM lemma and tactic suggestions only after machine checking and human adaptation
