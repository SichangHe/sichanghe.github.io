# From Model Checking to Runtime Verification and Back?
(authored by agents unless marked 🧑)
Tag: `kejstova2018model`, [paper](http://arxiv.org/abs/1805.12428v1)


## purpose and contribution

The paper turns an existing software model checker into a runtime verifier by allowing one controlled execution to use the host operating system, then records that interaction so the model checker can replay it and explore alternative internal behaviors. The abstract states: “We describe a novel approach for adapting an existing software model checker to perform precise runtime verification.” (Abstract, p. 1) The design is demonstrated by extending DIVINE 4 and its DiVM/DiOS components.

The central constraint is irreversible external effects. A model checker normally restores states and explores branches; a host file or network operation cannot in general be undone. Section 3.1 therefore requires one control-flow execution, while still allowing symbolic data if every value crossing into the host is concrete. The paper says: “The root cause for the requirement of exploring only one control flow path is that we need to insert actions into the process of model checking that will have consequences in the outside world, consequences which cannot be undone or replayed.” (Section 3.1, p. 3)

## technique 1: three-mode stand-in operating system

What it is. Put the program and a stand-in operating system inside the checker. Give that OS three interchangeable modes: virtual, passthrough, and replay. Virtual mode simulates effects in checker state; passthrough executes host system calls during one run; replay consumes a recorded trace without touching the host. The exact mode definition is given in Section 3.4 (p. 5): “a virtual mode, in which all interaction with the real world is simply simulated”; “a passthrough mode, which uses the vm syscall model checker extension to execute system calls in the host operating system and stores a trace”; and “a replay mode, which reads the system call trace recorded in the passthrough mode, but does not interact with the host operating system.”

When to use it. Use virtual mode for ordinary exhaustive verification with a modeled environment. Use passthrough when a concrete test execution must exercise real files, sockets, or other host resources. Use replay after that run when exhaustive exploration of internal choices under the same observed external interaction is useful.

How to apply it.

1. Link a POSIX-like stand-in OS to the program as a library (Section 3.2, p. 4). The OS supplies libc-facing wrappers and a kernel-like implementation.
2. Implement the checker’s run mode as one execution in standard order while retaining memory-safety and assertion checks; retain the normal model-checking algorithm for verify mode (Section 3.4, p. 5).
3. Configure virtual mode for a modeled environment, or configure passthrough/replay components at OS boot (Sections 3.4 and 4.2, pp. 5, 8).
4. Keep host-specific knowledge in the stand-in OS, not in checker logic, so the OS can be ported independently (Section 4, p. 6).

Verus form. Inference: Verus can represent the same separation with executable Rust wrappers around an abstract environment trait, a ghost/specification model for virtual mode, and a trace datatype whose replay operation is proved to return the recorded result. Verus `spec fn`, `proof fn`, `requires`, `ensures`, and loop invariants can prove the wrapper’s state transitions; host I/O remains an external assumption and must be isolated behind a trusted boundary. The paper’s C/C++ checker modes and DiOS components do not carry over directly.

Evidence and limits. DIVINE’s prototype used about 2,500 lines of C++ for the DiOS core and 5,000 lines for virtual POSIX file/socket interfaces (Section 6.3, p. 13). The approach assumes the checker can run one path and expose explicitly valued operations (Section 3, p. 3). It does not make host behavior exhaustive by itself: runtime verification observes one execution, and replay explores only executions compatible with its trace.

## technique 2: metadata-driven syscall passthrough

What it is. Add one universal checker primitive, `vm_syscall`, rather than one primitive per host syscall. Each argument carries metadata describing scalar width or pointer, input/output direction, and pointed-to size. Section 4.1 explains that metadata lets the checker construct the host call and copy data in both directions. The paper’s complete example is:

“vm_syscall( SYS_read,
                           _VM_SC_Out | _VM_SC_Int32, &read,
                           _VM_SC_In | _VM_SC_Int32, fd,
                           _VM_SC_Out | _VM_SC_Mem, length, buffer,
                           _VM_SC_In | _VM_SC_Int32, length );” (Figure 2, p. 8)

When to use it. Use this interface when many platform-dependent calls must be exposed while keeping the checker core small and portable.

How to apply it.

1. Add a variadic primitive handled specially by the checker (Section 4.1, p. 7).
2. For every real syscall argument, pass type/direction metadata; pass scalar values directly, output scalars by pointer, and pointer arguments with size followed by the pointer (Section 4.1, p. 8).
3. Copy input bytes from checker memory to host memory, invoke the host syscall, then copy output bytes and return values back (Section 4.1, p. 8).
4. Implement typed POSIX wrappers in the stand-in libc/kernel. The wrappers are compiler-checked and redirect to the passthrough component (Section 4.2, p. 8).

Verus form. Inference: model the metadata as an enum describing `In`/`Out`, integer width, and buffer length; prove a wrapper’s precondition that a buffer has the declared length, then ensure only declared output ranges change. Verus executable code can perform the actual FFI call only inside a trusted external boundary; proof code can establish that replay and virtual implementations satisfy the same abstract syscall contract. The variadic C ABI and raw host-memory copying require a Rust/FFI design outside the paper.

Evidence and limits. The checker extension is about 200 lines of C++; passthrough is about 1,400 lines and replay under 600 (Section 6.4, p. 13). Wrong metadata can crash the checker or corrupt memory (Section 4.2, p. 8), so typed wrappers are important. Platform syscall conventions still require porting, and the design is unsafe if calls are blocking or mutate resources unexpectedly.

## technique 3: trace capture and deterministic replay

What it is. While passthrough runs, append each syscall’s arguments, outputs, return value, and `errno` to a trace. During replay, check that the next program syscall matches the trace entry, then apply only the recorded observable effects. Section 5 says: “This is achieved by simply replacing all invocations of vm syscall by a different mechanism, which we will call replay syscall.” (Section 5, p. 10)

When to use it. Use replay to inspect a real execution with an interactive simulator, to obtain reversible debugging, or to explore thread interleavings that preserve the same external syscall sequence.

How to apply it.

1. In passthrough, record inputs, outputs, sizes, return values, and `errno` as each call occurs; the metadata makes exact capture possible (Section 4.3, p. 9).
2. Start replay with the recorded sequence and replace host calls by trace reads (Section 5, p. 10).
3. Compare the invoked syscall and arguments with the next record. On mismatch, abandon that execution with `assume(false)`; Section 5.2 says this “forces the model checker to explore only those runs that match the external behaviour of the original.”
4. For matching calls, apply output-buffer changes and return values from the trace, without host interaction (Section 5, p. 10).

Verus form. Inference: define a ghost trace sequence and a cursor. A replay proof maintains an invariant that the cursor equals the number of matched calls and that each returned output equals the corresponding trace record. A `requires` clause can state trace well-formedness; `ensures` can state cursor advancement and unchanged unrelated state. Verus has no paper-specific `assume` primitive requirement here; an executable mismatch branch should return an error or use a proved impossible-state lemma, while the abstract model may constrain paths with a specification precondition.

Evidence and limits. The prototype’s replay tests include a named pipe with two threads, file read/write, parallel file access, and a simple HTTP client (Section 6.6, p. 14). Replay is sound only for the effects represented in the trace. The paper notes that real-time clocks, changing files, networks, and unrecorded environment state can invalidate identical-trace assumptions (Section 5.1, p. 10).

## technique 4: causality-aware partial-order replay

What it is. Exact trace order can overconstrain exploration. The paper defines two syscall actions as commuting when executing them in either order gives the same individual and combined outcome. Adjacent commuting actions can be swapped; all resulting sequences approximate a causal partial order (Section 5.3, p. 11).

How to apply it. Generate sequences by repeatedly swapping adjacent commuting calls while preserving their effects. Declare `a < b` only when `a` precedes `b` in every generated sequence (Section 5.3, p. 11). Replay then allows independent reads or other commuting operations to occur in either order, while preserving writes and dependencies.

Verus form. Inference: encode a trace event relation and prove a commutation lemma stating that two events produce equal abstract states when their independence preconditions hold. A proof function can show that swapping adjacent independent events preserves the trace postcondition; a sequence invariant can then justify exploring a reduced partial order. Exact host causality cannot be proved from a trace alone, matching the paper’s warning that the approximation may order some actions too strictly.

## measured results, trust, and product threat

The source distribution had about 600 DIVINE tests. In passthrough evaluation, 595 passed, 3 timed out because of blocking calls, and 9 timed out because of infinite loops (Section 6.6, p. 14). The denominator is the stated test set (600-plus cases; the reported categories sum to 607, so the paper’s “about 600” description and category total are inconsistent). Inference: percentages should therefore not be reported without choosing the explicit category denominator 607 or the approximate suite size 600. Four hand-written programs demonstrated passthrough and replay, but the paper gives no runtime or memory measurements and says quantitative overhead assessment is future work (Section 6.6, p. 14).

The checker, stand-in OS, host kernel, libc, trace format, and model-checker implementation remain trusted components. The paper’s claims establish prototype feasibility, not complete host-environment correctness. Inference: for VeruLaw, the threat is high when verified Rust relies on unmodeled files, networking, clocks, blocking, or FFI; the transferable lesson is to isolate those effects behind explicit contracts and replayable traces, then prove pure state transformations around them. Existing work already supplies the passthrough/replay architecture, so VL should not redo that concept as a novelty claim; it can instead measure whether Verus contracts prevent stale or incomplete environment assumptions.

## techniques for the catalog

- three-mode stand-in os — separate virtual modeling, host passthrough, and trace replay so one checker supports testing and exhaustive exploration

- metadata-driven syscall primitive — expose one universal syscall interface with direction, width, and buffer-size metadata

- trace capture and replay — record syscall inputs and observable outputs, then constrain model-checking runs to matching traces

- causality-aware partial order — commute independent syscall actions to avoid unnecessary linear trace ordering
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
