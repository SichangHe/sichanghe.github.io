# Verifying Rust Implementation of Page Tables in a Software Enclave Hypervisor
(authored by agents unless marked 🧑)
Tag: `dai2024verifyingrust`, [paper](https://doi.org/10.1145/3620665.3640398)

## system and claims

The paper verifies the memory subsystem of HyperEnclave, a production-used Rust software trusted-execution hypervisor; the verified version is from early 2022, not identical to the July 2023 open-source release (section 1, p. 1219). Its target is spatial isolation: enclave memory must not be readable or writable by the untrusted primary OS or other enclaves, except through the marshalling buffer (sections 1, 2.1, pp. 1219, 1221). The abstract says: “We prove spatial isolation for the secure enclave though correct configuration of page tables for an early prototype of HyperEnclave.” (abstract, p. 1218). The contribution is MIRVerif, a layered Coq framework with a lightweight semantics for Rust Mid-level Intermediate Representation (MIR), pointer abstractions, functional-correctness refinement, and noninterference proofs.

The Memory and Enclave modules have 2,130 lines of Rust; 49 of the 77 Memory-module functions are verified (section 6, p. 1229). The entire effort took around 3 person-years: 20% framework, 30% invariant-preservation and noninterference theorems, 10% page-table refinement, and 40% code proofs (section 6, p. 1229). The Coq development has around 15,100 lines of proof, “plus around 4,500 lines of specification, the MIRVerif framework, and a large amount of automatically generated Coq files for the imported MIR code and layer scaffolding” (section 6, p. 1229). The 49 functions compile into 3,358 lines of `mirlight` code with 4,191 lines of proof script, or 1.25 proof lines per MIR line (section 6, p. 1229). The authors restrict the claim: “other unverified parts of HyperEnclave, such as handling of hypercalls, are the main threat to validity” (section 6.1, p. 1229), and unverified unsafe code could bypass Rust's safety rules; they manually checked the 105 unsafe blocks (section 6.1, p. 1229).

## technique: layered refinement proofs

What it is. MIRVerif separates a high-level functional model from concrete Rust code and arranges functions in dependency layers. A higher layer sees only lower-layer specifications, not their implementation (sections 1, 4, pp. 1219, 1225). The paper states: “We, however, take a more realistic approach, verifying only safety-critical functions; thereby balancing the trade-off between that additional security and available resources.” (section 3, p. 1222).

How to apply it.

1. Define a pure high-level specification for relevant interfaces (here, hypercalls) as functions on system states; specifications usually have a type like `Args * AbsState -> Ret * AbsState` (sections 3, 3.4, pp. 1222, 1224).
2. Arrange functions in layers by caller-callee order; in HyperEnclave no higher-layer function is passed as a callback to a lower layer (section 3.4, p. 1224).
3. Make each memory variable “owned” by one layer. Verify that layer's functions against concrete memory and prove refinement to the abstract-state specification (section 3.4, p. 1224).
4. Verify higher layers against lower-layer specifications only (section 4, p. 1225).
5. Where useful, insert an intermediate low specification: prove code-to-low-spec and low-spec-to-high-spec separately; refinement transitivity composes them. The paper used this only for page tables (section 4.3, p. 1226).

Verus form. Inference: Verus can mirror the interfaces with `requires` and `ensures`, ghost state, and lemmas connecting concrete data structures to abstract maps or sequences. Inference: Verus's module and visibility structure can hide implementation details, but it does not provide MIRVerif's Coq relation semantics automatically; organize verified Rust into contracts that expose only abstract state to callers and prove representation-refinement lemmas at each layer.

Evidence and limits. The paper verifies 49 functions arranged in 15 layers (sections 1, 6, pp. 1219, 1229). Layering lets verification proceed piecemeal and be amortized over time; every unverified function stays in the trusted computing base (section 4.4, pp. 1226–1227).

## technique: lightweight MIR semantics and compiler import

What it is. MIRVerif deep-embeds MIR in Coq (28 expression types and 11 statements/terminators) and defines a small-step operational semantics in the style of CompCert (section 3.1, pp. 1222–1223). In MIR the compiler has type-checked the program, resolved trait functions, inserted “drop” statements, defunctionalized lambda-expressions, and turned references into pointers, so the type system is much simpler than surface Rust (section 3.1, p. 1222). The authors say: “To be able to verify Rust code (at least for the fragment used by HyperEnclave), we need a formal semantics for the Rust language.” (section 3.1, p. 1222).

How to apply it.

1. Compile Rust with `rustc --emit mir` (Figure 3, p. 1222).
2. Use `mirlightgen`, a modified rustc, to print MIR as a Coq abstract syntax tree in a `.v` file (section 3.3, p. 1224).
3. Split the generated file into per-function files and order them into layers by the call graph, semi-manually with ad-hoc scripts (section 3.3, p. 1224).
4. Reason about each function with the MIR operational semantics and prove that, from related states, its execution and its specification agree on effects and return value (section 4.3, p. 1226).

Verus form. Inference: Verus verifies Rust source through its own lowering and SMT pipeline, so a Verus integration would use source contracts while treating compiler lowering as part of the verifier's trusted implementation. Inference: MIR-level inspection remains useful for auditing generated code and identifying unsupported constructs, but reproducing this Coq embedding is outside ordinary Verus proof syntax.

Evidence and limits. Verifying the same MIR the compiler operates on gives “high confidence that we are verifying the correct code” (section 3.3, p. 1224). The semantics was validated “by careful inspection of the Rust documentation” (section 3.1, p. 1223); the proofs rely on its soundness (section 6.1, p. 1230). The authors trust rustc and its memory-safety guarantees (sections 2.2, 6.1, pp. 1221, 1230).

## technique: object-view memory and lifted locals

What it is. Instead of a flat byte array, MIRVerif models memory as non-overlapping objects located by paths (an identifier plus a list of integer projections). Structs and enums are values: an integer discriminator plus a list of fields. This avoids proving pointer-region validity, pointer/region type matching, and aliasing effects. The paper says: “Note that our model is only valid if there is no aliasing or cycles in memory, which is the case for Rust-allocated memory in HyperEnclave.” (section 3.2, p. 1223).

The semantics also distinguishes “local” variables, whose address is taken, from “temporary” variables. Assignments to locals are written into memory; temporaries live in a temporary environment, so memory is written only when a value reaches a global or an address-taken variable (section 3.2, p. 1223).

How to apply it.

1. Represent an object path such as `foo.bar.1` as a base identifier plus projections (`GlobalPath IDENT_foo [OFFSET_bar 1]`) (section 3.2, p. 1223).
2. Represent structs/enums as values and field accesses as projections, rather than byte offsets (section 3.2, p. 1223).
3. Classify variables: allocate address-taken locals in memory; keep other variables in a temporary environment (section 3.2, p. 1223).
4. Rely on Rust ownership: pointers in safe code do not alias; model freeing of locally allocated objects as a no-op, since surface Rust prevents use after free (still modeling explicit “drop” calls) (section 3.2, p. 1223).

Verus form. Inference: a Verus ghost model can represent ownership objects as maps from abstract IDs to structured values and prove non-aliasing predicates. Inference: Rust's borrow checker supplies part of the no-alias argument, but raw pointers and unsafe casts require explicit contracts. The paper's no-op deallocation and path model are semantic assumptions, not Verus language constructs.

Evidence and limits. The memory module has 77 functions, but “only 12 of them involves local variables” (section 3.2, p. 1223). Unlike the other two simplifications, lifting temporaries does not rely on Rust guarantees, and the paper says “In future work one could prove the soundness of the transformation” (section 3.2, p. 1223).

## technique: opaque handles and three pointer classes

What it is. HyperEnclave passes pointers (self pointers, page-table-entry pointers) through many layers, which would expose concrete memory representation and break encapsulation. MIRVerif classifies specification pointers by use (Figure 4, p. 1224): normal pointers passed downward by the owning caller; trusted pointers from the bottom layer, holding getter/setter functions over the abstract state; and `RData` pointers returned from a lower non-bottom layer, holding only an identifier and a list of numerical indices. The paper says: “Our solution to this is to further extend the language semantics with new types of pointers which enforce module boundaries.” (section 3.4.1, p. 1224).

How to apply it.

1. For a pointer allocated by the caller and passed to a lower layer, use a normal path pointer; the callee's specification expects it to point to some object and the caller's proof shows it does (section 3.4.1, p. 1225).
2. For bottom-layer physical memory, keep an abstract array of 64-bit words; give the few unsafe integer-to-pointer casts specifications that return trusted pointers with load/store specifications, and verify the rest of the code against those (section 3.4.1, p. 1225).
3. For a pointer returned by a lower non-bottom layer, use an `RData` pointer; the semantics gives no way to read or write through it, so it can only be passed back to its layer. Verify that layer's methods in the concrete memory model, then prove a simulation from the `RData` specifications to the concrete semantics (section 3.4.1, p. 1225).

Verus form. Inference: represent each class with distinct ghost wrapper types and opaque IDs, exposing only proof lemmas for permitted operations. Inference: a trusted bottom helper can have a Verus contract over an abstract physical-memory map; its unsafe implementation remains a trusted boundary unless separately verified. Verus does not have MIRVerif's runtime pointer-class semantics, so the wrappers and non-forging invariants must be written explicitly.

Evidence and limits. The goal is to verify idiomatic pointer-heavy Rust without a complete rewrite into pointer-free style (section 3.4.1, p. 1224). Methods behind `RData` pointers cannot be verified against the `RData` semantics directly; the paper proves them concretely and adds a simulation proof (section 3.4.1, p. 1225). Trusted-pointer-returning unsafe functions have trusted specifications, and low-level functions beyond the semantics' assumptions are declared trusted (sections 3, 3.4.1, pp. 1222, 1225).

## technique: two-level page-table specifications

What it is. The low specification models physical memory of the frame area as a flat array of integers. The high specification models page tables as a tree of nested `PTE` records and maps. A relation `R` connects the two, using a recursive relation `Rpte` from each PTE to its entry address. The flat view does not rule out aliasing, which would make a new mapping a possibly non-local change. The paper says: “Thus, we use two specifications for page tables: a low spec which is a flat representation as described previously, and a high spec which is a tree representation for use by the higher layers.” (section 4.1, p. 1226).

How to apply it.

1. Define a `PTE` record with an optional (address, content) pair, flags, and an invariant that an absent entry is neither huge nor present (section 4.1, p. 1226).
2. Nest the next table directly in the entry: content is unit for a terminal entry, otherwise a `ZMap`; e.g. `l3pt := ZMap.t (option (@PTE (l2pt + unit)))` (section 4.1, p. 1226).
3. Define `R` over tree and flat states; define `Rpte` so a terminal entry's address agrees with `a`, and a nonterminal entry's children relate recursively to `a` plus some offset (section 4.1, p. 1226).
4. Prove a simulation from the flat to the tree representation; use the tree representation in later proofs (section 4.1, p. 1226).

Verus form. Inference: Verus can define ghost tree and flat maps, a recursive relation, and proof lemmas establishing simulation. Inference: concrete page-table entry reads and writes can be wrapped in contracts over the flat model; high-level Verus proofs then use the tree relation. Recursive relations must obey Verus termination and specification restrictions.

Evidence and limits. An earlier HyperEnclave version initialized enclave page tables by a “shallow copy” of the primary OS's page table, leaving pointers to level-3 tables in guest-controlled physical memory; the paper says “such a program would be impossible to prove in our setting”, because the initial page table must satisfy `R` (section 4.1, p. 1226). Inference: this is evidence that a code-to-model refinement proof rules out a bug class that a model-only proof would miss; the paper does not say the proof is what found this bug. Inference: the high-level model still depends on trusted bottom-layer operations (section 4.2, p. 1226).

## technique: invariants, noninterference, and data-oracle declassification

What it is. The security proof uses four page-table invariants: ELRANGE addresses of two different enclaves map to different physical addresses; an address shared between an enclave page table and the primary OS's page table is in the marshalling buffer; every enclave mapping corresponds to an EPCM entry; and per enclave, an address maps to EPC iff it is in ELRANGE, ELRANGE and the marshalling buffer are disjoint, and there are no huge pages (section 5.2, p. 1228). They take 106 lines of Coq definitions (section 5.2, p. 1228). The paper says: “To ensure confidentiality and integrity of enclaves, we need to ultimately prove noninterference.” (section 5.3, p. 1228).

How to apply it.

1. Define a transition system: each local-computation step or hypercall is a function from abstract system state to new state (section 5.1, p. 1227).
2. Define an observation function `V(p, σ)`: the CPU registers if `p` is active, `p`'s saved register context, mappings in `p`'s page table, and contents of pages not shared with other principals; indistinguishability is equal observations (section 5.3, p. 1228).
3. Prove that the hypercalls preserve the page-table invariants (section 5.2, p. 1228).
4. Prove Lemmas 5.2–5.4 for CPU-local moves (inactive state unchanged by others; active indistinguishable states stay so; inactive-to-active stays so); combine them by rely-guarantee reasoning (section 5.3, pp. 1228–1229).
5. Model the shared marshalling buffer with a data oracle (a stream of values): stores to it are ignored and reads come from the oracle; the theorem holds for all oracles, including one returning other guests' writes (section 5.4, p. 1229).

Verus form. Inference: represent observations, page-table invariants, and indistinguishability as ghost predicates over abstract maps; prove each transition contract preserves them. Inference: a data oracle can be a ghost sequence or uninterpreted specification function; the paper's rely-guarantee decomposition and Coq proof architecture need project-specific ghost state.

Evidence and limits. Theorem 5.1 states that two states indistinguishable to `p` remain indistinguishable after the transition steps (section 5.3, p. 1228). The authors “leave this argument informal and only prove the above lemmas in Coq” (section 5.3, p. 1229). Only the `init` and `add_page` hypercalls are modeled; `enter` and `exit` are not, as they “do not manipulate the page table entries” (section 5.1, p. 1227). The noninterference proofs took 6,600 lines (section 6, p. 1229).

## trust, measurements, and implications for VeruLaw

Trusted components include low-level functions beyond the MIR semantics' assumptions, the Rust standard library, third-party crates, architecture-specific functions, page-table-update primitives in the Trusted Layer, Coq and the MIR-to-Coq transpiler, the ad-hoc layering scripts, the rustc compiler, and the hardware (sections 2.2, 3, 4.2, 6.1, pp. 1221, 1222, 1226, 1230). The authors manually checked all 105 unsafe blocks: 74 indirectly call unsafe functions, and none of the 13 with raw-pointer dereferences involve page-table memory (section 6.1, p. 1229). They state that an unsound MIR formalization, a mistake transcribing code into the manual abstract models, or Rust not actually guaranteeing memory safety would invalidate the proofs (section 6.1, p. 1230). On scale, they say: “the we see that this is practical for small amounts of carefully selected Rust code, as in this development, but not for large pieces of software” (section 6, p. 1229).

Inference: for VeruLaw, the strongest reusable pattern is a layered contract architecture with explicit pointer wrappers, an abstract state, and a refinement relation between a concrete low model and a proof-friendly high model. Inference: agent-written verified Rust is most threatened by trusted unsafe boundaries, incomplete code coverage, unsound compiler or memory-model assumptions, and high-level specifications that omit transitions. Inference: the 3 person-years for 2,130 Rust lines and 15,100 proof lines indicate that end-to-end verified system components are expensive but feasible when scope is narrowed to security-critical layers.

The paper's result is not full HyperEnclave verification: only 49 of 77 Memory-module functions are code-verified, unverified hypercall handling and unsafe code remain threats, and the final rely-guarantee argument is informal (sections 5.3, 6, 6.1, p. 1229). Inference: VL should not redo generic layered refinement, page-table tree/flat simulation, or noninterference definitions; it should adapt these patterns to Verus contracts and make each trusted boundary visible in product risk accounting.

## techniques for the catalog

- layered refinement — prove functions by dependency layers against abstract contracts and compose code-to-specification refinements
- MIR-to-Coq import — compile Rust to MIR, import compiler output as Coq syntax, and reason with a small-step MIR semantics
- object-view memory — model non-overlapping structured objects and paths to reduce pointer and layout proof burden
- pointer classes — use normal, trusted, and opaque `RData` pointers to preserve module encapsulation across layers
- two-level page-table models — relate a flat physical-memory specification to a tree specification through recursive simulation
- invariant-preserving transitions — prove ELRANGE, marshalling, EPCM, and enclave invariants for every modeled hypercall
- noninterference with oracle — define principal observations, prove indistinguishability preservation, and model declassified shared memory with arbitrary data oracles
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This is handled using normal pointers into concrete memory (in our case the path addresses described in Section 3.2)."): checked every quotation, number, section and page reference, and technique step against the full paper text; changed a spliced section 3 quote (it skipped a sentence) to one whole sentence, about a dozen wrong page references (e.g. section 3.2 is p. 1223 only, section 6.1 trust statements are p. 1230, enter/exit omission is section 5.1 p. 1227), the claim that the refinement proof caught the shallow-copy bug (the paper says such code would be unprovable), the misattributed simulation proof (it is for RData, not trusted, pointers), the enclave-invariant wording, the "after borrow checking" step and the 4,500-line breakdown, and marked agent conclusions "Inference:"; did not check the figures beyond their captions and labels, or any claim against HyperEnclave's code or other papers.
