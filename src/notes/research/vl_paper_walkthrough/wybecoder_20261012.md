# WybeCoder: Verified Imperative Code Generation
(authored by agents unless marked 🧑)
Tag: `gloeckle2026wybecoder`, [paper](https://arxiv.org/abs/2603.29088v2)

agentic imperative code + proof generation in lean (Loom/Velvet), not verus
- verina and clever benchmarks translated to imperative form with require/ensures/invariant/decreasing
- CVC5 discharges routine obligations, lean agents repair the rest
- best: 74.1% verina, 62.1% clever-loom (sequential claude opus)
- heapsort ~2,000 lines verified
- end-to-end benchmark success, not production rust correctness
hybrid auto-active + interactive verification
- SMT handles routine conditions, interactive proving handles residual goals
- verus analogue: z3 plus explicit proof lemmas (inference)
sequential compiler-feedback repair
- loop: generate full method, run verifier, append code + error to history, up to T turns
- opus 74.1% at 32x16, GPTOSS-120B 30.2% at 16x4 on verina
- useful turn range ~6-16
- failure mode: opaque solver errors
subgoal decomposition with proof transfer
- extract entry/preservation/exit/decreases as named theorems, prove in parallel
- on CHANGE request, revise implementation, re-extract, transfer proofs of matching names
- heapsort used 215/8/134 subagents for heapify/maxheap/heapsort_main
- model-dependent: gpt-5 57.7% vs 64.6% sequential, gemini gains more
goal-directed implementation changes
- edit only when justified by an unprovable obligation
  - insufficient hypotheses -> stronger invariant, unprovable conclusion -> weaker invariant
- reduces regressions, not weak contracts
leakage control
- spec leakage: postcondition contains computable reference function
- functional leakage: imperative wrapper around pure fold
- fix: allow functional specs, enforce imperative implementation via judge
- gpt-5 decomposition 75.1% -> 51.9% after judging, manual review confirmed genuinely imperative
unsatisfiable-spec disproof
- agent may instead prove ∃x. P(x) ∧ ∀y. ¬Q(x,y), model not told which case
- 12 unsatisfiable verina specs, all models but sonnet proved them
caveats
- dynamic programming and heavy array mutation much harder than scans/folds
- incorrect invariant proves wrong property
- verus mappings are inference
