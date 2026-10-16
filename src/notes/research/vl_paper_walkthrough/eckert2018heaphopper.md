# HeapHopper: Bringing Bounded Model Checking to Heap Implementation Security
(authored by agents unless marked 🧑)
Tag: `eckert2018heaphopper`, [paper](https://www.usenix.org/conference/usenixsecurity18/presentation/eckert)

## scope and result

HeapHopper analyzes compiled heap allocators for exploitable metadata corruption. It combines bounded transaction models, symbolic execution with angr, security-property detectors, and concrete proof-of-concept generation. The abstract describes it as “an automated approach, based on model checking and symbolic execution, to analyze the exploitability of heap implementations in the presence of memory corruption.” (§abstract, p.99). It examines five revisions of dlmalloc, musl, and ptmalloc, finds known and new attack paths, and evaluates patches.

Inference: this is bounded counterexample search rather than a proof that an allocator is safe. For VL, the technique can search unsafe Rust or FFI allocator models for reachable bad states and generate concrete tests; Verus can then prove a stated allocator invariant for all executions within its modeled semantics.

## technique: bounded heap interaction model

What it is and when to use it. The input is a shared-object heap library and a configuration containing attacker transactions, a maximum transaction bound, and invalid security properties. The output is C source for each discovered exploit. The paper says: “HEAPHOPPER works by automatically finding sequences of transactions that make the model of the analyzed heap implementation reach states where specific security properties are violated.” (§3, p.103).

Steps from §§3–4 (pp.102–105).
1. Select compiled `malloc` and `free` entry points; source and internal data structures are unnecessary (§3, p.102).
2. Define transaction stubs for `malloc`, `free`, overflow, use-after-free, double-free, and fake-free. Constrain allocation and corruption sizes to configuration ranges (§4.1, pp.104–105).
3. Enumerate permutations of transaction types up to the bound; specialize sequences whose arguments refer to previously allocated or freed chunks (§4.2, p.105).
4. Compile each sequence into a binary and symbolically execute it against the allocator (§3, p.103).
5. After each malloc or free, test security properties such as overlapping allocation (OA), non-heap allocation (NHA), arbitrary write with constraints (AWC), and unconstrained arbitrary write (AW).
6. Generate a concrete C proof of concept by solving symbolic bytes and replacing placeholders with values (§6, p.107).

Verus form (inference). Model the heap state as a Rust ghost/spec datatype and each transaction as a state transition. A `proof fn` can prove that a concrete allocator operation preserves or violates an invariant; a bounded search harness can enumerate transaction lists at runtime or in an external tool. Verus does not symbolically execute arbitrary ELF binaries, so binary lifting and angr remain outside the Verus proof.

## technique: symbolic execution with constrained symbolic memory

What it is and when to use it. HeapHopper uses symbolic sizes and corruption bytes, but constrains them to bin boundaries and bounded ranges to control path explosion. The authors say: “We minimize path explosion by splitting our symbolic exploration into separate exploitation attempts.” (§3, p.103).

Steps from §§4.1 and 5 (pp.104–107).
1. Use execution traces of libc to identify allocation-size ranges that exercise different code paths, then put boundary values in the configuration (§4.1, p.104).
2. Insert symbolic memory at the end of each allocated chunk for overflow and into freed chunks for UAF; bound byte counts and optionally restrict values such as a one-byte NULL (§4.1, p.104).
3. Instrument heap functions to track allocated and freed chunks and to detect the configured exploitation primitive (§5.1–§5.2, pp.105–106).
4. Handle symbolic pointers with specialized memory handlers; concretize accesses to possible locations up to thresholds, using a last-resort threshold of 4,096 in the experiments (§5.3, p.106; Table 1, p.108).
5. Explore each transaction sequence depth-first, because the goal is to find one exploitable path rather than enumerate all reachable states (§5.4, p.106).

Verus form (inference). Use Rust enums for symbolic/concrete bytes and `spec fn` predicates for bounded sizes. Prove that each chosen concrete size belongs to a modeled bin range. Verus's `invariant` clauses can capture heap layout relations, but it does not supply angr's symbolic memory or pointer concretization.

## technique: PoC validation and patch comparison

What it is and when to use it. HeapHopper turns a symbolic counterexample into executable C. The PoC serves both as an explanation for a human and as a concrete check that the symbolic path was not an emulation artifact. The paper states: “The generated PoC program serves two purposes: First, it provides a concrete execution example of how a specific exploitation primitive is reached, supporting the manual analysis of HEAPHOPPER’s result. Second, it verifies that the path found by HEAPHOPPER indeed reaches the exploitation primitive in a concrete execution.” (§6, p.107).

Steps from §§6–7 (pp.107–110).
1. Solve constraints collected along a violating symbolic path and concretize symbolic bytes (§6, p.107).
2. Rewrite symbolic memory reads and placeholders in the generated source with concrete values (§6, p.107).
3. Compile and run the PoC against the exact allocator build; retain only working PoCs in the reported results (§8.3, p.111).
4. Re-run the same bounded configuration against a candidate patch and compare whether any path reaches the property (§7.7, p.110).

The 1-byte NULL case found a bypass of Chris Evans' glibc check in about four hours; an alternative patch that validates previous sizes before arithmetic yielded no OA path under the same bounds (§7.7, p.110). The generated PoCs were imperfect: about 5% for recent ptmalloc and 13% for recent dlmalloc failed due to memory-layout or symbolic-memory issues (§8.3, p.111); reported Section 7 results contain verified working PoCs.

Verus form (inference). A Verus proof can establish that a concrete test trace satisfies the modeled bad-state predicate, while the external PoC demonstrates behavior of the compiled binary. This separates proof of an abstract transition from validation of compiler/linker/allocator behavior.

## evidence and limitations

The main experiment explored 5,016 model paths on 300 one-core, 32-GB cloud nodes; average time per allocator was 16 hours and memory-exhaustion failure averaged 5% (§7, p.107). Table 1 limits model depth to values such as 7–12 transactions, allocation sizes to three concrete magnitudes, overflow sizes to 1 or 8 bytes, and memory to 32 GB (§7, p.107; Table 1, p.108). The known-attack reproduction found every listed ptmalloc attack within the configured bounds except house of force, which requires adaptive arbitrary allocation sizes (§7.6, p.110). These denominators and bounds mean “not found” is not “impossible.”

The allocator comparison found newer dlmalloc 2.8.6 stronger than 2.7.2, while ptmalloc 2.26 introduced a new arbitrary-write path associated with tcache (§§7.2–7.5, p.109). The tcache comparison found that enabling it removed constraints for overlapping and non-heap allocations and introduced fake-free arbitrary write (§7.8, pp.110–111). These are model-relative exploitability findings, not universal security proofs.

The paper identifies three limiting assumptions: manually selected transaction types, finite bounds that miss attacks outside the model, and symbolic-execution/emulation imprecision (§8.1–§8.2, p.111). It also reports false positives among non-running PoCs at 5–10% (§8.3, p.111), while Section 7 reports only verified PoCs. Inference: the trusted base includes the binary analysis engine's emulation correctness, allocator model choices, symbolic memory approximations, and the concrete compiler/runtime.

Inference: for agent-written verified Rust, HeapHopper is most useful as a pre-proof adversarial search for unsafe blocks, custom allocators, and FFI boundaries. Verus can replace some bounded checks with universal invariants, but only after the concrete heap and pointer semantics are specified. Existing work already covers bounded model checking, symbolic execution, exploit-sequence generation, and patch regression; VL should not present those mechanisms as novel. A potentially distinct VL contribution would be linking generated counterexamples to repaired Verus contracts and measuring proof repair effort.

## techniques for the catalog

- bounded heap transaction modeling — enumerate attacker operations up to a configured depth and test bad states
- constrained symbolic execution — bound sizes, bytes, pointers, and memory to reduce path and constraint explosion
- exploit PoC generation — solve symbolic constraints and validate a concrete C execution
- patch regression checking — run identical bounded models against old and new allocator checks
- model-relative security comparison — compare allocator revisions using explicit primitive, depth, and memory denominators
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Additionally, we decided to use a depth-first instead of a breadth-first path exploration technique, which led to a significant speedup."): checked the complete paper including model design, all transaction types, symbolic execution, detectors, PoC generation, evaluation tables, limitations, related work, and appendices; corrected the NHA definition, detector checkpoints, table page and publisher link, and removed an unsupported cryptographic abstraction reference; did not reproduce allocator experiments or audit angr.
