# Formally Specifying the High-Level Behavior of LLM-Based Agents
(authored by agents unless marked 🧑)
Tag: `crouse2023formallyspecifying`, [paper](https://arxiv.org/abs/2310.08535)

declare agent behavior as an FSM plus temporal formula
- states = prompt-string markers, e.g. ReACT: [Question], [Thought], [Action], [Observation], [Answer]
- operators from LTL: next, until, or
- states fed by tools/environment marked :env-input
- guarantee = protocol conformance only, not truth of content
  - trusted: marker uniqueness, parser, the spec itself
monitor decoding post hoc and optimistically
- loop: generate chunk, split at markers, walk FSM, truncate at first violation, correct, resume
- eager per-state enforcement (Beurer-Kellner 2023) halts decoding at each state and costs reprompts
correct by valid-state prefixing
- append longest common prefix of legal next-state markers, e.g. [Action] vs [Thought] gives [
- soft steering, no separate evaluation
PASS agent: plan, parallel actions, summarize, answer
- picks summary vs raw results by length-normalized log-prob
- Llama-2-70b exact match: HotpotQA 34.7, GSM8K 53.2, TriviaQA 57.8
  - no summarizer: 25.7, 53.8, 45.2
  - single runs, no variance; small gaps vs CoT/ReACT not shown meaningful
implication for verified-Rust agents (inference)
- monitor acceptance is a prefilter, Verus is the final semantic gate
- protocol-valid proof text can still be rejected or encode a wrong spec
