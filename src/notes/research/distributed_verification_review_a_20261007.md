# distributed verification literature review A
(authored by agents unless marked 🧑)

purpose
- agents turn a vague requested guarantee into a strong specification and a checked proof for executable distributed Rust
- research completed 7 October 2026 UTC
- detailed source records and reading limits

main inference
- evaluate intended meaning, proof correctness, and implementation correspondence separately
- a passing proof can establish an omitted or unintended guarantee
- a progress theorem depends on what the environment eventually does
- a checked finite model does not establish correctness for arbitrary deployments

closest Rust path
- Anvil proves controller implementation correspondence and eventual stable reconciliation
  - reconciliation means reading cluster state and trying to repair it
  - eventual stable reconciliation means reaching the target and staying there once it settles
  - [Sun et al., OSDI 2024, §4](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf)
    - “corresponds to exactly one step”
  - its proof strategy separates invariant preservation, progress between phases, and stability
  - faults eventually stop; continuously possible actions eventually run
  - its trusted model and requested-state definition still need inspection
- Welder extends this to interacting controllers
  - [Cai et al., SOSP 2026, §9](https://tianyin.github.io/pub/welder.pdf)
    - agents “still cannot completely automate”
  - CORE describes controllers making progress while respecting one another's assumptions
  - guided proof generation is reported qualitatively
    - no autonomous end-to-end success rate is established there
  - [single-controller artifact](https://github.com/anvil-verifier/anvil/tree/osdi24)
  - [composition artifact](https://github.com/anvil-verifier/anvil/tree/sosp26)
- Verus-TLA provides smaller temporal proof examples
  - [mutex example](https://github.com/anvil-verifier/verus-tla/blob/main/src/mutex_example.rs)
  - model proof under explicit fairness premises
  - no general TLA+ source-to-Rust translation proof found in this review

how humans construct proofs
- IronFleet connects abstract protocol steps to executable Dafny
  - [Hawblitzel et al., SOSP 2015, §2.5](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf)
    - “the spec for each system is trusted”
  - state-machine invariants prove forbidden events never occur
  - temporal lemmas prove chains of eventual progress
  - assumptions differ between replicated consensus and reliable transmission
- Trillium connects concurrent/distributed code to abstract executions
  - [Timany et al., POPL 2024, §5.1](https://iris-project.org/pdfs/2024-popl-trillium.pdf)
    - “manually translated”
  - STS means a state-transition system
  - arbitrary implementation steps with no visible progress can preserve safety and lose progress
  - two-phase-commit and Paxos examples transfer safety
    - the fairness-preserving progress method belongs to a separate concurrent instantiation
  - [Aneris cases](https://github.com/logsem/aneris)
- the Raft proof developed through repeated discovery of missing invariants
  - [Woos et al., CPP 2016, abstract](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf)
    - “discovering and proving 90 system invariants”
  - earlier supplied invariants and a completed proof must be distinguished
- Grove supplies realistic crash, lease and membership-change cases
  - [Sharma et al., SOSP 2023, introduction](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)
    - “Grove cannot verify liveness properties”
  - useful implementation safety cases do not establish eventual responses
- Lilo and Lawyer provide shared-memory progress cases
  - lock holders must satisfy their own release obligations
  - fair thread scheduling differs from eventual network delivery
  - [Lilo](https://iris-project.org/pdfs/2025-oopsla-lilo.pdf)
  - [Lawyer](https://iris-project.org/pdfs/2026-oopsla-lawyer.pdf)

property classification
- a request can combine forbidden events with eventual progress
  - [Alpern and Schneider, Defining Liveness, 1985, theorem 1](https://www.cs.cornell.edu/fbs/publications/DefLiveness.pdf)
    - “Every property P is the intersection”
  - theorem concerns individual execution properties
- deadlock freedom differs from starvation freedom
  - deadlock can be witnessed by a finite state with no progress possible
  - one request can starve while other requests continue
  - a deadlock check does not prove eventual service
  - source: sections 2–3 of the same paper

specification quality
- IronSpec tests allowed and forbidden cases with small proofs and mutations
  - [Goldweber et al., OSDI 2024, §5](https://www.usenix.org/system/files/osdi24-goldweber.pdf)
    - “the ultimate oracle”
  - the oracle is the person deciding what behavior should count as correct
  - it found ten specification bugs in six verified systems
  - a surviving mutation is a hint requiring interpretation
  - [artifact](https://github.com/GLaDOS-Michigan/IronSpec)
- the verified-distributed-system bug study tests assumptions at unverified boundaries
  - [Fonseca et al., EuroSys 2017, abstract](https://www.cs.purdue.edu/homes/pfonseca/papers/eurosys2017-dsbugs.pdf)
    - “16 bugs”
  - no protocol bugs were found during that investigation
    - absence of findings does not establish absence of bugs
  - disabling deduplication still passed one specification
    - authors and developers disagreed over the expected guarantee
  - one result parser accepted a failed prover as success
- AWS design checking is an industrial method example
  - [Newcombe et al., author manuscript, “The Most Frequently Asked Question”](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf)
    - “we don’t”
  - this answers whether executable code was known to implement the checked design
  - the manuscript reports useful design checks without code refinement proofs

environment assumptions as a separate result
- assumptions must be achievable by the environment regardless of system outputs
  - [Chatterjee, Henzinger and Jobstmann, CONCUR 2008, §3](https://arxiv.org/abs/0805.4167)
    - “The system cannot trivially falsify the assumption”
  - merely finding one satisfying trace is insufficient
- synthesized fairness conditions can be sufficient without being globally weakest
  - different sufficient assumptions can require incompatible system strategies
  - deleting unnecessary fairness edges yields a locally minimal set
    - no globally smallest set is promised
  - source: the same paper, §§3–6
- dynamic abstraction converts progress into safety obligations
  - [Padon et al., POPL 2018, §7](https://www.wisdom.weizmann.ac.il/~padon/reducing-liveness-to-safety-in-first-order-logic/)
    - “we manually applied our reduction”
  - supplied protocol, fairness premises and manually constructed invariants remain inputs
- temporal prophecy preserves distinctions about future behavior
  - [Padon et al., FMSD 2021, §9](https://doi.org/10.1007/s10703-021-00377-1)
    - “deep understanding of the protocol”
  - extracting prophecy from a supplied invariant differs from discovering that invariant
  - proof variables must not become extra environmental promises

automatic proof methods
- I4, IC3PO, SWISS, DistAI and DuoAI search for supporting invariants
  - user supplies the protocol model and safety requirement
  - some cases need templates, reformulated models or a human-selected hierarchy
  - finite simulations suggest candidates
    - separate induction checks establish general invariants
  - [I4](https://github.com/GLaDOS-Michigan/I4), [IC3PO](https://github.com/aman-goel/ic3po), [SWISS](https://github.com/secure-foundations/SWISS)
  - [DistAI](https://github.com/VeriGu/DistAI), [DuoAI](https://github.com/VeriGu/DuoAI)
- Sift automates proofs between human-supplied refinement layers
  - generated implementation is C++, not Rust
  - [Ma et al., ATC 2022, §8](https://www.usenix.org/system/files/atc22-ma.pdf)
    - some invariants “must currently be written manually”
  - useful baseline for agents choosing abstractions and connecting code
- LVR synthesizes decreasing measures for eventual events
  - [Yao et al., POPL 2024, §7](https://www.cs.columbia.edu/~rgu/publications/popl24-yao.pdf)
    - proof “relies on a slightly stronger fairness assumption”
  - default assumption bounds scheduling gaps by some unknown finite constant
    - ordinary fairness allows gaps to grow without bound
  - every evaluated protocol needs some user-supplied variables
  - three of forty supporting obligations need manual invariants
  - alternative ticket-lock proof handles ordinary fairness with extra guidance
  - cases include Paxos, reliable broadcast, sliding-window delivery and TLB shootdown

agent evidence
- supplied code and contracts define the target for most proof-completion results
  - [AutoVerus, §7.1](https://arxiv.org/abs/2409.13082)
    - “provided with the Rust implementation and specification”
  - 137 of 150 small tasks solved after up to three complete attempts
- real systems proof tasks remain smaller than complete repositories
  - [VeruSAGE, §3](https://arxiv.org/abs/2512.18436)
    - “we do not change the pre- and post-conditions of F”
  - dependency proof bodies can be trusted in extracted tasks
  - solving selected functions does not establish a complete repository proof
- specification generation needs an independent meaning check
  - [SpecGym, §2.2](https://arxiv.org/abs/2605.26457)
    - “This makes faithfulness evaluation an approximation”
  - valid-input, invalid-input, valid-output and invalid-output tests cover different errors
  - [CLEVER, abstract](https://arxiv.org/abs/2505.13938)
    - “matches a held-out ground-truth specification”
  - formal comparison is stronger than finite examples
    - the reference's agreement with intent remains trusted
- system modeling needs a separate implementation correspondence score
  - [SysMoBench](https://github.com/specula-org/SysMoBench)
  - matching existing code differs from satisfying desired behavior
  - [Specula](https://github.com/specula-org/Specula)
  - generated failing schedules are reproduced in actual code
  - only 0.90% of its generated properties are temporal liveness properties
    - most progress checking is deadlock detection
    - source: paper evaluation, page 10, [primary paper](https://arxiv.org/abs/2607.25333)
    - finding a concrete fault differs from proving all executions correct
- repository proof evaluations protect goals and check added axioms
  - [Vero, §3.1](https://arxiv.org/abs/2608.13522)
    - “an axiom allowlist rejects proofs that depend on agent-introduced or untrusted axioms”
  - reusable helper lemmas and shared specifications matter across functions

case database
  - 127 source-reviewed system/property or case-family entries
  - grouped cases and repeated systems retained
  - catalog-only evidence distinguished from inspected property statements
  - 81 case directories, 424 modules, 233 declared model configurations
  - 73 modules have declared proof metadata
  - repository revision recorded; checks not rerun
  - named properties and finite bounds preserved
  - theorem excerpts are headers only
    - exact assumptions and conclusions require opening the source
- concrete progress target
  - [EWD998 asynchronous termination detection](https://github.com/tlaplus/Examples/tree/6a7b26a31c1a6aeec789b455e9bbfa3b3ad2728f/specifications/ewd998)
  - temporal proof inspected under invariant and weak-fairness premises
- implementation case families
  - replicated state machines, sharded key-value stores and reliable transmission
  - controller reconciliation and controller composition
  - causal memory and session guarantees
  - crash-safe storage, leases and reconfiguration
  - parser/serializer agreement, persistent logs and page tables
  - lock progress, finite-interference stacks and recurring message passing
  - probability-one termination is a separate guarantee

proposed evaluation
- freeze authoritative requested properties outside agent-writable files
- check the specification accepts intended behaviors and rejects forbidden behaviors
- score environmental assumptions separately
  - delivery, timing, scheduling, crashes, membership and adversary capabilities
- report safety and progress separately
- report code-to-model correspondence separately
- test known bad implementations and altered failure assumptions
- allow an impossibility or missing-assumption answer with checked evidence
- record attempt budget, model, cost, tool versions and human guidance
- report one function, one obligation, one module and one repository as different units
- retain complete failed checks
  - a timeout or prover crash is not success

limits
- no claim of exhaustive literature or case coverage
- search services failed and no browser renderer was connected
- primary publisher/author retrieval and repository/reference following worked
- reported success rates and performance were not reproduced
- full and selective reading counts appear in the detailed source records
- filenames sometimes retain historical title/year errors
  - actual cover/version metadata is explained in the records

consultation and first experiments
- ChatGPT Extra High completed a focused critique
  - “treat assumptions as a first-class output”
  - source citations remain leads until independently checked
- my recommendation after that critique
  - begin with a small mutual-exclusion and progress task
  - change scheduler rules, message loss and starvation behavior independently
  - add paired failover and commit protocols next
  - withhold semantic variants, not only renamed copies
  - allow retrieval of general libraries while excluding the exact task proof
  - score whether the affected assumptions, invariants and conclusions change correctly
  - require checked counterexamples for impossible variants where feasible
- no experiments were run by this literature-review task

intent and assumption checks
- ARTEMIS distinguishes candidate meanings with example executions
  - evaluation simulates users with expert formulas
  - expert candidates are injected for validation-effort measurements
  - candidate coverage differs from autonomous selection of the intended meaning
- FRET checks whether an implementation can satisfy requirements against allowed inputs
  - removing initialization can hide a conflict by making its mode unreachable
- eventual network stabilization permits an arbitrarily late start of useful progress
  - a fixed startup deadline requires another assumption
- secret-independent output compares multiple executions
  - ordinary single-execution refinement can lose that guarantee
- total scholarly reading coverage
  - 74 sources including a book and short note
  - 15 complete main-text readings
  - 58 selective readings and one abstract-only entry
  - standalone artifact readings are additional
