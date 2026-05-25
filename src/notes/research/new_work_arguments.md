# New-work arguments beyond related work

## 🤖 Agent-added planning note (2026-05-24, manager email 3957 follow-up)

Context: this note follows the related-work deepening pass that updated
`literature_directions.md`, `static_analysis.md`, `browser_agent.md`, and
`agent_memory.md`. The human feedback was that related work alone is not enough;
the next question is what original research arguments we could make, what
questions those arguments answer, and how to write papers around them.

Fact from the existing notes: the common research object is not the model alone.
It is the interface between a large model and a structured environment: a Verus
repository, a browser/API execution substrate, or a long-running agent state.
Claim: the strongest new-work strategy is to make that interface explicit,
auditable, and measurable. A weak paper says "we prompt an agent better". A
strong paper says "we expose the hidden state the agent already relies on, give
it invariants, and show that this changes what the system can reliably do".

### 🤖 Candidate paper 1: repository-native proof agents as assumption managers

Thesis claim: repository-native verification agents should manage two kinds of
state simultaneously: formal proof obligations inside Verus and explicit
assumptions about external code, dependencies, protocols, and runtime behavior.
The novelty is not simply retrieving more files. The novelty is a proof receipt:
for each change, the system records claims proved, helper lemmas used, boundary
assumptions spent, tests or monitors supporting those assumptions, and which
future changes invalidate the receipt.

Why this is beyond related work: `static_analysis.md` already notes that
VeruSAGE/KVerus move the frontier from toy loop invariants to repository context,
helper-lemma discovery, and proof maintainability. The new argument is that real
systems verification cannot avoid unproved boundaries. Instead of pretending that
all final proof state is assumption-free, the system should make assumptions
first-class and falsifiable.

Answerable research questions:

- Can a coding agent add ordinary Rust code with local Verus claims while
  surfacing only the minimal dependency assumptions needed by those claims?
- Can assumption-linked tests, fuzzers, simulations, or runtime monitors make
  proof receipts more useful to developers than a bare verifier success/failure?
- When a bug or proof regression appears, can the receipt graph localize the
  likely wrong assumption faster than grep, git bisect, or ordinary test failure
  triage?
- What assumptions recur across real systems domains: time, idempotence,
  parser normalization, cache freshness, uniqueness, ordering, retry semantics,
  and adversarial-but-valid dependency behavior?

Empirical design:

- Build a small agent workflow around one real-ish Rust subsystem: parser /
  serializer, protocol state machine, storage metadata, or security monitor.
- Use VeruSAGE-Bench / RVBench-style tasks for comparability, but add a live
  repository mode where proof receipts survive across multiple changes.
- Compare direct prompting, verifier-error repair, RAG-only retrieval,
  repository-native retrieval, and repository-native retrieval plus assumption
  receipts.
- Inject mutant worlds: non-monotonic clock, stale cache, duplicate IDs,
  reordered events, dependency returns valid but adversarial values, and changed
  helper lemma behavior.
- Measure verified tasks, verifier calls, token cost, helper-lemma discovery,
  assumption minimality, law-linked test coverage, receipt review time, and
  fault-localization accuracy.

What would make the paper convincing:

- A reviewer can inspect a receipt and understand why the proof depends on a
  boundary assumption.
- The agent finds useful assumptions the human did not prewrite, but does not
  generate a huge vague assumption list.
- Mutation experiments show that assumption receipts catch or localize failures
  that ordinary tests and proof success alone miss.
- The method improves maintainability under small code edits, not just first-pass
  verification success.

Risks:

- The system may look like documentation automation unless receipts affect
  debugging, review, or proof maintenance outcomes.
- Soundness claims must be careful: tests are evidence for assumptions, not proof
  of assumptions. The paper should say that explicitly.
- Scope creep is high. A credible first paper needs one subsystem and a small
  assumption vocabulary, not a universal verification platform.

Paper narrative:

1. Modern proof agents fail less on syntax and more on hidden repository state.
2. Real systems also depend on unverified laws outside the proof boundary.
3. Make those laws explicit, test-backed, and connected to proof obligations.
4. Show that this improves proof maintenance and bug triage, not only success
   rate.

### 🤖 Candidate paper 2: browser/API agents with transaction closure

Thesis claim: browser agents should be evaluated as transaction systems, not
clicking systems. A useful agent must know what evidence it observed, which API
or UI action caused which state change, what action is irreversible, and how to
replay or audit the outcome. The contribution is a browser/API instrumentation
layer that gives agents transaction closure: every externally meaningful action
has provenance, preconditions, postconditions, and rollback-or-confirmation
semantics where possible.

Why this is beyond related work: `browser_agent.md` already argues that another
WebArena scaffold is weak, and that BrowserGym, internal APIs, runtime API
discovery, prompt-injection defense, dark patterns, and irreversible-action
guards are the systems opportunity. The new argument is to organize these into
one paper question: what does it mean for a web agent action to be complete,
auditable, and safe enough to delegate?

Answerable research questions:

- Can a hybrid browser/API agent reduce unsafe or redundant UI actions while
  maintaining task success?
- Can runtime traces discover stable first-party APIs that are safer than UI
  replay for repeated workflows?
- Can transaction records distinguish observation, intent, execution,
  confirmation, and irreversible commitment?
- Which failures come from perception, planning, API mismatch, prompt injection,
  dark patterns, or missing transaction state?

Empirical design:

- Use BrowserGym / AgentLab to compare browser-only, API-only, and hybrid agents
  on MiniWoB, WebArena, VisualWebArena, and WorkArena-style tasks.
- Add a small transaction-closure suite: checkout-like flows, account/settings
  changes, form submission, deletion/cancellation, and prompt-injected pages.
- Instrument DOM/accessibility tree, screenshots, network calls, API schemas
  inferred from traffic, action provenance, and confirmation states.
- Measure task success, unsafe-action blocking, provenance completeness,
  replayability, API-vs-UI fallback correctness, redundant action reduction, and
  human audit time.

What would make the paper convincing:

- Hybrid API/UI execution beats browser-only not merely in success rate but in
  fewer irreversible mistakes and better replay/audit records.
- The instrumentation catches real failure modes: prompt injection, hidden
  irreversible state, misleading UI affordances, stale page state, and API side
  effects not visible in DOM text.
- The transaction suite is small but realistic enough that reviewers see why
  WebArena-style success is incomplete.

Risks:

- API discovery may look like web reverse engineering rather than agents unless
  the paper keeps the delegation question central.
- Safety claims can become overbroad. The paper should claim auditable execution
  and safer transaction boundaries, not general web-agent safety.
- Real services are hard to evaluate reproducibly; self-hosted workflows and
  BrowserGym integration are likely necessary.

Paper narrative:

1. Browser agents are asked to perform delegated work, but benchmarks mostly
   score final task success.
2. Delegated work needs transaction semantics: evidence, effect, reversibility,
   and audit.
3. Browser/API instrumentation can expose those semantics to the agent and the
   evaluator.
4. The right comparison is not only success; it is success with fewer unsafe
   actions and better accountability.

### 🤖 Candidate paper 3: auditable partial compaction for long-running agents

Thesis claim: partial conversation compaction should be treated as a checked
state transition in an agent runtime. A compactor is not allowed to merely
summarize. It must preserve obligations, source pointers, assumptions, failed
attempts, decisions, and open risks in a form that can be audited against the raw
trajectory and recovered when wrong.

Why this is beyond related work: `agent_memory.md` already says a weak paper is
"summarize old messages" and a stronger one is auditable state management. The
new argument is to make compaction quality a systems property: not compression
ratio alone, but the agent's future ability to honor commitments under budget.

Answerable research questions:

- Which past trajectory facts are obligations rather than context: user
  constraints, promised actions, verification failures, source citations,
  assumptions, and manager-report requirements?
- Can phase-aware compaction retain more useful obligations than threshold-based
  summarization at the same token budget?
- Can asynchronous validation or replay detect unsupported claims before the
  compacted state replaces raw history?
- How should an agent decide between exact quote, derived fact, stale branch,
  failed attempt, open obligation, and deletion?

Empirical design:

- Workloads: SWE-bench-like coding tasks, research/browsing tasks, and
  multi-agent manager/worker tasks where reporting obligations matter.
- Baselines: no compaction, truncation, raw-log retrieval, generic
  summarization, callable memory/context tools, and async validation.
- Metrics: task success, token/latency cost, obligation-retention accuracy,
  unsupported-claim rate, source-pointer coverage, recovery success, and
  manager-report correctness.
- Artifact: a compaction log with typed entries and raw-message provenance.

What would make the paper convincing:

- It catches realistic failures: forgotten user constraints, fabricated
  citations, repeated dead-end debugging, lost verification failures, and wrong
  final reports.
- It improves long tasks where naive summarization is brittle, not only toy
  long-context QA.
- The audit log lets a human or checker trace every compacted claim back to raw
  evidence.

Risks:

- Evaluation can become subjective. The paper needs predefined obligation labels
  and blinded or automated checks where possible.
- Agent-runtime integration matters; a stand-alone summarizer may be dismissed
  as prompt engineering.
- Long-running tasks are expensive to run. Start with a small but realistic
  benchmark and emphasize error taxonomy.

Paper narrative:

1. Long-running agents fail by losing commitments, not just by exceeding context.
2. Commitments are structured state with provenance.
3. Compaction should therefore be typed, auditable, and validated.
4. This changes the measurable failure modes of autonomous agents.

### 🤖 Candidate paper 4: one combined systems story

Thesis claim: agents become reliable when their hidden working memory is turned
into typed environment state. Repository proof agents need proof receipts;
browser agents need transaction receipts; long-running coding agents need
compaction receipts. These are the same systems pattern: a model acts through a
structured interface, and the interface should record obligations, provenance,
state transitions, and evidence.

This is the most ambitious narrative. It could become a dissertation-shaped
agenda or a broad systems paper, but it is probably too wide for a first
submission unless implemented in one domain and framed as a general design
principle. The safer writing strategy is to choose one domain as the paper and
use the others as motivation / generalization.

Possible unifying insight: the unit of reliability is not an agent turn. It is a
receipt-bearing state transition. A proof edit, a browser click/API call, and a
conversation compaction all transform world state or agent state. The research
question is whether exposing that transition as a typed object improves
debugging, review, reproducibility, and safety.

Evidence needed for a combined claim:

- A shared schema that is not vacuous: `claim`, `evidence`, `source`,
  `assumption`, `effect`, `open obligation`, `invalidated by`, and `recovery`.
- At least two prototypes or one prototype plus a careful cross-domain analysis.
- Failure cases showing the same receipt abstraction catches distinct concrete
  bugs in different domains.

Risk: reviewers may say this is a manifesto. To avoid that, write the first
paper around one executable system and keep the cross-domain claim as a design
lesson.

### 🤖 Ranking and recommended first bet

Best first paper: Candidate 1, repository-native proof agents as assumption
managers. It has the clearest systems/PL/security audience, the strongest anchor
in the existing notes, and a crisp distinction from VeruSAGE/KVerus: not just
more retrieval, but proof receipts connecting formal claims to explicit boundary
laws and empirical evidence.

Second best: Candidate 2, browser/API transaction closure. It is practical and
systems-shaped, but reproducible evaluation and safety scope are harder.

Third best: Candidate 3, auditable partial compaction. It may be novel, but the
paper must work hard to avoid looking like a memory-prompting method. It becomes
stronger if evaluated inside Candidate 1 or a manager/worker coding workflow.

Writing strategy:

- Do not start the paper with "LLMs are good at code/web tasks". Start with the
  missing interface invariant: agents act through structured environments but do
  not preserve enough state to make actions reviewable.
- Use related work only to show why the frontier has moved. Then state the
  original claim as a systems principle with a concrete artifact.
- Keep claims narrow: improve maintainability, auditability, fault localization,
  and safe delegation under defined workloads. Avoid claiming general autonomous
  reliability.
- Make negative results publishable: if assumption extraction is noisy, if API
  discovery is brittle, or if compaction loses obligations, those failures can
  become the paper's taxonomy and design constraints.

### 🤖 Immediate next experiments

- For Candidate 1: choose one Rust subsystem and manually write five to ten
  assumptions/laws. Then ask whether a proof-agent loop can spend those laws and
  produce useful receipts for two or three changes.
- For Candidate 2: build a tiny BrowserGym-compatible transaction suite with
  one reversible action, one irreversible action, one prompt injection, and one
  hidden API side effect. Test whether provenance changes agent behavior.
- For Candidate 3: take an existing long agent transcript and label obligations,
  assumptions, failed attempts, and source pointers. Compare generic summaries to
  typed compaction by checking final-report correctness.

### 🤖 Paper-collection status (2026-05-24)

The paper collection remains readable but not writable to this agent. A direct
write probe to `/hdd1/sichanghe/paper_collection/.omo_write_probe_3957_<pid>`
failed with `Permission denied`. Existing VeruSAGE and KVerus root PDFs and OCR
directories are present. Because the collection is not writable, this agent did
not download PDFs or fabricate local citations. The human was emailed a concise
`[omo]` reminder asking for write permission to
`/hdd1/sichanghe/paper_collection` or another writable paper-collection path
before PDF downloads continue.
