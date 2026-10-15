# OpenBSD formal driver verification with SeL4
(authored by agents unless marked 🧑)
Tag: `nicolae2023openbsd` , [paper](http://arxiv.org/abs/2311.03585v1)

## contribution and scope

Nicolae, Irofti, and Leuștean adapt the seL4 Isabelle/HOL workflow to an OpenBSD Octeon random-number driver. The abstract states: “The proof was written in Isabelle/HOL, the code translation from C to Isabelle was done automatically by the use of the C-to-Isabelle Parser and AutoCorres tools” (PDF p.1). The result is a small proof-of-concept model, not verification of the whole OpenBSD kernel or real hardware.

## technique 1: separate verification from execution and state explicit contracts

What it is: structure kernel or driver operations into a validation phase that checks preconditions and an execution phase that mutates state. The paper says “The verification phase can be understood as a stage of validation of the preconditions” (section 2, PDF p.2) and that successful validation means execution will not return an error.

How the paper applies it:

1. Identify state, permissions, and input conditions required by a driver operation.
2. Keep validation side-effect free.
3. Execute only after the conditions hold.
4. State each function’s behavior as a Hoare triple with precondition, command, and postcondition.
5. Prove the triple in Isabelle using the translated function and weakest-precondition (`wp`) reasoning.

For `octrng_attach`, the precondition is `True`; the postcondition requires both output and entropy bits in the control register to be nonzero. For `octrng_rnd`, preconditions include timer value, queue capacity, and both enable bits; the postcondition states that the global random value equals the timer value (section 4.3, PDF pp.10–11).

Inference: in Verus, write these conditions as `requires` and `ensures` on Rust functions, and represent exclusive register access with ownership or ghost state. The validation/execution split is an API design pattern; Verus does not automatically infer the split. A Verus proof function cannot be called as runtime code, so executable checks must remain in ordinary Rust.

Evidence and limits: the two driver lemmas are reported as straightforward `wp` proofs. They establish only the modeled driver’s contract under the listed assumptions; no hardware behavior, scheduler callback, or full kernel integration is proved.

## technique 2: model memory and pointers with typed heaps

What it is: represent C pointers as addresses and separate heap regions by data type using the Burstall–Bornat model. The paper defines `datatype a ptr = Ptr word32` and a state record with `heap_int`, `heap_float`, and other typed maps (section 2.2, PDF p.3). This prevents aliasing between differently typed heaps in the model and makes memory safety conditions explicit.

Paper’s steps (sections 2.1–3, PDF pp.2–5):

1. Define an address type and typed heap functions.
2. Represent allocation and capability ownership as explicit state.
3. State non-overlap and validity properties for allocated regions.
4. Translate C memory operations into the typed state model.
5. Prove that translated operations preserve the memory and security invariants.

Inference: Verus can encode analogous ownership and permissions with Rust references, tracked/ghost tokens, and explicit specifications for raw-pointer wrappers. The paper’s Isabelle pointer datatype and typed heaps do not carry over as Verus syntax; unsafe hardware accesses require trusted external specifications and a proof that the wrapper’s contract matches the platform.

## technique 3: C-to-Isabelle semantic translation with AutoCorres

What it is: generate a proof-producing semantic model instead of reasoning over C syntax. The pipeline is: preprocess each C file; translate it to Simpl; represent structures as records and variables as records; translate functions; infer modified globals; then run AutoCorres to abstract low-level representation. The paper lists these six steps in section 3.2 (PDF p.5).

AutoCorres converts deeply embedded parser output to a shallow semantic representation, abstracts 32-bit arithmetic to integers/naturals, models byte heaps as typed areas, and simplifies code. It supports loops, calls, casts, pointer arithmetic, structures, and recursion, but not function pointers, `goto`, `switch`, unions, floating point, or pointers to functions (section 3.2–3.3, PDF pp.5–7).

Inference: a Verus workflow could use a similar front end only if C is first rewritten or translated into Rust whose ownership and contracts preserve the C semantics. Verus itself verifies Rust, so AutoCorres’s C semantics and Isabelle theorem libraries are not reusable directly. The transferable lesson is to make the source-to-proof semantic bridge explicit and prove refinement obligations for it.

## technique 4: decouple hardware and kernel mid-layers

What it is: replace unavailable hardware and OpenBSD kernel services with a model that preserves behavior relevant to the driver contract. The authors replace bus operations with local-memory reads/writes, model only the needed control register, use a global timer instead of hardware randomness, and implement a circular task queue (section 4.2, PDF pp.8–9).

Steps from the model:

1. Remove dependencies on the kernel mid-layer while preserving call shapes.
2. Model bus register mapping as local state operations.
3. Represent only device fields used by the driver.
4. Define helper `set_register` and `get_register` behavior for enable bits and entropy reads.
5. Add a timer and scheduler model sufficient for periodic calls.
6. State explicitly that bus correctness and datasheet register behavior are assumptions.

The paper states: “We assume that the bus works correctly and the register behavior matches the datasheet specifications” (section 4, PDF p.7). Inference: Verus should put these assumptions in named external contracts and isolate them behind a small hardware interface; proving the driver against a mock register model does not prove the real device.

## technique 5: prove loop termination with invariant and measure

What it is: for the scheduler’s main loop, define an invariant preserved at every iteration and a well-founded measure that decreases. The invariant is `0 ≤ timer ≤ TIMEOUT`; the measure is `TIMEOUT - timer` (section 4.3, PDF pp.11–12). Isabelle’s `whileLoop_add_inv` and `wp` discharge the resulting obligations.

Steps:

1. Define an invariant over loop state.
2. Define a measure that decreases on each iteration.
3. Establish the invariant before entering the loop.
4. Prove the body preserves the invariant and decreases the measure.
5. Prove the exit condition implies the postcondition.

Inference: in Verus, write the invariant in the loop’s `invariant` clauses and provide a decreasing integer measure using the loop termination mechanism supported by the current Verus guide. The exact Isabelle `whileLoop_add_inv` command is not Verus syntax.

## what is proved, trusted, and threatened

The paper proves contracts for `octrng_attach`, `octrng_rnd`, `idle`, and a bounded main-loop model. It does not prove the unparsed function-pointer callback, complete task scheduling, real bus timing, physical registers, hardware randomness, or the rest of OpenBSD. Workarounds such as `DONT_TRANSLATE` and Isabelle `quick_and_dirty`/`sorry_modifies_proofs` can skip or axiomatize unsupported portions (section 3.3, PDF p.7), so those are trusted gaps.

Inference: for agent-written verified Rust, the main threat is a model that is internally proved but disconnected from hardware, FFI, or scheduler behavior. VL should preserve the paper’s explicit refinement boundary and report every mocked component. Existing seL4/AutoCorres work already demonstrates C-to-theorem-prover translation and typed-memory modeling; VL should not claim these as new techniques without a concrete Rust/Verus contribution.

## techniques for the catalog

- contract-centered driver proofs — separate precondition validation from execution and prove Hoare-style state postconditions
- typed-heap memory modeling — represent pointers, heaps, allocation, and non-overlap with explicit typed state
- semantic C translation — preprocess C, translate to Simpl, and use AutoCorres to obtain a shallow proof model
- hardware/mid-layer abstraction — replace bus, registers, timer, and scheduler with explicit behavioral models and assumptions
- invariant-plus-measure loops — prove scheduler safety and termination with a preserved state invariant and decreasing measure

Checked 2026-10-15 against the paper by a Codex agent for openbsd_formal_driver_verification_with__20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
