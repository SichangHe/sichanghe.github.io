# A Type System for Extracting Functional Specifications from Memory-Safe Imperative Programs
(authored by agents unless marked 🧑)
Tag: `he2021type`, [paper](https://doi.org/10.1145/3485512)

## purpose and central result

The paper’s problem statement is: “Verifying imperative programs is hard.” (abstract, p. 1) It proposes “a memory-safe type system that, as part of type-checking, extracts functional specifications from imperative programs.” (abstract, p. 1) The extracted specification separates pointer reasoning from functional reasoning: “This disentangles imperative state, which is handled by the type system, from functional specifications, which can be verified without reference to pointers.” (abstract, p. 1) Soundness is a bisimulation up to errors in the specification; the paper says: “If we can prove that a specification never raises an error, then this reduces to the standard notion of bisimulation, which in turn ensures that the implementation is also error-free.” (introduction, pp. 2–3) The formal model is a simplified version of Heapster formalized and proved correct in Coq (introduction, p. 3).

Inference: The practical unit is a Heapster permission-typed LLVM function. A user supplies memory-shape and access annotations; type checking both checks the imperative fragment and constructs a pure Coq computation whose errors expose deferred safety obligations.

## technique 1: permission types and pointer locality

The method marks each pointer as shared read or exclusive write. The paper states: “our type system controls pointer aliasing by requiring that mutable pointers cannot alias any other pointers.” (section 1.1, p. 3) It explains the consequence: “This typing discipline on pointers ensures a strong form of separation, or pointer locality, where writes to any pointer cannot affect any other pointer values in scope.” (section 1.1, p. 4)

To apply it, the user writes input and output permissions for each function. A pointer permission has the paper’s form `ptr((rw, o) ↦→ P)`, where `rw` is R (read) or W (write), `o` is an offset, and `P` is the content permission (section 1.1, p. 5). `arr((rw, o, l) ↦→ P)` describes an array of `l` cells (section 1.1, p. 5); recursive permissions describe recursive structures; reachability permissions describe list segments (section 1.1, p. 5). Write permissions are exclusive; each pointer can “either have one write permission or multiple read permissions at any time, but not both” (section 3, p. 13). Separating conjunction of two permissions that are not separate has a false precondition, i.e. it is inconsistent (Definition 3.4, section 3, p. 13).

For a linked list, define a recursive permission with a null case and a struct case. The paper’s `Bufs` example uses `μX`, a disjunction, an existential length, a next-pointer permission, a length-field permission, and an array permission (section 1.1, p. 4). For a loop over the list, the user supplies the reachability invariant `lst : BufsR(z), z : Bufs, lp : lclptr(eq(z))`; it is established by reflexivity on loop entry and re-established at the loop end by transitivity of `BufsR` (Figure 1 and text, pp. 6–8).

Inference: In Verus, represent the pure shape and element facts with `spec fn` predicates over mathematical sequences or inductive models, and prove executable ownership preservation with `requires`, `ensures`, and loop `invariant` clauses. Verus does not carry over Heapster’s LLVM permission syntax or automatic pointer erasure; the Rust implementation and its proof-oriented API must expose equivalent ownership facts.

## technique 2: defer bounds safety into an extracted error

Splitting an array permission is not memory safe if the split index is out of bounds. The paper says: “the Heapster approach allows array bounds checks to be deferred until after separation type-checking, by encoding the bounds checks into the extracted functional specification.” (section 1.1, p. 7) The ArrSplit rule extracts to `trySplit`, which “tries to split a vector 𝑣 of length 𝑙 into one of length 𝑙 ′ and one of length 𝑙 − 𝑙 ′, passing the results to 𝑓 on success and throwing an error on failure.” (section 5.5, p. 21) Besides the Err rule, “this is the only rule that introduces errors into the specification.” (section 5.5, p. 21)

Apply this by type-checking pointer structure first, letting each array split become a pure conditional computation, then proving that the resulting computation cannot throw. In the `clearbufs` example, the specification splits the data vector `d` at offset 0 and forms `⟨{0, unit}⟩ ++ 𝑡𝑙`, a zero element followed by the tail (Figure 2 and text, p. 9). Theorem 4.4 (Error-Freedom) states that if the specification cannot reach `throw`, neither can the implementation (section 4, p. 15).

Inference: In Verus, encode the bound as a `requires` clause or an `assert` proved from an `invariant`; use sequence indexing only after proving `0 <= i < seq.len()`. A Verus `spec fn` can model the pure operation, while executable Rust performs the actual indexing. The deferred-error monad itself is a modeling choice and is not a Verus primitive.

## technique 3: compositional extraction and refinement proofs

Heapster translates permissions structurally: “Recursive permissions are translated to recursive types, disjunctive permissions are translated to sum types, and separating conjunctions are converted to product types.” (section 1.1, p. 8) Pointer permissions are erased: they “are translated to the result of translating the contents type” (section 1.1, p. 8). Each typing rule translates to a pure functional fragment, and “Control structures are then translated to the same control structures in the extracted specification.” (section 1.1, p. 8)

Use of the tool (section 6, pp. 22–24): compile code to LLVM bitcode, write Heapster types for each function by hand, add hints where needed, and run commands such as `heapster_typecheck_fun`. The paper says: “Some functions, such as those using loops, cannot be type-checked automatically, and require the user to provide type-checking hints to Heapster.” (section 6, p. 22) Recursive loops need no hints because the function’s own types serve as the invariant (section 6, p. 22). After extraction, the authors use a Dijkstra-monad approach “to prove two results about each extracted specification. First, that error is unreachable by proving that the specification refines a returning (and therefore non-error) computation, and second, that the specification refines a hand-written, higher-level specification of the program.” (section 6, p. 22) They have “an automated tactic for performing these refinement proofs”, whose main limitation is performance (section 6, pp. 22–23). For `xor_swap`, the second refinement “requires some facts about exclusive or which had to be proved manually” (section 6, p. 23).

Inference: In Verus, the analogous workflow is to write executable Rust, a `spec fn` model, function `requires`/`ensures`, and proof lemmas (`proof fn`) that connect implementation behavior to the model. There is no automatic translation from Rust ownership annotations into a complete functional specification; model definitions and loop invariants remain proof obligations.

## evidence, trust, and limits

The implementation is Heapster, an extension of SAW that ingests LLVM and generates functional models in Coq (introduction, p. 3). The evaluation covers the mbox data structure of an IPSec ESP implementation (section 7, p. 25). Figure 11 (p. 26) lists 18 functions: 14 are marked type-checked (6 of these call a non-type-checked function), 4 could not be type-checked, and 4 are marked as verified error-free and refining a hand-written specification; counts are mine from the figure. The authors state: “Even without verification of the extracted specifications, though, just the process of type-checking helped us to uncover a number of bugs related to memory safety.” (section 7, p. 26) They list an mbox_split_at bug at a chunk boundary, an incorrect array-size check in mbox_to_buffer, and missing NULL checks (section 7, p. 26).

Endianness and the custom mbox allocator are not yet supported; users may posit type-checking axioms, used here for `rand` and `memcpy`, and generating proof goals for axioms “has not yet been implemented” (section 7, p. 25). The Coq formalization handles iteration, not general recursion, though the tool handles recursion (section 2, p. 11). Inference: the numbers measure this implementation, tactic, and mbox corpus; they do not establish general coverage or proof effort. Inference: the axioms, the LLVM frontend, Coq libraries, and the correctness of user-written permissions remain trusted inputs for a product using this method.

## techniques for the catalog

- permission-typed extraction: assign read/write pointer, array, recursive, and reachability permissions so type checking enforces locality and emits a pure model
- deferred error checking: encode bounds-dependent operations as pure computations that may error, then prove error unreachable to recover memory safety
- compositional refinement: translate each typing rule to a functional fragment and prove the extracted computation refines a returning (error-free) computation and a hand-written higher-level specification
- loop reachability invariants: supply generalized list-segment permissions as hints to type-check iterative traversal of recursive structures
