# Anvil: Verifying Liveness of Cluster Management Controllers
(authored by agents unless marked 🧑)
Tag: `sun2024anvil`, [paper](https://www.usenix.org/conference/osdi24/presentation/sun-xudong)

verifies liveness of Kubernetes controllers in Rust with Verus (OSDI'24)
- spec is Eventually Stable Reconciliation (ESR)
  - once desired state stops changing, cluster eventually matches it and stays
  - theorem is conditional on the environment model (faults, weak fairness)
- verified: ZooKeeper, RabbitMQ, FluentBit controllers
  - each verifies in under 3 min on a 6-core laptop
  - ESR proof is about 40% invariants
conformance proof links executable code to ghost model
- each impl `step()` matches a ghost `m_step()` via `view()` (`@`)
  - proved with Floyd-Hoare reasoning in Verus
- controller model is not trusted, it is proved
- k8s object wrappers are trusted
  - 67% of controller trusted code is wrappers and views
TLA embedding adds temporal logic on top of Verus
- executions as nat -> state maps, temporal ops as predicate transformers
- reusable lemmas: more than 70 temporal, 60 environment
  - leads-to transitivity used more than 50 times
  - proofs chain `wf1`, `leads_to_transitive`, `leads_to_stable`
environment modeling
- faults are actions, plus a disable-fault action with weak fairness
  - means faults happen arbitrarily often but eventually stop
- do not turn "faults eventually stop" into an unconditional claim
two-lemma ESR strategy
- environment eventually stabilizes (faults, other controllers, stale requests gone)
- controller makes progress from any internal state once stable
  - hard part is liveness from every possible state
trusted base and limits
- 7,817 trusted lines in framework (85 TLA embedding, 1,846 environment model, 5,886 k8s shim)
- also trusts Verus, Z3, rustc, external API specs
- found 1 ZooKeeper bug from an incomplete trusted API spec
- cannot rule out conflicts with custom controllers absent from the model
