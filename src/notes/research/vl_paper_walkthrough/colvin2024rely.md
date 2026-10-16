# Practical Rely/Guarantee Verification of an Efficient Lock for seL4 on Multicore Architectures
(authored by agents unless marked 🧑)
Tag: `colvin2024rely`, [paper](http://arxiv.org/abs/2407.20559v1)

## what is proved and what remains trusted

The paper machine-checks functional correctness of the CLH queue lock used by the seL4 microkernel and analyzes its behavior under weak memory. It uses Jones-style rely/guarantee reasoning in Isabelle/HOL, first for an abstract queued lock, then for the concrete CLH-seL4 implementation, and finally for Arm reorderings. The paper states: “We use rely/guarantee reasoning for this task, and find it especially suited for hardware-level algorithms which involve weak memory effects.” (section 1, p. 1)

The top-level proof gives Theorems 1 and 2 for `acquire` and `release`, Theorem 3 for N threads, Theorems 4–6 for Arm-specific parallelization and release, and Theorem 7 for the lock with the required ordering constraints. The result is a machine-checked proof of the lock specification, not a proof that every client uses the lock correctly: “That the lock itself is used in such a way as to guarantee mutual exclusion to some system variable x is something that must be shown for each client system.” (section 4.3, p. 12)

The proof trusts Isabelle/HOL and its rely/guarantee library, the formal interpretation of the Arm memory model, the abstraction from seL4 code to the presented CLH code, and the initial assumptions about fairness and finite thread identifiers. The paper does not address termination directly; it notes only that the queue contract shows each process advances. Inference: the result is strong evidence for safety and ordering of this lock model, but it does not establish starvation freedom, full seL4 integration, or correctness of an arbitrary Rust synchronization implementation.

## technique 1: compositional rely/guarantee contracts

what it is and when to use it

Rely/guarantee extends Hoare pre/postconditions with an environment relation (rely) and a program relation (guarantee). Use it when several threads modify shared state and each proof must tolerate interference from the others. The paper defines the central judgment as: “A rely/guarantee quintuple {p, r } c {g, q} states that the program c achieves the postcondition q and guarantees each step satisfies g, provided that it starts in a state satisfying p and each step of the environment satisfies the rely r .” (section 2, p. 2)

For a lock, thread i relies on `lock = held(i) ⇒ x′ = x` and guarantees `lock ≠ held(i) ⇒ x′ = x`; that is, the environment does not modify protected resource x while i holds the lock, and i does not modify x without holding it (section 2, p. 2).

how to do it

1. Define single-state pre/post predicates and two-state rely/guarantee relations (section 2).
2. Write a quintuple `{p,r} c {g,q}` for each operation (section 2).
3. Use the assignment rule for atomic statements, preserving the identity relation for steps where no command occurs (section 2.1, Rule 1, p. 3).
4. Compose sequential commands through a shared mid-state (Rule 2, section 2.1).
5. For parallel composition, require each thread’s guarantee to satisfy the other’s rely; use Rule 5 at system level and Rule 4 for extra micro-parallelism inside a thread (section 2.1, pp. 3–4).
6. Apply the N-thread rule (Rule 6) once every individual thread proof and cross-thread implication is established (section 2.1, p. 3).

Verus form (inference)

Inference: encode the shared abstract lock state and each thread’s allowed transition in a Verus state machine or proof-oriented API. Use a state invariant to state the global lock/queue relation, `requires` and `ensures` for acquire/release, and `proof fn` lemmas showing one thread’s transition preserves facts relied on by others. Verus has no direct rely/guarantee quintuple syntax; the environment relation must be represented by transition preconditions and state-machine invariants. The executable lock still needs an ownership-safe Rust encoding, and any atomic memory-order semantics must be modeled explicitly.

what shows it works and limits

The CLH proof reuses the same abstract contracts for individual threads and the system theorem. The paper reports that all proofs are encoded and machine-checked in Isabelle/HOL (section 4.3, p. 11). Inference: compositional reuse is demonstrated by the paper’s additional proofs of abstract locks, array-based queue locks, and Scott’s CLH variant, but no proof-size or time denominator is reported for those additional artifacts.

## technique 2: factor a global invariant from code-specific proofs

what it is and when to use it

The authors factor a single-state invariant I out of each quintuple. Their definition requires the environment to preserve I, the command to preserve I, and the postcondition to include I. They explain: “The use of an invariant helps to avoid the use of code-specific program-counter-style variables, particularly when used on auxiliary concepts.” (section 2.2, p. 4) Use this when a data-structure relationship must hold across many intermediate program states.

how to do it

1. Choose an invariant over abstract and concrete state (section 2.2).
2. Strengthen the precondition and rely with I and `I ⇒ I′` (Definition 8, p. 4).
3. Require the command guarantee to preserve I and its postcondition to re-establish I (Definition 8).
4. Keep operation-specific pre/postconditions separate; prove each line and loop state against the same invariant (section 4.2).

For CLH, auxiliary variables are `reserved`, the lone unreserved node η, a queue q of waiting threads, and per-thread `prev`. The invariant says q has distinct threads, `reserved` is injective, η is not reserved, η is Granted, queued reserved nodes are Pending, and the abstract node list equals the concrete `prev`/tail list (Figure 4 and section 4.2, pp. 8–10). The coupling invariant derives lock status: the lock is free if q is empty, otherwise the queue head holds it (Figure 4).

Verus form (inference)

Inference: put the CLH abstract queue, node-status relation, uniqueness, and coupling fact in a state-machine `invariant`. Each atomic operation gets `requires`/`ensures` clauses; a `proof fn` establishes preservation for each transition. Use ghost state for q and reserved-node mappings, while executable fields remain the actual Rust atomics. Verus invariants must be written in supported Rust/Verus syntax; the paper’s mathematical list notation is a specification idea, not code to paste.

what shows it works and limits

Theorem 1 proves acquire from “i not in q” to “i is the head of q”; Theorem 2 proves release removes the head and restores the reserved-node relation; Theorem 3 composes all threads (section 4.3, pp. 11–12). These are safety and abstract-state results. The paper’s fairness assumption is needed for eventual lock acquisition, but liveness is not proved directly (section 6, p. 18).

## technique 3: identify weak-memory reorderings and constrain only the dangerous ones

what it is and when to use it

The weak-memory analysis transforms sequential composition according to a target model m. If two instructions cannot reorder, preserve sequential composition; if they may reorder, replace it with parallelized sequential composition; insert a fence to restore order. The paper says: “We analyse the possible weak memory effects in a piece of code by searching for instructions that may be executed out of order.” (section 5.1, p. 13)

how to do it

1. Pick the target memory model, such as Arm, x86, RISC-V, or C (section 5.1).
2. Mark instruction pairs that the model permits to reorder using the paper’s `⇐` relation (section 5.1).
3. Rewrite reorderable adjacent instructions as parallel composition and non-reorderable pairs as sequential composition (Rules 18–19, p. 13).
4. Insert a fence or release ordering where correctness depends on a forbidden reordering (Rule 20, p. 13).
5. Re-prove the transformed code with rely/guarantee rules, using Rule 4 for nested parallelism (section 5.2).

For acquire, loading the node and marking it Pending must precede the atomic tail swap. If the swap happens first, a queued node can appear without Pending status and violate the invariant. The paper therefore inserts a fence or release ordering on the swap; it finds that `procs[i].tmp := prev` may reorder with the wait loop without affecting correctness (section 5.2, pp. 14–15). Release needs no additional ordering for the key load/store pair; Theorem 6 follows directly (section 5.3, p. 16). At the critical-section boundary, the paper requires a full fence at the end of acquire and beginning of release to prevent shared accesses from crossing the lock (section 5.4, p. 16).

Verus form (inference)

Inference: model each atomic operation with the Rust memory ordering actually used (`Acquire`, `Release`, `AcqRel`, or stronger), and state the ordering assumptions in the Verus atomic API contract. Prove that the Pending-before-swap fact and critical-section boundaries preserve the state-machine invariant. Verus does not automatically validate a hardware memory model merely because an atomic type compiles; the selected model and library specifications remain trusted unless separately formalized.

what shows it works and limits

Theorem 5 establishes Arm trace equivalence between the fenced/release-constrained implementation and the parallelized execution, and Theorem 7 concludes the CLH lock works under Arm (sections 5.2 and 5.5, pp. 15–17). The authors state that the reasoning applies to RISC-V and x86-TSO as well, but the formal theorem shown is for Arm and relies on the cited memory-model interpretation (section 5.5, p. 17). Inference: porting the result to Rust’s target architectures requires rechecking the exact atomic implementation and compiler mappings.

## what VL should retain and threat assessment

This paper already supplies the concurrency pattern VL should not claim as a new generic idea: abstract lock contracts, coupling invariants, compositional thread proofs, and a separate weak-memory pass that inserts only necessary ordering. Inference: for agent-written verified Rust, the highest-value transfer is to make the abstract queue and interference contract explicit before proving pointer/atomic code, then test each target memory ordering separately. Inference: threat to VL is moderate for low-level synchronization proof design because this is a complete, reusable methodology; direct product threat is low because the artifact is Isabelle/HOL and the paper does not provide Verus Rust code, a Rust memory-model proof, or automation for arbitrary locks.

## techniques for the catalog

- rely/guarantee composition: specify environment interference and thread guarantees, then compose individual proofs under cross-thread rely conditions
- coupling-invariant lock proof: relate concrete CLH nodes and abstract queue state with a persistent invariant and per-operation contracts
- weak-memory reorder analysis: transform reorderable instructions into parallel composition and insert fences only where invariants require order

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
