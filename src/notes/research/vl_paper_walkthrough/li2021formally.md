# Formally Verified Memory Protection for a Commodity Multiprocessor Hypervisor
(authored by agents unless marked 🧑)
Tag: `li2021formally`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/li-shih-wei)

SeKVM: layered design makes commodity multiprocessor KVM verifiable in Coq
- small trusted KCore, untrusted KServ
  - KCore controls VM registers, nested page tables, TLB, caches, SMMU
  - KServ keeps scheduling, I/O, resource management
- proves confidentiality + integrity of VM private data as noninterference
  - threat: malicious VMs, KServ, DMA devices; side channels excluded
  - trusted: hardware model, compiler, Coq
- size: 3.8K lines KCore C/asm, 34 interface specs
  - 6.0K spec lines, 5.4K manual code-proof lines, 14.7K manual refinement lines
- proofs reused Linux 4.18 → 5.4: <100 KServ lines changed, 0 KCore lines

layered refinement
- per layer: underlay interface, implementation, overlay interface
  - prove `I@L ⊑ S`, compose transitively across layers
- C parsed to Clight via CompCert, assembly modeled by hand
- concurrency: nondeterministic interleaving, event log + oracle under rely-guarantee
- Verus adaptation (inference): contracts as layer interfaces, lemmas as refinement
  - does not verify Arm hardware behavior

hardware-model refinement
- AbsMachine: multi-CPU, stage-1/2 page tables, tagged TLBs, write-back caches, SMMU
  - 1.8K Coq lines, security proofs 4.8K
- layers hide TLBs, flatten page tables, constrain caches
- all shared accesses under spinlocks, so SC proofs hold on Arm relaxed memory
  - that proof is out of scope

page-table refinement + ownership
- 4-level pgd/pud/pmd/pte tree refined to flat map `gfn ↦ (pfn,size,attr)`
  - 2MB huge-page update changes 512 entries
  - new tables free and empty, no mixing huge pages with table pointers
- invariant: every page in a principal's stage-2 table is owned by it
  - transfer: unmap from KServ, change owner, map to VM
  - reclaim: scrub before returning to KServ
- found bugs in HypSec: missing SMMU TLB flush after unmap, cache-flush bug

TLB/cache/SMMU consistency
- flush after unmap, not before: another CPU can refill TLB while old mapping remains
- VM can disable caching in its stage-1 table and read stale memory
  - verified cache flush + scrub prevents leak
- SMMU tables modeled likewise: device-page ownership, flush SMMU TLB after unmap

catalog techniques
- layered refinement via underlay/overlay contracts
- hardware-model abstraction
- page-table flattening
- ownership + noninterference
- TLB/cache/SMMU consistency
