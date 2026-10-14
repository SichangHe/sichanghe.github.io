# Predictable Verification using Intrinsic Definitions
(authored by agents unless marked 🧑)
Tag: `murali2024predictable`, [paper](https://doi.org/10.1145/3656450)
## scope and result

Murali, Rivera, and Madhusudan propose intrinsic definitions for heap data structures and a Fix-What-You-Break (FWYB) verification method. Instead of recursive predicates and inductive proofs, a structure is represented by ghost monadic maps, local conditions, and a correlation formula for entry points. Mutating code updates those maps and tracks locations whose local conditions may be temporarily false. The final proof checks a quantifier-free, ghost-augmented program.

The abstract states: “We propose a novel mechanism of defining data structures using intrinsic definitions that avoids recursion and instead utilizes monadic maps satisfying local conditions.” (abstract, p. 1). The authors prove FWYB soundness (Theorem 3.8, pp. 13–14), implement it in Boogie, and evaluate 42 methods across 10 data-structure definitions. Their reported verification times are all under two minutes and all but four under ten seconds, on an Intel Core i5-4460 at 3.20 GHz (section 5.3, p. 20). These are benchmark results for Boogie encodings, not Rust or Verus results.

## technique 1: define data structures with ghost monadic maps and local conditions

what it is

An intrinsic definition extends a heap with unary ghost maps from locations to values. A quantifier-free local formula constrains each location and its neighboring fields; a correlation formula identifies valid entry points. A heap is in the data structure when some interpretation of the ghost maps satisfies these formulas.

The paper’s formal definition requires “(1) G is a finite set of monadic map names and function signatures disjoint from F,” “(2) L is a first-order logic,” “(3) A local condition formula LC,” and “(4) A correlation formula φ(y)” (Definition 2.4, section 2.2, p. 6). It emphasizes: “The existence of maps that satisfy the local logical conditions ensures that the structure is a valid data structure.” (section 2.2, p. 6)

when to use it

Use this for mutable linked structures, trees, and overlays when recursive reachability predicates cause induction or solver unpredictability. Choose maps that summarize the data needed by operations, such as rank, inverse pointers, length, keys, or heaplets.

how to do it

1. Model the concrete heap class and fields. For a linked list, the paper uses `next` and `key` fields (Example 2.1, p. 5).
2. Add unary ghost maps. A sorted-list definition uses `sortedll` and `rank`; the rank decreases along `next` and keys are ordered locally (Example 2.6, p. 6).
3. Write a quantifier-free local condition over one location and its neighbors. For a tree, local conditions require child-parent agreement, decreasing ranks, and distinct children (section 2, p. 3).
4. Write a correlation formula for entry points, such as `sortedll(y)` for a sorted-list head (Example 2.6, p. 6).
5. Put the existential maps and local/correlation formulas into the method precondition and postcondition. The insertion example requires a sorted-list map before and after insertion (Example 3.1, p. 8).
6. Ensure the chosen background logic is decidable. The authors use quantifier-free theories of integers, sets, arrays, maps, and parameterized updates (sections 2.2 and 3.7, pp. 6, 14).

Verus form

Inference: In Verus, represent the local condition and correlation as `spec fn` predicates over a mathematical model of the heap, and state preservation with `requires` and `ensures`. Ghost state can carry maps or sets used only by proof code; proof functions and `assert` statements establish local facts after mutations. Verus does not automatically infer existential ghost maps or local impact conditions, so a Rust implementation would need explicit ghost data and lemmas. The paper’s Boogie map theory and its exact quantifier-free restrictions do not automatically carry over to Verus’s SMT encoding.

evidence and limits

The authors define sorted lists, circular lists, trees, binary-search trees, AVL and red-black trees, and an overlaid linked-list/BST scheduler queue (sections 2 and 4, pp. 6, 14–18). They state that “These annotated programs do not use quantifiers or recursive definitions” (section 2, p. 4). This is a design property of their Boogie encodings, not a claim that every data structure can be represented this way. Structures with unbounded indegree are a stated limitation because inverse pointers and finite impact sets may not exist (section 4.4, p. 18).

## technique 2: fix what mutations break with ghost maps and a broken set

what it is

FWYB augments a program with ghost updates to monadic maps and a set `Br` of potentially broken locations. A mutation adds an impact set to `Br`; repairs update maps and assert local conditions before removing locations. The main method starts and ends with an empty broken set.

The paper describes the discipline directly: “The verification engineer must repair the monadic maps on these broken locations and ensure (through an assertion) that the local condition holds on them before removing them from the broken set Br.” (section 1, p. 3). Its soundness target is to prove an augmented program with `Br = ∅` at entry and exit, then project away ghost code (sections 3.2–3.6, pp. 8–14).

when to use it

Use FWYB when a mutation temporarily invalidates a local invariant but only a bounded neighborhood can be affected immediately. It supports modular calls and loops without requiring the global local condition to hold at every intermediate state.

how to do it

1. Stage 1: supply pre-state ghost maps and explicitly compute post-state maps with ghost code. This removes existential quantification over maps (section 3.3, pp. 9–10).
2. Stage 2: add a ghost broken set. Require the local condition outside `Br`, and start with `Br = ∅` (section 3.4, pp. 10–11).
3. After a field mutation, add its impact set to `Br`; after allocation, add the new object (section 3.5, pp. 11–13).
4. Repair a broken object’s ghost maps, assert its local condition, then remove it from `Br` (section 3.5, pp. 11–13).
5. Use the fact that an object outside `Br` satisfies the local condition when needed, after establishing that it is outside the set (section 3.5, p. 12).
6. Restrict loops, branches, and calls to the well-behaved rules in Figure 2. Conditions may not manipulate `Br` implicitly, and loops must preserve the discipline (section 3.5, p. 13).
7. Prove the augmented quantifier-free triple. Theorem 3.8 then gives validity of the original intrinsic triple after ghost-code projection (section 3.6, pp. 13–14).

The sorted-list insertion example makes the sequence concrete. For `x.next := z`, the code adds impacted locations, repairs `z` and `x`, asserts their local conditions, and removes them so that the broken set returns to empty (Example 3.6, pp. 11–12).

Verus form

Inference: A Verus encoding can keep a ghost set of locations and ghost map values in proof state, then use `requires` and `ensures` to state that the set is empty at method boundaries. After each executable mutation, a proof function can add the bounded impact locations, update ghost state, and use `assert` before removing a location. Loop `invariant` clauses can state that all unbroken locations satisfy the local predicate. Verus does not have the paper’s `Br` rules or automatic projection theorem; the proof author must establish that erased ghost code cannot affect executable behavior.

evidence and limits

The authors prove Propositions 3.4, 3.5, and 3.7 for the three reductions and Theorem 3.8 for FWYB soundness (sections 3.3–3.6, pp. 9–14). This is a logical soundness result conditional on a sound underlying verifier and well-behaved annotations. The method may require a ripple of repairs: the paper notes that fixing one broken location can break neighbors, potentially requiring an unbounded eventual sequence, although each immediate impact set is finite (footnote 5, p. 16).

## technique 3: derive finite impact sets from local neighborhoods

what it is

An impact set contains every location whose local condition may become false after a field mutation. For sorted lists, local conditions mention only one-step `next` and `prev` neighbors, so a mutation can affect a bounded set. The authors provide a table and prove each impact set correct in Boogie.

The paper says: “mutations cannot immediately affect objects that are far away on the heap.” (section 4.1, p. 16). For `x.next := z`, the impact set is `{x, old(next(x))}` (Table 1, p. 15); terms equal to `nil` are omitted.

when to use it

Use finite impact sets when each local condition reads a bounded neighborhood and inverse pointers limit incoming edges. This turns a global preservation argument into local proof obligations.

how to do it

1. List every heap field read by the local condition for a location.
2. For each mutation, identify locations whose local-condition inputs can change, including old pointer targets.
3. Express those locations as a finite set of terms. Table 1 gives `{x, prev(x)}` for `x.key`, `{x, old(prev(x))}` for `x.prev`, and `{x, old(next(x))}` for `x.next` (section 4.1, p. 15).
4. Prove the impact-set rule: any unlisted location satisfying the local condition before the mutation still satisfies it afterward (section 4.1, p. 16).
5. Encode the update as a mutation macro that adds the set to `Br`. The paper’s `Mut(x,f,v,Br)` macro performs the field update and broken-set union (section 4.1, p. 16).
6. Use analogous macros for allocation, assertion-and-removal, and inference outside `Br` (section 4.1, pp. 16–17).

Verus form

Inference: In Verus, write a lemma or proof function for each mutation kind showing that locations outside the finite impact set preserve the local predicate. Use `old(...)` only if the chosen Verus version supports it; otherwise store the pre-mutation pointer in ghost state. Put the impact-set preservation fact in `ensures` and maintain it with `assert`. The paper’s automatic Boogie check for impact-set correctness has no direct Verus equivalent, so the lemmas become trusted proof obligations checked by Verus.

evidence and limits

The paper reports that all impact sets for its benchmark structures were encoded and checked. It does not report separate impact-set failure counts. The approach depends on bounded indegree; unbounded indegree is explicitly outside the modeled class (section 4.4, p. 18). A mutation can still trigger a long repair ripple even when its immediate impact set is finite (footnote 5, p. 16).

## technique 4: eliminate quantifiers and control solver theories

what it is

After ghost augmentation, the verifier models allocation with an `Alloc` set and heap changes across calls with parameterized map updates. Pure local-condition functions are inlined. Specifications and invariants remain quantifier-free, and generated SMT files are checked for forbidden quantified constructs.

The paper says: “Consequently, the entire verification condition is captured in quantifier-free logics involving maps, parametric map updates, and sets over combined theories.” (section 1, p. 4). In implementation, the authors “cross-check that the generated SMT query is quantifier-free and decidable by checking the absence of statements that introduce quantified reasoning” (section 5.1, p. 19).

when to use it

Use this when predictable solver behavior is more valuable than concise recursive specifications. It requires choosing data representations and contracts that fit decidable map, set, and arithmetic theories.

how to do it

1. Keep contracts and loop invariants quantifier-free (section 5.1, p. 19).
2. Represent heap fields and ghost maps as maps from a location sort to values (section 5.1, p. 19).
3. Represent allocated objects with an `Alloc` set and update it on allocation (sections 3.7 and 5.1, pp. 14, 19).
4. Describe heap effects across calls with parameterized map updates and a user-supplied frame description of unchanged locations (section 3.7, p. 14).
5. Inline pure local-condition functions so they do not introduce quantified formulas (section 5.1, p. 19).
6. Inspect generated SMT files for `exists`, `forall`, and lambda constructs before accepting the query as decidable (section 5.1, p. 19).

Verus form

Inference: Verus users can approximate this discipline by keeping specifications quantifier-light, using `Map` or `Set` values in ghost state where supported, and isolating quantified facts in lemmas. Function contracts should state only the needed frame and preservation facts. Verus’s solver may still instantiate quantifiers in libraries or specifications, so an SMT-file audit is not a substitute for Verus proof review. Do not use a `modifies` clause as a Verus construct; the paper’s frame annotations are Boogie/Dafny concepts.

evidence and limits

The authors compare Boogie’s decidable encoding with a Dafny implementation of the same benchmarks. Both can prove the methods, but the paper reports that the scatter plot “strongly suggests” better performance for Boogie’s decidable conditions (section 5.3, pp. 20–21). The paper does not give a complete table of Dafny times in the extracted text, so the comparison is qualitative there. Decidability assumes the underlying quantifier-free theories are decidable; the authors explicitly note that integer multiplication in local conditions could make verification undecidable (footnote 1, p. 4).

## evidence from the benchmark suite

Table 2 contains 42 methods across 10 data-structure definitions. It reports local-condition size, executable plus specification plus annotation lines, and verification time for each method (Table 2, pp. 20–21). Representative times include 1.9–2.1 seconds for list search and reverse, 3.8 seconds for BST root removal, 5.0 seconds for AVL balance, 74.1 seconds for red-black insertion, and 15.0 seconds for removal in the overlaid scheduler queue (Table 2, p. 20). The authors state that all methods verify in under two minutes and all but four under ten seconds (section 5.3, p. 20). Approximately 60% of ghost updates are definitional updates, such as setting a list length to one plus its successor’s length (section 5.3, p. 20).

## what is proved, trusted, and threatening to VL

The soundness theorem proves preservation of intrinsic specifications for the projected user program, assuming the augmented program is valid, the program obeys the well-behaved rules, and the underlying verification mechanism is sound (Theorem 3.8, pp. 13–14). Boogie, its heap encoding, SMT solvers, the correctness of impact sets, the ghost-update annotations, and the chosen local conditions remain trusted or separately assumed. The benchmark proves the selected methods and structures, not arbitrary pointer code.

Inference: In Verus, the product threat is specification and ghost-model mismatch. A wrong local predicate, incomplete impact set, or incorrect ghost repair can yield a proof of the wrong data-structure property. The paper’s bounded-indegree limitation matters for intrusive Rust structures with many incoming references. FWYB is promising for agent-written Rust because it makes mutation obligations explicit, but the annotation burden and possible repair ripple can overwhelm an automated agent without specialized templates and tests.

Inference: VL should not redo the paper’s intrinsic definitions, broken-set discipline, or quantifier-free Boogie encoding as generic ideas. A useful Verus experiment would measure whether ghost maps and bounded impact lemmas reduce proof repair after realistic Rust refactors, and whether accepted local conditions still imply the intended ownership and API behavior.

## techniques for the catalog

- intrinsic data-structure definitions: characterize heaps with ghost monadic maps, local neighbor conditions, and entry-point correlations
- fix-what-you-break: augment mutations with ghost-map repairs and a broken-location set that is empty at method boundaries
- finite impact sets: derive bounded mutation neighborhoods and prove that all locations outside them preserve local conditions
- decidable VC engineering: encode heaps, allocation, calls, and ghost updates with quantifier-free maps, sets, and parameterized updates
Checked 2026-10-13: audit record murali2024predictable; paper-study comparison complete; gate executed; experiments not rerun
