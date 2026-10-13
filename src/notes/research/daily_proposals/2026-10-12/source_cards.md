Primary source cards and focused review
(authored by agents unless marked 🧑)

- scope: six papers plus one supporting PoWER README
  - seven distinct source objects inspected; source cap exceeded by one
  - no further source review
  - quotations normalize PDF line wrapping and hyphenation
  - results are author claims, not reproduced
- planned discovery query, not executed locally: verified crash recovery Verus journal recovery work bounds
  - no independently captured live search results
  - direct primary links selected from existing notes and PoWER references

PoWER Never Corrupts: Tool-Agnostic Verification of Crash Consistency and Corruption Detection
- authors: Hayley LeBlanc; Jacob R. Lorch; Chris Hawblitzel; Cheng Huang; Yiheng Tao; Nickolai Zeldovich; Vijay Chidambaram
- venue/version/date: OSDI 2025, July 7–9, proceedings PDF
- primary source: [power, PDF p.8](https://www.usenix.org/system/files/osdi25-leblanc.pdf#page=8)
- key quote: “We have written a generic redo journal component in Verus.”
  - surrounding sentence: “We have written a generic redo journal component in Verus. Internally, this journal must reason about intermediate crash states, but the user of the journal component (e.g., C APYBARA KV) does not have to.”
- source type: primary research paper
- confidence: high for quoted scope; author claims for results
- why selected: generic redo journaling is prior work
- task: storage crash-consistency verification
- benchmark: CapybaraKV and CapybaraNS; PM workloads
- baseline: unverified PM stores
- metrics: throughput; verification time; startup time
- result: competitive performance claimed, not reproduced
- limitation: same-region concurrent accesses constrained (§3.4); explicit corruption model
- relation to local notes: distributed_verification_review_b/deep_1_verified_implementations.md
- negative evidence: generic redo journaling is prior work
- access: public PDF freshly downloaded October 12, 2026
  - PDF/text in primary/power.*
  - hash and staging path in collection_record.json

Verifying concurrent, crash-safe systems with Perennial
- authors: Tej Chajed; Joseph Tassarotti; M. Frans Kaashoek; Nickolai Zeldovich
- venue/version/date: SOSP 2019, proceedings PDF
- primary source: [perennial, PDF p.2](https://pdos.csail.mit.edu/papers/perennial:sosp19.pdf#page=2)
- key quote: “Perennial proofs only cover safety properties and not liveness, as is typical in concurrent verification.”
  - surrounding sentence: “Perennial proofs only cover safety properties and not liveness, as is typical in concurrent verification. Goose does not include the entire Go language and lacks support for interfaces or first-class functions.”
- source type: primary research paper
- confidence: high for quoted scope; author claims for results
- why selected: concurrent recovery leases and helping are prior work
- task: storage crash-consistency verification
- benchmark: Mailboat; replicated disk
- baseline: GoMail; CMAIL
- metrics: throughput; cores; proof size
- result: multicore speedup claimed, not reproduced
- limitation: restricted Goose language and trusted translation
- relation to local notes: distributed_verification_review_b/deep_1_verified_implementations.md
- negative evidence: concurrent recovery leases and helping are prior work
- access: public PDF freshly downloaded October 12, 2026
  - PDF/text in primary/perennial.*
  - hash and staging path in collection_record.json

Storage Systems are Distributed Systems (So Verify Them That Way!)
- authors: Travis Hance; Andrea Lattuada; Chris Hawblitzel; Jon Howell; Rob Johnson; Bryan Parno
- venue/version/date: OSDI 2020, author/proceedings PDF
- primary source: [veribetrkv, PDF p.2](https://www.andrew.cmu.edu/user/bparno/papers/veribetrkv.pdf#page=2)
- key quote: “operation will complete in finite time”
  - surrounding sentence: “Finally, we focus on safety and functional correctness: we guarantee that the system does not return incorrect results, but liveness (i.e., the guarantee that an operation will complete in finite time) is out of scope.”
- source type: primary research paper
- confidence: high for quoted scope; author claims for results
- why selected: asynchronous storage refinement is prior work
- task: storage crash-consistency verification
- benchmark: VeriBetrKV Bε-tree workloads
- baseline: BerkeleyDB; RocksDB
- metrics: queries; insertion throughput; proof checking time
- result: query performance comparable to unverified stores claimed, not reproduced
- limitation: liveness out of scope; platform/storage assumptions
- relation to local notes: distributed_verification_review_b/deep_1_verified_implementations.md
- negative evidence: asynchronous storage refinement is prior work
- access: public PDF freshly downloaded October 12, 2026
  - PDF/text in primary/veribetrkv.*
  - hash and staging path in collection_record.json

Verifying the DaisyNFS concurrent and crash-safe file system with sequential reasoning
- authors: Tej Chajed; Joseph Tassarotti; Mark Theng; M. Frans Kaashoek; Nickolai Zeldovich
- venue/version/date: OSDI 2022, author/proceedings PDF
- primary source: [daisynfs, PDF p.2](https://pdos.csail.mit.edu/papers/daisy-nfs:osdi22.pdf#page=2)
- key quote: “The transaction system does not have a proof of liveness, and we do not prove that transactions avoid deadlock.”
  - surrounding sentence: “The transaction system does not have a proof of liveness, and we do not prove that transactions avoid deadlock. DaisyNFS does not support NFS unstable writes, which improve performance by not committing writes to stable storage until explicitly requested.”
- source type: primary research paper
- confidence: high for quoted scope; author claims for results
- why selected: sequential reasoning and bounded multi-transaction freeing are prior work
- task: storage crash-consistency verification
- benchmark: DaisyNFS; GoTxn; NFS workloads
- baseline: Linux NFS/ext4 with matched durability
- metrics: throughput; proof/code ratio
- result: at least 60% throughput on hardest workloads claimed, not reproduced
- limitation: safe transactions only; no transaction liveness/deadlock proof
- relation to local notes: distributed_verification_review_b/deep_1_verified_implementations.md
- negative evidence: sequential reasoning and bounded multi-transaction freeing are prior work
- access: public PDF freshly downloaded October 12, 2026
  - PDF/text in primary/daisynfs.*
  - hash and staging path in collection_record.json

GoJournal: a verified, concurrent, crash-safe journaling system
- authors: Tej Chajed; Joseph Tassarotti; Mark Theng; Ralf Jung; M. Frans Kaashoek; Nickolai Zeldovich
- venue/version/date: OSDI 2021, author/proceedings PDF
- primary source: [gojournal, PDF p.1](https://pdos.csail.mit.edu/papers/gojournal:osdi21.pdf#page=1)
- key quote: “we found one serious concurrency bug”
  - surrounding sentence: “While verifying GoJournal, we found one serious concurrency bug, even though GoJournal has many unit tests.”
- source type: primary research paper
- confidence: high for quoted scope; author claims for results
- why selected: concurrent journaling and modular crash specifications are prior work
- task: storage crash-consistency verification
- benchmark: GoJournal; GoNFS; SimpleNFS
- baseline: Linux NFS/ext4
- metrics: throughput; proof size; discovered bugs
- result: concurrency bug despite tests reported, not reproduced
- limitation: top-level spec requires immediate flush; less general than JBD2
- relation to local notes: distributed_verification_review_b/deep_1_verified_implementations.md
- negative evidence: concurrent journaling and modular crash specifications are prior work
- access: public PDF freshly downloaded October 12, 2026
  - PDF/text in primary/gojournal.*
  - hash and staging path in collection_record.json

SquirrelFS: using the Rust compiler to check file-system crash consistency
- authors: Hayley LeBlanc; Nathan Taylor; James Bornholt; Vijay Chidambaram
- venue/version/date: OSDI 2024, July 10–12, proceedings PDF
- primary source: [squirrelfs, PDF p.14](https://www.usenix.org/system/files/osdi24-leblanc.pdf#page=14)
- key quote: “must rebuild volatile indices for the entire file system”
  - surrounding sentence: “SquirrelFS takes longer to mount than other PM file systems because it must rebuild volatile indices for the entire file system.”
  - sentence spans PDF pp.13–14; extraction split “systems” across the page boundary
- source type: primary research paper
- confidence: high for quoted scope; author claims for results
- why selected: Rust typestate ordering is prior work; full-state rebuilding must be charged
- task: storage crash-consistency verification
- benchmark: SquirrelFS; 128GB PM mount tests
- baseline: NOVA; WineFS; Ext4-DAX
- metrics: throughput; mount time; compilation time
- result: Table 2: 55.50 s full recovery mount, not reproduced
- limitation: recovery-mount test used cleanly unmounted images with recovery scans enabled
- relation to local notes: distributed_verification_review_b/deep_1_verified_implementations.md
- negative evidence: Rust typestate ordering is prior work; full-state rebuilding must be charged
- access: public PDF freshly downloaded October 12, 2026
  - PDF/text in primary/squirrelfs.*
  - hash and staging path in collection_record.json

PoWER artifact snapshot
- [Microsoft verified-storage README](https://github.com/microsoft/verified-storage/blob/main/README.md)
- exact quote: “Its transactional interface allows atomically committing appends across those logs.”
- context: description of multilog in the retrieved README
- source type: official artifact documentation
- scope: README inspected; code and formal proof not audited
- branch: main at retrieval; commit not pinned
- snapshot: primary/power_artifact_readme.md
- negative evidence: cross-log atomic commit is existing functionality
