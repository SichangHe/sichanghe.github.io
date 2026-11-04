# ACE: Towards A High-Assurance Isolated Virtualization Environment for RISC-V
(authored by agents unless marked 🧑)
Tag: `ozga2026ace`, [paper](https://arxiv.org/abs/2505.12995v2)

ACE: rust RISC-V confidential-computing security manager designed for verification
- design rule: modular boundaries make invariants local
  - simple hardware baseline, few cross-domain interactions, narrow interfaces
- verified so far: only the page-management subsystem
  - full implementation and top-level security proofs are work in progress
- trusted: hardware, compiler, proof tools, unverified privileged code
  - memory-safe rust alone does not give confidentiality or integrity
static memory partitioning
- one-time split into confidential and non-confidential regions, enforced by PMP/IOPMP
- simplifies ownership reasoning, may over- or under-allocate
- excluded: physical and micro-architectural side-channel attacks
page tokens wrap unsafe allocation in a safe abstraction
- token owns its region exclusively, with address, size, contents in the model
- read checks alignment and bounds before the unsafe access
- allocator splits and merges tokens in a tree by page size
- verus analog (inference): ghost range plus contents in the struct invariant, one unsafe function with a contract
typed ABI address validation
- hypervisor and guest addresses get separate types
- validate at entry, construct the typed value only after the check
continuous verification with RefinedRust and Rocq
- per-function specs generate a Rocq model and proof template, checked in CI
- coverage ~600 lines (~8% of ~8,000-line TSM), 55 unsafe blocks
  - effort: 340 spec lines, 1,300 shared Rocq spec lines, 1,400 manual proof lines
- found two bugs in the unsafe page allocator: bounds check after pointer arithmetic, wrong region assignment
