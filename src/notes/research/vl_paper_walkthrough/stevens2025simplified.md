# Simplified and Verified: A Second Look at a Proof-Producing Union-Find Algorithm
(authored by agents unless marked 🧑)
Tag: `stevens2025simplified`, [paper](https://doi.org/10.1007/978-3-031-99984-0_15)

## verified data structure
The paper formalises a Union-Find-Explain (UFE) structure in Isabelle/HOL. It produces equality certificates for congruence closure, a primitive used by SMT solvers. “We devise a simpler, more naive version of the explain operation whose soundness and completeness is easy to verify.” (abstract, page 1). The central design is to verify a simple functional algorithm first, prove the published efficient algorithm extensionally equal to it, then refine the result to executable imperative code.

## technique: proof-producing explain with explicit inference rules
Use this when a mutable algorithm must return a checkable proof, not only a yes/no answer. The proof datatype `eq-prf` has reflexivity, symmetry, transitivity, and assumption constructors. The authors prove: “We prove that ⊢= is sound and complete with respect to the equivalence relation induced by us.” (section 3, page 6).

Steps: represent input equalities as a list `us`; define `equivcl (set us)` as its equivalence closure; define certificate constructors; prove every derivation implies membership in the closure (soundness); prove every closure member has a derivation (completeness). In Verus (Inference), encode certificates as an enum datatype and write a recursive proof function whose `ensures` states that the certificate validates under `us`; prove soundness by structural recursion and completeness with a ghost path construction. The paper's Isabelle inference rules and closure theorems are the specification to port; Verus syntax and automation differ.

## technique: simple rollback algorithm
The simple `explain` examines the newest effective union. If the arguments are already equivalent after rollback, recurse on the shorter union list. Otherwise recurse on the two sides of the newest necessary equation and combine their certificates by transitivity. “The termination of explain is easily proven because the length of unions ufe decreases in each recursive call.” (section 3, page 7).

A partial wrapper first checks equivalence-closure membership and returns `Some (explain ...)` or `None`; this repairs the raw function's unsound behavior on unprovable inputs. Verus form (Inference): use a decreasing `usize` measure or a structurally shrinking sequence for recursion, and return `Option<Proof>` with `ensures` conditional on the equivalence predicate. Keep input validity and effective-union invariants as `requires` clauses.

## technique: efficient forest explanation and dual structures
The efficient algorithm stores each union as an annotation on a parent edge, finds the lowest common ancestor, and recursively explains only paths that separate the query elements. The paper reports: “All in all, this gives a O(k log n) explain operation on a UF data structure with union-by-size, where k is the number of unions required for an explanation.” (section 4, page 8). Path compression conflicts with explanation annotations, so the implementation maintains one structure with and one without path compression.

Steps: represent UF as rooted forest; annotate the edge created by each effective union; locate the LCA of `x,y`; choose the newest associated union on either path; recursively explain the two subpaths; combine with the annotated equality, using symmetry when the union lies on the `y` path. Prove termination from decreasing union age and prove equality to the simple algorithm. The paper states: “We obtain soundness and completeness by showing extensional equality of explain ′ and explain.” (section 4.2, page 13).

Verus form (Inference): represent parent pointers in a ghost map or sequence, maintain acyclicity and representative invariants, and prove each recursive call decreases a path or timestamp measure. Keep a non-compressed ghost forest for certificates and a compressed executable forest for near-constant `find`; prove their representatives agree.

## technique: refinement to imperative arrays and separation logic
The functional model is refined to Imperative HOL arrays. Heap assertions relate arrays to the abstract UFE state; the proof establishes a Hoare triple for the imperative partial explanation. “All our data structures are ultimately represented as arrays on the heap, so we ensure with heap assertions that the content of the arrays represents our data structures throughout the operations we perform on them.” (section 5.2, page 15).

The concrete record stores an integer parent array, an option array for associated-union indices, a dynamic array for the chronological union list, and a second path-compressed UF. Verus form (Inference): use `Vec` fields with ghost sequence models, `requires` ownership and representation predicates, and `ensures` preservation of the abstract relation. Rust mutation needs loop invariants for array bounds and parent-forest properties; the Isabelle separation-logic assertions are the conceptual map.

## performance, trust, and VL relevance
The paper benchmarks exported Standard ML against handwritten C++ using wide and balanced forests. It performs 1,000 explanations for the wide case and 100,000 for the balanced case, with `2^n` elements and query arguments uniformly drawn from `0 … 2^n−1` (section 6, page 16). It claims union-by-size gives O(log n) union/find and O(k log n) explanation; path compression makes executable union/find almost constant. The formal trust base includes Isabelle/HOL, Imperative HOL, the code generator, and the generated-language runtime. Inference: for Verus, the key threat is a mismatch between optimized mutable state and the proof-producing abstract state; dual representations and refinement invariants directly address it. Congruence-closure certificate semantics and the Isabelle refinement framework already exist, so VL should reuse the architecture rather than reimplement a new proof-producing UF theory.

## techniques for the catalog
- certificate inference rules: make proof objects explicit and prove soundness and completeness against equivalence closure
- rollback explanation: recursively remove newest unions to obtain a simple terminating certificate algorithm
- forest/LCA explanation: annotate parent edges and recurse only over paths needed for a query
- dual UF representations: retain an uncompressed proof forest alongside a compressed executable forest
- refinement with heap assertions: relate imperative arrays to an abstract functional data structure
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
