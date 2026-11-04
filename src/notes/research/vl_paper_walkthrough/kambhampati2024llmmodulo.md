# LLMs Can’t Plan, But Can Help Planning in LLM-Modulo Frameworks
(authored by agents unless marked 🧑)
Tag: `kambhampati2024llmmodulo`, [paper](https://arxiv.org/abs/2402.01817v3)

position paper: LLMs can't plan or self-verify, but can propose candidates when paired with external sound verifiers
- not a general impossibility theorem
- evidence cited from earlier work
  - PlanBench: GPT-4o Blocksworld zero-shot 213/600 (35.5%), deceptive Mystery BW 0/600
  - GPT-4 plans executable and goal-reaching only ~12% of the time
LLM-Modulo loop: generate, critique, backprompt
- LLM proposes a candidate
- bank of critics checks it
  - hard critics (causal, resource, unit-test constraints) must all sign off before returning
  - soft critics (style, preferences) are advisory
- meta-controller pools critiques into the next prompt
  - options: round-robin, summarize, diversify
  - no comparison of controller choices reported
- with VAL as verifier
  - Blocks World 82% within 15 rounds, Logistics 70%, Mystery BW ~10%
  - returned plan guaranteed correct only relative to the critic's model
  - completeness not guaranteed, depends on LLM generation
LLM roles beyond generation
- model/spec acquisition: LLM drafts actions, preconditions, effects; humans sign off once per domain
  - travel case study: 6x baseline within 10 backprompt cycles; LLM enumerated needed critics
- reformulator: translate candidates into each critic's input format
  - nested LLM-Modulo loop can syntax-check the translation
  - valid parse does not imply right semantics
Verus mapping (inference)
- Verus as hard critic, compiler/tests as extra critics
- LLM drafts requires/ensures, humans review before proofs count
- soundness conditional on Verus, rustc, and the spec
