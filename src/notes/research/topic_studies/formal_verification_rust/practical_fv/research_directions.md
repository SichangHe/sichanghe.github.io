research directions from practical formal verification
(authored by agents unless marked 🧑)

recommendation
- start with proof-boundary regression testing on one reproducible system
    - preserve the proved core while changing an unproved adapter
    - compare with existing differential tests and fault injection at equal cost
- pursue proof maintenance next if the historical artifacts build
    - classify mechanical edits, semantic changes, solver instability, and toolchain failures separately
- reserve specification adequacy work for a target with independent requirements
    - code, specification, and generated tests can agree while sharing an omission
- these are agent recommendations
    - the review does not establish novelty or predict publication acceptance

what this builds on from the human's notes
- [assumption-carrying verification](../../../static_analysis.md#idea-assumption-carrying-verification)
    - 🧑 exact human direction: “integrate assumption correctness testing into proof”
    - 🧑 exact human direction: “when bug occur, need to backtrack to find which assumption is wrong”
    - proposed additions below concern evaluation and concrete implementations of that existing idea
- [research directions](../../../literature_directions.md)
    - repository context, proof maintenance, and recording dependencies are already present
    - a new project must contribute more than a renamed dependency list
- [Agave pilot scope](../../../agave_verification_scope.md)
    - a bounded component is more practical than pricing an entire mixed system as one proof task

proposal 1: detect and explain a broken proof assumption after an adapter change
- question: can proof dependencies guide tests that find and locate runtime mismatches faster
- existing work
    - [DaisyNFS](file_systems_storage.md): trusted cross-tool interfaces and tested glue
    - [PK, Grove, and trace validation](distributed_protocols.md): targeted boundary testing already detected 13 of 16 verified-system bugs
    - [MachCSL](os_kernels.md): hardware conformance testing already finds model discrepancies
    - [Cedar](industry_use.md): executable proved model plus production differential testing
- proposed new contribution
    - connect one theorem dependency to a concrete adapter operation, executable check, and changed version
    - evaluate whether this connection improves detection and diagnosis
    - a list of assumptions or a build hash alone would not be enough
- why it may matter
    - a proof can stay unchanged while an external operation no longer satisfies its contract
- first experiment
    - reproduce one system's existing boundary tests
    - select 20 independently reviewed contract violations and 20 harmless changes
    - compare PK-style boundary tests, ordinary fault injection, and dependency-guided tests at equal runtime
    - hold out some changes when developing the technique
- convincing result
    - additional confirmed failures or lower diagnosis effort without more false alarms
    - provide concrete affected theorem, broken contract, and minimized execution
- reject or narrow if
    - existing tests detect everything at the same cost
    - assumption extraction takes more manual work than writing the tests directly
    - generated checks only restate implementation behavior
- estimated cost
    - 4–6 weeks for one pilot, assuming reproducible artifacts
    - several months for multiple systems and real change histories
- closest competition
    - PK, refinement-based testing, contract testing, regression-directed fuzzing, runtime verification
    - the [testing review](testing_with_proofs.md) identifies direct predecessors
    - broader novelty search remains required

proposal 2: predict expensive proof failures before a tool or code upgrade
- question: can solver measurements and dependency changes predict future maintenance work
- existing work
    - [Dafny measurement and Cazamariposas](proof_maintenance_repair.md): instability measurement and debugging
    - [PRISM and Pumpkin Pi](proof_maintenance_repair.md): historical repair data and structured proof transport
    - [MachCSL](os_kernels.md): 22 measured source-version updates already demonstrate practical repair
- proposed new contribution
    - chronological prediction and intervention study across actual systems histories
    - measure total maintenance saved rather than benchmark proof completion alone
- why it may matter
    - teams need reliable upgrades and predictable budgets
- first experiment
    - reproduce 20 changes in each of two repositories
    - classify intended behavior changes before evaluating repairs
    - compare current verification cost, random-seed variance, and changed dependency reach as predictors
    - use old commits for selection and later commits for evaluation
- convincing result
    - earlier warnings reduce total repair work at equal checked guarantees
    - include screening compute, human review, and toolchain reconstruction
- reject or narrow if
    - prediction merely ranks already expensive proofs
    - improvements concern only generated address edits
    - repairs quietly weaken required behavior
- estimated cost
    - several weeks to test reproducibility, several months for useful longitudinal evidence
- closest competition
    - existing solver-stability tools and proof-repair datasets
    - explain which failures those tools already handle before claiming a contribution

proposal 3: find requirements lost when code and specification change together
- question: can a change preserve a proof while losing independently required behavior
- existing work
    - [IronSpec](spec_quality_trusted_base.md): specification mutation and small expected-behavior proofs
    - [Scope and Arm validation](spec_quality_trusted_base.md): independent descriptions expose inconsistent specifications
    - [Cedar](industry_use.md): differential checking connects a simple model to production code
- proposed new contribution
    - a change-based evaluation with independently established requirements
    - distinguish contradictory specifications, omitted requirements, and intended changes
- why it may matter
    - proving a weaker statement can conceal a regression
- first experiment
    - choose one API with documented positive and negative examples
    - preserve those examples independently of implementation and proof generation
    - seed joint code/specification edits and intended API changes
    - compare IronSpec-style checks, implementation-derived tests, and independent requirement checks
- convincing result
    - independently confirmed violations missed by the first two baselines
    - explicit coverage limits and false alarms
- reject or narrow if
    - independent expectations require experts to rediscover every bug manually
    - examples merely duplicate existing tests
- estimated cost
    - 3–6 weeks for a small pilot, longer for credible real-world requirements
- closest competition
    - specification evolution, requirement traceability, regression verification, mutation testing
    - no global novelty claim yet

other proposals worth preserving
- [compiler property regressions](compilers.md)
    - compiled functional behavior and secret-dependent timing need different checks
- [cryptographic build boundaries](crypto.md)
    - verified source is one stage of a deployed cryptographic library
- [precise specification inconsistencies](spec_quality_trusted_base.md)
    - Scope explicitly leaves bit precision and failure ordering outside its model
- [full maintenance cost and engineer handoff](cost_adoption.md)
    - promising measurement projects if participating teams and histories are accessible

ChatGPT Extra High consultation
- requested through `pb-chatgpt-prompt-file --effort 'Extra High'`
- consultation status: pending
    - no opinion is attributed before capture completes
    - this section will be updated with exact words and assessment
- source of recommendations above: this review's agent inference
    - ChatGPT agreement would be opinion, not a novelty check

limits of the evidence
- the literature review includes primary papers and official project reports
- web search services failed in this session
    - known sources, author pages, references, and the human's collection supplied evidence
    - recent work is included where it could be directly checked
- costs are not comparable without matching properties and counted work
    - startup infrastructure, repeated proof work, expert help, and deployment testing must be separated
- finite testing supports a model-to-runtime connection for tested behavior
    - it does not turn that connection into an all-executions proof
