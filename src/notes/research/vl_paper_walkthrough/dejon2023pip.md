# Pip-MPU: Formal Verification of an MPU-Based Separationkernel for Constrained Devices
(authored by agents unless marked 🧑)
Tag: `dejon2023pip`, [paper](https://doi.org/10.5121/ijesa.2023.13201)

## scope and claimed result
The paper verifies the isolation invariant of Pip-MPU, a minimalist separation kernel for constrained devices. The kernel uses an MPU and a dynamic partition tree. The authors verify three services—readMPU, findBlock, and addMemoryBlock—while 15 services exist. Their central claim is narrower than full functional correctness: the proved property is the isolation invariant (security properties plus consistency properties). The paper states, “Pip-MPU is a minimalist separation kernel for constrained devices (scarce memory and power resources).” (abstract, p. 1) It also states, “Hence, the proofs aim to verify that the memory blocks loaded in the MPU adhere to the global partition tree model and that this partition tree itself satisfies Pip's security properties.” (Section 3.3, p. 5)

The proof target is an umbrella isolation invariant containing Vertical Sharing (VS), Horizontal Isolation (HI), Kernel Data Isolation (KI), and 29 consistency properties (C). The authors explicitly warn that “To be noted, the isolation invariant is an umbrella term that hides that all properties do not participate in the isolation property, strictly speaking.” (Section 3.1, p. 5) VS requires child blocks to come from the parent’s blocks. HI requires sibling memory spaces not to overlap. KI requires accessible mapped memory not to overlap configuration blocks. Consistency properties establish that metadata structures are well formed before security properties are reasoned about.

## technique 1: direct concrete-model invariant preservation

what it is and when to use it

Pip-MPU follows Pip’s direct source-code proof workflow rather than proving a high-level specification and refining it. The paper says, “Pip (MMU)'s formal proofs are directly conducted on the source code, which corresponds to the lowest specification levels of the listed kernels, so without refinement.” (Section 3.2, p. 5, quoted from the sentence “Instead, Pip (MMU)'s formal proofs…”) Use this when the implementation’s state structures are themselves the model and the target property can be expressed over those structures.

how the paper does it

1. model only the kernel effects relevant to the property: memory and MPU state. The abstract platform excludes registers and privilege mode because the selected services always execute privileged (Section 5, p. 7)
2. define partition-tree metadata, mapped blocks, accessible mapped blocks, configuration blocks, children, and the address set `AllPaddr` (Section 4.2, p. 7)
3. express VS, HI, and KI as quantified predicates over partitions and addresses; add 29 consistency predicates (Section 4.2, p. 7)
4. express each service as a Hoare triple with the same invariant before and after: `{VS & HI & KI & C} service(parameters) {VS & HI & KI & C}` (Section 3.3, p. 6)
5. chain triples because services are cooperative atomic operations and only kernel services mutate kernel metadata. The initial state is assumed to satisfy the invariant (Section 3.3, pp. 5–6)
6. prove each service with Coq over the concrete model; temporarily invalid intermediate states are allowed because only service entry and exit need the invariant (Section 3.3, p. 6)

The paper gives the key rationale: “Thus, invariants are only required to be true at the start and end of the service but are allowed to have temporary states within the execution where the invariants are not satisfied, for example during a metadata structure update.” (Section 3.3, p. 6)

Verus form

Inference: encode executable Rust service functions and ghost/specification predicates for VS, HI, KI, and C. Use `requires` for the incoming invariant, `ensures` for the outgoing invariant, and loop invariants where a service iterates over blocks. Use `assert` and proof functions to establish address-set facts. Verus has no direct Coq-style Hoare-triple syntax; the function contract is the Hoare triple. The single-core atomicity assumption must be represented as a trusted environment model or a precondition, and the initial-state invariant must be established by a boot function contract.

what evidence shows it works

The authors report complete proofs for three services and 100% estimated proof coverage for each. The setup was CoqIDE 8.13.1 on ArchLinux 5.18.1, an Intel i7-7820HQ four-core host with 16 GB RAM (Section 7.1, p. 12). `readMPU` has 11 SLOC and 76 proof lines; `findBlock` has 14 SLOC and 81 proof lines; `addMemoryBlock` has 25 SLOC and 8,572 consistency-property proof lines plus 1,607 security-property proof lines (Table 2, p. 13). The paper reports 15 total services, 3 fully verified services, 29 consistency properties, and 3 security properties (Table 2, p. 13). These denominators matter: “# fully verified services 3” is out of 15, not the whole kernel.

limits and assumptions

The proof assumes correct initial boot state, cooperative single-core service execution, accurate C/HAL primitives, a simplified hardware model, correct MPU and memory hardware, and no DMA or other external memory writer. The authors state, “Incorrect assumptions imply a false context, which means everything can be proven out of it.” (Section 8.4, p. 16) They also state, “The only properties that are proved are the isolation invariant and no proofs concern functional properties.” (Section 7.3, p. 14) Inference: a generated Rust implementation could satisfy the isolation contract while returning wrong block attributes or violating read/write/execute policy, unless those properties receive separate contracts.

## technique 2: split proof by service behavior

what it is and when to use it

The paper divides services into pure informational services and modification services (the proof-sketch section, printed as a second “5” and called Section 6 in the paper's outline, p. 9). This split determines proof shape: unchanged state makes an invariant proof nearly immediate, while mutation requires case analysis over every affected property.

how the paper does it: `findBlock`

`findBlock` validates that the partition descriptor is current or a child and that the requested address lies in a mapped block; it then reads attributes without changing state (printed Section 5.1, p. 9). The proof assumes C and observes that state before and after is identical, so VS, HI, KI, and C transfer unchanged. The paper summarizes, “The service does not modify the system state; thus, the system state is the same as before the execution of the service.” (printed Section 5.1, p. 9)

Verus form

Inference: specify `find_block` with `requires` for descriptor and address validity and `ensures` for the returned attributes and unchanged ghost state. A proof can assert equality of the pre-state and post-state abstraction; executable reads remain ordinary Rust. If the function takes `&mut` state only for implementation convenience, the contract must still prove that the ghost model is unchanged.

how the paper does it: `addMemoryBlock`

`addMemoryBlock` shares a parent block with a child. The check phase either rejects bad parameters before mutation or executes all updates. The proof therefore has two exits (printed second Section 5.1, pp. 9–10):

1. incorrect parameters return NULL before updates, so the unchanged-state proof applies
2. valid parameters append the block to the child and preserve each invariant by cases

For VS, the parent list is unchanged and the child list becomes its old list plus `blockToShare`; every new child address is therefore either old child data or an address already in a parent block (printed Section 5.1, p. 10). For HI, the check phase proves the shared block is absent from sibling lists; only the selected child changes, so sibling disjointness follows (printed Section 5.1, pp. 10–11). KI is handled by cases over which partition is modified, using unchanged configuration blocks and the accessibility of the shared block (printed Section 5.1, pp. 11–12).

Inference: in Verus, write a contract for the check phase that establishes non-membership in every sibling set before mutation. Use sequence/set lemmas to show that appending one element preserves subset and disjointness facts. Keep mutation after validation, because an early return after partial updates would invalidate the invariant proof.

## technique 3: proof failure as bug detection

The proof discovered that `addMemoryBlock` failed to check whether the block was already shared with another partition. The resulting state could place one block in multiple children and violate HI. The authors report, “Indeed, the check phase omitted to verify if the block to be shared with the child partition was not already shared with another partition.” (Section 7.3, p. 14) The failed proof exposed the missing hypothesis; after code inspection, the bug was confirmed. Inference: for VL-generated Rust, a failed Verus postcondition can pinpoint a missing precondition or an actual implementation bug, but only for the modeled property and reachable states.

## what is proved, measured, and trusted

Proved: VS, HI, KI, and consistency preservation for three services. Measured: proof lines, tactics, duration, compilation time, memory footprint, and estimated coverage. Trusted: Coq kernel, compiler and translation tools, the hardware abstraction, HAL correspondence to C, hardware behavior, specification correctness, and secure bootstrapping. The authors explicitly note that formal hardware specifications were unavailable for their Cortex-M target: the authors use a simplified hardware model “because their formal specification does not exist yet”, and note the ARMv8-A formal model is “not available for Cortex-M devices” (Section 8.4, p. 16).

Inference: this method would catch isolation bugs in generated Rust if the model covers the actual allocator, MPU interface, and all mutators; it would not catch unmodeled functional, hardware, DMA, or specification errors. The 3/15 service completion ratio shows proof incompleteness, while the discovered bug demonstrates practical value before full coverage. The paper takes “the overall person-month estimate (6.29) and the current number of verified instructions (50) to compute the estimate of 0.13 person-month by line of code” (Section 8.3, p. 15). The authors add that the proof metrics “must not be taken as raw metrics without further discussion” and that the formalisation duration “could increase in the future due to new properties” (Section 8.3, p. 15).

## techniques for the catalog
- concrete-model invariant preservation: define security and consistency predicates over implementation state and prove each service preserves them with pre/post contracts
- service-category decomposition: prove read-only services by unchanged-state reasoning and mutating services by exit and state-update cases
- validate-before-mutate: perform all parameter and disjointness checks before changing metadata so early exits preserve invariants
- failed-proof bug localization: treat an unprovable invariant branch as evidence of a missing check or inconsistent assumption, then inspect the corresponding code path

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Incorrect user parameters precipitate the execution path in returning the NULL address before any updates have been done."): read the whole paper text (pages 1-20 including references and Appendix A) and checked every quotation word for word, all numbers (Table 2 values, 15/3/29/3 counts, setup, 6.29/50/0.13), the technique steps and each section and page reference against the printed page numbers; changed the abstract-attributed quotation (it is a Section 3.3 sentence beginning "Hence, the proofs aim to verify"), the umbrella-term quotation (restored its opening words), many page numbers (Sections 3.1-3.3, 4.2, 5 proof sketch, 8.4 were off by one page or more), the section label of the proof-sketch section (printed as a second "5"), the hardware-specification claim (now quoted), the "explicitly provisional" claim (replaced by quotes), and unclear "product threat" wording; did not check the Verus-form Inference paragraphs beyond confirming they are labelled as inference, the Coq proofs themselves, or the cited external works; the paper link is the DOI printed on page 1.
