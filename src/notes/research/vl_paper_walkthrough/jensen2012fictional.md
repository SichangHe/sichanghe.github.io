# Fictional Separation Logic
(authored by agents unless marked 🧑)
Tag: `jensen2012fictional`, [paper](https://www.semanticscholar.org/paper/3c34432c58e2b58f44f7784a3168a0f25988df3f)

## what is proved and measured
Fictional separation logic (FSL) replaces mandatory physical disjointness with an abstract separation algebra and an interpretation into physical heaps. Its goal is modular specifications for mutable abstract data types implemented with sharing. The authors define an indirect Hoare triple in terms of an existing standard separation-logic triple, then derive sound frame, consequence, module-composition, and stacking rules. The paper gives worked bit-pair, monotonic-counter, wrapper, fractional-permission, and stacked-collection examples, but no benchmark denominator or runtime measurements. It explicitly says the theory is presented for a simple sequential imperative language (sec.1, pp.379–380).

## technique: abstract separation algebra and interpretation
What it is: Choose an abstract separation algebra `Σ` and interpretation `I : Σ → P(heap)` existentially, so abstract predicates need not expose physical sharing. A separation algebra is a partial commutative monoid (sec.2.1, p.380). The indirect triple is `I.{P} C {Q} ≜ ∀φ. {∃σ∈P.I(σ◦φ)} C {∃σ∈Q.I(σ◦φ)}` (sec.3, p.382).
When to use it: Use this when multiple abstract resources may overlap in one concrete cell, such as two bits packed into one integer or copy-on-write collections.
How to do it: (1) define the abstract carrier and partial composition; (2) define `I` mapping abstract states to heap predicates; (3) define module representation predicates; (4) quantify `Σ`, `I`, and representations in the public specification; (5) prove each implementation function using the indirect triple and standard separation-logic rules. The bit-pair implementation packs two bits in one integer and interprets an abstract map `(p,{1↦b1,2↦b2})` as `p ↦ (b1+2*b2)` (sec.3.2, pp.384–385).
Verus form: Inference: define a ghost abstract state and `spec fn interpret(abs, heap_view)->bool`; make the public contract existential over ghost representation and prove each Rust method preserves it. Verus’s `Set`, `Map`, `Seq`, and `spec fn` can encode the algebra; physical aliasing still requires a Verus-supported ownership model or ghost abstraction.
Evidence: “The intention is that the interpretation map I should explain how elements of the separation algebra Σ are represented by predicates on physical heaps” (sec.1, p.379). The bit-pair proof reduces `get1` to a standard heap read using the saturation lemma (sec.3.2, pp.384–385).
Limits: The abstract logic can hide implementation sharing, but interpretation and algebra must be chosen soundly. The paper’s language is sequential; concurrent extension is future work (sec.7, pp.394–395).

## technique: indirect frame and Enter rules
What it is: Quantification over every abstract frame `φ` builds framing into the triple. The Enter1 rule changes an indirect singleton obligation into a standard triple over `I(σ◦φ)`, and Lemma 1 gives pointwise interpretation facts for finite maps (sec.3.1, p.383).
When to use it: Use Enter1 when a function changes one abstract object while arbitrary represented objects remain in the frame.
How to do it: (1) instantiate the abstract singleton; (2) introduce arbitrary `φ`; (3) use a saturation lemma to expose the concrete framed heap; (4) apply the ordinary command rule; (5) repackage the result through `I`; (6) discharge the indirect triple. In `bp get1`, the frame must contain the second bit because `I` requires full field support; reading the packed integer preserves that frame (sec.3.2, p.384).
Verus form: Inference: use a universally quantified ghost frame and prove a frame-preservation lemma with `ensures` that the untouched abstract component is unchanged. Verus does not have an indirect-triple connective; encode it as a lemma parameterized by an arbitrary ghost frame.
Evidence: “The quantification over all possible abstract frames φ bakes the frame rule into the indirect triple definition” (sec.3, p.383).
Limits: Proofs depend on interpretation-specific saturation lemmas; deriving them is not automated by the paper.

## technique: freely duplicable abstract state for monotonic counters
What it is: A monotonic counter representation `MC(c,i)` can be duplicated and weakened: for `i≤j`, `MC(c,j) ⊢ MC(c,j) * MC(c,i)`. Reading guarantees only `ret≥i`; increment advances the abstract lower bound (sec.3.3, pp.385–386).
When to use it: Use this pattern for monotone observations where clients may retain stale lower bounds and no operation decreases the concrete value.
How to do it: choose `Σ = loc →fin Z⊥` with max composition; interpret `f(c)` as any concrete cell value `j≥f(c)`; define `MC(c,i)={c↦i}`; prove duplication, `new`, `read`, and `inc` contracts (sec.3.3, p.385).
Verus form: Inference: store an abstract lower-bound ghost value and prove `old(bound) ≤ new(bound)`; a read contract returns a value at least the bound. Duplicating a ghost lower-bound fact is logical weakening, not duplicated executable ownership.
Evidence: “The representation predicate MC (c, i) can be freely duplicated” (sec.3.3, p.385).
Limits: No deallocation is sound because the predicate is freely shared; consecutive reads need not return the same value, and the authors say the specification suits garbage-collected languages (p.386).

## technique: separating products for multiple modules
What it is: For interpretations `I1` and `I2`, use `I1 * I2 (σ1,σ2)=I1(σ1)*I2(σ2)` and rules Create, Forget, Leak, and Prod-Pure to introduce, remove, or retain module layers (sec.4, pp.386–387).
When to use it: Use it when a client calls multiple independently abstracted libraries or directly accesses the heap alongside them.
How to do it: create one product component per module; frame irrelevant components before a call; apply the module’s indirect triple; forget or leak components according to whether the command cleans them up. The paper’s client proof combines bit-pair and monotonic-counter specifications (sec.4.1, pp.387–388).
Verus form: Inference: define a product ghost state containing each module’s invariant and prove a method contract preserves untouched components. There is no direct `CreateL`; use explicit lemma instantiation and ghost tuple framing.
Evidence: “To allow clients of multiple libraries to know about more than one separation algebra and interpretation function, we introduce separating products of interpretations” (sec.4, p.386).
Limits: Leaked, freely shared resources cannot be reclaimed; complex products may need tool support (sec.7, p.394).

## technique: indirect entailment and fractional permissions
What it is: Indirect entailment `P |=I Q` permits changing abstract predicates when they denote the same concrete heaps. The paper encodes fractional permissions with rationals `0<z≤1`, composition by addition up to one, and an interpretation requiring full permission before touching the physical heap (sec.5, pp.389–391).
When to use it: Use indirect entailment to derive read-only sharing and to reuse ordinary full-permission write rules.
How to do it: define permission algebra and fractional points-to; prove splitting/joining; define `Ifp` that interprets only permission-1 cells; prove read directly by exposing `Ifp`; prove a bi-entailment between full fractional and ordinary points-to; derive write/allocation via ROC-Indirect and standard rules (sec.5.1, pp.390–391).
Verus form: Inference: use rational or integer-scaled ghost fractions and prove addition bounds; require full fraction for mutating methods and positive fraction for reads. Verus does not automatically enforce fractional ownership, so the fraction must be a proved ghost protocol.
Evidence: “We can now prove a specification of the heap read command for fractional permissions” (sec.5.1, p.391).
Limits: Permission soundness assumes the interpretation’s full-permission premise; the paper does not verify a concurrent implementation.

## technique: stacking interpretation layers
What it is: Compose `I:Σ1→Σ2` and `J:Σ2→Σ3` relationally, or expose both layers with stacking `I ▷ J=(I*1);J` (sec.6, pp.391–393).
When to use it: Use stacking when a module extends another abstraction and clients need either the lower layer hidden or both layers available.
How to do it: define relational composition; apply RelComp to peel a layer; use StackComp/Enter1Stack when both states are visible; use StackRel to hide internal stacking. The paper stacks fractional permissions over collections so `contains` and `clone` work with partial permission while original collection contracts are reused (sec.6.1, pp.393–394).
Verus form: Inference: represent each layer as a ghost invariant and prove refinement/forgetful lemmas between them; expose only the composed contract at API boundaries.
Evidence: “Relational composition masks the J-interpretation to the outside” (sec.6, p.392).
Limits: The converse of RelComp does not hold in general; choosing what to expose is an API design decision.

## what stays trusted and implications for VL
The paper’s meta-theory is defined over a standard Hoare triple and is argued sound by reduction to that base logic; it does not verify Rust, a compiler, arithmetic implementation, or a concurrent memory model. Inference: VL can use FSL’s existential abstract algebra to specify packed representations, shared counters, copy-on-write, and permission APIs while keeping concrete layout hidden. Inference: threat reduction is high for specification leakage and modularity errors, but product risk remains in unsound interpretation lemmas, ghost fraction protocols, and the paper’s unaddressed concurrency and deallocation limits.

## techniques for the catalog
- abstract interpreted separation — hide physical sharing behind an existential algebra and heap interpretation
- indirect framed triples — quantify over arbitrary abstract frames and enter standard proof obligations
- monotone duplicable predicates — model shared lower bounds for nondecreasing state
- separating products — compose independently abstracted modules for clients
- indirect entailment — replace abstract predicates with concretely equivalent ones
- fractional permission algebra — encode read/write sharing over a standard heap
- stacked interpretations — expose or hide multiple abstraction layers
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
