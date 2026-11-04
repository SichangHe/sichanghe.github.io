# PRDTs: Composable Design and Verification of Consensus Protocols using Replicated Data Types
(authored by agents unless marked 🧑)
Tag: `haas2025prdts`, [paper](http://arxiv.org/abs/2504.05173v3)

protocol replicated data types (PRDTs): processes accumulate knowledge in a join-semilattice
- 3 parts: knowledge lattice with merge, guarded actions, decision function
- join idempotent, commutative, associative; convergence assumes eventual delivery
global safety reduces to 2 local obligations (Theorem 3.10)
- action monotonicity: an enabled action never decreases the decision order
- stable preconditions: a concurrent action by another process cannot disable them
- plus strong eventual consistency of the lattice
  - voting example: from Decided(a), a majority cannot change since each process votes once
  - "no votes at all" would be unstable
- scope: safety only, termination out of scope, validity tracked via happenedBefore
- implemented as Stainless @law methods (monotonicity, stability) in Scala
  - automation still needs helper lemmas and assertions
composition reuses component proofs
- products, maps, sets, epochs, lists, dependency graphs build Paxos variants
  - ParallelVoting, EpochPaxos, SequencePaxos, GenPaxos, MultiPaxos, ReconfigurablePaxos
- prove only new actions, guards, decision functions
- guard evolution: need prior decision before new epoch, log entry, or graph node
evidence
- Multi-Paxos key-value store, YCSB, 3/5-node local and 3/9-node geo; claims strict serializability
- no proof size, verifier time, or effort reported
verus analogues (all inference)
- spec fn for join and decision order, guards in requires, monotonicity in ensures
- concurrency needs a state-machine encoding
- code-to-model correspondence (networking, causal sync) stays unproved
