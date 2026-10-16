# Gobra: Modular Specification and Verification of Go Programs
(authored by agents unless marked 🧑)
Tag: `wolf2021gobra`, [paper](https://doi.org/10.1007/978-3-030-81685-8_17)
## verifier and proof model

Gobra is a modular deductive verifier for annotated Go. It translates annotated programs to Viper and discharges proof obligations with Viper's SMT-based backend and Z3. The abstract states: “Gobra verifies memory safety, crash safety, data-race freedom, and user-provided specifications” (Abstract, p. 1). Its input includes preconditions, postconditions, assertions, and loop invariants; failures are reported at Go level (Section 1, p. 2).

The central resource model is separation logic. A permission `acc(&v)` grants access to a heap location; fractional permissions allow concurrent reads while exclusive write permission is required. Recursive predicates describe unbounded structures, and quantified permissions express arrays and slices (Section 2.1, pp. 2–3). Functional specifications use side-effect-free expressions, universal quantification, and `old` values from the method pre-state (Section 2.1, p. 3).

## technique 1: method contracts, quantified permissions, and loop invariants

The paper's `incr` example requires permission to every slice element, increments each element, and returns those permissions. Its postcondition states each result equals `old(s[k]) + n`; loop invariants split the slice into processed and unprocessed ranges (Figure 1, p. 3). Apply this pattern by:
1. Mark shared or addressable data with the required annotation (`@` in Gobra) so permissions are generated (Section 2.1, pp. 3–4).
2. Put quantified `acc` permissions in `requires` and return them in `ensures`.
3. State functional behavior with `old` and universal quantification.
4. Add loop invariants for bounds, permissions, unchanged suffixes, and transformed prefixes; prove initialization, preservation, and exit (Figure 1, p. 3).

Inference: In Verus, use `requires` and `ensures` on executable Rust functions, `old(...)` in postconditions where the expression is supported, and loop `invariant` clauses for bounds, ownership-derived facts, and processed/unprocessed partitions. Verus's ownership system supplies a different mechanism from Gobra's `acc`; do not copy Gobra syntax. The transferable technique is to make permissions and functional state explicit at every loop boundary.

## technique 2: structural interface subtyping with implementation proofs

Go interfaces are structural: a type implements an interface when it supplies every method. Gobra requires an implementation proof whenever a value is assigned to an interface, proving each subtype method refines the interface method specification (Section 2.2, pp. 4–6). The interface can expose an abstract predicate, such as `memory`, and pure methods such as `hasNext`; each concrete type defines the predicate and provides proofs. The paper says: “This proof checks that, assuming the precondition of an interface method, a call to the implementation method with identical arguments establishes the postcondition of the interface method” (Section 2.2, p. 5).

Apply it by defining abstract interface predicates and method contracts, defining the concrete predicate for each implementation, then proving each implementation method refines its interface contract. Ghost operations may unfold a predicate before a call and fold it afterward (Figure 2, pp. 5–6). Gobra can infer simple proofs, but explicit proofs are needed for ghost predicate operations; the recurring pattern is unfold precondition predicates, call implementation, fold postcondition predicates (Section 2.2, p. 6).

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
6. Strengthen the channel predicate with functional facts when proving computation, not only ownership (Section 2.3, p. 8).

Inference: Verus state machines and proof-oriented concurrency APIs can model a channel protocol and transfer ghost permissions between sender and receiver. Use state-machine transitions and proof predicates to relate sends, receives, and completion; executable Rust channel behavior must be modeled by the chosen API. The paper's Go-specific channel stubs do not carry over automatically.

## technique 4: modular encoding through Viper abstractions

Gobra translates methods, pure methods, and predicates to Viper. Compound Go values use mathematical types, uninterpreted functions, and axioms; shared values add a Viper-heap indirection for aliasing and permission reasoning (Section 3, pp. 8–9). Interface predicates are encoded as a case split over known dynamic implementations plus an abstract default case, so adding an implementation does not invalidate existing proofs (Section 3, p. 8). First-class predicates are defunctionalized into mathematical predicate values and abstract predicates that take those values as arguments; this supports library stubs for mutexes, wait groups, and channels (Section 3, p. 9).

Inference: In Verus, keep abstraction at Rust API boundaries: define spec data and proof predicates for ownership and protocol state, and hide representation details behind verified functions/lemmas. Verus uses Rust types and ownership rather than Viper's uninterpreted compound-value encoding. External libraries need explicit specifications; an abstraction is trusted only to the extent its contracts are proved or intentionally marked external.

## evidence and limits

The implementation has a parser/type checker, Viper translation, symbolic execution, Z3, and source-level diagnostics (Section 4, p. 9). Its test suite has 407 tests covering 10,030 Go-and-annotation LOC and takes 14.9 minutes (Section 4, p. 9). The evaluation covers 14 examples, including interfaces and goroutines, mutexes, wait groups, and channels. Verification times average 1.04–58.39 seconds per correct example; the two concurrent examples take 53.18 and 58.39 seconds (Figure 4, p. 10). Annotation overhead is 0.3–3.1 specification lines per code line, and failed-specification or failed-implementation runs have similar times (Section 4, pp. 9–10).

The proved result is each example's stated memory-safety and functional properties, plus concurrency resource discipline. Trusted components include the Go parser/type checker, Gobra-to-Viper encoding, Viper symbolic execution, Z3, library stubs for synchronization, and the correctness of specifications. The paper does not establish liveness or hyper-properties; these are future work (Conclusion, p. 11). It also reports that its channel and interface support is Go-specific and that prior approaches differ in modularity or heap-functional coverage (Section 5, pp. 10–11).

Inference: For VL, Gobra's strongest lesson is modular ownership plus protocol predicates. The threat from agent-written verified Rust is contract mismatch: a proof can establish memory and race properties while omitting a security or crash-recovery requirement. VL should reuse Verus's ownership, contracts, loop invariants, and state-machine constructs, then add domain-specific protocol predicates; reimplementing Gobra's Viper encoding would not address Rust's distinct semantics.

## techniques for the catalog

- quantified separation permissions — specify heap access and functional updates with quantified permissions, `old` values, and loop invariants
- structural interface implementation proofs — refine abstract interface contracts with concrete predicate definitions and ghost unfold/fold steps
- permission-carrying concurrency predicates — encode channel, lock, goroutine, and wait-group protocols as resource-transfer invariants
- modular intermediate encoding — hide representation through Viper-style abstractions, case-split interface predicates, and first-class predicate values
- annotation and verification measurement — report annotation/code ratios, per-example verification times, and seeded specification/implementation failures
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
