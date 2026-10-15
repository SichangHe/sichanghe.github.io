# Functional Reasoning for Distributed Systems with Failures
(authored by agents unless marked 🧑)
Tag: `ni2025functional`, [paper](https://doi.org/10.1145/nnnnnnn.nnnnnnn)

## scope and result
Ni, van Renesse, and Morrisett design twin languages, Sync and Async, to make distributed-system proofs compositional. Sync is a choreographic, synchronous data-parallel language with functional denotational semantics; Async is an interleaving operational language for executable nodes and channels. The abstract states: “We prove that any safety property proven for a Sync program in its denotational semantics is preserved in the operational semantics of its compiled Async programs.” (Abstract, PDF p. 1). The Rocq implementation verifies BOSCO Byzantine consensus and Sequential Paxos crash consensus.

## technique: restrict a high-level language so functional proofs compose
Sync programs consist of role-local expressions, `ret`, sequencing, and ordered `comm` actions. A `comm c em ed ef` sends one message per sender and folds received messages with a default and handler. The paper explains: “A Sync program describes an abstract distributed protocol as a high-level functional program that runs the same code for each node in a given role, albeit on different input values.” (§2.1, PDF p. 4). Role-indexed vectors and parametric higher-order abstract syntax prevent a node from reading another node's local value.

Apply it as follows: (1) identify roles and node counts; (2) give each role a vector of inputs; (3) write a total sequence of communication rounds with unique channels; (4) express each receiver's aggregation as a pure fold; (5) return role-local values; (6) prove safety over the set of possible output vectors. The language forbids branches and loops, cryptographic primitives, and unordered communication (§2, PDF p. 3). Those restrictions are assumptions, not implementation details.

Inference: Verus can encode the same discipline with ghost role-indexed sequences, pure `spec fn` folds, and proof lemmas over communication rounds. Rust `struct`s and `Seq` can represent distributed values; executable networking remains outside the denotational model. Verus does not provide Sync's compiler or choreography type system, so these restrictions need library conventions or a front-end.

## technique: prove safety by local functional decomposition
The SimpleVote example sends replica booleans to a leader, counts values equal to the leader input, and returns `Some p` when the count reaches `n − 2f`. The paper's informal proof has three steps: at least `n − 2f` correct values are received, the fold therefore gives a count at least `n − 2f`, and `calc_dec` returns `Some b` (§1, PDF pp. 2–3). This avoids a global invariant over every asynchronous interleaving.

To use the pattern, prove a lemma for each pure helper (`fcnteq`, `calc_dec`), then a communication lemma that bounds the received correct messages despite Byzantine messages, and finally compose them through the program's `let` structure. Inference: in Verus, state each helper as a `spec fn`; prove arithmetic and sequence-count lemmas with `assert`, `reveal`, and auxiliary proof functions; place the end-to-end result in an `ensures` clause on an executable wrapper. The Byzantine-network bound remains a model assumption that must be stated in `requires`.

## technique: compile Sync to Async and prove adequacy once
Async models each node as a monadic program and each channel as a state machine. Compilation projects a Sync choreography onto node programs and channel handlers. The central theorem is inclusion of behaviors: every completed Async trace output belongs to Sync's denotational output set. The authors state: “This guarantees that any safety properties proven in the Sync semantics also hold for the compilation result in the Async semantics.” (§1, PDF p. 3).

The proof is staged: show compiled traces respect the global channel order (Lemma 5.3); align traces by channel; define a big-step semantics for Sync communications; prove Async traces correspond to big-step reductions; prove big-step outputs are included in denotational semantics (Theorem 5.1 and §5.2, PDF pp. 21–24). Finished channels record sent and received messages, allowing extraction of a valid Sync fold; channels can then be erased from the Async state without changing outputs (§5.2.2, PDF p. 24).

Inference: a Verus implementation can use an abstract state machine for the Sync semantics and prove each generated node operation refines one abstract transition. Use ghost state for channel histories and proof lemmas for alignment and erasure. Verus can check the refinement relation, but it will not generate endpoint code automatically.

## technique: unify crash and Byzantine faults with a network abstraction
The `Netwk` abstraction gives each receiver a nondeterministic set/list of messages satisfying the allowed network behavior; Byzantine senders may send arbitrary values while crash failures simply omit sends. Async transitions interleave node and channel actions, and safety is proved for all traces satisfying the assumptions (§4, PDF pp. 14–20). The authors explicitly state that Sync cannot model cryptographic primitives (§2, PDF p. 3), so signature-based Byzantine reasoning is outside the demonstrated method.

Inference: a Verus model should expose fault behavior as a ghost `spec fn` or state-machine transition relation and quantify over all permitted message multisets. Do not encode “Byzantine” as trusted executable code; make the adversary assumptions explicit in preconditions and the refinement theorem.

## evidence, trusted base, and limits
The Rocq development verifies two protocols, BOSCO and Sequential Paxos, and reports that precise reasoning uncovered optimizations missed in the original protocols (Abstract and §1, PDF pp. 1–3). The proof trusts Rocq's kernel, the Sync/Async definitions, endpoint projection, the network and fault assumptions, and the extraction/runtime interface. It proves safety preservation, not liveness, performance, cryptographic security, or correctness of arbitrary distributed programs. Restrictions to communication-closed, ordered protocols exclude many real systems (§2, PDF p. 3).

Inference: threat to agent-written verified Rust is high for protocol architecture and medium for direct code reuse. The once-and-for-all adequacy theorem could reduce repeated proof effort, but building a faithful Async runtime model and proving endpoint refinement is substantial. VL should reuse the paper's staged semantics and fault assumptions; it should not redo informal Hoare arguments without a correspondence theorem.

## techniques for the catalog

- restricted choreographic language: describe each role's pure computation and ordered communication in Sync
- functional safety decomposition: prove helper-function and message-count lemmas, then compose them by program syntax
- twin-language adequacy: compile Sync to interleaved Async and prove every Async output is in Sync's denotation
- channel alignment and erasure: reorder traces by communication rounds, extract folds, and remove finished channels
- unified fault network: model crashes and Byzantine sends as nondeterministic network behaviors under explicit assumptions
Checked 2026-10-15 against paper ni2025functional: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
