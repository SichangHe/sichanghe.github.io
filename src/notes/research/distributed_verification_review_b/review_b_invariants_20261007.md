protocol invariant discovery and benchmark cases
(authored by agents unless marked 🧑)

- an invariant is a statement that holds throughout execution
  - an inductive invariant holds initially and remains true after every allowed step
  - the tools below mainly find stronger invariants that imply a requested safety property
  - they start from a formal protocol and a formal property
  - my inference: they can supply the proof-search part of the requested intent-to-proof system, but do not establish that an agent interpreted a vague human request correctly


what to reuse first

- DuoAI supplies 27 small protocol models and an independently callable Ivy checker
  - Endive supplies TLA+ models, candidate invariants, and example TLAPS proofs
  - Basilisk supplies Dafny models with arithmetic and collections that need not fit restricted first-order logic
  - IC3Syn adds a directly relevant 2026 LLM experiment
  - keep these as separate tracks: their input languages, permitted human hints, and proof completion requirements differ

- evidence and download locations follow
  - quotes refer to the printed page or named section
  - numbers are authors' reported results, not reruns on this machine
  - no experiments were run for this review


papers inspected

- DistAI: Data-Driven Automated Invariant Learning for Distributed Protocols
  - Jianan Yao, Runzhou Tao, Ronghui Gu, Jason Nieh, Suman Jana, Gabriel Ryan; OSDI 2021. [Paper](https://www.usenix.org/conference/osdi21/presentation/yao), [artifact](https://github.com/VeriGu/DistAI)
  - it simulates small instances, enumerates candidate formulas, then weakens candidates until their conjunction passes the checker
  - abstract, printed p.405: “DistAI successfully verifies 13 common distributed protocols automatically”
  - its guarantee concerns formulas without existential quantifiers; an existential statement says some suitable object exists
  - inference: useful cheap baseline, but a poor sole backend for richer specifications

- DuoAI: Fast, Automated Inference of Inductive Invariants for Verifying Distributed Protocols
  - Jianan Yao, Runzhou Tao, Ronghui Gu, Jason Nieh; OSDI 2022. [Paper](https://www.usenix.org/conference/osdi22/presentation/yao), [artifact](https://github.com/VeriGu/DuoAI)
  - runs two complementary refinement searches and supports existential statements
  - evaluation, printed p.496: “solving all but 1 of the 27 protocols”
  - the unsolved case is Vertical Paxos; the evaluation permits a week per tool and protocol
  - the conditional search-completeness claim is not a guarantee of practical runtime
  - inference: use its models and checker before spending LLM tokens on examples already solved by conventional search

- Finding Invariants of Distributed Systems: It’s a Small (Enough) World After All
  - Travis Hance, Marijn Heule, Ruben Martins, Bryan Parno; NSDI 2021. [Paper](https://www.usenix.org/conference/nsdi21/presentation/hance), [artifact](https://github.com/secure-foundations/SWISS)
  - SWISS searches bounded formula templates, using counterexamples to reject candidates
  - introduction, printed p.116: “around 4 hours on an 8-core machine”; with guidance, “the time decreases to 20 minutes”
  - these are Paxos results, not all protocols
  - inference: formula templates are both an effective search hint and a possible source of benchmark leakage
  - artifact README explicitly warns that unfinished output may not be an invariant; retain only independently checked results

- On Symmetry and Quantification: A New Approach to Verify Distributed Protocols
  - Aman Goel, Karem Sakallah; NFM 2021. [Paper](https://arxiv.org/abs/2103.14831), [tool](https://github.com/aman-goel/ic3po), [experiment artifact](https://github.com/aman-goel/nfm2021exp)
  - IC3PO learns from finite instances and uses symmetry to produce quantified formulas for arbitrary instance sizes
  - introduction, manuscript p.2: “we exclusively focus on protocols whose sorts represent sets of indistinguishable domain constants.” This paper's scope excludes ordered sorts and arithmetic; later work extends it
  - inference: do not equate finding a finite-instance invariant with proving an arbitrary-size system unless the generalization check succeeds

- Towards an Automatic Proof of Lamport’s Paxos
  - Aman Goel, Karem A. Sakallah; FMCAD 2021. [Paper](https://arxiv.org/abs/2108.08796), [tool](https://github.com/aman-goel/ic3po)
  - extends IC3PO with ordered-domain reasoning and a hierarchy of abstract protocols
  - figure 1, manuscript p.1: “Each level uses all strengthening assertions above that level as input”
  - inference: the abstraction hierarchy belongs in evaluation's human-input accounting; automatic discovery inside a supplied hierarchy differs from inventing the hierarchy from a vague goal

- Plain and Simple Inductive Invariant Inference for Distributed Protocols in TLA+
  - William Schultz, Ian Dardik, Stavros Tripakis; FMCAD 2022. [Paper](https://arxiv.org/abs/2205.06360), [artifact](https://github.com/will62794/endive), [archived artifact](https://doi.org/10.5281/zenodo.6994922)
  - Endive generates candidate formulas from a supplied grammar and uses sampled counterexamples to induction
  - artifact README, example usage: “not necessarily a true inductive invariant”; “you will need to use TLAPS”
  - appendix Table III distinguishes automatically discharged obligations from those needing help
  - inference: report candidate discovery separately from unbounded proof completion

- Inductive Invariants That Spark Joy: Using Invariant Taxonomies to Streamline Distributed Protocol Proofs
  - Tony Nuda Zhang, Travis Hance, Manos Kapritsos, Tej Chajed, Bryan Parno; OSDI 2024. [Paper](https://www.usenix.org/conference/osdi24/presentation/zhang-tony), [Kondo](https://github.com/GLaDOS-Michigan/Kondo)
  - Kondo separates protocol reasoning from message, ownership and monotonicity facts, then helps transfer a simpler synchronous proof to an asynchronous model
  - table 1, printed p.848, Paxos row: “631 ... 27 ... 20 ... 856 ... 557 ... 220”
  - Column context: 631 model lines; 27 manually supplied invariant clauses without Kondo versus 20 synchronous clauses; 856 proof lines without Kondo versus 557 synchronous proof lines plus 220 modified proof lines
  - section 6.5, p.849: “liveness proofs are beyond its scope.” inference: taxonomy is a useful agent checklist; line counts are not measured human hours

- Basilisk: Using Provenance Invariants to Automate Proofs of Undecidable Protocols
  - Tony Nuda Zhang, Keshav Singh, Tej Chajed, Manos Kapritsos, Bryan Parno; OSDI 2025. [Paper](https://www.usenix.org/conference/osdi25/presentation/zhang-tony), [artifact](https://github.com/GLaDOS-Michigan/Basilisk), [archive](https://zenodo.org/records/15392830)
  - Derives facts connecting a host's values to the steps that produced them
  - evaluation Table 1, printed p.11, Paxos row: “418 ... 0 ... 5 ... 0 ... 444 ... 486 ... 24.6”
  - context: 418 model lines, no user invariant clauses, five monotonicity annotations, no provenance hints, 444 safety-lemma lines, 486 total proof lines, 24.6 verification seconds
  - section 6.2, printed p.11: “write additional proof code”
  - inference: invariant discovery can be automatic while proving that those invariants imply the requested property still takes substantial work
  - section 7: safety specification and correspondence to implementation remain trusted; liveness is outside scope

- Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models
  - Weining Cao, Guangyuan Wu, Yuan Yao, Hengfeng Wei, Taolue Chen, Xiaoxing Ma; arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2605.24619)
  - IC3Syn asks an LLM for clauses that exclude counterexamples inside an IC3 controller, rather than asking for one complete invariant
  - table 1 caption, manuscript p.9: “default IC3Syn configuration (Claude Opus 4.6)”; section 6.2: “29 of 29”
  - section 7.2, p.11: “only on finite instances”
  - authors also report TLAPS completion for discovered invariants, but automated TLAPS discharge is future work
  - section 9, p.12, attempted agents: “premature stopping and high latency”
  - inference: reproduce both discovery and final proof, and distinguish the specialized controller from unattended general-purpose agents
  - I did not establish a public reproducible code artifact from the paper

- Sift: Using Refinement-guided Automation to Verify Complex Distributed Systems
  - Haojun Ma, Hammad Ahmad, Aman Goel, Eli Goldweber, Jean-Baptiste Jeannin, Manos Kapritsos, Baris Kasikci; USENIX ATC 2022. [Paper](https://www.usenix.org/conference/atc22/presentation/ma), [artifact](https://github.com/GLaDOS-Michigan/Sift)
  - uses IC3PO inside user-supplied refinement layers and extracts executable implementations from Ivy
  - table 1, printed p.159: Raft proof effort “1 person-month”; MultiPaxos effort “3 person-weeks”
  - Six cases: Leader Election, Distributed Lock, Two-Phase Commit, Sharded Hash Table, Raft, MultiPaxos
  - section 7 restricts the results to crash failures and safety
  - inference: directly useful for the model-to-implementation part of the project; automatically finding layer invariants does not eliminate designing the layers

- Interpretable Safety Verification of Distributed Protocols by Inductive Proof Decomposition
  - William Schultz, Edward Ashton, Heidi Howard, Stavros Tripakis; inspected author draft, 2025. [Preprint lineage](https://arxiv.org/abs/2404.18048), [Scimitar](https://github.com/will62794/scimitar)
  - the downloaded draft has a different title from earlier and later records; its placeholder conference header does not establish a publication venue
  - breaks a proof into a graph of lemmas and transitions, exposing where further guidance is needed
  - section 5.1, manuscript p.9: “21 hours, consisting of 33 total lemma nodes”; its grammar has “173 predicates”
  - target: Raft LogMatching, meaning overlapping log entries with the same term and index have matching prefixes
  - Model is modified from published Raft specifications and is about 600 TLA+ lines
  - inference: a stronger scaling case than miniature leader-election models, but one property of an edited model must not be advertised as complete Raft verification

- Paxos Made EPR: Decidable Reasoning about Distributed Protocols
  - Oded Padon, Giuliano Losa, Mooly Sagiv, Sharon Shoham; OOPSLA 2017. [Paper](https://arxiv.org/abs/1710.07191), [Ivy examples](https://github.com/kenmcmil/ivy/tree/master/examples)
  - EPR is a restricted logical language whose satisfiability can be decided; the paper shows how to reformulate Paxos models and invariants to fit it
  - abstract: “systematically transforming the model”; those transformations preserve the original protocol's behavior
  - cases: Paxos, Multi-Paxos, Vertical Paxos, Fast Paxos, Flexible Paxos, Stoppable Paxos
  - inference: agents may need to invent auxiliary relations and abstractions before existing search tools become useful; count this modeling work as part of the task

- Veil: A Framework for Automated and Interactive Verification of Transition Systems
  - George Pîrlea, Vladimir Gladshtein, Elad Kinsbruner, Qiyuan Zhao, Ilya Sergey; CAV 2025. [Paper](https://verse-lab.org/papers/veil-cav25.pdf), [artifact snapshot](https://github.com/verse-lab/veil/tree/4820f53)
  - Lean framework checking supplied invariants with SMT and interactive proofs
  - section 4.1, manuscript p.8: “85 actions and 185 invariants”
  - the evaluation checks sixteen cases rather than discovering their invariants
  - complete cases: Blockchain, ChordRingMaintenance, DecentralizedLock, MultiSigAll, MultiSigMajority, PaxosEPR, PaxosFirstOrder, Rabia, ReliableBroadcast, RicartAgrawala, Ring, SCP, SuzukiKasami, SuzukiKasamiInts, TwoPhaseCommit, VerticalPaxosFirstOrder
  - RabiaMore and SCPTheory supply supporting proofs
  - exact per-case targets and source pointers are retained in the companion review in the experiment directory

- DissProve: Automated Verification of Asynchronous Distributed Protocols with Affine Communication
  - Christian Fontenot, Gowtham Kaki, Bor-Yuh Evan Chang; arXiv 2026. [Paper](https://arxiv.org/abs/2606.24003)
  - works backward from a forbidden state in P actor programs, with bounded communication rounds but unbounded actors
  - section 6, manuscript p.22: “No additional user-provided specifications or invariants are needed”
  - this assumes the forbidden state is already specified
  - table 1 has One-Shot Election (56 source lines), Bakery (99), Dekker’s Algorithm (68), Drinking Philosophers (58), Two-Phase Commit (55), Barrier Lock (49), Atomic Broadcast (80)
  - the paper labels the first, fifth and seventh consensus targets and the remainder exclusion targets
  - no public benchmark artifact was established in the companion review
  - inference: promising alternative to global-invariant search for its supported class; not evidence of arbitrary distributed-system automation

- a documented LLM failure as an evaluation case
  - Ilya Sergey, [“Verifying Distributed Protocols in Veil,” February 9, 2026](https://proofsandintuitions.net/2026/02/09/distributed-verification-veil/), reports Claude Code discovering FloodSet agreement/validity invariants using checker feedback
  - concluding remarks: “missing crucial parts, making them vacuously correct but also useless.” The faulty model grouped all crashes with broadcast and omitted partial message delivery, making agreement immediate
  - inference: preserve this as an adversarial specification test; a proof checker cannot reject an inaccurately easy model merely because the human intended a harder one
  - this author account is a case study, not a comparative paper score


concrete reusable cases

- [27 exact Ivy targets](review_b_invariant_cases_20261007.csv) records all 27 DuoAI input models, the exact property declarations with local line numbers, public source links, line counts, tool and paper
  - these declarations are specifications of safety targets; a file's presence is not proof that its target was solved
  - the paper reports Vertical Paxos unsolved
  - raw source line counts in the CSV include comments and whitespace and differ from the paper's code counts
  - person-hours were not reported in the inspected evaluation

- the complete DuoAI names, from its `protocols/protocol_description.md`, are: chord_ring_maintenance, consensus_forall, consensus_wo_decide, database_chain_replication, decentralized_lock, distributed_lock, ring_leader_election, learning_switch_ternary, learning_switch_quad, lock_server_async, lock_server_sync, sharded_key_value_store, ticket_lock, toy_consensus_forall, two_phase_commit, client_server_ae, client_server_db_ae, consensus_epr, hybrid_reliable_broadcast, sharded_kv_no_lost_keys, toy_consensus_epr, paxos, flexible_paxos, multi_paxos, stoppable_paxos, fast_paxos, vertical_paxos. [Full descriptions](https://github.com/VeriGu/DuoAI/blob/master/protocols/protocol_description.md)

- plain-language reading of these targets, with exact declarations retained in the CSV: lock protocols prevent simultaneous ownership; election and consensus models prevent conflicting leaders or decisions; two-phase commit prevents inconsistent commit/abort outcomes; sharded stores prevent conflicting ownership or lost keys; request/response examples require matching responses; Paxos variants prevent conflicting chosen values; the listed Stoppable Paxos target enforces agreement per instance, while stopping later instances is separate model behavior
  - these summaries are interpretations of the formal targets, not added liveness claims

- SWISS Table 1 has 28 rows because one Multi-Paxos encoding is repeated; section 5.4 says “27 benchmarks”
  - complete rows: sdl, ring-election, learning-switch-ternary, lock-server-sync, two-phase-commit, chain, chord, distributed-lock, toy-consensus-forall, consensus-forall, consensus-wo-decide, learning-switch-quad, lock-server-async, sharded-kv, ticket, toy-consensus-epr, consensus-epr, client-server-ae, client-server-db-ae, sharded-kv-no-lost-keys, hybrid-reliable-broadcast, paxos, flexible-paxos, multi-paxos, multi-paxos*, fast-paxos, stoppable-paxos, vertical-paxos. [Inputs and configs](https://github.com/secure-foundations/SWISS/tree/master/benchmarks)
  - preserve the duplicate encoding: collapsing names conceals different proof difficulty

- Kondo Table 1's ten cases: Echo Server, Ring Leader Election, Simplified Leader Election, Two-Phase Commit, Paxos, Flexible Paxos, Distributed Lock, ShardedKV, ShardedKV-Batched, Lock Server. [Models and proofs](https://github.com/GLaDOS-Michigan/Kondo)
  - Basilisk's sixteen cases include those ten plus Paxos-Combined, Paxos-Dynamic, Three-Phase Commit, Reduce, Raft Leader Election, Multi-Paxos. [Models and safety lemmas](https://github.com/GLaDOS-Michigan/Basilisk/tree/main/basilisk)
  - these are crash-fault safety examples; Raft Leader Election does not stand for complete Raft verification

- Endive's original Table II has 30 named rows: tla-consensus, tla-tcommit, i4-lock-server, ex-quorum-leader-election, pyv-toy-consensus-forall, tla-simple, ex-lockserv-automaton, tla-simpleregular, pyv-sharded-kv, pyv-lockserv, tla-twophase, i4-learning-switch, ex-simple-decentralized-lock, i4-two-phase-commit, pyv-consensus-wo-decide, pyv-consensus-forall, pyv-learning-switch, i4-chord-ring-maintenance, pyv-sharded-kv-no-lost-keys, ex-naive-consensus, pyv-client-server-ae, ex-simple-election, pyv-toy-consensus-epr, ex-toy-consensus, pyv-client-server-db-ae, pyv-hybrid-reliable-broadcast, pyv-firewall, ex-majorityset-leader-election, pyv-consensus-epr, mldr
  - two entries have n/a for Endive; a row is not necessarily a successful proof. [Models](https://github.com/will62794/endive/tree/master/benchmarks)

- IC3Syn Table 1 keeps 28 shared TLA+ cases by omitting i4-chord-ring-maintenance and pyv-hybrid-reliable-broadcast, and adds pyv-paxos-epr
  - it calls the added case one complex Paxos encoding
  - its mldr case concerns MongoDB logless dynamic reconfiguration
  - inference: evaluate held-out protocol families, not random file splits among nearly identical consensus encodings


disagreements worth retaining

- DuoAI's Table 1 footnote challenges some IC3PO results, saying the authors “retrofitted the protocols” and “manually provided clauses with quantifier alternation”
  - IC3PO's own later Paxos paper explicitly describes hierarchical strengthening
  - I have not rerun the contested artifacts
  - record supplied abstractions, auxiliary relations, clauses, templates, and checker failures rather than deciding which aggregate leaderboard is correct from the papers alone


evaluation implications and missing work

- my recommendation: require the same fixed protocol semantics and target property across methods; record every human hint; measure checked proof completion, cost and failure category
  - include tests where weakening the goal makes the proof easy but violates the human request
  - split safety from liveness, bounded checking from arbitrary-size proofs, protocol correctness from Rust implementation refinement, and discovery from proof writing
  - this slice establishes reusable safety corpora, not a benchmark for generating trustworthy specifications from vague requests

- search coverage: inspected inherited research logs, current checked-out artifacts, paper PDFs and their cited work; attempted web search tool, which failed with HTTP 404
  - primary PDFs remained accessible through direct download
  - search leads not fully resolved here: I4 (Haojun Ma, Aman Goel, Jean-Baptiste Jeannin, Manos Kapritsos, Baris Kasikci, Karem Sakallah; SOSP 2019), First-order Quantified Separators / FOL-IC3 (Jason R. Koenig, Oded Padon, Neil Immerman, Alex Aiken; PLDI 2020), P-FOL-IC3, primal-dual Houdini, cutoffs and liveness synthesis
  - their names occur in inspected primary references; I do not supply unverified performance claims
  - CI ll/CIll (arXiv:2602.23389) was inspected and is a hardware/RISC-V benchmark, not a distributed-protocol corpus
  - Ivy and mypyvy are input/checking infrastructure for several corpora, not themselves evidence of intent-to-proof automation

- collection accounting: fourteen principal papers inspected above; two PDFs newly saved (SWISS and Paxos Made EPR), twelve already present
  - exact proof-assistant trust boundaries, standalone per-case properties for Kondo/Basilisk, and independent reproduction remain gaps
  - the machine's saved materials make those follow-ups possible

