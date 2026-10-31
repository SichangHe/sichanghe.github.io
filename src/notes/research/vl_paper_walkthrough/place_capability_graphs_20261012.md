# Place Capability Graphs: A General-Purpose Model of Rust's Ownership and Borrowing Guarantees
(authored by agents unless marked 🧑)
Tag: `grannan2025place`, [paper](https://doi.org/10.1145/3763122)

## paper and overlap with earlier notes

This study reads the complete paper text, including its formal definitions, algorithms, evaluation, mutation experiment, and related-work discussion. The paper does not prove application-level functional properties. It gives downstream analyses a compiler-connected, path-sensitive representation of the ownership and borrowing facts that Rust has already accepted.

## the PCG data model

A Place Capability Graph (PCG) is a directed hypergraph computed from Rust MIR and compiler borrow-checking results. A place node names a memory location and carries one capability: exclusive (`E`, read/write/borrow/move), read (`R`, read or immutable-borrow), write (`W`, assignment), or none (`∅`). A lifetime-projection node `p ↓ 'a` denotes the set of borrows currently stored in place `p` under lifetime `'a`. Edges are typed borrow, unpack, borrow-flow, abstraction, alias, or dereference edges; many-to-many hyperedges are allowed. The paper's exact summary is, “A PCG is a directed hypergraph over two kinds of nodes.”

This representation is useful when a verifier or analysis needs to know not only that a program type-checks, but which place currently owns or borrows what, how a borrow can flow, and which path or call created the dependency. It is deliberately a model of successful compiler results rather than a replacement borrow checker. Its five design targets are precision where computable, compiler-compatible abstractions for loops/calls/borrow sets, direct correspondence to compiler representations, real-world coverage, and use by multiple consumers.

## technique 1: build PCGs by forward MIR analysis

Use the compiler as the source of truth. Require typed MIR with unique labels for program points, identified CFG branches/joins, loop heads, and back-edges. Initialize each argument with an `E` place node and one lifetime projection for each lifetime in its type. Walk basic blocks in reverse postorder, applying a rule for each statement. Before each rule, expire borrow edges whose compiler-reported extents ended and perform local graph operations needed to expose the rule's precondition. At a join, start from a graph produced by joining direct predecessor states.

The implementation returns a PCG at every program point plus annotations describing transitions. A client may inspect graphs directly or consume transition annotations. This separation lets Flowistry use graph alias facts while Prusti uses operation annotations to create proof assertions.

In Verus, a front end could use these annotations to generate ghost permissions and invariant templates. This is an architectural recommendation, not a result measured by the paper. The assumption is that MIR and its compiler APIs remain stable enough for a maintained adapter; the evaluation used Rust nightly 2024-12-15.

## technique 2: expose fields with unpack and pack operations

Rust can move a field while the enclosing struct remains partially usable. A single capability on `pos` therefore must be decomposed into field capabilities before a field-level statement is checked. The PCG operation `unpack p` replaces `p:E` with immediate projection nodes such as `p.x:E` and `p.y:E`, joined by an unpack edge. A move `p = move q` then exchanges `p:W` and `q:E` for `p:E` and `q:W`. When all field capabilities are restored, `pack p` combines them back into `p:E`; if one field was moved, packing is impossible, matching Rust's error.

The paper's example begins with `let old_x = pos.x`, whose MIR is `old_x = move pos.x`. The authors explain, “The move in Line 5 transfers ownership only from pos.x to old_x, therefore, attempting to read from pos.x or pos immediately after this line will cause a type-checking error.” Apply the method by (1) finding the enclosing place, (2) unpacking to the exact projection needed by the statement, (3) applying the move/borrow rule, and (4) packing only when the children regain the parent's capability.

Inference: a Verus translation can use a ghost representation predicate for a struct and split/merge permissions around field updates. The PCG operation is compiler-analysis machinery; Verus's `requires`, `ensures`, and proof blocks are the target obligations. Recursive structs and fields carrying references require the lifetime-projection extension below.

## technique 3: represent borrows and reborrows with lifetime projections

For `p = &mut q`, require `p:W` and `q:E`, change the source to `q:∅`, create a lifetime projection `p ↓ 'a`, and add a borrow edge from `q` to that projection. A shared borrow uses `q:R` and leaves `q:R`. The source's lost capability records why direct access is blocked. A dereference operation turns the borrow's `E` capability into `*p:E` only when a live lifetime projection justifies it; the analysis labels the projection with the program point when the original place is no longer readable. When the borrow expires, remove its edges and restore the lender's capability.

The model also optionally inserts an alias edge between a known lender and dereference. Its invariant is that every readable or exclusive place has lifetime projections for all lifetimes in its type, so clients can inspect stored borrows whenever the place is accessible.

For Verus, map the lender/borrow relationship to a ghost permission token or linear ghost state, and make the function's `requires` state the lifetime/permission facts needed for dereference. This is an inference: PCGs do not supply a ready Verus encoding, and the paper's purpose is to expose compiler facts. The advantage is an explicit explanation of why an access is legal rather than a solver-only permission failure.

## technique 4: track borrows stored in structs and nested references

A type such as `List<&mut i32>` may contain an unbounded set of borrows, so enumerating each borrow is impossible. Lifetime projections summarize the set. When a place loses read/exclusive capability, label its projection with the prior program point. When ownership flows through a move or unpack, add borrow-flow edges from old projections to the new place's projections. This preserves where a set of borrows may have originated.

Nested borrows create a harder case: a reference to `p` may change the borrows stored inside `p` while `p` itself is unavailable. The paper introduces future projections `p ↓ 'a at FUT`. On creating a borrow, label old projections and create future nodes with incoming edges from both the old projection and the new borrow's projection. On later moves/borrows, redirect dependencies to the current/future nodes. When `p` becomes readable again, replace future nodes with current projections. The authors state, “These nodes are used to track the borrow flow edges that will need to be incoming to a lifetime projection node p ↓ 'a by the time it next becomes available.”

The paper's worked `rf` example shows this concretely: after `rf = &mut f`, a future `f ↓ 'a0 at FUT` records borrows that become available when `rf` expires; after `(*rf).y = r3`, edges are redirected to newly labelled and future projections. In Verus, this suggests ghost “future ownership” tokens and explicit post-borrow restoration lemmas. That mapping is an inference; the exact FUT node is PCG-specific.

## technique 5: preserve path-sensitive borrow flow at joins

Analyze each CFG branch separately, assign every branch choice a unique identifier, and label edges with the set of choices under which they exist. At a join, union graphs, merge labels on shared edges, and remove an identifier when all choices at that branch contain the edge. Place leaves are joined conservatively: a place is a leaf only if it is a leaf in both branches. Borrow origins and flows remain path-sensitive. A client can recover one path's DAG by retaining edges whose labels contain that path's choice set.

This avoids duplicating common graph structure while retaining branch-specific alias explanations. For Verus, use path conditions in `if` proofs and join ghost states by a common invariant; PCG labels can guide which facts need case splits. This is a suggested integration, not a measured Verus result.

## technique 6: summarize function calls with abstraction edges

A callee may return a borrow derived from an argument or mutate nested borrows in an argument. A caller cannot inspect owned parts changed behind a moved argument, but it can observe these borrow effects. For a call `p = f(q_i)`, add abstraction edges from argument lifetime projections to result projections whenever the argument lifetime outlives the result lifetime. Also create post-state projections for each operand, connect pre-state to post-state and nested post-state projections, and redirect edges to future nodes through the post-state projections.

The paper's `max` example permits `res` to borrow from either `rx` or `ry` solely from the function signature's outlives constraints. This is modular: the caller does not inline the callee. In Verus, an analogous function contract should expose returned references and frame effects; PCGs can generate candidate framing and lifetime dependencies. The paper does not claim that Verus currently consumes them; it identifies this as a likely use.

## technique 7: construct loop invariant graphs without fixpoint iteration

Loops can create and expire reborrows indefinitely. The analysis finds places live at the loop head and used in the body, marks those whose types can store borrows as blocking places, and identifies blocked places that may become inaccessible. It adds closest live borrowed ancestors as loop borrow roots. For every blocker/blocked pair, it asks the compiler which place blocks which at the loop head, adds borrow and abstraction edges, extracts the affected pre-loop subgraph, and replaces it with the invariant graph. Algorithm 1's five operations are: identify relevant places, add roots, make the invariant, extract the subgraph, and replace it.

This avoids an iterative graph fixpoint while preserving the shape of borrow-checker constraints. Inference: in Verus, this can seed a loop invariant for permissions and memory footprint, but a user still needs value invariants and (if required) a decreases clause. The PCG loop summary is about ownership/borrowing, not termination or functional properties.

## evidence from implementation and consumers

The open-source Rust crate supports both NLL and Polonius borrow checkers. On the top 500 crates, 118,483 of 121,271 functions succeeded (97.7%); 1,584 failed on unsafe pointers, 1,039 on calls with unsafe pointers and nested lifetimes, 80 on inline assembly, 73 on moving unsafe pointers with nested lifetimes, and 12 on compiler type-alias limitations. The run took 94 minutes on six cores and 64 GB RAM. The denominator makes clear that 2,788/121,271 functions (2.3%) did not produce PCGs.

Replacing Flowistry's alias analysis with PCGs passed all Flowistry tests. In the Prusti prototype, PCGs generated fold/unfold predicates, loop memory-footprint invariants, and magic-wand package/apply statements. On a Prusti subset with overflow checks disabled and only core memory-safety proofs, 155 tests passed, 40 failed, and 67 were ignored for unsupported features; this is 155/262 (59.2%) passed among included, failed, and ignored cases, while 155/195 (79.5%) passed among run tests only. The paper reports the counts but does not claim all failures are PCG defects; manual inspection attributed remaining failures to unrelated issues.

Mutation testing generated six classes of illegal MIR mutations across the top 250 crates. Of 7,728,767 mutants, 7,727,906 were killed by borrow checking (99.99%), 843 remained live, and 18 compiler panics were excluded from the `WriteToShared` kill count. The totals therefore do not form a perfect partition. Nine crates crashed the mutation tool. The authors could not reproduce live mutants in surface Rust and suspect mutation occurred after an earlier compiler check.

## techniques for the catalog

- compiler-connected place capability graphs — represent every MIR program point with capability-bearing places and lifetime projections derived from Rust's own analyses
- unpack and pack ownership transitions — split composite capabilities to check field moves/borrows and merge them only when all fields are available
- lifetime-projection borrow tracking — summarize stored borrow sets and connect lenders, references, dereferences, and expirations with typed edges
- future projections for nested reborrows — defer updates to inaccessible nested borrow sets and materialize them when the owner becomes available
- path-labelled graph joins — retain branch-specific borrow flow while sharing common graph structure at CFG joins
- abstraction edges for calls — summarize returned and mutated borrows from function signatures without inlining callees
- compiler-guided loop invariants — derive blocker/blocked places and replace loop subgraphs with a borrow-preserving invariant graph
