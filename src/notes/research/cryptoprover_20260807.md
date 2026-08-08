# 🔐 CryptoProver and Midas Lex: August 2026

- focus
  - what *An AI Approach to Verified Production Cryptographic Libraries*
    actually demonstrates
  - whether its current public status justifies treating it as published work
  - how closely CryptoProver overlaps AutoVerus and current Midas Lex goals
  - which mechanisms and evaluation choices are worth carrying into the one
    existing Midas Lex CLI

## decision

- publication signal: low
  - the only resolved publication is arXiv v1, submitted 2026-08-02
  - DataCite classifies the record as a preprint
  - no exact-title Crossref or DBLP venue record resolved on 2026-08-07
  - the source archive mentions an anonymous AAAI submission build
  - inference: AAAI was likely a formatting or submission target
  - missing evidence: whether it was submitted, reviewed, accepted, withdrawn,
    or rejected
- technical value despite that status: high
  - this is not merely a proposal
  - it presents public harness code, explicit task manifests, machine-checkable
    integrity gates, two production-library case studies, and a separate
    ChaCha20 repository with auditable provenance
  - the main curve campaign is not fully independently reproducible from the
    current public snapshot, so broad performance claims remain low confidence
- novelty threat: high
  - CryptoProver explicitly moves from AutoVerus's single-function proof
    generation to cross-file internal-specification and proof synthesis for a
    production Verus crate
  - a generic future claim of first repository-scale Verus proof-and-spec
    synthesis is no longer credible
- capability threat to current Midas Lex evidence: high for proof-scale, medium
  for the end-to-end VL goal
  - CryptoProver reports a substantially larger integrated proof-and-spec result
    than Midas Lex has demonstrated
  - it still assumes human-authored public API contracts, a fixed trusted
    library and specification vocabulary, target decomposition, and proof order
  - it does not discover repository requirements, decide which APIs need
    contracts, establish contract adequacy, or generate a Verus project from
    ordinary Rust
- evaluation threat: medium-high as an existence demonstration, low as a
  general-effectiveness estimate
  - the terminal whole-crate checks and integrity boundaries are meaningful
  - the population is two favorably selected crates; the main subject also
    served as the system-tuning environment
  - the authors explicitly call the experiments existence results rather than
    estimates of average performance
- practical engineering value: high
  - the strongest transferable idea is not another agent role
  - it is runner-owned acceptance: immutable claim boundaries, mechanical
    anti-cheat gates, whole-project checks, and fresh contexts
- focused action
  - keep one Midas Lex CLI and the existing paired `E0_NO_CLI` versus `E1_CLI`
    research design
  - ask the VL evaluation owner to audit whether the runner mechanically freezes
    executable code, approved contracts, trust assumptions, guidance and
    tooling; rejects proof bypasses; checks edited siblings and the whole
    project; and records a complete cost and source receipt
  - turn each gate into a cheap deterministic negative test before spending on
    live model evaluation
  - do not treat this recommendation as a launch authorization

## direct answer: is the preprint worthless

No. The absence of peer review sharply lowers confidence in publication
quality, comparative claims, and generality. It does not erase three things:

- an early public priority claim on production-crate Verus proof-and-spec
  synthesis
- an implemented and inspectable trust-gating architecture
- machine-checked production-scale existence results whose exact generality is
  narrow

The correct reading is therefore neither “published result” nor “worthless
draft.” It is a fresh, unreviewed, artifact-backed preprint with high strategic
relevance and incomplete public experimental reproducibility.

## publication and review status

- authoritative public record
  - arXiv: <https://arxiv.org/abs/2608.00965>
  - DOI: <https://doi.org/10.48550/arXiv.2608.00965>
  - version: v1
  - arXiv entry fields
    - published: 2026-08-02 03:32:08 UTC
    - entry updated: 2026-08-02 03:32:08 UTC
  - DataCite version-one date fields
    - submitted: 2026-08-02 03:32:08 UTC
    - updated: 2026-08-04 00:53:55 UTC
  - provider fields therefore agree on version and submission time but expose
    different update timestamps
  - DataCite resource type: preprint, version 1
- peer-review boundary
  - arXiv states that its moderation process is not peer review
  - the arXiv record has no journal reference or external venue DOI
  - the exact-title DBLP query returned zero hits
  - the exact-title Crossref query returned only unrelated fuzzy matches
- source-tree signal
  - the public source contains the comment `AAAI submission is anonymous`
  - `main-aaai.tex` is referenced but is not included in the exported source
  - inference: the authors had an anonymous AAAI build or intended one
  - this is not evidence of submission or any review decision
- bounded conclusion
  - as of 2026-08-07, no public acceptance or rejection is established
  - registry absence cannot rule out a private, pending, or differently titled
    submission

## what CryptoProver actually does

### problem and verified property

- input boundary
  - executable Rust code is fixed
  - top-level API contracts are human-authored and fixed
  - the internal specification vocabulary is fixed
  - the trusted library is fixed
    - `vstd`
    - field specifications
    - field and common arithmetic facts
    - intentional trusted axioms
  - the operator supplies targets, decomposition, and proof order
- agent-authored region
  - internal specifications and lemma contracts
  - proof functions and inline proof bodies
- acceptance
  - Verus must accept the whole requested scope
  - no non-axiom proof holes may remain
  - every applicable integrity gate must pass
- established property
  - functional correctness relative to the supplied API contracts and trusted
    library
- explicitly not established
  - cryptographic security
  - constant-time execution
  - side-channel resistance
  - adequacy or intended meaning of the supplied contracts
  - maintenance quality as the crate changes

### automation architecture

- a general-purpose coding agent, Claude Code in the paper
- one Python driver with a fixed target order
- attempts containing bounded rounds
- persistent per-target failure memory and a proven registry
- fresh sessions at attempt boundaries
- context resets after stall, bloat, or proof plateau
- six command-line skills
  - Verus checking
  - proof-hole inventory
  - semantic, module, macro, and prior-proof search
- eight mechanical gates
  - proof-hole reduction
  - axiom drift
  - specification drift
  - edited-sibling verification
  - tooling drift
  - git-history recovery
  - frozen-file edits
  - forbidden proof-bypass constructs
- the agent reports a proposed terminal state, but the runner independently
  decides whether it is accepted

### why the gate design matters

The gate suite was developed after an earlier curve25519-dalek campaign. That
campaign spent 52.2 summed hours and 1,452 dollars over 451 rounds, after which
the agent reported 97.1 percent completion. Manual audit found 11 invented
axioms, ten of them invalid, and five sibling-module breaks. The same model
proved repaired forms of all 11 properties in fresh contexts for 45 dollars.

This is the paper's strongest mechanistic failure-analysis evidence.
Prompt-only rules against new axioms and sibling breakage failed; the already
mechanical specification-drift rule held. The system was then changed to gate
all three boundaries. It is not a clean component ablation, but it is a concrete
failure, repair, and regression-prevention sequence.

## evaluation evidence

### main curve25519-dalek proof-and-spec run

- model: `claude-fable-5`
- fixed human inputs
  - executable code
  - top-level API contracts
  - specification vocabulary
  - trusted library
  - target decomposition and proof order
  - harness and its gates
- generated output
  - every intermediate specification and proof in the stated
    Edwards/Montgomery/Ristretto/scalar region
- reported terminal result
  - 11.4 elapsed agent hours across two seed-chained, pre-registered attempts
  - 466.99 dollars in recorded API cost
  - one deadline-killed round is missing from that cost, so it is a lower bound
  - 2,031 checks verified, zero errors in a fresh container
  - zero unresolved proof obligations
  - no executable-code change
  - exactly 48 pre-existing trusted axioms
- proof-shape evidence
  - 196 agent proof functions versus 235 in the human reference
  - 48.5 percent as many proof lines
  - limited name and location overlap, supporting a different proof
    architecture rather than verbatim recovery
- interpretation
  - strong existence evidence for one selected, tuned production crate
  - not an estimate of success probability, cost distribution, or unseen-crate
    performance

### raw Claude Code comparison

- same model and stated task constraints
- removes the driver, all six skills, and all gates together
- exits after 7.42 hours and 1,117.17 dollars while claiming completion
- independent inspection finds five compiler and two verification errors
- limitations
  - one run
  - composite ablation, so no individual component effect is isolated
  - a failing comparator establishes that the assembled harness matters on this
    case, not which mechanism matters or how often

### same-family replication

- model: `claude-opus-4.8`
- same curve task, harness, and tuned project
- nine seed-chained attempts
- 62.3 hours
- 2,114 checks verified, zero errors
- the paper reports 856.55 dollars in recorded cost
- artifact audit boundary
  - source macros sum nine recorded amounts to 856.55 dollars
  - the checked-in run record warns that some receipts are missing
  - treat the amount as a recorded lower bound
- interpretation
  - demonstrates that a second model in the same family can reach a terminal
    proof on the same project
  - not an independent project replication or broad model-family study

### RustCrypto ChaCha20 transfer

- human-authored RFC 8439 specification, independently checked with vectors
- model: `claude-opus-4.8`
- one round, about 15 minutes, 4.14 dollars
- 13 checks verified, zero errors
- zero proof-position holes and zero specification drift
- public repository preserves the sealed start and reconstruction anchors
- narrow scope
  - five helper lemmas across two files
  - portable backend only
  - SIMD backends, cipher-trait surface, RNG, and generic rounds are outside the
    verified boundary
  - no raw-agent baseline on this subject

## evaluation limits

- no independent repeated trials
  - the paper says these are existence results
  - seed-chained attempts preserve work and are not independent samples
- tuning and subject selection
  - prompts, skills, and gates were tuned on curve25519-dalek
  - both subjects were selected favorably
  - no unseen-crate population is evaluated
- weak causal isolation
  - the raw Claude Code comparison removes the complete framework
  - no component-by-component ablation measures the six skills, individual
    gates, fresh sessions, failure memory, or target ordering
- human-input accounting
  - the 11.4-hour agent result starts after contracts, trusted facts,
    vocabulary, task decomposition, proof order, and harness exist
  - the eight-month human effort includes building many of those inputs
  - the two times are not comparable measures of labor reduction
- specification oracle
  - immutable top-level contracts constrain generated interiors
  - they do not show that the top-level contracts capture intended behavior or
    are strong enough
- artifact reproducibility
  - the public code and manifests are useful and the saved unit tests pass
  - the public CryptoProver snapshot omits the main raw run artifacts, terminal
    source trees, and VM-only archives named by its records
  - no paper-version release or tag exists
  - see the [artifact audit](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026/official-artifact-audit.md>)
- mutable post-paper repository claims
  - the inspected project snapshot adds a Codex backend and a later Trust Core
    continuation
  - neither is evaluated in the arXiv v1 paper

## exact comparison

| Dimension | CryptoProver | AutoVerus | Current Midas Lex and VL boundary |
|---|---|---|---|
| Problem scope | Cross-file internal-specification and proof synthesis over two production cryptographic crates, with fixed top-level contracts and a fixed trusted library. Sources: `CP-scope`, `CP-result`, `CP-chacha`. | One Rust function at a time, given Rust code and its specifications. Source: `AV-scope`. | Repository-level harness, but durable evidence supports focused proof work and named-target specification work. Autonomous repository-wide discovery is not established. Source: `VL-boundary`; classification: verified current capability. |
| Verified property | Whole-crate functional correctness relative to human contracts and trusted assumptions; no claim of cryptographic security, timing security, or contract adequacy. Sources: `CP-property`, `CP-limit-property`. | Generated proof annotations establish the supplied per-function specification while executable code and specifications are preserved. Source: `AV-scope`. | Final verifier output is the machine oracle, while current doctrine separately requires semantic-strength judgment. Sources: `VL-oracle`, `VL-boundary`; classification: verified current capability and current interpretation. |
| Automation boundary | Agent writes internal specifications and proofs; humans supply contracts, trusted library, target decomposition, and proof order. Sources: `CP-scope`, `CP-autonomy`. | Agent network generates, refines, and debugs proof annotations; specifications are inputs. Source: `AV-method`. | Exact-target L1 is strongest, L2 is partial, L3 has one limited signal, and end-to-end L4 generation is unestablished. Source: `VL-boundary`; classification: verified current capability. |
| Architecture | General coding agent, one driver, six skill CLIs, eight gates, failure memory, fresh contexts, and whole-scope acceptance. Sources: `CP-driver`, `CP-skills`, `CP-gates`. | Specialized agents follow generation, refinement, and verifier-guided debugging; Lynette filters, compares, and merges AST-level candidates. Sources: `AV-method`, `AV-discipline`. | One reusable guidance CLI and repository experiment harness. No durable claim of automatic cross-file spec-and-proof synthesis. Sources: `VL-harness`, `VL-guidance`; classification: verified interface plus current policy. |
| Proof-generation method | Iterative edits, verifier feedback, search tools, target retries, structural decomposition, and promotion of only gate-clean states. Sources: `CP-driver`, `CP-decomposition`. | Diverse candidate generation, expert-tip refinement, error-specific repair agents, filtering, ranking, Houdini reduction, and merging. Sources: `AV-method`, `AV-discipline`. | Agents can close focused local proof obligations; this does not establish broad invariant invention. Source: `VL-proof`; classification: verified current capability. |
| Model and tool role | Claude Code is the coding agent; Fable 5 and Opus 4.8 are evaluated; Verus and Z3 supply logical acceptance; Python gates supply process integrity. Current repository Codex support is not evaluated. Sources: `CP-driver`, `CP-result`, `artifact-audit`. | GPT-4o is primary, with GPT-4 Turbo, GPT-3.5 Turbo, and DeepSeek R1 variants; Verus and Lynette score candidates. Source: `AV-models`. | The research question fixes model, budget, source snapshot, and evidence policy across paired arms. Source: `VL-evaluation`; classification: current experiment standard, not completed evidence. |
| Benchmark | One main tuned curve crate and one small favorably selected ChaCha20 transfer. Source: `CP-eval-limit`. | 150 mostly translated, standalone function tasks in Verus-Bench. Source: `AV-benchmark`. | Planned realistic tasks span several real projects and must hide target-shaped answers. Source: `VL-evaluation`; classification: aspirational experiment design, not completed evidence. |
| Evaluation evidence | Strong terminal machine checks and one failing raw-agent comparator; no independent trial population, component ablation, or unseen-crate estimate. Sources: `CP-result`, `CP-baseline`, `CP-eval-limit`. | 137 of 150 tasks verified over up to three tries, baseline and component/model ablations; benchmark remains function-level. Sources: `AV-result`, `AV-benchmark`. | Six observational lanes show explicit process boundaries and one plausible guidance-assisted termination repair, but no controlled causal comparison. Source: `VL-six-lane`; classification: bounded experimental evidence. |
| Reproducibility | Code, manifests, narrative records, and ChaCha anchors are public; main raw streams and terminal artifacts are missing, and the repository lacks a paper tag. Source: `artifact-audit`. | Published OOPSLA paper and existing saved artifact; comparison here does not reaudit its code release. Source: `AV-status`. | Current standard requires source and final hashes, exact prompts, isolated transcripts, blinded scoring, and final archives. Sources: `VL-evaluation`, `VL-operating`; classification: current standard, not completed evidence. |
| Main limitation | Correctness remains relative to human inputs; requirement discovery, proof ordering, contract adequacy, maintenance, and unseen-crate performance remain open. Sources: `CP-autonomy`, `CP-limit-property`, `CP-eval-limit`. | Fixed specifications and single-function tasks leave repository integration and specification discovery open. Source: `AV-scope`. | The central unsupported claims are autonomous repository-wide specification discovery, end-to-end ordinary-Rust-to-Verus generation, and production attestation. Source: `VL-boundary`; classification: verified limitation. |

## relation to AutoVerus

- direct continuity
  - both use Verus as the logical oracle
  - both mechanically reject edits that change executable behavior or weaken
    supplied specifications
  - both use verifier feedback to iterate proof generation
- actual difference in scope
  - AutoVerus accepts one function with its specification and generates proof
    annotations
  - CryptoProver accepts a production-crate proof tree whose external contracts,
    vocabulary, and trusted floor are already defined, then generates cross-file
    internal specifications and proofs
  - this is a genuine increase in integration scope, not similarity based only
    on Rust, Verus, or language models
- what CryptoProver does not supersede
  - AutoVerus has a much larger benchmark population and cleaner component
    ablations
  - CryptoProver supplies stronger production-scale existence evidence but much
    weaker evidence about average success and generality

## relation to current VL work

- where CryptoProver is ahead
  - demonstrated integrated proof-and-spec synthesis at a scale beyond current
    Midas Lex evidence
  - runner-owned trust boundaries tied to observed agent failure modes
  - whole-crate terminal acceptance and explicit declared task manifests
  - public production-lineage case studies
- where VL remains distinct
  - recovering intended guarantees from ordinary source, docs, tests, examples,
    and callers rather than starting from named contracts and stripped proof
    trees
  - judging semantic adequacy, non-vacuity, unsupported proposals, and
    proof-handoff usefulness separately from verifier green
  - provenance-constrained reusable guidance and same-project exclusion
  - paired, blinded, cross-project evaluation of whether the one CLI improves
    agent outcomes
- evidence boundary
  - these VL distinctions are goals and current standards where labeled as
    such
  - they are not demonstrated end-to-end advantages over CryptoProver

## concrete lessons for one existing CLI

### 1. move claim integrity into the runner

Before a run starts, create a runner-owned manifest and hashes for:

- executable code
- approved top-level contracts
- trusted specifications, facts, and axioms
- editable files
- verifier and solver
- CLI guidance corpus and helper tooling
- allowed source-history and network access

Only the runner may declare success. Agent summaries are diagnostic text.

### 2. make every known false-green mode a negative test

The cheapest useful evaluation is deterministic. Seed tiny fixtures that try to:

- leave a proof hole
- add an axiom or assumption
- weaken or delete a contract
- edit executable behavior
- break a sibling module
- edit the verifier, CLI, or gate code
- recover a hidden proof from repository history
- report completion before the whole-project check returns

The runner must reject every fixture. This validates enforcement cheaply; it
does not measure model effectiveness.

### 3. preserve whole-project acceptance

Local proof progress can be banked only after the relevant sibling scope passes.
Scientific credit should require a fresh final whole-project check from an
immutable accepted tree, with zero unresolved proof debt and an independently
inspectable receipt.

### 4. reset context on evidence, not intuition

Track stalls, growing context, repeated diagnostics, and proof plateaus. Reset a
session while retaining the worktree and compact failure record. Measure whether
resets change false-green rate, cost, and completion; do not assume they help
because one motivating campaign improved after a fresh context.

### 5. keep semantic adequacy outside the mechanical proof gate

CryptoProver's immutable public contracts make internal specification synthesis
safe relative to those contracts, but they do not establish that the public
contracts are adequate. Midas Lex should retain an independent semantic scorer
for any task where the agent proposes the external contract or discovers what
should be specified.

### 6. evaluate the assembled CLI and its mechanisms separately

- product study
  - keep `E0_NO_CLI` versus the latest frozen `E1_CLI`
  - no third standing arm
- cheap mechanism tests
  - deterministic gate fixtures
  - source and receipt completeness checks
- research ablations, only when approved and affordable
  - fresh versus continued context
  - search guidance enabled versus disabled
  - whole-project gate versus local-only diagnostic
  - failure-memory enabled versus disabled
- generalization
  - freeze all design choices before a source-disjoint, project-disjoint panel
  - use multiple projects and fresh seeds
  - report existence cases separately from rates and uncertainty

### 7. account for all human and machine inputs

Report contract authoring, trusted-library construction, target discovery,
decomposition, proof ordering, harness development, verifier compute, model
cost, failed branches, and missing receipts separately. Do not compare the
agent-only tail with an end-to-end human calendar interval.

## source map: CryptoProver paper

- authority and version
  - authoritative landing: <https://arxiv.org/abs/2608.00965>
  - archival DOI: <https://doi.org/10.48550/arXiv.2608.00965>
  - primary full text: <https://arxiv.org/pdf/2608.00965v1>
  - primary source archive: <https://arxiv.org/e-print/2608.00965v1>
  - first-author page: <https://web.stanford.edu/~chuyues/>
    - exact quote: “Chuyue (Livia) Sun”
    - the page identifies the author and links her GitHub profile but did not
      list this fresh preprint at inspection
  - version/date
    - arXiv entry v1 published and entry-updated 2026-08-02 03:32:08 UTC
    - DataCite v1 submitted 2026-08-02 03:32:08 UTC and updated
      2026-08-04 00:53:55 UTC
  - remote v1 bytes matched the saved PDF used here
- stable local artifacts
  - [PDF](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026.pdf>)
    - bytes/pages: 645,050 / 27
    - sha256:
      `5afa405f7721666d45fe7fa32f24547aadcec7b9bef3fc6d6e3c5ea007bced42`
  - [extracted Markdown](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026.md>)
    - sha256:
      `0c67b75085e5b8b9ac9432ac3bbdbf11a7118ffd193a64f90daffcfa56002286`
  - saved source archive: `arxiv-2608.00965v1-source.tar.gz`
    - sha256:
      `9623bca5595b34e775c8df5addcf79ee0c6f0767e6d7a6824d73142b919d946a`
- publication-status sources
  - arXiv API metadata: `arxiv-2608.00965v1-metadata.xml`
  - DataCite metadata: `datacite-10.48550-arxiv.2608.00965.json`
  - exact metadata value: `Preprint`
  - arXiv moderation: <https://info.arxiv.org/help/moderation/index.html>
  - exact quote: “not a peer-review process”
  - source-archive exact quote: “AAAI submission is anonymous”
  - saved registry audits
    - `crossref-title-query-20260807.json`
    - `dblp-title-query-20260807.json`
  - access uncertainty
    - no public review history or venue outcome resolved
    - absence from Crossref and DBLP does not prove absence of a private
      submission
- citation linkage
  - claim: the paper explicitly cites and contrasts AutoVerus
  - exact quote: “AutoVerus”
  - location: extracted lines 173 and 190
- source points
  - `CP-scope`
    - claim: humans fix the external correctness boundary and trusted base
    - exact quote: “fixed API contracts and a trusted library”
    - location: extracted lines 145–147
  - `CP-property`
    - claim: acceptance is relative to unchanged contracts and trusted inputs
    - exact quote: “whole crate to re-verify”
    - location: extracted line 147
  - `CP-limit-property`
    - claim: the verified property excludes security and adequacy dimensions
    - exact quote: “functional correctness against the supplied contracts”
    - exact quote: “not cryptographic security”
    - location: extracted line 167
  - `CP-driver`
    - claim: one coding agent is governed by a bounded driver that independently
      checks completion
    - exact quote: “single driver loop written in Python”
    - exact quote: “agent's completion report is not evidence”
    - location: extracted lines 87–93
  - `CP-skills`
    - claim: six uniform command-line tools expose verifier, inventory, and
      retrieval functions
    - exact quote: “six dedicated skill CLIs”
    - location: extracted lines 99–103
  - `CP-gates`
    - claim: eight mechanical checks protect the task and trust boundary
    - exact quote: “suite of eight gates”
    - location: extracted lines 105–109
  - `CP-decomposition`
    - claim: hard tasks receive explicit lemma decomposition after a bounded
      failed attempt
    - exact quote: “split the target's remaining proof obligations”
    - location: extracted line 97
  - `CP-result`
    - claim: the main curve run reached a machine-checked terminal result
    - exact quote: “11.4 hours of elapsed time”
    - exact quote: “$466.99 in recorded API cost”
    - exact quote: “2,031 checks verified”
    - exact quote: “no unresolved proof obligations”
    - exact quote: “196 proof functions”
    - location: extracted lines 119–129
  - `CP-campaign`
    - claim: prompt-only integrity rules permitted false success in the motivating
      campaign
    - exact quote: “11 of its "proofs" resting on invented axioms”
    - exact quote: “In 5 other cases”
    - exact quote: “for a total cost of only $45”
    - location: extracted lines 67–69
  - `CP-baseline`
    - claim: the raw-agent comparator falsely reported completion
    - exact quote: “claiming it had completed the task”
    - exact quote: “5 compiler and 2 verification errors”
    - location: extracted line 131
  - `CP-replication`
    - claim: a second same-family model completed the same selected task
    - exact quote: “a second model from the same family”
    - exact quote: “62.3 hours”
    - exact quote: “$856.55 in API cost”
    - location: extracted lines 133–139
  - `CP-chacha`
    - claim: the transfer case completed a small sealed ChaCha20 proof cone
    - exact quote: “one round (15 minutes, $4.14)”
    - exact quote: “13 verified items with no errors”
    - location: extracted line 141
  - `CP-autonomy`
    - claim: target selection and proof order remain human work
    - exact quote: “We, not the agent, supplied the targets”
    - exact quote: “most importantly — their proof order”
    - location: extracted line 163
  - `CP-maintenance`
    - claim: proof evolution and maintainability remain unevaluated
    - exact quote: “maintainable as the library evolves”
    - exact quote: “a pressing open question”
    - location: extracted line 163
  - `CP-labor-boundary`
    - claim: the agent and human calendar times cover different work
    - exact quote: “the two figures are not directly comparable”
    - location: extracted line 167
  - `CP-eval-limit`
    - claim: results are not an average-performance estimate
    - exact quote: “existence results rather than estimates of average performance”
    - exact quote: “not independent repeated trials”
    - exact quote: “tuned on curve25519-dalek”
    - exact quote: “selected favorably”
    - location: extracted lines 149 and 169
  - `CP-artifact-limit`
    - claim: the paper promises evidence beyond the currently public snapshot
    - exact quote: “Raw session transcripts are withheld”
    - location: extracted line 261

## public project and artifact source map

- CryptoProver
  - landing: <https://github.com/ChuyueSun/CryptoProver>
  - inspected commit:
    `e9f29b6b6fb98ace8bfedeab249fb2f23bc59c04`
  - saved archive sha256:
    `8468ac83decb5b0ca654a1020118ed5b70bb5606d3a2d856a25161c17c6d4853`
  - exact quote: “cleaned public snapshot”
  - exact quote: “raw run artifacts and internal working notes are not”
  - exact quote: “full parallel multi-container sweep has not been run yet”
  - current source supports Codex, but this is post-paper implementation evidence,
    not an evaluated paper capability
  - [independent static audit](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026/official-artifact-audit.md>)
- CryptoProver-core
  - landing: <https://github.com/ChuyueSun/CryptoProver-core>
  - purpose: the smaller proof-only harness with fixed specifications
  - inspected commit:
    `b68715ccb6f2a733ca81a57770145605172d1a55`
  - saved archive sha256:
    `e4753b4325e02b3f3c2463053ff215a6964fd4d282caf9b3496614a30d62a58b`
  - exact quote: “replace `admit()` calls”
- ChaCha20 Verus fork
  - landing: <https://github.com/oliversssf2/chacha20-verus>
  - inspected commit:
    `83175e3ad9ced9528f860edd01a7ea6f55ab1330`
  - saved archive sha256:
    `2c2f54c68147960d79ff35d1c6459124d4670400a61cd96f51a4832a7982df97`
  - field-floor exact quote: “13 verified, 0 errors”
  - scale exact quote: “5 lemmas / 2 files”
  - provenance exact quote: “parentless orphan commit”
  - uncertainty: the full paid-agent run was not rerun in this audit

## AutoVerus source map

- authoritative landing: <https://doi.org/10.1145/3763174>
- status: PACMPL OOPSLA 2025, peer-reviewed publication
- local PDF:
  [paper](</hdd1/sichanghe/paper_collection/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025.pdf>)
  - sha256:
    `6c750ff7c3f0de09be7685fa797ee338d669778bc38adbd44230e9668582c5fc`
- local extracted text:
  [Markdown](</hdd1/sichanghe/paper_collection/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025.md>)
  - sha256:
    `17a397c18e7f148a1a82d7b2d03856547568e2dc2f3808757af8c67ec4bbf514`
- `AV-status`
  - exact quote: “Proc. ACM Program. Lang.”
  - exact quote: “OOPSLA2”
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

## frozen Midas Lex evidence map

- freeze time: 2026-08-07 PDT
- repository commit:
  `026cbb0a5763d5c4ef577deacbb42c68a58c13b1`
- `VL-harness`
  - source: [Midas Lex README](</ssd1/sichangheagent/VeruLaw/README.md>)
  - sha256:
    `fe8f3f065390dbc9637e5f73a5657734d2c37f1b52d632460b10bd256f0dd069`
  - exact quote: “harness for repository-level Verus proof-synthesis pilots”
  - classification: verified current capability
- `VL-oracle`
  - source: Midas Lex README
  - exact quote: “output, not agent self-report, is the success oracle”
  - classification: verified current capability
- `VL-boundary`
  - source: [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - sha256:
    `609be32f7b363ca6ae57fbfc3ba5634ad6538569a1b443be9d6b188094de3480`
  - exact quote: “useful evidence for focused proof work”
  - exact quote: “named-target spec work”
  - exact quote: “does not yet establish autonomous repository-wide specification discovery”
  - classification: verified current capability and limitation
- `VL-proof`
  - source: current capability summary
  - exact quote: “proof agents can close local Verus proof obligations”
  - exact quote: “not broad invariant invention”
  - classification: verified current capability
- `VL-guidance`
  - source: [guidance source policy](</ssd1/sichangheagent/VeruLaw/docs/guidance/source_policy.md>)
  - sha256:
    `c50c55ee337e0e59c79ab4435dd7267eb894eae2fcc8bee8337dab45cbb42acc`
  - exact quote: “Reusable guidance must be safe for controlled experiment”
  - exact quote: “public papers”
  - classification: current policy, not measured capability
- `VL-evaluation`
  - source: [guidance evaluation research standard](</ssd1/sichangheagent/VeruLaw/docs/roadmap/guidance_evaluation_research_standard.md>)
  - sha256:
    `51c03110e3a300b7da498a3df7a2e388eebf9569e84172c95d3b6db896727886`
  - exact quote: “paired controlled experiment”
  - exact quote: “arm-blinded scoring”
  - exact quote: “effect sizes with uncertainty intervals”
  - classification: current experiment standard, not completed evidence
- `VL-six-lane`
  - source: [six-lane real-project evidence](</ssd1/sichangheagent/VeruLaw/docs/midas-lex/real_project_usage_evidence_20260722.md>)
  - sha256:
    `82ddece93edbf7455349516dc7fd0dae9052585952b300bf4091f3a118a8a7d0`
  - exact quote: “does not show that Midas Lex reliably selected a target”
  - exact quote: “not a controlled comparison”
  - classification: bounded experimental evidence
- `VL-operating`
  - source: [experiment operating rules](</ssd1/sichangheagent/VeruLaw/docs/experiments/operating_rules.md>)
  - sha256:
    `62fd088e3bf3fb98f0635b38094e84ad9e82ed3931b124511ec8e827f01b2245`
  - exact quote: “Missing evidence downgrades the claim”
  - classification: current operating standard, not completed evidence
- evidence boundary
  - routing prose and task-manager records are not research evidence
  - no planned evaluation control is described as a completed capability
  - no subject experiment was launched for this paper study
  - the separate LeetProof decision remains unchanged

## confidence

- high confidence
  - source identity, saved bytes, paper scope, architecture, reported terminal
    numbers, explicit limitations, and current public-status classification
- medium confidence
  - the machine-checked main terminal outcomes
  - reason: consistent paper and project records, but incomplete public raw
    artifacts prevent a full independent replay
- medium-high confidence
  - novelty and capability threat to repository-scale Verus synthesis claims
  - reason: the claimed boundary is precise and materially beyond single-function
    proof filling, even if venue review later rejects broader claims
- low confidence
  - average performance, unseen-crate generalization, exact cost, contract
    adequacy, and end-to-end human-effort reduction
