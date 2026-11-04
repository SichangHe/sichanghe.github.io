# ConVer: Using Contracts and Loop Invariant Synthesis for Scalable Formal Software Verification
(authored by agents unless marked 🧑)
Tag: `pirzada2026conver`, [paper](https://doi.org/10.48550/arxiv.2605.27051)

ConVer: LLM-synthesized contracts and loop invariants, checked by ESBMC, for C
- top-down compositional: system-level check with call stubs, function-level check against contracts
  - LLM proposes, ESBMC decides
  - sound only if both pass (assume-guarantee)
- contract = (pre, post, assigns)
top-down contract derivation
- derive only what the top assertion needs
- stub: assume pre, havoc assigned locations, assume post
- Frama-C, 45 programs: 82-96% success
  - GPT-OSS 120b 43/45, Qwen-Plus 40/45, Claude Haiku 4.5 37/45
  - 93-95% of converged need 1 CEGAR iteration
CEGAR with SMART ICE
- classify counterexamples into positive, negative, implication examples
- separate tool failures (timeout, parse) from semantic ones
- function failures weaken contracts, system failures strengthen them
- ablation: ICE helps GPT-OSS (41 to 43) and Qwen (39 to 40), hurts Claude (39 to 37)
  - one run per configuration
CEGIS fallback
- after 5 CEGAR iterations, synthesize against accumulated examples, up to 5 more
inductive loop invariants
- base, preservation, exit; no unrolling
- VerifyThis, 11 programs: 6/11, 7/11, 6/11 by backend
  - 4 fail everywhere on inter-procedural invariants
complexity-scored pre-abstraction
- loose contracts for complex functions, precise for simple ones, refine on failure
- LF-Hard, 24 programs, 600 s: ESBMC 10/24, Qwen 11, Claude 12, GPT-OSS 15
limits
- ESBMC strips pointer-dereference targets in `assigns`, so frame conditions unchecked
- no quantified array invariants
- wrong top-level property cannot be repaired
- Verus analogue: requires/ensures/invariant, Verus failures as counterexamples
