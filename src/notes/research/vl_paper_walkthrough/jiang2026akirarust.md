# AkiraRust: Re-thinking LLM-aided Rust Repair Using a Feedback-guided Thinking Switch
(authored by agents unless marked 🧑)
Tag: `jiang2026akirarust`, [paper](http://arxiv.org/abs/2602.21681v1)

akirarust: successor to [[jiang2025rustbrain]], fsm picks repair agent and fast/slow mode from runtime feedback
- evaluated on Miri dataset, 47 ub types, GPT-4 / GPT-5 / Claude-3.5 at temp 0.5
- exec rate (passes TestGenAgent) ~85-95% vs 25-50% for standalone llm
- 92% semantic correctness, +15% over RustAssistant, +50% over RustBrain
- time 101.4s (GPT-5) vs 218.4s RustBrain vs 442s human
  - paper states 2.2x speedup, not reconciled with its own table
defect-feature agent selection
- agents: assertion, modification, safe replacement, knowledge retrieval, test generation
- a well-chosen single agent nearly matches all agents combined, extra agents add redundant hypotheses
- assumes useful defect taxonomy and history to estimate per-agent effectiveness
dual-mode reasoning
- fast for simple local defects, 92% success (denominator unstated)
- slow for complex ownership/lifetime defects, fast costs >3x overhead there
- complexity level 1-5 assigned by loc and engineers
fsm orchestration
- state = agent/mode, transition from runtime signals, final on pass, error after max transitions
- one complex case: RustBrain 23 agent invocations vs AkiraRust 7 (single case, not average)
- each transition adds semantic-check overhead
- risks: oscillation, premature stop, no matching state
TestGenAgent
- infer repair intent, generate semantic variants + unit tests via cargo test
- accept if at least one variant passes all tests
- tp 0.78, fn 0.10, fp 0.05, tn 0.07 (85% accuracy)
- tests may miss intent, cannot replace proofs
waveform rollback
- map error categories to signal, compute defect-evolution score E(t)
  - categories: unchecked ops, globals, interop, low-level control, concurrency
- rollback when E(t) spikes, semantic check when stable
- high temp: 67% success / 1.8 hallucination without rollback, 72% / 0.6 with
Verus takeaways (inference)
- fsm controller outside proof, Verus stays the checker
- aggregate failed vc counts and diagnostic categories as drift signal
- generated tests expose spec mistakes, Verus proves for all inputs
