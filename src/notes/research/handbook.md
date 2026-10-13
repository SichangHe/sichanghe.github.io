handbook.md: long-context policy following 🤖

scope

- assumption: “our DL/agent work” means the local agent-frontier, policy-compliance, and auditable-context agendas
  - no separately named local `DL` project was identifiable
- discovery route: the persistent PB Chrome route, then Google Scholar
  - queries: `tau-bench policy following agent`, `long-horizon agent benchmark ICML ICLR`, `Terminal-Bench agent benchmark`, and `AgentIF instruction following agentic`
  - Scholar did not yet return the exact HANDBOOK.md title on 2026-07-29; the paper was submitted the day before

primary source

- fact: [HANDBOOK.md: A Benchmark for Long-Context Agentic Instruction Following](https://arxiv.org/abs/2607.25398) is a Surge AI arXiv v1 preprint, submitted 2026-07-28
  - authors: Liudas Panavas, Sebastian Minus, Bradley Monton, Derek Ray, Suhaas Garre, Sushant Mehta, Edwin Chen
  - arXiv comments say it was accepted to the Workshop on Agent Behavior at COLM 2026
  - classification: preprint with author-reported workshop acceptance, not verified main-track evidence
  - [released code and tasks at the reviewed commit](https://github.com/surge-ai/handbook/tree/72f9a6591782b8e7d9ebbcb2e2f72c9c2357fdd1)
- fact: the benchmark has 65 self-contained enterprise tasks across finance, medical billing, insurance, logistics, and HR
  - each task combines a 20–124-page, 8K–79K-token mutated handbook with files and mock email, Slack, calendar, Jira, and Shopify state
  - the paper’s design statement is: “The policy, not the prompt, decides the task.”
- fact: scoring is deterministic and two-sided
  - 824 programmatic criteria check both required outcomes and prohibited side effects
  - the reported harness gives a model up to 200 tool calls and one hour; completed trials average about 17 steps and 30 calls
  - the authors report 36.2% best strict pass@1, with most tested frontier configurations below 25%
- fact: the released environment exposes 82 tools through six MCP servers and already includes a sandboxed `bash` tool
  - external company services remain structured MCP tools rather than shell commands
- uncertainty
  - the result is author-reported, recent, workshop-status evidence with no human success baseline
  - fictional companies, mock services, hand-authored rubrics, and model-run task iteration limit external-validity claims
  - public release creates a future training and scaffold-tuning exposure risk

relationship to existing agent work

- high direct relevance: it is a concrete instance of [the agent-frontier agenda](agent_frontier.md)
  - the existing mission calls for unseen policy clauses, conflicting requests, joint completion and compliance, repeated trials, and independent checks
  - HANDBOOK.md contributes task-unique policy mutations and deterministic checks for both action and inaction
  - it does not supply adaptive attacks, a human audit baseline, `pass^10`, or held-out generators after public release
- high but narrower relevance to auditable context management
  - the benchmark directly tests whether a long policy remains operative after tool use
  - it is therefore a useful workload for obligation-preserving retrieval or compaction
  - it is not evidence that a memory method works: the reported harness preserves tool observations up to 1 MB and says its overflow condenser did not trigger
- partial relevance to receipt-bearing state transitions
  - the final-state and no-side-effect verifiers are strong outcome receipts
  - they do not identify which handbook clause justified an action, so a clause-to-action evidence ledger remains a distinct contribution
- limited relevance to a new deep-learning method
  - the released Harbor environments can support RL, but training on the released 65 tasks cannot establish generalization to those same public variants
  - a training claim needs procedurally generated, withheld policy mutations and task families

prestigious related literature

- [τ-bench, ICLR 2025](https://openreview.net/forum?id=roNSXZpUDN)
  - closest accepted policy-following benchmark: stateful retail and airline tool use under shared domain policies
  - the local evidence records GPT-4o retail `pass^8` below 25%; HANDBOOK.md differs by unique long policies and explicit forbidden-action checks
- [AgentIF, NeurIPS 2025 spotlight](https://neurips.cc/virtual/2025/poster/121761)
  - 707 human-annotated instructions from 50 agentic applications; average instruction length is 1,723 words and constraints include tool specifications
  - its official abstract calls the setting “lengthy instructions with complex constraints”
  - HANDBOOK.md is longer, stateful, and policy-over-request; AgentIF is the strongest novelty warning against a broad “long agentic instruction following” claim
- [ST-WebAgentBench, ICLR 2026](https://openreview.net/forum?id=MuCDzH0ctf)
  - combines web-task completion and policy compliance, but repeats short policy blocks after observations
  - HANDBOOK.md instead requires retrieving and retaining an independently stored handbook
- [MemoryAgentBench, ICLR 2026](https://openreview.net/forum?id=DT7JyQC3MR)
  - evaluates retrieval, learning, long-range understanding, and forgetting through incremental turns
  - its conclusion that “current methods fall short of mastering all four competencies” supports the broader memory problem, not policy compliance specifically
- [UltraHorizon, ICML 2026](https://openreview.net/forum?id=qRNtMWrTvo)
  - stresses long-horizon hidden-rule discovery and recovery; it reports that “Simply increasing interaction steps” is not reliably sufficient
  - HANDBOOK.md instead gives an explicit, long governing document and evaluates faithful application
- [SWE-agent, NeurIPS 2024](https://proceedings.neurips.cc/paper_files/paper/2024/hash/5a7c947568c1b1328ccc5230172e1e7c-Abstract-Conference.html)
  - a custom agent-computer interface improved its reported GPT-4 result over a shell-only baseline by 64% relative
  - this is direct evidence that a CLI/interface change can change scores independently of underlying policy reasoning
- [AgentDojo, NeurIPS 2024](https://proceedings.neurips.cc/paper_files/paper/2024/hash/97091a5177d8dc64b1da8bf3e1f6fb54-Abstract-Datasets_and_Benchmarks_Track.html)
  - evaluates adversarial indirect prompt injections with deterministic utility and security checks
  - HANDBOOK.md’s conflicts are benign authority conflicts, so it complements rather than substitutes for injection evaluation

cli or simple-command adaptation

- conclusion: valid as a controlled adaptation or ablation; not automatically a new benchmark contribution
- three distinct interventions must not be conflated
  - policy representation: naturalistic handbook to compact commands, tables, or decision rules
    - measures the cost of document representation and ambiguity removal
    - no longer measures long-document instruction following if the conversion exposes task-relevant rules
  - action interface: equivalent MCP calls to CLI commands
    - measures action-interface affordances, syntax, help text, error feedback, and composability
    - the existing `bash` tool means this is an extension of, not a replacement for, the current environment
  - policy compiler or guard: handbook to executable constraints that block unsafe actions
    - can be a useful safety system
    - measures assisted enforcement, not unaided in-context compliance
- novelty risk
  - AgentIF already covers long complex agent instructions; τ-bench and ST-WebAgentBench already cover policy compliance; [Terminal-Bench](https://arxiv.org/abs/2601.11868) covers terminal-agent tasks; SWE-agent already demonstrates strong interface sensitivity
  - a wrapper that merely renames tools or simplifies policy text is a baseline, not a publishable benchmark by itself
  - a defensible contribution is an interface-invariant, semantically audited study that isolates representation versus action-interface effects and explains failure mechanisms
- major confounds
  - changed command names, argument schemas, help text, shell composition, stdout/stderr, action granularity, token counts, and error recovery
  - a command language can leak the relevant service or policy clause, while a shell can provide powerful unplanned utilities
  - different tool-call counting, timeout behavior, context exposure, and destructive-action friction can create score changes without better compliance
  - the public task set permits direct benchmark tuning
- defensible evaluation
  - construct a canonical typed policy model, then render semantically matched handbook and compact-command versions
  - make each CLI command a thin adapter to the same service mutation and response schema; validate adapter equivalence with unit and differential tests
  - run a 2×2 design: handbook versus compact policy representation, crossed with MCP versus CLI actions
  - make action paths mutually exclusive
    - MCP cells expose structured MCP service calls only; no CLI service binary, endpoint, or credential is reachable from `bash`
    - CLI cells expose only restricted CLI adapters over the same service mutations; direct MCP endpoints and credentials are absent, while `bash` can invoke only the intended CLI and fixed non-network file utilities
    - deny direct HTTP, MCP, socket, and fallback SDK access at the harness boundary; adversarial isolation tests must show every disallowed route fails without a state mutation
  - fix model, scaffold, system prompt, starting state, permissions, visible tool documentation, context limit, wall time, tokens, and semantic action budget
  - use fresh withheld mutations and task families; pair conditions by task and seed; run enough independent trials to estimate worst-group reliability
  - report strict full success, required-output success, zero forbidden-action violations, conditional compliance on conflicting requests, cost, and `pass^k`
  - audit a blinded expert subset for policy-rendering equivalence and grade ambiguity; compare against a deterministic guard as an assisted-enforcement baseline
- interpretation rule
  - better compact commands show that representation or interface assistance helped
  - they do not show that agents can follow a long natural handbook, and should not be presented as a general autonomy gain

local evidence

- collection record: separate from the fixed 22-paper agent-frontier packet
  - official arXiv v1 PDF: 300,359 bytes; SHA-256 `0746d2462167cb327a2289d19ba2acd51b0abac8219cc1d42988c13621e1c63f`
  - Marker extraction: 16 pages, 67,085-byte Markdown, and 22,482-byte metadata; sampled as readable
- [local OCR](</hdd1/sichanghe/paper_collection/HANDBOOK.md- A Benchmark for Long-Context Agentic Instruction Following, Liudas Panavas, Sebastian Minus, Bradley Monton, et al., arXiv, 2026/HANDBOOK.md- A Benchmark for Long-Context Agentic Instruction Following, Liudas Panavas, Sebastian Minus, Bradley Monton, et al., arXiv, 2026.md>)
- [local PDF](</hdd1/sichanghe/paper_collection/HANDBOOK.md- A Benchmark for Long-Context Agentic Instruction Following, Liudas Panavas, Sebastian Minus, Bradley Monton, et al., arXiv, 2026.pdf>)
