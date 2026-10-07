industrial use of formal verification
(authored by agents unless marked 🧑)

short version

- fact: industry uses several levels of assurance
  - TLA+ checks a design model
  - Cedar proves a Lean model and tests production Rust against it
  - Dafny can check executable source; generated code adds another boundary
- inference: the useful question is which deployed behavior each proof actually covers
- proposed research: find changes that preserve a proved model but break the production implementation
  - novelty remains unconfirmed
- costs and adoption evidence: [cost_adoption.md](cost_adoption.md)

what the topic means

- verification checks that software follows a stated rule
  - the rule can describe a model, source program, or machine code
  - a successful check says nothing about rules that were omitted
- industry adoption here means a documented production use or supported commercial tool
  - a research prototype at a company is identified separately

what existing work shows

- TLA+ at AWS: [How Amazon Web Services Uses Formal Methods](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf), Newcombe et al., CACM, 2015
  - status: published practitioner report; opened the paper from the local collection
  - authors' report: seven teams used TLA+; engineers obtained useful results after 2–3 weeks
    - exact quote, adoption paragraph: “We now have 7 teams using TLA+”
  - fact, case table: DynamoDB replication and membership model had 939 lines and found three bugs
    - some counterexamples required 35 steps
  - assurance boundary: these are model checks of selected designs, not proofs that deployed source implements those models
  - fact, case table: a lock-manager study missed a liveness bug because liveness was not checked
    - liveness means the system eventually makes progress
  - inference: a small specification can find expensive design mistakes, but omitted requirements remain a first-class failure mode
  - overlap: [distributed_protocols.md](distributed_protocols.md)

- TLA+ and C++ at Microsoft: [Smart Casual Verification of the Confidential Consortium Framework](https://www.usenix.org/conference/nsdi25/presentation/howard), Howard, Kuppe, Ashton, Chamayou, Crooks, NSDI, 2025
  - status: peer-reviewed production experience report; full paper opened from the collection
  - fact: CCF powers Azure Confidential Ledger
  - fact: combines model checking, simulation, and validation of recorded C++ execution traces against TLA+ specifications
    - integrated into continuous integration
    - checks modified Raft consensus and client consistency guarantees
  - authors' reported result: six subtle design and implementation bugs found before customer impact
  - assurance boundary: a validated trace follows the specification
    - finite traces do not prove all future C++ executions conform
    - model checking explores explicitly bounded configurations
    - this study does not prove the entire platform's confidentiality or trusted hardware
  - exact quote, discussion §8: “we chose to prioritize developer time and accessibility over compute time”
  - fact, §6.5: consensus trace-validation work required about two engineer-months over four months
    - consistency trace validation required about one engineer-week over two weeks
  - inference: this is direct evidence that retrofitting the model/code connection can be practical
    - the first connection also pays shared tool-development and mismatch-diagnosis costs
  - overlap: [distributed_protocols.md](distributed_protocols.md)

- Lean at AWS: [Lean Into Verified Software Development](https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/), Kesha Hietala and Emina Torlak, AWS Open Source Blog, 8 Apr 2024
  - status: official practitioner report, not a peer-reviewed paper
  - fact: Cedar models the evaluator, authorizer, and validator in Lean
    - the authorizer decides whether a request is allowed
    - the validator checks whether policies have acceptable types
  - authors' claim: validator soundness proves that an accepted policy cannot produce a type error during model evaluation
    - exact quote: “evaluating the policy won’t result in a type error”
  - fact, effort table: 1,673 model lines, 5,714 proof lines, 24,915 production Rust lines
    - 4,686 proof lines and 18 person-days for validator soundness
    - proof checking took 185 seconds
  - assurance boundary: proofs cover the Lean definitions
    - nightly differential testing compares millions of inputs against production Rust
    - inference: this is strong implementation checking, but a finite test suite is not a universal equivalence proof
  - overlap: [testing_with_proofs.md](testing_with_proofs.md)

- Dafny at AWS: [AWS Cryptographic Material Providers Library](https://github.com/aws/aws-cryptographic-material-providers-library), official repository, opened 7 Oct 2026
  - status: maintained project documentation, not a peer-reviewed cost study
  - exact quote, repository structure: “This library is written in Dafny, a formally verifiable programming language”
  - fact: documented supported generated runtimes include Java, .NET, Python, Rust, and Go
  - assurance boundary: this README establishes use of Dafny, not the exact set of proved cryptographic or functional properties
    - verification conditions, external calls, compilation, and each runtime need separate audits
    - no blanket security guarantee is inferred from the implementation language

- Dafny at Microsoft Research: [IronFleet: Proving Practical Distributed Systems Correct](https://www.microsoft.com/en-us/research/publication/ironfleet-proving-practical-distributed-systems-correct/), Hawblitzel et al., SOSP, 2015
  - status: peer-reviewed research prototype; opened the paper from the local collection
  - fact: checks safety and liveness for a replicated state machine and sharded key-value store
  - fact, figure 12: 5,114 executable lines, 39,253 proof lines, 1,400 specification lines
    - total verification time: 395 minutes on the paper's setup
  - authors' reported effort: approximately 3.7 person-years for the methodology and both systems together
  - assurance boundary: trusted specifications and native I/O contracts remain assumptions
    - see [distributed_protocols.md](distributed_protocols.md) for detailed proof-to-code boundaries

- F* at Microsoft and collaborators: [Project Everest](https://www.microsoft.com/en-us/research/project/project-everest/), official project page
  - status: project documentation; papers and deployments belong in [crypto.md](crypto.md)
  - exact quote, tool list: “a language subset of F* and a C code generator to model and verify C programs”
  - fact: the project combines F*, Low*, KReMLin, HACL*, EverCrypt, EverParse, Vale, and miTLS
  - inference: a verified source language is part of a larger build path
    - source proof, extraction, C compilation, assembly, linking, and runtime assumptions should be recorded separately

- Coq/Rocq: [CompCert C compiler](https://compcert.org/compcert-C.html), official technical description
  - status: project documentation; Coq is the name used by this source
  - exact quote, backend description: “the bulk of the compiler and the one that is proved correct in Coq”
  - fact: the stated proof covers the compiler's central transformation stages
  - fact: the documented C frontend and assembler/linker have unverified parts
    - do not generalize this into a theorem about arbitrary C builds
  - commercial evidence: [CompCert project news](https://compcert.org/) records AbsInt marketing and support under a 2014 licensing agreement
    - commercial availability establishes a support path, not the number of adopters
  - overlap: [compilers.md](compilers.md)

- Isabelle: [AutoCorres2](https://www.isa-afp.org/entries/AutoCorres2.html), Archive of Formal Proofs, 2024
  - status: maintained formal proof development, not a production-adoption survey
  - exact quote, abstract: “AutoCorres2 is a tool to facilitate the verification of C programs within Isabelle”
  - fact: the archive records compatible releases through Isabelle2025-2 in Feb 2026
  - inference: C verification infrastructure is maintained beyond isolated demonstrations
    - the page alone does not establish commercial deployment or total engineering cost
  - production-kernel evidence and assurance boundaries: [os_kernels.md](os_kernels.md)

what remains missing

- inference: public artifacts often describe proved properties better than deployment assumptions
  - current evidence here does not quantify how often model/code differences escape differential testing
- inference: these selected cases cannot rank languages by industrial adoption
  - there is no denominator of eligible projects or failed attempts
- open review gap: additional 2025–2026 company case studies and probability-based adoption surveys
  - the 2020 survey in [cost_adoption.md](cost_adoption.md) studies perceptions using self-selected respondents
  - additional current company cases remain a review gap

research we can do

- question: can we detect implementation changes that invalidate the connection to an unchanged proved model
  - builds on Cedar's executable Lean model and differential testing, linked above
  - proposed new contribution: change-focused generation of tests for behavior modified in production but absent from the model
    - honest novelty limit: differential testing, mutation testing, and trace comparison already exist
      - CCF 2025 already identifies model/code differences while validating traces
      - a proposal that merely adds trace validation has no supported novelty claim
    - novelty would require a demonstrably better way to identify and exercise model/code disagreement
  - why it may matter: model proofs remain green when the production implementation changes incorrectly
  - first experiment: seed 30 plausible evaluator and validator changes in a fixed Cedar version
    - compare ordinary fuzzing, coverage-guided differential testing, and change-focused tests under equal CPU budgets
    - keep held-out changes and count detected disagreements rather than proof success
  - convincing result: higher detection with fewer tests, plus explanations that developers can validate
  - cost: one researcher for an initial small study; estimate, not measured evidence
  - closest work that could remove novelty: Cedar's differential framework, CCF's trace validation, and regression-directed fuzzing

consultation status

- shared Extra High review requested
  - see [research_directions.md](research_directions.md) for the consolidated status

what was searched and opened

- read existing static_analysis.md passages on TLA+ model/code mismatch and hybrid verification
- opened four papers from the human's collection: AWS 2015, IronFleet 2015, ShardStore 2021, CCF 2025
- opened official Cedar Lean, AWS Dafny library, Project Everest, CompCert, AutoCorres2 pages
- attempted queries for 2024–2025 industrial verification and adoption surveys
  - built-in web search returned HTTP 404; alternative search returned an empty error
  - direct primary-source fetching worked
