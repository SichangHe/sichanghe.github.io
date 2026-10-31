# Velosiraptor: Code Synthesis for Memory Translation
(authored by agents unless marked 🧑)
Tag: `achermann2025velosiraptor`, [paper](https://doi.org/10.1145/3676641.3711998)

## problem and contribution

The paper targets OS code that configures memory-translation and protection hardware. Its abstract says: “We present Velosiraptor, a system that automatically generates correct, low-level OS code that programs the memory hardware of a machine.” It also says: “The Velosiraptor toolchain transforms this specification into a verified implementation that can be linked directly with the rest of the operating system.”

### what it is and when to use it

Section 2 models a mapping unit as a partial function from input address, access mode, and hardware state to an output address. The paper states: “Abstractly, all memory hardware units either successfully map an address or raise an exception.” A state contains registers and in-memory structures such as page tables; an atomic control transition consumes arguments and a state and returns a new state.

Inference: Use this abstraction when the target system has a stateful interface whose correctness can be stated as a mapping relation, including page tables, MMUs, IOMMUs, capability tables, or similar configuration devices. The abstraction separates data-plane behavior (`map`) from control-plane operations that construct the state.

The authors decompose hardware into one basic building block and two composition rules. A segment maps a contiguous input range to a contiguous output range. Enumeration combines variants that interpret shared state differently; StaticMap combines non-overlapping table entries. Their x86-64 example recursively decomposes CR3, PML4, PDPT, PDIR, and page-table entries, then uses enumeration for a page-directory entry that can represent either a large frame or a next-level table.

### how to apply it

1. Define the state fields, including register widths, memory fields, and named bit slices. Section 3.2.1 says register fields have a size and memory fields have an address and offset.
2. Define the software-visible interface and its read/write actions. Section 3.2.2 says interface fields can be `mem`, `mmio`, `reg`, or `instr`, with atomic actions that update state.
3. Define methods (`fn`) for predicates and translation. Methods may call one another and have `requires` clauses; loops and recursion are disallowed (§3.2.3).
4. Mark boolean mapping predicates with `#[pred]`; define `translate`; define synthesis targets with `synth fn` and preconditions. Listing 2’s `addmap` requires a zero virtual address, a large-page size, and aligned physical address.
5. Compose segments with `enum` and `staticmap` to build larger units. The resulting hierarchy drives both data structures and generated code (§2.3–§2.4).
6. Add an environment specification declaring external OS types and function signatures, such as allocators or capability invocations (§3.3).

The target contracts are explicit. Listing 1’s `addmap` postcondition requires translation to equal `pa + (v−va)` in range and permissions to agree with `allows`; `setperms` preserves translation while changing access; `delmap` removes the range. Section 2.2.1 also states: “Note, that there is an implicit post-condition ensuring that the behavior outside of the specified address range is not changed.”

### Verus form

Inference: Encode the state and mapping relation as Rust structs and `spec fn`s. Use `requires` for address alignment and valid-state assumptions, and `ensures` for postconditions of `addmap`, `setperms`, and `delmap`. Use executable Rust for register writes and memory updates, with proof code and loop invariants for the state-machine transitions. A `spec fn` can define the abstract `map` relation, while a proof function can establish that an implementation step preserves the relation.

Inference: The DSL’s `enum` and StaticMap composition correspond to Rust enums and collections plus invariants about disjoint ranges and variant tags. Verus can prove the modeled composition properties, but calls to actual MMIO, allocator implementations, hardware, and foreign OS APIs require contracts or remain trusted. This is an inference because the paper uses its own Rust/Z3 DSL, not Verus.

### what it is and when to use it

Section 4 formulates synthesis as finding a sequence of control-interface transitions that works for every valid initial state and argument. The paper states: “Velosiraptor solves the synthesis problem of finding a sequence of control interface invocations that move the state machine from an arbitrary start state into an end state that has the desired mapping behavior, i.e., satisfies the post-condition of the synthesis target (Listing 1).”

Inference: Use grammar-constrained synthesis when direct search over arbitrary code is too large but the target API already defines legal operations. The control interface becomes the grammar, so every candidate is a sequence of reads and writes with bit-slice assignments, masks, binary operators, symbolic values, and function parameters.

### how to apply it

1. Parse the unit and OS specifications into an operational model (§4.2 step 1–2).
2. Encode the model in SMT-LIB2 bit-vector logic and run a feasibility check (§4.2 step 3). Section 5.4 checks whether a state satisfies all mapping predicates and extracts an unsat-core to identify conflicting predicates when none does.
3. Generate candidate programs from the control-interface grammar. Each invocation initializes an argument, sets bit slices, and performs a read/write (§4.3).
4. Enumerate short sequences first and recursively expand them; for two fields the paper gives `[A,B]`, `[AA,AB,BA,BB]`, and so on (§4.3).
5. Encode each candidate as an SMT function and check its universal postcondition. Listing 4 asserts, for all initial states and arguments, that assumptions imply the goal, then calls `(check-sat)`.
6. Stop when a candidate satisfies the goal or the search space is exhausted (§4.2).

The generated x86 example (Listing 3) checks physical alignment, creates a page-entry value, sets address, page-size, present, and writable bits, writes the entry, and returns the large-page size.

### Verus form

Inference: A Verus implementation can represent candidate operations as an enum and interpret a sequence with an executable function. A recursive or iterative proof can show that every operation preserves a state invariant and that the final sequence satisfies the target `ensures`. Candidate enumeration itself can remain an external synthesizer; Verus can verify each emitted sequence against the same abstract contract. Unlike the paper’s SMT search, Verus does not automatically synthesize the sequence from a grammar.

## technique 3: domain-specific search-space reduction

The paper has several reductions, each tied to the model.

### state and API reduction

Section 4.4 first decomposes a large unit into basic blocks, reducing state and interface size. It then projects each subgoal onto only the state fields referenced by that predicate and the interface actions that can change those fields. The paper reports: “This drastically reduces the grammar of the candidate programs to only 10-100 candidate programs per subgoal.”

Inference: Apply this as dependency analysis before synthesis: collect fields read by a goal, find interface actions that write them through ReadActions/WriteActions, and discard unrelated API operations. In Verus, the analogous proof engineering is to keep invariants and lemmas scoped to the fields used by the current postcondition.

### expression reduction

For each subgoal expression, Velosiraptor extracts whether it returns a boolean or address, the bit-slice width, whether it refers to function parameters, and whether the comparison is a constant expression. Section 4.4 gives this example: “For example, if the expression does not refer to any of the arguments, we can exclude those from the list of possible expressions.” Inference: This is a typed partial-evaluation pass over the candidate grammar and can be implemented as a Rust enum of admissible expressions with a proof that each generated expression has the required type.

### divide-and-conquer and balanced trees

The paper rewrites conjunctions into conjunctive normal form, solves each subgoal independently, merges partial programs, and verifies the merged program against the original goal (§4.4). It then uses a balanced binary tree so wrong partial programs are rejected early. Section 4.5 illustrates this with four conjuncts, ten candidates each, and an assumption that half of the candidates satisfy each subgoal. It reports 263 checks with the tree versus 665 for brute-force combination. Inference: The illustrative arithmetic is inconsistent: the printed expression `2 × (4 × 10 + 5²)` equals 130, rather than the stated 94, so 263 should be treated as the paper’s reported count rather than a validated calculation.

Inference: This technique is useful whenever a specification is a conjunction of mostly independent obligations. In Verus, each sub-proof can establish a predicate over a subset of state, followed by a final lemma that combines the predicates; the independence assumptions must be stated explicitly.

### caches, barriers, and multi-phase synthesis

The paper handles delayed visibility by extending the model with outstanding writes. Phase one synthesizes under immediate visibility; phase two inserts cache-maintenance and barrier operations and re-verifies against the extended model (§4.6). Query caching avoids duplicate SMT calls, and a scheduler prioritizes tree-root queries over leaves (§5.5).

Inference: The phase split is a general method for keeping hardware timing effects out of the first search while preserving a final check under the richer model. A Verus proof would need an explicit write-buffer state and invariants connecting flush operations to visible state; the paper’s cache model is not a Verus proof.

## evidence and measured results

The authors implement Velosiraptor in Rust with Z3 4.10.2, run on an Intel Xeon W-2275 (14 cores, two hyperthreads each), Ubuntu 24.04, and use one worker per core (§5.1, §6.1). Table 1 reports median and 95th-percentile synthesis and code-generation times over 100 runs. x86-64 page tables take 1,137 ms median and 1,171 ms P95; x86 segmentation takes 12,445/12,683 ms; the Ubuntu Linux v6.2.0 kernel build takes 153,831/154,352 ms. The kernel build uses the default Ubuntu configuration without modules and 28 hardware threads (§6.2).

Table 2 reports base-10 logarithms of calculated search-space sizes under cumulative optimizations. For x86-64 page tables, the size falls from 38 with no optimizations to 13 after expression reduction and remains 13 with the tree; for Simple Page Table it falls from 23 to 3. The paper says interface and state reduction have the largest effect, while the tree primarily eliminates failing programs early rather than reducing the maximum count.

The hardware/software co-design experiment generates an Arm Fast Models component and OS code from one description. “All cases booted successfully and we observed the expected behavior.” The Barrelfish integration tests monolithic, supervisor, and userspace environments on x86-64 QEMU/KVM; “We observed that the generated code correctly programs the translation hardware, the system booted, and ran the tests successfully.”

Table 3 measures 200 iterations of `addmap`, `setperms`, and `delmap` in userspace. For x86-64, Velosiraptor is 13/13 ns map, 12/12 ns protect, and 11/12 ns unmap (P50/P95), compared with Linux 13/13, 13/13, and 12/12 ns. Barrelfish PTable is 8/8, 8/9, and 7/8 ns; generated PTable code is 8/8, 8/8, and 8/8 ns.

## what is proved, measured, and trusted

Inference: The formal check proves candidate transition sequences against the encoded behavioral model for all states and arguments satisfying `assms`; it does not prove the model matches hardware manuals, the SMT solver is sound, generated C/Rust has no backend bug, or the OS environment contracts are true. The paper measures search time, calculated search-space size, boot/integration behavior, and latency, rather than providing a machine-checked end-to-end theorem about physical hardware.

The authors explicitly report a practical limitation (§6.7): “Potential barriers to integrating the Velosiraptor-generated code into a larger OS are replacing existing, possibly tightly integrated data structures, e.g., Linux’s paging data types being passed around in the kernel instead of using high-level functions.” They also note that high-level generated functions do not expose some Linux use cases, such as swapped-out entries and NUMA balancing, although the enumeration construct could express them (§6.7).

Inference: The product threat to agent-written verified Rust is specification drift. An agent can produce a proof that satisfies an incorrect mapping contract or an environment stub, while the real MMU, allocator, or OS API behaves differently. Velosiraptor’s separation of behavioral specification, environment specification, synthesis, and final solver checking is a useful architecture for making those assumptions reviewable; its evidence does not remove the trusted hardware and backend boundary.

## techniques for the catalog

- behavioral mapping DSL — model memory translation as a partial stateful map, then compose segments with enumeration and static-map rules
- contract-directed synthesis — declare `addmap`, `setperms`, and `delmap` postconditions and search control-interface sequences that satisfy them for all valid states
- grammar-constrained generation — derive candidate programs from legal register and memory interface operations rather than arbitrary code
- predicate decomposition — split conjunctive goals into subgoals, synthesize partial programs, and merge only after each subgoal checks
- dependency-based API reduction — project state and interface operations onto fields relevant to the current goal
- balanced-tree synthesis — combine partial candidates in a tree so failed combinations are rejected before full Cartesian-product search
- delayed-write modeling — synthesize first under immediate visibility, then add buffers, cache operations, and barriers and re-verify
- SMT query caching — cache pending and completed candidate checks and schedule higher-level tree queries first
