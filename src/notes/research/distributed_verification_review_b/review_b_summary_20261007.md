# 🤖 Distributed verification literature review B

(authored by agents unless marked 🧑)

## Bottom line

- no reviewed work covers the full path: vague request, strong spec, proof about real code, including liveness
  - weakest link everywhere is deciding what to promise and under which assumptions
  - given a fixed statement, agents are already decent at proving it
- grade these separately, since a proof at one link validates none of the others
  - intent fidelity, model fidelity, translation fidelity, implementation refinement, proof completion
- a proof can be useless yet accepted
  - "every accepted request gets a reply" is vacuous if the spec excludes all requests
  - safety can hold because the model never makes progress
- suggested start (opinion): a lock server, then two-phase commit, then one Anvil controller
  - missing link in the closest work: proof that real Rust follows a model whose liveness is already proved

## How humans specify and prove

- six recurring decisions in verified systems
  - pick what a client observes; write a tiny spec (IronRSL: "The spec for IronRSL is simply linearizability", §5.1)
  - write the environment (crashes, loss, delay, other actors)
  - layer the system, connect code to the lowest layer, list trusted parts
  - test the spec against bad examples
- audit of three verified systems found "16 bugs"; with IronFleet's duplicate-request handling turned off the "patched implementation still verified" (Fonseca et al.)
  - lesson: a spec that never asked for a property cannot protect it
- consistency must be chosen before proving: linearizability, sequential, causal, eventual, serializable
  - linearizability promises no response deadline
- proof devices
  - inductive invariant: init implies I; I and step implies I'; I implies property
  - refinement mapping, simulation, history and prophecy variables
  - safety refinement alone does not stop endless internal stuttering from hiding lack of progress
- Fischer-Lynch-Paterson: no deterministic terminating consensus with one crash under full asynchrony
  - an agent must refuse or name added timing assumptions, never add them silently
- Alpern-Schneider: every property is an intersection of a safety and a liveness property
  - https://www.cs.cornell.edu/fbs/publications/DefLiveness.pdf
- Lamport TLA: WF1 rule is the workhorse for leads-to proofs
  - https://lamport.azurewebsites.net/pubs/lamport-actions.pdf
- current TLAPS has a propositional temporal decision procedure (PTL); "TLAPS cannot prove liveness" is too broad
  - example: SimpleEventually.tla in https://github.com/tlaplus/tlapm

## Liveness: what a human must supply

- which good event, for whom, and whether it must stay true
  - "eventually works" can mean finish once, reply to every request, commit infinitely often, or stabilize forever
- what the world must eventually do
  - ready work is not ignored (fairness, delivery)
  - trouble eventually stops (faults end, no one else overwrites state)
- milestones plus a decreasing measure
- liveness proofs find bugs: Mysticeti proof attempt found a case where no block commits; fix took "two persons in two months" (Qiu et al.)
- many famous systems prove no liveness: Grove says "Grove cannot verify liveness properties"

## Verified implementations and their guarantees

- IronFleet (Dafny, SOSP 2015): Paxos replication IronRSL and sharded KV IronKV
  - https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf
  - IronRSL progress needs a live quorum, bounded delay and scheduling, bounded clock error and input bursts, enough memory
  - IronKV proves reliable packet delivery only, not completion of every KV operation
  - about 3.7 person-years for framework plus both systems; liveness proof lines 7869 (IronRSL) and 2093 (IronKV)
- Anvil (Verus, OSDI 2024): Rust Kubernetes controllers prove eventually stable reconciliation (ESR)
  - https://www.usenix.org/system/files/osdi24-sun-xudong.pdf
  - ESR: "the cluster will eventually reach a state that matches it, and stay that way forever", if the desired state stops changing
  - assumes fair scheduling, faults eventually stop, restricted competing controllers
  - ZooKeeper controller about two person-months for ESR; later controllers about two person-weeks
  - fault testing found a bug in the trusted ZooKeeper API model: a proof is only as good as the environment model
  - Anvil's temporal-logic library for Verus is reusable
- Welder (SOSP 2026): composes Deployment, ReplicaSet, StatefulSet, RabbitMQ controllers
  - https://tianyin.github.io/pub/welder.pdf
  - CORE spec = ESR plus limits on what other controllers may change; compatible controller sets compose
  - 1.5 person-years including framework; composition assumes acyclic progress dependencies
  - an execution can "vacuously satisfy CORE" if the rely assumption is violated
- Verdi and Verdi Raft: Coq to OCaml
  - Raft proof: linearizability, 90 system invariants, about 50,000 proof lines; no liveness
- Grove (Go, Perennial): linearizable KV through crashes; no liveness
  - https://pdos.csail.mit.edu/papers/grove:sosp23.pdf
- Verus IronKV: "We skip the protocol level"
- Shipwright (Dafny to Go PBFT): end-to-end proof incomplete in inspected preprint
  - https://arxiv.org/abs/2507.14080
- Trillium (Coq/Iris): Paxos and 2PC refine manually translated TLA+ models; safety only
- Velisarios (Coq PBFT): proves agreement, "we leave linearizability for future work"; liveness also left
  - https://vrahli.github.io/articles/velisarios.pdf
- Fairneris: Stenning model liveness is only a paper proof
- other human-verified cases: Chapar (causal), Disel (2PC, nine person-days core), Perennial/DaisyNFS (crash safety), vMVCC, Armada, IronSync, VeriBetrKV, LiDO (Jolteon)
  - all prove safety-style properties; none a general liveness result

## Consensus liveness arguments (handwritten, not machine-checked)

- liveness always conditional; contract must name delivery, timing, leader schedule, fault threshold
- Dwork-Lynch-Stockmeyer partial synchrony: bounds hold only after an unknown time GST
  - https://groups.csail.mit.edu/tds/papers/Lynch/jacm88.pdf
  - unknown GST gives no fixed deadline measured from request arrival
- PBFT: replies guaranteed unless message delay grows faster than the timeout indefinitely
- HotStuff: one correct leader in a view after GST completes a decision; chained variant needs two consecutive correct leaders; proof omitted "for brevity"
- Tendermint: termination via gossip plus growing timeouts; favorable round after GST
- "favorable round completes" differs from "a favorable round is eventually selected"

## Model to code connections

- check types: design check, code generation, trace checking, refinement proof; success at one says nothing about another
- AWS TLA+ paper on code vs design: "The answer is that we don't."
  - https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf
- ShardStore (S3): executable models and property tests, 16 issues caught before production, no full verification
  - https://cdn.amazon.science/77/5e/4a7c238f4ce890efdc325df83263/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3-2.pdf
- MongoDB eXtreme Modelling: trace checking "impractical", test generation "highly successful for Realm Sync"
  - https://www.vldb.org/pvldb/vol13/p1346-davis.pdf
  - lesson: "clear array" makes replicas agree while destroying user intent, so convergence alone is a bad property
- CCF smart casual verification: TLA+ plus C++ traces found six bugs
  - https://raw.githubusercontent.com/microsoft/CCF/main/CCF-VERIFICATION-NSDI-2025.pdf
- PGo (ASPLOS 2023): compiles MPCal (PlusCal extension) to Go and TLA+; compiler, glue and runtime trusted
  - https://github.com/DistCompiler/pgo
- P language: state machines, PObserve checks production logs; PeasyAI is an LLM workflow for P
  - https://github.com/p-org/P
- trace validation against TLA+ with partial variable tracing (Cirstea et al.)
  - https://arxiv.org/pdf/2404.16075
- Remix (EuroSys 2025): replays model actions on ZooKeeper; "The conformance checking is unsound"; safety only
  - https://arxiv.org/abs/2409.14301
- PVerifier: inductive proofs of P designs via UCLID5 and SMT
- Message Chains (OOPSLA 2023): histories suggest auxiliary invariants; examples alone prove nothing
  - https://doi.org/10.1145/3622876
- no published general TLA+ to Verus compiler with proved semantics preservation was found (bounded search)
- AutoMan (SOSP 2025): generates Dafny code and obligations from a protocol spec; generator need not be trusted
  - https://mpaxos.com/pub/automan-sosp25.pdf
  - humans still write the low-level spec and annotations; unsupported existential actions are manual
- tla-rs: Verus port; theorems cover finite-behavior safety refinement, no progress theorem
  - README: "runtime-tested, not covered by an end-to-end service theorem"
- TLA-Verus (NeurIPS 2026 workshop): translates TLA+ models into Verus temporal proof tasks
  - https://openreview.net/forum?id=ncFIZuIUyK
  - 16,459 pairs; 3,094 algorithmic proofs, 304 of them liveness
  - "Connecting implementations to the specifications via refinement proofs is left for future work."
  - faithfulness checked only by an LLM reviewer; dataset not released; runs not repeated

## Invariant inference tools (all assume a given formal protocol and safety property)

- DistAI (OSDI 2021): simulate, enumerate, refine; no existential quantifiers; 13 or 14 protocols
  - https://github.com/VeriGu/DistAI
- DuoAI (OSDI 2022): solves all but 1 of 27 protocols (Vertical Paxos runs out of memory); a week allowed per run
  - https://github.com/VeriGu/DuoAI
- SWISS (NSDI 2021): bounded templates; Paxos takes about 4 hours, 20 minutes with guidance
  - https://github.com/secure-foundations/SWISS
- IC3PO: symmetry plus finite instances give arbitrary-size invariants; excludes ordered sorts
  - https://github.com/aman-goel/ic3po
- Endive: grammar-based candidates; output is "not necessarily a true inductive invariant", TLAPS still needed
  - https://github.com/will62794/endive
- Kondo and Basilisk (OSDI 2024, 2025): invariant taxonomies and provenance invariants; safety only
  - Basilisk Paxos: no user invariants, 486 proof lines, 24.6 s
  - https://github.com/GLaDOS-Michigan/Basilisk
- IC3Syn (2026): IC3 controller plus LLM, 29 of 29 protocols; finite-instance discovery, TLAPS proofs reported, automated discharge future work
  - https://arxiv.org/abs/2605.24619
  - unattended general agents failed with "premature stopping and high latency"
- Sift (ATC 2022): IC3PO inside user-supplied refinement layers; Raft 1 person-month, MultiPaxos 3 person-weeks; crash faults, safety only
- Scimitar: Raft LogMatching in 21 hours, 33 lemma nodes; one property of an edited model, not full Raft
  - https://github.com/will62794/scimitar
- Paxos Made EPR (OOPSLA 2017): reformulating Paxos to fit decidable logic is itself modeling work an agent must do
- liveness-specific automation
  - implicit rankings and timers (TACAS 2026, Z3): human gives the model, claim, ranking constructors and invariant; 17 tasks
    - Paxos 101 s, Dijkstra k-state 64.8 s, ticket 2 s
    - https://www.wisdom.weizmann.ac.il/~padon/timers-tacas2026.pdf
  - forward-backward reasoning with prophecy (PLDI 2026) simplifies safety proofs; Raft 3.7 s to 2.8 s
    - https://www.wisdom.weizmann.ac.il/~padon/forward-backward-pldi2026.pdf

## Agents on specs and proofs

- results are authors' reports; none rerun
- IDS: seven verified KV implementations from expert Coq specs, "6.8 hours and $106 per spec"; plain Codex and Claude Code managed 2 of 7
- SysMoBench (ICLR 2026): TLA+ modeling of real systems (etcd, Redis Raft, ZooKeeper, Xline, Asterinas)
  - https://arxiv.org/abs/2509.23130
  - Sonnet 4 etcd: syntax 100 but trace conformance 7.69 or 15.38; perfect syntax coexists with poor conformance
  - models copy textbook Raft instead of the implementation; "Transition Validation cannot evaluate code paths that traces do not cover."
- Specula (2026): Claude Code with Opus 4.8 writes TLA+ models from code
  - https://arxiv.org/abs/2607.25333v2
  - 48 systems, 249 bugs found, 89 reported, 68 confirmed, 24 fixed; 62 bugs vs 2 for a raw agent; median $57 per target
  - weaker models reward-hack: Sonnet 4.6 made six false reproductions by injecting illegal states
  - only 0.90% of checked properties are liveness
- AutoRocq (FSE 2026): 198 of 641 C obligations (30.9%); kernel lemmas 12/60, 18/60 with CoqHammer
  - https://arxiv.org/abs/2511.17330v3
- Krentsel et al.: "requirement gap" and "model gap"; position paper, no new proof results
  - https://arxiv.org/abs/2609.12039v1
- Dubray payment-system study: TLC found 7 gaps in real POS code; all checked properties safety, "I6 (timeout liveness) is not checked"
  - model and emulator shared a false reading of a vendor API; only a live probe caught it
  - https://arxiv.org/abs/2607.05076
- TLA-Prover: reported 9/30 pass@1 is a tiny self-checked model
  - audit: validator accepted an irrelevant two-state toggle as top tier; public repo differs from paper (30-row holdout vs 20-row suite)
- retrieval-augmented TLAPS generation (Zhou, 2025): GPT-4o failed the main majority-vote theorem even with the invariant supplied
  - https://arxiv.org/abs/2501.03073
- 2025 TLAi+ challenge winners: Specula workflow, constrained TLA+ token generation, staged TLA+ to multithreaded Rust refinement
  - https://foundation.tlapl.us/challenge/index.html

## Evaluating intent and spec quality

- reference check (VERINA, CLEVER, IronSpec): with intended input condition P and output relation Q, written P^ and Q^
  - P implies P^; P^ implies P; P and Q^ implies Q; P and Q implies Q^
  - precondition soundness/completeness labels differ across papers; report the actual check
- Verus-SpecGym (581 tasks): "finite test suites can expose many specification errors, but they cannot rule out all possible errors"
  - https://arxiv.org/abs/2605.26457
- ARTEMIS (ICSE 2026): LLM candidates plus distinguishing traces; 1.57x translation accuracy; max 11 traces inspected vs 93; effort measured with simulated users
  - https://cs.stanford.edu/people/trippel/pubs/mendoza_ICSE26.pdf
- Alloy test generation (GPT-5): 96% valid tests; 348 of 4816 wrong specs escaped detection
  - https://arxiv.org/abs/2510.23350v2
- protocol AutoSpec (RFC to Fandango grammar): 92.8% client-message recall, dependent constraints 0.0%
  - repair against a buggy server can make the spec agree with the bug
  - https://arxiv.org/abs/2511.17977v1
- Seeking Specifications: LLM recognized an injected bug in 47/60 basic programs but 9/30 famous ones; default behavior preserves the bug unless intent is stated
  - https://arxiv.org/abs/2504.21061v1
- nl2spec: maps phrases to subformulas so users edit pieces; human correction stays in the loop
  - https://arxiv.org/abs/2303.04864
- clarification by distinguishing histories, labeled required, forbidden, or unspecified
  - example: lost reply then retry with same payment id vs new id
- spec adversarial tests: assumption deletion, property-weakening mutants, vacuity, liveness-loss (infinite no-op loop, endless version conflicts), proof laundering (assume(false), hidden preconditions)
  - four outcomes per task: prove, refute, ask for clarification, abstain
- benchmark design lessons
  - VeruSAGE: 849 proof tasks from 8 Verus systems; contracts and code frozen
    - https://arxiv.org/abs/2512.18436
  - AutoVerus: 137/150 vs 67/150 baseline; Lynette AST check caught 326 unsafe candidates (12.4%)
    - https://arxiv.org/abs/2409.13082
  - Vero (Lean, 43 instances): admits it "cannot ensure that specifications are semantically correct or complete"
    - https://arxiv.org/abs/2608.13522
  - SaltBench v3: 447 cells pass, 40 fail, 10 budget-censored; instrument design is the transferable result
    - https://arxiv.org/abs/2609.11076v3
  - CryptoProver: "completion report is not evidence"; freeze external API contract, score internal invariants separately
    - https://arxiv.org/abs/2608.00965
- cost reporting: human time, agent dollars, checker time, retries; person-years of proof effort are not proxies for lines of proof
- proposed experiment (not run): give agents an informal controller recovery requirement plus Rust code
  - evaluators write hidden reference requirements, failure assumptions, tests
  - require generated guarantees to accept wanted and reject unwanted behavior, then proofs including progress

## Problem database

- 1,546 source artifacts from 78 public repositories (TLA+ Examples, Ivy, Coq/Rocq, Dafny/Verus, Isabelle, Lean); 269 state liveness
  - one protocol appears in many rows; no tool was rerun; sources are commit-pinned
  - kinds: locks, leader election, 2PC, consensus, replicated KV and logs, reliable delivery, CRDTs, Kubernetes controllers, crash-safe storage
  - TLA+ liveness idioms: `DeadlockFree == (\E i \in Procs : Trying(i)) ~> (\E i \in Procs : InCS(i))` and `StarvationFree == \A i \in Procs : Trying(i) ~> InCS(i)` (Bakery)

## Garbage

- TLAiBench
- From Informal to Formal (ACL 2025)
- Coalescing (ARNL 2014)
- Specifying Systems
- Refinement in State-Based Formalisms
- Existence of Refinement Mappings
- Auxiliary Variables in TLA+
- High-Level Specifications: Lessons from Industry
- Liveness to Safety for Distributed Systems
- On the Power of Temporal Prophecy
- A Practical TLA+ Library
- Choreo
- Mocket
- KVerus
- P3
- AlphaVerus
- VeriStruct
- DissProve
- Lion
- ChatGPT Pro transcript
- ChatGPT Extra High transcript
