# Modular Formal Verification of Rust Programs with Unsafe Blocks
(authored by agents unless marked 🧑)

Tag: `rahimiforoushaani2022modular`, [paper](http://arxiv.org/abs/2212.12976v1)

## scope and claim

This December 2022 progress report proposes verifying Rust unsafe blocks and safe abstractions with VeriFast's Modular Symbolic Execution (MSE), using RustBelt's semantic model for Rust types. The abstract states, “To address this problem we are trying to verify soundness of Rust unsafe code applying our Modular Symbolic Execution algorithm.” (Abstract, p. 1.) The target is memory safety and conformance of a safe abstraction to the guarantees in its Rust type, assuming the input has passed Rust's type and borrow checker.

The paper focuses initially on raw-pointer dereferences, not every unsafe superpower. Its claim is a plan plus a prototype, not a completed soundness theorem or a broad evaluation. The authors say, “The MIR extraction program and the VeriFast extension for supporting Rust are works in progress and currently support a very limited subset of Rust.” (Section 5.2, p. 16.)

## technique: contracts for unsafe functions

when to use

Use a contract when a raw-pointer function or safe wrapper must be checked once and then called without re-executing its body. The contract states a weakest precondition in `requires` and a strongest postcondition in `ensures`, including heap chunks, pointer validity, and returned ownership.

how the paper does it

1. Start with a Rust function and the memory facts that must hold before it runs. For `create_deque`, `requires true` means there is no caller-side heap prerequisite (Section 3.3, pp. 9–11).
2. Symbolically execute the body from the precondition. Allocation creates a symbolic pointer and branches on null versus non-null; writes consume and update heap chunks such as `Node_prev` and `Node_next` (Sections 3.1–3.3, pp. 6–10).
3. At each return, check every `ensures` fact. The example contract requires a non-null result, an allocated `Node`, and initialized `prev` and `next` chunks (Listing 5, p. 10).
4. Transfer the chunks named by `ensures` to the caller. The verifier removes them from the callee heap, preventing the same access rights from being transferred twice (Section 3.3, p. 11).
5. At a call site, use only the saved contract: add the postcondition chunks and path facts to the caller state, without executing the callee body again (Section 3.3, p. 11).

The paper describes this modularity directly: “If a human/verifier provides us with a function contract in a well-defined logic, we can check the contract’s propositions against the function body/implementation and if the body satisfies the contract, we can just reuse the contract every time we want to check a call.” (Section 3.3, p. 9.)

what transfers to Verus

Inference: write the same boundary as a Verus executable function with `requires` and `ensures`, using a predicate for allocated and initialized nodes. Use `old(...)` in `ensures` for values preserved from entry, and prove each raw-pointer operation through a verified wrapper or a modeled memory API. Verus's contracts are source-level specifications rather than VeriFast heap chunks, so the memory representation and unsafe boundary must be supplied explicitly. This is an inference.

evidence and limits

The only concrete contract example is `create_deque`; no number of verified functions or success fraction is reported. The paper's intended guarantee is conditional on successful MSE, prior Rust type/borrow checking, and sound RustBelt semantic encodings. It does not yet prove that its implementation is sound with respect to RustBelt.

## technique: symbolic execution of heap chunks

when to use

Use symbolic execution when concrete execution would branch over infinitely many addresses or values. Replace concrete values with symbols while retaining path conditions and heap predicates that describe allocated bytes and initialized fields.

how the paper does it

1. Represent machine state as a store plus a heap. The heap is a multiset of predicates such as `malloc_block_Node`, `Node_prev`, `Node_value`, and `Node_next` (Section 3.1, pp. 6–8).
2. Execute allocation symbolically. One branch records a null result; the successful branch introduces a symbolic address `b_l`, a non-null path fact, and chunks for the allocated node whose fields initially contain the special uninitialized value (Sections 3.1–3.2, pp. 7–9).
3. For a field write, require a matching heap chunk. A write to `prev` is safe only when `Node_prev(address, old)` is present; update it to `Node_prev(address, new)` (Section 3.1, p. 8).
4. Treat a read of an uninitialized value as failure to verify. This models Rust's invalid-value rule (Section 3.1, p. 7).
5. Carry path conditions through branches and report a stuck state when a required chunk or fact cannot be proved (Sections 3.1–3.2, pp. 8–9).

The paper says, “The execution using symbols and facts we know about them is called Symbolic Execution.” (Section 3.2, p. 9.)

what transfers to Verus

Inference: model the heap facts as a `spec fn` predicate over an abstract map from addresses to node records, and prove each branch's non-null and initialization facts with `assert`. For real raw pointers, use a Verus-supported pointer abstraction or isolate the operation behind a trusted specification whose implementation is separately checked; do not treat an arbitrary raw dereference as verified merely because an address is non-null. This is an inference.

evidence and limits

The `create_deque` tree demonstrates two classes of paths: one allocation-failure path and infinitely many successful-address paths represented by one symbolic branch. There is no benchmark denominator, solver-time number, or soundness theorem for the proposed symbolic interpreter. The abstract machine is a model; matching it to Rust's actual memory and provenance rules remains a proof obligation.

## technique: modular symbolic execution

when to use

Use MSE for callers, loops, and recursion so that each function is verified against a contract once. This prevents path explosion from repeatedly expanding callee bodies.

how the paper does it

1. Verify the callee body from its `requires` state and establish its `ensures` state on every normal return.
2. Save the resulting contract as the function's weakest precondition and strongest postcondition.
3. At each call, check the caller state against the precondition, then add the postcondition, without inspecting the callee internals.
4. Use the same saved contract for recursive calls; the paper notes that direct symbolic execution may not terminate for loops and recursive functions (Section 3.3, p. 9).
5. Preserve ownership by consuming heap chunks in the contract and returning them exactly once.

The authors define the goal as follows: “We also want the contract to tell us as much as possible about the effects that calling the function has on the execution state.” (Section 3.3, p. 9.)

what transfers to Verus

Inference: use a Verus `ensures` clause as the reusable postcondition and a `decreases` clause for recursive termination. Loop invariants must be written explicitly with `invariant` clauses; a function contract alone does not automatically become a loop invariant. This is an inference.

evidence and limits

MSE is described algorithmically and illustrated with one allocator/deque example. The paper reports no corpus size or comparison against a baseline verifier. It also identifies higher-order functions, traits, and panics as difficult behaviors (Section 2.2, p. 5), so modular contracts may need additional modeling for those features.

## technique: RustBelt semantic interpretation of safe abstractions

when to use

Use RustBelt's semantic interpretation when the function's Rust type carries ownership, borrowing, lifetimes, `Send`/`Sync`, or thread-local sharing facts that raw-pointer contracts do not express. A safe abstraction must implement the semantic predicate associated with its public type.

how the paper does it

1. Interpret each Rust type as a tuple containing size, ownership, and shared-reference predicates. RustBelt writes this as `JτK = (size, own, shr)` (Section 4.1, p. 13).
2. For a shared `Cell` reference, open the `own` predicate to obtain the `shr` predicate for `Cell`, then open that predicate to expose the borrowed content (Table 1, rows 1–3, p. 15).
3. Use the lifetime logic access rule `LftL-na-acc`, supplying a fraction of the lifetime token and the current thread's non-atomic token. This temporarily yields full access to the content (Section 4.1, pp. 14–15).
4. Perform the unsafe write through the obtained heap chunk, updating the stored integer (Table 1, rows 4–5, p. 15).
5. Close the borrow and return the lifetime and thread tokens at function exit. Returning the tokens checks that every resource granted through the borrow was given back (Section 4.1, p. 15).
6. Check the `Cell` invariant that `Cell` is not `Sync`; aliases remain in one thread because the type cannot be sent to another thread and no public method leaks a deep reference (Section 4.1, pp. 13–15).

The semantic foundation is intentionally indirect. The paper quotes RustBelt's three proof steps: “Verify that the typing rules of λRust are sound when interpreted semantically” (Section 4, p. 12), “Verify that, if a closed program is semantically well-typed according to the model, its execution will not exhibit any unsafe/undefined behaviours” (Section 4, p. 12), and “For any library that employs unsafe code internally, verify that its implementation satisfies the predicate associated with the semantic interpretation of its interface” (Section 4, p. 12).

what transfers to Verus

Inference: encode each safe wrapper's public invariant as a Verus `spec fn`, carry a ghost lifetime or thread token in `Tracked` state, and prove that the unsafe implementation opens and closes the invariant without leaking the token. Verus's state-machine or atomic APIs can model thread ownership, but the paper's Iris lifetime fractions do not transfer automatically. This is an inference.

evidence and limits

The `Cell::set` walkthrough is a proof outline, not an implemented Rust result. The report explicitly says details are skipped and proposes either formalizing MSE over λRust or generating a function-specific Iris proof as future rigorous soundness work (Section 6.1, p. 18). Thus the semantic encoding is a trusted or provisional component in this report.

## technique: compile Rust to MIR and reuse VeriFast

when to use

Use MIR as the symbolic-execution input when surface Rust's syntax and missing formal operational semantics make direct reasoning difficult. Reuse VeriFast's separation-logic engine instead of implementing a new solver.

how the paper does it

1. Run the official Rust compiler front end to type-check and borrow-check the program and emit MIR plus type definitions and annotations (Section 5.1, p. 16).
2. Serialize the extracted representation with Cap'n Proto so other analyzers can consume it.
3. Translate MIR control-flow graphs into C control constructs in VeriFast's abstract syntax tree. Translate simple types directly and represent complex Rust types with generated RustBelt predicates (Section 5.2, p. 16).
4. Execute the translated AST with VeriFast's symbolic executor and separation-logic ghost commands.
5. For generic functions not yet handled, substitute instantiated implementations; the prototype's allocator example uses this workaround (Section 5.2, p. 16).

The paper says, “Extending VeriFast to support Rust, or more accurately to support MIR, spares us implementing the executing and reasoning engine from scratch.” (Section 5.2, p. 16.)

what transfers to Verus

Inference: a VeruLaw pipeline can similarly lower Rust to a stable intermediate representation for analysis, but Verus already verifies Rust-like source and does not use VeriFast's C AST. The transferable lesson is to reuse the compiler's checked representation and to keep generated proof obligations tied to source contracts. This is an inference.

evidence and limits

At the report date, the tool verifies one simple allocation/access/deallocation example. Generic definitions are “not generally handled yet,” and the supported Rust subset is “very limited” (Section 5.2, p. 16). No count of passing examples or false negatives is given. The claimed practical advantage over RustBelt is reduced learning burden for Rust developers and co-location of Rust code and annotations; this is a hypothesis, not a measured study (Section 5.3, p. 17).

## technique: panic and stack-unwinding paths

when to use

Use explicit MIR unwind edges when an unsafe function can transiently create an invalid state before a call that may panic. A normal-return contract may not hold on an unwind path, and destructors run during unwinding.

how the paper does it

1. Lower the function to MIR so a potentially panicking call has an explicit unwind successor.
2. Symbolically execute both the normal successor and the unwind successor.
3. Check that each path does not use an invalid temporary state and that destructors receive valid values.
4. State separately which postcondition facts are required after a panic, because an unwind returns no ordinary value (Section 6.2, pp. 18–19).

The paper warns, “code that transiently creates unsound states must be careful that a panic does not cause that state to be used” (Section 6.2, p. 19). Its `BinaryHeap::sift_up` example uses `MaybeUninit` and a potentially panicking comparison; MIR makes the jump to an unwind block explicit (Listings 10–11, pp. 19–20).

what transfers to Verus

Inference: model fallible operations as `Result` where possible and prove a separate invariant on every error branch. If panic behavior matters, expose an explicit unwind/error state in the specification; a normal `ensures` clause alone does not describe cleanup after an abort. This is an inference.

evidence and limits

The paper proposes either extending RustBelt with panics or relying on MIR's explicit panic paths. It does not implement or prove either option in this report. Panic safety is therefore an unclosed trusted boundary.

## what is proved, measured, and trusted

The paper proves no new theorem in the report itself. It relies on RustBelt's published safety results and describes an intended correspondence: if MSE verifies all safe abstractions and unsafe code, then a RustBelt proof should exist for the abstractions' type guarantees (Section 4.1, p. 15). The implementation evidence is one verified allocation example and an available Zenodo artifact; the denominator is one reported example, not a benchmark suite. The report gives no percentages, throughput, proof-time distribution, or comparison with Verus, RustBelt, or other tools.

Trusted or assumed components are the Rust compiler's type/borrow checking and MIR semantics, the translation from MIR and RustBelt predicates into VeriFast, VeriFast's engine, the RustBelt semantic model, user annotations, and the absence of unsupported language features. The report itself identifies the missing rigorous soundness proof and the limited subset as boundaries.

Inference: threat to VeruLaw is high for unsafe libraries, interior mutability, panic paths, and foreign or compiler-generated code, because a safe public type can hide a violated invariant. Threat is lower for ordinary safe Rust already covered by Verus contracts. Existing RustBelt work and this MSE proposal already cover the generic idea of semantic safe-abstraction checking; VL should focus on concrete Verus support gaps, such as panic-aware ownership APIs or measured raw-pointer libraries, rather than redo the proposal abstractly.

## techniques for the catalog

- contract-based MSE — verify a function once against weakest-precondition and strongest-postcondition heap contracts, then reuse them at calls
- symbolic heap execution — represent addresses and values by symbols plus path conditions and separation-logic heap chunks
- RustBelt type interpretation — open ownership and shared-reference predicates, use lifetime/thread tokens, and close them at return
- MIR lowering — compile checked Rust to MIR and translate its control flow and type semantics into a reusable verification backend
- safe-abstraction checking — prove that unsafe implementation bodies satisfy the semantic predicate of their safe public type
- panic-path verification — symbolically execute MIR unwind edges and check transient invalid-state cleanup separately

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
