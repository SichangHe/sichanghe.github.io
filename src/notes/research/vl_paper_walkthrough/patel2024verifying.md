# Verifying Lock-free Search Structure Templates
(authored by agents unless marked 🧑)
Tag: `patel2024verifying`, [paper](http://arxiv.org/abs/2405.13271v1)

## what the paper proves

The paper verifies parameterized lock-free linked-list and skiplist templates in Iris, a concurrent separation logic. Its target is linearizability: each concurrent operation has an abstract atomic effect consistent with a sequential set. The template factors out node representation, physical-unlinking style, and the order of maintenance at upper levels. A single proof therefore covers existing implementations and new combinations. The abstract states: “We present and verify template algorithms for lock-free concurrent search structures that cover a broad range of existing implementations based on lists and skiplists.” (Abstract, p. 1.) The authors claim the first formal verification of fully functional lock-free unbounded-height skiplists: “The result is, to our knowledge, the first formal verification of fully-functional lock-free algorithms for skiplists of unbounded height.” (Introduction, p. 2.)

A skiplist has sorted lists at levels 0 through L−1, sentinel head and tail nodes, and one mark bit per level. Logical deletion marks a node before physical unlinking. The base list determines membership; higher levels accelerate traversal. The core API is search, insert, and delete. The template's `traverse` returns predecessor/successor arrays and a membership bit under three obligations: the base successor was unmarked at some point, and every observed pair satisfies `key(ps[i]) < k ≤ key(cs[i])`. Insert first CASes a new node into level 0 and then performs upper-level maintenance; delete marks upper levels, marks level 0 last, then traverses to unlink. A failed CAS restarts insert, while a failed base mark makes delete return false.

## technique: parameterized template verification

Use this when many implementations differ in representation or cleanup but share the same abstract operations. The paper's method is:

1. State node fields (key, height, next pointers, marks), sentinel conditions, and the abstract set relation (Section 2, pp. 2–4).
2. Specify logically atomic helpers `markNode`, `changeNext`, `createNode`, and `traverse`; instantiate those helpers for one concrete representation (Section 2, pp. 3–5).
3. Keep core search/insert/delete independent of representation and maintenance policy. The paper explicitly abstracts “(i) node-level details; (ii) the style of unlinking marked nodes and (iii) the order of maintenance operations on higher levels.” (Section 2, p. 4.)
4. Prove the template's shared invariant and each operation once, then discharge each implementation-specific helper proof (Sections 5–6, pp. 9–16).

Inference: In Verus, executable Rust would represent nodes and atomic mark/next updates, while `spec fn` predicates would describe sorted reachability and abstract membership; `requires`/`ensures` contracts would replace the Iris Hoare specifications. Loop invariants and `assert`/`assert forall` facts would establish the traversal obligations. The paper is in Iris, so this translation is an engineering inference, not a result reported by the authors. Verus cannot directly reuse Iris resources or its proof scripts; the ownership and atomic-memory API would need a Verus encoding.

## technique: edgeset reasoning for traversal

Use this when a traversal may encounter logically deleted nodes and must reason about a changing graph. The Edgeset Framework defines the set of outgoing edges that are relevant to a node and uses intersections along the path to define its inset/outset. Inference: this gives a representation-independent way to express that the search key lies in the current node's interval. The paper introduces it as follows: “The Edgeset Framework provides a common terminology to capture how search operations navigate in a variety of search structures.” (Section 3.1, p. 7.)

The proof steps are: define edge sets from next pointers and marks; define a node's outset and inset from reachable edges; prove sortedness and reachability invariants; show each traversal step preserves the key interval; conclude that the returned predecessor/successor pair brackets k. For eager traversal, the authors prove an “inset in hindsight invariant”: “we argue first that eager_i does maintain the invariant that the search key was in the inset of the current node c between the start of the traversal and the point at which the eager_i accesses c.” (Section 3.4, p. 12.) Inference: a Verus version would make edgesets and inset predicates ghost state, maintain them in a state-machine or atomic-view invariant, and prove each CAS preserves sortedness. The paper's set-theoretic graph arguments do not carry over as executable Rust without such ghost modeling.

## technique: hindsight reasoning for future-dependent linearization

Use this when an operation's linearization point depends on a later observation or on helping by another thread. Direct prophecy variables can encode the future but often create large, operation-specific proofs. Hindsight instead records a history of snapshots and proves that a past state had the needed property. The paper says: “Hindsight reasoning has shown its usefulness in dealing with future-dependent and external linearization points, a challenge that commonly arises in lock-free data structures.” (Introduction, p. 2.)

The Iris construction has three parts (Section 4.2, pp. 11–13): a history predicate `Hist(H,T)` recording snapshots and timestamps; a transition invariant constraining how snapshots evolve (for example, marks only change false to true); and a data-structure-specific invariant `Invtpl` plus a helping registry. A hindsight specification gives a thread a snapshot satisfying its precondition and lets it prove that a linearization event occurred in the interval, even if another thread performed the physical update. To apply it, define per-snapshot structural invariants, define transition invariants, connect the current physical heap to the newest snapshot, and prove the operation against the generic hindsight specification (Sections 4–5).

Inference: Verus has no direct Iris `Hist` resource. An implementation would need a ghost history (for example, a sequence in a state machine), monotonic mark facts, and contracts that expose the snapshot at the chosen proof point. The executable algorithm remains unchanged; only ghost state and proof lemmas are added. This is an inference from the paper's abstraction, not a claim that the paper used Verus.

## evidence, limits, and trust

The paper reports complete mechanized Iris proofs for the skiplist template, eager and lazy traversals, and list variants. Table 1 (p. 19) reports proof-checking time and line counts by module; Table 2 (p. 20) compares the prior multicopy proof with the hindsight proof. The authors report that the new multicopy proof has 1,310 lines versus 2,779 lines originally, “a reduction of 53%.” (Section 7, pp. 19–20.) The denominator is proof lines for those two multicopy template developments; it is not runtime or defect rate. The abstract's claim of broad coverage is supported by instantiations of Herlihy–Shavit, Michael-set, and Harris-list styles (Introduction, p. 2), but no empirical claim says every implementation is covered.

Inference: The proof trusts Iris, its axioms and atomicity model, the concrete helper specifications, the language/compiler model, and the correctness of the abstraction linking nodes to sets. It assumes a totally ordered key type, valid sentinel nodes, memory reclamation compatible with the model, and logically atomic helper operations. The authors note a scalability boundary: “the implementation does not scale to larger bounds” for bounded approximations in related work (Related Work, p. 22); their own unbounded-height result is a logical template, not evidence that generated proofs or executables scale without limit. Inference: for agent-written verified Rust, the paper is a high threat for lock-free data structures because it shows subtle linearization and helping arguments require substantial ghost invariants; an LLM that emits ordinary locks or a sequential invariant will miss these obligations. The reusable template and hindsight module are useful design targets, but porting them to Verus remains a research implementation.

## what Inference: VL should reuse

Inference: VL should reuse the separation of a generic operation template from representation-specific atomic helpers, the explicit traversal contract, monotonic mark transition, and a history-based proof interface for external linearization points. Inference: Inference: VL should not redo a generic claim that all skiplist variants are equivalent; it should test which Verus atomic/state-machine encodings support the paper's three maintenance dimensions and measure proof maintenance under concrete Rust representations. The 53% line reduction is evidence for this paper's multicopy comparison only.

## techniques for the catalog

- parameterized lock-free templates — prove search, insert, and delete once while instantiating node representation and maintenance helpers
- edgeset traversal invariants — use inset/outset graph predicates to preserve search-key bracketing through concurrent unlinking
- hindsight linearization — record snapshot history and transition invariants to justify future-dependent linearization points

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
