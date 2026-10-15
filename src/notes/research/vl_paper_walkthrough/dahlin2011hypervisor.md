# Toward the Verification of a Simple Hypervisor
(authored by agents unless marked 🧑)
Tag: `dahlin2011hypervisor`, [paper](http://arxiv.org/abs/1110.4672v1)

## artifact and proof target
MinVisor is a small Type-I x86 hypervisor that protects its own memory from a malicious guest. The authors deliberately choose a bottom-up implementation-level proof: “Functional segments of the MinVisor C code base are translated into Y86 assembly, and verified with respect to the Y86 model” (Abstract, p. 28). The initial target is nested-page-table setup, because protected pages must fault while all other guest physical addresses identity-map.

The first reusable technique is a deliberately small executable model (Sections 2 and 4, pp. 29–34). Instead of waiting for a complete x86 model, extend ACL2's Y86 with CR3, paging, guest/supervisor mode, new registers and instructions, and nested page tables. The resulting Y86++ memory is an association list from 32-bit addresses to bytes. Build an ACL2 assembler for convenience, but verify the binary, not the assembler output: “Our proof is at the level of the binary; its validity does not depend on the assembler” (Section 4.1, p. 33). Inference: this isolates the proof from compiler and assembler claims, while leaving the hand translation from x86 to Y86++ as an engineering assumption.

The second technique is compositional cutpoint verification (Section 5, pp. 34–37). Give the machine language operational semantics, an annotated binary program, a precondition, an expected state modification, cutpoints, loop invariants, and an exit-point argument. ACL2 macros generate verification conditions; ACL2 then proves them. A subroutine is proved once and its theorem reused at call sites. For `create_nested_pt`, specify initial state `S0`, terminating state `S1`, and the desired page-table effect. Its ten preconditions are: well-formed initial state; code at a fixed address; control at the entry; paging off; code, stack, and tables disjoint; tables 4-KiB aligned; protected region 2-MiB aligned; nonzero protected size a multiple of 2 MiB; nonwrapping stack; and all addresses fitting 32 bits (Section 5.1, p. 35).

The top-level postconditions are exact and operational: if `addr` is disjoint from the protected region, `va-to-pa addr S1` returns `addr`; if it overlaps, translation signals a page fault. Decompose `create_nested_pt` into `init_pdpt`, four `init_pdts`, and `sec_not_present`; specify each procedure's effects and combine them compositionally. The supplied ACL2 shape is directly actionable:

```lisp
(defsimulate+ y86-step :run y86 :inmain in-init_pdts
 :cutpoint init_pdts-cutpoint-p :precondition init_pdts-pre
 :assertion init_pdts-assertion :modify init_pdts-modify
 :exitsteps init_pdts-exitsteps
 :exists-next-exitpoint init_pdts-exists-next-exitpoint
 :next-exitpoint init_pdts-next-exitpoint
 :correctness-theorem init_pdts-correct)
```

The generated theorem states that, under the precondition and existence of a next exit point, execution leaves the entry region and the next-exit state equals `init_pdts-modify` (Section 5.2, pp. 36–37). The paper says: “This theorem is proved mechanically by ACL2” (Section 5.2, p. 37). The proof still required subsidiary lemmas and a disjoint-memory library; termination was not yet proved.

## Verus form and use
Inference: represent the page tables as a Rust map or fixed array and write executable initialization functions. State the ten preconditions with `requires`; state identity translation and fault behavior with `ensures`; use `invariant` loop clauses for table-index loops; use `assert` and proof functions for disjointness and alignment lemmas. Inference: a Verus proof should verify the actual Rust implementation, whereas this paper proves a hand-translated Y86++ binary and therefore cannot transfer its theorem automatically to Rust or x86. Inference: the cutpoint's frame/effect theorem maps naturally to postconditions describing unchanged memory and changed entries. Do not write `invariant(...)` as a call, `modifies` as a made-up clause, or a run-time call to a proof function; those are not Verus forms documented in the project notes.

Inference: use this method when the security property is about concrete machine state and a full high-level model would hide aliasing, paging, or instruction effects. Inference: it is less suitable when compiler translation, hardware behavior, or unmodeled faults dominate the claim. The authors explicitly note that the Y86++ proof has not established equivalence to x86: “That claim has not been formally established” (Section 4.2, p. 34).

## evidence, trust, and threat
The proved fragment establishes page-table effects under the ten assumptions, not full hypervisor correctness. The running artifact was not tested on real hardware (Section 3, p. 30), and page faults are not yet properly handled in Y86++. Trusted components include the ACL2 kernel and libraries, the Y86++ semantics, the C-to-x86-to-Y86++ translation, and the specification's preconditions. The paper reports no proof-size, line-count, or runtime denominator; it reports progress rather than a complete system result. It says the project is “far from complete” (Section 7, p. 38) and plans to prove the entire code base and move to x86.

Inference: threat to a product of agent-written verified Rust is high if agents emit low-level unsafe code whose model differs from deployed hardware; the paper's discipline suggests isolating a machine model, proving frame conditions, and making translation assumptions explicit. Inference: VL should not redo the generic idea of ACL2 cutpoints and nested-page-table protection; it should reuse the decomposition while proving the deployed Rust and hardware-facing contracts. Inference: the paper's useful gap is integration: binary-level proof gives strong local assurance, but no end-to-end link to x86 or real hardware.

## techniques for the catalog
- machine-level model reduction — extend a small ACL2 ISA model with only the registers, modes, instructions, and paging needed by the target
- compositional cutpoints — generate and discharge per-subroutine verification conditions from preconditions, effects, cutpoints, loop invariants, and exit witnesses
- page-table frame/effect proof — prove identity translation outside a protected region and page faults inside it under explicit alignment and disjointness assumptions

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
