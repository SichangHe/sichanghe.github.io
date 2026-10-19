# PRDTs: Composable Design and Verification of Consensus Protocols using Replicated Data Types
(authored by agents unless marked 🧑)
Tag: `haas2025prdts`, [paper](http://arxiv.org/abs/2504.05173v3)

## scope and result

Haas, Mogk, Bieniusa, and Mezini propose Protocol Replicated Data Types (PRDTs), a programming model in which each process accumulates protocol knowledge in a join-semilattice. Theorem 3.10 claims that local action monotonicity and stable preconditions establish consensus safety in the PRDT execution model, starting with empty knowledge at every process (Section 3.3, pp. 10–11). It implements the proof obligations as Stainless laws for Scala and composes verified voting components into Paxos variants. The paper states, “We propose Protocol Replicated Data Types (PRDTs), a novel programming model for implementing consensus protocols using replicated data types (RDTs).” (Abstract, p. 1)

The model has three parts: a knowledge lattice and merge, guarded protocol actions, and a decision function (Section 2, pp. 3–6). A process adds a delta produced by an enabled action; communication merges deltas. The join is idempotent, commutative, and associative; convergence assumes eventual delivery of all updates (Section 2.1, pp. 4–5). The formal merge rule transfers all deltas known by the sender, preserving causal order (Section 2.4, p. 7). The voting example stores one value per process, permits `voteFor` only when that process has not voted, and decides when a majority exists (Figure 2, p. 4). “A Protocol RDT (PRDT) consists of three components: (1) A knowledge lattice representing the protocol state, with each element representing a process’s current knowledge about the system. (2) A set of protocol actions with corresponding preconditions, which guard their execution. (3) A decision function that makes irrevocable decisions based on the current knowledge state.” (Section 2, p. 3)

## technique: reduce global consensus safety to two local obligations

What it is: prove (a) action monotonicity, that an enabled action cannot decrease the decision order, and (b) stability of every precondition, that a concurrent action by another process cannot disable it. Theorem 3.10 combines these with the lattice's strong eventual consistency (Sections 3.3.1–3.3.2, pp. 10–11). The paper says, “Ultimately, our verification method requires two conditions for every PRDT implementation: (1) action monotonicity and (2) stability of preconditions.” (Discussion after Theorem 3.10, pp. 11–12)

How to apply it:

1. Define a partially ordered decision domain and a decision function from knowledge states (Definition 2.3, p. 6)
2. For each action and enabled state, prove `dec(s) ≤ dec(s ⊔ action(i))` (Definition 3.7, p. 10)
3. For every pair of distinct processes and concurrent actions, prove that an enabled precondition remains enabled after the other action is merged (Definition 3.8, p. 10)
4. Use stability and action monotonicity to prove merge monotonicity, hence monotonicity of every system step (Lemma 3.9 and Theorem 3.10, pp. 10–11). Strong eventual consistency supplies a common reachable decision, and transitivity extends step monotonicity to execution traces (Theorem 3.6, p. 10)

The voting proof splits action monotonicity into two cases: from `Undecided`, every result is greater or equal; from `Decided(a)`, a majority for `a` cannot be replaced because each process votes once (Proposition 3.11, p. 12). Stability follows because only the local process identifier can add that process's vote. A precondition such as “there are no votes at all” would be unstable because another process can add a vote (Section 2.2, p. 5).

Verus form: Inference: represent the knowledge state as an executable Rust struct plus a mathematical `spec fn` for its join and decision order. Put action guards in `requires`, state growth and decision monotonicity in `ensures`, and prove the two obligations with `proof fn` lemmas. A concurrent protocol needs a Verus transition-system or state-machine encoding for ownership and merge; the Scala `@law` annotations would need corresponding Verus proofs. Use only the lattice algebra and the two proof obligations as the reusable interface; reusing a Stainless result would require an explicit connection to the Verus model.

Evidence and limits: the paper gives a manual voting proof and a Stainless `Consensus` trait with `@law` methods `monotonicity` and `stability` (Figure 6, p. 13). It reports that composite `ParallelVoting` can reuse the verified properties of `Voting`, and that Paxos reuses the same component proof (Section 3.5, p. 13). The paper also says, “in practice, however, automated verification often needs auxiliary lemmas and carefully placed assertions to guide the prover to a successful proof.” (Section 3.5, p. 13) Inference: a Verus implementation should expect helper lemmas and solver guidance, even though the interface reduces the conceptual proof burden. Safety does not prove termination: the authors explicitly place termination outside scope in Section 3.2.3 (p. 9). Validity is separately checked by tracking `happenedBefore` actions (Section 3.2.4, p. 9). Inference: applying these laws to a deployed implementation also requires justifying its correspondence to the model, including causal synchronization and the networking and storage code.

## technique: compose consensus components algebraically

What it is: derive composite knowledge lattices from component merges using products and sums (Section 2.1, pp. 4–5), then build protocol variants with maps, sets, epochs, lists, and dependency graphs (Section 4.2, pp. 16–18). `ParallelVoting` combines two votes and decides only when both inner decisions exist. Paxos is a map from ballot numbers to a product of leader election and proposal voting (Section 4.1, pp. 14–16). Inner actions preserve their component invariants as long as new actions do not modify the components; new composite actions and decision functions need verification (Section 2.5, p. 7).

How to apply it:

1. Give each basic protocol a knowledge lattice, decision order, and proofs of action monotonicity and precondition stability (Sections 2.1, 3.5)
2. Form a product for independent obligations; let the derived merge update each component separately (Section 2.5, p. 7)
3. For the multi-shot constructions, require a prior decision before advancing an epoch, all earlier decisions before appending a log entry, or all specified predecessor decisions before creating a graph node (Section 4.2, pp. 16–18)
4. Use prefix order for the log and pointwise order for the map. For history-free epochs, the paper reuses the inner Paxos decision function for each epoch; it does not specify a decision order across epochs (Section 4.2, pp. 17–18)
5. Reuse component monotonicity proofs; prove only the new action and guard obligations (Section 3.5, p. 13)

The paper constructs `EpochPaxos`, `SequencePaxos`, and `GenPaxos`; `MultiPaxos` copies a decided leader election into the next epoch, and `ReconfigurablePaxos` decides the next membership together with the application value (Sections 4.2–4.4, pp. 16–19). “When composing smaller components that have been proven safe individually (see Section 3.5), protocol designers can take the safety of those smaller components for granted when reasoning about the safety of the composed protocol.” (Section 4.5, p. 19)

Verus form: Inference: encode component state as Rust structs with `view`/ghost mathematical state, and define composition with ordinary structs and pure join functions. Prove projection lemmas stating that a composite merge preserves each component's join laws. Use `requires` to enforce predecessor decisions and `ensures` to preserve the chosen decision order. For history-free rounds, define how the epoch identifies each separate consensus instance before stating an order across rounds. Do not model Scala type classes; use explicit Rust traits only where their Verus specifications are available.

Evidence and product threat: the key-value-store evaluation uses a Multi-Paxos PRDT, YCSB, 100,000 local operations or 1,000 geo-replicated operations per run, three repetitions, and 3- or 5-node local and 3- or 9-node geo-replicated deployments (Section 5.2, pp. 20–21). The authors claim strict serializability (Section 5.1, p. 20). Their local results vary with workload and node count; in geo-replicated writes, etcd benefits from pipelining absent from the prototype (Section 5.3, pp. 21–24). The paper reports no proof size, verifier time, or engineer-hours.

## techniques for the catalog

- local consensus proof reduction — prove action monotonicity and stable preconditions, then obtain global safety from convergence
- lattice-based protocol state — represent knowledge with an idempotent, commutative, associative join
- compositional consensus — derive product/map/list/epoch merges and reuse verified component obligations
- guarded protocol evolution — require prior decisions before appending epochs, log entries, graph nodes, or reconfiguration
- automated algebraic laws — encode monotonicity and stability as verifier-checked laws with helper lemmas when needed
