# PoWER Never Corrupts: Tool-Agnostic Verification of Crash Consistency and Corruption Detection
(authored by agents unless marked 🧑)
Tag: `leblanc2025power`, [paper](https://www.usenix.org/conference/osdi25/presentation/leblanc)

## scope and result
PoWER (Preconditions on Writes Enforcing Recoverability) verifies crash consistency with ordinary Hoare-style contracts, and the paper adds a corruption model plus a corruption-detecting Boolean (CDB) for persistent memory (PM). The authors implement C APYBARA KV in Verus and C APYBARA NS in Dafny. “The key insight behind PoWER is that new forms of logic or TLA-style reasoning are not required to reason about crashes” (section 1, p. 840). PoWER requires a caller to prove, before every durable write, that every crash state the write can introduce is legal.

Inference: this is directly reusable for VeruLaw because the authors' implementation already demonstrates the approach in Verus. It targets crash and media-fault obligations that ordinary postconditions miss; it does not by itself establish a complete storage implementation or a correct specification (the paper says correctness depends on the specifications and on the verifiers and compilers, section 1, p. 840).

## technique: PoWER preconditions on writes

What it is. A normal postcondition talks about the state after a method returns, while a crash can happen in its body. PoWER adds a precondition quantifying over every possible crash result of the write and requires a ghost permission token `perm` (an “unforgeable ghost (i.e., erased by the compiler) permission token”) for each permitted result. Listing 1's Verus signature requires, for every state `s` satisfying `can_result_from_partial_write(s, old(self).durable_state, addr, bytes)`, that `perm@.permits(s)` holds, and ensures `can_result_from_write` after the write (section 3.1, p. 842). “The new precondition introduced by PoWER is on lines 5–8; it requires that all newly introduced potential crash states are permitted.” (section 3.1, p. 842). The paper says the annotations are erased at compile time, so the compiler generates an executable equivalent to the standard non-PoWER API (section 3.1, p. 842).

How to apply it.
1. Define a storage view with read state and durable state, and a predicate describing partial-write outcomes at the device's atomic granularity (Listing 2, p. 843).
2. Define a recovery function `rec` and the set of legal crash states, which the paper suggests be the union of the states abstractly equivalent to the initial state and the states permitted by the postcondition (section 3.1, p. 843; Listing 3, p. 844).
3. Give the write API a ghost permission `perm`; before calling it, prove the quantified precondition of Listing 1: for every state `s` that can result from the partial write, `perm@.permits(s)`.
4. State the ordinary functional postcondition using `old(self)` and the abstract view `self@` (Listing 1).
5. For a transition-style permission, prove `perm@.permits_transition(s1,s2)` and consume a single-use permission; use a blanket permission for repeated transitions between recovery-equivalent states (Listing 4 and section 3.1, p. 844).
6. Optionally partition storage statically into PoWER regions, each with its own handle and permissions, to modularize the proof (section 3.1, p. 844).

Verus form. The paper supplies real Verus constructs: `pub exec fn`, `requires`, `ensures`, `old(self)`, view notation `@`, `Tracked<&Perm>`, `spec fn`, quantifiers, and ghost variables. The paper defines `old(x)` as “the contents of mutable reference x upon method invocation”. Inference: a Rust API should make the permission an explicit tracked argument so that storage writes are impossible without proving the quantified precondition; `old` is an expression in a contract, not a runtime operation.

Evidence and limits. The authors produce a mechanically-checked Rocq proof of correspondence to Crash Hoare Logic, and they implement the PoWER interface as a Verus library on top of a crash-invariant interface, with an entirely machine-checked correspondence to crash invariants (section 3.2, p. 844). The Rocq proof is metalogical because PoWER was not implemented in Rocq and depends on a trusted translation (section 3.2, p. 844). PoWER needs quantifiers and ghost variables; the paper names Yggdrasil and TPot as tools with limited quantifier support that are incompatible (section 1, p. 840). It cannot handle arbitrary fine-grained concurrent writes to the same region (section 1, p. 840).

## technique: prophecy-based asynchronous storage model

What it is. The model uses two byte sequences: read state includes outstanding writes, while durable state is the prophesized result that will eventually persist. On a crash, a write may persist an arbitrary subset of its chunk-granularity subwrites; the paper's flush postcondition says the read state matches the durable state (flush “confirms that the prophesized durable state matches the read state”). The paper says, “A write operation applies the entire write to the read state and a nondeterministically chosen subset of chunk-granularity subwrites to the durable state.” (section 3.1, p. 843). The paper reports that the prophecy model's soundness is proven in Rocq by the Perennial authors and, separately, by the authors building it as a Verus library atop a natural non-prophecy model (section 3.1, p. 843).

How to apply it.
1. Set the chunk size to the device's atomic persistence granularity (8 bytes for PM; 512 B or 4 KiB for hard drives) (section 3.1, p. 843).
2. Specify `can_result_from_partial_write` as each chunk either corresponding to the old durable state or to the old durable state updated with the write (Listing 2, p. 843).
3. Treat the read state as the full operation result and the durable state as a nondeterministic subset of chunk writes; a flush's postcondition equates them (section 3.1, p. 843).
4. Prove PoWER permissions against all new durable states before the write; after it, reason about the single prophesized durable state (section 3.1, p. 843).

Verus form. Inference: define `PersistentMemoryRegionView` and the open `spec fn`s as the listings do, maintain the model in ghost state, and prove the executable PM wrapper refines it. The paper's PM model (not the prophecy idea itself) overapproximates crash states: it includes reorderings that hardware may forbid, which keeps the proof conservative (section 5.3, pp. 849–850).

## technique: domain proof strategies

The paper classifies durable updates into four categories (tentative, committing, recovery, in-place) and gives a proof strategy for each (section 3.3, pp. 844–845). It provides library lemmas for tentative and committing writes and a generic redo journal component for recovery writes; it has no library support for in-place writes.

- tentative writes have no effect on the abstract state until a later write; prove only that the modified addresses are unreachable during recovery, not anything about the bytes (Dafny lemma `Lemma_TentativeWritePermitted`, Listing 5, p. 846)
- committing writes change the abstract state with one crash-atomic write; the library lemma ensures there are only two crash states, the write dropped or applied
- recovery writes occur during a recovery procedure; prove they modify only bytes a completed recovery will write, and that recovery is idempotent
- in-place writes non-atomically modify user-visible state; “We have not yet had experience verifying storage systems with weakly crash-consistent semantics, so we currently have no support in our libraries for reasoning about in-place writes.” (p. 845); the developer must prove the PoWER preconditions directly

Application steps: classify each durable update, choose its category's recovery argument, call the library lemma that discharges the quantified permission where one exists, and reason directly for in-place updates. Inference: this classification can be encoded as Rust proof lemmas over a region's abstract reachability map.

## technique: corruption model and corruption-detecting Boolean

What it is. A read postcondition uses `maybe_corrupted(bytes, true_bytes, addrs)`: each returned byte equals the true byte xor an arbitrary mask restricted by a per-address corruption mask (Listing 6, p. 847). The device model has one corruption-bitmask bit per storage bit; the number of 1s is bounded by a constant c opaque to the verified code, and an axiom says byte sequences with Hamming distance in [1, c] have different CRCs. For the CRC-64 ECMA variant used, c = 1 for arbitrary-length data (section 4.1, p. 846). The caller must CRC-check bytes before use. PM's 8-byte write granularity makes storing a CRC inside the block with its data crash-unsafe (section 4.2, p. 846). The CDB is an 8-byte integer that takes only two values, one for false and one for true; the authors use `CRC(0)` and `CRC(1)`. Being 8 bytes, it is written to PM atomically, and its valid values are statically known, so it can be checked for corruption without a separate CRC (section 4.2, p. 847).

How to apply it.
1. Model reads as potentially corrupted and require `self.inv()` and bounds (Listing 6).
2. Check the CRC before using or returning data read from storage (sections 4 and 4.1, p. 846).
3. Reserve an 8-byte CDB and two versions of the data structure plus their CRCs (Figure 1, p. 847).
4. Tentatively write the new version and its CRC to the invalid location; flush; use a committing write to flip the CDB; flush (section 4.2, p. 847).
5. The CDB indicates which version is valid at recovery time; for the next update, write the other location and flip the CDB back (section 4.2, p. 847). Inference: recovery should also verify the selected version's CRC before use.

Verus form. Inference: write `open spec fn maybe_corrupted`, a CDB as a fixed 8-byte integer with two valid values, and `ensures` clauses that require a successful CRC check before a record is cast. Use `Tracked` permissions for the PoWER write. The paper's `#[repr(C)]` annotation is a Rust directive, and `#[derive(PmCopy)]` generates Verus ghost code plus compile-time assertions checked by the Rust compiler (section 5.1.1, pp. 848–849).

Evidence and limits. “To our knowledge, ours is the first proven-correct algorithm for atomic updates on PM with corruption detection” (section 4.2, p. 847). The paper argues NOVA-Fortis's Tick-Tock CRC update is not correct in its corruption model or VeriBetrKV's, because CRC collisions between arbitrary user-level values are plausible; this is why CDB values are chosen so that neither is likely to be corrupted into the other (section 4.2, p. 847). The model does not claim CRCs are collision-free; it relies on the bounded-bit-flip axiom. Types must have fixed size, and the C APYBARA KV design statically allocates capacity and keeps all keys in a volatile index (sections 5.1 and 5.1.3, pp. 847, 849).

## concurrency, implementation evidence, and trusted state
PoWER supports concurrent reads, for example under a reader-writer lock, and concurrent reads and writes to multiple statically allocated regions as long as no single region has read-write or write-write concurrency. Atomic PoWER adds durable resources owned by atomic invariants and completion objects returned when a write consumes a single-use permission (section 3.4, pp. 845–846). The concurrent variants use a linearizable API specified with logical atomicity and proof callbacks in Verus (section 5.1.2, p. 849).

Table 2 reports C APYBARA KV totals of 5,244 trusted lines, 14,255 specification/proof lines, and 5,531 executable implementation lines; C APYBARA NS has 414 trusted, 673 spec/proof, and 278 implementation lines (p. 850). The paper gives proof-to-code ratios of 2.6 and 2.4 respectively (section 6.1, p. 850). On a machine with an Intel Core i7-11850H (8 physical cores), verification takes 54 seconds for KV with one thread and 23 seconds with eight; NS takes 12 seconds with one thread (section 6.1, p. 850). The microbenchmarks use 25M records, 64-byte keys, 1 KiB values, and 8-byte list elements; YCSB uses 15M keys and five runs per system, on a 128 GB Intel Optane DC PMM machine (section 6.2, pp. 850–851). Inference: these denominators and settings matter; the numbers are benchmark and line-count measurements, not proof completeness rates.

Trusted code in Table 2 includes the pmcopy crate and the PoWER framework (which includes a mock PM region and PM backends for Windows and Linux). The Rocq translation (section 3.2) and the C# wrapper for C APYBARA NS (section 5.2) are also trusted, as are the specifications, verifiers and compilers (section 1). The PM model's write calls a PMDK function and flush performs an sfence; the model overapproximates crash states by considering reorderings that are impossible with `clflush` and reorderings of 8-byte chunks on the same cache line, which also covers compiler reordering of independent `mov` instructions (section 5.3, pp. 849–850). C APYBARA KV does not support dynamic resizing and wastes space if fewer records than specified are stored (section 5.1.3, p. 849).

Inference: PoWER is a high-value threat reduction for VeruLaw's storage-facing generated Rust because it turns crash safety into a call-site obligation. It does not solve contract intent, arbitrary concurrent writes, compiler or hardware trust, or corruption cryptography. VL should reuse the existing Verus PoWER and `PmCopy` patterns rather than recreate a specialized crash logic.

## techniques for the catalog
- PoWER write preconditions: require a permission proving every partial-write crash state is recoverable before a durable write
- prophecy storage model: represent read and prophesized durable byte states with chunk-level partial writes
- write-category lemmas: discharge tentative and committing writes with library lemmas, recovery writes with reachability and idempotence arguments
- corruption model: allow a bounded number of corrupted bits in read postconditions and require CRC validation
- corruption-detecting Boolean: atomically select one of two fixed values to update data and CRC safely on PM
- atomic PoWER: combine durable resources and completion objects with atomic invariants for coarse-grained concurrency
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "Since a CDB is 8 bytes, it can be written to PM atomically with respect to crashes."): read the whole paper text and checked every quotation, number, page and section reference, listing reference and technique step in the study; changed the key-insight page from 839 to 840, the Table 2 page from 849 to 850, the section 3.2 pages to 844, replaced an invented `possible_crash_state` name in step 3 with the Listing 1 form, corrected the claim that every write category has a lemma (only tentative and committing do; recovery writes use the redo journal), corrected the claim that pmcopy macros are not Verus constructs (derive(PmCopy) generates Verus ghost code), corrected the flush and corruption-bound descriptions, added the CRC axiom and the Tick-Tock finding, and marked own conclusions as Inference; replaced the link with the publisher page given on the paper's first page; did not check the cited external works, the artifact appendix contents, or the evaluation figures (Figures 2 to 4, Table 3) beyond the settings stated in the text.
