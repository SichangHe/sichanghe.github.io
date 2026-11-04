# From Noisy Traces to Root Causes: Structural Trajectory Analysis and Causal Extraction for Agent Optimization
(authored by agents unless marked 🧑)
Tag: `chang2026noisy`, [paper](https://arxiv.org/abs/2607.07702)

strace optimizes an llm agent by rewriting module prompts from its failed traces
- proves nothing, changes no code; verus stays the judge
- tested on VeruSAGE-Bench agent (router + 15-16 executors, 35 repair actions, o4-mini)
  - optimizer: Claude Sonnet 4.5; edits only router + top-k executor prompts
  - success 42.5% to 58.5% (1.4x) on 106 held-out tasks (inferred denominator)
  - best baseline GEPA 47.2%; few-shot / retrieval below base agent
  - turns per task drop on all 5 projects
  - cost of one optimization run $2.96
- caveats
  - single run per cell, no variance; temperature 1.0
  - train/test split within same 5 projects, no cross-codebase transfer
  - unclear if cheat checker (assume / admit / external_body) applied
  - gains uneven: NRKernel 20.0% to 31.7%; Claude Sonnet 4 / GPT-5 still lead on IronKV
  - ablations on a different set (inferred 50 tasks); differences of 1-5 tasks
pipeline of 4 phases
- 1 textual dependency prior
  - llm reads repo, writes edge list of data + control dependencies between modules
  - key fact to record: which events change code state (accepted patches do; routers and rejected patches do not)
  - removing the graph 56% to 48%; 10-25% noisy edges barely matter
- 2 failure summarization map
  - llm writes parser for trace format; aggregate counts before any llm reads a trace
  - per-module failure rate, repeated-rejection loops, router choice patterns
  - IronKV example: postcondition_repair fails 251 of 366 calls, in all 47 failed traces
  - dominant manifestation point is not the root cause
  - without trace filtering: 46% and $8.45 vs 56% and $2.96
- 3 pick up to 5 modules, up to 5 distinct-pattern traces each
  - rank by failure frequency + cascade impact via dependency prior
  - 25 traces out of 200 cases
- 4 backward slicing + attribution + rule injection
slicing by state changes
- keep only accepted (state-changing) steps before a failing step, plus the failing step and its routing decision
  - repeated failures under identical state = one segment
- verus form: shared state is the source file; 20 attempts with 3 accepted patches gives at most 4 segments
- gain is mostly cost: 56% at $2.96 vs 54% at $5.93 (full trace)
  - vs 54% at $2.88 for current-node-only
router-first attribution
- default blame router when executor fails
  - blame executor only if router choice was reasonable and approach is flawed and another executor would also fail
- blame earlier accepted node when varied executors all fail after it
  - verus case: accepted invariant/lemma too weak for the remaining goal; error-count progress hides it
- 12 of 25 traces remapped to upstream root causes
- no ground truth for root causes
trace-level gradient to general rule
- per failure: expected, actual, gap, prompt cause, one improvement
- abstract to few rules, no trace content copied
- inject only at root-cause module; executors get clarity not extra duties
rules learned for verus agent
- stop and switch: after 2-3 rejections of an action in one proof context, switch; if exhausted, flag for human
- concrete anchors per action
  - uselemma: name helper lemmas and what they establish
  - case analysis: exact split variable and what each branch proves
  - induction: base case, hypothesis, link to goal
  - seq/set/map: 2-3 relevant lemmas, not a broad set (avoids timeouts)
- multi-round planning: build on what earlier accepted fixes established
