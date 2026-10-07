testing the parts a proof depends on
(authored by agents unless marked 🧑)

short version

- fact: proofs and tests can share an executable specification
  - Cogent already demonstrates tests shaped like refinement proofs
- fact: bounded formal checking finds real compiler errors
  - Alive2 reported 47 new LLVM bugs in its 2021 paper
  - a passing bounded check can still miss behavior beyond its bounds
- fact: low-level model conformance testing is already substantial systems work
  - MachCSL reports 77 tests and 35 discrepancies in 2026
- inference: “combine fuzzing and proofs” is too broad to be a new research contribution
- recommendation: study change-triggered evidence for external assumptions
  - keep each assumption linked to the claims that use it
  - measure whether dependency-guided tests beat uniform testing at equal cost
- recommendation: test disagreement between implementations and specifications
  - preserve counterexamples as regression cases
  - distinguish an implementation bug from a wrong or overly narrow specification

what each method tells us

- proof: every behavior in a stated mathematical model satisfies a stated property
  - conditional on the assumptions and soundness of the proof tools
- bounded model checking: every behavior encoded within stated limits satisfies a property
  - a loop bound without a successful completeness check leaves larger executions unchecked
- fuzzing: generated concrete executions have not yet falsified the checked property
  - inputs, scheduling, and test oracle restrict the evidence
- property-based testing: generates inputs to check a general executable property
  - can shrink failures into small examples
- conformance testing: checks whether a model permits observed implementation behavior
  - discrepancies can reveal missing model behavior
- inference: the useful combination depends on which gap remains
  - test external devices when the proof assumes a device model
  - test the specification when the implementation already satisfies it
  - use bounded checking to explore small states exhaustively

existing work

- [Property-Based Testing: Climbing the Stairway to Verification](https://trustworthy.systems/publications/papers/Chen_ROSKHK_22.pdf), Chen et al., SLE 2022
  - fact: peer-reviewed paper; Cogent framework
  - claim, exact words: “mirror the refinement proof in testing”
  - fact: tests compare implementation outputs with outputs permitted by a functional specification
  - fact: two examples cover a WordArray library and a real file-system operation
  - fact: Section 5 reports bugs in two C library functions
    - inputs were invalid or corner cases handled by existing callers
    - earlier tests and file-system use did not reveal them
  - fact: tests also revealed specification errors
  - limit: tests cover generated cases, not all possible behavior
    - mocks narrow the tested boundary
    - Haskell and Isabelle specifications remain distinct artifacts
  - cost: no controlled person-hour comparison establishing universal proof-effort savings
  - inference: testing a verified library only through current callers can hide bugs outside their narrow input patterns
  - existing notes: [static_analysis.md](../../../static_analysis.md) already explains this paper and named assumption evidence
    - this study adds change-based evaluation rather than claiming that combination is new

- [Alive2: Bounded Translation Validation for LLVM](https://www.cs.utah.edu/~regehr/alive2-pldi21.pdf), Lopes et al., PLDI 2021
  - fact: peer-reviewed paper
  - claim, exact words: “there are circumstances in which it misses bugs”
  - fact: checks whether a particular LLVM IR transformation preserves allowed behavior
    - checks transformations rather than proving the whole compiler implementation
  - fact: running over LLVM unit tests found 47 new bugs
    - 28 were fixed at the paper's reporting point
    - eight LLVM language-reference patches followed
  - fact: the checker limits resource consumption, including loop unrolling
  - limit: passing checks do not establish correctness outside the supported semantics and bounds
    - this is not a proof of frontends, backends, linking, or hardware execution
  - inference: specifications can improve when concrete transformations expose ambiguity
  - research implication: generated test cases can be inputs to formal translation checking
    - a soundly checked transformation gives stronger evidence than one random input/output comparison

- [CBMC](https://www.cprover.org/cbmc/)
  - fact: official tool page, opened 7 Oct 2026
  - claim, exact words: “The verification is performed by unwinding the loops”
  - fact: checks C/C++ memory safety, undefined behavior, and user assertions
  - fact: unwound program equations go to a decision procedure
  - limit: bounds and harness assumptions determine the actual checked claim
  - inference: record these next to the result
    - otherwise “verified” can hide which inputs and executions were excluded
  - cost: this documentation provides no project-specific cost measurement
  - completeness caveat: bounded checking can become unbounded evidence when completeness conditions are established
    - report that separately from merely selecting a finite unwinding depth

- [QuickChick: Property-Based Testing in Rocq](https://softwarefoundations.cis.upenn.edu/qc-current/index.html), Lampropoulos and Pierce
  - fact: opened official Software Foundations textbook page
  - exact title: “QuickChick: Property-Based Testing in Rocq”
  - fact: page identifies version 2.1 dated 24 Aug 2026
  - scope: practical learning resource for testing within a proof-assistant workflow
  - limit: the landing page is not experimental evidence of systems adoption or proof-cost reduction

- [Extending concurrent separation logic to the hardware level to verify the xv6 OS kernel on RISC-V with AI agents](https://arxiv.org/abs/2609.04043v2), Kaashoek and Zeldovich, September 2026
  - fact: preprint, revision v2; full extracted paper opened
  - fact: Section 12.4 reports 77 conformance tests and 35 discrepancies
    - compares model behavior with QEMU and JH7110 hardware
  - claim, exact words: “our disk model executed all submitted disk requests in order”
  - context: observed QEMU behavior allowed out-of-order execution
    - authors changed the model and disk-driver invariant and proofs
  - fact: hardware lacked some modeled devices and features
    - UART and virtio tests did not run on JH7110
  - limit: discrepancies include benign register differences as well as substantive model errors
    - 35 discrepancies do not mean 35 exploitable software bugs
  - inference: model testing can force genuine proof maintenance
    - counts alone do not measure how many false assumptions in public claims were eliminated

- [How We Built Cedar: A Verification-Guided Approach](https://arxiv.org/abs/2407.01688), Disselkoen et al., FSE Companion 2024
  - fact: peer-reviewed industry/practitioner paper; opened the paper collection PDF
  - authors' claim: proving the Lean model found four validator bugs
    - differential and property-based testing found 21 additional bugs
    - source: abstract and Tables 2–3
  - fact: Section 4 runs `cargo-fuzz` inputs against both the Lean model and production Rust
    - generates millions of requests, policies, and entities
    - preserves minimized test corpora for continuous integration
  - fact: property tests also cover unmodeled components, including the parser
  - fact: Table 4 lists missed bugs and their reasons
    - malformed inputs or schemas were not methodically generated
    - relevant APIs were not tested in some cases
  - limit: finite differential tests connect production Rust to the proved Lean model
    - the paper does not prove universal equivalence between them
  - cost: proof checking and model compilation take about three minutes in Section 3
    - no controlled comparison of total testing and proof maintenance effort
  - quote and effort details: [industry_use.md](industry_use.md), “Lean at AWS”
  - inference: a new campaign needs evidence beyond saving corpora and checking model parity

- [An Empirical Study on the Correctness of Formally Verified Distributed Systems](https://www.cs.purdue.edu/homes/pfonseca/papers/eurosys2017-dsbugs.pdf), Fonseca et al., EuroSys 2017
  - fact: peer-reviewed paper; opened revised author PDF
  - authors' claim: found sixteen bugs across IronFleet, Verdi, and Chapar
    - PK toolkit automatically detects thirteen
    - source: abstract and Sections 3–6
  - fact: includes environment fuzzing and mutation-based checks of specifications
    - shim fuzzing modifies network and filesystem behavior through `LD_PRELOAD`
    - negative testing introduces implementation bugs and checks whether verification rejects them
      - continued verification suggests the specification permits the bug
    - separate specification checking proves expected properties about the specification
  - limit: tests cannot establish all trusted components meet all assumed contracts
    - protocol proofs remained conditional on those contracts
  - cost: eight months of investigation is a study duration, not the cost of every PK run
  - quote and boundary discussion: [distributed_protocols.md](distributed_protocols.md), empirical study entry
  - inference: targeted testing of proof assumptions and specification mutation were already demonstrated in 2017

what is missing

- inference: tests, formal checks, and shared specifications already coexist
  - a useful new question needs a failure class or cost improvement beyond coexistence
- open question: can dependency-guided assumption tests reduce evidence rebuild cost after environment changes?
  - existing notes propose assumption receipts
  - MachCSL already validates hardware and device models with tests
  - this reading does not establish automated per-claim invalidation and selective retesting across versions
- open question: what should happen when a proof passes but the executable model disagrees with deployed behavior?
  - examples show the situation occurs
  - classifying blame still needs semantic judgment
- limit of this review: no systematic 2024–2026 survey of coverage-guided fuzzing plus proof assistants was completed
  - direct primary-source retrieval replaced a broken search endpoint
  - do not treat this gap as proof that the proposed work is novel

research we can do

- proposal 1: rebuild only evidence affected by an environment change
  - question: can proof dependencies choose which tests to rerun after an OS, compiler, device, or library change?
  - builds on: Cogent refinement testing, PK assumption fuzzing, MachCSL conformance tests, existing named-law notes
  - proposed new part: versioned assumption-to-test-to-theorem dependencies with measured incremental invalidation
  - why it may matter: a proof can remain syntactically valid after its external assumption becomes false
  - first experiment: one verified driver or storage module
    - name ordering, failure, alignment, and memory assumptions
    - link existing boundary tests to dependent theorems
    - inject environment changes and replay real version changes
  - convincing result: same detected assumption violations with lower test cost than full retesting
    - report missed violations and stale public claims
    - compare dependency selection with PK-style boundary tests, random selection, and coverage-guided selection
  - cost estimate, ours: weeks for a prototype; months for diverse real changes
  - closest competing work: PK, Cedar corpus regression tests, MachCSL hardware model testing, and existing proof dependency tools
    - novelty must be incremental evidence and its measured effect

- proposal 2: find errors shared by code and its specification
  - question: can independently generated behaviors expose an accepted but unintended specification?
  - builds on: Cogent executable refinement specifications, PK specification mutation, Cedar differential testing, Alive2 semantic clarification
  - proposed new part: evaluate specification mutants against independent reference behavior and deployed traces
    - use mutants that change allowed behavior, not merely text
  - first experiment: parser, allocator, or storage operation with a public behavioral interface
    - construct plausible omissions, overstrong preconditions, and reordered failure cases
    - compare spec-driven tests with independently generated cases
  - convincing result: detect intentionally planted and historical spec errors without labeling legitimate nondeterminism as failure
    - show which independent oracle supplied the missing information
  - why it may matter: implementation and spec can agree on the same mistake
  - cost estimate, ours: several weeks to curate labeled errors and a trustworthy reference
  - closest competing work: PK specification mutation and Cedar independent model/production testing
    - cross-reference [spec_quality_trusted_base.md](spec_quality_trusted_base.md) before choosing this direction
    - withdraw novelty if the same independence experiment already exists

ChatGPT opinion

- shared Extra High consultation and assessment: [research_directions.md](research_directions.md)
- opinion can rank candidates
  - it cannot certify novelty or replace primary-source comparisons

search record

- first read existing testing and assumption-carrying sections of `static_analysis.md`
- opened five papers, CBMC documentation, and QuickChick textbook page
- checked local paper collection before downloading
  - added Alive2, Pumpkin Pi, quotient repair, and PRISM PDFs for the shared study
- attempted searches for QuickChick, Alive2, and proof maintenance
  - web search failed with HTTP 404
  - fetched primary pages and PDFs directly
- overlap: [proof_maintenance_repair.md](proof_maintenance_repair.md) covers proof failures after code and tool changes
