# procedure for evaluating vague-requirement verification tasks

(authored by agents unless marked 🧑)

This is a practical checklist for the task: a person gives a rough guarantee; an agent produces a precise specification, distributed model, implementation, and proof. Each check has a source pointer. “pass” means the evaluator established the check; “unknown” is not a pass.

## execution order and verdicts

1. task author freezes the request, interfaces, assumptions, hidden tests, budgets, and evaluator; save `task_packet.md`
2. evaluator records the submitted specification, model, code, proof, logs, toolchain, and hashes; save `receipt.md`
3. evaluator checks meaning with four-way examples, mutations, vacuity witnesses, and requirement-to-claim mapping; save `meaning.md`
4. evaluator checks distributed behavior and model-to-code correspondence; save `correspondence.md`
5. evaluator reruns the complete proof in a clean environment and audits trust and cheats; save `integrity.md`
6. evaluator checks liveness, fairness deletion, lasso counterexamples, and ranking evidence; save `liveness.md`
7. second reviewer independently inspects the request, assumptions, claims, and verdict evidence; save `review.md`
8. classify each property as `valid`, `valid with conditions`, `invalid`, or `unknown`; overall result is `valid` only when every required property is valid, integrity and correspondence pass, and no required check is unknown

Glossary: fairness means a continuously enabled action is eventually scheduled; a ranking function is a measure that must decrease until a goal; refinement means every concrete behavior matches an allowed abstract behavior; a lasso is a finite prefix plus a repeating cycle showing nontermination; vacuity means a claim passes because its premise never occurs; a mutation survivor is a changed implementation or model that the specification still accepts.

## freeze the task before judging

- record every sentence of the request and give each intended guarantee an id
  - source: `eval_and_cases/evaluation_plan.md`, “A task packet”
- write the environment and fault model separately
  - source: `eval_and_cases/evaluation_plan.md`, “Liveness needs an explicit assumption check”
- mark each assumption as human supplied, independently justified, or agent added
  - source: `lit_b/07_evaluation.md`, same section
- decide which questions the agent may ask and charge questions to its budget
  - source: `lit_b/07_evaluation.md`, “A task packet”
- freeze hidden tests, bad implementations, reference model, evaluator, tool versions, and budgets before runs
  - source: `lit_b/07_evaluation.md`, “A task packet”

## check that the specification means the request

- map every natural-language requirement to a formal predicate or temporal claim
  - source: `lit_b/07_evaluation.md`, “What should count as success”
- test required positive behaviors and forbidden behaviors with independently written examples
  - source: VERINA discussion in `lit_b/07_evaluation.md`
- check implication or equivalence against a reference specification when one exists
  - source: VERINA and CLEVER discussions in `lit_b/07_evaluation.md`
- reject impossible, vacuous, or self-assuming requirements
  - source: `eval_and_cases/evaluation_plan.md`, “Liveness needs an explicit assumption check”
- mutate transitions, message updates, recovery paths, and progress conditions; adjudicate survivors and exclude timeouts as unknown
  - source: `lit_b/07_evaluation.md`, “MutDafny: mutation survival needs adjudication”
- score four directions separately: valid outputs accepted, bad outputs rejected, valid inputs admitted, invalid inputs excluded
  - source: `lit_b/07_evaluation.md`, “Spec-Harness, formerly VeriAct”
- produce a reachable witness for every liveness premise; a never-triggered request is vacuous
  - source: `lit_b/07_evaluation.md`, “Vacuity Detection in Temporal Model Checking”
- delete each generated fairness or network assumption once and require the proof to fail or report the changed guarantee
  - source: `lit_a/findings2_eval.md`, “Liveness”
- test a no-op implementation, impossible precondition, always-true postcondition, and detached model
  - source: `eval_and_cases/evaluation_plan.md`, “Before a large campaign”
- check that valid behavior is not accidentally excluded
  - source: `eval_and_cases/evaluation_plan.md`, “Allowed behavior”
- keep finite test evidence separate from proved equivalence
  - source: VERINA discussion in `lit_b/07_evaluation.md`

## check distributed semantics

- enumerate messages, duplicates, reordering, loss, crashes, restart, persistence, and interference
  - source: `eval_and_cases/evaluation_plan.md`, “Implementation connection”
- test stale reads, lost updates, duplicate application, and crash-recovery mistakes
  - source: `eval_and_cases/evaluation_plan.md`, “Bad behavior rejection”
- check parameter domains, empty systems, and unbounded versus bounded participants
  - source: `analysis/REPORT.md`, parameter and finite-domain findings
- check that every source action has a corresponding implementation action and guard
  - source: `analysis/REPORT.md`, cross-language correspondence discussion
- check client-visible replies, persistent state, serialization, and runtime shims
  - source: `eval_and_cases/evaluation_plan.md`, “Implementation connection”

## check safety proofs

- replay the complete proof from a clean environment
  - source: `eval_and_cases/evaluation_plan.md`, “Proof integrity”
- enumerate axioms, external bodies, unverified APIs, unsafe operations, and excluded code
  - source: AutoVerus and VeruSAGE discussions in `lit_b/07_evaluation.md`
- search for `admit`, `assume`, weakened contracts, changed checker, and proof-only executable changes
  - source: AutoVerus and VeruSAGE discussions; `analysis/REPORT.md`
- run deliberate bad implementations and require the evaluator to reject them for the right reason
  - source: `eval_and_cases/evaluation_plan.md`, “Before a large campaign”
- distinguish proof acceptance from claim integrity and intent adequacy
  - source: CryptoProver and Vero discussions in `lit_b/07_evaluation.md`

## check liveness and fairness

- state the eventual event, its beneficiary, and whether the result must persist
  - source: `lit_b/02_liveness.md`
- state scheduler fairness, message-delivery fairness, crash recovery, and eventual stability
  - source: `eval_and_cases/evaluation_plan.md`, “Liveness needs an explicit assumption check”
- verify that the liveness antecedent can actually occur; reject premises that assume the conclusion
  - source: same section
- search for infinite fair executions that never complete
  - source: `eval_and_cases/evaluation_plan.md`, “Progress under stated conditions”
- check ranking functions, invariants, and enabledness of recurring actions
  - source: `lit_b/10_second_pass_liveness_proofs.md`, Lotan et al. discussion
- report unbounded eventuality separately from deadlines and finite bounds
  - source: `eval_and_cases/evaluation_plan.md`, “Liveness needs an explicit assumption check”
- concretize abstract counterexamples before calling executable behavior faulty
  - source: same evaluation plan section

## check model-to-code correspondence

- require an explicit observation mapping from executable states and events to model states and events
  - source: `eval_and_cases/evaluation_plan.md`, “Implementation connection”
- check traces independently, then seek a refinement theorem when possible
  - source: SysMoBench and IronFleet discussions in `lit_b/07_evaluation.md`
- include recovery, serialization, network wrappers, and scheduler behavior in the mapping
  - source: `analysis/REPORT.md`
- never call a model-only proof an end-to-end code proof
  - source: TLA-Verus discussion in `lit_b/summary_v2.md`

## check the evaluator itself

- run known-good artifacts and deliberate cheats before evaluating agents
  - source: `eval_and_cases/evaluation_plan.md`, “Before a large campaign”
- ensure timeout, unknown, incomplete proof, and infrastructure failure are separate outcomes
  - source: VERINA and SaltBench discussions in `lit_b/07_evaluation.md`
- use an evaluator outside the agent-writable workspace and rebuild from clean sources
  - source: Vero and SaltBench discussions in `lit_b/07_evaluation.md`
- have an independent reviewer assess intent, assumptions, and hidden-test quality
  - source: `lit_b/07_evaluation.md`, “What should count as success”

## report results honestly

- report separate scores for meaning, proof, integrity, correspondence, and cost
  - source: `lit_b/07_evaluation.md`, “What should count as success”
- give safety and liveness separate denominators
  - source: VeruSAGE discussion in `lit_b/07_evaluation.md`
- report finite evidence, model proof, and code-connected proof as different levels
  - source: `lit_b/summary_v2.md`, “How to evaluate”
- count human time, questions, retries, verifier calls, tokens, and failures
  - source: SaltBench and VeruSAGE discussions in `lit_b/07_evaluation.md`
- preserve all counterexamples and explain whether they expose intent, model, correspondence, or proof defects
  - source: `analysis/REPORT.md` and `eval_and_cases/REPORT.md`

## paper-level source map

The local notes above are pointers, not primary evidence. These papers are the primary sources behind the checks and should be cited when the procedure is used.

- IronFleet: Hawblitzel et al., “IronFleet: Proving Practical Distributed Systems Correct,” SOSP 2015, https://www.microsoft.com/en-us/research/publication/ironfleet-proving-practical-distributed-systems-correct/ — refinement layers, executable correspondence, and explicit linearizability specifications
- Fonseca et al., “An Empirical Study on the Correctness of Formally Verified Distributed Systems,” EuroSys 2017, DOI 10.1145/3064176.3064183 — integration and trusted-interface testing; reports 16 bugs
- Verdi: Wilcox et al., “Verdi: A Framework for Implementing and Formally Verifying Distributed Systems,” PLDI 2015, DOI 10.1145/2737924.2737958 — abstraction layers and refinement from handlers to network semantics
- Anvil: Sun et al., “Anvil: A Framework for Developing and Verifying Distributed Systems,” OSDI 2024, https://www.usenix.org/conference/osdi24/presentation/sun-xudong — temporal claims, eventual stability assumptions, and trusted API limits
- VeruSAGE: Yang et al., “VeruSAGE: A Study of Agent-Based Verification for Rust Systems,” arXiv:2512.18436 — proof completion, cheat detection, and temporal-logic tasks on real Rust
- AutoVerus: Yang et al., “AutoVerus: Automated Proof Generation for Rust Code,” OOPSLA 2025, DOI 10.1145/3720474 — frozen contracts, AST comparison, and unsafe proof candidates
- VERINA: Ye et al., “VERINA: Benchmarking Verifiable Code Generation,” ICLR 2026, arXiv:2505.23135 — specification soundness/completeness and unknown outcomes
- Vero: Ye et al., “Vero: Can AI Agents Build Formally Verified Software Repositories?”, arXiv:2608.13522 — clean reconstruction and specification-completeness limits
- SaltBench: Hickey, “SaltBench: A Referee-Gated Protocol for Measuring Method Effects in Machine-Checked Software Work,” arXiv:2609.11076 — external referee, frozen evaluation arms, budgets, and censored outcomes
- TLA-Verus: Strelbytska et al., “TLA-Verus: Verifying TLA+ Specifications in Verus,” OpenReview, https://openreview.net/forum?id=ncFIZuIUyK — model proofs and the unresolved implementation-refinement gap
- Specula: “Specula: ...” arXiv:2607.25333 — evaluator reward-hacking examples where unreachable states fake bugs
- Lotan et al., “Implicit Rankings for Proving Liveness,” TACAS 2026, https://www.wisdom.weizmann.ac.il/~padon/timers-tacas2026.pdf — ranking functions, invariants, and fairness ingredients for liveness

## additional checks from review A primary sources

- require solver-generated invariants to be inductive, not merely true on sampled states
  - source: Cao et al., “Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models,” arXiv:2605.24619
- require liveness claims in Byzantine settings to state failure scenarios and connect the abstract protocol to executable code
  - source: “Shipwright: Proving liveness of distributed systems with Byzantine participants,” arXiv:2507.14080
- audit code against the external specification rather than judging code behavior alone
  - source: “Beyond Code Reasoning: Specification-Anchored Auditing of Multi-Implementation Distributed Protocols,” arXiv:2604.26495
- grade natural-language-to-specification output by execution-grounded behavior, not text resemblance
  - source: “TLA+-Bench: An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA Specification Generation,” arXiv:2607.23425
- record delivery and environment assumptions separately from the theorem
  - source: “Formal Verification of Digital Twins with TLA and Information Leakage Control,” arXiv:2411.18798
- turn ambiguous protocol documents into candidate properties, then filter them with formal checks and timing evidence
  - source: “F LAG: Formal and LLM-assisted SVA Generation for Formal Specifications of On-Chip Communication Protocols,” arXiv:2504.17226
- use counterexamples from equivalence checking to revise specifications, while reporting bounded-feedback failures
  - source: “SpecLoop: An Agentic RTL-to-Specification Framework with Formal Verification Feedback Loop,” arXiv:2603.02895
- test specification synthesis on mutations and strength regressions, not only verifier acceptance
  - source: “SpecSyn: LLM-based Synthesis and Refinement of Formal Specifications for Real-world Program Verification,” arXiv:2604.21570
- evaluate repository-level proof retrieval against proof obligations that are not in the prompt context
  - source: “RAG-Verus: Repository-Level Program Verification with LLMs using Retrieval Augmented Generation,” arXiv:2502.05344
- require counterexample-guided repair to preserve the original contract while removing the reported defect
  - source: “ExVerus: Verus Proof Repair via Counterexample Reasoning,” arXiv:2603.25810
- include adversarial specification tasks and score semantic alignment separately from proof completion
  - source: “Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization,” arXiv:2605.26457
- measure whether requirement formalization preserves unstated but necessary constraints from unstructured text
  - source: “Towards an Agentic LLM-based Approach to Requirement Formalization from Unstructured Specifications,” arXiv:2604.18228
- check that visualization, digest, and repair tools expose counterexamples rather than silently rewriting the model
  - source: “ModelWisdom: An Integrated Toolkit for TLA+ Model Visualization, Digest and Repair,” arXiv:2602.12058
- validate recorded executions against the abstract state machine, while labeling this as bug-finding evidence rather than a proof
  - source: Konnov et al., “Validating Traces of Distributed Programs Against TLA+ Specifications,” arXiv:2404.16075; the paper states, “this approach does not provide formal correctness guarantees”
- require a formal refinement relation from the abstract event model to executable code when claiming end-to-end correctness
  - source: Sprenger et al., “Igloo: Soundly Linking Compositional Refinement and Separation Logic for Distributed System Verification,” arXiv:2010.04749; abstract: “successful verification establishes a refinement relation between the model and the code”
- check that parameterized and modular abstractions preserve the application properties being claimed, rather than only the agreement primitive
  - source: Jaber et al., “QuickSilver: Modeling and Parameterized Verification for Distributed Agreement-Based Systems,” arXiv:2004.04613; abstract describes abstractions of verified agreement protocols and application case studies
- require refinement to preserve liveness under an explicit fair-scheduling assumption, not only safety traces
  - source: Timany et al., “Trillium: Higher-Order Concurrent and Distributed Separation Logic for Intensional Refinement,” arXiv:2109.07863; abstract describes fair liveness-preserving refinement and refinement to TLA+ models
- require an explicit well-founded progress argument or sound implicit ranking; checking safety invariants alone is insufficient for eventuality
  - source: Lotan and Shoham, “Implicit Rankings for Verifying Liveness Properties in First-Order Logic,” LNCS 2025, DOI 10.1007/978-3-031-90643-5_20
- check that the refinement logic itself preserves liveness across distributed abstraction layers, including higher-order state and scheduling assumptions
  - source: Hinrichsen et al., “A Higher-Order Separation Logic for Verifying Liveness-Preserving Refinements of Distributed Systems,” HAL:hal-05647709 (2026)
- require the Rust refinement proof to cover both safety and liveness despite concrete data representations and program structure
  - source: Bílá et al., “Refinement Proofs in Rust Using Ghost Locks,” arXiv:2311.14452
- record which abstract variables are omitted from traces and treat the resulting verdict as conditional on reconstructed information
  - source: Konnov et al., arXiv:2404.16075; the paper describes incomplete traces and TLC reconstruction
