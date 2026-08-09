# 🤖 StarVerus: corrected full-paper study, August 2026

## 🤖 decision

- demonstrated capability threat: medium-high, with medium confidence
  - best paper result: 675 of 762 tasks, or 88.6%, with five-shot
    DeepSeek-Reasoner [`SV-PAPER-main-result`]
  - industrial result: 112 of 163 obligations across six VOSTD memory targets,
    or 68.7%, with one target fully discharged [`SV-PAPER-industrial`]
  - confidence is reduced because the frozen public snapshot maps
    demonstrations within the same released 762-task key set, while no replay
    establishes that it is the exact evaluated retrieval setup; the paper also
    reports no held-out split, repeated-run uncertainty, complete semantic
    oracle, or independently replayable result ledger [`SV-PAPER-retrieval`,
    `SV-ART-knn`, `SV-ART-repro-gap`]
- practical engineering threat: medium
  - the public implementation is substantial and matches the broad architecture
    [`SV-ART-inspection`]
  - it is not turnkey: checked-in defaults differ from paper settings, setup is
    incomplete, and no benchmark, baseline, ablation, mutation, or FVT result
    ledger is released [`SV-ART-config-gap`, `SV-ART-repro-gap`]
  - the public commit predates the publisher PDF's modification date by three
    months, so it may not be the exact evaluated revision
    [`SV-ART-version-gap`]
  - the repository has no top-level code license, which also limits immediate
    reuse [`SV-ART-repro-gap`]
- practical positioning threat: medium-high
  - it is a published ACM KDD proceedings article with a public author artifact
    and Ant Research coauthors [`SV-PUB-status`, `SV-ART-provenance`]
  - publication establishes venue acceptance, not the correctness of every
    empirical inference; no public review reports were found

## 🤖 what StarVerus does

- formal input and output
  - input: an interdependent Rust codebase with contracts and proofs removed
  - output: per-function contracts plus proof annotations
  - formal success: Verus reports at least one verified obligation and zero
    errors for each implementation/specification pair
  - boundary: Verus proves the implementation against the generated contract;
    it does not prove that the contract captures an external requirement
  - sources: [`SV-PAPER-scope`, `SV-PAPER-property`]
- generation
  - build a global function call graph with SCIP
  - process leaves before callers
  - give each target the contracts of callees as boundary constraints and
    caller call sites as usage requirements
  - generate five initial candidates at temperature 1.0 and rank them using
    Verus counts
  - sources: [`SV-PAPER-context`, `SV-PAPER-settings`]
- contract alignment
  - an LLM judge compares the generated contract with implementation and graph
    context
  - an LLM aligner revises a judged-misaligned contract
  - the process stops on an aligned judgment or after three iterations
  - reaching the budget proceeds to proof repair even if alignment is not
    established
  - source: [`SV-PAPER-alignment`]
- proof repair
  - a planner classifies the current verifier failure
  - a specialized repairer produces a natural-language plan
  - an actor generates three code candidates per round
  - failure history is passed only to the repairer to discourage repetition
  - source: [`SV-PAPER-repair`]
- structural reset
  - after three unsuccessful rounds, a rewriter prunes assertion bloat and
    resynthesizes loop invariants before another three rounds
  - the reset is permitted once per function
  - this is a proof-artifact reset, not model-context compaction
  - the paper reports no context-drift experiment or shrinking of the model's
    visible context window
  - source: [`SV-PAPER-reset`]

## 🤖 systematic evaluation walkthrough

- benchmark construction
  - 762 tasks from VerusBench, MBPP, HumanEval, VeriCoding, and DAFNY2VERUS
  - the authors strip contracts and proofs, port legacy tasks to current Verus,
    deduplicate, remove trivial tasks, and filter incompatible tasks
  - expert-annotated versions remain as references
  - strengths
    - broader and more diverse than one small proof benchmark
    - explicit modernization and deduplication
  - weaknesses
    - no frozen selection manifest or before-and-after counts
    - no held-out, project-disjoint, or source-family-disjoint test split
  - sources: [`SV-PAPER-benchmark`, `SV-PAPER-construction`]
- five-shot retrieval
  - the paper selects five semantically similar demonstrations per target
  - static inspection of the frozen public snapshot shows all 3,810
    demonstration identifiers are other keys in its same 762-target map
  - for that snapshot, this is not direct self-copying, but it is an in-corpus,
    transductive setup rather than a clean held-out demonstration pool
  - because the released commit may predate the final evaluated version and no
    paper-run command is preserved, this supports but does not prove the exact
    retrieval setup used for the paper's reported results
  - source: [`SV-PAPER-retrieval`, `SV-ART-knn`]
- mechanical verifier metric
  - a task passes if Verus accepts the generated code/specification pair
  - this is a strong proof-validity signal
  - the paper calls it a definitive measure of functional correctness and
    logical completeness; that interpretation is too broad when the contract
    is itself generated
  - source: [`SV-PAPER-property`]
- adapted baselines
  - AlphaVerus and AutoVerus receive raw code plus one prompt instruction to
    generate a contract, while their default configurations are retained
  - StarVerus reports 88.6% at its best, adapted AlphaVerus 26.9%, and adapted
    AutoVerus 25.9%
  - strengths
    - compares against recognizable prior systems on the new task
  - weaknesses
    - neither baseline was designed for contract generation
    - the task is materially different from original AutoVerus
    - StarVerus uses five initial candidates and a wide multi-round pipeline;
      no equal token, call, or latency budget is imposed
  - sources: [`SV-PAPER-baselines`, `SV-PAPER-main-result`, `AV-scope`]
- reference similarity
  - BLEU compares generated fully annotated programs with expert references
  - StarVerus reports 58.99 at five-shot, versus 56.39 for AlphaVerus
  - BLEU can detect surface similarity but cannot establish logical
    equivalence, refinement, completeness, or developer intent
  - the paper itself later calls BLEU incomplete
  - source: [`SV-PAPER-bleu`, `SV-PAPER-llm-judge`]
- LLM semantic judge
  - the judge is applied only to successfully verified VerusBench outputs
  - 90.28% of high-BLEU outputs and 44.44% of low-BLEU outputs are labeled
    high quality
  - Figure 9 reports the judge prompt
  - the paper does not identify the judge model, sample sizes, sampling
    procedure, calibration, human validation, or agreement
  - this is agents judging agents, not an independent intent oracle
  - source: [`SV-PAPER-llm-judge`]
- mutation testing
  - a generated contract is tested against modified implementations; lower
    mutated-code pass rate suggests a stronger contract
  - StarVerus reports 7.56%, versus 20.81% for AutoVerus and 8.78% for
    AlphaVerus
  - this is the strongest non-LLM specification-strength signal in the paper
  - the paper omits mutation operators, number of mutants, sampling, equivalent
    mutants, per-task distributions, and uncertainty
  - its cited prior paper, SpecGen, mutates candidate specifications to generate
    new specifications; it does not define StarVerus's mutated-implementation
    evaluation procedure
  - mutation rejection tests strength against chosen faults, not full agreement
    with developer intent
  - sources: [`SV-PAPER-mutation`, `SPECGEN-mutation-role`]
- ablations
  - remove contract alignment, actor width, rewriter, or planner one at a time
  - all are evaluated only on the 53-task DAFNY2VERUS subset
  - results are normalized ratios rather than absolute task counts
  - the rewriter has the largest reported effect
  - the central call graph and caller/callee context are not ablated
  - source: [`SV-PAPER-ablation`]
- cost and convergence
  - with GPT-4o, StarVerus reports 34.4% more latency and 24.7% more tokens than
    adapted AutoVerus, with pass rate rising from 25.9% to 37.3%
  - the paper reports stage trigger/fix counts and when successful repairs occur
  - strengths
    - cost and stage attribution are useful engineering measurements
  - weaknesses
    - no equal-budget comparison, price, per-task distribution, or repeated-run
      uncertainty
    - stage fixes are events aggregated across runs, not unique solved tasks
  - sources: [`SV-PAPER-cost`, `SV-PAPER-stage-result`]
- small-model analysis
  - three 7B/8B backbones solve 37 to 39 of 53 DAFNY2VERUS tasks at five-shot
  - this supports backend robustness on that subset
  - it does not establish held-out dataset or repository generalization
  - source: [`SV-PAPER-small-models`]
- industrial evaluation
  - six reported Asterinas VOSTD memory-management targets
  - reported obligation results
    - memory-region initialization: 22 of 22
    - page-acquisition safety: 27 of 34
    - raw-pointer conversions: 26 of 38
    - VM reader and writer: 22 of 36
    - page-table cursor navigation: 4 of 8
    - page-table guards: 11 of 25
  - total: 112 of 163, or 68.7%
  - strengths
    - advanced Verus features, pointer reasoning, ghost state, permissions, and
      cross-module dependencies
    - stronger practical evidence than toy functions alone
  - weaknesses
    - no FVT baseline, repeated runs, human effort, cost, per-obligation output,
      or whole-project terminal receipt
    - only one of six targets is fully discharged
    - the released inputs are staged VOSTD-derived projects, not an unmodified
      whole Asterinas tree
  - boundary
    - this is an industrial-source case study integrated with a verification
      pipeline
    - it is not evidence that StarVerus verified or was deployed in the whole
      operating system
  - sources: [`SV-PAPER-industrial`, `SV-ART-staging`, `VOSTD-scope`]
- statistical and validity reporting
  - no random seeds, repeated-run variance, confidence intervals, significance
    tests, dedicated limitations section, or threats-to-validity section
  - no human semantic audit of generated contracts
  - no post-training or privately held test set is reported or described
  - source: bounded full-text audit in the

## 🤖 what the specification guarantee does and does not mean

- established
  - Verus accepts the synthesized contract, proof annotations, and executable
    implementation together [`SV-PAPER-property`]
  - aggregate mutations survive less often under StarVerus specifications than
    under the two adapted baselines [`SV-PAPER-mutation`]
  - generated annotations have some lexical similarity to expert references
    [`SV-PAPER-bleu`]
- not established
  - equivalence or refinement between the generated and expert contracts
  - completeness relative to natural-language requirements
  - agreement with developer intent on a human-audited sample
  - preservation of executable semantics through a runner-owned equality gate
  - robustness against requirements omitted by both humans and agents
- why the LLM judge is insufficient
  - it sees implementation plus program context, not a separate authoritative
    requirement
  - it can reward a contract that describes what the code happens to do
  - the public artifact skips intent coverage when no guideline exists and can
    fail open after all candidates are rejected [`SV-ART-intent-gap`]
- why mutation testing helps but does not close the gap
  - killing plausible wrong implementations rejects some weak or vacuous
    contracts
  - results depend on mutation operators and sampled faults
  - missing requirements that no mutant exercises remain invisible
- evaluation implication for Verus
  - there is no single perfect specification oracle, because human references
    can also be incomplete
  - use independent, disagreement-revealing signals
    - verifier acceptance against a frozen implementation
    - executable-code and trust-boundary equality gates
    - requirement-to-clause coverage from an independent task statement
    - mutation rejection across named fault classes
    - vacuous-precondition and weak-postcondition checks
    - client or downstream proof obligations
    - blinded human adjudication on changed or disputed cases
  - report each signal separately instead of collapsing them into one
    specification-correctness label

## 🤖 novelty and plausible venue-fit inference

- demonstrated contribution package
  - a concrete upstream problem not solved by original AutoVerus
  - an integrated call-graph and contract/proof repair method
  - a large transformed benchmark suite
  - multiple backbones and adapted state-of-the-art baselines
  - component, cost, semantic, mutation, and industrial analyses
- plausible KDD fit
  - inference: the combination of an agent architecture, semantic retrieval,
    multi-model evaluation, and industrial case study provides a coherent
    applied-AI systems story
  - inference: 88.6% headline performance and a public implementation make the
    contribution easy to communicate
  - these are venue-fit factors inferred from the paper; they are not claims
    about private reviewer reasoning
- why acceptance does not validate the broadest claims
  - publication establishes that ACM KDD accepted and published the article
  - it does not supply missing held-out controls, human semantic validation,
    mutation details, statistical uncertainty, or artifact replay

## 🤖 publication and local artifacts

- publication
  - authoritative landing: <https://doi.org/10.1145/3770855.3818485>
  - status: published ACM KDD 2026 proceedings article
  - pages: 7444–7455
  - Crossref publication date: 2026-08-08
  - license record: CC BY 4.0 for the version of record
  - review boundary: venue acceptance is established; public review reports are
    unavailable [`SV-PUB-status`, `SV-PUB-license`]
- full paper
  - SHA-256:
    `4798ac778173cf1b33eb4d3b18b3757fa6bfa1d5bf49f574cc676f2e76ab73d6`
- verified extraction
  - SHA-256:
    `3dc8ad1863d7440c9d0559eb1b83d7400dc2eef8e832b4eaf219052ebeea15b1`
- full-paper source map
- access and process correction
- author artifact
  - SHA-256:
    `f8f88d07c5bf591fd4b6c72008d8bdd1dfdd991c94c450958c6582ee277d4567`
  - frozen commit:
    `52a0e4ef54c188d0490188cdc7d476fc0d3c7726`
- artifact audit

## 🤖 AutoVerus source map

- authoritative landing: <https://doi.org/10.1145/3763174>
- local PDF:
- PDF SHA-256:
  `6c750ff7c3f0de09be7685fa797ee338d669778bc38adbd44230e9668582c5fc`
- `AV-scope`
  - exact quote: “provided with Rust code and its specifications”
  - exact quote: “a single Rust function is the unit”
- `AV-method`
  - exact quote: “three phases of proof construction”
  - exact quote: “debugging guided by verification errors”
- `AV-discipline`
  - exact quote: “compiled to the same executable”
  - exact quote: “cannot tweak them to change the goal”
- `AV-benchmark`
  - exact quote: “150 non-trivial proof tasks”
  - exact quote: “mainly translated”
- `AV-result`
  - exact quote: “137 out of 150”
  - exact quote: “three times”
- `AV-models`
  - exact quote: “GPT-4o”
  - exact quote: “Deepseek-R1-32B”

## 🤖 directly relevant related work

- RAG-Verus
  - authoritative preprint: <https://arxiv.org/abs/2502.05344>
  - relevance
    - repository context for proof completion, but preconditions and
      postconditions are already present
    - its paper evaluates only the simple embedding-based dependency method
    - StarVerus moves graph context into contract generation and repair
  - exact quote: “pre-/post-conditions”
  - exact quote: “383 proof completion tasks”
- VeruSAGE
  - authoritative preprint: <https://arxiv.org/abs/2512.18436>
  - relevance
    - system proof tasks across eight Rust systems, but with full specification
      functions and contracts supplied
    - demonstrates that extra orchestration can hurt capable models
    - StarVerus appendix reports higher rates on its transformed benchmark, but
      does not report baseline adaptation or budget details
  - exact quote: “849 proof tasks”
  - exact quote: “fully defined spec functions and pre- and post-conditions”
- SpecGen
  - authoritative DOI: <https://doi.org/10.1109/ICSE55347.2025.00129>
  - PDF SHA-256:
    `b82756165c4a9110f37b0cd7b52a54c4bc13b477057e9fe6b113b37e77bac92c`
  - relevance
    - StarVerus cites SpecGen for mutation testing
    - SpecGen actually mutates failed generated specifications as part of
      specification generation, then evaluates semantics through a blinded
      study with 15 Ph.D. students
    - it does not supply StarVerus's missing mutated-code evaluation procedure
  - exact quote: “mutation operators to the model-generated specifications”
  - exact quote: “15 Ph.D. students”
