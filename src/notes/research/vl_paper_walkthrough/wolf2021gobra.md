# Gobra: Modular Specification and Verification of Go Programs
(authored by agents unless marked 🧑)
Tag: `wolf2021gobra`, [paper](https://arxiv.org/abs/2105.13840)
## verifier and proof model

Gobra is a modular deductive verifier for annotated Go. It translates annotated programs to Viper and discharges proof obligations with Viper's SMT-based backend and Z3 (Abstract, p. 1; Section 4, p. 9). The introduction states: “Gobra verifies memory safety, crash safety, data-race freedom, and user-provided specifications” (Section 1, p. 2). Its input is a Go program annotated with assertions such as pre and postconditions and loop invariants; on failure Gobra reports at the Go level which assertions it could not verify (Section 1, p. 2).

The central resource model is separation logic. A permission `acc(&v)` grants access to a heap location; fractional permissions allow concurrent reads while exclusive write permission is required. Recursive predicates describe unbounded structures, and quantified permissions express arrays and slices (Section 2.1, pp. 2–3). Functional specifications use side-effect-free expressions, universal quantification, and `old` values from the method pre-state (Section 2.1, p. 3).

## technique 1: method contracts, quantified permissions, and loop invariants

The paper's `incr` example requires permission to every slice element, increments each element, and returns those permissions. Its postcondition states each result equals `old(s[k]) + n`; loop invariants split the slice into processed and unprocessed ranges (Figure 1, p. 3). Apply this pattern by:
1. Mark shared or addressable data with the required annotation (`@` in Gobra) so permissions are generated (Section 2.1, pp. 3–4).
2. Put quantified `acc` permissions in `requires` and return them in `ensures`.
3. State functional behavior with `old` and universal quantification.
4. Add loop invariants for bounds, permissions, unchanged suffixes, and transformed prefixes (Figure 1, p. 3); the paper says the invariants “are needed for verification” (Section 2.1, p. 3). Inference: as for any loop invariant, the verifier must establish it on entry and preservation by the body, and the postcondition must follow from it at exit.

Inference: In Verus, use `requires` and `ensures` on executable Rust functions, `old(...)` in postconditions where the expression is supported, and loop `invariant` clauses for bounds, ownership-derived facts, and processed/unprocessed partitions. Verus's ownership system supplies a different mechanism from Gobra's `acc`; do not copy Gobra syntax. The transferable technique is to make permissions and functional state explicit at every loop boundary.

## technique 2: structural interface subtyping with implementation proofs

Go interfaces are structural: a type implements an interface when it supplies every method. Gobra requires an implementation proof whenever a value is assigned to an interface, proving each subtype method refines the interface method specification (Section 2.2, pp. 4–6). The interface can expose an abstract predicate, such as `memory`, and pure methods such as `hasNext`; each concrete type defines the predicate and provides proofs. The paper says: “This proof checks that, assuming the precondition of an interface method, a call to the implementation method with identical arguments establishes the postcondition of the interface method” (Section 2.2, p. 5).

Apply it by defining abstract interface predicates and method contracts, defining the concrete predicate for each implementation, then proving each implementation method refines its interface contract. Ghost operations may unfold a predicate before a call and fold it afterward (Figure 2 and Section 2.2, p. 5). Gobra infers implementation proofs in simple cases, but user-provided proofs are required especially when they include ghost operations (Section 2.2, p. 4). The paper observes a recurring pattern in implementation proofs: unfold the interface predicate instances of the precondition, call the implementation method, fold those of the postcondition; it says this pattern “can be generated automatically”, while “Currently, Gobra does not infer ghost operations such as the unfolding on line 21” (Section 2.2, pp. 5–6).

Inference: Rust traits are nominally declared, so Verus does not need Gobra's structural-subtyping encoding. Use trait method contracts and prove each implementation's `ensures` satisfies the trait-level behavioral contract; represent abstract resources with spec predicates or ghost state. Dynamic dispatch and trait-object invariants need an explicit model, and the paper does not establish a direct Verus encoding.

## technique 3: permission-carrying channel and goroutine invariants

Gobra associates synchronization primitives with predicates that describe both data properties and permission transfer. Channel invariants specify properties and permissions of sent data; lock invariants specify protected data; initialization uses ghost operations (Section 2.3, pp. 6–8). In the parallel search-and-replace example, `messagePerm` owns a worker's slice chunk. The master folds the predicate before sending, the worker unfolds it after receiving, processes the chunk, and `WaitGroup` transfers completion obligations back to the master (Figure 3, pp. 7–8).

The paper summarizes the mechanism directly: “Gobra enables verification of concurrent programs by associating Go’s synchronization primitives with predicates that do not only express properties of data but also express how permissions to shared memory get transferred between threads” (Section 2.3, p. 6).

Step by step:
1. Define a predicate containing permissions and any functional relation for a message or protected object (Figure 3, p. 7).
2. Initialize the channel with that predicate and maintain send/receive permissions as loop invariants.
3. Before sending, fold the predicate for the chunk; after receiving, unfold it to access the chunk.
4. Give each worker an invariant for its receive permission and message predicate.
5. Use a wait-group obligation for each spawned unit; call `Done` after processing and `Wait` before the master reclaims all permissions (Section 2.3, pp. 7–8).
6. Strengthen the channel invariant to include the work obligation for each worker when proving functional correctness, not only ownership (Section 2.3, p. 8; the full example is in Appendix B, pp. 15–18).

Inference: Verus state machines and proof-oriented concurrency APIs can model a channel protocol and transfer ghost permissions between sender and receiver. Use state-machine transitions and proof predicates to relate sends, receives, and completion; executable Rust channel behavior must be modeled by the chosen API. The paper's Go-specific channel stubs do not carry over automatically.

## technique 4: modular encoding through Viper abstractions

Gobra translates methods, pure methods, and predicates to Viper. Compound Go values use mathematical types, uninterpreted functions, and axioms; shared values add a Viper-heap indirection for aliasing and permission reasoning (Section 3, pp. 8–9). Interface predicates are encoded as a case split over known dynamic implementations plus an abstract default case, so adding an implementation does not invalidate existing proofs (Section 3, p. 8). First-class predicates are defunctionalized into mathematical predicate values and abstract predicates that take those values as arguments; this supports library stubs for concurrency primitives such as mutexes and wait groups; Go's native channel operations are represented analogously (Section 3, p. 9).

Inference: In Verus, keep abstraction at Rust API boundaries: define spec data and proof predicates for ownership and protocol state, and hide representation details behind verified functions/lemmas. Verus uses Rust types and ownership rather than Viper's uninterpreted compound-value encoding. External libraries need explicit specifications; an abstraction is trusted only to the extent its contracts are proved or intentionally marked external.

## evidence and limits

The implementation has a parser/type checker, Viper translation, symbolic execution, Z3, and source-level diagnostics (Section 4, p. 9). Its test suite has 407 tests covering 10,030 Go-and-annotation LOC and takes 14.9 minutes (Section 4, p. 9). The evaluation covers 14 examples, including interfaces and goroutines, mutexes, wait groups, and channels. Each verification time is the mean of twelve executions excluding the slowest and fastest. For correct examples these range from 1.04 to 58.39 seconds; the two concurrency examples (13 and 14) take 53.18 and 58.39 seconds (Section 4, p. 9; Figure 4, p. 10). Annotation overhead is 0.3–3.1 specification lines per code line, and failed-specification or failed-implementation runs have similar times (Section 4, pp. 9–10).

The paper says that for each example Gobra verifies memory safety and functional correctness properties (Section 4, p. 9). Inference: trusted components include the Go parser/type checker, Gobra-to-Viper encoding, Viper symbolic execution, Z3, library stubs for synchronization, and the correctness of specifications. The paper does not establish liveness or hyper-properties; these are future work (Conclusion, p. 11). On related work, the paper says Perennial “does not support core Go features such as channels and interfaces”, and that the behavioral-type approaches of Lange et al. and Gabet and Yoshida are ones whose “analyses are not modular and do not verify functional properties of code” (Section 5, pp. 10–11).

## techniques for the catalog

- quantified separation permissions — specify heap access and functional updates with quantified permissions, `old` values, and loop invariants
- structural interface implementation proofs — refine abstract interface contracts with concrete predicate definitions and ghost unfold/fold steps
- permission-carrying concurrency predicates — encode channel, lock, goroutine, and wait-group protocols as resource-transfer invariants
- modular intermediate encoding — hide representation through Viper-style abstractions, case-split interface predicates, and first-class predicate values
- annotation and verification measurement — report annotation/code ratios, per-example verification times, and seeded specification/implementation failures
