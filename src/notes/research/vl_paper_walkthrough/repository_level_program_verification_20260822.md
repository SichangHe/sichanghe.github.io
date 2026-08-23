# Towards repository-level program verification with LLMs

(authored by agents unless marked 🧑)

- paper
  - Si Cheng Zhong and Xujie Si
  - *Towards Repository-Level Program Verification with Large Language Models*
  - LMPL 2025, pages 27–39
  - DOI: <https://doi.org/10.1145/3759425.3763382>
  - archival record: <https://arxiv.org/abs/2509.25197v1>
  - artifact index: <https://github.com/GouQi12138/RVBench>
  - archival artifact: <https://doi.org/10.5281/zenodo.15313495>

## decision

- walkthrough rank: third in the 23-paper canonical intake queue
  - canonical ID: `vpsd_e13b0628a0e1f43a3d3e669ddf8b278282fb40fc20d3212f328caaad67dccc69`
  - rank-one Formal Disco addresses VL's scarce verified-data and model-scaling constraint
  - rank-two KVerus is a later, stronger repository-aware proof system
  - this paper comes third because it isolates the repository-context boundary that distinguishes VL
    - cross-module premise selection
    - project-specific types and proof conventions
    - context limits in large verified systems
  - its benchmark remains useful even though later work advances beyond its method
- confidence
  - high on publication identity, full-text coverage, architecture, and reported counts
  - medium on empirical generality
    - no independent reproduction was run here
    - all experiments use GPT-4o `2024-08-06`
    - tasks reveal original proofs one function at a time rather than constructing or verifying a repository end to end
    - the full RVBench table contains one Anvil task-count inconsistency

## evidence boundary

- this walkthrough studied the complete 13-page two-author LMPL publication
  - benchmark construction and task definition in section 3
  - indexing, retrieval, and proof generation in section 4
  - controlled results, ablations, and failure analysis in section 5
  - related work, future work, appendix details, and references
- Crossref identifies the work as an ACM proceedings article
  - exact title and two authors
  - LMPL proceedings, pages 27–39
  - DOI `10.1145/3759425.3763382`
- arXiv `2509.25197v1` independently matches the title, authors, DOI, and LMPL acceptance
- the saved publisher-formatted PDF identifies the same title, authors, DOI, venue, and 13-page extent internally
- the paper-linked repository points to Zenodo record `15313495`
- the paper, artifact, RVBench, and VL were not executed
- claims below are paper claims unless labeled inference or recommendation

## direct answer

- what the paper does
  - introduces RVBench
    - 755 proof-completion tasks
    - 337 modules and 3,464 functions
    - 12,045 removed proof lines
    - four open-source Verus projects
      - VeriSMo
      - Vest
      - IronKV
      - Anvil
    - 673 tasks are labeled complex because their original proofs call other proof functions
  - introduces RagVerus
    - statically extracts function names, modes, signatures, calls, types, variables, imports, and containment
    - asks GPT-4o to summarize function behavior in natural language
    - embeds code and summaries with `text-embedding-3-large`
    - indexes them with FAISS through LlamaIndex
    - retrieves at most three proof examples
    - retrieves local type definitions, project conventions, and possible proof premises
    - gives the contexts to direct generation or AutoVerus-style repair
    - checks results with Verus and the Lynette syntax checker
- central idea
  - repository proof automation needs two distinct forms of context
    - global examples teach reusable proof patterns and Verus syntax
    - local repository facts expose available types, lemmas, and conventions
  - semantic similarity and code similarity are complementary but insufficient proxies for actual proof dependency
- what it does not do
  - it does not infer or validate specifications against human intent
  - it does not generate executable implementations
  - it does not repair several missing proofs together
  - it does not start from an unverified repository
  - each task removes one function's proof while keeping its specification, executable code, and other repository proofs available
  - the authors explicitly call even the complex setting a simplification of real repository verification

## benchmark design

- task construction
  - locate functions that contain proof annotations
  - remove all proof lines from one function
  - exclude tasks Verus can prove without those annotations
  - insert a candidate back into the original repository and run Verus
- acceptance requires both
  - correct
    - the repository passes Verus after insertion
  - intact
    - Lynette finds no change to executable code or specifications
- useful stratification
  - simple tasks need project syntax and definitions but no called proof functions
  - complex tasks need one or more proof-function premises
- important evaluation boundary
  - the retrieval pool includes verified examples from RVBench and other sources
  - the target function itself is filtered out
  - repositories are not held out from example retrieval
  - the experiment therefore tests in-corpus repository adaptation, not transfer to an unseen repository
- BLEU is reported as a secondary resemblance metric
  - recommendation: do not treat textual similarity to one human proof as evidence of correctness or maintainability

## full-paper results

- function-level VerusBench
  - 139 available tasks, five attempts per task
  - direct generation succeeds on 25 tasks, 18.0 percent
  - code-based retrieval succeeds on 84 tasks, 60.4 percent
  - summary-based retrieval succeeds on 76 tasks, 54.7 percent
  - the paper compares these five-attempt results with AutoVerus's reported 44.7 percent under as many as 125 calls
  - inference
    - well-selected examples can outperform much larger blind sampling budgets on small, familiar tasks
- expanded RVBench
  - counts in table 4 sum to 755 tasks
  - refinement succeeds on 111 tasks, 14.7 percent
  - retrieval plus refinement succeeds on 153 tasks, 20.3 percent
  - that is 42 additional successes and about 37.8 percent relative improvement by the table's counts
  - the abstract's 27 percent headline instead matches the original VeriSMo-only comparison
    - 59 versus 75 successes across 383 tasks
    - 27.1 percent relative improvement
  - the paper does not reconcile the inherited headline with the expanded benchmark aggregate
- project variation
  - VeriSMo: 59 to 75 successes
  - IronKV: 21 to 27
  - Vest-core: 11 to 24
  - Vest-example: 14 to 15
  - Anvil: 6 to 12
  - caution
    - the paper calls Anvil a 29-task subset while percentages in its table use a denominator of 30
- hard-task result
  - on 331 complex VeriSMo tasks, both refinement and retrieval plus refinement solve 52
  - the entire VeriSMo gain comes from simple tasks
    - refinement solves 7 of 52
    - retrieval plus refinement solves 23 of 52
  - this is the paper's most important negative result
    - similarity retrieval helps syntax and local conventions
    - it does not reliably recover the premise sets needed for nested proofs
- IronKV ablation
  - random retrieval solves 18 tasks, below refinement alone at 21
  - local-only retrieval solves 16
  - supplying only ground-truth premise signatures solves 22
  - full hybrid retrieval solves 27
  - inference
    - irrelevant context can be actively harmful
    - a correct lemma name without its definitions, types, and usage context may still be insufficient
- qualitative failures
  - project-specific integer and annotation syntax
  - semantically similar functions requiring different premises and proof styles
  - premise sets larger than the retriever's result cap
  - proofs longer than 80 annotation lines that likely need many more repair rounds

## exact publication boundary

- February 2025 preprint
  - *RAG-Verus: Repository-Level Program Verification with LLMs using Retrieval Augmented Generation*
  - arXiv `2502.05344v1`
  - four authors
    - Sicheng Zhong
    - Jiading Zhu
    - Yifang Tian
    - Xujie Si
  - RepoVBench contains 383 tasks from VeriSMo alone
  - 52 modules and 2,073 code pieces
  - this is reusable background, not the canonical rank-three publication
- October 2025 LMPL publication
  - *Towards Repository-Level Program Verification with Large Language Models*
  - two authors
    - Si Cheng Zhong
    - Xujie Si
  - RVBench expands to 755 tasks from four projects
  - 337 modules and 3,464 functions
  - adds project-wide results and the IronKV retrieval ablation
  - this exact publication is the canonical walkthrough target
- shared core
  - RagVerus architecture
  - GPT-4o generation and embedding-based retrieval
  - the 383-task VeriSMo experiment
  - the 27 percent relative-improvement claim
- conclusion
  - the publication extends the preprint
  - their identities, author lists, benchmark names, and benchmark sizes must remain distinct

## what was already done

- LeanDojo
  - established retrieval of premises for theorem proving before RagVerus
  - RagVerus applies repository and code metadata to Verus program proofs
- AutoVerus
  - generated and repaired annotations for isolated Verus functions
  - its 150-task VerusBench was near saturation under large sampling budgets
  - RagVerus adds dynamic examples and repository context
- Selene
  - pursued repository-scale proof automation for seL4 in Isabelle
  - it differs in language, tooling, and dependency handling
- the four-author RAG-Verus preprint
  - already introduced the pipeline and the 383-task VeriSMo benchmark
  - the LMPL publication's clearest increment is the four-project 755-task expansion and broader analysis
- later KVerus
  - adds a typed dependency graph, semantic lemma catalog, versioned Verus knowledge, error-targeted refinement, and accepted CortenMM patches
  - reports 51.0 percent on its repository benchmark
  - inference from these two reviewed papers
    - generic RAG or repository-context positioning is a weak technical differentiator
- Formal Disco
  - addresses verified trace generation and selection at scale
  - it complements repository retrieval rather than replacing it

## what VL should learn

- treat context construction as a typed product subsystem
  - stable fully qualified symbol identities
  - code modes, signatures, types, imports, calls, and containment
  - explicit provenance for generated summaries
  - separate indices for local dependencies and global examples
- separate retrieval jobs
  - premise retrieval asks what facts the proof requires
  - example retrieval asks how similar proof patterns are written
  - never substitute embedding proximity for a dependency edge when static evidence exists
- make context budgets observable
  - record candidate counts, selected items, rejected items, and token allocation
  - detect when the likely premise set exceeds the prompt budget
  - adapt retrieval depth or split the proof instead of silently truncating
- preserve the mutation boundary
  - executable code and specifications are immutable during proof completion
  - any proposed change to either enters a separate, human-reviewed workflow
- use negative retrieval controls
  - compare against no context and randomized context
  - measure when retrieved material reduces success
  - report premise recall, precision, and harmful-context rate
- retain verifier-grounded receipts
  - target and repository revision
  - locked specification and executable hashes
  - retrieved context and source revisions
  - model, prompt, and toolchain identities
  - verifier and intactness results
- stratify repository difficulty
  - required premise count and distance
  - proof length
  - project-specific type and macro use
  - temporal, concurrent, linear, separation, and quantified reasoning

## recommended VL integration

- immediate design work
  - extend the repository index with deterministic typed relations
    - call and specification dependencies
    - type definitions and trait implementations
    - module visibility and imports
    - existing proof lemmas and call sites
  - add semantic views without making them authoritative
    - summarize intent and usage
    - attach the exact source revision and generating model
    - retain source code beside every summary
  - introduce a proof-requirement stage
    - list required facts, lemma shapes, types, and unresolved assumptions
    - map each item to an exact repository source or mark it missing
  - build two context packets
    - local packet for project facts and callable premises
    - global packet for proof patterns and Verus idioms
  - run a fail-closed verifier loop
    - reject executable or specification changes
    - route missing-premise failures back to retrieval
    - route suspected specification defects to human review
  - store a compact run receipt for later audit and maintenance
- evaluate beyond the paper
  - hold out entire repositories
  - add chronological code and Verus upgrades
  - remove multiple interacting proofs rather than one function
  - measure whole-repository verification after every accepted patch
  - include cost, verifier calls, review time, proof size, and maintenance churn
  - test specification mutations and missing assumptions
- separate authorization required
  - implementation in VL product repositories
  - download or execution of the Zenodo artifact
  - reproduction of the published results

## product threat

- overall: medium current product threat and high prior-art threat
- high prior-art overlap
  - the paper establishes repository-aware Verus proof completion, hybrid example and dependency retrieval, an intactness gate, and a public multi-project benchmark
  - inference from the LMPL and KVerus walkthroughs
    - generic RAG or repository-context positioning is not a defensible VL differentiator
    - this is a technical product assessment, not a comprehensive novelty or legal determination
- medium implementation threat
  - the method is straightforward to reconstruct
  - the authors publish a benchmark and experiment archive
  - embedding search, FAISS, GPT-4o, Verus, and Lynette are commodity or public components
- low-to-medium demonstrated substitution
  - the strongest expanded result is 153 of 755 masked-function tasks
  - only one proof is missing at a time
  - specifications, implementations, and other proofs already exist
  - retrieval gives no gain on the 331 complex VeriSMo tasks
  - no held-out repository, longitudinal maintenance, review burden, or intent validation is evaluated
- later-work effect
  - KVerus is the greater immediate capability threat because it improves the repository knowledge and refinement stack and reports upstream integration
  - this LMPL paper remains strategically important as the clean multi-project benchmark
- inference
  - VL's defensible differentiation must be above similarity retrieval
    - specification governance
    - typed and provenance-aware repository knowledge
    - adaptive premise discovery
    - trustworthy multi-file change control
    - whole-project and longitudinal evidence

## limitations and cautions

- all generation results use one proprietary model snapshot
- no variance, confidence interval, cost, latency, or reviewer effort is reported
- the benchmark is derived by deleting known proofs from already verified projects
- the model can retrieve verified examples from the same benchmark corpus
- target exclusion prevents direct answer retrieval but not close structural or semantic neighbors
- summary generation and proof generation both use GPT-4o
- generic embedding similarity is not trained to recover logical premises
- retrieval limits are not reported consistently enough to reproduce every context budget from the paper alone
- the 27 percent headline describes the original VeriSMo subset, not the expanded table aggregate
- the Anvil task count and table denominator disagree by one
- the paper-linked repository points to Zenodo record `15313495`, which this walkthrough did not download or execute

## source-linked claims

- task boundary: full paper section 3.3
  - source phrase: `all proof lines omitted`
- intactness gate: full paper section 3.4
  - source phrase: `executable code and specifications remain unaltered`
- retrieval split: full paper section 4.2
  - source phrase: `few-shot example retrieval`
  - source phrase: `dependency retrieval`
- hard-task boundary: full paper section 5.4.1
  - source phrase: `one function at a time`
- complex-task result: full paper section 5.5.2
  - source phrase: `52 tasks`
- future end-to-end boundary: full paper section 7
  - source phrase: `dependencies are pre-filled and pre-verified`
- authenticity and exact bytes
  - Crossref DOI record
  - arXiv API record for `2509.25197v1`
  - saved PDF internal ACM metadata
  - collection provenance and checksum records cover the publisher PDF and readable extraction

## next discussion question

- should VL first build typed premise-retrieval observability on a held-out repository, or first build the fail-closed specification-intent gate that RVBench assumes away
