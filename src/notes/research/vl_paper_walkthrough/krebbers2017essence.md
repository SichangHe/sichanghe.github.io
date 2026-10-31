# The Essence of Higher-Order Concurrent Separation Logic
(authored by agents unless marked 🧑)
Tag: `krebbers2017essence`, [paper](https://doi.org/10.1007/978-3-662-54434-1_26)

## scope and result

This paper reduces Iris, a higher-order concurrent separation logic, to a small base logic and derives the familiar program-logic mechanisms from it. The base has ordinary separation-logic assertions plus ownership, validity, persistence (the always modality), a later modality, and a basic update modality (Section 2, pp. 699–705). The abstract states: “We then show how the much fancier logical mechanisms of Iris—in particular, its entire program specification layer—can be understood as merely derived forms in our base logic.” (Abstract, p. 696). “All our results are fully formalized in the Coq proof assistant.” (Abstract, p. 696).

The paper states a soundness theorem for the base logic (Theorem 2.1, soundness of first-order interpretation, Section 2.8, p. 705) and an adequacy theorem for weakest preconditions (Theorem 4.1, Section 4.6, p. 718). For the model-level proof of Theorem 2.1 it only refers to the appendix and earlier work (Section 2.8, p. 705). The weakest preconditions are defined for a concrete call-by-value lambda calculus with references and fork in Section 3 and for an arbitrary language in Section 4.5. The paper does not verify a Rust implementation or establish that a user's specification captures a product requirement.

## technique 1: define resources with a resource algebra

Use this when concurrent proofs need a compositional model of ownership or ghost state. The paper's steps are:

1. Choose a set of resources and define a resource algebra (RA): a tuple of a set M, a subset V of valid elements, a partial core function, and a composition operator that is associative and commutative (Fig. 2, p. 701). The paper says the base logic leaves the resource set general and requires it to form a unital resource algebra (Section 2.2, pp. 700–701).
2. Use composition to split ownership among threads. The paper says composition of ownership “is associative and commutative, reflecting the associative and commutative semantics of parallel composition”; invalid combinations are ruled out by the validity set V (RAs use validity instead of partiality), e.g. multiple threads claiming an exclusive resource (Section 2.2, p. 701).
3. Define an RA for each ghost protocol. The paper gives two examples in Section 2.2: the exclusive RA Ex(X) and finite partial functions, whose core and composition are lifted pointwise (p. 702). Later sections add the authoritative RA (Section 3.3, p. 710), the agreement RA (Section 4.2, p. 713), and the enabled/disabled token RAs (Section 4.3, p. 714).
4. State ownership as `Own(a)` and validity as `V(a)`. Separating conjunction reflects the RA composition through the rule own-op (Section 2.3, p. 702).

Inference: a Verus state machine or ghost variable can play a similar role when a concurrent proof needs an abstract protocol state. Use Verus state-machine constructs and `proof fn` lemmas to constrain transitions; use `requires` and `ensures` on executable operations to connect concrete state to the abstract state. Verus's ownership rules are Rust-specific and do not directly implement Iris's `Own` connective, so the RA laws must be encoded as ghost predicates and proved explicitly. Do not write an Iris `invariant` or `modifies` construct as if it were Verus syntax. (Verus features were not checked against Verus documentation.)

## technique 2: require frame-preserving updates

Use this to update owned ghost state without invalidating assumptions held by concurrently running threads. The paper defines a frame-preserving update `a ⇝ B` to a set of possible resources B: for any frame `af` with `a · af ∈ V`, there is some `b ∈ B` with `b · af ∈ V` (Section 2.4, p. 702). It explains the purpose directly: “By doing only frame-preserving updates, we know we will never “step on anybody else’s toes”.” (Section 2.4, p. 702). The paper adds that, if frames are “the resources owned by other threads”, such an update “is guaranteed not to invalidate the resources of concurrently-running threads” (p. 702).

Inference, a checklist built from that definition: (1) identify the resource owned by the current proof, (2) quantify over every valid frame, (3) show the proposed new resource remains valid with that frame, and (4) expose the result through the update modality. The paper's own account of the basic update `|=> P` is that it asserts ownership of resources that can be updated to resources satisfying P, and that it can be thought of as a thunk that captures resources and later “returns” resources satisfying P; its rules give monotonicity (upd-mono), composition (upd-trans), and framing (upd-frame) (Section 2.4, p. 703, Fig. 1, p. 700). The paper's example updates are `ex(x) ⇝ ex(y)` and the finite-partial-function rules fpfn-update and fpfn-alloc (pp. 702–703).

Inference: in Verus, encode the frame-preservation obligation as a lemma over the state-machine state and transition relation, then call it from a `proof fn` before changing ghost state. For a concrete concurrent operation, keep the atomic transition and its `ensures` contract aligned; Verus's transition-system proof is the evidence that another thread's invariant remains valid. The Iris modal notation itself does not carry over.

## technique 3: use persistence and guarded recursion

The paper calls an assertion P persistent “if proofs of P can never assert exclusive ownership”, formally P entails the always modality applied to P; when either P or Q is persistent, separating conjunction and ordinary conjunction coincide (Section 2.5, p. 703). The paper's example is that the core of a resource, `Own(|a|)`, is persistent (p. 703); Section 6 says “invariants in Iris are persistent assertions” (p. 721). Inference: use persistence for read-only facts and duplicable protocol capabilities.

Higher-order ghost state requires step-indexing; the later modality is the internalization of that structure in the logic (Section 2.6, pp. 703–704). The paper introduces the later modality and explains that, intuitively, the later of P “asserts that P holds “at the next step-index” (or “one step later”)” (Section 2.6, p. 704). Step-indexing also permits a fixed-point operator for recursive predicates “without any restriction on the variance of the recursive occurrences”; instead, all recursive occurrences “must be guarded: they have to appear below a later modality” (Section 2.6, p. 704). Löb's rule lets one “essentially assume that the recursive occurrences are already proven correct” (p. 704). Timeless assertions are those whose semantics is independent of step-indexing; for them the later can be stripped when accessing an invariant (Section 2.7, p. 704).

Inference: Verus does not expose Iris's step-indexed `later` modality. A Verus proof can instead use an explicit inductive state relation, a decreasing measure in recursive lemmas, or a loop invariant that represents the inductive hypothesis. Such a translation must preserve well-foundedness. The paper shows that removing the later from the invariant-opening rule makes Iris inconsistent (Section 5, p. 718); it does not claim that every use of a guard elsewhere is unsound when removed.

## technique 4: derive invariants and weakest preconditions around atomic steps

The paper describes an invariant as “simply a property that holds at all times”: each thread “may assume the invariant holds before each step of its computation, but it must also ensure that it continues to hold after each step” (Section 4, p. 711). The access rule wp-inv gives access by acquiring ownership of the later of P before verifying e and giving back the later of P after; the paper stresses: “Crucially, we require that e is atomic, meaning that computation is guaranteed to complete in a single step.” (Section 4, p. 711). Each invariant has a name, and weakest preconditions carry a mask of enabled names; “Accessing an invariant removes its name from the mask, ensuring that it cannot be accessed again in a nested fashion.” (Section 4, p. 711).

The paper's derivation of wp-inv (Section 4.5, pp. 717–718) uses wp-atomic, wp-frame, wp-mono, and inv-open: the invariant is opened with a mask change around an atomic expression and closed again afterwards. Invariant allocation is rule inv-alloc (Fig. 5, p. 716). Adequacy (Theorem 4.1, p. 718): for a first-order predicate φ, if `True ⊢ |=> I(σ) ∗ wp e {φ}` and `(e, σ)` reduces by the thread-pool relation to `(e1 … en, σ')`, then every `ei` is a value or reducible, and if the main thread `e1` is a value v then φ(v).

Inference, a usage recipe: (1) register a named invariant, (2) remove its name from the enabled mask, (3) open it only around an atomic operation, (4) use its resources to prove the operation's postcondition, and (5) close it before another thread can run.

Inference: Verus state machines and atomic transition proofs are the nearest form. Put the shared-state relation in a state-machine invariant, prove each transition with `ensures`, and use a `proof fn` to establish that the relation is preserved. Verus does not let an executable function temporarily violate a global invariant by syntax alone; atomicity and interference assumptions must be represented by the chosen concurrency model. (Verus features were not checked against Verus documentation.)

## what is proved, trusted, and unresolved

The paper states: “All results in this paper have been formalized in the Coq proof assistant” (Section 1, p. 699). Its main results are the base-logic rules (Fig. 1, p. 700), the derived weakest-precondition and invariant rules (Sections 3–4), Theorem 2.1, and Theorem 4.1. The paper also proves that dropping the later from invariant opening yields contradiction: “if we omit the later modality from the invariant opening rule, then we can derive a contradiction in the logic.” (Section 5, p. 718; Theorem 5.1, which requires “an appropriate RA”). It adds that this “does not prove that we absolutely must have a” later modality (Section 5, p. 719), and that Theorem 5.2 shows the same for all versions of Iris. The paper's language is a lambda calculus with references and fork under interleaving thread-pool semantics (Section 3.1, p. 706).

Inference: trusted foundations include Coq, the semantic model, the chosen RA, the operational semantics, and the formalized program specification. Inference: the paper's results do not cover real Rust layout, compiler correctness, hardware, or a Verus implementation; the paper says nothing about them.

## techniques for the catalog

- resource algebra — model compositional ownership, validity, and ghost state with associative resource composition
- frame-preserving update — update owned state while proving compatibility with every concurrent frame
- persistence and guarded recursion — distinguish reusable facts and guard higher-order recursive assertions with a later step
- atomic invariant access — open shared-state invariants only around atomic operations and close them before interference
- derived weakest preconditions — build program specifications from a small assertion and modality core
