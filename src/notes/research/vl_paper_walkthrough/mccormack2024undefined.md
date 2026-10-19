# A Study of Undefined Behavior Across Foreign Function Boundaries in Rust Libraries
(authored by agents unless marked 🧑)
Tag: `mccormack2024undefined`, [paper](http://arxiv.org/abs/2404.11671v8); link from the fetch record

## what the paper establishes

McCormack, Sunshine, and Aldrich study undefined behavior (UB) at Rust/C and Rust/C++ foreign-function boundaries. They build MiriLLI, which combines Rust’s Miri interpreter with LLVM’s LLI interpreter, and execute real Rust library tests through both Rust MIR and LLVM IR. The introduction reports “a large-scale study of 9,130 test cases from 957 Rust libraries that call foreign functions” (Section I, p.1). The results state: “We found 46 bugs in 37 crates.” (Section IV, p.6). The supplied revision is arXiv:2404.11671v8, dated 2 Apr 2025 (p.1). Inference: this dynamic testing evidence cannot prove that an FFI wrapper is sound; a Verus proof must model or trust the foreign implementation.

## technique 1: jointly interpret Rust MIR and LLVM IR with MiriLLI

what it is: MiriLLI extends Miri so a Rust thread can call an LLVM-defined foreign function and receive its result, while LLI can call back into Rust. Miri continues to own memory access, thread scheduling, intrinsics, system-call shims, and Miri’s UB checks; LLI interprets LLVM instructions and foreign thread state (Section III.B, pp.4–6). The authors write: “MiriLLI uses each interpreter to jointly execute programs defined across LLVM’s intermediate representation (LLVM IR) and Rust’s mid-level intermediate representation (MIR).” (Section III, p.4).

when to use: use this when a Rust safe API reaches C/C++ code and the bug can arise from aliasing, initialization, allocation, layout, or deallocation across the boundary. The paper says Miri “cannot find undefined behavior that is triggered in foreign code” (Section II.C, p.4).

how to do it:
1. compile Rust with its toolchain and configure Clang as the default C/C++ compiler to emit LLVM bitcode; use the same nightly Rust toolchain for the control Miri run and MiriLLI (Section III.A–B, pp.4–5)
2. when Miri encounters a foreign call, locate its LLVM definition and translate argument values from Miri’s representation to LLI’s representation
3. start an LLVM thread, execute the foreign function, translate its return value back, and resume the Rust thread
4. route memory, thread, intrinsic, and shim operations through Miri for both interpreters; let LLI handle LLVM instruction state (Section III.B, pp.4–6)
5. insert Rust `retag` instructions for alias tracking and configure Stacked Borrows or Tree Borrows; no equivalent instrumentation is inserted into LLVM because LLVM pointers are treated as Rust raw pointers (Section III.B, pp.5–6)

Inference: in Verus, an FFI wrapper needs an explicit contract for every foreign function’s memory, alias, initialization, and allocation behavior. Inference: a dynamic MiriLLI run can validate selected executions, while Verus `requires` and `ensures` should state the boundary conditions that the dynamic run cannot cover.

evidence: of 121,015 crates with at least one valid published version in the 125,804-crate snapshot, 84,106 compiled without intervention; 44,661 compiled crates had unit tests and 11,120 produced LLVM bitcode. After unmodified Miri filtering and foreign-call selection, 9,130 viable tests from 957 crates remained (Section III.A, p.4). The snapshot was taken on September 20, 2023; the evaluation used Rust 1.74, nightly-2023-09-25, and Clang 16 with optimizations disabled (Sections III.A and III.C, pp.4, 6).

limits: “Our sample only includes crates that statically link to foreign code in their default configuration” (Section III.A, p.4). Inference: these findings do not estimate an ecosystem-wide UB rate. Some reports remained unconfirmed, and the authors did not evaluate effects on native execution (Section VII, p.11).

## technique 2: conservative value translation across an unformalized ABI

what it is: convert values between Miri and LLI without assuming that Rust bindings are correct. The paper notes that neither side has a complete formal ABI oracle, so MiriLLI enforces a size invariant: “the size of a typed value on one side of the boundary must be equal to the size of the type expected by the other side.” (Section III.B, p.5). Primitive representations are direct; pointers and integers may be implicitly cast; by-value aggregates normally require matching size and field count, with exceptions for integer or reference passing and a special homogeneous-aggregate expansion for common calling conventions.

how to apply it:
1. inspect the Rust binding and LLVM definition, but do not trust the binding’s signature as ground truth
2. translate primitive values directly and check equal sizes before crossing the boundary
3. for aggregates passed by value, require matching size and field count unless passed as an integer or by reference; split a homogeneous aggregate only if it cannot pass as one parameter and the fixed-parameter count can accommodate its fields and the remaining arguments
4. for an opaque LLVM pointer passed to a Miri system-call shim, assign `*mut u8`, except that pointers to stack or static memory with a primitive type’s size are assigned a pointer type targeting that primitive
5. report size mismatches as UB; investigate alignment reports because inferred pointer types may cause false positives (Section III.B, p.5)

Inference: a Verus FFI specification should include size, alignment, field layout, calling convention, and ownership-transfer facts as preconditions. Inference: `external_body` or an external spec can delimit the foreign implementation, but it must not silently erase these boundary obligations.

evidence: the special homogeneous-aggregate conversion was needed for 156/9,130 tests (2%) from 140 crates, and pointer/integer conversions were needed for 526 tests from 70 crates (Section III.B, p.5). These denominators are test-case and crate counts, not bug rates.

limits: opaque-pointer typing can create false positive alignment errors when the true type is not `u8`; the authors also lack a formal Rust/LLVM ABI specification (Section III.B, p.5; Section V, p.10). Inference: exact ABI contracts are a prerequisite for sound compositional Verus proofs.

## technique 3: initialization-sensitive cross-language execution

what it is: distinguish LLVM loads used to propagate undef and poison values from Rust’s restrictions on reading uninitialized memory. MiriLLI has two modes: by default it permits LLVM loads of uninitialized bytes; the second mode treats such reads as errors while zero-initializing LLVM stack and heap memory. The authors state: “Tests that read uninitialized memory must be run in each mode to ensure a complete evaluation.” (Section III.B, p.6).

how to apply it:
1. execute the foreign call with Miri’s initialization tracking enabled
2. run once allowing LLVM loads of uninitialized bytes and once with zero-initialized LLVM stack and heap memory plus uninitialized-read errors
3. classify byte reads that occur only because LLVM propagates undef as false positives
4. retain errors where a Rust allocation or `MaybeUninit<T>::assume_init` exposes genuinely uninitialized data (Section III.B, p.6)

Inference: in Verus, represent initialization as a ghost predicate over each field or byte range and require the foreign call’s postcondition to establish full initialization before converting `MaybeUninit<T>` to `T`. Inference: the predicate should specify which fields or byte ranges must be initialized; the paper’s padding example does not establish that every Rust type requires initialized padding.

evidence: five of the 12 typing/initialization bugs involved incomplete initialization; one fix zero-initialized an entire array before `assume_init`, and another zero-initialized padding bytes that LLVM omitted when copying the foreign struct back (Section IV.B, p.9). These are counts of discovered bugs, not prevalence estimates.

limits: MiriLLI cannot detect true positive uninitialized reads that occur entirely outside interactions with Rust (Section III.B, p.6). Inference: foreign-only invariants remain outside this evidence and need C/C++ sanitizers or a separate verifier.

## technique 4: alias-model comparison and dynamic bug triage

what it is: execute every viable test under both Stacked Borrows and Tree Borrows, then investigate deduplicated errors. Tree Borrows was configured so `Unique<T>` behaves as a mutable borrow; symbolic alignment checking was enabled, and LLVM-side unaligned accesses were ignored to prioritize Rust-specific errors (Section III.C, p.6). The authors state: “we only reported Stacked Borrows violations that were also Tree Borrows violations” (Section III.C, p.6).

how to apply it:
1. run each test natively and under MiriLLI with both alias models
2. pair each test’s outcomes under both models; deduplicate by exit codes, stack traces, and error logs after removing addresses and irrelevant details; retain foreign traces up to the Rust boundary, but only the first trace line for Rust errors
3. manually inspect each remaining error because not every interpreter error is UB and one bug can yield multiple tests
4. report a representative test case, MiriLLI output, and a minimal example where applicable; attempt private disclosure before public reporting, with the exceptions described by the authors; classify the bug by ownership, typing, or allocation (Sections III.C and IV, pp.6–7)

The study found 90 tests from 37 crates with Stacked Borrows violations in foreign code. The results clarify: “However, 66% (59) of these tests passed or encountered an unsupported operation under Tree Borrows.” (Section IV, p.7). Inference: the paper does not establish that all 59 completed successfully under Tree Borrows. The main difference was invalid-range errors: 45 tests (50% of 90) used pointer arithmetic that Stacked Borrows rejected but Tree Borrows allowed (Section IV, p.7). The paper reports 24 ownership bugs in 20 crates, including 17 Tree Borrows violations and seven out-of-bounds accesses (Section IV.A, p.7), 12 typing bugs in 12 crates (Section IV.B, p.9), and 10 allocation issues in 10 libraries, including nine memory leaks and one cross-language deallocation bug (Section IV.C, p.10).

Inference: Verus cannot choose an alias model by dynamic permissiveness. A proof must state the alias and mutation permissions its unsafe abstraction relies on, and reviewers should test whether those assumptions match the current Rust memory model.

limits: MiriLLI lacks complete ABI specifications, system-call shims, source locations for some LLVM-side permission updates, and broad C++ coverage (Sections III.B, III.C, VII, pp.5–6, 11). Inference: model and tool version changes can alter both bug reports and proof obligations.

## trusted boundary and product implications

Inference: the trusted or assumed components include Rust and LLVM interpreter semantics, the selected Stacked/Tree Borrows model, value-translation rules, compiler and Clang behavior, and manually written tests and PoCs. Executing selected tests cannot prove absence of FFI UB. 

The authors report: “On average, across each memory mode, 61% of tests terminated due to an unsupported operation, 19% passed, 10% timed out, 1% failed, and 9% had a potential bug.” (Section III.C, p.6).

Inference: FFI is a high threat to agent-written verified Rust because a Verus proof can establish wrapper logic while trusting an incorrect binding, allocator pairing, alias permission, or initialization guarantee. VL should not redo a generic Miri-plus-LLVM dynamic interpreter. It should reuse this testing pattern at FFI boundaries and focus new work on checked ABI contracts, verified ownership-transfer adapters, and regression tests that survive toolchain and alias-model updates.

## techniques for the catalog

- joint MIR/LLVM interpretation — combine Miri and LLI so dynamic UB checks cross Rust and foreign calls
- conservative ABI translation — enforce size and representation invariants while translating values between interpreters
- dual-mode initialization checking — separate LLVM undef propagation from genuine uninitialized Rust reads
- alias-model differential testing — execute tests under Stacked and Tree Borrows and triage model differences
- FFI bug deduplication and reports — normalize paired model outcomes, investigate errors manually, and provide representative tests and minimal examples where applicable
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This is considered undefined behavior under Stacked Borrows, but it is valid under Tree Borrows."): checked the entire paper text, all study quotations, counts, section and page references, and technique steps; corrected quotation attribution, crate counts, references, ABI-conversion details, triage steps, unsupported Tree Borrows outcomes, and inference labels; did not run MiriLLI, reproduce bugs, inspect the replication package, or validate the proposed Verus applications.
