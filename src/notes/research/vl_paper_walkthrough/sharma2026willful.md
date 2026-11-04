# Willful Disobedience: Automatically Detecting Failures in Agentic Traces
(authored by agents unless marked 🧑)
Tag: `sharma2026willful`, [paper](https://doi.org/10.1145/3786335.3813153)

AgentPex: llm-judge tool checking procedural compliance of multi-step agent traces
- motivation: outcome success can hide skipped checks or policy violations
- extracts rules from system prompts, no oracle or manual labels
- spec extraction + monitoring, not a sound verifier; llm judge is trusted
pipeline
- normalize traces (τ²-bench, OpenAI messages, VS Code chat logs) into prompt + tool schema + ordered messages
- extract explicit-only rules; empty set if none stated
  - output rules, transition rules, forbidden edges `{from,to,reason}`, argument rules
  - plus task-specific predicted plan and predicted final state
- 7 evaluators, 0–100 each; forbidden-edge evaluator uses no llm
- aggregate = weighted avg (critical/important/low = 3/2/1), capped by lowest critical score
  - prevents peripheral metrics masking functional failures
  - overlapping rules can double-penalize one root cause
results on 424 τ²-bench traces (Claude 3.5 Sonnet, GPT-4.1, o4-mini)
- 48/58 (83%) of Claude traces with perfect τ² reward have ≥1 procedural violation
  - 449/723 violations: text + tool call in one message
  - 11: skipped required calculate tool for inline arithmetic
- output-spec score as τ²-failure classifier: ROC-AUC 0.680
- aggregate scores: Claude 57.6, GPT-4.1 62.6, o4-mini 62.9
- manual spot checks small: 13/13 flags true, 9/10 rules grounded
- cost per trace: ~9 llm calls, ~77.6k tokens, 139 s, $0.019
