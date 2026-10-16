# Linear effects, exceptions, and resource safety: a Curry-Howard correspondence for destructors
(authored by agents unless marked 🧑)
Tag: `congard2025linear` , [paper](https://www.semanticscholar.org/paper/af36b7ca02e7fc5fa9731691d135483f39c6ef6b)

## scope and claims
The paper gives a formal account of combining linearity, effects, exceptions, and C++/Rust-style destructors. Its central construction interprets a resource type as a value equipped with a default destructor and studies two calculi: an ordered allocation calculus and a resource call-by-push-value (CBPV) calculus with exceptions, `drop`, and effectful `move`. The authors state: “We analyse the problem of combining linearity, effects, and exceptions, in abstract models of programming languages, as the issue of providing some kind of strength for a monad T (− ⊕ E) in a linear setting.” (Abstract, p. 1)

The formal results are safety theorems, not an implementation or a Rust benchmark. For closed programs returning a resource-free positive value, the ordered fragment preserves the exact free-list, while the fragment with exchange preserves it up to permutation. The resource-CBPV translation transfers those properties and makes the no-`move` fragment exact. Inference: a Verus engineer can use the paper as a design pattern for explicit ownership cleanup and exception paths, but the paper does not prove a Verus encoding or any Rust program.

## technique 1: track resources with an ordered linear calculus

What it is

The first calculus, written `L` in the paper, has linear contexts and allocation effects `new` and `delete`. A typing derivation records each resource exactly once. The ordered subcalculus `O` removes exchange, so variable order is part of the proof. The operational machine evaluates terms with a stack and a free-list. The paper explains: “We now define reduction rules: let bindings of negative expressions perform the substitution them immediately, following call-by-name reduction, while let bindings of positive expressions push their continuation on the stack to first reduce the expression to a value.” (Section 2.4, p. 11)

When to use it

Use this method when resources must be allocated and released exactly once and cleanup order matters. The ordered variant is the choice when a LIFO discipline is required. It assumes termination is not needed for the preservation argument: the paper explicitly says that progress plus subject reduction establishes either indefinite reduction or a final command, and its resource theorem is conditional on reaching a final value.

How to apply it

1. Define resource-free positive result types `W` from unit, tensor, and sum. The paper gives `W ::= 1 | W ⊗ W' | W ⊕ W'` (Section 2.3, p. 10).
2. Type `new` as an allocation operation and `delete` as consuming a resource. In the example, two resources are allocated and the failure branch deletes the first resource before returning (Section 2.2, p. 10).
3. Run the abstract machine whose command is an expression, stack, free-list, and polarity. Only `new` and `delete` mutate the free-list (Section 2.4, p. 11).
4. Extend typing with a resource list in the context, written `Γ; L; Δ`. Define `LR(t)` as the list `L` attached to the derivation (Section 3.1, pp. 13–14).
5. Prove left and right substitution lemmas. The paper's left lemma states: “If ; Lt ; ⊢o t and Γ, x; Lu ; Δ ⊢o u, then Γ; Lt ++ Lu ; Δ ⊢o u[t∕x].” (Lemma 8, p. 14) The right lemma concatenates in the opposite order.
6. Extend the resource judgment to stacks and commands, placing stack resources before expression resources. Show one reduction preserves the entire resource list (Theorem 9, p. 14).
7. Conclude the ordered theorem: “For any value v and lists of resources l, l′, if ⟨t ∣ ⋆ ∣ l⟩ ⇝∗ ⟨v ∣ ⋆ ∣ l′⟩ then l′ = l.” (Proposition 6, p. 13)

Verus form (inference)

Inference: represent each live resource with a Rust value whose ownership prevents duplication, and expose a ghost sequence of resource identifiers in a `tracked` or specification state. A function that allocates can return an owned resource plus a proof that the ghost sequence grew; a destructor-like function consumes the owner and proves the sequence shrank. Use `requires` and `ensures` on executable functions, and a loop `invariant` for a cleanup loop. Verus has no direct ordered-context judgment, so the sequence and its permutation/equality relation must be stated explicitly. Do not model a proof function as runtime code; keep mathematical bookkeeping in `spec fn` or proof code. Inference: the exact theorem is easiest for a stack-shaped cleanup routine, where the invariant says the remaining owners equal the suffix of the allocation sequence.

Evidence

The authors prove determinism (Proposition 2), substitution (Lemma 3), subject reduction (Theorem 4), and progress (Theorem 5) before proving resource safety. Their ordered proof tracks `LR(t)` and establishes that reduction preserves it (Theorem 9), then derives Proposition 6 by induction. There are no experimental denominators or performance measurements; the evidence is the stated metatheory and derivations. The theorem applies to a closed typed expression of purely positive resource-free type that reaches a value.

Failure modes and assumptions

The ordered language forbids exchange and right functions. The paper gives a counterexample using a right function that changes two resources from `r0 :: r1 :: l` to `r1 :: r0 :: l`, contradicting LIFO (Section 3.2, pp. 14–15). It also notes that the progress proof does not establish termination. Inference: a Verus proof that assumes a cleanup loop terminates needs a separate decreases argument or a bounded loop; this paper supplies no such argument.

## technique 2: weaken exact order to permutation safety

What it is

Adding exchange yields the unrestricted calculus `L`, where cleanup may reorder resources but cannot lose, duplicate, or release an unknown resource. The theorem is: “For all v, l, l′ such that ⟨t ∣ ⋆ ∣ l⟩ ⇝∗ ⟨v ∣ ⋆ ∣ l′⟩, there exists a permutation σ of lists of resources such that l′ = σ(l).” (Theorem 10, Section 3.3, p. 15)

When to use it

Use permutation safety when resources may be released in arbitrary order, as in a language with exchange or Rust-style moves. The guarantee is set/multiset preservation rather than a particular destructor order. It still covers allocation failures because the earlier resource-safety discussion states that the desired properties remain true “in case of an error during the program execution, including an allocation error.” (Section 3, p. 13)

How to apply it

1. Keep the same machine and linear typing, but permit exchange in contexts.
2. Track a resource list while ignoring variable order in the predicate `Γ; L; Δ ⊢o t`; context concatenation then needs one substitution lemma rather than the ordered preconditions (Section 3.3, p. 15).
3. Prove reduction preserves the unordered resource inventory by the same subject-reduction and substitution pattern.
4. At a successful final command, compare initial and final lists modulo a permutation; use equality when order is irrelevant and a permutation relation when order is observable.

Verus form (inference)

Inference: specify a finite map from resource IDs to ownership state, or a sequence together with a permutation predicate. A cleanup function can ensure that the multiset of consumed IDs equals the multiset of allocated IDs and that each ID is consumed at most once. For a vector of resources, use a loop invariant stating that the unprocessed suffix plus the consumed prefix is a permutation of the original vector. Verus's sequence and set specifications can express this, but the paper does not identify exact Verus library lemmas; those proof details must be supplied by the implementer.

Evidence and limits

The evidence is Theorem 10 and its proof sketch: “This is proved similarly to proposition 6, by forgetting the order of variables and resources in the predicate Γ; L; Δ ⊢o t.” (Section 3.3, p. 15) No implementation measurements are reported. The theorem assumes well-typed closed expressions and a final value; it does not prove behavior of an actual Rust allocator or unsafe pointer operations.

## technique 3: model exceptions with destructors and effectful move

What it is

The resource CBPV calculus adds an allocation effect, exceptions, a chosen effectful destructor at every type, and `move`. The paper's summary is direct: “We now introduce a resource CBPV: an ordered variant of CBPV with an allocation effect new, exceptions, a chosen effectful destructor drop at all types, and a move operation that implements a side-effecting exchange rule.” (Section 4, p. 16)

A positive type `A` is interpreted as a value `A+` paired with a destructor `dropA`; a negative type is interpreted through the error/exception computation. The calculus has `new`, `dropA`, `move(x) in t`, `raise`, and `try x ⇐ t in u unless e ⇒ u'` (Section 4.1, p. 17). Exceptions are constrained to a purely positive, resource-free type `E`, so unwinding itself cannot exchange resources.

When to use it

Use this construction when failures must run cleanup code and when moving ownership changes the observable order of cleanup. It is useful for modelling RAII-like behavior, but assumes destructors themselves do not fail and that exception payloads are resource-free.

How to apply it

1. Give each positive type a destructor. For products, the paper defines a destructor that drops the second component and then the first; for sums it dispatches to the branch destructor (Section 4.3, p. 18).
2. Define `drop_ctxΓ` to drop variables from right to left, `unwindΓ(e)` to clean a context and return the exception, and `raiseΓA(e)` to inhabit a target type after unwinding (Section 4.3, pp. 18–19).
3. Translate values and expressions mutually by induction on typing derivations. The translation of `new` catches allocation failure and returns `Alloc_failure`; translation of `try` translates both success and handler branches (Section 4.3, p. 19).
4. Translate `move` by using the target exchange operation. The paper states that “the translation defined above is well-defined: it preserves typing, and it uses the exchange rule in the target only in the translation of move” (Proposition 11, p. 20).
5. Apply the target calculus's resource theorem. The resulting Theorem 12 says final resources are a permutation of the initial list, and are exactly equal when the source has no `move` (p. 20).

Verus form (inference)

Inference: encode `drop` as an executable consuming method whose contract records that the object is no longer usable and that its owned resource IDs are marked consumed. Encode `try` with a `Result<T,E>` and prove both `Ok` and `Err` branches call cleanup for the same ownership context. Encode `move` as transferring ownership of a tracked token; any change in drop order belongs in the postcondition or ghost event log. Use a `decreases` clause if unwinding traverses a finite context. Verus cannot make Rust's automatic `Drop` execution itself a proof rule without modelling that behavior, so the cleanup calls should be explicit in the verified core. Inference: if external code can panic or drop values implicitly, that boundary remains trusted unless its contracts are connected to the model.

Evidence

The formal evidence consists of Proposition 11 (typing preservation of translation) and Theorem 12 (resource safety after translation). The paper's concrete three-allocation example shows why `move` is effectful: two programs both free `t`, `s`, and `r` in reverse order, but if allocation of `t` fails their final free-lists are `[r0, r1]` and `[r1, r0]` respectively (Section 4.2, p. 18). The denominator is two programs under the stated evaluation context, not a statistical experiment.

Failure modes and assumptions

`move` cannot be treated as a pure contextual isomorphism because its order is observable; the paper says: “For this reason, move cannot give rise to a contextual isomorphism [32] between A ⊗ B and B ⊗ A for arbitrary A and B.” (Section 4.2, p. 18) The model has no borrowing, copyable-resource interaction, or general use operations between allocation and deallocation. The conclusion lists borrowing and copyable types as open problems (Section 6.3, p. 25). Inference: a Verus integration must separately specify aliasing and borrowed views; this paper's ownership token alone does not prove Rust lifetime correctness.

## what is proved, measured, and trusted

Proved: determinism, substitution, subject reduction, progress, ordered resource-list preservation, permutation preservation with exchange, typing preservation of the CBPV translation, and the corresponding resource-safety theorem. The proofs are syntactic and categorical; no code artifact, runtime benchmark, or measured success rate appears, so there is no empirical denominator to report. The presheaf model in Section 5 is a semantic model of the ordered calculus, not an implementation evaluation.

Trusted or outside scope: the paper assumes its typing rules, reduction semantics, categorical constructions, and metatheory. It does not prove the correctness of a Rust compiler, Verus, Z3, an allocator, hardware, foreign functions, or a user's specification. Inference: the direct product threat to VeruLaw is moderate. The paper supplies a rigorous vocabulary for cleanup contracts and exception unwinding, but adopting it would require modelling Rust's borrowing, standard-library behavior, and unsafe boundaries; it does not make agent-written verified Rust automatically safe.

## relationship to existing VL work

The paper explicitly cites Creusot and Aeneas as Rust verification approaches and says those works “do not model exceptions with destructor calls, and they do not develop a specific understanding of destructors in relationship with linearity.” (Section 6.2, p. 24) Inference: VL should not redo a generic statement that ownership matters; a useful extension would instead test explicit destructor contracts and failure-path proofs against real Rust APIs. The paper's exact-order versus permutation distinction is a concrete gap to check in current VL specifications.

## techniques for the catalog

- ordered resource-list invariant — track a list of live resources in typing contexts and prove every reduction preserves it, yielding exact cleanup order
- permutation resource safety — permit exchange and prove final resources equal the initial inventory modulo a permutation
- destructor-equipped exception translation — translate exception paths through type-indexed destructors and context unwinding, then inherit target resource theorems
- effectful move semantics — model ownership moves as observable exchanges whose cleanup order can differ under failure

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
