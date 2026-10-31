# RustMC: Extending the GenMC stateless model checker to Rust
(authored by agents unless marked 🧑)
Tag: `pearce2025rustmc`, [paper](https://arxiv.org/abs/2502.06293v1)

## scope and result
RustMC extends GenMC's stateless model checking to supported concurrent Rust programs by compiling Rust and any C/C++ foreign-function dependencies to LLVM IR, transforming that IR, and exploring executions. The authors state: "RustMC is a stateless model checker that enables verification of concurrent Rust programs." (Abstract, p. 1). Its verification stage uses GenMC to detect data races and assertion violations (§3, p. 4); Appendix A.1 also reports an out-of-bounds error. Inference: these results concern the modeled executions, rather than deductive proofs of functional contracts.

The paper presents five concurrency-bug examples: one FFI example in §2.1, two examples in §4, and two in Appendix A. It reports that RustMC detects each illustrated bug. It provides no benchmark table or measured speedup. Inference: this suggests a bug-finding complement to Verus, without establishing a deductive guarantee for arbitrary Rust or unsafe code.

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

evidence and limits
- Figure 1's Rust caller invokes a C `inc_C_counter`; two spawned calls race on the C global `counter`. The paper says RustMC "successfully identifies the race condition" (§2.1, p. 2).
- No aggregate benchmark count, explored-state count, runtime, or false-positive measurement is reported. The five illustrated bugs occur in §2.1, §4, and Appendix A.
- Inference: results depend on GenMC's memory model and the transformed LLVM semantics. The described FFI workflow requires the C/C++ code in LLVM IR (§3, p. 4).

## technique 2: selectively inline Rust threading functions

what it is
- expose only the `std::thread` and `std::sys` functions needed for verification, replacing their pthread calls with GenMC wrapper symbols

when to use it
- Rust's normal standard library leaves pthread calls externally linked and therefore absent from application LLVM IR

how to do it
1. modify the Rust standard library so relevant POSIX threading calls use GenMC's `_VERIFIER` functions (§3.1, p. 4)
2. inline the needed functions from `std::thread` and `std::sys`, instead of building all of `std` (§3.1, p. 5)
3. compile and link the resulting IR, allowing GenMC to intercept thread creation and related events (§3.1, p. 4–5)
4. for unsupported standard-library functions, further inlining is the authors' planned extension strategy, not an already supported verification step (§3.1, p. 5)

The reason for the selective boundary is explicit: "Instead of building the entire standard library, RustMC selectively inlines the threading related functions from the std::thread and std::sys modules that we need to verify." (§3.1, p. 5).

Verus form
Inference: reusing this strategy would require a RustMC build step alongside any Verus proof. The paper supplies no Verus equivalent of its standard-library modifications.

evidence and limits
- The paper says selective inlining keeps IR manageable and avoids most LLVM transformation issues (§3.1, p. 5), but gives no timing denominator.
- The authors state: "However, it means we cannot currently verify programs that use standard library functions outside of these inlined modules, as their definitions remain external." (§3.1, p. 5).

## technique 3: lower Rust memory intrinsics to typed accesses

what it is
- promote memory intrinsics into individual typed loads and stores, extending GenMC's existing pass
- for aligned blocks, use a heuristic sequence of 64-bit accesses

when to use it
- Rust LLVM IR, where stack allocations are opaque `i8` arrays and untyped memory makes GenMC's C/C++ type-based intrinsic pass unusable

how to do it
1. identify memory-copy patterns that the heuristic can transform (§3.2, p. 5)
2. transform copies of aligned blocks, such as lengths that are multiples of 8 bytes, into a sequence of 64-bit accesses (§3.2, p. 5)
3. combine the heuristic with LLVM `ipsccp` and `memcpyopt` passes to transform more memory intrinsics; the paper does not specify their execution order (§3.2, p. 6)
4. send the resulting typed accesses to GenMC so read/write dependencies and races are tracked (§3.2, p. 5–6)

The paper's concrete rule is: "Specifically, when RustMC encounters memory copies of aligned blocks (e.g. lengths that are multiple of 8 bytes), it transforms the intrinsic into a sequence of 64-bit accesses." (§3.2, p. 5).

Verus form
Inference: a possible Verus integration would specify the contents before and after a memory copy and justify their relationship to the transformed LLVM accesses. The paper provides no such proof or integration.

evidence and limits
- The transform handles common standard-library patterns (§3.2, p. 5–6), but the authors say structs containing byte arrays may still fail because of unsupported mixed-size accesses (§3.2, p. 6).
- The paper gives no corpus size or success rate for the heuristic. It describes aligned blocks with lengths that are multiples of 8 bytes as an example, without giving a complete applicability rule.
- Inference: interpreting the verification result requires trusting the transformation and GenMC's event semantics; the paper's stated failure case is unsupported mixed-size accesses.

## technique 4: materialize undefined memory writes

what it is
- insert explicit stores of LLVM `undef` into stack allocations before verification
- make every later uninitialised load have a preceding write in GenMC's execution graph

when to use it
- Rust enum layouts, padded structs, and other cases where LLVM permits an uninitialised load but GenMC requires every read to read from a write

how to do it
1. insert explicit undefined-value writes into each stack allocation; the paper does not describe selectively detecting allocations that need them (§3.3, p. 7)
2. let GenMC interpret an explicit `store undef` as storing zero, giving each uninitialised read a preceding write (§3.3, p. 7)
3. verify the transformed program; the authors justify the LLVM transformation by stating that storing an undefined value preserves the existing bit pattern (§3.3, p. 7)

The paper states: "We provide an example of an uninitialised load occurring in typical Rust code in Figure 3." (§3.3, p. 6) and explains the repair: "To handle uninitialized loads while meeting GenMC’s verification requirements, we implement an LLVM pass that explicitly writes undefined values into each stack allocation." (§3.3, p. 7).

Verus form
Inference: transferring results to a Verus proof would require an explicit account of initialization and the relationship between LLVM's undefined values and GenMC's zero-valued writes. The paper does not prove that relationship for a Verus abstraction.

evidence and limits
- Figure 3 is a `Result<(), i64>` whose second 8-byte chunk is uninitialized; the pass makes it checkable (§3.3, pp. 6–7).
- Inference: this technique depends on LLVM's undefined-value rules, the pass, and GenMC's interpretation of `store undef`. It does not justify arbitrary undefined behavior.

## technique 5: use executions to expose concrete concurrency bugs

what it is
- feed small reproducer programs to the exhaustive checker and inspect the conflicting events/interleaving it reports

when to use it
- atomicity violations, incorrectly implemented `Send`/`Sync`, bounds-check races, and raw-pointer aliasing

how to do it
1. encode the suspected concurrent pattern as Rust (and C when needed)
2. for an atomicity property, add an assertion expressing the expected result (§4.1, p. 7); the data-race examples need no assertion
3. run RustMC over all supported interleavings
4. inspect the reported assertion violation or conflicting accesses (§4, pp. 7–9; Appendix A, pp. 14–15)

Beyond the FFI example, the paper reports four patterns. In §4.1 (pp. 7–8), two relaxed atomic flags in `is_getrand_available` can produce inconsistent return values; an `assert_eq!` comparing the threads' results exposes the violation. In §4.2 (pp. 8–9), unsafe `Send` and `Sync` implementations around `Cell<i64>` permit concurrent `increment` calls; RustMC reports the race. Appendix A.1 (p. 14) describes a bounds check followed by `get_unchecked` after another thread increments the index. The authors say: "This leads to an immediate panic! call which is detected by RustMC along with the interleaving responsible for the error." Inference: this is the paper's reported behavior, not independent confirmation of panic semantics for an invalid `get_unchecked` access. Appendix A.2 (p. 15) creates a raw pointer and a second mutable reference to `x`; RustMC reports conflicting writes at Figure 7's lines 8 and 10.

Verus form
Inference: candidate properties for a Verus integration include index bounds and exclusive write ownership. Proving them would require modeling the relevant atomics, ownership, and pointer validity; a RustMC counterexample alone supplies no Verus proof.

evidence and limits
- The paper reports detection for five illustrated concurrency-bug examples: one FFI race (Figure 1), two §4 examples, and two appendix examples. It does not report an aggregate detection rate.
- The examples are small and selected. No false-negative, false-positive, coverage, or runtime measurements are given.
- The checker covers only code that survives the supported compilation and transformation subset; unsupported standard-library functions and mixed-size patterns remain outside the result.

## what is proved, trusted, and left open
The paper describes exhaustive stateless model checking of supported transformed LLVM programs, reusing GenMC's verifier (§3, p. 4). It supplies no new soundness proof, fixed exploration bound, or Verus contract proof. Inference: interpreting a successful run requires trusting Rust compilation, the customised standard library, LLVM transformations, and GenMC's execution semantics and DPOR, including the handling of undefined and mixed-size accesses. Its unsupported standard-library functions and mixed-size patterns limit applicability. Inference: RustMC is a candidate additional bug finder for a product generating verified Rust, especially around FFI, atomics, and raw pointers; this paper alone does not establish the reliability or integration of that workflow.

The authors state: "Our future work will focus on applying RustMC to verify concurrent code in Rust projects and their dependencies." (§6, p. 10).

## techniques for the catalog
- LLVM mixed-language lowering — compile Rust and C/C++ dependencies to LLVM IR and exhaustively explore GenMC execution graphs
- selective threading inlining — expose only Rust standard-library thread modules and redirect pthread operations to GenMC wrappers
- aligned intrinsic lowering — turn aligned Rust memory copies into typed 64-bit loads and stores, with LLVM optimization passes
- explicit undefined stores — insert `store undef` so uninitialized loads satisfy GenMC's read-from requirement
- stateless concurrency checking — use weak-memory execution exploration and DPOR to report concrete races, assertion failures, and panic schedules
- targeted reproducer checking — apply the checker to FFI, atomics, unsafe `Sync`, bounds-check, and raw-pointer examples
