# Verifying Device Drivers with Pancake
(authored by agents unless marked 🧑)
Tag: `zhao2025verifying`, [paper](https://arxiv.org/abs/2501.08249)

## scope and result

The paper verifies a 1 Gb/s Ethernet driver for LionsOS, written in Pancake and compiled to machine code by a verified CakeML-derived compiler. A Viper front-end translates annotated Pancake into Viper intermediate language (IL), where Silicon performs automated deductive verification. The design targets single-threaded, single-purpose drivers and models hardware and OS interfaces as explicit Viper contracts. The authors report a 411-line Pancake driver, 558 lines of Pancake annotations, a 391-line Viper device model, and a 298-line Viper OS-interfacing model (Table 1, p. 8).

The paper's motivation is an end-to-end semantic gap: “This guarantees that the semantics of drivers and other systems code written in Pancake, will be preserved at the binary level.” (section 1, pp. 1–2). It also states the practical cost: “The verification of our Ethernet driver took around three person-months.” (section 1, p. 2). The compiler and source verification are separate obligations: “incorrect source + verified compiler = incorrect machine code” (section 2.5, p. 6). Section 6.1 qualifies the end-to-end claim: the transpiler remains unverified, the compiler theorem covers only the main entry point, and no unified theorem connects the driver verification to the binary.

## technique 1: choose a verification-oriented systems language and driver shape

What it is. Pancake is a small unmanaged imperative language between C and assembly. It has machine words, code pointers, and structs, static allocation, no malloc/free, no static type system, and a simple formal semantics. The driver is single-threaded and single-purpose. The authors cite this shape as a way to remove concurrency bugs and simplify proofs; Pancake deliberately has no concurrency primitives.

When to use it. Inference: use this design when a low-level component needs direct hardware access, predictable execution, and a small language semantics that can be connected to a verified compiler. Single-threaded decomposition is suitable when the OS architecture permits one producer or consumer per queue.

How to do it.

1. Define the driver as a single-purpose component with explicit entry points and shared-memory operations.
2. Use Pancake's direct machine-word and static-memory operations for hardware-facing code.
3. Express contracts as annotations on functions and loops. Listing 1 uses `requires`, `ensures`, loop `invariant`, and `assert` annotations (p. 3).
4. Compile with the verified Pancake/CakeML pipeline so source observable I/O traces are preserved at machine code, given sufficient stack space. The compiler predicts a sufficient maximum stack size when recursive calls occur only in tail position (section 2.3, pp. 4–5). The top-level theorem currently covers only the main entry point, although exported driver functions support re-entry (section 2.4, p. 5).

Verus form. Inference: implement the driver in supported Rust, write `requires`/`ensures` contracts and loop invariants, and use proof functions and lemmas for the state facts. Verus has ownership and borrowing constraints that Pancake lacks, so raw device access needs a Verus model rather than copied Pancake syntax. The paper's verified compiler chain has no direct Verus equivalent.

Assumptions and limits. Pancake has no concurrency primitives, and the driver has no internal concurrency. The authors motivate their choice of language by stating: “However, Rust is a complex language with no authoritative formal semantics, putting any verification on soft foundations.” (section 2.1.1, p. 3). Inference: this comparison does not measure Verus's actual supported subset.

## technique 2: transpile annotated source to Viper and control SMT encodings

What it is. The front-end extracts Pancake's AST, including annotations and device-model hooks, and translates variables, values, memory locations, and assertions into Viper IL. Silicon then symbolically executes the IL. The compiler ignores annotations; only the verification transpiler preserves them.

How to do it.

1. Parse the annotated Pancake program and extract its AST (section 3, p. 6).
2. Model stack variables without memory-access permissions or invalid-reference checks, because Pancake forbids pointers to them. Encode other non-shared, non-device memory as an array of words, with permissions for the regions each function accesses (section 3.2, p. 7).
3. Encode machine words as Viper integers, and reject arithmetic overflow by checking bounds after unrolling operations. This avoids mixing modular arithmetic with Viper's nonlinear theories, at the cost of disallowing intended overflows (section 3.1, p. 6).
4. Rewrite common bit-vector operations, such as `x&255` to `x%256`, and isolate remaining device bit operations behind device-interface methods to improve query performance (section 3.1, pp. 6–7).
5. Use iterated separating conjunctions for annotated memory permissions (section 3.2, p. 7).

The paper's source-level contract example includes `requires mem_access(N)`, `ensures mem_access(N)`, `ensures N == old(N)`, loop invariants, and `assert x <= 42` (Listing 1, p. 3). Its concrete Viper device method uses `requires addr == (REG_BASE + EIR_OFFSET)`, `requires value == IRQ_MASK`, `requires valid_device(device)`, and `ensures valid_device(device)` (Listing 3, p. 9).

Verus form. Inference: use Verus `requires` and `ensures` on Rust functions, `invariant` clauses on loops, and ghost state or tracked permissions to encode memory regions. Keep bit-level device operations behind specification lemmas or external models whose contracts state valid addresses and values. Verus's integer arithmetic and bit-vector support must be checked in its own verifier; Pancake's “reject overflow” policy cannot be assumed automatically.

Evidence and failure. The authors explicitly optimize for queries that verify in seconds or minutes but leave proof of the encoding's soundness to future transpiler verification (section 3, p. 6). A bad translation could yield a true Viper query for a false Pancake assertion (section 6.1, p. 11).

## technique 3: model shared and device memory as contract methods

What it is. Shared-memory loads and stores are special Pancake operations. Instead of modeling mutable device memory as an array whose contents may change arbitrarily, the front-end maps address ranges to Viper methods declared in an external device model. The methods specify allowed addresses, values, return ranges, and device invariants. The driver source remains unchanged when the model is added: top-level annotations select which method handles each address range.

How to do it.

1. Declare each hardware register or shared-memory range in a Pancake annotation such as `shared rw u32 EIR[REG_BASE + EIR_OFFSET]` (Listing 3, p. 9).
2. Define a Viper method for each operation. Use method-specific `requires` clauses for address/value constraints and a device-wide invariant such as `valid_device(device)`.
3. Use `ensures` to preserve the device invariant and constrain nondeterministic return values, for example `bounded32(retval)` for a 32-bit load (section 4.1, p. 8; Listing 3, p. 9).
4. Make the verifier reject a load/store whose address is not covered by a declared interface (section 4.2, p. 9).
5. For neighboring OS components, supply a separate Viper model of queue protocols and assumptions. The verifier then checks the driver against arbitrary allowed neighboring states rather than one fixed trace (section 3.3, p. 7; section 4.3, p. 9).

Verus form. Inference: define a Rust trait or ghost specification for each register range, with proof functions establishing address and value preconditions and postconditions preserving a `valid_device` predicate. Model nondeterministic reads as arbitrary values constrained by an `ensures`-like contract. Keep hardware calls behind an `external_body` only when the external operation is explicitly part of the trusted model; the paper's trust discussion shows why such a boundary must be recorded.

## technique 4: verify device-interface compliance

The driver must access only RX/TX descriptor rings and documented registers, write permitted bit patterns, and preserve a device invariant. The model decomposes each ring into sequences of addresses, lengths, and bitfields. Viper uses integers for most reasoning and converts to bitvectors only where bit-level operations are needed, reducing solver complexity (section 4.1, p. 8; section 4.2, p. 9).

Apply it as follows:

1. Define address-range annotations for every hardware interface.
2. Define method preconditions for exact register addresses and allowed values.
3. Define `valid_device` to require valid descriptor bitfields, 32-bit byte-aligned data pointers, and 16-bit lengths (section 4.2, p. 9).
4. Put `valid_device` in both method `requires` and `ensures`. Preconditions require the driver to preserve validity; postconditions assume the hardware maintains the same invariant (section 4.2, p. 9).
5. Verify the whole driver; the verifier rejects uncovered addresses and checks that calls satisfy the model's address and value requirements.

Verus form. Inference: represent descriptor rings and `valid_device` as ghost predicates over Rust sequences or arrays. Register wrappers can require exact addresses and allowed masks, and ensure the invariant remains true. Verus proofs must connect those wrappers to the actual unsafe memory access and its ownership model.

## technique 5: verify OS communication protocols

LionsOS uses bounded single-producer/single-consumer queues and semaphores. For consuming metadata buffers, the driver requests OS wake-up signals when hardware rings have vacancy. For providing buffers, it notifies the OS's semaphores if and only if the OS explicitly requested a signal and the driver changed the queue state. It clears signal requests after notification (section 4.1, p. 8). The verification models queues nondeterministically and assumes the neighboring component also obeys the protocol (section 4.3, p. 9).

Steps:

1. Specify shared queue address ranges and operations with annotations.
2. Give the neighboring OS model contracts for permitted queue and semaphore transitions.
3. Verify each driver path against all states satisfying those contracts, rather than fixed queue contents.
4. Check that notifications, requests, and queue-state changes satisfy the protocol equivalences listed in section 4.1.

Verus form. Inference: encode the queue protocol as a state machine in ghost state and prove each executable transition preserves the protocol invariant. Verus's state-machine or tracked-permission patterns can express ownership of queue regions, but the exact LionsOS model must be written.

## technique 6: prove data integrity and transfer completeness

The authors track packet addresses and lengths across conversions between OS metadata and hardware descriptors. For each transfer path, assertions check preservation of these fields. Listing 4 gives the shape: after dequeue and descriptor update, assert `device.hw_ring_tx[hw_tail].data_addr == buffer.data_addr` and the corresponding length equality (section 4.4, pp. 9–10). They also check that SPSC queue operations align with descriptor-ring state changes to rule out driver-internal data loss. The driver does not access or map packet contents (section 4.1, p. 9).

Verus form. Inference: use `assert` and lemmas over sequence indices to prove address and length preservation. A loop invariant should relate queue counts to ring occupancy and preserve the mapping for every in-flight buffer. This requires an explicit model of DMA ownership; the paper only models the device interface and does not prove the hardware itself.

## technique 7: enforce region isolation and memory safety

The driver partitions global memory into RX and TX regions and uses Viper permissions to ensure TX code cannot access RX state and vice versa. This is a separation-logic-like discipline (section 4.5, p. 10). It establishes memory safety and access isolation for the modeled regions.

Verus form. Inference: use ownership and borrowing to separate RX and TX state, and ghost permissions or tracked tokens when aliasing is unavoidable. Prove that each function's `requires` grants only the region it may touch and that `ensures` returns the permission without duplication.

## evidence and performance

The verification workflow is: annotate Pancake, transpile to Viper, supply device and OS Viper models, and run Viper, which returns proved, falsified, or timeout (section 4.1, p. 8). Table 1 also gives 351 lines for the original C driver. Compilation takes seconds; full driver verification takes around 20 minutes on a typical laptop. When verified separately, the device model takes 10 minutes and driver functions around 1 minute each (section 5, p. 10). The experiment runs on an AVnet MaaXBoard with an NXP i.MX8MQ, four Cortex-A53 cores, fixed 1 GHz clock, 2 GiB RAM, and a 1 Gb/s NIC. An external load generator measures throughput and latency while a LionsOS client echoes received packets. The authors report that received throughput equals requested load for both drivers. Pancake uses about 10% more driver CPU; the whole-system CPU difference becomes unnoticeable, and latency differences fall within result variance (section 5, pp. 10–11). Inference: this comparison of one driver and board does not establish universal performance parity.

## techniques for the catalog

- verification-oriented driver design: use a small, single-threaded systems language and explicit Hoare annotations
- annotated-to-IL verification: transpile source contracts to Viper and control arithmetic and bit-vector encodings for solver performance
- device contract modeling: map register ranges to Viper methods with address, value, nondeterminism, and invariant clauses
- OS protocol modeling: verify queue and semaphore behavior against nondeterministic neighboring-component contracts
- data-integrity invariants: assert address and length preservation across queue and hardware descriptor paths
- region isolation: use permissions to restrict RX and TX state to their responsible code paths
- verified compilation: carry source observable behavior to binary through the CakeML-derived verified compiler
