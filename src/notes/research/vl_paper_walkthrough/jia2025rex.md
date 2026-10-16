# Safe and usable kernel extensions with Rex
(authored by agents unless marked 🧑)
Tag: `jia2025rex`, [paper](https://arxiv.org/abs/2502.18832)

## problem and claimed solution

Rex is a Linux kernel-extension framework designed to remove the mismatch between a safe source language and a separate bytecode verifier. eBPF compiles C or Rust to bytecode and then symbolically executes every path; safe programs can be rejected because of verifier limits, compiler/verifier disagreement, or verifier bugs. The paper calls this the language-verifier gap: “The language-verifier gap is a mismatch between developers’ expectation of program safety provided by a contract with the programming language, and the verifier’s expectation.” (Abstract, p. 1). Rex instead requires extensions to be written in a restricted safe Rust and uses a trusted Rex kernel crate plus runtime checks for properties that Rust does not enforce.

The safety target is the eBPF non-adversarial model: extensions are installed by trusted root users, and safety means preventing crashes, hangs, memory errors, resource leaks, and undefined behavior rather than defending against malicious code. Rex removes a separate load-time symbolic verifier. The authors state: “With Rex, safety properties are checked by the language compiler within the language contract.” (Section 1, p. 2). Inference: this is a different assurance tradeoff from Verus. Verus can prove explicit functional and safety contracts, whereas Rex delegates most language-level safety to Rust and trusts the compiler and kernel crate.

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

The restriction is explicit: “Rex extensions are strictly written in safe Rust with selected features (unsafe Rust code is forbidden in Rex extensions).” (Abstract, p. 1). The kernel crate wraps unsafe kernel code and provides typed context, map, and helper interfaces. Generic helper adaptors obtain the size of a concrete type after monomorphization, so a pointer cannot be paired with a mismatched size. For dynamic packet data, a slice carries a runtime length.

Inference: a Verus version would retain the safe wrapper boundary but add `requires` and `ensures` contracts for helper calls, plus lemmas about slice bounds and map ownership. A Rust type check does not prove application invariants such as packet-policy correctness. Verus `proof fn` code is erased and cannot replace Rex's runtime cleanup; the kernel crate and external functions would need trusted or modeled specifications.

## technique 2: extended type safety for byte-to-struct casts

Use this when network code must reinterpret a byte stream as a typed header. Native Rust type safety cannot prove that an arbitrary byte buffer has the target layout.

Steps from Section 5.3 (p. 7):

1. define primitive scalar types that are safe cast targets
2. allow a target struct only when every member is one of those safe types
3. seal a `Rex::SafeTransmute` trait so extensions cannot implement it arbitrarily
4. use procedural macros to generate and enforce the cast interface at compile time
5. rely on the type system to ensure that the target fits the source memory boundary

Rex preserves two eBPF checks: no pointer may be fabricated from a scalar, and the target type must fit the memory region. The paper explains that mismatched scalar types can still cause logical errors but are not treated as memory safety violations under this restricted set.

Inference: in Verus, model the byte buffer and target layout with a specification predicate and prove a conversion lemma before exposing the typed value. Verus cannot infer layout validity from a trait alone; the layout and endian assumptions must be stated. The Rex trait remains an implementation mechanism outside Verus's proof unless its code and contracts are verified.

## technique 3: runtime panic cleanup and crash-stop isolation

Use this when a kernel extension can panic and must not leak locks, references, or map resources.

Steps from Section 5.5 (pp. 7–8):

1. dispatch each extension on a dedicated stack and save the previous context
2. route a panic to a kernel-resident landing pad rather than user-space unwinding
3. record every resource obtained through a helper in a per-CPU buffer
4. on panic, traverse the buffer and release resources using kernel-crate cleanup code
5. do not run user-defined `Drop` handlers during panic handling
6. remove the panicked extension and recursively remove extensions sharing its maps

The paper states: “Rex implements a crash-stop failure model—a panicked extension is removed from the kernel.” (Section 5.5, p. 8). This avoids continuing with potentially inconsistent shared state. Inference: a Verus proof can show that normal paths release resources and that a cleanup routine preserves an abstract resource invariant, but panic delivery and kernel unwinding remain trusted runtime behavior unless modeled.

## technique 4: hybrid stack safety and watchdog termination

Use this for bounded kernel stacks and to stop extensions that loop or run too long.

For stack safety, Rex computes total stack usage statically when the call graph has no indirect or recursive calls. Otherwise, it inserts a check before each call, requires each frame to fit in one page, and uses a dedicated eight-page per-CPU stack with a four-page extension threshold. The authors write: “Rex, therefore, takes a hybrid approach and selects between static and dynamic checks based on the situation.” (Section 5.6, p. 8).

For termination, Rex arms one high-resolution watchdog timer per CPU. The handler compares the extension start time with the current time; if the threshold is exceeded, it redirects execution to the panic handler. Helper calls and panic handling defer termination to avoid interrupting kernel bookkeeping. A one-lock-at-a-time rule prevents deadlock; a second lock acquisition triggers a Rust panic.

Inference: Verus can prove loop termination with `decreases` measures and can specify stack/resource invariants, but it cannot by itself guarantee asynchronous watchdog delivery or interrupt behavior. Rex's runtime check is therefore complementary to a Verus proof, not replaced by it.

## evidence, denominators, and limits

The language-verifier-gap study inspected 72 commits from Cilium, Aya, and Katran; all 72 original programs were judged safe but rejected by the verifier. Workaround counts were 27 refactorings into smaller programs, 22 compiler-hint changes, 15 manual verification assists, 9 verifier-bug workarounds, and 1 reinvention of a library function. These counts sum to 74 because the paper also includes two additional issues from BMC and Electrode while describing 72 commits; the denominator distinction is not fully reconciled.

The BMC case study rewrites a complex eBPF cache as Rex-BMC. Rex-BMC has 326 lines of Rust versus 513 lines of C in eBPF-BMC, which was split into seven programs. At eight cores, Memcached reaches 365K requests/s, eBPF-BMC 1.92M, and Rex-BMC 1.98M; the paper reports speedups of 5.26× and 5.43× over Memcached. Empty-program runtime is 42.1 ± 4.1 ns for eBPF and 42.6 ± 5.8 ns for Rex. Spinlock acquire/release is 130.4 ± 20.3 ns versus 183.1 ± 27.5 ns. Recursive-call tests show Rex roughly 3× faster than eBPF tail calls, while map lookups are about 0.5 ns slower for array maps and 1.2 ns slower for hash maps when eBPF inlines helpers. These are the stated machines and workloads, not universal performance guarantees.

Rex's implementation includes 3.5K lines of kernel-crate Rust, 360 lines of unsafe Rust, and 2.2K lines of C kernel support. Its trusted computing base is explicit: “The TCB consists of the Rust toolchain, the Rex kernel crate, and the Rex runtime.” (Section 4, p. 5). Rex excludes hard-interrupt programs, may delay termination when another interrupt hides registers, and cannot recover a deadlock inside a helper that never returns. It also trusts generated kernel bindings and ABI compatibility for each Linux version.

Inference: for agent-written verified Rust, Rex reduces verifier-specific code churn but creates a large trusted runtime and compiler boundary. A product using Verus should verify extension logic and wrapper contracts while treating the kernel crate, interrupts, panic path, and Rust compiler as explicit assumptions. Rex's qualitative code-cleanliness result does not show that Verus proof effort is lower; a measured Verus port would need proof lines, trusted code, failed obligations, and runtime overhead with denominators.

## prior work VL should not redo

Rex already demonstrates safe-Rust kernel wrappers, typed helper interfaces, sealed transmute traits, panic cleanup, hybrid stack checks, watchdog termination, and a BMC port with performance measurements. Inference: VL should avoid claiming that removing a verifier automatically removes the trust boundary. A useful extension would combine Verus contracts with Rex-style runtime limits and report which safety properties are statically proved, which are dynamically enforced, and which remain trusted.

## techniques for the catalog

- safe-subset kernel extensions — enforce a no-unsafe, no-std Rust subset and expose kernel helpers through typed wrappers
- typed helper bounds — use generic and const-generic types so pointer sizes and array lengths are fixed at compile time
- safe transmutation — seal a trait and permit byte-to-struct casts only for recursively safe target types
- panic resource cleanup — record helper-acquired resources per CPU and release them in a trusted panic handler
- hybrid stack and watchdog checks — combine static call-graph sizing with runtime stack checks and per-CPU timer termination
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
