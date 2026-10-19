# Complete Local Reasoning About Parameterized Programs Over Topologies (Extended Version)
(authored by agents unless marked 🧑)
Tag: `cheng2026local`, [paper](http://arxiv.org/abs/2605.15143v2)

## scope and result

Cheng and Farzan study safety verification for infinite-state parameterized concurrent programs over finite communication topologies. The abstract says, “The goal is to automatically produce a proof of correctness in the form of a universally quantified inductive invariant, where the quantification is over the nodes in the topology.” The cut-off theorem requires the topology family to contain a basis of rank k+1 for an invariant of width k (Theorem 4.1, p. 6). Finite vocabulary and uniform local finiteness support the finite normalization template used for synthesis (Lemma 5.2, pp. 7–8). Mosaic emits constrained Horn clauses (CHCs) for a backend solver (Section 9, p. 14).

A topology is a finite logical structure with nodes and data-bearing local neighborhoods. A program transition at node v changes only the variables in its neighborhood. Safety is an initial-state condition plus an error condition. A parameterized family contains programs over a family of topologies with semantics preserved by local isomorphisms. A width-k generalized Ashcroft invariant has the form ∀ν1…νk. φ[ν1,…,νk], with no quantification over nodes inside φ (Sections 2–3, pp. 3–6).

The motivating pipeline has unbounded local/shared variables and a property relating data and global counters. The paper emphasizes that the family need not have a fixed number of global variables, which distinguishes it from classic thread-modular models.

## technique 1: finite-basis cut-off for universally quantified invariants

what it is and when to use it

A basis of rank k is a set S of topologies such that, for every k-tuple in a topology T of the family, some basis topology embeds into T with an image containing that tuple. Definition 4.1 does not require the basis to be finite or contained in the family. Theorem 4.1 requires containment and equates invariant validity on the basis programs with validity on the entire family. Theorem 4.2 additionally requires a given finite basis for a computable finite check (Section 4, pp. 6–7). Inference: use this reduction for a bounded-width candidate invariant after establishing the basis prerequisite.

how to do it

1. choose invariant width k
2. provide a finite basis of rank k+1 contained in the family, whose embeddings into each topology cover every (k+1)-tuple
3. instantiate the parameterized program and safety specification on each basis topology
4. check initialization, inductiveness, and safety of Φ on every basis program
5. conclude that Φ is an invariant for the entire family exactly when all basis checks pass
6. alternatively, use Theorem 4.2 to compute one VData sentence whose validity is equivalent to Φ being an invariant (Section 4, pp. 6–7)

Verus form

Inference: encode the local state and topology as ghost sequences/maps, and write a fixed-width invariant as a Verus `spec fn` quantified over index tuples. Prove initialization, transition preservation, and error exclusion. Supply proofs of local symmetry and basis coverage to justify representative checks. Extensibility is additionally needed when using Theorem 6.2 to infer safety of added subprograms from safety of the original family; it is not a prerequisite of Theorem 4.1. This paper does not implement or evaluate a Verus translation.

what it proves and limits

The cut-off is complete for the stated invariant class, not for arbitrary invariants or arbitrary safety properties. The paper notes that parameterized verification is generally undecidable and that some programs need richer invariants or ghost variables. A basis may grow rapidly with k and vocabulary size.

## technique 2: normalization by quantifier-free local types

what it is and when to use it

A free-form Ashcroft matrix can contain arbitrary topology terms. The authors exploit local symmetry to normalize it into a finite template. Under a finite vocabulary and uniform local finiteness, Lemma 5.2 gives finitely many quantifier-free k-types, each definable by a quantifier-free formula. Theorem 5.3 then guarantees that every Ashcroft assertion is equivalent to a normalized assertion of the same width (Section 5.1, pp. 7–9).

how to do it

1. push negations inward to obtain a positive Boolean combination of topology formulas and data formulas applied to node values
2. replace each topology formula by a disjunction of type formulas α1,…,αm, one for each local symmetry class
3. conjoin with the disjunction of all αr and convert to disjunctive normal form; discard inconsistent type combinations and group by type so each branch has exactly one αr
4. choose bounded representative terms for every node in each neighborhood type
5. rewrite each data formula to use only those representatives, yielding a finite family of predicates φr over local data values
6. retain the resulting normalized Ashcroft assertion as the complete proof-search template (Section 5.1, pp. 8–9)

The pipeline example’s type-specific rewriting changes references such as `r(ν)` to a representative node such as `e` when the type equates them (Example 5.3, p. 9).

Verus form

Inference: represent each αr as a ghost predicate over node indices and each φr as a `spec fn` over the bounded local state. Use equality and map/sequence lookup lemmas to prove representative-term equivalence. The paper’s first-order Node/Data sorts and quantifier-free type oracle do not map directly to executable Rust; a finite-index encoding or an abstract topology model is needed. Keep normalization outside runtime code and prove only the resulting invariant obligations in Verus.

Evidence and limits

Normalization preserves width under finite vocabulary and uniform local finiteness (Theorem 5.3, p. 8). The implementation computes types by brute-force enumeration using manually calculated topology bounds. The authors state, “The technical problem of necessary/sufficient conditions that guarantee efficient computability of quantifier-free types remains open.” (Section 11, p. 17).

## technique 3: Hoare triples and data-domain entailment

what it is and when to use it

For a fixed topology and candidate Φ, the invariant is equivalent to a conjunction of local Hoare triples: initialization, transition preservation, and safety. Proposition 5.4 states that these triples are valid iff Φ is an Ashcroft invariant. Proposition 5.6 reduces a normal-form triple to entailment in the background data theory D, eliminating topology axiomatization (Section 5.2, pp. 9–10).

how to do it

1. instantiate the normalized predicate for every k-tuple of topology nodes
2. for each k-tuple w, build `{conjunction of init(v) over all nodes v} ε {φ[w]}`
3. for every transition node v and k-tuple w, build `{Φ} v {φ[w]}`; the transition relation equates variables outside v’s neighborhood between pre- and post-state
4. build safety triples `{Φ} ε {¬error(w)}` for every error location w
5. substitute each local state µ(v) with a fresh data variable xv and µ′(v) with xv′
6. discharge each triple as a VData entailment modulo D (Proposition 5.6, p. 10)

Verus form

Inference: initialization maps to proving the postcondition from constructor assumptions; transition triples map to function contracts and loop invariants. Variables outside a transition’s footprint correspond to unchanged-state facts supplied by Rust ownership or explicit `ensures`. Data-domain lemmas can be written as Verus `proof fn`/`lemma` bodies, with executable state updates kept separate. Verus does not support the paper’s arbitrary first-order structures directly, so the topology abstraction must be encoded in supported Rust types.

Evidence and limits

Inference: this decomposition proves the candidate invariant for the modeled transition relation. Applying it to Rust also requires justification that the implementation obeys that model; the paper supplies no Rust scheduler, allocator, or external-library proof.

## technique 4: CHC search for local invariant predicates

what it is and when to use it

The normalized template leaves unknown data predicates Inv_r. The authors encode initialization, transition, and safety constraints as CHCs. Theorem 5.7 equates syntactic satisfiability with existence of a width-k Ashcroft invariant for the program and specification (Section 5.3, p. 10). A syntactic solution assigns each unknown a formula in the data vocabulary, rather than an arbitrary relation (Section 2, p. 4).

how to do it

1. enumerate quantifier-free k-types and their representative-term lists
2. create an unknown predicate Inv_r for each type, with arguments for its representative data values
3. for each k-tuple, add an initialization clause whose premise conjoins init(v) over all topology nodes
4. for each transition node and post-state k-tuple, conjoin all pre-state Inv instances with the global action relation, and imply the appropriate post-state Inv instance
5. add safety clauses: all Inv_r instances imply the negation of each local error condition
6. seek a syntactic solution to the finite CHC system; its defining formulas instantiate the normalized invariant

The resulting invariant has the form of a disjunction over type predicates αr conjoined with Inv_r applied to representative data values (Theorem 5.7, p. 10).

Verus form

Inference: use CHC solving as an external invariant synthesizer, then translate each discovered Inv_r into a Verus `spec fn` and prove the same initialization, preservation, and safety obligations. A generated CHC interpretation is a candidate, not a Verus proof. Keep solver output and translation scripts in the trusted boundary until Verus checks the translated code.

Evidence and limits

Theorem 5.7 establishes correspondence with syntactic solutions; it does not guarantee solver termination. Section 9 reports failures attributed to nonlinear reasoning, large encodings, and backend solvers (p. 15).

## technique 5: downward closure and redundancy-aware Algorithm 1

what it is and when to use it

User-friendly topology families often lack a finite basis contained in the family. The authors form CL(P,k) by adding subprograms generated by k not necessarily distinct nodes. Theorem 6.2 states that safety of the enlarged family implies safety of the original family; the converse requires extensible initial conditions. Extensibility means every initial state on a substructure extends to an initial state of the containing topology. Proposition 6.3 gives a basis finite up to isomorphism under finite vocabulary and uniform local finiteness. Algorithm 1 generates CHCs directly from type representatives (Section 6, pp. 11–12).

how to do it

1. choose width k and obtain type representatives for 1-, k-, and (k+1)-tuples
2. for each k-type, add initialization clauses over its neighborhood
3. represent each (k+1)-type as (v0,w), where v0 executes and w is the post-state k-tuple; build preservation clauses on N(v0,w), conjoining all pre-state Inv instances over that neighborhood
4. for each 1-type represented by w, conjoin all Inv instances over N(w) and imply ¬error(w)
5. return the CHC system; Theorem 6.4 equates syntactic satisfiability with existence of a width-k invariant for CL(P,k+1)
6. use the bound on type count to estimate unknowns and clauses: the paper reports |QF-Types(T,k)| unknown predicates and O(|QF-Types(T,k+1)|) clauses (Section 6.2, p. 12)

Verus form

Inference: instantiate ghost substructures as bounded windows or topology fragments and reuse one local proof per isomorphism type. A Rust implementation must prove that every runtime transition is covered by one fragment and that initialization is extensible when substructures are embedded. This is a substantial model proof, not an automatic consequence of Verus ownership.

Evidence and limits

The algorithm assumes an oracle enumerating all quantifier-free types. For the line family in Figure 1, instances with up to 2k+1 circle nodes suffice for k-types (Section 6.2, p. 12; Corollary A.2, p. 21). Mosaic requires an input interval of topology instances assumed to contain all (k+1)-types; its enumeration bounds are manually calculated (Section 9, p. 14; Section 11, p. 17).

## technique 6: complete encoding optimizations

Theorem 7.1 permits symmetric data predicates and an indicator vector selecting neighborhoods that form a basis of rank k. Predicates for unselected types may be fixed to true. To simplify Algorithm 1, the selected neighborhoods must form such a basis for CL(P,k+1) (Section 7.1, pp. 12–13).

OPN uses one unknown predicate per neighborhood up to isomorphism, rather than per quantifier-free k-type (Section 7.2, p. 13). DPG uses distinct process nodes as generators. It assumes resource nodes execute no code, their neighborhoods contain no process nodes, and each resource belongs to some process neighborhood. It skips resource generators and executing nodes, excludes repeated generators, and replaces the safety loop by checks on substructures generated by k distinct process nodes with a distinguished error node (Section 7.3, p. 13). These changes preserve completeness under the stated assumptions. The paper cautions, “a smaller encoding is not necessarily always easier to solve for the backend solver.” (Section 9, p. 15).

Inference: translate only the selected predicates to Verus and retain proof lemmas for omitted cases via symmetry. Do not assume fewer clauses means faster Verus verification; measure solver time and proof maintenance separately.

## evidence, trusted assumptions, and VL implications

Mosaic evaluates 30 programs over rings, lines, grids, bounded-depth trees, and binary trees. It solves 26 of 30 benchmarks; among those, OPN wins 16 times, DPG 8, their combination 13, and the unoptimized Algorithm 1 4, counting ties (Section 9, p. 15). Four benchmarks remain unsolved: one needs nonlinear reasoning, one has an encoding that is too large, and one line plus one ring benchmark fail in the CHC solver. A width-2 grid case can require 347 small programs even with optimizations (Section 9, p. 16). These are counts over the stated 30-program benchmark set, not percentages of a larger corpus.

The formal theorems establish cut-off completeness, normalization equivalence, CHC correspondence, and downward-closure conditions. The conclusion states, “Hence, verification conditions do not require any axiomatization of the underlying topology family.” (Section 11, p. 17). The experiments use Z3/Spacer except for BT4, which uses Golem, on a MacBook Air M1 with 16 GB RAM. Generation and solving each receive a 600-second timeout. Mosaic's winning configuration is chosen by solve time, with generation time breaking ties (Appendix D.2, pp. 28–29). Section 9 also reports excluded benchmarks requiring richer invariants or ghost variables (p. 16).

Inference: applying the method requires confidence in the topology and transition models, complete type enumeration, the solver, and any translation into another verifier. Existence of a bounded-width Ashcroft invariant limits completeness; it is not an assumption needed for soundness of a proof that is found.

Inference: the method threatens VeruLaw only where agent-written verified Rust protocols have repeated local communication structure and a finite symmetry basis. It offers a principled way to synthesize bounded-width invariants and then discharge them in Verus. VL should not redo generic CHC invariant search; the valuable integration work is translating topology-local predicates into Verus state-machine invariants, measuring proof effort, and checking model fidelity for ownership, scheduling, and external resources.

## techniques for the catalog

- finite-basis cut-off: reduce a width-k parameterized invariant to complete checks on a rank-(k+1) topology basis
- local-type normalization: partition node tuples by quantifier-free symmetry types and rewrite invariants with bounded representatives
- data-domain Hoare reduction: turn initialization, transition, and safety triples into entailments over the data theory
- CHC invariant synthesis: solve unknown local predicates whose clauses encode normalized invariant obligations
- downward closure: add bounded subprograms to obtain a finite basis for topology families that lack one
- redundancy-aware CHC generation: enumerate type-level constraints directly with Algorithm 1
- complete optimizations: use one predicate per neighborhood and distinct process generators under the stated basis and modeling prerequisites
- Inference: Verus adaptation could translate synthesized predicates into `spec fn` contracts and prove the fragment and topology-model obligations
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The output encoding is in SMT-LIB2 format and can be passed to a variety of existing CHC solvers [6, 20, 23]."): checked the full text including appendices, quotations, numbers, section/page references, and technique steps; corrected embedding direction, basis prerequisites, normalization, Hoare and CHC premises, syntactic satisfiability, closure assumptions, and optimization details; did not reproduce experiments, inspect the artifact, or validate the proposed Verus adaptations.
