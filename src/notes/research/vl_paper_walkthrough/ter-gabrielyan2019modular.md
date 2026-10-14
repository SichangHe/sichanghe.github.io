# Modular Verification of Heap Reachability Properties in Separation Logic
(authored by agents unless marked 🧑)
Tag: `ter-gabrielyan2019modular`, [paper](http://arxiv.org/abs/1908.05799v1)
## problem and contribution

This paper makes graph reachability local enough for modular separation-logic verification. Its abstract identifies the obstacles: “any heap modification may affect an unbounded number of reference chains, which complicates modular verification, in particular, framing,” and “general graph reachability is not supported by SMT solvers.” (§abstract, p.1) The solution adds a footprint parameter to reachability, uses relative convexity to frame calls, and supplies first-order encodings for updates and path decomposition.

The supported classes are acyclic graphs with bounded outdegree and potentially cyclic 0–1-path graphs, where there is at most one non-trivial path modulo cycles between each pair. The paper's goal is procedure-modular reasoning: a caller uses a callee's contract without inspecting its implementation, other threads, or heap outside the callee footprint. (§1, pp.1–2)

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
2. Replace each `x.f := v` by an internal unlink/add operation with the same footprint. (§3.2, p.8)
3. For an added edge, assert the path update formula; for removal, use the appendix formula accounting for alternative paths. (§3.2, pp.7–8)
4. Restrict this direct-update technique to acyclic current footprints; arbitrary cycles may remain outside the footprint. (§3, p.6)
5. Supply quantifier triggers so the SMT solver instantiates update axioms at relevant nodes. (§5.1, p.25)

Verus form. Inference: wrap pointer-field mutation in a verified Rust method with a pre/post contract stating the edge and path delta. A helper `proof fn` can prove the add-edge concatenation rule; deletion requires a lemma that splits on alternative paths. The executable assignment remains ordinary Rust. Inference: Verus cannot treat an arbitrary recursive `spec fn path` as a solver axiom safely; the update lemma must be proved or explicitly trusted, and any external contract must be marked as an assumption.

where it fails or assumes. Removal is difficult precisely because deleting one edge does not imply deleting all paths that used it. The technique's formulas are exact only under its graph restrictions and supplied axioms.

## technique 3: relative-convex reachability framing across calls

what it is. Let caller footprint `g = f ⊎ h`, where h is the callee footprint and f the frame. h is relatively convex in g if no g-local path leaves h and later returns. Definition 1 states: “no paths within g leave h and then return.” (§3.3, p.9) Relative convexity limits a path to at most one entry and one exit through h, making first-order partition formulas possible.

how to apply it.

1. At the call site, split g into callee h and frame f and check `h ≺ g` before the call. (§3.3, pp.9–11)
2. Partition each caller path into five cases: both endpoints in h; frame-to-h; h-to-frame; frame-to-frame through h; or frame-to-frame entirely in f. (§3.3, p.10)
3. Use the corresponding formulas to translate `P(g,...)` into `P(h,...)` and `P(f,...)`; instantiate them in either direction. (§3.3, pp.10–11)
4. Apply the callee postcondition to update h-local reachability, while separation-logic framing preserves `P(f,x,y) iff P0(f,x,y)`. (§3.3, p.10)
5. Recheck convexity after the call, because a newly created edge can make h non-convex. (§3.3, p.11)
6. When frame-local reachability is hidden by a disjunction, use the localization formula (15), selecting the last frame node that reaches h and the first that does not. (§3.4, pp.14–16)

The authors explain why the restriction is needed: “Without this assumption, the number of cut points of h could be arbitrary, and localization of reachability information would require either considering an unbounded set of cases or higher-order reasoning.” (§3.3, p.11)

Verus form. Inference: a Rust call wrapper can take ghost sets h and f, require disjoint union and a `relatively_convex` predicate, then invoke the callee contract and a framing lemma that reconstructs caller reachability. Encode the five cases as lemmas over ghost graph snapshots. A `proof fn` can establish post-call convexity or fail when the callee adds an escaping edge. Verus's borrow checker supplies noninterference for fields outside h only when the API's ownership types enforce it; the reachability partition remains a logical proof obligation.

where it fails or assumes. Non-convex callee footprints are outside the first-order framing guarantee. The frame itself may be non-convex, so formula (15) is required. The method's specifications must be strong enough to rule out bad path configurations; otherwise verification correctly fails.

## technique 4: cyclic 0–1-path graphs

what it is. The paper extends framing to potentially cyclic graphs with at most one non-trivial path modulo cycles (ZOPGs). A ring is the motivating structure. The extension retains relative convexity but replaces acyclic update reasoning with obligations that prevent four classes of alternative-path configurations. (§4, pp.20–24)

how to apply it.

1. State the ZOPG invariant for each footprint before and after a call. (§4, pp.20–21)
2. Preserve local ZOPG structure for field updates using the paper's criterion (21). (§4, pp.21–22)
3. At calls, check relative convexity and instantiate partition formulas as in the acyclic case. (§4, p.20)
4. Add preconditions that exclude the four bad configurations (α)–(δ), covering alternative paths that enter/exit h in different patterns. (§4, pp.22–24)
5. Verify clients such as ring insertion; reject under-constrained calls whose preconditions permit a ZOPG violation. (§4.2, pp.22–24)

Verus form. Inference: represent the ZOPG invariant as a ghost `spec fn` over a finite abstract edge set and prove update/call lemmas. A ring insertion API would require the no-alternative-path obligations and ensure the invariant after insertion. Cycles require a well-founded measure for recursive proof lemmas or finite graph bounds; the paper's first-order axioms do not directly become executable Rust code.

## evidence and limits

The authors hand-encoded each example in Viper, using Boogie and Z3. They report laptop hardware with a 2.8 GHz Intel Core i7 and Z3 4.8.5. (Section 5.1, p.25) Table 1 contains 16 listed variants, including Merge (7.9–33.9 seconds), Left-Child-Right-Sibling (10.1–17.1 seconds), Harris List (14.5 seconds), acyclic list examples (6.9–7.9 seconds), and six Ring-Insert variants (10.1–87.2 seconds). (Table 1, pp.25–26) The denominator is the 16 rows shown; the paper does not report a success percentage because the table is a selected set of verified and intentionally failing examples. Two Merge rows are deliberate failures: one has a code bug and one a specification bug. (§5.2, p.25)

The paper reports that reachability is SMT-amenable for a broad class and that triggers are essential for performance. (§5.3, p.26) It does not establish scalability to arbitrary graph sizes, automatic trigger synthesis, or soundness of the underlying Viper/Z3 implementation. Inference: VL must trust Verus's solver translation, graph abstraction lemmas, ownership contracts, and any external-body models. The product threat is high for graph algorithms whose reachability contracts are incomplete: a passing proof can establish only the stated local relation, while a missing convexity or ZOPG precondition can make the specification unsound or unverifiable.

## what VL should reuse and should not redo

Inference: reuse footprint-indexed reachability, relative-convex call framing, path partitioning, update formulas, and explicit bad-configuration checks. These are concrete reusable proof patterns for Verus graph APIs.

Inference: VL should not redo a generic claim that reachability can be framed modularly. A new contribution needs Rust-specific ownership integration, automated predicate/trigger generation, or measurements beyond this paper's hand-authored Viper encodings.

## techniques for the catalog

- footprint-local reachability — parameterize edge and path predicates by a method footprint so contracts depend only on owned heap fragments
- snapshot and path axioms — abstract heap edges with snapshots and control recursive reachability axioms to remain SMT-friendly
- first-order update formulas — expose exact path changes for edge insertion/removal through internal verified update methods
- relative-convex call framing — partition caller paths across callee footprint and frame when no path leaves and re-enters the callee
- frame reachability localization — recover frame-local paths with the last-reaches and first-does-not-reach split
- z-opg preservation — prevent four alternative-path configurations to verify cyclic graphs with at most one path modulo cycles
Checked 2026-10-13: audit record ter-gabrielyan2019modular; paper-study comparison complete; gate executed; experiments not rerun
