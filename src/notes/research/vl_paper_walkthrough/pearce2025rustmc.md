# RustMC: Extending the GenMC stateless model checker to Rust
(authored by agents unless marked 🧑)
Tag: `pearce2025rustmc`, [paper](http://arxiv.org/abs/2502.06293v1)

## scope and result
RustMC extends GenMC's stateless model checking to concurrent Rust by compiling Rust and any C/C++ foreign-function dependencies to LLVM IR, transforming that IR, and exhaustively exploring executions. The paper's central claim is a tool capability, not a proof of functional contracts: its checks report races, assertion violations, memory errors, and panic-producing interleavings. The authors state: "RustMC is a stateless model checker that enables verification of concurrent Rust programs." (Abstract, p. 1). They also state: "This tool paper presents the key challenges we addressed to extend GenMC." (Abstract, p. 1).

The paper's working evidence is three main examples and two appendix examples, all adapted from real bugs or patterns, rather than a benchmark table with a denominator or measured speedup. It reports that RustMC identifies each described bad interleaving. Inference: this is useful as a bug-finding complement to Verus, while it does not establish a deductive guarantee for arbitrary Rust or unsafe code.

## technique 1: compile mixed-language Rust to LLVM and model-check executions

what it is
- use LLVM IR as the common representation for Rust and C/C++
- retain GenMC's execution-graph and stateless model-checking backend

when to use it
- concurrent Rust whose behavior includes unsafe blocks, atomics, or FFI calls
- a property expressible as absence of data races, assertion failures, or memory errors over explored executions

how to do it
1. compile the Rust application with the customised Rust toolchain to LLVM IR (paper §3, p. 4)
2. link the application IR with the GenMC verification component using `llvm-link` so threading events can be intercepted (§3, p. 4)
3. if there is FFI, link the C/C++ IR with the Rust IR (§3, p. 4)
4. run RustMC's LLVM transformation passes (§3, p. 4)
5. give the transformed module to GenMC, which explores all potential thread interleavings and reports races or assertion violations (§3, p. 4)

The paper describes the backend precisely: "It operates by systematically exploring possible program executions whilst accounting for relaxed memory behaviours permitted by different models (e.g., RC11, IMM, LKMM)." (GenMC background, §2.2, p. 3). GenMC represents events with program-order, reads-from, and coherence relations and uses optimal dynamic partial-order reduction (DPOR) to explore one execution per equivalence class (§2.2, p. 3).

Verus form
Inference: Verus can express a desired safety property as `requires`/`ensures` contracts and prove sequential or proof-oriented concurrent abstractions, but it does not provide RustMC's automatic enumeration of concrete weak-memory interleavings. A VL pipeline could run RustMC on the executable concurrent harness, while using Verus contracts and state-machine proofs for the abstraction. The LLVM compilation, GenMC execution graph, and DPOR backend do not carry over as Verus source constructs.

evidence and limits
- Figure 1's Rust caller invokes a C `inc_C_counter`; two spawned calls race on the C global `counter`. The paper says RustMC "successfully identifies the race condition" (§2.1, p. 2).
- No count of programs, explored states, runtime, or false positives is reported; the evidence denominator is the five presented examples (three in §4 and two in Appendix A), all successfully detected according to the prose.
- GenMC's weak-memory model and the transformed LLVM semantics are trusted for this result. FFI behavior must be available in LLVM IR; Rust's borrow checker cannot check the cross-language global.

## technique 2: selectively inline Rust threading functions

what it is
- expose only the `std::thread` and `std::sys` functions needed for verification, replacing their pthread calls with GenMC wrapper symbols

when to use it
- Rust's normal standard library leaves pthread calls externally linked and therefore absent from application LLVM IR

how to do it
1. modify the Rust standard library so relevant POSIX threading calls use GenMC's `_VERIFIER` functions (§3.1, p. 4)
2. inline the needed functions from `std::thread` and `std::sys`, instead of building all of `std` (§3.1, p. 5)
3. compile and link the resulting IR, allowing GenMC to intercept thread creation and related events (§3.1, p. 4–5)
4. add more standard-library modules incrementally when a program needs them (§3.1, p. 5)

The reason for the selective boundary is explicit: "Instead of building the entire standard library, RustMC selectively inlines the threading related functions from the std::thread and std::sys modules that we need to verify." (§3.1, p. 5).

Verus form
Inference: there is no direct Verus equivalent. In a Verus project, thread creation would be represented by a supported proof-oriented API or transition-system model, while the concrete library implementation remains executable code whose contracts must be supplied. The selective inlining strategy is a RustMC build transformation, not a Verus annotation.

evidence and limits
- The paper says selective inlining keeps IR manageable and avoids most LLVM transformation issues (§3.1, p. 5), but gives no timing denominator.
- A stated limitation is that programs using standard-library functions outside the inlined modules cannot currently be verified (§3.1, p. 5). External definitions therefore remain an assumption or unsupported boundary.

## technique 3: lower Rust memory intrinsics to typed accesses

what it is
- transform `memcpy`, `memmove`, and `memset` calls into individual loads and stores that GenMC can track as events
- for aligned blocks, use a heuristic sequence of 64-bit accesses

when to use it
- Rust LLVM IR, where stack allocations are opaque `i8` arrays and untyped memory makes GenMC's C/C++ type-based intrinsic pass unusable

how to do it
1. identify memory intrinsics and their source/destination alignment and length (§3.2, p. 5)
2. for aligned lengths that are multiples of 8 bytes, replace the copy with sequential 64-bit loads and stores (§3.2, p. 5)
3. run LLVM `ipsccp` and `memcpyopt` passes to expose additional transformable copies (§3.2, p. 6)
4. send the resulting typed accesses to GenMC so read/write dependencies and races are tracked (§3.2, p. 5–6)

The paper's concrete rule is: "Specifically, when RustMC encounters memory copies of aligned blocks (e.g. lengths that are multiple of 8 bytes), it transforms the intrinsic into a sequence of 64-bit accesses." (§3.2, p. 5).

Verus form
Inference: a Verus proof should reason about the abstract sequence or mathematical contents of a copy through a specification function and loop invariant; it cannot reuse RustMC's LLVM pass. A low-level implementation may remain `external_body` only for an explicitly trusted primitive, but the verified wrapper must state and prove the copy contract using constructs documented for Verus.

evidence and limits
- The transform handles common standard-library patterns (§3.2, p. 5–6), but the authors say structs containing byte arrays may still fail because of unsupported mixed-size accesses (§3.2, p. 6).
- The paper gives no corpus size or success rate. The only quantitative condition is the heuristic's 8-byte alignment/multiple rule, not an evaluation denominator.
- Mixed-size semantics and GenMC's event decomposition are trusted; a heuristic can reject a valid program or fail to model an edge case.

## technique 4: materialize undefined memory writes

what it is
- insert explicit stores of LLVM `undef` into stack allocations before verification
- make every later uninitialised load have a preceding write in GenMC's execution graph

when to use it
- Rust enum layouts, padded structs, and other cases where LLVM permits an uninitialised load but GenMC requires every read to read from a write

how to do it
1. detect stack allocations that can be read before an ordinary store (§3.3, p. 6–7)
2. insert an explicit `store undef` for each allocation (§3.3, p. 7)
3. let GenMC interpret that explicit write as storing zero, giving the load a predecessor (§3.3, p. 7)
4. verify the transformed program; the inserted write is intended to preserve LLVM's bit pattern (§3.3, p. 7)

The paper states: "We provide an example of an uninitialised load occurring in typical Rust code in Figure 3." (§3.3, p. 6) and explains the repair: "To handle uninitialized loads while meeting GenMC’s verification requirements, we implement an LLVM pass that explicitly writes undefined values into each stack allocation." (§3.3, p. 7).

Verus form
Inference: Verus specifications should model only initialized logical values or explicitly include an initialization invariant; there is no Verus construct that makes LLVM `undef` a proof fact. Treating the inserted zero-like event as a semantic model requires a trusted executable boundary and a proof that the abstraction preserves the intended behavior.

evidence and limits
- Figure 3 is a `Result<(), i64>` whose second 8-byte chunk is uninitialized; the pass makes it checkable (§3.3, pp. 6–7).
- LLVM's undefined-value rules, the pass, and GenMC's interpretation of `store undef` are trusted. The technique does not prove that arbitrary undefined behavior is benign.

## technique 5: use executions to expose concrete concurrency bugs

what it is
- feed small reproducer programs to the exhaustive checker and inspect the conflicting events/interleaving it reports

when to use it
- atomicity violations, incorrectly implemented `Send`/`Sync`, bounds-check races, and raw-pointer aliasing

how to do it
1. encode the suspected concurrent pattern as Rust (and C when needed)
2. include an assertion or unsafe operation whose failure exposes the bug
3. run RustMC over all supported interleavings
4. use the reported conflicting reads/writes or panic-producing schedule to repair synchronization or unsafe trait assumptions

The paper reports four concrete patterns. In §4.1, two relaxed atomic flags in an `is_getrand_available` function can return different results; RustMC finds the atomicity violation. In §4.2, an unsafe `Sync` implementation around `Cell<i64>` permits two `increment` calls; RustMC reports the race. Appendix A.1 checks a bounds test followed by `get_unchecked` after another thread increments the index, and reports the resulting out-of-bounds panic. Appendix A.2 creates two mutable raw-pointer references to `x`; RustMC reports conflicting writes at lines 8 and 10.

Verus form
Inference: Verus can state an invariant that an index remains below vector length, or a state-machine invariant that only one writer owns a cell, but proving these examples requires modeling atomics, thread ownership, and unsafe pointer validity. RustMC's concrete counterexample schedule is useful evidence for debugging; it is not itself a Verus proof.

evidence and limits
- The denominator is five examples in the paper: one FFI race (Figure 1), two §4 examples, and two appendix examples; the paper says each was detected, so the reported detection fraction is 5/5 presented examples, not a general benchmark rate.
- The examples are small and selected. No false-negative, false-positive, coverage, or runtime measurements are given.
- The checker covers only code that survives the supported compilation and transformation subset; unsupported standard-library functions and mixed-size patterns remain outside the result.

## what is proved, trusted, and left open
RustMC proves a bounded model-checking result under GenMC's memory models for the transformed LLVM module: if it finds no reported error in the explored state space, that is evidence for the modeled executions. It does not prove Rust's full type/ownership semantics, FFI correctness, arbitrary library behavior, or a Verus contract. Trusted components include rustc and its LLVM lowering, the customised standard library, LLVM transformation passes, GenMC's execution semantics and DPOR, and the mapping of `undef` and mixed-size accesses. Inference: a product that generates agent-written verified Rust should use RustMC as an additional concurrency and unsafe-code bug finder, especially around FFI, atomics, and raw pointers; it is a moderate threat to product claims if the product promises concurrency safety without this dynamic/exhaustive check, but a smaller threat to deductive Verus contract proving because the tools target different obligations.

The paper says its intended future work is to apply RustMC to real projects and dependencies (§6, p. 10). What VL should not redo: the paper already supplies the LLVM/GenMC bridge, selective threading inlining, aligned-copy lowering, and explicit-undef workaround. A new VL contribution would need to connect these checks to Verus specifications, contracts, and proof-maintenance workflows, or to evaluate larger real-world Rust/Verus projects with a stated denominator.

## techniques for the catalog
- LLVM mixed-language lowering — compile Rust and C/C++ dependencies to LLVM IR and exhaustively explore GenMC execution graphs
- selective threading inlining — expose only Rust standard-library thread modules and redirect pthread operations to GenMC wrappers
- aligned intrinsic lowering — turn aligned Rust memory copies into typed 64-bit loads and stores, with LLVM optimization passes
- explicit undefined stores — insert `store undef` so uninitialized loads satisfy GenMC's read-from requirement
- stateless concurrency checking — use weak-memory execution exploration and DPOR to report concrete races, assertion failures, and panic schedules
- targeted reproducer checking — apply the checker to FFI, atomics, unsafe `Sync`, bounds-check, and raw-pointer examples

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
