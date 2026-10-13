# An approach for modularly verifying the core of Rust’s atomic reference counting algorithm against the (Y)C20 memory consistency model
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every lemma, theorem, appendix and section reference, the Example 1 specification, the step rules, the two quotations of Core ARC invariants and the YC20 definitions; changed the stuck-versus-stutter step, a reworded quotation, a cut quotation, the claim of a proved and hand-checked result (the paper says argue and preliminary), the alternation of XMM steps, the Lemma 3 argument, the urgent-next-steps list, the omitted syntactic assumption, a wrong Verus term, and three unmarked inferences.

## paper and prior notes

Jacobs and Fasse propose a modular proof method for relaxed atomic operations and fences, using Rust’s core `Arc` algorithm as the case study. The shortlist already records the paper, but a title search found no earlier walkthrough in the research notes. The paper’s central claim is semantic: a sequentially interleaved operational semantics, equipped with tied resources and atomic specifications, is sound for C20 under assumptions and for the strengthened YC20 model without those assumptions. The paper does not report a benchmark suite, implementation, proof-assistant mechanization, or measured time. Its evidence is a chain of definitions, lemmas, and theorems, plus a paper proof of Core ARC.

## technique 1: turn a relaxed-memory program into an interleaving proof target

what it is and when to use it

The method instruments a program with `begin_atomic(ℓ, Σ)` and `end_atomic(ℓ)` around a location whose accesses are to be treated atomically. The atomic specification Σ records an initial value, global and local cancellative commutative monoids of tied resources, an initial global resource, a partial `pre` map on operations, and a partial `post` map on operation/result pairs. Use this when an existing separation logic expects an interleaving semantics but the target program uses C20-style relaxed accesses.

how to do it

1. Define Σ for each atomic location. An operation consumes the tied precondition in `pre`; its result is chosen nondeterministically among values in `post`.
2. Represent atomic locations in a separate atomic heap containing Σ and the current total tied resource; the ordinary heap stores only nonatomic cells.
3. If the tied precondition is not available, the command gets stuck (the paper then counts the program as unsafe). If it is available, the operation proceeds only when the total tied resource is consistent with the operation/result under an atomic-location trace; until then it stutters. The trace contains a consistent C20 execution graph, the location’s events, and its initialization write.
4. Prove the interleaving semantics sound with respect to every C20 execution by induction over happens-before prefixes: each prefix is data-race-free and corresponds to a reachable configuration in every happens-before-consistent event order.

The paper states the key design precisely: “We define an interleaving operational semantics for an instrumented version of our programming language.” It also cautions that “for atomic cells the semantics does not track the value; it only tracks, in the atomic heap A, each atomic location’s atomic specification and total tied resource.”

Verus form (inference)

Verus has no built-in C20 execution-graph semantics or Iris resource algebra. A practical translation would keep the Rust code’s atomics and add ghost state: a ghost map from locations to a specification and resource; predicates for the tied pre/post conditions; and proof functions establishing that each atomic operation’s result is allowed. `requires`, `ensures`, `invariant`, and `broadcast` proof functions can encode the local proof obligations. The operational-semantic soundness theorem itself remains an external metatheorem unless C20 is formalized in Verus. Rust control flow and atomic instructions remain; the auxiliary begin/end commands are ghost instrumentation rather than runtime calls.

evidence, limits, and trust

Theorem 1 claims: “If a program is safe under the operational semantics, then it has no undefined behavior under C20 semantics.” The evidence is a prefix induction in Appendix A.2, not an executable checker or numeric experiment. The C20 construction assumes every atomic access is enabled under Σ; the authors explicitly leave one ARC condition open: no counter access may read a nonpositive value. The semantics can spuriously stutter, so it addresses safety, not termination. Its fence treatment is location-specific; the authors say lifting that incompleteness is future work.

## technique 2: encode Core ARC with tied resources and an Iris invariant

what it is and when to use it

The resource protocol makes the reference count and ownership of the payload agree without assuming sequential consistency. Use it to verify relaxed increments, release decrements, and an acquire fence in `clone`, `drop`, and `get`.

how to do it

1. Set the counter’s initial value and global resource to one. Permit relaxed FAA(+1), release FAA(−1), and acquire fences. Permit FAA results only when the read value is positive.
2. Make a relaxed increment consume one global unit and produce two; make a release decrement consume one and produce none, except that a decrement reading one produces a thread-local unit; make the acquire fence consume one local unit and produce it again (its result value is always 0).
3. Prove Lemma 1: a decrement reading one leaves no local tied resources. Prove Lemma 2: an acquire fence implies the global resource is zero. These are resource-accounting consequences of the modification order and happens-before constraints.
4. Place the full atomic-location permission and authoritative ghost resources in an Iris cancellable invariant. Give each `arc(ℓ,v)` permission a fractional payload permission, a fraction of a cancellation token, and ghost fragments recording its tied resource.
5. In `drop`, the thread that reads one uses the half token to cancel the invariant, consumes the acquire-fence obligation, ends the atomic location, and frees the counter and payload.

The paper gives the specification’s enabled operations verbatim: “The enabled operations are the relaxed increments, the release decrements, and the acquire fences.” Its invariant construction says: “There is an element q ∈ F for each outstanding arc permission, denoting the fraction of the ownership of ℓ + 1 owned by that arc permission; the remainder is inside the invariant.”

Verus form (inference)

Model the counter protocol with a ghost integer or multiset of token records and a ghost permission predicate for each `Arc` handle. `clone` transfers or creates a token while preserving a positive-count invariant; `drop` atomically decrements and, on an observed one, proves exclusive ownership before calling `close` and deallocation. Verus can express arithmetic and ownership predicates, but fractional permissions and Iris cancellation tokens need an explicit ghost algebra or an abstraction lemma. Rust’s `Arc` payload and drop control flow carry over; the C20 proof that an acquire fence observes the needed release history does not carry over automatically.

evidence, limits, and trust

The reported result is a paper proof of Core ARC, not a measured evaluation: there are no test counts, timings, or mechanized-checker denominators. Inference: the invariant relies on Iris’s soundness and on the C20/YC20 semantic definitions as trusted foundations. Of the earlier work, the paper says Relaxed RustBelt “even verified full ARC, except that they had to strengthen two relaxed accesses to acquire accesses.” This paper verifies only Core ARC, in both §3.2 (C20) and §5.2 (YC20), and lists whether the approach supports other algorithms, “such as full ARC”, as a next step.

## technique 3: use grounding to remove the C20 assumptions under YC20

what it is and when to use it

YC20 is the authors’ high-level variant of XC20. XMM construction proceeds by a number of `Execute` and `Re-Execute` steps; re-execution rebuilds an execution from a committed, read-from-complete set so that out-of-thin-air behavior is excluded while load buffering remains possible. Use YC20 when the proof must allow program-order/read-from cycles and cannot soundly assume that every access is already enabled.

how to do it

1. Define grounding-consistency for an operation/result: all other events in the location trace are enabled, release events and happens-before predecessors are included in the explanatory set, and every happens-before-consistent ordering can consume and produce the tied resources.
2. Require each operation’s tied precondition to be sufficient: if grounding-consistency holds, then the operation/result pair must be in `post`.
3. Define a grounding order. Show by induction that every Execute or Re-Execute step from a grounded graph produces a weakly grounded graph, where each event is grounded or reads from an earlier event in the order.
4. Show that every weakly grounded prefix is race-free, grounded, and reachable in the operational semantics. The nested induction handles the order of events and the grounding-order prefixes.
5. Reuse the same ARC atomic specification and Iris invariant. Prove Lemma 3 (precondition sufficiency). Its proof assumes the FAA reads 0 and derives a contradiction: an increment that mo-succeeds the FAA would be ordered where the global tied resource has already reached 0, so its tied precondition cannot be consumed.

The paper’s model distinction is explicit: “An Execute step simply adds a porf-maximal event” and “A Re-Execute step selects an rf-complete subset of the events of the original execution.” Its main result is: “If a program is safe under the operational semantics, then it has no undefined behavior under YC20 semantics.”

Verus form (inference)

A Verus library could represent a grounding order as a sequence with uniqueness and happens-before consistency, and represent the read-from closure as ghost sets. Proof lemmas would establish that each atomic result is in a specification’s postcondition and that every prefix is race-free. This is a substantial semantic development: ordinary Verus atomics do not expose C20 graph construction, committed sets, or re-execution. The Rust implementation and resource invariant can be reused once that library exists.

evidence, limits, and trust

The evidence is Theorem 2 plus Appendix A.3’s Lemmas 7–15 and Theorem 3. No empirical denominator exists: no number of executions is enumerated, and the proof is intended to cover all executions generated by YMM. The authors have not mechanized the soundness proof, proved that XC20’s compiler results transfer to YC20, or shown support for algorithms beyond Core ARC. The conclusion calls the result “a preliminary result” and names as “the most urgent next step” to further elaborate the soundness proof, ideally mechanize it, mechanize the Core ARC proof, and verify that the XC20 results hold for YC20; supporting other algorithms such as full ARC is listed among “Others”.

## what the paper proves, what remains trusted, and product threat

proved or measured

The paper argues (its abstract says “We first argue its soundness”) that safety of the instrumented operational semantics implies absence of undefined behavior under C20 (with assumptions) and YC20 (with sufficient tied preconditions), with proofs in the appendix. It gives a paper proof of Core ARC with Iris and proves the resource lemmas needed to close the payload exactly when the counter reaches one. It reports no measurements.

trusted or assumed

The C20 and YC20 definitions, Iris soundness, the hypothetical atomic language, and the correctness of the ARC code model are trusted. Under C20, the authors assume all accesses are enabled, take property (1), that all accesses of the counter are increments or release decrements, to be checked by a syntactic approach (“Actually, (1) can be verified using a syntactic approach.”), and leave the nonpositive-read condition (2) open; under YC20, they replace those assumptions with grounding and precondition sufficiency. Termination and liveness are outside the semantics.

what VL should not redo

Inference: VL should not repeat the basic idea that relaxed ARC needs a resource protocol, nor the specific two lemmas about the final decrement and acquire fence without checking whether its Verus memory model already supplies them. The reusable gap is a Verus-level library for relaxed-memory execution graphs, grounding orders, and resource specifications; the paper explicitly leaves mechanization and broader algorithms open.

threat to agent-written verified Rust (inference)

The threat is high for concurrent reference-counting components: an agent can generate Rust that passes ordinary functional proofs while violating weak-memory ordering or final-drop exclusivity. It is lower for single-threaded code because the paper’s distinctive obligations concern relaxed atomics, fences, and cycles. A Verus agent that lacks a YC20-like semantic checker can therefore produce proofs that are locally valid but do not establish the paper’s global memory-model claim.

## techniques for the catalog

- tied-resource operational semantics — instrument atomic locations with specifications and prove interleaving safety implies C20 safety
- Iris ARC resource invariant — track count, payload fractions, cancellation, and release/acquire handoff with ghost resources
- YC20 grounding — use Execute/Re-Execute grounding orders and sufficient preconditions to verify relaxed accesses without porf-cycle assumptions
- prefix soundness induction — establish race freedom and reachable configurations for every happens-before-consistent execution prefix
