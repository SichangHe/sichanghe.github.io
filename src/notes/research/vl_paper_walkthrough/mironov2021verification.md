# Verification of MPI programs
(authored by agents unless marked 🧑)
Tag: `mironov2021verification`, [paper](http://arxiv.org/abs/2110.08537v1)

## result and scope
Mironov introduces a mathematical model for MPI programs that can generate any number of processes, then verifies a matrix-multiplication example. The model turns each process into a sequential transition graph with FIFO channel contents and composes all ranks into a distributed process. Auxiliary ghost variables record outstanding tasks, completed products, and written output rows. Inductive invariants establish matrix correctness, absence of deadlock, and finite termination.

The paper also states, “In this paper, a new mathematical model of MPI programs is introduced.” (abstract, p. 1).

The abstract identifies the distinguishing goal: “The most essential feature of the approach to modeling and verification of MPI programs presented in this paper is the possibility of using this approach for MPI programs that can generate any number of processes.” (p. 1). The demonstrated specification is C = AB for every output row (section 3.4, p. 6). The paper restricts the modeled MPI subset and does not present a mechanized implementation or performance measurements.

## technique 1: sequential-process and distributed-process model

what it is

A sequential process (SP) is a graph with an initial node, edge actions, input variables, and an initial condition. Actions are assignments, conditionals, sends, or receives, with at most one communication action per edge. A state binds variables to values and gives each channel a queue. A distributed process (DP) is the family of SPs, one for each rank, with shared input variables and rank-specific private state.

how to construct it

1. Define typed terms, variables, function symbols, values, tuples, queues, and bindings (sections 4.1–4.2, pp. 6–8).
2. Transform the MPI program into a graph. For rank i, replace `MPI_Comm_rank` with i, delete non-executable source, and convert control flow into edges whose labels are actions (section 4.4, p. 11).
3. Represent point-to-point send as `c_r !(e,i,l)` where e is the message, r the receiver, i the sender, and l the tag. Represent wildcard receive as `c_i ?(e,s,l)` and substitute the received source and tag for `MPI_SOURCE` and `MPI_TAG` (section 4.4, p. 11).
4. Represent broadcast with a distinguished channel: rank 0 sends on ◦ and other ranks receive on ◦. Apply the paper's graph-reduction operation where useful (section 4.4, p. 11).
5. Compose the family `{P_i | i ≥ 0}` into a DP. Add non-executing auxiliary assignments when dependencies need to be expressed; the resulting augmented SPs preserve executable behavior (section 4.4, p. 11).

For the matrix program, the manager process P0 contains task sends, result receives, and termination messages; each worker Pi receives a row, computes `Yi B`, and returns the tagged row (sections 5.1, pp. 12–13). The paper abstracts the initial broadcast of B as an initial assumption for every SP (section 5.1, p. 12).

Verus form (Inference)

Inference: encode each process state and message queue as a Verus specification datatype, with a `spec fn` transition relation and executable Rust operations implementing sends and receives. A state-machine proof can maintain queue and ownership invariants; process-rank quantification must be represented by finite collections or an explicit parameterized theorem. Verus does not directly model arbitrary MPI runtime behavior, so MPI calls need a verified abstraction and assumptions about matching, FIFO order, and broadcast.

limits

The model covers assignments, conditionals, loops, the listed send/receive functions, and service MPI functions (section 4.4, p. 11). It excludes synchronous message passing and leaves observational-equivalence specifications for future work (conclusion, p. 16). The DP is mathematical; the paper does not prove that a concrete MPI implementation refines it.

## technique 2: ghost sets and inductive invariants for matrix multiplication

what it is

The specification is ∀i=1,…,N: Ci = AiB. To prove it, the paper augments the model with α, β, and γ. α records worker channels with queued tasks; β records rows whose products are currently calculated; γ records rows already written to C. These variables do not affect execution.

how to apply it

1. Initialize α, β, and γ to empty sets (section 5.2, p. 13).
2. On a manager task send, add the worker/channel to α. On worker receive, add the row tag to β and remove the worker from α; on worker result send, remove the row tag from β. On manager result receive, add the row to γ (augmented SPs (9)–(10), pp. 13–14).
3. State an inductive invariant over every reachable state. Theorem 1 includes bounds on counters, queue cardinalities, disjointness, message shapes, `∀j ∈ γ: Cj = Aj B`, and the partition equation `[c1]s3 ⊔ … ⊔ [cn]s3 ⊔ βs ⊔ [c0]s3 ⊔ γs = {1,…,i−1}` (Theorem 1, pp. 14–15).
4. Prove the invariant initially and show every transition preserves it. The paper says, “All the statements are substantiated inductively: they are true in 0PΠ, and retain their truth after each transition” (Theorem 1 proof, p. 14).
5. At a terminal state, show k=N and γ contains every row; the invariant's row-correctness clause then yields C=AB (section 5.2, p. 15).

Verus form (Inference)

Inference: use a Verus state-machine invariant containing finite sets or sequences for outstanding rows and completed rows. Express disjointness and partition lemmas as proof functions; use `old` values only in executable-state transition postconditions where needed. Matrix multiplication can be specified with `spec fn` arithmetic and proved row by row. The ghost sets are proof state and should be erased, while queue contents and matrix writes remain executable.

what is proved

Theorem 1 is an inductive safety invariant for the mathematical DP. It proves each completed output row has the correct product and that bookkeeping sets partition all assigned rows. The proof relies on disjoint-set unions and the exact transition abstraction. No solver, runtime, or measured proof cost is reported.

## technique 3: deadlock-freedom proof by contradiction

what it is

Theorem 2 proves that no reachable DP state is a deadlock. The proof analyzes the only possible manager control locations and uses Theorem 1's queue and β facts to show some transition remains enabled.

how to apply it

1. Assume a reachable deadlock state s.
2. Use process-graph structure to show the manager is at location 1 or 4 and no worker is at its waiting-for-result location (Theorem 2 proof, p. 15).
3. If the manager is at 1, use `k<N` and the partition invariant to show either a worker channel is nonempty or β is nonempty. Each case implies an enabled worker or manager transition, contradicting deadlock.
4. If the manager is at 4, use k=N and the first state where k reached N to show the remaining control path executes termination transitions. Again a deadlock cannot occur (Theorem 2 proof, p. 15).

Verus form (Inference)

Inference: represent enabledness as a specification predicate over the state machine and prove `deadlock_state => false` by case lemmas. This requires fairness or scheduling assumptions only if proving eventual execution; the paper's theorem is structural existence of an enabled transition.

## technique 4: termination by ranking arguments

what it is

Theorem 3 proves every DP execution is finite. The proof uses bounded counters and channel queue measures rather than a single numeric ranking function.

how to apply it

1. Assume an infinite execution.
2. If manager transitions occur infinitely often, each task-dispatch transition increases k, but Theorem 1 bounds k by N; contradiction.
3. Otherwise, after some state no manager transitions occur. A worker receive-and-compute transition would then remove an item from its channel; infinitely many such transitions would decrease a finite queue indefinitely, contradiction (Theorem 3 proof, pp. 15–16).
4. Conclude every execution reaches a terminal state. Combine termination with Theorem 1 to obtain C=AB (section 5.2, p. 16).

Verus form (Inference)

Inference: choose a well-founded `decreases` measure combining remaining manager tasks and total queued messages, and prove each loop/transition decreases it under the relevant phase condition. If asynchronous scheduling is modeled, the measure must account for all enabled processes; Verus verifies the encoded model, not an MPI scheduler outside it.

## trusted boundary and product implication

The paper proves semantic properties of its abstract DP for the matrix program: row correctness, no deadlock, and finite termination. It gives no denominated empirical results, scalability measurements, or executable artifact. Trusted assumptions include the translation from C/MPI to SP graphs, channel semantics, matrix arithmetic, initial broadcast abstraction, and the soundness of the mathematical proof. Wildcard receives are modeled by source/tag variables, but implementation-level MPI buffering and progress guarantees are outside the model.

Inference: the approach is directly useful to VeruLaw for modeling message-passing protocols as verified state machines and for structuring ghost invariants. Its threat to agent-written verified Rust is low as an automation competitor: the paper supplies a proof pattern, not automatic proof synthesis. The main engineering risk is abstraction mismatch—an agent may prove the DP while the concrete MPI or Rust transport violates the assumed channel semantics.

## techniques for the catalog

- MPI-to-process-graph modeling — translate each rank into a sequential transition graph and compose an unbounded family into a distributed process
- ghost-set invariant proof — track queued tasks, active products, and completed output rows without changing execution
- deadlock contradiction — case-analyze control locations and use invariants to show an enabled transition exists
- termination by bounded measures — rule out infinite manager progress and infinite worker queue consumption

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
