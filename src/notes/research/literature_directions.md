# Literature directions: verified Rust, browser agents, OPC

(human TODO: delete this. Agent wrote this without asking for permission.)

This is a map, not a full survey. Sources consulted: local notes
`research/static_analysis.md` and `research/browser_agent.md`, the local paper
collection `/hdd1/sichanghe/paper_collection`, and web search results available
to this agent session. Treat 2026 arXiv items as volatile until checked on
Google Scholar / Semantic Scholar.

## Takeaways

- Verified Rust code generation looks like the strongest systems-paper direction
  if grounded in a real repository. The frontier has moved from single-function
  loop invariants to repository-level proof repair, retrieval, and spec/helper
  discovery.
- Browser agents are crowded at the benchmark-and-agent-scaffold layer. The
  more systems-shaped opportunity is browser/API instrumentation, safety, and
  transaction-closure infrastructure rather than another general WebArena agent.
- OPC / partial conversation compaction is plausible as a paper only if framed
  as agent context-management systems research with rigorous fidelity/cost/task
  evaluation. A thin “summarize old messages” method is probably too small.
- A common theme across all three directions: the interesting research object is
  the interface between a large model and a structured environment, not the model
  alone.

## Direction 1: generated verified Rust / verified systems code

### Core papers and projects

- Verus, OOPSLA 2023: *Verifying Rust Programs using Linear Ghost Types*.
  Source: <https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf>.
  Fact: Verus embeds spec/proof/exec code in Rust-like syntax and uses Rust's
  type/borrow structure as part of the proof story.
- Verus systems foundation, SOSP 2024: *Verus: A Practical Foundation for
  Systems Verification*.
  Source: <https://www.jaybosamiya.com/publications/2024/sosp/verus-sys.pdf>.
  Fact from local notes: 6.1K LoC implementation plus 31K LoC proof across case
  studies; focus includes concurrency, bit-level reasoning, and unsafe Rust.
- AlphaVerus, ICML 2025: *Bootstrapping Formally Verified Code Generation
  through Self-Improving Translation and Treefinement*.
  Source: <https://www.andrew.cmu.edu/user/bparno/papers/alpha-verus.pdf>.
  Fact: translates Dafny to Verus to bootstrap data; local note records about
  45% of DafnyBench translated to verified/aligned Verus programs.
- AutoVerus, OOPSLA 2025: *Automated Proof Generation for Rust Code*.
  Source: <https://arxiv.org/abs/2409.13082>.
  Fact: agent pipeline uses verifier-error-guided proof refinement and Lynette
  AST feedback; local note records 137/150 VerusBench tasks solved.
- SAFE, ICLR 2025: *Automated Proof Generation for Rust Code via
  Self-Evolution*.
  Source:
  <https://proceedings.iclr.cc/paper_files/paper/2025/file/b2e20d7402c9985eae4ba924c65370a8-Paper-Conference.pdf>.
  Fact: self-evolving spec/proof synthesis on Verus; local note records 52.52%
  accuracy on expert benchmark vs GPT-4o 14.39%.
- Repository-level Verus, LMPL 2025: *Towards Repository-Level Program
  Verification with Large Language Models*.
  Source: <https://dl.acm.org/doi/10.1145/3759425.3763382>.
  Fact: introduces RVBench with repository context; important because toy
  function benchmarks understate dependency/spec/helper discovery difficulty.
- VeruSAGE, arXiv 2026: *A Study of Agent-Based Verification for Rust Systems*.
  Source: <https://arxiv.org/abs/2512.18436>.
  Fact from local notes: VeruSAGE-Bench has 849 tasks from 8 Verus-verified
  systems; system proof differs from toy proof because context, specs, and
  helper lemmas dominate loops.
- VeriStruct, arXiv 2026: *AI-assisted Automated Verification of Data-Structure
  Modules in Verus*.
  Source: <https://arxiv.org/abs/2510.25015>.
  Fact: moves from individual proof tasks to whole data-structure modules,
  needing `View`, invariants, specs, and proof code.
- VeruSyn, arXiv 2026: *Reducing the Costs of Proof Synthesis on Rust Systems
  by Scaling Up a Seed Training Set*.
  Source: <https://arxiv.org/abs/2602.04910>.
  Fact from local notes: synthesizes millions of verified Rust+Verus programs
  and fine-tunes smaller models toward frontier-model performance.
- KVerus, arXiv 2026: *Scalable and Resilient Formal Verification Proof
  Generation for Rust Code*.
  Source: <https://arxiv.org/abs/2605.03822>.
  Fact: retrieval-heavy dependency graph + lemma index + error-driven
  refinement; local note records 80.2% single-file success and 51.0%
  repo-level success.
- Applications worth reading as target domains: Vest, USENIX Security 2025/2026
  proceedings label to verify
  (<https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf>),
  Atmosphere, SOSP 2025
  (<https://dl.acm.org/doi/10.1145/3731569.3764821>), and VeriSMo, OSDI 2024
  (<https://www.usenix.org/system/files/osdi24-zhou.pdf>).
- Adjacent Rust verification anchors: Aeneas, ICFP 2022
  (<https://dl.acm.org/doi/10.1145/3547647>), Charon, CAV 2025
  (<https://arxiv.org/abs/2410.18042>), and a hybrid Creusot/Gillian-Rust
  approach, PLDI 2025 (<https://dl.acm.org/doi/10.1145/3729289>). These matter
  because a generated-verified-Rust project should justify why it targets Verus
  rather than functional translation or hybrid safe/unsafe Rust verification.

### Themes

- Benchmark progression: DafnyBench / VerusBench -> RVBench / VeruSAGE-Bench ->
  actual open-source verified systems.
- Feedback progression: raw verifier errors -> AST-aware error localization ->
  repository dependency and lemma retrieval.
- Data progression: prompt-only agents -> bootstrapped synthetic proof corpora ->
  cheap fine-tuned proof models.
- Real-system bottleneck: not syntax, but knowing which specs, invariants,
  abstraction functions, and helper lemmas should exist.

### Gaps and likely paper angles

- Repository-native agent: run directly in a Verus repo, with dependency-aware
  context retrieval, not extracted one-file tasks.
- Spec/helper discovery: infer missing helper lemma signatures and abstraction
  boundaries rather than assuming the human supplies them.
- Proof maintainability: measure proof minimality, brittleness under code change,
  and reviewability, not just verifier success.
- Systems target: pick one Rust systems component where formal verification is
  credible and useful: parser/serializer, kernel/driver subsystem, storage,
  network protocol state machine, or browser/security instrumentation.

### Recommended reading order

1. Verus OOPSLA 2023, then Verus SOSP 2024.
2. AutoVerus and SAFE for verifier-guided synthesis loops.
3. AlphaVerus and VeruSyn for data generation / bootstrapping.
4. Repository-Level Program Verification, VeruSAGE, and KVerus for the current
   repo-level frontier.
5. Vest / Atmosphere / VeriSMo to understand what a compelling systems target
   looks like.

### Venues

- Systems / security applications: SOSP, OSDI, NSDI, USENIX Security, IEEE S&P,
  CCS.
- PL / verification: PLDI, OOPSLA, POPL, CAV, FM, TACAS.
- LLM+formal methods workshops as early targets: LMPL, neural-symbolic / code
  generation workshops colocated with ICML/NeurIPS/ICLR/ACL.

### Concrete next questions

- Can an agent discover the right Verus helper lemmas and abstraction functions
  from a repository without task extraction?
- Can proof-generation systems optimize for proof maintainability under realistic
  code churn?
- Can static analysis rank proof obligations and retrieve only the context that
  materially changes verifier success?

## Direction 2: browser / web automation / UI-grounded agents

### Core papers and projects

- WebArena, ICLR 2024: Shuyan Zhou et al., *WebArena: A Realistic Web
  Environment for Building Autonomous Agents*. Source:
  <https://arxiv.org/abs/2307.13854>. This is the benchmark anchor for many
  browser-agent comparisons.
- WebVoyager, ACL 2024: *Building an End-to-End Web Agent with Large Multimodal
  Models*. Source: <https://arxiv.org/abs/2401.13919>. Fact: useful baseline for
  real rendered websites and vision-first web interaction.
- AutoWebGLM, KDD 2024: *A Large Language Model-based Web Navigating Agent*.
  Source: <https://arxiv.org/abs/2404.03648>. Fact: early open web-agent system
  with HTML pruning and staged training.
- Production-scale workflow data, arXiv 2024: *Towards Specialized Web Agents
  Using Production-Scale Workflow Data*. Source: <https://arxiv.org/abs/2411.15004>.
  Fact: argues real workflow data and finetuning matter more than prompt
  scaffolding.
- AgentOccam, ICLR 2025: *A Simple Yet Strong Baseline for LLM-Based Web
  Agents*. Source: <https://openreview.net/forum?id=oWdzUpOlkX>. Fact from local
  notes: aligning observation/action space to model priors gives a strong simple
  baseline.
- WebRL, ICLR 2025: *Training LLM Web Agents via Self-Evolving Online Curriculum
  Reinforcement Learning*. Source: <https://arxiv.org/abs/2411.02337>. Fact:
  online curriculum RL targets task scarcity and sparse rewards.
- Beyond Browsing, ACL Findings 2025: *API-Based Web Agents*. Source:
  <https://aclanthology.org/2025.findings-acl.577/>. Fact: API-only and hybrid
  agents can beat browser-only agents on WebArena-style tasks.
- Building Browser Agents, arXiv 2025: *Architecture, Security, and Practical
  Solutions*. Source: <https://arxiv.org/abs/2511.19477>. Fact from local notes:
  important security/architecture perspective; argues prompt injection makes
  open-ended browser autonomy unsafe in production.
- BrowserAgent, arXiv 2025: *Building Web Agents with Human-Inspired Web
  Browsing Actions*. Source: <https://arxiv.org/abs/2510.10666>. Fact: direct
  browser interaction, staged finetuning, explicit memory.
- Branch-and-Browse, arXiv 2025: *Efficient and Controllable Web Exploration
  with Tree-Structured Reasoning and Action Memory*. Source:
  <https://arxiv.org/abs/2510.19838>.
- Prune4Web, AAAI 2026: *DOM Tree Pruning Programming for Web Agent*. Source:
  <https://arxiv.org/abs/2511.21398>. Fact: generated pruning programs shrink
  DOM/action grounding candidates.
- Dark patterns, IEEE S&P 2026: *Investigating the Impact of Dark Patterns on
  LLM-Based Web Agents*. Source: <https://arxiv.org/abs/2510.18113>. Fact: useful
  for safety evaluation; local note says stronger agents may be more vulnerable
  because they push through UI traps.
- Internal APIs, arXiv 2026: *Internal APIs Are All You Need*. Source:
  <https://arxiv.org/abs/2604.00694>. Fact: provocative systems argument for
  shared first-party / shadow API discovery rather than browser-first agents.
- APISENSOR, arXiv 2026: *Robust Discovery of Web API from Runtime Traffic Logs*.
  Source: <https://arxiv.org/abs/2603.23852>. Useful enabling work for API-first
  or hybrid browser agents.
- LongHorizonUI, ICLR 2026 submission: *A Unified Framework for Robust
  Long-Horizon Task Automation of GUI Agent*. Source:
  <https://openreview.net/pdf?id=BK7Mk5d4WE>. It broadens the scope from web
  pages to long-horizon GUI automation and validation/reflection.

### Themes

- Observation choice matters: screenshot, accessibility tree, DOM, pruned DOM,
  API traces, or internal APIs.
- Action abstraction matters: browser-native clicks/types vs semantic actions vs
  direct API calls.
- General benchmark agents are saturated; data, grounding, safety, and
  production constraints are now more differentiating.
- Backtracking / branching helps exploration, but irreversible actions and
  transaction closure are the real deployment problem.

### Gaps and likely paper angles

- API discovery as systems infrastructure: instrument browser/network/runtime
  traces to discover durable machine interfaces and fall back to UI only when
  needed.
- Safety monitor for browser agents: detect prompt injection, dark patterns,
  irreversible actions, and policy-sensitive flows before execution.
- Transaction-closure benchmark: evaluate whether agents complete a real task
  safely, auditable, and recoverably, not just click the right button.
- DOM/action grounding with provenance: every action should be traceable to
  rendered evidence, DOM node, and network/API consequence.

### Recommended reading order

1. WebVoyager and WebArena-style benchmark papers for baseline framing.
2. AgentOccam to avoid overcomplicated scaffolds.
3. Beyond Browsing and Internal APIs Are All You Need for the browser-vs-API
   argument.
4. Building Browser Agents and Dark Patterns for safety / production constraints.
5. Prune4Web, Branch-and-Browse, WebRL, and workflow-data papers depending on
   whether the chosen angle is grounding, search, RL, or data.

### Venues

- Web / IR / NLP: WWW, SIGIR, ACL, EMNLP, NAACL, ICLR, NeurIPS.
- Systems / security angle: NSDI, OSDI, USENIX Security, IEEE S&P, CCS, IMC.
- HCI angle: CHI, UIST, CSCW.

### Concrete next questions

- Can browser agents automatically derive and share stable API/action models
  from runtime traces?
- Can an agent know when *not* to use the browser because an API or constrained
  tool is safer?
- What is the minimal observation/action representation that preserves task
  success while enabling audit and safety checks?

## Direction 3: OPC / partial conversation compaction

Here OPC means partial conversation compaction: replacing parts of an agent's
interaction history with bounded, durable state while preserving enough evidence
to continue correctly.

### Related literature

- Alexis Chevalier, Alexander Wettig, Anirudh Ajith, Danqi Chen,
  *Adapting Language Models to Compress Contexts*, EMNLP 2023.
  Sources: <https://aclanthology.org/2023.emnlp-main.232/> and
  <https://github.com/princeton-nlp/AutoCompressors>. Key phrase: context is
  compressed into "summary vectors" passed as soft prompts.
- Huiqiang Jiang et al., *LLMLingua: Compressing Prompts for Accelerated
  Inference of Large Language Models*, EMNLP 2023, and *LongLLMLingua:
  Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt
  Compression*, arXiv 2023. Sources: <https://arxiv.org/abs/2310.05736>,
  <https://arxiv.org/abs/2310.06839>. Key phrase from LongLLMLingua: long
  contexts create "higher computational cost, performance reduction, and
  position bias".
- Yucheng Pan et al., *LLMLingua-2: Data Distillation for Efficient and Faithful
  Task-Agnostic Prompt Compression*, arXiv 2024.
  Source: <https://arxiv.org/abs/2403.12968>. Key phrase: compression is cast as
  a "binary token classification problem" for faithfulness.
- Charles Packer et al., *MemGPT: Towards LLMs as Operating Systems*, arXiv
  2023. Source: <https://arxiv.org/abs/2310.08560>. Important precursor for
  tiered memory and treating context as a managed scarce resource.
- Nuo Chen et al., *Compress to Impress: Unleashing the Potential of Compressive
  Memory in Real-World Long-Term Conversations*, arXiv 2024.
  Source: <https://arxiv.org/abs/2402.11975>. Key phrase: compressive memory
  integrates "session-specific summaries, user-bot dynamics, and past events".
- Prateek Chhikara et al., *Mem0: Building Production-Ready AI Agents with
  Scalable Long-Term Memory*, arXiv 2025.
  Source: <https://arxiv.org/abs/2504.19413>. Reports 91% lower p95 latency and
  >90% token-cost savings versus full context on its setup.
- SECOM, *Segment-Level Memory with Compression-Based Denoising for Long-Term
  Conversational Agents*, arXiv 2025. Source: <https://arxiv.org/pdf/2502.05589>.
  Key point: turn-level, session-level, and summarization units have different
  failure modes; compression can denoise retrieved memory units.
- MEM1, *Learning to Synergize Memory and Reasoning for Efficient Long-Horizon
  Agents*, arXiv 2025. Source: <https://arxiv.org/abs/2506.15841>. Key phrase:
  append-only histories cause "unbounded context growth"; the method learns
  constant-memory updates.
- ReSum, *ReSum: Unlocking Long-Horizon Search Intelligence via Context
  Summarization*, arXiv 2025. Source: <https://arxiv.org/pdf/2509.13313>. Key
  point: periodic external summarization lets ReAct-style agents resume from
  compact states.
- Acon, *Optimizing Context Compression for Long-horizon LLM Agents*, arXiv
  2025. Source: <https://arxiv.org/abs/2510.00615>. Reports 26--54% peak-token
  reduction while largely preserving task performance.
- JetBrains Research, *The Complexity Trap: Simple Observation Masking Is as
  Efficient as LLM Summarization for Agent Context Management*, arXiv 2025.
  Source: <https://arxiv.org/abs/2508.21433>. Important negative result: simple
  masking can match LLM summarization on SWE-agent-style tasks.
- SUMER, *Goal-Directed Search Outperforms Goal-Agnostic Memory Compression in
  Long-Context Memory Tasks*, arXiv 2025. Source:
  <https://arxiv.org/abs/2511.21726>. Key phrase: "goal-directed search on
  uncompressed information" can beat biased compression.
- Cat, *Context as a Tool: Context Management for Long-Horizon SWE-Agents*,
  arXiv 2025. Source: <https://arxiv.org/abs/2512.22087>. Key phrase: context
  management should be a "callable and plannable tool".
- PAACE, *Plan-Aware Automated Agent Context Engineering*, arXiv 2025. Source:
  <https://arxiv.org/abs/2512.16970>. Key point: agent compression should be
  conditioned on upcoming plan steps, not only past transcript size.
- Focus, *Active Context Compression: Autonomous Memory Management in LLM
  Agents*, arXiv 2026. Source: <https://arxiv.org/abs/2601.07190>. Key phrase:
  "intra-trajectory compression" where the agent prunes its own history while
  preserving structured learnings.
- ContextBudget/BACM, *Budget-Aware Context Management for Long-Horizon Search
  Agents*, arXiv 2026. Source: <https://arxiv.org/abs/2604.01664>. Key phrase:
  context management as a "sequential decision problem with a context budget
  constraint".

### Assessment

Fact: there is now a visible literature cluster on long-horizon agent context
management, with work on summarization, learned memory, retrieval, masking,
plan-aware compression, budget-aware decisions, and SWE/web-agent benchmarks.

Inference: OPC can support a paper if it contributes one of the following:

- a better abstraction: compaction as auditable state transition, not lossy
  summarization;
- a stronger evaluation: task success, invariant retention, source-grounded
  recoverability, and cost under realistic long-running agent sessions;
- a systems mechanism: partial, selective, reversible, or provenance-preserving
  compaction integrated into real agent tooling;
- a negative result: simple masking / retrieval / raw-memory search often beats
  summarization, with clear guidance on when each wins.

Belief: a paper that only says "summarize old conversation turns to save tokens"
would be weak. A paper on *auditable partial compaction for autonomous software
agents* could be credible, especially if evaluated on SWE-bench-like tasks,
browser tasks, and manager/worker multi-agent workflows.

### Gaps and paper angles

- Fidelity metrics are underdeveloped. Need measure whether compacted state keeps
  obligations, constraints, file paths, assumptions, failed attempts, and source
  pointers.
- Compaction is often irreversible. Need provenance links from each compacted
  claim back to raw transcript/tool output, plus a recovery path.
- Timing is heuristic. Need decide when to compact based on phase boundaries,
  evidence density, context budget, and future plan.
- Most benchmarks are single-agent. Multi-agent manager/worker settings create
  additional state synchronization and reporting constraints.
- Security/privacy angle: compaction can accidentally preserve secrets or erase
  consent boundaries; this is barely explored in agent benchmarks.

### Recommended reading order

1. LLMLingua / LongLLMLingua and AutoCompressors for compression foundations.
2. MemGPT, Mem0, SECOM, and COMEDY for long-term conversation memory.
3. Acon, ReSum, MEM1, Cat, PAACE, BACM for long-horizon agent context.
4. Complexity Trap and SUMER as important skepticism: summarization is not
   automatically better than masking/search.
5. Focus / Active Context Compression for the closest OPC-like framing, but
   scrutinize because the evaluation appears small.

### Venues

- If method/evaluation heavy: ICLR, NeurIPS, ICML, ACL, EMNLP, NAACL.
- If software-agent systems heavy: FSE, ICSE, ASE, OOPSLA, PLDI workshops,
  ML-for-code workshops.
- If privacy/security of memory compaction: USENIX Security, IEEE S&P, CCS
  workshops first, then main conferences if threat model is strong.

### Concrete next questions

- What information classes must survive compaction for autonomous coding agents:
  user intent, constraints, plan state, file edits, test evidence, failed
  approaches, manager reporting state, or all of these?
- Can compacted memory be checked against raw logs automatically for unsupported
  claims and missing obligations?
- When is summarization worse than masking or retrieval, and can an agent choose
  among them online?
- Can partial compaction reduce cost without increasing manager-reporting errors
  in multi-agent work logs?

## Cross-direction synthesis

- Verified Rust and OPC intersect naturally: proof-generation agents need long
  repository sessions where failed proof attempts and verifier evidence must be
  compacted without losing obligations.
- Browser agents and OPC intersect naturally: web agents accumulate observations,
  page states, and irreversible-action constraints; compaction must retain safety
  and transaction state.
- Verified Rust and browser agents intersect if the target is browser/API
  instrumentation with verified parsers, protocol state machines, or security
  monitors.

## Suggested next project choices

1. Strongest: repository-native Verus proof agent with context retrieval and
   auditable compaction. This combines a real systems target with a clear
   literature gap.
2. Practical systems: browser-agent API discovery and safety monitor, evaluated
   on real workflows and prompt-injection/dark-pattern cases.
3. Riskier but novel: OPC benchmark and runtime for autonomous coding agents,
   measuring obligation retention, provenance, cost, and task success.

## 🤖 Agent-added synthesis after deeper related-work pass (2026-05-24)

The deeper pass changes the ranking of the three directions:

- Generated verified Rust remains the strongest systems-paper direction, but the
  novelty has to be repository-native. AutoVerus-style single-file proof repair
  is now a baseline. VeruSAGE, RVBench/RagVerus, and KVerus show that the live
  frontier is cross-module dependency retrieval, helper-lemma/spec discovery,
  and proof maintainability in real Verus systems.
- Browser agents are crowded at the general-agent scaffold layer. The deeper
  opportunity is infrastructure: BrowserGym/AgentLab for reproducible evaluation,
  API discovery for safer machine interfaces, and transaction/audit/safety
  monitors for irreversible UI work.
- OPC / partial compaction is still relevant if treated as an auditable systems
  mechanism. The important recent shift is from passive summarization to active,
  tool-like, budget-aware, and validated context management. Slipstream's
  asynchronous validation idea is especially useful because it creates an
  independent check against the original trajectory.

Concrete combined project idea: build a repository-native Verus proof agent with
explicit context-state management. The agent would maintain a typed index of
files, specs, helper lemmas, verifier errors, failed proof attempts, and open
obligations. Compaction would be allowed only through provenance-preserving
state transitions. Evaluation can combine VeruSAGE/RVBench proof success with
OPC-specific metrics: obligation retention, unsupported claims, proof retry
avoidance, verifier-call cost, and proof maintainability under small code edits.

Paper repository status: verified existing PDFs include `VeruSAGE` and `KVerus`.
The agent attempted to add high-value PDFs for RagVerus/RVBench, BrowserGym,
WorkArena, VisualWebArena, Slipstream, Cat, Acon, ContextBudget, SWE-Pruner, and
BrowseComp, but `/hdd1/sichanghe/paper_collection` is not writable by this agent
(`Permission denied` on root and per-paper directory write tests from the
agent account). The repository has an OCR convention via `ocr_all.py` / `marker_single`, but running it was not
practical because new PDFs could not be written and existing unrelated OCR state
is already dirty.

See also: [agent_memory](agent_memory.md) for the OPC-specific related-work map.

## 🤖 Broad SE/PL/Sys transfer ideas (2026-06-07)

This is a brainstorm, not a single recommended bet. The common question is:
what new capability appears when web/agent systems expose hidden environment
state as typed, testable, and reviewable objects?

### 🤖 1. causal receipts for delegated web work

- insight: receipts become interesting when they let us ask which observation,
  authority check, or postcondition caused the agent to be trustworthy
- why not merely engineering: the research object is a semantics for delegated
  action support: evidence, authority, closure, and counterfactual replay
- transfer: W3C PROV/C2PA provenance, dynamic slicing, runtime verification,
  transaction postconditions, ST policy scoring
- why now: AgentRewardBench evaluates "web agent trajectories";
  ST-WebAgentBench's latest arXiv version is 2026-06-04 and says task success
  alone ignores whether agents act "safely"; WASP and NeuroTaint show prompt
  injection and semantic influence are live problems
- sketch: instrument BrowserGym/Playwright/browser-use to build receipt graphs
  for claims and actions; ablate evidence nodes; score claim support,
  authority correctness, postcondition closure, unsafe-action blocks, and
  replayability
- anchors: AgentRewardBench, ST-WebAgentBench, WASP, NeuroTaint, WebSuite,
  W3C PROV, C2PA

### 🤖 2. L7 transaction contracts for browser/API agents

- insight: the missing web-agent interface is not a better button selector; it
  is a contract saying what a click/API call may change, when it commits, and
  how authority is checked
- why not merely engineering: this asks for a typestate/session-type view of
  web workflows, where HTTP/API/UI steps are checked as state transitions
- transfer: session types, typestate, object-capability authority, OpenAPI /
  AsyncAPI contracts, runtime monitors, API contract testing
- why now: Beyond Browsing reports API/hybrid agents outperform browser-only
  agents; Internal APIs argues the human-browser interface is a mismatch;
  APISENSOR reconstructs APIs from runtime traffic; OASBuilder and WAPIIBench
  show API specs are now agent-facing but still error-prone
- sketch: annotate or infer contracts for self-hosted apps; check UI/API
  equivalence, preconditions, side effects, idempotence, rollback, and commit
  evidence; evaluate duplicate actions, wrong authority, and semantic drift
- anchors: Beyond Browsing, Internal APIs, APISENSOR, OASBuilder, WAPIIBench,
  CommaSuite, ST-WebAgentBench

### 🤖 3. generated web artifacts as executable supply-chain claims

- insight: an LLM-generated website is not just generated text or code; it is a
  deployed bundle of executable claims about authentication, sessions, input
  handling, provenance, and content trust
- why not merely engineering: the paper question is whether provenance plus
  executable obligations changes review, deployment, and repair of generated
  artifacts
- transfer: SLSA/in-toto/Sigstore supply-chain receipts, C2PA provenance,
  static/dynamic web security testing, property-based tests, policy-as-code
- why now: one study analyzed "2,500 GPT-4 generated PHP websites" and found
  26% had an exploitable web vulnerability; Hidden Risks reports failures in
  auth, sessions, validation, and HTTP headers; Retrieval Collapse frames
  synthetic web content as an ecosystem risk
- sketch: generate small sites/components, attach generation provenance,
  security obligations, tests, scans, and runtime monitors; measure exploitable
  flaws, review time, patch stability, and whether provenance survives copying
- anchors: LLMs in Web Development, Hidden Risks of LLM-Generated Web
  Application Code, Retrieval Collapse, Asleep at the Keyboard, SLSA, in-toto,
  Sigstore/Rekor, C2PA

### 🤖 4. assumption-carrying verification for web/L7 boundary code

- insight: verification is most valuable at boundaries where small code decides
  what the agent saw or was allowed to do: URL/header parsers, API normalizers,
  auth checks, receipt validators, and transaction state machines
- why not merely engineering: verified boundary code defines the trusted base
  for agent evidence; tests alone cannot cover adversarial inputs and state
  transitions that later become receipts
- transfer: Verus-style systems verification, proof receipts, law-backed
  assumptions, property-based testing as a continuum toward proof, model
  checking for protocol state
- why now: VeruSAGE studies 849 proof tasks from 8 real Verus systems; KVerus
  identifies a "Semantic-Structural Gap" in repo-level proof; Vest and
  Atmosphere show verified Rust can target practical systems components
- sketch: implement one critical Rust proxy/receipt module with Verus claims;
  keep unverified environment assumptions as named laws with fuzz/PBT/runtime
  evidence; inject malformed headers, replayed requests, stale receipts, and
  broken idempotence to test debugging value
- anchors: Verus, VeruSAGE, KVerus, Vest, Atmosphere, VeriSMo,
  Property-Based Testing: Climbing the Stairway to Verification

### 🤖 5. semantic efficiency for web agents

- insight: efficiency should mean the agent loads, reads, and acts on only the
  page/API/resource state that can affect the task postcondition
- why not merely engineering: this defines a semantic minimality problem over
  browser execution, not just a smaller prompt or faster scraper
- transfer: program slicing, dynamic dependency analysis, partial evaluation,
  superfluous-JS measurement, active context compression, cost-aware scheduling
- why now: Prune4Web says real DOMs often reach "10,000 to 100,000 tokens";
  AgentOccam shows simple observation/action alignment is strong; Internal APIs
  and Swiftor-style proposals push the cost problem below the prompt layer
- sketch: use CDP traces to infer resource/script/DOM dependencies for a task;
  compare full browser, DOM pruning, resource pruning, generated scripts, and
  API routes on task success, false-negative loss, tokens, CPU, bytes, and
  unsafe blind spots
- anchors: Prune4Web, AgentOccam, Internal APIs, APISENSOR, Swiftor proposal,
  superfluous-JS web performance work, ContextBudget

### 🤖 6. source-critical web agents under synthetic-content drift

- insight: web agents need a source ecology model: live pages, archived pages,
  AI-generated pages, paywalled pages, consent-gated pages, and answer-engine
  summaries are different evidence types
- why not merely engineering: the research asks how synthetic content and web
  drift change the epistemology of retrieval-backed agents
- transfer: IR measurement, causal exposure analysis, web archiving,
  crawling-under-login, temporal provenance, source trust classification
- why now: Retrieval Collapse reports that synthetic content can dominate
  retrieval exposure; local PB/news notes show stale and title-only evidence can
  change decisions; Browsertrix/WACZ/Memento make replayable web evidence more
  practical
- sketch: crawl volatile topics daily with live browser, source-specific
  extractors, and WACZ archives; evaluate temporal precision, source diversity,
  synthetic exposure, stale suppression, claim support, and human review time
- anchors: Retrieval Collapse, Browsertrix, WACZ, Memento/RFC 7089, Heritrix,
  AI-generated text/content measurement notes, PB news-quality work logs

### 🤖 7. taint-aware interpretability for agent safety

- insight: "why did the agent do that" is a source-to-sink question: did
  untrusted page text, hidden DOM, ads, memory, or retrieved snippets influence
  a privileged tool/action?
- why not merely engineering: it creates an empirical account of semantic
  influence, not a prettier trace viewer
- transfer: information-flow control, dynamic taint tracking, causal tracing,
  provenance graphs, source/sink policy enforcement, memory taint
- why now: NeuroTaint argues traditional taint analysis fails for LLMs because
  influence can be semantic, causal, and persistent; WASP shows realistic
  prompt injections still deceive agents; dark-pattern work gives behavioral
  manipulation cases
- sketch: compile browser observations with source labels, log prompts/actions,
  audit traces offline for source-to-sink influence, and enforce sink policies
  for payments, account edits, private data, and generated content
- anchors: NeuroTaint, WASP, WebInject, dark-pattern web-agent studies,
  AgentRewardBench, ST-WebAgentBench

### 🤖 8. obligation memory for long-running SE/web agents

- insight: agents fail by losing obligations, not just facts: user constraints,
  open claims, tests to run, source pointers, proof laws, pending receipts, and
  safety conditions
- why not merely engineering: memory becomes a resource-management problem with
  correctness obligations and measurable loss, not a summarization feature
- transfer: garbage collection, cache eviction, checkpointing, typestate,
  provenance-preserving compaction, budgeted sequential decision making
- why now: CAT frames context as a callable tool; PAACE is plan-aware;
  ContextBudget treats context as a "sequential decision problem";
  Complexity Trap shows simple masking can beat heavier summarization
- sketch: maintain an obligation ledger across coding, verification, and web
  research tasks; compaction may compress text only if obligations retain source
  links and check status; evaluate task success, unsupported claims, forgotten
  tests, cost, and recovery after resume
- anchors: CAT, PAACE, ContextBudget/BACM, Complexity Trap, ReSum, Acon, local
  agent_memory and manager compaction work logs

### 🤖 9. verified L7 normalizers and temporal monitors

- insight: before an agent reasons about a web action, messy HTTP/fetch/API/UI
  events should be compiled into one canonical semantic event stream, then
  checked against temporal safety rules
- why not merely engineering: this defines the trusted compiler from web
  protocol reality to agent-visible state; the contribution is sound event
  semantics and monitorability, not a proxy feature
- transfer: verified parsers/serializers, request-smuggling defenses, session
  types, temporal logic, runtime verification, vector-clock monitors
- why now: the scout report notes current work on HTTP semantic discrepancies,
  L7 fast-path policy enforcement, and temporal monitors for agents; these fit
  the same trusted-boundary story as Verus/Vest
- sketch: build a small L7 proxy/monitor that normalizes method, authority,
  body length, cookies, auth, side-effect class, and commit id; enforce rules
  such as approve-before-submit, snapshot-before-edit,
  fresh-evidence-before-answer, and no-duplicate-commit
- anchors: HDiff, HTTP Garden, HTTP Request Synchronization, EverParse,
  PulseParse, L7FP, Agent-C, Formal Methods Meet LLMs, Verus/Vest

### 🤖 10. web dependency atoms for receipt and crawl invalidation

- insight: the web-agent version of cache invalidation is knowing which pages,
  scripts, APIs, crawls, generated artifacts, and receipts become stale when one
  web dependency changes
- why not merely engineering: this is a causal model of web evidence validity,
  not a recrawl scheduler; it predicts which claims/actions/scripts need repair
- transfer: dependency graphs, incremental computation, active automata
  learning, dynamic web exploration, model-based testing, causal graphs
- why now: local `web_atoms.md` already names groups of URLs that change
  together; the scout report connects this to Web Dependency Analyzer, WebREC,
  Browsertrix, and crawler repair
- sketch: derive atom graphs from CDP traces, crawls, resource dependencies,
  site maps, and deployment metadata; when an atom changes, invalidate linked
  receipts/scripts/tests and trigger targeted recrawl or revalidation
- anchors: `web_atoms.md`, Web Dependency Analyzer, WebREC, Browsertrix, Fable,
  dynamic web exploration state-flow graphs, active model learning
