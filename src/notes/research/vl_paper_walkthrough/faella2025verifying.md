# Verifying Tree-Manipulating Programs via CHCs
(authored by agents unless marked 🧑)
Tag: `faella2025verifying`: [paper](http://arxiv.org/abs/2505.14092v1)

## what the paper proves

Faella and Parlato reduce memory-safety checking for heap programs whose heaps have a tree-shaped backbone to constrained Horn-clause (CHC) satisfiability. The central representation is a knitted-tree: one data tree contains the input heap and a log of every intermediate program state. The abstract states the purpose exactly: “The knitted-tree encoding, modeling each program execution as a tree structure capturing input, output, and intermediate states” (Abstract, p. 1). The target property is memory safety, defined as executions terminating without an error configuration (Section 2, p. 6). Their sound semi-algorithm can report safety when it terminates; undecidability means nontermination remains possible.

## technique 1: encode an execution as a knitted-tree

Use this when mutable pointers, allocation, freeing, and revisits make a flat trace or ordinary tree invariant hard to maintain.

1. Choose parameters `m` and `n` (Section 3, pp. 7, 11). `m` is the number of inactive child slots available for allocation; `n` bounds frames, or visits, recorded per node. The paper says “m bounds the number of allocations” and that “The parameter n limits the passes and instructions executed per node” (Section 3.1, p. 11).
2. Build a backbone containing the input tree, making every input node internal and every internal node degree `k+m`; mark input nodes active and added nodes inactive (Section 3, p. 7).
3. Give every backbone node a log of `n+1` frames. A frame stores availability, allocation state, data, program counter, program variables, nil flags, pointer-update flags, an event, and `next`/`prev` links (Section 3, pp. 7–8). Unavailable frames form the global doubly linked lace in execution order.
4. Initialize the first frame of each input node from its data and child activity, then initialize the root's second frame with the starting configuration (Section 3.1, p. 8).
5. For every instruction, push the next frame at the first available slot. Copy defaults from the preceding lace frame or the frame below in the same log; override the program counter, event, variables, and flags required by that instruction (Section 3.1, pp. 9–11).

The running example reverses a list prefix. A concrete execution of `1→2→3→4→5` with key `3` produces `3→2→1→4→5` (Section 1, p. 2). The paper's encoding stores a pointer-field update in its node and stores a pointer-variable update in the node the variable points to (Section 1, p. 2).

Verus form (Inference): represent the heap with a Verus-owned model such as a `Map` from node identifiers to node records plus a ghost execution log. Use `ghost` state and `Seq`/`Map` invariants to relate each concrete pointer update to the model. A Rust function's `requires` states the initial tree and bounds; `ensures` states the resulting heap relation. The knitted-tree's mutable lace is a proof model, not a run-time data structure. Verus has no direct CHC relation declaration, so CHC predicates become ghost predicates or `spec fn`s and their closure obligations become `proof fn`s.

## technique 2: rewind the lace to resolve pointers

Use this when a statement must dereference a pointer or find a pointer-field value that may have been updated earlier at another node.

1. Starting at the current frame, walk backward through `prev` links.
2. `find_ptr(p,id)` stops at the most recent frame containing the event `⟨p := here⟩`; it shortcuts through node changes, retaining only relevant cross-node frames identified by `upd_p` (Section 3.1, p. 10).
3. Push rewind frames (`rwd`) for each cross-node move, without advancing the program counter, then push the instruction's effect frame (Section 3.1, pp. 10–11).
4. For `p := q → pfield`, first rewind to `q`, then search that node's log for the largest active index containing `⟨pfield := α⟩`; absent an explicit update, use the original child pointer if the child is active, otherwise set `p` nil (Section 3.1, p. 11).
5. For equality `p=q`, compare nil flags first; if inconclusive, rewind to assignments and check that no `upd` flag changed the value between the two frames (Section 3.1, p. 11).

The paper's example records `find_ptr(head,(u4,2))=(u3,2),(u2,2),(u1,2)` and then adds rewind frames before applying `head→next:=tmp` (Section 3.1, p. 10). This is an operational recipe, not a heuristic.

Verus form (Inference): make `find_ptr` a terminating `spec fn` over a finite ghost `Seq<Frame>` and prove that the returned index is the latest matching assignment. A loop that searches the concrete structure needs a `while` invariant and a decreasing `decreases` clause. Pointer alias facts belong in invariants over the model map; do not call a `proof fn` at run time.

## technique 3: local compositional CHCs

Use this when one wants automatic invariant synthesis while avoiding enumeration of complete executions. The paper proves a locality lemma: each next frame depends only on the current node and one neighboring node (Section 4, p. 13). It then defines `consistent_child` to check the parent/child boundary and proves subtree replacement: “If consistent_child (σ2, j, σ1) holds true for some j … there is an (m,n)-knitted-tree prefix” (Lemma 3, p. 14).

Construct the CHC system as follows (Section 5, pp. 15–16):

1. Add base facts `Lab(σ)` for initial non-root and root labels.
2. Add an internal-step clause using `ΨInternal` to append a frame in one node.
3. Add an upward clause using `consistent_child` and `ΨUp` when the lace moves from a child to its parent.
4. Add a downward clause using `ΨDown` when it moves from parent to child.
5. Add a query rejecting labels whose final status is in the selected error set.

Theorem 3 states that the minimal model of `Lab` is exactly labels occurring in knitted-tree prefixes (Section 5, p. 15). The exit-status query is unsatisfiable exactly when no represented execution has a selected status (Theorem 4, p. 16).

Verus form (Inference): encode `Lab` as a ghost predicate over a label type, and prove each base/transition clause as a lemma. `consistent_child` becomes a `spec fn`; transition lemmas use `requires` for local labels and `ensures` for the extended label. A Verus proof cannot inherit a CHC solver's least-model computation automatically, so the induction measure and closure of the ghost relation must be explicit.

## technique 4: sound memory-safety semi-algorithm

Run `ExitStatus(P,m,n,{E})` first. If satisfiable (the paper phrases the positive answer as a bad execution), report unsafe by Theorem 5 (Section 5.1, p. 17). If no null dereference is found, check `{M}` for out-of-memory and `{O}` for label overflow. If either is found, increment `m` or `n` and restart. If all three checks are negative, Theorem 6 gives safety for the covered executions. The algorithm is sound if it terminates (Theorem 7, p. 17). It may run forever because verification is undecidable or because no finite parameters capture all executions.

## evidence, trust, and limits

The paper gives theorems and a worked list-reversal encoding, rather than an experimental benchmark table; therefore there are no performance denominators to report. What is proved is the representation correspondence (Theorems 1–2), CHC minimal-model correspondence (Theorem 3), and soundness of the terminating safety algorithm (Theorem 7). The CHC solver, arithmetic/data-theory semantics, and the chosen finite bounds remain trusted components. The authors explicitly warn that “the knitted-tree’s parameters … may not capture every possible execution” (Section 1, p. 2), and that verification “may not terminate” (Section 1, p. 4). Structural postconditions and termination require additional encodings (Conclusion, p. 20).

Inference: the threat to VeruLaw is medium for pointer-heavy agents. The paper supplies a reusable ghost-trace and locality pattern, but it does not verify Rust, does not address Rust ownership, and leaves solver/model encodings to an implementation. VL should reuse the bounded-log and local parent/child proof decomposition rather than rebuild a generic heap trace without bounds.

## techniques for the catalog

- knitted-tree execution encoding: record input, intermediate frames, and output in one bounded tree log
- lace rewinding: resolve pointer aliases by backward traversal with update flags and explicit rewind events
- local CHC composition: synthesize node-label invariants from internal, upward, and downward transition clauses
- parameter-increment safety loop: distinguish errors, out-of-memory, and truncation, increasing bounds until a sound result is obtained

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
