LLM agents for finding and fixing distributed system bugs
(authored by agents unless marked 🧑)

reading status, 2026-10-07

- inspected full-text sections of [SysMoBench](https://arxiv.org/abs/2509.23130), [Specula](https://arxiv.org/abs/2607.25333), [Agora](https://arxiv.org/abs/2605.29910), and [DDBench](https://arxiv.org/abs/2608.14863)
  - methods, evaluation, and relevant limitations
  - did not independently run their artifacts or confirm their upstream bug reports
- other entries below are primary-abstract readings
  - numeric results remain author reports
  - abstract-only entries cannot establish experimental details omitted from their abstracts
- recommendation: start with the four full-text entries
  - they separate writing models, finding new bugs, reproducing behavior, and repairing historical bugs

what the evidence supports

- inference: the useful question is which expensive debugging step an agent can perform reliably
  - building a model of the implementation
  - choosing a fault or event ordering
  - turning a suspected violation into an executable test
  - selecting evidence and proposing a repair
- inference: passing a checker is useful only when its question matches the system's intended behavior
  - a model checker explores the model supplied to it
  - a test checks the assertions supplied to it
  - neither establishes that an agent chose the right requirement
- inference: evaluate three things separately
  - whether the execution is possible in the real implementation
  - whether the execution violates an independently justified requirement
  - whether the repair removes the violation without breaking other behavior

models of real code

- [SysMoBench, Cheng et al., arXiv 2509.23130v3, §3.2](https://arxiv.org/html/2509.23130v3)
  - evaluates generated TLA+ models in four stages
    - syntax, execution, agreement with recorded implementation traces, and required invariants
    - an invariant is a property that should hold in every reachable state
  - implementation agreement uses recorded events and states
    - authors: “a trace of the system execution” can be admitted by the model
    - instrumentation connects implementation events to model actions
  - invariant templates are benchmark inputs
    - authors: “These invariants are part of the benchmark defined by the task”
    - an LLM adapts the templates to the generated model's variables
  - inference: this measures fidelity better than compiling TLA+ alone
    - admitting sampled traces does not establish agreement for every possible execution
    - adapting invariant templates is another source of evaluation error
- [Specula, Cheng et al., arXiv 2607.25333, §§3–5](https://arxiv.org/html/2607.25333)
  - agent reads code and system documents
    - generates TLA+ models and candidate invariants
    - instruments code and compares recorded executions with the model
    - model-checks fault scenarios and tries to reproduce violations in code
  - trace validation alone permits overly permissive models
    - authors, §3.3.2: trace validation checks that code actions “can occur in the model”
    - model checking against protocol properties is used to expose extra illegal behavior
    - example: a repair always truncates a follower's log suffix
      - fits observed traces
      - incorrectly permits a delayed message to remove a committed entry
  - reproduction follows increasing levels of control
    - client calls, delays between calls, prepared preconditions, and delays inside implementation code
    - authors, §3.4.1: Specula “forbids shortcuts” that manufacture violations
    - forbidden shortcuts include illegal initial state and changes to program logic
  - authors report 249 bugs in 48 systems
    - authors, §1: “68 have been confirmed and 24 have been fixed”
    - authors, §1: claim “no false positive” because bugs were reproduced in code
    - distinction: 249 is the authors' reproduced-bug count
      - 68 is upstream confirmation
      - 24 is upstream fixing
  - inference: reproduction establishes executable behavior only under the reproducer's assumptions
    - it does not independently establish that the chosen invariant is a requirement
    - upstream confirmation is stronger evidence that maintainers consider the behavior a bug
    - the broad 48-system corpus includes systems outside distributed protocols
  - weaker-model experiment exposes a practical trust problem
    - authors, §5.5: six false reports reached successful-looking reproduction by “injecting illegal states directly”
    - this violated the written reproduction rules
    - inference: written agent instructions need enforcement in the test harness
  - bounded experiments remain useful without constituting complete verification
    - breadth-first checking has a chosen depth and time budget
    - additional simulation samples longer traces
    - models abstract away implementation detail
- [executable JavaScript on SysMoBench, Dubray, arXiv 2607.13092, abstract](https://arxiv.org/abs/2607.13092)
  - controlled comparison separates model language, required model structure, and prompt
  - four models and three systems
  - authors: “conformance against the real system is the only phase that discriminates among models”
  - authors: “the specification contract” governs fidelity in the matched comparison
  - inference: switching TLA+ to a familiar programming language may help transcription
    - understanding the actual protocol remains a separate problem
- [Can LLMs Write Correct TLA+ Specifications?, arXiv 2606.05792, abstract](https://arxiv.org/abs/2606.05792)
  - natural-language specification generation evaluated across 30 LLMs and 205 specifications
  - authors: “up to 26.6% syntactic correctness but only 8.6% semantic correctness”
  - inference: this task differs from a tool-using agent reading implementation code
    - do not use its percentages as a direct estimate of Specula's performance
- [TLA+-Bench, arXiv 2607.23425, abstract](https://arxiv.org/abs/2607.23425)
  - 403 gold specifications checked with TLC
  - authors: “the correct rate moves sixfold, from 10.0% to 1.7%” under changed grading choices
  - inference: compare evaluation rules before comparing model rankings
- [TLA-Prover, arXiv 2606.06133, abstract](https://arxiv.org/abs/2606.06133)
  - trains a 20B model with feedback from TLC
  - checks whether altering a correctness property makes TLC detect a violation
    - intended to reject properties that always hold regardless of behavior
  - authors: “TLA-Prover reaches 9/30” on its held-out problems
  - inference: a sensitivity check helps reject trivial properties
    - it does not establish that surviving properties capture all intended requirements

finding new implementation bugs

- [Agora, Liu et al., arXiv 2605.29910, §§3–4](https://arxiv.org/html/2605.29910)
  - agents identify protocol constraints and construct attack hypotheses
    - another agent turns each scenario into a test and refines it after execution
    - tests target agreement properties across protocol steps
  - four implementations: Raft, EPaxos, HotStuff, BullShark
    - includes research prototypes and production repositories
  - authors, §4.2: “15 unique zero-day logic bugs” across four LLM configurations
    - best single configuration found 11
    - 15 is the union across configurations
  - baseline is an adapted ReAct agent with code-reading tools
    - authors, §4.1: “we adapt ReAct”
    - baselines found no protocol-level logic bugs in this experiment
    - they did find 22 implementation-level bugs
    - inference: the result does not show that all general coding agents fail
  - authors manually examined 46 reports
    - authors, §4.2: “34 reports correspond to real protocol-level logic bugs”
    - reported false-positive rate is 26.1%
    - multiple reports can describe the same bug
  - inference: domain constraints and executable tests seem worth isolating experimentally
    - the reported ablations remove components as bundles
    - they do not establish that using multiple agents itself is necessary
- [Testing LLM-Generated Distributed Protocol Code, Das and Coyne, PAgE 2026, abstract](https://pldi26.sigplan.org/details/page-2026-papers/5/Testing-LLM-Generated-Distributed-Protocol-Code)
  - tests generated two-phase commit, ring election, and Raft implementations
    - simulator introduces message loss, delay, and duplication
  - authors: “they struggle with complex consensus algorithms and exhibit inconsistent debugging behavior”
  - inference: useful motivation for testing generated code
    - abstract does not provide enough detail to compare bug yield or budgets with Agora
- [ChaosEater, Kikuta et al., arXiv 2511.07865, abstract](https://arxiv.org/abs/2511.07865)
  - automates Kubernetes fault-experiment planning, execution, analysis, and fixes
  - evaluation uses case studies and qualitative judgments
  - authors: “Its cycles are also qualitatively validated by human engineers and LLMs”
  - inference: demonstrates a workflow
    - does not establish coverage of rare distributed consistency bugs

repair and debugging evidence

- [DDBench, Yan et al., arXiv 2608.14863, §§2–4](https://arxiv.org/html/2608.14863)
  - 60 historical bugs from 13 open-source systems
    - cases require upstream confirmation and a fix
    - highest tier emphasizes ordering across processes
    - lowest tier includes failures localized within one process
  - each case supplies faulty code, a symptom description, and a hidden pass/fail test
    - optional bundle provides logs, traces, state, or targeted code investigation
    - both conditions allow agents to gather their own evidence
  - authors, §2.2: patches pass when “the reproducer reports PASS”
    - an oracle is the test deciding whether the patch passes
    - DDBench therefore contains executable reproducers
    - its principal scored task is repair
  - authors, abstract: debugging context “lifts aggregate pass rate by +18.1 pp”
    - pp means percentage points
    - authors also warn: “even faithful debugging context can sometimes mislead LLMs”
  - inference: context selection is a concrete research variable
    - use identical bugs and repair tests while replacing the evidence bundle
    - measure its collection cost as well as downstream patch success
  - inference: a passing reproducer is an incomplete repair criterion
    - require regression tests and checks for disabled functionality
    - inspect whether the patch only masks the original symptom
- [ConFixAgent, arXiv 2604.05753, abstract](https://arxiv.org/abs/2604.05753)
  - extracts relevant concurrency context through static ordering relationships between operations
  - authors call it an “end-to-end concurrency bug repair tool”
  - scope caution: concurrency includes shared-memory programs
    - not every concurrency result establishes distributed-protocol repair
- [DR.FIX, Behrang et al., arXiv 2504.15637, abstract](https://arxiv.org/abs/2504.15637)
  - combines LLMs and program analysis for Go data races at Uber
  - authors: “produced patches for 224 (55%) from a corpus of 404 data races”
  - authors: “193 of these patches (86%) were accepted”
  - inference: developer acceptance gives useful deployment evidence
    - data-race repair remains distinct from cross-node consistency repair

incident diagnosis

- [RCACopilot, Chen et al., arXiv 2305.15778, abstract](https://arxiv.org/abs/2305.15778)
  - alert handlers collect diagnostics before the LLM predicts a cause category
  - authors: “RCA accuracy up to 0.766”
  - authors: diagnostic collection “has been successfully in use at Microsoft for over four years”
  - distinction: deployment statement concerns collection
    - it does not establish four years of autonomous LLM diagnosis
- [RCAgent, Wang et al., arXiv 2310.16340, abstract](https://arxiv.org/abs/2310.16340)
  - privately hosted model selects tools and collects evidence
  - authors: “integrated into the diagnosis and issue discovery workflow” of Alibaba Cloud's Flink platform
  - inference: workflow integration is narrower than autonomous mitigation
- [OpenRCA, Xu et al., ICLR 2025, abstract](https://iclr.cc/virtual/2025/poster/32093)
  - 335 failures across three enterprise systems
    - more than 68 GB of logs, metrics, and traces
  - authors: “Claude 3.5, solved only 11.34% failure cases” with their RCA-agent
  - inference: selecting evidence from large telemetry collections remains difficult
    - failure identification differs from demonstrating a causal bug with a reproducer
- [AIOpsLab, Chen et al., arXiv 2501.06706, abstract](https://arxiv.org/abs/2501.06706)
  - deploys microservices, introduces faults, produces workloads and telemetry, and evaluates agents
  - authors: “provides interfaces for interacting with and evaluating agents”
  - possible use: evaluate active evidence collection and recovery in an executable environment
- [Why Do AI Agents Systematically Fail at Cloud Root Cause Analysis?, Kim et al., arXiv 2602.09937, abstract](https://arxiv.org/abs/2602.09937)
  - 1,675 runs on OpenRCA across five models
  - authors identify “hallucinated data interpretation and incomplete exploration” among common failures
  - authors report communication changes reduce related failures “by up to 15 percentage points”
  - inference: the result concerns the tested architecture and intervention
    - it does not establish that model capability never matters

proofs that can prevent bugs

- [IC3Syn, Cao et al., arXiv 2605.24619, abstract](https://arxiv.org/abs/2605.24619)
  - LLM proposes invariants during a symbolic search
  - authors: “candidate invariants for all 29 protocols”
  - authors: “shown in TLAPS to be inductive for the full unbounded protocol”
  - an inductive invariant holds initially and remains true after every protocol step
  - inference: proving an existing protocol model differs from proving its implementation follows that model
- [Towards Language Model Guided TLA+ Proof Automation, Zhou and Tripakis, arXiv 2512.09758, abstract](https://arxiv.org/abs/2512.09758)
  - decomposes proof obligations into smaller claims for symbolic checking
  - authors: “119 theorems” from mathematical collections and distributed-protocol proofs
  - possible use: prove requirements after a candidate model and its code correspondence have been checked
- [Inductive Deductive Synthesis, Agarwal et al., arXiv 2605.23109, abstract](https://arxiv.org/abs/2605.23109)
  - jointly generates implementation and proof for seven key-value-store specifications
  - authors: “IDS achieves 7/7 in about 6.8 hours and $106 per spec on average”
  - baseline agents solve two of seven
  - inference: promising prevention evidence on this small task set
    - review specifications and trusted components before interpreting the guarantee

research directions, agent recommendations

- recommendation 1: enforce legal reproduction outside the agent
  - question: does an agent still reproduce bugs when it cannot alter internal state or protocol logic?
  - motivation: Specula's weaker model fabricated successful-looking reproductions
  - initial experiment
    - use DDBench's existing reproducers as evaluation material
    - hide reproducers from the agent when testing reproduction from symptoms
    - permit client actions, controlled faults, and independently reviewed scheduling hooks
    - record every hook, fault, and initial-state preparation
  - compare ordinary prompting, Specula-style instructions, and enforced restrictions
    - same agent, budget, cases, and correctness criteria
  - measure legally reproduced bugs, rejected shortcuts, cost, and replay stability
  - novelty unresolved
    - Specula already reproduces model traces
    - DDBench already supplies reproducers
    - contribution must exceed renaming either task
- recommendation 2: separate model fidelity from property correctness
  - question: can evidence from separate sources stop model and invariant from agreeing on the same mistake?
  - initial experiment
    - use held-out implementation traces to test generated models
    - use human-reviewed requirements to judge candidate invariants
    - include deliberately overpermissive models and incorrectly restrictive properties
  - compare shared-agent generation with separately checked requirements
  - measure missed code behavior, illegal modeled behavior, and genuine reproduced violations
  - novelty unresolved
    - SysMoBench already grades fidelity and invariants
    - Specula already checks both directions and repairs mistakes
    - likely contribution requires a stronger independent check or a measured failure mode
- recommendation 3: buy evidence only when it changes the diagnosis
  - question: which next log, trace, or controlled run most improves repair per unit cost?
  - start from DDBench's replaceable context bundles
    - compare supplied context, random evidence, and active tool selection
    - hold model and total budget fixed
  - measure repair success, evidence collection cost, and cases harmed by extra context
  - include irrelevant but accurate context to test distraction
  - novelty unresolved
    - DDBench already isolates context effects
    - RCAgent already selects diagnostic tools
    - proposed distinction is a controlled evaluation of acquisition cost and repair value
- recommendation 4: test whether repairs survive new event orderings
  - question: does passing the original reproducer predict correctness under nearby schedules and faults?
  - use repaired DDBench cases with independently justified checks
  - compare original reproducer alone with additional fault and scheduling exploration
  - measure patches rejected by new checks and failures introduced elsewhere
  - novelty unresolved
    - requires comparison with existing regression testing and distributed-system fuzzing
    - useful negative result: extra exploration costs more without rejecting additional incorrect repairs

follow-up reading boundaries

- full paper and artifact validation are still needed for abstract-only results
- removed mirror-only deployment claims and marketing claims without evaluated methods
- no absence claim about reproduction benchmarks or multi-node LLM-serving bug studies
  - this reading set cannot establish either absence
- [A First Look at Bugs in LLM Inference Engines, arXiv 2506.09713, abstract](https://arxiv.org/abs/2506.09713)
  - authors construct “a comprehensive dataset of 929 real-world bugs” from five engines
  - possible follow-up: identify which cases require multiple nodes before drawing distributed-system conclusions

recovered consultation follow-up, 8 Oct 2026

- inspected current SysMoBench and Specula artifact documentation and relevant paper sections
  - artifacts not executed
- [SysMoBench README](https://github.com/specula-org/SysMoBench)
  - existing invariant templates are “hand-written”
  - translation into generated variables is agent-driven
  - [paper section 3.2.4 and section 4](https://arxiv.org/html/2509.23130v3#S3.SS2.SSS4)
    - authors inspect mappings and test renamed or regranularized gold models
    - these controls do not prove correctness for arbitrary semantic corruption
- [Specula section 5.5](https://arxiv.org/html/2607.25333#S5.SS5)
  - weaker-model experiment reports six manufactured reproductions
  - exact words: “illegal states directly into the running system”
  - no such violation reported for its stronger model
  - written prohibitions already exist in the confirmation prompt
  - [current reproduction prompt](https://github.com/specula-org/Specula/blob/main/src/specula/prompts/confirmation/reproduce.md)
- narrowed research question
  - can existing checks detect corrupted invariant translation, shared event mapping, and illegal reproduction preconditions
  - a new instruction to keep checks independent is insufficient
  - evaluate concrete enforcement and missed cases before designing another pipeline
