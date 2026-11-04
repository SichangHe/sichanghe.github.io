# Autoformalization of Agent Instructions into Policy-as-Code
(authored by agents unless marked 🧑)
Tag: `mondl2026autoformalization`, [paper](https://arxiv.org/abs/2606.26649)

verification sandwich translates agent instructions + MCP tool schemas into Cedar policies
- bottom: grounding layer generates Cedar schema programmatically from MCP tool definitions
  - constrains generator to real actions, resources, argument types
  - no schema error rate reported; wrong schema makes later policy checks irrelevant
- middle: Gemini 3 Pro generates candidate policies
- top: hard critic + soft critic
  - hard: Cedar tooling checks syntax, schema, vacuity, conflicting rules
    - up to 3 retries with feedback to generator
  - soft: Gemini 2.5 Flash judges semantic alignment with a rubric
    - probabilistic, outside the formal trust boundary
    - needed because a syntax checker cannot judge the "spirit" of instructions
fail-closed external enforcement
- policy engine sits between agent and tool, outside the LLM context
  - allow to execute, deny on any evaluation/validation error
  - prompt injection cannot rewrite the policies
- dialog-only behavior cannot be blocked by a tool-call policy
evaluation: MedAgentBench trajectory replay, 300 original + 50 adversarial
- Cedar block rate and comparator unsafe rate have different rule scopes (88 synthetic rules vs 23 implemented)
  - original raw: Cedar blocks 39.0%, comparator unsafe 30.3% (91/300)
  - original guardrail: 0.0% vs 55.7% (167/300)
- rates re-computed on write (POST) trajectories only
  - original: raw 89/89, baseline 79/84 (94.0%), guardrail 85/86 (98.8%)
  - adversarial: 100% in all three conditions
- no theorem that policies are equivalent to source instructions
- Cedar is stateless; temporal/memory-aware policies are future work, not evaluated
takeaways for Verus agents
- hard verifier (verus) + soft LLM critic loop is the same shape; acceptance needs verus success plus independent review of spec meaning
- schema grounding prevents malformed terms, not misread requirements
- report coverage with explicit denominators
