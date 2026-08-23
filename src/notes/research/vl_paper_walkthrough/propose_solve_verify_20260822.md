# Propose, Solve, Verify: verifier-grounded self-play

(authored by agents unless marked 🧑)

- paper
  - Alex Wilf, Pranjal Aggarwal, Bryan Parno, Daniel Fried,
    Louis-Philippe Morency, Paul Pu Liang, and Sean Welleck
  - *Propose, Solve, Verify: Self-Play Through Formal Verification*
  - arXiv `2512.18160v1`, submitted 2025-12-20
  - 16-page author preprint marked under review
  - archival record: <https://arxiv.org/abs/2512.18160v1>
  - full text: <https://arxiv.org/pdf/2512.18160v1>
  - code named by the paper: <https://github.com/abwilf/psv>

## decision

- walkthrough rank: fifth of the 23 accepted canonical papers
  - canonical ID:
    `vpsd_d665b5a597a81fc278a6b0e2e40a129f59d83885b04844c2ea7d7db9ca701776`
  - ranks one through four establish four more immediate boundaries
    - scalable diverse verified-data generation
    - repository-aware proof completion
    - repository retrieval and benchmark scaling
    - production cryptographic proof and specification synthesis
  - PSV is next because it connects trustworthy verification signals to a
    compounding training loop
    - propose tasks near the current solver frontier
    - admit only verifier-accepted solutions
    - retrain and repeat
- confidence
  - high on identity, method, and author-reported experimental results
  - medium on generality and product relevance
    - evidence is limited to one 3B model, Verus, and small function benchmarks
    - no independent reproduction or VL experiment was run

## evidence boundary

- this walkthrough used the authenticated complete 16-page v1 preprint
  - method and learning loop in section 3
  - datasets, baselines, compute, and evaluation in section 4
  - results, scaling, and ablations in sections 5 and 6
  - proposal prompt, transfer scaling, spec filtering, training details, and
    verification definitions in appendices A through G
- the preserved PDF and extraction match the recorded checksums below
- historical intake work established relevance only
- claims below are paper claims unless labeled inference or recommendation
- no code artifact was authenticated or run for this walkthrough

## direct answer

- what PSV does
  - starts with a corpus of formal function specifications
  - asks a solver for ten candidate Rust-plus-Verus implementations and proofs
    per specification
  - runs Verus on each candidate
  - retains at most one verifier-accepted solution per problem
  - rejection-fine-tunes a solver from the fixed base checkpoint on the current
    accepted pool
  - labels each problem from the current solver's pass rate
    - easy: at least 0.8
    - medium: at least 0.2 but below 0.8
    - hard: above zero but below 0.2
    - impossible: zero accepted attempts
  - samples three examples from each difficulty bucket for an in-context
    proposer prompt
  - asks the proposer for an equal number of new specifications at each target
    difficulty
  - parses, deduplicates, and filters proposed specifications before adding them
    to the cumulative pool
  - repeats solving, training, and proposal for a fixed number of iterations
- what changes during self-play
  - solver weights change through rejection fine-tuning
  - proposer weights do not change
    - its update is refreshed in-context examples and difficulty labels
  - the task pool grows cumulatively
  - each iteration re-solves the current pool and trains from the original base
    model rather than continuing from the previous solver checkpoint
- why verification matters
  - accepted implementations satisfy their supplied specifications, subject to
    the Verus trusted computing base
  - this blocks incorrect test-passing programs from becoming positive training
    examples in the paper's model
  - verifier incompleteness remains
    - a correct implementation can fail verification
    - PSV therefore trains only on accepted positives and does not punish every
      rejected candidate as incorrect

## data and training lineage

- base model: Qwen2.5-Coder-3B-Instruct
- seed data: the translated corpus used by AlphaVerus
  - Dafny2Verus contains 274 problems
  - the corpus ultimately originates from human-written problems
  - the paper does not train on human-written solutions in its evaluated
    test-time-training setup
- evaluation data
  - Dafny2Verus: 274 translated problems
  - MBPP-Verified: 78 problems
  - HumanEval-Verified: 85 functions from 49 programs
- two evaluation settings
  - transfer learning
    - self-play starts from Dafny2Verus
    - evaluation uses held-out MBPP and HumanEval specifications
  - test-time training
    - the evaluation dataset's specifications are the initial task pool
    - PSV generates and trains on verified solutions around those test tasks
    - this measures adaptation to a known specification set, not unseen-task
      generalization
- reported main-run cost
  - about 24 hours on one machine with eight L40S GPUs
  - solver sampling uses temperature 0.8
  - final pass@k estimates use 100 samples per problem
  - results aggregate five random seeds and report standard errors
- important wording boundary
  - the self-play loop adds no human solution traces
  - the complete pipeline is not literally human-data-free because its initial
    specifications derive from human-written problems

## full-paper results

- transfer from Dafny2Verus
  - MBPP pass@1
    - PSV-Verus: 25.25 percent
    - fixed-spec RFT: 10.99 percent
    - AlphaVerus inference: 6.48 percent
  - HumanEval pass@1
    - PSV-Verus: 16.18 percent
    - fixed-spec RFT: 10.99 percent
    - AlphaVerus inference: 7.24 percent
- test-time training
  - Dafny2Verus pass@1
    - PSV-Verus: 65.63 percent
    - fixed-spec RFT: 34.46 percent
    - AlphaVerus inference: 24.06 percent
  - MBPP pass@1
    - PSV-Verus: 36.78 percent
    - fixed-spec RFT: 3.83 percent
    - AlphaVerus inference: 6.48 percent
  - HumanEval pass@1
    - PSV-Verus: 19.07 percent
    - fixed-spec RFT: 5.56 percent
    - AlphaVerus inference: 7.24 percent
  - the paper's largest 9.61-fold headline is MBPP PSV versus fixed-spec RFT
    in this test-time-training setting
- scaling the proposed-question budget in test-time training
  - Dafny2Verus pass@1 rises from 59.5 to 74.3 percent between 4,000 and
    32,000 questions per iteration
  - MBPP pass@1 rises from 22.3 to 44.3 percent between 1,000 and 32,000
  - HumanEval pass@1 rises from 13.9 to 26.3 percent over the same range
- transfer scaling is uneven
  - MBPP pass@1 rises from 21.8 to 32.0 percent between 4,000 and 32,000
    questions per iteration
  - HumanEval pass@1 remains effectively flat at 14.4 versus 14.3 percent
- holding total proposed questions fixed
  - more propose-solve-train iterations outperform one large round
  - at a 1,000-question Dafny2Verus budget, pass@1 rises from 21.0 percent in
    one iteration to 42.3 percent in five
  - this controls generated-question count, not total end-to-end compute
    - more rounds retrain and repeatedly solve an expanding task pool
    - the result does not by itself establish compute-matched superiority
  - inference
    - feedback and curriculum refresh add value beyond synthetic-data count

## ablations

- solution verification is essential in the tested loop
  - removing it lowers the nine-metric average from 43.31 to 27.90
  - pass@1 falls by about 52 to 55 percent relative across the three datasets
- specification filtering saves compute
  - only 47.7 percent of unique proposed specs pass the filter
  - without filtering, pass@10 inference on invalid specs costs about 2.1 times
    as much with no expected training gain
- difficulty labels help modestly
  - removing them lowers the nine-metric average from 43.31 to 40.87
  - six of nine metric drops are statistically significant
  - target control remains weak
    - easy, medium, and hard targets have mean pass rates 0.55, 0.45, and 0.36
    - the paper calls this `partial but incomplete control`
- refreshed proposal context matters more
  - replacing sampled current context with one fixed seed prompt lowers the
    nine-metric average from 43.31 to 38.71
  - refreshed prompting yields 45.3 versus 29.3 percent unique questions
  - it produces 2.26 times as many solvable questions used for training

## specification and verifier trust boundaries

- Verus acceptance is relative to the supplied formal specification
  - it does not establish that the specification matches human intent
  - it does not establish useful behavior outside the written preconditions and
    postconditions
- Verus soundness is relative to its trusted computing base
  - the paper explicitly qualifies formal-verification soundness this way
- verifier incompleteness biases the accepted training distribution
  - difficult-to-prove correct solutions can be omitted
  - proof patterns favored by automation can dominate the positive pool
- proposed-spec filtering has a narrower demonstrated meaning than the main
  text suggests
  - appendix D uses `external_body` with `assume(false); arbitrary()`
  - this checks parsing, typing, and Verus acceptance of the specification stub
  - it does not independently prove that a contract is satisfiable, non-vacuous,
    useful, or faithful to a natural-language requirement
- the `impossible` bucket conflates multiple causes
  - genuinely difficult valid task
  - underspecified, vacuous, or inconsistent task
  - proof-search failure
  - language or tool limitation
  - a zero pass rate alone cannot distinguish them

## what was already done

- AlphaVerus
  - supplied PSV's translated seed corpus and prior verified-code baseline
  - used self-improving translation and verifier-guided search
  - did not train a difficulty-aware proposer to expand a solver-relative task
    curriculum
- fixed-spec expert iteration and rejection fine-tuning
  - already trained on verifier-accepted solutions to a fixed problem pool
  - PSV's controlled increment is repeated adaptive specification proposal
- earlier proposer-solver self-play
  - had already been studied in synthetic tasks, coding, math, theorem proving,
    tool use, alignment, and general language tasks
  - PSV's paper-specific contribution is a Verus instantiation with a sound
    specification-relative reward and controlled scaling and ablations
- Formal Disco
  - later generates specifications, implementations, and proofs through
    asynchronous initiate-repair-extend workers
  - explicitly selects for structural diversity across several formal languages
  - PSV instead isolates solver-relative difficulty feedback and iterative
    curriculum effects on small Verus benchmarks
- KVerus and the LMPL repository work
  - address cross-file context, project lemmas, toolchain knowledge, and
    repository-level proof completion for existing specifications
  - PSV does not address those repository problems
- CryptoProver
  - demonstrates specification and proof synthesis for a production
    cryptographic library under stronger integration and anti-cheat gates
  - PSV does not establish production-scale or frozen-contract performance
- defensible PSV increment
  - a simple adaptive formal-specification curriculum
  - evidence that repeated feedback beats an equal-size one-round proposal
  - ablations separating verifier, difficulty, and prompt-diversity effects

## what VL should learn

- separate the loop into owned trust decisions
  - task proposal owns curriculum expansion
  - deterministic checks own syntax, typing, and tool compatibility
  - the verifier owns conformance to the frozen formal contract
  - a separate semantic gate owns contract adequacy and requirement fidelity
- measure difficulty from multiple signals
  - verifier pass rate
  - failure class and proof obligation shape
  - specification satisfiability and non-vacuity checks
  - repository dependencies and change scope
  - human escalation history
- preserve positive-only learning when rejection is ambiguous
  - verifier failure is not proof of semantic incorrectness
  - retain failures for diagnosis without automatically using them as negative
    labels
- refresh the curriculum more often than one bulk generation pass
  - the fixed-budget iteration result supports feedback-driven staging
  - compare staged and bulk generation at equal proposal and compute budgets
- keep diversity and difficulty distinct
  - refreshed context improves unique, solvable task yield
  - nominal difficulty targets only partially control empirical difficulty
- report adaptation and generalization separately
  - test-time training on known specifications is useful product behavior
  - it must not be presented as held-out task generalization

## recommended VL integration

- immediate design guidance
  - add explicit records for every proposed task
    - origin and seed lineage
    - frozen specification identity
    - static-check outcome
    - satisfiability and non-vacuity evidence or absence
    - solver attempts and exact verifier result
    - empirical difficulty with sample count and model version
    - acceptance or rejection reason
  - route zero-pass tasks before calling them impossible
    - malformed or unsupported
    - likely contract defect
    - valid but unproved
    - repository-context failure
  - define training admission as a conjunction
    - exact pinned toolchain accepts the implementation and proof
    - specification passes semantic and anti-vacuity gates
    - task adds measured requirement, repository, or proof-pattern coverage
    - whole-project checks remain green
  - retain a fixed held-out repository and chronological change set
    - never use their specifications for test-time curriculum when measuring
      generalization
- later evaluation proposal requiring separate authorization
  - compare fixed-task RFT, one-round proposal, and multi-round adaptive proposal
  - match total proposals, solver samples, training tokens, and verifier compute
  - evaluate repository-level completion, held-out change transfer,
    specification adequacy, proof maintenance, and cost
- no implementation or experiment is authorized by this note

## product threat

- overall: high strategic threat and medium current substitution threat
- high capability and data threat
  - verified synthetic curricula can turn a fixed seed set into improving model
    capability without collecting human solution traces
  - gains scale with generated tasks and repeated feedback in the tested range
  - the base model is only 3B, reducing the capital needed to explore the method
- high prior-art threat
  - generic novelty claims around formal-verifier-grounded self-play,
    difficulty-aware specification proposal, and rejection fine-tuning on
    accepted proofs are no longer credible anchors
  - public code and model claims lower replication cost, although this
    walkthrough did not authenticate the repository artifact
- medium current implementation threat
  - a main experiment reportedly takes about one day on eight L40S GPUs
  - the algorithm is simple enough for a capable competitor to reproduce
  - specification-relative verification reduces reward-hacking risk compared
    with generated unit tests
- low-to-medium current substitution evidence
  - tasks are small functions, not repositories or production changes
  - the strongest gains include test-time training on evaluation specifications
  - held-out HumanEval transfer stops improving as question count scales
  - contract intent, satisfiability, non-vacuity, repository integration,
    maintainability, and change resilience are not established
- inference
  - PSV threatens any VL moat based only on scarce verified examples or a basic
    verifier-filtered training loop
  - VL remains differentiated only if it owns specification governance,
    repository evidence, safe change control, and durable maintenance outcomes

## limitations and cautions

- one open 3B base model and one verification stack are evaluated
- datasets contain only 78 to 274 problems
- all results are author-reported in a v1 preprint
- no comparison isolates training-token or total-verifier-compute efficiency
  across every baseline
- AlphaVerus is inference-only while PSV is trained
  - fixed-spec RFT is the cleaner baseline for the value of proposal
- test-time-training results adapt to the evaluation specifications
  - they should not be read as zero-shot generalization
- only 47.7 percent of unique proposed specifications pass the paper's static
  filter
- the paper provides no semantic audit of generated specifications
- reported difficulty distributions overlap substantially
- solver success can reflect proof-automation convenience rather than task
  importance
- transfer scaling fails to improve HumanEval pass@1
- no repository-level, production, security-critical, or longitudinal
  maintenance evaluation is reported
- the impact statement acknowledges broad ethical concerns about
  self-improving models but does not analyze concrete misuse or control measures

## source-linked claims

- algorithm and fixed-base retraining: section 3.1 and algorithm 1
- rejection fine-tuning and incompleteness rationale: section 3.1
- proposal buckets and in-context update: section 3.1 and appendix A
- dataset identity, baselines, model, compute, and evaluation: section 4
- main benchmark numbers: table 1 and section 5
- question and iteration scaling: sections 6.1 and 6.2, figures 5 and 6
- verification, difficulty, and diversity ablations: section 6.3 and table 2
- weak transfer scaling to HumanEval: appendix C
- specification filter mechanism: appendix D
- verification definitions and trusted-base boundary: appendix F
- paper's compute framing: `proof of concept ... at minimal compute scale`
- paper's central guarantee: `sound with respect to specifications`

## durable evidence

- authenticated PDF
  - `/hdd1/sichanghe/paper_collection/Propose, Solve, Verify: Self-Play Through Formal Verification, arXiv, 2025.pdf`
  - SHA-256
    `5773464aa521f9932f488a34d15408ea652734b3e995cb3a25ba3f1c854b1f13`
- complete layout-preserving text
  - `/hdd1/sichanghe/paper_collection/Propose, Solve, Verify: Self-Play Through Formal Verification, arXiv, 2025/Propose, Solve, Verify: Self-Play Through Formal Verification, arXiv, 2025.txt`
  - SHA-256
    `5ed12e4252aff9318d997ca80f7503f40e289c100fa1feb58f66d4595032ca3c`
- retrieval and extraction provenance
  - `/hdd1/sichanghe/paper_collection/Propose, Solve, Verify: Self-Play Through Formal Verification, arXiv, 2025/source-provenance.md`

## next discussion question

- should VL first adopt PSV's multi-round difficulty-aware curriculum for
  future training data, or first build the semantic specification gate needed
  to prevent self-play from scaling vacuous or misaligned contracts
