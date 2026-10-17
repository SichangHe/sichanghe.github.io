# VeriSMo: A Verified Security Module for Confidential VMs
(authored by agents unless marked 🧑)
Tag: `zhou2024verismo`, [paper](https://www.usenix.org/conference/osdi24/presentation/zhou)

## system and proof boundary
VeriSMo is a Rust security module running at AMD SEV-SNP VMPL0 above an untrusted guest OS (VMPL3) and hypervisor. It supplies page validation, kernel-code locking, runtime measurement, attestation, and secret management (§3.4, pp. 602–603). The paper reports that it is “fully verified for functional correctness, secure information flow, and memory safety” (introduction, p. 600). The threat model trusts only the CPU and treats everything outside the confidential VM, including the hypervisor, as controlled by an adversary; VeriSMo also does not trust the guest OS. Denial-of-service attacks are possible and physical attacks are out of scope (§3.1, pp. 601–602).

The architecture separates two kinds of concurrency. The machine-model layer abstracts registers, memory, page tables, and the Reverse Map Table (RMP), and proves confidentiality and integrity against arbitrary hypervisor operations. The implementation layer verifies VeriSMo's concurrent Rust code with ownership and Verus tracked permissions. The paper says: “To handle these two different forms of concurrency separately, we divide verification into two layers: the machine-model layer and the implementation layer” (§4.2, p. 603).

## technique 1: an abstract machine model for hostile hardware

what it is and when to use it
Model hardware resources and every relevant actor as a transition system when untrusted software can change hardware state between program steps. The model has entities `E0` (VeriSMo VMPL0), `E3` (guest VMPL3), and `Ehv` (hypervisor); values read from memory shared with `Ehv` or `E3` are treated as unconstrained (§5.1.1, p. 604).

how to apply it
1. Define a machine state Ψ representing the contents and attributes of hardware resources such as registers, memory, page tables, and the RMP (§5.1, p. 604).
2. Define primitive operations initiated by each entity; each represents a single machine instruction, with behavior defined from the AMD manual (§5.1.2, p. 604).
3. For each operation, define a trusted executable function with a single line of unsafe assembly and its pre- and postcondition; the postcondition is fully trusted, and the `pvalidate` postcondition marks the RMP entry as validated (§5.1.2, p. 604).
4. Define a machine invariant `m_inv` representing whether a machine state is valid, and an attack-model specification (`attack_model` in Listings 5 and 7; the text calls it `model_attack`) that determines whether a state is reachable from another under attack (§5.2, pp. 604–605).
5. Prove the correctness of both specifications over all possible operations, where only `E0`'s operation is constrained by preconditions (`Op::sw_requires`) (Listings 6–7, p. 605).
6. Prove top-level confidentiality and integrity theorems (Listings 4–5, p. 604). In Listing 4, if `E0` reads a secret and another read of the same SPA succeeds, that read returns an encrypted value. In Listing 5, an `E0` read returns the same value before and after an attack.

Verus form
The paper provides Verus-shaped contracts: `proof fn` with `requires` and `ensures`, predicates such as `m_inv(Ψ)`, and trusted executable wrappers around unsafe instructions (Listings 4–7, pp. 604–605). Inference: in a Verus Rust project, keep the unsafe instruction in a narrow trusted wrapper, prove callers satisfy its precondition, and do not treat the wrapper's postcondition as a proof about the hardware, because it is trusted rather than proved.

evidence, assumptions, and failures
The model covers only critical memory and cache operations, under assumptions such as always forcing VM termination when a #VC or other unexpected interrupt is triggered (§5.1.2, p. 604). The initial page table for `E0` at launch is a trusted assumption: its pages are in the PT memory and it enforces a one-to-one GVA-to-GPA mapping; the proof then shows `pt_write` preserves this (§5.3.3, p. 606). These assumptions are part of the trusted base, not derived from the Rust implementation.

## technique 2: security lemmas for confidentiality and integrity

what it is and when to use it
Decompose a global hardware security theorem into lemmas about private memory, VMPL isolation, and address translation. VeriSMo divides guest memory into VMPL0-private, VMPL3-private, and hypervisor-shared sets (§5.3, p. 605). The paper says the five lemmas are fully proved with Verus.

how to apply it
1. Prove RMP binding: if a page is VM-private and validated, then in any state reachable through hypervisor modifications its GPA stays bound to the same SPA or to nothing (as long as `E0` does not validate the GPA again), so a read either fails or returns the original value (Lemma 1, p. 605).
2. Lift this to confidentiality: a hypervisor read of a VM-private secret returns an encrypted version (Lemma 2, p. 605). The proof showed that holding the RMP validation bit is not necessary, so a requirement for a ‘C’ bit in the page table suffices (§5.3.1, p. 605).
3. Prove VMPL0-private isolation: `E0`'s read either fails or returns the original value, and `E3` cannot read it, because `rmpadjust` has a precondition that `E0` cannot grant access permission to VMPL3 if the memory is VMPL0-private (Lemma 3, p. 605).
4. Prove GVA stability: after modifications by `Ehv` and `E3`, a VMPL0 access to a successfully translated GVA gives the same SPA or fails (Lemma 4, p. 606).
5. Prove the GVA-to-SPA mapping is one-to-one (Lemma 5, p. 606): GPA-to-SPA is one-to-one for VM-private memory by Lemma 3, so the proof covers GVA-to-GPA by separating writes into normal memory (`mem_write`) and page-table memory (`pt_write`) and keeping the PT memory VMPL0-private via a precondition on `rmpadjust`.

Verus form (inference)
Inference: encode each lemma as a `proof fn` over a `Machine` state with `requires` for `m_inv` and `attack_model`, and `ensures` for unchanged reads or encrypted results. Use quantified `spec fn` predicates for memory classes and map injectivity. The machine model must expose pure transitions; executable APIs call trusted wrappers whose contracts match those transitions.

The lemmas rest on the AMD instruction semantics encoded in the model and the initial page-table assumption. Denial of service is not covered: the untrusted hypervisor can opt not to schedule a vCPU for VeriSMo (§3.1, p. 602).

## technique 3: permission-based concurrent implementation verification

what it is and when to use it
Use non-copyable tracked permissions as capabilities for fine-grained hardware resources, and lock permissions for shared resources. This avoids one large global state and simplifies concurrency reasoning with ownership. The paper says: “Each resource permission includes an identifier and multiple fields that represent the value or attributes of the resource” (§6.1, p. 606).

how to apply it
1. Define a tracked memory permission (`SnpPointsTo`) without the ability to be copied or constructed; an initial assumption ensures the initial uniqueness of all memory permissions, which then guarantees uniqueness throughout the program (§6.1.1, p. 606).
2. Give each permission the guest virtual address as identifier, the stored value, and software and hardware memory attributes (`swattr`, `hwattr`) containing RMP and page-table values plus an `is_pt` flag (Listing 8, pp. 606–607). Borrowing or replacing a value requires the matching permission (Listing 9, p. 607).
3. For shared memory, store the memory permission in a lock permission. Acquiring converts the lock to a locked state and returns the memory permission; releasing has a precondition that the object satisfies its invariant, and returns the permission to the lock (§6.1.2, p. 608).
4. For memory shared with the hypervisor or guest OS, the permission obtained on locking allows copying and writing but not borrowing references; for unrestricted operations, copy the memory to VMPL0-private memory or use `rmpadjust`/`pvalidate` to transition it to VMPL0-private (§6.1.3, pp. 608–609).
5. Define register permissions. Each CPU uses a single permission for all its registers; the GHCB MSR gets a “share” attribute and its values are treated as unconstrained; explicit use of RIP and SP is prevented by removing permissions; a CR3 write requires tracked mutable permissions for both the page table and all usable virtual memory addresses (§6.1.4, p. 609).
6. Check invariants through the APIs. Listing 12 protects a global variable with the invariant `0 <= v <= 0xff_ffff`; a `replace` to `0x1000_0000` makes the `release` fail (§6.1.2, p. 608).

Verus form
Tracked variables, `Tracked(&mut perm)`, `requires`, `ensures`, and `proof fn` are shown in Listings 8–12 (pp. 607–608). The paper calls its lock APIs trusted. Inference: use `invariant` on loops or state machines to preserve uniqueness and lock state, and audit the trusted lock contracts against the implementation, since an incorrect contract would undermine every client proof.

evidence and limits
Fine-grained permissions reduce concurrency proof complexity, but they do not prove the underlying hardware; the memory-permission primitives are trusted specifications or axioms (§6.1.1, p. 607). The method assumes the initial uniqueness condition (§6.1.1, p. 606). Section 7.2 (p. 610) gives an example where one lock around the OSMEM variable and VMPL3's memory also protects the RMP updates for VMPL3's memory without new locks.

## technique 4: value-set security types for information flow

what it is and when to use it
Track each primitive's value and its possible-value set (`valset`) for each entity. A complete set denotes a secret; a singleton denotes public to the entity (§6.2, p. 609). The paper aims to prevent secret leakage through explicit or implicit information flows.

how to apply it
1. Define security types matching Rust's primitive types, each with a value and a set of possible values an entity can guess from (§6.2, p. 609).
2. Implement standard operator traits so the result set is the set of `a op b` over all pairs from the operand sets; the paper gives the constraint for `(a op b).valset` (§6.2, p. 609).
3. Require both operands of a comparison to be public to all entities, because comparisons may leak secrets via control flow (§6.2, p. 609).
4. Allow downgrade only through a trusted function; after a downgrade the set is a singleton, so the value can no longer be used as a secret, for example the key no longer meets the precondition of trusted cryptographic functions (§6.2, p. 609).
5. Maintain the memory confidentiality relation: for every entity, if a memory permission is not confidential to that entity then its value must be constant to that entity; secret data must not be used as a memory address, enforced as a precondition of trusted memory-access functions (§6.2, p. 609).

Verus form (inference)
Inference: implement the wrappers as Rust structs with `spec fn` accessors for value sets and `ensures` clauses for each operator. Mark comparisons with `requires` that both sets are public. Keep downgrade and cryptographic primitives in narrow trusted wrappers, and prove all callers preserve the security-level invariant.

The scheme covers three kinds of secrets: the VM communication keys generated by the hardware, VeriSMo's own private/public key pair, and symmetric encryption keys for the guest OS (§6.2, p. 609). It relies on a trusted, formally verified crypto library (HACL), which the authors “trust completely” (§1, p. 600; §6.2, p. 609).

## measured results, trust, and bug found
The implementation is Rust verified with Verus. The authors report roughly six minutes to verify on a 32-core machine (introduction, p. 600; §8.3, p. 611). The evaluation machine has an AMD EPYC 7543P 32-core processor on Hyper-V, with 8 dedicated cores for the host (§8, p. 610). Guest API calls were run 100 times; for example, `Switch` took 34 thousand cycles (0.012 ms, standard deviation 0.002 ms), `AttestPCR` 17,633 thousand cycles (6.298 ms, SD 4.270), and `LockKernel(8GiB)` 4,260,969 thousand cycles (1522 ms, SD 151) (Table 1, p. 610). UnixBench compares VeriSMo with Linux-sm, C-sm, and Linux (Figure 5, p. 610); the paper reports that “the security module introduces almost zero overhead” (§8.2, p. 610) and that the comparable performance to the Linux-sm and C-sm prototypes shows no performance sacrifice for verification (§8.2, p. 610). Those two prototypes support only WakeUpAP, SetPageShared, and SetPagePrivate.

Verification found a bug: after VMPL3 shares a page and a malicious hypervisor rebinds an SPN holding a VMPL0 secret to that GPN, VeriSMo validated the page when VMPL3 asked to make it private again and granted VMPL3 access to the secret. The fix is to clear a page after validating it and before assigning it to VMPL3. The authors reported it to AMD in early May 2023, and it was fixed in AMD SVSM (§8.4.1, pp. 611–612).

The proved claims cover the specified machine model, the permission-checked implementation, and value-set information flow. Section 7.1 (p. 610) lists what is fully trusted: a small number of primitive functions, ground-truth axioms, the hardware model specification, the model-based specification of the safety properties, the specification for functional correctness, and trusted external libraries (Rust core, HACL), plus Verus and the Rust compiler. The initial page-table assumption (§5.3.3, p. 606) is also trusted. Inference: agent-written verified Rust has high threat at hardware boundaries and permission APIs; VeriSMo's two-layer decomposition and narrow trusted wrappers are a reusable architecture. The paper claims a full Verus verification of a confidential-VM security module, modulo that trusted base, so VL should reuse these contracts and focus on application-specific properties rather than repeat the architecture.

## techniques for the catalog

- two-layer machine/implementation proof: separate hostile hardware transitions from concurrent Rust ownership proofs
- abstract-machine security lemmas: prove RMP, VMPL, and address-translation properties compositionally
- tracked and lock permissions: transfer fine-grained resource capabilities safely across CPUs
- value-set information flow: propagate possible values and reject secret-dependent control flow
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "A trusted initial assumption we make is that the initial page table for E0 at launch time is correct in the sense that the page table pages are in the PT memory and the page table enforces a one-to-one mapping from GVAs to GPAs."): I read all 1100 lines of the paper text and checked every quotation, number, listing, lemma, section and page reference, and each technique step against it. I changed the threat-model citation (§3.1, not §2.2), several page numbers (introduction quote p. 600; §6.1.4 p. 609; §7.1, §8 and Table 1 p. 610), the trusted-base list, the permission attributes, the UnixBench claim, and the attack-model naming; I added the §8.4.1 bug and marked my own advice as Inference; I replaced the link with the publisher page given in the paper text. I did not check the Verus-form advice against any code, the layout of Listing 4, 5 and 7 conditions beyond the extracted text, or the cited related work.
