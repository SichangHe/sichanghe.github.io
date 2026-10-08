LLM verification benchmarks and what a passing result means
(authored by agents unless marked 🧑)

main point
- inference: a verifier pass establishes a relationship between a program and a formal statement
  - evaluating whether that statement expresses the required behavior needs separate evidence
  - evaluating whether the proof used acceptable assumptions needs another check
- this note compares evaluation tasks and proposes studies
  - detailed LeetProof and CryptoProver trust analysis remains in [the existing specification note](../../../cryptoprover_leetproof_spec_clarification_20260808.md)
  - recent Verus papers remain in the October collection (local note; not yet published)
- scope: primary papers and released benchmark descriptions checked on October 7, 2026 UTC
  - paper results are author claims, not independently reproduced here
  - the normal web-search tool failed; direct arXiv pages and existing collected manuscripts supplied the sources

publication status

- miniF2F: arXiv comments report ICLR 2022 publication
- AutoVerus: arXiv comments report OOPSLA 2025
- DafnyBench, VERINA, CLEVER, and VeriContest are cited from opened arXiv manuscripts
  - later proceedings status was not independently established in this pass

compare the jobs before comparing scores
- miniF2F measures mathematical proof search across formal systems
  - Zheng, Han and Polu: “488 problem statements”
    - [paper abstract and §3](https://arxiv.org/abs/2109.00110)
  - the paper divides these into 244 validation statements and 244 test statements
    - paper table 1: “Test Set Validation Set TOTAL 244 244”
  - inference: useful for proof-search comparisons
    - does not establish ability to specify a program, model its state or preserve a Rust implementation
- DafnyBench measures restoring missing proof hints around supplied code and contracts
  - Loughridge et al., §3.2: “removed all of its hints”
    - [paper](https://arxiv.org/abs/2406.08467)
  - its 782 source programs include scraped GitHub programs and earlier benchmark translations
    - §3.1: “782 ground_truth stand-alone Dafny programs”
  - acceptance preserves preconditions and postconditions
    - §3.2: “preserves all preconditions”
  - inference: success measures proof assistance under supplied contracts
    - a preserved contract can still omit a required behavior
    - public-source programs create a contamination risk
    - do not equate its retry-based success rate with a one-attempt code-generation score
- VerusBench measures proof generation for small supplied Rust programs and Verus specifications
  - Yang et al., introduction: “150 non-trivial proof tasks”
    - [AutoVerus paper](https://arxiv.org/abs/2409.13082)
  - the tasks mainly translate Diffy, MBPP and CloverBench problems
    - paper introduction: “mainly translated from other benchmark suites”
  - inference: useful as a small, repeatable proof-repair baseline
    - high success leaves repository navigation, specification discovery and maintenance largely unmeasured
    - translation may change arithmetic, allowed inputs or behavior
- VERINA separates code, specification and proof generation in Lean
  - Ye et al., abstract: “189 manually curated coding tasks in Lean”
    - [paper and official evaluation-code links](https://arxiv.org/abs/2505.23135)
  - §3 describes positive and negative tests
    - exact claim: “100% line coverage on the Lean ground truth implementations”
  - inference: line coverage measures whether tests visit code
    - it does not prove that tests cover every behavior admitted by a specification
    - modular evaluation helps locate failures before measuring the whole pipeline
- CLEVER separates matching a hidden reference specification from generating a verified Lean implementation
  - Thakur et al., abstract: “161 problems”
    - [paper, v4](https://arxiv.org/abs/2505.13938v4)
  - its specifications avoid handing the implementation to the model
    - §3: “models can copy them into implementations and produce trivial proofs via rewriting”
  - inference: the restriction tests proof and specification reasoning beyond copying
    - a reference statement can itself be wrong
    - deliberately opaque statements can increase proof difficulty without increasing software relevance
    - executable specifications are useful engineering artifacts even when they make a benchmark easier
- VeriContest combines specifications, Rust code and Verus proofs on harder algorithm problems
  - Xie et al., abstract: “946 competitive-programming problems”
    - [paper](https://arxiv.org/abs/2605.08553)
  - positive and negative tests support specification evaluation
    - §3: “expose incomplete postconditions at scale”
  - appendix A distinguishes proof-based precondition comparison from test-based postcondition evaluation
    - exact explanation: “we use testing for postconditions”
  - inference: a passed specification score remains finite-test evidence for postconditions
    - it should not be reported as a proof that every invalid output is excluded
    - competitive-programming tasks provide algorithmic difficulty but leave persistent state, concurrency and API evolution outside their central task

newer tasks broaden the evidence
- VeruSAGE-Bench adds proof tasks from previously verified systems
  - Yang et al., introduction: “849 proof tasks extracted from eight open-source Verus-verified system projects”
    - [official benchmark](https://github.com/microsoft/verus-proof-synthesis/tree/main/benchmarks/VeruSAGE-Bench)
  - paper introduction: “stand-alone Rust file”
    - [collected manuscript](https://github.com/SichangHe/paper_collection/blob/main/VeruSAGE-%20A%20Study%20of%20Agent-Based%20Verification%20for%20Rust%20Systems%2C%20Chenyuan%20Yang%2C%20Natalie%20Neamtu%2C%20Chris%20Hawblitzel%2C%20Jacob%20R.%20Lorch%2C%20Shan%20Lu%2C%20arXiv%2C%202026/VeruSAGE-%20A%20Study%20of%20Agent-Based%20Verification%20for%20Rust%20Systems%2C%20Chenyuan%20Yang%2C%20Natalie%20Neamtu%2C%20Chris%20Hawblitzel%2C%20Jacob%20R.%20Lorch%2C%20Shan%20Lu%2C%20arXiv%2C%202026.md)
  - inference: realistic proof obligations with extracted dependencies are stronger evidence than toy functions
    - still differ from finding missing contracts and coordinating changes in the original repository
  - the current [official README](https://github.com/microsoft/verus-proof-synthesis/blob/main/benchmarks/VeruSAGE-Bench/README.md) separately lists 460 no-lemma tasks
    - helper declarations are removed, not merely their bodies
    - distinguish this variant from the paper's default supplied-lemma evaluation
- VeriStruct adds whole data-structure modules and generated abstractions
  - Sun et al., abstract: “eleven Rust data structure modules”
    - [paper](https://arxiv.org/abs/2510.25015)
  - inference: valuable module-level complement to isolated proof tasks
    - count module success separately from function success
    - inspect generated contracts and invariants before treating verification as requirement satisfaction
- the October Lean-backed VeriContest result adds a translation boundary
  - Serbanuta et al., §4.1: “This validated 658 of the 1007 specs”
    - [paper](https://arxiv.org/abs/2610.03994v1)
  - inference: the papers report 1007 and 946 tasks
    - their task-set relationship was not established
    - record versions instead of silently treating counts as interchangeable
    - Lean acceptance establishes the translated statement
    - source-to-target preservation needs separate evidence
    - see the existing collection (local note; not yet published) for the narrower test and manual-review coverage

direct audits show additional evaluation failures
- all three official abstracts and PDFs checked on October 7, 2026
  - selected method and evaluation sections read
  - results were not rerun
- [Faults in Our Formal Benchmarking, Ammanamanchi, Bhat, and Biderman, June 28, 2026](https://arxiv.org/abs/2606.29493)
  - fact: PDF reports ICML 2026, PMLR 306
  - authors' abstract: “398 mechanically certified issues”
    - 4,833 total checker findings across five benchmark families and their forks
    - total findings are not the same as independently confirmed defects
  - authors' §3.2: “Lean versions prior to 4.20.0”
    - an `apply?` frontend bug could report success without an ordinarily kernel-checked theorem declaration
  - authors' abstract: “defects can both inflate and deflate reported prover scores”
  - inference: correct formal statements and a sound kernel are insufficient when the harness accepts a frontend success report
    - rebuild and inspect the actual theorem artifact with a patched, pinned toolchain
    - report benchmark version and defect corrections alongside scores
- [miniF2F-Lean Revisited, Ospanov, Farnia, and Yousefzadeh, November 5, 2025](https://arxiv.org/abs/2511.03108)
  - status: arXiv preprint
    - peer-reviewed venue not established by this check
  - authors' introduction: “correct over 300 Lean 4 statements”
  - authors' introduction: “the formal statements in miniF2F”
    - “are often significantly simplified compared to the informal statements”
  - authors report that corrections can make previously simplified tasks harder and previously erroneous tasks provable
  - inference: multiplying separate formalization and proof scores does not establish end-to-end accuracy
    - the two components must agree on the statement actually required
    - evaluate the pipeline against the original problem with independent semantic review
  - limitation: the paper evaluates specified models and corrected benchmark variants
    - its aggregate accuracy is not a universal correction factor for miniF2F scores
- [NTP4VC, Xu, Luan, Wang, et al., January 28, 2026 revision](https://arxiv.org/abs/2601.18944v2)
  - first submitted January 26, 2026
  - status: arXiv preprint
    - peer-reviewed venue not established by this check
  - authors' §3.1: “syntax checking over the translation results”
    - “cross-validation by other experts”
  - these checks support over 2,400 expert-written translation rules across Isabelle, Lean, and Rocq
  - inference: the advertised semantic equivalence is supported by expert review
    - this passage does not establish a machine-checked translation-correctness theorem
  - authors' §3.2: “EXTRACTING CHALLENGING VCS”
  - benchmark deliberately selects and transforms verification conditions to challenge automated provers
    - half the 600 cases concern program-verification exercises
    - half concern real C verification
  - authors report only 2.08% pass@1 for the best evaluated language-specific model
  - inference: this reveals a hard obligation-solving task
    - it is not the expected failure rate on all obligations in an arbitrary production repository
    - retain the selection and transformation procedure when interpreting scores

evaluation protocol already studied locally

- use the existing SaltBench audit (local note; not yet published)
  - it examines pinned agent configurations, independent referees, and isolation failures
  - exact note judgment: “the registered result is about cost only”
  - recommendation: attach a correctness verdict to every priced run before interpreting a cost/quality tradeoff
- [existing verified-agent evaluation](../../../verified_agent_code_evaluation_20260808.md) distinguishes executable checks, proof validity, claim integrity, and intent
  - this chapter supplies the benchmark comparison rather than repeating that audit

what can make a success misleading
- recommendation: freeze the required behavior independently of the model generating the proof
  - preserve public contracts and executable behavior for proof-only tasks
  - judge generated contracts against required and forbidden behaviors for specification tasks
  - record unresolved ambiguity as unknown
- inference: weak postconditions allow incorrect results
  - example: preserving a list's length does not establish sorting
- inference: stronger preconditions can remove the troublesome inputs
  - example: requiring an already sorted list makes sorting easier but changes the job
- inference: contradictory assumptions make any conclusion provable
  - inspect assumptions, new axioms, skipped verification and admitted proofs
  - compare the accepted assumptions with a frozen task-specific allowance
- inference: consistency between generated code and generated tests is weak independent evidence
  - both may inherit the same misunderstanding
  - use separately constructed requirements and counterexamples
- inference: equivalence to a human reference establishes agreement with that reference
  - it does not establish agreement with English intent
  - the existing LeetProof audit documents reference defects and the distinction
- recommendation: distinguish a wrong statement from a proof search failure
  - a checked equivalence proof establishes equivalence within its assumptions
  - a concrete counterexample establishes a difference
  - a timeout establishes neither
- recommendation: measure comparable resources
  - report attempts, verifier calls, elapsed time, model tokens and cost
  - include failed attempts and repair work
  - freeze prompts and tools before testing
- recommendation: use project and time separation for held-out evaluation
  - hold out related functions, helper lemmas and translated versions together
  - record public-source exposure and development-set use
  - private or newly authored tasks reduce known leakage routes
  - do not claim they prove absence of contamination

research implications

- [candidate 1](research_directions.md) studies semantic preservation across software changes
- a contract-defect experiment must compare against Spec-Harness
  - authors, abstract: “using Hoare-triple based symbolic verification and input/output mutation”
  - [current paper](https://arxiv.org/abs/2604.00280)
  - possible remaining distinction: mutable Rust module state and invalid trusted helper assumptions
  - a general specification-mutation audit is already covered
- recommendation: blind human/model authorship during specification review
  - compare both against independently constructed valid and invalid behaviors
  - resolve differences with checked implications or concrete counterexamples where possible
  - keep unresolved cases separate from errors
  - builds on VERINA and the existing LeetProof trust audit
  - this is an evaluation recommendation, not an established research novelty
