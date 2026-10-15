# PRDTs: Composable Design and Verification of Consensus Protocols using Replicated Data Types
(authored by agents unless marked 🧑)
Tag: `haas2025prdts`, [paper](http://arxiv.org/abs/2504.05173v3)

## scope and result

Haas, Mogk, Bieniusa, and Mezini propose Protocol Replicated Data Types (PRDTs), a programming model in which each process accumulates protocol knowledge in a join-semilattice. The paper's concrete claim is that local action monotonicity and stable preconditions are enough to establish consensus safety when the replicated state converges. It implements the proof obligations as Stainless laws for Scala and composes verified voting components into Paxos variants. The paper states, “We propose Protocol Replicated Data Types (PRDTs), a novel programming model for implementing consensus protocols using replicated data types (RDTs).” (Abstract, p. 1)

The model has three parts: a knowledge lattice and merge, guarded protocol actions, and a decision function (Section 2, pp. 3–6). A process adds a delta produced by an enabled action; communication merges deltas. A merge is idempotent, commutative, and associative, so duplicate and reordered messages converge. The voting example stores one value per process, permits `voteFor` only when that process has not voted, and decides when a majority exists (Figure 2, p. 4). “A PRDT consists of three components: (1) A knowledge lattice representing the protocol state, with each element representing a process’s current knowledge about the system. (2) A set of protocol actions with corresponding preconditions, which guard their execution. (3) A decision function that makes irrevocable decisions based on the current knowledge state.” (Section 2, p. 3)

An earlier walkthrough in the research notes already records the two-obligation reduction and the etcd comparison; the additional detail here is the step-by-step composition, validity check, and Verus translation.

## technique: reduce global consensus safety to two local obligations

What it is: prove (a) action monotonicity, that an enabled action cannot decrease the decision order, and (b) stability of every precondition, that a concurrent action by another process cannot disable it. Theorem 3.10 combines these with the lattice's strong eventual consistency (Sections 3.3.1–3.3.2, pp. 10–12). The paper says, “Ultimately, our verification method requires two conditions for every PRDT implementation: (1) action monotonicity and (2) stability of preconditions.” (Discussion after Theorem 3.10, p. 12)

How to apply it:

1. Define a partially ordered decision domain and a decision function from knowledge states (Definition 2.3, p. 6)
2. For each action and enabled state, prove `dec(s) ≤ dec(s ⊔ action(i))` (Definition 3.7, p. 10)
3. For every pair of distinct processes and concurrent actions, prove that an enabled precondition remains enabled after the other action is merged (Definition 3.8, p. 10)
4. Use strong eventual consistency to show that any two processes can reach a common state; transitivity then gives consensus safety (Theorem 3.6, p. 10)

The voting proof splits action monotonicity into two cases: from `Undecided`, every result is greater or equal; from `Decided(a)`, a majority for `a` cannot be replaced because each process votes once (Proposition 3.11, p. 12). Stability follows because only the local process identifier can add that process's vote. A precondition such as “there are no votes at all” would be unstable because another process can add a vote (Section 2.2, p. 5).

Verus form: Inference: represent the knowledge state as an executable Rust struct plus a mathematical `spec fn` for its join and decision order. Put action guards in `requires`, state growth and decision monotonicity in `ensures`, and prove the two obligations with `proof fn` lemmas. A concurrent protocol needs a Verus transition-system or state-machine encoding for ownership and merge; the paper's Scala `@law` annotations do not carry over. Use only the lattice algebra and the two proof obligations as the reusable interface; Stainless itself is not part of the trusted Verus proof.

Evidence and limits: the paper gives a manual voting proof and a Stainless `Consensus` trait with `@law` methods `monotonicity` and `stability` (Figure 6, p. 13). It reports that composite `ParallelVoting` can reuse the verified properties of `Voting`, and that Paxos reuses the same component proof (Section 3.5, p. 13). The paper also says, “in practice, however, automated verification often needs auxiliary lemmas and carefully placed assertions to guide the prover to a successful proof.” (Section 3.5, p. 13) Inference: a Verus implementation should expect helper lemmas and solver guidance, even though the interface reduces the conceptual proof burden. Safety does not prove termination: the authors explicitly place termination outside scope in Section 3.2.3 (p. 9). Validity is separately checked by tracking `happenedBefore` actions (Section 3.2.4, p. 9). Network delivery, storage, and the compiler remain assumptions of the implementation, not consequences of the two laws.

## technique: compose consensus components algebraically

What it is: use product, sum, map, set, epoch, list, and graph data types whose merge operations are derived from component merges (Sections 2.1 and 2.5, pp. 4–7). `ParallelVoting` combines two votes and decides only when both inner decisions exist. Paxos is a map from ballot numbers to a product of leader election and proposal voting (Section 4.1, pp. 14–16). Exposing inner actions preserves their safety guarantees.

How to apply it:

1. Make each basic protocol state an ARDT/PRDT with a join and a proved decision order (Sections 2.1, 3.5)
2. Form a product for independent obligations; let the derived merge update each component separately (Section 2.5, p. 7)
3. Add a composite action only with a stable guard requiring every predecessor Paxos instance to be decided (Section 4.2, pp. 16–18)
4. Define the composite decision order: prefixes for a log, pointwise order for a map, or epoch order for history-free rounds (Section 4.2)
5. Reuse component monotonicity proofs; prove only the new action and guard obligations (Section 3.5, p. 13)

The paper constructs `EpochPaxos`, `SequencePaxos`, and `GenPaxos`; `MultiPaxos` copies a decided leader election into the next epoch, and `ReconfigurablePaxos` decides the next membership together with the application value (Sections 4.2–4.4, pp. 16–19). “When composing smaller components that have been proven safe individually ... protocol designers can take the safety of those smaller components for granted when reasoning about the safety of the composed protocol.” (Section 4.5, p. 19)

Verus form: Inference: encode component state as Rust structs with `view`/ghost mathematical state, and define composition with ordinary structs and pure join functions. Prove projection lemmas stating that a composite merge preserves each component's join laws. Use `requires` to enforce predecessor decisions and `ensures` to preserve prefix or epoch order. Do not model Scala type classes; use explicit Rust traits only where their Verus specifications are available.

Evidence and product threat: the key-value-store evaluation uses a Multi-Paxos PRDT, YCSB, 100,000 local operations or 1,000 geo-replicated operations per run, three repetitions, and 3- or 5-node local and 3- or 9-node geo-replicated deployments (Section 5.2, pp. 20–21). The implementation reports strict serializability and parity with etcd in some local settings, but the paper reports no proof size, verifier time, or engineer-hours. Inference: PRDT's abstraction threatens VL mainly as a design pattern for modular distributed proofs, not as a direct Verus library; it could reduce repeated proof work if the same lattice and transition interfaces fit Rust. The trust boundary still includes the state-machine model, external networking, and any unproved serializer or storage code.

## techniques for the catalog

- local consensus proof reduction — prove action monotonicity and stable preconditions, then obtain global safety from convergence
- lattice-based protocol state — represent knowledge with an idempotent, commutative, associative join
- compositional consensus — derive product/map/list/epoch merges and reuse verified component obligations
- guarded protocol evolution — require prior decisions before appending epochs, log entries, graph nodes, or reconfiguration
- automated algebraic laws — encode monotonicity and stability as verifier-checked laws with helper lemmas when needed

Checked 2026-10-15 against the paper by a Codex agent for prdts_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
