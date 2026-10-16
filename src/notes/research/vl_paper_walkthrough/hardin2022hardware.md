# Hardware/Software Co-Assurance using the Rust Programming Language and ACL2
(authored by agents unless marked 🧑)
Tag: `hardin2022hardware`, [paper](http://arxiv.org/abs/2205.11709v1)

## scope and result

Hardin presents Restricted Algorithmic Rust (RAR), a Rust subset transpiled to Restricted Algorithmic C (RAC), then translated to ACL2 for theorem proving and to hardware/software toolchains. The abstract says, “In our first implementation of a RAR toolchain, we simply transpile the RAR source into RAC.” (Abstract, p. 202). The design reuses RAC's existing ACL2 translator and RTL books so one restricted source can target software and hardware.

RAR remains proper Rust and compiles with the standard Rust compiler, but is semantically equivalent to RAC and adopts RAC's restrictions (§4.1, p. 208). The prototype covers array-backed data structures, cryptography (including XChacha20, Poly1305, Blake2b, and X25519), and JSON lexing/parsing (§1, pp. 202–203). The paper's detailed case is a fixed-size array set with two linked lists stored in one `anext` array.

Inference: RAR is a translation-based assurance architecture, not a Verus proof of general Rust. For VL, its strongest lesson is to define a small, analyzable subset and make source-to-model correspondence explicit. The transpiler and RAC/ACL2 semantics become trusted boundaries unless separately verified.

## technique 1: restrict Rust to a hardware-verifiable subset

Use a subset when hardware synthesis, predictable resource use, and theorem-prover translation matter more than full Rust expressiveness. RAR inherits RAC's semantic restrictions and adds a C-like `for` loop macro to ease translation and migration from C/C++ (§4.1, p. 208). The aspirational toolchain favors total or terminating functions, fixed arrays, modular integers, and restricted pointer behavior; the paper contrasts these with loops, structs, arrays, and floating-point or bit-vector operations encountered in real systems (Table 1, p. 206).

The runtime library goal is to provide formally verified services and fixed-memory specializations. The paper notes that high-assurance domains often avoid dynamic allocation, and that an algebraic data type can have a functional implementation plus a fixed-memory implementation with a proof that the latter specializes the former (§2.3, p. 204). These constraints simplify hardware realization and prevent allocation errors.

Steps: (1) choose the RAC semantic subset and disallowed Rust features; (2) add only syntax whose meaning can be translated to RAC; (3) require bounded arrays and explicit integer widths where the target hardware needs them; (4) compile the resulting code with ordinary Rust to preserve a usable implementation; and (5) reject source outside the subset before proof or synthesis. Steps 1–4 are described in §4.1 and the toolchain discussion in §§2.3–2.5 (pp. 204–208); step 5 is the operational consequence of adopting a subset.

Inference: a Verus project could define a supported profile with no unsafe code, bounded containers, and explicit termination measures, then prove profile membership before generating contracts. Verus can verify ordinary Rust functions beyond this profile, but the paper's hardware equivalence requires a separately defined translation semantics.

## technique 2: transpile once, reuse compiler and prover backends

The RAR pipeline is `RAR source → Plexi → RAC source → RAC ACL2 translator → ACL2 theorem prover`; the RAC source can also go to a C/C++ compiler or FPGA HLS compiler (Fig. 3, p. 208). Plexi performs lexical and syntactic source-to-source transformations (§4.1, p. 208). The RAC translator converts imperative code into functional ACL2 code, translates loops to tail-recursive functions, automatically generates measure functions for ACL2 admission, and converts structs and arrays to functional records (§3, p. 207).

The translator maps modular arithmetic and bit-vector operations to Russinoff's RTL functions. The paper says, “Loops are translated into tail-recursive functions, with automatic generation of measure functions to guarantee admission into the logic of ACL2.” (§3, p. 207). This makes termination evidence part of translation rather than a separate manual proof for every loop.

Steps: (1) write valid RAR; (2) Plexi converts lexical and syntactic forms to RAC; (3) compile RAC to software or hardware as needed; (4) feed RAC to the RAC ACL2 translator; (5) inspect generated ACL2 records, tail recursion, measures, and RTL operations; and (6) prove theorems over that generated model. The paper reports that the generated `aset_add` translation remains readable despite two translation stages (§5.2, pp. 211–213).

Inference: Verus can play the source-language proof role, but a hardware backend needs a verified refinement theorem from Verus executable code to RTL or another target. An unverified transpiler is a major trust boundary. The RAR pattern suggests keeping generated proof models readable enough for counterexample diagnosis.

## technique 3: maintain a compact invariant for a shared-array data structure

The Arrayset uses fixed arrays `anext` and `avals`, heads `free_head` and `used_head`, and terminator `ARR_SZ = 256`. One `anext` array stores both a free list and a used list; each element belongs to exactly one list, and both lists terminate with `ARR_SZ` (§5.1, pp. 208–210). `aset_add` returns unchanged state when full or when the value already exists; otherwise it moves the free head, stores the value, links the new node at the used head, and updates the used head (Fig. 6, pp. 210–211). `aset_del` removes a matching used-list node and prepends it to the free list (Fig. 7, pp. 212–213).

The ACL2 proof defines `free-head-used-head-relation`, `arraysetp`, `no-dups`, list lengths, and a combined `good-statep`: “This function states that for a good state, the aset input satisfies the arraysetp wellformedness predicate; the free_head is not equal to the used_head, there are no duplicates of val in the avals array, and that the length of the free list plus the length of the used list is equal to the total length.” (§5.3, p. 213).

A representative theorem is `aset_add-works--thm`: if `good-statep`, `integerp val`, and the current length is below `arr_sz`, then `aset_is_element val (aset_add val aset)` equals 1 (§5.3, p. 213). ACL2 proves `aset_add` automatically; `aset_del`, which performs more updates, still requires user assistance (§5.3, p. 213).

Steps: (1) define a representation predicate for bounds, list termination, and disjoint free/used membership; (2) add content and capacity invariants such as no duplicates and total list length; (3) state operation preconditions; (4) prove each operation preserves `good-statep`; (5) state functional postconditions such as membership after insertion; and (6) use ACL2 automation, adding lemmas for operations that do not close automatically. Steps 1–5 are the definitions and theorem in §5.3; step 6 is the reported proof process.

Inference: in Verus, represent `Arrayset` with fixed arrays and ghost predicates for list reachability, disjointness, and no duplicates. A loop `invariant` should state bounds and preservation of `good_state`; `requires` should express capacity and integer constraints; `ensures` should state membership or unchanged-state behavior. Verus's arrays and sequences differ from ACL2 records, so the predicates must be recast rather than copied.

## technique 4: reason about records, loops, modular arithmetic, and bit vectors in ACL2

RAC's translator maps field and array operations to untyped record operators `AG` and `AS`, and maps conditionals and comparisons to RAC/RTL functions (§5.2, pp. 211–213). The resulting ACL2 theorem uses these records plus the RTL library. The authors emphasize that the proof effort is mostly reasoning about untyped records and RTL, and that the RTL books handle mixed arithmetic and bit-vector reasoning (§3 and §5.2, pp. 207, 211).

Inference: Verus can retain typed Rust arrays and integers, which may simplify some obligations, but hardware-level modular arithmetic still needs explicit ranges and overflow semantics. A Verus proof should state whether arithmetic is mathematical, wrapping, or target-width and connect that choice to generated hardware behavior.

## technique 5: compare verification engines by scalability bounds

The paper compares Arrayset verification with model checking, symbolic execution, and ACL2. Gryphon model checking proves the example only up to array size 3 before state-space explosion. Bakar Kiasan symbolic execution reaches size 8 before combinatorics overwhelm it (§6, p. 214). The ACL2/RAR approach supports the fixed size 256 example; `aset_add` is automatic, while `aset_del` requires assistance (§5.3 and §6, pp. 213–214).

The comparison is not a like-for-like measure of total engineer time or theorem strength. It reports the largest demonstrated size under each tool and different source/model encodings. Inference: a Verus evaluation should report array bound, solver time, proof edits, and whether the result is bounded or parametric. Passing a smaller bound is not evidence of a general proof.

## what is proved, measured, and trusted

The paper proves functional properties of RAR examples through the RAC-to-ACL2 pipeline and reports successful applications to array structures, cryptography, and JSON processing (§1, pp. 202–203; §7, p. 214). For Arrayset, it proves the stated `aset_add` theorem automatically and proves the more complex deletion operation with human assistance (§5.3, p. 213). The approach relies on the semantic equivalence of RAR and RAC, the correctness of Plexi and the RAC translator, ACL2's kernel, and the RTL books. Inference: the standard Rust compiler compiling RAR does not by itself prove equivalence to the RAC/ACL2 model.

The paper's explicit limitation is subset coverage: future work expands supported Rust features and improves ACL2 libraries to discharge more proofs automatically (§7, p. 214). The model-checking and symbolic-execution numbers are bounds for this Arrayset case: 3 and 8, respectively, not general capacities for those tools. The authors say ACL2 formalization required “a fair amount of human labor” (§7, p. 214), despite automation after the library and model work.

Inference: the threat to agent-written verified Rust is medium to high if VL needs hardware/software equivalence or unbounded low-level arithmetic. RAR already demonstrates the subset-and-transpile approach and the Arrayset invariant pattern; VL should not claim either as new. A possible contribution is a verified or proof-carrying Verus-to-hardware translation with explicit correspondence obligations and measured repair cost.

## techniques for the catalog

- restricted Rust subset: adopt RAC-like syntax and semantics so code is suitable for hardware synthesis and theorem proving
- source-to-source assurance pipeline: translate RAR to RAC, then to ACL2, C/C++, or HLS backends
- automatic loop measures: translate loops to tail recursion with termination measures for ACL2 admission
- shared-array invariant: prove free/used list disjointness, bounds, no duplicates, and capacity conservation over one backing array
- theorem-prover contracts: state `good-statep` preconditions and functional postconditions as ACL2 theorems
- bounded scalability comparison: compare model checking, symbolic execution, and ACL2 with explicit array-size limits
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
