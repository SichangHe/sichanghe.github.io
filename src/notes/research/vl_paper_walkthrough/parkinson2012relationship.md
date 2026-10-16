# The Relationship Between Separation Logic and Implicit Dynamic Frames
(authored by agents unless marked 🧑)
Tag: `parkinson2012relationship`, [paper](http://arxiv.org/abs/1203.6859v3)

## scope and result

Parkinson and Summers define Total Heaps Permission Logic (TPL) to give one semantics for a separation-logic fragment and the implicit-dynamic-frames (IDF) logic used by Chalice. The abstract states: “We define a logic whose syntax subsumes both that of a standard separation logic, and that of implicit dynamic frames as sub-syntaxes.” (abstract, p. 1). They prove that TPL agrees with standard partial-heap separation logic, directly models IDF, and encodes a practical separation-logic fragment into Chalice while preserving semantics. The paper's core engineering lesson is explicit permission accounting over a total heap: a heap value exists everywhere, but a permission mask determines which locations may be read.

Inference: for Verus, this is a semantic blueprint for connecting ownership/permission APIs to heap assertions and for checking that a frame-preserving proof does not accidentally read an unowned location. The paper does not use Rust or Verus; the mappings below are inferences.

## technique 1: model heap ownership with total heaps and permission masks

what it is and when to use it. Replace a partial heap fragment with a total heap `H` plus a mask `P` assigning a permission fraction to each object-field. Use it when specifications need heap expressions but verification should remain first-order. The paper motivates this directly: “Intuitively, the permission mask specifies the locations in the heap which are safe to access.” (Introduction, p. 2).

how to do it. (1) Define a total heap as a total map from `(object, field)` to values and a mask as a map to permissions (Definition 3.2, p. 18). (2) Define mask combination pointwise and reject overlapping full permissions; fractional permissions can be split and recombined. The paper's background says: “A fractional permission is a rational number 0 < π ≤ 1, where 1 denotes full and exclusive (read/write) permission, and any other permission denotes read-only permission.” (Section 2.1, p. 4). (3) Interpret a points-to assertion as both a value assertion and a permission requirement. (4) Restrict heap lookup in expressions to locations with nonzero permission. (5) Define state extension by adding permissions while retaining the same total heap except for locations allowed to be havoced (Definitions 3.5–3.6, pp. 24–27).

Verus form. Inference: use Rust ownership and Verus proof-oriented types to represent exclusive versus shared access, and ghost state to represent a mask when a project needs fractional sharing. A specification can require an owned field and ensure that an update preserves the abstract heap:

```rust
proof fn update_preserves(x: &mut Node)
    requires x.value == v
    ensures x.value == new_v
{ ... }
```

Inference: the exact `old` expression and permission API depend on the Verus codebase; the paper's fractional rational mask is a semantic model, not a Verus construct. Verus's borrow checker and tracked permissions enforce Rust ownership, while a ghost map can state which abstract locations are readable.

evidence. The authors prove a correspondence theorem: “For all SL-assertions a, environments σ, total heaps H, and permission masks P : H, P, σ ⊧TPL a ⇐⇒ (H↾P ), σ ⊧SL a” (Theorem 3.20, p. 33). Their result is semantic, with no runtime benchmark denominator. They also prove all separation-logic assertions are self-framing (Corollary 3.21, p. 33).

assumptions and limits. Permission fractions are per field; a nonzero fraction permits reading but only full permission permits writing (Section 2.1, p. 4). The model assumes a coherent total heap and mask algebra. Inference: Verus proofs still trust the Rust compiler, verifier, and contracts for external code; the paper does not establish those components.

## technique 2: enforce self-framing and stability

what it is and when to use it. A formula is self-framing when its truth is stable under changes to heap locations for which it has no permission. This prevents a contract from depending on an inaccessible or concurrently mutable field. The paper defines: “An assertion A is self-framing if and only if the set of states satisfying it is stable; i.e., if …” (Definition 3.4, p. 21; the definition continues with the formal stability condition).

how to do it. (1) Compute the set of locations read by an assertion. (2) Require a positive permission for every read location, either supplied directly by an `acc`/points-to atom or obtained from a conjunction. (3) Define interference as changing heap values outside the permission mask. (4) Check that the assertion remains true for every such interference; if so, mark it self-framing (Section 3.3, pp. 20–22). (5) For tool automation, use Chalice's left-to-right syntactic check: the paper states, “Chalice does not use the semantic check from earlier, but instead uses a more-syntactic formulation that checks self-framing from left-to-right.” (Section 4.1, p. 40). The paper notes that this syntactic check is not symmetric under separating conjunction and gives `acc(x.f, π) ∗ x.f = 5` as accepted in that order (p. 40).

Verus form. Inference: make every heap read appear under a `requires` permission/ownership condition and expose the corresponding abstract value through a ghost view. For concurrent code, a state-machine invariant can include the permission or ownership token required before a transition reads a field. Use `assert` to show that the token implies the field invariant before reading. The left-to-right Chalice rule is not a Verus rule; Verus uses Rust borrow checking plus proof contracts.

evidence. The paper proves that every Chalice Boolean expression is pure and every Chalice formula is supported (Lemmas 4.2–4.3, p. 38), and that syntactic self-framing implies semantic self-framing (Lemma 4.5, p. 40). It does not report benchmark counts or solver timings.

assumptions and limits. Syntactic checks can be more restrictive than semantic stability and depend on operand order. A formula such as `x.f = 5` without permission is not self-framing (Section 3.3, p. 21). Inference: a Verus abstraction can similarly hide an unproved relationship between a ghost token and a real pointer; the token's contract must be linked to the executable object.

## technique 3: use minimal permission extensions for implication and magic wand

what it is and when to use it. Heap expressions make ordinary separation-logic implication and magic-wand semantics ambiguous over total heaps. TPL resolves this by considering only minimal permission extensions that make the antecedent true. The abstract calls this “the novel concept of a minimal state extension” (abstract, p. 1).

how to do it. (1) Start with state `(H,P,σ)`. (2) Find a permission mask `P'` disjoint from `P` and minimal with respect to the locations needed to establish the antecedent `A1`; values outside the relevant locations may be havoced (Definition 3.6, pp. 26–27). (3) Evaluate `A1` in the extended state. (4) For implication, require `A2` in every such minimal extension satisfying `A1`; for magic wand, require `A2` after combining the current state with every minimal extension satisfying its left operand (Sections 3.6–3.7, pp. 26–29). (5) Use Lemmas 3.11–3.16 to show that minimal extensions compose, remain closed under permission weakening, and are preserved by stable assertions.

Verus form. Inference: encode the antecedent's required resources as a tracked token or state-machine invariant and quantify only over transitions that acquire exactly those resources. A proof of a frame rule can require a disjointness predicate and ensure that the framed invariant is unchanged. Verus has no magic-wand connective; a `proof fn` with `requires`/`ensures` is the practical replacement for a resource-transforming implication.

evidence. The paper proves “Correctness of Total Heap Semantics” (Theorem 3.20, p. 33) and derives standard separation-logic laws for self-framing assertions (Section 3.11, pp. 34–36). The claims are mathematical theorems, not measured performance results.

assumptions and limits. Minimality is defined relative to a state and the assertion's read locations; arbitrary formulas may require global reasoning. The authors explicitly restrict some simplified rules to self-framing or supported formulas (Lemmas 3.19 and 3.25, pp. 31–35). Inference: an automated Verus proof may need explicit disjointness lemmas when a state-machine transition changes several resources.

## technique 4: preserve weakest-precondition semantics across an encoding

what it is and when to use it. Encode a restricted separation-logic assertion into an IDF/Chalice assertion, then compare weakest-precondition (WP) calculations rather than translating individual proof steps informally. Use it when an existing first-order verifier should check a separation-logic contract.

how to do it. (1) Restrict the source SL syntax to the fragment in Definition 5.2 (p. 47): points-to, separating conjunction, pure connectives, and existentials in the supported forms. (2) Define the mapping `[a]` from restricted SL assertions to Chalice assertions (Definition 5.4, p. 48). (3) Prove structural semantic preservation by induction; the paper states “Mapping to Chalice Preserves Semantics” (Lemma 5.5, p. 48). (4) Translate commands such as `inhale` and `exhale` and define their TPL and Chalice WPs (Section 4, pp. 38–44). (5) Apply equivalence-preservation lemmas to show the two WP results are equivalent. The central statement is: “Weakest Pre-condition Calculations Equivalent” (Theorem 5.6, p. 49).

Verus form. Inference: write a Verus wrapper whose `requires` is the mapped permission assertion and whose `ensures` is the mapped postcondition. Prove a lemma connecting the wrapper's pre/post abstraction to the executable Rust operation. Verus's `requires`/`ensures` are contracts, not a general WP calculus, so the paper's mapping becomes a library of proof lemmas and ghost-state updates.

evidence. The authors combine Theorem 5.6 with the interpretation of assertions to conclude that “the separation logic weakest pre-condition semantics” is equivalent to the Chalice calculation (Section 5, pp. 49–50). No benchmark denominator, timing, or code-size measurement is reported.

assumptions and limits. The mapping covers a restricted SL fragment and requires syntactic self-framing for `inhale` (Corollary 4.13 and Remark 4.14, pp. 43–44). It does not prove arbitrary separation-logic formulas or arbitrary mutable Rust programs. Inference: product use needs contracts for the Rust standard library, unsafe code, and foreign calls in addition to this semantic correspondence.

## what is proved, measured, and trusted

The paper proves semantic equivalence: TPL matches partial-heap SL, TPL directly models Chalice IDF, and the restricted SL-to-Chalice mapping preserves assertion and WP meaning. It reports no empirical measurements, benchmark denominator, or success percentage. Trusted premises include the formal definitions of heap/mask operations, the soundness of the mathematical proofs, and the target tool's implementation of its verification conditions. The paper's own conclusion is that “this fragment of separation logic can, via our correspondences, be handled in a purely first-order prover.” (abstract, p. 1).

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

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
