# A Formal CHERI-C Semantics for Verification
(authored by agents unless marked 🧑)
Tag: `park2023formal`, [paper](https://doi.org/10.1007/978-3-031-30823-9_28)

## purpose and result

The paper builds a formal memory semantics for CHERI-C, proves its key properties in Isabelle/HOL, extracts executable OCaml code, and instantiates Gillian for concrete execution. The abstract also says: “The tool can run a CHERI-C test suite, demonstrating the correctness of our tool, and catch a good class of safety violations that the CHERI hardware might miss.” (Abstract, p. 549.) The abstract states: “we present a formal memory model that provides a memory semantics for CHERI-C programs.” (Abstract, p. 549.) The target is a capability-aware model that catches violations ordinary C tools miss, including invalid capability tags after misaligned copying.

Inference: The central technique is to make hardware metadata and exceptional behavior explicit in an abstract memory model, prove the model's laws, then use the extracted model inside an existing analysis framework. This avoids trusting an unverified ad hoc memory model. The paper assumes a “purecap” environment in which all pointers have been replaced with capabilities (Section 3, p. 554).

## technique 1: model capabilities, tags, fragments, and temporal state

Inference: Use this design when a verifier must reason about pointer metadata, byte-level copying, and use-after-free. Start with a block-offset memory model, then extend it as follows (Section 3.1, p. 554; the paper says the model is “inspired by that of CompCert”):

1. Add abstract capability values and capability fragments. A fragment represents one byte of a capability so `memcpy` can preserve a tag only when the copied bytes form a correctly aligned, ordered capability (Section 3.1, p. 554; Section 3.2, p. 555).
2. Define load and store to perform capability checks, based on the CHERI-MIPS SAIL `CL[C]` and `CS[C]` instructions, and to return capability errors on failure (Section 3.1, p. 554; Section 3.4, pp. 557–558).
3. Store tags in a separate tagged-memory map. Overwriting capability storage with primitive data invalidates the associated tag (Section 3.1, p. 554; Section 3.3, p. 556; Section 3.4, p. 558).
4. Represent freed blocks explicitly, so a load through a freed block returns `UseAfterFree` rather than silently reading stale bytes (Section 3.1, p. 554; Section 3.3, p. 556).
5. Use typed values, including `CapV`, `CapFV`, primitive values, and `Undef`, so that types can be inferred directly and proofs of the memory operations are simpler (Section 3.2, p. 555).
6. Return a result `Succ ρ` or `Fail Err`, distinguishing capability errors such as `TagViolation` from logical errors such as `UseAfterFree` (Section 3.2, pp. 555–556).

The paper's core actions are `alloc : H → N → R (H × Cap)`, `free : H → Cap → R (H × Cap)`, `load : H → Cap → τ → R (VC)`, and `store : H → Cap → VC → R(H)` (Section 3.4, p. 556). `load` checks permissions and then validates the memory representation: primitive loads require contiguous bytes, fragments require fragment cells, and capability loads additionally require equal memory-capability values and fragment indices in order before retrieving the tag (Section 3.4, p. 557). `store` writes primitive bytes, capability fragments without tags, or a capability's ordered fragments plus an aligned tag (Section 3.4, pp. 557–558).

Inference: In Verus, represent a capability as a Rust ghost/spec record containing block identity, offset, bounds, permissions, and a validity bit; represent executable memory as maps or sequences with a separate tag map and freed-block set. Use `requires` and `ensures` on `load`, `store`, `alloc`, and `free`; use proof functions and loop invariants to show fragment ordering, alignment, and tag invalidation. Verus can express these contracts, but the CHERI hardware rules and byte encoding remain modeled assumptions unless separately connected to a verified implementation.

## technique 2: prove well-formedness and operation laws

The paper defines heap well-formedness by requiring every tag address to be capability-size aligned: “The well-formedness property must hold when the heap is initialised and when memory operations mutate the heap.” (Section 3.5, p. 558.) It proves initial well-formedness and preservation after every successful action. It also requires three operation properties: valid inputs succeed; successful operations imply valid inputs; invalid inputs fail with the correct error (Section 3.5, p. 558).

Inference: Apply this proof recipe to a stateful memory API. State a representation invariant first, prove it for the initial state, and prove each mutator preserves it. Then prove soundness, completeness, and error-priority lemmas for each operation. For example, a null capability has several defects, but because CHERI checks tags first, `load` must return `TagViolation` (Section 3.5, p. 559).

The authors also adapt “good variable laws” such as load-after-allocation, load-after-free, and load-after-store (Section 3.5, p. 559). They split load-after-store into primitive and capability cases because tags can be invalidated and capability fragments can clear tagged memory; the goal is that the loaded value is correct, including its tag, rather than byte-for-byte identical in every case (Section 3.5, p. 559).

Inference: In Verus, encode well-formedness as a `spec fn`, preserve it in proof functions called from mutator proofs, and use separate lemmas for primitive and capability values. Do not model an invariant as an executable call; it is a proposition used in `requires`, `ensures`, or proof code.

## technique 3: make the model compositional and executable

The paper instantiates the heap as a partial commutative monoid with disjoint union and an empty heap, then states that well-formedness of a composed heap implies well-formedness of each part, `WfC(µ1 ⊎ µ2) ⟹ WfC(µ1) ∧ WfC(µ2)` (Section 3.5, p. 559; Section 4.1, p. 560, where the Isabelle `cancellative sep algebra` instance is used). The paper says the model conforms to both Gillian's execution and compositional memory-model definitions, relying on Properties 3.1, 3.2 and 3.6 of the Gillian paper [29] for the former, and says the predicate action execution function is not given because concrete execution does not use it (Section 4.2, pp. 561–562). The paper lists a compositional symbolic memory model as future work (Section 7, p. 564).

Inference: Use this when separation-logic verification needs local heaps. Define disjoint composition, prove associativity/commutativity where defined, identify the empty heap, and prove that well-formedness of a composed heap implies well-formedness of its parts (the direction the paper states). In Verus, this corresponds to ghost heap ownership and disjointness predicates; the exact PCM library is not supplied by this paper, so the mapping is an inference.

For execution, the authors formalize all definitions in Isabelle/HOL, constrain them to be code-generatable, prove code equations where needed, and generate an OCaml implementation using Isabelle finite mappings and the Containers framework, which yields a red-black tree mapping (Section 4.1, p. 560). They then compile CHERI-C to Gillian's GIL using ESBMC's GOTO representation, handling the typed GOTO language versus the untyped memory model by inferring the sizes of user-defined types so capability arithmetic and casts are applied correctly (Section 4.3, p. 562).

## evidence, trust, and limits

The tool ran a CHERI-C library test suite. Table 1 compares four columns across six violation programs: Gillian-C (GC), the authors' tool (GCC), ARM Morello hardware (AM), and CHERI-ESBMC (BMC). Morello misses dangling pointers and double frees; for invalid free, Gillian-C misses the violation because of a bug the authors found (since fixed) while the authors' tool catches it; and CHERI-ESBMC misses the last two cases, misaligned pointer and Listing 1.1, which involve tag invalidation. Gillian-C also reports no error for Listing 1.1, which the paper calls expected for conventional C (Section 5, p. 563, Table 1 and footnote 5). Table 2 reports runtime on one Fedora 34 machine with an 11th Gen Intel Core i7-1185G7 and 31.1 GB RAM: libc malloc 8.585 s, memcpy 1.698 s, memmove 0.318 s, and string 0.315 s, with trace logging enabled (Section 5, Table 2, p. 563). The malloc test's `max` was reduced from 20 to 9; with logging off it took 0.686 s (Section 5, p. 563, footnote 6). The authors also modified the other tests so the compiler could produce GIL code, aiming to preserve their edge cases. They report no assertion violations in either the tool or Morello, and conclude this demonstrates “a faithful implementation of CHERI-C semantics” (Section 5, pp. 563–564).

## techniques for the catalog

- capability-aware memory model: represent bounds, permissions, tags, fragments, freed blocks, and typed values explicitly
- error-refining operations: return success or a classified capability/logical error with specified priority
- invariant and operation-law proofs: prove well-formedness preservation, soundness, completeness, and good-variable laws
- compositional extraction: prove a separation-algebra interface, extract executable code, and connect it to a parametric analysis framework
- adversarial semantic tests: compare formal-tool, compiler, and hardware outcomes on spatial, temporal, and tag violations
