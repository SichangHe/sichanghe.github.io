# ACE: Towards A High-Assurance Isolated Virtualization Environment for RISC-V
(authored by agents unless marked 🧑)
Tag: `ozga2025ace`, [paper](https://doi.org/10.48550/arxiv.2505.12995)

## what ACE verifies

ACE is an open-source RISC-V confidential-computing system built from a TEE security manager (TSM), hardware access controls, a hypervisor, and isolated confidential virtual machines (TVMs). Its design goal is to make verification tractable through small components and narrow interfaces. The paper states the core design rule: “Formal verification scales best when the verification can be modularized with clear abstraction boundaries, making reasoning about system invariants local” (section 3, p. 3). It also states, “Rust aims to provide memory safety guarantees, which hold as long as only the safe fragment of the language is used” (section 3.2, p. 5).

ACE's security claim is layered. Hardware correctness and memory safety support functional correctness and execution safety, which support confidentiality and integrity of TVM state. The paper has formally verified only the page-management subsystem so far; full implementation and top-level security proofs remain work in progress (conclusion, p. 37).

## technique: design for verification with modular boundaries

What it is. Choose a simple hardware baseline, minimize cross-domain interactions, encapsulate complex operations, and keep verification in the design loop. The paper lists these as principles P1–P4 (section 3, p. 3).

How to apply it.

1. Record hardware constraints and the software-level threat model (section 3.1, p. 3).
2. Derive high-level invariants and component boundaries from those requirements (section 3.1, p. 3).
3. Prefer simple standardized hardware primitives and static configuration over dynamic, feature-rich mechanisms (section 3.2, p. 4).
4. Implement modules, write specifications for their interfaces, and simplify the interface if its proof is too complex (section 4.5, p. 8).
5. Check specifications and proofs continuously as code changes (section 4.5, p. 8).

Verus form. Inference: mirror each TSM module with a Rust module exposing a small contract. Put representation invariants in `invariant` clauses on proof-oriented types, use `requires` and `ensures` for ABI contracts, and prove module composition through explicit lemmas. Continuous verification should run Verus on every change. This is an inference because ACE uses RefinedRust and Rocq, not Verus.

Evidence. ACE's TSM has about 8,000 Rust lines and 55 unsafe blocks; about 240 lines are unsafe, including about 90 lines of inline assembly (section 4.5, p. 8). These are counts of this implementation, not a general safety bound.

## technique: static confidential-memory partitioning

What it is. Divide physical memory once into contiguous confidential and non-confidential regions and enforce access with RISC-V PMP/IOPMP hardware. Static partitioning simplifies ownership reasoning at the cost of possible over- or under-allocation (section 3.2, p. 4).

Steps.

1. During initialization, choose the two regions and configure hardware access controls (section 4.1, p. 6).
2. Keep TSM stacks, heaps, save-state areas, and TVM code/data in confidential memory (section 4.1, p. 6).
3. Give the hypervisor ownership of non-confidential memory while denying it access to confidential memory (section 4.1, p. 6).
4. Preserve the partition across runtime domain switches.

Verus form. Inference: define a ghost ownership map from address ranges to domains and prove that every allocator and switch preserves disjointness. Use typed wrappers for confidential and non-confidential addresses so ABI functions cannot accept the wrong class.

Limits. The paper assumes hardware correctness and excludes physical and micro-architectural side channels from its threat model (section 2.2, p. 3). Therefore the partition proof does not establish those properties.

## technique: page tokens as a safe abstraction over unsafe allocation

What it is. The allocator represents each confidential page with a token that records its location, contents, and size, and whose invariant states exclusive ownership of the represented region. The token hides low-level pointer operations behind safe Rust methods.

Steps.

1. Define a token model with `page_loc`, `page_val`, and `page_sz` in the formal model (section 4.5, p. 8).
2. State that the token exclusively owns its memory region and is well formed (Figure 5, section 4.5, p. 8).
3. For `read`, require aligned offsets and bounds within the page; return an error for invalid input before unsafe access (Figure 5, section 4.5, p. 8).
4. Verify the safe wrapper and its unsafe implementation against the specification.
5. Allocate and deallocate by splitting and merging contiguous tokens. A tree stores one node per non-empty level, so large unallocated ranges stay compact (section 5.4, p. 12).

Verus form. Inference: encode `Page` as a proof-oriented struct with a ghost range and contents, and put exclusivity and well-formedness in its invariant. Give `read` preconditions for alignment and bounds and an `ensures` clause relating the result to the ghost contents. Keep the unsafe pointer operation inside one function whose contract clients must satisfy.

Evidence. RefinedRust verification covered about 600 lines (approximately 8% of the TSM), with 340 lines of RefinedRust specifications, 1,300 lines of shared Rocq specifications, and 1,400 manually written Rocq proof lines (section 4.5, p. 9). It found two bugs: “The verification process uncovered two bugs in the unsafe parts of the page allocator implementation” (section 4.5, p. 9), specifically incorrect bounds checking after pointer arithmetic in initial-token creation and a logical error assigning a new region. The allocator's 9-byte token representation yields 2.25 MiB heap for every 1 GiB of confidential memory, or 0.23% (section 5.4, p. 12). The paper describes the scope as “A single page token occupies 9 B in main memory regardless of the page size it represents” (section 5.4, p. 12). The denominator is one GiB of represented confidential memory; the comparison to TDX/SEV-SNP is approximately 0.4% of system memory (section 5.4, p. 12).

## technique: typed ABI address validation

What it is. ABI entry points accept dedicated Rust types for each address class. The TSM validates raw inputs once, producing a typed non-confidential or guest-physical address that later code can trust (section 4.3, p. 8).

Steps.

1. Define separate address types for hypervisor-owned and TVM-owned addresses.
2. At each ABI boundary, check that the supplied address belongs to the permitted region.
3. Construct the typed value only after the check.
4. Use the typed value in the rest of the security manager, preventing accidental access to confidential memory.

Verus form. Inference: make constructors proof functions requiring range predicates and returning wrappers whose invariants establish ownership. ABI contracts should require the wrappers rather than raw integers.

## technique: continuous modular verification with RefinedRust

What it is. RefinedRust gives each Rust function a specification, generates a Rocq model and proof template, and checks the result continuously in CI. Automatic tactics discharge routine goals; proof engineers add hints when automation fails (section 4.5, p. 8).

Steps.

1. State module invariants during design.
2. Annotate functions and data structures after implementation.
3. Generate the formal model and proof template.
4. Add interactive proof hints for unresolved goals.
5. Check specifications and proofs into CI; reject code changes that break them (section 4.5, p. 8).

Verus form. Inference: Verus can fill the same role for supported Rust by keeping executable code, specifications, and proof lemmas together and running verification in CI. RefinedRust's Rocq translation and unsafe-code coverage are not evidence about Verus's coverage.

## what is proved, measured, and trusted

Proved: page allocator memory safety and functional correctness for the verified subsystem; safe wrappers around unsafe operations; typed isolation invariants for the page-token abstraction. Not proved: the complete TSM, all ACE security properties, hardware correctness, information-flow non-interference, and full implementation refinement. Measured: CoreMark means over three runs (4/8/16 processors: TVM 29,373±713; 31,614±497; 32,822±40), Nginx network experiments averaged over five runs, and boot times averaged over eight measurements (sections 5.1–5.3, pp. 10–12). TVM network throughput reaches 48% of a normal VM in the stated setup; this is a throughput ratio, not a 48% overhead. Boot time is about 15 seconds for TVMs versus 10 seconds for VMs in the shown configuration (section 5.3, p. 12).

Trusted: the RISC-V hardware and its assumed correctness, RefinedRust/Rocq, compiler and runtime, cryptographic primitives, and the unverified portions of ACE. Inference: the threat to agent-written verified Rust is high when agents treat memory-safe Rust as a complete security proof. ACE demonstrates that a small typed abstraction can expose and verify unsafe boundaries, but its own top-level security argument is unfinished.

## techniques for the catalog

- verification-oriented architecture: choose small modules, narrow interfaces, static configuration, and continuous proof checking
- static memory partitioning: separate confidential and non-confidential ranges with hardware ownership rules
- page-token abstraction: represent exclusive page ownership and bounds in a verified safe wrapper over unsafe memory
- typed ABI validation: convert checked raw addresses into domain-specific types at entry points
- modular Rust verification: generate and continuously check per-function specifications and composed invariants
Checked 2026-10-15 against paper ozga2025ace: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
