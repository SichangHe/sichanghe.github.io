# Permission-Based Separation Logic for Multithreaded Java Programs
(authored by agents unless marked 🧑)
Tag: `amighi2015permissionbased`, [paper](https://www.semanticscholar.org/paper/be989387a9f393a32f83eb350e333755e489f66a)

## scope and central invariant

The paper presents a sound (but not complete) concurrent separation logic for a Java-like language with heap-allocated threads, repeated joins, reentrant monitors, and wait-notify. Its abstract states: “The program logic associates a unique static access permission with each heap location, ensuring exclusive write accesses and ruling out data races.” (Abstract, p. 1). Fractional permissions permit concurrent reads; permissions move at thread creation, thread termination, lock entry, and lock exit. The logic also uses abstract predicates for data abstraction, monitor invariants, fork preconditions, and join postconditions, plus value-parameterized types for global ownership relations (Abstract, p. 1).

## technique: permission tickets and separating conjunction

Use this when shared heap access must be checked compositionally. A points-to assertion `x.f ↦ v` both states the field value and grants an access ticket. Full permission `1` permits writing; a fraction in `(0,1)` permits reading. Permission addition never exceeds `1`, so two writers cannot own the same field. The paper says, “The crucial difference to standard Hoare logic is that both these rules have a precondition of the form x.f 7→ : this formula functions as an access ticket for x.f .” (Section 1.2.1, p. 3).

Steps: (1) give each field a permission-bearing points-to fact; (2) split a full permission into fractions for concurrent readers; (3) require permission in every read/write rule; (4) merge fractions before a write; (5) reject any state whose total permission exceeds one. Separating conjunction `F * G` requires disjoint resources and therefore excludes aliasing interference. Inference: Verus has ownership and tracked ghost resources, but its idiomatic specifications use `requires`/`ensures`, `tracked` values, and state-machine protocols rather than the paper's points-to syntax. Inference: a Verus encoding should make a write consume exclusive authority and share read facts through a proved protocol; duplicating a tracked permission would be a proof error.

## technique: frame rule and abstract predicates

The frame rule localizes a method proof: from `{F} c {F'}`, derive `{F * G} c {F' * G}` when `G` is untouched. The paper states, “This rule expresses that given a command c that only accesses the part of the heap described by F , one can reason locally about command c ((Frame)’s premise) and deduce something globally, i.e., in the context of a bigger heap F * G ((Frame)’s conclusion).” (Section 1.2.2, p. 4). Abstract predicates hide representation details while allowing implementations to define resource invariants; clients use the predicate name.

Steps: (1) specify the exact footprint `F` a method can access; (2) prove the body from `F`; (3) carry any disjoint caller resource `G` through the call with Frame; (4) expose or close an abstract predicate only at its defining class boundary. Inference: Verus's function contracts and ownership already provide a frame-like effect for values that a function cannot access; abstract predicates map to `spec` predicates and helper lemmas that expose representation only in trusted modules. Inference: the mapping requires explicit borrow and alias arguments because Rust's references are not Java heap fields.

## technique: fork, join, and fractional postconditions

Use `Join(e, π)` to account for resources released by a terminated thread. Creating a thread emits `Join(thread,1)`; a joining thread may pick up fraction `π` of the postcondition, and a `group` predicate provides a sound split/merge operation for multiple joiners (Sections 3.2.1–3.2.2, pp. 23–24). The class contracts tie the operations together: `fork` requires the child's precondition, `run` establishes `postJoin<1>`, and `join` requires `Join(this,p)` and ensures `postJoin<p>` (Section 3.3, p. 25).

Steps: (1) define a thread's `preFork` and `postJoin` predicates; (2) give the parent a nonduplicable join ticket at allocation; (3) transfer the child footprint at fork; (4) let each joiner consume only its ticket fraction after termination; (5) split `postJoin` as a group when several threads join. Inference: Verus concurrency uses state-machine transition permissions and tracked tokens; model a join token as a tracked resource whose transition is enabled only after the child reaches a terminated state. Inference: ordinary Rust `JoinHandle` ownership can enforce one join, but repeated joins and fractional postconditions need an explicit ghost protocol.

## technique: monitor invariants and reentrant locks

A lock carries a resource invariant. Initial acquisition transfers the invariant's footprint to the thread; release must re-establish it. Reentrant acquisition does not transfer resources again, so the logic distinguishes initial entry from reentry using an auxiliary multiset of held monitors and type-based ownership facts (Abstract, p. 1; Section 4, pp. 35–44). Value-parameterized types such as `Node<owner>` statically express that nodes belong to a container, which helps prove a lock is not already held when entering a method (Section 4.6, pp. 47–49).

Steps: (1) define a lock resource predicate; (2) on initial lock entry, open the predicate and obtain its permissions; (3) on reentry, check ownership but do not duplicate permissions; (4) before final exit, close the predicate; (5) use ownership type parameters to establish non-aliasing conditions required by lock coupling. Inference: Verus can represent the monitor invariant as a state-machine invariant and represent lock ownership with tracked tokens; a transition for reentry should preserve the same token rather than create another. Inference: Rust's mutex APIs hide lock state, so proof-oriented wrappers or a state-machine model are needed for this reasoning.

## technique: modular examples and proof rules

The logic proves field reads with any positive permission, field writes with full permission, allocation with an initialization predicate, method calls by contract substitution, and unaffected state with Frame (Section 2.4.2, pp. 14–15). The authors prove soundness of logical consequence by induction on proof trees: “If Fct (E) = E and (Γ; o; F̄ ⊢ G), then (Γ ⊢ E; F̄ |= G).” (Theorem 2.1, p. 14). They verify sequential and parallel mergesort, a signal-processing pattern, a reentrant Set with wait-notify, and a lock-coupled sorted list (Sections 2.6, 3.5, and 4.6, pp. 19–20, 30–34, 44–49).

Inference: in Verus, the corresponding evidence is a verified function whose `ensures` contract states the abstract data-structure predicate and whose helper `proof fn`s establish field and permission lemmas. Inference: a Verus proof must retain executable Rust ownership and cannot import the paper's Java operational semantics unchanged.

## what is trusted, measured, and left open

The paper proves soundness and preservation theorems for its model language and states that verified programs satisfy null-error freeness and partial correctness (Section 3.4, pp. 26–28). It does not claim completeness. The semantic validity relation for Boolean expressions is delegated to “an external and dedicated theorem prover” (Section 2.4.1, p. 12), so that prover, the logic's axioms, and the model-language semantics remain trusted components. The examples demonstrate expressiveness; they are not a performance benchmark.

Inference: the technique directly threatens VL only if VL-generated concurrent Rust lacks an explicit ownership protocol: data-race freedom is otherwise a useful design target. Inference: abstract predicates and fractional read permissions are reusable ideas for Verus APIs, while reentrant lock and repeated-join proofs require custom state-machine models. Inference: a product claim of verified concurrency must state which external libraries, scheduler behavior, and unsafe code remain assumptions.

## techniques for the catalog

- permission tickets — attach fractional access rights to heap facts, allowing reads below one and writes only at one
- separating conjunction — compose disjoint resources and obtain local reasoning through the frame rule
- abstract resource predicates — hide representation while exposing monitor, fork, and join contracts
- fractional join transfer — split terminated-thread postconditions among multiple joiners through nonduplicable tickets
- reentrant monitor invariants — transfer resources only on initial lock entry and re-establish the invariant on final exit
- ownership-parameterized types — encode static container ownership to prove lock-coupling non-aliasing
- sound Hoare proof rules — combine permission-aware field, call, allocation, frame, and consequence rules

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
