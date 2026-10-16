# Future-based Static Analysis of Message Passing Programs
(authored by agents unless marked 🧑)
Tag: `oortwijn2016future`, [paper](http://arxiv.org/abs/1606.05942v1)

This paper presents a modular verification architecture for Java MPI programs. It separates local functional reasoning from global communication reasoning. The local proof uses permission based separation logic and Hoare triples over concrete code. The global proof uses an algebraic abstraction called a future and model checking of the composed futures with an abstract network. The authors state the aim directly: “We focus on the modular verification of MPI programs by statically verifying concrete Java code.” (abstract, p.65)

## technique: model MPI communication as futures

What it is: a future is a process algebra term that predicts the sequence, choice, parallelism, and conditions of communication actions a process may perform. The paper uses actions such as `send`, `recv`, `bcast`, and `barrier`; a future is therefore a protocol contract rather than an execution trace. The paper says, “We use futures to predict the communication protocol of MPI programs.” (section 3, p.67)

When to use it: use a future when a program's global property depends on matching sends and receives, ordering, possible interleavings, or collective synchronization. It is useful when the same process code runs at every rank and the verifier must reason about all ranks together.

How to do it:
1. Choose an action for each MPI operation. The paper defines `send(i,j,m)` for a send, `recv(i,j,m)` for a receive, `bcast(i,m)` for broadcast, and `barrier(i)` for a barrier (section 3, pp.67–69).
2. Build a term with the paper's constructors: sequential composition `P · P'`, choice `P + P'`, parallel composition `P || P'`, conditional `c -> P` or `c -> P ▷ P'`, summation over data, and a recursive process call (section 3, p.67).
3. Encode the protocol's state in recursive arguments. In the leader-election example, `Elect(i,v,h,n)` sends the current high value, receives a predecessor value, updates `h` with `max`, and recurs while `n < N`; `Choose` either broadcasts the leader rank or receives it and enters a barrier (section 5, pp.70–71).
4. Keep communication parameters explicit. A receive carries the sender, receiver, and message, so the global model can check matching and FIFO conditions.

Verus form (Inference): represent the protocol state as a ghost value or an enum-like specification value, and write a pure `spec fn` describing the next permitted action. Put the executable Rust operation under `requires` for the current protocol state and `ensures` for the successor state. A Rust loop that performs rounds can carry an `invariant` stating the round bound and the relation between the local maximum and the values seen. Verus does not execute the mCRL2 process algebra; the algebraic future must become a specification relation or a Verus state-machine transition. The paper's recursive process syntax and mCRL2 model are therefore design inputs, not code that carries over unchanged.

Evidence and limits: the paper gives a concrete leader-election protocol and states that its futures and code can be checked together, but it reports no completed tool benchmark. Section 6 says the work is “still in its early stages” and describes manual examples while tool support is being developed (section 6, p.71). The example assumes unique integer values, a ring topology, and a fixed group of `N` ranks (section 5, pp.70–71). Inference: a Verus implementation would need an explicit finite model or an inductive argument for arbitrary `N`; the paper's planned parameterised model checking is not itself a Verus feature.

## technique: model the network as FIFO queues

What it is: the abstract network is a recursive process holding one queue `Q_i,j` for every sender and receiver pair. A send enters a queue through `nrecv`; a receive removes the top element through `nsend`. The paper specifies that “The network can be modelled as a collection of queues that store pending messages, i.e. messages sent but not yet received.” (section 3, p.67)

How to do it:
1. Define ranks `R = {0,...,N-1}` and a queue set `T = {Q_i,j | i,j in R}` (section 3, p.67).
2. Define `Network(T)` with a transition that accepts `nrecv(i,j,m)` and recurses on `T.enqueue(i,j,m)`.
3. Permit `nsend(j,i,m)` only when `T.peek(i,j,m)` holds, then recurse on `T.dequeue(i,j)` (section 3, pp.67–68).
4. Add communication pairs `send|nrecv`, `recv|nsend`, and `send|recv`. The last pair models a blocking send matched directly with a receive; `isend` is restricted to `isend|nrecv` (section 3, p.68).
5. Add separate `Bcast` and `Barrier` processes. `Bcast` expands one request into one network send for every other rank; `Barrier` prevents progress until every rank synchronizes (section 3, p.69).

Verus form (Inference): use a ghost map from `(sender,receiver)` to sequence of messages and specify enqueue, peek, and dequeue with `spec fn`s. A transition proof can require that a receive removes the sequence head and ensure that the remaining sequence is the old queue with its first element removed. For a concurrent implementation, a Verus state machine can own the ghost queues and expose transition permissions; the concrete channel operations must establish the transition postconditions. FIFO ordering, wildcard receives, and direct-send bypasses need separate predicates. The paper's process equations do not become executable Rust.

Evidence and limits: the producer/consumer example shows the initial configuration `Producer(0) || Consumer(0) || Network(T_empty)`, then permits either another enqueue or a dequeue (section 3, pp.68–69). The model covers blocking sends, immediate sends, broadcast, and barrier in the presented subset. It explicitly leaves buffered, ready, and synchronous send modes for future work or extra checks (section 3, p.68). Tags and communicators are omitted, and `Bcast` is simplified to a series of sends (section 2, p.66).

## technique: link concrete code to futures with Hoare triples

What it is: the authors extend Hoare logic so that a program command consumes the corresponding prefix of a future. The paper's example links `send(i,j,m) · recv(j,i,n)` with a send followed by a receive, then leaves the remaining future `F` as the postcondition (section 4, p.69). The general axioms are `[send]`, `[recv]`, `[bcast]`, and `[barrier]` (section 4, p.69).

How to do it:
1. Put the expected future prefix in the precondition.
2. Verify the matching MPI command.
3. Return the residual future in the postcondition. For example, the paper gives `{send(i,j,m) · F} MPI_Send(j,m) {F}` and `{recv(i,j,m) · F} m := MPI_Recv(j) {F}` (section 4, p.69).
4. Compose these rules for sequential terms and choices; the authors extend VerCors to handle that composition (section 4, p.70).

Verus form (Inference): encode the residual protocol as a ghost argument or state-machine state. A wrapper around `send` can require a state whose next action is the matching send and ensure the state after consuming that action. Rust ownership can carry exclusive permission to advance a local protocol state. Verus `requires` and `ensures` express the Hoare pre/postconditions, while the future-consumption relation is a `spec fn` or state-machine transition. The MPI API, Java annotations, and VerCors axioms do not transfer directly.

Evidence and limits: the paper provides the four axioms and reports that they are being implemented by extending VerCors, but gives no measurements of proof time, number of programs, or successful cases. Inference: this is a proof architecture demonstrated by symbolic rules and one leader-election example, not an evaluated industrial deployment. The local proof establishes conformance to a predicted future; global correctness still requires checking the parallel composition of all `N` futures with the network.

## technique: split futures for threads with separation permissions

What it is: when a process forks, its future is split in parallel with its permission. The paper writes the separation rule as “Future(π1 + π2, F || G) *-* Future(π1, F) * Future(π2, G).” (section 4, p.70) The fragments can be given to different threads while preserving resource ownership.

How to do it:
1. Start with a global future carrying full permission.
2. Split the future into parallel components `F || G` and split permission `π1 + π2` into `π1` and `π2` (section 4, p.70).
3. Give each thread its local future and permission.
4. Prove each thread's code with ordinary Hoare reasoning and rejoin the residual futures when the threads synchronize.

Verus form (Inference): represent each thread's protocol authority as a distinct ghost token or state-machine permission. Use Rust ownership to prevent duplicating exclusive permissions; shared facts can be represented with tracked or shared state-machine resources supported by Verus. Each thread's function should have `requires` for its token and `ensures` for its residual token. This is an encoding of the paper's permission discipline, not a claim that Verus accepts `Future(π,F)` syntax.

Evidence and limits: the paper says all futures in Figure 1 have full permission because that algorithm does not fork additional threads (section 4, p.70). Thus the splitting rule is presented as a general method, while the worked example does not exercise a threaded split. The approach assumes a sound permission-based separation logic and correct specifications for MPI primitives.

## what is proved, measured, and trusted

The paper's stated proof target is communication correctness: matching sends and receives, deadlock and livelock freedom, resource leakage, and related safety or liveness properties (sections 1–2, pp.65–66). The concrete evidence is the symbolic network model, the Hoare axioms, and the leader-election futures. No denominator-based benchmark is reported. Section 6 says the tool connection to mCRL2 and industrial case study were future work. Trusted components therefore include the MPI semantics encoded in the network, the VerCors verifier and separation-logic rules, the mCRL2 model checker, and the abstraction from concrete Java execution to futures. Inference: for Verus, the Rust compiler, Verus verifier, solver, ghost erasure, MPI or channel implementation, and any environmental assumptions remain trusted unless separately verified.

The paper only models blocking sends in its main discussion, with `MPI_ISend` as the immediate variant; buffered, ready, synchronous, and several collective operations are incomplete or planned (sections 2–3, pp.66–68). Its parameterised claim concerns checking every system size through the future abstraction, but the paper presents no completed quantitative result establishing that claim. Inference: VL can reuse the decomposition into local API contracts plus a global protocol model, but should not claim that the paper already supplies a verified Rust implementation or an empirical scalability result.

## techniques for the catalog

- future protocol abstraction: write process-algebra terms that predict each process's communication actions and compose them in parallel
- FIFO network process: model one queue per rank pair with guarded enqueue, head check, and dequeue transitions
- future Hoare linkage: consume a future prefix when verifying the corresponding concrete send, receive, broadcast, or barrier
- permission-based future splitting: divide a parallel future and its permission among threads, then prove each local fragment
- parameterised global check: model `N` copies of a process with the network, broadcast, and barrier processes and check safety or liveness
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
