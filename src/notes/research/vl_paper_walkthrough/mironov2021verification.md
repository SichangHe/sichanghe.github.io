# Verification of MPI programs
(authored by agents unless marked 🧑)
Tag: `mironov2021verification`, [paper](http://arxiv.org/abs/2110.08537v1)

## result and scope
Mironov introduces a mathematical model for MPI programs that can generate any number of processes, then verifies a matrix-multiplication example. The model turns each process into a sequential transition graph with FIFO channel contents and composes all ranks into a distributed process. Auxiliary ghost variables record outstanding tasks, completed products, and written output rows. An inductive invariant (Theorem 1) and two proofs by contradiction (Theorems 2 and 3) establish matrix correctness, absence of deadlock, and finite termination.

The abstract says, “A new mathematical model of parallel programs is introduced.” (abstract, p. 1), and the introduction says, “In this paper, a new mathematical model of MPI programs is introduced.” (section 1, p. 1).

The introduction identifies the distinguishing goal: “The most essential feature of the approach to modeling and verification of MPI programs presented in this paper is the possibility of using this approach for MPI programs that can generate any number of processes.” (section 1, p. 1). It contrasts this with ParTypes, which “does not work for wildcard receives”, and with symbolic-execution and model-checking approaches that “all of them require a bound on the number of processes.” (section 1, p. 1). The demonstrated specification is C = AB for every output row (section 3.4, p. 6). The paper restricts the modeled MPI subset and does not present a mechanized implementation or performance measurements.

## technique 1: sequential-process and distributed-process model

what it is

A sequential process (SP) is a graph with an initial node, edge actions, input variables, and an initial condition. Actions are assignments, conditionals, sends, or receives, with at most one communication action per edge. A state binds variables to values and gives each channel a queue. A distributed process (DP) is the family of SPs, one for each rank, with shared input variables and rank-specific private state.

how to construct it

1. Define typed terms, variables, function symbols, values, tuples, queues, and bindings (sections 4.1–4.2, pp. 6–8).
2. Transform the MPI program into a graph. For rank i, replace the second argument of `MPI_Comm_rank` by i, delete non-executable parts, and convert the program into graph form like a flowchart, except that actions label edges instead of nodes (section 4.4, p. 11).
3. Represent point-to-point send as `c_r !(e,i,l)` where e is the message, r the receiver, i the sender, and l the tag. Represent wildcard receive as `c_i ?(e,s,l)` and substitute the received source and tag for `MPI_SOURCE` and `MPI_TAG` (section 4.4, p. 11).
4. Represent broadcast with a distinguished channel: rank 0 sends on ◦ and other ranks receive on ◦. The paper's reduction operation (removing a node whose incoming or outgoing actions are all internal, section 4.2, p. 9) can be applied to the constructed graph (section 4.4, p. 11).
5. Compose the family `{P_i | i ≥ 0}` into a DP; a DP transition is one SP's action while all other SPs stay put (section 4.3, pp. 9–10; section 4.4, p. 10). Optionally add auxiliary assignments `ι := e`, which “are not actually performed actions” and only express dependencies between variable values; the resulting SPs are called augmented SPs (section 4.4, p. 11).

For the matrix program, the manager process P0 contains task sends, result receives, and termination messages; each worker Pi receives a row, computes `Yi B`, and returns the tagged row (sections 5.1, pp. 12–13). The paper abstracts the initial broadcast of B as an initial assumption for every SP (section 5.1, p. 12).

Verus form (Inference)

Inference: encode each process state and message queue as a Verus specification datatype, with a `spec fn` transition relation and executable Rust operations implementing sends and receives. A state-machine proof can maintain queue and ownership invariants; process-rank quantification must be represented by finite collections or an explicit parameterized theorem. Verus does not directly model arbitrary MPI runtime behavior, so MPI calls need a verified abstraction and assumptions about matching, FIFO order, and broadcast.

limits

The model covers only programs with assignments, conditional transitions, loops, the send/receive functions of section 2.2, and service MPI functions such as `MPI_Init` (section 4.4, p. 10). The conclusion lists modeling synchronous message passing and a specification language based on observational equivalence as future work (section 6, p. 16). Inference: the DP is a mathematical object; the paper contains no proof that a concrete MPI implementation refines it.

## technique 2: ghost sets and inductive invariants for matrix multiplication

what it is

The specification is ∀i=1,…,N: Ci = AiB. To prove it, the paper augments the model with α, β, and γ. α records worker channels with queued tasks; β records rows whose products are currently calculated; γ records rows already written to C. These variables do not affect execution.

how to apply it

1. Initialize α, β, and γ to empty sets (section 5.2, p. 13).
2. On a manager task send, add the worker/channel to α. On worker receive, add the row tag to β and remove the worker from α; on worker result send, remove the row tag from β. On manager result receive, add the row to γ (augmented SPs (9)–(10), pp. 13–14).
3. State an inductive invariant over every reachable state. Theorem 1 includes bounds on counters, queue cardinalities, disjointness, message shapes, `∀j ∈ γ: Cj = Aj B`, and the partition equation `[c1]s3 ⊔ … ⊔ [cn]s3 ⊔ βs ⊔ [c0]s3 ⊔ γs = {1,…,i−1}` (Theorem 1, p. 14). Theorem 1 is stated only for states with `at_P0 ≠ 3, 4`.
4. Prove the invariant initially and show every transition preserves it. The paper gives no case-by-case verification; its whole proof is one sentence: “All the statements are substantiated inductively: they are true in 0PΠ, and retain their truth after each transition” (Theorem 1 proof, p. 14); the sentence continues “s → s′ of PΠ, where atsP0 ≠ 3, 4”.
5. At a terminal state, `at_P0 = 4` gives |γ| = k = N; statements 11 and 12 of Theorem 1 then give the specification (end of section 5.2, p. 15). Inference: the paper applies statements 11 and 12 at a state with `at_P0 = 4`, although Theorem 1 is stated only for `at_P0 ≠ 3, 4`; the paper does not explain this step.

Verus form (Inference)

Inference: use a Verus state-machine invariant containing finite sets or sequences for outstanding rows and completed rows. Express disjointness and partition lemmas as proof functions; use `old` values only in executable-state transition postconditions where needed. Matrix multiplication can be specified with `spec fn` arithmetic and proved row by row. The ghost sets are proof state and should be erased, while queue contents and matrix writes remain executable.

what is proved

Theorem 1 is an inductive safety invariant for the mathematical DP. It proves each completed output row has the correct product and that bookkeeping sets partition all assigned rows. The paper says the ⊔ operations in (9) and (10) express that their arguments are actually disjoint sets (following from Theorem 1, p. 14). No solver, runtime, or measured proof cost is reported.

## technique 3: deadlock-freedom proof by contradiction

what it is

Theorem 2 proves that no reachable DP state is a deadlock. The proof narrows the manager's location to 1 or 4 and uses Theorem 1 (statements 4 and 8) to reach a contradiction in each case.

how to apply it

1. Assume a reachable deadlock state s.
2. The paper says it is “not hard to prove” that `at_P0 ∉ {0, 2, 3}` and that every worker has `at_Pi ≠ 1`, so `at_P0 ∈ {1, 4}` (Theorem 2 proof, p. 14).
3. If the manager is at 1, deadlock gives k < N and [c0] = ∅. Statement 4 gives k < i − 1, so statement 8 gives (11): the union of the worker channels and β is nonempty. If some [ci] is nonempty, worker i must be at location 2, which forces `at_P0 = 4`, possible only if k ≥ N, contradicting k < N. Otherwise all [ci] are empty, so β ≠ ∅, which is possible only if some worker is at location 2, which was excluded (Theorem 2 proof, pp. 14–15).
4. If the manager is at 4, then |γ| = k = N. Take the first state s′ on a path from the initial state with k = N. There `at_P0 = 2`, i − 1 = N, all channels and β are empty, and all workers are at location 0. The paper then follows the only transitions from s′ (via `[[i > N]]` and `[[k ≥ N]]`) and says it is “easy to see that all states in the tail of π starting from s′′′ are not deadlocks” (Theorem 2 proof, p. 15).

Verus form (Inference)

Inference: represent enabledness as a specification predicate over the state machine and prove `deadlock_state => false` by case lemmas. The paper's theorem concerns reachable states only; it states no fairness assumption.

## technique 4: termination by ranking arguments

what it is

Theorem 3 proves every DP execution is finite. Inference: the proof uses a bounded counter and channel queue lengths rather than a single numeric ranking function.

how to apply it

1. Assume an infinite execution.
2. If manager transitions occur infinitely often, the manager never reaches location 3 and from some state alternates between edges 1→2 and 2→1. Infinitely many 1→2 transitions (result receives) each increase k, but Theorem 1 statement 3 bounds k by N; contradiction.
3. Otherwise, from some state s′ no manager transitions occur. Then some worker i performs infinitely many `0→1` transitions (receives). Since the manager sends nothing, |[ci]| cannot increase, so it would decrease infinitely often, which is impossible (Theorem 3 proof, p. 15).
4. The paper concludes each execution is finite and ends in a terminal state; from `at_P0 = 4` and Theorem 1 it derives the specification (end of section 5.2, p. 15).

Verus form (Inference)

Inference: choose a well-founded `decreases` measure combining remaining manager tasks and total queued messages, and prove each loop/transition decreases it under the relevant phase condition. If asynchronous scheduling is modeled, the measure must account for all enabled processes; Verus verifies the encoded model, not an MPI scheduler outside it.

## trusted boundary and product implication

The paper proves semantic properties of its abstract DP for the matrix program: row correctness, no deadlock, and finite termination. It gives no denominated empirical results, scalability measurements, or executable artifact. Inference: trusted assumptions include the translation from C/MPI to SP graphs, channel semantics, matrix arithmetic, initial broadcast abstraction, and the soundness of the mathematical proof. Wildcard receives are modeled by source and tag variables (section 4.4, p. 11); Inference: implementation-level MPI buffering and progress guarantees are outside the model.

Inference: the approach is directly useful to VeruLaw for modeling message-passing protocols as verified state machines and for structuring ghost invariants. Its threat to agent-written verified Rust is low as an automation competitor: the paper supplies a proof pattern, not automatic proof synthesis. The main engineering risk is abstraction mismatch—an agent may prove the DP while the concrete MPI or Rust transport violates the assumed channel semantics.

## techniques for the catalog

- MPI-to-process-graph modeling — translate each rank into a sequential transition graph and compose an unbounded family into a distributed process
- ghost-set invariant proof — track queued tasks, active products, and completed output rows without changing execution
- deadlock contradiction — case-analyze control locations and use invariants to show an enabled transition exists
- termination by bounded measures — rule out infinite manager progress and infinite worker queue consumption

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A SP is a formal description of a behavior of a dynamic system, a work of which is a sequential execution of actions."): I read the whole paper text (all 16 pages) and the whole study; checked the quotations, page and section references, the construction steps of the model (section 4.4), the augmented SPs (9)-(10), Theorem 1 and the proofs of Theorems 1-3. Changed: the first quote was attributed to the abstract but is from the introduction (the abstract has different wording); the second quote is also from the introduction; Theorem 1 and Theorem 2 page numbers; the worker-location claim and the case analysis in the deadlock proof, which did not match the paper; the termination step wrongly called k-increasing transitions task dispatches (they are result receives); the paper's one-sentence proof of Theorem 1 and the applicability condition `at_P0 ≠ 3, 4` were added; unsupported claims were removed or marked Inference. Not checked: the full induction behind Theorem 1 (the paper gives none), the figures only through pdftotext text (the graph layout of SP (8) was not re-read in the PDF), the Verus-form sketches (my own inference), the cited external works, and the link, which is the arXiv identifier printed in the paper text.
