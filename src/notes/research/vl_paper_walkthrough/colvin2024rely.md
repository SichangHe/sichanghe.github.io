# Practical Rely/Guarantee Verification of an Efficient Lock for seL4 on Multicore Architectures
(authored by agents unless marked 🧑)
Tag: `colvin2024rely`, [paper](https://arxiv.org/abs/2407.20559v1)

## what is proved and what remains trusted

The paper machine-checks functional correctness of the CLH queue lock used by the seL4 microkernel and analyzes its behavior under weak memory. It uses Jones-style rely/guarantee reasoning in Isabelle/HOL, first for an abstract queued lock, then for the concrete CLH-seL4 implementation, and finally for Arm reorderings. The paper states: “We use rely/guarantee reasoning for this task, and find it especially suited for hardware-level algorithms which involve weak memory effects.” (section 1, p. 1)

The top-level proof gives Theorems 1 and 2 for `acquire` and `release`, Theorem 3 for N threads, Theorems 4–6 for Arm-specific parallelization and release, and Theorem 7 for the lock with the required ordering constraints. Client correctness remains a separate obligation: “That the lock itself is used in such a way as to guarantee mutual exclusion to some system variable x is something that must be shown for each client system, i.e., that x is only ever modified between calls to acquirei () and releasei ().” (section 4.3, p. 12)

The code assumes a fixed number of threads and one more node than threads (section 4.1, pp. 6–7). Fairness appears in the introduction’s description of eventual acquisition, but termination is outside the proved result: “We have not addressed termination directly in this paper” (section 6, p. 17). The queue contract prevents a waiting thread from moving backwards; it does not by itself prove eventual acquisition. Inference: applying the result requires trusting the proof assistant and library, the cited Arm semantics, and the correspondence between the presented code and the deployed implementation. The paper does not establish starvation freedom or correctness of an arbitrary Rust synchronization implementation.

## technique 1: compositional rely/guarantee contracts

what it is and when to use it

Rely/guarantee extends Hoare pre/postconditions with an environment relation (rely) and a program relation (guarantee). Inference: use it when several threads modify shared state and each proof must tolerate interference from the others. The paper defines the central judgment as: “A rely/guarantee quintuple {p, r } c {g, q} states that the program c achieves the postcondition q and guarantees each step satisfies g, provided that it starts in a state satisfying p and each step of the environment satisfies the rely r .” (section 2, p. 2)

For a lock, thread i relies on `lock = held(i) ⇒ x′ = x` and guarantees `lock ≠ held(i) ⇒ x′ = x`; that is, the environment does not modify protected resource x while i holds the lock, and i does not modify x without holding it (section 2, p. 2).

how to do it

1. Define single-state pre/post predicates and two-state rely/guarantee relations (section 2).
2. Write a quintuple `{p,r} c {g,q}` for each operation (section 2).
3. Use the assignment rule for atomic statements, preserving the identity relation for steps where no command occurs (section 2.1, Rule 1, p. 3).
4. Compose sequential commands through a shared mid-state (Rule 2, section 2.1).
5. At system level, use Rule 5, requiring each thread’s guarantee to imply the other’s rely. For micro-parallelism inside a thread, use Rule 4, proving each component under the external rely extended by the other component’s guarantee (section 2.1, p. 3).
6. Apply the N-thread rule (Rule 6) once every individual thread proof and cross-thread implication is established (section 2.1, p. 3).

Verus form (inference)

Inference: a possible Verus adaptation would represent the abstract lock state and each thread’s allowed transitions explicitly, with operation pre/postconditions and lemmas showing that each transition preserves the other threads’ assumptions. The paper supplies no Verus encoding; whether its interference relations and weak-memory semantics can be represented faithfully would require a separate proof.

what shows it works and limits

The CLH proof uses the same contracts for individual threads and the system theorem: “The relies and guarantees are kept constant throughout.” (section 4.3, p. 11) The authors report: “All proofs have been encoded and machine-checked using Isabelle/HOL.” (section 4.3, p. 11) They also report proofs of abstract locks, two array-based queue locks, and Scott’s CLH variant, with reuse of many CLH proof results (section 7, p. 18). The paper provides no proof-size or proof-time measurements for these artifacts.

## technique 2: factor a global invariant from code-specific proofs

what it is and when to use it

The authors factor a single-state invariant I out of each quintuple. Their definition requires the environment to preserve I, the command to preserve I, and the postcondition to include I. They explain: “The use of an invariant helps to avoid the use of code-specific program-counter-style variables, particularly when used on auxiliary concepts (essentially forming the “specification” of a data type).” (section 2.2, p. 4) Inference: use this when a data-structure relationship must hold across many intermediate program states.

how to do it

1. Choose an invariant over abstract and concrete state (section 2.2).
2. Strengthen the precondition and rely with I and `I ⇒ I′` (Definition 8, p. 4).
3. Require the command guarantee to preserve I and its postcondition to re-establish I (Definition 8).
4. Keep operation-specific pre/postconditions separate; prove each line and loop state against the same invariant (section 4.2).

For CLH, auxiliary variables are `reserved`, the lone unreserved node η, and a queue q of waiting threads. The concrete local `prev` is represented as a mapping indexed by thread. The invariant says q has distinct threads, `reserved` is injective, η is not reserved, η is Granted, queued reserved nodes are Pending, and the abstract node list equals the concrete `prev`/tail list (Figure 4 and section 4.2, pp. 8–10). The coupling invariant derives lock status: the lock is free if q is empty, otherwise the queue head holds it (Figure 4).

Verus form (inference)

Inference: a Verus adaptation could use ghost state for q, η, and the reserved-node mapping, with proof obligations for uniqueness, node status, and the coupling relation at each atomic transition. This is a proposed translation of the paper’s invariant, not an implementation checked by the authors.

what shows it works and limits

Theorem 1 proves that if acquire returns, i is the head of q; Theorem 2 proves release removes the head and restores the reserved-node relation; Theorem 3 composes all threads (section 4.3, pp. 11–12). These are conditional postconditions, not termination proofs. The authors say their contract ensures a process can only advance in the abstract queue (section 6, p. 17).

## technique 3: identify weak-memory reorderings and constrain only the dangerous ones

what it is and when to use it

The weak-memory analysis first interprets sequential composition as parallelized sequential composition under a target memory model m. It then rewrites instruction pairs as strict sequential composition when reordering is forbidden, or parallel composition when reordering is allowed (equations 18–19, p. 13). A fence restores sequential order (equation 20). The paper says: “We analyse the possible weak memory effects in a piece of code by searching for instructions that may be executed out of order.” (section 5.1, p. 12)

how to do it

1. Pick the target memory model, such as Arm, x86, RISC-V, or C (section 5.1).
2. Mark instruction pairs that the model permits to reorder using its model-indexed reordering relation (section 5.1).
3. Rewrite reorderable adjacent instructions as parallel composition and non-reorderable pairs as sequential composition (Rules 18–19, p. 13).
4. Insert a fence where a permitted reordering would violate correctness (equation 20, p. 13); for the Pending-before-swap requirement, release ordering on the swap also suffices (section 5.2, p. 14).
5. Re-prove the transformed code with rely/guarantee rules, using Rule 4 for nested parallelism (section 5.2).

For acquire, loading the node and marking it Pending must precede the atomic tail swap. If the swap happens first, a queued node can appear without Pending status and violate the invariant. The paper therefore inserts a fence or release ordering on the swap; it finds that `procs[i].tmp := prev` may reorder with the wait loop without affecting correctness (section 5.2, pp. 14–15). Release needs no additional ordering for the key load/store pair; Theorem 6 follows directly (section 5.3, p. 16). At the critical-section boundary, the paper requires a full fence at the end of acquire and beginning of release to prevent shared accesses from crossing the lock (section 5.4, p. 16).

Verus form (inference)

Inference: a Rust/Verus adaptation would need to justify the correspondence between its atomic operations and the paper’s memory-model transformations. In particular, it would need proofs of Pending-before-swap ordering and of the ordering between lock operations and critical-section accesses. The paper does not establish which Rust atomic operations or compiler mappings suffice.

what shows it works and limits

Theorem 5 establishes Arm trace equivalence modulo fences and release constraints between acquire and its sequential/parallel form, and Theorem 7 concludes the CLH lock works under Arm (sections 5.2 and 5.5, pp. 15–17). The authors state that the reasoning applies to RISC-V and x86-TSO as well, but the formal theorem shown is for Arm and relies on the cited memory-model interpretation (section 5.5, p. 17). Inference: porting the result to Rust’s target architectures requires rechecking the exact atomic implementation and compiler mappings.

## techniques for the catalog

- rely/guarantee composition: specify environment interference and thread guarantees, then compose individual proofs under cross-thread rely conditions
- coupling-invariant lock proof: relate concrete CLH nodes and abstract queue state with a persistent invariant and per-operation contracts
- weak-memory reorder analysis: transform reorderable instructions into parallel composition and insert fences only where invariants require order
