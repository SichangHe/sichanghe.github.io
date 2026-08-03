# 🤖 VeriSkill: August 2026

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
    - bytes/pages: `731456`, `9`
    - sha256 `a96e6681d5ede80b669f057b07f0c82fa542409b1b55c232cc463972e3c7c3e5`
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
    - sha256 `61cc0e44c3489a82435ce1b3c9e8d7db5cd21798e18c8c204b0f99b124baa615`
  - extracted Markdown sha256
    `15fb60477f99781bada19b0f69c517263dac4a72f2188da25578bedaf3a6eda4`

## confidence

- high confidence in source identity, version, saved bytes, methods, and
  reported numbers
- low confidence that its learned skills preserve intended specification
  strength
  - the reported oracle does not directly test that property
