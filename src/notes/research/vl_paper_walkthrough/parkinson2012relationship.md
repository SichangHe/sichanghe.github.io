# The Relationship Between Separation Logic and Implicit Dynamic Frames
(authored by agents unless marked 🧑)
Tag: `parkinson2012relationship`, [paper](https://doi.org/10.2168/LMCS-8(3:01)2012)

Page numbers below are the printed LMCS page numbers (Vol. 8 (3:01) 2012, pp. 1–54).

## scope and result

Parkinson and Summers define Total Heaps Permission Logic (TPL) to give one semantics for a separation-logic fragment and the implicit-dynamic-frames (IDF) logic used by Chalice. The abstract states: “We define a logic whose syntax subsumes both that of a standard separation logic, and that of implicit dynamic frames as sub-syntaxes.” (abstract, p. 1). They prove that TPL agrees with standard partial-heap separation logic (Theorem 3.20), that its semantics matches the weakest pre-conditions Chalice generates for inhale and exhale (Section 4), and that a restricted separation-logic fragment maps into Chalice assertions while preserving semantics (Section 5). The core idea is explicit permission accounting over a total heap: a heap value exists at every location, but a permission mask determines which locations the current thread can read (Section 3.3, p. 11).

Inference: for Verus, this is a semantic blueprint for connecting ownership/permission APIs to heap assertions and for checking that a frame-preserving proof does not accidentally read an unowned location. The paper does not use Rust or Verus; the mappings below are inferences.

## technique 1: model heap ownership with total heaps and permission masks

what it is and when to use it. Replace a partial heap fragment with a total heap `H` plus a mask `P` assigning a permission fraction to each object-field. Use it when specifications need heap expressions but verification should remain first-order. The paper motivates this directly: “Intuitively, the permission mask specifies the locations in the heap which are safe to access.” (Introduction, p. 2).

how to do it. (1) Define a total heap as a total map from `(object, field)` to values and a mask as a total map from `(object, field)` to permissions (Definition 3.2, p. 10). (2) Define mask combination pointwise; two masks are compatible when their permissions sum to at most 1 at every location, and combination is undefined otherwise (Definition 3.2, p. 10). Fractional permissions can be split and recombined. The paper's background says: “A fractional permission is a rational number 0 < π ≤ 1, where 1 denotes full and exclusive (read/write) permission, and any other permission denotes read-only permission.” (Section 2.1, p. 4). (3) Interpret a points-to assertion as both a value assertion and a permission requirement: the semantics of `E.f ↦ E'` requires permission at least π and the heap value equal to `E'` (Definition 3.7, p. 18), and Proposition 5.3 (p. 33) shows it is equivalent to `acc(e.f, π) ∗ e.f = e'`. (4) Evaluate heap expressions on the total heap; IDF restricts dereferences by permission: “heap dereference expressions (whether in assertions or in method bodies) are only allowed if a corresponding permission has already been acquired” (Section 2.2, p. 6). TPL itself gives meaning to all assertions and uses self-framing (technique 2) to pick the well-behaved ones (Section 3.2, p. 9). (5) Define state extension by adding permissions and havocing (assigning arbitrary values to) the heap locations that become newly readable: the paper defines four variants, locally or globally havoced, combined or disjoint (Definition 3.5, p. 14), and uses the locally havoced ones in the final semantics (Definition 3.7, p. 18).

Verus form. Inference: use Rust ownership and Verus proof-oriented types to represent exclusive versus shared access, and ghost state to represent a mask when a project needs fractional sharing. A specification can require an owned field and ensure that an update changes its abstract value:

```rust
proof fn update_preserves(x: &mut Node)
    requires x.value == v
    ensures x.value == new_v
{ ... }
```

Inference: the exact permission API depends on the Verus codebase; the paper's fractional rational mask is a semantic model, not a Verus construct. Verus's borrow checker and tracked permissions enforce Rust ownership, while a ghost map can state which abstract locations are readable.

evidence. The authors prove a correspondence theorem. Theorem 3.20 (Correctness of Total Heap Semantics, p. 22) states, for all SL-assertions a, environments σ, total heaps H and permission masks P, that `H, P, σ ⊧TPL a` holds if and only if `(H↾P), σ ⊧SL a` holds, where `H↾P` restricts H to the locations with nonzero permission in P (full proof on p. 44). Their result is semantic, with no runtime benchmark denominator. They state as Corollary 3.21 that “All separation logic assertions a (Defn 2.1) are self-framing.” (p. 22).

assumptions and limits. Permission fractions are per field; a nonzero fraction permits reading but only full permission permits writing (Section 2.1, p. 4). Inference: Verus proofs still trust the Rust compiler, verifier, and contracts for external code; the paper does not establish those components.

## technique 2: enforce self-framing and stability

what it is and when to use it. A formula is self-framing when its truth is stable under changes to heap locations for which it has no permission. This prevents a contract from depending on an inaccessible or concurrently mutable field. The paper defines: “An assertion A is self-framing if and only if the set of states satisfying it is stable; i.e., if stable(⟨⟨A⟩⟩) is true.” (Definition 3.4, p. 12).

how to do it. (1) Define interference: `interfere(H, P)` is the set of heaps `H'` that agree with `H` on every location where `P` is nonzero (Definitions 3.3–3.4, pp. 11–12). (2) Call a set of states stable when it is closed under interference (Definition 3.4, p. 12). (3) Mark an assertion self-framing when the set of states satisfying it is stable (Definition 3.4, p. 12); for instance `x.f = 5` is pure but not self-framing, because the value of `x.f` can change under interference (p. 12), while `acc(x.f, 1) ∗ x.f = 5` is self-framing (p. 8). (4) For tool automation, use Chalice's left-to-right syntactic check `sframed` (Definition 4.4, p. 27). The paper states, “Chalice does not use the semantic check from earlier, but instead uses a more-syntactic formulation that checks self-framing from left-to-right.” (Section 4.1, p. 27). This check is not symmetric under separating conjunction: `acc(x.f, π) ∗ x.f = 5` is syntactically self-framing, but `x.f = 5 ∗ acc(x.f, π)` is not (p. 27).

Verus form. Inference: make every heap read appear under a `requires` permission/ownership condition and expose the corresponding abstract value through a ghost view. For concurrent code, a state-machine invariant can include the permission or ownership token required before a transition reads a field. Use `assert` to show that the token implies the field invariant before reading. The left-to-right Chalice rule is not a Verus rule; Verus uses Rust borrow checking plus proof contracts.

evidence. The paper proves that every Chalice Boolean expression is pure (Lemma 4.2, p. 26) and every Chalice formula is supported (Lemma 4.3, pp. 26–27). Lemma 4.5 (p. 28) shows that for `sframed(E)` and `sframed(B)`, changing values at locations without permission does not change evaluation, and that both are self-framing. For full formulas, the proof of Lemma 4.6 shows that `sframed(p)` implies disjoint-extension-framed, `⟨⟨sframed(p)⟩⟩ ⊆ DisExtFrm(p)` (equation A.1, pp. 52–54). It does not report benchmark counts or solver timings.

assumptions and limits. Inference: a syntactic check that depends on operand order can reject a formula such as `x.f = 5 ∗ acc(x.f, π)` that is semantically self-framing under the paper's definition. Also, Inference: a Verus abstraction can similarly hide an unproved relationship between a ghost token and a real pointer; the token's contract must be linked to the executable object.

## technique 3: use minimal permission extensions for implication and magic wand

what it is and when to use it. Heap expressions make ordinary separation-logic implication and magic-wand semantics ambiguous over total heaps. TPL resolves this by considering only minimal permission extensions that make the antecedent true. The abstract calls this “the novel concept of a minimal state extension” (abstract, p. 1).

how to do it. (1) Start with state `(H,P,σ)`. (2) Find a permission mask `P'` compatible with `P` (`P' ⊥ P`) that is minimal in the locations it makes readable while still making the antecedent `A1` true; `P'` may carry more permission than needed so long as it does not make more locations readable (Definition 3.6, p. 17). (3) Allow the heap to change only at the locations that become newly readable through `P'` (locally havoced extension, Definition 3.5, p. 14). (4) Evaluate `A1` in the extended state. For implication, require `A2` in every such minimal extension satisfying `A1` (Section 3.6, p. 17; Definition 3.7, p. 18). For the magic wand, use locally havoced disjoint extensions, test `A1` against the extra mask alone, and require `A2` after combining the current mask with it (Section 3.7, p. 18; Definition 3.7, p. 18). (5) The supporting lemmas are: Lemma 3.9 (any satisfying extension can be minimised, p. 19); Lemmas 3.11–3.12 and Proposition 3.13 (minimal extensions and weakening closure, p. 19); Lemmas 3.15–3.16 (minimal extensions are preserved under interference given extension-framing, p. 20); Lemmas 3.23 and 3.25 (decomposing and composing minimal extensions over conjunctions, supported formulas for composing, p. 23).

Verus form. Inference: encode the antecedent's required resources as a tracked token or state-machine invariant and quantify only over transitions that acquire exactly those resources. A proof of a frame rule can require a disjointness predicate and ensure that the framed invariant is unchanged. Verus has no magic-wand connective; a `proof fn` with `requires`/`ensures` is the practical replacement for a resource-transforming implication.

evidence. The paper proves Theorem 3.20 (p. 22) and derives standard separation-logic laws for self-framing assertions (Section 3.11, pp. 22–24; Corollary 3.27, p. 24). It also gives an example where the usual laws fail for general TPL assertions: `x.f = 1 −∗ (acc(x.f, 1) −∗ false)` versus `(x.f = 1 ∗ acc(x.f, 1)) −∗ false` (p. 23). For pure left-hand sides, implication reduces to a boolean conditional (Lemma 3.18, p. 21). The claims are mathematical theorems, not measured performance results.

assumptions and limits. The paper restricts some simplified rules to self-framing or supported formulas (Lemma 3.19, p. 21; Lemma 3.25 and Proposition 3.26, p. 23). Section 7 (p. 36) says that for supported assertions the quantifier over states can be eliminated: “we need only check the unique, minimal extension of the initial state to make the left-hand side true, if such an extension exists.” The authors present this as a suggestion for future work. Inference: an automated Verus proof may need explicit disjointness lemmas when a state-machine transition changes several resources.

## technique 4: preserve weakest-precondition semantics across an encoding

what it is and when to use it. Encode a restricted separation-logic assertion into an IDF/Chalice assertion, then compare weakest-precondition (WP) calculations rather than translating individual proof steps informally. Use it when an existing first-order verifier should check a separation-logic contract.

how to do it. (1) Restrict the source SL syntax to the fragment in Definition 5.2 (p. 33): boolean expressions (`e = e`, `e ≠ e`, `b ∗ b`), points-to, separating conjunction, implication with a boolean left-hand side, and an existential witnessed by a points-to (`∃v. e.f ↦ v ∗ a`). (2) Define the mapping `[a]` from restricted SL assertions to Chalice assertions (Definition 5.4, p. 33), where a points-to maps to `acc(e1.f, π) ∗ e1.f = e2`. (3) Prove structural semantic preservation by induction; the paper states Lemma 5.5 (Mapping to Chalice Preserves Semantics, p. 33). (4) Define the TPL WPs of inhale and exhale as `wpsl(exhale(A1), A2) = A1 ∗ A2` and `wpsl(inhale(A1), A2) = A1 −∗ A2` (Section 4.2, p. 29), and relate them to Chalice's WPs (Figure 1, p. 28) through `interp(A)` (Definition 4.7, p. 29): exhale is Lemma 4.9 (p. 29) and inhale is Corollary 4.13 (p. 31). (5) Apply the equivalence-distribution lemma (Lemma 5.1, p. 32) to combine the results. The central statement is Theorem 5.6 (Weakest Pre-condition Calculations Equivalent, p. 34).

Verus form. Inference: write a Verus wrapper whose `requires` is the mapped permission assertion and whose `ensures` is the mapped postcondition. Prove a lemma connecting the wrapper's pre/post abstraction to the executable Rust operation. Verus's `requires`/`ensures` are contracts, not a general WP calculus, so the paper's mapping becomes a library of proof lemmas and ghost-state updates.

evidence. Corollary 5.7 (p. 34) combines Theorem 5.6 with Theorem 3.20. The authors summarise: “In this section, we have shown that the encoding of inhale and exhale into Boogie2 is equivalent to the separation logic weakest pre-condition semantics.” (p. 35). No benchmark denominator, timing, or code-size measurement is reported.

assumptions and limits. The mapping covers a restricted SL fragment and requires syntactic self-framing for `inhale` (Corollary 4.13, p. 31; Remark 4.14, p. 32). Recursive predicates are not covered: “The critical aspect which is missing is the treatment of predicates” (Section 7, p. 37). The paper also says that encoding IDF back into SL is difficult (Section 3.12, p. 25). It does not prove arbitrary separation-logic formulas or arbitrary mutable Rust programs. Inference: product use needs contracts for the Rust standard library, unsafe code, and foreign calls in addition to this semantic correspondence.

## what is proved, measured, and trusted

The paper proves semantic equivalence: TPL matches partial-heap SL (Theorem 3.20), TPL's semantics matches Chalice's inhale/exhale weakest pre-conditions (Section 4.2), and the restricted SL-to-Chalice mapping preserves assertion and WP meaning (Section 5). It reports no empirical measurements, benchmark denominator, or success percentage. Trusted premises include the formal definitions of heap/mask operations, the soundness of the mathematical proofs, and the target tool's implementation of its verification conditions. The introduction states the aim as “show that this fragment of separation logic can, via our correspondences, be handled in a purely first-order prover.” (Introduction, p. 2).

Inference: threat to agent-written verified Rust is medium. The work addresses a central product risk—proofs that manipulate aliases and permissions—but only at the logic/encoding level. It does not validate Verus's Rust semantics, ownership implementation, unsafe code, library specifications, or whether a generated contract captures the intended system property. Its strongest reusable idea is a checkable abstraction boundary: every heap read needs a permission fact, and every resource-transforming proof should preserve a frame.

## what VL should not redo

VL should not claim as a new idea that separation logic can be represented by permission masks, that minimal extensions give a uniform implication/magic-wand semantics, or that a restricted SL fragment can map to Chalice while preserving WPs; these are theorems established here. New work should measure or mechanize the Rust/Verus encoding, including ownership, mutable borrows, concurrency state machines, and external-library contracts.

## techniques for the catalog

- total-heap permission semantics — represent a total heap plus a per-field permission mask and interpret reads through permissions
- self-framing checks — require assertions to remain stable under interference outside their permission mask
- minimal permission extensions — define implication and magic wand by quantifying over minimal resources that satisfy the antecedent
- separation-logic to IDF encoding — map a restricted separation-logic syntax to Chalice assertions with semantic preservation
- weakest-precondition correspondence — prove encoded and source command WPs equivalent by structural semantic lemmas
- frame and permission accounting — use fractional permissions for read sharing and full permission for writes

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Chalice does not allow arbitrary formulas to be used as argument to inhale and exhale: it restricts the formulas to be self-framing."): read the whole paper text (pp. 1–54, including the appendix proofs) and checked every quotation, definition/lemma/theorem number, page number and technique step against it; changed all page references from the old values to the printed LMCS pages, corrected the havoc description and the minimal-extension steps, removed an overclaim that Lemma 4.5 covers full formulas, moved the "purely first-order prover" quote from the abstract to the introduction, replaced the arXiv link with the DOI printed in the paper, and labelled own conclusions as Inference; did not check the Verus/Rust mappings (they are inferences, not paper claims), the proofs' correctness, or the bibliography.
