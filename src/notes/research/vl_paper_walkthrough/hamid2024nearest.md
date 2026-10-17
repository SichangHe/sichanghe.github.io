# (Nearest) Neighbors You Can Rely On: Formally Verified k-d Tree Construction and Search in Coq
(authored by agents unless marked 🧑)
Tag: `hamid2024nearest`, [paper](https://arxiv.org/abs/2311.10965)

## what the paper establishes

The paper is a Coq case study that verifies quickselect, k-d tree construction, and K-nearest-neighbor (KNN) search over a k-d tree with a bounded priority queue. The abstract says: “Our experience demonstrates an intuitive method for specifying properties of these algorithms using the notion of list permutations.” (Abstract, p. 1) The implementation uses natural-number coordinates (`datapt := list nat`), the Manhattan distance `sum_dist`, a functional priority queue adapted from Verified Functional Algorithms (VFA), and fuel arguments for termination (§2.2, §3, pp. 3–4). The paper says its Coq development also verifies single nearest-neighbor search, but the paper itself presents only the general KNN variant (§2.1, p. 2).

## technique: fuel-bounded quickselect with a permutation contract

What it is and when to use it. Quickselect finds the kth smallest element of a list and partitions the remainder, in expected linear time (§3.1, p. 3). A fuel argument makes a non-structurally recursive function acceptable to Coq. The paper states: “A common device to define functions with complex recursions is to introduce an extra nat parameter (called the “fuel”) as the primary recursive argument.” (Section 2.2, p. 3)

How to do it.

1. Define `qsp steps k l le` by recursion on `steps`; return `None` when `steps` is zero or the list is empty (Figure 2, §3.1, p. 3).
2. Pick the head as pivot and partition the tail into strictly smaller, equal, and strictly larger lists using `le` (Figure 2 line 8, §3.1, p. 3).
3. If `k < |sm|`, recurse into the smaller list; if `|sm| + |eq| < k`, recurse into the larger list with `k - (|sm| + |eq| + 1)` (Figure 2 lines 9–17, §3.1, p. 3).
4. Otherwise the pivot is the kth smallest; split the equal list so that the returned left list is `sm` plus the first `k - |sm|` equal elements, and the right list is the remaining equal elements plus `lg` (Figure 2 lines 19–20, §3.1, p. 3).
5. Define `quick_select k l le` with `length l` as initial fuel, and `median_partition` as `quick_select (div2 (length l))` (Figure 2, §3.1, p. 3).
6. Prove the fuel suffices (`qsp_works`, Lemma 4.8), then prove existence, permutation, rank, and ordering properties (`quick_select_exists_correct`, Theorem 4.9, §4.3, pp. 6–7).

The paper's example: `(quick_select 3 [15; 90; 32; 7; 86] Nat.leb)` produces `Some ([32; 7; 15], 86, [90])` (§3.1, p. 3). Theorem 4.9 requires `k < |l|`; properties (4) and (5) need `le` to be transitive and total (`le_props`). It concludes that a result `Some (l1, v, l2)` exists, `l` is a permutation of `l1 ++ [v] ++ l2`, `|l1| = k`, every element of `l1` is `≤?` `v`, and `v` is `≤?` every element of `l2` (§4.3, p. 7).

Verus form. Inference: Define a total executable `fn quick_select` with a decreasing `fuel: nat` parameter and a `requires` clause that `k < l.len()` and `fuel >= l.len()`. Use `ensures` to state that the output partition preserves a permutation-style sequence relation and rank/order facts. Verus does not use Coq's `Permutation` inductive relation automatically; encode the needed relation as a ghost predicate or sequence-count property and prove it with `assert` and `proof fn`. If a loop replaces recursive fuel, use a loop `invariant` for fuel bounds and partition facts.

Evidence and limits. The paper proves Lemma 4.8 and Theorem 4.9; it reports no runtime benchmarks. `qsp` returns an option because “Coq functions must be total”, and Lemma 4.8 shows `None` cannot occur when `k < |l|` and `|l| ≤ steps` (§3.1, p. 3; §4.3, p. 6). The paper says the pivot is always the list head “For simplicity” (§3.1, p. 3). Inference: Expected linear time is stated, not proved; with a head pivot, worst-case time is quadratic.

## technique: recursively build a balanced k-d tree and preserve contents

What it is and when to use it. Build a binary tree by selecting the median on the current dimension and cycling dimensions down the recursion. The paper says: “The build_kdtree_ function in Figure 3 proceeds by partitioning the data list around the median coordinate value of the current depth in the tree.” (Section 3.2, p. 4)

How to do it.

1. Represent a point as `list nat` and a tree as either `mt_tree` or `node axis point left right` (§3.2, p. 4).
2. At dimension index `depth_mod`, call `median_partition data (ith_leb depth_mod)` and make the pivot the node point (Figure 3, §3.2, p. 4).
3. Recurse on the smaller and larger partitions with `next_depth k depth_mod`, which equals `(d + 1) mod k` at depth `d` (§3.2, p. 4).
4. Pass `length data` as fuel and start at dimension 0 in `build_kdtree` (Figure 3, p. 4).
5. Prove the tree is bounded by an initially unbounded box (`build_kdtree_bounded`, Lemma 4.5) and that its contents are a permutation of the input (`build_kdtree_contents_perm_gen`, Lemma 4.7) (§4.2, p. 6).

Verus form. Inference: Use a Rust enum for the tree and a recursive `fn build_kdtree` with `requires k > 0` and each point length `k`; add `decreases fuel`. State an `ensures` relation connecting the tree's ghost contents to the input sequence and an axis-cycling invariant. If the implementation mutates vectors for performance, preserve the same abstract sequence relation with ghost snapshots; the Coq list permutation proof does not carry over as Rust code.

Evidence and limits. Lemma 4.7 assumes `k > 0`, `dmod < k`, and `f ≥ |D|`; it proves that the tree contents are some list `l` with `l ⊲⊳ D` (permutation) (§4.2, p. 6). The paper calls this proof “fairly straightforward through unfolding the different execution paths in build_kdtree_” (§4.2, p. 6). The paper uses natural coordinates and Manhattan distance, saying “though any well-behaved metric would work” (§3.3, p. 4). Inference: The theorems as stated do not cover floating-point coordinates or other metrics without new lemmas.

## technique: bounding boxes and closest enclosed point

What it is and when to use it. Associate each subtree with a bounding box and compute the point in that box closest to the query. This gives a distance lower bound that justifies pruning. The paper defines the closest enclosed point coordinatewise: cep(q, [s, t]) = p where p_i = median(q_i, s_i, t_i) (§3.3, p. 4).

How to do it.

1. Represent a box as two lists of `option nat`, where `Some n` is a concrete bound and `None` is ±∞ (§3.3, pp. 4–5).
2. Split the current box at the node axis and the node's coordinate on that axis (`bb_split`) before the recursive calls (Figure 5, §3.4, p. 5).
3. Define `cep` with each coordinate as the median of the query coordinate and the two bounds (§3.3, p. 4). Inference: this is clamping the query coordinate into the interval.
4. Prove `cep_min_dist` (Lemma 4.6): every point in the box is at least as far from the query as `cep` (§4.2, p. 6).
5. Define `kdtree_bounded`, which checks that each subtree lies in the box split by its parent's axis and value, and prove it for the constructed tree and the unbounded root box (`build_kdtree_bounded`, Lemma 4.5, §4.2, p. 6).

Verus form. Inference: Define a ghost `struct BBox` and a spec function for clamping coordinates; use `requires` that bounds are ordered and dimensions match, and `ensures` that every point in the box has distance at least the computed clamp distance. For loops over coordinates, carry an `invariant` for processed indices and accumulated Manhattan distance.

Evidence and limits. The lemma is for the paper's `sum_dist` Manhattan distance over natural coordinates. Inference: A different metric, signed coordinates, overflow behavior, or approximate arithmetic requires separate lemmas and may invalidate pruning.

## technique: bounded priority queue and KNN search

What it is and when to use it. Keep at most `K` candidates in a max priority queue, and skip a subtree when the queue is full and every point in the subtree's box is farther than the current worst candidate. The paper says: “The generalized KNN search algorithm uses a priority queue to collect candidates for the K-nearest neighbors.” (Section 3.4, p. 4)

How to do it.

1. Use an abstract priority-queue signature with `empty`, `insert`, `delete_max`, `peek_max`, and `size`; define `insert_bounded`, which deletes the maximum after insertion when the size exceeds `K` (Figure 4, §3.4, p. 4).
2. Start `knn_search` with an empty queue keyed by `sum_dist query` and an unbounded box (Figure 5, §3.4, p. 5).
3. At each node, peek at the queue. If the queue holds `K` elements and the top element is strictly closer than the box's closest enclosed point, return the queue unchanged (Figure 5 lines 16–21, p. 5).
4. Otherwise insert the node point with `insert_bounded`, split the box, and recurse into both subtrees, the more promising one first (Figure 5, §3.4, p. 5).
5. Convert the final queue to a list (`pq_to_list`) and prove Theorem 4.1: the result length is `min K (length data)`, result plus some leftover list is a permutation of the data, and every result point is no farther than every leftover point (`all_in_leb`) (§4.1, p. 5).

Verus form. Inference: Verify a bounded queue with a representation invariant relating its concrete vector or heap to a ghost sequence and key order. State `ensures` for size `≤ K`; in `knn`, use a recursive `decreases` measure and invariants for queue contents, tree bounds, and the partition relation. The Coq module's abstraction relation `Abs` is analogous to a Verus ghost abstraction function; Verus does not provide this queue ADT automatically.

Evidence and limits. The size property is proved separately (Lemma 4.2, `knn_search_build_size_gen`, p. 5). The other two properties follow from `knn_full_relate` (Lemma 4.3) and the generalized `knn_full_relate_gen` (Lemma 4.4), proved by induction on the tree (§4.1, p. 6). The paper says the proof of Lemma 4.4 “was extremely long and tedious to develop”, giving two reasons: “the lack of automation for reasoning about Permutations” and that “large portions of the proof tactics were duplicated to cover the different execution paths in the function” (§4.1, p. 6). The paper reports no runtime benchmarks or proof-checking times. Hypotheses about the queue's representation invariant (`priq`) and abstraction relation (`Abs`) are elided in the paper's statements but “appear in the full Coq statements in the appendix” (footnote 6, p. 5).

## techniques for the catalog

- fuel-bounded quickselect — use a decreasing natural fuel argument and prove a permutation plus rank/order contract
- permutation-specified tree construction — recursively median-partition data while proving tree contents are a permutation of the input
- bounding-box pruning — prove a clamped closest point gives a distance lower bound for each subtree
- bounded-priority-queue KNN — keep at most K candidates and prune only when the queue is full and the box lower bound exceeds the current worst candidate
