# SafeDrop: Detecting Memory Deallocation Bugs of Rust Programs via Static Data-Flow Analysis
(authored by agents unless marked 🧑)
Tag: `cui2021safedrop`, [paper](http://arxiv.org/abs/2103.15420v2)

## what the paper studies

Cui, Chen, Xu and Zhou study invalid Rust deallocation caused by unsafe aliasing, automatic `Drop`, and exception unwinding. Safe Rust’s ownership rules do not model every raw-pointer construction or interior unsafe operation. The paper proposes “a static path-sensitive data-flow analysis approach to detect such bugs” (abstract, p.1), implemented as a Rust compiler v1.52 query over optimized MIR. The target findings are use-after-free, double-free, dangling pointers and invalid memory access. The abstract reports: “The analysis overhead ranges from 1.0% to 110.7% in comparison with the original compilation time.” (p.1) The authors evaluate nine CVEs from eight crates, 24 additional crates, and compilation overhead on the CVE crates (Section 5, pp.7–10).

## technique 1: MIR-level path extraction with modified Tarjan

what it is: SafeDrop analyzes each function’s MIR control-flow graph with a meet-over-paths (MOP) strategy. A valuable path has a unique set of blocks from entry to exit and is not a subset of another valuable path. Strongly connected components are collapsed with a modified Tarjan algorithm, a spanning tree is generated, and the tree is traversed recursively. This removes redundant cycle traversal while retaining path sensitivity (Section 4.2, pp.4–5).

when to use it: use this when alias relationships differ by branch and a flow-insensitive or semi-lattice analysis would merge unrelated paths. It is aimed at compiler-time analysis of Rust functions with cycles and exception edges.

how it is done:
1. receive optimized MIR and its CFG after all compiler optimization passes (Section 5.1, p.7)
2. compute strongly connected components with Tarjan and collapse cycles into graph points (Algorithm 1, p.4)
3. generate a spanning tree and inspect `SwitchInt()` conflicts; for mutually exclusive enum variants, enumerate each variant once and prune unreachable branches (Section 4.2, pp.4–5)
4. recursively traverse the tree, backing up and restoring analysis state at branches (Algorithm 1, p.4)
5. merge findings at each leaf using meet-over-paths and cache the resulting flags and alias summaries (Sections 4.2–4.4, pp.4–6)

The paper reports that resolving a `SwitchInt()` conflict reduces this corner case from O(n^k) to O(n) (Section 4.2, p.5). It also admits that nested conditionals can still cause path explosion; above a threshold it falls back to a traditional semi-lattice scheme (p.5).

Inference: a Verus-oriented implementation would need an external MIR/CFG pass to enumerate paths before invoking Verus. Inside Verus, path facts could be represented by branch-specific `assert` statements and loop `invariant` clauses, but Verus does not provide SafeDrop’s path-enumeration API. This analysis is therefore a bug-finding front end rather than a replacement for a Verus proof.

## technique 2: field-sensitive alias analysis

what it is: SafeDrop tracks aliases flow-sensitively at each program point using disjoint sets (union-find). It first filters values whose types implement `Copy`, recursively filtering composite types only when all fields qualify. Slices, references and raw pointers are retained despite `Copy` because their alias transmission matters (Listing 3, p.5). For assignments, it handles Copy, Move, casts, references and raw-pointer address operations (Listing 4, p.5). Composite fields are tracked separately to avoid merging unrelated aliases.

how to use it:
1. apply the type filter to skip stack-only values while retaining pointer-bearing values (Section 4.3.1, p.5)
2. initialize a field-level map for variables and composite fields
3. for each MIR assignment, transfer ownership/alias relationships for moves, create relationships for references and raw pointers, and preserve cast relationships (Listing 4, p.5)
4. merge two union-find sets when an assignment establishes an alias; for example, `LValue := Ref(RValue)` merges their sets (p.5)
5. keep the alias set separately for every CFG point and every selected path (p.5)

The paper explains that field-insensitive tracking “will incur a bunch of false positives into SafeDrop” (Section 4.3.1, p.5). It also removes aliases established by `Clone` because clone returns a deep copy (Section 5.4.1, p.10).

Inference: Verus can state ownership-sensitive API contracts with `requires` and `ensures`, and use proof lemmas to show that a returned reference or raw pointer obeys an aliasing invariant. Those contracts must model the unsafe operation explicitly; SafeDrop’s union-find computation cannot itself become a Verus proof. The distinction matters because a warning is evidence for review, whereas an `ensures` proof is a checked claim about the modeled function.

## technique 3: inter-procedural summaries, recursion fixed points and caching

what it is: on a call, SafeDrop queries the compiler for the callee’s final optimized MIR, analyzes it recursively, and returns alias relationships between arguments and the return value. Recursive calls use a fixed-point iteration. A call-stack guard permits each function ID once per stack; a default false summary prevents infinite recursion, and the function is reanalyzed until the alias relation stabilizes. Completed callee summaries are cached in a hash table and reused (Section 4.3.2, p.6).

how to use it:
1. identify a call terminator and request optimized callee MIR by internal function ID (p.6)
2. run the same path and alias analysis on the callee
3. return argument-to-result alias sets to the caller (p.6)
4. for recursion, push a function ID once, use a default false relation on the first visit, then re-execute affected stack functions until a fixed point (p.6)
5. cache the union of valuable-path summaries and reuse them at subsequent calls (p.6)

Inference: a VL verifier can use modular Verus contracts as summaries: a callee’s `requires`/`ensures` contract is the interface, while proof lemmas establish the summary. Recursive Rust code still requires a termination argument and inductive invariant in Verus; SafeDrop’s alias fixed point is a separate static-analysis algorithm.

limits: SafeDrop relies on `optimized_mir`; compiler-internal trait implementations may produce empty or incomplete MIR and lose aliases. The authors list unsupported primitive arrays, closures, raw-pointer offsets and function pointers as sources of false negatives (Section 5.4.2, p.10).

## technique 4: taint-based invalid-drop rules

what it is: after alias sets are built, SafeDrop tracks deallocated buffers and returned dangling pointers in a taint set. A `Drop()` terminator taints the dropped variable or each drop-trait field; the taint propagates through aliases. The analyzer checks every path for four rules: use-after-free when a tainted alias is used or passed, double-free when a tainted alias is dropped again, invalid memory access when an uninitialized value is used or dropped, and dangling-pointer when a returned pointer is tainted (Section 4.4, pp.6–7).

how to use it:
1. add a dropping variable or field to the taint set at `Drop()` (p.6)
2. propagate taint over the path’s alias sets (p.6)
3. insert an uninitialized constructor into the taint set and remove it after initialization (p.6)
4. at each use, call, or drop, test the variable against all tainted aliases (p.6)
5. set independent warning flags, record the source location and issue kind, then merge flags at the path leaf and cache them (Algorithm 1 and Section 4.4, pp.4, 6–7)

The paper’s motivating examples include `Vec::from_raw_parts` while the original `String` is later dropped, and a panic before an uninitialized `Foo` is fully initialized (Section 3.1, pp.2–3). Its seven pattern forms include `GetPtr() -> UnsafeConstruct() -> Drop() -> Use() => UAF` and `Uninitialized() -> Drop() => IMA` (Listing 2, p.3).

Inference: Verus could encode a resource protocol as a ghost state and prove that a destructor consumes a unique permission, with `assert`/`proof fn` lemmas for alias transitions. That would require a formal model of each unsafe constructor and unwind path. SafeDrop’s taint warning can instead prioritize which functions need such contracts.

## evidence, trusted boundary and limitations

For the nine CVEs (two UAF, three double-free and four invalid-memory-access cases) from eight crates, Table 1 reports 100% recall for every crate. The table’s TP/FP denominator is each warning count, not the number of vulnerabilities: for example, `open-ssl` has 1/3 total TP/FP and 100% recall, while `linea` has 11/0. The paper says the effectiveness evaluation does not calculate a conventional false-positive rate because SafeDrop targets this narrow bug class (Section 5.3.1, p.8). On 24 additional crates, eight had previously unknown issues; 75% (6/8) had zero false positives and the other two had at most two (Table 2, p.9). The compilation experiment averages three runs on a 2.00 GHz Intel processor under Ubuntu 18.04.1; overhead ranges from 1.2% to 110.7% and is generally below 2× (Section 5.2 and Figure 7, pp.7, 10). The abstract rounds the lower bound to 1.0%, so the detailed Section 5.4 value is the more specific report.

SafeDrop trusts MIR generation, compiler query results, its alias rules, the path-pruning refinement, and manual TP/FP classification. It does not prove absence of bugs, and unsupported constructs can yield false negatives. Inference: for a product producing agent-written verified Rust, the threat is complementary to functional-proof failure: unsafe code and panic paths may remain outside specifications even when ordinary Verus contracts pass. Running SafeDrop-like MIR checks before proof generation could catch deallocation patterns, but the final claim must still be checked against the exact unsafe implementation and unwind model.

## what VL should not redo

Inference: VL should not claim that ordinary ownership checking alone covers unsafe deallocation; this paper documents concrete CVEs and compiler-internal blind spots. It also should not rebuild a generic MIR path analyzer without comparing against SafeDrop’s Tarjan, field-sensitive alias, inter-procedural cache and taint rules. A novel VL contribution would need evidence that these checks integrate with Verus specifications, proof repair or product-scale CI.

## techniques for the catalog

- Tarjan path extraction — collapse SCCs, resolve enum-branch conflicts, and enumerate valuable CFG paths without redundant cycle traversal
- field-sensitive union-find aliases — track pointer-bearing fields and flow-sensitive alias sets while filtering irrelevant Copy values
- fixed-point callee summaries — recursively analyze optimized MIR, iterate recursive summaries to a fixed point, and cache results
- taint-based drop checks — propagate dropped or uninitialized resources through aliases and flag UAF, double-free, dangling-pointer and invalid-access patterns

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
