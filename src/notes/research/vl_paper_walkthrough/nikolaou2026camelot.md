# CaMeLoT: CaMeL orchestrated with Temporal logic for static verification and liveness
(authored by agents unless marked 🧑)
Tag: `nikolaou2026camelot`, [paper](http://arxiv.org/abs/2609.18674v1)

static temporal model checking of an llm agent's plan before any tool runs
- extends CaMeL (privileged llm emits restricted python, capability checks at call time)
- plan ast -> finite-state system (tool calls, provenance, taint, history labels) -> CTL check with nuXmv
- not evaluated on Rust/Verus
plan abstraction
- loops = nondeterministic continue/exit, tools = black boxes, conditions abstracted
  - over-approximation, so false rejections of safe plans
- provenance lattice trusted < user < untrusted < qllm, derived value takes max
  - unknown or conditionally trusted values marked tainted
  - cannot see dynamic reader sets
ctl policies
- safety AG(call a -> recipient_trusted)
- liveness AG(call a -> AF(call b))
- ordering A[¬call b U call a]
counterexample-guided repair
- nuXmv trace -> nl feedback -> planner repairs -> recheck until budget
typed obligation extraction
- llm proposes typed obligations (existence, precedence, response, ...), trusted code grounds and compiles to CTL
  - llm never writes CTL directly
- 97 AgentDojo tasks: exact side effects 85/97, 100% grounding
- direct CTL from gpt-4.1 nano: 12/97 clean
evidence
- 7 SOC variants: CaMeLoT caught 7/7, simplified CaMeL 1/7
- 4 llm-generated unsafe plans: 4/4 vs 0/4
- 20 good plans passed, 20 bad blocked
verus takeaway (inference)
- pre-check agent patches against ordering/safety properties, feed traces back to agent
- verus stays authority for functional correctness
