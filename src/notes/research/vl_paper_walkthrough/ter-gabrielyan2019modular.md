# Modular Verification of Heap Reachability Properties in Separation Logic
(authored by agents unless marked 🧑)
Tag: `ter-gabrielyan2019modular`, [paper](http://arxiv.org/abs/1908.05799v1)
## problem and contribution

This paper makes graph reachability local enough for modular separation-logic verification. Its abstract identifies the obstacles: “any heap modification may affect an unbounded number of reference chains, which complicates modular verification, in particular, framing,” and “general graph reachability is not supported by SMT solvers.” (§abstract, p.1) The solution adds a footprint parameter to reachability, uses relative convexity to frame calls, and supplies first-order encodings for updates and path decomposition.

The supported classes are acyclic graphs with bounded outdegree and potentially cyclic 0–1-path graphs, where there is at most one path (modulo cycles) between each pair; Sec. 4 defines a ZOPG as having “at most one (non-trivial) path (modulo cycles) between all pairs of nodes in the graph.” (§4, p.17) The paper's goal is procedure-modular reasoning: a caller uses a callee's contract without inspecting its implementation, other threads, or heap outside the callee footprint. (§1, pp.1–2; §4, p.17)

Inference: this is a specification and encoding technique. It does not discover graph invariants or prove arbitrary graph algorithms; users must provide footprints, reachability contracts, triggers, and class-specific side conditions.

## technique 1: footprint-local reachability specifications

what it is. Give every method a ghost graph `g` denoting its footprint, and define edge and path predicates relative to g. `E_F(g,x,y)` means an edge from x to y through selected fields F with x in g; `P_F(g,x,y)` is reflexive transitive closure where internal path nodes lie in g. The paper says: “We generalize classical reachability by adding an extra footprint parameter, g to make the property local.” (§2.2, p.4)

how to apply it.

1. Add a ghost footprint parameter g and, where useful, disjoint subfootprints such as `ldag` and `rdag`. (§2.1, pp.2–4)
2. Require and return permissions for every field of every node in g using iterated separating conjunction. (§2.1, p.3)
3. State closure, acyclicity, and reachability facts only with first argument g or a subset of g. (§2.2, p.4)
4. Use old-state predicates (`E0`, `P0`) in postconditions to describe exactly which edges and paths changed. (§2.2, pp.4–5)
5. For recursive calls, compute a subfootprint with a pure `sub(g,h,root)` function whose contract states containment, closure, root membership, and equivalence to local reachability. (§2.2, p.5)

The running `merge` contract requires `g = ldag ⊎ rdag`, roots in their respective sets, acyclicity, and exact reachability characterizations; its postcondition states that the new edge is `(link,r)` and that a path exists iff it existed before or passes through the new edge. (Figure 1, pp.2–3)

Verus form. Inference: encode g as a ghost `Set<NodeId>` or an abstract ownership token, and expose `spec fn edge(g, x, y)` and `spec fn path(g, x, y)` over a mathematical snapshot. A Rust method takes owned or borrowed nodes plus ghost parameters, with `requires` giving membership, disjointness, closure, and permissions; `ensures` uses `old(...)` views to state edge/path changes. Verus's ownership can enforce the field permissions operationally, but path closure and reachability still need explicit `spec fn`s and lemmas. Inference: a `proof fn sub` can provide the callee subfootprint facts; it is ghost proof code and does not execute.

where it fails or assumes. The path relation is not directly SMT-defined because transitive closure is difficult. The encoding instead abstracts the heap with `snapshot_F(g)` and defines `P` through an uninterpreted graph function whose recursive axiom is unfolded only to a fixed depth. (§3.1, pp.6–7) Inference: bounded unfolding can miss a proof requiring deeper paths; a Verus induction lemma over `Seq` or an explicit graph representation is needed for unbounded claims.

## technique 2: first-order update formulas

what it is. Field updates are rewritten to internal methods whose contracts expose exact edge and path effects. For adding edge `(a,b)` in an acyclic footprint, the paper gives: `P(g,x,y) iff P0(g,x,y) or P0(g,x,a) and P0(g,b,y)`. (§3.2, p.8) Removal uses a more complex formula because alternative paths may preserve reachability.

how to apply it.

1. Encode `E` via the snapshot abstraction so the solver can determine edge facts after an assignment. (§3.1, pp.6–7)
2. Rewrite each field update `x.f := v` as a call to an internal update method with the same footprint as the current method; the update is a removal of the old edge followed by an addition of the new one (`unlinkDAG`, `linkDAG`). (§3.2, p.8; App. A, p.30)
3. For an added edge, assert the path update formula; for removal, use the App. A formula (due to Dong and Su) accounting for alternative paths. (§3.2, pp.7–8; App. A, pp.30–32)
4. Restrict this direct-update technique to acyclic current footprints; arbitrary cycles may remain outside the footprint. (§3, p.6)
5. Supply quantifier triggers so the SMT solver instantiates the quantified axioms only where relevant; the paper says such triggers “are essential for performance.” (§5.1, p.25)

Verus form. Inference: wrap pointer-field mutation in a verified Rust method with a pre/post contract stating the edge and path delta. A helper `proof fn` can prove the add-edge concatenation rule; deletion requires a lemma that splits on alternative paths. The executable assignment remains ordinary Rust. Inference: Verus cannot treat an arbitrary recursive `spec fn path` as a solver axiom safely; the update lemma must be proved or explicitly trusted, and any external contract must be marked as an assumption.

where it fails or assumes. Removal is difficult precisely because deleting one edge does not imply deleting all paths that used it. The update formulas are defined for acyclic graphs, and the paper's `updateDAG` asserts acyclicity before the unlink and after the link to keep this sound. (App. A, p.32) The path axiomatization is partial, so the formulas are exact only under these restrictions and the supplied axioms.

## technique 3: relative-convex reachability framing across calls

what it is. Let caller footprint `g = f ⊎ h`, where h is the callee footprint and f the frame. h is relatively convex in g if no g-local path leaves h and later returns. Definition 1 states: “no paths within g leave h and then return.” (§3.3, p.9) Relative convexity limits a path to at most one entry and one exit through h, making first-order partition formulas possible.

how to apply it.

1. At the call site, split g into callee h and frame f and check `h ≺ g` before the call. (§3.3, pp.9–11)
2. Partition each caller path into five cases: both endpoints in h; frame-to-h; h-to-frame; frame-to-frame through h; or frame-to-frame entirely in f. (§3.3, p.10)
3. Use the corresponding formulas to translate `P(g,...)` into `P(h,...)` and `P(f,...)`; instantiate them in either direction. (§3.3, pp.10–11)
4. Apply the callee postcondition to update h-local reachability, while separation-logic framing preserves `P(f,x,y) iff P0(f,x,y)`. (§3.3, p.10)
5. Recheck convexity after the call, because a newly created edge can make h non-convex. (§3.3, p.11)
6. When frame-local reachability is hidden by a disjunction (cases (iv)–(v) of (9)), use the localization formula (15), selecting a frame edge (σ, τ) where σ is the last node that reaches h and τ is the first node that does not. (§3.4, pp.13–16)

The authors explain why the restriction is needed: “Without this assumption, the number of cut points of h could be arbitrary, and localization of reachability information would require either considering an unbounded set of cases or higher-order reasoning.” (§3.3, p.11)

Verus form. Inference: a Rust call wrapper can take ghost sets h and f, require disjoint union and a `relatively_convex` predicate, then invoke the callee contract and a framing lemma that reconstructs caller reachability. Encode the five cases as lemmas over ghost graph snapshots. A `proof fn` can establish post-call convexity or fail when the callee adds an escaping edge. Verus's borrow checker supplies noninterference for fields outside h only when the API's ownership types enforce it; the reachability partition remains a logical proof obligation.

where it fails or assumes. Non-convex callee footprints are outside the technique: the paper notes that “in full generality, a first-order reachability framing formula for our path predicate cannot exist.” (§3.3, p.9) The frame itself may be non-convex, so formula (15) is required. The paper says “Our technique is complete, provided that callee postconditions specify sufficient information about reachability within their footprint.” (§3.4, p.17)

## technique 4: cyclic 0–1-path graphs

what it is. The paper extends framing to potentially cyclic graphs with at most one non-trivial path modulo cycles (ZOPGs). A ring is the motivating structure. The extension keeps relative convexity of callee footprints (restriction (1)) and drops acyclicity (restriction (2)). Field updates use a refined relation DEP instead of P, and calls carry obligations that prevent four bad configurations that would create alternative paths. (§4, pp.17–24)

how to apply it.

1. Mark footprints that are ZOPGs with the annotation `g : Zopg`; such a method is locally checked to preserve the ZOPG property, and is translated to a method with `g : Graph` plus extra proof obligations. (§4.2, pp.20–21)
2. For field updates, use the DEP relation (edge-dependent paths): update it with formulas such as (16), convert between P and DEP with axioms such as (17) and (18), and translate `u.next := v` into `u.next := null; u.next := v`, emitting criterion (21) before the second update. (§4.1, pp.17–19; §4.2, p.21; App. B–C, pp.32–34)
3. At calls, check relative convexity and instantiate the partition formulas as in the acyclic case; the paper says “Restriction (1) alone enables our handling of method calls,” where (1) is relative convexity of footprints. (§4, p.17)
4. Conjoin the negations of formulas (22)–(25), which characterize the four bad configurations (α)–(δ) of Fig. 13, as a proof obligation of the client; the client's precondition must be strong enough to rule them out. The paper sketches a completeness argument for the four cases. (§4.2, pp.22–24)
5. Verify clients such as ring insertion (`testZopgObligations`, Fig. 11); in the Table 1 “Fail” variants of the ring-insert client, the technique identifies the bad configurations when the heap is under-constrained before the call. (§4.2, pp.20–23; §5.2, p.26)

Verus form. Inference: represent the ZOPG invariant as a ghost `spec fn` over a finite abstract edge set and prove update/call lemmas. A ring insertion API would require the no-alternative-path obligations and ensure the invariant after insertion. Cycles require a well-founded measure for recursive proof lemmas or finite graph bounds; the paper's first-order axioms do not directly become executable Rust code.

## evidence and limits

The authors hand-encoded each example in Viper and verified them with Viper's Boogie-based verifier, which uses Z3. (§5.1, pp.24–25) They report a laptop running macOS with a 2.8 GHz Intel Core i7 and Z3 version 4.8.5. (§5.1, p.25) Table 1 contains 17 rows: Merge (4 rows, 13.2–33.9 seconds), Left-Child-Right-Sibling (4 rows, 10.1–17.1 seconds), Harris List (14.5 seconds), Acyclic List Reverse and Append (7.9 and 6.9 seconds), and six Ring-Insert rows (10.1–87.2 seconds). (Table 1, p.25) The denominator is the 17 rows shown; the paper does not report a success percentage. Four rows are deliberate failures: two Merge rows (“Bug in code” and “Bug in spec.”; the bugs are a negated branch condition and a missing last precondition of merge) and the two ring-insert client “Fail” rows. (Table 1 and §5.2, p.25)

The paper reports that “reachability properties are amenable to SMT-based verification for a broad class of heap-manipulating programs,” that triggers must be annotated in specifications (§5.3, p.26), and that for the technique's quantified formulas triggers “are essential for performance” (§5.1, p.25). It does not establish scalability to arbitrary graph sizes, automatic trigger synthesis, or soundness of the underlying Viper/Z3 implementation.

## techniques for the catalog

- footprint-local reachability — parameterize edge and path predicates by a method footprint so contracts depend only on owned heap fragments
- snapshot and path axioms — abstract heap edges with snapshots and control recursive reachability axioms to remain SMT-friendly
- first-order update formulas — expose exact path changes for edge insertion/removal through internal verified update methods
- relative-convex call framing — partition caller paths across callee footprint and frame when no path leaves and re-enters the callee
- frame reachability localization — recover frame-local paths with the last-reaches and first-does-not-reach split
- z-opg preservation — prevent four alternative-path configurations to verify cyclic graphs with at most one path modulo cycles
