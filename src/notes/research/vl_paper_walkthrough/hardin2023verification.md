# Verification of a Rust Implementation of Knuth's Dancing Links using ACL2
(authored by agents unless marked 🧑)
Tag: `hardin2023verification`, [paper](http://arxiv.org/abs/2311.08862v1)

## scope and result

Hardin presents Restricted Algorithmic Rust (RAR), a syntactically Rust subset with the semantics of Restricted Algorithmic C (RAC), and verifies an array-backed circular doubly-linked list (CDLL) implementing Knuth's Dancing Links in ACL2. The paper's central result is functional correctness of the list operations, including removal followed by restoration, supported by approximately 160 theorems. The executable RAR is translated to RAC and then to ACL2; the ACL2 proof is therefore about the translated model, while ordinary Rust compilation and hardware synthesis are separate outputs.

The paper says: “We have crafted a Rust subset, inspired by Russinoff’s Restricted Algorithmic C (RAC), which we have imaginatively named Restricted Algorithmic Rust, or RAR.” (Abstract, p. 161). It also says: “The CDLL data structure implementation constitutes over 700 lines of Rust code, which becomes 890 lines of code when translated to ACL2.” (Section 6, p. 166).

## technique 1: restrict Rust so a proof-producing backend applies

what it is. RAR keeps proper Rust syntax but adopts RAC's semantic restrictions. The restrictions make source-to-source translation predictable and make imperative constructs fit ACL2's functional logic. The paper says: “As we wish to utilize the RAC toolchain as a backend in our initial work, Restricted Algorithmic Rust is semantically equivalent to RAC.” (Section 5.1, p. 165). It further states: “RAR code is proper Rust; it compiles to binary using the standard Rust compiler.” (Section 5.1, p. 165).

when to use it. Use this route when a project can be expressed with the RAR subset and needs one source for software and hardware outputs, plus ACL2 proofs. It is unsuitable for unrestricted Rust features that the subset or transpiler does not support; the paper reports future work to increase supported Rust features (Section 8, p. 171).

how to do it. (1) Write the algorithm in RAR, using structs, fixed arrays, scalar arithmetic, and the supported C-like `for` macro. (2) Keep ownership-compatible array indices instead of cyclic references where possible. (3) Run Plexi, the lexical and syntactic source-to-source translator, to produce RAC. (4) Compile RAC with a C/C++ compiler or HLS compiler for executable/hardware output. (5) Feed RAC to the RAC ACL2 translator, which converts imperative code to functional ACL2 and supplies loop measures and data representations. These steps are stated in Sections 5.1 and 4, pp. 164–166. “Plexi performs lexical and syntactic transformations that convert RAR code to RAC code.” (Section 5.1, p. 165). “The ACL2 Translator component of Fig. 2 provides a case study in the bridging of Formal Modeling and Real-World Development concerns.” (Section 4, p. 164).

Verus form. Inference: Verus can verify ordinary supported Rust directly, so the separate RAR-to-RAC-to-ACL2 path is not required. A Verus version would keep executable Rust and add `requires`/`ensures` contracts and proof functions; loop facts would be written as `invariant` clauses on the loop. Inference: the RAR restriction remains useful as an engineering boundary if a team wants fixed-size arrays and predictable arithmetic, but it is not a Verus language requirement.

evidence and limits. The evidence is a working prototype and the reported translated implementation size, not a benchmark against unrestricted Rust. The paper says the authors “have implemented several representative algorithms and data structures in RAR” (Section 3, p. 163), but it gives no success denominator for all attempted Rust programs. Inference: product risk is that unsupported Rust features or translation mismatches can sit outside the ACL2 proof; the Rust compiler, Plexi, RAC translator, and ACL2 translation assumptions remain part of the trusted chain.

## technique 2: encode a cyclic list with an index-backed fixed array

what it is. Instead of Rust references, CDLL stores nodes in a fixed array. Each node has an allocation marker, value, and `prev`/`next` indices; the CDLL stores a head index, count, and the array. This representation avoids ownership problems with cycles. The paper says: “The alloc field of the CDLLNode structure is declared to be a two bit unsigned field, but its only allowed values are two non-zero values: 2 (not currently allocated), and 3 (allocated).” (Section 6.1, p. 167).

when to use it. Use it for cyclic structures whose maximum size is known and whose operations can maintain index validity. It also makes a hardware-oriented fixed storage layout available. Inference: dynamic growth, arbitrary references, and APIs that require Rust's standard collection abstractions would need a different model.

how to do it. (1) Declare `CDLLNode` with `alloc`, `val`, `prev`, and `next`; declare `CDLL` with `nodeHd`, `nodeCount`, and `[CDLLNode; CDLL_MAX_NODE1]`. (2) Reserve `alloc` values 2 and 3 for unallocated and allocated nodes. (3) Define remove to reject out-of-range indices, removal of the head, and lists shorter than three nodes; then splice the predecessor to the successor and decrement the count. (4) Define restore to reject out-of-range indices, the head, lists shorter than two nodes, and a full list; then splice the saved predecessor and successor around the restored node and increment the count. The code and guards appear in Figures 4 and 5, Section 6.1, pp. 166–168.

Verus form. Inference: model the array as a fixed `Seq<CDLLNode>` in specifications while executable storage remains a Rust array. A `requires` clause can state `n < CDLL_MAX_NODE1`, `n != nodeHd`, and the count bounds; an `ensures` clause can state the updated links and count. A loop, if used to initialize or traverse the array, needs an `invariant` clause. Inference: Verus's ownership checker can handle the array object without proving cyclic references, but the mathematical well-formedness of `prev` and `next` still needs explicit predicates and proofs.

evidence and limits. The implementation is over 700 RAR lines and the ACL2 image is 890 lines (Section 6, p. 166). The fixed bound is `CDLL_MAX_NODE1 = 8191` in the shown declaration, so the construction does not establish correctness for unbounded lists. The allocation marker is a proof-oriented representation choice: “For RAC untyped records, that default value is zero. Thus, it is easy for a given record to attain a nil value.” (Section 6.2, p. 170). Inference: a product using this encoding must preserve the bound and marker invariant at every constructor and mutator.

## technique 3: prove a well-formedness predicate before operation theorems

what it is. ACL2 defines `cdllp` and helper predicates to constrain the head, count, node array, node records, and array length. Operation theorems then assume this predicate and additional node-link hypotheses. The paper says: “Given this definition of a good CDLL state, we can prove functional correctness theorems for Dancing Links operations.” (Section 6.3, p. 170).

when to use it. Use a state predicate whenever mutable data structure correctness depends on representation invariants. It prevents a theorem from silently claiming behavior for malformed states.

how to do it. (1) Define a helper that checks the array is a true list, indexes increase from zero, and each node satisfies `cdllnodep`. (2) Define `cdllp` to check integer, range-bounded head and count, the node-array predicate, and exact array length. (3) Add operation-specific hypotheses such as `good-nodep n Obj`, `n` not being the head, and a minimum count. (4) State the postcondition theorem; for remove/restore, assert that restoring after removing returns the original object. (5) Let ACL2 discharge the theorem with its existing record and RTL lemmas. The definitions and theorem appear in Section 6.3, pp. 170–171. “ACL2 performs the correctness proof for this cdll_restore of cdll_remove theorem automatically.” (Section 6.3, p. 171).

Verus form. Inference: define a `spec fn cdll_wf(c: CDLL) -> bool` and use it in `requires` and `ensures`; do not mark a `spec fn` with `ensures`. Define `proof fn` lemmas for link-preservation and use them from executable functions. Inference: the ACL2 theorem's exact record model does not carry over; Verus needs Rust ghost/spec views and explicit sequence or map reasoning for the array.

evidence and limits. The paper reports “approximately 160 theorems related to the CDLL data structure” (Section 6.3, p. 171), including constructors, cdr-equivalent operations, append-at-end, delete-at-end, and nth. It does not provide a theorem-by-theorem denominator or proof time. Inference: the count demonstrates breadth but does not show that every malformed-state behavior or every Rust execution path is covered.

## what is proved, measured, and trusted

Proved: functional correctness theorems for the CDLL implementation, including `restore(remove(n, Obj)) = Obj` under `cdllp`, a good node, non-head node, and count at least three (Section 6.3, p. 171). Measured/reported: implementation size (over 700 RAR lines, 890 ACL2 lines) and approximately 160 CDLL theorems (Section 6, p. 166; Section 6.3, p. 171). No runtime performance number or proof-time number is reported for this example. Trusted: the RAR semantics, Plexi, RAC translator, ACL2 books and prover, Rust compiler for the executable, and the theorem statements and invariants chosen by the author. Inference: a wrong specification or a translation defect could leave a source-level Rust defect outside the proved model.

The paper's numbers are internally consistent as stated: “over 700” source lines and “890 lines” after translation are different measures, and “approximately 160” is a theorem count rather than a percentage. No denominator is supplied for the set of attempted programs, so a success rate cannot be computed.

## relation to Verus and product threat

Inference: the paper establishes that a restricted Rust-to-ACL2 pipeline can automate proofs of an index-backed cyclic data structure; it does not establish that Verus can verify arbitrary cyclic Rust or that ACL2 is superior to Verus. Inference: Verus could reuse the paper's decomposition—representation invariant, guarded mutators, and inverse-operation theorem—but would express it with Rust contracts, spec functions, ghost state, and proof functions. Inference: the main threat to agent-written verified Rust is specification and model drift: an agent may prove a clean array model while changing the executable representation, bounds, or link semantics. The paper's explicit translation chain suggests checking source-to-model correspondence as a separate assurance obligation.

Existing work the paper says is already done includes Creusot, Prusti, RustHorn, Kani, and Verus as Rust verification systems (Section 7, p. 171), plus prior RAR examples for cryptography, JSON parsing, and array-backed data types (Section 3, p. 163). VL should not redo the claim that a restricted Rust subset can be translated to ACL2; it should test whether the same invariants and inverse-operation proofs reduce effort in actual Verus code.

## techniques for the catalog

- RAR restriction and translation — constrain Rust to a RAC-equivalent subset, transpile with Plexi, and translate RAC into ACL2 for proof and hardware/software outputs
- index-backed cyclic representation — represent circular links with fixed-array indices and explicit bounds to avoid cyclic ownership issues
- invariant-first data-structure proofs — define a complete well-formedness predicate, require operation-specific hypotheses, and prove functional theorems such as restore-after-remove

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
