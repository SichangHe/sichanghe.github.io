# Toward the Verification of a Simple Hypervisor
(authored by agents unless marked 🧑)
Tag: `dahlin2011hypervisor`, [paper](https://doi.org/10.4204/EPTCS.70.3)

## artifact and proof target
MinVisor is a small Type-I x86 hypervisor that protects its own memory from a malicious guest. The authors say they have “worked largely bottom up” (Section 2, p. 29) and prove properties at the assembly level: “Functional segments of the MinVisor C code base are translated into Y86 assembly, and verified with respect to the Y86 model” (Abstract, p. 28). The initial target is the code that sets up nested page tables, which the authors call “critical to allow MinVisor to protect itself from a malicious guest” (Section 2, p. 29); protected pages are marked not present and the rest of memory is identity-mapped (Section 5, p. 34).

The first reusable technique is a deliberately small executable model (Sections 2 and 4, pp. 29–34). Instead of waiting for a complete x86 model, extend ACL2's Y86 with CR3, paging, guest/supervisor mode, new registers and instructions, and nested page tables. The resulting Y86++ memory is an association list from 32-bit addresses to bytes. Build an ACL2 assembler for convenience, but verify the binary, not the assembler output: “Our proof is at the level of the binary; its validity does not depend on the assembler” (Section 4.1, p. 33). Inference: this isolates the proof from compiler and assembler claims, while leaving the hand translation from x86 to Y86++ as an engineering assumption.

The second technique is compositional cutpoint verification (Section 5, pp. 34–37). The user supplies the interpreter for the machine language (here Y86++), the precondition, and the expected state modification, plus loop invariants for code with loops (Section 5.2, p. 36). ACL2 macros from Matthews et al. generate the verification conditions; ACL2 then dispatches them (Section 5, p. 34). The method is compositional: a subroutine's correctness is proved once, not at each call site (Section 5, p. 34). For `create_nested_pt`, specify initial state `S0`, terminating state `S1`, and the desired page-table effect. Its ten preconditions are: well-formed initial state; code loaded at a specified location; machine poised to execute `create_nested_pt`; paging off; code, stack, and tables disjoint; tables 4-KiB aligned; protected region 2-MiB aligned; nonzero protected size a multiple of 2 MiB; nonwrapping stack; and all addresses fitting 32 bits (Section 5.1, p. 35).

The two top-level facts, proved assuming paging is turned on and CR3 points to the tables in S1, are: if `addr` is disjoint from the protected region, `(va-to-pa addr S1)` returns `addr`; if it is not disjoint, `(va-to-pa addr S1)` signals a page fault (Section 5.1, p. 35). `create_nested_pt` calls three subsidiary functions: `init_pdpt` (top-level page directory pointer table), `init_pdts` (the four second-level page directory tables), and `sec_not_present` (zeroes the entries of the protected region). Section 5.2 details only the theorem for `init_pdts`; the paper does not show the per-function theorems for the other two or their composition. The ACL2 macro call for `init_pdts` is:

```lisp
(defsimulate+ y86-step :run y86 :inmain in-init_pdts
 :cutpoint init_pdts-cutpoint-p :assertion-params (s0 s1)
 :precondition init_pdts-pre :assertion init_pdts-assertion :modify init_pdts-modify
 :exitsteps init_pdts-exitsteps
 :exists-next-exitpoint init_pdts-exists-next-exitpoint
 :next-exitpoint init_pdts-next-exitpoint
 :correctness-theorem init_pdts-correct)
```

The generated theorem `INIT_PDTS-CORRECT` states that, under the precondition and existence of a next exit point, the next exit-point state is outside `IN-INIT_PDTS` and equals `INIT_PDTS-MODIFY` of the state (Section 5.2, pp. 36–37). `INIT_PDTS-MODIFY` specifies all changes to registers, flags, memory and other components; the authors call it “tedious to construct and error-prone” (p. 36) and suggest wormhole abstraction or “read over write” theorems as alternatives. The paper says: “This theorem is proved mechanically by ACL2” (Section 5.2, p. 37). The proof required “many subsidiary lemmas and enhancements to the underlying libraries”, including a library for disjoint memory regions; termination was not yet considered (p. 37).

## Verus form and use
Inference: represent the page tables as a Rust map or fixed array and write executable initialization functions. State the ten preconditions with `requires`; state identity translation and fault behavior with `ensures`; use `invariant` loop clauses for table-index loops; use `assert` and proof functions for disjointness and alignment lemmas. Inference: a Verus proof should verify the actual Rust implementation, whereas this paper proves a hand-translated Y86++ binary and therefore cannot transfer its theorem automatically to Rust or x86. Inference: the cutpoint's effect function (`INIT_PDTS-MODIFY`) maps naturally to postconditions describing changed entries and, if stated, unchanged memory; the paper's own frame-condition formulation is only proposed as future work (p. 36). Do not write `invariant(...)` as a call, `modifies` as a made-up clause, or a run-time call to a proof function; those are not Verus forms documented in the project notes.

Inference: use this method when the security property is about concrete machine state and a full high-level model would hide aliasing, paging, or instruction effects. Inference: it is less suitable when compiler translation, hardware behavior, or unmodeled faults dominate the claim. The authors explicitly note that the Y86++ proof has not established equivalence to x86: “That claim has not been formally established” (Section 4.2, p. 34).

## evidence, trust, and threat
The proved fragment establishes page-table effects under the ten assumptions, not full hypervisor correctness. The running artifact was not tested on real hardware (Section 3, p. 30), and page faults are not yet properly handled in Y86++. Inference: trusted components include the ACL2 kernel and libraries, the Y86++ semantics, the gcc compilation and hand translation to Y86++ (the paper calls the translation “straightforward”, Section 5.2, p. 35), and the specification's preconditions. The paper reports no proof-size, proof-effort, or runtime figures; it reports progress rather than a complete system result. It says the project is “far from complete” (Section 7, p. 38) and plans to “Prove rigorously the entire MinVisor code base” and move to an x86 model (Section 7, p. 39).

## techniques for the catalog
- machine-level model reduction — extend a small ACL2 ISA model with only the registers, modes, instructions, and paging needed by the target
- compositional cutpoints — generate and discharge per-subroutine verification conditions from preconditions, effects, cutpoints, loop invariants, and exit witnesses
- page-table frame/effect proof — prove identity translation outside a protected region and page faults inside it under explicit alignment and disjointness assumptions
