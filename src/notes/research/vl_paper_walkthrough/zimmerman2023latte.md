# Latte: Lightweight Aliasing Tracking for Java
(authored by agents unless marked 🧑)
Tag: `zimmerman2023latte`, [paper](https://doi.org/10.48550/arxiv.2309.05637)

## model and guarantee

Latte is a type system for a Featherweight-Java-like sequential language with mutable objects. Its goal is to track heap uniqueness and stack aliases with annotations on fields and method signatures, while inferring local-variable information. The abstract says, “Our approach only requires annotations for parameters and ﬁelds, while annotations for local variables are inferred.” (Abstract, p. 1). The system uses `unique`, `shared`, and `owned`; it infers `alias(p)` and bottom `⊥` for locals during checking (Sections 3.1 and 3.3, pp. 2–4).

The heap invariant is: “no two references in the heap point to the same unique object.” (Introduction, p. 1). A unique value may be stored in at most one reachable heap location, although local variables may temporarily alias it when that alias is precisely tracked (Section 3.1, p. 2). `owned` denotes a borrowed value that is unique in the current context and cannot be newly placed in the heap; `shared` permits untracked outside aliases; `⊥` marks an inaccessible value (Section 3.3, p. 4).

Inference: the transferable technique is an explicit path-and-alias environment that is updated after every mutation. Inference: this is useful for Verus APIs that need to expose ownership or separation facts to later functional proofs, but Latte's type rules are not a Verus implementation.

## technique 1: minimal annotations with inferred locals

When to use it: use this design when annotating every temporary would make an ownership discipline hard to adopt, while field and method boundaries can carry stable contracts. Fields must be `unique` or `shared`; method parameters and returns use `unique`, `owned`, or `shared`; local declarations receive no developer annotation (Section 3.3, p. 4).

Steps from the paper:

1. Mark a field `unique` if its object must occur at most once in reachable heap storage, or `shared` if outside aliases may exist (Section 3.1, p. 2; Section 3.3, p. 4).
2. Mark a method parameter `owned` when the callee borrows a unique value without consuming it; use `unique` when the argument is consumed, and `shared` when aliases are allowed (Section 3.1, p. 2; Section 3.3, p. 4).
3. Type-check statements while maintaining environment Δ, which maps each local path to a class and inferred annotation (Figure 3, p. 4).
4. Reject a use when inferred aliases or reachability would violate uniqueness or accessibility (Sections 3.4.1–3.4.4, pp. 5–6).

Verus form: Inference: use Rust ownership and borrowing for the executable alias discipline, then state heap separation or object uniqueness in `requires` and `ensures`; use ghost state or `spec fn` predicates for reachability. Inference: Verus does not infer `alias(p)` annotations automatically, so a developer must expose enough paths or write proof lemmas to recover equivalent facts.

Evidence: the paper's stack example requires field and parameter annotations but no local annotations in the Java source (Figure 1, p. 3). It reports no user study, benchmark denominator, or implementation measurement. The conclusion explicitly calls for “Further evaluation of its usability, along with the development of such veriﬁcation tools, is required to validate this goal.” (Conclusion, p. 8). Inference: annotation reduction is demonstrated by examples, not empirically established.

## technique 2: alias graph and reachable aliasing

What it is: represent aliasing as an equivalence relation over syntactic paths. An environment entry `x : alias(p) C` records that `x` and path `p` hold the same object; the alias graph connects equivalent paths. Each connected component may contain at most one path with a `unique`, `owned`, or `shared` annotation (Section 3.4.1, p. 5).

Steps from the paper:

1. After an assignment `x = p`, add an alias-graph edge from `x` to `p` and record `alias(p)` in Δ (Sections 3.2 and 3.4.7, pp. 3 and 7).
2. Define reachable aliasing (Δ\vdash p_1\cong p_2) when values reachable through the two paths may alias (Section 3.4.3, p. 6).
3. For a unique field assignment, isolate the field, type the right-hand side as `unique(x.f)`, and record the resulting path relation (Section 3.4.7, p. 7).
4. Reject borrowing a unique field through a `shared` object when an existing alias cannot be ruled out (Section 3.4.4, p. 6).

Verus form: Inference: model the alias graph as a ghost map from object identifiers to paths and prove a `forall` uniqueness predicate over reachable heap locations. Inference: Verus's `&mut` borrow rules already prevent many executable aliases, but raw-pointer or interior-mutability APIs need explicit ghost permissions and invariants; Latte's path graph can guide those invariants.

Evidence: the `push` example tracks `r : alias(this.root)`, isolates `this.root`, and then treats `r` as unique before constructing a node (Section 3.2, pp. 3–4; Figure 1, p. 3). The paper presents typing rules and examples, but no soundness theorem for a full Java implementation and no measured false-positive rate. Inference: correctness depends on the modeled subset and on preserving the correspondence between paths and runtime objects.

## technique 3: isolation as a non-destructive read

What it is: implement the effect of a destructive read by first creating an alias and then overwriting the source path. The isolation judgment (Δ∗p\dashvΔ') removes or updates all aliases to `p` after assignment. If `p` previously held a unique value, an alias can become unique after `p` is overwritten (Section 3.4.5, pp. 6–7).

Steps from the paper's stack `push`:

1. Read `this.root` into `r`, recording `r : alias(this.root)` (Figure 1, lines 19–20, p. 3).
2. Assign `this.root = null`; isolation removes the old heap edge and upgrades `r` to `unique` (Section 3.2, p. 3).
3. Construct `new Node(value, r)`, consuming the unique arguments; the constructor body is encapsulated, so the caller marks consumed values inaccessible (Section 3.2, pp. 3–4).
4. Assign the new node to `this.root`, recording the local alias to the unique field (Figure 1, lines 21–22, p. 3).

The paper emphasizes that “we do not need to change the language semantics or introduce new language constructs.” (Section 3.2, p. 3). Verus form: Inference: write the operation as ordinary Rust assignment through an exclusive borrow, and prove an `ensures` clause that ownership of the old value moves to the returned or newly stored location. Inference: a ghost permission token can stand for the alias edge; the proof must show that the token is removed from the old path before the new path is stored.

Evidence: the stack `push` and `pop` examples type-check under the stated rules; no runtime change or runtime overhead is measured. Inference: the technique is strongest for sequential code and explicit ownership transfer, while aliasing through opaque foreign code remains a trusted boundary.

## technique 4: framing and branch unification

Method calls invalidate aliases to every field in the call's frame, marking them `shared` when precise tracking is unnecessary or `⊥` when they must remain inaccessible (Section 3.4.6, p. 7). Conditional branches are checked separately and merged with a conservative `unify(Δ;Δ1;Δ2)` operation (Sections 3.4.7–3.4.8, pp. 7–8). If both branches give a variable the same annotation, that annotation survives; otherwise it may become `⊥` (Section 3.4.8, p. 8).

In the FIFO `dequeue`, an `owned` borrow of `this.root` is recursively passed through the list. Isolation of `n.next` makes `n.next.value` unique after the pointer is cleared, so the value can be returned without an explicit destructive read (Section 3.5, pp. 8–9; Figure 6, p. 8). Inference: this is a practical pattern for Verus recursive data structures: frame the mutated fields in method contracts, preserve an invariant over the list, and prove branch postconditions strong enough to unify at the return.

## what is proved, trusted, and missing

The paper defines a formal grammar and typing judgments, and argues that the alias graph and uniqueness checks support mutation and separation reasoning (Sections 3.3–3.4, pp. 4–8). It does not report an implementation, corpus size, runtime, soundness theorem against Java semantics, or user-study denominator. It limits concurrency claims to unique or borrowed values consumed after a fork and states that the system targets sequential programs (Section 3.4.2, p. 5).

Inference: the threat to agent-written verified Rust is moderate. Verus already enforces executable ownership, but generated proofs can still use raw pointers, ghost aliases, or weak framing specifications. Latte's explicit alias/reachability graph suggests checks for those gaps; it does not replace Verus's functional contracts or establish that a policy specification is correct. Inference: VL should not redo Latte's Java typing system; it should reuse its isolation, framing, and conservative branch-join ideas when designing proof-oriented mutable APIs.

## techniques for the catalog

- boundary annotations: annotate fields and method parameters while inferring local alias states
- alias graph: maintain path equivalence and reachable-alias relations to enforce one unique heap location
- isolation: overwrite a path after recording its alias so the former value can become uniquely owned
- framing: invalidate aliases to fields that a method may mutate
- branch unification: conservatively join per-branch alias environments, using bottom when no safe common fact exists
- borrowed traversal: use `owned` recursive parameters and isolation to mutate linked structures without explicit destructive-read syntax
Checked 2026-10-15 against paper zimmerman2023latte: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
