# Memory Simulations, Security and Optimization in a Verified Compiler
(authored by agents unless marked 🧑)
Tag: `monniaux2024memory`, [paper](https://doi.org/10.1145/3636501.3636952)

## scope and result

This review uses the supplied 26-page arXiv v1 dated December 2023; the tag and DOI identify the 2024 publication. Page references below refer to that preprint.

The paper explains how CompCert can add stack canaries, ARM pointer authentication, and tail-recursion elimination while proving semantic preservation. Its central method is simulation between source and transformed states, with memory extensions for newly allocated data and memory injections when addresses and stack blocks change. The author reports proofs of these transformations on the Chamois CompCert fork, with no admitted results; this claim is conditional on the existing semantics and added axioms. The paper says: “Current compilers implement security features and optimizations that require nontrivial semantic reasoning about pointers and memory allocation” (Abstract, p. 1). It also says: “The two new passes and the modifications to the stacking pass that we describe in this paper should however be usable with very minimal changes with the “official” version” (Introduction, p. 3).

## technique 1: memory simulations for transformations

What it is. CompCert represents a state transition system and proves a transformation by a relation between old and new states. The relation preserves externally visible event traces, while internal register and memory representations may differ. The paper defines a lockstep case in which one old step is matched by one new step, and later uses a plus simulation for canaries, requiring a nonempty target sequence for each source step (Section 2, pp. 3–4; Section 3.3, p. 11). C memory is a set of disjoint blocks; a pointer is a block identifier and offset. This lets a proof state exactly which addresses may correspond after transformation.

How to apply it. (1) Define the transformed instruction semantics and a match relation between old and new states (Section 2, p. 4). (2) State preservation of observable events. (3) For each old transition, construct the matching new transition or sequence. (4) Prove memory permissions, definedness, and pointer relations are preserved. The paper states: “Programs transformations in CompCert are proved correct by exhibiting forward simulation relations” (Section 2, p. 4). For tail recursion, the relation is a memory injection that maps the newly created old stack frame to the transformed current frame and removes the destroyed old frame (Section 4.2, pp. 13–14).

Verus form. Inference: model the abstract memory as a `struct` with a `spec` relation between pre-state and post-state, then prove each executable step with `requires` and `ensures`; use a ghost map from block identifiers to blocks to represent the injection. A loop implementing a transformed recursive call needs an `invariant` that preserves the map and the frame bounds. The pass first copies arguments into temporaries, then into parameter registers to implement parallel assignment without overwriting needed values. Non-parameter registers may retain old values, which refine their original `Vundef` values (Section 4.2, p. 14). The optimization retains CompCert’s restriction of no address-taken stack locals before register allocation; register spills do not count (Section 4.1, p. 13). Verus cannot directly reuse CompCert's Coq transition relations, so the executable Rust representation and its abstraction relation must be specified separately.

Evidence and limits. The proof of tail-recursion elimination is 2,641 lines, with 69 lines of transformation code; roughly half the proof concerns instruction insertion and half the memory-injection invariants (Section 4.3, p. 15). External calls are deliberately lax: the authors cannot prove the converse of their weak allocation invariant because an external call may free arbitrary caller stack frames in the semantics (Section 5.2, p. 19, footnote 25). Inference: this is a concrete trusted-model boundary for a Verus port: the specification must state what foreign calls can mutate, or the same invariant will be unprovable.

## technique 2: stack canaries via memory extension

What it is. A canary is a run-time value placed in a stack frame between local arrays and control data. The prologue stores it; the epilogue checks it before returning. An out-of-bounds write that reaches the return address normally changes the canary first, causing an abort. The example writes twelve elements into a ten-element array and changes the return address to `quack`; unprotected CompCert prints `quack`, while the protected compiler prints “*** stack smashing detected ***: terminated” (Section 3.1, pp. 7–8).

How to apply it. (1) Extend each selected stack frame with one canary slot (Sections 3.2–3.3, pp. 9–11). (2) Add a prologue store of an abstract canary value. (3) Add an epilogue load and comparison, branching to an abort on mismatch. (4) Define a memory extension that relates the old frame to the larger new frame, preserving all old offsets and assigning the new slot. (5) Prove every defined source operation has a corresponding target operation, the canary is inaccessible in source memory and unchanged in target memory, and the inserted check never takes its failure branch during such simulated executions (Sections 3.2–3.3, pp. 9–12). Selection is based on functions with stack-allocated variables; `-fstack-protector-all` selects every function (Introduction, p. 3).

Verus form. Inference: add a ghost canary value and a private field in a verified frame object; specify that the epilogue returns only when the loaded value equals the ghost value. A Rust slice's bounds checks already prevent the C-style overflow, so this technique applies to an `unsafe` stack or FFI model where the frame and writes are represented explicitly. The formal model assumes only an uninterpreted run-time canary value. Randomness and unpredictability belong to the informal security argument (Sections 3.1 and 3.3, pp. 9–11).

Evidence and limits. Canary instrumentation costs less than 1% on vulnerable functions and 5% when applied to all functions (Section 6, p. 20). The proof preserves defined executions; it does not prove attack detection, even for an explicit modeled attack. The author states: “We do not prove that these countermeasures have any effect on any attack.” (Section 7, p. 22) Inference: a product using Verus should state the attacker and memory model in the contract rather than treat a canary proof as a complete security proof.

## technique 3: pointer authentication with axiomatized encoding

What it is. ARM pointer authentication encodes a return pointer with a secret key and modifier before storing it, then decodes it before return. The formal model uses functions `E(p,m,k)` and `D(c,m,k)` with `D(E(p,m,k),m,k)=p` (Section 5.1, p. 16). The modifier prevents replaying a valid encoding in a different context.

How to apply it. (1) Add `paciasp` before saving the return address and `autiasp` before restoring it (Section 5.1, p. 16). (2) Extend the return-address matching invariant so the stored value may be `E(p,m,k)`. (3) Axiomatize encoding, decoding, round-trip identity, undefined-value behavior, and preservation of pointer type (Section 5.2, pp. 17–18). (4) Prove the axioms consistent by instantiating both functions as identity. (5) Validate the `retaa` peephole replacement by symbolic execution; give both instruction sequences the same `Vundef` result for the return-address register (Section 5.1, p. 17).

Verus form. Inference: represent `encode` and `decode` as `spec fn`s with a lemma proving their round trip, and keep the executable implementations behind a trusted hardware boundary. A `proof fn` can establish the round-trip fact but must not be called as run-time code. The hardware key and actual cryptographic behavior remain trusted assumptions. This is a proposed adaptation, not a Verus technique evaluated by the paper.

Evidence and limits. The PAC module is 54 lines, with 11 changes to CompCert invariants and proofs (Section 5.2, p. 17). The attack without canaries but with PAC ends in a segmentation fault rather than controlled execution (Section 5.1, p. 17). Five axioms specify key A’s encoding/decoding functions and properties; identity functions satisfy them, establishing consistency but also showing that they alone imply no cryptographic security; the paper notes that ARM leaves the exact computation implementation-specific. Inference: a Verus product should record these axioms in its trusted base and test the generated instruction semantics, because proof cannot establish hardware behavior that the specification leaves uninterpreted.

## transformation order and trusted validation

The PAC model does not commute with memory injections. It works here because authentication is inserted late, after passes whose correctness depends on injections. Extending it to arbitrary code/data pointers would require a different model, potentially adding encoded pointers to the global value type (Sections 5.1 and 7, pp. 17, 21–22). Inference: choose pass order together with the proof relation; moving a proved pass earlier can invalidate later proofs.

The `retaa` replacement uses translation validation: an untrusted oracle proposes a replacement, while symbolic execution checks identical final symbolic states. Modeling the return-address register as `Vundef` makes the separate and combined returns comparable (Section 5.1, p. 17).

## techniques for the catalog

- forward simulation: relate old and new states and match every observable transition
- memory extension: add canary storage while preserving old block contents and permissions
- memory injection: map blocks across stack recreation and address-changing transformations
- axiomatized pointer authentication: model hardware encoding with a round-trip axiom and validate instruction replacements
- pass ordering by simulation requirements: insert PAC after passes requiring memory injections
- symbolic translation validation: check oracle-proposed replacements by equivalent final symbolic states
- definedness refinement: allow target registers and extended memory to refine source Vundef values
- differential compiler testing: combine generated programs, torture suites, and known-result execution to test trusted backend code
