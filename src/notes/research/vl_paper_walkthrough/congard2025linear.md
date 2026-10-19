# Linear effects, exceptions, and resource safety: a Curry-Howard correspondence for destructors
(authored by agents unless marked 🧑)
Tag: `congard2026linear` , [paper](https://doi.org/10.48550/arXiv.2510.23517)

## scope and claims
The paper gives a formal account of combining linearity, effects, exceptions, and C++/Rust-style destructors. Its central construction interprets a resource type as a type equipped with a chosen destructor and studies two calculi: an ordered allocation calculus and a resource call-by-push-value (CBPV) calculus with exceptions, `drop`, and effectful `move`. The authors state: “We analyse the problem of combining linearity, effects, and exceptions, in abstract models of programming languages, as the issue of providing some kind of strength for a monad 𝑇 (− ⊕ 𝐸) in a linear setting.” (Abstract, p. 1)

The categorical construction equips a type `A` with an effectful erasure map `δ : A → T I`, an object of the slice category `C/(T I)`. The authors explain: “We call such an erasure map that performs an effect a destructor, by analogy with C++ destructors.” (Section 1.3, p. 4) With a distributive symmetric monoidal base category, finite products, and a strong monad `T`, Section 1.4 constructs the resource modality `D A = A & T I`. Theorem 1 supplies strength for the composite exception monad `T(− ⊕ E)` relative to the forgetful functor from destructor-equipped types. This supplies the context cleanup needed for exception propagation. The slice category is generally neither semi-cartesian nor symmetric; symmetry requires commutativity of `T` (pp. 5–6).

The formal results are safety theorems, not an implementation or a Rust benchmark. For closed programs returning a purely positive, resource-free value, the ordered fragment preserves the exact free-list, while the fragment with exchange preserves it up to permutation. The resource-CBPV translation transfers those properties and makes the no-`move` fragment exact. Inference: a Verus engineer can use the paper as a design pattern for explicit ownership cleanup and exception paths, but the paper does not prove a Verus encoding or any Rust program.

## technique 1: track resources with an ordered linear calculus

What it is

The first calculus, written `L` in the paper, has linear contexts and allocation effects `new` and `delete`. Linear typing constrains resource consumption; the resource invariants account for alternative branches and lazy pairs sharing a context. The ordered subcalculus `O` removes exchange, so variable order is part of the proof. The operational machine evaluates terms with a stack and a free-list. The paper explains: “We now define reduction rules: let bindings of negative expressions perform the substitution them immediately, following call-by-name reduction, while let bindings of positive expressions push their continuation on the stack to first reduce the expression to a value.” (Section 2.4, p. 11)

When to use it

Inference: use this method when each acquired resource must be released exactly once and cleanup order matters; use the ordered variant for LIFO cleanup. The preservation argument does not require a termination proof: the paper explicitly says that progress plus subject reduction establishes either indefinite reduction or a final command, and its resource theorem is conditional on reaching a final value.

How to apply it

1. Define purely positive, resource-free result types `W` from unit, tensor, and sum. The paper gives `W ::= 1 | W ⊗ W' | W ⊕ W'` (Section 2.3, p. 10).
2. Type `new` as an allocation operation and `delete` as consuming a resource. In the example, two resources are allocated and the failure branch deletes the first resource before returning (Section 2.2, p. 10).
3. Run the abstract machine whose command is an expression, stack, free-list, and polarity. Only `new` and `delete` mutate the free-list (Section 2.4, p. 11).
4. Extend typing with a resource list in the context, written `Γ; L; Δ`. Define `LR(t)` as the list `L` attached to the derivation (Section 3.1, pp. 13–14).
5. Prove left and right substitution lemmas. The left lemma concatenates the substituted term’s resource list before the body’s list; the right lemma concatenates them in the opposite order (Lemma 8, p. 14).
6. Extend the resource judgment to stacks and commands, placing stack resources before expression resources. Show one reduction preserves the entire resource list (Theorem 9, p. 14).
7. Conclude that if the closed expression `t : W` reaches a final value from free-list `l`, the final free-list `l′` equals `l` (Proposition 6, p. 13).

Verus form (inference)

Inference: represent each live resource with a Rust value whose ownership prevents duplication, and expose a ghost sequence of resource identifiers in a `tracked` or specification state. A function that allocates can return an owned resource plus a proof that the ghost sequence grew; a destructor-like function consumes the owner and proves the sequence shrank. Use `requires` and `ensures` on executable functions, and a loop `invariant` for a cleanup loop. State the sequence and its permutation/equality relation explicitly in this proposed encoding. Do not model a proof function as runtime code; keep mathematical bookkeeping in `spec fn` or proof code. Inference: the exact theorem is easiest for a stack-shaped cleanup routine, where the invariant says the remaining owners form a prefix of the acquisition sequence as cleanup removes its last element.

Evidence

The authors prove determinism (Proposition 2), substitution (Lemma 3), subject reduction (Theorem 4), and progress (Theorem 5) before proving resource safety. Their ordered proof tracks `LR(t)` and establishes that reduction preserves it (Theorem 9), then derives Proposition 6 using that invariant and the absence of resources from the initial term and final value. There are no experimental denominators or performance measurements; the evidence is the stated metatheory and derivations. The theorem applies to a closed typed expression of purely positive resource-free type that reaches a value.

Failure modes and assumptions

The ordered language forbids exchange and right functions. The paper gives a counterexample using a right function that changes two resources from `r0 :: r1 :: l` to `r1 :: r0 :: l`, contradicting LIFO (Section 3.2, p. 15). It also notes that the progress proof does not establish termination. Inference: a Verus proof that assumes a cleanup loop terminates needs a separate decreases argument or a bounded loop; this paper supplies no such argument.

## technique 2: weaken exact order to permutation safety

What it is

Adding exchange yields the unrestricted calculus `L`, where cleanup may reorder resources but cannot lose, duplicate, or release an unknown resource. For a closed expression `t : W` that terminates with final free-list `l′` from initial free-list `l`, Theorem 10 gives `l′ = σ(l)` for some permutation `σ` (Section 3.3, p. 15).

When to use it

Inference: use permutation safety when resources may be released in arbitrary order, as in a language with exchange or ownership moves. The guarantee preserves the multiset of resources, including multiplicity. It still covers allocation failures because the earlier resource-safety discussion states that the desired properties remain true “in case of an error during the program execution, including an allocation error.” (Section 3, p. 13)

How to apply it

1. Keep the same machine and linear typing, but permit exchange in contexts.
2. Forget the order of both variables and resources. Appendix C.4 defines `M; Γ ⊢l t`, where `M` is a multiset of resources and `Γ` is a set of variables. Context concatenation is always defined, and Lemma 18 supplies one substitution lemma (Section 3.3, p. 16; Appendix C.4, pp. 37–38).
3. Prove reduction preserves the unordered resource inventory by the same subject-reduction and substitution pattern.
4. At a final command, including an error return, compare the initial and final free-lists modulo a permutation (Theorem 10).

Verus form (inference)

Inference: specify a finite map from resource IDs to ownership state, or a sequence together with a permutation predicate. A cleanup function can ensure that the multiset of consumed IDs equals the multiset of allocated IDs and that each ID is consumed at most once. For a vector of resources, use a loop invariant stating that the unprocessed suffix plus the consumed prefix is a permutation of the original vector. Verus's sequence and set specifications can express this, but the paper does not identify exact Verus library lemmas; those proof details must be supplied by the implementer.

Evidence and limits

The evidence is Theorem 10 and its proof sketch: “This simplifies context concatenation by removing preconditions and requires a single substitution lemma.” (Section 3.3, p. 16) No implementation measurements are reported. The theorem assumes well-typed closed expressions and a final value; it does not prove behavior of an actual Rust allocator or unsafe pointer operations.

## technique 3: model exceptions with destructors and effectful move

What it is

The resource CBPV calculus adds an allocation effect, exceptions, a chosen effectful destructor at every type, and `move`. The paper's summary is direct: “We now introduce a resource CBPV: an ordered variant of CBPV with an allocation effect 𝐧𝐞𝐰, exceptions, a chosen effectful destructor 𝐝𝐫𝐨𝐩 at all types, and a 𝐦𝐨𝐯𝐞 operation that implements a side-effecting exchange rule.” (Section 4, p. 16)

Each type `A` has a positive interpretation `A+` equipped with a destructor `dropA` and a negative interpretation `A−`. For a negative source type `N`, `N+ = N− & 1` stores the computation and its destructor as a lazy pair. For a positive source type `P`, `P− = P+ ⊕ E` represents a result or exception (Section 4.3, p. 19). The calculus has `new`, `dropA`, `move(x) in t`, `raise`, and `try x ⇐ t in u unless e ⇒ u'` (Section 4.1, pp. 17–18). Exceptions are constrained to a purely positive, resource-free type `E`, so unwinding itself cannot exchange resources.

When to use it

Inference: use this construction when failures must run cleanup code and ownership moves affect its observable order. The model requires non-failing destructors and purely positive, resource-free exception payloads (Sections 4.1 and 6.2).

How to apply it

1. Give each positive type a destructor. For products, the paper defines a destructor that drops the second component and then the first; for sums it dispatches to the branch destructor (Section 4.3, p. 19).
2. Define `drop_ctxΓ` to drop variables from right to left, `unwindΓ(e)` to clean a context and return the exception, and `raiseΓA(e)` to inhabit a target type after unwinding (Section 4.3, p. 19).
3. Translate values and expressions mutually by induction on typing derivations. The translation of `new` maps the target allocator’s explicit failure result to the exception `Alloc_failure`. A translated `let` unwinds the continuation’s context on error; a translated `try` selects its success or handler branch (Section 4.3, pp. 19–20).
4. Translate `move` by using the target exchange operation. The paper states that “The translation defined above is well-defined: it preserves typing, and it uses the exchange rule in the target only in the translation of 𝐦𝐨𝐯𝐞, so the translation of the   fragment indeed falls into .” (Proposition 11, p. 20).
5. Apply the target calculus's resource theorem. The resulting Theorem 12 says final resources are a permutation of the initial list, and are exactly equal when the source has no `move` (p. 20).

Verus form (inference)

Inference: encode `drop` as an executable consuming method whose contract records that the object is no longer usable and that its owned resource IDs are marked consumed. Encode `try` with a `Result<T,E>` and prove both `Ok` and `Err` branches call cleanup for the same ownership context. Encode `move` as transferring ownership of a tracked token; any change in drop order belongs in the postcondition or ghost event log. Use a `decreases` clause if unwinding traverses a finite context. Use explicit cleanup calls in the proposed verified core; any reliance on Rust’s automatic `Drop` execution needs a model connecting it to the contracts. Inference: if external code can panic or drop values implicitly, that boundary remains trusted unless its contracts are connected to the model.

Evidence

The formal evidence consists of Proposition 11 (typing preservation of translation) and Theorem 12 (resource safety after translation). The paper's concrete three-allocation example shows why `move` is effectful: two programs both free `t`, `s`, and `r` in reverse order, but if allocation of `t` fails their final free-lists are `[r0, r1]` and `[r1, r0]` respectively (Section 4.2, p. 18). This is a worked operational example.

Failure modes and assumptions

`move` cannot be treated as a pure contextual isomorphism because its order is observable; the paper says: “Since a contextual isomorphism just requires inverses and purity (thunkability) [32], 𝐦𝐨𝐯𝐞 must be effectful in any reasonable interpretation.” (Section 4.2, p. 18) The model has no borrowing, copyable-resource interaction, or general use operations between allocation and deallocation. The conclusion lists borrowing and copyable types as open problems (Section 6.3, p. 26). Inference: a Verus integration must separately specify aliasing and borrowed views; this paper's ownership token alone does not prove Rust lifetime correctness.

## what is proved, measured, and trusted

Proved: determinism, substitution, subject reduction, progress, ordered resource-list preservation, permutation preservation with exchange, typing preservation of the CBPV translation, and the corresponding resource-safety theorem. The proofs are syntactic and categorical; no code artifact, runtime benchmark, or measured success rate appears, so there is no empirical denominator to report. The presheaf model in Section 5 is a semantic model of the ordered calculus, not an implementation evaluation.

Scope: the guarantees concern the paper’s formal typing rules and reduction semantics, whose properties it proves. It does not prove the correctness of a Rust compiler, Verus, Z3, an allocator, hardware, foreign functions, or a user's specification.

## techniques for the catalog

- ordered resource-list invariant — track a list of live resources in typing contexts and prove every reduction preserves it, yielding exact cleanup order
- permutation resource safety — permit exchange and prove final resources equal the initial inventory modulo a permutation
- destructor-equipped exception translation — translate exception paths through type-indexed destructors and context unwinding, then inherit target resource theorems
- effectful move semantics — model ownership moves as observable exchanges whose cleanup order can differ under failure
