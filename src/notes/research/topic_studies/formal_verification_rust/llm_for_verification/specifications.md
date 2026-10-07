specifications: what should the verified program do?
(authored by agents unless marked 🧑)

short version

- a proof checks the written requirement
  - it cannot establish that the requirement captures what the user wanted
- recent work tests specifications against valid and invalid behaviors
  - this can expose errors without solving a full equivalence proof
  - passing finite tests still leaves untested behavior uncertain
- recommended experiment: separate intended behavior from observed implementation behavior
  - compare specification generation with and without access to buggy implementations
  - measure whether the generated contract preserves the bug
- recommended experiment: test specification changes across an API's history
  - ask whether a contract catches later real bugs and still accepts legitimate changes

what we are asking

- an input condition says when a function may be called
- an output condition says which results are allowed
- a faithful specification accepts every intended behavior and rejects every unintended behavior
  - example: a sorting requirement must preserve the input elements as well as order the output
  - otherwise an implementation returning an empty list may satisfy it
- inference: there are two different specification tasks
  - describe what the current implementation does
  - express what the implementation should do
  - a buggy implementation makes these tasks disagree

build on the existing notes

- [KaPilot and the AutoVerus citation study](../../../autoverus_citations_20260801.md)
  - already covers implementation-blind generation, documentation provenance, vacuity checks, and passing-but-bad contracts
- [CryptoProver and LeetProof specification clarification](../../../cryptoprover_leetproof_spec_clarification_20260808.md)
  - already examines intent evidence and formal contracts
- [Vero](../../../vero_20260821.md) and [Proofs Promptly](../../../proofs_promptly_20260821.md)
  - already distinguish checked proofs from specification review
- the added question here is how to measure and improve specification quality independently of proof completion

executable specifications: Verus-SpecGym

- source: Agarwal et al., [Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization](https://arxiv.org/abs/2605.26457v1), 2026 preprint
  - primary PDF abstract and §§2–4 opened from the existing collection
- author claim: 581 Codeforces tasks evaluate generated Verus input and output conditions
  - quote, abstract: “581 specification-writing tasks”
- fact about the method: the evaluator executes generated predicates on official tests and adversarial Codeforces inputs
  - quote, abstract: “can be executed as Rust code”
- author claim: the strongest evaluated model solves 77.8% of tasks under the study's budget
  - quote, abstract: “solves 77.8% of tasks”
- author claim: an LLM judge misses 26% of failures detected by this evaluator
  - quote, abstract: “misses 26% of the failures”
- inference: the useful contribution is independent evidence about which behaviors a specification accepts
  - this is more informative than checking that one implementation satisfies it
  - finite tests establish neither universal agreement with intent nor complete rejection of incorrect behavior
- inference: Codeforces tasks offer clear expected outputs but omit many systems requirements
  - examples: ownership, concurrent interference, crash behavior, resource limits, and allowed environmental assumptions

symbolically checked examples: Coins

- source: Yang et al., [How Powerful are LLMs in Generating Formal Program Specifications?](https://arxiv.org/abs/2608.13077), 2026 preprint
  - current abstract and primary PDF opened; PDF saved in the collection
- fact about the method: Coins instantiates Rocq predicates on concrete positive and negative examples
  - quote, introduction: “instantiating them on concrete behaviors”
- author claim: the reference set contains all 164 HumanEval problems
  - quote, introduction: “All 164 ground-truth specifications were manually written and cross-reviewed”
- author claim: reported Coins scores range from 1.22% to 28.05% across evaluated models
  - quote, introduction: “28.05% for Gemini 3 Pro Preview to 1.22% for DeepSeek-V3.1”
- inference: a successful Rocq proof gives checked evidence for a particular example
  - a failed proof can mean a wrong predicate, insufficient automation, or exhausted resources
  - score generation quality separately from the ability to discharge these example obligations
- inference: this preserves a useful distinction between refutation and lack of evidence
  - a checked counterexample establishes a specification defect
  - a timeout establishes no such defect
- limit: human references and finite examples remain evidence about intent
  - their presence does not establish universal equivalence to an informal requirement

input and output mutation: Spec-Harness

- source: Misu, Ma and Lopes, [Spec-Harness: Measuring and Improving Behavioral Adequacy of LLM-Synthesized Formal Specifications](https://arxiv.org/abs/2604.00280v2), September 2026 preprint revision
  - opened the current abstract and primary PDF
  - the saved April note calls the earlier version VeriAct
  - VeriAct is a generator inside the revised study; Spec-Harness is the evaluator
- fact about the method: symbolic checks score valid inputs, invalid inputs, correct outputs, and modified incorrect outputs separately
  - quote, abstract: “precondition and postcondition correctness and completeness”
- author claim: adding evaluator feedback improves Claude Code's postcondition score on SpecGenBench from 49.2% to 63.3%
  - quote, §VI: “improves from 49.2% to 63.3%”
  - this is Post-Harness@0.75, not complete specification correctness
- author limitation: the evaluator omits some contract features
  - quote, construct validity: “frame conditions or exceptional postconditions”
- inference: rejecting input/output mutations is a useful training signal
  - its value depends on whether mutations represent plausible wrong behavior
  - one must report the mutation distribution and independent test cases

interprocedural generation: SpecSyn

- source: Ma et al., [SpecSyn: LLM-based Synthesis and Refinement of Formal Specifications for Real-world Program Verification](https://arxiv.org/abs/2604.21570), 2026 preprint
  - abstract and primary PDF §§4–6 opened
- fact about the method: decompose C programs and strengthen ACSL contracts using behavior-changing program mutations
  - quote, abstract: “semantic-non-equivalent program mutations”
- author claim: the resulting contracts discharge 1071 of 1365 target properties
  - quote, §5.3: “verification targets successfully proved by Frama-C/WP”
  - count from Table 3
- metric boundary: their precision counts generated specifications that can be verified
  - quote, §4.4: “percentage of verifiable specifications”
  - inference: this supports implementation consistency; it does not independently establish agreement with user intent
- author limitation: refinement adds substantial cost
  - quote, §6: “approximately 2.5 times longer than Preguss”
- inference: decomposition and mutation are established techniques
  - a new project needs a more specific contribution than combining an LLM with these techniques

internal assertions: SpecCoder

- source: Le-Anh, Le and Nguyen, [Teaching Code LLMs to Reason with Intermediate Formal Specifications](https://arxiv.org/abs/2607.04232v1), 2026 preprint
  - abstract and primary PDF method and evaluation opened
- fact about the method: train models to insert executable assertions at internal program points
  - quote, abstract: “executable checkpoint specification generation”
- author claim: for the 14B model, mutation rejection rises from 0.1989 to 0.7713
  - quote, evaluation: “from 0.1989 to 0.7713”
- inference: these are execution-tested assertions
  - they can help locate wrong intermediate states
  - they do not constitute universal proofs of the implementation
- author method boundary: reference programs first pass available tests
  - quote, method: “must pass all available tests”
  - inference: a tested reference can still contain an unexercised bug

research implications

- [candidate 2](research_directions.md) tests whether access to buggy code biases generated specifications
  - builds on implementation-blind KaPilot and behavior-based evaluators
- historical contract usefulness belongs in [candidate 1](research_directions.md)
  - use later real regressions and legitimate changes rather than only synthetic mutants
- Coins and Verus-SpecGym motivate a smaller measurement experiment
  - run checked example proofs and executable predicate tests on the same examples
  - retain timeout and unsupported translation as unknown
  - question: which proof failures reflect automation difficulty rather than a wrong specification?
  - Coins already identifies the issue; a new study needs a demonstrated evaluation benefit

scope and evidence

- primary sources opened on October 7, 2026 UTC
- current arXiv abstracts retrieved directly because the web search tool returned HTTP 404
- four additional PDFs saved with text and source provenance in the existing paper collection
- no benchmark reruns or reproduced model scores
- limited coverage of temporal specifications, separation logic contracts, and industrial requirements
  - these need further reading before any claim of an exhaustive specification survey
- [research directions](research_directions.md) records the combined recommendations and ChatGPT consultation
