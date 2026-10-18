# From Model Checking to Runtime Verification and Back?
(authored by agents unless marked 🧑)
Tag: `kejstova2018model`, [paper](http://arxiv.org/abs/1805.12428v1)


## purpose and contribution

The paper turns an existing software model checker into a runtime verifier by allowing one controlled execution to use the host operating system, then records that interaction so the model checker can replay it and explore alternative internal behaviors. The abstract states: “We describe a novel approach for adapting an existing software model checker to perform precise runtime verification.” (Abstract, p. 1) The design is demonstrated by extending DIVINE 4 and its DiVM/DiOS components.

The central constraint is irreversible external effects. A model checker normally restores states and explores branches; a host file or network operation cannot in general be undone. Section 3.1 therefore requires one control-flow execution, while still allowing symbolic data if every value crossing into the host is concrete. The paper says: “The root cause for the requirement of exploring only one control flow path is that we need to insert actions into the process of model checking that will have consequences in the outside world, consequences which cannot be undone or replayed.” (Section 3.1, p. 3)

## technique 1: three-mode stand-in operating system

What it is. Put the program and a stand-in operating system inside the checker. Give that OS three interchangeable modes: virtual, passthrough, and replay. Virtual mode simulates effects in checker state; passthrough executes host system calls during one run; replay consumes a recorded trace without touching the host. The exact mode definition is given in Section 3.4 (pp. 5-6): “a virtual mode, in which all interaction with the real world is simply simulated”; “a passthrough mode, which uses the vm syscall model checker extension to execute system calls in the host operating system and stores a trace”; and “a replay mode, which reads the system call trace recorded in the passthrough mode, but does not interact with the host operating system.”

When to use it. Inference: use virtual mode for ordinary exhaustive verification with a modeled environment. Use passthrough when a concrete test execution must exercise real files, sockets, or other host resources. Use replay after that run when exhaustive exploration of internal choices under the same observed external interaction is useful.

How to apply it.

1. Link a POSIX-like stand-in OS to the program as a library (Section 3.2, p. 4). The paper reuses the whole libc unmodified and implements system calls in the OS kernel (Section 4.2, p. 9).
2. Implement the checker’s run mode as one execution in standard order while retaining memory-safety and assertion checks; retain the normal model-checking algorithm for verify mode (Section 3.4, p. 5).
3. Configure virtual mode for a modeled environment, or configure passthrough/replay components at OS boot (Sections 3.4 and 4.2, pp. 5-6, 9; the paper says which components are activated “is decided at boot time”).
4. Keep host-specific knowledge in the stand-in OS, not in the model checker, because the stand-in OS “is much easier to modify than the model checker proper” (Section 4, p. 7).

Verus form. Inference: Verus can represent the same separation with executable Rust wrappers around an abstract environment trait, a ghost/specification model for virtual mode, and a trace datatype whose replay operation is proved to return the recorded result. Verus `spec fn`, `proof fn`, `requires`, `ensures`, and loop invariants can prove the wrapper’s state transitions; host I/O remains an external assumption and must be isolated behind a trusted boundary. The paper’s C/C++ checker modes and DiOS components do not carry over directly.

Evidence and limits. The pre-existing DiOS has a core of about 2500 lines of C++, plus about 5000 further lines for the virtual POSIX-compatible file system and socket interfaces (Section 6.3, p. 13). The approach assumes the checker can run one path and expose explicitly valued operations (Section 3, p. 3). It does not make host behavior exhaustive by itself: the paper says “runtime verification is not exhaustive” (Section 6.6, p. 15), and replay explores only executions compatible with its trace (Section 5.2, p. 11).

## technique 2: metadata-driven syscall passthrough

What it is. Add one universal checker primitive, `vm_syscall`, rather than one primitive per host syscall. Each argument carries metadata describing scalar width or pointer, input/output direction, and pointed-to size. Section 4.1 (pp. 7-8) explains that the metadata is “sufficient to both construct a valid call to syscall and to copy inputs from the system under test to the host system and pass back the outputs.” The paper’s complete example is:

“vm_syscall( SYS_read,
                           _VM_SC_Out | _VM_SC_Int32, &read,
                           _VM_SC_In | _VM_SC_Int32, fd,
                           _VM_SC_Out | _VM_SC_Mem, length, buffer,
                           _VM_SC_In | _VM_SC_Int32, length );” (Figure 2, p. 8)

When to use it. Inference: use this interface when many platform-dependent calls must be exposed while keeping the checker core small and portable.

How to apply it.

1. Add a variadic primitive handled specially by the checker (Section 4.1, p. 7).
2. For every real syscall argument, pass type/direction metadata; pass scalar values directly, output scalars by pointer, and pointer arguments with size followed by the pointer (Section 4.1, p. 8).
3. Copy input bytes from checker memory to host memory, invoke the host syscall, then copy output bytes and return values back (Section 4.1, p. 8).
4. Implement a C function per syscall as a thin wrapper; their use can be type-checked by the compiler, and in the OS they divert into the kernel, where a passthrough component can construct the `vm_syscall` call (Section 4.2, pp. 8-9).

Verus form. Inference: model the metadata as an enum describing `In`/`Out`, integer width, and buffer length; prove a wrapper’s precondition that a buffer has the declared length, then ensure only declared output ranges change. Verus executable code can perform the actual FFI call only inside a trusted external boundary; proof code can establish that replay and virtual implementations satisfy the same abstract syscall contract. The variadic C ABI and raw host-memory copying require a Rust/FFI design outside the paper.

Evidence and limits. The checker extension is about 200 lines of C++; passthrough is about 1400 lines and replay under 600 (Section 6.4, pp. 13-14). Wrong metadata can crash the checker or corrupt memory (Section 4.2, p. 8), so typed wrappers are important. The paper calls passthrough “generally unsafe” and meaningful only if the checker explores a single run in order (Section 4, p. 6). On platforms without a `syscall` primitive the extension is “a little more complicated” (Section 4.1, p. 7), and blocking syscalls may deadlock the checker (Section 6.5, p. 14). Inference: unexpected host-side mutation is a further risk that the paper does not discuss in these words.

## technique 3: trace capture and deterministic replay

What it is. While passthrough runs, append each syscall’s arguments, outputs, return value, and `errno` to a trace. During replay, check that the next program syscall matches the trace entry, then apply only the recorded observable effects. Section 5 says: “This is achieved by simply replacing all invocations of vm syscall by a different mechanism, which we will call replay syscall.” (Section 5, p. 10)

When to use it. Inference (from Section 5.1, p. 10): use replay to inspect a real execution with an interactive simulator, to obtain reversible debugging, or to explore thread interleavings that preserve the same external syscall sequence.

How to apply it.

1. In passthrough, record inputs, outputs, sizes, return values, and `errno` as each call occurs; the metadata makes exact capture possible (Section 4.3, p. 9).
2. Start replay with the recorded sequence and replace host calls by trace reads (Section 5, p. 10).
3. Check that the syscall invoked by the program matches the next one in the trace (Section 5, p. 10). On mismatch, issue `assume( false )`; Section 5.2 (p. 11) says “The execution is abandoned and the model checker is forced to explore only those runs that match the external behaviour of the original.” The paper does not say that argument values are also compared.
4. For matching calls, apply output-buffer changes and return values from the trace, without host interaction (Section 5, p. 10).

Verus form. Inference: define a ghost trace sequence and a cursor. A replay proof maintains an invariant that the cursor equals the number of matched calls and that each returned output equals the corresponding trace record. A `requires` clause can state trace well-formedness; `ensures` can state cursor advancement and unchanged unrelated state. the paper’s `assume( false )` path-abandoning has no direct executable counterpart; an executable mismatch branch should return an error, while the abstract model may constrain paths with a specification precondition.

Evidence and limits. The four small test programs, each run in passthrough and in replay mode, are a named pipe with two threads, file read/write, parallel file read/write, and a simple HTTP client (Section 6.6, p. 15). Inference: replay can only reproduce effects that are in the trace. The paper expects an identical syscall trace only in a controlled environment, “that files and network resources did not change, and that the behaviour of the program does not depend on the value of the real-time clock” (Section 5.1, p. 10).

## technique 4: causality-aware partial-order replay

What it is. Exact trace order can overconstrain exploration. The paper defines two actions a and b as commuting “if the outcome of both is the same, regardless of their relative ordering”. Swapping adjacent commuting entries of a causality-respecting sequence yields another such sequence; the paper constructs an approximate partial order from all such sequences (Section 5.3, p. 11).

How to apply it. Generate sequences by repeatedly swapping adjacent commuting calls while preserving their effects. Declare `a < b` only when `a` precedes `b` in every generated sequence (Section 5.3, p. 11). Inference: replay could then allow independent reads or other commuting operations to occur in either order; the paper presents the construction but, in the sections I read, no implementation or evaluation of it.

Verus form. Inference: encode a trace event relation and prove a commutation lemma stating that two events produce equal abstract states when their independence preconditions hold. A proof function can show that swapping adjacent independent events preserves the trace postcondition; a sequence invariant can then justify exploring a reduced partial order. Exact host causality cannot be proved from a trace alone, matching the paper’s warning that the approximation may order some actions too strictly.

## measured results, trust, and product threat

The source distribution had about 600 DIVINE tests. In passthrough evaluation, 595 passed, 3 timed out because of blocking calls, and 9 timed out because of infinite loops (Section 6.6, pp. 14-15). The denominator is the stated test set (600-plus cases; the reported categories sum to 607, so the paper’s “about 600” description and category total are inconsistent). Inference: percentages should therefore not be reported without choosing the explicit category denominator 607 or the approximate suite size 600. Four hand-written programs demonstrated passthrough and replay, but the paper gives no runtime or memory measurements and says “Quantitative assessment of the runtime and memory overhead is subject to future work” (Section 6.6, p. 15).

Inference: the checker, stand-in OS, host kernel, libc, trace format, and model-checker implementation remain trusted components. The paper says the four programs “clearly demonstrate that the approach works” (Section 6.6, p. 15) and that it is “not yet possible to use our prototype with many complete, real-world programs”; Inference: this supports prototype feasibility, not complete host-environment correctness. Inference: for VeruLaw, the threat is high when verified Rust relies on unmodeled files, networking, clocks, blocking, or FFI; the transferable lesson is to isolate those effects behind explicit contracts and replayable traces, then prove pure state transformations around them. Existing work already supplies the passthrough/replay architecture, so VL should not redo that concept as a novelty claim; it can instead measure whether Verus contracts prevent stale or incomplete environment assumptions.

## techniques for the catalog

- three-mode stand-in os — separate virtual modeling, host passthrough, and trace replay so one checker supports testing and exhaustive exploration

- metadata-driven syscall primitive — expose one universal syscall interface with direction, width, and buffer-size metadata

- trace capture and replay — record syscall inputs and observable outputs, then constrain model-checking runs to matching traces

- causality-aware partial order — commute independent syscall actions to avoid unnecessary linear trace ordering
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "When the code that is specific to the host operating system resides in the stand-in operating system, it can be ported once and multiple model checkers can benefit."): I read the whole paper text and checked every quotation, number (200/1400/under 600 lines, 2500/5000 lines, 595/3/9 of about 600 tests), section and page reference, and the technique steps against it, and confirmed the arXiv link and tag. I changed several page references (e.g. mode list pp. 5-6, replay tests and results p. 15), one quotation that was not word for word (Section 5.2), the replay step that claimed arguments are compared, the unsupported remarks about unrecorded environment state and resource mutation, and marked own conclusions as Inference. I did not check the Verus forms beyond marking them Inference, the VeruLaw threat assessment, or the cited related work.
