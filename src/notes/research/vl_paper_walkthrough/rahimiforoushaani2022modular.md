# Modular Formal Verification of Rust Programs with Unsafe Blocks
(authored by agents unless marked 🧑)

Tag: `rahimiforoushaani2022modular`, [paper](http://arxiv.org/abs/2212.12976v1)

## scope and claim

This December 2022 technical report (KU Leuven, imec-DistriNet) proposes verifying Rust unsafe blocks and safe abstractions with VeriFast's Modular Symbolic Execution (MSE), using RustBelt's semantic model for Rust types. The abstract states, “To address this problem we are trying to verify soundness of Rust unsafe code applying our Modular Symbolic Execution algorithm.” (Abstract, p. 1.) The target is memory safety (no access to unallocated memory, no data races) and conformance of a safe abstraction to the guarantees in its Rust type, under the assumption that the input has already passed Rust's type and borrow checker (Section 1, p. 2).

The paper focuses initially on unsafe code that dereferences raw pointers, not every unsafe superpower: “The two others are used relatively rarely” (Section 2, p. 3). Its claim is a plan plus a prototype, not a completed soundness theorem or a broad evaluation. The authors say, “The MIR extraction program and the VeriFast extension for supporting Rust are works in progress and currently support a very limited subset of Rust.” (Section 5.2, p. 16.)

## technique: contracts for unsafe functions

when to use

Use a contract when a raw-pointer function or safe wrapper must be checked once and then called without re-executing its body. The contract has a `requires` clause (the precondition) and an `ensures` clause (the postcondition), written as VeriFast separation-logic formulas over heap chunks and facts about values. The paper says it would like the precondition to be the weakest one under which no execution has undefined behavior, and the postcondition to be the strongest one (Section 3.3, p. 9). The paper's example contract is written by hand, not inferred (Section 3.4, p. 11).

how the paper does it

1. Start with a Rust function and the memory facts that must hold before it runs. For `create_deque`, `requires true` means there is no caller-side heap prerequisite and nothing is in the store, heap or path condition at the start (Section 3.3, p. 11).
2. Symbolically execute the body from the precondition. Allocation creates a symbolic pointer and branches on null versus non-null; each write requires a matching heap chunk such as `Node_prev` or `Node_next` and updates its value (Sections 3.1–3.3, pp. 7–9).
3. At the return point, check every `ensures` fact. The example contract requires `result!=0`, `malloc_block_Node(result)`, `Node_prev(result, result)`, `Node_next(result, result)`, and a `Node_value(result, _)` chunk whose value is unconstrained (Listing 5, p. 11).
4. Consume the chunks named by `ensures` from the callee heap. Their access rights go to the caller, and removing them prevents the same rights from being transferred twice. An empty heap afterwards shows `create_deque` leaks no chunks (Section 3.3, p. 11).
5. At a call site, do not look at the callee body. Check the precondition, then add the postcondition to the caller state: here `r != 0x0` in the path condition and the node chunks in the heap (Section 3.3, p. 11).

The paper describes this modularity directly: “If a human/verifier provides us with a function contract in a well-defined logic, we can check the contract’s propositions against the function body/implementation and if the body satisfies the contract, we can just reuse the contract every time we want to check a call to the function.” (Section 3.3, p. 9.)

what transfers to Verus

Inference: write the same boundary as a Verus executable function with `requires` and `ensures`, using a predicate for allocated and initialized nodes, and prove each raw-pointer operation through a verified wrapper or a modeled memory API. Verus's contracts are source-level specifications rather than VeriFast heap chunks, so the memory representation and unsafe boundary must be supplied explicitly. The paper says nothing about Verus; this section was not checked against Verus documentation.

evidence and limits

The only concrete contract example is `create_deque`; no number of verified functions or success fraction is reported. The paper's intended guarantee is conditional on successful MSE, prior Rust type/borrow checking, and a sound encoding of RustBelt's semantics. It does not yet prove that its algorithm is sound with respect to RustBelt (Section 6.1, p. 18).

## technique: symbolic execution of heap chunks

when to use

Use symbolic execution when concrete execution would branch over practically infinitely many addresses. Replace concrete values with symbols while retaining path conditions and heap predicates that describe allocated bytes and initialized fields (Sections 3.1–3.2, pp. 7–9).

how the paper does it

1. Represent machine state as a store plus a heap. The store maps variables to values; the heap is a multiset of predicates such as `malloc_block_Node`, `Node_prev`, `Node_value`, and `Node_next` (Section 3.1, pp. 6–8).
2. Execute allocation symbolically. One path records a null result; the successful path introduces a symbolic address `b_l`, a non-null path fact, and chunks for the allocated node whose fields initially contain the special uninitialized value h (Sections 3.1–3.2, pp. 7–9).
3. For a field write, require a matching heap chunk. A write to `prev` is safe because the heap holds `Node_prev(address, h)`; afterwards the chunk holds the written value (Section 3.1, p. 8).
4. Treat a read of an uninitialized value as failure to verify (the algorithm gets stuck). This reflects Rust's rule that producing an invalid value is undefined behavior (Section 3.1, p. 7).
5. Carry a path condition, the knowledge base about symbols, through branches. If a needed chunk is missing the algorithm gets stuck, which means the program is not verified (Sections 3.1–3.2, pp. 8–9).

The paper says, “The execution using symbols and facts we know about them is called Symbolic Execution.” (Section 3.2, p. 9.)

what transfers to Verus

Inference: model the heap facts as a `spec fn` predicate over an abstract map from addresses to node records, and prove each branch's non-null and initialization facts with `assert`. For real raw pointers, use a Verus-supported pointer abstraction or isolate the operation behind a trusted specification whose implementation is separately checked; a non-null address alone does not justify a raw dereference. Not checked against Verus documentation.

evidence and limits

The `create_deque` trees (Figures 1–2, pp. 8, 10) show one allocation-failure path and infinitely many successful-address paths collapsed into one symbolic path. There is no benchmark denominator, solver-time number, or soundness theorem for the proposed symbolic interpreter. Inference: matching the abstract machine to Rust's actual memory and provenance rules remains a proof obligation; the paper does not discuss provenance.

## technique: modular symbolic execution

when to use

Use MSE when a function is called repeatedly, so that its body is verified against a contract once. The paper's motivation: “Executing the body of functions over and over is a waste. Even worse, in the case of loops and recursive functions, our symbolic execution algorithm may not terminate.” (Section 3.3, p. 9.) It also wants verification of a caller not to depend on callee internals.

how the paper does it

1. Verify the callee body from its `requires` state and establish its `ensures` state when it returns (Section 3.3, pp. 9–11).
2. Save the result as the function's contract (Section 3.3, p. 9).
3. At each call, check the precondition, then produce the postcondition, without inspecting the callee body (Section 3.3, p. 11).
4. Inference: a recursive call can use the saved contract the same way, which is how MSE would avoid non-termination; the paper states the non-termination problem but does not walk through a recursive example.
5. Preserve ownership by consuming the `ensures` chunks from the callee heap at return, so rights are not transferred twice (Section 3.3, p. 11).

The authors define the goal as follows: “We also want the contract to tell us as much as possible about the effects that calling the function has on the execution state.” (Section 3.3, p. 9.)

what transfers to Verus

Inference: use a Verus `ensures` clause as the reusable postcondition and a `decreases` clause for recursive termination. Loop invariants must be written explicitly with `invariant` clauses; a function contract alone does not automatically become a loop invariant. Not checked against Verus documentation.

evidence and limits

MSE is described through one allocator/deque example (`create_deque`). The paper reports no corpus size or comparison against a baseline verifier. It identifies higher-order functions, traits, and panics as complications for analyzing unsafe code (Section 2.2, p. 6), so modular contracts may need additional modeling for those features (Inference).

## technique: RustBelt semantic interpretation of safe abstractions

when to use

Use RustBelt's semantic interpretation when the function's Rust type carries ownership, borrowing, lifetimes, `Send`/`Sync`, or thread-local sharing facts that a raw-pointer contract does not express. In RustBelt's third proof step, a library that uses unsafe code must satisfy the predicate of the semantic interpretation of its interface; the paper says its MSE follows this step (Section 4, p. 12).

how the paper does it (outline, Cell::set walkthrough, Section 4.1, pp. 12–15)

1. Interpret each Rust type as a tuple of a natural number and two Iris predicates. The paper quotes RustBelt: “Each type τ is interpreted by a tuple Jτ K = (size, own, shr) of a natural number and two Iris predicates” (Section 4.1, p. 13).
2. Start from the function's type. The initial state holds a fraction of the lifetime token for each lifetime parameter, a non-atomic token for the current thread, and the `own` predicate for the parameters (Table 1, row 1, p. 15). Open `own` for the shared reference to obtain the `shr` predicate of `Cell`, then open that to obtain a non-atomic persistent borrow of the cell contents (Table 1, rows 2–3, p. 15).
3. Use the lifetime logic rule `LftL-na-acc` (Listing 8, p. 14), supplying a fraction of the lifetime token and the thread's non-atomic token. This yields full access to the content together with an update that takes the content back (Table 1, row 4, p. 15).
4. Perform the unsafe write through the obtained points-to chunk, updating the stored integer (Table 1, row 5, p. 15).
5. Apply the update, giving back the content and recovering the lifetime and thread tokens (Table 1, row 6, p. 15). At return, consume the lifetime token fraction and the non-atomic token, so every resource granted through borrows was returned (Section 4.1, pp. 14–15).

The `Cell` invariant (“All aliases of a Cell object remain in the same thread”, Section 2.1, p. 5) is not a separate checked step in the walkthrough. It comes from the type system (`impl !Sync for Cell {}`) and shows up in RustBelt's interpretation, where the `shr` predicate of `Cell` depends on the thread identifier `t` (Section 4.1, pp. 13–14).

The paper quotes RustBelt's three proof steps: “Verify that the typing rules of λRust are sound when interpreted semantically” (Section 4, p. 12), “Verify that, if a closed program is semantically well-typed according to the model, its execution will not exhibit any unsafe/undefined behaviours” (Section 4, p. 12), and “For any library that employs unsafe code internally, verify that its implementation satisfies the predicate associated with the semantic interpretation of its interface” (Section 4, p. 12).

what transfers to Verus

Inference: encode each safe wrapper's public invariant as a Verus `spec fn`, carry a ghost lifetime or thread token in `Tracked` state, and prove that the unsafe implementation opens and closes the invariant without leaking the token. Whether Verus can model thread ownership this way, and how Iris lifetime fractions would map, is not established by the paper and was not checked.

evidence and limits

The `Cell::set` walkthrough is a proof outline, not an implemented Rust result; the paper says “To keep the text concise, we skip the details” (Section 4.1, p. 14). Appendix A (pp. 20–22) gives an intended VeriFast encoding of a `Cell` example and its C translation, provided by Prof. Bart Jacobs. The paper proposes either formalizing MSE over λRust's operational semantics or generating a function-specific Iris proof as ways to establish rigorous soundness (Section 6.1, p. 18). Inference: until then, the semantic encoding is a trusted or provisional component in this report.

## technique: compile Rust to MIR and reuse VeriFast

when to use

Use MIR as the symbolic-execution input when surface Rust's heavy syntax and lack of a formal operational semantics make direct reasoning difficult (Section 5.1, p. 16). Reuse VeriFast's engine instead of implementing a new reasoning tool.

how the paper does it

1. Run a Rust program built on the official Rust compiler front end to type-check and borrow-check the input and emit MIR plus type definitions and user annotations (Section 5.1, p. 16).
2. Serialize the extracted representation with Cap'n Proto, so other Rust analyzers can reuse the extractor (Section 5.1, p. 16).
3. Translate MIR control-flow graphs into C control constructs in VeriFast's abstract syntax tree. Translate simple types directly (for example bool, tuples as C structs); for complex Rust types the plan is to add RustBelt type semantics in VeriFast's separation logic (Section 5.2, p. 16).
4. Execute the translated AST with VeriFast's symbolic executor.
5. For generic functions, which are not generally handled yet, substitute equivalents of their instantiated implementation; the prototype's alloc example uses this workaround (Section 5.2, p. 16).

The paper says, “Extending VeriFast to support Rust, or more accurately to support MIR, spares us implementing the executing and reasoning engine from scratch.” (Section 5.2, p. 16.)

what transfers to Verus

Inference: a VeruLaw pipeline can similarly lower Rust to a stable intermediate representation for analysis, but Verus already verifies Rust-like source and does not use VeriFast's C AST. The transferable lesson is to reuse the compiler's checked representation and to keep generated proof obligations tied to source contracts. Not checked against Verus documentation.

evidence and limits

At the report date, the tool verifies one simple allocation/access/deallocation example (Figure 3, p. 17). Generic definitions are “not generally handled yet,” and the supported Rust subset is “very limited” (Section 5.2, p. 16). The code is available as a Zenodo drop, https://doi.org/10.5281/zenodo.7472607 (Section 5.2, p. 16). No count of passing examples or false negatives is given. The claimed advantage over RustBelt is that developers need VeriFast separation logic rather than Iris and a translation to λRust, and that Rust code and annotations sit together; the paper calls the second point “Our hypothesis” and gives no measured study (Section 5.3, pp. 16–17).

## technique: panic and stack-unwinding paths

when to use

Use explicit MIR unwind edges when an unsafe function can transiently create an invalid state before a call that may panic. The paper cites The Rustonomicon: “Panics cause the thread to halt normal execution and unwind its stack, calling destructors as if every function instantly returned” (Section 6.2, p. 18).

what the paper proposes (not implemented)

1. Lower the function to MIR; a potentially panicking call then has an explicit unwind successor (Section 6.2, p. 18; Listing 11, p. 19).
2. Since the tool symbolically executes MIR, it can naturally take the panic execution paths into account (Section 6.2, p. 18).
3. The unwind path returns no value, so not all guarantees of the function type need to hold there. The paper says, “We need to study what the exact necessary checks are to claim the exception safety of a function after a panic.” (Section 6.2, p. 18.) The checks are therefore open.

The paper quotes The Rustonomicon: “code that transiently creates unsound states must be careful that a panic does not cause that state to be used” (Section 6.2, p. 18). Its `BinaryHeap::sift_up` example (inspired by Rust issue 25842) uses `MaybeUninit::zeroed().assume_init()` and a potentially panicking `<=`; in MIR, the call to `le` in block `bb8` has `unwind: bb23` (Listings 10–11, p. 19).

what transfers to Verus

Inference: model fallible operations as `Result` where possible and prove a separate invariant on every error branch. If panic behavior matters, expose an explicit unwind/error state in the specification; a normal `ensures` clause alone does not describe cleanup after an abort. Not checked against Verus documentation.

evidence and limits

The paper names two options: extend RustBelt with panics, or rely on MIR's explicit panic paths (Section 6.2, p. 18). It implements and proves neither. Inference: panic safety is an unclosed trusted boundary.

## what is proved, measured, and trusted

The report states no new theorem. It relies on RustBelt's published safety results and states a target claim: if MSE verifies all safe abstractions and the unsafe code behind them, no execution exhibits undefined behavior; in RustBelt's terms, a RustBelt proof exists for each verified abstraction (Section 4.1, p. 15). The implementation evidence is one verified allocation example and a Zenodo drop; the denominator is one reported example, not a benchmark suite. The report gives no percentages, throughput, proof-time distribution, or comparison with Verus, RustBelt, or other tools.

Assumed by the paper: the input passed Rust's type and borrow checker (Section 1, p. 2), and RustBelt's semantic model is the meaning of Rust types. Inference: the trusted base also includes the MIR extractor and MIR semantics, the translation from MIR and RustBelt predicates into VeriFast, VeriFast's engine, user annotations, and the absence of unsupported language features. The report itself names the missing rigorous soundness proof and the very limited Rust subset as open (Sections 5.2 and 6.1, pp. 16, 18).

Inference: threat to VeruLaw is high for unsafe libraries, interior mutability, panic paths, and foreign or compiler-generated code, because a safe public type can hide a violated invariant. Threat is lower for ordinary safe Rust already covered by Verus contracts. Existing RustBelt work and this MSE proposal already cover the generic idea of semantic safe-abstraction checking; VL should focus on concrete Verus support gaps, such as panic-aware ownership APIs or measured raw-pointer libraries, rather than redo the proposal abstractly.

## techniques for the catalog

- contract-based MSE — verify a function once against heap contracts (ideally weakest precondition, strongest postcondition), then reuse them at calls
- symbolic heap execution — represent addresses and values by symbols plus path conditions and separation-logic heap chunks
- RustBelt type interpretation (outlined only) — open ownership and shared-reference predicates, use lifetime/thread tokens, and close them at return
- MIR lowering — compile checked Rust to MIR and translate its control flow and type semantics into a reusable verification backend
- safe-abstraction checking — prove that unsafe implementation bodies satisfy the semantic predicate of their safe public type
- panic-path verification (proposed, not implemented) — symbolically execute MIR unwind edges; the exact post-panic checks are left open

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "One of the facts this ensures clause asserts is that when a call to create_deque returns, its mentioned chunks have been added to the Heap."): read the whole paper (pp. 1-22, including Appendix A) and checked every quotation, section and page reference, the contract, symbolic execution, MSE, RustBelt Cell::set, MIR and panic step lists, and the statements on evidence, limits and trust; changed the quotation endings in the contract and panic sections, page references (Listing 5 is on p. 11, the traits and panics remark on p. 6, the Rustonomicon panic quote on p. 18, Listings 10-11 on p. 19), the Table 1 row numbers, the Cell invariant step (a type-system fact encoded in the shr predicate, not a checked step), the panic section (proposal only, removed destructor-validity checks the paper does not state), the "path explosion" motivation (the paper says repeated execution is wasteful and may not terminate), and marked recursive-call reuse as an inference; removed the unsupported Verus `old(...)` remark; did not check the Verus, VeruLaw or Verus API statements (all marked Inference) against Verus documentation, the cited works (RustBelt, Rustonomicon, Rust issue 25842), the figures' graphical content beyond the extracted text, or the Zenodo artifact.
