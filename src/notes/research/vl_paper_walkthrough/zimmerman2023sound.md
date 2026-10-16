# Sound Gradual Verification with Symbolic Execution
(authored by agents unless marked 🧑)
Tag: `zimmerman2023sound`, [paper](http://arxiv.org/abs/2311.07559v1)
## what the paper establishes

The paper formalizes and proves soundness for Gradual C0, a gradual verifier for recursive heap structures, and for a core Viper subset using implicit dynamic frames (IDF). Gradual specifications may leave part of a formula unknown; static symbolic execution uses optimistic assumptions and emits run-time checks for those assumptions. The paper's motivation is that “A developer can now write partial, imprecise specifications—formulas such as ? ∗ x.f == 2—backed by run-time checking.” (Section 1, p. 2). The formal system separates precise and optimistic heap information, symbolic stores, path conditions, and a set of checks.

The main soundness result is progress and preservation relative to a concrete execution semantics. The authors state: “We prove our approach is sound; our proof also covers a core subset of the Viper tool.” (Abstract, p. 1). Their proof defines a valuation from symbolic values to concrete values, a correspondence relation between symbolic and dynamic states, and guards that must pass before execution steps. They also report a real defect in the earlier Gradual C0 implementation: “This unsoundness results from the combination of imprecise specifications, static verification with isorecursive predicates, and run-time checking with equirecursive predicates.” (Section 8, p. 25).

## technique 1: symbolic execution with precise and optimistic heaps

What it is: SVLC0 symbolic states contain a symbolic heap, store, and path condition. GVLC0 extends them with an imprecise flag, a precise heap H, and an optimistic heap H. Precise chunks must be disjoint; optimistic chunks may overlap because they represent assumptions made by imprecise specifications.

How to apply it (Sections 2–3, pp. 5–14):

1. Represent each variable by a symbolic term, maintain a path condition, and represent owned fields and predicates as heap chunks. Evaluation returns a term and an updated symbolic state.
2. For a precise field read, find a matching chunk. If no chunk exists, produce static failure `⊥`.
3. For an imprecise field read, add a fresh optimistic chunk and emit a run-time permission check. The paper's selected rule says that `SEvalFieldImprecise` adds a fresh field and a check asserting permission to access it (Section 3.4, pp. 13–14).
4. To consume a formula, remove its chunks from the appropriate heap. Consuming `? * φ` clears precise and optimistic heaps, marks the state imprecise, and retains only the precise portion φ for assertions.
5. When an imprecise expression is optimistically consumed, add the symbolic expression to the run-time check set. When no precise proof exists, return `⊥` in a precise state.
6. Collect permissions used by separating conjunctions. If optimistic permissions could overlap, emit `sep(Θ1,Θ2)` to check disjointness dynamically (Section 3.5, pp. 14–15).
7. Producing a formula needs no optimistic assumption: produce the precise portion and mark the state imprecise when the formula is imprecise (Section 3.6, p. 15).

The check language includes symbolic expressions, symbolic permissions, permission-set separation, and `⊥`; the paper explains: “⊥ represents a static verification failure, instead of failing verification entirely, to accommodate imprecision.” (Section 3.3, p. 13). This permits incomplete proofs to continue while preserving a concrete obligation.

Verus form: Inference: represent precise ownership and abstract predicates using Verus ghost state and `spec fn` predicates, and make uncertainty an explicit ghost flag plus a set of obligations. Use `requires` and `ensures` for executable contracts and `invariant` clauses for loops. Verus has no built-in optimistic heap or run-time permission-check calculus; an implementation would need Rust run-time assertions or an external monitor. Inference: do not mark the function being verified `external_body`; that would move the proof boundary outside Verus. Proof functions/lemmas can establish precise cases, while ordinary executable code performs any dynamic checks.

Evidence and limits: Figure 10's `append` example uses `requires ? * true` and `ensures ? * acyclic(result)`. The symbolic walk emits a permission check for `l.next` when the field is first read, another when the else branch writes it, and checks for `acyclic(result)` at return (Section 3.9, pp. 16–18). These are formal derivations, not benchmark success rates. The calculus trusts its dynamic semantics, valuation construction, and correctness of the implementation translation.

## technique 2: guard execution and separate static transitions from dynamic steps

What it is: Static symbolic execution computes possible states and the checks needed before each concrete execution step. Guard judgments calculate checks for the actual path, rather than mixing a symbolic method-call transition with a dynamic call that may not complete.

Procedure (Sections 3.7–3.8, pp. 15–16):

1. Symbolically execute statements with a transition that returns a next symbolic state; do not assert checks as part of that transition.
2. At a method call, evaluate arguments, consume the callee precondition, and collect checks and an exclusion frame Θ.
3. At a field assignment, evaluate the receiver and value, consume the receiver's accessibility permission, and union the resulting checks.
4. At runtime, choose the guard whose path condition matches the current concrete state; assert every check in R and ensure the exclusion frame is respected before taking the dynamic step.
5. Continue with the resulting dynamic state and the corresponding symbolic state.

The rationale is explicit: “assertion of run-time checks must occur before a dynamic execution step may proceed.” (Section 3.7, p. 15). Θ prevents a caller from passing permissions to a callee when a callee's imprecise precondition cannot soundly describe those permissions. The example `append` walks both branches, retaining separate path conditions and checks before joining at the assignment and return (Section 3.9, pp. 16–18).

Verus form: Inference: encode guard obligations as preconditions of helper functions that perform the checked operation, and prove postconditions for the resulting state. A Rust wrapper can execute an assertion before an operation while Verus proves that the assertion establishes the callee's `requires`. The exclusion frame is an inferred ownership restriction; Verus's borrowing and tracked/ghost permissions can model it only when the ownership relation is represented explicitly. Inference: path splitting corresponds to separate proof branches, while dynamic check generation remains outside the verifier.

Evidence: The formal guard rules distinguish `SGuardCall` and `SGuardAssignField` and return both R and Θ (Figure 9, p. 16). The soundness theorem states that if a valid state satisfies the checks, “dynamic execution proceeds” (Theorem 1, Section 6.3, p. 22), and preservation says the next state is valid (Theorem 3, p. 22).

## technique 3: prove soundness through valuation and state correspondence

What it is: A valuation maps symbolic terms to concrete values for a particular execution trace. A correspondence relation requires that concrete heaps, permissions, stores, and path conditions model the symbolic state. Soundness then follows from progress and preservation.

Steps (Sections 5–6, pp. 20–22):

1. Define an initial valuation for symbolic values in the input state.
2. Extend it inductively for fresh symbolic values introduced by symbolic evaluation; the resulting valuation is written `V[J | H]` for judgment J and concrete heap H.
3. Define that a concrete heap and permission set model every precise field or predicate chunk, including disjoint footprints; optimistic chunks may overlap.
4. Require the concrete store to model the symbolic store and the path condition to evaluate to true.
5. Define valid dynamic states by correspondence to reachable symbolic states, including recursively validated intermediate stack frames.
6. Prove progress: a matching guard exists, and when its checks pass, a concrete transition exists.
7. Prove preservation: after that transition, the resulting dynamic state is still valid.

The paper emphasizes the key invariant: “A valid state is a dynamic state which is completely characterized by verification states.” (Section 6.2, p. 21). Its progress theorem requires a matching valuation and successful R checks; its preservation theorem carries the correspondence through one step (Section 6.3, p. 22).

Verus form: Inference: model correspondence as a ghost predicate relating a concrete Rust state to a ghost symbolic state, and prove each executor operation preserves it. Use `spec fn` predicates and proof functions/lemmas; use `old(...)` only in postconditions where a pre-state value is needed. Inference: Verus can check the correspondence lemmas, but it cannot by itself prove a separately implemented symbolic executor's soundness unless that executor and its semantics are included in the verified model.

Evidence and limits: The proof is for the formal GVLC0/SVLC0 calculi and their modeled dynamic semantics; no empirical accuracy denominator is claimed. The authors explicitly note that the formal system is a conservative extension of a Viper core and that its abstraction is chosen to remain close to implementation (Section 1, pp. 3–4). Thus implementation correctness and translation fidelity remain trusted assumptions unless separately verified.

## technique 4: detect and repair unsound interactions with exclusion frames

What it is: The paper's counterexample shows that an imprecise predicate folded before an allocation can incorrectly appear to grant permission to the newly allocated object when consumed by a callee. The old implementation then returns a value violating the caller's contract.

How the paper diagnoses and fixes it (Section 8, pp. 25–27):

1. Fold `imprecise()` before allocating `c`; symbolically it leaves a predicate chunk.
2. Allocate `c.value = 0`, then call `set(c,1)` whose precondition is `imprecise()`.
3. Symbolic consumption leaves the field chunk for `c.value`, so the caller proves `result == 0`; dynamic execution passes the caller's permission and writes `1`.
4. Observe that the implementation returns `1`, contradicting the contract because only reduced run-time checks were asserted.
5. Either clear heaps when consuming a non-precise formula or remove imprecise predicate instances when new permissions are added; both add checks and reduce static discharge.
6. Adopt an exclusion frame Θ: when a callee precondition is imprecise, prevent the caller's potentially overlapping permissions from being passed. The callee then fails to obtain `acc(c.value)`, preserving soundness.

The paper states the concrete contradiction: “Therefore the test method returns 1, which contradicts its contract.” (Section 8.1, p. 26). The chosen solution calculates Θ from the symbolic heaps and translates it to dynamic permissions, so the problematic permission cannot escape to `set` (Section 8.3, pp. 26–27).

Verus form: Inference: require a ghost exclusion set or ownership predicate at calls with imprecise contracts, and prove that caller-owned resources outside the allowed frame cannot be consumed by the callee. Rust's borrow checker may enforce some cases, but ghost predicates are needed for abstract recursive footprints. This is an inference from the paper's ownership argument, not a Verus feature claimed by the paper.

## what is proved, measured, and trusted

The paper proves symbolic-execution soundness for the formal languages: successful checks imply progress, matching guards exist for possible paths, and preservation holds. It does not report a benchmark percentage or runtime denominator for the proof; the evidence is theorem statements and worked derivations. The discovered Gradual C0 bug shows that prior empirical testing missed a semantic interaction: “Despite DiVincenzo et al. [2022]’s thorough empirical evaluation and testing of Gradual C0, this bug was never discovered in their testing.” (Section 1, p. 4). Trusted elements include the formal dynamic semantics, the valuation construction, the parser/translation to the modeled language, and any implementation code outside the proved calculus.

Inference: for VL, gradual checking suggests a way to stage verification of agent-written Rust, but adding dynamic checks can create a second semantics that must match the proof model. The threat is high when imprecise or opaque specifications overlap with mutable state, allocation, recursive predicates, or trusted code. Existing Verus studies cover contracts, loop invariants, and ownership patterns; VL should reuse those and prioritize explicit correspondence proofs and sound handling of every trusted boundary. The paper's error is a warning against assuming that passing static obligations plus a few runtime checks implies end-to-end soundness.

## techniques for the catalog

- optimistic symbolic heaps — track precise and imprecise ownership separately, emitting checks whenever a proof relies on an optimistic field or permission
- guard-based dynamic checking — compute path-specific checks and exclusion frames before each concrete operation, then execute only after checks pass
- valuation correspondence proof — relate symbolic terms and heaps to concrete states and prove progress plus preservation
- exclusion-frame repair — prevent permissions represented by imprecise caller state from escaping to callees when recursive predicates and allocation can overlap
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
