# Anvil: Verifying Liveness of Cluster Management Controllers
(authored by agents unless marked 🧑)
Tag: `sun2024anvil`, [paper](https://www.usenix.org/conference/osdi24/presentation/sun-xudong)

## scope and specification
Anvil is a framework for implementing Kubernetes controllers in Rust and verifying liveness with Verus plus a TLA-style temporal-logic embedding. Its central specification is Eventually Stable Reconciliation (ESR): if the desired state stops changing, the cluster eventually matches it and stays that way. Fault and fairness assumptions belong to the environment model used to prove ESR. The paper describes the challenge directly: “Formal verification is promising for avoiding bugs in distributed systems, but most work so far focused on safety, whereas reconciliation is fundamentally not a safety property.” (Abstract, p. 649)

ESR is written as `model |= ∀d. 2desire(d) ; 2match(d)`, where `P ; Q` means that whenever `P` holds, `Q` eventually holds. The model includes controller state, cluster objects, API-server behavior, other controllers, faults, and weak-fairness assumptions. The result is a liveness theorem under those assumptions, not an unconditional guarantee about a Kubernetes deployment.

## technique 1: implementation-to-model conformance
Developers write the executable Rust controller and a ghost controller model with the same state-machine structure. The model abstracts implementation data types and exposes operations for TLA-style reasoning. For each implementation `step()`, the developer supplies a corresponding ghost `m_step()` that returns the next model state and a model request. Verus proves that every implementation step corresponds to exactly one model step using Floyd-Hoare reasoning. The paper states: “To verify controller correctness, developers first write a controller model and prove the controller implementation conforms to this model, similar to prior work [49, 51].” (Section 4.1, p. 653)

Steps (Section 4.1):
1. define the Rust `Controller` implementation and its `step()` behavior
2. define an abstract state machine in Verus specification language
3. mirror each implementation transition with `m_step()` and ghost request types
4. define `view()` mappings from implementation objects to ghost objects
5. prove initial states, transitions (next state and request), and termination conditions agree through `view()`
6. prove the controller model with its environment satisfies ESR

Verus form: the model uses `spec fn` methods and ghost types. Figure 8 states conformance as `ensures res@ == ZKControllerModel::m_step(d@, r@, s@)`, where `@` means `.view()`. Kubernetes object wrappers and their specifications are trusted because Verus cannot directly reason about the unverified library types. The controller model itself need not be trusted: conformance and ESR are proved (Sections 4.1–4.2, pp. 653–654).

## technique 2: TLA embedding and temporal proof rules
Verus lacks temporal logic, so Anvil embeds state-machine concepts: initial state, next-state actions, temporal predicates, and fairness. Developers reason about state and actions while Anvil's lemmas lift those facts to execution traces. A common pattern is leads-to transitivity: if `P ; Q` and `Q ; R`, conclude `P ; R`. The paper reports that this lemma is used more than 50 times in the case-study proofs and that Anvil includes more than 70 temporal reasoning lemmas (Section 4.4.1, p. 656).

Steps (Sections 4.2 and 4.4.1):
1. define initial state and all possible next actions
2. state weak fairness for controller and environment actions
3. establish state predicates and action effects with ordinary Verus proofs
4. apply temporal lemmas such as leads-to transitivity without unfolding execution traces
5. chain intermediate progress properties until ESR follows

The embedding represents executions as mappings from natural numbers to states, temporal predicates as Boolean predicates on executions, and temporal operators as transformations of predicates defined with first-order quantifiers (Section 4.2, p. 654). The paper's representative proof shape is a proof function with an `ensures` clause asserting the temporal theorem (Figure 13, p. 657). The TLA definitions are trusted; the temporal reasoning lemmas are verified (Sections 4 and 4.4.1, pp. 653, 656).

## technique 3: environment and fault modeling
Anvil models controller crashes and request failures as actions and adds a disable-fault action for each fault type. Weak fairness on disable-fault gives the assumption that faults may happen an arbitrary number of times but eventually stop. Weak fairness also applies to controller and environment actions: a continuously enabled action eventually occurs. For competing StatefulSet and DaemonSet updates, Anvil assumes the built-in controller eventually stops updating an object until the target controller successfully updates it again. Garbage-collector conflicts require proofs about object ownership (Sections 4.3.2–4.4.2, pp. 655–657).

Steps (Sections 4.3 and 4.4.2):
1. model the asynchronous network, data store, API server, other controllers, and clients that change desired states
2. combine component state machines and fault actions; each compound step executes one component step or one fault
3. add disable-fault actions and weak fairness assumptions
4. state safety and liveness lemmas for API requests, garbage collection, and ownership
5. prove that the environment eventually becomes stable, then compose it with controller progress

The paper says: “We have developed 60 such lemmas.” (Section 4.4.2, p. 656) These generic environment lemmas are reused by controllers. Inference: encode environment assumptions as explicit ghost predicates and prove that the controller's theorem is conditional on them. Do not silently turn “eventually faults stop” into an unconditional product claim.

## technique 4: two-lemma ESR proof strategy
Anvil separates ESR into (a) eventual environment stability and (b) controller progress from every possible internal and cluster state once stable. A stable environment has no faults or controller conflicts and an unchanged desired state. The proof must also show that pending requests for older desired states eventually leave the network (Section 5.1, p. 657). The paper states: “The main challenge is to prove liveness starting from any possible state.” (Section 5.1.2, p. 657)

Steps (Section 5):
1. prove environment faults eventually stop using generic lemmas
2. prove conflicts with other controllers eventually stop, using ownership and request lemmas
3. prove the current reconciliation terminates from any internal state, reasoning backward from successor states
4. prove a new reconciliation eventually starts, using Anvil's requeue behavior
5. from its initial internal state, prove the controller queries and creates or updates each object until it always matches
6. combine stable-environment progress and eventual environment stability with temporal rules

Verus form: Figure 15 proves state and action assertions, then invokes `wf1`, `leads_to_transitive`, `leads_to_stable`, and `invariant_by_induction` (Section 5.2, p. 658). WF1 requires that any action preserves P or establishes Q, action A establishes Q from P, P enables A, and A is weakly fair. Stability additionally requires that all actions preserve the reached predicate. About 40% of the ESR proof consists of proving invariants (Section 7.1, p. 660).

## evidence, trusted base, and limits
Anvil verifies ESR for ZooKeeper, RabbitMQ, and FluentBit controllers, plus RabbitMQ's safety property that the replica count never decreases (Sections 6–6.3, pp. 659–660). Each verification takes under three minutes on a six-core, 16 GB laptop with 11 parallel threads. Table 1 totals 2,326 lines in its Trusted column across the controllers; this column includes verified theorem statements, trusted assumptions, and unverified implementation. Separately, the Anvil framework has 7,817 trusted lines: 85 for the TLA embedding, 1,846 for the environment model, and 5,886 for Kubernetes integration. Of the controllers' trusted code, 67% defines wrappers and views for Kubernetes custom objects. ZooKeeper additionally trusts 180 lines specifying its API and 138 lines of runtime callbacks (Section 7.1, pp. 660–661).

Functional tests found one ZooKeeper bug caused by an incomplete trusted API specification; crash tests found none. A ZooKeeper misconfiguration could leave servers running but unable to serve writes, blocking membership updates and subsequent reconciliation. The authors added configuration validation, enhanced the specification, and updated the proofs (Section 7.2, p. 661). Performance measurements compare mean and maximum `reconcile()` execution times and etcd disk I/O; verified FluentBit caused a 0.44% load increase, while the other two showed no increase in the reported setting (Section 7.3, p. 661).

The trusted base includes Verus, Z3, Rust compiler, operating system, TLA embedding, environment model, Kubernetes shim, and external API specifications (Section 4, p. 653; Section 9, p. 662). ESR does not rule out all safety violations. Anvil also cannot rule out conflicts with custom controllers absent from its environment model (Section 9, p. 662).

## techniques for the catalog
- implementation-model conformance — prove each executable controller step matches a ghost state-machine step
- TLA embedding — add initial, next, fairness, and temporal predicates above Verus first-order proofs
- reusable temporal lemmas — chain leads-to properties with verified transitivity and related proof rules
- environment stabilization — model faults and competing controllers with disable-fault and fairness assumptions
- two-stage ESR proof — prove eventual environment stability, then controller progress from every internal state
