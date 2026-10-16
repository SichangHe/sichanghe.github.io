# Complete Local Reasoning About Parameterized Programs Over Topologies (Extended Version)
(authored by agents unless marked 🧑)
Tag: `cheng2026local`, [paper](http://arxiv.org/abs/2605.15143v2)

## scope and result

Cheng and Farzan study safety verification for infinite-state parameterized concurrent programs whose processes communicate over many finite topologies. The goal is a universally quantified inductive invariant over topology nodes. The paper’s central claim is that, under uniform-local-finiteness and symmetry conditions, checking finitely many small programs is complete for checking the entire unbounded family. The abstract says, “The goal is to automatically produce a proof of correctness in the form of a universally quantified inductive invariant, where the quantification is over the nodes in the topology.” The authors implement the method as Mosaic, which emits constrained Horn clauses (CHCs) for a backend solver.

A topology is a finite logical structure with nodes and data-bearing local neighborhoods. A program transition at node v changes only the variables in its neighborhood. Safety is an initial-state condition plus an error condition. A parameterized family contains programs over a family of topologies with semantics preserved by local isomorphisms. A width-k generalized Ashcroft invariant has the form ∀ν1…νk. φ[ν1,…,νk], with no quantification over nodes inside φ (Sections 2–3, pp. 3–6).

The motivating pipeline has unbounded local/shared variables and a property relating data and global counters. The paper emphasizes that the family need not have a fixed number of global variables, which distinguishes it from classic thread-modular models.

## technique 1: finite-basis cut-off for universally quantified invariants

what it is and when to use it

A basis of rank k for a topology family is a finite set S such that every k-tuple of nodes in every topology embeds into some basis topology. Theorem 4.1 states: “if T contains a basis {Tj }j∈J of rank k + 1 as a subset, then for any Φ of width k and parameterized safety specification, Φ is an Ashcroft invariant for P if and only if it is an Ashcroft invariant for {Pj }j∈J” (Section 4, p. 6). Use this when a proposed invariant has bounded width and local behavior depends only on a bounded neighborhood.

how to do it

1. choose invariant width k
2. construct or enumerate a basis of rank k+1 whose embeddings cover every (k+1)-tuple in every topology
3. instantiate the parameterized program and safety specification on each basis topology
4. check initialization, inductiveness, and safety of Φ on every basis program
5. conclude that Φ is an invariant for the entire family exactly when all basis checks pass
6. alternatively, use Theorem 4.2 to compute one VData sentence whose validity is equivalent to Φ being an invariant (Section 4, pp. 6–7)

Verus form

Inference: encode the local state and topology as ghost sequences/maps, and write a fixed-width invariant as a Verus `spec fn` quantified over index tuples. Prove initialization, transition preservation, and error exclusion with `requires`, `ensures`, loop `invariant`, and proof functions. The finite-basis theorem can justify checking representative topologies only if the Rust model exposes the same local-isomorphism and extensibility assumptions. Verus itself will not infer the basis or prove that a chosen Rust topology family has it; those are external mathematical lemmas and trusted modeling decisions.

what it proves and limits

The cut-off is complete for the stated invariant class, not for arbitrary invariants or arbitrary safety properties. The paper notes that parameterized verification is generally undecidable and that some programs need richer invariants or ghost variables. A basis may grow rapidly with k and vocabulary size.

## technique 2: normalization by quantifier-free local types

what it is and when to use it

A free-form Ashcroft matrix can contain arbitrary topology terms. The authors exploit local symmetry to normalize it into a finite template. Under a finite vocabulary and uniform local finiteness, Lemma 5.2 gives finitely many quantifier-free k-types, each definable by a quantifier-free formula. Theorem 5.3 then guarantees that every Ashcroft assertion is equivalent to a normalized assertion of the same width (Section 5.1, pp. 7–9).

how to do it

1. push negations inward and split the matrix into topology-only and data-only formulas
2. replace each topology formula by a disjunction of type formulas α1,…,αm, one for each local symmetry class
3. convert to disjunctive normal form; disjoint types ensure at most one αr occurs per disjunct
4. choose bounded representative terms for every node in each neighborhood type
5. rewrite each data formula to use only those representatives, yielding a finite family of predicates φr over local data values
6. retain the resulting normalized Ashcroft assertion as the complete proof-search template (Section 5.1, pp. 8–9)

The pipeline example’s type-specific rewriting changes references such as `r(ν)` to a representative node such as `e` when the type equates them (Example 5.3, p. 9).

Verus form

Inference: represent each αr as a ghost predicate over node indices and each φr as a `spec fn` over the bounded local state. Use equality and map/sequence lookup lemmas to prove representative-term equivalence. The paper’s first-order Node/Data sorts and quantifier-free type oracle do not map directly to executable Rust; a finite-index encoding or an abstract topology model is needed. Keep normalization outside runtime code and prove only the resulting invariant obligations in Verus.

Evidence and limits

Normalization is complete under uniform local finiteness; without a finite vocabulary or bounded neighborhoods, the finite template argument fails. The implementation computes types by brute-force enumeration using manually calculated topology bounds, which the authors identify as an open efficiency problem (Conclusion, p. 17).

## technique 3: Hoare triples and data-domain entailment

what it is and when to use it

For a fixed topology and candidate Φ, the invariant is equivalent to a conjunction of local Hoare triples: initialization, transition preservation, and safety. Proposition 5.4 states that these triples are valid iff Φ is an Ashcroft invariant. Proposition 5.6 reduces a normal-form triple to entailment in the background data theory D, eliminating topology axiomatization (Section 5.2, pp. 9–10).

how to do it

1. instantiate the normalized predicate for every k-tuple of topology nodes
2. build an initialization triple `{init neighborhood} ε {Φ}`
3. for every node transition, build `{Φ} v {Φ}` while equating variables outside v’s neighborhood between pre- and post-state
4. build safety triples `{Φ} ε {¬error(w)}` for every error location w
5. substitute each local state µ(v) with a fresh data variable xv and µ′(v) with xv′
6. discharge each triple as a VData entailment modulo D (Proposition 5.6, p. 10)

Verus form

Inference: initialization maps to proving the postcondition from constructor assumptions; transition triples map to function contracts and loop invariants. Variables outside a transition’s footprint correspond to unchanged-state facts supplied by Rust ownership or explicit `ensures`. Data-domain lemmas can be written as Verus `proof fn`/`lemma` bodies, with executable state updates kept separate. Verus does not support the paper’s arbitrary first-order structures directly, so the topology abstraction must be encoded in supported Rust types.

Evidence and limits

This decomposition proves the candidate invariant only for the modeled transition relation. It assumes the transition formulas faithfully describe atomic actions and that the data solver is sound. It does not prove that a concrete Rust scheduler, allocator, or external library obeys that model.

## technique 4: CHC search for local invariant predicates

what it is and when to use it

The normalized template leaves unknown data predicates Inv_r. The authors encode initialization, transition, and safety constraints as CHCs. Theorem 5.7 states that the CHC system is satisfiable iff a width-k Ashcroft invariant exists for the program and specification (Section 5.3, pp. 10–11).

how to do it

1. enumerate quantifier-free k-types and their representative-term lists
2. create an unknown predicate Inv_r for each type, with arguments for its representative data values
3. add initialization clauses requiring every local initial state to satisfy the appropriate Inv_r
4. add transition clauses: Inv_r before a node action plus the action relation implies Inv_r after the action
5. add safety clauses: all Inv_r instances imply the negation of each local error condition
6. solve the finite CHC system; a satisfying interpretation instantiates the normalized invariant

The resulting invariant has the form of a disjunction over type predicates αr conjoined with Inv_r applied to representative data values (Theorem 5.7, p. 10).

Verus form

Inference: use CHC solving as an external invariant synthesizer, then translate each discovered Inv_r into a Verus `spec fn` and prove the same initialization, preservation, and safety obligations. A generated CHC interpretation is a candidate, not a Verus proof. Keep solver output and translation scripts in the trusted boundary until Verus checks the translated code.

Evidence and limits

CHC satisfiability is complete for the normalized Ashcroft template, but solver scalability is not guaranteed. Nonlinear arithmetic, large encodings, and backend failures can prevent a result even when an invariant exists.

## technique 5: downward closure and redundancy-aware Algorithm 1

what it is and when to use it

User-friendly topology families often lack a finite basis. The authors add all subprograms generated by up to k nodes, forming a downward closure CL(P,k). Theorem 6.2 gives conditions under which adding subprograms preserves safety; Proposition 6.3 says these substructures form a finite basis up to isomorphism under local uniform finiteness. Algorithm 1 generates CHCs directly from type representatives instead of constructing and pruning every small program (Section 6, pp. 11–12).

how to do it

1. choose width k and compute type representatives for k and k+1 tuples
2. for each k-type, add initialization clauses over its neighborhood
3. for each (k+1)-type and possible transition node, add preservation clauses using the global transition relation and local Inv predicates
4. for each 1-type, add safety clauses excluding error states
5. return the CHC system; Theorem 6.4 guarantees satisfiability iff a width-k invariant exists for CL(P,k+1)
6. use the bound on type count to estimate unknowns and clauses: the paper reports |QF-Types(T,k)| unknown predicates and O(|QF-Types(T,k+1)|) clauses (Section 6.2, p. 12)

Verus form

Inference: instantiate ghost substructures as bounded windows or topology fragments and reuse one local proof per isomorphism type. A Rust implementation must prove that every runtime transition is covered by one fragment and that initialization is extensible when substructures are embedded. This is a substantial model proof, not an automatic consequence of Verus ownership.

Evidence and limits

The algorithm relies on an oracle for quantifier-free types. For line topologies, the paper says instances with up to 2k+1 circle nodes suffice to enumerate types (Section 6.2, p. 12). The oracle and fragment closure are assumptions in the implementation.

## technique 6: complete encoding optimizations

The normalization template permits restrictions that remain complete. The paper introduces a parametric normalization with symmetric predicates and an indicator vector selecting type neighborhoods that form a basis. Optimizations include symmetry of formulas, selecting predicates fixed to true when their neighborhoods cover a basis, and skipping resource nodes (Section 7, pp. 12–15). Theorem 7.1 proves completeness for every permitted indicator vector.

Use these optimizations after constructing a complete template. Steps are: identify automorphisms of each type; enforce predicate symmetry under the induced data-variable permutation; select a basis-covering subset of types; omit redundant resource-node constraints; solve the reduced CHC system; and rely on Theorem 7.1 for completeness. The paper warns that a smaller encoding may still be harder for the backend solver.

Inference: translate only the selected predicates to Verus and retain proof lemmas for omitted cases via symmetry. Do not assume fewer clauses means faster Verus verification; measure solver time and proof maintenance separately.

## evidence, trusted assumptions, and VL implications

Mosaic evaluates 30 programs over rings, lines, grids, bounded-depth trees, and binary trees. It solves 26 of 30 benchmarks; among those, OPN wins 16 times, DPG 8, their combination 13, and the unoptimized Algorithm 1 4, counting ties (Section 9, p. 15). Four benchmarks remain unsolved: one needs nonlinear reasoning, one has an encoding that is too large, and one line plus one ring benchmark fail in the CHC solver. A width-2 grid case can require 347 small programs even with optimizations (Section 9, p. 16). These are counts over the stated 30-program benchmark set, not percentages of a larger corpus.

The formal theorems establish cut-off completeness, normalization equivalence, CHC correspondence, and downward-closure conditions. The conclusion states, “verification conditions do not require any axiomatization of the underlying topology family.” The experiments measure solved count and solve/generation time with Z3/Spacer (and Golem for one benchmark). Trusted components include the topology and transition models, the type oracle, CHC solver, and the assumption that universally quantified inductive invariants suffice. The authors explicitly note that some benchmarks do not admit such invariants and require richer invariants or ghost variables.

Inference: the method threatens VeruLaw only where agent-written verified Rust protocols have repeated local communication structure and a finite symmetry basis. It offers a principled way to synthesize bounded-width invariants and then discharge them in Verus. VL should not redo generic CHC invariant search; the valuable integration work is translating topology-local predicates into Verus state-machine invariants, measuring proof effort, and checking model fidelity for ownership, scheduling, and external resources.

## techniques for the catalog

- finite-basis cut-off: reduce a width-k parameterized invariant to complete checks on a rank-(k+1) topology basis
- local-type normalization: partition node tuples by quantifier-free symmetry types and rewrite invariants with bounded representatives
- data-domain Hoare reduction: turn initialization, transition, and safety triples into entailments over the data theory
- CHC invariant synthesis: solve unknown local predicates whose clauses encode normalized invariant obligations
- downward closure: add bounded subprograms to obtain a finite basis for topology families that lack one
- redundancy-aware CHC generation: enumerate type-level constraints directly with Algorithm 1
- complete optimizations: exploit predicate symmetry, basis-cover indicators, and resource-node skipping without losing completeness
- Verus adaptation: translate synthesized local predicates into `spec fn` contracts and prove each fragment plus the topology-model lemmas
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
