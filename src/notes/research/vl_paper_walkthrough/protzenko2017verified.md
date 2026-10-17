# Verified Low-Level Programming Embedded in F*
(authored by agents unless marked 🧑)
Tag: `protzenko2017verified`, [paper](https://doi.org/10.48550/arxiv.1703.00053)

## scope and architecture

Protzenko et al. introduce Low*, a low-level subset embedded in F* and compiled to C by KreMLin. The paper defines a structured memory model, dependent specifications, erasure of proofs, a formal translation to CompCert Clight, and verified cryptographic case studies. Its abstract says: “Low∗ is a shallow embedding of a small, sequential, well-behaved subset of C in F∗, a dependently-typed variant of ML aimed at program verification.” (§abstract, p.1) The design targets code that needs C-like layout and performance while retaining F* proofs of memory safety, functional correctness, and side-channel properties.

The key architectural choice is to write the low-level code in a restricted language and prove a translation theorem, rather than verify arbitrary existing C. The paper says: “we give up on verifying existing C code and embrace the idea of writing low-level code in a subset of C shallowly embedded in F∗.” (§6, p.25) Inference: this is directly relevant to VL because a generator can constrain Rust/Verus code to a proof-friendly subset and then make the emitted artifact the object of verification.

## technique: a structured region memory model

What it is. Low* instantiates F*'s state monad with `HyperStack.mem`, which partitions memory into stack and heap regions. References carry a region, and a logical membership relation records liveness. `alloc` returns a fresh live reference, `free` requires membership and removes one reference, and dereference requires that the reference is live (§2.2, pp.6–8). Stack frames are pushed and popped explicitly; `salloc` allocates in the current frame.

The paper's `Stack` computation effect requires the stack tip to be restored and the memory domain to be unchanged on return, which rules out leaks (§2.2, p.8). The tutorial states: “Stack computations are ST computations that leave the stack tip unchanged (i.e., they pop all frames they may have pushed) and yield a final memory with the same domain as the initial memory.” (§2.2, p.8)

When to use it. Use regions and explicit frames for APIs that mix stack temporaries, heap ownership, interior pointers, and modular separation. Heap regions provide logical separation; stack regions also compile to C lexical scopes (§2.2, pp.7–8).

How to apply it (reconstructed from the paper; it gives no numbered procedure).
1. Define a state type with references, region membership, and select/update operations (§2.2, p.7).
2. Give each stateful function an `ST a pre post` computation type, where `pre` relates the initial memory and `post` relates initial memory, result, and final memory (§2.2, p.6).
3. Use `alloc`, `free`, `(!)`, `push_frame`, `pop_frame`, and `salloc` only through their pre/post specifications (§2.2, pp.7–8).
4. For an externally callable routine, use `Stack` to require that all temporary frames are popped and no heap reference is leaked (§2.2, p.8).

Verus form. Inference: represent the memory state as a ghost map or a view of owned buffers, and expose liveness and region membership through predicates. Use `requires` for liveness and `ensures` for preservation or ownership transfer. Use a loop `invariant` for frame ownership and `old(...)` in postconditions when relating pre-state memory. Verus does not provide F* effects or region-indexed reference types; this encoding is a library discipline, not a direct translation.

Evidence and limits. The paper's model prevents double-free and use-after-free by typing, but allocation can still fail at runtime and pointer-arithmetic overflow is not fully ruled out by the `create` type (§2.2, p.9). The authors say indices are 32-bit and therefore cannot address very large 64-bit buffers (§2.2, p.9). Deleting whole heap regions is not supported; heap region creation compiles to a no-op in KreMLin (§2.2, p.7). Heap regions serve only to partition the heap logically for separation and modular verification (§2.2, p.7).

## technique: refinement-typed buffers, structs, and interior pointers

What it is. A `buffer a` is an abstract value containing a reference to a sequence, a maximum length, an index, and a sub-length. The refinement `length b = n` compiles to a C array declaration, while `Buffer.sub` preserves an `includes` relation to the parent buffer (§2.2, pp.8–9). `index` requires liveness and `i < b.length`, then returns the sequence element without changing memory. Struct pointers use an indexed `ptr` carrying a base reference and a field path; `extend`, `read`, and `write` preserve liveness and describe the exact field update (§2.2, pp.9–10).

When to use it. Use these wrappers to expose C layout and pointer arithmetic to proofs without reducing all memory to an unstructured byte array. Interior pointers are needed for slices such as the ChaCha20 state sub-buffer and for nested struct fields.

How to apply it (reconstructed from the paper; it gives no numbered procedure).
1. Allocate a buffer with a statically known maximum length and maintain a refinement tying logical sequence length to the physical object (§2.2, p.8).
2. Form a sub-buffer only with an in-bounds offset and length; retain the parent `includes` relation (§2.2, p.9).
3. Use `index` only with a proof of liveness and bounds; use `extend` to follow a field path after proving the base pointer is live (§2.2, pp.9–10).
4. State writes with `modifies_1` and an equality between the post-state field and the written value (§2.2, p.10).

Example. ChaCha20 refines `len` to be no greater than the block size and equal to the output buffer length, requires output, key, and nonce to be live and disjoint, and ensures that only output changes and that it equals a prefix of a pure `Spec.chacha20` function (§2.1, pp.5–6; Fig. 2, p.5).

Verus form. Inference: define a `struct` view of each buffer and a `spec fn` mapping it to a sequence. Use `requires i < len`, `ensures` for unchanged regions and updated slices, and lemmas for `sub`/`includes`. Raw pointer arithmetic and C layout must remain behind a trusted or separately modeled interface; Verus's Rust slice types do not automatically model the paper's C pointer decay.

## technique: erased specifications plus a predictable compiler

What it is. Low* code is F* code in a first-order, monomorphic, explicitly allocating subset. Proofs and specifications may use arbitrary higher-order dependent F*, but computational code must be first order, make heap allocation explicit, avoid recursive datatypes, and be monomorphic (§1, p.3). F* erases ghost terms and specifications; KreMLin then transforms the resulting λow* core to C* and C. The paper says: “At extraction time, specifications and proofs are erased, and the remaining code enjoys a predictable translation to C.” (§abstract, p.1)

How to apply it (reconstructed from the paper; it gives no numbered procedure).
1. Write high-level reusable F* code and use partial evaluation to specialize it into the Low* subset before enforcing the restrictions (§1, p.3).
2. Type-check the stateful code and prove its contracts with SMT plus manual lemmas (§2.2, p.6; §2.3, p.11).
3. Erase `Ghost` computations and specifications; transcribe to the first-order λow* core (§3, pp.13–16).
4. Translate λow* to C* and then CompCert Clight, preserving traces and functional behavior (§3, pp.13–18).
5. Use KreMLin's inlining, reachability, hoisting, and readable pretty-printing to produce C11 (§4.1, pp.19–20).

Verus form. Inference: put executable Rust, `spec fn` definitions, and `proof fn` lemmas in one crate, then compile the executable after verification. The Verus verifier's erasure of proof code plays a similar role, but no theorem in this paper transfers to Rust's compiler. A VL pipeline should treat code generation and any `unsafe` or FFI boundary as separate proof obligations.

Evidence and limits. The formal pipeline proves semantics preservation to Clight and trace properties through Clight, but the transcription from emf* to λow* is “not backed by a specific proof” (§3, p.14). KreMLin is unverified OCaml and is trusted, as are F*'s typechecker, Z3, the metatheory proofs, and the downstream C compiler (§1, p.4). The authors explicitly leave verified assembly compilation for future work (§3.3, p.19).

## technique: functional correctness from pure specifications

What it is. Low* implementations are related to pure mathematical functions. For Poly1305, a five-limb buffer is mapped by a ghost `eval` function to an integer; `normalize` preserves the value modulo `2^130 − 5`, and `poly1305_mac` ensures the output tag equals a pure `Spec.mac_1305` computation (§2.3, pp.10–12). The proof pattern is to use a ghost snapshot, state an abstract invariant, and invoke a lemma that connects bit masks and arithmetic.

How to apply it (reconstructed from the paper; it gives no numbered procedure).
1. Define a pure specification over sequences or mathematical integers (§2.3, pp.10–11).
2. Define a representation invariant such as limb compactness and a ghost interpretation function (`eval`) (§2.3, p.10).
3. State the stateful routine's `requires`, `ensures`, and `modifies` relation to the pure function (§2.3, p.11, Fig. 3).
4. Insert manual lemmas at bit-manipulation boundaries; proofs are erased during extraction (§2.3, p.11).

Verus form. Inference: use `spec fn` for the mathematical model, `requires`/`ensures` for representation invariants, and `lemma` functions with `ensures` to connect machine arithmetic to the model. Use `old(...)` to refer to the pre-state and `assert` to expose arithmetic facts to the solver. The exact F* `ST.get` snapshot idiom does not carry over.

Evidence and limits. The paper says that for its four primitives (ChaCha20, Salsa20, Poly1305, Curve25519) “we prove that our stateful optimized code matches a high-level functional specification written in F∗” (§5.1, p.22). For the HACL* library as a whole it claims memory safety, side-channel resistance, and functional correctness only “where there exists a simple mathematical specification” (§5, p.21). The AEAD security argument relies on idealization that is justified by a probabilistic proof on paper, and holds against computationally limited adversaries “except with small probabilities” (§2.3, p.10; §2.4, p.12). A small C adapter between miTLS and extracted AEAD is unverified, creating a stated security gap (§5.2, p.25).

## technique: type abstraction for side-channel resistance and idealization

What it is. Secret-dependent values use abstract types whose operations expose no secret-dependent branch or memory trace. A ghost view can reveal a value to proofs while computational code cannot inspect it. The paper proves a secret-independence theorem for λow*: two executions with different secret values produce identical traces when the secret interface implementation is related modulo secrets (§3.1, pp.15–16).

How to apply it (reconstructed from the paper; it gives no numbered procedure).
1. Define a secret abstract type and expose only constant-time operations such as `eq_mask`; make the mathematical value available only in ghost code (§2.3, p.11).
2. Type-check all code against the abstract interface, so branching and accesses cannot depend on a representation of the secret (§2.3, p.11).
3. Prove interface implementations are equivalent modulo secrets and apply the secret-independence theorem (§3.1, pp.15–16).
4. Instrument compiler traces for reads, writes, and branches; prove trace preservation through layout-changing passes (§3.3, pp.18–19).
5. For cryptographic reductions, use abstract flags to verify both real and ideal AEAD branches, then reveal flags as false at extraction so ideal logs erase (§2.4, pp.12–13).

Verus form. Inference: model secrets with an abstract type or ghost wrapper, expose only verified constant-time operations, and state a noninterference relation in lemmas. Verus does not provide the paper's trace semantics; a separate instrumentation and refinement proof is needed for generated Rust and machine code.

Evidence and limits. The trace theorem covers λow* to Clight, not arbitrary post-Clight compiler transformations; the authors suggest translation validation or instrumented compilers for later stages (§3.3, p.19). Abstract flags prove the real and ideal branches under assumptions, not the cryptographic reductions themselves (§2.4, p.12).

## technique: verified compilation with trace reinterpretation

What it is. Layout changes can alter concrete pointer traces even if behavior is preserved. The paper handles each transformation by reinterpreting traces into abstract variable/field identities, proving exact preservation in that abstract trace, and then reinterpreting back (§3.3, pp.18–19). For transformations that add accesses, it first adds provisional trace events and then proves the final transformation preserves them.

How to apply it (reconstructed from the paper; it gives no numbered procedure).
1. Define a trace that records branches and each memory read/write (§3.1, p.15).
2. Replace pointer addresses with function, call-depth, local-variable, array-index, and field identifiers (§3.3, p.18).
3. Prove the transformed program has the same abstract trace and functional result (§3.3, pp.18–19).
4. Reinterpret the trace back to concrete pointers and compose the pass theorems (§3.3, p.19).

Verus form. Inference: use a ghost event sequence and prove each Rust transformation preserves it, but treat this as a separate model of the compiler or code generator. Verus proofs about source Rust do not imply that LLVM or machine-code optimization preserves the event sequence.

## evidence, trust, and product threat

Table 1 reports 8,936 lines for the Low* standard library, 6,050 lines for HACL* with 28% annotations, and 13,743 lines for miTLS AEAD with 56.5% annotations; verification times are 8 minutes, 12 hours, and 1 hour 10 minutes respectively, on an Intel Core E5 1620v3 CPU (Table 1, p.21). HACL* measurements average 1,000 runs over random 16-KB blocks on an Intel Xeon E5-1630; Curve25519 uses 1,000 random key pairs (Table 2 caption, p.22). For example, HACL* ChaCha20 is 6.17 cycles/byte versus Sodium's 6.97, while the fastest eBACS assembly is 1.23 cycles/byte (Table 2, p.22). These numbers compare the named CPU, compiler, input size, and denominators; they do not establish universal performance.

The paper's trust boundary includes F*'s typechecker and Z3, manual metatheory proofs, unverified KreMLin, and the C compiler (§1, p.4). The Table 2 numbers were obtained with GCC-6 and -march=native, with auto-vectorization and link-time optimization turned off; CompCert 3.0 (with -O3) causes a 3x slowdown for Salsa20/ChaCha20 and 30–60x for Poly1305/Curve25519 (§5.1, p.24). The miTLS integration leaves a small unverified C adapter (§5.2, p.25).

Inference: VL's product threat is high at compiler, FFI, unsafe-code, and specification boundaries. Low* extracts 20,000+ lines of Low* code to C (§1, p.4), with the translation proved by hand on a formal model (§1, p.4; appendix). The paper lists the typechecker, Z3, the hand proofs, unverified KreMLin, the C compiler, and the miTLS adapter as remaining trust assumptions; the claim that these dominate residual risk is my own judgment, not something the paper measures. VL should reuse the pure-model plus stateful-implementation pattern, explicit memory contracts, and trace-aware translation checks. VL should not claim end-to-end guarantees from a Verus source proof without checking generated code, linked libraries, and machine-level side channels.

## techniques for the catalog

- region-indexed state monad — model stack and heap ownership with liveness preconditions and postconditions
- Stack effect — require frame restoration and unchanged memory domain to rule out leaks
- refined buffer and struct views — encode lengths, slices, fields, and interior pointers in types
- pure-model refinement — relate optimized stateful code to mathematical functions through ghost interpretations
- abstract secret types — prevent secret-dependent branches and accesses while retaining ghost reasoning
- idealization flags — verify real and ideal cryptographic paths together, then erase ideal code
- trace reinterpretation — preserve side-channel traces across memory-layout transformations
- proof erasure and verified lowering — erase ghost code and prove a sequence of semantics-preserving translations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Just like C, there are two ways to evaluate Clight expressions: in lvalue position or in rvalue position."): I read the whole paper text (main text pp.1-26, appendix A-F pp.27-84, references) and the whole study; checked every quotation, page and section reference, number, and technique step against it; changed the §6 quotation to the paper's lowercase "we give up", corrected page references for Table 1 (p.21) and the CompCert slowdown (p.24), the Fig. 3 reference, narrowed the HACL* functional-correctness claim to what §5 and §5.1 state, clarified that only heap region creation is a no-op, added the GCC flags and CompCert version, replaced an unsupported claim that trusted components "dominate residual risk" with the paper's list of trust assumptions plus my labeled judgment, and relabeled the "paper procedure" step lists as reconstructed because the paper gives no numbered procedures; not checked: the Verus-form paragraphs (my own inference, not checkable against the paper), the proofs in the appendix beyond reading them, the cited external works, and the arXiv link was kept as the existing DOI-form link (arXiv:1703.00053 appears in the paper header) without a network fetch.
