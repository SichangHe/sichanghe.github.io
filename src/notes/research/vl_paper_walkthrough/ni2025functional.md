# Functional Reasoning for Distributed Systems with Failures
(authored by agents unless marked 🧑)
Tag: `ni2025functional`, [paper](https://arxiv.org/abs/2510.12131)

## scope and result
Ni, van Renesse, and Morrisett design twin languages, Sync and Async, to make distributed-system proofs compositional. Sync is a choreographic, synchronous data-parallel language with functional denotational semantics; Async is an interleaving operational language for executable nodes and channels. The abstract states: “We prove that any safety property proven for a Sync program in its denotational semantics is preserved in the operational semantics of its compiled Async programs.” (Abstract, PDF p. 1). The Rocq implementation verifies BOSCO Byzantine consensus and Sequential Paxos crash consensus.

## technique: restrict a high-level language so functional proofs compose
Sync programs consist of role-local expressions, `ret`, sequencing, and ordered `comm` actions. A `comm c em ed ef` sends one message per sender and folds received messages with a default and handler. The paper explains: “A Sync program describes an abstract distributed protocol as a high-level functional program that runs the same code for each node in a given role, albeit on different input values.” (§2.1, PDF p. 4). Role-indexed vectors and parametric higher-order abstract syntax prevent a node from reading another node's local value.

Inference: apply it as follows: (1) identify roles, node counts, and fault bounds; (2) give each role a vector of inputs for its non-Byzantine nodes; (3) write a total sequence of communication rounds with unique channels; (4) express each receiver's aggregation as a pure fold; (5) return role-local values; (6) prove safety over the set of possible output vectors. Sync has no protocol-level branches or loops, except a meta-level loop over the whole program; local pure helpers can branch. It cannot model cryptographic primitives and requires a total order on communication actions (§2, PDF p. 3; §2.1, PDF p. 4). For safety of repeated protocols, §3.1 uses finite loop unwindings with fresh channels; its notation `b^0 = b` means `b^k` executes `k + 1` iterations (PDF pp. 9, 11).

Inference: Verus can encode the same discipline with ghost role-indexed sequences, pure `spec fn` folds, and proof lemmas over communication rounds. Rust `struct`s and `Seq` can represent distributed values; executable networking remains outside the denotational model. Verus does not provide Sync's compiler or choreography type system, so these restrictions need library conventions or a front-end.

## technique: prove safety by local functional decomposition
The SimpleVote example sends replica booleans to a non-faulty leader, waits for at least `n − f` messages, counts values equal to the leader input, and returns `Some p` when the count reaches `n − 2f`. Here `n` counts replicas, with at most `f` Byzantine replicas. The stated safety property assumes `n > 3f` and that the leader and all correct replicas have the same input `b`. The paper's informal proof has three steps: at least `n − 2f` received values are from correct replicas and equal `b`, the fold therefore gives a count at least `n − 2f`, and `calc_dec` returns `Some b` (§1, PDF p. 2).

Inference: to use the pattern, prove a lemma for each pure helper (`fcnteq`, `calc_dec`), a communication lemma bounding received correct messages despite Byzantine messages, and compose them through the program's `let` structure. A Verus adaptation could use pure specifications and sequence-count lemmas. Connecting that model to executable networking would require a separate correspondence proof.

## technique: compile Sync to Async and prove adequacy once
Async models each non-Byzantine node as a monadic program and each single-use channel as a state machine. Compilation projects a Sync choreography onto node programs and composes them with channel transition systems. Theorem 5.1 establishes output-set inclusion: every completed Async trace output belongs to Sync's denotational output set (§5, PDF p. 21). A state is completed when all non-Byzantine node programs have returned (§4.4, PDF p. 20). The authors state: “This guarantees that any safety properties proven in the Sync semantics also hold for the compilation result in the Async semantics.” (§1, PDF p. 3).

The proof is staged: show each compiled node's local traces respect the channel order (Lemma 5.3); group global trace actions by channel while preserving each local projection and the final state (Theorem 5.2); define a big-step semantics for Sync communications; prove completed, aligned Async traces yield big-step outputs; prove big-step outputs are included in denotational semantics (§5, PDF pp. 21–24). Global Async traces can interleave actions on different channels before alignment. A channel is finished when all non-Byzantine senders and receivers have acted. Extra bookkeeping records sent and received messages, allowing extraction of a valid big-step label; finished channels can then be erased without changing node outputs (§5.2.2, PDF pp. 23–24).

Inference: a Verus adaptation could use ghost channel histories and lemmas for trace alignment, completed outputs, and channel erasure. A proof relating its node execution model to the functional output sets would be needed; the paper does not establish this for Rust or Verus.

## technique: unify crash and Byzantine faults with a network abstraction
The `Netwk` relation adds up to `b` arbitrary Byzantine values to the non-Byzantine senders' values, permutes them, and takes any prefix of length at least `n − f`, where `b ≤ f` (§2.3.2, PDF pp. 6–7). Each receiver may obtain a different list. Crash behavior is covered by message omission in this abstraction rather than an explicit crash transition; §3.3 explains this for finite SeqPaxos iterations (PDF p. 13). Async separates Byzantine sends from permutation and truncation (§4.3, PDF pp. 17–19).

The network assumptions include authenticated messages, suppression of duplicates, well-typed payloads, at most one accepted message per sender per channel, and eventual delivery between correct nodes. The authors write: “In our case, we do not model parsing nor verify its correctness.” (§4.1, PDF p. 15). Signatures may implement authentication, but their cryptographic behavior is not modeled (§§2, 4.1, PDF pp. 3, 15).

Inference: a Verus model could expose fault behavior as a ghost specification or transition relation and quantify over permitted message lists. Preserve ordering if the receiver's fold depends on it, and state the network assumptions in the correspondence theorem.

## evidence, trusted base, and limits
The Rocq development reports about 2.5k lines, including language definitions, proofs, and case studies (§3, PDF p. 8). Binary Bosco has strongly one-step behavior for `n > 7f` when all correct inputs agree, and agreement for `n > 3f` (§3.2, PDF p. 10). SeqPaxos agreement requires `n > 2f` replicas and allows the single leader to crash (§3.3, PDF pp. 12–13). The Bosco proof identifies an asymmetric decision-threshold optimization (§3.2, PDF p. 11); the SeqPaxos proof permits compositional verification of weaker decision conditions and points to an existing Paxos optimization (§3.3, PDF p. 13).

The result depends on the language definitions and the network and fault assumptions; endpoint projection is covered by the adequacy proof. The paper discusses extraction to executable code but does not establish parser or concrete runtime correctness, liveness, performance, or cryptographic security. The authors state: “Since we only consider safety properties, it is sufficient to consider the finite unwindings of the loop.” (§3.1, PDF p. 9). Sync's ordered communication restricts it to communication-closed programs (§2, PDF p. 3).

## techniques for the catalog

- restricted choreographic language: describe each role's pure computation and ordered communication in Sync
- functional safety decomposition: prove helper-function and message-count lemmas, then compose them by program syntax
- twin-language adequacy: compile Sync to interleaved Async and prove every Async output is in Sync's denotation
- channel alignment and erasure: reorder traces by communication rounds, extract folds, and remove finished channels
- unified fault network: model crashes and Byzantine sends as nondeterministic network behaviors under explicit assumptions
