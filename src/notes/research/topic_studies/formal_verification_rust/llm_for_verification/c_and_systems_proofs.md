LLMs for proofs about C code and operating systems
(authored by agents unless marked 🧑)

status
- an initial incomplete search was followed by primary-source review on October 8, 2026
  - nine papers' methods and limitations checked in full text
  - two F* papers checked through primary abstracts and the existing collection
- results have not been reproduced
- scope: proof generation and specification generation for selected C and proof-assistant developments
  - no exhaustive survey of every proof assistant or industrial deployment
  - cross-paper success rates are not directly comparable

short version
- seL4 appears in several studies found in this first search
  - their authors report promising results for small trained models
- inference: C annotation (ACSL) work is split between "generate contracts" and "make Frama-C prove them"
- candidate idea, untested: compare small fine-tuned models against large hosted agents on the same C or seL4 proof set at equal cost

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
- [Neuro-Symbolic Proof Generation for Scaling Systems Software Verification](https://www.usenix.org/conference/osdi26/presentation/he-baoding), He et al., OSDI 2026
  - peer-reviewed systems paper
  - method: fine-tuned proof-step proposals, symbolic repair, and ranked search over Isabelle proof states
  - authors report “up to 77.6% of the theorems” on the FVEL seL4 benchmark
    - 2,167 proved across the still-valid validation, test, and test-hard sets
    - this percentage does not describe the full 29,125-theorem corpus
  - limits: repeated prover calls are costly, and longer proofs remain harder
    - this is a theorem-completion result, not verification of previously unverified kernel code
- [Agentic Verification of Software Systems](https://arxiv.org/abs/2511.17330), AutoRocq, FSE 2026
  - peer-reviewed software-engineering paper
  - method: Rocq feedback and context queries guide an agent's proof construction
  - evaluation includes 641 proof obligations derived from 131 sequential C programs
    - paper proves 12 of 60 selected Linux-kernel lemmas, or 18 with CoqHammer
  - important limit: contracts, inferred invariants, Frama-C translation, and completion of the whole program's obligations remain separate from proving a selected lemma
    - initial Eva/property-test screening cannot prove inferred loop invariants correct
  - inference: an accepted lemma is useful evidence only after mapping it back to the source property
- [Trustworthy Software Project Generation](https://arxiv.org/abs/2605.26017), Fang and Xiong, 2026 preprint
  - method: prove a pure Rocq core and extract it into C++ alongside unverified effects
  - authors report an RV32I interpreter covering 47 instructions in 30 minutes
    - 265 generated tests passed; 12 hours of fuzzing found no crashes or hangs
  - source limit: “the small host C++ layer handling side effects is unverified”
  - extraction limit: authors assume that Crane's Rocq-to-C++ translation preserves behavior
  - inference: generated requirements, implementation, and tests can share an omission
    - independent ISA conformance tests would add evidence beyond self-consistency
- [Towards Neural Synthesis for SMT-Assisted Proof-Oriented Programming](https://arxiv.org/abs/2405.01787), Chakraborty et al., ICSE 2025
  - primary abstract checked; full text archived in the collection
  - authors provide an extended F* corpus with 54,000 definitions and a candidate checker
  - claim: smaller fine-tuned models compare favorably with larger general models at lower compute cost
  - limit: this is typed program/proof completion, distinct from unrestricted C verification
- [PoPilot](https://arxiv.org/abs/2502.11901), Zhang et al., ACL Findings 2025
  - primary abstract checked; full text archived in the collection
  - method: synthetic F* generation and repair examples for a fine-tuned 14B model
  - authors report a 64% relative improvement over GPT-4o on their project-level task
  - limit: relative improvement is not a 64-percentage-point gain
    - model, data, task population, and repair budget must be matched in a new comparison

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
- outside this targeted review: CN, Pulse agents, self-play, and a systematic survey of industrial deployments
- discarded unverified leads
  - arXiv 2511.01104 is HarnessLLM testing, and 2512.03420 studies fuzz harnesses
    - neither substantiates the initial draft’s attribution to a CBMC proof agent
  - unidentified Intel TDX thesis and BMC-Agent leads are not used as evidence

source archive
- newly collected primary texts and download provenance
  - [Towards Real-World Industrial-Scale Verification- LLM-Driven Theorem Proving on seL4](https://github.com/SichangHe/paper_collection/blob/main/Towards%20Real-World%20Industrial-Scale%20Verification-%20LLM-Driven%20Theorem%20Proving%20on%20seL4%2C%20Jianyu%20Zhang%2C%20Fuyuan%20Zhang%2C%20Jiayi%20Lu%2C%20et%20al.%2C%20arXiv%2C%202026/source-provenance-20261008.md)
  - [PROMISE- Proof Automation as Structural Imitation of Human Reasoning](https://github.com/SichangHe/paper_collection/blob/main/PROMISE-%20Proof%20Automation%20as%20Structural%20Imitation%20of%20Human%20Reasoning%2C%20Youngjoo%20Ahn%2C%20Sangyeop%20Yeo%2C%20Gijung%20Im%2C%20et%20al.%2C%20arXiv%2C%202026/source-provenance-20261008.md)
  - [Evaluating LLM-Generated ACSL Annotations for Formal Verification](https://github.com/SichangHe/paper_collection/blob/main/Evaluating%20LLM-Generated%20ACSL%20Annotations%20for%20Formal%20Verification%2C%20Arshad%20Beg%2C%20Diarmuid%20ODonoghue%2C%20Rosemary%20Monahan%2C%20FTfJP%2C%202026/source-provenance-20261008.md)
  - [AutoACSL- Synthesizing ACSL Specifications by Integrating LLMs with CPG-Based Static Analysis](https://github.com/SichangHe/paper_collection/blob/main/AutoACSL-%20Synthesizing%20ACSL%20Specifications%20by%20Integrating%20LLMs%20with%20CPG-Based%20Static%20Analysis%2C%20Han%20Zhou%2C%20Yu%20Luo%2C%20Dianxiang%20Xu%2C%20arXiv%2C%202026/source-provenance-20261008.md)
  - [Agent-Driven Verification of Memory Safety for liblzma Decoder Components with VST](https://github.com/SichangHe/paper_collection/blob/main/Agent-Driven%20Verification%20of%20Memory%20Safety%20for%20liblzma%20Decoder%20Components%20with%20VST%2C%20Prokhor%20Shlyakhtun%2C%20Alexander%20Gryzlov%2C%20Vladimir%20Kukharenko%2C%20et%20al.%2C%20arXiv%2C%202026/source-provenance-20261008.md)
  - [Trustworthy Software Project Generation- a Case Study with an Interactive Theorem Prover](https://github.com/SichangHe/paper_collection/blob/main/Trustworthy%20Software%20Project%20Generation-%20a%20Case%20Study%20with%20an%20Interactive%20Theorem%20Prover%2C%20Jian%20Fang%2C%20Yingfei%20Xiong%2C%20arXiv%2C%202026/source-provenance-20261008.md)
  - [Neuro-Symbolic Proof Generation for Scaling Systems Software Verification](https://github.com/SichangHe/paper_collection/blob/main/Neuro-Symbolic%20Proof%20Generation%20for%20Scaling%20Systems%20Software%20Verification%2C%20Baoding%20He%2C%20Zenan%20Li%2C%20Wei%20Sun%2C%20et%20al.%2C%20OSDI%2C%202026/source-provenance-20261008.md)
- PDFs are retained locally in `/hdd1/sichanghe/paper_collection`
  - repository publishes extracted text and source records
