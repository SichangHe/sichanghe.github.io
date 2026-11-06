# 🤖 distributed verification literature database

(authored by agents unless marked 🧑)

## Scope and trust

- Source: 2375 papers/tools/benchmarks, 1150 concrete cases (291 with a liveness guarantee, 63 machine-checked on running code), 1546 spec/proof files in public repos (269 with liveness), 336 unread leads.
- Only about 1300 sources were mostly read; about 740 only by abstract or first pages. Numbers are the sources' own; nothing was re-run.
- Liveness means "something good eventually happens". The grading of each case (evidence kind, code vs model, who wrote it) was done by agents from record text, so labels can be wrong.
- Known contradictions among the notes: Anvil effort (2 vs 2.5 person-months), Anvil proof lines (7245/5211/7079 vs 8352/7228/8395, the latter including the controller model), ModelFuzz bugs (12 vs 13), EqiVM proved contracts (23/19/27), Atmosphere effort (about 2 person-years vs under 2.5 total).
- Some entries were described secondhand or from abstracts only (CryptoProver, LeetProof, Vero, SaltBench, StarVerus, Tulip, Lion, AutoMan, KEVM); treat their numbers as weak.
- Google Scholar searches stopped working on 12 October 2026 (CAPTCHA), so the database is not exhaustive.

## Liveness proofs on running code

- Takeaway: liveness proofs about real code almost always assume fairness plus a stabilizing environment (faults eventually stop, desired state stops changing), and cost 5 to 40 proof lines per code line.
- Anvil (Verus, Kubernetes controllers: ZooKeeper, RabbitMQ, FluentBit, ReplicaSet, Deployment, StatefulSet):
  - proves eventual stable reconciliation if the desired state stops changing and faults stop
  - ZooKeeper 1134 exec / 8352 proof lines, RabbitMQ 1598 / 7228, FluentBit 1208 / 8395; about 2 to 2.5 person-months each
  - proof work found liveness bugs (duplicate service name, GC race)
- Welder (2026): composes controller liveness guarantees by rely/guarantee; only acyclic dependencies are demonstrated, not circular progress dependencies.
- IronFleet (Dafny): IronRSL gives a reply to a repeatedly submitted request if a live quorum has eventually bounded-time networking; IronKV's reliable transmission assumes host loops run infinitely often. A later paper judges the IronRSL network assumption stronger than needed.
- Shipwright: PBFT single-log-entry agreement, termination and validity in Dafny, extracted to Go; 44,495 lines, partial synchrony assumed.
- Velisarios: PBFT safety in Coq, extracted to OCaml, 27.6 us per request locally, about 7 s view-change recovery. Safety only.
- Mysticeti (Coq): a counterexample lets honest nodes skip rounds without limit so nothing commits; fix by restricting jumping and adding a catchup time; 6271 proof lines by two people in two months.
- Concurrency termination: VeriFast ghost signals prove a CLH lock (343 annotation lines for 49 code lines) and a bounded FIFO producer-consumer (160 for 37) terminate under fair scheduling; Iris/Coq call permissions prove a lock-free stack with helping terminates; Rocq/Iris Lawyer logic proves fair termination (ticket lock) and wait-freedom of an SPSC queue.
- Fairneris (Rocq): transfers model progress to an AnerisLang implementation under fair scheduler and fair network.
- Trillium/Aneris and OpLib prove CRDT convergence (strong eventual consistency) for replicated implementations.
- Lion async runtime (Verus): 3393 exec lines vs 39648 spec/proof lines; tasks complete and timers wake under bounded-delay wake sources.
- DafnyMPI: three MPI PDE solvers verified deadlock-free and terminating given a declared topology.

## Liveness at model and hardware level

- Certifying rlive, liveness certificates: hardware liveness checked by a second tool (PVS proved 41 of 53 nuXmv results; certificate overhead 4% k-liveness, 7% rLive, 59% L2S).
- Pono 2.0: SMT model checker with liveness-to-safety and k-liveness engines.
- Multi-controller Kubernetes model in nuXmv: overlapping resources cause endless overwriting; dependencies can block forever.
- Paxos-SB in DistAlgo: found two liveness bugs in published pseudocode (a non-leader, and survivors not counting their own vote).
- Pischke-Yoshida: top-down projection and bottom-up local checking characterize the same live multiparty sessions; PSPACE-complete synchronously, undecidable asynchronously.
- LIFT: LLM guesses loop bounds, validator checks; 152 of 171 solved (Gemini), 139 (DeepSeek).
- ACL2s termination with LLM-proposed measures: gpt-oss with feedback solved 70% of course and 93% of the other set.
- Timers paper: timer reduction plus implicit rankings proves termination of a SAT-backtrack routine in 0.3 s.
- Background: TLA semantics in PVS (1996) is definitions only; the hidden-variable quantifier is the hard part to embed.

## Invariant inference

- Lambda and Updria (quantified, arithmetic invariants): on 238 MCMT-format systems Lambda solves 214, Updria 208, MCMT 172; Ic3po beats Lambda by 7 on 52 VMT systems because it finds existential quantifiers. Only universal invariants; symmetry cut time 8740 s to 2773 s.
- IC3Syn: IC3 controller feeds bad states to an LLM (Claude Opus 4.6) that proposes TLA+ clauses; TLC/Apalache check small instances, TLAPS proves all sizes; 29 of 29 protocols vs direct Claude baseline 23. Looks like the same work as I3DP.
- Agentic-IC3: LLM agent inside word-level IC3; 10 of 14 RTL cases within 3600 s, baselines 5 or fewer; agent waiting is 87% of run time.
- A-IC3: bandit picks generalization strategies; 653 of 914 problems vs 603 for rIC3-Standard.
- CIll: LLM helper assertions from counterexample traces on rIC3; baselines solve 146 of 222.
- DissProve: backward abstract interpretation of P actor protocols with separation and linear logic; 7 protocols.
- Autogram: LLM-proposed typed expressions for network telemetry; only approximate relations, not inductive invariants.
- Scenario proofs (Ang, Pirlea, Mathur): representative executions plus Hoare reasoning replace monolithic inductive invariants; 6 protocol studies.
- Federated Formal Verification: about twenty Claude Code specialist agents discharge open TLA+ obligations of a production Raft system into Coq, Lean, Why3, Apalache, Z3, CBMC; 17 active hours, 263 commits.

## Agents writing specs and proofs

- Takeaway: LLMs parse fine but are rarely correct; the spec step is the bottleneck, and pass-by-checker is often vacuous.
- TLA+-Bench (1,300 modules, 403 gold): on 100 gold specs parse vs correct was Claude Opus 4.5 87% vs 16%, GPT-5 89% vs 4%, open models at most 1%; 74% of failures are name/configuration binding; 12 of 30 correct outputs exercise real behavior. 112 of 403 gold configs name no property.
- Natural-language-to-TLA+ study: 2,600 open-weight and 130 proprietary runs; "semantic correctness" is only a TLC pass on a finite configuration; GPT-5 had 26/26 syntax but 7/26 TLC passes.
- SpecCoder: fine-tuned model emits runnable inline assertions; keeps one only if it holds on all correct runs and rejects at least 90% of mutants; HoarePrompt-level MCC with about 1.3M tokens vs 60-68M. Good test for whether an invariant says something real.
- Agentic Proving on CLEVER (Claude Opus 4.6, Lean): 159 of 161 arguably valid specs; 81 reference solutions were defective; correct-reference specs proved equivalent 65 of 80. Sequential programs only.
- AlgoVeri: 77 algorithms; best Dafny 40.3%, Verus 24.7%, Lean 7.8% with 15 repair rounds.
- VeriFast study: 855 of 2,727 outputs verify (31.4%); 303 C functions.
- Vostd/Asterinas: 1,587 failure episodes by stage: repository integration 28%, Verus legality 32%, semantic modeling 26%, proof construction 14%; verifier message pointed at the true stage 72.6% of the time.
- VCoT-Bench: best model 68.7% invariants, 39.6% assertions, 51.5% lemmas; collapses when whole blocks are removed.
- IDS: GPT-5.4 workers write Coq implementation plus proof for seven distributed key-value specs; about 6.8 hours and $106 per spec.
- EqiVM: agents write Lean proofs that Ethereum bytecode refines a spec; the agent is untrusted, proofs are checked.
- Hilbert (Lean): reasoner sketches with `sorry` gaps, prover fills them, recurse on stuck gaps; PutnamBench 70.0% vs 50.4% for SeedProver; hardest problems cost 23-27M tokens. Loop maps onto invariant-and-lemma proofs but is not shown on systems.
- AlphaProof Nexus: plain LLM plus Lean error feedback solved all 9 Erdős problems the full agent solved; Codex 7 of 9, Claude Code 0 of 9.
- Agora: LLM agents found 15 new bugs in Raft, EPaxos (9), HotStuff, BullShark; about $40 per bug; 26.1% false positives.
- Neuro-formal verification: Dafny pipeline 92.2% correct verdicts on 128 verdicts.
- Survey of LLM requirement formalization (35 papers): assertion generation is more reliable than full contract synthesis; SpecGen got verifiable specs for 279 of 384 programs; figures not comparable across tasks.
- Hardware and math side: CircuitProver 63 of 63 vs 31 for Chicala/Stainless.

## Intent to spec, and model to code

- AeroReq2LTL: 85% precision, 88% recall on aerospace requirements with a data dictionary and templates.
- Agentic requirement formalization (UPPAAL SMC): exact match 34.7% vs semantic 77.8% after an LLM judge; exact text match undercounts.
- JS-SAM vs TLA+: LLM-written executable JavaScript specs checked by bounded exploration and trace replay; small tasks passed 40 of 40.
- Restaurant payment workflow audit: TLA+ models found 7 gaps, 3 reproduced on unmodified code; all properties safety only; model and emulator shared a wrong reading of Finix duplicate keys.
- HarnessLLM: Rust unit tests turned into Kani harnesses; 94.66% preserved behavior.
- ICEPICK: TLA+ state graphs drive black-box REST API tests.
- k8s runtime audit: TLA+ tenant-isolation model replayed over audit logs, all 5 scenarios detected.
- LeaseGuard: Raft lease design with 296-line TLA+ model, simulator and LogCabin implementation.
- CertiFlash: reusable Rocq proofs for flash translation layers; 21,884 lines.
- Prusti refinement of guarded transition systems (simplified Memcached) with LTL in ghost code.

## Agent runtime checks

- AgentLTL: LTL over tool traces; block-and-warn improves compliance on 5 of 7 models; fine-tuning gave +38 accuracy points on held-out patterns.
- Agentproof: static check of agent workflow graphs; structure and safety only, cannot prove the workflow exits.
- AgentSpec: runtime rule language; generated embodied rules 95.56% precision; safety only on tested runs.

## Garbage

- Formal Verification Frameworks for Cloud-Native Microservices
- Online enumeration of minimal inconsistent subsets of temporal requirements
- A Comparative Review of ZFC, NBG, and MK Axiom Systems
- A lean-based language for teaching proof in high school
- AI-powered cancer diagnosis: classifying viable vs non-viable cells
- Biometric authentication using IoT devices
- Blockchain-Enabled Medical Waste Management System
- Computational Cooperation Boundary Theorem
- Computational Invariant Fusion Theory (CIFT)
- Constrained Synchronization of Multi-Agent Systems Using Distributed MPC
- Distributed Discontinuous Adaptive Impulsive Consensus
- Distributed Impulsive Consensus of Delayed Multi-agent Systems
- Distributed Proximal-Gradient Algorithms
- Distributed Theorem Proving with Evolutionary Strategies
- Equilibrium analysis of live-streaming e-commerce supply chain
- Event-based stochastic Lyapunov-type theorem
- Formalization of security
- Hamilton's Principle and the Invariants
- Heterogeneous Face Recognition Using Domain Invariant Units
- How does live streaming affect tourists' intention
- Live: Learning Video LLM with Streaming Speech Transcription
- Quantum-Enhanced Distributed Systems
- Privacy-preserving techniques in biometric systems
- Provable AI ethics and explainability
- The reemergence of the New World screwworm
- SCION and cross-border payments
- Securing the model context protocol (MCP)
- The Model Context Protocol in LLM Agent Architectures
- Meta-Learning for Automated Theorem Proving
- Reinforcement Learning for Automated Theorem Proving (Zenodo variants)
- Deep Reinforcement Learning for Automated Theorem Proving
- Neuro-Symbolic Programming with Reinforcement Learning for Automated Theorem Proving
- Symbolic AI for Automated Theorem Proving with Adaptive Rule Synthesis
- Self-Organizing Constraint Propagation for Automated Theorem Proving
- Formal Verification of Distributed Consensus Algorithms (Zenodo variants)
- Temporal Logic Verification of Distributed Consensus Algorithms
- Probabilistic Formal Verification of Distributed Consensus Algorithms
- Cross-Chain Interoperability: Formal Verification and Recursive Zero-Knowledge Architectures
- Operational intelligence at enterprise scale
- Six-Layer Formal Verification of a Safety-Critical AI Governance Kernel
- Deepscholar-bench
- The Role of Communication Delays in the Optimal Control of Spatially Invariant Systems
- A Proof-of-Transactions Blockchain Consensus Protocol for Large-Scale IoT
- Blockchain Technology: Consensus Protocol Proof of Work and Proof of Stake
- An efficient Proof-of-Authority consensus scheme against cloning attacks
- AF-SGS: Blockchain-assisted secure authentication framework for smart grid systems
