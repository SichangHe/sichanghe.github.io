# Ownership, borrows and interior mutability in proofs
(authored by agents unless marked 🧑)

## short version

- Rust's borrow checker does the aliasing work for ordinary safe code, and Verus leans on it
  - Verus does not model a heap for `Box`, `&` and `&mut` in safe code
- everything the borrow checker cannot see, you write by hand
  - raw memory, shared mutable cells, atomics, locks, custom containers
  - you write permission tokens, invariants and view functions
- the other papers add machinery Verus does not have
  - prophecies, fractional permissions, capability annotations
  - for Verus users these are patterns to copy, not features to switch on
- no study measures an LLM agent doing ownership proofs in Verus
  - the Verus steps below are mostly my inference from other tools; I say where they are not

## the problem

A proof about a program with references has to say who may read or write each cell.
If the proof does not, it must rule out aliasing in every verification condition.
That is slow to write and slow to solve.

Rust already forbids most aliasing.
A verifier can use that, or it can ignore it and redo the reasoning.
The studies cover both choices.

Four things make this hard.

- `&mut` changes a value now, and the caller sees the result later
  - the specification must name the value at the end of the borrow
- shared access has to be read-only, and splitting it must not make exclusive access out of nothing
- interior mutability (`Cell`, `RefCell`, `Arc`, atomics, locks) mutates through a shared reference
  - the type system says "read-only" and is wrong
- unsafe code and ghost code break the usual rules
  - the verifier needs its own account of who owns what

Related notes, not repeated here:
[Verus overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md),
[unsafe Rust foundations](../topic_studies/formal_verification_rust/rust_verifiers/unsafe_rust_foundations.md),
[Gillian-Rust](../topic_studies/formal_verification_rust/rust_verifiers/gillian_rust.md),
[Flux](../topic_studies/formal_verification_rust/rust_verifiers/flux.md),
[loop invariant synthesis](loop_invariant_synthesis.md),
[proof decomposition](proof_decomposition.md).

## what Verus does for you, and what you do by hand

I take this from the Verus studies.
Where a line is mine, I say so.

### Verus does

It trusts rustc's borrow checker.
The Verus paper study quotes the paper:
"Verus trusts the results of Rust’s borrow checker, and does not attempt to recheck these results in the SMT solver".
The study draws the consequence that owned boxes and immutable references can be treated as values.
No heap and no aliasing formulas go to Z3.
([study](../paper_takeaways/rustv.md))

It reports aliasing errors before it calls Z3.
In the paper's funds-transfer example, passing `&mut acct1` twice gives Rust error E0499.
The study quotes: "Verus would not attempt to invoke Z3 to verify the invalid program".
After you fix that, a separate logical failure shows up: `old(orig).balance >= amount`.
So an aliasing error and a missing precondition are different failures with different repairs.
([study](../paper_takeaways/rustv.md))

It checks ghost permissions for linearity.
The study quotes the paper:
"Proof variables sit midway between exec variables and spec variables: like spec variables, they are ghost and are not compiled to machine code,
but like exec variables, they are checked for linearity."
So you cannot copy a permission token in proof code.
Specifications may copy descriptions freely.
([study](../paper_takeaways/rustv.md))

It lets `ensures` talk about the old value of a `&mut` parameter with `old(x)`.
This is the Kani study's statement about Verus, marked there as an inference.
([study](../paper_takeaways/rustv.md))

It gives you proof types whose meaning is machine-checked.
VerusBelt proves the semantic soundness of `PPtr`, `PCell`, `PointsTo`, `LocalInvariant` and `AtomicInvariant` in Iris/Rocq.
It does not verify Verus itself.
The paper expects you to build on these types and never touch Iris.
([study](../paper_takeaways/rustv.md))

It generates token APIs from a state machine.
You write the transitions and prove the invariant.
The tool produces types for the shards and operations that create, consume and update them.
The study says a transition needs ownership only of the shards it touches (the study's words).
([study](../paper_takeaways/rustv.md))

### You do by hand

You write the view function that relates a concrete structure to an abstract value.
You write the invariant that ties ghost tokens to physical memory.
The XOR linked list combines a pointer structure, a sequence view and node permissions.
([study](../paper_takeaways/rustv.md))

You track the permission through allocation, initialization, use and free.
`PermData<T>` holds `Some(v)` when memory stores `v` and `None` when it is uninitialized.
The study recommends tracking these states one by one, not as one "valid pointer" flag (the study's recommendation).
([study](../paper_takeaways/rustv.md))

You separate a shared handle from exclusive authority.
A `PCell` handle alone cannot mutate.
The permission token can.
`InvCell` adds a predicate on what the cell may hold.
In the memoization example the cell holds either nothing or the correct result.
([study](../paper_takeaways/rustv.md))

You prove the invariant is restored before you close it.
Opening an invariant gives temporary exclusive ownership, and a mask stops you opening the same one twice.
([study](../paper_takeaways/rustv.md))

You write the transition system, and the implementation must follow it.
The study says checking the abstract protocol is only part of the proof.
([study](../paper_takeaways/rustv.md))

You stay inside what Verus supports.
`verus_practical` says Verus "rejects usage of features outside that subset" of supported unsafe features.
For their case studies, the authors extended raw pointer support.
([study](../paper_takeaways/rustv.md))

### Verus does not do (per the studies)

Fractional permissions as a built-in.
The Corten study says, as inference: "Verus lifetime syntax alone does not provide Corten's generic fractional separation algebra."
Shared fractional permissions are ghost-level encodings with explicit invariants.
([study](../paper_takeaways/rustv.md))

Prophecy variables for `&mut` as a user-facing feature.
The borrowable-fractional study says Verus does not expose that paper's type syntax.
VerusBelt discusses a `PCell::borrow_mut` primitive but calls it a proposed primitive, "not evidence that the paper-time tool already supports it" (the study's words).
([study](../paper_takeaways/rustv.md),
[study](../paper_takeaways/rustv.md))

Capability annotations that derive framing and non-aliasing for you.
The interior mutability study says: "Mendel’s ability to add annotations without changing signatures is not automatic in Verus."
That sentence is the study's inference.
([study](../paper_takeaways/rustv.md))

Mutable references in return values, at the time of the Verus paper.
The study says only argument-position `&mut` borrows were supported then.
I have not checked whether that has changed.
([study](../paper_takeaways/rustv.md))

## how to do it in Verus

No study runs an agent on these steps in Verus.
Steps marked (study) come from a Verus paper study.
Steps marked (inference) are mine, carried over from another tool.

1. Let rustc reject aliasing first. (study)
   - run the Rust check, then Verus
   - fix E0499-style errors by changing code, not by adding specifications
2. For plain `&mut` arguments, state the result with `old(x)` and the final `x`. (study, via Kani)
   - the final value of a mutable reference needs no prophecy variable here
   - I think this is what RustHorn's `^x` buys you in Creusot; the hybrid study describes `^` in Pearlite
3. Pick the weakest tool that works.
   - safe code and owned data: no ghost state, only a view function and `requires`/`ensures`
   - raw pointers: `PPtr` with `PermData` (study)
   - shared mutation: `PCell` plus `InvCell`-style predicate, or `LocalInvariant` / `AtomicInvariant` (study)
   - several threads: a state machine with generated tokens (study)
4. Write the view function, then the invariant tying tokens to memory. (study)
5. Make each permission change a lemma over linear ghost values. (inference)
   - split, merge, borrow and return are lemmas with `requires` and `ensures` on tokens
   - full permission to write, any positive share to read
   - borrowable-fractional study: "only a reference with full ownership is updated." (its Sec. 3.2)
6. For a returned or stored `&mut`, carry the current and final value together. (inference)
   - a ghost pair `{ current, prophecy }`; the borrow-return lemma equates them
   - the borrowable-fractional study suggests this and says it is unnecessary for ordinary lexical borrows
7. For interior mutability, give each unstable location an identity and a token. (inference)
   - write implication lemmas (`writeRef` implies `readRef`, and so on)
   - write disjointness lemmas for non-aliasing
   - guard conditional facts, like `Arc::strong_count(self) == 1`, behind an invariant
   - the Mendel study says this needs "explicit predicates and proof lemmas" (study wording, not the paper's)
8. Record every trusted fact: the library annotation, the `external_body` function, the unsafe contract.

### Verus papers

[Verus linear ghost types](../paper_takeaways/rustv.md).
Modes, linear ghost permissions, `PPtr`, `PCell`, invariants, state-machine tokens.
12 examples in Table 1.
The calculus omits mutable borrowing, concurrency and verification-condition generation.

[Verus for systems](../paper_takeaways/rustv.md).
Ownership replaces repeated non-aliasing proofs.
Concurrency uses generated shard tokens.
The allocator proves non-aliased allocation and uses a trusted `mmap` contract to introduce ownership.

[VerusBelt](../paper_takeaways/rustv.md).
Gives the proof types a semantic foundation.
Models mutable references with a current value and a future value.
Rejects a ghost value built from `future(mut_ref) + 1`, which produces a contradiction.
It also finds that Verus's invariant-lifetime check was wrong "for several years".

### Prophecy: the final value of a `&mut`

[Hybrid Rust verification](../paper_takeaways/rustv.md).
In Pearlite, `*self` is the value at entry and `^self` the value when the borrow expires.
`push_front` is specified as `(^self)@ == (*self)@.prepend(e)`.
Gillian-Rust translates this to parametric prophecies.

[Borrowable fractional ownership types](../paper_takeaways/rustv.md).
Every reference becomes a pair `<current, prophecy>`.
Ending a lifetime inserts `assume(fst x = snd x)`.
The target is a heap-free functional program.
It converts all references to pairs, where RustHorn converts only mutably borrowing ones.

[Aeneas borrow checking](../paper_takeaways/rustv.md)
and its [long version](../paper_takeaways/rustv.md).
Prove that a symbolic borrow checker is sound against a heap-and-address semantics.
Not a Verus paper; the Verus mappings in both studies are inference.

### Fractional permissions and separation-logic predicates

[Corten](../paper_takeaways/rustv.md).
Values are recursive points-to facts with rational fractions.
Moves exchange initialized ownership for uninitialized ownership.
A reborrow returns an exclusive borrow through a separating implication.
It ignores the borrow checker's result in the proof rules.

[Verifying the Rust standard library](../paper_takeaways/rustv.md).
A VeriFast `LinkedList` proof with a recursive `Nodes` predicate and separating conjunction.
The study gives a Verus form as an inference.

[VeriFast specifications by LLMs](../paper_takeaways/spec.md).
Not Rust, but the only study that measures LLMs writing ownership specifications.
Points-to chunks, recursive predicates, explicit `open` and `close`.

[Hybrid](../paper_takeaways/rustv.md) also covers `Ownable` representation predicates for unsafe types.
Creusot proves safe code, Gillian-Rust proves unsafe code, and contracts are shared.

### Permission contracts

[ProofWright](../paper_takeaways/other.md).
CUDA kernels with VerCors.
Quantified and conditional permissions say which thread may touch which cell.
Success means no illegal access or race under the contract.

[The Secrets Must Not Flow](../paper_takeaways/other.md).
Go with Gobra.
I/O permissions work like heap permissions: an operation needs the permission to run.
The study also lists ghost permission instrumentation across local, invariant and shared heaps.

[Resource specifications](../paper_takeaways/rustv.md).
Prusti with first-class resources: `produce!`, `consume!`, coupling invariants.
Conservation is a default obligation.

### Interior mutability

[Mendel](../paper_takeaways/rustv.md).
Library authors annotate `Cell`, `RefCell`, `Arc`, locks with capabilities such as `local`, `immutable`, `unique`.
The tool derives framing and non-aliasing in clients.
Annotations are trusted.

### Formal model of the borrow checker

[Oxide](../paper_takeaways/rustv.md).
A source-level calculus of safe Rust, not a Verus workflow; the Verus forms in the study are inference.
Moves are use-once: a moved place is marked dead and any later use is rejected.
A borrow is `shrd` or `uniq`; a `uniq` use conflicts with any overlapping loan, a `shrd` use only with overlapping `uniq` loans.
A region is a set of loans, not an allocation region; a reborrow records a chain such as `'z -> { uniq x, uniq *y }`.
Region rewriting unions loan sets, so a ghost region set would grow, not shrink.
The study's Verus suggestion: tracked tokens for `shrd` and `uniq` on raw pointers, and path-and-prefix lemmas for overlap.
Both are the study's inference, for unsafe code the compiler no longer checks.

### Using the compiler's ownership facts

[Place capability graphs](../paper_takeaways/rustv.md).
A graph per MIR program point with a capability on each place (`E`, `R`, `W`, none).
Pack, unpack and abstraction edges become Prusti-style proof obligations.
The study calls it an inference that Verus could consume this.

[Flux](../paper_takeaways/rustv.md).
`&mut` keeps an index; `&strg` records a strong update.
`push` goes from `RVec<T>[n]` to `RVec<T>[n+1]`.
Soundness assumes Rust's borrow guarantees under Stacked Borrows.

[Towards verifying unsafe Rust](../paper_takeaways/rustv.md).
Work in progress: a separation logic for pointer-aliasing rules, over a toy language.
Pointers carry a provenance: owning, mutable reference, shared reference.
A `&mut` consumes the lender's full points-to and returns a borrower's full points-to plus a reference-ending resource.
A `&T` splits the permission into read-only fractions, so no alias can write while it lives.
Verus form is the study's inference: ghost tokens for owner, borrower and end.

[Kani](../paper_takeaways/rustv.md) infers writes through `&mut`.
Raw pointers need an explicit `modifies`.
Its frame rule assumes no aliasing, which the borrow checker supplies for safe code.

### Resource accounting for relaxed atomics

[Modular verification of Core ARC under C20 and YC20](../paper_takeaways/rustv.md).
Ownership of an `Arc` count and payload, but with relaxed atomics instead of sequential consistency.
Each atomic location gets a specification of tied resources.
A relaxed increment consumes one global unit and produces two; a release decrement consumes one.
A decrement that reads one leaves no local resource, so the payload can be freed.
An acquire fence implies the global resource is zero.
The Iris invariant gives each `arc` permission a fraction of the payload and of a cancellation token.
The Verus form (ghost counter, token records, fractional permissions) is the study's inference.
It is a paper proof of Core ARC only; full ARC is left as a next step.

## evidence, with denominators

All numbers are the papers' own, as reported in the studies.
None is a Verus ownership benchmark.

Verus linear ghost types, Table 1 (spec/proof/exec lines, then seconds):
- PCell: 0/6/12, 2.21 s
- InvCell: 21/9/42, 2.24 s
- XOR linked list: 116/118/151, 5.03 s
- FIFO queue: 220/119/138, 4.58 s
- 12 examples; the study says they give no denominator for arbitrary programs
([study](../paper_takeaways/rustv.md))

Verus allocator: 3,178 executable lines and 13,703 proof lines.
"It can complete 8 out of 19 benchmarks", and performance parity is not reached.
([study](../paper_takeaways/rustv.md))

Mendel: 12 client files, each timed over 10 runs, 4.8 to 34.6 s.
`Arc` model assumes weak count zero.
`Arc<RwLock<Vec<i32>>>` has 29 expected and 2 incomplete assertions.
`AtomicI32` has 9 expected and 2 incomplete.
([study](../paper_takeaways/rustv.md))

Hybrid, with time per row:
- LinkedList type safety: 130 executable and 176 annotation lines, 0.24 s
- LinkedList functional correctness: 130 and 227 lines, 0.45 s
- Vec functional correctness: 294 and 107 lines, 2.57 s
- the paper compares RefinedRust at 30m40s for MiniVec against 1.35 s here; scopes and styles differ
([study](../paper_takeaways/rustv.md))

Borrowable fractional types: 11 hand-translated programs run in MoCHi.
Translated programs are 1.79 to 4.06 times larger.
Times are under 0.1 s to 2.7 s.
The study calls these small demonstrations, and the translation was done by hand.
([study](../paper_takeaways/rustv.md))

Corten: the allocator is about 300 lines of Rust and about 2,800 lines of Rocq.
Of those, about 1,400 are domain invariant lemmas and about 800 are generic Rust reasoning.
The study draws this lesson: most of the work is domain invariant design.
It also notes the `ifs` collection, where automated proofs were longer than raw ones (140 against 112 lines).
([study](../paper_takeaways/rustv.md))

Flux against Prusti on 8 benchmarks:
- 145 specification lines for 944 Rust lines, against 315 for 921
- 0 loop annotation lines, against 88
- 7.13 s against 246.65 s total
- the authors attribute part of the gap to quantified SMT conditions
([study](../paper_takeaways/rustv.md))

Oxide, tested against rustc's borrowck and NLL tests:
- 615 tests considered, 208 in scope (89 + 119), 407 excluded
- all 208 either typecheck when rustc does or give a corresponding error
- the authors translated methods into functions, added temporaries by hand, and split multi-error files
- type safety is a pen-and-paper proof for Oxide, not for rustc
([study](../paper_takeaways/rustv.md))

Place capability graphs:
- 118,483 of 121,271 functions in the top 500 crates produced graphs (97.7%)
- 7,727,906 of 7,728,767 illegal MIR mutants were killed by borrow checking
- in the Prusti prototype, 155 of 195 run tests passed (79.5%); 155 of 262 counting ignored ones (59.2%)
([study](../paper_takeaways/rustv.md))

Resource specifications: 31 functions in 4 applications.
Specifications are 48% shorter on average, and verification is 35% slower.
The paper tests no claim that they are easier to read.
([study](../paper_takeaways/rustv.md))

Rust standard library campaign: 11,970 of 16,748 generated harnesses passed Kani's checked classes (71.5%).
The study says this does not cover Rust aliasing (Stacked or Tree Borrows) or data races.
([study](../paper_takeaways/rustv.md))

The only LLM number about ownership: VeriFast, 1,652 diagnosed failures.
858 of them (51.9%) fail to expose, close, or preserve the ownership facts the verifier needs.
Of 2,727 outputs, 855 verified (31.4%).
Recursive predicates verified 30.9%, loops 11.4%.
This is C with VeriFast, three models.
([study](../paper_takeaways/spec.md))

## where it fails

Wrong trusted annotations make the proof meaningless.
Mendel's library annotations are "trusted and provided by the tool developers", and it has no completed soundness proof.
Hybrid trusts that Creusot and Gillian-Rust agree on contracts.
([study](../paper_takeaways/rustv.md),
[study](../paper_takeaways/rustv.md))

Ghost code can build its own future.
VerusBelt's paradox: a ghost value computed from a prophecy of itself.
The fix is that the input to ghost construction cannot depend on prophesied values.
([study](../paper_takeaways/rustv.md))

A lifetime check that only runs at cleanup is not a check.
VerusBelt found that Verus checked invariant lifetimes at invariant close, and non-terminating code might never close it.
Ask whether a contract depends on an event the execution need not reach.
([study](../paper_takeaways/rustv.md))

Proof erasure is separate from proof soundness.
VerusBelt says erasure issues "are outside the scope of VerusBelt".
Ghost code must terminate and have no effects, and hidden cycles through mutable cells or recursive types can break that.
([study](../paper_takeaways/rustv.md),
[study](../paper_takeaways/rustv.md))

Coverage gaps in each tool:
- hybrid: closures, shared references, fractional permissions, at most one lifetime in specifications; the `get_index_mut` magic-wand proof is left unproven for Vec
- borrowable fractional: integer references only, no nested references, hand translation, one-way soundness (target safe implies source safe)
- Mendel: no closures, traits, loops, quantifiers or iterators; two incomplete Arc and Atomic cases
- PCG: 2.3% of functions fail, mostly unsafe pointers; unsafe-code semantics out of scope
- Corten: adequacy proved for literals, unary and binary operators, expression statements and let; borrow, tuple, if, match, loop and call are pending
- resource specs: functions that reborrow and return a live mutable reference are unsupported

Oxide's model leaves out unsafe code, two-phase borrows, concurrency, traits and most libraries.
Its annotation burden is explicit regions; the implementation generates a fresh local region for unannotated borrows.
So its 208/208 says nothing about raw-pointer provenance, which is where Verus users need ownership proofs.
([study](../paper_takeaways/rustv.md))

The borrow checker is trusted by Verus, Flux, Crux and Kani, not by Corten.
So a bug in rustc's borrow checking is a hole in the first four.
([study](../paper_takeaways/rustv.md))

Aliasing rules for raw pointers are not checked by the type system.
The unsafe-Rust study says a functional Verus proof can still hide aliasing UB in an unsafe block.
Its gaps: shared freezing is not recursive, so `&&mut T` can recover a mutable reference and write.
Interior mutability and function calls are only in prose, structs and recursive freezing are future work.
A fraction other than 1 in reference-end may conflict with the Rust Reference's `&mut` rule.
[study](../paper_takeaways/rustv.md)

Ownership errors look like proof errors to a model.
The VeriFast study found missing heap chunks the most common failure.
Whether the same holds for Verus tokens is not measured.

Relaxed memory is not covered by Verus's ownership tokens.
The Core ARC study proves safety of an interleaving semantics implies no undefined behavior under C20 (with assumptions) and YC20.
It reports no benchmark, mechanization or timing; the soundness proof is on paper and "a preliminary result".
Nothing there says Verus's atomic invariants already supply its final-decrement and acquire-fence lemmas (study's inference).
([study](../paper_takeaways/rustv.md))

## where the studies disagree

Should a proof use the borrow checker's result?
Verus and Flux assume it.
Corten does not: its proof rules ignore the checker, and fractional obligations are paid for even in safe code.
Corten's study says the checker is "only an oracle predicting that fractional obligations will be easy".
([study](../paper_takeaways/rustv.md))

Can Verus handle raw pointers?
The hybrid study says "Verus cannot verify traditional raw pointers".
The linear-types study says Verus "cannot reason about traditional Rust unsafe code" but encapsulates some uses.
The practical-systems study says the authors extended Verus's raw pointer support for their case studies.
These are different dates and different Verus versions, and I do not know which holds today.

Are prophecies the standard answer for `&mut`?
The VerusBelt study says combining RustHorn's encoding with automated proving "is not novel", because Creusot did it.
The hybrid and borrowable-fractional papers use it too.
Verus's own route for argument `&mut` is `old(x)` and the final `x`, and the studies do not compare the two.

Is Verus unsound for unsafe aliasing?
The unsafe-Rust paper says Verus, RefinedRust and Gillian-Rust "ignore these rules and are therefore unsound".
The study calls this a hedged claim by the authors, not checked there.
It does not say what VerusBelt's proof covers, and the studies do not compare them.
[study](../paper_takeaways/rustv.md)

Does ownership support make specifications shorter?
Flux against Prusti says yes for lightweight properties; the Flux paper itself says Prusti can prove deeper properties such as sortedness.
Resource specifications are shorter and verification is slower.
Corten's `ifs` collection has longer automated proofs.
So there is no one direction.

## open questions

Does a Verus agent need prophecy-style ghost pairs, or does `old(x)` cover what it meets?
No study tests this on agent-written Verus.

Which ownership failures do models make in Verus?
The only count is the VeriFast one: 858 of 1,652 errors.
A Verus count would show whether token handling is a worse problem than arithmetic or triggers.

Can place capability graphs seed Verus ghost permissions?
The PCG study names Verus as a possible consumer and gives no experiment.

Can a model write Mendel-style capability annotations for a custom `UnsafeCell` wrapper, and who checks them?
The paper trusts them, and a wrong one makes the proof meaningless.

How far has Verus moved since the 2023 paper on mutable references in return values?
The studies describe the paper-time tool.
