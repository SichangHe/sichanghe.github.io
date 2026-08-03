# 🤖 VeriSkill and Midas Lex: August 2026

- focus
  - how VeriSkill changes the competitive position of AutoVerus and Midas Lex
  - which mechanisms are worth testing in our verification-agent work
  - which evidence does not support the paper's broadest interpretation

## decision

- danger to current demonstrated Midas Lex capability: medium
  - VeriSkill does not evaluate Verus, Rust, repository-wide target discovery,
    intent recovery, production linkage, or full-project generation
  - Midas Lex currently claims focused Verus proof work and partial named-target
    specification work, not automated skill evolution
  - source: [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
    - classification: verified current capability
- danger to a future reusable-guidance novelty claim: high
  - VeriSkill directly automates the part Midas Lex currently curates as
    reusable guidance
  - it learns persistent guidance from failures, validates revisions, and
    reports gains across Dafny, Frama-C, VeriFast, Claude Code, and Codex
  - a future claim such as first self-improving verification skill is no longer
    credible without a narrower differentiator
- strongest remaining differentiator
  - provenance-constrained Verus guidance whose value is judged by semantic
    strength, source-disjoint transfer, and production-linked evidence
  - this is a plausible research position, not a demonstrated capability
- recommended next experiment
  - do not add a third standing evaluation arm
  - keep the research comparison as paired `E0_NO_CLI` versus the latest
    frozen, approved `E1_CLI`
  - improve that one CLI through an internal current-version versus candidate-
    version promotion loop with source provenance, semantic-strength review,
    per-task non-regression, and same-project exclusion as hard gates

## direct answers to the human follow-up

- public status as of 2026-08-03
  - VeriSkill is publicly available only as arXiv v1, submitted 2026-07-30
  - its DOI metadata classifies it as `Preprint`, version `1`
  - arXiv explicitly says its moderation is “not a peer-review process”
  - no exact-title Crossref or DBLP venue record, public acceptance, or public
    rejection resolved
  - the source package loads `aaai2027` in `preprint` mode while leaving the
    `submission` mode commented out
  - inference: AAAI-27 is the likely formatting target, but this does not prove
    that a submission exists
  - AAAI-27 lists 2026-09-24 for first-stage rejection notices and 2026-11-30
    for final decisions, so no 2026-08-03 public outcome should be expected
- is the reported gain just training-set fit
  - not literally
    - Algorithm 1 evolves on training and validation tasks, while the paper
      reports final results on nominally separate benchmark tasks
  - the separation is not strong enough for the broad interpretation
    - Dafny uses an 80/20/100 task split sampled from one DafnyBench-derived
      pool, with no reported project, file, or algorithm-family grouping
    - VeriFast uses an 80/20/100 function-level split made after constructing
      one pool from overlapping public example sources, with no reported file
      or project grouping
    - Frama-C uses 68/17 evolution tasks from four repositories and names a
      different repository as its final benchmark, making this the strongest
      of the three separations, but it reports neither cross-repository
      deduplication nor the benchmark size
  - the 17- or 20-item validation set is queried repeatedly, its outcomes
    affect later revisions, and candidate/query budgets are not reported
  - same-pattern transfer cases become tuning cases after their failures are
    used to revise the lesson
  - the evolution controller can inspect human-verified reference artifacts,
    although the target agent sees stripped or hidden references
  - no split manifest, code, candidate log, initial/final skill, per-task
    result, variance, confidence interval, significance test, or seed is
    released or linked in v1
  - narrow supported claim
    - on nominally held-out, mostly in-distribution partitions, the paper
      reports higher three-run mean PASS
  - unsupported stronger claims
    - unseen-project generalization for Dafny or VeriFast
    - resistance to adaptive validation overfitting
    - statistically established superiority in every comparison
- is this reinforcement learning without gradients
  - directionally yes, but `LLM-guided derivative-free policy optimization`
    or `zeroth-order optimization over a textual skill` is more precise
  - the backbone model remains frozen, the skill text is the policy-like
    object, verifier outcomes act as fitness, and validation accepts or rejects
    proposed text mutations
  - SkillOpt-Lite, the strongest included baseline, explicitly formalizes skill
    optimization as Zeroth-Order optimization
  - the analogy is limited
    - gradient-free reinforcement learning already exists, so absence of a
      gradient does not define a new learning class
    - the paper gives no MDP, critic, or temporal credit scheme, so this is not
      a conventional trajectory-level RL formulation
    - edits use rich traces, verifier logs, and human references rather than a
      scalar reward alone, making the loop partly supervised diagnosis and
      program repair

## one-CLI guidance enhancement loop

- preserve the product decision
  - there is one evolving Midas Lex CLI, with versioned approved guidance
  - current-versus-candidate checks are release gates inside that product, not
    a third arm in the research evaluation
  - the periodic cumulative study remains `E0_NO_CLI` versus the latest frozen
    `E1_CLI`
- candidate cycle
  - collect failed `E1_CLI` trajectories and immutable verifier evidence
  - attribute each failure before learning from it
    - invalid or unsupported task
    - setup, environment, retrieval, or tool failure
    - prover or encoding limitation
    - noncompliance with available guidance
    - missing or unclear reusable guidance
    - specification-intent mismatch or weak contract
    - provenance, contamination, or same-project leakage
  - cluster only genuine guidance gaps by proof responsibility and diagnostic
    signature
  - propose the smallest guidance patch with provenance, applicability,
    inapplicable cases, expected diagnostic change, project deny tags, and a
    named review owner
  - promote a candidate only if it passes the staged gates below, then retain
    its exact version, evidence, and rejection or acceptance reason
- cheap-to-accurate promotion funnel
  - static gate at negligible agent cost
    - schema, provenance, leakage, duplicate, size, and forbidden-content
      checks
  - cached replay or critic gate
    - use logged failures to reject obviously irrelevant or contradictory
      candidates
    - never treat replay as causal evidence because it cannot show how a live
      agent would change behavior
  - targeted live micro-panel
    - route only four to eight source-disjoint tasks matching the affected
      guidance tags
    - compare current CLI with candidate CLI, cache immutable worktrees and
      deterministic verifier results, and rerun only discordant outcomes
  - sealed release panel
    - use about 30 privately scored opportunities across at least three
      projects for candidates that survive the micro-panel
    - blind semantic scoring and adjudicate only candidate-changed outcomes
    - require no per-item proof, semantic, trust-boundary, or specification-
      strength regression on critical tasks rather than accepting a net gain
  - adaptive-overfit control
    - rotate the release panel and preserve a never-touched audit reserve
    - split by project or source family, not by function
    - freeze stopping rules, candidate-query budgets, and guidance hashes
      before the sealed gate
- publication-facing evidence
  - periodically measure the cumulative CLI with the existing paired
    `E0_NO_CLI` versus `E1_CLI` standard
  - report semantic quality separately from verifier green, paired effects and
    uncertainty, leakage exclusions, cost, and trajectory mechanisms

## what VeriSkill contributes

- learning target
  - a persistent verifier-specific agent skill rather than one repaired proof
    or annotation artifact
- stage 1: responsibility attribution
  - classify each failure as task unsatisfiability, prover limitation, skill
    noncompliance, or skill knowledge gap
  - retain only the latter two as skill-update signals
  - use the generated artifact, verifier log, current skill, human-verified
    reference, and prior evolution memory
- stage 2: pattern-level lesson abstraction
  - localize the failed proof obligation
  - name the missing verification responsibility
  - diagnose how the skill text is missing, unclear, too abstract, or hard to
    find
  - cluster compatible failures and generate guidance with applicability,
    concrete steps, and inapplicable cases
- stage 3: executable admission
  - test on attribution cases and disjoint same-pattern transfer cases
  - reject local pass-to-fail regressions and executable-code changes
  - admit only a skill that raises aggregate frozen-validation PASS and passes
    the paper's structural preservation check
  - store accepted, rejected, and skipped outcomes in evolution memory

## evaluation evidence

- three separate tracks
  - C to Dafny translation
    - 200 DafnyBench-derived pairs split 80 training, 20 validation, and 100
      benchmark
  - C to ACSL annotation with Frama-C
    - 85 evolution pairs split 68 training and 17 validation
    - final benchmark is Frama-C-Problems, whose evaluated size is not stated
  - C to VeriFast annotation
    - 200 repository-derived pairs split 80 training, 20 validation, and 100
      benchmark
- two main agent and model pairs
  - Claude Code with Opus 4.8
  - Codex with GPT 5.6 Sol
- reported result
  - VeriSkill is best in all six tool-agent rows
  - gain over No Skill ranges from 17.6 to 51.3 percentage points
  - gain over the strongest included baseline ranges from 3.3 to 17.0 points
  - the closest comparison is Codex on Dafny
    - 66.0 versus 62.7 for SkillOpt-Lite
    - no dispersion or significance result is reported
- ablation on Claude Code and Dafny
  - removing responsibility attribution costs 13.0 points
  - removing lesson abstraction costs 8.3 points
  - removing executable validation costs 21.3 points
- cross-model test
  - one Codex-evolved Dafny skill improves five other model backends by 15.3 to
    43.7 points over No Skill
  - every backend is tested on the same Dafny benchmark
  - this demonstrates model transfer on one track, not transfer across
    verifiers or benchmark families

## evidence limits and dangers

- supervised dependence
  - attribution and abstraction can inspect a human-verified reference artifact
  - this is supervised guidance distillation, not learning from verifier
    failures alone
  - the paper states that instance details are removed but does not measure
    reference leakage or attribution accuracy
- weak semantic oracle
  - PASS combines verifier acceptance with a structural preservation check
  - annotation tracks compare executable C after erasing annotations, comments,
    and whitespace
  - C to Dafny checks aligned callables, control flow, state updates, returns,
    and assertions
  - inference: these checks can reject code tampering but do not establish that
    a generated contract captures intended behavior or is non-vacuous
- aggregate admission can hide individual regressions
  - the local same-pattern gate rejects pass-to-fail regressions
  - the global equation requires only higher aggregate validation PASS plus
    structural preservation on every item
  - inference: an accepted skill can lose some previously passing global items
    if it gains more elsewhere
- adaptive validation risk
  - the same frozen validation set is queried across evolution rounds
  - the paper does not report candidate count, round count, stopping budgets,
    skill growth, or a correction for adaptive selection
  - the final benchmark remains separate, which protects the reported test
    result if the stated split and deduplication are sound
- limited reproducibility
  - no VeriSkill code, prompts, evolved skills, data, tool versions, or public
    artifact link appears in the v1 paper
  - no exact-title public repository or publisher record resolved on 2026-08-03
  - the paper has no limitations or threats-to-validity section
- incomplete uncertainty reporting
  - results are three-trial means without standard deviations, confidence
    intervals, or significance tests
  - the 3.3-point closest-baseline margin should therefore be treated as
    suggestive rather than established
- dataset and contamination uncertainty
  - two tracks use manually transformed or repository-mined custom data
  - the paper does not report a model-contamination audit or project-level
    source-disjoint split
  - the Frama-C benchmark population size is unstated

## relation to AutoVerus and Midas Lex

- AutoVerus
  - AutoVerus repairs one Verus proof artifact through specialized agents and
    verifier feedback
  - VeriSkill explicitly cites that staged error handling as related diagnostic
    organization
  - VeriSkill's distinct claim is persistence across tasks through an evolved
    skill
- demonstrated Midas Lex boundary
  - Midas Lex is a repository-level Verus proof-synthesis harness whose machine
    oracle is final verifier output
  - source: [Midas Lex README](</ssd1/sichangheagent/VeruLaw/README.md>)
    - classification: verified current capability
  - current proof strength is focused L1 closure with approved specifications
  - current specification strength is partial L2 named-target work
  - source: [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
    - classification: verified current capability
- current reusable-guidance boundary
  - Midas Lex exposes reusable guidance but requires approved provenance and
    can exclude guidance mined from the same target project
  - hidden answers, solved patches, private logs, sibling artifacts, and
    evaluator reasoning are forbidden guidance sources
  - source: [guidance source policy](</ssd1/sichangheagent/VeruLaw/docs/guidance/source_policy.md>)
    - classification: current policy, not measured capability
- current evaluation advantage
  - the Midas plan freezes guidance hashes, isolates sibling arms, blinds
    semantic scoring, separates semantic adequacy from verifier green, and
    requires cross-project holdouts for a paper-level claim
  - source: [CLI evaluation plan](</ssd1/sichangheagent/VeruLaw/docs/roadmap/cli_vs_no_cli_evaluation_plan.md>)
    - classification: current experiment standard, not completed evidence
- current VeriSkill advantage
  - it has a complete implemented self-evolution loop and multi-tool benchmark
    results
  - Midas Lex has no durable evidence that it automatically attributes failures,
    edits reusable guidance, and validates the result across held-out tasks

## concrete lessons for our work

- extend the failure taxonomy before learning from trajectories
  - invalid task or unsupported objective
  - setup, environment, retrieval, or tool failure
  - prover or encoding limitation
  - agent noncompliance with available guidance
  - missing or unclear reusable guidance
  - specification-intent mismatch or weak contract
  - provenance, contamination, or same-project leakage risk
- make the learned unit auditable
  - source and immutable provenance
  - proof-obligation location
  - missing verification responsibility
  - applicability and inapplicable cases
  - concrete agent steps
  - expected diagnostic change
  - project deny tags and review owner
- strengthen VeriSkill's admission rule for VL
  - same-pattern transfer improvement
  - frozen global improvement
  - no per-item proof or semantic regression
  - no executable, specification, or trust-boundary weakening
  - non-vacuity and intended-strength judgment
  - source-disjoint and project-disjoint transfer
  - bounded guidance size, cost, and retrieval overhead
  - independent human approval before ordinary-agent exposure
- separate product optimization from research evaluation
  - internally compare the current CLI with one candidate CLI version only as
    a release-promotion test
  - externally compare `E0_NO_CLI` with the latest frozen, human-approved
    `E1_CLI` as the cumulative guidance study
  - do not add a third standing research arm
- positioning implication
  - avoid first self-improving verification-agent claims
  - test a narrower claim around provenance-constrained and semantically
    adjudicated guidance evolution for Verus and real Rust projects
  - retain this as a hypothesis until cross-project evidence exists

## source map: VeriSkill

- authority and version
  - authoritative landing: <https://arxiv.org/abs/2607.27733>
  - DOI record: <https://doi.org/10.48550/arXiv.2607.27733>
  - primary full text: <https://arxiv.org/pdf/2607.27733v1>
  - version/date: arXiv v1, submitted 2026-07-30 06:15:29 UTC
  - remote v1 bytes matched the saved PDF on 2026-08-03
  - public-record audit on 2026-08-03
    - DataCite resource type: `Preprint`, version `1`
    - arXiv moderation policy: “not a peer-review process”
    - authoritative v1 source archive:
      <https://arxiv.org/e-print/2607.27733v1>
    - source archive sha256
      `37e93229c2a3e3f066b5b66b2a72cf66f11074ee8cbf46779663c92fe7acb482`
    - the archive was inspected from a temporary download and was not added as
      a collection artifact; the stable PDF and extracted Markdown are below
    - source-package excerpt: `\usepackage[preprint]{aaai2027}`
    - no exact-title Crossref or DBLP venue record resolved
    - no acceptance or rejection claim appears in the paper
    - likely AAAI-27 target is an inference from the style, not evidence of
      submission
  - official status sources
    - arXiv moderation: <https://info.arxiv.org/help/moderation/index.html>
    - AAAI-27 timetable: <https://aaai.org/conference/aaai/aaai-27/>
      - exact excerpts: “Notification of Phase 1 rejections”; “Notification of
        final acceptance or rejection”
  - access uncertainty: no public submission history, exact-title venue record,
    code release, or public implementation repository resolved
- stable local artifacts
  - PDF: `/hdd1/sichanghe/paper_collection/VeriSkill- A Self-Evolution Framework for Program Verification Skills, Changguo Jia, Tianqi Zhao, Zhiyou Xiao, Weiming Zhang, Minghui Zhou, arXiv, 2026.pdf`
    - bytes/pages: `731456`, `9`
    - sha256 `a96e6681d5ede80b669f057b07f0c82fa542409b1b55c232cc463972e3c7c3e5`
  - extracted Markdown: `/hdd1/sichanghe/paper_collection/VeriSkill- A Self-Evolution Framework for Program Verification Skills, Changguo Jia, Tianqi Zhao, Zhiyou Xiao, Weiming Zhang, Minghui Zhou, arXiv, 2026/VeriSkill- A Self-Evolution Framework for Program Verification Skills, Changguo Jia, Tianqi Zhao, Zhiyou Xiao, Weiming Zhang, Minghui Zhou, arXiv, 2026.md`
    - sha256 `45250c80443079b86964721516e6dbc22aab0a8b76ce01bf302c451c2e45fcef`
- citation linkage
  - claim: the paper explicitly cites and contrasts AutoVerus
  - exact excerpt: “AutoVerus”
  - location: extracted lines 47 and 344
- source points
  - novelty claim
    - exact excerpt: “first self-evolution framework”
    - location: extracted line 32
  - supervised attribution input
    - exact excerpt: “human-verified reference solution”
    - location: extracted line 79
  - dataset construction
    - exact excerpt: “split them 4:1:5 into training, validation, and benchmark”
    - location: extracted lines 217 and 221
    - exact excerpt: “The benchmark is the Frama-C-Problems benchmark”
    - location: extracted line 219
  - local transfer design
    - exact excerpt: “same-pattern disjoint transfer cases”
    - location: extracted line 189
  - global admission
    - exact excerpt: “strictly improve”
    - location: extracted lines 204–209
  - result aggregation
    - exact excerpt: “three-trial mean”
    - location: extracted lines 242 and 250–254
  - cross-model scope
    - exact excerpt: “same Dafny benchmark”
    - location: extracted lines 293–297
  - audit interpretation
    - the benchmark is absent from Algorithm 1, which consumes evolution and
      validation tasks, so it is nominally held out from automated evolution
    - validation feedback is reused across rounds and recorded in evolution
      memory, so validation is development data rather than a final test
    - no released manifest permits independent project-level separation or
      cross-deduplication checks

## related primary sources

- SkillOpt-Lite
  - purpose: strongest included generic baseline and evidence that validation-
    gated skill evolution predates VeriSkill's domain specialization
  - landing: <https://arxiv.org/abs/2607.03451>
  - version/date: arXiv v1, 2026-07-03 16:07:06 UTC
  - code: <https://github.com/EvolvingLMMs-Lab/SkillOpt-Lite>
    - inspected head `4cb4eeef1f95375a9179737ab94cf5e64b9647c6`
  - exact excerpts
    - “trajectory exploration, consensus mining, and validation gating”
    - “skill optimization as the maximization of an expected reward function”
    - “modeled as a Zeroth-Order (ZO) Oracle”
  - location: extracted lines 35, 49, and 145
  - PDF: `/hdd1/sichanghe/paper_collection/SkillOpt-Lite- Better and Faster Agent Self-evolution via One Line of Vibe, Yifei Shen, Bo Li, Xinjie Zhang, arXiv, 2026.pdf`
    - sha256 `4e7d36b233673a3793b95e7834e588acf19bcea3b292c7168781a95df792797d`
  - extracted Markdown sha256
    `7fae5bc495242aeb2b90d20005dfe9d71e6b9ff65675e5242a250edf5a3a43df`
- EvoSkill
  - purpose: conceptually closest generic failure-driven structured-skill system
  - landing: <https://arxiv.org/abs/2603.02766>
  - version/date: arXiv v1, 2026-03-03 09:07:22 UTC
  - code: <https://github.com/sentient-agi/EvoSkill>
    - inspected head `36f6f04952293d7054145550c2b9f0b0411bff1c`
  - exact excerpts: “iterative failure analysis”; “held-out validation set”
  - location: extracted lines 11, 23, and 61
  - PDF: `/hdd1/sichanghe/paper_collection/EvoSkill- Automated Skill Discovery for Multi-Agent Systems, Salaheddin Alzubi, Noah Provenzano, Jaydon Bingham, Weiyuan Chen, Tu Vu, arXiv, 2026.pdf`
    - sha256 `61cc0e44c3489a82435ce1b3c9e8d7db5cd21798e18c8c204b0f99b124baa615`
  - extracted Markdown sha256
    `15fb60477f99781bada19b0f69c517263dac4a72f2188da25578bedaf3a6eda4`

## VL evidence freeze

- freeze time: 2026-08-03 PDT
- [Midas Lex README](</ssd1/sichangheagent/VeruLaw/README.md>)
  - sha256 `fe8f3f065390dbc9637e5f73a5657734d2c37f1b52d632460b10bd256f0dd069`
- [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - sha256 `609be32f7b363ca6ae57fbfc3ba5634ad6538569a1b443be9d6b188094de3480`
- [guidance source policy](</ssd1/sichangheagent/VeruLaw/docs/guidance/source_policy.md>)
  - sha256 `c50c55ee337e0e59c79ab4435dd7267eb894eae2fcc8bee8337dab45cbb42acc`
- [CLI evaluation plan](</ssd1/sichangheagent/VeruLaw/docs/roadmap/cli_vs_no_cli_evaluation_plan.md>)
  - sha256 `4183ab6849bd00c5628c09970d2c56d69ddd5f4545b67c633b42075b773c5de0`
- [guidance evaluation research standard](</ssd1/sichangheagent/VeruLaw/docs/roadmap/guidance_evaluation_research_standard.md>)
  - sha256 `51c03110e3a300b7da498a3df7a2e388eebf9569e84172c95d3b6db896727886`
  - current standard requires paired `E0`/`E1`, blinded scoring, uncertainty,
    and a minimum credible pilot of 30 opportunities across three projects
  - classification: current experiment standard, not completed evidence
- [specification guidance](</ssd1/sichangheagent/VeruLaw/docs/guidance/spec/README.md>)
  - sha256 `9e82f0ba564fc8d2ddcc6bb92df76ca331116f1e3b98ff92aed5080c35ddb082`
- boundary
  - capability documents support only the current proof and specification
    claims stated above
  - policy and evaluation documents describe controls and intended experiments,
    not completed efficacy evidence
  - no routing prose or agent self-report is treated as technical evidence

## confidence and review question

- high confidence in source identity, version, saved bytes, methods, and
  reported numbers
- medium confidence in competitive ranking
  - VeriSkill is a fresh v1 preprint without a released artifact
  - its tools and benchmark populations differ from Verus and current VL work
- low confidence that its learned skills preserve intended specification
  strength
  - the reported oracle does not directly test that property
- review question
  - should the first internal CLI candidate-promotion pilot use a four-to-eight-
    task source-disjoint micro-panel before paying for the sealed 30-opportunity
    release panel
