# rCanary: Detecting Memory Leaks Across Semi-automated Memory Management Boundary in Rust
(authored by agents unless marked 🧑)
Tag: `cui2023rcanary`, [paper](https://arxiv.org/abs/2308.04787)

## scope and evidence

rCanary is a static checker for leaks caused when Rust values cross from automatic ownership-based destruction to manual destruction. It works over Rust MIR, encodes heap ownership as bit vectors, emits SMT-Lib2 constraints, and asks Z3 for satisfiability. The paper’s abstract claims: “We further apply our tool to more than 1,200 real-world crates from crates.io and GitHub, identifying 19 crates having memory leaks.” (Abstract, p. 1). It also says: “Our analyzer is also efficient, that costs 8.4 seconds per package.” (Abstract, p. 1).

## technique 1: model the semi-automated boundary with rtokens

what it is and when to use it

The paper introduces an exclusive resource token (`rtoken`) for each heap item. The token moves through variables, fields, references, and raw pointers; exactly one holder may own it while the heap item is live. `ManuallyDrop<T>` suppresses the compiler’s destructor and creates an orphan object. A proxy type stores the resulting raw pointer in a field and must free it in its `Drop` implementation.

The paper defines: “A heap item is an object containing the heap allocation with a fixed type (layout). It has an exclusive rtoken to monitor the deallocation, and the rtoken can be transferred among variables through the data flow.” (Definition 2.1, p. 2). It identifies the bug classes: “In this paper, we summarize two typical leak patterns across semi-automated boundaries: (i) orphan object missing drop() instruction in Mid-level Intermediate Representation (MIR); (ii) proxy type missing manual field deallocation in its Drop implementation.” (Section 2.1, p. 2).

how to apply it

1. Identify heap items from typed MIR and assign each a unique token (Definition 2.1, p. 2; Section 5.1, p. 6).
2. Treat functions that consume a heap item and return a pointer type or `ManuallyDrop` (e.g., `Box::into_raw`, `Box::leak`) as taint sources; transfer the token to the resulting pointer (Section 2.2, pp. 2–3; Sections 5.3.2 and 5.4, p. 8). Figure 1a also lists `forget()` as an ownership escape (p. 3), but the paper does not call it a taint source.
3. Track token holders through assignments and fields; a pointer may hold a token but can never be the owner (Section 2.1, p. 2).
4. Require explicit `drop_in_place` for orphan pointers and explicit field deallocation in proxy `Drop` implementations (Listings 1–2, p. 3).

Inference: in Verus, represent a live allocation and its unique holder with a ghost token or tracked permission. A function that consumes a token can have `requires` ownership of that token and `ensures` transfer to one destination or deallocation. This models the invariant but does not make unsafe pointer operations safe automatically; the pointer abstraction and allocator contract remain trusted unless separately specified.

## technique 2: field-sensitive type encoder

what it is and when to use it

The encoder maps each fully initialized Rust type to a fixed-length vector whose entries are `1` (field holds a heap item), `0` (does not), or `-1` (uninitialized). It is field-sensitive and handles generic types by analyzing algebraic data type definitions and isolated generic parameters. This is needed before MIR constraints can reason about partial moves, field assignment, and nested containers.

The authors state: “The rtoken is represented as a fixed-length bit vector.” (Section 4.1, p. 4). They specify the abstraction: “Each member denotes whether this initialized field is a heap item.” (Definition 4.1, p. 5).

how to apply it

1. Collect all types appearing in a MIR body and extract their ADT definitions, including dependencies (Algorithm 1, lines 2–3, Section 4.2, p. 5).
2. Flatten fields into a dependency graph and break recursive generic arguments into a DAG (Algorithm 1, line 4; Section 4.2, p. 5).
3. Traverse each connected component in inverse topological order, caching whether each ADT contains a heap-item unit and whether a parameter is isolated (Algorithm 1, lines 6–11, p. 5).
4. Encode a field as a heap item (`1`) if its type definition has a heap-item unit; otherwise recurse into each isolated generic argument and return that result, else `0` (Algorithm 1, `EncodeField`, lines 13–19, p. 5; Section 4.3, p. 5).
5. Construct the vector field by field; use `Ext` when reading a field and `Srk` when writing a field of a different vector length (Sections 4.3 and 5.2.3, pp. 5–7). The paper says `Ext` is used for fields accessed in rvalues and `Srk` for fields accessed in lvalues, and that it sets the maximum field-access depth to one (Section 5.2.3, p. 7).

The paper reports maximum complexity `O(fd)`, where `f` is the maximum size among fields and `d` the maximum depth among `GenericArgs` (Section 4.3, p. 6). For examples, `String` encodes as `[1]` and `Vec<u8,Global>` as `[1,0]` (Section 4.3, p. 5). The paper conservatively treats trait objects and parameters as heap items (Section 4.3, p. 6; Table 1, p. 4).

Inference: Verus could use a ghost sequence or bit vector for resource fields and prove constructor/destructor preservation with `ensures`. A production checker would need a verified correspondence between Rust layouts and this vector; rCanary deliberately ignores alignment and tracks field index, so the abstraction is unsuitable for layout-sensitive claims.

## technique 3: leak-free MIR constraints

what it is and when to use it

The leak-free model maintains heap items `H`, a mapping `M` of holder candidates for each rtoken at each program point, and constraint set `C` (Section 5.1, p. 6). It traverses MIR control-flow graphs, splits strongly connected components with Tarjan’s algorithm, processes each DAG once in topological order, merges predecessor states with a monotone φ operation, and emits SMT constraints for Z3.

The model’s four obligations are stated as follows: “There exists one and only one rtoken for each heap item allocated but not deallocated.”; “Every heap item except the return value must execute drop() to free the rtoken before return.”; “The drop() instruction must free all necessary fields.”; and “The type associated with the rtoken is fixed across statements and function calls.” (Properties 5.1–5.4, Section 5.1, p. 6).

how to apply it

1. Extract each local function as a MIR entry and represent basic blocks as CFG nodes (Section 5.2.1, p. 6).
2. Use Tarjan SCC decomposition, topological order over the resulting DAG, and a φ merge at nodes with multiple predecessors; process each node once because the lattice is monotone (Section 5.2.1, p. 6).
3. For `move` (rule ASGN M), constrain the destination’s prior state to be zero (otherwise the overwritten token leaks), the source’s new state to be zero, and the destination’s new state to equal the source’s old state; for `copy` (rule ASGN C), constrain the token to end up in exactly one of source or destination (Section 5.2.2, pp. 6–7; Fig. 5, p. 7).
4. For field reads/writes, apply `Ext` or `Srk`; for constructors initialize vectors and for destructors meet the current vector with the negated constructor vector (Sections 5.2.3 and 5.3.1, pp. 7–8; Definitions 5.3–5.4, p. 8).
5. At return, assert that the latest states of the variables are zeroed; solve the constraints, and if the result is UNSAT, emit the recorded taint-source call site (Section 5.4 and Fig. 6, p. 8; Section 5.3.2, p. 8).

The proxy example produces `UNSAT` because its destructor leaves the pointer field live (Section 5.4, p. 8). Inference: a Verus encoding can state the same uniqueness and zero-at-return facts as ghost ownership predicates and loop invariants. SMT generation over arbitrary MIR is outside ordinary Verus use; this technique is best viewed as a separate pre-check that supplies resource facts to a later proof.

## technique 4: taint-guided interprocedural refinement

what it is and when to use it

Constraint errors propagate across callees. rCanary therefore uses taint analysis to simplify function boundaries. A taint source consumes a heap item and returns a pointer type or `ManuallyDrop`; a taint sanitizer consumes a `ManuallyDrop` or pointer type and returns a heap item (examples: `Box::leak` as source, `Box::from_raw` as sanitizer). The bug reporter also filters irrelevant output such as intentional leaks through extern function return values, and keeps the taint-source call site.

The paper says: “Errors propagation plague inter-procedural analysis based on boolean satisfiability” (Section 5.3.2, p. 8), and explains that the taint functions simplify function boundaries and “are also used in the bug reporter to suppress false positives” (Section 5.3.2, p. 8).

how to apply it

1. Mark functions that consume a heap item and return a pointer or `ManuallyDrop` (e.g., `Box::leak`, `Box::into_raw`) as taint sources; record the call site as a potential leak candidate if the solver result is UNSAT (Sections 5.3.2 and 5.4, p. 8).
2. Mark functions that take a `ManuallyDrop` or pointer and return a heap item (e.g., `Box::from_raw`) as taint sanitizers, which return the owner to automated deallocation (Section 5.3.2, p. 8).
3. For other callees, the paper says “we assume the object arguments will invoke drop()” and that other types will not be deallocated by default (Section 5.3.2, p. 8; the sentence spans a column break). The manual fix shown in the paper’s listings is an explicit `drop_in_place` on the pointer (Listings 1–2, p. 3).
4. Filter extern-function return values and report only the taint source in the top entry (Section 6.1.3, pp. 9–10).

Inference: Verus can encode source/sanitizer obligations as ghost state-machine transitions, but intentional leaks and FFI ownership contracts still need explicit `external_body`-style trust boundaries or modeled wrappers. Do not claim the checker proves across FFI: the authors explicitly say rCanary “still cannot cross the FFI boundary.” (Section 6.1.4, p. 10).

## evaluation, limits, and implications

The prototype has around 8,000 lines of Rust and targets rustc 1.62 (Section 6, p. 8). The benchmark has nine retained repositories after filtering (Section 6.1.1, p. 9). The paper says rCanary “can recall all related issues with acceptable false positives” (Section 6.1.4, p. 10; also Abstract, p. 1). It gives no single false-positive rate; Table 4 (p. 9) lists rCanary false positives of 4 for napi-rs, 3 for rowan, and 0 for the other seven packages, and a `+N` in the true-positive column counts FFI functions that developers must check manually (Section 6.1.4, p. 10). The ecosystem run downloaded more than 1,200 packages: 3.0% had Rust-version conflicts, 11.6% unsupported virtual workspaces, and 85.4% were effectively analyzed (Section 6.2, p. 10); the three percentages sum to 100.0%, and the paper says “Among the evaluated packages”. The authors then manually checked the reports and “listed 19 crates with memory leaks” (Section 6.2, p. 10; Table 5, p. 9). The scan took about 96 minutes for 1.2k packages, 8.4 seconds on average per package; the paper says “Since we use incremental compilation, it does contain the overhead of the compilation elapsed” (Section 6.3, p. 10). On the nine-package benchmark, all experiments were repeated five times and the median time shares are AdtDef analysis 5%, constraint building 35%, constraint solving 59% (Section 6.3 and Figure 7, p. 10). Inference: these sum to 99% because of rounding or medians being taken per phase.

Stated limitations: no storing of orphan objects in static arrays or dynamic vectors (Section 2.3, p. 3); “rCanary is neither sound nor complete”; the heap-item unit relies on `PhantomData` and may give false positives for some user-defined types; field access depth is restricted, which can cause false negatives; orphan objects in arrays or containers (e.g., `Vec`, `HashMap`) and pointer arithmetic are unsupported (Section 6.5, p. 11); it cannot cross the FFI boundary (Section 6.1.4, p. 10). The benchmark construction excluded leaks caused by reference cycles and leaks caused solely by manual memory management (Section 6.1.1, p. 9); Inference: these are outside rCanary’s target patterns. The authors conclude: “Semi-automated memory management model cannot prevent memory leaks in Rust.” (Section 8, p. 11).

## techniques for the catalog

- rtoken ownership model — assign one transferable token to every live heap item and require unique ownership
- field-sensitive type encoding — map typed fields and generic containers to heap-item bit vectors
- MIR constraint generation — translate moves, copies, fields, drops, and returns into SMT constraints
- CFG/SCC traversal — process flow-sensitive MIR with monotone joins and one traversal per SCC-DAG node
- taint-source/sanitizer analysis — follow escaped allocations through pointer-returning sources and owner-restoring sanitizers, and suppress irrelevant reports
- SMT leak checking — classify a function as leak-free when its generated constraints are satisfiable
