# Sound Gradual Verification with Symbolic Execution
(authored by agents unless marked 🧑)
Tag: `zimmerman2023sound`, [paper](http://arxiv.org/abs/2311.07559v1)
## what the paper establishes

The paper formalizes and proves soundness for Gradual C0, a gradual verifier for recursive heap structures, and for a core Viper subset using implicit dynamic frames (IDF). Gradual specifications may leave part of a formula unknown; static symbolic execution uses optimistic assumptions and emits run-time checks for those assumptions. The paper's motivation is that “A developer can now write partial, imprecise specifications—formulas such as ? ∗ x.f == 2—backed by run-time checking.” (Section 1, p. 1). The formal system keeps a precise heap and an optimistic heap, a symbolic store, a path condition, and an imprecise flag, and it computes a set of run-time checks separately from the symbolic transition (Sections 3.2 and 3.7, pp. 13 and 15–16).

The main soundness result is progress and preservation relative to a concrete execution semantics. The authors state: “We prove our approach is sound; our proof also covers a core subset of the Viper tool, for which we are aware of no previous soundness result.” (Abstract, p. 1). Their proof defines a valuation from symbolic values to concrete values, a correspondence relation between symbolic and dynamic states, and guards that must pass before execution steps. They also report a real defect in the earlier Gradual C0 implementation: “This unsoundness results from the combination of imprecise specifications, static verification with isorecursive predicates, and run-time checking with equirecursive predicates.” (Section 8, p. 24).

## technique 1: symbolic execution with precise and optimistic heaps

What it is: SVLC0 symbolic states contain a path condition, a symbolic heap, and a symbolic environment (Section 2.2, p. 6). GVLC0 states are a quintuple of an imprecise flag, a precise heap H, an optimistic heap H̃ (field chunks only), a store, and a path condition (Section 3.2, p. 13). Chunks in the precise heap must represent distinct locations at run time; chunks in the optimistic heap “may represent the same location in the heap at run time”, and the optimistic heap must be empty unless the state is imprecise (Section 3.2, p. 13).

How to apply it (Sections 2.2–2.4 and 3.2–3.6, pp. 5–15):

1. Represent each variable by a symbolic term, maintain a path condition, and represent owned fields and predicates as heap chunks. Evaluation returns a term and an updated symbolic state.
2. For a field read in a precise state, find a matching chunk whose receiver the path condition proves equal to the receiver term. If none exists, the rule `SEvalFieldFailure` yields the check set `{⊥}` (Section 3.4, p. 13).
3. For a field read in an imprecise state with no matching chunk in either heap, `SEvalFieldImprecise` adds a chunk with a fresh value to the optimistic heap and emits a run-time check asserting permission to access the field; a chunk already in the optimistic heap needs no new check (Section 3.4, pp. 13–14).
4. To consume a formula, remove its chunks from the appropriate heap; removing a field chunk also removes every chunk that may alias it (`remf`, `remfp`, Section 3.5, p. 14). Consuming `? * φ` empties the precise and optimistic heaps and yields an imprecise state. Expressions in φ are evaluated in an imprecise copy of the state, so unframed fields can be assumed with checks, while the assertions use the original, possibly precise, state (Section 3.5, p. 14).
5. In an imprecise state, an expression the path condition does not imply is added to the run-time check set (and to the path condition). In a precise state the same situation gives `{⊥}` (`SConsumeValueImprecise`, `SConsumeValueFailure`, Fig. 8, p. 15). The same optimism applies to accessibility predicates and predicate instances.
6. Collect the permissions consumed by each conjunct of a separating conjunction as sets Θ1 and Θ2. If the check set contains a symbolic permission, separation can no longer be assumed, so add the check `sep(Θ1,Θ2)`, which asserts that the two permission sets are disjoint at run time (Section 3.5, p. 15; `SConsumeConjunctionImprecise`, Appendix C.9, p. 47).
7. Producing a formula needs no optimistic assumption: produce the precise portion and mark the state imprecise when the formula is imprecise (Section 3.6, p. 15).

The check language includes symbolic expressions, symbolic permissions, permission-set separation, and `⊥`; the paper explains: “⊥ represents a static verification failure. We represent static verification failure as an unsatisfiable run-time check, instead of failing verification entirely, to accommodate imprecision.” (Section 3.3, p. 13). The appendix adds that “there is no rule for ⊥; by design it can never be satisfied” (Appendix C.5, p. 42), so a branch whose check set contains `⊥` can never pass its checks.

Verus form: Inference (not from the paper; Verus facts below were not checked against Verus documentation): represent precise ownership and abstract predicates using Verus ghost state and `spec fn` predicates, and make uncertainty an explicit ghost flag plus a set of obligations. Use `requires` and `ensures` for executable contracts and `invariant` clauses for loops. Verus probably has no built-in optimistic heap or run-time permission-check calculus; an implementation would need Rust run-time assertions or an external monitor. Inference: do not mark the function being verified `external_body`; that would move the proof boundary outside Verus. Proof functions/lemmas can establish precise cases, while ordinary executable code performs any dynamic checks.

Evidence and limits: Figure 10's `append` example uses `requires ? * true` and `ensures ? * acyclic(result)`. The symbolic walk emits a permission check `⟨ν1, next⟩` at the `if` (line 5, where `l.next` is first read), the same check at the write `l.next = n` (line 9) on the path that took the else branch, and a check for `⟨acyclic, ν1⟩` on both paths at the postcondition (Section 3.9, pp. 16–18). These are formal derivations, not benchmark success rates. The calculus is stated relative to its own dynamic semantics (Section 4) and valuation construction (Section 6.1).

## technique 2: guard execution and separate static transitions from dynamic steps

What it is: Static symbolic execution computes possible states and the checks needed before each concrete execution step. Guard judgments calculate checks for the actual path, rather than mixing a symbolic method-call transition with a dynamic call that may not complete.

Procedure (Sections 3.7–3.8 and 6.3, pp. 15–16 and 22):

1. Symbolically execute statements with a transition that returns a next symbolic state; do not assert checks as part of that transition.
2. At a method call, evaluate arguments, consume the callee precondition, and collect checks and an exclusion frame Θ.
3. At a field assignment `x.f = e`, evaluate `e`, consume `acc(x.f)`, and union the resulting checks. Assignments to variables, `if` conditions, and field-free statements produce checks only from evaluating their expressions, and `alloc` produces none (Fig. 9, p. 16; Appendix C.12, pp. 49–50).
4. At run time, take the guard whose path condition holds for the current concrete state (Theorem 2 says one always exists), assert every check in R, and respect the exclusion frame Θ before taking the dynamic step.
5. Continue with the resulting dynamic state and the corresponding symbolic state.

The rationale is explicit: “assertion of run-time checks must occur before a dynamic execution step may proceed.” (Section 3.7, p. 16). The paper also gives a reason for separating the two: “a method call occurs in one step during symbolic execution but may never complete during dynamic execution” (Section 3.7, p. 15). Θ is the exclusion frame, “a set of permissions which may not be passed to the callee or loop body” (Section 4.5, p. 19). For a call whose precondition is not completely precise, Θ holds all permissions in the current symbolic heaps (`rem`, Fig. 9, p. 16). The `append` example is walked path by path, and the paper notes that it does “not actually join execution” at the end of the `if` (Section 2.8, p. 11); Section 3.9 likewise follows both paths to the end (pp. 16–18).

Verus form: Inference: encode guard obligations as preconditions of helper functions that perform the checked operation, and prove postconditions for the resulting state. A Rust wrapper can execute an assertion before an operation while Verus proves that the assertion establishes the callee's `requires`. The exclusion frame is an inferred ownership restriction; Verus's borrowing and tracked/ghost permissions can model it only when the ownership relation is represented explicitly. Inference: path splitting corresponds to separate proof branches, while dynamic check generation remains outside the verifier.

Evidence: The formal guard rules distinguish `SGuardCall` and `SGuardAssignField` and return both R and Θ (Figure 9, p. 16). Section 6.3 describes Theorem 1 as stating “if Γ is a valid state and Γ satisfies the run-time checks calculated by a guard with a path condition that matches the current dynamic state, then dynamic execution proceeds” (p. 22), and Theorem 3 (preservation) says the next state is valid (p. 22).

## technique 3: prove soundness through valuation and state correspondence

What it is: A valuation maps symbolic terms to concrete values for a particular execution trace. A correspondence relation requires that concrete heaps, permissions, stores, and path conditions model the symbolic state. Soundness then follows from progress and preservation.

Steps (Sections 5–6, pp. 20–22; full proofs in Appendix D, pp. 51–114):

1. Define an initial valuation for symbolic values in the input state.
2. Extend it by induction on the judgment derivation for fresh symbolic values introduced by symbolic evaluation; the resulting valuation is written `V[J | H]` for judgment J and dynamic heap H, and the heap supplies values for optimistically added fields (Section 6.1, p. 21).
3. Define that a concrete heap and permission set model every precise field or predicate chunk, including disjoint footprints; optimistic chunks need not have disjoint footprints (Section 5.1, p. 20).
4. Require the concrete store to model the symbolic store and the path condition to evaluate to true.
5. Define valid dynamic states by correspondence to reachable symbolic states, including recursively validated intermediate stack frames.
6. Prove progress: a matching guard exists (Theorem 2), and when its checks pass, a concrete transition exists (Theorem 1).
7. Prove preservation: after that transition, the resulting dynamic state is still valid.

The paper emphasizes the key invariant: “A valid state is a dynamic state which is completely characterized by verification states.” (Section 6.2, p. 21). Its progress theorem requires a matching valuation and successful R checks; its preservation theorem carries the correspondence through one step (Section 6.3, p. 22).

Verus form: Inference: model correspondence as a ghost predicate relating a concrete Rust state to a ghost symbolic state, and prove each executor operation preserves it. Use `spec fn` predicates and proof functions/lemmas; use `old(...)` only in postconditions where a pre-state value is needed. Inference: Verus can check the correspondence lemmas, but it cannot by itself prove a separately implemented symbolic executor's soundness unless that executor and its semantics are included in the verified model.

Evidence and limits: The proof is for the formal GVLC0/SVLC0 calculi and their modeled dynamic semantics; no empirical accuracy denominator is claimed. The authors note that the formal system is “a conservative extension of a core calculus of Viper” and is “far closer to the implementation of Gradual C0” than the earlier formal system (Section 1, p. 2). They also say that soundness is “contingent on the soundness of the SMT solver” (Section 10, p. 28). Inference: the correspondence between the formal model and the Gradual C0 code, and the SMT solver, are therefore trusted unless verified separately.

## technique 4: detect and repair unsound interactions with exclusion frames

What it is: The paper's counterexample shows that an imprecise predicate folded before an allocation can incorrectly appear to grant permission to the newly allocated object when consumed by a callee. The old implementation then returns a value violating the caller's contract.

How the paper diagnoses and fixes it (Section 8, pp. 24–27):

1. Fold `imprecise()` before allocating `c`; symbolically it leaves a predicate chunk.
2. Allocate `c.value = 0`, then call `set(c,1)` whose precondition is `imprecise()`.
3. Symbolic consumption leaves the field chunk for `c.value`, so the caller proves `result == 0`; dynamic execution passes the caller's permission and writes `1`.
4. Observe that the implementation returns `1`, contradicting the contract because only reduced run-time checks were asserted.
5. The paper first considers two more conservative static options, which it does not adopt: clear the symbolic heaps when consuming a formula that is not completely precise, or remove not-completely-precise predicate instances when permissions are added. Both would also need an imprecise state, and “reduce the number of assertions that can be statically discharged”, so “more run-time checks would be necessary” (Section 8.3, p. 26).
6. Adopt an exclusion frame Θ: when the callee precondition is not completely precise, Θ is every permission in the caller's symbolic heaps, and dynamic execution passes the callee all owned permissions except Θ. In the example Θ = {⟨t1, value⟩}, so the check for `acc(c.value)` at line 8 cannot be asserted and execution fails there (Section 8.3, p. 26).

The paper states the concrete contradiction: “Therefore the test method returns 1, which contradicts its contract.” (Section 8.1, p. 25). The chosen solution calculates Θ from the symbolic heaps and translates it to dynamic permissions with a valuation, so the problematic permission cannot escape to `set` (Section 8.3, pp. 26–27). The paper has not implemented this in Gradual C0: “There are important implementation challenges that must be addressed before this change can be implemented in Gradual C0” (Section 8.4, p. 27).

Verus form: Inference: require a ghost exclusion set or ownership predicate at calls with imprecise contracts, and prove that caller-owned resources outside the allowed frame cannot be consumed by the callee. Rust's borrow checker may enforce some cases, but ghost predicates are needed for abstract recursive footprints. This is an inference from the paper's ownership argument, not a Verus feature claimed by the paper.

## what is proved, measured, and trusted

The paper proves symbolic-execution soundness for the formal languages: successful checks imply progress, matching guards exist for possible paths, and preservation holds. It does not report a benchmark percentage or runtime denominator for the proof; the evidence is theorem statements and worked derivations. The discovered Gradual C0 bug shows that prior empirical testing missed a semantic interaction: “Despite DiVincenzo et al. [2022]’s thorough empirical evaluation and testing of Gradual C0, this bug was never discovered in their testing.” (Section 1, p. 3). Stated scope limits: no arrays or quantified formulas (Section 2.1, p. 4); no domains, fractional permissions, or joining of symbolic execution paths (Section 9, p. 27); and the gradual guarantee is not proved (“we have not completed a formal proof”, Section 9, p. 27). Trusted elements named by the paper are the SMT solver (Section 10, p. 28) and the fidelity of the formal model to the Gradual C0 implementation (Sections 3.3 and 7.2, pp. 13 and 23–24).

Inference: for VL, gradual checking suggests a way to stage verification of agent-written Rust, but adding dynamic checks can create a second semantics that must match the proof model. The threat is high when imprecise or opaque specifications overlap with mutable state, allocation, recursive predicates, or trusted code. Existing Verus studies cover contracts, loop invariants, and ownership patterns; VL should reuse those and prioritize explicit correspondence proofs and sound handling of every trusted boundary. The paper's error is a warning against assuming that passing static obligations plus a few runtime checks implies end-to-end soundness.

## techniques for the catalog

- optimistic symbolic heaps — track precise and imprecise ownership separately, emitting checks whenever a proof relies on an optimistic field or permission
- guard-based dynamic checking — compute path-specific checks and exclusion frames before each concrete operation, then execute only after checks pass
- valuation correspondence proof — relate symbolic terms and heaps to concrete states and prove progress plus preservation
- exclusion-frame repair — withhold from a callee with a not-completely-precise precondition the permissions in the caller's symbolic heaps, so a folded predicate instance cannot be treated as covering locations allocated after it was folded
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "A guard judgement determines the set of runtime checks that must be satisﬁed at the given veriﬁcation state before taking the next execution step, and determines the exclusion frame required to preserve the validity of heap chunks contained by the current symbolic state."): I read the whole paper text (main text pp. 1–28 and appendices A–D, pp. 31–114) and checked every quotation, page and section reference, the rule names and the technique steps against it. I changed: page numbers for the Section 1 quote (p. 1, not 2), the Section 8 quote (p. 24, not 25), the Section 8.1 quote (p. 25, not 26), the Section 3.7 quote (p. 16, not 15) and the Section 1 testing quote (p. 3, not 4); the abstract and Section 3.3 quotes, which had been cut or spliced; the description of consuming `? * φ`, of the `sep` check, of field-assignment guards and of `append` (the paths are never joined); the Θ and exclusion-frame description; and the trusted-elements paragraph, where the parser claim had no support in the paper. I added the paper's own scope limits and the unimplemented status of the fix. The tag line is kept; the link is the arXiv identifier printed on the paper's first page. I did not check the appendix proofs for correctness (lemmas 1–60 were read, not re-derived), and I did not check any statement about Verus, Rust or the VL project, which are marked Inference and come from outside the paper.
