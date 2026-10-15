# Pure Borrow: Linear Haskell Meets Rust-Style Borrowing
(authored by agents unless marked 🧑)
Tag: `matsushita2026pureborrow`, [paper](http://arxiv.org/abs/2604.15290v4)

## scope and claims

Matsushita and Ishii present Pure Borrow, a library and calculus that adds Rust-style non-local borrowing to Linear Haskell. The abstract claims: “We answer this question affirmatively with Pure Borrow, a novel framework that realizes Rust-style borrowing in Linear Haskell with purity.” (Abstract, p. 1). The design aims to combine affine mutable borrowers, pure results, lazy evaluation, first-class polymorphism, parallel mutation, and leak freedom. This is a programming-language design with a Haskell implementation, a parallel quicksort case study, and a formal metatheory. It is not a Verus study and the authors leave two central metatheory properties as conjectures.

Inference: for VL, the transferable idea is to make borrowing and lifetime transitions explicit in contracts and ghost state. The Haskell type syntax and runtime representation do not carry over directly to Verus.

## technique 1: separate a lender, borrower, and lifetime

what it is: borrowing an owner `T` produces a mutable borrower `Mutα T` and a lender `Lendα T` for a lifetime `α`. The borrower may be split or dropped; after the lifetime ends, the lender reclaims the owner. The paper states, “A mutable borrower can freely mutate the data during the lifetime α. Notably, borrowers are affine: they can be freely split ... and dropped at any time before the end of α.” (Section 3.1, p. 5).

when to use: use this when a computation needs temporary aliases to disjoint or shared parts of an owned object while preserving eventual reclamation. It is useful for parallel divide-and-conquer, where each worker receives a disjoint borrower.

how to do it:

1. allocate a linearly owned value, such as `vec ← newVector [0,1,2]` (Figure 4, p. 6)
2. enter a borrowing scope with `runBO`; call `borrow vec` to obtain `(mvec, lend)` (Figure 4, p. 6)
3. mutate through `mvec` using `modifyAt` or `updateAt`; share it with `share` only when read-only aliases are needed (Section 3.1, p. 6)
4. obtain a dead-lifetime token from `endLifetime` and call `reclaim lend end` to recover the owner (Figure 4, p. 6)
5. free or return the recovered value linearly

Verus form. Inference: represent the owner and borrower as distinct Rust values with ghost ownership tokens. A borrow operation can have `requires` ownership of `T` and `ensures` a borrower plus a lender token; each mutating method requires an active lifetime token and ensures the abstract state update. Reclamation requires a dead-lifetime predicate. Verus's ordinary Rust references and borrow checker may enforce lexical constraints, but non-local split/drop/reclaim behavior needs explicit ghost predicates and `proof fn` lemmas.

evidence and limits: the implementation uses newtype wrappers with the same runtime representation as the body (Section 3.2, p. 8) and compiles with GHC 9.10+ without compiler modification (Section 1, p. 2). The paper's formal safety argument is not a proof about GHC's implementation or arbitrary Haskell extensions.

## technique 2: lifetime tokens and the BO monad

what it is: model lifetime state with linear `Nowα` tokens and persistent `Endα` tokens, and run borrow computations in an indexed BO monad. The paper explains, “The former exclusively asserts that α is ongoing, and the latter persistently asserts that α has ended.” (Section 3.2, p. 8).

how to do it:

1. create a fresh lifetime with `newLifetime`, receiving `Nowα` (Figure 7, p. 8)
2. run `BOα` computations with `execBO`; use `parBO` for parallel composition (Figure 8, p. 8)
3. derive `runBO` by quantifying over `α`, executing with `Nowα`, then converting it to `Endα` using `endLifetime` (Figure 8, p. 8)
4. for a nested scope, use lifetime intersection `β ∧ α`, `sexecBO`, and `srunBO` (Sections 3.1–3.2, pp. 7–8)
5. permit reclamation only when an `Endα` token is available (Figure 9, p. 9)

Verus form. Inference: encode `Now` and `End` as ghost state predicates or token types; consume the active predicate when ending a scope and establish a persistent ended predicate. `requires` should distinguish active from ended states, and `ensures` should make the transition explicit. Use `spec fn` for lifetime ordering and intersection facts, and `proof fn` to derive nested-scope obligations. Inference: a Verus token model must account for Rust's lexical lifetime rules and cannot assume Haskell rank-2 polymorphism enforces the same scope by itself.

evidence and limits: BO is a thunk at runtime, like ST, while lifetime rank-2 polymorphism prevents an escaped borrower (Section 3.1, p. 6). The design supports first-class lenders, but automation is weaker than Rust's checker; the authors explicitly leave more automation for future work (Section 6, p. 19).

## technique 3: split and share borrowers for parallel mutation

what it is: split a borrower into disjoint sub-borrowers, then run independent BO computations in parallel. `splitAt` partitions a vector; `parBO` combines two computations. The authors state, “thanks to linearity, the ownership held by the two BO monads is mutually disjoint, which ensures that their mutations can safely be performed in parallel, while retaining purity.” (Section 3.1, p. 7).

how to do it:

1. call `splitAt 1 mvec` to obtain `mvec1` and `mvec2` (Figure 5, p. 7)
2. write one BO computation that mutates only `mvec1` and another that mutates only `mvec2`
3. combine them with `parBO`; consume or reassemble returned borrowers linearly (Figure 5, p. 7)
4. use `share` to create an unrestricted `Shareα` borrower for persistent reads, and `copyAt` only when the element is `Copyable` (Figures 4 and 11, pp. 6, 9)

Verus form. Inference: represent a split as a proof that two region predicates are disjoint. Require disjointness for each parallel function and ensure the combined postcondition is the union of the two updates. Verus concurrency proofs normally use state-machine or permission APIs; the Haskell `parBO` type alone is not a Verus construct.

evidence and limits: the case study demonstrates parallel mutation, but the work-stealing API uses unsafe concurrent queues internally and is presented as a proof of concept (Section 4.1, p. 13). The paper does not provide a formal proof of those queue implementations.

## technique 4: reborrow with lifetime intersection

what it is: create a shorter-lived borrower from an existing mutable borrower, then restore the original borrower. The primitive `joinMut` flattens `Mutβ (Mutα a)` to `Mutβ∧α a`; `reborrowing` wraps this in a scoped computation (Figure 14, p. 10).

how to do it:

1. call `reborrowing mvec` with a polymorphic callback over fresh `β` (Figure 6, p. 7)
2. inside the callback, receive `Mutβ∧α` and split it for parallel work
3. run the callback with `srunBO`, which delimits the sub-lifetime
4. return the callback result and the original `Mutα` after the sub-lifetime ends (Sections 3.1–3.2, pp. 7, 10)

Verus form. Inference: model reborrowing as a lemma that temporarily refines an owner predicate with a subregion and then restores it. Use a ghost region intersection or subset relation, and prove that no sub-borrower remains after the callback. Verus has no direct `joinMut` primitive; write a proof helper with explicit pre/postconditions.

evidence and limits: the paper derives `reborrow`, `reborrowing`, `sharing`, and `copyAtMut` from `joinMut` and scoped execution (Section 3.2, p. 10). It does not support every advanced Rust pattern: moving and borrowing different fields of one pattern match is listed as unsupported (Section 3.2, pp. 10–11).

## technique 5: history-based denotational semantics

what it is: define two operational semantics: a mutative model with global memory and a denotational model without global memory. The denotational model records updates in histories attached to lifetime tokens, then applies them when a lender reclaims ownership. The paper says, “To solve this, we propose a new approach: recording the history of updates on borrowed data.” (Section 5, p. 16).

how to do it:

1. give each borrow an identifier `δ` and each subcomponent a borrow path `p` such as `δ.i` (Section 5, p. 17)
2. record the latest update as a history item `p ← x`; histories ignore item order and keep at most one update per path (Section 5, p. 17)
3. thread histories through `Nowα` during `execBO`/`sexecBO`
4. transfer the history to `Endα` at `endLifetime`
5. when `reclaim` runs, restore the owner's content from the saved history (Section 5, p. 16)

Verus form. Inference: use a ghost map from region paths to abstract values, updated by verified mutation operations. The lender's reclaim proof reads the ghost map and establishes the final owner value. Keep the map ghost-only; executable Rust still needs a sound representation and synchronization. This is an inference because the paper's history semantics is not Verus code.

evidence: the formal calculus proves strong confluence of denotational semantics (Theorem 5.1, p. 18), well-typedness implies association between the two semantics (Theorem 5.2, p. 18), and safety implies an empty final memory (Theorem 5.3, p. 18). However, the paper explicitly labels progress and bisimulation as conjectures (Conjectures 5.4 and 5.5, p. 18), so the full soundness chain is incomplete.

## technique 6: parallel quicksort as an integration test

what it is: evaluate the library on naïve parallel quicksort and a work-stealing variant. The naïve implementation bounds the number of partitions with a budget and applies `parBO`; `divide` scans and swaps elements with `copyAtMut`, `swapAt`, and `splitAt` (Figures 15–16, pp. 12–13). The work-stealing version wraps divide-and-conquer steps in `DivideConquer` and uses per-worker deques (Figure 17, p. 13).

how to do it:

1. allocate a vector and borrow it
2. choose a pivot with `copyAtMut`
3. partition into low and high borrowers with `divide`
4. recursively sort in parallel while budget remains; otherwise run sequentially (Figure 15, p. 12)
5. for work stealing, return `Done` or `Continue [mlo; mhi]` to a scheduler and reclaim the owner after all work (Figure 17, p. 13)

Verus form. Inference: verify partition bounds, disjoint slice regions, and permutation of elements with `requires`/`ensures`; use a Verus state machine or trusted concurrency API for the scheduler. The Haskell `Copyable` and lifetime classes need explicit Rust/Verus representations.

evidence and denominators: benchmarks used randomly generated integer vectors of varying sizes, compared Introsort, sequential quicksort, Naïve budgets 4/16/32, and work-stealing with 4/8/10 workers. They ran on a 2024 MacBook Pro with Apple M3, 4 performance cores, 6 efficiency cores, 16 GB RAM, and `+RTS -N10` (Section 4.2, p. 14). Figure 18 reports wall-clock time and allocation; the PDF provides curves but no tabulated run count or numeric denominator. The authors state their parallel versions were faster than sequential quicksort and work stealing generally faster than naïve, but neither beat industrial introsort (Section 4.2, p. 14). These claims are therefore measurements for the stated machine and configurations, not universal speedups.

## what is proved, trusted, and relevant to VL

The formal results are strong confluence of the denotational semantics, well-typedness implying association, and safety implying leak freedom. Progress and bisimulation remain conjectures, and the implementation's unsafe concurrent queues remain trusted. The semantics abstracts GHC, runtime scheduling, and machine memory. The authors also note that `Mutα` is invariant in its body type because it is shared mutably between borrower and lender (Section 3.2, p. 10), a variance condition a Verus API must preserve.

Inference: the threat to a product of agent-written verified Rust is moderate. Explicit lifetime tokens, disjoint-region splitting, and reclaim contracts can reduce aliasing and cleanup mistakes, but they do not prove unsafe queue code, scheduler correctness, or adequacy of the specification. VL should not redo Pure Borrow's type design or quicksort benchmark. It could adapt the history idea to ghost region maps, then measure proof effort and bug detection for agent-generated borrow-heavy components against ordinary Verus references.

## techniques for the catalog

- lender-borrower lifetime split — return a borrower and lender, then reclaim only after a dead-lifetime token
- lifetime-token BO monad — index mutation by active and ended lifetime tokens
- affine split and parallel composition — split disjoint borrowers and run BO computations with `parBO`
- scoped reborrowing — derive shorter borrowers with lifetime intersection and restore the parent borrower
- history-based semantics — record path updates on lifetime tokens and replay them at reclamation
- borrow-aware integration benchmark — test safe parallel mutation with quicksort and work stealing

Checked 2026-10-15 against the paper by a Codex agent for pure_borrow_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
