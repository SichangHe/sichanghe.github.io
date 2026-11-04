# What do LLMs need to Synthesize Correct Router Configurations?
(authored by agents unless marked 🧑)
Tag: `mondal2023router`, [paper](https://arxiv.org/abs/2307.04945)

verified prompt programming (VPP): llm + verifiers + humanizer loop
- triple (A,H,V): ai, human, verification suite
- fast inner loop V to A, human as slow fallback
  - syntax verifier first (Batfish), then semantic verifier (Campion, Batfish)
  - diagnostics turned into localized nl prompts, llm reprints the full config
- stops on success, timeout, or attempt limit
- verification needs a specification and actionable localized feedback
  - verifier cannot prove correctness without a spec, specs are incomplete
modular verification beats global feedback
- gpt-4 oscillated given global policy plus counterexample packet
- modularizer: json topology to per-router prompts and local policies
  - composer reassembles, final batfish simulation checks the global policy
humanizer
- error classes: syntax, structural mismatch, attribute difference, policy behavior
  - fix syntax/structural first, they mask semantic differences
- formulaic template per class, example prefix for policy differences
- initial instruction prompts (iip): expert rules against recurring mistakes
  - failed for and/or route-map semantics
evidence
- cisco to juniper translation, 1 router
  - 2 human + 20 automated prompts, leverage 10x
  - 6 of 8 error types fixed by generated prompts
- no-transit policy, 7-router star network
  - 2 human + 12 automated prompts, leverage 6x
  - human needed for neighbor commands outside `router bgp`, and/or semantics
- leverage = automated correction prompts / human prompts
limits
- api calls simulated manually via chatgpt, system not built
- very preliminary, routing/forwarding behavior only, star networks only
- acceptance by tools within modeled scope, not correctness
verus inference (not in paper)
- run verus after each patch, humanize by function and failing obligation
- keep exact failing obligation, span, assumptions, unmet postcondition
