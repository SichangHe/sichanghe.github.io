# VeriSMo: A Verified Security Module for Confidential VMs
(authored by agents unless marked 🧑)
Tag: `zhou2024verismo`, [paper](https://www.usenix.org/conference/osdi24/presentation/zhou)

VeriSMo: Rust security module at AMD SEV-SNP VMPL0, verified with Verus
- claims functional correctness, secure information flow, memory safety
- threat model: only CPU trusted; hypervisor and guest OS (VMPL3) adversarial; DoS allowed, physical attacks out of scope
- 2 proof layers for 2 kinds of concurrency
  - machine-model layer: hostile hardware/hypervisor
  - implementation layer: concurrent Rust via ownership + tracked permissions
abstract machine model
- state Ψ: registers, memory, page tables, RMP
- entities E0 (VeriSMo), E3 (guest), Ehv (hypervisor)
  - values from memory shared with Ehv or E3 are unconstrained
- primitive ops = 1 instruction each, trusted wrapper with 1 unsafe asm line + trusted pre/post
- machine invariant m_inv + attack_model, proved over all ops
- top theorems: confidentiality (read returns encrypted value), integrity (read same before/after attack)
- trusted assumptions: AMD instruction semantics, initial page table is 1-to-1 GVA-to-GPA
5 security lemmas, all proved in Verus
- 1 RMP binding: validated private page's GPA stays bound to same SPA or nothing
- 2 confidentiality: hypervisor read of VM-private secret is encrypted
- 3 VMPL0-private isolation via rmpadjust precondition
- 4 GVA stability under Ehv/E3 modifications
- 5 GVA-to-SPA one-to-one, separate mem_write vs pt_write
permission-based implementation proof
- non-copyable tracked permissions per resource (SnpPointsTo: address id, value, swattr, hwattr)
- shared memory: permission stored in lock, release requires invariant
  - lock APIs are trusted
- registers: 1 permission per CPU, CR3 write needs page-table + memory permissions
- initial uniqueness of permissions is assumed
value-set information flow
- each primitive carries value + valset per entity; complete set = secret, singleton = public
- operator result valset = op over all operand pairs
- comparisons require public operands (no secret control flow)
- downgrade only via trusted function; secret never used as memory address
- trusts HACL crypto library completely
results
- ~6 min verification on 32 cores
- overhead near zero in UnixBench vs Linux-sm and C-sm (those support only 3 calls)
  - e.g. Switch 34k cycles (0.012 ms), AttestPCR 6.298 ms, LockKernel(8GiB) 1522 ms
- verification found bug: malicious hypervisor rebinds SPN holding VMPL0 secret, VeriSMo validated page and gave VMPL3 access
  - fix: clear page after validation before assigning to VMPL3, reported to AMD May 2023, fixed in SVSM
trusted base (sec 7.1)
- few primitive functions, ground-truth axioms, hardware model, safety + functional specs, Rust core, HACL, Verus, rustc
