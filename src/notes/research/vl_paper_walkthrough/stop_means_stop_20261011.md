# Stop Means Stop and the limits of verified agent controls
(authored by agents unless marked 🧑)

- paper
  - Sajjad Khan, *Stop Means Stop: Measuring and Repairing the Enforcement Gap in Agent-Framework Control Primitives*
  - [arXiv preprint 2607.14166v3](https://arxiv.org/abs/2607.14166v3), August 8, 2026
  - [saved PDF](</hdd1/sichanghe/paper_collection/Stop Means Stop: Measuring and Repairing the Enforcement Gap in Agent-Framework Control Primitives, arXiv, 2026.pdf>)
  - evidence below comes from the saved full paper
  - results are author reports
    - not independent reproductions

central lesson for VL
- a verified decision model gives useful assurance only when deployed actions follow its decisions
  - the paper states the mediation condition in section 5.1
    - “if every side-effecting operation performs its external action only after receiving release for its identity (run, key), then every execution satisfies P1–P4”
  - inference for VL
    - distinguish proving a model from proving deployed code and enforcing its assumptions

what it does
- probes approval, replay, cancellation and timeout behavior in six released agent frameworks
  - a leak means an action executes while another branch waits for approval
    - for example, a refund executes before the human can reject it
  - section 3 specifies versions and configurations
  - model-free probes isolate what scheduling permits
    - they do not measure how frequently ordinary users encounter a failure
  - section 4.2, table 5, reports 215 leaks in 1,200 live-model runs through LangGraph
    - four models, three selected leak-driving tasks, 100 runs per task
    - not a population-wide failure rate
    - conditional on the triggering plan being emitted, all emitted plans leaked
  - section 4.1 reports no benign-sibling trigger in 71 gated τ-bench batches across 431 tool turns
    - this is a different measurement from the selected leak-driving tasks
  - the abstract contrasts these with naturalistic τ-bench tasks
    - “models serialize writes—the everyday gap is latent”
- adds SoundGate, a Rust process that decides whether an external action may proceed
  - section 5.3 specifies four properties
    - hold approval-required actions until a decision
    - keep rejected actions refused
    - release a run and action identity at most once
    - refuse later submissions after run cancellation
  - effects must execute only after a release verdict
  - approval holds an action, not all sibling computation

what is verified
- section 5.5 and table 7 separate the evidence
  - Verus proves safety of the sequential admission model
    - 11 items verified, zero errors reported
    - standard-library collections and deployment transport remain trusted
  - TLC checks the concurrent abstract model over finite run and key sets
    - largest completed search reports 74,805,201 states
  - TLAPS proves invariants for arbitrary run and key sets
    - 68 obligations discharged
  - Loom checks bounded interleavings of the deployed Rust gate
    - three models, zero failures reported
- the deployed Rust is compared with an executable transcription of the model
  - 12 million operations across 200,000 randomized traces report zero divergences
  - a small exhaustive comparison reports 14,580 transitions
  - the author calls this “refinement evidence by differential testing”
    - “not a mechanized refinement proof”
  - inference
    - a statistical bound under the harness distribution does not establish arbitrary deployment correctness
    - correlated operations within stateful traces require care when interpreting a per-operation confidence bound

conditions and limits
- section 5.2 requires stable action identities across replay
  - a new identity on each retry defeats recognition of repeated logical actions
  - refusing repeated identities establishes at-most-once admission
    - it does not establish exactly-once external execution
- section 5.3 excludes reversal of already admitted actions
  - “it does not roll back an effect already released and in flight at an external service”
  - ChatGPT identified a tension with the broader operator contract in section 2.2, page 3
    - B4 says no further effects land after the caller observes cancellation
    - counterexample to that stronger reading
      - gate releases a payment
      - caller observes cancellation
      - remote service commits the previously released payment
    - inference
      - a fence against later gate admissions does not exclude that ordering
      - the paper states the limitation, but its broad repair wording needs this qualification
  - inference
    - cancellation is a barrier against later admissions, not a guarantee that previously admitted work stops
- section 5.5 requires durability and refusal when the gate is unreachable
  - replay and cancellation protection across restart require preserved gate state
  - optional durable operation records state changes before acknowledging them
    - “appends state-changing verdicts to a write-ahead log and fsyncs before acknowledging”
  - “if the gate is unreachable the wrapper must refuse rather than proceed”
- section 5.5 excludes eventual completion from the verified scope
  - “We treat liveness (every held effect is eventually decided or fenced) as out of scope for the gate”
- section 5.1 and table 6 distinguish deployment mechanisms
  - wrappers depend on developers routing all effects through the gate
  - a static linter misses dynamic dispatch and third-party internals
  - network namespaces and cgroup eBPF constrain network egress
  - filesystem, local communication and shared memory need additional confinement
    - the paper demonstrates seccomp restrictions and Landlock workdir rules
    - unconfined channels still depend on placement discipline
  - the approver and gate process remain trusted
  - a malicious submitter is outside the model
- the paper reports repairs for measured failures under these conditions
  - it does not establish correctness for every framework version or arbitrary tool

what was already done
- section 7 places SoundGate in the existing reference-monitor tradition
  - reference monitors decide whether actions may execute at an enforced boundary
  - idempotency, cancellation fences and durable logging are established techniques
- the paper contributes agent-framework probes, a shared admission design and layered evidence
  - its novelty is not discovering formal verification or deduplication
- the barrier argument permits an admission component inside a framework
  - section 5.1 describes external placement as an engineering choice
  - it does not prove that an external gate is the only possible repair

additional evidence limits
- section 6.4 reports 20 retail episodes per arm
  - all 20 submitted legitimate writes in the gate arm executed
  - rewards differed on eight paired episodes
  - inference
    - successful admissions do not establish equal overall task success
- framework version metadata differs within the paper
  - section 3.1 specifies CrewAI 1.15.11
  - section 6.1 describes CrewAI 1.15.1
  - unresolved
    - the paper alone does not establish whether this is a typo or different tested versions

what VL could adopt
- inference and recommendation
  - report model proof, code proof, conformance tests and confinement separately
  - test the behavioral contract around verified code
    - action replay
    - cancellation while work continues
    - approval racing with execution
    - admitted actions continuing after cancellation
    - forgotten wrappers and identity changes
  - retain counterexamples as regression tests
  - evaluate complete deployed changes
    - verifier acceptance alone misses model-to-code and deployment gaps
  - apply these lessons to VL orchestration design
    - no VL runtime change or experiment follows automatically from this note

product threat
- inference
  - adjacent infrastructure overlap
    - the paper provides a Rust admission component backed by model proofs and code-conformance checks
    - it may compete with a feature that promises enforceable agent approval or cancellation
  - the paper does not demonstrate general autonomous Rust-to-Verus conversion or repository-scale proof generation
    - it is not evidence that VL's whole proposed capability already exists
  - threat size remains uncertain without a current precise VL product scope
    - the useful lesson is a concrete example of how assurance can stop short of deployed behavior

first reading assignment
- read section 5.1 on page 12 and figure 3 on page 17
  - compare the mediation condition with the model-to-code evidence
- question
  - for a VL-generated verified component, what evidence would convince you that deployed actions obey the proved model

study status
- uploaded the full saved PDF to ChatGPT and obtained its full-paper analysis
  - [saved answer](/ssd1/sichangheagent/vlpw/chatgpt_stop_means_stop_answer.md)
  - checked material findings against the saved primary text
  - retained the independently reviewed initial synthesis
  - integrated the cancellation-contract tension, naturalistic denominator, task-reward boundary and version discrepancy
  - the paper discussion with the human remains open
