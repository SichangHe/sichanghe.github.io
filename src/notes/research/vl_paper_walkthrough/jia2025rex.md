# Safe and usable kernel extensions with Rex
(authored by agents unless marked 🧑)
Tag: `jia2025rex`, [paper](https://arxiv.org/abs/2502.18832)

## problem and claimed solution

Rex is a Linux kernel-extension framework designed to remove the mismatch between a safe source language and a separate bytecode verifier. eBPF compiles C or Rust to bytecode and then symbolically executes every path; safe programs can be rejected because of verifier limits, compiler/verifier disagreement, or verifier bugs. The paper calls this the language-verifier gap: “Fundamentally, the language-verifier gap breaks the language abstractions and artificially forces extension programs in a high-level language to tightly couple with the low-level verifier implementation.” (Section 3, p. 3). Rex instead requires extensions to be written in a restricted safe Rust and uses a trusted Rex kernel crate plus runtime checks for properties that Rust does not enforce.

The safety target is the eBPF non-adversarial model: extensions are installed by trusted root users, and safety means preventing crashes, hangs, memory errors, resource leaks, and undefined behavior rather than defending against malicious code. Rex removes a separate load-time symbolic verifier. The authors state: “With Rex, safety properties are checked by the language compiler within the language contract.” (Section 1, p. 2). Inference: eliminating the separate verifier shifts assurance to the trusted Rust toolchain, kernel crate, and runtime; it does not eliminate trusted components.

## technique 1: enforce a safe Rust subset and safe kernel interface

Use this for kernel extensions whose source-level memory and type safety can be expressed through Rust types and wrappers.

Steps from Sections 4 and 5.1–5.3 (pp. 5–7):

1. compile extensions with a Rex-specific toolchain that rejects all `unsafe` Rust
2. prohibit `core::mem::forget`, `ManuallyDrop`, and related lifetime-bypassing operations
3. exclude unsupported kernel features such as `std`, dynamic allocation, floating point, SIMD, and `abort`
4. enforce these restrictions with compiler flags, lints, target features, and a no-std environment
5. expose eBPF helper functions through a trusted kernel crate with safe Rust wrappers and generated bindings
6. encode pointer and size relationships with generic types and const generics so helper calls receive compile-time-correct sizes
7. represent dynamically sized kernel memory as Rust slices, obtaining runtime bounds checks

The restriction is explicit: “Rex extensions are strictly written in safe Rust with selected features (unsafe Rust code is forbidden in Rex extensions).” (Section 1, p. 2). The kernel crate wraps unsafe kernel code and provides typed context, map, and helper interfaces. Generic helper adaptors obtain the size of a concrete type after monomorphization, so a pointer cannot be paired with a mismatched size. For dynamic packet data, a slice carries a runtime length.

Inference: these wrappers establish a boundary for kernel interactions. They do not establish application properties such as whether a packet policy implements its intended rules.

## technique 2: extended type safety for byte-to-struct casts

Use this when network code must reinterpret a byte stream as a typed header. The paper identifies reinterpretation casts as requiring checks beyond native Rust type safety.

Steps from Section 5.3 (p. 7):

1. define primitive scalar types that are safe cast targets
2. allow a target struct only when every member is one of those safe types
3. seal a `Rex::SafeTransmute` trait so extensions cannot implement it arbitrarily
4. use procedural macros to generate and enforce the cast interface at compile time
5. enforce that the target type fits the source memory boundary

Rex preserves two eBPF checks: no pointer may be fabricated from a scalar, and the target type must fit the memory region. The paper explains that mismatched scalar types can still cause logical errors but are not treated as memory safety violations under this restricted set.

Inference: a safe cast does not establish that the bytes represent the intended protocol field values; that remains application logic.

## technique 3: runtime panic cleanup and crash-stop isolation

Use this when a kernel extension can panic and must not leak locks, references, or map resources.

Steps from Section 5.5 (pp. 7–8):

1. save the previous stack pointer in per-CPU memory, switch to a dedicated stack, and set termination state
2. record helper-acquired kernel resources in a per-CPU buffer during execution
3. on panic, traverse the buffer and release recorded resources using kernel-crate cleanup code
4. skip user-defined `Drop` handlers during panic handling
5. transfer control to the kernel landing pad, which reports the error and sets a default error return code
6. return through the dispatcher to restore the old stack pointer and reset the context
7. remove the panicked extension, its used maps, and recursively remove other extensions sharing those maps

The paper states: “Rex implements a crash-stop failure model—a panicked extension is removed from the kernel.” (Section 5.5, p. 8). The authors explain: “This prevents extensions sharing the maps from running in a potentially inconsistent state—exception handling in Rex already ensures the kernel is left in a good state.” (Section 5.5, p. 8). During normal execution, RAII wrappers release resources through compiler-inserted drop calls at the end of object lifetimes (Section 5.4, p. 7).

## technique 4: hybrid stack safety and watchdog termination

Use this for bounded kernel stacks and to stop extensions that loop or run too long.

For stack safety, Rex computes total stack usage statically when the call graph has no indirect or recursive calls. Otherwise, it inserts a check before each call, requires each function to use less than one page (4K) of stack, and uses a dedicated eight-page per-CPU stack with a four-page extension threshold. The authors write: “Rex, therefore, takes a hybrid approach and selects between static and dynamic checks based on the situation.” (Section 5.6, p. 8).

For termination, Rex arms one high-resolution watchdog timer per CPU at boot and rearms it after each firing. Both the timer period and runtime threshold equal the default RCU CPU stall timeout. The handler compares the extension start time with the current time; if the threshold is exceeded, it overwrites the saved instruction pointer to enter the panic handler after the interrupt returns. A per-CPU flag tracks extension execution, helper or panic-handler execution, and a termination request. If a helper is running, Rex records the request and invokes the panic handler after the helper returns; it does not interrupt panic handling. A one-lock-at-a-time rule prevents lock-acquisition deadlocks within extensions; attempting a second lock acquisition triggers a Rust panic (Section 5.7, pp. 8–9).

Inference: watchdog termination is conditional on interrupt delivery and eventual return from helper functions. It is not a strict execution-time bound.

## evidence, denominators, and limits

The language-verifier-gap study inspected 72 commits from Cilium, Aya, and Katran; all 72 original programs were judged safe but rejected by the verifier. Workaround counts were 27 refactorings into smaller programs, 22 compiler-hint changes, 15 manual verification assists, 9 verifier-bug workarounds, and 1 reinvention of a library function. Section 3.1 (p. 3) states: “We also included two issues raised by BMC [51] and Electrode [100] in the discussion.” Inference: the Table 1 counts sum to 74, consistent with 72 commits plus two issues, but the paper does not explicitly map the two issues to table entries; the counts should not all be presented as fractions of 72 commits.

The BMC case study rewrites a complex eBPF cache as Rex-BMC. Rex-BMC has 326 lines of Rust versus 513 lines of C in eBPF-BMC, which was split into seven programs. At eight cores, Memcached reaches 365K requests/s, eBPF-BMC 1.92M, and Rex-BMC 1.98M; the paper reports speedups of 5.26× and 5.43× over Memcached. Empty-program runtime is 42.1 ± 4.1 ns for eBPF and 42.6 ± 5.8 ns for Rex. Spinlock acquire/release is 130.4 ± 20.3 ns versus 183.1 ± 27.5 ns. Recursive-call tests show Rex roughly 3× faster than eBPF tail calls, while eBPF helper inlining saves about 0.5 ns on array lookups and 1.2 ns on hash lookups relative to non-inlined eBPF. Rex adds another 2–4 ns over non-inlined eBPF because of wrapper code; static-variable access latency is almost the same in both systems (Section 7.3, pp. 11–12). The throughput results are from Section 7.2 (p. 11), the code sizes from Section 7.1 (p. 10), and the nanosecond measurements from Table 2 (p. 11). The server uses an AMD EPYC 7551P with 112 GB memory and Linux v6.11.0, with SMT and Turbo disabled. Inference: these measurements establish performance for the evaluated workloads and machine, not a universal overhead bound.

Rex's implementation includes 3.5K lines of kernel-crate Rust, 360 lines of unsafe Rust, and 2.2K lines of C kernel support. Its trusted computing base is explicit: “With Rex’s safety model, the TCB consists of the Rust toolchain, the Rex kernel crate, and the Rex runtime.” (Section 4, p. 5). Section 6 (p. 9) reports these implementation sizes. Rex does not target extensions executing in hard or non-maskable interrupts, which its watchdog cannot interrupt. Termination may also be delayed if another event has already interrupted the extension; Rex must wait for a timer interrupt that directly interrupts it (Section 5.7, p. 9). Rex prevents extensions from acquiring multiple locks, but deadlocks within kernel functions are outside its scope (Section 5.5, p. 8). Generated bindings require extensions to be rebuilt for each target kernel to account for ABI differences (Section 6, p. 9). Rex currently has no dynamic allocation (Section 8, p. 12) and no program nesting (Section 5.6, p. 8, footnote 3).

The usability evaluation uses a heuristic assessment and the authors’ experience implementing BMC (Section 7.1, pp. 9–10). Inference: this supports the specific code-simplification examples, but does not measure independent developer productivity or Verus proof effort.

## techniques for the catalog

- safe-subset kernel extensions — enforce a no-unsafe, no-std Rust subset and expose kernel helpers through typed wrappers
- typed helper bounds — use generic and const-generic types so pointer sizes and array lengths are fixed at compile time
- safe transmutation — seal a trait and permit byte-to-struct casts only for allowed scalar types or structs whose members are safe types
- panic resource cleanup — record helper-acquired resources per CPU and release them in a trusted panic handler
- hybrid stack and watchdog checks — combine static call-graph sizing with runtime stack checks and per-CPU timer termination
