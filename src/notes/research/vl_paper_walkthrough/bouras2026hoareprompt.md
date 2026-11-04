# HoarePrompt: Structural Reasoning About Program Correctness in Natural Language
(authored by agents unless marked 🧑)
Tag: `bouras2026hoareprompt`, [paper](https://doi.org/10.1145/3744916.3773206)

llm classifies program vs nl requirement via natural-language hoare triples
- llm samples postconditions per code point, no execution or proof
  - no formal guarantee, only structured informal proof
- precondition: few-shot extraction of valid inputs from requirement + signature
- sequence: post of s1 is pre of s2; group atomic statements to cut queries
- if: sample branch pres from assert b / assert ¬b, then merge posts
- exceptions: handler starts from "variables may take arbitrary values", loses facts
- stdin: non-interactive only
loops via few-shot k-induction
- unroll k iterations, feed (pre_i, post_i) triples as examples to infer loop summary
  - k=3 best on 140-entry pilot (llama3.1-70b): mcc 0.262 vs 0.211 no unroll, 11.29x tokens
  - avg +25.7% mcc over no-unroll on full benchmark
evidence
- cococlanel: 645 codeforces pairs, 322 (49.9%) incorrect
  - avg mcc +61% vs zero-shot-cot, +72% vs vanilla, +106% vs test-generation, over 4 models
- state annotation helps: indentation bug found 0% to 11.7% (qwen2.5-7b), 50% to 100% (llama3.1-70b)
- as feedback in agentcoder loop, 100 problems: gpt-4.1 47% fully correct vs 42% testing, 37% baseline
verus takeaways (inference)
- candidate `requires`/`ensures`/`assert`/invariants from nl state descriptions, verus checks them
  - contract faithfulness to the prose requirement stays a separate obligation
- k unrollings suggest invariant candidates but prove neither initiation nor preservation
