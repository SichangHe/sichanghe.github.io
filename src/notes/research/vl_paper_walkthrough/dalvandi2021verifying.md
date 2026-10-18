# Verifying C11-Style Weak Memory Libraries via Refinement
(authored by agents unless marked 🧑)
Tag: `dalvandi2021verifying`, [paper](http://arxiv.org/abs/2108.06944v1)

## problem and model

Dalvandi and Dongol study modular deductive verification of clients that call concurrent libraries under RC11 RAR, a C11 fragment supporting relaxed and release-acquire accesses while disallowing load-buffering cycles. Their central problem is that a library call can synchronize a client thread and change what it can observe, so a proof of a closed program does not compose automatically with a library implementation. The abstract states: “We develop a simple framework for specifying abstract objects that precisely characterises the observability guarantees of abstract method calls.” (abstract, p. 1)

The paper’s workflow is explicit: “Defining the abstract operational specification of a library”; “Verifying client programs that uses the library operations using Hoare logic and Owicki-Gries”; “Implementing the library using the generalised operational semantics of C11”; and “Proving that the implementation is a contextual refinement of the abstract specification and therefore it can safely replace the abstract specification in the client programs.” (section 1, p. 3) The abstract says the framework, “including the operational semantics, verification technique for client-library programs, and simulation between abstract libraries and their implementations, has been mechanised in Isabelle/HOL.”

The scope matters. RC11 RAR is only a fragment of C11, and the paper deliberately disallows causality cycles such as load buffering. Its proofs concern the formal operational model and its release-acquire rules. Inference: Rust atomics can use the same proof architecture only after their exact memory-order and pointer semantics are related to this model; the paper does not establish that relation.

## technique 1: operational client-library semantics

What it is. A program state is split into local thread state, a client global state, and a library global state. The operational semantics combines program transitions, a C11 weak-memory state recording writes and views, and object transitions. Programs contain holes that can be filled by an abstract method or a concrete implementation. The paper says: “The operational semantics for this language is defined in three parts. The program semantics fixes the steps that the concurrent program can take. This gives rise to transitions … The program semantics is combined with a memory semantics reflecting the C11 state, and in particular the writes from which a read action can read. Finally, there is the object semantics, which defines the abstract semantics of the object at hand.” (section 3.2, p. 6)

How to apply it. Partition shared variables into client and library sets and each thread’s locals likewise. Annotate reads as relaxed or acquire, writes as relaxed or release, and read-modify-writes as RA. Represent each write with a timestamp, value, and modification view; represent each thread with a view of the latest write it has observed. Define transitions for reads, writes, CAS, FAI, and abstract calls. A release operation carries the writing thread’s view; an acquire operation joins the release’s modification view into both library and client thread views. Keep library state separate so an abstract call can transfer synchronization without exposing its representation.

Evidence and limits. The model handles top-level thread interleavings and can be generalized to multiple library components (aside 1, p. 10). It is not a full C11 model: load-buffering cycles and other weaker semantics are out of scope. Inference: the operational rules and their Isabelle formalization are the foundation that the later object proofs rely on.

Inference: In Verus, executable Rust atomics should be wrapped in a state-machine API whose ghost state records per-thread views and release/acquire transfers. Use `proof fn` lemmas to establish that each wrapper operation preserves the abstract transition relation; use `requires` to restrict permitted memory orders and ownership states and `ensures` to expose the client-visible observation guarantee. This is an inference because no Verus encoding appears in the paper.

## technique 2: abstract object specifications with observability

What it is. Abstract methods are state transitions, not merely sequential return-value functions. An abstract lock has timestamped `Acquire` and `Release` operations; a successful acquire synchronizes with the latest release and updates the acquiring thread’s client view. The specification includes a return-value slot `rval` so an abstract and concrete call can be compared exactly (section 4, pp. 10–12).

The assertion language has five useful forms. A possible observation `⟨x = u⟩t` means thread `t` may observe `u`; a definite observation `[x = u]t` means it can see only the latest write of value `u`; a conditional observation `⟨x = u⟩[y = v]t` means that observing `u` for `x` forces a later observation of `v` for `y`; covered and hidden-operation assertions constrain which object operations remain insertable or returnable. The paper emphasizes the cross-state form: “conditional observation enables one to describe view synchronisation across different states.” (section 5.1, p. 13)

How to apply it. Specify the object’s operation set, timestamp order, synchronization action, and return values. Define initial operation and thread views. For each operation, add a timestamp after the calling thread’s current view, update object operations, and, for acquire/release methods, transfer the appropriate modification view to the client. State client obligations as observation predicates. For message passing, write a release `pushR(1)` after `d := 5` and an acquiring `popA()` before reading `d`; the conditional assertion records that a pop returning 1 implies a view in which `d = 5`.

Evidence and limits. The paper’s Figure 3 proof outline establishes `r2 = 5` for this idiom, while the unsynchronized version permits `r2 = 0 ∨ r2 = 5` (section 2, pp. 4–5). The paper states that this proof outline is valid as Proposition 3, “verified using our Isabelle/HOL mechanisation” (section 7.1, p. 22).

Inference: A Verus library API can expose a ghost abstract history and a `view` predicate; each method’s `ensures` can state the client-visible observation and returned value. Verus’s ordinary ownership and ghost state can encode the relation, but the paper’s arbitrary timestamp sets and weak-memory execution relation require a custom model and substantial lemmas. This is an inference.

## technique 3: Hoare logic plus Owicki-Gries interference freedom

What it is. The authors lift standard Hoare triples to states `(local variables, client state, library state)` and use Owicki-Gries proof outlines. A concurrent proof needs both local correctness and interference freedom (stability): every command in one thread must preserve assertions attached to commands in another. The paper states: “Due to concurrency, following Owicki and Gries, one must prove local correctness and interference freedom (or stability).” (section 5.2, p. 14)

How to apply it (a generic Owicki-Gries reading of the paper's lock example, not a procedure the paper spells out). Choose a global invariant and a pre/post assertion for each program point. Prove initialization establishes the invariant. For each atomic command, apply the read/write/CAS or abstract-method rule to derive its next assertion. For every command in thread `i`, prove it preserves every assertion of other threads under the global invariant. Use observation assertions to connect a synchronizing method call to client reads.

The lock example’s global invariant is `¬(pc1 ∈ {2,3,4} ∧ pc2 ∈ {2,3,4}) ∧ (rl ∈ {1,3})`, expressing mutual exclusion and which thread acquired first (section 5.3, pp. 15–16). The proof derives that thread 2 sees both writes as 0 if it acquires first, or both as 5 if it acquires after thread 1. Isabelle verifies the proof outline as Lemma 2.

Inference: In Verus, represent the global invariant as a predicate over a ghost state machine and prove each transition preserves it. Sequential method contracts can encode local Hoare steps; concurrent transitions should use Verus transition-system/state-machine constructs, with permissions and invariants governing shared state. Verus does not provide the paper’s Owicki-Gries calculus automatically, so the stability obligations become explicit proof lemmas. This is an inference.

## technique 4: contextual refinement by forward simulation

What it is. A concrete object is contextually refined by an abstract object when no client can observe a new behavior after substitution. Formally, every concrete client trace must be matched by an abstract trace, with concrete client observations a subset of abstract observations and matching return values. The authors define: “We say a concrete object CO is a contextual refinement of an abstract object AO iff for any client program C, we have C[AO] ⊑ C[CO].” (Definition 4, section 6.1, p. 17)

How to apply it. Define state refinement (Definition 2): local states and covered sets must be equal, and each concrete thread’s observable writes (`Obs`) must be included in the abstract thread’s. Define a relation `R` between abstract local/client/library states and concrete ones. Prove initialization establishes `R`. For every concrete implementation step, prove either a stuttering case preserving `R`, or a matching abstract step after which `R` holds again. Definition 5 builds in the client observation condition and equal `rval`. Theorem 1 states that such a forward simulation implies contextual refinement, but only for clients that synchronize only through the object; the paper says a general forward simulation is non-trivial because client synchronisation can affect the library state.

The sequence-lock proof treats reads and failed CAS operations as stuttering, while a successful CAS matches abstract acquire; release refines abstract release. The ticket-lock proof similarly matches the acquire when the ticket is served and treats ticket allocation and unsuccessful polling as stuttering (sections 6.2–6.3, pp. 18–19). Both propositions are verified in Isabelle.

Inference: For Verus Rust, define abstract and concrete ghost states and a relation predicate. Prove each concrete atomic method either leaves the abstract state unchanged or corresponds to one abstract transition, and state client projection/refinement in `ensures`. This requires an explicit model of atomic observations; a sequential Verus contract alone cannot establish contextual refinement. This is an inference.

## technique 5: weak-memory data-structure specifications and Treiber proof

What it is. The abstract stack and queue specifications retain a total timestamp order but allow it to differ from real-time order. A `matched` relation records which enqueue is removed by which dequeue; stack push/pop rules enforce last-in-first-out subject to each thread’s view. Synchronizing methods transfer modification views to clients. This lets an abstract object provide client message passing without imposing unnecessary global synchronization.

How to apply it. For a Treiber stack, model `Top`, node value and next fields, and a set `usedAddr`. Use acquiring reads and releasing CAS operations exactly as in Algorithm 1. State invariants: the transitive `nxtRel` relation is a total order with `Top` at the minimum and null at the maximum; all writes to `Top` are releasing and non-null written values are used addresses (7.2); a non-null last value of `Top` is a pushed address (7.3); pushed addresses are a subset of used addresses (7.4); next pointers of distinct pushed addresses differ (7.5); a non-null next pointer of a pushed address is a pushed address (7.6) (invariants 7.1–7.6, p. 24). The paper, following Doherty et al., assumes pop spins instead of returning empty (section 7.2, p. 23). Define a simulation relation with an injective function mapping concrete pushed nodes to unmatched abstract pushes, equal values, timestamp-order constraints, and client-view inequalities (7.7–7.13). Show all steps except successful CAS at lines 9 and 16 stutter, and those successful CASes match a releasing push or an acquiring pop (section 7.2, p. 25).

Evidence. Proposition 4 states that this relation is a forward simulation for synchronization-free clients. The full Treiber proof is about 12 KLOC across nine Isabelle theories (section 7.3, p. 26). The paper reports that the whole development is about 25 KLOC, of which about 2.5 KLOC comes from earlier work (section 1, p. 2). The mechanised results cover the abstract lock client outline (Lemma 2), refinement of the sequence lock and ticket lock (Propositions 1 and 2), the stack client outline (Proposition 3), and the Treiber stack (Proposition 4). Queue and stack specifications are given as rules (section 7.1); only the stack has an implementation proof. I found no runtime performance figures or counts of explored executions in the paper; the results are deductive proofs.

Inference: In Verus, the node-set, linked-order, and injective mapping can be ghost sets/maps with `spec fn` predicates and `proof fn` preservation lemmas. Raw pointer safety and atomic memory-order semantics remain separate obligations; a Verus proof of a Rust Treiber implementation would need APIs whose contracts expose exactly the release/acquire guarantees assumed here. This is an inference.

## what is proved and what stays trusted

Proved claims are relative to RC11 RAR operational semantics, the abstract-object rules, and Isabelle/HOL: client safety properties, lock refinement, and Treiber-stack refinement. The paper states: “All of the programs, theorems and proof rules in this paper are fully verified.” (section 1, p. 2) Inference: trusted assumptions include the correctness and adequacy of Isabelle/HOL, the RC11 RAR model, timestamp/view definitions, allocation assumptions in the Treiber abstraction (two consecutive fresh addresses initialized to zero), and the restriction to clients that synchronize only through the library for the stated simulation theorem. The paper does not address hardware, compilers or Rust.

Inference: The threat to agent-written verified Rust is high for concurrent libraries: an agent can prove a sequential-looking API while omitting client-visible synchronization or using an unsound memory-order abstraction. The strongest reusable product pattern is to generate (1) an abstract operation/view specification, (2) a client proof, and (3) a concrete-to-abstract simulation artifact, with memory-order assumptions explicit in each contract. This is an inference.

## techniques for the catalog

- operational weak-memory semantics — combine thread steps, per-thread observations, and abstract or concrete library transitions
- observation assertions — express possible, definite, conditional, covered, and hidden method observations
- Owicki-Gries stability — prove local Hoare triples and that every concurrent command preserves other threads’ assertions
- contextual refinement — require every concrete client trace to be matched by an abstract trace with no new client observations
- forward simulation — relate abstract and concrete states and classify implementation steps as stuttering or matching
- weak-memory object specification — use timestamped operations, matching relations, and view transfer for queues and stacks
- invariant-guided Treiber verification — preserve linked-order, address-set, and view invariants and map concrete nodes to abstract operations
