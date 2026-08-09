# 🤖 StarVerus and VL: corrected full-paper study, August 2026

- focus
  - determine what the published StarVerus paper actually demonstrates
  - compare its scope, guarantee, architecture, evaluation, and artifact with
    AutoVerus and current VL evidence
  - assess novelty, capability, evaluation, and practical competitive threats
  - extract lessons for the existing VL CLI without proposing a third arm

## 🤖 correction and evidence boundary

- correction
  - the first study incorrectly treated a transient Cloudflare verification
    response as a final access boundary
  - the established persistent personal-browser path returned the real ACM PDF
    after waiting
  - the metadata-only conclusion and its prior review are superseded
- access lesson
  - a bot-detection interstitial is an intermediate browser state
  - wait for it to resolve and inspect the final status and content type before
    declaring a public primary source blocked
  - an anonymous-client 403 is not sufficient evidence of unavailability
  - source: [`SV-ACCESS-final`]
- primary evidence now frozen
  - publisher-hosted 12-page PDF
  - independently cross-checked Marker and `pdftotext` extractions
  - Crossref publication record
  - author-released artifact at a frozen commit
  - detailed source map:
    [full-paper source map](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/full-paper-source-map-20260809.md>)

## 🤖 decision

- strategic relevance: high
  - StarVerus targets the upstream gap that AutoVerus leaves open: generating
    contracts and proofs from unannotated Rust while using cross-function
    dependencies [`SV-PAPER-scope`, `AV-scope`]
  - this overlaps directly with the future repository-level specification
    discovery that VL has not yet demonstrated [`VL-boundary`]
- novelty threat: high
  - the published contribution combines complete specification synthesis,
    leaf-to-root call-graph scheduling, caller-and-callee context, contract
    alignment, specialized proof repair, and an industrial VOSTD study
    [`SV-PAPER-context`, `SV-PAPER-alignment`, `SV-PAPER-industrial`]
  - planner, repairer, actor, and rewriter labels are not individually novel;
    the novelty threat comes from the integrated Rust/Verus system and its
    positioning on contract plus proof generation
  - a future VL claim framed only as the first repository-scale LLM system for
    Verus contract-and-proof generation is no longer credible
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
- evaluation threat: high
  - the paper assembles the kind of broad empirical story reviewers can read:
    five benchmark families, multiple backbones, adapted baselines, four
    ablations, cost, stage attribution, small-model results, BLEU, an LLM
    judge, mutation testing, and an OS case study
  - the package is broader than current VL evidence even though several pieces
    are methodologically weak [`SV-PAPER-ablation`, `SV-PAPER-cost`,
    `SV-PAPER-mutation`, `VL-six-lane`]
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
- focused action
  - keep one VL CLI and the existing two-arm evaluation design
  - absorb graph-ordered caller/callee context, contract-versus-proof failure
    classification, and structural proof reset inside the CLI
  - differentiate through fail-closed specification-strength evaluation,
    immutable executable-code boundaries, held-out repository tasks, equal
    budgets, repeated runs, and whole-project receipts

## 🤖 human follow-up: VL research focus

- precise reading
  - StarVerus does not produce a verifier-accepted contract-and-proof output
    for every attempted target
    - 675 of 762 transformed benchmark tasks pass at its best
      [`SV-PAPER-main-result`]
    - 112 of 163 industrial obligations pass, and only one of six targets is
      complete [`SV-PAPER-industrial`]
  - this establishes unresolved verification failures
    - the aggregate result does not identify whether each failed target has a
      wrong contract, an inadequate proof, or both
      [`SV-PAPER-main-result`, `SV-ART-repro-gap`]
  - successful targets have a separate problem
    - Verus establishes consistency between implementation and generated
      contract
    - it does not establish that the contract captures an independently stated
      human, API, or security requirement [`SV-PAPER-property`]
- model-strength interpretation
  - the evaluation is not uniformly based on small models
    - the best aggregate result uses DeepSeek-Reasoner
    - the main table also includes GPT-4o, Qwen3-Coder, DeepSeek-Chat, and
      Llama 4 Maverick [`SV-PAPER-backbones`]
  - three 7B or 8B models are evaluated only on the 53-task DAFNY2VERUS subset
    [`SV-PAPER-small-models`]
  - the paper's narrow ablation suggests stronger models may need less
    heuristic scheduling [`SV-PAPER-backbones`]
  - inference
    - stronger VL models may reduce reliance on heuristic scheduling or
      planning
    - effects on the broader proof-repair pipeline are untested
    - no reported experiment shows that model strength supplies an independent
      intent oracle or makes generated contracts complete
    - no direct StarVerus-versus-current-VL model comparison exists
- VL research center
  - working priority
    - treat proof closure as a supporting subsystem
    - make generation of externally meaningful specifications the main research
      problem
  - evidence boundary
    - current VL evidence establishes local proof closure
    - it does not establish repository-wide proof completion or broad invariant
      invention [`VL-proof`, `VL-boundary`]
  - therefore
    - use Verus as the necessary code-versus-contract consistency oracle
    - evaluate specification meaning and strength independently
    - do not present verifier acceptance as specification correctness
- manager handoff, intentionally close to the human-facing recommendation
  - improve the existing command-line verification agent
  - do not build or evaluate a separate StarVerus-style pipeline as a third
    system
  - first add dependency ordering and information from both called functions
    and callers
    - repository-scale contracts need both
  - then separate contract failure from proof failure
    - compare the contract with an independently stated requirement first
    - regenerate the contract when that semantic check fails
    - repair proof code for the unchanged implementation only after the
      contract survives the semantic check
    - after the unchanged implementation and contract verify, test contract
      strength with named faulty implementations under a fixed evaluation
      harness
    - regenerate the contract when the post-verification strength check fails
  - allow one clean proof rewrite after a fixed, predeclared repair limit
  - center the stronger research contribution on trustworthy evaluation
    - use previously unseen repositories
    - publish the faulty-code changes used to test contract strength
    - have reviewers judge contract meaning without knowing which system wrote
      it
    - equalize model budgets and repeat runs
    - reject generated annotations that tell Verus to trust unproved code
    - save a complete verifier result ledger for every project target
  - primary evaluation question
    - does the generated contract capture an independently stated requirement
      strongly enough to reject meaningful faulty implementations

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
    [source map](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/full-paper-source-map-20260809.md>)

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

## 🤖 comparison matrix as a minimal bullet tree

- problem scope
  - StarVerus
    - contract plus proof generation from unannotated functions using project
      call-graph context [`SV-PAPER-scope`, `SV-PAPER-context`]
  - AutoVerus
    - proof annotations for a single function whose specifications are already
      supplied [`AV-scope`]
  - current VL
    - focused local proof work and named-target specification work; autonomous
      repository-wide specification discovery is not demonstrated
    - classification: verified current capability and limitation
    - source: [`VL-boundary`]
- verified property
  - StarVerus
    - implementation satisfies a generated contract under Verus; external
      intent remains incompletely evaluated [`SV-PAPER-property`]
  - AutoVerus
    - implementation satisfies fixed specifications, with Lynette checking
      executable equivalence and fixed contracts [`AV-discipline`]
  - current VL
    - tool output rather than agent self-report is the success oracle
    - classification: verified current capability
    - source: [`VL-oracle`]
- automation architecture
  - StarVerus
    - call graph, dual-view context, contract alignment, specialized repair,
      history, and structural rewrite [`SV-PAPER-context`, `SV-PAPER-repair`]
  - AutoVerus
    - preliminary generation, generic-tip refinement, candidate merging, and
      verifier-error debugging [`AV-method`]
  - current VL
    - one repository-level pilot harness and CLI with governed experiment
      operations
    - classification: verified current capability
    - sources: [`VL-harness`, `VL-operating`]
- specification generation
  - StarVerus
    - explicit contract generation, with LLM alignment and aggregate mutation
      evaluation [`SV-PAPER-alignment`, `SV-PAPER-mutation`]
  - AutoVerus
    - contracts and specification functions are fixed inputs [`AV-scope`]
  - current VL
    - named-target specification work exists, but broad autonomous discovery
      does not
    - classification: verified current capability and limitation
    - source: [`VL-boundary`]
- proof generation
  - StarVerus
    - multiple initial candidates, verifier-guided specialized repair, and a
      one-time assertion-bloat rewrite [`SV-PAPER-settings`, `SV-PAPER-reset`]
  - AutoVerus
    - loop-invariant synthesis, refiners, candidate merging, and error-guided
      debugging [`AV-method`]
  - current VL
    - agents close local proof obligations; broad invariant invention is not
      established
    - classification: verified current capability and limitation
    - source: [`VL-proof`]
- model and tool role
  - StarVerus
    - five reported backbone families, Qwen embeddings for five-shot retrieval,
      LLM roles for judgment and repair, and Verus as the mechanical checker
    - exact per-role paper-run model assignment is not fully reported
    - sources: [`SV-PAPER-backbones`, `SV-PAPER-settings`,
      `SV-PAPER-retrieval`]
  - AutoVerus
    - GPT-4o default with other model variants, plus Verus and Lynette
      [`AV-models`, `AV-discipline`]
  - current VL
    - verifier output is the oracle; reusable guidance is a governed experiment
      input
    - classification: verified capability plus aspirational design standard
    - sources: [`VL-oracle`, `VL-guidance`]
- benchmarks
  - StarVerus
    - 762 transformed tasks plus six VOSTD targets [`SV-PAPER-benchmark`,
      `SV-PAPER-industrial`]
  - AutoVerus
    - 150 mostly translated, single-function fixed-specification tasks
      [`AV-benchmark`]
  - current VL
    - six-lane real-project work is useful but is not a controlled comparison
    - classification: bounded experimental evidence
    - source: [`VL-six-lane`]
- evaluation evidence
  - StarVerus
    - broad multi-signal evaluation, but no held-out split, repeated-run
      uncertainty, human semantic audit, equal-budget baseline, or replayable
      result ledger
  - AutoVerus
    - three-run reporting, same-budget baseline, phase/model ablations, time and
      LLM calls, and explicit benchmark limits [`AV-result`, `AV-benchmark`]
  - current VL
    - paired, arm-blinded, uncertainty-aware research standard exists, but the
      cited real-project work is not a completed controlled comparison
    - classification: aspirational design plus bounded experimental evidence
    - sources: [`VL-evaluation`, `VL-six-lane`]
- principal limitation
  - StarVerus
    - specification intent and executable-code preservation are not
      independently established; public replay is incomplete
      [`SV-ART-intent-gap`, `SV-ART-integrity-gap`, `SV-ART-repro-gap`]
  - AutoVerus
    - fixed specifications and single-function tasks [`AV-scope`]
  - current VL
    - repository-wide specification discovery and broad invariant invention
      remain unestablished
    - classification: verified current limitation
    - sources: [`VL-boundary`, `VL-proof`]

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

## 🤖 actionable lessons for VL

- adopt inside the existing CLI
  - bottom-up dependency scheduling
  - compact caller and callee context
  - explicit contract-mismatch versus proof-failure classification
  - failure history delivered only where it is useful
  - a bounded structural rewrite when incremental assertions accumulate
- strengthen beyond StarVerus
  - freeze executable code and accepted contract boundaries mechanically
  - reject new trust bypasses mechanically
  - make semantic-audit rejection fail closed or escalate explicitly
  - evaluate specification strength with named mutation families and per-task
    denominators
  - include a blinded human audit of changed or disputed contracts
  - split by held-out repository or source family and keep demonstrations out of
    the test pool
  - equalize token/call/time budgets and report repeated-run uncertainty
  - require whole-project terminal receipts in addition to local progress
  - release exact configurations, per-task outcomes, seeds, costs, and failure
    artifacts
- do not copy
  - do not add a third standing VL arm
  - do not equate more named agents with a causal contribution
  - do not describe a proof-artifact rewrite as context-window reset
  - do not call Verus acceptance specification completeness
  - do not call partial VOSTD obligation coverage whole-OS verification

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
  - [PDF](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026.pdf>)
  - SHA-256:
    `4798ac778173cf1b33eb4d3b18b3757fa6bfa1d5bf49f574cc676f2e76ab73d6`
- verified extraction
  - [Markdown](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026.md>)
  - SHA-256:
    `3dc8ad1863d7440c9d0559eb1b83d7400dc2eef8e832b4eaf219052ebeea15b1`
- full-paper source map
  - [source map](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/full-paper-source-map-20260809.md>)
- access and process correction
  - [receipt](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/publisher-access-receipt-20260809.md>)
- author artifact
  - [archive](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/official-artifact-52a0e4ef54c188d0490188cdc7d476fc0d3c7726.zip>)
  - SHA-256:
    `f8f88d07c5bf591fd4b6c72008d8bdd1dfdd991c94c450958c6582ee277d4567`
  - frozen commit:
    `52a0e4ef54c188d0490188cdc7d476fc0d3c7726`
- artifact audit
  - [audit](</hdd1/sichanghe/paper_collection/StarVerus- LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang, KDD, 2026/official-artifact-audit-20260809.md>)

## 🤖 AutoVerus source map

- authoritative landing: <https://doi.org/10.1145/3763174>
- local PDF:
  [paper](</hdd1/sichanghe/paper_collection/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025.pdf>)
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
  - [local PDF](</hdd1/sichanghe/paper_collection/RAG-Verus- Repository-Level Program Verification with LLMs using Retrieval Augmented Generation, Si Cheng Zhong, Xujie Si, LMPL, 2025.pdf>)
  - relevance
    - repository context for proof completion, but preconditions and
      postconditions are already present
    - its paper evaluates only the simple embedding-based dependency method
    - StarVerus moves graph context into contract generation and repair
  - exact quote: “pre-/post-conditions”
  - exact quote: “383 proof completion tasks”
- VeruSAGE
  - authoritative preprint: <https://arxiv.org/abs/2512.18436>
  - [local PDF](</hdd1/sichanghe/paper_collection/VeruSAGE- A Study of Agent-Based Verification for Rust Systems, Chenyuan Yang, Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu, arXiv, 2026.pdf>)
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
  - [local PDF](</hdd1/sichanghe/paper_collection/SpecGen- Automated Generation of Formal Program Specifications via Large Language Models, Lezhi Ma, Shangqing Liu, Yi Li, Xiaofei Xie, Lei Bu, ICSE, 2025.pdf>)
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

## 🤖 frozen VL evidence map

- freeze time: 2026-08-09 PDT
- VeruLaw repository commit:
  `026cbb0a5763d5c4ef577deacbb42c68a58c13b1`
- routing boundary
  - `vl_results_doc_update.md`, `vl_program_mgr.md`, `vl_build_mgr.md`, and
    `vl_bugfind_mgr.md` were used only to locate durable artifacts
  - task-routing prose is not technical evidence
- `VL-harness`
  - source: [Midas Lex README](</ssd1/sichangheagent/VeruLaw/README.md>)
  - SHA-256:
    `fe8f3f065390dbc9637e5f73a5657734d2c37f1b52d632460b10bd256f0dd069`
  - exact quote: “harness for repository-level Verus proof-synthesis pilots”
  - classification: verified current capability
- `VL-oracle`
  - source: Midas Lex README
  - exact quote: “output, not agent self-report, is the success oracle”
  - classification: verified current capability
- `VL-boundary`
  - source:
    [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - SHA-256:
    `609be32f7b363ca6ae57fbfc3ba5634ad6538569a1b443be9d6b188094de3480`
  - exact quote: “focused proof work”
  - exact quote: “named-target spec work”
  - exact quote: “does not yet establish autonomous repository-wide specification discovery”
  - classification: verified current capability and limitation
- `VL-proof`
  - source: current capability summary
  - exact quote: “proof agents can close local Verus proof obligations”
  - exact quote: “not broad invariant invention”
  - classification: verified current capability and limitation
- `VL-guidance`
  - source:
    [guidance source policy](</ssd1/sichangheagent/VeruLaw/docs/guidance/source_policy.md>)
  - SHA-256:
    `c50c55ee337e0e59c79ab4435dd7267eb894eae2fcc8bee8337dab45cbb42acc`
  - exact quote: “safe for controlled experiment”
  - classification: aspirational design standard, not measured capability
- `VL-evaluation`
  - source:
    [guidance evaluation standard](</ssd1/sichangheagent/VeruLaw/docs/roadmap/guidance_evaluation_research_standard.md>)
  - SHA-256:
    `51c03110e3a300b7da498a3df7a2e388eebf9569e84172c95d3b6db896727886`
  - exact quote: “paired controlled experiment”
  - exact quote: “arm-blinded scoring”
  - exact quote: “effect sizes with uncertainty intervals”
  - classification: aspirational design standard, not completed evidence
- `VL-six-lane`
  - source:
    [real-project evidence](</ssd1/sichangheagent/VeruLaw/docs/midas-lex/real_project_usage_evidence_20260722.md>)
  - SHA-256:
    `82ddece93edbf7455349516dc7fd0dae9052585952b300bf4091f3a118a8a7d0`
  - exact quote: “does not show that Midas Lex reliably selected a target”
  - exact quote: “not a controlled comparison”
  - classification: bounded experimental evidence
- `VL-operating`
  - source:
    [experiment operating rules](</ssd1/sichangheagent/VeruLaw/docs/experiments/operating_rules.md>)
  - SHA-256:
    `62fd088e3bf3fb98f0635b38094e84ad9e82ed3931b124511ec8e827f01b2245`
  - exact quote: “Each subject agent attempt needs its own run-local artifact root.”
  - exact quote: “Missing evidence downgrades the claim.”
  - classification: aspirational design standard, not completed evidence
