# A Study of Undefined Behavior Across Foreign Function Boundaries in Rust Libraries
(authored by agents unless marked 🧑)
Tag: `mccormack2024undefined`, [paper](http://arxiv.org/abs/2404.11671v8)

## what the paper establishes

McCormack, Sunshine, and Aldrich study undefined behavior (UB) at Rust/C and Rust/C++ foreign-function boundaries. They build MiriLLI, which combines Rust’s Miri interpreter with LLVM’s LLI interpreter, and execute real Rust library tests through both Rust MIR and LLVM IR. The abstract reports “a large-scale study of 9,130 test cases from 957 Rust libraries” and 46 bugs in 37 libraries (Abstract, p.1). The work is dynamic testing evidence, not a proof that an FFI wrapper is sound. It directly exposes a boundary that a Verus proof must model or trust.

## technique 1: jointly interpret Rust MIR and LLVM IR with MiriLLI

what it is: MiriLLI extends Miri so a Rust thread can call an LLVM-defined foreign function and receive its result, while LLI can call back into Rust. Miri continues to own memory access, thread scheduling, intrinsics, system-call shims, and Miri’s UB checks; LLI interprets LLVM instructions and foreign thread state (Section III.B, pp.4–6). The authors say the design “combines Miri with an LLVM interpreter to jointly execute programs defined across LLVM’s intermediate representation (LLVM IR) and Rust’s mid-level intermediate representation (MIR).” (Abstract, p.1).

when to use: use this when a Rust safe API reaches C/C++ code and the bug can arise from aliasing, initialization, allocation, layout, or deallocation across the boundary. Ordinary Miri cannot detect UB triggered inside foreign code (Section II, p.3).

how to do it:
1. compile the crate and foreign source with Clang so C/C++ emits LLVM bitcode; use the same nightly Rust toolchain for the control Miri run and MiriLLI (Section III.A–B, pp.4–5)
2. when Miri encounters a foreign call, locate its LLVM definition and translate argument values from Miri’s representation to LLI’s representation
3. start an LLVM thread, execute the foreign function, translate its return value back, and resume the Rust thread
4. route memory, thread, intrinsic, and shim operations through Miri for both interpreters; let LLI handle LLVM instruction state (Section III.B, pp.4–6)
5. insert Rust `retag` instructions for alias tracking and configure Stacked Borrows or Tree Borrows; no equivalent instrumentation is inserted into LLVM because LLVM pointers are treated as Rust raw pointers (Section III.B, p.6)

Inference: in Verus, an FFI wrapper needs an explicit contract for every foreign function’s memory, alias, initialization, and allocation behavior. Inference: a dynamic MiriLLI run can validate selected executions, while Verus `requires` and `ensures` should state the boundary conditions that the dynamic run cannot cover.

evidence: of 121,015 valid published crate versions in the 125,804-crate snapshot, 84,106 compiled without intervention; 44,661 compiled crates had unit tests and 11,120 produced LLVM bitcode. After unmodified Miri filtering and foreign-call selection, 9,130 viable tests from 957 crates remained (Section III.A, pp.4–5). The final evaluation found 46 bugs in 37 crates (Section IV, p.8; Conclusion, p.11).

limits: the sample excludes dynamic linking and non-default static-link configurations; 61% of tests terminated on unsupported operations and 10% timed out (Section VII, p.11). Inference: the result is a lower bound on FFI UB in the sampled ecosystem, not an ecosystem-wide rate.

## technique 2: conservative value translation across an unformalized ABI

what it is: convert values between Miri and LLI without assuming that Rust bindings are correct. The paper notes that neither side has a complete formal ABI oracle, so MiriLLI enforces a size invariant: “the size of a typed value on one side of the boundary must be equal to the size of the type expected by the other side.” (Section III.B, p.5). Primitive representations are direct; pointers and integers may be implicitly cast; aggregates require matching size and field count, with a special homogeneous-aggregate expansion for common calling conventions.

how to apply it:
1. inspect the Rust binding and LLVM definition, but do not trust the binding’s signature as ground truth
2. translate primitive values directly and check equal sizes before crossing the boundary
3. for aggregates passed by value, require size and field-count agreement, or split homogeneous fields when the calling convention passes them separately
4. represent an opaque LLVM pointer as `*mut u8` unless a compatible concrete type can be inferred
5. report size mismatch or alignment errors; treat unresolved opaque representations conservatively (Section III.B, pp.5–6)

Inference: a Verus FFI specification should include size, alignment, field layout, calling convention, and ownership-transfer facts as preconditions. Inference: `external_body` or an external spec can delimit the foreign implementation, but it must not silently erase these boundary obligations.

evidence: the special homogeneous-aggregate conversion was needed for 156/9,130 tests (2%) from 140 crates, and pointer/integer conversions were needed for 526 tests from 70 crates (Section III.B, pp.5–6). These denominators are test-case and crate counts, not bug rates.

limits: opaque-pointer typing can create false positive alignment errors when the true type is not `u8`; the authors also lack a formal Rust/LLVM ABI specification (Section III.B, p.6; Section V, p.10). Inference: exact ABI contracts are a prerequisite for sound compositional Verus proofs.

## technique 3: initialization-sensitive cross-language execution

what it is: distinguish LLVM’s permissible propagation of undef/poison bytes from Rust’s rule that reading uninitialized memory is UB. MiriLLI has two modes: by default it permits LLVM loads of uninitialized bytes; the second mode treats such reads as errors while zero-initializing LLVM stack and heap memory. Tests must run in both modes to identify true positives involving Rust-allocated memory (Section III.B, pp.6–7).

how to apply it:
1. execute the foreign call with Miri’s initialization tracking enabled
2. run once with default LLVM undef propagation and once with zero-initialized LLVM memory plus uninitialized-read errors
3. classify byte reads that occur only because LLVM propagates undef as false positives
4. retain errors where a Rust allocation or `MaybeUninit<T>::assume_init` exposes genuinely uninitialized data (Section III.B, p.6)

Inference: in Verus, represent initialization as a ghost predicate over each field or byte range and require the foreign call’s postcondition to establish full initialization before converting `MaybeUninit<T>` to `T`. Inference: a single coarse `ensures initialized` fact can be unsound for padding and partially initialized arrays.

evidence: five of the 12 typing/initialization bugs involved incomplete initialization; one fix zero-initialized an entire array before `assume_init`, and another zero-initialized padding bytes that LLVM failed to copy back (Section IV.B, pp.9–10). These are counts of discovered bugs, not prevalence estimates.

limits: MiriLLI cannot detect true positive uninitialized reads that occur entirely outside interactions with Rust (Section III.B, p.6). Inference: foreign-only invariants remain outside this evidence and need C/C++ sanitizers or a separate verifier.

## technique 4: alias-model comparison and dynamic bug triage

what it is: execute every viable test under both Stacked Borrows and Tree Borrows, then investigate deduplicated errors. Tree Borrows was configured so `Unique<T>` behaves as a mutable borrow; symbolic alignment checking was enabled (Section III.C, p.7). The authors conservatively reported Stacked Borrows violations only when Tree Borrows also reported them, reducing reports to violations accepted by the newer model.

how to apply it:
1. run each test natively and under MiriLLI with both alias models
2. normalize stack traces and logs, remove addresses and irrelevant details, and deduplicate outcomes
3. manually inspect each remaining error because not every interpreter error is UB and one bug can yield multiple tests
4. construct a minimal safe-API-triggering reproducer, privately disclose it, and classify the bug by ownership, typing, or allocation (Section III.C and Section IV, pp.7–10)

The study found 90 tests from 37 crates with Stacked Borrows violations; 66% (59/90) did not violate Tree Borrows (Abstract, p.1; Section IV, p.8). The paper attributes the difference mainly to Tree Borrows accepting real-world patterns that Stacked Borrows rejects. It found 24 ownership bugs in 20 crates, including 17 Tree Borrows violations and seven out-of-bounds accesses (Section IV.A, p.8), 12 typing bugs in 12 crates, and 10 allocation bugs in 10 crates (Sections IV.B–C, pp.9–10).

Inference: Verus cannot choose an alias model by dynamic permissiveness. A proof must state the alias and mutation permissions its unsafe abstraction relies on, and reviewers should test whether those assumptions match the current Rust memory model.

limits: MiriLLI lacks complete ABI specifications, system-call shims, source locations for some LLVM-side permission updates, and broad C++ coverage (Sections III.B, III.C, VII, pp.6–7, 11). Inference: model and tool version changes can alter both bug reports and proof obligations.

## trusted boundary and product implications

The trusted or assumed components include Rust and LLVM interpreter semantics, the selected Stacked/Tree Borrows model, value-translation rules, compiler and Clang behavior, and manually written tests and PoCs. MiriLLI’s evidence is dynamic: passing 9,130 tests cannot prove absence of FFI UB. The paper’s conclusion is direct: it found 46 bugs in 37 libraries and says Tree Borrows was more permissive in this context (Conclusion, p.11).

Inference: FFI is a high threat to agent-written verified Rust because a Verus proof can establish wrapper logic while trusting an incorrect binding, allocator pairing, alias permission, or initialization guarantee. VL should not redo a generic Miri-plus-LLVM dynamic interpreter. It should reuse this testing pattern at FFI boundaries and focus new work on checked ABI contracts, verified ownership-transfer adapters, and regression tests that survive toolchain and alias-model updates.

## techniques for the catalog

- joint MIR/LLVM interpretation — combine Miri and LLI so dynamic UB checks cross Rust and foreign calls
- conservative ABI translation — enforce size and representation invariants while translating values between interpreters
- dual-mode initialization checking — separate LLVM undef propagation from genuine uninitialized Rust reads
- alias-model differential testing — execute tests under Stacked and Tree Borrows and triage model differences
- FFI bug deduplication and PoCs — normalize dynamic errors, construct safe-client reproducers, and validate concrete UB
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
