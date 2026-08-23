# The Rewrite Before The Proof: translating Rust into Verus's accepted dialect

- authors: Mark Athiri, Chuyue Sun, and Clark Barrett
- source: Stanford CS191W Spring 2026 project paper, 11 pages
- canonical ID:
  `vpsd_bd11a18544f233b93ac26facb2fae5b2274d533a5f18374e3fed400abce0771b`
- walkthrough rank: seventh of the 23 accepted canonical papers
- evidence: authenticated full paper, not discovery metadata or abstract alone

## decision

- technical value: high as a diagnosis and front-end design warning
  - ordinary Rust may need structural changes before Verus can lower it or give
    Z3 a tractable problem
  - the agent loop makes this translation stage measurable and repairable
  - about half of failed attempts are rejected before the prover runs
- empirical strength: low-to-medium
  - one 107-row benchmark comes from one Curve25519-Dalek-derived comparison
  - a manual audit found only 3 of its first 10 rows cleanly evaluable
  - the decisive specification-aware ablation covers only 10 selected cases
- actionable VL conclusion
  - represent ordinary-Rust-to-Verus translation as a distinct workflow stage
  - accept a rewrite only after executable behavior, approved contracts, and
    whole-project verification survive together
  - use typed diagnostics and project-aware edits instead of treating every
    failure as a proof-generation problem
- product threat: medium strategic, low current substitution
  - the paper exposes a real missing layer and an implementable agent loop
  - it does not demonstrate requirement discovery, full translation of an
    unseen crate, production integration, or proof generation after translation
- no product change or experiment is authorized by this note

## evidence boundary

- authenticated local PDF:
  [paper](</hdd1/sichanghe/paper_collection/The Rewrite Before The Proof: Agentic Translation of Rust to Verus, Stanford CS191W, 2026.pdf>)
- complete local extraction:
  [text](</hdd1/sichanghe/paper_collection/The Rewrite Before The Proof: Agentic Translation of Rust to Verus, Stanford CS191W, 2026/The Rewrite Before The Proof: Agentic Translation of Rust to Verus, Stanford CS191W, 2026.txt>)
- retrieval record:
  [provenance](</hdd1/sichanghe/paper_collection/The Rewrite Before The Proof: Agentic Translation of Rust to Verus, Stanford CS191W, 2026/source-provenance.md>)
- PDF SHA-256:
  `af58b66325fd893482b379a5525e3f2aac8f377be3c09b055766acb79d309823`
- observed extraction SHA-256:
  `110a3a5b5916de89322e45d571c9375719f257cf13c0befe0ad518f8cfd5cf3e`
- evidence class
  - author-reported student project paper
  - this walkthrough did not run the system or reproduce its measurements
  - the paper's own benchmark audit and judge calibration are preserved below

## what the paper does

The paper separates two jobs that are often conflated. Translation restructures
ordinary Rust into code Verus can lower and reason about. Specification and
proof work states the intended properties and proves them. Translation is a
prerequisite; it is not a substitute for the other two jobs.

- source and target
  - the authors diff ordinary `curve25519-dalek` against its Verus-verified
    `dalek-lite` fork
  - they classify 133 paired rewrite sites across 14 files into 12 patterns
  - after removing tests, comment-heavy ground truths, and abbreviated bodies,
    107 rows remain
- representative rewrites
  - trait methods become explicit verified wrappers
  - chained calls become named intermediate values
  - iterators and closures become indexed loops with invariants
  - standard-library operations and macros become literals or explicit loops
  - compound arithmetic and tuple-field access become verifier-friendly forms
- automation boundary
  - R1–R5 are the main function-local target, covering 96 benchmark rows
  - multi-file structural changes and open-ended dispatch changes do not fit the
    line-anchored editing interface

## agent and evaluation loop

- each method proposes a candidate rewrite
  - NN retrieves the most similar ground-truth rewrite from another row in the
    same pattern after excluding the same AST cluster
  - M1 gives Claude Opus 4.6 one 17.6 kB skill document
  - M2 routes each case to two pattern-specialist prompts
- a runner owns execution
  - splice into a clean real worktree
  - reject malformed braces
  - run `cargo verus focus` on a pre-warmed module baseline
  - classify the result into one pass bucket or 11 failure buckets
  - search for and insert imports after a missing-symbol failure
  - give the model the previous candidate and verifier diagnostics for at most
    three repair turns
  - roll back every edit between cases
- ranking depends on whether local verification is meaningful
  - otherwise the method falls back to compile success and an LLM equivalence
    judge because some obligations live in surrounding contracts
- the real-worktree choice matters
  - the authors report that an earlier stubbed sandbox accepted candidates that
    would not link in `dalek-lite`

## results

- case-level, any of two attempts after up to three repair turns
  - verify pass: NN 31.8%, M1 29.0%, M2 27.1%
  - human-judged near equivalence: NN 28.0%, M1 33.6%, M2 33.6%
  - raw ground-truth match: NN 6.5%, M1 0.9%, M2 1.9%
  - recall-corrected ground-truth upper bounds: NN 10.9%, M1 1.6%, M2 3.1%
- what repair changes
  - without repair, M1 and M2 verify 7.5% of cases
  - three repair turns raise them to 29.0% and 27.1%
  - their strict ground-truth match rates remain 0.9% and 1.9%
  - inference: iterative diagnostics recover local verifier acceptance far more
    often than they recover the complete intended transformation
- where failure occurs
  - 48–52% of failing attempts are classified as infrastructure failures
  - these include splice, brace, syntax, symbol, lifetime, and visibility errors
  - this share is a lower bound under the paper's taxonomy because compile
    errors caused by wrong wrappers count as proof-content failures
- routing is not the main answer
  - M2's router is 64.5% correct at top one and 77.6% at top two
  - it misses all 15 R4 cases at top one because extraction removes the markers
    needed for classification
  - the unrouted M1 method still performs best on R4

## rewrite-before-proof boundary

The most important result is a false-green boundary between local verifier
acceptance and an acceptable repository transformation.

- the authors hand-label 228 attempts to calibrate their LLM ground-truth judge
  - judge precision is 1.000: 12 true positives and no false positives
  - recall is 0.600 with 95% confidence interval [0.39, 0.78]
- among 160 verify-passing LLM attempts that the judge calls non-equivalent
  - 134 have the right executable body but omit a named return, `ensures`, or
    proof block
  - 18 are materially wrong through such errors as wrong-function retrieval,
    invented symbols, wrong edit regions, or broken recursion
  - the remaining 8 are judge false negatives that humans label equivalent or
    equivalently correct with a different implementation
- why local verification is insufficient
  - a function can verify under focus scope after its contract disappears
  - downstream functions that depend on that contract then fail at whole-crate
    scope
- the prompt caused part of the gap
  - the original skill explicitly excluded contract insertion
  - a 60-line specification-aware addition asks every rewrite to preserve or
    add the associated specification annotation
- small ablation
  - 4 of 10 selected formerly failing cases pass whole-crate verification
  - 9 of 10 emit an `ensures` clause
  - all 3 cases with clean content-match splicing pass
  - the other six failures all use the drift-prone function-line-range splicer
- correct interpretation
  - this identifies a mechanism and a promising direction
  - it does not estimate the full benchmark lift because case selection is
    narrow, splice strategy is confounded, and the clean subset has only three
    cases

## benchmark and validity limits

- the first 10 benchmark rows receive a manual audit
  - only 3 are cleanly evaluable
  - three are disabled tests, three point into the wrong implementation block,
    and one does not contain its assigned pattern
- the authors extrapolate an approximate 30–35% oracle ceiling from this
  10-row audit
  - the estimate is not a measurement of all 107 rows
  - NN's 31.8% headline therefore cannot be read like an ordinary pass rate
- 12 of 86 sites in the paper's later in-scope population analysis require
  project-level rather than per-function edits
- several patterns contain five or fewer cases
- same-cluster retrieval exclusion reduces mean token-set similarity from 66.96
  to 49.23, showing why leakage control matters
- only one crypto-code lineage, one model, and one paper-built harness are tested
- no result covers unseen-project generalization, semantic requirement recovery,
  human review effort, maintained correctness after repository changes, or the
  complete ordinary-Rust-to-verified-Verus journey

## what was already done

- AutoVerus, VeruSAGE, and VeruSyn already target proof annotations or verified
  program generation after code is inside the accepted Verus dialect
- rank one, Formal Disco, already establishes verifier-filtered synthetic data,
  incremental repair and extension, and diversity-aware selection
- rank two, KVerus, already establishes repository-aware proof completion with
  typed dependencies, lemma retrieval, toolchain knowledge, and accepted
  project patches
- rank three, repository-level program verification, already establishes hybrid
  example and dependency retrieval for masked proofs in verified repositories
- rank four, CryptoProver, already supplies production-crate internal contract
  and proof synthesis beneath human-fixed public contracts, runner-owned gates,
  and whole-scope acceptance
- rank five, Propose, Solve, Verify, already supplies verifier-grounded adaptive
  specification curricula and proof self-training
- rank six, Verus-SpecGym, already isolates four-direction evaluation of whether
  generated Verus contracts match ordinary-language tasks
- this paper's clearest increment
  - isolate ordinary-Rust-to-Verus structural translation as its own benchmark
    and agent stage
  - classify front-end and harness failures separately from prover failures
  - demonstrate that translation prompts must preserve load-bearing contracts
  - show why project-aware editing is required for multi-site rewrites
- prior-art boundary
  - generic claims to verifier-in-the-loop repair, repository retrieval, proof
    generation, specification generation, or contract evaluation are already
    covered by earlier work
  - this paper further weakens generic novelty claims around agentic translation
    into a verifier-accepted Rust dialect

## what VL should learn

- expose the translation boundary explicitly
  - diagnose unsupported syntax, solver-hostile structure, missing verified
    wrappers, proof failure, and contract failure as different states
  - do not send a front-end rejection into an undifferentiated proof loop
- make compatibility knowledge versioned and repository-specific
  - record unsupported constructs, approved wrapper identities, rewrite patterns,
    Verus version, and the source revision where each pattern succeeded
  - prefer exact symbol and dependency evidence over invented wrapper names
- preserve a three-part acceptance boundary
  - executable behavior remains equivalent to the approved ordinary Rust
  - approved contracts are preserved or changed through a separate semantic gate
  - the relevant whole repository verifies after the integrated edit
- use project-aware transactions
  - edit declarations and dependent uses as one candidate when the rewrite is
    inherently multi-site
  - detect source drift structurally instead of applying stale line ranges
  - restore a known-clean tree between attempts
- retain failures as product data
  - exact patch, edit region, repository and toolchain identity
  - front-end, compiler, verifier, and whole-project diagnostics
  - import repairs, wrapper resolutions, attempts, costs, and final disposition
- evaluate the assembled pipeline, not just the model
  - benchmark extraction quality and edit integration can dominate the score
  - report eligible-case coverage, local verification, whole-project acceptance,
    behavior equivalence, contract preservation, and review burden separately

## recommended VL integration

- immediate design work, without changing the product
  - add a proposed `translation` state before specification and proof search
  - define typed entry and exit evidence for that state
    - unsupported construct or solver-hostile shape identified
    - behavior-preserving candidate patch
    - approved-contract delta is empty or separately authorized
    - module and whole-project checks pass
  - extend the repository knowledge design with versioned wrapper and rewrite
    facts linked to exact symbols and source revisions
  - make multi-file edit scope and rollback part of the runner's transaction
    record
  - prohibit local verifier pass from serving as final acceptance
- later evaluation proposal requiring separate authorization
  - sample naturally occurring ordinary-Rust incompatibilities from held-out
    repositories rather than deriving every row from one verified fork
  - compare retrieval, one shared skill, and typed pattern guidance at equal
    model and repair budgets
  - score behavior equivalence, contract preservation, whole-project pass,
    integration failure class, reviewer effort, and cost
  - audit every benchmark row or report an eligibility denominator instead of
    extrapolating from the first 10
- no implementation, benchmark run, or download is part of this walkthrough

## product threat

- overall: medium strategic threat, low current substitution threat
- medium capability threat
  - the paper identifies a concrete stage missing from proof-centric systems
  - its real-worktree loop, diagnostic routing, import repair, and transactional
    retries are straightforward to reproduce
  - the ablation shows that prompt scope can directly create or repair a
    contract-preservation failure
- high warning value for VL
  - a proof agent can waste time if its input never enters Verus's accepted
    dialect
  - a local green result can be unsafe if the rewrite silently removes a
    downstream contract
  - infrastructure and edit integration deserve first-class engineering
- medium prior-art threat
  - agentic Rust-to-Verus structural translation and its verifier feedback loop
    are now explicit public prior work
  - a broad claim around automating the rewrite-before-proof stage is a weak
    differentiation anchor
- low demonstrated substitution
  - the LLM methods verify only 27.1–29.0% on a noisy single-lineage benchmark
  - strict ground-truth match is 0.9–1.9% before a selected 10-case ablation
  - multi-site patterns remain outside the editing surface
  - there is no end-to-end new-crate translation, proof completion, contract
    adequacy result, or production adoption evidence
- inference
  - VL should absorb translation as one governed stage, not reposition itself as
    a generic rewrite agent
  - durable differentiation remains repository intent, specification governance,
    project-aware change control, whole-system evidence, and maintenance

## source anchors

- thesis, abstract and section 1
  - “formal verification of production code has a translation-layer problem”
  - “rather than to write the proof itself”
- benchmark, sections 3 and 4
  - “133 rewrite sites across 14 files”
  - “The remaining 107 rows are the headline benchmark.”
  - “Only 3 of the 10 turned out to be cleanly evaluable”
- real integration, section 5
  - “Real worktree, not a sandbox.”
  - “candidates that would never link inside dalek lite were still verifying”
- headline metrics, table 2 and section 7.1
  - “Verify is a near tie”
  - “the executable body matches ground truth”
  - “the only missing piece is the spec annotation”
- judge calibration, section 7.7
  - “precision = 1.000”
  - “recall = 0.600 (95% CI [0.39, 0.78])”
- ablation boundary, section 7.8
  - “4 of 10 cases pass whole crate verify”
  - “the 3/3 content match figure rests on three cases”
- infrastructure, table 5 and section 8
  - “infra share” is 50% for NN, 52% for M1, and 48% for M2
  - “a project level editing surface” is the proposed response to multi-site work

## next discussion question

Should `vlpw:0` draft a small, costed design proposal for making
ordinary-Rust-to-Verus translation an explicit VL stage with behavior,
contract-preservation, and whole-project acceptance gates?
