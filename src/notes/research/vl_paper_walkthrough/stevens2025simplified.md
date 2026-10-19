# Simplified and Verified: A Second Look at a Proof-Producing Union-Find Algorithm
(authored by agents unless marked 🧑)
Tag: `stevens2025simplified`, [paper](https://arxiv.org/abs/2504.10246)

## verified data structure
The paper formalises a Union-Find-Explain (UFE) structure in Isabelle/HOL, as a step towards verified proof-producing congruence closure. It verifies the first of Nieuwenhuis and Oliveras's two UFE variants, not their congruence closure algorithm (section 1.1, page 2; section 7, page 17). “We devise a simpler, more naive version of the explain operation whose soundness and completeness is easy to verify.” (abstract, page 1). The design verifies a simple functional explanation algorithm, proves the efficient explanation algorithm extensionally equal to it on valid equivalent inputs, then refines the structure to imperative code. Soundness for arbitrary queries requires a partial wrapper.

## technique: proof-producing explain with explicit inference rules
The proof datatype `eq-prf` has reflexivity, symmetry, transitivity, and assumption constructors; assumptions index the input equality list `us` (section 3, Figure 1, page 6). “We prove that ⊢= is sound and complete with respect to the equivalence relation induced by us, i.e. the equivalence closure of us.” (section 3, pages 5–6).

Steps: represent input equalities as a list `us`; define `equivcl (set us)` using symmetric closure followed by reflexive transitive closure; define certificate constructors and inference rules; prove every derivation implies membership in the closure and every closure member has a derivation (Theorem 1, page 6).

Inference: in Verus, encode certificates as an enum and define their validity under `us`. Separate the proof that valid certificates imply equality from the proof that the explanation algorithm constructs valid certificates. This ports the specification; it does not establish that Verus can reproduce Isabelle's automation.

## technique: simple rollback algorithm
The abstract UFE state contains an initial UF whose relation is a subset of identity, together with a chronological list of effective unions. Each union must use valid elements from different current equivalence classes; redundant unions are not recorded (section 3, page 6).

The simple `explain` examines the newest effective union. If the arguments already have equal representatives after rollback, it recurses on the shorter list. Otherwise it recursively proves the equalities on both sides of that union, combining their certificates with the assumption by transitivity, using symmetry when needed. An empty union list returns reflexivity. “The termination of explain is easily proven because the length of unions ufe decreases in each recursive call.” (section 3, page 7).

Theorem 2 establishes that equivalent inputs receive valid certificates. The raw function always returns a certificate, including for unprovable inputs. The partial wrapper checks equivalence-closure membership and returns `Some (explain ...)` or `None`. Lemma 2 implements this check using equality, domain membership, and equal representatives; literal equality also covers equal elements outside the UF domain (page 8).

Inference: a Verus version can use the shrinking union sequence as its recursion measure and return `Option<Proof>`, specifying exactly when a valid certificate is returned. Preserve the initial-state and effective-union invariants.

## technique: efficient forest explanation and dual structures
Each parent edge records the index of the effective union that created it. The efficient explanation finds the lowest common ancestor (LCA), then the newest associated union on the two paths to it. It recursively proves equalities between query elements and the chosen union's endpoints, combining certificates by transitivity and, for the union on the `y` path, symmetry (sections 4.1–4.2, pages 9–13). “All in all, this gives a O(k log n) explain operation on a UF data structure with union-by-size, where k is the number of unions required for an explanation.” (section 4, page 8). The paper attributes this bound to Nieuwenhuis and Oliveras; it does not present a formal complexity proof for UFE.

Path compression conflicts with the explanation forest, so the implementation maintains one UF with and one without path compression (section 4, page 9; section 5.2, page 15).

For correctness, section 4.2 assumes both query elements are in the UF domain and share a representative. The proof first shows that termination is preserved by effective unions using the behavior of LCA and newest-union searches, then proves termination by induction on UFE. It next proves invariance of the efficient explanation under effective unions and equality with the simple explanation, again by induction on UFE (Lemmas 6–7, Theorems 3–4, page 13). “We prove termination directly, while we obtain soundness and completeness by showing extensional equality of explain ′ and explain.” (section 4.2, page 12).

Inference: a Verus implementation could preserve an executable uncompressed explanation forest alongside a compressed UF and specify that their representatives agree. Its termination proof needs its own justification; the paper's formal proof proceeds by invariance and induction, rather than an explicit decreasing timestamp measure.

## technique: refinement to imperative arrays and separation logic
Union-by-size is introduced at the functional level. A single integer list represents roots by negative class sizes and other parent pointers by nonnegative indices (section 5.1, pages 13–14). The imperative refinement uses Imperative HOL and Lammich's separation logic framework. “All our data structures are ultimately represented as arrays on the heap, so we ensure with heap assertions that the content of the arrays represents our data structures throughout the operations we perform on them.” (section 5.2, page 14).

The concrete representation stores an integer UF array, an option array of associated-union indices, and a dynamic array of chronological unions. A further record adds the compressed UF; its assertion requires agreement of representatives. Theorem 5 gives total correctness of the imperative partial explanation and preservation of the representation assertion (page 15).

Inference: in Verus, use vector models and representation predicates to connect mutable arrays to the abstract state. Bounds and forest invariants would need explicit preservation proofs; the Isabelle heap assertions provide the specification to adapt.

## performance, trust, and VL relevance
Section 6 benchmarks exported Standard ML against handwritten C++ on wide and balanced forests. Each has `2^n` elements, with 1,000 and 100,000 explanation queries respectively, drawn uniformly from the element range (page 16). Table 1 reports wall-clock seconds on an Intel Core i7 4790k (page 17). The paper reports roughly 2–2.5 times overhead from arbitrary-sized integers, and roughly 2 times for unions and 1.5 times for explanations when comparing SML machine integers to C++ (page 16). These are observations on those workloads. Sound export with machine integers would require changing natural-number elements to fixed-width words, which is future work (page 17).

“Executing code exported from Isabelle depends on a substantial trusted computing base (TCB), including the target language’s compiler and runtime.” (section 1, page 2). Inference: for VL, the reusable architecture is a simple certificate specification, an efficient algorithm proved equivalent under explicit input assumptions, and representation invariants connecting mutable state to that specification. The paper establishes this architecture in Isabelle, not in Verus.

## techniques for the catalog
- certificate inference rules: make proof objects explicit and prove soundness and completeness against equivalence closure
- rollback explanation: recursively remove newest unions to obtain a simple terminating certificate algorithm
- forest/LCA explanation: annotate parent edges and select the newest associated union on either query path
- dual UF representations: retain an uncompressed explanation forest alongside a compressed UF with matching representatives
- refinement with heap assertions: relate imperative arrays to an abstract functional data structure
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The lemma below shows that ufa-lca is invariant under a union (a, b) if its arguments share the same representative beforehand."): checked all quotations, numbers, page and section references, and technique steps against the full paper; corrected quotation wording and locations, the termination argument, input assumptions, and scope of congruence closure, complexity, and machine-integer claims; replaced the link with the arXiv identifier in the paper and marked Verus/VL conclusions as Inference; did not inspect the formalisation or generated code, rerun benchmarks, or verify the proposed Verus adaptations.
