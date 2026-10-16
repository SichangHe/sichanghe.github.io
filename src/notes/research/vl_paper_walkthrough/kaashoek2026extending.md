# Extending concurrent separation logic to the hardware level to verify the xv6 OS kernel on RISC-V with AI agents
(authored by agents unless marked 🧑)
Tag: `kaashoek2026extending`, [paper](http://arxiv.org/abs/2609.04043v2)
## verified object and trust boundary
MachCSL extends Iris-style concurrent separation logic to Sail’s sub-instruction RISC-V model. The verified artifact is the xv6 ELF and `fs.img`, not a source-level C theorem: “Grounding all specifications and proofs in machine code allows MachCSL to factor out the compiler, linker, assembler, and other parts of the build process from the trusted computing base.” (Section 4.1, p.7). The kernel theorem quantifies over interleavings of HARTs, devices, interrupts, DMA, and power cycles, and implies process isolation, crash safety, and hardware safety. The paper reports 6,593 C/assembly lines, 8,697 instructions, about 1.5 million Rocq proof lines, 93 days, ten xv6 bugs, and one Sail bug (Sections 1–2, pp.2–3).

Inference: VL can borrow the separation between a compiled verified artifact and its source build, but a Verus project normally verifies Rust functions rather than a whole ELF against a hardware model. The machine-code boundary is therefore a design option, not a drop-in Verus feature.

## technique 1: ownership and framing for concurrent local proofs
Use ownership when many HARTs or devices share state. A points-to resource such as `a ↦Mem v` gives one proof exclusive access; read-only kernel text is persistent and duplicable. The paper’s method is:

1. Assign each register and memory cell a resource; give a function only the registers and cells its instructions access (Section 4.2, p.8).
2. Represent a function specification with chained separation implications: caller supplies PC, argument registers, return address, code, lock invariant, and continuation (Figure 7, p.9).
3. Prove each instruction or function with only named resources. Frame all disjoint resources through the proof, preserving them unchanged (Section 4.6, pp.10–11).
4. Compose acquire, critical body, and release sequentially. Acquire transfers the protected predicate to the body; release returns it to the lock invariant (Section 4.1, p.7; Figure 4).

The paper summarizes the concurrency benefit: “The key benefit of CSL in this example is that the proof of f ensures that f executes correctly, even though the proof never had to explicitly consider the possibility of another core trying to acquire the lock while f runs, an interrupt arriving just as acquire starts executing, devices performing DMA accesses to memory, etc.” (Section 4, p.7). Framing is analogous to a Rust mutable borrow, but it also composes asynchronous device and interrupt proofs.

Inference: Verus’s `requires`/`ensures` and mutable borrowing provide part of this discipline; ghost state and proof functions encode abstract resources. Verus does not natively provide Iris’s separation connectives or resource transfer, so an explicit ghost ownership map and invariants are needed.

## technique 2: continuations and weakest preconditions for an infinite machine
Hardware does not return from a function in the semantic model; it repeatedly fetches, decodes, executes, retires, and handles traps. MachCSL therefore uses `wp CpuLoop`, a weakest-precondition resource for safe continuation of the infinite CPU loop; the paper explains: “One implication of the wp CpuLoop encoding is that there are no postconditions, because the CPU is never done.” (Section 4.3, p.9) and function specifications take a continuation obligation for the return state (Section 4.3, pp.9–10). Instruction-level Sail steps use `wp Sail(m){Φ}` with an explicit postcondition; `CpuLoop` has no postcondition because execution is unbounded (Section 5.2, pp.14–15).

Apply it by proving each function’s instructions preserve safety and by requiring the caller to establish `wp CpuLoop` after every return address. The AMOSWAP proof opens and closes the lock invariant through coupled `⇛` callbacks, returning either no protected predicate or the acquired predicate depending on the old lock value (Sections 4.5–4.7, pp.10–12). The adequacy theorem then converts all CSL WPs into a statement over actual model executions and explicitly initializes every invariant (Section 5.3, p.15).

Inference: A Verus encoding can use recursive `spec fn` predicates for continuation safety and loop invariants, with `proof fn`s establishing preservation. It cannot model an unconstrained infinite execution directly without a finite-step relation and induction; `old` values belong in postconditions, not as an invented Verus construct.

## technique 3: hardware-specific ownership abstractions
MachCSL distributes responsibility for machine state. Each HART register, TLB, page-table root, trap vector, and timer has an owner predicate; immutable configuration becomes persistent. Shared memory under TSO uses write histories and per-HART timestamps; a consistent-memory points-to fact is derived when a lock establishes the needed ordering (Section 5.1, pp.13–14). Virtual memory resources combine a physical points-to fact with ghost state mapping virtual to physical addresses. Device state is owned by one invariant per UART, PLIC, and disk; MMIO specifications open the device invariant and describe each register’s effect (Section 5.1, p.14).

The page-table proof handles A/D-bit writeback by allowing the page-table invariant to quantify over arbitrary accessed/dirty bits. Translation tiers distinguish identity mappings valid during boot from mappings installed by the kernel page table, and every virtual-memory resource carries a tier no higher than the current HART’s tier (Section 6.2, pp.17–18). During user/kernel page-table switching, the proof requires the TLB to contain only mappings common to both tables between the two `sfence.vma` operations (Section 6.2, p.18).

Inference: For VL, model abstract addresses and permissions in ghost maps and connect them to Rust slices or page-table representations with explicit invariants. The tier idea is reusable for initialization phases; the exact Sail/TLB model is outside ordinary Verus libraries.

## technique 4: agent-assisted proof maintenance
The authors used Claude Code to write proofs and intermediate specifications after designing MachCSL abstractions themselves. Machine checking allowed them to avoid inspecting generated proof text; agents also repaired pervasive proof shifts after recompilation changed binary offsets (Section 4.8, p.12). The paper reports that the proof covers safety but not liveness or non-interference, and trusts Rocq plus Sail/interconnect/device models (Section 1, pp.3–4). It further warns that the theorem is only as meaningful as its precise trace statement.

Inference: This is a direct VL workflow: have agents edit proof files, run Verus, preserve compiler diagnostics, and rerun after code generation changes. It is unsafe to treat a passing proof as evidence for properties outside the stated theorem or to trust agent-written specifications without review.

## evidence and what remains open
MachCSL found ten xv6 bugs and one Sail bug while proving a theorem about all modeled interleavings. Its model assumes TSO with load-load reordering and excludes liveness and non-interference; build tools and external hardware remain outside the theorem. The application theorem says `echo hello world` has only the specified output, but safety permits executions that power off or fail in explicitly allowed ways (Section 2, pp.3–4).

Inference: The threat to a product of agent-written verified Rust is high for low-level concurrency and specification complexity: this paper demonstrates that agents can maintain million-line machine-checked proofs when humans design the abstractions. The main reusable work is ownership/framing, explicit continuation safety, hardware-state invariants, and adequacy; VL should not redo generic spinlock examples without connecting them to a concrete artifact and threat model.

## techniques for the catalog
- ownership and framing — compose per-function proofs by transferring protected resources and preserving disjoint state
- continuation weakest preconditions — specify safe continuation of an infinite CPU loop instead of ordinary postconditions
- hardware-state invariants — assign registers, TLBs, devices, DMA, and page tables explicit ownership and invariants
- tiered translation abstraction — index virtual-memory facts by initialization regime and current HART capability
- adequacy bridge — initialize every invariant and connect CSL proofs to concrete machine executions
- agent proof maintenance — use machine checking and diagnostic reruns to repair generated proofs after binary changes

## additional proof patterns in xv6
The paper applies the same resource method to several difficult cases. Interrupts use `sie_cap_gpr` carrying an enabled flag, stack budget, register map, and trap-vector continuation; this permits an inductive loop over arbitrary interrupts and register migration across HARTs (Section 6.1, pp.16–17). Page-table invariants permit arbitrary A/D-bit writeback while preserving the logical mapping (Section 6.2, p.17). Context switching stores a `wp CpuLoop` in a valid context so a scheduler can resume a preempted thread (Section 6.3, p.18).

Lock specifications track interrupt-disable depth and enforce CPU-local release, rank locks to prevent recursive/conflicting acquisition, make dynamically allocated pipe invariants cancellable once reference count reaches zero, and distinguish blocking from non-blocking sleeplock acquisition using ghost holder counters (Section 6.4, pp.19–20). The allocator has a counted boot regime and a duplicable concurrent regime; `kfree` accepts ownership without requiring stable TSO values (Section 6.5, p.20). File-reference slots bound refcount increments and prevent overflow (Section 6.6, p.20). The file-system proof separates durable `D` and in-memory `M` states, uses write-ahead-log permits threaded across sector writes, tracks transaction block sets for log absorption, and gives each buffer an invariant plus fractional reference-count ghost state (Section 6.7, pp.21–23). Link-count ghost fragments make global directory consistency local to inode invariants; stronger `iget` premises expose real xv6 bugs (Section 6.7, p.23).

Inference: These patterns suggest a VL catalog should index proof obligations by lifetime (boot versus concurrent), ownership transfer (lock, device, crash), and abstraction level (physical bytes versus ghost logical state), not only by API name.
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
