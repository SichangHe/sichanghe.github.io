model checking distributed systems, and checking code against its spec
(authored by agents unless marked 🧑)

- evidence scope: primary sources rechecked in this update are listed near the end
  - inherited snippet claims remain reading leads, not independently verified results

the problem in one paragraph

- distributed bugs can depend on rare orders of messages, crashes and timeouts
- systematic search explores alternative orders within a specified model and bounds
- model checking a specification can expose design errors
- controlling real-code execution can expose implementation errors
  - intercepted operations and simulated failures still define its coverage
  - real-code execution does not remove assumptions about the environment
- conformance checking connects a model with observed or controlled code behavior
  - passing finite traces does not prove correctness for arbitrary executions

how it works

- spec level: write a state machine in TLA+ or P, then TLC, Apalache, or the P checker explores its states
- implementation level: put a layer under the real binaries that intercepts messages, crashes, and thread switches, then drives them in a systematic order (MoDist, SAMC, FlyMC, Coyote)
    - state explosion is the main enemy, so each tool brings its own pruning trick
- spec to code agreement
    - trace validation: log real runs, then ask TLC whether some spec behavior matches the log
    - model guided testing: enumerate spec behaviors, then replay each one against the code (Mocket, SandTable, MongoDB's MBTCG)
    - compile the spec to code (PGo), or write the code inside the checker (Stateright)
- 2025 to 2026 addition: LLM agents write the TLA+ spec from code, then model check it (Specula, SysMoBench)

the main papers and systems

spec level, in industry

- [Apalache README](https://github.com/apalache-mc/apalache), inspected 2026-10-07
    - translates supported TLA+ constructs into logical constraints
    - quote: "check safety of bounded executions"
    - can also check whether an invariant is preserved by transitions for fixed or bounded parameters
    - distinguishes bounded execution checks from invariant checks
    - inference: read the check mode and parameter assumptions before interpreting a pass
        - a bounded search alone does not prove every system size and execution

- [How Amazon Web Services Uses Formal Methods](https://cacm.acm.org/magazines/2015/4/184701-how-amazon-web-services-uses-formal-methods/fulltext), CACM 2015
    - an industry account of using TLA+ to check distributed-system designs
    - authors report TLA+ on 10 large systems, and it helped in every one
    - "in every case TLA+ added significant value" (snippet)
- [Systems Correctness Practices at Amazon Web Services](https://cacm.acm.org/practice/systems-correctness-practices-at-amazon-web-services), CACM / ACM Queue 2025
    - later account of AWS correctness practices and P adoption
      - P originated at Microsoft
    - authors report S3 used P for its strong consistency launch
    - "many struggled to learn and become productive with TLA+" (snippet)
- [P language](https://github.com/p-org/P), Microsoft then AWS, open source
    - you write communicating state machines, then the checker explores message orderings
    - "express system designs as communicating state machines and systematically check for correctness before implementation" (snippet)
- [eXtreme Modelling in Practice](https://arxiv.org/abs/2006.00915), PVLDB 2020, MongoDB
    - two ways to check code against TLA+: trace checking on the server's replication, and test generation for Realm Sync
    - authors report trace checking was impractical and test generation worked well
    - they found MBTC "impractical" for a highly abstract spec, while MBTCG was "highly successful" (snippet)
- [Conformance Checking at MongoDB](https://mongodb.com/company/blog/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs), MongoDB blog 2025
    - A. Jesse Jiryu Davis looks back on the 2020 paper and on five years of progress in the field
    - worth reading first if you want the practitioner view

implementation level model checkers

- [CMC: A Pragmatic Approach to Model Checking Real Code](https://www.usenix.org/legacy/events/osdi02/tech/musuvathi.html), Musuvathi et al., OSDI 2002
    - checks C and C++ implementations directly
    - author quote, abstract: "We found 34 distinct errors"
      - population: three implementations of the AODV routing protocol
    - model-code disagreement motivated implementation checking long before recent trace tools

- [MoDist](https://www.usenix.org/conference/nsdi-09/modist-transparent-model-checking-unmodified-distributed-systems), NSDI 2009
    - checks unmodified binaries through a thin layer that intercepts their calls
    - authors report 35 bugs in Berkeley DB, a Paxos implementation, and a primary backup system
    - "the first model checker designed for transparently checking unmodified distributed systems running on unmodified operating systems" (snippet)
- [MaceMC](https://www.usenix.org/legacy/events/nsdi07/tech/killian/killian_html/index.html), NSDI 2007
    - finds liveness bugs (the system never makes progress) in Mace code. Runs random walks after exhaustive search stops
    - "the first software model checker that helps programmers find liveness violations in complex systems implementations" (snippet)
- [CrystalBall](https://www.usenix.org/event/nsdi09/tech/full_papers/yabandeh/yabandeh_html/), NSDI 2009
    - each live node model checks a snapshot of its neighbors to predict a safety violation before it happens
    - "nodes predict distributed consequences of their actions" (snippet)
- [SAMC](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/leesatapornwongsa), OSDI 2014
    - uses a little system knowledge (which messages commute, for example) to prune orderings, so it can try several crashes at once
    - "existing distributed system model checkers rarely exercise multiple failures due to the state-space explosion problem" (snippet)
- [FlyMC: Highly Scalable Testing of Complex Interleavings in Distributed Systems](https://ucare.cs.uchicago.edu/pdf/eurosys19-flyMC.pdf), Lukman et al., EuroSys 2019
    - combines state symmetry, event independence and parallel flips to reduce execution search
    - authors evaluate eight datacenter systems and report a mean 16× speedup against evaluated alternatives
      - benchmark result, not a universal speedup
    - author quote, abstract: "successfully reproduced 12 old bugs, and found 10 new bugs"
- [Coyote](https://github.com/microsoft/coyote), Microsoft, open source
    - controls task and actor scheduling in C# tests so concurrency bugs reproduce every time
    - Microsoft says it has "found hundreds of concurrency-related bugs" in Azure services ([project page](https://www.microsoft.com/en-us/research/project/coyote/), snippet)
- [Stateright](https://github.com/stateright/stateright), open source Rust
    - you write actors in Rust, model check them, then run the same code on a real network
    - "systems implemented using Stateright can be run on a real network without being reimplemented in a different language" (snippet)
    - closest existing thing to your TLA+ to verified Rust direction on the model checking side

checking code against a spec

- [Mocket: Model Checking Guided Testing for Distributed Systems](https://dl.acm.org/doi/10.1145/3552326.3587442), Wang, Dou, Gao et al., EuroSys 2023 ([code](https://github.com/tcse-iscas/Mocket))
    - takes paths that TLC explores in a TLA+ spec, then forces the real Java system down each path, using annotations that map code to spec actions
    - venue settled: the ACM DOI is in the EuroSys 2023 proceedings; the brief's "ICSE 2023" was wrong
    - a TLA+ mailing list user reports running out of 18 GB of memory on 4 nodes and 4 rounds ([thread](https://discuss.tlapl.us/msg05493.html), snippet)
- [iMocket: Model Checking Guided Incremental Testing for Distributed Systems](https://conf.researchr.org/details/issta-2025/issta-2025-papers/14/Model-Checking-Guided-Incremental-Testing-for-Distributed-Systems), Gao, Wang, Dou, Feng, Liang, Feng, Wei, ISSTA 2025
    - same group; when the spec or code changes, only re-test the abstract states the change touches
    - authors' motivation: "testing a distributed system with MCGT is often costly and can take weeks to complete"
    - "iMocket can reduce the number of test cases by 74.83%" on "12 real-world change scenarios drawn from three popular distributed systems"
- SandTable: Scalable Distributed System Model Checking with Specification-Level State Exploration, Tang, Sun, Huang, Wei, Ouyang, Ma, EuroSys 2024
    - explores states at spec level but runs the real system, then uses conformance checking to keep spec and code in sync
    - I saw it only in citations and a dblp listing; I did not open the paper or find an open PDF
- [Model-based Testing of Practical Distributed Systems in Actor Model](https://arxiv.org/abs/2512.08698), Kokorin, Chernatskiy, Aksenov, arXiv 2025
    - exhaustive test suite from a finite state model, no code changes needed, applied to a Viewstamped Replication implementation
    - "our approach does not require any modifications to the code or interfering with the distributed system execution environment"
- [Formal Model Guided Conformance Testing for Blockchains](https://arxiv.org/abs/2501.08550), Drobnjakovic et al., arXiv 2025
    - a formal model plus a deterministic blockchain simulator, used both ways: model generates traces the implementation must accept, and implementation traces the model must accept
    - "Our insight is that both workflows are needed to detect all types of violations."
- [Validating Traces of Distributed Programs Against TLA+ Specifications](https://arxiv.org/abs/2404.16075), arXiv 2024 (Cirstea, Kuppe, Loillier, Merz)
    - log only the variables you care about from a Java run, then TLC checks whether the log fits the spec
    - authors report mismatches between spec and code "in all cases" they tried
    - "traces only contain updates to specification variables rather than full values"
    - TLA+ docs have a [trace validation page](https://docs.tlapl.us/using:tlc:trace_validation), and etcd raft ships trace logging so maintainers can validate it against TLA+
- [Multi-Grained Specifications for Distributed System Model Checking and Verification](https://arxiv.org/abs/2409.14301), EuroSys 2025, ZooKeeper
    - writes each module at both a detailed and a coarse level, then mixes them per scenario: detailed for changed code, coarse for the rest
    - authors report 6 severe bugs, with fixes merged into ZooKeeper
    - "compose them into mixed-grained specifications based on specific scenarios"
- [PGo](https://www.cs.ubc.ca/~bestchai/papers/asplos23-pgo.pdf), ASPLOS 2023
    - modular PlusCal splits the system model from its environment model. PGo turns one source into TLA+ for checking and into Go for running
    - authors report a checked Raft model and implementation in under 1 person month, "3× less time than Ivy" (snippet)
    - the [PGo project page](https://systopia.cs.ubc.ca/pgo) says a follow-up with automated trace validation was accepted at OOPSLA 2025 (search snippet; I did not open that paper); PGo targets Go, I found no Rust backend

LLMs writing specs, 2025 to 2026

- [SysMoBench](https://arxiv.org/abs/2509.23130), ICLR 2026
    - benchmark: can an LLM write a TLA+ model of real code (etcd raft, Redis raft, ZooKeeper election, Asterinas locks)?
    - scores syntax, running, conformance to code via traces, and invariants
    - "the first framework that evaluates AI on formally modeling real-world systems" (snippet)
- [Specula](https://arxiv.org/abs/2607.25333), arXiv July 2026 (Cheng, ..., Beschastnikh, Huang, Xu)
    - LLM agents write TLA+ specs from system code, then model check them in self correcting loops
    - [LLM study](llm_agents_for_distributed_bugs.md) distinguishes reported reproductions, upstream confirmations, and fixes
    - substantial prior work for proposals about agent-generated formal models
- [TLA+-Bench](https://arxiv.org/abs/2607.23425), Bisharat et al., arXiv 2026
    - 403 model-checked reference specs; grades by running TLC, not by similarity
    - its main finding is about measurement: "Varying only the grading choices earlier benchmarks leave unstated, on one fixed set of model outputs, the correct rate moves sixfold, from 10.0% to 1.7%"
    - "Every model writes valid TLA+ far more often than correct TLA+: the strongest is correct 16% of the time by default"
- [TLA-Prover](https://arxiv.org/abs/2606.06133), Spencer et al., ICSOFT 2026
    - a 20B model fine-tuned with TLC as the reward; "TLA-Prover reaches 9/30 (i.e. pass@1 = 30%) at both Gold and Diamond on a held-out 30-problem benchmark"
    - nice trick worth copying: the "Diamond" tier mutates the property and requires TLC to catch it, so always-true properties do not count
- [JS-SAM on SysMoBench](https://arxiv.org/abs/2607.13092), Dubray, arXiv 2026
    - asks whether executable JavaScript can serve as the spec language instead of TLA+; single author, 34 pages
    - "conformance against the real system is the only phase that discriminates among models"
- Specula won the TLA+ Foundation's 2025 GenAI-accelerated TLA+ Challenge (search snippet); the paper says "Specula has been used by several companies" without naming them
- [Can LLMs Write Correct TLA+ Specifications?](https://arxiv.org/abs/2606.05792), arXiv 2026
    - tests 30 LLMs on 205 specs written from English descriptions
    - "up to 26.6% syntactic correctness but only 8.6% semantic correctness"
    - "current LLMs do not generate reliable TLA+ specifications without expert oversight"
    - verify the evaluated model versions before extrapolating to current models

what is used in industry

- AWS: TLA+ since 2011, P since 2019, S3 strong consistency ([CACM 2025](https://cacm.acm.org/practice/systems-correctness-practices-at-amazon-web-services))
- MongoDB: TLA+ specs plus conformance checking ([blog](https://mongodb.com/company/blog/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs))
- Microsoft Azure: Coyote ([project page](https://www.microsoft.com/en-us/research/project/coyote/))
- etcd: TLA+ spec and trace validation for its raft library (seen in search results)
- ZooKeeper: fixes from the Multi-Grained work were merged ([arXiv](https://arxiv.org/abs/2409.14301))
- Specula authors report use by several companies
    - deployment scope and independent effectiveness remain unverified

known gaps and open problems

- size limits depend on model, implementation, workload and bounds
    - the cited Mocket memory report is one user's configuration, not a universal four-node limit
- detail vs scale. Detailed specs explode in size and coarse specs drift from the code. Multi-Grained calls this balance "the fundamental challenge"
- trace checking abstract specs is hard. MongoDB found it impractical in 2020 because the code's state did not map cleanly to the abstract spec
- writing specs costs a lot. SysMoBench says formal models are "notoriously expensive to write and maintain" (snippet). LLMs still get semantics wrong (8.6% in the 2026 eval)
- implementation level checkers are tied to a language or runtime (MoDist on Windows, Coyote on .NET, Stateright on its actor API)

research proposals
- model fidelity, model updates and instrumentation experiments are consolidated in [research directions, candidate 2](research_directions.md)
- distinct local idea: audit rules that skip supposedly equivalent event orders
  - closest work: MODIST, SAMC and FlyMC
  - question: which incorrect independence rules hide actual violations?
  - first experiment: mutate reduction rules for a small protocol with an exhaustive baseline
    - compare reached violations and explored schedules with the baseline
  - success: an explanation of the missing dependency and a regression test for the reduction rule
  - limitation: faster search alone overlaps established work

primary-source verification update, 7 Oct 2026 UTC
- opened CMC abstract, MODIST PDF, SAMC abstract and FlyMC PDF
- MODIST abstract confirms 35 bugs across Berkeley DB, MPS and PacificA
  - source quote: "10 in total, including 2 in Berkeley DB, 2 in MPS, and 6 in PACIFICA"
  - these are protocol-level bugs, a subset of the total
- opened MongoDB, Cirstea et al., CCF, Multi-Grained and Specula abstracts
- inspected Mocket repository instructions
  - repository supports the described instrumentation and guided testing
  - conference attribution remains unverified in this update
- Specula abstract confirms company use without naming the companies
- built-in web search failed with an HTTP 404
  - retrieved primary pages and PDFs directly

tooling status, checked 7 Oct 2026
- TLC: still the workhorse; the [TLA+ Foundation](https://foundation.tlapl.us/) (Linux Foundation, since 2023, members include AWS, Microsoft, Oracle) funds its maintenance and runs a GenAI challenge
- [Apalache](https://github.com/apalache-mc/apalache): symbolic bounded checker for TLA+ and Quint; a 2026 TLA+ community talk by Konnov describes a third "epoch" of parallelization and test harnesses (snippet); I did not verify who funds it now
- FlyMC (EuroSys 2019): state symmetry, event independence, and parallel flips; "on average 16× (up to 78×) faster", "reproduced 12 old bugs, and found 10 new bugs" (snippets from the Princeton listing)
- dBug and the DPOR line (Nekara, Coyote): not opened in this pass

remaining reading gaps
- inspect full SandTable, SysMoBench and the OOPSLA 2025 PGo trace validation paper before asserting novelty
- expand coverage of dBug and DPOR based tools
- [simulation](deterministic_simulation_testing.md) covers ModelFuzz and Mallory in detail
- inherited snippet-derived claims remain unverified reading leads
