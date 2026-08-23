# VeriContest: measuring the whole verifiable-code pipeline

(authored by agents unless marked 🧑)

- paper
  - Zichen Xie, Mrigank Pawagi, Yuxin Liu, Aaditi Rai, Lize Shao, John
    Berberian Jr., Sicong Che, and Wenxi Wang
  - *VeriContest: A Competitive-Programming Benchmark for Verifiable Code
    Generation*
  - arXiv `2605.08553`, preprint as recorded in the authenticated collection
- canonical ID:
  `vpsd_423d8f9fd60e9adbb7afcdfc23ddac1c8f04dc62973e02702a04bbfa80090bca`
- excluded duplicate ID:
  `vpsd_d34dd6fcbc23e33dfa8a81466393e58b7c40e78f4788885d9f3fe50a71bcb995`
- walkthrough rank: ninth of the 23 accepted canonical papers

## decision

- technical value: high as an evaluation design
  - the benchmark keeps natural-language requirements, formal specifications,
    executable code, proofs, and strict end-to-end alignment as distinct gates
  - it provides 946 retained Rust/Verus competitive-programming problems with
    ground-truth artifacts and positive and negative tests
  - its strongest-model pass@1 results separate an easy-looking code result
    from much weaker specification, proof, and end-to-end results
- empirical strength: medium
  - all retained instances have judge-accepted reference code, Verus-checked
    proofs, and review by at least two experts
  - mutation-based testing found 60 incomplete postconditions during benchmark
    construction
  - generated-program and generated-specification acceptance still relies on
    finite tests, constructed ground truth, generated equivalence proofs, and
    manual fallback
  - unsupported tasks and proofs that resisted bounded agent and human work
    were excluded before the final 946-problem benchmark
- actionable VL conclusion
  - make the requirement, specification, implementation, proof, strict
    alignment, repository, and maintenance outcomes separate receipt fields
  - never let a strong code result compensate for a failed specification or
    proof gate
  - use specification mutants and counterexamples as finite intent evidence,
    with human ownership of the final meaning judgment
- product threat
  - high prior-art threat to a broad claim of inventing decomposed or
    end-to-end benchmarking for verifiable code generation
  - medium capability threat because the benchmark, construction workflow, and
    failure taxonomy can train and focus competing systems
  - low current substitution threat because no live repository, project
    scoping, dependency change, system property, maintenance sequence, or
    operational outcome is evaluated
- no product change or experiment is authorized by this note

## evidence boundary

- authenticated collection PDF:
  [paper](</hdd1/sichanghe/paper_collection/VeriContest- A Competitive-Programming Benchmark for Verifiable Code Generation, Zichen Xie, Mrigank Pawagi, Yuxin Liu, et al., arXiv, 2026.pdf>)
- complete 24-page Marker extraction:
  [text](</hdd1/sichanghe/paper_collection/VeriContest- A Competitive-Programming Benchmark for Verifiable Code Generation, Zichen Xie, Mrigank Pawagi, Yuxin Liu, et al., arXiv, 2026/VeriContest- A Competitive-Programming Benchmark for Verifiable Code Generation, Zichen Xie, Mrigank Pawagi, Yuxin Liu, et al., arXiv, 2026.md>)
- extraction metadata:
  [metadata](</hdd1/sichanghe/paper_collection/VeriContest- A Competitive-Programming Benchmark for Verifiable Code Generation, Zichen Xie, Mrigank Pawagi, Yuxin Liu, et al., arXiv, 2026/VeriContest- A Competitive-Programming Benchmark for Verifiable Code Generation, Zichen Xie, Mrigank Pawagi, Yuxin Liu, et al., arXiv, 2026_meta.json>)
- PDF SHA-256:
  `3ee4c909859d894f4b015b7e6b507b6986663059d4875b89193e4d89a4783d5e`
- extraction SHA-256:
  `0150c4dee56eeabf16a7cacf50f8f4d38ad9c8571604b9e75f6a16fe414acbf6`
- metadata SHA-256:
  `017719af3a5fd7d3098599d2a55dc6b00d022b14622e0aca59fb0f94e99c8041`
- evidence class
  - author-reported preprint, not described here as peer reviewed
  - this walkthrough did not run the benchmark, models, Post2Exe, Verus, or an
    independent reproduction
  - paper facts, walkthrough inferences, and proposed VL work are separated
    below

## what VeriContest contains

- 946 retained competitive-programming problems
  - 690 from LeetCode
  - 256 from Codeforces
  - LeetCode Easy through Hard and Codeforces A through D
- each instance contains
  - a natural-language problem description and starter code
  - a Verus precondition and postcondition
  - online-judge-accepted executable Rust
  - a Verus-accepted proof
  - positive input-output tests
  - negative pairs containing valid inputs and incorrect outputs
  - source, difficulty, acceptance-rate, and algorithm metadata
- artifact scale
  - median 32 lines of code, 23 lines of specification, and 83 lines of proof
  - mean 36.1 lines of code, 26.7 lines of specification, and 137.6 lines of
    proof
  - maximum 334 code, 168 specification, and 1,226 proof lines
  - median 11.5 loop invariants, 14 assertions, and one lemma function
  - inference
    - these are materially proof-heavy functions
    - file and repository integration complexity is absent by construction

## construction and curation

- phase I: 91 manually verified seeds
  - 81 LeetCode and 10 Codeforces problems
  - humans write specification, executable Rust, and proof in that order
  - reference code must pass the source online judge and the whole Verus program
    must verify
- phase II: semi-automated expansion to 946 retained problems
  - a GitHub Copilot agent backed by GPT-5.3-Codex writes specifications, code,
    and proofs with seed-derived lemmas, templates, syntax guidance, and
    algorithm-indexed examples
  - candidate tasks are screened against Verus's supported Rust subset
  - the screening consults problem metadata and five top-rated community
    solutions
  - floating point, priority queues, binary search trees, and other unsupported
    requirements can exclude a problem before generation
  - Verus runs with `--no-cheating`, rejecting `assume`, `admit`,
    `external_body`, and `assume_specification`
  - after 20 unsuccessful minutes, a human gives targeted feedback or completes
    the proof
  - a problem still unverified after another 20 minutes is discarded
- retained-instance checks
  - judge acceptance for reference-code correctness and efficiency
  - manual review for specification soundness, completeness, and unnecessary
    implementation constraints
  - independent Verus verification
  - at least two human experts review every retained instance
- correct boundary
  - the retained benchmark is a curated success set, not an unbiased sample of
    all contest problems
  - human completion is part of benchmark construction, not model evaluation
  - excluding unsupported and persistently hard problems creates capability and
    survivor boundaries that must accompany every result

## test generation and specification checking

- positive tests
  - an LLM synthesizes random and adversarial input-generator programs
  - each generator is proved in Verus to return inputs satisfying the target
    precondition
  - the accepted reference implementation supplies expected outputs
  - the paper reports a mean 252.7 positive tests per problem and 99.66% line
    coverage over reference code
- negative tests
  - pair valid inputs with outputs intended to be wrong
  - semantic mutation creates five plausible buggy implementations and retains
    non-trivial mutants whose positive-test pass rate is strictly between zero
    and 100%
  - `cargo-mutants` adds local syntactic variants
  - direct type-specific output mutation fills remaining capacity toward a set
    ten times the positive-test size
  - median and mean negative-test counts are 2,670 and 2,315.6
- Post2Exe
  - translates supported Verus postconditions into executable Rust predicates
  - accepts postconditions on positive outputs and rejects them on negative
    outputs
  - converts 83% of benchmark postconditions
  - unsupported cases such as unbounded quantifiers receive manual review
  - the process exposes 60 incomplete postconditions, which are revised
- correct boundary
  - verified input generators establish their stated preconditions, not input
    diversity or exhaustive behavior coverage
  - high line coverage is not path, mutation, or semantic completeness
  - negative tests show that recorded bad outputs are rejected; they cannot
    prove that every invalid output is rejected
  - judge acceptance plus one verified reference shows that the reference
    satisfies the specification; the intended relation still depends on human
    review and finite counterexamples

## six evaluation tasks and their inputs

- specification generation: `nl2spec`
  - input: natural-language description
  - output: precondition and postcondition
- code generation
  - `nl2code`: natural-language description to executable Rust
  - `spec2code`: ground-truth Verus specification to executable Rust
  - `nl_spec2code`: both description and ground-truth specification to code
- proof generation: `spec_code2proof`
  - input: ground-truth specification and executable code
  - output: proof annotations only
  - changing the supplied specification or code is failure
- strict end to end: `end2end`
  - input: natural-language description only
  - output: mutually aligned specification, executable code, and proof
- inference
  - these settings diagnose different conditional capabilities
  - their percentages must not be averaged or compared as though the models
    received the same information

## acceptance metrics

- specification
  - generated and ground-truth preconditions must imply each other
  - GPT-5.5 generates the two Verus implication proofs with up to five repair
    rounds
  - failed proof generation receives manual equivalence review
  - generated postconditions run through Post2Exe on positive and negative
    tests, with manual review when conversion fails
- code
  - generated code must pass every positive test under a two-second per-case
    timeout
  - this is finite benchmark-test correctness, not new online-judge acceptance
- proof
  - the ground-truth specification and code stay fixed
  - Verus must accept the added proof and supplied artifacts must not change
- end to end
  - the generated specification, code, and proof must all pass their respective
    checks for the same problem
- reporting
  - primary results are pass@1 over all 946 retained tasks
  - pass@k and repair@k through 20 attempts are reported only for Qwen 3.6 and
    GLM-4.7-Flash proof generation

## reported results

- strongest pass@1 result in each principal stage
  - `nl2code`: GPT-5.5, 92.18%
  - `nl2spec`: GPT-5.5, 48.31%
  - `spec_code2proof`: GPT-5.5, 13.95%
  - `end2end`: GPT-5.5, 5.29%
- specification-conditioned code generation
  - GPT-5.5 falls from 92.18% on `nl2code` to 67.65% on `spec2code`
  - adding natural language to the specification raises it to 74.52%, still
    below natural language alone
  - the same ordering, `spec2code < nl_spec2code < nl2code`, holds across all
    ten evaluated models
  - paper interpretation
    - models have less training exposure to formal specification-code pairs
    - formal ghost types and quantified relations are often mishandled as
      executable constructs
- proof sampling and repair
  - Qwen 3.6 rises from pass@1 4.86% to pass@20 8.67%
  - its repair result rises from repair@1 7.08% to repair@20 11.84%
  - GLM-4.7-Flash rises from pass@1 5.50% to pass@20 7.40%
  - its repair result rises from repair@1 6.77% to repair@20 7.72%
  - inference
    - verifier feedback is useful, but repeated repair leaves most benchmark
      proofs unresolved for these two models
- strict alignment
  - GPT-5.5 leads code, specification, and proof pass@1 but reaches only 5.29%
    end to end
  - a verifier-accepted program can still fail if its specification does not
    capture the intended problem
  - no stage result can substitute for strict same-instance alignment

## failure evidence

- generated specifications
  - syntax errors dominate many models' failed `nl2spec` attempts
  - among parsable frontier-model outputs, both precondition and postcondition
    mismatches remain material
- specification-conditioned code
  - models copy proof-only `int` and `nat` types into executable code
  - some translate quantified relations literally, producing inefficient code
  - GPT-5.5 has 37 and Claude Opus 4.7 has 53 timeouts on the 946
    `nl_spec2code` tasks
- proof generation
  - some frontier models frequently modify the fixed code or specification
    rather than add only proof material
  - outputs that preserve the obligation still fail on invariants, assertions,
    arithmetic, triggers, unsupported features, or termination
- paper case study
  - Claude Opus 4.7 writes and proves a correct binary search against a
    postcondition saying only that the result has length two
  - functional tests and Verus both pass, while the specification metric rejects
    the missing meaning
  - GPT-5.5 writes a stronger specification but cannot prove two binary-search
    loop assertions
  - inference
    - verifier acceptance and behavioral tests are complementary oracles
    - neither alone establishes requirement-to-program correctness

## limitations and validity threats

- public-source contamination
  - LeetCode and Codeforces descriptions and conventional solutions may occur
    in model training data
  - risk is strongest for natural-language-to-code generation
  - benchmark-specific Verus specifications and proofs make the other tasks
    harder to explain by ordinary solution recall, but do not eliminate all
    exposure or benchmark adaptation risk
- survivor and construction bias
  - unsupported Rust features and data structures are filtered out
  - proofs beyond bounded agent and human effort are discarded
  - community solutions, expert templates, human feedback, and manual proof
    completion contribute to the retained artifacts
- finite and derived oracles
  - generated code is evaluated on constructed positive tests
  - postcondition completeness is evaluated on constructed negative outputs
  - precondition equivalence may depend on another model's generated proofs or
    manual judgment
  - the ground-truth specification remains a reviewed artifact, not an
    infallible statement of human intent
- scope
  - Rust with Verus only
  - competitive-programming functions only
  - no multi-file build, original repository, changing dependency, maintenance
    sequence, distributed behavior, performance regression, or user workflow
- status
  - all rates are author-reported preprint results
  - no independent replication was performed in this walkthrough

## what was already done

- benchmark decomposition
  - earlier benchmarks already isolate specification, code, or proof generation
  - Clover, CLEVER, VERINA, and VerifyThisBench already cover combinations or
    end-to-end verified generation
  - VerusBench, RepoVBench, VeruSAGE, and VeriStruct already exercise Verus proof
    generation
- specification validity
  - mutation and example-based specification checking predate VeriContest
  - IronSpec already shows why verifier acceptance cannot establish that a
    specification expresses intended behavior
- proof and code generation
  - compiler/verifier feedback, iterative proof repair, and competitive-programming
    code benchmarks are established techniques
- VeriContest's defensible increment
  - 946 retained Rust/Verus competitive-programming tasks
  - matched natural language, reviewed specification, judge-accepted code,
    checked proof, and positive/negative tests
  - one protocol spanning isolated and strict compositional evaluation
  - construction-time Post2Exe checking that found 60 incomplete postconditions
- prior-art boundary
  - VeriContest does not originate specification generation, code generation,
    proof generation, Verus proof repair, mutation testing, or end-to-end
    verifiable synthesis
  - it is direct public prior art for a large Rust/Verus benchmark that combines
    those artifacts and gates

## what VL should learn

- use a receipt with non-substitutable outcomes
  - requirement identity and version
  - specification validity evidence
  - executable behavior
  - proof acceptance without unauthorized obligation changes
  - strict alignment across requirement, specification, implementation, and proof
  - repository build, test, lint, and dependency outcomes
  - maintenance after a representative change
  - system properties and operational utility when relevant
- keep denominators and inputs attached
  - eligible versus attempted versus retained work
  - per-stage inputs, model, attempt budget, timeout, tool versions, and fallback
  - automatic, repaired, and human-assisted results
  - no aggregate score that lets a strong code result hide a failed meaning gate
- test specifications adversarially
  - valid examples that correct implementations should satisfy
  - invalid inputs that preconditions should reject
  - correct outputs that postconditions should permit
  - incorrect outputs and mutants that postconditions should reject
  - human review of every surviving behavior difference
- route failures by stage
  - parser and Verus syntax
  - requirement-to-specification mismatch
  - specification-to-code mismatch or inefficient literalization
  - proof failure with obligation preservation
  - strict cross-artifact mismatch
  - repository and system failure after local success

## recommended VL integration

- immediate design work, without changing the product
  - define the receipt fields and prohibit success roll-up across failed gates
  - preserve immutable hashes for the requirement, specification, executable
    slice, and proof obligation before repair
  - add specification-mutant evidence and surviving cases to the human review
    packet
  - record eligibility filters and discarded-task reasons before reporting rates
  - require a distinct repository gate after function-level acceptance
- later evaluation proposal requiring separate authorization
  - use both a VeriContest-compatible component track and held-out live
    repository changes
  - compare single-pass, independent sampling, verifier-guided repair, and
    receipt-guided repair under equal budgets
  - report specification, code, proof, strict alignment, repository, and
    maintenance outcomes separately
  - include private or newly authored tasks to reduce public-problem exposure
  - measure human review and repair time, not only model pass rates

## threat assessment

- high prior-art threat
  - a public benchmark already decomposes natural-language-to-specification,
    three code-input settings, fixed-obligation proof generation, and strict
    end-to-end verified generation in Rust/Verus
  - a broad VL novelty claim around this evaluation decomposition is not
    defensible
- medium capability threat
  - the 946 matched examples are potential supervision and retrieval material
  - the construction recipe, expert proof patterns, Post2Exe checks, and error
    taxonomy give competitors a concrete improvement agenda
  - the low proof and end-to-end results expose valuable whitespace rather than
    a mature substitute
- low current substitution threat
  - the work is a benchmark, not an autonomous development product
  - it does not select a repository task, negotiate requirements, change a
    multi-file project, manage dependencies, preserve proofs across revisions,
    verify system behavior, or measure operational value
  - retained tasks exclude important language features and hard proofs
- inference
  - VL should adopt the diagnostic gates and specification-adversary pattern
  - VL should differentiate through governed intent, immutable obligation
    tracking, repository transactions, maintenance evidence, system-level
    modeling, and measured human effort

## rank-nine rationale

- ranks one through eight establish more immediate product dependencies
  - scalable verified training data
  - repository-aware proof completion and retrieval
  - production-code and internal-specification work
  - specification-faithfulness evaluation
  - ordinary-Rust and C/ACSL migration into Verus
- VeriContest follows because it provides the clearest common scorecard for the
  resulting specification, code, and proof components
- it ranks below the migration papers because it measures capability rather than
  integrating or maintaining a live software change
- its durable value to VL is the evaluation contract, not the 5.29% number by
  itself

## source anchors

- benchmark identity and scale, abstract and sections 1 and 4
  - “946 competitive-programming problems”
  - “expert-validated formal specifications”
- construction, section 3
  - “three-phase pipeline”
  - “human-in-the-loop review”
- specification testing, section 3.3
  - “Post2Exe converts 83% of benchmark postconditions”
  - “identifies 60 incomplete postconditions”
- tasks and metrics, section 5
  - “both isolated and compositional evaluation”
  - “only if its specification, executable code, and proofs”
- main results, section 6
  - “ProofGen is the major bottleneck”
  - “end-to-end verifiable code generation is far from solved”
- limitations, appendix C
  - “do not cover all software domains”
  - “fully private or newly authored tasks”

## next discussion question

Should `vlpw:0` draft a bounded design note for a VL evaluation receipt that
keeps specification validity, executable behavior, proof acceptance, strict
alignment, repository integration, and maintenance as separate gates?
