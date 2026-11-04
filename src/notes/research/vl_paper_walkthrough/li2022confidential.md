# Design and Verification of the Arm Confidential Compute Architecture
(authored by agents unless marked 🧑)
Tag: `li2022confidential`, [paper](https://www.usenix.org/conference/osdi22/presentation/li)

VIA: Coq verification of Arm CCA firmware (RMM, EL3M; C + asm prototype)
- implementation refines layered specs, top spec simulates an ideal secure system
  - trust only ~200 lines of Coq (ideal model, 0.2K)
- 20.6K Coq lines, 45 layers (relaxed-memory machine, spinlock, 3 EL3M, 39 RMM, ideal)
- excluded: availability, side channels, physical DRAM attacks, init asm, crypto library
- four techniques: mover oracle queries, permutation conditions, register accounting, ideal model

layered refinement + ideal model
- 3 simulation relations: other state, Data granules, register/VCPU contexts
  - assumed at boot, proved preserved across RMM, hypervisor, Realm
- ideal model: exclusive Realm memory and REC registers
  - 6 declassification rules: init from immutable buffer, NS memory outside PAR, register exchange on traps
  - reclaimed Realm memory: later access fails rather than leaking
- Verus adaptation (inference): ghost state + simulation relation
  - needs explicit declassification and failed-access model

mover oracle queries (concurrency)
- oracle supplies other CPUs' events, interleaving left abstract
- classify local events: RightMover (lock acquire), LeftMover (release), NoneMover
  - queries move before RightMovers, after LeftMovers
  - merge consecutive queries, refine event sequence to aggregate event
- 9 layers reduce RTT ops to atomic steps: every non-empty entry has unique delegated granule

permutation conditions (Arm relaxed memory)
- split code into DRF and non-DRF; non-DRF proved against VRM's Promising Arm permutations
- 6 conditions: REC-list + 5 from VRM
  - NO-BARRIER-MISUSE, TRANSACTIONAL-PAGE-TABLE, SEQUENTIAL-TLB-INVALIDATION, WRITE-ONCE-KERNEL-MAPPING, MEMORY-ISOLATION
- found REC.Destroy bug: counter decrement reordered before list-entry clear
  - fix: release semantics
- Verus would need faithful relaxed-memory model; assuming conditions leaves them unproved

register accounting (C + asm)
- AAPCS64: after C call keep r0, r19-r29, sp; others Unknown
- asm calling C must not read Unknown; asm called by C preserves callee-saved, returns via link register
- proved no leakage via Unknown GPRs on Realm entry and return to hypervisor

bugs found
- wrong bounds, lock misuse, caller-saved registers not cleared on return to hypervisor
- NS granule not locked/rechecked on Realm exit
- REC.Destroy ordering
- two Data granules for one Realm address: hypervisor could replace backing data of an IPA, breaking integrity
- not claimed to find all bugs

catalog techniques
- layered refinement
- mover oracle log reduction
- relaxed-memory permutation conditions
- cross-language register accounting
- declassification simulation
