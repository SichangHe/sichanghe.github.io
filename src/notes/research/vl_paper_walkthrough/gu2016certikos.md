# CertiKOS: An extensible architecture for building certified concurrent OS kernels
(authored by agents unless marked 🧑)
Tag: `gu2016certikos`, [paper](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/gu)

## scope and result

CertiKOS presents a compositional method for proving a concurrent operating-system kernel. The implementation is a 6,500-line C and x86-assembly kernel, called mC2, with fine-grained locks, thread scheduling, shared-memory IPC, virtual machines, and device support. The paper's central proof is contextual refinement: for a context program that does not go wrong on the specification under any configuration, the implementation also does not go wrong, and each of its observable behaviors is permitted by the specification under some configuration (Definition 1, §3.2, p. 658). The paper states: “We present a novel compositional approach for building certified concurrent OS kernels.” (Abstract, p. 653)

The target is stronger than checking isolated functions. The paper explains: “To support certified linking with other CPUs or threads, we prove a strong contextual refinement property for every kernel function, which states that the implementation of each such function will behave like its specification under any kernel/user context with any valid interleaving.” (Abstract, p. 653) The result is intended to transfer properties proved over a high-level kernel specification to concrete x86 execution. The authors report less than two person-years for supporting concurrency in §1 (p. 654), and about two person-years for the new concurrency framework and features in §5 (p. 664). They report execution on stock x86 multicore machines (Abstract, p. 653) and machine-checked Coq proofs of every refinement step (§3.5, p. 660).

## technique 1: contextual refinement as the compositional contract

What it is. A certified abstraction layer is a tuple consisting of an underlay interface, an implementation, and an overlay interface. The overlay is a deep specification: it captures all behavior that a context can observe. The paper says: “A certified abstraction layer consists of a language construct (L1 ,M,L2 ) and a mechanized proof object showing that the layer implementation M, built on top of the interface L1 (the underlay), is a contextual refinement of the desirable interface L2 above (the overlay).” (§2, p. 655)

When to use it. Inference: use this when a system has many mutually dependent components and the whole implementation cannot be verified in one proof. Give each module a stable, contextually observable interface. Once a module is proved against its deep specification, later proofs can reason about that specification instead of reopening the implementation. The paper states: “Once we have certified M with a deep specification L2 , there is no need to ever look at M again, and any property about M can be proved using L2 alone.” (§2, p. 655)

How to do it.

1. Define the underlay and overlay interfaces and the module implementation between them (§2, p. 655).
2. Define whole-machine semantics as the set of behaviors over all valid environment contexts (§2, p. 656).
3. For every program P that is safe on the overlay under all configurations, prove safety on the underlay with the implementation and inclusion of observable behaviors. Corresponding executions may use different environment contexts (§1, p. 654; Definition 1, §3.2, p. 658).
4. Compose layers upward, carrying the refinement proof and the abstract state into the next layer (§3.5, p. 660).
5. Transfer a global property proved at the top specification to the assembly machine through the refinement chain (§2, p. 656; §3.5, p. 660).

Inference: in Verus, represent the deep specification as a ghost state machine or abstract datatype and expose a Rust API whose methods have `requires` and `ensures` clauses relating concrete state to the abstract state. Keep implementation details private; prove each public operation preserves the relation. Use `proof fn` lemmas to compose operation refinements. Verus does not directly provide CertiKOS's Coq layer calculus, so the layer composition and machine semantics must be encoded as specifications and proofs.

Evidence. The authors report a contextual theorem for the kernel K and any user program P: `[[K&P]]x86mc ⊑ [[P]]mC2` (§2, p. 656). They report 6,500 lines of C and assembly, 943 lines specifying the hardware machine, 450 lines specifying abstract system calls, 5,249 lines of additional function specifications, about 40,000 lines of auxiliary definitions, lemmas, theorems, and invariants, and 50,000 lines of Coq proof scripts for newly added concurrency features (§5, p. 664). The 50,000-line count covers the newly added concurrency proofs; the other counts describe the kernel, specifications, and auxiliary definitions, not a per-function cost.

Limits. The refinement proves only the behaviors represented by the machine and specifications. The paper says the assembly machine covers only a subset of x86 instructions, the assembler is unverified, and the bootloader, pre-initialization module, and ELF loader are left for future work (§2, p. 657; §5, p. 664).

## technique 2: environment contexts turn concurrency into sequential proof obligations

What it is. CertiKOS parameterizes each interface by an active thread or CPU set A and an environment context ε describing events generated by all CPUs or threads outside A. The concurrent semantics is the set of executions over every valid environment context. The paper defines: “Each ε defines a specific instance on how other threads/CPUs/devices respond toward the events generated by the current running threads.” (§1, p. 654)

When to use it. Inference: use this for shared-memory concurrency where a component must be proved against all interference allowed by its environment invariants. Select the CPUs or threads being proved as the active set; model the remainder as an environment that returns events while preserving explicit invariants. This lets a singleton active set behave like a sequential machine while retaining interference in the environment.

How to do it.

1. Distinguish private and shared memory; classify instructions as private, non-atomic shared accesses, or atomic object calls. Only atomic operations generate object events (§3.1, p. 658).
2. Define `EC(L,A)`, the valid environment contexts for interface L and active set A (§2, p. 656).
3. Define the thread-modular machine `ΠL(A)(P,ε)` that executes active code and obtains outside events from ε (§2, p. 656).
4. Define whole-machine semantics as all such executions: `[[P]]L(A) = { ΠL(A)(P,ε) | ε ∈ EC(L,A) }` (§2, p. 656).
5. Prove disjoint-set composition: the behavior for A∪B refines the intersection of behaviors for A and B when A and B are disjoint and each side's invariant satisfies the other's environment requirements (Lemma 3, §3.4, pp. 659–660).
6. Compose all CPUs; the environment then contains only the hardware scheduler. For a singleton active CPU, delay observations before private and shared operations until the next atomic or pull/push operation, then merge adjacent switch points. The resulting CPU-local model retains switch points only before atomic and pull/push operations; compose the refinement proofs to transfer local results to the multicore model (Lemmas 4 and 5, §3.4–§3.5, p. 660).

Inference: a proposed Verus encoding could represent ε as a response function over a ghost event log and impose an invariant on its returned events. A proof function can show that each Rust operation consumes only events allowed by the environment contract and preserves the relation between concrete memory and the abstract log. This is a proposed encoding, untested here; the paper's event semantics and scheduler fairness assumptions would also need explicit specifications.

Evidence. The paper reports machine-checked proofs of every refinement step in Figures 2 and 5 and states: “Each refinement step is implemented as a CompCert-style upward-forward simulation from one layer machine to another.” (§3.5, p. 660) The data-race argument is explicit: if a program is safe for all hardware schedulers on the local-copy machine, it is data-race free (§3.3, p. 659).

Limits. The model assumes synchronization discipline and abstracts environment behavior through invariants. The paper's sequential-consistency machine is not yet formalized for x86 TSO: “Nevertheless, more formalization work is needed to turn our proofs over sequential-consistent machines into those over the TSO machines [55].” (§2, p. 657) Inference: a Verus proof that models only sequential consistency would not justify a production x86 implementation without an additional memory-model argument.

## technique 3: local-copy machine enforces data-race freedom

What it is. Each CPU receives a logical local copy of every shared-memory block, with a validity bit. `pull` copies global memory into the local copy, marks the local copy valid, and invalidates the global copy; `push` copies local state back, marks the global copy valid, and invalidates the local copy. An invalid access makes the program go wrong. The paper states: “We make sure that every shared memory access is always performed on its valid local copy, thus systematically enforcing valid accesses to the shared memory.” (§3.3, p. 659)

When to use it. Inference: use this abstraction when direct reasoning about arbitrary interleavings is too difficult but synchronization ensures that only one participant can hold a valid copy at a time. It is a logical proof device, not a runtime lock implementation; the paper emphasizes that it introduces no performance overhead (§3.3, p. 659).

How to do it.

1. Maintain global shared blocks and one local copy plus validity bit per CPU (§3.3, p. 659).
2. After acquiring the protecting lock, logically `pull` the protected block; before releasing the lock, logically `push` it back. These operations require a valid source copy (§3.3, p. 659; Fig. 7, §4, p. 661).
3. Define invalid pulls, invalid pushes, and accesses to invalid local copies as error states (§3.3, p. 659).
4. Prove refinement from the hardware-scheduler model to this local-copy model (Lemma 2, §3.3, p. 659).
5. Prove that safety for every scheduler implies data-race freedom (§3.3, p. 659).

Inference: in Verus, model each protected object with a ghost permission or validity predicate and require the caller to hold it across a critical section. Use `requires` to demand ownership and `ensures` to return the permission after the operation. This is analogous to the paper's logical validity bit but is an encoding choice, not a statement from the paper.

## technique 4: fair environment proofs for starvation-free locks

What it is. The ticket lock uses an atomic fetch-and-increment ticket and a serving counter. A thread waits until its ticket equals the serving value, pulls protected memory, and later pushes and increments the serving counter. The pseudocode in Figure 7 has `t=▶FAI(&L[i].ticket);`, a loop waiting for `L[i].now==t`, then `pull`; release performs `push` and increments `now` (§4, p. 661).

When to use it. Inference: use this to prove that lock acquisition eventually succeeds as well as mutual exclusion. The environment must include a fairness bound: between two events from one thread, other threads generate at most m events, and a lock holder releases within k steps (§4, p. 661).

How to do it.

1. Prove unique tickets and mutual exclusion from atomic fetch-and-increment (§4, p. 661).
2. Require that an environment holding the lock does not reacquire it before release and releases within k steps (Invariant 1, §4, p. 661).
3. Let n bound the total number of threads, hence also those ahead of the current thread; let m bound other threads' events between consecutive events of one thread (§4, p. 661).
4. Conclude at most n×m×k loop iterations before `now` reaches the caller's ticket (Lemma 6, §4, p. 661).
5. Abstract the implementation to one atomic acquire event for higher layers, preserving the invariant for composed CPUs (§4, p. 662). MCS locks additionally require a progress proof for release, which may wait for an existing successor to join the linked list (§4, p. 662).

Inference: in Verus, a lock API would need an abstract queue/ticket state, a proof invariant for uniqueness and ownership, and a bounded-fairness assumption in the environment specification. A proposed port would have to prove the bounded loop arithmetic and state transitions and model or trust scheduler fairness and atomic instruction semantics; no Verus port was checked here.

The authors found a real bug: the initial loop used `while(▶L[i].now<t){}`, which fails when the ticket counter wraps from 2^32−1 to 0. They fixed it to `while(▶L[i].now!=t){}` and proved that the maximum concurrent thread count is far below 2^32 (§5, p. 664).

## technique 5: layered resource, queue, and scheduler verification

The paper applies the same interfaces and event logs to physical allocation, virtual memory, shared queues, thread scheduling, and condition variables. Physical allocation protects the shared allocation table with a lock and refines the allocator into an atomic object; quotas bound each thread's pages and prevent memory-exhaustion denial-of-service (§4, p. 662). Virtual-memory proofs establish page-map invariants, including kernel-only permissions and isolation of private user memory (§4, p. 662). Shared queues replay enqueue/dequeue events to derive abstract list state (§4, p. 662). Thread scheduling separates per-CPU ready queues from shared pending and sleeping queues, with yield and sleep events and a software scheduler that reschedules a sleeping thread only after a wakeup event (§4, p. 663).

The FIFO bounded-buffer (FIFOBBQ) implementation uses condition-variable queues and fixes a textbook bug. The authors write: “We fixed this issue by postponing the removal of the CV of a waiting thread from the queue, until the waiting thread finishes its work (cf. Fig. 10); the remover is now responsible for removing itself from the rmvQ (line 24) and waking up the next element in the rmvQ (line 27).” (§4, p. 663) The remover removes itself and signals the next waiter, preventing all waiters and signalers from becoming stuck. Inference: a Verus port should model queue state as a ghost sequence, prove that every wait either remains queued or is signaled, and preserve the corrected remove-and-signal order.

## techniques for the catalog

- contextual-refinement layers — specify each module with an underlay, implementation, overlay, and machine-checked refinement proof
- environment-context concurrency — model inactive CPUs or threads as event-producing contexts with explicit invariants
- local-copy race reasoning — enforce synchronized shared access through logical pull/push validity states
- fair lock progress — prove mutual exclusion and bounded acquisition using ticket order and scheduler fairness
- event-log objects — replay atomic operation events to define abstract queues and shared state
- layered resource isolation — verify quotas, page-map invariants, and scheduler queues as compositional abstract objects
- FIFO bounded-buffer synchronization — retain a waiting thread’s condition variable until its work finishes, then remove it and signal the next waiter
