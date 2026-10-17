# A verified implementation of the Misra and Gries edge coloring algorithm
(authored by agents unless marked 🧑)
Tag: `bhoja2025misra`, [paper](https://arxiv.org/abs/2512.13999)

This paper implements the Misra–Gries constructive proof of Vizing's theorem in Lean 4. For a simple graph of maximum degree Δ, it constructs a proper edge coloring with at most Δ+1 colors (the Lean coloring type is parametrized by `maxDegree G + 1`, §4, p. 19) and claims the implementation is polynomial time (§3, p. 7; §5, p. 21). The paper does not formalize a runtime bound in Lean. Inference: the key engineering lesson is to represent executable data directly, then attach invariants and prove every mutation preserves them. The abstract states that the author used "Lean theorem prover to produce a verified implementation of the Misra and Gries edge-coloring algorithm" while "The focus is on building libraries for relevant mathematical objects and rigorously maintaining required invariants." (Abstract, p. 1)

## technique: choose efficient executable representations and attach invariants

What it is. The formalization uses Lean core lists and arrays instead of abstract Mathlib definitions because the latter were not optimized for computational efficiency (§3, p. 7). Vertices are `Fin n`; edges are ordered vertex pairs; a graph is an adjacency-list structure with size, symmetry, and no-self-loop fields. A neighbor set carries length and `Nodup` constraints. An `EdgeColoring c G` stores an n-by-n option-valued adjacency matrix with fields requiring that colored entries are graph edges, incident edges have distinct non-`none` colors, and the matrix is symmetric (§§3.1–3.2, pp. 7–9). The author says edges are ordered pairs although the graph is undirected, because Mathlib's unordered pair type `Sym2` would have complicated theorem statements; a few symmetry lemmas were used to rewrite statements instead (§3.1, p. 8).

Inference: When to use it: use this pattern when a verified algorithm needs both predictable runtime and strong local facts about mutable-looking data. Decide the executable representation first, then make invalid states unconstructable or inaccessible through structure fields.

Steps from the paper:

1. Represent vertices as bounded natural numbers (`Fin n`) and edges as pairs (§3.1, p. 7).
2. Represent neighbors as a duplicate-free list with a strict size bound (`sizeAx : val.length < n`, `nodupAx : val.Nodup`); represent a graph as an array of neighbor sets plus size, symmetry and no-self-loop axioms (§3.1, pp. 7–8).
3. Represent a partial color as `Option (Fin c)`, and colorings as symmetric matrices; include graph-membership and properness fields (§3.2.1, p. 8).
4. Define lemmas about edge symmetry (§3.1, p. 8) and the other edge-coloring lemmas the paper says were implemented "for ease of proving later theorems" (§3.2.1, p. 9); the paper omits them.

Verus form (all Inference). Use Rust structs with ghost views and `#[verifier::type_invariant]` where a persistent object invariant is appropriate; define mathematical views as `spec fn`. Use `requires` on constructors and mutators for bounds and graph membership, and `ensures` to re-establish the invariant. Rust `Vec`/arrays can be executable storage while a ghost `Seq` or map states symmetry and properness; Verus's ownership handles aliasing, but the graph-specific invariants remain proof obligations.

Evidence and limits. The author says: "This allowed for a polynomial-time implementation of the algorithm, but required significant additional work" (§3, p. 7). The author also says the 2D array representation gives constant-time access but "can cause difficulty when writing statements and proofs", and that prioritizing "computational efficiency foremost and then ease of using automation before ease of writing statements and proofs" was the best strategy (§3.2.1, pp. 8–9). In the conclusion the author suspects that separate computation and proof representations "would be simpler" for proofs but would need "a significant amount of additional translation back and forth" (§5, p. 22). The paper gives no asymptotic constant or benchmark runtime.

## technique: specify and prove local mutation contracts

What it is. The `recolor` operation changes both matrix cells for an undirected edge. Before defining it, the paper specifies `edgeColorValid`: a color is valid for an edge if it is `none` or free on both endpoints. It implements a cell update for a 2D matrix and proves that setting a cell preserves array size and every other value, establishes the new value, leaves every other row unchanged, commutes for two distinct cells, and gives lemmas on the count of a value before and after. Recoloring then sets both cells of the edge; its specifications are that size and symmetry are preserved, the edge gets the new color while other edges keep theirs, and the counts of a color in the two endpoints' rows change by one, or not at all, as described on p. 10. To build an `EdgeColoring`, the paper proves recoloring maintains size, graph membership, properness and symmetry (§3.2.2, pp. 9–10).

Steps from the paper:

1. Define validity as the selected color being `none` or free at both endpoints (§3.2.2, p. 9).
2. Implement a cell update and prove frame properties: dimensions and every unrelated value and row stay unchanged (§3.2.2, p. 9).
3. Prove count lemmas for the updated value before and after the operation (§3.2.2, pp. 9–10).
4. Define edge recoloring as setting both symmetric cells, and prove its graph, symmetry, and properness obligations (§3.2.2, p. 10).

The paper summarizes the postcondition: "e is indeed colored with a, and the colors of the other edges remain invariant." (§3.2.2, p. 10)

Verus form (all Inference). Implement an executable mutator with `requires edge_color_valid(...)` and `ensures` stating the changed edge, unchanged non-target edges, and preservation of the coloring predicate. Use `old(...)` in postconditions for pre-state values, `assert` for count arithmetic, and a `proof fn` for symmetry/frame lemmas. Do not write `invariant(...)` as a call; a loop invariant belongs on a loop, while this operation has no loop.

Evidence and limits. The paper says the proofs of the structure properties were "long and technical since they required casework over indices and many invocations of symmetry lemmas; they are again omitted here" (§3.2.2, p. 10). It omits the full proof code, so readers cannot reproduce every lemma from the article alone.

## technique: encode fans and prove recursive fan operations preserve them

What it is. A fan on `(x,y)` is a nonempty array of distinct vertices, all in the neighborhood of x, whose first element is y and whose adjacent entries satisfy the fan color property, stated with Lean's `Chain'` so no indices are needed (§3.3.1, p. 10). To create a maximal fan, `add` searches the list of neighbors not yet in the fan, using `find?`, for a vertex whose edge color is free on the last fan vertex, appends it, and erases it from the candidate list; otherwise it returns the fan unchanged. The recursion is `termination_by nbors.length`; `List.attach` supplies a membership proof, needed because `List.erase` of an absent value leaves the list unchanged (§3.3.2, pp. 10–11).

To rotate a fan, recolor `(x, last F)` with the given color, recursively rotate the shortened fan `⟨f1,...,f(k-1)⟩` with the previous color of `{x, fk}`, and first prove with `mkFan` that the shortened object is still a fan under the new coloring, since a `Fan` type depends on the coloring (§3.3.3, pp. 11–12). The paper gives the implementation shape; the signature is quoted here and the body is elided:

```lean
def rotateFan (C : EdgeColoring c G) (F : Fan C x y) (a : Color c)
  (hvalid : edgeColorValid C (x, last F) a)
  : EdgeColoring c G := ...
```

Steps from the paper:

1. Call `add` on the singleton fan `⟨y⟩` and the neighbor set `nbhd x − {y}`, wrapped as `maximalFan` (§3.3.2, p. 11).
2. On each recursive step, search for a candidate whose edge color is free on the fan's last vertex; append it and erase it (§3.3.2, pp. 10–11).
3. Prove fan properties and maximality by functional induction (`fun_induction`) over `add` (§3.3.2, p. 11).
4. For rotation, recolor the last fan edge, build the shortened fan with `mkFan`, and recurse with the previous color (§3.3.3, pp. 11–12).
5. Prove the recursive call's validity precondition (`hvalid'`); the paper elides the `termination_by` and `decreasing_by` proofs and does not state the measure (§3.3.3, p. 12).

Verus form (all Inference). Represent a fan as a ghost sequence plus a predicate `fan_ok`; implement search and append with an executable `Vec`. Use `requires fan_ok` and `ensures fan_ok` on helper functions, with a `decreases` clause for candidate-list length or remaining fan size. The recursive proof can be a `proof fn` that reasons about the post-state sequence; Verus's executable recursion must satisfy its own termination obligations, and dependent Lean `Fan` types do not carry over directly.

Evidence and limits. The paper reports no fan-specific timing or proof-line count. It says that because `add` is not structurally recursive, induction over the function definition "allows for simpler proofs", and that for maximality "Functional induction allows for a straightforward proof." (§3.3.2, p. 11). Inference: the technique is reusable for any verified search that incrementally builds a witness under a relational invariant.

## technique: construct and invert maximal alternating paths

What it is. An alternating path is a nonempty, duplicate-free vertex list starting at x whose adjacent edges alternate between two actual (non-`none`) distinct colors a and b, with b free on x. Because structure types make Lean's automation less effective, the author declares data and invariants as variables, proves lemmas, and later states "nice versions" (§3.4.2, p. 13). `extendPath` repeatedly finds a next vertex connected by one of the two colors via `nextVertex`, appends it, and the author reports proving that nonemptiness, first-vertex, no-duplicate, and alternation invariants persist (proofs omitted). The termination measure is `(n + 1) - P.length` (§3.4.2, pp. 14–15).

To invert a maximal path, the implementation first uncolors every path edge and then recolors it with colors swapped. Its `recolor` recurses from the head: it sets `(p1,p2)` to `b`, then recurses on `p2 :: ps` with the colors flipped (§3.4.6, p. 17). This is deliberately less direct than flipping each edge in place, which "will not work here, since we defined setEdgeColor to only allow edges to be recolored with valid colors"; the author also rejects recursively flipping the tail and then recoloring the head, because the proof "will require us to reason over multiple nested function calls". The paper states: "This intermediate step makes it easier to prove that the invariants are maintained." (§3.4.6, p. 17)

Steps from the paper:

1. Define alternation recursively (`alternates`, `next`) and prove lemmas connecting list-index and inductive views (§3.4.1, pp. 12–13).
2. Define `nextVertex` and prove that a candidate cannot already be in the path (§3.4.2, p. 14); extend a singleton path with `extendPath`, maintaining path invariants (§3.4.2, pp. 14–15).
3. Prove maximality and define a `Path` structure carrying path data and invariants (§3.4.3, p. 15).
4. Define adjacency and path edges, and prove that a maximal path contains every incident edge colored a or b of each of its vertices (§§3.4.4–3.4.5, p. 16).
5. Uncolor all path edges and prove that both colors become free on every path vertex (§3.4.6, p. 17).
6. Recolor recursively with the colors swapped; maintain the asymmetric hypotheses that the last-used color is free on the tail and the next color is free on every vertex of the list (§3.4.6, p. 17).
7. Prove `isInverted`: path edges swap colors, non-path edges are unchanged, and if a was free on a path vertex before inversion then b is free after (§3.4.6, p. 18).

Verus form (all Inference). Use a ghost `Seq<Vertex>` and `spec fn alternates`, with `requires` for nonempty, distinct vertices and valid colors. Prove `uncolor` and `recolor` as separate contracts; use `old(...)` to express unchanged non-path edges and swapped path colors. A loop over path edges needs an `invariant` stating processed-prefix correctness and untouched-suffix state; the paper's recursive list proof becomes a loop invariant or recursive proof in Rust.

Evidence and limits. The paper says the statement that candidate next vertices are not already in the path "is never justified in the informal proof, but is complex and tedious (almost 75 lines long!) to formalize" and gives a three-case sketch (§3.4.2, p. 14). It omits the proofs of the `extendPath` invariants (§3.4.2, p. 15) and says many inversion lemmas "are variations of each other, for convenience in writing later proofs" (§3.4.6, p. 18). Inference: these obligations are a material implementation cost and should not be counted as automatically solved by the high-level algorithm.

## technique: prove the complete algorithm by a decreasing uncolored-edge measure

What it is. `extendColoring` takes an edge set `E`, a proper partial coloring `C`, and a hypothesis that every edge in E is uncolored. It removes one edge `(x,y)`, builds a maximal fan, chooses a free color `a` on the fan's last vertex and a free color `b` on x, then either rotates the fan when `a = b`, or constructs a maximal alternating path, inverts it, finds a subfan with `findSubfan`, rotates it, and recurses. The recursion measure is `E.val.length`; the main `mkEdgeColoring` calls it on the full graph's edge set and an empty coloring (§4, pp. 18–20). The subfan existence lemma is proved with a list of supporting lemmas, but its statement and proof are omitted from the paper, which says the proof "required extensive casework and arithmetic" (§4.1, p. 20).

Steps from the paper:

1. Select an uncolored edge and remove it from the remaining edge set (§4, p. 19).
2. Build a maximal fan at its first endpoint and choose free colors at the fan's last vertex and at x (§4, p. 19).
3. If the colors agree, rotate the fan and recurse (§4, p. 19).
4. Otherwise, construct a maximal alternating path, invert it, find a subfan whose final vertex has the needed free color (§4.1, p. 20), rotate that subfan, and recurse (§4, p. 19).
5. Prove every remaining edge stays uncolored; this is what gives termination (§4, pp. 18–19).
6. Properness holds by construction because `mkEdgeColoring` returns an `EdgeColoring`; completeness is proved with `extendColoring_proper`, and the final theorem states that every graph edge in `toEdgeSet G` has a non-`none` color (§4.2, p. 21).

Verus form (all Inference). Represent the remaining-edge set as a ghost `Set` or executable collection with a `View`; put `requires` that every remaining edge is uncolored and `ensures` that the returned coloring is proper and colors the removed edge. Add a loop or recursive `invariant` preserving properness, graph membership, and "every edge in E is uncolored in C" with a `decreases` measure equal to remaining-edge count. Use `proof fn`s for the fan/path branches and call them from the executable algorithm; the final `ensures` should state completeness for every graph edge.

Evidence and limits. The paper says properness "is already done" because the coloring type enforces it, then proves that `extendColoring` colors every edge (`extendColoring_proper`) and that the final theorem "follows almost immediately from the previous lemma" (§4.2, p. 21). It claims a polynomial-time implementation but gives no benchmark denominator, runtime, graph-size range, or proof-checking time. Inference: Lean, Mathlib/Lean core, automation (`omega`, `grind`), and the formal graph model remain trusted or assumed sound; the paper does not discuss this, apart from criticizing the earlier Rodin work for relying on the assumed soundness of Rodin (§1, p. 2). Inference: threat to agent-written verified Rust is high for graph algorithms with mutable relational invariants, because the paper shows the amount of proof structure needed even for a well-specified algorithm; it does not show autonomous proof synthesis, and says an interactive prover "was essential" because many proofs "would be difficult for fully automated tools to synthesize" (§5, p. 21).

## techniques for the catalog

- invariant-bearing data representation — choose executable lists/arrays and attach graph, bounds, symmetry, and properness invariants
- local mutation contracts — specify frame, count, validity, and preservation properties for each recoloring operation
- maximal fan construction — grow a witness by a decreasing candidate measure and prove fan properties by functional induction
- alternating-path inversion — uncolor then recolor to make color swaps easy to prove while preserving path invariants
- measure-based algorithm proof — recurse over the remaining uncolored-edge count and prove properness plus completeness by induction
