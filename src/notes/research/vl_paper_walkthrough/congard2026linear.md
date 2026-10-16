# Linear Effects, Exceptions, and Resource Safety
(authored by agents unless marked 🧑)
Tag: `congard2026linear`, [paper](https://doi.org/10.1007/978-3-032-22720-1_8)

## scope and result

Congard, Munch-Maccagnoni, and Douence develop linear and ordered call-by-push-value calculi for allocation, exceptions, and destructor-like cleanup. The paper's abstract says: “We analyse the problem of combining linearity, effects, and exceptions, in abstract models of programming languages, as the issue of providing some kind of strength for a monad T (− ⊕ E) in a linear setting.” (Abstract, p. 195). Their concrete resource model treats a free list of resources as state. The two basic operations are “new : I ⊸ R ⊕ I acquires a resource, or fails if there are no resources available” and “delete : R ⊸ I releases the given resource without fail.” (Section 1.5, p. 195). The result is a type-directed safety theorem: closed programs returning a resource-free positive value return the original free list up to permutation in the linear calculus, and exactly unchanged in the ordered calculus. The authors then add exceptions, chosen destructors, and an effectful move operation, translating the richer calculus into the proven core.

Inference: the paper is a semantic design and proof blueprint for resource protocols; it is not a Rust or Verus implementation benchmark, and it gives no empirical denominator such as program count or runtime.

## technique 1: model allocation with a linear state monad

what it is: represent available resources by a list and interpret an effectful computation as a linear state transformer. The paper defines “T A = [R] ⊸ A ⊗ [R]” (Section 1.5, p. 196). `new` pops a resource or returns an error when the list is empty; `delete` pushes a resource and cannot fail. A closed computation receives an initial free list and produces a value plus a final list.

when to use: use this model when the property of interest is allocation, release, and no double release, while resource contents are intentionally abstract. The paper explicitly says, “we are only interested in observing resource-safety properties of the program state arising from the (correct) use of new and delete.” (Section 1.5, p. 195).

how to do it:

1. choose an atomic resource type `R` and a list `[R]` as allocator state (Section 1.5, p. 196)
2. define `T A` as the linear state transformer ` [R] ⊸ A ⊗ [R]` (Section 1.5, p. 196)
3. define `new` to pop the head, returning `ι1 r`, or `ι2 ()` on `Nil`; define `delete` to push `r` (Sections 1.5 and 2.4, pp. 196, 200)
4. run a closed program with an arbitrary initial list and inspect the final list (Section 1.5, p. 196)
5. for a positive result type with no `R`, prove the final list is a permutation of the initial list; in the ordered fragment prove identity (Section 3, pp. 201–204)

Verus form. Inference: model the free list as an executable `Seq<R>` or a ghost sequence, and expose allocator transitions through a verified API. Use `requires` to require that `delete` receives an owned live resource and `ensures` to state that it adds exactly that resource; use a `spec fn` to state permutation or multiset equality of initial and final ghost lists. A Verus `proof fn` can establish preservation lemmas for push/pop, while executable Rust owns the actual resource handle. Inference: Verus does not automatically provide the paper's linear type discipline, so the API must prevent copying handles and make invalid states unrepresentable or explicitly assumed.

evidence and limits: the evidence is a formal definition and theorems, not experiments. The paper states that resource safety means “all allocated resources are released by the end of the program,” “only previously-allocated resources are released,” and “no resource has been released twice” (Section 3, p. 202). The model abstracts away operations that use a resource and assumes the only observable action is release; it therefore does not prove functional correctness of resource contents.

## technique 2: ordered contexts for LIFO safety

what it is: remove exchange from the linear type system, retain an ordered context, and track resource occurrences as a list inside typing judgments. The ordered theorem is stronger because order cannot be rearranged by a structural rule.

how to do it:

1. restrict structural substitutions to order-preserving maps, producing the ordered calculus `O` (Section 2.2, p. 199)
2. shape a context as `Θ = Γ ; L ; Δ`, where `L` is the ordered resource list and variables occur around it (Section 3.1, p. 202)
3. define `LR(t)` as the resource list recorded by the typing derivation and define context concatenation only in the three well-formed cases given by the paper (Section 3.1, p. 202)
4. prove left and right substitution lemmas preserving concatenated resource lists (Lemma 8, p. 203)
5. prove reduction preserves the list (Theorem 9, p. 203), then conclude that a closed resource-free positive program has final list exactly equal to its initial list (Proposition 6, p. 202)

Verus form. Inference: represent an ordered ownership stack as a ghost `Seq<HandleId>` and make each proof operation preserve its exact sequence. Use `requires` for a stack-shape invariant and `ensures` for equality of the post-state sequence; loop invariants or `proof fn` lemmas can mirror Theorem 9. Rust's borrow checker enforces lexical borrowing constraints but does not by itself prove arbitrary destructor order, so the order claim remains a Verus specification.

evidence and limits: Proposition 6 states “if ⟨t | ⋆ | l⟩ ⇝∗ ⟨v | ⋆ | l′ ⟩ then l′ = l.” (Section 3.1, p. 202). The guarantee relies on no exchange and on a resource-free positive result. It is specifically LIFO; adding unrestricted exchange weakens the result to permutation.

## technique 3: test a proposed rule with a typed counterexample

what it is: reject right functions in the ordered calculus by constructing a well-typed term that reverses two resources. This is a reusable method for checking whether an apparently harmless language feature breaks a safety invariant.

how to do it:

1. define a right-function `tr = let i = delete r in δ(i, ().λx. delete x)` (Equation 14, p. 204)
2. apply `tr` to a later resource `s`, after allocating `r` then `s`
3. follow the operational reductions from initial list `r0 :: r1 :: l`
4. observe the final list `r1 :: r0 :: l`, contradicting LIFO (Section 3.2, p. 204)

Verus form. Inference: encode the intended stack order as a ghost sequence and write a small executable test whose postcondition requires equality with the original sequence. A `proof fn` should show that every allowed operation preserves order; the counterexample should fail verification when the API exposes an operation equivalent to right application. Do not model `invariant(...)` as a call; use loop invariants only where a loop exists.

evidence and limits: the paper gives a concrete derivation and reduction, not a statistical test. It proves a language-design incompatibility under the stated ordered semantics, not that all right-function implementations are unsafe in every language.

## technique 4: linear safety by preservation and progress

what it is: establish the core calculus's operational soundness before resource theorems. The machine has expressions, a stack, a free list, and polarity. `new` and `delete` are the only rules that manipulate the free list (Section 2.4, p. 200).

how to do it:

1. define typing for expressions, stacks, and commands, including an axiom typing each runtime resource `r_n : R` (Section 2.5, p. 200)
2. prove substitution (Lemma 3, p. 200)
3. prove subject reduction: every reduction preserves the command typing (Theorem 4, p. 200)
4. prove progress: every well-typed command reduces unless it is a final value with an empty stack (Theorem 5, p. 200)
5. combine these with the resource-list invariant to obtain safety for terminating runs; the theorem does not require termination (Sections 2.5 and 3, pp. 200–201)

Verus form. Inference: use `spec fn` predicates for well-typed machine states, `requires`/`ensures` on transition functions, and `proof fn` lemmas for substitution and preservation. For a loop, provide a loop invariant with Verus syntax supported by the local Verus guide; do not put `ensures` on a `spec fn` or call a proof function at runtime.

evidence and limits: Proposition 2 establishes deterministic reduction (p. 200), and Theorems 4–5 establish preservation and progress. The result permits infinite reduction, so it is a safety theorem rather than a termination theorem.

## technique 5: compile exceptions and destructors into the linear core

what it is: extend ordered CBPV with `new` that raises on allocation failure, `drop_A` destructors for every positive type, `raise`, `try`, and `move`; then translate its derivations into the core linear calculus `L`. The paper says, “Its semantics is given by translation into L: exceptions are propagated as errors, removing variables from the context with their associated destructor.” (Section 4, p. 205).

how to do it:

1. assign every positive type a chosen destructor; for example `drop_R = λr. delete r` and for a pair drop the second component before the first (Section 4.3, p. 207)
2. define `drop_ctx` to drop a context right-to-left, `unwind` to clean a context while retaining an exception, and `raise` to inhabit a type after cleanup (Section 4.3, pp. 208–209)
3. translate values to positive interpretations and expressions to linear expressions, inserting explicit coercions (Section 4.3, p. 208)
4. translate `let` so an exception branch invokes `raise` after dropping the continuation context; translate `try` by case analysis on the computation result (Section 4.3, p. 209)
5. apply the core resource theorem to the translated term (Theorem 11, p. 209)

Verus form. Inference: represent a destructor as a verified function with a contract that consumes an owned value and establishes cleanup. Encode exception paths with Rust `Result` and prove both `Ok` and `Err` branches clean the ghost ownership state. Use `requires`, `ensures`, `spec fn`, and `proof fn`; `external_body` should be reserved for genuinely trusted external implementations, not the function being verified.

evidence and limits: Theorem 11 proves final-list permutation for the move-enabled calculus and identity when `move` is absent (p. 209). The theorem assumes the exception type is purely positive and resource-free and relies on the translation being well typed; it does not verify a real Rust panic runtime.

## technique 6: treat move as an effectful exchange

what it is: expose reordering as an explicit operation whose execution can change destructor order, rather than as a pure structural exchange. The paper's example allocates `r`, `s`, and `t`, then uses `move` to change cleanup order when allocation of `t` fails (Section 4.2, pp. 207–208).

how to do it:

1. define `move(x) in t` to place `x` on top of the stack (Section 4.1, p. 206)
2. compare two programs that both free three resources in reverse order but differ by a `move` before cleanup (Section 4.2, p. 207)
3. run both under an initial free list `[r0, r1]` and force allocation failure for `t`
4. observe final lists `[r0, r1]` versus `[r1, r0]`; therefore `move` is effectful and cannot be a contextual isomorphism for arbitrary types (Section 4.2, p. 207)

Verus form. Inference: model `move` as a state transition with an explicit postcondition describing the new ghost order. Do not silently use commutativity of a sequence; prove only the permutation or order property required by the API. If VL does not need observable destructor order, a simpler multiset contract may be sufficient, but that is a product decision rather than a result of this paper.

evidence and limits: the evidence is the two reduction traces and the contextual-isomorphism argument. It assumes destructor order is observable through the free list; real Rust may hide or expose different effects.

## technique 7: validate ordered rules with a presheaf model

what it is: interpret the ordered calculus in a presheaf category indexed by resource lists, using list concatenation as a non-symmetric monoidal product. The model explains why left functions and right let bindings are admissible while right functions would reorder resources.

how to do it:

1. take the category of sets indexed by lists of natural-number resources and interpret a type at each list (Section 5, p. 210)
2. define tensor by splitting a list into `l1 ++ l2 = l`, and interpret the allocation state as the list presheaf `[R]` (Section 5, p. 210)
3. use the endofunctor isomorphism `A ⊗ F B ≃ F (A ⊗ B)` to interpret the allowed ordered rules (Equation 16, p. 210)
4. observe that a right function would require the unavailable isomorphism `F A ⊗ B ≃ F (A ⊗ B)`, exactly the resource reordering in the counterexample (Section 5, p. 210)
5. prove substitution and semantic soundness of reduction in the model (Lemma 12 and Theorem 13, p. 210)

Verus form. Inference: treat this as a specification-model check for an ownership API: define a ghost sequence model, prove that each API operation refines the model transition, and reject operations whose refinement would require exchanging sequence segments. A Verus proof of the model correspondence would be an additional assurance layer, not a replacement for executable testing.

evidence and limits: Theorem 13 states, “For all L, c, c′ such that L ⊢o c and L ⊢o c′ , if c ⇝ c′ then c = c′.” (Section 5, p. 210). The model is mathematical and resource-order specific; the authors leave richer presheaf constructions for the linear and move-enabled settings as future work (Section 5.1, p. 211).

## what is proved, what remains trusted, and implications for VL

The paper proves determinism, substitution, subject reduction, progress, ordered list preservation, linear permutation preservation, and the translated exception/destructor theorem. It measures nothing experimentally. Trusted assumptions include the typing rules, the semantic translation, the abstract allocation monad, and the premise that a result type and exception type contain no resource. Resource contents, OS allocator behavior, Rust compiler correctness, and the adequacy of any Verus encoding remain outside the proof.

Inference: the threat to agent-written verified Rust is moderate at the ownership-protocol level. The paper gives a precise recipe for specifying cleanup on success and failure, but it does not address unsafe pointer validity, concurrency, FFI, or whether a Verus contract states the product requirement. VL should not redo the paper's core calculus or its LIFO counterexample. A useful integration is a Verus library that exposes owned resource handles, explicit cleanup contracts, and a ghost sequence or multiset theorem for `Result` error paths, together with regression tests for destructor order.

## techniques for the catalog

- allocation state monad — model resources as a linear free-list transformer and prove final-state preservation
- ordered context accounting — track resource lists in ordered typing contexts to obtain exact LIFO preservation
- typed counterexample — test language extensions by constructing a well-typed term that violates the target invariant
- preservation and progress — establish machine typing safety before resource-specific invariants
- destructor and exception translation — compile cleanup and error paths into a linear core with established theorems
- effectful move — represent ownership reordering as an explicit stateful operation
- presheaf semantics — model ordered resource lists to validate admissible rules and sound reduction

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
