# Pip-MPU: Formal Verification of an MPU-Based Separationkernel for Constrained Devices
(authored by agents unless marked 🧑)
Tag: `dejon2023pip`, [paper](https://doi.org/10.5121/ijesa.2023.13201)

## scope and claimed result
The paper verifies the isolation invariant of Pip-MPU, a minimalist separation kernel for constrained devices. The kernel uses an MPU and a dynamic partition tree. The authors verify three services—readMPU, findBlock, and addMemoryBlock—while 15 services exist. Their central claim is narrower than full functional correctness: the proved property is isolation plus consistency assumptions. The paper states, “Pip-MPU is a minimalist separation kernel for constrained devices (scarce memory and power resources).” (abstract, p. 1) It also states, “The proofs verify that the memory blocks loaded in the MPU adhere to the global partition tree model and that this partition tree itself satisfies Pip's security properties.” (abstract, p. 1)

The proof target is an umbrella isolation invariant containing Vertical Sharing (VS), Horizontal Isolation (HI), Kernel Data Isolation (KI), and 29 consistency properties (C). The authors explicitly warn that “The isolation invariant is an umbrella term that hides that all properties do not participate in the isolation property, strictly speaking.” (Section 3.1, p. 4) VS requires child blocks to come from the parent’s blocks. HI requires sibling memory spaces not to overlap. KI requires accessible mapped memory not to overlap configuration blocks. Consistency properties establish that metadata structures are well formed before security properties are reasoned about.

## technique 1: direct concrete-model invariant preservation

what it is and when to use it

Pip-MPU follows Pip’s direct source-code proof workflow rather than proving a high-level specification and refining it. The paper says, “Pip (MMU)'s formal proofs are directly conducted on the source code, which corresponds to the lowest specification levels of the listed kernels, so without refinement.” (Section 3.2, p. 4) Use this when the implementation’s state structures are themselves the model and the target property can be expressed over those structures.

how the paper does it

1. model only the kernel effects relevant to the property: memory and MPU state. The abstract platform excludes registers and privilege mode because the selected services always execute privileged (Section 5, pp. 7–8)
2. define partition-tree metadata, mapped blocks, accessible mapped blocks, configuration blocks, children, and the address set `AllPaddr` (Section 4.2, p. 6)
3. express VS, HI, and KI as quantified predicates over partitions and addresses; add 29 consistency predicates (Section 4.2, p. 6)
4. express each service as a Hoare triple with the same invariant before and after: `{VS & HI & KI & C} service(parameters) {VS & HI & KI & C}` (Section 3.3, p. 5)
5. chain triples because services are cooperative atomic operations and only kernel services mutate kernel metadata. The initial state is assumed to satisfy the invariant (Section 3.3, p. 5)
6. prove each service with Coq over the concrete model; temporarily invalid intermediate states are allowed because only service entry and exit need the invariant (Section 3.3, p. 5)

The paper gives the key rationale: “Thus, invariants are only required to be true at the start and end of the service but are allowed to have temporary states within the execution where the invariants are not satisfied, for example during a metadata structure update.” (Section 3.3, p. 5)

Verus form

Inference: encode executable Rust service functions and ghost/specification predicates for VS, HI, KI, and C. Use `requires` for the incoming invariant, `ensures` for the outgoing invariant, and loop invariants where a service iterates over blocks. Use `assert` and proof functions to establish address-set facts. Verus has no direct Coq-style Hoare-triple syntax; the function contract is the Hoare triple. The single-core atomicity assumption must be represented as a trusted environment model or a precondition, and the initial-state invariant must be established by a boot function contract.

what evidence shows it works

The authors report complete proofs for three services and 100% estimated proof coverage for each. The setup was CoqIDE 8.13.1 on ArchLinux 5.18.1, an Intel i7-7820HQ four-core host with 16 GB RAM (Section 7.1, p. 12). `readMPU` has 11 SLOC and 76 proof lines; `findBlock` has 14 SLOC and 81 proof lines; `addMemoryBlock` has 25 SLOC and 8,572 consistency-property proof lines plus 1,607 security-property proof lines (Table 2, p. 13). The paper reports 15 total services, 3 fully verified services, 29 consistency properties, and 3 security properties (Table 2, p. 13). These denominators matter: “# fully verified services 3” is out of 15, not the whole kernel.

limits and assumptions

The proof assumes correct initial boot state, cooperative single-core service execution, accurate C/HAL primitives, a simplified hardware model, correct MPU and memory hardware, and no DMA or other external memory writer. The authors state, “Incorrect assumptions imply a false context, which means everything can be proven out of it.” (Section 8.4, p. 15) They also state, “The only properties that are proved are the isolation invariant and no proofs concern functional properties.” (Section 7.3, p. 14) Inference: a generated Rust implementation could satisfy the isolation contract while returning wrong block attributes or violating read/write/execute policy, unless those properties receive separate contracts.

## technique 2: split proof by service behavior

what it is and when to use it

The paper divides services into pure informational services and modification services (Section 5, p. 8). This split determines proof shape: unchanged state makes an invariant proof nearly immediate, while mutation requires case analysis over every affected property.

how the paper does it: `findBlock`

`findBlock` validates that the partition descriptor is current or a child and that the requested address lies in a mapped block; it then reads attributes without changing state (Section 5.1, p. 8). The proof assumes C and observes that state before and after is identical, so VS, HI, KI, and C transfer unchanged. The paper summarizes, “The service does not modify the system state; thus, the system state is the same as before the execution of the service.” (Section 5.1, p. 8)

Verus form

Inference: specify `find_block` with `requires` for descriptor and address validity and `ensures` for the returned attributes and unchanged ghost state. A proof can assert equality of the pre-state and post-state abstraction; executable reads remain ordinary Rust. If the function takes `&mut` state only for implementation convenience, the contract must still prove that the ghost model is unchanged.

how the paper does it: `addMemoryBlock`

`addMemoryBlock` shares a parent block with a child. The check phase either rejects bad parameters before mutation or executes all updates. The proof therefore has two exits (Section 5.1, pp. 8–9):

1. incorrect parameters return NULL before updates, so the unchanged-state proof applies
2. valid parameters append the block to the child and preserve each invariant by cases

For VS, the parent list is unchanged and the child list becomes its old list plus `blockToShare`; every new child address is therefore either old child data or an address already in a parent block (Section 5.1, p. 9). For HI, the check phase proves the shared block is absent from sibling lists; only the selected child changes, so sibling disjointness follows (Section 5.1, pp. 9–10). KI is handled by cases over which partition is modified, using unchanged configuration blocks and the accessibility of the shared block (Section 5.1, pp. 10–11).

Inference: in Verus, write a contract for the check phase that establishes non-membership in every sibling set before mutation. Use sequence/set lemmas to show that appending one element preserves subset and disjointness facts. Keep mutation after validation, because an early return after partial updates would invalidate the invariant proof.

## technique 3: proof failure as bug detection

The proof discovered that `addMemoryBlock` failed to check whether the block was already shared with another partition. The resulting state could place one block in multiple children and violate HI. The authors report, “Indeed, the check phase omitted to verify if the block to be shared with the child partition was not already shared with another partition.” (Section 7.3, p. 14) The failed proof exposed the missing hypothesis; after code inspection, the bug was confirmed. Inference: for VL-generated Rust, a failed Verus postcondition can pinpoint a missing precondition or an actual implementation bug, but only for the modeled property and reachable states.

## what is proved, measured, and trusted

Proved: VS, HI, KI, and consistency preservation for three services. Measured: proof lines, tactics, duration, compilation time, memory footprint, and estimated coverage. Trusted: Coq kernel, compiler and translation tools, the hardware abstraction, HAL correspondence to C, hardware behavior, specification correctness, and secure bootstrapping. The authors explicitly note that formal hardware specifications were unavailable for their Cortex-M target (Section 8.4, p. 15).

Inference: the product threat is high for isolation bugs in generated Rust if the model covers the actual allocator, MPU interface, and all mutators; it is lower for unmodeled functional, hardware, DMA, or specification errors. The 3/15 service completion ratio shows proof incompleteness, while the discovered bug demonstrates practical value before full coverage. The paper’s 6.29 person-month overall estimate and 50 verified instructions imply 0.13 person-month per instruction, but that denominator and estimate are explicitly provisional (Section 8.3, p. 15).

## techniques for the catalog
- concrete-model invariant preservation: define security and consistency predicates over implementation state and prove each service preserves them with pre/post contracts
- service-category decomposition: prove read-only services by unchanged-state reasoning and mutating services by exit and state-update cases
- validate-before-mutate: perform all parameter and disjointness checks before changing metadata so early exits preserve invariants
- failed-proof bug localization: treat an unprovable invariant branch as evidence of a missing check or inconsistent assumption, then inspect the corresponding code path

Checked 2026-10-15 against the paper by a Codex agent for pip_mpu_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
