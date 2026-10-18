# Transport via Partial Galois Connections and Equivalences (Extended Version)
(authored by agents unless marked 🧑)
Tag: `kappelmann2023transport`, [paper](https://arxiv.org/abs/2303.05244)

## purpose and core contribution

The paper develops an Isabelle/HOL framework for reusing functions proved over one representation type on another representation or abstraction type. Lists and finite sets are the motivating case; the abstract also names subtypes and quotients as motivating cases, and the framework handles partial domains and dependencies between function arguments (Sections 1 and 3). Its central abstractions are partial Galois connections/equivalences and relational lifting (relators). The abstract states: “Multiple types can represent the same concept.” (abstract, p. 1) The author (a single author, Kevin Kappelmann) formalizes closure under dependent function relators, datatypes, and composition in Isabelle/HOL, then implements a prototype (Section 5) that synthesizes transported terms and correctness theorems.

Inference: this is a refinement/abstraction technique relevant to VeruLaw when the same verified operation must be exposed through list, tree, map, or quotient representations. The paper is Isabelle/HOL, so the Verus mapping below is an inference. Its formal theorems assume relations, transport functions, and side conditions are correctly supplied; automation does not discover semantic correspondence by itself.

## technique: relation-based transport of operations

Start with a relation identifying representation values. In the example, `LFS xs s := to_fset xs = s` relates a list to the finite set of its elements. Prove that a representation operation respects the relation: if two lists denote the same set, `max_list` returns equal values. Supply a right-to-left function `to_listfin` that, in the paper's words in the introduction, “returns an arbitrary list containing the same elements as the given set” (p. 2), and prove the two directions of the equivalence (equation 2). Define the abstract operation by transport: `max_fset s := max_list (to_listfin s)`. The correctness theorem states that related inputs produce related/equal outputs (equations 1–4, p. 2).

Inference: the numbered procedure below is the study's synthesis of the example in Section 1 and the six expectations in Section 2, not a procedure stated verbatim in the paper.
1. Choose left and right relations `L` and `R` describing meaningful correspondence, including partial domains (Section 2, pp. 5–7).
2. Provide left/right transport functions `l` and `r`.
3. Prove relation compatibility and similarity of each input with the round trip through the transport functions.
4. Define the target operation by applying the transport function to the original operation.
5. Register a theorem that relates the old and new operations; use rewriting to replace either representation.

The paper warns why ordinary type equivalence is insufficient: list-to-set and representative-list functions are not mutual inverses, and the target relation may be partial. One of the six minimum expectations listed in Section 2 is: “Terms related on one side have transports that are related on the other side.” (Expectation (4), Section 2, p. 6)

Verus form (Inference): model each representation with a Rust type and define a ghost relation `rel(a,b)`. Implement a ghost conversion in each direction and prove round-trip relation lemmas. For an operation `f` on the concrete type, define an abstract wrapper `g` using the representative conversion. Prove `rel(a,b) ==> result_rel(f(a), g(b))` in a Verus proof function. Keep conversions ghost or executable according to the cost; the relation and theorem are what preserve correctness. Do not assume equality of representations when only extensional equivalence is available.

## technique: partial Galois connections and equivalences

The framework generalizes a Galois connection to partial relations. With left relation `≤L`, right relation `≤R`, and functions `l` and `r`, the partial Galois property requires `x ≤L r y ↔ l x ≤R y` only when x and y lie in the respective relation domains (equation 15, Section 3.4, p. 9). Add monotonicity of `l` and `r` to obtain a partial Galois connection (equation 16). Require connections in both directions for a partial Galois equivalence (equation 17). Preorder and partial-equivalence-relation (PER) variants add reflexivity/transitivity or symmetry/transitivity on the relevant domains.

Use Galois relations as the generic similarity relation: `Galois(≤L)(≤R) r x y` means y is in the right codomain and `x ≤L r y` (equation 14, p. 9). This subsumes partial quotient types; Lemma 2 states that a partial quotient type is exactly a Galois equivalence between its induced PER and equality (p. 10).

Verus form (Inference): encode `≤L`/`≤R` as `spec fn` predicates and `l`/`r` as pure specification functions. Prove adjunction as a lemma with `requires` that inputs lie in the relation domains and `ensures` giving both implications. Prove monotonicity separately. A partial relation should be explicit in preconditions; silently applying a conversion outside its domain would invalidate the transported theorem.

## technique: dependent function relators for argument dependencies

A nondependent function relator says related inputs map to related outputs. The paper's dependent relator lets the output relation depend on both input values: `[x y :: R] ⇛ S f g := ∀x y. R x y → S(f x)(g y)` (equation 10, p. 8). A function is monotone from R to S if it maps R-related inputs to S-related outputs; the monotone function relator additionally requires both related functions to be monotone, and the relational if conditional adds a guard `B` (equations 11–13, p. 8).

This handles operations whose validity depends on another argument. Integer subtraction transported to natural subtraction requires `i1 ≥ i2`; list indexing requires `i < length xs`. The paper's Isabelle example declares dependent relations for both arguments and invokes `trp` on subtraction and array indexing (Section 5, Example 2, p. 16). The closure theorem (Theorem 1, p. 12) requires four monotonicity conditions: output relations are antitone in one parameter and monotone in the other, while dependent transport functions are monotone in both. The paper states that verifying closure of Galois connections and equivalences is “nuanced, requiring careful alignment of the dependent variables’ parameters” and that these alignments require the monotonicity conditions (Section 4.1, p. 12); it does not state them as necessary conditions.

Inference: the steps below are the study's synthesis; the paper gives the theorem and the `trp` usage, not this list.
1. Identify every cross-argument precondition (bounds, ordering, ownership, or matching key).
2. Put that precondition in the dependent relation, not in an informal comment.
3. Prove the base partial equivalences for each argument type.
4. Prove the four monotonicity/compatibility obligations.
5. Apply the dependent function closure theorem to synthesize the transported function and similarity theorem.

Verus form (Inference): use `requires` clauses for bounds and cross-argument conditions, e.g. `i < xs.len()` and a relation between two indices. Define a relational postcondition over both arguments. A wrapper function can call the concrete implementation after converting the representation, with a proof lemma that the dependency is preserved by conversion. The dependency must remain in the specification; an unconstrained `usize` index is not transportable merely because the element types correspond.

## technique: closure under datatypes and compositions

For an n-ary natural functor with mapper `mapF` and relator `relF`, lift base relations componentwise: `L := relF(≤L1)…(≤Ln)`, `R := relF(≤R1)…(≤Rn)`, and transport functions with `mapF l1…ln` and `mapF r1…rn` (equation 22, Section 4.2, p. 13). Theorem 3 proves closure for Galois connections, Galois equivalences, and their preorder and PER variants; Theorem 4 shows the induced similarity relation is exactly the functor relator applied to component similarities.

For composition, ordinary Galois connections need the middle relations to coincide. The paper instead constructs compatible relations by composing the Galois relator (L1/) of the first connection, the middle relation (≤L2), and the Galois relator (R1/) of the reverse connection: `L := (L1/) ◦ (≤L2) ◦ (R1/)`, `R := (R2/) ◦ (≤R1) ◦ (L2/)`, with transports `l2 ◦ l1` and `r1 ◦ r2` (equation 23, Section 4.3, p. 14). Theorems 5 and 6 require Galois equivalences (preorder or PER variants) and that the middle relations commute, (≤R1)◦(≤L2) = (≤L2)◦(≤R1); Remark 2 (p. 30) explains why a plain Galois connection would not suffice. The construction retains only those elements for which the composed transports stay in domain and codomain.

Verus form (Inference): prove per-field relation lemmas for structs, sequences, trees, and maps; combine them with recursive representation invariants. For composed conversions, define a ghost relation as relational composition and prove domain closure before using the composed wrapper. Commutation is an explicit lemma, not a general property of arbitrary conversions.

## technique: automated proof-assistant transport

The Isabelle/ML prototype `trprover` registers base equivalences and applies closure theorems to build complex equivalences. The `trp` command takes a term and optional target relations, opens two goals (an equivalence and domain membership), and on success registers a transported term plus similarity theorems (Section 5, p. 15). The current prototype is deliberately incomplete: it supports PER equivalences, does not automate composition closure, and handles only a fragment of dependent relators. The authors state: “The prototype is currently restricted to equivalences on partial equivalence relations (PERs) for pragmatic reasons.” (Section 5, p. 15)

Examples transport `max_list` to finite sets and sets, integer subtraction to natural subtraction under an ordering dependency, list indexing to immutable arrays under bounds, and operations between Isabelle/Set copies (Section 5, pp. 15–16). These are proof-assistant automation demonstrations, not runtime benchmarks; the paper reports no count of generated theorems, proof times, or success rate denominator.

Verus form (Inference): a macro or library can register a pair of conversion lemmas and generate wrapper proof obligations. Because Verus does not provide Isabelle's relator package, the safe design is explicit traits/spec functions plus reusable relation lemmas. Automation should produce proof goals for domain membership and compatibility rather than insert unchecked axioms.

## evidence, assumptions, and product relevance

The formal evidence is the Isabelle/HOL formalisation: closure theorems for dependent functions, arbitrary natural functors, and composition, with a prototype and supplementary AFP entry (abstract, p. 1; footnote 3, p. 4; Sections 4–5, pp. 10–17; Appendix B, pp. 24–32). No empirical denominator or percentage is given. Trusted assumptions include Isabelle/HOL logic, the supplied base equivalences, relation-domain proofs, monotonicity, and commutation conditions. Inference: the paper's introductory finite-set example is correct only because `to_listfin` returns a list representing the set and `max_list` respects that relation.

Inference: the main threat to VeruLaw is representation drift. If an agent changes a verified list implementation to a tree or quotient without a proved relation, old lemmas no longer apply. The framework provides a disciplined checklist: define a partial relation, prove both transport directions and domain closure, lift through dependent functions/data structures, then register a wrapper theorem. It does not prove that two arbitrary Rust types represent the same concept, nor does it handle effects, mutation, or concurrency without additional relational specifications. Existing VL work should avoid redoing ad-hoc list/tree conversion lemmas once a Verus relator library has these closure rules.

## techniques for the catalog

- relation-respecting transport — define left/right relations and conversion functions, then prove an operation's outputs correspond
- partial Galois equivalence — use domain-restricted adjunctions and monotonicity to transport across partial representations
- dependent function relator — encode cross-argument preconditions such as bounds and ordering in the output relation
- datatype relator closure — lift equivalences through lists, trees, maps, and other natural functors via map/relator laws
- compatible composition — compose conversions through commuting middle relations while preserving domains
- proof-assistant transport automation — register base equivalences and generate transported terms plus domain and similarity obligations

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "This is not the case for partial Galois connections, which makes the transport of proofs harder."): read the whole paper text (arXiv v6, main text pp. 1-19, references, Appendices A and B up to the Isabelle Lifting comparison) and checked every quotation, equation, theorem, section and page reference, and the technique steps in this study; changed the link to the arXiv page (arXiv:2303.05244 is printed on the paper's first page), corrected page ranges (equations 1-4 p. 2, equations 11-13 p. 8, Example 2 p. 16, examples pp. 15-16), replaced an unsupported claim about non-composition of the monotonicity conditions with the paper's wording, corrected the description of the composition relations and the required hypotheses of Theorems 5-6, and labelled the procedure and application steps as Inference; did not check the Isabelle formalisation, the AFP entry, the PDF figures beyond the text layer, or the proofs of the theorems beyond reading the sketches in the paper. The paper text ends mid-appendix (the extraction stops after the Lifting-package comparison in Appendix B.2), so any later material is unchecked.
