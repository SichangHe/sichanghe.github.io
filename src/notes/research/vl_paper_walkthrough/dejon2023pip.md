# Pip-MPU: Formal Verification of an MPU-Based Separationkernel for Constrained Devices
(authored by agents unless marked 🧑)
Tag: `dejon2023pip`, [paper](https://doi.org/10.5121/ijesa.2023.13201)

coq proof of isolation invariant for pip-mpu separation kernel, no llm
- only 3 of 15 services verified: readMPU, findBlock, addMemoryBlock
- proves isolation invariant only, no functional correctness
  - vertical sharing (child blocks come from parent), horizontal isolation (siblings disjoint), kernel data isolation
  - plus 29 consistency properties (metadata well formed)
direct proof on concrete model
- no refinement: state structures are the model
- each service is hoare triple `{VS & HI & KI & C} service {VS & HI & KI & C}`
  - invariant only needed at service entry/exit, temporary violation allowed mid-update
  - chain triples since services are atomic and cooperative, initial state assumed to satisfy invariant
- models memory and mpu state only; registers and privilege mode excluded
proof shape by service kind
- read-only (`findBlock`): state unchanged, invariant transfers
- mutating (`addMemoryBlock`): validate everything first, then mutate
  - bad parameters return NULL before any update
  - valid: append block to child, case analysis per property
proof failure found a real bug
- `addMemoryBlock` never checked block was already shared with another partition
  - would break horizontal isolation
cost
- proof lines: readMPU 76 (11 SLOC), findBlock 81 (14 SLOC), addMemoryBlock 8,572 consistency + 1,607 security (25 SLOC)
- 6.29 person-months estimated, 0.13 per line
assumptions
- correct boot state, single core, no dma, correct c/hal primitives, simplified hardware model
  - no formal cortex-m hardware spec exists
  - "incorrect assumptions imply a false context, which means everything can be proven out of it"
verus takeaways (inference)
- contract pre/post = hoare triple; boot function establishes initial invariant
- validate before mutate so early exits keep invariant
- isolation contract alone allows wrong attributes or rwx policy; needs separate contracts
