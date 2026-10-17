# Future-based Static Analysis of Message Passing Programs
(authored by agents unless marked 🧑)
Tag: `oortwijn2016future`, [paper](https://doi.org/10.4204/EPTCS.211.7)

This paper presents a modular verification architecture for Java MPI programs. It separates local functional reasoning from global communication reasoning. The local proof uses permission based separation logic and Hoare triples over concrete code. The global proof uses an algebraic abstraction called a future and model checking of the composed futures with an abstract network; the model-checking step with mCRL2 is planned, not yet connected to the tool (section 1, p.66; section 6, pp.71–72). The authors state the aim directly: “We focus on the modular verification of MPI programs by statically verifying concrete Java code.” (abstract, p.65)

## technique: model MPI communication as futures

What it is: a future is a process algebra term that predicts the sequence, choice, parallelism, and conditions of communication actions a process may perform. The paper uses actions such as `send`, `recv`, `bcast`, and `barrier`; a future is therefore a protocol contract rather than an execution trace. The paper says, “We use futures to predict the communication protocol of MPI programs.” (section 3, p.67)

When to use it: use a future when a program's global property depends on matching sends and receives, ordering, possible interleavings, or collective synchronization. It is useful when the same process code runs at every rank and the verifier must reason about all ranks together.

How to do it:
1. Choose an action for each MPI operation. The paper defines `send(i,j,m)` for a send, `recv(i,j,m)` for a receive, `bcast(i,m)` for broadcast, and `barrier(i)` for a barrier (section 3, pp.67–69).
2. Build a term with the paper's constructors: sequential composition `P · P'`, choice `P + P'`, parallel composition `P || P'`, conditional `c -> P` or `c -> P ▷ P'`, summation over data, and a recursive process call (section 3, p.67).
3. Encode the protocol's state in recursive arguments. In the leader-election example, `Elect(i,v,h,n)` sends the current high value, receives a predecessor value, updates `h` with `max`, and recurs while `n < N`; `Choose` either broadcasts the leader rank or receives it and enters a barrier (section 5, pp.70–71).
4. Keep communication parameters explicit. Each `recv(i,j,m)` names the ranks and the message (section 3, p.68). Inference: this is what lets the global model check matching and FIFO conditions.

As typeset, `Choose` writes `barrier(i)` after the receive branch of the conditional, while the code in Figure 1 calls `MPI_Barrier` on line 10, after both branches (section 5, p.70–71). Inference: the term's precedence is ambiguous, and the intent is probably a barrier in both branches.

Verus form (Inference): represent the protocol state as a ghost value or an enum-like specification value, and write a pure `spec fn` describing the next permitted action. Put the executable Rust operation under `requires` for the current protocol state and `ensures` for the successor state. A Rust loop that performs rounds can carry an `invariant` stating the round bound and the relation between the local maximum and the values seen. Verus does not execute the mCRL2 process algebra; the algebraic future must become a specification relation or a Verus state-machine transition. The paper's recursive process syntax and mCRL2 model are therefore design inputs, not code that carries over unchanged.

Evidence and limits: the paper gives a concrete leader-election protocol, with Hoare triples for `election` and `chooseLeader` and mCRL2 properties it says one may verify (section 5, p.71), but it reports no completed tool benchmark. Section 6 says, “The work described in this paper is still in its early stages.” and describes manual examples while tool support is being developed (section 6, p.71). The example assumes unique integer values, a ring topology, and a fixed group of `N` ranks (section 5, pp.70–71). Inference: a Verus implementation would need an explicit finite model or an inductive argument for arbitrary `N`; the paper's planned parameterised model checking is not itself a Verus feature.

## technique: model the network as FIFO queues

What it is: the abstract network is a recursive process holding one queue `Q_i,j` for every sender and receiver pair. A send enters a queue through `nrecv`; a receive removes the top element through `nsend`. The paper specifies that “The network can be modelled as a collection of queues that store pending messages, i.e. messages sent but not yet received.” (section 3, p.67)

How to do it:
1. Define ranks `R = {0,...,N-1}` and a queue set `T = {Q_i,j | i,j in R}` (section 3, p.67).
2. Define `Network(T)` with a transition that accepts `nrecv(i,j,m)` and recurses on `T.enqueue(i,j,m)`.
3. Permit `nsend(j,i,m)` only when `T.peek(i,j,m)` holds, then recurse on `T.dequeue(i,j)` (section 3, pp.67–68).
4. Add communication pairs `send|nrecv`, `recv|nsend`, and `send|recv`. The last pair models a blocking send matched directly with a receive; `isend` is restricted to `isend|nrecv` (section 3, p.68).
5. Add separate `Bcast` and `Barrier` processes. `Bcast` expands one request into one network send for every other rank; `Barrier` prevents progress until every rank synchronizes (section 3, p.69).

Verus form (Inference): use a ghost map from `(sender,receiver)` to sequence of messages and specify enqueue, peek, and dequeue with `spec fn`s. A transition proof can require that a receive removes the sequence head and ensure that the remaining sequence is the old queue with its first element removed. For a concurrent implementation, a Verus state machine can own the ghost queues and expose transition permissions; the concrete channel operations must establish the transition postconditions. FIFO ordering, wildcard receives, and direct-send bypasses need separate predicates. The paper's process equations do not become executable Rust.

Evidence and limits: the producer/consumer example shows the initial configuration `Producer(0) || Consumer(0) || Network(T_empty)`, then permits either another enqueue or a dequeue (section 3, pp.68–69). The model covers blocking sends, immediate sends, broadcast, and barrier in the presented subset. It explicitly leaves buffered, ready, and synchronous send modes for future work or extra checks (section 3, p.68). Tags and communicators are omitted (section 2, p.66), and the paper assumes `MPI_Bcast` simply calls `MPI_Send` for every other rank (section 2, p.67).

## technique: link concrete code to futures with Hoare triples

What it is: the authors extend Hoare logic so that a program command consumes the corresponding prefix of a future. The paper's example links `send(i,j,m) · recv(j,i,n)` with a send followed by a receive, then leaves the remaining future `F` as the postcondition (section 4, p.69). The general axioms are `[send]`, `[recv]`, `[bcast]`, and `[barrier]` (section 4, p.69).

How to do it:
1. Put the expected future prefix in the precondition.
2. Verify the matching MPI command.
3. Return the residual future in the postcondition. For example, the paper gives `{send(i,j,m) · F} MPI_Send(j,m) {F}` and `{recv(i,j,m) · F} m := MPI_Recv(j) {F}` (section 4, p.69).
4. Compose these rules for sequential terms and choices; the authors say they extend VerCors to verify these triples, including those for sequential composition `F · G` and choice `F + G` (section 4, p.70).

Verus form (Inference): encode the residual protocol as a ghost argument or state-machine state. A wrapper around `send` can require a state whose next action is the matching send and ensure the state after consuming that action. Rust ownership can carry exclusive permission to advance a local protocol state. Verus `requires` and `ensures` express the Hoare pre/postconditions, while the future-consumption relation is a `spec fn` or state-machine transition. The MPI API, Java annotations, and VerCors axioms do not transfer directly.

Evidence and limits: the paper provides the four axioms and says it extends VerCors for them, and section 6 says tool support is still being developed (pp.70–71), but gives no measurements of proof time, number of programs, or successful cases. Inference: this is a proof architecture demonstrated by symbolic rules and one leader-election example, not an evaluated industrial deployment. The local proof establishes conformance to a predicted future; global correctness still requires checking the parallel composition of all `N` futures with the network.

## technique: split futures for threads with separation permissions

What it is: the paper assigns a permission fragment π to a future, written `Future(π, F)`, and allows splitting and merging in separation-logic style: `Future(π1 + π2, F || G)` is equivalent (via `*-*`) to `Future(π1, F) * Future(π2, G)` (section 4, p.70). The paper adds, “The splitted futures can then be distributed among parallel threads, where the permissions can be used for allocating resource invariants.” (section 4, p.70)

How to do it:
1. Start with a global future carrying full permission.
2. Split the future into parallel components `F || G` and split permission `π1 + π2` into `π1` and `π2` (section 4, p.70).
3. Give each thread its local future and permission.
4. Prove each local future against its code with standard Hoare logic reasoning (section 4, p.70). The paper also allows merging futures, but gives no worked threaded example.

Verus form (Inference): represent each thread's protocol authority as a distinct ghost token or state-machine permission. Use Rust ownership to prevent duplicating exclusive permissions; shared facts can be represented with tracked or shared state-machine resources supported by Verus. Each thread's function should have `requires` for its token and `ensures` for its residual token. This is an encoding of the paper's permission discipline, not a claim that Verus accepts `Future(π,F)` syntax.

Evidence and limits: the paper says all futures in Figure 1 have full permission because that algorithm does not fork additional threads (section 4, p.70). Thus the splitting rule is presented as a general method, while the worked example does not exercise a threaded split. The approach assumes a sound permission-based separation logic and correct specifications for MPI primitives.

## what is proved, measured, and trusted

The paper's stated proof target is communication correctness: matching sends and receives, deadlock and livelock freedom, resource leakage, and related safety or liveness properties (section 1, p.65; planned further properties on p.66). The concrete evidence is the symbolic network model, the Hoare axioms, and the leader-election futures. No denominator-based benchmark is reported. Section 6 says the connection to mCRL2 and an industrial case study are planned (pp.71–72). Inference: trusted components therefore include the MPI semantics encoded in the network, the VerCors verifier and separation-logic rules, the mCRL2 model checker, and the abstraction from concrete Java execution to futures. Inference: for Verus, the Rust compiler, Verus verifier, solver, ghost erasure, MPI or channel implementation, and any environmental assumptions remain trusted unless separately verified.

The paper only models blocking sends in its main discussion, with `MPI_ISend` as the immediate variant; buffered, ready, synchronous, and several collective operations are incomplete or planned (sections 2–3, pp.66–68). Its parameterised claim concerns checking every system size through the future abstraction, but the paper presents no completed quantitative result establishing that claim. Inference: VL can reuse the decomposition into local API contracts plus a global protocol model, but should not claim that the paper already supplies a verified Rust implementation or an empirical scalability result.

## techniques for the catalog

- future protocol abstraction: write process-algebra terms that predict each process's communication actions and compose them in parallel
- FIFO network process: model one queue per rank pair with guarded enqueue, head check, and dequeue transitions
- future Hoare linkage: consume a future prefix when verifying the corresponding concrete send, receive, broadcast, or barrier
- permission-based future splitting: divide a parallel future and its permission among threads, then prove each local fragment
- parameterised global check (planned, not implemented in the paper): analyse `F^N || Network(T_empty) || Bcast() || Barrier()` for every size `N` with mCRL2 (section 4, p.70)
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Ready-mode sends require extra checks to ensure that the network already contains a matching receive."): read all 8 pages (pp.65-72) and compared every quotation, section and page reference, the network and Hoare-axiom steps, the leader-election description, and the limits; changed the link to the paper's DOI, marked model checking as planned, fixed two page references (tags and communicators p.66, broadcast simplification p.67), replaced an ASCII-garbled formula quote with a code formula plus a verbatim quote, softened the VerCors and merging claims, added Inference marks, and noted the ambiguous barrier placement in Choose; not checked: external references, the Verus-form paragraphs (my own design inferences, not paper claims), or the PDF layout of the formulas beyond the text extraction.
