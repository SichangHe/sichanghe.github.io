# Formally Verified Memory Protection for a Commodity Multiprocessor Hypervisor
(authored by agents unless marked 🧑)
Tag: `li2021formally`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/li-shih-wei)

## what the paper proves
SeKVM retrofits Linux KVM with a small trusted KCore and an untrusted KServ. The paper's central claim is that a layered implementation and layered hardware model make a commodity, multiprocessor hypervisor verifiable. The authors state: “Using layers, we isolate KVM’s trusted computing base into a small core such that only the core needs to be verified to ensure KVM’s security guarantees.” (Abstract, p. 3953). KCore controls VM register state, nested page tables, TLB maintenance, caches, and SMMU mappings; KServ retains scheduling, I/O, and resource management.

The threat model lets other VMs, KServ, and DMA-capable peripherals be malicious, but excludes side channels. Hardware, compiler, Coq, and secure persistent key storage are trusted. The authors explicitly write: “We trust the machine model, compiler, and Coq.” (Section 2, p. 3954). The proved properties are confidentiality and integrity as noninterference/state-indistinguishability properties for private VM data, including CPU registers, main memory, caches, and page-table metadata (Section 4.6, pp. 3962–3963). GRANT_MEM pages are deliberately outside the private-memory property until revoked.

## technique 1: layered implementation and refinement

Inference: Use this when a large trusted component can be split into modules with one-way calls and each module can expose an abstract contract. First put the smallest security-critical code in KCore and leave functionality that does not directly access VM state in KServ. Then arrange KCore modules as a call hierarchy (TrapHandler, CtxtSwitch, MMU/PT, memory ownership, SMMU, locks, and cryptographic libraries). The paper's design principles are to simplify abstractions, hide lower-level complexity, consolidate reusable functionality, and enforce invariants (Section 3, p. 3956).

For each layer, write an underlay interface, implementation, and overlay interface. Prove that the implementation over the underlay refines the overlay, written by the paper as `I@L v S`. Compose adjacent refinements transitively: `I1@S0 v S1`, `I2@S1 v S2`, `I3@S2 v S3`, therefore `(I3 ⊕ I2 ⊕ I1)@S0 v S3` (Section 4, p. 3957). Parse C into Clight in Coq with CompCert; model assembly manually; prove calling-convention and argument-passing conditions for assembly primitives. The authors report 34 interface specifications and 3.8K lines of KCore C/assembly, excluding 10.1K HACL* lines. Table 1 reports 6.0K specification lines, 5.4K manual code-proof lines and 14.7K manual refinement lines; including generated proofs, the latter totals are 16.5K and 17.8K respectively (Section 5, Table 1, p. 3964).

Inference: A Rust/Verus adaptation could use function contracts for layer interfaces and proof lemmas for refinement. The paper does not establish that this adaptation verifies Arm hardware behavior.

Evidence and limits: unchanged KCore proofs were reused from Linux 4.18 to 5.4; less than 100 KServ lines changed and no KCore lines changed (Section 5, pp. 3964–3965). The authors did not link HACL* F* proofs to Coq, nor C proofs to assembly proofs. The paper gives the compiler limitation only for the latter: “The latter requires a verified compiler for Arm multiprocessor code; no such compiler exists.” (Section 5, p. 3965). Inference: these unlinked proofs leave translation boundaries outside an end-to-end proof.

## technique 2: refine realistic hardware into simpler models

Inference: Use this when low-level hardware details are needed for correctness but would overwhelm high-level security proofs. Build AbsMachine as a transition system with multiple CPUs, shared memory, stage-1/stage-2 page tables, tagged TLBs, coherent write-back caches with bypass, and SMMU tables. Concurrency is nondeterministic interleaving of CPU steps; shared-object effects are represented by a logical event log and an event oracle constrained by rely-guarantee conditions (Section 4.1, pp. 3957–3958). Prove each implementation layer refines a simpler model, progressively hiding TLBs, flattening page tables, and constraining cache behavior. The paper says: “We use layers to gradually refine the detailed low-level machine model to a higher-level and simpler abstract model.” (Section 4, p. 3957).

Inference: A Rust/Verus adaptation would need an explicit hardware state and transition model, plus a justification connecting that model to executable hardware operations.

Evidence and limits: the authors state that all shared accesses are protected by spinlocks whose barriers prevent reordering beyond critical sections, so their sequentially consistent guarantees hold on Arm's relaxed memory model. They add: “This proof is beyond the scope of this paper.” (Section 4.1, p. 3958). AbsMachine itself took 1.8K Coq lines and security proofs 4.8K lines (Section 5, p. 3965).

## technique 3: page-table refinement and ownership invariants

Represent four-level pgd/pud/pmd/pte tables concretely. In the example `map_page`, acquire the stage-2 lock, test whether a mapping exists, and call `set_s2pt` with size 4K if none exists. `set_s2pt` accepts a 2-MB mapping only when the pmd is not a table; for size 4K it descends to pte only when the pmd is a table (Section 4.2, p. 3959). Prove newly allocated lower-level tables are free and empty and are inserted only where a level is absent, preserving the tree. Prove distinct mapping updates do not interfere and a pmd cannot mix huge-page mappings with pointers to regular-page tables. Refine the tree into a flat map `gfn ↦ (pfn,size,attr)`. A huge-page update changes 512 entries: “Changing one mapping for a 2MB huge page will cause updates to the mappings for all of its 512 4KB pages.” (Section 4.2, p. 3959). Higher layers then use the flat map.

Inference: A Rust/Verus adaptation could express the flat map as ghost state and prove that each update preserves mappings outside its affected range. The paper does not prove that Rust ownership alone controls concurrent hardware page walks.

The security proof starts with the invariant that every page mapped in a principal's stage-2 table is owned by that principal. Ownership transfer unmaps from KServ, changes owner, then maps to the VM; reclamation scrubs before assigning back to KServ (Section 4.6, pp. 3962–3963). The paper reports finding and fixing a missing SMMU-TLB flush and a cache-flush bug in HypSec (Section 4.6, p. 3964). The authors report: “We fixed the bug in KCore by adding a SMMU TLB flush after the unmap.” (Section 4.6, p. 3964).

## technique 4: TLB, cache, and SMMU consistency proofs

Model tagged CPU TLB entries and verify the maintenance needed for page-table changes. At NPTOps, compare the sequences of page-observer groups produced by TLBs and page tables; merge consecutive identical observer sets before comparison. For an ownership transfer, unmap from KServ, flush its TLB entry, then map for the VM; the paper's observer notation includes a state with no page observers after flushing and before mapping (Section 4.3, pp. 3960–3961). Flushing before unmapping is insufficient because another CPU can refill the TLB while the old mapping remains. Prove cache attributes are enabled, ownership changes call cache flush, and scrubbing writes back dirty cache lines before reassignment. Cacheable accesses may leave main memory stale; an incoming VM can disable caching in its own stage-1 table and read that memory directly. The verified flush prevents this leak (Section 4.4, pp. 3961–3962). Model SMMU page tables similarly, prove device-page ownership, and flush SMMU TLBs after unmapping (Sections 4.4–4.5, pp. 3961–3962).

Inference: A Rust/Verus adaptation could model TLB, cache, and SMMU operations as state transitions and prove the corresponding ownership and observer properties. Connecting those transitions to hardware would remain a separate obligation.

## techniques for the catalog

- layered refinement: compose module implementations through underlay/overlay contracts and prove transitive refinement
- hardware-model abstraction: refine a realistic multiprocessor transition system into simpler layer-specific models
- page-table flattening: prove tree well-formedness and refine multi-level mappings into a frame-preserving flat map
- ownership and noninterference: use page ownership, cache flushing, and observer indistinguishability to prove confidentiality/integrity
- TLB/cache/SMMU consistency: invalidate translations and write back data at ownership changes, then prove the abstract security invariant
