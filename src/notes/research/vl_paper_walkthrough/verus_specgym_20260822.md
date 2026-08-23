# Verus-SpecGym: executable evaluation of specification faithfulness

(authored by agents unless marked 🧑)

- paper
  - Anmol Agarwal, Natalie Neamtu, Pranjal Aggarwal, Seungone Kim,
    Jannis Limperg, Cedric Flamant, Kanna Shimizu, Bryan Parno, and Sean Welleck
  - *Verus-SpecGym: An Agentic Environment for Evaluating Specification
    Autoformalization*
  - arXiv `2605.26457v1`, submitted 2026-05-26
  - 58-page author preprint
  - archival record: <https://arxiv.org/abs/2605.26457v1>
  - full text: <https://arxiv.org/pdf/2605.26457v1>
  - code and benchmark named by the paper:
    <https://github.com/formal-verif-is-cool/verus-spec-gym>

## decision

- walkthrough rank: sixth of the 23 accepted canonical papers
  - canonical ID:
    `vpsd_70efd668cd7a5dee4a7eab0365f3c67c43ae18c36b138221014c3a9f16a1f7c3`
  - ranks one through five cover verified-data scaling, repository-aware proof
    completion, repository retrieval, production-library proof and internal-spec
    synthesis, and verifier-grounded self-play
  - Verus-SpecGym comes next because it targets the unresolved prerequisite
    shared by those systems: whether a formal contract matches informal intent
- confidence
  - high on paper identity, method, reported measurements, and full-text coverage
  - medium on generality and absolute specification correctness
    - evidence is limited to single-file Codeforces problems expressed in Verus
    - finite tests find counterexamples but cannot prove semantic equivalence
    - no benchmark, code, or VL experiment was run for this walkthrough

## evidence boundary

- this walkthrough used the complete authenticated 58-page v1 preprint
  - formal setup and executable evaluator in section 2
  - benchmark construction and agent environment in section 3
  - model results and analysis in section 4
  - related work and limitations in sections 5 and 6
  - evaluator implementation, data filters, ablations, case studies, and full
    agent prompt in appendices B through H
- claims below are paper claims unless labeled inference or recommendation
- the saved PDF, layout-preserving extraction, and provenance record match the
  checksums recorded at the end of this note
- historical intake work established relevance only
- metadata outside the authenticated paper and provenance record was not used

## direct answer

- what the paper contributes
  - `Verus-SpecBench`
    - 581 natural-language-to-Verus specification tasks
    - derived from Codeforces programming problems
    - asks an agent to fill `pre_spec` and `post_spec` in a fixed skeleton
  - `Verus-SpecGym`
    - an interactive SWE-agent environment
    - exposes Verus, a shell, files, documentation, source, examples, visible
      tests, evaluator source, and iterative feedback
    - hides the larger final test suite
  - an evaluator for specification faithfulness
    - first asks Verus to prove the candidate's verdict on a concrete case
    - if symbolic proof is inconclusive, compiles a supported subset of the
      specification to Rust and executes it
    - tests four independent directions of disagreement with informal intent
  - a semi-automatic data pipeline
    - converts official Codeforces tests and human-written hacks into typed
      Verus/Rust testcases
    - verifies that parsing and printing reproduce each retained testcase
      byte-for-byte
- central distinction
  - code verification proves that code follows a formal specification
  - specification evaluation asks whether that formal specification represents
    the behavior the user actually requested
  - a verifier cannot establish the latter merely by accepting code and proof

## four-dimensional evaluator

- precondition completeness
  - valid inputs must be accepted
  - catches specifications that invent extra input restrictions
- precondition soundness
  - invalid but syntactically well-formed inputs must be rejected
  - catches missing ranges, structural constraints, and global promises
- postcondition completeness
  - every correct input-output pair must be accepted
  - catches specifications that reject permitted witnesses or overconstrain an
    exact answer
- postcondition soundness
  - incorrect outputs for valid inputs must be rejected
  - catches omitted feasibility, provenance, optimality, or semantic conditions
- acceptance rule
  - one candidate passes only if every testcase in every bucket has the expected
    Boolean result
  - completeness-only success is therefore not treated as faithfulness

## symbolic and executable resolution

- for one concrete testcase, the evaluator
  - asks Verus to prove acceptance
  - if that fails, asks Verus to prove rejection
  - if both are inconclusive, translates the candidate with
    `exec_spec_unverified!`, compiles it, and evaluates it as Rust
  - records accept or reject via symbolic proof, accept or reject via execution,
    compile/syntax failure, or indeterminate execution
- why the fallback matters
  - richer postconditions are often hard for SMT to decide on concrete examples
  - execution supplies a deterministic answer when translation and runtime
    evaluation succeed
  - the paper reports that at least one evaluated model produced an
    exec-compatible all-test-passing specification for at least 86 percent of
    benchmark problems
- supported executable fragment
  - primitive integers, Boolean and logical operations, conditionals, matches,
    recursion, strings, options, and user-defined structs and enums
  - selected sequence, map, set, and multiset operations
  - bounded multi-variable universal and existential quantification
- trust boundary
  - `exec_spec_unverified!` omits the proof that generated Rust corresponds to
    the Verus specification
  - overflow, nontermination, or precondition failures can instead surface as
    runtime errors
  - this is an evaluation instrument, not verified executable code for a client
  - inference
    - VL should record symbolic and executable outcomes separately and must not
      describe an unverified translation as a proof-preserving compiler

## benchmark construction

- source pool
  - 10,000 Codeforces problems from contests through December 2025
  - official tests provide valid inputs and accepted outputs
  - participant hacks provide human-designed adversarial cases against real
    submissions
- filtering
  - removes pre-hack-era problems and floating-point tasks
  - discards duplicates, truncated cases, and incomplete metadata
  - separates malformed text from semantically invalid input
    - malformed text fails before `pre_spec` and is not useful semantic evidence
  - requires at least five retained cases in every bucket
  - caps each bucket at 200 cases by random sampling
  - balances the final 581 tasks across difficulty and topic tags
- conversion integrity
  - a construction agent writes a raw-text parser and a printer
  - every retained input and output must round-trip byte-for-byte
  - a failed round trip returns to the agent for repair or causes the attempt to
    be discarded
  - fixed typed data structures are then supplied to the evaluated agent
- test volume
  - average cases per problem
    - 21 pre-soundness
    - 80 pre-completeness
    - 55 post-soundness
    - 78 post-completeness
  - median cases per problem
    - 12, 97, 29, and 93 in the same order
  - problems range from Codeforces rating 800 to 2700
    - median 1200
    - mean 1289
- agent exposure
  - three visible samples come only from completeness buckets
  - no soundness case is shown before submission
  - final scoring uses the visible cases plus the larger hidden suite

## full-paper results

- end-to-end Pass@1 under a `$2.5` per-problem cap and 75-minute timeout
  - gemini-3.1pro: 77.8 percent
  - gpt5.3-codex: 57.8 percent
  - opus4.6: 51.1 percent
  - deepseek-v4pro: 24.3 percent
  - glm-5.1: 21.5 percent
  - kimi-k2.6: 25.5 percent
  - open models additionally receive a 400-step limit
- completeness is materially easier than full evaluation
  - gpt5.3-codex falls from 76.6 to 57.8 percent when soundness tests are added
  - opus4.6 falls from 58.7 to 51.1 percent
  - gemini-3.1pro falls from 82.4 to 77.8 percent
  - inference
    - checking only known-good examples systematically hides permissive specs
- specification generation is distinct from code generation
  - among 187 uniquely evaluable problems where gpt5.3-codex wrote a failing
    specification and a code-generation run was available, its Python program
    passed on 153, or 81.8 percent
  - this is a selected subset, not a comparison over all 581 tasks
- repeated attempts reveal brittleness
  - three gpt5.3-codex runs solve 57.8, 55.9, and 56.6 percent individually
  - their union solves 439 of 581, or 75.6 percent
  - only 202 of 581, or 34.8 percent, pass in all three attempts
  - model ensembles also help
    - the three closed models jointly solve 486 of 581
    - only 214 are solved by all three
- difficulty effect
  - gemini-3.1pro falls from 90 percent in the 600–900 bucket to 50 percent at
    2400–2700
  - gpt5.3-codex falls from 73 to 27 percent over the same endpoints
  - the hardest buckets are small, so their estimates are noisier

## judge comparison and testcase ablation

- same-model LLM judge
  - experiment covers 527 compile-clean gpt5.3-codex specifications
  - the testcase evaluator rejects 191
  - the gpt5.3-codex judge calls 49 of those 191 correct
  - its false-acceptance rate on benchmark-rejected cases is therefore 25.7
    percent
  - the judge also rejects 26 of the 336 benchmark-accepted candidates
  - boundary
    - the finite testcase suite is a stronger counterexample finder here, not a
      complete oracle for true semantic faithfulness
- testcase-budget analysis
  - this is an exact retrospective uniform-subsampling calculation, not new
    model evaluation
  - detection improves sharply with the first diverse cases and then flattens
  - postcondition completeness saturates slowest, around 50–75 cases in the
    plotted analysis
  - inference
    - diversity and adversarial relevance matter more than raw testcase count
    - apparent convergence within known cases does not rule out unseen failures

## failure modes

- missing input assumptions
  - two frontier models encode per-rectangle coordinate bounds for Codeforces
    1028C but omit the global promise that some `n - 1` rectangles intersect
  - that promise is also needed by a downstream correctness proof
- postconditions that are too weak
  - gpt5.3-codex uses “not both even” instead of coprimality for Codeforces 1051B
  - on Codeforces 1027C it checks rectangle feasibility but omits the required
    optimum
  - kimi-k2.6 checks equal side pairs without proving that sides came from the
    input or minimize the objective
- postconditions that are too strong
  - gemini-3.1pro writes a large interval-union computation for Codeforces 2074D
    that rejects correct outputs, including small cases whose answers are 13
  - opus4.6 passes with a simpler column-wise characterization
  - inference
    - a specification should state the simplest mathematical relation that
      captures intent, not reimplement a fragile algorithm when avoidable
- language and tool failures
  - weaker models often leave the supported Verus or executable-spec fragment
  - a benchmark score combines semantic formalization skill with syntax,
    verifier, and agent-tool competence

## what was already done

- verified code and proof generation
  - AutoVerus, VeruSAGE, AlphaVerus, and PSV primarily assume a supplied formal
    specification or evaluate verification relative to one
  - they do not establish that a supplied or generated contract matches human
    intent
- specification generation
  - earlier Dafny work translated natural language to methods and contracts
  - SpecGen and AutoSpec synthesized specifications for Java and C
  - MSG used an agent architecture for Move specification generation
- specification-faithfulness evaluation
  - Endres et al. and Lahiri evaluated generated postconditions with mutants or
    related artifacts
  - Clover reconstructed code to detect weak specifications
  - VERINA compared soundness and completeness against formal references
  - concurrent VeriAct uses multi-axis Hoare-triple harnesses
- Verus-SpecGym's defensible increment
  - natural-language-to-Verus specification tasks in an interactive environment
  - reference-specification-free evaluation across pre/post and
    soundness/completeness directions
  - executable specifications plus real human adversarial hacks
  - a scalable construction pipeline with round-trip conversion checks
- boundary against completed VL walkthroughs
  - Formal Disco and PSV scale verifier-accepted training data
  - KVerus and the LMPL work retrieve context and complete repository proofs
  - CryptoProver generates internal specs and proofs beneath human-fixed public
    contracts in production cryptographic libraries
  - Verus-SpecGym isolates semantic contract evaluation but does not demonstrate
    repository-scale intent discovery, production integration, or proof upkeep

## what VL should learn

- make contract evaluation a first-class stage before proof or training reward
  - parse and type-check
  - reject vacuity, trusted shortcuts, and contract weakening
  - test preconditions and postconditions in both directions
  - then use verification to judge code relative to the surviving contract
- preserve four separate scores
  - a single pass rate hides whether a contract is permissive or restrictive
  - soundness failures create false assurance
  - completeness failures reject correct implementations and waste proof effort
- turn repository evidence into adversarial cases
  - valid behavior from regression tests, traces, and accepted implementations
  - invalid input from violated invariants and caller obligations
  - invalid output from historical bugs, mutants, review findings, and rejected
    patches
  - keep the origin, expected polarity, and human rationale for every case
- use deterministic evidence before LLM judgment
  - parsers, round trips, type checks, differential execution, mutants, and
    verifiers should decide what they can
  - an LLM can triage gaps but should not be the sole semantic acceptance gate
- distinguish three mappings
  - raw artifact to typed logical value
  - logical specification to executable predicate
  - informal requirement to expected accept/reject label
  - each mapping needs its own provenance and failure record
- design for unresolved semantics
  - finite tests can falsify a contract but cannot prove equivalence to intent
  - conflicts among requirements, callers, tests, documentation, and examples
    require an explicit human decision or a recorded unresolved state

## recommended VL integration

- immediate design direction
  - add a specification-admission record with four independent verdicts
  - require at least one positive and one negative evidence source for every
    material contract clause
  - generate named mutants for missing bounds, missing global invariants,
    omitted optimality, wrong witness provenance, and overstrong equality
  - preserve both symbolic and runtime counterexamples as durable receipts
  - prevent proof generation and verified-data training from treating a merely
    parseable or satisfiable contract as semantically admitted
- strengthen beyond the paper
  - construct cases from repository history and interfaces, not only contest I/O
  - check multi-function state transitions, aliasing, errors, concurrency, and
    environmental assumptions
  - freeze executable code and approved contract portions while evaluating a
    proposed contract change
  - measure mutation score, clause coverage, evidence diversity, unresolved
    cases, and human reversals in addition to test pass rate
  - validate the specification-to-executable translation or keep its evidence
    explicitly non-proof-bearing
- separate authorization required
  - any implementation in VL
  - running Verus-SpecGym or reproducing its model scores
  - acquiring or transforming new benchmark data
  - changing VL's product claims or acceptance policy

## product threat

- overall: high strategic threat and medium current substitution threat
- high capability threat to VL's semantic-evaluation layer
  - the paper supplies a concrete agent environment, executable evaluator, four
    failure dimensions, adversarial data source, and scalable conversion method
  - the 77.8 percent best-model score shows substantial current capability
  - the 34.8 percent three-run consistency for gpt5.3-codex shows the task is not
    reliably solved
- high prior-art threat
  - generic claims to multi-axis, gold-spec-free, adversarial evaluation of
    natural-language-to-Verus specifications are weak novelty anchors
  - the strongest differentiation must move to repository intent, provenance,
    change governance, validated translation, and longitudinal maintenance
- medium-high implementation threat
  - the paper names a public code and benchmark repository
  - the method is concrete enough for competitors to reproduce or extend
  - this walkthrough did not authenticate or run that code artifact
- medium current substitution boundary
  - only single-file competitive-programming tasks are evaluated
  - fixed data types and evaluator scaffolding remove repository discovery and
    integration work
  - test suites provide counterexamples, not proof of complete faithfulness
  - no evidence covers evolving multi-file systems, stakeholder conflict,
    security policy, maintainability, or production acceptance
- rank-six rationale
  - it addresses a more foundational trust boundary than proof success alone
  - it follows the first five because those papers more directly establish VL's
    data, proof-completion, repository, production, and training competitive
    boundaries
  - its correct urgency is to harden semantic admission before scaling later
    proof and training loops, not to displace the earlier operational priorities

## source anchors

- purpose, abstract
  - “whether language-model agents can translate informal programming problems
    into faithful formal specifications”
- formal target, section 2.1
  - “the goal is to generate a formal specification sF such that RsF = RsI”
- evaluation limit, section 2.2
  - “passing them provides evidence that the specification is faithful”
- executable-translation boundary, appendix C.1
  - “exec_spec_unverified! skips the proof generation step”
- data integrity, section 3.1
  - “The parser is accepted only if every retained testcase round-trips”
- semantic failure, section 4.2
  - “the model can often write correct executable code while still failing to
    write a faithful formal specification”
- judge result, section 4.3
  - “the LLM judge failed to identify errors in 25.7% of the incorrect
    specifications”
- paper limitation, section 6
  - “finite test suites can expose many specification errors, but they cannot
    rule out all possible errors”

## authenticated local sources

- PDF
  - `/hdd1/sichanghe/paper_collection/Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization, arXiv, 2026.pdf`
  - SHA-256:
    `4865494ceedf3da946cc5970d1815b5b534ac0f6793a50dfdf196dca6ec4560d`
- full `pdftotext -layout` extraction
  - collection evidence directory, same title with `.txt`
  - SHA-256:
    `c920b3eb40648be0a24c04a04893d0cfc9b4a2a36fd3b79d193f293e08a2b3f1`
- provenance record
  - collection evidence directory, `source-provenance.md`
  - SHA-256:
    `53ebebf322488e060a77c8c7bd9a4c9654f7ae91bc1cc0e76dccc115c8634061`
