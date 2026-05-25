# Agent memory / partial compaction

## 🤖 Agent-added related work (2026-05-24): why OPC is still relevant

Here OPC means partial conversation compaction: replacing selected spans of an
agent trajectory with bounded state while preserving enough evidence to continue
correctly.

Fact: this is now an active agent-systems topic, not only a prompt-compression
topic. The most relevant recent work differs along two axes: who controls memory
(the runtime, an auxiliary compressor, or the agent policy) and whether compacted
claims remain auditable against raw trajectory evidence.

Key related work:

- LLMLingua / LongLLMLingua / LLMLingua-2: prompt-token compression foundations.
  Useful background, but mostly not agent-trajectory aware.
- MemGPT and Mem0: long-term memory systems that treat context as a scarce
  managed resource. Useful vocabulary for tiers, persistence, and retrieval.
- Acon: compresses both environment observations and interaction histories. Its
  paper says it reduces peak tokens by 26--54% while largely preserving task
  performance (<https://arxiv.org/pdf/2510.00615>). Good baseline for optimized
  compression prompts and compressor distillation.
- Cat, `Context as a Tool`: frames context management as a "callable and
  plannable tool" for SWE agents and separates stable task semantics, long-term
  memory, and short-term interactions (<https://arxiv.org/pdf/2512.22087>).
  This is close to OPC in spirit.
- ContextBudget / BACM: formulates context management as a "sequential decision
  problem with a context budget constraint" (<https://arxiv.org/pdf/2604.01664>).
  Important because timing and amount of compaction should be adaptive, not just
  triggered at a token threshold.
- SWE-Pruner: line-level task-aware pruning for coding agents. It is orthogonal
  to conversation compaction because it compresses environment observations
  rather than the agent's past commitments.
- Focus / Active Context Compression: lets an agent actively prune its own
  history into a structured knowledge block. Treat its results cautiously because
  reported evaluation is small, but the primitive design is directly relevant.
- Slipstream: the closest validation idea. It says synchronous compaction has a
  "structural validation gap" because the compactor cannot know what the agent
  will need later; its asynchronous design validates a candidate summary against
  the agent continuing on the original context (<https://arxiv.org/html/2605.08580>).
- LongSeeker / Context-ReAct and Context Folding: broaden the operation set from
  summarize/truncate to skip, compress, snippet, delete, rollback, branch, and
  fold. These are relevant because partial compaction should be multi-resolution:
  exact snippets for constraints, summaries for resolved exploration, deletes for
  stale dead ends, and rollback for bad branches.
- Git-Context-Controller: maps context to version-control operations: commit,
  branch, merge, and retrieve. It is useful framing for multi-agent manager /
  worker settings, even if performance claims need independent replication.

Inference: OPC is still worth pursuing only if it is framed as auditable state
management for long-running agents. A weak paper says "summarize old messages".
A stronger paper defines compaction as a checked state transition with explicit
obligation retention, provenance pointers, reversible recovery, and phase-aware
triggering.

Concrete evaluation plan:

- Workloads: SWE-bench Verified or SWE-bench-like coding tasks, BrowseComp /
  BrowseComp-Plus for research/browsing, and a multi-agent manager/worker task
  where reporting obligations matter.
- Metrics: task success, token/latency cost, obligation-retention accuracy,
  unsupported-claim rate, source-pointer coverage, recovery success from raw
  logs, and manager-report correctness.
- Baselines: no compaction, truncation/masking, retrieval over raw logs,
  synchronous summarization, Acon-like optimized compression, Cat-like callable
  context management, and Slipstream-like asynchronous validation.
- Required artifact: an inspectable compaction log where every compacted claim is
  tagged as exact quote, derived fact, assumption, failed attempt, open
  obligation, or stale/deleted branch.

Paper repository status: PDFs for several foundational adjacent papers already
exist in `/hdd1/sichanghe/paper_collection`, but this agent could not download
new memory-compaction PDFs because the collection is not writable by
the agent account. URLs above are recorded as fallbacks until PDFs can be added.
