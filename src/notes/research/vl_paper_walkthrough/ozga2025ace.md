# ACE: Towards A High-Assurance Isolated Virtualization Environment for RISC-V
(authored by agents unless marked 🧑)
Tag: `ozga2026ace`, [paper](https://arxiv.org/abs/2505.12995v2)

## what ACE verifies

ACE is an open-source RISC-V confidential-computing system built from a TEE security manager (TSM), hardware access controls, a hypervisor, and isolated confidential virtual machines (TVMs). Its design goal is to make verification tractable through small components and narrow interfaces. The paper states the core design rule: “Formal verification scales best when the verification can be modularized with clear abstraction boundaries, making reasoning about system invariants local.” (section 3, p. 3). It also states, “Rust aims to provide memory safety guarantees, which hold as long as only the safe fragment of the language is used.” (section 4.5, p. 8).

ACE's security claim is layered. Hardware correctness and memory safety support functional correctness and execution safety, which support confidentiality and integrity of TVM state. The paper has formally verified only the page-management subsystem so far; full implementation and top-level security proofs remain work in progress (section 7, p. 13).

## technique: design for verification with modular boundaries

What it is. Choose a simple hardware baseline, minimize cross-domain interactions, encapsulate complex operations, and keep verification in the design loop. The paper lists these as principles P1–P4 (section 3, p. 3).

How to apply it.

1. Record hardware constraints and the software-level threat model (section 3.1, p. 3).
2. Derive high-level invariants and component boundaries from those requirements (section 3.1, p. 3).
3. Prefer simple standardized hardware primitives and static configuration over dynamic, feature-rich mechanisms (section 3.2, p. 4).
4. Implement modules, write specifications for their interfaces, and simplify the interface if its proof is too complex (section 4.5, p. 8).
5. Check specifications and proofs continuously as code changes (section 4.5, p. 8).

Verus form. Inference: mirror each TSM module with a Rust module exposing a small contract. Express representation invariants as predicates, use preconditions and postconditions for interfaces, and prove composition through explicit lemmas. Run verification on every change. ACE uses RefinedRust and Rocq; this proposed adaptation is not evaluated in the paper.

Evidence. ACE's TSM has about 8,000 Rust lines and 55 unsafe blocks; about 240 lines are unsafe, including about 90 lines of inline assembly (section 4.5, p. 8). These are counts of this implementation, not a general safety bound.

## technique: static confidential-memory partitioning

What it is. Divide main memory once into contiguous confidential and non-confidential regions and enforce access with RISC-V PMP and IOPMP hardware. The evaluation board lacks IOPMP (section 4.1, p. 5, footnote 4). Static partitioning simplifies ownership reasoning at the cost of possible over- or under-allocation (section 3.2, p. 4).

Steps.

1. During initialization, choose the two regions and configure hardware access controls (section 4.1, p. 5).
2. Keep TSM stacks, heaps, save-state areas, and TVM code/data in confidential memory (section 4.1, p. 5).
3. Give the hypervisor ownership of non-confidential memory while denying it access to confidential memory (section 4.1, p. 5).
4. On a domain switch, reconfigure memory access controls to protect the outgoing domain from the next domain (section 4.2, pp. 6–7).

Verus form. Inference: define a ghost ownership map from address ranges to domains and prove that every allocator and switch preserves disjointness. Use typed wrappers for confidential and non-confidential addresses so ABI functions cannot accept the wrong class.

Limits. The paper assumes hardware correctness (section 3.2, p. 5) and excludes physical attacks and micro-architectural side-channel attacks from its threat model (section 2.2, p. 3). Inference: the verified subsystem does not establish protection against these excluded attacks.

## technique: page tokens as a safe abstraction over unsafe allocation

What it is. The allocator represents each confidential page with a Rust token containing its address and size. Its formal model additionally tracks the stored words; its invariant states exclusive ownership of the represented region. The token hides low-level pointer operations behind safe Rust methods (section 4.5, Figure 5, p. 9).

Steps.

1. Define a token model with `page_loc`, `page_val`, and `page_sz` in the formal model (section 4.5, p. 9).
2. State that the token exclusively owns its memory region and is well formed (Figure 5, section 4.5, p. 9).
3. Specify alignment and bounds conditions for a successful `read`; check them before unsafe access and return an error for invalid input (Figure 5, section 4.5, p. 9).
4. Verify the safe wrapper and its unsafe implementation against the specification.
5. Split large free-page tokens to allocate smaller pages; merge contiguous smaller tokens when pages are returned. Store free tokens in a tree whose levels correspond to architectural page sizes, with 32 B of extra information per non-empty node (section 5.4, p. 12).

Verus form. Inference: encode `Page` as a proof-oriented struct with a ghost range and contents, and put exclusivity and well-formedness in its invariant. Give `read` preconditions for alignment and bounds and an `ensures` clause relating the result to the ghost contents. Keep the unsafe pointer operation inside one function whose contract clients must satisfy.

Evidence. RefinedRust verification covered about 600 lines (approximately 8% of the TSM), with 340 lines of RefinedRust specifications, 1,300 lines of shared Rocq specifications, and 1,400 manually written Rocq proof lines (section 4.5, p. 9). It found two bugs: “The verification process uncovered two bugs in the unsafe parts of the page allocator implementation.” (section 4.5, p. 9), specifically incorrect bounds checking after pointer arithmetic in initial-token creation and a logical error assigning a new region. When all represented memory is allocated in 4 KiB pages, the 9-byte tokens occupy 2.25 MiB of ACE heap for every 1 GiB of confidential memory, or 0.23% (section 5.4, p. 12). The paper describes the scope as “A single page token occupies 9 B in main memory regardless of the page size it represents.” (section 5.4, p. 12). The denominator is one GiB of represented confidential memory; the comparison to TDX/SEV-SNP is approximately 0.4% of system memory (section 5.4, p. 12).

## technique: typed ABI address validation

What it is. The TSM defines dedicated Rust types for memory address classes. At ABI entry points, it validates address arguments to obtain typed addresses that later code can trust. Hypervisor inputs must refer to non-confidential memory; TVM inputs use guest physical addresses (section 4.5, p. 8).

Steps.

1. Define separate address types for hypervisor-owned and TVM-owned addresses.
2. At each ABI boundary, check that the supplied address belongs to the permitted region.
3. Construct the typed value only after the check.
4. Use the typed value in the rest of the security manager to enforce address-class distinctions.

Verus form. Inference: validate raw addresses in executable constructors and prove that successful results satisfy the permitted address-range predicates. Internal contracts can then require validated wrappers.

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

Proved: memory safety and functional correctness of the page-token abstraction and page allocator, including their unsafe operations (section 4.5, p. 9). The complete TSM and top-level security properties remain unverified. Establishing correspondence between page-table configuration and RISC-V semantics, and information-flow tracking for non-interference proofs with explicit reclassification, are ongoing work (section 4.5, p. 9). Measured: CoreMark means over three runs (4/8/16 processors: TVM 29,373±713; 31,614±497; 32,822±40), Nginx network experiments averaged over five runs, and boot times averaged over eight measurements (sections 5.1–5.3, pp. 10–11). TVM network throughput reaches 48% of a normal VM in the stated setup (section 5.2, p. 11). Inference: this throughput ratio means a 52% reduction, although the introduction and conclusion describe the overhead as up to 48%. Boot time is about 15 seconds for TVMs versus 10 seconds for VMs in the shown configuration (section 5.3, p. 11).

Assumed: hardware correctness (section 3.2, p. 5). OpenSBI and the TSM both run in M mode (section 4, p. 5). The evaluation board lacks a hardware root of trust, so the authors hard-coded an attestation key for the experiment (section 5, p. 10). Inference: deployment assurance also depends on the compiler, proof-checking tools, cryptographic implementation, and unverified privileged code. Memory-safe Rust alone does not establish ACE’s confidentiality or integrity goal.

## techniques for the catalog

- verification-oriented architecture: choose small modules, narrow interfaces, static configuration, and continuous proof checking
- static memory partitioning: separate confidential and non-confidential ranges with hardware ownership rules
- page-token abstraction: represent exclusive page ownership and bounds in a verified safe wrapper over unsafe memory
- typed ABI validation: convert checked raw addresses into domain-specific types at entry points
- modular Rust verification: generate and continuously check per-function specifications and composed invariants
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The verification process uncovered two bugs in the unsafe parts of the page allocator implementation."): checked all quotations, numbers, section and page references, technique steps, verification scope, and evaluation claims against arXiv:2505.12995v2; corrected the year and link, references, token representation and tree layout, maximum memory-overhead condition, ABI validation description, and unsupported proof and trust claims; did not check implementation code, proof artifacts, cited works, or reproduce experiments.
