# A Benchmark for Vericoding: scale without intent closure

(authored by agents unless marked 🧑)

- paper
  - Sergiu Bursuc, Theodore Ehrenborg, Shaowei Lin, Lacramioara Astefanoaei,
    Ionel Emilian Chiosa, Jure Kukovec, Alok Singh, Oliver Butterley, Adem
    Bizid, Quinn Dougherty, Miranda Zhao, Max Tan, and Max Tegmark
  - *A Benchmark for Vericoding: Formally Verified Program Synthesis*
  - arXiv `2509.22908v1`, submitted 2025-09-26
  - preprint; this note does not describe it as peer reviewed
- canonical ID:
  `vpsd_6205243810c9b2dec10fc5c71df4ddc2620c5eee2df4ec281f9f91094db07622`
- walkthrough rank: tenth of the 23 accepted canonical papers

## decision

- technical value: high for corpus accounting and cross-language comparison
  - the authors collect or translate 12,504 formal specifications across Dafny,
    Verus, and Lean
  - 10,868 survive compilation, formatting, and quality checks
  - one common repair loop exposes large language and source effects
- empirical strength: medium-low for claims about correct software synthesis
  - success means that generated blocks pass bypass checks and the relevant
    verifier against a supplied specification
  - the main Verus result is a 44.3% union over nine models, not one model's
    pass@1; GPT-5 reaches 30.9%
  - models receive up to five sequential turns with verifier feedback, or ten
    for BigNum
  - the authors' manual audit of successful outputs finds roughly 9% weak
    specifications and 15% poor translations across languages and sources
- actionable VL conclusion
  - preserve gathered, retained, eligible, attempted, and accepted counts
  - report initial generation, repair trajectory, model result, and model-union
    result separately
  - make semantic specification admission a prerequisite distinct from
    verifier acceptance
  - stratify difficulty using task facts known before generation, not the
    length of a generated solution
- product threat
  - high prior-art threat to broad claims about originating large multilingual
    vericoding benchmarks or verifier-guided implementation-and-proof repair
  - medium capability threat from the released corpus, prompts, outcomes, and
    translation workflow
  - low current substitution threat because the benchmark starts from supplied
    specifications and does not perform a governed repository change
- no product change, experiment, or benchmark execution is authorized by this
  note

## evidence boundary

- authenticated collection PDF:
  [paper](</hdd1/sichanghe/paper_collection/A Benchmark for Vericoding: Formally Verified Program Synthesis, arXiv, 2025.pdf>)
- complete 25-page layout-preserving extraction:
  [text](</hdd1/sichanghe/paper_collection/A Benchmark for Vericoding: Formally Verified Program Synthesis, arXiv, 2025/A Benchmark for Vericoding: Formally Verified Program Synthesis, arXiv, 2025.txt>)
- collection provenance:
  [record](</hdd1/sichanghe/paper_collection/A Benchmark for Vericoding: Formally Verified Program Synthesis, arXiv, 2025/source-provenance.md>)
- PDF SHA-256:
  `84fc238c4689a4c1e3f7527c79bcb83918d98fd702f0e35c6adc4968f2f3cb45`
- extraction SHA-256:
  `7cbe35e5d94f2fe68d86dca32de08caafe68fc46a29e4ea8aa9cc79b7a427b78`
- provenance SHA-256:
  `b418c4adb0cf3dce9baea2979bad2a05f1dd658780d8ecfd86876a381a755861`
- evidence class
  - complete author-reported preprint, not an independent reproduction
  - the benchmark, models, translators, and verifiers were not run here
  - paper facts, walkthrough inferences, and proposed VL work are separated
    below

## what the paper means by vericoding

- input
  - a formal specification and its context
  - sometimes a natural-language description
  - holes replacing the main implementation, helper code, lemmas, and proofs
- output
  - implementation and proof generated jointly
  - any added imports, helpers, or lemmas needed to verify
- acceptance
  - reconstruct the full file from model-produced blocks
  - reject known proof bypasses and attempts to alter the obligation
  - run Dafny, Verus, or Lean
  - accept when both block validation and verification succeed
- correct interpretation
  - this is implementation-and-proof synthesis relative to a supplied contract
  - it is not natural-language requirement discovery
  - it is not evidence that the supplied contract expresses human intent
  - it does not isolate code generation from proof generation

## corpus construction and denominators

- three source classes
  - verification and vericoding benchmarks
    - DafnyBench, Verified Cogen, Verina, and CLEVER
  - coding benchmarks
    - APPS, FVAPPS, and HumanEval
  - mathematical-library documentation
    - NumPy Simple, NumPy Triple, and BigNum
- task creation
  - remove existing implementations and proof material from formal sources
  - autoformalize coding tasks and documentation
  - translate specifications among Dafny, Verus, and Lean
  - compile, parse tagged components, and run quality checks
- all-language accounting
  - 12,504 gathered specifications
  - 10,868 retained for experiments after checks
  - 6,174 gathered tasks labeled new or translated
  - 5,735 of those retained
- Verus accounting
  - 2,334 gathered specifications
  - 2,166 retained; the result table also reports 2,166 as its total
  - 2,162 gathered and 1,994 retained Verus tasks are labeled new
  - Verified Cogen supplies the 172 original Verus tasks; the other Verus sets
    are translations or newly formalized tasks
- experiment-table boundaries
  - the Verus table prints a 2,166-task total matching the retained count, but
    its eight source columns sum to 2,169 because DafnyBench is listed as 443
    rather than table 2's 440
  - the main Dafny table evaluates 2,161 tasks although 2,334 were retained
  - the main Lean table evaluates 2,361 tasks and reports the 4,006 retained
    FVAPPS tasks separately; together they are one below the 6,368 retained
    count because APPS is listed as 675 rather than table 2's 676
  - therefore the abstract's language percentages do not share one simple
    all-retained-task denominator
- inference
  - a VL benchmark receipt must retain each population transition
  - “12,504 tasks,” “10,868 retained tasks,” and the evaluated table rows answer
    different questions

## translation and quality controls

- translation loop
  - an LLM translates only the specification
  - the target verifier supplies errors for iterative repair
  - accepted translations must parse or verify in the target language
- semantic checks
  - an LLM judge compares source and translation for preconditions,
    postconditions, invariants, trivialization, and default bodies
  - humans inspect a random sample
  - the paper reports a handful of trivial solutions caused by lossy translation
    or incomplete human-authored specifications
- automated quality score
  - penalizes detected defaults, Lean `sorry` definitions, Verus ghost-type
    issues, and near duplicates
  - metadata records detected issues for each benchmark file
- material Verus warnings
  - the retained DafnyBench translation contains 150 flagged ghost-type issues
  - the retained Verina translation contains 18
  - near-duplicate rates reach 59.3% for Verified Cogen and 96.8% for BigNum;
    the latter is partly by construction
- boundary
  - compilation establishes language validity, not semantic fidelity
  - the LLM judge is not an independent semantic oracle
  - a composite quality score can hide which defect matters to a downstream
    result
  - translated variants and near duplicates can overstate effective diversity

## prompting, attempts, and success

- nine evaluated model families
  - GPT-5 and GPT-5-mini
  - Claude Opus 4.1 and Sonnet 4
  - Gemini 2.5 Pro and Flash
  - Grok Code, GLM-4.5, and DeepSeek Chat v3.1
- ordinary tasks
  - one initial generation
  - up to four repairs using the previous file and verifier errors
  - one continuous history rather than independent fresh samples
- BigNum
  - one initial generation and up to nine repairs
- prompts
  - require a JSON array with one replacement per tagged hole
  - include syntax guidance for Dafny and Verus
  - prohibit `assume`, `sorry`, `unimplemented!()`, and related bypasses
- success metric
  - at least one accepted state within that model's repair trajectory
  - model union means at least one of the nine models succeeds
  - it is not a deployed router result and it is not pass@1
- inference
  - repair budget is part of the capability result
  - initial, repaired, and union success must not share one unlabeled percentage
  - a continuous repair history can become stuck; the paper does not compare it
    with equal-budget independent samples

## reported results

- Verus, using the reported 2,166-task total despite the source-column
  inconsistency above
  - GPT-5: 30.9%
  - Claude Opus 4.1: 24.6%
  - Gemini 2.5 Pro: 24.1%
  - remaining individual models: 19.9% down to 6.1%
  - model union: 44.3%
- source variation in Verus
  - Verified Cogen: 49.4% for GPT-5 and 77.9% union
  - NumPy Triple: 47.5% for GPT-5 and 55.8% union
  - BigNum: 3.2% for GPT-5 and 4.8% union
  - HumanEval: 15.5% for GPT-5 and 26.1% union
- language comparison in the paper's principal tables
  - Dafny model union: 82.2% over 2,161 tasks
  - Verus model union: 44.3% over 2,166 tasks
  - Lean model union: 26.8% over 2,361 tasks, excluding the separately reported
    FVAPPS row
  - FVAPPS Lean model union: 41.8% over 4,006 tasks
- individual leaders
  - Claude Opus 4.1 leads the Dafny total at 67.5%
  - GPT-5 leads Verus at 30.9% and Lean at 17.9%
- natural-language addition on Verina
  - the authors report no statistically significant improvement
  - Verus model union falls from 46.8% with the formal specification to 37.8%
    with formal and informal descriptions
  - this is one source-specific experiment and does not establish that
    requirements are generally useless
- correct reading
  - the 44.3% headline shows complementarity among model trajectories
  - it does not show that one off-the-shelf model solves 44.3% on its first try
  - the source spread is too large for one aggregate to characterize Verus
    difficulty

## manual audit and specification adequacy

- audit design
  - inspect five randomly selected successful outputs for each language and data
    source
  - look for cheating and specification problems
- reported aggregate among audited successes
  - roughly 9% have specifications judged too weak
  - roughly 15% have poor translations
  - Verus has many weak specifications attributed to translation issues
  - automated validation catches other bypass attempts found by the authors
- paper interpretation
  - weak or mistranslated contracts remain valid formal tasks, but they are
    different tasks from the intended originals
- walkthrough interpretation
  - conditioning the audit on successful verification estimates a semantic
    defect rate among accepted outputs, not across the full corpus
  - the paper does not report confidence intervals, reviewer agreement, or
    source-by-source audit counts in the main text
  - a verifier can certify the wrong task perfectly

## difficulty analysis

- variables studied
  - specification character count
  - generated-solution character count
  - generated-solution length divided by specification length
- reported pattern
  - specification length is the weakest predictor
  - longer generated solutions correlate more strongly with failure
  - the ratio follows solution length more closely
- boundary
  - the analysis excludes cases where the model proposes no implementation
  - generated-solution length is observed after model action, so it is not an
    independent pre-task difficulty label
  - correlations do not show that shortening a solution causes verification
    success
- VL implication
  - stratify before generation using source, dependency count, loops, arithmetic,
    quantifiers, ghost/native crossings, proof obligations, and repository scope
  - analyze generated length as an outcome or mediator, not as the only notion
    of intrinsic task difficulty

## other results and reproducibility

- Dafny verification-only comparison
  - uses 782 original DafnyBench tasks and its original metric
  - gives models up to ten attempts, a larger token limit, and retries on token
    exhaustion
  - Claude Opus 4.1 reaches 89.2%; the model union reaches 96.8%
  - some models run only random subsets
  - this supports rapid tool-assisted progress but is not a controlled
    year-over-year comparison at fixed models, budgets, and samples
- released material described by the paper
  - metadata for all 12,504 gathered tasks
  - outcomes for 55,397 model-task experiments
  - scripts intended to replicate results
- reported cost and tools
  - about $25,000 through OpenRouter
  - Dafny 4.11.0
  - Lean and mathlib 4.23.0-rc2
  - Verus and vstd 2025.08.25
- no execution was performed for this walkthrough

## limitations and validity threats

- intent validity
  - the task assumes a supplied specification
  - translated and original specifications can be weak or wrong
  - the paper's own audit quantifies this among successful cases
- public-source exposure
  - APPS, HumanEval, DafnyBench, Verified Cogen, Verina, CLEVER, FVAPPS, and
    NumPy are public sources
  - “new” primarily denotes a new formalization or translation, not necessarily
    a private or unseen underlying problem
  - the paper does not report contamination testing or chronological holdouts
- effective diversity
  - many tasks are translations of the same source problem
  - some source groups have high near-duplicate rates
  - language totals therefore should not be added as independent semantic tasks
- oracle scope
  - success is verifier acceptance relative to the fixed specification
  - most tasks concern one function and are typically under 100 lines
  - no live repository build, dependency update, system property, maintenance
    change, or operational outcome is evaluated
- test ambiguity
  - section 3 says held-out unit tests are applied to some Lean outputs
  - section 4.1 says FVAPPS unit tests were not applied, while appendix 1.1 says
    they are applied
  - the FVAPPS behavioral-test status is therefore internally inconsistent
- licensing
  - the paper lists “Permission requested” for Verified Cogen while releasing a
    composite benchmark under MIT
  - VL should resolve source-specific reuse rights rather than infer them from
    the aggregate license
- reporting
  - internal task-count inconsistencies in the Verus and Lean result tables
  - no variance across fresh histories for the principal vericoding results
  - no confidence intervals for model or source rates
  - no complete per-task cost, latency, or human-review accounting
  - all results are author reported in a preprint

## what was already done

- Formal Disco
  - already scales open-ended verified-program generation and training data
  - this paper instead assembles a multilingual evaluation corpus and tests
    off-the-shelf models
- Verus-SpecGym
  - already makes specification faithfulness a separate executable evaluation
  - this paper's LLM judge and small manual sample are a weaker intent gate
- VeriContest
  - already separates specification, code, proof, and strict end-to-end tasks
  - provides reviewed specifications, judge-accepted code, checked proofs, and
    positive and negative tests for 946 retained Rust/Verus problems
  - this paper is much larger and multilingual, but evaluates joint code and
    proof against supplied specifications and reports substantial translation
    defects
- repository-level walkthroughs
  - already establish typed context, premise retrieval, immutable obligations,
    and whole-project boundaries for Verus proof work
  - this paper does not add repository change or maintenance evidence
- defensible increment
  - 12,504 gathered specifications across three verifier ecosystems
  - 10,868 retained artifacts with explicit source and translation accounting
  - one verifier-feedback protocol across Dafny, Verus, and Lean
  - released task metadata and 55,397 reported experimental outcomes
- prior-art boundary
  - it does not originate formal program synthesis, verifier feedback,
    autoformalization, cross-language translation, or proof repair
  - it is direct public prior art for combining those methods into a large
    multilingual vericoding benchmark

## what VL should learn

- make population accounting non-negotiable
  - gathered
  - translated
  - semantically admitted
  - syntactically retained
  - eligible for a specific experiment
  - attempted and accepted at each turn
- preserve lineage
  - underlying problem family and source revision
  - original versus translated language
  - translator, judge, verifier, and human-review identities
  - source license and permitted use
  - duplicate-family and contamination-risk labels
- separate acceptance gates
  - parse and compile
  - bypass and obligation-intactness checks
  - specification faithfulness
  - executable behavioral checks
  - verifier acceptance
  - repository build and project tests
  - maintenance and operational evidence
- report budgets honestly
  - first turn versus repaired success
  - sequential repair versus independent sampling
  - per-model result versus model union or an implemented router
  - verifier calls, tokens, latency, cost, and human intervention
- preserve failed specifications
  - weak, inconsistent, non-compiling, and mistranslated contracts form a
    separate specification-repair track
  - they must not silently enter verified-code training as valid intent

## recommended VL integration

- immediate design work, without changing the product
  - define a benchmark-admission record covering lineage, semantic review,
    syntax, duplicates, exposure risk, licensing, and discard reason
  - define an experiment receipt with immutable task, model, prompt, toolchain,
    attempt, diagnostic, patch, and acceptance identities
  - prohibit a model-union headline unless the executable selection policy and
    its total budget are also reported
  - require all translated variants of one problem family to remain in the same
    evaluation split
  - keep pre-generation difficulty features separate from generated-output
    measurements
- later evaluation proposal requiring separate authorization
  - compare initial generation, sequential repair, and independent sampling
    under equal verifier-call and token budgets
  - use private or chronological tasks and held-out repositories
  - report semantic, behavioral, proof, repository, and maintenance gates
    independently
  - include weak and mistranslated specifications as a named repair track
  - measure human admission and repair time

## threat assessment

- high prior-art threat
  - public work already offers large cross-language benchmark construction,
    LLM-based specification translation, bypass detection, verifier-guided
    repair, and model/source comparisons
  - VL cannot broadly claim to invent multilingual vericoding evaluation or a
    basic verifier-feedback loop
- medium capability threat
  - 2,166 retained Verus tasks, prompts, metadata, translations, and outcomes
    can improve training, retrieval, routing, and evaluation
  - cross-model complementarity and source-specific rates expose a concrete
    optimization agenda
  - weak translations, duplicates, public-source exposure, and missing intent
    closure reduce the corpus's trustworthy effective scale
- low current substitution threat
  - the system does not decide what a human wants, scope a repository change,
    preserve a project transaction, or verify maintenance and operations
  - the Verus headline is a nine-model repair union on supplied contracts, not
    an autonomous product success rate
- inference
  - VL should adopt the accounting discipline and multilingual stress test
  - VL should differentiate through governed intent, provenance, repository
    transactions, longitudinal proof maintenance, and decision-ready receipts

## rank-ten rationale

- ranks one through nine cover more immediate capability, repository,
  translation, specification-faithfulness, and evaluation dependencies
- this paper follows VeriContest because it broadens the corpus and language
  comparison while using a less complete requirement-to-result contract
- its durable value is the evidence ledger
  - population transitions
  - translation provenance
  - attempt budgets
  - language and source stratification
- its 44.3% Verus union is informative only with those qualifiers attached

## source anchors

- identity and corpus scale: abstract and table 2
  - source phrases: “12,504 formal specifications”; “6,174 are new”
- task boundary: section 3.1
  - source phrase: “context and the spec”
- translation validation: section 3.3
  - source phrase: “LLM as a judge”
- attempt budget: section 4 and appendix 1.3
  - source phrase: “5 attempts per task”
- semantic audit: section 4
  - source phrases: “9%”; “15%”
- Verus result: section 4.1 and table 3
  - source phrase: “44.2%” in prose; table reports 44.3%
- scope limit: conclusion
  - source phrase: “under 100 lines of code”
- reproducibility: appendix 1.8
  - source phrase: “about $25,000”
