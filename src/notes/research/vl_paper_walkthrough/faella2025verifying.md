# Verifying Tree-Manipulating Programs via CHCs
(authored by agents unless marked 🧑)
Tag: `faella2025verifying`: [paper](http://arxiv.org/abs/2505.14092v1)

## what the paper proves

Faella and Parlato reduce memory-safety checking for programs starting from tree-shaped heaps to constrained Horn-clause (CHC) satisfiability. Pointer updates may change the heap's shape during execution. The central representation is a knitted-tree: one data tree records the input, output, and intermediate configurations, subject to finite encoding bounds. The abstract states: “Central to our approach is the knitted-tree encoding, modeling each program execution as a tree structure capturing input, output, and intermediate states” (Abstract, p. 1). The target includes termination: “A program P is memory safe if all its executions terminate without reaching an error configuration” (Problem 1, Section 2, p. 6). Their sound semi-algorithm reports safety or unsafety if it terminates; it need not terminate (Theorem 7, Section 5.1, p. 17).

## technique 1: encode an execution as a knitted-tree

Inference: use this representation when mutable pointers, allocation, freeing, and revisits make an ordinary tree invariant hard to maintain.

1. Choose parameters `m` and `n` (Section 3, pp. 7, 11). Each internal backbone node has `m` auxiliary child slots for allocation; `n` bounds the frames used per node before overflow. Frames count instructions and rewinding steps, not just visits. The paper says: “The parameter n limits the passes and instructions executed per node” (Section 3.1, p. 11).
2. Build a backbone containing the input tree, making every input node internal and every internal node degree `k+m`; mark input nodes active and added nodes inactive (Section 3, p. 7).
3. Give every backbone node a log of `n+1` frames; frame `n+1` detects overflow. A frame stores availability, allocation state, node data, program counter, data variables, nil flags, pointer-update flags, child allocation flags, an event, and `next`/`prev` links (Section 3, pp. 7–8). Unavailable frames with index greater than one form the global doubly linked lace in execution order.
4. Initialize the first frame of every backbone node with activity information and, for input nodes, their data; then initialize the root's second frame with the starting configuration. The first pointer variable points to the input root, or is nil for an empty input; other pointer variables are nil (Section 3.1, p. 8).
5. An instruction may push several frames, each at the first available slot in its node's log. Copy defaults from the preceding lace frame or the frame below in the same log; override fields required by that instruction. Stop the encoding on a terminal status, including overflow or allocation failure (Section 3.1, pp. 9–11; Section 3.2, p. 12).

The running example reverses a list prefix. A concrete execution of `1→2→3→4→5` with key `3` produces `3→2→1→4→5` (Section 1, p. 2). The paper's encoding stores a pointer-field update in its node and stores a pointer-variable update in the node the variable points to (Section 1, p. 2).

Inference: a possible Verus adaptation would model the heap with a `Map` from node identifiers to node records and keep the execution history in ghost state. Preconditions would describe the initial tree; postconditions would relate the resulting heap to the model. This would require a separate proof connecting Rust operations to the model. The paper does not provide this translation.

## technique 2: rewind the lace to resolve pointers

Inference: use rewinding when a statement needs a pointer value whose latest assignment is recorded at another node.

1. Starting at the current frame, walk backward through `prev` links.
2. `find_ptr(p,id)` stops at the most recent frame containing the event `⟨p := here⟩`; it shortcuts through node changes, retaining only relevant cross-node frames identified by `upd_p` (Section 3.1, p. 10).
3. Push rewind frames (`rwd`) for each cross-node move, without advancing the program counter, then push the instruction's effect frame (Section 3.1, pp. 10–11).
4. For `p := q → pfield`, first rewind to `q`, then find the latest occupied frame assigning `pfield`. An explicit nil assignment sets `p` nil. An assignment `⟨pfield := r⟩` requires recovering the value of `r` at that assignment, potentially through a second rewind; it does not use `r`'s later value. Absent an explicit update, use the original child pointer if the child is active, otherwise set `p` nil (Section 3.1, p. 11; Appendix C.5, pp. 42–43; Appendix C.7, p. 45).
5. For equality `p=q`, compare nil flags first; if inconclusive, rewind to assignments and check that no `upd` flag changed the value between the two frames (Section 3.1, p. 11).

The paper's example records `find_ptr(head,(u4,2))=(u3,2),(u2,2),(u1,2)` and then adds frames 16–18, with the last recording the effect of `head→next:=tmp` (Section 3.1, p. 10; Fig. 2, p. 3). The authors explain the basic search: “For example, to identify the node a pointer variable p points to, we rewind the lace until we find a frame with the event ⟨p := here⟩” (Section 3.1, p. 10).

Inference: a possible Verus adaptation would search a finite ghost sequence and prove that the result identifies the latest relevant assignment. Pointer-field reads would also need a proof that the recovered value belongs to the earlier field-assignment time. This is a proposed proof structure, not a checked Verus implementation.

## technique 3: local compositional CHCs

Inference: use the local CHC construction to seek node-label invariants without enumerating complete executions. The paper states: “The following lemma states that each new frame in a knitted-tree depends only on local information from neighboring nodes” (Section 4, p. 13). Lemma 1 provides `Internal`, `Up`, and `Down` functions. The `consistent_child` predicate checks interactions between parent and child logs. Lemma 3 allows replacing a child subtree with another knitted-tree prefix's subtree when its root log is consistent with the parent log (Section 4, p. 13; proof, p. 14).

Construct the CHC system as follows (Section 5, pp. 15–16):

1. Add base facts `Lab(σ)` for initial non-root and root labels.
2. Add an internal-step clause using `ΨInternal` to append a frame in one node.
3. Add an upward clause using `consistent_child` and `ΨUp` when the lace moves from a child to its parent.
4. Add a downward clause using both `consistent_child` and `ΨDown` when it moves from parent to child.
5. Add a query forbidding a label with a terminal frame whose status belongs to the selected set `Ex`.

Theorem 3 states that the minimal model of `Lab` consists exactly of labels occurring in knitted-tree prefixes (Section 5, p. 15). The CHC system including the exit-status query is unsatisfiable exactly when a represented execution has a selected status. Conversely, satisfiability means no represented execution has that status (Theorem 4, p. 16).

Inference: a possible Verus adaptation would define an invariant over labels and prove the base facts, transition closure, and exclusion of error statuses. A proof claiming the exact correspondence of Theorem 3 would additionally need both directions of that correspondence; closure alone does not identify the minimal model.

## technique 4: sound memory-safety semi-algorithm

Run `ExitStatus(P,m,n,{E})` first. A positive answer means an error execution exists, equivalently the corresponding CHC system is unsatisfiable; report unsafe by Theorem 5 (Section 5.1, p. 17). Otherwise check `{M}` for allocation failure. If found, increment `m` and restart. If absent, check `{O}` for label overflow; if found, increment `n` and restart. If all three checks are negative, Theorem 6 establishes safety for all executions, because neither encoding limit can hide an error or infinite execution. The paper states: “Algorithm MemSafety is a sound solution to the memory safety problem, i.e., if it terminates, it yields the correct answer” (Theorem 7, p. 17). The algorithm or an underlying CHC-solving attempt may fail to terminate, and finite parameters may not suffice to establish safety.

## evidence, trust, and limits

The paper supplies correspondence and soundness proofs, a worked list example, and detailed encoding predicates; it reports no implementation benchmark results. Section 7 presents efficient implementation as future work (p. 19). Its scope is an imperative language without direct procedure calls. Appendix A handles nonrecursive calls by inlining and describes restricted recursion along unchanged input-tree child links, with at most one invocation per node (pp. 27–29). It does not establish support for arbitrary recursion.

The bounds restrict represented executions, but the algorithm checks for both allocation failure and overflow before reporting safety. Under the paper's semantics, `free` resets pointers to the freed node to nil (Section 2, p. 5); dereferencing or deallocating nil is an error (p. 6). This semantics must be preserved by any application. Structural and functional pre/postconditions are future work; termination is already included in memory safety through the overflow check. The authors state: “Termination can be verified by ensuring that labels do not overflow” (Section 7, p. 20).

Inference: an implementation would need a correct program-to-CHC translation and sound CHC answers under the selected data theory. Finite bounds alone are not evidence of whole-program safety; the absence of `M` and `O` statuses is essential.

## techniques for the catalog

- knitted-tree execution encoding: record input, intermediate frames, and output in one bounded tree log
- lace rewinding: resolve pointer aliases by backward traversal with update flags and explicit rewind events
- local CHC composition: synthesize node-label invariants from internal, upward, and downward transition clauses
- parameter-increment safety loop: distinguish errors, out-of-memory, and truncation, increasing bounds until a sound result is obtained
