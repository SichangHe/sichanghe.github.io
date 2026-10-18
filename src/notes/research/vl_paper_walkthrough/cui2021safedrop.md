# SafeDrop: Detecting Memory Deallocation Bugs of Rust Programs via Static Data-Flow Analysis
(authored by agents unless marked 🧑)
Tag: `cui2021safedrop`, [paper](http://arxiv.org/abs/2103.15420v2)

## what the paper studies

Cui, Chen, Xu and Zhou study invalid Rust deallocation caused by unsafe aliasing, automatic `Drop`, and exception unwinding. Safe Rust’s ownership rules do not model every raw-pointer construction or interior unsafe operation. The paper proposes “a static path-sensitive data-flow analysis approach to detect such bugs” (abstract, p.1), implemented as a Rust compiler v1.52 query over optimized MIR. The target findings are use-after-free, double-free, dangling pointers and invalid memory access. The abstract reports: “The analysis overhead ranges from 1.0% to 110.7% in comparison with the original compilation time.” (p.1) The authors evaluate nine CVEs from eight crates, 24 additional crates, and compilation overhead on the CVE crates (Section 5, pp.8–10).

## technique 1: MIR-level path extraction with modified Tarjan

what it is: SafeDrop analyzes each function’s MIR control-flow graph with a meet-over-paths (MOP) strategy. A valuable path has a unique set of blocks from entry to exit and is not a subset of another valuable path. Strongly connected components are collapsed with a modified Tarjan algorithm, a spanning tree is generated, and the tree is traversed recursively. This removes redundant cycle traversal while retaining path sensitivity (Section 4.2, pp.5–6).

when to use it: the paper chooses meet-over-paths "to improve the precision rather than using the traditional semi-lattice scheme" (Section 4.2, p.5). Inference: use it when alias relationships differ by branch and a semi-lattice analysis would merge unrelated paths; it targets compile-time analysis of Rust functions with cycles and exception-handling edges.

how it is done:
1. receive optimized MIR and its CFG after all compiler optimization passes (Section 5.1, p.8)
2. compute strongly connected components with Tarjan and collapse cycles into graph points (Algorithm 1, p.6)
3. generate a spanning tree and inspect `SwitchInt()` conflicts; for mutually exclusive enum variants, enumerate each variant once and prune unreachable branches (Section 4.2, p.6)
4. recursively traverse the tree, backing up and restoring analysis state at branches (Section 4.2, p.6)
5. merge findings at each leaf using meet-over-paths and cache the resulting flags and alias summaries (Algorithm 1, p.6; Section 4.3.2, p.7)

The paper reports that resolving a `SwitchInt()` conflict reduces this corner case from O(n^k) to O(n) (Section 4.2, p.6). It also admits that path explosion is not fully avoided and comes mainly from nested conditional statements rather than cycles; if the path counter exceeds the upper limit, SafeDrop performs the traditional semi-lattice scheme, "a trade-off between the precision and the speed" (p.6).

Inference: a Verus-oriented implementation would need an external MIR/CFG pass to enumerate paths before invoking Verus. Inside Verus, path facts could be represented by branch-specific `assert` statements and loop `invariant` clauses, but Verus does not provide SafeDrop’s path-enumeration API. This analysis is therefore a bug-finding front end rather than a replacement for a Verus proof.

## technique 2: field-sensitive alias analysis

what it is: SafeDrop tracks aliases flow-sensitively at each program point using disjoint sets (union-find). It first filters values whose types implement `Copy`, recursively filtering composite types only when all fields are filtered and the type also implements `Copy`. Slices, references and raw pointers are removed from the filter, so they are analyzed even though they are `Copy`, because of "their precise transmission of alias relationship" (Listing 3 and Section 4.3.1, pp.6–7). For assignments, it handles Copy, Move, casts, references and raw-pointer address-of operations (Listing 4, p.7). Move assignments transfer the alias map instead of creating a new relation (Listing 4 caption, p.7). Composite fields are tracked separately to avoid merging unrelated aliases.

how to use it:
1. apply the type filter to skip stack-only values while retaining pointer-bearing values (Section 4.3.1, pp.6–7)
2. initialize a field-level map for variables and composite fields
3. for each MIR assignment, transfer ownership/alias relationships for moves, create relationships for references and raw pointers, and handle Copy and cast assignments by the Listing 4 rules (p.7)
4. merge two union-find sets when an assignment establishes an alias; for example, `LValue := Ref(RValue)` merges their sets (p.7)
5. keep the alias sets for each program point of each path (Section 4.3, pp.6–7)

The paper explains that field-insensitive tracking “will incur a bunch of false positives into SafeDrop” (Section 4.3.1, p.7). It also removes aliases established by `Clone` because clone returns a deep copy (Section 5.4.1, p.10).

Inference: Verus can state ownership-sensitive API contracts with `requires` and `ensures`, and use proof lemmas to show that a returned reference or raw pointer obeys an aliasing invariant. Those contracts must model the unsafe operation explicitly; SafeDrop’s union-find computation cannot itself become a Verus proof. The distinction matters because a warning is evidence for review, whereas an `ensures` proof is a checked claim about the modeled function.

## technique 3: inter-procedural summaries, recursion fixed points and caching

what it is: on a call, SafeDrop queries the compiler for the callee’s final optimized MIR, analyzes it recursively, and returns alias relationships between arguments and the return value. Recursive calls use a fixed-point iteration. A call-stack guard permits each function ID once per stack; a default false summary prevents infinite recursion, and the function is reanalyzed until the alias relation stabilizes. Completed callee summaries are cached in a hash table and reused (Section 4.3.2, p.7).

how to use it:
1. identify a call terminator and request optimized callee MIR by internal function ID (p.7)
2. run the same path and alias analysis on the callee
3. return argument-to-result alias sets to the caller (p.7)
4. for recursion, push a function ID once, use a default false relation on the first visit, then re-execute affected stack functions until a fixed point (p.7)
5. cache the union of valuable-path summaries and reuse them at subsequent calls (p.7)

limits: SafeDrop "heavily relies on the query optimized_mir" for callee MIR and "cannot capture some MIR such as specific trait implementations" (Section 5.4.1, p.10). For some inline functions the query returns MIR "containing empty information", so SafeDrop loses some alias relationships. The authors also list unsupported primitive arrays, closures, raw-pointer offset and function pointers as sources of false negatives (Section 5.4.2, p.10).

## technique 4: taint-based invalid-drop rules

what it is: after alias sets are built, SafeDrop tracks deallocated buffers and returned dangling pointers in a taint set. A `Drop()` terminator taints the dropped variable or each drop-trait field; the taint propagates through aliases. The analyzer checks every path for four rules: use-after-free when a tainted alias is used or passed, double-free when a tainted alias is dropped again, invalid memory access when an uninitialized value is used or dropped, and dangling-pointer when a returned pointer is tainted (Section 4.4, pp.7–8).

how to use it:
1. add a dropping variable or each drop-trait field to the taint set at `Drop()` (p.7)
2. propagate taint over the path’s alias sets (p.7)
3. insert a variable built from `uninitialized()` into the taint set at declaration and remove it if it is initialized later (p.7)
4. at each use, call, or drop, test the variable against all tainted aliases (p.7)
5. set independent warning flags, record the source location and issue kind, then merge flags at the path leaf and cache them (Algorithm 1, p.6; Section 4.4, pp.7–8)

The paper’s motivating examples include `Vec::from_raw_parts` while the original `String` is later dropped, and a panic before an uninitialized `Foo` is fully initialized (Section 3.1, pp.3–4, Figure 2). Its seven pattern forms include `GetPtr() -> UnsafeConstruct() -> Drop() -> Use() => UAF` and `Uninitialized() -> Drop() => IMA` (Listing 2, p.5).

Inference: Verus could encode a resource protocol as a ghost state and prove that a destructor consumes a unique permission, with `assert`/`proof fn` lemmas for alias transitions. That would require a formal model of each unsafe constructor and unwind path. SafeDrop’s taint warning can instead prioritize which functions need such contracts.

## evidence, trusted boundary and limitations

For the nine CVEs (two UAF, three double-free and four invalid-memory-access cases) from eight crates, Table 1 reports 100% recall for every crate. The table’s TP/FP denominator is each warning count, not the number of vulnerabilities: for example, `open-ssl` has 1/3 total TP/FP and 100% recall, while `linea` has 11/0. The paper says the effectiveness evaluation does not calculate a false-positive rate because SafeDrop only detects invalid deallocation bugs caused by OBRM, which has "a relatively low cardinal" (Section 5.3.1, pp.8–9). Inference: "narrow bug class" is my paraphrase of that explanation. The paper's section 5.2 text counts the nine CVEs as 2 use-after-free, 3 double-free and 4 invalid-memory-access, but the CVE-Type column of Table 1 (p.9) lists 2 UAF, 4 DF and 3 IMA; the paper does not reconcile this. On 24 additional crates, eight had previously unknown issues; 75% (6/8) had zero false positives and the other two had at most two (Table 2, p.9; Section 5.3.2, p.9). The compilation experiment averages three runs on a 2.00 GHz Intel processor under Ubuntu 18.04.1 with Linux kernel 5.4 (Section 5.2, p.8). Section 5.3.3 (p.10) reports that on the eight CVE crates "The overhead ranges from 1.2% to 110.7%" and concludes it "would not exceed 2× to the original compiling time in general"; the abstract says 1.0% instead of 1.2% and the paper does not explain the difference. The Figure 7 caption attributes the apparently large overhead of `ordnung` to "amounts of successive SwitchInt() nodes with the changing variants" (p.10).

The paper classifies warnings as TP/FP by manual checking (Section 5.3.1, p.8). Inference: SafeDrop's results depend on MIR generation, compiler query results, its alias rules, the path-pruning refinement, and that manual classification. The paper reports no soundness proof and admits false negatives for unsupported constructs (Section 5.4.2, p.10). Inference: for a product producing agent-written verified Rust, the threat is complementary to functional-proof failure: unsafe code and panic paths may remain outside specifications even when ordinary Verus contracts pass. Running SafeDrop-like MIR checks before proof generation could catch deallocation patterns, but the final claim must still be checked against the exact unsafe implementation and unwind model.

## techniques for the catalog

- Tarjan path extraction — collapse SCCs, resolve enum-branch conflicts, and enumerate valuable CFG paths without redundant cycle traversal
- field-sensitive union-find aliases — track pointer-bearing fields and flow-sensitive alias sets while filtering irrelevant Copy values
- fixed-point callee summaries — recursively analyze optimized MIR, iterate recursive summaries to a fixed point, and cache results
- taint-based drop checks — propagate dropped or uninitialized resources through aliases and flag UAF, double-free, dangling-pointer and invalid-access patterns
