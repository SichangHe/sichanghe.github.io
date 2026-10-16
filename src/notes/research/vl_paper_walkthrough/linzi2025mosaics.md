# L-Mosaics and Bounded Join-Semilattices in Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `linzi2025mosaics`, [paper](http://arxiv.org/abs/2509.19854v1)

## scope and result

This paper formalizes the object-level equivalence between L-mosaics and bounded join-semilattices in Isabelle/HOL. An L-mosaic has a set-valued operation; a bounded join-semilattice has a single-valued join and bottom. The bridge is the Nakano construction. The paper states: “We present a complete formalization in Isabelle/HOL of the object part of an equivalence between L-mosaics and bounded join-semilattices.” (abstract, p. 1). The development is approximately 2,000 Isabelle lines across six theory files (section 1, p. 2).

Inference: this is a formalization workflow and algebraic encoding case study, not a systems-verification result. It supplies patterns for Verus specifications of set-valued relations, uniqueness, and derived operations, but it contains no Rust or Verus code.

## technique 1: layered locales for algebraic structures

What it is. `BJoinSemilattices.thy` defines a locale with carrier set `L`, operation `sup`, bottom `bot`, closure, associativity, commutativity, idempotence, and bottom laws (section 3.1, p. 3). `Mosaics.thy` and `Lmosaics.thy` layer a basic multivalued magma into a mosaic and then an L-mosaic, adding commutativity and four axioms (section 3.2, pp. 4–5). Isabelle locale assumptions make the relevant hypotheses available in each proof context.

Inference: When to use it. Use a layered context when several structures share a carrier and operation but add laws incrementally. It keeps theorem dependencies explicit and avoids repeating assumptions.

Inference: How to do it. (1) Declare the carrier and operations as locale parameters. (2) Add closure and algebraic laws as assumptions. (3) Define derived order and prove generic properties in the base locale. (4) Extend the locale with multivalued or reversibility axioms. (5) Interpret the extended locale for each concrete construction (sections 3.1–3.3). The paper’s L-mosaic axioms include `lm1_e`, `lm1_id`, `lm2`, `lm3`, and a unique-existence condition `lm4` (section 3.2, p. 4).

Verus form. Inference: encode a structure as a Rust ghost state or specification record, with set membership represented by a predicate such as `spec fn in_carrier(x) -> bool`. Put laws in `requires` clauses of proof functions or as separate lemmas. Verus has no Isabelle locale command, so inheritance is replaced by explicit lemma parameters and reusable predicates. Keep executable data separate from ghost specifications.

Evidence and limits. The paper reports all definitions and proofs as machine checked but gives no proof-time or defect-rate denominator. Isabelle’s classical logic and locale machinery remain trusted foundations; the paper does not establish that the informal source theorem itself captures every intended application.

## technique 2: represent multivalued operations with sets

What it is. L-mosaic multiplication maps two elements to a nonempty set. The formalization treats operation results with set membership, closure, intersections, and unions. The authors write: “One of the primary challenges in the formalization was handling multivalued operations in a type-safe manner.” (section 5.1, p. 6).

Inference: When to use it. Use set-valued relations when an operation is nondeterministic or intentionally returns all admissible results, such as transition systems or abstract nondeterministic APIs.

Inference: How to do it. (1) Define `mul x y` as an element set. (2) State membership and closure conditions for every input in the carrier. (3) Define left and right multiplication over sets. (4) Prove intersection/union lemmas needed by diagonal and reversibility axioms. (5) Use set membership to express existence and uniqueness rather than selecting an arbitrary result (sections 3.2 and 5.1).

Verus form. Inference: represent the set extensionally by a `spec fn member(x, y, z) -> bool`; prove closure with quantified `forall` facts and use `assert` to instantiate them. If a finite executable set is needed, prove that its contents satisfy the specification. Verus’s quantifier triggers and solver behavior may require auxiliary lemmas; Isabelle set notation does not transfer directly.

Evidence. The paper says it developed “comprehensive libraries of lemmas for manipulating multivalued operations” and that locales were “essential for organizing the hierarchical structure” (section 5.1, p. 6). These are methodological claims; no count of lemmas or independent replication is reported.

## technique 3: Nakano construction from a bounded join

What it is. Given a bounded join-semilattice, define the multivalued operation
`Nak_mul x y = {z ∈ L. x sup y = x sup z ∧ x sup y = z sup y}` (section 3.3, p. 5). The construction’s reversibility map is identity. Interpretation lemmas prove that it satisfies mosaic and L-mosaic axioms.

Inference: How to do it. (1) Assume carrier closure, associative/commutative/idempotent join, and bottom. (2) Define `Nak_mul` by the two join equalities. (3) Prove every returned z lies in L. (4) Establish nonemptiness and each L-mosaic axiom by rewriting with join laws (section 3.3). (5) Interpret the locale to obtain an L-mosaic instance.

Verus form. Inference: define `spec fn nak_member(x, y, z) -> bool` as carrier membership plus the two equality conditions. Prove a function returning a witness only when existence is established; otherwise keep the operation relational. `ensures` can state membership and closure, while `proof fn` lemmas establish commutativity and diagonal properties. Verus’s `choose` support and executable witness representation must be checked against the actual project API; do not assume Isabelle’s Hilbert choice syntax carries over.

Evidence. The paper’s Theorem 4.1 claims every bounded join-semilattice gives an L-mosaic and calls the proofs complete machine checked (section 4, p. 5). The evidence is Isabelle acceptance of the repository theories; no external model or numerical evaluation is supplied.

## technique 4: recover a join by diagonal uniqueness

What it is. `LMosaic To BJoin.thy` extracts a single-valued join from an L-mosaic. The induced order is `x ≤ y` iff `x ∈ y ⊕ y`; the join is the unique element satisfying diagonal and membership conditions (section 3.4, p. 5). The paper emphasizes that “while the multivalued operation ⊕ of an L-mosaic is not associative, the induced operation ⊔ is precisely the least upper bound operation” (section 3.4, p. 5).

Inference: How to do it. (1) Define the induced order from diagonal membership. (2) Use the unique-existence axiom to select the candidate `x ⊔ y`. (3) Prove x and y are below it. (4) Prove leastness against any common upper bound. (5) Derive commutativity and idempotence from the L-mosaic laws. (6) Prove associativity by antisymmetry: both `(x⊔y)⊔z` and `x⊔(y⊔z)` are least upper bounds of the same set (section 3.4).

Verus form. Inference: define `le(x,y)` as a specification predicate and state upper-bound and leastness lemmas. A deterministic executable join needs a representation and a proved uniqueness theorem; otherwise use a ghost witness or relation. Verus can prove associativity from two leastness inequalities and antisymmetry, but the proof script must use valid `assert`, `ensures`, and lemma calls rather than Isabelle’s locale or choice syntax.

## technique 5: equivalence and AI-assisted proof development

The final two theories prove that the forward and reverse transformations are mutual inverses (section 3.5, p. 5). The paper reports using LLMs to suggest lemma statements, tactic combinations, and missing intermediate steps, while humans checked and adapted every suggestion (section 5.2, p. 6). It cautions that tools “occasionally proposed syntactically correct but logically flawed approaches.” (section 5.2, p. 6).

Inference: for VL, use agents to propose proof scaffolding but require Verus to discharge every obligation and preserve a reviewable contract. Track which lemmas were machine-generated and test that proofs still pass after specification changes.

## what is proved, trusted, and missing

The formal result covers the stated Isabelle locales, definitions, and mutual-inverse theorems. Trusted components include Isabelle/HOL’s logic, set and locale libraries, the axiom of choice used through Hilbert’s `THE`, and the correctness of the formal encoding. The paper explicitly says Hilbert’s choice was “crucial for defining the inverse constructions” (section 5.3, p. 7). It does not measure engineering effort, proof maintenance, or executable performance.

Inference: threat to agent-written verified Rust is low and indirect. The useful risk lesson is that an AI can produce a plausible but logically flawed proof strategy, and set-valued specifications can hide underspecified behavior. VL should not redo generic claims that locales, set-valued relations, canonical joins, mutual-inverse proofs, and AI lemma suggestions are useful; a new result needs Rust/Verus semantics or systems evidence.

## techniques for the catalog

- layered algebraic locales: organize shared carrier laws and specialized axioms into reusable proof contexts
- set-valued operation encoding: model multivalued results with membership, closure, and set-theoretic lemmas
- Nakano construction: derive an L-mosaic relation from join equalities in a bounded join-semilattice
- diagonal join recovery: obtain a least upper bound from unique diagonal membership in an L-mosaic
- mutual-inverse formalization: prove forward and reverse constructions equal through dedicated equivalence theories
- AI-assisted interactive proving: use LLM lemma and tactic suggestions only after machine checking and human adaptation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
