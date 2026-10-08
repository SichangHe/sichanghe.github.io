LLMs for proofs about C code and operating systems (PARTIAL, unfinished)
(authored by agents unless marked 🧑)

status
- the agent hit its usage limit after the first search round
- publication follow-up checked six primary abstracts and their full-text methods and limitations on October 8, 2026
- results have not been reproduced
- original search leads below remain incomplete
  - remaining work: cover other listed papers and compare training data, theorem splits, cost, and contract strength consistently

short version
- seL4 appears in several studies found in this first search
  - their authors report promising results for small trained models
- inference: C annotation (ACSL) work is split between "generate contracts" and "make Frama-C prove them"
- candidate idea, untested: compare small fine-tuned models against large hosted agents on the same C or seL4 proof set at equal cost

what was seen
- AutoReal, [Towards Real-World Industrial-Scale Verification: LLM-Driven Theorem Proving on seL4](https://arxiv.org/abs/2602.08384), arXiv Feb 2026, preprint (abstract page read)
  - claim: a 7B model, trained on reasoning chains plus context from the existing project
  - claim: 51.67% of 660 seL4 "Important Theories" theorems, against 27.06% for earlier work
  - claim: 53.88% on 451 theorems from three security-related Archive of Formal Proofs projects
  - claim: small size allows local deployment
- PROMISE, [Proof Automation as Structural Imitation of Human Reasoning](https://arxiv.org/abs/2604.05399), arXiv Apr 2026, preprint (abstract page read)
  - claim: proof generation as stateful search over proof-state transitions, mining structural patterns from proofs
  - claim: "up to +26 point improvements (186% relative gain)" over Selene and Rango on the seL4 benchmark
- seen only as search snippets, not opened
  - [Evaluating LLM-Generated ACSL Annotations for Formal Verification](https://arxiv.org/abs/2602.13851): 506 C programs, DeepSeek-V3.2, GPT-5.2, OLMo 3.1 32B; snippet says rule-based generation was more reliable than the LLMs
  - [AutoACSL](https://arxiv.org/abs/2606.20969): feedback loop with Frama-C/WP; snippet says 96% full proof with Gemini-3
  - OSDI 2026 paper by He Baoding et al. ([PDF](https://www.usenix.org/system/files/osdi26-he-baoding.pdf)): snippet says 77.6% of seL4 theorems; title and method unknown
  - [Agent-Driven Verification of Memory Safety for liblzma Decoder Components with VST](https://arxiv.org/pdf/2608.29716)
  - [Harnessing Code Agents for Automatic Software Verification](https://arxiv.org/pdf/2607.06341)
  - [Agentic Verification of Software Systems](https://arxiv.org/abs/2511.17330) (FSE 2026 listing), covers AutoRocq
  - [Trustworthy Software Project Generation: a Case Study with an Interactive Theorem Prover](https://arxiv.org/pdf/2605.26017): Rocq RISC-V interpreter
  - [Building A Proof-Oriented Programmer That Is 64% Better Than GPT-4o Under Data Scarcity](https://arxiv.org/pdf/2502.11901) (PoPilot, F*)
  - [Towards Neural Synthesis for SMT-Assisted Proof-Oriented Programming](https://arxiv.org/abs/2405.01787) (F* dataset, fine-tuned small models vs GPT-4)
  - CBMC harness work: BMC-Agent, AutoUP (arXiv 2511.01104 / 2512.03420 unclear which), a Intel TDX harness thesis from the sosy-lab
- already in the paper collection, not yet re-read: Selene, FVEL, Rango, Planning to Hammer, VeriFast LLM specification study, Foundational VeriFast
- already covered elsewhere: Proofs Promptly (local note; not yet published), [LemmaNet and AutoVerus audit](../../../autoverus_citations_20260801.md), [proof synthesis](proof_synthesis.md)

primary-source follow-up
- [AutoReal](https://arxiv.org/abs/2602.08384), 2026 preprint
  - method: fine-tune a 7B model with reasoning attached to proof steps and project context
  - authors report “a 51.67% proof success rate on 660 theorems”
  - training excludes evaluation targets' proof steps
    - this does not establish that the base model never saw the public development
  - limit: selected existing theorems do not measure writing requirements or verifying new C code
- [PROMISE](https://arxiv.org/abs/2604.05399), 2026 preprint
  - method: retrieve structurally similar proof states and adapt their tactic sequences during search
  - authors report “up to +26 point improvements” over earlier methods
  - baselines use stated retry limits and 600-second verification timeouts
    - PROMISE uses adaptive search with 120-second candidate-probe timeouts
  - limit: model, retrieval corpus, attempt count, and time budget must match before comparing its percentage with other tools
- [Evaluating LLM-Generated ACSL Annotations](https://arxiv.org/abs/2602.13851), FTfJP 2026 listing
  - ACSL is a specification language for C; Frama-C checks its assertions
  - paper retains 355 valid C programs from 506 source files
    - the original search snippet above gave only the source-file count
  - methods differ in purpose
    - runtime-error annotations and rule templates mainly express safety
    - LLMs may also generate functional contracts
  - authors identify “semantically weak” generated annotations
  - limit: proof success over different obligations does not rank specification strength
- [AutoACSL](https://arxiv.org/abs/2606.20969), 2026 preprint
  - method: extract program structure and dependencies, then refine generated specifications with Frama-C feedback
  - authors report “a 96% full proof ratio” with Gemini-3 over 604 programs
  - limit: full proof means proving generated obligations
    - it does not establish that preconditions admit intended callers or postconditions reject real bugs
  - the preceding study uses one-shot prompting; AutoACSL changes both static analysis and feedback
    - a comparison must separate those effects
- [Agent-Driven Verification of liblzma Decoder Components](https://arxiv.org/abs/2608.29716), 2026 preprint
  - method: agents build Rocq proofs using VST, a logic for C memory and behavior
    - humans review models, specifications, and semantic changes
  - authors report 27 completed function-body proofs
  - source limit: “applying the result to upstream liblzma additionally requires source equivalence”
  - proof covers a transformed source snapshot under contracts
    - its precondition excludes the discovered raw zero-input undefined behavior
    - allocator bodies and a memory-manager predicate remain assumed
  - authors report 1,595 sessions over 70 days
    - no human-only baseline or audited service-cost measurement
- [Harnessing Code Agents for Automatic Software Verification](https://arxiv.org/abs/2607.06341), Aria, 2026 preprint
  - method: give an agent a whole lemma and enforce an unchanged statement, completed proof, and retry limit
  - authors report all 4,257 selected Iris core lemmas and 217 Rust-library lemmas proved
  - source warning: agents can pass a checker while “silently dropping or weakening the target lemma”
  - limit: existing-lemma proofs do not establish end-to-end verification of new implementations
    - reported model time differs from total service cost

research we could do
- fixed-requirement C specification experiment
  - builds on the ACSL comparison and AutoACSL
  - question: which method captures intended behavior rather than merely proving its own generated contract?
  - proposed addition: independently fixed caller requirements, patched and vulnerable implementations, and exploit tests
  - first experiment: a small set of C routines with known bugs and reproducible builds
    - generate from requirements or patched code
    - evaluate vulnerable code using checked counterexamples and exploit traces
    - count rejected intended inputs separately from missed bugs
  - why it may matter: proof acceptance can coexist with weak postconditions or excessive preconditions
  - closest overlap: existing specification-strength and mutation studies
    - novelty needs a further targeted search
- theorem repair with frozen executable changes
  - builds on Aria, AutoReal, and liblzma's reviewed proof workflow
  - question: can agents repair proofs after a required code change without weakening requirements or undoing the change?
  - proposed addition: historical changes whose behavior is checked independently of proof acceptance
  - first experiment: recover a small set of real proof-breaking changes
    - compare retrieval, fine-tuned models, and general agents at equal time and cost
    - classify repaired proofs, valid refutations, and unresolved attempts
  - why it may matter: existing-lemma success measures a different task from maintaining verified systems
  - closest overlap: the sibling [maintenance review](maintenance_prior_work.md)
    - establish corpus viability and avoid duplicating its proposed study

what was searched
- five queries: Frama-C ACSL agents, seL4 Isabelle LLM, CBMC harness generation, Rocq agents on large projects, F*/Low* fine-tuning
- not searched: CN, VeriFast beyond the local PDF, Pulse agents, self-play, synthetic proof data, industrial reports
